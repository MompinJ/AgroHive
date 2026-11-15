# datos/demo/ejemplos/

**Parcelas de ejemplo mundiales** `[DECIDIDO]` (Mompin, 15/11): reemplazan a la demo de Isla. El usuario elige una o dibuja la suya. Son además el **respaldo sin red**: todo viene grabado de la API real y validado contra `contratos/`.

| Id | Lugar | País | Cultivos de ejemplo |
| --- | --- | --- | --- |
| `bajio-guanajuato` | Jaral del Progreso, Guanajuato (Bajío) | México | maíz, sorgo, frijol, girasol |
| `mato-grosso-sorriso` | Sorriso, Mato Grosso | Brasil | soya, maíz, algodón |
| `uasin-gishu-kenia` | Kesses, Uasin Gishu (Rift Valley) | Kenia | maíz, trigo, frijol, papa |
| `punjab-ludhiana` | Ludhiana, Punjab | India | trigo, maíz, papa |
| `tierra-de-campos-palencia` | Belmonte de Campos, Palencia (Castilla y León) | España | trigo, cebada, girasol, lenteja |
| `iowa-story` | Story County, Iowa | Estados Unidos | maíz, soya (además CDL y SSURGO) |

El clima de Köppen-Geiger de cada uno, la fecha de grabación y el estado de cada dato están en `indice.json`.

## Qué es y qué no es

- **Cada parcela es un polígono ficticio** de unas 2.8 ha (180 x 160 m con la esquina noreste cortada a 45°, celdas de 20 m), con `coordenadasIlustrativas: true` y el aviso "Parcela de ejemplo, no es un levantamiento". No es la parcela de nadie.
- **Está sobre tierra de cultivo real:** el centro se eligió en un bloque de unos 200 x 200 m donde todos los píxeles de ESA WorldCover 10 m 2021 v200 son clase 40 (Cropland); `manifiesto.json` guarda la fracción medida sobre el polígono (100 % en los seis). Cita: Zanaga, D. et al. (2022). ESA WorldCover 10 m 2021 v200. doi:10.5281/zenodo.7254221, CC BY 4.0, servido por Microsoft Planetary Computer. La ubicación administrativa sale de los límites de OpenStreetMap (Overpass, `is_in`).
- **Los cultivos sugeridos son ejemplos de la región**, del catálogo de 40, elegidos por el equipo; no son una estadística ni una recomendación. Se revisaron contra la presencia del calendario grabado: ninguno está `no_registrado` de temporal en el lugar (lo vigila `web/src/demo/ejemplos.test.ts`). Por eso el Bajío no sugiere trigo ni cebada (son de riego; SIAP no los registra de temporal en Jaral del Progreso) y Ludhiana no sugiere algodón. En Punjab falta el arroz (no está en el catálogo).
- **Los datos son reales** para esa coordenada: clima de NASA POWER (ventana estándar 2005-10-01 a 2025-12-31, con IMERG), elevación de Terrarium, suelo de ISRIC y OpenLandMap, próxima temporada de ECMWF SEAS5 vía Open-Meteo, calendario de `/api/calendario`, plagas de GBIF, NDVI de MODIS (toda la ventana), SMAP de los 10 días anteriores a la grabación, y CDL y SSURGO (solo Iowa; fuera de EE. UU. van `NO_EVALUABLE` sin llamar a la fuente).
- **Nada se inventa:** si una fuente no respondió al grabar, su archivo no existe y `manifiesto.json` dice `NO_EVALUABLE` con el motivo; el módulo de carga lo pasa a `avisos` y `faltan`.

## Archivos de cada ejemplo

| Archivo | Qué es |
| --- | --- |
| `parcela.json` | La parcela (contrato `parcela`) con la elevación y pendiente reales de cada celda |
| `respuestas/*.json` | El cuerpo de cada respuesta de la API tal cual: `serie-clima`, `suelo`, `terreno`, `proxima-temporada`, `calendario`, `plagas`, `ndvi`, `smap`, `cdl`, `ssurgo`. Lo que carga el front, sin red |
| `cache/` | La caché de la API para esa coordenada (`herramientas/demo-sin-red.sh` junta la de todos) |
| `manifiesto.json` | Fecha de grabación, ventana, versión del contrato, estado y contrato de cada dato, y la verificación de WorldCover |

## Cómo se usa en el front

`web/src/demo/ejemplos.ts`: `listarEjemplos()` (el índice) y `cargarEjemplo(id)`, que devuelve lo mismo que la rama `esDemo` de `ui/useLaboratorio.ts` (parcela, serie, suelo, capa, catálogo, tabla, calendario, avisos, avisosDatos), más la evidencia grabada y el clima de Köppen-Geiger con su bioma para la escena (`web/src/geo/koppen.ts`). Cada archivo es un trozo aparte: el navegador solo baja el del ejemplo elegido.

## Regrabar (necesita red, sin llaves)

```bash
api/.venv/bin/python herramientas/ejemplos/grabar.py                          # todos, todo (unos 5 min en paralelo)
api/.venv/bin/python herramientas/ejemplos/grabar.py --id iowa-story          # uno
api/.venv/bin/python herramientas/ejemplos/grabar.py --solo calendario        # solo el calendario de todos (y el indice)
api/.venv/bin/python herramientas/ejemplos/grabar.py --solo smap --paralelo 1 # SMAP de uno en uno (con 5 a la vez el servidor publico respondio 504)
api/.venv/bin/python herramientas/ejemplos/grabar.py --solo indice            # solo rearma indice.json
```

Lugares y geometría en `herramientas/ejemplos/lugares.json`. La cuadrícula y el clima del índice salen del código del front (`herramientas/ejemplos/front.ts`, compilado con Vite). SMAP necesita `EARTHDATA_TOKEN`; si no está en el entorno se pide al servidor público del equipo (`--servidor`). Después de regrabar: `ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion-ejemplos.test.ts` en `web/`, revisar el diff y anotarlo en `docs/01`.

## Límites

- El SMAP grabado es una foto: los 10 días anteriores a la grabación. El pronóstico estacional también envejece (`emitido` conserva su fecha).
- El píxel de NDVI (250 m) es mayor que la parcela; el suelo es una estimación de mapas globales (`SUPUESTO`).
- Pesan unos 3.8 MB cada uno (la mitad es la serie de clima, que va dos veces: en `respuestas/` para el front y en `cache/` para la API).
