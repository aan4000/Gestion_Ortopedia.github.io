function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MODELOS = {
  orto_users: "usuarios",
  orto_pacientes: "pacientes",
  orto_citas: "citas",
  orto_registros: "registros",
  orto_documentos: "documentos",
  orto_facturas: "facturas",
  orto_citas_sin_consulta: "citasSinConsulta",
  orto_recetas: "recetas",
  orto_evaluaciones: "evaluaciones",
  orto_evaluaciones_medicas: "evaluacionesMedicas",
  orto_estudios: "estudios",
  orto_pros: "pros",
  orto_cirugias: "cirugias",
  orto_rehabilitaciones: "rehabilitaciones",
  orto_ortesis: "ortesis",
  orto_referimientos: "referimientos"
};

const traductorModelo = {
  usuarios: "users",
  pacientes: "pacientes",
  citas: "citas",
  registros: "registros",
  documentos: "documents",
  facturas: "facturas",
  citasSinConsulta: "citasSinConsulta",
  recetas: "recetas",
  evaluaciones: "evaluaciones",
  evaluacionesMedicas: "evaluacionesMedicas",
  estudios: "estudios",
  pros: "pros",
  cirugias: "cirugias",
  rehabilitaciones: "rehabilitaciones",
  ortesis: "ortesis",
  referimientos: "referimientos"
};

const BD = (() => {
  const cache = {
    colecciones: {
      usuarios: [],
      pacientes: [],
      citas: [],
      registros: [],
      documentos: [],
      facturas: [],
      citasSinConsulta: [],
      recetas: [],
      evaluaciones: [],
      evaluacionesMedicas: [],
      estudios: [],
      pros: [],
      cirugias: [],
      rehabilitaciones: [],
      ortesis: [],
      referimientos: [],
      implantes: [],
      estudios_imagenes: [],
      pt_sesiones: [],
      formularios_proms: [],
      autorizaciones_preauth: [],
      cargos_facturacion: []
    },
    config: {}
  };
  let cargado = false;
  let modo = "local";
  let cola = Promise.resolve();

  const SESION_BACKUP = "orto_backup";
  const COOKIE_MARCA = "orto_backup_ok=1";

  function respaldarLocal() {
    if (!cargado) return;
    try {
      sessionStorage.setItem(SESION_BACKUP, JSON.stringify(instante()));
    } catch (err) {}
    try {
      document.cookie = COOKIE_MARCA + "; path=/; max-age=604800; SameSite=Lax";
    } catch (err) {}
  }

  function leerRespaldoSesion() {
    try {
      const raw = sessionStorage.getItem(SESION_BACKUP);
      if (!raw) return null;
      const val = JSON.parse(raw);
      return val && typeof val === "object" ? val : null;
    } catch (err) {
      return null;
    }
  }

  function restaurarBackup(backup) {
    for (const [claveLegacy, modelo] of Object.entries(MODELOS)) {
      if (Array.isArray(backup[modelo]) && backup[modelo].length) {
        cache.colecciones[modelo] = backup[modelo];
      }
    }
    if (backup.config && typeof backup.config === "object") {
      cache.config = backup.config;
    }
  }

  async function cargar() {
    let restaurado = false;
    try {
      const res = await fetch("/api/datos");
      if (res.ok) {
        const datos = await res.json();
        const vacio = Object.values(MODELOS).every(m => !(datos[m] && datos[m].length));
        const respaldo = leerRespaldoSesion();
        if (vacio && respaldo) {
          restaurarBackup(respaldo);
          restaurado = true;
        } else {
          for (const [claveLegacy, modelo] of Object.entries(MODELOS)) {
            cache.colecciones[modelo] = Array.isArray(datos[modelo]) ? datos[modelo] : [];
          }
          cache.config = datos.config && typeof datos.config === "object" ? datos.config : {};
        }
        modo = "servidor";
      }
    } catch (err) {
      const respaldo = leerRespaldoSesion();
      if (respaldo) {
        restaurarBackup(respaldo);
        restaurado = true;
        modo = "local";
      } else {
        console.error("Sin conexión con la base local:", err);
      }
    }

    let migrado = false;
    for (const claveLegacy of Object.keys(MODELOS)) {
      const modelo = MODELOS[claveLegacy];
      const raw = localStorage.getItem(claveLegacy);
      if (raw != null && cache.colecciones[modelo].length === 0) {
        try {
          const val = JSON.parse(raw);
          if (Array.isArray(val) && val.length) {
            cache.colecciones[modelo] = val;
            migrado = true;
          }
        } catch (err) {}
      }
    }
    for (const clave of ["orto_config", "orto_session", "orto_dark"]) {
      const raw = localStorage.getItem(clave);
      if (raw != null && cache.config[clave] === undefined) {
        try {
          cache.config[clave] = JSON.parse(raw);
          migrado = true;
        } catch (err) {}
      }
    }

    cargado = true;
    sincronizarState();
    if (modo === "servidor" && (migrado || restaurado)) guardar();
    respaldarLocal();
    return cache;
  }

  function sincronizarState() {
    State.users = cache.colecciones.usuarios;
    State.pacientes = cache.colecciones.pacientes;
    State.citas = cache.colecciones.citas;
    State.registros = cache.colecciones.registros;
    State.documentos = cache.colecciones.documentos;
    State.facturas = cache.colecciones.facturas;
    State.citasSinConsulta = cache.colecciones.citasSinConsulta;
    State.recetas = cache.colecciones.recetas;
    State.evaluaciones = cache.colecciones.evaluaciones;
    State.evaluacionesMedicas = cache.colecciones.evaluacionesMedicas;
    State.estudios = cache.colecciones.estudios;
    State.pros = cache.colecciones.pros;
    State.cirugias = cache.colecciones.cirugias;
    State.rehabilitaciones = cache.colecciones.rehabilitaciones;
    State.ortesis = cache.colecciones.ortesis;
    State.referimientos = cache.colecciones.referimientos;
    State.config = cache.config["orto_config"] ?? null;
    State.session = cache.config["orto_session"] ?? null;
  }

  function instante() {
    return {
      usuarios: cache.colecciones.usuarios,
      pacientes: cache.colecciones.pacientes,
      citas: cache.colecciones.citas,
      registros: cache.colecciones.registros,
      documentos: cache.colecciones.documentos,
      facturas: cache.colecciones.facturas,
      citasSinConsulta: cache.colecciones.citasSinConsulta,
      recetas: cache.colecciones.recetas,
      evaluaciones: cache.colecciones.evaluaciones,
      evaluacionesMedicas: cache.colecciones.evaluacionesMedicas,
      estudios: cache.colecciones.estudios,
      pros: cache.colecciones.pros,
      cirugias: cache.colecciones.cirugias,
      rehabilitaciones: cache.colecciones.rehabilitaciones,
      ortesis: cache.colecciones.ortesis,
      referimientos: cache.colecciones.referimientos,
      config: cache.config
    };
  }

  function guardar() {
    if (!cargado || modo !== "servidor") return;
    const cuerpo = instante();
    cola = cola
      .catch(() => {})
      .then(() =>
        fetch("/api/datos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo)
        })
      )
      .then(res => {
        if (!res.ok) console.error("No se pudo guardar en la base local:", res.status);
      })
      .catch(err => console.error("No se pudo guardar en la base local:", err));
  }

  function guardarColeccion(modelo) {
    if (!cargado || modo !== "servidor") return;
    cola = cola
      .catch(() => {})
      .then(() =>
        fetch("/api/datos/" + modelo, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cache.colecciones[modelo])
        })
      )
      .then(res => {
        if (!res.ok) console.error("No se pudo guardar la colección:", modelo, res.status);
      })
      .catch(err => console.error("No se pudo guardar la colección:", modelo, err));
  }

  function guardarConfigRemoto() {
    if (!cargado || modo !== "servidor") return;
    cola = cola
      .catch(() => {})
      .then(() =>
        fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cache.config)
        })
      )
      .then(res => {
        if (!res.ok) console.error("No se pudo guardar la configuración:", res.status);
      })
      .catch(err => console.error("No se pudo guardar la configuración:", err));
  }

  function guardarAntesDeSalir() {
    if (!cargado || modo !== "servidor") return;
    fetch("/api/datos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(instante()),
      keepalive: true
    }).catch(() => {});
  }

  function get(clave, def) {
    const modelo = MODELOS[clave];
    if (modelo) return cache.colecciones[modelo];
    const valor = cache.config[clave];
    return valor === undefined ? def : valor;
  }

  function set(clave, valor) {
    const modelo = MODELOS[clave];
    if (modelo) {
      cache.colecciones[modelo] = valor;
    } else {
      cache.config[clave] = valor;
    }
    sincronizarStateCache(clave);
    if (modo === "local") {
      try {
        localStorage.setItem(clave, JSON.stringify(valor));
      } catch (err) {}
    }
    if (modelo) {
      guardarColeccion(modelo);
    } else {
      guardarConfigRemoto();
    }
    respaldarLocal();
  }

  function sincronizarStateCache(clave) {
    const modelo = MODELOS[clave];
    if (modelo) {
      State[traductorModelo[modelo]] = cache.colecciones[modelo];
    } else if (clave === "orto_config") {
      State.config = cache.config[clave];
    } else if (clave === "orto_session") {
      State.session = cache.config[clave];
    }
  }

  return {
    cargar,
    get,
    set,
    guardarAntesDeSalir
  };
})();

const State = {
  users: [],
  session: null,
  pacientes: [],
  citas: [],
  registros: [],
  documentos: [],
  facturas: [],
  citasSinConsulta: [],
  recetas: [],
  evaluaciones: [],
  evaluacionesMedicas: [],
  estudios: [],
  pros: [],
  cirugias: [],
  rehabilitaciones: [],
  ortesis: [],
  referimientos: [],
  config: null
};

const DB = {
  get: (clave, def) => BD.get(clave, def),
  set: (clave, valor) => BD.set(clave, valor)
};

const GLOSARIO_PROCEDIMIENTOS = [
  {
    grupo: "Consultas",
    items: [
      { nombre: "Consulta general de ortopedia", precio: 1500 },
      { nombre: "Consulta de control / seguimiento", precio: 1200 },
      { nombre: "Consulta de urgencia ortopédica", precio: 2200 },
      { nombre: "Evaluación prequirúrgica de ortopedia", precio: 2500 }
    ]
  },
  {
    grupo: "Imágenes y estudios",
    items: [
      { nombre: "Radiografía de extremidad (1 proyección)", precio: 1200 },
      { nombre: "Radiografía de extremidad (2 proyecciones)", precio: 1800 },
      { nombre: "Radiografía de columna (columna completa)", precio: 2200 },
      { nombre: "Ecografía músculo-esquelética", precio: 2500 },
      { nombre: "Tomografía computarizada (TC) articular", precio: 12000 },
      { nombre: "Resonancia magnética (RMN) de extremidad", precio: 15000 },
      { nombre: "Resonancia magnética (RMN) de columna", precio: 16000 },
      { nombre: "Densitometría ósea", precio: 3500 },
      { nombre: "Arteriografía / angiorresonancia", precio: 20000 }
    ]
  },
  {
    grupo: "Infiltraciones y procedimientos ambulatorios",
    items: [
      { nombre: "Infiltración articular (ácido hialurónico)", precio: 4000 },
      { nombre: "Infiltración peritendinosa (corticoides)", precio: 2800 },
      { nombre: "Aspiración articular (artrocentesis)", precio: 3200 },
      { nombre: "Plasma rico en plaquetas (PRP)", precio: 9000 },
      { nombre: "Infiltración epidural (origen lumbar)", precio: 9500 },
      { nombre: "Bloqueo nervioso periférico", precio: 6000 }
    ]
  },
  {
    grupo: "Fisioterapia y rehabilitación",
    items: [
      { nombre: "Sesión de fisioterapia / terapia física", precio: 1600 },
      { nombre: "Fisioterapia postquirúrgica (sesión)", precio: 1900 },
      { nombre: "Ejercicios terapéuticos supervisados", precio: 1700 },
      { nombre: "Electroterapia / ultrasonido terapéutico", precio: 1600 },
      { nombre: "Quiropraxia / terapia manual (sesión)", precio: 2200 }
    ]
  },
  {
    grupo: "Inmovilización y órtesis",
    items: [
      { nombre: "Colocación de yeso", precio: 2800 },
      { nombre: "Cambio de yeso", precio: 2200 },
      { nombre: "Retiro de yeso", precio: 900 },
      { nombre: "Colocación de fértula", precio: 1800 },
      { nombre: "Colocación de órtesis", precio: 3800 },
      { nombre: "Vendaje funcional / taping", precio: 1300 }
    ]
  },
  {
    grupo: "Cirugías y procedimientos quirúrgicos",
    items: [
      { nombre: "Cirugía menor (uña encarnada, quiste, cuerpo extraño)", precio: 8500 },
      { nombre: "Tratamiento quirúrgico de dedo en gatillo", precio: 22000 },
      { nombre: "Cirugía del túnel carpiano", precio: 26000 },
      { nombre: "Liberación de contractura de Dupuytren", precio: 30000 },
      { nombre: "Osteosíntesis de fractura (placa y tornillos)", precio: 85000 },
      { nombre: "Fijación externa de fractura", precio: 78000 },
      { nombre: "Osteotomía correctora", precio: 78000 },
      { nombre: "Artroscopia de rodilla (exploración + lavado)", precio: 62000 },
      { nombre: "Meniscetomía / sutura meniscal artroscópica", precio: 90000 },
      { nombre: "Reconstrucción de ligamento cruzado anterior (LCA)", precio: 125000 },
      { nombre: "Reconstrucción de ligamentos laterales de rodilla", precio: 105000 },
      { nombre: "Reparación del manguito rotador", precio: 110000 },
      { nombre: "Artroplastia parcial de rodilla", precio: 180000 },
      { nombre: "Artroplastia total de rodilla (prótesis)", precio: 330000 },
      { nombre: "Artroplastia total de cadera (prótesis)", precio: 360000 },
      { nombre: "Prótesis de hombro (artroplastia)", precio: 280000 }
    ]
  }
];

const PROCEDIMIENTOS = GLOSARIO_PROCEDIMIENTOS.flatMap(g => g.items);

const TIPOS_REGISTRO_ORTOPEDIA = [
  {
    grupo: "Motivo de consulta",
    items: [
      "Dolor de rodilla", "Dolor de cadera", "Dolor lumbar", "Dolor de hombro", "Dolor cervical",
      "Dolor de muñeca / mano", "Dolor de tobillo / pie", "Dolor de talón", "Dolor muscular generalizado",
      "Esguince", "Fractura", "Fractura de cadera", "Fractura de tobillo", "Fractura de muñeca",
      "Fractura de brazo / antebrazo", "Contractura muscular", "Tendinitis", "Bursitis", "Artritis",
      "Artrosis / desgaste articular", "Escoliosis", "Luxación", "Subluxación", "Debilidad muscular",
      "Hormigueo / adormecimiento", "Rigidez articular", "Trauma deportivo", "Trauma por caída",
      "Accidente de tránsito (trauma)", "Cuerpo extraño articular", "Dedo en gatillo",
      "Síndrome del túnel carpiano", "Fascitis plantar", "Juanetes (hallux valgus)",
      "Inestabilidad de rodilla", "Lesión de menisco", "Lesión del manguito rotador",
      "Codo de tenista (epicondilitis)", "Codo de golfista", "Espolón calcáneo", "Cifosis", "Lordosis",
      "Desviación postural", "Osteomalacia", "Osteoporosis", "Infección articular", "Herida / laceración",
      "Quiste sinovial", "Necrosis avascular", "Revisión postquirúrgica", "Retiro de yeso",
      "Seguimiento de fractura", "Motivo de consulta"
    ]
  },
  {
    grupo: "Examen físico y evaluación",
    items: [
      "Examen físico ortopédico", "Pruebas de movilidad articular", "Evaluación funcional de mano",
      "Evaluación funcional de columna", "Evaluación funcional de marcha", "Goniometría",
      "Valoración de fuerza muscular", "Balance articular", "Test de Lachman (rodilla)",
      "Test de McMurray (menisco)", "Test de Jobe (hombro)", "Test de Phalen / Tinel (muñeca)",
      "Test de Thomas (cadera)", "Prueba de elevación de pierna recta", "Evaluación de sensibilidad",
      "Evaluación de pulso / circulación distal", "Examen físico"
    ]
  },
  {
    grupo: "Diagnóstico",
    items: [
      "Esguince de tobillo", "Esguince de rodilla", "Esguince de muñeca", "Fractura de radio distal",
      "Fractura de cúbito", "Fractura de fémur", "Fractura de meseta tibial", "Fractura de húmero",
      "Fractura de clavícula", "Fractura de metatarsiano", "Fracturas múltiples", "Fractura patológica",
      "Osteoartritis de rodilla", "Osteoartritis de cadera", "Artritis reumatoide", "Artritis gotosa",
      "Artritis séptica", "Rotura del manguito rotador", "Rotura de ligamento cruzado anterior (LCA)",
      "Rotura de ligamento cruzado posterior (LCP)", "Lesión de menisco", "Tendinopatía de Aquiles",
      "Tendinitis de De Quervain", "Síndrome del túnel carpiano", "Bursitis trocantérea",
      "Bursitis prerrotuliana", "Epicondilitis lateral", "Epicondilitis medial", "Fascitis plantar",
      "Hallux valgus (juanete)", "Dedo en gatillo (tenosinovitis estenosante)",
      "Contractura de Dupuytren", "Inestabilidad de hombro", "Luxación de hombro recurrente",
      "Espondilolistesis", "Hernia discal lumbar", "Estenosis del canal lumbar", "Escoliosis idiopática",
      "Cifosis de Scheuermann", "Osteomielitis", "Osteoporosis", "Necrosis avascular de cadera",
      "Síndrome compartimental", "Lesión de nervio periférico", "Diagnóstico"
    ]
  },
  {
    grupo: "Procedimientos realizados",
    items: [
      "Infiltración articular", "Infiltración peritendinosa", "Aspiración articular (artrocentesis)",
      "PRP (plasma rico en plaquetas)", "Colocación de yeso", "Cambio de yeso", "Retiro de yeso",
      "Colocación de fértula", "Colocación de órtesis", "Terapia física / rehabilitación",
      "Vendaje funcional", "Desbridamiento de herida", "Extracción de cuerpo extraño",
      "Sutura de herida", "Cirugía menor", "Artroscopia", "Procedimiento"
    ]
  },
  {
    grupo: "Plan y recomendaciones",
    items: [
      "Reposo relativo", "Crioterapia (frío local)", "Calor local", "Inmovilización temporal",
      "Tratamiento antiinflamatorio", "Tratamiento analgésico", "Ejercicios de fortalecimiento",
      "Ejercicios de estiramiento", "Referido a fisioterapia", "Referido a cirugía ortopédica",
      "Referido a reumatología", "Referido a traumatología", "Terapia ocupacional",
      "Recomendaciones posturales", "Uso de muletas", "Uso de cabestrillo", "Programar seguimiento"
    ]
  },
  {
    grupo: "Ingreso y evolución",
    items: [
      "Registro de ingreso", "Registro de evolución", "Alta médica",
      "Nota de evolución", "Hoja de ingreso"
    ]
  }
];

function detalleIngresoPaciente(p) {
  const filas = [
    `Código: ${p.codigo || "-"}`,
    `Nombre: ${p.nombre || "-"}`,
    `Edad: ${p.edad || "-"}`,
    `Sexo: ${p.sexo || "-"}`,
    `Cédula / Documento: ${p.cedula || "-"}`,
    `Seguro / Aseguradora: ${p.seguro || "Ninguno / No tiene"}`,
    `Teléfono: ${p.telefono || "-"}`,
    `Correo: ${p.email || "-"}`,
    `Contacto de emergencia: ${p.emergencia ? p.emergencia + (p.telefonoEmergencia ? " (Tel.: " + p.telefonoEmergencia + ")" : "") : "-"}`,
    `Ocupación: ${p.ocupacion || "-"}`,
    `Mano dominante: ${p.manoDominante || "-"}`,
    `Razón de la consulta: ${p.razonConsulta || "-"}`,
    `Historia actual: ${p.historiaActual || "-"}`,
    `Antecedentes mórbidos: ${(p.antecedentesMorbidos || []).join(", ") || "-"}`,
    `Antecedentes quirúrgicos: ${(p.antecedentesQuirurgicos || []).join(", ") || "-"}`,
    `Antecedentes alérgicos: ${(p.antecedentesAlergicos || []).join(", ") || "-"}`,
    `Notas / Antecedentes: ${p.notas || "-"}`
  ];
  return filas.join("\n");
}

function renderGlosario() {
  const cont = document.getElementById("glosarioContenido");
  if (!cont) return;
  cont.innerHTML = GLOSARIO_PROCEDIMIENTOS.map(g => `
    <div class="glo-grupo">
      <h5>${g.grupo}</h5>
      <table class="glo-tabla">
        <thead>
          <tr><th>Procedimiento</th><th>Precio (RD$)</th></tr>
        </thead>
        <tbody>
          ${g.items.map(p => `<tr><td>${p.nombre}</td><td>${p.precio.toLocaleString("es-ES")}.00</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `).join("");
}

function fillTipoRegistro(sel) {
  if (!sel) return;
  sel.innerHTML = TIPOS_REGISTRO_ORTOPEDIA.map(g => `
    <optgroup label="${g.grupo}">
      ${g.items.map(it => `<option value="${it}">${it}</option>`).join("")}
    </optgroup>
  `).join("");
}

function genTurno(fecha) {
  return State.citas.filter(c => c.fecha === fecha).length + 1;
}

const MEDICAMENTOS_CATALOGO = [
  { g: "AINE", n: "Diclofenaco", mg: "50 mg", f: "Tableta", lab: "Voltaren (Novartis/Haleon) · MK (Tecnoquímicas), LAM" },
  { g: "AINE", n: "Diclofenaco", mg: "50 mg", f: "Tableta", lab: "Cataflam (Novartis) · LAM, Alfa" },
  { g: "AINE", n: "Ibuprofeno", mg: "400 mg", f: "Tableta", lab: "Advil (Haleon) · MK (Tecnoquímicas), LAM" },
  { g: "AINE", n: "Ibuprofeno", mg: "600 mg", f: "Tableta", lab: "Motrin (Cilag/J&J) · Mamey, Alfa" },
  { g: "AINE", n: "Naproxeno", mg: "500 mg", f: "Tableta", lab: "Naprosyn (Roche) · LAM, Mamey" },
  { g: "AINE", n: "Naproxeno", mg: "550 mg", f: "Tableta", lab: "Flanax (Bayer) · LAM" },
  { g: "AINE", n: "Meloxicam", mg: "15 mg", f: "Tableta", lab: "Mobic (Boehringer Ingelheim) · Fluter Domull, Acromax" },
  { g: "AINE", n: "Celecoxib", mg: "200 mg", f: "Cápsula", lab: "Celebrex (Pfizer) · Mamey, Caplin" },
  { g: "AINE", n: "Etoricoxib", mg: "120 mg", f: "Tableta", lab: "Arcoxia (MSD) · LAM, Mamey" },
  { g: "AINE", n: "Ketorolaco", mg: "30 mg", f: "Ampolla", lab: "Toradol (Roche) · MK, LAM" },
  { g: "AINE", n: "Ketoprofeno", mg: "100 mg", f: "Cápsula", lab: "Profenid (Sanofi) · IF, la Sante" },
  { g: "AINE", n: "Dexketoprofeno", mg: "25 mg", f: "Tableta", lab: "Enantyum (Menarini) · Ibero farmacéutica" },
  { g: "AINE", n: "Piroxicam", mg: "20 mg", f: "Cápsula", lab: "Feldene (Pfizer) · LAM, Mamey" },
  { g: "AINE", n: "Nimesulida", mg: "100 mg", f: "Tableta", lab: "Nisulid y otras · varias marcas" },
  { g: "Analgésico", n: "Paracetamol (acetaminofén)", mg: "500 mg", f: "Tableta", lab: "Tylenol (Kenvue) · LAM, Alfa" },
  { g: "Analgésico", n: "Paracetamol (acetaminofén)", mg: "500 mg", f: "Tableta", lab: "Panadol (Haleon) · LAM" },
  { g: "Analgésico", n: "Metamizol (dipirona)", mg: "500 mg / 1 g", f: "Ampolla", lab: "Novalgina (Sanofi) · Conmel (MK), LAM" },
  { g: "Analgésico", n: "Tramadol", mg: "50 mg", f: "Cápsula", lab: "Tramal (Grünenthal) · IF, LAM" },
  { g: "Analgésico", n: "Tramadol + paracetamol", mg: "37.5/325 mg", f: "Tableta", lab: "Zaldiar (Grünenthal) · Ibero farmacéutica" },
  { g: "Analgésico", n: "Tapentadol", mg: "50/75/100 mg", f: "Tableta", lab: "Palexia (Grünenthal) · sustancia controlada" },
  { g: "Relajante muscular", n: "Ciclobenzaprina", mg: "10 mg", f: "Tableta", lab: "Flexeril y genéricos · LAM, Mamey" },
  { g: "Relajante muscular", n: "Tizanidina", mg: "4 mg", f: "Tableta", lab: "Sirdalud (Novartis) · LAM, IF" },
  { g: "Relajante muscular", n: "Carisoprodol", mg: "350 mg", f: "Tableta", lab: "Soma y combinaciones con AINE (genéricos)" },
  { g: "Relajante muscular", n: "Metocarbamol", mg: "750 mg", f: "Tableta", lab: "Robaxin · LAM, MK" },
  { g: "Relajante muscular", n: "Tiocolchicósido", mg: "4 mg", f: "Tableta", lab: "Muscoril (Sanofi) · Ibero farmacéutica" },
  { g: "Dolor neuropático / adyuvante", n: "Pregabalina", mg: "75/150 mg", f: "Cápsula", lab: "Lyrica (Pfizer) · MK (Tecnoquímicas), Ibero farmacéutica" },
  { g: "Dolor neuropático / adyuvante", n: "Gabapentina", mg: "300/400 mg", f: "Cápsula", lab: "Neurontin (Pfizer) · Normon, IF, Magnachem" },
  { g: "Dolor neuropático / adyuvante", n: "Duloxetina", mg: "30/60 mg", f: "Cápsula", lab: "Cymbalta (Lilly) · LAM, MK" },
  { g: "Dolor neuropático / adyuvante", n: "Complejo B (B1, B6, B12)", mg: "Ampolla", f: "Ampolla", lab: "Dolo-Neurobión (Merck) · LAM, Genfar" },
  { g: "Corticoide", n: "Metilprednisolona", mg: "40 mg", f: "Vial", lab: "Depo-Medrol (Pfizer) · LAM" },
  { g: "Corticoide", n: "Betametasona", mg: "6 mg/mL", f: "Vial", lab: "Celestone (Organon) · LAM" },
  { g: "Corticoide", n: "Triamcinolona", mg: "40 mg/mL", f: "Vial", lab: "Kenacort (BMS) · LAM" },
  { g: "Corticoide", n: "Dexametasona", mg: "4 mg/mL", f: "Ampolla", lab: "Decadron y genéricos · LAM" },
  { g: "Corticoide", n: "Prednisona", mg: "5/20 mg", f: "Tableta", lab: "Genéricos · Meticorten (MSD), LAM, MK" },
  { g: "Condroprotector / viscosuplementación", n: "Glucosamina, condroitina", mg: "500/400 mg", f: "Cápsula", lab: "Múltiples marcas y genéricos · LAM, MK" },
  { g: "Condroprotector / viscosuplementación", n: "Diacereína", mg: "50 mg", f: "Cápsula", lab: "Artrodar (TRB) · Ibero farmacéutica" },
  { g: "Condroprotector / viscosuplementación", n: "Ácido hialurónico intraarticular", mg: "20 mg/2 mL", f: "Ampolla", lab: "Varias marcas · Hyalgan (Fidia), Suplasyn" },
  { g: "Condroprotector / viscosuplementación", n: "Colágeno tipo II", mg: "1200 mg", f: "Sobre", lab: "Suplementos · LAM, Mamey" },
  { g: "Osteoporosis / metabolismo óseo", n: "Alendronato", mg: "70 mg", f: "Tableta", lab: "Fosamax (MSD) · LAM (Osteoplus)" },
  { g: "Osteoporosis / metabolismo óseo", n: "Ácido zoledrónico", mg: "5 mg", f: "Vial", lab: "Aclasta (Novartis) · LAM" },
  { g: "Osteoporosis / metabolismo óseo", n: "Denosumab", mg: "60 mg/mL", f: "Ampolla", lab: "Prolia (Amgen) · SC cada 6 meses" },
  { g: "Osteoporosis / metabolismo óseo", n: "Teriparatida", mg: "20 mcg", f: "Ampolla", lab: "Forteo (Lilly) · pluma precargada SC" },
  { g: "Osteoporosis / metabolismo óseo", n: "Raloxifeno", mg: "60 mg", f: "Tableta", lab: "Evista (Lilly)" },
  { g: "Osteoporosis / metabolismo óseo", n: "Calcio + vitamina D3", mg: "500 mg + 400 UI", f: "Tableta", lab: "Múltiples · Caltrate (Pfizer), LAM, MK" },
  { g: "Tópico", n: "Diclofenaco gel", mg: "1%", f: "Gel", lab: "Múltiples marcas locales e importadas · Voltaren Emulgel (GSK), LAM, Mamey" },
  { g: "Tópico", n: "Ketoprofeno gel", mg: "2.5%", f: "Gel", lab: "Múltiples marcas locales e importadas · Orudis gel (Sanofi), IF" },
  { g: "Tópico", n: "Piroxicam gel", mg: "0.5%", f: "Gel", lab: "Múltiples marcas locales e importadas · Feldene gel (Pfizer), LAM, Mamey" },
  { g: "Tópico", n: "Etofenamato", mg: "10%", f: "Crema/Tubo", lab: "Múltiples marcas locales e importadas · Reumon gel (Bayer), LAM" },
  { g: "Tromboprofilaxis postoperatoria", n: "Enoxaparina", mg: "40 mg", f: "Ampolla", lab: "Clexane (Sanofi) · MK" },
  { g: "Tromboprofilaxis postoperatoria", n: "Rivaroxabán", mg: "10/20 mg", f: "Tableta", lab: "Xarelto (Bayer)" },
  { g: "Gota", n: "Colchicina", mg: "0.5/1 mg", f: "Tableta", lab: "Genéricos · LAM, Mamey" },
  { g: "Gota", n: "Alopurinol", mg: "100/300 mg", f: "Tableta", lab: "Genéricos · Zyloric (GSK), LAM" },
  { g: "Gota", n: "Febuxostato", mg: "80/120 mg", f: "Tableta", lab: "Adenuric (Menarini) · Ibero farmacéutica" }
];function textoMedicamento(m) {
  return (m.n + " " + m.mg + " " + m.f + " " + m.lab + " " + m.g).toLowerCase();
}

const VIAS_MED = [
  "Oral", "Tópica", "Intramuscular (IM)", "Intravenosa (IV)", "Subcutánea (SC)",
  "Intraarticular", "Oftálmica", "Ótica", "Nasal", "Rectal", "Inhalatoria"
];

const FORMAS_MED_PRESENTACION = [
  "Tableta", "Capleta", "Cápsula", "Comprimido", "Sobre", "Ampolla", "Vial", "Frasco", "Frasco gotero",
  "Crema/Tubo", "Gel", "Ungüento", "Parche", "Inhalador", "Supositorio", "Spray"
];

function renderGlosarioMeds() {
  const cont = document.getElementById("glosarioMedsContenido");
  if (!cont) return;
  const grupos = {};
  MEDICAMENTOS_CATALOGO.forEach(m => {
    (grupos[m.g] = grupos[m.g] || []).push(m);
  });
  cont.innerHTML = Object.keys(grupos).map(g => `
    <div class="glo-grupo">
      <h5>${escHtml(g)}</h5>
      <ul class="glo-lista">
        ${grupos[g].map(m => `<li><strong>${escHtml(m.n)} ${escHtml(m.mg)}</strong> - ${escHtml(m.f)}${m.lab ? ` · <span class="glo-lab">${escHtml(m.lab)}</span>` : ""}</li>`).join("")}
      </ul>
    </div>
  `).join("");
}

const ORTESIS_CATALOGO = [
  { parte: "Columna cervical", n: "Collar cervical rígido (desechable / ajustable)", uso: "Inmovilización en latigazo cervical, esguince cervical, postoperatorio de columna cervical" },
  { parte: "Columna cervical", n: "Collar cervical Philadelphia", uso: "Fractura/subuxación cervical, estabilización prequirúrgica" },
  { parte: "Columna cervical", n: "Órtesis cervical ajustable con apoyo mentoniano y occipital", uso: "Inestabilidad cervical crónica, post-fusión cervical" },
  { parte: "Columna dorso-lumbar", n: "Faja lumbar elástica", uso: "Lumbalgia, sobrecarga lumbar, rehab. lumbar" },
  { parte: "Columna dorso-lumbar", n: "Corsé lumbar rígido (dorsolumbar)", uso: "Fractura compresión, postoperatorio de columna, espondilolistesis" },
  { parte: "Columna dorso-lumbar", n: "Órtesis toracolumbosacra (TLSO)", uso: "Cifosis, escoliosis, postoperatorio de columna toracolumbar" },
  { parte: "Columna dorso-lumbar", n: "Órtesis de Boston / Milwaukee (escoliosis)", uso: "Escoliosis idiopática en adolescentes" },
  { parte: "Hombro", n: "Cabestrillo de hombro", uso: "Post-fractura de clavícula, postoperatorio de hombro, luxación acromioclavicular" },
  { parte: "Hombro", n: "Inmovilizador de hombro en abducción", uso: "Rehabilitación tras reparación de manguito rotador, cirugía de hombro" },
  { parte: "Hombro", n: "Órtesis de hombro con almohadilla de abducción", uso: "Postoperatorio de prótesis de hombro, reparación de manguito" },
  { parte: "Codo", n: "Órtesis de codo articulada (MMII)", uso: "Contracturas de flexo-extensión, lesiones de tejidos blandos" },
  { parte: "Codo", n: "Cabestrillo para codo", uso: "Fractura de codo, postoperatorio, luxación" },
  { parte: "Muñeca", n: "Muñequera con férula palmar", uso: "Síndrome de túnel carpiano, tendinitis de muñeca" },
  { parte: "Muñeca", n: "Férula de muñeca rígida (cock-up)", uso: "Post-fractura de radio distal, inmovilización nocturna" },
  { parte: "Mano", n: "Órtesis de mano con férula (mano derecha media)", uso: "Postoperatorio de mano, tendinitis, parálisis" },
  { parte: "Mano", n: "Estabilizador de pulgar (ortesis de CMC)", uso: "Rizartrosis, tendinitis de De Quervain, inestabilidad de pulgar" },
  { parte: "Mano", n: "Ferulización de dedos (anillo / tulipa)", uso: "Dedo en mazo, luxaciones y fracturas de falanges" },
  { parte: "Cadera", n: "Órtesis de abducción de cadera", uso: "Postoperatorio de prótesis de cadera, luxación de cadera" },
  { parte: "Rodilla", n: "Rodillera elástica / neopreno", uso: "Gonalgia, inestabilidad leve, patelofemoral, deporte" },
  { parte: "Rodilla", n: "Órtesis de rodilla articulada con bisagras", uso: "Esguinces de rodilla, lesión LCA/LCL, inestabilidad moderada" },
  { parte: "Rodilla", n: "Inmovilizador de rodilla (férula larga)", uso: "Post-operatorio de LCA, fractura de patela, desgarros leves" },
  { parte: "Rodilla", n: "Órtesis de rodilla con bloqueo total (post-quirúrgica)", uso: "Reemplazo total de rodilla, reconstrucción ligamentaria" },
  { parte: "Rodilla", n: "Almohadilla / férula para tendón rotuliano", uso: "Tendinopatía rotuliana (rodilla del saltador)" },
  { parte: "Tobillo", n: "Tobillera elástica de compresión", uso: "Esguince leve de tobillo, prevención deportiva" },
  { parte: "Tobillo", n: "Órtesis de tobillo semirrígida (tipo Aircast)", uso: "Esguince moderado de tobillo, inestabilidad crónica" },
  { parte: "Tobillo", n: "Bota ortopédica (CAM walker)", uso: "Fracturas de tobillo y pie, postoperatorio de tobillo, lesiones de Aquiles" },
  { parte: "Pie", n: "Férula de reposo nocturno / nocturno para fascitis", uso: "Fascitis plantar, contractura de Aquiles" },
  { parte: "Pie", n: "Órtesis plantar / talonera", uso: "Fascitis plantar, espolón calcáneo, metatarsalgia" },
  { parte: "Pie", n: "Separador fijo de dedos (gel)", uso: "Juanetes (hallux valgus), dedos en martillo" },
  { parte: "Tobillo-pie", n: "Órtesis tobillo-pie (AFO / órtesis de marcha)", uso: "Pie caído, debilidad de dorsiflexores, secuela de ACV" }
];

const ORTESIS_ICONOS = {
  "Columna cervical": "skeleton",
  "Columna dorso-lumbar": "skeleton",
  "Hombro": "skeleton",
  "Codo": "humerus",
  "Muñeca": "wrist",
  "Mano": "hand_bones",
  "Cadera": "femur",
  "Rodilla": "skeleton",
  "Tobillo": "foot_bones",
  "Pie": "barefoot",
  "Tobillo-pie": "footprint"
};

function renderGlosarioOrtesis(busqueda = "") {
  const cont = document.getElementById("ortesisAcordeon");
  if (!cont) return;
  const q = busqueda.trim().toLowerCase();
  const grupos = {};
  ORTESIS_CATALOGO.forEach(o => {
    const texto = (o.n + " " + o.parte + " " + o.uso).toLowerCase();
    if (q && texto.indexOf(q) === -1) return;
    (grupos[o.parte] = grupos[o.parte] || []).push(o);
  });
  const partes = Object.keys(grupos);
  if (!partes.length) {
    cont.innerHTML = `<p class="empty">Sin resultados para "${escHtml(busqueda)}".</p>`;
    return;
  }
  cont.innerHTML = partes.map(parte => `
    <details class="ortesis-acordeon-item${esteOrtesisAbierto(parte) ? " open" : ""}">
      <summary>
        <span class="glo-ico material-symbols-outlined">${ORTESIS_ICONOS[parte] || "accessible"}</span>
        <span class="glo-titulo">${escHtml(parte)}</span>
        <span class="tag">${grupos[parte].length}</span>
        <span class="glo-toggle">
          <span class="glo-mas material-symbols-outlined">add</span>
          <span class="glo-menos material-symbols-outlined">remove</span>
        </span>
      </summary>
      <ul class="ortesis-catalogo-lista">
        ${grupos[parte].map(o => `
          <li class="ortesis-item" draggable="true" data-ortesis-nombre="${escHtml(o.n)}" data-ortesis-parte="${escHtml(o.parte)}" data-ortesis-uso="${escHtml(o.uso)}" title="Arrastra para seleccionar">
            <span class="material-symbols-outlined ortesis-item-ico">${ORTESIS_ICONOS[o.parte] || "orthopedics"}</span>
            <span class="ortesis-item-txt">
              <strong>${escHtml(o.n)}</strong>
              ${o.uso ? `<em>${escHtml(o.uso)}</em>` : ""}
            </span>
          </li>`).join("")}
      </ul>
    </details>
  `).join("");
  cont.querySelectorAll("details.ortesis-acordeon-item > summary").forEach(s => {
    s.addEventListener("click", () => {
      const det = s.closest("details");
      guardarOrtesisAcordeon(det);
    });
  });
  cont.querySelectorAll(".ortesis-item").forEach(el => {
    el.addEventListener("dragstart", iniciarArrastreOrtesis);
  });
}

function esteOrtesisAbierto(parte) {
  const abiertos = window.__ortesisAbierto || [];
  return abiertos.indexOf(parte) !== -1;
}

function guardarOrtesisAcordeon(det) {
  const parte = det.querySelector("summary .glo-titulo").textContent.trim();
  let abiertos = window.__ortesisAbierto || [];
  if (det.classList.contains("open") || det.hasAttribute("open")) {
    if (abiertos.indexOf(parte) === -1) abiertos.push(parte);
  } else {
    abiertos = abiertos.filter(x => x !== parte);
  }
  window.__ortesisAbierto = abiertos;
}

function iniciarArrastreOrtesis(e) {
  const el = e.currentTarget;
  e.dataTransfer.setData("text/plain", JSON.stringify({
    nombre: el.dataset.ortesisNombre,
    parte: el.dataset.ortesisParte,
    uso: el.dataset.ortesisUso
  }));
  e.dataTransfer.effectAllowed = "copy";
  el.classList.add("arrastrando");
}

function renderOrtesisSeleccion() {
  const cont = document.getElementById("ortesisSeleccion");
  const count = document.getElementById("countOrtesisSel");
  if (!cont) return;
  const sel = window.__ortesisSel || [];
  if (count) count.textContent = sel.length;
  if (!sel.length) {
    cont.innerHTML = `<p class="empty">Arrastra aquí las órtesis desde el catálogo.</p>`;
    return;
  }
  cont.innerHTML = sel.map((o, i) => `
    <div class="ortesis-sel-item">
      <span class="material-symbols-outlined ortesis-item-ico">${ORTESIS_ICONOS[o.parte] || "accessible"}</span>
      <span class="ortesis-sel-txt">
        <strong>${escHtml(o.nombre)}</strong>
        <em>${escHtml(o.parte)}${o.uso ? ` · ${escHtml(o.uso)}` : ""}</em>
      </span>
      <button type="button" class="btn-icon danger" data-quitar-ortesis-sel="${i}" title="Quitar">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  `).join("");
  cont.querySelectorAll("[data-quitar-ortesis-sel]").forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.quitarOrtesisSel);
    window.__ortesisSel = window.__ortesisSel.filter((_, x) => x !== i);
    renderOrtesisSeleccion();
  }));
}

function fillOrtesisPacientes() {
  const sel = document.getElementById("ortesisPaciente");
  if (!sel) return;
  const anterior = Number(sel.value) || 0;
  const opts = State.pacientes
    .filter(p => !p.eliminado)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
    .join("");
  sel.innerHTML = opts || `<option value="">Sin pacientes</option>`;
  if (anterior) sel.value = anterior;
}

function guardarOrtesisPaciente() {
  const sel = window.__ortesisSel || [];
  if (!sel.length) {
    mostrarNotificacion("Arrastra al menos una órtesis.");
    return;
  }
  const pacienteId = Number(document.getElementById("ortesisPaciente").value);
  if (!pacienteId) {
    mostrarNotificacion("Selecciona un paciente.");
    return;
  }
  State.ortesis.push({
    id: Date.now(),
    pacienteId,
    fecha: isoLocal(new Date()),
    diagnostico: document.getElementById("ortesisDiagnostico").value.trim(),
    ortesis: sel,
    notas: ""
  });
  saveKey("ortesis");
  window.__ortesisSel = [];
  document.getElementById("ortesisDiagnostico").value = "";
  renderOrtesisSeleccion();
  renderOrtesis();
  mostrarNotificacion("Órtesis guardadas para el paciente.");
}

function renderOrtesis() {
  const tbody = document.getElementById("listaOrtesis");
  const countEl = document.getElementById("countOrtesis");
  if (!tbody) return;
  const data = (State.ortesis || []).slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  if (countEl) countEl.textContent = data.length;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin órtesis registradas.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(o => {
    const p = State.pacientes.find(x => x.id === o.pacienteId);
    const nombres = (o.ortesis || []).map(x => x.nombre).join(", ");
    return `
      <tr>
        <td><strong>${p ? p.nombre : "Paciente eliminado"}</strong> <span class="tag">${p ? p.codigo : ""}</span></td>
        <td>${escHtml(nombres)}</td>
        <td>${escHtml(o.diagnostico || "-")}</td>
        <td>${o.fecha || "-"}</td>
        <td>
          <button class="btn-icon" data-ver-ortesis="${o.id}" title="Ver detalle">
            <span class="material-symbols-outlined">visibility</span>
          </button>
          <button class="btn-icon danger" data-borrar-ortesis="${o.id}" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join("");
  tbody.querySelectorAll("[data-ver-ortesis]").forEach(b => b.addEventListener("click", () => verDetalleOrtesis(Number(b.dataset.verOrtesis))));
  tbody.querySelectorAll("[data-borrar-ortesis]").forEach(b => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar este registro de órtesis?")) return;
    State.ortesis = State.ortesis.filter(x => x.id !== Number(b.dataset.borrarOrtesis));
    saveKey("ortesis");
    renderOrtesis();
  }));
}

function verDetalleOrtesis(id) {
  const o = (State.ortesis || []).find(x => x.id === id);
  if (!o) return;
  const p = State.pacientes.find(x => x.id === o.pacienteId);
  const cont = document.getElementById("ortesisVista");
  if (!cont) return;
  cont.innerHTML = `
    <div>
      <div class="item-main">
        <strong>${p ? escHtml(p.nombre) : "Paciente eliminado"}</strong>
        <span class="tag">${p ? p.codigo : ""}</span>
        <span class="tag">${o.fecha || "-"}</span>
      </div>
      ${o.diagnostico ? `<p class="item-sub"><strong>Diagnóstico / indicación:</strong> ${escHtml(o.diagnostico)}</p>` : ""}
      <ul class="ortesis-det-lista">
        ${(o.ortesis || []).map(x => `
          <li>
            <span class="material-symbols-outlined ortesis-item-ico">${ORTESIS_ICONOS[x.parte] || "accessible"}</span>
            <span><strong>${escHtml(x.nombre)}</strong> <em>${escHtml(x.parte)}${x.uso ? ` · ${escHtml(x.uso)}` : ""}</em></span>
          </li>`).join("")}
      </ul>
    </div>`;
  abrirModal("modalVerOrtesis");
}

const LIMITE_DIA_CITAS = 30;
const LIMITE_SEMANA_CITAS = 150;

const CONFIG_DEFECTO = {
  seccionFacturacion: true,
  seccionDocumentos: true,
  seccionRegistros: true,
  seccionCitas: true,
  seccionRecetas: true,
  seccionEvaluacionFisica: true,
  seccionEvaluacionMedica: true,
  seccionPacientes: true,
  estadisticas: true,
  calendario: true,
  citasSinConsulta: true,
  modoOscuro: true,
  recuperarContrasena: true,
  registroPublico: true,
  colorBotones: "actual",
  limiteDiaCitas: 30,
  limiteSemanaCitas: 150
};

function configuracion() {
  return State.config || CONFIG_DEFECTO;
}

function limiteDia() {
  return Number(configuracion().limiteDiaCitas) || LIMITE_DIA_CITAS;
}

function limiteSemana() {
  return Number(configuracion().limiteSemanaCitas) || LIMITE_SEMANA_CITAS;
}

function migrarDatos() {
  const users = State.users || [];
  let changed = false;
  users.forEach(u => {
    if (!u.role) {
      u.role = users.length === 1 ? "admin" : "usuario";
      changed = true;
    }
  });
  if (users.length && !users.some(u => u.role === "admin")) {
    const target = users.find(u => State.session && u.id === State.session.id) || users[0];
    target.role = "admin";
    changed = true;
  }
  if (changed) saveKey("users");
  if (State.session && Array.isArray(State.users)) {
    const fresh = State.users.find(u => u.id === State.session.id);
    if (fresh) {
      State.session = fresh;
      DB.set("orto_session", fresh);
    }
  }
  if (!State.config) {
    State.config = { ...CONFIG_DEFECTO };
    saveKey("config");
  }
}

function migrateOnLoad() {
  migrarDatos();
}

function citasEnDia(fecha) {
  return State.citas.filter(c => c.fecha === fecha && !c.completada && !c.cancelada).length;
}

function inicioSemana(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  const diff = (d.getDay() === 0 ? -6 : 1 - d.getDay());
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function citasEnSemana(fechaStr) {
  const inicio = inicioSemana(fechaStr);
  const fin = new Date(inicio + "T00:00:00");
  fin.setDate(fin.getDate() + 6);
  const finISO = fin.toISOString().split("T")[0];
  return State.citas.filter(c => c.fecha >= inicio && c.fecha <= finISO && !c.completada && !c.cancelada).length;
}

function validarLimiteCitas(fecha) {
  if (citasEnDia(fecha) >= limiteDia()) {
    return `Límite diario alcanzado (${limiteDia()} citas ese día).`;
  }
  if (citasEnSemana(fecha) >= limiteSemana()) {
    return `Límite semanal alcanzado (${limiteSemana()} citas en la semana).`;
  }
  return null;
}

function saveKey(key) {
  DB.set("orto_" + key, State[key]);
}

function isLoginPage() {
  return document.getElementById("loginForm") !== null;
}

const PREGUNTAS_SEGURIDAD = [
  "¿Cuál es el nombre de tu primera mascota?",
  "¿Cuál es el nombre de tu ciudad de nacimiento?",
  "¿Cuál es el nombre de tu escuela primaria?",
  "¿Cuál es tu comida favorita?",
  "¿Cuál es el nombre de tu mejor amigo de la infancia?",
  "¿Cuál es la marca de tu primer carro?",
  "¿En qué mes naciste?",
  "¿Cuál es el plato que más te gusta cocinar?",
  "¿Cuál es el nombre de tu abuela materna?",
  "¿Cuál es tu deporte favorito?"
];

function escogerPreguntasRandom() {
  const pool = [...PREGUNTAS_SEGURIDAD];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function generarCodigoRecuperacion() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function llenarSelectPreguntas(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = `<option value="">Selecciona una pregunta…</option>` + PREGUNTAS_SEGURIDAD.map(q => `<option value="${q}">${q}</option>`).join("");
}

function initLogin() {
  if (!isLoginPage()) return;

  migrateOnLoad();
  initDarkMode();

  const cfg = configuracion();

  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const recoverForm = document.getElementById("recoverForm");
  const btnMostrarRecuperar = document.getElementById("btnMostrarRecuperar");
  const btnVolverLogin = document.getElementById("btnVolverLogin");

  if (cfg.registroPublico === false && tabRegister) tabRegister.classList.add("hidden");
  if (cfg.recuperarContrasena === false && btnMostrarRecuperar) btnMostrarRecuperar.closest(".login-recover-toggle").classList.add("hidden");

  ["regPreg1", "regPreg2", "regPreg3"].forEach(id => llenarSelectPreguntas(id));
  const preguntasRandom = escogerPreguntasRandom();
  ["regPreg1", "regPreg2", "regPreg3"].forEach((id, i) => {
    const sel = document.getElementById(id);
    if (sel && preguntasRandom[i]) sel.value = preguntasRandom[i];
  });

  function switchTab(showLogin) {
    tabLogin.classList.toggle("active", showLogin);
    tabRegister.classList.toggle("active", !showLogin);
    loginForm.classList.toggle("hidden", !showLogin);
    registerForm.classList.toggle("hidden", showLogin);
    if (recoverForm) recoverForm.classList.add("hidden");
  }

  tabLogin.addEventListener("click", () => switchTab(true));
  tabRegister.addEventListener("click", () => switchTab(false));

  if (btnMostrarRecuperar) {
    btnMostrarRecuperar.addEventListener("click", () => {
      loginForm.classList.add("hidden");
      recoverForm.classList.remove("hidden");
    });
  }
  if (btnVolverLogin) {
    btnVolverLogin.addEventListener("click", () => {
      recoverForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
    });
  }

  let recUser = null;
  const recSteps = () => recoverForm.querySelectorAll("[data-rec-step]");

  function mostrarRecStep(num) {
    recSteps().forEach(s => s.classList.toggle("hidden", Number(s.dataset.recStep) !== num));
  }

  function limpiarRecMsgs() {
    ["recPaso1Msg", "recPregMsg", "recCodigoMsg", "recNuevaMsg"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = "";
        el.className = "form-msg";
      }
    });
  }

  if (btnMostrarRecuperar) {
    btnMostrarRecuperar.addEventListener("click", () => {
      recUser = null;
      limpiarRecMsgs();
      document.getElementById("recoverEmail").value = "";
      loginForm.classList.add("hidden");
      recoverForm.classList.remove("hidden");
      mostrarRecStep(1);
    });
  }

  if (recoverForm) {
    const paso1 = document.getElementById("recPaso1");
    const paso1Msg = document.getElementById("recPaso1Msg");
    const viaPreguntas = document.getElementById("recViaPreguntas");
    const viaCodigo = document.getElementById("recViaCodigo");
    const volver1 = document.getElementById("recVolver1");
    const volver2 = document.getElementById("recVolver2");
    const volver3 = document.getElementById("recVolver3");
    const recPreguntas = document.getElementById("recPreguntas");
    const recPregMsg = document.getElementById("recPregMsg");
    const recCodigoMsg = document.getElementById("recCodigoMsg");
    const recNuevaMsg = document.getElementById("recNuevaMsg");

    paso1.addEventListener("click", () => {
      limpiarRecMsgs();
      const email = document.getElementById("recoverEmail").value.trim().toLowerCase();
      const user = State.users.find(u => u.email === email);
      if (!user) {
        paso1Msg.textContent = "No existe ninguna cuenta con ese correo.";
        paso1Msg.className = "form-msg error";
        return;
      }
      recUser = user;
      const info = document.getElementById("recUserInfo");
      if (info) info.textContent = `Cuenta encontrada: ${user.name} (${user.email})`;
      if (user.preguntas && user.preguntas.length === 3) {
        mostrarRecStep(2);
      } else {
        const info2 = document.getElementById("recNuevaInfo");
        if (info2) info2.textContent = "Esta cuenta no tiene preguntas de seguridad configuradas. Pide al administrador un código de recuperación para poder definir tu nueva contraseña.";
        realizarRecuperacionConCodigo();
      }
    });

    viaPreguntas.addEventListener("click", () => {
      limpiarRecMsgs();
      if (!recUser) return;
      recPreguntas.innerHTML = recUser.preguntas.map((p, i) => `
        <p class="pregunta-rec">
          <strong>Pregunta ${i + 1}: ${p.q}</strong>
          <label>Respuesta
            <input type="text" class="rec-resp" data-i="${i}" autocomplete="off" placeholder="Escribe tu respuesta" />
          </label>
        </p>
      `).join("");
      mostrarRecStep(3);
    });

    const recVerificar = document.getElementById("recVerificar");
    recVerificar.addEventListener("click", () => {
      limpiarRecMsgs();
      if (!recUser) return;
      const inputs = recPreguntas.querySelectorAll(".rec-resp");
      let ok = inputs.length === 3;
      inputs.forEach(inp => {
        const resp = (inp.value || "").trim().toLowerCase();
        const correcta = (recUser.preguntas[Number(inp.dataset.i)].a || "").toLowerCase();
        if (resp !== correcta) ok = false;
      });
      if (!ok) {
        recPregMsg.textContent = "Una o más respuestas no coinciden con las que registraste. La contraseña no se mostrará; solo el administrador puede conocerla.";
        recPregMsg.className = "form-msg error";
        return;
      }
      const info5 = document.getElementById("recNuevaInfo");
      if (info5) info5.textContent = "Preguntas verificadas correctamente. Define tu nueva contraseña (mínimo 4 caracteres).";
      mostrarRecStep(5);
    });

    function realizarRecuperacionConCodigo() {
      limpiarRecMsgs();
      document.getElementById("recCodigo").value = "";
      mostrarRecStep(4);
    }

    viaCodigo.addEventListener("click", realizarRecuperacionConCodigo);

    const recUsarCodigo = document.getElementById("recUsarCodigo");
    recUsarCodigo.addEventListener("click", () => {
      limpiarRecMsgs();
      if (!recUser) return;
      const codigo = document.getElementById("recCodigo").value.trim().toUpperCase();
      if (!recUser.codigoRecuperacion || codigo !== recUser.codigoRecuperacion.toUpperCase()) {
        recCodigoMsg.textContent = "El código no es correcto. Solicítalo nuevamente al administrador.";
        recCodigoMsg.className = "form-msg error";
        return;
      }
      const info5 = document.getElementById("recNuevaInfo");
      if (info5) info5.textContent = "Código verificado correctamente. Define tu nueva contraseña (mínimo 4 caracteres).";
      mostrarRecStep(5);
    });

    const recGuardarNueva = document.getElementById("recGuardarNueva");
    recGuardarNueva.addEventListener("click", () => {
      limpiarRecMsgs();
      if (!recUser) return;
      const nueva = document.getElementById("recNueva").value;
      const conf = document.getElementById("recNuevaConfirmar").value;
      if (!nueva || nueva.length < 4) {
        recNuevaMsg.textContent = "La nueva contraseña debe tener al menos 4 caracteres.";
        recNuevaMsg.className = "form-msg error";
        return;
      }
      if (nueva !== conf) {
        recNuevaMsg.textContent = "La confirmación no coincide.";
        recNuevaMsg.className = "form-msg error";
        return;
      }
      recUser.password = nueva;
      recUser.debeCambiar = false;
      recUser.bloqueado = false;
      recUser.intentos = 0;
      recUser.codigoRecuperacion = null;
      saveKey("users");
      recNuevaMsg.textContent = "Contraseña restablecida correctamente. Ya puedes iniciar sesión.";
      recNuevaMsg.className = "form-msg ok";
      document.getElementById("loginEmail").value = recUser.email;
      setTimeout(() => {
        recoverForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        limpiarRecMsgs();
      }, 1600);
    });

    volver1.addEventListener("click", () => {
      recoverForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
    });
    volver2.addEventListener("click", () => mostrarRecStep(2));
    volver3.addEventListener("click", () => mostrarRecStep(2));
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const msg = document.getElementById("loginMsg");

    const user = State.users.find(u => u.email === email);
    if (!user) {
      msg.textContent = "Correo o contraseña incorrectos.";
      msg.className = "form-msg error";
      return;
    }
    if (user.bloqueado) {
      msg.textContent = "Contraseña bloqueada tras 3 intentos fallidos. Solicita al administrador una contraseña temporal.";
      msg.className = "form-msg error";
      return;
    }
    if (user.password !== password) {
      user.intentos = (user.intentos || 0) + 1;
      if (user.intentos >= 3) {
        user.bloqueado = true;
        saveKey("users");
        msg.textContent = "Contraseña bloqueada tras 3 intentos fallidos. Solicita al administrador una contraseña temporal.";
      } else {
        saveKey("users");
        msg.textContent = `Correo o contraseña incorrectos. Intento ${user.intentos} de 3.`;
      }
      msg.className = "form-msg error";
      return;
    }
    user.intentos = 0;
    State.session = user;
    DB.set("orto_session", user);
    if (user.debeCambiar) {
      sessionStorage.setItem("orto_forzarCambio", String(user.id));
    }
    window.location.href = "index.html";
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;
    const msg = document.getElementById("regMsg");

    if (!name || !email || !password) {
      msg.textContent = "Completa todos los campos.";
      msg.className = "form-msg error";
      return;
    }
    if (State.users.some(u => u.email === email)) {
      msg.textContent = "Ese correo ya tiene una cuenta.";
      msg.className = "form-msg error";
      return;
    }

    const esPrimerUsuario = (State.users || []).length === 0;
    const preguntas = [1, 2, 3].map(i => ({
      q: document.getElementById("regPreg" + i).value,
      a: document.getElementById("regResp" + i).value.trim().toLowerCase()
    }));
    if (preguntas.some(p => !p.q || !p.a)) {
      msg.textContent = "Selecciona las 3 preguntas de seguridad y escribe sus respuestas.";
      msg.className = "form-msg error";
      return;
    }
    const user = {
      id: Date.now(),
      name,
      email,
      password,
      preguntas,
      role: esPrimerUsuario ? "admin" : "usuario",
      createdAt: new Date().toISOString()
    };
    State.users.push(user);
    saveKey("users");
    msg.textContent = esPrimerUsuario
      ? "Administrador creado correctamente. Ya puedes iniciar sesión."
      : "Usuario creado correctamente. Ya puedes iniciar sesión.";
    msg.className = "form-msg ok";
    registerForm.reset();
    const preguntasRandom2 = escogerPreguntasRandom();
    ["regPreg1", "regPreg2", "regPreg3"].forEach((id, i) => {
      const sel = document.getElementById(id);
      if (sel && preguntasRandom2[i]) sel.value = preguntasRandom2[i];
    });
    switchTab(true);
  });
}

function logout() {
  State.session = null;
  DB.set("orto_session", null);
  window.location.href = "login.html";
}

function esAdmin() {
  return !!(State.session && State.session.role === "admin");
}

const CLAVES_TRABAJO = [
  "pacientes",
  "citas",
  "registros",
  "documentos",
  "facturas",
  "citasSinConsulta",
  "recetas",
  "evaluaciones",
  "estudios"
];

function reiniciarDatosSistema() {
  for (const clave of CLAVES_TRABAJO) {
    State[clave] = [];
    saveKey(clave);
  }
  State.config = { ...CONFIG_DEFECTO };
  saveKey("config");
  aplicarConfig();
  actualizarAccesosAdmin();
}

function actualizarAccesosAdmin() {
  const admin = esAdmin();
  const btnAdmin = document.getElementById("btnAdmin");
  if (btnAdmin) {
    btnAdmin.hidden = !admin;
    btnAdmin.classList.toggle("hidden", !admin);
  }
  const btnAyuda = document.getElementById("btnAyuda");
  if (btnAyuda) {
    btnAyuda.hidden = !admin;
    btnAyuda.classList.toggle("hidden", !admin);
  }
}

function abrirAdmin() {
  actualizarAccesosAdmin();
  renderUsuarios();
  cargarOpcionesConfig();
  mostrarSeccion("admin");
  const title = document.getElementById("pageTitle");
  if (title) title.textContent = "Administración";
}

function renderUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  const countEl = document.getElementById("countUsuarios");
  if (!lista) return;

  const users = State.users || [];
  if (countEl) countEl.textContent = users.length;

  if (users.length === 0) {
    lista.innerHTML = `<p class="empty">No hay usuarios registrados.</p>`;
    return;
  }

  lista.innerHTML = users.map(u => {
    const yo = State.session && u.id === State.session.id;
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${u.name}${yo ? " (tú)" : ""}</strong>
          <span class="tag tag-role">${u.role === "admin" ? "Administrador" : "Usuario"}</span>
          ${u.bloqueado ? `<span class="tag tag-elim" title="Bloqueada tras 3 intentos fallidos">Bloqueada</span>` : ""}
          ${u.debeCambiar ? `<span class="tag tag-dup" title="Esperando que el usuario cree su contraseña">Cambio pendiente</span>` : ""}
        </div>
        <div class="item-sub">${u.email}</div>
        <div class="item-sub pass-line">
          <span class="pass-dots" data-pass="${u.id}">--------</span>
          <button type="button" class="btn-icon btn-icon--xs" data-ver-pass="${u.id}" title="Mostrar / ocultar contraseña">
            <span class="material-symbols-outlined">visibility</span>
          </button>
        </div>
        <div class="item-actions">
          ${yo ? "" : `<select class="sel-role" data-rol="${u.id}" title="Cambiar rol">
            <option value="usuario" ${u.role === "usuario" ? "selected" : ""}>Usuario</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option>
          </select>`}
          <button class="btn btn--ghost-dark btn-small" data-reset-pass="${u.id}" title="Establecer una contraseña manualmente">
            <span class="material-symbols-outlined">key</span> Contraseña
          </button>
          ${yo ? "" : `<button class="btn btn--ghost-dark btn-small" data-pass-temp="${u.id}" title="Generar contraseña temporal y desbloquear (3 intentos fallidos)">
            <span class="material-symbols-outlined">vpn_key</span> Temporal
          </button>`}
          ${yo ? "" : `<button class="btn btn--ghost-dark btn-small" data-rec-code="${u.id}" title="Generar código de recuperación (solo el administrador puede verlo)">
            <span class="material-symbols-outlined">password</span> Código
          </button>`}
          ${yo ? "" : `<button class="btn-icon danger" data-borrar-user="${u.id}" title="Eliminar usuario">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-rol]").forEach(sel =>
    sel.addEventListener("change", () => cambiarRol(Number(sel.dataset.rol), sel.value))
  );
  lista.querySelectorAll("[data-reset-pass]").forEach(b =>
    b.addEventListener("click", () => resetearPassword(Number(b.dataset.resetPass)))
  );
  lista.querySelectorAll("[data-pass-temp]").forEach(b =>
    b.addEventListener("click", () => generarContrasenaTemporal(Number(b.dataset.passTemp)))
  );
  lista.querySelectorAll("[data-rec-code]").forEach(b =>
    b.addEventListener("click", () => gestionarCodigoRecuperacion(Number(b.dataset.recCode)))
  );
  lista.querySelectorAll("[data-ver-pass]").forEach(b =>
    b.addEventListener("click", () => {
      const u = State.users.find(x => x.id === Number(b.dataset.verPass));
      if (!u) return;
      const t = lista.querySelector(`[data-pass="${b.dataset.verPass}"]`);
      if (!t) return;
      const visible = t.textContent === u.password;
      t.textContent = visible ? "--------" : u.password;
      b.classList.toggle("mostrando", !visible);
    })
  );
  lista.querySelectorAll("[data-borrar-user]").forEach(b =>
    b.addEventListener("click", () => eliminarUsuario(Number(b.dataset.borrarUser)))
  );
}

function cambiarRol(id, role) {
  const u = State.users.find(x => x.id === id);
  if (!u) return;
  const admins = State.users.filter(x => x.role === "admin").length;
  if (u.role === "admin" && role !== "admin" && admins <= 1) {
    alert("No se puede quitar el rol de administrador al último administrador.");
    renderUsuarios();
    return;
  }
  u.role = role;
  saveKey("users");
  renderUsuarios();
}

function resetearPassword(id) {
  const u = State.users.find(x => x.id === id);
  if (!u) return;
  const nueva = prompt(`Nueva contraseña para ${u.name}:`, u.password);
  if (nueva === null) return;
  if (!nueva || nueva.length < 4) {
    alert("La contraseña debe tener al menos 4 caracteres.");
    return;
  }
  u.password = nueva;
  u.debeCambiar = false;
  u.bloqueado = false;
  u.intentos = 0;
  saveKey("users");
  alert("Contraseña restablecida correctamente.");
  renderUsuarios();
}

let forzarCambioActive = false;

function generarContrasenaTemporal(id) {
  const u = State.users.find(x => x.id === id);
  if (!u || (State.session && u.id === State.session.id)) return;
  const temp = generarTempPassword();
  u.password = temp;
  u.debeCambiar = true;
  u.bloqueado = false;
  u.intentos = 0;
  saveKey("users");
  renderUsuarios();
  alert(`Contraseña temporal asignada a ${u.name}:\n\n${temp}\n\n¿Qué ocurre ahora?\n· Entrégale esta contraseña al usuario para que inicie sesión.\n· Al entrar, el sistema le pedirá crear su propia contraseña.\n· Como administrador podrás seguir viendo la contraseña en esta lista.`);
}

function gestionarCodigoRecuperacion(id) {
  const u = State.users.find(x => x.id === id);
  if (!u) return;
  const codigo = generarCodigoRecuperacion();
  u.codigoRecuperacion = codigo;
  saveKey("users");
  renderUsuarios();
  alert(`Código de recuperación para ${u.name}:\n\n${codigo}\n\nSolo el administrador puede verlo. Entrégaselo al usuario para que recupere su contraseña cuando decida no usar sus preguntas de seguridad.\n(El código se usa una sola vez: al verificar, se elimina automáticamente.)`);
}

function generarTempPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function abrirModalCambiarPass(forzado) {
  const modal = document.getElementById("modalCambiarPass");
  if (!modal) return;
  forzarCambioActive = !!forzado;
  const titulo = document.getElementById("cpTitulo");
  const mensaje = document.getElementById("cpMensaje");
  const wrap = document.getElementById("cpActualWrap");
  const cancelar = document.getElementById("cpCancelar");
  if (titulo) titulo.textContent = forzado ? "Establece una nueva contraseña" : "Cambiar mi contraseña";
  if (mensaje) mensaje.innerHTML = forzado
    ? "El administrador te asignó una contraseña temporal. Ahora debes crear tu propia contraseña (mínimo 4 caracteres)."
    : "Introduce tu contraseña actual y define una nueva.";
  if (wrap) wrap.style.display = forzado ? "none" : "";
  if (cancelar) cancelar.style.display = forzado ? "none" : "";
  const act = document.getElementById("cpActual");
  const nue = document.getElementById("cpNueva");
  const conf = document.getElementById("cpConfirmar");
  const msg = document.getElementById("cpMsg");
  if (msg) {
    msg.textContent = "";
    msg.className = "form-msg";
  }
  if (act) act.value = "";
  if (nue) nue.value = "";
  if (conf) conf.value = "";
  modal.classList.add("open");
  if (nue) setTimeout(() => nue.focus(), 60);
}

function guardarNuevaPassword() {
  const modal = document.getElementById("modalCambiarPass");
  if (!modal) return;
  const u = State.users.find(x => State.session && x.id === State.session.id);
  if (!u) return;
  const msg = document.getElementById("cpMsg");
  const actual = document.getElementById("cpActual").value;
  const nueva = document.getElementById("cpNueva").value;
  const conf = document.getElementById("cpConfirmar").value;
  if (!forzarCambioActive) {
    if (!actual) {
      msg.textContent = "Escribe tu contraseña actual.";
      msg.className = "form-msg error";
      return;
    }
    if (actual !== u.password) {
      msg.textContent = "La contraseña actual no es correcta.";
      msg.className = "form-msg error";
      return;
    }
  }
  if (!nueva || nueva.length < 4) {
    msg.textContent = "La nueva contraseña debe tener al menos 4 caracteres.";
    msg.className = "form-msg error";
    return;
  }
  if (nueva !== conf) {
    msg.textContent = "La confirmación no coincide.";
    msg.className = "form-msg error";
    return;
  }
  u.password = nueva;
  u.debeCambiar = false;
  u.intentos = 0;
  State.session = u;
  saveKey("users");
  DB.set("orto_session", u);
  sessionStorage.removeItem("orto_forzarCambio");
  const eraForzado = forzarCambioActive;
  forzarCambioActive = false;
  modal.classList.remove("open");
  mostrarNotificacion(eraForzado ? "Contraseña creada correctamente." : "Contraseña actualizada correctamente.");
}

function eliminarUsuario(id) {
  const u = State.users.find(x => x.id === id);
  if (!u || (State.session && u.id === State.session.id)) return;
  if (u.role === "admin" && State.users.filter(x => x.role === "admin").length <= 1) {
    alert("No se puede eliminar al último administrador.");
    return;
  }
  if (!confirm(`¿Eliminar al usuario "${u.name}"?`)) return;
  State.users = State.users.filter(x => x.id !== id);
  saveKey("users");
  renderUsuarios();
}

function crearUsuarioAdmin(e) {
  e.preventDefault();
  const name = document.getElementById("auNombre").value.trim();
  const email = document.getElementById("auEmail").value.trim().toLowerCase();
  const password = document.getElementById("auPassword").value;
  const role = document.getElementById("auRol").value;
  const msg = document.getElementById("auMsg");

  if (!name || !email || !password) {
    msg.textContent = "Completa todos los campos.";
    msg.className = "form-msg error";
    return;
  }
  if (State.users.some(u => u.email === email)) {
    msg.textContent = "Ese correo ya tiene una cuenta.";
    msg.className = "form-msg error";
    return;
  }
  State.users.push({ id: Date.now(), name, email, password, role, createdAt: new Date().toISOString() });
  saveKey("users");
  msg.textContent = role === "admin" ? "Administrador creado correctamente." : "Usuario creado correctamente.";
  msg.className = "form-msg ok";
  document.getElementById("auNombre").value = "";
  document.getElementById("auEmail").value = "";
  document.getElementById("auPassword").value = "";
  renderUsuarios();
}

const OPCIONES_SISTEMA = [
  ["seccionPacientes", "Mostrar sección Pacientes"],
  ["seccionCitas", "Mostrar sección Citas"],
  ["seccionRecetas", "Mostrar sección Recetas médicas"],
  ["seccionRegistros", "Mostrar sección Historial clínico"],
  ["seccionDocumentos", "Mostrar sección Documentos"],
  ["seccionFacturacion", "Mostrar sección Facturación"],
  ["seccionEvaluacionFisica", "Mostrar sección Evaluación física"],
  ["seccionEvaluacionMedica", "Mostrar sección Evaluación médica"],
  ["estadisticas", "Mostrar estadísticas (Pacientes atendidos)"],
  ["calendario", "Mostrar calendario de citas"],
  ["citasSinConsulta", "Mostrar panel de citas sin consulta"],
  ["citasCompletadas", "Mostrar panel de citas completadas y diagnósticos"],
  ["modoOscuro", "Permitir modo oscuro"],
  ["recuperarContrasena", "Permitir recuperar contraseña en el login"],
  ["registroPublico", "Permitir crear usuarios desde el login"]
];

function cargarOpcionesConfig() {
  const cont = document.getElementById("configOpciones");
  if (!cont) return;
  const cfg = configuracion();
  cont.innerHTML = OPCIONES_SISTEMA.map(([key, label]) => `
    <label class="list-item toggle-row">
      <input type="checkbox" data-cfg="${key}" ${cfg[key] !== false ? "checked" : ""} />
      <span>${label}</span>
    </label>
  `).join("");
  const limD = document.getElementById("cfgLimiteDia");
  const limS = document.getElementById("cfgLimiteSemana");
  if (limD) limD.value = cfg.limiteDiaCitas;
  if (limS) limS.value = cfg.limiteSemanaCitas;
  const colorEl = document.getElementById("cfgColorBotones");
  if (colorEl) colorEl.value = cfg.colorBotones || "actual";
}

function guardarConfig() {
  const cfg = configuracion();
  document.querySelectorAll("[data-cfg]").forEach(cb => {
    cfg[cb.dataset.cfg] = cb.checked;
  });
  const limD = document.getElementById("cfgLimiteDia");
  const limS = document.getElementById("cfgLimiteSemana");
  if (limD && Number(limD.value) >= 1) cfg.limiteDiaCitas = Number(limD.value);
  if (limS && Number(limS.value) >= 1) cfg.limiteSemanaCitas = Number(limS.value);
  const colorEl = document.getElementById("cfgColorBotones");
  if (colorEl) cfg.colorBotones = colorEl.value;
  State.config = cfg;
  saveKey("config");
  aplicarConfig();
  actualizarAccesosAdmin();
  const msg = document.getElementById("cfgMsg");
  if (msg) {
    msg.textContent = "Opciones guardadas y aplicadas.";
    msg.className = "form-msg ok";
    setTimeout(() => { msg.textContent = ""; msg.className = "form-msg"; }, 2500);
  }
}

function aplicarColorBotones(color) {
  const valor = color || "actual";
  document.body.classList.toggle("color-botones-azul", valor === "azul");
  document.body.classList.toggle("color-botones-verde", valor === "verde");
}

function aplicarConfig() {
  const cfg = configuracion();
  aplicarColorBotones(cfg.colorBotones);
  const navMap = {
    pacientes: "seccionPacientes",
    citas: "seccionCitas",
    recetas: "seccionRecetas",
    "evaluacion-fisica": "seccionEvaluacionFisica",
    "evaluacion-medica": "seccionEvaluacionMedica",
    registros: "seccionRegistros",
    documentos: "seccionDocumentos",
    facturacion: "seccionFacturacion"
  };
  document.querySelectorAll(".nav-item").forEach(item => {
    const key = navMap[item.dataset.seccion];
    const oculto = key && cfg[key] === false;
    item.classList.toggle("hidden", !!oculto);
    if (oculto) {
      const sec = document.getElementById("seccion-" + item.dataset.seccion);
      if (sec && sec.classList.contains("active")) mostrarSeccion("inicio");
    }
  });

  const subCompletadas = document.querySelector('.nav-sub-item[data-seccion="citas-completadas"]');
  if (subCompletadas) subCompletadas.classList.toggle("hidden", cfg.citasCompletadas === false);
  const secCompletadas = document.getElementById("seccion-citas-completadas");
  if (cfg.citasCompletadas === false && secCompletadas && secCompletadas.classList.contains("active")) mostrarSeccion("inicio");

  const subSinConsulta = document.querySelector('.nav-sub-item[data-seccion="citas-sin-consulta"]');
  if (subSinConsulta) subSinConsulta.classList.toggle("hidden", cfg.citasSinConsulta === false);
  const secSinConsulta = document.getElementById("seccion-citas-sin-consulta");
  if (cfg.citasSinConsulta === false && secSinConsulta && secSinConsulta.classList.contains("active")) mostrarSeccion("inicio");

  const porId = {
    btnAbrirStatsPanel: "estadisticas",
    btnCalendario: "calendario",
    panelCitasSinConsulta: "citasSinConsulta",
    panelCitasCompletadas: "citasCompletadas",
    dashPanelSinConsulta: "citasSinConsulta",
    dashPanelCompletadas: "citasCompletadas"
  };
  for (const id in porId) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", cfg[porId[id]] === false);
  }
  const btnModo = document.getElementById("btnModoOscuro");
  if (btnModo) btnModo.classList.toggle("hidden", cfg.modoOscuro === false);
}

function initNavigation() {
  const sideMenu = document.getElementById("lateral");
  const rotador = document.getElementById("rotador");
  const rotadorIcon = document.getElementById("rotadorIcon");

  if (!rotador || !sideMenu) return;

  function updateIcon() {
    const isOpen = sideMenu.classList.contains("active");
    rotadorIcon.textContent = isOpen ? "folder_open" : "folder";
    rotadorIcon.classList.toggle("abierta", isOpen);
    rotador.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  }

  rotador.addEventListener("click", () => {
    sideMenu.classList.toggle("active");
    updateIcon();
  });

  document.querySelectorAll(".nav-item > a").forEach(link => {
    link.addEventListener("click", () => {
      const item = link.closest(".nav-item");
      const sub = item ? item.querySelector(".nav-sub") : null;
      if (sub) {
        item.classList.toggle("open");
        sub.classList.toggle("open");
        return;
      }
      sideMenu.classList.remove("active");
      updateIcon();
    });
  });

  document.querySelectorAll(".nav-sub-item > a").forEach(link => {
    link.addEventListener("click", () => {
      sideMenu.classList.remove("active");
      updateIcon();
    });
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
}

function pacientesActivos() {
  return State.pacientes.filter(p => !p.eliminado);
}

function pacienteEliminadoDe(pacienteId) {
  const p = State.pacientes.find(x => x.id === pacienteId);
  return !!(p && p.eliminado);
}

function activoConPaciente(pacienteId) {
  const p = State.pacientes.find(x => x.id === pacienteId);
  return !!(p && !p.eliminado);
}

function pacienteDuplicadoActivo(ref) {
  if (!ref) return null;
  const nombre = (ref.nombre || "").trim().toLowerCase();
  return State.pacientes.find(q =>
    q && q.id !== ref.id && !q.eliminado && (
      (ref.codigo && q.codigo && q.codigo === ref.codigo) ||
      (ref.cedula && q.cedula && q.cedula === ref.cedula) ||
      (nombre && q.nombre && q.nombre.trim().toLowerCase() === nombre)
    )
  );
}

function etiquetaPacienteHistorial(pacienteId) {
  const p = State.pacientes.find(x => x.id === pacienteId);
  if (p && !p.eliminado) {
    const fech = p.fechaReactivado || "";
    return { nombre: p.nombre, nota: fech ? "Paciente reestablecido · " + fmtFechaES(fech) : "" };
  }
  if (p && p.eliminado) {
    const dup = pacienteDuplicadoActivo(p);
    if (dup) {
      const fech = dup.fechaReactivado || dup.fechaEliminado || "";
      return { nombre: dup.nombre, nota: "Paciente reestablecido · " + fmtFechaES(fech) };
    }
    return { nombre: "Paciente eliminado", nota: "" };
  }
  return { nombre: "Paciente eliminado", nota: "" };
}

function siluetaPerfilSexo(sexo) {
  return String(sexo || "").toLowerCase().startsWith("f") ? "siluetaPerfil_femenino.jfif" : "siluetaPerfil_masculino.jfif";
}

function nextPacienteId() {
  return State.pacientes.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
}

function genCodigoPaciente() {
  let max = 1000;
  State.pacientes.forEach(p => {
    const m = /^ORT-(\d+)$/.exec(String(p.codigo || ""));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return "ORT-" + (max + 1);
}

/* ===== Fecha de nacimiento y cumpleaños ===== */

function datosFechaNacimiento(fechaISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fechaISO || "").trim());
  if (!m) return null;
  const anio = Number(m[1]), mes = Number(m[2]), dia = Number(m[3]);
  if (anio < 1900 || anio > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { anio, mes, dia };
}

function edadDesdeFechaNacimiento(fechaISO) {
  const d = datosFechaNacimiento(fechaISO);
  if (!d) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - d.anio;
  const cumpleEsteAnio = new Date(hoy.getFullYear(), d.mes - 1, d.dia);
  if (hoy < cumpleEsteAnio) edad--;
  if (edad < 0 || edad > 120) return null;
  return edad;
}

/* ===== Editar paciente ===== */

let pacienteEditandoId = null;

function abrirModalEditarPaciente(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  pacienteEditandoId = id;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val == null ? "" : val; };
  set("edPacNombre", p.nombre || "");
  set("edPacEdad", p.edad != null ? p.edad : "");
  set("edPacFechaNacimiento", p.fechaNacimiento || "");
  set("edPacSexo", p.sexo || "No especificado");
  set("edPacCedula", p.cedula || "");
  set("edPacSeguro", p.seguro || "");
  set("edPacTelefono", p.telefono || "");
  set("edPacEmail", p.email || "");
  set("edPacRazon", p.razonConsulta || "");
  set("edPacHistoriaActual", p.historiaActual || "");
  set("edPacNotas", p.notas || "");
  abrirModal("modalEditarPaciente");
}

function guardarPacienteEditado(e) {
  if (e) e.preventDefault();
  const p = State.pacientes.find(x => x.id === pacienteEditandoId);
  if (!p) { cerrarModales(); return; }
  const val = elId => { const el = document.getElementById(elId); return el ? el.value : ""; };
  const nombre = val("edPacNombre").trim();
  if (!nombre) return;
  p.nombre = nombre;
  p.edad = val("edPacEdad").trim();
  p.fechaNacimiento = val("edPacFechaNacimiento");
  p.sexo = val("edPacSexo");
  p.cedula = val("edPacCedula").trim();
  p.seguro = val("edPacSeguro").trim();
  p.telefono = val("edPacTelefono").trim();
  p.email = val("edPacEmail").trim();
  p.razonConsulta = val("edPacRazon");
  p.historiaActual = val("edPacHistoriaActual").trim();
  p.notas = val("edPacNotas").trim();
  saveKey("pacientes");
  cerrarModales();
  const buscador = document.getElementById("buscarPaciente");
  renderPacientes(buscador ? buscador.value : "");
  fillRaPaciente(); try { syncRaToAll(); } catch (err) {}
  renderHome();
  mostrarNotificacion("Paciente actualizado");
}

function renderPacientes(filtro = "") {
  const lista = document.getElementById("listaPacientes");
  if (!lista) return;

  const q = filtro.trim().toLowerCase();
  const data = pacientesActivos()
    .filter(p => {
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.telefono || "").toLowerCase().includes(q)
      );
    });

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No se encontraron pacientes.</p>`;
    return;
  }

  lista.innerHTML = data.map(p => {
    const duplicado = pacienteDuplicadoActivo(p);
    return `
    <div class="list-item" data-id="${p.id}">
      <div class="item-main">
        <strong>${p.nombre}</strong>
        <span class="tag">${p.codigo}</span>
        ${duplicado ? `<span class="tag tag-dup" title="Este paciente podría estar duplicado">Duplicado</span>` : ""}
        ${p.cedula ? `<span class="tag">Cédula: ${p.cedula}</span>` : ""}
      </div>
      <div class="item-sub">Edad: ${p.edad || "-"} · Sexo: ${p.sexo || "-"} · Seguro: ${p.seguro || "-"} · Tel: ${p.telefono || "-"}</div>
      <div class="item-actions">
        <button class="btn-icon" data-ver="${p.id}" title="Ver ficha">
          <span class="material-symbols-outlined">visibility</span>
        </button>
        <button class="btn-icon" data-editar="${p.id}" title="Editar paciente">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn-icon danger" data-borrar="${p.id}" title="Eliminar">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `;
  }).join("");

  lista.querySelectorAll("[data-ver]").forEach(b =>
    b.addEventListener("click", () => verPaciente(Number(b.dataset.ver)))
  );
  lista.querySelectorAll("[data-editar]").forEach(b =>
    b.addEventListener("click", () => abrirModalEditarPaciente(Number(b.dataset.editar)))
  );
  lista.querySelectorAll("[data-borrar]").forEach(b =>
    b.addEventListener("click", () => pedirBorrarPaciente(Number(b.dataset.borrar)))
  );

  renderPacientesEliminados();
  fillRaPaciente(); try{ syncRaToAll(); }catch(e){}
  renderPacientesSinCita();
  renderCitasAux();
}

let pendienteOpcionesPacElim = null;
let mostrarListaPacElim = true;

function toggleListaPacientesEliminados() {
  mostrarListaPacElim = !mostrarListaPacElim;
  const txt = document.getElementById("txtMostrarPacElim");
  if (txt) txt.textContent = mostrarListaPacElim ? "Ocultar eliminados" : "Mostrar eliminados";
  renderPacientesEliminados();
}

function renderPacientesEliminados() {
  const lista = document.getElementById("listaPacientesEliminados");
  const count = document.getElementById("countPacientesEliminados");
  const elim = State.pacientes
    .filter(p => p.eliminado)
    .sort((a, b) => String(b.fechaEliminado || "").localeCompare(String(a.fechaEliminado || "")));
  if (count) count.textContent = elim.length;
  if (lista) lista.hidden = !mostrarListaPacElim;
  if (!lista || !mostrarListaPacElim) return;

  if (elim.length === 0) {
    lista.innerHTML = `<p class="empty">No hay pacientes eliminados.</p>`;
    return;
  }

  lista.innerHTML = elim.map(p => {
    const nTotal =
      State.citas.filter(c => c.pacienteId === p.id).length +
      State.evaluaciones.filter(e => e.pacienteId === p.id).length +
      State.registros.filter(r => r.pacienteId === p.id).length +
      State.documentos.filter(d => d.pacienteId === p.id).length +
      State.facturas.filter(f => f.pacienteId === p.id).length +
      State.recetas.filter(r => r.pacienteId === p.id).length;
    return `
    <div class="list-item">
      <div class="item-main">
        <strong>${p.nombre}</strong>
        <span class="tag">${p.codigo}</span>
        <span class="tag tag-elim">Eliminado ${p.fechaEliminado || ""}</span>
        <span class="tag">${nTotal} registro(s)</span>
      </div>
      <div class="item-sub">Cédula: ${p.cedula || "-"} · Edad: ${p.edad || "-"} · Tel: ${p.telefono || "-"} · ID interno: ${p.id}</div>
      <div class="item-actions">
        <button class="btn-icon" data-acciones-pac-elim="${p.id}" title="Opciones: restaurar o eliminar por completo">
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    </div>`;
  }).join("");

  lista.querySelectorAll("[data-acciones-pac-elim]").forEach(b =>
    b.addEventListener("click", () => abrirOpcionesPacienteEliminado(Number(b.dataset.accionesPacElim)))
  );
}

function abrirOpcionesPacienteEliminado(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  pendienteOpcionesPacElim = id;
  const nCitas = State.citas.filter(c => c.pacienteId === id).length;
  const nEvals = State.evaluaciones.filter(e => e.pacienteId === id).length;
  const nReg = State.registros.filter(r => r.pacienteId === id).length;
  const nDoc = State.documentos.filter(d => d.pacienteId === id).length;
  const nFac = State.facturas.filter(f => f.pacienteId === id).length;
  const nRec = State.recetas.filter(r => r.pacienteId === id).length;
  const nTotal = nCitas + nEvals + nReg + nDoc + nFac + nRec;
  const info = document.getElementById("pacElimInfo");
  if (info) {
    info.innerHTML = `
      <div class="list-item">
        <div class="item-main">
          <strong>${p.nombre}</strong>
          <span class="tag">${p.codigo}</span>
          <span class="tag tag-elim">Eliminado ${p.fechaEliminado || ""}</span>
        </div>
        <div class="item-sub">Cédula: ${p.cedula || "-"} · Edad: ${p.edad || "-"} · Sexo: ${p.sexo || "-"} · Seguro: ${p.seguro || "-"} · Tel: ${p.telefono || "-"} · ID interno: ${p.id}</div>
        <div class="item-sub">Citas: ${nCitas} · Evaluaciones: ${nEvals} · Registros: ${nReg} · Documentos: ${nDoc} · Facturas: ${nFac} · Recetas: ${nRec} · Total: ${nTotal}</div>
      </div>`;
  }
  const msg = document.getElementById("pacElimMsg");
  if (msg) msg.textContent = "Elige qué hacer con este paciente. Ambas acciones requieren tu contraseña de usuario.";
  abrirModal("modalPacienteEliminado");
}

function accionRestaurarPacElim() {
  if (pendienteOpcionesPacElim === null) return;
  if (!esAdmin()) {
    const msg = document.getElementById("pacElimMsg");
    if (msg) {
      msg.textContent = "Solo el administrador puede restaurar pacientes.";
      msg.className = "form-msg error";
    }
    return;
  }
  const id = pendienteOpcionesPacElim;
  cerrarModales();
  pedirReactivarPaciente(id);
}

function accionBorrarDefPacElim() {
  if (pendienteOpcionesPacElim === null) return;
  const id = pendienteOpcionesPacElim;
  cerrarModales();
  pedirEliminacionDefinitiva(id);
}

let pacienteActual = null;

function renderPacientesSinCita() {
  const lista = document.getElementById("listaSinCitas");
  const countEl = document.getElementById("countSinCita");
  if (!lista) return;

  const sinCita = pacientesActivos().filter(p => !State.citas.some(c => c.pacienteId === p.id && !c.completada && !c.cancelada));
  if (countEl) countEl.textContent = sinCita.length;

  if (sinCita.length === 0) {
    lista.innerHTML = `<p class="empty">Todos los pacientes tienen al menos una cita.</p>`;
    return;
  }

  lista.innerHTML = sinCita.map(p => `
    <div class="list-item">
      <div class="item-main">
        <strong>${p.nombre}</strong>
        <span class="tag">${p.codigo}</span>
      </div>
      <div class="item-sub">Cédula: ${p.cedula || "-"} · Seguro: ${p.seguro || "-"}</div>
      <div class="item-actions">
        <button class="btn btn--primary btn-small" data-agendar="${p.id}">
          <span class="material-symbols-outlined">event</span> Agendar cita
        </button>
      </div>
    </div>
  `).join("");

  lista.querySelectorAll("[data-agendar]").forEach(b =>
    b.addEventListener("click", () => agendarPacienteSinCita(Number(b.dataset.agendar)))
  );
}

let agendarCitaId = null;

function agendarPacienteSinCita(id) {
  const p = State.pacientes.find(x => x.id === id);
  agendarCitaId = id;
  const nombre = document.getElementById("agendarPacienteNombre");
  if (nombre) nombre.textContent = p ? `${p.codigo} - ${p.nombre}` : "Paciente desconocido";
  const fecha = document.getElementById("agendarFecha");
  if (fecha) fecha.valueAsDate = new Date();
  const hora = document.getElementById("agendarHora");
  if (hora) hora.value = "09:00";
  const motivo = document.getElementById("agendarMotivo");
  if (motivo) motivo.value = "";
  updateLimiteAgendar(fecha ? fecha.value : "");
  abrirModal("modalAgendar");
}

function updateLimiteAgendar(fecha) {
  const el = document.getElementById("agendarLimiteInfo");
  if (!el) return;
  if (!fecha) {
    el.textContent = "";
    return;
  }
  el.textContent = `Citas ese día: ${citasEnDia(fecha)}/${limiteDia()} · Citas en la semana: ${citasEnSemana(fecha)}/${limiteSemana()}`;
  el.classList.toggle("limite-error", validarLimiteCitas(fecha) !== null);
}

function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("open");
}

function cerrarModales() {
  document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));
}

function mostrarNotificacion(mensaje) {
  let cont = document.getElementById("toast-container");
  if (!cont) {
    cont = document.createElement("div");
    cont.className = "toast-container";
    cont.id = "toast-container";
    document.body.appendChild(cont);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="material-symbols-outlined toast-check">check_circle</span>
    <div class="toast-msg">
      <strong>${mensaje}</strong>
      <span>Guardado correctamente</span>
    </div>`;
  cont.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 350);
  }, 3400);
}

function renderCitasAux() {
  const listaSin = document.getElementById("listaSinCitasCitas");
  const countSin = document.getElementById("countSinCitaCitas");
  const listaSeg = document.getElementById("listaSeguimiento");
  const countSeg = document.getElementById("countSeguimiento");

  const sinCita = pacientesActivos().filter(p => !State.citas.some(c => c.pacienteId === p.id && !c.completada && !c.cancelada));
  if (countSin) countSin.textContent = sinCita.length;

  if (listaSin) {
    if (sinCita.length === 0) {
      listaSin.innerHTML = `<p class="empty">Todos los pacientes tienen al menos una cita.</p>`;
    } else {
      listaSin.innerHTML = sinCita.map(p => `
        <div class="list-item">
          <div class="item-main">
            <strong>${p.nombre}</strong>
            <span class="tag">${p.codigo}</span>
          </div>
          <div class="item-sub">Cédula: ${p.cedula || "-"} · Seguro: ${p.seguro || "-"}</div>
          <div class="item-actions">
            <button class="btn btn--primary btn-small" data-agendar-cita="${p.id}">
              <span class="material-symbols-outlined">event</span> Agendar cita
            </button>
          </div>
        </div>
      `).join("");
    }
    listaSin.querySelectorAll("[data-agendar-cita]").forEach(b =>
      b.addEventListener("click", () => agendarPacienteSinCita(Number(b.dataset.agendarCita)))
    );
  }

  const hoy = new Date().toISOString().split("T")[0];
  const enSeguimiento = pacientesActivos().filter(p => {
    const tieneRegistros = State.registros.some(r => r.pacienteId === p.id);
    const tieneProximaCita = State.citas.some(c => c.pacienteId === p.id && c.fecha >= hoy && !c.completada && !c.cancelada);
    return tieneRegistros || tieneProximaCita;
  });
  if (countSeg) countSeg.textContent = enSeguimiento.length;

  if (listaSeg) {
    if (enSeguimiento.length === 0) {
      listaSeg.innerHTML = `<p class="empty">No hay pacientes en seguimiento.</p>`;
    } else {
      listaSeg.innerHTML = enSeguimiento.map(p => {
        const nRegistros = State.registros.filter(r => r.pacienteId === p.id).length;
        const prox = State.citas
          .filter(c => c.pacienteId === p.id && c.fecha >= hoy && !c.completada && !c.cancelada)
          .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
        return `
          <div class="list-item">
            <div class="item-main">
              <strong>${p.nombre}</strong>
              <span class="tag">${p.codigo}</span>
            </div>
            <div class="item-sub">Registros: ${nRegistros}${prox ? ` · Próxima cita: ${prox.fecha} ${fmtHora12(prox.hora, prox.amPm)}` : ""}</div>
            <div class="item-actions">
              <button class="btn btn--ghost-dark btn-small" data-ver-registros="${p.id}">
                <span class="material-symbols-outlined">folder_open</span> Ver registros
              </button>
            </div>
          </div>
        `;
      }).join("");
    }
    listaSeg.querySelectorAll("[data-ver-registros]").forEach(b =>
      b.addEventListener("click", () => mostrarSeccion("registros"))
    );
  }
}

function updateCitaLimiteInfo() {
  const el = document.getElementById("citaLimiteInfo");
  if (!el) return;
  const fecha = document.getElementById("citaFecha") ? document.getElementById("citaFecha").value : "";
  if (!fecha) {
    el.textContent = "";
    el.classList.remove("limite-error");
    return;
  }
  const enDia = citasEnDia(fecha);
  const enSemana = citasEnSemana(fecha);
  el.textContent = `Citas ese día: ${enDia}/${limiteDia()} · Citas en la semana: ${enSemana}/${limiteSemana()}`;
  el.classList.toggle("limite-error", validarLimiteCitas(fecha) !== null);
}

function fichaPacienteHTML(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return `<p class="empty">Paciente no encontrado.</p>`;

  const citas = State.citas.filter(c => c.pacienteId === id);
  const documentos = State.documentos.filter(d => d.pacienteId === id);
  const evaluaciones = State.evaluaciones.filter(e => e.pacienteId === id);
  const registros = State.registros.filter(r => r.pacienteId === id);
  const facturas = State.facturas.filter(f => f.pacienteId === id);
  const recetas = State.recetas.filter(r => r.pacienteId === id);
  const hoy = new Date().toISOString().split("T")[0];
  const proximas = State.citas
    .filter(c => c.pacienteId === id && c.fecha >= hoy && !c.completada && !c.cancelada)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const prox = proximas[0];

  return `
    <div class="ficha">
      <div class="ficha-head">
        <span class="tag">${p.codigo}</span>
        <h3>${p.nombre}</h3>
      </div>
      <p><strong>Cédula:</strong> ${p.cedula || "-"} · <strong>Seguro:</strong> ${p.seguro || "-"}</p>
      <p><strong>Edad:</strong> ${p.edad || "-"} · <strong>Sexo:</strong> ${p.sexo || "-"}</p>
      <p><strong>Teléfono:</strong> ${p.telefono || "-"} · <strong>Correo:</strong> ${p.email || "-"}</p>
      <p><strong>Contacto de emergencia:</strong> ${(p.emergencia || "No registrado") + (p.emergencia && p.telefonoEmergencia ? " · " + p.telefonoEmergencia : "")}</p>
      <p><strong>Ocupación:</strong> ${p.ocupacion || "-"} · <strong>Mano dominante:</strong> ${p.manoDominante || "-"}</p>
      <p><strong>Razón de la consulta:</strong> ${p.razonConsulta || "-"}</p>
      <p><strong>Historia actual:</strong> ${p.historiaActual || "-"}</p>
      <p><strong>Antecedentes mórbidos:</strong> ${(p.antecedentesMorbidos || []).join(", ") || "-"}</p>
      <p><strong>Antecedentes quirúrgicos:</strong> ${(p.antecedentesQuirurgicos || []).join(", ") || "-"}</p>
      <p><strong>Antecedentes alérgicos:</strong> ${(p.antecedentesAlergicos || []).join(", ") || "-"}</p>
      <p><strong>Notas:</strong> ${p.notas || "Sin notas"}</p>
      <div class="prox-cita">
        <strong>Próxima cita:</strong>
        ${prox ? `${prox.fecha} · ${fmtHora12(prox.hora, prox.amPm)} - ${prox.motivo}` : "Sin cita programada"}
      </div>
      <div class="ficha-stats">
        <span>${citas.length} citas</span>
        <span>${evaluaciones.length} evaluaciones</span>
        <span>${registros.length} registros</span>
        <span>${documentos.length} documentos</span>
        <span>${facturas.length} facturas</span>
        <span>${recetas.length} recetas</span>
        <span>${State.estudios.filter(e => e.pacienteId === id).length} estudios</span>
      </div>
      <h4 class="act-titulo">Historial del paciente</h4>
      <div class="ficha-pestanas">
        <button type="button" class="ficha-pestana active" data-ficha-vista="crono">Todo el historial</button>
        <button type="button" class="ficha-pestana" data-ficha-vista="grupos">Por categorías</button>
      </div>
      <div class="ficha-vista active" data-ficha-vista="crono">
        ${historialCronologicoHTML(id)}
      </div>
      <div class="ficha-vista" data-ficha-vista="grupos">
        ${fichaGruposHTML(id)}
      </div>
      <p class="act-note">El historial se conserva automáticamente en la ficha mientras exista el paciente, hasta que lo elimines.</p>
    </div>
  `;
}

function historialCronologicoHTML(id) {
  const items = actividadPaciente(id);
  if (!items.length) return `<p class="empty">Este paciente aún no tiene actividad registrada (citas, evaluaciones, registros, documentos, facturas, recetas o estudios).</p>`;
  return items.map(it => `
    <div class="act-item">
      <span class="material-symbols-outlined act-icono">${it.icono}</span>
      <div class="act-texto">
        <strong>${it.titulo}</strong>
        <span>${it.fechaTxt} · ${it.detalle}</span>
      </div>
      <span class="${it.tagClase}">${it.tipo}</span>
    </div>
  `).join("");
}

function actividadItemHTML(icono, titulo, texto, tagHTML) {
  return `
    <div class="act-item">
      <span class="material-symbols-outlined act-icono">${icono}</span>
      <div class="act-texto">
        <strong>${titulo}</strong>
        <span>${texto}</span>
      </div>
      ${tagHTML}
    </div>`;
}

function fichaGrupoHTML(titulo, icono, items) {
  if (!items.length) return "";
  return `
    <div class="ficha-grupo">
      <h5 class="ficha-grupo-titulo"><span class="material-symbols-outlined fg-icon">${icono}</span> ${titulo} <em class="fg-count">${items.length}</em></h5>
      <div class="act-lista">${items.join("")}</div>
    </div>`;
}

function fichaGruposHTML(id) {
  const h = [];

  const citas = State.citas
    .filter(c => c.pacienteId === id)
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  h.push(fichaGrupoHTML("Citas", "event", citas.map(c => actividadItemHTML(
    "event",
    c.motivo || "Cita",
    `${fmtFechaES(c.fecha)} · ${fmtHora12(c.hora, c.amPm)}${c.turno ? " · Turno " + c.turno : ""}`,
    `<span class="${c.completada ? "tag-ok" : c.cancelada ? "tag-cancel" : "tag"}">${c.completada ? "Completada" : c.cancelada ? "Cancelada" : "Pendiente"}</span>`
  ))));

  const evaluaciones = State.evaluaciones
    .filter(e => e.pacienteId === id)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  h.push(fichaGrupoHTML("Evaluaciones físicas", "accessibility_new", evaluaciones.map(ev => {
    const claves = Object.keys(ev.lesiones || {});
    const resumen = claves.slice(0, 4).map(k => NOMBRES_PARTES[k] || k).join(", ");
    return actividadItemHTML(
      "accessibility_new",
      "Evaluación física",
      `${fmtFechaES(ev.fecha)} · ${claves.length} zona(s)${claves.length ? " · " + resumen + (claves.length > 4 ? "…" : "") : ""}${ev.nota ? " · " + ev.nota : ""}`,
      `<span class="tag">Evaluación</span>`
    );
  })));

  const registros = State.registros
    .filter(r => r.pacienteId === id)
    .sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || ""));
  h.push(fichaGrupoHTML("Registros clínicos", "history_edu", registros.map(r => actividadItemHTML(
    "history_edu",
    r.titulo || "Registro clínico",
    `${r.fecha}${r.tipo ? " · " + r.tipo : ""}${r.detalle ? " · " + r.detalle : ""}`,
    `<span class="tag">Registro</span>`
  ))));

  const documentos = State.documentos
    .filter(d => d.pacienteId === id)
    .sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || ""));
  h.push(fichaGrupoHTML("Documentos", "upload_file", documentos.map(d => actividadItemHTML(
    "upload_file",
    d.descripcion || d.name || "Documento",
    `${d.fecha}${d.name && d.descripcion !== d.name ? " · " + d.name : ""}`,
    `<span class="tag">Documento</span>`
  ))));

  const facturas = State.facturas
    .filter(f => f.pacienteId === id)
    .sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || ""));
  h.push(fichaGrupoHTML("Facturas", "receipt_long", facturas.map(f => actividadItemHTML(
    "receipt_long",
    "Factura " + (f.codigo || ""),
    `${fmtFechaES(f.fecha)} · Total: ${fmtMoney(f.total)} · Dr(a). ${f.doctor || ""}`,
    `<span class="tag">Factura</span>`
  ))));

  const recetas = State.recetas
    .filter(r => r.pacienteId === id)
    .sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || ""));
  h.push(fichaGrupoHTML("Recetas", "medication", recetas.map(rc => actividadItemHTML(
    "medication",
    "Receta " + (rc.codigo || ""),
    `${fmtFechaES(rc.fecha)} · ${(rc.medicamentos || []).length} medicamento(s) · Dr(a). ${rc.doctor || ""}`,
    `<span class="tag">Receta</span>`
  ))));

  const estudios = State.estudios
    .filter(e => e.pacienteId === id)
    .sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || "") || b.id - a.id);
  h.push(fichaGrupoHTML("Estudios e imágenes médicas", "radiology", estudios.map(es => actividadItemHTML(
    "radiology",
    es.tipo || "Estudio médico",
    `${fmtFechaES(es.fecha)}${es.descripcion ? " · " + es.descripcion : ""}`,
    `<span class="tag">Estudio</span>`
  ))));

  if (!h.some(x => x)) return `<p class="empty">Este paciente aún no tiene actividad registrada (citas, evaluaciones, registros, documentos, facturas, recetas o estudios).</p>`;
  return h.join("");
}

function verPaciente(id) {
  const p = State.pacientes.find(x => x.id === id);
  const panel = document.getElementById("detallePacientePanel");
  const cont = document.getElementById("detallePaciente");
  if (!p || !panel || !cont) return;
  pacienteActual = id;

  cont.innerHTML = fichaPacienteHTML(id);
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth" });
}

function actividadPaciente(id) {
  const items = [];
  State.citas.filter(c => c.pacienteId === id).forEach(c => {
    items.push({
      fechaISO: c.fecha || "",
      fechaTxt: fmtFechaES(c.fecha) + (c.hora ? ` · ${fmtHora12(c.hora, c.amPm)}` : ""),
      icono: "event",
      titulo: c.motivo || "Cita",
      detalle: "Cita registrada",
      tipo: c.completada ? "Completada" : c.cancelada ? "Cancelada" : "Pendiente",
      tagClase: c.completada ? "tag-ok" : c.cancelada ? "tag-cancel" : "tag"
    });
  });
  State.evaluaciones.filter(e => e.pacienteId === id).forEach(ev => {
    const claves = Object.keys(ev.lesiones || {});
    items.push({
      fechaISO: ev.fecha || "",
      fechaTxt: fmtFechaES(ev.fecha || ""),
      icono: "accessibility_new",
      titulo: "Evaluación física",
      detalle: `${claves.length} zona(s) marcada(s)` + (ev.nota ? ` · ${ev.nota}` : ""),
      tipo: "Evaluación",
      tagClase: "tag"
    });
  });
  State.registros.filter(r => r.pacienteId === id).forEach(r => items.push({
    fechaISO: fechaESaISO(r.fecha) || "",
    fechaTxt: r.fecha,
    icono: "history_edu",
    titulo: r.titulo || "Registro clínico",
    detalle: (r.tipo ? r.tipo + (r.detalle ? " · " : "") : "") + (r.detalle || ""),
    tipo: "Registro",
    tagClase: "tag"
  }));
  State.documentos.filter(d => d.pacienteId === id).forEach(d => items.push({
    fechaISO: fechaESaISO(d.fecha) || "",
    fechaTxt: d.fecha,
    icono: "upload_file",
    titulo: d.descripcion || d.name || "Documento",
    detalle: "Documento subido al historial",
    tipo: "Documento",
    tagClase: "tag"
  }));
  State.facturas.filter(f => f.pacienteId === id).forEach(f => items.push({
    fechaISO: fechaESaISO(f.fecha) || "",
    fechaTxt: fmtFechaES(f.fecha),
    icono: "receipt_long",
    titulo: "Factura " + (f.codigo || ""),
    detalle: `Total: ${fmtMoney(f.total)} · Dr(a). ${f.doctor || ""}`,
    tipo: "Factura",
    tagClase: "tag"
  }));
  State.recetas.filter(r => r.pacienteId === id).forEach(r => items.push({
    fechaISO: fechaESaISO(r.fecha) || "",
    fechaTxt: fmtFechaES(r.fecha),
    icono: "medication",
    titulo: "Receta " + (r.codigo || ""),
    detalle: `${(r.medicamentos || []).length} medicamento(s) · Dr(a). ${r.doctor || ""}`,
    tipo: "Receta",
    tagClase: "tag"
  }));
  State.estudios.filter(e => e.pacienteId === id).forEach(es => items.push({
    fechaISO: fechaESaISO(es.fecha) || "",
    fechaTxt: fmtFechaES(es.fecha),
    icono: "radiology",
    titulo: (es.tipo || "Estudio") + (es.descripcion && es.descripcion !== es.name ? " · " + es.descripcion : ""),
    detalle: "Imagen médica / estudio",
    tipo: "Estudio",
    tagClase: "tag"
  }));
  items.sort((a, b) => (b.fechaISO || "").localeCompare(a.fechaISO || ""));
  return items;
}

function actividadPacienteHTML(id) {
  const items = actividadPaciente(id);
  if (items.length === 0) return `<p class="empty">Este paciente aún no tiene actividad registrada (citas, evaluaciones, registros, documentos, facturas o recetas).</p>`;
  return items.slice(0, 25).map(it => `
    <div class="act-item">
      <span class="material-symbols-outlined act-icono">${it.icono}</span>
      <div class="act-texto">
        <strong>${it.titulo}</strong>
        <span>${it.fechaTxt} · ${it.detalle}</span>
      </div>
      <span class="${it.tagClase}">${it.tipo}</span>
    </div>
  `).join("") + (items.length > 25 ? `<p class="act-mas">Mostrando las últimas 25 acciones · total: ${items.length}</p>` : "");
}

function imprimirFichaPaciente(id, marcados) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  const partes = [];
  const marcadosArr = marcados == null ? [0, 1] : marcados;
  if (marcadosArr.includes(0)) partes.push(htmlFichaPersonalPrint(p));
  if (marcadosArr.includes(1)) partes.push(htmlActividadPrint(id));
  if (!partes.length) return;
  abrirImpresion("Ficha del paciente", partes.join(`<div class="print-separador"></div>`));
}

function htmlFichaPersonalPrint(p) {
  const citas = State.citas.filter(c => c.pacienteId === p.id);
  const documentos = State.documentos.filter(d => d.pacienteId === p.id);
  const hoy = new Date().toISOString().split("T")[0];
  const proximas = State.citas
    .filter(c => c.pacienteId === p.id && c.fecha >= hoy && !c.completada && !c.cancelada)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const prox = proximas[0];
  return `
    <div class="ficha-print-head">
      <h3>${p.nombre}</h3>
      <span>Código: ${p.codigo}</span>
    </div>
    <table>
      <tbody>
        <tr><td><strong>Cédula</strong></td><td>${p.cedula || "-"}</td></tr>
        <tr><td><strong>Seguro</strong></td><td>${p.seguro || "-"}</td></tr>
        <tr><td><strong>Edad</strong></td><td>${p.edad || "-"}</td></tr>
        <tr><td><strong>Sexo</strong></td><td>${p.sexo || "-"}</td></tr>
        <tr><td><strong>Teléfono</strong></td><td>${p.telefono || "-"}</td></tr>
        <tr><td><strong>Correo</strong></td><td>${p.email || "-"}</td></tr>
        <tr><td><strong>Contacto de emergencia</strong></td><td>${p.emergencia || "-"}${p.telefonoEmergencia ? " · " + p.telefonoEmergencia : ""}</td></tr>
        <tr><td><strong>Ocupación</strong></td><td>${p.ocupacion || "-"}</td></tr>
        <tr><td><strong>Mano dominante</strong></td><td>${p.manoDominante || "-"}</td></tr>
        <tr><td><strong>Razón de la consulta</strong></td><td>${p.razonConsulta || "-"}</td></tr>
        <tr><td><strong>Historia actual</strong></td><td>${p.historiaActual || "-"}</td></tr>
        <tr><td><strong>Antecedentes mórbidos</strong></td><td>${(p.antecedentesMorbidos || []).join(", ") || "-"}</td></tr>
        <tr><td><strong>Antecedentes quirúrgicos</strong></td><td>${(p.antecedentesQuirurgicos || []).join(", ") || "-"}</td></tr>
        <tr><td><strong>Antecedentes alérgicos</strong></td><td>${(p.antecedentesAlergicos || []).join(", ") || "-"}</td></tr>
        <tr><td><strong>Próxima cita</strong></td><td>${prox ? `${prox.fecha} · ${fmtHora12(prox.hora, prox.amPm)} - ${prox.motivo}` : "Sin cita programada"}</td></tr>
        <tr><td><strong>Notas</strong></td><td>${p.notas || "Sin notas"}</td></tr>
      </tbody>
    </table>
    <p style="margin-top:8px"><strong>Citas:</strong> ${citas.length} · <strong>Evaluaciones:</strong> ${State.evaluaciones.filter(e => e.pacienteId === p.id).length} · <strong>Registros:</strong> ${State.registros.filter(r => r.pacienteId === p.id).length} · <strong>Documentos:</strong> ${documentos.length} · <strong>Facturas:</strong> ${State.facturas.filter(f => f.pacienteId === p.id).length} · <strong>Recetas:</strong> ${State.recetas.filter(r => r.pacienteId === p.id).length}</p>
  `;
}

function htmlActividadPrint(id) {
  return `
    <h4 style="margin-top:14px; color:#1b2a4a">Actividad del paciente</h4>
    <table>
      <thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Tipo</th></tr></thead>
      <tbody>
        ${actividadPaciente(id).map(it => `
          <tr>
            <td>${it.fechaTxt}</td>
            <td>${it.titulo}</td>
            <td>${it.detalle}</td>
            <td>${it.tipo}</td>
          </tr>
        `).join("") || `<tr><td colspan="4">Sin actividad registrada.</td></tr>`}
      </tbody>
    </table>
  `;
}

function pedirImpresionFicha(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  abrirSelectorImpresion([
    { etiqueta: `Ficha del paciente - ${p.nombre} (${p.codigo})`, marcado: true },
    { etiqueta: "Actividad del paciente (citas, evaluaciones, registros, documentos, facturas y recetas)" }
  ], marcados => imprimirFichaPaciente(id, marcados));
}

let pendienteBorrarPac = null;
let pendienteEliminarDef = null;
let pendienteReactivarPac = null;

function pedirBorrarPaciente(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  pendienteBorrarPac = id;
  const titulo = document.getElementById("confElimTitulo");
  if (titulo) titulo.textContent = "Eliminar paciente";
  const btn = document.getElementById("btnConfEliminar");
  if (btn) btn.textContent = "Eliminar paciente";
  const pass = document.getElementById("confPassword");
  if (pass) pass.value = "";
  const msg = document.getElementById("confElimMsg");
  if (msg) {
    msg.textContent = "";
    msg.className = "form-msg";
  }
  const texto = document.getElementById("confElimTexto");
  if (texto) texto.textContent = `Se eliminará a "${p.nombre}" (${p.codigo}) de la lista de pacientes. Sus registros se conservan en el historial clínico. Introduce tu contraseña de usuario para confirmar.`;
  abrirModal("modalConfirmarEliminacion");
  if (pass) setTimeout(() => pass.focus(), 50);
}

function confirmarBorrarPaciente() {
  if (pendienteBorrarPac === null) return;
  const id = pendienteBorrarPac;
  const p = State.pacientes.find(x => x.id === id);
  const pass = document.getElementById("confPassword");
  const passVal = pass ? pass.value : "";
  const user = State.users.find(u => u.id === (State.session && State.session.id));
  const msg = document.getElementById("confElimMsg");
  const ok = user && user.password === passVal;
  if (msg) {
    if (!ok) {
      msg.textContent = "Contraseña incorrecta. Introduce tu contraseña de usuario.";
      msg.className = "form-msg error";
      if (pass) { pass.value = ""; setTimeout(() => pass.focus(), 50); }
      return;
    }
    msg.textContent = "";
    msg.className = "form-msg";
  }
  if (!p) { pendienteBorrarPac = null; cerrarModales(); return; }
  p.eliminado = true;
  p.fechaEliminado = isoLocal(new Date());
  const hoy = isoLocal(new Date());
  State.citas = State.citas.filter(c => c.pacienteId !== id || c.fecha < hoy);
  saveKey("pacientes");
  saveKey("citas");
  pendienteBorrarPac = null;
  cerrarModales();
  renderPacientes(document.getElementById("buscarPaciente").value);
  renderCitas();
  renderDocumentos();
  renderFacturas();
  renderRecetas();
  renderRegistros();
  renderCitasAux();
  renderHome();
}

function pedirReactivarPaciente(id) {
  if (!esAdmin()) return;
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  pendienteReactivarPac = id;
  const titulo = document.getElementById("confElimTitulo");
  if (titulo) titulo.textContent = "Restablecer paciente";
  const btn = document.getElementById("btnConfEliminar");
  if (btn) btn.textContent = "Restablecer paciente";
  const pass = document.getElementById("confPassword");
  if (pass) pass.value = "";
  const msg = document.getElementById("confElimMsg");
  if (msg) {
    msg.textContent = "";
    msg.className = "form-msg";
  }
  const texto = document.getElementById("confElimTexto");
  if (texto) texto.textContent = `Se devolverá a "${p.nombre}" (${p.codigo}) a la lista de pacientes activos. Introduce tu contraseña de usuario para confirmar.`;
  abrirModal("modalConfirmarEliminacion");
  if (pass) setTimeout(() => pass.focus(), 50);
}

function confirmarReactivarPaciente() {
  if (pendienteReactivarPac === null) return;
  const id = pendienteReactivarPac;
  const p = State.pacientes.find(x => x.id === id);
  const pass = document.getElementById("confPassword");
  const passVal = pass ? pass.value : "";
  const user = State.users.find(u => u.id === (State.session && State.session.id));
  const msg = document.getElementById("confElimMsg");
  const ok = user && user.password === passVal;
  if (msg) {
    if (!ok) {
      msg.textContent = "Contraseña incorrecta. Introduce tu contraseña de usuario.";
      msg.className = "form-msg error";
      if (pass) { pass.value = ""; setTimeout(() => pass.focus(), 50); }
      return;
    }
    msg.textContent = "";
    msg.className = "form-msg";
  }
  if (!p) { pendienteReactivarPac = null; cerrarModales(); return; }
  p.eliminado = false;
  p.fechaReactivado = isoLocal(new Date());
  saveKey("pacientes");
  fillSelects();
  pendienteReactivarPac = null;
  cerrarModales();
  renderPacientes(document.getElementById("buscarPaciente").value);
  renderCitas();
  renderCitasSinConsulta();
  renderDocumentos();
  renderFacturas();
  renderRecetas();
  renderRegistros();
  renderHome();
}

function confirmarAccionPaciente() {
  if (pendienteBorrarPac !== null) return confirmarBorrarPaciente();
  if (pendienteReactivarPac !== null) return confirmarReactivarPaciente();
  if (pendienteEliminarDef !== null) return confirmarEliminacionDefinitiva();
}

function pedirEliminacionDefinitiva(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return;
  pendienteEliminarDef = id;
  const titulo = document.getElementById("confElimTitulo");
  if (titulo) titulo.textContent = "Eliminar definitivamente";
  const btn = document.getElementById("btnConfEliminar");
  if (btn) btn.textContent = "Eliminar definitivamente";
  const pass = document.getElementById("confPassword");
  if (pass) pass.value = "";
  const msg = document.getElementById("confElimMsg");
  if (msg) {
    msg.textContent = "";
    msg.className = "form-msg";
  }
  const texto = document.getElementById("confElimTexto");
  if (texto) texto.textContent = `Se eliminarán definitivamente las citas, citas sin consulta, registros, documentos, facturas y recetas de "${p.nombre}" (${p.codigo}). Esta acción no se puede deshacer.`;
  abrirModal("modalConfirmarEliminacion");
  if (pass) setTimeout(() => pass.focus(), 50);
}

function confirmarEliminacionDefinitiva() {
  if (pendienteEliminarDef === null) return;
  const id = pendienteEliminarDef;
  const p = State.pacientes.find(x => x.id === id);
  const pass = document.getElementById("confPassword");
  const passVal = pass ? pass.value : "";
  const user = State.users.find(u => u.id === (State.session && State.session.id));
  const msg = document.getElementById("confElimMsg");
  const ok = user && user.password === passVal;
  if (msg) {
    if (!ok) {
      msg.textContent = "Contraseña incorrecta. Introduce tu contraseña de usuario.";
      msg.className = "form-msg error";
      if (pass) { pass.value = ""; setTimeout(() => pass.focus(), 50); }
      return;
    }
    msg.textContent = "";
    msg.className = "form-msg";
  }
  State.pacientes = State.pacientes.filter(x => x.id !== id);
  State.citas = State.citas.filter(c => c.pacienteId !== id);
  State.registros = State.registros.filter(r => r.pacienteId !== id);
  State.documentos = State.documentos.filter(d => d.pacienteId !== id);
  State.facturas = State.facturas.filter(f => f.pacienteId !== id);
  State.citasSinConsulta = State.citasSinConsulta.filter(c => c.pacienteId !== id);
  State.recetas = State.recetas.filter(r => r.pacienteId !== id);
  ["pacientes", "citas", "registros", "documentos", "facturas", "citasSinConsulta", "recetas"].forEach(saveKey);
  pendienteEliminarDef = null;
  cerrarModales();
  renderPacientes(document.getElementById("buscarPaciente").value);
  renderCitas();
  renderCitasSinConsulta();
  renderDocumentos();
  renderFacturas();
  renderRecetas();
  renderRegistros();
  renderCitasAux();
  renderHome();
}

function fillSelects() {
  const opts = pacientesActivos()
    .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
    .join("");

  ["citaPaciente", "documentoPaciente", "facturaPaciente", "regEPaciente", "cscPaciente", "estudioPaciente"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.innerHTML = opts || `<option value="">Sin pacientes</option>`;
    }
  });

  ["listaPacientesBD", "listaPacientesRegBD"].forEach(id => {
    const dl = document.getElementById(id);
    if (dl) {
      dl.innerHTML = pacientesActivos()
        .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
        .join("");
    }
  });

  const recetaSel = document.getElementById("recetaPaciente");
  if (recetaSel) {
    recetaSel.innerHTML = pacientesActivos()
      .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre} · ${p.edad ? p.edad + " años" : "s/e"}</option>`)
      .join("") || `<option value="">Sin pacientes</option>`;
  }
  updateRecetaEdad();
}

function llenarSelectPacientes(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const opts = pacientesActivos()
    .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
    .join("");
  sel.innerHTML = opts || `<option value="">Sin pacientes</option>`;
}

function renderCitas() {
  const lista = document.getElementById("listaCitas");
  if (!lista) return;

  const data = State.citas
    .filter(c => !c.completada && !c.cancelada)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No hay citas pendientes registradas.</p>`;
    return;
  }

  lista.innerHTML = data.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    const fecha = new Date(c.fecha + "T" + (c.hora || "00:00"));
    const opciones = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const fechaTxt = isNaN(fecha) ? c.fecha : fecha.toLocaleDateString("es-ES", opciones);
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
          <span class="tag">${c.fecha} · ${fmtHora12(c.hora, c.amPm)}</span>
          <span class="tag">Turno ${c.turno || "-"}</span>
        </div>
        <div class="item-sub">${c.motivo || "Sin motivo"} · ${fechaTxt}</div>
        <div class="item-actions">
          <button class="btn-icon" data-completar-cita="${c.id}" title="Marcar como completada">
            <span class="material-symbols-outlined">check_circle</span>
          </button>
          <button class="btn-icon" data-cancelar-cita="${c.id}" title="Cancelar cita">
            <span class="material-symbols-outlined">event_busy</span>
          </button>
          ${pacienteEliminadoDe(c.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-cita="${c.id}" title="Eliminar cita">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-completar-cita]").forEach(b =>
    b.addEventListener("click", () => abrirModalCompletarCita(Number(b.dataset.completarCita)))
  );

  lista.querySelectorAll("[data-cancelar-cita]").forEach(b =>
    b.addEventListener("click", () => cancelarCita(Number(b.dataset.cancelarCita)))
  );

  lista.querySelectorAll("[data-borrar-cita]").forEach(b =>
    b.addEventListener("click", () => {
      State.citas = State.citas.filter(x => x.id !== Number(b.dataset.borrarCita));
      saveKey("citas");
      renderCitas();
      renderHome();
    })
  );
  renderCitasAux();
}

function cancelarCita(id) {
  const c = State.citas.find(x => x.id === id);
  if (!c) return;
  const p = State.pacientes.find(x => x.id === c.pacienteId);
  if (!confirm(`¿Cancelar la cita de "${p ? p.nombre : "paciente"}" del ${c.fecha} a las ${fmtHora12(c.hora, c.amPm)}?`)) return;
  c.cancelada = true;
  c.fechaCancelacion = isoLocal(new Date());
  saveKey("citas");
  renderCitas();
  renderCitasCanceladas();
  renderHome();
}

function renderCitasCanceladas() {
  const lista = document.getElementById("listaCitasCanceladas");
  if (!lista) return;
  const countEl = document.getElementById("countCitasCanceladas");

  const data = State.citas
    .filter(c => c.cancelada)
    .sort((a, b) => (b.fechaCancelacion || b.fecha || "").localeCompare(a.fechaCancelacion || a.fecha || ""));

  if (countEl) countEl.textContent = data.length;

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No hay citas canceladas.</p>`;
    return;
  }

  lista.innerHTML = data.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    const fechaCanc = fmtFechaES(c.fechaCancelacion || c.fecha);
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
          <span class="tag tag-cancel">Cancelada ${fechaCanc}</span>
          <span class="tag">${c.fecha} · ${fmtHora12(c.hora, c.amPm)}</span>
          <span class="tag">Turno ${c.turno || "-"}</span>
        </div>
        <div class="item-sub">${c.motivo || "Sin motivo"}</div>
        <div class="item-actions">
          <button class="btn-icon" data-reabrir-cita="${c.id}" title="Restaurar cita">
            <span class="material-symbols-outlined">refund</span>
          </button>
          <button class="btn-icon danger" data-borrar-cita-c="${c.id}" title="Eliminar cita">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-reabrir-cita]").forEach(b =>
    b.addEventListener("click", () => {
      const c = State.citas.find(x => x.id === Number(b.dataset.reabrirCita));
      if (!c) return;
      c.cancelada = false;
      delete c.fechaCancelacion;
      saveKey("citas");
      renderCitas();
      renderCitasCanceladas();
      renderHome();
    })
  );

  lista.querySelectorAll("[data-borrar-cita-c]").forEach(b =>
    b.addEventListener("click", () => {
      State.citas = State.citas.filter(x => x.id !== Number(b.dataset.borrarCitaC));
      saveKey("citas");
      renderCitas();
      renderCitasCanceladas();
      renderHome();
    })
  );
}
function renderCitasCompletadas() {
  const lista = document.getElementById("listaCitasCompletadas");
  if (!lista) return;
  const countEl = document.getElementById("countCitasCompletadas");

  const data = State.citas
    .filter(c => c.completada && activoConPaciente(c.pacienteId))
    .sort((a, b) => (b.fechaCompletada || b.fecha || "").localeCompare(a.fechaCompletada || a.fecha || ""));

  if (countEl) countEl.textContent = data.length;

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No hay citas completadas todavía.</p>`;
    return;
  }

  lista.innerHTML = data.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    const fechaComp = fmtFechaES(c.fechaCompletada || c.fecha);
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
          <span class="tag">Completada ${fechaComp}</span>
          <span class="tag">Turno ${c.turno || "-"}</span>
        </div>
        <div class="item-sub"><strong class="diag-label">Diagnóstico:</strong> ${c.diagnostico || "-"}</div>
        ${c.tratamiento ? `<div class="item-sub"><strong class="diag-label">Tratamiento:</strong> ${c.tratamiento}</div>` : ""}
        <div class="item-actions">
          <button class="btn-icon" data-reabrir-cita="${c.id}" title="Reabrir cita">
            <span class="material-symbols-outlined">undo</span>
          </button>
          ${pacienteEliminadoDe(c.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-completada="${c.id}" title="Eliminar cita completada">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-reabrir-cita]").forEach(b =>
    b.addEventListener("click", () => {
      const c = State.citas.find(x => x.id === Number(b.dataset.reabrirCita));
      if (!c) return;
      c.completada = false;
      delete c.diagnostico;
      delete c.tratamiento;
      delete c.fechaCompletada;
      saveKey("citas");
      renderCitas();
      renderCitasCompletadas();
      renderHome();
    })
  );

  lista.querySelectorAll("[data-borrar-completada]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar esta cita completada?")) return;
      State.citas = State.citas.filter(x => x.id !== Number(b.dataset.borrarCompletada));
      saveKey("citas");
      renderCitas();
      renderCitasCompletadas();
      renderHome();
    })
  );
}

function renderCitasSinConsulta() {
  const lista = document.getElementById("listaCitasSinConsulta");
  const countEl = document.getElementById("countCitasSinConsulta");
  if (!lista) return;

  const data = [...State.citasSinConsulta].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  if (countEl) countEl.textContent = data.length;

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No hay citas sin consulta. Usa el botón "Agregar" para registrar una.</p>`;
    return;
  }

  lista.innerHTML = data.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
          <span class="tag">${c.fecha} · ${fmtHora12(c.hora, c.amPm)}</span>
          <span class="tag">Turno ${c.turno || "-"}</span>
        </div>
        <div class="item-sub">${c.motivo || "Sin motivo"}</div>
        <div class="item-actions">
          ${pacienteEliminadoDe(c.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-csc="${c.id}" title="Eliminar cita sin consulta">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-borrar-csc]").forEach(b =>
    b.addEventListener("click", () => {
      State.citasSinConsulta = State.citasSinConsulta.filter(x => x.id !== Number(b.dataset.borrarCsc));
      saveKey("citasSinConsulta");
      renderCitasSinConsulta();
    })
  );
}

function abrirModalCitaSinConsulta() {
  fillSelects();
  const fecha = document.getElementById("cscFecha");
  if (fecha) fecha.valueAsDate = new Date();
  const hora = document.getElementById("cscHora");
  if (hora) hora.value = "09:00";
  const motivo = document.getElementById("cscMotivo");
  if (motivo) motivo.value = "";
  const sel = document.getElementById("cscPaciente");
  if (sel) sel.selectedIndex = 0;
  abrirModal("modalCitaSinConsulta");
}

let completandoCitaId = null;

function abrirModalCompletarCita(id) {
  const c = State.citas.find(x => x.id === id);
  if (!c) return;
  completandoCitaId = id;
  const p = State.pacientes.find(x => x.id === c.pacienteId);
  const t = document.getElementById("ccPacienteTexto");
  if (t) t.textContent = p ? `${p.nombre} · ${fmtFechaES(c.fecha)} · ${fmtHora12(c.hora, c.amPm)}` : "Paciente eliminado";
  const diag = document.getElementById("ccDiagnostico");
  const tra = document.getElementById("ccTratamiento");
  if (diag) diag.value = c.diagnostico || "";
  if (tra) tra.value = c.tratamiento || "";
  abrirModal("modalCompletarCita");
}

function guardarCitaCompletada(e) {
  e.preventDefault();
  if (!completandoCitaId) return;
  const c = State.citas.find(x => x.id === completandoCitaId);
  if (!c) return;
  c.completada = true;
  c.fechaCompletada = isoLocal(new Date());
  const diagEl = document.getElementById("ccDiagnostico");
  const tratEl = document.getElementById("ccTratamiento");
  c.diagnostico = diagEl ? diagEl.value.trim() : (c.diagnostico || "");
  c.tratamiento = tratEl ? tratEl.value.trim() : (c.tratamiento || "");
  saveKey("citas");
  const p = State.pacientes.find(x => x.id === c.pacienteId);
  mostrarNotificacion(`Cita de <b>${p ? p.nombre : "el paciente"}</b> completada correctamente`);
  completandoCitaId = null;
  cerrarModales();
  renderCitas();
  renderCitasCompletadas();
  renderHome();
}

function guardarCitaSinConsulta(e) {
  e.preventDefault();
  const pacienteId = Number(document.getElementById("cscPaciente").value);
  const fecha = document.getElementById("cscFecha").value;
  const hora = document.getElementById("cscHora").value;
  const amPm = document.getElementById("cscAmPm").value;
  const motivo = document.getElementById("cscMotivo").value.trim();
  if (!pacienteId || !fecha || !hora) return;
  const turno = State.citasSinConsulta.filter(c => c.fecha === fecha).length + 1;
  State.citasSinConsulta.push({ id: Date.now(), pacienteId, fecha, hora, amPm, motivo, turno });
  saveKey("citasSinConsulta");
  const pacCsc = State.pacientes.find(x => x.id === pacienteId);
  mostrarNotificacion(`Cita sin consulta para <b>${pacCsc ? pacCsc.nombre : "el paciente"}</b> agregada correctamente`);
  cerrarModales();
  renderCitasSinConsulta();
}

function renderRegistros(filtro = "") {
  const lista = document.getElementById("listaRegistros");
  if (!lista) return;

  const q = filtro.trim().toLowerCase();

  const items = [];
  State.registros.forEach(r => items.push({
    kind: "registro", id: r.id, fecha: r.fecha, pacienteId: r.pacienteId,
    titulo: r.titulo, detalle: r.detalle || "", tipo: r.tipo, archivo: r.archivo, eva: r.eva
  }));
  State.evaluaciones.forEach(e => items.push({
    kind: "eval", id: e.id, fecha: e.fecha || "", pacienteId: e.pacienteId, titulo: "Evaluación física"
  }));
  items.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));

  const filtrados = items.filter(it => {
    if (!q) return true;
    const p = State.pacientes.find(x => x.id === it.pacienteId);
    return (p && (p.nombre || "").toLowerCase().includes(q))
      || (p && (p.codigo || "").toLowerCase().includes(q))
      || (p && (p.cedula || "").toLowerCase().includes(q))
      || (it.titulo || "").toLowerCase().includes(q)
      || (it.tipo || "").toLowerCase().includes(q)
      || (it.detalle || "").toLowerCase().includes(q);
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `<p class="empty">No hay registros.</p>`;
    return;
  }

  lista.innerHTML = filtrados.map(r => {
    const p = State.pacientes.find(x => x.id === r.pacienteId);

    if (r.kind === "eval") {
      const ev = State.evaluaciones.find(e => e.id === r.id);
      const claves = Object.keys(ev && ev.lesiones ? ev.lesiones : {});
      const resumen = claves.slice(0, 4).map(k => NOMBRES_PARTES[k] || k).join(", ");
      const etiq = etiquetaPacienteHistorial(r.pacienteId);
      return `
      <div class="list-item hist-item">
        <img class="hist-avatar" src="${siluetaPerfilSexo((ev && ev.sexo) || (p && p.sexo))}" alt="Silueta del paciente" />
        <div class="hist-item-body">
        <div class="item-main">
          <strong>${r.titulo}</strong>
          <span class="tag">${r.fecha}</span>
          <span class="tag">${ev && ev.sexo ? (ev.sexo === "femenino" ? "Femenino" : "Masculino") : ""}</span>
        </div>
        <div class="item-sub">${etiq.nombre}${etiq.nota ? `<span class="tag tag-rest">${etiq.nota}</span>` : ""} - ${claves.length ? claves.length + " zona(s) marcada(s) · " + resumen + (claves.length > 4 ? "…" : "") : "Sin zonas marcadas"}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn--ghost-dark btn-small" data-ver-eval="${r.id}" title="Ver resultado de la evaluación">
            <span class="material-symbols-outlined">visibility</span> Ver resultado
          </button>
          ${pacienteEliminadoDe(r.pacienteId) && !etiquetaPacienteHistorial(r.pacienteId).nota ? "" : `<button class="btn-icon danger" data-borrar-eval="${r.id}" title="Eliminar evaluación">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
    }

    const prox = r.proximaCita;
    const proxTexto = prox && prox.fecha
      ? ` · Próxima cita: ${prox.fecha}${prox.hora ? " " + prox.hora : ""}${prox.amPm ? " " + prox.amPm : ""}`
      : "";
    const etiq = etiquetaPacienteHistorial(r.pacienteId);
    const esIngreso = r.tipo === "Registro de ingreso";
    return `
      <div class="list-item hist-item${esIngreso ? " hist-ingreso" : ""}">
        <img class="hist-avatar" src="${siluetaPerfilSexo(p && p.sexo)}" alt="Silueta del paciente" />
        <div class="hist-item-body">
        <div class="item-main">
          <strong>${r.titulo}</strong>
          <span class="tag">${r.fecha}</span>
          ${r.tipo ? `<span class="tag${esIngreso ? " tag-ingreso" : ""}">${r.tipo}</span>` : ""}
          ${r.eva != null && r.eva !== "" ? `<span class="tag">EVA ${r.eva}/10</span>` : ""}
          ${r.archivo ? `<span class="tag">📎 adjunto</span>` : ""}
        </div>
        <div class="item-sub">${etiq.nombre}${etiq.nota ? `<span class="tag tag-rest">${etiq.nota}</span>` : ""}${esIngreso ? `<span class="ingreso-titulo">Ficha completa del paciente (auto-generada al registrar)</span>` : ""}${r.detalle || ""}${proxTexto}</div>
        </div>
        <div class="item-actions">
          ${r.archivo ? `<button class="btn-icon" data-ver-archivo="${r.id}" title="Ver documento adjunto">
            <span class="material-symbols-outlined">download</span>
          </button>` : ""}
          <button class="btn-icon" data-editar-reg="${r.id}" title="Editar registro">
            <span class="material-symbols-outlined">edit</span>
          </button>
          ${pacienteEliminadoDe(r.pacienteId) && !etiquetaPacienteHistorial(r.pacienteId).nota ? "" : `<button class="btn-icon danger" data-borrar-reg="${r.id}" title="Eliminar registro">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-ver-archivo]").forEach(b =>
    b.addEventListener("click", () => {
      const r = State.registros.find(x => x.id === Number(b.dataset.verArchivo));
      if (r && r.archivo) {
        const a = document.createElement("a");
        a.href = r.archivo.dataUrl;
        a.download = r.archivo.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    })
  );
  lista.querySelectorAll("[data-ver-eval]").forEach(b =>
    b.addEventListener("click", () => verEvaluacion(Number(b.dataset.verEval)))
  );
  lista.querySelectorAll("[data-borrar-eval]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar esta evaluación física del historial clínico?")) return;
      State.evaluaciones = State.evaluaciones.filter(e => e.id !== Number(b.dataset.borrarEval));
      saveKey("evaluaciones");
      renderRegistros();
      renderEvaluacionesGuardadas();
    })
  );
  lista.querySelectorAll("[data-editar-reg]").forEach(b =>
    b.addEventListener("click", () => abrirModalEditarRegistro(Number(b.dataset.editarReg)))
  );
  lista.querySelectorAll("[data-borrar-reg]").forEach(b =>
    b.addEventListener("click", () => {
      State.registros = State.registros.filter(x => x.id !== Number(b.dataset.borrarReg));
      saveKey("registros");
      renderRegistros();
      renderHome();
    })
  );

  renderCitasAux();
}

function renderDocumentos() {
  const lista = document.getElementById("listaDocumentos");
  if (!lista) return;

  if (State.documentos.length === 0) {
    lista.innerHTML = `<p class="empty">No hay documentos subidos.</p>`;
    return;
  }

  lista.innerHTML = State.documentos.map(d => {
    const p = State.pacientes.find(x => x.id === d.pacienteId);
    const icono = d.type.startsWith("image/") ? "image" : "description";
    return `
      <div class="list-item">
        <div class="item-main">
          <span class="material-symbols-outlined doc-icon">${icono}</span>
          <strong>${d.descripcion || d.name}</strong>
        </div>
        <div class="item-sub">${p ? p.nombre : "Paciente eliminado"} · ${d.name}</div>
        <div class="item-actions">
          <button class="btn-icon" data-ver-doc="${d.id}" title="Ver archivo">
            <span class="material-symbols-outlined">download</span>
          </button>
          ${pacienteEliminadoDe(d.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-doc="${d.id}" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-ver-doc]").forEach(b =>
    b.addEventListener("click", () => {
      const d = State.documentos.find(x => x.id === Number(b.dataset.verDoc));
      if (d) verDocumento(d);
    })
  );
  lista.querySelectorAll("[data-borrar-doc]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar este documento?")) return;
      State.documentos = State.documentos.filter(x => x.id !== Number(b.dataset.borrarDoc));
      saveKey("documentos");
      renderDocumentos();
      renderHome();
    })
  );
}

function verDocumento(d) {
  const a = document.createElement("a");
  a.href = d.dataUrl;
  a.download = d.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function renderEstudios() {
  const cont = document.getElementById("listaEstudios");
  if (!cont) return;

  const countEl = document.getElementById("countEstudios");
  if (countEl) countEl.textContent = State.estudios.length;

  const data = [...State.estudios].sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || "") || b.id - a.id);
  if (data.length === 0) {
    cont.innerHTML = `<p class="empty">No hay imágenes ni estudios subidos. Sube placas, radiografías, resonancias y demás archivos de imagen.</p>`;
    return;
  }

  cont.innerHTML = data.map(es => {
    const p = State.pacientes.find(x => x.id === es.pacienteId);
    return `
      <div class="estudio-card">
        <img class="estudio-thumb" src="${es.dataUrl}" alt="${es.tipo || "Estudio"}" data-ver-estudio="${es.id}" loading="lazy" />
        <div class="estudio-info">
          <strong>${es.tipo || "Estudio médico"}</strong>
          <span>${fmtFechaES(es.fecha)} · ${p ? p.nombre : "Paciente eliminado"}</span>
          ${es.descripcion ? `<span class="estudio-desc">${es.descripcion}</span>` : ""}
        </div>
        <div class="item-actions">
          <button class="btn-icon" data-ver-estudio="${es.id}" title="Ver imagen">
            <span class="material-symbols-outlined">fullscreen</span>
          </button>
          <button class="btn-icon" data-imprimir-estudio="${es.id}" title="Imprimir estudio">
            <span class="material-symbols-outlined">print</span>
          </button>
          ${pacienteEliminadoDe(es.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-estudio="${es.id}" title="Eliminar estudio">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  cont.querySelectorAll("[data-ver-estudio]").forEach(b =>
    b.addEventListener("click", () => verEstudio(Number(b.dataset.verEstudio)))
  );
  cont.querySelectorAll("[data-imprimir-estudio]").forEach(b =>
    b.addEventListener("click", () => pedirImpresionEstudio(Number(b.dataset.imprimirEstudio)))
  );
  cont.querySelectorAll("[data-borrar-estudio]").forEach(b =>
    b.addEventListener("click", () => {
      const es = State.estudios.find(x => x.id === Number(b.dataset.borrarEstudio));
      if (!confirm(`¿Eliminar ${es && es.tipo ? "el estudio «" + es.tipo + "»" : "este estudio"}?`)) return;
      State.estudios = State.estudios.filter(x => x.id !== Number(b.dataset.borrarEstudio));
      saveKey("estudios");
      renderEstudios();
      renderHome();
    })
  );
}

function verEstudio(id) {
  const es = State.estudios.find(x => x.id === id);
  if (!es) return;
  const p = State.pacientes.find(x => x.id === es.pacienteId);
  document.getElementById("estudioViewTitulo").textContent = es.tipo || "Estudio médico";
  document.getElementById("estudioViewMeta").textContent =
    `${fmtFechaES(es.fecha)} · ${p ? p.nombre : "Paciente eliminado"}${es.descripcion ? " · " + es.descripcion : ""}`;
  const img = document.getElementById("estudioViewImg");
  img.src = es.dataUrl;
  img.alt = es.tipo || "Estudio médico";
  btnImprimirEstudioViewId = id;
  abrirModal("modalVerEstudio");
}

let btnImprimirEstudioViewId = null;

function imprimirEstudios(indices) {
  const data = [...State.estudios].sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || "") || b.id - a.id);
  if (data.length === 0) {
    alert("No hay estudios para imprimir.");
    return;
  }
  const seleccion = indices == null ? data.map((_, i) => i) : indices;
  const items = seleccion.map(i => {
    const es = data[i];
    if (!es) return "";
    const p = State.pacientes.find(x => x.id === es.pacienteId);
    return `
      <div class="print-item">
        <h3>${es.tipo || "Estudio médico"} - ${p ? p.nombre : "Paciente eliminado"}</h3>
        <span class="print-fecha">${fmtFechaES(es.fecha)}${es.descripcion ? " · " + es.descripcion : ""}</span>
        <img src="${es.dataUrl}" alt="${es.tipo || "Estudio"}" style="max-width:100%; margin-top:8px;" />
      </div>
    `;
  }).filter(Boolean).join("");

  abrirImpresion("Estudios e imágenes médicas", items);
}

function pedirImpresionEstudios() {
  const data = [...State.estudios].sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || "") || b.id - a.id);
  if (data.length === 0) {
    alert("No hay estudios para imprimir.");
    return;
  }
  abrirSelectorImpresion(
    data.map(es => {
      const p = State.pacientes.find(x => x.id === es.pacienteId);
      return { etiqueta: `${fmtFechaES(es.fecha)} · ${es.tipo || "Estudio"} - ${p ? p.nombre : "Paciente eliminado"}${es.descripcion ? " · " + es.descripcion : ""}` };
    }),
    indices => imprimirEstudios(indices)
  );
}

function pedirImpresionEstudio(id) {
  const es = State.estudios.find(x => x.id === id);
  if (!es) return;
  const data = [...State.estudios].sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || "") || b.id - a.id);
  const idx = data.findIndex(x => x.id === id);
  abrirSelectorImpresion(
    [{ etiqueta: `Imagen: ${es.tipo || "Estudio"} - ${fmtFechaES(es.fecha)}`, marcado: true }],
    () => imprimirEstudios(idx >= 0 ? [idx] : [State.estudios.indexOf(es)])
  );
}

let imgIndice = -1;
let imgFiltros = { brillo: 1, contraste: 1, nitidez: 0, zoom: 1, rotacion: 0, invertido: false, verOriginal: false, flipH: false, panX: 0, panY: 0 };

const imgNOMBRE_HERRAMIENTA = { mover: "Mover", zoom: "Zoom", wl: "Ventana y nivel", regla: "Regla", angulo: "Ángulo", eje: "Eje mecánico", anotar: "Anotar" };
const COLOR_EJE = "#2ecc71";
const COLOR_DIST = "#ffb000";
const COLOR_ANGULO = "#3aa0ff";
const COLOR_ANOT = "#ffd166";
const imgCanvasMeta = { baseImg: null, img: null, w0: 1, h0: 1, fit: 1, M: null, slotW: 1, slotH: 1 };
const imgNitidezCache = {};
let imgMedidasPorEstudio = {};
let imgMedidas = [];
let imgDraft = null;
let imgHerramienta = "mover";
let imgArrastre = null;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function listaImagenesVisor() {
  const sel = document.getElementById("imgPaciente");
  const pid = sel && sel.value ? Number(sel.value) : null;
  let data = [...State.estudios];
  if (pid) data = data.filter(e => e.pacienteId === pid);
  return data.sort((a, b) => (fechaESaISO(b.fecha) || "").localeCompare(fechaESaISO(a.fecha) || "") || b.id - a.id);
}

function imgMatriz() {
  const { w0, h0, fit, slotW, slotH } = imgCanvasMeta;
  const z = imgFiltros.zoom, r = imgFiltros.rotacion, fx = imgFiltros.flipH ? -1 : 1;
  const M = new DOMMatrix()
    .translate(slotW / 2 + imgFiltros.panX, slotH / 2 + imgFiltros.panY)
    .rotate(r)
    .scale(fx * z, z)
    .scale(fit, fit)
    .translate(-w0 / 2, -h0 / 2);
  imgCanvasMeta.M = M;
  return M;
}
function imgUtf(x, y) {
  const p = imgCanvasMeta.M.transformPoint({ x, y });
  return [p.x, p.y];
}
function imgStf(x, y) {
  const p = imgCanvasMeta.M.inverse().transformPoint({ x, y });
  return [p.x, p.y];
}

function pintarVisorImagen() {
  const cv = document.getElementById("imgMainCanvas");
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const W = Math.max(1, rect.width), H = Math.max(1, rect.height);
  imgCanvasMeta.slotW = W;
  imgCanvasMeta.slotH = H;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  const st = cv.getContext("2d");
  st.setTransform(dpr, 0, 0, dpr, 0, 0);
  st.clearRect(0, 0, W, H);
  if (!imgCanvasMeta.img || !imgCanvasMeta.baseImg) return;
  const M = imgMatriz();
  st.save();
  st.transform(M.a, M.b, M.c, M.d, M.e, M.f);
  const { w0, h0 } = imgCanvasMeta;
  if (imgFiltros.verOriginal) {
    st.drawImage(imgCanvasMeta.img, 0, 0, w0, h0);
  } else {
    st.filter = `brightness(${imgFiltros.brillo}) contrast(${imgFiltros.contraste})${imgFiltros.invertido ? " invert(1)" : ""}`;
    st.drawImage(imgCanvasMeta.img, 0, 0, w0, h0);
    st.filter = "none";
  }
  st.restore();
  st.setTransform(dpr, 0, 0, dpr, 0, 0);
  dibujarMedidas(st);
  if (imgArrastre && imgArrastre.tipo === "zoom" && imgArrastre.rect) {
    const [x0, y0, x1, y1] = imgArrastre.rect;
    st.strokeStyle = "rgba(255,255,255,0.9)";
    st.lineWidth = 1.5;
    st.setLineDash([6, 4]);
    st.strokeRect(x0, y0, x1 - x0, y1 - y0);
    st.setLineDash([]);
  }
}

function proyectarPts(pts) {
  return (pts || []).map(([x, y]) => imgUtf(x, y));
}

function dibujarMedidas(st) {
  const dpr = window.devicePixelRatio || 1;
  st.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!imgCanvasMeta.M) return;
  imgMedidas.forEach(m => dibujarMedida(st, m, null));
  if (imgDraft && imgDraft.pts.length) dibujarMedida(st, imgDraft, imgDraft.pend || null);
}

function textoSombra(st, txt, x, y) {
  st.save();
  st.font = "600 12px system-ui, sans-serif";
  st.shadowColor = "rgba(0,0,0,0.85)";
  st.shadowBlur = 4;
  st.fillStyle = "#ffffff";
  st.fillText(txt, x, y);
  st.restore();
}

function dibujarMedida(st, m, pend) {
  const pts = proyectarPts(m.pts);
  const pen = pend ? imgUtf(pend[0], pend[1]) : null;
  const color = m.color;
  st.lineWidth = 2;
  st.strokeStyle = color;
  st.fillStyle = color;
  if (m.tipo === "regla" || m.tipo === "eje") {
    const a = pts[0];
    const b = pts[1] || pen;
    if (a && b) {
      if (m.tipo === "eje") st.setLineDash([10, 6]);
      st.beginPath();
      st.moveTo(a[0], a[1]);
      st.lineTo(b[0], b[1]);
      st.stroke();
      st.setLineDash([]);
      const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
      if (m.tipo === "regla" && m.pts.length >= 2) {
        const dist = Math.round(Math.hypot(m.pts[0][0] - m.pts[1][0], m.pts[0][1] - m.pts[1][1]));
        textoSombra(st, `${dist} px`, cx + 6, cy - 6);
      }
      if (m.tipo === "eje" && m.pts.length >= 2) textoSombra(st, "Eje mecánico", cx + 6, cy - 6);
    }
  } else if (m.tipo === "angulo") {
    const V = pts[0];
    const A = pts[1] || pen;
    const B = pts[2] || pen;
    if (V && A && B) {
      st.beginPath();
      st.moveTo(V[0], V[1]);
      st.lineTo(A[0], A[1]);
      st.moveTo(V[0], V[1]);
      st.lineTo(B[0], B[1]);
      st.stroke();
      const vA = Math.atan2(A[1] - V[1], A[0] - V[0]);
      const vB = Math.atan2(B[1] - V[1], B[0] - V[0]);
      const rad = Math.min(32, Math.hypot(A[0] - V[0], A[1] - V[1]) / 3);
      st.beginPath();
      st.arc(V[0], V[1], Math.max(12, rad), vA, vB, false);
      st.stroke();
      if (m.pts.length >= 3) {
        const ang = Math.round(anguloEntrePuntos(m.pts[0], m.pts[1], m.pts[2]));
        const vm = (vA + vB) / 2;
        textoSombra(st, `${ang}°`, V[0] + Math.cos(vm) * (rad + 14), V[1] + Math.sin(vm) * (rad + 14));
      }
    }
  } else if (m.tipo === "anotar") {
    if (pts[0]) {
      st.beginPath();
      st.arc(pts[0][0], pts[0][1], 3.5, 0, Math.PI * 2);
      st.fill();
      textoSombra(st, m.texto || "Nota", pts[0][0] + 8, pts[0][1] - 6);
    }
  }
}

function anguloEntrePuntos(V, A, B) {
  const v1 = Math.atan2(A[1] - V[1], A[0] - V[0]);
  const v2 = Math.atan2(B[1] - V[1], B[0] - V[0]);
  let d = Math.abs(v2 - v1);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return (d * 180) / Math.PI;
}

function imgSharpenDataURL(img, k) {
  const maxDim = 1600;
  const s = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const cw = Math.max(1, Math.round(img.naturalWidth * s));
  const ch = Math.max(1, Math.round(img.naturalHeight * s));
  const cv = document.createElement("canvas");
  cv.width = cw;
  cv.height = ch;
  const st = cv.getContext("2d", { willReadFrequently: true });
  st.drawImage(img, 0, 0, cw, ch);
  const idt = st.getImageData(0, 0, cw, ch);
  const d = idt.data;
  const out = new Uint8ClampedArray(d);
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const i = (y * cw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val =
          d[((y - 1) * cw + x) * 4 + c] * -k +
          d[((y + 1) * cw + x) * 4 + c] * -k +
          d[(y * cw + x - 1) * 4 + c] * -k +
          d[(y * cw + x + 1) * 4 + c] * -k +
          d[i + c] * (1 + 4 * k);
        out[i + c] = val;
      }
    }
  }
  idt.data.set(out);
  st.putImageData(idt, 0, 0);
  return cv.toDataURL("image/jpeg", 0.92);
}

function aplicarNitidez() {
  const data = listaImagenesVisor();
  const es = data[imgIndice];
  if (!es) return;
  const k = imgFiltros.nitidez / 100;
  const base = imgCanvasMeta.baseImg;
  if (!base || !base.naturalWidth) return;
  if (k <= 0) {
    imgCanvasMeta.img = base;
    imgNitidezCache[`${es.id}:0`] = base;
    pintarVisorImagen();
    return;
  }
  const key = `${es.id}:${Math.round(k * 100)}`;
  if (imgNitidezCache[key]) {
    imgCanvasMeta.img = imgNitidezCache[key];
    pintarVisorImagen();
    return;
  }
  const sharp = new Image();
  sharp.onload = () => {
    imgNitidezCache[key] = sharp;
    imgCanvasMeta.img = sharp;
    pintarVisorImagen();
  };
  sharp.src = imgSharpenDataURL(base, k);
}

function aplicarFiltrosImagen() {
  pintarVisorImagen();
}

function actualizarSlidersImagen() {
  const br = document.getElementById("imgBrilloRange");
  if (br) br.value = imgFiltros.brillo * 100;
  const ct = document.getElementById("imgContrasteRange");
  if (ct) ct.value = imgFiltros.contraste * 100;
  const ni = document.getElementById("imgNitidezRange");
  if (ni) ni.value = imgFiltros.nitidez;
  const zm = document.getElementById("imgZoomRange");
  if (zm) zm.value = imgFiltros.zoom * 100;
  const btnBefore = document.querySelector(".btn-film-nav[data-nav='before']");
  const btnAfter = document.querySelector(".btn-film-nav[data-nav='after']");
  if (btnBefore) btnBefore.classList.toggle("active", imgFiltros.verOriginal);
  if (btnAfter) btnAfter.classList.toggle("active", !imgFiltros.verOriginal);
}

function renderListaMedidas() {
  const el = document.getElementById("imgMeasureList");
  if (!el) return;
  if (!imgMedidas.length) {
    el.innerHTML = `<p class="img-ml-vacio">Sin mediciones.</p>`;
    return;
  }
  el.innerHTML = imgMedidas.map((m, i) => `
    <div class="img-ml-item">
      <span class="img-ml-chip" style="background:${m.color}"></span>
      <span class="img-ml-label">${m.label}</span>
      <button type="button" class="img-btn img-btn--mini img-ml-del" data-del="${i}" title="Eliminar medición">&times;</button>
    </div>`).join("");
  el.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
    imgMedidas.splice(Number(b.dataset.del), 1);
    imgMedidasPorEstudio[listaImagenesVisor()[imgIndice]?.id || "x"] = imgMedidas;
    renderListaMedidas();
    pintarVisorImagen();
  }));
}

function seleccionarHerramientaImg(tool) {
  imgHerramienta = tool;
  imgDraft = null;
  document.querySelectorAll(".img-tool[data-tool]").forEach(b => {
    b.classList.toggle("activo", b.dataset.tool === tool);
  });
  const cv = document.getElementById("imgMainCanvas");
  if (cv) cv.style.cursor = tool === "mover" ? "grab" : tool === "anotar" ? "text" : "crosshair";
  const stH = document.getElementById("stHerramienta");
  if (stH) stH.textContent = "Herramienta: " + (imgNOMBRE_HERRAMIENTA[tool] || tool);
}

function cargarImagenEnLienzo(es) {
  const slot = document.getElementById("imgSlot");
  const cv = document.createElement("canvas");
  cv.id = "imgMainCanvas";
  cv.classList.add("img-main-canvas");
  slot.innerHTML = "";
  slot.appendChild(cv);
  const im = new Image();
  im.onload = () => {
    imgCanvasMeta.baseImg = im;
    imgCanvasMeta.img = im;
    imgCanvasMeta.w0 = im.naturalWidth;
    imgCanvasMeta.h0 = im.naturalHeight;
    imgMedidas = imgMedidasPorEstudio[es.id] || [];
    renderListaMedidas();
    if (imgFiltros.nitidez > 0) aplicarNitidez(); else pintarVisorImagen();
  };
  im.src = es.dataUrl;
}

function renderVisorImagenes() {
  const slot = document.getElementById("imgSlot");
  const film = document.getElementById("imgFilm");
  const info = document.getElementById("imgViewerInfo");
  if (!slot) return;

  const data = listaImagenesVisor();

  const vacio = `
    <div class="img-empty">
      <span class="material-symbols-outlined img-empty-icon">radiology</span>
      <strong>Todavía no hay imágenes subidas</strong>
      <p>Sube placas, radiografías o estudios en la sección «Imágenes y Estudios».</p>
      <div class="img-empty-slots">
        <div class="img-empty-slot"><span class="material-symbols-outlined">broken_image</span><small>Aún no hay archivo subido</small></div>
        <div class="img-empty-slot"><span class="material-symbols-outlined">broken_image</span><small>Aún no hay archivo subido</small></div>
        <div class="img-empty-slot"><span class="material-symbols-outlined">broken_image</span><small>Aún no hay archivo subido</small></div>
      </div>
    </div>`;

  const stH = document.getElementById("stHerramienta");
  const stF = document.getElementById("stFormato");
  const stR = document.getElementById("stResolucion");
  const stN = document.getElementById("stNumero");
  const ptName = document.getElementById("imgPtName");
  const ptStudy = document.getElementById("imgPtStudy");

  if (data.length === 0) {
    slot.innerHTML = vacio;
    if (film) film.innerHTML = "";
    if (info) info.textContent = "Sin imágenes para este paciente";
    if (stH) stH.textContent = "Herramienta: -";
    if (stF) stF.textContent = "Formato: -";
    if (stR) stR.textContent = "Resolución: -";
    if (stN) stN.textContent = "Imagen: - / -";
    if (ptName) ptName.textContent = "Paciente -";
    if (ptStudy) ptStudy.textContent = "Estudio -";
    imgMedidas = [];
    imgDraft = null;
    renderListaMedidas();
    return;
  }

  if (imgIndice < 0 || imgIndice >= data.length) imgIndice = 0;
  const es = data[imgIndice];
  const p = State.pacientes.find(x => x.id === es.pacienteId);

  imgFiltros.brillo = 1;
  imgFiltros.contraste = 1;
  imgFiltros.zoom = 1;
  imgFiltros.rotacion = 0;
  imgFiltros.invertido = false;
  imgFiltros.flipH = false;
  imgFiltros.panX = 0;
  imgFiltros.panY = 0;
  imgFiltros.verOriginal = false;
  imgDraft = null;
  imgArrastre = null;
  imgCanvasMeta.baseImg = null;
  imgCanvasMeta.img = null;

  const viewer = document.getElementById("imgViewer");
  if (viewer) viewer.classList.remove("lampara");
  const btnLuz = document.getElementById("btnImgLuz");
  if (btnLuz) btnLuz.classList.remove("activo");

  cargarImagenEnLienzo(es);
  actualizarSlidersImagen();

  if (info) {
    info.textContent = `${imgIndice + 1} / ${data.length} · ${es.tipo || "Estudio"} - ${p ? p.nombre : "Paciente eliminado"}${es.descripcion && es.descripcion !== es.name ? " · " + es.descripcion : ""} · ${fmtFechaES(es.fecha)}`;
  }

  if (ptName) ptName.textContent = p ? `${p.codigo} - ${p.nombre}` : "Paciente eliminado";
  if (ptStudy) ptStudy.textContent = `${es.tipo || "Estudio"}${es.descripcion && es.descripcion !== es.name ? " · " + es.descripcion : ""} · ${fmtFechaES(es.fecha)}`;
  if (stF) stF.textContent = "Formato: " + (es.tipo || "Imagen");
  if (stR) stR.textContent = "Resolución: " + (es.resolucion ? es.resolucion : "-");
  if (stN) stN.textContent = `Imagen: ${imgIndice + 1} / ${data.length}`;
  if (stH) stH.textContent = "Herramienta: " + (imgNOMBRE_HERRAMIENTA[imgHerramienta] || imgHerramienta);

  if (film) {
    film.innerHTML = data.map((im, i) => `
      <button type="button" class="img-film-item ${i === imgIndice ? "active" : ""}" data-film-index="${i}" title="${(im.tipo || "Imagen")}${im.descripcion ? " · " + im.descripcion : ""}">
        <img src="${im.dataUrl}" alt="" draggable="false" />
      </button>`).join("");
    film.querySelectorAll("[data-film-index]").forEach(b =>
      b.addEventListener("click", () => {
        imgIndice = Number(b.dataset.filmIndex);
        renderVisorImagenes();
      })
    );
  }

  registrarLienzoInteracciones();
}

function registrarLienzoInteracciones() {
  const cv = document.getElementById("imgMainCanvas");
  if (!cv) return;
  const datos = imgCanvasMeta;

  cv.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    imgFiltros.zoom = clamp(imgFiltros.zoom * factor, 0.4, 4);
    pintarVisorImagen();
    actualizarSlidersImagen();
  }, { passive: false });

  cv.addEventListener("pointerdown", (e) => {
    if (!datos.baseImg) return;
    cv.setPointerCapture(e.pointerId);
    const sx = e.offsetX, sy = e.offsetY;
    const [ix, iy] = imgStf(sx, sy);
    if (imgHerramienta === "mover") {
      imgArrastre = { tipo: "mover", sx, sy, panX0: imgFiltros.panX, panY0: imgFiltros.panY };
    } else if (imgHerramienta === "wl") {
      imgArrastre = { tipo: "wl", sx, sy, b0: imgFiltros.brillo, c0: imgFiltros.contraste };
    } else if (imgHerramienta === "zoom") {
      imgArrastre = { tipo: "zoom", sx, sy };
    } else if (imgHerramienta === "regla" || imgHerramienta === "eje") {
      if (!imgDraft) imgDraft = { tipo: imgHerramienta, pts: [], pend: null, color: imgHerramienta === "eje" ? COLOR_EJE : COLOR_DIST };
      imgDraft.pts.push([ix, iy]);
      if (imgDraft.pts.length >= 2) {
        finalizarMedicion();
        imgDraft = null;
      }
      pintarVisorImagen();
    } else if (imgHerramienta === "angulo") {
      if (!imgDraft) imgDraft = { tipo: "angulo", pts: [], pend: null, color: COLOR_ANGULO };
      imgDraft.pts.push([ix, iy]);
      if (imgDraft.pts.length >= 3) {
        finalizarMedicion();
        imgDraft = null;
      }
      pintarVisorImagen();
    } else if (imgHerramienta === "anotar") {
      const texto = prompt("Texto de la anotación:", "");
      if (texto == null) return;
      const etiqueta = texto.trim() || "Nota";
      imgMedidas.push({ tipo: "anotar", pts: [[ix, iy]], color: COLOR_ANOT, texto: etiqueta, label: "Nota: " + (etiqueta.length > 28 ? etiqueta.slice(0, 28) + "…" : etiqueta) });
      guardarMedidasActuales();
      renderListaMedidas();
      pintarVisorImagen();
    }
  });

  cv.addEventListener("pointermove", (e) => {
    if (!imgArrastre) {
      if (imgDraft && ["regla", "eje", "angulo"].includes(imgDraft.tipo)) {
        imgDraft.pend = imgStf(e.offsetX, e.offsetY);
        pintarVisorImagen();
      }
      return;
    }
    const sx = e.offsetX, sy = e.offsetY;
    if (imgArrastre.tipo === "mover") {
      imgFiltros.panX = imgArrastre.panX0 + (sx - imgArrastre.sx);
      imgFiltros.panY = imgArrastre.panY0 + (sy - imgArrastre.sy);
      pintarVisorImagen();
    } else if (imgArrastre.tipo === "wl") {
      imgFiltros.contraste = clamp(imgArrastre.c0 * (1 + (sx - imgArrastre.sx) * 0.005), 0.25, 2);
      imgFiltros.brillo = clamp(imgArrastre.b0 - (sy - imgArrastre.sy) * 0.005, 0.25, 2.6);
      actualizarSlidersImagen();
      pintarVisorImagen();
    } else if (imgArrastre.tipo === "zoom") {
      imgArrastre.rect = [imgArrastre.sx, imgArrastre.sy, sx, sy];
      pintarVisorImagen();
    }
  });

  const finArrastre = (e) => {
    if (!imgArrastre) return;
    if (imgArrastre.tipo === "zoom" && imgArrastre.rect) {
      const [x0, y0, x1, y1] = imgArrastre.rect;
      const rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
      if (rw > 24 && rh > 24 && datos.M) {
        const c = Math.min(datos.slotW, datos.slotH);
        const maxR = Math.min(rw, rh);
        const factor = clamp(c / maxR, 0.5, 4);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const [iCx, iCy] = imgStf(cx, cy);
        imgFiltros.zoom = clamp(imgFiltros.zoom * factor, 0.4, 4);
        imgFiltros.panX = 0;
        imgFiltros.panY = 0;
        imgMatriz();
        const [nCx, nCy] = imgUtf(iCx, iCy);
        imgFiltros.panX = datos.slotW / 2 - nCx;
        imgFiltros.panY = datos.slotH / 2 - nCy;
        actualizarSlidersImagen();
      }
    }
    imgArrastre = null;
    pintarVisorImagen();
  };
  cv.addEventListener("pointerup", finArrastre);
  cv.addEventListener("pointercancel", finArrastre);
}

function finalizarMedicion() {
  if (!imgDraft) return;
  const d = imgDraft;
  let label;
  if (d.tipo === "regla") {
    const dist = Math.round(Math.hypot(d.pts[0][0] - d.pts[1][0], d.pts[0][1] - d.pts[1][1]));
    label = `Distancia ${dist} px`;
  } else if (d.tipo === "eje") {
    label = "Eje mecánico";
  } else {
    const ang = Math.round(anguloEntrePuntos(d.pts[0], d.pts[1], d.pts[2]));
    label = `Ángulo ${ang}°`;
  }
  imgMedidas.push({ tipo: d.tipo, pts: d.pts.slice(), color: d.color, label });
  guardarMedidasActuales();
  renderListaMedidas();
  pintarVisorImagen();
}

function guardarMedidasActuales() {
  const data = listaImagenesVisor();
  const es = data[imgIndice];
  if (es) imgMedidasPorEstudio[es.id] = imgMedidas;
}

function registrarAccionesImagenes() {
  const sel = document.getElementById("imgPaciente");
  if (sel) {
    sel.innerHTML = `<option value="">Todos los pacientes</option>` +
      pacientesActivos().map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`).join("") ||
      `<option value="">Sin pacientes</option>`;
    sel.addEventListener("change", () => { imgIndice = -1; renderVisorImagenes(); });
  }

  document.querySelectorAll(".img-tool[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => seleccionarHerramientaImg(btn.dataset.tool));
  });
  document.querySelectorAll(".img-tool[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const acc = btn.dataset.action;
      if (acc === "rotar") imgFiltros.rotacion = (imgFiltros.rotacion + 90) % 360;
      else if (acc === "voltear") imgFiltros.flipH = !imgFiltros.flipH;
      else if (acc === "invertir") imgFiltros.invertido = !imgFiltros.invertido;
      pintarVisorImagen();
      btn.classList.add("flash");
      setTimeout(() => btn.classList.remove("flash"), 240);
    });
  });

  const btnLuz = document.getElementById("btnImgLuz");
  if (btnLuz) btnLuz.addEventListener("click", () => {
    const viewer = document.getElementById("imgViewer");
    const activo = !btnLuz.classList.contains("activo");
    btnLuz.classList.toggle("activo", activo);
    if (viewer) viewer.classList.toggle("lampara", activo);
  });

  const btnFull = document.getElementById("btnImgFull");
  if (btnFull) btnFull.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const app = document.getElementById("imgApp");
    if (app && app.requestFullscreen) app.requestFullscreen().catch(() => {});
  });

  const btnExport = document.getElementById("btnImgExport");
  if (btnExport) btnExport.addEventListener("click", () => {
    const data = listaImagenesVisor();
    const es = data[imgIndice];
    if (es) pedirImpresionEstudio(es.id);
  });

  const btnEliminar = document.getElementById("btnImgEliminar");
  if (btnEliminar) btnEliminar.addEventListener("click", () => {
    const data = listaImagenesVisor();
    const es = data[imgIndice];
    if (!es) return;
    if (!confirm(`¿Eliminar esta ${es.tipo || "imagen"}?`)) return;
    State.estudios = State.estudios.filter(x => x.id !== es.id);
    saveKey("estudios");
    delete imgNitidezCache[es.id + ":0"];
    imgMedidasPorEstudio[es.id] = [];
    imgIndice = Math.min(imgIndice, data.length - 2);
    renderVisorImagenes();
    renderEstudios();
    renderHome();
  });

  [["imgBrilloRange", "brillo", (v) => v / 100], ["imgContrasteRange", "contraste", (v) => v / 100], ["imgZoomRange", "zoom", (v) => v / 100]].forEach(([id, key, conv]) => {
    const sl = document.getElementById(id);
    if (sl) sl.addEventListener("input", () => {
      imgFiltros[key] = conv(Number(sl.value));
      pintarVisorImagen();
    });
  });

  const slNitidez = document.getElementById("imgNitidezRange");
  let nitidezT = 0;
  if (slNitidez) slNitidez.addEventListener("input", () => {
    imgFiltros.nitidez = Number(slNitidez.value);
    clearTimeout(nitidezT);
    nitidezT = setTimeout(aplicarNitidez, 120);
  });

  const btnResetTodo = document.getElementById("btnImgResetTodo");
  if (btnResetTodo) btnResetTodo.addEventListener("click", () => {
    imgFiltros.brillo = 1;
    imgFiltros.contraste = 1;
    imgFiltros.nitidez = 0;
    imgFiltros.zoom = 1;
    imgFiltros.rotacion = 0;
    imgFiltros.invertido = false;
    imgFiltros.flipH = false;
    imgFiltros.panX = 0;
    imgFiltros.panY = 0;
    imgFiltros.verOriginal = false;
    const sln = document.getElementById("imgNitidezRange");
    if (sln) sln.value = 0;
    aplicarNitidez();
    actualizarSlidersImagen();
    pintarVisorImagen();
  });

  const btnLimpiar = document.getElementById("btnImgLimpiarMedidas");
  if (btnLimpiar) btnLimpiar.addEventListener("click", () => {
    imgMedidas = [];
    guardarMedidasActuales();
    renderListaMedidas();
    pintarVisorImagen();
  });

  document.querySelectorAll(".btn-film-nav").forEach(btn => {
    btn.addEventListener("click", () => {
      imgFiltros.verOriginal = btn.dataset.nav === "before";
      pintarVisorImagen();
      actualizarSlidersImagen();
    });
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && (e.target.tagName || "")) || "";
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); imgAnterior(); }
    if (e.key === "ArrowRight") { e.preventDefault(); imgSiguiente(); }
    if (e.key === "r" || e.key === "R") {
      imgFiltros.rotacion = (imgFiltros.rotacion + 90) % 360;
      aplicarFiltrosImagen();
    }
    if (e.key === "f" || e.key === "F") {
      imgFiltros.flipH = !imgFiltros.flipH;
      aplicarFiltrosImagen();
    }
    if (e.key === "i" || e.key === "I") {
      imgFiltros.invertido = !imgFiltros.invertido;
      aplicarFiltrosImagen();
    }
  });

  seleccionarHerramientaImg(imgHerramienta);
  renderVisorImagenes();
  sincronizarConPacienteActualImagenes();
}

function imgAnterior() {
  const data = listaImagenesVisor();
  if (!data.length) return;
  imgIndice = (imgIndice - 1 + data.length) % data.length;
  renderVisorImagenes();
}

function imgSiguiente() {
  const data = listaImagenesVisor();
  if (!data.length) return;
  imgIndice = (imgIndice + 1) % data.length;
  renderVisorImagenes();
}

let editarRegistroId = null;

function fechaESaISO(es) {
  if (!es) return "";
  return /^\d{2}\/\d{2}\/\d{4}$/.test(es) ? es.split("/").reverse().join("-") : es;
}

function abrirModalEditarRegistro(id) {
  const r = State.registros.find(x => x.id === id);
  if (!r) return;
  editarRegistroId = id;
  const sel = document.getElementById("regEPaciente");
  if (sel) sel.value = r.pacienteId;
  document.getElementById("regETitulo").value = r.titulo;
  const tipoEl = document.getElementById("regETipo");
  if (tipoEl) tipoEl.value = r.tipo || "Motivo de consulta";
  document.getElementById("regEFecha").value = fechaESaISO(r.fecha);
  document.getElementById("regEDetalle").value = r.detalle || "";
  const evaEl = document.getElementById("regEEVA");
  if (evaEl) evaEl.value = r.eva != null && r.eva !== "" ? r.eva : "";
  document.getElementById("regEArchivo").value = "";
  const actual = document.getElementById("regEArchivoActual");
  if (actual) actual.textContent = r.archivo ? `Adjunto actual: ${r.archivo.name}` : "Sin documento adjunto";
  const quitar = document.getElementById("regEQuitarArchivo");
  if (quitar) quitar.checked = false;
  abrirModal("modalEditarRegistro");
}

function guardarRegistroEditado() {
  if (!editarRegistroId) return;
  const r = State.registros.find(x => x.id === editarRegistroId);
  if (!r) return;
  const titulo = document.getElementById("regETitulo").value.trim();
  if (!titulo) { alert("El título es obligatorio."); return; }

  const pacienteIdSel = Number(document.getElementById("regEPaciente").value);
  const raId = raPacienteId();
  if (!pacienteIdSel && !raId) {
    mostrarNotificacion("Selecciona un paciente para guardar.");
    return;
  }
  r.pacienteId = pacienteIdSel || raId;
  r.titulo = titulo;
  const tipoEl = document.getElementById("regETipo");
  if (tipoEl) r.tipo = tipoEl.value;
  const fechaEl = document.getElementById("regEFecha").value;
  r.fecha = fechaEl ? fmtFechaES(fechaEl) : new Date().toLocaleDateString("es-ES");
  r.detalle = document.getElementById("regEDetalle").value.trim();
  const evaEdit = document.getElementById("regEEVA");
  r.eva = evaEdit && evaEdit.value !== "" ? Number(evaEdit.value) : null;

  const file = document.getElementById("regEArchivo").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      r.archivo = { name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
      finalizarRegistroEditado(r);
    };
    reader.readAsDataURL(file);
    return;
  }
  if (document.getElementById("regEQuitarArchivo").checked) delete r.archivo;
  finalizarRegistroEditado(r);
}

function finalizarRegistroEditado(r) {
  saveKey("registros");
  editarRegistroId = null;
  cerrarModales();
  renderRegistros();
  renderHome();
}

function renderProximasCitas() {
  const cont = document.getElementById("proximasCitas");
  if (!cont) return;

  const hoy = new Date();
  const hoyISO = hoy.toISOString();

  const proximas = State.citas
    .filter(c => !c.completada && !c.cancelada && (c.fecha + "T" + (c.hora || "23:59")) >= hoyISO && !pacienteEliminadoDe(c.pacienteId))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 5);

  if (proximas.length === 0) {
    cont.innerHTML = `<p class="empty">No hay citas próximas.</p>`;
    return;
  }

  cont.innerHTML = proximas.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
          <span class="tag">${c.fecha} · ${fmtHora12(c.hora, c.amPm)}</span>
          <span class="tag">Turno ${c.turno || "-"}</span>
        </div>
        <div class="item-sub">${c.motivo || "Consulta"}</div>
      </div>
    `;
  }).join("");
}

function abrirImpresion(titulo, cuerpo) {
  const area = document.getElementById("printArea");
  if (!area) return;
  const emitido = new Date().toLocaleString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
  area.innerHTML = `
    <h1>${titulo}</h1>
    <div class="print-meta">Emitido: ${emitido} · Usuario: ${State.session ? State.session.name : ""}</div>
    ${cuerpo}
  `;
  window.print();
}

let pickerOpcionesImpresion = [];
let pickerCallbackImpresion = null;

function abrirSelectorImpresion(opciones, callback) {
  pickerOpcionesImpresion = opciones;
  pickerCallbackImpresion = callback;
  const cont = document.getElementById("printPickerList");
  const msg = document.getElementById("printPickerMsg");
  if (msg) {
    msg.textContent = "";
    msg.className = "form-msg";
  }
  if (cont) {
    cont.innerHTML = opciones.length ? opciones.map((op, i) => `
      <label class="list-item toggle-row">
        <input type="checkbox" data-imprimir-pick="${i}" ${op.marcado ? "checked" : ""} />
        <span>${op.etiqueta}</span>
      </label>
    `).join("") : `<p class="empty">No hay documentos disponibles para imprimir.</p>`;
  }
  abrirModal("modalSeleccionImpresion");
}

function confirmarSelectorImpresion() {
  const pickeado = [];
  document.querySelectorAll("[data-imprimir-pick]").forEach(cb => {
    if (cb.checked) pickeado.push(Number(cb.dataset.imprimirPick));
  });
  const msg = document.getElementById("printPickerMsg");
  if (!pickerOpcionesImpresion.length || !pickeado.length) {
    if (msg) {
      msg.textContent = "Selecciona al menos un documento para imprimir.";
      msg.className = "form-msg error";
    }
    return;
  }
  cerrarModales();
  if (pickerCallbackImpresion) pickerCallbackImpresion(pickeado);
}

const TIPOS_LESION = [
  { id: "dolor", label: "Dolor", color: "#3d648a" },
  { id: "leve", label: "Contusión leve", color: "#f4d35e" },
  { id: "esguince", label: "Esguince", color: "#f08a4b" },
  { id: "fractura", label: "Fractura", color: "#e63946" },
  { id: "contractura", label: "Contractura", color: "#9b5de5" },
  { id: "edema", label: "Edema / inflamación", color: "#2a9d8f" },
  { id: "luxacion", label: "Luxación", color: "#d62828" },
  { id: "tendinitis", label: "Tendinitis", color: "#00a8e8" },
  { id: "desgarro", label: "Desgarro", color: "#ff6b6b" },
  { id: "quemadura", label: "Quemadura", color: "#e85d04" },
  { id: "herida", label: "Herida / corte", color: "#a4161a" },
  { id: "hematoma", label: "Hematoma", color: "#5a189a" },
  { id: "rozadura", label: "Rozadura / ampolla", color: "#f9844a" },
  { id: "entumecimiento", label: "Adormecimiento", color: "#667eea" },
  { id: "hormigueo", label: "Hormigueo", color: "#38b000" },
  { id: "rigidez", label: "Rigidez", color: "#6c757d" },
  { id: "debilidad", label: "Debilidad", color: "#b5179e" },
  { id: "otro", label: "Otro", color: "#495057" }
];

const NOMBRES_PARTES = {
  cabeza: "Cabeza",
  cuello: "Cuello",
  hombroIzq: "Hombro izquierdo",
  hombroDer: "Hombro derecho",
  brazoIzq: "Brazo izquierdo",
  brazoDer: "Brazo derecho",
  antebrazoIzq: "Antebrazo izquierdo",
  antebrazoDer: "Antebrazo derecho",
  manoIzq: "Mano izquierda",
  manoDer: "Mano derecha",
  munecaIzq: "Muñeca / Radio izquierda",
  munecaDer: "Muñeca / Radio derecha",
  pecho: "Pecho / Tórax",
  abdomen: "Abdomen",
  cadera: "Cadera",
  musloIzq: "Muslo izquierdo",
  musloDer: "Muslo derecho",
  rodillaIzq: "Rodilla izquierda",
  rodillaDer: "Rodilla derecha",
  tobilloIzq: "Tobillo izquierdo",
  tobilloDer: "Tobillo derecho",
  pieIzq: "Pie izquierdo",
  pieDer: "Pie derecho",
  pulgarIzq: "Pulgar izquierdo",
  pulgarDer: "Pulgar derecho",
  indiceIzq: "Índice izquierdo",
  indiceDer: "Índice derecho",
  medioIzq: "Medio izquierdo",
  medioDer: "Medio derecho",
  anularIzq: "Anular izquierdo",
  anularDer: "Anular derecho",
  meniqueIzq: "Meñique izquierdo",
  meniqueDer: "Meñique derecho",
  pulgarA1Izq: "Pulgar izq · articulación 1",
  pulgarA2Izq: "Pulgar izq · articulación 2",
  pulgarA1Der: "Pulgar der · articulación 1",
  pulgarA2Der: "Pulgar der · articulación 2",
  indiceA1Izq: "Índice izq · articulación 1",
  indiceA2Izq: "Índice izq · articulación 2",
  indiceA3Izq: "Índice izq · articulación 3",
  indiceA1Der: "Índice der · articulación 1",
  indiceA2Der: "Índice der · articulación 2",
  indiceA3Der: "Índice der · articulación 3",
  medioA1Izq: "Medio izq · articulación 1",
  medioA2Izq: "Medio izq · articulación 2",
  medioA3Izq: "Medio izq · articulación 3",
  medioA1Der: "Medio der · articulación 1",
  medioA2Der: "Medio der · articulación 2",
  medioA3Der: "Medio der · articulación 3",
  anularA1Izq: "Anular izq · articulación 1",
  anularA2Izq: "Anular izq · articulación 2",
  anularA3Izq: "Anular izq · articulación 3",
  anularA1Der: "Anular der · articulación 1",
  anularA2Der: "Anular der · articulación 2",
  anularA3Der: "Anular der · articulación 3",
  meniqueA1Izq: "Meñique izq · articulación 1",
  meniqueA2Izq: "Meñique izq · articulación 2",
  meniqueA3Izq: "Meñique izq · articulación 3",
  meniqueA1Der: "Meñique der · articulación 1",
  meniqueA2Der: "Meñique der · articulación 2",
  meniqueA3Der: "Meñique der · articulación 3",
  palmaIzq: "Palma de la mano izquierda",
  palmaDer: "Palma de la mano derecha",
  radioIzq: "Muñeca / radio izquierdo",
  radioDer: "Muñeca / radio derecho",
  dedo1Izq: "Dedo gordo del pie izquierdo",
  dedo2Izq: "2.º dedo del pie izquierdo",
  dedo3Izq: "3.er dedo del pie izquierdo",
  dedo4Izq: "4.º dedo del pie izquierdo",
  dedo5Izq: "5.º dedo del pie izquierdo",
  dedo1Der: "Dedo gordo del pie derecho",
  dedo2Der: "2.º dedo del pie derecho",
  dedo3Der: "3.er dedo del pie derecho",
  dedo4Der: "4.º dedo del pie derecho",
  dedo5Der: "5.º dedo del pie derecho",
  dedo1A1Izq: "Dedo gordo izq · articulación 1",
  dedo1A2Izq: "Dedo gordo izq · articulación 2",
  dedo1A1Der: "Dedo gordo der · articulación 1",
  dedo1A2Der: "Dedo gordo der · articulación 2",
  dedo2A1Izq: "2.º dedo pie izq · articulación 1",
  dedo2A2Izq: "2.º dedo pie izq · articulación 2",
  dedo2A3Izq: "2.º dedo pie izq · articulación 3",
  dedo2A1Der: "2.º dedo pie der · articulación 1",
  dedo2A2Der: "2.º dedo pie der · articulación 2",
  dedo2A3Der: "2.º dedo pie der · articulación 3",
  dedo3A1Izq: "3.er dedo pie izq · articulación 1",
  dedo3A2Izq: "3.er dedo pie izq · articulación 2",
  dedo3A3Izq: "3.er dedo pie izq · articulación 3",
  dedo3A1Der: "3.er dedo pie der · articulación 1",
  dedo3A2Der: "3.er dedo pie der · articulación 2",
  dedo3A3Der: "3.er dedo pie der · articulación 3",
  dedo4A1Izq: "4.º dedo pie izq · articulación 1",
  dedo4A2Izq: "4.º dedo pie izq · articulación 2",
  dedo4A3Izq: "4.º dedo pie izq · articulación 3",
  dedo4A1Der: "4.º dedo pie der · articulación 1",
  dedo4A2Der: "4.º dedo pie der · articulación 2",
  dedo4A3Der: "4.º dedo pie der · articulación 3",
  dedo5A1Izq: "5.º dedo pie izq · articulación 1",
  dedo5A2Izq: "5.º dedo pie izq · articulación 2",
  dedo5A3Izq: "5.º dedo pie izq · articulación 3",
  dedo5A1Der: "5.º dedo pie der · articulación 1",
  dedo5A2Der: "5.º dedo pie der · articulación 2",
  dedo5A3Der: "5.º dedo pie der · articulación 3",
  dedo1DistalIzq: "Dedo gordo izq · falange distal",
  dedo1DistalDer: "Dedo gordo der · falange distal",
  dedo1ProximalIzq: "Dedo gordo izq · falange proximal",
  dedo1ProximalDer: "Dedo gordo der · falange proximal",
  dedo2DistalIzq: "2.º dedo izq · falange distal",
  dedo2DistalDer: "2.º dedo der · falange distal",
  dedo2IntermediaIzq: "2.º dedo izq · falange intermedia",
  dedo2IntermediaDer: "2.º dedo der · falange intermedia",
  dedo2ProximalIzq: "2.º dedo izq · falange proximal",
  dedo2ProximalDer: "2.º dedo der · falange proximal",
  dedo3DistalIzq: "3.er dedo izq · falange distal",
  dedo3DistalDer: "3.er dedo der · falange distal",
  dedo3IntermediaIzq: "3.er dedo izq · falange intermedia",
  dedo3IntermediaDer: "3.er dedo der · falange intermedia",
  dedo3ProximalIzq: "3.er dedo izq · falange proximal",
  dedo3ProximalDer: "3.er dedo der · falange proximal",
  dedo4DistalIzq: "4.º dedo izq · falange distal",
  dedo4DistalDer: "4.º dedo der · falange distal",
  dedo4IntermediaIzq: "4.º dedo izq · falange intermedia",
  dedo4IntermediaDer: "4.º dedo der · falange intermedia",
  dedo4ProximalIzq: "4.º dedo izq · falange proximal",
  dedo4ProximalDer: "4.º dedo der · falange proximal",
  dedo5DistalIzq: "5.º dedo izq · falange distal",
  dedo5DistalDer: "5.º dedo der · falange distal",
  dedo5IntermediaIzq: "5.º dedo izq · falange intermedia",
  dedo5IntermediaDer: "5.º dedo der · falange intermedia",
  dedo5ProximalIzq: "5.º dedo izq · falange proximal",
  dedo5ProximalDer: "5.º dedo der · falange proximal",
  metatarsoIzq: "Metatarso izquierdo",
  metatarsoDer: "Metatarso derecho",
  cuneiformesIzq: "Cuneiformes izquierdos",
  cuneiformesDer: "Cuneiformes derechos",
  escafoidesIzq: "Escafoides izquierdo",
  escafoidesDer: "Escafoides derecho",
  astragaloIzq: "Astrágalo izquierdo",
  astragaloDer: "Astrágalo derecho",
  cuboidesIzq: "Cuboides izquierdo",
  cuboidesDer: "Cuboides derecho",
  calcaneoIzq: "Calcáneo (talón) izquierdo",
  calcaneoDer: "Calcáneo (talón) derecho",
  plantaIzq: "Planta del pie izquierdo",
  plantaDer: "Planta del pie derecho",
  columnaCervical: "Columna cervical",
  columnaDorsal: "Columna dorsal",
  columnaLumbar: "Columna lumbar",
  columnaSacro: "Sacro",
  columnaCoxis: "Coxis"
};

let cacheFiguras = {};
const PUNTOS_FOTO = ["manoIzq", "manoDer", "pieIzq", "pieDer"];
let lesionesEval = {};
let lesionTipoActual = "dolor";
let lesionBorrador = false;
let sexoEval = "masculino";
let vistaEvalActual = "frente";
let evalAutoSexo = false;
let zonasVistaConstruidas = null;
const cacheFigurasVista = {};

const POSICIONES_EVAL = [
  { id: "frente", label: "Frente", img: { masculino: "eval_frente_m.png", femenino: "eval_frente_f.png" } },
  { id: "espalda", label: "Espalda", img: { masculino: "eval_espalda_m.png", femenino: "eval_espalda_f.png" } },
  { id: "perfilIzq", label: "Perfil izquierdo", img: { masculino: "eval_perfil_izq_m.png", femenino: "eval_perfil_izq_f.png" } },
  { id: "perfilDer", label: "Perfil derecho", img: { masculino: "eval_perfil_der_m.png", femenino: "eval_perfil_der_f.png" } }
];

function imgVistaActual() {
  const pos = POSICIONES_EVAL.find(p => p.id === vistaEvalActual) || POSICIONES_EVAL[0];
  return pos.img[sexoEval] || pos.img.masculino;
}

function zonaBaseVista() {
  const esEspalda = vistaEvalActual === "espalda";
  const base = ZONAS_EVAL_PLANTILLA;
  if (!esEspalda) return base;
  const out = {};
  Object.keys(base).forEach(p => {
    const z = base[p];
    if (z.forma === "circle") {
      out[p] = { forma: "circle", cx: redond(1 - z.cx), cy: z.cy, r: z.r };
    } else if (z.forma === "ellipse") {
      out[p] = { forma: "ellipse", cx: redond(1 - z.cx), cy: z.cy, rx: z.rx, ry: z.ry };
    } else {
      out[p] = { forma: "rect", x: redond(1 - z.x), y: z.y, w: z.w, h: z.h, rx: z.rx };
    }
  });
  return out;
}

const COLOR_SKIN = "#f4c8a6";
const COLOR_SKIN_LINEA = "#c7956d";

function oscurecerColor(hex, f) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function colorearPartes() {
  document.querySelectorAll(".eval-part, .eval-subpart").forEach(el => {
    const les = normLesiones(lesionesEval[el.dataset.part]);
    const esFoto = !!el.closest(".eval-hitlayer");
    /* Columna sobre foto: zonas y puntos transparentes (no tapan la imagen) */
    if (!les.length && (el.classList.contains("eval-columna") || el.classList.contains("eval-columna-punto"))) {
      el.style.fill = "";
      el.style.fillOpacity = "";
      el.style.stroke = "";
      el.style.strokeOpacity = "";
      el.style.strokeWidth = "";
      return;
    }
    if (les.length) {
      const col = les[0].color;
      el.style.fill = col;
      el.style.fillOpacity = (esFoto || el.classList.contains("eval-columna") || el.classList.contains("eval-columna-punto")) ? "0.55" : "1";
      el.style.stroke = oscurecerColor(col, 0.72);
      el.style.strokeOpacity = "0.9";
      el.style.strokeWidth = "2.5";
    } else if (esFoto) {
      const esPunto = el.classList.contains("eval-punto-ext") || PUNTOS_FOTO.indexOf(el.dataset.part) !== -1 || /^(muslo|rodilla|tobillo)/.test(el.dataset.part);
      if (esPunto) {
        el.style.fill = "rgba(255,255,255,0.28)";
        el.style.fillOpacity = "1";
        el.style.stroke = "rgba(15,30,55,0.9)";
        el.style.strokeOpacity = "1";
        el.style.strokeWidth = "2.5";
      } else {
        el.style.fill = "rgba(255,255,255,0.10)";
        el.style.fillOpacity = "1";
        el.style.stroke = "rgba(15,30,55,0.6)";
        el.style.strokeOpacity = "1";
        el.style.strokeWidth = "2";
      }
    } else {
      el.style.fill = COLOR_SKIN;
      el.style.fillOpacity = "1";
      el.style.stroke = COLOR_SKIN_LINEA;
      el.style.strokeOpacity = "1";
      el.style.strokeWidth = "1.6";
    }
  });
  document.querySelectorAll(".eval-zone-label, .eval-callout-txt").forEach(el => {
    const les = normLesiones(lesionesEval[el.dataset.part]);
    const esFoto = !!el.closest(".eval-hitlayer");
    const oscuro = document.body.classList.contains("dark");
    if (les.length) {
      el.style.fill = les[0].color;
      el.style.stroke = oscurecerColor(les[0].color, 0.72);
      el.style.fillOpacity = "1";
      el.style.strokeWidth = "3px";
    } else if (el.classList.contains("eval-columna-nombre")) {
      el.style.fill = oscuro ? "#e8eefc" : "#26324a";
      el.style.stroke = "none";
      el.style.strokeWidth = "0";
      el.style.fillOpacity = "1";
    } else if (esFoto) {
      el.style.fill = oscuro ? "#ffffff" : "#0f1630";
      el.style.stroke = oscuro ? "rgba(8,16,32,0.9)" : "rgba(255,255,255,0.96)";
      el.style.strokeWidth = "3px";
      el.style.fillOpacity = "1";
    } else {
      el.style.fill = oscuro ? "#ffffff" : COLOR_SKIN_LINEA;
      el.style.stroke = oscuro ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.95)";
      el.style.strokeWidth = "3px";
      el.style.fillOpacity = "1";
    }
  });
}

function normLesiones(le) {
  if (!le) return [];
  return Array.isArray(le) ? le : [le];
}

function agregarTipoLesion(pos, t) {
  const arr = normLesiones(lesionesEval[pos]);
  if (!arr.some(x => x.id === t.id)) arr.push({ id: t.id, color: t.color, label: t.label });
  if (arr.length) lesionesEval[pos] = arr;
}

function quitarTipoLesion(pos, id) {
  const arr = normLesiones(lesionesEval[pos]).filter(x => x.id !== id);
  if (arr.length) lesionesEval[pos] = arr;
  else delete lesionesEval[pos];
}

function marcarParte(pos) {
  if (!pos) return;
  if (pos === "manoIzq" || pos === "manoDer" || pos === "pieIzq" || pos === "pieDer") {
    abrirExtremidad(pos);
    return;
  }
  if (lesionBorrador) {
    delete lesionesEval[pos];
  } else {
    const t = TIPOS_LESION.find(x => x.id === lesionTipoActual);
    if (!t) return;
    if (normLesiones(lesionesEval[pos]).some(x => x.id === t.id)) quitarTipoLesion(pos, t.id);
    else agregarTipoLesion(pos, t);
  }
  colorearPartes();
  renderPartesAfectadas();
}

function renderLesionTipos() {
  refreshChips();
}

function renderPartesAfectadas() {
  const cont = document.getElementById("partesAfectadas");
  const contador = document.getElementById("evalContador");
  if (!cont) return;
  const keys = Object.keys(lesionesEval);
  if (contador) contador.textContent = keys.length;
  const filas = [];
  keys.forEach(k => normLesiones(lesionesEval[k]).forEach(l => filas.push({ k, l })));
  if (!filas.length) {
    cont.innerHTML = `<p class="empty">Aún no marcas partes del cuerpo.</p>`;
    return;
  }
  cont.innerHTML = filas.map(f => `
      <div class="eval-parte">
        <span class="lesion-dot" style="background:${f.l.color};--chip:${f.l.color}"></span>
        <span class="eval-parte-nombre">${NOMBRES_PARTES[f.k] || f.k} · ${f.l.label}</span>
        <button type="button" class="btn-icon danger" data-quitar-lesion="${f.k}" data-quitar-tipo="${f.l.id}" title="Quitar">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>`).join("");
  cont.querySelectorAll("[data-quitar-lesion]").forEach(b => b.addEventListener("click", () => {
    quitarTipoLesion(b.dataset.quitarLesion, b.dataset.quitarTipo);
    colorearPartes();
    renderPartesAfectadas();
  }));
}

const COLUMNA_REGIONES = [
  { key: "columnaCervical", letra: "A", cy: 255,  verts: { y0: 135, n: 7,  step: 32, h: 26, w: 74 } },
  { key: "columnaDorsal",   letra: "B", cy: 720,  verts: { y0: 470, n: 12, step: 42, h: 30, w: 96 } },
  { key: "columnaLumbar",   letra: "C", cy: 1210, verts: { y0: 1010, n: 5, step: 52, h: 40, w: 112 } },
  { key: "columnaSacro",    letra: "D", cy: 1430, d: "M552,1300 L648,1300 L622,1470 L578,1470 Z" },
  { key: "columnaCoxis",    letra: "E", cy: 1560, d: "M582,1500 L618,1500 L600,1600 Z" }
];

function columnaVertShape(v) {
  const cx = 600;
  const out = [];
  for (let i = 0; i < v.n; i++) {
    const y = v.y0 + i * v.step;
    const x = cx - v.w / 2;
    out.push(`<rect x="${x}" y="${y}" width="${v.w}" height="${v.h}" rx="${Math.round(v.h / 2)}"/>`);
  }
  return out.join("");
}

function renderColumna() {
  const cont = document.getElementById("columnaSvg");
  if (!cont) return;
  const W = 1200, H = 1816, cx = 600, nameX = 300, bxR = 930, rBadge = 32;
  let hits = "", callouts = "", dots = "", badges = "";
  COLUMNA_REGIONES.forEach(r => {
    const cuerpo = r.verts ? columnaVertShape(r.verts) : `<path d="${r.d}"/>`;
    hits += `<g class="eval-part eval-columna eval-columna-hit" data-part="${r.key}">${cuerpo}</g>`;
    callouts += `<polyline class="eval-callout-line" points="${cx + 24},${r.cy} ${bxR - rBadge},${r.cy}"/>`;
    const les = normLesiones(lesionesEval[r.key]);
    if (les.length) {
      les.forEach((l, i) => {
        dots += `<circle class="eval-punto eval-columna-punto" data-part="${r.key}" cx="${cx - 44 - i * 32}" cy="${r.cy}" r="15" style="fill:${l.color};stroke:${oscurecerColor(l.color, 0.7)}"/>`;
      });
    } else {
      dots += `<circle class="eval-part eval-punto eval-columna-punto" data-part="${r.key}" cx="${cx}" cy="${r.cy}" r="17"/>`;
    }
    const marcado = normLesiones(lesionesEval[r.key]).length ? " marcado" : "";
    badges += `<g class="eval-columna-badge${marcado}" data-part="${r.key}">` +
      `<circle cx="${bxR}" cy="${r.cy}" r="${rBadge}"/>` +
      `<text x="${bxR}" y="${r.cy}" text-anchor="middle" dominant-baseline="central" font-size="33" font-weight="700">${r.letra}</text>` +
      `</g>`;
  });
  const nombres = COLUMNA_REGIONES.map(r =>
    `<text class="eval-zone-label eval-columna-nombre" data-part="${r.key}" x="${nameX}" y="${r.cy}" text-anchor="end" dominant-baseline="central" font-size="30">${NOMBRES_PARTES[r.key] || ""}</text>`
  ).join("");
  cont.innerHTML =
    `<div class="eval-columna-stage">` +
      `<img class="eval-columna-foto" src="Columna.png" alt="Columna vertebral" />` +
      `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="eval-columna-svg">` +
        `${hits}${callouts}${dots}${badges}${nombres}</svg>` +
    `</div>`;
  cont.querySelectorAll("[data-part]").forEach(el => {
    el.addEventListener("click", () => { marcarParte(el.dataset.part); renderColumna(); });
  });
  colorearPartes();
  renderColumnaLeyenda();
}

function renderColumnaLeyenda() {
  const cont = document.getElementById("columnaLeyenda");
  if (!cont) return;
  const filas = [];
  COLUMNA_REGIONES.forEach(r => normLesiones(lesionesEval[r.key]).forEach(l => filas.push({ k: r.key, letra: r.letra, l })));
  cont.innerHTML = filas.length
    ? filas.map(f => `<span class="eval-leyenda-item"><span class="lesion-dot" style="background:${f.l.color};--chip:${f.l.color}"></span>${f.letra} · ${NOMBRES_PARTES[f.k] || f.k} · ${f.l.label}</span>`).join("")
    : `<span class="empty">Sin regiones de la columna marcadas.</span>`;
}

function refrescarColumnaSiAbierto() {
  const m = document.getElementById("modalColumna");
  if (m && m.classList.contains("open")) renderColumna();
}

function precargarFigurasEval() {
  [["masculino", "eval_frente_m.png"], ["femenino", "eval_frente_f.png"]].forEach(function (t) {
    if (cacheFiguras[t[0]]) return;
    procesarFigura(t[1], function (info) {
      if (info) {
        cacheFiguras[t[0]] = info;
        cacheFigurasVista["frente:" + t[0]] = info;
      }
    });
  });
}

let _evalVisibleTmr = null;
function agendarRenderVistaEval() {
  if (_evalVisibleTmr) return;
  let t = 0;
  _evalVisibleTmr = setInterval(function () {
    t += 200;
    const cont = document.getElementById("evalVistaGrande");
    const ok = cont && cont.clientWidth > 100;
    if (ok || t > 8000) {
      clearInterval(_evalVisibleTmr);
      _evalVisibleTmr = null;
      if (ok) renderVistaEvalGrande();
    }
  }, 200);
}

function renderVistaEvalGrande() {
  const cont = document.getElementById("evalVistaGrande");
  if (!cont) return;
  const clave = vistaEvalActual + ":" + sexoEval;
  const finalizar = function (info) {
    cacheFigurasVista[clave] = info;
    if (vistaEvalActual === "frente") cacheFiguras[sexoEval] = info;
    if (cont.clientWidth <= 100) {
      setTimeout(agendarRenderVistaEval, 0);
      return;
    }
    cont.innerHTML = "";
    const indiv = document.createElement("div");
    indiv.className = "eval-indiv";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "eval-svg eval-hitlayer eval-diagram");
    indiv.appendChild(svg);
    cont.appendChild(indiv);
    zonasVistaConstruidas = construirZonas(svg, info, zonaBaseVista());
    colorearPartes();
  };
  if (cacheFigurasVista[clave]) {
    finalizar(cacheFigurasVista[clave]);
    return;
  }
  procesarFigura(imgVistaActual(), function (info) {
    if (info) finalizar(info);
  });
}

let _resizeEvalTmr = null;
window.addEventListener("resize", function () {
  clearTimeout(_resizeEvalTmr);
  _resizeEvalTmr = setTimeout(function () {
    const cont = document.getElementById("evalVistaGrande");
    if (cont && cont.offsetParent !== null) renderVistaEvalGrande();
  }, 250);
});

function cambiarSexoEval(sexo) {
  sexoEval = sexo;
  const bm = document.getElementById("btnEvalMasculino");
  const bf = document.getElementById("btnEvalFemenino");
  if (bm) bm.classList.toggle("active", sexo === "masculino");
  if (bf) bf.classList.toggle("active", sexo === "femenino");
  renderGaleriaEval();
  renderVistaEvalGrande();
  aplicarAutoSexo("manual");
}

function cambiarVistaEval(vista) {
  vistaEvalActual = vista;
  renderGaleriaEval();
  renderVistaEvalGrande();
}

function renderGaleriaEval() {
  const cont = document.getElementById("evalGaleria");
  if (!cont) return;
  cont.innerHTML = POSICIONES_EVAL.map(pos => {
    const src = pos.img[sexoEval] || pos.img.masculino;
    return `
      <button type="button" class="eval-flip-card${pos.id === vistaEvalActual ? " active" : ""}" data-vista="${pos.id}" title="${pos.label}">
        <span class="eval-flip-inner">
          <span class="eval-flip-front">
            <img class="eval-flip-img" src="${src}" alt="${pos.label}">
            <span class="eval-flip-label">${pos.label}</span>
          </span>
          <span class="eval-flip-back">${pos.label}</span>
        </span>
      </button>`;
  }).join("");
  cont.querySelectorAll(".eval-flip-card").forEach(btn => {
    btn.addEventListener("click", () => cambiarVistaEval(btn.dataset.vista));
  });
}

function aplicarAutoSexo(origen) {
  if (!evalAutoSexo) {
    const msg = document.getElementById("evalAutoMsg");
    if (msg) msg.textContent = "";
    return;
  }
  const id = raPacienteId();
  const p = id ? State.pacientes.find(x => x.id === id) : null;
  const sexoAuto = p && p.sexo ? (String(p.sexo).toLowerCase().startsWith("f") ? "femenino" : "masculino") : sexoEval;
  if (sexoAuto !== sexoEval) {
    sexoEval = sexoAuto;
    const bm = document.getElementById("btnEvalMasculino");
    const bf = document.getElementById("btnEvalFemenino");
    if (bm) bm.classList.toggle("active", sexoEval === "masculino");
    if (bf) bf.classList.toggle("active", sexoEval === "femenino");
    renderGaleriaEval();
    renderVistaEvalGrande();
  }
  const msg = document.getElementById("evalAutoMsg");
  if (msg) {
    msg.textContent = p
      ? `Sexo sincronizado con el paciente (${String(p.sexo).toLowerCase().startsWith("f") ? "Femenino" : "Masculino"}). Cambia el paciente y la silueta se ajustará sola.`
      : "Selecciona un paciente para sincronizar la silueta con su sexo.";
  }
}

function initEvaluacionFisica() {
  renderLesionTipos();
  renderGaleriaEval();
  renderVistaEvalGrande();
  const bm = document.getElementById("btnEvalMasculino");
  const bf = document.getElementById("btnEvalFemenino");
  if (bm) bm.addEventListener("click", () => cambiarSexoEval("masculino"));
  if (bf) bf.addEventListener("click", () => cambiarSexoEval("femenino"));
  const autoBtn = document.getElementById("btnEvalSexoAuto");
  if (autoBtn) autoBtn.addEventListener("click", () => {
    evalAutoSexo = !evalAutoSexo;
    autoBtn.classList.toggle("active", evalAutoSexo);
    aplicarAutoSexo("toggle");
  });
  const borra = document.getElementById("btnEvalBorrador");
  if (borra) borra.addEventListener("click", () => {
    lesionBorrador = !lesionBorrador;
    borra.classList.toggle("active", lesionBorrador);
    renderLesionTipos();
  });
  const limpiar = document.getElementById("btnEvalLimpiar");
  if (limpiar) limpiar.addEventListener("click", () => {
    lesionesEval = {};
    aplicarPruebasEval({});
    colorearPartes();
    renderPartesAfectadas();
    refrescarColumnaSiAbierto();
  });
  const btnColumna = document.getElementById("btnEvalColumna");
  if (btnColumna) btnColumna.addEventListener("click", () => {
    refreshChips();
    syncBorradorUI();
    renderColumna();
    abrirModal("modalColumna");
  });
  const btnColBorrador = document.getElementById("btnColumnaBorrador");
  if (btnColBorrador) btnColBorrador.addEventListener("click", () => {
    lesionBorrador = !lesionBorrador;
    syncBorradorUI();
    refreshChips();
  });
  const btnExtBorrador = document.getElementById("btnEvalExtremBorrador");
  if (btnExtBorrador) btnExtBorrador.addEventListener("click", () => {
    lesionBorrador = !lesionBorrador;
    syncBorradorUI();
    refreshChips();
  });
  const btnExtTodo = document.getElementById("btnEvalExtremTodo");
  if (btnExtTodo) btnExtTodo.addEventListener("click", marcarExtremidadCompleta);
  const btnExtLimpiar = document.getElementById("btnEvalExtremLimpiar");
  if (btnExtLimpiar) btnExtLimpiar.addEventListener("click", () => {
    limpiarExtremidad();
  });
  const btnGuardar = document.getElementById("btnEvalGuardar");
  if (btnGuardar) btnGuardar.addEventListener("click", guardarEvaluacion);
  const evaInput = document.getElementById("evalEVA");
  const evaOut = document.getElementById("evalEVAVal");
  if (evaInput && evaOut) {
    aplicarColorEVA(evaInput.value);
    evaInput.addEventListener("input", () => { aplicarColorEVA(evaInput.value); });
  }
  renderEvalPacienteActual();
  renderEvaluacionesGuardadas();
  renderPartesAfectadas();
  colorearPartes();
  refreshChips();
  syncBorradorUI();
  initFiguras();
}

function initEvaluacionMedica() {
  const form = document.getElementById("evalMedForm");
  if (!form) return;
  llenarSelectPacientes("evalMedPaciente");
  const fechaEl = document.getElementById("evalMedFecha");
  if (fechaEl) fechaEl.valueAsDate = new Date();
  form.addEventListener("submit", guardarEvalMed);
  const limpia = document.getElementById("btnEvalMedLimpiar");
  if (limpia) limpia.addEventListener("click", () => limpiarEvalMedForm(true));
  ["evalMedVitalPeso", "evalMedVitalTalla"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", calcEvalMedIMC);
  });
  const buscar = document.getElementById("buscarEvalMed");
  if (buscar) buscar.addEventListener("input", () => renderEvalMedLista(buscar.value));
  renderEvalMedLista();
}

// ===== Evaluación médica general =====
function calcEvalMedIMC() {
  const peso = Number((document.getElementById("evalMedVitalPeso") || {}).value);
  const talla = Number((document.getElementById("evalMedVitalTalla") || {}).value);
  const out = document.getElementById("evalMedVitalIMC");
  if (!out) return;
  if (peso > 0 && talla > 0) {
    const imc = peso / Math.pow(talla / 100, 2);
    out.value = imc.toFixed(1);
  } else {
    out.value = "";
  }
}

function leerEvalMedForm() {
  const get = id => (document.getElementById(id) || {}).value || "";
  return {
    pacienteId: Number((document.getElementById("evalMedPaciente") || {}).value) || 0,
    motivo: get("evalMedMotivo").trim(),
    antecedentes: {
      cronicas: get("evalMedAntCronicas").trim(),
      quirurgicos: get("evalMedAntQuirurgicos").trim(),
      alergicos: get("evalMedAntAlergicos").trim(),
      medicacion: get("evalMedAntMedicacion").trim()
    },
    signosVitales: {
      pa: get("evalMedVitalPA").trim(),
      fc: get("evalMedVitalFC").trim(),
      fr: get("evalMedVitalFR").trim(),
      temp: get("evalMedVitalTemp").trim(),
      peso: get("evalMedVitalPeso").trim(),
      talla: get("evalMedVitalTalla").trim(),
      imc: get("evalMedVitalIMC").trim(),
      satO2: get("evalMedVitalSatO2").trim()
    },
    examenFisico: get("evalMedExamen").trim(),
    diagnostico: get("evalMedDiagnostico").trim(),
    plan: get("evalMedPlan").trim(),
    notas: get("evalMedNotas").trim()
  };
}

function limpiarEvalMedForm(mantenerPaciente) {
  const ids = ["evalMedMotivo", "evalMedAntCronicas", "evalMedAntQuirurgicos", "evalMedAntAlergicos", "evalMedAntMedicacion", "evalMedVitalPA", "evalMedVitalFC", "evalMedVitalFR", "evalMedVitalTemp", "evalMedVitalPeso", "evalMedVitalTalla", "evalMedVitalIMC", "evalMedVitalSatO2", "evalMedExamen", "evalMedDiagnostico", "evalMedPlan", "evalMedNotas"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  if (mantenerPaciente) {
    const sel = document.getElementById("evalMedPaciente");
    const rid = raPacienteId();
    if (sel && rid) sel.value = String(rid);
  }
}

function guardarEvalMed(e) {
  e.preventDefault();
  const datos = leerEvalMedForm();
  const raId = raPacienteId();
  if (!datos.pacienteId && !raId) {
    mostrarNotificacion("<b>Selecciona un paciente</b> para guardar la evaluación.");
    return;
  }
  if (!datos.pacienteId) datos.pacienteId = raId;
  if (!datos.motivo && !datos.examenFisico && !datos.diagnostico) {
    mostrarNotificacion("Completa al menos el motivo, el examen físico o el diagnóstico.");
    return;
  }
  const p = State.pacientes.find(x => x.id === datos.pacienteId);
  const reg = {
    id: Date.now(),
    pacienteId: datos.pacienteId,
    fecha: new Date().toISOString().split("T")[0],
    motivo: datos.motivo,
    antecedentes: datos.antecedentes,
    signosVitales: datos.signosVitales,
    examenFisico: datos.examenFisico,
    diagnostico: datos.diagnostico,
    plan: datos.plan,
    notas: datos.notas
  };
  State.evaluacionesMedicas.push(reg);
  saveKey("evaluacionesMedicas");
  limpiarEvalMedForm(true);
  renderEvalMedLista((document.getElementById("buscarEvalMed") || {}).value || "");
  renderHome();
  mostrarNotificacion("Evaluación médica de <b>" + escHtml(p ? p.nombre : "el paciente") + "</b> guardada correctamente");
}

function renderEvalMedLista(busqueda = "") {
  const cont = document.getElementById("listaEvalMed");
  if (!cont) return;
  const countEl = document.getElementById("countEvalMed");
  if (countEl) countEl.textContent = State.evaluacionesMedicas.length;
  let items = [...State.evaluacionesMedicas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const q = (busqueda || "").trim().toLowerCase();
  if (q) {
    items = items.filter(ev => {
      const p = State.pacientes.find(x => x.id === ev.pacienteId);
      return [[p ? p.nombre : "", p ? p.codigo : ""].join(" "), ev.motivo, ev.diagnostico].join(" ").toLowerCase().includes(q);
    });
  }
  if (!items.length) {
    cont.innerHTML = "<div class='empty'>" + (State.evaluacionesMedicas.length ? "Sin resultados para \"" + escHtml(busqueda) + "\"." : "Aún no hay evaluaciones médicas guardadas.") + "</div>";
    return;
  }
  cont.innerHTML = items.map(ev => {
    const p = State.pacientes.find(x => x.id === ev.pacienteId);
    const v = ev.signosVitales || {};
    const vitales = [v.pa && ("PA " + v.pa), v.fc && ("FC " + v.fc + " lpm"), v.temp && (v.temp + " °C"), v.imc && ("IMC " + v.imc)].filter(Boolean).join(" · ");
    return "<div class='list-item'>" +
      "<div class='item-main'><strong>" + escHtml(p ? p.nombre : "Paciente eliminado") + "</strong>" +
      "<span class='tag'>" + fmtFechaES(ev.fecha) + "</span>" +
      (ev.diagnostico ? "<span class='tag tag-ok'>" + escHtml(ev.diagnostico) + "</span>" : "") +
      "</div>" +
      "<div class='item-sub'>" + escHtml(ev.motivo || "Sin motivo registrado") + (vitales ? " · " + escHtml(vitales) : "") + "</div>" +
      (ev.examenFisico ? "<div class='item-sub'>Examen: " + escHtml(ev.examenFisico) + "</div>" : "") +
      (ev.plan ? "<div class='item-sub'>Plan: " + escHtml(ev.plan) + "</div>" : "") +
      (ev.notas ? "<div class='item-sub'>Nota: " + escHtml(ev.notas) + "</div>" : "") +
      "<div class='item-actions'>" +
      "<button class='btn-icon' data-ver-evalmed='" + ev.id + "' title='Ver detalle'>" +
      "<span class='material-symbols-outlined'>visibility</span></button>" +
      "<button class='btn-icon danger' data-borrar-evalmed='" + ev.id + "' title='Eliminar evaluación'>" +
      "<span class='material-symbols-outlined'>delete</span></button>" +
      "</div></div>";
  }).join("");
  cont.querySelectorAll("[data-ver-evalmed]").forEach(b => b.addEventListener("click", () => verEvalMed(Number(b.dataset.verEvalmed))));
  cont.querySelectorAll("[data-borrar-evalmed]").forEach(b => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar esta evaluación médica?")) return;
    State.evaluacionesMedicas = State.evaluacionesMedicas.filter(x => x.id !== Number(b.dataset.borrarEvalmed));
    saveKey("evaluacionesMedicas");
    renderEvalMedLista(((document.getElementById("buscarEvalMed")) || {}).value || "");
  }));
}

function verEvalMed(id) {
  const ev = State.evaluacionesMedicas.find(x => x.id === id);
  if (!ev) return;
  const p = State.pacientes.find(x => x.id === ev.pacienteId);
  const v = ev.signosVitales || {};
  const a = ev.antecedentes || {};
  const ant = [a.cronicas && ("Crónicas: " + a.cronicas), a.quirurgicos && ("Quirúrgicos: " + a.quirurgicos), a.alergicos && ("Alérgicos: " + a.alergicos), a.medicacion && ("Medicación: " + a.medicacion)].filter(Boolean).join(" · ");
  const vital = [v.pa && ("PA " + v.pa), v.fc && ("FC " + v.fc + " lpm"), v.fr && ("FR " + v.fr + " rpm"), v.temp && (v.temp + " °C"), v.peso && ("Peso " + v.peso + " kg"), v.talla && ("Talla " + v.talla + " cm"), v.imc && ("IMC " + v.imc), v.satO2 && ("SatO₂ " + v.satO2 + "%")].filter(Boolean).join(" · ");
  const vista = document.getElementById("evalMedVista");
  if (!vista) return;
  vista.innerHTML = "<div class='detalle'>" +
    "<p class='detalle-titulo'><strong>" + escHtml(p ? p.nombre : "Paciente eliminado") + "</strong> · " + fmtFechaES(ev.fecha) + "</p>" +
    (ev.motivo ? "<p><strong>Motivo:</strong> " + escHtml(ev.motivo) + "</p>" : "") +
    (ant ? "<p><strong>Antecedentes:</strong> " + escHtml(ant) + "</p>" : "") +
    (vital ? "<p><strong>Signos vitales:</strong> " + escHtml(vital) + "</p>" : "") +
    (ev.examenFisico ? "<p><strong>Examen físico:</strong> " + escHtml(ev.examenFisico) + "</p>" : "") +
    (ev.diagnostico ? "<p><strong>Impresión diagnóstica:</strong> " + escHtml(ev.diagnostico) + "</p>" : "") +
    (ev.plan ? "<p><strong>Plan e indicaciones:</strong> " + escHtml(ev.plan) + "</p>" : "") +
    (ev.notas ? "<p><strong>Notas:</strong> " + escHtml(ev.notas) + "</p>" : "") +
    "</div>";
  const m = document.getElementById("modalVerEvalMed");
  if (m) m.classList.add("open");
}

const EXTREM_POR_PARTE = {
  manoIzq: { tipo: "mano", lado: "izq" },
  manoDer: { tipo: "mano", lado: "der" },
  pieIzq: { tipo: "pie", lado: "izq" },
  pieDer: { tipo: "pie", lado: "der" }
};

let extremidadActiva = null;

function renderLesionChips(cont) {
  if (!cont) return;
  cont.innerHTML = TIPOS_LESION.map(t => `
    <button type="button" class="lesion-chip ${lesionTipoActual === t.id && !lesionBorrador ? "active" : ""}" data-tipo="${t.id}" style="--chip:${t.color}">
      <span class="lesion-dot"></span>${t.label}
    </button>`).join("");
  cont.querySelectorAll("[data-tipo]").forEach(b => b.addEventListener("click", () => {
    lesionTipoActual = b.dataset.tipo;
    lesionBorrador = false;
    refreshChips();
    syncBorradorUI();
  }));
}

function refreshChips() {
  renderLesionChips(document.getElementById("lesionTipos"));
  renderLesionChips(document.getElementById("lesionChipsExtrem"));
  renderLesionChips(document.getElementById("columnaTipos"));
}

function syncBorradorUI() {
  const b1 = document.getElementById("btnEvalBorrador");
  const b2 = document.getElementById("btnEvalExtremBorrador");
  const b3 = document.getElementById("btnColumnaBorrador");
  if (b1) b1.classList.toggle("active", lesionBorrador);
  if (b2) b2.classList.toggle("active", lesionBorrador);
  if (b3) b3.classList.toggle("active", lesionBorrador);
}

const ZONAS_EVAL_PLANTILLA = {
  cabeza:      { forma: "circle",   cx: 0.5,   cy: 0.075, r: 0.065 },
  cuello:      { forma: "rect",     x: 0.43,   y: 0.135,  w: 0.14,  h: 0.055, rx: 0.02 },
  hombroIzq:   { forma: "circle",   cx: 0.27,  cy: 0.215, r: 0.035 },
  hombroDer:   { forma: "circle",   cx: 0.73,  cy: 0.215, r: 0.035 },
  pecho:       { forma: "rect",     x: 0.31,  y: 0.235,  w: 0.38,  h: 0.125, rx: 0.02 },
  abdomen:     { forma: "rect",     x: 0.33,  y: 0.375,  w: 0.34,  h: 0.085, rx: 0.02 },
  cadera:      { forma: "rect",     x: 0.30,  y: 0.47,   w: 0.40,  h: 0.10, rx: 0.02 },
  brazoIzq:    { forma: "circle",   cx: 0.19,  cy: 0.335, r: 0.018 },
  antebrazoIzq:{ forma: "circle",   cx: 0.155, cy: 0.43,  r: 0.018 },
  munecaIzq:   { forma: "circle",   cx: 0.152, cy: 0.49,  r: 0.018 },
  manoIzq:     { forma: "circle",   cx: 0.10,  cy: 0.565, r: 0.045 },
  brazoDer:    { forma: "circle",   cx: 0.81,  cy: 0.335, r: 0.018 },
  antebrazoDer:{ forma: "circle",   cx: 0.845, cy: 0.43,  r: 0.018 },
  munecaDer:   { forma: "circle",   cx: 0.848, cy: 0.49,  r: 0.018 },
  manoDer:     { forma: "circle",   cx: 0.90,  cy: 0.565, r: 0.045 },
  musloIzq:    { forma: "circle",   cx: 0.40,  cy: 0.62,  r: 0.035 },
  musloDer:    { forma: "circle",   cx: 0.60,  cy: 0.62,  r: 0.035 },
  rodillaIzq:  { forma: "circle",   cx: 0.40,  cy: 0.71,  r: 0.035 },
  rodillaDer:  { forma: "circle",   cx: 0.60,  cy: 0.71,  r: 0.035 },
  tobilloIzq:  { forma: "circle",   cx: 0.4025, cy: 0.90,  r: 0.03 },
  tobilloDer:  { forma: "circle",   cx: 0.5975, cy: 0.90,  r: 0.03 },
  pieIzq:      { forma: "ellipse",  cx: 0.40,  cy: 0.975, rx: 0.09, ry: 0.045 },
  pieDer:      { forma: "ellipse",  cx: 0.60,  cy: 0.975, rx: 0.09, ry: 0.045 }
};

function redond(v) {
  return Math.round(v * 10) / 10;
}

function procesarFigura(src, cb) {
  const img = new Image();
  img.onload = function () {
    try {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, W, H).data;
      let rsum = 0, gsum = 0, bsum = 0, cont = 0;
      const toma = function (x, y) {
        const i = (y * W + x) * 4;
        if (data[i + 3] > 180) {
          rsum += data[i];
          gsum += data[i + 1];
          bsum += data[i + 2];
          cont++;
        }
      };
      for (let x = 0; x < W; x++) { toma(x, 0); toma(x, H - 1); }
      for (let y = 0; y < H; y++) { toma(0, y); toma(W - 1, y); }
      let bgR = 255, bgG = 255, bgB = 255;
      if (cont >= 15) {
        bgR = rsum / cont;
        bgG = gsum / cont;
        bgB = bsum / cont;
      }
      const out = ctx.createImageData(W, H);
      const od = out.data;
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const a0 = data[i + 3];
          od[i] = data[i];
          od[i + 1] = data[i + 1];
          od[i + 2] = data[i + 2];
          od[i + 3] = a0;
          if (a0 < 12) continue;
          const dd = Math.max(
            Math.abs(data[i] - bgR),
            Math.abs(data[i + 1] - bgG),
            Math.abs(data[i + 2] - bgB)
          );
          let al = a0;
          if (dd <= 34) al = 0;
          else if (dd < 76) al = Math.round(255 * (dd - 34) / 42);
          else al = 255;
          od[i + 3] = al;
          if (al > 90) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      ctx.putImageData(out, 0, 0);
      if (maxX <= minX || maxY <= minY) {
        minX = 0; minY = 0; maxX = W - 1; maxY = H - 1;
      }
      const bbox = { bx: minX, by: minY, bw: maxX - minX + 1, bh: maxY - minY + 1 };
      cb({ src: c.toDataURL("image/png"), w: W, h: H, bbox: bbox });
    } catch (e) {
      cb(null);
    }
  };
  img.onerror = function () { cb(null); };
  img.src = src;
}

function generarZonasInfo(info, plantilla) {
  const pl = plantilla || ZONAS_EVAL_PLANTILLA;
  const W = info.w;
  const H = info.h;
  const bw = info.bbox.bw || W;
  const bh = info.bbox.bh || H;
  const bx = info.bbox.bx || 0;
  const by = info.bbox.by || 0;
  const X = function (fx) { return bx + fx * bw; };
  const Y = function (fy) { return by + fy * bh; };
  const out = {};
  Object.keys(pl).forEach(function (part) {
    const z = pl[part];
    if (z.forma === "circle") {
      out[part] = { forma: z.forma, cx: redond(X(z.cx)), cy: redond(Y(z.cy)), r: redond(z.r * bh) };
    } else if (z.forma === "ellipse") {
      out[part] = { forma: z.forma, cx: redond(X(z.cx)), cy: redond(Y(z.cy)), rx: redond(z.rx * bw), ry: redond(z.ry * bh) };
    } else {
      out[part] = { forma: z.forma, x: redond(X(z.x)), y: redond(Y(z.y)), w: redond(z.w * bw), h: redond(z.h * bh), rx: redond(Math.min(z.rx * bw, z.rx * bh * 2)) };
    }
  });
  return out;
}

function zonaSVG(g, part, extra) {
  if (g.forma === "circle") {
    return `<circle class="eval-part" data-part="${part}" ${extra} cx="${g.cx}" cy="${g.cy}" r="${g.r}"/>`;
  }
  if (g.forma === "ellipse") {
    return `<ellipse class="eval-part" data-part="${part}" ${extra} cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}"/>`;
  }
  return `<rect class="eval-part" data-part="${part}" ${extra} x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${g.rx}"/>`;
}

function zonaCentro(g) {
  if (g.forma === "circle") return { x: g.cx, y: g.cy };
  if (g.forma === "ellipse") return { x: g.cx, y: g.cy };
  return { x: g.x + g.w / 2, y: g.y + g.h / 2 };
}

function construirZonas(svg, info, plantilla) {
  if (!svg) return null;
  const geom = generarZonasInfo(info, plantilla);
  const W = info.w, H = info.h;
  const nombres = NOMBRES_PARTES || {};
  const claves = Object.keys(geom);
  const largos = claves.map(p => (nombres[p] || p).length);
  const anchoMayor = Math.max.apply(null, largos) || 10;
  const aCoef = Math.max(8, anchoMayor) * 0.55;
  const cont = svg.parentElement;
  const raiz = cont && cont.parentElement ? cont.parentElement : cont;
  let cw = (raiz ? raiz.clientWidth : 0) || (cont ? cont.clientWidth : 0) || (svg.getBoundingClientRect ? svg.getBoundingClientRect().width : 0);
  cw = Math.max(320, Math.round(cw));
  const maxH = Math.max(520, Math.round((window.innerHeight || 900) * 1.15));
  let fs = Math.max(13, Math.min(22, Math.round((cw * 0.20 - 24) / aCoef)));
  let G = Math.max(64, Math.round(aCoef * fs + 12));
  let iw = cw - 2 * G;
  if (iw < Math.round(cw * 0.5)) {
    const fs2 = Math.max(11, Math.round((cw * 0.26 - 24) / aCoef));
    fs = Math.min(fs, fs2);
    G = Math.max(64, Math.round(aCoef * fs + 12));
    iw = cw - 2 * G;
  }
  if (iw < 120) iw = Math.round(cw * 0.5);
  let ih = Math.round(iw * H / W);
  if (ih > maxH) { ih = maxH; iw = Math.round(ih * W / H); }
  const ox = Math.max(2, Math.round((cw - iw) / 2));
  const sx = iw / W, sy = ih / H;
  const lista = claves.map(part => {
    const c = zonaCentro(geom[part]);
    return { part: part, cx: c.x, cy: c.y };
  });
  const izquierda = [], derecha = [];
  lista.forEach(o => {
    if (o.cx < W * 0.5) izquierda.push(o);
    else derecha.push(o);
  });
  const distribuir = function (arr) {
    arr.sort((a, b) => a.cy - b.cy);
    const n = arr.length;
    const yIni = fs, yFin = ih - fs;
    arr.forEach((o, i) => {
      o.ly = n > 1 ? Math.round(yIni + (i * (yFin - yIni)) / (n - 1)) : Math.round((yIni + yFin) / 2);
    });
  };
  distribuir(izquierda);
  distribuir(derecha);
  const rDot = Math.max(4, Math.round(fs * 0.28));
  const rDotExt = Math.max(6, Math.round(fs * 0.45));
  const esParteGrande = function (part) {
    return PUNTOS_FOTO.indexOf(part) !== -1 || /^(muslo|rodilla|tobillo)/.test(part);
  };
  const kneeL = Math.round(ox);
  const kneeR = Math.round(ox + iw);
  const txL = 10;
  const txR = cw - 10;
  const imgHtml = `<image x="${ox}" y="0" width="${iw}" height="${ih}" href="${info.src}"/>`;
  let linesHtml = "", dotsHtml = "", labelsHtml = "";
  const emitir = function (o, lado) {
    const px = Math.round(ox + o.cx * sx), py = Math.round(o.cy * sy), ly = o.ly;
    const knee = lado === "L" ? kneeL : kneeR;
    dotsHtml += `<circle class="eval-part eval-punto" data-part="${o.part}" cx="${px}" cy="${py}" r="${esParteGrande(o.part) ? rDotExt : rDot}"/>`;
    labelsHtml += `<text class="eval-zone-label" data-part="${o.part}" x="${lado === "L" ? txL : txR}" y="${ly}" font-size="${fs}" text-anchor="${lado === "L" ? "start" : "end"}" dominant-baseline="central">${nombres[o.part] || o.part}</text>`;
    linesHtml += `<polyline class="eval-callout-line" points="${px},${py} ${knee},${py} ${knee},${ly} ${lado === "L" ? txL + 8 : txR - 8},${ly}"/>`;
  };
  izquierda.forEach(o => emitir(o, "L"));
  derecha.forEach(o => emitir(o, "R"));
  svg.setAttribute("width", cw);
  svg.setAttribute("height", ih);
  svg.setAttribute("viewBox", "0 0 " + cw + " " + ih);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.innerHTML = imgHtml + linesHtml + dotsHtml + labelsHtml;
  svg.querySelectorAll(".eval-part, .eval-zone-label").forEach(function (el) {
    el.addEventListener("click", function () { marcarParte(el.dataset.part); });
  });
  return geom;
}

function initFiguras() {
  const tareas = [
    { src: "evaluacion_M.png", imagen: "evalImgMasculino", zonas: "svgZonasMasculino", sexo: "masculino" },
    { src: "evaluacion_f.png", imagen: "evalImgFemenino", zonas: "svgZonasFemenino", sexo: "femenino" }
  ];
  tareas.forEach(function (t) {
    const img = document.getElementById(t.imagen);
    const svg = document.getElementById(t.zonas);
    if (!img || !svg) return;
    procesarFigura(t.src, function (info) {
      if (!info) return;
      cacheFiguras[t.sexo] = info;
      img.src = info.src;
      construirZonas(svg, info);
      colorearPartes();
    });
  });
}

function svgEvaluacionResultado(info, lesiones) {
  const geom = generarZonasInfo(info);
  const partes = Object.keys(geom).map(function (part) {
    const le = normLesiones(lesiones[part]);
    const col = le.length ? le[0].color : null;
    const g = geom[part];
    const fill = col || "transparent";
    const op = col ? 0.55 : 0;
    const stroke = col ? oscurecerColor(col, 0.72) : "rgba(30, 50, 80, 0.4)";
    const extra = `fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${col ? 2.5 : 1}"`;
    return zonaSVG(g, part, extra);
  }).join("");
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${info.w} ${info.h}"><image x="0" y="0" width="${info.w}" height="${info.h}" href="${info.src}"/>${partes}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
}

function verEvaluacion(id) {
  const ev = State.evaluaciones.find(e => e.id === id);
  if (!ev) return;
  const p = State.pacientes.find(x => x.id === ev.pacienteId);
  const info = cacheFiguras[ev.sexo] || cacheFiguras.masculino || cacheFiguras.femenino || null;
  const titulo = document.getElementById("evalResultadoTitulo");
  if (titulo) titulo.textContent = etiquetaPacienteHistorial(ev.pacienteId).nombre + " · " + fmtFechaES(ev.fecha || "");
  const img = document.getElementById("evalResultadoImg");
  if (img) img.src = info ? svgEvaluacionResultado(info, ev.lesiones || {}) : "";
  const leyenda = document.getElementById("evalResultadoLeyenda");
  if (leyenda) {
    const claves = Object.keys(ev.lesiones || {});
    const filas = [];
    claves.forEach(k => normLesiones(ev.lesiones[k]).forEach(l => filas.push({ k, l })));
    leyenda.innerHTML = filas.length
      ? filas.map(f => `<span class="eval-leyenda-item"><span class="lesion-dot" style="background:${f.l.color};--chip:${f.l.color}"></span>${NOMBRES_PARTES[f.k] || f.k} · ${f.l.label}</span>`).join("")
      : `<span class="empty">Sin zonas marcadas.</span>`;
  }
  const nota = document.getElementById("evalResultadoNota");
  if (nota) nota.textContent = ev.nota || "Sin descripción.";
  abrirModal("modalEvalResultado");
}

const ZONAS_MANO_PLANTILLA = [
  { part: "meniqueA3", fx: 0.14, fy: 0.16, r: 0.03 },
  { part: "meniqueA2", fx: 0.14, fy: 0.27, r: 0.03 },
  { part: "meniqueA1", fx: 0.14, fy: 0.38, r: 0.03 },
  { part: "anularA3",  fx: 0.30, fy: 0.12, r: 0.03 },
  { part: "anularA2",  fx: 0.30, fy: 0.23, r: 0.03 },
  { part: "anularA1",  fx: 0.30, fy: 0.35, r: 0.03 },
  { part: "medioA3",   fx: 0.46, fy: 0.10, r: 0.03 },
  { part: "medioA2",   fx: 0.46, fy: 0.21, r: 0.03 },
  { part: "medioA1",   fx: 0.46, fy: 0.33, r: 0.03 },
  { part: "indiceA3",  fx: 0.62, fy: 0.12, r: 0.03 },
  { part: "indiceA2",  fx: 0.62, fy: 0.23, r: 0.03 },
  { part: "indiceA1",  fx: 0.62, fy: 0.35, r: 0.03 },
  { part: "pulgarA2",  fx: 0.80, fy: 0.20, r: 0.03 },
  { part: "pulgarA1",  fx: 0.80, fy: 0.31, r: 0.03 },
  { part: "radio",     el: true, fx: 0.475, fy: 0.90, rx: 0.20, ry: 0.08 },
  { part: "palma",     el: true, fx: 0.475, fy: 0.625, rx: 0.30, ry: 0.225 }
];

function perfilMano(img) {
  const W = img.naturalWidth || 400;
  const H = img.naturalHeight || 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, W, H).data;
  let rsum = 0, gsum = 0, bsum = 0, cont = 0;
  const toma = function (x, y) {
    const i = (y * W + x) * 4;
    if (px[i + 3] > 180) { rsum += px[i]; gsum += px[i + 1]; bsum += px[i + 2]; cont++; }
  };
  for (let x = 0; x < W; x++) { toma(x, 0); toma(x, H - 1); }
  for (let y = 0; y < H; y++) { toma(0, y); toma(W - 1, y); }
  let bgR = 255, bgG = 255, bgB = 255;
  if (cont >= 15) { bgR = rsum / cont; bgG = gsum / cont; bgB = bsum / cont; }
  const fg = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    const dd = Math.max(Math.abs(px[p] - bgR), Math.abs(px[p + 1] - bgG), Math.abs(px[p + 2] - bgB));
    fg[i] = (px[p + 3] >= 30 && dd >= 40) ? 1 : 0;
  }
  return { W: W, H: H, fg: fg };
}

function detectarDedos(img) {
  try {
    const P = perfilMano(img);
    const W = P.W, H = P.H, fg = P.fg;
    const topY = new Array(W);
    for (let x = 0; x < W; x++) {
      let ty = H;
      for (let y = 0; y < H; y++) { if (fg[y * W + x]) { ty = y; break; } }
      topY[x] = ty;
    }
    const sm = new Array(W);
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W) { s += topY[xx]; n++; }
      }
      sm[x] = s / n;
    }
    const mins = [];
    for (let x = 1; x < W - 1; x++) {
      if (sm[x] < H && sm[x] <= sm[x - 1] && sm[x] <= sm[x + 1]) mins.push({ x: x, y: sm[x] });
    }
    if (mins.length < 4) return null;
    mins.sort(function (a, b) { return a.y - b.y; });
    const radio = Math.max(6, Math.round(W * 0.06));
    const clus = [];
    mins.forEach(function (m) {
      let f = null;
      clus.forEach(function (cl) {
        if (!f && cl.items.some(function (it) { return Math.abs(it.x - m.x) <= radio; })) f = cl;
      });
      if (f) { f.items.push(m); if (m.y < f.tipY) f.tipY = m.y; }
      else clus.push({ items: [m], tipY: m.y });
    });
    clus.sort(function (a, b) { return a.tipY - b.tipY; });
    const fingerClusters = clus.slice(0, 5);
    if (fingerClusters.length < 4) return null;
    const enDedo = {};
    fingerClusters.forEach(function (cl) {
      const cx = Math.round(cl.items.reduce(function (s, it) { return s + it.x; }, 0) / cl.items.length);
      for (let x = cx - Math.round(W * 0.035); x <= cx + Math.round(W * 0.035); x++) {
        if (x >= 0 && x < W) enDedo[x] = true;
      }
    });
    const gaps = [];
    for (let x = 0; x < W; x++) {
      if (topY[x] < H && !enDedo[x]) gaps.push(topY[x]);
    }
    let palmTop = Math.round(H * 0.4);
    if (gaps.length > 10) {
      gaps.sort(function (a, b) { return a - b; });
      palmTop = gaps[Math.floor(gaps.length * 0.5)];
    }
    if (palmTop <= 0 || palmTop >= H) palmTop = Math.round(H * 0.4);
    const dedos = fingerClusters.map(function (cl) {
      return { x: Math.round(cl.items.reduce(function (s, it) { return s + it.x; }, 0) / cl.items.length), tip: cl.tipY };
    });
    return { W: W, H: H, dedos: dedos, palmTop: palmTop };
  } catch (e) {
    return null;
  }
}

function marcasMano(det, lado, W, H) {
  const s = lado === "izq" ? "Izq" : "Der";
  const salida = [];
  if (!det || !det.dedos || det.dedos.length < 4) {
    ZONAS_MANO_PLANTILLA.forEach(function (z) {
      const cx = z.fx * W;
      const cy = z.fy * H;
      if (z.el) {
        salida.push({ part: z.part + s, cx: redond(cx), cy: redond(cy), rx: redond(z.rx * W), ry: redond(z.ry * H), el: true });
      } else {
        salida.push({ part: z.part + s, cx: redond(cx), cy: redond(cy), r: redond(z.r * H) });
      }
    });
    return salida;
  }
  const ordenDer = ["pulgar", "indice", "medio", "anular", "menique"];
  const ordenIzq = ["menique", "anular", "medio", "indice", "pulgar"];
  const tabla = lado === "izq" ? ordenIzq : ordenDer;
  const orden = det.dedos.slice().sort(function (a, b) { return a.x - b.x; });
  orden.forEach(function (f, i) {
    const nombre = tabla[i] || "indice";
    const len = Math.max(4, det.palmTop - f.tip);
    const cuantas = nombre === "pulgar" ? 2 : 3;
    for (let k = 1; k <= cuantas; k++) {
      const frac = k / (cuantas + 1);
      const cy = Math.round(f.tip + len * frac);
      salida.push({ part: nombre + "A" + k + s, cx: f.x, cy: cy, r: Math.max(5, Math.round(H * 0.02)) });
    }
  });
  const cyP = Math.round(det.palmTop + (H - det.palmTop) * 0.42);
  salida.push({ part: "palma" + s, cx: Math.round(W * 0.5), cy: cyP, rx: Math.round(W * 0.34), ry: Math.round((H - det.palmTop) * 0.30), el: true });
  const cyR = Math.round(det.palmTop + (H - det.palmTop) * 0.80);
  salida.push({ part: "radio" + s, cx: Math.round(W * 0.5), cy: cyR, rx: Math.round(W * 0.22), ry: Math.round((H - det.palmTop) * 0.10), el: true });
  return salida;
}

function marcasPie(det, lado, W, H) {
  const s = lado === "izq" ? "Izq" : "Der";
  if (!det || !det.dedos || det.dedos.length < 4) {
    return marcasPiePlantilla(lado, W, H);
  }
  const ordenDer = ["dedo1", "dedo2", "dedo3", "dedo4", "dedo5"];
  const ordenIzq = ["dedo5", "dedo4", "dedo3", "dedo2", "dedo1"];
  const tabla = lado === "izq" ? ordenIzq : ordenDer;
  const orden = det.dedos.slice().sort(function (a, b) { return a.x - b.x; });
  const salida = [];
  const rDedo = Math.max(4, Math.round(H * 0.015));
  let b = det.palmTop;
  if (!b || b < det.dedos[0].tip + H * 0.08) b = Math.round(H * 0.42);
  const zona = H - b;
  const medial = lado === "izq" ? Math.round(W * 0.60) : Math.round(W * 0.40);
  const lateral = lado === "izq" ? Math.round(W * 0.40) : Math.round(W * 0.60);
  function el(clave, cx, cy, rx, ry) {
    salida.push({ part: clave + s, cx: Math.round(cx), cy: Math.round(cy), rx: Math.round(rx), ry: Math.round(ry), el: true });
  }
  orden.forEach(function (f, i) {
    const nombre = tabla[i] || "dedo3";
    const len = Math.max(6, b - f.tip);
    let marcas;
    if (nombre === "dedo1") {
      marcas = [
        { nombre: "Distal", frac: 0.25 },
        { nombre: "Proximal", frac: 0.78 }
      ];
    } else {
      marcas = [
        { nombre: "Distal", frac: 0.18 },
        { nombre: "Intermedia", frac: 0.5 },
        { nombre: "Proximal", frac: 0.78 }
      ];
    }
    marcas.forEach(function (m) {
      let cy = Math.round(f.tip + len * m.frac);
      cy = Math.min(cy, Math.round(b - rDedo));
      salida.push({ part: nombre + m.nombre + s, cx: f.x, cy: cy, r: rDedo });
    });
  });
  el("metatarso", W * 0.5, b + zona * 0.24, W * 0.22, zona * 0.07);
  el("cuneiformes", medial, b + zona * 0.36, W * 0.085, zona * 0.055);
  el("escafoides", medial, b + zona * 0.48, W * 0.095, zona * 0.05);
  el("cuboides", lateral, b + zona * 0.44, W * 0.095, zona * 0.05);
  el("astragalo", W * 0.5, b + zona * 0.60, W * 0.10, zona * 0.05);
  el("planta", W * 0.5, b + zona * 0.68, W * 0.20, zona * 0.07);
  el("calcaneo", W * 0.5, b + zona * 0.84, W * 0.16, zona * 0.06);
  return salida;
}



const ZONAS_PIE_PLANTILLA = {
  dedos: [
    { part: "dedo1", fx: 0.80, nFx: 0.20, tip: 0.055, distal: 0.05, prox: 0.205 },
    { part: "dedo2", fx: 0.665, nFx: 0.335, tip: 0.05, d1: 0.05, d2: 0.135, d3: 0.22 },
    { part: "dedo3", fx: 0.535, nFx: 0.465, tip: 0.05, d1: 0.05, d2: 0.135, d3: 0.22 },
    { part: "dedo4", fx: 0.40, nFx: 0.60, tip: 0.055, d1: 0.055, d2: 0.14, d3: 0.225 },
    { part: "dedo5", fx: 0.27, nFx: 0.73, tip: 0.065, d1: 0.06, d2: 0.145, d3: 0.23 }
  ],
  zonas: [
    { part: "metatarso", cx: 0.50, cy: 0.42, rx: 0.27, ry: 0.055 },
    { part: "cuneiformes", cx: 0.665, cy: 0.46, nCx: 0.335, rx: 0.09, ry: 0.055 },
    { part: "escafoides", cx: 0.665, cy: 0.545, nCx: 0.335, rx: 0.095, ry: 0.05 },
    { part: "astragalo", cx: 0.50, cy: 0.585, rx: 0.105, ry: 0.05 },
    { part: "cuboides", cx: 0.335, cy: 0.545, nCx: 0.665, rx: 0.095, ry: 0.05 },
    { part: "planta", cx: 0.50, cy: 0.70, rx: 0.26, ry: 0.065 },
    { part: "calcaneo", cx: 0.50, cy: 0.855, rx: 0.20, ry: 0.06 }
  ]
};

function marcasPiePlantilla(lado, W, H) {
  const s = lado === "izq" ? "Izq" : "Der";
  const esqIzq = lado === "izq";
  const mediaX = esqIzq ? function (fx) { return 1 - fx; } : function (fx) { return fx; };
  const salida = [];
  const rDedo = Math.max(4, Math.round(H * 0.018));
  ZONAS_PIE_PLANTILLA.dedos.forEach(function (d) {
    const fx = esqIzq ? d.nFx : d.fx;
    const cx = fx * W;
    const marcas = [
      { nombre: "Distal", f: d.d1 || d.distal },
      { nombre: "Proximal", f: d.d3 || d.prox }
    ];
    if (d.d2) marcas.splice(1, 0, { nombre: "Intermedia", f: d.d2 });
    marcas.forEach(function (m) {
      salida.push({ part: d.part + m.nombre + s, cx: Math.round(cx), cy: Math.round(m.f * H), r: rDedo });
    });
  });
  ZONAS_PIE_PLANTILLA.zonas.forEach(function (z) {
    const cx = z.nCx ? mediaX(z.cx) : z.cx;
    salida.push({ part: z.part + s, cx: Math.round(cx * W), cy: Math.round(z.cy * H), rx: Math.round(z.rx * W), ry: Math.round(z.ry * H), el: true });
  });
  return salida;
}

function etiquetaExtremidad(part) {
  const p = String(part).replace(/(Izq|Der)$/, "");
  const mapa = {
    palma: "PALMA", radio: "MUÑECA", metatarso: "METATARSO", cuneiformes: "CUNEIFORMES",
    escafoides: "ESCAFOIDES", astragalo: "ASTRÁGALO", cuboides: "CUBOIDES",
    planta: "PLANTA", calcaneo: "CALCÁNEO", pulgar: "PULGAR", indice: "ÍNDICE",
    medio: "MEDIO", anular: "ANULAR", menique: "MEÑIQUE", dedo1: "DEDO GORDO",
    dedo2: "DEDO 2", dedo3: "DEDO 3", dedo4: "DEDO 4", dedo5: "DEDO 5"
  };
  if (mapa[p]) return mapa[p];
  if (/^pulgarA1/.test(p)) return "PULGAR ART 1";
  if (/^pulgarA2/.test(p)) return "PULGAR ART 2";
  const m = p.match(/^(indice|medio|anular|menique)A([123])$/);
  if (m) return (mapa[m[1]] || m[1]) + " ART " + m[2];
  const d = p.match(/^(dedo[1-5])(Distal|Intermedia|Proximal)$/);
  if (d) return (mapa[d[1]] || d[1]) + " " + (d[2] === "Intermedia" ? "INTERM" : d[2].toUpperCase());
  return NOMBRES_PARTES[part] || p;
}

function construirExtremidadSvg(svg, src, W, H, marcas) {
  if (!svg) return;
  const nombres = NOMBRES_PARTES || {};
  const raiz = svg.parentElement;
  let cw = raiz ? raiz.clientWidth : 0;
  if (cw < 120) {
    requestAnimationFrame(function () { construirExtremidadSvg(svg, src, W, H, marcas); });
    return;
  }
  cw = Math.max(420, Math.round(cw));
  const maxH = Math.max(640, Math.round((window.innerHeight || 800) * 1.0));
  const largos = marcas.map(function (m) { return etiquetaExtremidad(m.part).length; });
  const anchoMayor = Math.max.apply(null, largos) || 12;
  const aCoef = Math.max(7, anchoMayor) * 0.42;
  let fs = Math.max(7, Math.min(11, Math.round((cw * 0.24 - 26) / aCoef)));
  let G = Math.max(10, Math.round(aCoef * fs + 14));
  let iw = cw - 2 * G;
  if (iw < Math.round(cw * 0.6)) {
    const fs2 = Math.max(6, Math.round((cw * 0.28 - 26) / aCoef));
    fs = Math.min(fs, fs2);
    G = Math.max(10, Math.round(aCoef * fs + 14));
    iw = cw - 2 * G;
  }
  if (iw < 140) iw = Math.round(cw * 0.6);
  let ih = Math.round(iw * H / W);
  if (ih > maxH) { ih = maxH; iw = Math.round(ih * W / H); }
  const maxEsp = Math.round((maxH * 0.98) * W / H);
  if (iw > maxEsp) iw = maxEsp;
  ih = Math.round(iw * H / W);
  const ox = Math.max(2, Math.round((cw - iw) / 2));
  const sx = iw / W, sy = ih / H;
  const izquierda = [], derecha = [];
  marcas.forEach(function (o) {
    if (o.cx < W * 0.5) izquierda.push(o);
    else derecha.push(o);
  });
  const distribuir = function (arr) {
    arr.sort(function (a, b) { return a.cy - b.cy; });
    const n = arr.length;
    const yIni = fs, yFin = ih - fs;
    arr.forEach(function (o, i) {
      o.ly = n > 1 ? Math.round(yIni + (i * (yFin - yIni)) / (n - 1)) : Math.round((yIni + yFin) / 2);
    });
  };
  distribuir(izquierda);
  distribuir(derecha);
  const rDot = Math.max(4, Math.round(fs * 0.22));
  const kneeL = Math.round(ox);
  const kneeR = Math.round(ox + iw);
  const txL = 10;
  const txR = cw - 10;
  const imgHtml = `<image x="${ox}" y="0" width="${iw}" height="${ih}" href="${src}"/>`;
  let zonasHtml = "", linesHtml = "", dotsHtml = "", labelsHtml = "";
  const emitir = function (o, lad) {
    const px = Math.round(ox + o.cx * sx), py = Math.round(o.cy * sy), ly = o.ly;
    const knee = lad === "L" ? kneeL : kneeR;
    const txt = etiquetaExtremidad(o.part);
    if (o.el) {
      zonasHtml += `<ellipse class="eval-subpart" data-part="${o.part}" cx="${px}" cy="${py}" rx="${Math.max(2, Math.round(o.rx * sx))}" ry="${Math.max(2, Math.round(o.ry * sy))}" title="${nombres[o.part] || o.part}"/>`;
    }
    dotsHtml += `<circle class="eval-subpart eval-punto-ext" data-part="${o.part}" cx="${px}" cy="${py}" r="${rDot}" title="${nombres[o.part] || o.part}"/>`;
    labelsHtml += `<text class="eval-callout-txt" data-part="${o.part}" x="${lad === "L" ? txL : txR}" y="${ly}" font-size="${fs}" text-anchor="${lad === "L" ? "start" : "end"}" dominant-baseline="central">${txt}</text>`;
    linesHtml += `<polyline class="eval-callout-line" points="${px},${py} ${knee},${py} ${knee},${ly} ${lad === "L" ? txL + 8 : txR - 8},${ly}"/>`;
  };
  izquierda.forEach(function (o) { emitir(o, "L"); });
  derecha.forEach(function (o) { emitir(o, "R"); });
  svg.setAttribute("width", cw);
  svg.setAttribute("height", ih);
  svg.setAttribute("viewBox", "0 0 " + cw + " " + ih);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.innerHTML = imgHtml + zonasHtml + linesHtml + dotsHtml + labelsHtml;
  svg.querySelectorAll(".eval-subpart, .eval-callout-txt").forEach(function (el) {
    el.addEventListener("click", function () {
      if (el.dataset.part) marcarParte(el.dataset.part);
    });
  });
  colorearPartes();
}

function renderExtremidadFoto(caja, tipo, lado) {
  const esMano = tipo === "mano";
  const src = esMano
    ? (lado === "izq" ? "mano_izq.png" : "mano_der.png")
    : (lado === "izq" ? "pie_izq.png" : "pie_der.png");
  const alt = (esMano ? "Mano " : "Pie ") + (lado === "izq" ? "izquierdo" : "derecho");
  caja.innerHTML = `<div class="eval-extrem-foto">
    <img id="evalExtremImg" class="eval-extrem-img-mide" src="${src}" alt="${alt}" hidden style="display:none" />
    <svg id="evalExtremHit" class="eval-hitlayer eval-diagram eval-extrem-silueta" xmlns="http://www.w3.org/2000/svg"></svg>
  </div>`;
  const img = document.getElementById("evalExtremImg");
  const hit = document.getElementById("evalExtremHit");
  const dibujar = function () {
    const W = img.naturalWidth || 400;
    const H = img.naturalHeight || 400;
    let det = null;
    try { det = detectarDedos(img); } catch (e) { det = null; }
    const marcas = esMano ? marcasMano(det, lado, W, H) : marcasPie(det, lado, W, H);
    construirExtremidadSvg(hit, src, W, H, marcas);
  };
  if (img.complete && img.naturalWidth) dibujar();
  else img.onload = dibujar;
  img.onerror = dibujar;
}

function svgPie(lado) {
  const s = lado === "izq" ? "Izq" : "Der";
  const giro = lado === "der" ? ' transform="translate(220 0) scale(-1 1)"' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 260" class="eval-extrem-svg-svg"><g${giro}>
    <circle class="eval-subpart" data-part="dedo1${s}" cx="165" cy="105" r="22"/>
    <circle class="eval-subpart" data-part="dedo2${s}" cx="126" cy="100" r="22"/>
    <circle class="eval-subpart" data-part="dedo3${s}" cx="104" cy="100" r="22"/>
    <circle class="eval-subpart" data-part="dedo4${s}" cx="82" cy="104" r="22"/>
    <circle class="eval-subpart" data-part="dedo5${s}" cx="62" cy="110" r="20"/>
    <ellipse class="eval-subpart" data-part="planta${s}" cx="112" cy="180" rx="72" ry="56"/>
    <ellipse class="eval-subpart" data-part="calcaneo${s}" cx="112" cy="228" rx="52" ry="30"/>
  </g></svg>`;
}

function keysExtremidad() {
  if (!extremidadActiva) return { keys: [], main: "" };
  const s = extremidadActiva.lado === "izq" ? "Izq" : "Der";
  const base = extremidadActiva.tipo === "mano"
    ? ["pulgarA1", "pulgarA2", "indiceA1", "indiceA2", "indiceA3", "medioA1", "medioA2", "medioA3", "anularA1", "anularA2", "anularA3", "meniqueA1", "meniqueA2", "meniqueA3", "palma", "radio"]
    : ["dedo1Distal", "dedo1Proximal", "dedo2Distal", "dedo2Intermedia", "dedo2Proximal", "dedo3Distal", "dedo3Intermedia", "dedo3Proximal", "dedo4Distal", "dedo4Intermedia", "dedo4Proximal", "dedo5Distal", "dedo5Intermedia", "dedo5Proximal", "metatarso", "cuneiformes", "escafoides", "astragalo", "cuboides", "calcaneo", "planta"];
  return { keys: base.map(k => k + s), main: (extremidadActiva.tipo === "mano" ? "mano" : "pie") + s };
}

function abrirExtremidad(parte) {
  const cfg = EXTREM_POR_PARTE[parte];
  if (!cfg) return;
  extremidadActiva = cfg;
  const titulo = document.getElementById("evalExtremTítulo") || document.getElementById("evalExtremTitulo");
  if (titulo) titulo.textContent = (cfg.tipo === "mano" ? "Mano " : "Pie ") + (cfg.lado === "izq" ? "izquierdo" : "derecho");
  abrirModal("modalEvalExtremidad");
  const caja = document.getElementById("evalExtremSvg");
  if (caja) {
    renderExtremidadFoto(caja, cfg.tipo, cfg.lado);
  }
  refreshChips();
  syncBorradorUI();
  renderExtremPartes();
}

function renderExtremPartes() {
  const cont = document.getElementById("evalExtremPartes");
  const contador = document.getElementById("evalExtremContador");
  if (!cont) return;
  const { keys } = keysExtremidad();
  const marcadas = keys.filter(k => normLesiones(lesionesEval[k]).length);
  if (contador) contador.textContent = marcadas.length;
  const filas = [];
  marcadas.forEach(k => normLesiones(lesionesEval[k]).forEach(l => filas.push({ k, l })));
  if (!filas.length) {
    cont.innerHTML = `<p class="empty">Sin marcas en esta extremidad.</p>`;
    return;
  }
  cont.innerHTML = filas.map(f => `
      <div class="eval-parte">
        <span class="lesion-dot" style="background:${f.l.color};--chip:${f.l.color}"></span>
        <span class="eval-parte-nombre">${NOMBRES_PARTES[f.k] || f.k} · ${f.l.label}</span>
        <button type="button" class="btn-icon danger" data-quitar-sub="${f.k}" data-quitar-tipo="${f.l.id}" title="Quitar">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>`).join("");
  cont.querySelectorAll("[data-quitar-sub]").forEach(b => b.addEventListener("click", () => {
    quitarTipoLesion(b.dataset.quitarSub, b.dataset.quitarTipo);
    colorearPartes();
    renderExtremPartes();
    renderPartesAfectadas();
  }));
}

function marcarExtremidadCompleta() {
  if (!extremidadActiva) return;
  const { keys, main } = keysExtremidad();
  const t = TIPOS_LESION.find(x => x.id === lesionTipoActual);
  if (lesionBorrador) {
    keys.forEach(k => delete lesionesEval[k]);
    delete lesionesEval[main];
  } else if (t) {
    keys.forEach(k => agregarTipoLesion(k, t));
    agregarTipoLesion(main, t);
  }
  colorearPartes();
  renderExtremPartes();
  renderPartesAfectadas();
}

function limpiarExtremidad() {
  if (!extremidadActiva) return;
  const { keys, main } = keysExtremidad();
  keys.forEach(k => delete lesionesEval[k]);
  delete lesionesEval[main];
  colorearPartes();
  renderExtremPartes();
  renderPartesAfectadas();
}

function fillRaPaciente() {
  const sel = document.getElementById("raPaciente");
  if (!sel) return;
  const anterior = Number(sel.value) || 0;
  sel.innerHTML = `<option value="">- Selecciona el paciente actual -</option>` + State.pacientes
    .filter(p => !p.eliminado)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`)
    .join("");
  if (anterior) sel.value = anterior;
}

function raPacienteId() {
  return Number(document.getElementById("raPaciente").value) || null;
}

function renderEvalPacienteActual() {
  const evalActual = document.getElementById("evalPacienteActual");
  if (!evalActual) return;
  const id = raPacienteId();
  const p = id ? State.pacientes.find(x => x.id === id) : null;
  evalActual.textContent = p ? `${p.nombre} (${p.codigo})` : "- Selecciona el paciente actual en el panel superior -";
  if (evalAutoSexo) aplicarAutoSexo("paciente");
}

function renderRegistroActual() {
  const id = raPacienteId();
  const p = id ? State.pacientes.find(x => x.id === id) : null;
  const silueta = document.getElementById("raSilueta");
  if (silueta) {
    if (p) {
      silueta.src = siluetaPerfilSexo(p.sexo);
      silueta.classList.remove("ra-silueta--vacio");
    } else {
      silueta.classList.add("ra-silueta--vacio");
    }
  }
  const cod = document.getElementById("raCodigo");
  if (cod) cod.textContent = p ? p.codigo : "-";
  const res = document.getElementById("raResumen");
  if (res) {
    res.textContent = p
      ? `${p.nombre} · ${p.sexo || "Sin sexo definido"}${p.edad ? " · Edad " + p.edad : ""} · Cédula: ${p.cedula || "-"} · Tel: ${p.telefono || "-"}`
      : "Selecciona el paciente actual para trabajar con él en todos los procesos.";
  }
  const mini = document.getElementById("raMiniNombre");
  if (mini) mini.textContent = p ? p.nombre : "";
  const chipPac = document.getElementById("topbarRaPaciente");
  if (chipPac) {
    chipPac.textContent = p
      ? (p.nombre || "Paciente") + (p.codigo ? " · " + p.codigo : "")
      : "Sin paciente";
  }
  const chip = document.getElementById("topbarRaChip");
  if (chip) chip.classList.toggle("topbar-ra-chip--vacio", !p);
  pacienteActual = id;
  renderEvalPacienteActual();
  sincronizarConPacienteActualImagenes();
  sincronizarConPacienteActualPros();
  sincronizarConPacienteActualCirugias();
}

function sincronizarConPacienteActualImagenes() {
  const id = raPacienteId();
  const secImagenes = document.getElementById("seccion-imagenes");
  const visorActivo = secImagenes ? secImagenes.classList.contains("active") : false;

  const estudioSel = document.getElementById("estudioPaciente");
  if (estudioSel && id != null) {
    const existe = Array.from(estudioSel.options).some(o => o.value === String(id));
    if (existe) estudioSel.value = String(id);
  }

  const visorSel = document.getElementById("imgPaciente");
  if (visorSel && id != null) {
    const existe = Array.from(visorSel.options).some(o => o.value === String(id));
    if (existe && visorSel.value !== String(id)) {
      visorSel.value = String(id);
      imgIndice = -1;
      if (visorActivo) renderVisorImagenes();
    }
  }
}

/* ============================================================
   CUESTIONARIOS PRO (Patient Reported Outcomes)
   Todos los valores se guardan normalizados 0-10, donde
   10 = síntomas o discapacidad máximos, 0 = mejor resultado.
   ============================================================ */
let prosRegistrado = false;

const CUESTIONARIOS_PRO = [
  {
    id: "womac",
    nombre: "WOMAC - Artrosis de rodilla/cadera",
    ref: "WOMAC 3.1 · 24 ítems (Dolor, Rigidez, Función) · Likert 0-4",
    tipo: "likert",
    opciones: ["Ninguno", "Ligero", "Moderado", "Severo", "Extremo"],
    grupos: [
      {
        titulo: "Dolor",
        instruccion: "¿Cuánto dolor tiene…",
        preguntas: [
          "Al caminar sobre una superficie plana",
          "Al subir o bajar escaleras",
          "Por la noche, en la cama",
          "Al estar sentado o acostado",
          "Al estar de pie"
        ]
      },
      {
        titulo: "Rigidez",
        instruccion: "¿Cuánta rigidez tiene…",
        preguntas: [
          "Por la mañana, al despertar",
          "Después de estar sentado, acostado o descansando durante el día"
        ]
      },
      {
        titulo: "Capacidad de realizar actividades",
        instruccion: "¿Cuánta dificultad tiene al…",
        preguntas: [
          "Bajar escaleras",
          "Subir escaleras",
          "Levantarse de una posición sentada",
          "Estar de pie",
          "Agacharse y recoger algo del suelo",
          "Caminar sobre una superficie plana",
          "Subir o bajarse de un carro",
          "Ir de compras",
          "Ponerse los calcetines o medias",
          "Levantarse de la cama",
          "Quitarse los calcetines o medias",
          "Acostarse en la cama",
          "Entrar y salir de la bañera",
          "Sentarse a descansar",
          "Subir o bajar del inodoro (WC)",
          "Realizar tareas domésticas pesadas",
          "Realizar tareas domésticas ligeras"
        ]
      }
    ]
  },
  {
    id: "lefs",
    nombre: "LEFS - Escala funcional de miembro inferior",
    ref: "LEFS · 20 ítems · 0-4 (invertido a 0-10 de dificultad)",
    tipo: "likert",
    invertir: true,
    opciones: ["Sin dificultad", "Poca dificultad", "Moderada dificultad", "Bastante dificultad", "Extrema dificultad / incapaz"],
    grupos: [
      {
        titulo: "Actividades",
        instruccion: "¿Cuánta dificultad tiene al…",
        preguntas: [
          "Hacer sus actividades habituales (trabajo, quehaceres o escuela)",
          "Practicar su principal pasatiempo, deporte o actividad recreativa",
          "Entrar o salir de la bañera o la ducha",
          "Caminar de un cuarto a otro",
          "Ponerse un par de zapatos o calcetines",
          "Ponerse en cuclillas",
          "Levantar un objeto del suelo (por ejemplo, una bolsa de compras)",
          "Realizar trabajos ligeros de la casa",
          "Realizar trabajos pesados de la casa",
          "Entrar o salir de un automóvil",
          "Caminar 2 cuadras",
          "Caminar 1 kilómetro",
          "Subir o bajar 10 escalones",
          "Estar de pie 1 hora",
          "Estar sentado 1 hora",
          "Correr sobre una superficie plana",
          "Correr sobre una superficie irregular",
          "Hacer giros bruscos o cambios de dirección al correr",
          "Saltar",
          "Girar o mantenerse estable sobre una sola pierna"
        ]
      }
    ]
  },
  {
    id: "oxford-rodilla",
    nombre: "Oxford Knee Score (OKS)",
    ref: "Oxford Knee Score · 12 ítems · 0-4",
    tipo: "likert",
    opciones: ["Nada / Sin dificultad", "Leve", "Moderado", "Severo", "Extremo / Incapaz"],
    grupos: [
      {
        titulo: "Rodilla",
        instruccion: "En las últimas 4 semanas…",
        preguntas: [
          "¿Cómo describiría el nivel de dolor de su rodilla?",
          "¿Ha tenido dificultad para lavarse o secarse?",
          "¿Ha tenido dificultad para entrar o salir de un automóvil?",
          "¿Cuánto tiempo ha podido caminar antes de que el dolor de rodilla sea severo?",
          "¿Ha podido subir las escaleras de forma normal?",
          "¿Ha podido arrodillarse y levantarse de nuevo?",
          "¿El dolor de rodilla le ha interrumpido el sueño por la noche?",
          "¿El dolor de rodilla ha interferido en su trabajo o quehaceres?",
          "¿Ha tenido la sensación de que su rodilla le falla (se le va)?",
          "¿Ha podido hacer sus compras de manera independiente?",
          "¿Ha podido bajar escaleras?",
          "¿Cuánto dolor ha tenido al caminar?"
        ]
      }
    ]
  },
  {
    id: "oxford-cadera",
    nombre: "Oxford Hip Score (OHS)",
    ref: "Oxford Hip Score · 12 ítems · 0-4",
    tipo: "likert",
    opciones: ["Nada / Sin dificultad", "Leve", "Moderado", "Severo", "Extremo / Incapaz"],
    grupos: [
      {
        titulo: "Cadera",
        instruccion: "En las últimas 4 semanas…",
        preguntas: [
          "¿Cómo describiría el nivel de dolor de su cadera?",
          "¿Ha tenido dificultad para lavarse o secarse solo/a?",
          "¿Ha tenido dificultad para entrar o salir de un automóvil o transporte público?",
          "¿Ha podido ponerse los calcetines, medias o zapatos?",
          "¿Ha podido hacer las compras de manera independiente?",
          "¿Cuánto tiempo ha podido caminar sobre una superficie plana antes de que le duela la cadera?",
          "¿Ha podido subir escaleras?",
          "¿Ha podido estar de pie el tiempo necesario para hacer las tareas del hogar?",
          "¿Ha cojeado a causa de la cadera?",
          "¿Ha tenido dolores repentinos e intensos (pinchazos) en la cadera?",
          "¿El dolor de cadera le ha interrumpido el sueño por la noche?",
          "¿El dolor de cadera ha interferido en su trabajo o quehaceres?"
        ]
      }
    ]
  },
  {
    id: "quickdash",
    nombre: "QuickDASH - Miembro superior",
    ref: "QuickDASH · 11 ítems · 0-4 (brazo, hombro y mano)",
    tipo: "likert",
    opciones: ["Sin dificultad / Ninguno", "Poca dificultad / Leve", "Moderado", "Bastante dificultad / Severo", "Incapaz / Extremo"],
    grupos: [
      {
        titulo: "Actividad y síntomas",
        instruccion: "En el brazo, hombro o mano…",
        preguntas: [
          "Abrir un frasco nuevo o con la tapa muy ajustada",
          "Hacer las tareas domésticas pesadas",
          "Llevar una bolsa de compras o un maletín",
          "Lavarse la espalda",
          "Usar un cuchillo para cortar los alimentos",
          "Actividades recreativas con esfuerzo del brazo (tenis, martillar, cocina, golf…)",
          "Trabajo, quehaceres o tareas escolares habituales",
          "Actividades sociales con familia, amigos, vecinos o grupos",
          "Dificultad para dormir por el problema en el brazo, hombro o mano",
          "Hormigueo (sensación de agujas) en el brazo, hombro o mano",
          "Dolor en el brazo, hombro o mano durante las últimas semanas"
        ]
      }
    ]
  },
  {
    id: "odi",
    nombre: "Oswestry Disability Index (ODI)",
    ref: "ODI 2.0 · 10 secciones · 0-5 (lumbalgia)",
    tipo: "likert",
    opciones: ["Opción 0", "Opción 1", "Opción 2", "Opción 3", "Opción 4", "Opción 5"],
    grupos: [
      {
        titulo: "Lumbar",
        instruccion: "Seleccione la frase que mejor describa su situación actual",
        preguntas: [
          "Intensidad del dolor: No tengo dolor en este momento|El dolor es muy leve en este momento|El dolor es moderado en este momento|El dolor es bastante intenso en este momento|El dolor es muy intenso en este momento|El dolor es el peor que se puede imaginar",
          "Cuidados personales (lavarse, vestirse…): Puedo cuidarme sin dolor adicional|Puedo cuidarme normalmente, aunque me duele|Cuidarme es doloroso, lento y con cuidado|Necesito alguna ayuda pero hago la mayor parte|Necesito ayuda en casi todos los aspectos de mi cuidado|No puedo vestirme, me lavo con dificultad y permanezco en cama",
          "Levantar objetos: Puedo levantar objetos pesados sin dolor adicional|Puedo levantar objetos pesados, pero con dolor adicional|El dolor me impide levantar objetos pesados del suelo, pero puedo hacerlo si están colocados de forma cómoda|El dolor me impide levantar objetos pesados, pero puedo levantar objetos ligeros o medianos si están en una posición adecuada|Solo puedo levantar objetos muy ligeros|No puedo levantar ni llevar ningún objeto",
          "Caminar: El dolor no me impide caminar ninguna distancia|El dolor me impide caminar más de 1 kilómetro|El dolor me impide caminar más de 500 metros|El dolor me impide caminar más de 100 metros|Solo puedo caminar con bastón o muletas|Estoy en cama la mayor parte del tiempo y debo arrastrarme hasta el baño",
          "Sentarse: Puedo sentarme en cualquier silla todo el tiempo que quiera|Puedo sentarme en mi silla favorita todo el tiempo que quiera|El dolor me impide sentarme más de una hora|El dolor me impide sentarme más de media hora|El dolor me impide sentarme más de diez minutos|El dolor me impide sentarme en absoluto",
          "Estar de pie: Puedo estar de pie todo el tiempo que quiera sin dolor adicional|Puedo estar de pie todo el tiempo que quiera, pero con dolor adicional|El dolor me impide estar de pie más de una hora|El dolor me impide estar de pie más de media hora|El dolor me impide estar de pie más de diez minutos|El dolor me impide estar de pie en absoluto",
          "Dormir: Mi sueño nunca se ve alterado por el dolor|Mi sueño se ve ocasionalmente alterado por el dolor|Debido al dolor duermo menos de seis horas|Debido al dolor duermo menos de cuatro horas|Debido al dolor duermo menos de dos horas|El dolor me impide dormir",
          "Vida social: Mi vida social es normal y no me produce dolor adicional|Mi vida social es normal, pero aumenta el grado de dolor|El dolor no tiene un efecto importante en mi vida social, aunque limita mis actividades más enérgicas|El dolor ha limitado mi vida social y no salgo tan a menudo|El dolor ha limitado mi vida social a mi casa|No tengo vida social a causa del dolor",
          "Viajar: Puedo viajar a cualquier lugar sin dolor adicional|Puedo viajar a cualquier lugar, pero con dolor adicional|El dolor es intenso, pero puedo soportar viajes de más de dos horas|El dolor limita mis viajes a menos de una hora|El dolor limita mis viajes a períodos de menos de media hora|El dolor me impide viajar, salvo para ir a tratamiento",
          "Cambio del dolor: Mi dolor ha mejorado mucho|Mi dolor ha mejorado|Mi dolor se mantiene igual|Mi dolor ha empeorado algo|Mi dolor ha empeorado mucho|Mi dolor es el peor que he tenido"
        ]
      }
    ]
  },
  {
    id: "ndi",
    nombre: "Neck Disability Index (NDI)",
    ref: "NDI · 10 ítems · 0-5 (dolor cervical)",
    tipo: "likert",
    opciones: ["Opción 0", "Opción 1", "Opción 2", "Opción 3", "Opción 4", "Opción 5"],
    grupos: [
      {
        titulo: "Cervical",
        instruccion: "Seleccione la frase que mejor describa su situación actual",
        preguntas: [
          "Intensidad del dolor: No tengo dolor en este momento|El dolor es muy leve|El dolor es moderado|El dolor es bastante intenso|El dolor es muy intenso|El dolor es el peor que se puede imaginar",
          "Cuidados personales: Puedo cuidarme sin dolor adicional|Puedo cuidarme normalmente, aunque me duele|Cuidarme es doloroso, lento y con cuidado|Necesito alguna ayuda pero hago la mayor parte|Necesito ayuda en casi todos los aspectos de mi cuidado|No puedo vestirme, me lavo con dificultad y permanezco en cama",
          "Levantar objetos: Puedo levantar objetos pesados sin dolor adicional|Puedo levantar objetos pesados, pero con dolor adicional|El dolor me impide levantar objetos pesados del suelo, pero puedo hacerlo si están colocados de forma cómoda|El dolor me impide levantar objetos pesados, pero puedo levantar objetos ligeros o medianos si están en una posición adecuada|Solo puedo levantar objetos muy ligeros|No puedo levantar ni llevar ningún objeto",
          "Leer: Puedo leer todo el tiempo que quiera sin dolor de cuello|Puedo leer todo el tiempo que quiera con dolor de cuello leve|Puedo leer todo el tiempo que quiera con dolor de cuello moderado|No puedo leer todo el tiempo que quiera por dolor de cuello moderado|Apenas puedo leer por dolor de cuello muy intenso|No puedo leer en absoluto por el dolor de cuello",
          "Dolor de cabeza: Nunca tengo dolor de cabeza|Solo tengo dolores de cabeza ocasionales y leves|Tengo dolores de cabeza ocasionales y moderados|Tengo dolores de cabeza frecuentes y moderados|Tengo dolores de cabeza frecuentes e intensos|Tengo dolor de cabeza casi constantemente",
          "Concentración: Puedo concentrarme por completo cuando quiero sin dificultad|Puedo concentrarme por completo cuando quiero con dificultad leve|Tengo cierta dificultad para concentrarme|Tengo bastante dificultad para concentrarme|Tengo mucha dificultad para concentrarme|No puedo concentrarme en absoluto",
          "Trabajo: Puedo trabajar todo lo que quiero sin dolor adicional|Puedo hacer mi trabajo habitual, pero nada más|Puedo hacer la mayor parte de mi trabajo habitual, pero nada más|No puedo hacer mi trabajo habitual|Apenas puedo hacer cualquier tipo de trabajo|No puedo trabajar en absoluto",
          "Conducir: Puedo conducir sin dolor de cuello|Puedo conducir todo lo que quiera con dolor de cuello leve|Puedo conducir todo lo que quiera con dolor de cuello moderado|No puedo conducir todo lo que quiera por dolor de cuello moderado|Apenas puedo conducir por dolor de cuello intenso|No puedo conducir en absoluto por el dolor de cuello",
          "Dormir: El dolor no me impide dormir|Mi sueño se ve ocasionalmente alterado (menos de 1 hora de insomnio)|Mi sueño se ve alterado (1 a 2 horas de insomnio)|Mi sueño se ve alterado (2 a 3 horas de insomnio)|Mi sueño se ve alterado (3 a 5 horas de insomnio)|Mi sueño se ve completamente alterado (5 a 7 horas de insomnio)",
          "Recreación: Puedo realizar todas mis actividades recreativas sin dolor de cuello|Puedo realizar todas mis actividades recreativas con algo de dolor de cuello|Puedo realizar la mayoría de mis actividades recreativas por el dolor de cuello|Solo puedo realizar algunas actividades recreativas por el dolor de cuello|Apenas puedo realizar actividades recreativas por el dolor de cuello|No puedo realizar ninguna actividad recreativa"
        ]
      }
    ]
  },
  {
    id: "sintomas",
    nombre: "Inventario de síntomas (multimarca)",
    ref: "Lista de verificación de síntomas presentes · marque todas las que apliquen",
    tipo: "check",
    grupos: [
      {
        titulo: "Síntomas y molestias",
        instruccion: "Marque con una casilla cada síntoma o molestia que presente el paciente en estos momentos",
        preguntas: [
          "Dolor en reposo",
          "Dolor al caminar",
          "Dolor por la noche",
          "Inflamación o tumefacción",
          "Rigidez matutina",
          "Inestabilidad o sensación de falla",
          "Bloqueo o chasquidos articulares",
          "Debilidad muscular",
          "Adormecimiento u hormigueo",
          "Limitación para actividades de la vida diaria",
          "Limitación para actividades deportivas",
          "Necesita ayuda para caminar (bastón, muletas o andador)"
        ]
      }
    ]
  },
  {
    id: "eva",
    nombre: "EVA - Escala visual analógica de dolor",
    ref: "EVA 0-10 · 10 = dolor máximo",
    tipo: "eva",
    grupos: [
      {
        titulo: "Dolor",
        instruccion: "Deslice la regla para indicar el nivel de dolor (0 = sin dolor, 10 = máximo dolor)",
        preguntas: [
          "Dolor en este momento",
          "Peor dolor de la última semana"
        ]
      }
    ]
  }
];

function prosEscape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cuestionarioProPorId(id) {
  return CUESTIONARIOS_PRO.find(q => q.id === id) || null;
}

function prosSeveridad(q, k) {
  const max = q.opciones.length - 1;
  const v = q.invertir ? max - k : k;
  return Math.round((v * 10 / max) * 10) / 10;
}

function renderProsPacientes() {
  const sel = document.getElementById("prosPaciente");
  if (!sel) return;
  const activos = pacientesActivos();
  const actual = raPacienteId();
  sel.innerHTML =
    '<option value="">- Seleccione el paciente -</option>' +
    activos.map(p => `<option value="${p.id}">${prosEscape(p.codigo + " - " + p.nombre)}</option>`).join("");
  if (actual != null && activos.some(p => p.id === actual)) sel.value = String(actual);
}

function renderProsTipo() {
  const sel = document.getElementById("prosTipo");
  if (!sel) return;
  sel.innerHTML =
    '<option value="">- Seleccione el tipo -</option>' +
    CUESTIONARIOS_PRO.map(q => `<option value="${q.id}">${prosEscape(q.nombre)}</option>`).join("");
}

function renderProsCampos() {
  const cont = document.getElementById("prosCampos");
  if (!cont) return;
  const sel = document.getElementById("prosTipo");
  const q = sel ? cuestionarioProPorId(sel.value) : null;
  if (!q) {
    cont.innerHTML = '<div class="empty">Selecciona el tipo de cuestionario para cargar sus preguntas aquí.</div>';
    return;
  }
  let idx = 0;
  let html = `<div class="pros-info"><span class="material-symbols-outlined">fact_check</span><div><strong>${prosEscape(q.nombre)}</strong><small>${prosEscape(q.ref)} · 0-10 = peor resultado</small></div></div>`;
  q.grupos.forEach(g => {
    html += `<div class="pros-grupo"><h4>${prosEscape(g.titulo)}</h4>${g.instruccion ? `<p class="pros-instr">${prosEscape(g.instruccion)}</p>` : ""}`;
    g.preguntas.forEach(preg => {
      idx++;
      const num = idx;
      if (q.tipo === "eva") {
        html += `
          <div class="pros-q pros-q-eva" data-idx="${num}">
            <p class="pros-q-txt">${num}. ${prosEscape(preg)}</p>
            <div class="pros-slider">
              <input type="range" id="proseva${num}" data-n="${num}" min="0" max="10" step="1" value="0">
              <span class="pros-slider-val" id="prosevaTxt${num}">0 / 10</span>
            </div>
          </div>`;
      } else if (q.tipo === "check") {
        html += `
          <div class="pros-q" data-idx="${num}">
            <label class="pros-opt pros-opt-check">
              <input type="checkbox" id="proscheck${num}" data-n="${num}">
              <span>${num}. ${prosEscape(preg)}</span>
            </label>
          </div>`;
      } else {
        const opc = q.opciones || [];
        if (opc.length) {
          const partes = preg.split("|");
          if (partes.length > 1) {
            const titulo = partes.shift();
            html += `<div class="pros-q" data-idx="${num}">
              <p class="pros-q-txt">${num}. ${prosEscape(titulo)}</p>
              <div class="pros-opts pros-opts-tall">` +
              partes.map((op, k) => `<label class="pros-opt"><input type="radio" name="prosli${num}" value="${k}"><span>${prosEscape(op)}</span></label>`).join("") +
              `</div></div>`;
          } else {
            html += `<div class="pros-q" data-idx="${num}">
              <p class="pros-q-txt">${num}. ${prosEscape(preg)}</p>
              <div class="pros-opts pros-opts-tall">` +
              opc.map((op, k) => `<label class="pros-opt"><input type="radio" name="prosli${num}" value="${k}"><span>${prosEscape(op)}</span></label>`).join("") +
              `</div></div>`;
          }
        }
      }
    });
    html += `</div>`;
  });
  html += `<p class="pros-count">${idx} pregunta(s) · Índice 0-10: valores altos = síntomas o discapacidad intensos</p>`;
  cont.innerHTML = html;
}

function recogerRespuestasPro(q) {
  const items = [];
  let idx = 0;
  q.grupos.forEach(g => g.preguntas.forEach(p => { idx++; items.push({ n: idx, pregunta: p }); }));
  const evaluaciones = [];
  if (q.tipo === "check") {
    const total = items.length;
    let marcadas = 0;
    items.forEach(it => {
      const el = document.getElementById("proscheck" + it.n);
      const marcado = !!(el && el.checked);
      if (marcado) marcadas++;
      evaluaciones.push({ pregunta: it.pregunta, valor: marcado ? 10 : 0 });
    });
    return { evaluaciones, promedio: total ? Math.round((marcadas / total) * 100) / 10 : 0 };
  }
  if (q.tipo === "eva") {
    items.forEach(it => {
      const el = document.getElementById("proseva" + it.n);
      const v = el ? Number(el.value) || 0 : 0;
      evaluaciones.push({ pregunta: it.pregunta, valor: v });
    });
    return { evaluaciones, promedio: evaluaciones.length ? Math.round((evaluaciones.reduce((s, e) => s + e.valor, 0) / evaluaciones.length) * 10) / 10 : 0 };
  }
  const faltantes = [];
  items.forEach(it => {
    const radio = document.querySelector('input[name="prosli' + it.n + '"]:checked');
    if (!radio) { faltantes.push(it.n); return; }
    evaluaciones.push({ pregunta: it.pregunta.split("|")[0], valor: prosSeveridad(q, Number(radio.value)) });
  });
  if (faltantes.length) return { faltantes };
  return { evaluaciones, promedio: evaluaciones.length ? Math.round((evaluaciones.reduce((s, e) => s + e.valor, 0) / evaluaciones.length) * 10) / 10 : 0 };
}

function renderPros() {
  const lista = document.getElementById("listaPros");
  const count = document.getElementById("countPros");
  if (count) count.textContent = String(State.pros.length);
  if (!lista) return;
  const qb = (((document.getElementById("buscarPro") || {}).value) || "").trim().toLowerCase();
  const fila = State.pros
    .filter(r => {
      const p = State.pacientes.find(x => x.id === r.pacienteId);
      const texto = [r.tipo || "", r.cuestionarioId || "", p ? p.nombre : "", p ? p.codigo : ""].join(" ").toLowerCase();
      return !qb || texto.includes(qb);
    })
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  if (!fila.length) {
    lista.innerHTML = `<div class="empty">No hay cuestionarios PRO${qb ? " que coincidan con tu búsqueda" : ""}. Completa el formulario para guardar el primero.</div>`;
    return;
  }
  lista.innerHTML = fila.map(r => {
    const p = State.pacientes.find(x => x.id === r.pacienteId);
    const prom = Number(r.promedio);
    const tag = prom >= 7 ? "tag--bad" : prom >= 4 ? "tag--mid" : "tag--ok";
    const nResp = Array.isArray(r.evaluaciones) ? r.evaluaciones.length : 0;
    return `
      <div class="list-item pros-item">
        <div class="item-main">
          <span class="tag ${tag}" title="Índice promediado 0-10 (alto = peor)">${prom.toFixed(1)}</span>
          <strong>${prosEscape(r.tipo || "Cuestionario")}</strong>
          <span>${p ? prosEscape(p.codigo + " - " + p.nombre) : "Paciente eliminado"}</span>
        </div>
        <div class="item-sub">${prosEscape(fmtFechaES(r.fecha))} · ${nResp} respuesta(s)${r.notas ? " · " + prosEscape(r.notas) : ""}</div>
        <div class="item-actions">
          <button type="button" class="btn btn--ghost-dark" data-ver-pro="${r.id}"><span class="material-symbols-outlined" style="font-size:1rem">visibility</span> Ver</button>
          <button type="button" class="btn btn--ghost-dark pros-del" data-elim-pro="${r.id}"><span class="material-symbols-outlined" style="font-size:1rem">delete</span> Eliminar</button>
        </div>
      </div>`;
  }).join("");
}

function renderProsDetalle(id) {
  const cont = document.getElementById("proVista");
  if (!cont) return;
  const rec = State.pros.find(r => String(r.id) === String(id));
  if (!rec) {
    cont.innerHTML = `<div class="empty">El cuestionario ya no existe.</div>`;
    return;
  }
  const p = State.pacientes.find(x => x.id === rec.pacienteId);
  const prom = Number(rec.promedio);
  const tag = prom >= 7 ? "tag--bad" : prom >= 4 ? "tag--mid" : "tag--ok";
  const evals = Array.isArray(rec.evaluaciones) ? rec.evaluaciones : [];
  const filas = evals.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${prosEscape(e.pregunta)}</td>
      <td>${Number(e.valor).toFixed(1)} / 10</td>
    </tr>`).join("");
  cont.innerHTML = `
    <div class="pros-detalle">
      <div class="item-main">
        <span class="tag ${tag}" title="Índice promediado 0-10 (alto = peor)">${prom.toFixed(1)} / 10</span>
        <strong>${prosEscape(rec.tipo || "Cuestionario")}</strong>
      </div>
      <p class="item-sub">${p ? prosEscape(p.codigo + " - " + p.nombre) : "Paciente eliminado"} · ${prosEscape(fmtFechaES(rec.fecha))}</p>
      ${rec.ref ? `<p class="item-sub">${prosEscape(rec.ref)}</p>` : ""}
      <div class="pros-tabla-wrap">
        <table class="pros-tabla">
          <thead><tr><th>#</th><th>Pregunta / síntoma</th><th>Valor</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${rec.notas ? `<p class="item-sub pros-notas"><strong>Notas:</strong> ${prosEscape(rec.notas)}</p>` : ""}
    </div>`;
  abrirModal("modalVerPro");
}

function eliminarCuestionarioPro(id) {
  const rec = State.pros.find(r => String(r.id) === String(id));
  if (!rec) return;
  if (!confirm("¿Eliminar el cuestionario «" + (rec.tipo || "PRO") + "» de fecha " + fmtFechaES(rec.fecha) + "?")) return;
  State.pros = State.pros.filter(r => String(r.id) !== String(id));
  saveKey("pros");
  renderPros();
  renderHome();
  mostrarNotificacion("Cuestionario eliminado.");
}

function sincronizarConPacienteActualPros() {
  const id = raPacienteId();
  const sel = document.getElementById("prosPaciente");
  if (sel && id != null) {
    const existe = Array.from(sel.options).some(o => o.value === String(id));
    if (existe) sel.value = String(id);
  }
  const chip = document.getElementById("prosPacienteActual");
  const p = id ? State.pacientes.find(x => x.id === id) : null;
  if (chip) chip.textContent = p ? `${p.nombre} (${p.codigo})` : "- Selecciona el paciente actual en el panel superior -";
  renderPros();
}

function registrarAccionesPros() {
  if (prosRegistrado) return;
  prosRegistrado = true;

  renderProsPacientes();
  renderProsTipo();
  const fechaEl = document.getElementById("prosFecha");
  if (fechaEl && !fechaEl.value) fechaEl.value = isoLocal(new Date());
  renderProsCampos();
  renderPros();

  const tipoSel = document.getElementById("prosTipo");
  if (tipoSel) tipoSel.addEventListener("change", renderProsCampos);

  const buscar = document.getElementById("buscarPro");
  if (buscar) buscar.addEventListener("input", renderPros);

  const campos = document.getElementById("prosCampos");
  if (campos) {
    campos.addEventListener("input", e => {
      if (e.target && e.target.type === "range") {
        const txt = document.getElementById("prosevaTxt" + e.target.dataset.n);
        if (txt) txt.textContent = e.target.value + " / 10";
      }
    });
  }

  const form = document.getElementById("prosForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const selPac = document.getElementById("prosPaciente");
      const pid = selPac ? Number(selPac.value) : NaN;
      const q = cuestionarioProPorId(document.getElementById("prosTipo").value);
      const fecha = document.getElementById("prosFecha").value;
      if (!pid || !q) {
        mostrarNotificacion("Selecciona el paciente y el tipo de cuestionario.");
        return;
      }
      if (!fecha) {
        mostrarNotificacion("Indica la fecha del cuestionario.");
        return;
      }
      const resp = recogerRespuestasPro(q);
      if (resp.faltantes && resp.faltantes.length) {
        mostrarNotificacion("Faltan preguntas por responder: #" + resp.faltantes.join(", #") + ".");
        return;
      }
      const p = State.pacientes.find(x => x.id === pid);
      const notasEl = document.getElementById("prosNotas");
      State.pros.push({
        id: "pro" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
        pacienteId: pid,
        fecha: fecha,
        tipo: q.nombre,
        cuestionarioId: q.id,
        ref: q.ref,
        evaluaciones: resp.evaluaciones,
        promedio: resp.promedio,
        notas: notasEl ? notasEl.value.trim() : ""
      });
      saveKey("pros");
      renderPros();
      renderHome();
      if (notasEl) notasEl.value = "";
      mostrarNotificacion(`Cuestionario <b>${prosEscape(q.nombre)}</b> guardado` + (p ? " para <b>" + prosEscape(p.nombre) + "</b>" : "") + ".");
    });
  }

  const lista = document.getElementById("listaPros");
  if (lista) {
    lista.addEventListener("click", e => {
      const btnVer = e.target.closest("[data-ver-pro]");
      if (btnVer) { renderProsDetalle(btnVer.getAttribute("data-ver-pro")); return; }
      const btnDel = e.target.closest("[data-elim-pro]");
      if (btnDel) eliminarCuestionarioPro(btnDel.getAttribute("data-elim-pro"));
    });
  }
}

function accionRegistroActual(acc, id) {
  const p = State.pacientes.find(x => x.id === id);
  switch (acc) {
    case "ficha": {
      const cont = document.getElementById("raFicha");
      if (cont) cont.innerHTML = fichaPacienteHTML(id);
      abrirModal("modalRaFicha");
      break;
    }
    case "cita":
      agendarPacienteSinCita(id);
      break;
    case "registro": {
      const eti = document.getElementById("raRegistroPaciente");
      if (eti) eti.textContent = p ? `${p.codigo} - ${p.nombre}` : "-";
      const t = document.getElementById("raRegistroTitulo");
      const d = document.getElementById("raRegistroDetalle");
      const f = document.getElementById("raRegistroProxCitaFecha");
      const h = document.getElementById("raRegistroProxCitaHora");
      const a = document.getElementById("raRegistroArchivo");
      if (t) t.value = "";
      if (d) d.value = "";
      if (f) f.value = "";
      if (h) h.value = "";
      if (a) a.value = "";
      abrirModal("modalRaRegistro");
      if (t) setTimeout(() => t.focus(), 50);
      break;
    }
    case "documento": {
      const eti = document.getElementById("raDocumentoPaciente");
      if (eti) eti.textContent = p ? `${p.codigo} - ${p.nombre}` : "-";
      const desc = document.getElementById("raDocumentoDescripcion");
      const arc = document.getElementById("raDocumentoArchivo");
      if (desc) desc.value = "";
      if (arc) arc.value = "";
      abrirModal("modalRaDocumento");
      break;
    }
    case "eval": {
      if (p && p.sexo) cambiarSexoEval(String(p.sexo).toLowerCase().startsWith("f") ? "femenino" : "masculino");
      lesionesEval = {};
      const nota = document.getElementById("evalNota");
      if (nota) nota.value = "";
      colorearPartes();
      renderPartesAfectadas();
      renderEvaluacionesGuardadas();
      renderRegistroActual();
      mostrarSeccion("evaluacion-fisica");
      const sec = document.getElementById("seccion-evaluacion-fisica");
      if (sec) sec.scrollIntoView({ behavior: "smooth" });
      break;
    }
    case "factura": {
      const sel = document.getElementById("facturaPaciente");
      if (sel) sel.value = String(id);
      mostrarSeccion("facturacion");
      break;
    }
    case "receta": {
      const sel = document.getElementById("recetaPaciente");
      if (sel) sel.value = String(id);
      mostrarSeccion("recetas");
      break;
    }
  }
}

let evalEnEdicionId = null;

function recogerPruebasEval() {
  const celso = Array.from(document.querySelectorAll("[data-eval-celso]"))
    .filter(cb => cb.checked).map(cb => cb.value);
  const evaEl = document.getElementById("evalEVA");
  const danielsEl = document.getElementById("evalDaniels");
  const dolorEl = document.getElementById("evalEscalaDolor");
  return {
    celso,
    eva: evaEl ? Number(evaEl.value) : 0,
    daniels: danielsEl ? danielsEl.value : "",
    dolor: dolorEl ? dolorEl.value : ""
  };
}

function evaColorPara(valor) {
  const v = Math.max(0, Math.min(10, Number(valor) || 0));
  if (v === 0) return "#16a34a";
  if (v <= 3) return "#84cc16";
  if (v <= 6) return "#f59e0b";
  return "#dc2626";
}

function aplicarColorEVA(valor) {
  const evaOut = document.getElementById("evalEVAVal");
  const evaInput = document.getElementById("evalEVA");
  const evaBand = document.getElementById("evalEVABand");
  const v = Math.max(0, Math.min(10, Number(valor) || 0));
  const color = evaColorPara(v);
  const banda = v === 0 ? "Sin dolor" : v <= 3 ? "Leve" : v <= 6 ? "Moderado" : "Severo";
  const bandId = v === 0 ? "none" : v <= 3 ? "leve" : v <= 6 ? "moderado" : "severo";
  if (evaOut) {
    evaOut.textContent = String(v);
    evaOut.style.setProperty("--eva-color", color);
    evaOut.dataset.evaBand = bandId;
  }
  if (evaInput) {
    evaInput.style.setProperty("--eva-color", color);
    evaInput.style.setProperty("--eva-pct", (v / 10 * 100) + "%");
    evaInput.dataset.evaBand = bandId;
  }
  if (evaBand) {
    evaBand.textContent = banda;
    evaBand.style.setProperty("--eva-color", color);
  }
}

function aplicarPruebasEval(pruebas) {
  const p = pruebas && typeof pruebas === "object" ? pruebas : {};
  const celso = Array.isArray(p.celso) ? p.celso : [];
  document.querySelectorAll("[data-eval-celso]").forEach(cb => { cb.checked = celso.includes(cb.value); });
  const evaEl = document.getElementById("evalEVA");
  if (evaEl) evaEl.value = p.eva != null ? String(p.eva) : "0";
  aplicarColorEVA(evaEl ? evaEl.value : 0);
  const danielsEl = document.getElementById("evalDaniels");
  if (danielsEl) danielsEl.value = p.daniels || "";
  const dolorEl = document.getElementById("evalEscalaDolor");
  if (dolorEl) dolorEl.value = p.dolor || "";
}

function resumenPruebasEval(pruebas) {
  const p = pruebas && typeof pruebas === "object" ? pruebas : {};
  const partes = [];
  if (Array.isArray(p.celso) && p.celso.length) partes.push("Celso: " + p.celso.join(", "));
  if (p.eva != null && p.eva !== "") partes.push("EVA " + p.eva + "/10");
  if (p.daniels) partes.push("Daniels " + p.daniels);
  if (p.dolor) partes.push("Dolor: " + p.dolor);
  return partes.join(" · ");
}

function guardarEvaluacion() {
  const pidSel = raPacienteId();
  const pidForm = Number(document.getElementById("evalMedPaciente")?.value) || 0;
  const pid = pidSel || pidForm;
  if (!pid) {
    mostrarNotificacion("Selecciona un paciente para guardar la evaluación física.");
    return;
  }
  const p = State.pacientes.find(x => x.id === pid);
  const nota = document.getElementById("evalNota").value.trim();
  const fecha = new Date().toISOString().split("T")[0];
  const lesionesNuevas = JSON.parse(JSON.stringify(lesionesEval));
  const pruebasNuevas = recogerPruebasEval();

  let target = null;
  if (evalEnEdicionId != null) {
    const cargada = State.evaluaciones.find(e => e.id === evalEnEdicionId);
    if (cargada && cargada.pacienteId === pid) target = cargada;
  }
  if (!target) {
    const delPaciente = State.evaluaciones.filter(e => e.pacienteId === pid);
    target = delPaciente.find(e => e.fecha === fecha) || null;
  }

  if (target) {
    target.fecha = fecha;
    target.sexo = sexoEval;
    target.nota = nota;
    target.lesiones = lesionesNuevas;
    target.pruebas = pruebasNuevas;
    saveKey("evaluaciones");
    renderEvaluacionesGuardadas();
    evalEnEdicionId = target.id;
    mostrarNotificacion(`Evaluación física de <b>${p ? p.nombre : "el paciente"}</b> actualizada (no se creó un nuevo registro)`);
    return;
  }

  evalEnEdicionId = Date.now();
  State.evaluaciones.push({ id: evalEnEdicionId, pacienteId: pid, fecha, sexo: sexoEval, nota, lesiones: lesionesNuevas, pruebas: pruebasNuevas });
  saveKey("evaluaciones");
  renderEvaluacionesGuardadas();
  mostrarNotificacion(`Evaluación física de <b>${p ? p.nombre : "el paciente"}</b> guardada correctamente`);
}

function cargarEvaluacion(id) {
  const ev = State.evaluaciones.find(e => e.id === id);
  if (!ev) return;
  const srcLes = ev.lesiones && typeof ev.lesiones === "object" ? ev.lesiones : {};
  lesionesEval = {};
  Object.keys(srcLes).forEach(k => { lesionesEval[k] = normLesiones(srcLes[k]).map(x => ({ ...x })); });
  if (ev.pacienteId) {
    const ra = document.getElementById("raPaciente");
    if (ra && ra.querySelector(`option[value="${ev.pacienteId}"]`)) {
      ra.value = String(ev.pacienteId);
      renderRegistroActual();
    }
  }
  const nota = document.getElementById("evalNota");
  if (nota) nota.value = ev.nota || "";
  aplicarPruebasEval(ev.pruebas);
  if (ev.sexo) cambiarSexoEval(ev.sexo);
  colorearPartes();
  renderPartesAfectadas();
  evalEnEdicionId = ev.id;
}

function renderEvaluacionesGuardadas() {
  const cont = document.getElementById("evalGuardados");
  if (!cont) return;
  const lista = [...State.evaluaciones].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  if (!lista.length) {
    cont.innerHTML = `<p class="empty">Aún no hay evaluaciones guardadas.</p>`;
    return;
  }
  cont.innerHTML = lista.map(ev => {
    const p = State.pacientes.find(x => x.id === ev.pacienteId);
    const claves = Object.keys(ev.lesiones || {});
    const resumen = claves.slice(0, 4).map(k => NOMBRES_PARTES[k] || k).join(", ");
    const pruebasTxt = resumenPruebasEval(ev.pruebas);
    return `
      <div class="eval-parte eval-save">
        <span class="eval-parte-nombre">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong><br>
          ${fmtFechaES(ev.fecha)} · ${claves.length} zona(s) ${claves.length ? "· " + resumen + (claves.length > 4 ? "…" : "") : ""}${pruebasTxt ? "<br>" + pruebasTxt : ""}
        </span>
        <button type="button" class="btn-icon" data-cargar-eval="${ev.id}" title="Cargar en la figura">
          <span class="material-symbols-outlined">upload</span>
        </button>
        <button type="button" class="btn-icon danger" data-borrar-eval="${ev.id}" title="Eliminar evaluación">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>`;
  }).join("");
  cont.querySelectorAll("[data-cargar-eval]").forEach(b => b.addEventListener("click", () => cargarEvaluacion(Number(b.dataset.cargarEval))));
  cont.querySelectorAll("[data-borrar-eval]").forEach(b => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar esta evaluación guardada?")) return;
    State.evaluaciones = State.evaluaciones.filter(e => e.id !== Number(b.dataset.borrarEval));
    saveKey("evaluaciones");
    renderEvaluacionesGuardadas();
  }));
}

function imprimirTurnos(indices) {
  const data = [...State.citas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  if (data.length === 0) {
    alert("No hay citas para imprimir.");
    return;
  }
  const seleccion = indices == null ? data.map((_, i) => i) : indices;

  const filas = seleccion.map(i => {
    const c = data[i];
    if (!c) return "";
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${c.fecha}</td>
        <td>${fmtHora12(c.hora, c.amPm)}</td>
        <td>${c.turno || "-"}</td>
        <td>${p ? p.nombre : "Paciente eliminado"}${p && p.cedula ? ` (${p.cedula})` : ""}</td>
        <td>${c.motivo || ""}</td>
      </tr>
    `;
  }).join("");

  abrirImpresion("Tabla de turnos - Citas", `
    <table>
      <thead>
        <tr><th>#</th><th>Fecha</th><th>Hora</th><th>Turno</th><th>Paciente</th><th>Motivo</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `);
}

function imprimirResultados(indices) {
  const data = [...State.registros].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (data.length === 0) {
    alert("No hay resultados para imprimir.");
    return;
  }
  const seleccion = indices == null ? data.map((_, i) => i) : indices;
  const items = seleccion.map(i => {
    const r = data[i];
    if (!r) return "";
    const p = State.pacientes.find(x => x.id === r.pacienteId);
    return `
      <div class="print-item">
        <h3>${r.titulo} - ${p ? p.nombre : "Paciente eliminado"}</h3>
        <span class="print-fecha">${r.fecha}</span>
        <p>${r.detalle || "Sin detalle"}</p>
      </div>
    `;
  }).filter(Boolean).join("");

  abrirImpresion("Resultados / Registros médicos", items);
}

function pedirImpresionResultados() {
  const data = [...State.registros].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (data.length === 0) {
    alert("No hay resultados para imprimir.");
    return;
  }
  abrirSelectorImpresion(
    data.map(r => {
      const p = State.pacientes.find(x => x.id === r.pacienteId);
      return { etiqueta: `${r.fecha} · ${r.titulo} - ${p ? p.nombre : "Paciente eliminado"}` };
    }),
    indices => imprimirResultados(indices)
  );
}

function pedirImpresionTurnos() {
  const data = [...State.citas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  if (data.length === 0) {
    alert("No hay citas para imprimir.");
    return;
  }
  abrirSelectorImpresion(
    data.map(c => {
      const p = State.pacientes.find(x => x.id === c.pacienteId);
      return { etiqueta: `${c.fecha} ${fmtHora12(c.hora, c.amPm)} · Turno ${c.turno || "-"} - ${p ? p.nombre : "Paciente eliminado"}${c.motivo ? " · " + c.motivo : ""}` };
    }),
    indices => imprimirTurnos(indices)
  );
}

function pedirImpresionFactura(id) {
  const f = State.facturas.find(x => x.id === id);
  if (!f) return;
  abrirSelectorImpresion([{ etiqueta: `Factura ${f.codigo} - ${fmtFechaES(f.fecha)}`, marcado: true }], () => imprimirFactura(id));
}

function pedirImpresionReceta(id) {
  const r = State.recetas.find(x => x.id === id);
  if (!r) return;
  const items = [];
  if ((r.medicamentos || []).length > 0) {
    items.push({ etiqueta: `Receta de medicamentos ${r.codigo}  ${fmtFechaES(r.fecha)}`, marcado: true, tipo: "med" });
  }
  if ((r.indicaciones || []).length > 0) {
    items.push({ etiqueta: `Indicaciones / Procedimientos ${r.codigo}  ${fmtFechaES(r.fecha)}`, marcado: true, tipo: "ind" });
  }
  if (items.length === 0) {
    abrirSelectorImpresion([{ etiqueta: `Receta ${r.codigo}  ${fmtFechaES(r.fecha)}`, marcado: true }], () => imprimirReceta(id));
    return;
  }
  abrirSelectorImpresion(items, (seleccionados) => {
    const html = seleccionados.map(sel => {
      if (sel.tipo === "med") return cuerpoRecetaMedicamentosHTML(r);
      if (sel.tipo === "ind") return cuerpoRecetaIndicacionesHTML(r);
      return cuerpoRecetaHTML(r);
    }).join("<div style='page-break-before:always'></div>");
    abrirImpresion("Receta " + r.codigo, html);
  });
}

function pedirImpresionEstadisticas() {
  abrirSelectorImpresion([{ etiqueta: "Estadísticas de pacientes atendidos", marcado: true }], () => imprimirEstadisticas());
}

function textoTurnos() {
  const data = [...State.citas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  if (data.length === 0) {
    alert("No hay citas para compartir.");
    return null;
  }
  return data.map((c, i) => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    return `${i + 1}. ${c.fecha} ${fmtHora12(c.hora, c.amPm)} | Turno ${c.turno || "-"} | ${p ? p.nombre : "Paciente eliminado"}${p && p.cedula ? " (" + p.cedula + ")" : ""} | ${c.motivo || ""}`;
  }).join("\n");
}

function textoResultados() {
  const data = [...State.registros].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (data.length === 0) {
    alert("No hay resultados para compartir.");
    return null;
  }
  return data.map(r => {
    const p = State.pacientes.find(x => x.id === r.pacienteId);
    return `${r.titulo} - ${p ? p.nombre : "Paciente eliminado"} (${r.fecha})\n${r.detalle || "Sin detalle"}`;
  }).join("\n\n");
}

function textoFichaPaciente(id) {
  const p = State.pacientes.find(x => x.id === id);
  if (!p) return null;
  const citas = State.citas.filter(c => c.pacienteId === id);
  const documentos = State.documentos.filter(d => d.pacienteId === id);
  const hoy = new Date().toISOString().split("T")[0];
  const proximas = State.citas
    .filter(c => c.pacienteId === id && c.fecha >= hoy && !c.completada && !c.cancelada)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const prox = proximas[0];

  return [
    `Código: ${p.codigo}`,
    `Cédula: ${p.cedula || "-"}`,
    `Seguro: ${p.seguro || "-"}`,
    `Edad: ${p.edad || "-"} · Sexo: ${p.sexo || "-"}`,
    `Teléfono: ${p.telefono || "-"}`,
    `Correo: ${p.email || "-"}`,
    `Próxima cita: ${prox ? `${prox.fecha} · ${fmtHora12(prox.hora, prox.amPm)} - ${prox.motivo}` : "Sin cita programada"}`,
    `Notas: ${p.notas || "Sin notas"}`,
    `Citas: ${citas.length} · Documentos: ${documentos.length}`
  ].join("\n");
}

function compartirWhatsApp(titulo, texto, telefono) {
  const enc = encodeURIComponent(`${titulo}\n\n${texto}`);
  const num = (telefono || "").replace(/[^\d]/g, "");
  const url = num
    ? `https://wa.me/${num}?text=${enc}`
    : `https://wa.me/?text=${enc}`;
  window.open(url, "_blank");
}

function compartirCorreo(titulo, texto) {
  const url = `mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

function renderHome() {
  document.getElementById("statPacientes").textContent = pacientesActivos().length;
  document.getElementById("statCitas").textContent = State.citas.length;
  document.getElementById("statRegistros").textContent = State.registros.length;
  document.getElementById("statDocumentos").textContent = State.documentos.length;
  document.getElementById("statFacturas").textContent = State.facturas.length;
  document.getElementById("statSinCita").textContent =
    pacientesActivos().filter(p => !State.citas.some(c => c.pacienteId === p.id && !c.completada && !c.cancelada)).length;
  renderProximasCitas();
  renderDashboardCitas();
  renderNotasInicio();
}

function renderNotasInicio() {
  const cont = document.getElementById("listaNotasInicio");
  if (!cont) return;
  const usuarioId = State.session ? State.session.id : null;
  const propias = BD.get("orto_notas", []).filter(n => n.usuarioId == null || n.usuarioId === usuarioId);
  const ordenadas = [...propias].sort((a, b) => (b.creado || 0) - (a.creado || 0));
  if (!ordenadas.length) {
    cont.innerHTML = `<p class="empty">No tienes notas. Usa "Agregar nota" para crear una (solo tú las verás).</p>`;
    return;
  }
  cont.innerHTML = ordenadas.map(n => `
    <div class="list-item item-compact">
      <div class="item-main">
        <strong>${escHtml(n.titulo || "Nota")}</strong>
        <span class="tag">${escHtml(n.autor || "Usuario")}</span>
        <span class="tag">${n.fecha ? fmtFechaES(n.fecha) : ""}</span>
      </div>
      <div class="item-sub">${escHtml(n.texto).replace(/\n/g, "<br>")}</div>
      <div class="item-actions">
        <button class="btn-icon danger" data-borrar-nota="${n.id}" title="Eliminar nota">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `).join("");
  cont.querySelectorAll("[data-borrar-nota]").forEach(b =>
    b.addEventListener("click", () => eliminarNotaInicio(Number(b.dataset.borrarNota)))
  );
}

function agregarNotaInicio(e) {
  if (e) e.preventDefault();
  const inp = document.getElementById("notaTitulo");
  const txt = document.getElementById("notaTexto");
  const titulo = (inp && inp.value ? inp.value : "").trim();
  const texto = (txt && txt.value ? txt.value : "").trim();
  if (!texto) return;
  const notas = BD.get("orto_notas", []);
  notas.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    titulo,
    texto,
    fecha: isoLocal(new Date()),
    creado: Date.now(),
    usuarioId: State.session ? State.session.id : null,
    autor: (State.session && (State.session.name || State.session.email)) || ""
  });
  BD.set("orto_notas", notas);
  if (inp) inp.value = "";
  if (txt) txt.value = "";
  cerrarModales();
  renderNotasInicio();
  mostrarNotificacion("Nota agregada");
}

function eliminarNotaInicio(id) {
  const notas = BD.get("orto_notas", []).filter(n => n.id !== id);
  BD.set("orto_notas", notas);
  renderNotasInicio();
  mostrarNotificacion("Nota eliminada");
}

function renderDashboardCitas() {
  const comp = document.getElementById("dashCitasCompletadas");
  const compCount = document.getElementById("dashCountCompletadas");
  if (comp) {
    const completadas = State.citas.filter(c => c.completada && activoConPaciente(c.pacienteId));
    const data = [...completadas]
      .sort((a, b) => (b.fechaCompletada || b.fecha || "").localeCompare(a.fechaCompletada || a.fecha || ""))
      .slice(0, 5);
    if (compCount) compCount.textContent = completadas.length;
    comp.innerHTML = data.length === 0
      ? `<p class="empty">Aún no hay citas completadas.</p>`
      : data.map(c => {
        const p = State.pacientes.find(x => x.id === c.pacienteId);
        return `
          <div class="list-item item-compact">
            <div class="item-main">
              <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
              <span class="tag">${fmtFechaES(c.fechaCompletada || c.fecha)}</span>
            </div>
            <div class="item-sub">${c.diagnostico || "Sin diagnóstico"}</div>
          </div>`;
      }).join("");
  }

  const csc = document.getElementById("dashCitasSinConsulta");
  const cscCount = document.getElementById("dashCountSinConsulta");
  if (csc) {
    const activas = State.citasSinConsulta.filter(c => !pacienteEliminadoDe(c.pacienteId));
    const data = [...activas]
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
      .slice(0, 5);
    if (cscCount) cscCount.textContent = activas.length;
    csc.innerHTML = data.length === 0
      ? `<p class="empty">No hay citas sin consulta.</p>`
      : data.map(c => {
        const p = State.pacientes.find(x => x.id === c.pacienteId);
        return `
          <div class="list-item item-compact">
            <div class="item-main">
              <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
              <span class="tag">${c.fecha} · ${fmtHora12(c.hora, c.amPm)}</span>
            </div>
            <div class="item-sub">${c.motivo || "Sin motivo"}</div>
          </div>`;
      }).join("");
  }

  const sc = document.getElementById("dashPacientesSinCita");
  const scCount = document.getElementById("dashCountSinCita");
  if (sc) {
    const sinCita = pacientesActivos().filter(p => !State.citas.some(c => c.pacienteId === p.id && !c.completada && !c.cancelada)).slice(0, 5);
    if (scCount) scCount.textContent = pacientesActivos().filter(p => !State.citas.some(c => c.pacienteId === p.id && !c.completada && !c.cancelada)).length;
    sc.innerHTML = sinCita.length === 0
      ? `<p class="empty">Todos los pacientes tienen al menos una cita.</p>`
      : sinCita.map(p => `
          <div class="list-item item-compact">
            <div class="item-main">
              <strong>${p.nombre}</strong>
              <span class="tag">${p.codigo}</span>
            </div>
            <div class="item-sub">Cédula: ${p.cedula || "-"} · Seguro: ${p.seguro || "-"}</div>
            <div class="item-actions">
              <button class="btn btn--primary btn-small" data-dash-agendar="${p.id}">
                <span class="material-symbols-outlined">event</span> Agendar cita
              </button>
            </div>
          </div>`).join("");
    sc.querySelectorAll("[data-dash-agendar]").forEach(b =>
      b.addEventListener("click", () => agendarPacienteSinCita(Number(b.dataset.dashAgendar)))
    );
  }
}

function isoLocal(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function fmtHora12(hora, amPm) {
  let [h, m] = (hora || "00:00").split(":").map(Number);
  if (isNaN(h)) return hora || "";
  const suf = amPm || (h >= 12 ? "PM" : "AM");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m == null ? 0 : m).padStart(2, "0")} ${suf}`;
}

function fmtFechaES(iso) {
  if (!iso) return "-";
  const partes = iso.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : iso;
}

function rangoStatsDefecto() {
  const hoy = new Date();
  const hoyIso = isoLocal(hoy);
  return {
    desde: hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-01",
    hasta: hoyIso
  };
}

function abrirModalEstadisticas() {
  const r = rangoStatsDefecto();
  const desdeEl = document.getElementById("estDesde");
  const hastaEl = document.getElementById("estHasta");
  if (desdeEl) { desdeEl.value = r.desde; desdeEl.max = r.hasta; }
  if (hastaEl) { hastaEl.value = r.hasta; hastaEl.max = r.hasta; hastaEl.min = r.desde; }
  calcularEstadisticas();
  abrirModal("modalStats");
}

function aplicarRangoStats(tipo) {
  const desdeEl = document.getElementById("estDesde");
  const hastaEl = document.getElementById("estHasta");
  if (!desdeEl || !hastaEl) return;
  const hoy = new Date();
  const hoyIso = isoLocal(hoy);
  let desdeIso = hoyIso;
  if (tipo === "semana") {
    const lunes = Math.floor((hoy.getDay() + 6) % 7);
    desdeIso = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - lunes));
  } else if (tipo === "mes") {
    desdeIso = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-01";
  } else if (tipo === "3m") {
    const m3 = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
    desdeIso = m3.getFullYear() + "-" + String(m3.getMonth() + 1).padStart(2, "0") + "-01";
  } else if (tipo === "anio") {
    desdeIso = hoy.getFullYear() + "-01-01";
  }
  desdeEl.value = desdeIso;
  hastaEl.value = hoyIso;
  desdeEl.max = hoyIso;
  hastaEl.max = hoyIso;
  hastaEl.min = desdeIso;
  calcularEstadisticas();
}

function resetearPizarraStats() {
  const r = rangoStatsDefecto();
  const desdeEl = document.getElementById("estDesde");
  const hastaEl = document.getElementById("estHasta");
  if (desdeEl) { desdeEl.value = r.desde; desdeEl.max = r.hasta; }
  if (hastaEl) { hastaEl.value = r.hasta; hastaEl.max = r.hasta; hastaEl.min = r.desde; }
  [["estTotales", ""], ["estLineas", `<p class="empty">La pizarra está vacía. Pulsa "Calcular" para generar las estadísticas.</p>`], ["estPeriodo", `<p class="empty">Sin datos.</p>`], ["estPie", `<p class="empty">Sin datos.</p>`], ["estRangoTexto", ""]].forEach(par => {
    const el = document.getElementById(par[0]);
    if (el) el.innerHTML = par[1];
  });
}

function calcularEstadisticas() {
  const desde = document.getElementById("estDesde").value;
  const hasta = document.getElementById("estHasta").value;
  const rangoTxt = document.getElementById("estRangoTexto");
  if (rangoTxt) rangoTxt.textContent = `Rango analizado: ${fmtFechaES(desde)} al ${fmtFechaES(hasta)}`;

  const citas = State.citas.filter(c => c.fecha && c.fecha >= desde && c.fecha <= hasta);
  const pacientesUnicos = new Set(citas.map(c => c.pacienteId));
  const registros = State.registros.filter(r => {
    const iso = fechaESaISO(r.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const docs = State.documentos.filter(d => {
    const iso = fechaESaISO(d.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const facturas = State.facturas.filter(f => {
    const iso = fechaESaISO(f.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const dias = Math.max(1, Math.round((new Date(hasta + "T00:00:00") - new Date(desde + "T00:00:00")) / 86400000) + 1);

  const cont = document.getElementById("estTotales");
  if (cont) {
    cont.innerHTML = `
      <div class="est-card"><strong>${citas.length}</strong><span>Citas atendidas</span></div>
      <div class="est-card"><strong>${pacientesUnicos.size}</strong><span>Pacientes únicos</span></div>
      <div class="est-card"><strong>${registros.length}</strong><span>Registros creados</span></div>
      <div class="est-card"><strong>${docs.length}</strong><span>Documentos subidos</span></div>
      <div class="est-card"><strong>${facturas.length}</strong><span>Facturas emitidas</span></div>
      <div class="est-card"><strong>${(citas.length / dias).toFixed(2)}</strong><span>Promedio / día</span></div>
    `;
  }

  const pie = document.getElementById("estPie");
  if (pie) {
    pie.innerHTML = citas.length === 0
      ? `<p class="empty">Sin datos para el gráfico de pastel.</p>`
      : generarDonaSVG(serieSemana(citas), "Citas por día de la semana");
  }

  const periodo = document.getElementById("estPeriodo");
  if (periodo) {
    periodo.innerHTML = citas.length === 0
      ? `<p class="empty">Sin datos para el gráfico de pastel.</p>`
      : generarDonaSVG(seriePeriodo(desde, hasta, citas), "Citas por período");
  }

  const lineas = document.getElementById("estLineas");
  if (lineas) {
    lineas.innerHTML = (registros.length === 0 && docs.length === 0 && facturas.length === 0)
      ? `<p class="empty">Sin datos de registros, documentos o facturas en el rango seleccionado.</p>`
      : generarLineaSVG([
          { nombre: "Registros creados", color: "#1e8449", datos: serieLineal(desde, hasta, registros, r => fechaESaISO(r.fecha)) },
          { nombre: "Documentos subidos", color: "#3d648a", datos: serieLineal(desde, hasta, docs, d => fechaESaISO(d.fecha)) },
          { nombre: "Facturas", color: "#c95d3a", datos: serieLineal(desde, hasta, facturas, f => fechaESaISO(f.fecha)) }
        ], "Registros creados, documentos subidos y facturas por período");
  }
}

function serieDiaria(desde, hasta, citas) {
  const d1 = new Date(desde + "T00:00:00");
  const d2 = new Date(hasta + "T00:00:00");
  const dias = Math.max(1, Math.round((d2 - d1) / 86400000) + 1);

  const count = {};
  const porDia = dias <= 62;

  citas.forEach(c => {
    const clave = porDia ? c.fecha : c.fecha.slice(0, 7);
    count[clave] = (count[clave] || 0) + 1;
  });

  const datos = [];
  if (porDia) {
    const step = dias > 20 ? Math.ceil(dias / 15) : 1;
    for (let k = 0; k < dias; k++) {
      const iso = isoLocal(new Date(d1.getTime() + k * 86400000));
      datos.push({ label: iso.slice(8), val: count[iso] || 0, mostrar: k % step === 0 || k === dias - 1 });
    }
    return { tipo: "Citas por día", datos };
  }

  const cur = new Date(d1.getFullYear(), d1.getMonth(), 1);
  const end = new Date(d2.getFullYear(), d2.getMonth(), 1);
  while (cur <= end) {
    const mk = cur.getFullYear() + "-" + String(cur.getMonth() + 1).padStart(2, "0");
    datos.push({ label: mk, val: count[mk] || 0, mostrar: true });
    cur.setMonth(cur.getMonth() + 1);
  }
  return { tipo: "Citas por mes", datos };
}

function generarSVG(serie) {
  const W = 700, H = 260, padL = 48, padR = 12, padT = 26, padB = 38;
  const max = Math.max(1, ...serie.datos.map(d => d.val));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const bw = innerW / serie.datos.length;

  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const v = Math.max(1, Math.round(max * g / 4));
    const gy = padT + innerH * (1 - g / 4);
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="#e3dcd4" stroke-width="1"/>`;
    grid += `<text x="${padL - 6}" y="${gy + 4}" text-anchor="end" font-size="10" fill="#888">${v}</text>`;
  }

  const bars = serie.datos.map((d, i) => {
    const bh = d.val > 0 ? Math.max(2, (d.val / max) * innerH) : 0;
    const x = padL + i * bw;
    const y = padT + innerH - bh;
    const label = d.mostrar ? `<text x="${x + bw / 2}" y="${padT + innerH + 16}" text-anchor="middle" font-size="9.5" fill="#777">${d.label}</text>` : "";
    const valor = d.val > 0 ? `<text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1b2a4a">${d.val}</text>` : "";
    return `<rect x="${x + 1}" y="${y}" width="${Math.max(2, bw - 3)}" height="${bh}" rx="2.5" fill="${d.val > 0 ? "#c95d3a" : "#ddd6cf"}"/>${label}${valor}`;
  }).join("");

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${serie.tipo}">
  <text x="${padL}" y="${padT - 10}" font-size="12" font-weight="700" fill="#1b2a4a">${serie.tipo}</text>
  ${grid}${bars}
</svg>`;
}

function generarDonaSVG(serie, titulo) {
  const slices = serie.datos.filter(d => d.val > 0);
  if (slices.length === 0) return `<p class="empty">Sin datos para el gráfico de pastel.</p>`;
  const cx = 120, cy = 120, rOut = 96, rIn = 58;
  let a0 = 0;
  const paths = slices.map((d, i) => {
    const a1 = a0 + (d.val / serie.total) * 360;
    const p = slicePath(cx, cy, rOut, rIn, a0, a1);
    a0 = a1;
    return `<path d="${p}" fill="${PALETA_PIE[i % PALETA_PIE.length]}" stroke="#fff" stroke-width="2.5"/>`;
  }).join("");
  const leyenda = slices.map((d, i) => `
    <li>
      <span class="dot" style="background:${PALETA_PIE[i % PALETA_PIE.length]}"></span>
      <span class="pie-label">${d.label}</span>
      <span class="pie-val">${d.val} (${d.pct}%)</span>
    </li>`).join("");
  return `
    <div class="pie-block">
      <svg width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="${titulo}">
        ${paths}
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="22" font-weight="800" fill="#1b2a4a">${serie.total}</text>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="10" fill="#888">citas</text>
      </svg>
      <div class="pie-info">
        <p class="pie-titulo">${titulo}</p>
        <ul class="pie-legend">${leyenda}</ul>
      </div>
    </div>`;
}

function slicePath(cx, cy, rOut, rIn, a0, a1) {
  const rad0 = (a0 - 90) * Math.PI / 180;
  const rad1 = (a1 - 90) * Math.PI / 180;
  const x0 = cx + rOut * Math.cos(rad0);
  const y0 = cy + rOut * Math.sin(rad0);
  const x1 = cx + rOut * Math.cos(rad1);
  const y1 = cy + rOut * Math.sin(rad1);
  const xi0 = cx + rIn * Math.cos(rad1);
  const yi0 = cy + rIn * Math.sin(rad1);
  const xi1 = cx + rIn * Math.cos(rad0);
  const yi1 = cy + rIn * Math.sin(rad0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L ${xi0} ${yi0} A ${rIn} ${rIn} 0 ${large} 0 ${xi1} ${yi1} Z`;
}

const PALETA_PIE = ["#c95d3a", "#e07a5a", "#ef8f6d", "#3d648a", "#5c87ad", "#93b4cf", "#7a9a5b", "#b58a5b"];

function serieLineal(desde, hasta, items, getISO) {
  const d1 = new Date(desde + "T00:00:00");
  const d2 = new Date(hasta + "T00:00:00");
  const dias = Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  const porMes = dias > 62;
  const count = {};

  items.forEach(it => {
    const iso = getISO(it);
    if (!iso || iso < desde || iso > hasta) return;
    const clave = porMes ? iso.slice(0, 7) : iso;
    count[clave] = (count[clave] || 0) + 1;
  });

  if (porMes) {
    const cur = new Date(d1.getFullYear(), d1.getMonth(), 1);
    const end = new Date(d2.getFullYear(), d2.getMonth(), 1);
    const datos = [];
    while (cur <= end) {
      const mk = cur.getFullYear() + "-" + String(cur.getMonth() + 1).padStart(2, "0");
      datos.push({ label: `${MESES_CORTOS[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`, val: count[mk] || 0, mostrar: true });
      cur.setMonth(cur.getMonth() + 1);
    }
    return datos;
  }

  const step = dias > 20 ? Math.ceil(dias / 15) : 1;
  const datos = [];
  for (let k = 0; k < dias; k++) {
    const iso = isoLocal(new Date(d1.getTime() + k * 86400000));
    const dd = parseInt(iso.slice(8, 10), 10);
    const mm = parseInt(iso.slice(5, 7), 10);
    datos.push({ label: `${dd}/${mm}`, val: count[iso] || 0, mostrar: k % step === 0 || k === dias - 1 });
  }
  return datos;
}

function generarLineaSVG(series, titulo) {
  const W = 700, H = 260, padL = 48, padR = 16, padT = 32, padB = 38;
  const n = series[0].datos.length;
  const max = Math.max(1, ...series.flatMap(s => s.datos.map(d => d.val)));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const x = i => padL + (n > 1 ? i * stepX : innerW / 2);
  const y = v => padT + innerH - (v / max) * innerH;

  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const v = Math.round(max * g / 4);
    const gy = padT + innerH * (1 - g / 4);
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="#e3dcd4" stroke-width="1"/>`;
    grid += `<text x="${padL - 6}" y="${gy + 4}" text-anchor="end" font-size="10" fill="#888">${v}</text>`;
  }

  const paths = series.map(s => {
    const puntos = s.datos.map((d, i) => `${x(i)},${y(d.val)}`).join(" ");
    const dots = s.datos.map((d, i) =>
      `<circle cx="${x(i)}" cy="${y(d.val)}" r="3.4" fill="${s.color}"><title>${s.nombre} · ${d.label}: ${d.val}</title></circle>`
    ).join("");
    return `<polyline points="${puntos}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join("");

  const labels = series[0].datos.map((d, i) => d.mostrar === false
    ? ""
    : `<text x="${x(i)}" y="${padT + innerH + 16}" text-anchor="middle" font-size="9.5" fill="#777">${d.label}</text>`
  ).join("");

  const leyenda = series.map(s =>
    `<span class="line-legend"><i style="background:${s.color}"></i>${s.nombre}</span>`
  ).join("");

  return `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${titulo}">
      <text x="${padL}" y="${padT - 10}" font-size="12" font-weight="700" fill="#1b2a4a">${titulo}</text>
      ${grid}${paths}${labels}
    </svg>
    <div class="line-leyenda">${leyenda}</div>`;
}

function serieSemana(citas) {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const acc = [0, 0, 0, 0, 0, 0, 0];
  citas.forEach(c => {
    const d = new Date(c.fecha + "T00:00:00");
    if (!isNaN(d)) acc[d.getDay()]++;
  });
  const total = acc.reduce((a, b) => a + b, 0);
  return {
    total,
    datos: dias.map((label, i) => ({
      label,
      val: acc[i],
      pct: total ? Math.round(acc[i] * 100 / total) : 0
    }))
  };
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function seriePeriodo(desde, hasta, citas) {
  const d1 = new Date(desde + "T00:00:00");
  const d2 = new Date(hasta + "T00:00:00");
  const dias = Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  const porMes = dias > 62;
  const count = {};

  if (porMes) {
    citas.forEach(c => {
      const mk = c.fecha.slice(0, 7);
      count[mk] = (count[mk] || 0) + 1;
    });
  } else {
    citas.forEach(c => {
      const d = parseInt(c.fecha.slice(8, 10), 10);
      const k = Math.ceil(d / 7);
      count[k] = (count[k] || 0) + 1;
    });
  }

  const claves = Object.keys(count).sort();
  const total = claves.reduce((a, k) => a + count[k], 0);

  if (porMes) {
    const cur = new Date(d1.getFullYear(), d1.getMonth(), 1);
    const end = new Date(d2.getFullYear(), d2.getMonth(), 1);
    while (cur <= end) {
      const mk = cur.getFullYear() + "-" + String(cur.getMonth() + 1).padStart(2, "0");
      if (!count[mk]) claves.push(mk);
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    for (let k = 1; k <= 5; k++) {
      if (!count[k]) claves.push(k);
    }
  }
  claves.sort(porMes
    ? (a, b) => String(a).localeCompare(String(b))
    : (a, b) => a - b);

  const datos = claves.map(k => {
    const label = porMes
      ? `${MESES_CORTOS[parseInt(k.slice(5, 7), 10) - 1]}`
      : `${((k - 1) * 7) + 1}-${Math.min(k * 7, 31)}`;
    const val = count[k] || 0;
    return { label, val, pct: total ? Math.round(val * 100 / total) : 0 };
  });

  return { total, datos };
}

function imprimirEstadisticas() {
  const desde = document.getElementById("estDesde").value;
  const hasta = document.getElementById("estHasta").value;
  const citas = State.citas
    .filter(c => c.fecha && c.fecha >= desde && c.fecha <= hasta)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const registros = State.registros.filter(r => {
    const iso = fechaESaISO(r.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const docs = State.documentos.filter(d => {
    const iso = fechaESaISO(d.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const facturas = State.facturas.filter(f => {
    const iso = fechaESaISO(f.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  if (citas.length === 0 && docs.length === 0 && facturas.length === 0) {
    alert("No hay datos en el rango seleccionado.");
    return;
  }
  const pacientesUnicos = new Set(citas.map(c => c.pacienteId));

  const filas = citas.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    return `<tr><td>${c.fecha}</td><td>${c.hora}</td><td>${c.turno || "-"}</td><td>${p ? p.nombre : "Paciente eliminado"}</td><td>${c.motivo || ""}</td></tr>`;
  }).join("");

  abrirImpresion(`Estadísticas de pacientes atendidos (${fmtFechaES(desde)} al ${fmtFechaES(hasta)})`,
    `
    <p class="print-resumen"><strong>Citas atendidas:</strong> ${citas.length} &nbsp;·&nbsp; <strong>Pacientes únicos:</strong> ${pacientesUnicos.size} &nbsp;·&nbsp; <strong>Registros creados:</strong> ${registros.length} &nbsp;·&nbsp; <strong>Documentos subidos:</strong> ${docs.length} &nbsp;·&nbsp; <strong>Facturas emitidas:</strong> ${facturas.length}</p>
    ${generarDonaSVG(seriePeriodo(desde, hasta, citas), "Citas por período")}
    <p class="print-resumen"><strong>Citas por día de la semana:</strong></p>
    ${generarDonaSVG(serieSemana(citas), "Citas por día de la semana")}
    <p class="print-resumen"><strong>Documentos subidos y facturas por período:</strong></p>
    ${generarLineaSVG([
      { nombre: "Documentos subidos", color: "#3d648a", datos: serieLineal(desde, hasta, docs, d => fechaESaISO(d.fecha)) },
      { nombre: "Facturas", color: "#c95d3a", datos: serieLineal(desde, hasta, facturas, f => fechaESaISO(f.fecha)) }
    ], "Documentos subidos y facturas por período")}
    <table>
      <thead><tr><th>Fecha</th><th>Hora</th><th>Turno</th><th>Paciente</th><th>Motivo</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `
  );
}

function exportarEstadisticas() {
  const desde = document.getElementById("estDesde").value;
  const hasta = document.getElementById("estHasta").value;
  const citas = State.citas
    .filter(c => c.fecha && c.fecha >= desde && c.fecha <= hasta)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const pacientesUnicos = new Set(citas.map(c => c.pacienteId));
  const registros = State.registros.filter(r => {
    const iso = fechaESaISO(r.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const docs = State.documentos.filter(d => {
    const iso = fechaESaISO(d.fecha);
    return iso && iso >= desde && iso <= hasta;
  });
  const facturas = State.facturas.filter(f => {
    const iso = fechaESaISO(f.fecha);
    return iso && iso >= desde && iso <= hasta;
  });

  const esc = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const filas = [
    `Tipo,Dato,Valor`,
    `Resumen,Rango,${fmtFechaES(desde)} al ${fmtFechaES(hasta)}`,
    `Resumen,Citas atendidas,${citas.length}`,
    `Resumen,Pacientes unicos,${pacientesUnicos.size}`,
    `Resumen,Registros creados,${registros.length}`,
    `Resumen,Documentos subidos,${docs.length}`,
    `Resumen,Facturas emitidas,${facturas.length}`,
    ``,
    `Fecha,Hora,Turno,Codigo,Paciente,Cedula,Seguro,Motivo`
  ];
  citas.forEach(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    filas.push([c.fecha, c.hora, c.turno || "", p ? p.codigo : "", p ? p.nombre : "Paciente eliminado", p ? p.cedula : "", p ? p.seguro : "", c.motivo || ""].map(esc).join(","));
  });

  const blob = new Blob(["\uFEFF" + filas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "estadisticas_atendidos_" + isoLocal(new Date()).replace(/-/g, "") + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

const NOMBRES_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const NOMBRES_DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

let calendarioVista = null;
let calendarioDia = null;
let calendarioEditando = null;

function resumenVisitasPaciente(pacienteId) {
  const citas = State.citas.filter(c => c.pacienteId === pacienteId);
  return {
    citas: citas.length,
    vistas: citas.filter(c => c.completada).length
  };
}

function renderProximaCita() {
  const panel = document.getElementById("panelProximaCita");
  const sel = document.getElementById("citaPaciente");
  if (!panel || !sel) return;
  const id = Number(sel.value || 0);
  const p = State.pacientes.find(x => x.id === id && !x.eliminado);
  if (!p) {
    panel.hidden = true;
    return;
  }
  const hoyISO = isoLocal(new Date());
  const hoySolo = hoyISO.slice(0, 10);
  const proximas = State.citas
    .filter(c => c.pacienteId === id && !c.completada && !c.cancelada && c.fecha >= hoySolo)
    .sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));
  const prox = proximas[0];
  const pasadas = State.citas
    .filter(c => c.pacienteId === id && c.fecha < hoySolo)
    .sort((a, b) => (b.fecha + (b.hora || "")).localeCompare(a.fecha + (a.hora || "")));
  const anterior = pasadas[0];
  const puedeProgramar = anterior && anterior.completada;
  const registros = State.registros
    .filter(r => r.pacienteId === id)
    .sort((a, b) => (fechaESaISO(b.fecha) || b.fecha).localeCompare(fechaESaISO(a.fecha) || a.fecha));
  const registro = registros[0];
  const v = resumenVisitasPaciente(id);

  const cod = document.getElementById("pcCodigo");
  if (cod) cod.textContent = p.codigo;
  const info = document.getElementById("pcInfo");
  if (info) {
    info.innerHTML = `
      <div class="ficha">
        <p><strong>Paciente:</strong> ${p.nombre} · <strong>Cédula:</strong> ${p.cedula || "-"} · <strong>Teléfono:</strong> ${p.telefono || "-"}</p>
        <p><strong>Veces visto:</strong> ${v.vistas} · <strong>Total de citas:</strong> ${v.citas}</p>
        <div class="prox-cita">
          <strong>Próxima cita programada:</strong>
          ${prox ? `${fmtFechaES(prox.fecha)} · ${fmtHora12(prox.hora, prox.amPm)} - ${prox.motivo}` : "Sin cita programada"}
        </div>
        <div class="prox-cita">
          <strong>Registro de la cita anterior:</strong>
          ${anterior
            ? `${fmtFechaES(anterior.fecha)} · ${fmtHora12(anterior.hora, anterior.amPm)} - ${anterior.motivo || "Consulta"}` +
              ` ${anterior.completada ? `<span class="tag tag-rest">Completada</span>` : ""}`
            : "Sin cita anterior registrada"}
          ${anterior && (anterior.diagnostico || anterior.tratamiento) ? `<br>Diagnóstico: ${anterior.diagnostico || "-"} · Tratamiento: ${anterior.tratamiento || "-"}` : ""}
        </div>
        <div class="prox-cita">
          <strong>Último registro clínico:</strong>
          ${registro ? `${registro.fecha} - ${registro.titulo || "Registro"}${registro.detalle ? ": " + registro.detalle : ""}` : "Sin registros clínicos"}
        </div>
        <div class="prox-cita" style="text-align:center">
          <strong>Programar cita próxima</strong>
          ${puedeProgramar
            ? `<p class="limite-info" style="margin:0.3em 0 0.7em">El paciente ya tiene una cita completada, que es el requisito para programar una nueva consulta.</p>
               <button type="button" class="btn btn--primary" id="btnProgramarProxima">
                 <span class="material-symbols-outlined">event</span> Programar próxima cita
               </button>`
            : `<p class="limite-info" style="margin:0.3em 0">Para poder programar una nueva cita se requiere que el paciente tenga una cita anterior completada. Este paciente aún no tiene una.</p>`}
        </div>
      </div>`;
    const btnProg = document.getElementById("btnProgramarProxima");
    if (btnProg) btnProg.addEventListener("click", () => programarProximaCita(id));
  }
  panel.hidden = false;
}

function programarProximaCita(id) {
  const sel = document.getElementById("citaPaciente");
  if (sel) sel.value = String(id);
  const fechaEl = document.getElementById("citaFecha");
  if (fechaEl) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    fechaEl.value = isoLocal(d);
  }
  renderProximaCita();
  const form = document.getElementById("citaForm");
  if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
  const hora = document.getElementById("citaHora");
  if (hora) hora.focus();
}

function abrirCalendario() {
  const hoy = new Date();
  calendarioVista = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  calendarioDia = null;
  calendarioEditando = null;
  const ed = document.getElementById("calEditor");
  if (ed) ed.classList.remove("open");
  renderCalendario();
  abrirModal("modalCalendario");
}

function cambiarMes(dir) {
  calendarioVista.mes += dir;
  if (calendarioVista.mes < 0) { calendarioVista.mes = 11; calendarioVista.anio--; }
  if (calendarioVista.mes > 11) { calendarioVista.mes = 0; calendarioVista.anio++; }
  calendarioDia = null;
  renderCalendario();
}

function renderCalendario() {
  const { anio, mes } = calendarioVista;
  if (!anio) return;

  const titulo = document.getElementById("calTitulo");
  if (titulo) titulo.textContent = `${NOMBRES_MESES[mes]} ${anio}`;

  const primer = new Date(anio, mes, 1);
  const offset = (primer.getDay() + 6) % 7;
  const totalDias = new Date(anio, mes + 1, 0).getDate();
  const hoyIso = isoLocal(new Date());

  let celdas = "";
  for (let i = 0; i < offset; i++) celdas += `<div class="cal-vacio"></div>`;
  for (let d = 1; d <= totalDias; d++) {
    const iso = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const n = State.citas.filter(c => c.fecha === iso && !c.completada && !c.cancelada).length;
    const clases = ["cal-dia"];
    if (iso === hoyIso) clases.push("hoy");
    if (iso === calendarioDia) clases.push("sel");
    if (n > 0) clases.push("tiene");
    celdas += `<div class="${clases.join(" ")}" data-dia="${iso}" title="${fmtFechaES(iso)}">
      <span class="cal-num">${d}</span>
      ${n > 0 ? `<span class="cal-count">${n}</span>` : ""}
    </div>`;
  }

  const grid = document.getElementById("calGrid");
  if (grid) {
    grid.innerHTML = NOMBRES_DIAS.map(d => `<div class="cal-dow">${d}</div>`).join("") + celdas;
    grid.querySelectorAll(".cal-dia, .cal-dia").forEach(cel => { }); // no change
    // fix encoding: use consistent
    grid.querySelectorAll(".cal-dia").forEach(cel =>
      cel.addEventListener("click", () => { calendarioDia = cel.dataset.dia; renderCalendario(); })
    );
  }

  renderCalDetalle();
  const ed = document.getElementById("calEditor");
  if (ed) ed.classList.remove("open");
  calendarioEditando = null;
}

function renderCalDetalle() {
  const cont = document.getElementById("calDetalle");
  if (!cont) return;
  if (!calendarioDia) {
    cont.innerHTML = `<p class="empty">Selecciona un día en el calendario para ver sus citas.</p>`;
    return;
  }
  const citas = State.citas
    .filter(c => c.fecha === calendarioDia && !c.completada && !c.cancelada)
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
  if (citas.length === 0) {
    cont.innerHTML = `<p class="empty">Sin citas el ${fmtFechaES(calendarioDia)}.</p>`;
    return;
  }
  cont.innerHTML = `<h3 class="cal-detalle-titulo">Citas · ${fmtFechaES(calendarioDia)}</h3>` + citas.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    const v = resumenVisitasPaciente(c.pacienteId);
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${fmtHora12(c.hora, c.amPm)}</strong>
          <span class="tag">Turno ${c.turno || "-"}</span>
          <span class="tag" title="Citas programadas del paciente">${v.citas} cita(s)</span>
          <span class="tag" title="Veces que el paciente ha sido visto (citas completadas)">${v.vistas} vista(s)</span>
        </div>
        <div class="item-sub">${p ? p.nombre : "Paciente eliminado"} - ${c.motivo || "Consulta"}</div>
        <div class="item-actions">
          <button class="btn-icon" data-editar-cal="${c.id}" title="Editar fecha y hora">
            <span class="material-symbols-outlined">edit</span>
          </button>
          ${pacienteEliminadoDe(c.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-cal="${c.id}" title="Eliminar cita">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  cont.querySelectorAll("[data-editar-cal]").forEach(b =>
    b.addEventListener("click", () => abrirEditorCita(Number(b.dataset.editarCal)))
  );
  cont.querySelectorAll("[data-borrar-cal]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar esta cita?")) return;
      State.citas = State.citas.filter(x => x.id !== Number(b.dataset.borrarCal));
      saveKey("citas");
      renderCalendario();
      renderCitas();
      renderHome();
    })
  );
}

function abrirEditorCita(id) {
  const c = State.citas.find(x => x.id === id);
  if (!c) return;
  calendarioEditando = id;
  document.getElementById("calFecha").value = c.fecha || "";
  document.getElementById("calHora").value = c.hora || "09:00";
  document.getElementById("calAmPm").value = c.amPm || "PM";
  document.getElementById("calMotivo").value = c.motivo || "";
  const ed = document.getElementById("calEditor");
  if (ed) ed.classList.add("open");
}

function guardarEdicionCalendario() {
  if (!calendarioEditando) return;
  const c = State.citas.find(x => x.id === calendarioEditando);
  if (!c) return;
  const nuevaFecha = document.getElementById("calFecha").value;
  if (!nuevaFecha) { alert("Selecciona la fecha."); return; }

  if (nuevaFecha !== c.fecha) {
    const error = validarLimiteCitas(nuevaFecha);
    if (error) { alert(error); return; }
  }

  c.fecha = nuevaFecha;
  c.hora = document.getElementById("calHora").value;
  c.amPm = document.getElementById("calAmPm") ? document.getElementById("calAmPm").value : "PM";
  c.motivo = document.getElementById("calMotivo").value.trim() || c.motivo;
  State.citas
    .filter(x => x.fecha === c.fecha)
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || "") || a.id - b.id)
    .forEach((x, i) => x.turno = i + 1);

  saveKey("citas");
  calendarioEditando = null;
  calendarioDia = c.fecha;
  renderCalendario();
  renderCitas();
  renderHome();
}

let recetaMedsBus = [];
let recetaIndsBus = [];
let recetaActualId = null;

const INDICACIONES_GRUPOS = [
  {
    grupo: "SONOGRAFÍA",
    items: ["SONOGRAFIA DE PARTES BLANDAS DE:", "SONOGRAFIA MUSCULOESQUELETICA DE:"]
  },
  {
    grupo: "RADIOGRAFÍA",
    items: [
      "RADIOGRAFIA DE COLUMNA CERVICAL AP/LAT",
      "RADIOGRAFIA DE COLUMNA DORSOLUMBAR AP/LAT",
      "RADIOGRAFIA DE COLUMNA DORSAL AP/LAT",
      "RADIOGRAFIA DE COLUMNA LUMBAR AP/LAT",
      "RADIOGRAFIA DE COLUMNA LUMBARSACRA AP/LAT",
      "RADIOGRAFIA DE HOMBRO",
      "RADIOGRAFIA DE BRAZO DERECHO AP/LAT",
      "RADIOGRAFIA DE BRAZO IZQUIERDO AP/LAT",
      "RADIOGRAFIA DE CODO DERECHO AP/LAT",
      "RADIOGRAFIA DE CODO IZQUIERDO AP/LAT",
      "RADIOGRAFIA DE ANTEBRAZO DERECHO AP/LAT",
      "RADIOGRAFIA DE ANTEBRAZO IZQUIERDO AP/LAT",
      "RADIOGRAFIA DE MUÑECA DERECHA AP/LAT",
      "RADIOGRAFIA DE MUÑECA IZQUIERDA AP/LAT",
      "RADIOGRAFIA DE MANO DERECHA AP/OBLICUA",
      "RADIOGRAFIA DE MANO IZQUIERDA AP/OBLICUA",
      "RADIOGRAFIA DE PELVIS AP",
      "RADIOGRAFIA DE MUSLO DERECHO AP/LAT",
      "RADIOGRAFIA DE MUSLO IZQUIERDO AP/LAT",
      "RADIOGRAFIA DE RODILLA DERECHA AP/LAT",
      "RADIOGRAFIA DE RODILLA IZQUIERDA AP/LAT",
      "RADIOGRAFIA DE PIERNA DERECHA AP/LAT",
      "RADIOGRAFIA DE PIERNA IZQUIERDA AP/LAT",
      "RADIOGRAFIA DE TOBILLO DERECHO AP/LAT",
      "RADIOGRAFIA DE TOBILLO IZQUIERDO AP/LAT",
      "RADIOGRAFIA DE PIE DERECHO AP/OBLICUA",
      "RADIOGRAFIA DE PIE IZQUIERDO AP/OBLICUA"
    ]
  },
  {
    grupo: "RESONANCIA MAGNÉTICA",
    items: [
      "RESONANCIA MAGNETICA CERVICAL",
      "RESONANCIA MAGNETICA HOMBRO DERECHO",
      "RESONANCIA MAGNETICA HOMBRO IZQUIERDO",
      "RESONANCIA MAGNETICA CODO DERECHO",
      "RESONANCIA MAGNETICA CODO IZQUIERDO",
      "RESONANCIA MAGNETICA MUÑECA DERECHA",
      "RESONANCIA MAGNETICA MUÑECA IZQUIERDA",
      "RESONANCIA MAGNETICA RODILLA DERECHA",
      "RESONANCIA MAGNETICA RODILLA IZQUIERDA",
      "RESONANCIA MAGNETICA TOBILLO DERECHO",
      "RESONANCIA MAGNETICA TOBILLO IZQUIERDO"
    ]
  },
  {
    grupo: "ELECTROMIOGRAFÍA",
    items: [
      "ELECTROMIOGRAFIA DE MIEMBROS SUPERIORES",
      "ELECTROMIOGRAFIA DE MIEMBROS INFERIORES"
    ]
  },
  {
    grupo: "ANALÍTICAS PREQUIRÚRGICAS",
    items: [
      "HEMOGRAMA",
      "TIPIFICACION",
      "GLICEMIA",
      "UREA-CREATININA",
      "TGO-TGP",
      "TP,TPT,INR",
      "EXAMEN DE ORINA",
      "HIV",
      "HVC",
      "HBSAG",
      "VDRL"
    ]
  },
  {
    grupo: "EVALUACIÓN PREQUIRÚRGICA / REFERIDO A",
    items: [
      "CARDIOLOGIA",
      "NEUMOLOGIA",
      "ENDOCRINOLOGIA/DIABETOLOGIA",
      "HEMATOLOGIA",
      "NEUROLOGIA",
      "INFECTOLOGIA"
    ]
  },
  {
    grupo: "PERFIL INFLAMATORIO BÁSICO",
    items: [
      "Hemograma completo",
      "VSG",
      "Proteína C reactiva (PCR)"
    ]
  },
  {
    grupo: "PERFIL AUTOINMUNE",
    items: [
      "Hemograma completo",
      "VSG",
      "Proteína C reactiva (PCR)",
      "Factor reumatoide (FR)",
      "Anticuerpos antinucleares (ANA)",
      "Anti-CCP / anticuerpos antipéptido cíclico citrulinado"
    ]
  }
];

let facturaCarrito = [];

function fillProcedimientos() {
  const sel = document.getElementById("facturaProcedimiento");
  if (!sel) return;
  sel.innerHTML = PROCEDIMIENTOS
    .map((p, i) => `<option value="${i}">${p.nombre} - $${p.precio}</option>`)
    .join("");
}

function calcFactura() {
  const subtotal = facturaCarrito.reduce((sum, it) => sum + it.precio, 0);
  const porcentaje = Math.min(100, Math.max(0, Number(document.getElementById("facturaPorcentaje").value) || 0));
  const honorarios = subtotal * porcentaje / 100;
  const neto = subtotal - honorarios;
  return { subtotal, porcentaje, honorarios, neto };
}

function fmtMoney(n) {
  return "$" + n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderFacturaItems() {
  const cont = document.getElementById("facturaItems");
  if (!cont) return;

  if (facturaCarrito.length === 0) {
    cont.innerHTML = `<p class="empty">Sin procedimientos. Agrega al menos uno.</p>`;
  } else {
    cont.innerHTML = facturaCarrito.map((it, i) => `
      <div class="list-item item-compact">
        <div class="item-main">
          <strong>${it.nombre}</strong>
          <span class="item-price">${fmtMoney(it.precio)}</span>
        </div>
        <div class="item-actions">
          <button class="btn-icon danger" data-quitar="${i}" title="Quitar">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    `).join("");
  }

  cont.querySelectorAll("[data-quitar]").forEach(b =>
    b.addEventListener("click", () => {
      facturaCarrito.splice(Number(b.dataset.quitar), 1);
      renderFacturaItems();
    })
  );

  updateFacturaResumen();
}

function updateFacturaResumen() {
  const { subtotal, porcentaje, honorarios, neto } = calcFactura();
  document.getElementById("resumenSubtotal").textContent = fmtMoney(subtotal);
  document.getElementById("resumenHonorarios").textContent = fmtMoney(honorarios);
  document.getElementById("resumenNeto").textContent = fmtMoney(neto);
  document.getElementById("resumenTotal").textContent = fmtMoney(subtotal);
}

function renderFacturas() {
  const lista = document.getElementById("listaFacturas");
  if (!lista) return;

  if (State.facturas.length === 0) {
    lista.innerHTML = `<p class="empty">No hay facturas emitidas.</p>`;
    return;
  }

  lista.innerHTML = [...State.facturas].reverse().map(f => {
    const p = State.pacientes.find(x => x.id === f.pacienteId);
    const items = f.items || [];
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${f.codigo}</strong>
          <span class="tag">${fmtFechaES(f.fecha)}</span>
          <span class="tag tag-price">${fmtMoney(f.total)}</span>
        </div>
        <div class="item-sub">${p ? p.nombre : "Paciente eliminado"} · Dr(a). ${f.doctor}</div>
        <div class="item-sub">Honorarios: ${fmtMoney(f.honorarios)} (${f.porcentaje}%) · Neto clínica: ${fmtMoney(f.neto)}</div>
        <div class="item-sub detalles-factura" id="detFactura-${f.id}" hidden>
          ${items.length ? items.map(it => `<span>· ${it.nombre}: ${fmtMoney(it.precio)}</span>`).join("<br>") : `<span>Sin procedimientos guardados</span>`}
        </div>
        <div class="item-actions">
          <button class="btn-icon" data-det-factura="${f.id}" title="Ver detalle">
            <span class="material-symbols-outlined">expand_more</span>
          </button>
          <button class="btn-icon" data-editar-factura="${f.id}" title="Editar factura">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon" data-imprimir-factura="${f.id}" title="Imprimir factura">
            <span class="material-symbols-outlined">print</span>
          </button>
          ${pacienteEliminadoDe(f.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-factura="${f.id}" title="Eliminar factura">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-det-factura]").forEach(b =>
    b.addEventListener("click", () => {
      const det = document.getElementById("detFactura-" + b.dataset.detFactura);
      if (det) det.hidden = !det.hidden;
    })
  );
  lista.querySelectorAll("[data-editar-factura]").forEach(b =>
    b.addEventListener("click", () => abrirModalEditarFactura(Number(b.dataset.editarFactura)))
  );
  lista.querySelectorAll("[data-imprimir-factura]").forEach(b =>
    b.addEventListener("click", () => pedirImpresionFactura(Number(b.dataset.imprimirFactura)))
  );
  lista.querySelectorAll("[data-borrar-factura]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar esta factura?")) return;
      State.facturas = State.facturas.filter(x => x.id !== Number(b.dataset.borrarFactura));
      saveKey("facturas");
      renderFacturas();
      renderHome();
    })
  );
}

let editarFacturaId = null;
let editarFacturaTmp = null;

function abrirModalEditarFactura(id) {
  const f = State.facturas.find(x => x.id === id);
  if (!f) return;
  editarFacturaId = id;
  editarFacturaTmp = { ...f, items: (f.items || []).map(it => ({ ...it })) };
  const p = State.pacientes.find(x => x.id === f.pacienteId);
  const nom = document.getElementById("edFactPaciente");
  if (nom) nom.value = p ? `${p.nombre} (${p.codigo})` : "Paciente eliminado";
  document.getElementById("edFactPorcentaje").value = f.porcentaje != null ? f.porcentaje : 0;
  renderEditarFacturaItems();
  abrirModal("modalEditarFactura");
}

function renderEditarFacturaItems() {
  const cont = document.getElementById("edFactItems");
  if (!cont || !editarFacturaTmp) return;
  const items = (editarFacturaTmp.items && editarFacturaTmp.items.length)
    ? editarFacturaTmp.items
    : [{ nombre: "", precio: "" }];
  cont.innerHTML = items.map((it, i) => `
    <div class="list-item item-compact">
      <div class="item-main ed-fact-fill">
        <input type="text" class="edFactNombre" value="${String(it.nombre || "").replace(/"/g, "&quot;")}" placeholder="Procedimiento" />
      </div>
      <div class="item-main ed-fact-price">
        <input type="number" class="edFactPrecio" value="${it.precio != null ? it.precio : ""}" min="0" step="0.01" placeholder="0.00" />
      </div>
      <div class="item-actions">
        <button class="btn-icon danger" data-quitar-edit="${i}" title="Quitar">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  `).join("") + `
    <button type="button" class="btn btn--ghost-dark btn-small" id="btnEdFactAgregar">
      <span class="material-symbols-outlined">add</span> Agregar procedimiento
    </button>`;

  cont.querySelectorAll("[data-quitar-edit]").forEach(b =>
    b.addEventListener("click", () => {
      const it = editarFacturaTmp.items || (editarFacturaTmp.items = []);
      it.splice(Number(b.dataset.quitarEdit), 1);
      renderEditarFacturaItems();
    })
  );
  const btnAdd = document.getElementById("btnEdFactAgregar");
  if (btnAdd) btnAdd.addEventListener("click", () => {
    (editarFacturaTmp.items || (editarFacturaTmp.items = [])).push({ nombre: "", precio: "" });
    renderEditarFacturaItems();
  });
  cont.querySelectorAll(".edFactNombre, .edFactPrecio").forEach(el =>
    el.addEventListener("input", updateEditarFacturaResumen)
  );
  updateEditarFacturaResumen();
}

function updateEditarFacturaResumen() {
  if (!editarFacturaTmp) return;
  const nomes = Array.from(document.querySelectorAll(".edFactNombre"));
  const precios = Array.from(document.querySelectorAll(".edFactPrecio"));
  const items = nomes.map((n, i) => ({
    nombre: n.value.trim(),
    precio: parseFloat(precios[i].value) || 0
  })).filter(it => it.nombre);
  const sub = items.reduce((a, it) => a + it.precio, 0);
  const pct = parseFloat(document.getElementById("edFactPorcentaje").value) || 0;
  document.getElementById("edResumenSubtotal").textContent = fmtMoney(sub);
  document.getElementById("edResumenHonorarios").textContent = fmtMoney(sub * pct / 100);
  document.getElementById("edResumenNeto").textContent = fmtMoney(sub - (sub * pct / 100));
  document.getElementById("edResumenTotal").textContent = fmtMoney(sub);
}

function guardarFacturaEditada() {
  const f = State.facturas.find(x => x.id === editarFacturaId);
  if (!f || !editarFacturaTmp) return;
  updateEditarFacturaResumen();
  const items = (editarFacturaTmp.items || []).filter(it => it.nombre && it.precio > 0);
  if (items.length === 0) {
    alert("Agrega al menos un procedimiento válido con su precio.");
    return;
  }
  const sub = items.reduce((a, it) => a + it.precio, 0);
  const pct = parseFloat(document.getElementById("edFactPorcentaje").value) || 0;
  f.items = items;
  f.subtotal = sub;
  f.porcentaje = pct;
  f.honorarios = sub * pct / 100;
  f.neto = sub - f.honorarios;
  f.total = sub;
  saveKey("facturas");
  editarFacturaId = null;
  editarFacturaTmp = null;
  cerrarModales();
  renderFacturas();
  renderHome();
}

function imprimirFactura(id) {
  const f = State.facturas.find(x => x.id === id);
  if (!f) return;
  const p = State.pacientes.find(x => x.id === f.pacienteId);
  const items = f.items || [];
  const filas = items.map((it, i) =>
    `<tr><td>${i + 1}</td><td>${it.nombre}</td><td>${fmtMoney(it.precio)}</td></tr>`
  ).join("");
  abrirImpresion("Factura - " + f.codigo, `
    <div class="print-resumen"><strong>Paciente:</strong> ${p ? p.nombre : "Paciente eliminado"}${p && p.codigo ? ` (${p.codigo})` : ""}</div>
    <div class="print-resumen"><strong>Fecha:</strong> ${fmtFechaES(f.fecha)} · <strong>Doctor:</strong> Dr(a). ${f.doctor}</div>
    <table>
      <thead><tr><th>#</th><th>Procedimiento</th><th>Precio</th></tr></thead>
      <tbody>${filas || `<tr><td colspan="3">Sin procedimientos guardados</td></tr>`}</tbody>
      <tfoot>
        <tr><td colspan="2">Subtotal</td><td>${fmtMoney(f.subtotal)}</td></tr>
        <tr><td colspan="2">Honorarios del doctor (${f.porcentaje || 0}%)</td><td>${fmtMoney(f.honorarios)}</td></tr>
        <tr><td colspan="2">Neto clínica</td><td>${fmtMoney(f.neto)}</td></tr>
        <tr><td colspan="2"><strong>Total a pagar</strong></td><td><strong>${fmtMoney(f.total)}</strong></td></tr>
      </tfoot>
    </table>
  `);
}

function agregarFilaMed() {
  recetaMedsBus.push({
    nombre: "",
    tipo: "Generico",
    via: "Oral",
    forma: "Tableta",
    dosis: "",
    frecuencia: "",
    frecuenciaUnidad: "horas",
    duracion: "",
    duracionUnidad: "dias"
  });
  renderRecetaMeds();
}

function quitarFilaMed(idx) {
  recetaMedsBus.splice(idx, 1);
  renderRecetaMeds();
}

function renderRecetaMeds() {
  const cont = document.getElementById("recetaMeds");
  if (!cont) return;
  if (recetaMedsBus.length === 0) {
    cont.innerHTML = `<p class="empty">Aún no has agregado medicamentos.</p>`;
    return;
  }
  cont.innerHTML = recetaMedsBus.map((m, i) => `
    <div class="rec-med-row">
      <div class="rec-med-grid">
        <label class="rec-med-nombre">Medicamento
          <div class="rec-autocomplete">
            <input type="text" class="recMedNombre" value="${m.nombre}" placeholder="Escribe y busca en el catálogo…" required />
            <div class="rec-ac-drop" hidden></div>
          </div>
          <span class="recMedLab">Catálogo referencial: 53 medicamentos ortopédicos en 10 categorías · registro sanitario DIGEMAPS (MSP) · actualizado 2026</span>
        </label>
        <label>Tipo
          <select class="recMedTipo">
            <option value="Generico" ${m.tipo === "Generico" ? "selected" : ""}>Genérico</option>
            <option value="Comercial" ${m.tipo === "Comercial" ? "selected" : ""}>Comercial</option>
          </select>
        </label>
        <label>Vía
          <select class="recMedVia">
            ${VIAS_MED.map(v => `<option value="${v}" ${m.via === v ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </label>
        <label>Presentación
          <select class="recMedForma">
            ${FORMAS_MED_PRESENTACION.map(f => `<option value="${f}" ${m.forma === f ? "selected" : ""}>${f}</option>`).join("")}
          </select>
        </label>
        <label>Dosis
          <input type="text" class="recMedDosis" value="${m.dosis}" placeholder="Ej.: 1 tableta" />
        </label>
        <label>Cada
          <div class="num-unidad">
            <input type="number" class="recMedFrec" min="1" value="${m.frecuencia}" placeholder="Cant." />
            <select class="recMedFrecUnidad">
              <option value="horas" ${m.frecuenciaUnidad === "horas" ? "selected" : ""}>horas</option>
              <option value="dias" ${m.frecuenciaUnidad === "dias" ? "selected" : ""}>días</option>
            </select>
          </div>
        </label>
        <label>Durante
          <div class="num-unidad">
            <input type="number" class="recMedDur" min="1" value="${m.duracion}" placeholder="Cant." />
            <select class="recMedDurUnidad">
              <option value="dias" ${m.duracionUnidad === "dias" ? "selected" : ""}>días</option>
              <option value="semanas" ${m.duracionUnidad === "semanas" ? "selected" : ""}>semanas</option>
              <option value="meses" ${m.duracionUnidad === "meses" ? "selected" : ""}>meses</option>
            </select>
          </div>
        </label>
        <button type="button" class="btn-icon danger rec-med-quitar" data-quitar-med="${i}" title="Quitar medicamento">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `).join("");

  cont.querySelectorAll("[data-quitar-med]").forEach(b =>
    b.addEventListener("click", () => quitarFilaMed(Number(b.dataset.quitarMed)))
  );
  cont.querySelectorAll(".recMedNombre").forEach(inp => {
    inp.addEventListener("focus", () => mostrarAutocompletarMed(inp));
    inp.addEventListener("input", () => mostrarAutocompletarMed(inp));
    inp.addEventListener("blur", () => setTimeout(() => cerrarAutocompletarMed(inp), 150));
    inp.addEventListener("keydown", ev => {
      if (ev.key === "Escape") cerrarAutocompletarMed(inp);
    });
  });
  cont.querySelectorAll(".rec-autocomplete").forEach(w => {
    w.addEventListener("click", ev => {
      const opt = ev.target.closest(".rec-ac-opt");
      if (!opt) return;
      const inp = w.querySelector(".recMedNombre");
      const idx = Number(opt.dataset.idx);
      const m = MEDICAMENTOS_CATALOGO[idx];
      if (!m) return;
      inp.value = m.n + " " + m.mg;
      const fila = w.closest(".rec-med-row");
      const formaSel = fila ? fila.querySelector(".recMedForma") : null;
      if (formaSel && FORMAS_MED_PRESENTACION.indexOf(m.f) !== -1) formaSel.value = m.f;
      inp.dispatchEvent(new Event("input"));
      cerrarAutocompletarMed(inp);
    });
  });
}

function mostrarAutocompletarMed(inp) {
  const w = inp.closest(".rec-autocomplete");
  if (!w) return;
  const drop = w.querySelector(".rec-ac-drop");
  if (!drop) return;
  const q = inp.value.trim().toLowerCase();
  const base = q
    ? MEDICAMENTOS_CATALOGO.map((m, i) => ({ m, i })).filter(x => textoMedicamento(x.m).indexOf(q) !== -1)
    : MEDICAMENTOS_CATALOGO.map((m, i) => ({ m, i }));
  const top = base.slice(0, 9);
  if (!top.length) {
    drop.innerHTML = `<div class="rec-ac-empty">Sin coincidencias en el catálogo 2026</div>`;
  } else {
    drop.innerHTML = top.map(x => `
      <button type="button" class="rec-ac-opt" data-idx="${x.i}">
        <span class="rec-ac-nom">${escHtml(x.m.n)} <span class="rec-ac-mg">${escHtml(x.m.mg)}</span></span>
        <span class="rec-ac-lab">${escHtml(x.m.lab)}</span>
        <span class="rec-ac-forma">${escHtml(x.m.f)} · ${escHtml(x.m.g)}</span>
      </button>`).join("");
  }
  drop.hidden = false;
  if (drop.scrollTop) drop.scrollTop = 0;
}

function cerrarAutocompletarMed(inp) {
  const w = inp.closest(".rec-autocomplete");
  if (!w) return;
  const drop = w.querySelector(".rec-ac-drop");
  if (drop) drop.hidden = true;
}

function leerRecetaMeds() {
  return [...document.querySelectorAll("#recetaMeds .rec-med-row")].map(r => ({
    nombre: r.querySelector(".recMedNombre").value.trim(),
    tipo: r.querySelector(".recMedTipo").value,
    via: r.querySelector(".recMedVia").value,
    forma: r.querySelector(".recMedForma").value,
    dosis: r.querySelector(".recMedDosis").value.trim(),
    frecuencia: r.querySelector(".recMedFrec").value.trim(),
    frecuenciaUnidad: r.querySelector(".recMedFrecUnidad").value,
    duracion: r.querySelector(".recMedDur").value.trim(),
    duracionUnidad: r.querySelector(".recMedDurUnidad").value
  })).filter(m => m.nombre || m.frecuencia || m.duracion);
}

function agregarFilaInd() {
  recetaIndsBus.push({ detalle: "" });
  renderRecetaInds();
}

function quitarFilaInd(idx) {
  recetaIndsBus.splice(idx, 1);
  renderRecetaInds();
}

function renderRecetaInds() {
  const cont = document.getElementById("recetaInds");
  if (!cont) return;
  if (recetaIndsBus.length === 0) {
    cont.innerHTML = `<p class="empty">Aún no has agregado indicaciones.</p>`;
    return;
  }
  const opciones = INDICACIONES_GRUPOS.map(g => `
    <optgroup label="${g.grupo}">
      ${g.items.map((it, j) => `<option value="${j}">${it}</option>`).join("")}
    </optgroup>
  `).join("");
  cont.innerHTML = recetaIndsBus.map((m, i) => `
    <div class="rec-ind-row rec-med-row">
      <div class="rec-med-grid">
        <label class="rec-med-fill">Indicación / estudio
          <select class="recIndNombre">${opciones}</select>
        </label>
        <label class="rec-med-fill">Detalle
          <input type="text" class="recIndDetalle" value="${m.detalle}" placeholder="Opcional: completa el estudio (ej: rodilla izquierda)" />
        </label>
        <button type="button" class="btn-icon danger rec-med-quitar" data-quitar-ind="${i}" title="Quitar indicación">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `).join("");

  cont.querySelectorAll("[data-quitar-ind]").forEach(b =>
    b.addEventListener("click", () => quitarFilaInd(Number(b.dataset.quitarInd)))
  );
}

function leerRecetaInds() {
  return [...document.querySelectorAll("#recetaInds .rec-ind-row")].map(r => ({
    nombre: r.querySelector(".recIndNombre").selectedOptions[0].textContent.trim(),
    detalle: r.querySelector(".recIndDetalle").value.trim()
  }));
}

function fmtRecetaInd(ind) {
  return [ind.nombre, ind.detalle].filter(Boolean).join(" ");
}

function updateRecetaEdad() {
  const sel = document.getElementById("recetaPaciente");
  const edadEl = document.getElementById("recetaEdad");
  if (!sel || !edadEl) return;
  const p = State.pacientes.find(x => x.id === Number(sel.value));
  edadEl.value = p ? (p.edad || "") : "";
}

function fmtRecetaMed(m) {
  const partes = [];
  if (m.nombre) partes.push(m.nombre + (m.tipo && m.tipo !== "Generico" ? ` (${m.tipo})` : ""));
  if (m.via) partes.push("vía " + m.via.toLowerCase());
  if (m.dosis) partes.push("dosis: " + m.dosis);
  if (m.frecuencia) partes.push("cada " + m.frecuencia + " " + m.frecuenciaUnidad);
  if (m.duracion) partes.push("durante " + m.duracion + " " + m.duracionUnidad);
  return partes.join(" · ");
}

function guardarReceta(e) {
  e.preventDefault();
  let pacienteId = Number(document.getElementById("recetaPaciente").value);
  const raId = raPacienteId();
  if (!pacienteId && !raId) {
    mostrarNotificacion("Selecciona un paciente.");
    return;
  }
  if (!pacienteId) pacienteId = raId;
  const meds = leerRecetaMeds();
  const inds = leerRecetaInds();
  if (meds.length === 0 && inds.length === 0) {
    alert("Agrega al menos un medicamento o una indicación a la receta.");
    return;
  }
  const p = State.pacientes.find(x => x.id === pacienteId);
  const receta = {
    id: Date.now(),
    codigo: "REC-" + (1000 + State.recetas.length),
    pacienteId,
    fecha: document.getElementById("recetaFecha").value,
    edad: p ? (p.edad || "") : "",
    doctor: State.session ? State.session.name : "Doctor",
    medicamentos: meds,
    indicaciones: inds
  };
  State.recetas.push(receta);
  saveKey("recetas");
  recetaMedsBus = [];
  renderRecetaMeds();
  recetaIndsBus = [];
  renderRecetaInds();
  const form = document.getElementById("recetaForm");
  form.reset();
  document.getElementById("recetaFecha").valueAsDate = new Date();
  if (p) document.getElementById("recetaPaciente").value = String(p.id);
  updateRecetaEdad();
  renderRecetas();
  renderHome();
  mostrarNotificacion(`Receta <b>${receta.codigo}</b> guardada correctamente`);
}

function cuerpoRecetaMedicamentosHTML(r) {
  const p = State.pacientes.find(x => x.id === r.pacienteId);
  const meds = r.medicamentos || [];
  const filas = meds.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${m.nombre || "-"}${m.tipo && m.tipo !== "Generico" ? `<br><span class="rec-print-tipo">${m.tipo}</span>` : ""}</td>
      <td>${m.via || "-"}</td>
      <td>${m.forma || "-"}</td>
      <td>${m.dosis || "-"}</td>
      <td>${m.frecuencia ? "cada " + m.frecuencia + " " + m.frecuenciaUnidad : "-"}</td>
      <td>${m.duracion ? m.duracion + " " + m.duracionUnidad : "-"}</td>
    </tr>
  `).join("");

  return `
    <div class="rec-papel">
      <div class="receta-head">
        <h3>${r.codigo}Receta de medicamentos</h3>
        <p><strong>${p ? p.nombre : "Paciente eliminado"}</strong>${r.edad ? `  Edad: ${r.edad}` : ""}</p>
        <p>Fecha: ${fmtFechaES(r.fecha)}  Dr(a). ${r.doctor}</p>
      </div>
      <table>
        <thead>
          <tr><th>#</th><th>Medicamento</th><th>Va</th><th>Presentacin</th><th>Dosis</th><th>Frecuencia</th><th>Duracin</th></tr>
        </thead>
        <tbody>${filas || '<tr><td colspan="7" style="text-align:center; padding:1rem;">Sin medicamentos</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function cuerpoRecetaIndicacionesHTML(r) {
  const p = State.pacientes.find(x => x.id === r.pacienteId);
  const inds = r.indicaciones || [];
  const indsHTML = inds.map(ind =>
    `<li>${fmtRecetaInd(ind)}</li>`
  ).join("");

  return `
    <div class="rec-papel">
      <div class="receta-head">
        <h3>${r.codigo}  Indicaciones y procedimientos</h3>
        <p><strong>${p ? p.nombre : "Paciente eliminado"}</strong>${r.edad ? `  Edad: ${r.edad}` : ""}</p>
        <p>Fecha: ${fmtFechaES(r.fecha)}  Dr(a). ${r.doctor}</p>
      </div>
      <h4 class="receta-subtitulo">Indicaciones / Procedimientos</h4>
      <ul class="rec-ind-print">${indsHTML || '<li>Sin indicaciones o procedimientos</li>'}</ul>
    </div>
  `;
}

function cuerpoRecetaHTML(r) {
  const meds = r.medicamentos || [];
  const inds = r.indicaciones || [];
  if (meds.length && !inds.length) return cuerpoRecetaMedicamentosHTML(r);
  if (inds.length && !meds.length) return cuerpoRecetaIndicacionesHTML(r);
  return cuerpoRecetaMedicamentosHTML(r) + "<div style='page-break-before:always'></div>" + cuerpoRecetaIndicacionesHTML(r);
}

function verReceta(id) {
  const r = State.recetas.find(x => x.id === id);
  if (!r) return;
  recetaActualId = id;
  const vista = document.getElementById("recetaVista");
  if (vista) vista.innerHTML = cuerpoRecetaHTML(r);
  abrirModal("modalReceta");
}

function imprimirReceta(id) {
  const r = State.recetas.find(x => x.id === id);
  if (!r) return;
  abrirImpresion("Receta " + r.codigo, cuerpoRecetaHTML(r));
}

function iniciarRecTabs() {
  const tabs = document.querySelectorAll(".rec-tab");
  if (!tabs.length) return;
  const paneles = { medicamentos: document.getElementById("recPanelMedicamentos"), procedimientos: document.getElementById("recPanelProcedimientos") };
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const clave = tab.dataset.recTab;
      tabs.forEach(t => {
        t.classList.toggle("active", t === tab);
        if (t.getAttribute("role") === "tab") t.setAttribute("aria-selected", String(t === tab));
      });
      Object.keys(paneles).forEach(k => {
        const p = paneles[k];
        if (p) p.classList.toggle("hidden", k !== clave);
      });
    });
  });
}

function iniciarHelpTabs() {
  const tabs = document.querySelectorAll(".help-tab");
  if (!tabs.length) return;
  const secciones = document.querySelectorAll(".help-section");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.tab;
      tabs.forEach(t => {
        t.classList.toggle("active", t === tab);
        if (t.getAttribute("role") === "tab") t.setAttribute("aria-selected", String(t === tab));
      });
      secciones.forEach(s => {
        s.classList.toggle("active", s.id === targetId);
      });
    });
  });
}

function renderRecetas() {
  const lista = document.getElementById("listaRecetas");
  if (!lista) return;
  const countEl = document.getElementById("countRecetas");
  if (countEl) countEl.textContent = State.recetas.length;

  if (State.recetas.length === 0) {
    lista.innerHTML = `<p class="empty">No hay recetas emitidas.</p>`;
    return;
  }

  lista.innerHTML = [...State.recetas].reverse().map(r => {
    const p = State.pacientes.find(x => x.id === r.pacienteId);
    const meds = r.medicamentos || [];
    const inds = r.indicaciones || [];
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${r.codigo}</strong>
          <span class="tag">${fmtFechaES(r.fecha)}</span>
          ${meds.length ? `<span class="tag tag-med">${meds.length} medicamento(s)</span>` : ""}
          ${inds.length ? `<span class="tag tag-proc">${inds.length} indicación(es)</span>` : ""}
        </div>
        <div class="item-sub">${p ? p.nombre : "Paciente eliminado"}${r.edad ? ` · Edad: ${r.edad}` : ""} · Dr(a). ${r.doctor}</div>
        <div class="item-sub">${[...meds.map(fmtRecetaMed), ...inds.map(fmtRecetaInd)].join(" | ")}</div>
        <div class="item-actions">
          <button class="btn-icon" data-ver-receta="${r.id}" title="Ver receta">
            <span class="material-symbols-outlined">visibility</span>
          </button>
          <button class="btn-icon" data-imprimir-receta="${r.id}" title="Imprimir receta">
            <span class="material-symbols-outlined">print</span>
          </button>
          ${pacienteEliminadoDe(r.pacienteId) ? "" : `<button class="btn-icon danger" data-borrar-receta="${r.id}" title="Eliminar receta">
            <span class="material-symbols-outlined">delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-ver-receta]").forEach(b =>
    b.addEventListener("click", () => verReceta(Number(b.dataset.verReceta)))
  );
  lista.querySelectorAll("[data-imprimir-receta]").forEach(b =>
    b.addEventListener("click", () => pedirImpresionReceta(Number(b.dataset.imprimirReceta)))
  );
  lista.querySelectorAll("[data-borrar-receta]").forEach(b =>
    b.addEventListener("click", () => {
      if (!window.confirm("¿Eliminar esta receta?")) return;
      State.recetas = State.recetas.filter(x => x.id !== Number(b.dataset.borrarReceta));
      saveKey("recetas");
      renderRecetas();
    })
  );
}

function applyDark(activado) {
  document.body.classList.toggle("dark", activado);
  document.querySelectorAll("[data-toggle-dark] .material-symbols-outlined").forEach(ic => {
    ic.textContent = activado ? "light_mode" : "dark_mode";
  });
}

function initDarkMode() {
  applyDark(DB.get("orto_dark", false));
  document.querySelectorAll("[data-toggle-dark]").forEach(btn => {
    btn.addEventListener("click", () => {
      const on = !document.body.classList.contains("dark");
      DB.set("orto_dark", on);
      applyDark(on);
    });
  });
}

const EMAILJS_SERVICIO = "default_service";
const EMAILJS_PLANTILLA = "template_33jcool";
const EMAILJS_SALUDO =
  "Hola {nombre}, en este día tan especial el equipo del consultorio te desea un muy feliz cumpleaños. ¡Gracias por confiar en nosotros!";

function cumpleHoyApp(fechaNacimiento) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fechaNacimiento || "").trim());
  if (!m) return false;
  const ahora = new Date();
  return Number(m[2]) === ahora.getMonth() + 1 && Number(m[3]) === ahora.getDate();
}

async function verificarCumpleanosHoy() {
  if (typeof emailjs === "undefined" || !State || !State.pacientes) return;
  const anio = String(new Date().getFullYear());
  let log = {};
  try { log = DB.get("orto_cumple_log", {}) || {}; } catch (err) {}
  if (!log || typeof log !== "object" || Array.isArray(log)) log = {};
  const ya = Array.isArray(log[anio]) ? log[anio].map(String) : [];
  const pendientes = (State.pacientes || []).filter(p =>
    !p.eliminado &&
    String(p.email || "").trim() &&
    cumpleHoyApp(p.fechaNacimiento) &&
    !ya.includes(String(p.id))
  );
  if (!pendientes.length) return;
  const enviados = [];
  for (const p of pendientes) {
    try {
      await emailjs.send(EMAILJS_SERVICIO, EMAILJS_PLANTILLA, {
        from_name: "Consultorio de Ortopedia",
        to_name: p.nombre || "",
        to_email: String(p.email || "").trim(),
        message: EMAILJS_SALUDO.replace(/\{nombre\}/g, p.nombre || ""),
        reply_to: ""
      });
      enviados.push(String(p.id));
      console.log("Felicitación de cumpleaños enviada a " + p.nombre + " <" + p.email + ">");
    } catch (err) {
      console.error("No se pudo enviar la felicitación a " + (p.email || p.nombre) + ":", err);
    }
  }
  if (enviados.length) {
    log[anio] = Array.isArray(log[anio]) ? log[anio].map(String).concat(enviados) : enviados;
    try { DB.set("orto_cumple_log", log); } catch (err) {}
  }
}

function formatearFechaCita(fecha, hora, amPm) {
  const d = new Date(fecha + "T" + (hora || "00:00"));
  if (isNaN(d)) return fecha || "";
  const txt = d.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return txt + (hora ? ` a las ${fmtHora12(hora, amPm)}` : "");
}

async function enviarCorreoCita(p, cita) {
  if (!p || !String(p.email || "").trim()) return;
  if (typeof emailjs === "undefined" || !cita) return;
  const cuando = formatearFechaCita(cita.fecha, cita.hora, cita.amPm);
  const mensaje =
    `Hola ${p.nombre || ""}, le recordamos su cita de seguimiento para el ${cuando}. ` +
    `Motivo: ${cita.motivo || "Consulta"}. Le esperamos.`;
  try {
    await emailjs.send(EMAILJS_SERVICIO, EMAILJS_PLANTILLA, {
      from_name: "Consultorio de Ortopedia",
      to_name: p.nombre || "",
      to_email: String(p.email || "").trim(),
      message: mensaje,
      reply_to: ""
    });
    console.log("Notificación de cita enviada a " + p.nombre + " <" + p.email + ">");
  } catch (err) {
    console.error("No se pudo enviar la notificación de cita a " + (p.email || p.nombre) + ":", err);
  }
}

function initApp() {
  if (isLoginPage()) return;

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".ficha-pestana");
    if (!btn) return;
    const cont = btn.closest(".ficha");
    if (!cont) return;
    const vista = btn.dataset.fichaVista;
    cont.querySelectorAll(".ficha-pestana").forEach(b => b.classList.toggle("active", b === btn));
    cont.querySelectorAll(".ficha-vista").forEach(v => v.classList.toggle("active", v.dataset.fichaVista === vista));
  });

  if (!State.session) {
    window.location.href = "login.html";
    return;
  }

  const forzarId = sessionStorage.getItem("orto_forzarCambio");
  if (forzarId && State.session && String(State.session.id) === forzarId) {
    abrirModalCambiarPass(true);
  }

  const cpGuardar = document.getElementById("cpGuardar");
  if (cpGuardar) cpGuardar.addEventListener("click", guardarNuevaPassword);
  const cpCancelar = document.getElementById("cpCancelar");
  if (cpCancelar) cpCancelar.addEventListener("click", () => {
    const modal = document.getElementById("modalCambiarPass");
    if (modal && !forzarCambioActive) modal.classList.remove("open");
  });
  document.querySelectorAll("#modalCambiarPass #cpNueva, #modalCambiarPass #cpConfirmar, #modalCambiarPass #cpActual").forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") guardarNuevaPassword();
    });
  });
  const btnCambiarPass = document.getElementById("btnCambiarPassNav");
  if (btnCambiarPass) btnCambiarPass.addEventListener("click", () => abrirModalCambiarPass(false));

  migrateOnLoad();
  initDarkMode();
  cargarPerfil();
  aplicarConfig();
  actualizarAccesosAdmin();
  verificarCumpleanosHoy();

  document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const fotoInput = document.getElementById("fotoInput");
  if (fotoInput) {
    fotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Solo se permiten archivos de imagen.");
        fotoInput.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen es muy grande (máx. 2 MB).");
        fotoInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const foto = reader.result;
        if (State.session) {
          State.session.foto = foto;
          DB.set("orto_session", State.session);
          const user = State.users.find(u => u.id === State.session.id);
          if (user) {
            user.foto = foto;
            saveKey("users");
          }
        }
        cargarPerfil();
      };
      reader.readAsDataURL(file);
    });
  }

  ["btnFotoAccion"].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (State.session && State.session.foto) {
        quitarFotoPerfil();
      } else {
        const fi = document.getElementById("fotoInput");
        if (fi) fi.click();
      }
    });
  });

  initNavigation();

  function recogerAntecedentes(tipo) {
  const valores = Array.from(document.querySelectorAll(`#pacienteForm input[data-pAntecedente="${tipo}"]:checked`)).map(c => c.value);
  const i = valores.indexOf("__otro__");
  if (i !== -1) {
    const txt = (document.querySelector(`[data-ante-otro-input="${tipo}"]`) || {}).value || "";
    if (txt.trim()) valores[i] = txt.trim();
    else valores.splice(i, 1);
  }
  return valores;
}

function initAntecedentes(tipo) {
  const grupo = document.querySelector(`[data-ante-group="${tipo}"]`);
  if (!grupo) return;
  const contar = () => {
    const chip = document.querySelector(`[data-ante-count="${tipo}"]`);
    if (chip) chip.textContent = grupo.querySelectorAll("input[data-pAntecedente]:checked").length;
  };
  const enc = document.querySelector(`[data-ante-buscar="${tipo}"]`);
  if (enc) enc.addEventListener("input", () => {
    const q = enc.value.trim().toLowerCase();
    grupo.querySelectorAll(".ante-chk").forEach(ch => {
      ch.style.display = (q && !ch.textContent.toLowerCase().includes(q)) ? "none" : "";
    });
  });
  const marcar = document.querySelector(`[data-ante-all="${tipo}"]`);
  if (marcar) marcar.addEventListener("click", () => {
    grupo.querySelectorAll("input[data-pAntecedente]").forEach(b => { b.checked = true; b.dispatchEvent(new Event("change")); });
  });
  const limpiar = document.querySelector(`[data-ante-none="${tipo}"]`);
  if (limpiar) limpiar.addEventListener("click", () => {
    grupo.querySelectorAll("input[data-pAntecedente]").forEach(b => { b.checked = false; b.dispatchEvent(new Event("change")); });
  });
  grupo.addEventListener("change", (e) => {
    contar();
    const chip = e.target.closest("[data-ante-otro]");
    const inputOtro = document.querySelector(`[data-ante-otro-input="${tipo}"]`);
    if (chip && inputOtro) {
      inputOtro.style.display = e.target.checked ? "block" : "none";
      if (!e.target.checked) inputOtro.value = "";
    }
  });
  contar();
}

const pacienteForm = document.getElementById("pacienteForm");
  if (pacienteForm) {
    document.getElementById("pacienteCodigo").value = genCodigoPaciente();
    initAntecedentes("morbido");
    initAntecedentes("quirurgico");
    initAntecedentes("alergico");

    const inpFechaNac = document.getElementById("pacienteFechaNacimiento");
    if (inpFechaNac) {
      inpFechaNac.addEventListener("change", () => {
        const e = edadDesdeFechaNacimiento(inpFechaNac.value);
        const inpEdad = document.getElementById("pacienteEdad");
        if (inpEdad && e != null) inpEdad.value = e;
      });
    }

    pacienteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selSeguro = document.getElementById("pacienteSeguro");
      const otroSeguro = document.getElementById("pacienteSeguroOtro");
      let seguro = selSeguro ? selSeguro.value : "";
      if (seguro === "__otro__" && otroSeguro) seguro = otroSeguro.value.trim();
      const selRazon = document.getElementById("pacienteRazonConsulta");
      const otroRazon = document.getElementById("pacienteRazonConsultaOtro");
      let razonConsulta = selRazon ? selRazon.value : "";
      if (razonConsulta === "__otro__" && otroRazon) razonConsulta = otroRazon.value.trim();
      const campos = {
        codigo: document.getElementById("pacienteCodigo").value,
        nombre: document.getElementById("pacienteNombre").value.trim(),
        cedula: document.getElementById("pacienteCedula").value.trim(),
        seguro: seguro || "",
        edad: document.getElementById("pacienteEdad").value.trim(),
        fechaNacimiento: (document.getElementById("pacienteFechaNacimiento") || {}).value || "",
        sexo: document.getElementById("pacienteSexo").value,
        telefono: document.getElementById("pacienteTelefono").value.trim(),
        email: document.getElementById("pacienteEmail").value.trim(),
        emergencia: document.getElementById("pacienteEmergencia").value.trim(),
        telefonoEmergencia: document.getElementById("pacienteEmergenciaTel").value.trim(),
        ocupacion: document.getElementById("pacienteOcupacion").value.trim(),
        manoDominante: document.getElementById("pacienteManoDominante").value,
        razonConsulta: razonConsulta || "",
        historiaActual: (document.getElementById("pacienteHistoriaActual") || {}).value ? document.getElementById("pacienteHistoriaActual").value.trim() : "",
        antecedentesMorbidos: recogerAntecedentes("morbido"),
        antecedentesQuirurgicos: recogerAntecedentes("quirurgico"),
        antecedentesAlergicos: recogerAntecedentes("alergico"),
        notas: document.getElementById("pacienteNotas").value.trim()
      };

      const nuevoId = nextPacienteId();

      const mismoNombre = State.pacientes.filter(q =>
        q.nombre && q.nombre.trim().toLowerCase() === campos.nombre.toLowerCase()
      );
      const activosMismo = mismoNombre.filter(q => !q.eliminado);
      const eliminadosMismo = mismoNombre.filter(q => q.eliminado);

      if (mismoNombre.length > 0) {
        const detalle = activosMismo.length
          ? `${activosMismo.length} paciente(s) activo(s) (${activosMismo.map(q => q.codigo).join(", ")})`
          : "sin pacientes activos";
        const detElim = eliminadosMismo.length
          ? ` · ${eliminadosMismo.length} eliminado(s) (${eliminadosMismo.map(q => q.codigo).join(", ")})`
          : "";
        const acepta = confirm(
          `Ya existe un paciente registrado con el nombre "${campos.nombre}".\n` +
          `${detalle}${detElim}.\n\n` +
          `El nuevo registro tendrá un ID único (${nuevoId}) y no usará el ID de ningún paciente existente o eliminado.\n\n` +
          `¿Deseas crear este NUEVO registro igualmente?`
        );
        if (!acepta) return;
      }

      const paciente = { id: nuevoId, ...campos };
      State.pacientes.push(paciente);
      saveKey("pacientes");

      State.registros.push({
        id: Date.now(),
        pacienteId: paciente.id,
        titulo: "Registro de ingreso - ficha del paciente",
        tipo: "Registro de ingreso",
        detalle: detalleIngresoPaciente(paciente),
        fecha: new Date().toLocaleDateString("es-ES")
      });
      saveKey("registros");

      const raSel = document.getElementById("raPaciente");
      if (raSel) {
        const existe = Array.from(raSel.options).some(o => o.value === String(paciente.id));
        if (!existe) fillRaPaciente(); try{ syncRaToAll(); }catch(e){}
        raSel.value = String(paciente.id);
      }
      renderRegistroActual();

      mostrarNotificacion(`Paciente <b>${paciente.nombre}</b> agregado correctamente${mismoNombre.length ? ` (ya existía otro paciente con el mismo nombre: ${mismoNombre.length})` : ""}`);

      pacienteForm.reset();
      if (otroSeguro) {
        otroSeguro.value = "";
        otroSeguro.style.display = "none";
      }
      if (otroRazon) {
        otroRazon.value = "";
        otroRazon.style.display = "none";
      }
      document.getElementById("pacienteCodigo").value = genCodigoPaciente();
      renderPacientes();
      fillSelects();
      renderHome();
    });
  }

  const selSeguro = document.getElementById("pacienteSeguro");
  const otroSeguro = document.getElementById("pacienteSeguroOtro");
  if (selSeguro && otroSeguro) {
    selSeguro.addEventListener("change", () => {
      otroSeguro.style.display = selSeguro.value === "__otro__" ? "block" : "none";
      if (selSeguro.value !== "__otro__") otroSeguro.value = "";
    });
  }

  const selRazon = document.getElementById("pacienteRazonConsulta");
  const otroRazon = document.getElementById("pacienteRazonConsultaOtro");
  if (selRazon && otroRazon) {
    selRazon.addEventListener("change", () => {
      otroRazon.style.display = selRazon.value === "__otro__" ? "block" : "none";
      if (selRazon.value !== "__otro__") otroRazon.value = "";
    });
  }

  const buscarPaciente = document.getElementById("buscarPaciente");
  if (buscarPaciente) {
    buscarPaciente.addEventListener("input", () => renderPacientes(buscarPaciente.value));
  }

  fillTipoRegistro(document.getElementById("registroTipo"));
  fillTipoRegistro(document.getElementById("regETipo"));

  const btnImprimirFicha = document.getElementById("btnImprimirFicha");
  if (btnImprimirFicha) {
    btnImprimirFicha.addEventListener("click", () => {
      if (pacienteActual) pedirImpresionFicha(pacienteActual);
    });
  }

  const btnWhatsappFicha = document.getElementById("btnWhatsappFicha");
  if (btnWhatsappFicha) {
    btnWhatsappFicha.addEventListener("click", () => {
      if (!pacienteActual) return;
      const texto = textoFichaPaciente(pacienteActual);
      const p = State.pacientes.find(x => x.id === pacienteActual);
      if (texto != null) compartirWhatsApp("Ficha del paciente", texto, p ? p.telefono : "");
    });
  }

  const btnCorreoFicha = document.getElementById("btnCorreoFicha");
  if (btnCorreoFicha) {
    btnCorreoFicha.addEventListener("click", () => {
      if (!pacienteActual) return;
      const texto = textoFichaPaciente(pacienteActual);
      if (texto != null) compartirCorreo("Ficha del paciente", texto);
    });
  }

  const btnImprimirTurnos = document.getElementById("btnImprimirTurnos");
  if (btnImprimirTurnos) btnImprimirTurnos.addEventListener("click", pedirImpresionTurnos);

  const btnWhatsappTurnos = document.getElementById("btnWhatsappTurnos");
  if (btnWhatsappTurnos) {
    btnWhatsappTurnos.addEventListener("click", () => {
      const texto = textoTurnos();
      if (texto != null) compartirWhatsApp("Tabla de turnos - Citas", texto);
    });
  }

  const btnCorreoTurnos = document.getElementById("btnCorreoTurnos");
  if (btnCorreoTurnos) {
    btnCorreoTurnos.addEventListener("click", () => {
      const texto = textoTurnos();
      if (texto != null) compartirCorreo("Tabla de turnos - Citas", texto);
    });
  }

  const btnImprimirResultados = document.getElementById("btnImprimirResultados");
  if (btnImprimirResultados) btnImprimirResultados.addEventListener("click", pedirImpresionResultados);

  const btnRefreshHistorial = document.getElementById("btnRefreshHistorial");
  if (btnRefreshHistorial) {
    btnRefreshHistorial.addEventListener("click", async () => {
      btnRefreshHistorial.disabled = true;
      try {
        await BD.cargar();
      } catch (err) {
        console.error("Error al refrescar archivos guardados:", err);
      }
      const filtro = document.getElementById("buscarRegistro") ? document.getElementById("buscarRegistro").value : "";
      renderRegistros(filtro);
      if (typeof renderHome === "function") renderHome();
      btnRefreshHistorial.disabled = false;
    });
  }

  const btnWhatsappResultados = document.getElementById("btnWhatsappResultados");
  if (btnWhatsappResultados) {
    btnWhatsappResultados.addEventListener("click", () => {
      const texto = textoResultados();
      if (texto != null) compartirWhatsApp("Resultados / Registros médicos", texto);
    });
  }

  const btnCorreoResultados = document.getElementById("btnCorreoResultados");
  if (btnCorreoResultados) {
    btnCorreoResultados.addEventListener("click", () => {
      const texto = textoResultados();
      if (texto != null) compartirCorreo("Resultados / Registros médicos", texto);
    });
  }

  const agendarForm = document.getElementById("agendarForm");
  if (agendarForm) {
    agendarForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!agendarCitaId) return;
      const fecha = document.getElementById("agendarFecha").value;
      const error = validarLimiteCitas(fecha);
      if (error) {
        alert(error);
        updateLimiteAgendar(fecha);
        return;
      }
      State.citas.push({
        id: Date.now(),
        pacienteId: agendarCitaId,
        fecha,
        hora: document.getElementById("agendarHora").value,
        amPm: document.getElementById("agendarAmPm") ? document.getElementById("agendarAmPm").value : "PM",
        motivo: document.getElementById("agendarMotivo").value.trim() || "Consulta",
        turno: genTurno(fecha)
      });
      saveKey("citas");
      const pacAgendar = State.pacientes.find(x => x.id === agendarCitaId);
      mostrarNotificacion(`Cita para <b>${pacAgendar ? pacAgendar.nombre : "el paciente"}</b> agendada correctamente`);
      agendarCitaId = null;
      cerrarModales();
      renderCitas();
      renderPacientesSinCita();
      renderHome();
      fillSelects();
    });
    const agFecha = document.getElementById("agendarFecha");
    if (agFecha) agFecha.addEventListener("change", () => updateLimiteAgendar(agFecha.value));
  }

  const citaForm = document.getElementById("citaForm");
  if (citaForm) {
    const today = new Date();
    document.getElementById("citaFecha").valueAsDate = today;
    document.getElementById("citaFecha").min = today.toISOString().split("T")[0];

    const citaPacienteSel = document.getElementById("citaPaciente");
    if (citaPacienteSel) citaPacienteSel.addEventListener("change", renderProximaCita);

    citaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fecha = document.getElementById("citaFecha").value;
      const error = validarLimiteCitas(fecha);
      if (error) {
        alert(error);
        updateCitaLimiteInfo();
        return;
      }
      const cita = {
        id: Date.now(),
        pacienteId: Number(document.getElementById("citaPaciente").value),
        fecha,
        hora: document.getElementById("citaHora").value,
        amPm: document.getElementById("citaAmPm") ? document.getElementById("citaAmPm").value : "PM",
        motivo: document.getElementById("citaMotivo").value.trim() || "Consulta",
        turno: genTurno(fecha)
      };
      State.citas.push(cita);
      saveKey("citas");
      const pacCita = State.pacientes.find(x => x.id === cita.pacienteId);
      mostrarNotificacion(`Cita para <b>${pacCita ? pacCita.nombre : "el paciente"}</b> agendada correctamente`);
      enviarCorreoCita(pacCita, cita);
      citaForm.reset();
      document.getElementById("citaFecha").valueAsDate = today;
      renderCitas();
      renderProximaCita();
      renderPacientesSinCita();
      renderHome();
    });

  const citaFecha = document.getElementById("citaFecha");
  if (citaFecha) {
    citaFecha.addEventListener("change", updateCitaLimiteInfo);
  }
  }

  const btnCitaSinConsulta = document.getElementById("btnCitaSinConsulta");
  if (btnCitaSinConsulta) btnCitaSinConsulta.addEventListener("click", abrirModalCitaSinConsulta);
  const citaSinConsultaForm = document.getElementById("citaSinConsultaForm");
  if (citaSinConsultaForm) citaSinConsultaForm.addEventListener("submit", guardarCitaSinConsulta);

  const completarCitaForm = document.getElementById("completarCitaForm");
  if (completarCitaForm) completarCitaForm.addEventListener("submit", guardarCitaCompletada);

  const registroForm = document.getElementById("registroForm");
  if (registroForm) {
    registroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const prox = {
        fecha: document.getElementById("registroProxCitaFecha").value,
        hora: document.getElementById("registroProxCitaHora").value,
        amPm: document.getElementById("registroProxCitaAmPm").value
      };
      const textoPac = document.getElementById("registroPaciente").value.trim();
      let pacienteId = Number(textoPac);
      const idValSem = Number(textoPac.split(":")[0]);
      let pact = State.pacientes.find(x => x.id === idValSem) ||
                 (pacienteId && State.pacientes.find(x => x.id === pacienteId)) ||
                 State.pacientes.find(x => (x.nombre + "|" + x.codigo).toLowerCase().includes(textoPac.toLowerCase().replace(/^\d+\s*[:.-]\s*/, "")));
      if (!pact && textoPac) {
        pact = { id: Date.now(), codigo: genCodigo(), nombre: textoPac, sexo: "", edad: "", cedula: "", telefono: "", email: "", seguro: "", eliminado: false };
        State.pacientes.push(pact);
        saveKey("pacientes");
      }
      const evaEl = document.getElementById("registroEVA");
      const evaVal = evaEl && evaEl.value !== "" ? Number(evaEl.value) : null;
      const registro = {
        id: Date.now(),
        pacienteId: (pact ? pact.id : 0),
        titulo: document.getElementById("registroTitulo").value.trim(),
        tipo: document.getElementById("registroTipo").value,
        detalle: document.getElementById("registroDetalle").value.trim(),
        eva: evaVal,
        fecha: new Date().toLocaleDateString("es-ES")
      };
      if (prox.fecha) registro.proximaCita = { fecha: prox.fecha, hora: prox.hora || "", amPm: prox.amPm };
      const file = document.getElementById("registroArchivo").files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          registro.archivo = { name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
          pushRegistro(registro, registroForm, prox);
        };
        reader.readAsDataURL(file);
      } else {
        pushRegistro(registro, registroForm, prox);
      }
    });
  }

  function pushRegistro(registro, form, prox) {
    State.registros.push(registro);
    saveKey("registros");
    if (prox && prox.fecha) {
      const error = validarLimiteCitas(prox.fecha);
      if (error) {
        alert("El historial se guardó, pero no se pudo agendar la próxima cita: " + error);
      } else {
        const nuevaCita = {
          id: Date.now() + 1,
          pacienteId: registro.pacienteId,
          fecha: prox.fecha,
          hora: prox.hora || "09:00",
          amPm: prox.amPm,
          motivo: "Próxima cita",
          turno: genTurno(prox.fecha)
        };
        State.citas.push(nuevaCita);
        saveKey("citas");
        renderCitas();
        enviarCorreoCita(State.pacientes.find(x => x.id === registro.pacienteId), nuevaCita);
      }
    }
    mostrarNotificacion(`Registro <b>${registro.titulo}</b> agregado correctamente`);
    if (form) form.reset();
    renderRegistros();
    renderHome();
  }

  const regEForm = document.getElementById("regEForm");
  if (regEForm) regEForm.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarRegistroEditado();
  });

  const buscarRegistro = document.getElementById("buscarRegistro");
  if (buscarRegistro) {
    buscarRegistro.addEventListener("input", () => renderRegistros(buscarRegistro.value));
  }

  const documentoForm = document.getElementById("documentoForm");
  if (documentoForm) {
    documentoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const file = document.getElementById("documentoArchivo").files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const doc = {
          id: Date.now(),
          pacienteId: Number(document.getElementById("documentoPaciente").value),
          descripcion: document.getElementById("documentoDescripcion").value.trim() || file.name,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
          fecha: new Date().toLocaleDateString("es-ES")
        };
        State.documentos.push(doc);
        saveKey("documentos");
        documentoForm.reset();
        renderDocumentos();
        renderHome();
      };
      reader.readAsDataURL(file);
    });
  }

  const facturaForm = document.getElementById("facturaForm");
  if (facturaForm) {
    fillProcedimientos();
    renderGlosario();
    renderGlosarioMeds();

    document.getElementById("agregarConcepto").addEventListener("click", () => {
      const sel = document.getElementById("facturaProcedimiento");
      const idx = Number(sel.value);
      const proc = PROCEDIMIENTOS[idx];
      if (proc) {
        facturaCarrito.push({ nombre: proc.nombre, precio: proc.precio });
        renderFacturaItems();
      }
    });

    document.getElementById("facturaPorcentaje").addEventListener("input", () => {
      updateFacturaResumen();
    });

    facturaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pacienteId = Number(document.getElementById("facturaPaciente").value);
      if (!pacienteId) {
        alert("Selecciona un paciente.");
        return;
      }
      if (facturaCarrito.length === 0) {
        alert("Agrega al menos un procedimiento.");
        return;
      }

      const { subtotal, porcentaje, honorarios, neto } = calcFactura();
      const factura = {
        id: Date.now(),
        codigo: "FAC-" + (1000 + State.facturas.length),
        pacienteId,
        items: facturaCarrito.map(it => ({ ...it })),
        subtotal,
        porcentaje,
        honorarios,
        neto,
        total: subtotal,
        doctor: State.session ? State.session.name : "Doctor",
        fecha: new Date().toLocaleDateString("es-ES")
      };

      State.facturas.push(factura);
      saveKey("facturas");
      facturaCarrito = [];
      renderFacturaItems();
      renderFacturas();
      renderHome();
      alert("Factura " + factura.codigo + " emitida: total " + fmtMoney(factura.total));
    });
  }

  const recetaFormEl = document.getElementById("recetaForm");
  if (recetaFormEl) {
    iniciarRecTabs();
    const recetaFechaEl = document.getElementById("recetaFecha");
    if (recetaFechaEl) recetaFechaEl.valueAsDate = new Date();
    const recetaPacienteSel = document.getElementById("recetaPaciente");
    if (recetaPacienteSel) recetaPacienteSel.addEventListener("change", updateRecetaEdad);
    const btnAgregarMed = document.getElementById("btnAgregarMed");
    if (btnAgregarMed) btnAgregarMed.addEventListener("click", agregarFilaMed);
    const btnAgregarInd = document.getElementById("btnAgregarInd");
    if (btnAgregarInd) btnAgregarInd.addEventListener("click", agregarFilaInd);
    recetaFormEl.addEventListener("submit", guardarReceta);
  }

  iniciarHelpTabs();

  const btnImprimirRecetaVista = document.getElementById("btnImprimirReceta");
  if (btnImprimirRecetaVista) {
    btnImprimirRecetaVista.addEventListener("click", () => {
      if (recetaActualId) pedirImpresionReceta(recetaActualId);
    });
  }

  document.querySelectorAll("[data-seccion]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      mostrarSeccion(item.dataset.seccion);
    });
  });

  document.querySelectorAll("[data-cerrar]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mId = btn.dataset.cerrar;
      if (mId === "modalCambiarPass" && forzarCambioActive) return;
      const m = document.getElementById(mId);
      if (m) m.classList.remove("open");
    });
  });

  const btnPrintPickerConfirm = document.getElementById("btnPrintPickerConfirm");
  if (btnPrintPickerConfirm) btnPrintPickerConfirm.addEventListener("click", confirmarSelectorImpresion);

  document.querySelectorAll(".modal-backdrop").forEach(bk => {
    bk.addEventListener("click", (e) => {
      if (e.target === bk && !(bk.id === "modalCambiarPass" && forzarCambioActive)) bk.classList.remove("open");
    });
  });

  const btnAbrirStats = document.getElementById("btnAbrirStatsPanel");
  if (btnAbrirStats) btnAbrirStats.addEventListener("click", abrirModalEstadisticas);

  const btnNuevoPaciente = document.getElementById("btnNuevoPaciente");
  if (btnNuevoPaciente) btnNuevoPaciente.addEventListener("click", () => {
    mostrarSeccion("pacientes");
    const form = document.getElementById("pacienteForm");
    if (form) {
      const nombre = document.getElementById("pacienteNombre");
      if (nombre) setTimeout(() => nombre.focus(), 50);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const editarPacForm = document.getElementById("editarPacienteForm");
  if (editarPacForm) editarPacForm.addEventListener("submit", guardarPacienteEditado);

  const btnAgregarNota = document.getElementById("btnAgregarNotaInicio");
  if (btnAgregarNota) {
    btnAgregarNota.addEventListener("click", () => {
      const inp = document.getElementById("notaTitulo");
      const txt = document.getElementById("notaTexto");
      if (inp) inp.value = "";
      if (txt) txt.value = "";
      abrirModal("modalNotaInicio");
      if (txt) setTimeout(() => txt.focus(), 60);
    });
  }
  const notaInicioForm = document.getElementById("notaInicioForm");
  if (notaInicioForm) notaInicioForm.addEventListener("submit", agregarNotaInicio);

  const estDesde = document.getElementById("estDesde");
  const estHasta = document.getElementById("estHasta");
  if (estDesde && estHasta) {
    estDesde.addEventListener("change", () => {
      estHasta.min = estDesde.value;
      if (estHasta.value < estDesde.value) estHasta.value = estDesde.value;
      calcularEstadisticas();
    });
    estHasta.addEventListener("change", () => {
      if (estDesde.value > estHasta.value) estDesde.value = estHasta.value;
      calcularEstadisticas();
    });
  }

  const btnCalcularStats = document.getElementById("btnCalcularStats");
  if (btnCalcularStats) btnCalcularStats.addEventListener("click", calcularEstadisticas);

  const btnResetStats = document.getElementById("btnResetStats");
  if (btnResetStats) btnResetStats.addEventListener("click", resetearPizarraStats);

  document.querySelectorAll("[data-rango]").forEach(btn =>
    btn.addEventListener("click", () => aplicarRangoStats(btn.dataset.rango))
  );

  const btnImprimirStats = document.getElementById("btnImprimirStats");
  if (btnImprimirStats) btnImprimirStats.addEventListener("click", pedirImpresionEstadisticas);

  const btnExportarStats = document.getElementById("btnExportarStats");
  if (btnExportarStats) btnExportarStats.addEventListener("click", exportarEstadisticas);

  const btnCalendario = document.getElementById("btnCalendario");
  if (btnCalendario) btnCalendario.addEventListener("click", abrirCalendario);

  const btnRestaurarPacElim = document.getElementById("btnRestaurarPacElim");
  if (btnRestaurarPacElim) btnRestaurarPacElim.addEventListener("click", accionRestaurarPacElim);
  const btnBorrarDefPacElim = document.getElementById("btnBorrarDefPacElim");
  if (btnBorrarDefPacElim) btnBorrarDefPacElim.addEventListener("click", accionBorrarDefPacElim);
  const btnMostrarPacElim = document.getElementById("btnMostrarPacElim");
  if (btnMostrarPacElim) btnMostrarPacElim.addEventListener("click", toggleListaPacientesEliminados);
  const txtMostrarPacElim = document.getElementById("txtMostrarPacElim");
  if (txtMostrarPacElim) txtMostrarPacElim.textContent = mostrarListaPacElim ? "Ocultar eliminados" : "Mostrar eliminados";

  const edFactPorcentaje = document.getElementById("edFactPorcentaje");
  if (edFactPorcentaje) edFactPorcentaje.addEventListener("input", updateEditarFacturaResumen);
  const edFactForm = document.querySelector('#modalEditarFactura form');
  if (edFactForm) edFactForm.addEventListener("submit", e => {
    e.preventDefault();
    guardarFacturaEditada();
  });

  const calPrev = document.getElementById("calPrev");
  const calNext = document.getElementById("calNext");
  if (calPrev) calPrev.addEventListener("click", () => cambiarMes(-1));
  if (calNext) calNext.addEventListener("click", () => cambiarMes(1));

  const btnGuardarCal = document.getElementById("btnGuardarCal");
  if (btnGuardarCal) btnGuardarCal.addEventListener("click", guardarEdicionCalendario);

  const btnCancelarCal = document.getElementById("btnCancelarCal");
  if (btnCancelarCal) btnCancelarCal.addEventListener("click", () => {
    calendarioEditando = null;
    const ed = document.getElementById("calEditor");
    if (ed) ed.classList.remove("open");
  });

  const btnAdminBtn = document.getElementById("btnAdmin");
  if (btnAdminBtn) btnAdminBtn.addEventListener("click", abrirAdmin);

  const btnAyuda = document.getElementById("btnAyuda");
  if (btnAyuda) btnAyuda.addEventListener("click", () => abrirModal("modalAyuda"));

  const adminUserForm = document.getElementById("adminUserForm");
  if (adminUserForm) adminUserForm.addEventListener("submit", crearUsuarioAdmin);

  const btnGuardarConfig = document.getElementById("btnGuardarConfig");
  if (btnGuardarConfig) btnGuardarConfig.addEventListener("click", guardarConfig);

  const cfgColorSel = document.getElementById("cfgColorBotones");
  if (cfgColorSel) cfgColorSel.addEventListener("change", () => aplicarColorBotones(cfgColorSel.value));

  function registrarAccionesRegistroActual() {
    const raPanel = document.querySelector(".panel-registro-actual");
    const btnRaToggle = document.getElementById("btnRaToggle");
    const raIcon = document.getElementById("btnRaIcon");
    const chip = document.getElementById("topbarRaChip");

    const aplicarEstadoRegistroActual = (minimizado) => {
      if (!raPanel) return;
      raPanel.classList.toggle("ra-min", minimizado);
      if (raIcon) raIcon.textContent = minimizado ? "expand_more" : "expand_less";
      document.body.classList.toggle("ra-minimizado", minimizado);
      if (chip) chip.hidden = !minimizado;
    };

    const restaurarRegistroActual = () => aplicarEstadoRegistroActual(false);

    if (btnRaToggle && raPanel) {
      btnRaToggle.addEventListener("click", () => {
        aplicarEstadoRegistroActual(!raPanel.classList.contains("ra-min"));
      });
    }

    if (chip) {
      chip.addEventListener("click", restaurarRegistroActual);
    }

    const raPac = document.getElementById("raPaciente");
    if (raPac) {
      raPac.addEventListener("change", renderRegistroActual);
      fillRaPaciente(); try{ syncRaToAll(); }catch(e){}
      renderRegistroActual();
    }

    document.querySelectorAll("[data-ra]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = raPacienteId();
        if (!id) {
          alert("Primero selecciona el paciente actual.");
          return;
        }
        accionRegistroActual(btn.dataset.ra, id);
      });
    });

    const btnRaPrint = document.getElementById("btnRaFichaImprimir");
    if (btnRaPrint) btnRaPrint.addEventListener("click", () => {
      const id = raPacienteId();
      if (id) pedirImpresionFicha(id);
    });

    const raRegForm = document.getElementById("raRegistroForm");
    if (raRegForm) raRegForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = raPacienteId();
      if (!id) return;
      const prox = {
        fecha: document.getElementById("raRegistroProxCitaFecha").value,
        hora: document.getElementById("raRegistroProxCitaHora").value,
        amPm: document.getElementById("raRegistroProxCitaAmPm").value
      };
      const registro = {
        id: Date.now(),
        pacienteId: id,
        titulo: document.getElementById("raRegistroTitulo").value.trim(),
        tipo: document.getElementById("raRegistroTipo").value,
        detalle: document.getElementById("raRegistroDetalle").value.trim(),
        fecha: new Date().toLocaleDateString("es-ES")
      };
      if (prox.fecha) registro.proximaCita = { fecha: prox.fecha, hora: prox.hora || "", amPm: prox.amPm };
      const fin = () => {
        pushRegistro(registro, null, prox);
        cerrarModales();
        renderRegistroActual();
      };
      const file = document.getElementById("raRegistroArchivo").files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          registro.archivo = { name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
          fin();
        };
        reader.readAsDataURL(file);
      } else {
        fin();
      }
    });

    const raDocForm = document.getElementById("raDocumentoForm");
    if (raDocForm) raDocForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = raPacienteId();
      const file = document.getElementById("raDocumentoArchivo").files[0];
      if (!id || !file) return;
      const reader = new FileReader();
      reader.onload = () => {
        State.documentos.push({
          id: Date.now(),
          pacienteId: id,
          descripcion: document.getElementById("raDocumentoDescripcion").value.trim() || file.name,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
          fecha: new Date().toLocaleDateString("es-ES")
        });
        saveKey("documentos");
        cerrarModales();
        renderDocumentos();
        renderHome();
        mostrarNotificacion("Documento subido correctamente");
      };
      reader.readAsDataURL(file);
    });
  }

  fillSelects();
  renderPacientes();
  renderPacientesSinCita();
  renderCitas();
  renderCitasCompletadas();
  renderCitasSinConsulta();
  renderRegistros();
  renderDocumentos();
  renderEstudios();
  renderFacturas();
renderFacturaItems();
        renderRecetas();
  initEvaluacionFisica();
  initEvaluacionMedica();
  registrarAccionesRegistroActual();

  // Mejor UX: accesos rapidos del dashboard sin paciente seleccionado
  document.querySelectorAll(".dash-quick .quick-action[data-ra]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (raPacienteId()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const mapping = {
        cita: "citas",
        eval: "evaluacion-fisica",
        registro: "registros",
        receta: "recetas",
        documento: "documentos",
        factura: "facturacion"
      };
      const sec = mapping[btn.dataset.ra];
      if (sec && typeof mostrarSeccion === "function") {
        mostrarSeccion(sec);
      }
    }, true);
  });

  // Mejor UX: accesos rápidos del dashboard sin paciente seleccionado
  document.querySelectorAll(".dash-quick .quick-action[data-ra]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (raPacienteId()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (typeof mostrarSeccion === "function") {
        mostrarSeccion("pacientes");
      }
      setTimeout(() => {
        const mp = document.getElementById("modalPacientes");
        if (mp && mp.classList) mp.classList.add("open");
        const nuevo = document.getElementById("btnNuevoPaciente");
        if (nuevo) {
          try { nuevo.click(); } catch (err) {}
        }
      }, 120);
      alert("Primero selecciona o crea un paciente.");
    }, true);
  });
  registrarAccionResetSistema();
  registrarAccionesEstudios();
  registrarAccionesImagenes();
  registrarAccionesPros();
  updateCitaLimiteInfo();
  renderHome();

  // Rehabilitación
  const rehabForm = document.getElementById("rehabForm");
  if (rehabForm) {
    rehabForm.addEventListener("submit", guardarPlanRehab);
    const btnCancelarEdicionRehab = document.getElementById("btnCancelarEdicionRehab");
    if (btnCancelarEdicionRehab) btnCancelarEdicionRehab.addEventListener("click", cancelarEdicionRehab);
  }
  const buscarRehab = document.getElementById("buscarRehab");
  if (buscarRehab) buscarRehab.addEventListener("input", () => renderRehab(buscarRehab.value));
  const refForm = document.getElementById("referimientoForm");
  if (refForm) {
    refForm.addEventListener("submit", guardarReferimiento);
    const btnCancelarEdicionRef = document.getElementById("btnCancelarEdicionRef");
    if (btnCancelarEdicionRef) btnCancelarEdicionRef.addEventListener("click", cancelarEdicionRef);
    const refFecha = document.getElementById("refFecha");
    if (refFecha && !refFecha.value) refFecha.value = isoLocal(new Date());
  }
  const buscarReferimiento = document.getElementById("buscarReferimiento");
  if (buscarReferimiento) buscarReferimiento.addEventListener("input", () => renderReferimientos(buscarReferimiento.value));
  fillRefPacientes();
  renderReferimientos();
  const btnAgregarSesionRehab = document.getElementById("btnAgregarSesionRehab");
  if (btnAgregarSesionRehab) btnAgregarSesionRehab.addEventListener("click", guardarSesionRehab);
  const buscarOrtesis = document.getElementById("buscarOrtesis");
  if (buscarOrtesis) buscarOrtesis.addEventListener("input", () => renderGlosarioOrtesis(buscarOrtesis.value));
  const dropOrtesis = document.getElementById("ortesisSeleccion");
  if (dropOrtesis) {
    dropOrtesis.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      dropOrtesis.classList.add("drag-over");
    });
    dropOrtesis.addEventListener("dragleave", () => dropOrtesis.classList.remove("drag-over"));
    dropOrtesis.addEventListener("drop", e => {
      e.preventDefault();
      dropOrtesis.classList.remove("drag-over");
      try {
        const dato = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (!dato || !dato.nombre) return;
        window.__ortesisSel = window.__ortesisSel || [];
        const dup = window.__ortesisSel.some(x => x.nombre === dato.nombre);
        if (dup) {
          mostrarNotificacion("Esa órtesis ya está en la selección.");
          return;
        }
        window.__ortesisSel.push({
          nombre: dato.nombre,
          parte: dato.parte,
          uso: dato.uso
        });
        renderOrtesisSeleccion();
        mostrarNotificacion("Órtesis agregada: " + dato.nombre);
      } catch (err) {}
    });
  }
  const btnOrtesisLimpiar = document.getElementById("btnOrtesisLimpiar");
  if (btnOrtesisLimpiar) btnOrtesisLimpiar.addEventListener("click", () => {
    window.__ortesisSel = [];
    renderOrtesisSeleccion();
  });
  const btnOrtesisGuardar = document.getElementById("btnOrtesisGuardar");
  if (btnOrtesisGuardar) btnOrtesisGuardar.addEventListener("click", guardarOrtesisPaciente);
  document.addEventListener("dragend", () => {
    document.querySelectorAll(".ortesis-item.arrastrando").forEach(el => el.classList.remove("arrastrando"));
  });
  renderGlosarioOrtesis();
  renderOrtesisSeleccion();
  renderOrtesis();
  fillOrtesisPacientes(); try{ syncRaToAll(); }catch(e){}

  // Cirugías e implantes
  const cirugiaForm = document.getElementById("formCirugia") || document.getElementById("cirugiaForm");
  if (cirugiaForm) {
    cirugiaForm.addEventListener("submit", guardarCirugia);
    const btnCancelarEdicionCirugia = document.getElementById("btnCancelarEdicionCirugia");
    if (btnCancelarEdicionCirugia) btnCancelarEdicionCirugia.addEventListener("click", cancelarEdicionCirugia);
    const btnAgregarImplante = document.getElementById("btnAgregarImplante");
    if (btnAgregarImplante) btnAgregarImplante.addEventListener("click", agregarFilaImplante);
  }
  const buscarCirugia = document.getElementById("buscarCirugia");
  if (buscarCirugia) buscarCirugia.addEventListener("input", () => renderCirugias(buscarCirugia.value));
  const fechaCirugia = document.getElementById("cirugiaFecha");
  if (fechaCirugia && !fechaCirugia.value) fechaCirugia.value = isoLocal(new Date());
  llenarListaCirugiasTipo();
  llenarListaImplantesProtesis();
  renderCirugiaImplantes();
  renderCirugias();
  fillCirugiaPacientes();
}

// ==================== REHABILITACIÓN ====================

function fillRehabPacientes() {
  const sel = document.getElementById("rehabPaciente");
  if (!sel) return;
  const opts = State.pacientes
    .filter(p => !p.eliminado)
    .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
    .join("");
  sel.innerHTML = opts || `<option value="">Sin pacientes</option>`;
}

function cancelarEdicionRehab() {
  const form = document.getElementById("rehabForm");
  const btn = document.getElementById("btnCancelarEdicionRehab");
  const titulo = document.getElementById("tituloFormRehab");
  if (form) form.reset();
  if (btn) btn.classList.add("hidden");
  if (titulo) titulo.textContent = "Crear plan de rehabilitación";
  form.dataset.editingId = "";
}

function guardarPlanRehab(e) {
  e.preventDefault();
  const form = e.target;
  const editingId = form.dataset.editingId ? Number(form.dataset.editingId) : null;

  let pacienteId = Number(document.getElementById("rehabPaciente").value);
  const raId = raPacienteId();
  if (!pacienteId && !raId) {
    mostrarNotificacion("Selecciona un paciente.");
    return;
  }
  if (!pacienteId) pacienteId = raId;

  const plan = {
    id: editingId || Date.now(),
    pacienteId,
    fechaInicio: document.getElementById("rehabFechaInicio").value,
    fechaFin: document.getElementById("rehabFechaFin").value || null,
    diagnostico: document.getElementById("rehabDiagnostico").value.trim(),
    objetivos: document.getElementById("rehabObjetivos").value.trim(),
    metas: document.getElementById("rehabMetas").value.trim(),
    sesiones: editingId
      ? (State.rehabilitaciones.find(x => x.id === editingId)?.sesiones || [])
      : []
  };

  if (editingId) {
    State.rehabilitaciones = State.rehabilitaciones.map(r => r.id === editingId ? plan : r);
    saveKey("rehabilitaciones");
    mostrarNotificacion("Plan de rehabilitación actualizado");
  } else {
    State.rehabilitaciones.push(plan);
    saveKey("rehabilitaciones");
    mostrarNotificacion("Plan de rehabilitación creado");
  }

  cancelarEdicionRehab();
  renderRehab();
}

function renderRehab(busqueda = "") {
  const lista = document.getElementById("listaRehab");
  const countEl = document.getElementById("countRehab");
  if (!lista) return;

  const termino = busqueda.toLowerCase().trim();
  const data = State.rehabilitaciones
    .filter(r => {
      const p = State.pacientes.find(x => x.id === r.pacienteId);
      const hay = !termino ||
        (p && (p.nombre.toLowerCase().includes(termino) || p.codigo.toLowerCase().includes(termino))) ||
        (r.diagnostico && r.diagnostico.toLowerCase().includes(termino)) ||
        (r.objetivos && r.objetivos.toLowerCase().includes(termino));
      return hay;
    })
    .sort((a, b) => (b.fechaInicio || "").localeCompare(a.fechaInicio || ""));

  if (countEl) countEl.textContent = data.length;

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No hay planes de rehabilitación registrados.</p>`;
    return;
  }

  lista.innerHTML = data.map(r => {
    const p = State.pacientes.find(x => x.id === r.pacienteId);
    const sesionesCount = (r.sesiones || []).length;
    const fechaFin = r.fechaFin ? ` · Fin estimado: ${r.fechaFin}` : "";
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? p.nombre : "Paciente eliminado"}</strong>
          <span class="tag">${p ? p.codigo : ""}</span>
          <span class="tag">${r.fechaInicio ? `Inicio: ${r.fechaInicio}${fechaFin}` : "Sin fecha"}</span>
          <span class="tag">${sesionesCount} sesión${sesionesCount !== 1 ? "es" : ""}</span>
        </div>
        <div class="item-sub">${escHtml(r.diagnostico || "Sin diagnóstico")}</div>
        <div class="item-actions">
          <button class="btn-icon" data-ver-rehab="${r.id}" title="Ver plan y sesiones">
            <span class="material-symbols-outlined">visibility</span>
          </button>
          <button class="btn-icon" data-editar-rehab="${r.id}" title="Editar plan">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon danger" data-borrar-rehab="${r.id}" title="Eliminar plan">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-ver-rehab]").forEach(b =>
    b.addEventListener("click", () => abrirModalRehab(Number(b.dataset.verRehab)))
  );
  lista.querySelectorAll("[data-editar-rehab]").forEach(b =>
    b.addEventListener("click", () => editarRehab(Number(b.dataset.editarRehab)))
  );
  lista.querySelectorAll("[data-borrar-rehab]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar este plan de rehabilitación?")) return;
      State.rehabilitaciones = State.rehabilitaciones.filter(x => x.id !== Number(b.dataset.borrarRehab));
      saveKey("rehabilitaciones");
      renderRehab();
    })
  );
}

function editarRehab(id) {
  const plan = State.rehabilitaciones.find(r => r.id === id);
  if (!plan) return;
  document.getElementById("rehabPaciente").value = plan.pacienteId;
  document.getElementById("rehabFechaInicio").value = plan.fechaInicio || "";
  document.getElementById("rehabFechaFin").value = plan.fechaFin || "";
  document.getElementById("rehabDiagnostico").value = plan.diagnostico || "";
  document.getElementById("rehabObjetivos").value = plan.objetivos || "";
  document.getElementById("rehabMetas").value = plan.metas || "";
  const form = document.getElementById("rehabForm");
  form.dataset.editingId = id;
  const btn = document.getElementById("btnCancelarEdicionRehab");
  if (btn) btn.classList.remove("hidden");
  const titulo = document.getElementById("tituloFormRehab");
  if (titulo) titulo.textContent = "Editar plan de rehabilitación";
  const sec = document.getElementById("seccion-rehabilitacion");
  if (sec) sec.scrollIntoView({ behavior: "smooth" });
}

function abrirModalRehab(id) {
  const plan = State.rehabilitaciones.find(r => r.id === id);
  if (!plan) return;
  const p = State.pacientes.find(x => x.id === plan.pacienteId);
  const vista = document.getElementById("rehabVista");
  const sesionesHtml = (plan.sesiones || []).map((s, idx) => `
    <div class="list-item" style="margin-bottom:8px; padding:8px;">
      <div class="item-main">
        <strong>${escHtml(s.tipo || "Sesión")}</strong>
        <span class="tag">${s.fecha || ""}</span>
        <span class="tag">${escHtml(s.terapeuta || "")}</span>
      </div>
      <div class="item-sub">${escHtml(s.ejercicios || "")}</div>
      <div class="item-sub" style="font-size:0.85em; color:var(--muted);">${escHtml(s.notas || "")}</div>
    </div>
  `).join("") || `<p class="empty">No hay sesiones registradas.</p>`;

  vista.innerHTML = `
    <div style="margin-bottom:12px;">
      <h4>${p ? p.nombre : "Paciente"} <span class="tag">${p ? p.codigo : ""}</span></h4>
      <div style="margin-top:4px;"><strong>Diagnóstico:</strong> ${escHtml(plan.diagnostico || "-")}</div>
      <div><strong>Objetivos:</strong> ${escHtml(plan.objetivos || "-")}</div>
      <div><strong>Metas:</strong> ${escHtml(plan.metas || "-")}</div>
      <div><strong>Inicio:</strong> ${plan.fechaInicio || "-"}${plan.fechaFin ? ` · <strong>Fin estimado:</strong> ${plan.fechaFin}` : ""}</div>
    </div>
    <hr style="margin:12px 0;">
    <h4 style="margin-bottom:8px;">Sesiones (${(plan.sesiones || []).length})</h4>
    <div id="rehabSesionesLista">${sesionesHtml}</div>
  `;

  document.getElementById("rehabSesionFecha").valueAsDate = new Date();
  const modal = document.getElementById("modalVerRehab");
  if (modal) modal.classList.add("open");
  modal.dataset.currentPlanId = id;
}

function guardarSesionRehab() {
  const modal = document.getElementById("modalVerRehab");
  const planId = Number(modal?.dataset.currentPlanId);
  if (!planId) return;

  const plan = State.rehabilitaciones.find(r => r.id === planId);
  if (!plan) return;

  const sesion = {
    id: Date.now(),
    fecha: document.getElementById("rehabSesionFecha").value,
    tipo: document.getElementById("rehabSesionTipo").value,
    terapeuta: document.getElementById("rehabSesionTerapeuta").value.trim(),
    ejercicios: document.getElementById("rehabSesionEjercicios").value.trim(),
    notas: document.getElementById("rehabSesionNotas").value.trim()
  };

  plan.sesiones = [...(plan.sesiones || []), sesion].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  saveKey("rehabilitaciones");

  // Actualizar vista del modal
  const vista = document.getElementById("rehabVista");
  const sesionesHtml = plan.sesiones.map(s => `
    <div class="list-item" style="margin-bottom:8px; padding:8px;">
      <div class="item-main">
        <strong>${escHtml(s.tipo || "Sesión")}</strong>
        <span class="tag">${s.fecha || ""}</span>
        <span class="tag">${escHtml(s.terapeuta || "")}</span>
      </div>
      <div class="item-sub">${escHtml(s.ejercicios || "")}</div>
      <div class="item-sub" style="font-size:0.85em; color:var(--muted);">${escHtml(s.notas || "")}</div>
    </div>
  `).join("");

  vista.querySelector("#rehabSesionesLista").innerHTML = sesionesHtml;
  vista.querySelector("h4").textContent = `Sesiones (${plan.sesiones.length})`;

  // Limpiar formulario de sesión
  document.getElementById("rehabSesionFecha").valueAsDate = new Date();
  document.getElementById("rehabSesionTipo").value = "Fisioterapia";
  document.getElementById("rehabSesionTerapeuta").value = "";
  document.getElementById("rehabSesionEjercicios").value = "";
  document.getElementById("rehabSesionNotas").value = "";

  // Actualizar lista principal
  renderRehab();
  mostrarNotificacion("Sesión registrada correctamente");
}

// ==================== REFERIMIENTO A TERAPIA FÍSICA ====================

function fillRefPacientes() {
  const sel = document.getElementById("refPaciente");
  if (!sel) return;
  const opts = pacientesActivos()
    .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
    .join("");
  sel.innerHTML = opts || `<option value="">Sin pacientes</option>`;
}

function cancelarEdicionRef() {
  const form = document.getElementById("referimientoForm");
  const btn = document.getElementById("btnCancelarEdicionRef");
  const titulo = document.getElementById("tituloFormReferimiento");
  if (form) { form.reset(); form.dataset.editingId = ""; }
  document.querySelectorAll("[data-ref-plan]").forEach(cb => { cb.checked = false; });
  const f = document.getElementById("refFecha");
  if (f) f.value = isoLocal(new Date());
  if (btn) btn.classList.add("hidden");
  if (titulo) titulo.textContent = "Referimiento a terapia física";
}

function guardarReferimiento(e) {
  e.preventDefault();
  const form = e.target;
  const editingId = form.dataset.editingId ? Number(form.dataset.editingId) : null;
  let pacienteId = Number(document.getElementById("refPaciente").value);
  if (!pacienteId) pacienteId = raPacienteId();
  if (!pacienteId) { mostrarNotificacion("Selecciona un paciente."); return; }
  const p = State.pacientes.find(x => x.id === pacienteId);
  const plan = Array.from(document.querySelectorAll("[data-ref-plan]"))
    .filter(cb => cb.checked).map(cb => cb.value);
  const datos = {
    pacienteId,
    fecha: document.getElementById("refFecha").value || isoLocal(new Date()),
    diagnostico: document.getElementById("refDiagnostico").value.trim(),
    planTerapia: plan,
    notas: document.getElementById("refNotas").value.trim()
  };
  if (editingId != null) {
    const r = State.referimientos.find(x => x.id === editingId);
    if (r) Object.assign(r, datos);
    mostrarNotificacion(`Referimiento de <b>${p ? p.nombre : "el paciente"}</b> actualizado`);
    cancelarEdicionRef();
  } else {
    State.referimientos.push({ id: Date.now(), ...datos });
    mostrarNotificacion(`Referimiento de <b>${p ? p.nombre : "el paciente"}</b> guardado`);
    form.reset();
    document.querySelectorAll("[data-ref-plan]").forEach(cb => { cb.checked = false; });
    const f = document.getElementById("refFecha");
    if (f) f.value = isoLocal(new Date());
  }
  saveKey("referimientos");
  renderReferimientos();
}

function editarReferimiento(id) {
  const r = State.referimientos.find(x => x.id === id);
  if (!r) return;
  document.getElementById("refPaciente").value = r.pacienteId;
  document.getElementById("refFecha").value = r.fecha || "";
  document.getElementById("refDiagnostico").value = r.diagnostico || "";
  document.getElementById("refNotas").value = r.notas || "";
  const plan = Array.isArray(r.planTerapia) ? r.planTerapia : [];
  document.querySelectorAll("[data-ref-plan]").forEach(cb => { cb.checked = plan.includes(cb.value); });
  const form = document.getElementById("referimientoForm");
  form.dataset.editingId = id;
  const btn = document.getElementById("btnCancelarEdicionRef");
  if (btn) btn.classList.remove("hidden");
  const titulo = document.getElementById("tituloFormReferimiento");
  if (titulo) titulo.textContent = "Editar referimiento";
  const sec = document.getElementById("seccion-rehabilitacion");
  if (sec) sec.scrollIntoView({ behavior: "smooth" });
}

function renderReferimientos(busqueda = "") {
  const lista = document.getElementById("listaReferimientos");
  if (!lista) return;
  const countEl = document.getElementById("countReferimientos");
  const term = String(busqueda || "").toLowerCase().trim();
  const data = State.referimientos
    .filter(r => {
      const p = State.pacientes.find(x => x.id === r.pacienteId);
      const plan = Array.isArray(r.planTerapia) ? r.planTerapia : [];
      const texto = [p ? p.nombre : "", p ? p.codigo : "", r.diagnostico, ...plan].join(" ").toLowerCase();
      return !term || texto.includes(term);
    })
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  if (countEl) countEl.textContent = String(State.referimientos.length);
  if (!data.length) {
    lista.innerHTML = `<p class="empty">No hay referimientos registrados.</p>`;
    return;
  }
  lista.innerHTML = data.map(r => {
    const p = State.pacientes.find(x => x.id === r.pacienteId);
    const plan = Array.isArray(r.planTerapia) ? r.planTerapia : [];
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? escHtml(p.nombre) : "Paciente eliminado"}</strong>
          <span class="tag">${p ? p.codigo : ""}</span>
          <span class="tag">${fmtFechaES(r.fecha)}</span>
        </div>
        <div class="item-sub">${escHtml(r.diagnostico || "Sin diagnóstico")}</div>
        ${plan.length ? `<div class="item-sub">Plan: ${plan.map(escHtml).join(", ")}</div>` : ""}
        <div class="item-actions">
          <button type="button" class="btn-icon" data-editar-ref="${r.id}" title="Editar referimiento">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button type="button" class="btn-icon" data-imprimir-ref="${r.id}" title="Imprimir referimiento">
            <span class="material-symbols-outlined">print</span>
          </button>
          <button type="button" class="btn-icon danger" data-borrar-ref="${r.id}" title="Eliminar referimiento">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
  lista.querySelectorAll("[data-editar-ref]").forEach(b =>
    b.addEventListener("click", () => editarReferimiento(Number(b.dataset.editarRef)))
  );
  lista.querySelectorAll("[data-imprimir-ref]").forEach(b =>
    b.addEventListener("click", () => imprimirReferimiento(Number(b.dataset.imprimirRef)))
  );
  lista.querySelectorAll("[data-borrar-ref]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar este referimiento?")) return;
      State.referimientos = State.referimientos.filter(x => x.id !== Number(b.dataset.borrarRef));
      saveKey("referimientos");
      renderReferimientos();
    })
  );
}

function imprimirReferimiento(id) {
  const r = State.referimientos.find(x => x.id === id);
  if (!r) return;
  const p = State.pacientes.find(x => x.id === r.pacienteId);
  const plan = Array.isArray(r.planTerapia) ? r.planTerapia : [];
  const planHtml = plan.length
    ? `<ul>${plan.map(x => `<li>${escHtml(x)}</li>`).join("")}</ul>`
    : "<p>-</p>";
  abrirImpresion("Referimiento a terapia física", `
    <h2>Paciente: ${p ? escHtml(p.nombre) : "-"}</h2>
    <p><strong>Fecha:</strong> ${fmtFechaES(r.fecha)}</p>
    <p><strong>Diagnóstico:</strong> ${escHtml(r.diagnostico || "-")}</p>
    <p><strong>Plan de terapia física:</strong></p>
    ${planHtml}
    ${r.notas ? `<p><strong>Indicaciones:</strong> ${escHtml(r.notas)}</p>` : ""}
  `);
}

function cerrarModales() {
  document.querySelectorAll(".modal-backdrop").forEach(bk => bk.classList.remove("open"));
}

function registrarAccionesEstudios() {
  const form = document.getElementById("estudioForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pid = Number(document.getElementById("estudioPaciente").value);
      const tipo = document.getElementById("estudioTipo").value;
      const descripcion = document.getElementById("estudioDescripcion").value.trim();
      const input = document.getElementById("estudioArchivo");
      const archivos = input && input.files ? Array.from(input.files) : [];
      if (!pid || archivos.length === 0) {
        mostrarNotificacion("Selecciona un paciente y al menos una imagen.");
        return;
      }
      const imagenes = archivos.filter(f => (f.type || "").startsWith("image/"));
      if (imagenes.length === 0) {
        mostrarNotificacion("Solo se permiten archivos de imagen (placas, radiografías, etc.).");
        return;
      }
      let pendientes = imagenes.length;
      imagenes.forEach(archivo => {
        const reader = new FileReader();
        reader.onload = () => {
          State.estudios.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            pacienteId: pid,
            tipo,
            descripcion: descripcion || archivo.name,
            name: archivo.name,
            type: archivo.type,
            size: archivo.size,
            dataUrl: reader.result,
            fecha: new Date().toLocaleDateString("es-ES")
          });
          pendientes--;
          if (pendientes === 0) {
            descripcion && (document.getElementById("estudioDescripcion").value = "");
            input.value = "";
            saveKey("estudios");
            renderEstudios();
            renderHome();
            mostrarNotificacion(`${imagenes.length} imagen(es) subida(s) como <b>${tipo}</b>.`);
          }
        };
        reader.readAsDataURL(archivo);
      });
    });
  }

  const tipoSel = document.getElementById("estudioTipo");
  if (tipoSel) {
    ["Radiografía", "Placa", "Resonancia magnética", "Tomografía", "Ultrasonido", "Analíticas / laboratorio", "Electromiografía (EMG)", "Otra imagen"].forEach(t => {
      const op = document.createElement("option");
      op.value = t;
      op.textContent = t;
      tipoSel.appendChild(op);
    });
  }

  const btnPrintEstudios = document.getElementById("btnImprimirEstudios");
  if (btnPrintEstudios) btnPrintEstudios.addEventListener("click", pedirImpresionEstudios);

  const btnImprimirView = document.getElementById("btnImprimirEstudioView");
  if (btnImprimirView) {
    btnImprimirView.addEventListener("click", () => {
      if (btnImprimirEstudioViewId != null) pedirImpresionEstudio(btnImprimirEstudioViewId);
    });
  }
}

function registrarAccionResetSistema() {
  const btn = document.getElementById("btnEliminarDatosSistema");
  if (!btn) return;
  const panelDanger = btn.closest(".panel");
  if (panelDanger) panelDanger.hidden = !esAdmin();
  btn.addEventListener("click", () => {
    if (!esAdmin()) return;
    const confirma = confirm(
      "¿ELIMINAR DATOS DEL SISTEMA?\n\nEsto borrará TODOS los datos de trabajo: pacientes, citas, evaluaciones, registros clínicos, documentos, imágenes y estudios médicos, facturas, recetas y las estadísticas del dashboard.\n\nNO se puede deshacer. Se conservarán las cuentas de usuario y la base de datos (data.db).\n\n¿Continuar?"
    );
    if (!confirma) return;
    const clave = prompt('Escribe ELIMINAR para confirmar la eliminación de todos los datos de trabajo del sistema:');
    if (clave !== "ELIMINAR") {
      const msg = document.getElementById("systemMsg");
      if (msg) {
        msg.textContent = "Operación cancelada. No se eliminó nada.";
        msg.className = "form-msg";
      }
      return;
    }
    reiniciarDatosSistema();
    renderHome();
    renderPacientes();
    fillSelects();
    renderPacientesSinCita();
    renderCitas();
    renderCitasCompletadas();
    renderCitasSinConsulta();
    renderRegistros();
    renderDocumentos();
    renderEstudios();
    renderFacturas();
    renderFacturaItems();
    renderRecetas();
    renderUsuarios();
    cargarOpcionesConfig();
    renderEvaluacionesGuardadas();
    renderRegistroActual();
    const msg = document.getElementById("systemMsg");
    if (msg) {
      msg.textContent = "Datos del sistema eliminados. El programa quedó reiniciado a cero.";
      msg.className = "form-msg ok";
    }
    mostrarNotificacion("Datos del sistema eliminados correctamente. El programa quedó reiniciado.");
  });
}

document.addEventListener("submit", (e) => {
  if (e.target.contains(document.getElementById("confPassword"))) {
    e.preventDefault();
    confirmarAccionPaciente();
  }
});

// ==================== CIRUGÍAS E IMPLANTES ====================

let cirugiaImplantesBus = [];

function fillCirugiaPacientes() {
  const sel = document.getElementById("cirugiaPaciente");
  if (!sel) return;
  const anterior = Number(sel.value) || 0;
  const opts = State.pacientes
    .filter(p => !p.eliminado)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`)
    .join("");
  sel.innerHTML = opts || `<option value="">Sin pacientes</option>`;
  if (anterior) sel.value = anterior;
}

function sincronizarConPacienteActualCirugias() {
  const id = raPacienteId();
  const sel = document.getElementById("cirugiaPaciente");
  if (sel && id != null) {
    const existe = Array.from(sel.options).some(o => o.value === String(id));
    if (existe) sel.value = String(id);
  }
  renderCirugias();
}

function llenarListaCirugiasTipo() {
  const dl = document.getElementById("listaCirugiasTipo");
  if (!dl || dl.childElementCount) return;
  const tipos = [
    "Artroplastia total de rodilla (prótesis)",
    "Artroplastia de cadera (prótesis)",
    "Artroplastia de hombro (prótesis)",
    "Osteosíntesis de fractura (placa y tornillos)",
    "Osteosíntesis intramedular",
    "Fijación externa",
    "Artroscopia de rodilla",
    "Artroscopia de hombro",
    "Reconstrucción de ligamentos",
    "Reparación de tendón",
    "Fusión articular (artrodesis)",
    "Osteotomía correctiva",
    "Amputación",
    "Revisión de prótesis",
    "Injerto óseo",
    "Otra"
  ];
  tipos.forEach(t => {
    const op = document.createElement("option");
    op.value = t;
    dl.appendChild(op);
  });
}

function llenarListaImplantesProtesis() {
  const dl = document.getElementById("listaImplantesProtesis");
  if (!dl || dl.childElementCount) return;
  const implantes = [
    // Prótesis de rodilla
    "Prótesis total de rodilla (PCL estabilizado)",
    "Prótesis total de rodilla (CR - cruciate retaining)",
    "Prótesis total de rodilla (PS - posterior stabilized)",
    "Prótesis de rodilla de revisión",
    "Prótesis unicompartimental de rodilla",
    "Prótesis patelofemoral",
    "Platillo tibial de polietileno",
    "Espaciador de rodilla (polimetilmetacrilato)",
    // Prótesis de cadera
    "Prótesis total de cadera (cementada)",
    "Prótesis total de cadera (no cementada)",
    "Prótesis total de cadera híbrida",
    "Prótesis de cadera de revisión",
    "Hemiartroplastia de cadera (bipolar)",
    "Prótesis parcial de cadera (Austin-Moore)",
    "Vástago femoral de cadera",
    "Copa acetabular",
    "Inseto acetabular dual mobility",
    // Prótesis de hombro
    "Prótesis total de hombro (anatómica)",
    "Prótesis inversa de hombro (reverse)",
    "Hemiartroplastia de hombro",
    "Prótesis de hombro de revisión",
    "Glenosfera (prótesis inversa de hombro)",
    // Otras prótesis articulares
    "Prótesis de codo",
    "Prótesis de muñeca",
    "Prótesis de tobillo",
    "Prótesis de articulación metacarpofalángica",
    "Prótesis de articulación interfalángica",
    "Prótesis de articulación sacroilíaca",
    // Osteosíntesis / fijación
    "Placa de osteosíntesis (DCP)",
    "Placa de osteosíntesis (LCP - bloqueada)",
    "Placa de osteosíntesis (reconstrucción)",
    "Placa de compresión (tornillos dinámicos DHS)",
    "Tornillo canulado de osteosíntesis",
    "Tornillo cortical de osteosíntesis",
    "Tornillo de esponjosa (cancellous)",
    "Tornillo de bloqueo",
    "Tornillo de interferencia (ligamento)",
    "Ancla de sutura (ligamento / tendón)",
    "Clavo intramedular (femoral)",
    "Clavo intramedular (tibial)",
    "Clavo intramedular (humeral)",
    "Clavo trocantérico (gamma)",
    "Fijador externo",
    "Alambre de cerclaje",
    "Grapa de osteosíntesis",
    // Columna
    "Caja intersomática lumbar (TLIF)",
    "Caja intersomática cervical (ACDF)",
    "Tornillo pedicular lumbar",
    "Tornillo pedicular cervical",
    "Barra de fijación (columna)",
    "Sistema de fijación espinal (tornillos + barras)",
    "Prótesis de disco intervertebral (artroplastia)",
    // Otros implantes / injertos
    "Cemento óseo con antibiótico",
    "Cemento óseo sin antibiótico",
    "Injerto óseo sintético (hidroxiapatita)",
    "Injerto óseo (banco de hueso)",
    "Implante de silicona (mano/pie)",
    "Otra prótesis / implante"
  ];
  implantes.forEach(t => {
    const op = document.createElement("option");
    op.value = t;
    dl.appendChild(op);
  });
}

function agregarFilaImplante() {
  cirugiaImplantesBus.push({ nombre: "", marca: "", modelo: "", lote: "", fecha: "" });
  renderCirugiaImplantes();
}

function quitarFilaImplante(idx) {
  cirugiaImplantesBus.splice(idx, 1);
  renderCirugiaImplantes();
}

function renderCirugiaImplantes() {
  const cont = document.getElementById("cirugiaImplantes");
  if (!cont) return;
  if (cirugiaImplantesBus.length === 0) {
    cont.innerHTML = `<p class="empty">Aún no has agregado implantes o prótesis.</p>`;
    return;
  }
  cont.innerHTML = cirugiaImplantesBus.map((im, i) => `
    <div class="rec-med-row">
      <div class="rec-med-grid">
        <label class="form-full">Implante / prótesis
          <input type="text" class="cirImplNombre" list="listaImplantesProtesis" data-impl-campo="${i}" value="${escHtml(im.nombre)}" placeholder="Ej.: Prótesis total de rodilla" required />
        </label>
        <label>Marca
          <input type="text" class="cirImplMarca" data-impl-campo="${i}" value="${escHtml(im.marca)}" placeholder="Marca del implante" />
        </label>
        <label>Modelo
          <input type="text" class="cirImplModelo" data-impl-campo="${i}" value="${escHtml(im.modelo)}" placeholder="Modelo / referencia" />
        </label>
        <label>Lote
          <input type="text" class="cirImplLote" data-impl-campo="${i}" value="${escHtml(im.lote)}" placeholder="N.º de lote" />
        </label>
        <label>Fecha de implantación
          <input type="date" class="cirImplFecha" data-impl-campo="${i}" value="${im.fecha || ""}" />
        </label>
        <div class="rec-med-quitar">
          <button type="button" class="btn-icon danger" data-quitar-implante="${i}" title="Quitar implante">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>
  `).join("");
  cont.querySelectorAll("[data-quitar-implante]").forEach(b =>
    b.addEventListener("click", () => quitarFilaImplante(Number(b.dataset.quitarImplante)))
  );
  cont.querySelectorAll("[data-impl-campo]").forEach(inp =>
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.implCampo);
      const im = cirugiaImplantesBus[idx];
      if (!im) return;
      if (inp.classList.contains("cirImplNombre")) im.nombre = inp.value;
      else if (inp.classList.contains("cirImplMarca")) im.marca = inp.value;
      else if (inp.classList.contains("cirImplModelo")) im.modelo = inp.value;
      else if (inp.classList.contains("cirImplLote")) im.lote = inp.value;
      else if (inp.classList.contains("cirImplFecha")) im.fecha = inp.value;
    })
  );
}

function cancelarEdicionCirugia() {
  const form = document.getElementById("cirugiaForm");
  const btn = document.getElementById("btnCancelarEdicionCirugia");
  const titulo = document.getElementById("tituloFormCirugia");
  if (form) form.reset();
  cirugiaImplantesBus = [];
  renderCirugiaImplantes();
  const fecha = document.getElementById("cirugiaFecha");
  if (fecha) fecha.value = isoLocal(new Date());
  if (btn) btn.classList.add("hidden");
  if (titulo) titulo.textContent = "Registrar cirugía";
  if (form) form.dataset.editingId = "";
}

function guardarCirugia(e) {
  e.preventDefault();
  const form = e.target;
  const editingId = form.dataset.editingId ? Number(form.dataset.editingId) : null;

  let pacienteId = Number(document.getElementById("cirugiaPaciente").value);
  const raId = raPacienteId();
  if (!pacienteId && !raId) {
    mostrarNotificacion("Selecciona un paciente.");
    return;
  }
  if (!pacienteId) pacienteId = raId;

  const implantes = cirugiaImplantesBus.map(im => ({
    nombre: im.nombre.trim(),
    marca: im.marca.trim(),
    modelo: im.modelo.trim(),
    lote: im.lote.trim(),
    fecha: im.fecha || ""
  })).filter(im => im.nombre);

  const cirugia = {
    id: editingId || Date.now(),
    pacienteId,
    fecha: document.getElementById("cirugiaFecha").value,
    tipoCirugia: document.getElementById("cirugiaTipo").value.trim(),
    lateralidad: document.getElementById("cirugiaLateralidad").value,
    cirujano: document.getElementById("cirugiaCirujano").value.trim(),
    ayudante: document.getElementById("cirugiaAyudante").value.trim(),
    sala: document.getElementById("cirugiaSala").value.trim(),
    anestesia: document.getElementById("cirugiaAnestesia").value,
    duracion: document.getElementById("cirugiaDuracion").value.trim(),
    descripcion: document.getElementById("cirugiaDescripcion").value.trim(),
    implantes,
    complicaciones: document.getElementById("cirugiaComplicaciones").value.trim(),
    notas: document.getElementById("cirugiaNotas").value.trim(),
    seguimiento: editingId
      ? (State.cirugias.find(x => x.id === editingId)?.seguimiento || [])
      : []
  };

  if (editingId) {
    State.cirugias = State.cirugias.map(c => c.id === editingId ? cirugia : c);
    saveKey("cirugias");
    mostrarNotificacion("Cirugía actualizada");
  } else {
    State.cirugias.push(cirugia);
    saveKey("cirugias");
    mostrarNotificacion("Cirugía registrada");
  }

  cancelarEdicionCirugia();
  renderCirugias();
}

function renderCirugias(busqueda = "") {
  const lista = document.getElementById("listaCirugias");
  const countEl = document.getElementById("countCirugias");
  renderListadoImplantes(busqueda);
  if (!lista) return;

  const termino = busqueda.toLowerCase().trim();
  const data = State.cirugias
    .filter(c => {
      const p = State.pacientes.find(x => x.id === c.pacienteId);
      const hay = !termino ||
        (p && (p.nombre.toLowerCase().includes(termino) || p.codigo.toLowerCase().includes(termino))) ||
        (c.tipoCirugia && c.tipoCirugia.toLowerCase().includes(termino)) ||
        (c.cirujano && c.cirujano.toLowerCase().includes(termino));
      return hay;
    })
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || b.id - a.id);

  if (countEl) countEl.textContent = data.length;

  if (data.length === 0) {
    lista.innerHTML = `<p class="empty">No hay cirugías registradas.</p>`;
    return;
  }

  lista.innerHTML = data.map(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    const implantes = c.implantes || [];
    const implCount = implantes.length;
    const implantesHtml = implantes.map(im => `
      <div class="cir-impl-line">
        <span class="material-symbols-outlined">biotech</span>
        <span>${escHtml(im.nombre || "Implante")}</span>
        ${im.marca ? `<span class="tag">${escHtml(im.marca)}</span>` : ""}
        ${im.modelo ? `<span class="tag">${escHtml(im.modelo)}</span>` : ""}
        ${im.lote ? `<span class="tag">Lote ${escHtml(im.lote)}</span>` : ""}
        ${im.fecha ? `<span class="tag">${im.fecha}</span>` : ""}
      </div>
    `).join("");
    return `
      <div class="list-item">
        <div class="item-main">
          <strong>${p ? escHtml(p.nombre) : "Paciente eliminado"}</strong>
          <span class="tag">${p ? escHtml(p.codigo) : ""}</span>
          <span class="tag">${c.fecha || "Sin fecha"}</span>
          <span class="tag">${implCount} implante${implCount !== 1 ? "s" : ""}</span>
        </div>
        <div class="item-sub">${escHtml(c.tipoCirugia || "Cirugía")}${c.lateralidad && c.lateralidad !== "No aplica" ? ` · ${escHtml(c.lateralidad)}` : ""}${c.cirujano ? ` · Dr. ${escHtml(c.cirujano)}` : ""}</div>
        ${implCount ? `<div class="cir-impl-list">${implantesHtml}</div>` : ""}
        <div class="item-actions">
          <button class="btn-icon" data-ver-cirugia="${c.id}" title="Ver detalle">
            <span class="material-symbols-outlined">visibility</span>
          </button>
          <button class="btn-icon" data-editar-cirugia="${c.id}" title="Editar cirugía">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon danger" data-borrar-cirugia="${c.id}" title="Eliminar cirugía">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-ver-cirugia]").forEach(b =>
    b.addEventListener("click", () => abrirModalCirugia(Number(b.dataset.verCirugia)))
  );
  lista.querySelectorAll("[data-editar-cirugia]").forEach(b =>
    b.addEventListener("click", () => editarCirugia(Number(b.dataset.editarCirugia)))
  );
  lista.querySelectorAll("[data-borrar-cirugia]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("¿Eliminar esta cirugía?")) return;
      State.cirugias = State.cirugias.filter(x => x.id !== Number(b.dataset.borrarCirugia));
      saveKey("cirugias");
      renderCirugias();
    })
  );
  renderListadoImplantes();
}

function renderListadoImplantes(busqueda = "") {
  const tbody = document.getElementById("listaImplantes");
  const countEl = document.getElementById("countImplantes");
  if (!tbody) return;

  const termino = busqueda.toLowerCase().trim();
  const coincide = (texto) => !termino || (texto || "").toLowerCase().includes(termino);

  const filas = [];
  State.cirugias.forEach(c => {
    const p = State.pacientes.find(x => x.id === c.pacienteId);
    (c.implantes || []).forEach(im => {
      const pblob = [
        p && p.nombre,
        p && p.codigo,
        im.nombre,
        im.marca,
        im.modelo,
        im.lote,
        im.fecha,
        c.tipoCirugia,
        c.fecha
      ].join(" ");
      if (coincide(pblob)) filas.push({ im, c, p });
    });
  });
  filas.sort((a, b) =>
    (a.c.fecha || "").localeCompare(b.c.fecha || "") || a.c.id - b.c.id
  );

  if (countEl) countEl.textContent = filas.length;

  if (filas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No hay implantes o prótesis registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filas.map(({ im, c, p }) => `
    <tr>
      <td><strong>${p ? escHtml(p.nombre) : "Paciente eliminado"}</strong>${p ? `<span class="tag">${escHtml(p.codigo)}</span>` : ""}</td>
      <td>${escHtml(im.nombre || "-")}</td>
      <td>${escHtml(im.marca || "-")}</td>
      <td>${escHtml(im.modelo || "-")}</td>
      <td>${escHtml(im.lote || "-")}</td>
      <td>${im.fecha || "-"}</td>
      <td>${escHtml(c.tipoCirugia || "-")}${c.fecha ? ` · ${c.fecha}` : ""}</td>
    </tr>
  `).join("");
}

function editarCirugia(id) {
  const c = State.cirugias.find(x => x.id === id);
  if (!c) return;
  document.getElementById("cirugiaPaciente").value = c.pacienteId;
  document.getElementById("cirugiaFecha").value = c.fecha || "";
  document.getElementById("cirugiaTipo").value = c.tipoCirugia || "";
  document.getElementById("cirugiaLateralidad").value = c.lateralidad || "No aplica";
  document.getElementById("cirugiaCirujano").value = c.cirujano || "";
  document.getElementById("cirugiaAyudante").value = c.ayudante || "";
  document.getElementById("cirugiaSala").value = c.sala || "";
  document.getElementById("cirugiaAnestesia").value = c.anestesia || "";
  document.getElementById("cirugiaDuracion").value = c.duracion || "";
  document.getElementById("cirugiaDescripcion").value = c.descripcion || "";
  document.getElementById("cirugiaComplicaciones").value = c.complicaciones || "";
  document.getElementById("cirugiaNotas").value = c.notas || "";
  cirugiaImplantesBus = (c.implantes || []).map(im => ({
    nombre: im.nombre || "",
    marca: im.marca || "",
    modelo: im.modelo || "",
    lote: im.lote || "",
    fecha: im.fecha || ""
  }));
  renderCirugiaImplantes();
  const form = document.getElementById("cirugiaForm");
  form.dataset.editingId = id;
  const btn = document.getElementById("btnCancelarEdicionCirugia");
  if (btn) btn.classList.remove("hidden");
  const titulo = document.getElementById("tituloFormCirugia");
  if (titulo) titulo.textContent = "Editar cirugía";
  const sec = document.getElementById("seccion-cirugias");
  if (sec) sec.scrollIntoView({ behavior: "smooth" });
}

function abrirModalCirugia(id) {
  const c = State.cirugias.find(x => x.id === id);
  if (!c) return;
  const p = State.pacientes.find(x => x.id === c.pacienteId);
  const vista = document.getElementById("cirugiaVista");
  const implantesHtml = (c.implantes || []).map(im => `
    <tr>
      <td>${escHtml(im.nombre || "-")}</td>
      <td>${escHtml(im.marca || "-")}</td>
      <td>${escHtml(im.modelo || "-")}</td>
      <td>${escHtml(im.lote || "-")}</td>
      <td>${im.fecha || "-"}</td>
    </tr>
  `).join("") || "";

  vista.innerHTML = `
    <div style="margin-bottom:12px;">
      <h4>${escHtml(p ? p.nombre : "Paciente")} <span class="tag">${p ? escHtml(p.codigo) : ""}</span></h4>
      <div style="margin-top:4px;"><strong>Tipo de cirugía:</strong> ${escHtml(c.tipoCirugia || "-")}${c.lateralidad && c.lateralidad !== "No aplica" ? ` · ${escHtml(c.lateralidad)}` : ""}</div>
      <div><strong>Fecha:</strong> ${c.fecha || "-"} ${c.duracion ? `· <strong>Duración:</strong> ${escHtml(c.duracion)}` : ""}</div>
      <div><strong>Cirujano:</strong> ${escHtml(c.cirujano || "-")}${c.ayudante ? ` · <strong>Ayudante:</strong> ${escHtml(c.ayudante)}` : ""}</div>
      <div><strong>Sala:</strong> ${escHtml(c.sala || "-")} · <strong>Anestesia:</strong> ${escHtml(c.anestesia || "-")}</div>
      ${c.descripcion ? `<div style="margin-top:4px;"><strong>Descripción:</strong> ${escHtml(c.descripcion)}</div>` : ""}
      ${c.complicaciones ? `<div style="margin-top:4px;"><strong>Complicaciones:</strong> ${escHtml(c.complicaciones)}</div>` : ""}
      ${c.notas ? `<div style="margin-top:4px;"><strong>Notas:</strong> ${escHtml(c.notas)}</div>` : ""}
    </div>
    <hr style="margin:12px 0;">
    <h4 style="margin-bottom:8px;">Implantes / prótesis (${(c.implantes || []).length})</h4>
    ${implantesHtml ? `<table class="table">
      <thead><tr><th>Implante</th><th>Marca</th><th>Modelo</th><th>Lote</th><th>Fecha</th></tr></thead>
      <tbody>${implantesHtml}</tbody>
    </table>` : `<p class="empty">Sin implantes registrados.</p>`}
    <hr style="margin:12px 0;">
    <h4 style="margin-bottom:8px;">Seguimiento postoperatorio (${(c.seguimiento || []).length})</h4>
    <div id="cirugiaSeguimientoLista">
      ${(c.seguimiento || []).map(s => `
        <div class="list-item" style="margin-bottom:8px; padding:8px;">
          <div class="item-main">
            <strong>${s.fecha || ""}</strong>
            <span class="tag">Consulta de control</span>
          </div>
          <div class="item-sub">${escHtml(s.notas || s.texto || "")}</div>
        </div>
      `).join("") || `<p class="empty">No hay seguimiento registrado.</p>`}
    </div>
  `;
  const modal = document.getElementById("modalVerCirugia");
  if (modal) modal.classList.add("open");
  modal.dataset.currentCirugiaId = id;
  const segForm = document.getElementById("cirugiaSegForm");
  if (segForm) segForm.style.display = "grid";
  const segFecha = document.getElementById("cirugiaSegFecha");
  if (segFecha) segFecha.value = isoLocal(new Date());
  const segNotas = document.getElementById("cirugiaSegNotas");
  if (segNotas) segNotas.value = "";
  const btnSeg = document.getElementById("btnAgregarSegCirugia");
  if (btnSeg) {
    btnSeg.onclick = guardarSeguimientoCirugia;
  }
}

function guardarSeguimientoCirugia() {
  const modal = document.getElementById("modalVerCirugia");
  const cid = Number(modal?.dataset.currentCirugiaId);
  if (!cid) return;
  const c = State.cirugias.find(x => x.id === cid);
  if (!c) return;
  const fecha = document.getElementById("cirugiaSegFecha");
  const notas = document.getElementById("cirugiaSegNotas");
  if (!fecha || !notas) return;
  const texto = notas.value.trim();
  if (!texto) return;
  c.seguimiento = [...(c.seguimiento || []), { id: Date.now(), fecha: fecha.value || isoLocal(new Date()), notas: texto }];
  saveKey("cirugias");
  notas.value = "";
  abrirModalCirugia(cid);
  mostrarNotificacion("Seguimiento registrado");
  renderCirugias();
}

function mostrarSeccion(sec) {
  if (sec === "pacientes") {
    const modal = document.getElementById("modalPacientes");
    if (modal) {
      document.querySelectorAll(".modal-backdrop").forEach(bk => { if (bk !== modal) bk.classList.remove("open"); });
      modal.classList.add("open");
      const buscador = document.getElementById("buscarPaciente");
      renderPacientes(buscador ? buscador.value : "");
      renderPacientesSinCita();
      return;
    }
  }
  document.querySelectorAll(".seccion").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("seccion-" + sec);
  if (target) target.classList.add("active");
  const raPanel = document.querySelector(".panel-registro-actual");
  if (raPanel) raPanel.hidden = sec === "inicio";
  const raChip = document.getElementById("topbarRaChip");
  if (raChip) raChip.hidden = sec === "inicio" || !raPanel || !raPanel.classList.contains("ra-min");
  if (sec === "inicio") renderHome();
  if (sec === "estudios") sincronizarConPacienteActualImagenes();
  if (sec === "proxima-cita") renderProximaCitasElegibles();
  if (sec === "imagenes") {
    sincronizarConPacienteActualImagenes();
    renderVisorImagenes();
  }
  if (sec === "pros") sincronizarConPacienteActualPros();
  if (sec === "cirugias") {
    fillCirugiaPacientes();
    sincronizarConPacienteActualCirugias();
    renderCirugias();
  }
  if (sec === "proms") { sincronizarConPacienteActualProms(); if (typeof renderProms === "function") renderProms(); }
  if (sec === "imagenes-dicom" || sec === "imagenes") { sincronizarConPacienteActualImagenes(); if (typeof renderImagenes === "function") renderImagenes(); }
  if (sec === "rehabilitacion-pt") { fillRehabPacientes(); if (typeof renderRehabPT === "function") renderRehabPT(); fillRefPacientes(); renderReferimientos(); }
  if (sec === "rehabilitacion") { fillRehabPacientes(); renderRehab(); fillRefPacientes(); renderReferimientos(); }
  if (sec === "implantes") { if (typeof renderImplantes === "function") renderImplantes(); }
  if (sec === "autorizaciones") { if (typeof renderAutorizaciones === "function") renderAutorizaciones(); }
  if (sec === "facturacion-cargos") { if (typeof renderCargos === "function") renderCargos(); }
  const title = document.getElementById("pageTitle");
  if (title) {
    const item = document.querySelector(`.nav-item[data-seccion="${sec}"] > a, .nav-sub-item[data-seccion="${sec}"] > a`);
    const label = item ? item.querySelector(".nav-label") : null;
    title.textContent = label ? label.textContent.trim() : (item ? item.textContent.trim() : sec);
  }
}

function setAvatar(imgEl, iconEl, foto) {
  if (!imgEl || !iconEl) return;
  if (foto) {
    imgEl.src = foto;
    imgEl.hidden = false;
    iconEl.hidden = true;
  } else {
    imgEl.removeAttribute("src");
    imgEl.hidden = true;
    iconEl.hidden = false;
  }
}

function cargarPerfil() {
  const u = State.session;
  if (!u) return;

  const nameEl = document.getElementById("sidebarUserName");
  if (nameEl) nameEl.textContent = u.name;

  const nombreEl = document.getElementById("perfilNombre");
  const emailEl = document.getElementById("perfilEmail");
  if (nombreEl) nombreEl.textContent = u.name;
  if (emailEl) emailEl.textContent = u.email;

  setAvatar(
    document.getElementById("sidebarAvatar"),
    document.getElementById("sidebarAvatarIcon"),
    u.foto
  );
  setAvatar(
    document.getElementById("perfilAvatar"),
    document.getElementById("perfilAvatarIcon"),
    u.foto
  );

  actualizarBotonesFoto();
}

function actualizarBotonesFoto() {
  const tieneFoto = !!(State.session && State.session.foto);
  const defs = [
    ["btnFotoAccion", "add_a_photo", "Subir foto"]
  ];
  defs.forEach(([id, icono, texto]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const ic = btn.querySelector(".foto-btn-icon");
    const tx = btn.querySelector(".foto-btn-text");
    if (ic) ic.textContent = tieneFoto ? "no_photography" : icono;
    if (tx) tx.textContent = tieneFoto ? "Remover foto" : texto;
  });
}

function quitarFotoPerfil() {
  if (State.session) {
    delete State.session.foto;
    DB.set("orto_session", State.session);
    const user = State.users.find(u => u.id === State.session.id);
    if (user) {
      delete user.foto;
      saveKey("users");
    }
  }
  cargarPerfil();
}

window.addEventListener("pagehide", () => {
  BD.guardarAntesDeSalir();
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await BD.cargar();
  } catch (err) {
    console.error("No se pudo cargar la base local:", err);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".pass-toggle");
    if (!btn) return;
    const input = document.getElementById(btn.dataset.passToggle);
    if (!input) return;
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    const icono = btn.querySelector(".material-symbols-outlined");
    if (icono) icono.textContent = mostrar ? "visibility_off" : "visibility";
  });

  const navContainer = document.getElementById("nav-container");

  if (navContainer) {
    const cachedNav = sessionStorage.getItem("navHTML_v15");
    if (cachedNav) {
      navContainer.innerHTML = cachedNav;
      initApp();
    } else {
      fetch("nav.html")
        .then(response => {
          if (!response.ok) throw new Error("No se pudo cargar la barra de navegación.");
          return response.text();
        })
        .then(data => {
          sessionStorage.setItem("navHTML_v15", data);
          navContainer.innerHTML = data;
          initApp();
        })
        .catch(error => console.error("Error al cargar el nav:", error));
    }
  } else {
    initLogin();
  }
});

function renderProms(filtro=''){ try{ const tbody=document.querySelector('#tblProms tbody'); const count=document.getElementById('countProms'); if(!tbody) return; const q=filtro.toLowerCase().trim(); let data=(State.formularios_proms||State.pros||[]); data=data.filter(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return !q|| (p&&(p.nombre.toLowerCase().includes(q)||p.codigo.toLowerCase().includes(q)))||(x.tipo&&x.tipo.toLowerCase().includes(q)); }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')|| (b.id||0)-(a.id||0)); if(count) count.textContent=data.length; tbody.innerHTML=data.length?data.map(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); const resp=(x.respuestas&&Object.keys(x.respuestas).length)?'•':'-'; return '<tr><td>'+escHtml(x.fecha||'-')+'</td><td>'+escHtml(p?p.nombre:'-')+'<br><small>'+escHtml(p?p.codigo:'')+'</small></td><td>'+escHtml(x.tipo||'-')+'</td><td>'+escHtml(x.puntajeTotal!=null?String(x.puntajeTotal):'-')+'</td><td>'+escHtml(x.interpretacion||'-')+'</td><td><button class="btn-icon danger" data-edit-prom="'+x.id+'" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-edit-prom="'+x.id+'" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-del-prom="'+x.id+'"><span class="material-symbols-outlined">delete</span></button></td></tr>'; }).join(''):'<tr><td colspan="6">Sin registros</td></tr>'; tbody.querySelectorAll('[data-del-prom]').forEach(b=>{ b.onclick=()=>{ if(!confirm('Eliminar PROM?')) return; State.formularios_proms=State.formularios_proms.filter(r=>String(r.id)!==String(b.dataset.delProm)); saveKey('formularios_proms'); renderProms(); }; }); }catch(e){} }
function renderImagenes(filtro=''){ try{ const tbody=document.querySelector('#tblImagenes tbody'); if(!tbody) return; const q=filtro.toLowerCase().trim(); let data=(State.estudios_imagenes||State.estudios||[]); data=data.filter(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return !q|| (p&&(p.nombre.toLowerCase().includes(q)||p.codigo.toLowerCase().includes(q)))||(x.estudioTipo&&x.estudioTipo.toLowerCase().includes(q))||(x.region&&x.region.toLowerCase().includes(q)); }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')|| (b.id||0)-(a.id||0)); tbody.innerHTML=data.length?data.map(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return '<tr><td>'+escHtml(x.fecha||'-')+'</td><td>'+escHtml(p?p.nombre:'-')+'</td><td>'+escHtml(x.estudioTipo||'-')+'</td><td>'+escHtml(x.region||(x.lugar||'-'))+'</td><td>'+escHtml((x.hallazgos||'').slice(0,40))+'</td><td><button class="btn-icon danger" data-edit-img="'+x.id+'" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-del-img="'+x.id+'"><span class="material-symbols-outlined">delete</span></button></td></tr>'; }).join(''):'<tr><td colspan="6">Sin estudios</td></tr>'; }catch(e){} }
function renderRehabPT(filtro=''){ try{ const tbody=document.querySelector('#tblPT tbody'); if(!tbody) return; let data=(State.pt_sesiones||State.rehabilitaciones||[]); const q=filtro.toLowerCase().trim(); data=data.filter(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return !q|| (p&&(p.nombre.toLowerCase().includes(q)||p.codigo.toLowerCase().includes(q))); }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')|| (b.id||0)-(a.id||0)); tbody.innerHTML=data.length?data.map(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return '<tr><td>'+escHtml(x.fecha||'-')+'</td><td>'+escHtml(p?p.nombre:'-')+'</td><td>'+escHtml(x.numeroSesion!=null?String(x.numeroSesion):'-')+'</td><td>'+escHtml((x.dolorAntes!=null?x.dolorAntes:'-')+' / '+(x.dolorDespues!=null?x.dolorDespues:'-'))+'</td><td>'+escHtml(x.asistencia||'-')+'</td><td><button class="btn-icon" data-edit-pt="' + x.id + '" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-del-pt="' + x.id + '" title="Eliminar"><span class="material-symbols-outlined">delete</span></button></td></tr>'; }).join(''):'<tr><td colspan="6">Sin sesiones</td></tr>'; }catch(e){} }
function renderImplantes(filtro=''){ try{ const tbody=document.querySelector('#tblImplantes tbody'); if(!tbody) return; let data=State.implantes||[]; const q=filtro.toLowerCase().trim(); data=data.filter(x=>!q||(x.codigo&&x.codigo.toLowerCase().includes(q))||(x.modelo&&x.modelo.toLowerCase().includes(q))||(x.fabricante&&x.fabricante.toLowerCase().includes(q))); tbody.innerHTML=data.length?data.map(x=>{ const p=x.pacienteId?State.pacientes.find(pp=>pp.id===x.pacienteId):null; return '<tr><td>'+escHtml(x.codigo||'-')+'</td><td>'+escHtml(x.fabricante||'-')+'</td><td>'+escHtml(x.modelo||'-')+'</td><td>'+escHtml(x.estado||'-')+'</td><td>'+escHtml(p?p.nombre:'-')+'</td><td><button class="btn-icon" data-edit-pt="' + x.id + '" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-del-pt="' + x.id + '" title="Eliminar"><span class="material-symbols-outlined">delete</span></button></td></tr>'; }).join(''):'<tr><td colspan="6">Sin implantes</td></tr>'; }catch(e){} }
function renderAutorizaciones(filtro=''){ try{ const tbody=document.querySelector('#tblAutorizaciones tbody'); if(!tbody) return; let data=State.autorizaciones_preauth||[]; const q=filtro.toLowerCase().trim(); data=data.filter(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return !q|| (p&&(p.nombre.toLowerCase().includes(q)||p.codigo.toLowerCase().includes(q)))||(x.numeroAuth&&x.numeroAuth.toLowerCase().includes(q))||(x.procedimientoCPT&&x.procedimientoCPT.toLowerCase().includes(q)); }).sort((a,b)=>(b.fechaSolicitud||'').localeCompare(a.fechaSolicitud||'')|| (b.id||0)-(a.id||0)); tbody.innerHTML=data.length?data.map(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return '<tr><td>'+escHtml(x.fechaSolicitud||'-')+'</td><td>'+escHtml(p?p.nombre:'-')+'</td><td>'+escHtml(x.procedimientoCPT||'-')+'</td><td>'+escHtml(x.numeroAuth||'-')+'</td><td>'+escHtml(x.estado||'-')+'</td><td>'+escHtml(x.vencimiento||'-')+'</td><td><button class="btn-icon" data-edit-pt="' + x.id + '" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-del-pt="' + x.id + '" title="Eliminar"><span class="material-symbols-outlined">delete</span></button></td></tr>'; }).join(''):'<tr><td colspan="7">Sin autorizaciones</td></tr>'; }catch(e){} }
function renderCargos(filtro=''){ try{ const tbody=document.querySelector('#tblCargos tbody'); if(!tbody) return; let data=State.cargos_facturacion||[]; const q=filtro.toLowerCase().trim(); data=data.filter(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return !q|| (p&&(p.nombre.toLowerCase().includes(q)||p.codigo.toLowerCase().includes(q)))||(x.cpt&&x.cpt.toLowerCase().includes(q)); }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')|| (b.id||0)-(a.id||0)); tbody.innerHTML=data.length?data.map(x=>{ const p=State.pacientes.find(pp=>pp.id===x.pacienteId); return '<tr><td>'+escHtml(x.fecha||'-')+'</td><td>'+escHtml(p?p.nombre:'-')+'</td><td>'+escHtml((x.cpt||'')+(x.hcpcs?('/'+x.hcpcs):''))+'</td><td>'+escHtml((x.dx||[]).join(', '))+'</td><td>'+escHtml(x.monto!=null?String(x.monto):'-')+'</td><td>'+escHtml(x.estado||'-')+'</td><td><button class="btn-icon" data-edit-pt="' + x.id + '" title="Editar"><span class="material-symbols-outlined">edit</span></button><button class="btn-icon danger" data-del-pt="' + x.id + '" title="Eliminar"><span class="material-symbols-outlined">delete</span></button></td></tr>'; }).join(''):'<tr><td colspan="7">Sin cargos</td></tr>'; }catch(e){} }


// v2 listeners
(function(){
  function on(id,ev,fn){ var el=document.getElementById(id); if(el) el.addEventListener(ev,fn); }
  // busquedas simples opcionales
})();


// v2 CRUD mínimo
function abrirModalCirugiaNueva(){ try{ var m=document.getElementById('modalCirugia'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalCirugia'); if(t) t.textContent='Nueva cirugía'; var f=document.getElementById('formCirugia'); if(f){ f.reset(); f.dataset.editingId=''; var fp=document.getElementById('cirPaciente'); if(fp){ var pid=raPacienteId(); if(pid!=null){ fp.value=pid; } } var fd=document.getElementById('cirFecha'); if(fd && !fd.value) fd.value=isoLocal(new Date()); } var sp=document.getElementById('cirPaciente'); if(sp){ llenarSelectPacientes(sp); } } }catch(e){} }
function abrirModalPromNueva(){ try{ var m=document.getElementById('modalProm'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalProm'); if(t) t.textContent='Nuevo PROM'; var f=document.getElementById('formProm'); if(f){ f.reset(); f.dataset.editingId=''; var fp=document.getElementById('promPaciente'); if(fp){ var pid=raPacienteId(); if(pid!=null){ fp.value=pid; } } var fd=document.getElementById('promFecha'); if(fd && !fd.value) fd.value=isoLocal(new Date()); } var sp=document.getElementById('promPaciente'); if(sp){ llenarSelectPacientes(sp); } } }catch(e){} }
function llenarSelectPacientes(sel){ try{ if(!sel) return; var opts=State.pacientes.filter(function(p){return !p.eliminado;}).map(function(p){return '<option value="'+p.id+'">'+escHtml(p.codigo)+' - '+escHtml(p.nombre)+'</option>';}).join(''); sel.innerHTML=opts||'<option value="">Sin pacientes</option>'; }catch(e){} }

function guardarCirugiaV2(e){ try{ e.preventDefault(); var f=document.getElementById('formCirugia'); if(!f) return; var pid=parseInt(document.getElementById('cirPaciente').value)||null; var fecha=document.getElementById('cirFecha').value||''; var tipo=document.getElementById('cirTipo').value||''; var lado=document.getElementById('cirLado').value||''; var cirujano=document.getElementById('cirCirujano').value||''; var estado=document.getElementById('cirEstado').value||''; var notas=document.getElementById('cirNotas').value||''; var id=f.dataset.editingId||''; var nuevo={ id: id?parseInt(id): (Date.now()), pacienteId:pid, fecha:fecha, tipoCirugia:tipo, lateralidad:lado, cirujano:cirujano, estado:estado, notas:notas, implantes:[] }; if(State.cirugias.find(x=>x.id===nuevo.id)){ State.cirugias=State.cirugias.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.cirugias.push(nuevo); } saveKey('cirugias'); renderCirugias(); f.reset(); var m=document.getElementById('modalCirugia'); if(m) m.classList.remove('open'); mostrarNotificacion('Cirugía guardada'); }catch(e){ console.error(e); } }
function guardarPromV2(e){ try{ e.preventDefault(); var f=document.getElementById('formProm'); if(!f) return; var pid=parseInt(document.getElementById('promPaciente').value)||null; var fecha=document.getElementById('promFecha').value||''; var tipo=document.getElementById('promTipo').value||''; var punt=parseFloat(document.getElementById('promPuntaje').value); if(isNaN(punt)) punt=null; var interp=document.getElementById('promInterp').value||''; var notas=document.getElementById('promNotas').value||''; var id=f.dataset.editingId||''; var col=State.formularios_proms||[]; var nuevo={ id:id?parseInt(id):(Date.now()), pacienteId:pid, fecha:fecha, tipo:tipo, puntajeTotal:punt, interpretacion:interp, notas:notas, respuestas:{} }; if(col.find(x=>x.id===nuevo.id)){ State.formularios_proms=col.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.formularios_proms.push(nuevo); } saveKey('formularios_proms'); renderProms(); f.reset(); var m=document.getElementById('modalProm'); if(m) m.classList.remove('open'); mostrarNotificacion('PROM guardado'); }catch(e){ console.error(e); } }


// v2 botones
(function(){
  function on(id,ev,fn){ var el=document.getElementById(id); if(el) el.addEventListener(ev,fn); }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-action="nueva-cirugia"]'); if(b){ e.preventDefault(); if(typeof abrirModalCirugiaNueva==='function') abrirModalCirugiaNueva(); return; }
    var b2=e.target.closest('[data-action="nuevo-prom"]'); if(b2){ e.preventDefault(); if(typeof abrirModalPromNueva==='function') abrirModalPromNueva(); return; }
  });
  var fc=document.getElementById('formCirugia'); if(fc) fc.onsubmit=guardarCirugiaV2;
  var fp=document.getElementById('formProm'); if(fp) fp.onsubmit=guardarPromV2;
})();



function editarProm(id){
  var col=State.formularios_proms||[]; var x=col.find(function(y){return y.id===id;}); if(!x) return;
  var f=document.getElementById('formProm'); var t=document.getElementById('tituloModalProm'); var b=document.getElementById('btnCancelarEdicionProm');
  if(f){ f.dataset.editingId=String(id); }
  if(t) t.textContent='Editar PROM';
  if(b) b.classList.remove('hidden');
  var sp=document.getElementById('promPaciente'); if(sp){ llenarSelectPacientes(sp); sp.value=x.pacienteId||''; }
  document.getElementById('promFecha').value=x.fecha||'';
  document.getElementById('promTipo').value=x.tipo||'';
  document.getElementById('promPuntaje').value=x.puntajeTotal!=null?x.puntajeTotal:'';
  document.getElementById('promInterp').value=x.interpretacion||'';
  document.getElementById('promNotas').value=x.notas||'';
  var m=document.getElementById('modalProm'); if(m) m.classList.add('open');
}

function cancelarEdicionProm(){
  var f=document.getElementById('formProm'); var t=document.getElementById('tituloModalProm'); var b=document.getElementById('btnCancelarEdicionProm');
  if(f){ f.reset(); f.dataset.editingId=''; }
  if(t) t.textContent='Nuevo PROM';
  if(b) b.classList.add('hidden');
  var m=document.getElementById('modalProm'); if(m) m.classList.remove('open');
}

function editarImagen(id){
  var col=State.estudios_imagenes||[]; var x=col.find(function(y){return y.id===id;}); if(!x) return;
  var f=document.getElementById('formImagen'); var t=document.getElementById('tituloModalImagen'); var b=document.getElementById('btnCancelarEdicionImagen');
  if(f){ f.dataset.editingId=String(id); }
  if(t) t.textContent='Editar estudio';
  if(b) b.classList.remove('hidden');
  var sp=document.getElementById('imgPaciente'); if(sp){ llenarSelectPacientes(sp); sp.value=x.pacienteId||''; }
  document.getElementById('imgFecha').value=x.fecha||'';
  document.getElementById('imgTipo').value=x.estudioTipo||x.tipo||'';
  document.getElementById('imgRegion').value=x.region||'';
  document.getElementById('imgHallazgos').value=x.hallazgos||'';
  var m=document.getElementById('modalImagen'); if(m) m.classList.add('open');
}
function cancelarEdicionImagen(){
  var f=document.getElementById('formImagen'); var t=document.getElementById('tituloModalImagen'); var b=document.getElementById('btnCancelarEdicionImagen');
  if(f){ f.reset(); f.dataset.editingId=''; }
  if(t) t.textContent='Nuevo estudio';
  if(b) b.classList.add('hidden');
  var m=document.getElementById('modalImagen'); if(m) m.classList.remove('open');
}
function abrirModalImagenNueva(){ try{ var m=document.getElementById('modalImagen'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalImagen'); if(t) t.textContent='Nuevo estudio'; var f=document.getElementById('formImagen'); if(f){ f.reset(); f.dataset.editingId=''; var fp=document.getElementById('imgPaciente'); if(fp){ var pid=raPacienteId(); if(pid!=null){ fp.value=pid; } } var fd=document.getElementById('imgFecha'); if(fd && !fd.value) fd.value=isoLocal(new Date()); } var sp=document.getElementById('imgPaciente'); if(sp){ llenarSelectPacientes(sp); } } }catch(e){} }
function abrirModalPTNueva(){ try{ var m=document.getElementById('modalPT'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalPT'); if(t) t.textContent='Nueva sesión PT'; var f=document.getElementById('formPT'); if(f){ f.reset(); f.dataset.editingId=''; var fp=document.getElementById('ptPaciente'); if(fp){ var pid=raPacienteId(); if(pid!=null){ fp.value=pid; } } var fd=document.getElementById('ptFecha'); if(fd && !fd.value) fd.value=isoLocal(new Date()); } var sp=document.getElementById('ptPaciente'); if(sp){ llenarSelectPacientes(sp); } } }catch(e){} }
function guardarImagenV2(e){ try{ e.preventDefault(); var f=document.getElementById('formImagen'); if(!f) return; var pid=parseInt(document.getElementById('imgPaciente').value)||null; var fecha=document.getElementById('imgFecha').value||''; var tipo=document.getElementById('imgTipo').value||''; var region=document.getElementById('imgRegion').value||''; var hall=document.getElementById('imgHallazgos').value||''; var id=f.dataset.editingId||''; var col=State.estudios_imagenes||[]; var nuevo={ id:id?parseInt(id):(Date.now()), pacienteId:pid, fecha:fecha, estudioTipo:tipo, region:region, hallazgos:hall }; if(col.find(x=>x.id===nuevo.id)){ State.estudios_imagenes=col.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.estudios_imagenes.push(nuevo); } saveKey('estudios_imagenes'); renderImagenes(); f.reset(); var m=document.getElementById('modalImagen'); if(m) m.classList.remove('open'); mostrarNotificacion('Estudio guardado'); }catch(e){} }
function guardarPTV2(e){ try{ e.preventDefault(); var f=document.getElementById('formPT'); if(!f) return; var pid=parseInt(document.getElementById('ptPaciente').value)||null; var fecha=document.getElementById('ptFecha').value||''; var ses=parseFloat(document.getElementById('ptSesion').value); if(isNaN(ses)) ses=null; var da=parseFloat(document.getElementById('ptDolorAntes').value); if(isNaN(da)) da=null; var dd=parseFloat(document.getElementById('ptDolorDesp').value); if(isNaN(dd)) dd=null; var asis=document.getElementById('ptAsistencia').value||''; var notas=document.getElementById('ptNotas').value||''; var id=f.dataset.editingId||''; var col=State.pt_sesiones||[]; var nuevo={ id:id?parseInt(id):(Date.now()), pacienteId:pid, fecha:fecha, numeroSesion:ses, dolorAntes:da, dolorDespues:dd, asistencia:asis, notas:notas, objetivo:notas }; if(col.find(x=>x.id===nuevo.id)){ State.pt_sesiones=col.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.pt_sesiones.push(nuevo); } saveKey('pt_sesiones'); renderRehabPT(); f.reset(); var m=document.getElementById('modalPT'); if(m) m.classList.remove('open'); mostrarNotificacion('Sesión guardada'); }catch(e){} }

(function(){
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-action="nueva-imagen"]'); if(b){ e.preventDefault(); if(typeof abrirModalImagenNueva==='function') abrirModalImagenNueva(); return; }
    var b2=e.target.closest('[data-action="nueva-sesion-pt"]'); if(b2){ e.preventDefault(); if(typeof abrirModalPTNueva==='function') abrirModalPTNueva(); return; }
  });
  var fi=document.getElementById('formImagen'); if(fi) fi.onsubmit=guardarImagenV2;
  var fpt=document.getElementById('formPT'); if(fpt) fpt.onsubmit=guardarPTV2;
})();

function abrirModalImplanteNueva(){ try{ var m=document.getElementById('modalImplante'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalImplante'); if(t) t.textContent='Nuevo implante'; var f=document.getElementById('formImplante'); if(f){ f.reset(); f.dataset.editingId=''; } } }catch(e){} }
function abrirModalAutorizacionNueva(){ try{ var m=document.getElementById('modalAutorizacion'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalAutorizacion'); if(t) t.textContent='Nueva autorización'; var f=document.getElementById('formAutorizacion'); if(f){ f.reset(); f.dataset.editingId=''; var fp=document.getElementById('authPaciente'); if(fp){ var pid=raPacienteId(); if(pid!=null){ fp.value=pid; } } var fd=document.getElementById('authFechaSol'); if(fd && !fd.value) fd.value=isoLocal(new Date()); } var sp=document.getElementById('authPaciente'); if(sp){ llenarSelectPacientes(sp); } } }catch(e){} }
function abrirModalCargoNueva(){ try{ var m=document.getElementById('modalCargo'); if(m){ m.classList.add('open'); var t=document.getElementById('tituloModalCargo'); if(t) t.textContent='Nuevo cargo'; var f=document.getElementById('formCargo'); if(f){ f.reset(); f.dataset.editingId=''; var fp=document.getElementById('cargoPaciente'); if(fp){ var pid=raPacienteId(); if(pid!=null){ fp.value=pid; } } var fd=document.getElementById('cargoFecha'); if(fd && !fd.value) fd.value=isoLocal(new Date()); } var sp=document.getElementById('cargoPaciente'); if(sp){ llenarSelectPacientes(sp); } } }catch(e){} }
function guardarImplanteV2(e){ try{ e.preventDefault(); var f=document.getElementById('formImplante'); if(!f) return; var col=State.implantes||[]; var nuevo={ id: (f.dataset.editingId||'')?parseInt(f.dataset.editingId):(Date.now()), codigo:document.getElementById('implCodigo').value||'', fabricante:document.getElementById('implFabricante').value||'', modelo:document.getElementById('implModelo').value||'', lote:document.getElementById('implLote').value||'', serie:document.getElementById('implSerie').value||'', tamanio:document.getElementById('implTamanio').value||'', fechaCaducidad:document.getElementById('implCaducidad').value||'', estado:document.getElementById('implEstado').value||'', notas:document.getElementById('implNotas').value||'' }; if(col.find(x=>x.id===nuevo.id)){ State.implantes=col.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.implantes.push(nuevo); } saveKey('implantes'); renderImplantes(); f.reset(); var m=document.getElementById('modalImplante'); if(m) m.classList.remove('open'); mostrarNotificacion('Implante guardado'); }catch(e){} }
function guardarAutorizacionV2(e){ try{ e.preventDefault(); var f=document.getElementById('formAutorizacion'); if(!f) return; var pid=parseInt(document.getElementById('authPaciente').value)||null; var col=State.autorizaciones_preauth||[]; var nuevo={ id:(f.dataset.editingId||'')?parseInt(f.dataset.editingId):(Date.now()), pacienteId:pid, fechaSolicitud:document.getElementById('authFechaSol').value||'', procedimientoCPT:document.getElementById('authCPT').value||'', numeroAuth:document.getElementById('authNum').value||'', estado:document.getElementById('authEstado').value||'', vencimiento:document.getElementById('authVenc').value||'', aseguradora:document.getElementById('authAseg').value||'', notas:document.getElementById('authNotas').value||'' }; if(col.find(x=>x.id===nuevo.id)){ State.autorizaciones_preauth=col.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.autorizaciones_preauth.push(nuevo); } saveKey('autorizaciones_preauth'); renderAutorizaciones(); f.reset(); var m=document.getElementById('modalAutorizacion'); if(m) m.classList.remove('open'); mostrarNotificacion('Autorización guardada'); }catch(e){} }
function guardarCargoV2(e){ try{ e.preventDefault(); var f=document.getElementById('formCargo'); if(!f) return; var pid=parseInt(document.getElementById('cargoPaciente').value)||null; var col=State.cargos_facturacion||[]; var uni=parseFloat(document.getElementById('cargoUnidades').value); if(isNaN(uni)) uni=null; var monto=parseFloat(document.getElementById('cargoMonto').value); if(isNaN(monto)) monto=null; var nuevo={ id:(f.dataset.editingId||'')?parseInt(f.dataset.editingId):(Date.now()), pacienteId:pid, fecha:document.getElementById('cargoFecha').value||'', cpt:document.getElementById('cargoCPT').value||'', hcpcs:document.getElementById('cargoHCPCS').value||'', unidades:uni, monto:monto, estado:document.getElementById('cargoEstado').value||'', notas:document.getElementById('cargoNotas').value||'' }; if(col.find(x=>x.id===nuevo.id)){ State.cargos_facturacion=col.map(x=>x.id===nuevo.id?nuevo:x); }else{ State.cargos_facturacion.push(nuevo); } saveKey('cargos_facturacion'); renderCargos(); f.reset(); var m=document.getElementById('modalCargo'); if(m) m.classList.remove('open'); mostrarNotificacion('Cargo guardado'); }catch(e){} }

(function(){
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-action="nuevo-implante"]'); if(b){ e.preventDefault(); if(typeof abrirModalImplanteNueva==='function') abrirModalImplanteNueva(); return; }
    var b2=e.target.closest('[data-action="nueva-autorizacion"]'); if(b2){ e.preventDefault(); if(typeof abrirModalAutorizacionNueva==='function') abrirModalAutorizacionNueva(); return; }
    var b3=e.target.closest('[data-action="nuevo-cargo"]'); if(b3){ e.preventDefault(); if(typeof abrirModalCargoNueva==='function') abrirModalCargoNueva(); return; }
  });
  var fi=document.getElementById('formImplante'); if(fi) fi.onsubmit=guardarImplanteV2;
  var fa=document.getElementById('formAutorizacion'); if(fa) fa.onsubmit=guardarAutorizacionV2;
  var fc=document.getElementById('formCargo'); if(fc) fc.onsubmit=guardarCargoV2;
})();
