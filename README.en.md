# AgroHive (Code Hive)

[Versión en español](README.md) · English version

> **About this translation.** This is an English translation of `README.md` (Spanish), as of Nov 15, 2026. If the two ever differ, the Spanish file is the reference. File names, API fields and status codes are not translated. The team's markers are kept in Spanish so they can be searched in both files: `[VERIFICAR]` (to verify), `[DECIDIR]` (to decide), `[DECIDIDO]` (decided), `[PROPUESTA]` (proposal) and `SUPUESTO` (assumption). Seasons PV and OI are the spring-summer and autumn-winter sowing seasons of Mexico's agricultural statistics (SIAP).

> **Status of this document (Nov 15, 2026).** Licenses and challenge rules were checked against their official pages, and whoever read them was an AI session, not a person. **A human review of the licenses and of the AI-use statement is still missing.** Whatever could not be verified is marked `[VERIFICAR]` and summarized at the end, in "What still needs verification".

## What it is

AgroHive is a **visual "what if" simulator** that compares **crop rotations** against the real climate history from **NASA**, for the challenge [*Field Shift: Adapting Farms with NASA Data*](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) of the NASA Space Apps Challenge 2026 (host site: Boca del Río, Veracruz). Source: `docs/00`, `docs/02`.

- **It does not look for the highest-yielding rotation, but the most robust one:** the one that does not collapse in the worst historical scenario (`docs/00`, `docs/05` step 7).
- **Worldwide architecture and worldwide demo:** it works at any coordinate with global sources. A country's own sources (SIAP and INIFAP in Mexico) are added on top when the coordinate falls there (`docs/13`, "Geographic scope").
- **Example plots on five continents** (Nov 15, `docs/13` "Worldwide demo"): Bajío (Mexico), Sorriso (Brazil), Uasin Gishu (Kenya), Ludhiana (India), Tierra de Campos (Spain) and Iowa (USA, with CDL and SSURGO). Fictitious polygons of about 2.8 ha on real cropland, with real data recorded from the API (`datos/demo/ejemplos/LEEME.md`). The user picks one or draws their own. Isla, Veracruz (`contratos/ejemplos/parcela.ejemplo.json`) remains as an internal engine test.
- **A catalog of 40 crops**, each with a five-stage 3D model, a lightweight block and a 2D icon (`datos/catalogos/`, `modelos/`). The parameters come from FAO-56 and FAO EcoCrop, with a source for every value (`datos/catalogos/README.md`). The sowing calendar has a worldwide base (GGCMI phase 3, MIRCA2000 and FAO Crop Calendar) and, in Mexico, SIAP and INIFAP on top (`docs/04`, `docs/13`).
- **The order shown is the one the engine computes** (ranking B, `docs/05`).
- **The final decision belongs to the farmer.** AgroHive does not replace an agronomist (`docs/00`, `docs/10`).
- **Published demo:** <https://64-23-143-102.sslip.io>. The latest deployment recorded in `docs/01` (Nov 15, 2026) is `main` `9fd83a9` (checked at `/health` on Nov 15), with `/health` reporting `versionContrato` 0.15.0; anything merged after that may not be published yet. It runs on a team member's server (`docs/13`): the address may change.

## Structure

| Folder | Contents |
| --- | --- |
| `web/` | React + Vite + TypeScript frontend; simulation engine in a Web Worker |
| `api/` | FastAPI backend (Python): proxy and cache for NASA POWER, Open-Meteo, elevation, soil |
| `contratos/` | Data contracts (JSON Schema), examples and generated TS types: source of truth for the formats |
| `datos/` | Catalogs (crops, soils, local calendar), worldwide calendar (extracts of GGCMI, MIRCA2000, SIAP and FAO Crop Calendar), pests, worldwide example plots (`demo/ejemplos/`) and the Isla package (internal test) |
| `modelos/` | `.bbmodel` 3D models of the 40 crops (five stages and a lightweight block each), soil tiles and mascot, plus 2D icons (`iconos2d/`); generated with code by AI agents, including `modelador-voxel` |
| `docs/` | Current documentation |
| `herramientas/` | `voxelkit.py`, `ejemplos/` (records the example plots), `buzon/` (messages between AI sessions over the local network), `prueba-movimiento/` (accessibility test of the scene in Chrome) and utilities |

Branches: `main` (stable), `balam`, `Mompin`, `Mafer`, `Eduardo`. Work happens on your own branch and is merged into `main`; one file, one owner.

