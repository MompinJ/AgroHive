# AgroHive (Code Hive)

> **Estado de este documento (14/11/2026).** Las licencias y las reglas del reto se contrastaron con sus páginas oficiales, y quien las leyó fue una sesión de IA, no una persona. **Falta la revisión humana de las licencias y de la declaración de IA.** Lo que no se pudo verificar va marcado `[VERIFICAR]` y está resumido al final, en "Lo que falta verificar".

## Qué es

AgroHive es un **simulador visual "what if"** que compara **rotaciones de cultivos** con la historia climática real de **NASA**, para el reto [*Field Shift: Adapting Farms with NASA Data*](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) del NASA Space Apps Challenge 2026 (sede Boca del Río, Veracruz). Fuente: `docs/00`, `docs/02`.

- **No busca la rotación de mayor rendimiento, sino la más robusta:** la que no colapsa en el peor escenario histórico (`docs/00`, `docs/05` paso 7).
- **Arquitectura mundial, demo validada en Isla, Veracruz:** funciona en cualquier coordenada con fuentes globales. Las fuentes de un país (SIAP e INIFAP en México) se suman encima cuando la coordenada cae ahí (`docs/13`, "Alcance geográfico").
- **Parcela de demo:** 2 ha ficticias en Isla (municipio INEGI 30/077), con coordenadas ilustrativas (`contratos/ejemplos/parcela.ejemplo.json`, `datos/demo/LEEME.md`).
- **La demo compara por defecto R1, R2 y R4** y muestra como sugerida **R4, milpa sembrada dentro de las ventanas de INIFAP**. R3 (frijol-frijol) queda disponible en el selector (`docs/13`). El orden que se ve es el que calcula el motor.
- **La decisión final es del agricultor.** AgroHive no reemplaza a un agrónomo (`docs/00`, `docs/10`).
- **Demo publicada:** <https://64-23-143-102.sslip.io>. El 14/11/2026 por la noche `/health` informaba el commit `23f8a53` y `versionContrato` 0.12.2. Está en el servidor de un integrante del equipo (`docs/13`): la dirección puede cambiar.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `web/` | Frontend React + Vite + TypeScript; motor de simulación en Web Worker |
| `api/` | Backend FastAPI (Python): proxy y caché de NASA POWER, Open-Meteo, elevación, suelo |
| `contratos/` | Contratos de datos (JSON Schema), ejemplos y tipos TS generados: fuente de verdad de los formatos |
| `datos/` | Catálogos (cultivos, suelos, calendario local) y paquete de demo precargado |
| `modelos/` | Modelos 3D `.bbmodel` (cultivos, losas de suelo y mascota) generados con el agente `modelador-voxel` |
| `docs/` | Documentación vigente |
| `herramientas/` | `voxelkit.py`, `buzon/` (mensajes entre sesiones de IA por la red local), `prueba-movimiento/` (prueba de accesibilidad de la escena en Chrome) y utilidades |

Ramas: `main` (estable), `balam`, `Mompin`, `Mafer`, `Eduardo`. Se trabaja en la rama propia y se integra a `main`; un archivo, un responsable.

## Cómo correrlo

Requisitos: Node.js 20.19+ o 22.12+ y Python 3.12 (`web/package.json`, `api/README.md`).

### Web (interfaz y motor)

```bash
cd web
npm install
npm run dev          # abre http://127.0.0.1:5173
npm test             # pruebas del motor y de la interfaz
npm run build        # comprueba tipos y genera dist/
```

En desarrollo, la web llama a la API pública. Para usar una API local se define `VITE_API_URL` (por ejemplo `VITE_API_URL=http://127.0.0.1:8010 npm run dev`); ver `web/src/api/README.md`.

### API (datos)

```bash
cd api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
.venv/bin/python -m pytest -q        # sin red: usa respuestas reales guardadas
```

La documentación interactiva está en `/docs`. No hay llaves en el repo. `EARTHDATA_TOKEN` solo hace falta para `/api/smap` y va en el entorno del servicio, nunca en un archivo del repo (`api/README.md`).

### Demo sin internet

El paquete `datos/demo/` (A2.4) trae la caché de la API para la parcela demo. Si a la API le falta su caché local, la lee de ahí, y `GET /api/clima`, `POST /api/elevacion`, `GET /api/suelo` y `GET /api/proxima-temporada` responden sin red. La web debe pedir la ventana `2005-10-01` a `2025-12-31` y el centroide de la parcela; otra zona sin red responde 503 con `ERROR_DATOS` (`datos/demo/LEEME.md`).

