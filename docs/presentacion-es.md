# Presentación de 7 diapositivas, versión en español

> **Qué es:** la versión en español de [`presentacion.md`](presentacion.md), para presentarla en la sede o ante público hispanohablante. **La entrega oficial va en inglés** (`docs/02`): esta versión no se sube al formulario.
>
> **Deck:** <https://claude.ai/artifact/Mz67DDoAK9bLQY7YVrtdNq> (privado hasta que Mompin lo comparta). Mismo diseño, cifras y fuentes que la versión en inglés; la tabla "De dónde sale cada cifra" de [`presentacion.md`](presentacion.md) vale igual aquí.
>
> **Capturas:** portada con la escena sin interfaz (`capturas/presentacion/portada-scenarios-bajio-recorte.png`) y pantalla Cultivos con la app en español (`capturas/presentacion/cultivos-bajio-es.png`, 15/11, `main` c4b6543). Comparación con la app en español (`capturas/presentacion/comparacion-bajio-es-recorte.png`, desde `Mompin-motor` f2990b9).

### 1. Portada

- Imagen: Campo 3D de bloques de AgroHive en la parcela de ejemplo del Bajío, año normal 2016, con maíz creciendo y árboles alrededor
- Equipo Code Hive · Reto Field Shift
- AgroHive
- Planea para el año malo.
- Un simulador «¿y si…?» que pone a prueba una rotación de cultivos con 20 años de clima real de la NASA.
- Explora la historia real del clima. No pronostica cosechas, ingresos ni el clima. El agricultor decide.

**Notas del orador:** Hola, somos el equipo Code Hive y esto es AgroHive, nuestra respuesta al reto Field Shift. Nuestro lema es «planea para el año malo». AgroHive es un simulador de «¿y si…?»: pintas una rotación de cultivos en un campo 3D y la pones a prueba con veinte años de clima real de la NASA. Una cosa desde el principio, porque importa: AgroHive no pronostica cosechas, ingresos ni el clima de la próxima temporada. Muestra cómo habría aguantado un plan en años reales, y la decisión es del agricultor.

### 2. El problema

- El problema
- Quien siembra de temporal apuesta toda la temporada al clima.
- Tiene que decidir qué sembrar antes de saber cómo vendrá el año. Un plan hecho para el año de siempre puede romperse en el año malo.
- La misma parcela, tres años reales: lluvia en las temporadas de siembra, Bajío, México
- Seco · 2009
- 561.7 mm
- Normal · 2016
- 725.4 mm
- Lluvioso · 2018
- 834.8 mm
- El año seco tuvo 163.7 mm menos de lluvia que el normal. Fuente: NASA POWER diario, temporadas abr-sep y oct-mar de cada año agrícola, calculado por el motor de AgroHive para la parcela de ejemplo del Bajío.

**Notas del orador:** Quien siembra de temporal no tiene riego al cual recurrir. Cada temporada decide qué sembrar antes de saber qué año viene. Aquí hay un lugar real, el Bajío, en el centro de México, con datos de NASA POWER: en las dos temporadas de siembra, 2009 tuvo 561.7 milímetros de lluvia, 2016 tuvo 725.4 y 2018 tuvo 834.8. Son 163.7 milímetros menos en el año seco que en uno normal. Un plan que solo funciona cuando llueve como siempre es una apuesta, y un solo año malo puede acabar con la temporada.

### 3. Qué es

- Qué es
- Un simulador «¿y si…?», no un pronóstico.
- 1 · Elige el terreno
- Escoge una de las seis parcelas de ejemplo o dibuja la tuya en el mapa.
- 2 · Pinta los cultivos
- Pinta una rotación en un campo 3D con relieve. El catálogo tiene 40 cultivos.
- 3 · Ponla a prueba
- Cambia entre un año real seco, normal y lluvioso y mira cómo reacciona cada bloque.
- No pronostica cosechas, ingresos ni una temporada exacta. El agricultor decide.
- Imagen: Pantalla Cultivos de AgroHive con la parcela de ejemplo del Bajío: paleta de cultivos a la izquierda, campo 3D de bloques al centro y Esquilote, la mascota, dando un consejo
- Pantalla Cultivos, ejemplo Bajío: la rotación 1 es maíz, sorgo, maíz.

