"""Generador del sorgo de grano (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/sorgo.py

Sorgo de grano (Sorghum bicolor). Convenciones (docs/07): 1 celda = 16 unidades, origen en el
centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco
del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las alturas son
cualitativas, no medidas reales.

Rasgos que se respetan para no confundirlo con el maiz: un solo tallo recto mas delgado, hojas
largas y angostas alternas que se arquean con nervadura central clara, SIN mazorca, hoja bandera
chica al final y una panoja compacta ovalada de grano rojizo sobre un pedunculo delgado que en
madurez se inclina un poco. Colores reutilizados de la paleta, sin colores nuevos.
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
from maiz import punta, hoja, monticulo, guardar, tallo, raices  # noqa: E402  (utilidades de la milpa)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)
PLANO = 110           # plano de las hojas disticas, en diagonal a la camara (igual que el maiz)
INCLINA = PLANO + 20  # hacia donde se vence la panoja: de lado a la camara para que se lea la curva

GRANO = ('cabello', 'wood', 'cabello_light')       # panoja: base rojiza, sombra cafe, luz anaranjada
NERVIO = 'vaina_light'                             # nervadura central clara de la hoja


# ---------------- utilidades ----------------
def ejes(tilt, yaw):
    """Ejes locales x y z de una caja girada [tilt, yaw, 0] (perpendiculares a su eje largo)."""
    t, y = math.radians(tilt), math.radians(yaw)
    ex = (math.cos(y), 0.0, -math.sin(y))
    ez = (math.cos(t) * math.sin(y), -math.sin(t), math.cos(t) * math.cos(y))
    return ex, ez


def desplazar(p, ex, ez, a, b):
    """Punto p movido a unidades sobre ex y b sobre ez."""
    return tuple(p[i] + a * ex[i] + b * ez[i] for i in range(3))


def hoja_sorgo(m, nombre, base, yaw, largo, ancho=1.4, cols=('maiz_hoja', 'maiz_hoja_light'),
               t1=45, t2=125, nervio=False):
    """Hoja de sorgo: como la del maiz pero mas angosta y caida; con nervio opcional. 2 o 3 cubos."""
    fin = hoja(m, nombre, base, yaw, largo, ancho=ancho, cols=cols, t1=t1, t2=t2, grosor=0.4)
    if nervio:
        m.box(nombre + '_nervio', base, (0.3, largo * 0.55, 0.6), NERVIO, tilt=t1, yaw=yaw)
    return fin


def panoja(m, nombre, base, tilt, yaw, escala=1.0, cols=GRANO):
    """Panoja compacta ovalada: capas apiladas a lo largo del eje y granos que sobresalen. 9 cubos.

    Todas las cajas comparten tilt y yaw, asi la panoja entera se inclina como una pieza."""
    s = escala
    capas = [(0.0, 1.0, 2.0, cols[1]), (0.8, 2.0, 2.8, cols[0]), (2.6, 2.0, 3.2, cols[0]),
             (4.4, 1.6, 2.6, cols[0]), (5.8, 1.0, 1.6, cols[2])]
    for k, (u, h, w, c) in enumerate(capas):
        m.box(f'{nombre}{k}', punta(base, u * s, tilt, yaw), (w * s, h * s, w * s), c, tilt=tilt, yaw=yaw)
    ex, ez = ejes(tilt, yaw)
    granos = [(1.4, 1.5, 0.0, cols[1]), (2.4, 0.0, -1.7, cols[2]), (3.4, -1.6, 0.0, cols[2]),
              (4.0, 0.0, 1.5, cols[2])]
    for k, (u, a, b, c) in enumerate(granos):
        p = desplazar(punta(base, u * s, tilt, yaw), ex, ez, a * s, b * s)
        m.box(f'{nombre}_grano{k}', p, (1.0 * s, 1.0 * s, 1.0 * s), c, tilt=tilt, yaw=yaw)
    return punta(base, 6.8 * s, tilt, yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo con un surquito y semillas redondas chicas de grano rojizo apenas cubiertas. 10 cubos."""
    m = Model('sorgo_siembra', PAL)
    monticulo(m)
    m.box('surco', (0, 2, 0), (6.0, 0.3, 1.8), 'suelo_humedo', yaw=PLANO - 90)
    # el sorgo se siembra mas denso y con semilla mas chica que el maiz: hilera de granitos
    semillas = [(-2.2, 0.6, 'cabello', 15), (-0.9, 0.2, 'wood', -30), (0.3, 0.5, 'cabello_light', 40),
                (1.5, 0.1, 'cabello', -10), (2.6, 0.4, 'wood', 25)]
    du = (math.sin(math.radians(PLANO - 90)), math.cos(math.radians(PLANO - 90)))
    for k, (u, h, col, a) in enumerate(semillas):
        m.box(f'semilla{k}', (u * du[0], 2.1, u * du[1]), (0.8, 0.5 + h * 0.4, 0.8), col, yaw=a)
    m.box('tapado', (0.6 * du[0], 2.3, 0.6 * du[1]), (1.6, 0.4, 1.2), 'soil_dark', yaw=PLANO - 70)
    m.box('terron', (3.4, 2, 2.0), (1.4, 0.9, 1.2), 'soil_dark', yaw=30)
    return m


