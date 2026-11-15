# Hallazgos del back (auditoría del 14/11/2026, noche)

Rama `Mompin-fallos`, desde `origin/main` f56450c. Alcance: `api/`, motor de `web/src/motor/` (sin la UI), `contratos/` y `datos/catalogos/`. Solo fallos reales; cada uno tiene un escenario concreto. Los arreglados tienen su prueba, que falla con el código anterior: `api/tests/test_hallazgos_back.py` y `web/src/motor/pruebas/hallazgos-back.test.ts`.

**Suites.** Antes: contratos 101/101, pytest 148, catálogos en verde, `tsc` limpio y vitest 663 (más 1 `todo`). Después: contratos 101/101, pytest 154, catálogos en verde, `tsc` limpio y vitest 666 (más 1 `todo`). La regresión de la demo (A5.5) no cambia.

**Para la demo no hay ningún fallo crítico confirmado.** La parcela de Isla con el paquete de demo da los mismos números.

## Medio

| ID | Dónde | Qué falla (escenario) | Estado |
| --- | --- | --- | --- |
| H-B1 | `api/app/*` (`date.today()`) | La API toma la fecha del servidor, y el droplet corre en UTC. A las 23:00 del 14/11 en la sede, `consultado` ya dice 15/11. También se corren el "hoy" de los límites de periodo y el mes de la próxima temporada en el cambio de mes. | **Arreglado:** `config.hoy()` usa UTC-6 fijo (America/Mexico_City no tiene horario de verano desde 2022 y así no se depende de tzdata). SMAP sigue en UTC solo para decidir si un gránulo ya se publicó. |
| H-B6 | `api/app/http.py` y `web/src/api/cliente.ts:27` | Si POWER se cuelga en vez de rechazar la conexión, tarda 3 intentos × 60 s más 3 s de espera, unos 183 s, antes de pasar a Open-Meteo. El front corta a los 90 s, así que con red lenta nunca llega al respaldo ni a la caché vencida. Sin red no pasa: la conexión falla al instante. | **A decidir (Eduardo):** bajar a unos 20 s y 2 intentos por fuente, o poner un plazo total por petición, para que la cadena completa quepa en 90 s. |
| H-M1 | `web/src/motor/ranking.ts:155-160` | Un pilar entra al puntaje solo si tiene número en todas las candidatas, y las candidatas incluyen las EXPLORATORIO aunque no se ordenen. Ejemplo: se pinta una celda de calabaza en R2, R2 pasa a EXPLORATORIO y su compatibilidad queda NO_EVALUABLE. Entonces la compatibilidad sale también del puntaje de R1 y R4: los pesos pasan de 0.25 × 4 a 0.333 × 3 y, en una prueba exploratoria con el plan de la interfaz y el calendario de Isla, el peor puntaje de R4 bajó de 0.720 a 0.627. | **A decidir:** doc 05 dice "todas las rotaciones comparadas", y las EXPLORATORIO también reciben puntaje. Propuesta: calcular `entran` solo sobre las que se ordenan y dejar el puntaje de una EXPLORATORIO en `null` si le falta un pilar que entra. |
| H-M2 | `web/src/motor/motor.ts:687-736` | Un escenario que no se pudo simular (suelo sin TAW, plan inválido o clima faltante) daba un `resultado-celda` EVALUABLE en las fechas antes de la siembra. Además, sin parámetros, el último ciclo se extiende hasta el infinito, así que una fecha de 2030 sale como "maíz NO_EVALUABLE". | **Arreglado** el estado del documento: ahora hereda el del escenario. **Propuesto:** tomar el fin del ciclo de la duración del catálogo (`totalDias`) aunque no haya balance. |

## Menor

