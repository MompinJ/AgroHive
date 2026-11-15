"""Generador de la lenteja (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/lenteja.py

Lenteja (Lens culinaris), anual de porte erecto o semierecto. Convenciones (docs/07): 1 celda =
16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas
comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una
huella de 16x16. Las alturas son cualitativas, no medidas reales: se dejo como la leguminosa erecta
mas baja (madurez de unas 9 unidades, contra 13 del frijol), y menos ancha que el cacahuate.

Rasgos que se respetan para no confundirla con el frijol, el cacahuate y la soya: matita chica y
fina, muy ramificada desde la base (muchos tallitos delgados que se abren en abanico, sin tallo
central grueso); hoja pinnada con varios pares de foliolos chiquitos a lo largo del raquis, que aqui
se dibujan como travesanos finos sobre cada tallito (look plumoso de escalerita); flores chiquitas
lila palido; vainas cortas, planas y romboidales con 1 o 2 lentejas; semilla lenticular cafe. Se
cosecha seca: en madurez toda la mata se pone color paja. Colores de la paleta fija, sin nuevos.

Fuentes de forma (consultadas el 14/11/2026, cualitativas):
- FAO EcoCrop, Lens culinaris: https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=7209
- Wikipedia, Lentil: https://en.wikipedia.org/wiki/Lentil
- Herbari virtual UIB, Lens culinaris: https://herbarivirtual.uib.cat/en/general/480/especie/lenteja
- USDA Plant Guide (pg_lecu2): https://plants.sc.egov.usda.gov/DocumentLibrary/plantguide/pdf/pg_lecu2.pdf
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

VERDE = ('frijol_hoja_dark', 'lenteja_hoja', 'lenteja_hoja_light')   # sombra, base, claro
PAJA = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca_light')        # mata seca de cosecha
PODRE = ('podrido_dark', 'podrido', 'hoja_seca_dark')                # mata vencida


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def foliolos(m, nombre, p, yaw, ancho, col, caida=0.0, largo=0.45):
    """Un par de foliolos opuestos: travesano fino cruzado al tallito en p. 1 cubo.

    El ancho va perpendicular a la direccion yaw del tallito; caida (grados) lo inclina hacia la punta."""
    m.box(nombre, (p[0], p[1] - 0.1, p[2]), (ancho, 0.2, largo), col, tilt=caida, yaw=yaw)


def tallito(m, nombre, base, largo, tilt, yaw, cols, pares=(0.5, 0.75, 1.0), ancho=1.8, grueso=0.3,
            caida=10.0, col_tallo=None):
    """Tallito fino con hoja pinnada encima: el tallo hace de raquis y lleva pares de foliolos.

    pares son las fracciones del largo donde va cada par; el ancho se achica hacia la punta para
    que se lea plumoso. Colores alternos base/claro. 1 + len(pares) cubos. Devuelve la punta."""
    tip = m.stem(nombre, base, largo, grueso, col_tallo or cols[0], tilt=tilt, yaw=yaw)
    for k, f in enumerate(pares):
        p = punta(base, largo * f, tilt, yaw)
        w = ancho * (1.0 - 0.45 * (f - pares[0]) / max(1e-6, 1.0 - pares[0]))
        foliolos(m, f'{nombre}_f{k}', p, yaw + (8 if k % 2 else -8), w, cols[1 + k % 2], caida)
    return tip


def vaina(m, nombre, p, yaw, col='lenteja_vaina', s=0.85, baja=0.55):
    """Vaina corta, plana y romboidal que cuelga justo bajo p. 1 cubo.

    Caja delgada en x y cuadrada en y-z con tilt 45: se ve como rombo en su plano. El plano contiene
    la direccion yaw; con yaw = yaw del tallo + 90 la cara plana mira hacia afuera de la mata."""
    c = (p[0], p[1] - baja - s / 2, p[2])
    m.box(nombre, c, (0.28, s, s), col, tilt=45, yaw=yaw, pivot=(c[0], c[1] + s / 2, c[2]))


def lenteja(m, nombre, c, yaw, col='lenteja_semilla', s=1.0, disco=True):
    """Semilla lenticular plana. Con disco, dos cajas cruzadas que se leen redondas. 1 o 2 cubos."""
    m.box(nombre, c, (1.1 * s, 0.35 * s, 0.7 * s), col, yaw=yaw)
    if disco:
        m.box(nombre + 'b', c, (0.7 * s, 0.35 * s, 1.1 * s), col, yaw=yaw)


def flor(m, nombre, p, yaw):
    """Florecita lila palido sobre un pedicelo corto, con el estandarte blanco. 2 cubos."""
    m.box(nombre, p, (0.7, 0.6, 0.6), 'flor_lila', yaw=yaw)
    m.box(nombre + '_b', mover(p, yaw, -0.3, 0.45), (0.55, 0.35, 0.25), 'white', yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con 5 lentejas planas cafes en el hoyo. 11 cubos."""
    m = Model('lenteja_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.4, 0.3, 3.2), 'suelo_humedo')
    semillas = [((-1.3, 0.5), 20, True), ((0.9, -0.7), -30, True), ((0.4, 0.9), 65, True),
                ((-0.5, -0.8), 45, False), ((1.6, 0.6), 10, False)]
    for k, ((x, z), yaw, disco) in enumerate(semillas):
        lenteja(m, f'lenteja{k + 1}', (x, 2.3, z), yaw, disco=disco)
    return m


def brote():
    """Plantula: 3 tallitos finos que salen juntos, con sus primeros pares de foliolos. 12 cubos."""
    m = Model('lenteja_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (2.6, 0.3, 2.2), 'suelo_humedo')
    m.box('cuello', BASE, (0.6, 0.6, 0.6), VERDE[0], yaw=20)
    specs = [(2.6, 8, FRENTE + 30, (0.55, 0.95)), (2.0, 32, FRENTE + 160, (0.6, 0.95)),
             (1.8, 36, FRENTE + 270, (0.9,))]
    for k, (largo, tilt, yaw, pares) in enumerate(specs):
        tallito(m, f'tallito{k}', (0, 2.3, 0), largo, tilt, yaw, VERDE, pares=pares, ancho=1.3,
                grueso=0.28, caida=14, col_tallo='lenteja_hoja')
    return m


def crecimiento():
    """Matita plumosa: 6 tallitos en abanico desde la base, foliolos en escalerita y 4 flores lila. 30 cubos."""
    m = Model('lenteja_crecimiento', PAL)
    monticulo(m)
    m.box('cuello', BASE, (0.8, 0.6, 0.8), VERDE[0], yaw=15)
    specs = [(4.8, 14, FRENTE), (4.2, 38, FRENTE + 60), (4.6, 28, FRENTE + 125), (4.0, 42, FRENTE + 185),
             (4.6, 24, FRENTE + 245), (4.0, 40, FRENTE + 305)]
    puntas = []
    for k, (largo, tilt, yaw) in enumerate(specs):
        pares = (0.55, 1.0) if k % 2 else (0.45, 0.72, 1.0)
        puntas.append((tallito(m, f'tallo{k}', (0, 2.4, 0), largo, tilt, yaw, VERDE, pares=pares, ancho=2.1,
                                   caida=14),
                       yaw))
    # florecitas lila sobre 4 tallitos, repartidas para verse desde cualquier lado; 2 con estandarte blanco
    for k, i in enumerate((0, 2, 3, 5)):
        p, yaw = puntas[i]
        c = mover(p, yaw, 0.3, 0.05)
        if k % 2:
            m.box(f'flor{k}', c, (0.7, 0.6, 0.6), 'flor_lila', yaw=yaw)
        else:
            flor(m, f'flor{k}', c, yaw)
    return m


def madurez():
    """Mata seca color paja, fina y en abanico, con 17 vainas cortas y una abierta en el lomo con 2 lentejas. 55 cubos."""
    m = Model('lenteja_madurez', PAL)
    monticulo(m)
    m.box('cuello', BASE, (0.9, 0.7, 0.9), PAJA[0], yaw=15)
    raiz = (0, 2.5, 0)
    specs = [(6.2, 12, FRENTE), (5.6, 36, FRENTE + 52), (6.0, 26, FRENTE + 103), (5.2, 42, FRENTE + 155),
             (6.0, 22, FRENTE + 206), (5.4, 38, FRENTE + 258), (5.8, 30, FRENTE + 309)]
    tallos = []
    for k, (largo, tilt, yaw) in enumerate(specs):
        pares = (0.55, 0.78, 1.0) if k % 2 == 0 else (0.62, 1.0)
        tallito(m, f'tallo{k}', raiz, largo, tilt, yaw, PAJA, pares=pares, ancho=1.6,
                caida=16, col_tallo='hoja_seca')
        tallos.append((largo, tilt, yaw))
    # ramitas secundarias: salen a media altura y abren la copa
    for k, i in enumerate((1, 3, 5)):
        largo, tilt, yaw = tallos[i]
        b = punta(raiz, largo * 0.4, tilt, yaw)
        tallito(m, f'ramita{k}', b, 2.4, tilt - 24, yaw + 32, PAJA, pares=(1.0,), ancho=1.2, grueso=0.26,
                caida=16, col_tallo='hoja_seca')
    # vainas cortas en rombo colgando de los tallitos, con la cara plana hacia afuera
    n = 0
    for k, (largo, tilt, yaw) in enumerate(tallos):
        for f in ((0.45, 0.68, 0.88) if k in (0, 2, 4) else (0.5, 0.82)):
            p = punta(raiz, largo * f, tilt, yaw)
            vaina(m, f'vaina{n}', mover(p, yaw, 0.2), yaw + 90 + (n % 3 - 1) * 15,
                  col='hoja_seca_light' if n % 4 == 3 else 'lenteja_vaina')
            n += 1
    # vaina abierta en el lomo, al frente: dos valvas planas y 2 lentejas cafes en una
    c = (2.8, 2, 3.0)
    m.box('abierta_valva0', c, (1.0, 0.2, 1.5), 'lenteja_vaina', yaw=FRENTE + 45)
    m.box('abierta_valva1', mover(c, FRENTE + 135, 1.05), (0.9, 0.2, 1.4), 'hoja_seca', yaw=FRENTE + 70)
    lenteja(m, 'abierta_lenteja0', mover(c, FRENTE + 45, 0.35, 0.2), FRENTE, s=0.75, disco=False)
    lenteja(m, 'abierta_lenteja1', mover(c, FRENTE + 45, -0.4, 0.2), FRENTE + 40, s=0.75, disco=False)
    return m


def podrida():
    """Desenlace de estres: matita vencida y oscura, tallitos tendidos, vainas podridas con moho y moscas. 40 cubos."""
    m = Model('lenteja_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.6, 2, 1.4), (2.6, 0.2, 0.4), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.2), (0.5, 0.2, 2.8), 'suelo_grieta', yaw=-15)
    m.box('cuello', BASE, (1.1, 0.8, 1.1), 'moho_dark', yaw=15)
    raiz = (0, 2.5, 0)
    # tallitos vencidos: casi acostados sobre el lomo, mas cortos de un lado (desequilibrio)
    specs = [(4.8, 62, FRENTE + 10), (4.2, 74, FRENTE + 70), (5.2, 80, FRENTE + 130), (3.6, 70, FRENTE + 190),
             (5.0, 82, FRENTE + 240), (3.2, 60, FRENTE + 300)]
    tallos = []
    for k, (largo, tilt, yaw) in enumerate(specs):
        pares = (0.6, 1.0) if k % 3 else (0.75,)
        tallito(m, f'tallo{k}', raiz, largo, tilt, yaw, PODRE, pares=pares, ancho=1.3, caida=12,
                col_tallo='hoja_seca_dark' if k % 2 else 'podrido')
        tallos.append((largo, tilt, yaw))
    # vainas podridas que aun cuelgan, oscurecidas, con moho encima de algunas
    for k, (i, f) in enumerate(((0, 0.55), (1, 0.6), (2, 0.45), (4, 0.5), (5, 0.85))):
        largo, tilt, yaw = tallos[i]
        p = punta(raiz, largo * f, tilt, yaw)
        s = min(0.8, (p[1] - 2.05) / 1.25)
        vaina(m, f'vaina{k}', p, yaw + 90, col=('podrido_dark', 'podrido')[k % 2], s=s, baja=0.5 * s)
        if k % 2 == 0:
            m.box(f'vaina{k}_moho', (p[0], p[1] - 0.15, p[2]), (0.7, 0.3, 0.6), ('moho', 'moho_light')[k // 2 % 2],
                  yaw=yaw)
    # vainas y foliolos caidos en el lomo y en el suelo, y lentejas podridas regadas
    caidas = [((-3.4, 2, 2.6), 'podrido', 30), ((3.6, 2, -2.4), 'hoja_seca_dark', -40),
              ((-5.8, 1, -3.6), 'podrido_dark', 60), ((5.8, 1, 3.6), 'hoja_marchita', 10)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'caida{k}', c, (0.8, 0.3, 1.2), col, yaw=yaw)
    m.box('caida0_moho', (-3.4, 2.3, 2.6), (0.6, 0.15, 0.7), 'moho_light', yaw=40)
    lenteja(m, 'lenteja_suelo0', (2.4, 2, 2.8), 20, col='podrido_dark', s=0.8, disco=False)
    lenteja(m, 'lenteja_suelo1', (3.2, 2, 2.0), 70, col='lenteja_semilla', s=0.7, disco=False)
    # moscas (lo unico que flota a proposito), rondando la mata
    for k, (x, y, z, a) in enumerate([(1.8, 4.8, 1.6, 20), (-1.6, 5.4, -1.2, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('lenteja_siembra', siembra), ('lenteja_brote', brote), ('lenteja_crecimiento', crecimiento),
          ('lenteja_madurez', madurez), ('lenteja_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
