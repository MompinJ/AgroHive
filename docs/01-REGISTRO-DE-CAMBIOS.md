# 01 · Registro de cambios

Toda edición de esta carpeta se anota aquí. No borrar entradas anteriores.

## Formato de entrada

```text
Fecha: AAAA-MM-DD
Archivos:
Cambio y motivo:
Fuente / evidencia:
Decisiones afectadas:
```

### 2026-11-14 — A2.13: escenario de próxima temporada con años análogos y contratos 0.9.0 en el motor (Mompin)

- **Archivos:** `web/src/motor/analogos.ts` (nuevo), `motor.ts` (`preparar`, `pilaresAguaEnClima`, entrada opcional `proximaTemporada`), `proxima.ts`, `protocolo.ts`, `index.ts`, `tipos.ts` (`VERSION_CONTRATO` 0.9.0); prueba `analogos.test.ts`; `docs/05`, `docs/13`, `docs/14` (vistas regeneradas) y `AgroVault`. Se integra la rama `contratos-nulos` (0.9.0).
- **Decisión `[DECIDIDO]` (Mompin, 14/11):** escenario "próxima temporada" con años análogos reales. Son los años agrícolas cuya lluvia mensual cae dentro de la banda p10-p90 en todos los meses del horizonte; si ninguno, los que caen en más meses, declarado. Solo se simulan los ciclos sembrados dentro del horizonte. Va en `resultado-rotacion.proximaTemporada` (contratos 0.8.0): `EXPLORATORIO`, `esPrediccion: false`, rango mínimo-máximo sin cifra única, fuera del ranking, con el aviso "años parecidos a lo que se espera, no es predicción".
- **Con el paquete de demo** (noviembre de 2026 a abril de 2027, suelo real de Isla, milpa): años análogos 2006, 2008, 2013, 2019, 2022 y 2025; solo se evalúa el frijol OI. Demanda sin cubrir de 0 a 10.6 %, fracción percolada de 0.09 a 0.54.
- **Sin capa no se emite el bloque:** sin fecha de emisión ni horizonte, cualquier fecha sería inventada. Queda la advertencia `PROXIMA_TEMPORADA_NO_DISPONIBLE`.
- **Contratos 0.9.0:** los pilares no evaluables del motor ya llevaban los indicadores en `null` y su motivo; todas las salidas validan contra 0.9.0.
- **Fuente / evidencia:** `cd web && npm test` (157 pruebas).

### 2026-11-14 — Motor con el suelo real de Isla y desempate del p50 al año más reciente (Mompin)

- **Archivos:** `web/src/motor/escenarios.ts` (desempate), pruebas `escenarios.test.ts`, `motor.test.ts` y `c2.test.ts`; `docs/05`, `docs/13`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`. Se integra `origin/Eduardo` (A2.15 OpenLandMap, A2.16 en `/api/suelo` y paquete de demo regenerado).
- **Decisión `[DECIDIDO]` (Mompin, 14/11):** si dos años quedan a la misma distancia del percentil, gana el **más reciente** (antes, el más antiguo). Se sigue declarando el segundo más cercano. Con la serie del paquete de demo (20 años) el p50 empata siempre entre los dos años centrales: el habitual pasa de **2008 a 2016**. Seco 2023 y lluvioso 2024 no cambian.
- **Suelo real de Isla en la evidencia de C2:** `datos/demo/respuestas/suelo.json` trae TAW 122.3 mm/m y retención por Saxton y Rawls (θsat 0.454, θFC 0.293, θWP 0.171). La rotación pasa a `EVALUABLE` en los tres escenarios y cada ciclo arranca con la humedad de POWER (GWETROOT convertida; advertencia `CONDICION_INICIAL_GWETROOT`) en lugar del supuesto de capacidad de campo. Milpa en el seco (2023): 2.4 % de la demanda sin cubrir, 46 días, 25.3 mm de déficit y 1 052.8 mm de exceso (coincide con lo que reportó Eduardo). Un suelo sin TAW sigue dando `NO_EVALUABLE`.
- **Ranking B con el suelo real:** 1.º maíz-maíz (arrepentimiento máximo 0.0065), 2.º milpa (0.013), 3.º frijol-frijol (0.060); para las tres el peor escenario es el lluvioso (2024). Con el selector franco y el arranque a capacidad de campo el frijol iba primero: el orden depende del suelo y de la condición inicial.
- **Fuente / evidencia:** `cd web && npm test` (145 pruebas; la de escena `demo-motor.test.ts` la ajusta su sesión, porque suponía el TAW de Isla en `NO_EVALUABLE`).

### 2026-11-14 — A3.1 y A3.2: escena 3D con relieve y cargador de `.bbmodel` (Mompin, rama `Mompin-escena`)

- **Archivos:** `web/src/escena/` (nuevo), `web/escena.html`, `web/package.json` (three 0.187.0, @types/three 0.187.0, vitest 5.1.0), `docs/06`, `docs/07`, `docs/14`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** escena 3D en Three.js sin React Three Fiber `[DECIDIDO]` (Mompin): relieve por bloque desde `elevacionM`, un `InstancedMesh` por tipo, placas de estado con color + patrón + icono (base de A3.3), suelo según la humedad del motor, plantas desde los `.bbmodel` de Mafer. Lo que falta se muestra como `NO_EVALUABLE` o "Sin resultado", nunca como cero. Exageración vertical ×10 por defecto `[PROPUESTA]`.
- **Fuente / evidencia:** 76 pruebas en `web/src/escena/pruebas/`, incluida la escena con el motor real y el paquete de demo (con el suelo del mapa todo `NO_EVALUABLE`; con el selector manual, el maíz con sus modelos). Vista previa revisada en Chrome headless (perfil temporal): relieve, modelos, selección por clic y caso `NO_EVALUABLE`.
- **Pendiente:** montarla en Laboratorio (balam, propuesta en `web/src/escena/INTEGRACION.md`), una línea `server.fs.allow` en `web/vite.config.ts` para ver los modelos en `npm run dev`, modelos de frijol y calabaza (A2.11) y el ajuste fino de estados (A3.3, Mafer).

### 2026-11-14 — Pilar de exceso de agua en el ranking B y capa de próxima temporada en el motor (Mompin)

- **Archivos:** `web/src/motor/` (`balance.ts`, `motor.ts`, `ranking.ts`, `tipos.ts`, `proxima.ts` nuevo, `protocolo.ts`, `cliente.ts`, `index.ts`; pruebas `ranking.test.ts`, `c2.test.ts`, `proxima.test.ts`), `docs/05`, `docs/13`, `docs/14` (con las vistas de `herramientas/cronograma.py` regeneradas), `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **Decisión `[DECIDIDO]` (Mompin, 14/11):** el exceso de agua entra como pilar del ranking B. El motor emite `excesoHidrico` (contratos 0.7.0) con `excesoTotalMm`, `diasExceso` y `fraccionLluviaPercolada` (percolación de FAO-56 ec. 88 entre la lluvia de los días de ciclo). Subpuntaje = 1 − fracción percolada; la normalización queda `SUPUESTO` porque no hay un umbral publicado de encharcamiento por cultivo (FAO-56 no lo trae y EcoCrop solo da clases de drenaje), y no se inventan umbrales por cultivo. Peso igual que los demás pilares (`SUPUESTO`), salvo que el usuario dé el suyo.
- **Efecto:** con déficit y exceso hay dos pilares con número y el ranking pasa del respaldo A al criterio B. Con el paquete de demo (suelo franco del selector): 1.º frijol-frijol (arrepentimiento máximo 0.007), 2.º milpa (0.051), 3.º maíz-maíz (0.064); para las tres el peor escenario es el lluvioso (2024). Con A el orden era el inverso.
- **A2.13, parte del motor:** `vistaProximaTemporada` valida la banda (`esPrediccion: false`, 6 meses, sin cifra única ni bandas invertidas; si falla, `NO_EVALUABLE`) y la compara mes a mes con la lluvia real del mismo mes en los años de los tres escenarios. No suma bandas ni genera días a partir de ellas. Con el paquete de demo el habitual cae dentro de la banda en 6 de 6 meses y el seco y el lluvioso en 5 de 6. El escenario "próxima temporada" con años análogos queda propuesto, sin implementar.
- **Fuente / evidencia:** 67 pruebas en verde (`cd web && npm test`), salidas validadas contra contratos 0.7.0.

### 2026-11-14 — A3.3: estados visuales legibles con daltonismo; A2.11: frijol y calabaza (Mafer)

