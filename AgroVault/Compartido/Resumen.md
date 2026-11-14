---
tipo: resumen
audiencia: todas
actualizado: 2026-11-14
fuente: docs/00 a docs/14
---

# Resumen de AgroHive

Equipo **Code Hive**. Reto **Field Shift: Adapting Farms with NASA Data**, NASA Space Apps Challenge 2026, sede USBI Boca del Río, Veracruz, 14 y 15 de noviembre de 2026. Cuatro integrantes. Ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo`.

## Qué se construye

Simulador visual "what if" para comparar **rotaciones de cultivos** contra la historia climática real de NASA. No busca la rotación de mayor rendimiento: busca la **más robusta**, la que no colapsa en el peor año histórico.

Persona guía: Elena, productora ficticia de temporal en Veracruz. La decisión final es suya. El sistema explica, muestra evidencia y riesgos. No reemplaza a un agrónomo.

Rotación = secuencia en el tiempo (ciclo 1, ciclo 2, ciclo 3), no sembrar todo junto. La escena muestra el cultivo **del ciclo elegido**.

### Qué sí hace el MVP

- Parcela en mapa y polígono libre que genera la cuadrícula (entró al MVP el 14/11).
- Relieve real: elevación y pendiente por bloque.
- Selector de cultivos por ciclo, rotaciones de ejemplo y escenario seco / habitual / lluvioso.
- Valores por bloque y gráficas de lluvia, demanda y balance.
- Al menos tres rotaciones comparadas por peor caso, con por qué, evidencia, beneficios, huecos y riesgos.
- Modo 2D con los mismos números. Métodos, fuentes y advertencias siempre a la vista.
- Paquete de demo precargado para que la demo no dependa del wifi.

### Qué no hace

- No predice una temporada exacta. La capa opcional de "próxima temporada" es un rango de 6 meses (distribución histórica desplazada por la anomalía de SEAS5, sin tendencia), va después del motor y no bloquea el MVP.
- No predice toneladas, cosechas ni ingresos.
- No mide pH ni fertilidad. El pH mostrado es estimación de un modelo global.
- No detecta edificios, caminos ni árboles desde imágenes.

Frase de demo: AgroHive convierte la historia climática de NASA en comparaciones de rotaciones comprensibles. No adivina la cosecha.

## Caso de demo

| Campo | Valor |
| --- | --- |
| Zona | Municipio de Isla, Veracruz. Temporal, sin riego. Pendiente de confirmar en SIAP (V-20) |
| Superficie | 2 ha ficticias, no catastrales |
| Historial | 2006–2025 (20 años). Respaldo 2016–2025. 2026 no es un año completo |
| Cultivos núcleo | Milpa: maíz, frijol, calabaza. Chile si da tiempo el modelado |
| Catálogo | JSON propio, 6 a 8 cultivos, sembrado desde FAO EcoCrop (rangos) y Kc de FAO-56. Sin API de cultivos |
| Rotaciones de ejemplo | R0 maíz-maíz-maíz; R1 maíz-frijol-maíz; R2 se ajusta al catálogo real (en 03 aún dice sorgo) |
| Suelo | Selector manual (arcilloso, franco, arenoso) con TAW de FAO-56, etiqueta `SUPUESTO`. Además, textura y pH de zona de **ISRIC WCS y OpenLandMap**, comparados; TAW por pedotransferencia de Saxton y Rawls (2006) para cualquier textura, también `SUPUESTO` |

## Ciencia, en corto

Columna vertebral: **NASA POWER** diario, sin llave. Comunidad `AG`. Parámetros candidatos: `PRECTOTCORR`, `T2M`, `T2M_MIN`, `T2M_MAX`, radiación, humedad, viento. El mensual de lluvia viene en mm/día: el total del mes es ese valor por los días. `[VERIFICAR]` unidades de radiación y dónde vive `GWETROOT` (V-06).

Humedad de suelo de POWER (`GWETROOT`, V-06, decidido): condición inicial de la cubeta y comparación con la humedad simulada. Es fracción de saturación (MERRA-2, ~100 cm), no de TAW: se convierte con θsat, θFC y θWP antes de usarla.

Respaldo climático: Open-Meteo (archivo histórico). Si POWER cae, el estado es `RESPALDO_HISTORICO` o `ERROR_DATOS`, visible.

Elevación: Terrarium por defecto y Open-Meteo Elevation de respaldo (V-08, decidido); ver [[APIs]]. Es lo que hace distinto a cada bloque.

Otros datasets NASA (GPM, SMAP, MODIS, Landsat, ECOSTRESS, GRACE) son extra. Solo entran si se integran de verdad. SMAP, GPM y MODIS van por `earthaccess` en Python, por eso el backend es FastAPI.

Escenarios (`[DECIDIDO]` 14/11, A2.5 hecha): el año agrícola real más cercano a p10, p50 y p90 de la lluvia de las temporadas de siembra PV y OI de SIAP (OI oct *t*-1 a mar *t*, PV abr a sep *t*), no del año calendario; empate: el más reciente (`[DECIDIDO]`). Mostrar el año. Con el paquete de demo (POWER, 2005-10 a 2025): 2023 seco, 2016 habitual (empata con 2008 en el p50; gana el más reciente), 2024 lluvioso. Detalle en `docs/05`, paso 1. `[DEPENDE-DATOS]` si la robustez se calcula sobre todo el histórico o solo sobre esos tres años.

Motor, independiente del render (`docs/05`):

1. Perfil del histórico y elección de los tres años.
2. Asignación de clima a cada ciclo: **`[DECIDIDO]` (c) `temporada_tipica`**, cada ciclo en su temporada típica (PV u OI) dentro del año del escenario. La fecha de siembra la elige el usuario; el selector la sugiere desde el calendario local del municipio (`calendario-local`, fuente SIAP o INIFAP) y explica por qué. Un cultivo no registrado en el lugar se muestra, pero no se recomienda.
3. ET0 (la de Open-Meteo si viene; si no, Penman-Monteith FAO-56 con POWER; Hargreaves si faltan humedad, viento o radiación) y ETc = Kc de la etapa × ET0 (curva FAO-56 ec. 66). Duraciones de etapa publicadas. Hecho (A2.6, `web/src/motor/`).
4. Balance de cubeta por bloque (FAO-56 cap. 8, hecho en A2.6): lluvia entra, lo que no cabe es exceso (percolación), ETc sale, lo que no se cubre es déficit. TAW según suelo (Saxton y Rawls con el suelo del mapa); el agua al sembrar sale de GWETROOT convertida con θsat y θFC; sin retención (selector manual), arranque a capacidad de campo declarado. Pendiente: sin escurrimiento hasta tener coeficiente con fuente (A3.7).
5. Estrés hídrico, estrés por calor y avance fenológico. Salida cualitativa para el render.
6. Pilares: déficit (núcleo), exceso de agua (percolación profunda, FAO-56 ec. 88; decidido el 14/11 para el ranking B), compatibilidad de ciclo, erosión relativa (no toneladas, inspirada en USLE/RUSLE). Los dos últimos se recortan si faltan datos.
7. Ranking (A4.2 hecha, `ranking.ts`; hoy B con déficit y exceso de agua, `[DECIDIDO]` 14/11): el criterio principal es el peor caso. `[DECIDIDO]` el 14/11: opción B (puntaje compuesto por escenario, robustez = peor puntaje, arrepentimiento minimax, desempate por promedio). Pesos con fuente o, si no hay, iguales y declarados `SUPUESTO`. Si los pilares 2 y 3 (A3.7) no llegan, respaldo con la opción A (menor déficit en el peor caso). Si nada es evaluable, decirlo.
8. Próxima temporada (A2.13, hecha en el motor): años análogos reales dentro de la banda de lluvia; solo los ciclos que se siembran en el horizonte; rango `EXPLORATORIO`, sin cifra y sin ranking.
9. Tarjeta de explicación con plantilla. Un LLM, si se usa, solo redacta números ya calculados.

Estados: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`.

