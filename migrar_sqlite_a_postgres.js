// migrar_sqlite_a_postgres.js
// Lee data.db (SQLite) y copia TODA la informacion a PostgreSQL.
// Uso:  node migrar_sqlite_a_postgres.js
// Credenciales por variables de entorno o archivo .env (PGHOST, PGPORT,
// PGUSER, PGPASSWORD, PGDATABASE).
'use strict';

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

// --- cargar .env (sin dependencias) ---
const rutaEnv = path.join(__dirname, '.env');
if (fs.existsSync(rutaEnv)) {
  for (const linea of fs.readFileSync(rutaEnv, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(linea);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const dbpg = require('./database.postgres.js');

const RUTA_DB = path.join(__dirname, 'data.db');

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
}

async function asegurarBase() {
  // En la nube (Northflank, etc.) la base ya existe y puede que el usuario no
  // tenga permiso para crear bases: si algo falla, se continua con la existente.
  const { Client } = require('pg');
  let cliente;
  try {
    cliente = new Client({ ...dbpg.CONFIG, database: 'postgres' });
    await cliente.connect();
    const r = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbpg.CONFIG.database]);
    if (r.rowCount === 0) {
      await cliente.query('CREATE DATABASE "' + dbpg.CONFIG.database + '"');
      console.log('Base creada: ' + dbpg.CONFIG.database);
    } else {
      console.log('Base existente: ' + dbpg.CONFIG.database);
    }
  } catch (e) {
    console.log('Aviso: no se pudo verificar/crear la base (' + e.message + '). Se usara la base indicada.');
  } finally {
    if (cliente) { try { await cliente.end(); } catch {} }
  }
}

async function insertar(pool, tabla, columnas, filas) {
  if (!filas.length) return 0;
  const cols = columnas.map(c => '"' + c + '"').join(', ');
  const n = columnas.length;
  const lote = Math.max(1, Math.floor(30000 / n));
  let total = 0;
  for (let i = 0; i < filas.length; i += lote) {
    const trozo = filas.slice(i, i + lote);
    const ph = trozo
      .map((_, r) => '(' + columnas.map((_, c) => '$' + (r * n + c + 1)).join(', ') + ')')
      .join(', ');
    await pool.query(`INSERT INTO "${tabla}" (${cols}) VALUES ${ph}`, trozo.flat());
    total += trozo.length;
  }
  return total;
}

async function main() {
  if (!fs.existsSync(RUTA_DB)) {
    console.error('No se encontro ' + RUTA_DB);
    process.exit(1);
  }
  const sqlite = new sqlite3.Database(RUTA_DB);

  console.log('Conectando a PostgreSQL en ' + dbpg.CONFIG.host + ':' + dbpg.CONFIG.port + ' ...');
  await asegurarBase();
  const pool = await dbpg.abrir();

  // Esquema limpio: si ya existian tablas (por ejemplo de una corrida previa
  // con tipos incorrectos), se eliminan y se recrean con el tipo correcto.
  for (const tabla of dbpg.tablasGestionadas()) {
    await pool.query(`DROP TABLE IF EXISTS "${tabla}" CASCADE`);
  }
  await pool.query('DROP TABLE IF EXISTS "config" CASCADE');

  await dbpg.inicializar(pool);

  let totalGeneral = 0;

  for (const [clave, columnas] of Object.entries(dbpg.COLECCIONES)) {
    const tabla = dbpg.TABLAS[clave];
    let filas = [];
    try {
      filas = await sqliteAll(sqlite, `SELECT * FROM "${tabla}"`);
    } catch {
      console.log(tabla.padEnd(26) + ' (no existe en SQLite, omitida)');
      continue;
    }
    const datos = filas.map(f => columnas.map(c => (f[c] === undefined ? null : f[c])));
    await pool.query(`DELETE FROM "${tabla}"`);
    const n = await insertar(pool, tabla, columnas, datos);
    // Ajusta la secuencia del id por si falta insertar sin id en el futuro.
    try {
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('"${tabla}"','id'), COALESCE((SELECT MAX(id) FROM "${tabla}"), 1), (SELECT COUNT(*) > 0 FROM "${tabla}"))`
      );
    } catch {}
    totalGeneral += n;
    console.log(tabla.padEnd(26) + ' ' + n + ' filas');
  }

  // config
  try {
    const cfg = await sqliteAll(sqlite, 'SELECT clave, valor FROM config');
    await pool.query('DELETE FROM "config"');
    for (const f of cfg) {
      await pool.query('INSERT INTO "config" ("clave","valor") VALUES ($1,$2)', [f.clave, f.valor]);
    }
    console.log('config'.padEnd(26) + ' ' + cfg.length + ' claves');
  } catch {
    console.log('config'.padEnd(26) + ' (no existe, omitida)');
  }

  await pool.end();
  sqlite.close();
  console.log('\nMigracion completada: ' + totalGeneral + ' filas copiadas a PostgreSQL.');
}

main().catch(err => {
  console.error('ERROR de migracion:', err.message);
  process.exit(1);
});
