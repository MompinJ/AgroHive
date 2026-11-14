# datos/catalogos/fuentes/

## `siap_isla_2021_2025.csv`

Extracto del **cierre agrícola municipal** del SIAP (Servicio de Información Agroalimentaria y Pesquera, Secretaría de Agricultura y Desarrollo Rural de México): las 85 filas del municipio de Isla, Veracruz (clave INEGI 30/077), de 2021 a 2025. Se descargó el 14/11/2026 del [portal de datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php) y se filtró sin cambiar ningún valor.

**Fuente y condiciones de uso.** El portal dice que los datos abiertos son información que *cualquier persona puede usar, reutilizar y compartir libremente*, sujeta a *el reconocimiento de la fuente que los publica y la obligación de mantener las mismas condiciones de uso al momento de redistribuirlos* (leído el 14/11/2026). Por eso:

- La fuente de este archivo es **SIAP-Agricultura**.
- Quien lo reutilice o lo redistribuya debe reconocer a esa fuente y mantener estas mismas condiciones.

`[VERIFICAR]` Una persona debe confirmar que esta redistribución cumple los términos del SIAP.

Lo usan `calendario-isla.json` (presencia de cada cultivo por temporada) y `generar.py` (`superficie_siap_isla`).
