# 03 · Producto y alcance

## Problema

Persona guía: **Elena**, productora **ficticia** de agricultura de temporal en Veracruz. Siembra por experiencia, pero el clima ya no se comporta como antes. No sabe cuánta lluvia caerá, tiene poca información de nutrientes de su parcela y debe cuidar cada gota de agua. Hoy salta entre pronósticos, precios y manuales, casi adivinando.

Pregunta central: **¿cómo tomar decisiones confiables cuando el clima es incierto?** No se trata de adivinar el clima, sino de decidir bien en medio de la incertidumbre.

- **Usuario principal:** productor o productora de temporal.
- **Usuario secundario:** técnico agrícola que revisa fuentes, supuestos y advertencias.

## Concepto: simulador "what if" `[DECIDIDO]`

AgroHive es un **simulador**: el usuario prueba combinaciones ("¿y si siembro maíz y luego frijol?", "¿y si el año sale seco?") y ve el resultado antes de sembrar. Por eso hay **selector de cultivos**.

### Rotación, no diversificación
Rotación es una **secuencia cronológica planeada**: ciclo 1 maíz, ciclo 2 una leguminosa como frijol, ciclo 3 otro cultivo o cobertura. No es sembrar muchas cosas a la vez. La escena muestra el cultivo **del ciclo seleccionado**, no varios ciclos al mismo tiempo.

### Prueba de estrés climático
Cada rotación se enfrenta a escenarios históricos reales: **seco, habitual y lluvioso**. Lo ideal es medir los tres pilares del video del compañero `[DEPENDE-DATOS]`:
1. **Exposición al déficit de agua.**
2. **Compatibilidad agrícola:** si los ciclos de siembra cuadran con el clima.
3. **Protección del suelo** bajo lluvias intensas.

Filosofía: **minimizar el arrepentimiento** cuando el clima no coopera. Un plan robusto quizá no gane en un año ideal, pero no colapsa. Venderlo así: *"no vas a ganar muchísimo, pero no vas a perder"*.

### Proceso de decisión en 5 pasos
1. Armar el contexto: datos NASA más datos locales.
2. Generar o elegir alternativas de rotación.
3. Filtrar: si una idea choca con el clima local, se marca.
4. Comparar bajo los escenarios climáticos.
5. El sistema explica, muestra evidencia y pros y contras. La última palabra es humana.

## Caso de demostración

| Campo | Valor | Nota |
| --- | --- | --- |
| Ubicación | Municipio de **Isla, Veracruz** | Caso de demo y de respaldo; no es validación local. `[PROPUESTA]` |
| Superficie | **2 ha ficticias** | Parcela de ejemplo, no catastral. |
| Manejo | Temporal, sin riego | Riego fuera del análisis base. |
| Suelo | Elegido por el usuario o hipotético, siempre etiquetado `SUPUESTO` | Ver 04. |
| Clima | NASA POWER diario histórico | Regional, misma serie para toda la parcela. |
| Relieve | Elevación real por bloque | `[DECIDIDO]`, ver 04 y 05. |
| Cultivos | Se eligen el día del evento | `[EN EVENTO]` |

### Cultivos candidatos `[EN EVENTO]`
Lista unida de las dos documentaciones anteriores, para decidir en el evento según datos disponibles (Kc, ciclos, calendario) y tiempo de modelado:

- **Maíz** (presente en ambas propuestas; base del caso).
- **Frijol** (leguminosa; presente en ambas).
- **Sorgo** (propuesto en v1.2).
- **Calabaza, chile, caña de azúcar, pasto o cobertura** (propuestos en v0.2). Los perennes o semiperennes (caña) requieren decidir si entran en rotaciones o solo como contexto.

Regla: un cultivo **solo entra** si tiene parámetros citables (ciclo, etapas, Kc). Si falta, se muestra `NO_EVALUABLE` en lugar de inventar.

### Rotaciones de ejemplo `[PROPUESTA]`
Útiles para la demo; se ajustan cuando se elijan los cultivos:

