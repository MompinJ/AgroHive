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
