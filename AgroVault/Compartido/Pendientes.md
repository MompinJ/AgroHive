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
| A4.6 | Falta conectar las páginas | `[HECHO]` el 14/11 noche: P0 a P3 de la demo de Isla y la API local sin red. La URL pública sigue en `d182af4` (A4.7) |
| A4.9 | A2.13 aún dice "falta la interfaz" | A4.9 está `[HECHO]`: la banda se muestra y se apaga |
| A4.8 | Falta el schema `smap` | `contratos/smap.schema.json` existe desde 0.10.0. Sigue abierto el token en el droplet y el uso en la interfaz |
| A2.12 / A3.1 | La escena no carga losas o no está en el Laboratorio | La escena carga las 9 losas y el Laboratorio la monta en diferido |
| C2 en `docs/14` | El TAW de Isla es `NO_EVALUABLE` | El suelo del paquete trae TAW 122.3 mm/m y la rotación sale `EVALUABLE` |
| A1.1 | **`[HECHO]`** (14/11): `main` en verde y contratos revisados por el equipo en persona | Contratos v0.12.2 en `contratos/`: 15 schemas (más `comun`), ejemplos, `npm test` (92/92) y tipos TS. Ver [[Contratos]] |
| A2.5, A2.6, A2.7 | Hechas (Mompin, integradas a `main`) | Motor en `web/src/motor/` (funciones puras + Web Worker; la interfaz usa `crearClienteMotor()`): escenarios por lluvia de temporadas PV+OI de SIAP, ET0 Penman-Monteith FAO-56, cubeta FAO-56 cap. 8, pilar de déficit hídrico y estados. Pruebas 1 a 5 de doc 05 en verde (`cd web && npm test`; la parte de erosión de la prueba 2 pasa a A3.7). Ver `docs/05` |
| A4.1 | Parte del motor hecha (Mompin), contrato `serie-balance` 0.11.0; falta graficar (balam) | `cliente.serieBalance(rotacionId, escenario)`: lluvia, ET0, ETc, ETc ajustada, Dr, RAW, humedad, percolación y déficit por día y por mes, por ciclo. La interfaz no recalcula |
| A4.3 | Parte lógica hecha (Mompin); falta mostrarla (balam) | `web/src/motor/tarjetas.ts` llena `explicacion` (por qué, evidencia con fuente, beneficios, huecos, riesgos) y el Worker la devuelve en `rankear`. Plantilla sin LLM; nada sin número o fuente |
| A5.5 | Hecha (Mompin) | Regresión de la demo en `web/src/motor/pruebas/regresion.test.ts` contra `regresion/demo-isla.json`: escenarios, pilares de la milpa, estados, ranking y análogos. Si un cambio mueve un número a propósito, se regenera con `ACTUALIZAR_REGRESION=1` y se explica en `docs/01` |
| A3.7 | Hecha (Mompin) | Compatibilidad de ciclo con el calendario de Isla (frijol PV, chile y calabaza sin ventana con fuente ⇒ `NO_EVALUABLE`); protección del suelo por días de suelo desnudo; índice de erosión `NO_EVALUABLE` sin I30 ni C/LS con fuente. Ranking B con hasta cuatro pilares; con el suelo real gana la milpa sembrada dentro de ventana. Pendiente si hay datos: índice de erosión y umbral de calor con fuente |
| A2.13 | Hecha la parte del motor (Mompin) | Banda validada y comparada con los escenarios; escenario de años análogos reales en `resultado-rotacion.proximaTemporada` (contratos 0.8.0), `EXPLORATORIO`, rango sin cifra única y fuera del ranking. Falta la interfaz (A4.9, balam) con el aviso "años parecidos a lo que se espera, no es predicción" |
| A4.2 | Hecha (Mompin) | Ranking B con hasta cuatro pilares: déficit, exceso de agua (`excesoHidrico`, contratos 0.7.0, `[DECIDIDO]` 14/11), compatibilidad y protección del suelo (A3.7), pesos iguales `SUPUESTO`. Normalización en `docs/05`, paso 7. Desempate del p50 `[DECIDIDO]`: el año más reciente (habitual 2016). Con el suelo real de Isla (A3.7): 1.º milpa, 2.º frijol-frijol, 3.º maíz-maíz; con una milpa sembrada dentro de ventana gana esa (ver `docs/05`, paso 7) |
| A3.3 | **`[HECHO]`** (Mafer) | Estados legibles con daltonismo: simulación de Machado et al. 2009 en `web/src/escena/daltonismo.ts` y pruebas (dE ≥ 15 entre estados, íconos y patrones distintos). `NO_EVALUABLE` pasó a `#ececec`; íconos finales; ver `docs/06` |
| A2.11 | **`[HECHO]`** (Mafer): frijol y calabaza, validados en el visor | `modelos/cultivos/`: 5 etapas de cada uno, paleta de 60 colores. Sin modelo propio para `estresada` y `marchita` (placa de estado). Abrir `visor_milpa.html` |
| A5.7 | `[EN CURSO]` (Mafer): README hecho, **falta revision humana de licencias y de la declaracion de IA** | `README.md` ya reemplaza al anterior. Pendiente: decidir la licencia del repo; marca de agua en imagenes generadas con IA (web/src/ui/assets); citas de NSIDC y de IMERG |
| A3.9 | **`[HECHO]`** (Mafer): chile y mascota; props (pozo, casa, arboles, pajaro) descartados, de acuerdo con Mompin | El chile usa los parametros del **pimiento dulce** (misma especie): **revisar**. La mascota es un **elote** (la eligio A3.9, los docs no fijan la verdura): `modelos/props/mascota_feliz.bbmodel`; la escena reservara un lugar opcional. `web/src/ui/demo.ts` aun no lista el chile (balam) |
| A2.12 | **`[HECHO]`** (Mafer) | 9 losas de suelo en `modelos/suelos/` (tipo × humedad), para ponerse encima de la columna. **La escena aún no las carga** (hoy colorea la columna sin distinguir tipo); la integración es de A3. Ver `docs/07` |
| A2.16 | **`[HECHO]`** (Mafer, conectada por Eduardo y desplegada) | Función y pruebas en `datos/catalogos/saxton_rawls.py`, verificada contra la Tabla 3 del artículo: arena y arcilla en fracción, **materia orgánica en porcentaje**. Sin materia orgánica, o con materia orgánica > 8 % o arcilla > 60 %, el TAW queda `NO_EVALUABLE`. El carbono orgánico de SoilGrids pasa a materia orgánica con el factor 1.724 (citarlo) |
| A3.1, A3.2 | **`[HECHO]`** (Mompin, rama `Mompin-escena`) | `web/src/escena/`: relieve por bloque, huecos `NO_EVALUABLE` (nunca cero), tope de 1600 celdas, placas de estado (base de A3.3 en `estilos-estado.ts`) y `.bbmodel` por cultivo + etapa con `InstancedMesh`. Vista previa `web/escena.html` con el motor real. Falta: montarla en Laboratorio (balam, ver `web/src/escena/INTEGRACION.md`), `server.fs.allow` en `vite.config.ts` para `npm run dev`, modelos de frijol y calabaza (A2.11) |
| A1.5, A1.6 | Hechas (Mafer) | `datos/catalogos/`: milpa (maiz, frijol, calabaza) desde FAO-56 y EcoCrop, y TAW por textura (FAO-56 Tabla 19), validados contra contratos 0.3.0 (`cultivo` y `tabla-suelos`); `python datos/catalogos/generar.py` y `node datos/catalogos/validar.mjs`. La lluvia de EcoCrop va en `lluviaAnual*`; `lluviaCiclo*`, umbral de calor y ventanas de siembra siguen `NO_EVALUABLE` |

