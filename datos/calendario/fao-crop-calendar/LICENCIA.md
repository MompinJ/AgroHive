# Licencia de esta carpeta: CC BY-NC-SA 4.0

Los datos de esta carpeta (`fao-crop-calendar.json`) salen de **FAO Crop Calendar** y se tratan con la licencia **más restrictiva** que publica FAO para ellos: **Creative Commons Atribución-NoComercial-CompartirIgual 4.0 (CC BY-NC-SA 4.0)**, https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es. `[DECIDIDO]` Mompin, 15/11/2026 (docs/13, "FAO Crop Calendar").

- **Fuente:** FAO. *Crop Calendar (By Country - crop and activity)*. Catálogo de datos de la FAO, https://data.apps.fao.org/catalog/dataset/crop-calendar-by-country-crop-and-activity. Aplicación: https://cropcalendar.apps.fao.org. Descargado el 15/11/2026.
- **Por qué la más restrictiva:** ese registro del catálogo dice CC BY 4.0, pero el registro "Crop Calendar (Crops)" del mismo catálogo dice CC BY-NC-SA 4.0, y los términos generales de FAO limitan el contenido web al uso no comercial. Mientras FAO no aclare cuál manda, se usa CC BY-NC-SA 4.0.
- **Qué exige:** citar a FAO (cada ventana servida por `GET /api/calendario` lleva la fuente), no usar estos datos con fines comerciales y distribuir con la misma licencia lo que se derive de ellos.
- **Separación:** estos datos viven solos en esta carpeta, apartados de los extractos CC BY (GGCMI, MIRCA2000) y de los datos abiertos de SIAP de la carpeta de arriba. `extraer_fao.py` (código de AgroHive) los regenera.
- **Condiciona la licencia del repo** (punto D, pendiente para la fase de entrega, `docs/11`): el repo tiene que ser compatible con NC-SA para esta carpeta, o la carpeta se separa (y la API responde sin FAO).

FAO no respalda AgroHive ni sus resultados. Las ventanas son la unión de las zonas agroecológicas del país (FAO no publica sus límites) y no separan riego de temporal: ver `datos/calendario/LEEME.md`.
