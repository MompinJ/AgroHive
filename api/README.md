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
| `GET /api/ndvi?lat&lon&desde&hasta` | **Evidencia** (A4.11): NDVI de MODIS MOD13Q1 (pixel de 250 m, compuesto de 16 dias) por punto, del servicio REST de ORNL DAAC (sin cuenta). Maximo 400 dias. **No entra al ranking ni al balance.** Trae los tres limites que la interfaz debe mostrar (el pixel es mayor que la parcela, no muestra el cultivo del usuario, no entra al ranking) | `EXPLORATORIO` o `NO_EVALUABLE`; 503 |
| `GET /api/cultivos` | Catalogo de `datos/catalogos/cultivos.json`; sin catalogo responde `NO_EVALUABLE` | |

Documentacion interactiva en `/docs` y esquema en `/openapi.json`.

### NDVI de MODIS (A4.11)

> **Estado (14/11): bloqueado por el servicio.** ORNL DAAC no respondio de forma usable durante la sesion (502, 503 y llamadas de 40 s sin un byte). La ruta y el cliente estan escritos y probados con respuestas reales guardadas, pero **no se usan**: el paquete de demo no incluye NDVI (`datos/demo/generar.py --con-ndvi` lo agrega cuando el servicio responda) y el front no debe llamarla. Si ORNL no responde, `GET /api/ndvi` contesta 503 `ERROR_DATOS` visible, con un tiempo limite de 20 s por llamada.

`GET /api/ndvi` usa el servicio REST de ORNL DAAC (`modis.ornl.gov/rst/api/v1/MOD13Q1/subset`, cita `doi:10.3334/ORNLDAAC/1600`). Verificado el 14/11 contra el propio servicio:

- **Maximo 10 fechas por llamada** (la 11.a da 400, "exceeds maximum subset tiles support of 10"). Se piden ventanas alineadas de 144 dias (9 a 10 compuestos) y una consulta de un anio son 3 ventanas, cada una con dos llamadas (NDVI y calidad).
- **Relleno y rango** (de `/MOD13Q1/bands`): NDVI valido de -2000 a 10000, **relleno -3000**, escala 0.0001; calidad valida de 0 a 3, relleno -1. El relleno y todo valor fuera de rango salen como `null` con estado `NO_EVALUABLE` y motivo: **nunca 0, y nunca un NDVI negativo inventado** (-3000 escalado seria -0.3).
- **La calidad** (`pixel reliability`) se entrega tal cual, sin interpretarla.
- **El servicio es intermitente** (502 y 503): se reintenta hasta 3 veces; un tramo que no responde se dice (`NDVI_TRAMOS_SIN_LEER`) y no se rellena; si no responde nada, 503 `ERROR_DATOS`.
- **Cache por punto exacto y ventana**: dos puntos cercanos pueden caer en pixeles distintos. Una ventana sin calidad no se fija en cache.
- **Limites** (los tres, siempre): el pixel de 250 m es mayor que la parcela de 2 ha, no muestra el cultivo del usuario y no entra al ranking (no hay relacion publicada entre NDVI y los pilares del motor).

### Errores

Si ni la fuente principal, ni el respaldo, ni la cache responden: **503 con el cuerpo `{estado: "ERROR_DATOS", motivo}`** (el modelo `ErrorDatos` que declara el OpenAPI, sin envolver en `detail`). Un periodo o coordenada invalidos dan 422.

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
- Terreno: Terrarium z14 con interpolacion bilineal; respaldo Open-Meteo Elevation (90 m). La pendiente se calcula con diferencias finitas sobre la cuadricula. Si las celdas miden menos que el DEM, avisa con `RESOLUCION_DEM_GRUESA`.

## Desarrollo

```bash
cd api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
.venv/bin/python -m pytest -q          # sin red: las APIs se simulan con respuestas reales guardadas en datos/pruebas-apis/
```

Variables de entorno (ver `.env.example`; `EARTHDATA_TOKEN` solo para `/api/smap`, en el entorno del servicio y jamas en un archivo del repo): `AGROHIVE_CACHE_DIR`, `AGROHIVE_CATALOGOS_DIR`, `AGROHIVE_DEMO_DIR`, `AGROHIVE_CORS_ORIGINS`. No hay llaves ni tokens.

## Cliente TypeScript

```bash
.venv/bin/python exportar_openapi.py        # escribe openapi.json
cd cliente && npm install && npm run todo   # genera api.d.ts y comprueba que compila
```

`cliente/api.d.ts` es generado: no se edita a mano. Si cambias un modelo en `app/modelos.py`, regenera y sube ambos archivos.
