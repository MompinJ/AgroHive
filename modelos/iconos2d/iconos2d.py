"""Iconos 2D de cultivos (AgroHive): un sprite plano por cultivo y etapa, para el modo 2D (A3.6).

Correr desde la raiz del repo:
    python modelos/iconos2d/iconos2d.py

Genera 65 SVG (maiz, frijol, calabaza, chile, sorgo, sandia, camote, cacahuate, soya, caupi, haba, chicharo y lenteja
x siembra, brote, crecimiento, madurez, podrida) y visor_iconos.html.
Cada icono es pixel art de 16 x 16 con fondo transparente: `shape-rendering="crispEdges"` y rectangulos por tramo
de color, asi que a 32 px (x2) y 64 px (x4) conserva los pixeles. Usa SOLO colores de modelos/paleta.py (los mismos
de los modelos 3D): ningun color nuevo. El color nunca va solo: cada icono tiene silueta propia y un <title> en
espanol. La prueba web/src/escena/pruebas/iconos2d.test.ts mide, con daltonismo.ts, que todo par de iconos se
distinga bajo protanopia, deuteranopia y tritanopia.

Todos comparten el mismo suelo abajo (3 filas), como la losa de la celda. Cada etapa tiene su forma: siembra =
semillas, brote = tallito con dos hojas, crecimiento = planta media, madurez = planta alta con su fruto,
podrida = tallo acamado, moho y fruto negro.
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402

N = 16
ETAPAS = ('siembra', 'brote', 'crecimiento', 'madurez', 'podrida')
NOMBRES = {'maiz': 'Maíz', 'frijol': 'Frijol', 'calabaza': 'Calabaza', 'chile': 'Chile', 'sorgo': 'Sorgo',
           'sandia': 'Sandía', 'camote': 'Camote', 'cacahuate': 'Cacahuate', 'soya': 'Soya', 'caupi': 'Frijol caupí',
           'haba': 'Haba', 'chicharo': 'Chícharo', 'lenteja': 'Lenteja'}
ETIQUETAS = {'siembra': 'en siembra', 'brote': 'en brote', 'crecimiento': 'en crecimiento', 'madurez': 'en madurez',
             'podrida': 'podrida'}


class Lienzo:
    def __init__(self):
        self.px = {}

    def p(self, x, y, c):
        if not (0 <= x < N and 0 <= y < N):
            raise ValueError(f'pixel fuera del lienzo: {x},{y}')
        if c not in PAL:
            raise KeyError(f'color {c!r} no esta en la paleta')
        self.px[(x, y)] = c

    def r(self, x0, y0, x1, y1, c):
        """Rectangulo con extremos incluidos."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def suelo(self, tope='soil_light', seco=False):
        self.r(0, 14, 15, 15, 'soil')
        self.r(1, 13, 14, 13, 'suelo_seco' if seco else tope)


def svg(lienzo, titulo):
    filas = []
    for y in range(N):
        x = 0
        while x < N:
            c = lienzo.px.get((x, y))
            if c is None:
                x += 1
                continue
            fin = x + 1
            while fin < N and lienzo.px.get((fin, y)) == c:
                fin += 1
            filas.append((c, f'M{x} {y}h{fin - x}v1H{x}z'))
            x = fin
    por_color = {}
    for c, d in filas:
        por_color.setdefault(c, []).append(d)
    caminos = ''.join(f'<path fill="{PAL[c]}" d="{"".join(ds)}"/>' for c, ds in por_color.items())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" width="{N}" height="{N}" '
            f'shape-rendering="crispEdges" role="img" aria-label="{titulo}"><title>{titulo}</title>{caminos}</svg>\n')


# ---------------- maiz ----------------
def maiz_siembra(c):
    c.suelo('suelo_humedo')
    for x in (1, 4, 7, 10, 13):
        c.r(x, 10, x + 1, 12, 'grano'); c.r(x, 9, x, 9, 'grano_light')


def maiz_brote(c):
    c.suelo()
    c.r(7, 7, 8, 12, 'maiz_tallo_light')
    c.r(9, 6, 9, 6, 'maiz_hoja_light'); c.r(10, 5, 11, 5, 'maiz_hoja_light'); c.r(12, 6, 12, 7, 'maiz_hoja_light')
    c.r(5, 8, 6, 8, 'maiz_hoja')


def maiz_crecimiento(c):
    c.suelo()
    c.r(7, 4, 8, 12, 'maiz_tallo')
    c.r(3, 8, 6, 8, 'maiz_hoja'); c.p(2, 7, 'maiz_hoja')
    c.r(9, 6, 12, 6, 'maiz_hoja_light'); c.p(13, 5, 'maiz_hoja_light')
    c.r(4, 10, 6, 10, 'maiz_hoja_dark'); c.p(3, 11, 'maiz_hoja_dark')
    c.r(7, 2, 8, 3, 'maiz_hoja_light')


def maiz_madurez(c):
    c.suelo()
    c.r(7, 3, 8, 12, 'maiz_tallo')
    c.r(6, 0, 9, 0, 'espiga'); c.r(7, 1, 8, 2, 'espiga_dark')
    c.r(3, 6, 6, 6, 'maiz_hoja'); c.p(2, 7, 'maiz_hoja'); c.p(1, 8, 'maiz_hoja')
    c.r(4, 10, 6, 10, 'maiz_hoja_dark'); c.p(3, 11, 'maiz_hoja_dark')
    c.r(9, 6, 10, 9, 'grano'); c.p(10, 7, 'grano_light')
    c.r(9, 10, 10, 10, 'totomoxtle'); c.p(11, 9, 'totomoxtle_dark'); c.p(10, 5, 'cabello')


def maiz_podrida(c):
    c.suelo(seco=True)
    c.r(7, 9, 8, 12, 'hoja_seca_dark')
    c.p(8, 8, 'hoja_seca_dark'); c.r(9, 7, 10, 7, 'hoja_seca'); c.p(11, 8, 'hoja_seca'); c.p(11, 9, 'hoja_seca_dark')
    c.r(3, 11, 6, 11, 'hoja_seca'); c.p(2, 12, 'hoja_seca_dark')
    c.r(6, 12, 9, 12, 'moho_dark'); c.p(6, 11, 'moho')
    c.r(10, 11, 13, 12, 'podrido'); c.r(11, 10, 12, 10, 'moho_light'); c.p(13, 10, 'moho')


# ---------------- frijol ----------------
def frijol_siembra(c):
    c.suelo('suelo_humedo')
    for x in (2, 7, 12):
        c.r(x, 9, x + 2, 12, 'frijol_negro')
        c.p(x, 9, 'vaina_light'); c.p(x + 1, 10, 'vaina_dark')


def frijol_brote(c):
    c.suelo()
    c.r(7, 9, 8, 12, 'frijol_hoja_dark')
    c.r(3, 8, 6, 10, 'vaina'); c.r(9, 8, 12, 10, 'vaina_light')
    c.r(7, 7, 8, 8, 'frijol_hoja')


