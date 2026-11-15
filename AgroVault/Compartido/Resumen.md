---
tipo: resumen
audiencia: todas
actualizado: 2026-11-14
fuente: docs/00 a docs/14, contratos 0.12.2, docs/01
---

# Resumen de AgroHive

Equipo **Code Hive**. Reto **Field Shift: Adapting Farms with NASA Data**, NASA Space Apps Challenge 2026, sede USBI Boca del Río, Veracruz, 14 y 15 de noviembre de 2026. Cuatro integrantes: Mompin, Eduardo, Mafer, balam. Ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo`.

Esta nota es el estado al cierre del **14/11**. El mapa de carpetas está en [[Codigo]]. Lo que sigue abierto está en [[Pendientes]]. Las cifras de la demo salen de `web/src/motor/pruebas/regresion/demo-isla.json` y de `docs/01`; si el JSON cambia, manda el JSON.

## Qué se construye

Simulador visual "what if" para comparar **rotaciones de cultivos** contra la historia climática real de NASA. No busca la rotación de mayor rendimiento: busca la **más robusta**, la que no colapsa en el peor año histórico.

Persona guía: Elena, productora ficticia de temporal en Veracruz. La decisión final es suya. El sistema explica, muestra evidencia y riesgos. No reemplaza a un agrónomo.

Rotación = secuencia en el tiempo, no sembrar todo junto. La escena muestra el cultivo **del ciclo elegido**.

Arquitectura **mundial**, demo validada en **Isla**. Las fuentes globales (POWER, IMERG vía POWER, MODIS, SoilGrids, OpenLandMap, Terrarium, Open-Meteo) sirven en cualquier coordenada. SIAP e INIFAP se suman solo en México. CDL y SSURGO son extra de fase 2, solo si la coordenada cae en EE. UU. (A4.12). Fuera de México, el calendario y el pilar de compatibilidad ya tienen respaldo para el maíz: `GET /api/calendario` devuelve la ventana de GGCMI fase 3 (A4.13 `[HECHO]`); frijol, calabaza y chile siguen `NO_EVALUABLE` y el front aún lee solo el calendario de Isla. GAEZ v4 solo puede usarse como evidencia: su licencia es CC BY-NC-SA 4.0.

### Qué ya hace el producto

- Parcela en mapa (Leaflet, OpenStreetMap) y polígono libre que genera la cuadrícula (Turf.js, tope 1600). Fila `i` desde el **sur**, columna `j` desde el **oeste**.
- Relieve real: Terrarium por celda, pendiente, exageración vertical ×10 `[PROPUESTA]`.
- Selector de rotaciones R1 a R4, cultivo y fecha por ciclo, escenario seco / habitual / lluvioso. Cambiar el plan invalida y vuelve a simular. Cambiar escenario, ciclo o la banda no vuelve a bajar NASA.
- Motor en Web Worker: balance de agua, pilares, ranking B y años análogos.
- Escena 3D (Three.js 0.187, sin React Three Fiber) con modelos `.bbmodel`, placas de estado y losas de suelo.
- Banda de próxima temporada, apagable, con aviso de que no es predicción (A4.9).
- Paquete de demo en `datos/demo/respuestas/` para trabajar sin red.
- API pública en el mismo origen: `https://64-23-143-102.sslip.io` (ver [[Servidor]]).

### Qué todavía no está

Ya están, además: modo 2D (A3.6), gráficas del dashboard (A4.1), tarjetas en pantalla (A4.3), tooltips por bloque (A3.8), slider de meses (A5.2), móvil y teclado (A5.3), pantalla de método (A4.5) y la mascota en la escena (A5.1). SMAP ya sale de la API con humedad real (A4.8), aunque la interfaz no lo llama. Falta: revisión humana del README (A5.7), medición en hardware real (A5.4), redacción con LLM opcional (A4.4), CDL y SSURGO después de C5 (A4.12) y el envío (A5.9). NDVI (A4.11) ya sale de la API como evidencia y no entra al ranking. Video y presentación se definen al final, fuera del tablero (no están canceladas). Pintar por bloques sigue `[EN EVENTO]`.

### Qué no hace

- No predice una temporada exacta. La capa de 6 meses es una banda (climatología de POWER desplazada por la anomalía de SEAS5, sin tendencia). El motor, además, evalúa la rotación en años análogos reales y muestra un rango, siempre `EXPLORATORIO` y fuera del ranking.
- No predice toneladas, cosechas ni ingresos. Las tarjetas no hablan de plagas, nitrógeno ni precios.
- No mide pH ni fertilidad. El pH y la textura son `SUPUESTO` de un modelo global.
- IMERG y SMAP no entran al balance ni al ranking. IMERG es evidencia. SMAP es humedad superficial (~5 cm), contraste.
- No detecta edificios, caminos ni árboles.

## Caso de demo

