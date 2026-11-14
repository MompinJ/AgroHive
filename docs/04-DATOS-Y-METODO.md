# 04 · Datos y método científico

## Principios

1. **La evidencia manda sobre la representación visual.** Un bloque 3D no mide el suelo, una simulación histórica no predice el próximo año y un indicador hídrico no es rendimiento.
2. **NASA POWER es la columna vertebral** porque no pide cuenta ni llave.
3. Las demás fuentes suman evidencia; **no deben bloquear el avance**.
4. **Todo se cachea.** El wifi de la sede puede fallar y las APIs tienen límites.
5. Cada valor mostrado debe poder **rastrearse a una fuente** (coordenada, período, unidades, fecha de consulta).
6. **Qué entra depende de lo que consigamos.** Lo ideal es usar todo lo posible; si el día se complica, se descarta por prioridad. `[DEPENDE-DATOS]`

## Fuentes NASA

| Fuente | Qué aporta | Resolución | Acceso | Prioridad | Estado |
| --- | --- | --- | --- | --- | --- |
| **NASA POWER** | Lluvia, temperatura, radiación, humedad relativa, viento, humedad del suelo modelada | Decenas de km | API REST sin llave; diario y mensual; máx. 20 parámetros por llamada | **Base del MVP** | Estructura y límite verificados |
| **SRTM** | Elevación para el relieve | 30 m | OpenTopography, AppEEARS o tiles de terreno | **Alta** (relieve decidido) | `[VERIFICAR]` |
| **GPM IMERG** | Lluvia por satélite | ~10 km, 30 min | Earthdata + `earthaccess` | Media | `[VERIFICAR]` |
| **SMAP** | Humedad del suelo | 9 a 36 km | Earthdata | Media | `[VERIFICAR]` |
| **MODIS** | NDVI | 250 m, 16 días | AppEEARS o Earth Engine | Extra fase 1 | `[VERIFICAR]` |
| **Landsat / HLS** | NDVI y reflectancia | 30 m | AppEEARS o Earth Engine | Baja | `[VERIFICAR]` |
| **ECOSTRESS** | Temperatura de superficie | ~70 m, irregular | AppEEARS | Baja | `[VERIFICAR]` |
| **GRACE / GRACE-FO** | Agua almacenada | Cientos de km | Solo contexto regional | Baja | `[VERIFICAR]` |
| **GIBS / Worldview** | Capas satelitales para mapa (WMTS) | Varía | Sin llave | Opcional | `[VERIFICAR]` |

### Notas sobre POWER
- Usar el **endpoint diario** y agregar nosotros por mes: da control sobre percentiles y eventos extremos.
- Parámetros candidatos: `PRECTOTCORR` (lluvia), `T2M`, `T2M_MIN`, `T2M_MAX`, y para ET0 `ALLSKY_SFC_SW_DWN`, humedad y viento.
- `PRECTOTCORR` mensual viene en **mm/día promedio**: para el total mensual multiplicar por los días del mes. (Verificado)
- Humedad del suelo (`GWETROOT`, `GWETTOP`, `GWETPROF`): probado el 14/11 (A0.7), están en el endpoint **diario**, comunidades AG y SB, sin unidad (fracción). Si entran al balance sigue abierto (V-06). La comunidad `HY` no existe en el diario (422).
- `ALLSKY_SFC_SW_DWN` viene en **MJ/m²/día**; `PRECTOTCORR` mm/día, `T2M*` °C, `RH2M` %, `WS2M` m/s (probado el 14/11).
- CORS (V-22): un GET simple trae `access-control-allow-origin: *`, el preflight `OPTIONS` da 404. Se mantiene todo por el backend.
- Una llamada diaria de 2006 a 2025 devuelve 7 305 días (~850 KB, ~2 s). Valor de relleno `-999` (0 faltantes en la prueba).
- Evidencia y script en `datos/pruebas-apis/` (coordenada de prueba, no la parcela demo).
- Comunidad `AG` para variables agrícolas estándar. (Verificado)

## Fuentes externas (no NASA)

