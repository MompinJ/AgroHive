# 01 · Registro de cambios

Toda edición de esta carpeta se anota aquí. No borrar entradas anteriores.

## Formato de entrada

```text
Fecha: AAAA-MM-DD
Archivos:
Cambio y motivo:
Fuente / evidencia:
Decisiones afectadas:
```

### 2026-11-14 — A2.5, A2.6 y A2.7: motor de agua y escenarios (Mompin)

- **Archivos:** `web/src/motor/` (escenarios, ET0, cultivo y Kc, cubeta, suelo, estados, motor, protocolo y Web Worker, cliente; pruebas en `web/src/motor/pruebas/` con un fixture real de POWER), `web/package.json` (vitest 5.1.0 y script `test`), `docs/05`, `docs/04`, `docs/13`, `docs/14`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **Decisión `[DECIDIDO]` (Mompin, 14/11) sobre los escenarios:** el percentil p10 / p50 / p90 se calcula sobre la **lluvia de las temporadas de siembra PV y OI**, no del año calendario. **Ventanas:** año agrícola de SIAP, con OI = siembras de octubre de *t*-1 a marzo de *t* y PV = siembras de abril a septiembre de *t*; la lluvia del año *t* es la suma del 1 de octubre de *t*-1 al 30 de septiembre de *t*. Fuente: SIAP, *Normatividad Técnica para la Generación de Estadística Básica Agropecuaria 2022*, p. 10, p. 20 (Cuadro No. 1) y p. 46. **Percentil:** definición 7 de Hyndman y Fan (1996), sobre los años con las dos temporadas completas (mínimo 10, doc 04). **Desempate:** año más cercano al percentil; si dos quedan a la misma distancia (menos de 0.05 mm) gana el más antiguo, y siempre se declara el segundo más cercano. La serie del escenario cubre los 18 meses del año agrícola de SIAP (oct *t*-1 a mar *t*+1).
- **Resultado con datos reales** (POWER, celda de la parcela demo, 2006-2025): seco 2023, habitual 2016, lluvioso 2024 (2025 queda a 2 mm de 2024).
- **Cambio (A2.6):** ET0 Penman-Monteith FAO-56 desde POWER (Hargreaves si faltan variables, ET0 de Open-Meteo si viene), Kc por la curva FAO-56 y cubeta FAO-56 cap. 8 con TAW del suelo y p del cultivo. Cada ciclo se simula en su temporada dentro del año agrícola del escenario (A2.8); las fechas de `resultado-celda` son las del plan.
- **Cambio (A2.7):** pilar de déficit hídrico y estados de evaluabilidad (`ERROR_DATOS` > `NO_EVALUABLE` > `EXPLORATORIO` > `RESPALDO_HISTORICO` > `EVALUABLE`), con salida validada contra `resultado-rotacion` y `resultado-celda`.
- **Supuestos declarados en el resultado:** cada ciclo arranca a capacidad de campo (FAO-56 cap. 8) hasta que A2.16 dé θsat y θFC para convertir GWETROOT (la conversión ya está en el motor); sin escurrimiento por pendiente hasta A3.7; Kc sin ajuste climático (falta la altura del cultivo); `estadoPlanta` nunca `podrida` (sin umbral con fuente).
- **Fuente / evidencia:** 45 pruebas en verde (`cd web && npm test`), entre ellas las pruebas 1 a 5 de doc 05 (la parte de erosión de la 2 queda como `todo` para A3.7) y los ejemplos 2, 3, 8 y 18 de FAO-56.
- **Decisiones afectadas:** doc 05, paso 1 (de `[PROPUESTA]` a `[DECIDIDO]`); doc 04, escenarios; doc 13, fila nueva "Escenarios (A2.5)". Pedido a A2.4: que la serie de la demo empiece el 2005-10-01 para tener 20 años agrícolas.

### 2026-11-14 — API: suelo con la tabla de A1.6 y CORS para el front (Eduardo)

- **Archivos:** `api/app/textura.py`, `api/app/servicios.py`, `api/app/modelos.py`, `api/app/config.py`, pruebas, `api/README.md`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** `GET /api/suelo` toma el grupo y el TAW de `datos/catalogos/suelos.json` (Mafer, A1.6) cuando el archivo esta presente, en vez de mi propuesta de agrupamiento (que difería: ahora `franco_arenoso` es `franco` y `franco_arcillo_arenoso` es `arcilloso`). CORS acepta `127.0.0.1:5173` ademas de `localhost`, porque `npm run dev` de balam sirve en `127.0.0.1`.
- **Hallazgo para el equipo:** el suelo de la zona de prueba de Isla (franco arcillo arenoso) y otras zonas medias caen en clases **sin fila en FAO-56 Tabla 19**, asi que su TAW es `NO_EVALUABLE`. Sin TAW el motor no puede hacer el balance de agua con el suelo del mapa; solo con el selector manual (arena franca, franco, arcilla). No lo resolvi: es una decision agronomica (ver Pendientes).
- **Fuente / evidencia:** probado con el `suelos.json` real de la rama `Mafer`; 39 pruebas.

### 2026-11-14 — A2.13 proxima temporada aproximada, parte del backend (Eduardo)

