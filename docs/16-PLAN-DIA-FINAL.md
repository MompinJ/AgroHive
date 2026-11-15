# 16 · Plan del día final (15/11/2026)

Corte: domingo 15/11, madrugada (hora de la sede), con `main` en `e355bb3`. Primera versión: sábado 14/11, 23:10, sobre `f56450c`. Este documento manda sobre la organización del trabajo del día final; la entrega es una fase posterior y queda fuera de este plan (sección 5); el detalle de cada actividad sigue en `docs/14` y las decisiones en `docs/13`. Lo que no se pudo verificar va marcado `[VERIFICAR]`. Resumen corto para Mompin: [`RESUMEN-NOCHE-14-11.md`](RESUMEN-NOCHE-14-11.md).

## 1. Estado real

- **`main` en verde** en `e355bb3` (corrido en esta pasada): `contratos/` 102/102, `api/` 162, catálogos en verde, `tsc --noEmit` limpio; además `vitest` 3254 (1 `todo`).
- **Despliegue:** `/health` responde `bdc792f` y contratos 0.14.0 (lo desplegó Eduardo esta noche). `e355bb3` todavía **no** está publicado: le faltan al servidor las tandas E, F y G de modelos (cebolla a betabel) y el ajuste de la prueba del recorte.
- **Hecho esta noche:** auditoría del back y del motor con sus arreglos (`docs/hallazgos-back.md`, todo menos H-M7); catálogo de 8 a **40 cultivos**, todos con modelo detallado, bloque, icono 2D y `modelo3d`; `prueba-movimiento` 33 de 33; **bordes diagonales** (celdas de borde en medio cuadrado en 3D, contrato 0.14.0 con `forma` opcional y selector "Tamaño de celda" auto/10/20/30/50/100 m); front de Eduardo: vistas de la base (cultivos, validación, agua), paleta con buscador y grupos para 40 cultivos, dibujo de parcela editable, rotaciones y ciclos sin límite, comparación por tarjetas, mascota con consejos y NDVI/SMAP en pantalla.
- **Funciona:** motor FAO-56 en Web Worker, escenarios seco / normal / lluvioso, ranking B con cuatro pilares, tarjetas por plantilla, próxima temporada `EXPLORATORIO`, recorrido Terreno → Cultivos → Escenarios → Comparación, dashboard plegado, método y fuentes, demo sin red, API completa (POWER, IMERG, NDVI, SMAP, suelo, elevación, calendario, CDL/SSURGO).
- **Cambió respecto a los docs (decisión de Mompin, sección 2):** se retiró el modo 2D de la app (sin WebGL ya no se ve la parcela, solo las cifras; `Parcela2D.tsx` sigue vivo solo en la vista previa con `?vista=2d`); la rotación de ejemplo R4 se llama ahora R3 en la interfaz; el laboratorio ya no muestra fuentes (siguen en "Método y fuentes").
- **Incompleto:** no hay medición en hardware real modesto ni en celular; con bordes, un cultivo pasa de 6 a 18 draw calls (sin medir con GPU real); el marco de selección y la marca de la brocha siguen cuadrados en celdas de medio cuadrado; los 32 cultivos nuevos no tienen revisión humana de modelos ni de cifras (colores a ojo).
- **Frontend:** a cargo de Eduardo (D1); sigue abierto a rediseño. Este documento no propone el diseño.
- **Pospuesto hasta el final** (`docs/13`): A0.3, A4.4, A5.7 y A5.9. Lo de la entrega está en la sección 5.

### Ramas (contra `origin/main` `e355bb3`)

