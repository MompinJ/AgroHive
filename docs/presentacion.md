# Presentación de 7 diapositivas (demo de la entrega)

> **Qué es:** la presentación de AgroHive en inglés, de 7 diapositivas contando portada e introducción, que la regla de la entrega permite en lugar del video de 30 s (`docs/02`, A0.5). Parte del esquema de "Presentación de respaldo (7 diapositivas)" de [`trailer-30s.md`](trailer-30s.md) y lo sustituye como texto vigente.
>
> **Deck:** <https://claude.ai/artifact/9at5wxSRsVZGkQNNBeDDnv> (tipo Slides de Claude, privado hasta que Mompin lo comparta desde su menú Share; se descarga como PDF o PPTX). Este archivo guarda el mismo texto (diapositivas y notas del orador) para revisarlo en el repo.
>
> **Estado (15/11):** borrador para revisión del equipo. Falta la captura de Comparison (hueco marcado abajo) y la aprobación de todo el equipo antes de enviarla (`docs/13`, "Reglas de organización del día final").

## Reglas que cumple

- Hasta 7 diapositivas contando portada e introducción; todo en inglés (`docs/02`).
- Sin identidad NASA: ni logo, ni insignia, ni colores de marca; "NASA" solo como nombre de la fuente de datos. "Field Shift challenge" en texto, sin logos del evento.
- Límites de `docs/10` dichos en la portada y en el cierre: no predice cosechas, ingresos ni el clima de una temporada; el 3D es cualitativo; hace falta validación local.
- Declaración de uso de IA en la última diapositiva, tomada de la sección "AI-use statement" de `README.en.md`, más el uso de IA en este deck.
- Sin imágenes generadas con IA: el deck solo usa texto, formas y las capturas de la app que se pongan después. Si se agrega una imagen generada, va con Krea, con el flujo de ficha y OK de Mompin y con marca visible.

## Diseño

- Paleta de la app (`web/src/ui/tokens.css`): bosque `#11221a` (portada), verde `#1b5e3e` (cierre), salvia `#fafbf8` y `#f1f6ed` (fondos alternos), verde `#23784f` (acento sobre claro), trigo `#c4902f` (acento sobre oscuro). Seco, normal y lluvioso en arcilla `#a5452f`, verde `#23784f` y azul `#2f6690`, siempre con su palabra al lado.
- Tipografía: Inter Tight para títulos e Inter para texto (la app usa GT America con Inter de sustituto). Escala 120 / 64 / 40 / 30 / 24 px.
- Cada diapositiva: etiqueta arriba (tema), título en una línea y una idea; pie con "AgroHive · Field Shift challenge" y número de página.

## Capturas

Sacadas sin pantalla el 15/11 desde `main` c4b6543 (app en inglés): Chrome `--headless=new` con SwiftShader conducido por CDP, ventana de 1920 x 1080, gráficos en Alto, tutoriales cerrados, ejemplo Bajío elegido en Land (método de la memoria del proyecto, "capturas de la escena sin pantalla"; los ejemplos vienen grabados en el front y no piden la API). Archivos en [`capturas/presentacion/`](capturas/presentacion/).

| Diapositiva | Pantalla (nombre en la app en inglés) | Ejemplo | Archivo | Estado |
| --- | --- | --- | --- | --- |
| 1 Cover | Scenarios, Normal year 2016, semana 11 de 19, interfaz oculta | Bajío | `scenarios-bajio-normal-2016.png` (completa) y `portada-scenarios-bajio-recorte.png` (recorte de 1040 x 1080 que va en el deck) | Puesta |
| 3 What it is | Crops, rotación 1 (maíz, sorgo, maíz), Esquilote con su primer consejo | Bajío | `crops-bajio.png` | Puesta |
| 4 How it works | Comparison, ranking por robustez con la primera fila y la columna del peor escenario | Bajío | Pendiente: espera a que entre la pantalla 4 en inglés | Hueco punteado en el deck |

**El orden del ranking se lee de la captura**, no de este archivo: las rotaciones iniciales las arma el front (E10).

**Hallazgo al capturar (para B7):** en Scenarios, al pasar el cursor sobre la escena, el aviso de lluvia sale en español ("Lluvia: 1.4 mm, llovizna, el 2026-08-12 (clima real del 2016-08-12). Fuente: NASA POWER (diario, comunidad AG)"). La portada usa la escena sin interfaz, así que no se ve.

