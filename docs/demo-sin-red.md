# Demo sin red (A5.8)

Cómo correr la demo de Isla con la red apagada, qué funciona, qué se pierde y la evidencia. Probado el 14/11/2026 sobre `main` (2007104, contratos 0.10.0), con Chrome headless 1440 x 900 y 390 x 844.

## Cómo correrla

Desde la raíz del repo, con `api/.venv` creado (`python3 -m venv api/.venv && api/.venv/bin/pip install -r api/requirements-dev.txt`) y `npm ci` hecho en `web/`:

```bash
bash herramientas/demo-sin-red.sh              # API sin red en 127.0.0.1:8021 y front en http://127.0.0.1:4173/
bash herramientas/demo-sin-red.sh --solo-api   # solo la API, para probar endpoints con curl --noproxy "*"
bash herramientas/demo-sin-red.sh --recompilar # vuelve a compilar el front (usalo si cambió el front o el puerto)
```

El script **no apaga el wifi ni toca la red del sistema**. Bloquea la salida solo del proceso de la API: `herramientas/sin-red/sitecustomize.py` bloquea los sockets de Python a cualquier dirección que no sea loopback, y los proxies inválidos (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` a `127.0.0.1:9`, `NO_PROXY` vacío) bloquean a GDAL y libcurl. Antes de arrancar comprueba que una URL externa falla desde ese entorno y, si no falla, aborta. La caché de datos arranca vacía (directorio temporal), así que todo sale del paquete de demo (`datos/demo`, A2.4). No usa tokens: `EARTHDATA_TOKEN` se quita del entorno.

El front se compila con `VITE_API_URL` apuntando a la API local. En producción front y API comparten origen y esa variable queda vacía.

## Qué funciona sin red

Evidencia con la API sin red y caché vacía (`curl` a cada endpoint) y con el navegador (Playwright sobre Chrome, con un proxy inválido para todo lo que no sea local):

| Qué | Resultado |
| --- | --- |
| `GET /health` | 200 |
| `GET /api/clima` (Isla, 2005-10-01 a 2025-12-31) | 200, `EVALUABLE`, 7397 días, con `lluviaSatelital` (IMERG) del paquete, sin respaldo |
| `GET /api/suelo` (Isla) | 200, franco arcillo arenoso, TAW 122.3 mm/m, aviso `SUELO_SUPUESTO` |
| `POST /api/elevacion` (las 4 celdas de la parcela demo) | 200, `EVALUABLE`, 62.0, 63.3, 63.1 y 62.6 m |
| `GET /api/proxima-temporada` (Isla) | 200, `EXPLORATORIO`, 6 meses |
| `GET /api/cultivos` | 200, maíz, frijol, calabaza y chile |
| Demo de Isla en el navegador (inicio, terreno, laboratorio con la escena 3D, comparación, método y fuentes) | Las 5 pantallas cargan, sin errores de JavaScript y **sin ninguna petición a internet** (0 URLs externas intentadas) |
| Escena 3D (WebGL) en Chrome headless | Se ve: parcela de 4 celdas con losas de suelo y la mascota. El lienzo tiene contenido real, no está en blanco (en la muestra móvil, 800 colores distintos en 64 x 64) |
| Comparación | Ranking con R1, R2 y R4 (la demo de Isla) |
| Parcela propia **cerca de la demo** (polígono de 2 ha alrededor de (-95.53, 18.03)) | Elevación 200 `EVALUABLE` (Terrarium) y suelo, clima, cultivos y próxima temporada 200: salen de las mismas celdas del paquete |

Un dato que conviene saber: en la demo de Isla el navegador **no llama a la API**. El paquete de demo viaja dentro del front (`serie-clima` va como trozo aparte que baja solo al abrir el laboratorio), así que esa demo corre aunque la API no esté. La API local sirve para las parcelas propias.

## Qué se pierde sin internet

| Qué | Efecto visible |
| --- | --- |
| Teselas del mapa base de OpenStreetMap (`tile.openstreetmap.org`, mapa de "Dibujar mi parcela") | 18 peticiones a 1440 px (6 a 390 px), todas fallan. El mapa queda gris con el contorno y la cuadrícula dibujados, y la página avisa: "No se pudo cargar parte del mapa base. Puedes seguir usando las coordenadas." (captura 07) |
| Parcela propia **lejos de la demo** (probado con una forma de 1.6 ha en Madrid) | `POST /api/elevacion` da 503 con el motivo ("Terrarium y Open-Meteo no respondieron"). Con "Guardar sin elevación", el laboratorio pide suelo, clima y próxima temporada: las tres dan 503 y la pantalla muestra "No se pudieron cargar los datos", el motivo y el botón "Reintentar carga" (captura 08). No se inventa ningún dato |
| `GET /api/smap` | 503 con `ERROR_DATOS` y el motivo "falta la variable de entorno EARTHDATA_TOKEN". Es lo esperado: SMAP necesita red y token |
| `GET /api/ndvi` | 404 en `main` al momento de la prueba (A4.11 aún no está integrada). Cuando lo esté necesitará red salvo que el rango esté en el paquete de demo |
| Cualquier coordenada fuera de las celdas del paquete | `GET /api/clima` da 503 tras unos 6 s de reintentos, con el motivo de POWER y Open-Meteo |

Los enlaces a fuentes externas (NASA POWER, etc.) siguen en pantalla, pero no abren sin red.

## Capturas

En `docs/capturas/` (PNG de 128 colores, unos 700 KB en total). Escritorio 1440 x 900: `01-inicio`, `02-terreno`, `03-laboratorio`, `04-laboratorio-escena-3d`, `05-comparacion`, `06-metodo`, `07-poligono-sin-teselas-del-mapa` y `08-parcela-lejana-sin-red-error-visible`. Móvil 390 x 844: `09-inicio`, `10-laboratorio-escena-3d`, `11-comparacion` y `12-metodo`.

## Límites de esta prueba

- La red se simuló bloqueando la salida de la API (hook y proxies) y del navegador (proxy inválido); no se apagó el wifi. No se probó con la API en otra máquina ni con el wifi realmente apagado.
- Chrome headless con SwiftShader no es una GPU real: la fluidez de la escena y los requisitos mínimos son de A5.4.
- La pantalla de terreno todavía dice "El clima, la elevación y las propiedades del suelo están pendientes de integrar en esta pantalla", aunque la elevación ya se consulta al confirmar el contorno. Es un texto de la interfaz (balam), no de esta prueba.
- Las capturas son de pantalla visible, no de página completa.
