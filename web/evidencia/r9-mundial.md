# R9 - Revision mundial (lugares sin ejemplo grabado)

- Fecha de la revision: 15/11/2026.
- Commit de `main` sobre el que se reviso: `687ca23` (rama Mafer al dia).
- Como: la interfaz local (`npm run dev`, Vite en 127.0.0.1:5173) apuntando a la API publicada (https://64-23-143-102.sslip.io), y por separado la API publicada directa. Los 7 lugares se dibujaron en la interfaz (Terreno > Dibujar mi parcela > Agregar por coordenadas, 4 vertices, cuadro de unos 330 m) y se recorrieron Cultivos, Validacion, Agua, Escenarios y Metodo y fuentes. En la API se consultaron `/api/calendario`, `/api/clima` (2015-2024), `/api/suelo`, `/api/proxima-temporada` y `/api/plagas` para las mismas coordenadas.

## Resultado por lugar

| Lugar (lat, lon) | Que paso | Dueno |
|---|---|---|
| Sinaloa, Culiacan (25.0, -107.5) | Carga completa (UI y API). Calendario: 18 de 40 cultivos con ventana (CALENDARIO_RESUMEN); los otros 22 salen NO_EVALUABLE con motivo y sin fecha. Capa SIAP municipal (INEGI 25/006) aplicada. Sin "undefined", "NaN" ni "null" visibles. | Sin falla |
| Chiapas, Acala (16.4, -92.8) | Igual que Sinaloa: 18 de 40, SIAP 07/002, todo carga, sin texto malo. | Sin falla |
| Argentina, pampa (-33.0, -61.0) | Carga completa. 18 de 40 con ventana, el resto NO_EVALUABLE con motivo. **Falla de etiqueta:** la temporada PV/OI usa el corte de SIAP del hemisferio norte (PV = abril-septiembre). Maiz sembrado el 23/oct sale como "OI" (otono-invierno) y cebada del 1/jul como "PV"; en el sur esta al reves. Ademas trigo sale con siembra el 1/nov (el trigo argentino se siembra hacia junio-julio; no se pudo contrastar con otra fuente, solo se marca). | Mompin (calendario) |
| Nigeria, Kaduna (10.5, 7.5) | Carga completa. 18 de 40; el resto NO_EVALUABLE con motivo. Nigeria no esta entre los 57 paises de FAO Crop Calendar, asi que solo hay base GGCMI/MIRCA (no sale el aviso `FAO_CROP_CALENDAR_NC_SA`; es lo esperado). Varias ventanas caen en el dia 1 de un mes exacto (cana 1/ene, trigo 1/jun, cebada 1/nov, papa 1/dic): parece valor de relleno de GGCMI en celdas poco cultivadas; el aviso de "GGCMI extrapola fuera de las zonas cultivadas" lo cubre solo en parte. | Mompin (calendario) |
| Francia (48.5, 2.0; probado tambien 47.0/2.0, 45.0/1.0, 43.6/1.4, 49.5/3.0, Paris, 50.5/3.0) | **Falla real.** `/api/calendario` responde 422 `"sin un solo pais en Natural Earth 110m"` en toda Francia: el archivo `datos/calendario/paises-110m.json` (172 paises) no trae Francia (en Natural Earth 110m Francia tiene el codigo ISO `-99` y se pierde al filtrar). Espana y Paises Bajos si funcionan. En la interfaz no se cae: la parcela se carga y el motor corre, pero sin calendario, y muestra la nota cruda "Nota - calendario: sin un solo pais en Natural Earth 110m" y los cultivos salen "buena opcion" sin ningun comentario de calendario (ni "Se siembra en esta zona" ni NO_EVALUABLE por cultivo). Clima, suelo, proxima temporada y plagas responden bien. | Mompin (extractor/datos del mapa de paises); Eduardo (mensaje del 422 y que la UI diga "sin calendario para este lugar" por cultivo) |
| Vietnam, delta del Mekong (10.0, 105.5) | Carga completa. 18 de 40; el resto NO_EVALUABLE con motivo. Vietnam no esta en FAO Crop Calendar (solo base). Mismo detalle de fechas en dia 1 (cana 1/ene, cebada 1/nov). Plagas: gusano elotero con 14 registros GBIF, el resto "sin_registros" (sin cifra inventada). | Mompin (dia 1, igual que Nigeria) |
| Australia, NSW (-32.5, 148.5) | Carga completa. 18 de 40, el resto NO_EVALUABLE con motivo. Mismo problema de etiqueta PV/OI en hemisferio sur que Argentina (maiz 30/dic como "OI", trigo 30/abr como "PV"). Las fechas de trigo (30/abr) y cebada (30/abr) son plausibles. | Mompin (etiqueta PV/OI) |

## Hallazgos que se repiten en todos los lugares

| Tema | Que paso | Dueno |
|---|---|---|
| Texto de Isla en Metodo y fuentes | En los 7 lugares la pagina Metodo y fuentes muestra "Isla" 24 veces (no en Terreno, Cultivos ni Escenarios). Salen de las notas del catalogo de cultivos, por ejemplo "analoga al temporal primavera-verano de Isla" (sorgo, camote, haba, chicharo, lenteja, ejote, algodon, cartamo, papa, calabacita, cebolla, pepino, melon, lechuga, rabano, betabel, ajonjoli...) y "otono-invierno en Isla" (soya, higuerilla). En un lugar como Argentina o Vietnam esas notas confunden: el catalogo habla de un lugar de Veracruz. | Mafer (catalogo: `cultivos.json`/notas de parametros; reescribir como "temporal de referencia de la tabla" sin nombre propio) |
| Fecha de rotacion por defecto | La rotacion inicial trae siembras del 15/jun/2026 y 1/nov/2026 en cualquier lugar. En el hemisferio sur (Argentina, Australia) la primera cae en pleno invierno (temperatura de 11 a 12 C en la pampa). No es un numero inventado, pero un usuario nuevo recibe fechas pensadas para Mexico. | Eduardo (front) / Mompin (motor, fecha sugerida segun hemisferio) |
| Sin ventana y aun "buena opcion" | Cultivos sin ventana de calendario (por ejemplo calabaza, higuerilla en Nigeria; todo en Francia) aparecen "buena opcion" por temperatura y lluvia. El motivo NO_EVALUABLE del calendario esta en las notas (CALENDARIO_RESUMEN lista cuales), pero no en la fila del cultivo; solo se lee "Se siembra en esta zona" cuando si hay presencia. | balam (interfaz: marcar "sin calendario" en la fila) / Mompin (si el ranking debe contar el calendario) |
| Gramatica | "Gusano cogollero registrada cerca lo ataca" (concordancia de genero en la plaga). Menor. | balam |

## Lo que si cumple lo pedido por Mompin

- NO_EVALUABLE con motivo, nunca un numero: en los 6 lugares con respuesta, las 62 entradas NO_EVALUABLE del calendario (cultivo por temporada) traen `motivo` y ninguna lleva fecha ni numero. Las plagas sin registros salen `sin_registros` con conteo 0 real de GBIF, no estimado.
- Ventanas a los cultivos con fuente: 18 de 40 en cada lugar con respuesta (15 cultivos de GGCMI y 3 leguminosas por MIRCA2000, marcadas SUPUESTO). El conteo salio igual en los 6 lugares porque las capas de pais de FAO no aplican a ninguno (ninguno esta en la lista de 57 paises) y porque la base mundial es la misma.
- Sin "undefined", "NaN" ni "null" en ninguna respuesta de la API (se revisaron las cadenas de texto de cada JSON) ni en el texto visible de la interfaz (Terreno, Cultivos, Validacion, Agua, Escenarios y Metodo y fuentes) de los 7 lugares.
- Metodo y fuentes carga en los 7 lugares (206 a 228 mil caracteres de texto).
- Clima (3653 dias, 2015-2024), suelo (siempre SUPUESTO, origen `mapa_global`), proxima temporada (EXPLORATORIO, 6 meses) y plagas respondieron 200 en los 7 lugares.

## Limites de esta revision

- Los polígonos se dibujaron por el formulario "Agregar por coordenadas" (4 vertices, ~330 m), no con clics del raton sobre el mapa Leaflet; el clic en el mapa no se probo. Tampoco se verifico que el punto caiga en tierra de cultivo real (no se miro el mapa base ni el uso de suelo); las coordenadas fueron las sugeridas.
- No se contrasto ninguna ventana contra una fuente externa (por ejemplo el trigo argentino del 1/nov o los dias 1 exactos): solo se senalan por sospechosas.
- Solo se reviso el texto visible y algunas capturas guardadas; no se hizo una revision visual de las 7 escenas 3D ni de la comparacion final (paso 4, "Comparar"); se llego hasta Escenarios.
- No se probo la interfaz en ingles ni en movil.
- Los resultados dependen de la API publicada el 15/11/2026 a las 12:2x hora local; no se corrio la API local.
- La app local se apago al terminar. Scripts y capturas quedaron fuera del repo (carpeta temporal de la sesion).
