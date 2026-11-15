# Trailer de 30 s (demo de la entrega)

> **Apoyo, no producción** `[DECIDIDO]` (Mompin, 15/11): el equipo produce el video; aquí van guion, subtítulos, lista de tomas y plan de armado. La entrega (subir el video, mandar el formulario) pasa por la aprobación de todo el equipo (`docs/13`, "Reglas de organización del día final").
>
> **Reglas que cumple** (`docs/02`, A0.5): video de hasta 30 s; voz en inglés `[DECIDIDO]` (Mompin, 15/11) con **subtítulos en inglés y en español**; sin identidad NASA (ni logo, ni insignia, ni colores de marca; "NASA" solo como nombre de la fuente de datos); toda pieza generada con IA lleva marca visible y se declara en `docs/02` y en el README; sin personas menores de 18 años.
>
> **Honesto con `docs/10`:** no promete cosechas, rendimientos, ingresos ni el clima de una temporada exacta; los años de prueba son historia real, no pronóstico; el 3D es cualitativo.
>
> **Base:** condensa `docs/guion-video-borrador.md` (2 a 3 min, 10 escenas, cifras de Isla), que se conserva como referencia larga. Isla ya no es la demo (`docs/13`, "Demo mundial"): las cifras salen de los ejemplos mundiales.

## Idea

**"Plan for the bad year."** Un trailer, no un tutorial: abre con la pregunta ("¿y si viene seco?"), muestra el campo 3D sufriendo un año seco real, pasa a la app en acción (sembrar, cambiar de año, cosecha y plaga), remata con la idea fuerte (ordenar por el peor año, no por el mejor) y explota en un montaje de los seis ejemplos del mundo solo con música. Cierra con nombre, frase y enlace, y el límite dicho en pantalla.

- **Ejemplo principal: Bajío, Guanajuato (México).** Es el más claro para contar la historia: en el ranking de prueba el peor escenario es el **seco** para todas las rotaciones, tiene muchas plagas registradas en GBIF (394 registros de chapulín, 130 de diabrotica) para la toma de plaga, y es el ejemplo de casa.
- **Años reales del Bajío** (salen de la serie de NASA POWER 2005-2025, no dependen de la rotación; `web/src/motor/pruebas/regresion/ejemplos/bajio-guanajuato.json`, `escenarios`): **seco 2009** (561.7 mm en las temporadas de SIAP), **normal 2016** (725.4 mm), **lluvioso 2018** (834.8 mm). En la interfaz "habitual" se lee "normal".
- **El ranking que se vea en la toma se lee de la toma**, no de este archivo: las rotaciones de la regresión son de prueba y las iniciales de los ejemplos las arma el front (E10 en `docs/16`). El trailer no dice qué rotación gana; solo muestra el ranking.
- **Mascota:** Esquilote aparece una vez (toma 3) como guiño; no habla en el video.

## Ritmo de la voz

Calculado a ~2.5 palabras por segundo (como en Gateway). La voz llena los bloques 1 a 5 y 7; el bloque 6 es el pico de música, sin voz.

| Bloque | Tiempo | Palabras | Voz aprox. | Lectura |
| --- | --- | --- | --- | --- |
| 1 Gancho | 0:00-0:03 | 8 | 3.0 s | justo; la voz entra en 0:00.3 tras el primer golpe |
| 2 Problema | 0:03-0:07 | 9 | 3.6 s | holgado |
| 3 La app | 0:07-0:12 | 11 | 4.4 s | holgado |
| 4 En acción | 0:12-0:17 | 10 | 4.0 s | hueco de 1 s para la guadaña |
| 5 Peor año | 0:17-0:21 | 10 | 4.0 s | justo |
| 6 Mundial | 0:21-0:26 | 0 | — | **solo música**, cortes al ritmo |
| 7 Cierre | 0:26-0:30 | 6 | 2.4 s | 1.5 s de cartón sin voz al final |
| **Total** | **0:30** | **54** | **≈ 21 s** | |

