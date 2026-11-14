# Guion base del video de demo (borrador para A5.6)

> **Borrador para Mafer (dueña de A5.6).** Duración objetivo: **2 a 3 minutos** `[VERIFICAR]`. El formato, la duración máxima y las reglas de uso de IA, marca e imágenes de NASA dependen de las reglas oficiales (V-03, V-04 en `docs/11`; A0.5 en `docs/14`). Todas las cifras salen de `web/src/motor/pruebas/regresion/demo-isla.json` (versión de contrato 0.10.0) y de `docs/05`, `docs/13` y `api/README.md`. Si el paquete de demo se regenera, hay que volver a revisarlas.

**Cómo leerlo:** cada escena trae lo que se ve en pantalla, el texto de la voz y una duración aproximada. Lo marcado `[VERIFICAR]` depende de que la pieza esté en la interfaz el día de la grabación (estado en `docs/14`).

## Resumen de tiempos

| # | Escena | Duración |
| --- | --- | --- |
| 1 | El problema | 0:15 |
| 2 | Qué es AgroHive | 0:15 |
| 3 | P0 a P1: la parcela de Isla | 0:20 |
| 4 | Datos reales de la parcela | 0:20 |
| 5 | P2: escena 3D y selector | 0:25 |
| 6 | P3: ranking y por qué | 0:25 |
| 7 | Próxima temporada (no es predicción) | 0:15 |
| 8 | Datos usados | 0:15 |
| 9 | Honestidad y límites | 0:15 |
| 10 | Cierre | 0:10 |
| | **Total** | **≈ 2:55** |

## Escenas

### 1. El problema (0:15)

- **En pantalla:** campo de temporal en el sur de Veracruz (ilustración de P0 o toma propia, `[VERIFICAR]` derechos de imagen). Texto: "¿Qué siembro si no sé cómo vendrá el año?".
- **Voz:** "Un productor de temporal decide qué sembrar sin saber si el año vendrá seco o lluvioso. Si se equivoca, pierde la cosecha. No necesita la opción que más gana en un año ideal: necesita la que no se cae en un año malo."
- **Fuente:** `docs/00`, `docs/03`.

### 2. Qué es AgroHive (0:15)

- **En pantalla:** P0 (inicio) con el aviso de que usa historia y no predice.
- **Voz:** "AgroHive es un simulador 'qué pasaría si'. Pones tus rotaciones de cultivos contra veinte años de clima real de la NASA y ves cuál aguanta mejor el peor año. La decisión sigue siendo tuya."
- **Fuente:** `docs/00`, `docs/06` (P0).

### 3. P0 a P1: la parcela de Isla (0:20)

- **En pantalla:** P1. Se dibuja el contorno en el mapa y aparece la cuadrícula de celdas (A2.10 y A2.9 hechas). Rótulo: "Isla, Veracruz. Parcela de 2 ha ficticia".
- **Voz:** "Dibujamos la parcela en el mapa y AgroHive la divide en bloques. Para la demo usamos una parcela de ejemplo de dos hectáreas en Isla, Veracruz. La parcela es ficticia; los datos de esa coordenada son reales."
- **Fuente:** `docs/06` (P1), `datos/demo/LEEME.md`.

### 4. Datos reales de la parcela (0:20)

- **En pantalla:** panel de datos de P1 o P2 con clima, suelo y relieve, y su etiqueta (`SUPUESTO` en suelo).
- **Voz:** "Con esa coordenada pedimos el clima diario de NASA POWER de 2005 a 2025, el relieve de cada bloque y el suelo estimado por mapas globales: franco arcillo arenoso, con 122.3 milímetros de agua disponible por metro. Ese dato es una estimación, y por eso lo marcamos como supuesto."
- **Cifras:** TAW 122.3 mm/m (Saxton y Rawls 2006, desde SoilGrids; `docs/01`, `docs/05`).

### 5. P2: escena 3D y selector (0:25)

- **En pantalla:** P2 con la escena 3D con relieve (A3.1 hecha) y el selector (A3.4 hecho). Se elige una rotación (R1 milpa, R2 maíz-maíz, R3 frijol-frijol, R4 milpa en ventanas de INIFAP) y se cambia el escenario seco, habitual o lluvioso. Las plantas cambian de etapa y de estado.
- **Voz:** "Probamos rotaciones: milpa, maíz tras maíz, frijol tras frijol y la milpa sembrada en las fechas que recomienda INIFAP. Cada una se pone contra tres años reales: el seco fue 2023, el habitual 2016 y el lluvioso 2024. Lo que ves en 3D lo calcula el motor: la escena solo lo muestra."
- **Cifras:** seco 2023 (1 523.4 mm en las temporadas PV y OI), habitual 2016 (1 912 mm), lluvioso 2024 (2 083.5 mm), con lluvia de POWER y temporadas de SIAP (`demo-isla.json`, `escenarios`).

