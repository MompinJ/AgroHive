---
tipo: referencia
audiencia: todas
actualizado: 2026-11-14
fuente: investigación web del 14/11/2026, páginas oficiales de cada proveedor
---

# APIs y documentación

Investigación para decidir qué fuentes usa el backend (`api/`, FastAPI) y el motor. No cierra pendientes: aporta evidencia a V-06, V-08, V-21, V-22 y V-23 (ver [[Pendientes]]). Todo lo marcado `VERIFICAR` no se pudo confirmar en la página oficial; se prueba con una llamada real antes de escribir el cliente. Las reglas de datos siguen en [[Reglas]] y los endpoints propios en [[Contratos]].

## Decisiones del 14/11 `[DECIDIDO]`

- **Elevación (V-08):** Terrarium por defecto; Open-Meteo Elevation de respaldo.
- **Suelo (V-23):** ISRIC WCS **y** OpenLandMap, los dos, para compararlos (cliente de OpenLandMap: A2.15). TAW por pedotransferencia de Saxton y Rawls (2006) desde arena, arcilla y materia orgánica (A2.16).
- **Pronóstico estacional (V-21):** horizonte de 6 meses en la app, aunque `forecast_days=210` dé 7. Método de A2.13 aprobado.
- **POWER `GWETROOT` (V-06):** entra al balance (condición inicial y comparación). Es fracción de saturación de MERRA-2 en ~100 cm, no de TAW: hay que convertirla. Agregar `GWETROOT` a los parámetros del cliente de POWER.
- **Servidor (V-15 a V-17):** `sslip.io` + Let's Encrypt.

La tabla de abajo es la investigación **previa** a las llamadas del 14/11. Lo que ya se construyó está en la sección de decisiones, en [[Contratos]] y en [[Codigo]]. No uses la columna "Veredicto" para reabrir V-06, V-08, V-21 o V-23.

## Recomendación en una tabla

| Necesidad | Primera opción | Respaldo | Llave | Veredicto |
| --- | --- | --- | --- | --- |
| Clima diario (lluvia, T, radiación) | NASA POWER diario, puntual | Open-Meteo archivo (ERA5) | No | Base del MVP |
| ET0 | Hargreaves o Penman-Monteith propio con POWER | `et0_fao_evapotranspiration` de Open-Meteo | No | Decidir en A2.x con prueba de unidades |
| Elevación del polígono | Open-Meteo Elevation (GLO-90, 100 coords por llamada) | AWS Terrain Tiles (Terrarium) | No | Probar los dos antes de fijar cliente (V-08) |
| Pendiente más fina (30 m) | OpenTopography COP30 o SRTMGL1 | Terrarium | Sí, gratis, 50 llamadas/día no académico | Solo para precargar la parcela demo |
| Textura y pH | SoilGrids por WCS | OpenLandMap-soildb (COG/STAC) | No | Probar WCS hoy (V-23); selector manual FAO-56 siempre |
| Pronóstico estacional | Open-Meteo Seasonal (SEAS5 + EC46) | Percentiles y tendencia propios | No | Capa opcional, banda de incertidumbre |
| Cultivos y calendario | FAO-56 + EcoCrop (copia en GitHub) + SIAP | Tabla propia | No | Sin API; JSON propio con fuente por valor |
| Extras NASA | `earthaccess` (GPM, SMAP), AppEEARS (MODIS NDVI) | GIBS para capas visuales | Cuenta Earthdata | Después de C1 |

## NASA POWER (columna vertebral)

