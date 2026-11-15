# 05 · Motor de simulación

El motor es una capa **independiente del render**: recibe datos y devuelve resultados. La vista 3D, la 2D y las tarjetas solo leen de él. Si el 3D se atrasa, la demo sigue funcionando.

**Código** (A2.5 a A2.7, 14/11): `web/src/motor/`, funciones puras más un Web Worker; la interfaz usa `crearClienteMotor()` de `web/src/motor/cliente.ts` (pide escenarios, simula una rotación y pide `resultado-celda` por fecha) y no recalcula nada.

Fórmulas y parámetros son **propuestas** a validar con fuentes citables. Qué partes entran depende de los datos que consigamos. `[DEPENDE-DATOS]`

## Entradas

- Parcela: cuadrícula de bloques con **elevación y pendiente** por bloque.
- Serie climática histórica diaria (lluvia, temperaturas, radiación).
- Tipo de suelo (elegido por el usuario o supuesto).
- Catálogo de cultivos: ciclo, etapas, Kc por etapa, umbrales.
- Plan de siembra: qué cultivo en cada ciclo (y en cada bloque, si se pinta por bloques).
- Escenario activo.
- Prioridades del usuario `[MEJORA]`.

## Paso 1: perfil climático y escenarios `[DECIDIDO]` 14/11 (A2.5, implementado en `web/src/motor/escenarios.ts`)
1. **Qué lluvia entra al percentil:** la de las **temporadas de siembra PV y OI** del año agrícola de SIAP, no la del año calendario (decisión de Mompin, 14/11, coherente con A2.8 `temporada_tipica`). Ventanas, según SIAP, *Normatividad Técnica para la Generación de Estadística Básica Agropecuaria 2022* (p. 10, p. 20 "Estructura del año agrícola" y p. 46; [PDF](https://www.gob.mx/cms/uploads/attachment/file/789519/NTGEBAP_2022.pdf)): para el año agrícola *t*, **OI** = siembras de octubre de *t*-1 a marzo de *t*; **PV** = siembras de abril a septiembre de *t*. La lluvia del año *t* es la suma diaria del 1 de octubre de *t*-1 al 30 de septiembre de *t* (OI + PV); se guardan también por separado como evidencia. No depende del plan: todas las rotaciones comparan contra los mismos tres años (prueba 4, arrepentimiento de A4.2).
2. **Percentiles p10, p50 y p90** con la definición 7 de Hyndman y Fan (1996), la de R y NumPy, sobre los años agrícolas **completos** de la serie (sin días faltantes; no se rellenan). Con menos de 10 años completos (respaldo de doc 04) los escenarios son `NO_EVALUABLE`.
3. **Año elegido:** el de lluvia de temporadas más cercana a cada percentil. **Desempate `[DECIDIDO]` (Mompin, 14/11):** si dos años quedan a la misma distancia (diferencia menor a 0.05 mm, la mitad de la precisión mostrada) gana el **más reciente**. Siempre se declara el segundo año más cercano (advertencia `ANIO_CERCANO`), para que un empate práctico se vea.
4. **Serie del escenario** (`clima-escenario`): los 18 meses del año agrícola de SIAP, del 1 de octubre de *t*-1 al 31 de marzo de *t*+1, para que quepan los ciclos que se cosechan después de septiembre. `anioReal` = *t*, siempre visible; `seleccion.lluviaTemporadasMm` (contratos 0.6.0) guarda PV, OI y su total con la fuente de SIAP; `seleccion.criterio` describe el método y `seleccion.lluviaAnualMm` queda como la lluvia del año calendario *t*, solo de referencia. Estado: el de la serie (`RESPALDO_HISTORICO` con Open-Meteo); una serie de ejemplo o sintética es como mucho `EXPLORATORIO`.
5. **Con la serie real del paquete de demo** (A2.4: POWER de la parcela demo de Isla, 2005-10-01 a 2025-12-31, `datos/demo/respuestas/serie-clima.json`): 20 años agrícolas candidatos (2006 a 2025). Seco = **2023** (1 523.4 mm de temporadas; p10 = 1 521.9), habitual = **2016** (1 912.0 mm; p50 = 1 922.1), lluvioso = **2024** (2 083.5 mm; p90 = 2 087.0; 2025 queda a 2 mm de 2024). Con un número par de años el p50 es el punto medio de los dos años centrales, así que esos dos **siempre empatan**: aquí 2016 y 2008 (1 932.1 mm). Con la regla del más reciente gana 2016; con la anterior, la del más antiguo, ganaba 2008.
6. `[MEJORA]` Ajustes "qué pasa si" (lluvia × factor, temperatura + n °C).

## Paso 2: ciclos y clima `[DECIDIDO]` 14/11: opción (c), `temporada_tipica`
**Decisión (A2.8):** cada ciclo se simula con su **temporada típica (PV u OI) dentro del año real del escenario**. El plan la fija en `asignacionClima: "temporada_tipica"` (`contratos/plan-siembra.schema.json`). La **fecha de siembra de cada ciclo la elige el usuario**; el selector la sugiere desde el calendario local (`contratos/calendario-local.schema.json`: ventana por municipio, cultivo y temporada, con fuente SIAP o INIFAP) y el plan guarda qué calendario usó (o que no había) y un `porQue` que explica la fecha en la interfaz. Las ventanas dependen del lugar, no del cultivo: no están en el catálogo. Si la fuente local no registra un cultivo en el lugar (por ejemplo, calabaza en Isla, que SIAP 2021-2025 no registra), el cultivo se puede mostrar pero no se recomienda: la rotación lo lista en `cultivosNoRecomendados` con motivo y fuente y queda `EXPLORATORIO`.

Antecedente (factores que se evaluaron):
- Cuántos ciclos al año caben según calendario local (en Veracruz puede haber primavera-verano y otoño-invierno, así que **3 ciclos no equivalen necesariamente a 3 años**).
- Qué entregan las APIs (diario, mensual, período disponible).
- Duración del ciclo de cada cultivo elegido.

Opciones que se evaluaron: (a) los tres ciclos dentro del mismo año/escenario; (b) ventanas consecutivas reales del histórico; **(c) cada ciclo con su temporada típica en el año del escenario (elegida)**.

## Paso 3: demanda de agua
- ET0 diaria: Open-Meteo, o calculada (Hargreaves-Samani simple; Penman-Monteith FAO-56 si hay humedad y viento). Si falta alguna entrada, usar alternativa documentada e indicar menor precisión.
- Demanda: **ETc = Kc(etapa) × ET0**.
- La etapa depende de los días desde la siembra y del ciclo del cultivo (duraciones **publicadas**, nunca arbitrarias).
- **Implementado (A2.6, `et0.ts` y `cultivo.ts`):** por día, ET0 de la fuente si la trae (Open-Meteo); si no, Penman-Monteith FAO-56 (ec. 6, con G = 0, Tmedia = (Tmax + Tmin)/2, ea desde la humedad relativa media, ec. 19, y la elevación media de las celdas para la presión); si falta humedad, viento, radiación o elevación, Hargreaves (ec. 52) con advertencia `ET0_HARGREAVES`; sin temperaturas, el día no tiene ET0 y el ciclo queda `NO_EVALUABLE`. Se prueba contra los ejemplos 2, 3, 8 y 18 de FAO-56 (Bruselas: 3.9 mm/día). Kc con la curva de la ec. 66 (constante en inicial y media, lineal en desarrollo y final) y las duraciones de FAO-56 Tabla 11 del catálogo; sin el ajuste climático de la ec. 62 porque requiere la altura del cultivo (advertencia `KC_SIN_AJUSTE_CLIMATICO`).
- **Clima de cada ciclo (A2.8):** la siembra del plan se lleva al año agrícola *t* del escenario con el mismo mes y día (PV en *t*; OI de octubre a diciembre en *t*-1 y de enero a marzo en *t*); desde ahí el ciclo usa días reales consecutivos. Si la serie no alcanza o falta un día, ese ciclo queda `NO_EVALUABLE` con motivo. Una siembra fuera de la ventana de su temporada en SIAP se simula igual, con aviso.

## Paso 4: balance de agua por bloque (modelo de cubeta)
Cada bloque tiene un reservorio de capacidad TAW (según suelo y raíces). Por día:
- Entrada: lluvia. Lo que excede la capacidad es **escurrimiento o drenaje**.
- Salida: ETc.
- Si no se cubre la demanda: **déficit** ese día.
- Guardar: humedad (fracción de TAW), déficit acumulado, exceso acumulado.
- **Relieve:** en bloques con pendiente alta se puede asumir más escurrimiento (menos infiltración). Simplificación a justificar.
- **Implementado (A2.6, `balance.ts` y `suelo.ts`), FAO-56 capítulo 8:** TAW = TAW por metro × Zr (ec. 82; Zr de Tabla 22 en el catálogo); RAW = p × TAW con p de Tabla 22 ajustado por ETc (p + 0.04 (5 − ETc), entre 0.1 y 0.8); Ks de la ec. 84; agotamiento con la ec. 85 (sin riego, escurrimiento ni ascenso capilar) y percolación con la ec. 88. **Déficit** del día = ETc − Ks·ETc (demanda no cubierta); **exceso** = percolación. Humedad = 1 − Dr/TAW. Capacidad de la cubeta: TAW del documento de suelo si viene (Saxton y Rawls, A2.16); si no, la tabla de A1.6 por clase o por el representante del grupo del selector manual; clase sin TAW (por ejemplo `franco_arcillo_arenoso` de Isla) ⇒ `NO_EVALUABLE` hasta A2.16.
- **Condición inicial:** si el suelo trae `retencion` (Saxton y Rawls, A2.16) y la serie trae `humedadRaizFraccionSat`, el agua al sembrar sale de GWETROOT: θ = GWETROOT × θsat y Dr,i = 1000 (θFC − θ) Zr (ec. 87), recortado a 0..TAW (advertencia `CONDICION_INICIAL_GWETROOT`). Así es con el suelo real de Isla del paquete de demo (θsat 0.454, θFC 0.293, θWP 0.171, TAW 122.3 mm/m). Sin retención (selector manual), cada ciclo arranca a capacidad de campo (Dr,i = 0, que FAO-56 cap. 8 admite tras lluvia intensa; advertencia `CONDICION_INICIAL_SUPUESTA`, que en un año seco subestima el déficit). **Relieve:** escurrimiento = 0 por ahora (no hay coeficiente con fuente para la pendiente; advertencia `SIN_ESCURRIMIENTO`); entra con A3.7.

## Paso 5: estrés y estado visual
- **Estrés hídrico:** proporción de días con déficit en etapas sensibles.
- **Estrés por calor:** días sobre el umbral del cultivo.
- **Avance fenológico:** días desde la siembra; el estrés puede retrasar el desarrollo visual.
- Salida para el render: etapa, avance dentro de la etapa (0 a 1) y estado (`normal`, `estresada`, `marchita`, `podrida`). Son **cualitativos**: no son alturas ni biomasa reales.
- No estimamos toneladas. Mostramos **estado y riesgo**, no producción.
- **Implementado (A2.7):** `estadoPlanta` solo con umbrales publicados: `normal` si Dr ≤ RAW, `estresada` si RAW < Dr < TAW, `marchita` si Dr llega al punto de marchitez (a menos de 0.05 mm de TAW). `podrida` no se emite: la cubeta no tiene un umbral de encharcamiento con fuente. Etapa visual (cualitativa): `siembra` el día 1, `brote` el resto de la etapa inicial FAO, `crecimiento` en desarrollo y media, `madurez` en la final; `suelo_desnudo` fuera de los ciclos. `estresCalor` y `riesgoErosion` quedan en `null` (sin umbral de calor con fuente; pilar 3 en A3.7). Las fechas de `resultado-celda` son las del plan; el clima es el del año agrícola del escenario (`anioReal`).

## Paso 6: los tres pilares por rotación y escenario

Lo ideal es calcular los tres; se recorta según datos y tiempo. `[DEPENDE-DATOS]`

| Pilar | Métrica | Prioridad si hay que recortar |
| --- | --- | --- |
| **Déficit hídrico** | Proporción de demanda no cubierta; días y etapas sensibles con déficit | 1 (núcleo) |
| **Compatibilidad de ciclo** | Si las siembras caen en meses viables según clima y calendario | 2 |
| **Protección del suelo** | Índice relativo de erosión (intensidad de lluvia, pendiente, cobertura) y períodos de suelo desnudo; inspirado en USLE/RUSLE, **no toneladas** | 3 |
| Riesgo por calor | Días de estrés térmico | Complementario |
| Aporte indirecto al suelo | Presencia de leguminosas y cobertura, diversidad de especies (reglas simples, sin afirmar nitrógeno medido) | Complementario |

**Estado (A2.7):** el pilar de déficit hídrico está implementado (`motor.ts`): por escenario, `proporcionDemandaNoCubierta` = déficit / ETc sumados en todos los ciclos; días con déficit; déficit y exceso en mm. En una parcela con varias celdas es el promedio ponderado por `fraccionDentro` (días redondeados al entero; advertencia `AGREGACION_PARCELA`). `diasDeficitEtapasSensibles` queda en `null` mientras el catálogo no traiga etapas sensibles con fuente. Aporte indirecto: incluye leguminosa y número de especies (prueba 3). Calor sale `NO_EVALUABLE` mientras el catálogo no tenga umbral con fuente (el cálculo de días sobre el umbral ya está). Compatibilidad de ciclo y protección del suelo: ver A3.7 abajo. `puntaje`, `peorCaso`, `arrepentimiento`, `ponderacion` y `ranking` los llena A4.2.

**Pilares 2 y 3 (A3.7, `web/src/motor/pilares.ts`, 14/11):**
- **Compatibilidad de ciclo:** `siembrasFueraDeVentana` = siembras del plan fuera de la ventana del calendario local (`calendario-local`, fuente SIAP o INIFAP) para su cultivo y temporada; en una parcela con varias celdas, promedio ponderado redondeado. Si alguna siembra no tiene ventana con fuente (en Isla: frijol PV, chile y calabaza), el pilar es `NO_EVALUABLE` con motivo, porque contar solo las que sí tienen ventana sesgaría la comparación. Sin calendario, también es `NO_EVALUABLE`. No depende del clima. `filtroClima` (paso 7.1) vale `true` si alguna siembra cae fuera de ventana, `false` si ninguna y `null` si el pilar no es evaluable. Si el `dentroDeVentana` del plan no coincide con lo que calcula el motor, hay aviso.
- **Protección del suelo:** `diasSueloDesnudo` = días del año agrícola de SIAP del escenario (1 de octubre de *t*-1 al 30 de septiembre de *t*) sin ningún cultivo del plan, con cada ciclo en su temporada (A2.8) y su duración FAO-56. `indiceErosionRelativo` queda en `null`: RUSLE necesita intensidad de lluvia sub-diaria (I30) y factores C y LS con fuente para la parcela, y con lluvia diaria se inventarían. El pilar es `EVALUABLE` con los días, y el motivo lo explica. Por eso la parte de pendiente y erosión de la prueba 2 sigue pendiente.
- **Con el suelo real de Isla:** milpa R1 (frijol el 1 de noviembre, fuera de la ventana de frijol OI del 20 de septiembre al 20 de octubre): 1 siembra fuera y 162 días de suelo desnudo en el seco. Maíz-maíz: 0 fuera y 257 días. Frijol-frijol: compatibilidad `NO_EVALUABLE` (frijol PV sin ventana con fuente) y 175 días.

**Estados de evaluabilidad (doc 04) en el motor:** un resultado hereda el estado más fuerte de sus entradas: `ERROR_DATOS` > `NO_EVALUABLE` > `EXPLORATORIO` > `RESPALDO_HISTORICO` > `EVALUABLE`. `NO_EVALUABLE` con motivo si falta el suelo o su TAW, un parámetro del cultivo, el cultivo en el catálogo, la serie del escenario o un día de clima, o si el plan no es cronológico (ciclos traslapados). Si un escenario no es evaluable, la rotación tampoco (su peor caso no se conoce). Un cultivo que el calendario local no registra deja la rotación en `EXPLORATORIO` (`cultivosNoRecomendados`; en la celda, `noRecomendadoEnLugar`). Un estado `NO_EVALUABLE` o `ERROR_DATOS` lleva todos sus indicadores en `null`, con su motivo. Eso incluye `proteccionSuelo`, `aporteIndirecto` y `compatibilidadCiclo` del escenario, y el `filtroClima` de una rotación no evaluable: `[DECIDIDO]` H-M9 (Mompin, 14/11 noche). También queda `NO_EVALUABLE` un plan con una siembra que no es una fecha que exista (H-M4) o sin área dentro de la parcela (la suma de `fraccionDentro` es 0, H-M8). El documento `resultado-celda` de una fecha hereda el estado del escenario. Aunque el escenario no se haya simulado, el fin y la etapa de cada ciclo salen de la duración del catálogo (H-M2). Detalle en `docs/hallazgos-back.md`.

**Con datos reales** (paquete de demo con el suelo real de Isla: franco arcillo arenoso, TAW 122.3 mm/m por Saxton y Rawls, arranque desde GWETROOT): la milpa maíz PV, frijol OI y maíz PV deja sin cubrir el 2.4 % de la demanda en el seco (2023: 46 días, 25.3 mm de déficit), el 0.8 % en el habitual (2016) y el 0.01 % en el lluvioso (2024). El exceso va de 1 053 mm (109 días) a 2 205 mm (190 días). El déficit sigue siendo bajo en Isla; el exceso es lo que más separa a las rotaciones. El exceso es un pilar propio, `excesoHidrico`: decisión de Mompin del 14/11, contratos 0.7.0. Lleva `excesoTotalMm`, `diasExceso` y `fraccionLluviaPercolada`, que es la percolación de FAO-56 ec. 88 dividida entre la lluvia de los días de ciclo. Entra al ranking B (ver paso 7). Por celda sigue `excesoMm`.

## Paso 7: filtro, robustez y ranking `[DECIDIDO]` (criterio B, 14/11)
1. **Filtro:** marcar rotaciones que chocan con el clima local (siembra fuera de ventana viable en todos los escenarios).
2. **Robustez:** el criterio principal es el **peor caso**.
3. **Criterio decidido: B** (decisión del equipo, 14/11, en el evento):
   - **B (v0.2), principal:** puntaje por escenario combinando pilares (ponderados por prioridades si existe F8); robustez = peor puntaje; **arrepentimiento** = mejor puntaje posible del escenario − puntaje de la rotación; preferir el menor arrepentimiento máximo; desempate por promedio.
   - **Pesos:** solo con fuente, justificados o dados por el usuario (F8). Si no los hay, **pesos iguales entre los pilares evaluables, declarados como `SUPUESTO`** en el resultado (`ponderacion` en `contratos/resultado-rotacion.schema.json`). Nunca pesos inventados presentados como dato. Un pilar `NO_EVALUABLE` no entra al puntaje y se lista como excluido; si el pilar hídrico no es evaluable, el escenario es `NO_EVALUABLE`.
   - **Normalización:** cómo pasa cada pilar a un subpuntaje de 0 a 1 se define y documenta en A4.2, con su justificación.
   - **A (v1.2), respaldo:** ordenar por **menor exposición hídrica en el peor caso**; mostrar mediana, dispersión y suelo por separado, sin puntaje compuesto. Se usa si los pilares 2 y 3 (A3.7) no llegan: con un solo pilar, B no aporta nada sobre A. El resultado declara qué criterio usó.
4. Si ninguna rotación es evaluable: *"No podemos determinar una opción más robusta con estos datos"*.

**Implementado (A4.2, `web/src/motor/ranking.ts`, 14/11):**
- **Normalización** a subpuntajes de 0 a 1 (mayor es mejor): déficit hídrico = 1 − `proporcionDemandaNoCubierta`, es decir, la fracción de la demanda del cultivo que cubrió el agua del suelo (ETc ajustada / ETc, FAO-56 ec. 80; no es rendimiento); **exceso de agua** = 1 − `fraccionLluviaPercolada`, es decir, la fracción de la lluvia de los días de ciclo que el suelo retuvo para el cultivo. Es una normalización `SUPUESTO`: ni FAO-56 ni el catálogo traen un umbral de encharcamiento por cultivo, y EcoCrop solo da clases de drenaje categóricas. No se inventan umbrales por cultivo. Compatibilidad de ciclo = fracción de siembras dentro de ventana (1 − `siembrasFueraDeVentana` / siembras del plan); protección del suelo = 1 − `indiceErosionRelativo` si hay índice; sin índice (hoy), 1 − `diasSueloDesnudo` / días del año agrícola, es decir, la fracción del año con cultivo (A3.7). Calor y aporte indirecto son complementarios (tabla del paso 6): se muestran, pero no entran al puntaje, y van en `pilaresExcluidos`.
- Un pilar entra al puntaje solo si tiene número en los tres escenarios de todas las rotaciones que se ordenan (`EVALUABLE` o `RESPALDO_HISTORICO`). `[DECIDIDO]` H-M1 (Mompin, 14/11 noche): una `EXPLORATORIO` no cambia los pilares de las demás. Pesos: los del usuario (F8, `USUARIO`) o con fuente (`FUENTE`), renormalizados entre los pilares que entran; si no hay, iguales y `SUPUESTO`.
- **B** se usa cuando entran al menos dos pilares. **A** (respaldo) se usa cuando solo el déficit tiene número. Hoy corre **B** con hasta cuatro pilares (déficit, exceso, compatibilidad y protección del suelo), con pesos iguales `SUPUESTO`. Un pilar entra solo si tiene número para todas las rotaciones comparadas, así que el conjunto de pilares depende de qué rotaciones se comparan. En A el desempate es la menor proporción promedio. En los dos criterios, el último desempate es el `rotacionId`, para que el orden sea determinista. En B, el arrepentimiento se mide contra el mejor puntaje de cada escenario entre las rotaciones que se ordenan.
- Solo se ordenan las rotaciones `EVALUABLE` o `RESPALDO_HISTORICO`. Una `EXPLORATORIO` recibe métricas, puntaje y peor caso, pero `ranking: null`. Si le falta un pilar que entra, su puntaje, peor caso y arrepentimiento quedan en `null`, con la advertencia `SIN_PUNTAJE`. Si las rotaciones no usan los mismos tres años, no se comparan.
- En el Worker: `rankear` (protocolo) o `cliente.rankear()`. Se vuelve a pedir después de cada `simular`, porque el arrepentimiento depende de las demás rotaciones.
- **Ids de las rotaciones (D9, `[DECIDIDO]` equipo, 15/11):** la app llama a las iniciales Rotación 1, 2 y 3 (R1, R2, R3). Las pruebas del motor (`c2.test.ts`, `tarjetas.test.ts`, `regresion.test.ts`, `series.test.ts`) conservan sus ids internos, que no se renombran: **`R4` de las pruebas = R3 visible** (milpa sembrada en las ventanas de INIFAP) y **`R3` de las pruebas = frijol-frijol**, que ya no está entre las iniciales de la app. Las cifras de abajo usan los ids de las pruebas.
- **Con datos reales** (paquete de demo con el suelo real de Isla, A3.7):
  - **R1 milpa, R2 maíz-maíz y R3 frijol-frijol:** la compatibilidad queda fuera, porque el frijol PV no tiene ventana con fuente. B usa déficit, exceso y protección del suelo (1/3 cada uno): 1.º R1 milpa (arrepentimiento 0), 2.º R3 frijol-frijol (0.047), 3.º R2 maíz-maíz (0.091). Los 257 días de suelo desnudo del monocultivo pesan más que su menor déficit. Antes de A3.7, con solo déficit y exceso, el orden era R2, R1, R3.
  - **R1 milpa, R2 maíz-maíz y R4 milpa sembrada dentro de las ventanas de INIFAP** (maíz el 1 de junio, frijol el 10 de octubre): los cuatro pilares entran (0.25 cada uno). 1.º R4 (0), 2.º R2 (0.077), 3.º R1 (0.099). La milpa R1 baja por sembrar el frijol fuera de ventana.
  - Para todas, el peor escenario es el lluvioso (2024). El orden depende de qué rotaciones se comparen, del suelo y de la condición inicial; la tarjeta lo explica con las cifras. **Robustez frente al factor de carbono a materia orgánica** (1.724, ISRIC Report 2023/01, p. 25; sensibilidad de Eduardo: 1.724 / 2.0 / 2.5 → TAW 122.3 / 124.1 / 127.4 mm/m): el orden R4, R2, R1 no cambia (prueba en `c2.test.ts`; se varía solo el TAW, no θFC de la condición inicial).

## Capa "próxima temporada (aproximada)" en el motor (A2.13, 14/11)
La banda la construye la API (`GET /api/proxima-temporada`, método de doc 13). El motor (`web/src/motor/proxima.ts`, mensaje `proxima` del Worker) **no la recalcula ni la convierte en cifra**:
- Revisa lo que el contrato obliga: `esPrediccion: false`, 6 meses, bandas con los dos extremos y no invertidas. Si algo no se cumple, la capa queda `NO_EVALUABLE` con motivo y no se muestra. `ERROR_DATOS` de la API se conserva.
- Pone cada mes de la banda junto a la **lluvia real del mismo mes** en el año agrícola de cada escenario (octubre a diciembre en *t*-1, el resto en *t*) y dice si cae debajo, dentro o encima de la banda, además de en cuántos meses cae dentro. No suma bandas de varios meses, porque la suma de percentiles mensuales no es un percentil de la suma.
- Con el paquete de demo (emitido 14/11, noviembre de 2026 a abril de 2027): los tres escenarios (seco 2023, habitual 2016, lluvioso 2024) caen dentro de la banda en 5 de 6 meses. La banda p10-p90 es ancha, así que distingue poco entre escenarios.
- **Escenario "próxima temporada" con años análogos `[DECIDIDO]` (Mompin, 14/11; `web/src/motor/analogos.ts`, contratos 0.8.0, `resultado-rotacion.proximaTemporada`):**
  - **Años análogos:** los años agrícolas *t* cuya lluvia mensual real cae dentro de la banda de lluvia (p10 a p90) en **todos** los meses del horizonte (octubre a diciembre en *t*-1, enero a septiembre en *t*). Solo cuenta la lluvia; la temperatura no entra. Si ningún año cae en todos los meses, se usan los que caen en más meses, y `criterioAnalogos` lo dice. Candidato es todo año con los meses del horizonte completos en la serie, sin año de corte fijo (H-M6). Pendiente (H-M7): un horizonte que cruce de septiembre a octubre junta meses de dos años agrícolas.
  - **Qué se simula:** solo los ciclos del plan sembrados en un mes del horizonte, es decir, lo que el usuario va a sembrar ahora. Los demás van en `ciclosFuera` con su motivo. Se usan días reales consecutivos del año análogo, con las mismas reglas, suelo y condición inicial que los escenarios. No se generan series a partir de la banda.
  - **Salida:** los pilares de déficit y exceso de cada año análogo, y un `rango` (mínimo y máximo entre los años análogos), nunca una cifra. `esPrediccion: false` y `aviso` "Años parecidos a lo que se espera para los próximos meses; no es una predicción". Es `EXPLORATORIO`, no cambia el estado de la rotación y no entra al ranking.
  - **Sin capa** no hay bloque, porque no hay fecha ni horizonte que declarar; queda la advertencia `PROXIMA_TEMPORADA_NO_DISPONIBLE`. Con una capa inválida o sin ciclos en el horizonte, el bloque sale `NO_EVALUABLE` con motivo.
  - **Con el paquete de demo** (horizonte noviembre de 2026 a abril de 2027, suelo real de Isla, milpa): 6 de 20 años caen en los 6 meses: 2006, 2008, 2013, 2019, 2022 y 2025. Solo se evalúa el frijol OI (ciclo 2). Rango: demanda sin cubrir de 0 a 10.6 %, fracción de lluvia percolada de 0.09 a 0.54, exceso de 13.6 a 135.2 mm.
  - En el Worker: `simular` con `entradas.proximaTemporada = { capa, serie }` (la capa de `GET /api/proxima-temporada` y la serie completa de `GET /api/clima`).

## Series del balance para el dashboard (A4.1, parte del motor, 14/11)
`web/src/motor/series.ts`; en el Worker, la operación `serieBalance(rotacionId, escenario)`, bajo demanda para no cargarla siempre; contrato `serie-balance` (0.11.0; las salidas validan contra el schema y contra el chequeo de largos de `contratos/validar.mjs`). Hay un documento por rotación y escenario, con una serie por ciclo (y por cultivo, si hay `porCelda`, con sus `celdas`):
- **Columnas diarias alineadas desde la siembra:** lluvia, ET0, ETc, ETc ajustada, agotamiento Dr, RAW, humedad (fracción de TAW), percolación (exceso) y déficit, con unidades fijas y la capacidad de la cubeta `tawMm`.
- **Sumas por mes:** del plan, con `mesClima` y la humedad media del mes.
- **Fechas:** las del plan (como `resultado-celda`); `fechaClima` y `mesClima` dan el día y el mes del año real del escenario.
- **Ciclo `NO_EVALUABLE`:** va sin series y con motivo.
- **Consistencia:** las sumas cuadran con los pilares (déficit y exceso totales) y las mensuales con las diarias; hay pruebas. Pesa unos 19 KB por rotación y escenario.
- **La interfaz solo grafica:** no recalcula nada.

## Paso 8: explicación
Por rotación, una tarjeta con:
- Por qué se sugiere, con evidencia concreta (año real, lluvia, mes, déficit).
- Beneficios (agua, suelo, nutrientes, plagas).
- Huecos de información (suelo supuesto, resolución gruesa, sin mercado).
- Riesgos y puntos de revisión local.
- Aviso de validar con un experto.

Si se usa un LLM, **solo redacta** a partir de números ya calculados. No decide ni inventa datos. Debe haber una plantilla de respaldo sin LLM.

**Implementado (A4.3, parte lógica, `web/src/motor/tarjetas.ts`, 14/11):** la plantilla llena `explicacion` de `resultado-rotacion` (no hizo falta un contrato nuevo) y el Worker la devuelve en `rankear`; balam la muestra. Está en español para un agricultor, sin LLM (y en inglés desde el 15/11, ver abajo). Cada frase sale de un número o una fuente del resultado; si no hay dato, la frase no se dice o se dice que falta.
- **Por qué:** posición en el ranking, los tres años reales y qué combina el puntaje; si no tiene posición, "se muestra para explorar, pero no se recomienda" o "no se puede evaluar" con el motivo.
- **Evidencia** (cada una con su fuente): lluvia de temporadas de cada año (POWER), falta de agua, exceso (FAO-56 ec. 88), días sin cultivo (SIAP) y cada siembra frente a su ventana (INIFAP).
- **Beneficios:** solo hechos medidos y comparados con las demás rotaciones: agua cubierta en el año seco, menos días sin cultivo, menos lluvia perdida, siembras en ventana, leguminosa ("este simulador no mide su aporte al suelo"). No se habla de plagas ni de nitrógeno.
- **Huecos:** pilares que no entran y por qué, calor sin umbral, erosión sin I30, suelo estimado, clima regional (tamaño de la celda según la latitud), humedad inicial regional, chile con datos del pimiento dulce, sin precios, costos, rendimiento ni plagas.
- **Riesgos:** peor año con sus cifras, mes con más exceso en el año lluvioso, mes con más falta de agua en el año seco, siembras fuera de ventana y cultivos no recomendados.
- **En la demo por defecto (R1, R2 y R4 de las pruebas, que en la app son Rotación 1, 2 y 3; suelo real de Isla), R4 (la R3 visible) sale primera por el propio ranking**, no por la plantilla: "Es la opción más robusta de las 3 rotaciones comparadas…", con los cuatro pilares. Las tarjetas de R4, R2 y R1 están en la regresión (A5.5), con R1 a R4 como caso adicional.

**Tarjetas en inglés (`[DECIDIDO]` Mompin, 15/11: la app tiene español e inglés).** El motor arma las mismas tarjetas en inglés, con las mismas cifras y las mismas fuentes; solo cambia la redacción (`TEXTOS` en `web/src/motor/tarjetas.ts`, un diccionario por idioma, sin traducción a ojo de cifras).
- **Cómo se pide:** campo opcional `idioma: 'es' | 'en'` (`IdiomaMotor`, `web/src/motor/idioma.ts`). Sin idioma, o con un valor que no es `'es'` ni `'en'`, el motor habla español, como antes. En el Worker va en la petición `rankear` (`{ tipo: 'rankear', rotacionIds?, opciones?, idioma? }`); en el cliente es el tercer parámetro: `cliente.rankear(rotacionIds, opciones, idioma)`. Para las funciones puras: `conTarjetas({ ..., idioma })` y `rankear(entrada, opciones, idioma)`. Cambiar de idioma solo pide `rankear` otra vez: el Worker reordena lo ya simulado y rehace los textos, no vuelve a simular.
- **Desde la interfaz** (la conexión la hace balam, B7; el motor no importa nada de `web/src/ui/`): en `web/src/ui/useLaboratorio.ts`, `const { idioma } = useIdioma();`, pasar `idioma` en `cliente.rankear(planes.map((p) => p.rotacionId), undefined, idioma)` y agregar `idioma` a la `clave` del cálculo para que el cambio de idioma rehaga las tarjetas. `IdiomaMotor` y `Idioma` de `ui/i18n` son el mismo conjunto (`'es' | 'en'`).
- **Qué se traduce:** todo `explicacion` (por qué, evidencia, beneficios, huecos, riesgos y el aviso de revisar con un técnico, `AVISOS_EXPERTO`), los nombres de los escenarios (`nombreEscenario(e, idioma)`: dry / normal / wet year), los meses y fechas (June 15, from June 1 to July 15), las clases texturales USDA del suelo (sandy clay loam), quién da la ventana (`ventanasDe(fuentes, una, idioma)`), el motivo de un cultivo que la fuente local no registra (se arma con el cultivo, la institución, el municipio y la temporada) y, del ranking, `mensaje` y los motivos de `noOrdenadas` (los muestra la comparación). Los cultivos salen con `nombreComunEn` del catálogo; si un cultivo no lo tiene, con su nombre en español.
- **Qué no se traduce, a propósito:** los nombres de las fuentes y sus citas (son títulos de documentos); los estados (`EXPLORATORIO`, `NO_EVALUABLE`) y las siglas PV y OI; los motivos técnicos de `NO_EVALUABLE` que arman `motor.ts`, `cultivo.ts`, `suelo.ts` y `pilares.ts` (en inglés la tarjeta los cita tal cual, marcados: "Engine reason (in Spanish): …"; son mensajes de diagnóstico, no frases para el agricultor), las advertencias técnicas de los contratos (`advertencias[].mensaje`) y los textos de la próxima temporada y de la serie del balance (`proxima.ts`, `series.ts`): la interfaz no muestra el aviso ni el motivo de la próxima temporada, y el tablero del balance muestra motivos de diagnóstico. Si el equipo quiere alguno de estos en inglés, se agrega al mismo esquema.
- **Pruebas:** la regresión A5.5 en español (`regresion.test.ts`, `demo-isla.json`) no cambió. `regresion-ingles.test.ts` fija el texto en inglés de Bajío (`regresion/ingles/bajio-guanajuato.json`) y comprueba que el orden, los pilares, las cifras y las fuentes son los mismos que en español y que no queda español fuera de nombres propios y citas; `tarjetas-ingles.test.ts` cubre Isla en inglés, el idioma por defecto, el Worker y el cliente.

## Propiedades obligatorias
- **Determinista:** mismos datos y plan ⇒ mismo resultado.
- **Rápido:** recalcular al cambiar escenario en menos de unos cientos de ms.
- **Explicable:** cada número sale de una fórmula trazable.
- **Sin dependencias de UI.** Cambiar 2D/3D o pestañas no recalcula ni vuelve a pedir datos a NASA.
- Cambiar la rotación o el cultivo **invalida** resultados anteriores hasta recalcular.

## Parámetros a definir y citar
- TAW por tipo de suelo (FAO-56).
- Kc por etapa y duración de etapas por cultivo (FAO-56).
- Umbrales de calor por cultivo.
- Umbral de lluvia intensa para el índice de erosión.
- Reglas de aporte de leguminosas y cobertura.
- Ponderaciones por defecto (solo si se usa la opción B).

## Pruebas sugeridas
Estado al 14/11 (`cd web && npm test`, archivos en `web/src/motor/pruebas/`):
1. Parcela plana, suelo arenoso, año seco ⇒ déficit alto. **En verde** (serie sintética; con datos reales el seco también sale peor que el lluvioso).
2. Misma parcela, año lluvioso ⇒ exceso y riesgo de erosión suben con la pendiente. **Exceso en verde**; la parte de erosión y pendiente sigue pendiente (`it.todo`), porque no hay índice de erosión con fuente (falta I30 y factores C y LS).
3. Rotación con leguminosa ⇒ mejora el indicador indirecto de suelo frente a monocultivo. **En verde.**
4. Cambiar escenario sin cambiar el plan ⇒ solo cambia el clima. **En verde** (además, determinismo y escenarios independientes).
5. Cultivo sin parámetros ⇒ `NO_EVALUABLE`, nunca cero. **En verde.**
6. Alternar 2D/3D ⇒ métricas idénticas. Depende de A3.6 (el motor entrega lo mismo a las dos vistas).

Además: ejemplos de FAO-56 para ET0, conservación de masa de la cubeta, salidas validadas contra los JSON Schema de `contratos/`, protocolo del Web Worker, la rotación con los tres escenarios en menos de 300 ms, el ranking (A4.2: criterios A y B calculados a mano, minimax, desempate y pesos del usuario) y la evidencia de C2 con el paquete de demo (`c2.test.ts`: suelo del mapa ⇒ `NO_EVALUABLE`; selector manual ⇒ resultados por celda y por rotación conformes al contrato).

**Regresión (A5.5, `web/src/motor/pruebas/regresion.test.ts`):** fija contra `regresion/demo-isla.json` los números clave de la parcela de Isla (paquete A2.4, suelo real de Isla; era la demo hasta el 15/11, ahora prueba interna):
- escenarios 2023 / 2016 / 2024 con su lluvia de temporadas y sus percentiles;
- pilares de la milpa en cada escenario;
- estados y `filtroClima` de las cuatro rotaciones;
- un registro de `resultado-celda`;
- el orden y el arrepentimiento del ranking (tres rotaciones y cuatro pilares);
- los años análogos y el rango de la próxima temporada.

Además comprueba que `VERSION_CONTRATO` del motor sea la versión de `contratos/` y que el plan de ejemplo de `contratos/` pase por el motor con salidas conformes a los schemas. Si un número cambia a propósito: `ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion.test.ts`, revisar el diff de `demo-isla.json` y explicarlo en docs/01 en el mismo commit.

**Regresión de los ejemplos mundiales** (15/11, `web/src/motor/pruebas/regresion-ejemplos.test.ts`): como A5.5, para cada parcela de ejemplo de `datos/demo/ejemplos/` fija contra `regresion/ejemplos/<id>.json` el clima de Köppen-Geiger, los escenarios, el estado y los pilares de 2 a 4 rotaciones de prueba con los cultivos del lugar (no son recomendaciones), el ranking y la próxima temporada, y que el resultado cumpla `resultado-rotacion`. Desde ese día la de Isla es una prueba interna (Isla ya no es la demo, `docs/13`). Se regenera con `ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion-ejemplos.test.ts` y el diff se explica en `docs/01`.
