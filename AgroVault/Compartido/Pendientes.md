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
| A1.1 | Hecha, **falta la revisión de los 4** (`[EN CURSO]` en `docs/14` hasta entonces) | Contratos v0.3.0 en `contratos/`: 10 schemas (más `comun`), ejemplos, `npm test` (32/32) y tipos TS. Ver [[Contratos]] |
| A1.5, A1.6 | Hechas (Mafer) | `datos/catalogos/`: milpa (maiz, frijol, calabaza) desde FAO-56 y EcoCrop, y TAW por textura (FAO-56 Tabla 19), validados contra contratos 0.3.0 (`cultivo` y `tabla-suelos`); `python datos/catalogos/generar.py` y `node datos/catalogos/validar.mjs`. La lluvia de EcoCrop va en `lluviaAnual*`; `lluviaCiclo*`, umbral de calor y ventanas de siembra siguen `NO_EVALUABLE` |

El resto del reparto y su estado está en el tablero de `docs/14` (al final).

## Abiertos que cambian el diseño

| ID | Tema | Mientras tanto |
| --- | --- | --- |
| V-19 | Ranking: **B `[DECIDIDO]` el 14/11**. Lo abierto es si se pinta por bloques (`[EN EVENTO]`) | B: puntaje compuesto por escenario, arrepentimiento minimax, desempate por promedio. Sin pesos con fuente, pesos iguales declarados `SUPUESTO` en `ponderacion`; no inventes pesos. Riesgo: B necesita los pilares 2 y 3 (A3.7); si no llegan, respaldo A (solo pilar hídrico), declarado en el resultado. `porCelda` queda `null` |
| A2.8 | Cómo se asigna el clima a cada ciclo (`docs/05`, paso 2) | Opciones: (a) los tres ciclos dentro del mismo año del escenario (`mismo_anio`); (b) ventanas consecutivas reales del histórico (`ventanas_consecutivas`); (c) cada ciclo en su temporada típica dentro del año del escenario (`temporada_tipica`). `plan-siembra.asignacionClima` queda en `null` hasta decidir. No asumas "un ciclo = un año". Se registra en `docs/01` |
| V-20 | Cultivos y calendario de Isla en SIAP | Milpa como núcleo; no inventes fechas de siembra. Las ventanas del catálogo quedan `NO_EVALUABLE` |
| V-21 | Horizonte del pronóstico estacional de Open-Meteo | Evidencia A0.7 (14/11): 7 meses con `forecast_days=210` (máximo 217); por defecto 6. El 9 de terceros no se sostiene. Falta que el equipo lo cierre. No bloquea el MVP |
| V-22 | CORS de NASA POWER | Evidencia A0.7: el GET simple trae `access-control-allow-origin: *`, el preflight da 404. Todo el clima sigue pasando por el backend |
| Suelo | **TAW del suelo del mapa global.** Con SoilGrids, la zona de prueba de Isla sale `franco_arcillo_arenoso`, clase **sin fila** en FAO-56 Tabla 19 (igual `franco_arcilloso` y `arcillo_arenoso`), así que `agua.tawMmPorM` es `NO_EVALUABLE` y el motor no tendría balance con el suelo del mapa | Decide el equipo (Mafer y Mompin): (a) buscar otra fuente citada con TAW para esas 3 clases, (b) usar solo el selector manual en la demo, o (c) otra regla explícita. No uses el TAW de un grupo vecino: sería inventarlo |
| V-23 | Qué servicio de suelo responde (ISRIC WCS u OpenLandMap) | Evidencia A2.14 (14/11): el WCS de ISRIC responde y `GET /api/suelo` ya lo usa (ver [[APIs]]). El selector manual FAO-56 con etiqueta `SUPUESTO` sigue de respaldo. Falta que el equipo lo cierre |
| V-06 | `GWETROOT` y unidades de radiación de POWER | Evidencia A0.7: `GWETROOT` está en AG (fracción sin unidad) y la radiación ya viene en MJ/m²/día (no hace falta convertir). Falta decidir si la humedad de POWER entra al balance |
| V-08 | Elevación: Open-Meteo Elevation, Terrarium o SRTM | Evidencia A0.7 y A2.3: Terrarium z14 (interpolado) es el cliente por defecto de `POST /api/elevacion` y Open-Meteo (90 m) el respaldo, porque con celdas de ~20 m un DEM de 90 m da un plano. Falta que el equipo lo confirme |
| V-09 | Kc, ciclos, umbrales | Solo valores con cita. Si no hay cita, `NO_EVALUABLE` (el schema del catálogo lo obliga) |

## Servidor (Eduardo)

| ID | Tema |
| --- | --- |
| V-15 | SSH, usuario y firewall del droplet (evidencia A0.4, ver [[Servidor]]) |
| V-16 | Puertos y servicios que ya usa `mediworks` (evidencia A0.4, ver [[Servidor]]) |
| V-17 | Hostname (`sslip.io` u otro) y certificado (evidencia A0.4, ver [[Servidor]]) |

## Decidido el 14/11 (no lo reabras)

Detalle en `docs/13`. Tipos: los JSON Schema de `contratos/` son la fuente de verdad; FastAPI los respeta con prueba y OpenAPI solo genera el cliente HTTP. Ranking con el criterio B, respaldo A si A3.7 no llega (ver V-19 arriba). Motor en TypeScript dentro de un Web Worker; backend FastAPI solo proxy, caché y extras de Earthdata; polígono libre dentro del MVP; servidor en el droplet de Eduardo, sin dominio; documentación en `docs/` del repo; cronograma por esfuerzo de IA; capa "próxima temporada" como banda de incertidumbre, después del motor; pH y textura estimados con etiqueta `SUPUESTO`; catálogo propio de cultivos en JSON (EcoCrop y FAO-56); zona demo en Isla con la milpa como núcleo; reparto por actividad, no por rol.

## Siguen en evento o en datos, aunque 13 haya cerrado otras cosas

- Slider de meses: no es compuerta.
- Prioridades del agricultor (agua, ingreso, suelo) y su rotación actual: mejora.
- Sliders "lluvia −20 %" y "temperatura +2 °C": mejora. Si entran, la serie ajustada va como `EXPLORATORIO`.
- Pilares 2 y 3: solo si A2.7 ya está y los datos alcanzan.
- GPM, SMAP, MODIS: actividad L, después de C1.
- Horario real de la sede, formato de video y reglas de declaración de IA (V-01, V-03, V-04).

## Tablero

El reparto inicial del 14/11 ya está en `docs/14` (tablero al final). Cada quien marca el estado de sus actividades (`[EN CURSO]`, `[BLOQUEADO]`, `[HECHO]`) junto al ID. No te asignes actividades de otro sin acordarlo con el equipo.