## How to run it

Requirements: Node.js 20.19+ or 22.12+ and Python 3.12 (`web/package.json`, `api/README.md`).

### Web (interface and engine)

```bash
cd web
npm install
npm run dev          # opens http://127.0.0.1:5173
npm test             # engine and interface tests
npm run build        # checks types and generates dist/
```

In development, the web app calls the public API. To use a local API, set `VITE_API_URL` (for example `VITE_API_URL=http://127.0.0.1:8010 npm run dev`); see `web/src/api/README.md`.

### API (data)

```bash
cd api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8010
.venv/bin/python -m pytest -q        # offline: uses saved real responses
```

Interactive documentation is at `/docs`. There are no keys in the repo. `EARTHDATA_TOKEN` is only needed for `/api/smap` and goes in the service's environment, never in a file in the repo (`api/README.md`).

### Offline demo

The example plots (`datos/demo/ejemplos/`) are also the offline fallback: the front end loads their recorded responses without calling the API (`web/src/demo/ejemplos.ts`), and `herramientas/demo-sin-red.sh` starts the API offline with the cache of all the examples, so `GET /api/clima`, `POST /api/elevacion`, `GET /api/suelo`, `GET /api/proxima-temporada`, `/api/plagas` and `/api/calendario` answer for the coordinate of each example (`docs/demo-sin-red.md`). The Isla package (`datos/demo/`, A2.4) remains as an internal test. The web app must request the window `2005-10-01` to `2025-12-31` and the plot centroid; any other area offline answers 503 with `ERROR_DATOS` (`datos/demo/LEEME.md`).

### Checks before merging

`npm test` in `contratos/`, `pytest` in `api/`, `node datos/catalogos/validar.mjs`, `python -m unittest discover -s datos/catalogos`, and `npm test` and `npm run build` in `web/` (`CLAUDE.md`).

## Method

All computation lives in the **engine**, which runs in the browser inside a Web Worker (`web/src/motor/`). The interface and the 3D scene only show what the engine returns (`docs/05`, `docs/08`, `docs/13`).

1. **Historical scenarios:** real dry, normal and wet years, close to the p10, p50 and p90 percentiles of the rainfall of the PV + OI seasons of SIAP, over 20 agricultural years (2005-10 to 2025-12). The real year is always shown. They are not a prediction (`docs/04`, `docs/05` step 1, `contratos/clima-escenario.schema.json`).
2. **Climate per cycle:** each cycle is simulated in its typical season (PV or OI) within the scenario year. The user chooses the sowing date and the selector suggests one from the calendar (worldwide base from GGCMI, MIRCA2000 and FAO Crop Calendar, with SIAP and INIFAP on top in Mexico), explaining where it comes from; a crop with no source at that place is shown without a window (`docs/05` step 2, `contratos/plan-siembra.schema.json`, `contratos/calendario-local.schema.json`).
3. **FAO-56 water balance per block:** ET0, ETc = Kc × ET0 and a bucket balance with available water (TAW) according to the soil. Deep percolation follows FAO-56 equation 88. The initial moisture may come from POWER's `GWETROOT` converted to a fraction of TAW (`docs/05`, `docs/13`).
4. **Pillars per rotation and scenario:** water deficit, excess water, cycle compatibility, soil protection (a relative index, not tons), heat risk (currently `NO_EVALUABLE`: the catalog has no sourced heat-stress threshold for all crops) and indirect contribution. If a pillar has no data, it comes out `NO_EVALUABLE` with its numbers as `null` (`docs/05` step 6, `contratos/resultado-rotacion.schema.json`).
5. **Ranking B:** composite score per scenario, robustness = worst score, minimax regret and tie-break by average. Weights are equal and declared `SUPUESTO` unless there is a source or user priorities. Criterion A (water pillar only) stays as a fallback (`docs/05` step 7, `docs/13`). The interface starts with **Rotation 1, 2 and 3**, built from the suggested crops of the chosen example (R3 is the one that was called R4 until Nov 14; `docs/03`, `docs/13`, "Rotation names") and more can be added with "+". A plot generates at most 200 cells.
6. **Next season (approximate):** a p10 to p90 band per month for 6 months: the historical distribution of each month shifted by the anomaly of the SEAS5 seasonal forecast, without trend. For each rotation, real analog years are used. It is always `EXPLORATORIO`, never a single figure and never enters the ranking (`docs/13`, `contratos/proxima-temporada.schema.json`).
7. **Explanation:** each rotation carries a card with why, evidence (real year, figures), benefits, gaps and risks, generated from a template (`docs/05` step 8).
8. **Supporting layers that do not enter the engine or the ranking:** the tips from Esquilote (the on-screen mascot, with NDVI and SMAP soil moisture as regional evidence), the illustrative pest layer and IMERG satellite rainfall (`docs/06`, `docs/13`).

