---
tipo: pendientes
audiencia: todas
actualizado: 2026-11-14
---

# Pendientes

No cierres una fila "para ir avanzando". Si un default es inevitable para compilar, déjalo detrás de una constante con el id y un comentario `VERIFICAR`. El tablero generado está en [[Cronograma]]. Algunas marcas de `docs/14` van detrás del código; abajo se dice cuál.

## Hecho y que el vault no debe volver a abrir

Motor de agua, escenarios, ranking B, pilares de compatibilidad y suelo desnudo, años análogos, tarjetas en el motor, regresión, contratos 0.12.2, catálogo y calendario de Isla, TAW de Saxton y Rawls conectado a `/api/suelo`, ISRIC y OpenLandMap, IMERG como evidencia, escena 3D con modelos de los 8 cultivos del catálogo (milpa, chile, sorgo, sandía, camote y cacahuate; los cuatro últimos en `Mompin-escena` el 14/11 noche), catálogo ampliado a 40 cultivos (los 32 nuevos sin modelo 3D, con planta provisional; `Mompin-features`, 15/11), losas de suelo en la escena, estados con daltonismo, selector R1–R4, banda en la interfaz, paquete de demo, API y front en el droplet. Detalle en [[Resumen]] y `docs/13`.

## Marcas de `docs/14` que ya no describen el código