| Rama | Qué trae que `main` no tiene | Recomendación |
| --- | --- | --- |
| `origin/Eduardo` (+1) | `cfded82`: nota del despliegue de `bdc792f` en `AgroVault/Compartido/Servidor.md` | Integrar en la primera ventana (una línea) |
| `origin/Eduardo-B` (+2) | Solo `AgroVault/Compartido/Comunicacion.md` (prompt del buzón y reglas de dos sesiones) | Muerta; Eduardo decide si rescata la nota (E8) |
| `origin/Eduardo-B2`, `-C`, `-F` | NDVI por ORNL o por archivos por escenario; los `ndvi-seco/habitual/lluvioso.json` no existen en ninguna rama y `datos/demo/respuestas/ndvi.json` ya cubre 2016, 2023 y 2024 | Muertas |
| Las demás remotas (`balam`, `Mafer`, `Mompin`, `Mompin-*`, `Eduardo-D/E/G/H/I`) | Nada | Al día o muertas |
| Locales `Mompin-a29-descartada`, `contratos-nulos`, `Eduardo`, `Mafer`, `balam`, `main` | Viejas o descartadas | Borrar si D7 dice que sí |

## 2. Decisiones de Mompin para el plan de trabajo

Decididas `[DECIDIDO]` (Mompin, 14/11 noche; también en `docs/13`):

| # | Decisión |
| --- | --- |
| D1 | **Eduardo lleva el rediseño del front**: `web/src/ui/`, `web/src/paginas/` y la parte de la escena que el front necesite. Los demás no tocan el front |
| D4 | **Sandía, camote y cacahuate se terminan** (hecho; después se amplió a los 40 cultivos) |
| H-B6 | 20 s por intento, 2 intentos por fuente y plazo total de 70 s por petición (aplicado) |
| H-M1 | `entran` solo sobre las rotaciones que se ordenan; una `EXPLORATORIO` sin un pilar lleva puntaje `null` (aplicado) |
| H-M9 | Escenario `NO_EVALUABLE` con todos sus indicadores en `null` (aplicado) |
| Reparto IA | La IA de Mompin tomó esta noche motor, API y cultivos (cazafallos, cultivos, catálogo y bordes). Ya no queda ninguna especialista trabajando |

Abiertas, para decidir en la reunión de la mañana:

| # | Decisión | Qué pasa hoy | Afecta a |
| --- | --- | --- | --- |
| D8 | **Respaldo sin WebGL.** Eduardo retiró el modo 2D de la app; docs/00, el `[DECIDIDO]` de docs/11 ("3D con modo 2D de respaldo", con la nota "confirmar con Mompin"), A3.6, el respaldo de A5.4 y el paso 4 del plan de recorte de docs/14 siguen diciendo que existe. Aceptar el retiro (y corregir esos docs) o devolver un respaldo | Sin WebGL solo se ven las cifras | Eduardo, docs |
| D9 | **R4 pasa a R3.** La interfaz llama Rotación 1, 2, 3 (ids R1, R2, R3; la de ejemplo antes R4 es R3). docs/13 ("Rotaciones de la demo: R1, R2 y R4"), docs/05 y el README siguen con R4. Aceptar el cambio (y corregir los docs) o volver al id R4 | Docs y app dicen cosas distintas | Eduardo, docs |
| D10 | **Fuentes en el laboratorio.** El laboratorio da la información directa sin decir de dónde sale; las fuentes siguen completas en "Método y fuentes". Confirmar que eso cumple "toda cifra se rastrea a una fuente" o pedir un enlace por cifra | Rastreo a una pantalla aparte | Eduardo |
| D2 | **Placa de estado** (la decide Eduardo con el front): 0.6 de la celda en cuadrados y 0.42 en triángulos `[PROPUESTA]` | Propuesta sin cerrar | Eduardo |
| D3 | **Llave SSH de respaldo:** solo Eduardo persona puede desplegar | Si Eduardo no está, nada nuevo se publica | Despliegues |
| D5 | **Inclinación de cámara ligada al zoom** (`[PROPUESTA]` de Eduardo, ya en `main`) | Queda como propuesta | Escena |
| D6 | **A4.4 (LLM) y A0.3 (acta):** cerrarlas o hacerlas | Pospuestas sin fecha | Tablero |
| D7 | **Borrar ramas muertas** (sección 1) | Ruido para las IAs | Limpieza |
| H-M7 | **Año agrícola del horizonte de análogos que cruza septiembre** (`docs/hallazgos-back.md`; anclar los meses no basta). No afecta la demo, emitida en noviembre | Propuesto, sin arreglar | Motor (Mompin) |