| ID | Ciclo 1 | Ciclo 2 | Ciclo 3 | Propósito |
| --- | --- | --- | --- | --- |
| **R0** | Maíz | Maíz | Maíz | Referencia de monocultivo (puede hacer de "rotación actual"). |
| **R1** | Maíz | Frijol | Maíz | Alternativa con leguminosa. |
| **R2** | Maíz | Sorgo | Frijol | Alternativa diversificada. |

Con el selector, el usuario puede armar sus propias secuencias además de estas.

## Funciones

| ID | Función | Estado |
| --- | --- | --- |
| **F1** | Terreno en el mapa: parcela de demo fija; dibujar polígono propio y autogenerar cuadrícula de bloques | Parcela demo `[DECIDIDO]`; dibujo libre `[EN EVENTO]` |
| **F2** | **Relieve real**: elevación y pendiente por bloque | `[DECIDIDO]` |
| **F3** | **Selector de cultivos "what if"** con modelos propios por etapa | `[DECIDIDO]`; asignar por parcela completa o pintar por bloques `[EN EVENTO]` |
| **F4** | Línea de tiempo: como mínimo cambiar ciclo 1/2/3; slider de meses con animación de crecimiento | Ciclos `[DECIDIDO]`; slider `[EN EVENTO]` |
| **F5** | Valores visibles: cultivo, etapa, humedad, déficit/exceso, riesgo; gráficas de lluvia, demanda y balance | `[DECIDIDO]` |
| **F6** | Escenarios seco / habitual / lluvioso con años reales visibles; sliders "qué pasa si" (lluvia -20 %, temperatura +2 °C) | Escenarios `[DECIDIDO]`; sliders `[MEJORA]` |
| **F7** | Comparación de al menos 3 rotaciones ordenadas por robustez, con por qué, evidencia, beneficios, huecos y riesgos | `[DECIDIDO]`; criterio exacto de ranking en 05 |
| **F8** | Prioridades del agricultor (agua, ingreso, suelo) y su rotación actual | `[MEJORA]` |
| **F9** | Modo 2D ligero de respaldo | `[DECIDIDO]` |
| **F10** | Métodos, fuentes, unidades y advertencias siempre consultables | `[DECIDIDO]` |

## Alcance por fases

### MVP
- F1 (parcela demo), F2, F3, F4 (ciclos), F5, F6 (escenarios), F7, F9, F10.
- Datos de NASA POWER con caché y respaldo etiquetado.
- Motor de simulación con los pilares que permitan los datos.
- Avisos de incertidumbre y de validación con experto local.
- Video demo y entrega.

### Extras fase 1
- Dibujo libre de polígono y pintura por bloques (si no entran al MVP en el evento).
- Slider de meses con animaciones de crecimiento pulidas.
- NDVI satelital (MODIS) como evidencia adicional.
- Prioridades del agricultor y rotación actual (F8).
- Sesiones y guardado; alertas por cambio de datos mayor a 5 o 10 % con botón "actualizar".
- Mascota básica (verdura con cara feliz).

### Extras fase 2
- Panel de inventario y costos (agua, nutrientes, mano de obra).
- Mini tutoriales con la mascota.
- Datos de suelo automáticos por coordenada.
- Más cultivos, props decorativos (pájaro, casa, pozo) y variantes visuales.
- Escalabilidad y optimización avanzada.

## Fuera de alcance
- Predecir el clima del próximo año.
- Predecir rendimientos, cosechas o ganancias.
- Medir pH, fertilidad o reemplazar análisis de laboratorio.
- Reemplazar a un agrónomo.
- Detección automática de edificios, caminos o árboles desde imágenes.

## Mensaje de demostración

> «AgroHive transforma la historia climática de NASA en comparaciones comprensibles de rotaciones: no adivina la próxima cosecha ni reemplaza a un agrónomo, te deja ver cómo reaccionaría tu campo antes de sembrar».
