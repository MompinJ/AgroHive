# 14 · Cronograma de actividades (por esfuerzo de IA)

Sin horas. Cada actividad se mide por **cuánta IA cuesta** hacerla bien, para repartir los cupos de cada integrante y decidir qué recortar. Los puntos de corte son **compuertas** (se cruzan cuando el entregable existe), no horarios.

## Escala de esfuerzo

| Nivel | Qué significa | Cupo de IA |
| --- | --- | --- |
| **XS** | Un prompt, resultado casi directo | Ligero |
| **S** | Una sesión corta, 1 a 3 iteraciones | Ligero |
| **M** | Sesión larga con iteración, pruebas y revisión humana | Medio |
| **L** | Varias sesiones; contexto grande del repo; integración con otras piezas | **Fuerte** |
| **XL** | Demasiado grande: **dividir** antes de empezar | Fuerte |

**Regla de cupos** (doc 09): reservar el cupo fuerte para lo crítico (motor y escena 3D); usar el cupo ligero para boilerplate, tipos, textos y configuración.

## Modelo de IA recomendado

La columna "Modelo IA" de cada actividad sugiere con qué nivel empezar. Es una guía, no una obligación: cada quien usa su herramienta (Claude, Cursor, ChatGPT) y elige el modelo equivalente de su plan.

| Modelo | Cuándo | Cupo | Qué actividades |
| --- | --- | --- | --- |
| **Haiku 5.5** | Tareas mecánicas o de texto corto, sin riesgo de que un error se propague | El más barato | Acta, reglas de entrega, medir requisitos, respaldo local, envío |
| **Sonnet 5.5** | Predeterminado: código de rutina, clientes de APIs, interfaz, textos, configuración, modelos voxel de cada etapa | Medio | La mayoría (33 actividades) |
| **Opus 5.5** | Lógica con muchas piezas que se afectan entre sí, contratos, integración y datos que se citan | Alto | Contratos, escenarios, pilares, ranking, catálogo de cultivos, cargador de modelos, integración front y API |
| **Fable 5.2** | Lo más difícil y crítico: si falla, se cae la demo. Gastarlo solo aquí | El más escaso | A2.6 (balance de agua) y A3.1 (escena 3D con relieve) |

Reglas de uso:
1. **Empezar por el modelo recomendado.** Subir de nivel solo si la actividad falla dos veces seguidas.
2. **Nunca bajar de Sonnet** en una actividad que produzca números científicos o parámetros agronómicos: un valor inventado es el error más caro de este proyecto.
3. **Los modelos no sustituyen la verificación humana** de fuentes y citas (V-20 a V-24, A1.5, A1.6).
4. **Reservar Fable y Opus para las actividades L y para los contratos**; usar Sonnet y Haiku para todo lo demás y ahorrar cupo.
5. Repartir entre las cuatro personas las actividades que piden Fable u Opus, para que los cupos de todos duren hasta la entrega.

## Áreas y reparto por actividad

**Decisión 14/11:** no se asignan roles por persona; el equipo se **divide las actividades**. Las áreas R1 a R4 de abajo solo orientan qué tipo de trabajo es cada actividad (columna "Rol" de las tablas) y en qué carpeta vive. Ramas: `balam`, `Mompin`, `Mafer`, `Eduardo`.

Cómo se reparte:
1. Cada quien toma actividades y escribe su nombre en el **Tablero de reparto** (al final de este documento), con su estado.
2. Respetar las dependencias: no se arranca una actividad cuyo requisito aún no existe, salvo que se acuerde un contrato provisional.
3. Repartir el **cupo fuerte de IA**: nadie debería llevar todas las actividades L. Eduardo, por ser dueño del servidor, toma las de despliegue (A0.4, A4.7).
4. Si alguien termina, toma la siguiente actividad libre del camino crítico antes que un extra.

| Área | Alcance | Carpeta principal |
| --- | --- | --- |
| **R1** Interfaz y 3D | React, mapa, polígono, paneles, selector, escena 3D, 2D | `web/` |
| **R2** Motor científico | Escenarios, balance de agua, pilares, ranking, explicaciones, pruebas | `web/src/motor/` |
| **R3** Datos y servidor | FastAPI, POWER, Open-Meteo, elevación, caché, catálogo de cultivos, despliegue | `api/`, `datos/` |
| **R4** Arte, integración y entrega | Modelos con `modelador-voxel`, paleta, iconos, README | `modelos/`, `docs/` |

Un archivo, un responsable. Los contratos (`contratos/`) los toca solo quien los propone, avisando al resto.

## Fases y compuertas

```text
F0 Arranque -> F1 Contratos y esqueleto -> F2 Datos y motor -> F3 Escena y selector
            -> F4 Integración y dashboard -> F5 Pulido y entrega
```

| Compuerta | Se cruza cuando... | Si no se cumple |
| --- | --- | --- |
| **C1 · Datos reales** | Una pantalla muestra lluvia diaria real de POWER para una coordenada | Simplificar el mapa; usar Open-Meteo directo |
| **C2 · Motor con datos** | El motor devuelve resultados por celda con datos reales y pasa pruebas básicas | Reducir a pilar hídrico solamente |
| **C3 · Escena viva** | Bloques 3D con relieve y estado coloreado desde el motor | Plan 2D y plantas procedurales |
| **C4 · Congelar funciones** | Ya no entran funciones nuevas | Recortar extras |
| **C5 · Congelar producto** | Solo errores y pulido | — |
| **C6 · Entrega lista** | Demo, README y envío listos | Respaldo local |

## F0 · Arranque

| ID | Actividad | Rol | Esfuerzo IA | Modelo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- | --- |
| A0.1 `[HECHO]` | Repo Git con 5 ramas y estructura de carpetas | Mompin | XS | Haiku | — | Repo remoto con `main` y 4 ramas |
| A0.2 `[HECHO]` | Documentación consolidada en `docs/` | Mompin | S | Haiku | — | `docs/` al día, registro en 01 |
| A0.3 pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche) | Acordar roles, cultivos iniciales y criterio de ranking (V-18, V-19) | Todos | XS | Haiku | — | Acta breve en 11 |
| A0.4 `[HECHO]` | Acceso SSH, firewall y hostname del servidor (V-15 a V-17) | R3 / Eduardo | S | Sonnet | — | `https://<host>/health` responde |
| A0.5 `[HECHO]` | Verificar reglas de entrega e IA (V-03, V-04) | R4 | XS | Haiku | — | Guías oficiales 2026 leídas en navegador; fuentes en docs/02 y 11. Cumplimiento pendiente en A5.7/A5.9; horario local V-01 |
| A0.6 `[HECHO]` | Consultar SIAP: cultivos y calendario del municipio; confirmar zona demo y milpa (V-20) | R3 | S | Sonnet | — | Zona y cultivos confirmados en 13; calendario de Isla en `calendario-local` con fuente (SIAP o INIFAP) |
| A0.7 `[HECHO]` | Verificar Open-Meteo estacional, CORS de POWER y acceso a elevación (V-21, V-22) | R3 | S | Sonnet | — | Parámetros probados con una llamada real, anotados en 04 |

