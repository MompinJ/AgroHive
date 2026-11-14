# AgroHive (Code Hive): borrador del README para A5.7

> **Borrador para Mafer (dueña de A5.7).** No reemplaza a `README.md` todavía. Cada afirmación remite al documento o contrato de donde sale; lo que falta confirmar va marcado `[VERIFICAR]`. Antes de publicarlo, revisar las fechas, el estado de las actividades en `docs/14` y las reglas oficiales del reto (V-03, V-04).

## Qué es

AgroHive es un **simulador visual "what if"** que compara **rotaciones de cultivos** con la historia climática real de **NASA**, para el reto *Field Shift: Adapting Farms with NASA Data* del NASA Space Apps Challenge 2026 (sede Boca del Río, Veracruz). Fuente: `docs/00`, `docs/02`.

- **No busca la rotación de mayor rendimiento, sino la más robusta:** la que no colapsa en el peor escenario histórico (`docs/00`, `docs/05` paso 7).
- **Arquitectura mundial, demo validada en Isla, Veracruz:** funciona en cualquier coordenada con fuentes globales. Las fuentes de un país (SIAP e INIFAP en México) se suman encima cuando la coordenada cae ahí (`docs/13`, "Alcance geográfico").
- **Parcela de demo:** 2 ha ficticias en Isla (municipio INEGI 30/077), con coordenadas ilustrativas (`contratos/ejemplos/parcela.ejemplo.json`, `datos/demo/LEEME.md`).
- **La demo compara por defecto R1, R2 y R4** y muestra como sugerida **R4, milpa sembrada dentro de las ventanas de INIFAP**. R3 (frijol-frijol) queda disponible en el selector (`docs/13`). El orden que se ve es el que calcula el motor.
- **La decisión final es del agricultor.** AgroHive no reemplaza a un agrónomo (`docs/00`, `docs/10`).

## Cómo correrlo

Requisitos: Node.js 20.19+ o 22.12+ y Python 3.12 (`web/README.md`, `api/README.md`).

### Web (interfaz y motor)

```bash
cd web
npm install
npm run dev          # abre http://127.0.0.1:5173
npm test             # pruebas del motor y de la interfaz
npm run build        # comprueba tipos y genera dist/
```

En desarrollo, la web llama a la API pública. Para usar una API local, se define `VITE_API_URL` (por ejemplo `VITE_API_URL=http://127.0.0.1:8010 npm run dev`); ver `web/src/api/README.md`.

### API (datos)

```bash
cd api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
.venv/bin/python -m pytest -q        # sin red: usa respuestas reales guardadas
```

La documentación interactiva está en `/docs`. No hay llaves en el repo. `EARTHDATA_TOKEN` solo hace falta para `/api/smap` y va en el entorno del servicio (`api/README.md`).

### Demo sin internet

El paquete `datos/demo/` (A2.4) trae la caché de la API para la parcela demo. Si a la API le falta su caché local, la lee de ahí, y `GET /api/clima`, `POST /api/elevacion`, `GET /api/suelo` y `GET /api/proxima-temporada` responden sin red. La web debe pedir la ventana `2005-10-01` a `2025-12-31` y el centroide de la parcela; otra zona sin red responde 503 con `ERROR_DATOS` (`datos/demo/LEEME.md`).

### Verificaciones antes de integrar

`npm test` en `contratos/`, `pytest` en `api/`, `node datos/catalogos/validar.mjs` y `python -m unittest discover -s datos/catalogos`, `npm test` y `npm run build` en `web/` (`AGENTS.md`).

## Método

Todo cálculo vive en el **motor**, que corre en el navegador dentro de un Web Worker (`web/src/motor/`). La interfaz y el 3D solo muestran lo que entrega el motor (`docs/05`, `docs/08`, `docs/13`).