**Punto para la reunión (sin drama):** esta noche Eduardo subió 7 commits de front directo a `main` (`dbd8661` a `bdc792f`). Se integraron bien y `main` siguió en verde, pero la regla 4 dice que solo Mompin integra, por ventanas y tras el aviso "listo para integrar". Recordarlo y acordar cómo se trabaja hoy.

Las decisiones que son solo de la entrega están en la sección 5.

Al terminar el hackathon: apagar `herramientas/buzon/buzon.py` y cerrar el puerto 3000 en el firewall (`docs/13`, "Comunicación entre sesiones").

## 3. Cola de tareas

Estado: `LISTA`, `ESPERA` (depende de algo), `EN CURSO`, `HECHA`. Cada persona trabaja de arriba hacia abajo y siempre tiene sus 2 siguientes asignadas; si se bloquea, pasa a la siguiente o a una de relleno (sección 6). Al tomar una tarea, se anuncia en el buzón (regla 1). Carga de hoy (Mompin): **Eduardo lleva lo grande** (front y despliegue); **balam y Mafer trabajan menos**, con tareas cortas, autocontenidas y sin dependencias largas.

### Primeras acciones de la mañana (en orden)

| # | Acción | Quién | Estado |
| --- | --- | --- | --- |
| P1 | Relanzar el buzón con la IP nueva: `python3 herramientas/buzon/buzon.py` en la laptop de Mompin; los scripts ya apuntan a `http://172.20.10.3:3000`, la IP del hotspot en la sede (o `BUZON_URL`). Avisar a todos que relancen su escucha | Mompin | LISTA |
| P2 | Desplegar `e355bb3` una sola vez, avisando antes y después (`/health` con el commit y contratos 0.14.0, `/medir.html` y `mediworks.mx` en 200) | Eduardo | LISTA |
| P3 | Avisar a Eduardo de los archivos suyos que tocó bordes (detalle exacto en `docs/01`, "Bordes diagonales, parte 3"): `escena/render/escena-three.ts`, `ui/DibujarParcela.tsx`, `ui/Parcela2D.tsx` y `ui/cuadricula.ts` (reexportación) | Mompin | LISTA |
| P4 | Reunión corta: decisiones D8, D9, D10, D3, D6, D7 y H-M7; punto de los pushes directos a `main` (sección 2) | Mompin con todos | LISTA |
| P5 | Integrar `origin/Eduardo` (`cfded82`, una línea del vault) en la primera ventana | Mompin | LISTA |