## F1 · Contratos y esqueleto

| ID | Actividad | Rol | Esfuerzo IA | Modelo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- | --- |
| A1.1 `[HECHO]` | Contratos de datos (parcela, clima, plan, resultado) como JSON Schema y tipos TS | R2 + R3 | M | Opus | A0.3 | `contratos/` revisado por los 4 |
| A1.2 `[HECHO]` rutas P0 a P3, Worker inicializado desde la UI con confirmacion de respuesta y build verificados | Esqueleto `web/`: React + Vite + TS, Worker del motor, rutas P0 a P3 vacías | R1 | S | Sonnet | A1.1 | `npm run dev` abre las pantallas |
| A1.3 `[HECHO]` | Esqueleto `api/`: FastAPI, `/health`, OpenAPI, generación del cliente TS de las llamadas HTTP | R3 | S | Sonnet | A1.1 | Cliente TS generado compila; prueba de que los modelos de FastAPI respetan `contratos/` |
| A1.4 `[HECHO]` | Paleta compartida y primer modelo de prueba (cultivo 1, una etapa) | R4 | M | Sonnet | A0.3 | `.bbmodel` abre en Blockbench |
| A1.5 `[HECHO]` | Catálogo propio de cultivos (milpa: maíz, frijol, calabaza; más 3 a 5 si hay tiempo) sembrado desde EcoCrop y FAO-56: ciclo, etapas, Kc y umbrales con fuente | R3 | M | Opus | A0.3 | JSON con citas; vacíos como `NO_EVALUABLE` |
| A1.6 `[HECHO]` | Tabla de suelos (TAW por textura, FAO-56) | R3 | S | Sonnet | — | JSON con fuente |
| A1.7 `[HECHO]` | Contratos para el alcance mundial (13, "Alcance geográfico"): `calendario-local` con lugar genérico (país más id del lugar; la clave INEGI queda como un caso) y bloque opcional `lluviaSatelital` (IMERG vía POWER, en UTC) en `serie-clima` y `clima-escenario`; cambio compatible | R2 | S | Opus | A1.1 | `npm test` de `contratos/` en verde con un ejemplo fuera de México y uno con IMERG |

## F2 · Datos y motor (en paralelo)

| ID | Actividad | Rol | Esfuerzo IA | Modelo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- | --- |
| A2.1 `[HECHO]` | Cliente NASA POWER diario con caché y reintentos | R3 | M | Sonnet | A1.3 | `GET /api/clima` devuelve serie real (C1) |
| A2.2 `[HECHO]` | Respaldo Open-Meteo y estados `RESPALDO_HISTORICO` / `ERROR_DATOS` | R3 | S | Sonnet | A2.1 | Se activa al apagar POWER |
| A2.3 `[HECHO]` | Elevación por celda (tiles Terrarium o SRTM) y pendiente | R3 | M | Sonnet | A1.3 | `GET /api/elevacion` por polígono |
| A2.4 `[HECHO]` paquete conforme a contratos (clima 2005-10-01 a 2025-12-31, terreno, suelo, proxima temporada) sobre una parcela ficticia en Isla; el motor ya corre con el | Paquete de demo precargado (Isla, 2 ha, clima 2006 a 2025, elevación) | R3 | S | Sonnet | A2.1, A2.3 | Demo funciona sin internet |
| A2.5 `[HECHO]` 14/11 | Selección de escenarios seco / habitual / lluvioso (p10, p50, p90) | R2 | M | Opus | A1.1 | Años reales visibles y reproducibles |
| A2.6 `[HECHO]` 14/11 (prueba 2: la parte de erosión y pendiente pasa a A3.7) | ET0, ETc y balance de agua por bloque (cubeta) | R2 | **L** | Fable | A1.1, A1.5, A1.6 | Pruebas 1 a 5 de doc 05 en verde |
| A2.7 `[HECHO]` 14/11 | Pilar de déficit hídrico y estados de evaluabilidad | R2 | M | Opus | A2.6 | Métricas por rotación y escenario |
| A2.8 `[HECHO]` (c) `temporada_tipica`, 14/11 | Decisión: cómo se asigna clima a cada ciclo (doc 05, paso 2) | R2 + R3 | M | Opus | A2.1, A1.5 | Opción elegida registrada en 01 |
| A2.9 `[HECHO]` | Cuadrícula desde polígono (Turf.js) con tope de celdas | R1 | M | Sonnet | A1.2 | Polígono dibujado genera celdas |
| A2.10 `[HECHO]` | Mapa y dibujo de polígono libre (Leaflet) | R1 | M | Sonnet | A1.2 | El usuario dibuja y ve su parcela (P1) |
| A2.11 `[HECHO]` | Cultivos 1 a 3 completos, todas las etapas y estados de estrés | R4 | **L** | Opus | A1.4 | Modelos probados en la escena real (V-14) |
| A2.12 `[HECHO]` | Bloques de suelo por tipo y humedad | R4 | S | Sonnet | A1.4 | Variantes en `modelos/` |
| A2.13 `[HECHO]` 14/11: backend (Eduardo) y motor (Mompin): banda validada y comparada con los escenarios, y escenario de años análogos `EXPLORATORIO` (contratos 0.8.0); falta la interfaz (A4.9) | Capa "próxima temporada aproximada": anomalía del pronóstico estacional sobre la climatología, con respaldo estadístico (percentiles; sin tendencia, con advertencia); salida como banda de incertidumbre | R2 + R3 | M | Opus | A2.1, A2.5, A0.7 | Rango plausible por mes para la zona demo, horizonte de 6 meses, etiquetado como aproximado. Después del motor; no bloquea el MVP |
| A2.14 `[HECHO]` | Textura y pH estimados de la zona (ISRIC WCS u OpenLandMap) por script offline y servidos desde caché | R3 | M | Sonnet | A1.3, A0.7 | `GET /api/suelo` devuelve textura y pH con etiqueta `SUPUESTO`; respaldo manual (V-23) |
| A2.15 `[HECHO]` | Cliente OpenLandMap y comparación con ISRIC en `GET /api/suelo` (V-23: ambos servicios) | R3 | S | Sonnet | A2.14 | `GET /api/suelo` devuelve `estimaciones` de ISRIC y OpenLandMap con fuente y `estimacionUsada` |
| A2.16 (Mafer) `[HECHO]` | TAW por pedotransferencia de Saxton y Rawls (2006) para cualquier textura, desde arena, arcilla y materia orgánica | R3 / Mafer | M | Opus | A2.14, A1.6 | `agua.tawMmPorM` con `metodoTaw` y `retencion` (θsat, θFC, θWP), citado y `SUPUESTO`; prueba contra valores publicados del artículo |

