# Cifras visibles y su fuente en «Método y fuentes» (MF10 / D10)

15/11/2026, actualizada con una segunda pasada sobre `994170d`. Revisión de Mafer (tarea MF10 de `docs/16`), solo lectura: no se cambió código. La lista va a Eduardo y a la reunión.

**Cómo se hizo.** Con Chrome sin pantalla sobre `npm run dev` (corte `origin/main` del 15/11, a la altura del merge `dea2e25`) se recorrió la demo: Terreno, «Abrir laboratorio demo», Cultivos (paleta, «Ver más», capas Validación y Agua, los 6 consejos de Esquilote), Escenarios (año seco, normal y lluvioso, 3 consejos), Comparación (3 rotaciones, «Ver su peor año», dashboard «Agua mes a mes», próxima temporada, «Lo que este cálculo no ve») y Método y fuentes. Se guardó el texto visible de cada pantalla y se cruzó cada cifra con lo que lista Método. La pantalla Método solo lista seis bloques de la sesión (`MetodoFuentes.tsx`: clima, relieve, suelo, cultivos y tabla de suelos, calendario local y próxima temporada) y las condiciones de licencia de `ui/licencias.ts`.

**Qué fuentes sí aparecen en Método:** NASA POWER (MERRA-2, celda de 0.5 × 0.625 grados), GPM IMERG (como evidencia), Open-Meteo / ECMWF (SEAS5), ISRIC SoilGrids y OpenLandMap, AWS Terrain Tiles (Terrarium), Saxton y Rawls (2006), FAO-56 y FAO EcoCrop (cientos de filas), SIAP, INIFAP, OpenStreetMap y Esri.
**Qué no aparece ni una vez en Método:** NASA SMAP, MODIS (NDVI), GBIF y plagas.

## Segunda pasada sobre el código actual (`994170d`, con la demo mundial E10)

Eduardo conectó los seis ejemplos mundiales (`2b78037`): Terreno ya no ofrece Isla y elegir un ejemplo lleva directo al laboratorio. Se repitió el recorrido completo con **Bajío, Guanajuato (México)** y **Sorriso, Mato Grosso (Brasil)**, con la misma lista de pantallas. La primera pasada (Isla) se conserva abajo como referencia.

**Ya arreglado por Eduardo:**
- El título del dashboard ya no expone claves internas: dice «Agua mes a mes · Rotación 1 · Año normal (2016)» (antes «R1 · habitual 2016»).
- El texto de próxima temporada ya dice «lo que pasó en los últimos 20 años, corrido según la tendencia del pronóstico estacional» (antes «el rango de lo que pasó en años parecidos»).
- Terreno ya no presenta Isla como «Parcela de demostración».

**Sigue igual (los hallazgos 1, 2, 3 y 6 de la tabla de abajo se reproducen en los dos ejemplos nuevos):**
- SMAP, MODIS, NDVI, GBIF y plagas siguen sin aparecer ni una vez en Método, y los consejos de Esquilote siguen dando humedad SMAP y NDVI (Bajío: NDVI 0.24; Sorriso: 0.87) y plagas (chapulín de la milpa en Bajío, gusano cogollero en Sorriso).
- La leyenda de Validación sigue diciendo «baja con… calor» y «Lo que este cálculo no ve» sigue diciendo «No se evalúa el calor» y «No se consideran… plagas» mientras la comparación muestra «Plaga sin controlar».
- El dashboard sigue diciendo «Calculado con entradas de ejemplo o sinteticas: no son datos reales», y ahora lo contradice la propia pantalla Método de la misma sesión: «Clima, suelo, terreno y evidencia son datos reales de la API grabados el 2026-11-15».

**Cambia respecto de la primera pasada:**
- El hallazgo 5 (dos tarjetas con los mismos cultivos y resultados distintos) **ya no se reproduce**: era un efecto del plan por defecto de Isla. En Bajío y en Sorriso las tres rotaciones tienen cultivos distintos.
- El hallazgo 4 se refuerza con un caso concreto. La etiqueta «La más robusta» no coincide con la única métrica visible: en Bajío la Rotación 1 es «La más robusta» con más agua faltante (588, 130 y 119 mm) que la Rotación 2 (384, 41 y 56 mm); en Sorriso la Rotación 3 es «La más robusta» con 65, 80 y 89 mm mientras la Rotación 2 (soya, soya) tiene 0, 0 y 0 mm y queda tercera. Puede ser correcto (otros pilares como rotación o compatibilidad de fechas), pero la pantalla no lo muestra. En Isla también ocurría (Rotación 3 «más robusta» con 24, 9 y 32 mm frente a 14, 0 y 0 de la Rotación 2) y no lo había anotado.

