# A0.7 - Pruebas reales de APIs (14/11/2026)

Responsable: Eduardo. Entregable: parametros probados con una llamada real. Repetible con `python3 probar_apis.py [lat] [lon]` (opcional: `pip install certifi pillow`). Las respuestas guardadas estan en `respuestas/`; las de 20 anios (`*_20y.json`) no se suben, se regeneran con el script.

Coordenada de prueba: 18.03, -95.53, cerca de Isla, Veracruz. **No es la parcela demo**: la zona se confirma en A0.6 (V-20). Fecha de consulta: 2026-11-14. Una sola coordenada; no se midieron limites de tasa.

## Resultados

| Pregunta | Resultado | Evidencia |
| --- | --- | --- |
| V-22 CORS de POWER | Un GET sin cabeceras personalizadas devuelve `access-control-allow-origin: *`. El preflight `OPTIONS` da 404 (lo atiende S3). El navegador podria llamar a POWER solo con GET simple, pero se mantiene la decision de pasar todo por el backend (cache y reintentos) | `power_ag.json` y cabeceras del script |
| V-06 unidad de radiacion | `ALLSKY_SFC_SW_DWN` viene en **MJ/m^2/day** | `power_ag.json`, bloque `parameters` |
| V-06 `GWETROOT` | Existe en la comunidad **AG** y en SB, sin unidad (`1`, fraccion 0 a 1). Las comunidades que acepta el endpoint diario son RE, SB y AG; `HY` da 422 | `power_ag_gwet.json`, `power_config.json`, `power_hy_rechazado_422.json` |
| Otras unidades POWER | `PRECTOTCORR` mm/day, `T2M*` C, `RH2M` %, `WS2M` m/s. Valor de relleno -999 (0 faltantes en 2006-2025) | `power_ag.json` |
| POWER 20 anios | 7 305 dias, 850 KB, unos 2 s, una sola llamada | `power_20y.json` |
| Open-Meteo archivo, nombres diarios | `precipitation_sum` (mm), `temperature_2m_max`/`min` (C), `shortwave_radiation_sum` (MJ/m^2), `et0_fao_evapotranspiration` (mm), `wind_speed_10m_max` (km/h), con `models=era5` | `om_archive.json` |
| Open-Meteo humedad de suelo diaria | `soil_moisture_0_to_7cm_mean`, `..._7_to_28cm_mean`, `..._28_to_100cm_mean` (m^3/m^3), con `models=era5_land` | `om_archive_soil.json` |
| Open-Meteo 20 anios | 7 305 dias, 286 KB, unos 3 s, una llamada, sin nulos | `om_archive_20y.json` |
| V-21 estacional, horizonte | Por defecto devuelve 6 meses. `forecast_months` se ignora. Con `forecast_days=210` devuelve **7 meses** (nov 2026 a may 2027); el maximo aceptado es 217 dias (error 400 con 250) | `om_seasonal.json`, `om_seasonal_210d.json` |
| Estacional, variables | `precipitation_mean`, `precipitation_anomaly` (mm), `temperature_2m_mean`, `temperature_2m_anomaly` (K) funcionan en `monthly=`. La rejilla se ajusta a 18.126, -95.538 (36 km) | `om_seasonal*.json` |
| V-08 elevacion | Open-Meteo Elevation: 200, 59 m en el punto (GLO-90). Terrarium z12: 200, tile de 256x256, 33 a 129 m (media 76 m); z15 responde 200 y z16 da 404 en este punto. POWER reporta 107.88 m para su celda (promedio de MERRA-2, no sirve como relieve) | `om_elev.json`, `terrarium.png` |

## POWER contra Open-Meteo (2006-2025, mismo punto)

| Metrica | POWER | ERA5 (Open-Meteo) |
| --- | --- | --- |
| Lluvia anual p10 / p50 / p90 | 1554 / 1876 / 2200 mm | 1535 / 1768 / 1933 mm |
| Anio mas seco / mas lluvioso | 2019 (1307 mm) / 2010 (2273 mm) | 2019 (1432 mm) / 2010 (1964 mm) |
| Radiacion media | 17.24 MJ/m^2/dia | 17.56 MJ/m^2/dia |
| Correlacion lluvia anual / diaria | 0.74 / 0.72 | |

Lectura: ambas fuentes coinciden en los anios extremos (2019 seco, 2010 lluvioso) pero no en la magnitud. **No son intercambiables**: si el respaldo se activa, el estado `RESPALDO_HISTORICO` debe verse y los escenarios se recalculan con esa fuente, no se mezclan series.

## Pendiente de decision del equipo (no lo cierro yo)

- V-21, V-22, V-06 y V-08 tienen ya evidencia; falta que el equipo los marque como cerrados en `docs/11` y `docs/13`, y anotar el resultado en `docs/04` (carril de Mafer) y `docs/01`.
- V-08: con esta evidencia se podria elegir Open-Meteo Elevation (90 m, 100 puntos por llamada, sin descargar tiles) como cliente por defecto de A2.3 y Terrarium como respaldo. Es propuesta, no decision.
- Sin medir: limites de tasa de POWER, ISRIC WCS (V-23, es de A2.14) y earthaccess.

## Calendario de siembra mundial (15/11/2026)

`respuestas/calendario_puntos_mundiales.json`: resumen de `GET /api/calendario` en 11 puntos de varios continentes (México: Isla, Texcoco, Culiacán y un punto urbano de CDMX; EE. UU.: Iowa; Brasil: Mato Grosso; Kenia; India: Madhya Pradesh; España: Castilla; Australia: Nueva Gales del Sur; Marruecos). Por cultivo y temporada trae la ventana, el nombre de su fuente y el estado de la presencia. No llama a ninguna API en vivo: sale de los extractos de `datos/calendario/` (GGCMI fase 3, MIRCA2000, SIAP y FAO Crop Calendar). Las coordenadas de Isla quedan solo como dato de prueba interno: AgroHive es mundial (`docs/13`, "AgroHive MUNDIAL"). Conteo del 15/11: 18 de 40 cultivos con ventana en todos los puntos, 23 en Kenia y 33 en Marruecos (FAO Crop Calendar encima).