Compuerta **C2** al terminar A2.1, A2.6 y A2.7. Estado 14/11: A2.1, A2.6 y A2.7 hechas; el motor devuelve resultados por celda con el paquete de demo real (A2.4: POWER, SoilGrids y Terrarium de Isla) y pasa las pruebas 1 a 5 de doc 05 (`web/src/motor/pruebas/c2.test.ts`). C2 cruzada: está en `main` y, desde A2.16, el suelo de Isla da TAW 122.3 mm/m por Saxton y Rawls (antes se usaba el franco del selector manual).

## F3 · Escena y selector

| ID | Actividad | Rol | Esfuerzo IA | Modelo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- | --- |
| A3.1 `[HECHO]` | Escena 3D con relieve (altura por bloque, `InstancedMesh`) | R1 | **L** | Fable | A2.3, A2.9 | Terreno 3D navegable (C3) |
| A3.2 `[HECHO]` | Cargador de `.bbmodel` con instancing por cultivo y etapa | R1 | **L** | Opus | A2.11 | Modelos del motor visibles en celdas |
| A3.3 `[HECHO]` | Estados visuales: color + icono + patrón, leyenda | R1 | M | Sonnet | A3.2 | Legible con daltonismo |
| A3.4 `[HECHO]` | Selector "what if": cultivo por ciclo, rotaciones R0 a R2, escenario | R1 | M | Sonnet | A2.7 | Cambiar cultivo invalida y recalcula; cada fecha sugerida explica por qué y de dónde sale (calendario local o "sin calendario"); cultivo no registrado en el lugar con aviso |
| A3.5 `[HECHO]` | Prueba crítica: R1 + ciclo 2 + seco muestra frijol con su estado | R1 + R2 | S | Sonnet | A3.4 | Prueba manual documentada |
| A3.6 `[HECHO]` | Modo 2D ligero con los mismos valores del motor | R1 | M | Sonnet | A2.7 | Selector sin recalcular ni descargar; ficha, leyenda compartida y fallback inicial sin WebGL verificados |
| A3.7 `[HECHO]` 14/11 (compatibilidad desde el calendario de Isla; protección del suelo por días de suelo desnudo; índice de erosión `NO_EVALUABLE` sin I30 ni C/LS con fuente) | Pilares 2 y 3 (compatibilidad de ciclo, erosión relativa) | R2 | **L** | Opus | A2.7 | Entran solo si los datos alcanzan |
| A3.8 `[HECHO]` con balam: ficha por celda en `web/src/escena/` (clic, toque, cursor, teclado y lista de celdas) | Tooltips y valores por bloque | R1 | S | Sonnet | A3.4 | Toque o hover muestra humedad, déficit, pendiente |
| A3.9 `[HECHO]` | Cultivos 4 en adelante, props y mascota | R4 | M | Sonnet | A2.11 | Extras según tiempo |

Compuerta **C3** al terminar A3.1 y A3.2.

## F4 · Integración y dashboard

