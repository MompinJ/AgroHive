# Revisión del sistema visual y laboratorio

## B6: textos contra documentación, 15/11/2026

Corte `f7baf2d`. Revisión de balam con tres subagentes GPT-6 Luna, razonamiento máximo. Alcance: rotaciones, escenarios, estados y límites, tutorial y alcance mundial. Solo lectura del producto; los arreglos corresponden a Eduardo. Mandan `docs/13` y `docs/16`. Esta revisión no sustituye MF10 (inventario de cifras y fuentes de Mafer).

| Prioridad | Ubicación | Hallazgo y propuesta para Eduardo |
| --- | --- | --- |
| Media | `web/src/ui/lab/PanelEscenarios.tsx:57` | El tooltip de Agua de más dice «escurrió o se fue al subsuelo». `docs/05:52,83` fija escurrimiento cero y exceso como percolación. Propuesta: «Lluvia que percoló por debajo de la raíz». |
| Media | `web/src/ui/lab/PanelComparacion.tsx:109` | «Es el rango de lo que pasó en años parecidos» describe la tabla de `calculo.proxima.meses`, pero esa es la banda climática mensual; los análogos por rotación se listan aparte. `docs/13:19,33,34,40` distingue ambos. Propuesta: «Banda mensual de incertidumbre basada en el clima histórico, ajustada por el pronóstico estacional cuando está disponible. No es una predicción exacta». Mantener aparte los años análogos y su aviso. |
| Media | `web/src/ui/lab/PanelComparacion.tsx:63` | Toda rotación que no sea EVALUABLE ni EXPLORATORIO recibe «Sin evaluar», incluida RESPALDO_HISTORICO, que sí se ordena (`motor/ranking.ts:113`, `docs/05:99`). Propuesta: etiqueta específica «Respaldo histórico» con su motivo. Confirmado por código; no se forzó una respuesta de respaldo en navegador. |
| Baja | `web/src/ui/tutorial/pasos.ts:28`, `web/src/paginas/MetodoFuentes.tsx:21` | Tutorial dice «habitual» y Método «habituales», mientras el selector muestra Año normal y `docs/16:10` usa seco/normal/lluvioso. Unificar el texto visible como «normal/normales»; conservar la clave contractual `habitual`. |
| Baja | `web/src/ui/DashboardBalance.tsx:11` | El título expone las claves internas; observado «Dashboard de agua · R1 · habitual 2016». Propuesta: resolver los nombres visibles de rotación y escenario, como las tarjetas y el selector. |

Seguimientos ya conocidos, separados de los hallazgos nuevos:

- Transición mundial (`docs/13:46`): Terreno sigue mostrando Isla como «Parcela de demostración» (`paginas/Terreno.tsx:44-49`), el tutorial la ofrece (`ui/tutorial/pasos.ts:17`) y Método/las notas la describen como demo (`paginas/MetodoFuentes.tsx:26`, `ui/components.tsx:60`). Coordinar con el módulo de ejemplos mundiales de Mompin y el frontend de Eduardo; no sustituir datos ni inventar parcelas con una corrección de copy.
- D9 (`docs/16:44`): R4 de los docs frente a Rotación 3 de la interfaz. Decisión pendiente ya registrada; no renombrar el contrato por iniciativa de esta revisión.
- D8/D10 y MF10 conservan sus responsables; no se reabren ni se dan por resueltos aquí.

Verificación: recorrido local con Chromium/Playwright desde Terreno hasta Cultivos, Escenarios y Comparación, tutorial, apertura de próxima temporada, dashboard y ruta Método. Se observaron los nombres Año seco/normal/lluvioso, años reales, NO_EVALUABLE para valores ausentes en los formateadores y el aviso de no predicción en próxima temporada. No se ensayaron todos los fallos remotos ni todos los estados del motor. La petición local SMAP respondió 503 durante el recorrido; no se presenta como fallo nuevo de copy. No se ejecutaron suites por esta revisión de lectura; la única edición es esta evidencia documental.

## Revisión anterior (14/11/2026)

14/11/2026. Alcance detallado: flujo P2 laboratorio y P3 comparación, incluidas carga, selección, recálculo, avisos y banda opcional. P0/P1 solo se revisaron como consumidores de tokens y por reflujo a 320 px. React, Vite, TypeScript, CSS propio, Leaflet y Three.js existentes. Convenciones: AGENTS.md, docs/06, docs/13, docs/14 y DESIGN.md.

| Área | Evidencia | Resultado |
| --- | --- | --- |
| Accesibilidad | `LaboratorioConectado.tsx`, controles nativos, etiquetas, regiones, axe en P2/P3 | Sin incidencias automáticas en estados revisados; lector de pantalla no verificado |
| Layout | `laboratorio.css`, `system.css`; Chromium a 1440/1024/768/390/320 | Corregidos mínimos intrínsecos del grid y del lienzo; sin desbordamiento en recorrido final |
| Escritura | Fechas, fuentes, estados de error/reintento y mensajes de banda del motor | Motivos visibles; datos faltantes no se sustituyen por cero |
| Tipografía | `tokens.css`, campos a 16 px, cifras tabulares, fuentes locales | Una pila común; GT America no proporcionada |
| Colores | Tinta y superficies Duna, roles semánticos, axe P2/P3 | Sin fallos de contraste automáticos en estados revisados; texto sobre ilustración de Inicio no medido |
| UI | `system.css`, controles redondeados, foco, transiciones a 150 ms y movimiento condicionado | Se conservan semántica e iconos de estados de la escena |

No actionable interface findings en los estados P2/P3 inspeccionados. La revisión no certifica superficies ni estados no recorridos.

Comprobaciones: `npm test`, `npm run build`; Chromium con Playwright CLI. Se instrumentaron mensajes del Worker: cambiar ciclo/escenario o apagar banda no simula otra vez; cambiar cultivo sí. Se verificaron R1, ciclo 2, seco, Frijol y año 2023; aviso de calabaza no recomendada; navegación P2/P3 con selección conservada. Se ensayaron columnas y textos largos a 320 px. Las tablas usan región con etiqueta y scroll explícito cuando procede.

No verificado: lector de pantalla, navegador Safari, zoom nativo de navegador al 200 %, contraste de texto contra cada píxel de la ilustración de Inicio, recuperación de todas las combinaciones posibles de fallos de servicios públicos. La prueba de reflujo estrecho no se presenta como prueba de zoom nativo.

Approve para los dominios y estados P2/P3 inspeccionados; las comprobaciones no verificadas anteriores quedan fuera del dictamen. La plantilla documental System Design se leyó, pero el render de su referencia falló por `LibreOffice soffice.exe was not found on PATH`; no se recreó ni se instaló una alternativa ni se entrega un documento sin verificar.

Contrastes calculados con luminancia relativa sRGB: tinta/canvas 17.83:1; texto secundario/blanco 5.09:1; texto blanco/acción 18.96:1; borde/campo 8.39:1. Se comprobó activación con Espacio de ciclo y banda, y duración 0 s bajo reducedMotion: reduce. Para parcelas propias, un 503 simulado mostró motivo y botón Reintentar carga; cambiar a demo recuperó el laboratorio. Los mensajes 503 en consola durante esa prueba son deliberados, no una medición de disponibilidad del servidor público.
