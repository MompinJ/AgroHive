# AgroHive web — A1.2

Esqueleto de interfaz React + Vite + TypeScript. Corre sin backend y sin solicitudes a servicios externos. Node.js 20.19+ o 22.12+ según los requisitos de Vite; npm incluido con Node.

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

`build` comprueba tipos antes de generar `dist/`. Las versiones exactas se fijan en package.json y package-lock.json. React y React DOM son las únicas dependencias de ejecución. Vite y su plugin oficial proveen desarrollo/HMR/build; TypeScript y los paquetes @types comprueban tipos. CSS propio, fuentes del sistema y navegación hash evitan dependencias adicionales y peticiones remotas.

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
- **Worker pendiente de coordinación con Mompin:** ubicación propuesta `src/motor/motor.worker.ts`; comprobación de disponibilidad propuesta `{ type: 'PING' }` → `{ type: 'READY' }`. No se creó este archivo ni se enviaron mensajes. Contrato de simulación pendiente de A1.1. La interfaz permanece independiente del Worker.
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

El criterio funcional de las cuatro vistas ejecutables está cubierto. El Worker sigue pendiente de coordinación con Mompin; no se marca como entregado ni se modifica el tablero compartido desde esta actividad.
