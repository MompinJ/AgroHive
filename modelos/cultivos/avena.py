"""Generador de la avena (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/avena.py

Avena (Avena sativa). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la
base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz
(14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas son cualitativas, no
medidas reales (solo se respeta que sea bastante mas baja que el maiz y el sorgo).

Rasgos que se respetan para no confundirla con el maiz, el sorgo, la cebada y el trigo:
- MACOLLO: varios tallos finos (4-6) que salen juntos de la base, no un tallo unico.
- Hojas planas y angostas, pero mas anchas que las de trigo y cebada (verde azulado de cereal).
- SIN espiga: la avena lleva una PANICULA ABIERTA y suelta, piramidal, con ramitas finas que salen
  en pisos del raquis y de cuyas puntas CUELGAN espiguillas sueltas (como campanitas).
- En madurez todo se vuelve paja clara (tallos, ramitas y espiguillas) y las hojas se secan.
- Siembra con granos alargados y claros (grano vestido); plantula como pasto, de hojitas finas.
Colores de la paleta fija, sin colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- Panicula abierta, piramidal, de ramas muy separadas; espiguillas solitarias y colgantes en
  pedicelos delgados, de 2 flores con glumas grandes; hoja plana sin auriculas:
  https://www.minnesotawildflowers.info/grass-sedge-rush/cultivated-oats ,
  https://www.kew.org/data/grasses-db/www/imp01113 ,
  https://ausgrass2.myspecies.info/content/avena-sativa y
  https://floraseries.landcareresearch.co.nz/taxa/fc044439-66f0-426a-a484-f98ba61af5fd
- Macollamiento y porte general: conocimiento agronomico comun de cereales de grano chico, no medido.
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
from maiz import punta, hoja, monticulo, guardar as guardar_maiz, esquinas  # noqa: E402

BASE = (0, 2, 0)      # anclaje del macollo: encima del monticulo (igual que el maiz)

VERDE = ('cereal_hoja_dark', 'cereal_hoja', 'cereal_hoja_light')
PAJA = ('avena_espiga_dark', 'avena_espiga')            # raquis/ramitas, espiguillas maduras
PODRIDA = ('podrido_dark', 'podrido', 'moho', 'moho_light')


# ---------------- utilidades ----------------
def guardar(m, nombre):
    """Guarda con el chequeo de huella del maiz y avisa si la caja no queda centrada."""
    ruta = guardar_maiz(m, nombre)
    lo, hi = esquinas(m)
    cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2
    if abs(cx) >= 1.6 or abs(cz) >= 1.6:
        print(f'  AVISO: {nombre} descentrado (centro x {cx:.2f}, z {cz:.2f})')
    return ruta


def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def hoja_avena(m, nombre, base, yaw, largo, ancho=1.1, cols=VERDE[1:], t1=40, t2=110):
    """Hoja plana de avena: dos laminas, sube y luego se arquea hacia afuera. 2 cubos."""
    return hoja(m, nombre, base, yaw, largo, ancho=ancho, cols=cols, t1=t1, t2=t2, grosor=0.3)


def macollo(m, tallos, cols, grueso=0.6):
    """Tallos finos que salen juntos de la base. tallos = [(largo, tilt, yaw)]. Devuelve las puntas."""
    puntas = []
    for k, (largo, tilt, yaw) in enumerate(tallos):
        puntas.append(m.stem(f'tallo{k}', BASE, largo, grueso, cols[k % len(cols)], tilt=tilt, yaw=yaw))
    return puntas


def espiguilla(m, nombre, p, yaw, col, largo=1.5, tilt=168):
    """Espiguilla colgante (campanita): cuelga de la punta p, apenas abierta hacia yaw. 1 cubo."""
    m.box(nombre, p, (0.85, largo, 0.6), col, tilt=tilt, yaw=yaw)


def panicula(m, nombre, base, tilt, yaw, largo, pisos, cols=PAJA, esp=1.5, colgar=168, grueso=0.3):
    """Panicula abierta de avena: raquis fino, ramitas en pisos y espiguillas que cuelgan.

    pisos = [(u, [(dyaw, largo_rama, tilt_rama)])], u = fraccion del raquis donde sale el piso.
    Las ramitas van en coordenadas de mundo (salen hacia afuera y arriba) y las espiguillas
    siempre cuelgan hacia abajo por gravedad. Cubos: 1 + 2 por ramita + 1 en la punta."""
    m.box(nombre + '_raquis', base, (grueso, largo, grueso), cols[0], tilt=tilt, yaw=yaw)
    for k, (u, ramas) in enumerate(pisos):
        p = punta(base, u * largo, tilt, yaw)
        for j, (dyaw, lr, tr) in enumerate(ramas):
            d = yaw + dyaw
            tip = m.stem(f'{nombre}_rama{k}{j}', p, lr, grueso * 0.8, cols[0], tilt=tr, yaw=d)
            espiguilla(m, f'{nombre}_esp{k}{j}', tip, d, cols[1 + (j + k) % (len(cols) - 1)], esp, colgar)
    top = punta(base, largo, tilt, yaw)
    espiguilla(m, nombre + '_esp_top', top, yaw, cols[1], esp * 0.9, 150)
    return top


def grano(m, nombre, c, yaw, col, s=1.0):
    """Grano de avena vestido: alargado y delgado. 1 cubo."""
    m.box(nombre, c, (0.6 * s, 0.5 * s, 1.7 * s), col, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con un surquito y 5 granos alargados claros apenas tapados. 9 cubos."""
    m = Model('avena_siembra', PAL)
    monticulo(m)
    m.box('surco', (0, 2, 0), (7.0, 0.3, 2.4), 'suelo_humedo', yaw=20)
    # la avena se siembra densa, al chorrillo: granos sueltos a lo largo del surco
    granos = [(-2.6, -0.3, 'avena_espiga', 35), (-1.2, 0.4, 'hoja_seca_light', -20),
              (0.2, -0.2, 'avena_espiga', 70), (1.5, 0.5, 'avena_espiga_dark', 5),
              (2.7, -0.1, 'avena_espiga', -45)]
    dx, dz = math.cos(math.radians(20)), -math.sin(math.radians(20))   # eje largo del surco
    for k, (u, v, col, a) in enumerate(granos):
        grano(m, f'grano{k}', (u * dx + v * dz, 2.1, u * dz - v * dx), a, col)
    m.box('terron', (-3.6, 2, 2.0), (1.4, 0.9, 1.2), 'soil_dark', yaw=30)
    return m


