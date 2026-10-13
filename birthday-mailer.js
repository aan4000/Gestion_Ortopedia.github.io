// Envío automático de felicitaciones de cumpleaños a los pacientes por EmailJS.
// Se ejecuta un chequeo al iniciar el servidor y luego cada cierto intervalo.
// Requiere: DATABASE_URL/backend ya configurado y las variables de entorno de EmailJS.

const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "default_service";
const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "template_33jcool";
const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "KrpZvcvHUbBOL96ZB";
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Consultorio de Ortopedia";
const SALUDO =
  process.env.MAIL_SALUDO ||
  "Hola {nombre}, en este día tan especial el equipo del consultorio te desea un muy feliz cumpleaños. ¡Gracias por confiar en nosotros!";
const LOG_KEY = "orto_cumple_log";
const INTERVALO_MS = Math.max(1, Number(process.env.CUMPLE_INTERVALO_HORAS) || 12) * 3600 * 1000;

function fechaLocalClave(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function cumpleHoy(fechaNacimiento, d = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fechaNacimiento || "").trim());
  if (!m) return false;
  return Number(m[2]) === d.getMonth() + 1 && Number(m[3]) === d.getDate();
}

async function enviarEmailJS(paciente) {
  const cuerpo = {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    template_params: {
      from_name: MAIL_FROM_NAME,
      to_name: paciente.nombre || "",
      to_email: paciente.email || "",
      message: SALUDO.replace(/\{nombre\}/g, paciente.nombre || ""),
      reply_to: MAIL_FROM
    }
  };
  if (PRIVATE_KEY) cuerpo.accessToken = PRIVATE_KEY;

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  });
  const texto = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`EmailJS ${res.status}: ${texto || "sin detalle"}`);
  return texto;
}

// Revisa los pacientes que cumplen años hoy y les envía la felicitación (una sola vez al año).
async function revisarCumpleanos(Base, db, { aviso = false } = {}) {
  if (!PRIVATE_KEY) {
    if (aviso) {
      console.warn("[cumpleaños] Falta EMAILJS_PRIVATE_KEY: el envío de felicitaciones está desactivado.");
    }
    return { activo: false, enviados: 0, motivo: "EMAILJS_PRIVATE_KEY no configurada" };
  }

  let todo;
  try {
    todo = await Base.cargarTodo(db);
  } catch (err) {
    console.error("[cumpleaños] No se pudieron cargar los datos:", err.message);
    return { activo: true, enviados: 0, error: err.message };
  }

  const hoy = new Date();
  const anio = String(hoy.getFullYear());
  const pacientes = (todo.pacientes || []).filter(
    p => !p.eliminado && String(p.email || "").trim() && cumpleHoy(p.fechaNacimiento, hoy)
  );
  if (!pacientes.length) {
    return { activo: true, enviados: 0, candidatos: 0 };
  }

  let cfg = {};
  try {
    cfg = (await Base.cargarConfig(db)) || {};
  } catch (err) {
    console.error("[cumpleaños] No se pudo leer la configuración:", err.message);
  }
  const log = cfg[LOG_KEY] && typeof cfg[LOG_KEY] === "object" ? cfg[LOG_KEY] : {};
  const yaEsteAnio = Array.isArray(log[anio]) ? log[anio].map(String) : [];

  const enviados = [];
  const errores = [];
  for (const p of pacientes) {
    const id = String(p.id);
    if (yaEsteAnio.includes(id)) continue;
    try {
      await enviarEmailJS(p);
      enviados.push(id);
      console.log(`[cumpleaños] Felicitación enviada a ${p.nombre} <${p.email}>`);
    } catch (err) {
      errores.push({ id, email: p.email, error: err.message });
      console.error(`[cumpleaños] Error al enviar a ${p.email}: ${err.message}`);
    }
  }

  if (enviados.length) {
    cfg[LOG_KEY] = { [anio]: yaEsteAnio.concat(enviados) };
    try {
      await Base.guardarConfig(db, cfg);
    } catch (err) {
      console.error("[cumpleaños] No se pudo guardar el registro de envíos:", err.message);
    }
  }

  return { activo: true, enviados: enviados.length, errores, candidatos: pacientes.length, fecha: fechaLocalClave(hoy) };
}

let temporizador = null;

function programarCumpleanos({ Base, db }) {
  const correr = aviso =>
    revisarCumpleanos(Base, db, { aviso }).catch(err => console.error("[cumpleaños]", err.message));

  setTimeout(() => correr(true), 5000);
  if (!temporizador) temporizador = setInterval(() => correr(false), INTERVALO_MS);

  console.log(
    `[cumpleaños] Revisión programada cada ${INTERVALO_MS / 3600000} h` +
      (PRIVATE_KEY ? "" : " (desactivada: falta EMAILJS_PRIVATE_KEY)")
  );
}

module.exports = { programarCumpleanos, revisarCumpleanos };