Pruebas mínimas del motor: año seco y suelo arenoso ⇒ déficit alto; año lluvioso y pendiente ⇒ exceso y erosión suben; leguminosa mejora el indicador indirecto de suelo frente a monocultivo; cambiar escenario no cambia el plan; cultivo sin parámetros ⇒ `NO_EVALUABLE`; 2D y 3D con las mismas métricas.

Prueba crítica de la UI: rotación R1, ciclo 2, escenario seco ⇒ la escena muestra **frijol** con la etapa y el estado de ese resultado.

## Stack decidido el 14/11

```text
Navegador
  React + Vite + TypeScript
  Leaflet (mapa y polígono), Turf.js (cuadrícula, tope ~1600 celdas)
  Three.js + React Three Fiber, InstancedMesh
  .bbmodel directo, sin paso obligatorio a glTF
  Recharts
  Motor en Web Worker (web/src/motor/)
        | HTTP JSON, contrato versionado
        v
FastAPI (api/)
  /health
  proxy y caché: POWER, Open-Meteo, elevación, suelo
  OpenAPI → cliente TypeScript de las llamadas HTTP
  modelos que respetan contratos/*.schema.json (con prueba)
  earthaccess solo para extras
        |
        v
JSON en disco (datos/cache/, no se sube) y paquete de demo
```

