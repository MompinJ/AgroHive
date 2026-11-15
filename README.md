# AgroHive · Code Hive

Versión en español · [English version](README.en.md)

> **Estado de este documento (15/11/2026).** Las licencias y las reglas del reto se contrastaron con sus páginas oficiales o con registros públicos, y quien lo hizo fue una sesión de IA, no una persona. **Falta la revisión humana de las licencias, de la declaración de IA y de las reglas del reto.** Lo que no se pudo confirmar va marcado `[VERIFICAR]` y está resumido al final, en «Pendiente de verificación humana».

Simulador visual **«what if» de rotaciones de cultivos** para [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/), NASA Space Apps Challenge 2026, sede Boca del Río, Veracruz.

AgroHive compara alternativas frente a años históricos reales de NASA y muestra demanda de agua, compatibilidad de siembra y cobertura del suelo. Busca alternativas robustas ante escenarios adversos. **No predice cosechas, ingresos ni una temporada exacta y no reemplaza a un agrónomo.** La decisión final pertenece al agricultor.

**[Abrir la demo](https://agrohive.space)** · [Método del motor](docs/05-MOTOR-SIMULACION.md) · [Documentación](docs/00-LEEME-PRIMERO.md)

Estado observado el **15/11/2026**: la [API publicada](https://agrohive.space/health) respondió `status: ok` y contrato `0.16.0`; el commit que informa cambia con cada despliegue. Esto identifica la API en ese momento, no la compilación de todos los archivos web. El servicio se aloja en el servidor de un integrante del equipo y su dirección puede cambiar.

## Qué puedes hacer

- Elegir una de **seis parcelas de ejemplo**: Bajío (México), Sorriso (Brasil), Uasin Gishu (Kenia), Ludhiana (India), Tierra de Campos (España) e Iowa (EE. UU.). Son contornos ficticios de unas 2.8 ha sobre tierra de cultivo real, con respuestas grabadas de la API; cada parcela tiene 71 celdas.
- Dibujar tu parcela y consultar fuentes globales de clima, suelo y elevación. La cobertura y disponibilidad dependen de cada proveedor; los datos ausentes conservan su motivo y estado, nunca se sustituyen por cero.
- Seleccionar entre **40 cultivos**, modificar fechas y secuencias y comparar rotaciones. Los ejemplos comienzan con dos o tres alternativas según sus cultivos sugeridos; Iowa comienza con dos. Se pueden añadir más.
- Explorar años secos, habituales y lluviosos, ver resultados en una escena voxel 3D y consultar evidencia, supuestos y fuentes.
- Consultar una banda exploratoria de próxima temporada y evidencia regional de vegetación, humedad y presencia de plagas.

El catálogo incluye cinco modelos de etapa, cinco bloques ligeros y cinco iconos por cultivo: **200 modelos detallados, 200 bloques y 200 iconos**. La interfaz limita las parcelas a 200 celdas. Sin WebGL se conservan las cifras del motor; no hay modo 2D de respaldo en el flujo principal. Isla, Veracruz se conserva como prueba interna del motor.

## Ejecutar el proyecto

Requisitos: **Node.js `^20.19.0 || >=22.12.0`** y **Python 3.12**.

```bash
git clone https://github.com/MompinJ/AgroHive.git
cd AgroHive/web
npm ci
npm run dev
```

Abre `http://127.0.0.1:5173`. En desarrollo, la web usa la API pública por defecto. Para una API local configura `VITE_API_URL` desde `web/`:

```bash
# Bash (Linux/macOS)
VITE_API_URL=http://127.0.0.1:8010 npm run dev
```

```powershell
# PowerShell (Windows)
$env:VITE_API_URL = 'http://127.0.0.1:8010'
npm run dev
```

### API local

En otra terminal, desde la raíz del repositorio:

```bash
# Bash (Linux/macOS)
cd api
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m uvicorn app.main:app --reload --port 8010
```

```powershell
# PowerShell (Windows)
cd api
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8010
```

La documentación interactiva queda en `http://127.0.0.1:8010/docs`. `EARTHDATA_TOKEN` se configura exclusivamente en el entorno del servicio para consultas SMAP; no se incorpora al frontend ni al repositorio. Consulta [API](api/README.md) y [cliente web](web/src/api/README.md).

### Ejemplos sin internet

Los [seis ejemplos](datos/demo/ejemplos/LEEME.md) cargan respuestas locales incluidas en la compilación web, sin consultar la API. Sirve la web localmente con sus archivos disponibles; abrir una URL pública por primera vez requiere conexión. Los mapas base, el buscador y los enlaces externos dependen de internet.

En Linux/macOS, `bash herramientas/demo-sin-red.sh` combina las cachés de los ejemplos y arranca la API con su salida a internet bloqueada. El script usa rutas de entorno virtual Unix; no es un lanzador PowerShell. Las respuestas cubren coordenadas y periodos concretos, como `2005-10-01` a `2025-12-31` para el clima: una parcela arbitraria no queda cubierta por ese respaldo. Véanse [script](herramientas/demo-sin-red.sh) y [guía de respaldo](docs/demo-sin-red.md); esta última conserva también resultados históricos del paquete de Isla.

## Cómo calcula la comparación

1. **Escenarios históricos.** Selecciona años reales cercanos a p10, p50 y p90 de lluvia de las temporadas PV + OI, con las ventanas SIAP que aplica el método. Los ejemplos contienen 20 años agrícolas completos en la serie 2005-10 a 2025-12. Conserva el año real; no es un pronóstico.
2. **Fechas y calendario.** El usuario elige las siembras. El calendario combina GGCMI, MIRCA2000 y FAO Crop Calendar, con SIAP e INIFAP en México. Identifica las ventanas regionales y las equivalencias de cultivo.
3. **Balance FAO-56.** ETc = Kc × ET0 y balance diario de cubeta por bloque, con TAW según el suelo, estrés hídrico y percolación profunda basada en la ecuación 88. `GWETROOT` es fracción de saturación regional y se convierte antes de usarse como humedad inicial. El balance actual no incluye riego, escurrimiento ni ascenso capilar.
4. **Pilares.** Déficit hídrico, exceso/percolación, compatibilidad de siembra y protección del suelo. La protección usa **días de suelo desnudo**: el índice de erosión permanece en `null` por ausencia de intensidad subdiaria y factores locales con fuente. Calor y aporte indirecto son complementarios y no entran al puntaje; calor es `NO_EVALUABLE` por falta de umbrales con fuente.
5. **Ranking B.** Compone puntajes con los pilares comparables. Ordena por **menor arrepentimiento máximo**, desempata por mayor promedio y después por identificador. También informa la robustez como peor puntaje. Los pesos iguales y la normalización del exceso se declaran `SUPUESTO`. El criterio A, basado en déficit, es el respaldo cuando solo ese pilar permite comparar. Las alternativas `EXPLORATORIO` muestran métricas sin posición de recomendación.
6. **Próxima temporada.** Banda mensual p10–p90 durante seis meses: distribución histórica desplazada por la anomalía SEAS5, sin tendencia, y evaluación con años análogos reales. Es `EXPLORATORIO` y no entra al ranking. No se deben sumar los extremos de las bandas mensuales.
7. **Explicación.** Tarjetas y consejos de Esquilote usan plantillas sobre los datos disponibles. NDVI, SMAP, IMERG y plagas aportan contexto; no alteran el balance ni el ranking.

Los indicadores se calculan en un **Web Worker del navegador**. La interfaz y la escena representan sus resultados. Estados: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS` y `RESPALDO_HISTORICO`. Un indicador ausente no se transforma en un número válido. Detalle: [motor](docs/05-MOTOR-SIMULACION.md) y [contratos](contratos/).

## Datos NASA y citas

| Fuente | Uso y referencia |
| --- | --- |
| **NASA POWER** | Base del motor: lluvia, temperaturas, radiación, humedad, viento y `GWETROOT`. POWER Project, NASA Langley Research Center, financiado por NASA Earth Science Division. Respuestas registradas: **Daily API v2.10.3**, consulta 14/11/2026. Citar servicio, versión y fecha según la [guía POWER](https://power.larc.nasa.gov/docs/referencing/). La guía de referencia de POWER no declara una licencia `[VERIFICAR]`. |
| **GPM IMERG vía POWER** | Evidencia de precipitación, `IMERG_PRECTOT`: suma diaria UTC de datos de media hora a 0.1°. POWER combina **Final Run y Late Run** según la antigüedad; no se identifica toda la serie como un único producto diario Final. Su [metodología](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/) describe esa combinación y su [historial](https://power.larc.nasa.gov/docs/release-guide/) registra IMERG v7B. Citar también POWER. |
| **SMAP SPL3SMP v9** | Humedad superficial regional a 36 km, evidencia informativa. O'Neill, Chan, Njoku, Jackson, Bindlish y Chaubell (2023), NASA NSIDC DAAC, [doi:10.5067/4XXOGX0OOW1S](https://doi.org/10.5067/4XXOGX0OOW1S). La consulta al proveedor requiere Earthdata; los ejemplos incluyen respuestas grabadas. [Guía de cita NSIDC](https://nsidc.org/data/data-programs/nsidc-daac/citing-nsidc-daac). |
| **MODIS MOD13Q1 V061** | NDVI regional mediante Planetary Computer, colección `modis-13Q1-061`, y datos grabados. Didan (2021), *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*, [doi:10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061). ORNL REST se usó para contraste de cuatro fechas, no como proveedor en vivo: [doi:10.3334/ORNLDAAC/1600](https://doi.org/10.3334/ORNLDAAC/1600). |

Los datos conservan las condiciones de su producto y proveedor; los servicios de acceso tienen sus propios términos. Véase la [guía de uso de Earthdata](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance). Usar datos NASA no implica respaldo de NASA a AgroHive.

## Otras fuentes y condiciones

Las condiciones de terceros se aplican a sus materiales, independientemente de la licencia del código propio. Las referencias concretas, coordenadas, fechas y unidades acompañan los datos guardados.

| Fuente | Aporte y condiciones documentadas |
| --- | --- |
| **ISRIC SoilGrids** | Estimaciones de textura, pH y carbono orgánico, 250 m, integradas a 0–30 cm. [CC BY 4.0](https://www.isric.org/explore/soilgrids). Son `SUPUESTO`, no mediciones de campo. |
| **OpenLandMap-soildb** | Segunda estimación de suelo: capas 30 m, 2020–2022. Las colecciones STAC consultadas declaran CC BY 4.0. Los registros Zenodo de 120 m no se presentan como DOI de las capas 30 m. Procedencia y cliente: [API](api/README.md). |
| **Terrain Tiles / Terrarium** | Elevación por defecto; no es un producto NASA directo. [Atribución Tilezen](https://github.com/tilezen/joerd/blob/master/docs/attribution.md): INEGI Continental relief 2016 en México, NOAA ETOPO1 y USGS 3DEP/GMTED2010/SRTM según cobertura. |
| **Open-Meteo / ECMWF / Copernicus** | Respaldo climático ERA5, elevación GLO-90 y pronóstico estacional SEAS5. Datos [CC BY 4.0](https://open-meteo.com/en/licence), con atribución y enlace de licencia. El acceso gratuito al servicio tiene condiciones de uso no comercial; licencia de datos y acceso al servicio son distintos. |
| **Esri World Imagery** | Mapa satelital sujeto a términos de Esri. El ítem acredita Esri, Vantor, Earthstar Geographics y GIS User Community. [Capa y condiciones](https://goto.arcgisonline.com/maps/World_Imagery). No se incluye en el respaldo sin red. `[VERIFICAR]` por una persona que el uso directo de los tiles desde esta web cumple los términos de Esri. |
| **OpenStreetMap** | Mapa de calles: © OpenStreetMap contributors, datos [ODbL](https://www.openstreetmap.org/copyright). El control del mapa incluye «contributors». El servicio de teselas se rige además por su [política de uso](https://operations.osmfoundation.org/policies/tiles/); no se redistribuye una descarga masiva. |
| **GeoNames** | Lugares del buscador mediante Open-Meteo, [CC BY](https://www.geonames.org/). El control del mapa identifica ambos proveedores. |
| **FAO-56** | Allen, Pereira, Raes y Smith (1998), *Crop evapotranspiration*, tablas 11, 12, 19 y 22; ecuaciones 52, 58, 80, 82–85 y 88. [Publicación](https://www.fao.org/4/x0490e/x0490e00.htm) y [términos FAO](https://www.fao.org/contact-us/terms/en/). El catálogo registra tabla y fila por parámetro. El uso comercial requiere permiso de la FAO `[VERIFICAR]`. |
| **FAO EcoCrop / Recocrop** | Rangos de temperatura y lluvia, copia de [Recocrop](https://github.com/cropmodels/Recocrop), commit `3a01315`. La licencia GPL-3.0 del código de Recocrop no otorga por sí misma permisos sobre los datos FAO. `[VERIFICAR]` la licencia de los datos. |
| **Saxton y Rawls** | Pedotransferencia de retención y TAW: (2006), *Soil Sci. Soc. Am. J.* 70:1569–1578, [doi:10.2136/sssaj2005.0117](https://doi.org/10.2136/sssaj2005.0117). Tablas 1 y 3; cálculo etiquetado `SUPUESTO`. |
| **WoSIS** | Batjes y van Oostrum (2023), *WoSIS Procedures Manual*, ISRIC Report 2023/01, p. 25: factor 1.724 para convertir carbono orgánico en materia orgánica. |
| **SIAP** | Cierre agrícola municipal 2021–2025 y presencia de cultivos. [Datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php): reconocimiento de fuente y conservación de condiciones al redistribuir. [Procedencia del extracto](datos/catalogos/fuentes/LEEME.md). |
| **INIFAP** | Guía de maíz de temporal de Cotaxtla (Tinoco Alfaro, 2022) y Agenda Técnica Agrícola de Veracruz (2015). Se extraen fechas citadas; no se redistribuyen los textos como contenido propio. No se encontraron condiciones de reproducción en los PDF `[VERIFICAR]`. |
| **GGCMI fase 3** | Calendario mundial de temporal a 0.5°. Jägermeyr et al. (2021), [doi:10.5281/zenodo.5062513](https://doi.org/10.5281/zenodo.5062513), CC BY 4.0. |
| **MIRCA2000 v1.1** | Inicio de ciclos y presencia por superficie de temporal. Portmann, Siebert y Döll (2010), [doi:10.5281/zenodo.7422506](https://doi.org/10.5281/zenodo.7422506), CC BY 4.0. |
| **FAO Crop Calendar** | Ventanas por país y cultivo en 57 países. El equipo trata el extracto como **CC BY-NC-SA 4.0**, separado en [su carpeta y aviso](datos/calendario/fao-crop-calendar/LICENCIA.md). Esa restricción no se elimina al licenciar el código. Un registro de FAO dice CC BY 4.0 y otro CC BY-NC-SA `[VERIFICAR]`. |
| **geoBoundaries gbOpen** | Límites mexicanos para emparejar SIAP; ADM2 CC BY 4.0 y ADM1 CC BY 3.0 IGO, según metadatos de los extractos. La licencia concreta de cada archivo está en sus metadatos `[VERIFICAR]`. |
| **GBIF / EPPO** | Presencia regional y hospederos de plagas, capa ilustrativa. Cita por consulta: GBIF.org (fecha), *GBIF Occurrence Search*. Cada registro conserva la licencia de su publicador. Para *Sphenarium purpurascens*: Quesada-Béjar et al. (2017), *Rev. Mex. Cienc. Agríc.* 8(6):1357–1370. `[VERIFICAR]` la licencia registro por registro. |
| **ESA WorldCover 2021 v200** | Tierra de cultivo, clase 40, 10 m. Zanaga et al. (2022), [doi:10.5281/zenodo.7254221](https://doi.org/10.5281/zenodo.7254221), [CC BY 4.0](https://esa-worldcover.org/en/data-access). © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. |
| **USDA CDL / NRCS SSURGO** | Cultivos y suelo para Iowa. CDL es de [dominio público y redistribución libre](https://catalog.data.gov/dataset/cropland-data-layer); citar USDA NASS y año de la capa. El [registro SSURGO](https://catalog.data.gov/dataset/soil-survey-geographic-database-ssurgo) declara dominio público. [Cita NRCS](https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo): Soil Survey Staff, NRCS, USDA, *Web Soil Survey*, con fecha de acceso. La licencia se tomó del catálogo de data.gov; las páginas de NASS y NRCS que se leyeron el 15/11 no la declaran `[VERIFICAR]`. |
| **Köppen-Geiger** | Clasificación desde normales POWER con reglas de Peel, Finlayson y McMahon (2007). El bioma de la escena es decorativo. |
| **Fotografías de ejemplos** | Autor, URL, licencia y modificaciones por fotografía en [créditos](web/src/ui/assets/lugares/creditos.json). Son materiales de terceros, distintos de las ilustraciones generadas. |

## Límites científicos

- El clima es regional; las parcelas de ejemplo comparten una serie entre sus celdas. La resolución meteorológica de POWER es aproximadamente 0.5 × 0.625 grados; IMERG tiene otra resolución.
- Las diferencias del balance entre bloques provienen de cultivos, fechas y parámetros de suelo disponibles. **La pendiente no modifica el balance actual**; la elevación media se usa en ET0 cuando corresponde.
- Textura, pH y TAW son estimaciones, no un análisis de laboratorio. `GWETROOT` representa una zona de raíces regional de aproximadamente un metro, no humedad medida en cada bloque.
- El modelo no estima erosión, rendimiento, precios, costos ni daño por plagas. La percolación no equivale a un umbral validado de encharcamiento. El 3D representa estados cualitativos, no biomasa ni altura real.
- Se usan parámetros generales FAO-56/EcoCrop, raíz en el extremo superior del rango y equivalencias explícitas, como chile con parámetros de pimiento dulce. Las duraciones son la suma de etapas, incluso cuando el total impreso de la tabla difiere. [Detalle de parámetros y elecciones](datos/catalogos/README.md).
- El calendario mundial usa celdas de 0.5° y equivalencias `SUPUESTO` para determinados cultivos. FAO Crop Calendar combina zonas agroecológicas del país sin límites espaciales publicados; las ventanas mexicanas pueden ser estatales o distritales.
- La búsqueda de plagas usa una caja de ±1.5°; su extensión en kilómetros cambia con la latitud. Presencia histórica desde 2000 no equivale a riesgo o pérdida de la próxima temporada.
- El modelo no tiene calibración agronómica local para presentar sus alternativas como recomendaciones de campo. Se requiere criterio profesional antes de tomar decisiones agrícolas.

## Uso de IA y derechos

Según el registro del equipo, la idea central proviene de una propuesta humana. Claude, Codex, Cursor, ChatGPT, Gemini y Copilot se usaron como asistentes para código, pruebas y documentación. La extracción de parámetros FAO-56/EcoCrop contó con asistencia de IA; cada valor mantiene su fuente. Las pruebas de software no equivalen a validación agronómica. Varios commits llevan la marca `Co-Authored-By` de la herramienta, pero no todos. **Esta sección está pendiente de revisión humana.**

Los modelos voxel e iconos se generaron mediante código asistido por IA y las herramientas `voxelkit.py` e `iconos2d.py`. Las ilustraciones `terreno-hero`, `terreno-demo` y `terreno-poligono` se generaron con IA; se conservan sus [prompts](web/src/ui/assets/terreno-prompts.md). El guion y los subtítulos del [tráiler](docs/trailer-30s.md) están en el repositorio; la voz inglesa usa ElevenLabs TTS (`eleven_v4`, Brian) vía Krea y declara su generación en los metadatos de los archivos de voz.

El [guion de la presentación de siete diapositivas](docs/presentacion.md), sus notas del orador y su diseño se redactaron con asistencia de Claude a partir de la documentación y las regresiones del motor. El guion incluye una declaración de IA en la última diapositiva; utiliza texto, formas y capturas de la aplicación.

Dentro de la aplicación, las explicaciones son plantillas deterministas: ningún LLM decide indicadores ni completa datos científicos ausentes. La [guía de entrega](https://www.spaceappschallenge.org/resources/project-submission-guide/) exige marcas visibles en imágenes/video generados y reconocimiento en texto y metadatos para audio, código y datos.

**El repositorio no incluye un archivo de licencia para el código propio** (`[DECIDIR]` por el equipo). Los materiales de terceros conservan sus condiciones. Las [condiciones de Space Apps](https://www.spaceappschallenge.org/legal/) establecen contenido original libre o bajo licencia OSI y distribución Apache 2.0 por NASA si no se especifica una licencia OSI. Eso no relicencia datos FAO ni otros materiales de terceros, ni acredita por sí solo la elegibilidad del paquete completo.

## Entrega de Space Apps

La [guía oficial](https://www.spaceappschallenge.org/resources/project-submission-guide/) solicita nombre, resumen, URL de demo, URL final del proyecto, descripción detallada, declaración SI/IA, datos NASA y referencias de otros proveedores. El formulario y los materiales enlazados deben estar en inglés. La demo puede ser un video de **hasta 30 segundos** o una presentación de **hasta siete diapositivas**, incluidas portada e introducción; un video hablado en otro idioma requiere subtítulos en inglés. Los enlaces deben ser públicos y accesibles sin autenticación.

La entrega se confirma en el portal con **Submit for Judging** y su confirmación; guardar progreso no equivale a enviar. Este README documenta el proyecto y no es un comprobante de envío. Véanse [reglas y sede](docs/02-EVENTO-Y-RETO.md) y [borrador del formulario](docs/entrega-a5-9.md), que conserva un corte anterior del proyecto.

## Estructura y comprobaciones

| Carpeta | Contenido |
| --- | --- |
| `web/` | React, Vite, TypeScript; interfaz, Worker del motor y escena Three.js con InstancedMesh |
| `api/` | FastAPI; proxy, caché y clientes de proveedores |
| `contratos/` | JSON Schema, ejemplos y tipos TS generados; fuente de verdad de formatos |
| `datos/` | Catálogos, calendarios, extractos y respuestas de ejemplos |
| `modelos/` | Modelos Blockbench, bloques ligeros, iconos y generadores |
| `docs/` | Método, decisiones, organización y materiales de entrega |
| `herramientas/` | Generación voxel, grabación de datos, respaldo sin red y buzón del equipo |

Desde la raíz, ejecutar antes de integrar:

```bash
npm ci --prefix contratos
npm test --prefix contratos
node datos/catalogos/validar.mjs
npm test --prefix web -- --maxWorkers=1
npm run build --prefix web
```

Pruebas Python desde la raíz, tras instalar el entorno de la API:

```bash
# Bash
api/.venv/bin/python -m pytest -q api
api/.venv/bin/python -m unittest discover -s datos/catalogos
```

```powershell
# PowerShell
.\api\.venv\Scripts\python.exe -m pytest -q api
.\api\.venv\Scripts\python.exe -m unittest discover -s datos/catalogos
```

`--maxWorkers=1` reduce el consumo simultáneo de memoria en Vitest. Un build exitoso no sustituye las pruebas. Cada responsable trabaja en su rama; solo Mompin integra a `main`, conforme a [AGENTS.md](AGENTS.md) y al [plan vigente](docs/16-PLAN-DIA-FINAL.md).

## Pendiente de verificación humana

Todo lo siguiente es `[VERIFICAR]` o `[DECIDIR]` y necesita a una persona; no está revisado:

1. **Licencias y condiciones de uso:** POWER (no declara licencia), FAO-56 (el uso comercial requiere permiso), datos de EcoCrop, tiles de Esri, GBIF (por publicador), FAO Crop Calendar (un registro dice CC BY y otro CC BY-NC-SA, y se trata como NC-SA), INIFAP, SIAP, geoBoundaries (por archivo) y CDL y SSURGO (declaradas por el catálogo de data.gov, no por las páginas de NASS y NRCS leídas).
2. **Declaración de IA:** que el equipo confirme la idea humana, cómo se cumple la marca visible en imágenes y video generados con IA, y la comprobación cifra por cifra de los parámetros del catálogo (el 15/11 se cotejaron seis filas con la edición web de FAO-56; el PDF no se leyó).
3. **Reglas del reto:** confirmarlas en el navegador por una persona.
4. **Licencia del código propio** del repositorio, condicionada por FAO Crop Calendar (CC BY-NC-SA).
5. **Sin validación agronómica local:** ningún técnico ha revisado los parámetros ni las recomendaciones.
6. **«Método y fuentes» está incompleta** al 15/11: todavía no lista las fuentes de SMAP, NDVI de MODIS ni plagas de GBIF (`web/evidencia/cifras-visibles-d10.md`).

**Equipo Code Hive:** Mompin, Eduardo, Mafer y balam.