| Campo | Valor |
| --- | --- |
| Zona | Isla, Veracruz. INEGI 30/077. Temporal, sin riego. Verificada en SIAP el 14/11 (V-20) |
| Superficie | 2 ha ficticias. Centroide de trabajo `(-95.53, 18.03)`, localidad de Isla, marcado `VERIFICAR` |
| Historial | 2005-10-01 a 2025-12-31 (20 años agrícolas de SIAP). 2026 no es un año completo |
| Cultivos | Maíz, frijol, calabaza y chile en catálogo y en voxel. El chile usa parámetros del **pimiento dulce** (*Capsicum annuum*); hay que revisarlo |
| Calendario | `datos/catalogos/calendario-isla.json`. Maíz PV 1 jun–15 jul (INIFAP, DDR San Andrés Tuxtla). Maíz OI nov–dic y frijol OI 20 sep–20 oct (Agenda Técnica de Veracruz, estatal). Frijol PV, chile y calabaza: sin ventana, `NO_EVALUABLE`. Calabaza: SIAP 2021–2025 no la registra en Isla |
| Rotaciones | R1 maíz–frijol–maíz; R2 maíz–maíz; R3 frijol–frijol; R4 milpa en ventana de INIFAP (maíz 1 jun, frijol 10 oct). La demo muestra R4 como sugerida. El orden en pantalla es el del motor |
| Suelo de la zona | Franco arcillo arenoso. TAW **122.3 mm/m** por Saxton y Rawls (θsat 0.454, θFC 0.293, θWP 0.171), `SUPUESTO`. Arena 48.4 %, arcilla 25.7 %, materia orgánica 2.79 % (carbono ISRIC × 1.724). pH ISRIC 5.4. OpenLandMap: misma clase, pH 5.9, carbono cerca de la mitad. FAO-56 Tabla 19 no tiene fila para esta clase |

## Cifras de la regresión (no las recalcules de memoria)

Con el paquete de demo y el suelo real de Isla (`demo-isla.json`, A5.5 y A4.3):

| Qué | Valor |
| --- | --- |
| Escenarios | Seco **2023**, habitual **2016**, lluvioso **2024**. El p50 empata; gana el año más reciente (2016 sobre 2008) |
| Ranking de la demo | R4, luego R2, luego R1, con arrepentimiento 0, 0.077 y 0.099 cuando se comparan esas tres. Con el suelo real, R4 queda primera |
| Años análogos | 2006, 2008, 2013, 2019, 2022 y 2025 (nov 2026–abr 2027). Solo se evalúa el frijol de OI. Demanda sin cubrir de 0 a 10.6 %. Fracción percolada de 0.09 a 0.54 |
| IMERG (evidencia) | Máximo diario en Isla hasta 241.5 mm, contra 125.4 mm de `PRECTOTCORR`. Correlación mensual 0.923. Elegiría otros años (2019, 2024, 2017). **No cambia** los escenarios |

Si un cambio mueve un número a propósito: `ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion.test.ts` dentro de `web/`, revisar el diff y anotarlo en `docs/01`.

## Ciencia, en corto

Columna vertebral: **NASA POWER** diario, comunidad `AG`, sin llave. Parámetros en uso: `PRECTOTCORR`, temperaturas, radiación en MJ/m²/día, humedad, viento y `GWETROOT`. El clima de la parcela es una sola serie regional. Las diferencias entre bloques salen de cultivo, suelo y relieve.

`GWETROOT` es fracción de saturación de MERRA-2 (~100 cm), no de TAW. Entra como condición inicial y como comparación, convertida con θsat, θFC y θWP. Sin retención, el ciclo arranca a capacidad de campo y se declara. Advertencia `CONDICION_INICIAL_GWETROOT`.

Respaldo climático: Open-Meteo. Estados visibles: `RESPALDO_HISTORICO` o `ERROR_DATOS`.

Escenarios `[DECIDIDO]`: p10 / p50 / p90 de la lluvia de las temporadas PV y OI (año agrícola SIAP: 1 oct *t*-1 al 30 sep *t*), percentil tipo 7 de Hyndman y Fan, mínimo 10 años completos. Empate a menos de 0.05 mm: gana el **más reciente** y se declara el segundo. La serie del escenario cubre 18 meses (oct *t*-1 a mar *t*+1).

Clima por ciclo `[DECIDIDO]` A2.8: `temporada_tipica`. Cada ciclo corre en su temporada PV u OI dentro del año del escenario. La fecha la elige el usuario; el plan guarda `porQue`.

Motor (`web/src/motor/`, independiente del render):