| ID | Dónde | Qué falla (escenario) | Estado |
| --- | --- | --- | --- |
| H-B2 | `api/app/servicios.py` (`_con_lluvia_satelital`) | Con un periodo anterior a 1998, `lluviaSatelital` salía con `dias: []` y un periodo invertido (desde 1998-01-01, hasta 1990-01-10). | **Arreglado:** ya no sale el bloque; sale la advertencia `IMERG_FUERA_DE_COBERTURA`. |
| H-B3 | `api/app/servicios.py` (`_respaldo_clima`) | Con POWER y Open-Meteo caídos, la API servía la serie guardada de Open-Meteo sin decir que venía de la caché. | **Arreglado:** advertencia `CLIMA_RESPALDO_EN_CACHE` con la fecha en que se guardó. |
| H-B4 | `api/app/clientes/terrarium.py:39` | La prueba `"404" in str(e)` también encuentra el número en la URL del tile (por ejemplo `.../14/4040/...`). Un 503 de ese tile se tomaba como "no hay tile": la celda quedaba en `null` sin pasar al respaldo. | **Arreglado:** ahora solo cuenta un 404 de verdad. |
| H-B5 | `api/openapi.json` y `api/cliente/api.d.ts` | Estaban desfasados: faltaban `/api/calendario` y `/api/ee-uu/*`. | **Arreglado:** se regeneraron y hay una prueba que falla si `openapi.json` no coincide con la app. |
| H-B7 | `api/tests/conftest.py` | La prueba de contratos de la API no revisaba `format`, así que una `fecha` "2025-13-45" pasaba. | **Arreglado:** se usa `FormatChecker`. `date-time` sigue sin revisarse porque falta el paquete `rfc3339-validator`; ajv sí lo revisa en `contratos/`. |
| H-B8 | `api/app/rutas/cultivos.py` | Sin catálogo, la API responde 200 con `{estado, motivo, cultivos: []}`, que no cumple `cultivo.schema.json` (faltan `meta` y `versionCatalogo`). | **Propuesto (Eduardo):** responder 503 `ERROR_DATOS`. El front ya trata los cultivos como obligatorios. |
| H-B9 | `datos/demo/respuestas/*.json` y `datos/catalogos/*.json` | Declaran `versionContrato` 0.10.0 y 0.6.0, pero el contrato vigente es 0.13.0. Validan, pero la versión que dicen no es la real. `/api/calendario` en Isla la reenvía tal cual. | **Propuesto:** regenerar el paquete (Eduardo) y la versión de los catálogos (Mafer). |
| H-B10 | `api/app/calendario.py` (`pais`) | En Natural Earth 1:110m, la costa de Veracruz (Boca del Río, el puerto) no cae en ningún país, así que responde 422 "sin un solo país". El resultado es el mismo (compatibilidad NO_EVALUABLE), pero el motivo no es el correcto. | **Propuesto:** usar el país más cercano a pocos km o el mapa 1:50m. |
| H-B11 | `api/app/ndvi.py:26-28` | Si Planetary Computer falla, se reutiliza una ventana vencida sin advertencia, aunque el comentario dice "se usa y se dice". | **Propuesto:** advertencia `NDVI_EN_CACHE`. |
| H-M3 | `web/src/motor/protocolo.ts` (`rankear`) | `rankear` sin rotaciones simuladas devolvía `ok: false` con un TypeError. | **Arreglado:** devuelve el ranking vacío ("no podemos determinar..."). |
| H-M4 | `web/src/motor/protocolo.ts` (`simular`) y `fechas.ts:3-9` | Un `simular` que falla dejaba el resultado anterior para `celdas` y `rankear`. Además, `aDia` acepta "2026-02-30" y lo convierte al 2 de marzo. | **Arreglado** lo primero: se invalida antes de simular. **Propuesto:** validar la fecha y dar NO_EVALUABLE con motivo. |
| H-M5 | `web/src/motor/cliente.ts:34-46` | No hay `onerror` ni `onmessageerror`. `terminar()` no rechaza las promesas pendientes y un `tipo` desconocido deja la respuesta indefinida. Hoy solo lo corta el límite de 120 s o 10 s. | **Propuesto:** rechazar lo pendiente en `onerror` y en `terminar()`, y agregar un `default` en `atender`. |
| H-M6 | `web/src/motor/analogos.ts:44` | `t <= 2025` está escrito a mano y no tiene fuente. Con una serie que llegue al presente, excluye 2026 aunque esté completo. Hoy no afecta: la ventana termina el 2025-12-31. | **Propuesto:** excluir solo el año del horizonte; los incompletos ya los filtra `completo`. |
| H-M7 | `web/src/motor/proxima.ts:73-76` | Con una capa emitida en agosto o septiembre, el horizonte cruza al año agrícola siguiente y el año análogo junta meses que no son seguidos. No afecta la demo, emitida en noviembre. | **Propuesto:** anclar cada mes por su distancia al primer mes de la capa. |
| H-M8 | `web/src/motor/motor.ts:341, 377-380` y `pilares.ts` | Con `fraccionDentro = 0` en todas las celdas (el schema lo permite), los pilares salen NaN con estado EVALUABLE, y el NaN se vuelve `null` en JSON. | **Propuesto:** si el peso total es 0 o menos, NO_EVALUABLE con motivo. |
| H-M9 | `web/src/motor/motor.ts:421-433` | Con un escenario NO_EVALUABLE (por ejemplo, sin suelo), `proteccionSuelo` y `aporteIndirecto` salen EVALUABLE con números. Doc 05 dice que un estado NO_EVALUABLE lleva todos sus indicadores en `null`. | **A decidir:** ponerlos en `null` o precisar doc 05. Son días de calendario que no dependen del suelo. |
| H-M10 | `web/src/motor/motor.ts:665-672` | Los `huecos` de la respuesta de `simular` son fijos. Dicen "agua al sembrar supuesta a capacidad de campo" aunque se use GWETROOT. `rankear` los reemplaza por la tarjeta. | **Propuesto:** armarlos con los mismos indicadores que las advertencias. |
| H-M11 | `web/src/motor/tarjetas.ts:207, 291` | La tarjeta siempre dice "ventana recomendada por INIFAP", aunque la ventana sea de SIAP o de GGCMI (fuera de México). | **Propuesto:** usar `fuente.nombre`. Cambia el texto que fija la regresión A5.5, así que se deja al dueño de las tarjetas. |

