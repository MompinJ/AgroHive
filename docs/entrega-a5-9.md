# A5.9 · Paquete de preparación de la entrega

**Estado: borrador preparado, sin envío ni aprobación del equipo.** Consulta pública: 14/11/2026, aproximadamente 18:40, America/Mexico_City. Contenido técnico basado en `main` local `4f333e5`, contratos 0.13.0; no se identifica este snapshot como versión final aprobada.

Mompin comunicó en buzón #259 que A5.9 queda pospuesta durante la fase de revisión. Este paquete conserva la preparación solicitada por Balam; no reactiva el envío ni sustituye el OK de todos. Antes de retomarlo, actualizar los estados y la versión publicada.

Reglas y fuentes oficiales: [docs/02, verificación A0.5](02-EVENTO-Y-RETO.md#verificación-a05--14112026). Método: [docs/05](05-MOTOR-SIMULACION.md). Límites: [docs/10](10-PITCH-Y-LIMITES.md). Referencias y licencias: [README](../README.md#fuentes-nasa-usadas). Este documento prepara el contenido del formulario; no sustituye las guías, el README de Mafer ni la confirmación del portal.

## Prerrequisitos del portal

| Dato | Estado comprobado / siguiente acción |
| --- | --- |
| Página oficial del equipo/proyecto | Balam confirmó en el chat que aún no tenemos la URL. No se verificó si el equipo existe en el portal. Crear o localizar la página es un paso previo; no inventar un enlace. |
| Nombre del proyecto | AgroHive. |
| Nombre del equipo | Code Hive según el repo; confirmar que coincida con el portal. |
| Team Owner y responsable del envío | Sin confirmar. Mompin recibió el pedido de Balam de ajustar A5.9 y asignar este paso previo (buzón #256). |
| Integrantes | Alias del repo: Mompin, Eduardo, Mafer, balam. Nombres registrados, aceptación en la sede y pestaña Members sin verificar. |
| Sede prevista | Boca del Río, México, presencial, USBI Veracruz. Página pública de sede abierta; no prueba que los integrantes estén inscritos. |
| Juicio / límite local (V-01) | No se obtuvo un horario verificable de la página pública. Confirmarlo con el Local Lead. No confundirlo con el cierre global. |
| Cierre global | 15/11/2026, 23:59, hora de la sede según A0.5; confirmar la zona asignada al equipo en el portal. |
| OK del equipo | Pendiente; no se aceptaron declaraciones ni se pulsó Submit for Judging. |

Sede: [página oficial de Boca del Río](https://www.spaceappschallenge.org/2026/local-events/boca-del-rio/). La página muestra a Gonzalo Ortiz Chavez como Local Lead y la dirección de USBI Veracruz. Su contenido local es publicado por el organizador. Consultar allí su contacto; esta preparación no le envió mensajes.

## Enlaces y comprobaciones públicas

Las pruebas se hicieron sin iniciar sesión. El estado corresponde a la consulta indicada arriba, no a una garantía futura.

| Uso | Enlace | Resultado |
| --- | --- | --- |
| Código fuente | [MompinJ/AgroHive](https://github.com/MompinJ/AgroHive) | Repositorio público visible sin autenticación. README principalmente en español; revisión de A5.7 pendiente. |
| Aplicación publicada / candidato a Final Project | [AgroHive](https://64-23-143-102.sslip.io/) | HTTP 200 y título AgroHive · Inicio. No demuestra que el último `main` esté desplegado. |
| Control de versión del servidor | [/health](https://64-23-143-102.sslip.io/health) | HTTP 200: commit `23f8a53`, contratos `0.12.2`, servicio `agrohive-api`. Difiere del snapshot local; repetir tras el despliegue. |
| Herramienta de medición | [/medir.html?auto=0](https://64-23-143-102.sslip.io/medir.html?auto=0) | HTTP 200 pero título AgroHive · Inicio y sin botón Empezar medición. No se considera publicada: resultado compatible con fallback de la SPA antigua. No es el enlace de Project Demo. |
| Project Demo (video corto o diapositivas) | Sin URL | No se ha recibido un entregable público válido para este campo. El enlace de la aplicación no sustituye automáticamente el de la demostración. |
| Página NASA del equipo/proyecto | Sin URL | Pendiente del paso previo confirmado por Balam. |

Eduardo recibió la diferencia entre `/health`, la ruta de medición y el repo (buzón #260). No se modificó el servidor. Tras su aviso, volver a probar la aplicación, los recursos, la versión, la comparación, los controles de tiempo y las vistas 2D/3D; guardar captura y resultado del commit realmente publicado.

## Textos en inglés para revisión y copiado

**Borradores del equipo, no contenido aprobado ni publicado.** Ajustar a los campos y límites que muestre el formulario real cuando exista su URL. Los textos describen el código del snapshot, no certifican el despliegue ni la validación científica en campo. No copiar los avisos editoriales de este documento al formulario.

### Project Name

AgroHive

### High-Level Project Summary

AgroHive helps farmers explore crop-rotation choices using NASA climate history. Users choose crops and planting dates, then compare their plans under dry, typical and wet conditions drawn from real historical years. A browser-based water-balance model estimates crop water demand, unmet demand and deep drainage. An interactive 2D or voxel 3D view makes the results easier to inspect, while comparison cards explain the evidence, assumptions, missing inputs and risks behind each alternative.

Our demonstration uses a fictitious two-hectare plot in Isla, Veracruz, Mexico, with climate and soil estimates from real sources. The default comparison includes three rotation plans. The ranking evaluates robustness across historical scenarios; it does not estimate harvest yields or farm income. Farmers and local agricultural specialists retain responsibility for decisions and field validation.

### Link to Project Demo

**Pendiente fuera del texto:** insertar el enlace público aprobado de la demo del equipo. No se crea video ni presentación con esta tarea. El guion histórico `guion-video-borrador.md` propone 2–3 minutos y no cumple por sí solo el límite global verificado en A0.5.

### Link to Final Project

Candidato: https://64-23-143-102.sslip.io/

Código de respaldo: https://github.com/MompinJ/AgroHive

**Pendiente fuera del texto:** aprobar el enlace final tras verificar el despliegue, su acceso anónimo y los requisitos de idioma. Fijar también el commit evaluado.

### Detailed Project Description

Farmers must choose crop sequences and planting dates while facing variable rainfall and incomplete local information. AgroHive makes these choices visible through a what-if simulation grounded in historical weather and documented crop parameters.

Users can explore the Isla demonstration or draw a plot. They edit crop-rotation plans and planting dates, inspect the source of available planting-calendar guidance, and choose a historical scenario. The demonstration compares R1, R2 and R4. Changing the observation date or switching between 2D and 3D uses the stored simulation results.

The simulation runs in a Web Worker in the browser. NASA POWER supplies the historical climate series. The model uses FAO-56 methods for reference evapotranspiration, crop water demand and a root-zone water balance. It reports water deficit and deep percolation. Additional comparison pillars describe planting-calendar compatibility and time with crop cover where the necessary inputs are available. The ranking uses the same available pillars across the compared plans and exposes its assumptions and weights.

The interface presents rotation comparisons, water-balance charts, cell details, sources and warnings. Its 2D view provides an alternative when WebGL is unavailable. The 3D view represents the motor's outputs, including crop stages and qualitative plant states. The local demonstration package keeps the main example usable when external data services are unavailable.

The prototype's limits are explicit. Regional climate is shared by the plot's cells; it is not a satellite measurement of each small block. Soil maps provide estimates. Missing essential inputs produce NO_EVALUABLE and an explanation. Crop-cover duration is not a measured erosion rate. Any optional next-season band is exploratory and is excluded from the historical robustness ranking. The prototype has not been validated as an agronomic recommendation system in the field.

The implementation uses React, Vite and TypeScript, a TypeScript simulation Worker, Three.js for the 3D view, Leaflet and Turf for plot interaction, and a Python/FastAPI data proxy and cache. Shared JSON Schemas define the data contracts. The goal is to help farmers and agricultural advisers discuss alternatives with visible evidence and uncertainty.

### Use of Super Intelligence (SI)

**Revisión humana obligatoria antes de copiar:** confirmar herramientas realmente utilizadas, autoría de la idea, procedencia del arte y cumplimiento de marcas/metadatos. No se certifica esa revisión con este borrador.

Our team used AI-assisted development tools to help write and review code, tests and documentation, transcribe sourced crop and soil parameters, and create project artwork and voxel models. Team records list Claude, Codex, Cursor, ChatGPT, Gemini and Copilot. The final tool list and each contribution must be confirmed by the team.

The simulation and ranking use deterministic code and documented inputs. A language model does not supply the numerical simulation outputs or decide the ranking. The application currently explains results through templates tied to those outputs. Missing inputs remain explicit.

The team is reviewing generated-media labels, code and data attribution, resource permissions and the scientific parameter transcription. We do not present NASA branding as our own or imply NASA endorsement. The origin of the project idea must be confirmed by the team before making the required originality declaration.

### NASA Data

NASA POWER provides the historical meteorological inputs used to construct the dry, typical and wet scenarios and run the water-balance simulation. The demonstration's stored climate series runs from October 2005 through December 2025; scenarios use complete agricultural years. The source and the real year associated with each scenario remain visible. Climate resolution is regional, so the plot's cells share this weather series.

POWER project: https://power.larc.nasa.gov/

Daily point service: https://power.larc.nasa.gov/api/temporal/daily/point

Referencing guidance: https://power.larc.nasa.gov/docs/referencing/

Additional NASA evidence datasets implemented in the repository's data API include GPM IMERG precipitation via POWER, MODIS MOD13Q1 NDVI, and SMAP surface soil moisture. These are separate from the core water-balance and ranking inputs; API availability does not mean that the default interface displays each layer. The team should only describe a layer as demonstrated after checking the final deployed workflow.

**Fuente interna:** `datos/demo/respuestas/serie-clima.json`, `docs/04`, `docs/05` y `README.md`. Confirmar que POWER figura en Resources del reto seleccionado (V-02) y conservar la cita de NASA POWER del README revisado; no se convierte la referencia de este borrador en una licencia.

### Space Agency Partner Data and Other References

**Base para completar References:** usar la tabla revisada de fuentes y condiciones del README de A5.7. Este inventario no reemplaza citas completas, atribuciones ni permisos. Se relacionan método e implementación, no una lista de recursos supuestamente demostrados en producción.

- NASA POWER: historical meteorological inputs and the daily point API, with the version and access date from the archived responses.
- FAO Irrigation and Drainage Paper 56, Allen et al. (1998): evapotranspiration, crop coefficients and root-zone water balance. https://www.fao.org/4/x0490e/x0490e00.htm
- FAO EcoCrop, accessed through Recocrop: crop environmental ranges. https://github.com/cropmodels/Recocrop
- Saxton and Rawls (2006): soil-water estimates from texture and organic matter. https://doi.org/10.2136/sssaj2005.0117
- ISRIC SoilGrids and OpenLandMap: estimated soil properties. https://www.isric.org/explore/soilgrids and https://openlandmap.org/
- SIAP and INIFAP: documented crop presence and planting-calendar references for the demonstration. Use the exact publication citations attached to the catalog records.
- Open-Meteo, ECMWF and Copernicus where applicable: weather fallback and exploratory seasonal inputs. https://open-meteo.com/
- Tilezen/Terrain Tiles and their underlying DEM providers: elevation, with their specific attributions. https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- Esri World Imagery and OpenStreetMap contributors: basemaps and their service conditions. https://goto.arcgisonline.com/maps/World_Imagery and https://www.openstreetmap.org/copyright
- React, Vite, TypeScript, Three.js, Leaflet, Turf, Recharts, FastAPI and the dependencies declared in the repository's package/requirements files; preserve their licenses and credits.
- Team-created code, SVG crop icons, voxel models and generated illustrations: identify human and AI contributions using the final A5.7 disclosure.

If optional API evidence is included, use its exact product/provider citation from README and the data response: MODIS MOD13Q1 V061 through Planetary Computer, IMERG through POWER, SMAP, and any regional data actually demonstrated. Verify provider terms before claiming permission to redistribute.

## Checklist de cierre y evidencia que falta

| Paso | Responsable / evidencia esperada | Estado |
| --- | --- | --- |
| Crear/localizar página del equipo y asignar Team Owner | Equipo/Mompin; URL real y responsable confirmado | Pendiente confirmado por Balam |
| Confirmar miembros aceptados y sede común | Responsable del portal; revisión de Members | Sin verificar |
| Confirmar horario de juicio local y zona del portal | Equipo con Local Lead; aviso verificable | V-01 pendiente |
| Cerrar README, citas, permisos y declaración de IA | Mafer + revisión humana del equipo | A5.7 en curso según tablero |
| Confirmar idea humana y originalidad, con referencias externas | Equipo; no se acepta la casilla por anticipado | Pendiente |
| Resolver inglés del formulario y materiales enlazados | Equipo; revisar alcance sobre la app con la sede | Aplicación/README actuales en español |
| Confirmar marcas de medios y metadatos de IA | Equipo; revisión visual y de archivos | Pendiente según README |
| Revisar materiales sin imágenes, voz u otra representación de menores de 18 años | Equipo; revisión de todos los medios enlazados según A0.5 | Sin verificar |
| Preparar demo válida y enlace público propio | Equipo; tarea no reasignada al carril Balam | Sin URL ni entregable aprobado |
| Verificar fuentes NASA aceptadas para el reto | Equipo; Resources del reto seleccionado | V-02 pendiente de comprobación final |
| Actualizar y probar el despliegue final | Eduardo despliega; revisión de interfaz posterior | Consulta pública aún en `23f8a53` |
| Comprobar enlaces desde sesión anónima | Responsable del envío; demo y proyecto accesibles | Repo/app accesibles; demo/portal faltantes |
| Revisar campos y límites reales del formulario | Responsable del portal y equipo | Borradores preparados; formulario no inspeccionado |
| Obtener OK del equipo | Responsable del envío; aprobación explícita | Pendiente |
| Enviar y guardar confirmación | Responsable autorizado; fecha, URL, commit y captura del banner | No ejecutado |
| Si se edita después del envío, volver a enviar dentro del plazo | Responsable autorizado; nueva confirmación y versión final | Solo aplica tras una entrega efectiva |

A5.9 permanece sin completar hasta la confirmación efectiva del envío. Si el equipo decide no optar a una modalidad de evaluación, registrar esa decisión sin fingir que se cumplieron sus requisitos.

## Registro de la entrega efectiva (rellenar después)

No hay datos de envío que registrar todavía. Cuando exista confirmación, anotar en este apartado: URL oficial del proyecto, responsable, fecha/hora/zona, commit publicado, URL de demo, versión de los textos, OK del equipo y ruta de la captura de confirmación. Nunca guardar credenciales, tokens ni información privada de las cuentas.
