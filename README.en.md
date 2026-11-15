# AgroHive · Code Hive

[Versión en español](README.md) · English version

> **Status of this document (November 15, 2026).** Licenses and challenge rules were checked against their official pages or public records, and whoever did it was an AI session, not a person. **A human review of the licenses, of the AI-use statement and of the challenge rules is still missing.** Anything that could not be confirmed is marked `[VERIFICAR]` (to verify) and summarized at the end, in “Pending human verification”. The markers `[VERIFICAR]` and `[DECIDIR]` (to decide) are kept in Spanish so they can be searched in both files.

A visual **what-if crop rotation simulator** for [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/), NASA Space Apps Challenge 2026, Boca del Río, Veracruz local event.

AgroHive compares alternatives against real historical NASA climate years and shows water demand, sowing compatibility and soil coverage. It looks for alternatives that remain robust under adverse scenarios. **It does not predict harvests, income or an exact season, and it does not replace an agronomist.** The farmer makes the final decision.

**[Open the demo](https://agrohive.space)** · [Engine method](docs/05-MOTOR-SIMULACION.md) · [Documentation](docs/00-LEEME-PRIMERO.md)

Observed on **November 15, 2026**: the [public API](https://agrohive.space/health) returned `status: ok` and contract `0.16.0`; the commit it reports changes with every deployment. This identifies the API at that time, not the build of every web asset. The service runs on a team member's server and its address may change.

## What you can do

- Choose one of **six example plots**: Bajío (Mexico), Sorriso (Brazil), Uasin Gishu (Kenya), Ludhiana (India), Tierra de Campos (Spain) and Iowa (USA). These are fictitious outlines of about 2.8 ha on real cropland, with recorded API responses; each plot has 71 cells.
- Draw your plot and query global climate, soil and elevation sources. Coverage and availability depend on each provider; missing data retain their reason and status and are never replaced with zero.
- Select from **40 crops**, change dates and sequences, and compare rotations. Examples start with two or three alternatives depending on their suggested crops; Iowa starts with two. More can be added.
- Explore dry, typical and rainy years, view results in a voxel 3D scene, and inspect evidence, assumptions and sources.
- Consult an exploratory next-season band and regional evidence of vegetation, moisture and recorded pest presence.

The catalog includes five stage models, five lightweight blocks and five icons per crop: **200 detailed models, 200 blocks and 200 icons**. The interface limits plots to 200 cells. Without WebGL, engine figures remain available; the main flow has no fallback 2D mode. Isla, Veracruz remains an internal engine test.

## Run the project

Requirements: **Node.js `^20.19.0 || >=22.12.0`** and **Python 3.12**.

```bash
git clone https://github.com/MompinJ/AgroHive.git
cd AgroHive/web
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Development uses the public API by default. To use a local API, set `VITE_API_URL` from `web/`:

```bash
# Bash (Linux/macOS)
VITE_API_URL=http://127.0.0.1:8010 npm run dev
```

```powershell
# PowerShell (Windows)
$env:VITE_API_URL = 'http://127.0.0.1:8010'
npm run dev
```

### Local API

In another terminal, from the repository root:

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

Interactive documentation is at `http://127.0.0.1:8010/docs`. Configure `EARTHDATA_TOKEN` only in the service environment for SMAP queries; it is not included in the frontend or repository. See the [API](api/README.md) and [web client](web/src/api/README.md).

### Examples without internet

The [six examples](datos/demo/ejemplos/LEEME.md) load local responses included in the web build without querying the API. Serve the web app locally with its assets available; opening a public URL for the first time requires connectivity. Base maps, place search and external links depend on internet access.

On Linux/macOS, `bash herramientas/demo-sin-red.sh` combines example caches and starts the API with outbound internet access blocked. The script uses Unix virtual-environment paths; it is not a PowerShell launcher. Recorded responses cover specific coordinates and periods, such as `2005-10-01` to `2025-12-31` for climate: this fallback does not cover arbitrary plots. See the [script](herramientas/demo-sin-red.sh) and [fallback guide](docs/demo-sin-red.md); the latter also retains historical results for the Isla package.

## How comparison works

1. **Historical scenarios.** Selects real years near rainfall p10, p50 and p90 for PV + OI seasons, using the SIAP windows applied by the method. Examples contain 20 complete agricultural years within the 2005-10 to 2025-12 series. It retains each real year; this is not a forecast. PV and OI refer to Mexico's spring–summer and autumn–winter agricultural seasons.
2. **Dates and calendar.** The user chooses sowing dates. The calendar combines GGCMI, MIRCA2000 and FAO Crop Calendar, with SIAP and INIFAP in Mexico. Regional windows and crop equivalences are identified.
3. **FAO-56 balance.** ETc = Kc × ET0 and a daily bucket balance per block, with soil-based TAW, water stress and deep percolation based on equation 88. `GWETROOT` is a regional saturation fraction and is converted before use as initial moisture. The current balance does not include irrigation, runoff or capillary rise.
4. **Pillars.** Water deficit, excess/percolation, sowing compatibility and soil protection. Protection uses **bare-soil days**: the erosion index remains `null` because subdaily intensity and sourced local factors are absent. Heat and indirect contribution are complementary and do not enter the score; heat is `NO_EVALUABLE` because sourced thresholds are absent.
5. **Ranking B.** Builds scores from comparable pillars. Orders by **lowest maximum regret**, breaking ties by higher average and then identifier. It also reports robustness as the worst score. Equal weights and excess normalization are labeled `SUPUESTO` (assumption). Criterion A, based on water deficit, is the fallback when only that pillar supports comparison. `EXPLORATORIO` alternatives show metrics without a recommendation position.
6. **Next season.** Monthly p10–p90 bands over six months: historical distributions shifted by the SEAS5 anomaly, without a trend, and evaluation using real analog years. It is `EXPLORATORIO` and does not enter ranking. Monthly band endpoints must not be added together.
7. **Explanation.** Cards and Esquilote tips use templates over available data. NDVI, SMAP, IMERG and pests provide context; they do not alter the balance or ranking.

Indicators are computed in a **browser Web Worker**. The interface and scene represent its results. Status codes: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS` and `RESPALDO_HISTORICO`. A missing indicator is not turned into a valid number. See the [engine](docs/05-MOTOR-SIMULACION.md) and [contracts](contratos/). API fields, paths and status codes keep their original names.

## NASA data and citations

| Source | Use and reference |
| --- | --- |
| **NASA POWER** | Engine foundation: rainfall, temperatures, radiation, humidity, wind and `GWETROOT`. POWER Project, NASA Langley Research Center, funded by NASA Earth Science Division. Recorded responses: **Daily API v2.10.3**, accessed November 14, 2026. Cite service, version and access date following the [POWER guide](https://power.larc.nasa.gov/docs/referencing/). POWER's reference guide does not declare a license `[VERIFICAR]`. |
| **GPM IMERG through POWER** | Precipitation evidence, `IMERG_PRECTOT`: UTC daily sum of half-hourly data at 0.1°. POWER combines **Final Run and Late Run** depending on recency; the entire series is not identified as a single daily Final product. Its [methodology](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/) describes this combination and its [release history](https://power.larc.nasa.gov/docs/release-guide/) records IMERG v7B. Cite POWER as well. |
| **SMAP SPL3SMP v9** | Regional surface moisture at 36 km, informational evidence. O'Neill, Chan, Njoku, Jackson, Bindlish and Chaubell (2023), NASA NSIDC DAAC, [doi:10.5067/4XXOGX0OOW1S](https://doi.org/10.5067/4XXOGX0OOW1S). Provider queries require Earthdata; examples include recorded responses. [NSIDC citation guidance](https://nsidc.org/data/data-programs/nsidc-daac/citing-nsidc-daac). |
| **MODIS MOD13Q1 V061** | Regional NDVI through Planetary Computer, collection `modis-13Q1-061`, and recorded data. Didan (2021), *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*, [doi:10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061). ORNL REST was used to cross-check four dates, not as the live provider: [doi:10.3334/ORNLDAAC/1600](https://doi.org/10.3334/ORNLDAAC/1600). |

Data retain their product and provider conditions; access services have their own terms. See [Earthdata use guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance). Using NASA data does not imply NASA endorsement of AgroHive.

## Other sources and conditions

Third-party conditions apply to their materials independently of the project's own code license. Specific references, coordinates, dates and units accompany recorded data.

| Source | Contribution and documented conditions |
| --- | --- |
| **ISRIC SoilGrids** | Texture, pH and organic carbon estimates, 250 m, integrated over 0–30 cm. [CC BY 4.0](https://www.isric.org/explore/soilgrids). These are `SUPUESTO`, not field measurements. |
| **OpenLandMap-soildb** | Second soil estimate: 30 m layers, 2020–2022. Queried STAC collections declare CC BY 4.0. The 120 m Zenodo records are not presented as DOIs for the 30 m layers. Provenance and client: [API](api/README.md). |
| **Terrain Tiles / Terrarium** | Default elevation; not a direct NASA product. [Tilezen attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md): INEGI Continental relief 2016 in Mexico, NOAA ETOPO1 and USGS 3DEP/GMTED2010/SRTM depending on coverage. |
| **Open-Meteo / ECMWF / Copernicus** | ERA5 climate fallback, GLO-90 elevation and SEAS5 seasonal forecast. Data [CC BY 4.0](https://open-meteo.com/en/licence), with attribution and license link. Free service access has non-commercial terms; data licensing and service access are distinct. |
| **Esri World Imagery** | Satellite map subject to Esri terms. The item credits Esri, Vantor, Earthstar Geographics and GIS User Community. [Layer and conditions](https://goto.arcgisonline.com/maps/World_Imagery). Not included in the offline fallback. `[VERIFICAR]` by a person that direct use of the tiles from this web app complies with Esri's terms. |
| **OpenStreetMap** | Street map: © OpenStreetMap contributors, data [ODbL](https://www.openstreetmap.org/copyright). The map control includes “contributors”. The tile service also follows its [usage policy](https://operations.osmfoundation.org/policies/tiles/); a bulk download is not redistributed. |
| **GeoNames** | Place search through Open-Meteo, [CC BY](https://www.geonames.org/). The map control identifies both providers. |
| **FAO-56** | Allen, Pereira, Raes and Smith (1998), *Crop evapotranspiration*, tables 11, 12, 19 and 22; equations 52, 58, 80, 82–85 and 88. [Publication](https://www.fao.org/4/x0490e/x0490e00.htm) and [FAO terms](https://www.fao.org/contact-us/terms/en/). The catalog records table and row per parameter. Commercial use requires FAO's permission `[VERIFICAR]`. |
| **FAO EcoCrop / Recocrop** | Temperature and rainfall ranges, copy from [Recocrop](https://github.com/cropmodels/Recocrop), commit `3a01315`. Recocrop's GPL-3.0 code license does not itself grant rights to the FAO data. `[VERIFICAR]` the license of the data. |
| **Saxton and Rawls** | Retention and TAW pedotransfer: (2006), *Soil Sci. Soc. Am. J.* 70:1569–1578, [doi:10.2136/sssaj2005.0117](https://doi.org/10.2136/sssaj2005.0117). Tables 1 and 3; calculation labeled `SUPUESTO`. |
| **WoSIS** | Batjes and van Oostrum (2023), *WoSIS Procedures Manual*, ISRIC Report 2023/01, p. 25: factor 1.724 to convert organic carbon to organic matter. |
| **SIAP** | Municipal agricultural closing data 2021–2025 and crop presence. [Open data](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php): source acknowledgement and retention of conditions upon redistribution. [Extract provenance](datos/catalogos/fuentes/LEEME.md). |
| **INIFAP** | Cotaxtla rainfed maize guide (Tinoco Alfaro, 2022) and Agenda Técnica Agrícola de Veracruz (2015). Cited dates are extracted; publication texts are not redistributed as original project content. No reproduction terms were found in the PDFs `[VERIFICAR]`. |
| **GGCMI phase 3** | Global rainfed calendar at 0.5°. Jägermeyr et al. (2021), [doi:10.5281/zenodo.5062513](https://doi.org/10.5281/zenodo.5062513), CC BY 4.0. |
| **MIRCA2000 v1.1** | Cycle start and presence by rainfed area. Portmann, Siebert and Döll (2010), [doi:10.5281/zenodo.7422506](https://doi.org/10.5281/zenodo.7422506), CC BY 4.0. |
| **FAO Crop Calendar** | Sowing windows by country and crop in 57 countries. The team treats the extract as **CC BY-NC-SA 4.0**, separated in [its folder and notice](datos/calendario/fao-crop-calendar/LICENCIA.md). Licensing the code does not remove this restriction. One FAO record says CC BY 4.0 and another CC BY-NC-SA `[VERIFICAR]`. |
| **geoBoundaries gbOpen** | Mexican boundaries for matching SIAP; ADM2 CC BY 4.0 and ADM1 CC BY 3.0 IGO, according to extract metadata. The specific license of each file is in its metadata `[VERIFICAR]`. |
| **GBIF / EPPO** | Regional pest presence and hosts, an illustrative layer. Per-query citation: GBIF.org (date), *GBIF Occurrence Search*. Each record retains its publisher's license. For *Sphenarium purpurascens*: Quesada-Béjar et al. (2017), *Rev. Mex. Cienc. Agríc.* 8(6):1357–1370. `[VERIFICAR]` the license record by record. |
| **ESA WorldCover 2021 v200** | Cropland, class 40, 10 m. Zanaga et al. (2022), [doi:10.5281/zenodo.7254221](https://doi.org/10.5281/zenodo.7254221), [CC BY 4.0](https://esa-worldcover.org/en/data-access). © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. |
| **USDA CDL / NRCS SSURGO** | Iowa crops and soil. CDL is [public domain and freely redistributable](https://catalog.data.gov/dataset/cropland-data-layer); cite USDA NASS and layer year. The [SSURGO record](https://catalog.data.gov/dataset/soil-survey-geographic-database-ssurgo) declares public domain. [NRCS citation](https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo): Soil Survey Staff, NRCS, USDA, *Web Soil Survey*, with access date. The license was taken from the data.gov catalog; the NASS and NRCS pages read on Nov 15 do not declare it `[VERIFICAR]`. |
| **Köppen-Geiger** | Classification from POWER normals using Peel, Finlayson and McMahon (2007) rules. The scene's biome is decorative. |
| **Example photographs** | Author, URL, license and modifications per photograph in [credits](web/src/ui/assets/lugares/creditos.json). These are third-party materials, distinct from generated illustrations. |

## Scientific limits

- Climate is regional; example plots share one series across cells. POWER's meteorological resolution is approximately 0.5 × 0.625 degrees; IMERG has a different resolution.
- Balance differences between blocks come from crops, dates and available soil parameters. **Slope does not modify the current balance**; mean elevation is used in ET0 where applicable.
- Texture, pH and TAW are estimates, not laboratory analyses. `GWETROOT` represents a regional root zone of about one meter, not measured moisture in each block.
- The model does not estimate erosion, yield, prices, costs or pest damage. Percolation is not a validated waterlogging threshold. The 3D scene represents qualitative states, not biomass or actual height.
- General FAO-56/EcoCrop parameters, upper-end root depths and explicit equivalences are used, such as chili with sweet-pepper parameters. Durations are the sum of stages even where the table's printed total differs. [Parameter choices](datos/catalogos/README.md).
- The global calendar uses 0.5° cells and `SUPUESTO` equivalences for certain crops. FAO Crop Calendar combines national agro-ecological zones without published spatial boundaries; Mexican windows may be state- or district-level.
- Pest search uses a ±1.5° box; its extent in kilometers varies with latitude. Historical presence since 2000 does not imply next-season risk or loss.
- The model has no local agronomic calibration that would make its alternatives field recommendations. Professional judgment is required before agricultural decisions.

## AI use and rights

According to the team's record, the central idea comes from a human proposal. Claude, Codex, Cursor, ChatGPT, Gemini and Copilot assisted with code, tests and documentation. FAO-56/EcoCrop parameter extraction used AI assistance; each value retains its source. Software tests do not constitute agronomic validation. Several commits carry the tool's `Co-Authored-By` mark, but not all of them. **This section is pending human review.**

Voxel models and icons were generated through AI-assisted code and the `voxelkit.py` and `iconos2d.py` tools. The `terreno-hero`, `terreno-demo` and `terreno-poligono` illustrations were AI-generated; their [prompts](web/src/ui/assets/terreno-prompts.md) are retained. The [trailer](docs/trailer-30s.md) script and subtitles are in the repository; its English voice uses ElevenLabs TTS (`eleven_v4`, Brian) through Krea and acknowledges generation in the voice files' metadata.

The [seven-slide presentation script](docs/presentacion.md), speaker notes and design were drafted with Claude assistance from the documentation and engine regressions. The script includes an AI-use statement on the final slide and uses text, shapes and application screenshots.

Inside the application, explanations use deterministic templates: no LLM decides indicators or fills missing scientific data. The [submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) requires visible marks on generated images/video and acknowledgement in text and metadata for audio, code and data.

**The repository does not include a license file for its own code** (`[DECIDIR]` by the team). Third-party materials retain their conditions. [Space Apps terms](https://www.spaceappschallenge.org/legal/) require original content to be freely available or OSI-licensed and specify NASA distribution under Apache 2.0 if no OSI license is specified. This does not relicense FAO data or other third-party materials, nor does it alone establish eligibility of the full package.

## Space Apps submission

The [official guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) requests a name, summary, demo URL, final project URL, detailed description, SI/AI statement, NASA data and other provider references. The form and linked materials must be in English. The demo can be a video of **up to 30 seconds** or a presentation of **up to seven slides**, including title and introduction; video spoken in another language requires English subtitles. Links must be public and accessible without authentication.

Submission is confirmed in the portal through **Submit for Judging** and its confirmation; saving progress is not submission. This README documents the project and is not proof of submission. See [rules and local event](docs/02-EVENTO-Y-RETO.md) and the [form draft](docs/entrega-a5-9.md), which retains an earlier project snapshot.

## Structure and checks

| Folder | Contents |
| --- | --- |
| `web/` | React, Vite, TypeScript; interface, engine Worker and Three.js scene with InstancedMesh |
| `api/` | FastAPI; proxy, cache and provider clients |
| `contratos/` | JSON Schema, examples and generated TS types; source of truth for formats |
| `datos/` | Catalogs, calendars, extracts and example responses |
| `modelos/` | Blockbench models, lightweight blocks, icons and generators |
| `docs/` | Method, decisions, organization and submission materials |
| `herramientas/` | Voxel generation, data recording, offline fallback and team mailbox |

Run from the repository root before integration:

```bash
npm ci --prefix contratos
npm test --prefix contratos
node datos/catalogos/validar.mjs
npm test --prefix web -- --maxWorkers=1
npm run build --prefix web
```

Python tests from the root after installing the API environment:

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

`--maxWorkers=1` reduces simultaneous Vitest memory use. A successful build does not replace tests. Each owner works on their branch; only Mompin integrates into `main`, following [AGENTS.md](AGENTS.md) and the [current plan](docs/16-PLAN-DIA-FINAL.md).

## Pending human verification

Everything below is `[VERIFICAR]` or `[DECIDIR]` and needs a person; it has not been reviewed:

1. **Licenses and terms of use:** POWER (declares no license), FAO-56 (commercial use requires permission), EcoCrop data, Esri tiles, GBIF (per publisher), FAO Crop Calendar (one record says CC BY and another CC BY-NC-SA, and it is treated as NC-SA), INIFAP, SIAP, geoBoundaries (per file) and CDL and SSURGO (declared by the data.gov catalog, not by the NASS and NRCS pages that were read).
2. **AI-use statement:** that the team confirms the human idea, how the visible mark on AI-generated images and video is met, and the figure-by-figure check of the catalog parameters (on Nov 15 six rows were checked against FAO-56's web edition; the PDF was not read).
3. **Challenge rules:** a person must confirm them in the browser.
4. **License of the project's own code**, conditioned by FAO Crop Calendar (CC BY-NC-SA).
5. **No local agronomic validation:** no technician has reviewed the parameters or the recommendations.
6. **“Method and sources” is incomplete** as of Nov 15: it does not yet list the sources of SMAP, MODIS NDVI or GBIF pests (`web/evidencia/cifras-visibles-d10.md`).

**Code Hive team:** Mompin, Eduardo, Mafer and balam.
