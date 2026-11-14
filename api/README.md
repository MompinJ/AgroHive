# api/

Backend FastAPI de AgroHive (carril de Eduardo). Hace de **proxy, cache y cliente de datos**: NASA POWER, Open-Meteo y elevacion. No simula ni rankea; el motor vive en el navegador (`web/src/motor/`).

URL publica: https://64-23-143-102.sslip.io (ver `AgroVault/Compartido/Servidor.md`).

## Endpoints

| Metodo y ruta | Que hace | Estados |
| --- | --- | --- |
| `GET /health` | Vida del API | |
| `GET /api/clima?lat&lon&desde&hasta` | Serie diaria de NASA POWER (comunidad AG), con cache. Respaldo Open-Meteo (ERA5) | `EVALUABLE`, `RESPALDO_HISTORICO`; 503 con `ERROR_DATOS` |
| `POST /api/elevacion` | Elevacion y pendiente por celda de una cuadricula ya generada (tope 1600 celdas) | `EVALUABLE`, `RESPALDO_HISTORICO`; 503 con `ERROR_DATOS` |
| `GET /api/suelo?lat&lon` | Textura (clase USDA y fracciones) y pH estimados de 0 a 30 cm con ISRIC SoilGrids por WCS. Siempre `SUPUESTO`. Sin dato: 503 y el front usa el selector manual | `EVALUABLE`; 503 con `ERROR_DATOS` |
| `GET /api/cultivos` | Catalogo de `datos/catalogos/cultivos.json`; sin catalogo responde `NO_EVALUABLE` | |

Documentacion interactiva en `/docs` y esquema en `/openapi.json`.

### Reglas que cumple

- Un dato faltante es `null`, nunca cero (POWER usa -999 como relleno: se convierte a `null`).
- La fuente de respaldo se ve siempre: `estado: RESPALDO_HISTORICO`, `respaldo: true` y una advertencia. Las series de POWER y de Open-Meteo no se mezclan: difieren en magnitud (ver `datos/pruebas-apis/LEEME.md`).
- Cache en `datos/cache/` (ignorada por git). Clave: centro de la celda MERRA-2 (0.5 x 0.625 grados) + periodo. Los periodos que terminan hace mas de 90 dias no caducan; los recientes duran 24 h.
- Las respuestas usan los nombres de `contratos/` (`meta`, `fuente`, `advertencias`, dia de `clima-escenario`). Los tests las validan contra esos schemas.
- Suelo: se pide el GeoTIFF en el CRS nativo de SoilGrids (Homolosine, via `pyproj`) porque la reproyeccion a 4326 del servidor deja ceros. En la zona de prueba hay una franja de ~500 m sin dato (el servicio la rellena con 0), asi que se usa la mediana de los pixeles con dato a menos de 1 km (3 km si no hay). El grupo arenoso/franco/arcilloso del selector es una propuesta pendiente de A1.6.
- Terreno: Terrarium z14 con interpolacion bilineal; respaldo Open-Meteo Elevation (90 m). La pendiente se calcula con diferencias finitas sobre la cuadricula. Si las celdas miden menos que el DEM, avisa con `RESOLUCION_DEM_GRUESA`.

## Desarrollo

```bash
cd api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
.venv/bin/python -m pytest -q          # sin red: las APIs se simulan con respuestas reales guardadas en datos/pruebas-apis/
```

Variables de entorno (ver `.env.example`): `AGROHIVE_CACHE_DIR`, `AGROHIVE_CATALOGOS_DIR`, `AGROHIVE_CORS_ORIGINS`. No hay llaves ni tokens.

## Cliente TypeScript

```bash
.venv/bin/python exportar_openapi.py        # escribe openapi.json
cd cliente && npm install && npm run todo   # genera api.d.ts y comprueba que compila
```

`cliente/api.d.ts` es generado: no se edita a mano. Si cambias un modelo en `app/modelos.py`, regenera y sube ambos archivos.