## Guion (voz en inglés, subtítulos EN y ES)

| # | Tiempo | Imagen | Voz (EN) | Subtítulo ES | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:00-0:03 | Bajío en 3D, cerca, maíz verde; el tiempo corre en el año seco y las plantas se marchitan, el cielo cambia | "What if next season is a dry one?" | ¿Y si la próxima temporada viene seca? | **WHAT IF?** |
| 2 | 0:03-0:07 | Plano amplio del mismo campo en 2009: bloques secos o podridos | "One bad year can wipe out a whole season." | Un mal año puede acabar con toda una temporada. | Dry year · 2009 |
| 3 | 0:07-0:12 | Terreno: elegir "Bajío, Mexico" en la lista de ejemplos (2 s); laboratorio: Esquilote saluda y se pinta maíz, sorgo y frijol con la brocha (3 s) | "AgroHive tests your crop rotation against 20 years of real NASA climate." | AgroHive pone a prueba tu rotación con 20 años de clima real de la NASA. | NASA POWER climate data, 2005-2025 |
| 4 | 0:12-0:17 | Cambiar Dry / Normal / Wet (el 3D reacciona, 2.5 s); cosecha con guadaña (1.5 s); enjambre de plaga (1 s) | "Dry year, normal year, wet year. Watch your field react." | Año seco, normal y lluvioso. Mira cómo reacciona tu campo. | Dry 2009 · Normal 2016 · Wet 2018 |
| 5 | 0:17-0:21 | Comparación: el ranking por robustez, se resalta la primera fila y la columna del peor escenario | "It ranks rotations by their worst year, not their best." | Ordena las rotaciones por su peor año, no por el mejor. | Ranked by the worst year |
| 6 | 0:21-0:26 | Montaje: un plano 3D de cada ejemplo (0.6 s c/u, se nota el bioma distinto) y al final el contorno dibujado en el mapa (1.2 s) | — (música) | — | Mexico · Brazil · Kenya · India · Spain · USA → "Or draw your own field" |
| 7 | 0:26-0:30 | Cartón de cierre: logo AgroHive, frase, enlace, equipo | "AgroHive. Plan for the bad year." | AgroHive. Planea para el año malo. | **AgroHive — Plan for the bad year** · enlace · Team Code Hive · Field Shift challenge · línea chica: "Does not forecast yields, income or the weather. The farmer decides." |

Nombres del montaje (bloque 6), en este orden: Bajío, Mexico · Sorriso, Brazil · Uasin Gishu, Kenya · Ludhiana, India · Tierra de Campos, Spain · Story County, Iowa, USA.

**Si sobra voz** al grabar, lo primero que se corta es "20 years of" (bloque 3) y luego "Watch your field react" se vuelve texto en pantalla.

**Enlace del cierre** `[EN EVENTO]`: el equipo decide si va la app publicada (hoy `https://64-23-143-102.sslip.io/`) o el repositorio (`github.com/MompinJ/AgroHive`). En pantalla conviene uno solo, corto.

**Evento en el cierre:** "Field Shift challenge" en texto, sin logos del evento ni de NASA. Si se quiere poner "NASA Space Apps Challenge 2026" como texto, confirmar antes con las reglas de marca (`docs/02`, guía de imágenes y medios) `[VERIFICAR]`.

## Subtítulos

Archivos listos para importar en el editor (SRT, mismos tiempos que la tabla):

- [`trailer-30s/trailer-30s.en.srt`](trailer-30s/trailer-30s.en.srt) — inglés.
- [`trailer-30s/trailer-30s.es.srt`](trailer-30s/trailer-30s.es.srt) — español.
- [`trailer-30s/trailer-30s.bilingue.srt`](trailer-30s/trailer-30s.bilingue.srt) — dos líneas por subtítulo (EN arriba, ES abajo) para quemarlos en el video.

