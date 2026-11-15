"""Paleta compartida de AgroHive para todos los generadores voxel.

Cada color vive en el pixel (i % 16, i // 16) de la textura 16x16 que voxelkit
incrusta en cada .bbmodel, asi que el ORDEN es el contrato con los modelos ya
generados.

Reglas:
- Nunca reordenar, renombrar ni borrar entradas.
- Colores nuevos SIEMPRE al final.
- Maximo 256 colores.
- Documentar cada color nuevo en modelos/paleta.md.

Uso desde un generador:
    import os, sys
    AQUI = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(AQUI, '..'))          # modelos/
    from paleta import PALETA_AGROHIVE
"""

PALETA_AGROHIVE = {
    # 0-15: PALETA_BASE de voxelkit, mismo orden (no tocar)
    'soil': '#6b4a2f',
    'soil_dark': '#53371f',
    'soil_light': '#8a6240',
    'leaf': '#4aa33a',
    'leaf_dark': '#2f7a2c',
    'leaf_light': '#86cf4f',
    'wood': '#8a5a2e',
    'wood_dark': '#5e3c1c',
    'stone': '#8d8d86',
    'white': '#ececec',
    'black': '#17140f',
    'red': '#c8302c',
    'yellow': '#f2c230',
    'orange': '#ee7d1f',
    'blue': '#2a5d9f',
    'water': '#2d6f9e',
    # 16-18: suelo por humedad
    'suelo_seco': '#9b7a55',
    'suelo_humedo': '#3f2b19',
    'suelo_grieta': '#2a1c10',
    # 19-21: tallo de maiz
    'maiz_tallo_dark': '#3e6a26',
    'maiz_tallo': '#5c9134',
    'maiz_tallo_light': '#8cbf4c',
    # 22-24: hoja de maiz
    'maiz_hoja_dark': '#2e6b2b',
    'maiz_hoja': '#45993b',
    'maiz_hoja_light': '#79c25a',
    # 25-28: hoja seca / marchita
    'hoja_marchita': '#a39a45',
    'hoja_seca_dark': '#7d5f34',
    'hoja_seca': '#b08c55',
    'hoja_seca_light': '#d6bd85',
    # 29-30: espiga
    'espiga_dark': '#9c8642',
    'espiga': '#d1bc66',
    # 31-33: grano / mazorca
    'grano_dark': '#c4921f',
    'grano': '#efc63a',
    'grano_light': '#f8e17c',
    # 34-36: totomoxtle (hojas de la mazorca)
    'totomoxtle_dark': '#6b9644',
    'totomoxtle': '#9cc46a',
    'totomoxtle_seco': '#dac690',
    # 37-38: cabello de elote
    'cabello': '#b86f34',
    'cabello_light': '#e2b65f',
    # 39-43: podrido y moho
    'podrido_dark': '#3a281a',
    'podrido': '#5a4330',
    'moho_dark': '#55604b',
    'moho': '#7d8b6c',
    'moho_light': '#aab69c',
    # 44-46: hoja de frijol (verde mas claro y amarillento que el maiz)
    'frijol_hoja_dark': '#55862f',
    'frijol_hoja': '#7fb240',
    'frijol_hoja_light': '#b3d66a',
    # 47-49: vaina de frijol verde-amarilla
    'vaina_dark': '#8f9c3c',
    'vaina': '#c2c860',
    'vaina_light': '#e2df95',
    # 50-51: semilla de frijol negro y flor lila
    'frijol_negro': '#2b2230',
    'flor_lila': '#c7a3dc',
    # 52-55: hoja de calabaza (verde azulado, con manchas plateadas)
    'calabaza_hoja_dark': '#2c5a2e',
    'calabaza_hoja': '#3f7f3c',
    'calabaza_hoja_light': '#6aa65a',
    'calabaza_mancha': '#a8c69c',
    # 56-59: fruto de calabaza (verde, crema, naranja de madurez)
    'calabaza_fruto_dark': '#36603a',
    'calabaza_fruto': '#5f8f4a',
    'calabaza_crema': '#e2cf94',
    'calabaza_naranja': '#cf7f2c',
    # 60-68: suelo arenoso por humedad (seco, medio, humedo; cada uno base, oscuro, claro)
    'arenoso_seco': '#c9ad7c',
    'arenoso_seco_dark': '#a48a5f',
    'arenoso_seco_light': '#e6d3a6',
    'arenoso_medio': '#a88c5e',
    'arenoso_medio_dark': '#876d45',
    'arenoso_medio_light': '#c2a676',
    'arenoso_humedo': '#7b6241',
    'arenoso_humedo_dark': '#654f34',
    'arenoso_humedo_light': '#8e7452',
    # 69-77: suelo arcilloso por humedad (rojizo; seco con grietas, humedo liso con brillo)
    'arcilloso_seco': '#96604a',
    'arcilloso_seco_dark': '#4b2c1d',
    'arcilloso_seco_light': '#b47c62',
    'arcilloso_medio': '#6e3f2a',
    'arcilloso_medio_dark': '#4e2a1c',
    'arcilloso_medio_light': '#87533a',
    'arcilloso_humedo': '#452419',
    'arcilloso_humedo_dark': '#2e1711',
    'arcilloso_humedo_light': '#9a7468',
    # 78-80: hoja de chile (verde oscuro brillante, mas oscuro que el frijol)
    'chile_hoja_dark': '#1f4a1c',
    'chile_hoja': '#2b6624',
    'chile_hoja_light': '#4f8f34',
    # 81-82: fruto de chile verde (serrano / jalapeno)
    'chile_verde_dark': '#357219',
    'chile_verde': '#53a028',
    # 83: punta del chile rojo maduro (el cuerpo usa 'red', indice 11)
    'chile_rojo_dark': '#86160f',
    # 84: semilla de chile, plana y amarillo palido
    'chile_semilla': '#ecdca2',
    # 85: mejilla rosada de la mascota (elote feliz)
    'mascota_mejilla': '#f0857f',
    # 86-88: hoja de sandia (lobulada, verde grisaceo)
    'sandia_hoja_dark': '#2f5a34',
    'sandia_hoja': '#4f7f4a',
    'sandia_hoja_light': '#82a872',
    # 89-91: cascara de sandia (rayas oscuras sobre verde claro)
    'sandia_cascara_dark': '#1e4526',
    'sandia_cascara': '#3f7a38',
    'sandia_cascara_light': '#9cc37a',
    # 92-93: pulpa roja y corteza blanca de la sandia (la semilla usa 'black', 10; la flor 'yellow', 12)
    'sandia_pulpa': '#e2474f',
    'sandia_corteza': '#e9efc4',
    # 94-96: hoja de camote (acorazonada, verde oscuro)
    'camote_hoja_dark': '#244f27',
    'camote_hoja': '#3a7a34',
    'camote_hoja_light': '#69a649',
    # 97-98: guia y peciolo morado del camote, flor lila palida
    'camote_morado': '#6a3a6c',
    'camote_flor': '#d9b8e8',
    # 99-101: raiz tuberosa del camote (piel rosa morada, pulpa naranja)
    'camote_piel_dark': '#73304a',
    'camote_piel': '#a6506c',
    'camote_pulpa': '#e8893c',
    # 102-104: hoja de cacahuate (foliolos verde medio)
    'cacahuate_hoja_dark': '#3c6f2e',
    'cacahuate_hoja': '#5f9c3e',
    'cacahuate_hoja_light': '#93c562',
    # 105-107: vaina de cacahuate (beige reticulada)
    'cacahuate_vaina_dark': '#9c7a4c',
    'cacahuate_vaina': '#c8a674',
    'cacahuate_vaina_light': '#e4cc98',
    # 108-109: semilla de cacahuate (tegumento rojizo) y clavo (ginoforo) que baja al suelo
    'cacahuate_semilla': '#b5634a',
    'cacahuate_clavo': '#d8cfa2',
    # 110-115: soya (hoja trifoliada verde oscuro, vaina pubescente que se tuesta al madurar, grano crema)
    'soya_hoja_dark': '#2e5e26',
    'soya_hoja': '#4a8a35',
    'soya_hoja_light': '#7fb352',
    'soya_vaina': '#8fa35a',
    'soya_vaina_seca': '#9a7440',
    'soya_semilla': '#e6cf8a',
    # 116-121: frijol caupi (hoja lanceolada brillante, vaina larga delgada, semilla crema con ojo negro)
    'caupi_hoja_dark': '#2a5a2c',
    'caupi_hoja': '#3f8a3c',
    'caupi_hoja_light': '#73b55a',
    'caupi_vaina': '#a9c46a',
    'caupi_vaina_seca': '#c9ab6a',
    'caupi_semilla': '#efe2c0',
    # 122-127: haba (hoja glauca gris verde, vaina gruesa que se ennegrece, semilla grande)
    'haba_hoja_dark': '#3d5e45',
    'haba_hoja': '#6a8f73',
    'haba_hoja_light': '#9bb8a0',
    'haba_vaina': '#5f9a45',
    'haba_vaina_negra': '#2c2a24',
    'haba_semilla': '#c8c98e',
    # 128-132: chicharo (hoja y estipula verde claro glauco, vaina brillante, semilla verde redonda)
    'chicharo_hoja_dark': '#3e7038',
    'chicharo_hoja': '#69a35a',
    'chicharo_hoja_light': '#a3cf86',
    'chicharo_vaina': '#6fbb3f',
    'chicharo_semilla': '#9ccf5a',
    # 133-136: lenteja (planta fina, foliolos chicos, vaina corta plana, semilla lenticular)
    'lenteja_hoja': '#5b8c40',
    'lenteja_hoja_light': '#93bd6a',
    'lenteja_vaina': '#c4bb72',
    'lenteja_semilla': '#a8743c',
    # 137-139: ejote (vaina tierna, larga y cilindrica; la hoja usa frijol_hoja*)
    'ejote_vaina_dark': '#3f7d2a',
    'ejote_vaina': '#62a83a',
    'ejote_vaina_light': '#9fd067',
    # 140-142: hoja de cereal de grano chico (cebada, trigo, avena; verde azulado, mas angosta que el maiz)
    'cereal_hoja_dark': '#2f6640',
    'cereal_hoja': '#4f8f5a',
    'cereal_hoja_light': '#86b98a',
    # 143-144: cebada (espiga con aristas largas que cabecea)
    'cebada_espiga': '#d9c983',
    'cebada_arista': '#efe2b4',
    # 145-147: trigo (espiga compacta y erguida, dorada)
    'trigo_espiga_dark': '#b8892f',
    'trigo_espiga': '#d9aa45',
    'trigo_espiga_light': '#f0cf74',
    # 148-149: avena (panicula abierta y colgante)
    'avena_espiga': '#e3d7a3',
    'avena_espiga_dark': '#b5a46a',
    # 150-151: grano tierno de maiz dulce (elote; lo demas usa los colores del maiz)
    'maiz_dulce_grano': '#f2dc7a',
    'maiz_dulce_grano_light': '#faf0b8',
}

assert len(PALETA_AGROHIVE) <= 256, 'paleta de mas de 256 colores'