def brote():
    """Plantula: tallito delgado con tres hojitas angostas y el grano a un lado. 9 cubos."""
    m = Model('sorgo_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (2.6, 0.3, 2.0), 'suelo_humedo')
    m.box('tallito', BASE, (0.7, 2.6, 0.7), 'maiz_tallo_light')
    m.box('hojita1', (0, 2.6, 0), (1.0, 3.0, 0.3), 'maiz_hoja', tilt=62, yaw=PLANO)
    hoja(m, 'hojita2', (0, 3.4, 0), PLANO + 180, 4.4, ancho=1.0, cols=('maiz_hoja', 'maiz_hoja_light'),
         t1=35, t2=100, grosor=0.3)
    m.box('cogollo', (0, 4.2, 0), (0.5, 2.2, 0.4), 'maiz_hoja_light', tilt=12, yaw=PLANO)
    m.box('semilla', (1.4, 2, 0.8), (0.8, 0.6, 0.8), 'cabello', yaw=25)
    return m


def crecimiento():
    """Planta vegetativa: tallo delgado, 6 hojas angostas arqueadas y cogollo, sin panoja. 24 cubos."""
    m = Model('sorgo_crecimiento', PAL)
    monticulo(m)
    raices(m, 2, largo=2.4)
    nudos = tallo(m, [3.5, 3.5, 3.5, 3.0], 1.2, cols=('maiz_tallo', 'maiz_tallo'))
    alturas = [3.0, 5.5, 8.0, 10.5, 13.0, 15.0]
    largos = [7.0, 8.6, 9.4, 9.2, 8.0, 6.0]
    for k, (h, L) in enumerate(zip(alturas, largos)):
        yaw = PLANO + (k % 2) * 180 + (k - 2) * 8
        cols = ('maiz_hoja_dark', 'maiz_hoja') if k < 2 else ('maiz_hoja', 'maiz_hoja_light')
        hoja_sorgo(m, f'hoja{k}', (0, h, 0), yaw, L, cols=cols, t1=42 - k * 2, t2=125, nervio=k in (2, 3))
    top = nudos[-1]
    m.box('cogollo', (0, top, 0), (0.9, 2.8, 0.9), 'maiz_hoja_light')
    m.box('cogollo_hoja', (0, top + 0.5, 0), (0.8, 3.0, 0.3), 'maiz_hoja', tilt=16, yaw=PLANO + 90)
    return m


def madurez():
    """Planta adulta: tallo alto y delgado, 7 hojas, hoja bandera, pedunculo y panoja cargada. 45 cubos."""
    m = Model('sorgo_madurez', PAL)
    monticulo(m)
    raices(m, 3, largo=3.0)
    nudos = tallo(m, [4, 4, 4, 4, 4, 4], 1.4, cols=('maiz_tallo', 'maiz_tallo'))
    for k, h in enumerate(nudos[:-1]):
        m.box(f'nudo{k}', (0, h - 0.3, 0), (1.7, 0.6, 1.7), 'maiz_tallo_dark')
    alturas = [4.0, 7.5, 11.0, 14.5, 18.0, 21.5]
    largos = [8.0, 9.6, 10.0, 9.8, 9.0, 7.6]
    for k, (h, L) in enumerate(zip(alturas, largos)):
        yaw = PLANO + (k % 2) * 180 + (k - 3) * 7
        if k == 0:
            cols = ('hoja_marchita', 'hoja_seca')      # hoja basal ya senescente
        elif k < 3:
            cols = ('maiz_hoja_dark', 'maiz_hoja')
        else:
            cols = ('maiz_hoja', 'maiz_hoja_light')
        hoja_sorgo(m, f'hoja{k}', (0, h, 0), yaw, L, cols=cols, t1=44 - k * 2, t2=125, nervio=k in (2, 3, 4))
    top = (0, nudos[-1], 0)
    # hoja bandera: la ultima, chica y mas parada, envolviendo la base del pedunculo
    hoja_sorgo(m, 'bandera', (0, top[1] - 0.8, 0), PLANO + 180 + 15, 4.6, ancho=1.2,
               cols=('maiz_hoja', 'maiz_hoja_light'), t1=28, t2=80)
    m.box('vaina_bandera', top, (1.5, 1.6, 1.5), 'maiz_tallo')
    # pedunculo delgado que se vence con el peso del grano
    p = m.stem('pedunculo', top, 3.4, 0.7, 'maiz_tallo_light', tilt=4, yaw=INCLINA)
    p = m.stem('pedunculo_curva', p, 1.4, 0.6, 'totomoxtle_seco', tilt=16, yaw=INCLINA)
    panoja(m, 'panoja', p, 22, INCLINA)
    return m


def podrida():
    """Desenlace de estres: tallo acamado y quebrado, hojas secas, panoja negra con moho, moscas. 40 cubos."""
    m = Model('sorgo_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.2), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    raices(m, 2, col='podrido', largo=2.6)
    # tallo: base inclinada, quiebre y parte superior colgando (acame)
    lado = PLANO - 20
    m.box('tallo0', BASE, (1.4, 6, 1.4), 'hoja_seca_dark', tilt=7, yaw=lado)
    m.box('moho_base', BASE, (1.8, 1.4, 1.8), 'moho_dark', tilt=7, yaw=lado)
    p1 = punta(BASE, 6, 7, lado)
    m.box('nudo0', p1, (1.7, 0.6, 1.7), 'podrido', tilt=7, yaw=lado)
    m.box('tallo1', p1, (1.3, 6.5, 1.3), 'hoja_seca', tilt=14, yaw=lado)
    p2 = punta(p1, 6.5, 14, lado)
    m.box('quiebre', p2, (1.7, 0.8, 1.7), 'podrido_dark', tilt=14, yaw=lado)
    m.box('tallo2', p2, (1.1, 3.2, 1.1), 'hoja_seca_dark', tilt=125, yaw=lado)
    p3 = punta(p2, 3.2, 125, lado)
    # pedunculo doblado y panoja colgando cabeza abajo, ennegrecida y con moho
    p4 = m.stem('pedunculo', p3, 1.6, 0.6, 'hoja_seca_dark', tilt=155, yaw=lado)
    panoja(m, 'panoja', p4, 170, lado, escala=0.8, cols=('podrido', 'podrido_dark', 'moho'))
    # hojas secas colgando, asimetricas
    specs = [((0, 3.5, 0), PLANO + 200, 6.0, ('hoja_seca_dark', 'podrido'), 75, 140),
             ((0, 6.0, 0), PLANO + 30, 6.4, ('hoja_seca', 'hoja_seca_dark'), 70, 145),
             (punta(p1, 2.5, 14, lado), PLANO + 190, 6.0, ('hoja_marchita', 'hoja_seca'), 60, 135),
             (punta(p1, 5.0, 14, lado), PLANO + 20, 5.0, ('hoja_seca', 'hoja_seca_light'), 80, 150)]
    for k, (b, yaw, L, cols, t1, t2) in enumerate(specs):
        hoja(m, f'hoja{k}', b, yaw, L, ancho=1.3, cols=cols, t1=t1, t2=t2, grosor=0.4)
    # hojas caidas sobre el lomo y el suelo
    m.box('hoja_suelo1', (3.0, 2, -1.2), (1.2, 0.3, 5.0), 'hoja_seca', yaw=-60)
    m.box('hoja_suelo2', (-5.0, 1, 3.6), (1.1, 0.3, 4.2), 'hoja_seca_dark', yaw=70)
    m.box('hoja_suelo3', (5.2, 1, 3.8), (1.0, 0.3, 3.0), 'hoja_seca_light', yaw=-30)
    # grano desgranado en el lomo, ya podrido o enmohecido
    for k, (x, z, col, a) in enumerate([(-2.0, 2.2, 'podrido_dark', 20), (-0.6, 2.9, 'moho_light', -35),
                                        (-3.0, 1.0, 'cabello', 50)]):
        m.box(f'grano_suelo{k}', (x, 2, z), (0.8, 0.5, 0.8), col, yaw=a)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.2, 7.2, 2.8, 20), (-3.6, 5.6, 0.6, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('sorgo_siembra', siembra), ('sorgo_brote', brote), ('sorgo_crecimiento', crecimiento),
          ('sorgo_madurez', madurez), ('sorgo_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
