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
3. **Año elegido:** el de lluvia de temporadas más cercana a cada percentil. **Desempate:** si dos años quedan a la misma distancia (diferencia menor a 0.05 mm, la mitad de la precisión mostrada) gana el más antiguo. Siempre se declara el segundo año más cercano (advertencia `ANIO_CERCANO`), para que un empate práctico se vea.
4. **Serie del escenario** (`clima-escenario`): los 18 meses del año agrícola de SIAP, del 1 de octubre de *t*-1 al 31 de marzo de *t*+1, para que quepan los ciclos que se cosechan después de septiembre. `anioReal` = *t*, siempre visible; `seleccion.criterio` describe todo lo anterior y `seleccion.lluviaAnualMm` queda como la lluvia del año calendario *t*, solo de referencia. Estado: el de la serie (`RESPALDO_HISTORICO` con Open-Meteo); una serie de ejemplo o sintética es como mucho `EXPLORATORIO`.
5. **Con la serie real de POWER de la celda demo** (lat 18.0, lon -95.625, 2006-2025; fixture en `web/src/motor/pruebas/datos/`): 19 años candidatos (2006 no, su OI empieza en octubre de 2005); seco = **2023** (1 523 mm de temporadas, p10 = 1 520), habitual = **2016** (1 912 mm = p50), lluvioso = **2024** (2 084 mm, p90 = 2 090; 2025 queda a 2 mm). Para tener 20 años candidatos, la serie debe empezar el 1 de octubre del año anterior a la ventana (ver Pendientes, A2.4).
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
- **Supuestos declarados:** cada ciclo arranca a capacidad de campo (Dr,i = 0, que FAO-56 cap. 8 admite tras lluvia intensa; advertencia `CONDICION_INICIAL_SUPUESTA`, que en un año seco subestima el déficit). Con `retencion` del suelo y `humedadRaizFraccionSat` en la serie, el motor ya convierte GWETROOT: θ = GWETROOT × θsat y Dr,i = 1000 (θFC − θ) Zr (ec. 87). **Relieve:** escurrimiento = 0 por ahora (no hay coeficiente con fuente para la pendiente; advertencia `SIN_ESCURRIMIENTO`); entra con A3.7.

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

**Estado (A2.7):** el pilar de déficit hídrico está implementado (`motor.ts`): por escenario, `proporcionDemandaNoCubierta` = déficit / ETc sumados en todos los ciclos; días con déficit; déficit y exceso en mm. En una parcela con varias celdas es el promedio ponderado por `fraccionDentro` (días redondeados al entero; advertencia `AGREGACION_PARCELA`). `diasDeficitEtapasSensibles` queda en `null` mientras el catálogo no traiga etapas sensibles con fuente. Aporte indirecto: incluye leguminosa y número de especies (prueba 3). Compatibilidad de ciclo, protección del suelo y calor salen `NO_EVALUABLE` con motivo hasta A3.7. `puntaje`, `peorCaso`, `arrepentimiento`, `ponderacion` y `ranking` los llena A4.2.

**Estados de evaluabilidad (doc 04) en el motor:** un resultado hereda el estado más fuerte de sus entradas: `ERROR_DATOS` > `NO_EVALUABLE` > `EXPLORATORIO` > `RESPALDO_HISTORICO` > `EVALUABLE`. `NO_EVALUABLE` con motivo si falta el suelo o su TAW, un parámetro del cultivo, el cultivo en el catálogo, la serie del escenario o un día de clima, o si el plan no es cronológico (ciclos traslapados). Si un escenario no es evaluable, la rotación tampoco (su peor caso no se conoce). Un cultivo que el calendario local no registra deja la rotación en `EXPLORATORIO` (`cultivosNoRecomendados`; en la celda, `noRecomendadoEnLugar`). Un estado `NO_EVALUABLE` o `ERROR_DATOS` lleva todos sus indicadores en `null`.

**Con datos reales** (POWER de la celda demo, milpa maíz PV + frijol OI, sin riego): la proporción de demanda no cubierta va de 0 % (lluvioso) a 4 % (seco, arena franca); en franco y arcilla, menos de 0.3 %. El exceso es grande (750 a 1 340 mm). En Isla el pilar hídrico solo distingue poco entre rotaciones: los pilares 2 y 3 (A3.7) pesan para el ranking.

## Paso 7: filtro, robustez y ranking `[DECIDIDO]` (criterio B, 14/11)
1. **Filtro:** marcar rotaciones que chocan con el clima local (siembra fuera de ventana viable en todos los escenarios).
2. **Robustez:** el criterio principal es el **peor caso**.
3. **Criterio decidido: B** (decisión del equipo, 14/11, en el evento):
   - **B (v0.2), principal:** puntaje por escenario combinando pilares (ponderados por prioridades si existe F8); robustez = peor puntaje; **arrepentimiento** = mejor puntaje posible del escenario − puntaje de la rotación; preferir el menor arrepentimiento máximo; desempate por promedio.
   - **Pesos:** solo con fuente, justificados o dados por el usuario (F8). Si no los hay, **pesos iguales entre los pilares evaluables, declarados como `SUPUESTO`** en el resultado (`ponderacion` en `contratos/resultado-rotacion.schema.json`). Nunca pesos inventados presentados como dato. Un pilar `NO_EVALUABLE` no entra al puntaje y se lista como excluido; si el pilar hídrico no es evaluable, el escenario es `NO_EVALUABLE`.
   - **Normalización:** cómo pasa cada pilar a un subpuntaje de 0 a 1 se define y documenta en A4.2, con su justificación.
   - **A (v1.2), respaldo:** ordenar por **menor exposición hídrica en el peor caso**; mostrar mediana, dispersión y suelo por separado, sin puntaje compuesto. Se usa si los pilares 2 y 3 (A3.7) no llegan: con un solo pilar, B no aporta nada sobre A. El resultado declara qué criterio usó.
4. Si ninguna rotación es evaluable: *"No podemos determinar una opción más robusta con estos datos"*.

## Paso 8: explicación
Por rotación, una tarjeta con:
- Por qué se sugiere, con evidencia concreta (año real, lluvia, mes, déficit).
- Beneficios (agua, suelo, nutrientes, plagas).
- Huecos de información (suelo supuesto, resolución gruesa, sin mercado).
- Riesgos y puntos de revisión local.
- Aviso de validar con un experto.

Si se usa un LLM, **solo redacta** a partir de números ya calculados. No decide ni inventa datos. Debe haber una plantilla de respaldo sin LLM.

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
2. Misma parcela, año lluvioso ⇒ exceso y riesgo de erosión suben con la pendiente. **Exceso en verde**; la parte de erosión y pendiente queda pendiente de A3.7 (`it.todo`).
3. Rotación con leguminosa ⇒ mejora el indicador indirecto de suelo frente a monocultivo. **En verde.**
4. Cambiar escenario sin cambiar el plan ⇒ solo cambia el clima. **En verde** (además, determinismo y escenarios independientes).
5. Cultivo sin parámetros ⇒ `NO_EVALUABLE`, nunca cero. **En verde.**
6. Alternar 2D/3D ⇒ métricas idénticas. Depende de A3.6 (el motor entrega lo mismo a las dos vistas).

Además: ejemplos de FAO-56 para ET0, conservación de masa de la cubeta, salidas validadas contra los JSON Schema de `contratos/`, protocolo del Web Worker y la rotación con los tres escenarios en menos de 300 ms.