1. **Escenarios históricos:** años reales seco, habitual y lluvioso, cerca de los percentiles p10, p50 y p90 de la lluvia de las temporadas PV + OI de SIAP, en 20 años agrícolas (2005-10 a 2025-12). Siempre se muestra el año real. No son una predicción (`docs/04`, `docs/05` paso 1, `contratos/clima-escenario.schema.json`).
2. **Clima por ciclo:** cada ciclo se simula en su temporada típica (PV u OI) dentro del año del escenario. La fecha de siembra la elige el usuario y el selector la sugiere desde el calendario local, explicando de dónde sale (`docs/05` paso 2, `contratos/plan-siembra.schema.json`, `contratos/calendario-local.schema.json`).
3. **Balance de agua FAO-56 por bloque:** ET0, ETc = Kc × ET0 y un balance de cubeta con agua disponible (TAW) según el suelo. La percolación profunda sigue la ecuación 88 de FAO-56. La humedad inicial puede venir de `GWETROOT` de POWER convertida a fracción de TAW (`docs/05`, `docs/13`).
4. **Pilares por rotación y escenario:** déficit hídrico, exceso de agua, compatibilidad de ciclo, protección del suelo (índice relativo, no toneladas), riesgo por calor y aporte indirecto. Si un pilar no tiene datos, sale `NO_EVALUABLE` con sus números en `null` (`docs/05` paso 6, `contratos/resultado-rotacion.schema.json`).
5. **Ranking B:** puntaje compuesto por escenario, robustez = peor puntaje, minimax del arrepentimiento y desempate por promedio. Los pesos son iguales y se declaran `SUPUESTO` salvo que haya fuente o prioridades del usuario. El criterio A (solo pilar hídrico) queda de respaldo (`docs/05` paso 7, `docs/13`).
6. **Próxima temporada (aproximada):** una banda p10 a p90 por mes durante 6 meses: la distribución histórica de cada mes desplazada por la anomalía del pronóstico estacional SEAS5, sin tendencia. Por rotación se usan años análogos reales. Siempre es `EXPLORATORIO`, nunca una cifra y nunca entra al ranking (`docs/13`, `contratos/proxima-temporada.schema.json`).
7. **Explicación:** cada rotación lleva una tarjeta con por qué, evidencia (año real, cifras), beneficios, huecos y riesgos, generada por plantilla (`docs/05` paso 8).