## Diapositivas y notas del orador

Duración de las notas: entre 25 y 40 s cada una a ritmo normal; unos 3.5 min en total.

### 1. Cover

- Team Code Hive · Field Shift challenge
- **AgroHive**
- Plan for the bad year.
- A what-if simulator that tests a crop rotation against 20 years of real NASA climate data.
- Explores real climate history. Does not forecast yields, income or the weather. The farmer decides.
- Imagen: escena 3D del Bajío en el año normal 2016, sin interfaz (`capturas/presentacion/portada-scenarios-bajio-recorte.png`).

**Notes:** Hi, we are Team Code Hive, and this is AgroHive, our answer to the Field Shift challenge. Our motto is “plan for the bad year.” AgroHive is a what-if simulator: you paint a crop rotation on a 3D field and test it against twenty years of real NASA climate data. One thing up front, because it matters: AgroHive does not forecast yields, income or next season’s weather. It shows how a plan would have held up in real years, and the farmer makes the decision.

### 2. The problem

- **Rain-fed farmers bet a whole season on the weather.**
- They have to choose what to plant before they know how the year will come. A plan made for the usual year can break in the bad one.
- Same field, three real years: rain in the sowing seasons, Bajío, Mexico. Barras: Dry · 2009, 561.7 mm; Normal · 2016, 725.4 mm; Wet · 2018, 834.8 mm.
- The dry year had 163.7 mm less rain than the normal one. Source: NASA POWER daily data, Apr–Sep and Oct–Mar seasons of each agricultural year, computed by the AgroHive engine for the Bajío sample farm.

**Notes:** Rain-fed farmers have no irrigation to fall back on. Every season they decide what to plant before they know what kind of year is coming. Here is one real place, the Bajío in central Mexico, with NASA POWER data: in the two sowing seasons, 2009 had 561.7 millimetres of rain, 2016 had 725.4 and 2018 had 834.8. That is 163.7 millimetres less in the dry year than in a normal one. A plan that only works when it rains as usual is a bet, and one bad year can wipe out the season.

### 3. What it is

- **A what-if simulator, not a forecast.**
- 1 · Choose the land: Pick one of six sample farms or draw your own field on the map.
- 2 · Paint the crops: Paint a rotation on a 3D voxel field with relief. The catalog has 40 crops.
- 3 · Test it: Switch between a real dry, normal and wet year and watch each block react.
- It does not forecast yields, income or an exact season. The farmer decides.
- Imagen: pantalla Crops del Bajío (`capturas/presentacion/crops-bajio.png`), con el pie "Crops screen, Bajío example: rotation 1 is maize, sorghum, maize."

**Notes:** AgroHive is a what-if simulator. It does not try to guess the weather. You choose your land: one of six sample farms around the world, or you draw your own field on the map. You paint your crops on a 3D voxel field with real relief; the catalog has forty crops. Then you switch between a real dry, normal and wet year and watch how every block of your field reacts. It does not forecast yields or income, and it does not replace an agronomist. It makes the risk visible before planting, and the decision stays with the farmer.

### 4. How it works

- **Each rotation faces its worst real year.**
- 1 · 20 years of real daily climate: NASA POWER, Oct 2005 to Dec 2025, one cell per field.
- 2 · Three real reference years: closest to p10, p50, p90 of sowing-season rain.
- 3 · FAO-56 water balance per cell: runs in the browser, inside a Web Worker.
- 4 · Four pillars per year: water deficit, excess water, planting window, soil cover.
- 5 · Ranked by the worst year: minimax regret; equal weights, declared SUPUESTO.
- Hueco: *Screenshot: Comparison · Bajío example* (robustness ranking with the first row and the worst-scenario column in view).

**Notes:** Under the hood: we take twenty years of daily NASA POWER climate for the field. From them we pick three real years, the ones closest to the 10th, 50th and 90th percentile of rain in the sowing seasons: a dry, a normal and a wet year. They are history, not a prediction. A FAO-56 water balance runs for every cell, right in the browser. Each rotation gets four pillars per year: water deficit, excess water, planting-window fit and soil cover. Then we rank by the worst year, with minimax regret, not by the best. The order you see on screen is the one the engine computes.

### 5. Worldwide

- **Six sample farms on five continents.**