| Fuente | Para qué | Nota | Estado |
| --- | --- | --- | --- |
| **Open-Meteo, archivo histórico** | Clima desde 1940 (ERA5), humedad del suelo, ET0 | Sin llave, uso no comercial gratis. **Respaldo** si POWER falla | Probado el 14/11: `precipitation_sum`, `temperature_2m_max/min`, `shortwave_radiation_sum`, `et0_fao_evapotranspiration` con `models=era5`; humedad de suelo `soil_moisture_0_to_7cm_mean` (y 7-28, 28-100) con `models=era5_land`. Lluvia de ERA5 y POWER coinciden en años extremos pero no en magnitud (no intercambiables) |
| **AWS Terrain Tiles** | Elevación (Terrarium) para el relieve | Sin llave | Probado el 14/11: z12 y z15 responden, z16 da 404 en la zona de prueba |
| **Open-Meteo Elevation** | Elevación puntual (Copernicus GLO-90, 90 m, 100 puntos por llamada) | Sin llave; acreditar a Copernicus y Open-Meteo | Probado el 14/11. Propuesta de cliente por defecto, falta decidir (V-08) |
| **Open-Meteo estacional** | Anomalías mensuales de ECMWF SEAS5/EC46 (36 km) | Sin llave | Probado el 14/11: 6 meses por defecto, 7 con `forecast_days=210` (máx. 217). V-21 |
| **OpenTopography** | DEM SRTM y Copernicus | Llave gratuita | `[VERIFICAR]` |
| **FAO-56 (Allen et al., 1998)** | Kc por etapa, ET0, agua del suelo por textura | Tablas públicas, se cargan a mano | Conocido |
| **FAO EcoCrop** | Rangos de temperatura, lluvia y ciclo por cultivo | Base pública | `[VERIFICAR]` |
| **INIFAP / SIAP** | Calendarios y producción por municipio | Datos abiertos | `[VERIFICAR]` |
| **INEGI edafología** | Contexto de suelo | Escala gruesa | `[VERIFICAR]` |
| **SoilGrids (ISRIC)** | Textura y materia orgánica | **API REST pausada**; no depender de ella | Verificado (pausada) |

> **Investigación del 14/11** (detalle, endpoints y límites en `AgroVault/Compartido/APIs.md`; todo lo marcado `VERIFICAR` allí se prueba con una llamada real): Open-Meteo Elevation (Copernicus GLO-90, hasta 100 coordenadas por llamada) es candidato para la elevación junto a Terrarium y SRTM (V-08); la página original de FAO EcoCrop ya no responde y hay copias públicas de su base cuya licencia falta verificar; SoilGrids se consulta por WCS mientras la API REST siga pausada; el pronóstico estacional de Open-Meteo documenta 7 meses de horizonte (V-21).

### Suelo: la fuente más débil
El MVP usa un **selector manual de tipo de suelo** (arcilloso, franco, arenoso) con valores de retención de agua de FAO-56, siempre etiquetado `SUPUESTO`. Alternativas posteriores: GeoTIFF de SoilGrids, Earth Engine, mapas de INEGI.

**Decisión 14/11 (ver 13):** además se estima **textura y pH** de la zona con mapas globales descargados por script (WCS de ISRIC u OpenLandMap, 250 m; OpenLandMap-soildb a 30 m si es viable), servidos desde caché y siempre etiquetados `SUPUESTO`. El selector manual queda como respaldo. Probado el 14/11 (A2.14, V-23): el **WCS de ISRIC responde** (`maps.isric.org/mapserv?map=/map/<propiedad>.map`, coberturas `<propiedad>_<capa>_mean`); la REST sigue anunciada como pausada. Se pide en el CRS nativo (Homolosine); la reproyección a 4326 del servidor deja ceros. Conversión de unidades según la FAQ de ISRIC: arena y arcilla g/kg ÷ 10 = %, pH × 10 ÷ 10. Implementado en `GET /api/suelo` (media 0-30 cm). Evidencia en `datos/pruebas-apis/respuestas/`.

## Período histórico y escenarios

1. Ventana objetivo: **2006–2025** (20 años completos). Nunca tratar 2026 como año completo.
2. Respaldo: **2016–2025** (10 años) si falta tiempo, cobertura o calidad.
3. Escenarios: **seco, habitual y lluvioso**, elegidos con criterio reproducible. Propuesta: años cerca de los percentiles **p10, p50 y p90** de lluvia; idealmente considerando también la distribución de la lluvia en etapas sensibles. `[PROPUESTA]`
4. Mostrar siempre **qué años reales** corresponden a cada escenario.
5. Si los datos lo permiten, evaluar la robustez sobre **todo el histórico** y usar los tres escenarios como vistas interpretables. `[DEPENDE-DATOS]`
6. Conservar datos diarios, unidades, faltantes, fecha de consulta y método de agregación.

