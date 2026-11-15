"""Generador del ajonjoli (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/ajonjoli.py

Ajonjoli o sesamo (Sesamum indicum), tipo de tallo unico. Convenciones (docs/07): 1 celda = 16
unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas
comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella
de 16x16. Las alturas son cualitativas, no medidas reales (la planta real mide de 0.5 a 2 m; aqui solo
se respeta que sea mas alta que la haba y la soya y quede por debajo del maiz y el sorgo).

Rasgos que se respetan para no confundirlo con la soya, la haba y el girasol: planta ERGUIDA de un solo
tallo recto, alto y casi sin ramas (cajas sin girar); hojas con peciolo, opuestas en pares cruzados,
las de abajo mas anchas y las de arriba LANCEOLADAS (angostas, de punta larga) y algo colgantes; flores
TUBULARES (campanita alargada) rosa palido con la boca blanca, solas en las axilas de las hojas de
arriba, que se abren de abajo hacia arriba; frutos en CAPSULAS oblongas, de seccion cuadrada y con un
pico corto, PARADAS y pegadas al tallo en fila, una sobre otra (el "candelabro de vainitas"). Las
capsulas maduran de abajo hacia arriba: las de abajo se secan color paja y se abren en la punta
dejando ver la semilla crema; las de arriba siguen verdes. Semilla chiquita, plana, crema. Colores de
la paleta fija (ajonjoli_*, leaf_dark, hoja_seca*, hoja_marchita, wood, podrido*, moho*, black,
white), sin colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- PROSEA (Pl@ntUse), Sesamum indicum: erguida, 0.5-2 m, cultivares sin ramas; hojas de abajo
  opuestas y de arriba angostas; flor acampanada en las axilas de arriba, blanca a rosa violeta;
  capsula oblonga de 4 surcos con pico corto, gris paja al madurar, que se abre y suelta la semilla;
  maduran primero las de la base: https://plantuse.plantnet.org/en/Sesamum_indicum_(PROSEA)
- NParks Flora & Fauna Web, Sesamum indicum (flor tubular blanca o rosa, capsula oblonga):
  https://www.nparks.gov.sg/florafaunaweb/flora/7/2/7200
- Laji.fi, Sesamum indicum (hojas de arriba lanceoladas, las de abajo trilobadas):
  https://laji.fi/en/taxon/MX.41486
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
FRENTE = 35           # direccion de la camara isometrica por defecto (la del juego, desde +x +z)

HOJA = ('ajonjoli_hoja', 'leaf_dark')                 # lamina y punta (la punta va en sombra)
SECA = ('hoja_marchita', 'hoja_seca_dark')
NEGRA = ('podrido', 'podrido_dark')
VERDE = ('ajonjoli_capsula', 'ajonjoli_hoja')         # capsula tierna: cuerpo y pico
PAJA = ('hoja_seca', 'hoja_seca_light')               # capsula seca: cuerpo y valvas abiertas
PODRIDA = ('podrido', 'podrido_dark')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def lamina(m, nombre, p, yaw, largo, ancho, col, caida):
    """Lamina plana que sale de p hacia yaw; caida > 0 baja la punta. Gira alrededor de p (pivot):
    voxelkit ya mueve la caja con el giro. Devuelve la punta."""
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (ancho, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)
    t, y = math.radians(caida), math.radians(yaw)
    h = largo * math.cos(t)
    return (p[0] + h * math.sin(y), p[1] - largo * math.sin(t), p[2] + h * math.cos(y))


def hoja(m, nombre, p, yaw, largo, ancho=1.3, cols=HOJA, caida=18, dobla=22, partes=2):
    """Hoja lanceolada colgante: base mas ancha y punta angosta que se dobla mas hacia abajo.
    partes=1 da una hojita de un solo cubo. Devuelve la punta."""
    if partes == 1:
        return lamina(m, nombre, p, yaw, largo, ancho, cols[0], caida)
    q = lamina(m, nombre, p, yaw, largo * 0.6, ancho, cols[0], caida)
    return lamina(m, nombre + '_punta', q, yaw, largo * 0.45, ancho * 0.55, cols[1], caida + dobla)


def par(m, nombre, y, yaw, largo, ancho=1.3, cols=HOJA, caida=18, partes=2, r=0.45):
    """Par de hojas opuestas en el nudo y (sale del borde del tallo). 2 o 4 cubos."""
    for k, a in enumerate((yaw, yaw + 180)):
        hoja(m, f'{nombre}_{k}', mover((0, y, 0), a, r), a, largo, ancho, cols, caida, partes=partes)


def flor(m, nombre, y, yaw, tilt=105, r=0.5):
    """Flor tubular en la axila: tubo rosa palido que sale hacia afuera y abajo, con la boca blanca
    abierta en campanita. 2 cubos."""
    q = m.stem(nombre, mover((0, y, 0), yaw, r), 2.0, 0.75, 'ajonjoli_flor', tilt=tilt, yaw=yaw)
    m.box(nombre + '_boca', q, (1.15, 0.5, 1.15), 'white', tilt=tilt, yaw=yaw)


def capsula(m, nombre, y, yaw, alto=2.4, cols=VERDE, abierta=False, inclina=8, r=1.1, eje=(0, 0)):
    """Capsula oblonga de seccion cuadrada, parada y pegada al tallo (r = distancia al eje), con pico.
    Verde: 2 cubos. Abierta (seca): cuerpo paja, 2 valvas que se abren en la punta y la semilla crema
    que asoma entre ellas, 4 cubos. Devuelve la punta del cuerpo."""
    b = mover((eje[0], y, eje[1]), yaw, r)
    q = m.stem(nombre, b, alto, 0.9, cols[0], tilt=inclina, yaw=yaw)
    if not abierta:
        m.box(nombre + '_pico', q, (0.45, 0.6, 0.45), cols[1], tilt=inclina, yaw=yaw)
        return q
    for k, sg in enumerate((1, -1)):
        m.box(f'{nombre}_valva{k}', mover(q, yaw + 90, 0.3 * sg), (0.4, 1.0, 0.9), cols[1],
              tilt=32, yaw=yaw + 90 * sg)
    m.box(nombre + '_semilla', q, (0.6, 0.7, 0.6), 'ajonjoli_semilla', tilt=inclina, yaw=yaw)
    return q


def tallo(m, segs, grueso, cols=('leaf_dark', 'ajonjoli_hoja', 'ajonjoli_hoja')):
    """Tallo unico, recto y vertical (cajas sin girar), por segmentos que adelgazan. Devuelve la punta."""
    x, y, z = BASE
    for i, h in enumerate(segs):
        g = grueso * (1 - 0.12 * i)
        m.box(f'tallo{i}', (x, y, z), (g, h, g), cols[min(i, len(cols) - 1)])
        y += h
    return (x, y, z)


def yema(m, nombre, c):
    """Punta del tallo: dos hojitas nuevas cerradas hacia arriba. 2 cubos."""
    m.box(nombre + '_a', c, (0.6, 1.4, 0.4), 'ajonjoli_hoja', tilt=-14, yaw=FRENTE + 90)
    m.box(nombre + '_b', c, (0.5, 1.1, 0.4), 'leaf_dark', tilt=16, yaw=FRENTE + 120)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con un chorrillo oscuro y muchas semillitas crema regadas a lo largo. 12 cubos."""
    m = Model('ajonjoli_siembra', PAL)
    monticulo(m)
    # el ajonjoli se siembra a chorrillo: una linea humeda a lo largo del lomo
    m.box('chorrillo', (0, 2, 0), (8.0, 0.3, 2.0), 'suelo_humedo')
    semillas = [(-3.2, 0.3, 20), (-2.1, -0.4, -35), (-1.0, 0.5, 60), (0.0, -0.2, 10),
                (0.9, 0.4, -50), (1.9, -0.5, 35), (2.9, 0.2, -15), (-0.4, 1.4, 80)]
    for k, (x, z, yaw) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), (0.6, 0.3, 0.9), 'ajonjoli_semilla', yaw=yaw)
    m.box('terron', (3.9, 2, -1.6), (1.3, 0.7, 1.1), 'soil_dark', yaw=-20)
    return m


