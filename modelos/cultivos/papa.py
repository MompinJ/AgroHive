"""Generador de la papa (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/papa.py

Papa (Solanum tuberosum), mata herbacea erguida de varios tallos que salen de la papa semilla.
Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la base, y=0 superficie,
+Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje
(0, 2, 0), y caben en una huella de 16x16. Las alturas y tamanos son CUALITATIVOS, no medidas
reales (la mata queda en ~9-10 unidades, mas baja que el maiz y mas alta que el camote).

Rasgos que se respetan para no confundirla con el camote (guias moradas a ras, hoja corazon,
raiz rosa) ni con el frijol (tallo en zigzag, hoja de 3 rombos):
- mata frondosa y redondeada (cupula) sobre el lomo aporcado, con 3-4 tallos verdes;
- hoja COMPUESTA (pinnada): raquis con pares de foliolos ovalados y uno terminal, verde medio;
- flores en racimo arriba de la mata, estrellita blanca con el cono de anteras amarillo al centro;
- tuberculos beige redondeados con ojos (yemas) oscuros; se siembra la papa semilla (o un trozo
  con al menos dos ojos), no semilla botanica: en siembra se ve la papa partida con sus brotes;
- madurez: el follaje amarillea y la mata se acama (senescencia que marca la cosecha), quedan
  flores secas y las papas se asoman del lomo al frente; podrida: mata seca tendida, papas
  oscurecidas con moho, una partida negra por dentro y moscas.
Las papas NO van bajo y=0 (lo pide la prueba de la escena): se asoman medio hundidas en el lomo.

Fuentes de forma (consultadas el 15/11):
- NC State Extension, Solanum tuberosum: hoja compuesta con varios foliolos, flor blanca, rosa,
  morada o azul con estambres amarillos; papa semilla en trozos con 2 ojos o mas, ojos arriba.
  https://plants.ces.ncsu.edu/plants/solanum-tuberosum/common-name/potato/
- Purdue Plant ID, Irish potato: flores con estambres amarillos prominentes, hoja compuesta.
  https://hort.purdue.edu/plant-id-pal/Vegetables/potatoIrish.html
- APSnet, tizon tardio de la papa: hoja de numero impar de foliolos; los ojos son yemas.
  https://apsnet.org/edcenter/apsnetfeatures/Pages/PotatoLateBlightPlantDiseasesPlant.aspx
Colores solo de la paleta fija (papa_*, verdes compartidos, marchitos, podrido, moho); la pulpa
del corte usa calabaza_crema, que ya existe.
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

VERDE = ('leaf_dark', 'papa_hoja', 'papa_hoja')                 # raquis, foliolos, terminal
SOMBRA = ('leaf_dark', 'frijol_hoja_dark', 'papa_hoja')         # hoja de abajo, en sombra
AMARILLA = ('hoja_marchita', 'hoja_marchita', 'hoja_marchita')  # senescencia de madurez
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca')
PIEL = ('papa_tuberculo', 'papa_tuberculo', 'papa_tuberculo_dark')   # cuerpo, cima, ojos
PODRIDA = ('podrido', 'papa_tuberculo_dark', 'podrido_dark')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def foliolo(m, nombre, c, yaw, s, col, tilt=8, ancho=0.58):
    """Foliolo ovalado: lamina plana mas larga que ancha, alargada hacia yaw (tilt > 0 baja la punta)."""
    m.box(nombre, c, (ancho * s, 0.3, s), col, tilt=tilt, yaw=yaw)


def hoja_compuesta(m, nombre, base, yaw, largo, s, pares=1, cols=VERDE, tilt_r=65, caida=0.0):
    """Hoja pinnada de papa: raquis inclinado, `pares` pares de foliolos opuestos y uno terminal.

    Cubos: 2 + 2 * pares. caida (0-1) baja los foliolos (hoja lacia o tendida)."""
    p = m.stem(nombre + '_raq', base, largo, 0.35, cols[0], tilt=tilt_r, yaw=yaw)
    fr = [0.6] if pares == 1 else [0.38 + 0.44 * k / (pares - 1) for k in range(pares)]
    for k, f in enumerate(fr):
        q = punta(base, f * largo, tilt_r, yaw)
        t = s * (0.82 + 0.1 * k)          # los foliolos crecen hacia la punta
        for lado, sg in (('i', 1), ('d', -1)):
            c = mover(q, yaw + 90 * sg, 0.42 * t, -0.15 - 0.2 * caida)
            foliolo(m, f'{nombre}_f{k}{lado}', c, yaw + 55 * sg, t, cols[1], tilt=6 + 40 * caida)
    foliolo(m, nombre + '_term', mover(p, yaw, 0.45 * s, -0.1 - 0.2 * caida), yaw, 1.1 * s, cols[2],
            tilt=10 + 40 * caida, ancho=0.62)
    return p


def flor(m, nombre, c, yaw, col='white', centro='yellow', s=1.3):
    """Flor de papa: estrellita plana (rombo) con el cono de anteras amarillo al centro. 2 cubos
    (1 si centro es None: flor seca)."""
    m.box(nombre, c, (s, 0.3, s), col, yaw=yaw + 45)
    if centro:
        m.box(nombre + '_cono', (c[0], c[1] + 0.25, c[2]), (0.4 * s, 0.45, 0.4 * s), centro, yaw=yaw)


def racimo(m, nombre, base, yaw, flores, col='white', centro='yellow', s=1.3, col_ped='leaf_dark', largo=1.6):
    """Pedunculo que sale de la punta de un tallo y flores en racimo (cima). 1 + 2 por flor.

    flores = [(dx, dy, dz)] relativos a la punta del pedunculo."""
    p = m.stem(nombre + '_ped', base, largo, 0.3, col_ped, tilt=12, yaw=yaw)
    for k, (dx, dy, dz) in enumerate(flores):
        flor(m, f'{nombre}{k}', (p[0] + dx, p[1] + dy, p[2] + dz), yaw + 20 * k, col, centro, s)
    return p


def girar(p, piv, tilt, yaw):
    """Donde queda el punto p tras girar (tilt en X, luego yaw en Y) alrededor de piv, como voxelkit."""
    x, y, z = p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]
    t, w = math.radians(tilt), math.radians(yaw)
    y, z = y * math.cos(t) - z * math.sin(t), y * math.sin(t) + z * math.cos(t)
    x, z = x * math.cos(w) + z * math.sin(w), -x * math.sin(w) + z * math.cos(w)
    return (x + piv[0], y + piv[1], z + piv[2])


def papa(m, nombre, c, yaw, g, cols=PIEL, ojo=0.2):
    """Tuberculo ovalado: cuerpo, tramo largo mas angosto y cima (silueta en cruz que se lee
    redondeada) y un ojo oscuro en la cima. c es el centro de la base; se alarga hacia yaw.
    Cubos: 3, o 4 con ojo (ojo=None lo quita)."""
    m.box(nombre, c, (g, 0.6 * g, 1.0 * g), cols[0], yaw=yaw)
    m.box(nombre + '_largo', (c[0], c[1] + 0.05 * g, c[2]), (0.66 * g, 0.6 * g, 1.34 * g), cols[0], yaw=yaw)
    m.box(nombre + '_cima', (c[0], c[1] + 0.1 * g, c[2]), (0.6 * g, 0.66 * g, 0.9 * g), cols[1], yaw=yaw)
    if ojo is not None:
        m.box(nombre + '_ojo', mover(c, yaw, ojo * g, 0.76 * g), (0.32, 0.1, 0.32), cols[2], yaw=yaw)


def moscas(m, puntos):
    """Moscas (lo unico que flota a proposito). 2 cubos cada una."""
    for k, (x, y, z, a) in enumerate(puntos):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Papa semilla partida, con el corte de pulpa crema mirando arriba y al frente, medio hundida en
    un hoyo del lomo; de sus ojos salen 3 brotitos cortos y gruesos. 12 cubos (10 mas el lomo)."""
    m = Model('papa_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.8, 0.3, 3.4), 'suelo_humedo', yaw=-6)
    c = (0.0, 1.4, -0.2)
    t, w = -18, -8                     # toda la papa gira junta alrededor de c: el corte se levanta

    def pieza(nombre, p, size, col):
        m.box(nombre, p, size, col, tilt=t, yaw=w, pivot=c)

    pieza('semilla', c, (3.4, 1.6, 2.0), 'papa_tuberculo')
    pieza('semilla_cima', (c[0], c[1] + 0.2, c[2] - 0.15), (2.6, 2.1, 1.7), 'papa_tuberculo')
    pieza('semilla_corte', (c[0], c[1] + 0.1, c[2] + 1.0), (3.0, 1.4, 0.2), 'calabaza_crema')
    pieza('semilla_ojo', (c[0] + 1.5, c[1] + 1.6, c[2] - 0.2), (0.32, 0.1, 0.32), 'papa_tuberculo_dark')
    brotes = [((-0.7, 2.2, -0.5), 1.5, 22, 250, True), ((0.6, 2.2, -0.2), 1.9, 16, 60, True),
              ((0.2, 2.1, -0.85), 1.0, 40, 165, False)]
    for k, (d, largo, tilt, yaw, yema) in enumerate(brotes):
        b = girar((c[0] + d[0], c[1] + d[1], c[2] + d[2]), c, t, w)
        q = m.stem(f'brote{k}', b, largo, 0.55, 'chicharo_hoja_light', tilt=tilt, yaw=yaw)
        if yema:
            m.box(f'brote{k}_yema', q, (0.65, 0.55, 0.65), 'leaf_light', yaw=20 * k)
    return m


def brote():
    """Dos tallitos verdes que salen del lomo con sus primeras hojas compuestas (un par de foliolos
    y el terminal), la mas nueva en verde claro. 12 cubos (10 mas el lomo)."""
    m = Model('papa_brote', PAL)
    monticulo(m)
    t0 = m.stem('tallo0', (0.4, 2.0, 0.2), 2.8, 0.5, 'leaf_dark', tilt=10, yaw=60)
    hoja_compuesta(m, 'hoja0', t0, 75, 1.9, 1.9, pares=1, cols=('leaf_dark', 'papa_hoja', 'leaf_light'),
                   tilt_r=55)
    t1 = m.stem('tallo1', (-0.4, 2.0, -0.1), 2.0, 0.45, 'leaf_dark', tilt=22, yaw=235)
    hoja_compuesta(m, 'hoja1', t1, 250, 1.7, 1.7, pares=1, cols=SOMBRA, tilt_r=60)
    return m


def crecimiento():
    """Mata joven, erguida, verde y redondeada: 2 tallos cortos, 4 hojas compuestas en cupula (las
    de arriba con 5 foliolos) y un racimo de flores blancas con centro amarillo arriba. 30 cubos."""
    m = Model('papa_crecimiento', PAL)
    monticulo(m)
    m.box('aporque', (0, 2, 0), (4.4, 0.6, 3.4), 'soil', yaw=12)
    b0, b1 = (0.3, 2.4, 0.2), (-0.3, 2.4, 0.0)
    t0 = m.stem('tallo0', b0, 4.4, 0.6, 'leaf_dark', tilt=10, yaw=40)
    t1 = m.stem('tallo1', b1, 3.2, 0.55, 'leaf_dark', tilt=30, yaw=250)
    hoja_compuesta(m, 'hoja0', t0, 30, 2.4, 2.2, pares=2, tilt_r=55)
    hoja_compuesta(m, 'hoja1', t0, 160, 2.4, 2.2, pares=2, tilt_r=62)
    hoja_compuesta(m, 'hoja2', t1, 265, 2.2, 2.2, pares=1, tilt_r=66)
    hoja_compuesta(m, 'hoja3', punta(b0, 1.8, 10, 40), 95, 2.4, 2.2, pares=1, cols=SOMBRA, tilt_r=78)
    racimo(m, 'flor', t0, 300, [(-1.1, 0.0, -0.5), (1.0, 0.6, 0.6)], largo=2.4, s=1.4)
    return m


def madurez():
    """Mata madura que amarillea y se acama: tallos inclinados, hojas compuestas verdes y amarillas,
    flores secas, y 5 papas beige con ojos asomando del lomo al frente. 60 cubos."""
    m = Model('papa_madurez', PAL)
    monticulo(m)
    m.box('aporque', (0, 2, -0.4), (5.0, 0.7, 3.8), 'soil', yaw=12)
    b0, b1, b2 = (0.4, 2.5, 0.0), (-0.4, 2.5, 0.0), (0.0, 2.5, -0.4)
    t0 = m.stem('tallo0', b0, 3.4, 0.6, 'leaf_dark', tilt=34, yaw=80)
    t1 = m.stem('tallo1', b1, 3.0, 0.6, 'hoja_marchita', tilt=40, yaw=280)
    t2 = m.stem('tallo2', b2, 4.0, 0.6, 'leaf_dark', tilt=16, yaw=190)
    # follaje hacia atras, arriba y a los lados: el frente bajo (+Z) queda para las papas
    hoja_compuesta(m, 'hoja0', t0, 100, 2.6, 2.3, pares=2, tilt_r=68, caida=0.2)
    hoja_compuesta(m, 'hoja1', t1, 260, 2.6, 2.3, pares=2, cols=AMARILLA, tilt_r=70, caida=0.3)
    hoja_compuesta(m, 'hoja2', t2, 170, 2.4, 2.2, pares=2, tilt_r=60, caida=0.1)
    hoja_compuesta(m, 'hoja3', t2, 20, 2.0, 2.0, pares=2, cols=('leaf_dark', 'papa_hoja', 'hoja_marchita'),
                   tilt_r=45)
    hoja_compuesta(m, 'hoja4', punta(b1, 1.6, 40, 280), 210, 2.4, 2.0, pares=1, cols=SECA, tilt_r=86,
                   caida=0.6)
    hoja_compuesta(m, 'hoja5', punta(b0, 1.6, 34, 80), 140, 2.4, 2.0, pares=1, cols=AMARILLA, tilt_r=82,
                   caida=0.4)
    racimo(m, 'flor', t2, 300, [(-0.5, 0.0, 0.3), (0.6, 0.3, -0.2)], col='hoja_seca', centro=None, s=1.0,
           col_ped='hoja_seca_dark')
    # papas al frente, medio hundidas en el lomo
    papa(m, 'papa1', (-4.8, 0.5, 3.3), 70, 1.6)
    papa(m, 'papa2', (-2.3, 0.6, 4.1), 15, 1.8)
    papa(m, 'papa3', (0.5, 0.5, 4.4), -15, 2.0)
    papa(m, 'papa4', (3.3, 0.6, 3.9), 40, 1.7)
    papa(m, 'papa5', (5.3, 0.5, 2.9), 110, 1.4, ojo=None)
    return m


def podrida():
    """Desenlace de estres: mata seca tendida sobre el lomo agrietado, papas oscurecidas y hundidas
    con moho, una partida negra por dentro, y moscas. 48 cubos."""
    m = Model('papa_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, -1.6), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.8, 2, -1.2), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('corona', (0, 2, -0.3), (2.0, 0.7, 1.8), 'podrido', yaw=20)
    m.box('corona_moho', (0.2, 2.7, -0.2), (1.2, 0.3, 1.0), 'moho_dark', yaw=40)
    # tallos secos vencidos, casi a ras del lomo
    b = (0, 2.4, -0.3)
    t0 = m.stem('tallo0', b, 3.2, 0.45, 'hoja_seca_dark', tilt=82, yaw=80)
    t1 = m.stem('tallo1', b, 3.0, 0.45, 'hoja_seca_dark', tilt=84, yaw=275)
    t2 = m.stem('tallo2', b, 2.4, 0.45, 'podrido', tilt=80, yaw=185)
    m.stem('tallo3', (0.2, 2.6, -0.2), 1.6, 0.4, 'hoja_seca_dark', tilt=30, yaw=140)   # tocon en pie
    hoja_compuesta(m, 'hoja0', t0, 110, 2.4, 2.0, pares=2, cols=SECA, tilt_r=88)
    hoja_compuesta(m, 'hoja1', t1, 245, 2.4, 2.0, pares=1, cols=AMARILLA, tilt_r=88)
    hoja_compuesta(m, 'hoja2', t2, 160, 2.0, 1.9, pares=1, cols=('podrido', 'hoja_seca_dark', 'hoja_seca'),
                   tilt_r=88)
    # papas podridas: oscuras, hundidas, con manchas de moho
    papa(m, 'papa1', (-4.6, 0.3, 3.3), 75, 1.8, cols=PODRIDA)
    m.box('papa1_moho', mover((-4.6, 0.3, 3.3), 75, -0.3, 1.45), (1.0, 0.3, 1.2), 'moho_light', yaw=70)
    papa(m, 'papa2', (3.4, 0.4, 3.9), 35, 2.0, cols=('papa_tuberculo_dark', 'podrido', 'podrido_dark'))
    m.box('papa2_moho', mover((3.4, 0.4, 3.9), 35, -0.4, 1.7), (1.0, 0.3, 1.1), 'moho', yaw=10)
    papa(m, 'papa3', (5.4, 0.3, 2.6), 110, 1.6, cols=PODRIDA, ojo=None)
    # la partida: dos mitades abiertas, negras por dentro con moho
    for tag, q, y in (('a', (-1.7, 0.5, 4.3), 200), ('b', (0.6, 0.5, 4.5), 160)):
        m.box(f'partida_{tag}', mover(q, y, 0.55), (2.0, 1.3, 1.3), 'podrido', yaw=y)
        m.box(f'partida_{tag}_cima', mover(q, y, 0.6, 0.2), (1.5, 1.4, 1.0), 'podrido', yaw=y)
        m.box(f'partida_{tag}_corte', mover(q, y, -0.15, 0.1), (1.7, 1.15, 0.2), 'black', yaw=y)
    m.box('partida_moho', mover((0.6, 0.5, 4.5), 160, -0.15, 1.25), (1.0, 0.3, 0.6), 'moho_light', yaw=160)
    moscas(m, [(0.0, 5.0, 4.6, 20), (-2.6, 4.0, 3.2, -40)])
    return m


ETAPAS = [('papa_siembra', siembra), ('papa_brote', brote), ('papa_crecimiento', crecimiento),
          ('papa_madurez', madurez), ('papa_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