def frijol_crecimiento(c):
    c.suelo()
    c.r(7, 5, 8, 12, 'frijol_hoja_dark')
    c.r(2, 5, 6, 8, 'frijol_hoja'); c.p(1, 6, 'frijol_hoja')
    c.r(9, 3, 13, 6, 'frijol_hoja_light'); c.p(14, 4, 'frijol_hoja_light')
    c.r(7, 1, 8, 4, 'frijol_hoja_light')
    c.r(2, 10, 5, 11, 'frijol_hoja')


def frijol_madurez(c):
    c.suelo()
    c.r(7, 3, 8, 12, 'frijol_hoja_dark')
    c.r(3, 5, 6, 7, 'frijol_hoja'); c.p(2, 6, 'frijol_hoja')
    c.r(10, 5, 11, 10, 'vaina'); c.p(11, 11, 'vaina_light'); c.p(10, 7, 'vaina_dark'); c.p(11, 9, 'vaina_dark')
    c.r(5, 9, 6, 12, 'vaina_dark'); c.p(5, 12, 'vaina_light')
    c.p(9, 3, 'flor_lila')


def frijol_podrida(c):
    c.suelo(seco=True)
    c.r(7, 9, 8, 12, 'hoja_seca_dark'); c.p(8, 8, 'hoja_seca_dark'); c.r(9, 7, 10, 7, 'hoja_seca_dark')
    c.r(3, 9, 6, 10, 'hoja_seca')
    c.r(10, 8, 11, 12, 'frijol_negro'); c.r(10, 7, 11, 7, 'moho_light')
    c.r(5, 12, 7, 12, 'moho_dark')


# ---------------- calabaza ----------------
def calabaza_siembra(c):
    c.suelo('suelo_humedo')
    c.r(1, 10, 5, 12, 'calabaza_crema'); c.r(1, 12, 2, 12, 'grano_light')
    c.r(9, 8, 13, 10, 'calabaza_crema'); c.r(12, 10, 13, 10, 'grano_light')


def calabaza_brote(c):
    c.suelo()
    c.r(7, 10, 8, 12, 'calabaza_hoja_dark')
    c.r(3, 8, 6, 9, 'calabaza_hoja_light'); c.p(2, 7, 'calabaza_hoja_light')
    c.r(9, 8, 12, 9, 'calabaza_hoja'); c.p(13, 7, 'calabaza_hoja')


def calabaza_crecimiento(c):
    c.suelo()
    c.r(7, 10, 8, 12, 'calabaza_hoja_dark')
    c.r(4, 5, 11, 9, 'calabaza_hoja')
    c.r(5, 4, 10, 4, 'calabaza_hoja'); c.r(3, 6, 3, 8, 'calabaza_hoja_light'); c.r(12, 6, 12, 8, 'calabaza_hoja_light')
    c.p(6, 6, 'calabaza_mancha'); c.p(9, 7, 'calabaza_mancha'); c.p(7, 8, 'calabaza_mancha')
    c.r(12, 10, 14, 10, 'maiz_tallo_light'); c.p(14, 9, 'maiz_tallo_light')


def calabaza_madurez(c):
    c.suelo()
    c.r(2, 1, 7, 4, 'calabaza_hoja'); c.r(3, 0, 6, 0, 'calabaza_hoja_light'); c.p(4, 2, 'calabaza_mancha')
    c.r(7, 5, 7, 7, 'calabaza_hoja_dark')
    c.r(5, 8, 13, 12, 'calabaza_naranja')
    c.r(6, 7, 12, 7, 'calabaza_naranja'); c.r(6, 13, 12, 13, 'calabaza_naranja')
    c.r(9, 8, 9, 12, 'calabaza_crema'); c.p(7, 9, 'calabaza_crema')
    c.r(9, 5, 10, 6, 'calabaza_fruto_dark')


def calabaza_podrida(c):
    c.suelo(seco=True)
    c.r(5, 8, 12, 12, 'podrido'); c.r(6, 7, 11, 7, 'podrido'); c.r(6, 13, 11, 13, 'podrido')
    c.r(6, 6, 11, 6, 'moho'); c.r(7, 5, 10, 5, 'moho_light'); c.p(12, 7, 'moho_dark')
    c.r(2, 10, 4, 11, 'hoja_seca'); c.p(1, 12, 'hoja_seca_dark')
    c.r(9, 9, 10, 10, 'podrido_dark')


# ---------------- chile ----------------
def chile_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((2, 11), (6, 9), (9, 11), (12, 8)):
        c.r(x, y, x + 2, y + 1, 'chile_semilla')


def chile_brote(c):
    c.suelo()
    c.r(7, 7, 8, 12, 'chile_hoja_dark')
    c.r(4, 7, 6, 8, 'chile_hoja_dark'); c.r(9, 6, 11, 7, 'chile_hoja_light'); c.r(7, 5, 8, 6, 'chile_hoja_light')


def chile_crecimiento(c):
    c.suelo()
    c.r(7, 3, 8, 12, 'chile_hoja_dark')
    c.r(3, 5, 6, 8, 'chile_hoja'); c.r(9, 4, 12, 7, 'chile_hoja_light')
    c.r(3, 10, 6, 11, 'chile_hoja'); c.r(9, 9, 11, 10, 'chile_hoja')
    c.r(7, 1, 8, 2, 'chile_hoja_light'); c.p(6, 3, 'white'); c.p(9, 2, 'white')


def chile_madurez(c):
    c.suelo()
    c.r(7, 2, 8, 12, 'chile_hoja_dark')
    c.r(4, 4, 6, 6, 'chile_hoja'); c.r(10, 3, 12, 5, 'chile_hoja')
    c.r(10, 7, 11, 10, 'red'); c.p(10, 11, 'red'); c.p(10, 12, 'chile_rojo_dark'); c.r(10, 6, 11, 6, 'chile_verde_dark')
    c.r(4, 8, 5, 10, 'chile_verde'); c.p(4, 11, 'chile_verde'); c.r(4, 7, 5, 7, 'chile_verde_dark')


def chile_podrida(c):
    c.suelo(seco=True)
    c.r(7, 4, 7, 12, 'hoja_seca_dark'); c.r(8, 4, 9, 4, 'hoja_seca_dark')
    c.r(3, 10, 5, 10, 'hoja_marchita')
    c.r(9, 5, 10, 9, 'podrido'); c.p(9, 10, 'podrido_dark'); c.r(9, 4, 10, 4, 'moho')
    c.r(5, 12, 6, 12, 'moho_dark')


# ---------------- sorgo ----------------
def sorgo_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((1, 10), (5, 11), (9, 10), (13, 11)):
        c.r(x, y, x + 1, y + 1, 'cabello'); c.p(x, y, 'cabello_light'); c.p(x + 1, y + 1, 'wood')


