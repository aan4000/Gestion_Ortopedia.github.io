// database.postgres.js
// Capa de datos para PostgreSQL con la MISMA interfaz que database.js (SQLite)
// y database.mysql.js. Se activa desde server.js o con:  DB_BACKEND=postgres
// Conexion via variables de entorno (o archivo .env):
//   PGHOST / DB_HOST   (127.0.0.1)
//   PGPORT / DB_PORT   (5432)
//   PGUSER / DB_USER   (postgres)
//   PGPASSWORD / DB_PASS ("")
//   PGDATABASE / DB_NAME (medhistorical)
//
// Notas de compatibilidad: pensado para funcionar tambien en PostgreSQL 9.5,
// por eso se evitan funciones modernas (IDENTITY, ON CONFLICT, etc.).
'use strict';

const { Pool, types } = require("pg");

// PostgreSQL devuelve BIGINT (int8, OID 20) como texto; el frontend espera
// numeros (los ids son obtenidos con Date.now()). Se convierten a Number.
types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));

// SSL: en la nube (Northflank, Render, etc.) suele ser obligatorio.
// Se activa con PGSSL=true (o DB_SSL=true) o con un DATABASE_URL sslmode=require.
let SSL = undefined;
const SSL_FLAG = String(process.env.PGSSL || process.env.DB_SSL || "").toLowerCase();
if (SSL_FLAG === "true" || SSL_FLAG === "1" || SSL_FLAG === "require") {
  SSL = { rejectUnauthorized: false };
}

// Dos formas de configurar la conexion:
//   1) DATABASE_URL=postgres://usuario:clave@host:puerto/base  (Northflank/Render)
//   2) Variables sueltas PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
let CONEXION;
if (process.env.DATABASE_URL) {
  const u = new URL(process.env.DATABASE_URL);
  CONEXION = {
    host: u.hostname,
    port: Number(u.port) || 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: (u.pathname || "").replace(/^\//, "") || "medhistorical",
  };
  if (!SSL && /sslmode=(require|prefer|verify)/i.test(process.env.DATABASE_URL)) {
    SSL = { rejectUnauthorized: false };
  }
} else {
  CONEXION = {
    host: process.env.PGHOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
    user: process.env.PGUSER || process.env.DB_USER || "postgres",
    password: process.env.PGPASSWORD || process.env.DB_PASS || "",
    database: process.env.PGDATABASE || process.env.DB_NAME || "medhistorical",
  };
}

const CONFIG = { ...CONEXION, ssl: SSL, max: 5 };

// Coleccion -> tabla (igual que database.js)
const TABLAS = {
  usuarios: "usuarios",
  pacientes: "pacientes",
  citas: "citas",
  registros: "registros",
  documentos: "documentos",
  facturas: "facturas",
  citasSinConsulta: "citas_sin_consulta",
  recetas: "recetas",
  evaluaciones: "evaluaciones",
  estudios: "estudios",
  cirugias: "cirugias",
  rehabilitaciones: "rehabilitaciones",
  pros: "pros",
  ortesis: "ortesis",
  evaluacionesMedicas: "evaluaciones_medicas",
  referimientos: "referimientos",
};

// Columnas por coleccion (mismas que database.js)
const COLECCIONES = {
  usuarios: ["id", "name", "email", "password", "role", "foto", "createdAt"],
  pacientes: ["id", "codigo", "nombre", "cedula", "seguro", "edad", "fechaNacimiento", "sexo", "telefono", "email", "notas", "foto", "eliminado", "createdAt", "ocupacion", "manoDominante", "razonConsulta", "historiaActual", "antecedentesMorbidos", "antecedentesQuirurgicos", "antecedentesAlergicos"],
  citas: ["id", "pacienteId", "fecha", "hora", "amPm", "motivo", "turno", "completada", "diagnostico", "tratamiento", "fechaCompletada", "cancelada", "fechaCancelacion"],
  registros: ["id", "pacienteId", "titulo", "detalle", "fecha", "tipo", "archivo", "proximaCita", "eva"],
  documentos: ["id", "pacienteId", "descripcion", "name", "type", "size", "dataUrl", "fecha"],
  facturas: ["id", "codigo", "pacienteId", "subtotal", "porcentaje", "honorarios", "neto", "total", "doctor", "fecha", "items"],
  citasSinConsulta: ["id", "pacienteId", "fecha", "hora", "amPm", "motivo", "turno"],
  recetas: ["id", "codigo", "pacienteId", "fecha", "edad", "doctor", "medicamentos", "indicaciones"],
  evaluaciones: ["id", "pacienteId", "fecha", "sexo", "nota", "lesiones", "pruebas"],
  estudios: ["id", "pacienteId", "tipo", "descripcion", "name", "type", "size", "dataUrl", "fecha"],
  cirugias: ["id", "pacienteId", "fecha", "tipoCirugia", "lateralidad", "cirujano", "ayudante", "sala", "anestesia", "duracion", "descripcion", "implantes", "complicaciones", "notas", "seguimiento"],
  rehabilitaciones: ["id", "pacienteId", "fechaInicio", "fechaFin", "diagnostico", "objetivos", "metas", "sesiones"],
  pros: ["id", "pacienteId", "fecha", "tipo", "evaluaciones", "promedio", "notas"],
  ortesis: ["id", "pacienteId", "fecha", "diagnostico", "ortesis", "notas"],
  evaluacionesMedicas: ["id", "pacienteId", "fecha", "motivo", "antecedentes", "signosVitales", "examenFisico", "diagnostico", "plan", "notas"],
  referimientos: ["id", "pacienteId", "fecha", "diagnostico", "planTerapia", "notas"],
};

const CAMPOS_JSON = new Set(["items", "medicamentos", "indicaciones", "lesiones", "archivo", "proximaCita", "dataUrl", "implantes", "seguimiento", "sesiones", "evaluaciones", "antecedentes", "signosVitales", "antecedentesMorbidos", "antecedentesQuirurgicos", "antecedentesAlergicos", "ortesis", "pruebas", "planTerapia"]);
const CAMPOS_BOOL = new Set(["eliminado", "completada", "cancelada"]);

// Definicion de columna PostgreSQL a partir del nombre del campo.
// Los campos JSON se guardan como TEXT (texto JSON) para que el frontend
// reciba exactamente el mismo formato que con SQLite/MySQL.
function definicionColumna(campo) {
  if (campo === "id") return '"id" BIGSERIAL PRIMARY KEY';
  if (campo.endsWith("Id")) return '"' + campo + '" BIGINT';
  if (CAMPOS_BOOL.has(campo)) return '"' + campo + '" SMALLINT DEFAULT 0';
  return '"' + campo + '" TEXT';
}

// Traduce los marcadores `?` (estilo SQLite/MySQL) a `$1,$2,...` de PostgreSQL.
function aParametros(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => "$" + ++n);
}

