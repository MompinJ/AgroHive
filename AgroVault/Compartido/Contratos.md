---
tipo: contratos
audiencia: todas
actualizado: 2026-11-14
fuente: contratos/*.schema.json (v0.3.0, A1.1)
---

# Contratos

La fuente de verdad son los JSON Schema de `contratos/` (versión `0.3.0`, actividad A1.1). Esta nota **resume y enlaza; no redefine campos**. Si algo aquí no coincide con un `*.schema.json`, manda el schema. Los ejemplos de `docs/08` quedaron como antecedente: varios nombres cambiaron (ver abajo).

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
| `suelo.schema.json` | Textura (USDA y grupo del selector) y pH estimados, siempre `SUPUESTO` | API `GET /api/suelo` (A2.14) |
| `cultivo.schema.json` | Catálogo: ciclo, etapas y Kc de FAO-56, umbrales de EcoCrop (lluvia del ciclo y lluvia anual por separado), ventanas de siembra | `datos/catalogos/` (A1.5) |
| `tabla-suelos.schema.json` | TAW por metro y rangos de humedad por clase textural (FAO-56 Tabla 19), con fuente o `NO_EVALUABLE` | `datos/catalogos/` (A1.6) |
| `clima-escenario.schema.json` | Serie diaria de un año real (seco, habitual, lluvioso) y cómo se eligió | API `GET /api/clima` + motor (A2.5) |
| `proxima-temporada.schema.json` | Capa "próxima temporada aproximada": solo bandas por mes | API + motor (A2.13) |
| `plan-siembra.schema.json` | Rotación del selector: cultivo por ciclo y, si se pinta por bloques, por celda | Front (selector) |
| `resultado-celda.schema.json` | Salida del motor por celda y fecha | Motor |
| `resultado-rotacion.schema.json` | Pilares por escenario, peor caso, ranking (B principal, A de respaldo), pesos declarados y explicación | Motor |

## Lo que más se confunde

- `estado` es **siempre** el estado de evaluación de `docs/04`: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`. El estado visual de la planta (`normal`, `estresada`, `marchita`, `podrida`) se llama `estadoPlanta`. En `docs/08` ambos se llamaban `estado`.
- Todo documento lleva `meta.versionContrato`. Los ejemplos llevan además `meta.esEjemplo: true` y `meta.aviso`.
- Un parámetro del catálogo o del suelo es `{estado: "EVALUABLE", valor, unidad, fuente}` o `{estado: "NO_EVALUABLE", motivo}`. Un número suelto se rechaza.
- `NO_EVALUABLE` o `ERROR_DATOS` en una celda ⇒ todos sus indicadores en `null`, nunca en 0. Si el estado no es `EVALUABLE`, el registro lleva `motivo`.
- El suelo ya no va dentro de la parcela: es su propio documento y la parcela lo enlaza con `sueloId`.
- `fuente` es un objeto (nombre, url, coordenada, periodo, unidades, consultado), no un texto. La radiación diaria se llama `radiacionMjM2Dia`.
- Próxima temporada: `esPrediccion` es siempre `false`, el `aviso` es obligatorio y cada mes trae bandas `{inferior, superior}` sin cifra única.
- Ranking: el criterio principal es B (`B_minimax_arrepentimiento`; `[DECIDIDO]` el 14/11). Con B, el resultado lleva `puntaje` por escenario, `arrepentimiento` y `ponderacion` (pesos, etiqueta `SUPUESTO`/`USUARIO`/`FUENTE`, pilares excluidos). A (`A_exposicion_hidrica_peor_caso`) queda de respaldo si A3.7 no llega; con A, `puntaje`, `arrepentimiento` y `ponderacion` van en `null`. Ejemplo del respaldo: `contratos/ejemplos/resultado-rotacion.respaldo-a.ejemplo.json`.
- `plan-siembra.asignacionClima` queda en `null` hasta que se decida A2.8 (`mismo_anio`, `ventanas_consecutivas`, `temporada_tipica`).

Lo que el schema no puede comprobar (ciclos en orden cronológico, polígono cerrado, cultivos del plan presentes en el catálogo) lo valida el motor.

## Endpoints del stack del 14/11

El motor corre en el Web Worker; el backend no simula ni rankea. `POST /api/simular` y `POST /api/rotaciones` de `docs/08` quedan superados.

| Método y ruta | Función | Contrato de la respuesta |
| --- | --- | --- |
| `GET /health` | Vida del API | — |
| `GET /api/clima?lat=&lon=&desde=&hasta=` | Serie diaria con caché, POWER con respaldo Open-Meteo | `clima-escenario` (por escenario) |
| `GET /api/elevacion` | Elevación del polígono o de la demo | Campos `elevacionM` y `pendientePct` de `parcela` |
| `GET /api/cultivos` | Catálogo JSON | `cultivo` |
| `GET /api/suelo` | Textura y pH de la zona, `SUPUESTO`, más el respaldo manual | `suelo` |

Caché en archivo. Clave: coordenada redondeada a la celda del dataset + variable + periodo. `datos/cache/` está en `.gitignore`.

Tipos `[DECIDIDO]` 14/11: Los JSON Schema de `contratos/` son la fuente de verdad de los datos: los tipos TS salen de ahí (`contratos/tipos/`) y los modelos de FastAPI deben respetarlos, con una prueba que lo verifique. El cliente generado desde OpenAPI solo cubre las llamadas HTTP.