**Nuevo:**
- **SMAP casi igual en tres lugares.** Isla 0.19, Bajío 0.19 y Sorriso 0.2 m³/m³, los tres «el 11 de noviembre». Puede ser casualidad (SMAP es de 36 km y los valores se redondean), pero conviene comprobar que `useEvidencia.ts` pide el punto de la parcela y no uno fijo.
- **Notas de catálogo con Isla.** Las referencias que muestra Método para Bajío y Sorriso siguen diciendo «coincide con el temporal primavera-verano de Isla» (maíz, chile, sorgo): son notas del catálogo de la época en que Isla era la demo.
- **Referencias de todo el catálogo.** Método lista los mismos grupos para cualquier ejemplo (GGCMI 48 y 54 referencias, SIAP 17 y 15, aunque SIAP es solo de México). No distingue qué fuente alimentó la parcela abierta.
- **Consejo nuevo de leguminosas** («este simulador no mide su aporte al suelo»): honesto, no necesita fuente.

## Resumen para la reunión

| # | Hallazgo | Prioridad |
| --- | --- | --- |
| 1 | Las cifras de SMAP y NDVI de los consejos de Esquilote no tienen fuente en Método ni licencia | Alta |
| 2 | Las plagas (nombre, número de bloques, «Plaga sin controlar») no tienen fuente en Método, y «Lo que este cálculo no ve» dice que no se consideran plagas | Alta |
| 3 | La leyenda de Validación dice que la planta «baja con calor», pero el motor no evalúa calor (`NO_EVALUABLE`) | Alta |
| 4 | Método promete que «los pesos, exclusiones y supuestos se muestran junto al resultado», pero la comparación solo muestra el agua, y «La más robusta» no coincide con esa métrica (ver segunda pasada) | Alta |
| 5 | ~~Dos tarjetas con los mismos cultivos y resultados distintos~~ (solo con el plan por defecto de Isla; ya no se reproduce) | Cerrado |
| 6 | El dashboard dice «Calculado con entradas de ejemplo o sinteticas: no son datos reales» aunque el clima es real, y Método de la misma sesión dice que son datos reales de la API | Media |
| 7 | Los umbrales de palabras (llovizna, lluvia fuerte, humedad media, vegetación moderada, buena/regular/mala) son `[PROPUESTA]` y no se explican en Método | Baja |

## Primera pasada (Isla): laboratorio, paso Cultivos