- **Archivos:** `web/src/escena/estilos-estado.ts`, `patrones.ts`, `EscenaParcela.tsx` (una línea), nuevos `daltonismo.ts` y `pruebas/daltonismo.test.ts`; `modelos/` (frijol, calabaza, paleta y los 5 `.bbmodel` del maíz); `docs/06`, `docs/14`, `AgroVault/Compartido/Pendientes.md`. Los archivos de `escena/` son de Mompin, que dejó escrito que A3.3 los ajusta ahí.
- **A3.3, cambio:** simulación de daltonismo con la fuente publicada (Machado et al. 2009) y pruebas con mínimos de color, íconos y patrones. Solo se cambia un color: `NO_EVALUABLE` (y "sin elevación", que lo repite) de `#9a9a9a` a `#ececec`. Íconos finales: gota partida, hoja colgando, equis (reemplaza a "moho", que no se entendía en 8 × 8) y surcos. La leyenda deja de leerse dos veces en lectores de pantalla.
- **A3.3, hallazgo:** con los colores provisionales, bajo deuteranopia `podrida` y `NO_EVALUABLE` casi se confundían (dE 7.1) y `NO_EVALUABLE` con `normal` (12): confundir "sin dato" con "normal" es justo lo que el proyecto no debe permitir. Los umbrales (dE 15; 16 y 48 píxeles) son del equipo `[PROPUESTA]`, no de la fuente.
- **A2.11, cambio:** `frijol` y `calabaza` con las 5 etapas del maíz (siembra, brote, crecimiento, madurez, podrida) y paleta de 60 colores (16 nuevos al final, índices 44 a 59); visores `visor_frijol.html`, `visor_calabaza.html` y `visor_milpa.html`. `estresada` y `marchita` no tienen modelo propio: la escena usa el de su etapa más la placa de estado.
- **Corrección:** la prueba de Mompin que compara la paleta incrustada con `modelos/paleta.md` falló para el maíz, porque el agente de modelado había revertido los `.bbmodel` del maíz para que git no los marcara. Se regeneran con `python modelos/cultivos/maiz.py`: solo cambia la textura incrustada (ahora con los 60 colores) y las piezas son idénticas.
- **Fuente / evidencia:** Machado, G. M., Oliveira, M. M. y Fernandes, L. A. F. (2009), IEEE TVCG 15(6): 1291-1298 (matrices de https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html; cada fila suma 1, comprobado en pruebas). `cd web && npm test`: 189 pruebas; `tsc` y `npm run build` sin errores.
- **Pendiente:** los modelos de frijol y calabaza se revisaron con renders propios del agente, no en Three.js ni en Blockbench; falta que una persona abra `visor_milpa.html`. Los colores de los modelos son a ojo.
- **Decisiones afectadas:** A2.11 y A3.3 (en revisión).

### 2026-11-14 — A2.16: pedotransferencia de Saxton y Rawls verificada contra el artículo (Mafer)