Estados de cada resultado: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`. Un dato faltante nunca se convierte en cero (`docs/04`).

## Fuentes y datasets

### NASA

| Fuente | Qué aporta | Acceso | Licencia y cita |
| --- | --- | --- | --- |
| **NASA POWER** (diario, comunidad AG) | Lluvia, temperatura, radiación, humedad, viento y `GWETROOT` (humedad de raíz, MERRA-2); base del MVP | API sin llave | CC BY 4.0; citar el proyecto POWER y la versión y fecha de consulta ([referencing](https://power.larc.nasa.gov/docs/referencing/)) (`AgroVault/Compartido/APIs.md`) |
| **GPM IMERG** (`IMERG_PRECTOT` vía POWER, en UTC) | Lluvia satelital como evidencia; no entra al balance ni a los escenarios (A4.10, `[VERIFICAR]` estado en `docs/14`) | Vía POWER, sin cuenta | Como POWER; `[VERIFICAR]` cita propia de IMERG |
| **SMAP L3** | Humedad del suelo superficial (~0-5 cm, 36 km) como contraste; no entra al ranking ni al balance (A4.8) | Earthdata con token | `[VERIFICAR]` política y cita de NASA Earthdata |
| **MODIS MOD13Q1** | NDVI (250 m, 16 días) como evidencia; no entra al ranking (A4.11, `[VERIFICAR]` estado) | Microsoft Planetary Computer, colección `modis-13Q1-061`; respaldo REST de ORNL DAAC (no se llama en vivo) | Didan, K. (2021), doi:10.5067/MODIS/MOD13Q1.061; respaldo `doi:10.3334/ORNLDAAC/1600` (`docs/04`); `[VERIFICAR]` términos de Planetary Computer |

### Fuentes no NASA

| Fuente | Qué aporta | Licencia y cita |
| --- | --- | --- |
| **ISRIC SoilGrids** (WCS) | Textura, pH y carbono orgánico de 0 a 30 cm, 250 m, siempre `SUPUESTO` | CC BY 4.0 (`AgroVault/Compartido/APIs.md`) |
| **OpenLandMap-soildb** | Segunda estimación de suelo a 30 m, para comparar con ISRIC | `[VERIFICAR]` licencia (Zenodo 15470432; artículo ESSD 2026) |
| **AWS Terrain Tiles (Terrarium)** | Elevación por defecto | Atribución a Mapzen y a las fuentes del DEM (`APIs.md`); `[VERIFICAR]` texto exacto |
| **Open-Meteo** | Respaldo de clima (ERA5), respaldo de elevación (Copernicus GLO-90) y pronóstico estacional (ECMWF SEAS5) | CC BY 4.0, uso no comercial; atribuir a ECMWF y a Copernicus DEM (`APIs.md`) |
| **FAO-56** (Allen et al., 1998) | Kc y etapas (Tablas 11 y 12), agua del suelo (Tabla 19), Zr y p (Tabla 22), TAW (ec. 82), percolación (ec. 88) | Citar el documento; `[VERIFICAR]` términos de uso de FAO |
| **FAO EcoCrop** | Rangos de temperatura y lluvia anual por cultivo | Copia en el paquete R Recocrop (commit `3a01315`) porque la página de FAO no responde; `[VERIFICAR]` licencia de la copia (`datos/catalogos/README.md`) |
| **Saxton y Rawls (2006)** | TAW y retención (θsat, θFC, θWP) por pedotransferencia para cualquier textura | Soil Sci. Soc. Am. J. 70(5): 1569-1578, doi:10.2136/sssaj2005.0117 |
| **WoSIS Procedures Manual** (Batjes y van Oostrum, 2023) | Factor 1.724 de carbono orgánico a materia orgánica | ISRIC Report 2023/01, p. 25 (`docs/01`) |
| **SIAP** | Cierre agrícola municipal de Isla, 2021-2025: presencia de cultivos y temporadas PV/OI | Datos abiertos ([portal](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php)); `[VERIFICAR]` licencia |
| **INIFAP** | Ventanas de siembra del sur de Veracruz (guía de maíz de temporal 2022; Agenda Técnica Agrícola de Veracruz 2015) | Publicaciones del Gobierno de México; `[VERIFICAR]` términos (`datos/catalogos/README.md`) |

Modelos 3D propios, generados con el agente `modelador-voxel` del equipo (`docs/07`).

## Límites y supuestos declarados

Fuente: `docs/00` ("Qué NO afirmar nunca"), `docs/04`, `docs/10` ("Límites científicos"), `docs/11` (riesgos).

- **No predice una temporada exacta.** Los escenarios son años históricos reales y la próxima temporada es un rango aproximado, nunca una cifra.
- **No predice cosechas, rendimientos ni ganancias.**
- **No mide pH ni fertilidad.** Textura, pH y TAW son estimaciones de mapas globales o de pedotransferencia, siempre `SUPUESTO`.
- **Resolución gruesa del clima:** la parcela cabe en una celda de POWER (0.5 × 0.625 grados), así que el clima es igual en toda la parcela. Las diferencias entre bloques vienen de cultivo, suelo y relieve.
- **`GWETROOT` es fracción de saturación** (~1 m, regional), no fracción de TAW: se convierte antes de usarse, y sin la retención del suelo no se usa.
- **El 3D es cualitativo:** muestra etapas y estados, no alturas ni biomasa.
- **Simplificaciones:** cubeta de agua, índice relativo de erosión, parámetros de tablas generales, pesos iguales `SUPUESTO` en el ranking y normalización del exceso de agua `SUPUESTO`.
- **Parámetros elegidos por el equipo** que una persona debe revisar: filas de FAO-56, chile como pimiento dulce, raíz en el máximo del rango y grupos del selector (`datos/catalogos/README.md`).
- **Un cultivo que la fuente local no registra en el lugar** se muestra, pero no se recomienda.
- **IMERG y POWER difieren** en tormentas y en años recientes. Los escenarios usan POWER; con IMERG serían otros años (riesgo declarado en `docs/11`).
- **Sin validación local** mientras no la haya: toda recomendación requiere validación en campo con un técnico.

## Declaración de uso de IA `[VERIFICAR]`

> Pendiente de las reglas oficiales del reto sobre IA, código previo, marca e imágenes de NASA (V-03, V-04 en `docs/11`; A0.5 en `docs/14`). No publicar esta sección hasta confirmarlas.

Lo que consta en el repo: el equipo usó asistentes de IA (Claude, Codex, Cursor, ChatGPT, Gemini, Copilot) para escribir código, documentación y modelos 3D. Las decisiones, las fuentes y la revisión son humanas (`docs/14`, tablero de reparto; `AGENTS.md`). Las cifras científicas llevan fuente verificada por una persona (`AGENTS.md`). Ningún LLM decide ni inventa datos: si se usa, solo redacta sobre números ya calculados (`docs/05` paso 8).

## Equipo

Code Hive: Mompin, Eduardo, Mafer y balam (`docs/14`, tablero de reparto).