| Cifra visible | Dónde se ve | De dónde sale | ¿Fuente en Método? |
| --- | --- | --- | --- |
| «1 celda = 70.7 m × 70.7 m (≈ 0.50 ha)» | Esquina inferior de la escena | Geometría de la parcela dibujada | No hace falta (se calcula) |
| «Temperatura ideal en esa época (26 °C)» por cultivo | Lista de la paleta | Clima diario de NASA POWER contra los rangos de FAO EcoCrop (`conveniencia.ts`) | Sí (POWER y EcoCrop). La regla buena/regular/mala es `[PROPUESTA]` y no se explica |
| «Llueve más de lo que aguanta (1,873 mm al año)» | Lista de la paleta | Lluvia anual de POWER contra la lluvia anual absoluta de EcoCrop | Sí. Método aclara que la de EcoCrop no es lluvia del ciclo |
| «Se siembra / Casi no se siembra en esta zona» | Lista de la paleta | SIAP, hectáreas sembradas en el municipio | Sí (SIAP) |
| «Tu fecha cae en su mejor época», «Mejor época: 1 jun – 15 jul», «Siembra: 15 jun · buena fecha» | Panel izquierdo | INIFAP, guía de maíz de temporal en el sur de Veracruz | Sí (INIFAP, con página y texto) |
| «Chapulín de la milpa ataca tu maíz: 4 bloques sin insecticida» y «Gusano elotero registrada cerca lo ataca» | Lista de la paleta y «Plagas en tu zona» | Registros de presencia de GBIF más la tabla de cultivos hospederos (`plagas.ts`) | **No** (GBIF y plagas no aparecen) |
| «El insecticida no tiene costo ni efecto en el rendimiento» | «Plagas en tu zona» | Aviso del simulador | No hace falta (es una advertencia) |
| «Suelo SUPUESTO», «pH y textura estimados por un modelo global de 250 m» | «Datos de esta parcela» | SoilGrids | Sí |
| «Lluvia satelital GPM IMERG… no entra al balance» | Nota de clima en «Datos de esta parcela» | GPM IMERG | Sí |
| «Notas de próxima temporada» (tendencia, primer mes en curso, anomalía ECMWF) | «Datos de esta parcela» | Open-Meteo / ECMWF y NASA POWER | Sí |
| «Muy mala idea … Muy buena» y «baja con siembra fuera de ventana, calor o cultivo no registrado» | Capa Validación (`EscenaParcela.tsx:528`) | Estado de planta del motor | Parcial: el motor no evalúa calor (`motor.ts:440`, `tarjetas.ts:240`), así que la leyenda promete algo que no calcula |
| «0 mm/día … 8+ mm/día» | Capa Agua | ETc del motor (FAO-56); el tope de 8 es de la escala de color | Sí (FAO-56). El tope de la escala no tiene fuente (es de interfaz) |
| Consejo de lluvia: «Lluvia: 1.5 mm, llovizna, el 2026-08-29 (clima real del 2016-08-29). Fuente: NASA POWER» | Esquilote | NASA POWER diario | Sí, y es el único consejo que trae su fuente en el texto. Los cortes llovizna y lluvia fuerte son `[PROPUESTA]` |
| «Unos 25 °C en promedio y 1,873 mm de lluvia al año», «mejor época… 1 jun – 15 jul» | Esquilote | POWER e INIFAP | Sí |
| «Según el satélite SMAP, el suelo… humedad media… (0.19 m³/m³) el 11 de noviembre» | Esquilote | SMAP L3 de 36 km, pedido en vivo (`useEvidencia.ts`) | **No** (SMAP no aparece, ni su licencia). Los cortes baja/media/alta son `[PROPUESTA]` |
| «El verdor de la zona (NDVI) era de 0.4 el 19 de diciembre de 2025: vegetación moderada» | Esquilote | NDVI de MODIS a 250 m, paquete precargado | **No** (MODIS no aparece). Los rangos escaso/moderado/denso se atribuyen al Earth Observatory de NASA solo en un comentario del código (`consejos.ts`), no en pantalla |
| «Buscar entre 40 cultivos», «Ver más (32)» | Panel izquierdo | Catálogo | Sí |

## Escenarios

| Cifra visible | Dónde se ve | De dónde sale | ¿Fuente en Método? |
| --- | --- | --- | --- |
| «Año seco 2023 / Año normal 2016 / Año lluvioso 2024» | Selector de escenario | Serie NASA POWER (MERRA-2) | Sí (POWER). Método dice que se «seleccionan años secos, habituales y lluviosos» pero no el criterio |
| «Agua que faltó 7.9 mm», «Sed del cultivo 0.8 %», «Agua de más 1,632.1 mm» | Tarjeta «Maíz, ciclo 1…» | Motor: ETc (FAO-56), lluvia (POWER) y agua útil del suelo (Saxton y Rawls, FAO-56) | Sí las fuentes. No se define qué es «Sed» (porcentaje de qué) ni que «Agua de más» es percolación |
| «Fecha que muestra la parcela: 2026-06-15 … 2026-10-17» | Línea de tiempo | Fechas del plan sobre el clima de 2016, 2023 o 2024 | Sí: el dashboard explica que las fechas son las del plan y el clima el del año agrícola |
| «En el año normal casi no le faltó agua (8 mm)», «sobraron 1632 mm… podría irle mejor» | Esquilote | Mismo cálculo | Sí las fuentes |

## Comparación

