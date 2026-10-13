// database.mysql.js
// Capa de datos para MySQL/MariaDB con la MISMA interfaz que database.js (SQLite).
// Uso:  set DB_MYSQL=1  (o en server: process.env.DB_MYSQL)
// Conexion via variables de entorno (valores por defecto pensados para XAMPP/WAMP/Laragon):
//   DB_HOST  (127.0.0.1)   DB_PORT  (3306)
//   DB_USER  (root)        DB_PASS  ("" vacio en XAMPP)
//   DB_NAME  (medhistorical)
'use strict';

const mysql = require("mysql2/promise");

const CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "medhistorical",
  waitForConnections: true,
  connectionLimit: 5,
  charset: "utf8mb4",
};

// Ojo: MariaDB (XAMPP) no soporta multiStatements por defecto; se evita.
// Consultas parametrizadas con `?` (nativo de mysql2).

const ES_TEXT = new Set(["nombre", "name", "email", "role", "foto", "cedula", "seguro",
  "telefono", "notas", "codigo", "amPm", "motivo", "titulo", "detalle", "tipo",
  "descripcion", "format", "hora", "fecha", "turno", "doctor", "edad"]);

// Genera la definicion SQL de una columna MySQL a partir del nombre+campo.
function definicionColumna(campo) {
  if (campo === "id") return "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY";
  if (campo.endsWith("Id")) return "`" + campo + "` BIGINT";
  if (["eliminado", "completada", "cancelada", "turno"].includes(campo)) {
    return "`" + campo + "` TINYINT(1) DEFAULT 0";
  }
  if (["items", "medicamentos", "indicaciones", "lesiones", "archivo", "proximaCita", "dataUrl", "estudios", "evaluaciones", "documentos", "implantes", "seguimiento", "sesiones", "ortesis"].includes(campo)) {
    return "`" + campo + "` JSON NULL DEFAULT NULL";
  }
  if (["datos", "valor"].includes(campo)) return "`" + campo + "` LONGTEXT";
  return "`" + campo + "` " + (ES_TEXT.has(campo) ? "TEXT" : "LONGTEXT");
}

