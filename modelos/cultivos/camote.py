"""Generador del camote (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/camote.py

Camote o batata (Ipomoea batatas), rastrera. Convenciones (docs/07): 1 celda = 16 unidades, origen
en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo
de surco del maiz (14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Es una planta
BAJA y extendida (menos de ~8 de alto). Las alturas y tamanos son cualitativos, no medidas reales.

Rasgos que se respetan para no confundirlo con el frijol ni con la calabaza: guias moradas que
corren a ras del lomo, muchas hojas chicas acorazonadas (corazon con seno y punta) de verde
oscuro sobre peciolos morados, flor lila en campanita (embudo) con garganta morada, y raices
tuberosas alargadas y afiladas (fusiformes) de piel rosa morada y pulpa naranja. Se siembra por
esqueje (trozo de guia con hojitas), no por semilla. La raiz NO se entierra bajo y=0: se asoma
medio hundida en el lomo. Colores solo de la paleta fija (camote_*, marchitos, podrido, moho).
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

BASE = (0, 2, 0)      # anclaje de la corona: encima del monticulo (igual que el maiz)

GUIA = ('camote_morado', 'camote_piel_dark')
PIEL = ('camote_piel', 'camote_piel_dark')
PODRIDA = ('podrido', 'podrido_dark')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def local(p, v, u, extra=0.0, dy=0.0):
    """Centro previo a girar para una pieza que gira alrededor de p con yaw + extra: tras el giro
    queda a v unidades de lado y u al frente de p, en el marco de la hoja (o del camote)."""
    a = math.radians(-extra)
    return (p[0] + v * math.cos(a) + u * math.sin(a), p[1] + dy, p[2] - v * math.sin(a) + u * math.cos(a))


def hoja_corazon(m, nombre, p, yaw, s, col='camote_hoja', tilt=-8):
    """Hoja acorazonada de un solo tono: p es el seno (donde entra el peciolo) y la punta apunta a yaw.

    Dos lobulos un poco cerrados que dejan la muesca del seno y un rombo para la punta. 3 cubos.
    Todas las piezas giran alrededor de p, asi la hoja se inclina como una sola pieza."""
    g = 0.35
    for k, sg in enumerate((1, -1)):
        ex = 12 * sg
        m.box(f'{nombre}_lobulo{k}', local(p, sg * 0.28 * s, 0.24 * s, ex), (0.42 * s, g, 0.44 * s), col,
              tilt=tilt, yaw=yaw + ex, pivot=p)
    m.box(nombre + '_punta', local(p, 0.0, 0.56 * s, 45), (0.64 * s, g, 0.64 * s), col,
          tilt=tilt, yaw=yaw + 45, pivot=p)


def hoja_peciolo(m, nombre, base, yaw, largo, s, col='camote_hoja', tilt_pec=40, tilt=-8,
                 col_pec='camote_morado'):
    """Peciolo morado que sube desde la guia o la corona y su hoja acorazonada en la punta. 4 cubos."""
    p = m.stem(nombre + '_pec', base, largo, 0.35, col_pec, tilt=tilt_pec, yaw=yaw)
    hoja_corazon(m, nombre, p, yaw, s, col=col, tilt=tilt)
    return p


def guia(m, nombre, base, tramos, grueso=0.55, cols=GUIA):
    """Guia rastrera por tramos (tilt ~90 = a ras). tramos = [(largo, yaw, tilt)]. Devuelve los nudos."""
    p = base
    pts = []
    for i, (largo, yaw, tilt) in enumerate(tramos):
        p = m.stem(f'{nombre}{i}', p, largo, grueso, cols[i % 2], tilt=tilt, yaw=yaw)
        pts.append(p)
    return pts


def flor(m, nombre, base, yaw):
    """Flor en campanita (embudo, como la del manto de la virgen): pedicelo, tubo, boca abierta
    lila palido y garganta morada. 4 cubos."""
    p = m.stem(nombre + '_ped', base, 1.4, 0.3, 'camote_morado', tilt=18, yaw=yaw)
    m.box(nombre + '_tubo', p, (0.6, 1.0, 0.6), 'camote_flor', yaw=yaw)
    t = (p[0], p[1] + 1.0, p[2])
    m.box(nombre + '_boca', t, (1.6, 0.5, 1.6), 'camote_flor', yaw=yaw + 45)
    m.box(nombre + '_garganta', (t[0], t[1] + 0.3, t[2]), (0.6, 0.3, 0.6), 'camote_morado', yaw=yaw)


def camote(m, nombre, c, yaw, largo, g, cols=PIEL, tilt=6):
    """Raiz tuberosa fusiforme: cuerpo grueso al centro, dos puntas afiladas y raicilla. 4 cubos.

    c es el centro de la base del cuerpo; las piezas giran juntas alrededor de c, y tilt positivo
    hunde el extremo que apunta a yaw."""
    m.box(nombre, c, (g, g * 0.9, largo * 0.56), cols[0], tilt=tilt, yaw=yaw, pivot=c)
    for k, sg in enumerate((1, -1)):
        m.box(f'{nombre}_punta{k}', local(c, 0.0, sg * 0.39 * largo, dy=0.13 * g),
              (0.64 * g, 0.64 * g, 0.24 * largo), cols[k % 2], tilt=tilt, yaw=yaw, pivot=c)
    m.box(nombre + '_raicilla', local(c, 0.0, 0.51 * largo + 0.5, dy=0.36 * g), (0.25, 0.25, 1.0),
          'camote_piel_dark', tilt=tilt, yaw=yaw, pivot=c)


def camote_partido(m, nombre, qa, ya, qb, yb, largo, g, cols=PIEL, pulpa='camote_pulpa'):
    """Camote partido en dos mitades abiertas en V: cada una muestra la pulpa naranja en el corte. 7 cubos.

    qa y qb son el centro de la base de cada corte; ya y yb, hacia donde se alarga cada mitad (el
    corte mira al lado contrario, asi que conviene que ambas mitades apunten hacia atras)."""
    for tag, q, y, col_punta in (('a', qa, ya, cols[1]), ('b', qb, yb, cols[0])):
        m.box(f'{nombre}_{tag}', mover(q, y, 0.15 * largo), (g, g * 0.9, 0.30 * largo), cols[0], yaw=y)
        m.box(f'{nombre}_{tag}_punta', mover(q, y, 0.39 * largo, 0.13 * g), (0.64 * g, 0.64 * g, 0.20 * largo),
              col_punta, yaw=y)
        m.box(f'{nombre}_{tag}_pulpa', mover(q, y, -0.12, 0.05 * g), (0.88 * g, 0.8 * g, 0.3), pulpa, yaw=y)
    m.box(f'{nombre}_b_raicilla', mover(qb, yb, 0.49 * largo + 0.4, 0.36 * g), (0.25, 0.25, 0.9),
          'camote_piel_dark', yaw=yb)


def moscas(m, puntos):
    """Moscas (lo unico que flota a proposito). 2 cubos cada una."""
    for k, (x, y, z, a) in enumerate(puntos):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Esqueje recien plantado: trozo de guia morada enterrado en diagonal en el lomo, con una
    hojita lacia en el nudo de abajo, una hoja en la punta y la yema. 11 cubos (9 mas el lomo)."""
    m = Model('camote_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (-0.6, 2, 0), (4.0, 0.3, 2.2), 'suelo_humedo', yaw=8)
    base = (-2.0, 1.0, 0.0)          # el esqueje entra al lomo acostado, con buena parte enterrada
    q = m.stem('esqueje', base, 5.2, 0.6, 'camote_morado', tilt=58, yaw=90)
    hoja_corazon(m, 'hojita1', punta(base, 3.0, 58, 90), 190, 2.2, col='hoja_marchita', tilt=26)
    hoja_corazon(m, 'hojita2', q, 140, 2.4, col='camote_hoja', tilt=-24)
    m.box('yema', q, (0.5, 0.9, 0.5), 'camote_hoja_light', tilt=-30, yaw=90)
    return m


def brote():
    """Esqueje ya prendido: tallo morado mas parado, 3 hojas acorazonadas (la nueva mas clara) y una
    hojita enrollada en la punta. 13 cubos (11 mas el lomo)."""
    m = Model('camote_brote', PAL)
    monticulo(m)
    base = (-2.0, 1.0, 0.0)
    q = m.stem('esqueje', base, 5.4, 0.6, 'camote_morado', tilt=44, yaw=90)
    hoja_corazon(m, 'hoja1', punta(base, 2.8, 44, 90), 185, 3.0, col='camote_hoja_dark', tilt=-6)
    hoja_corazon(m, 'hoja2', punta(base, 4.1, 44, 90), 10, 3.0, col='camote_hoja', tilt=-12)
    hoja_corazon(m, 'hoja3', q, 110, 2.8, col='camote_hoja_light', tilt=-20)
    m.box('cogollo', q, (0.6, 1.2, 0.6), 'camote_hoja_light', tilt=-25, yaw=60)
    return m


def crecimiento():
    """Matita densa: corona, guias moradas a ras del lomo, 6 hojas acorazonadas y 1 flor lila en
    campanita. 30 cubos."""
    m = Model('camote_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.4, 1.0, 1.4), 'camote_piel_dark', yaw=20)
    top = (0, 2.8, 0)
    # hojas de la corona sobre peciolos
    hoja_peciolo(m, 'hoja0', top, 200, 2.6, 3.4, col='camote_hoja', tilt_pec=30)
    hoja_peciolo(m, 'hoja1', top, 330, 2.2, 3.0, col='camote_hoja_light', tilt_pec=34)
    # guias que corren por el lomo, con hojas en los nudos
    gd = guia(m, 'guia_der', (0.4, 2.3, 0.2), [(4.0, 95, 90), (2.2, 115, 106)])
    gi = guia(m, 'guia_izq', (-0.4, 2.3, -0.2), [(4.2, 265, 90)])
    hoja_corazon(m, 'hoja2', mover(gd[0], 275, 1.8), 160, 3.0, col='camote_hoja_dark', tilt=-14)
    hoja_corazon(m, 'hoja3', gd[1], 205, 2.4, col='camote_hoja_light', tilt=-18)
    hoja_corazon(m, 'hoja4', gi[0], 330, 2.8, col='camote_hoja', tilt=-16)
    hoja_corazon(m, 'hoja5', mover(gi[0], 85, 1.6), 200, 2.6, col='camote_hoja_dark', tilt=-12)
    flor(m, 'flor', mover(gd[0], 275, 0.6), 30)
    return m


def madurez():
    """Planta adulta: follaje denso de hojas acorazonadas sobre guias moradas, una flor, y 3 camotes
    rosa morado asomando del lomo al frente; uno partido muestra la pulpa naranja. 60 cubos."""
    m = Model('camote_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.6, 1.2, 1.6), 'camote_piel_dark', yaw=20)
    top = (0, 3.0, 0)
    # follaje de la corona hacia atras y a los lados: el frente (+Z) queda para los camotes
    hoja_peciolo(m, 'hoja0', top, 180, 2.8, 3.8, col='camote_hoja', tilt_pec=22)
    hoja_peciolo(m, 'hoja1', top, 250, 2.4, 3.4, col='camote_hoja_dark', tilt_pec=38)
    hoja_peciolo(m, 'hoja2', top, 115, 2.4, 3.4, col='camote_hoja_light', tilt_pec=38)
    # guias a ras del lomo; en el ultimo tramo bajan al escalon del lomo
    gd = guia(m, 'guia_der', (0.5, 2.3, 0.0), [(4.0, 92, 90), (2.4, 135, 108)])
    gi = guia(m, 'guia_izq', (-0.5, 2.3, 0.0), [(4.0, 268, 90), (2.4, 225, 108)])
    gt = guia(m, 'guia_atras', (0.2, 2.3, -0.5), [(2.6, 170, 90)])
    hoja_corazon(m, 'hoja3', mover(gd[0], 272, 1.6), 150, 3.2, col='camote_hoja_dark', tilt=-14)
    hoja_corazon(m, 'hoja4', gd[0], 30, 2.8, col='camote_hoja', tilt=-20)
    hoja_corazon(m, 'hoja5', gd[1], 200, 2.6, col='camote_hoja_light', tilt=-10)
    hoja_corazon(m, 'hoja6', mover(gi[0], 88, 1.6), 210, 3.2, col='camote_hoja', tilt=-14)
    hoja_corazon(m, 'hoja7', gi[0], 330, 2.8, col='camote_hoja_dark', tilt=-20)
    hoja_corazon(m, 'hoja8', gi[1], 160, 2.6, col='camote_hoja_light', tilt=-10)
    hoja_corazon(m, 'hoja9', gt[0], 175, 2.6, col='camote_hoja_dark', tilt=-8)
    flor(m, 'flor', mover(gd[0], 272, 0.4), 40)
    # camotes al frente, medio hundidos en el lomo, saliendo de la corona como rayos
    camote(m, 'camote1', (4.2, 1.0, 2.2), 70, 4.8, 1.5, tilt=6)
    camote(m, 'camote2', (-4.2, 1.0, 2.3), 290, 4.4, 1.4, tilt=8)
    camote_partido(m, 'camote3', (-0.9, 1.0, 4.4), 198, (1.3, 1.0, 4.5), 160, 5.2, 1.6)
    return m


def podrida():
    """Desenlace de estres: hojas amarillas y secas caidas, guias secas y quebradas, camotes
    oscurecidos y hundidos con moho, y moscas. 55 cubos."""
    m = Model('camote_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.6, 2, -1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.0), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('corona', BASE, (1.6, 0.8, 1.6), 'podrido', yaw=20)
    m.box('moho_corona', (0.2, 2.8, 0.1), (1.0, 0.4, 1.0), 'moho_dark', yaw=40)
    top = (0, 2.6, 0)
    # las hojas que quedan en pie: peciolos vencidos y laminas colgando
    hoja_peciolo(m, 'hoja0', top, 190, 1.8, 3.2, col='hoja_marchita', tilt_pec=64, tilt=22,
                 col_pec='hoja_seca_dark')
    hoja_peciolo(m, 'hoja1', top, 300, 1.6, 2.8, col='hoja_seca', tilt_pec=72, tilt=18, col_pec='hoja_seca_dark')
    # guias secas a ras del lomo, una quebrada
    gd = guia(m, 'guia_der', (0.5, 2.25, 0.0), [(3.8, 95, 90), (2.2, 140, 108)], grueso=0.45,
              cols=('hoja_seca_dark', 'podrido'))
    gi = guia(m, 'guia_izq', (-0.5, 2.25, 0.0), [(3.8, 262, 90)], grueso=0.45, cols=('hoja_seca_dark',))
    m.box('guia_quiebre', gd[0], (0.8, 0.5, 0.8), 'podrido_dark')
    # hojas caidas sobre el lomo y en el suelo, ya planas
    hoja_corazon(m, 'hoja2', mover(gd[0], 272, 1.4), 165, 3.0, col='hoja_seca_dark', tilt=0)
    hoja_corazon(m, 'hoja3', gi[0], 200, 2.8, col='hoja_marchita', tilt=0)
    hoja_corazon(m, 'hoja4', gd[1], 200, 2.4, col='hoja_seca', tilt=4)
    hoja_corazon(m, 'caida0', (-5.0, 1.0, -3.4), 230, 2.4, col='hoja_seca', tilt=0)
    hoja_corazon(m, 'caida1', (4.6, 1.0, -3.6), 135, 2.2, col='hoja_marchita', tilt=0)
    # camotes podridos: hundidos, oscuros, con moho; el partido ya esta negro por dentro
    c1 = (4.2, 0.7, 2.2)
    camote(m, 'camote1', c1, 70, 4.6, 1.4, cols=PODRIDA, tilt=8)
    m.box('camote1_moho', (c1[0], c1[1] + 1.25, c1[2]), (1.2, 0.3, 1.6), 'moho_light', yaw=75)
    c2 = (-4.2, 0.6, 2.3)
    camote(m, 'camote2', c2, 290, 4.2, 1.4, cols=('camote_piel_dark', 'podrido'), tilt=10)
    m.box('camote2_moho', (c2[0] + 0.3, c2[1] + 1.25, c2[2]), (1.0, 0.3, 1.2), 'moho', yaw=300)
    camote_partido(m, 'camote3', (-0.9, 0.7, 4.4), 205, (1.4, 0.6, 4.4), 150, 4.8, 1.5, cols=PODRIDA,
                   pulpa='moho_dark')
    m.box('camote3_moho', mover((-0.9, 0.7, 4.4), 205, 1.0, 1.3), (1.1, 0.3, 1.1), 'moho_light', yaw=20)
    moscas(m, [(0.4, 5.4, 4.0, 20), (-2.8, 4.4, 2.6, -40)])
    return m


ETAPAS = [('camote_siembra', siembra), ('camote_brote', brote), ('camote_crecimiento', crecimiento),
          ('camote_madurez', madurez), ('camote_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
