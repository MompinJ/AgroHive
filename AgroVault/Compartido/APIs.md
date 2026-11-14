---
tipo: referencia
audiencia: todas
actualizado: 2026-11-14
fuente: investigación web del 14/11/2026, páginas oficiales de cada proveedor
---

# APIs y documentación

Investigación para decidir qué fuentes usa el backend (`api/`, FastAPI) y el motor. No cierra pendientes: aporta evidencia a V-06, V-08, V-21, V-22 y V-23 (ver [[Pendientes]]). Todo lo marcado `VERIFICAR` no se pudo confirmar en la página oficial; se prueba con una llamada real antes de escribir el cliente. Las reglas de datos siguen en [[Reglas]] y los endpoints propios en [[Contratos]].

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

- `VERIFICAR` unidad de `ALLSKY_SFC_SW_DWN` (hay fuentes que dicen MJ/m²/día y otras kWh/m²/día; el bloque `parameters` de la respuesta trae la unidad). Es V-06.
- `VERIFICAR` si `GWETROOT`, `GWETTOP`, `GWETPROF` están en la comunidad AG. La página de comunidades ubica la humedad de suelo en HY. Consultar `/api/temporal/daily/configuration`. No usar humedad de suelo de POWER en el balance hasta probarlo (V-06).
- `VERIFICAR` CORS (V-22). Ninguna página lo declara. Por defecto todo pasa por el backend, como ya está decidido.
- `PRECTOTCORR` es mm/día; el diario es un valor por día, el mensual es promedio mm/día.

## Open-Meteo (respaldo, ET0, elevación, pronóstico)