**Notas del orador:** AgroHive es un simulador de «¿y si…?». No intenta adivinar el clima. Eliges tu terreno: una de las seis parcelas de ejemplo en el mundo, o dibujas la tuya en el mapa. Pintas tus cultivos en un campo 3D de bloques con su relieve real; el catálogo tiene cuarenta cultivos. Luego cambias entre un año real seco, normal y lluvioso y ves cómo reacciona cada bloque de tu parcela. No pronostica cosechas ni ingresos, y no sustituye a un agrónomo. Hace visible el riesgo antes de sembrar, y la decisión sigue siendo del agricultor.

### 4. Cómo funciona

- Cómo funciona
- Cada rotación enfrenta su peor año real.
- 1
- 20 años de clima diario real
- NASA POWER, oct 2005 a dic 2025, una celda por parcela
- 2
- Tres años reales de referencia
- Cercanos al p10, p50 y p90 de la lluvia de siembra
- 3
- Balance de agua FAO-56 por celda
- Corre en el navegador, dentro de un Web Worker
- 4
- Cuatro pilares por año
- Déficit, exceso de agua, ventana de siembra y cobertura
- 5
- Orden por el peor año
- Minimax de arrepentimiento; pesos iguales, SUPUESTO
- Imagen: pantalla Comparación del Bajío; la Rotación 1 aparece como la más robusta y cada tarjeta nombra su peor año, el seco de 2009
- Pantalla Comparación, ejemplo Bajío: orden por el peor año.

**Notas del orador:** Por dentro: tomamos veinte años de clima diario de NASA POWER para la parcela. De ahí elegimos tres años reales, los más cercanos a los percentiles 10, 50 y 90 de la lluvia de las temporadas de siembra: un año seco, uno normal y uno lluvioso. Son historia, no una predicción. Un balance de agua FAO-56 corre en cada celda, directamente en el navegador. Cada rotación recibe cuatro pilares por año: déficit de agua, exceso de agua, ajuste a la ventana de siembra y cobertura del suelo. Luego ordenamos por el peor año, con minimax de arrepentimiento, no por el mejor. El orden que se ve en pantalla es el que calcula el motor.

### 5. Mundial

- Mundial
- Seis ejemplos en cinco continentes.

| Parcela de ejemplo | Köppen | Año seco | Año normal | Año lluvioso |
| --- | --- | --- | --- | --- |
| Bajío, Guanajuato, México | Cwa | 2009 · 561.7 mm | 2016 · 725.4 mm | 2018 · 834.8 mm |
| Sorriso, Mato Grosso, Brasil | Aw | 2025 · 1075.7 mm | 2023 · 1475.0 mm | 2007 · 1858.2 mm |
| Uasin Gishu, Kenia | Am | 2014 · 1084.1 mm | 2023 · 1615.3 mm | 2018 · 1998.9 mm |
| Ludhiana, Punyab, India | Cwa | 2007 · 552.0 mm | 2021 · 782.9 mm | 2022 · 1025.5 mm |
| Tierra de Campos, Palencia, España | Csb | 2022 · 339.1 mm | 2023 · 483.8 mm | 2010 · 584.1 mm |
| Condado de Story, Iowa, EE. UU. | Dfa | 2023 · 630.8 mm | 2024 · 841.5 mm | 2018 · 1031.4 mm |

- Lluvia en temporadas de siembra (NASA POWER). Parcelas ficticias de ~2.8 ha sobre cultivo real (ESA WorldCover).
- GGCMI fase 3
- Base mundial: siembra de temporal a 0.5°, 15 de 40 cultivos
- MIRCA2000
- Mes de inicio de leguminosas y presencia fuera de México
- FAO Crop Calendar
- Hortalizas, ajonjolí y caupí en 57 países
- SIAP (México)
- Presencia de cultivos en cada municipio, por encima

**Notas del orador:** AgroHive no está atado a un lugar. Trae seis parcelas de ejemplo en cinco continentes: el Bajío en México, Sorriso en Brasil, Uasin Gishu en Kenia, Ludhiana en India, Tierra de Campos en España y el condado de Story en Iowa. Cada una tiene sus propios años reales seco, normal y lluvioso, y la escena 3D toma su aspecto del clima de Köppen. El calendario de siembra también es mundial: GGCMI fase 3 es la base, MIRCA2000 y el FAO Crop Calendar llenan huecos, y en México el SIAP suma datos locales encima. Y el peor año no siempre es el seco: en las corridas de prueba del motor para Sorriso y Uasin Gishu, el año más duro fue el lluvioso, por exceso de agua.

