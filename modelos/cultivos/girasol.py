"""Generador del girasol (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/girasol.py

Girasol (Helianthus annuus). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la
base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz
(14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las alturas son
cualitativas, no medidas reales (la planta real va de 1.5 a 3 m; aqui solo se respeta que sea de
las mas altas del juego, a la par del maiz y el sorgo).

Rasgos que se respetan para que se lea a 20 px y no se confunda con el maiz o el sorgo:
- Tallo UNICO, grueso, recto y sin ramas.
- Hojas ANCHAS acorazonadas (base ancha con dos lobulos, punta aguda), alternas en espiral y
  colgadas de peciolos largos; las de abajo se secan primero.
- Germinacion epigea: el brote saca dos cotiledones ovalados (a veces con la cascara rayada encima)
  y luego el primer par de hojitas.
- Antes de florecer, un boton verde cerrado en forma de estrella (bracteas) en la punta.
- Capitulo grande: disco cafe (flores tubulares, luego semillas) rodeado por un anillo de petalos
  (lenguetas) amarillos y con el reves verde de bracteas. En madurez la cabeza se vence por el peso
  y mira de lado y un poco hacia abajo; aqui mira a la camara del juego (diagonal +x +z).
- Semilla (aquenio) en gota, negra con rayas blancas.
- Desenlace: tallo seco doblado en gancho, cabeza colgando boca abajo con el disco negro y moho,
  petalos secos caidos y moscas.

Fuentes de forma (consultadas el 15/11):
- NDSU, Sunflower Production Guide (etapas de Schneiter y Miller: V-E cotiledones, R1 boton en
  estrella, R5 floracion, R9 madurez con bracteas cafes): https://ndsu.edu/agriculture/node/9883
- Escala BBCH del girasol: https://en.wikipedia.org/wiki/BBCH-scale_(sunflower)
- Wikipedia, Helianthus annuus (hojas bajas opuestas, ovadas o acorazonadas; cabeza que se vence):
  https://en.wikipedia.org/wiki/Common_sunflower
Colores de la paleta fija (girasol_*, maiz_tallo*, maiz_hoja*, black, white, hoja_seca*,
hoja_marchita, podrido*, moho*, grano*), sin colores nuevos.

El capitulo necesita girar sus petalos dentro del plano de la cara (giro en z), que Model.box no
expone: la utilidad `pieza` arma la rotacion completa y la guarda como Euler ZYX (la misma que leen
Blockbench, el preview, el visor y web/src/escena/voxel).
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
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)

TALLO = ('maiz_tallo_dark', 'maiz_tallo', 'maiz_tallo_light')
HOJA = ('maiz_hoja_dark', 'girasol_hoja', 'maiz_hoja')            # peciolo, lamina, punta
HOJA_ALTA = ('maiz_tallo', 'maiz_hoja', 'maiz_hoja_light')        # hojas jovenes de arriba
SECA = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca')
MUERTA = ('podrido', 'hoja_seca_dark', 'hoja_seca')
PETALO = ('girasol_petalo', 'girasol_petalo', 'yellow')           # abajo, base, luz (arriba)


# ---------------- matrices (sin numpy) ----------------
def _mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _rx(g):
    c, s = math.cos(math.radians(g)), math.sin(math.radians(g))
    return [[1, 0, 0], [0, c, -s], [0, s, c]]


def _ry(g):
    c, s = math.cos(math.radians(g)), math.sin(math.radians(g))
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]]


def _rz(g):
    c, s = math.cos(math.radians(g)), math.sin(math.radians(g))
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]]


def marco(tilt, yaw, roll=0.0):
    """Marco local: primero roll (eje z local), luego tilt (eje x) y al final yaw (eje y)."""
    return _mul(_ry(yaw), _mul(_rx(tilt), _rz(roll)))


def euler_zyx(R):
    """Angulos [x, y, z] en grados tales que R = Rz @ Ry @ Rx (convencion de Blockbench y del visor)."""
    b = -math.asin(max(-1.0, min(1.0, R[2][0])))
    if abs(math.cos(b)) > 1e-6:
        a = math.atan2(R[2][1], R[2][2])
        c = math.atan2(R[1][0], R[0][0])
    else:
        a = math.atan2(-R[1][2], R[1][1])
        c = 0.0
    return [round(math.degrees(v), 4) for v in (a, b, c)]


def aplicar(R, v):
    return tuple(sum(R[i][k] * v[k] for k in range(3)) for i in range(3))


def suma(p, v, s=1.0):
    return tuple(p[i] + s * v[i] for i in range(3))


def pieza(m, nombre, piv, R, local, size, col):
    """Caja definida en el marco R con pivote piv. local = centro de la cara inferior, relativo a piv,
    en coordenadas del marco. voxelkit pone la caja en piv + local y la gira alrededor de piv."""
    e = m.box(nombre, suma(piv, local), size, col, pivot=piv)
    rot = euler_zyx(R)
    if any(abs(v) > 1e-6 for v in rot):
        e['rotation'] = rot
    return e


def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


# ---------------- piezas de la planta ----------------
def tallo(m, segs, grueso, cols=TALLO, base=BASE, nombre='tallo'):
    """Tallo unico recto por segmentos, cada uno un poco mas delgado. Devuelve las alturas de nudo."""
    x, y, z = base
    nudos = []
    for i, h in enumerate(segs):
        g = grueso * (1 - 0.1 * i)
        m.box(f'{nombre}{i}', (x, y, z), (g, h, g), cols[min(i, len(cols) - 1)])
        y += h
        nudos.append(y)
    return nudos


def hoja(m, nombre, p, yaw, largo, cols=HOJA, sube=62, caida=18, peciolo=2.2, ancho=None):
    """Hoja ancha acorazonada en su peciolo. 3 cubos: peciolo, lamina ancha con los lobulos de la base
    (empieza un poco detras de la punta del peciolo) y punta aguda que cae un poco mas.
    sube = inclinacion del peciolo desde la vertical; caida = cuanto baja la lamina desde horizontal."""
    q = m.stem(nombre + '_pec', p, peciolo, 0.45, cols[0], tilt=sube, yaw=yaw)
    w = ancho if ancho is not None else largo * 0.82
    a = largo * 0.6
    atras = 0.5                                     # los lobulos de la base abrazan el peciolo
    m.box(nombre + '_lam', (q[0], q[1], q[2] + a / 2 - atras), (w, 0.3, a), cols[1], tilt=caida, yaw=yaw,
          pivot=q)
    j = suma(q, (math.sin(math.radians(yaw)) * math.cos(math.radians(caida)), -math.sin(math.radians(caida)),
                 math.cos(math.radians(yaw)) * math.cos(math.radians(caida))), a - atras - 0.2)
    b = largo - a
    m.box(nombre + '_punta', (j[0], j[1], j[2] + b / 2), (w * 0.5, 0.3, b), cols[2], tilt=caida + 14, yaw=yaw,
          pivot=j)
    return q


def capitulo(m, nombre, H, tilt, yaw, r=1.0, disco=('girasol_disco_dark', 'girasol_disco'),
             petalos=PETALO, n=12, quitar=(), reves='girasol_hoja', moho=None):
    """Cabeza del girasol con centro H; la cara mira hacia yaw y baja tilt grados.
    Disco cafe (dos cuadros, uno a 45 grados, para que se vea redondo) con el centro mas claro,
    anillo de n petalos girados en el plano de la cara y el reves verde de bracteas.
    `quitar` = indices de petalos que faltan; `moho` = (color, color) de dos manchas sobre el disco.
    Devuelve el punto del reves donde se une el cuello."""
    R0 = marco(tilt, yaw)
    D, t = 5.2 * r, 1.2 * r
    pieza(m, nombre + '_disco', H, R0, (0, -D / 2, 0), (D, D, t), disco[0])
    pieza(m, nombre + '_disco45', H, marco(tilt, yaw, 45), (0, -D * 0.46, 0), (D * 0.92, D * 0.92, t * 0.9),
          disco[0])
    c = 2.6 * r
    pieza(m, nombre + '_centro', H, marco(tilt, yaw, 45), (0, -c / 2, t / 2), (c, c, 0.5 * r), disco[1])
    if moho:
        pieza(m, nombre + '_moho0', H, R0, (-0.9 * r, -0.2 * r, t / 2 + 0.1), (1.8 * r, 1.4 * r, 0.4 * r), moho[0])
        pieza(m, nombre + '_moho1', H, R0, (1.2 * r, -1.9 * r, t / 2), (1.2 * r, 1.0 * r, 0.35 * r), moho[1])
    # reves: placa verde un poco mas grande que el disco y el caliz donde entra el cuello
    B = 5.8 * r
    for k, giro in enumerate((0, 45)):
        pieza(m, f'{nombre}_reves{k}', H, marco(tilt, yaw, giro), (0, -B / 2, -t / 2 - 0.5 * r), (B, B, 0.6 * r),
              reves)
    pieza(m, nombre + '_caliz', H, R0, (0, -1.4 * r, -t / 2 - 1.3 * r), (2.6 * r, 2.8 * r, 0.9 * r), reves)
    for k in range(n):
        if k in quitar:
            continue
        ang = 360.0 * k / n + 15
        arriba = math.cos(math.radians(ang))      # 1 = petalo hacia arriba de la cara
        col = petalos[2] if arriba > 0.6 else (petalos[0] if arriba < -0.6 else petalos[1])
        pieza(m, f'{nombre}_petalo{k}', H, marco(tilt, yaw, ang), (0, 2.1 * r, -0.15 * r),
              (1.7 * r, 2.9 * r, 0.4 * r), col)
    return suma(H, aplicar(R0, (0, 0, -t / 2 - 1.3 * r)))


def boton(m, nombre, c, r=1.0):
    """Boton floral cerrado (etapa R1): bola verde con bracteas en estrella apuntando arriba. 6 cubos."""
    m.box(nombre, c, (2.0 * r, 1.8 * r, 2.0 * r), 'girasol_hoja')
    m.box(nombre + '_tapa', (c[0], c[1] + 1.8 * r, c[2]), (1.3 * r, 0.6 * r, 1.3 * r), 'maiz_hoja_light', yaw=45)
    for k in range(4):
        a = FRENTE + 90 * k
        b = mover((c[0], c[1] + 0.8 * r, c[2]), a, 0.7 * r)
        m.box(f'{nombre}_bractea{k}', b, (0.9 * r, 1.9 * r, 0.3 * r), 'maiz_hoja' if k % 2 else 'maiz_hoja_light',
              tilt=38, yaw=a)


def semilla(m, nombre, c, yaw, s=1.0, rayas=1, cuerpo='black', punta=True):
    """Aquenio: cuerpo negro (con punta mas angosta, opcional) y raya(s) blanca(s) a lo largo.
    1 + punta + rayas cubos."""
    m.box(nombre, c, (1.2 * s, 0.6 * s, 2.0 * s), cuerpo, yaw=yaw)
    if punta:
        m.box(nombre + '_punta', mover(c, yaw, 1.3 * s), (0.6 * s, 0.5 * s, 0.7 * s), cuerpo, yaw=yaw)
    for k in range(rayas):
        off = 0.0 if rayas == 1 else (k - 0.5) * 0.6 * s
        p = mover(mover(c, yaw + 90, off), yaw, 0.0, 0.6 * s)
        m.box(f'{nombre}_raya{k}', p, (0.3 * s, 0.08, 1.7 * s), 'white', yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con un hoyo chico y tres semillas negras con rayas blancas. 12 cubos (con el lomo)."""
    m = Model('girasol_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (7.0, 0.2, 4.4), 'soil')
    m.box('hoyo', (-0.4, 2, -0.3), (2.6, 0.3, 2.0), 'suelo_humedo', yaw=15)
    semilla(m, 'semilla0', (-0.6, 2.3, -0.4), 20, s=1.1, rayas=2, punta=False)
    semilla(m, 'semilla1', (2.0, 2.2, 0.6), -60, rayas=2, punta=False)
    semilla(m, 'semilla2', (-2.6, 2.2, 1.0), 75, s=0.9, rayas=1, punta=False)
    return m


def brote():
    """Plantula epigea: tallito, dos cotiledones ovalados (uno aun con la cascara rayada) y el primer
    par de hojitas en cruz. 10 cubos (con el lomo)."""
    m = Model('girasol_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.6), 'suelo_humedo')
    (y1,) = tallo(m, [3.6], 0.8, cols=('maiz_tallo_light',))
    top = (0, y1, 0)
    # cotiledones: en diagonal a la camara para que se vean los dos, casi horizontales
    for k, a in enumerate((FRENTE + 60, FRENTE - 120)):
        m.box(f'cotiledon{k}', (top[0], top[1], top[2] + 1.4), (1.7, 0.3, 2.8), 'maiz_hoja_light', tilt=-12,
              yaw=a, pivot=top)
    # primer par de hojas verdaderas, en cruz con los cotiledones y mas paradas
    for k, a in enumerate((FRENTE - 30, FRENTE + 150)):
        m.box(f'hojita{k}', (top[0], top[1] + 0.2, top[2] + 1.1), (1.5, 0.3, 2.2), 'girasol_hoja', tilt=-50,
              yaw=a, pivot=top)
    m.box('yema', top, (0.5, 0.7, 0.5), 'maiz_hoja_light')
    # cascara de la semilla que se quedo pegada a la punta de un cotiledon
    cas = mover(top, FRENTE - 120, 2.6, 0.55)
    m.box('cascara', cas, (0.9, 0.5, 1.2), 'black', yaw=FRENTE - 30)
    return m


def crecimiento():
    """Tallo grueso con 6 hojas anchas acorazonadas en espiral y el boton verde cerrado arriba. 29 cubos."""
    m = Model('girasol_crecimiento', PAL)
    monticulo(m)
    nudos = tallo(m, [5.0, 5.0, 4.5], 1.5)
    specs = [(3.8, FRENTE + 100, 5.4, HOJA, 70, 20),
             (6.0, FRENTE - 60, 5.8, HOJA, 66, 18),
             (8.4, FRENTE + 200, 5.6, HOJA, 62, 16),
             (10.6, FRENTE + 40, 5.0, HOJA_ALTA, 58, 14),
             (12.6, FRENTE - 150, 4.4, HOJA_ALTA, 50, 10),
             (14.0, FRENTE + 150, 3.4, HOJA_ALTA, 40, 4)]
    for k, (h, yaw, L, cols, sube, caida) in enumerate(specs):
        hoja(m, f'hoja{k}', (0, h, 0), yaw, L, cols=cols, sube=sube, caida=caida, peciolo=1.6 + 0.1 * L)
    boton(m, 'boton', (0, nudos[-1], 0))
    return m


def madurez():
    """Flor abierta: tallo alto y grueso, 7 hojas anchas (las 2 de abajo ya secas), cuello vencido y el
    capitulo grande de frente a la camara: disco cafe y anillo de 12 petalos amarillos. 46 cubos."""
    m = Model('girasol_madurez', PAL)
    monticulo(m)
    nudos = tallo(m, [6.5, 6.5, 6.0, 5.0], 1.9)
    specs = [(4.0, FRENTE + 110, 5.6, SECA, 82, 40),
             (6.4, FRENTE - 70, 6.0, ('hoja_seca_dark', 'hoja_marchita', 'hoja_marchita'), 76, 32),
             (9.4, FRENTE + 200, 7.0, HOJA, 66, 20),
             (12.6, FRENTE + 70, 6.2, HOJA, 64, 18),
             (15.8, FRENTE - 130, 6.6, HOJA, 60, 16),
             (19.0, FRENTE + 150, 5.8, HOJA_ALTA, 56, 14),
             (21.6, FRENTE - 50, 4.8, HOJA_ALTA, 50, 10)]
    for k, (h, yaw, L, cols, sube, caida) in enumerate(specs):
        hoja(m, f'hoja{k}', (0, h, 0), yaw, L, cols=cols, sube=sube, caida=caida, peciolo=1.8 + 0.12 * L)
    # cuello: se dobla hacia la camara por el peso de la cabeza
    top = (0, nudos[-1], 0)
    q = m.stem('cuello', top, 2.6, 1.1, 'maiz_tallo', tilt=30, yaw=FRENTE)
    inclina = 8
    n = aplicar(marco(inclina, FRENTE), (0, 0, 1))
    H = suma(q, n, 0.6 + 1.3)                     # la punta del cuello entra al centro del caliz
    capitulo(m, 'cabeza', H, inclina, FRENTE)
    return m


def podrida():
    """Desenlace de estres: tallo seco doblado en gancho, cabeza colgando boca abajo con el disco negro y
    moho, pocas lenguetas secas, hojas secas colgando, petalos y semillas en el suelo, 2 moscas. 48 cubos."""
    m = Model('girasol_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.4), (4.2, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.2), (0.5, 0.2, 3.2), 'suelo_grieta', yaw=-15)
    m.box('moho_base', BASE, (2.3, 1.0, 2.3), 'moho_dark')
    lado = FRENTE + 35            # el gancho se vence de medio lado: se lee la curva y se alcanza a ver el disco
    # tallo: abajo de pie y echado un poco atras (contrapeso), arriba se arquea y en el quiebre se dobla
    q0 = m.stem('tallo0', BASE, 8.0, 1.8, 'hoja_seca_dark', tilt=7, yaw=lado + 180)
    q1 = m.stem('tallo1', q0, 6.0, 1.5, 'hoja_seca', tilt=10, yaw=lado)
    m.box('nudo', q1, (1.7, 1.0, 1.7), 'podrido_dark', tilt=30, yaw=lado)
    q2 = m.stem('tallo2', suma(q1, (0, 0.3, 0)), 2.6, 1.2, 'hoja_seca_dark', tilt=72, yaw=lado)
    inclina = 38                  # la cara mira al suelo y un poco a la camara
    q3 = m.stem('cuello', q2, 2.0, 1.0, 'podrido', tilt=90 + inclina, yaw=lado)
    n = aplicar(marco(inclina, lado), (0, 0, 1))
    r = 0.85
    H = suma(q3, n, (0.6 + 1.3) * r)
    capitulo(m, 'cabeza', H, inclina, lado, r=r, disco=('black', 'podrido_dark'),
             petalos=('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light'), n=12, quitar=(1, 2, 4, 5, 7, 9, 10),
             reves='hoja_seca_dark', moho=('moho', 'moho_light'))
    # hojas secas que cuelgan del tallo, asimetricas
    specs = [(punta(BASE, 5.0, 7, lado + 180), FRENTE + 130, 4.6, MUERTA, 80, 72),
             (punta(BASE, 7.5, 7, lado + 180), FRENTE - 80, 5.0, SECA, 75, 65),
             (punta(q0, 2.6, 10, lado), FRENTE + 200, 4.8, ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light'), 70, 60),
             (punta(q0, 5.0, 10, lado), FRENTE - 150, 4.0, MUERTA, 72, 70)]
    for k, (p, yaw, L, cols, sube, caida) in enumerate(specs):
        hoja(m, f'hoja{k}', p, yaw, L, cols=cols, sube=sube, caida=caida, peciolo=1.5)
    # lenguetas secas caidas sobre el lomo y el suelo
    caidas = [((2.6, 2, 3.4), 30, 'hoja_seca_light'), ((-1.6, 2, 3.8), -50, 'hoja_seca'),
              ((4.8, 2, -0.6), 80, 'hoja_marchita'), ((-5.4, 1, 3.4), 10, 'hoja_seca_dark')]
    for k, (c, yaw, col) in enumerate(caidas):
        m.box(f'petalo_suelo{k}', c, (1.4, 0.3, 2.4), col, yaw=yaw)
    # hoja entera caida
    m.box('hoja_suelo', (-3.6, 2, -2.4), (3.4, 0.3, 3.0), 'podrido', yaw=25)
    # semillas que se cayeron del disco: una rayada todavia, otra ya podrida
    semilla(m, 'semilla0', (0.6, 2, 3.2), 60, s=0.8, rayas=1)
    m.box('semilla1', (-0.6, 2, 3.9), (0.9, 0.5, 1.4), 'podrido_dark', yaw=-30)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.6, 12.0, 3.6, 20), (-3.0, 7.4, 1.8, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('girasol_siembra', siembra), ('girasol_brote', brote), ('girasol_crecimiento', crecimiento),
          ('girasol_madurez', madurez), ('girasol_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