// Espejo del CATALOGO de database.js: (nombre de tab// coleccion -> tabla)
const TABLAS = {
  config: "config",
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

// columnas por coleccion (mismas que database.js)
const COLECCIONES = {
  usuarios: ["id", "name", "email", "password", "role", "foto", "createdAt"],
  pacientes: ["id", "codigo", "nombre", "cedula", "seguro", "edad", "fechaNacimiento", "sexo", "telefono", "email", "notas", "foto", "eliminado", "createdAt", "ocupacion", "manoDominante", "razonConsulta", "historiaActual", "antecedentesMorbidos", "antecedentesQuirurgicos", "antecedentesAlergicos"],
  citas: ["id", "pacienteId", "fecha", "hora", "amPm", "motivo", "turno", "completada", "diagnostico", "tratamiento", "fechaCompletada", "cancelada", "fechaCancelacion"],
  registros: ["id", "pacienteId", "titulo", "detalle", "fecha", "tipo", "archivo", "proximaCita", "eva"],
  documentos: ["id", "pacienteId", "descripcion", "name", "type", "size", "dataUrl", "fecha"],
  facturas: ["id", "codigo", "pacienteId", "subtotal", "porcentaje", "honorarios", "neto", "total", "doctor", "fecha", "items"],
  citasSinConsulta: ["id", "pacienteId", "fecha", "hora", "amPm", "motivo"],
  recetas: ["id", "codigo", "pacienteId", "fecha", "edad", "doctor", "medicamentos", "indicaciones"],
  evaluaciones: ["id", "pacienteId", "fecha", "sexo", "nota", "lesiones", "pruebas"],
  estudios: ["id", "pacienteId", "tipo", "descripcion", "name", "type", "size", "dataUrl", "fecha"],
  cirugias: ["id", "pacienteId", "fecha", "tipoCirugia", "lateralidad", "cirujano", "ayudante", "sala", "anestesia", "duracion", "descripcion", "implantes", "complicaciones", "notas", "seguimiento"],
  rehabilitaciones: ["id", "pacienteId", "fechaInicio", "fechaFin", "diagnostico", "objetivos", "metas", "sesiones"],
  pros: ["id", "pacienteId", "fecha", "tipo", "evaluaciones", "promedio", "notas"],
  ortesis: ["id", "pacienteId", "fecha", "diagnostico", "ortesis", "notas"],
  evaluacionesMedicas: ["id", "pacienteId", "fecha", "motivo", "antecedentes", "signosVitales", "examenFisico", "diagnostico", "plan", "notas"],
  referimientos: ["id", "pacienteId", "fecha", "diagnostico", "planTerapia", "notas"],
  implantes: ["id", "codigo", "fabricante", "modelo", "lote", "serie", "tamanio", "fechaCaducidad", "ubicacion", "estado", "pacienteId", "cirugiaId", "fechaUso", "notas", "createdAt"],
  estudios_imagenes: ["id", "pacienteId", "fecha", "estudioTipo", "region", "lado", "descripcion", "hallazgos", "dcmId", "path", "url", "comparacion", "medicoSolicitante", "centro", "createdAt"],
  pt_sesiones: ["id", "pacienteId", "fecha", "numeroSesion", "objetivo", "ejercicios", "dolorAntes", "dolorDespues", "rom", "asistencia", "notas", "profesional", "createdAt"],
  formularios_proms: ["id", "pacienteId", "fecha", "tipo", "respuestas", "puntajeTotal", "interpretacion", "createdAt"],
  autorizaciones_preauth: ["id", "pacienteId", "procedimientoCPT", "fechaSolicitud", "estado", "numeroAuth", "vencimiento", "aseguradora", "notas", "createdAt"],
  cargos_facturacion: ["id", "pacienteId", "fecha", "origen", "cpt", "hcpcs", "modifier1", "modifier2", "modifier3", "unidades", "dx", "monto", "estado", "denialReason", "globalPeriodRelacionado", "authId", "createdAt"],
  implantes: ["id", "codigo", "fabricante", "modelo", "lote", "serie", "tamanio", "fechaCaducidad", "ubicacion", "estado", "pacienteId", "cirugiaId", "fechaUso", "notas", "createdAt"],
  estudios_imagenes: ["id", "pacienteId", "fecha", "estudioTipo", "region", "lado", "descripcion", "hallazgos", "dcmId", "path", "url", "comparacion", "medicoSolicitante", "centro", "createdAt"],
  pt_sesiones: ["id", "pacienteId", "fecha", "numeroSesion", "objetivo", "ejercicios", "dolorAntes", "dolorDespues", "rom", "asistencia", "notas", "profesional", "createdAt"],
  formularios_proms: ["id", "pacienteId", "fecha", "tipo", "respuestas", "puntajeTotal", "interpretacion", "createdAt"],
  autorizaciones_preauth: ["id", "pacienteId", "procedimientoCPT", "fechaSolicitud", "estado", "numeroAuth", "vencimiento", "aseguradora", "notas", "createdAt"],
  cargos_facturacion: ["id", "pacienteId", "fecha", "origen", "cpt", "hcpcs", "modifier1", "modifier2", "modifier3", "unidades", "dx", "monto", "estado", "denialReason", "globalPeriodRelacionado", "authId", "createdAt"],
};

const CAMPOS_JSON = new Set(["items", "medicamentos", "indicaciones", "lesiones", "archivo", "proximaCita", "dataUrl", "implantes", "seguimiento", "sesiones", "evaluaciones", "antecedentes", "signosVitales", "antecedentesMorbidos", "antecedentesQuirurgicos", "antecedentesAlergicos", "ortesis", "pruebas", "planTerapia"]);
const CAMPOS_BOOL = new Set(["eliminado", "completada", "cancelada"]);

let pool = null;

function abrir() {
  if (pool) return Promise.resolve(pool);
  pool = mysql.createPool({ ...CONFIG, connectionLimit: 1, multipleStatements: false });
  return Promise.resolve(pool);
}

async function inicializar(db) {
  // No se crea la base aqui: el importador medhistorical.sql la crea.
  // Se aseguran las tablas (idempotente) por si se conecta a una base ya creada.
  for (const [coleccion, columnas] of Object.entries(COLECCIONES)) {
    const tabla = TABLAS[coleccion];
    const cols = columnas.map(definicionColumna).join(",\n  ");
    await ejecutar(db, `CREATE TABLE IF NOT EXISTS \`${tabla}\` (\n  ${cols}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  await ejecutar(db, "CREATE TABLE IF NOT EXISTS `config` (`clave` VARCHAR(64) PRIMARY KEY, `valor` LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  // Asegurar columnas nuevas en tablas ya existentes (idempotente).
  for (const [coleccion, columnas] of Object.entries(COLECCIONES)) {
    const tabla = TABLAS[coleccion];
    for (const campo of columnas) {
      if (campo === "id") continue;
      try {
        await ejecutar(db, `ALTER TABLE \`${tabla}\` ADD COLUMN ${definicionColumna(campo)}`);
      } catch { /* la columna ya existe */ }
    }
  }
}

async function ejecutar(db, sql, params = []) {
  const [res] = await db.query(sql, params);
  return res;
}

