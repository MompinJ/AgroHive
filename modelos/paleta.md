# Paleta compartida de AgroHive

Fuente de verdad: `modelos/paleta.py` (`PALETA_AGROHIVE`). Todos los generadores la importan.

Cada color ocupa el pixel `(i % 16, i // 16)` de la textura 16x16 incrustada en cada `.bbmodel`, y cada cara apunta a ese pixel. Por eso **el indice es el contrato** con los modelos ya generados.

## Reglas

1. **Nunca reordenar, renombrar ni borrar** colores. Si un color ya no se usa, se queda.
2. **Colores nuevos siempre al final** (siguiente indice libre), y se documentan en esta tabla.
3. Maximo 256 colores.
4. Por material, 3 tonos (oscuro, base, claro). Lo claro va en tapas y puntas; lo oscuro en bajos, nudos y arrugas.
5. Los indices 0-15 son `PALETA_BASE` de `herramientas/voxelkit.py`, en el mismo orden.

## Colores (152)

| Indice | Nombre | Hex | Uso |
| --- | --- | --- | --- |
| 0 | soil | #6b4a2f | Suelo base, lomo del surco |
| 1 | soil_dark | #53371f | Terrones, sombra de suelo |
| 2 | soil_light | #8a6240 | Tapa del lomo, suelo con luz |
| 3 | leaf | #4aa33a | Follaje generico |
| 4 | leaf_dark | #2f7a2c | Follaje generico oscuro |
| 5 | leaf_light | #86cf4f | Follaje generico claro |
| 6 | wood | #8a5a2e | Madera |
| 7 | wood_dark | #5e3c1c | Madera oscura |
| 8 | stone | #8d8d86 | Piedra |
| 9 | white | #ececec | Blanco |
| 10 | black | #17140f | Negro (moscas, detalles) |
| 11 | red | #c8302c | Rojo |
| 12 | yellow | #f2c230 | Amarillo generico |
| 13 | orange | #ee7d1f | Naranja |
| 14 | blue | #2a5d9f | Azul |
| 15 | water | #2d6f9e | Agua |
| 16 | suelo_seco | #9b7a55 | Suelo seco / sequia |
| 17 | suelo_humedo | #3f2b19 | Suelo humedo, hoyo de siembra |
| 18 | suelo_grieta | #2a1c10 | Grietas de suelo seco |
| 19 | maiz_tallo_dark | #3e6a26 | Nudos y raices de soporte del maiz |
| 20 | maiz_tallo | #5c9134 | Tallo de maiz |
| 21 | maiz_tallo_light | #8cbf4c | Tallo tierno (brote) |
| 22 | maiz_hoja_dark | #2e6b2b | Hojas bajas de maiz |
| 23 | maiz_hoja | #45993b | Hoja de maiz base |
| 24 | maiz_hoja_light | #79c25a | Puntas de hoja, cogollo |
| 25 | hoja_marchita | #a39a45 | Hoja amarillenta / marchita |
| 26 | hoja_seca_dark | #7d5f34 | Hoja o tallo seco en sombra |
| 27 | hoja_seca | #b08c55 | Hoja seca base |
| 28 | hoja_seca_light | #d6bd85 | Hoja seca con luz |
| 29 | espiga_dark | #9c8642 | Ramas de la espiga |
| 30 | espiga | #d1bc66 | Espiga (panoja) |
| 31 | grano_dark | #c4921f | Grano / semilla en sombra |
| 32 | grano | #efc63a | Grano de mazorca amarillo |
| 33 | grano_light | #f8e17c | Punta de la mazorca, brillo |
| 34 | totomoxtle_dark | #6b9644 | Base del totomoxtle, pedunculo |
| 35 | totomoxtle | #9cc46a | Hojas de la mazorca (verde) |
| 36 | totomoxtle_seco | #dac690 | Totomoxtle seco |
| 37 | cabello | #b86f34 | Cabello de elote |
| 38 | cabello_light | #e2b65f | Puntas del cabello |
| 39 | podrido_dark | #3a281a | Tejido podrido, quiebres |
| 40 | podrido | #5a4330 | Podrido base |
| 41 | moho_dark | #55604b | Moho en sombra |
| 42 | moho | #7d8b6c | Moho gris verdoso |
| 43 | moho_light | #aab69c | Moho con luz, alas de mosca |
| 44 | frijol_hoja_dark | #55862f | Tallo, peciolos y hojas bajas de frijol |
| 45 | frijol_hoja | #7fb240 | Foliolo de frijol base (mas claro y amarillo que el maiz) |
| 46 | frijol_hoja_light | #b3d66a | Foliolo terminal de frijol, punta de guia |
| 47 | vaina_dark | #8f9c3c | Vaina de frijol en sombra, cotiledon arrugado |
| 48 | vaina | #c2c860 | Vaina de frijol verde-amarilla, cotiledon |
| 49 | vaina_light | #e2df95 | Pico de la vaina, cotiledon con luz |
| 50 | frijol_negro | #2b2230 | Semilla de frijol negro, vaina podrida |
| 51 | flor_lila | #c7a3dc | Flor de frijol |
| 52 | calabaza_hoja_dark | #2c5a2e | Peciolo y lobulo en sombra de calabaza |
| 53 | calabaza_hoja | #3f7f3c | Lamina de hoja de calabaza |
| 54 | calabaza_hoja_light | #6aa65a | Lobulo con luz, cotiledon de calabaza |
| 55 | calabaza_mancha | #a8c69c | Mancha plateada de la hoja (rasgo de C. moschata) |
| 56 | calabaza_fruto_dark | #36603a | Tapa del fruto verde |
| 57 | calabaza_fruto | #5f8f4a | Fruto de calabaza verde |
| 58 | calabaza_crema | #e2cf94 | Gajos crema del fruto, pepitas |
| 59 | calabaza_naranja | #cf7f2c | Fruto de calabaza ya madurando |
| 60 | arenoso_seco | #c9ad7c | Arena seca, la mas clara |
| 61 | arenoso_seco_dark | #a48a5f | Granos oscuros de arena seca |
| 62 | arenoso_seco_light | #e6d3a6 | Granos claros y rizos de arena seca |
| 63 | arenoso_medio | #a88c5e | Arena con humedad media |
| 64 | arenoso_medio_dark | #876d45 | Granos oscuros de arena media |
| 65 | arenoso_medio_light | #c2a676 | Granos claros de arena media |
| 66 | arenoso_humedo | #7b6241 | Arena humeda, uniforme |
| 67 | arenoso_humedo_dark | #654f34 | Granos y manchas de arena humeda |
| 68 | arenoso_humedo_light | #8e7452 | Granos claros apenas visibles de arena humeda |
| 69 | arcilloso_seco | #96604a | Placas de arcilla seca |
| 70 | arcilloso_seco_dark | #4b2c1d | Fondo de grietas de arcilla seca |
| 71 | arcilloso_seco_light | #b47c62 | Placas levantadas de arcilla seca |
| 72 | arcilloso_medio | #6e3f2a | Arcilla con humedad media |
| 73 | arcilloso_medio_dark | #4e2a1c | Grietas cerrandose, sombra de arcilla media |
| 74 | arcilloso_medio_light | #87533a | Terrones lisos de arcilla media |
| 75 | arcilloso_humedo | #452419 | Arcilla humeda, lisa y oscura |
| 76 | arcilloso_humedo_dark | #2e1711 | Charcos y huellas en arcilla humeda |
| 77 | arcilloso_humedo_light | #9a7468 | Brillo de humedad sobre arcilla |
| 78 | chile_hoja_dark | #1f4a1c | Hoja de chile en sombra, hojas bajas, cotiledon de chile |
| 79 | chile_hoja | #2b6624 | Lamina de hoja de chile (verde oscuro, mas que el frijol) |
| 80 | chile_hoja_light | #4f8f34 | Punta brillante de la hoja de chile, brote nuevo |
| 81 | chile_verde_dark | #357219 | Caliz y punta del chile verde |
| 82 | chile_verde | #53a028 | Cuerpo del chile verde (serrano / jalapeno) |
| 83 | chile_rojo_dark | #86160f | Punta del chile rojo maduro (el cuerpo usa `red`, 11) |
| 84 | chile_semilla | #ecdca2 | Semilla de chile, plana y amarillo palido |
| 85 | mascota_mejilla | #f0857f | Mejillas rosadas de la mascota (elote feliz, `props/mascota_feliz`) |
| 86 | sandia_hoja_dark | #2f5a34 | Hoja de sandia en sombra, guia, cotiledon de sandia |
| 87 | sandia_hoja | #4f7f4a | Lamina de la hoja lobulada de sandia (verde grisaceo) |
| 88 | sandia_hoja_light | #82a872 | Lobulo con luz de la hoja de sandia, zarcillo |
| 89 | sandia_cascara_dark | #1e4526 | Rayas oscuras de la cascara de sandia |
| 90 | sandia_cascara | #3f7a38 | Cascara de la sandia joven o en sombra |
| 91 | sandia_cascara_light | #9cc37a | Fondo claro entre rayas de la cascara |
| 92 | sandia_pulpa | #e2474f | Pulpa roja de la sandia (rebanada, fruto partido) |
| 93 | sandia_corteza | #e9efc4 | Corteza blanca entre cascara y pulpa |
| 94 | camote_hoja_dark | #244f27 | Hoja de camote en sombra, hojas bajas |
| 95 | camote_hoja | #3a7a34 | Lamina de la hoja acorazonada de camote |
| 96 | camote_hoja_light | #69a649 | Hoja nueva y borde con luz del camote |
| 97 | camote_morado | #6a3a6c | Guia rastrera y peciolo morado del camote |
| 98 | camote_flor | #d9b8e8 | Flor en campanita del camote, lila palido |
| 99 | camote_piel_dark | #73304a | Piel del camote en sombra, raicillas |
| 100 | camote_piel | #a6506c | Piel rosa morada de la raiz tuberosa |
| 101 | camote_pulpa | #e8893c | Pulpa naranja del camote partido |
| 102 | cacahuate_hoja_dark | #3c6f2e | Foliolo de cacahuate en sombra, tallo |
| 103 | cacahuate_hoja | #5f9c3e | Foliolo de cacahuate (hoja de 4 foliolos) |
| 104 | cacahuate_hoja_light | #93c562 | Foliolo con luz, brote de cacahuate |
| 105 | cacahuate_vaina_dark | #9c7a4c | Reticulado y sombra de la vaina de cacahuate |
| 106 | cacahuate_vaina | #c8a674 | Vaina de cacahuate (beige) |
| 107 | cacahuate_vaina_light | #e4cc98 | Vaina con luz, cacahuate seco |
| 108 | cacahuate_semilla | #b5634a | Semilla de cacahuate con su tegumento rojizo |
| 109 | cacahuate_clavo | #d8cfa2 | Clavo (ginoforo) que baja a enterrar la vaina |
| 110 | soya_hoja_dark | #2e5e26 | Hoja de soya en sombra, tallo |
| 111 | soya_hoja | #4a8a35 | Foliolo de soya (hoja trifoliada) |
| 112 | soya_hoja_light | #7fb352 | Foliolo con luz, brote de soya |
| 113 | soya_vaina | #8fa35a | Vaina verde y pubescente de soya |
| 114 | soya_vaina_seca | #9a7440 | Vaina tostada de soya madura, planta seca en pie |
| 115 | soya_semilla | #e6cf8a | Grano de soya, amarillo crema |
| 116 | caupi_hoja_dark | #2a5a2c | Hoja de caupi en sombra, guia |
| 117 | caupi_hoja | #3f8a3c | Foliolo lanceolado y brillante del caupi |
| 118 | caupi_hoja_light | #73b55a | Foliolo con luz del caupi |
| 119 | caupi_vaina | #a9c46a | Vaina larga y delgada del caupi, verde claro |
| 120 | caupi_vaina_seca | #c9ab6a | Vaina seca color paja del caupi |
| 121 | caupi_semilla | #efe2c0 | Semilla crema del caupi (el ojo usa black) |
| 122 | haba_hoja_dark | #3d5e45 | Hoja de haba en sombra, tallo cuadrado |
| 123 | haba_hoja | #6a8f73 | Foliolo glauco (gris verde) de haba |
| 124 | haba_hoja_light | #9bb8a0 | Foliolo con luz y brote de haba |
| 125 | haba_vaina | #5f9a45 | Vaina gruesa y carnosa de haba |
| 126 | haba_vaina_negra | #2c2a24 | Vaina madura y seca de haba, casi negra |
| 127 | haba_semilla | #c8c98e | Semilla grande de haba, verde palido a beige |
| 128 | chicharo_hoja_dark | #3e7038 | Hoja de chicharo en sombra, zarcillo |
| 129 | chicharo_hoja | #69a35a | Foliolo y estipula de chicharo, verde claro glauco |
| 130 | chicharo_hoja_light | #a3cf86 | Foliolo con luz del chicharo |
| 131 | chicharo_vaina | #6fbb3f | Vaina verde brillante del chicharo |
| 132 | chicharo_semilla | #9ccf5a | Chicharo (semilla) verde redondo |
| 133 | lenteja_hoja | #5b8c40 | Foliolo chico de lenteja |
| 134 | lenteja_hoja_light | #93bd6a | Foliolo con luz de lenteja |
| 135 | lenteja_vaina | #c4bb72 | Vaina corta y plana de lenteja |
| 136 | lenteja_semilla | #a8743c | Lenteja (semilla) cafe |
| 137 | ejote_vaina_dark | #3f7d2a | Vaina de ejote en sombra |
| 138 | ejote_vaina | #62a83a | Vaina tierna de ejote, verde brillante |
| 139 | ejote_vaina_light | #9fd067 | Vaina de ejote con luz |
| 140 | cereal_hoja_dark | #2f6640 | Hoja de cereal en sombra, macollo |
| 141 | cereal_hoja | #4f8f5a | Hoja angosta de cebada, trigo o avena |
| 142 | cereal_hoja_light | #86b98a | Hoja de cereal con luz, tallo tierno |
| 143 | cebada_espiga | #d9c983 | Espiga de cebada madura, paja palida |
| 144 | cebada_arista | #efe2b4 | Aristas (barbas) largas de la cebada |
| 145 | trigo_espiga_dark | #b8892f | Espiguillas de trigo en sombra |
| 146 | trigo_espiga | #d9aa45 | Espiga de trigo madura, dorada |
| 147 | trigo_espiga_light | #f0cf74 | Espiga de trigo con luz |
| 148 | avena_espiga | #e3d7a3 | Espiguilla de avena madura, paja clara |
| 149 | avena_espiga_dark | #b5a46a | Espiguilla de avena en sombra, raquis |
| 150 | maiz_dulce_grano | #f2dc7a | Grano tierno de elote, amarillo palido |
| 151 | maiz_dulce_grano_light | #faf0b8 | Grano tierno con luz, lechoso |

