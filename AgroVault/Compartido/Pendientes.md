---
tipo: pendientes
audiencia: todas
actualizado: 2026-11-14
---

# Pendientes

No cierres estas filas en código "para ir avanzando". Si un default es inevitable para compilar, déjalo detrás de una constante con el id de la fila y un comentario `VERIFICAR`.

## Estado de actividades

| ID | Estado | Nota |
| --- | --- | --- |
| A1.1 | **`[HECHO]`** (14/11): `main` en verde y contratos revisados por el equipo en persona | Contratos v0.7.0 en `contratos/`: 12 schemas (más `comun`), ejemplos, `npm test` (58/58) y tipos TS. Ver [[Contratos]] |
| A2.5, A2.6, A2.7 | Hechas (Mompin, integradas a `main`) | Motor en `web/src/motor/` (funciones puras + Web Worker; la interfaz usa `crearClienteMotor()`): escenarios por lluvia de temporadas PV+OI de SIAP, ET0 Penman-Monteith FAO-56, cubeta FAO-56 cap. 8, pilar de déficit hídrico y estados. Pruebas 1 a 5 de doc 05 en verde (`cd web && npm test`; la parte de erosión de la prueba 2 pasa a A3.7). Ver `docs/05` |
| A4.2 | Hecha (Mompin) | Ranking B con dos pilares: déficit y exceso de agua (`excesoHidrico`, contratos 0.7.0, `[DECIDIDO]` 14/11), pesos iguales `SUPUESTO`; A3.7 agrega compatibilidad y erosión. Normalización en `docs/05`, paso 7. Pendiente de Mompin: la regla de desempate del p50 (hoy el año más antiguo) |
| A2.16 | `[EN CURSO]` (Mafer): función y pruebas hechas en `datos/catalogos/saxton_rawls.py`; falta que Eduardo la conecte a `/api/suelo` | Verificada contra el artículo (Tabla 3, 12 clases): arena y arcilla en fracción, **materia orgánica en porcentaje**. Sin materia orgánica, o con materia orgánica > 8 % o arcilla > 60 %, el TAW queda `NO_EVALUABLE`. El carbono orgánico de SoilGrids pasa a materia orgánica con el factor 1.724 (citarlo) |
| A1.5, A1.6 | Hechas (Mafer) | `datos/catalogos/`: milpa (maiz, frijol, calabaza) desde FAO-56 y EcoCrop, y TAW por textura (FAO-56 Tabla 19), validados contra contratos 0.3.0 (`cultivo` y `tabla-suelos`); `python datos/catalogos/generar.py` y `node datos/catalogos/validar.mjs`. La lluvia de EcoCrop va en `lluviaAnual*`; `lluviaCiclo*`, umbral de calor y ventanas de siembra siguen `NO_EVALUABLE` |

El resto del reparto y su estado está en el tablero de `docs/14` (al final).

## Abiertos que cambian el diseño