**Recomendación:** quemar el bilingüe en el video (así se ven en cualquier reproductor) y, si la plataforma lo permite, subir además el `.en.srt` como pista. Estilo: abajo al centro, EN en blanco y ES más chico en gris claro o cursiva, con sombra o caja semitransparente; el texto de pantalla de la tabla va arriba o al centro para que no choque.

## Voz

**Voz con IA en Krea** `[DECIDIDO]` (Mompin, 15/11: "tengo KREA, para la voz"). Krea tiene texto a voz (ElevenLabs `elevenlabs/tts` y Seed Audio). Flujo obligatorio: se pule el texto, se pide el costo con preflight, se muestra la ficha (modelo, voz, texto, costo y saldo) y **no se genera nada sin el OK de Mompin**; primero una sola toma para validar el tono.

- **Tono:** voz adulta, cálida y segura, ritmo de trailer pero sin exagerar; acento neutro.
- **Se generan los 6 bloques por separado** (más fácil de ajustar al corte) o el texto completo con pausas marcadas; se decide en la ficha.
- **Declaración (obligatoria por `docs/02`):** en el video, una línea visible en el cartón final ("Voice: AI-generated (Krea / ElevenLabs)" o el modelo real); en el audio exportado, el mismo texto en los metadatos (`comment`/`description`); y la mención en `docs/02` y en el README.

## Música y sonido

Sin derechos dudosos: **no usar pistas "No copyright" de canales de YouTube** (su licencia no siempre es verificable).

| Opción | Licencia | Qué hacer |
| --- | --- | --- |
| **A. Música generada en Krea** (`elevenlabs/music`, instrumental) | Términos de Krea; es IA, se declara igual que la voz | Recomendada: un solo rastro de licencia con la voz. Prompt: trailer cinemático-orgánico, 30 s, golpe en 0:00, construye hasta el pico en 0:21, corte seco en 0:26 y cola suave. Pasa por la misma ficha |
| B. Pixabay Music | Pixabay Content License: uso libre, sin atribución obligatoria | Guardar la URL de la pista y una captura de la licencia en la carpeta del video |
| C. YouTube Audio Library, filtro "Attribution not required" | Licencia de la biblioteca | Igual: guardar la ficha de la pista |

**Efectos:** golpe grave en 0:00 y en 0:21; viento seco en el bloque 2; barrido para la guadaña; zumbido corto para el enjambre; silencio de medio segundo antes del "AgroHive" final. De biblioteca con licencia libre (Pixabay SFX) o de Krea, declarados.

**Mezcla:** voz al frente (unos -14 LUFS integrados), música bajo la voz (unos -20 dB, sube en el bloque 6), sin que la música tape la voz.

## Lista de tomas

Se graba **más largo de lo que se usa** (5 a 8 s por toma) para elegir el mejor tramo en el corte. Columna EN: depende de la versión en inglés de la app (B7 de balam). Columna E10: depende de que los ejemplos mundiales estén conectados en el front (E10 de Eduardo); hoy `main` todavía muestra la demo de Isla.

