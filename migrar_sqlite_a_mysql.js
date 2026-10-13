// migrar_sqlite_a_mysql.js
// Lee data.db (SQLite) y genera un dump .sql compatible con MySQL/MariaDB (XAMPP).
// Uso:  node migrar_sqlite_a_mysql.js
// Salida: medhistorical.sql  (+ log en consola)
'use strict';

const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const RUTA_DB = path.join(__dirname, 'data.db');
const SALIDA = path.join(__dirname, 'medhistorical.sql');

const tipoMySQL = (decl) => {
  const s = String(decl || '').toUpperCase();
  const m = s.match(/"(\w+)"\s+([A-Z]+)/);
  const col = m ? m[1] : 'c';
  const t = m ? m[2] : 'TEXT';
  let tt;
  switch (t) {
    case 'INTEGER': tt = 'INT'; break;
    case 'REAL': tt = 'DOUBLE'; break;
    case 'TEXT':
    case 'CHAR':
    case 'CLOB':
    case 'VARCHAR': tt = 'LONGTEXT'; break;
    case 'BLOB': tt = 'LONGBLOB'; break;
    default: tt = 'LONGTEXT'; break;
  }
  const pk = /PRIMARY\s+KEY/i.test(decl);
  const ai = /AUTOINCREMENT/i.test(decl);
  let d = '`' + col + '` ' + tt;
  if (pk) d += ' NOT NULL PRIMARY KEY' + (ai ? ' AUTO_INCREMENT' : '');
  return d;
};

const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v);
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) return s;
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
};

const db = new sqlite3.Database(RUTA_DB);
const out = [];
out.push('-- Generado por migrar_sqlite_a_mysql.js');
out.push('-- Importar con:  mysql -u root -p < medhistorical.sql');
out.push('-- o desde phpMyAdmin de XAMPP usando la pestana "Importar".');
out.push('-- Recomendado en phpMyAdmin: solo "habilitar SQL" y modo de compatibilidad NONE.');
out.push('');
out.push('SET NAMES utf8mb4;');
out.push('SET FOREIGN_KEY_CHECKS = 0;');
out.push('DROP DATABASE IF EXISTS medhistorical;');
out.push('CREATE DATABASE IF NOT EXISTS medhistorical CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
out.push('USE medhistorical;');
out.push('');

const tablas = [];
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('kv') ORDER BY name", (e, filas) => {
  if (e) { console.error('ERROR listando tablas:', e.message); process.exit(1); }
  const arr = Array.isArray(filas) ? filas : [];
  let pend = arr.length;
  arr.forEach((f) => {
    const t = f.name;
    db.all('PRAGMA table_info("' + t + '")', (e2, cols) => {
      if (e2) { console.error('ERROR columnas de ' + t + ':', e2.message); }
      const colsArr = Array.isArray(cols) ? cols : [];
      const lista = colsArr.map((c) => tipoMySQL(c.sql || ('"' + c.name + '" ' + c.type)));
      out.push('DROP TABLE IF EXISTS `' + t + '`;');
      out.push('CREATE TABLE `' + t + '` (');
      out.push('  ' + lista.join(',\n  '));
      out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
      out.push('');

      db.all('SELECT * FROM "' + t + '"', (e3, filasD) => {
        (Array.isArray(filasD) ? filasD : []).forEach((r) => {
          const claves = colsArr.map((c) => '`' + c.name + '`').join(',');
          const valores = colsArr.map((c) => esc(r[c.name])).join(',');
          out.push('INSERT INTO `' + t + '` (' + claves + ') VALUES (' + valores + ');');
        });
        out.push('');
        pend--;
        if (pend === 0) {
          out.push('SET FOREIGN_KEY_CHECKS = 1;');
          fs.writeFileSync(SALIDA, out.join('\n'), 'utf8');
          console.log('OK: ' + SALIDA + '  (' + Math.round(fs.statSync(SALIDA).size / 1024) + ' KB)');
          db.close();
        }
      });
    });
  });
});
