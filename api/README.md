# api/

Backend FastAPI de AgroHive (carril de Eduardo). Hace de **proxy, cache y cliente de datos**: NASA POWER, Open-Meteo y elevacion. No simula ni rankea; el motor vive en el navegador (`web/src/motor/`).

URL publica: https://64-23-143-102.sslip.io (ver `AgroVault/Compartido/Servidor.md`).

## Endpoints

| Metodo y ruta | Que hace | Estados |
| --- | --- | --- |
| `GET /health` | Vida del API, version, version del contrato y **commit** desplegado (para verificar despliegues) | |
| `GET /api/clima?lat&lon&desde&hasta` | Serie diaria de NASA POWER (comunidad AG), con cache. Respaldo Open-Meteo (ERA5). **Incluye `lluviaSatelital`** (A4.10): lluvia GPM IMERG por dia desde POWER (`IMERG_PRECTOT`, celda de 0.1 grados), **evidencia** que no entra al balance ni a los escenarios | `EVALUABLE`, `RESPALDO_HISTORICO`; 503 con `ERROR_DATOS`. Trae `humedadRaizFraccionSat` (GWETROOT, fracción de saturación sin convertir) y el metadato `humedadSuelo` (V-06) |
| `POST /api/elevacion` | Elevacion y pendiente por celda de una cuadricula ya generada (tope 1600 celdas) | `EVALUABLE`, `RESPALDO_HISTORICO`; 503 con `ERROR_DATOS` |
| `GET /api/suelo?lat&lon` | Textura (clase USDA y fracciones) y pH estimados de 0 a 30 cm con ISRIC SoilGrids por WCS. Siempre `SUPUESTO`. Sin dato: 503 y el front usa el selector manual | `EVALUABLE` o `EXPLORATORIO` (si el dato viene de píxeles a más de 1 km); 503 con `ERROR_DATOS`. Devuelve `agua` con el TAW y la `retencion` (thetaSat, thetaFC, thetaWP) por Saxton y Rawls (2006), y `estimaciones` (ISRIC a 250 m y OpenLandMap a 30 m, para compararlas) y `estimacionUsada` (ISRIC; OpenLandMap si ISRIC falla), con carbono orgánico |
| `GET /api/proxima-temporada?lat&lon` | Capa opcional (A2.13, parte del backend): banda p10 a p90 por mes para 6 meses (horizonte fijo del contrato, V-21). **No es una prediccion** y no trae cifra unica | `EXPLORATORIO`; 503 si no hay clima historico |
| `GET /api/smap?lon&lat&desde&hasta` | **Contraste informativo** (A4.8): humedad del suelo superficial (~5 cm) de NASA SMAP L3 a 36 km, por dia y por pase AM/PM, con la bandera de calidad tal cual. Maximo 10 dias, hasta hoy menos 3. **No entra al ranking ni al balance.** Necesita el token `EARTHDATA_TOKEN` (variable de entorno, nunca en el repo); sin el responde 503 `ERROR_DATOS` visible. ~20 s por dia (lectura por rangos HTTP), con cache por celda y dia | `EVALUABLE` o `NO_EVALUABLE`; 503 |
| `GET /api/ndvi?lat&lon&desde&hasta` | **Evidencia** (A4.11): NDVI de MODIS MOD13Q1 V061 (pixel de 250 m, compuesto de 16 dias) por punto. La demo lee el paquete o la cache. Si falta, se lee de Microsoft Planetary Computer (producto NASA LP DAAC). Cita: Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA EOSDIS Land Processes DAAC. doi:10.5067/MODIS/MOD13Q1.061. Datos servidos por Microsoft Planetary Computer. Maximo 400 dias. **No entra al ranking ni al balance.** Trae los tres limites que la interfaz debe mostrar | `EXPLORATORIO` o `NO_EVALUABLE`; 503 |
| `GET /api/plagas?lat&lon` | **Evidencia** (contratos 0.15.0): para las plagas de `datos/plagas/plagas.json` (gusano cogollero, gusano elotero, mosca blanca, chapulín de la milpa, diabrótica, pulgón del algodón), cuántos registros de presencia tiene GBIF (Occurrence Search, sin llave) en una caja de ±1.5° alrededor del punto desde 2000, y el año más reciente. Cultivos hospederos con su fuente (EPPO o literatura) o vacíos si no hay fuente verificada. Caché de 30 días; si GBIF falla para una plaga, esa va `NO_EVALUABLE` sin conteo; si falla para todas, 503. **No es pronóstico de daño ni entra al motor o al ranking**; la interfaz lo usa para la capa ilustrativa de plagas | `EVALUABLE` o `NO_EVALUABLE`; 503 |
| `GET /api/ee-uu/cdl?lat&lon&desde&hasta` | **Contraste regional** (A4.12): cultivo de cada anio (2008 a 2025) en el pixel de 30 m del punto, de USDA NASS Cropland Data Layer por el servicio CropScape: la rotacion real que hubo ahi. Solo EE. UU. contiguos; fuera, `NO_EVALUABLE` sin llamar a la fuente. La categoria va tal cual; `cultivoCatalogo` solo si coincide exacto (Corn, Dry Beans, Squash, Peppers). **No entra al ranking** | `EVALUABLE` o `NO_EVALUABLE`; 503 |
| `GET /api/ee-uu/ssurgo?lat&lon` | **Contraste regional** (A4.12): suelo de campo de USDA NRCS SSURGO (Soil Data Access), componente dominante de la unidad del punto, con horizontes (arena, limo, arcilla, materia organica, awc) y agua disponible hasta 100 cm (suma de awc_r x espesor; si falta dato no se extrapola). No sustituye a `/api/suelo`. **No entra al ranking** | `EVALUABLE` o `NO_EVALUABLE`; 503 |
| `GET /api/cultivos` | Catalogo de `datos/catalogos/cultivos.json` (contratos 0.16.0: cada cultivo con `nombreComunEn` opcional, que se pasa tal cual; sin el campo no se manda `null`); sin catalogo, 503 `ERROR_DATOS` (H-B8: un catalogo vacio no cumple el contrato) | 503 |
| `GET /api/calendario?lat&lon` | Calendario de siembra del punto (A4.13), base MUNDIAL (15/11): en cualquier coordenada, tambien en Mexico, ventana de temporal de GGCMI fase 3 (dia de siembra; 15 cultivos, madurez y duracion en la nota) y de MIRCA2000 (mes de inicio de Pulses para caupi, haba y lenteja, `SUPUESTO`); presencia de MIRCA2000 fuera de Mexico; en los 57 paises de FAO Crop Calendar, sus ventanas nacionales van encima (CC BY-NC-SA 4.0, advertencia `FAO_CROP_CALENDAR_NC_SA`); los demas, `NO_EVALUABLE` con motivo. `CALENDARIO_RESUMEN` da el conteo del punto. En Mexico, la presencia de SIAP (cierre agricola municipal 2021-2025, temporal) de cada municipio reemplaza el `sin_dato`, con las claves INEGI en la ubicacion; en Isla (30/077), las ventanas de INIFAP mandan. Lee los extractos `datos/calendario/ggcmi-rf.npz`, `mirca-rf.npz`, `siap-mexico.*` y `fao-crop-calendar/fao-crop-calendar.json` (unos 50 MB en memoria; se regeneran con los scripts `extraer_*.py` de esa carpeta). Sin pais en el mapa de 110 m: 422 | `calendario-local` |