def sorgo_brote(c):
    c.suelo()
    c.r(7, 6, 8, 12, 'maiz_tallo'); c.r(7, 4, 8, 5, 'maiz_hoja_light')
    for x, y in ((6, 6), (5, 7), (4, 8), (3, 9), (2, 10), (6, 9), (5, 10), (4, 11)):
        c.p(x, y, 'maiz_hoja_dark')
    for x, y in ((9, 6), (10, 7), (11, 8), (12, 9), (13, 10), (9, 9), (10, 10), (11, 11)):
        c.p(x, y, 'maiz_hoja_light')


def sorgo_crecimiento(c):
    c.suelo()
    c.r(7, 2, 8, 12, 'maiz_tallo_dark'); c.r(8, 2, 8, 12, 'maiz_tallo_light')
    for x, y in ((6, 5), (5, 6), (4, 7), (3, 8), (6, 9), (5, 10), (4, 11)):
        c.p(x, y, 'maiz_hoja_light'); c.p(x, y + 1 if y < 11 else y, 'maiz_hoja_dark')
    for x, y in ((9, 4), (10, 5), (11, 6), (12, 7), (9, 9), (10, 10), (11, 11)):
        c.p(x, y, 'maiz_hoja_light')
    c.r(7, 0, 8, 1, 'maiz_hoja_light')


def sorgo_madurez(c):
    c.suelo()
    c.r(7, 5, 8, 12, 'maiz_tallo')
    c.r(3, 9, 6, 9, 'maiz_hoja'); c.p(2, 10, 'maiz_hoja')
    c.r(9, 8, 12, 8, 'maiz_hoja_light'); c.p(13, 9, 'maiz_hoja_light')
    c.r(6, 1, 9, 4, 'cabello'); c.r(7, 0, 8, 0, 'cabello'); c.r(7, 5, 8, 5, 'cabello')
    c.r(6, 1, 7, 2, 'cabello_light'); c.r(9, 3, 9, 4, 'wood'); c.p(8, 4, 'wood')


def sorgo_podrida(c):
    c.suelo(seco=True)
    c.r(7, 9, 8, 12, 'hoja_seca_dark'); c.p(7, 8, 'hoja_seca_dark'); c.r(5, 7, 6, 7, 'hoja_seca_dark')
    c.r(3, 8, 5, 12, 'podrido'); c.r(3, 7, 4, 7, 'moho_light'); c.r(3, 10, 3, 11, 'moho'); c.p(5, 12, 'podrido_dark')
    c.r(10, 10, 13, 10, 'hoja_seca'); c.p(14, 11, 'hoja_seca_dark')
    c.r(9, 12, 10, 12, 'moho_dark')


# ---------------- ayudas de sandia, camote y cacahuate ----------------
def corazon(c, x, y, col, punta=None):
    """Hoja acorazonada de 3 x 3 (camote): dos lobulos arriba y la punta abajo."""
    c.p(x, y, col); c.p(x + 2, y, col); c.r(x, y + 1, x + 2, y + 1, col); c.p(x + 1, y + 2, punta or col)


def vaina_cintura(c, x, y, col, luz, sombra):
    """Vaina de cacahuate de 5 x 3, con dos lomos y su cintura al centro."""
    c.r(x, y, x + 1, y, luz); c.r(x + 3, y, x + 4, y, luz)
    c.r(x, y + 1, x + 4, y + 1, col); c.p(x + 2, y + 1, sombra)
    c.r(x, y + 2, x + 1, y + 2, sombra); c.r(x + 3, y + 2, x + 4, y + 2, sombra)


# ---------------- sandia ----------------
def sandia_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((1, 11), (6, 11), (11, 11)):
        c.r(x, y, x + 2, y + 1, 'black'); c.p(x, y, 'stone')
    for x in (3, 9, 13):
        c.r(x, 14, x + 1, 14, 'black')


def sandia_brote(c):
    c.suelo()
    c.r(8, 8, 8, 12, 'sandia_hoja_dark')
    c.r(4, 9, 7, 9, 'sandia_hoja_light'); c.r(3, 10, 7, 10, 'sandia_hoja'); c.p(3, 9, 'sandia_hoja')
    c.r(9, 9, 12, 9, 'sandia_hoja_light'); c.r(9, 10, 13, 10, 'sandia_hoja'); c.p(13, 9, 'sandia_hoja')
    c.p(6, 4, 'sandia_hoja'); c.p(8, 4, 'sandia_hoja'); c.p(10, 4, 'sandia_hoja')
    c.r(6, 5, 10, 5, 'sandia_hoja'); c.r(7, 6, 9, 6, 'sandia_hoja'); c.p(8, 7, 'sandia_hoja_dark')
    c.p(8, 5, 'sandia_hoja_dark'); c.p(7, 5, 'sandia_hoja_light')


def sandia_crecimiento(c):
    c.suelo()
    c.r(0, 12, 15, 12, 'sandia_hoja_dark')
    c.p(2, 7, 'sandia_hoja'); c.p(4, 7, 'sandia_hoja'); c.r(1, 8, 5, 8, 'sandia_hoja'); c.r(2, 9, 6, 9, 'sandia_hoja')
    c.r(1, 10, 4, 10, 'sandia_hoja'); c.p(3, 11, 'sandia_hoja_dark'); c.p(2, 8, 'sandia_hoja_light'); c.p(4, 9, 'sandia_hoja_light')
    c.p(10, 5, 'sandia_hoja'); c.p(13, 5, 'sandia_hoja'); c.r(9, 6, 14, 6, 'sandia_hoja'); c.r(10, 7, 14, 7, 'sandia_hoja')
    c.r(9, 8, 13, 8, 'sandia_hoja'); c.r(10, 9, 14, 9, 'sandia_hoja'); c.r(11, 10, 13, 10, 'sandia_hoja')
    c.p(12, 11, 'sandia_hoja_dark'); c.p(10, 6, 'sandia_hoja_light'); c.p(11, 7, 'sandia_hoja_light'); c.p(12, 8, 'sandia_hoja_light')
    c.p(7, 8, 'yellow'); c.p(6, 9, 'yellow'); c.p(8, 9, 'yellow'); c.p(7, 9, 'orange'); c.p(7, 10, 'yellow')
    c.p(7, 11, 'sandia_hoja_dark')