No reescribas esas filas de `docs/14` si no te toca el cronograma. Sí puedes dejar de tratarlas como trabajo por hacer.

## Abierto de verdad

| ID | Qué falta |
| --- | --- |
| A3.6 | Hecho en `origin/main` (`58fab7a`). Esta rama todavía no lo tiene, así que A5.4 sigue bloqueada aquí |
| A3.8 | Tooltip o toque: humedad, déficit, pendiente |
| A3.9 | Chile y mascota hechos. Falta revisión humana del visor y de la equivalencia pimiento dulce. La escena no muestra la mascota. Props descartados |
| A4.1 | Gráficas de lluvia, demanda y balance (balam). El motor ya entrega las series: `cliente.serieBalance(rotacionId, escenario)` con lluvia, ET0, ETc, ETc ajustada, Dr, RAW, humedad, percolación y déficit por día y por mes, por ciclo (contrato `serie-balance` 0.11.0). La interfaz no recalcula |
| A4.3 | Pintar `explicacion` en la comparación. La plantilla ya sale de `rankear` |
| A4.4 | Redacción con LLM, opcional, solo sobre números ya calculados |
| A4.5 | Pantalla de método, fuentes y advertencias |
| A4.7 | La URL pública responde, pero el droplet sigue en `d182af4` (contrato 0.9.0). Esta sesión no pudo entrar por SSH |
| A4.8 | `/api/smap` existe y sin token responde 503. Hace falta el OK explícito para `EARTHDATA_TOKEN` en el droplet. No está en la interfaz ni entra al ranking |
| A4.12 | CDL y SSURGO, después de C5. C5 no está cruzada |
| A4.13 | Hecha en la API: `GET /api/calendario`. El front sigue leyendo solo `calendario-isla.json` (balam) |
| A5.1 | Animación mínima al cambiar de etapa |
| A5.2 | Slider de meses |
| A5.3 | Móvil y teclado de punta a punta |
| A5.7 | `[EN CURSO]` (Mafer): `README.md` ya reemplaza al anterior. Falta la revisión humana de licencias y de la declaración de IA: decidir la licencia del repo, marca de agua en imágenes generadas con IA (`web/src/ui/assets`) y citas de NSIDC e IMERG. Licencias sin constancia en el repo: `[VERIFICAR]` |
| A5.8 | Hecha en local con la salida bloqueada (no con el wifi apagado). Ver `docs/demo-sin-red.md` |
| A5.9 | Envío |
| A0.3 | Sigue sin marca. El ranking y los cultivos ya se decidieron en `docs/13` |
| A0.5 | Reglas oficiales de entrega e IA |
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
- Fuera de México: la API ya devuelve el maíz de GGCMI (`GET /api/calendario`). El front todavía no la llama.
- Kc sin ajuste por altura del cultivo.
- Normalización del exceso (1 − fracción percolada) es `SUPUESTO`.

## No reabrir

Ranking B, `temporada_tipica`, horizonte de 6 meses, Terrarium por defecto, ISRIC como estimación usada (OpenLandMap de respaldo), `GWETROOT` convertido, TAW por Saxton y Rawls, tipos desde `contratos/`, Three.js sin React Three Fiber, `sslip.io`, buzón local, orientación de la cuadrícula, IMERG fuera del balance. Lista completa en `docs/13`.