| ID | La marca dice | El código, el 14/11 por la noche |
| --- | --- | --- |
| A4.6 | Falta conectar las páginas | `[HECHO]` el 14/11 noche: P0 a P3 de la demo de Isla y la API local sin red. La URL pública quedó en A4.7 (`23f8a53`) |
| A4.9 | A2.13 aún dice "falta la interfaz" | A4.9 está `[HECHO]`: la banda se muestra y se apaga |
| A4.8 | Falta el schema `smap` | `[HECHO]` el 14/11 noche: el schema existe desde 0.10.0 y `GET /api/smap` publico devolvio humedad real. La interfaz no llama a SMAP (contraste, fuera del ranking) |
| A2.12 / A3.1 | La escena no carga losas o no está en el Laboratorio | La escena carga las 9 losas y el Laboratorio la monta en diferido |
| C2 en `docs/14` | El TAW de Isla es `NO_EVALUABLE` | El suelo del paquete trae TAW 122.3 mm/m y la rotación sale `EVALUABLE` |
| A1.1 | **`[HECHO]`** (14/11): `main` en verde y contratos revisados por el equipo en persona | Contratos v0.13.0 en `contratos/`: 16 schemas (más `comun`), ejemplos, `npm test` (101/101) y tipos TS. Ver [[Contratos]] |
| A2.5, A2.6, A2.7 | Hechas (Mompin, integradas a `main`) | Motor en `web/src/motor/` (funciones puras + Web Worker; la interfaz usa `crearClienteMotor()`): escenarios por lluvia de temporadas PV+OI de SIAP, ET0 Penman-Monteith FAO-56, cubeta FAO-56 cap. 8, pilar de déficit hídrico y estados. Pruebas 1 a 5 de doc 05 en verde (`cd web && npm test`; la parte de erosión de la prueba 2 pasa a A3.7). Ver `docs/05` |
| A4.1 | Parte del motor hecha (Mompin), contrato `serie-balance` 0.11.0; balam lo grafica en el dashboard (`[HECHO]`) | `cliente.serieBalance(rotacionId, escenario)`: lluvia, ET0, ETc, ETc ajustada, Dr, RAW, humedad, percolación y déficit por día y por mes, por ciclo. La interfaz no recalcula |
| A4.3 | `[HECHO]`: lógica de Mompin; `TarjetasRotacion` la muestra en el laboratorio y la comparación (balam) | `web/src/motor/tarjetas.ts` llena `explicacion` (por qué, evidencia con fuente, beneficios, huecos, riesgos) y el Worker la devuelve en `rankear`. Plantilla sin LLM; nada sin número o fuente |
| A5.5 | Hecha (Mompin) | Regresión de la demo en `web/src/motor/pruebas/regresion.test.ts` contra `regresion/demo-isla.json`: escenarios, pilares de la milpa, estados, ranking y análogos. Si un cambio mueve un número a propósito, se regenera con `ACTUALIZAR_REGRESION=1` y se explica en `docs/01` |
| A3.7 | Hecha (Mompin) | Compatibilidad de ciclo con el calendario de Isla (frijol PV, chile y calabaza sin ventana con fuente ⇒ `NO_EVALUABLE`); protección del suelo por días de suelo desnudo; índice de erosión `NO_EVALUABLE` sin I30 ni C/LS con fuente. Ranking B con hasta cuatro pilares; con el suelo real gana la milpa sembrada dentro de ventana. Pendiente si hay datos: índice de erosión y umbral de calor con fuente |
| A2.13 | Hecha la parte del motor (Mompin) | Banda validada y comparada con los escenarios; escenario de años análogos reales en `resultado-rotacion.proximaTemporada` (contratos 0.8.0), `EXPLORATORIO`, rango sin cifra única y fuera del ranking. La interfaz ya está (A4.9 `[HECHO]`, balam) con el aviso "años parecidos a lo que se espera, no es predicción" |
| A4.2 | Hecha (Mompin) | Ranking B con hasta cuatro pilares: déficit, exceso de agua (`excesoHidrico`, contratos 0.7.0, `[DECIDIDO]` 14/11), compatibilidad y protección del suelo (A3.7), pesos iguales `SUPUESTO`. Normalización en `docs/05`, paso 7. Desempate del p50 `[DECIDIDO]`: el año más reciente (habitual 2016). Con el suelo real de Isla (A3.7): 1.º milpa, 2.º frijol-frijol, 3.º maíz-maíz; con una milpa sembrada dentro de ventana gana esa (ver `docs/05`, paso 7) |
| A3.3 | **`[HECHO]`** (Mafer) | Estados legibles con daltonismo: simulación de Machado et al. 2009 en `web/src/escena/daltonismo.ts` y pruebas (dE ≥ 15 entre estados, íconos y patrones distintos). `NO_EVALUABLE` pasó a `#ececec`; íconos finales; ver `docs/06` |
| A2.11 | **`[HECHO]`** (Mafer): frijol y calabaza, validados en el visor | `modelos/cultivos/`: 5 etapas de cada uno, paleta de 60 colores. Sin modelo propio para `estresada` y `marchita` (placa de estado). Abrir `visor_milpa.html` |
| A5.7 | `[EN CURSO]` (Mafer): README hecho, **falta revision humana de licencias y de la declaracion de IA** | `README.md` ya reemplaza al anterior. Pendiente: decidir la licencia del repo; marca de agua en imagenes generadas con IA (web/src/ui/assets); citas de NSIDC y de IMERG |
| A3.9 | **`[HECHO]`** (Mafer): chile y mascota; props (pozo, casa, arboles, pajaro) descartados, de acuerdo con Mompin | El chile usa los parametros del **pimiento dulce** (misma especie): **revisar**. La mascota es un **elote** (la eligio A3.9, los docs no fijan la verdura): `modelos/props/mascota_feliz.bbmodel`; la escena reservara un lugar opcional. `web/src/ui/planes.ts` ya nombra el chile (balam) |
| A2.12 | **`[HECHO]`** (Mafer) | 9 losas de suelo en `modelos/suelos/` (tipo × humedad), para ponerse encima de la columna. La escena las carga (`web/src/escena/modelo.ts`, campo `losa`). Ver `docs/07` |
| A2.16 | **`[HECHO]`** (Mafer, conectada por Eduardo y desplegada) | Función y pruebas en `datos/catalogos/saxton_rawls.py`, verificada contra la Tabla 3 del artículo: arena y arcilla en fracción, **materia orgánica en porcentaje**. Sin materia orgánica, o con materia orgánica > 8 % o arcilla > 60 %, el TAW queda `NO_EVALUABLE`. El carbono orgánico de SoilGrids pasa a materia orgánica con el factor 1.724 (citarlo) |
| A3.1, A3.2 | **`[HECHO]`** (Mompin, rama `Mompin-escena`) | `web/src/escena/`: relieve por bloque, huecos `NO_EVALUABLE` (nunca cero), tope de 1600 celdas, placas de estado (base de A3.3 en `estilos-estado.ts`) y `.bbmodel` por cultivo + etapa con `InstancedMesh`. Vista previa `web/escena.html` con el motor real. Montada en el Laboratorio (A4.6 `[HECHO]`) |
| A1.5, A1.6 | Hechas (Mafer) | `datos/catalogos/`: milpa (maiz, frijol, calabaza) desde FAO-56 y EcoCrop, y TAW por textura (FAO-56 Tabla 19), validados contra contratos 0.3.0 (`cultivo` y `tabla-suelos`); `python datos/catalogos/generar.py` y `node datos/catalogos/validar.mjs`. La lluvia de EcoCrop va en `lluviaAnual*`; `lluviaCiclo*`, umbral de calor y ventanas de siembra siguen `NO_EVALUABLE` |

