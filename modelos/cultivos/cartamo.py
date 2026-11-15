"""Generador del cartamo (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/cartamo.py

Cartamo o alazor (Carthamus tinctorius). Convenciones (docs/07): 1 celda = 16 unidades, origen en el
centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del
maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las alturas son
cualitativas, no medidas reales (la planta real mide de 0.3 a 1.5 m; aqui solo se respeta que sea de
porte medio, mas baja que el girasol y el maiz).

Rasgos que se respetan para que se lea a 20 px y no se confunda con el girasol (una sola flor grande)
ni con el algodon (bolas blancas):
- Planta ERGUIDA: tallo central recto que se RAMIFICA en la parte de arriba como un candelabro (las
  ramas salen abiertas y luego suben).
- Hojas RIGIDAS, sin peciolo, lanceoladas y ESPINOSAS: dientes que salen del borde hacia la punta.
  Verde grisaceo (cartamo_hoja), con la punta en sombra y las espinas palidas.
- Brote: roseta baja de hojitas espinosas pegadas al suelo (fase de roseta).
- Antes de florecer: botones verdes cerrados en la punta del tallo y de las ramas.
- Cabezuela tipo CARDO al final de cada rama: bola verde (en forma de urna) con un collar de
  bracteas espinosas abiertas en estrella y un PENACHO de flores naranja intenso arriba; las flores
  viejas se ponen rojizas. Muchas cabezuelas chicas, no una grande. Florece primero la del tallo
  central y luego las de las ramas.
- Madurez: las hojas de abajo ya se secan (en la planta real casi todas se ponen cafes unos 30 dias
  despues de la floracion).
- Semilla (aquenio) blanca, lisa y ANGULOSA (cuatro caras), con la punta truncada.
- Desenlace: planta seca y vencida hacia un lado, ramas caidas, cabezuelas cafes con moho y penacho
  negro, una cabezuela y hojas caidas en el lomo, moscas.

Fuentes de forma (consultadas el 15/11/2026):
- PROSEA (Pl@ntUse), Carthamus tinctorius: roseta tras la emergencia, ramificacion de arriba;
  cabezuela terminal en urna de unos 4 cm con solo flores de disco; bracteas externas rigidas con
  espinas en el borde, internas erguidas con punta espinosa; floracion del tallo central a las ramas;
  madurez cuando casi todas las hojas estan cafes:
  https://uses.plantnet-project.org/en/Carthamus_tinctorius_(PROSEA)
- Wikipedia, Safflower (porte, hojas espinosas, flores amarillas, naranjas o rojas, aquenio blanco):
  https://en.wikipedia.org/wiki/Safflower
- Illinois Wildflowers, Carthamus tinctorius (hoja sesil espinosa, cabezuela con bracteas foliaceas):
  https://illinoiswildflowers.info/weeds/plants/safflower.html
Colores de la paleta fija (cartamo_hoja, cartamo_flor, orange, red, white, leaf_dark, cereal_hoja*,
hoja_seca*, hoja_marchita, podrido*, moho*, black), sin colores nuevos.

Las espinas de la hoja se giran dentro del plano de la lamina, que Model.box no expone: la utilidad
`pieza` (la misma del girasol) arma la rotacion completa y la guarda como Euler ZYX.
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
from maiz import monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)

TALLO = ('cereal_hoja', 'cartamo_hoja', 'cartamo_hoja')
HOJA = ('cartamo_hoja', 'cereal_hoja_dark', 'cereal_hoja_light')      # lamina, punta, espinas
HOJA_TIERNA = ('cartamo_hoja', 'cereal_hoja', 'cereal_hoja_light')
MARCHITA = ('hoja_marchita', 'hoja_seca_dark', 'hoja_seca_light')
SECA = ('hoja_seca', 'hoja_seca_dark', 'hoja_seca_light')
MUERTA = ('podrido', 'podrido_dark', 'hoja_seca')

# cabezuela: cuerpo, collar de bracteas, penacho, cresta del penacho
FLOR = ('cartamo_hoja', 'leaf_dark', 'cartamo_flor', 'orange')
FLOR_VIEJA = ('cartamo_hoja', 'leaf_dark', 'orange', 'red')
BOTON = ('cartamo_hoja', 'cereal_hoja_dark', 'cereal_hoja_light')
CABEZA_PODRIDA = ('podrido', 'podrido_dark', 'hoja_seca_dark', 'black')


# ---------------- matrices (sin numpy, igual que el girasol) ----------------
def _mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _rx(g):
    c, s = math.cos(math.radians(g)), math.sin(math.radians(g))
    return [[1, 0, 0], [0, c, -s], [0, s, c]]


def _ry(g):
    c, s = math.cos(math.radians(g)), math.sin(math.radians(g))
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]]


def marco(tilt, yaw):
    """Marco local: primero tilt (eje x; positivo baja la punta +z), luego yaw (eje y)."""
    return _mul(_ry(yaw), _rx(tilt))


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
    """Tallo central recto (cajas sin girar) por segmentos que adelgazan. Devuelve la punta."""
    x, y, z = base
    for i, h in enumerate(segs):
        g = grueso * (1 - 0.12 * i)
        m.box(f'{nombre}{i}', (x, y, z), (g, h, g), cols[min(i, len(cols) - 1)])
        y += h
    return (x, y, z)


def hoja(m, nombre, p, yaw, largo, ancho, cols=HOJA, sube=20.0, dientes=2, punta=True):
    """Hoja sesil, rigida y lanceolada que sale de p hacia yaw; sube > 0 la levanta, < 0 la deja caer.
    Lamina ancha, punta angosta (opcional) y `dientes` espinas que salen del borde hacia la punta,
    alternando lado. 1 + punta + dientes cubos. Devuelve el extremo de la hoja."""
    R = marco(-sube, yaw)
    a = largo * (0.62 if punta else 1.0)
    pieza(m, nombre, p, R, (0, 0, a / 2), (ancho, 0.3, a), cols[0])
    if punta:
        b = largo - a
        pieza(m, nombre + '_punta', p, R, (0, 0.02, a - 0.1 + b / 2), (ancho * 0.5, 0.3, b), cols[1])
    for k in range(dientes):
        lado = 1 if k % 2 == 0 else -1
        zk = largo * (0.42 + 0.42 * k / max(1, dientes - 1)) if dientes > 1 else largo * 0.55
        hw = ancho / 2 if zk < a else ancho * 0.25
        q = suma(p, aplicar(R, (lado * hw, 0.03, zk)))
        pieza(m, f'{nombre}_espina{k}', q, _mul(R, _ry(lado * 48)), (0, 0, 0), (0.35, 0.3, 1.4), cols[2])
    return suma(p, aplicar(R, (0, 0, largo)))


def rama(m, nombre, p, yaw, l1, t1, l2, t2, cols=('cartamo_hoja', 'cartamo_hoja')):
    """Rama de candelabro: sale abierta del tallo (t1 grados desde la vertical) y luego sube (t2).
    2 cubos. Devuelve la punta."""
    q = m.stem(nombre, p, l1, 0.6, cols[0], tilt=t1, yaw=yaw)
    return m.stem(nombre + '_b', q, l2, 0.5, cols[1], tilt=t2, yaw=yaw)


def cabezuela(m, nombre, c, cols=FLOR, r=1.0, giro=0.0, abierta=True, moho=None):
    """Cabezuela tipo cardo apoyada en c (la punta de la rama): bola verde en urna, collar de bracteas
    espinosas en estrella (girado 45 grados) y penacho de flores con su cresta. Cerrada (boton):
    bola, estrella y una puntita sin flor; abierta=None deja solo bola y estrella (boton chico).
    4 cubos (3 o 2 de boton, +1 con moho)."""
    x, y, z = c
    y -= 0.2 * r
    m.box(nombre, (x, y, z), (1.8 * r, 1.5 * r, 1.8 * r), cols[0], yaw=giro)
    m.box(nombre + '_bracteas', (x, y + 0.45 * r, z), (2.5 * r, 0.45 * r, 2.5 * r), cols[1], yaw=giro + 45)
    if abierta is None:
        return
    if not abierta:
        m.box(nombre + '_punta', (x, y + 1.5 * r, z), (1.0 * r, 0.6 * r, 1.0 * r), cols[2], yaw=giro + 45)
        return
    m.box(nombre + '_penacho', (x, y + 1.5 * r, z), (1.8 * r, 0.9 * r, 1.8 * r), cols[2], yaw=giro + 10)
    m.box(nombre + '_cresta', (x, y + 2.4 * r, z), (1.2 * r, 0.6 * r, 1.2 * r), cols[3], yaw=giro + 55)
    if moho:
        m.box(nombre + '_moho', mover((x, y + 0.2 * r, z), FRENTE + 20, 0.55 * r), (1.1 * r, 0.9 * r, 1.0 * r),
              moho, yaw=FRENTE + 20)


def colgada(m, nombre, q, cols=CABEZA_PODRIDA, r=1.0, giro=0.0, moho=None):
    """Cabezuela vencida que cuelga boca abajo de q (punta de una rama caida): collar de bracteas
    arriba, bola cafe y el penacho negro hacia el suelo. 3 cubos (+1 con moho)."""
    x, y, z = q
    yb = y - 1.5 * r
    m.box(nombre, (x, yb, z), (1.7 * r, 1.5 * r, 1.7 * r), cols[0], yaw=giro)
    m.box(nombre + '_bracteas', (x, y - 0.6 * r, z), (2.3 * r, 0.45 * r, 2.3 * r), cols[1], yaw=giro + 45)
    m.box(nombre + '_penacho', (x, yb - 0.7 * r, z), (1.3 * r, 0.7 * r, 1.3 * r), cols[3], yaw=giro + 10)
    if moho:
        m.box(nombre + '_moho', mover((x, yb + 0.3 * r, z), FRENTE + 15, 0.5 * r), (1.0 * r, 0.9 * r, 1.0 * r),
              moho, yaw=FRENTE + 15)


def semilla(m, nombre, c, yaw, s=1.0, tilt=0.0):
    """Aquenio blanco y anguloso: cuerpo de cuatro caras girado y punta truncada mas angosta. 2 cubos."""
    m.box(nombre, c, (1.0 * s, 0.75 * s, 1.5 * s), 'white', tilt=tilt, yaw=yaw)
    p = mover(c, yaw, 1.05 * s * math.cos(math.radians(tilt)), -0.75 * s * math.sin(math.radians(tilt)))
    m.box(nombre + '_punta', p, (0.65 * s, 0.6 * s, 0.6 * s), 'white', tilt=tilt, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con un surquito oscuro y tres semillas blancas angulosas. 10 cubos (con el lomo)."""
    m = Model('cartamo_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (8.0, 0.2, 5.0), 'suelo_humedo')
    m.box('surco', (0, 2, 0), (6.0, 0.3, 1.2), 'soil_dark', yaw=8)
    semilla(m, 'semilla0', (-2.2, 2.2, 0.6), 30, s=1.1)
    semilla(m, 'semilla1', (0.6, 2.3, -0.2), -55)
    semilla(m, 'semilla2', (2.6, 2.2, 1.2), 100, s=0.95)
    return m


def brote():
    """Roseta baja: yema central y cuatro hojitas espinosas casi pegadas al suelo, en cruz. 12 cubos
    (con el lomo)."""
    m = Model('cartamo_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.6, 0.2, 3.2), 'suelo_humedo')
    m.box('yema', BASE, (0.9, 1.0, 0.9), 'cereal_hoja_light', yaw=45)
    specs = [(FRENTE + 10, 3.8, 1.7, 10), (FRENTE + 100, 3.3, 1.5, 7), (FRENTE + 190, 4.0, 1.7, 8),
             (FRENTE + 280, 3.4, 1.5, 12)]
    for k, (yaw, L, w, sube) in enumerate(specs):
        hoja(m, f'hojita{k}', (BASE[0], BASE[1] + 0.25, BASE[2]), yaw, L, w, cols=HOJA_TIERNA, sube=sube,
             dientes=1, punta=False)
    return m


def crecimiento():
    """Tallo erguido con 4 hojas espinosas grandes que suben, dos ramitas que empiezan el candelabro y
    tres botones verdes cerrados. 28 cubos."""
    m = Model('cartamo_crecimiento', PAL)
    monticulo(m)
    top = tallo(m, [4.0, 4.0, 3.8], 0.95)
    specs = [(3.2, FRENTE + 120, 5.4, 2.2, 10, HOJA, 2, True),
             (5.4, FRENTE - 60, 5.2, 2.1, 18, HOJA, 2, True),
             (7.6, FRENTE + 210, 4.6, 1.9, 26, HOJA, 2, True),
             (9.8, FRENTE + 30, 2.8, 1.3, 34, HOJA_TIERNA, 1, False)]
    for k, (h, yaw, L, w, sube, cols, nd, pt) in enumerate(specs):
        hoja(m, f'hoja{k}', mover((0, h, 0), yaw, 0.4), yaw, L, w, cols=cols, sube=sube, dientes=nd, punta=pt)
    a = m.stem('rama0', (0, 10.2, 0), 3.0, 0.5, 'cartamo_hoja', tilt=42, yaw=FRENTE + 100)
    b = m.stem('rama1', (0, 10.8, 0), 2.6, 0.5, 'cartamo_hoja', tilt=40, yaw=FRENTE - 90)
    cabezuela(m, 'boton0', top, cols=BOTON, r=0.9, abierta=False)
    cabezuela(m, 'boton1', a, cols=BOTON, r=0.7, abierta=None, giro=20)
    cabezuela(m, 'boton2', b, cols=BOTON, r=0.65, abierta=None, giro=-15)
    return m


def madurez():
    """Candelabro en flor: tallo central y 4 ramas abiertas que suben, 5 cabezuelas con penacho naranja
    (dos ya rojizas), 4 hojas espinosas verdes y las dos de abajo secas. 55 cubos."""
    m = Model('cartamo_madurez', PAL)
    monticulo(m)
    top = tallo(m, [5.0, 5.0, 5.4], 1.0)
    # hojas: las dos de abajo secas y caidas, las de arriba verdes y rigidas hacia arriba
    specs = [(3.4, FRENTE + 140, 4.8, 1.9, -16, SECA, 1, True),
             (4.4, FRENTE - 40, 5.0, 2.0, -14, MARCHITA, 1, True),
             (6.0, FRENTE + 60, 5.4, 2.2, 12, HOJA, 2, True),
             (7.4, FRENTE + 200, 5.2, 2.1, 16, HOJA, 2, True),
             (8.8, FRENTE - 100, 4.8, 2.0, 22, HOJA, 2, True),
             (10.4, FRENTE + 130, 4.0, 1.7, 28, HOJA, 2, True)]
    for k, (h, yaw, L, w, sube, cols, nd, pt) in enumerate(specs):
        hoja(m, f'hoja{k}', mover((0, h, 0), yaw, 0.4), yaw, L, w, cols=cols, sube=sube, dientes=nd, punta=pt)
    # ramas del candelabro (de abajo hacia arriba), cada una con su cabezuela
    ramas = [(10.0, FRENTE + 80, 3.4, 64, 3.0, 12, FLOR_VIEJA, 0.95),
             (11.0, FRENTE - 105, 3.4, 62, 2.8, 10, FLOR, 0.95),
             (12.2, FRENTE + 185, 3.0, 60, 2.6, 10, FLOR_VIEJA, 0.9),
             (13.4, FRENTE - 15, 2.8, 62, 2.2, 8, FLOR, 0.9)]
    for k, (h, yaw, l1, t1, l2, t2, cols, r) in enumerate(ramas):
        q = rama(m, f'rama{k}', (0, h, 0), yaw, l1, t1, l2, t2)
        cabezuela(m, f'cabeza{k}', q, cols=cols, r=r, giro=15 * k)
    # cabezuela central, la mas grande y la primera en abrir
    cabezuela(m, 'cabeza_central', top, cols=FLOR, r=1.05)
    return m


def podrida():
    """Desenlace de estres: planta seca vencida de lado en gancho, ramas caidas con las cabezuelas
    colgando boca abajo (cafes, penacho negro, moho), hojas secas colgando, una cabezuela y hojas en el
    lomo, 2 moscas. 50 cubos."""
    m = Model('cartamo_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.6, 2, 1.6), (4.4, 0.2, 0.5), 'suelo_grieta', yaw=28)
    m.box('grieta2', (-2.8, 2, -1.0), (0.5, 0.2, 3.4), 'suelo_grieta', yaw=-18)
    m.box('moho_base', BASE, (1.6, 0.7, 1.6), 'moho_dark', yaw=20)
    lado = FRENTE - 80          # hacia donde se vence la planta (de medio lado a la camara)
    q0 = m.stem('tallo0', BASE, 6.0, 0.95, 'hoja_seca_dark', tilt=10, yaw=lado)
    q1 = m.stem('tallo1', q0, 4.6, 0.8, 'hoja_seca', tilt=32, yaw=lado)
    m.box('quiebre', q1, (0.9, 0.7, 0.9), 'podrido_dark', tilt=40, yaw=lado)
    top = m.stem('tallo2', q1, 2.6, 0.7, 'hoja_seca_dark', tilt=118, yaw=lado)
    colgada(m, 'cabeza_central', top, r=0.95, moho='moho')
    # ramas secas: salen del tallo y se doblan hacia abajo por el peso
    ramas = [(punta(BASE, 4.6, 10, lado), FRENTE + 75, 2.6, 50, 2.0, 125, 0.85, 'moho_light'),
             (punta(BASE, 5.6, 10, lado), FRENTE - 165, 2.4, 48, 1.8, 120, 0.8, None),
             (punta(q0, 2.8, 32, lado), FRENTE + 170, 2.2, 52, 1.8, 130, 0.8, 'moho')]
    for k, (p, yaw, l1, t1, l2, t2, r, mh) in enumerate(ramas):
        q = rama(m, f'rama{k}', p, yaw, l1, t1, l2, t2, cols=('hoja_seca_dark', 'hoja_seca'))
        colgada(m, f'cabeza{k}', q, r=r, giro=20 * k, moho=mh)
    # hojas secas colgando del tallo, asimetricas
    specs = [(punta(BASE, 2.2, 10, lado), FRENTE + 130, 4.2, 1.6, -58, MUERTA, 1),
             (punta(BASE, 3.6, 10, lado), FRENTE - 30, 4.4, 1.6, -50, SECA, 1),
             (punta(q0, 1.4, 32, lado), FRENTE + 230, 3.6, 1.4, -62, SECA, 1)]
    for k, (p, yaw, L, w, sube, cols, nd) in enumerate(specs):
        hoja(m, f'hoja{k}', p, yaw, L, w, cols=cols, sube=sube, dientes=nd)
    # una cabezuela y hojas caidas sobre el lomo
    cabezuela(m, 'cabeza_suelo', (2.4, 2.0, 2.0), cols=CABEZA_PODRIDA, r=0.75, giro=30, abierta=False)
    hoja(m, 'hoja_suelo0', (-4.6, 2.05, 1.4), 80, 4.0, 1.6, cols=MUERTA, sube=-2, dientes=1)
    hoja(m, 'hoja_suelo1', (3.8, 2.05, -2.6), 10, 3.6, 1.5, cols=SECA, sube=-2, dientes=0, punta=False)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(1.2, 12.6, 2.8, 25), (-2.6, 7.0, 3.4, -35)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


def punta(base, largo, tilt, yaw):
    """Punto a `largo` unidades sobre una caja inclinada desde base (misma cuenta que Model.stem)."""
    t, y = math.radians(tilt), math.radians(yaw)
    vz = largo * math.sin(t)
    return (base[0] + vz * math.sin(y), base[1] + largo * math.cos(t), base[2] + vz * math.cos(y))


ETAPAS = [('cartamo_siembra', siembra), ('cartamo_brote', brote), ('cartamo_crecimiento', crecimiento),
          ('cartamo_madurez', madurez), ('cartamo_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