let pool = null;

function abrir() {
  if (!pool) pool = new Pool(CONFIG);
  return Promise.resolve(pool);
}

async function ejecutar(db, sql, params = []) {
  return db.query(aParametros(sql), params);
}

async function consultar(db, sql, params = []) {
  const res = await db.query(aParametros(sql), params);
  return res.rows;
}

async function inicializar(db) {
  // No se crea la base (el migrador o el usuario la crean). Solo las tablas.
  for (const [coleccion, columnas] of Object.entries(COLECCIONES)) {
    const tabla = TABLAS[coleccion];
    const defs = columnas.map(definicionColumna).join(",\n  ");
    await ejecutar(db, `CREATE TABLE IF NOT EXISTS "${tabla}" (\n  ${defs}\n)`);
  }
  await ejecutar(db, 'CREATE TABLE IF NOT EXISTS "config" ("clave" VARCHAR(64) PRIMARY KEY, "valor" TEXT)');
  await ejecutar(db, 'CREATE TABLE IF NOT EXISTS "Categories" ("id" INTEGER PRIMARY KEY, "name" TEXT)');
  // Asegurar columnas nuevas en tablas ya existentes (idempotente).
  for (const [coleccion, columnas] of Object.entries(COLECCIONES)) {
    const tabla = TABLAS[coleccion];
    for (const campo of columnas) {
      if (campo === "id") continue;
      try {
        await ejecutar(db, `ALTER TABLE "${tabla}" ADD COLUMN ${definicionColumna(campo)}`);
      } catch { /* la columna ya existe */ }
    }
  }
}

function filaADato(modelo, fila) {
  const dato = {};
  for (const campo of modelo) {
    const valor = fila[campo];
    if (valor === null || valor === undefined) {
      if (CAMPOS_BOOL.has(campo)) dato[campo] = false;
      continue;
    }
    if (CAMPOS_JSON.has(campo)) {
      if (typeof valor === "object") { dato[campo] = valor; continue; }
      try { dato[campo] = JSON.parse(valor); } catch { continue; }
      continue;
    }
    if (CAMPOS_BOOL.has(campo)) {
      dato[campo] = valor === 1 || valor === true || valor === "1";
      continue;
    }
    if ((campo === "id" || /Id$/.test(campo)) && typeof valor === "string" && valor.trim() !== "" && !isNaN(Number(valor))) {
      dato[campo] = Number(valor);
      continue;
    }
    dato[campo] = valor;
  }
  return dato;
}