| ID | Actividad | Rol | Esfuerzo IA | Modelo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- | --- |
| A4.1 `[HECHO]` series del Worker, graficas y tabla verificadas | Dashboard: gráficas de lluvia, demanda y balance (Recharts) | R1 | M | Sonnet | A2.7 | Gráficas reales del escenario |
| A4.2 `[HECHO]` 14/11 (corre B con déficit y exceso de agua; A3.7 suma los pilares 2 y 3) | Ranking de rotaciones por robustez: criterio B `[DECIDIDO]` (puntaje + arrepentimiento minimax), respaldo A si A3.7 no llega | R2 | M | Opus | A2.7 (y A3.7 para B) | Tabla ordenada con 3 o más rotaciones; pesos y criterio declarados |
| A4.3 `[HECHO]` motor y tarjetas visibles en laboratorio y comparacion | Tarjetas de rotación: por qué, evidencia, beneficios, huecos, riesgos | R2 + R1 | M | Sonnet | A4.2 | Plantilla sin LLM funcionando |
| A4.4 pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche) | Redacción con LLM sobre números ya calculados (opcional) | R2 | S | Sonnet | A4.3 | Con respaldo en plantilla |
| A4.5 `[HECHO]` | Pantalla de método, fuentes y advertencias (A1, A3) | R1 | S | Sonnet | A4.3 | Fuentes NASA citadas en la interfaz |
| A4.6 `[HECHO]` 14/11 noche: P0 a P3 de la demo de Isla en Chrome sin salida (año 2016 EVALUABLE; comparación criterio B con R4, R2 y R1 evaluables). API local sin red: clima 7397 días, suelo, elevación, próxima y cultivos. El despliegue de ese código quedó en A4.7 | Conectar front y API (cliente generado, estados de carga y error) | R1 + R3 | M | Opus | A2.1, A3.4 | Flujo P0 a P3 con datos reales |
| A4.7 `[HECHO]` 14/11 noche: `https://64-23-143-102.sslip.io` en `23f8a53`. `/health` con `versionContrato` 0.12.2, front 200, `/api/calendario` y `/api/cultivos` 200, `mediworks.mx` 200. `actualizar-servidor.sh` corrido en el droplet. Redesplegado después: el 14/11 a las 23:10 `/health` respondía `f56450c` y contratos 0.13.0, con `/medir.html` servido | Despliegue en el droplet (nginx, systemd, SSL) | R3 / Eduardo | M | Sonnet | A0.4 | URL pública con la demo |
| A4.8 `[HECHO]` 14/11 noche: `GET /api/smap` publico (Isla, 2024-06-01 a 2024-06-03) responde 200 `EVALUABLE` en unos 20 s. El 2024-06-03 trae humedad real 0.1432 m3/m3 (AM 0.1402, PM 0.1463, granulo `SMAP_L3_SM_P_20240603_R19240_001.h5`). El 1 y el 2 tienen granulo pero sin recuperacion valida (`NO_EVALUABLE`; no se inventa). Contraste, fuera del ranking. `web/src` no llama a SMAP. El token queda solo en el entorno del servicio | Extras NASA: SMAP, GPM o MODIS vía `earthaccess` (solo si aportan) | R3 | **L** | Opus | A2.1 | Un dataset adicional integrado de verdad |
| A4.9 `[HECHO]` | Interfaz de "próxima temporada aproximada": banda de incertidumbre y aviso visible de que no es predicción | R1 | S | Sonnet | A2.13, A3.4 | La banda aparece en el dashboard y se puede apagar |
| A4.10 `[HECHO]` `lluviaSatelital` en `GET /api/clima` y en el paquete de demo (7 397 dias, ninguno en -999 hasta 2025-12-31); evidencia, sin tocar el balance | Lluvia GPM IMERG vía NASA POWER (`IMERG_PRECTOT` con `time-standard=UTC`, sin cuenta Earthdata) en `GET /api/clima` y en el paquete de demo, como **evidencia**: no entra al balance ni cambia los escenarios. Prototipo, hallazgos y encargo en `features/imerg/` y `features/encargos/eduardo-datos-globales.md` | R3 | S | Sonnet | A2.1, A1.7 | Serie IMERG con fuente y estándar de hora; `-999` como `null`; prueba con respuesta guardada; paquete de demo regenerado |
| A4.11 `[HECHO]` ORNL DAAC no respondio (502, 503). La serie sale de Microsoft Planetary Computer, MOD13Q1 V061, validada contra ORNL en 4 fechas. Cache, limites del pixel y paquete completo en `datos/demo/respuestas/ndvi.json`. Cita del producto: doi:10.5067/MODIS/MOD13Q1.061. El schema traido en este merge (contratos 0.12.2) cita Planetary Computer, coleccion `modis-13Q1-061`; ORNL queda como respaldo que no se llama en vivo | NDVI de MODIS (MOD13Q1, 250 m, 16 días) por punto, como evidencia de los años de escenario; no entra al ranking. El servicio previsto era ORNL DAAC; se sustituyo porque no respondia | R3 | S | Sonnet | A1.3, A1.7 | `GET /api/ndvi` con caché, cita del producto y el límite del píxel (250 m, más grande que la parcela) declarado |
| A4.12 `[HECHO]` 14/11 noche: Eduardo decidió hacerla sin esperar a C5 porque es aditiva (la interfaz no la llama, no toca motor ni paquete de demo). `GET /api/ee-uu/cdl` (USDA NASS CDL por CropScape, 2008 a 2025, pixel de 30 m) y `GET /api/ee-uu/ssurgo` (USDA NRCS SSURGO por Soil Data Access, componente dominante y agua disponible a 100 cm). Parcela de prueba en Iowa (-93.4, 42.05): CDL da maíz y soya alternados de 2014 a 2025; SSURGO da Webster clay loam con 180 mm a 100 cm. Fuera de EE. UU., `NO_EVALUABLE`. 13 pruebas con respuestas reales; schema propuesto a Mompin en `api/propuestas-contrato/ee-uu.schema.json` | Extra de fase 2, después de C5: fuentes regionales de EE. UU. cuando la coordenada cae ahí: CDL (rotación real por año, F8) primero y SSURGO después | R3 | **L** | Opus | A4.6 | Parcela de prueba en EE. UU. con su rotación real de CDL, con fuente |
| A4.13 `[HECHO]` `GET /api/calendario`. Isla (18.03, -95.53) devuelve SIAP/INIFAP. Iowa (42, -93.5) devuelve maiz de temporal de GGCMI: dia 133 (13 de mayo) y la madurez en la nota de la fuente, doi:10.5281/zenodo.5062513. Frijol `NO_EVALUABLE`: ni Zenodo ni el NetCDF dicen que `bea_rf` sea frijol. Calabaza y chile `NO_EVALUABLE`. En Mexico, fuera de Isla, no se usa GGCMI | Después de C4: calendario de siembra de respaldo fuera de México con GGCMI fase 3 (Jägermeyr et al. 2021, Nature Food 2: 873-885; datos doi:10.5281/zenodo.5062513, CC BY 4.0, 0.5°): siembra y madurez de temporal para maíz (`mai_rf`) y frijol (`bea_rf`, `[VERIFICAR]` que sea frijol), servido como `calendario-local` con su fuente. Calabaza y chile quedan `NO_EVALUABLE`; en México siguen mandando SIAP e INIFAP | R3 | M | Opus | A1.7, A4.6 (C4) | Una coordenada fuera de México devuelve la ventana de siembra del maíz con fuente GGCMI; en Isla sigue la de SIAP/INIFAP |

Compuerta **C4** al terminar A4.6.

## F5 · Pulido y entrega