- **Archivos:** nuevos `datos/catalogos/saxton_rawls.py` y `test_saxton_rawls.py`; `datos/catalogos/README.md`; `docs/14` (tablero) y `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** `retencion(arena, arcilla, materia_organica)` calcula θsat, θFC, θWP y TAW (ecuaciones [1] a [5] de la Tabla 1) y `agua_pedotransferencia(...)` arma el objeto `agua` del contrato `suelo` (`tawMmPorM`, `metodoTaw`, `retencion`, todo `SUPUESTO`). Si falta una entrada o cae fuera del rango del artículo, `NO_EVALUABLE` con motivo, sin número por defecto. Falta que Eduardo la conecte a `/api/suelo` (la API todavía no obtiene la materia orgánica).
- **Verificación:** coeficientes copiados de la Tabla 1 del artículo (PDF de Saxton y Rawls 2006 bajado por Mafer) y reproducida la **Tabla 3** (12 clases texturales, 2.5 %w de materia orgánica): diferencia máxima 0.5 puntos de humedad, conductividad y densidad también coinciden. Cierra el `[VERIFICAR]` de la entrada de las decisiones de suelo.
- **Hallazgo:** arena y arcilla entran como fracción y la **materia orgánica como porcentaje (2.5 para 2.5 %)**, sin dividir entre 100. Una implementación de código abierto (`pedotri`) la divide entre 100 y falla la Tabla 3 (saturación hasta 11 puntos abajo, conductividad 74 %). Las otras dos que se compararon (`rcropmod`, `pedon`) coinciden con el artículo. El carbono orgánico de SoilGrids se convierte a materia orgánica con el factor 1.724, que hay que citar.
- **Límites del artículo:** se derivó sin muestras con materia orgánica mayor a 8 %w ni arcilla mayor a 60 %w; fuera de ese rango no se extrapola. Densidad normal, sin grava ni salinidad.
- **Fuente / evidencia:** Saxton, K. E. y Rawls, W. J. (2006), Soil Sci. Soc. Am. J. 70(5): 1569-1578, doi:10.2136/sssaj2005.0117, Tablas 1 y 3. `python -m unittest discover -s datos/catalogos`: 9 pruebas; salida validada contra `contratos/suelo.schema.json` (`agua`).
- **Decisiones afectadas:** A2.16 (parte de datos y método hecha; integración en la API pendiente de Eduardo).

### 2026-11-14 — A0.6: calendario de Isla cargado desde SIAP e INIFAP (Mafer)

- **Archivos:** nuevos `datos/catalogos/calendario-isla.json` y `datos/catalogos/fuentes/siap_isla_2021_2025.csv`; `generar.py` y `validar.mjs` (valida el calendario); `README.md` de catálogos; `docs/04` (SIAP), `docs/13` y `AgroVault/Compartido/Pendientes.md` (V-20).
- **Cambio:** el calendario va en un archivo con la forma del contrato `calendario-local` (0.5.0), no en el catálogo de cultivos. Por cultivo y temporada, la ventana con fuente y la presencia en SIAP 2021-2025 (calculada desde el CSV). Con ventana: maíz PV (1 jun-15 jul, INIFAP, DDR San Andrés Tuxtla), maíz OI (nov-dic) y frijol OI (20 sep-20 oct), estos dos de la Agenda Técnica de Veracruz (recomendación estatal). Sin ventana, `NO_EVALUABLE` con motivo: frijol PV, chile y calabaza.
- **Hallazgo:** SIAP no registra calabaza en Isla (`no_registrado`); se muestra en la demo como no recomendable (decisión de Mompin). SIAP no tiene API: es un CSV por año, anotado en `docs/04`.
- **Fuente / evidencia:** CSV de cierre agrícola municipal de SIAP y los PDF de INIFAP citados en `datos/catalogos/README.md`; consultado el 14/11/2026.
- **Decisiones afectadas:** V-20 cerrado (calendario cargado); la zona demo de 13 pasa a verificada.

### 2026-11-14 — A4.2 ranking, contratos 0.6.0 en el motor y escenarios con el paquete de demo (Mompin)

- **Archivos:** `web/src/motor/ranking.ts` (nuevo), `motor.ts`, `balance.ts`, `escenarios.ts`, `protocolo.ts`, `cliente.ts`, `index.ts`, `tipos.ts`; pruebas `ranking.test.ts` y `c2.test.ts`; se borra el fixture propio `web/src/motor/pruebas/datos/power-isla-2006-2025.json` (las pruebas usan `datos/demo/respuestas/`); `docs/05`, `docs/13`, `docs/14`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **A4.2:** criterio B (puntaje compuesto por escenario, robustez = peor puntaje, arrepentimiento minimax, desempate por promedio) con respaldo automático A cuando solo el pilar hídrico tiene número, que es el caso hasta A3.7. Normalización definida en A4.2 (doc 05, paso 7): déficit hídrico = fracción de la demanda cubierta; compatibilidad = fracción de siembras en ventana; protección del suelo = 1 − índice de erosión; calor y aporte indirecto son complementarios y quedan fuera del puntaje. Pesos iguales `SUPUESTO` si no hay pesos del usuario ni con fuente. Las rotaciones `EXPLORATORIO` no reciben posición.
- **Exceso de agua:** se calcula y se expone (`excesoTotalMm`, `excesoMm` por celda; los días con exceso van en la evidencia de la tarjeta y en `ResultadoMotor.exceso`, porque el contrato no tiene campo para ellos). No entra al ranking hasta que el equipo lo decida.
- **Contratos 0.6.0:** el motor llena `seleccion.lluviaTemporadasMm` (PV, OI y total con la fuente SIAP) y deja `etapa: null` en los registros sin parámetros del cultivo.
- **Cambio de escenario habitual:** con la ventana del paquete de demo (2005-10-01 a 2025-12-31: 20 años agrícolas) el habitual pasa de **2016 a 2008**; seco 2023 y lluvioso 2024 no cambian. Con 20 años el p50 es el punto medio de los dos años centrales (2016: 1 912.0 mm; 2008: 1 932.1 mm), que empatan, y la regla de desempate elige el más antiguo. Reemplaza el "habitual 2016" de la entrada anterior.
- **Evidencia de C2:** con `suelo.json` del paquete (franco arcillo arenoso) la rotación es `NO_EVALUABLE` (TAW hasta A2.16); con el selector manual declarado (franco) da resultados por celda y por rotación conformes al contrato y el ranking A de tres rotaciones. 59 pruebas en verde.

### 2026-11-14 — A2.5, A2.6 y A2.7: motor de agua y escenarios (Mompin)

- **Archivos:** `web/src/motor/` (escenarios, ET0, cultivo y Kc, cubeta, suelo, estados, motor, protocolo y Web Worker, cliente; pruebas en `web/src/motor/pruebas/` con un fixture real de POWER), `web/package.json` (vitest 5.1.0 y script `test`), `docs/05`, `docs/04`, `docs/13`, `docs/14`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **Decisión `[DECIDIDO]` (Mompin, 14/11) sobre los escenarios:** el percentil p10 / p50 / p90 se calcula sobre la **lluvia de las temporadas de siembra PV y OI**, no del año calendario. **Ventanas:** año agrícola de SIAP, con OI = siembras de octubre de *t*-1 a marzo de *t* y PV = siembras de abril a septiembre de *t*; la lluvia del año *t* es la suma del 1 de octubre de *t*-1 al 30 de septiembre de *t*. Fuente: SIAP, *Normatividad Técnica para la Generación de Estadística Básica Agropecuaria 2022*, p. 10, p. 20 (Cuadro No. 1) y p. 46. **Percentil:** definición 7 de Hyndman y Fan (1996), sobre los años con las dos temporadas completas (mínimo 10, doc 04). **Desempate:** año más cercano al percentil; si dos quedan a la misma distancia (menos de 0.05 mm) gana el más antiguo, y siempre se declara el segundo más cercano. La serie del escenario cubre los 18 meses del año agrícola de SIAP (oct *t*-1 a mar *t*+1).
- **Resultado con datos reales** (POWER, celda de la parcela demo, 2006-2025): seco 2023, habitual 2016, lluvioso 2024 (2025 queda a 2 mm de 2024).
- **Cambio (A2.6):** ET0 Penman-Monteith FAO-56 desde POWER (Hargreaves si faltan variables, ET0 de Open-Meteo si viene), Kc por la curva FAO-56 y cubeta FAO-56 cap. 8 con TAW del suelo y p del cultivo. Cada ciclo se simula en su temporada dentro del año agrícola del escenario (A2.8); las fechas de `resultado-celda` son las del plan.
- **Cambio (A2.7):** pilar de déficit hídrico y estados de evaluabilidad (`ERROR_DATOS` > `NO_EVALUABLE` > `EXPLORATORIO` > `RESPALDO_HISTORICO` > `EVALUABLE`), con salida validada contra `resultado-rotacion` y `resultado-celda`.
- **Supuestos declarados en el resultado:** cada ciclo arranca a capacidad de campo (FAO-56 cap. 8) hasta que A2.16 dé θsat y θFC para convertir GWETROOT (la conversión ya está en el motor); sin escurrimiento por pendiente hasta A3.7; Kc sin ajuste climático (falta la altura del cultivo); `estadoPlanta` nunca `podrida` (sin umbral con fuente).
- **Fuente / evidencia:** 45 pruebas en verde (`cd web && npm test`), entre ellas las pruebas 1 a 5 de doc 05 (la parte de erosión de la 2 queda como `todo` para A3.7) y los ejemplos 2, 3, 8 y 18 de FAO-56.
- **Decisiones afectadas:** doc 05, paso 1 (de `[PROPUESTA]` a `[DECIDIDO]`); doc 04, escenarios; doc 13, fila nueva "Escenarios (A2.5)". Pedido a A2.4: que la serie de la demo empiece el 2005-10-01 para tener 20 años agrícolas.

### 2026-11-14 — API: suelo con la tabla de A1.6 y CORS para el front (Eduardo)

- **Archivos:** `api/app/textura.py`, `api/app/servicios.py`, `api/app/modelos.py`, `api/app/config.py`, pruebas, `api/README.md`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** `GET /api/suelo` toma el grupo y el TAW de `datos/catalogos/suelos.json` (Mafer, A1.6) cuando el archivo esta presente, en vez de mi propuesta de agrupamiento (que difería: ahora `franco_arenoso` es `franco` y `franco_arcillo_arenoso` es `arcilloso`). CORS acepta `127.0.0.1:5173` ademas de `localhost`, porque `npm run dev` de balam sirve en `127.0.0.1`.
- **Hallazgo para el equipo:** el suelo de la zona de prueba de Isla (franco arcillo arenoso) y otras zonas medias caen en clases **sin fila en FAO-56 Tabla 19**, asi que su TAW es `NO_EVALUABLE`. Sin TAW el motor no puede hacer el balance de agua con el suelo del mapa; solo con el selector manual (arena franca, franco, arcilla). No lo resolvi: es una decision agronomica (ver Pendientes).
- **Fuente / evidencia:** probado con el `suelos.json` real de la rama `Mafer`; 39 pruebas.

### 2026-11-14 — A2.13 proxima temporada aproximada, parte del backend (Eduardo)

- **Archivos:** `api/app/proxima.py`, `api/app/rutas/proxima.py`, cliente estacional en `api/app/clientes/openmeteo.py`, pruebas, `docs/14`.
- **Cambio:** `GET /api/proxima-temporada?lat&lon` entrega el contrato `proxima-temporada`: banda p10 a p90 por mes, 7 meses, `esPrediccion: false`, sin cifra unica.
- **Metodo (decision mia, a confirmar por el equipo):** el pronostico estacional de Open-Meteo no entrega miembros ni dispersion en las variables probadas, asi que no se usa el ensamble para el ancho. La banda es la distribucion historica de cada mes (20 anios de POWER) desplazada por la anomalia mensual de SEAS5. Respaldo: la misma distribucion sin desplazar. No incluye tendencia (advertencia `SIN_TENDENCIA`). La anomalia es respecto de ECMWF y se suma a la climatologia de POWER, que no coinciden en magnitud (advertencia).
- **Fuente / evidencia:** `monthly=precipitation_anomaly,temperature_2m_anomaly&forecast_days=210&models=ecmwf_seas5` probado en vivo (7 meses); 36 pruebas, el documento completo se valida contra `contratos/proxima-temporada.schema.json`.
- **Pendiente:** la parte del motor (A2.13, Mompin) y la interfaz (A4.9, balam). V-21 queda con evidencia: 7 meses.

### 2026-11-14 — A2.14 textura y pH estimados (Eduardo)

- **Archivos:** `api/app/clientes/isric.py`, `api/app/textura.py`, `api/app/rutas/suelo.py`, pruebas, `docs/04` y `docs/14`.
- **Cambio:** `GET /api/suelo?lat&lon` devuelve el contrato `suelo` con textura (clase USDA y fracciones) y pH de 0 a 30 cm desde SoilGrids por WCS, siempre `SUPUESTO`. `agua.tawMmPorM` queda `NO_EVALUABLE` hasta la tabla de A1.6. Sin dato responde 503 y el front usa el selector manual.
- **Fuente / evidencia:** WCS de ISRIC probado en vivo (Isla: franco arcillo arenoso, pH 5.4; datos reales guardados en `datos/pruebas-apis/respuestas/`); conversion de unidades de la FAQ de ISRIC; clase textural con el triangulo USDA (probado sobre las 5 151 combinaciones posibles).
- **Pendiente de otros:** el grupo arenoso/franco/arcilloso del selector es una propuesta mia y debe coincidir con la tabla de suelos de Mafer (A1.6).
- **Decisiones afectadas:** V-23 (el WCS de ISRIC responde; OpenLandMap queda de respaldo sin implementar).

### 2026-11-14 — A1.3, A2.1, A2.2 y A2.3: API FastAPI (Eduardo)

- **Archivos:** `api/` (app, tests, README, cliente TypeScript generado), `docs/14-CRONOGRAMA.md` (marcas).
- **Cambio:** `GET /health`, `GET /api/clima` (NASA POWER con cache y respaldo Open-Meteo), `POST /api/elevacion` (Terrarium con respaldo Open-Meteo y pendiente por celda), `GET /api/cultivos` (lee `datos/catalogos/cultivos.json`). OpenAPI exportado y tipos TS generados en `api/cliente/`.
- **Decisiones tomadas dentro de mi carril, a confirmar por el equipo:** (1) la cache usa el centro de la celda MERRA-2 como clave (verificado: puntos de la misma celda dan la misma serie); (2) `/api/clima` devuelve la serie del periodo y **no** elige escenarios (eso es A2.5, del motor); (3) la elevacion sale de Terrarium z14 y no de Open-Meteo (90 m), porque con celdas de unos 20 m el DEM de 90 m daria un plano; el respaldo es Open-Meteo; (4) la respuesta de clima es una `SerieClima` con el mismo `dia` que `clima-escenario`, pero no esta en `contratos/`: se pide a Mompin si debe entrar.
- **Fuente / evidencia:** 21 pruebas en `api/tests/` (respuestas reales de A0.7, validadas contra los schemas de `contratos/`) y una corrida en vivo: 20 anios de POWER en 1.8 s, 18 ms desde cache.
- **Decisiones afectadas:** V-08 (propuesta: Terrarium por defecto), V-22 (el clima pasa por el backend).

### 2026-11-14 — A0.4 servidor en el droplet (Eduardo)

- **Archivos:** `AgroVault/Compartido/Servidor.md`, `docs/14-CRONOGRAMA.md` (marca A0.4). Cambios en el droplet, no en el repo.
- **Cambio:** usuario `agrohive`, clon del repo en `/opt/agrohive/repo`, servicio `agrohive-api` (uvicorn en `127.0.0.1:8010`), server block de nginx propio y certificado de Let's Encrypt para `64-23-143-102.sslip.io`. Solo hay un `/health` provisional hasta A1.3.
- **Fuente / evidencia:** `https://64-23-143-102.sslip.io/health` responde 200; `mediworks.mx` sigue respondiendo 200.
- **Decisiones afectadas:** V-15, V-16, V-17 (opción 1 de `docs/13`, `sslip.io`, funciona). Siguen abiertas hasta que el equipo las cierre.

### 2026-11-14 — A0.7 pruebas reales de APIs (Eduardo)

- **Archivos:** `docs/04-DATOS-Y-METODO.md`, `docs/14-CRONOGRAMA.md` (marca A0.7), `datos/pruebas-apis/`, `AgroVault/Compartido/APIs.md` y `Pendientes.md`. Editado con aviso a Mafer (dueña de `docs/`).
- **Cambio:** se anotan los resultados de llamadas reales a NASA POWER, Open-Meteo (archivo, elevación, estacional) y Terrarium. Se cambian varios `[VERIFICAR]` de 04 por el resultado probado.
- **Fuente / evidencia:** `datos/pruebas-apis/LEEME.md` y `respuestas/`, consulta del 2026-11-14, coordenada de prueba 18.03, -95.53 (no es la parcela demo).
- **Decisiones afectadas:** V-06 (`GWETROOT` en AG, radiación en MJ/m²/día), V-08 (Open-Meteo Elevation y Terrarium responden), V-21 (7 meses con `forecast_days=210`), V-22 (GET simple con CORS abierto, backend sigue siendo el camino). Siguen abiertas hasta que el equipo las cierre en 11 y 13.