Los hex son elegidos a ojo para el estilo voxel (no medidos de fotos). Las manchas plateadas de la hoja de calabaza y el fruto verde de C. moschata se tomaron de descripciones varietales (no de una variedad concreta).

Los tonos de suelo arenoso (60-68) y arcilloso (69-77) son cualitativos, elegidos a ojo (arena mas clara y amarilla, arcilla mas rojiza y oscura); no estan medidos. El suelo franco usa los colores ya existentes (16 suelo_seco, 0 soil, 17 suelo_humedo) para coincidir con la escala de humedad de `web/src/escena/suelo.ts`.

Los tonos de chile (78-84) son cualitativos, elegidos a ojo: hoja verde oscuro brillante (mas oscura que el frijol y menos azulada que la calabaza), fruto verde mas claro que la hoja para que resalte, y rojo de madurez apoyado en `red` (11). No estan medidos de fotos.

La mascota (`modelos/props/mascota_feliz`) reutiliza grano (31-33), totomoxtle (34-36), cabello (37-38), `black` (10) para ojos y boca y `white` (9) para el brillo de los ojos; solo agrega el rosa de las mejillas (85), elegido a ojo.

Los tonos de sandia (86-93), camote (94-101) y cacahuate (102-109) son cualitativos, elegidos a ojo (14/11 noche, sesion de cultivos con OK de Mompin): hoja de sandia verde grisaceo y cascara con rayas oscuras sobre verde claro, pulpa roja y corteza blanca; camote con hoja acorazonada verde oscuro, guia morada, piel rosa morada y pulpa naranja (variedad de pulpa naranja); cacahuate con foliolos verde medio, vaina beige y semilla de tegumento rojizo. No estan medidos de fotos. Se agregaron juntos y antes de modelar para que los tres generadores trabajen con la paleta fija.

Los tonos de soya (110-115), frijol caupi (116-121), haba (122-127), chicharo (128-132) y lenteja (133-136) son cualitativos, elegidos a ojo (15/11 madrugada, sesion de cultivos, ampliacion del catalogo): la flor reutiliza `flor_lila` (51) o `white` (9), la mancha de la flor de haba y el ojo del caupi `black` (10), y lo seco `hoja_seca*` y `podrido*`. No estan medidos de fotos.

Los tonos de ejote (137-139), hoja de cereal (140-142), cebada (143-144), trigo (145-147), avena (148-149) y grano de maiz dulce (150-151) son cualitativos, elegidos a ojo (15/11 madrugada, sesion de cultivos): el ejote reutiliza la hoja del frijol (44-46) y el maiz dulce la planta del maiz; la paja seca usa `hoja_seca*` y `espiga*`. No estan medidos de fotos.
