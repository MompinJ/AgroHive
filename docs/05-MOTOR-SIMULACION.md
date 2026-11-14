# 05 · Motor de simulación

El motor es una capa **independiente del render**: recibe datos y devuelve resultados. La vista 3D, la 2D y las tarjetas solo leen de él. Si el 3D se atrasa, la demo sigue funcionando.

Fórmulas y parámetros son **propuestas** a validar con fuentes citables. Qué partes entran depende de los datos que consigamos. `[DEPENDE-DATOS]`

## Entradas

- Parcela: cuadrícula de bloques con **elevación y pendiente** por bloque.
- Serie climática histórica diaria (lluvia, temperaturas, radiación).
- Tipo de suelo (elegido por el usuario o supuesto).
- Catálogo de cultivos: ciclo, etapas, Kc por etapa, umbrales.
- Plan de siembra: qué cultivo en cada ciclo (y en cada bloque, si se pinta por bloques).
- Escenario activo.
- Prioridades del usuario `[MEJORA]`.

## Paso 1: perfil climático y escenarios
1. Lluvia anual de cada año del histórico.
2. Elegir años reales seco / habitual / lluvioso (propuesta: cerca de p10, p50, p90).
3. Guardar su serie diaria como "escenario"; mostrar siempre el año real.
4. `[MEJORA]` Ajustes "qué pasa si" (lluvia × factor, temperatura + n °C).

## Paso 2: ciclos y clima — investigación abierta `[DEPENDE-DATOS]`
No está resuelto cómo se asigna una serie climática a cada uno de los ciclos de una rotación. Factores a investigar en el evento:
- Cuántos ciclos al año caben según calendario local (en Veracruz puede haber primavera-verano y otoño-invierno, así que **3 ciclos no equivalen necesariamente a 3 años**).
- Qué entregan las APIs (diario, mensual, período disponible).
- Duración del ciclo de cada cultivo elegido.

Opciones a evaluar: (a) los tres ciclos dentro del mismo año/escenario; (b) ventanas consecutivas reales del histórico; (c) cada ciclo con su temporada típica en el año del escenario. Documentar la elegida en 01.

## Paso 3: demanda de agua
- ET0 diaria: Open-Meteo, o calculada (Hargreaves-Samani simple; Penman-Monteith FAO-56 si hay humedad y viento). Si falta alguna entrada, usar alternativa documentada e indicar menor precisión.
- Demanda: **ETc = Kc(etapa) × ET0**.
- La etapa depende de los días desde la siembra y del ciclo del cultivo (duraciones **publicadas**, nunca arbitrarias).

## Paso 4: balance de agua por bloque (modelo de cubeta)
Cada bloque tiene un reservorio de capacidad TAW (según suelo y raíces). Por día:
- Entrada: lluvia. Lo que excede la capacidad es **escurrimiento o drenaje**.
- Salida: ETc.
- Si no se cubre la demanda: **déficit** ese día.
- Guardar: humedad (fracción de TAW), déficit acumulado, exceso acumulado.
- **Relieve:** en bloques con pendiente alta se puede asumir más escurrimiento (menos infiltración). Simplificación a justificar.

## Paso 5: estrés y estado visual
- **Estrés hídrico:** proporción de días con déficit en etapas sensibles.
- **Estrés por calor:** días sobre el umbral del cultivo.
- **Avance fenológico:** días desde la siembra; el estrés puede retrasar el desarrollo visual.
- Salida para el render: etapa, avance dentro de la etapa (0 a 1) y estado (`normal`, `estresada`, `marchita`, `podrida`). Son **cualitativos**: no son alturas ni biomasa reales.
- No estimamos toneladas. Mostramos **estado y riesgo**, no producción.

## Paso 6: los tres pilares por rotación y escenario

Lo ideal es calcular los tres; se recorta según datos y tiempo. `[DEPENDE-DATOS]`

| Pilar | Métrica | Prioridad si hay que recortar |
| --- | --- | --- |
| **Déficit hídrico** | Proporción de demanda no cubierta; días y etapas sensibles con déficit | 1 (núcleo) |
| **Compatibilidad de ciclo** | Si las siembras caen en meses viables según clima y calendario | 2 |
| **Protección del suelo** | Índice relativo de erosión (intensidad de lluvia, pendiente, cobertura) y períodos de suelo desnudo; inspirado en USLE/RUSLE, **no toneladas** | 3 |
| Riesgo por calor | Días de estrés térmico | Complementario |
| Aporte indirecto al suelo | Presencia de leguminosas y cobertura, diversidad de especies (reglas simples, sin afirmar nitrógeno medido) | Complementario |

## Paso 7: filtro, robustez y ranking `[EN EVENTO]`
1. **Filtro:** marcar rotaciones que chocan con el clima local (siembra fuera de ventana viable en todos los escenarios).
2. **Robustez:** el criterio principal es el **peor caso**.
3. Dos formas documentadas de ordenar; elegir en el evento según lo que se logre calcular:
   - **A (v1.2):** ordenar por **menor exposición hídrica en el peor caso**; mostrar mediana, dispersión y suelo por separado. Sin puntaje compuesto inventado.
   - **B (v0.2):** puntaje por escenario combinando pilares (ponderados por prioridades si existe F8); robustez = peor puntaje; **arrepentimiento** = mejor puntaje posible del escenario − puntaje de la rotación; preferir el menor arrepentimiento máximo; desempate por promedio.
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
1. Parcela plana, suelo arenoso, año seco ⇒ déficit alto.
2. Misma parcela, año lluvioso ⇒ exceso y riesgo de erosión suben con la pendiente.
3. Rotación con leguminosa ⇒ mejora el indicador indirecto de suelo frente a monocultivo.
4. Cambiar escenario sin cambiar el plan ⇒ solo cambia el clima.
5. Cultivo sin parámetros ⇒ `NO_EVALUABLE`, nunca cero.
6. Alternar 2D/3D ⇒ métricas idénticas.