## Resolución: decirlo con honestidad

- POWER y SMAP tienen celdas de decenas de km: **una parcela cabe entera en una celda de clima**.
- El clima es el mismo para todos los bloques. Las diferencias entre bloques vienen de **cultivo, suelo y relieve** (altura y pendiente). Por eso el relieve aporta variación real, no solo decoración.
- Discurso del reto: *"los satélites tienen límites, por eso se combinan con datos locales"*.

## Diccionario de variables

| Variable | Fuente | Unidad | Uso |
| --- | --- | --- | --- |
| Lluvia diaria | POWER (o Open-Meteo) | mm/día | Entrada de agua, percentiles, extremos |
| Temperatura media, máx., mín. | POWER | °C | ET0, estrés por calor, ciclo |
| Radiación solar | POWER | Según versión | ET0 |
| Humedad relativa y viento | POWER | % y m/s | ET0 Penman-Monteith (opcional) |
| Humedad del suelo | POWER, Open-Meteo, SMAP | Fracción | Contexto y contraste |
| Elevación | SRTM / tiles | m | Relieve y pendiente |
| NDVI | MODIS | Adimensional | Extra fase 1 |
| Tipo de suelo | Usuario | Categoría | Capacidad de agua (TAW) |
| Cultivo, ciclo, Kc, umbrales | FAO / INIFAP / tabla propia | Varios | Demanda y etapas |

## Valores derivados

| Valor | Cómo |
| --- | --- |
| Lluvia mensual y anual | Suma de diarios |
| Percentiles p10, p50, p90 | Para elegir escenarios |
| ET0 | Open-Meteo directo, o Hargreaves-Samani / Penman-Monteith con POWER |
| ETc | Kc de la etapa × ET0 |
| Balance de agua por bloque | Modelo de cubeta (ver 05) |
| Días de déficit | Días con demanda no cubierta |
| Días de estrés por calor | Días sobre el umbral del cultivo |
| Pendiente por bloque | Gradiente del modelo de elevación |
| Riesgo de erosión | Índice relativo: intensidad de lluvia, pendiente, cobertura `[DEPENDE-DATOS]` |

## Estados de respuesta

- `EVALUABLE`: parámetros y fechas justificados; se calcula y se explica.
- `NO_EVALUABLE`: falta un parámetro, calendario o entrada esencial; **no asignar cero ni inventar**.
- `EXPLORATORIO`: ilustración limitada y etiquetada; no es recomendación.
- `ERROR_DATOS` / `RESPALDO_HISTORICO`: fallo de API o uso de caché, siempre visible.

## Caché

- Clave: coordenada redondeada a la celda del dataset + variable + período.
- MVP: archivos JSON en disco (sin base de datos obligatoria).
- Dejar **parcelas de demo con datos precargados** para no depender de internet.
- Si POWER falla: Open-Meteo; si ambos fallan: caché y aviso en la interfaz.
- Respetar cuotas con cola y reintentos.

## Validaciones científicas mínimas

- [ ] Unidades coherentes (mm, días, °C, ET0/ETc).
- [ ] Reservas de agua nunca negativas ni por encima del máximo sin explicación.
- [ ] Ciclos cronológicos, no cultivos simultáneos.
- [ ] Datos faltantes y calendarios incompatibles manejados de forma visible.
- [ ] Mismos datos ⇒ mismos resultados.
- [ ] Fuentes NASA citadas en la interfaz y en la entrega.

## Preparación permitida antes del evento
- Crear cuenta gratuita de **Earthdata** (la verificación puede tardar).
- Leer documentación de POWER, AppEEARS y tiles de terreno.
- Reunir referencias de cultivos (FAO, INIFAP, SIAP).

## Bibliografía

- [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
- [FAO-56](https://www.fao.org/4/x0490e/x0490e0a.htm) · [FAO necesidades de agua](https://www.fao.org/4/s2022e/s2022e07.htm)
- [INEGI Edafología](https://www.inegi.org.mx/temas/edafologia/) · [SIAP datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php)
- [Estudio INIFAP de Veracruz](https://cienciasagricolas.inifap.gob.mx/index.php/agricolas/en/article/view/4168/8701)
- [ISRIC SoilGrids](https://docs.isric.org/globaldata/soilgrids/)