No reescribas esas filas de `docs/14` si no te toca el cronograma. Sí puedes dejar de tratarlas como trabajo por hacer.

## Abierto de verdad

**Fase de revisión** `[DECIDIDO]` (Mompin, 14/11 noche): se revisa y valida lo que está en `main`, sobre todo el frontend. A0.3, A4.4, A5.7 y A5.9 quedan pospuestas hasta el final y el envío se hace solo cuando todos digan que están satisfechos (`docs/13`, `docs/14`). Los hallazgos de la revisión van por el buzón (pantalla, qué pasa, dueño, estado).

Corte 14/11, 18:45, desde las marcas de `docs/14`: 56 de 60 hechas. Plan, decisiones abiertas y cola por persona del día final: `docs/16-PLAN-DIA-FINAL.md` (corte 14/11, 23:10).

| ID | Qué falta |
| --- | --- |
| A0.3 | Pospuesta (fase de revisión). Acta de roles, cultivos y criterio de ranking (equipo). Lo decidido ya está en `docs/13` |
| A3.9 | Chile y mascota hechos; la escena muestra la mascota por defecto (`EscenaParcela`, `mascota = true`). Falta la revisión humana del visor y de la equivalencia con el pimiento dulce |
| A4.4 | Pospuesta (fase de revisión). Redacción con LLM, opcional, solo sobre números ya calculados |
| A4.13 | Hecha en la API (`GET /api/calendario`) y conectada: `web/src/api/datosParcela.ts` la pide para parcelas propias; si falla, avisa y las fechas quedan `NO_EVALUABLE` |
| A5.7 | `[EN CURSO]`, pospuesta (fase de revisión) (Mafer): `README.md` ya reemplaza al anterior. Falta la revisión humana de licencias y de la declaración de IA: decidir la licencia del repo, marca de agua en imágenes generadas con IA (`web/src/ui/assets`) y citas de NSIDC e IMERG. Licencias sin constancia en el repo: `[VERIFICAR]` |
| A5.9 | Pospuesta: envío final según las reglas oficiales (`docs/02`), solo cuando todos estén satisfechos |
| Back | Auditoría del 14/11 noche (`docs/hallazgos-back.md`, rama `Mompin-fallos`): 21 de 22 arreglados en dos rondas; H-B6, H-M1 y H-M9 los decidió Mompin. Falta H-M7 (horizonte de los análogos que cruza septiembre), propuesto al motor. Falta integrar la segunda ronda a `main` y desplegar la API |

## Huecos científicos que el motor deja en `NO_EVALUABLE` a propósito

- Índice de erosión: faltan I30 y los factores C y LS con fuente.
- Estrés por calor: el catálogo no trae umbral citado.
- `estadoPlanta` no pasa a `podrida`.
- Sin escurrimiento por pendiente.
- Frijol PV, chile y calabaza en Isla: sin ventana de siembra.
- Calabaza en Isla: se muestra y no se recomienda.
- Fuera de México: la API devuelve solo el maíz de temporal de GGCMI (`GET /api/calendario`, ya la llama el front); frijol, calabaza y chile quedan `NO_EVALUABLE` en fechas.
- Kc sin ajuste por altura del cultivo.
- Normalización del exceso (1 − fracción percolada) es `SUPUESTO`.

## No reabrir

Ranking B, `temporada_tipica`, horizonte de 6 meses, Terrarium por defecto, ISRIC como estimación usada (OpenLandMap de respaldo), `GWETROOT` convertido, TAW por Saxton y Rawls, tipos desde `contratos/`, Three.js sin React Three Fiber, `sslip.io`, buzón local, orientación de la cuadrícula, IMERG fuera del balance. Lista completa en `docs/13`.