## Historial

### 2026-11-14 (noche) — Contratos 0.9.0 (rama `contratos-nulos`): regla de pilar sin dato para todos los pilares `[DECIDIDO]`

- **Archivos:** `contratos/resultado-rotacion.schema.json`, versión en ejemplos e inválidos, 5 casos inválidos nuevos, README; `13`.
- **Cambio y motivo:** Mompin extendió a todos los pilares la regla del pilar de exceso. Si el pilar es `NO_EVALUABLE` o `ERROR_DATOS`, el motivo es obligatorio y todos sus indicadores van en `null`:
  - `deficitHidrico`: `proporcionDemandaNoCubierta`, `diasDeficit`, `diasDeficitEtapasSensibles`, `deficitTotalMm` y `excesoTotalMm`.
  - `compatibilidadCiclo`: `siembrasFueraDeVentana`.
  - `proteccionSuelo`: `indiceErosionRelativo` y `diasSueloDesnudo`.
  - `riesgoCalor`: `diasEstresCalor`.
  - `aporteIndirecto`: `incluyeLeguminosa` y `especiesDistintas`.
  - `excesoHidrico`: ya la tenía.
  En `resultado-celda` la regla ya regía para los registros, así que no cambia. Es más estricto y puede rechazar salidas del motor que hoy pasan: va en la rama `contratos-nulos`, que el motor mezcla y ajusta antes de integrarse a `main`. Los tipos TS no cambian.
- **Fuente / evidencia:** decisión transmitida por la sesión maestra. `npm test` 68/68.
- **Decisiones afectadas:** ninguna más.

### 2026-11-14 (noche) — Escenario "próxima temporada" por rotación `[DECIDIDO]`; contratos 0.8.0 (compatible)

- **Archivos:** `contratos/resultado-rotacion.schema.json`, ejemplo, 5 casos inválidos, tipos, README; `13`; vault.
- **Cambio y motivo:** Mompin decidió evaluar cada rotación en una "próxima temporada" con años análogos reales, como `EXPLORATORIO` y sin ranking. Se agrega `proximaTemporada` (opcional) con la propuesta del motor: estado (`EXPLORATORIO`, `NO_EVALUABLE` o `ERROR_DATOS`), `esPrediccion: false`, aviso, horizonte, criterio de análogos, ciclos evaluados y fuera, años análogos con sus pilares de déficit y exceso, rango entre análogos y fuentes. En `NO_EVALUABLE` o `ERROR_DATOS` el motivo es obligatorio, no hay análogos y el rango va en `null`.
- **Fuente / evidencia:** propuesta del motor transmitida por la sesión maestra. `npm test` 63/63.
- **Decisiones afectadas:** ninguna cambia; el ranking B sigue usando solo los tres escenarios históricos.

### 2026-11-14 (noche) — Pilar de exceso de agua `[DECIDIDO]`; contratos 0.7.0 (compatible)

- **Archivos:** `contratos/resultado-rotacion.schema.json`, ejemplos, casos inválidos, tipos, README; `13`; vault.
- **Cambio y motivo:** Mompin decidió sumar un pilar de exceso de agua al ranking B, según la propuesta del motor. Se agrega `$defs.pilarExcesoHidrico` con `excesoTotalMm`, `diasExceso` y `fraccionLluviaPercolada`. En `NO_EVALUABLE` o `ERROR_DATOS` todo va en `null` y el motivo es obligatorio. También se suma `excesoHidrico` a los pilares por escenario, a los pesos de `ponderacion` y a `pilaresExcluidos`. Todo es opcional: lo que validaba sigue validando. Nota: los otros pilares no tienen esa regla condicional; se agregó solo a este, como se pidió.
- **Fuente / evidencia:** FAO-56 (Allen et al., 1998), capítulo 8, "Soil water balance", subsección "Deep percolation (DP)", ecuación 88: DPi = (Pi - ROi) + Ii - ETc,i - Dr,i-1 ≥ 0, verificada en https://www.fao.org/4/x0490e/x0490e0e.htm el 14/11. La normalización 1 - fracción queda como `SUPUESTO`. `npm test` 58/58.
- **Decisiones afectadas:** ranking B (un pilar más).

### 2026-11-14 (noche) — Contratos 0.6.0 (compatible): lluvia por temporadas y etapa nula

- **Archivos:** `contratos/clima-escenario.schema.json`, `contratos/resultado-celda.schema.json`, ejemplos, casos inválidos, tipos, README; versión en la vault.
- **Cambio y motivo:** pedido del motor. (1) `seleccion.lluviaTemporadasMm` {pv, oi, total, fuente}, opcional: la lluvia del año agrícola con la que se elige el escenario (ventanas PV y OI de SIAP), separada de `lluviaAnualMm`, que sigue siendo la del año calendario. (2) `etapa` puede ser `null` cuando no hay parámetros del cultivo; en ese caso el registro no puede ser `EVALUABLE` y lleva motivo (antes el motor ponía `siembra`). Las dos cosas amplían el contrato: lo que ya validaba sigue validando.
- **Fuente / evidencia:** `npm test` 55/55; `pytest` en `api/` 39; `validar.mjs` de los catálogos; `npm test` (45) y `npm run build` (incluye `tsc --noEmit`) en `web/`.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — A1.1 `[HECHO]`; A2.16 asignada a Mafer

- **Archivos:** `14` (fila de A1.1, fila de A2.16 y tablero), `AgroVault/Compartido/{Pendientes,Resumen}.md`.
- **Cambio y motivo:** decisiones de Mompin. A1.1 pasa a `[HECHO]` porque `main` está en verde y el equipo revisó los contratos en persona. A2.16 (TAW por pedotransferencia de Saxton y Rawls, 2006) la hace Mafer. Se actualizó además el estado del repo en `Resumen.md`, que todavía decía que no había código en `web/` ni en `api/`.
- **Fuente / evidencia:** decisión del evento transmitida por la sesión maestra.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — `main` de vuelta en verde tras contratos 0.4.0 y 0.5.0; regla de cambios de contrato

- **Archivos:** `api/app/{proxima,modelos,servicios}.py`, `api/tests/test_proxima.py`, `api/openapi.json`, `api/cliente/api.d.ts` (Eduardo); `web/src/ui/demo.ts` (balam); `datos/catalogos/{generar.py,cultivos.json,README.md}` (Mafer); `AGENTS.md`, `AgroVault/Compartido/Reglas.md`.
- **Cambio y motivo:** `main` (3a9a697) quedó en rojo porque los contratos 0.4.0 y 0.5.0 entraron sin ajustar lo que dependía de ellos. Con autorización de Mompin y aviso a cada dueño, se hicieron cambios mínimos:
  - **API (Eduardo):** la próxima temporada se recorta a 6 meses (`HORIZONTE_MESES`), `/api/suelo` agrega `agua.metodoTaw` (`tabla_fao56` con la fuente de la tabla) cuando el TAW es evaluable, y dos aserciones de prueba pasan de 7 a 6 meses. Se regeneraron el OpenAPI y el cliente.
  - **Web (balam):** el tipo de los ciclos del ejemplo en `demo.ts`.
  - **Catálogos (Mafer):** sin `ventanasSiembra`. Las tres ventanas estaban en `NO_EVALUABLE`, así que no se perdió ningún dato; queda anotado en el README.
  - **Regla nueva:** ningún cambio de contrato que rompa algo entra a `main` sin las cuatro verificaciones en verde.
- **Fuente / evidencia:** `npm test` en `contratos/` 52/52; `pytest` en `api/` 39 pruebas; `validar.mjs` de los catálogos y `tsc --noEmit` en `web/`, en verde.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — `.vscode/` fuera del repo `[DECIDIDO]`

- **Archivos:** `.gitignore`; se dejan de versionar `.vscode/tasks.json`, `.vscode/settings.json`, `.vscode/agrohive.code-snippets` y `.vscode/mascota/clawd.py`.
- **Cambio y motivo:** decision de Mompin. `tasks.json` ejecutaba la mascota al abrir la carpeta en VS Code (`runOn: folderOpen`): codigo que corre solo en la maquina de todos. La configuracion de editor es personal. El repo sigue publico.
- **Efecto:** al hacer pull, git borra esos archivos de las copias locales. Quien los quiera conservar los recupera del historial (`git show dfd4d40:.vscode/mascota/clawd.py`) y quedan ignorados.

### 2026-11-14 (noche) — Despliegue unico de main cd3fed2 y API a contratos 0.9.0 (Eduardo)