def sandia_madurez(c):
    c.suelo()
    c.r(3, 6, 8, 6, 'sandia_cascara_light'); c.r(2, 7, 9, 7, 'sandia_cascara_light')
    c.r(1, 8, 10, 11, 'sandia_cascara_light'); c.r(2, 12, 9, 12, 'sandia_cascara')
    for x0 in (3, 6, 9):
        for y in range(6, 13):
            x = x0 + (y // 2) % 2 - 1
            if c.px.get((x, y)) in ('sandia_cascara_light', 'sandia_cascara'):
                c.p(x, y, 'sandia_cascara_dark')
    c.p(5, 5, 'sandia_hoja_dark'); c.p(6, 4, 'sandia_hoja_dark'); c.p(7, 4, 'sandia_hoja_dark')
    c.p(9, 2, 'sandia_hoja'); c.p(11, 2, 'sandia_hoja'); c.r(8, 3, 12, 3, 'sandia_hoja'); c.r(9, 4, 13, 4, 'sandia_hoja')
    c.r(10, 5, 12, 5, 'sandia_hoja'); c.p(10, 3, 'sandia_hoja_light'); c.p(11, 4, 'sandia_hoja_light')
    c.r(11, 12, 15, 12, 'sandia_cascara'); c.r(11, 11, 15, 11, 'sandia_corteza')
    c.r(12, 10, 15, 10, 'sandia_pulpa'); c.r(13, 9, 15, 9, 'sandia_pulpa'); c.r(14, 8, 15, 8, 'sandia_pulpa')
    c.p(13, 10, 'black'); c.p(15, 9, 'black')


def sandia_podrida(c):
    c.suelo(seco=True)
    c.r(4, 9, 9, 9, 'podrido'); c.r(2, 10, 11, 12, 'podrido')
    for x in (3, 6, 10):
        c.p(x, 10, 'podrido_dark'); c.p(x + 1, 11, 'podrido_dark'); c.p(x, 12, 'podrido_dark')
    c.p(6, 9, 'podrido_dark'); c.p(7, 9, 'sandia_pulpa'); c.p(7, 10, 'podrido_dark')
    c.r(3, 8, 5, 8, 'moho'); c.p(4, 7, 'moho_light'); c.r(9, 8, 10, 8, 'moho'); c.p(10, 7, 'moho_light')
    c.p(12, 9, 'hoja_seca'); c.p(14, 9, 'hoja_seca'); c.r(12, 10, 14, 10, 'hoja_seca'); c.p(13, 11, 'hoja_seca_dark')
    c.r(12, 12, 15, 12, 'hoja_seca_dark'); c.p(1, 11, 'hoja_seca'); c.p(0, 12, 'hoja_seca')


# ---------------- camote ----------------
def camote_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((2, 12), (3, 12), (4, 11), (5, 11), (6, 10), (7, 10), (8, 9), (9, 9), (10, 8), (11, 8), (12, 7), (1, 13)):
        c.p(x, y, 'camote_morado')
    corazon(c, 4, 7, 'camote_hoja'); c.p(6, 9, 'camote_morado')
    corazon(c, 8, 5, 'camote_hoja_dark'); c.p(9, 8, 'camote_morado')
    corazon(c, 12, 4, 'camote_hoja_light', 'camote_hoja')


def camote_brote(c):
    c.suelo()
    c.r(7, 6, 7, 13, 'camote_morado'); c.r(5, 8, 6, 8, 'camote_morado'); c.r(8, 7, 10, 7, 'camote_morado')
    c.r(1, 5, 2, 5, 'camote_hoja'); c.r(4, 5, 5, 5, 'camote_hoja'); c.r(1, 6, 5, 6, 'camote_hoja')
    c.r(2, 7, 4, 7, 'camote_hoja'); c.p(3, 8, 'camote_hoja_dark'); c.p(4, 8, 'camote_morado')
    c.r(9, 3, 10, 3, 'camote_hoja_light'); c.r(12, 3, 13, 3, 'camote_hoja_light'); c.r(9, 4, 13, 4, 'camote_hoja_light')
    c.r(10, 5, 12, 5, 'camote_hoja_light'); c.p(11, 6, 'camote_hoja')
    c.r(7, 4, 7, 5, 'camote_hoja_light'); c.p(6, 4, 'camote_hoja_light')


def camote_crecimiento(c):
    c.suelo()
    c.r(5, 6, 9, 6, 'camote_hoja_light'); c.r(3, 7, 11, 7, 'camote_hoja'); c.r(2, 8, 13, 9, 'camote_hoja')
    c.r(1, 10, 14, 11, 'camote_hoja_dark'); c.r(0, 12, 15, 12, 'camote_morado')
    for x, y in ((3, 8), (6, 7), (9, 8), (12, 9), (5, 10), (10, 10)):
        corazon(c, x - 1, y, 'camote_hoja_light')
    c.p(6, 11, 'camote_morado'); c.p(9, 11, 'camote_morado')
    c.r(2, 4, 4, 4, 'camote_flor'); c.p(3, 5, 'camote_morado'); c.p(3, 6, 'camote_hoja_dark')
    c.r(10, 3, 12, 3, 'camote_flor'); c.p(11, 4, 'camote_morado'); c.p(11, 5, 'camote_hoja_dark'); c.p(11, 6, 'camote_hoja_dark')
    c.p(7, 5, 'camote_flor')


def camote_madurez(c):
    c.suelo()
    c.r(5, 3, 9, 3, 'camote_hoja_light'); c.r(3, 4, 11, 4, 'camote_hoja'); c.r(2, 5, 12, 7, 'camote_hoja')
    c.r(3, 8, 12, 8, 'camote_hoja_dark'); c.r(4, 9, 11, 9, 'camote_hoja_dark')
    for x, y in ((4, 4), (8, 5), (11, 6), (5, 7)):
        corazon(c, x - 1, y, 'camote_hoja_light')
    c.p(5, 10, 'camote_morado'); c.p(10, 10, 'camote_morado')
    c.r(2, 11, 5, 11, 'camote_piel'); c.r(1, 12, 6, 12, 'camote_piel'); c.r(2, 13, 5, 13, 'camote_piel_dark')
    c.r(9, 11, 12, 11, 'camote_piel'); c.r(8, 12, 12, 12, 'camote_piel'); c.r(9, 13, 12, 13, 'camote_piel_dark')
    c.r(13, 11, 13, 13, 'camote_pulpa'); c.p(14, 12, 'camote_pulpa'); c.p(0, 13, 'camote_piel_dark')


def camote_podrida(c):
    c.suelo(seco=True)
    corazon(c, 1, 8, 'hoja_marchita', 'hoja_seca_dark'); c.p(2, 8, 'hoja_marchita')
    corazon(c, 11, 6, 'hoja_seca', 'hoja_seca_dark'); c.r(12, 9, 12, 10, 'hoja_seca_dark')
    c.r(3, 11, 3, 12, 'hoja_seca_dark'); c.p(13, 8, 'hoja_seca_dark')
    c.r(5, 11, 10, 12, 'podrido'); c.r(6, 10, 9, 10, 'podrido'); c.r(5, 12, 10, 12, 'podrido_dark')
    c.r(6, 9, 7, 9, 'moho'); c.p(8, 9, 'moho_light'); c.p(9, 10, 'moho'); c.p(7, 11, 'camote_piel_dark')
    c.r(12, 12, 15, 12, 'camote_piel_dark'); c.p(13, 11, 'moho_dark')


# ---------------- cacahuate ----------------
def cacahuate_siembra(c):
    c.suelo('suelo_humedo')
    vaina_cintura(c, 1, 10, 'cacahuate_vaina', 'cacahuate_vaina_light', 'cacahuate_vaina_dark')
    c.r(6, 11, 7, 12, 'cacahuate_semilla'); c.p(7, 11, 'cacahuate_vaina_light')
    for x in (3, 8, 12):
        c.r(x, 13, x + 1, 14, 'cacahuate_semilla'); c.p(x + 1, 13, 'cacahuate_vaina_light')
    c.r(9, 10, 9, 11, 'cacahuate_vaina'); c.r(10, 12, 14, 12, 'cacahuate_vaina_dark'); c.r(15, 10, 15, 11, 'cacahuate_vaina')
    c.r(10, 10, 11, 11, 'cacahuate_semilla'); c.p(12, 11, 'cacahuate_vaina'); c.r(13, 10, 14, 11, 'cacahuate_semilla')
    c.p(11, 10, 'cacahuate_vaina_light'); c.p(14, 10, 'cacahuate_vaina_light')


def cacahuate_brote(c):
    c.suelo()
    c.r(7, 5, 7, 12, 'cacahuate_hoja_dark'); c.p(8, 12, 'cacahuate_hoja_dark')
    c.r(2, 7, 6, 7, 'cacahuate_hoja_dark'); c.r(8, 5, 13, 5, 'cacahuate_hoja_dark')
    for x, y in ((2, 5), (5, 5), (2, 8), (5, 8), (9, 3), (12, 3), (9, 6), (12, 6)):
        c.r(x, y, x + 1, y + 1, 'cacahuate_hoja_light'); c.p(x + 1, y + 1, 'cacahuate_hoja')
    c.r(7, 3, 7, 4, 'cacahuate_hoja_light')


def cacahuate_crecimiento(c):
    c.suelo()
    for x in (1, 5, 9, 13):
        c.r(x, 7, x + 1, 7, 'cacahuate_hoja_light')
    c.r(0, 8, 15, 9, 'cacahuate_hoja'); c.r(1, 10, 14, 10, 'cacahuate_hoja_dark')
    for x in (1, 4, 7, 10, 13):
        c.p(x, 8, 'cacahuate_hoja_light'); c.p(x + 1, 9, 'cacahuate_hoja_dark')
    for x in (3, 7, 8, 12):
        c.r(x, 11, x, 12, 'cacahuate_hoja_dark')
    c.r(3, 5, 4, 5, 'yellow'); c.p(3, 6, 'orange'); c.r(10, 5, 11, 5, 'yellow'); c.p(11, 6, 'orange')
    c.p(5, 11, 'yellow'); c.p(10, 11, 'yellow')


def cacahuate_madurez(c):
    c.suelo()
    c.r(5, 3, 10, 3, 'cacahuate_hoja_light'); c.r(3, 4, 12, 4, 'cacahuate_hoja'); c.r(1, 5, 14, 8, 'cacahuate_hoja')
    c.r(2, 9, 13, 9, 'cacahuate_hoja_dark'); c.r(4, 10, 11, 10, 'cacahuate_hoja_dark')
    for x, y in ((4, 4), (8, 4), (11, 5), (2, 6), (6, 6), (12, 7), (9, 7), (4, 8)):
        c.r(x, y, x + 1, y, 'cacahuate_hoja_light'); c.p(x, y + 1, 'cacahuate_hoja_dark')
    c.p(7, 3, 'yellow'); c.p(13, 5, 'yellow'); c.p(1, 7, 'yellow')
    c.p(3, 10, 'cacahuate_clavo'); c.p(3, 11, 'cacahuate_clavo'); c.p(12, 10, 'cacahuate_clavo'); c.p(12, 11, 'cacahuate_clavo')
    c.p(7, 11, 'cacahuate_clavo')
    vaina_cintura(c, 1, 12, 'cacahuate_vaina', 'cacahuate_vaina_light', 'cacahuate_vaina_dark')
    vaina_cintura(c, 10, 12, 'cacahuate_vaina', 'cacahuate_vaina_light', 'cacahuate_vaina_dark')
    c.r(6, 12, 8, 12, 'cacahuate_vaina_light'); c.r(6, 13, 8, 13, 'cacahuate_vaina_dark')


def cacahuate_podrida(c):
    c.suelo(seco=True)
    c.r(6, 9, 6, 12, 'hoja_seca_dark'); c.p(5, 8, 'hoja_seca_dark'); c.p(4, 7, 'hoja_seca_dark'); c.r(7, 10, 9, 10, 'hoja_seca_dark')
    for x, y in ((2, 6), (3, 8), (9, 9), (11, 10), (13, 11), (7, 7)):
        c.r(x, y, x + 1, y, 'hoja_seca'); c.p(x + 1, y + 1, 'hoja_seca_light')
    c.r(1, 10, 3, 10, 'hoja_marchita')
    vaina_cintura(c, 0, 11, 'podrido', 'moho_light', 'podrido_dark')
    vaina_cintura(c, 8, 11, 'cacahuate_vaina_dark', 'moho', 'podrido')


# ---------------- ayudas de las leguminosas (soya, caupi, haba, chicharo, lenteja) ----------------
def grano_redondo(c, x, y, col, luz, ojo=None):
    """Grano redondo de 3 x 3 sin esquinas (soya): cruz con brillo arriba y el hilo abajo."""
    c.p(x + 1, y, luz); c.r(x, y + 1, x + 2, y + 1, col); c.p(x + 1, y + 2, ojo or col)


def trifolio(c, x, y, col, luz, sombra):
    """Hoja trifoliada de 5 x 4 (soya): foliolo central arriba y dos laterales, con el peciolo al centro."""
    c.r(x + 1, y, x + 3, y, luz); c.r(x + 1, y + 1, x + 3, y + 1, col)
    c.r(x, y + 2, x + 1, y + 3, col); c.r(x + 3, y + 2, x + 4, y + 3, col)
    c.p(x, y + 2, luz); c.p(x + 4, y + 2, luz); c.p(x + 2, y + 2, sombra); c.p(x + 2, y + 3, sombra)


def diagonal(c, x, y, dx, dy, largo, col):
    """Linea de `largo` pixeles desde (x, y) en el paso (dx, dy): foliolos lanceolados, vainas largas, zarcillos."""
    for i in range(largo):
        c.p(x + dx * i, y + dy * i, col)


def flor_haba(c, x, y):
    """Flor de haba de 2 x 2: petalos blancos con la mancha negra."""
    c.r(x, y, x + 1, y, 'white'); c.p(x, y + 1, 'white'); c.p(x + 1, y + 1, 'black')


def mapa(c, x0, y0, filas, colores):
    """Dibuja un mapa de letras desde (x0, y0): cada letra es un color de `colores` y '.' queda vacio."""
    for dy, fila in enumerate(filas):
        for dx, letra in enumerate(fila):
            if letra != '.':
                c.p(x0 + dx, y0 + dy, colores[letra])


# ---------------- soya ----------------
def soya_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((3, 10), (7, 10), (11, 10), (5, 8), (9, 8), (7, 6)):
        grano_redondo(c, x, y, 'soya_semilla', 'grano_light', 'soya_vaina_seca')
    grano_redondo(c, 0, 10, 'soya_semilla', 'grano_light', 'soya_vaina_seca')


def soya_brote(c):
    c.suelo()
    c.r(7, 4, 7, 12, 'soya_hoja_dark')
    c.r(4, 9, 6, 10, 'soya_vaina'); c.p(4, 10, 'soya_hoja'); c.r(8, 9, 10, 10, 'soya_vaina'); c.p(10, 10, 'soya_hoja')
    c.r(3, 4, 6, 6, 'soya_hoja'); c.r(4, 3, 5, 3, 'soya_hoja_light'); c.p(3, 4, 'soya_hoja_light')
    c.r(8, 4, 11, 6, 'soya_hoja'); c.r(9, 3, 10, 3, 'soya_hoja_light'); c.p(11, 4, 'soya_hoja_light')
    c.p(6, 6, 'soya_hoja_dark'); c.p(8, 6, 'soya_hoja_dark'); c.p(7, 2, 'soya_hoja_light'); c.p(7, 3, 'soya_hoja_light')


def soya_crecimiento(c):
    c.suelo()
    c.r(7, 4, 8, 12, 'soya_hoja_dark')
    trifolio(c, 5, 1, 'soya_hoja', 'soya_hoja_light', 'soya_hoja_dark')
    trifolio(c, 1, 4, 'soya_hoja', 'soya_hoja_light', 'soya_hoja_dark'); c.p(6, 6, 'soya_hoja_dark')
    trifolio(c, 10, 5, 'soya_hoja', 'soya_hoja_light', 'soya_hoja_dark'); c.p(9, 7, 'soya_hoja_dark')
    trifolio(c, 2, 9, 'soya_hoja', 'soya_hoja_light', 'soya_hoja_dark')
    trifolio(c, 9, 9, 'soya_hoja', 'soya_hoja_light', 'soya_hoja_dark')
    c.p(6, 8, 'flor_lila'); c.p(9, 4, 'flor_lila')


def soya_madurez(c):
    c.suelo()
    mapa(c, 0, 1, (
        '.......h........',
        '......hsh.......',
        '.....lvsl.......',
        '.....vvsvv......',
        '....h.vsv.......',
        '....lvvsvvl.....',
        '.....vvsvv......',
        '...h..vsv.lh....',
        '....lvvsvvv.....',
        '....vv.svv......',
        '.......s........',
        '......sss.......',
    ), {'s': 'hoja_seca_dark', 'v': 'soya_vaina_seca', 'l': 'hoja_seca_light', 'h': 'hoja_seca'})


def soya_podrida(c):
    c.suelo(seco=True)
    mapa(c, 0, 5, (
        '....sss.........',
        '...s...s........',
        '..s.....s.......',
        '.ppm....sv......',
        '.mpp....sv......',
        '..pp...vs.......',
        '..m....vs..hh...',
        '.ooo...ss..hlh..',
    ), {'s': 'hoja_seca_dark', 'v': 'soya_vaina_seca', 'l': 'hoja_seca_light', 'h': 'hoja_seca', 'p': 'podrido',
        'm': 'moho', 'o': 'moho_dark'})


# ---------------- frijol caupi ----------------
def caupi_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((0, 11), (5, 9), (10, 11)):
        c.r(x + 1, y, x + 3, y, 'caupi_semilla'); c.r(x, y + 1, x + 4, y + 1, 'caupi_semilla')
        c.r(x + 1, y + 2, x + 3, y + 2, 'hoja_seca_light'); c.p(x + 2, y, 'black'); c.p(x + 2, y + 1, 'black')
    c.r(5, 12, 9, 12, 'caupi_semilla'); c.r(6, 11, 8, 11, 'caupi_semilla'); c.p(7, 11, 'black')


def caupi_brote(c):
    c.suelo()
    c.r(7, 8, 7, 12, 'caupi_hoja_dark')
    c.r(5, 10, 6, 11, 'caupi_semilla'); c.r(8, 10, 9, 11, 'caupi_semilla'); c.p(5, 11, 'hoja_seca_light'); c.p(9, 11, 'hoja_seca_light')
    c.p(6, 7, 'caupi_hoja_dark')
    for i, (x, y) in enumerate(((5, 7), (4, 6), (3, 6), (2, 5), (1, 5), (0, 4))):
        c.p(x, y, 'caupi_hoja'); c.p(x, y + 1, 'caupi_hoja_dark' if i else 'caupi_hoja')
    for i, (x, y) in enumerate(((8, 7), (9, 6), (10, 6), (11, 5), (12, 5), (13, 4), (14, 3))):
        c.p(x, y, 'caupi_hoja_light'); c.p(x, y + 1, 'caupi_hoja')
    c.p(7, 7, 'caupi_hoja_light'); c.p(7, 6, 'caupi_hoja_light')


def caupi_crecimiento(c):
    c.suelo()
    c.r(7, 7, 8, 12, 'caupi_hoja_dark')
    diagonal(c, 6, 9, -1, 1, 3, 'caupi_hoja_dark'); c.r(0, 12, 3, 12, 'caupi_hoja_dark')
    diagonal(c, 9, 9, 1, 1, 3, 'caupi_hoja_dark'); c.r(12, 12, 15, 12, 'caupi_hoja_dark')
    for x, y, d in ((2, 9, -1), (5, 6, -1), (2, 11, -1), (10, 6, 1), (13, 9, 1), (13, 11, 1)):
        diagonal(c, x, y, d, -1, 3, 'caupi_hoja'); c.p(x, y, 'caupi_hoja_light')
    for x, y, d in ((7, 6, -1), (8, 6, 1), (4, 9, -1), (11, 9, 1)):
        diagonal(c, x, y, d, -1, 3, 'caupi_hoja_light')
    c.r(7, 2, 8, 2, 'flor_lila'); c.p(7, 3, 'caupi_hoja_dark'); c.p(8, 3, 'caupi_hoja_dark'); c.r(7, 4, 8, 5, 'caupi_hoja')


def caupi_madurez(c):
    c.suelo()
    c.r(2, 9, 13, 10, 'caupi_hoja'); c.r(4, 8, 11, 8, 'caupi_hoja_light'); c.r(3, 11, 12, 11, 'caupi_hoja_dark')
    for x in (2, 6, 10, 13):
        c.p(x, 9, 'caupi_hoja_light'); c.p(x - 1, 10, 'caupi_hoja_dark')
    c.r(7, 1, 8, 7, 'caupi_hoja_dark')
    for i in range(7):
        c.r(6 - i, 2 + i, 6 - i, 3 + i, 'caupi_vaina_seca'); c.r(9 + i, 2 + i, 9 + i, 3 + i, 'caupi_vaina_seca')
    c.p(0, 9, 'hoja_seca'); c.p(15, 9, 'hoja_seca'); c.p(6, 2, 'hoja_seca'); c.p(9, 2, 'hoja_seca')
    c.p(4, 4, 'caupi_vaina'); c.p(11, 4, 'caupi_vaina')


def caupi_podrida(c):
    c.suelo(seco=True)
    c.r(0, 11, 6, 11, 'podrido'); c.r(1, 12, 7, 12, 'podrido_dark'); c.p(2, 10, 'moho_light'); c.p(5, 10, 'moho')
    c.r(8, 10, 15, 10, 'caupi_vaina_seca'); c.r(8, 11, 14, 11, 'podrido'); c.p(11, 9, 'moho_light'); c.p(14, 9, 'moho')
    c.r(9, 12, 12, 12, 'moho_dark')
    c.r(7, 7, 7, 10, 'hoja_seca_dark'); c.p(6, 6, 'hoja_seca_dark'); c.r(3, 6, 5, 6, 'hoja_seca'); c.p(2, 7, 'hoja_seca')
    c.r(8, 6, 10, 6, 'hoja_marchita'); c.p(11, 7, 'hoja_marchita'); c.p(4, 7, 'hoja_seca_light')


# ---------------- haba ----------------
def haba_siembra(c):
    c.suelo('suelo_humedo')
    mapa(c, 0, 6, (
        '......hsh.......',
        '.....hsssd......',
        '.....nsssd......',
        '.....nsssd......',
        '......sdd.......',
        'hssssn....hssssn',
        'ddddn......ddddn',
    ), {'s': 'haba_semilla', 'h': 'haba_hoja_light', 'd': 'hoja_seca', 'n': 'black'})


def haba_brote(c):
    c.suelo()
    c.r(7, 3, 8, 12, 'haba_hoja_dark')
    c.r(4, 8, 6, 9, 'haba_hoja'); c.p(4, 8, 'haba_hoja_light'); c.r(9, 8, 11, 9, 'haba_hoja'); c.p(11, 8, 'haba_hoja_light')
    c.r(5, 4, 6, 5, 'haba_hoja_light'); c.r(9, 4, 10, 5, 'haba_hoja_light')
    c.r(7, 1, 8, 2, 'haba_hoja_light'); c.r(5, 11, 6, 11, 'haba_hoja'); c.r(9, 11, 10, 11, 'haba_hoja')


def haba_crecimiento(c):
    c.suelo()
    c.r(7, 1, 8, 12, 'haba_hoja_dark')
    for y, izq in ((1, True), (4, False), (7, True), (10, False)):
        x = 3 if izq else 9
        c.r(x, y, x + 3, y + 1, 'haba_hoja'); c.r(x, y, x + 1, y, 'haba_hoja_light'); c.p(x + 3 if izq else x, y + 2, 'haba_hoja')
    for y, izq in ((3, False), (6, True), (9, True)):
        flor_haba(c, 9 if not izq else 5, y)


def haba_madurez(c):
    c.suelo()
    mapa(c, 0, 1, (
        '...lhhhss.......',
        '...hhhhss.hhhl..',
        '.......sshhhh...',
        '.....l.ss.......',
        '....gg.ss..l....',
        '....gg.ss.gg....',
        '....gg.ss.gg....',
        '...hh..ss.gg.h..',
        '..d.d..ss..g.hh.',
        '.nn.nn.ss...d...',
        '.nn.nn.ss..nn...',
        '.n..n..ss.nnn...',
    ), {'s': 'haba_hoja_dark', 'h': 'haba_hoja', 'l': 'haba_hoja_light', 'g': 'haba_vaina', 'n': 'haba_vaina_negra',
        'd': 'podrido_dark'})


def haba_podrida(c):
    c.suelo(seco=True)
    mapa(c, 0, 5, (
        '...l............',
        '..sl............',
        '..ss............',
        '..sssss.........',
        '..ss..sss...h...',
        '..ss.m..sss.hh..',
        '..ssnnn...sss...',
        '.ossnnnm...nnnm.',
    ), {'s': 'hoja_seca_dark', 'l': 'hoja_seca_light', 'h': 'hoja_seca', 'n': 'haba_vaina_negra', 'm': 'moho_light',
        'o': 'moho_dark'})


# ---------------- chicharo ----------------
def chicharo_siembra(c):
    c.suelo('suelo_humedo')
    for x in (1, 4, 7, 10, 13):
        c.r(x, 12, x + 1, 13, 'chicharo_semilla'); c.p(x, 12, 'chicharo_hoja_light')
    for x in (2, 8):
        c.r(x, 10, x + 1, 11, 'chicharo_semilla'); c.p(x + 1, 11, 'chicharo_hoja')
    c.r(11, 4, 11, 12, 'wood')


def chicharo_brote(c):
    c.suelo()
    c.r(11, 2, 11, 12, 'wood'); c.p(11, 1, 'wood_dark')
    c.r(6, 6, 6, 12, 'chicharo_hoja_dark')
    c.r(4, 10, 5, 11, 'chicharo_hoja'); c.r(7, 10, 8, 11, 'chicharo_hoja')
    c.r(3, 7, 5, 8, 'chicharo_hoja_light'); c.r(7, 7, 9, 7, 'chicharo_hoja_light')
    diagonal(c, 7, 5, 1, -1, 3, 'chicharo_hoja_light'); c.p(10, 3, 'chicharo_hoja_light'); c.p(12, 4, 'chicharo_hoja_light')


def chicharo_crecimiento(c):
    c.suelo()
    c.r(12, 1, 12, 12, 'wood'); c.p(12, 0, 'wood_dark')
    c.r(5, 9, 5, 12, 'chicharo_hoja_dark'); diagonal(c, 6, 8, 1, -1, 5, 'chicharo_hoja_dark')
    for y in (3, 6, 9):
        c.p(11, y, 'chicharo_hoja_light'); c.p(13, y + 1, 'chicharo_hoja_light')
    c.r(2, 9, 4, 11, 'chicharo_hoja'); c.p(2, 9, 'chicharo_hoja_light'); c.r(6, 10, 7, 11, 'chicharo_hoja')
    c.r(4, 5, 6, 7, 'chicharo_hoja_light'); c.r(8, 3, 9, 6, 'chicharo_hoja'); c.p(7, 4, 'chicharo_hoja')
    c.r(9, 1, 10, 1, 'white'); c.p(10, 2, 'white')


def chicharo_madurez(c):
    c.suelo()
    c.r(12, 1, 12, 12, 'wood'); c.p(12, 0, 'wood_dark')
    c.r(10, 1, 10, 12, 'chicharo_hoja_dark')
    for y in (2, 5):
        c.p(11, y, 'chicharo_hoja_light'); c.p(13, y + 1, 'chicharo_hoja_light')
    c.r(8, 1, 9, 2, 'chicharo_hoja'); c.r(13, 8, 14, 9, 'chicharo_hoja'); c.r(11, 10, 11, 11, 'chicharo_hoja')
    c.p(9, 0, 'white'); c.p(11, 8, 'white')
    c.r(8, 4, 8, 7, 'chicharo_vaina'); c.p(9, 4, 'chicharo_hoja_dark'); c.p(8, 4, 'chicharo_hoja_light')
    mapa(c, 0, 9, (
        '.lllllllll',
        'v12d12d12v',
        'v22d22d22v',
        '.vvvvvvvv.',
    ), {'v': 'chicharo_vaina', 'l': 'chicharo_hoja_light', '1': 'chicharo_hoja_light', '2': 'chicharo_semilla',
        'd': 'chicharo_hoja_dark'})


def chicharo_podrida(c):
    c.suelo(seco=True)
    c.r(12, 2, 12, 12, 'wood'); c.p(12, 1, 'wood_dark')
    diagonal(c, 11, 3, -1, 1, 3, 'hoja_seca_dark'); c.r(13, 3, 13, 5, 'hoja_seca_dark')
    c.r(2, 10, 10, 10, 'hoja_seca'); c.r(1, 11, 11, 12, 'hoja_seca_dark'); c.p(4, 9, 'hoja_seca_light'); c.p(8, 9, 'hoja_seca_light')
    c.r(4, 11, 8, 11, 'podrido'); c.r(5, 12, 7, 12, 'podrido_dark'); c.r(5, 10, 6, 10, 'moho_light'); c.p(8, 10, 'moho')


# ---------------- lenteja ----------------
def lenteja_siembra(c):
    c.suelo('suelo_humedo')
    for x, y in ((0, 11), (4, 11), (8, 11), (12, 11), (2, 9), (10, 9), (6, 9), (13, 9)):
        c.p(x + 1, y, 'hoja_seca_light'); c.r(x, y + 1, x + 2, y + 1, 'lenteja_semilla')
    for x, y in ((2, 13), (6, 14), (10, 13), (13, 14)):
        c.r(x, y, x + 1, y, 'lenteja_semilla')


def lenteja_brote(c):
    c.suelo()
    mapa(c, 0, 3, (
        '.......l........',
        '......lsl.......',
        '..l....s....l...',
        '.lsl..lsl..lsl..',
        '..s....s....s...',
        '.lsl..lsl..lsl..',
        '...s...s...s....',
        '....s..s..s.....',
        '.....s.s.s......',
        '......sss.......',
    ), {'s': 'lenteja_hoja', 'l': 'lenteja_hoja_light'})


def lenteja_crecimiento(c):
    c.suelo()
    for xt, yt, flor in ((1, 6, 'white'), (4, 3, 'flor_lila'), (7, 1, 'flor_lila'), (11, 3, 'white'), (14, 6, 'flor_lila')):
        x0 = 7 if xt <= 7 else 8
        n = max(abs(xt - x0), 12 - yt)
        for i in range(n + 1):
            x, y = round(x0 + (xt - x0) * i / n), round(12 + (yt - 12) * i / n)
            c.p(x, y, 'lenteja_hoja')
            if y % 2 == 0 and y < 11:
                for lado in (x - 1, x + 1):
                    if 0 <= lado < 16 and (lado, y) not in c.px:
                        c.p(lado, y, 'lenteja_hoja_light')
        c.p(xt, yt - 1, flor)


def lenteja_madurez(c):
    c.suelo()
    mapa(c, 0, 4, (
        '.....vn.vn......',
        '...vn.llll.vn...',
        '..llhhhlhhhll...',
        '.vnhhdhhhdhhvn..',
        '..lhhdvnhdhhh...',
        '.vnhhdhhhdvnvn..',
        '...hhdhvndhh....',
        '.....d.dd.d.....',
        '......ddd.......',
    ), {'d': 'hoja_seca_dark', 'h': 'hoja_seca', 'l': 'hoja_seca_light', 'v': 'lenteja_vaina', 'n': 'lenteja_semilla'})


def lenteja_podrida(c):
    c.suelo(seco=True)
    c.r(1, 11, 14, 12, 'hoja_seca'); c.r(2, 10, 12, 10, 'hoja_marchita')
    for x in (2, 6, 10, 13):
        c.p(x, 11, 'hoja_seca_dark'); c.p(x + 1, 12, 'hoja_seca_light')
    c.r(4, 9, 6, 10, 'moho'); c.p(5, 8, 'moho_light'); c.r(9, 11, 11, 12, 'podrido'); c.p(10, 10, 'moho_light')
    diagonal(c, 7, 9, 1, -1, 3, 'hoja_seca_dark'); diagonal(c, 12, 9, 1, -1, 2, 'hoja_seca_dark')
    c.r(1, 12, 3, 12, 'moho_dark')


DIBUJOS = {f'{cultivo}_{etapa}': globals()[f'{cultivo}_{etapa}'] for cultivo in NOMBRES for etapa in ETAPAS}

VISOR = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Iconos 2D de cultivos</title>
<style>
body{font:14px system-ui,sans-serif;margin:16px;background:#1f262d;color:#e8eaed}
h1{font-size:18px}
table{border-collapse:collapse}
td,th{padding:8px 12px;text-align:center;border:1px solid #39424b}
img{image-rendering:pixelated;vertical-align:middle;background:#8a9bb0}
.c{background:#ececec}
</style></head><body>
<h1>Iconos 2D de cultivos (32 y 64 px)</h1>
<p>Fuente: modelos/iconos2d/iconos2d.py. Fondo gris azulado para ver la transparencia; la columna clara muestra a 32 px sobre blanco.</p>
<table><tr><th>Cultivo</th>__ENCABEZADOS__</tr>
__FILAS__
</table></body></html>
"""


def visor():
    enc = ''.join(f'<th>{e}</th>' for e in ETAPAS)
    filas = ''
    for cultivo, nombre in NOMBRES.items():
        celdas = ''
        for etapa in ETAPAS:
            k = f'{cultivo}_{etapa}'
            celdas += (f'<td><img src="{k}.svg" width="64" height="64" alt="{nombre} {ETIQUETAS[etapa]}"><br>'
                       f'<img class="c" src="{k}.svg" width="32" height="32" alt=""></td>')
        filas += f'<tr><th>{nombre}</th>{celdas}</tr>\n'
    return VISOR.replace('__ENCABEZADOS__', enc).replace('__FILAS__', filas)


if __name__ == '__main__':
    for clave, dibujo in DIBUJOS.items():
        c = Lienzo()
        dibujo(c)
        cultivo, etapa = clave.rsplit('_', 1)  # el cultivo puede llevar '_' (maiz_dulce)
        ruta = os.path.join(AQUI, clave + '.svg')
        with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
            f.write(svg(c, f'{NOMBRES[cultivo]} {ETIQUETAS[etapa]}'))
        print(f'{clave}: {len(c.px)} pixeles, {len({v for v in c.px.values()})} colores')
    with open(os.path.join(AQUI, 'visor_iconos.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(visor())
