# Prototipo: lluvia GPM IMERG via NASA POWER

Rama `Mompin-features`. **No es contrato ni salida del motor**: es la evidencia para decidir cómo entra IMERG a la API (actividad A4.10 de Eduardo, docs/14). Aprobado por Mompin el 14/11.

## Qué se encontró al probar POWER (14/11/2026)

- POWER entrega la lluvia de GPM IMERG (0.1°, desde el **1998-01-01**: en POWER (`time-standard=UTC`, punto de la demo, llamada real del 14/11) el último `-999` es el 1997-12-31 y el primer dato el 1998-01-01, igual que el catálogo CMR de NASA) como `IMERG_PRECTOT` (mm/día) **sin cuenta Earthdata**, en la misma API diaria que ya usamos (`api/app/clientes/power.py`).
- **Hay que pedirla con `time-standard=UTC`.** En hora solar local (el valor por defecto) POWER responde `-999` y el mensaje "The IMERG Source Data is not available at the Local Solar Time (LST) standard". El día UTC va unas 6 h corrido respecto al día local de Veracruz.
- `-999` es relleno: se guarda como `null`, nunca como 0.
- Los `0.0` del 25 al 31 de mayo de 1998 son lluvia cero, no relleno: una nota anterior de este archivo decía lo contrario y quedó corregida. La API recorta en 1998-01-01 (`INICIO_IMERG` en `api/app/clientes/power.py`).

## Cómo correrlo

```bash
python3 features/imerg/comparar_imerg.py              # usa respuestas/power_imerg_utc.json
python3 features/imerg/comparar_imerg.py --descargar  # vuelve a pedir la serie a POWER
python3 -m unittest discover -s features/imerg        # pruebas
```

Petición usada: punto `18.03, -95.53` (coordenada ilustrativa del paquete de demo), del 2005-10-01 al 2025-12-31, comunidad AG, `IMERG_PRECTOT,PRECTOTCORR`, `time-standard=UTC`. La respuesta cruda y la fecha de consulta quedan en `respuestas/power_imerg_utc.json`; el resumen en `resultado.json`.

## Resultado (años agrícolas de SIAP, 1 oct *t*-1 a 30 sep *t*; 20 años completos, sin días faltantes)

1. **IMERG ve tormentas que MERRA-2 aplana.** El máximo diario de IMERG llega a 221 mm (2006), 241.5 mm (2010) y 234.2 mm (2014); en esos años `PRECTOTCORR` no pasa de 84.4 mm. En 17 de 20 años IMERG tiene más días ≥ 50 mm (en 2008 y 2021 tiene menos; en 2023, los mismos).
2. **El ritmo mensual coincide:** la correlación de Pearson de los totales mensuales es 0.923 (243 meses).
3. **Los totales no coinciden en años recientes:** en 2023 IMERG suma 1 032.1 mm y `PRECTOTCORR` 1 523.5 mm; en 2024, 1 575.8 contra 2 081.8 mm.
4. **Con IMERG los escenarios serían otros años.** Seco 2019 (en vez de 2023), habitual 2024 (en vez de 2016) y lluvioso 2017 (en vez de 2024). Incluso `PRECTOTCORR` pedido en UTC cambia el lluvioso a 2025, que ya estaba a 2 mm de 2024 en hora local.

## Qué significa (y qué no)

- Ninguna de las dos series es "la verdad": las dos son estimaciones regionales. No se comprobó cuál se acerca más a una estación en tierra (`VERIFICAR`: estaciones del SMN/CONAGUA cerca de Isla).
- **No se recomienda cambiar la fuente de los escenarios.** El motor sigue con `PRECTOTCORR`, que es la decisión vigente (doc 05, paso 1). IMERG entra como **segunda fuente NASA de evidencia**: intensidad de lluvia diaria y contraste de totales.
- El hallazgo 4 es un riesgo que hay que declarar (docs/11): la elección de los años seco, habitual y lluvioso depende de la fuente de lluvia.
- IMERG diario **no da I30** (la intensidad máxima en 30 minutos que pide RUSLE), así que no desbloquea el `indiceErosionRelativo` de A3.7. Para eso haría falta IMERG de media hora (`GPM_3IMERGHH`, con Earthdata), que además es un promedio de 10 km y no una intensidad puntual.
- Los rangos de lluvia (fuerte 25-50, muy fuerte 50-75, intensa 75-150, torrencial > 150 mm) son los rangos de lluvia **acumulada** del SMN tal como los reproduce CONADESUCA ([aviso 002, agosto de 2019](https://www.gob.mx/cms/uploads/attachment/file/484193/Pronostico_de_lluvias_a_10_dias_02_agosto_2019.pdf)). Aplicarlos a 24 h es `SUPUESTO` (`VERIFICAR` la clasificación oficial del SMN).

## Fuentes

- NASA POWER, Daily API v2.10.3, consultado el 14/11/2026: <https://power.larc.nasa.gov/api/temporal/daily/point>. Referencia obligatoria: <https://power.larc.nasa.gov/docs/referencing/>.
- GPM IMERG Final, diario, 0.1°, V07 (`GPM_3IMERGDF`), doi:10.5067/GPM/IMERGDF/DAY/07: <https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergdf-07>.