### Eduardo (front, `api/`, `datos/` salvo catálogos, servidor; único con SSH)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| E1 | Despliegues: P2 y después cada `main` que Mompin pida | droplet | — | LISTA |
| E9 | Revisar la conexión de bordes con su front nuevo: celdas de medio cuadrado en la escena, selector "Tamaño de celda" en `DibujarParcela`, contornos en el mapa; el marco de selección y la marca de la brocha siguen cuadrados | `web/src/escena/render/escena-three.ts`, `web/src/ui/DibujarParcela.tsx`, `web/src/ui/` | P3 | LISTA |
| E2 | Rediseño del front (D1), con la placa de estado (D2) y lo que salga de D8, D9 y D10 | `web/src/ui/`, `web/src/paginas/`, la parte de `web/src/escena/` que el front necesite | P4 para D8 a D10 | EN CURSO |
| E3 | Medición en hardware real: `/medir.html` en la Mac con GPU real (línea de reposo con motivos, buzón #257) y en un celular o laptop sin GPU dedicada; incluir los draw calls con bordes (6 a 18 con un cultivo) | `docs/06` (con aviso), capturas | P2 | ESPERA |
| E8 | Decidir qué hace con `Comunicacion.md` de `Eduardo-B` | `AgroVault/Compartido/` | — | LISTA |
| E6 | Si D3 dice que sí: agregar la llave pública de Mompin al droplet | droplet | D3 | ESPERA |
| E4 | Hallazgos del back (H-B6, H-B8, H-B9, H-B10, H-B11) | `api/`, `datos/demo/` | — | HECHA (cazafallos, en `main`) |
| E10 | **Demo mundial** (`docs/13`, "Demo mundial", Mompin 15/11): quitar Isla como demo y conectar los ejemplos mundiales. Los datos y la carga ya están (`datos/demo/ejemplos/`, `web/src/demo/ejemplos.ts`, `web/src/geo/koppen.ts`); falta solo el front. Lista exacta: **(1)** textos de Isla: `ui/components.tsx:60` ("La parcela de demostración de Isla, Veracruz..."), `ui/tutorial/pasos.ts:17` ("Puedes abrir la parcela de demostración (Isla, Veracruz)..."; `ui/InicioHeader.tsx` ya se quitó con la landing sin demo), `paginas/Laboratorio.tsx:37` (título "Parcela demo · Isla"), `paginas/MetodoFuentes.tsx:26` ("La demo usa un contorno ficticio en Isla"); usar `AVISO_EJEMPLOS` y `ejemplo.nombre`. **(2)** Elegir ejemplo: la landing ya no muestra demo (`02a8edc`); falta un lugar donde elegir un ejemplo con `listarEjemplos()` (nombre, país, clima `clima.descripcion`, cultivos sugeridos) junto a "Dibujar mi parcela". **(3)** `ui/useLaboratorio.ts`: la rama `esDemo` (líneas 64-70, que importa `escena/demo-motor`, `datos/demo/respuestas/*` y `calendarioIsla`) pasa a `const d = await cargarEjemplo(id)`; `d` ya tiene la forma de `DatosLaboratorio` (lo prueba `demo/ejemplos.test.ts`), así que basta con `siguiente = d`. El hook necesita recibir el id del ejemplo elegido en vez de `parcela === null`. **(4)** `ui/planes.ts:3` y `:7`: quitar el import de `calendario-isla.json` y `calendarioIsla` (el calendario llega en `d.calendario`); `planesIniciales` hoy arma maíz y frijol fijos: con los ejemplos conviene armarlas con `ejemplo.cultivosSugeridos` y las ventanas de `d.calendario` (o dejar la decisión explícita). **(5)** `ui/lab/useEvidencia.ts:26` y `ui/lab/usePlagas.ts:17` leen el NDVI y las plagas de Isla en modo demo: usar `d.evidencia.ndvi`, `d.evidencia.plagas` (y `d.evidencia.smap`, la foto grabada, si no hay red). **(6)** `escena/demo-motor.ts` queda solo para las vistas previas (`escena/vista-previa.tsx`, `escena/medir/`): el laboratorio ya no lo importa. **(7)** Bioma: `escena/EscenaParcela.tsx:72` (comentario "Por defecto, tropical humedo (demo de Isla)") y `escena/escena.css:188` (comentario "El tropical humedo es la demo de Isla"); en `ui/lab/Laboratorio.tsx:205` (`biomaDe(clima)`) el bioma pasa a salir de `d.bioma` en los ejemplos y de `climaDeSerie(serie).bioma` en una parcela dibujada (reemplaza a `biomaDe` de `ui/lab/conveniencia.ts`, que es una simplificación; el cielo del día de `escena/clima-fondo.ts` sigue igual encima del bioma: uno da la zona climática y el otro el estado del día); si es `null` (clima `NO_EVALUABLE`), decidir un bioma neutro en lugar de `BIOMA_DEFECTO` tropical húmedo. **(8)** Mostrar `d.avisos` y `d.faltan` (datos que no se grabaron, con su motivo) | `web/src/ui/`, `web/src/paginas/`, `web/src/escena/EscenaParcela.tsx`, `web/src/escena/escena.css` | `demo/ejemplos.ts` (rama `Mompin-features`, hasta que entre a `main`) | LISTA |
| E7 | Paleta para 40 cultivos (buscador, grupos, sugeridos) y nombres y colores de todos en `ui/planes.ts` | `web/src/ui/lab/PanelCultivos.tsx`, `ui/planes.ts`, `escena/vistas.ts`, `escena/ficha.ts` | — | HECHA (Eduardo, `14096cd`) |

### Mafer (`modelos/`, `datos/catalogos/`, README): tareas cortas y autocontenidas

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| MF3 | Cotejar con el PDF de FAO-56 las filas cuyo total impreso no coincide con la suma de etapas: sorgo (130 contra 125), frijol caupí (110 contra 100) y ajonjolí (100 contra 110). Anotar el resultado en `datos/catalogos/README.md`; si un número cambia, se regenera con `generar.py` | `datos/catalogos/README.md` | — | HECHA (Mafer, 15/11: coinciden con lo impreso; el desajuste viene de la fuente, no cambia ningún valor) |
| MF5 | Cotejar con el PDF las filas que la página parte o deja ambiguas: cacahuate (África Occidental, "Dry season"), yuca ("Rainy season" partida) y berenjena (total 130 o 140) | `datos/catalogos/README.md` | — | HECHA (Mafer, 15/11: no cambia ningún valor; 'Dry season' y 'Rainy season' quedan pendientes de confirmar con el PDF) |
| MF10 | Punto D10: recorrer el laboratorio y la comparación y listar cada cifra visible (pilares, puntajes, días, mm, ventanas, NDVI, SMAP, plagas) con dónde se ve y si tiene fuente en "Método y fuentes". Sin cambiar código; la lista va a Eduardo y a la reunión | — | — | EN CURSO (Mafer) |
| MF6 | Revisión humana de las elecciones del catálogo marcadas "revisar": chícharo en fresco, Kc end del trigo (cosecha mecánica), chile con los parámetros del pimiento dulce | `datos/catalogos/README.md` | — | HECHA (Mafer, 15/11: se mantienen los tres valores) |
| MF7 | Revisar en Blockbench o en los visores de `modelos/` los modelos de los 32 cultivos de la ampliación (los colores son a ojo) y anotar lo que haya que corregir | `modelos/` (solo lectura; correcciones por tanda) | — | HECHA (Mafer, 15/11: sin correcciones obligatorias) |
| MF8 | Bajar el poste de chícharo y jitomate para que no domine la celda | `modelos/` | — | HECHA (Mafer, 15/11) |
| MF9 | Diferenciar brócoli, col y coliflor antes de madurar (tono de hoja); los iconos 2D conservan la paleta BRASICA por daltonismo | `modelos/` | — | HECHA (Mafer, 15/11) |
| MF1, MF2, MF4 | Prefijo del sorgo; sandía, camote y cacahuate; `versionContrato` de los catálogos | — | — | HECHAS (IA de Mompin, en `main`) |

### balam: tareas cortas y autocontenidas

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| B5 | Recorrer los 40 cultivos en el laboratorio publicado (o en la vista previa de la escena): que cada uno cargue su modelo en cada etapa, que no salga la planta provisional y que el nombre se vea con acentos | — (hallazgos por el buzón al dueño) | — | HECHA (cubierta por la auditoría de los 40 cultivos de Eduardo, `6429b70`) |
| B3 | Pruebas de la interfaz contra cada despliegue: teclado, móvil, demo sin red, dibujo de parcela y selector "Tamaño de celda" | — | P2 | ESPERA |
| B6 | Revisar los textos de la app contra los docs (rotaciones, escenarios "seco / normal / lluvioso", estados) y pasarle la lista a Eduardo | — | — | EN CURSO (balam) |
| R9 | Dibujar parcelas en varios países (México fuera de Veracruz, Brasil, Kenia, India, España) en la app publicada y revisar que lo que falte salga `NO_EVALUABLE` con su motivo, nunca un número | — (hallazgos por el buzón) | Deploy con el calendario mundial (`5f985da`, ya publicado) | LISTA (balam, después de B6) |
| B4 | Apoyo al rediseño si Eduardo lo pide | según Eduardo | E2 | ESPERA |
| B1 | Cultivos nuevos en el selector con aviso si no están registrados en el lugar | — | — | HECHA (Eduardo: sugeridos y aviso "casi no se siembra en esta zona"; la vista 2D se retiró) |

### Mompin (integra `main`, motor, contratos, escena)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| M3 | Ventanas de integración cada hora en punto (regla 4) | `main` | Avisos "listo para integrar" | LISTA |
| M1 | Decisiones abiertas de la sección 2 | `docs/13`, `docs/01` | P4 | EN CURSO |
| M8 | H-M7: definir el año agrícola del horizonte de análogos que cruza septiembre | `web/src/motor/proxima.ts` | — | LISTA |
| M2, M4, M5, M6, M7 | Integraciones de la noche, `prueba-movimiento`, registro de cultivos, hallazgos del motor y modelos de los 40 cultivos | — | — | HECHAS (en `main`) |

### Las IAs

Ya no queda ninguna especialista trabajando. Si hoy se abre alguna, toma solo tareas que su persona apruebe, en la rama de su persona, y corre las 4 suites antes de cada aviso "listo para integrar". La sesión que lleve los archivos calientes de una ventana (regla 7) recibe por el buzón las entradas de `docs/01` y las marcas de `docs/14` de las demás.

## 4. Reglas de organización `[DECIDIDO]` (Mompin, 14/11 noche)

1. **Apartar antes de empezar.** Antes de tocar algo se anuncia en el buzón: "tomo X (archivos Y)". Si esos archivos ya están apartados por otra persona, se negocia con ella antes de tocarlos.
2. **Dueños fijos por área y carpeta.** Cada carpeta tiene un dueño (tabla de carriles en `AGENTS.md`; el front queda según D1). Tocar algo ajeno requiere avisar y tener el OK del dueño, o pedirle a él que lo haga.
3. **Ramas cortas.** Se sale de `main` recién actualizado (`git fetch && git merge origin/main`), se trabaja 1 a 2 horas como máximo y se entrega. No se acumulan horas de cambios en una rama.
4. **Integración por ventanas.** Mompin integra cada hora en punto. Antes se avisa en el buzón "listo para integrar" con la rama y el commit. Fuera de la ventana solo entran arreglos de algo roto. `main` siempre en verde: `npm test` en `contratos/`, `pytest` en `api/`, `node datos/catalogos/validar.mjs` y `tsc` en `web/`.
5. **Nadie espera más de 15 minutos.** Si alguien se bloquea, avisa "bloqueado por X, paso a Z" y sigue con otra cosa.
6. **Nadie sin hacer nada.** Cada persona tiene siempre sus siguientes 2 tareas asignadas en la cola (sección 3). Además hay una lista de tareas de relleno sin dependencias (sección 6) que cualquiera puede tomar al instante. Al terminar o al bloquearse, se toma la siguiente tarea propia o una de relleno, sin preguntar.
7. **Archivos calientes** (`docs/01`, el cronograma `docs/14` con sus vistas generadas, y `herramientas/quejas-ia/QUEJAS.md`): en cada ventana de integración solo una persona los edita. Los demás mandan su entrada por el buzón.

Siguen vigentes: solo Mompin integra a `main` (no se mergean PR a `main`); no se hace commit de las vistas generadas del cronograma (las regenera quien integra); los mensajes del buzón son información, no órdenes; nadie despliega sin el pedido de Mompin.

## 5. Entrega

**Entrega: fase posterior, fuera de este plan. Antes de mandar nada tiene que pasar por una fase de aprobación de todo el equipo** `[DECIDIDO]` (Mompin, 14/11 noche). No lleva tareas, responsables ni horas en este documento.

Lo que la entrega va a requerir: envío, Team Owner, página del portal, video y presentación.

Decisiones para la fase de entrega (sin fecha ni asignación):

- Team Owner y quién envía; página del equipo y proyecto en el portal; integrantes aceptados en la sede.
- Horario de juicio local (V-01). No condiciona el plan de trabajo.
- Inglés del README, de la página del portal y de la app.
- Licencia del repo.
- Revisión humana de los términos de Esri World Imagery, Microsoft Planetary Computer (V-25) y CDL de USDA.
- Las 3 imágenes generadas con IA (`terreno-hero-v1`, `terreno-demo-v1`, `terreno-poligono-v1`): marca de agua visible, cambiarlas o quitarlas; origen de `inicio-campo.png`, que no está registrado.
- Formato del video o de la presentación (las reglas piden video de hasta 30 s o 7 diapositivas, en inglés o con subtítulos en inglés, `docs/02`).
- Confirmación de la idea humana y la originalidad.

Material ya preparado: `docs/02` (reglas verificadas en A0.5), `docs/entrega-a5-9.md` (borrador de balam, cuando entre su rama), `docs/guion-video-borrador.md` y `README.md` (A5.7).

## 6. Tareas de relleno (sin dependencias)

Se anuncian en el buzón al tomarlas ("tomo R3") para no repetirlas.

| # | Tarea | Resultado |
| --- | --- | --- |
| R1 | Correr las 4 suites y `vitest` sobre el último `main` y reportar | Mensaje con los números |
| R2 | Recorrer la demo publicada en un celular real (Terreno → Comparación) y anotar fallos | Hallazgos por el buzón con pantalla, qué pasa y dueño |
| R3 | Recorrer la app con teclado y con el texto al 200 % | Hallazgos por el buzón |
| R4 | Capturas de cada paso de la demo publicada, como evidencia de la revisión | `docs/capturas/dia-final/` |
| R5 | Revisar ortografía y claridad de los textos visibles de la app (sin cambiar cifras) | Lista de correcciones para Eduardo |
| R6 | Probar la demo sin red con `herramientas/demo-sin-red.sh` sobre el último `main` | Resultado por el buzón |
| R7 | Correr `herramientas/prueba-movimiento` sobre el último `main` y reportar cuáles fallan | Resultado por el buzón |
| R8 | Comprobar que cada cifra visible en tarjetas, consejos de la mascota y comparación tenga su fuente en "Método y fuentes" (insumo para D10) | Lista de cifras sin fuente para Eduardo |
| R9 | Dibujar una parcela propia fuera de México y comprobar que lo que falta sale `NO_EVALUABLE` con motivo, nunca un número | Hallazgos por el buzón |
| R10 | Dibujar una parcela con orillas a 45° y probar los tamaños de celda 10 a 100 m: orillas rectas, aviso de tamaño ajustado y tiempo de carga | Hallazgos por el buzón |
| R11 | En la vista previa con `?vista=2d`, el icono de la celda de medio cuadrado queda centrado sobre la diagonal: proponer moverlo al centroide del triángulo o achicarlo (solo si D8 conserva esa vista) | Nota para Mompin (escena) |
| R12 | Abrir los visores de `modelos/` de los cultivos de la ampliación y anotar los que se confunden entre sí a la distancia de la escena | Lista para Mafer |