| ID | Actividad | Rol | Esfuerzo IA | Modelo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- | --- |
| A5.1 `[HECHO]` con Mafer: transición por etapa, escala al crecer y viento leve opcional en `web/src/escena/`; sin animación con reducir movimiento. Además (Mompin): lluvia del día desde `serieBalance`, con mm y fuente | Animaciones mínimas (cambio de modelo por etapa) y deseables (escala, viento) | R1 + R4 | M | Sonnet | A3.2 | Transiciones suaves, opción de reducir movimiento |
| A5.2 `[HECHO]` | Slider de meses | R1 | M | Sonnet | A3.4 | Control diario/mensual desde la serie del motor; reproducción con pausa, sin simular ni acumular consultas; 2D/3D y lluvia comparten datos |
| A5.3 `[HECHO]` | Móvil y accesibilidad (táctil, teclado) | R1 | M | Sonnet | A4.6 | Cinco pantallas a 320/720/1440 px con texto base al 200%, teclado, foco estable, movimiento reducido y axe; lector de pantalla real pendiente de validación humana |
| A5.4 `[HECHO]` 14/11 noche: medido con `herramientas/medir-escena/medir.mjs` (518 celdas, bloques de 24 cubos, misma escena que `main`). GPU real (Apple M5 Max, WebGL2): 114.8 cuadros/s con maíz en madurez y 105.1 con la mezcla de 4 cultivos; sin GPU (SwiftShader): 9.4 cuadros/s en ambos; 191 416 triángulos, 5 a 8 draw calls, primera escena en 0.3 a 1.2 s; pérdida y recuperación del contexto WebGL probadas sin errores. Cifras y límites en `docs/06` y `docs/10`; evidencia en `docs/capturas/medicion-a5-4/`. No se midió un celular ni una laptop modesta física (queda `/medir.html` para hacerlo) y en GPU real el reposo no llega siempre a 0 cuadros (observación para Mompin) | Medición de requisitos mínimos y fallback WebGL | R1 | S | Haiku | A3.6 | Cifra documentada para jueces |
| A5.5 `[HECHO]` 14/11 (`web/src/motor/pruebas/regresion.test.ts` contra `regresion/demo-isla.json`) | Pruebas de regresión del motor y de contratos | R2 | M | Sonnet | A4.2 | Suite en verde |
| A5.7 `[EN CURSO]` pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche) | README con método, fuentes, límites, licencias y declaración de IA | R4 | S | Sonnet | A4.5 | README completo |
| A5.8 `[HECHO]` 14/11 noche, segunda pasada: API con `herramientas/demo-sin-red.sh` y Chrome headless con proxy inválido. P0 a P3 y método de la demo de Isla sin peticiones externas; NDVI del paquete 200; SMAP 503 sin token; clima lejano 503. Capturas en `docs/capturas/noche-14/`. No se apagó el wifi. El mapa de polígono pide teselas de Esri | Respaldo local sin internet y capturas | R3 + R4 | S | Haiku | A2.4 | Demo corre con la red apagada |
| A5.9 pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche); el envío se hace solo cuando todos digan que están satisfechos | Envío final según reglas oficiales | R4 | XS | Haiku | A5.7 | Entrega confirmada (C6) |

Video y presentación se definen al final, cuando el front esté conforme: quedan fuera del tablero, sin asignar y fuera del reparto y de los porcentajes `[DECIDIDO]` (Mompin, 14/11; ver 13). No están canceladas para el equipo. En el carril de Balam permanecen canceladas por su petición expresa; no se retoman sin una nueva indicación suya. Esto no cambia los requisitos externos del evento.

## Fase de revisión `[DECIDIDO]` (Mompin, 14/11 noche)

El desarrollo de funciones terminó: el equipo entra en **fase de revisión**. Ahora se revisa y se valida lo que ya está en `main`, **sobre todo el frontend** (cada pantalla del recorrido P0 a P3, la vista 2D y 3D, el dashboard, las tarjetas, el método, móvil y teclado), contra lo que entrega el motor y contra las reglas oficiales (`docs/02`).

- Las cuatro actividades que quedaban (A0.3, A4.4, A5.7 y A5.9) quedan **pospuestas hasta el final**, con su estado de siempre y la nota en su fila. Video y presentación (A5.6) siguen fuera del tablero y se definen al final.
- Cada hallazgo se avisa por el buzón con la pantalla, qué pasa, quién es el dueño y su estado; se arregla en la rama del dueño y entra a `main` en verde.
- **El envío (A5.9) se hace solo cuando todos digan que están satisfechos.**
- Día final (15/11): cola por persona, decisiones abiertas, horas límite y reglas de organización en [16](16-PLAN-DIA-FINAL.md). Este documento sigue siendo la fuente de las marcas de cada actividad.

## Fuera del tablero hasta el final

| ID | Actividad | Estado | Nota |
| --- | --- | --- | --- |
| A5.6 | Guion, video, presentación y ensayo | Se define al final | Cuando el front esté conforme (Mompin, 14/11); sin asignar y fuera del reparto y de los porcentajes |

## Camino crítico

`A1.1 -> A2.1 -> A2.6 -> A2.7 -> A3.4 -> A4.6 -> A5.9`

La escena 3D (`A2.9 -> A3.1 -> A3.2`) va en paralelo y también es crítica para la demo. Si cualquiera se atrasa, activar el plan de recorte.

## Plan de recorte (de lo que más duele a lo que menos)

1. **No sacrificar:** trazabilidad NASA, límites honestos, 3 o más rotaciones, peor caso, entrega.
2. Quitar extras de A4.12 (A4.11, A4.8, A3.9 y A5.2 ya están hechas: no se recortan salvo que fallen).
3. Pilares 2 y 3 (A3.7): quedarse solo con el hídrico.
4. 3D en problemas: plan 2D y plantas procedurales con cajas.
5. Polígono libre en problemas: parcela demo fija más el polígono como "vista previa".

## Esfuerzo por área (referencial, sin las actividades añadidas el 14/11 tarde)

| Rol | Actividades L (cupo fuerte) | M | S/XS |
| --- | --- | --- | --- |
| R1 | A3.1, A3.2 | 9 | 4 |
| R2 | A2.6, A3.7 | 7 | 2 |
| R3 | A4.8 | 6 | 6 |
| R4 | A2.11 | 5 | 5 |

R1 y R2 concentran el cupo fuerte. R3 y R4 deben reservar tiempo para apoyarlos cuando terminen lo suyo.

## Tablero de reparto

Una fila por actividad tomada. Al tomarla, anotar nombre y estado; al terminar, cambiar a `HECHO`. Estados: `EN CURSO`, `BLOQUEADO`, `HECHO`.

Reparto inicial (14/11), ajustado a los cupos de IA de cada quien. Mompin administra `main`, integra las ramas de cada quien (por ventanas, ver 16) y lleva lo más pesado porque tiene el cupo mayor (Claude Max).