## Lo que se revisó y está bien

- **ET0:** Penman-Monteith da 3.88 en el ejemplo 18 de FAO-56 (3.9) y Ra da 32.19 en el ejemplo 8 (32.2).
- **Fórmulas FAO-56:** Hargreaves, Kc (ec. 66) y el balance (ec. 84 a 88) están bien transcritos, y el percentil es el tipo 7 de Hyndman y Fan.
- **Fechas del motor:** son días civiles en UTC y no usan `getDate` ni `getMonth`. El 29 de febrero está bien.
- **Saxton y Rawls (2006):** los coeficientes de las ec. [1] a [5] coinciden con la Tabla 1.
- **Clasificación textural USDA:** no deja huecos; se probaron 80 000 combinaciones.
- **Modelos Pydantic frente a schemas:** coinciden campo por campo. Solo faltan `serie-clima.periodo` y `meta.aviso`, que son opcionales.
- **ISRIC:** en la costa responde 0 y no -32768 (llamada real del 14/11), así que el filtro `v != 0` basta.
- **Tipos TS generados** (`contratos/tipos/`): están al día.

**Cobertura de la prueba de contratos de la API.** Valida el documento completo de clima (POWER, respaldo e IMERG), suelo, próxima temporada, calendario, NDVI, SMAP, EE. UU., el catálogo real de cultivos y el paquete de demo. De la elevación solo valida las partes (meta, terreno y celdas), porque la respuesta completa no tiene schema. Antes no cubría la caché vencida, el respaldo de Open-Meteo desde caché, IMERG antes de 1998, los cultivos sin catálogo ni los formatos de fecha; ahora cubre todo eso salvo los cultivos sin catálogo (H-B8, propuesto).
