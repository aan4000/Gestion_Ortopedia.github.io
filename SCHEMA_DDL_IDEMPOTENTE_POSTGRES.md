# SCHEMA DDL IDÉMPOTENTE (Postgres) - v2
# Aplicar en database.postgres.js sin romper existente

-- cirugias
CREATE TABLE IF NOT EXISTS cirugias (
  id BIGINT PRIMARY KEY,
  pacienteId BIGINT NOT NULL,
  fecha DATE,
  tipoCirugia VARCHAR(120),
  lado VARCHAR(2),
  diagnosticoPre TEXT,
  diagnosticoPost TEXT,
  procedimiento TEXT,
  tiempoQuirurgico VARCHAR(30),
  anestesia VARCHAR(60),
  cirujano VARCHAR(120),
  implantes JSONB DEFAULT '[]'::jsonb,
  complicaciones TEXT,
  notas TEXT,
  estado VARCHAR(20) CHECK (estado IN ('programada','realizada','cancelada')) DEFAULT 'programada',
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cirugias_paciente ON cirugias(pacienteId);
CREATE INDEX IF NOT EXISTS idx_cirugias_fecha ON cirugias(fecha);

-- implantes
CREATE TABLE IF NOT EXISTS implantes (
  id BIGINT PRIMARY KEY,
  codigo VARCHAR(60),
  fabricante VARCHAR(120),
  modelo VARCHAR(120),
  lote VARCHAR(60),
  serie VARCHAR(60),
  tamanio VARCHAR(40),
  fechaCaducidad DATE,
  ubicacion VARCHAR(60),
  estado VARCHAR(20) CHECK (estado IN ('stock','usado','retirado','recall')) DEFAULT 'stock',
  pacienteId BIGINT,
  cirugiaId BIGINT,
  fechaUso DATE,
  notas TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_implantes_paciente ON implantes(pacienteId);
CREATE INDEX IF NOT EXISTS idx_implantes_cirugia ON implantes(cirugiaId);

-- estudios_imagenes
CREATE TABLE IF NOT EXISTS estudios_imagenes (
  id BIGINT PRIMARY KEY,
  pacienteId BIGINT NOT NULL,
  fecha DATE,
  estudioTipo VARCHAR(10) CHECK (estudioTipo IN ('RX','CT','RM','US')),
  region VARCHAR(60),
  lado VARCHAR(2),
  descripcion TEXT,
  hallazgos TEXT,
  dcmId VARCHAR(120),
  path VARCHAR(255),
  url VARCHAR(255),
  comparacion JSONB DEFAULT '[]'::jsonb,
  medicoSolicitante VARCHAR(120),
  centro VARCHAR(120),
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_img_paciente ON estudios_imagenes(pacienteId);
CREATE INDEX IF NOT EXISTS idx_img_fecha ON estudios_imagenes(fecha);

-- pt_sesiones
CREATE TABLE IF NOT EXISTS pt_sesiones (
  id BIGINT PRIMARY KEY,
  pacienteId BIGINT NOT NULL,
  fecha DATE,
  numeroSesion INT,
  objetivo TEXT,
  ejercicios TEXT,
  dolorAntes INT,
  dolorDespues INT,
  rom JSONB DEFAULT '{}'::jsonb,
  asistencia BOOLEAN DEFAULT true,
  notas TEXT,
  profesional VARCHAR(120),
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pt_paciente ON pt_sesiones(pacienteId);

-- formularios_proms
CREATE TABLE IF NOT EXISTS formularios_proms (
  id BIGINT PRIMARY KEY,
  pacienteId BIGINT NOT NULL,
  fecha DATE,
  tipo VARCHAR(20) CHECK (tipo IN ('KOOS','HOOS','DASH','QuickDASH','Oswestry','VAS','WOMAC','PROMIS')),
  respuestas JSONB DEFAULT '{}'::jsonb,
  puntajeTotal NUMERIC(6,2),
  interpretacion VARCHAR(120),
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proms_paciente ON formularios_proms(pacienteId);
CREATE INDEX IF NOT EXISTS idx_proms_tipo ON formularios_proms(tipo);

-- autorizaciones_preauth
CREATE TABLE IF NOT EXISTS autorizaciones_preauth (
  id BIGINT PRIMARY KEY,
  pacienteId BIGINT NOT NULL,
  procedimientoCPT VARCHAR(20),
  fechaSolicitud DATE,
  estado VARCHAR(20) CHECK (estado IN ('solicitada','aprobada','rechazada','vencida','en_revision')) DEFAULT 'solicitada',
  numeroAuth VARCHAR(60),
  vencimiento DATE,
  aseguradora VARCHAR(120),
  notas TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_paciente ON autorizaciones_preauth(pacienteId);

-- cargos_facturacion
CREATE TABLE IF NOT EXISTS cargos_facturacion (
  id BIGINT PRIMARY KEY,
  pacienteId BIGINT NOT NULL,
  fecha DATE,
  origen VARCHAR(20) CHECK (origen IN ('encuentro','cirugia','inyeccion','dme')),
  cpt VARCHAR(20),
  hcpcs VARCHAR(20),
  modifier1 VARCHAR(10),
  modifier2 VARCHAR(10),
  modifier3 VARCHAR(10),
  unidades INT DEFAULT 1,
  dx JSONB DEFAULT '[]'::jsonb,
  monto NUMERIC(10,2),
  estado VARCHAR(20) CHECK (estado IN ('pendiente','facturado','pagado','rechazado')) DEFAULT 'pendiente',
  denialReason TEXT,
  globalPeriodRelacionado VARCHAR(60),
  authId BIGINT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cargos_paciente ON cargos_facturacion(pacienteId);
CREATE INDEX IF NOT EXISTS idx_cargos_estado ON cargos_facturacion(estado);
