# Hallazgos del back (auditoría del 14/11/2026, noche)

Rama `Mompin-fallos`. Alcance: `api/`, motor de `web/src/motor/` (sin la UI), `contratos/` y `datos/`. Solo fallos reales; cada uno tiene un escenario concreto. Los arreglados tienen su prueba, que falla con el código anterior: `api/tests/test_hallazgos_back.py`, `web/src/motor/pruebas/hallazgos-back.test.ts` y el bloque H-M1 de `web/src/motor/pruebas/ranking.test.ts`.

- **Primera ronda** (desde `origin/main` f56450c, integrada en `582e482`): 9 arreglados.
- **Segunda ronda** (desde `0be2fe9`): Mompin decidió H-B6, H-M1 y H-M9 (`docs/13`, `docs/16`) y autorizó arreglar lo propuesto. Esta noche cazafallos lleva `api/` y `datos/demo/`, con OK de Mompin, porque Eduardo trabaja en el front.

**Suites.**

| Suite | Antes de la primera ronda | Al cierre de la segunda |
| --- | --- | --- |
| contratos | 101/101 | 101/101 |
| pytest | 148 | 161 |
| catálogos | en verde | en verde |
| `tsc` | limpio | limpio |
| vitest | 663 (más 1 `todo`) | 681 (más 1 `todo`) |

La regresión de la demo (A5.5) no cambia en ninguna de las dos rondas.

**Para la demo no hay ningún fallo crítico.** La parcela de Isla con el paquete de demo da los mismos números.

## Medio

| ID | Dónde | Qué fallaba (escenario) | Estado |
| --- | --- | --- | --- |
| H-B1 | `api/app/*` (`date.today()`) | La API tomaba la fecha del servidor, y el droplet corre en UTC. A las 23:00 del 14/11 en la sede, `consultado` ya decía 15/11. | **Arreglado (1.ª):** `config.hoy()` usa UTC-6 fijo. SMAP sigue en UTC solo para la publicación de gránulos. |
| H-B6 | `api/app/http.py` | Si POWER se colgaba, la API tardaba 3 intentos × 60 s (unos 183 s) antes de pasar a Open-Meteo. El front corta a los 90 s y nunca veía el respaldo ni la caché. | **Arreglado (2.ª, `[DECIDIDO]`):** 20 s por intento y 2 intentos por fuente, más un plazo total de 70 s por petición (`http.plazo()`, en las rutas de clima, suelo, elevación y próxima temporada). Ningún intento ni espera pasa del plazo; al agotarse actúa el respaldo y después la caché. OpenLandMap (hilos de GDAL) no se espera más allá del plazo. Medido el 14/11: POWER entrega los 20 años de la ventana estándar en 1 a 2 s. |
| H-M1 | `web/src/motor/ranking.ts` | Una rotación EXPLORATORIO sacaba un pilar del puntaje de las demás. Ejemplo: con calabaza pintada en R2, la compatibilidad salía también del puntaje de R1 y R4 (pesos 0.333 × 3 en vez de 0.25 × 4). | **Arreglado (2.ª, `[DECIDIDO]`):** `entran` se calcula solo sobre las rotaciones que se ordenan. Una EXPLORATORIO a la que le falta un pilar que entra lleva puntaje, peor caso y arrepentimiento en `null`, con la advertencia `SIN_PUNTAJE`. |
| H-M2 | `web/src/motor/motor.ts` (`resultadoCeldas`) | En un escenario no simulado, `resultado-celda` salía EVALUABLE antes de la siembra, y el último ciclo se extendía hasta el infinito. | **Arreglado:** en la 1.ª ronda, el estado del documento hereda el del escenario. En la 2.ª, el fin y la etapa del ciclo salen de los parámetros del catálogo (`ResultadoMotor.parametros`) aunque no haya balance. |

## Menor