Documentación: [power.larc.nasa.gov/docs/services/api](https://power.larc.nasa.gov/docs/services/api/), [diario](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), [OpenAPI diario](https://power.larc.nasa.gov/api/temporal/daily/openapi.json) (v2.10.3), [Swagger interactivo](https://power.larc.nasa.gov/api/pages/?urls.primaryName=Daily), [llms.txt](https://power.larc.nasa.gov/llms.txt).

- Endpoint: `GET https://power.larc.nasa.gov/api/temporal/daily/point`
- Obligatorios: `start` y `end` (YYYYMMDD, `start >= 19810101`), `latitude` (-90 a 90), `longitude` (-180 a 180), `community` (`AG`), `parameters` (códigos separados por coma).
- Opcionales: `format` (json, csv, netcdf, ...), `units` (metric por defecto), `time-standard` (`lst` por defecto; `utc` si se necesita), `site-elevation`, `wind-elevation`.
- Ejemplo:

```text
https://power.larc.nasa.gov/api/temporal/daily/point?start=20060101&end=20251231&latitude=18.0&longitude=-95.5&community=AG&parameters=PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M&format=json
```

(las coordenadas son ilustrativas, no la zona real de Isla)

- Sin autenticación. Máximo 20 parámetros por llamada puntual.
- Cobertura diaria: 1981 a casi tiempo real; latencia de 2 a 7 días según fuente. MERRA-2 consolidado se actualiza cada varios meses. Para tendencias, terminar el análisis dos meses antes del presente.
- Resolución: MERRA-2 de 0.5° x 0.625° (la parcela cabe en una celda). IMERG (`IMERG_PRECTOT`, mm/día) a 0.1°, solo UTC.
- Licencia CC BY 4.0. Hay que incluir la referencia del proyecto POWER y la referencia de datos (versión y fecha de consulta) según [docs/referencing](https://power.larc.nasa.gov/docs/referencing/). Texto base: "The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division."
- Límite de tasa: no hay cifra publicada. Responde 429; pedir la misma celda 0.5° muchas veces puede bloquear. Caché obligatoria y cola con reintentos en el backend.
- Códigos de estado: 200, 422 (validación), 429, 500, 503.

Sin verificar (hacer una llamada real antes de codificar):

- Probado el 14/11 (A0.7): `ALLSKY_SFC_SW_DWN` viene en MJ/m²/día. Ver `datos/pruebas-apis/LEEME.md`.
- Probado el 14/11 (A0.7): `GWETROOT`, `GWETTOP` y `GWETPROF` sí están en AG (y en SB), sin unidad (fracción). El endpoint diario solo acepta las comunidades RE, SB y AG; `HY` da 422. Falta decidir si entran al balance (V-06).
- Probado el 14/11 (A0.7): un GET simple devuelve `access-control-allow-origin: *`; el preflight `OPTIONS` da 404. Aun así, todo pasa por el backend, como ya está decidido (V-22).
- `PRECTOTCORR` es mm/día; el diario es un valor por día, el mensual es promedio mm/día.

## Open-Meteo (respaldo, ET0, elevación, pronóstico)

Atribución obligatoria (CC BY 4.0). Gratis solo no comercial, sin garantía de disponibilidad. Límites del plan abierto, según la [página de precios](https://open-meteo.com/en/pricing): 600 llamadas por minuto, 5 000 por hora, 10 000 por día, 300 000 por mes. Una petición con más de 10 variables o más de 2 semanas de datos para un punto cuenta como varias llamadas. Tomar 20 años diarios de un punto en una sola llamada gasta varias; cachear.

### Archivo histórico

[Documentación](https://open-meteo.com/en/docs/historical-weather-api). Endpoint: `https://archive-api.open-meteo.com/v1/archive` con `latitude`, `longitude`, `start_date`, `end_date`, `daily=...`, `timezone=auto`.

- Cobertura: ERA5 (0.25°) desde 1940, ERA5-Land (0.1°) desde 1950, con 5 días de retraso. Para consistencia multidecadal usar ERA5 o ERA5-Land, no "best match".
- Variables diarias confirmadas: `temperature_2m_max`, `temperature_2m_min`, `shortwave_radiation_sum` (MJ/m²), `et0_fao_evapotranspiration` (mm, FAO-56 Penman-Monteith), `wind_speed_10m_max`.
- Variables horarias confirmadas: `precipitation`, `soil_moisture_0_to_7cm`, `soil_moisture_7_to_28cm`, `soil_moisture_28_to_100cm`, `soil_moisture_100_to_255cm` (m³/m³).
- Aviso de la propia página: ERA5-Land no trae lluvia, radiación ni viento. Para lluvia usar ERA5. Probado el 14/11: `precipitation_sum` con `models=era5`; humedad de suelo diaria `soil_moisture_0_to_7cm_mean` (y 7-28, 28-100) con `models=era5_land`.
- La nota de proveedor dice que el archivo histórico no está en el plan Standard de pago; el plan abierto sí aplica para uso no comercial.

### Elevación

[Documentación](https://open-meteo.com/en/docs/elevation-api). `GET https://api.open-meteo.com/v1/elevation?latitude=a,b,c&longitude=x,y,z`. Hasta 100 coordenadas por llamada; respuesta `{"elevation": [...]}`. Datos Copernicus DEM GLO-90 (90 m). Acreditar a Copernicus y Open-Meteo (DOI 10.5270/ESA-c5d3d65). Una cuadrícula de 1 600 celdas son 16 llamadas.

### Pronóstico estacional (capa opcional, V-21)

[Documentación](https://open-meteo.com/en/docs/seasonal-forecast-api). Base: `https://seasonal-api.open-meteo.com/v1/seasonal`.

- Modelos: ECMWF Seasonal Seamless (EC46 los primeros 46 días, luego SEAS5), SEAS5, EC46; versiones de 51 miembros o media del ensamble. 36 km, global.
- Horizonte: por defecto 6 meses. Probado el 14/11 (A0.7): `forecast_days=210` devuelve 7 meses y el máximo es 217 días; `forecast_months` se ignora. El 9 de listas de terceros no se sostiene (V-21).
- Variables mensuales y semanales con **Mean y Anomaly** (precipitación, T2m, T máx y mín, radiación de onda corta, humedad de suelo en cuatro capas, evapotranspiración). La anomalía es pronóstico menos climatología del modelo (hindcasts ECMWF). Además hay probabilidades de anomalía y los índices EFI y Shift of Tails.
- Actualización: EC46 a diario; SEAS5 el día 5 de cada mes.
- No tiene corrección de sesgo. Se lee como "más seco o más húmedo que lo normal", nunca como milímetros. Coincide con la regla de banda de incertidumbre de [[Reglas]].
- Atribución: "based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF)".
- Probado el 14/11: `monthly=precipitation_mean,precipitation_anomaly,temperature_2m_mean,temperature_2m_anomaly` funciona (mm y K). El selector `models=` no se probó.

## Elevación alternativa

### AWS Terrain Tiles (Terrarium)

[Registro](https://registry.opendata.aws/terrain-tiles). Bucket público `elevation-tiles-prod` (us-east-1), sin cuenta ni llave. Ruta: `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png`. Decodificar: `elevacion_m = (R * 256 + G + B / 256) - 32768`. Exige atribución a Mapzen/Linux Foundation y a las fuentes del DEM. Sin SLA. Probado el 14/11: z15 responde 200 y z16 da 404 en la zona de prueba. Sirve para decodificar en el navegador o en el backend con Pillow.

### OpenTopography

[Términos](https://opentopography.org/usageterms), [API con llave](https://opentopography.org/blog/introducing-api-keys-access-opentopography-global-datasets). Global DEM API (SRTMGL1 30 m, COP30) y Point Elevation API. Llave gratuita: 50 llamadas por día para no académicos (la cifra académica aparece como 200 y como 250 en dos versiones de la misma página). La llave va en variable de entorno, nunca en el repo. Úsese para precargar el DEM de la parcela demo, no para el modo en vivo.

## Suelo (la fuente más débil, etiqueta `SUPUESTO`)

### SoilGrids (ISRIC)

[Acceso y FAQ](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html) (actualizada 27/01/2026), [WCS](https://docs.isric.org/globaldata/soilgrids/wcs.html) (04/12/2025).

- **Probado el 14/11 (A2.14):** el WCS responde para `clay`, `sand`, `silt` y `phh2o` (30 coberturas por mapa, p. ej. `clay_0-5cm_mean`). La reproyección a EPSG:4326 del servidor deja ceros en ventanas chicas: se pide en el CRS nativo (Homolosine, `+proj=igh`) y se convierte la coordenada con `pyproj`. Un 0 es "sin dato" (hay una franja de ~500 m sin dato junto a la parcela de prueba). Conversión: arena y arcilla g/kg ÷ 10 = %, pH ×10 ÷ 10 ([FAQ de ISRIC](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html)). Implementado en `api/app/clientes/isric.py`.
- La API REST sigue anunciada como **pausada** por problemas, sin fecha de regreso, y su política de uso es de 5 llamadas por minuto. No depender de ella. `VERIFICAR` si volvió desde enero.
- WCS: un servicio por propiedad, `https://maps.isric.org/mapserv?map=/map/<propiedad>.map`. Ejemplos documentados con `nitrogen.map`; `clay.map` y `sand.map` siguen el mismo patrón y `phh2o.map` se confirma con GetCapabilities.
- Cada servicio expone 24 coberturas (6 profundidades x 4 cuantiles). Patrón de ID: `<propiedad>_<profundidad>_<cuantil>`, por ejemplo `nitrogen_5-15cm_Q0.5`. `VERIFICAR` con GetCapabilities el ID exacto de la capa superficial y la media.
- Solicitudes:

```text
...mapserv?map=/map/clay.map&SERVICE=WCS&VERSION=2.0.0&REQUEST=GetCapabilities
...mapserv?map=/map/clay.map&SERVICE=WCS&VERSION=2.0.0&REQUEST=DescribeCoverage&COVERAGEID=<id>
...mapserv?map=/map/clay.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=<id>&FORMAT=GEOTIFF_INT16&SUBSET=X(a,b)&SUBSET=Y(c,d)&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/152160&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/152160
```

- CRS nativo: Homolosine (EPSG:152160). También publica EPSG:4326, pero el orden de ejes y los factores de escala de los enteros no están en la documentación. `VERIFICAR` ambos antes de convertir a textura o pH.
- Alternativa offline: VRT por WebDAV en `https://files.isric.org/soilgrids/latest/data/` (cada mapa pesa unos 5 GB; no para el hackathon).
- Licencia CC BY 4.0.

### Lluvia GPM IMERG por POWER (A4.10)

**Probado el 14/11:** `IMERG_PRECTOT` (mm/día, GPM IMERG, 0.1°) sale de la misma API diaria de POWER, **sin cuenta Earthdata**, pero solo con `time-standard=UTC` (en hora local devuelve `-999` en todo). Cada celda de 0.1° tiene su propia serie (a diferencia de MERRA-2, de 0.5° × 0.625°). Los últimos ~2 meses vienen en `-999` (→ `null`). Implementado en `api/app/clientes/power.py` y expuesto como `lluviaSatelital` en `GET /api/clima`. Evidencia, no entra al balance. Prototipo y hallazgos en `features/imerg/`.

### OpenLandMap

**Probado el 14/11 (A2.15):** el catálogo STAC es estático en `https://s3.eu-central-1.wasabisys.com/stac/openlandmap/catalog.json` (la web `stac.openlandmap.org` es solo un navegador). Las capas `clay.tot_iso.11277.2020.wpct`, `sand.tot_iso.11277.2020.wpct`, `silt.tot_iso.11277.2020.wpct`, `ph.h2o_iso.10390.2021.index` y `oc_iso.10694.1995.wpml` (OpenLandMap-soildb, 30 m, 0-30 cm, 2020-2022, CC-BY-4.0, DOI de cada capa 2020-2022 en Zenodo: arcilla 15528401, arena 15528413, limo 15528425, pH 15471105 y carbono 15535759 y 15535761 (el `doi` de la colección STAC apunta al período 2000-2005: no usarlo)) son COG de decenas de GB en `s3.opengeohub.org`; `rasterio` lee solo la ventana del punto por rangos HTTP (3 a 5 s por capa). Unidades: arcilla, arena y limo en % (escala 1, nodata 255), pH ×0.1 y carbono en g/kg ×0.1. Implementado en `api/app/clientes/openlandmap.py`.

El 250 m (v02) está en Google Earth Engine como clase de textura USDA y pH en agua a seis profundidades. El 30 m (OpenLandMap-soildb) tiene pH, carbono orgánico, densidad aparente y arcilla, arena y limo en 0-30, 30-60 y 60-100 cm, como COG, publicado en el catálogo STAC `stac.openlandmap.org` ([Zenodo](https://zenodo.org/records/15470432), [paper ESSD 2026](https://essd.copernicus.org/articles/18/989/2026/)). `VERIFICAR` colección STAC, ruta del COG y resolución real (las fuentes dan 0.00025° y 0.00075°). Los COG permiten leer solo la ventana de la parcela con `rasterio`.

Regla: cualquiera de las dos queda `SUPUESTO`; el selector manual FAO-56 sigue de respaldo.

## Cultivos y calendario (sin API)

- **FAO-56** ([x0490e](https://www.fao.org/4/x0490e/x0490e0a.htm)): Kc por etapa, ET0, agua del suelo por textura. Se carga a mano con cita por valor.
- **FAO EcoCrop**: la base se descontinuó hacia 2015 y la página `ecocrop.apps.fao.org` ya no responde (404). Copias utilizables: [OpenCLIM/ecocrop](https://www.github.com/openclim/ecocrop) (incluye `EcoCrop_DB.csv` completo), [climcropr](https://rdrr.io/github/AndySouth/climcropr/src/data-raw/setup_package_data.r) (raspado de 2017) y el [raspador](https://github.timelimit.workers.dev/supersistence/EcoCrop-ScrapeR). El portal vigente de FAO es el [Agro-informatics Data Catalog](https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en). `VERIFICAR` licencia y fecha de la copia antes de sembrar el catálogo; citar EcoCrop de FAO y la copia usada.
- **SIAP** (V-20): [datos abiertos agrícolas](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php). Producción por municipio desde 2003, con modalidad riego y temporal, en CSV. No encontré API documentada. Descarga manual del CSV, filtrar Isla, Veracruz, temporal, y guardar en `datos/`. Hay advertencias de inconsistencias en estos datos.
- **INEGI edafología** y **INIFAP**: contexto de suelo y calendarios; sin API.

## Extras NASA (después de C1)

- **earthaccess** ([docs](https://earthaccess.readthedocs.io/en/latest/user/quick-start/)): `pip install earthaccess`, Python 3.8 o superior. Cuenta gratis de Earthdata. Credenciales por `.netrc` o variables `EARTHDATA_USERNAME` y `EARTHDATA_PASSWORD` (nunca en el repo). Patrón: `earthaccess.search_data(short_name=..., bounding_box=..., temporal=(inicio, fin))` y `earthaccess.download(...)`. `VERIFICAR` los `short_name` de GPM IMERG diario (`GPM_3IMERGDF`) y SMAP L3 (`SPL3SMP_E`) con la búsqueda de colecciones de CMR.
- **GPM IMERG sin Earthdata (probado 14/11):** NASA POWER lo entrega como `IMERG_PRECTOT` (mm/día, 0.1°, desde 2000-06-01) en la API diaria de siempre, **solo con `time-standard=UTC`** (en hora local responde `-999` con el mensaje "IMERG Source Data is not available at the Local Solar Time"). Es evidencia, no entra al balance (A4.10). Hallazgos en `features/imerg/LEEME.md` (rama `Mompin-features`).
- **MODIS NDVI sin cuenta (probado 14/11):** REST de ORNL DAAC, `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=&longitude=&band=250m_16_days_NDVI&startDate=A2023145&endDate=A2023200&kmAboveBelow=0&kmLeftRight=0` con `Accept: application/json`; escala 0.0001; cita `doi:10.3334/ORNLDAAC/1600` (A4.11).
- **AppEEARS** ([API](https://appeears.earthdatacloud.nasa.gov/api/)): inicio de sesión `POST /api/login` (Basic con Earthdata, devuelve token Bearer de unas 48 h); muestras puntuales con `POST /api/task` (`task_type: "point"`, `params.dates`, `params.layers`, `params.coordinates` en EPSG:4326). Respuesta 202 con `task_id`; consultar `GET /api/task/{id}`. Para NDVI MODIS, `MOD13Q1.061` con capa `_250m_16_days_NDVI` (`VERIFICAR`: el nombre de capa vino de un resumen, no del texto literal). Es asíncrono; no sirve para el flujo en vivo del polígono.
- **GIBS / Worldview**: capas WMTS sin llave, ejemplo `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{fecha}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`. Hubo un reporte de tiles negros en la capa de color verdadero. `VERIFICAR` el ID de la capa de precipitación en el documento de capacidades. Decoración de mapa solamente; no alimenta el motor.

## Orden sugerido de pruebas (los pasos 1, 2, 3 y 5 ya se hicieron en A0.7, ver `datos/pruebas-apis/LEEME.md`; quedan el 4 y el 6)

1. POWER diario puntual con los 7 parámetros de arriba: unidades reales, `GWETROOT` en AG, un navegador con `fetch` para CORS.
2. Open-Meteo archivo con ERA5: nombres diarios exactos de lluvia y humedad de suelo; contar llamadas gastadas.
3. Open-Meteo elevación con 100 puntos y Terrarium con 1 tile: comparar para V-08.
4. SoilGrids WCS: `GetCapabilities` de `clay.map`, `sand.map` y `phh2o.map`, y una ventana de 1 km.
5. Open-Meteo estacional: nombres de parámetro, modelo y horizonte reales.
6. Guardar cada respuesta de prueba como paquete de demo en `datos/`, con coordenada, periodo, unidad y fecha de consulta (regla de trazabilidad).

## Atribuciones que deben salir en la interfaz y en la entrega

NASA POWER (referencia y fecha), Open-Meteo (CC BY 4.0), ECMWF (si se usa el estacional), Copernicus DEM y Open-Meteo (elevación), Mapzen/Terrain Tiles (si se usa), ISRIC SoilGrids (CC BY 4.0), FAO-56 y EcoCrop, SIAP.