- **Archivos:** `api/app/proxima.py`, `api/app/rutas/proxima.py`, cliente estacional en `api/app/clientes/openmeteo.py`, pruebas, `docs/14`.
- **Cambio:** `GET /api/proxima-temporada?lat&lon` entrega el contrato `proxima-temporada`: banda p10 a p90 por mes, 7 meses, `esPrediccion: false`, sin cifra unica.
- **Metodo (decision mia, a confirmar por el equipo):** el pronostico estacional de Open-Meteo no entrega miembros ni dispersion en las variables probadas, asi que no se usa el ensamble para el ancho. La banda es la distribucion historica de cada mes (20 anios de POWER) desplazada por la anomalia mensual de SEAS5. Respaldo: la misma distribucion sin desplazar. No incluye tendencia (advertencia `SIN_TENDENCIA`). La anomalia es respecto de ECMWF y se suma a la climatologia de POWER, que no coinciden en magnitud (advertencia).
- **Fuente / evidencia:** `monthly=precipitation_anomaly,temperature_2m_anomaly&forecast_days=210&models=ecmwf_seas5` probado en vivo (7 meses); 36 pruebas, el documento completo se valida contra `contratos/proxima-temporada.schema.json`.
- **Pendiente:** la parte del motor (A2.13, Mompin) y la interfaz (A4.9, balam). V-21 queda con evidencia: 7 meses.

### 2026-11-14 — A2.14 textura y pH estimados (Eduardo)

- **Archivos:** `api/app/clientes/isric.py`, `api/app/textura.py`, `api/app/rutas/suelo.py`, pruebas, `docs/04` y `docs/14`.
- **Cambio:** `GET /api/suelo?lat&lon` devuelve el contrato `suelo` con textura (clase USDA y fracciones) y pH de 0 a 30 cm desde SoilGrids por WCS, siempre `SUPUESTO`. `agua.tawMmPorM` queda `NO_EVALUABLE` hasta la tabla de A1.6. Sin dato responde 503 y el front usa el selector manual.
- **Fuente / evidencia:** WCS de ISRIC probado en vivo (Isla: franco arcillo arenoso, pH 5.4; datos reales guardados en `datos/pruebas-apis/respuestas/`); conversion de unidades de la FAQ de ISRIC; clase textural con el triangulo USDA (probado sobre las 5 151 combinaciones posibles).
- **Pendiente de otros:** el grupo arenoso/franco/arcilloso del selector es una propuesta mia y debe coincidir con la tabla de suelos de Mafer (A1.6).
- **Decisiones afectadas:** V-23 (el WCS de ISRIC responde; OpenLandMap queda de respaldo sin implementar).

### 2026-11-14 — A1.3, A2.1, A2.2 y A2.3: API FastAPI (Eduardo)

- **Archivos:** `api/` (app, tests, README, cliente TypeScript generado), `docs/14-CRONOGRAMA.md` (marcas).
- **Cambio:** `GET /health`, `GET /api/clima` (NASA POWER con cache y respaldo Open-Meteo), `POST /api/elevacion` (Terrarium con respaldo Open-Meteo y pendiente por celda), `GET /api/cultivos` (lee `datos/catalogos/cultivos.json`). OpenAPI exportado y tipos TS generados en `api/cliente/`.
- **Decisiones tomadas dentro de mi carril, a confirmar por el equipo:** (1) la cache usa el centro de la celda MERRA-2 como clave (verificado: puntos de la misma celda dan la misma serie); (2) `/api/clima` devuelve la serie del periodo y **no** elige escenarios (eso es A2.5, del motor); (3) la elevacion sale de Terrarium z14 y no de Open-Meteo (90 m), porque con celdas de unos 20 m el DEM de 90 m daria un plano; el respaldo es Open-Meteo; (4) la respuesta de clima es una `SerieClima` con el mismo `dia` que `clima-escenario`, pero no esta en `contratos/`: se pide a Mompin si debe entrar.
- **Fuente / evidencia:** 21 pruebas en `api/tests/` (respuestas reales de A0.7, validadas contra los schemas de `contratos/`) y una corrida en vivo: 20 anios de POWER en 1.8 s, 18 ms desde cache.
- **Decisiones afectadas:** V-08 (propuesta: Terrarium por defecto), V-22 (el clima pasa por el backend).

### 2026-11-14 — A0.4 servidor en el droplet (Eduardo)

- **Archivos:** `AgroVault/Compartido/Servidor.md`, `docs/14-CRONOGRAMA.md` (marca A0.4). Cambios en el droplet, no en el repo.
- **Cambio:** usuario `agrohive`, clon del repo en `/opt/agrohive/repo`, servicio `agrohive-api` (uvicorn en `127.0.0.1:8010`), server block de nginx propio y certificado de Let's Encrypt para `64-23-143-102.sslip.io`. Solo hay un `/health` provisional hasta A1.3.
- **Fuente / evidencia:** `https://64-23-143-102.sslip.io/health` responde 200; `mediworks.mx` sigue respondiendo 200.
- **Decisiones afectadas:** V-15, V-16, V-17 (opción 1 de `docs/13`, `sslip.io`, funciona). Siguen abiertas hasta que el equipo las cierre.

### 2026-11-14 — A0.7 pruebas reales de APIs (Eduardo)

