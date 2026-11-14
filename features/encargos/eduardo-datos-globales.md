# Encargo para Eduardo: datos globales (A4.10, A4.11 y A4.12)

De: Mompin (sesión `features`), 14/11/2026. Lo decidió Mompin, así que es decisión del equipo `[DECIDIDO]` (docs/13, fila "Alcance geográfico").

## Contexto: qué se decidió

- **Arquitectura mundial, demo en Isla.** AgroHive tiene que funcionar en cualquier coordenada que dibuje el usuario con fuentes **globales** (POWER, IMERG, MODIS, SoilGrids/OpenLandMap, Terrarium, Open-Meteo). La demo validada sigue siendo Isla, Veracruz. Las fuentes de un país (SIAP en México; CDL o SSURGO en EE. UU.) **se suman encima** cuando la coordenada cae ahí. Nunca son la base.
- De los 25 recursos del reto, 14 solo cubren EE. UU. (WSS, SSURGO/STATSGO2, CDL, PRISM, NAIP, NLCD, OpenET, LANDFIRE, NWIS, AMS, NASS, Ag Data Commons; NLDAS llega solo hasta 25°N). Esos quedan como `[EXTRA]` fase 2 (A4.12).
- Lo más barato con más efecto: **GPM IMERG ya viene dentro de NASA POWER**, sin `earthaccess` ni cuenta Earthdata. Esto puede cerrar tu A4.8 ("un dataset NASA adicional integrado de verdad") sin el costo L.

## A4.10: lluvia IMERG en la API (S, Sonnet). Hazla primero

Evidencia y script: `features/imerg/` (rama `Mompin-features`), con `LEEME.md`, `comparar_imerg.py` y la respuesta cruda de POWER.

1. En `api/app/clientes/power.py`, haz una **segunda llamada** a la misma API diaria con `parameters=IMERG_PRECTOT` y **`time-standard=UTC`**. Sin UTC, POWER devuelve `-999` y el mensaje "The IMERG Source Data is not available at the Local Solar Time (LST) standard". No la mezcles con la llamada actual (hora local): son estándares de hora distintos.
2. `-999` (`header.fill_value`) se guarda como `null`, **nunca 0**. IMERG existe desde el 2000-06-01, e IMERG Final tarda meses en publicarse, así que los últimos meses pueden venir en `null`.
3. Caché igual que la llamada actual. Regenera el paquete de demo (`datos/demo/generar.py`) con la serie IMERG del mismo periodo (2005-10-01 a 2025-12-31).
4. **Contrato:** el campo lo agrega Mompin en `serie-clima` y `clima-escenario` (A1.7, cambio compatible). Mientras no exista, trabaja contra la propuesta: un bloque opcional `lluviaSatelital` con `variable: "IMERG_PRECTOT"`, `estandarHora: "UTC"`, la `fuente` (POWER, 0.1°, consultado) y una lista diaria `{fecha, lluviaMm|null}`. No metas el campo al modelo de FastAPI hasta que el contrato lo tenga, porque la prueba de conformidad fallaría.
5. **Uso:** es **evidencia**, no entra al balance de agua ni cambia los escenarios. El motor sigue con `PRECTOTCORR`.
6. **Entregable:** `GET /api/clima` devuelve la serie IMERG con su fuente y estándar de hora; prueba con una respuesta guardada (incluido un `-999`); paquete de demo regenerado.

Hallazgos que debes conocer (detalle en `features/imerg/LEEME.md`):
- IMERG ve tormentas que MERRA-2 aplana: máximos diarios de 221 a 241 mm contra 84 mm o menos en `PRECTOTCORR`.
- Coinciden mes a mes (correlación 0.92), pero en años recientes IMERG suma mucho menos (2023: 1 032 contra 1 524 mm).
- Con IMERG, los años seco, habitual y lluvioso serían otros: 2019, 2024 y 2017. Queda declarado como riesgo en docs/11; no se cambia la fuente de los escenarios.

## A4.11: NDVI de MODIS por punto (S, Sonnet). Después de A4.10

- Servicio REST de ORNL DAAC, **sin cuenta**, probado el 14/11: `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=..&longitude=..&band=250m_16_days_NDVI&startDate=A2023145&endDate=A2023200&kmAboveBelow=0&kmLeftRight=0` con `Accept: application/json`. En el centroide demo devolvió 0.33 a 0.41 entre mayo y julio de 2023.
- La escala es `0.0001` (viene en la respuesta); las fechas son `A<año><día juliano>`. Cita obligatoria: `doi:10.3334/ORNLDAAC/1600`. Documentación: <https://modis.ornl.gov/data/modis_webservice.html>.
- Endpoint propuesto: `GET /api/ndvi?lat=&lon=&desde=&hasta=`, con caché y en el paquete de demo para los años de escenario.
- **Límites que hay que declarar:** un píxel mide 250 m (~6.25 ha, más que la parcela de 2 ha) y no muestra el cultivo del usuario. **No entra al ranking** (no hay relación publicada entre NDVI y nuestros pilares). Es evidencia visual de que los escenarios fueron años reales. La interfaz es de balam (A4.1 o A4.5) y no es urgente.
- Necesita contrato (A1.7 o posterior, Mompin): no lo sirvas fuera de `contratos/`.

## A4.12 `[EXTRA]` fase 2: fuentes regionales de EE. UU. (L). Solo después de C5

Solo si sobra tiempo después de la entrega mínima, y solo cuando la coordenada cae en EE. UU.:
1. **CDL (CropScape)** primero: los cultivos reales de la parcela año por año (desde 2008, 30 m) son la "rotación actual" del agricultor (F8) sin preguntarle.
2. **SSURGO** después: suelo de campo, mejor que SoilGrids.
Es lo primero que se recorta. Pide una segunda zona de demo probada de punta a punta.

## Reglas de siempre

- Nada inventado: falta el dato ⇒ `null` o `NO_EVALUABLE` con motivo. Cada serie lleva fuente, resolución y fecha de consulta.
- Llaves y cuentas por variables de entorno, nunca en el repo.
- Antes de subir: `npm test` en `contratos/`, pytest en `api/`, `node datos/catalogos/validar.mjs` y `tsc` en `web/`. Actualiza docs/04 y `AgroVault/Compartido/APIs.md` si cambia algo de la API.
