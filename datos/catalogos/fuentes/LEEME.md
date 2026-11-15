# datos/catalogos/fuentes/

## `siap_isla_2021_2025.csv`

Extracto del **cierre agrícola municipal** del SIAP (Servicio de Información Agroalimentaria y Pesquera, Secretaría de Agricultura y Desarrollo Rural de México): las 85 filas del municipio de Isla, Veracruz (clave INEGI 30/077), de 2021 a 2025. Se descargó el 14/11/2026 del [portal de datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php) y se filtró sin cambiar ningún valor.

**Fuente y condiciones de uso.** El portal dice que los datos abiertos son información que *cualquier persona puede usar, reutilizar y compartir libremente*, sujeta a *el reconocimiento de la fuente que los publica y la obligación de mantener las mismas condiciones de uso al momento de redistribuirlos* (leído el 14/11/2026). Por eso:

- La fuente de este archivo es **SIAP-Agricultura**.
- Quien lo reutilice o lo redistribuya debe reconocer a esa fuente y mantener estas mismas condiciones.

`[VERIFICAR]` Una persona debe confirmar que esta redistribución cumple los términos del SIAP.

Lo usan `calendario-isla.json` (presencia de cada cultivo por temporada) y `generar.py` (`superficie_siap_isla`).

## `siap_veracruz_candidatos_2021_2025.csv`

Resumen **calculado por nosotros** (no es una tabla del SIAP) con la superficie sembrada de **temporal** de 8 cultivos candidatos a ampliar el catálogo (sorgo grano, sandía, camote, soya, cacahuate, ajonjolí, yuca y haba grano), sumada para tres ámbitos: todo el estado de Veracruz, el DDR 175 San Andrés Tuxtla (al que pertenece Isla) y el municipio de Isla. Sale de los cierres agrícolas municipales 2021 a 2025 del mismo [portal de datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php) (descargados el 14/11/2026), filtrados por `Idestado` = 30 y `Nommodalidad` = Temporal; se suman todos los ciclos (primavera-verano y otoño-invierno). `Municipios_con_dato` cuenta los municipios con fila en ese ámbito y año. Un cultivo sin filas en un ámbito no aparece (no es cero: el SIAP no lo registra ahí). La yuca no aparece en ningún ámbito.

Lectura (14/11/2026): la soya de Veracruz está en un solo municipio, Pánuco (norte del estado), y no en el DDR 175; el camote está en San Andrés Tuxtla y Santiago Tuxtla, y el cacahuate en Catemaco, ambos en el DDR 175 pero no en Isla. Las mismas condiciones de uso y la misma duda `[VERIFICAR]` del archivo anterior aplican aquí.