- **Archivos:** `docs/04-DATOS-Y-METODO.md`, `docs/14-CRONOGRAMA.md` (marca A0.7), `datos/pruebas-apis/`, `AgroVault/Compartido/APIs.md` y `Pendientes.md`. Editado con aviso a Mafer (dueña de `docs/`).
- **Cambio:** se anotan los resultados de llamadas reales a NASA POWER, Open-Meteo (archivo, elevación, estacional) y Terrarium. Se cambian varios `[VERIFICAR]` de 04 por el resultado probado.
- **Fuente / evidencia:** `datos/pruebas-apis/LEEME.md` y `respuestas/`, consulta del 2026-11-14, coordenada de prueba 18.03, -95.53 (no es la parcela demo).
- **Decisiones afectadas:** V-06 (`GWETROOT` en AG, radiación en MJ/m²/día), V-08 (Open-Meteo Elevation y Terrarium responden), V-21 (7 meses con `forecast_days=210`), V-22 (GET simple con CORS abierto, backend sigue siendo el camino). Siguen abiertas hasta que el equipo las cierre en 11 y 13.

## Historial

### 2026-11-14 (noche) — A1.1 `[HECHO]`; A2.16 asignada a Mafer

- **Archivos:** `14` (fila de A1.1, fila de A2.16 y tablero), `AgroVault/Compartido/{Pendientes,Resumen}.md`.
- **Cambio y motivo:** decisiones de Mompin. A1.1 pasa a `[HECHO]` porque `main` está en verde y el equipo revisó los contratos en persona. A2.16 (TAW por pedotransferencia de Saxton y Rawls, 2006) la hace Mafer. Se actualizó además el estado del repo en `Resumen.md`, que todavía decía que no había código en `web/` ni en `api/`.
- **Fuente / evidencia:** decisión del evento transmitida por la sesión maestra.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — `main` de vuelta en verde tras contratos 0.4.0 y 0.5.0; regla de cambios de contrato

- **Archivos:** `api/app/{proxima,modelos,servicios}.py`, `api/tests/test_proxima.py`, `api/openapi.json`, `api/cliente/api.d.ts` (Eduardo); `web/src/ui/demo.ts` (balam); `datos/catalogos/{generar.py,cultivos.json,README.md}` (Mafer); `AGENTS.md`, `AgroVault/Compartido/Reglas.md`.
- **Cambio y motivo:** `main` (3a9a697) quedó en rojo porque los contratos 0.4.0 y 0.5.0 entraron sin ajustar lo que dependía de ellos. Con autorización de Mompin y aviso a cada dueño, se hicieron cambios mínimos:
  - **API (Eduardo):** la próxima temporada se recorta a 6 meses (`HORIZONTE_MESES`), `/api/suelo` agrega `agua.metodoTaw` (`tabla_fao56` con la fuente de la tabla) cuando el TAW es evaluable, y dos aserciones de prueba pasan de 7 a 6 meses. Se regeneraron el OpenAPI y el cliente.
  - **Web (balam):** el tipo de los ciclos del ejemplo en `demo.ts`.
  - **Catálogos (Mafer):** sin `ventanasSiembra`. Las tres ventanas estaban en `NO_EVALUABLE`, así que no se perdió ningún dato; queda anotado en el README.
  - **Regla nueva:** ningún cambio de contrato que rompa algo entra a `main` sin las cuatro verificaciones en verde.
- **Fuente / evidencia:** `npm test` en `contratos/` 52/52; `pytest` en `api/` 39 pruebas; `validar.mjs` de los catálogos y `tsc --noEmit` en `web/`, en verde.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — `.vscode/` fuera del repo `[DECIDIDO]`

- **Archivos:** `.gitignore`; se dejan de versionar `.vscode/tasks.json`, `.vscode/settings.json`, `.vscode/agrohive.code-snippets` y `.vscode/mascota/clawd.py`.
- **Cambio y motivo:** decision de Mompin. `tasks.json` ejecutaba la mascota al abrir la carpeta en VS Code (`runOn: folderOpen`): codigo que corre solo en la maquina de todos. La configuracion de editor es personal. El repo sigue publico.
- **Efecto:** al hacer pull, git borra esos archivos de las copias locales. Quien los quiera conservar los recupera del historial (`git show dfd4d40:.vscode/mascota/clawd.py`) y quedan ignorados.

### 2026-11-14 (tarde-noche) — API: contratos 0.5.0, GWETROOT y revision de Mompin (Eduardo)