Documentacion interactiva en `/docs` y esquema en `/openapi.json`.

### NDVI de MODIS (A4.11)

`GET /api/ndvi` entrega el NDVI de MODIS **MOD13Q1 V061** (Terra, pixel de 250 m, compuesto de 16 dias) del punto, como **evidencia**: no entra al ranking ni al balance. Los datos son de NASA LP DAAC y, si no estan en la cache ni en el paquete, se leen de los COG de **Microsoft Planetary Computer** (coleccion `modis-13Q1-061`), sin cuenta. Cita exacta: Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA EOSDIS Land Processes DAAC. doi:10.5067/MODIS/MOD13Q1.061. Datos servidos por Microsoft Planetary Computer.

**Por que Planetary Computer y no ORNL DAAC.** El servicio REST de ORNL DAAC no respondio de forma usable el 14/11 (502, 503 y llamadas de 40 s sin un byte), asi que se sustituyo. Es el **mismo producto y los mismos pixeles**: las cuatro fechas comparadas en Isla (A2023145, A2023161, A2023177, A2023193) dieron igual NDVI y calidad en los dos (3279/1, 3378/0, 4053/3, 3921/3); la prueba `test_validacion_cruzada_con_ornl...` lo conserva con los datos de ORNL guardados.

Como funciona y que se verifico:

