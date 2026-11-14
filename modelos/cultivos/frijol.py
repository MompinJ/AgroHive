"""Generador del frijol (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/frijol.py

Frijol negro de milpa (Phaseolus vulgaris), de mata o guia corta. Convenciones (docs/07):
1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente.
Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo
(0, 2, 0), y caben en una huella de 16x16. Las alturas son cualitativas, no medidas reales.

Rasgos que se respetan: hoja trifoliada (3 foliolos romboidales, el terminal mas adelante),
tallo en zigzag con nudos, verde mas claro y amarillento que el maiz, vainas verde-amarillas
colgando en racimos y flores blancas/lilas chicas.
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
PLANO = 125           # plano del zigzag, de lado a la camara isometrica para que se lea

HOJA = ('frijol_hoja_dark', 'frijol_hoja', 'frijol_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def foliolo(m, nombre, c, yaw, s, col, tilt=0):
    """Foliolo plano: un cuadrado girado 45 grados se lee como rombo desde arriba."""
    m.box(nombre, c, (s, 0.35, s), col, tilt=tilt, yaw=yaw + 45)


def trifoliada(m, nombre, base, yaw, largo, s, cols=HOJA, tilt_pec=60, caida=0.0):
    """Hoja trifoliada: peciolo inclinado y 3 foliolos (terminal adelante, 2 laterales). 4 cubos."""
    p = m.stem(nombre + '_pec', base, largo, 0.4, cols[0], tilt=tilt_pec, yaw=yaw)
    foliolo(m, nombre + '_t', mover(p, yaw, s * 0.62, -0.25 - caida), yaw, s, cols[2], tilt=8 + caida * 55)
    foliolo(m, nombre + '_l', mover(mover(p, yaw + 90, s * 0.55), yaw, -0.1, -0.15 - caida * 0.5),
            yaw + 25, s * 0.82, cols[1], tilt=6 + caida * 45)
    foliolo(m, nombre + '_r', mover(mover(p, yaw - 90, s * 0.55), yaw, -0.1, -0.15 - caida * 0.5),
            yaw - 25, s * 0.82, cols[1], tilt=6 + caida * 45)
    return p


def tallo_zigzag(m, segs, grueso, cols=('frijol_hoja_dark', 'frijol_hoja_dark'), base=BASE):
    """Tallo de frijol: segmentos que cambian de lado en cada nudo. Devuelve los nudos."""
    p = base
    nudos = []
    for i, (largo, tilt, yaw) in enumerate(segs):
        p = m.stem(f'tallo{i}', p, largo, grueso, cols[i % 2], tilt=tilt, yaw=yaw)
        nudos.append(p)
    return nudos


def vaina(m, nombre, base, yaw, largo=3.2, cols=('vaina', 'vaina_light'), tilt=165):
    """Vaina colgante: cuerpo largo y piquito curvo al final. 2 cubos."""
    m.box(nombre, base, (0.6, largo, 0.9), cols[0], tilt=tilt, yaw=yaw)
    q = punta(base, largo, tilt, yaw)
    m.box(nombre + '_pico', q, (0.35, 0.8, 0.5), cols[1], tilt=tilt - 50, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo recien sembrado: hoyo con tres frijoles negros (uno con su hilo blanco) y terrones. 9 cubos."""
    m = Model('frijol_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.4, 0.3, 3.2), 'suelo_humedo')
    m.box('semilla1', (-1.1, 2.3, 0.4), (1.6, 0.9, 1.0), 'frijol_negro', yaw=20)
    m.box('semilla1_hilo', (-1.1, 3.2, 0.4), (0.7, 0.15, 0.3), 'white', yaw=20)
    m.box('semilla2', (1.1, 2.3, -0.4), (1.5, 0.9, 1.0), 'frijol_negro', yaw=-40)
    m.box('semilla3', (0.4, 2.3, 1.0), (1.4, 0.8, 0.9), 'podrido_dark', yaw=75)
    m.box('terron1', (3.6, 2, 1.4), (1.6, 1.0, 1.4), 'soil_dark', yaw=30)
    m.box('terron2', (-3.8, 2, -1.2), (1.3, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula epigea: tallito, 2 cotiledones carnosos y el primer par de hojas simples. 10 cubos."""
    m = Model('frijol_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.4), 'suelo_humedo')
    m.box('tallito', BASE, (0.7, 3.6, 0.7), 'frijol_hoja')
    eje = 45      # el par de cotiledones y el de hojas van cruzados
    for k, s in enumerate((1, -1)):
        c = mover((0, 3.6, 0), eje + (0 if s > 0 else 180), 0.9)
        m.box(f'cotiledon{k}', c, (1.4, 0.9, 1.9), 'vaina_light' if k == 0 else 'vaina', yaw=eje)
    top = (0, 5.6, 0)
    for k, s in enumerate((1, -1)):
        yaw = eje + 90 + (0 if s > 0 else 180)
        p = m.stem(f'peciolo{k}', top, 1.2, 0.3, 'frijol_hoja_dark', tilt=65, yaw=yaw)
        foliolo(m, f'hoja{k}', mover(p, yaw, 1.0, -0.2), yaw, 2.2, ('frijol_hoja', 'frijol_hoja_light')[k], tilt=10)
    return m


def crecimiento():
    """Mata vegetativa: tallo en zigzag, hojas primarias, 3 trifoliadas alternas y guia corta. 26 cubos."""
    m = Model('frijol_crecimiento', PAL)
    monticulo(m)
    nudos = tallo_zigzag(m, [(2.4, 8, PLANO), (2.4, 12, PLANO + 180), (2.0, 12, PLANO)], 0.8)
    # cotiledones ya arrugados en el primer nudo
    m.box('cotiledon0', (0.5, 3.4, 0.3), (1.0, 0.6, 1.2), 'hoja_marchita', yaw=40)
    m.box('cotiledon1', (-0.5, 3.4, -0.3), (0.9, 0.5, 1.1), 'vaina_dark', yaw=40)
    # hojas primarias (simples y opuestas) en el primer nudo
    for k, yaw in enumerate((130, 310)):
        p = m.stem(f'primaria{k}_pec', nudos[0], 1.8, 0.35, 'frijol_hoja_dark', tilt=70, yaw=yaw)
        foliolo(m, f'primaria{k}', mover(p, yaw, 1.2, -0.2), yaw, 2.4, 'frijol_hoja_dark', tilt=12)
    # trifoliadas alternas
    specs = [(nudos[1], 30, 3.0, 2.6, 58), (nudos[1], 220, 2.6, 2.4, 52), (nudos[2], 100, 2.4, 2.4, 40)]
    for k, (b, yaw, L, s, t) in enumerate(specs):
        trifoliada(m, f'trifoliada{k}', b, yaw, L, s, tilt_pec=t)
    # guia corta que empieza a enredarse
    g = m.stem('guia0', nudos[2], 2.2, 0.35, 'frijol_hoja', tilt=25, yaw=280)
    g = m.stem('guia1', g, 1.6, 0.3, 'frijol_hoja_light', tilt=70, yaw=200)
    m.box('guia_punta', g, (0.5, 0.5, 0.5), 'frijol_hoja_light')
    return m


def madurez():
    """Mata frondosa en domo: 7 trifoliadas, racimos de vainas verde-amarillas colgando y flores. 60 cubos."""
    m = Model('frijol_madurez', PAL)
    monticulo(m)
    nudos = tallo_zigzag(m, [(3.0, 8, PLANO), (2.8, 12, PLANO + 180), (2.4, 10, PLANO)], 0.9)
    # hojas primarias ya amarillas en la base
    m.box('primaria0', mover(BASE, 260, 1.8, 1.0), (2.2, 0.35, 2.2), 'hoja_marchita', tilt=14, yaw=305)
    # cuatro ramas abiertas: el domo de la mata
    ramas = [(nudos[0], 35, 3.4, 58), (nudos[0], 215, 3.4, 58), (nudos[1], 125, 2.8, 52), (nudos[1], 305, 2.8, 52)]
    puntas = []
    for k, (b, yaw, L, t) in enumerate(ramas):
        puntas.append(m.stem(f'rama{k}', b, L, 0.55, 'frijol_hoja_dark', tilt=t, yaw=yaw))
        trifoliada(m, f'trifoliada{k}', puntas[-1], yaw, 1.4, 2.6, tilt_pec=72)
    # copa: tres trifoliadas altas
    for k, (yaw, t, s) in enumerate([(80, 40, 2.4), (260, 42, 2.4), (170, 25, 2.2)]):
        trifoliada(m, f'trifoliada{k + 4}', nudos[2], yaw, 2.0, s, tilt_pec=t)
    # racimos de vainas colgando bajo cada rama, hacia afuera para que se vean
    for k, (b, yaw, L, t) in enumerate(ramas):
        r = punta(b, L * 0.75, t, yaw)
        vaina(m, f'vaina{k}_0', r, yaw + 20, 3.0, ('vaina', 'vaina_light'), tilt=172)
        vaina(m, f'vaina{k}_1', mover(r, yaw + 90, 0.5), yaw + 110, 2.6, ('vaina_dark', 'vaina'), tilt=155)
    # racimos florales: pedunculos que asoman sobre el domo con flores lilas y blancas
    for k, (yaw, cols) in enumerate([(20, ('flor_lila', 'white')), (200, ('white', 'flor_lila'))]):
        f = m.stem(f'pedunculo{k}', nudos[2], 2.4, 0.3, 'frijol_hoja', tilt=22, yaw=yaw)
        m.box(f'flor{k}_a', f, (1.0, 0.8, 1.0), cols[0], yaw=yaw)
        m.box(f'flor{k}_b', mover(f, yaw + 100, 0.6, -0.7), (0.8, 0.7, 0.8), cols[1], yaw=yaw + 30)
    return m


def podrida():
    """Desenlace de estres: mata amarillenta y doblada, hojas caidas, vainas negras con moho y moscas. 41 cubos."""
    m = Model('frijol_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    # tallo: base que se ladea, quiebre y punta colgando
    lado = 120
    p0 = m.stem('tallo0', BASE, 3.6, 0.9, 'hoja_seca_dark', tilt=8, yaw=lado)
    m.box('moho_base', BASE, (1.4, 1.0, 1.4), 'moho_dark', tilt=8, yaw=lado)
    p1 = m.stem('tallo1', p0, 3.0, 0.8, 'hoja_seca', tilt=22, yaw=lado)
    m.box('quiebre', p1, (1.1, 0.7, 1.1), 'podrido_dark', tilt=22, yaw=lado)
    p2 = m.stem('tallo2', p1, 3.0, 0.7, 'hoja_seca_dark', tilt=125, yaw=lado)
    rama = m.stem('rama', p0, 2.6, 0.6, 'hoja_seca_dark', tilt=95, yaw=lado + 150)
    # trifoliadas marchitas, con los foliolos caidos
    trifoliada(m, 'trifoliada0', p0, lado - 100, 2.2, 2.3, cols=('hoja_seca_dark', 'hoja_marchita', 'hoja_marchita'),
               tilt_pec=100, caida=0.8)
    trifoliada(m, 'trifoliada1', p1, lado + 70, 2.0, 2.2, cols=('hoja_seca_dark', 'hoja_seca', 'hoja_marchita'),
               tilt_pec=110, caida=0.8)
    trifoliada(m, 'trifoliada2', p2, lado, 1.2, 2.0, cols=('podrido', 'hoja_seca_dark', 'hoja_seca'),
               tilt_pec=150, caida=0.5)
    # foliolos sueltos en el lomo y en el suelo
    caidas = [((3.4, 2, -1.8), 'hoja_seca', 20), ((-3.6, 2, 1.6), 'hoja_marchita', -35),
              ((-5.6, 1, -3.6), 'hoja_seca_dark', 60), ((5.6, 1, 3.8), 'hoja_seca_light', 10),
              ((5.6, 1, -3.8), 'podrido', -50)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'foliolo_suelo{k}', c, (1.6, 0.3, 1.6), col, yaw=yaw + 45)
    # vainas negras colgando de la rama y del tallo, con moho
    vaina(m, 'vaina0', rama, lado + 150, 2.8, ('frijol_negro', 'podrido_dark'), tilt=172)
    m.box('vaina0_moho', punta(rama, 1.4, 172, lado + 150), (0.9, 0.6, 1.1), 'moho', yaw=lado)
    vaina(m, 'vaina1', mover(p0, lado + 60, 0.5), lado + 60, 2.6, ('podrido_dark', 'frijol_negro'), tilt=160)
    # vainas caidas sobre el lomo, abiertas, con moho y semillas negras
    m.box('vaina_suelo0', (-2.2, 2, 2.4), (0.8, 0.5, 3.4), 'frijol_negro', yaw=70)
    m.box('vaina_suelo0_moho', (-2.0, 2.5, 2.3), (1.0, 0.5, 1.6), 'moho_light', yaw=80)
    m.box('vaina_suelo1', (1.8, 2, 2.6), (0.8, 0.5, 3.0), 'podrido', yaw=-30)
    m.box('vaina_suelo1_moho', (1.9, 2.5, 2.8), (0.8, 0.4, 1.2), 'moho_dark', yaw=-30)
    m.box('semilla_suelo', (0.4, 2, 3.6), (1.0, 0.6, 0.7), 'frijol_negro', yaw=15)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.6, 4.6, 3.2, 20), (2.6, 5.2, 1.0, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('frijol_siembra', siembra), ('frijol_brote', brote), ('frijol_crecimiento', crecimiento),
          ('frijol_madurez', madurez), ('frijol_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
