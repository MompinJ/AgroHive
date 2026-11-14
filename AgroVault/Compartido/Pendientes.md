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
| A1.1 | Hecha, **falta la revisión de los 4** (`[EN CURSO]` en `docs/14` hasta entonces) | Contratos v0.2.0 en `contratos/`: 9 schemas, ejemplos, `npm test` (25/25) y tipos TS. Ver [[Contratos]] |

El resto del reparto y su estado está en el tablero de `docs/14` (al final).

## Abiertos que cambian el diseño

| ID | Tema | Mientras tanto |
| --- | --- | --- |
| V-19 | Ranking: **B `[DECIDIDO]` el 14/11**. Lo abierto es si se pinta por bloques (`[EN EVENTO]`) | B: puntaje compuesto por escenario, arrepentimiento minimax, desempate por promedio. Sin pesos con fuente, pesos iguales declarados `SUPUESTO` en `ponderacion`; no inventes pesos. Riesgo: B necesita los pilares 2 y 3 (A3.7); si no llegan, respaldo A (solo pilar hídrico), declarado en el resultado. `porCelda` queda `null` |
| A2.8 | Cómo se asigna el clima a cada ciclo (`docs/05`, paso 2) | Opciones: (a) los tres ciclos dentro del mismo año del escenario (`mismo_anio`); (b) ventanas consecutivas reales del histórico (`ventanas_consecutivas`); (c) cada ciclo en su temporada típica dentro del año del escenario (`temporada_tipica`). `plan-siembra.asignacionClima` queda en `null` hasta decidir. No asumas "un ciclo = un año". Se registra en `docs/01` |
| Tipos | Dos generadores de tipos: el cliente del API desde OpenAPI (decisión del 14/11) y `contratos/tipos/` desde los JSON Schema | Por decidir (Mompin y Eduardo): que FastAPI exponga los mismos schemas o que el cliente OpenAPI se use solo para las rutas. No dupliques tipos a mano |
| V-20 | Cultivos y calendario de Isla en SIAP | Milpa como núcleo; no inventes fechas de siembra. Las ventanas del catálogo quedan `NO_EVALUABLE` |
| V-21 | Horizonte del pronóstico estacional de Open-Meteo | La página oficial dice 7 meses (6 por defecto); el 9 viene de terceros (ver [[APIs]]). Confirmar con una llamada. No bloquea el MVP |
| V-22 | CORS de NASA POWER | Todo el clima pasa por el backend |
| V-23 | Qué servicio de suelo responde (ISRIC WCS u OpenLandMap) | Selector manual FAO-56 con etiqueta `SUPUESTO` |
| V-06 | `GWETROOT` y unidades de radiación de POWER | No uses la humedad de suelo de POWER en el balance hasta probar el endpoint. El contrato espera `radiacionMjM2Dia`; el backend convierte |
| V-08 | Elevación: Open-Meteo Elevation, Terrarium o SRTM | El relieve es del MVP, pero el proveedor se prueba antes de fijar el cliente |
| V-09 | Kc, ciclos, umbrales | Solo valores con cita. Si no hay cita, `NO_EVALUABLE` (el schema del catálogo lo obliga) |

## Servidor (Eduardo)

| ID | Tema |
| --- | --- |
| V-15 | SSH, usuario y firewall del droplet |
| V-16 | Puertos y servicios que ya usa `mediworks` |
| V-17 | Hostname (`sslip.io` u otro) y certificado |

## Decidido el 14/11 (no lo reabras)

Detalle en `docs/13`. Ranking con el criterio B, respaldo A si A3.7 no llega (ver V-19 arriba). Motor en TypeScript dentro de un Web Worker; backend FastAPI solo proxy, caché y extras de Earthdata; polígono libre dentro del MVP; servidor en el droplet de Eduardo, sin dominio; documentación en `docs/` del repo; cronograma por esfuerzo de IA; capa "próxima temporada" como banda de incertidumbre, después del motor; pH y textura estimados con etiqueta `SUPUESTO`; catálogo propio de cultivos en JSON (EcoCrop y FAO-56); zona demo en Isla con la milpa como núcleo; reparto por actividad, no por rol.

## Siguen en evento o en datos, aunque 13 haya cerrado otras cosas

- Slider de meses: no es compuerta.
- Prioridades del agricultor (agua, ingreso, suelo) y su rotación actual: mejora.
- Sliders "lluvia −20 %" y "temperatura +2 °C": mejora. Si entran, la serie ajustada va como `EXPLORATORIO`.
- Pilares 2 y 3: solo si A2.7 ya está y los datos alcanzan.
- GPM, SMAP, MODIS: actividad L, después de C1.
- Horario real de la sede, formato de video y reglas de declaración de IA (V-01, V-03, V-04).

## Tablero

El reparto inicial del 14/11 ya está en `docs/14` (tablero al final). Cada quien marca el estado de sus actividades (`[EN CURSO]`, `[BLOQUEADO]`, `[HECHO]`) junto al ID. No te asignes actividades de otro sin acordarlo con el equipo.