| Cifra visible | Dónde se ve | De dónde sale | ¿Fuente en Método? |
| --- | --- | --- | --- |
| «La más robusta» y el orden Rotación 3, 2, 1 | Encabezado de cada tarjeta | Ranking del motor por robustez | Parcial: Método dice que compara «pilares que tienen datos en todas las alternativas» y que «los pesos, exclusiones y supuestos se muestran junto al resultado», pero en pantalla solo se ve el agua |
| «24 mm seco · 9 mm normal · 32 mm lluvioso» (Rotación 3) | Barras «Agua que le faltó al cultivo» | Déficit hídrico del motor | Sí las fuentes. No dice si es por ciclo o de toda la rotación |
| «Su peor año es el año lluvioso (2024): faltó el 3.2 % del agua y 2150 mm de lluvia se fueron por debajo de la raíz» | DEBILIDADES | Motor | Sí las fuentes. «Se fueron por debajo de la raíz» es lo mismo que «Agua de más» de Escenarios con otro nombre y otra base (rotación completa, no ciclo 1) |
| «Aun en el año seco (2023) el suelo le dio el 97.8 % del agua» | FORTALEZAS | Motor | Sí |
| «Plaga sin controlar: chapulín de la milpa puede atacar tu maíz del ciclo 1 (4 bloques sin insecticida)» | DEBILIDADES de cada tarjeta | GBIF y hospederos | **No**. Además «Lo que este cálculo no ve» dice «No se consideran precios, costos, rendimiento ni plagas» |
| Rotación 3 y Rotación 1 con ciclos idénticos (Maíz, Frijol, Maíz) y resultados distintos (24, 9, 32 contra 25, 8, 0 mm) | Dos tarjetas | No se sabe qué cambia (podrían ser las fechas de siembra); la tarjeta no lo muestra | La tarjeta no muestra la diferencia |
| «Dashboard de agua · R1 · habitual 2016» | Título del dashboard | Claves internas (hallazgo de B6) | n/a |
| «Calculado con entradas de ejemplo o sinteticas: no son datos reales» | Dashboard | Aviso de la parcela demo | El clima y el suelo de la demo son de fuentes reales; lo ficticio es el polígono. El texto induce a pensar que los números son inventados |
| «Capacidad de agua del suelo: 207.91 mm» (maíz) y «110.07 mm» (frijol) | Dashboard | Agua útil por metro por la profundidad de raíz | Sí (Saxton y Rawls, FAO-56, EcoCrop). La profundidad de raíz no se muestra |
| Tabla mensual: lluvia, ETc, consumo ajustado, déficit, percolación, humedad (fracción TAW) | Dashboard | Motor | Sí |
| «Próxima temporada (aproximada)»: rangos de lluvia y temperatura por mes y «Años parecidos: 2006, 2008, 2013, 2019, 2022, 2025» | Bajo el dashboard | ECMWF (SEAS5) y NASA POWER | Sí las fuentes. No se explica cómo se escogen los «años parecidos» y el texto «rango de lo que pasó en años parecidos» no coincide con las notas del lab (variabilidad histórica de cada mes), hallazgo de B6 |
| «122 mm de agua útil por metro» y «cuadros de 0.5 por 0.625 grados, unos 56 por 66 km» | «Lo que este cálculo no ve» | Saxton y Rawls, MERRA-2 | Sí (la resolución de MERRA-2 está en Método) |
| «No se evalúa el calor: el catálogo no tiene un umbral de temperatura con fuente» | «Lo que este cálculo no ve» | `tarjetas.ts:240` | Contradice la leyenda de Validación (ver arriba) |

## Propuestas para Eduardo (sin cambiar cifras; vigentes tras la segunda pasada)

1. En `MetodoFuentes.tsx` añadir dos bloques: «Evidencia satelital» (NDVI de MODIS y humedad de SMAP, con fecha de consulta y resolución) y «Plagas» (GBIF y la tabla de hospederos), más sus condiciones en `licencias.ts`. Hoy caen en el texto genérico «Licencia específica no verificada».
2. Cambiar «No se consideran… plagas» en `tarjetas.ts` por una frase que distinga el motor (no modela daño) de la capa ilustrativa de plagas, o quitar la plaga de las debilidades.
3. Corregir la leyenda de Validación (`EscenaParcela.tsx:528`): quitar «calor» o decir que no se evalúa.
4. Mostrar en cada tarjeta de la comparación por qué gana la «más robusta» (qué pilares y pesos cuentan), o al menos no dejar visible solo el agua. En Bajío y Sorriso la ganadora no es la de menor déficit.
5. Aclarar en el dashboard que el clima y el suelo son de fuentes reales y que solo el polígono es de ejemplo.
6. Comprobar que la consulta de SMAP usa la coordenada de la parcela (mismo valor en Isla, Bajío y Sorriso) y cambiar las notas de catálogo que mencionan Isla.
7. Decidir si los cortes en palabras (`[PROPUESTA]`) se explican en Método o se quitan del texto.

## Límites de esta revisión

- Primera pasada: solo la parcela demo de Isla, con el plan por defecto. Segunda pasada: Bajío y Sorriso con su plan por defecto; no se abrieron Kenia, India, España ni Iowa (maíz, frijol y maíz) y el motor local; no se probó una parcela dibujada ni fuera de México (eso es R9).
- Solo escritorio (1440 px); no se revisó móvil ni el texto al 200 %.
- No se abrieron todos los cultivos de «Ver más (32)» ni todas las combinaciones de rotación y año.
- La lista de fuentes de Método sale de la sesión demo; otra parcela podría mostrar otros bloques.
- El texto se leyó del DOM; el tooltip de cada término no se pasó uno por uno.