| Responsable | Rama | Herramientas de IA | Actividades | Primera tarea |
| --- | --- | --- | --- | --- |
| **Mompin** | `Mompin` | Claude Max (Fable, Opus, Sonnet) | A1.1 `[HECHO]`, A2.5 `[HECHO]`, A2.6 `[HECHO]`, A2.7 `[HECHO]`, A2.8 `[HECHO]`, A3.1 `[HECHO]`, A3.2 `[HECHO]`, A4.2 `[HECHO]`, A4.6, A2.13 (parte del motor) `[HECHO]`, A3.7 `[HECHO]`, A5.5 `[HECHO]`, A3.8 (con balam) `[HECHO]`, A5.1 (con Mafer) `[HECHO]`; integra y administra `main`, A1.7 | A1.1 (contratos con ejemplos) |
| **Eduardo** | `Eduardo` | Cursor, Claude (20), otra de 20 | A0.4, A0.7, A1.3, A2.1, A2.2, A2.3, A2.4, A2.14, A2.15, A2.13 (parte del backend), A4.6 (cliente de la API, con balam), A4.7, A4.8, A4.10, A4.11, A4.12, A4.13 (después de C4), A5.8, A5.4 | A0.4 y A0.7 (servidor y APIs) |
| **Mafer** | `Mafer` | Claude (20), ChatGPT Go, Gemini Pro, Copilot | A0.6 `[HECHO]`, A1.4 `[HECHO]`, A1.5 `[HECHO]`, A1.6 `[HECHO]`, A2.16 `[HECHO]`, A2.11 `[HECHO]`, A2.12 `[HECHO]`, A3.3 `[HECHO]`, A3.9 `[HECHO]`, A5.7 `[EN CURSO]` | A1.4 (paleta y primer modelo del maíz) |
| **balam** | `balam` | Codex (20, con 3 resets) | A0.5, A1.2, A2.9, A2.10, A3.4, A3.5, A3.6, A4.1, A4.3, A4.4, A4.5, A4.9, A5.2, A5.3, A5.9 | A1.2 (esqueleto web con datos falsos) |

Cada actividad se marca en este documento con su estado (`EN CURSO`, `BLOQUEADO`, `HECHO`) al lado del ID. Si alguien termina, toma la siguiente actividad libre del camino crítico antes que un extra.

Notas sobre cupos: Mompin concentra las actividades de Fable y Opus (A2.6, A3.1, A1.1, A2.5, A2.7, A2.8, A4.2, A4.6, A3.2). Eduardo y Mafer usan Claude de 20 para las actividades de Opus de su lista (A1.5, A2.11, A4.8, A2.13) y Sonnet para lo demás. balam, con Codex, usa su modelo más fuerte para A3.4 y A4.6 y el estándar para el resto; sus 3 resets se reservan para el tramo de integración.

<!-- estado-por-persona:inicio -->

## Estado por persona

Generado por `herramientas/cronograma.py` desde las marcas de las tablas de fase de este documento. **No se edita a mano**: marca la actividad en su fila (`[HECHO]`, `[EN CURSO]`, `[BLOQUEADO]`) y corre el script. Sin marca = pendiente. Misma información en `docs/cronograma.html` y en la nota de Obsidian `Cronograma`.

| Persona | Hechas | En curso | Bloqueadas | Pendientes | Avance |
| --- | --- | --- | --- | --- | --- |
| **Mompin** | 17 | 0 | 0 | 0 | 100 % de 17 |
| **Eduardo** | 19 | 0 | 0 | 0 | 100 % de 19 |
| **Mafer** | 9 | 1 | 0 | 0 | 90 % de 10 |
| **balam** | 13 | 0 | 0 | 2 | 87 % de 15 |

### Mompin

| ID | Actividad | Estado | Nota |
| --- | --- | --- | --- |
| A0.1 | Repo Git con 5 ramas y estructura de carpetas | HECHO |  |
| A0.2 | Documentación consolidada en docs/ | HECHO |  |
| A1.1 | Contratos de datos (parcela, clima, plan, resultado) como JSON Schema y tipos TS | HECHO |  |
| A1.7 | Contratos para el alcance mundial (13, "Alcance geográfico"): calendario-local con lugar genérico (país más id del lugar; la clave INEGI queda como un caso) y bloque opcional lluviaSatelital (IMERG vía POWER, en UTC) en serie-clima y clima-escenario; cambio compatible | HECHO |  |
| A2.5 | Selección de escenarios seco / habitual / lluvioso (p10, p50, p90) | HECHO | 14/11 |
| A2.6 | ET0, ETc y balance de agua por bloque (cubeta) | HECHO | 14/11 (prueba 2: la parte de erosión y pendiente pasa a A3.7) |
| A2.7 | Pilar de déficit hídrico y estados de evaluabilidad | HECHO | 14/11 |
| A2.8 | Decisión: cómo se asigna clima a cada ciclo (doc 05, paso 2) | HECHO | (c) `temporada_tipica`, 14/11 |
| A2.13 | Capa "próxima temporada aproximada": anomalía del pronóstico estacional sobre la climatología, con respaldo estadístico (percentiles; sin tendencia, con advertencia); salida como banda de incertidumbre | HECHO | 14/11: backend (Eduardo) y motor (Mompin): banda validada y comparada con los escenarios, y escenario de años análogos `EXPLORATORIO` (contratos 0.8.0); falta la interfaz (A4.9) |
| A3.1 | Escena 3D con relieve (altura por bloque, InstancedMesh) | HECHO |  |
| A3.2 | Cargador de .bbmodel con instancing por cultivo y etapa | HECHO |  |
| A3.7 | Pilares 2 y 3 (compatibilidad de ciclo, erosión relativa) | HECHO | 14/11 (compatibilidad desde el calendario de Isla; protección del suelo por días de suelo desnudo; índice de erosión `NO_EVALUABLE` sin I30 ni C/LS con fuente) |
| A3.8 | Tooltips y valores por bloque | HECHO | con balam: ficha por celda en `web/src/escena/` (clic, toque, cursor, teclado y lista de celdas) |
| A4.2 | Ranking de rotaciones por robustez: criterio B [DECIDIDO] (puntaje + arrepentimiento minimax), respaldo A si A3.7 no llega | HECHO | 14/11 (corre B con déficit y exceso de agua; A3.7 suma los pilares 2 y 3) |
| A4.6 | Conectar front y API (cliente generado, estados de carga y error) | HECHO | 14/11 noche: P0 a P3 de la demo de Isla en Chrome sin salida (año 2016 EVALUABLE; comparación criterio B con R4, R2 y R1 evaluables). API local sin red: clima 7397 días, suelo, elevación, próxima y cultivos. El despliegue de ese código quedó en A4.7 |
| A5.1 | Animaciones mínimas (cambio de modelo por etapa) y deseables (escala, viento) | HECHO | con Mafer: transición por etapa, escala al crecer y viento leve opcional en `web/src/escena/`; sin animación con reducir movimiento. Además (Mompin): lluvia del día desde `serieBalance`, con mm y fuente |
| A5.5 | Pruebas de regresión del motor y de contratos | HECHO | 14/11 (`web/src/motor/pruebas/regresion.test.ts` contra `regresion/demo-isla.json`) |