| Toma | Bloque | Pantalla | Ejemplo | Acción | Usa | Graba | EN | E10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 1 | Laboratorio, escena 3D a pantalla completa | Bajío | Encuadre cerrado sobre el maíz; mover la fecha dentro del año seco (2009) de mitad a final de ciclo: marchitez y cielo | 3 s | 8 s | No (encuadre sin textos) | Sí |
| T2 | 2 | Laboratorio, 3D | Bajío | Plano amplio del campo en seco, órbita lenta | 4 s | 8 s | No | Sí |
| T3a | 3 | Terreno | Bajío | Elegir "Bajío" en la lista de ejemplos | 2 s | 5 s | **Sí** | Sí |
| T3b | 3 | Laboratorio | Bajío | Esquilote saluda (tutorial, primer paso) y se pintan celdas con la brocha | 3 s | 8 s | **Sí** | Sí |
| T4a | 4 | Laboratorio / Escenarios | Bajío | Cambiar Dry → Normal → Wet; el 3D cambia | 2.5 s | 8 s | **Sí** | Sí |
| T4b | 4 | Laboratorio | Bajío | Llevar la fecha al último día del ciclo: animación de cosecha con guadaña | 1.5 s | 4 s | **Sí** (aviso de la animación) | Sí |
| T4c | 4 | Laboratorio | Bajío | Plagas sin insecticida, fecha a mitad de ciclo: enjambre | 1 s | 4 s | **Sí** | Sí |
| T5 | 5 | Comparación | Bajío | Bajar al ranking por robustez; resaltar la primera fila y "worst scenario" | 4 s | 8 s | **Sí** | Sí |
| T6a-f | 6 | Laboratorio, 3D | Los 6 | Un plano de cada ejemplo con su bioma, misma altura de cámara y movimiento (órbita lenta hacia la derecha) para que el corte fluya | 0.6 s c/u | 4 s c/u | No | Sí |
| T6g | 6 | Terreno, dibujar | Parcela propia en el mapa | Cerrar el contorno y ver la cuadrícula | 1.2 s | 5 s | **Sí** (textos del mapa) | No |
| T7 | 7 | Cartón (se hace en el editor) | — | Logo, frase, enlace, equipo, límite y declaración de IA | 4 s | — | — | — |
| R1 | Respaldo | Método y fuentes | Bajío | Desplazar por fuentes y límites (por si se cambia el bloque 5) | — | 8 s | **Sí** | Sí |

**Pueden grabarse ya** (sin esperar a B7): T1, T2 y T6a-f, si el front ya carga los ejemplos (E10). Todo lo demás espera a la versión en inglés.

### Cómo grabar

- **Resolución:** 1920 x 1080 (ventana del navegador a ese tamaño exacto, o pantalla completa con F11 en un monitor 1080p). Si el monitor es mayor, grabar a 2560 x 1440 y exportar a 1080p.
- **Cuadros:** 60 fps en OBS (salida 1080p60, CRF 18 o calidad "indistinguible"). La escena solo dibuja cuando algo cambia: grabar siempre con movimiento (órbita, cambio de fecha) para que se vea fluido.
- **Cursor oculto:** en OBS, desmarcar "Capturar cursor" en la fuente. Excepción posible: T3b (brocha), si se ve mejor con cursor; grabarla de las dos formas.
- **Gráficos en Alto:** el selector "Gráficos" del HUD de la escena (abajo a la derecha) en **Alto** (resolución, aves y viento). Con GPU real; sin GPU la escena va a unos 9 cuadros/s (`docs/10`).
- **Tutorial de Esquilote:** cerrado en todas las tomas menos T3b.
- **Navegador limpio:** perfil sin extensiones ni barra de marcadores, zoom al 100 %, sin notificaciones del sistema; idioma de la app en inglés (B7).
- **Sin red no pasa nada:** los ejemplos son también el respaldo sin red (`datos/demo/ejemplos/`), así que se puede grabar en local (`docs/demo-sin-red.md`).
- **Nombres de archivo:** `T1_bajio_seco_v1.mp4`, `T6c_kenia_v1.mp4`, etc.; marcar la buena en el tablero de abajo.

### Estado de las tomas

| Toma | Estado | Archivo bueno | Notas |
| --- | --- | --- | --- |
| T1 | Espera E10 | | |
| T2 | Espera E10 | | |
| T3a | Espera E10 y B7 | | |
| T3b | Espera E10 y B7 | | |
| T4a | Espera E10 y B7 | | |
| T4b | Espera E10 y B7 | | |
| T4c | Espera E10 y B7 | | |
| T5 | Espera E10 y B7 | | |
| T6a-f | Espera E10 | | |
| T6g | Espera B7 | | |
| T7 | Por hacer en el editor | | |
| Voz | Espera OK de la ficha de Krea | | |
| Música | Por elegir (A, B o C) | | |