### 6. P3: ranking y por qué (0:25)

- **En pantalla:** P3 con la tabla de rotaciones y el criterio B. R4 aparece arriba como sugerida, con su explicación `[VERIFICAR]` (A4.3, tarjetas, está pendiente en `docs/14`).
- **Voz:** "AgroHive ordena las rotaciones por su peor año y por cuánto te arrepentirías de elegirlas. Comparando la milpa, el maíz tras maíz y la milpa en fechas de INIFAP, gana esta última. La milpa común baja porque siembra el frijol fuera de su ventana. Para las tres, el peor año es el lluvioso, el 2024."
- **Cifras:** con R1, R2 y R4 y cuatro pilares con pesos iguales `SUPUESTO`, el orden es R4 (arrepentimiento 0), R2 (0.077) y R1 (0.099), y el peor escenario es el lluvioso para todas (`demo-isla.json`, `rankingCuatroPilares`; `docs/05` paso 7).
- **Ojo:** ese orden es el de comparar R1, R2 y R4. Si en pantalla se comparan las cuatro, el orden lo da el motor y hay que leerlo de la interfaz `[VERIFICAR]`. No decir que R4 "da más cosecha": el ranking mide agua y suelo, no rendimiento.

### 7. Próxima temporada: no es una predicción (0:15)

- **En pantalla:** la banda de "próxima temporada aproximada" (A4.9 hecha) con su aviso visible.
- **Voz:** "También mostramos un rango para los próximos seis meses, a partir del pronóstico estacional. No es una predicción: es la franja de lo plausible. Los tres años de prueba caen dentro de esa franja en cinco de seis meses."
- **Cifras:** banda de 6 meses, de noviembre de 2026 a abril de 2027; los tres escenarios caen dentro en 5 de 6 meses (`demo-isla.json`, `proximaTemporada.coincidencias`; `docs/05`). Para la rotación hay seis años análogos (2006, 2008, 2013, 2019, 2022 y 2025) y el déficit queda entre 0 % y 10.6 % (`proximaTemporada.rango`). Es `EXPLORATORIO` y no entra al ranking.

### 8. Datos usados (0:15)

- **En pantalla:** lista de fuentes con sus logos o nombres `[VERIFICAR]` uso de marca NASA (V-04).
- **Voz:** "La base es NASA POWER: lluvia, temperatura, radiación y humedad del suelo. Sumamos el suelo de SoilGrids y OpenLandMap, el relieve de Terrarium, el pronóstico estacional de Open-Meteo, las tablas de la FAO y los calendarios de SIAP e INIFAP."
- **Si entran a tiempo** `[VERIFICAR]` en `docs/14`: lluvia satelital GPM IMERG como evidencia (A4.10), humedad SMAP como contraste (A4.8, en curso) y NDVI de MODIS (A4.11). Ninguno entra al ranking ni al balance: mencionarlos solo si se ven en pantalla.
- **Fuente:** `docs/04`, `docs/13`, `docs/README-borrador.md`.

### 9. Honestidad y límites (0:15)

- **En pantalla:** un bloque o pilar marcado `NO_EVALUABLE`, una etiqueta `SUPUESTO` y la capa `EXPLORATORIO`.
- **Voz:** "Cuando falta un dato, AgroHive no lo inventa: lo marca como no evaluable. Lo estimado se marca como supuesto, y lo ilustrativo, como exploratorio. No predice cosechas ni ganancias, el clima de NASA es regional y el 3D es cualitativo."
- **Fuente:** `docs/04` (estados), `docs/10` (límites científicos).

### 10. Cierre (0:10)

- **En pantalla:** logo de AgroHive y del equipo Code Hive, reto Field Shift.
- **Voz:** "AgroHive convierte la historia climática de la NASA en una comparación que se entiende. No adivina la cosecha: te ayuda a elegir la rotación que no se cae. Equipo Code Hive, NASA Space Apps 2026."
- **Fuente:** frase de demo de `AgroVault/Compartido/Resumen.md`.

## Antes de grabar

- [ ] Confirmar formato, duración y reglas de IA, marca e imágenes (V-03, V-04).
- [ ] Regenerar o revisar el paquete de demo y volver a leer las cifras de `demo-isla.json`.
- [ ] Revisar qué piezas están en la interfaz (A4.3 tarjetas, A4.10 IMERG, A4.11 NDVI, A4.8 SMAP) y quitar del guion lo que no se vea.
- [ ] Grabar un respaldo sin internet (A5.8).
