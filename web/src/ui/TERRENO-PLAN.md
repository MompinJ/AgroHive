# A2.10 y A2.9 — Terreno

Diseño aprobado por Balam en el chat el 14/11/2026. Se conserva Terreno y se abre el mapa al elegir polígono. Leaflet permite dibujar, deshacer y reiniciar; un formulario de coordenadas ofrece la misma operación con teclado. Se confirma la cuadrícula antes de pedir elevación.

Arquitectura: DibujarParcela controla dibujo y confirmación; cuadricula.ts valida el anillo y recorta celdas mediante Turf; App conserva la parcela al navegar. El cliente API de Eduardo se incorpora sin alteraciones desde origin/Eduardo. No se calculan indicadores científicos en la interfaz.

Alternativas consideradas: plugin de dibujo (más dependencias y coordinación), o coordenadas únicamente (menos visual). Se elige Leaflet con controles propios y entrada de coordenadas.

Plan de implementación:
- [x] Incorporar Leaflet, Turf y cliente API de Eduardo.
- [x] Validar contorno, rechazar cruces y generar cuadrados locales recortados, como máximo 1600; elevación y pendiente inicialmente null.
- [x] Crear mapa, controles y edición con teclado; mostrar error del mapa base sin bloquear las coordenadas.
- [x] Confirmar cuadrícula, consultar elevación con cancelación/reintento y mostrar procedencia/advertencias; conservar parcela en App.
- [x] Probar geometría, límites, errores y persistencia de navegación; ejecutar suites y build.
- [x] Actualizar README, registro y cronograma con evidencia real.

Límites: WGS84, sin cruce del antimeridiano, latitudes menores de 85 grados y extensión local de hasta 100 km. Son límites técnicos del generador local, no parámetros agronómicos. Base cartográfica OpenStreetMap con atribución; si no carga se avisa. Suelo pendiente de consulta, sin inventar propiedades.