### Verificaciones antes de integrar

`npm test` en `contratos/`, `pytest` en `api/`, `node datos/catalogos/validar.mjs`, `python -m unittest discover -s datos/catalogos`, y `npm test` y `npm run build` en `web/` (`CLAUDE.md`).

## Método

Todo cálculo vive en el **motor**, que corre en el navegador dentro de un Web Worker (`web/src/motor/`). La interfaz y el 3D solo muestran lo que entrega el motor (`docs/05`, `docs/08`, `docs/13`).

1. **Escenarios históricos:** años reales seco, habitual y lluvioso, cerca de los percentiles p10, p50 y p90 de la lluvia de las temporadas PV + OI de SIAP, en 20 años agrícolas (2005-10 a 2025-12). Siempre se muestra el año real. No son una predicción (`docs/04`, `docs/05` paso 1, `contratos/clima-escenario.schema.json`).
2. **Clima por ciclo:** cada ciclo se simula en su temporada típica (PV u OI) dentro del año del escenario. La fecha de siembra la elige el usuario y el selector la sugiere desde el calendario local, explicando de dónde sale (`docs/05` paso 2, `contratos/plan-siembra.schema.json`, `contratos/calendario-local.schema.json`).
3. **Balance de agua FAO-56 por bloque:** ET0, ETc = Kc × ET0 y un balance de cubeta con agua disponible (TAW) según el suelo. La percolación profunda sigue la ecuación 88 de FAO-56. La humedad inicial puede venir de `GWETROOT` de POWER convertida a fracción de TAW (`docs/05`, `docs/13`).
4. **Pilares por rotación y escenario:** déficit hídrico, exceso de agua, compatibilidad de ciclo, protección del suelo (índice relativo, no toneladas), riesgo por calor y aporte indirecto. Si un pilar no tiene datos, sale `NO_EVALUABLE` con sus números en `null` (`docs/05` paso 6, `contratos/resultado-rotacion.schema.json`).
5. **Ranking B:** puntaje compuesto por escenario, robustez = peor puntaje, minimax del arrepentimiento y desempate por promedio. Los pesos son iguales y se declaran `SUPUESTO` salvo que haya fuente o prioridades del usuario. El criterio A (solo pilar hídrico) queda de respaldo (`docs/05` paso 7, `docs/13`).
6. **Próxima temporada (aproximada):** una banda p10 a p90 por mes durante 6 meses: la distribución histórica de cada mes desplazada por la anomalía del pronóstico estacional SEAS5, sin tendencia. Por rotación se usan años análogos reales. Siempre es `EXPLORATORIO`, nunca una cifra y nunca entra al ranking (`docs/13`, `contratos/proxima-temporada.schema.json`).
7. **Explicación:** cada rotación lleva una tarjeta con por qué, evidencia (año real, cifras), beneficios, huecos y riesgos, generada por plantilla (`docs/05` paso 8).