Result states: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`. A missing value is never turned into zero (`docs/04`).

## NASA data used by AgroHive

The challenge asks to detail which NASA data were used, and a global award requires at least one. All of those listed are among those the challenge mentions (SMAP, GPM, MODIS, NASA POWER...). Status as of Nov 15, 2026, according to `docs/14` and `docs/01`:

| NASA data | What for | Status |
| --- | --- | --- |
| **NASA POWER** (daily API, AG community) | Rainfall, temperatures, radiation, humidity, wind and `GWETROOT`. **It is the basis of the computation** | **In use** |
| **GPM IMERG** (variable `IMERG_PRECTOT`, through POWER) | Daily satellite rainfall as evidence; it does not enter the balance or the scenarios (A4.10) | **In use** (evidence). POWER returns data from 1998-01-01 (measured on Nov 14, 2026 on the demo plot; earlier it answers `-999`) |
| **SMAP L3** (`SPL3SMP`, 36 km) | Surface soil moisture, as a contrast (A4.8) | **In the public API** (`GET /api/smap`, Earthdata token only in the service environment; on Nov 14 it answered 200 with real moisture on the demo plot). Informative evidence: it does not enter the ranking; the front end uses it in Esquilote's tips (recent moisture, a regional figure) and the examples carry it recorded |
| **MODIS MOD13Q1** (NDVI) | NDVI as evidence (A4.11) | **In use** (evidence): `GET /api/ndvi` through Microsoft Planetary Computer and the demo package (`datos/demo/respuestas/ndvi.json`, 454 Terra composites, state `EXPLORATORIO`). It does not enter the ranking; the front end uses it in Esquilote's tips (greenness of the area) and the examples carry it recorded |
| **Elevation** | Plot relief. The default provider is AWS Terrain Tiles (Terrarium), not a direct NASA product | In use; see the DEM sources below |

### How each one is cited

Acknowledgement of NASA as a source, and citation of the data used. All verified on Nov 14, 2026 on the official pages indicated.

| Source | Citation | License or terms of use |
| --- | --- | --- |
| **NASA POWER** | *The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division.* With the service, version and date: **POWER Daily API v2.10.3** (version of the responses saved in `datos/pruebas-apis/`), consulted on Nov 14, 2026 ([reference guide](https://power.larc.nasa.gov/docs/referencing/)) | POWER's reference guide **does not declare a license** `[VERIFICAR]` |
| **GPM IMERG** | Huffman, G.J., Stocker, E.F., Bolvin, D.T., Nelkin, E.J. and Tan, J. (2023). *GPM IMERG Final Precipitation L3 1 day 0.1 degree x 0.1 degree V07* (GPM_3IMERGDF). GES DISC. [doi:10.5067/GPM/IMERGDF/DAY/07](https://doi.org/10.5067/GPM/IMERGDF/DAY/07) (record of NASA's CMR catalog, which gives coverage from 1998-01-01). It is obtained through POWER: cite POWER as well. `[VERIFICAR]` that POWER's `IMERG_PRECTOT` is this product (Final, V07, daily) | NASA data use and citation guidance (below); GES DISC citation instructions at <https://disc.gsfc.nasa.gov/data-guidelines> |
| **SMAP L3** (when used) | O'Neill, P., Chan, S., Njoku, E., Jackson, T., Bindlish, R. and Chaubell, J. (2023). *SMAP L3 Radiometer Global Daily 36 km EASE-Grid Soil Moisture, Version 9*. NASA NSIDC DAAC. [doi:10.5067/4XXOGX0OOW1S](https://doi.org/10.5067/4XXOGX0OOW1S) (authors and year per the DOI metadata in DataCite; the recommended-citation page that the catalog points to, `nsidc.org/about/use_copyright.html`, answered 404) | The catalog says: *freely, openly, and fully available to use without restrictions, provided that you cite the data according to the recommended citation*. Requires an Earthdata login |
| **MODIS MOD13Q1** | Didan, K. (2021). *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*. NASA LP DAAC. [doi:10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061). Data served by Microsoft Planetary Computer (collection `modis-13Q1-061`); the ORNL DAAC REST service ([doi:10.3334/ORNLDAAC/1600](https://doi.org/10.3334/ORNLDAAC/1600)) was only used to validate 4 dates and is not called live (`docs/13`). Planetary Computer terms `[VERIFICAR]` (V-25) | NASA data use policy (below) |

**NASA data use policy** ([Earthdata guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance)): *Unless the content is marked with a use restriction or license, data provided from a NASA-led mission are licensed as Creative Commons Zero (CC0)*; NASA must be acknowledged as the source, and citing the data is requested. *Non-NASA data available through the ESDIS project is subject to the license arrangements of the sponsoring organization.* It must not be suggested that NASA endorses the project, and its branding must not be used.

## Other sources and licenses

| Source | What it provides | License, citation and verification status |
| --- | --- | --- |
| **ISRIC SoilGrids** (WCS) | Texture, pH and organic carbon from 0 to 30 cm, 250 m, always `SUPUESTO` | **CC BY 4.0**, verified at [isric.org/explore/soilgrids](https://www.isric.org/explore/soilgrids): *publicly available ... under the CC-BY 4.0 License* |
| **OpenLandMap-soildb** | A second soil estimate at 30 m (clay, sand, silt, pH and organic carbon, 0-30 cm, 2020-2022), to compare with ISRIC | **CC BY 4.0**, declared by the STAC collection the API reads from, on each of the five layers (30 m version), and also declared by the Zenodo records, which hold the **120 m** version: clay `15528401`, sand `15528413`, silt `15528425`, pH `15471105` and organic carbon, median, `15535759` (`15535762` is the 84th percentile). The DOIs that the STAC cites for each collection (`15528399`, `15528411`, `15528423`, `15471103` and `15535756`) are records of **2000-2005**, not of the 2020-2022 layers that are read. Dataset authors: Consoli, Tian, Isik, Simoes, Hengl and others (OpenGeoHub, Land & Carbon Lab). `[VERIFICAR]` which Zenodo record corresponds to each 30 m layer (Eduardo, who maintains the client) |
| **AWS Terrain Tiles (Terrarium)** | Default elevation | Its record points to the [Tilezen attribution guide](https://github.com/tilezen/joerd/blob/master/docs/attribution.md), which requires attributing the DEM sources. Attribution to Mapzen is only required when using *the hosted Mapzen service*, which we do not use. Those that apply to a plot in Mexico and worldwide: *Mexico terrain data source: INEGI, Continental relief, 2016*; *Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration*; *United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey* |
| **Open-Meteo** | Climate fallback (ERA5), elevation fallback (Copernicus GLO-90) and seasonal forecast (ECMWF SEAS5) | Its license page says: *API data are offered under Attribution 4.0 International (CC BY 4.0)* (credit must be given and the license linked). Its README declares free access *for non-commercial use*. It cites ECMWF data (CC-BY) and Copernicus C3S for the reanalysis and the elevation |
| **Esri World Imagery** | Satellite base map, the one the interface shows by default | The layer's official item says *This work is licensed under the Esri Master License Agreement* and declares these credits, which the interface shows: *Esri, Vantor, Earthstar Geographics, and the GIS User Community*. It warns that the layer is not for exporting tiles or using offline. `[VERIFICAR]` by a person that direct use of the tiles from this web app, which is not an ArcGIS application, complies with Esri's terms: I could not read the text of the agreement and the item expressly mentions use in ArcGIS applications |
| **OpenStreetMap** | Street base map ("streets" option of the interface) | **ODbL** of the OpenStreetMap Foundation: *You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors*; if the data are modified, the result is distributed under the same license ([copyright](https://www.openstreetmap.org/copyright)). Its [tile policy](https://operations.osmfoundation.org/policies/tiles/) requires visible attribution (*Typically: © OpenStreetMap contributors*), the official URL, forbids bulk-downloading tiles and asks not to restrict the `Referrer-Policy`; I did not find a `Referrer-Policy` in `web/` or in `api/despliegue/`. **The interface shows "© OpenStreetMap" without "contributors"** `[VERIFICAR]` (balam) |
| **FAO-56** (Allen, Pereira, Raes and Smith, 1998) | Kc and stages (Tables 11 and 12), soil water (Table 19), Zr and p (Table 22), TAW (eq. 82), percolation (eq. 88) | [FAO's terms](https://www.fao.org/contact-us/terms/en/) allow copying, printing and downloading the content for *research and teaching purposes, and for use in non-commercial products or services* (the sentence begins with private study purposes), with acknowledgement of FAO as the source and rights holder, without suggesting its endorsement. **Commercial use requires FAO's permission.** `[VERIFICAR]` by a person that this use fits |
| **FAO EcoCrop** | Temperature and annual rainfall ranges per crop | `ecocrop.fao.org` was not responding (HTTP 503), so the copy of the database in the R package [Recocrop](https://github.com/cropmodels/Recocrop) (commit `3a01315`) was used, whose **code** is GPL-3.0. The package does not declare a license for the data; they belong to FAO and its terms apply (above) `[VERIFICAR]` |
| **Saxton and Rawls (2006)** | TAW and retention (θsat, θFC, θWP) by pedotransfer for any texture | *Soil Sci. Soc. Am. J.* 70(5): 1569-1578, [doi:10.2136/sssaj2005.0117](https://doi.org/10.2136/sssaj2005.0117). The equations were copied from their Table 1 and checked against their Table 3 |
| **WoSIS Procedures Manual** (Batjes and van Oostrum, 2023) | Factor 1.724 from organic carbon to organic matter | ISRIC Report 2023/01, p. 25 (`docs/01`) |
| **SIAP** | Municipal agricultural closing 2021-2025 of all municipalities of Mexico: crop presence and PV/OI seasons (the agricultural years of the scenarios) | [Open data portal](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php). It says the data are information that *anyone can freely use, reuse and share* (original Spanish: "cualquier persona puede usar, reutilizar y compartir libremente"), subject to *acknowledgement of the source that publishes them and the obligation to keep the same terms of use when redistributing them*. The repo redistributes an extract (`datos/catalogos/fuentes/`): see its `LEEME.md` |
| **INIFAP** | Sowing windows for southern Veracruz: guide for rainfed maize (Tinoco Alfaro, C. E. Cotaxtla, 2022) and Agenda Técnica Agrícola de Veracruz (2nd ed., 2015) | The agenda carries the printed notice *© Secretaría de Agricultura, Ganadería, Desarrollo Rural, Pesca y Alimentación*. I did not find reproduction terms in the PDFs. The dates (data) are taken with their citation, not the text `[VERIFICAR]` |
| **GGCMI phase 3** (crop calendar) | Worldwide base of the sowing calendar: rainfed sowing day at 0.5°, also in Mexico, for 15 of the 40 crops. Beans and green beans (`bea`, no species), peas and sweet maize are `SUPUESTO` equivalences | Jägermeyr et al. (2021), *Nature Food* 2: 873-885, [doi:10.5281/zenodo.5062513](https://doi.org/10.5281/zenodo.5062513), **CC BY 4.0** (`docs/04`) |
| **MIRCA2000 v1.1** | Start month of the *Pulses* class (cowpea, faba bean, lentil, `SUPUESTO`) and presence of 11 crops outside Mexico from rainfed harvested area | Portmann, Siebert and Döll (2010), [doi:10.5281/zenodo.7422506](https://doi.org/10.5281/zenodo.7422506), **CC BY 4.0** (`docs/04`) |
| **FAO Crop Calendar** | Sowing periods per country and crop in 57 countries (Africa, Asia, Andes), on top of GGCMI and MIRCA | Treated as **CC BY-NC-SA 4.0** (`[DECIDIDO]` Mompin, Nov 15: one FAO record says CC BY 4.0 and another CC BY-NC-SA). Separate folder `datos/calendario/fao-crop-calendar/` with its `LICENCIA.md`. **It conditions the repository's license** (`docs/11`) |
| **geoBoundaries gbOpen** | Boundaries of municipalities and states of Mexico to match the SIAP data | CC BY 4.0 (ADM2) and CC BY 3.0 IGO (ADM1), per `docs/01` |
| **GBIF** (Occurrence Search) and **EPPO** | Pests recorded near the plot (presence since 2000, ±1.5° box, about 165 km) and their host crops (EPPO Global Database; for the grasshopper, Quesada-Béjar et al. 2017, *Rev. Mex. Cienc. Agríc.* 8(6): 1357-1370) | **Illustrative** layer: a presence record is not a damage forecast and does not enter the engine or the ranking. Citation per query: *GBIF.org (date) GBIF Occurrence Search*. The license of each record is its publisher's `[VERIFICAR]` |
| **ESA WorldCover 10 m 2021 v200** | Locating the fictitious polygons of the examples where every pixel is cropland (class 40) | Zanaga et al. (2022), [doi:10.5281/zenodo.7254221](https://doi.org/10.5281/zenodo.7254221). License `[VERIFICAR]` |
| **USDA CDL and NRCS SSURGO** | USA only (Iowa example): sown crop and soil, on top of the worldwide sources (contract `ee-uu`, A4.12) | Citation and license `[VERIFICAR]` |
| **Köppen-Geiger** (rules of Peel, Finlayson and McMahon, 2007) | Climate of each example, computed from the normals of the POWER series; the scene's biome is decorative `[PROPUESTA]` | Published rules, applied by the team (`docs/01`) |

Own 3D models, generated with the team's `modelador-voxel` agent (`docs/07`).

## Declared limits and assumptions

Source: `docs/00` ("What we must NEVER claim"), `docs/04`, `docs/10` ("Scientific limits"), `docs/11` (risks).

- **It does not predict an exact season.** Scenarios are real historical years and the next season is an approximate range, never a single figure.
- **It does not predict harvests, yields or profits.**
- **It does not measure pH or fertility.** Texture, pH and TAW are estimates from global maps or from pedotransfer, always `SUPUESTO`.
- **Coarse climate resolution:** the plot fits inside one POWER cell (0.5 × 0.625 degrees), so the climate is the same across the whole plot. Differences between blocks come from crop, soil and relief.
- **`GWETROOT` is a saturation fraction** (~1 m, regional), not a fraction of TAW: it is converted before use, and without the soil's retention it is not used.
- **The 3D scene is qualitative:** it shows stages and states, not heights or biomass.
- **Simplifications:** water bucket, relative erosion index, parameters from general tables, equal weights `SUPUESTO` in the ranking and normalization of excess water `SUPUESTO`.
- **Parameters chosen by the team** that a person must review: FAO-56 rows, **chili uses the parameters of sweet pepper** (same species; FAO-56 and EcoCrop do not have green chili), root depth at the top of the range and selector groups (`datos/catalogos/README.md`). Three of those choices (green peas, wheat's final Kc at 0.25 and chili) were reviewed by a team member on Nov 15 and are kept; an agronomic review is still missing.
- **Printed FAO-56 totals that do not add up:** sorghum (the stages add to 125, total 130), cowpea (100 against 110), sesame (110 against 100) and the May/June row of eggplant (140 against 40). The stages are kept and the cycle is their sum. It was checked against FAO-56's web edition (the mismatch is in the source); comparing with the PDF is still missing.
- **Heat is not evaluated** (no sourced stress threshold for all crops) and **prices, costs, yield and pests are not considered** in the computation.
- **Worldwide calendar:** 0.5° base with a single cycle per cell; beans, green beans, peas, sweet maize, cowpea, faba bean and lentil enter through `SUPUESTO` equivalences; FAO Crop Calendar merges the agro-ecological zones of a country because it does not publish their boundaries.
- **Pests:** only presence recorded in GBIF within about 165 km; it does not estimate damage or loss.
- **A crop that the local source does not record at the place** is shown but not recommended (for example, squash in Isla, where SIAP does not record it).
- **The sowing windows for OI maize and OI beans** are recommendations of the state of Veracruz, not of Isla; only spring-summer maize has a guide that covers the district of Isla.
- **IMERG and POWER differ** in storms and in recent years. The scenarios use POWER; with IMERG they would be other years (risk declared in `docs/11`).
- **No local validation** for as long as there is none: every recommendation requires validation in the field with a technician.

## AI-use statement

The challenge allows the use of AI (its guide calls it "Super Intelligence (SI)"), with conditions: it is not used to come up with the solution, the generated content may not use NASA branding, and it must be stated where and how it was used. For images and video it asks for a visible watermark; for audio, code and data, acknowledgement in text and metadata ([submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), read on Nov 14, 2026). **This section is pending human review.**

| Part | How AI was used | Status |
| --- | --- | --- |
| **The idea** | The core idea (test each rotation against real historical years and look for the most robust one) comes from a video by a teammate (`docs/11`), not from an AI tool | `[VERIFICAR]` that the team confirms it |
| **Code** | Team members used AI assistants (per `docs/14`: Claude, Codex, Cursor, ChatGPT, Gemini and Copilot) to write code, tests and documentation. Several commits carry the tool's `Co-Authored-By` mark; **not all of them** (the team did not mark them uniformly), which is why it is stated here in writing | Acknowledged in this text |
| **Data** | The values of the crop and soil catalog were extracted by an AI assistant from the original tables of FAO-56 and EcoCrop, with a source for each value. A person approved the choices (which row to use); **checking figure by figure against the source is still pending** (on Nov 15, six doubtful rows were checked against FAO-56's web edition; the PDF was not read) | `[VERIFICAR]` |
| **3D models and icons** | The `.bbmodel` models (40 crops with five stages and a lightweight block, soils and mascot) and the 2D icons were generated by AI agents and sessions that write code with `voxelkit.py` and `iconos2d.py`; they were reviewed by eye in the viewers under `modelos/` (Nov 15) | Acknowledged in this text |
| **Interface illustrations** | `terreno-hero`, `terreno-demo` and `terreno-poligono` were generated with an image-generation tool (prompts in `web/src/ui/assets/terreno-prompts.md`). The origin of `inicio-campo.png` is not recorded | **The guide asks for a visible watermark** on AI-generated images: `[DECIDIR]` how this is met. I did not check whether the interface already shows it |
| **Demo video and audio** | They do not exist yet | `[DECIDIR]` whether the voice or the images will be generated; if so, watermark and acknowledgement |
| **7-slide presentation** | Text, speaker notes and design drafted with an AI assistant (Claude) from `docs/` and the engine regressions, for the team to review (`docs/presentacion.md`). No generated images: only text, shapes and screenshots of the app. The last slide carries the AI-use statement | Acknowledged in this text and in the deck |
| **NASA branding** | No NASA logos were found among the repo files (checked by name, Nov 14, 2026). Generated content must not use them | `[VERIFICAR]` in the screenshots and the video |
| **Inside the application** | No language model decides or invents data. If one is used, it only writes about numbers already computed, and there is a fallback template with no LLM (`docs/05` step 8). The demo uses a template. Esquilote's tips are templates with numbers already computed | Done |

Decisions, sources and review are human (`docs/14`; `AGENTS.md`). Scientific figures carry a source, and a person must verify them (`AGENTS.md`).

## Project license

**The repository has no license file** as of Nov 15, 2026, so the own code does not declare under which terms it can be reused. `[DECIDIR]` (team). The sources above keep their own licenses and terms. **The worldwide calendar includes FAO Crop Calendar data treated as CC BY-NC-SA 4.0** (`datos/calendario/fao-crop-calendar/`), which limit commercial use and condition the license that is chosen (`docs/11`).

## What still needs verification

Everything below is `[VERIFICAR]` and needs a person:

1. **Licenses and terms of use** in the sources table: POWER (declares no license), FAO-56 and EcoCrop (non-commercial use with acknowledgement; Recocrop copy), INIFAP (no terms found), SIAP (redistribution under the same terms), FAO Crop Calendar (CC BY-NC-SA; one FAO record says CC BY), GBIF (per publisher), ESA WorldCover, USDA CDL and NRCS SSURGO (license and citation not checked). The legal text is validated by a person.
2. **Incomplete citations:** that POWER's `IMERG_PRECTOT` variable is the daily IMERG Final V07 product; which Zenodo record corresponds to each 30 m layer of OpenLandMap.
3. **Base maps:** whether direct use of Esri World Imagery tiles complies with Esri's terms, and completing OpenStreetMap's attribution with "contributors".
4. **AI-use statement:** that the team confirms the human idea, how the watermark is met on generated images and in the video, and the checking of the catalog figures.
5. **Challenge rules:** confirm them in the browser (they were read with an AI tool).
6. **License of the repository's own code.**
7. **No local validation:** no agricultural technician has reviewed the parameters or the recommendations.
8. **"Method and sources" is incomplete:** it does not yet list the sources of the SMAP moisture, the MODIS NDVI or the GBIF pests, which the interface uses in Esquilote's tips and in the pest layer (MF10, `web/evidencia/cifras-visibles-d10.md`).

## Team

Code Hive: Mompin, Eduardo, Mafer and balam (`docs/14`, assignment board).