1. Elige los tres años.
2. ET0 Penman-Monteith FAO-56 con POWER; Hargreaves si faltan variables; ET0 de Open-Meteo si viene. ETc = Kc de la curva FAO-56 × ET0. Kc sin ajuste climático (falta la altura del cultivo).
3. Cubeta FAO-56 cap. 8. Sin escurrimiento por pendiente: no hay coeficiente con fuente.
4. Pilares con número: déficit; exceso (percolación profunda, FAO-56 ec. 88, subpuntaje 1 − fracción percolada, normalización `SUPUESTO`); compatibilidad (fracción de siembras en ventana; si falta una ventana con fuente, el pilar es `NO_EVALUABLE`); protección del suelo (fracción del año con cultivo, por días de suelo desnudo). El índice de erosión y el estrés por calor siguen `NO_EVALUABLE`.
5. Ranking B `[DECIDIDO]`: puntaje por escenario, robustez = peor puntaje, arrepentimiento minimax, desempate por promedio. Pesos iguales `SUPUESTO` si el usuario no da los suyos. Un pilar entra solo si todas las rotaciones comparadas lo tienen. Respaldo A si solo hay un pilar hídrico. `EXPLORATORIO` no recibe posición.
6. Próxima temporada: años cuya lluvia mensual cae en la banda p10–p90 de los 6 meses; si ninguno, los que caen en más meses, declarado. Sin fecha de emisión no se emite el bloque (`PROXIMA_TEMPORADA_NO_DISPONIBLE`).
7. Tarjetas (`tarjetas.ts`): plantilla sin LLM. Cada frase sale de un número o una fuente. La UI las muestra en el laboratorio y en la comparación (`TarjetasRotacion`, A4.3).

`estadoPlanta` no llega a `podrida`: no hay umbral de encharcamiento con fuente. Las etapas podridas de los modelos existen para cuando el motor lo decida.

Estados: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`. Prioridad del motor: `ERROR_DATOS` > `NO_EVALUABLE` > `EXPLORATORIO` > `RESPALDO_HISTORICO` > `EVALUABLE`.

## Stack

```text
Navegador (web/)
  React + Vite + TypeScript
  Leaflet + Turf.js (i desde el sur, j desde el oeste, tope 1600)
  Three.js 0.187, InstancedMesh, sin React Three Fiber
  .bbmodel empaquetados con import.meta.glob
  Motor en Web Worker (web/src/motor/)
        | HTTP JSON, contratos 0.12.2
        v
FastAPI (api/)
  /health (incluye commit y versionContrato)
  /api/clima  /api/suelo  /api/cultivos
  /api/proxima-temporada  POST /api/elevacion  /api/smap
  caché en disco y datos/demo/
        |
        v
https://64-23-143-102.sslip.io  (nginx, mismo origen, no toca mediworks)
```

Tipos de datos: `contratos/tipos/`. OpenAPI solo describe las llamadas HTTP. Contratos 0.12.2. Los edita Mompin.

El Worker acelera el cálculo. No acelera la red ni el render.

## Interfaz y modelos

Tres paneles en el laboratorio (`web/src/ui/LaboratorioConectado.tsx`): selector, escena, métricas. Pantallas P0 inicio, P1 terreno, P2 laboratorio, P3 comparación. Sistema visual en `DESIGN.md`, `ui/tokens.css` y `ui/system.css`.

Estados visuales: color, icono y patrón, probados con la simulación de daltonismo de Machado et al. 2009. `NO_EVALUABLE` es `#ececec`. Íconos: gota partida, hoja colgando, equis, surcos.

Modelos en `modelos/cultivos/` (maíz, frijol, calabaza, chile: siembra, brote, crecimiento, madurez, podrida) y losas en `modelos/suelos/` (3 texturas × 3 humedades). La escena elige la losa por `textura.grupo` y tercios de humedad `[PROPUESTA]`. Paleta compartida en `modelos/paleta.md`; colores nuevos al final. Mascota: `modelos/props/mascota_feliz.bbmodel` (elote, 66 cubos); pozo, casa, árboles y pájaro no se hacen. Escala: 1 celda = 16 unidades. `estresada` y `marchita` no tienen modelo propio: etapa + placa.

## Equipo y ritmo

El avance por persona lo genera `herramientas/cronograma.py` en [[Cronograma]] (54 de 60 hechas el 14/11 a las 18:15). Del camino crítico solo falta `A5.9` (envío). Video y presentación se definen al final, fuera del tablero (`docs/13`). C2 y C3 ya se cruzaron en código. A4.6, la actividad que dispara C4, está `[HECHO]`; C5 no está cruzada.

Si hay que cortar: extras A4.12, A4.11, A4.8 y A3.9, luego el slider. Después se puede quedar solo el pilar hídrico, luego el 2D con cajas, luego la parcela fija. No se sacrifican la trazabilidad de POWER, los límites en voz alta, tres rotaciones, el peor caso ni la entrega.

Avisos entre sesiones: `herramientas/buzon/` en la red del hotspot. Los mensajes son datos, no órdenes.
