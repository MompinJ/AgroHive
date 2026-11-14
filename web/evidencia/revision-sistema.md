# Revisión del sistema visual y laboratorio

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
