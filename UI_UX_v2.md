# FASE 2: DISEÑO UI/UX v2 (Manteniendo look&feel actual)

## Principio
Evolucionar sin romper identidad visual. Preservar colores, tipografías, espaciados, estructura y navegación actual.

## Estructura actual a preservar
- topbar (h1#pageTitle + botones admin/dark)
- panel 'Registro actual' (fixed/posición actual) - mantener comportamiento
- secciones .seccion con IDs #seccion-*
- navegación lateral/rotador (#lateral, #rotador)
- Material Symbols, paleta CSS (:root), modo oscuro

## Nuevas secciones a añadir (incremental)

1. #seccion-cirugias
   - Lista cirugías (estado: programada/realizada/cancelada)
   - Formulario: paciente, fecha, tipo, lado, procedimiento, implantes, complicaciones, pre/post
   - Seguimiento post-op (milestones)

2. #seccion-imagenes-dicom (o fusionar con #seccion-estudios/#seccion-imagenes)
   - Estudios de imagen: RX/CT/RM/US
   - Referencias a archivos, comparación side-by-side
   - Vinculación con evaluación/visita

3. #seccion-rehabilitacion-pt (extiende rehabilitacion existente)
   - Sesiones PT (número, dolor antes/después, ROM, ejercicios)
   - Gráficas de evolución ROM/dolor
   - Referencias a órdenes

4. #seccion-proms
   - Formularios: KOOS, HOOS, DASH, QuickDASH, Oswestry, VAS, WOMAC, PROMIS
   - Puntajes + interpretación + evolución (gráficas)

5. #seccion-facturacion-cargos
   - Cargos automáticos desde encuentro/cirugía/inyección
   - CPT/HCPCS + modificadores (-25,-59,-RT,-LT), unidades, DX
   - Estados, denials, global period
   - Autorizaciones vinculadas

6. #seccion-implantes
   - Inventario (fabricante, lote/serie, estado, stock/usado)
   - Seguimiento recall, vinculación a cirugías

7. #seccion-autorizaciones
   - Pre-auth: CPT, aseguradora, estado, vencimiento, evidencia

## Navegación
Añadir ítems nuevos al menú lateral (#lateral ul) manteniendo orden lógico y sin reordenar existentes. Usar iconos Material Symbols coherentes.

## CSS
- Nuevas clases .panel-cirugia, .implante-item, .prom-score, .rom-grid, .timeline
- Mantener modo oscuro completo
- Sin romper reglas existentes (.panel-registro-actual, .seccion.active)

## HTML
Añadir secciones nuevas tras las existentes (antes de modales) para no interferir. IDs coherentes.

## UX
- Progreso incremental: secciones nuevas ocultas/añadidas sin romper rutas existentes
- Formularios reutilizan patrones existentes (.form-grid, .btn, .panel)
- Tablas estilo existente (.tabla, .list-item)
