# Paleta compartida de AgroHive

Fuente de verdad: `modelos/paleta.py` (`PALETA_AGROHIVE`). Todos los generadores la importan.

Cada color ocupa el pixel `(i % 16, i // 16)` de la textura 16x16 incrustada en cada `.bbmodel`, y cada cara apunta a ese pixel. Por eso **el indice es el contrato** con los modelos ya generados.

## Reglas

1. **Nunca reordenar, renombrar ni borrar** colores. Si un color ya no se usa, se queda.
2. **Colores nuevos siempre al final** (siguiente indice libre), y se documentan en esta tabla.
3. Maximo 256 colores.
4. Por material, 3 tonos (oscuro, base, claro). Lo claro va en tapas y puntas; lo oscuro en bajos, nudos y arrugas.
5. Los indices 0-15 son `PALETA_BASE` de `herramientas/voxelkit.py`, en el mismo orden.

## Colores (85)

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

Los hex son elegidos a ojo para el estilo voxel (no medidos de fotos). Las manchas plateadas de la hoja de calabaza y el fruto verde de C. moschata se tomaron de descripciones varietales (no de una variedad concreta).

Los tonos de suelo arenoso (60-68) y arcilloso (69-77) son cualitativos, elegidos a ojo (arena mas clara y amarilla, arcilla mas rojiza y oscura); no estan medidos. El suelo franco usa los colores ya existentes (16 suelo_seco, 0 soil, 17 suelo_humedo) para coincidir con la escala de humedad de `web/src/escena/suelo.ts`.

Los tonos de chile (78-84) son cualitativos, elegidos a ojo: hoja verde oscuro brillante (mas oscura que el frijol y menos azulada que la calabaza), fruto verde mas claro que la hoja para que resalte, y rojo de madurez apoyado en `red` (11). No estan medidos de fotos.