- **Catalogo STAC publico** (`/api/stac/v1/search`, `intersects` con el punto) y un **token anonimo de lectura** por contenedor (`/api/sas/v1/token/modiseuwest/modis-061-cogs`); sin el, el archivo responde 409. El pixel se lee por rangos HTTP con `rasterio` (unos 2 s por banda). El token SAS y la URL firmada **no** se guardan: viven en memoria y no llegan a la respuesta, a la cache ni a los logs (hay pruebas). Un solo token se comparte entre ventanas.
- **Respaldo:** la cache local y, si no, el paquete de demo (`datos/demo/cache/` y `datos/demo/respuestas/ndvi.json`). Una ventana historica ya guardada no vuelve a pedir el catalogo. El front de la demo usa ese paquete o la cache; no llama a Planetary Computer. ORNL DAAC no es un respaldo en vivo (sigue caido); quedan las cuatro fechas de validacion cruzada.
- **Solo Terra.** La coleccion mezcla Terra (MOD13Q1) y Aqua (MYD13Q1) intercalados cada 8 dias; el contrato pide MOD13Q1, asi que Aqua se descarta.
- **Escala y relleno:** la escala es la del STAC (0.0001); `rasterio` reporta 10000 (convencion de HDF), que no se usa. El archivo declara su relleno (NDVI -3000, calidad 255). El relleno y todo valor fuera del rango valido (-2000 a 10000) salen como `null` con estado `NO_EVALUABLE` y motivo: **nunca 0, y nunca un NDVI inventado** (-3000 escalado seria -0.3).
- **La calidad** (`pixel reliability`, 0 a 3) se entrega tal cual, sin interpretarla.
- **Fallas que no se esconden:** un compuesto cuyo pixel no se pudo leer sale `ERROR_DATOS` (advertencia `NDVI_COMPUESTOS_CON_ERROR`); un tramo cuyo catalogo no respondio se dice (`NDVI_TRAMOS_SIN_LEER`); una ventana incompleta no se fija en cache; si nada responde, 503 `ERROR_DATOS`.
- **Cache por punto exacto y ventana** de 144 dias alineada desde 2000-01-01: dos puntos cercanos pueden caer en pixeles distintos. Maximo 400 dias por consulta.
- **Limites** (los tres, siempre): el pixel de 250 m es mayor que la parcela de 2 ha, no muestra el cultivo del usuario y no entra al ranking.
- **Licencia:** el STAC de la coleccion marca `proprietary`; los datos son de NASA LP DAAC alojados por Microsoft. `[VERIFICAR]` una persona lee https://planetarycomputer.microsoft.com/terms antes de la entrega final. Desde contratos 0.12.2 la descripcion de `contratos/ndvi.schema.json` cita Planetary Computer y Didan (2021); ORNL queda como respaldo que no se llama en vivo.

### Errores

Si ni la fuente principal, ni el respaldo, ni la cache responden: **503 con el cuerpo `{estado: "ERROR_DATOS", motivo}`** (el modelo `ErrorDatos` que declara el OpenAPI, sin envolver en `detail`). Un periodo o coordenada invalidos dan 422.

**Tiempos (H-B6, `[DECIDIDO]` por Mompin el 14/11):** 20 s por intento (`http.TIEMPO_INTENTO_S`) y 2 intentos por fuente (`http.INTENTOS`). Ademas, `http.plazo()` fija 70 s en total por peticion (`http.PLAZO_TOTAL_S`) en `/api/clima`, `/api/suelo`, `/api/elevacion` y `/api/proxima-temporada`. Ningun intento ni espera pasa de ese plazo: si una fuente se cuelga, se pasa al respaldo y despues a la cache, todo dentro de los 90 s que espera el front. OpenLandMap lee en hilos de GDAL que no se pueden cancelar; `/api/suelo` deja de esperarlo al agotarse el plazo y responde con ISRIC. NDVI, SMAP y EE. UU. conservan sus tiempos propios.

**Avisos de cache:** `CLIMA_RESPALDO_EN_CACHE` (Open-Meteo guardado), `CACHE_VENCIDA` (POWER guardado), `IMERG_EN_CACHE` y `NDVI_EN_CACHE` (H-B11: una ventana de MODIS vencida que se reutiliza porque Planetary Computer no respondio).

**Calendario en la costa (H-B10):** si el punto no cae en ningun pais de Natural Earth 1:110m, se toma el mas cercano a 25 km o menos, solo si no hay otro a esa distancia, con la advertencia `PAIS_POR_CERCANIA`. Boca del Rio queda a 1.4 km del poligono de Mexico. Ver `datos/calendario/LEEME.md`.

### Reglas que cumple

