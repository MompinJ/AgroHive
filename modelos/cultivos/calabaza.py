"""Generador de la calabaza (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/calabaza.py

Calabaza de milpa (Cucurbita moschata), rastrera. Convenciones (docs/07): 1 celda = 16 unidades,
origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten
el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de
16x16. Es una planta BAJA (menos de ~14 de alto): lo que la distingue del maiz y del frijol son
las hojas grandes, anchas y planas. Las alturas son cualitativas, no medidas reales.

Rasgos que se respetan: hojas grandes lobuladas con manchas plateadas (rasgo varietal de
C. moschata), guia rastrera con zarcillos, flor grande amarilla-naranja y fruto redondeado
verde que madura a crema/naranja, siempre al frente (+Z) para que la hoja no lo tape.
"""
import math
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas'))
sys.path.insert(0, os.path.join(AQUI, '..'))
sys.path.insert(0, AQUI)

from voxelkit import Model  # noqa: E402
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402
from maiz import punta, monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)

HOJA = ('calabaza_hoja_dark', 'calabaza_hoja', 'calabaza_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def hoja_grande(m, nombre, base, yaw, largo, s, cols=HOJA, tilt_pec=50, tilt=-8, mancha='calabaza_mancha'):
    """Hoja palmada de calabaza: peciolo, lamina central en rombo, 2 lobulos y mancha plateada. 5 cubos."""
    p = m.stem(nombre + '_pec', base, largo, 0.5, cols[0], tilt=tilt_pec, yaw=yaw)
    c = mover(p, yaw, s * 0.42, -0.2)
    m.box(nombre + '_lamina', c, (s, 0.4, s), cols[1], tilt=tilt, yaw=yaw + 45)
    for k, lado in enumerate((90, -90)):
        lc = mover(mover(p, yaw, s * 0.15), yaw + lado, s * 0.5, -0.1)
        m.box(f'{nombre}_lobulo{k}', lc, (s * 0.62, 0.4, s * 0.62), (cols[2], cols[0])[k],
              tilt=tilt, yaw=yaw + 45 + (25 if lado > 0 else -25))
    if mancha:
        m.box(nombre + '_mancha', mover(c, yaw, 0.0, 0.3), (s * 0.34, 0.15, s * 0.34), mancha, yaw=yaw + 45)
    return p


def guia(m, nombre, base, tramos, grueso=0.6, cols=('maiz_tallo', 'maiz_tallo_dark')):
    """Guia rastrera por tramos horizontales (tilt 90). tramos = [(largo, yaw, tilt)]. Devuelve los puntos."""
    p = base
    pts = []
    for i, (largo, yaw, tilt) in enumerate(tramos):
        p = m.stem(f'{nombre}{i}', p, largo, grueso, cols[i % 2], tilt=tilt, yaw=yaw)
        pts.append(p)
    return pts


def zarcillo(m, nombre, base, yaw, col='maiz_tallo_light'):
    """Zarcillo: dos palitos finos que se enroscan. 2 cubos."""
    q = m.stem(nombre, base, 1.4, 0.2, col, tilt=40, yaw=yaw)
    m.stem(nombre + '_rizo', q, 0.9, 0.2, col, tilt=120, yaw=yaw + 120)


def flor(m, nombre, base, yaw):
    """Flor grande de calabaza: pedicelo, tubo naranja, corola amarilla abierta y centro claro. 4 cubos."""
    p = m.stem(nombre + '_ped', base, 1.6, 0.35, 'maiz_tallo', tilt=20, yaw=yaw)
    m.box(nombre + '_tubo', p, (1.0, 1.0, 1.0), 'orange', yaw=yaw)
    t = (p[0], p[1] + 1.0, p[2])
    m.box(nombre + '_corola', t, (2.2, 0.8, 2.2), 'yellow', yaw=yaw + 45)
    m.box(nombre + '_centro', (t[0], t[1] + 0.5, t[2]), (0.8, 0.4, 0.8), 'grano_light', yaw=yaw)


def fruto(m, nombre, c, s, cols=('calabaza_fruto', 'calabaza_crema', 'calabaza_fruto_dark'), yaw=0, h=0.72):
    """Calabaza redondeada: dos cuerpos girados 45 grados (octagono con gajos de dos tonos),
    hombro, tapa y pedunculo. 5 cubos."""
    alto = s * h
    m.box(nombre, c, (s * 0.84, alto, s * 0.84), cols[0], yaw=yaw)
    m.box(nombre + '_gajos', (c[0], c[1] + alto * 0.08, c[2]), (s * 0.84, alto * 0.8, s * 0.84), cols[1],
          yaw=yaw + 45)
    m.box(nombre + '_hombro', (c[0], c[1] + alto, c[2]), (s * 0.62, 0.5, s * 0.62), cols[0], yaw=yaw + 22)
    m.box(nombre + '_tapa', (c[0], c[1] + alto + 0.5, c[2]), (s * 0.3, 0.3, s * 0.3), cols[2], yaw=yaw)
    m.box(nombre + '_pedunculo', (c[0], c[1] + alto + 0.8, c[2]), (0.6, 0.9, 0.6), 'hoja_seca_dark',
          tilt=20, yaw=yaw + 30)


# ---------------- etapas ----------------
def siembra():
    """Monticulo recien sembrado: hoyo con tres pepitas crema y terrones. 8 cubos."""
    m = Model('calabaza_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.4, 0.3, 3.4), 'suelo_humedo')
    m.box('semilla1', (-1.1, 2.3, 0.4), (1.7, 0.4, 1.1), 'calabaza_crema', yaw=25)
    m.box('semilla2', (1.1, 2.3, -0.5), (1.6, 0.4, 1.0), 'totomoxtle_seco', yaw=-40)
    m.box('semilla3', (0.3, 2.3, 0.9), (1.5, 0.4, 1.0), 'hoja_seca_light', yaw=80)
    m.box('terron1', (3.6, 2, 1.4), (1.6, 1.0, 1.4), 'soil_dark', yaw=30)
    m.box('terron2', (-3.8, 2, -1.2), (1.3, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito grueso y 2 cotiledones ovalados grandes, con la primera hoja asomando. 8 cubos."""
    m = Model('calabaza_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.3, 2.6), 'suelo_humedo')
    m.box('tallito', BASE, (0.9, 2.4, 0.9), 'maiz_tallo_light')
    eje = 125
    for k, s in enumerate((1, -1)):
        yaw = eje + (0 if s > 0 else 180)
        c = mover((0, 4.2, 0), yaw, 1.5)
        m.box(f'cotiledon{k}', c, (1.9, 0.45, 3.0), ('calabaza_hoja_light', 'calabaza_hoja')[k], tilt=-10, yaw=yaw)
    m.box('hoja1', mover((0, 4.4, 0), eje + 90, 0.5), (1.4, 0.35, 1.4), 'calabaza_hoja_dark', tilt=-30, yaw=eje + 135)
    m.box('cascara', (1.8, 2, 1.0), (1.4, 0.35, 0.9), 'calabaza_crema', yaw=20)
    return m


def crecimiento():
    """Planta vegetativa: corona baja, 4 hojas grandes lobuladas y guia corta con zarcillo. 26 cubos."""
    m = Model('calabaza_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.4, 1.6, 1.4), 'maiz_tallo')
    top = (0, 3.4, 0)
    specs = [(160, 2.8, 4.0, 62), (250, 2.6, 3.8, 68), (70, 2.6, 3.8, 68), (340, 2.0, 3.4, 55)]
    for k, (yaw, L, s, t) in enumerate(specs):
        hoja_grande(m, f'hoja{k}', top, yaw, L, s, tilt_pec=t, mancha='calabaza_mancha' if k < 2 else None)
    # guia corta que sale al frente y empieza a rastrear
    pts = guia(m, 'guia', (0.4, 2.6, 0.4), [(3.2, 20, 80), (2.4, 50, 95)])
    zarcillo(m, 'zarcillo', pts[-1], 90)
    m.box('cotiledon_seco', mover(BASE, 300, 1.4), (1.6, 0.3, 1.0), 'hoja_marchita', yaw=300)
    return m


def madurez():
    """Planta adulta: 5 hojas grandes, guia rastrera, flor amarilla y 2 calabazas al frente. 51 cubos."""
    m = Model('calabaza_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.6, 1.8, 1.6), 'maiz_tallo_dark')
    top = (0, 3.6, 0)
    # hojas hacia atras y a los lados: el frente queda libre para el fruto y la flor
    specs = [(180, 3.4, 4.4, 40), (235, 3.6, 4.2, 55), (125, 3.6, 4.2, 55), (290, 3.0, 3.8, 62), (70, 3.0, 3.8, 62)]
    for k, (yaw, L, s, t) in enumerate(specs):
        hoja_grande(m, f'hoja{k}', top, yaw, L, s, tilt_pec=t, mancha='calabaza_mancha' if k < 3 else None)
    # guia rastrera que sale al frente derecho y regresa por el lado
    pts = guia(m, 'guia', (0.5, 2.4, 0.5), [(3.2, 25, 92), (3.0, 90, 104), (2.4, 160, 92)])
    zarcillo(m, 'zarcillo0', pts[0], 0)
    zarcillo(m, 'zarcillo1', pts[2], 200)
    hoja_grande(m, 'hoja_guia', pts[1], 150, 1.2, 2.8, tilt_pec=40, mancha=None)
    # flor en la guia
    flor(m, 'flor', pts[0], 330)
    # frutos: uno grande verde con gajos crema, otro ya madurando a crema-naranja
    fruto(m, 'calabaza1', (-2.4, 1.0, 2.6), 5.0, yaw=12, h=0.6)
    fruto(m, 'calabaza2', (5.0, 1.0, 3.4), 3.4, cols=('calabaza_naranja', 'calabaza_crema', 'grano_dark'), yaw=-20)
    return m


def podrida():
    """Desenlace de estres: hojas cafes aplastadas, guia seca y calabaza ennegrecida con moho. 41 cubos."""
    m = Model('calabaza_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.6), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('corona', BASE, (1.6, 1.2, 1.6), 'podrido')
    m.box('moho_corona', (0, 3.2, 0), (1.2, 0.4, 1.2), 'moho_dark')
    top = (0, 2.8, 0)
    # hojas aplastadas: peciolos doblados y laminas caidas a ras del lomo
    specs = [(180, 2.4, 4.2, 100, 12, SECA), (240, 2.6, 4.0, 105, 18, ('hoja_seca_dark', 'podrido', 'hoja_seca')),
             (120, 2.6, 4.0, 98, 10, ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca_light')),
             (300, 2.2, 3.6, 110, 22, ('podrido_dark', 'hoja_seca_dark', 'podrido'))]
    for k, (yaw, L, s, t, tl, cols) in enumerate(specs):
        hoja_grande(m, f'hoja{k}', top, yaw, L, s, cols=cols, tilt_pec=t, tilt=tl,
                    mancha='moho' if k == 1 else None)
    # guia seca y quebrada
    pts = guia(m, 'guia', (0.5, 2.0, 0.5), [(3.4, 40, 90), (2.4, 85, 92)], grueso=0.5,
               cols=('hoja_seca_dark', 'hoja_seca'))
    m.box('guia_quiebre', pts[0], (0.8, 0.6, 0.8), 'podrido_dark')
    m.box('zarcillo_seco', pts[1], (0.25, 1.0, 0.25), 'hoja_seca_dark', tilt=60, yaw=20)
    # calabaza hundida y ennegrecida, con moho y una lesion abierta
    c = (-2.6, 1.0, 2.6)
    m.box('calabaza', c, (4.2, 2.8, 4.2), 'podrido', yaw=12)
    m.box('calabaza_gajos', c, (4.2, 2.4, 4.2), 'podrido_dark', yaw=57)
    m.box('calabaza_hundida', (c[0] + 0.6, c[1] + 2.8, c[2] - 0.4), (3.0, 0.5, 3.0), 'podrido_dark', yaw=12)
    m.box('calabaza_mancha', (c[0] - 1.2, c[1] + 0.4, c[2] + 0.6), (2.6, 2.2, 3.6), 'podrido_dark', yaw=12)
    m.box('calabaza_moho1', (c[0] - 0.4, c[1] + 2.8, c[2] + 0.8), (2.2, 0.6, 1.8), 'moho_light', yaw=30)
    m.box('calabaza_moho2', (c[0] + 1.5, c[1] + 1.2, c[2] + 1.6), (1.4, 1.4, 1.6), 'moho', yaw=12)
    m.box('calabaza_moho3', (c[0] - 2.1, c[1], c[2] - 0.6), (1.2, 1.0, 1.4), 'moho_dark', yaw=12)
    m.box('calabaza_pedunculo', (c[0] + 0.6, c[1] + 3.3, c[2] - 0.4), (0.6, 0.8, 0.6), 'hoja_seca_dark',
          tilt=60, yaw=200)
    # pepitas regadas
    m.box('pepita1', (1.6, 2, 3.4), (1.0, 0.3, 0.6), 'calabaza_crema', yaw=30)
    m.box('pepita2', (0.6, 1, 4.6), (1.0, 0.3, 0.6), 'hoja_seca_light', yaw=-20)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.4, 6.6, 3.0, 20), (-4.0, 5.6, 1.2, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('calabaza_siembra', siembra), ('calabaza_brote', brote), ('calabaza_crecimiento', crecimiento),
          ('calabaza_madurez', madurez), ('calabaza_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
