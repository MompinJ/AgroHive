"""Generador del chile (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/chile.py

Chile verde (Capsicum annuum, tipo serrano / jalapeno), cultivo extra de la demo. Convenciones
(docs/07): 1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba,
+Z frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo
(0, 2, 0), y caben en una huella de 16x16. Las alturas son cualitativas, no medidas reales.

Rasgos que se respetan: planta erguida de porte medio con ramificacion en horquilla (dicotomica),
hojas ovaladas-lanceoladas de verde oscuro brillante con punta afilada, flores blancas chicas en
estrella y frutos conicos alargados que cuelgan (mayoria verdes, algunos rojos en madurez).
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
PLANO = 125           # plano de la primera horquilla, de lado a la camara para que se lea

HOJA = ('chile_hoja', 'chile_hoja_light')
HOJA_BAJA = ('chile_hoja_dark', 'chile_hoja')
FRENTE = 35          # direccion de la camara isometrica por defecto: ahi cuelgan los frutos
VERDE = ('chile_verde_dark', 'chile_verde', 'chile_verde_dark')     # caliz, cuerpo, punta
ROJO = ('chile_verde_dark', 'red', 'chile_rojo_dark')
NEGRO = ('hoja_seca_dark', 'frijol_negro', 'podrido_dark')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def hoja(m, nombre, p, yaw, largo, ancho=1.5, cols=HOJA, caida=15):
    """Hoja lanceolada que sale de p hacia yaw: lamina ancha y punta angosta afilada. 2 cubos.

    Ambas cajas giran sobre p, asi la hoja cuelga en un solo plano (caida > 0 baja la punta)."""
    m.box(nombre, (p[0], p[1], p[2] + largo * 0.32), (ancho, 0.3, largo * 0.64), cols[0],
          tilt=caida, yaw=yaw, pivot=p)
    m.box(nombre + '_punta', (p[0], p[1] + 0.02, p[2] + largo * 0.78), (ancho * 0.48, 0.3, largo * 0.44),
          cols[1], tilt=caida + 6, yaw=yaw, pivot=p)


def chile(m, nombre, base, yaw, largo=3.4, cols=VERDE, tilt=170, sale=0.7):
    """Fruto conico colgante: caliz verde, cuerpo largo y punta angosta curva. 3 cubos.

    Cuelga de base, desplazado sale unidades hacia yaw para que no lo tape la rama."""
    c = mover(base, yaw, sale, -0.5)
    m.box(nombre + '_caliz', c, (1.2, 0.5, 1.2), cols[0], yaw=yaw)
    m.box(nombre, c, (1.0, largo * 0.62, 1.0), cols[1], tilt=tilt, yaw=yaw)
    t = punta(c, largo * 0.62, tilt, yaw)
    m.box(nombre + '_punta', t, (0.55, largo * 0.4, 0.55), cols[2], tilt=tilt - 25, yaw=yaw)
    return t


def flor(m, nombre, c, yaw=0):
    """Flor blanca en estrella: dos cuadros cruzados a 45 grados y centro amarillo. 3 cubos."""
    m.box(nombre, c, (1.1, 0.25, 1.1), 'white', yaw=yaw)
    m.box(nombre + '_b', (c[0], c[1] + 0.02, c[2]), (1.1, 0.25, 1.1), 'white', yaw=yaw + 45)
    m.box(nombre + '_centro', (c[0], c[1] + 0.25, c[2]), (0.4, 0.25, 0.4), 'grano_light', yaw=yaw)


def horquilla(m, nombre, base, yaw, largo, tilt, abre, grueso, col):
    """Rama que se parte en dos: devuelve las dos puntas de la Y (yaw - abre, yaw + abre)."""
    return [m.stem(f'{nombre}{k}', base, largo, grueso, col, tilt=tilt, yaw=yaw + s * abre)
            for k, s in enumerate((-1, 1))]


# ---------------- etapas ----------------
def siembra():
    """Lomo recien sembrado: hoyo con cuatro semillas planas amarillo palido y terrones. 9 cubos."""
    m = Model('chile_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.0, 0.3, 3.0), 'suelo_humedo')
    semillas = [((-0.9, 0.4), 20, 'chile_semilla'), ((0.9, -0.5), -35, 'hoja_seca_light'),
                ((0.4, 0.9), 65, 'chile_semilla'), ((-0.4, -0.7), 10, 'calabaza_crema')]
    for k, ((x, z), yaw, col) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), (0.9, 0.25, 1.1), col, yaw=yaw)
    m.box('terron1', (3.6, 2, 1.4), (1.6, 1.0, 1.4), 'soil_dark', yaw=30)
    m.box('terron2', (-3.8, 2, -1.2), (1.3, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito fino, 2 cotiledones angostos y alargados, primer par de hojas asomando. 8 cubos."""
    m = Model('chile_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.4), 'suelo_humedo')
    m.box('tallito', BASE, (0.5, 3.6, 0.5), 'maiz_tallo_light')
    top = (0, 5.6, 0)
    for k, s in enumerate((1, -1)):
        yaw = PLANO + (0 if s > 0 else 180)
        m.box(f'cotiledon{k}', (top[0], top[1], top[2] + 1.4), (0.9, 0.25, 2.8),
              ('chile_hoja', 'chile_hoja_dark')[k], tilt=-18, yaw=yaw, pivot=top)
    m.box('hojitas', (0, 5.8, 0), (0.6, 0.9, 1.0), 'chile_hoja_light', yaw=PLANO + 90)
    m.box('cascara', (1.6, 2, 0.9), (0.9, 0.25, 1.0), 'chile_semilla', yaw=25)
    return m


def crecimiento():
    """Planta vegetativa: tallo central que ya se bifurca en Y y hojas lanceoladas alternas. 23 cubos."""
    m = Model('chile_crecimiento', PAL)
    monticulo(m)
    fork = m.stem('tallo', BASE, 4.2, 0.8, 'maiz_tallo_dark', tilt=0, yaw=0)
    # hojas alternas en el tallo central, bajas y algo mas oscuras
    hoja(m, 'hoja0', (0, 3.4, 0), FRENTE + 60, 3.4, 1.4, HOJA_BAJA, caida=22)
    hoja(m, 'hoja1', (0, 4.8, 0), FRENTE + 200, 3.6, 1.5, HOJA_BAJA, caida=16)
    # primera horquilla
    ramas = horquilla(m, 'rama', fork, PLANO + 90, 3.2, 28, 90, 0.6, 'maiz_tallo')
    for k, r in enumerate(ramas):
        yaw = PLANO + 180 * k
        hoja(m, f'hoja{k + 2}', r, yaw + 40, 3.8, 1.7, caida=6)
        hoja(m, f'hoja{k + 4}', r, yaw - 45, 3.4, 1.5, caida=10)
        hoja(m, f'hoja{k + 6}', mover(r, yaw, 0.0, -1.2), FRENTE + 180 * k - 20, 3.0, 1.4, HOJA_BAJA, caida=20)
        m.box(f'yema{k}', r, (0.6, 1.0, 0.6), 'chile_hoja_light', tilt=15, yaw=yaw)
    return m


def madurez():
    """Arbusto frondoso en doble horquilla: 13 hojas, 6 chiles colgando (4 verdes, 2 rojos) y 2 flores. 59 cubos."""
    m = Model('chile_madurez', PAL)
    monticulo(m)
    fork = m.stem('tallo', BASE, 3.6, 1.0, 'maiz_tallo_dark', tilt=0, yaw=0)
    # primera horquilla y luego otra Y en cada rama (ramificacion dicotomica)
    ramas = [m.stem(f'rama{k}', fork, 3.6, 0.8, 'maiz_tallo', tilt=26, yaw=PLANO + 180 * k) for k in range(2)]
    puntas = []
    for k, r in enumerate(ramas):
        puntas += horquilla(m, f'ramita{k}_', r, PLANO + 180 * k, 3.4, 24, 75, 0.55, 'maiz_tallo')
    # copa: dos hojas grandes por punta, abiertas hacia afuera
    yaws = [PLANO - 75, PLANO + 75, PLANO + 105, PLANO + 255]
    for k, (p, yaw) in enumerate(zip(puntas, yaws)):
        hoja(m, f'hoja{2 * k}', p, yaw - 25, 4.0, 1.8, caida=2)
        hoja(m, f'hoja{2 * k + 1}', p, yaw + 50, 3.6, 1.6, HOJA if k % 2 else HOJA_BAJA, caida=12)
    # relleno: hojas al frente y atras en la segunda horquilla, y dos bajas en el tallo
    hoja(m, 'hoja8', ramas[0], FRENTE + 40, 3.4, 1.6, HOJA_BAJA, caida=18)
    hoja(m, 'hoja9', ramas[1], FRENTE + 180, 3.6, 1.6, HOJA_BAJA, caida=10)
    hoja(m, 'hoja10', (0, 4.0, 0), FRENTE + 200, 3.2, 1.4, HOJA_BAJA, caida=22)
    hoja(m, 'hoja11', (0, 4.6, 0), PLANO + 180, 3.0, 1.3, HOJA_BAJA, caida=26)
    hoja(m, 'hoja12', fork, FRENTE + 180, 2.4, 1.2, HOJA, caida=-30)
    # chiles colgando de las horquillas hacia la camara (mayoria verdes, 2 rojos)
    medio = [punta(fork, 2.0, 26, PLANO + 180 * k) for k in range(2)]
    specs = [(ramas[0], FRENTE + 20, 3.6, VERDE), (ramas[1], FRENTE - 30, 3.6, ROJO),
             (medio[0], FRENTE + 55, 3.2, VERDE), (medio[1], FRENTE - 50, 3.4, VERDE),
             (fork, FRENTE - 10, 3.0, ROJO), (ramas[0], FRENTE + 170, 3.4, VERDE)]
    for k, (b, yaw, L, cols) in enumerate(specs):
        chile(m, f'chile{k}', b, yaw, L, cols)
    # flores blancas en estrella sobre la copa
    flor(m, 'flor0', mover(puntas[0], FRENTE, 0.6, 0.3), 10)
    flor(m, 'flor1', mover(puntas[3], FRENTE, 0.6, 0.3), 30)
    return m


def podrida():
    """Desenlace de estres: tallo doblado, hojas cafes colgando y caidas, chiles negros con moho y moscas. 40 cubos."""
    m = Model('chile_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    # tallo ladeado que se dobla en la horquilla; una rama cuelga hasta casi el suelo
    lado = PLANO - 20
    p0 = m.stem('tallo', BASE, 4.0, 0.9, 'hoja_seca_dark', tilt=16, yaw=lado)
    m.box('moho_base', BASE, (1.3, 1.0, 1.3), 'moho_dark', tilt=16, yaw=lado)
    m.box('quiebre', p0, (1.2, 0.7, 1.2), 'podrido_dark', tilt=16, yaw=lado)
    r0 = m.stem('rama0', p0, 2.6, 0.7, 'hoja_seca', tilt=80, yaw=lado)
    r0b = m.stem('rama0_cae', r0, 2.6, 0.55, 'hoja_seca_dark', tilt=155, yaw=lado)
    r1 = m.stem('rama1', p0, 2.6, 0.7, 'hoja_seca_dark', tilt=72, yaw=lado + 170)
    # hojas cafes colgando, enrolladas (casi verticales)
    secas = [(r0, lado + 70, ('hoja_seca', 'hoja_seca_dark'), 75), (r0b, lado - 40, ('hoja_marchita', 'hoja_seca'), 80),
             (r1, lado + 200, ('hoja_seca_dark', 'podrido'), 70), (r1, lado + 120, ('hoja_seca', 'hoja_marchita'), 85),
             (mover(p0, 0, 0, -1.6), FRENTE + 40, ('podrido', 'hoja_seca_dark'), 65)]
    for k, (b, yaw, cols, c) in enumerate(secas):
        hoja(m, f'hoja{k}', b, yaw, 2.8, 1.2, cols, caida=c)
    # hojas caidas en el lomo y en el suelo
    caidas = [((3.2, 2, -1.6), 'hoja_seca', 20), ((-3.4, 2, 1.8), 'hoja_seca_dark', -35),
              ((-5.6, 1, -3.6), 'hoja_seca_light', 60), ((5.6, 1, 3.8), 'hoja_marchita', 10),
              ((5.4, 1, -3.6), 'podrido', -50)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'hoja_suelo{k}', c, (1.1, 0.3, 2.6), col, yaw=yaw)
    # chiles negros y arrugados colgando, uno con moho
    chile(m, 'chile0', punta(p0, 1.4, 80, lado), FRENTE, 2.8, NEGRO, tilt=175, sale=0.5)
    m.box('chile0_moho', mover(punta(p0, 1.4, 80, lado), FRENTE, 0.5, -1.4), (1.3, 0.7, 1.3), 'moho_light',
          yaw=FRENTE + 20)
    t1 = chile(m, 'chile1', r1, FRENTE - 20, 2.4, ('hoja_seca_dark', 'podrido_dark', 'chile_rojo_dark'), tilt=165)
    m.box('chile1_moho', (t1[0], t1[1] - 0.2, t1[2]), (0.8, 0.5, 0.8), 'moho', yaw=FRENTE)
    # chile caido sobre el lomo, tumbado y con moho
    eje = 70
    c = (-2.0, 2, 2.2)
    m.box('chile_suelo', c, (1.0, 0.9, 2.8), 'frijol_negro', yaw=eje)
    m.box('chile_suelo_punta', mover(c, eje, 1.9), (0.5, 0.5, 1.2), 'podrido_dark', yaw=eje + 15)
    m.box('chile_suelo_moho', mover(c, eje, -0.6, 0.9), (1.2, 0.4, 1.4), 'moho', yaw=eje + 20)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.6, 6.4, 3.0, 20), (-3.8, 5.0, 0.8, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('chile_siembra', siembra), ('chile_brote', brote), ('chile_crecimiento', crecimiento),
          ('chile_madurez', madurez), ('chile_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
