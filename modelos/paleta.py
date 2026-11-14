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
}

assert len(PALETA_AGROHIVE) <= 256, 'paleta de mas de 256 colores'