- **Archivos:** `api/` (modelos, servicios, clientes, rutas, pruebas, OpenAPI y cliente TS), `datos/pruebas-apis/`, `docs/14`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio, siguiendo la revision de Mompin (mensaje #4):** (1) las respuestas de clima, suelo, proxima temporada, elevacion y cultivos se validan **completas** contra los schemas de `contratos/` (`serie-clima`, `suelo`, `proxima-temporada`, `cultivo`, `parcela`); (2) modelos mas estrictos: `esEjemplo`, `etiqueta` y `estado` obligatorios y `clase` de textura limitada a las 12 clases; (3) los 503 devuelven `{estado: ERROR_DATOS, motivo}` como declara el OpenAPI, ya no `{detail}`; (4) `/api/cultivos` tiene `response_model`; (5) ISRIC con pixeles a mas de 1 km sale `EXPLORATORIO`, no `EVALUABLE`; (6) V-06: POWER pide `GWETROOT` y la API lo devuelve como `humedadRaizFraccionSat` (sin convertir) con el metadato `humedadSuelo`; (7) `/api/suelo` devuelve `estimaciones` (hoy solo ISRIC, con carbono organico en g/kg) y `estimacionUsada`.
- **Fuente / evidencia:** GWETROOT real de POWER (fraccion 0 a 1, `datos/pruebas-apis/respuestas/power_ag.json`); carbono organico de ISRIC `soc` (dg/kg dividido entre 10, FAQ de ISRIC); 51 pruebas en verde.
- **Cambio de comportamiento a avisar:** los 503 ya no traen `detail`; la clave de cache de POWER y de suelo cambio (`power_v2`, `suelo_isric_v2`), asi que el paquete de demo anterior no sirve y hay que regenerarlo.
- **Pendiente mio:** regenerar el paquete de demo (A2.4) con la zona real de Mafer y el periodo `2005-10-01` a `2025-12-31` pedido por Mompin, y el cliente de OpenLandMap (A2.15).

### 2026-11-14 (noche) — Cronograma por persona y marcas al dia (Eduardo)

- **Archivos:** `herramientas/cronograma.py` (nuevo), `docs/14-CRONOGRAMA.md`, `docs/cronograma.html` (regenerado), `AgroVault/Compartido/Cronograma.md` (nueva), `AgroVault/Bienvenido.md`, `AgroVault/Compartido/Lectura.md`.
- **Cambio:** el cronograma ahora se ve por persona (Mompin, Eduardo, Mafer, balam) con estado por actividad, en tres vistas generadas desde las marcas de `docs/14`: una seccion nueva "Estado por persona", la pagina `docs/cronograma.html` (ya no filtra por R1 a R4 ni guarda marcas en el navegador) y una nota de Obsidian. El HTML dejo de tener datos propios: no se desfasa de `docs/14`.
- **Marcas puestas (verificadas):** A0.1 y A0.2 hechas (repo con `main` y 4 ramas; `docs/` en el repo); A1.4, A1.5 y A1.6 ya estaban marcadas por Mafer solo en el tablero y se copiaron a sus filas; A1.2 `[EN CURSO]` (build y rutas P0 a P3 verificados, falta el Worker del motor segun el README de balam); A5.4 y A5.8 `[BLOQUEADO]`.
- **Estado:** 11 de 54 hechas (20 %): Mompin 2, Eduardo 6, Mafer 3, balam 0. A0.3 queda sin responsable unico.
- **Pendiente de otros:** balam debe confirmar si A1.2 pasa a hecha cuando exista el Worker; Mafer, que `[HECHO]` de A1.4 a A1.6 ahora tambien esta en sus filas.

### 2026-11-14 (noche) — A2.4: paquete de demo sin internet (Eduardo)

- **Archivos:** `datos/demo/` (generador, manifiesto, cache y LEEME), `api/app/cache.py`, `api/app/clientes/terrarium.py`, `api/app/proxima.py`, `api/app/config.py`, pruebas, `api/README.md`, `docs/14`.
- **Cambio:** la API lee `datos/demo/cache/` cuando falta su cache local. Con el paquete responden sin red clima 2006-2025, elevacion, suelo y proxima temporada de la parcela demo (probado con la red forzada a fallar: 200 en milisegundos; sin paquete, 503). El pronostico estacional guarda ahora su fecha de consulta y, si esta vencido y no hay red, se sirve con la advertencia `ESTACIONAL_EN_CACHE` y su fecha real en `emitido`.
- **Limite:** la parcela es la de `contratos/ejemplos/parcela.ejemplo.json` (coordenadas ilustrativas cerca de Isla); los datos son reales para esa coordenada. Hay que regenerar con `datos/demo/generar.py` cuando A0.6 confirme la zona.
- **Fuente / evidencia:** 43 pruebas, incluidas las del paquete; generado el 2026-11-14 desde NASA POWER, ISRIC, Terrarium y Open-Meteo.
- **Pendiente:** A5.8 (capturas y demo completa con la red apagada) depende de que el front llame a la API (A4.6).

### 2026-11-14 (noche) — A4.7: front servido desde el droplet (Eduardo)

- **Archivos:** `api/despliegue/` (nginx, proxy y script), `AgroVault/Compartido/Servidor.md`, `docs/14`. Cambios en el droplet: `/var/www/agrohive-web`, `/etc/nginx/agrohive-proxy.conf` y el server block de AgroHive.
- **Cambio:** `https://64-23-143-102.sslip.io/` sirve el build de `web/` (esqueleto de balam, A1.2) y la API sigue en `/api/`, `/health` y `/docs` del mismo origen. No hace falta CORS para esa ruta.
- **Verificacion:** `/` 200 html, asset 200, `/health` y `/api/cultivos` 200, `mediworks.mx` sigue en 200; `nginx -t` antes de recargar y respaldo del bloque anterior en el droplet.
- **Pendiente:** la demo real depende de que el front llame a la API (A4.6, balam y Eduardo).

### 2026-11-14 (noche) — Calendario local, fecha elegida por el usuario y A2.8 `[DECIDIDO]`; contratos 0.5.0

- **Archivos:** `03`, `05` (paso 2), `06` (selector), `08`, `13`, `14` (A0.6, A2.8, A3.4); `contratos/` 0.5.0 (`cultivo`, nuevo `calendario-local`, `plan-siembra`, `resultado-rotacion`, `resultado-celda`, `comun.temporada`); vault.
- **Cambio y motivo:** decisiones de Mompin.
  1. Las ventanas de siembra dependen del lugar: salen del catálogo de cultivos y pasan a `calendario-local` (municipio con clave INEGI, cultivo, temporada PV/OI, ventana con fuente y presencia del cultivo en el lugar).
  2. La fecha de siembra la elige el usuario. El plan guarda el calendario usado (o "sin calendario local") y un `porQue` por ciclo para la interfaz.
  3. Un cultivo se puede mostrar sin recomendarlo en el lugar (caso: calabaza en Isla, que SIAP 2021-2025 no registra). Va en `cultivosNoRecomendados` en la rotación y en `noRecomendadoEnLugar` en la celda, con motivo y fuente; con eso la rotación no puede ser `EVALUABLE`. Los estados actuales no bastaban porque no llevan cultivo ni fuente.
  4. A2.8: opción (c) `temporada_tipica`, fija en el plan.
- **Fuente / evidencia:** decisión del evento transmitida por la sesión maestra. El caso de calabaza en Isla es un dato de SIAP que reportó el equipo; en los ejemplos aparece como ficticio. `npm test` pasa 52/52.
- **Decisiones afectadas:** A2.8 y V-20 (forma). **Cambio incompatible:** `datos/catalogos/cultivos.json` deja de validar hasta que se quite `ventanasSiembra`.

### 2026-11-14 (noche) — Decisiones de suelo, clima, pronóstico y servidor `[DECIDIDO]`; contratos 0.4.0

- **Archivos:** `11`, `13`, `14` (A2.13 y nuevas A2.15 y A2.16); `contratos/` 0.4.0 (`suelo`, `clima-escenario`, `proxima-temporada` y nuevo `serie-clima`); `AgroVault/Compartido/{Pendientes,Resumen,APIs,Contratos}.md`.
- **Cambio y motivo:** decisiones de Mompin en el evento.
  1. **TAW:** se calcula con la pedotransferencia de Saxton y Rawls (2006) para cualquier textura, incluidas las tres clases sin fila en FAO-56 Tabla 19, desde arena, arcilla y materia orgánica de SoilGrids, como `SUPUESTO`. Mientras no esté, la demo usa el selector manual. El contrato `suelo` declara `metodoTaw` con su fuente y la retención θsat, θFC y θWP.
  2. **`serie-clima`:** nuevo contrato para la respuesta de `GET /api/clima`, tomado de `SerieClima` en `api/app/modelos.py`.
  3. **A2.13:** queda aprobado el método de Eduardo (distribución histórica por mes desplazada por la anomalía de SEAS5, sin tendencia y con advertencia).
  4. **V-21:** horizonte de 6 meses; `horizonteMeses` pasa a ser fijo en 6.
  5. **V-23:** se usan ISRIC y OpenLandMap; `suelo.estimaciones` y `estimacionUsada`.
  6. **V-08:** Terrarium por defecto y Open-Meteo de respaldo.
  7. **V-06:** `GWETROOT` entra como condición inicial y como comparación (`humedadRaizFraccionSat` y `humedadSuelo`).
  8. **V-15 a V-17:** cerrados con `sslip.io` y Let's Encrypt.
- **Riesgo registrado:** `GWETROOT` es fracción de saturación (MERRA-2, ~100 cm; el metadato de POWER que dice 200 cm es un error reportado), no fracción de TAW. Se convierte con θsat, θFC y θWP; sin ellos, `NO_EVALUABLE`.
- **Fuente / evidencia:** Saxton, K. E. y Rawls, W. J. (2006), Soil Sci. Soc. Am. J. 70(5): 1569-1578, doi:10.2136/sssaj2005.0117 (registro bibliográfico verificado; tabla y ecuaciones `[VERIFICAR]` contra el artículo). Foro de Earthdata sobre las unidades y la profundidad de `GWETROOT`. `npm test` en `contratos/` pasa 42/42.
- **Decisiones afectadas:** V-06, V-08, V-15, V-16, V-17, V-21 y V-23 quedan cerradas. A2.13 queda con el método aprobado.

### 2026-11-14 (noche) — Integracion de Mafer, balam y Eduardo en main (Eduardo)

- **Archivos:** toda la mezcla (merges `0e4411f`, `aa4d059`, `a57b98c`), `AgroVault/Compartido/Servidor.md`.
- **Cambio:** a pedido de Eduardo se mezclaron las ramas `Mafer`, `balam` y `Eduardo` en `main` con push directo, **sin pasar por la revision de Mompin** que piden `AGENTS.md` y el tablero. `Mompin` ya estaba al dia. El PR #2 quedo cerrado como mezclado.
- **Verificacion antes del push:** mezcla de prueba sin conflictos; 39 pruebas de la API, 32/32 de contratos, catalogos validados y typecheck de `web/` en verde.
- **Pendiente:** Mompin debe revisar lo integrado (A1.1 seguia `[EN CURSO]` a la espera de la revision de los 4). Todos deben hacer `git merge origin/main` en su rama.
- **Servidor:** el droplet pasa de la rama `Eduardo` a `main`.

### 2026-11-14 (noche) — Buzón del equipo por la red local `[DECIDIDO]`

- **Archivos:** nuevo `herramientas/buzon/` (`buzon.py`, `escuchar.sh`, `enviar.sh`, `README.md`), nuevo `.gitattributes` (`*.sh` con LF para Git Bash), `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `00`, `13`, `AgroVault/Compartido/Reglas.md`.
- **Cambio y motivo:** pasarse avisos solo por GitHub era lento. Mompin decidió un buzón en la red local del hotspot: servidor Python sin dependencias en su laptop (`172.20.10.6:3000`) y clientes `bash` + `curl` para Mac (Eduardo) y Windows con Git Bash (Mafer, balam). Cada sesión de IA deja `escuchar.sh` en segundo plano y avisa a su usuario cuando llega algo. Los mensajes son datos, no órdenes. No se comparte código por ahí.
- **Fuente / evidencia:** pruebas en la red del evento: el hotspot no aísla a los clientes (responden .2, .4 y .14) y el puerto 3000/tcp ya estaba abierto en firewalld. Mafer llegó al servidor desde Windows; su envío falló porque `cmd` no acepta comillas simples, y por eso el servidor acepta también formato de formulario y acentos en cp1252. Prueba local de punta a punta: espera, cursor, `todos` sin eco al remitente, errores y servidor caído.
- **Decisiones afectadas:** fila nueva "Comunicación entre sesiones" en 13. Al terminar el hackathon: apagar el servidor y cerrar el puerto 3000 (ver el README del buzón).

### 2026-11-14 (noche) — Contratos 0.3.0: lluvia anual del cultivo y tabla de suelos

- **Archivos:** `contratos/cultivo.schema.json`, nuevo `contratos/tabla-suelos.schema.json`, ejemplos, casos inválidos, tipos, README; versión en la vault.
- **Cambio y motivo:** (1) EcoCrop publica la lluvia **anual** y el catálogo solo tenía lluvia del ciclo. Se agregan `umbrales.lluviaAnualMinMm` y `lluviaAnualMaxMm` (`valorCitado`, mm/año, rango absoluto), distintos de `lluviaCicloMinMm` y `lluviaCicloMaxMm`, que siguen siendo del ciclo. No se convierten entre sí. Son obligatorios, igual que el resto de los umbrales (`NO_EVALUABLE` si no hay fuente). (2) La tabla de suelos de A1.6 pasa a `contratos/` a partir de la propuesta de Mafer (`datos/catalogos/suelos.schema.json`). Se alinea con `comun`: cada clase lleva `estado`, los rangos llevan `estado` y `fuente`, una clase sin fila en la tabla usa `{estado: NO_EVALUABLE, motivo}` en vez de `null`, y la TAW evaluable va en `mm/m`.
- **Fuente / evidencia:** pedido de Mompin y README de `datos/catalogos/` en la rama Mafer (hueco "lluvia por ciclo"). `npm test` pasa 32/32. El `suelos.json` de Mafer valida contra el schema nuevo con los cambios de forma descritos (simulación local, sin tocar su rama).
- **Decisiones afectadas:** ninguna. Mafer debe migrar `cultivos.json` y `suelos.json` a 0.3.0.

### 2026-11-14 (noche) — Tipos: los schemas de contratos/ son la fuente de verdad `[DECIDIDO]`

- **Archivos:** `AGENTS.md`, `README.md`, `08`, `13`, `14` (A1.3), `contratos/README.md`, `AgroVault/Compartido/{Reglas,Contratos,Pendientes,Resumen}.md`, `AgroVault/{Codex/AGENTS.md,Cursor/INSTRUCCIONES.md}` (`CLAUDE.md` lo actualizó la sesión maestra en 3876f60).
- **Cambio y motivo:** Mompin y Eduardo decidieron que los JSON Schema de `contratos/` mandan sobre los datos. Los tipos TS salen de `contratos/tipos/`, los modelos de FastAPI deben respetar los schemas con una prueba que lo verifique, y el cliente generado desde OpenAPI solo cubre las llamadas HTTP. Reemplaza "tipos solo desde OpenAPI" de 13 y cierra el pendiente de tipos de la vault. Al entregable de A1.3 se le suma esa prueba.
- **Fuente / evidencia:** decisión del equipo en el evento, transmitida por la sesión maestra el 14/11.
- **Decisiones afectadas:** fila "Tipos compartidos" de 13.

### 2026-11-14 (noche) — docs/00 al día

- **Archivos:** `00`.
- **Cambio y motivo:** 00 seguía diciendo que la documentación vive en Drive y que no se podía escribir código. Ahora dice que vive en el repo (Drive como respaldo, según 13), que el hackathon ya inició e incluye la regla de verificar antes y después de trabajar. El índice suma 13, 14, 15, `AgroVault/` y `contratos/`, y corrige el enlace al README del agente `modelador-voxel`. El orden de lectura para todos pasa a 00 → 13 → 14 → 03 → 11. La sección de carpetas anteriores aclara que esas carpetas están en Drive.
- **Fuente / evidencia:** pedido de Mompin transmitido por la sesión maestra el 14/11; decisiones de 13.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Ranking B pasa a `[DECIDIDO]`

- **Archivos:** `05`, `09`, `11`, `13`, `14`; `AgroVault/Compartido/{Pendientes,Resumen,Contratos}.md`, `AgroVault/Codex/AGENTS.md`; `contratos/README.md` y la descripción de `resultado-rotacion.schema.json`.
- **Cambio y motivo:** Mompin confirmó que el criterio B ya está acordado por el equipo en el evento: deja de estar "por ratificar" y deja de ser `[EN EVENTO]`. Se mantienen el respaldo A y el riesgo de la entrada anterior. En 11 la fila pasa de "Se decide en el evento" a "Decisiones tomadas"; en 13 entra a la tabla de decididas y V-19 queda solo con la pintura por bloques.
- **Fuente / evidencia:** confirmación de Mompin transmitida por la sesión maestra el 14/11.
- **Decisiones afectadas:** V-19 (ranking) cerrada con B.

### 2026-11-14 (noche) — Ranking: criterio B (decisión de Mompin, falta ratificar)

- **Archivos:** `05` (paso 7), `11`, `13` (V-19), `09`, `14` (A4.2); `contratos/` 0.2.0 (`resultado-rotacion`, ejemplos, casos inválidos, tipos); `AgroVault/Compartido/{Pendientes,Resumen,Contratos}.md`, `AgroVault/Codex/AGENTS.md`.
- **Cambio y motivo:** Mompin eligió el criterio B del paso 7 de 05: puntaje compuesto por escenario, robustez = peor puntaje, minimax de arrepentimiento y desempate por promedio. Estaba `[EN EVENTO]`, así que queda pendiente de que el equipo lo ratifique. El contrato sigue aceptando A como respaldo y agrega `ponderacion` (pesos por pilar, etiqueta y pilares excluidos), obligatoria con B. Se quitó el "A por defecto" de la vault.
- **Riesgo:** B necesita los pilares 2 y 3 (A3.7) y pesos con fuente o justificados. Si no hay pesos, se usan pesos iguales declarados `SUPUESTO`, nunca inventados. Si A3.7 no llega, se usa el criterio A (solo pilar hídrico) y se dice en la tarjeta.
- **Fuente / evidencia:** decisión de Mompin transmitida por la sesión maestra el 14/11. `npm test` en `contratos/` pasa 25/25.
- **Decisiones afectadas:** V-19 (ranking) pasa de `[EN EVENTO]` a decisión de Mompin por ratificar; la pintura por bloques sigue `[EN EVENTO]`.

### 2026-11-14 (noche) — AgroVault alineado con contratos/ y regla de verificación

- **Archivos:** `AgroVault/Compartido/{Contratos,Pendientes,Reglas,Resumen}.md`, `AgroVault/Bienvenido.md`, `AgroVault/{Claude,Cursor}/INSTRUCCIONES.md`, `AgroVault/Codex/AGENTS.md`, `AGENTS.md`; notas en `04`, `08` y `13`.
- **Cambio y motivo:** la vault de Eduardo copiaba los ejemplos de 08, que ya no coinciden con `contratos/` (A1.1). Ahora `Contratos.md` resume y enlaza los schemas sin redefinirlos, y `Pendientes.md` refleja A1.1 hecha (falta la revisión de los 4), las decisiones abiertas (ranking A o B, A2.8 con las opciones a/b/c de 05 paso 2, alineación de tipos OpenAPI con los de `contratos/tipos/`) y lo decidido el 14/11. Se quitaron afirmaciones viejas ("no existe `contratos/`", "el tablero está vacío"). Lo que la vault tenía más nuevo que `docs/` se reflejó con notas breves: endpoints superados en 08, investigación de APIs en 04 y el horizonte de 7 meses de V-21 en 13. Regla nueva para todos, a pedido de Mompin: verificar los cambios antes y después de trabajar y actualizar la documentación afectada en vez de dejarla desfasada o duplicarla (en `AGENTS.md`, `Reglas.md` y las instrucciones de Claude, Codex y Cursor). La misma regla en `CLAUDE.md` queda pendiente de la confirmación de Mompin.
- **Fuente / evidencia:** `contratos/*.schema.json` v0.1.0; `AgroVault/Compartido/APIs.md` (investigación de Eduardo del 14/11, con sus `VERIFICAR`).
- **Decisiones afectadas:** ninguna se cierra. Se registra como pendiente la alineación de los dos generadores de tipos.

### 2026-11-14 (noche) — A1.1: contratos de datos v0.1.0

- **Archivos:** `contratos/` (8 schemas más `comun.schema.json`, ejemplos, validador, casos inválidos, `tipos/contratos.d.ts`, README).
- **Cambio y motivo:** primeros contratos como JSON Schema 2020-12, para que front, API y motor trabajen en paralelo contra los ejemplos. Respecto a los nombres sugeridos en 08: (1) `estado` pasa a ser siempre el estado de evaluación de 04 y el estado visual de la planta se llama `estadoPlanta`; (2) el suelo se separa de la parcela en su propio contrato (`parcela.sueloId`), con textura y pH etiquetados `SUPUESTO`; (3) nuevo contrato `proxima-temporada` (decisión del 14/11) que solo admite bandas de incertidumbre, sin cifra única; (4) los parámetros del catálogo usan `valorCitado` (valor con fuente o `NO_EVALUABLE`); (5) el resultado por rotación admite los criterios de ranking A y B, porque la elección sigue `[EN EVENTO]`; (6) `plan.asignacionClima` queda en `null` hasta decidir A2.8.
- **Fuente / evidencia:** docs 04, 05, 07, 08 y 13. Los ejemplos son ficticios (`meta.esEjemplo: true`) y las coordenadas de Isla son ilustrativas. `npm test` en `contratos/` pasa 22/22 (8 ejemplos válidos y 14 casos inválidos rechazados).
- **Decisiones afectadas:** ninguna decisión cerrada cambia. Falta la revisión de los 4 (entregable de A1.1).

### 2026-11-14 (tarde) — Pronóstico aproximado, pH, catálogo de cultivos y reparto por actividad

- **Archivos:** `13`, `14`, `cronograma.html`; notas de alcance en `00`, `03`, `04` y `10`.
- **Cambio y motivo:** tras la investigación de datos, el equipo aprobó (1) una capa aproximada "próxima temporada" como banda de incertidumbre, (2) mostrar pH y textura estimados por modelo global, (3) catálogo propio de cultivos en vez de una API, (4) zona demo en Isla con la milpa como núcleo, y (5) repartir el trabajo por actividad y no por rol.
- **Fuente / evidencia:** búsquedas web del 14/11 sobre Open-Meteo (estacional y Climate API), NASA POWER, SoilGrids/OpenLandMap, FAO EcoCrop, Trefle y Perenual. Varios datos vienen de páginas de terceros: quedan como `[VERIFICAR]` (V-20 a V-24).
- **Decisiones afectadas:** "no predice el clima" y "no mide pH" pasan a "no predice una temporada exacta" y "pH estimado, no medido". Nuevas actividades A0.6, A0.7, A2.13, A2.14 y A4.9 en 14.

### 2026-11-14 — Inicio del hackathon y decisiones de arquitectura

- **Archivos:** nuevos `13-DECISIONES-HACKATHON.md` y `14-CRONOGRAMA.md`; ajuste menor en `00` y en la ruta del agente `modelador-voxel`.
- **Cambio:** la documentación pasa de Drive al repositorio Git (`docs/`). Se deciden stack y servidor, y el cronograma se mide en esfuerzo de IA, no en horas.
- **Decisiones afectadas:** motor en TypeScript en el navegador con Web Worker; backend FastAPI (Python); polígono libre dentro del MVP; servidor DigitalOcean de Eduardo; sin dominio propio. Detalle en 13.

### 2026-11-13 — v2.0 consolidada vigente

- **Archivos:** carpeta nueva completa (00 a 12) y `agente-modelador-voxel/`.
- **Cambio:** se unifican en una sola fuente `docs/` (v0.2, 10/11) y `00 — ... v1.2` (11/11). Se revisaron las diferencias entre ambas y el equipo resolvió:
  - El equipo son **4 integrantes**. `[DECIDIDO]`
  - **Sí habrá relieve.** `[DECIDIDO]`
  - **Sí habrá selector de cultivos**: es un simulador tipo "what if". `[DECIDIDO]`
  - Documentación en **Google Drive** vía rclone o MCP; en el evento se podrá usar GitHub u otra herramienta. Notion deja de ser la fuente. `[DECIDIDO]`
  - Cada integrante usa su propia IA (ChatGPT, Claude, Cursor); no es relevante registrar qué IA editó qué. `[DECIDIDO]`
  - Los modelos 3D se hacen con **Blockbench** (`.bbmodel`), generados por el agente `modelador-voxel`. `[DECIDIDO]`
  - Hay que consolidar ambas carpetas en una (esta). `[DECIDIDO]`
  - Cronograma (48 h frente a 39 h): `[EN EVENTO]`.
  - Cultivos iniciales: `[EN EVENTO]`.
  - Pilares de la prueba de estrés (déficit hídrico, compatibilidad de ciclos, protección del suelo): lo ideal es todo; `[DEPENDE-DATOS]`.
  - Cómo se asigna el clima a cada ciclo de una rotación: es investigación, depende de las APIs, los campos y los cultivos. `[DEPENDE-DATOS]`
  - Incluir la rotación actual del agricultor y sus prioridades: `[MEJORA]`.
  - Detalles menores (numeración, secciones faltantes): se deciden después.
- **Se copió al Drive** el agente `modelador-voxel`, su librería `voxelkit.py` y el ejemplo de la zanahoria (práctica, no es cultivo del proyecto).
- **Las carpetas anteriores no se modificaron.**

### 2026-11-11 — v1.2 consolidada (carpeta anterior)

Consolidación basada en Notion v1.2 y en `docs/`. Ver `00 — AGROHIVE DOCUMENTACIÓN CONSOLIDADA v1.2/01-REGISTRO-DE-CAMBIOS.md`.

### 2026-11-10 — v0.2 de Mompin (carpeta `docs/`)

Primera documentación por tema a partir del video del compañero, el audio de la reunión y la verificación de APIs. Ver `docs/DOCUMENTACION_MAESTRA.md`.
