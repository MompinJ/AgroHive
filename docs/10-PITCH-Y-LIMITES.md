# 10 · Pitch y límites

## Narrativa

1. **Persona:** Elena, productora ficticia en Veracruz. Siembra por experiencia, pero el clima cambió y las reglas ya no son las mismas.
2. **Problema:** no puede apostar toda una temporada a que "llueva como siempre". Una sequía severa puede arruinar la inversión.
3. **Idea:** no adivinamos el clima; probamos cada plan contra años reales (seco, habitual, lluvioso) y buscamos el que **no colapsa**.
4. **Demostración:** ver el campo en 3D con su relieve, elegir cultivos con el selector ("¿y si...?"), cambiar de escenario y ver cómo reacciona cada bloque.
5. **Resultado:** al menos tres rotaciones comparadas, ordenadas por robustez, con evidencia y riesgos.
6. **Cierre:** no es un piloto automático; empodera el criterio del agricultor haciendo visible cómo reaccionaría su campo antes de sembrar.

Frase de cierre del video del compañero (conservar): *si los datos satelitales pueden revelar riesgos ocultos bajo nuestros pies, ¿qué otras decisiones locales podrían cambiar si las miramos desde el espacio?*

## Argumento central
- Históricamente se busca el máximo rendimiento asumiendo un clima perfecto.
- Proponemos una **prueba de estrés climático**.
- Un plan robusto puede no romper récords en un año ideal, pero se mantiene firme ante la adversidad. La meta es **minimizar el arrepentimiento**: *"no vas a ganar muchísimo, pero no vas a perder"*.

## Qué decir que sí hace
- Combina datos de NASA con la realidad local del terreno (suelo, relieve, cultivos).
- Convierte el terreno en un modelo 3D con relieve real; cada bloque calcula su balance de agua.
- Deja probar alternativas ("what if") antes de sembrar.
- Compara al menos 3 rotaciones y explica cada una con evidencia, beneficios, huecos y riesgos.
- Deja la decisión final al agricultor.

## Límites científicos (decirlos antes de que pregunten)
- **No predice el clima** del próximo año: usa historia real y escenarios.
- **No predice cosechas, rendimientos ni ganancias.**
- **No mide pH ni fertilidad**; el suelo lo elige el usuario o es un supuesto etiquetado.
- **Resolución gruesa del clima:** una parcela cabe en una sola celda de POWER; el clima es igual en toda la parcela y las diferencias entre bloques vienen de cultivo, suelo y relieve.
- **El 3D es cualitativo:** muestra etapas y estados, no alturas ni biomasa reales.
- **Simplificaciones:** balance de agua de cubeta, índice de erosión relativo, parámetros de tablas generales.
- Toda recomendación requiere **validación en campo** con agrónomos locales.

Presentar los límites como fortaleza: la honestidad científica es parte de lo que pide el reto.

## Preguntas probables de jueces

| Pregunta | Respuesta sugerida |
| --- | --- |
| ¿Por qué no predicen el clima? | No es el objetivo. Decidimos bajo incertidumbre con años históricos reales. |
| ¿Qué tan precisos son los datos? | Resolución gruesa; los combinamos con suelo, relieve y cultivo locales, y pedimos validación de expertos. |
| ¿Qué requisitos mínimos tiene? | (Medir y tener la cifra.) Hay modo 2D ligero para equipos modestos. |
| ¿Por qué la rotación "segura" y no la más rentable? | Un mal año puede arruinar la inversión. Minimizamos el arrepentimiento. |
| ¿Reemplaza al agrónomo? | No. Hace visible el riesgo antes de sembrar y deja la decisión al agricultor. |
| ¿Qué datasets de NASA usan? | NASA POWER como base; SRTM para el relieve. (Completar con lo que efectivamente se integre: GPM, SMAP, MODIS.) |
| ¿Cómo manejan la incertidumbre? | Escenarios históricos, rangos y avisos visibles; mostramos los huecos de información por rotación. |
| ¿Cómo escalaría? | Más cultivos, otras regiones, suelo automático, alertas y sesiones (extras documentados). |
| ¿Qué parte es suya y qué es IA? | Modelos (generados con nuestro propio agente y librería), interfaz y lógica del motor son del equipo; la IA ayuda en código y redacción. (Ajustar a lo que sea cierto.) |

## Qué mostrar en la demo
1. La parcela en 3D con relieve (parcela de respaldo ya cacheada).
2. El selector: elegir los cultivos de cada ciclo.
3. Cambiar de ciclo y ver el cultivo correspondiente.
4. Cambiar de escenario: la planta se marchita o pudre en año seco; aparece riesgo en el lluvioso.
5. Tarjetas de rotación con la recomendación y su evidencia.
6. Pantalla de método, fuentes, límites y aviso de validación local.
7. Alternar a 2D y mostrar que los números no cambian.

## Video demo
- Duración y requisitos exactos: verificar en las reglas de entrega. `[VERIFICAR]`
- Guion: problema, solución, demostración, límites, cierre.
- Cuidar audio y ritmo; mostrar la escena 3D en movimiento.

## Entrega
Verificar en el sitio oficial qué se sube (descripción, enlace, video, código, uso de datos NASA) y con el organizador local si hay presentación ante jueces. `[VERIFICAR]`
