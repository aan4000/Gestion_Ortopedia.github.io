const s = require("sqlite3");
const p = require("path").join(__dirname, "data.db");
const db = new s.Database(p, s.OPEN_READWRITE | s.OPEN_CREATE, e => {
  if (e) { console.log("OPEN ERR " + e.message); return; }
  console.log("OPEN OK");
  db.run("CREATE TABLE IF NOT EXISTS Categories (id INTEGER PRIMARY KEY, name TEXT)", err => {
    console.log("CREATE -> " + (err ? "ERR " + err.message : "OK"));
    db.run("INSERT INTO Categories (id, name) VALUES (99, 'x')", err2 => {
      console.log("INSERT -> " + (err2 ? "ERR " + err2.message : "OK"));
      process.exit(0);
    });
  });
});
