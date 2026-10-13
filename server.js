const express = require("express");
const fs = require("fs");
const path = require("path");

// ============================================================
// Carga de variables desde .env (opcional, sin dependencias).
// ============================================================
const rutaEnv = path.join(__dirname, ".env");
if (fs.existsSync(rutaEnv)) {
  for (const linea of fs.readFileSync(rutaEnv, "utf8").split(/\r?\n/)) {
    const m = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(linea);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { programarCumpleanos, revisarCumpleanos } = require("./birthday-mailer.js");

// ============================================================
// Selector de capa de datos:
//   DB_BACKEND=postgres|mysql|sqlite -> fuerza el motor.
//   DB_POSTGRES=1 -> intentar PostgreSQL (database.postgres.js).
//   DB_MYSQL=1    -> intentar MySQL/MariaDB (database.mysql.js).
//   DB_MYSQL=0    -> forzar SQLite (database.js).
//   Ausente       -> intentar PostgreSQL, luego MySQL; si no, SQLite.
// Se hace un sondeo real con timeout (3s): un adaptador solo se activa
// si el servidor responde. En cualquier otro caso cae a SQLite sin romper.
// ============================================================

function sondeoPostgres() {
  return new Promise(resolve => {
    let pg;
    try {
      pg = require("pg");
    } catch {
      return resolve(false); // pg no instalado
    }
    const sslFlag = String(process.env.PGSSL || process.env.DB_SSL || "").toLowerCase();
    let ssl = sslFlag === "true" || sslFlag === "1" || sslFlag === "require"
      ? { rejectUnauthorized: false }
      : undefined;
    let cfg;
    if (process.env.DATABASE_URL) {
      const u = new URL(process.env.DATABASE_URL);
      cfg = {
        host: u.hostname,
        port: Number(u.port) || 5432,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: (u.pathname || "").replace(/^\//, "") || "medhistorical",
      };
      if (!ssl && /sslmode=(require|prefer|verify)/i.test(process.env.DATABASE_URL)) {
        ssl = { rejectUnauthorized: false };
      }
    } else {
      cfg = {
        host: process.env.PGHOST || process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
        user: process.env.PGUSER || process.env.DB_USER || "postgres",
        password: process.env.PGPASSWORD || process.env.DB_PASS || "",
        database: process.env.PGDATABASE || process.env.DB_NAME || "medhistorical",
      };
    }
    const client = new pg.Client({ ...cfg, ssl, connectionTimeoutMillis: 3000 });
    client
      .connect()
      .then(() => client.query("SELECT 1"))
      .then(() => resolve(true))
      .catch(() => resolve(false))
      .finally(() => { client.end().catch(() => {}); });
  });
}

function sondeoMySQL() {
  return new Promise(resolve => {
    let mysql2;
    try {
      require.resolve("mysql2/promise");
      mysql2 = require("mysql2/promise");
    } catch {
      return resolve(false); // mysql2 no instalado
    }
    const conn = mysql2.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "medhistorical",
      connectTimeout: 3000,
    });
    conn
      .then(async c => {
        try {
          await c.query("SELECT 1");
          resolve(true);
        } catch {
          resolve(false);
        } finally {
          try { await c.end(); } catch {}
        }
      })
      .catch(() => resolve(false));
  });
}

async function elegirBase() {
  const backend = String(process.env.DB_BACKEND || "").toLowerCase();

  const usarSqlite = () => {
    console.log("Datos: usando SQLite (database.js).");
    return require("./database.js");
  };
  const intentarPostgres = async () => {
    if (await sondeoPostgres()) {
      console.log("Datos: usando PostgreSQL (database.postgres.js).");
      return require("./database.postgres.js");
    }
    return null;
  };
  const intentarMySQL = async () => {
    if (await sondeoMySQL()) {
      console.log("Datos: usando MySQL/MariaDB (database.mysql.js).");
      return require("./database.mysql.js");
    }
    return null;
  };

  if (backend === "sqlite" || process.env.DB_MYSQL === "0") return usarSqlite();

  if (backend === "postgres" || process.env.DB_POSTGRES === "1") {
    return (await intentarPostgres()) || usarSqlite();
  }

  if (backend === "mysql" || process.env.DB_MYSQL === "1") {
    return (await intentarMySQL()) || usarSqlite();
  }

  // Sin preferencia explicita: PostgreSQL -> MySQL -> SQLite.
  return (await intentarPostgres()) || (await intentarMySQL()) || usarSqlite();
}

const app = express();

// ============================================================
// Proteccion opcional con usuario/contrasena (Basic Auth).
// Si la variable APP_PASSWORD esta definida, TODO el sitio queda
// protegido con una ventana de usuario/contrasena del navegador.
// Util al publicar en internet (Render, etc.). Usuario: APP_USER (def. "admin").
// Si APP_PASSWORD no existe, no protege (uso local).
// ============================================================
if (process.env.APP_PASSWORD) {
  const usuarioOk = process.env.APP_USER || "admin";
  app.use((req, res, next) => {
    const cabecera = req.headers.authorization || "";
    const [tipo, b64] = cabecera.split(" ");
    if (tipo === "Basic" && b64) {
      const texto = Buffer.from(b64, "base64").toString("utf8");
      const i = texto.indexOf(":");
      if (i > 0 && texto.slice(0, i) === usuarioOk && texto.slice(i + 1) === process.env.APP_PASSWORD) {
        return next();
      }
    }
    res.set("WWW-Authenticate", 'Basic realm="MedHistorical"');
    return res.status(401).send("Autenticacion requerida");
  });
}

app.use(express.static(__dirname, { etag: false, setHeaders: res => res.set("Cache-Control", "no-cache, no-store, must-revalidate") }));
app.use(express.json({ limit: "50mb" }));

elegirBase()
  .then(Base => {
    app.locals.Base = Base;
    return Base.abrir().then(db => {
      app.locals.db = db;
      return Base.inicializar(db);
    });
  })
  .then(() => {
    const Base = app.locals.Base;

    app.get("/api/datos", async (req, res) => {
      try {
        res.json(await Base.cargarTodo(app.locals.db));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/datos/:modelo", async (req, res) => {
      const modelo = req.params.modelo;
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: "Cuerpo inválido: se espera un arreglo" });
      }
      try {
        await Base.reemplazarColeccion(app.locals.db, modelo, req.body);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/config", async (req, res) => {
      try {
        res.json(await Base.cargarConfig(app.locals.db));
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/config", async (req, res) => {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({ error: "Cuerpo inválido" });
      }
      try {
        await Base.guardarConfig(app.locals.db, req.body);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/api/datos", async (req, res) => {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ error: "Cuerpo inválido" });
      }
      try {
        await Base.guardarTodo(app.locals.db, req.body);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/categoria", async (req, res) => {
      const id = req.query.id || 1;
      try {
        const filas = await Base.consultar(
          app.locals.db,
          "SELECT * FROM Categories WHERE id = ?",
          [id]
        );
        res.json(filas[0] || { error: "No se encontró la categoría" });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/paciente", async (req, res) => {
      const cedula = String(req.query.cedula || "").trim();
      const codigo = String(req.query.codigo || "").trim().toUpperCase();
      if (!codigo) {
        return res.status(400).json({ error: "Falta el código de acceso" });
      }
      try {
        const todo = await Base.cargarTodo(app.locals.db);
        const p = (todo.pacientes || []).find(
          x =>
            String(x.codigo || "").toUpperCase() === codigo &&
            !x.eliminado &&
            (!cedula || String(x.cedula || "").trim() === cedula)
        );
        if (!p) return res.status(404).json({ error: "Paciente no encontrado" });
        const id = p.id;
        const filtrar = arr =>
          (arr || []).filter(x => Number(x.pacienteId) === Number(id));
        res.json({
          paciente: p,
          citas: filtrar(todo.citas),
          registros: filtrar(todo.registros),
          estudios: filtrar(todo.estudios),
          recetas: filtrar(todo.recetas),
          pros: filtrar(todo.pros),
          evaluaciones: filtrar(todo.evaluaciones),
          cirugias: filtrar(todo.cirugias || todo.cirugias_list || []),
          implantes: filtrar(todo.implantes || []),
          estudios_imagenes: filtrar(todo.estudios_imagenes || todo.imagenes || []),
          pt_sesiones: filtrar(todo.pt_sesiones || todo.rehabilitaciones || []),
          formularios_proms: filtrar(todo.formularios_proms || todo.pros || []),
          autorizaciones_preauth: filtrar(todo.autorizaciones_preauth || todo.autorizaciones || []),
          cargos_facturacion: filtrar(todo.cargos_facturacion || todo.cargos || []),
          rehabilitaciones: filtrar(todo.rehabilitaciones || [])
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/cumpleanos/revisar", async (req, res) => {
      try {
        const resultado = await revisarCumpleanos(Base, app.locals.db, { aviso: true });
        res.json(resultado);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, () => {
      console.log("Servidor en http://localhost:" + PORT);
    });

    programarCumpleanos({ Base, db: app.locals.db });
  })
  .catch(err => {
    console.error("Error al iniciar la base:", err.message);
    process.exit(1);
  });