function datoAFila(modelo, dato) {
  return modelo.map(campo => {
    const valor = dato ? dato[campo] : undefined;
    if (valor === undefined || valor === null) return null;
    if (CAMPOS_JSON.has(campo)) return JSON.stringify(valor);
    if (CAMPOS_BOOL.has(campo)) return valor ? 1 : 0;
    return valor;
  });
}

// Ejecuta una funcion dentro de una transaccion usando un cliente dedicado.
async function conTransaccion(db, fn) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await fn(client);
    await client.query("COMMIT");
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

async function fondoColeccion(client, clave, modelo, datos) {
  const tabla = TABLAS[clave];
  await ejecutar(client, `DELETE FROM "${tabla}"`);
  const filas = (datos || []).map(d => datoAFila(modelo, d));
  if (!filas.length) return;
  const cols = modelo.map(c => '"' + c + '"').join(", ");
  const porFila = modelo.length;
  const lote = Math.max(1, Math.floor(30000 / porFila)); // limite de parametros de Postgres
  for (let i = 0; i < filas.length; i += lote) {
    const trozo = filas.slice(i, i + lote);
    const placeholders = trozo
      .map((_, r) => "(" + modelo.map((_, c) => "$" + (r * porFila + c + 1)).join(", ") + ")")
      .join(", ");
    const valores = trozo.flat();
    await client.query(`INSERT INTO "${tabla}" (${cols}) VALUES ${placeholders}`, valores);
  }
}

async function cargarTodo(db) {
  const salida = { config: {} };
  for (const [clave, modelo] of Object.entries(COLECCIONES)) {
    const filas = await consultar(db, `SELECT * FROM "${TABLAS[clave]}"`);
    salida[clave] = filas.map(f => filaADato(modelo, f));
  }
  salida.config = await cargarConfig(db);
  return salida;
}

async function guardarTodo(db, datos) {
  await conTransaccion(db, async client => {
    for (const [clave, modelo] of Object.entries(COLECCIONES)) {
      await fondoColeccion(client, clave, modelo, datos[clave] || []);
    }
    await ejecutar(client, 'DELETE FROM "config"');
    const cfg = datos.config || {};
    for (const [k, v] of Object.entries(cfg)) {
      await ejecutar(client, 'INSERT INTO "config" ("clave", "valor") VALUES (?, ?)', [k, JSON.stringify(v)]);
    }
  });
}

async function cargarColeccion(db, clave) {
  const modelo = COLECCIONES[clave];
  if (!modelo) throw new Error("Coleccion desconocida: " + clave);
  const filas = await consultar(db, `SELECT * FROM "${TABLAS[clave]}"`);
  return filas.map(f => filaADato(modelo, f));
}

async function reemplazarColeccion(db, clave, datos) {
  const modelo = COLECCIONES[clave];
  if (!modelo) throw new Error("Coleccion desconocida: " + clave);
  await conTransaccion(db, client => fondoColeccion(client, clave, modelo, datos || []));
}

async function cargarConfig(db) {
  const filas = await consultar(db, 'SELECT "clave", "valor" FROM "config"');
  const cfg = {};
  for (const f of filas) {
    try { cfg[f.clave] = JSON.parse(f.valor); } catch { cfg[f.clave] = f.valor; }
  }
  return cfg;
}

async function guardarConfig(db, config) {
  await conTransaccion(db, async client => {
    await ejecutar(client, 'DELETE FROM "config"');
    for (const [k, v] of Object.entries(config || {})) {
      await ejecutar(client, 'INSERT INTO "config" ("clave", "valor") VALUES (?, ?)', [k, JSON.stringify(v)]);
    }
  });
}

// Lista de nombres de tabla gestionados por esta capa.
function tablasGestionadas() {
  return Object.values(TABLAS);
}

module.exports = {
  abrir,
  inicializar,
  consultar,
  ejecutar,
  cargarTodo,
  guardarTodo,
  cargarColeccion,
  reemplazarColeccion,
  cargarConfig,
  guardarConfig,
  // expuestos para el migrador
  TABLAS,
  COLECCIONES,
  CAMPOS_JSON,
  CAMPOS_BOOL,
  definicionColumna,
  filaADato,
  datoAFila,
  tablasGestionadas,
  CONFIG,
};