- Un dato faltante es `null`, nunca cero (POWER usa -999 como relleno: se convierte a `null`).
- La fuente de respaldo se ve siempre: `estado: RESPALDO_HISTORICO`, `respaldo: true` y una advertencia. Las series de POWER y de Open-Meteo no se mezclan: difieren en magnitud (ver `datos/pruebas-apis/LEEME.md`).
- Paquete de demo (A2.4): si falta la cache local, la API lee `datos/demo/cache/` y responde sin red para la parcela demo; ver `datos/demo/LEEME.md`. La ventana estandar de clima es `2005-10-01` a `2025-12-31` (`servicios.VENTANA_ESTANDAR`, pedida por el motor).
- Cache en `datos/cache/` (ignorada por git). Clave: centro de la celda MERRA-2 (0.5 x 0.625 grados) + periodo. Los periodos que terminan hace mas de 90 dias no caducan; los recientes duran 24 h.
- Las respuestas usan los nombres de `contratos/` y los tests validan el documento completo contra `serie-clima`, `suelo`, `proxima-temporada`, `cultivo` y `parcela` (elevacion). Los modelos de `app/modelos.py` son tan estrictos como los schemas (`esEjemplo`, `etiqueta` y `estado` obligatorios; `clase` de textura solo las 12 clases USDA).
- Proxima temporada: distribucion historica de cada mes (20 anios de POWER) desplazada por la anomalia mensual de SEAS5 (Open-Meteo, `forecast_days=210`). El ancho de la banda es la variabilidad historica, no la dispersion del ensamble: las variables verificadas del servicio no la entregan. Sin tendencia. Si el pronostico no responde, cae a `respaldo_estadistico` (percentiles sin desplazar). Con menos de 10 anios completos de un mes, la banda es `null`, no un numero.
- Suelo: se pide el GeoTIFF en el CRS nativo de SoilGrids (Homolosine, via `pyproj`) porque la reproyeccion a 4326 del servidor deja ceros. En la zona de prueba hay una franja de ~500 m sin dato (el servicio la rellena con 0), asi que se usa la mediana de los pixeles con dato a menos de 1 km (3 km si no hay). El grupo (arenoso, franco, arcilloso) y el TAW salen de `datos/catalogos/suelos.json` (A1.6, de Mafer) si el archivo existe; si no, el grupo usa una copia de esa tabla y el TAW queda `NO_EVALUABLE`. Tres clases USDA no tienen fila en FAO-56 Tabla 19 (franco arcillo arenoso, franco arcilloso, arcillo arenoso): su TAW sale `NO_EVALUABLE` con el motivo de la tabla, nunca el de un grupo vecino.
- Agua del suelo (A2.16 de Mafer conectada aqui): `app/pedotransferencia.py` carga `datos/catalogos/saxton_rawls.py` (una sola fuente de verdad) y le pasa arena, arcilla y materia organica de la estimacion usada, cada una con su fuente. La materia organica sale del carbono organico (`C g/kg / 10 x 1.724`, la materia organica contiene 58 % de C; cita verificada en ISRIC Report 2023/01, p. 25). Saxton-Rawls va primero porque entrega **la retencion** que el motor necesita para convertir GWETROOT (fraccion de saturacion) a fraccion de TAW; la tabla FAO-56 queda de respaldo (solo TAW). Con una estimacion EXPLORATORIA o sin carbono, el TAW es `NO_EVALUABLE` con su motivo; nunca se toma el valor de otra clase.
- OpenLandMap-soildb (A2.15): capas COG de 30 m (arcilla, arena, limo, pH y carbono, 0 a 30 cm, 2020-2022) leidas por rangos HTTP con `rasterio`, sin descargar los archivos (cientos de GB); las URLs salen del catalogo STAC. Tarda unos 12 s en frio y queda en cache. Es una segunda opinion: si falla, `/api/suelo` responde solo con ISRIC y una advertencia.
- Fechas en hora de la sede: `config.hoy()` (UTC-6 fijo, America/Mexico_City sin horario de verano desde 2022) da el `consultado` de las fuentes, el "hoy" de los limites de periodo y el mes de la proxima temporada, aunque el servidor corra en UTC. Solo SMAP usa la fecha UTC para decidir si un granulo ya deberia estar publicado, porque sus granulos son dias UTC.
- Terreno: Terrarium z14 con interpolacion bilineal; respaldo Open-Meteo Elevation (90 m). La pendiente se calcula con diferencias finitas sobre la cuadricula. Si las celdas miden menos que el DEM, avisa con `RESOLUCION_DEM_GRUESA`.

## Desarrollo

```bash
cd api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
.venv/bin/python -m pytest -q          # sin red: las APIs se simulan con respuestas reales guardadas en datos/pruebas-apis/
```

Variables de entorno (ver `.env.example`; `EARTHDATA_TOKEN` solo para `/api/smap`, en el entorno del servicio y jamas en un archivo del repo): `AGROHIVE_CACHE_DIR`, `AGROHIVE_CATALOGOS_DIR`, `AGROHIVE_DEMO_DIR`, `AGROHIVE_CORS_ORIGINS`, `AGROHIVE_PLAGAS_TABLA`. No hay llaves ni tokens.

## Cliente TypeScript

```bash
.venv/bin/python exportar_openapi.py        # escribe openapi.json
cd cliente && npm install && npm run todo   # genera api.d.ts y comprueba que compila
```

`cliente/api.d.ts` es generado: no se edita a mano. Si cambias un modelo en `app/modelos.py` o una ruta, regenera y sube ambos archivos; `tests/test_hallazgos_back.py` falla si `openapi.json` no coincide con la app.
