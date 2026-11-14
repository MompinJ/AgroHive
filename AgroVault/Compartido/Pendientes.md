---
tipo: pendientes
audiencia: todas
actualizado: 2026-11-14
---

# Pendientes

No cierres estas filas en código "para ir avanzando". Si un default es inevitable para compilar, déjalo detrás de una constante con el id de la fila y un comentario `VERIFICAR`.

## Abiertos que cambian el diseño

| ID | Tema | Mientras tanto |
| --- | --- | --- |
| V-19 | Ranking A o B, y si se pinta por bloques | Compara por peor caso hídrico (A) sin ponderaciones. `porCelda` queda `null` |
| V-20 | Cultivos y calendario de Isla en SIAP | Milpa como núcleo; no inventes fechas de siembra |
| V-21 | Horizonte del pronóstico estacional Open-Meteo (7 o 9 meses) | No bloquea el MVP. No muestres la capa hasta tener el dato |
| V-22 | CORS de NASA POWER | Todo el clima pasa por el backend |
| V-23 | Qué servicio de suelo responde (ISRIC WCS u OpenLandMap) | Selector manual FAO-56 con etiqueta `SUPUESTO` |
| V-06 | `GWETROOT` y unidades de radiación POWER | No uses humedad de suelo de POWER en el balance hasta probar el endpoint |
| V-08 | Elevación SRTM o Terrarium | El relieve es del MVP, pero el proveedor se prueba antes de fijar el cliente |
| V-09 | Kc, ciclos, umbrales | Solo valores con cita. Si no hay cita, `NO_EVALUABLE` |
| Paso 2 de `docs/05` | Cómo se reparte el clima entre los tres ciclos | No asumas "un ciclo = un año" |

## Servidor (Eduardo)

| ID | Tema |
| --- | --- |
| V-15 | SSH, usuario y firewall del droplet |
| V-16 | Puertos y servicios que ya usa `mediworks` |
| V-17 | Hostname (`sslip.io` u otro) y certificado |

## Siguen en evento o en datos, aunque 13 haya cerrado otras cosas

- Slider de meses: no es compuerta.
- Prioridades del agricultor (agua, ingreso, suelo) y su rotación actual: mejora.
- Sliders "lluvia −20 %" y "temperatura +2 °C": mejora.
- Pilares 2 y 3: solo si A2.7 ya está y los datos alcanzan.
- GPM, SMAP, MODIS: actividad L, después de C1.
- Horario real de la sede, formato de video y reglas de declaración de IA (V-01, V-03, V-04).

## Tablero

En `docs/14` el tablero de reparto sigue vacío. No te asignes actividades en ese archivo salvo que el equipo te lo pida en el chat.
