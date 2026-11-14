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
| A1.1 | **`[HECHO]`** (14/11): `main` en verde y contratos revisados por el equipo en persona | Contratos v0.10.0 en `contratos/`: 14 schemas (más `comun`), ejemplos, `npm test` (82/82) y tipos TS. Ver [[Contratos]] |
| A2.5, A2.6, A2.7 | Hechas (Mompin, integradas a `main`) | Motor en `web/src/motor/` (funciones puras + Web Worker; la interfaz usa `crearClienteMotor()`): escenarios por lluvia de temporadas PV+OI de SIAP, ET0 Penman-Monteith FAO-56, cubeta FAO-56 cap. 8, pilar de déficit hídrico y estados. Pruebas 1 a 5 de doc 05 en verde (`cd web && npm test`; la parte de erosión de la prueba 2 pasa a A3.7). Ver `docs/05` |
| A4.3 | Parte lógica hecha (Mompin); falta mostrarla (balam) | `web/src/motor/tarjetas.ts` llena `explicacion` (por qué, evidencia con fuente, beneficios, huecos, riesgos) y el Worker la devuelve en `rankear`. Plantilla sin LLM; nada sin número o fuente |
| A5.5 | Hecha (Mompin) | Regresión de la demo en `web/src/motor/pruebas/regresion.test.ts` contra `regresion/demo-isla.json`: escenarios, pilares de la milpa, estados, ranking y análogos. Si un cambio mueve un número a propósito, se regenera con `ACTUALIZAR_REGRESION=1` y se explica en `docs/01` |
| A3.7 | Hecha (Mompin) | Compatibilidad de ciclo con el calendario de Isla (frijol PV, chile y calabaza sin ventana con fuente ⇒ `NO_EVALUABLE`); protección del suelo por días de suelo desnudo; índice de erosión `NO_EVALUABLE` sin I30 ni C/LS con fuente. Ranking B con hasta cuatro pilares; con el suelo real gana la milpa sembrada dentro de ventana. Pendiente si hay datos: índice de erosión y umbral de calor con fuente |
| A2.13 | Hecha la parte del motor (Mompin) | Banda validada y comparada con los escenarios; escenario de años análogos reales en `resultado-rotacion.proximaTemporada` (contratos 0.8.0), `EXPLORATORIO`, rango sin cifra única y fuera del ranking. Falta la interfaz (A4.9, balam) con el aviso "años parecidos a lo que se espera, no es predicción" |
| A4.2 | Hecha (Mompin) | Ranking B con hasta cuatro pilares: déficit, exceso de agua (`excesoHidrico`, contratos 0.7.0, `[DECIDIDO]` 14/11), compatibilidad y protección del suelo (A3.7), pesos iguales `SUPUESTO`. Normalización en `docs/05`, paso 7. Desempate del p50 `[DECIDIDO]`: el año más reciente (habitual 2016). Con el suelo real de Isla (A3.7): 1.º milpa, 2.º frijol-frijol, 3.º maíz-maíz; con una milpa sembrada dentro de ventana gana esa (ver `docs/05`, paso 7) |
| A3.3 | **`[HECHO]`** (Mafer) | Estados legibles con daltonismo: simulación de Machado et al. 2009 en `web/src/escena/daltonismo.ts` y pruebas (dE ≥ 15 entre estados, íconos y patrones distintos). `NO_EVALUABLE` pasó a `#ececec`; íconos finales; ver `docs/06` |
| A2.11 | **`[HECHO]`** (Mafer): frijol y calabaza, validados en el visor | `modelos/cultivos/`: 5 etapas de cada uno, paleta de 60 colores. Sin modelo propio para `estresada` y `marchita` (placa de estado). Abrir `visor_milpa.html` |
| A3.9 | `[EN CURSO]` (Mafer): hecho el **chile** (catalogo + 5 etapas voxel); mascota y props sin hacer | El chile usa los parametros del **pimiento dulce** (misma especie), no datos de chile serrano o jalapeno: **revisar**. `web/src/ui/demo.ts` aun no lista el chile (balam). Mascota y props son extras de fase 1 y 2 |
| A2.12 | **`[HECHO]`** (Mafer) | 9 losas de suelo en `modelos/suelos/` (tipo × humedad), para ponerse encima de la columna. **La escena aún no las carga** (hoy colorea la columna sin distinguir tipo); la integración es de A3. Ver `docs/07` |
| A2.16 | **`[HECHO]`** (Mafer, conectada por Eduardo y desplegada) | Función y pruebas en `datos/catalogos/saxton_rawls.py`, verificada contra la Tabla 3 del artículo: arena y arcilla en fracción, **materia orgánica en porcentaje**. Sin materia orgánica, o con materia orgánica > 8 % o arcilla > 60 %, el TAW queda `NO_EVALUABLE`. El carbono orgánico de SoilGrids pasa a materia orgánica con el factor 1.724 (citarlo) |
| A3.1, A3.2 | **`[HECHO]`** (Mompin, rama `Mompin-escena`) | `web/src/escena/`: relieve por bloque, huecos `NO_EVALUABLE` (nunca cero), tope de 1600 celdas, placas de estado (base de A3.3 en `estilos-estado.ts`) y `.bbmodel` por cultivo + etapa con `InstancedMesh`. Vista previa `web/escena.html` con el motor real. Falta: montarla en Laboratorio (balam, ver `web/src/escena/INTEGRACION.md`), `server.fs.allow` en `vite.config.ts` para `npm run dev`, modelos de frijol y calabaza (A2.11) |
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
| V-23 | Servicio de suelo: **`[DECIDIDO]` ambos**, ISRIC WCS y OpenLandMap, para compararlos (A2.15) | El contrato `suelo` lleva `estimaciones` por servicio y `estimacionUsada`. Implementado el 14/11 (A2.15): `GET /api/suelo` trae las dos estimaciones; ISRIC es la usada y OpenLandMap la sustituye si ISRIC falla (Eduardo) |
| V-06 | Humedad de POWER: **`[DECIDIDO]`** `GWETROOT` entra como condición inicial de la cubeta al sembrar y como comparación con la humedad simulada | Es fracción de **saturación** (MERRA-2, ~100 cm), no de TAW: convertir con θsat, θFC y θWP (Saxton y Rawls); sin ellos, `NO_EVALUABLE`. Resolución gruesa declarada. Contrato: `humedadRaizFraccionSat` y `humedadSuelo` Implementado en la API el 14/11: `GET /api/clima` devuelve `humedadRaizFraccionSat` y `humedadSuelo` (Eduardo). |
| V-08 | Elevación: **`[DECIDIDO]`** Terrarium por defecto, Open-Meteo de respaldo | Ya es así en `POST /api/elevacion` |
| V-09 | Kc, ciclos, umbrales | Solo valores con cita. Si no hay cita, `NO_EVALUABLE` (el schema del catálogo lo obliga) |
| Motor | Huecos que el motor declara y no rellena | Arranque a capacidad de campo (Dr,i = 0) solo sin retención del suelo (selector manual; con el suelo del mapa ya se usa GWETROOT); `diasDeficitEtapasSensibles` en `null` sin etapas sensibles con fuente (A1.5); sin escurrimiento por pendiente (A3.7); `estadoPlanta` nunca `podrida` (sin umbral de encharcamiento con fuente); riesgo por calor `NO_EVALUABLE` sin `tEstresCalorC` |

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