| Sample farm | Köppen | Dry year | Normal year | Wet year |
| --- | --- | --- | --- | --- |
| Bajío, Guanajuato, Mexico | Cwa | 2009 · 561.7 mm | 2016 · 725.4 mm | 2018 · 834.8 mm |
| Sorriso, Mato Grosso, Brazil | Aw | 2025 · 1075.7 mm | 2023 · 1475.0 mm | 2007 · 1858.2 mm |
| Uasin Gishu, Kenya | Am | 2014 · 1084.1 mm | 2023 · 1615.3 mm | 2018 · 1998.9 mm |
| Ludhiana, Punjab, India | Cwa | 2007 · 552.0 mm | 2021 · 782.9 mm | 2022 · 1025.5 mm |
| Tierra de Campos, Palencia, Spain | Csb | 2022 · 339.1 mm | 2023 · 483.8 mm | 2010 · 584.1 mm |
| Story County, Iowa, USA | Dfa | 2023 · 630.8 mm | 2024 · 841.5 mm | 2018 · 1031.4 mm |

- Rain in the two sowing seasons, NASA POWER. Fictitious plots of about 2.8 ha on real cropland (ESA WorldCover).
- Tarjetas del calendario: GGCMI phase 3 (worldwide base: rainfed sowing day, 0.5°, 15 of 40 crops) · MIRCA2000 (start month for pulses and crop presence outside Mexico) · FAO Crop Calendar (vegetables, sesame and cowpea in 57 countries) · SIAP (Mexico) (crop presence in every municipality, added on top).

**Notes:** AgroHive is not tied to one place. It ships six sample farms on five continents: the Bajío in Mexico, Sorriso in Brazil, Uasin Gishu in Kenya, Ludhiana in India, Tierra de Campos in Spain and Story County in Iowa. Each one has its own real dry, normal and wet years, and the 3D scene takes its look from the Köppen climate. The planting calendar is worldwide too: GGCMI phase 3 is the base, MIRCA2000 and the FAO Crop Calendar fill gaps, and in Mexico SIAP adds local data on top. And the worst year is not always the dry one: in the engine’s test runs for Sorriso and Uasin Gishu, the hardest year was the wet one, because of excess water.

### 6. Data and sources

- **Every figure has a source or a status.**

| Source | Used for | Status |
| --- | --- | --- |
| NASA POWER (daily) | Rain, temperature, radiation, wind: the base | In use |
| GPM IMERG (via POWER) | Daily satellite rain, as evidence | Evidence only |
| SMAP L3 | Surface soil moisture, a regional contrast | Evidence only |
| MODIS MOD13Q1 NDVI | Greenness of the area, in the mascot’s tips | Evidence only |
| SoilGrids + OpenLandMap | Texture and pH; water capacity by pedotransfer | SUPUESTO |
| Terrarium elevation | Relief of the 3D field | In use |
| FAO-56 + FAO EcoCrop | Crop coefficients, stages and climate ranges | In use |
| GBIF pest records | Pests recorded within about 165 km | Illustrative |
| Heat risk, erosion | No sourced heat threshold; RUSLE needs sub-daily rain | NO_EVALUABLE |

- A missing parameter is shown as NO_EVALUABLE with its reason: never a zero, never an invented value. Evidence layers do not enter the ranking.

**Notes:** Every number in AgroHive traces back to a source. NASA POWER daily data is the base of the computation. GPM IMERG satellite rain, SMAP soil moisture and MODIS NDVI appear as evidence, but they never change the ranking. Soil texture and pH come from SoilGrids and OpenLandMap and are always labelled SUPUESTO, an estimate, because they are global maps. Crop parameters come from FAO-56 and EcoCrop, with a source for each value. Pest records from GBIF are illustrative only. And when something is missing, like a sourced heat-stress threshold or the inputs for an erosion index, we show NO_EVALUABLE with the reason. We never fill a gap with a zero or an invented value.

### 7. Limits and next step

- **Plan for the bad year.**
- What AgroHive does not claim: It does not forecast yields, income or an exact season. · Climate is regional: one POWER cell (0.5° × 0.625°) covers the whole field. · The 3D scene is qualitative: stages and states, not real heights. · Every result needs field validation with local agronomists.
- Try it: <https://64-23-143-102.sslip.io>
- Team Code Hive: Mompin, Eduardo, Mafer and balam
- **AI use.** The idea comes from a teammate’s video, not from AI. AI assistants (Claude, Codex, Cursor, ChatGPT, Gemini, Copilot) helped write code, tests, docs and this deck; AI agents built the 3D models in code with our voxel library; some interface illustrations and the trailer voice (ElevenLabs via Krea) are AI-generated. NASA data is used as a source; this is not endorsed by NASA.

