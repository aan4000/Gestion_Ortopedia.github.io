# FASE 5: WIREFRAME Y MVP INCREMENTAL (Frontend)

## MVP incremental
Trabajaremos módulo por módulo. Cada nuevo módulo:
- Añadido como sección nueva (no toca existentes)
- Menú lateral actualizado (añadir ítem)
- Lógica JS aislada (nuevas funciones, no reescribir existentes)
- CSS añadido (nuevas clases)

## Wireframe conceptual (sin romper layout)

### Cirugías (#seccion-cirugias)
- Header: título + botón 'Nueva cirugía'
- Panel filtros (paciente, estado, fecha)
- Lista (.list-item) con estado badge
- Modal formulario (reutiliza patrón modales existente)

### Imágenes (#seccion-imagenes-dicom)
- Panel superior: selector paciente + filtros
- Grid de estudios (tarjetas) + vista comparación
- Vincular a visita/evaluación

### Rehabilitación PT (#seccion-rehabilitacion-pt)
- Extiende #seccion-rehabilitacion existente o añade nueva
- Tabla sesiones + gráfico evolución (ROM/dolor)
- Botón nueva sesión

### PROMs (#seccion-proms)
- Selector tipo formulario (KOOS/HOOS/DASH/Oswestry/VAS/WOMAC/PROMIS)
- Preguntas dinámicas por tipo
- Calculadora puntaje + gráfico evolución

### Cargos/Facturación (#seccion-facturacion-cargos)
- Lista cargos con estados (badge)
- Botón generar cargo, vincular auth
- Filtros por estado/origen

### Implantes (#seccion-implantes)
- Inventario + estado (stock/usado/retirado/recall)
- Vinculación a cirugía/paciente

### Autorizaciones (#seccion-autorizaciones)
- Lista + solicitud nueva, estado, vencimiento (alertas)

## Reutilización
- Patrones existentes: .panel, .form-grid, .tabla, .list-item, modales, botones
- Material Symbols
- Modo oscuro
- Validaciones existentes

## Orden de implementación (MVP sugerido)
1. Cirugías (alto valor clínico, poco invasivo)
2. PROMs (útil, datos estructurados)
3. Imágenes (extiende existente)
4. PT (extiende existente)
5. Implantes + Cirugías vínculo
6. Autorizaciones + Cargos

## Restricciones
- NO modificar funciones existentes (solo añadir)
- NO romper rutas/navegación actual
- Añadir con feature flags conceptuales (solo si necesario)
