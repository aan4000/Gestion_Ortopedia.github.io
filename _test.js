const Base = require("./database");
Base.abrir()
  .then(db => { console.log("ABIERTO OK"); return Base.inicializar(db); })
  .then(() => { console.log("INIT OK"); process.exit(0); })
  .catch(e => { console.log("ERR " + e.message); process.exit(1); });
