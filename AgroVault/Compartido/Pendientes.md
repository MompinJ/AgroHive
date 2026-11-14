---
tipo: pendientes
audiencia: todas
actualizado: 2026-11-14
---

# Pendientes

No cierres una fila "para ir avanzando". Si un default es inevitable para compilar, déjalo detrás de una constante con el id y un comentario `VERIFICAR`. El tablero generado está en [[Cronograma]]. Algunas marcas de `docs/14` van detrás del código; abajo se dice cuál.

## Hecho y que el vault no debe volver a abrir

Motor de agua, escenarios, ranking B, pilares de compatibilidad y suelo desnudo, años análogos, tarjetas en el motor, regresión, contratos 0.10.0, catálogo y calendario de Isla, TAW de Saxton y Rawls conectado a `/api/suelo`, ISRIC y OpenLandMap, IMERG como evidencia, escena 3D con modelos de la milpa y el chile, losas de suelo en la escena, estados con daltonismo, selector R1–R4, banda en la interfaz, paquete de demo, API y front en el droplet. Detalle en [[Resumen]] y `docs/13`.

## Marcas de `docs/14` que ya no describen el código

| ID | La marca dice | El código, el 14/11 por la noche |
| --- | --- | --- |
| A4.6 | Falta conectar las páginas | `useLaboratorio.ts` carga el paquete de demo o `cargarDatosParcela` y llama al Worker. Sigue `[EN CURSO]` hasta que el equipo la cierre: no se declara la demo pública ni el modo sin red de punta a punta |
| A4.9 | A2.13 aún dice "falta la interfaz" | A4.9 está `[HECHO]`: la banda se muestra y se apaga |
| A4.8 | Falta el schema `smap` | `contratos/smap.schema.json` existe desde 0.10.0. Sigue abierto el token en el droplet y el uso en la interfaz |
| A2.12 / A3.1 | La escena no carga losas o no está en el Laboratorio | La escena carga las 9 losas y el Laboratorio la monta en diferido |
| C2 en `docs/14` | El TAW de Isla es `NO_EVALUABLE` | El suelo del paquete trae TAW 122.3 mm/m y la rotación sale `EVALUABLE` |

No reescribas esas filas de `docs/14` si no te toca el cronograma. Sí puedes dejar de tratarlas como trabajo por hacer.

## Abierto de verdad

| ID | Qué falta |
| --- | --- |
| A3.6 | Modo 2D con los mismos números. Bloquea A5.4 |
| A3.8 | Tooltip o toque: humedad, déficit, pendiente |
| A3.9 | Chile y mascota hechos. Falta revisión humana del visor y de la equivalencia pimiento dulce. La escena no muestra la mascota. Props descartados |
| A4.1 | Gráficas de lluvia, demanda y balance (balam). El motor ya entrega las series: `cliente.serieBalance(rotacionId, escenario)` con lluvia, ET0, ETc, ETc ajustada, Dr, RAW, humedad, percolación y déficit por día y por mes, por ciclo (contrato `serie-balance` 0.11.0). La interfaz no recalcula |
| A4.3 | Pintar `explicacion` en la comparación. La plantilla ya sale de `rankear` |
| A4.4 | Redacción con LLM, opcional, solo sobre números ya calculados |
| A4.5 | Pantalla de método, fuentes y advertencias |
| A4.6 | Cerrar el flujo con datos vivos y sin red. Ver la fila de arriba |
| A4.7 | El droplet sirve front y API. La demo "real" espera el cierre de A4.6. Último despliegue anotado en `docs/01`: `main` `d182af4` |
| A4.8 | `/api/smap` existe. Sin `EARTHDATA_TOKEN` en el servidor responde 503. Hace falta el OK explícito para poner el token. No entra al ranking |
| A4.11 | `GET /api/ndvi` (MOD13Q1). El contrato ya existe. No entra al ranking |
| A4.12 | CDL y SSURGO, después de C5, solo en EE. UU. |
| A4.13 | Calendario GGCMI fuera de México, después de C4. En México siguen SIAP e INIFAP |
| A5.1 | Animación mínima al cambiar de etapa |
| A5.2 | Slider de meses |
| A5.3 | Móvil y teclado de punta a punta |
| A5.6 | Hay guion en `docs/guion-video-borrador.md`. Falta grabar. Duración y reglas `[VERIFICAR]` (V-03, V-04) |
| A5.7 | `[EN CURSO]` (Mafer): `README.md` ya reemplaza al anterior. Falta la revisión humana de licencias y de la declaración de IA: decidir la licencia del repo, marca de agua en imágenes generadas con IA (`web/src/ui/assets`, video) y citas de NSIDC e IMERG. Reglas oficiales leídas el 14/11: demo = 7 slides o video de 30 s o menos, en inglés (ver `docs/01`). Licencias sin constancia en el repo: `[VERIFICAR]` |
| A5.8 | Capturas y demo con la red apagada. Bloqueada por A4.6 |
| A5.9 | Envío |
| A0.3 | Sigue sin marca. El ranking y los cultivos ya se decidieron en `docs/13` |
| A0.5 | Reglas oficiales de entrega, video e IA |
| V-19 | Solo queda pintar por bloques `[EN EVENTO]`. `porCelda` sigue `null` |
| V-22 | POWER responde CORS en el GET simple. El clima igual pasa por el backend |
| V-24 | Decir en el pitch el rango, no una temporada exacta |
| V-01, V-03, V-04 | Horario de sede, formato de entrega y declaración de IA |

## Huecos científicos que el motor deja en `NO_EVALUABLE` a propósito

- Índice de erosión: faltan I30 y los factores C y LS con fuente.
- Estrés por calor: el catálogo no trae umbral citado.
- `estadoPlanta` no pasa a `podrida`.
- Sin escurrimiento por pendiente.
- Frijol PV, chile y calabaza en Isla: sin ventana de siembra.
- Calabaza en Isla: se muestra y no se recomienda.
- Fuera de México: sin calendario hasta A4.13.
- Kc sin ajuste por altura del cultivo.
- Normalización del exceso (1 − fracción percolada) es `SUPUESTO`.

## No reabrir

Ranking B, `temporada_tipica`, horizonte de 6 meses, Terrarium por defecto, ISRIC como estimación usada (OpenLandMap de respaldo), `GWETROOT` convertido, TAW por Saxton y Rawls, tipos desde `contratos/`, Three.js sin React Three Fiber, `sslip.io`, buzón local, orientación de la cuadrícula, IMERG fuera del balance. Lista completa en `docs/13`.