| ID | Tema | Mientras tanto |
| --- | --- | --- |
| V-19 | Ranking: **B `[DECIDIDO]` el 14/11**. Lo abierto es si se pinta por bloques (`[EN EVENTO]`) | B: puntaje compuesto por escenario, arrepentimiento minimax, desempate por promedio. Sin pesos con fuente, pesos iguales declarados `SUPUESTO` en `ponderacion`; no inventes pesos. Riesgo: B necesita los pilares 2 y 3 (A3.7); si no llegan, respaldo A (solo pilar hídrico), declarado en el resultado. `porCelda` queda `null` |
| A2.8 | Clima por ciclo: **`[DECIDIDO]` (c) `temporada_tipica`** (14/11) | Cada ciclo en su temporada típica (PV u OI) dentro del año del escenario; el plan la fija en `asignacionClima` |
| V-20 | Calendario de Isla: **cargado** (A0.6, Mafer) en `datos/catalogos/calendario-isla.json` | Maíz PV, maíz OI y frijol OI con ventana y fuente (INIFAP); frijol PV, chile y calabaza sin ventana (`NO_EVALUABLE`); calabaza `no_registrado` en SIAP 2021-2025. Las ventanas de OI son recomendaciones estatales, no de Isla. No inventes fechas |
| V-21 | Horizonte del pronóstico estacional: **`[DECIDIDO]` 6 meses** (14/11) | El servicio da 7 con `forecast_days=210`; el contrato fija `horizonteMeses` en 6. Método de A2.13 aprobado: distribución histórica desplazada por la anomalía de SEAS5, sin tendencia y con advertencia |
| V-22 | CORS de NASA POWER | Evidencia A0.7: el GET simple trae `access-control-allow-origin: *`, el preflight da 404. Todo el clima sigue pasando por el backend |
| Suelo | TAW del suelo del mapa global: **`[DECIDIDO]`** pedotransferencia de Saxton y Rawls (2006) para cualquier textura, desde arena, arcilla y materia orgánica de SoilGrids, `SUPUESTO` (A2.16, la hace **Mafer**) | Mientras no esté, la demo usa el selector manual. No uses el TAW de un grupo vecino. El factor de carbono orgánico a materia orgánica se cita `[VERIFICAR]` |
| V-23 | Servicio de suelo: **`[DECIDIDO]` ambos**, ISRIC WCS y OpenLandMap, para compararlos (A2.15) | El contrato `suelo` lleva `estimaciones` por servicio y `estimacionUsada`. Hoy `GET /api/suelo` solo usa ISRIC |
| V-06 | Humedad de POWER: **`[DECIDIDO]`** `GWETROOT` entra como condición inicial de la cubeta al sembrar y como comparación con la humedad simulada | Es fracción de **saturación** (MERRA-2, ~100 cm), no de TAW: convertir con θsat, θFC y θWP (Saxton y Rawls); sin ellos, `NO_EVALUABLE`. Resolución gruesa declarada. Contrato: `humedadRaizFraccionSat` y `humedadSuelo` Implementado en la API el 14/11: `GET /api/clima` devuelve `humedadRaizFraccionSat` y `humedadSuelo` (Eduardo). |
| V-08 | Elevación: **`[DECIDIDO]`** Terrarium por defecto, Open-Meteo de respaldo | Ya es así en `POST /api/elevacion` |
| V-09 | Kc, ciclos, umbrales | Solo valores con cita. Si no hay cita, `NO_EVALUABLE` (el schema del catálogo lo obliga) |
| Motor | Huecos que el motor declara y no rellena | Arranque de cada ciclo a capacidad de campo (Dr,i = 0) hasta A2.16; `diasDeficitEtapasSensibles` en `null` sin etapas sensibles con fuente (A1.5); sin escurrimiento por pendiente (A3.7); `estadoPlanta` nunca `podrida` (sin umbral de encharcamiento con fuente); riesgo por calor `NO_EVALUABLE` sin `tEstresCalorC` |

## Servidor (Eduardo)

| ID | Tema |
| --- | --- |
| V-15 | Cerrado 14/11: droplet con `sslip.io` y Let's Encrypt (ver [[Servidor]]) |
| V-16 | Cerrado 14/11 (ver [[Servidor]]) |
| V-17 | Cerrado 14/11: `sslip.io` + Let's Encrypt (ver [[Servidor]]) |

## Decidido el 14/11 (no lo reabras)

Detalle en `docs/13`. Tipos: los JSON Schema de `contratos/` son la fuente de verdad; FastAPI los respeta con prueba y OpenAPI solo genera el cliente HTTP. Ranking con el criterio B, respaldo A si A3.7 no llega (ver V-19 arriba). Motor en TypeScript dentro de un Web Worker; backend FastAPI solo proxy, caché y extras de Earthdata; polígono libre dentro del MVP; servidor en el droplet de Eduardo, sin dominio; documentación en `docs/` del repo; cronograma por esfuerzo de IA; capa "próxima temporada" como banda de incertidumbre, después del motor; pH y textura estimados con etiqueta `SUPUESTO`; catálogo propio de cultivos en JSON (EcoCrop y FAO-56); zona demo en Isla con la milpa como núcleo; reparto por actividad, no por rol.

## Siguen en evento o en datos, aunque 13 haya cerrado otras cosas

- Slider de meses: no es compuerta.
- Prioridades del agricultor (agua, ingreso, suelo) y su rotación actual: mejora.
- Sliders "lluvia −20 %" y "temperatura +2 °C": mejora. Si entran, la serie ajustada va como `EXPLORATORIO`.
- Pilares 2 y 3: A2.7 ya está; entran si los datos alcanzan (A3.7). Con datos reales de Isla el pilar hídrico distingue poco entre rotaciones (0 a 4 % de demanda sin cubrir), así que pesan para el ranking.
- GPM, SMAP, MODIS: actividad L, después de C1.
- Horario real de la sede, formato de video y reglas de declaración de IA (V-01, V-03, V-04).

## Tablero

El reparto inicial del 14/11 ya está en `docs/14` (tablero al final). Cada quien marca el estado de sus actividades (`[EN CURSO]`, `[BLOQUEADO]`, `[HECHO]`) junto al ID. No te asignes actividades de otro sin acordarlo con el equipo.