### Eduardo

| ID | Actividad | Estado | Nota |
| --- | --- | --- | --- |
| A0.4 | Acceso SSH, firewall y hostname del servidor (V-15 a V-17) | HECHO |  |
| A0.7 | Verificar Open-Meteo estacional, CORS de POWER y acceso a elevación (V-21, V-22) | HECHO |  |
| A1.3 | Esqueleto api/: FastAPI, /health, OpenAPI, generación del cliente TS de las llamadas HTTP | HECHO |  |
| A2.1 | Cliente NASA POWER diario con caché y reintentos | HECHO |  |
| A2.2 | Respaldo Open-Meteo y estados RESPALDO_HISTORICO / ERROR_DATOS | HECHO |  |
| A2.3 | Elevación por celda (tiles Terrarium o SRTM) y pendiente | HECHO |  |
| A2.4 | Paquete de demo precargado (Isla, 2 ha, clima 2006 a 2025, elevación) | HECHO | paquete conforme a contratos (clima 2005-10-01 a 2025-12-31, terreno, suelo, proxima temporada) sobre una parcela ficticia en Isla; el motor ya corre con el |
| A2.13 | Capa "próxima temporada aproximada": anomalía del pronóstico estacional sobre la climatología, con respaldo estadístico (percentiles; sin tendencia, con advertencia); salida como banda de incertidumbre | HECHO | 14/11: backend (Eduardo) y motor (Mompin): banda validada y comparada con los escenarios, y escenario de años análogos `EXPLORATORIO` (contratos 0.8.0); falta la interfaz (A4.9) |
| A2.14 | Textura y pH estimados de la zona (ISRIC WCS u OpenLandMap) por script offline y servidos desde caché | HECHO |  |
| A2.15 | Cliente OpenLandMap y comparación con ISRIC en GET /api/suelo (V-23: ambos servicios) | HECHO |  |
| A4.6 | Conectar front y API (cliente generado, estados de carga y error) | HECHO | 14/11 noche: P0 a P3 de la demo de Isla en Chrome sin salida (año 2016 EVALUABLE; comparación criterio B con R4, R2 y R1 evaluables). API local sin red: clima 7397 días, suelo, elevación, próxima y cultivos. El despliegue de ese código quedó en A4.7 |
| A4.7 | Despliegue en el droplet (nginx, systemd, SSL) | HECHO | 14/11 noche: `https://64-23-143-102.sslip.io` en `23f8a53`. `/health` con `versionContrato` 0.12.2, front 200, `/api/calendario` y `/api/cultivos` 200, `mediworks.mx` 200. `actualizar-servidor.sh` corrido en el droplet. Redesplegado después: el 14/11 a las 23:10 `/health` respondía `f56450c` y contratos 0.13.0, con `/medir.html` servido |
| A4.8 | Extras NASA: SMAP, GPM o MODIS vía earthaccess (solo si aportan) | HECHO | 14/11 noche: `GET /api/smap` publico (Isla, 2024-06-01 a 2024-06-03) responde 200 `EVALUABLE` en unos 20 s. El 2024-06-03 trae humedad real 0.1432 m3/m3 (AM 0.1402, PM 0.1463, granulo `SMAP_L3_SM_P_20240603_R19240_001.h5`). El 1 y el 2 tienen granulo pero sin recuperacion valida (`NO_EVALUABLE`; no se inventa). Contraste, fuera del ranking. `web/src` no llama a SMAP. El token queda solo en el entorno del servicio |
| A4.10 | Lluvia GPM IMERG vía NASA POWER (IMERG_PRECTOT con time-standard=UTC, sin cuenta Earthdata) en GET /api/clima y en el paquete de demo, como evidencia: no entra al balance ni cambia los escenarios. Prototipo, hallazgos y encargo en features/imerg/ y features/encargos/eduardo-datos-globales.md | HECHO | `lluviaSatelital` en `GET /api/clima` y en el paquete de demo (7 397 dias, ninguno en -999 hasta 2025-12-31); evidencia, sin tocar el balance |
| A4.11 | NDVI de MODIS (MOD13Q1, 250 m, 16 días) por punto, como evidencia de los años de escenario; no entra al ranking. El servicio previsto era ORNL DAAC; se sustituyo porque no respondia | HECHO | ORNL DAAC no respondio (502, 503). La serie sale de Microsoft Planetary Computer, MOD13Q1 V061, validada contra ORNL en 4 fechas. Cache, limites del pixel y paquete completo en `datos/demo/respuestas/ndvi.json`. Cita del producto: doi:10.5067/MODIS/MOD13Q1.061. El schema traido en este merge (contratos 0.12.2) cita Planetary Computer, coleccion `modis-13Q1-061`; ORNL queda como respaldo que no se llama en vivo |
| A4.12 | Extra de fase 2, después de C5: fuentes regionales de EE. UU. cuando la coordenada cae ahí: CDL (rotación real por año, F8) primero y SSURGO después | HECHO | 14/11 noche: Eduardo decidió hacerla sin esperar a C5 porque es aditiva (la interfaz no la llama, no toca motor ni paquete de demo). `GET /api/ee-uu/cdl` (USDA NASS CDL por CropScape, 2008 a 2025, pixel de 30 m) y `GET /api/ee-uu/ssurgo` (USDA NRCS SSURGO por Soil Data Access, componente dominante y agua disponible a 100 cm). Parcela de prueba en Iowa (-93.4, 42.05): CDL da maíz y soya alternados de 2014 a 2025; SSURGO da Webster clay loam con 180 mm a 100 cm. Fuera de EE. UU., `NO_EVALUABLE`. 13 pruebas con respuestas reales; schema propuesto a Mompin en `api/propuestas-contrato/ee-uu.schema.json` |
| A4.13 | Después de C4: calendario de siembra de respaldo fuera de México con GGCMI fase 3 (Jägermeyr et al. 2021, Nature Food 2: 873-885; datos doi:10.5281/zenodo.5062513, CC BY 4.0, 0.5°): siembra y madurez de temporal para maíz (mai_rf) y frijol (bea_rf, [VERIFICAR] que sea frijol), servido como calendario-local con su fuente. Calabaza y chile quedan NO_EVALUABLE; en México siguen mandando SIAP e INIFAP | HECHO | `GET /api/calendario`. Isla (18.03, -95.53) devuelve SIAP/INIFAP. Iowa (42, -93.5) devuelve maiz de temporal de GGCMI: dia 133 (13 de mayo) y la madurez en la nota de la fuente, doi:10.5281/zenodo.5062513. Frijol `NO_EVALUABLE`: ni Zenodo ni el NetCDF dicen que `bea_rf` sea frijol. Calabaza y chile `NO_EVALUABLE`. En Mexico, fuera de Isla, no se usa GGCMI |
| A5.4 | Medición de requisitos mínimos y fallback WebGL | HECHO | 14/11 noche: medido con `herramientas/medir-escena/medir.mjs` (518 celdas, bloques de 24 cubos, misma escena que `main`). GPU real (Apple M5 Max, WebGL2): 114.8 cuadros/s con maíz en madurez y 105.1 con la mezcla de 4 cultivos; sin GPU (SwiftShader): 9.4 cuadros/s en ambos; 191 416 triángulos, 5 a 8 draw calls, primera escena en 0.3 a 1.2 s; pérdida y recuperación del contexto WebGL probadas sin errores. Cifras y límites en `docs/06` y `docs/10`; evidencia en `docs/capturas/medicion-a5-4/`. No se midió un celular ni una laptop modesta física (queda `/medir.html` para hacerlo) y en GPU real el reposo no llega siempre a 0 cuadros (observación para Mompin) |
| A5.8 | Respaldo local sin internet y capturas | HECHO | 14/11 noche, segunda pasada: API con `herramientas/demo-sin-red.sh` y Chrome headless con proxy inválido. P0 a P3 y método de la demo de Isla sin peticiones externas; NDVI del paquete 200; SMAP 503 sin token; clima lejano 503. Capturas en `docs/capturas/noche-14/`. No se apagó el wifi. El mapa de polígono pide teselas de Esri |

