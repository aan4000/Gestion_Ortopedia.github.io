# FASE 3: EXTENDER ADAPTERS DB (Idempotente, compatible hacia atrás)

## Objetivo
Extender database.postgres.js, database.mysql.js, database.sqlite.js añadiendo:
- Nuevas colecciones/tablas (cirugias, implantes, estudios_imagenes, pt_sesiones, formularios_proms, autorizaciones_preauth, cargos_facturacion)
- Extender campos existentes con ALTER ADD COLUMN IF NOT EXISTS (Postgres/MySQL/SQLite con manejo adecuado)
- NO romper COLECCIONES actuales ni interfaz (init(), get(), create(), update(), remove(), list(), count())

## Estrategia por adapter

### database.postgres.js
Usar SQL con IF NOT EXISTS:
- CREATE TABLE IF NOT EXISTS
- ALTER TABLE ... ADD COLUMN IF NOT EXISTS (Postgres 9.6+ lo soporta)
Para JSON: JSONB (Postgres). Campos nuevos NULLABLE/defaults seguros.

### database.mysql.js
CREATE TABLE IF NOT EXISTS. Para ADD COLUMN: usar información_schema o intentar ALTER y manejar errores? Mejor: check information_schema.COLUMNS o ejecutar ALTER ignorando error (ON DUPLICATE/try-catch). Mantener idempotente.

### database.sqlite.js
PRAGMA table_info para detectar columnas existentes; solo ALTER si no existe. CREATE TABLE IF NOT EXISTS.

## Implementación incremental
1. Añadir definiciones de nuevas tablas en inicialización (init)
2. Añadir columnas faltantes a tablas existentes (migración lazy)
3. Preservar orden lógico, no cambiar nombres existentes
4. Mantener índices

## Riesgo: MÍNIMO (solo aditivos)

NO modificar estructura existente. Campos nuevos opcionales.