def brote():
    """Plantula: tallito recto, 2 cotiledones redondos y encima 2 hojitas lanceoladas opuestas, los
    dos pares cruzados y en diagonal a la camara para que se lean. 9 cubos."""
    m = Model('ajonjoli_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.2), 'suelo_humedo')
    m.box('tallo0', BASE, (0.5, 3.6, 0.5), 'ajonjoli_hoja')
    # cotiledones: chicos y redondos, casi horizontales
    for k, a in enumerate((FRENTE + 45, FRENTE + 225)):
        lamina(m, f'cotiledon{k}', mover((0, 4.0, 0), a, 0.2), a, 1.5, 1.3, 'leaf_dark', 8)
    # primer par de hojas verdaderas, angostas y largas, cruzadas con los cotiledones
    for k, a in enumerate((FRENTE - 45, FRENTE + 135)):
        lamina(m, f'hojita{k}', mover((0, 5.2, 0), a, 0.2), a, 2.6, 0.9, 'ajonjoli_hoja', -12)
    m.box('yema', (0, 5.6, 0), (0.45, 0.8, 0.35), 'ajonjoli_hoja', yaw=FRENTE)
    return m


def crecimiento():
    """Tallo unico recto con 3 pares de hojas opuestas (abajo anchas, arriba lanceoladas) y 4 flores
    tubulares rosas en las axilas de arriba. 27 cubos."""
    m = Model('ajonjoli_crecimiento', PAL)
    monticulo(m)
    top = tallo(m, [6.0, 5.0, 4.0], 1.0)
    par(m, 'hoja0', 5.0, FRENTE + 90, 4.6, ancho=1.9, caida=14)
    par(m, 'hoja1', 9.0, FRENTE + 150, 4.0, ancho=1.4, caida=18)
    par(m, 'hoja2', 12.6, FRENTE + 60, 3.4, ancho=1.0, caida=10)
    # flores de abajo hacia arriba en las axilas, del lado de la camara
    flor(m, 'flor0', 9.4, FRENTE + 25)
    flor(m, 'flor1', 10.6, FRENTE - 55)
    flor(m, 'flor2', 12.0, FRENTE + 100, tilt=112)
    flor(m, 'flor3', 13.6, FRENTE - 15, tilt=100)
    yema(m, 'yema', top)
    return m


def madurez():
    """Tallo alto y recto cargado de capsulas paradas en fila a los dos lados: abajo secas color paja y
    abiertas en la punta con la semilla crema, arriba verdes; hojas de abajo caidas, hojas lanceoladas
    arriba y 2 flores en la punta. 60 cubos."""
    m = Model('ajonjoli_madurez', PAL)
    monticulo(m)
    top = tallo(m, [8.0, 8.0, 7.0], 1.2)
    # hojas de abajo ya secas y colgando; una ya cayo al lomo
    hoja(m, 'seca0', mover((0, 5.4, 0), FRENTE + 160, 0.5), FRENTE + 160, 3.0, 1.3, SECA, caida=42, partes=1)
    hoja(m, 'seca1', mover((0, 5.0, 0), FRENTE + 75, 0.5), FRENTE + 75, 2.6, 1.2,
         ('hoja_seca', 'hoja_seca_dark'), caida=52, partes=1)
    m.box('caida0', (3.6, 2, 2.4), (1.1, 0.3, 2.6), 'hoja_seca', yaw=30)
    # candelabro: capsulas paradas en fila a los dos lados del tallo, una sobre otra, nudo por nudo;
    # maduran de abajo hacia arriba
    nudos = [(6.6, PAJA, True), (9.6, PAJA, True), (12.6, VERDE, False), (15.6, VERDE, False),
             (18.6, VERDE, False)]
    for i, (y, cols, abierta) in enumerate(nudos):
        for k, a in enumerate((FRENTE + 90, FRENTE - 90)):
            capsula(m, f'capsula{i}{k}', y, a + (12 if i % 2 else -12), cols=cols, abierta=abierta)
    # tercera fila, hacia la camara, a media altura entre nudos: la de abajo seca, las otras verdes
    capsula(m, 'capsula_frente0', 8.1, FRENTE, cols=PAJA, abierta=True)
    capsula(m, 'capsula_frente1', 11.1, FRENTE, cols=PAJA, abierta=True)
    capsula(m, 'capsula_frente2', 14.1, FRENTE)
    # una hoja amarilla a media altura (hacia atras) y hojas lanceoladas verdes arriba, colgantes
    hoja(m, 'marchita0', mover((0, 13.0, 0), FRENTE + 180, 0.6), FRENTE + 180, 3.4, 1.2,
         ('hoja_marchita', 'hoja_seca'), caida=34)
    par(m, 'hoja1', 21.0, FRENTE + 135, 3.8, ancho=1.1, caida=26, r=0.5)
    par(m, 'hoja2', 23.2, FRENTE + 45, 2.8, ancho=0.9, caida=14, partes=1, r=0.45)
    # ultimas flores tubulares en la punta
    flor(m, 'flor0', 21.6, FRENTE + 5)
    flor(m, 'flor1', 22.8, FRENTE - 70, tilt=100)
    yema(m, 'yema', top)
    return m


def podrida():
    """Desenlace de estres: tallo oscuro vencido y doblado, capsulas podridas con moho en fila, hojas
    negras colgando, capsulas y semilla negra en el lomo seco y 2 moscas. 42 cubos."""
    m = Model('ajonjoli_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.6, 2, 1.6), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.8, 2, -1.0), (0.5, 0.2, 3.2), 'suelo_grieta', yaw=-15)
    lado = 100     # hacia donde se vence (+x, de lado a la camara), sin salir de la huella
    t0 = 24
    q = m.stem('tallo0', BASE, 9.0, 0.9, 'hoja_seca_dark', tilt=t0, yaw=lado)
    m.box('nudo', q, (1.1, 0.8, 1.1), 'podrido_dark', tilt=t0, yaw=lado)
    r = m.stem('tallo1', q, 3.8, 0.8, 'podrido', tilt=128, yaw=lado)
    m.box('punta_negra', r, (0.7, 1.0, 0.7), 'podrido_dark', tilt=150, yaw=lado)
    m.box('moho_base', BASE, (1.5, 0.9, 1.5), 'moho_dark')
    # capsulas podridas aun pegadas en fila al tallo ladeado, alternando lado, con moho en la punta
    for i, (d, sg, extra) in enumerate([(1.8, 1, 0), (3.4, -1, 10), (5.0, 1, -6), (6.6, -1, 14)]):
        b = mover(punta(BASE, d, t0, lado), lado + 90 * sg, 0.95)
        qq = m.stem(f'capsula{i}', b, 2.2, 0.85, PODRIDA[i % 2], tilt=t0 + extra, yaw=lado)
        m.box(f'capsula{i}_moho', qq, (1.0, 0.45, 1.0), 'moho_light' if i % 2 else 'moho',
              tilt=t0 + extra, yaw=lado)
    # en el tramo que cuelga: una capsula seca, abierta y vacia, y otra podrida
    for k, (d, sg, col) in enumerate([(1.2, -1, 'hoja_seca_dark'), (2.6, 1, 'podrido_dark')]):
        b = mover(punta(q, d, 128, lado), lado + 90 * sg, 0.8)
        qq = m.stem(f'colgada{k}', b, 2.0, 0.8, col, tilt=170, yaw=lado)
        m.box(f'colgada{k}_punta', qq, (0.9, 0.4, 0.9), 'moho_dark' if k else 'hoja_seca', tilt=170, yaw=lado)
    # hojas negras y marchitas colgando del tallo
    hoja(m, 'hoja0', mover(punta(BASE, 2.6, t0, lado), FRENTE - 60, 0.4), FRENTE - 60, 3.0, 1.2, NEGRA, caida=62)
    hoja(m, 'hoja1', mover(punta(BASE, 4.2, t0, lado), FRENTE + 170, 0.4), FRENTE + 170, 2.8, 1.1,
         ('hoja_marchita', 'hoja_seca_dark'), caida=58)
    hoja(m, 'hoja2', mover(punta(BASE, 7.6, t0, lado), FRENTE + 10, 0.4), FRENTE + 10, 2.8, 1.1, NEGRA, caida=64)
    # capsulas que ya cayeron al lomo, con moho, y semilla regada y ennegrecida
    suelo = [((-3.4, 2, 2.0), 70, 'podrido', 'moho'), ((-4.4, 2, -1.6), -25, 'hoja_seca_dark', 'moho_light'),
             ((-1.6, 2, 3.4), 20, 'podrido_dark', 'moho_dark')]
    for k, (c, yaw, col, moho) in enumerate(suelo):
        m.box(f'suelo_capsula{k}', c, (0.9, 0.8, 2.2), col, yaw=yaw)
        m.box(f'suelo_capsula{k}_moho', mover(c, yaw, 0.4, 0.8), (0.75, 0.3, 1.0), moho, yaw=yaw + 10)
    for k, (x, z) in enumerate([(-0.4, 3.9), (0.5, 3.3), (-0.9, 4.5)]):
        m.box(f'semilla{k}', (x, 2, z), (0.6, 0.3, 0.8), 'hoja_seca_dark', yaw=30 * k)
    # hojas negras caidas
    m.box('hoja_suelo0', (-5.6, 1, 3.6), (1.1, 0.3, 2.4), 'podrido_dark', yaw=-60)
    m.box('hoja_suelo1', (4.2, 2, -2.2), (1.0, 0.3, 2.2), 'hoja_seca_dark', yaw=15)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.2, 6.4, 2.6, 20), (-2.6, 9.0, -1.0, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('ajonjoli_siembra', siembra), ('ajonjoli_brote', brote), ('ajonjoli_crecimiento', crecimiento),
          ('ajonjoli_madurez', madurez), ('ajonjoli_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