### Mafer

| ID | Actividad | Estado | Nota |
| --- | --- | --- | --- |
| A0.6 | Consultar SIAP: cultivos y calendario del municipio; confirmar zona demo y milpa (V-20) | HECHO |  |
| A1.4 | Paleta compartida y primer modelo de prueba (cultivo 1, una etapa) | HECHO |  |
| A1.5 | Catálogo propio de cultivos (milpa: maíz, frijol, calabaza; más 3 a 5 si hay tiempo) sembrado desde EcoCrop y FAO-56: ciclo, etapas, Kc y umbrales con fuente | HECHO |  |
| A1.6 | Tabla de suelos (TAW por textura, FAO-56) | HECHO |  |
| A2.11 | Cultivos 1 a 3 completos, todas las etapas y estados de estrés | HECHO |  |
| A2.12 | Bloques de suelo por tipo y humedad | HECHO |  |
| A2.16 | TAW por pedotransferencia de Saxton y Rawls (2006) para cualquier textura, desde arena, arcilla y materia orgánica | HECHO | (Mafer) `[HECHO]` |
| A3.3 | Estados visuales: color + icono + patrón, leyenda | HECHO |  |
| A3.9 | Cultivos 4 en adelante, props y mascota | HECHO |  |
| A5.7 | README con método, fuentes, límites, licencias y declaración de IA | EN CURSO | pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche) |

### balam

| ID | Actividad | Estado | Nota |
| --- | --- | --- | --- |
| A0.5 | Verificar reglas de entrega e IA (V-03, V-04) | HECHO |  |
| A1.2 | Esqueleto web/: React + Vite + TS, Worker del motor, rutas P0 a P3 vacías | HECHO | rutas P0 a P3, Worker inicializado desde la UI con confirmacion de respuesta y build verificados |
| A2.9 | Cuadrícula desde polígono (Turf.js) con tope de celdas | HECHO |  |
| A2.10 | Mapa y dibujo de polígono libre (Leaflet) | HECHO |  |
| A3.4 | Selector "what if": cultivo por ciclo, rotaciones R0 a R2, escenario | HECHO |  |
| A3.5 | Prueba crítica: R1 + ciclo 2 + seco muestra frijol con su estado | HECHO |  |
| A3.6 | Modo 2D ligero con los mismos valores del motor | HECHO |  |
| A4.1 | Dashboard: gráficas de lluvia, demanda y balance (Recharts) | HECHO | series del Worker, graficas y tabla verificadas |
| A4.3 | Tarjetas de rotación: por qué, evidencia, beneficios, huecos, riesgos | HECHO | motor y tarjetas visibles en laboratorio y comparacion |
| A4.4 | Redacción con LLM sobre números ya calculados (opcional) | PENDIENTE | pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche) |
| A4.5 | Pantalla de método, fuentes y advertencias (A1, A3) | HECHO |  |
| A4.9 | Interfaz de "próxima temporada aproximada": banda de incertidumbre y aviso visible de que no es predicción | HECHO |  |
| A5.2 | Slider de meses | HECHO |  |
| A5.3 | Móvil y accesibilidad (táctil, teclado) | HECHO |  |
| A5.9 | Envío final según reglas oficiales | PENDIENTE | pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche); el envío se hace solo cuando todos digan que están satisfechos |

### Equipo (sin responsable único)

| ID | Actividad | Estado | Nota |
| --- | --- | --- | --- |
| A0.3 | Acordar roles, cultivos iniciales y criterio de ranking (V-18, V-19) | PENDIENTE | pospuesta hasta el final: fase de revisión (Mompin, 14/11 noche) |

<!-- estado-por-persona:fin -->

## Cómo mantener este documento

- Marcar cada actividad con `[HECHO]`, `[EN CURSO]` o `[BLOQUEADO]` al lado del ID.
- Despues de marcar, correr `python3 herramientas/cronograma.py`: regenera la seccion "Estado por persona" de este documento, `docs/cronograma.html` y la nota de Obsidian `AgroVault/Compartido/Cronograma.md`. `python3 herramientas/cronograma.py --revisar` dice si alguna vista quedo desfasada. Las marcas viven en las filas de las tablas de fase; las tres vistas no se editan a mano.
- Anotar en 01 cualquier cambio de alcance o de dependencia.
- Si una actividad resulta XL, dividirla en subactividades con su propio ID antes de empezar.
