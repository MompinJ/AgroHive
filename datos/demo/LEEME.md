# datos/demo/

Paquete de demo sin internet (A2.4, base de A5.8). Tiene dos formas del mismo contenido:

| Carpeta | Para que sirve |
| --- | --- |
| `cache/` | La **cache de la API**. Cuando a la API le falta su cache local, la lee (`AGROHIVE_DEMO_DIR`): con eso `GET /api/clima`, `POST /api/elevacion`, `GET /api/suelo` y `GET /api/proxima-temporada` responden sin red para la parcela demo. No hay que cambiar nada en el front |
| `respuestas/` | El **cuerpo de cada respuesta tal cual** (`serie-clima.json`, `suelo.json`, `terreno.json`, `proxima-temporada.json`), validado contra `contratos/`. El motor puede leerlos directo, sin la API |

`manifiesto.json` dice cuando se genero, para que punto, con que version del contrato y que archivos trae.

## Regenerar (necesita internet)

```bash
api/.venv/bin/python datos/demo/generar.py                       # usa contratos/ejemplos/parcela.ejemplo.json
api/.venv/bin/python datos/demo/generar.py --parcela ruta.json   # parcela con id, centroide, poligono y celdas
```

El script llama a la API por dentro, valida las 4 respuestas contra los schemas y **no escribe nada** si alguna no cumple o si una fuente cayo al respaldo. `api/tests/` vigila que el paquete committeado siga cumpliendo los contratos.

## Lo que hay que saber

- **Ventana de clima: `2005-10-01` a `2025-12-31`** (7 397 dias): 20 anios agricolas completos, porque el ciclo OI cruza el anio (pedido del motor). Es `servicios.VENTANA_ESTANDAR`. **El front debe pedir exactamente esas fechas** y el centroide de la parcela; otra zona u otro periodo sin red da 503 con `ERROR_DATOS`.
- **La zona es Isla (INEGI 30/077, A0.6) y la parcela es ficticia**: 2 ha de `contratos/ejemplos/parcela.ejemplo.json`, cuyo centroide `(-95.53, 18.03)` coincide con la localidad de Isla (`VERIFICAR` con INEGI o un mapa). Los datos son reales para esa coordenada.
- **Terreno:** `terreno.json` trae solo las 4 celdas de la parcela de ejemplo; la cache trae los tiles de elevacion de toda la zona y su margen, asi que el front puede mandar su propia cuadricula.
- **El pronostico estacional envejece.** Conserva la fecha en que se consulto: si pasa de 24 h y no hay red, la API lo sirve con la advertencia `ESTACIONAL_EN_CACHE` y `emitido` con esa fecha real.
- **El TAW del suelo de Isla es `NO_EVALUABLE`** (franco arcillo arenoso no tiene fila en FAO-56 Tabla 19) hasta que Mafer termine A2.16.
- Pesa unos 3 MB. Mientras el paquete este en `main`, el droplet lo usa al hacer `git pull`.
