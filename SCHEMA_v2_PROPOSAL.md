# PROPUESTA DE ESQUEMA v2 (Evolución compatible hacia atrás)

## Principios
- 100% compatible hacia atrás con esquema actual (Neon/Postgres/MySQL/SQLite)
- Migraciones idempotentes (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS)
- Campos nuevos NULLABLE (sin romper datos existentes)
- Mantener contratos API /api/datos y /api/datos/:modelo
- Preservar adapters database*.js (solo extender, no romper interfaz)

## Nuevas colecciones/tablas

1. cirugias
- id (PK)
- pacienteId (FK)
- fecha, tipoCirugia, lado (I/D), diagnosticoPre, diagnosticoPost
- procedimiento, tiempoQuirurgico, anestesia, cirujano
- implantes (JSON array), complicaciones, notas
- estado (programada|realizada|cancelada)
- createdAt, updatedAt

2. implantes (inventario/seguimiento)
- id, codigo, fabricante, modelo, lote, serie, tamanio, fechaCaducidad
- ubicacion, estado (stock|usado|retirado|recall)
- pacienteId, cirugiaId (opcional), fechaUso
- notas

3. estudios_imagenes
- id, pacienteId, fecha, estudioTipo (RX|CT|RM|US)
- region, lado, descripcion, hallazgos
- dcmId/path, url, comparacion (JSON)
- medicoSolicitante, centro

4. pt_sesiones (rehabilitación)
- id, pacienteId, fecha, numeroSesion, objetivo, ejercicios, dolorAntes/dolorDespues
- rom (JSON), asistencia, notas, profesional

5. formularios_proms
- id, pacienteId, fecha, tipo (KOOS|HOOS|DASH|QuickDASH|Oswestry|VAS|WOMAC|PROMIS)
- respuestas (JSON), puntajeTotal, interpretacion

6. autorizaciones_preauth
- id, pacienteId, procedimientoCPT, fechaSolicitud, estado, numeroAuth, vencimiento
- aseguradora, notas

7. cargos_facturacion
- id, pacienteId, fecha, origen (encuentro|cirugia|inyeccion|dme)
- cpt, hcpcs, modifier1/mod2/mod3, unidades, dx (JSON)
- monto, estado (pendiente|facturado|pagado|rechazado), denialReason
- globalPeriodRelacionado, authId

## Extensiones a existentes (nullable)
- pacientes: alergias, ocupacion, deporte, tabaquismo, alcohol, antecedentesQuirurgicos (JSON), contactoEmergencia
- evaluaciones: rom (JSON), pruebasEspeciales (JSON), proms (JSON), imagenesRefs (JSON)
- registros: seguimientoTipo, proximaCitaConfirmada, adjuntos (JSON)
- referimientos: motivoDetallado, prioridad, centroDestino, estado

## Migración
Todas idempotentes. En database.postgres.js/database*.js añadir ALTER TABLE ADD COLUMN IF NOT EXISTS y CREATE TABLE IF NOT EXISTS con índices apropiados.
