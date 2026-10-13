
# ORTHOPEDIC SYSTEM RESEARCH - MedHistorical v2 Evolution Plan
Generated: 2026-10-12

## 1. CORE ORTHOPEDIC MODULES (from industry analysis)

### Clinical Documentation
- Orthopedic-specific templates (fractures, joint replacements, sports injuries, spine)
- Anatomical diagrams with laterality (left/right/bilateral) - maps well to existing columna + partes afectadas
- Range of Motion (ROM) tracking with graphs over time
- Special tests (like Celso/Signs of Celso, Daniels already present)
- Pain scales: VAS, NPRS, WOMAC, KOOS/HOOS, DASH, Oswestry ODI, PROMIS
- Injury classification: AO/OTA for fractures, Weber, Garden

### Surgical Management
- Surgical case tracking (pre-op, intra-op, post-op)
- Implant tracking (manufacturer, serial, lot, size, expiry) - critical for recalls
- Operative notes templates
- Global surgical period tracking (-24,-57,-78,-79 modifiers)
- Post-op milestones and follow-up

### Imaging & Diagnostics
- DICOM/PACS integration (X-ray, CT, MRI)
- Side-by-side image comparison over time
- Image annotations linked to visits
- Structured imaging findings

### Rehab & Therapy
- PT referrals with exercise protocols, precautions, milestones
- Therapy progress tracking
- Return-to-sport criteria

## 2. BILLING & CODING (Revenue Cycle)

- CPT/HCPCS auto-suggestion with laterality (-RT,-LT,-50)

- Modifiers: -25 (E&M+procedure), -59 (distinct), global periods

- DMEPOS (braces, boots, orthotics) - HCPCS L-codes

- J-code capture for injectables

- Prior auth tracking, eligibility, denials

- Workers' Comp/PI (personal injury) workflows


## 3. COMPATIBILITY REQUIREMENTS (NON-NEGOTIABLE)

- Must preserve ALL existing functionality: Neon Postgres (database.postgres.js), MySQL/SQLite fallbacks, Basic Auth, EmailJS, server.js endpoints

- API contracts /api/datos, /api/datos/:modelo must remain compatible

- Keep DB adapters (database*.js) interface intact; evolve schema via ALTER (idempotent) like current design

- GitHub push compatibility (render.yaml, static files + server)

- Neon integration fully preserved


## 4. EVOLUTION STRATEGY (Schema + Design)

**Schema-first, backward compatible:**

- Extend existing collections (pacientes, evaluaciones, registros, referimientos) with new nullable fields

- Add new tables: cirugias, implantes, estudios_imagenes (with DICOM refs), pt_sesiones, formularios_proms, autho_preauth, facturacion_cargos

- Keep ALTER TABLE ADD COLUMN IF NOT EXISTS style (Postgres) for zero-downtime evolution

- UI: modular sections, preserve existing navigation + add new modules


## 5. BASELINE

- v2 baseline commit: 9f22f31 (estado actual revertido)

- Backups: MedHistorical_backup_20261012_1935.zip (13.81MB), MedHistorical_new_20261012_1945.zip


## 6. NEXT STEPS (Incremental, require approval)

1. Propuesta detallada de esquema (DDL extendido + migraciones idempotentes)

2. Wireframes/UI cambios (mantener look&feel actual)

3. MVP incremental: nuevos módulos sin romper existentes

4. Validación con Neon (sin perder datos)