## Cómo se arma

1. **Voz primero:** con la ficha aprobada se genera la voz en Krea por bloques; se mide cuánto dura cada uno y se ajusta la escaleta a la voz real.
2. **Tomas:** se graban según la lista (cuando entren E10 y B7) y se elige el mejor tramo de cada una.
3. **Edición** en el editor que use el equipo (Kdenlive, DaVinci o CapCut): línea de tiempo 1920 x 1080 a 60 fps (o 30 si la plataforma lo pide), pistas: video, texto en pantalla, subtítulos, voz, música, efectos. Cortes al ritmo de la música, sobre todo en el bloque 6.
4. **Subtítulos:** importar el `.bilingue.srt` y ajustar los tiempos a la voz real.
5. **Cartón final** con el logo de AgroHive de la app, la frase, el enlace, "Team Code Hive", la línea de límites y la declaración de IA.
6. **Exportar** MP4 H.264, 1080p, AAC 48 kHz; comprobar que dura **30 s o menos**. Poner la declaración de IA en los metadatos del archivo (con ffmpeg: `-metadata comment="Voice and music: AI-generated with Krea"`).
7. **Revisión del equipo** antes de subirlo (enlace público, sin registro ni permisos; `docs/02`).

## Antes de publicar

- [ ] Duración ≤ 30 s.
- [ ] Ni logo ni insignia de NASA ni del evento; "NASA" solo como nombre de la fuente de datos.
- [ ] Ninguna frase dice que predice cosechas, ingresos o el clima de una temporada.
- [ ] Subtítulos en inglés visibles; español debajo.
- [ ] Voz y música (si son de IA) marcadas en el video, en los metadatos, en `docs/02` y en el README.
- [ ] Licencia de la música y de los efectos guardada con el proyecto.
- [ ] Sin personas menores de 18 años.
- [ ] El ranking que se ve en T5 es el que da la app en esa toma (no se retoca).
- [ ] Aprobación de todo el equipo.

## Presentación de respaldo (7 diapositivas)

Por si el equipo la quiere además del video (la regla permite video de hasta 30 s **o** siete diapositivas, contando portada e introducción). En inglés. Se arma como deck (enlace aparte).

1. **Cover** — AgroHive: Plan for the bad year. Team Code Hive · Field Shift challenge. Imagen: la escena 3D de un ejemplo.
2. **The problem** — Rain-fed farmers bet a whole season on the weather. Planning for the best year breaks in the worst one. Climate has shifted; "it will rain as usual" is no longer a plan.
3. **What AgroHive does** — A what-if simulator: pick a sample farm or draw your own field, paint crops on a 3D voxel field (40 crops), and test the rotation against a real dry, normal and wet year. The farmer decides.
4. **Data and method** — NASA POWER daily climate 2005-2025 (with GPM IMERG via POWER as evidence); Terrarium elevation; SoilGrids and OpenLandMap soil (`SUPUESTO`); GGCMI phase 3 planting calendar; FAO-56 water balance per cell, run in the browser. Evidence layers: MODIS NDVI, SMAP, GBIF pest records (illustrative). Missing data is shown as `NO_EVALUABLE`, never invented.
5. **Robustness, not maximum yield** — Each rotation is scored per scenario on water deficit, water excess, planting-window fit and soil cover; ranked by its worst year and minimax regret. Example: Bajío, Mexico, tested against 2009 (dry), 2016 (normal) and 2018 (wet).
6. **Worldwide** — Six sample farms on five continents: Bajío (Mexico), Sorriso (Brazil), Uasin Gishu (Kenya), Ludhiana (India), Tierra de Campos (Spain), Story County (Iowa, USA). Scene biome from Köppen-Geiger. Same sources everywhere; local sources on top where they exist.
7. **Honest limits + close** — Does not forecast yields, income or an exact season; climate is regional (one POWER cell per field); the 3D is qualitative; every result needs local validation. Link, team, AI-use statement.