async function consultar(db, sql, params = []) {
  const [filas] = await db.query(sql, params);
  return filas;
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
      try { dato[campo] = JSON.parse(valor); } catch { continue; }
      continue;
    }
    if (CAMPOS_BOOL.has(campo)) {
      dato[campo] = valor === 1 || valor === true || valor === "1";
      continue;
    }
    dato[campo] = valor;
  }
  return dato;
}

function datoAFila(modelo, dato) {
  return modelo.map(campo => {
    const valor = dato ? dato[campo] : undefined;
    if (valor === undefined) return null;
    if (CAMPOS_JSON.has(campo)) return JSON.stringify(valor);
    if (CAMPOS_BOOL.has(campo)) return valor ? 1 : 0;
    return valor;
  });
}

async function cargarTodo(db) {
  const salida = { config: {} };
  for (const [clave, modelo] of Object.entries(COLECCIONES)) {
    const filas = await consultar(db, `SELECT * FROM \`${TABLAS[clave]}\``);
    salida[clave] = filas.map(f => filaADato(modelo, f));
  }
  salida.config = await cargarConfig(db);
  return salida;
}

async function guardarTodo(db, datos) {
  await ejecutar(db, "SET autocommit = 0");
  await ejecutar(db, "START TRANSACTION");
  try {
    for (const [clave, modelo] of Object.entries(COLECCIONES)) {
      await fondoColeccion(db, clave, modelo, datos[clave] || []);
    }
    await ejecutar(db, "DELETE FROM `config`");
    const cfg = datos.config || {};
    for (const [k, v] of Object.entries(cfg)) {
      await ejecutar(db, "INSERT INTO `config` (`clave`, `valor`) VALUES (?, ?)", [k, JSON.stringify(v)]);
    }
    await ejecutar(db, "COMMIT");
  } catch (err) {
    await ejecutar(db, "ROLLBACK");
    throw err;
  } finally {
    await ejecutar(db, "SET autocommit = 1").catch(() => {});
  }
}

async function cargarColeccion(db, clave) {
  const modelo = COLECCIONES[clave];
  if (!modelo) throw new Error("Coleccion desconocida: " + clave);
  const filas = await consultar(db, `SELECT * FROM \`${TABLAS[clave]}\``);
  return filas.map(f => filaADato(modelo, f));
}

async function reemplazarColeccion(db, clave, datos) {
  const modelo = COLECCIONES[clave];
  if (!modelo) throw new Error("Coleccion desconocida: " + clave);
  await fondoColeccion(db, clave, modelo, datos || []);
}

async function fondoColeccion(db, clave, modelo, datos) {
  const tabla = TABLAS[clave];
  await ejecutar(db, `SET autocommit = 0`);
  await ejecutar(db, "START TRANSACTION");
  try {
    await ejecutar(db, `DELETE FROM \`${tabla}\``);
    const filas = datos.map(d => datoAFila(modelo, d));
    if (filas.length) {
      const cols = modelo.map(c => "`" + c + "`").join(", ");
      const ph = modelo.map(() => "?").join(", ");
      await ejecutar(db, `INSERT INTO \`${tabla}\` (${cols}) VALUES (${ph})`, filas[0]);
      // mysql2 batch: enviar restantes por lotes
      if (filas.length > 1) {
        const [arr] = await db.query("SELECT 1");
        void arr;
        const sql2 = `INSERT INTO \`${tabla}\` (${cols}) VALUES ${filas.slice(1).map(() => "(" + modelo.map(() => "?").join(", ") + ")").join(", ")}`;
        await db.query(sql2, filas.slice(1).flat());
      }
    }
    await ejecutar(db, "COMMIT");
  } catch (err) {
    await ejecutar(db, "ROLLBACK");
    throw err;
  } finally {
    await ejecutar(db, "SET autocommit = 1").catch(() => {});
  }
}

async function cargarConfig(db) {
  const filas = await consultar(db, "SELECT * FROM `config`");
  const cfg = {};
  for (const f of filas) {
    try { cfg[f.clave] = JSON.parse(f.valor); } catch { cfg[f.clave] = f.valor; }
  }
  return cfg;
}

async function guardarConfig(db, config) {
  await ejecutar(db, "SET autocommit = 0");
  await ejecutar(db, "START TRANSACTION");
  try {
    await ejecutar(db, "DELETE FROM `config`");
    for (const [k, v] of Object.entries(config || {})) {
      await ejecutar(db, "INSERT INTO `config` (`clave`, `valor`) VALUES (?, ?)", [k, JSON.stringify(v)]);
    }
    await ejecutar(db, "COMMIT");
  } catch (err) {
    await ejecutar(db, "ROLLBACK");
    throw err;
  } finally {
    await ejecutar(db, "SET autocommit = 1").catch(() => {});
  }
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
};
