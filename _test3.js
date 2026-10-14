const s = require("sqlite3");
const p = require("path").join(__dirname, "fresh_test.db");
const db = new s.Database(p, s.OPEN_READWRITE | s.OPEN_CREATE, e => {
  if (e) { console.log("OPEN ERR " + e.message); return; }
  console.log("OPEN OK");
  db.run("CREATE TABLE t (id INTEGER)", err => {
    console.log("CREATE -> " + (err ? "ERR " + err.message : "OK"));
    db.run("INSERT INTO t VALUES (1)", err2 => {
      console.log("INSERT -> " + (err2 ? "ERR " + err2.message : "OK"));
      process.exit(0);
    });
  });
});