| ID | Dónde | Qué fallaba (escenario) | Estado |
| --- | --- | --- | --- |
| H-B2 | `api/app/servicios.py` | Con un periodo anterior a 1998, IMERG salía con `dias: []` y un periodo invertido. | **Arreglado (1.ª):** sale la advertencia `IMERG_FUERA_DE_COBERTURA`. |
| H-B3 | `api/app/servicios.py` | Se servía la serie guardada de Open-Meteo sin decirlo. | **Arreglado (1.ª):** advertencia `CLIMA_RESPALDO_EN_CACHE`. |
| H-B4 | `api/app/clientes/terrarium.py` | `"404" in str(e)` también encontraba el número en la URL del tile. | **Arreglado (1.ª).** |
| H-B5 | `api/openapi.json` y `api/cliente/api.d.ts` | Estaban desfasados. | **Arreglado (1.ª):** se regeneraron (otra vez en la 2.ª por H-B8) y hay una prueba que lo vigila. |
| H-B7 | `api/tests/conftest.py` | La prueba de contratos no revisaba `format`. | **Arreglado (1.ª):** `FormatChecker`. `date-time` necesita `rfc3339-validator`; ajv sí lo revisa. |
| H-B8 | `api/app/rutas/cultivos.py` | Sin catálogo respondía 200 con un documento que no cumple `cultivo.schema.json`. | **Arreglado (2.ª):** responde 503 `ERROR_DATOS` con motivo. El front lo trata como dato obligatorio que falta (estado `error` con "reintentar", `web/src/api/usarDatosParcela.ts`); no truena. |
| H-B9 | `datos/demo/respuestas/*.json` | Declaraban `versionContrato` 0.10.0 (vigente: 0.13.0). | **Arreglado (2.ª):** los cinco archivos validan contra 0.13.0 sin cambiar un dato (ajv y pytest), así que solo se subió `meta.versionContrato`. `manifiesto.json` conserva `versionContratoAlGenerar: 0.10.0`. Los catálogos de `datos/catalogos/`: **arreglado** por la sesión cultivos (`Mompin-escena`, con OK de Mompin): `generar.py` declara la versión vigente (0.13.0 y, desde el 15/11, 0.14.0) y los tres validan sin cambiar datos. |
| H-B10 | `api/app/calendario.py` (`pais`) | La costa de Veracruz (Boca del Río, el puerto) caía fuera del polígono 1:110m de México y respondía 422. | **Arreglado (2.ª):** fuera de todo polígono se toma el país más cercano a 25 km o menos, solo si es el único a esa distancia. La advertencia `PAIS_POR_CERCANIA` dice la distancia. Se queda Natural Earth 1:110m: con el 1:50m también haría falta tolerancia en la costa, y el archivo pesa varias veces más. Ver `datos/calendario/LEEME.md`. |
| H-B11 | `api/app/ndvi.py` | Se reutilizaba una ventana vencida sin decirlo. | **Arreglado (2.ª):** advertencia `NDVI_EN_CACHE` con los tramos y la fecha en que se guardaron. |
| H-M3 | `web/src/motor/protocolo.ts` | `rankear` sin rotaciones daba un TypeError. | **Arreglado (1.ª).** |
| H-M4 | `protocolo.ts` y `fechas.ts` | Un `simular` fallido dejaba el resultado anterior. `aDia` aceptaba "2026-02-30" (lo llevaba al 2 de marzo) y una siembra vacía lanzaba un error. | **Arreglado:** lo primero en la 1.ª ronda. En la 2.ª: `esFechaValida` y un `aDia` estricto; una siembra que no es fecha deja el plan NO_EVALUABLE con motivo, y `celdas` y `rankear` responden sin lanzar. |
| H-M5 | `web/src/motor/cliente.ts` y `protocolo.ts` | No había `onerror`, `terminar()` no rechazaba lo pendiente y un `tipo` desconocido dejaba la respuesta indefinida. | **Arreglado (2.ª):** `onerror` y `onmessageerror` rechazan todo lo pendiente y lo que se pida después; `terminar()` también. Se ignora una respuesta sin id y un `tipo` desconocido responde `ok: false` con su id. `crearClienteMotor` acepta una fábrica de Worker para las pruebas. |
| H-M6 | `web/src/motor/analogos.ts` | Tenía `t <= 2025` escrito a mano. | **Arreglado (2.ª):** entra todo año con los meses del horizonte completos. |
| H-M7 | `web/src/motor/proxima.ts` (`mesEnEscenario`) | Con una capa emitida en agosto o septiembre, el horizonte cruza al año agrícola siguiente y el año análogo junta meses que no son seguidos. No afecta la demo. | **Propuesto (Mompin, motor):** anclar los meses al primero de la capa no basta. La siembra en el clima (`siembraEnEscenario`, OI de octubre a diciembre en *t*-1) usa la otra regla, y cambiar una sin la otra deja el análogo incoherente. Hace falta definir qué año agrícola representa un horizonte que cruza septiembre. |
| H-M8 | `web/src/motor/motor.ts` (`validarPlan`) | Con `fraccionDentro = 0` en todas las celdas, los pilares salían NaN y EVALUABLE. | **Arreglado (2.ª):** plan NO_EVALUABLE con motivo. |
| H-M9 | `web/src/motor/motor.ts` (`metricas`) | Un escenario NO_EVALUABLE traía `proteccionSuelo` y `aporteIndirecto` con número. | **Arreglado (2.ª, `[DECIDIDO]`):** todos sus pilares van en `null` con su motivo, y `filtroClima` es `null` si la rotación no es evaluable. |
| H-M10 | `web/src/motor/motor.ts` (`explicacion`) | Los `huecos` de `simular` eran fijos: decían "a capacidad de campo" aunque se usara GWETROOT. | **Arreglado (2.ª):** salen de las condiciones iniciales reales, del calor y de la erosión. Si hay ciclos mixtos, sale también `CONDICION_INICIAL_SUPUESTA` con cuántos ciclos arrancaron a capacidad de campo. |
| H-M11 | `web/src/motor/tarjetas.ts` | La tarjeta decía siempre "recomendada por INIFAP". | **Arreglado (2.ª):** `ventanasDe` nombra la institución de `fuente.nombre`. Solo INIFAP se presenta como "recomendada"; SIAP o GGCMI salen como "ventana de siembra de...". En Isla el texto no cambia, así que **la regresión A5.5 no se tocó**. |

## Lo que se revisó y está bien

- **ET0:** Penman-Monteith da 3.88 en el ejemplo 18 de FAO-56 (3.9) y Ra da 32.19 en el ejemplo 8 (32.2).
- **Fórmulas FAO-56:** Hargreaves, Kc (ec. 66) y el balance (ec. 84 a 88) están bien transcritos, y el percentil es el tipo 7.
- **Fechas del motor:** son días civiles en UTC.
- **Saxton y Rawls:** los coeficientes coinciden con la Tabla 1.
- **Clasificación USDA:** no deja huecos.
- **Modelos Pydantic frente a schemas:** coinciden, salvo dos campos opcionales.
- **ISRIC:** en la costa responde 0 y no -32768.
- **Tipos TS generados:** están al día.

**Cobertura de la prueba de contratos de la API.** Valida el documento completo de clima (POWER, respaldo, IMERG y caché vencida), suelo, próxima temporada, calendario (también en la costa), NDVI (también desde caché), SMAP, EE. UU., el catálogo real de cultivos y el paquete de demo. De la elevación solo valida las partes, porque la respuesta completa no tiene schema. Sin catálogo, `/api/cultivos` es 503 y se prueba la forma de `ErrorDatos`.
