# datos/demo/

Paquete de demo sin internet (A2.4, base de A5.8). Es una **cache precargada** de la API: cuando a la API le falta su cache local, lee `datos/demo/cache/` (`AGROHIVE_DEMO_DIR`). Con eso responden sin red `GET /api/clima`, `POST /api/elevacion`, `GET /api/suelo` y `GET /api/proxima-temporada` para la parcela demo. No hay que cambiar nada en el front.

## Regenerar (necesita internet)

```bash
api/.venv/bin/python datos/demo/generar.py                 # usa contratos/ejemplos/parcela.ejemplo.json
api/.venv/bin/python datos/demo/generar.py --parcela ruta.json   # parcela con id, centroide y poligono
```

`manifiesto.json` dice cuando se genero, para que punto y que archivos trae.

## Lo que hay que saber

- **La parcela actual es ilustrativa.** Sale de `contratos/ejemplos/parcela.ejemplo.json` (coordenadas cerca de Isla, no una parcela real). Los datos son reales para esa coordenada. Hay que regenerarlo cuando A0.6 confirme la zona demo.
- **El front debe pedir exactamente** el periodo `2006-01-01` a `2025-12-31` y el centroide de la parcela (la cache se busca por celda de POWER, periodo y coordenada redondeada). Otra zona u otro periodo sin red da 503 con `ERROR_DATOS`, como siempre.
- **El pronostico estacional envejece.** Su entrada conserva la fecha en que se consulto: si pasa de 24 h y no hay red, la API lo sirve con la advertencia `ESTACIONAL_EN_CACHE` y `emitido` con esa fecha. No se hace pasar por reciente.
- Incluye los tiles de elevacion (Terrarium z14) de la parcela y su margen, no de otras zonas.
- Pesa unos 1.4 MB. Mientras el paquete este en `main`, el droplet lo usa al hacer `git pull`.