**Notes:** We say our limits before anyone asks. AgroHive does not forecast yields, income or an exact season. NASA climate is regional, so one cell covers the whole field, and differences between blocks come from crop, soil and relief. The 3D scene is qualitative. And every result needs field validation with local agronomists. You can try it now at the link on screen. We are Team Code Hive. AI assistants helped us write code, docs and this deck, and the details are in our README. If satellite data can reveal hidden risks beneath our feet, what other local decisions could change if we look at them from space? Thank you.

## De dónde sale cada cifra

| Cifra | Fuente |
| --- | --- |
| Años y lluvia de los seis ejemplos (seco, normal, lluvioso; mm de las temporadas PV + OI) | Regresiones del motor, `web/src/motor/pruebas/regresion/ejemplos/*.json`, campo `escenarios` (`anioReal`, `temporadas.total`), grabadas el 15/11 con contratos 0.16.0 |
| 163.7 mm menos en el año seco del Bajío | 725.4 - 561.7, del mismo archivo `bajio-guanajuato.json` |
| Clase de Köppen de cada ejemplo | Mismas regresiones, campo `clima.clase` (reglas de Peel et al. 2007, `web/src/geo/koppen.ts`) |
| El peor año es el lluvioso en Sorriso y Uasin Gishu | Mismas regresiones, `ranking.orden[].peorEscenario` = `lluvioso` para todas las rotaciones de prueba (no son las rotaciones iniciales de la app, por eso la nota dice "test runs") |
| 20 años, de octubre de 2005 a diciembre de 2025; p10, p50 y p90 de la lluvia de las temporadas | `README.en.md`, "Method", paso 1; `docs/13`, "Escenarios (A2.5)" |
| 40 cultivos; 6 ejemplos en 5 continentes; parcelas de unas 2.8 ha sobre ESA WorldCover | `docs/13`, "Ampliación del catálogo" y "Demo mundial" |
| Cuatro pilares del ranking; minimax de arrepentimiento; pesos iguales `SUPUESTO` | `docs/13`, "Ranking", "Pilares 2 y 3 (A3.7)" y "Exceso de agua en el ranking (A4.2)"; `README.en.md`, "Method", pasos 4 y 5 |
| GGCMI fase 3 a 0.5° con 15 cultivos; MIRCA2000 para Pulses y presencia; FAO Crop Calendar en 57 países; SIAP en todos los municipios | `docs/13`, "AgroHive MUNDIAL y calendario base (15/11)" y "FAO Crop Calendar (15/11)" |
| Celda de POWER de 0.5 x 0.625 grados | `README.en.md`, "Declared limits and assumptions" |
| GBIF en unos 165 km (caja de ±1.5°) | `README.en.md`, "Other sources and licenses"; `docs/13`, "Plagas con GBIF" |
| Estado de cada fuente (en uso, evidencia, `SUPUESTO`, `NO_EVALUABLE`) | `README.en.md`, "NASA data used by AgroHive" y "Other sources and licenses"; calor y erosión `NO_EVALUABLE` en "Method", paso 4, y `docs/13`, "Pilares 2 y 3" |
| Enlace de la app | `docs/trailer-30s.md`, "Enlace del cierre" `[DECIDIDO]` |
| Equipo y declaración de IA | `README.en.md`, "Team" y "AI-use statement" (pendiente de revisión humana, igual que en el README) |

## Pendientes antes de enviarla

- [x] Capturas de Scenarios y Crops puestas.
- [ ] Captura de Comparison cuando entre la pantalla 4 en inglés.
- [x] Revisión a ojo de las 7 diapositivas con las fuentes cargadas (vista previa local en Chrome sin pantalla, 15/11): nada se sale de su caja.
- [ ] Que el equipo confirme la declaración de IA (la idea humana, la marca de las ilustraciones de la interfaz) como pide el README.
- [ ] Compartir el deck con enlace público (menú Share del deck) o exportarlo a PDF y subirlo donde no pida registro ni permisos (`docs/02`).
- [ ] Aprobación de todo el equipo.