El Worker acelera el cálculo (percentiles, 20 años). No acelera la red ni el render 3D, que siguen en el hilo principal.

Con polígono libre el backend en vivo hace falta, porque clima y elevación dependen de la coordenada dibujada. La parcela demo precargada cubre la presentación sin red.

Despliegue: el droplet de Eduardo con `sslip.io` y Let's Encrypt (V-15 a V-17 cerrados el 14/11; ver [[Servidor]]). No tocar `mediworks`.

Persistencia del MVP: archivos JSON. Sin base de datos obligatoria.

## Interfaz

Tres paneles: selector "what if", escena (3D o 2D) y dashboard. En móvil, pestañas. No depender de hover.

Pantallas: P0 inicio (historia, no predicción), P1 terreno, P2 laboratorio, P3 comparación. Modales: A1 método, A2 editar rotación, A3 advertencias.

Pintar cultivos por bloque y el slider de meses siguen abiertos. El cambio de ciclo sí entra al MVP.

Estados visuales: color más icono o patrón, leyenda visible, legible con daltonismo. Cámara casi isométrica. Fallback 2D si no hay WebGL. Medir requisitos mínimos; no prometer FPS.

Modelos: `modelador-voxel` escribe Python con `herramientas/voxelkit.py` y entrega `.bbmodel`. Escala: 1 celda = 16 unidades. Origen en el centro de la base, y = 0 es el suelo. Paleta 16×16, colores nuevos siempre al final. Nombres `cultivo_etapa.bbmodel`. Presupuesto: 5–10 cubos al inicio, 20–30 a media etapa, 40–60 al final. Etapas: siembra, brote, crecimiento, madurez, podrida o marchita. La zanahoria de ejemplo no es cultivo del proyecto. Carpetas previstas: `modelos/cultivos/`, `modelos/props/`.

## Equipo y ritmo

No hay dueños por rol. R1 interfaz y 3D (`web/`), R2 motor (`web/src/motor/`), R3 datos y servidor (`api/`, `datos/`), R4 arte y entrega (`modelos/`, `docs/`) solo dicen el tipo de trabajo. Cada quien toma actividades del tablero de `docs/14`.

El esfuerzo se mide en cupo de IA (XS, S, M, L, XL), no en horas. Lo L se reserva para el motor de agua (A2.6), los pilares extra (A3.7), la escena (A3.1, A3.2), los modelos de los tres primeros cultivos (A2.11) y, si entra, un dataset NASA extra (A4.8). Un XL se parte antes de empezarlo.

Camino crítico: `A1.1 → A2.1 → A2.6 → A2.7 → A3.4 → A4.6 → A5.6 → A5.9`. En paralelo, igual de crítico para la demo: `A2.9 → A3.1 → A3.2`.

Compuertas: C1 lluvia real de POWER en pantalla; C2 motor con datos y pruebas; C3 terreno 3D con estado del motor; C4 ya no entran funciones; C5 solo bugs; C6 demo, video, README y envío.

Si hay que cortar, en este orden se caen: extras NASA y props, slider de meses, pilares 2 y 3, el 3D (queda 2D y cajas), el polígono libre (queda la parcela demo). No se sacrifican trazabilidad NASA, límites dichos en voz alta, tres rotaciones, peor caso ni la entrega.

Eduardo toma el servidor (A0.4, A4.7).

## Estado del repo (14/11, noche)

Hay documentación (`docs/`), `AGENTS.md`, `CLAUDE.md`, `README.md`, `herramientas/voxelkit.py`, el agente en `.claude/agents/modelador-voxel.md`, este vault y `contratos/` (A1.1 `[HECHO]` el 14/11: JSON Schema v0.8.0, ejemplos ficticios, `npm test` y tipos TS; ver [[Contratos]]). También hay código: `api/` (FastAPI de Eduardo, con pruebas), `web/` (esqueleto de balam) y `datos/catalogos/` (cultivos y suelos de Mafer). Antes de subir a `main` se corren las cuatro verificaciones (ver [[Reglas]]). A2.16 (TAW por Saxton y Rawls) la hace Mafer.

## Límites para el pitch

Decirlos antes de que pregunten. La honestidad es parte del reto: resolución gruesa del clima, cubeta simplificada, parámetros de tablas generales, sin validación local mientras no la haya, 3D cualitativo. Combinar NASA con suelo, relieve y cultivo local es el argumento, no un adorno.
