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
}

assert len(PALETA_AGROHIVE) <= 256, 'paleta de mas de 256 colores'