Atribución obligatoria (CC BY 4.0). Gratis solo no comercial, sin garantía de disponibilidad. Límites del plan abierto, según la [página de precios](https://open-meteo.com/en/pricing): 600 llamadas por minuto, 5 000 por hora, 10 000 por día, 300 000 por mes. Una petición con más de 10 variables o más de 2 semanas de datos para un punto cuenta como varias llamadas. Tomar 20 años diarios de un punto en una sola llamada gasta varias; cachear.

### Archivo histórico

[Documentación](https://open-meteo.com/en/docs/historical-weather-api). Endpoint: `https://archive-api.open-meteo.com/v1/archive` con `latitude`, `longitude`, `start_date`, `end_date`, `daily=...`, `timezone=auto`.

- Cobertura: ERA5 (0.25°) desde 1940, ERA5-Land (0.1°) desde 1950, con 5 días de retraso. Para consistencia multidecadal usar ERA5 o ERA5-Land, no "best match".
- Variables diarias confirmadas: `temperature_2m_max`, `temperature_2m_min`, `shortwave_radiation_sum` (MJ/m²), `et0_fao_evapotranspiration` (mm, FAO-56 Penman-Monteith), `wind_speed_10m_max`.
- Variables horarias confirmadas: `precipitation`, `soil_moisture_0_to_7cm`, `soil_moisture_7_to_28cm`, `soil_moisture_28_to_100cm`, `soil_moisture_100_to_255cm` (m³/m³).
- Aviso de la propia página: ERA5-Land no trae lluvia, radiación ni viento. Para lluvia usar ERA5. `VERIFICAR` el nombre diario exacto de la lluvia (`precipitation_sum`) y de la humedad de suelo diaria con una llamada.
- La nota de proveedor dice que el archivo histórico no está en el plan Standard de pago; el plan abierto sí aplica para uso no comercial.

### Elevación

[Documentación](https://open-meteo.com/en/docs/elevation-api). `GET https://api.open-meteo.com/v1/elevation?latitude=a,b,c&longitude=x,y,z`. Hasta 100 coordenadas por llamada; respuesta `{"elevation": [...]}`. Datos Copernicus DEM GLO-90 (90 m). Acreditar a Copernicus y Open-Meteo (DOI 10.5270/ESA-c5d3d65). Una cuadrícula de 1 600 celdas son 16 llamadas.

### Pronóstico estacional (capa opcional, V-21)

[Documentación](https://open-meteo.com/en/docs/seasonal-forecast-api). Base: `https://seasonal-api.open-meteo.com/v1/seasonal`.

- Modelos: ECMWF Seasonal Seamless (EC46 los primeros 46 días, luego SEAS5), SEAS5, EC46; versiones de 51 miembros o media del ensamble. 36 km, global.
- Horizonte: la página dice "7 Months"; por defecto 6 meses. Esto responde a V-21: el tope documentado es **7 meses**, no 9. El 9 que circula viene de una lista de terceros.
- Variables mensuales y semanales con **Mean y Anomaly** (precipitación, T2m, T máx y mín, radiación de onda corta, humedad de suelo en cuatro capas, evapotranspiración). La anomalía es pronóstico menos climatología del modelo (hindcasts ECMWF). Además hay probabilidades de anomalía y los índices EFI y Shift of Tails.
- Actualización: EC46 a diario; SEAS5 el día 5 de cada mes.
- No tiene corrección de sesgo. Se lee como "más seco o más húmedo que lo normal", nunca como milímetros. Coincide con la regla de banda de incertidumbre de [[Reglas]].
- Atribución: "based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF)".
- `VERIFICAR` los nombres de parámetro de la API (la página solo muestra nombres de pantalla) y el selector de modelo. Probar con una llamada.

## Elevación alternativa

### AWS Terrain Tiles (Terrarium)

[Registro](https://registry.opendata.aws/terrain-tiles). Bucket público `elevation-tiles-prod` (us-east-1), sin cuenta ni llave. Ruta: `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png`. Decodificar: `elevacion_m = (R * 256 + G + B / 256) - 32768`. Exige atribución a Mapzen/Linux Foundation y a las fuentes del DEM. Sin SLA. `VERIFICAR` el zoom máximo (fuentes dicen 15 o 16). Sirve para decodificar en el navegador o en el backend con Pillow.

### OpenTopography

[Términos](https://opentopography.org/usageterms), [API con llave](https://opentopography.org/blog/introducing-api-keys-access-opentopography-global-datasets). Global DEM API (SRTMGL1 30 m, COP30) y Point Elevation API. Llave gratuita: 50 llamadas por día para no académicos (la cifra académica aparece como 200 y como 250 en dos versiones de la misma página). La llave va en variable de entorno, nunca en el repo. Úsese para precargar el DEM de la parcela demo, no para el modo en vivo.

## Suelo (la fuente más débil, etiqueta `SUPUESTO`)

### SoilGrids (ISRIC)

[Acceso y FAQ](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html) (actualizada 27/01/2026), [WCS](https://docs.isric.org/globaldata/soilgrids/wcs.html) (04/12/2025).

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

### OpenLandMap

El 250 m (v02) está en Google Earth Engine como clase de textura USDA y pH en agua a seis profundidades. El 30 m (OpenLandMap-soildb) tiene pH, carbono orgánico, densidad aparente y arcilla, arena y limo en 0-30, 30-60 y 60-100 cm, como COG, publicado en el catálogo STAC `stac.openlandmap.org` ([Zenodo](https://zenodo.org/records/15470432), [paper ESSD 2026](https://essd.copernicus.org/articles/18/989/2026/)). `VERIFICAR` colección STAC, ruta del COG y resolución real (las fuentes dan 0.00025° y 0.00075°). Los COG permiten leer solo la ventana de la parcela con `rasterio`.

Regla: cualquiera de las dos queda `SUPUESTO`; el selector manual FAO-56 sigue de respaldo.

## Cultivos y calendario (sin API)

- **FAO-56** ([x0490e](https://www.fao.org/4/x0490e/x0490e0a.htm)): Kc por etapa, ET0, agua del suelo por textura. Se carga a mano con cita por valor.
- **FAO EcoCrop**: la base se descontinuó hacia 2015 y la página `ecocrop.apps.fao.org` ya no responde (404). Copias utilizables: [OpenCLIM/ecocrop](https://www.github.com/openclim/ecocrop) (incluye `EcoCrop_DB.csv` completo), [climcropr](https://rdrr.io/github/AndySouth/climcropr/src/data-raw/setup_package_data.r) (raspado de 2017) y el [raspador](https://github.timelimit.workers.dev/supersistence/EcoCrop-ScrapeR). El portal vigente de FAO es el [Agro-informatics Data Catalog](https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en). `VERIFICAR` licencia y fecha de la copia antes de sembrar el catálogo; citar EcoCrop de FAO y la copia usada.
- **SIAP** (V-20): [datos abiertos agrícolas](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php). Producción por municipio desde 2003, con modalidad riego y temporal, en CSV. No encontré API documentada. Descarga manual del CSV, filtrar Isla, Veracruz, temporal, y guardar en `datos/`. Hay advertencias de inconsistencias en estos datos.
- **INEGI edafología** y **INIFAP**: contexto de suelo y calendarios; sin API.

## Extras NASA (después de C1)

- **earthaccess** ([docs](https://earthaccess.readthedocs.io/en/latest/user/quick-start/)): `pip install earthaccess`, Python 3.8 o superior. Cuenta gratis de Earthdata. Credenciales por `.netrc` o variables `EARTHDATA_USERNAME` y `EARTHDATA_PASSWORD` (nunca en el repo). Patrón: `earthaccess.search_data(short_name=..., bounding_box=..., temporal=(inicio, fin))` y `earthaccess.download(...)`. `VERIFICAR` los `short_name` de GPM IMERG diario (`GPM_3IMERGDF`) y SMAP L3 (`SPL3SMP_E`) con la búsqueda de colecciones de CMR.
- **AppEEARS** ([API](https://appeears.earthdatacloud.nasa.gov/api/)): inicio de sesión `POST /api/login` (Basic con Earthdata, devuelve token Bearer de unas 48 h); muestras puntuales con `POST /api/task` (`task_type: "point"`, `params.dates`, `params.layers`, `params.coordinates` en EPSG:4326). Respuesta 202 con `task_id`; consultar `GET /api/task/{id}`. Para NDVI MODIS, `MOD13Q1.061` con capa `_250m_16_days_NDVI` (`VERIFICAR`: el nombre de capa vino de un resumen, no del texto literal). Es asíncrono; no sirve para el flujo en vivo del polígono.
- **GIBS / Worldview**: capas WMTS sin llave, ejemplo `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{fecha}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`. Hubo un reporte de tiles negros en la capa de color verdadero. `VERIFICAR` el ID de la capa de precipitación en el documento de capacidades. Decoración de mapa solamente; no alimenta el motor.

## Orden sugerido de pruebas (para quien tome A0.7 y A2.14)

1. POWER diario puntual con los 7 parámetros de arriba: unidades reales, `GWETROOT` en AG, un navegador con `fetch` para CORS.
2. Open-Meteo archivo con ERA5: nombres diarios exactos de lluvia y humedad de suelo; contar llamadas gastadas.
3. Open-Meteo elevación con 100 puntos y Terrarium con 1 tile: comparar para V-08.
4. SoilGrids WCS: `GetCapabilities` de `clay.map`, `sand.map` y `phh2o.map`, y una ventana de 1 km.
5. Open-Meteo estacional: nombres de parámetro, modelo y horizonte reales.
6. Guardar cada respuesta de prueba como paquete de demo en `datos/`, con coordenada, periodo, unidad y fecha de consulta (regla de trazabilidad).

## Atribuciones que deben salir en la interfaz y en la entrega

NASA POWER (referencia y fecha), Open-Meteo (CC BY 4.0), ECMWF (si se usa el estacional), Copernicus DEM y Open-Meteo (elevación), Mapzen/Terrain Tiles (si se usa), ISRIC SoilGrids (CC BY 4.0), FAO-56 y EcoCrop, SIAP.
