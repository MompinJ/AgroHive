"""Generador de la yuca (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/yuca.py

Yuca o mandioca (Manihot esculenta), arbusto lenoso. Convenciones (docs/07): 1 celda = 16 unidades,
origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el
lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16.
Las alturas son cualitativas, no medidas reales: solo se respeta que en madurez sea mas alta que el
chile y mas baja que el maiz.

Rasgos que se respetan para no confundirla con el camote, el chile y el algodon: ARBUSTO alto y ralo,
con tallo lenoso gris pardo y nudos marcados (cicatrices de las hojas que ya cayeron), pelon abajo y
con las hojas agrupadas en la punta; en madurez el tallo se bifurca arriba en dos ramas. Hoja PALMEADA
partida hasta casi la base en 5 a 7 lobulos angostos como dedos, sobre peciolos LARGOS y ROJIZOS.
Raices tuberosas grandes y alargadas que salen en racimo de la base del tallo, cascara cafe y pulpa
blanca. Se siembra por ESTACA (trozo de tallo con nudos) clavada en diagonal, no por semilla. Las
raices NO van bajo y=0: se asoman medio hundidas en el lomo. Colores solo de la paleta fija
(yuca_*, hoja seca y marchita, podrido, moho, y algunos neutros de suelo y madera).

Fuentes de forma (consultadas el 15/11/2026):
- Hoja palmeada de 5 a 7 (hasta 9) lobulos, peciolo largo a menudo rojizo, tallo con cicatrices
  foliares prominentes, propagacion por estacas de tallo que enraizan en los nudos enterrados:
  https://www.nparks.gov.sg/florafaunaweb/flora/2/2/2210 ,
  https://uses.plantnet-project.org/en/Manihot_esculenta_(PROSEA) y
  https://gardeningsolutions.ifas.ufl.edu/plants/edibles/vegetables/cassava.html
- Estacas de 25 a 30 cm plantadas de lado o en diagonal; tiempo de cultivo largo:
  https://www.epicgardening.com/cassava/
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

NUDO = 'wood_dark'                 # anillo y cicatriz del nudo, mas oscuro que el tallo
CORTE = 'yuca_pulpa'               # medula blanca en el corte de la estaca
RAIZ_COL = ('yuca_raiz', 'soil_dark')          # cascara, punta y cuello mas oscuros
PODRIDA = ('podrido', 'podrido_dark')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def local(p, v, u, extra=0.0, dy=0.0):
    """Centro previo a girar para una pieza que gira alrededor de p con yaw + extra: tras el giro
    queda a v unidades de lado y u al frente de p (mismo truco que en camote.py)."""
    a = math.radians(-extra)
    return (p[0] + v * math.cos(a) + u * math.sin(a), p[1] + dy, p[2] - v * math.sin(a) + u * math.cos(a))


def en_eje(m, nombre, base, d, size, col, tilt, yaw, lado=0.0):
    """Pieza montada sobre el eje de un tallo que sale de base con tilt y yaw: queda a d unidades
    de la base (centro de su cara inferior) y gira junto con el tallo. lado la saca hacia el frente
    local del tallo (para cicatrices y yemas). 1 cubo."""
    c = (base[0], base[1] + d, base[2] + lado)
    return m.box(nombre, c, size, col, tilt=tilt, yaw=yaw, pivot=base)


def tallo(m, nombre, base, tramos, grueso, col='yuca_tallo', nudos=True):
    """Tallo lenoso por tramos [(largo, tilt, yaw)], con un anillo de nudo al final de cada tramo.
    Devuelve las puntas de cada tramo. 1 o 2 cubos por tramo."""
    p = base
    pts = []
    for i, (largo, tilt, yaw) in enumerate(tramos):
        q = m.stem(f'{nombre}{i}', p, largo, grueso, col, tilt=tilt, yaw=yaw)
        if nudos:
            g = grueso + 0.4
            en_eje(m, f'{nombre}{i}_nudo', p, largo - 0.25, (g, 0.5, g), NUDO, tilt, yaw)
        p = q
        pts.append(q)
    return pts


def hoja_palmeada(m, nombre, p, yaw, largo, n=5, col='yuca_hoja', centro=None, tilt=88, ancho=0.7,
                  abanico=None):
    """Hoja palmeada: n lobulos angostos como dedos que salen en abanico de p (la punta del peciolo)
    hacia yaw. El lobulo central es el mas largo y los de afuera caen un poco mas. tilt ~90 = lobulos
    horizontales, menos de 90 suben y mas de 90 cuelgan. n cubos."""
    paso = abanico if abanico is not None else {3: 42, 5: 50, 7: 38}.get(n, 45)
    largos = (1.0, 0.86, 0.7, 0.55)
    for k in range(n):
        i = k - n // 2
        col_k = (centro or col) if i == 0 else col
        m.box(f'{nombre}_lob{k}', p, (ancho, largo * largos[abs(i)], 0.28), col_k,
              tilt=tilt + 5 * abs(i), yaw=yaw + paso * i)


def hoja(m, nombre, base, yaw, largo_pec, tilt_pec, largo, n=5, col='yuca_hoja', centro=None, tilt=88,
         col_pec='yuca_peciolo', grueso_pec=0.3, ancho=0.7):
    """Peciolo largo y rojizo que sale de base y su hoja palmeada en la punta. n + 1 cubos."""
    p = m.stem(nombre + '_pec', base, largo_pec, grueso_pec, col_pec, tilt=tilt_pec, yaw=yaw)
    hoja_palmeada(m, nombre, p, yaw, largo, n=n, col=col, centro=centro, tilt=tilt, ancho=ancho)
    return p


def raiz(m, nombre, c, yaw, largo, g, cols=RAIZ_COL, tilt=7):
    """Raiz tuberosa alargada (cilindro grueso) que sale de la base del tallo hacia yaw: cuello
    delgado del lado del tallo, cuerpo largo y punta afilada. 3 cubos.

    c es el centro de la base del cuerpo; todo gira alrededor de c y tilt positivo hunde la punta."""
    m.box(nombre, c, (g, g * 0.88, largo * 0.62), cols[0], tilt=tilt, yaw=yaw, pivot=c)
    m.box(nombre + '_punta', local(c, 0.0, 0.31 * largo + 0.12 * largo, dy=0.14 * g),
          (0.6 * g, 0.6 * g, 0.24 * largo), cols[1], tilt=tilt, yaw=yaw, pivot=c)
    m.box(nombre + '_cuello', local(c, 0.0, -(0.31 * largo + 0.07 * largo), dy=0.25 * g),
          (0.5 * g, 0.5 * g, 0.14 * largo), cols[1], tilt=tilt, yaw=yaw, pivot=c)


def raiz_partida(m, nombre, c, yaw, largo, g, q, yb, cols=RAIZ_COL, pulpa='yuca_pulpa'):
    """Raiz partida a la mitad: la mitad pegada al tallo muestra el corte blanco hacia afuera y la
    mitad de la punta queda tirada a un lado con su corte blanco. 6 cubos.

    c es el centro de la base del corte de la mitad pegada al tallo (la raiz crece hacia yaw); q es el
    centro de la base del corte de la otra mitad, que se alarga hacia yb (su corte mira al reves)."""
    h1 = 0.36 * largo
    # mitad del tallo: cuerpo, cuello y la pulpa en el corte (mira hacia yaw)
    m.box(nombre + '_a', mover(c, yaw, -h1 / 2), (g, g * 0.88, h1), cols[0], yaw=yaw)
    m.box(nombre + '_a_cuello', mover(c, yaw, -h1 - 0.07 * largo, 0.25 * g), (0.5 * g, 0.5 * g, 0.14 * largo),
          cols[1], yaw=yaw)
    m.box(nombre + '_a_pulpa', mover(c, yaw, 0.06, 0.06 * g), (0.86 * g, 0.76 * g, 0.16), pulpa, yaw=yaw)
    # mitad de la punta, separada y tirada al lado
    h2 = 0.3 * largo
    m.box(nombre + '_b', mover(q, yb, h2 / 2), (g * 0.95, g * 0.84, h2), cols[0], yaw=yb)
    m.box(nombre + '_b_punta', mover(q, yb, h2 + 0.11 * largo, 0.14 * g), (0.6 * g, 0.6 * g, 0.22 * largo),
          cols[1], yaw=yb)
    m.box(nombre + '_b_pulpa', mover(q, yb, -0.06, 0.06 * g), (0.82 * g, 0.72 * g, 0.16), pulpa, yaw=yb)


def moscas(m, puntos):
    """Moscas (lo unico que flota a proposito). 2 cubos cada una."""
    for k, (x, y, z, a) in enumerate(puntos):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
# la estaca se inclina de lado respecto a la camara isometrica (az 35) para que se lea su diagonal
ESTACA = dict(base=(-1.95, 1.2, 1.35), largo=7.2, tilt=40, yaw=125)


def siembra():
    """Estaca recien clavada en diagonal en el lomo: trozo de tallo gris pardo con 3 nudos, el corte
    de arriba con la medula blanca y una yemita verde en un nudo; tierra removida alrededor.
    9 cubos (7 mas el lomo)."""
    m = Model('yuca_siembra', PAL)
    monticulo(m)
    b, L, t, y = ESTACA['base'], ESTACA['largo'], ESTACA['tilt'], ESTACA['yaw']
    m.box('hoyo', (-1.2, 2, 0.8), (3.0, 0.3, 2.4), 'suelo_humedo', yaw=35)
    m.stem('estaca', b, L, 1.0, 'yuca_tallo', tilt=t, yaw=y)
    for k, d in enumerate((2.6, 4.4, 6.2)):
        en_eje(m, f'nudo{k}', b, d, (1.4, 0.45, 1.4), NUDO, t, y)
    en_eje(m, 'corte', b, L, (0.8, 0.12, 0.8), CORTE, t, y)
    en_eje(m, 'yema', b, 4.65, (0.45, 0.5, 0.45), 'yuca_hoja_light', t, y, lado=-0.65)
    return m


def brote():
    """Estaca prendida: del nudo de arriba salen 2 hojitas palmeadas de 3 lobulos sobre peciolos
    rojizos (la nueva mas clara). 12 cubos (10 mas el lomo)."""
    m = Model('yuca_brote', PAL)
    monticulo(m)
    b, L, t, y = ESTACA['base'], ESTACA['largo'], ESTACA['tilt'], ESTACA['yaw']
    m.stem('estaca', b, L, 1.0, 'yuca_tallo', tilt=t, yaw=y)
    q = punta(b, 6.0, t, y)                       # el nudo de donde brota
    en_eje(m, 'nudo1', b, 5.8, (1.4, 0.45, 1.4), NUDO, t, y)
    hoja(m, 'hojita0', q, 30, 2.8, 22, 2.8, n=3, col='yuca_hoja', centro='yuca_hoja_light', tilt=66,
         grueso_pec=0.28, ancho=0.65)
    hoja(m, 'hojita1', q, 285, 2.2, 34, 2.3, n=3, col='yuca_hoja_light', tilt=60, grueso_pec=0.25,
         ancho=0.6)
    return m


def crecimiento():
    """Arbusto joven: tallo lenoso con dos nudos y la copa en la punta, 3 hojas palmeadas de 5 lobulos
    sobre peciolos rojos largos y una tierna de 3 lobulos junto al cogollo. 29 cubos."""
    m = Model('yuca_crecimiento', PAL)
    monticulo(m)
    pts = tallo(m, 'tallo', BASE, [(5.0, 4, 40), (5.2, 5, 220)], 0.9)
    top = pts[-1]
    m.box('cogollo', top, (0.6, 0.9, 0.6), 'yuca_hoja_dark', yaw=20)
    hoja(m, 'hoja0', top, 35, 3.2, 62, 3.0, col='yuca_hoja', centro='yuca_hoja_light', tilt=92)
    hoja(m, 'hoja1', top, 155, 3.2, 70, 3.0, col='yuca_hoja_dark', centro='yuca_hoja', tilt=96)
    hoja(m, 'hoja2', top, 275, 3.2, 66, 3.0, col='yuca_hoja', centro='yuca_hoja_light', tilt=94)
    hoja(m, 'hoja4', (top[0], top[1] + 0.6, top[2]), 80, 1.6, 22, 1.8, n=3, col='yuca_hoja_light', tilt=50,
         grueso_pec=0.25, ancho=0.55)
    return m


def madurez():
    """Arbusto alto y ralo: tallo gris pardo pelon con nudos marcados que se bifurca arriba en dos
    ramas, cada una con su copa de hojas palmeadas en peciolos rojos; 3 raices grandes cafes asoman
    del lomo al frente, una partida con la pulpa blanca. 60 cubos."""
    m = Model('yuca_madurez', PAL)
    monticulo(m)
    pts = tallo(m, 'tallo', BASE, [(5.5, 4, 30), (5.5, 5, 210), (5.0, 4, 60)], 1.2)
    fork = pts[-1]
    ramas = []
    for k, ya in enumerate((125, 305)):
        r = tallo(m, f'rama{k}', fork, [(4.2, 24, ya)], 0.8, nudos=False)[0]
        m.box(f'rama{k}_cogollo', r, (0.55, 0.8, 0.55), 'yuca_hoja_dark', yaw=ya)
        ramas.append((r, ya))
    # copa: en cada rama una hoja que sube, una abierta y una que cuelga (las viejas caen)
    (r0, y0), (r1, y1) = ramas
    hoja(m, 'hoja0', r0, y0 - 40, 2.8, 40, 3.2, col='yuca_hoja', centro='yuca_hoja_light', tilt=86)
    hoja(m, 'hoja1', r0, y0 + 55, 3.0, 72, 3.0, col='yuca_hoja_dark', centro='yuca_hoja', tilt=96)
    hoja(m, 'hoja2', r0, y0 + 150, 2.6, 30, 2.6, col='yuca_hoja_light', tilt=80)
    hoja(m, 'hoja3', r1, y1 - 40, 2.8, 40, 3.2, col='yuca_hoja', centro='yuca_hoja_light', tilt=86)
    hoja(m, 'hoja4', r1, y1 + 55, 3.0, 72, 3.0, col='yuca_hoja_dark', centro='yuca_hoja', tilt=96)
    hoja(m, 'hoja5', r1, y1 + 150, 2.6, 30, 2.6, col='yuca_hoja_light', tilt=80)
    # raices en racimo desde la base, medio hundidas en el lomo
    raiz(m, 'raiz0', (3.7, 1.0, 1.4), 72, 6.8, 1.7)
    raiz(m, 'raiz1', (-3.7, 1.0, 1.5), 286, 6.6, 1.6)
    raiz_partida(m, 'raiz2', (1.0, 1.0, 3.0), 35, 7.0, 1.7, (-0.7, 1.0, 4.3), 262)
    return m


def podrida():
    """Desenlace de estres: el tallo seco se quebro y la parte de arriba cuelga hasta el lomo con las
    hojas secas; hojas caidas en el suelo, raices oscurecidas y hundidas con moho, y 2 moscas.
    58 cubos."""
    m = Model('yuca_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.0, 2, -1.6), (3.6, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-1.6, 2, 1.6), (0.5, 0.2, 2.6), 'suelo_grieta', yaw=-20)
    # tocon en pie, seco y gris, con un nudo
    pts = tallo(m, 'tallo', BASE, [(5.0, 5, 30)], 1.2, col='stone', nudos=False)
    en_eje(m, 'tallo_nudo', BASE, 2.8, (1.6, 0.5, 1.6), NUDO, 5, 30)
    q = pts[0]
    m.box('moho_base', (0.15, 2.0, 0.1), (1.7, 0.6, 1.7), 'moho_dark', yaw=30)
    # astillas del quiebre
    m.box('astilla0', q, (0.5, 1.0, 0.4), 'hoja_seca_light', tilt=14, yaw=60)
    m.box('astilla1', q, (0.4, 0.7, 0.5), 'suelo_seco', tilt=-18, yaw=200)
    # la parte quebrada cuelga hacia la izquierda hasta tocar el lomo
    caida = tallo(m, 'quebrado', q, [(4.2, 116, 262), (3.6, 146, 262)], 1.0, col='hoja_seca_dark')
    fin = caida[-1]
    hoja(m, 'hoja0', fin, 170, 1.4, 100, 2.8, col='hoja_seca_dark', centro='hoja_seca', tilt=100,
         col_pec='podrido', grueso_pec=0.28)
    hoja(m, 'hoja1', fin, 10, 1.2, 96, 2.6, col='hoja_seca', tilt=100, col_pec='podrido', grueso_pec=0.28)
    hoja(m, 'hoja2', caida[0], 330, 2.0, 120, 2.4, n=4, col='hoja_marchita', tilt=110, col_pec='hoja_seca_dark',
         grueso_pec=0.28)
    # hojas sueltas ya planas en el suelo
    hoja_palmeada(m, 'caida0', (4.6, 1.0, -3.4), 140, 2.6, col='hoja_seca', tilt=90)
    hoja_palmeada(m, 'caida1', (1.0, 2.0, -2.0), 20, 2.2, n=4, col='hoja_seca_dark', tilt=90)
    # raices podridas: oscuras, hundidas y con moho; la partida ya esta negra por dentro
    c0 = (3.7, 0.7, 1.4)
    raiz(m, 'raiz0', c0, 72, 6.4, 1.6, cols=PODRIDA, tilt=9)
    m.box('raiz0_moho', (c0[0] + 0.2, c0[1] + 1.35, c0[2] + 0.1), (1.4, 0.3, 1.8), 'moho_light', yaw=72)
    c1 = (-3.7, 0.6, 1.5)
    raiz(m, 'raiz1', c1, 286, 6.2, 1.5, cols=('yuca_raiz', 'podrido_dark'), tilt=10)
    m.box('raiz1_moho', (c1[0] - 0.6, c1[1] + 1.3, c1[2]), (1.2, 0.3, 1.4), 'moho', yaw=286)
    raiz_partida(m, 'raiz2', (1.0, 0.7, 3.0), 35, 6.6, 1.6, (-0.7, 0.7, 4.3), 262, cols=PODRIDA,
                 pulpa='moho_dark')
    m.box('raiz2_moho', mover((1.0, 0.7, 3.0), 215, 1.0, 1.35), (1.1, 0.3, 1.1), 'moho_light', yaw=35)
    moscas(m, [(1.2, 5.6, 4.2, 25), (-3.0, 4.6, 2.2, -40)])
    return m


ETAPAS = [('yuca_siembra', siembra), ('yuca_brote', brote), ('yuca_crecimiento', crecimiento),
          ('yuca_madurez', madurez), ('yuca_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
