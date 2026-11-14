# AgroHive web — A1.2

Interfaz React + Vite + TypeScript. La demo usa datos precargados; las parcelas propias consultan la API. Node.js 20.19+ o 22.12+ según los requisitos de Vite; npm incluido con Node.

```sh
cd web
npm install
npm run dev
```

Abrir la URL local que imprime Vite (normalmente http://127.0.0.1:5173).

```sh
npm run typecheck
npm run build
npm run preview
```

`build` comprueba tipos antes de generar `dist/`. Las versiones exactas se fijan en package.json y package-lock.json. La app también utiliza Leaflet, Turf y Three.js. Vite y su plugin oficial proveen desarrollo/HMR/build; TypeScript y los paquetes @types comprueban tipos. CSS propio, fuentes del sistema y navegación hash evitan dependencias adicionales y peticiones remotas.

## Vistas y estado

- `#/`: P0, presentación y acceso a demo o entrada de polígono.
- `#/terreno`: P1, Isla, Veracruz, 2 hectáreas ficticias (doc 06). `?modo=poligono` explica la integración pendiente de A2.10.
- `#/laboratorio`: P2, tres paneles y selección de rotación/cultivo/ciclo/escenario de ejemplo.
- `#/comparacion`: P3, secuencias y estados NO_EVALUABLE por escenario. Orden R0–R2, sin ranking.

App conserva las selecciones de interfaz mientras permanece montada, incluso al navegar atrás/adelante. Recargar la página restaura los ejemplos iniciales. Las rutas hash funcionan en alojamiento estático sin reglas de reescritura. Rutas desconocidas muestran una página con regreso al inicio. Al navegar cambian el título y el foco al encabezado.

`src/ui/` contiene los componentes, estilos, navegación y estado de selección; `src/paginas/` contiene las cuatro vistas. El estado local no define contratos científicos. `DataState` admite falta de datos, carga y error sin simular peticiones ni retardos.

## Datos y dependencias pendientes

- Al comenzar A1.2 no existía `contratos/ejemplos/`; durante el trabajo llegó a `main` y se integró en `balam`. `src/ui/demo.ts` lee ubicación, área y aviso de `parcela.ejemplo.json`, y los cultivos de R1 de `plan-siembra.ejemplo.json`, usando tipos generados de A1.1. La selección global sigue los ciclos generales; la excepción `porCelda` no se interpreta en esta actividad.
- El adaptador no importa el ejemplo de resultados: sus mediciones, años históricos y ranking son ficticios. Todos los indicadores continúan NO_EVALUABLE. Un cultivo ausente o desconocido también se muestra como NO_EVALUABLE. No se generan geometrías, parámetros de cultivo ni mediciones.
- Compatibilidad con contratos 0.5.0: se conserva la corrección integrada por Mompin en `main` (2deb464): los ciclos del JSON de ejemplo se interpretan como `Ciclo[]` del tipo generado, y el ejemplo se valida contra su schema en las pruebas de contratos. La edición de fechas, temporadas y calendario local pertenece a la integración de A3.4 y sigue pendiente.
- R1 parte de maíz/frijol/maíz del ejemplo del contrato; R0 y R2 son alternativas locales para probar los controles, sin parámetros científicos ni resultados. Las secuencias no son recomendaciones agronómicas.
- Isla y 2 ha son el supuesto de la demo del doc 06; la verificación de zona está pendiente según doc 13. La ilustración es decorativa, sin datos geográficos.
- El mapa (A2.10), cuadrícula (A2.9), escena y motor se integrarán después. No hay botones que simulen calcular, cambiar a 3D ni dibujar polígonos.
- **Worker integrado:** `src/motor/worker.ts` y `crearClienteMotor()` de Mompin. A1.2 comprueba respuesta mediante `olvidar`; A3.4 ejecuta planes y consulta celdas mediante el protocolo existente. No se usa PING/READY.
- En P0, Cómo funciona y Recursos abren diálogos nativos; en P1–P3, método y fuentes se consultan mediante un acordeón nativo sin perder selecciones. El enlace a NASA POWER solo se abre por acción explícita.

## Inicio — iteración visual con referencia Duna

Referencia principal: captura de AgroHive entregada por Balam y `DESIGN.md` de Duna compartido en el chat. La composición aprobada tiene navegación transparente, título centrado en la parte baja, etiqueta y dos acciones. Los colores y textos siguen la captura de AgroHive.

- Asset original proporcionado por el usuario en `src/ui/assets/inicio-campo.png`, conservado sin editar. Es una ilustración decorativa, no un mapa ni una representación científica del terreno.
- `src/ui/inicio.css` define los tokens y el tratamiento exclusivo de P0: fondo a pantalla completa con `object-fit: cover`, blur de **3,5 px** aplicado solo a la imagen y sin degradado blanco inferior ni velo adicional. Según las anotaciones de Balam, el título, la pregunta, la descripción y el aviso son blancos; las acciones principales tienen fondo negro y hover gris oscuro. Se aplica en todas las anchuras, sin alterar los breakpoints. El contraste del texto sobre la ilustración no se ha certificado como WCAG AA.
- Cabecera en `src/ui/InicioHeader.tsx`. Producto lleva al laboratorio; Soluciones, a comparación; Cómo funciona y Recursos abren diálogos con cierre por Escape y restauración del foco. Los botones de demo y polígono conservan sus destinos.
- `src/App.tsx` selecciona la cabecera y el contenedor de inicio. P1–P3 mantienen la disposición anterior. Se retiraron de `styles.css` las reglas sin uso del inicio previo.
- Fuente del sistema (Arial/Helvetica); GT America no fue proporcionada. No se agregó una fuente remota ni una dependencia.
- En móvil, la navegación ocupa una segunda fila y los botones se apilan. El contenido puede desplazarse en pantallas bajas; la imagen se recorta al centro.

Verificación de la primera iteración (blur de 2 px y texto oscuro): build y TypeScript; Chromium con Playwright a 1662×946, 1440×900, 1024×768, 768×1024, 390×844 y 320×700. Asset cargado, sin desbordamiento horizontal ni superposición de cabecera/título, sin gradiente de fondo, navegación y diálogos comprobados, cero errores de consola y cero solicitudes externas durante el flujo. No se realizó revisión con lector de pantalla. En el ajuste posterior de colores y blur a 3,5 px, la revisión visual queda a cargo de Balam por petición expresa; las capturas y el informe enlazados abajo son de la primera iteración.

Capturas: [inicio de escritorio](evidencia/P0.png), [inicio móvil](evidencia/P0-mobile-390.png). Resultados: [revisión del inicio](evidencia/inicio.json). La evidencia de A1.2 de la sección siguiente corresponde a la base inicial, antes de esta iteración.

Integración del diseño con `main` (contratos 0.5.0, 1922e7c): se conserva la corrección del adaptador de Mompin. Verificaciones: contratos 52/52, API 39 pruebas correctas (una advertencia de deprecación de Starlette/httpx), catálogos válidos y build/TypeScript correctos. Sin QA visual adicional, por petición de Balam.

## Revisión manual

1. Desde P0 entrar a demo y abrir P2. Volver a P0 y elegir dibujar: debe explicar que falta A2.10.
2. En P2 elegir R1, ciclo 2 y escenario seco; el cultivo seleccionado debe decir Frijol. Cambiar el cultivo y abrir P3; volver y confirmar que conserva la selección.
3. Recargar cada ruta y probar atrás/adelante; abrir una ruta desconocida.
4. Revisar 1440, 1024, 768, 390 y 320 px: contenido sin desbordamiento y controles accesibles.
5. Usar Tab, Enter, Espacio y flechas en radios; comprobar foco y enlace Saltar al contenido. En P0 probar Cómo funciona/Recursos y cerrar con Escape. Revisar movimiento reducido.
6. Revisar consola y red: sin errores de la app ni llamadas externas; todos los indicadores siguen NO_EVALUABLE.

Fuentes técnicas: [Vite](https://vite.dev/guide/) y [React useEffect](https://react.dev/reference/react/useEffect).

## Evidencia de revisión — 14/11/2026

- `npm install`: terminó correctamente; auditoría de npm sin vulnerabilidades en ese momento.
- `npm run typecheck` y `npm run build`: correctos. Servidor de desarrollo accesible en 127.0.0.1:5173.
- Chromium con Playwright: P0–P3, entrada pendiente de polígono, ruta desconocida, recarga por URL, atrás/adelante y conservación de selecciones al volver de P3. R1 + ciclo 2 + seco muestra Frijol; no se afirma que haya simulación.
- Veinte combinaciones de ruta/anchura (1440, 1024, 768, 390, 320 px) sin desbordamiento horizontal. Sin errores de consola ni llamadas externas durante el flujo.
- Radios con flechas, acordeón con Enter, enlace de salto y foco visible comprobados. Movimiento reducido comprobado. Axe-core 4.14.0: sin incidencias automáticas WCAG A/AA en las cuatro pantallas a 1440 y 320 px; no sustituye revisión humana con lector de pantalla, que no se realizó.
- Archivos propios restringidos a `web/`; los contratos y modelos nuevos llegaron por merge de `origin/main`, sin modificaciones propias.
- Capturas en `evidencia/`: [P0](evidencia/P0.png), [P1](evidencia/P1.png), [P2](evidencia/P2.png), [P3](evidencia/P3.png) y [laboratorio a 320 px](evidencia/P2-mobile-320.png).

El criterio funcional de las cuatro vistas ejecutables está cubierto. A1.2 se cerró al conectar el Worker; el tablero vigente refleja la entrega.

## Cierre A1.2
La UI inicializa el cliente existente de Mompin mediante useMotor, comprueba su respuesta con olvidar en la sesion vacia y termina el Worker al desmontarse. Muestra disponibilidad o error con un limite de espera de 10 segundos. Esta seccion sustituye las notas anteriores de Worker pendiente; las simulaciones desde los controles siguen en A3.4/A4.6.

## Terreno — rediseño P1

Composición basada en la captura de Terreno aportada por Balam: encabezado con navegación, aviso de demostración, título y acciones a la izquierda, paisaje con recorte orgánico a la derecha y dos bloques inferiores para la parcela demo y el terreno propio. Se conserva el estado del Worker incorporado en A1.2.

Los colores se toman de `DESIGN.md` de Duna, compartido por el usuario: canvas Linen `#f7f7f5`, tarjetas Paper `#ffffff`, etiquetas Bone `#edece7`, texto Aubergine Ink `#1b0624` y botones Espresso `#160f0c`. No se copian el fondo beige ni los botones verdes de la captura. Tipografía sans serif del sistema (Arial/Helvetica), sin importar GT America ni otra fuente remota.

- Archivos: `src/paginas/Terreno.tsx`, `src/ui/terreno.css` y selección del contenedor P1 en `src/App.tsx`. Se retiran de `styles.css` las reglas del Terreno anterior que ya no tienen consumidores.
- Los tokens viven en `.app-shell-terrain`: la cabecera, el aviso, las acciones y el pie de esta vista usan el mismo sistema, sin extender la paleta a P0/P2/P3.
- Diseño adaptable: hero en dos columnas en escritorio; bloques inferiores apilados por debajo de 960 px, hero apilado por debajo de 700 px y miniaturas con ancho completo por debajo de 440 px. Los textos y botones permanecen elementos HTML reales; las imágenes no contienen texto de interfaz.
- Imágenes nuevas generadas con la herramienta integrada `image_gen` (skill imagegen), sin CLI ni API key: `src/ui/assets/terreno-hero-v1.png`, `terreno-demo-v1.png` y `terreno-poligono-v1.png`. [Prompts finales y archivos](src/ui/assets/terreno-prompts.md). Son ilustraciones ficticias, no mapas, mediciones ni evidencia científica.
- El acceso al laboratorio conserva `onSelectDemo`. La entrada de polígono conserva `?modo=poligono` y su aviso de integración pendiente de A2.10; el dibujo de la imagen no es una herramienta de edición.
- No se agregan dependencias ni llamadas a servicios externos. La imagen de inicio no se reemplaza.

Verificación de esta entrega: `npm run build` (incluye TypeScript estricto) y `git diff --check`. No se hace QA visual de la interfaz ni se generan capturas de navegador, por instrucción de Balam; esa revisión queda a su cargo. Las capturas anteriores de P1 son del esqueleto inicial.

## Terreno: A2.10 y A2.9

Esta sección sustituye las referencias anteriores al mapa y la cuadrícula pendientes. En `#/terreno?modo=poligono` se dibuja el contorno en Leaflet o mediante coordenadas; hay controles para deshacer, reiniciar y centrar. La vista predeterminada es satelital (Esri World Imagery), con OpenStreetMap como alternativa en el selector. Ambas requieren red y conservan su atribución; si falla una vista, el formulario sigue disponible.

La cuadrícula usa Turf para área e intersecciones, como máximo 1600 celdas y bordes parciales; el lado mínimo es una decisión técnica de visualización (10 m), no la resolución de los datos NASA. Límites y plan en `src/ui/TERRENO-PLAN.md`. El usuario confirma antes de consultar elevación con el cliente de Eduardo. Se muestran estado, fuente, advertencias y errores con reintento; también se puede guardar sin relieve (null, NO_EVALUABLE). La parcela se conserva en App al navegar, no después de recargar. La simulación y el suelo se conectarán en A3.4/A4.6.

Verificado en navegador: entrada de cuatro coordenadas, generación, guardado, regreso del laboratorio y conservación del contorno; 503 con motivo y reintento exitoso mediante respuestas sintéticas, sin mediciones inventadas en el producto. Sin desbordamiento a 1440, 390 y 320 px. Captura: `evidencia/terreno-poligono-320.png`. Pruebas de cuadrícula cubren contrato JSON Schema, conservación de área, borde cóncavo, límite y contornos inválidos.

Referencias técnicas: [Leaflet](https://leafletjs.com/reference.html), [Turf intersect](https://turfjs.org/docs/api/intersect). El cliente en `src/api/` conserva la implementación y documentación de Eduardo.

## Sistema visual compartido y laboratorio A3.4 A4.9

La referencia visual está en `../DESIGN.md`. `src/ui/tokens.css` contiene los valores globales; `system.css`, los componentes y estados comunes. Inicio y Terreno usan alias semánticos. Los colores de estados del motor en la escena se conservan. No se incorporó GT America porque no se proporcionó; se usa la pila local declarada.

P2/P3 ahora usan `LaboratorioConectado` y `useLaboratorio`. La demo carga datos precargados de Isla con contorno ficticio y mediciones regionales reales; una parcela propia llama al cargador de Eduardo (`cargarDatosParcela`) con su centroide, ventana estándar y cancelación. Clima, suelo y catálogo deben responder; la capa próxima temporada es opcional. Se muestran motivos de error y reintento. No se hereda el calendario de Isla para otras parcelas.

Los planes R1 a R4, las selecciones y la banda se conservan en App durante la navegación. Los cultivos usan ids del catálogo; las fechas muestran por qué y su fuente. Cada cambio de plan invalida resultados y reemplaza el Worker, ignorando respuestas obsoletas. Escenario/ciclo/fecha solo consultan resultados de celdas. La escena se carga diferida. El rango de próxima temporada se puede apagar; sus números, años análogos, advertencias y exclusiones salen del motor.

Verificación de esta entrega: pruebas de planes contra JSON Schema, prueba R1/frijol/2023, build y TypeScript. En Chromium se verificó que los cambios de escenario/ciclo y banda no envían otra petición simular; cambiar cultivo sí la envía. P2/P3 conservan selección al navegar. Anchos de laboratorio 1440/1024/768/390/320 sin desbordamiento; las cuatro rutas y la entrada polígono también pasan la comprobación a 320. Axe no encontró incidencias automáticas WCAG A/AA en los estados revisados de laboratorio y comparación. No se hizo revisión con lector de pantalla ni zoom nativo al 200 %. Fuentes/estados científicos requieren la validación humana del proyecto.

Capturas: `evidencia/laboratorio-conectado-desktop.png` y `evidencia/laboratorio-conectado-320.png`. El paquete Three.js y la serie climática se descargan por carga diferida y generan advertencias de tamaño de chunk en Vite; no bloquean el build. La plantilla documental System Design no pudo renderizarse por ausencia de LibreOffice; no se entrega un DOCX sin verificación visual.

## Tarjetas, método y carga compartida

A4.3 muestra `ranking.rotaciones[].explicacion` en laboratorio y comparación, con huecos y riesgos visibles, sin LLM. A4.5 agrega `#/metodo`, accesible desde navegación y método, con las fuentes efectivas de la sesión, unidades, resolución, períodos y advertencias. La extracción conserva citas recibidas sin inventar campos faltantes.

A4.6 usa `usarDatosParcela` de Eduardo para las parcelas propias. Su estado está vinculado al centroide para evitar mostrar datos anteriores; reintentar invalida el estado visible. La prueba de recorrido usó FastAPI real local en 8017 y su paquete precargado: las cuatro consultas respondieron 200 y el flujo llegó a comparación. El proxy de navegador de QA solo redirigió solicitudes al servidor local, no sustituyó sus respuestas. Esto no mide disponibilidad pública ni corrige problemas del despliegue.

La serie se verificó en `npm run preview -- --port 4174` con una sesión de Chromium nueva: cero solicitudes serie-clima desde Inicio, descarga al abrir laboratorio. Ya estaba cargada con import dinámico; no se introdujo una segunda estrategia de carga. Evidencia: `evidencia/tarjetas-rotacion-320.png` y `evidencia/metodo-fuentes-320.png`. Tarjetas y método sin desbordamiento en la revisión a 320 px; prueba de fuentes y render estático de huecos/riesgos incluida. Dashboard A4.1 espera la operación del Worker; no usa valores del ejemplo del contrato.

## Dashboard A4.1

El botón Mostrar gráficas de agua carga `DashboardBalance` y Recharts solo cuando se abre. Consulta `cliente.serieBalance(rotacionId, escenario)` y grafica la salida mensual del motor por ciclo: lluvia, demanda ETc, consumo ajustado, déficit y percolación. La tabla añade el mes climático y humedad media. No agrega indicadores ni sustituye null por cero. Esta sección sustituye la nota anterior de dashboard a la espera del Worker.

Rotación o escenario cambian la consulta de series y descartan respuestas viejas; no se vuelve a simular ni a consultar la API. Se muestran fuentes, unidades, estado y motivos cuando no hay datos. Leyendas y trazos discontinuos distinguen las series, sin animación; tabla accesible en región desplazable con aviso visible.

Verificado en Chromium sobre el build de producción: el dato de lluvia de la tabla coincide con el del mensaje del Worker; cambiar escenario no envía simular. Sin desbordamiento estable tras adaptación del ResizeObserver a 1440/768/390/320; axe sin incidencias automáticas en el estado revisado. Captura `evidencia/dashboard-320.png`.

Referencias oficiales: [Recharts ResponsiveContainer](https://recharts.github.io/en-US/api/ResponsiveContainer/), [LineChart y accesibilidad](https://recharts.github.io/en-US/api/LineChart/). Las series y sus agregados pertenecen al motor, no a Recharts.

## Fondo satelital del mapa

Por decisión de Balam, el mapa abre en Satélite (Esri World Imagery). El selector Vista del mapa permite volver a calles de OpenStreetMap sin borrar geometría. El fondo no alimenta el motor. Se muestra que no son imágenes en vivo, y se conserva la atribución de la capa activa. No hay fecha de captura local verificada, por lo que no se anuncia una.

Se comprobaron imágenes reales, alternancia con cuadrícula/vértices conservados, cero consultas de datos adicionales y recuperación de un fallo satelital al cambiar a calles. Captura: `evidencia/mapa-satelital.png`. Fuente y crédito del servicio: [World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=pjson).