def brote():
    """Plantula como pasto: 4 hojitas finas que salen del mismo punto, una ya arqueada. 9 cubos."""
    m = Model('avena_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (2.8, 0.3, 2.2), 'suelo_humedo', yaw=20)
    m.box('base', BASE, (0.8, 0.9, 0.8), 'cereal_hoja_dark')
    hojitas = [(4.8, 6, 40, 'cereal_hoja'), (4.0, 22, 160, 'cereal_hoja_light'),
               (3.4, 30, 260, 'cereal_hoja')]
    for k, (L, t, y, col) in enumerate(hojitas):
        m.box(f'hojita{k}', (0, 2.4, 0), (0.55, L, 0.2), col, tilt=t, yaw=y)
    hoja(m, 'hojita_larga', (0, 2.6, 0), 320, 5.0, ancho=0.6, cols=('cereal_hoja', 'cereal_hoja_light'),
         t1=28, t2=95, grosor=0.2)
    m.box('cascara', (1.6, 2, 0.9), (0.6, 0.45, 1.6), 'avena_espiga', yaw=30)
    return m


def crecimiento():
    """Macollo verde de 5 tallos con hojas planas y 2 paniculas verdes recien salidas. 30 cubos."""
    m = Model('avena_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.8, 1.2, 1.8), 'cereal_hoja_dark', yaw=15)
    tallos = [(12.0, 6, 40), (10.5, 12, 150), (9.0, 14, 260), (8.0, 16, 330), (11.0, 9, 210)]
    puntas = macollo(m, tallos, ('cereal_hoja', 'cereal_hoja_dark'), grueso=0.6)
    # hojas planas, anchas para un cereal, que salen bajas y se arquean hacia afuera
    hojas = [((0, 3.4, 0), 80, 7.5, VERDE[:2], 45), ((0, 4.2, 0), 200, 7.0, VERDE[:2], 40),
             ((0, 5.5, 0), 300, 6.8, VERDE[1:], 38), (punta(BASE, 5.5, 6, 40), 10, 6.0, VERDE[1:], 34),
             (punta(BASE, 5.0, 12, 150), 130, 5.5, VERDE[1:], 36)]
    for k, (b, yaw, L, cols, t1) in enumerate(hojas):
        hoja_avena(m, f'hoja{k}', b, yaw, L, ancho=1.3, cols=cols, t1=t1, t2=108)
    # dos paniculas recien salidas de la vaina: chicas, verdes y ya abiertas
    vc = ('cereal_hoja', 'cereal_hoja_light')
    panicula(m, 'panA', puntas[0], 4, 40, 4.0, [(0.45, [(80, 2.2, 55), (-100, 2.0, 60)])],
             cols=vc, esp=1.2)
    panicula(m, 'panB', puntas[4], 8, 210, 3.0, [(0.5, [(90, 1.6, 55)])], cols=vc, esp=1.1)
    return m


def madurez():
    """Macollo paja clara de 5 tallos, 4 paniculas abiertas de espiguillas colgantes, hojas secas. 58 cubos."""
    m = Model('avena_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.8, 1.0, 1.8), 'hoja_seca_dark', yaw=15)
    tallos = [(15.5, 3, 40), (13.5, 14, 150), (12.0, 18, 280), (10.0, 18, 350), (14.5, 12, 220)]
    puntas = macollo(m, tallos, ('hoja_seca_light', 'espiga'), grueso=0.55)
    # hojas secas: las bajas oscuras y colgando, las altas paja
    hojas = [((0, 3.2, 0), 90, 7.0, ('hoja_seca_dark', 'hoja_seca'), 60, 130),
             ((0, 4.0, 0), 300, 6.5, ('hoja_seca', 'hoja_marchita'), 55, 125),
             (punta(BASE, 6.0, 4, 40), 0, 5.5, ('hoja_seca', 'hoja_seca_light'), 45, 115),
             (punta(BASE, 5.5, 8, 215), 185, 5.0, ('hoja_seca_light', 'hoja_seca'), 45, 115)]
    for k, (b, yaw, L, cols, t1, t2) in enumerate(hojas):
        hoja_avena(m, f'hoja{k}', b, yaw, L, ancho=1.1, cols=cols, t1=t1, t2=t2)
    # paniculas: piramides abiertas, la principal con dos pisos de ramitas
    panicula(m, 'panA', puntas[0], 6, 40, 7.0,
             [(0.2, [(0, 3.2, 62), (120, 3.0, 64), (240, 3.0, 60)]),
              (0.58, [(60, 2.2, 58), (190, 2.0, 60)])])
    panicula(m, 'panB', puntas[4], 20, 220, 5.5,
             [(0.25, [(40, 2.6, 62), (170, 2.4, 60)]), (0.65, [(280, 1.7, 55)])])
    panicula(m, 'panC', puntas[1], 24, 150, 5.0,
             [(0.3, [(60, 2.4, 62), (210, 2.2, 60)]), (0.7, [(320, 1.5, 55)])])
    panicula(m, 'panD', puntas[2], 26, 280, 4.0, [(0.35, [(30, 2.0, 60), (200, 1.8, 62)])])
    return m


def podrida():
    """Desenlace de estres: macollo acamado y oscuro, paniculas podridas con moho, 2 moscas. 56 cubos."""
    m = Model('avena_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.6, 2, -1.4), (4.2, 0.2, 0.5), 'suelo_grieta', yaw=20)
    m.box('grieta2', (-2.6, 2, 1.2), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('corona', BASE, (2.0, 1.2, 2.0), 'moho_dark', yaw=15)
    # tallos acamados: se doblan en la base y se vencen hacia +x en abanico, quebrados a media altura
    acame = [(3.5, 22, 65, 4.0, 78), (3.0, 30, 100, 4.2, 84), (4.0, 18, 128, 3.4, 80),
             (2.8, 35, 35, 3.0, 88)]
    cols = ('hoja_seca_dark', 'podrido', 'hoja_seca')
    finales = []
    for k, (l1, t1, yaw, l2, t2) in enumerate(acame):
        p = m.stem(f'tallo{k}', BASE, l1, 0.6, cols[k % 3], tilt=t1, yaw=yaw)
        m.box(f'quiebre{k}', p, (0.8, 0.6, 0.8), 'podrido_dark', tilt=t1, yaw=yaw)
        p = m.stem(f'tallo{k}_b', p, l2, 0.5, cols[(k + 1) % 3], tilt=t2, yaw=yaw)
        finales.append((p, yaw))
    # un tallo que sigue medio parado pero roto y sin panicula, con moho en la punta
    p = m.stem('tallo_roto', BASE, 5.0, 0.55, 'hoja_seca_dark', tilt=12, yaw=250)
    m.box('tallo_roto_moho', punta(BASE, 4.2, 12, 250), (0.75, 0.9, 0.75), 'moho', tilt=12, yaw=250)
    # paniculas podridas: cuelgan de las puntas acamadas, casi tocando el suelo
    (pa, ya), (pb, yb), (pc, yc), (pd, yd) = finales
    panicula(m, 'panA', pa, 150, ya, 2.6, [(0.35, [(80, 1.5, 115), (-80, 1.4, 115)])],
             cols=PODRIDA[:3], esp=1.3, colgar=176)
    panicula(m, 'panB', pb, 155, yb, 2.4, [(0.45, [(90, 1.4, 118), (-90, 1.2, 118)])],
             cols=('podrido_dark', 'moho', 'moho_light'), esp=1.2, colgar=178)
    panicula(m, 'panC', pc, 160, yc, 2.0, [(0.5, [(-90, 1.2, 120)])],
             cols=('podrido_dark', 'podrido', 'moho'), esp=1.1, colgar=178)
    m.box('panD_moho', pd, (1.0, 0.8, 0.9), 'moho_dark', yaw=yd)
    # hojas secas colgando y caidas en el lomo
    hoja(m, 'hoja0', (0, 3.0, 0), 300, 5.5, ancho=1.1, cols=('hoja_seca_dark', 'podrido'),
         t1=75, t2=140, grosor=0.3)
    hoja(m, 'hoja1', (0, 3.6, 0), 200, 5.0, ancho=1.0, cols=('hoja_seca', 'hoja_seca_dark'),
         t1=70, t2=135, grosor=0.3)
    m.box('hoja_suelo1', (-4.2, 2, -1.6), (1.1, 0.25, 4.0), 'hoja_seca', yaw=-50)
    m.box('hoja_suelo2', (2.0, 2, 3.4), (1.0, 0.25, 3.6), 'hoja_seca_dark', yaw=75)
    m.box('hoja_suelo3', (-5.4, 1, 3.8), (1.0, 0.25, 2.8), 'hoja_seca_light', yaw=20)
    # espiguillas y granos desgranados en el lomo, podridos o enmohecidos
    for k, (x, z, col, a) in enumerate([(3.8, -2.4, 'podrido', 25), (-1.6, 2.6, 'moho_light', -40),
                                        (-3.0, 0.4, 'avena_espiga_dark', 60), (1.0, -3.4, 'podrido_dark', -10)]):
        grano(m, f'grano_suelo{k}', (x, 2, z), a, col, s=0.9)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(4.2, 7.0, 1.2, 20), (-1.8, 6.2, -2.0, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('avena_siembra', siembra), ('avena_brote', brote), ('avena_crecimiento', crecimiento),
          ('avena_madurez', madurez), ('avena_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
