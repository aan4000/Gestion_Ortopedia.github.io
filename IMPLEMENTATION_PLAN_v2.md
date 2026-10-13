# PLAN DE IMPLEMENTACIÓN v2 (Incremental, aprobado por fases)

## Fase 1: Research + Propuestas (HECHO)
- [x] Investigación ortopédica (research inicial)
- [x] Propuesta de esquema v2 (compatible hacia atrás)
- [x] Backup + v2 baseline

## Fase 2: Diseño UI/UX (PENDIENTE APROBACIÓN)
Objetivo: evolucionar diseño manteniendo look&feel actual.
- Preservar paleta, tipografía, estructura de secciones
- Añadir módulos: Cirugías, Imágenes/DICOM, Rehabilitación/PT, PROMs, Facturación/Cargos, Autorizaciones
- Navegación: añadir items sin romper existente
- Mantener panel 'Registro actual' y flujo actual

## Fase 3: Extender DB adapters (idempotente, compatible)
Modificar database.postgres.js, database.mysql.js, database.sqlite.js:
- Añadir nuevas tablas con IF NOT EXISTS
- Añadir columnas nuevas con IF NOT EXISTS (ALTER)
- No cambiar contratos existentes (create/update/list/get/delete por modelo)
- Preservar COLECCIONES existente + añadir nuevas

## Fase 4: Backend server.js (mínimos cambios)
- Mantener endpoints /api/datos intactos
- Añadir endpoints nuevos opcionales (/api/cirugias, /api/estudios-imagenes, etc.) sin romper compatibilidad
- Preservar auth, EmailJS, Neon paths

## Fase 5: Frontend (modular, incremental)
- index.html: añadir secciones nuevas (ocultas o accesibles via menú)
- app.js: añadir lógica modular sin tocar funciones existentes
- style.css: añadir clases nuevas, no romper existentes

## Fase 6: Pruebas
- Validar compatibilidad con Neon (sin pérdida datos)
- Probar con BD existente (campos nuevos NULL)
- Verificar GitHub push + Render

## RESTRICCIONES CRÍTICAS
- NUNCA eliminar campos/tablas existentes
- NUNCA romper API existente
- SIEMPRE migraciones idempotentes
- NO sobrescribir sistema actual (trabajar solo en MedHistorical_v2/)
- Todo requiere aprobación antes de implementar código
