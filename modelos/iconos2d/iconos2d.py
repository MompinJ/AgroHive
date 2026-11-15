"""Iconos 2D de cultivos (AgroHive): un sprite plano por cultivo y etapa, para el modo 2D (A3.6).

Correr desde la raiz del repo:
    python modelos/iconos2d/iconos2d.py

Genera 20 SVG (maiz, frijol, calabaza, chile x siembra, brote, crecimiento, madurez, podrida) y visor_iconos.html.
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
NOMBRES = {'maiz': 'Maíz', 'frijol': 'Frijol', 'calabaza': 'Calabaza', 'chile': 'Chile'}
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
        cultivo, etapa = clave.split('_', 1)
        ruta = os.path.join(AQUI, clave + '.svg')
        with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
            f.write(svg(c, f'{NOMBRES[cultivo]} {ETIQUETAS[etapa]}'))
        print(f'{clave}: {len(c.px)} pixeles, {len({v for v in c.px.values()})} colores')
    with open(os.path.join(AQUI, 'visor_iconos.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(visor())