- **Despliegue (pedido de Mompin #36 y #46):** el droplet corre `main` en `cd3fed2`: API con OpenLandMap, Saxton-Rawls y el paquete de demo; front con la escena 3D y el Worker del motor, construido en el propio droplet (`npm ci` + `npm run build`, node 20.20.1) y copiado a `/var/www/agrohive-web` con respaldo del anterior; `rasterio` 1.5.2 instalado sin problemas (probado antes en un entorno temporal). nginx sin cambios.
- **Verificado desde fuera:** `/` 200 con el bundle nuevo, `/health` trae `commit: cd3fed2`, `/api/suelo` de Isla da TAW 122.3 mm/m por Saxton-Rawls con ISRIC y OpenLandMap, `/api/proxima-temporada` da 6 meses, `mediworks.mx` sigue en 200.
- **Cambio en la API:** `VERSION_CONTRATO` pasa a 0.9.0 (el contrato actual; `/health` del servidor dice 0.7.0 hasta que este cambio llegue a `main`).
- **Incidente:** la segunda sesion de Eduardo anuncio un despliegue paralelo cuando el mio ya iba a la mitad; se avisó por el buzon y el servidor quedo sin cambios de ella. Regla para la proxima: una sola sesion despliega y anuncia antes por el buzon.

### 2026-11-14 (noche) — API a contratos 0.8.0 y cronograma al dia (Eduardo)

- **Archivos:** `api/app/config.py`, `api/tests/test_basico.py`, `docs/14`, vistas del cronograma.
- **Cambio:** `VERSION_CONTRATO` de la API pasa a 0.8.0. Los schemas que usa la API (`serie-clima`, `suelo`, `proxima-temporada`, `cultivo`, `parcela`) no cambiaron en 0.8.0 (cambia `resultado-rotacion`, del motor), asi que no hay otro ajuste.
- **Cronograma:** A4.8 pasa a `[EN CURSO]` (sondeo de viabilidad de SMAP/GPM por la segunda sesion de Eduardo, sin tocar el repo). Estado: 22 de 56 hechas (39 %); Eduardo 9 de 15, Mompin 10 de 14, Mafer 3 de 12, balam 0 de 16.
- **Verificaciones:** api 60, contratos 63/63, catalogos y unittest de Mafer, build de web ok. `npm test` de web falla 2 pruebas del motor y la escena que afirman `NO_EVALUABLE` para el suelo de Isla: las actualiza Mompin en el merge atomico con mi `suelo.json`.

### 2026-11-14 (noche) — A4.6: cliente de la API para el front (Eduardo, con balam)

- **Archivos:** `web/src/api/` (`cliente.ts`, `usarApi.ts`, `cliente.test.ts`, `README.md`), `docs/14`. Carpeta nueva, sin tocar `web/src/ui`, `paginas`, `motor` ni `escena`.
- **Cambio:** funciones tipadas para `/api/clima`, `/api/suelo`, `/api/proxima-temporada`, `/api/cultivos`, `/api/elevacion` y `/health`, que devuelven `{ok, datos}` o `{ok: false, error: ERROR_DATOS}` y nunca lanzan; hook `usarApi` con los estados de `<DataState>`; `VENTANA_ESTANDAR` (2005-10-01 a 2025-12-31). Los datos usan `contratos/tipos`; el cliente generado de OpenAPI solo describe `/api/elevacion` (regla del 14/11).
- **Evidencia:** 10 pruebas nuevas con `fetch` simulado (exito, 503, 422, red caida, cuerpo no JSON, tiempo agotado, cancelacion, POST de terreno); typecheck en verde.
- **Pendiente:** conectar las paginas de balam y el motor de Mompin. A4.6 queda tambien en mi fila del tablero (Mompin la asigno a los dos); la fila de Mompin sigue listandola.
- **Nota:** `npm test` en `web/` falla hoy 2 pruebas del motor y la escena que afirman `NO_EVALUABLE` para el suelo de Isla: es el cambio atomico que Mompin integra con mi `suelo.json`.

### 2026-11-14 (noche) — A2.16 conectada: TAW y retencion en /api/suelo; /health con commit (Eduardo)

- **Archivos:** `api/app/pedotransferencia.py` (nuevo), `api/app/servicios.py`, `api/app/modelos.py`, `api/app/config.py`, `api/app/main.py`, pruebas, `datos/demo/` (paquete regenerado), `api/README.md`.
- **Cambio:** `GET /api/suelo` devuelve `agua.tawMmPorM`, `metodoTaw` y `retencion` por Saxton y Rawls (2006), usando `datos/catalogos/saxton_rawls.py` de Mafer sin copiarlo. Para la parcela demo (franco arcillo arenoso, que FAO-56 Tabla 19 no cubre): **TAW 122.3 mm/m**, thetaSat 0.454, thetaFC 0.293, thetaWP 0.171 m3/m3, con arena 48.4 %, arcilla 25.7 % y materia organica 2.79 % (de 16.2 g/kg de carbono organico de ISRIC x 1.724). `suelo.json` del paquete de demo ya los trae, validado contra `suelo.schema.json`.
- **Decisiones mias, a confirmar:** (1) Saxton-Rawls va **antes** que la tabla FAO-56 porque da la retencion que el motor necesita para GWETROOT; la tabla queda de respaldo; (2) con estimacion EXPLORATORIA (pixeles a mas de 1 km) o sin carbono organico el TAW es NO_EVALUABLE con su motivo; (3) el factor 1.724 (MO = 1.724 x C organico) **cita cerrada el 14/11**: Batjes y van Oostrum (2023), *WoSIS Procedures Manual*, ISRIC Report 2023/01, p. 25 ("soil organic matter contains 58% C hence the commonly used conversion factor of 1.724 ... may be up to 2.0 for topsoils and even 2.5 for subsoils"; leida del PDF, https://files.isric.org/public/documents/WoSIS_analytical_method_descriptions_2023.pdf). La atribucion a van Bemmelen (1890) es la convencional; hay un articulo de 2020 que la discute. **Sensibilidad en Isla:** con 1.724, 2.0 y 2.5 la materia organica es 2.79, 3.24 y 4.05 % y el TAW 122.3, 124.1 y 127.4 mm/m (+4 % en el extremo). Se cito la fuente de ISRIC y no la hoja del NRCS (que menciona 1.72) porque esa no se pudo abrir.
- **Tambien:** `VERSION_CONTRATO` de la API pasa a 0.7.0 y `/health` incluye `versionContrato` y `commit` (pedido de Mompin #42).
- **Pendiente:** un solo PR con A2.15 + esta conexion + paquete regenerado; Mompin integra y yo despliego una vez.

### 2026-11-14 (noche) — A2.15: OpenLandMap en /api/suelo (Eduardo)

- **Archivos:** `api/app/clientes/openlandmap.py`, `api/app/servicios.py`, `api/requirements.txt` (rasterio), pruebas, `api/README.md`, `AgroVault/Compartido/APIs.md` y `Pendientes.md`, `datos/pruebas-apis/respuestas/openlandmap_estimacion.json`.
- **Cambio:** `GET /api/suelo` devuelve en `estimaciones` las dos fuentes (ISRIC 250 m y OpenLandMap 30 m) y `estimacionUsada` (ISRIC por defecto; OpenLandMap si ISRIC no responde, con la advertencia `SUELO_ISRIC_NO_DISPONIBLE`). Si OpenLandMap falla, el endpoint sigue con ISRIC y `OPENLANDMAP_NO_DISPONIBLE`.
- **Fuente / evidencia:** lectura real del 14/11 en (-95.53, 18.03): OpenLandMap da arcilla 28 %, arena 48 %, limo 24 % (la **misma clase** que ISRIC, franco arcillo arenoso), pH 5.9 contra 5.4 de ISRIC y carbono 8.2 g/kg contra 16.2 g/kg de ISRIC (ambos 0-30 cm): **coinciden en textura y difieren en pH y sobre todo en carbono (el doble)**, dato relevante para A2.16 (Saxton-Rawls usa materia organica).
- **Decision mia, a confirmar:** ISRIC sigue como estimacion usada (es la verificada con su documentacion); cambiar a OpenLandMap es una linea.
- **Ojo para el despliegue:** nueva dependencia `rasterio` (rueda con GDAL); la primera consulta en frio tarda unos 12 s.

### 2026-11-14 (noche) — Marcador de chamba en el buzon de quejas (Eduardo, pedido de Mompin #28)

- **Archivos:** `herramientas/cronograma.py`, `herramientas/quejas-ia/QUEJAS.md` (bloque entre marcadores) y `README.md`.
- **Cambio:** `cronograma.py` ahora tambien escribe, al inicio de `QUEJAS.md`, un "Marcador de chamba": avance por persona ponderado por esfuerzo (XS=1, S=2, M=3, L=5), hechas, en curso y pendientes, ordenado de mas a menos, con una linea por lugar. Reutiliza el parser de `docs/14`; corre cada vez que se regenera el cronograma y `--revisar` tambien lo vigila.
- **Regla de la casa:** las lineas solo usan numeros reales del tablero y hablan del trabajo, no de la persona.

### 2026-11-14 (noche) — A2.4: paquete de demo conforme a contratos (Eduardo)

- **Archivos:** `datos/demo/` (generador, cache, `respuestas/`, manifiesto y LEEME), `api/app/servicios.py`, `api/app/proxima.py`, pruebas, `api/README.md`, `docs/14`.
- **Cambio:** el paquete se regenera con la **ventana `2005-10-01` a `2025-12-31`** que pidio el motor (Mompin, #27): 20 anios agricolas completos. Es `servicios.VENTANA_ESTANDAR` y tambien la usa la proxima temporada. El generador llama a la API por dentro, **valida las 4 respuestas contra `contratos/`** y guarda el cuerpo de cada una en `datos/demo/respuestas/` para que el motor las lea directo, ademas de la cache. Sin red: `/api/clima`, `/api/suelo` y `/api/proxima-temporada` responden 200 (probado con un proxy inexistente); con otro periodo, 503.
- **Evidencia para C2:** el selector de escenarios del motor (`seleccionarEscenarios`) corre con `respuestas/serie-clima.json` y devuelve `EVALUABLE`: seco 2023, **habitual 2008**, lluvioso 2024 (Mompin reporto 2016 como habitual; la diferencia viene de la ventana, que ahora incluye oct-dic 2005, a revisar por el motor).
- **Zona:** Isla (INEGI 30/077, A0.6 de Mafer, que da el municipio y no coordenadas). La parcela sigue siendo ficticia (2 ha); su centroide `(-95.53, 18.03)` coincide con la localidad de Isla (`VERIFICAR`).
- **A avisar:** el front debe pedir esas fechas exactas; la cache de POWER y suelo cambio de clave, asi que el paquete anterior (ventana 2006) ya no sirve.

### 2026-11-14 (tarde-noche) — API: contratos 0.5.0, GWETROOT y revision de Mompin (Eduardo)

- **Archivos:** `api/` (modelos, servicios, clientes, rutas, pruebas, OpenAPI y cliente TS), `datos/pruebas-apis/`, `docs/14`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio, siguiendo la revision de Mompin (mensaje #4):** (1) las respuestas de clima, suelo, proxima temporada, elevacion y cultivos se validan **completas** contra los schemas de `contratos/` (`serie-clima`, `suelo`, `proxima-temporada`, `cultivo`, `parcela`); (2) modelos mas estrictos: `esEjemplo`, `etiqueta` y `estado` obligatorios y `clase` de textura limitada a las 12 clases; (3) los 503 devuelven `{estado: ERROR_DATOS, motivo}` como declara el OpenAPI, ya no `{detail}`; (4) `/api/cultivos` tiene `response_model`; (5) ISRIC con pixeles a mas de 1 km sale `EXPLORATORIO`, no `EVALUABLE`; (6) V-06: POWER pide `GWETROOT` y la API lo devuelve como `humedadRaizFraccionSat` (sin convertir) con el metadato `humedadSuelo`; (7) `/api/suelo` devuelve `estimaciones` (hoy solo ISRIC, con carbono organico en g/kg) y `estimacionUsada`.
- **Fuente / evidencia:** GWETROOT real de POWER (fraccion 0 a 1, `datos/pruebas-apis/respuestas/power_ag.json`); carbono organico de ISRIC `soc` (dg/kg dividido entre 10, FAQ de ISRIC); 51 pruebas en verde.
- **Cambio de comportamiento a avisar:** los 503 ya no traen `detail`; la clave de cache de POWER y de suelo cambio (`power_v2`, `suelo_isric_v2`), asi que el paquete de demo anterior no sirve y hay que regenerarlo.
- **Pendiente mio:** regenerar el paquete de demo (A2.4) con la zona real de Mafer y el periodo `2005-10-01` a `2025-12-31` pedido por Mompin, y el cliente de OpenLandMap (A2.15).

### 2026-11-14 (noche) — Cronograma por persona y marcas al dia (Eduardo)

- **Archivos:** `herramientas/cronograma.py` (nuevo), `docs/14-CRONOGRAMA.md`, `docs/cronograma.html` (regenerado), `AgroVault/Compartido/Cronograma.md` (nueva), `AgroVault/Bienvenido.md`, `AgroVault/Compartido/Lectura.md`.
- **Cambio:** el cronograma ahora se ve por persona (Mompin, Eduardo, Mafer, balam) con estado por actividad, en tres vistas generadas desde las marcas de `docs/14`: una seccion nueva "Estado por persona", la pagina `docs/cronograma.html` (ya no filtra por R1 a R4 ni guarda marcas en el navegador) y una nota de Obsidian. El HTML dejo de tener datos propios: no se desfasa de `docs/14`.
- **Marcas puestas (verificadas):** A0.1 y A0.2 hechas (repo con `main` y 4 ramas; `docs/` en el repo); A1.4, A1.5 y A1.6 ya estaban marcadas por Mafer solo en el tablero y se copiaron a sus filas; A1.2 `[EN CURSO]` (build y rutas P0 a P3 verificados, falta el Worker del motor segun el README de balam); A5.4 y A5.8 `[BLOQUEADO]`.
- **Estado:** 11 de 54 hechas (20 %): Mompin 2, Eduardo 6, Mafer 3, balam 0. A0.3 queda sin responsable unico.
- **Pendiente de otros:** balam debe confirmar si A1.2 pasa a hecha cuando exista el Worker; Mafer, que `[HECHO]` de A1.4 a A1.6 ahora tambien esta en sus filas.

### 2026-11-14 (noche) — A2.4: paquete de demo sin internet (Eduardo)

- **Archivos:** `datos/demo/` (generador, manifiesto, cache y LEEME), `api/app/cache.py`, `api/app/clientes/terrarium.py`, `api/app/proxima.py`, `api/app/config.py`, pruebas, `api/README.md`, `docs/14`.
- **Cambio:** la API lee `datos/demo/cache/` cuando falta su cache local. Con el paquete responden sin red clima 2006-2025, elevacion, suelo y proxima temporada de la parcela demo (probado con la red forzada a fallar: 200 en milisegundos; sin paquete, 503). El pronostico estacional guarda ahora su fecha de consulta y, si esta vencido y no hay red, se sirve con la advertencia `ESTACIONAL_EN_CACHE` y su fecha real en `emitido`.
- **Limite:** la parcela es la de `contratos/ejemplos/parcela.ejemplo.json` (coordenadas ilustrativas cerca de Isla); los datos son reales para esa coordenada. Hay que regenerar con `datos/demo/generar.py` cuando A0.6 confirme la zona.
- **Fuente / evidencia:** 43 pruebas, incluidas las del paquete; generado el 2026-11-14 desde NASA POWER, ISRIC, Terrarium y Open-Meteo.
- **Pendiente:** A5.8 (capturas y demo completa con la red apagada) depende de que el front llame a la API (A4.6).

### 2026-11-14 (noche) — A4.7: front servido desde el droplet (Eduardo)

- **Archivos:** `api/despliegue/` (nginx, proxy y script), `AgroVault/Compartido/Servidor.md`, `docs/14`. Cambios en el droplet: `/var/www/agrohive-web`, `/etc/nginx/agrohive-proxy.conf` y el server block de AgroHive.
- **Cambio:** `https://64-23-143-102.sslip.io/` sirve el build de `web/` (esqueleto de balam, A1.2) y la API sigue en `/api/`, `/health` y `/docs` del mismo origen. No hace falta CORS para esa ruta.
- **Verificacion:** `/` 200 html, asset 200, `/health` y `/api/cultivos` 200, `mediworks.mx` sigue en 200; `nginx -t` antes de recargar y respaldo del bloque anterior en el droplet.
- **Pendiente:** la demo real depende de que el front llame a la API (A4.6, balam y Eduardo).

### 2026-11-14 (noche) — Calendario local, fecha elegida por el usuario y A2.8 `[DECIDIDO]`; contratos 0.5.0

- **Archivos:** `03`, `05` (paso 2), `06` (selector), `08`, `13`, `14` (A0.6, A2.8, A3.4); `contratos/` 0.5.0 (`cultivo`, nuevo `calendario-local`, `plan-siembra`, `resultado-rotacion`, `resultado-celda`, `comun.temporada`); vault.
- **Cambio y motivo:** decisiones de Mompin.
  1. Las ventanas de siembra dependen del lugar: salen del catálogo de cultivos y pasan a `calendario-local` (municipio con clave INEGI, cultivo, temporada PV/OI, ventana con fuente y presencia del cultivo en el lugar).
  2. La fecha de siembra la elige el usuario. El plan guarda el calendario usado (o "sin calendario local") y un `porQue` por ciclo para la interfaz.
  3. Un cultivo se puede mostrar sin recomendarlo en el lugar (caso: calabaza en Isla, que SIAP 2021-2025 no registra). Va en `cultivosNoRecomendados` en la rotación y en `noRecomendadoEnLugar` en la celda, con motivo y fuente; con eso la rotación no puede ser `EVALUABLE`. Los estados actuales no bastaban porque no llevan cultivo ni fuente.
  4. A2.8: opción (c) `temporada_tipica`, fija en el plan.
- **Fuente / evidencia:** decisión del evento transmitida por la sesión maestra. El caso de calabaza en Isla es un dato de SIAP que reportó el equipo; en los ejemplos aparece como ficticio. `npm test` pasa 52/52.
- **Decisiones afectadas:** A2.8 y V-20 (forma). **Cambio incompatible:** `datos/catalogos/cultivos.json` deja de validar hasta que se quite `ventanasSiembra`.

### 2026-11-14 (noche) — Decisiones de suelo, clima, pronóstico y servidor `[DECIDIDO]`; contratos 0.4.0

- **Archivos:** `11`, `13`, `14` (A2.13 y nuevas A2.15 y A2.16); `contratos/` 0.4.0 (`suelo`, `clima-escenario`, `proxima-temporada` y nuevo `serie-clima`); `AgroVault/Compartido/{Pendientes,Resumen,APIs,Contratos}.md`.
- **Cambio y motivo:** decisiones de Mompin en el evento.
  1. **TAW:** se calcula con la pedotransferencia de Saxton y Rawls (2006) para cualquier textura, incluidas las tres clases sin fila en FAO-56 Tabla 19, desde arena, arcilla y materia orgánica de SoilGrids, como `SUPUESTO`. Mientras no esté, la demo usa el selector manual. El contrato `suelo` declara `metodoTaw` con su fuente y la retención θsat, θFC y θWP.
  2. **`serie-clima`:** nuevo contrato para la respuesta de `GET /api/clima`, tomado de `SerieClima` en `api/app/modelos.py`.
  3. **A2.13:** queda aprobado el método de Eduardo (distribución histórica por mes desplazada por la anomalía de SEAS5, sin tendencia y con advertencia).
  4. **V-21:** horizonte de 6 meses; `horizonteMeses` pasa a ser fijo en 6.
  5. **V-23:** se usan ISRIC y OpenLandMap; `suelo.estimaciones` y `estimacionUsada`.
  6. **V-08:** Terrarium por defecto y Open-Meteo de respaldo.
  7. **V-06:** `GWETROOT` entra como condición inicial y como comparación (`humedadRaizFraccionSat` y `humedadSuelo`).
  8. **V-15 a V-17:** cerrados con `sslip.io` y Let's Encrypt.
- **Riesgo registrado:** `GWETROOT` es fracción de saturación (MERRA-2, ~100 cm; el metadato de POWER que dice 200 cm es un error reportado), no fracción de TAW. Se convierte con θsat, θFC y θWP; sin ellos, `NO_EVALUABLE`.
- **Fuente / evidencia:** Saxton, K. E. y Rawls, W. J. (2006), Soil Sci. Soc. Am. J. 70(5): 1569-1578, doi:10.2136/sssaj2005.0117 (registro bibliográfico verificado; tabla y ecuaciones `[VERIFICAR]` contra el artículo). Foro de Earthdata sobre las unidades y la profundidad de `GWETROOT`. `npm test` en `contratos/` pasa 42/42.
- **Decisiones afectadas:** V-06, V-08, V-15, V-16, V-17, V-21 y V-23 quedan cerradas. A2.13 queda con el método aprobado.

### 2026-11-14 (noche) — Integracion de Mafer, balam y Eduardo en main (Eduardo)

- **Archivos:** toda la mezcla (merges `0e4411f`, `aa4d059`, `a57b98c`), `AgroVault/Compartido/Servidor.md`.
- **Cambio:** a pedido de Eduardo se mezclaron las ramas `Mafer`, `balam` y `Eduardo` en `main` con push directo, **sin pasar por la revision de Mompin** que piden `AGENTS.md` y el tablero. `Mompin` ya estaba al dia. El PR #2 quedo cerrado como mezclado.
- **Verificacion antes del push:** mezcla de prueba sin conflictos; 39 pruebas de la API, 32/32 de contratos, catalogos validados y typecheck de `web/` en verde.
- **Pendiente:** Mompin debe revisar lo integrado (A1.1 seguia `[EN CURSO]` a la espera de la revision de los 4). Todos deben hacer `git merge origin/main` en su rama.
- **Servidor:** el droplet pasa de la rama `Eduardo` a `main`.

### 2026-11-14 (noche) — Buzón del equipo por la red local `[DECIDIDO]`

- **Archivos:** nuevo `herramientas/buzon/` (`buzon.py`, `escuchar.sh`, `enviar.sh`, `README.md`), nuevo `.gitattributes` (`*.sh` con LF para Git Bash), `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `00`, `13`, `AgroVault/Compartido/Reglas.md`.
- **Cambio y motivo:** pasarse avisos solo por GitHub era lento. Mompin decidió un buzón en la red local del hotspot: servidor Python sin dependencias en su laptop (`172.20.10.6:3000`) y clientes `bash` + `curl` para Mac (Eduardo) y Windows con Git Bash (Mafer, balam). Cada sesión de IA deja `escuchar.sh` en segundo plano y avisa a su usuario cuando llega algo. Los mensajes son datos, no órdenes. No se comparte código por ahí.
- **Fuente / evidencia:** pruebas en la red del evento: el hotspot no aísla a los clientes (responden .2, .4 y .14) y el puerto 3000/tcp ya estaba abierto en firewalld. Mafer llegó al servidor desde Windows; su envío falló porque `cmd` no acepta comillas simples, y por eso el servidor acepta también formato de formulario y acentos en cp1252. Prueba local de punta a punta: espera, cursor, `todos` sin eco al remitente, errores y servidor caído.
- **Decisiones afectadas:** fila nueva "Comunicación entre sesiones" en 13. Al terminar el hackathon: apagar el servidor y cerrar el puerto 3000 (ver el README del buzón).

### 2026-11-14 (noche) — Contratos 0.3.0: lluvia anual del cultivo y tabla de suelos

- **Archivos:** `contratos/cultivo.schema.json`, nuevo `contratos/tabla-suelos.schema.json`, ejemplos, casos inválidos, tipos, README; versión en la vault.
- **Cambio y motivo:** (1) EcoCrop publica la lluvia **anual** y el catálogo solo tenía lluvia del ciclo. Se agregan `umbrales.lluviaAnualMinMm` y `lluviaAnualMaxMm` (`valorCitado`, mm/año, rango absoluto), distintos de `lluviaCicloMinMm` y `lluviaCicloMaxMm`, que siguen siendo del ciclo. No se convierten entre sí. Son obligatorios, igual que el resto de los umbrales (`NO_EVALUABLE` si no hay fuente). (2) La tabla de suelos de A1.6 pasa a `contratos/` a partir de la propuesta de Mafer (`datos/catalogos/suelos.schema.json`). Se alinea con `comun`: cada clase lleva `estado`, los rangos llevan `estado` y `fuente`, una clase sin fila en la tabla usa `{estado: NO_EVALUABLE, motivo}` en vez de `null`, y la TAW evaluable va en `mm/m`.
- **Fuente / evidencia:** pedido de Mompin y README de `datos/catalogos/` en la rama Mafer (hueco "lluvia por ciclo"). `npm test` pasa 32/32. El `suelos.json` de Mafer valida contra el schema nuevo con los cambios de forma descritos (simulación local, sin tocar su rama).
- **Decisiones afectadas:** ninguna. Mafer debe migrar `cultivos.json` y `suelos.json` a 0.3.0.

### 2026-11-14 (noche) — Tipos: los schemas de contratos/ son la fuente de verdad `[DECIDIDO]`

- **Archivos:** `AGENTS.md`, `README.md`, `08`, `13`, `14` (A1.3), `contratos/README.md`, `AgroVault/Compartido/{Reglas,Contratos,Pendientes,Resumen}.md`, `AgroVault/{Codex/AGENTS.md,Cursor/INSTRUCCIONES.md}` (`CLAUDE.md` lo actualizó la sesión maestra en 3876f60).
- **Cambio y motivo:** Mompin y Eduardo decidieron que los JSON Schema de `contratos/` mandan sobre los datos. Los tipos TS salen de `contratos/tipos/`, los modelos de FastAPI deben respetar los schemas con una prueba que lo verifique, y el cliente generado desde OpenAPI solo cubre las llamadas HTTP. Reemplaza "tipos solo desde OpenAPI" de 13 y cierra el pendiente de tipos de la vault. Al entregable de A1.3 se le suma esa prueba.
- **Fuente / evidencia:** decisión del equipo en el evento, transmitida por la sesión maestra el 14/11.
- **Decisiones afectadas:** fila "Tipos compartidos" de 13.

### 2026-11-14 (noche) — docs/00 al día

- **Archivos:** `00`.
- **Cambio y motivo:** 00 seguía diciendo que la documentación vive en Drive y que no se podía escribir código. Ahora dice que vive en el repo (Drive como respaldo, según 13), que el hackathon ya inició e incluye la regla de verificar antes y después de trabajar. El índice suma 13, 14, 15, `AgroVault/` y `contratos/`, y corrige el enlace al README del agente `modelador-voxel`. El orden de lectura para todos pasa a 00 → 13 → 14 → 03 → 11. La sección de carpetas anteriores aclara que esas carpetas están en Drive.
- **Fuente / evidencia:** pedido de Mompin transmitido por la sesión maestra el 14/11; decisiones de 13.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Ranking B pasa a `[DECIDIDO]`

- **Archivos:** `05`, `09`, `11`, `13`, `14`; `AgroVault/Compartido/{Pendientes,Resumen,Contratos}.md`, `AgroVault/Codex/AGENTS.md`; `contratos/README.md` y la descripción de `resultado-rotacion.schema.json`.
- **Cambio y motivo:** Mompin confirmó que el criterio B ya está acordado por el equipo en el evento: deja de estar "por ratificar" y deja de ser `[EN EVENTO]`. Se mantienen el respaldo A y el riesgo de la entrada anterior. En 11 la fila pasa de "Se decide en el evento" a "Decisiones tomadas"; en 13 entra a la tabla de decididas y V-19 queda solo con la pintura por bloques.
- **Fuente / evidencia:** confirmación de Mompin transmitida por la sesión maestra el 14/11.
- **Decisiones afectadas:** V-19 (ranking) cerrada con B.

### 2026-11-14 (noche) — Ranking: criterio B (decisión de Mompin, falta ratificar)

- **Archivos:** `05` (paso 7), `11`, `13` (V-19), `09`, `14` (A4.2); `contratos/` 0.2.0 (`resultado-rotacion`, ejemplos, casos inválidos, tipos); `AgroVault/Compartido/{Pendientes,Resumen,Contratos}.md`, `AgroVault/Codex/AGENTS.md`.
- **Cambio y motivo:** Mompin eligió el criterio B del paso 7 de 05: puntaje compuesto por escenario, robustez = peor puntaje, minimax de arrepentimiento y desempate por promedio. Estaba `[EN EVENTO]`, así que queda pendiente de que el equipo lo ratifique. El contrato sigue aceptando A como respaldo y agrega `ponderacion` (pesos por pilar, etiqueta y pilares excluidos), obligatoria con B. Se quitó el "A por defecto" de la vault.
- **Riesgo:** B necesita los pilares 2 y 3 (A3.7) y pesos con fuente o justificados. Si no hay pesos, se usan pesos iguales declarados `SUPUESTO`, nunca inventados. Si A3.7 no llega, se usa el criterio A (solo pilar hídrico) y se dice en la tarjeta.
- **Fuente / evidencia:** decisión de Mompin transmitida por la sesión maestra el 14/11. `npm test` en `contratos/` pasa 25/25.
- **Decisiones afectadas:** V-19 (ranking) pasa de `[EN EVENTO]` a decisión de Mompin por ratificar; la pintura por bloques sigue `[EN EVENTO]`.

### 2026-11-14 (noche) — AgroVault alineado con contratos/ y regla de verificación

- **Archivos:** `AgroVault/Compartido/{Contratos,Pendientes,Reglas,Resumen}.md`, `AgroVault/Bienvenido.md`, `AgroVault/{Claude,Cursor}/INSTRUCCIONES.md`, `AgroVault/Codex/AGENTS.md`, `AGENTS.md`; notas en `04`, `08` y `13`.
- **Cambio y motivo:** la vault de Eduardo copiaba los ejemplos de 08, que ya no coinciden con `contratos/` (A1.1). Ahora `Contratos.md` resume y enlaza los schemas sin redefinirlos, y `Pendientes.md` refleja A1.1 hecha (falta la revisión de los 4), las decisiones abiertas (ranking A o B, A2.8 con las opciones a/b/c de 05 paso 2, alineación de tipos OpenAPI con los de `contratos/tipos/`) y lo decidido el 14/11. Se quitaron afirmaciones viejas ("no existe `contratos/`", "el tablero está vacío"). Lo que la vault tenía más nuevo que `docs/` se reflejó con notas breves: endpoints superados en 08, investigación de APIs en 04 y el horizonte de 7 meses de V-21 en 13. Regla nueva para todos, a pedido de Mompin: verificar los cambios antes y después de trabajar y actualizar la documentación afectada en vez de dejarla desfasada o duplicarla (en `AGENTS.md`, `Reglas.md` y las instrucciones de Claude, Codex y Cursor). La misma regla en `CLAUDE.md` queda pendiente de la confirmación de Mompin.
- **Fuente / evidencia:** `contratos/*.schema.json` v0.1.0; `AgroVault/Compartido/APIs.md` (investigación de Eduardo del 14/11, con sus `VERIFICAR`).
- **Decisiones afectadas:** ninguna se cierra. Se registra como pendiente la alineación de los dos generadores de tipos.

### 2026-11-14 (noche) — A1.1: contratos de datos v0.1.0

- **Archivos:** `contratos/` (8 schemas más `comun.schema.json`, ejemplos, validador, casos inválidos, `tipos/contratos.d.ts`, README).
- **Cambio y motivo:** primeros contratos como JSON Schema 2020-12, para que front, API y motor trabajen en paralelo contra los ejemplos. Respecto a los nombres sugeridos en 08: (1) `estado` pasa a ser siempre el estado de evaluación de 04 y el estado visual de la planta se llama `estadoPlanta`; (2) el suelo se separa de la parcela en su propio contrato (`parcela.sueloId`), con textura y pH etiquetados `SUPUESTO`; (3) nuevo contrato `proxima-temporada` (decisión del 14/11) que solo admite bandas de incertidumbre, sin cifra única; (4) los parámetros del catálogo usan `valorCitado` (valor con fuente o `NO_EVALUABLE`); (5) el resultado por rotación admite los criterios de ranking A y B, porque la elección sigue `[EN EVENTO]`; (6) `plan.asignacionClima` queda en `null` hasta decidir A2.8.
- **Fuente / evidencia:** docs 04, 05, 07, 08 y 13. Los ejemplos son ficticios (`meta.esEjemplo: true`) y las coordenadas de Isla son ilustrativas. `npm test` en `contratos/` pasa 22/22 (8 ejemplos válidos y 14 casos inválidos rechazados).
- **Decisiones afectadas:** ninguna decisión cerrada cambia. Falta la revisión de los 4 (entregable de A1.1).

### 2026-11-14 (tarde) — Pronóstico aproximado, pH, catálogo de cultivos y reparto por actividad

- **Archivos:** `13`, `14`, `cronograma.html`; notas de alcance en `00`, `03`, `04` y `10`.
- **Cambio y motivo:** tras la investigación de datos, el equipo aprobó (1) una capa aproximada "próxima temporada" como banda de incertidumbre, (2) mostrar pH y textura estimados por modelo global, (3) catálogo propio de cultivos en vez de una API, (4) zona demo en Isla con la milpa como núcleo, y (5) repartir el trabajo por actividad y no por rol.
- **Fuente / evidencia:** búsquedas web del 14/11 sobre Open-Meteo (estacional y Climate API), NASA POWER, SoilGrids/OpenLandMap, FAO EcoCrop, Trefle y Perenual. Varios datos vienen de páginas de terceros: quedan como `[VERIFICAR]` (V-20 a V-24).
- **Decisiones afectadas:** "no predice el clima" y "no mide pH" pasan a "no predice una temporada exacta" y "pH estimado, no medido". Nuevas actividades A0.6, A0.7, A2.13, A2.14 y A4.9 en 14.

### 2026-11-14 — Inicio del hackathon y decisiones de arquitectura

- **Archivos:** nuevos `13-DECISIONES-HACKATHON.md` y `14-CRONOGRAMA.md`; ajuste menor en `00` y en la ruta del agente `modelador-voxel`.
- **Cambio:** la documentación pasa de Drive al repositorio Git (`docs/`). Se deciden stack y servidor, y el cronograma se mide en esfuerzo de IA, no en horas.
- **Decisiones afectadas:** motor en TypeScript en el navegador con Web Worker; backend FastAPI (Python); polígono libre dentro del MVP; servidor DigitalOcean de Eduardo; sin dominio propio. Detalle en 13.

### 2026-11-13 — v2.0 consolidada vigente

- **Archivos:** carpeta nueva completa (00 a 12) y `agente-modelador-voxel/`.
- **Cambio:** se unifican en una sola fuente `docs/` (v0.2, 10/11) y `00 — ... v1.2` (11/11). Se revisaron las diferencias entre ambas y el equipo resolvió:
  - El equipo son **4 integrantes**. `[DECIDIDO]`
  - **Sí habrá relieve.** `[DECIDIDO]`
  - **Sí habrá selector de cultivos**: es un simulador tipo "what if". `[DECIDIDO]`
  - Documentación en **Google Drive** vía rclone o MCP; en el evento se podrá usar GitHub u otra herramienta. Notion deja de ser la fuente. `[DECIDIDO]`
  - Cada integrante usa su propia IA (ChatGPT, Claude, Cursor); no es relevante registrar qué IA editó qué. `[DECIDIDO]`
  - Los modelos 3D se hacen con **Blockbench** (`.bbmodel`), generados por el agente `modelador-voxel`. `[DECIDIDO]`
  - Hay que consolidar ambas carpetas en una (esta). `[DECIDIDO]`
  - Cronograma (48 h frente a 39 h): `[EN EVENTO]`.
  - Cultivos iniciales: `[EN EVENTO]`.
  - Pilares de la prueba de estrés (déficit hídrico, compatibilidad de ciclos, protección del suelo): lo ideal es todo; `[DEPENDE-DATOS]`.
  - Cómo se asigna el clima a cada ciclo de una rotación: es investigación, depende de las APIs, los campos y los cultivos. `[DEPENDE-DATOS]`
  - Incluir la rotación actual del agricultor y sus prioridades: `[MEJORA]`.
  - Detalles menores (numeración, secciones faltantes): se deciden después.
- **Se copió al Drive** el agente `modelador-voxel`, su librería `voxelkit.py` y el ejemplo de la zanahoria (práctica, no es cultivo del proyecto).
- **Las carpetas anteriores no se modificaron.**

### 2026-11-11 — v1.2 consolidada (carpeta anterior)

Consolidación basada en Notion v1.2 y en `docs/`. Ver `00 — AGROHIVE DOCUMENTACIÓN CONSOLIDADA v1.2/01-REGISTRO-DE-CAMBIOS.md`.

### 2026-11-10 — v0.2 de Mompin (carpeta `docs/`)

Primera documentación por tema a partir del video del compañero, el audio de la reunión y la verificación de APIs. Ver `docs/DOCUMENTACION_MAESTRA.md`.

### 2026-11-14 — Cierre A1.2
- App.tsx y ui/useMotor.ts inicializan el Worker existente sin modificar motor ni contratos. Confirmacion mediante olvidar, timeout y limpieza al desmontar. Se actualiza el tablero y README. Sin cambio de alcance cientifico.

### 2026-11-14 — A2.10 y A2.9: mapa y cuadrícula de Balam
- Terreno conserva su diseño e incorpora Leaflet con mapa OpenStreetMap y atribución, dibujo por clic/toque o coordenadas, deshacer y reiniciar. La carga del mapa es diferida.
- `ui/cuadricula.ts` valida anillos y cruces, genera cuadrados locales y recorta bordes con Turf; máximo 1600 celdas. No calcula indicadores. Elevación y pendiente faltantes quedan null.
- Se incorpora sin cambios el cliente API de Eduardo (`2e517c6`). La UI confirma antes de POST /api/elevacion, muestra fuente, estado y advertencias; permite reintentar o guardar sin relieve. App conserva la parcela durante la navegación; recargar inicia otra sesión.
- Verificación: geometría y schema compartido, build/TypeScript; navegador a 1440/390/320 px, error 503 y éxito con respuestas sintéticas declaradas, persistencia y guardado sin elevación. No se afirma validación agronómica ni disponibilidad del servicio público.
- Sin cambios de alcance; límites técnicos documentados en `web/src/ui/TERRENO-PLAN.md`. El selector y la simulación desde las páginas siguen pendientes.