Estados de cada resultado: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`. Un dato faltante nunca se convierte en cero (`docs/04`).

## Datos de NASA que usa AgroHive

El reto pide detallar qué datos NASA se usaron, y para un premio global hace falta al menos uno. Todos los de la lista están entre los que el reto menciona (SMAP, GPM, MODIS, NASA POWER...). Estado al 14/11/2026, según `docs/14`:

| Dato NASA | Para qué | Estado |
| --- | --- | --- |
| **NASA POWER** (API diaria, comunidad AG) | Lluvia, temperaturas, radiación, humedad, viento y `GWETROOT`. **Es la base del cálculo** | **En uso** |
| **GPM IMERG** (variable `IMERG_PRECTOT`, vía POWER) | Lluvia satelital diaria como evidencia; no entra al balance ni a los escenarios (A4.10) | **En uso** (evidencia). POWER devuelve datos desde 1998-01-01 (medido el 14/11/2026 en la parcela demo; antes responde `-999`) |
<<<<<<< HEAD
| **SMAP L3** (`SPL3SMP`, 36 km) | Humedad del suelo superficial, como contraste (A4.8) | **En uso en la API pública** (`GET /api/smap`, token de Earthdata solo en el entorno del servicio; 14/11 respondió 200 con humedad real en la parcela demo). Contraste informativo: no entra al ranking y la interfaz no lo muestra todavía |
| **MODIS MOD13Q1** (NDVI) | NDVI como evidencia (A4.11) | **En la API y en el paquete de demo** (`GET /api/ndvi`, `datos/demo/respuestas/ndvi.json`, 454 compuestos de Terra vía Microsoft Planetary Computer, estado `EXPLORATORIO`). La interfaz no lo muestra todavía |
=======
| **SMAP L3** (`SPL3SMP`, 36 km) | Humedad del suelo superficial, como contraste (A4.8) | **En la API pública** (A4.8): `GET /api/smap` devuelve humedad real; la interfaz de la demo no lo llama |
| **MODIS MOD13Q1** (NDVI) | NDVI como evidencia (A4.11) | **En uso** (evidencia): `GET /api/ndvi` por Microsoft Planetary Computer y paquete de demo; no entra al ranking |
>>>>>>> origin/main
| **Elevación** | Relieve de la parcela. El proveedor por defecto es AWS Terrain Tiles (Terrarium), no un producto NASA directo | En uso; ver fuentes del DEM abajo |

### Cómo se cita cada uno

Reconocimiento de NASA como fuente, y cita del dato usado. Todo verificado el 14/11/2026 en las páginas oficiales indicadas.

| Fuente | Cita | Licencia o condiciones de uso |
| --- | --- | --- |
| **NASA POWER** | *The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division.* Con el servicio, la versión y la fecha: **POWER Daily API v2.10.3** (versión de las respuestas guardadas en `datos/pruebas-apis/`), consultada el 14/11/2026 ([guía de referencia](https://power.larc.nasa.gov/docs/referencing/)) | La guía de referencia de POWER **no declara una licencia** `[VERIFICAR]` |
| **GPM IMERG** | Huffman, G.J., Stocker, E.F., Bolvin, D.T., Nelkin, E.J. y Tan, J. (2023). *GPM IMERG Final Precipitation L3 1 day 0.1 degree x 0.1 degree V07* (GPM_3IMERGDF). GES DISC. [doi:10.5067/GPM/IMERGDF/DAY/07](https://doi.org/10.5067/GPM/IMERGDF/DAY/07) (registro del catálogo CMR de NASA, que da cobertura desde 1998-01-01). Se obtiene a través de POWER: citar también a POWER. `[VERIFICAR]` que `IMERG_PRECTOT` de POWER sea este producto (Final, V07, diario) | Guía de uso y cita de datos NASA (abajo); instrucciones de cita del GES DISC en <https://disc.gsfc.nasa.gov/data-guidelines> |
| **SMAP L3** (cuando se use) | O'Neill, P., Chan, S., Njoku, E., Jackson, T., Bindlish, R. y Chaubell, J. (2023). *SMAP L3 Radiometer Global Daily 36 km EASE-Grid Soil Moisture, Version 9*. NASA NSIDC DAAC. [doi:10.5067/4XXOGX0OOW1S](https://doi.org/10.5067/4XXOGX0OOW1S) (autores y año según los metadatos del DOI en DataCite; la página de cita recomendada que indica el catálogo, `nsidc.org/about/use_copyright.html`, respondió 404) | El catálogo dice: *freely, openly, and fully available to use without restrictions, provided that you cite the data according to the recommended citation*. Requiere iniciar sesión en Earthdata |
| **MODIS MOD13Q1** | Didan, K. (2021). *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*. NASA LP DAAC. [doi:10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061). Datos servidos por Microsoft Planetary Computer (colección `modis-13Q1-061`); el servicio REST de ORNL DAAC ([doi:10.3334/ORNLDAAC/1600](https://doi.org/10.3334/ORNLDAAC/1600)) solo se usó para validar 4 fechas y no se llama en vivo (`docs/13`). Términos de Planetary Computer `[VERIFICAR]` (V-25) | Política de uso de datos de NASA (abajo) |

**Política de uso de datos de NASA** ([guía de Earthdata](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance)): *Unless the content is marked with a use restriction or license, data provided from a NASA-led mission are licensed as Creative Commons Zero (CC0)*; hay que reconocer a NASA como fuente, y se pide citar el dato. *Non-NASA data available through the ESDIS project is subject to the license arrangements of the sponsoring organization.* No se debe sugerir que NASA avala el proyecto, ni usar su marca.

## Otras fuentes y licencias

| Fuente | Qué aporta | Licencia, cita y estado de la verificación |
| --- | --- | --- |
| **ISRIC SoilGrids** (WCS) | Textura, pH y carbono orgánico de 0 a 30 cm, 250 m, siempre `SUPUESTO` | **CC BY 4.0**, verificado en [isric.org/explore/soilgrids](https://www.isric.org/explore/soilgrids): *publicly available ... under the CC-BY 4.0 License* |
| **OpenLandMap-soildb** | Segunda estimación de suelo a 30 m (arcilla, arena, limo, pH y carbono orgánico, 0-30 cm, 2020-2022), para comparar con ISRIC | **CC BY 4.0**, que declara la colección STAC de la que lee la API, en cada una de las cinco capas (versión de 30 m), y que también declaran los registros de Zenodo, que guardan la versión de **120 m**: arcilla `15528401`, arena `15528413`, limo `15528425`, pH `15471105` y carbono orgánico, mediana, `15535759` (el `15535762` es el percentil 84). Los DOI que el STAC cita para cada colección (`15528399`, `15528411`, `15528423`, `15471103` y `15535756`) son registros de **2000-2005**, no de las capas de 2020-2022 que se leen. Autores del conjunto: Consoli, Tian, Isik, Simoes, Hengl y otros (OpenGeoHub, Land & Carbon Lab). `[VERIFICAR]` qué registro de Zenodo corresponde a cada capa de 30 m (Eduardo, que mantiene el cliente) |
| **AWS Terrain Tiles (Terrarium)** | Elevación por defecto | Su registro remite a la [guía de atribución de Tilezen](https://github.com/tilezen/joerd/blob/master/docs/attribution.md), que exige atribuir las fuentes del DEM. La atribución a Mapzen solo se exige al usar *el servicio alojado de Mapzen*, que no usamos. Las que aplican a una parcela en México y al mundo: *Mexico terrain data source: INEGI, Continental relief, 2016*; *Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration*; *United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey* |
| **Open-Meteo** | Respaldo de clima (ERA5), respaldo de elevación (Copernicus GLO-90) y pronóstico estacional (ECMWF SEAS5) | Su página de licencia dice: *API data are offered under Attribution 4.0 International (CC BY 4.0)* (hay que dar crédito y enlazar la licencia). Su README declara acceso gratuito *for non-commercial use*. Cita los datos de ECMWF (CC-BY) y de Copernicus C3S para el reanálisis y la elevación |
| **Esri World Imagery** | Mapa base satelital, el que la interfaz muestra por defecto | El ítem oficial de la capa dice *This work is licensed under the Esri Master License Agreement* y declara estos créditos, que la interfaz muestra: *Esri, Vantor, Earthstar Geographics, and the GIS User Community*. Advierte que la capa no es para exportar tiles ni usarla sin conexión. `[VERIFICAR]` por una persona que el uso directo de los tiles desde esta web, que no es una aplicación de ArcGIS, cumple los términos de Esri: no pude leer el texto del acuerdo y el ítem menciona expresamente el uso en aplicaciones ArcGIS |
| **OpenStreetMap** | Mapa base de calles (opción «calles» de la interfaz) | **ODbL** de la OpenStreetMap Foundation: *You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors*; si se modifican los datos, el resultado se distribuye con la misma licencia ([copyright](https://www.openstreetmap.org/copyright)). Su [política de tiles](https://operations.osmfoundation.org/policies/tiles/) exige atribución visible (*Typically: © OpenStreetMap contributors*), la URL oficial, prohíbe descargar tiles en bloque y pide no restringir el `Referrer-Policy`; no encontré un `Referrer-Policy` en `web/` ni en `api/despliegue/`. **La interfaz muestra «© OpenStreetMap» sin «contributors»** `[VERIFICAR]` (balam) |
| **FAO-56** (Allen, Pereira, Raes y Smith, 1998) | Kc y etapas (Tablas 11 y 12), agua del suelo (Tabla 19), Zr y p (Tabla 22), TAW (ec. 82), percolación (ec. 88) | Los [términos de FAO](https://www.fao.org/contact-us/terms/en/) permiten copiar, imprimir y descargar el contenido para *research and teaching purposes, and for use in non-commercial products or services* (la frase empieza con fines de estudio privado), con reconocimiento de la FAO como fuente y titular de los derechos, sin sugerir su aval. **El uso comercial requiere permiso de la FAO.** `[VERIFICAR]` por una persona que este uso encaja |
| **FAO EcoCrop** | Rangos de temperatura y lluvia anual por cultivo | `ecocrop.fao.org` no respondía (HTTP 503), así que se usó la copia de la base en el paquete R [Recocrop](https://github.com/cropmodels/Recocrop) (commit `3a01315`), cuyo **código** es GPL-3.0. El paquete no declara licencia para los datos; son de la FAO y aplican sus términos (arriba) `[VERIFICAR]` |
| **Saxton y Rawls (2006)** | TAW y retención (θsat, θFC, θWP) por pedotransferencia para cualquier textura | *Soil Sci. Soc. Am. J.* 70(5): 1569-1578, [doi:10.2136/sssaj2005.0117](https://doi.org/10.2136/sssaj2005.0117). Las ecuaciones se copiaron de su Tabla 1 y se verificaron contra su Tabla 3 |
| **WoSIS Procedures Manual** (Batjes y van Oostrum, 2023) | Factor 1.724 de carbono orgánico a materia orgánica | ISRIC Report 2023/01, p. 25 (`docs/01`) |
| **SIAP** | Cierre agrícola municipal de Isla, 2021-2025: presencia de cultivos y temporadas PV/OI | [Portal de datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php). Dice que son información que *cualquier persona puede usar, reutilizar y compartir libremente*, sujeta a *el reconocimiento de la fuente que los publica y la obligación de mantener las mismas condiciones de uso al momento de redistribuirlos*. El repo redistribuye un extracto (`datos/catalogos/fuentes/`): ver su `LEEME.md` |
| **INIFAP** | Ventanas de siembra del sur de Veracruz: guía de maíz de temporal (Tinoco Alfaro, C. E. Cotaxtla, 2022) y Agenda Técnica Agrícola de Veracruz (2.ª ed., 2015) | La agenda lleva impreso *© Secretaría de Agricultura, Ganadería, Desarrollo Rural, Pesca y Alimentación*. No encontré en los PDF condiciones de reproducción. Se toman las fechas (datos) con su cita, no el texto `[VERIFICAR]` |

Modelos 3D propios, generados con el agente `modelador-voxel` del equipo (`docs/07`).

## Límites y supuestos declarados

Fuente: `docs/00` ("Qué NO afirmar nunca"), `docs/04`, `docs/10` ("Límites científicos"), `docs/11` (riesgos).

- **No predice una temporada exacta.** Los escenarios son años históricos reales y la próxima temporada es un rango aproximado, nunca una cifra.
- **No predice cosechas, rendimientos ni ganancias.**
- **No mide pH ni fertilidad.** Textura, pH y TAW son estimaciones de mapas globales o de pedotransferencia, siempre `SUPUESTO`.
- **Resolución gruesa del clima:** la parcela cabe en una celda de POWER (0.5 × 0.625 grados), así que el clima es igual en toda la parcela. Las diferencias entre bloques vienen de cultivo, suelo y relieve.
- **`GWETROOT` es fracción de saturación** (~1 m, regional), no fracción de TAW: se convierte antes de usarse, y sin la retención del suelo no se usa.
- **El 3D es cualitativo:** muestra etapas y estados, no alturas ni biomasa.
- **Simplificaciones:** cubeta de agua, índice relativo de erosión, parámetros de tablas generales, pesos iguales `SUPUESTO` en el ranking y normalización del exceso de agua `SUPUESTO`.
- **Parámetros elegidos por el equipo** que una persona debe revisar: filas de FAO-56, **el chile usa los parámetros del pimiento dulce** (misma especie; FAO-56 y EcoCrop no traen chile verde), raíz en el máximo del rango y grupos del selector (`datos/catalogos/README.md`).
- **Un cultivo que la fuente local no registra en el lugar** se muestra, pero no se recomienda (por ejemplo, la calabaza en Isla).
- **Las ventanas de siembra de maíz OI y frijol OI** son recomendaciones del estado de Veracruz, no de Isla; solo el maíz de primavera-verano tiene una guía que cubre el distrito de Isla.
- **IMERG y POWER difieren** en tormentas y en años recientes. Los escenarios usan POWER; con IMERG serían otros años (riesgo declarado en `docs/11`).
- **Sin validación local** mientras no la haya: toda recomendación requiere validación en campo con un técnico.

## Declaración de uso de IA

El reto permite el uso de IA (en su guía la llama «Super Intelligence (SI)»), con condiciones: no se usa para idear la solución, el contenido generado no puede usar branding de NASA, y hay que indicar dónde y cómo se usó. Para imágenes y video pide marca de agua visible; para audio, código y datos, reconocerlo en texto y metadatos ([guía de entrega](https://www.spaceappschallenge.org/resources/project-submission-guide/), leída el 14/11/2026). **Esta sección está pendiente de revisión humana.**

| Parte | Cómo se usó la IA | Estado |
| --- | --- | --- |
| **La idea** | La idea central (probar cada rotación contra años históricos reales y buscar la más robusta) viene de un video de un compañero del equipo (`docs/11`), no de una herramienta de IA | `[VERIFICAR]` que el equipo lo confirme |
| **Código** | Los integrantes usaron asistentes de IA (según `docs/14`: Claude, Codex, Cursor, ChatGPT, Gemini y Copilot) para escribir código, pruebas y documentación. Varios commits llevan la marca `Co-Authored-By` de la herramienta; **no todos** (el equipo no los marcó de forma uniforme), por eso queda aquí por escrito | Reconocido en este texto |
| **Datos** | Los valores del catálogo de cultivos y suelos los extrajo un asistente de IA de las tablas originales de FAO-56 y de EcoCrop, con fuente por valor. Una persona aprobó las elecciones (qué fila usar); **la comprobación cifra por cifra contra la fuente queda pendiente** | `[VERIFICAR]` |
| **Modelos 3D** | Los modelos `.bbmodel` (cultivos, suelos y mascota) los generó un agente de IA que escribe código con `voxelkit.py`; se revisaron en los visores de `modelos/` | Reconocido en este texto |
| **Ilustraciones de la interfaz** | `terreno-hero`, `terreno-demo` y `terreno-poligono` se generaron con una herramienta de generación de imágenes (prompts en `web/src/ui/assets/terreno-prompts.md`). El origen de `inicio-campo.png` no está registrado | **La guía pide marca de agua visible** en imágenes generadas con IA: `[DECIDIR]` cómo se cumple. No comprobé si la interfaz ya la muestra |
| **Video y audio de la demo** | Aún no existen | `[DECIDIR]` si la voz o las imágenes serán generadas; si lo son, marca de agua y reconocimiento |
| **Branding de NASA** | No se encontraron logos de NASA entre los archivos del repo (revisión por nombre, 14/11/2026). El contenido generado no debe usarlos | `[VERIFICAR]` en las capturas y el video |
| **Dentro de la aplicación** | Ningún modelo de lenguaje decide ni inventa datos. Si se usa uno, solo redacta sobre números ya calculados, y hay plantilla de respaldo sin LLM (`docs/05` paso 8). La demo usa plantilla | Hecho |

Las decisiones, las fuentes y la revisión son humanas (`docs/14`; `AGENTS.md`). Las cifras científicas llevan fuente, y una persona debe verificarlas (`AGENTS.md`).

## Licencia del proyecto

**El repositorio no tiene archivo de licencia** al 14/11/2026, así que el código propio no declara bajo qué términos se puede reutilizar. `[DECIDIR]` (equipo). Las fuentes de arriba conservan sus propias licencias y condiciones.

## Lo que falta verificar

Todo lo siguiente es `[VERIFICAR]` y necesita a una persona:

1. **Licencias y condiciones de uso** de la tabla de fuentes: POWER (no declara licencia), FAO-56 y EcoCrop (uso no comercial con reconocimiento; copia de Recocrop), INIFAP (sin condiciones encontradas) y SIAP (redistribución con las mismas condiciones). El texto legal lo valida una persona.
2. **Citas incompletas:** que la variable `IMERG_PRECTOT` de POWER sea el producto IMERG Final V07 diario; qué registro de Zenodo corresponde a cada capa de 30 m de OpenLandMap.
3. **Mapas base:** si el uso directo de los tiles de Esri World Imagery cumple los términos de Esri, y completar la atribución de OpenStreetMap con «contributors».
4. **Declaración de IA:** que el equipo confirme la idea humana, cómo se cumple la marca de agua en las imágenes generadas y en el video, y la comprobación de las cifras del catálogo.
5. **Reglas del reto:** confirmarlas en el navegador (se leyeron con una herramienta de IA).
6. **Licencia del código propio** del repositorio.
7. **Sin validación local:** ningún técnico agrícola ha revisado los parámetros ni las recomendaciones.

## Equipo

Code Hive: Mompin, Eduardo, Mafer y balam (`docs/14`, tablero de reparto).
