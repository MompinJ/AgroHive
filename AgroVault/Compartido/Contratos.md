---
tipo: contratos
audiencia: todas
actualizado: 2026-11-14
fuente: contratos/*.schema.json (v0.13.0, A1.1)
---

# Contratos

La fuente de verdad son los JSON Schema de `contratos/` (versión `0.13.0`, actividad A1.1). Esta nota **resume y enlaza; no redefine campos**. Si algo aquí no coincide con un `*.schema.json`, manda el schema. Los ejemplos de `docs/08` quedaron como antecedente: varios nombres cambiaron (ver abajo).

- Detalle y reglas: `contratos/README.md`
- Ejemplos válidos (ficticios, parcela demo de Isla, 2 ha, coordenadas ilustrativas): `contratos/ejemplos/<contrato>.ejemplo.json`
- Tipos TypeScript generados: `contratos/tipos/contratos.d.ts` (`npm run tipos`; no se editan a mano)
- Validación: `cd contratos && npm install && npm test`
- Solo los edita Mompin. Si necesitas un campo, pídelo; no lo agregues por tu cuenta.

## Mapa de contratos

| Schema | Qué describe | Lo produce |
| --- | --- | --- |
| `comun.schema.json` | Estados de `docs/04`, `meta`, `fuente`, `valorCitado`, `lonLat`, ids | — |
| `parcela.schema.json` | Polígono, cuadrícula y celdas con `elevacionM` y `pendientePct`; enlaza el suelo con `sueloId` | Front (polígono) + API (elevación) |
| `suelo.schema.json` | Textura (USDA y grupo del selector) y pH estimados, siempre `SUPUESTO`; `estimaciones` de ISRIC y OpenLandMap y `estimacionUsada`; TAW con `metodoTaw` (tabla FAO-56 o Saxton y Rawls 2006) y `retencion` | API `GET /api/suelo` (A2.14, A2.15, A2.16) |
| `cultivo.schema.json` | Catálogo, solo lo que no depende del lugar: ciclo, etapas y Kc de FAO-56, umbrales de EcoCrop (lluvia del ciclo y lluvia anual por separado) | `datos/catalogos/` (A1.5) |
| `calendario-local.schema.json` | Calendario por lugar (`paisIso` y `unidadAdministrativa`; clave INEGI en México): cultivo, temporada PV/OI, ventana de siembra con fuente y presencia del cultivo en el lugar | `datos/` (A0.6) y `GET /api/calendario` (A4.13) |
| `tabla-suelos.schema.json` | TAW por metro y rangos de humedad por clase textural (FAO-56 Tabla 19), con fuente o `NO_EVALUABLE` | `datos/catalogos/` (A1.6) |
| `serie-clima.schema.json` | Respuesta de `GET /api/clima`: serie diaria del periodo, sin escenario | API `GET /api/clima` |
| `ndvi.schema.json` | NDVI MOD13Q1 (250 m) por punto, evidencia con límites declarados; no entra al ranking | API `GET /api/ndvi` (A4.11) |
| `smap.schema.json` | Humedad superficial SMAP L3 (36 km o 9 km, ~0-5 cm), contraste; no entra al ranking ni al balance | API `GET /api/smap` (A4.8) |
| `serie-balance.schema.json` | Series diarias y mensuales del balance de agua por rotación, escenario y ciclo, para graficar (A4.1); la interfaz no recalcula | Motor |
| `ee-uu.schema.json` | CDL (rotación real por año) y SSURGO (suelo de campo) de EE. UU., como contraste regional; no entran al ranking | API `/api/ee-uu/cdl` y `/api/ee-uu/ssurgo` (A4.12) |
| `clima-escenario.schema.json` | Serie diaria de un año real (seco, habitual, lluvioso) y cómo se eligió; humedad de POWER opcional (`humedadRaizFraccionSat`, fracción de saturación) | Motor (A2.5), desde `serie-clima` |
| `proxima-temporada.schema.json` | Capa "próxima temporada aproximada": solo bandas por mes, `horizonteMeses` fijo en 6 | API + motor (A2.13) |
| `plan-siembra.schema.json` | Rotación del selector: cultivo, temporada y fecha elegida por el usuario por ciclo, con `porQue`; `calendarioLocal` usado; `asignacionClima` = `temporada_tipica` | Front (selector) |
| `resultado-celda.schema.json` | Salida del motor por celda y fecha | Motor |
| `resultado-rotacion.schema.json` | Pilares por escenario, peor caso, ranking (B principal, A de respaldo), pesos declarados y explicación | Motor |

## Lo que más se confunde

- `estado` es **siempre** el estado de evaluación de `docs/04`: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`. El estado visual de la planta (`normal`, `estresada`, `marchita`, `podrida`) se llama `estadoPlanta`. En `docs/08` ambos se llamaban `estado`.
- Todo documento lleva `meta.versionContrato`. Los ejemplos llevan además `meta.esEjemplo: true` y `meta.aviso`.
- Un parámetro del catálogo o del suelo es `{estado: "EVALUABLE", valor, unidad, fuente}` o `{estado: "NO_EVALUABLE", motivo}`. Un número suelto se rechaza.
- `NO_EVALUABLE` o `ERROR_DATOS` en una celda ⇒ todos sus indicadores en `null`, nunca en 0. Si el estado no es `EVALUABLE`, el registro lleva `motivo`.
- El suelo ya no va dentro de la parcela: es su propio documento y la parcela lo enlaza con `sueloId`.
- `fuente` es un objeto (nombre, url, coordenada, periodo, unidades, consultado), no un texto. La radiación diaria se llama `radiacionMjM2Dia`.
- Alcance mundial (0.10.0): `calendario-local` acepta un lugar genérico (`paisIso` ISO 3166-1 alfa-2 y `unidadAdministrativa` con su sistema de claves; las claves INEGI siguen válidas en México). `lluviaSatelital` (IMERG vía POWER, en UTC) es evidencia: no entra al balance ni a los escenarios; el -999 de POWER va como `null`.
- Próxima temporada por rotación (0.8.0): `resultado-rotacion.proximaTemporada` evalúa la rotación con años análogos reales; es `EXPLORATORIO`, `esPrediccion: false`, solo rangos entre análogos y no entra al ranking.
- Próxima temporada (capa de clima): `esPrediccion` es siempre `false`, el `aviso` es obligatorio y cada mes trae bandas `{inferior, superior}` sin cifra única.
- Ranking: el criterio principal es B (`B_minimax_arrepentimiento`; `[DECIDIDO]` el 14/11). Con B, el resultado lleva `puntaje` por escenario, `arrepentimiento` y `ponderacion` (pesos, etiqueta `SUPUESTO`/`USUARIO`/`FUENTE`, pilares excluidos). A (`A_exposicion_hidrica_peor_caso`) queda de respaldo si A3.7 no llega; con A, `puntaje`, `arrepentimiento` y `ponderacion` van en `null`. Ejemplo del respaldo: `contratos/ejemplos/resultado-rotacion.respaldo-a.ejemplo.json`.
- `plan-siembra.asignacionClima` es siempre `temporada_tipica` (A2.8 decidido). La fecha de siembra la elige el usuario y cada ciclo explica su `porQue`.
- Un cultivo que se muestra pero no se recomienda en el lugar va en `resultado-rotacion.cultivosNoRecomendados` (motivo y fuente) y en la celda como `noRecomendadoEnLugar` con `fuenteMotivo`; la rotación queda `EXPLORATORIO`.
- En `parcela`, `i = 0` es la fila más al sur y crece hacia el norte; `j = 0` es la columna más al oeste y crece hacia el este.
- Si un pilar es `NO_EVALUABLE` o `ERROR_DATOS`, todos sus indicadores van en `null` y el motivo es obligatorio (0.9.0).

Lo que el schema no puede comprobar (ciclos en orden cronológico, polígono cerrado, cultivos del plan presentes en el catálogo) lo valida el motor.

## Endpoints del stack del 14/11

El motor corre en el Web Worker; el backend no simula ni rankea. `POST /api/simular` y `POST /api/rotaciones` de `docs/08` quedan superados.

| Método y ruta | Función | Contrato de la respuesta |
| --- | --- | --- |
| `GET /health` | Vida del API | — |
| `GET /api/clima?lat=&lon=&desde=&hasta=` | Serie diaria del periodo con caché, POWER con respaldo Open-Meteo, más `lluviaSatelital` (IMERG en UTC, evidencia). **No elige escenarios**. Implementado | `serie-clima` (el motor arma `clima-escenario`) |
| `POST /api/elevacion` | Recibe la cuadrícula ya generada por el front (`tamanoCeldaM` y `celdas` con id, i, j y centro; tope 1600) y devuelve elevación y pendiente por celda. Terrarium, respaldo Open-Meteo. Implementado | Campos `elevacionM`, `pendientePct` y `terreno` de `parcela` |
| `GET /api/cultivos` | Catálogo JSON de `datos/catalogos/cultivos.json`; sin catálogo responde `NO_EVALUABLE`. Implementado | `cultivo` |
| `GET /api/proxima-temporada?lat=&lon=` | Banda p10 a p90 por mes, **6 meses**, sin cifra única; no es predicción. Implementado | `proxima-temporada` |
| `GET /api/suelo?lat=&lon=` | Textura, pH y TAW (Saxton y Rawls si hay carbono) de 0 a 30 cm. ISRIC es `estimacionUsada`; OpenLandMap va en `estimaciones` y sustituye si ISRIC falla. Siempre `SUPUESTO`. Sin dato: 503 y el front usa el selector manual. Implementado | `suelo` |
| `GET /api/smap?lon=&lat=&desde=&hasta=` | Humedad superficial SMAP L3, contraste, máximo 10 días. Sin `EARTHDATA_TOKEN`: 503. Implementado. No entra al balance | `smap` |
| `GET /api/ndvi?lat=&lon=&desde=&hasta=` | NDVI MOD13Q1 V061 por Planetary Computer, evidencia, máximo 400 días. No entra al ranking. Implementado (A4.11). Desde 0.12.2 la descripción del schema cita Planetary Computer y Didan (2021) | `ndvi` |
| `GET /api/ee-uu/cdl?lat=&lon=&desde=&hasta=` | Rotación real por año (USDA NASS CDL, 30 m), solo EE. UU. contiguos; contraste, no entra al ranking. Implementado (A4.12). Schema en `contratos/ee-uu.schema.json` (0.13.0) | `ee-uu#/$defs/cdl` |
| `GET /api/ee-uu/ssurgo?lat=&lon=` | Suelo de campo SSURGO (componente dominante, horizontes, agua disponible a 100 cm), solo EE. UU.; contraste. Implementado (A4.12) | `ee-uu#/$defs/ssurgo` |
| `GET /api/calendario?lat=&lon=` | En Isla, el calendario SIAP/INIFAP. Fuera de México, maíz de temporal de GGCMI (un día, madurez en la nota). Frijol, calabaza y chile: `NO_EVALUABLE`. Implementado (A4.13) | `calendario-local` |

Los estados de falla son visibles: `RESPALDO_HISTORICO` con advertencia, o 503 con `{estado: ERROR_DATOS, motivo}`. Detalle y cómo correr la API en `api/README.md`.

Caché en archivo. Clave: coordenada redondeada a la celda del dataset + variable + periodo. `datos/cache/` está en `.gitignore`.

Tipos `[DECIDIDO]` 14/11: Los JSON Schema de `contratos/` son la fuente de verdad de los datos: los tipos TS salen de ahí (`contratos/tipos/`) y los modelos de FastAPI deben respetarlos, con una prueba que lo verifique. El cliente generado desde OpenAPI solo cubre las llamadas HTTP.