### 6. Datos y fuentes

- Datos y fuentes
- Cada cifra tiene fuente o estado.

| Fuente | Para qué | Estado |
| --- | --- | --- |
| NASA POWER (diario) | Lluvia, temperatura, radiación, viento: la base | En uso |
| GPM IMERG (vía POWER) | Lluvia satelital diaria, como evidencia | Solo evidencia |
| SMAP L3 | Humedad superficial del suelo, contraste regional | Solo evidencia |
| MODIS MOD13Q1 NDVI | Verdor de la zona, en los consejos de la mascota | Solo evidencia |
| SoilGrids + OpenLandMap | Textura y pH; agua disponible por pedotransferencia | SUPUESTO |
| Elevación Terrarium | Relieve del campo 3D | En uso |
| FAO-56 + FAO EcoCrop | Coeficientes, etapas y rangos de clima por cultivo | En uso |
| Plagas de GBIF | Plagas registradas en unos 165 km | Ilustrativa |
| Calor, erosión | Sin umbral de calor con fuente; RUSLE pide lluvia subdiaria | NO_EVALUABLE |

- Un parámetro faltante se muestra como NO_EVALUABLE con su motivo: nunca un cero ni un valor inventado. La evidencia no entra al ranking.

**Notas del orador:** Cada número de AgroHive se rastrea a una fuente. Los datos diarios de NASA POWER son la base del cálculo. La lluvia satelital de GPM IMERG, la humedad de SMAP y el NDVI de MODIS aparecen como evidencia, pero nunca cambian el ranking. La textura y el pH del suelo vienen de SoilGrids y OpenLandMap y siempre van marcados como SUPUESTO, una estimación, porque son mapas globales. Los parámetros de los cultivos vienen de FAO-56 y EcoCrop, con fuente para cada valor. Los registros de plagas de GBIF son solo ilustrativos. Y cuando falta algo, como un umbral de estrés por calor con fuente o los datos para un índice de erosión, mostramos NO_EVALUABLE con el motivo. Nunca llenamos un hueco con un cero ni con un valor inventado.

### 7. Límites y siguiente paso

- Límites y siguiente paso
- Planea para el año malo.
- Lo que AgroHive no afirma
- No pronostica cosechas, ingresos ni una temporada exacta.
- El clima es regional: una celda de POWER (0.5° × 0.625°) cubre toda la parcela.
- La escena 3D es cualitativa: etapas y estados, no alturas reales.
- Todo resultado requiere validación en campo con agrónomos locales.
- Pruébalo
- agrohive.space
- Equipo Code Hive: Mompin, Eduardo, Mafer y balam
- Uso de IA. La idea viene del video de un integrante, no de una IA. Asistentes de IA (Claude, Codex, Cursor, ChatGPT, Gemini, Copilot) ayudaron a escribir código, pruebas, documentación y esta presentación; agentes de IA hicieron los modelos 3D en código con nuestra librería de vóxeles; algunas ilustraciones de la interfaz y la voz del tráiler (ElevenLabs vía Krea) son generadas con IA. Los datos de la NASA se usan como fuente; la NASA no avala este proyecto.

**Notas del orador:** Decimos nuestros límites antes de que nos pregunten. AgroHive no pronostica cosechas, ingresos ni una temporada exacta. El clima de la NASA es regional, así que una celda cubre toda la parcela, y las diferencias entre bloques vienen del cultivo, el suelo y el relieve. La escena 3D es cualitativa. Y todo resultado necesita validación en campo con agrónomos locales. Pueden probarlo ahora en el enlace de la pantalla. Somos el equipo Code Hive. Los asistentes de IA nos ayudaron a escribir código, documentación y esta presentación, y el detalle está en nuestro README. Si los datos satelitales pueden revelar riesgos ocultos bajo nuestros pies, ¿qué otras decisiones locales podrían cambiar si las miramos desde el espacio? Gracias.
