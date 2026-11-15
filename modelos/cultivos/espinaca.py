"""Generador de la espinaca (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/espinaca.py

Espinaca (Spinacia oleracea). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de
la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz
(14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas y tamanos son
CUALITATIVOS, no medidas reales: la roseta madura queda en ~6 unidades sobre el suelo (mas baja y
abierta que la lechuga) y el tallo floral del espigado llega a ~14.

Rasgos que se respetan:
- ROSETA basal sobre un tallo corto y comprimido: las hojas salen en espiral del centro (angulo de oro)
  y se abren hacia afuera, planas; las viejas mas grandes, bajas y oscuras, las nuevas chicas y
  paradas.
- Hoja LISA, sin dientes ni rizos, de lamina ovada en punta o en punta de flecha (hastada, con dos
  lobulos basales en algunas hojas exteriores), VERDE OSCURO BRILLANTE (espinaca_hoja_dark /
  espinaca_hoja) con la nervadura central clara (leaf_light) como brillo.
- PECIOLO largo y verde claro (leaf_light / leaf) bien visible entre el centro y la lamina: es lo que
  separa la roseta abierta de la espinaca de la cabeza rizada y clara de la lechuga.
- Germinacion epigea: la plantula muestra dos cotiledones angostos y largos (en tira) y las dos
  primeras hojas verdaderas en punta.
- Semilla redonda (tipo de semilla lisa), chica, cafe clara, sobre el lomo humedo.
- Desenlace: la planta ESPIGA (el tallo se alarga y la roseta se deshace); tallo floral alto y
  amarillento con hojitas angostas y racimos de flores chicas verde amarillentas en las axilas y en
  la punta; las hojas de la roseta, vencidas sobre el lomo, amarillas y cafes con moho; una hoja caida
  en el suelo y dos moscas.
Silueta a 20 px: roseta plana verde oscura con peciolos claros, distinta de la lechuga (bola verde
clara rizada).

Fuentes de forma (consultadas el 15/11):
- PROTA (Pl@ntUse), Spinacia oleracea: hojas simples, enteras, en roseta y luego en espiral; peciolo
  de 6 a 12 cm; lamina angular-ovada a hastada (punta de flecha) con lobulos basales redondos o
  agudos, de verde palido a verde oscuro; germinacion epigea; fruto de una semilla, redondo en los
  cultivares sin espinas; flores chicas verdosas en glomerulos axilares, las masculinas en espiga.
  https://plantuse.plantnet.org/en/Spinacia_oleracea_(PROTA)
- Virginia Tech, Vegetable Seed Production: Spinach: fase vegetativa con tallo corto comprimido y
  roseta; con dias largos y calor el tallo se alarga (espiga) y la roseta se deshace.
  https://welbaum.spes.vt.edu/seedproduction/spinach.html
- UW-Madison Extension, Spinach (guia de huerta): roseta de hoja lisa o arrugada, espigado con calor.
  https://hort.extension.wisc.edu/articles/spinach/
La forma de los cotiledones (angostos y largos) viene del encargo de diseno; no se encontro una
fuente que la describa, asi que se toma como rasgo cualitativo.

Colores solo de la paleta fija: espinaca_hoja_dark/_hoja (lamina), leaf_light y leaf (peciolo,
nervadura, cotiledones), hoja_seca y wood (semilla), cereal_hoja_light y yellow (espigado), y los
marchitos compartidos (hoja_seca*, hoja_marchita, podrido*, moho*). Las hojas giran en los tres
ejes con `marco` y `caja` de calabacita.py (rotacion Euler ZYX alrededor del centro de cada cubo,
sin mover la caja).
"""
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
from calabaza import mover  # noqa: E402
from calabacita import marco, caja, en  # noqa: E402  (giros libres en Euler ZYX)

BASE = (0, 2, 0)      # anclaje: encima del monticulo (igual que el maiz)
ORO = 137.5           # angulo de oro: las hojas de la roseta salen en espiral sin encimarse

OSCURA = 'espinaca_hoja_dark'
HOJA = 'espinaca_hoja'


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, Lp, pp, Lb, W, pb, col=HOJA, pec='leaf_light', punta=None, nervio=None,
         lobulos=False, grueso=0.4):
    """Hoja lisa de espinaca: peciolo de largo Lp con pendiente pp (negativo = sube), lamina plana de
    W x Lb con pendiente pb, punta en rombo (cuadrado girado 45 grados en el plano de la hoja) y, si se
    pide, nervadura clara encima y dos lobulos basales (punta de flecha). Lp = 0 deja la hoja sin
    peciolo. Cubos: 2 (+1 peciolo, +1 nervio, +2 lobulos). Devuelve la punta."""
    fin = base
    if Lp:
        rp = marco(yaw, pp)
        caja(m, nombre + '_pec', en(base, rp, (0, 0, Lp / 2)), (0.5, 0.45, Lp), pec, rp)
        fin = en(base, rp, (0, 0, Lp))
    rb = marco(yaw, pb)
    caja(m, nombre + '_lamina', en(fin, rb, (0, 0, Lb / 2 - 0.3)), (W, grueso, Lb), col, rb)
    s = W * 0.66
    rt = marco(yaw, pb, giro=45)
    cpunta = en(fin, rb, (0, -0.02, Lb - 0.3))
    caja(m, nombre + '_punta', cpunta, (s, grueso * 0.9, s), punta or col, rt)
    if nervio:
        caja(m, nombre + '_nervio', en(fin, rb, (0, grueso / 2 + 0.05, Lb * 0.42)), (0.32, 0.1, Lb * 0.78),
             nervio, rb)
    if lobulos:
        for lado in (1, -1):
            rl = marco(yaw, pb, giro=-52 * lado)
            caja(m, f'{nombre}_lobulo{"d" if lado > 0 else "i"}', en(fin, rb, (lado * W * 0.5, -0.03, 0.45)),
                 (W * 0.4, grueso * 0.9, 1.9), col, rl)
    return en(fin, rb, (0, 0, Lb - 0.3 + s * 0.7))


def roseta(m, nombre, specs, giro=0.0, r0=0.3, y0=0.35):
    """Hojas en espiral (angulo de oro) desde el centro. specs = [(Lp, pp, Lb, W, pb, opciones), ...]."""
    for k, (Lp, pp, Lb, W, pb, op) in enumerate(specs):
        yaw = giro + ORO * k
        hoja(m, f'{nombre}{k}', mover(BASE, yaw, r0, y0), yaw, Lp, pp, Lb, W, pb, **op)


def punto(a, b, t):
    """Punto a + t (b - a)."""
    return tuple(a[i] + t * (b[i] - a[i]) for i in range(3))


def mosca(m, nombre, p, yaw):
    m.box(nombre, p, (0.6, 0.4, 0.6), 'black', yaw=yaw)
    m.box(nombre + '_ala', (p[0], p[1] + 0.4, p[2]), (1.1, 0.1, 0.4), 'moho_light', yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con una franja oscura y semillitas redondas cafe claro (dos hechas de dos cubos
    cruzados para que se lean redondas), una medio tapada. 12 cubos con el lomo."""
    m = Model('espinaca_siembra', PAL)
    monticulo(m)
    m.box('franja', (0, 2, 0), (9.0, 0.14, 2.2), 'suelo_humedo', yaw=-6)
    semillas = [(-3.4, 0.4, 20, 'hoja_seca'), (-2.0, -0.3, 55, 'wood'), (-0.6, 0.35, 10, 'hoja_seca'),
                (0.9, -0.2, 40, 'wood'), (2.3, 0.3, -15, 'hoja_seca'), (3.6, -0.45, 30, 'hoja_seca')]
    for k, (x, z, a, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.14, z), (0.7, 0.5, 0.7), col, yaw=a)
        if k in (0, 4):   # octagono: se lee redonda
            m.box(f'semilla{k}b', (x, 2.14, z), (0.7, 0.5, 0.7), col, yaw=a + 45)
    m.box('tapado', (0.95, 2.14, -0.05), (0.9, 0.45, 0.8), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula: tallito claro, dos cotiledones angostos y largos casi horizontales y dos hojitas
    verdaderas oscuras en punta, mas paradas, sobre peciolo claro. 12 cubos con el lomo."""
    m = Model('espinaca_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.14, 2.8), 'suelo_humedo', yaw=-6)
    m.box('tallito', BASE, (0.45, 1.1, 0.45), 'leaf_light')
    top = (0, 3.0, 0)
    for k, yaw in enumerate((105, 285)):
        r = marco(yaw, -12)
        caja(m, f'cotiledon{k}', en(top, r, (0, 0, 1.55)), (0.55, 0.25, 3.0), 'leaf', r)
    for k, (yaw, Lp, pp, Lb, W, pb) in enumerate([(25, 1.0, -48, 2.0, 1.4, -22), (205, 0.9, -54, 1.7, 1.2, -28)]):
        hoja(m, f'hoja{k + 1}', mover(top, yaw, 0.1, 0.0), yaw, Lp, pp, Lb, W, pb, col=HOJA, grueso=0.3)
    return m


def crecimiento():
    """Roseta abierta de 7 hojas lisas en espiral sobre peciolos claros: las 2 viejas grandes, bajas y
    verde muy oscuro (una en punta de flecha), las nuevas chicas, paradas y verde brillante, con la
    nervadura clara en dos. 28 cubos con el lomo."""
    m = Model('espinaca_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.2, 0.6, 1.2), 'leaf', yaw=15)
    roseta(m, 'hoja', [
        (1.9, -26, 3.2, 2.4, -2, dict(col=OSCURA, pec='leaf', lobulos=True)),
        (1.9, -28, 3.1, 2.4, 0, dict(col=OSCURA, pec='leaf', nervio='leaf_light')),
        (1.7, -34, 2.9, 2.2, -6, dict(col=HOJA)),
        (1.6, -40, 2.6, 2.0, -12, dict(col=HOJA, nervio='leaf_light')),
        (1.4, -48, 2.2, 1.8, -18, dict(col=HOJA)),
        (1.2, -56, 1.9, 1.5, -26, dict(col=HOJA)),
        (1.0, -64, 1.5, 1.2, -36, dict(col=HOJA)),
    ], giro=20)
    return m


def madurez():
    """Roseta llena y densa en abanico, lista para cortar: 7 hojas exteriores grandes y planas (verde
    muy oscuro y oscuro alternadas, tres en punta de flecha y cuatro con la nervadura clara de brillo),
    5 intermedias mas paradas y 2 nuevas al centro, todas sobre peciolos claros. 56 cubos con el lomo."""
    m = Model('espinaca_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.8, 0.6, 1.8), 'leaf', yaw=20)
    ext = []
    for k in range(7):
        op = dict(col=OSCURA if k % 2 == 0 else HOJA, pec='leaf' if k % 2 == 0 else 'leaf_light')
        if k in (0, 3, 5):
            op['lobulos'] = True
        if k in (1, 2, 4, 6):
            op['nervio'] = 'leaf_light'
        ext.append((2.5, -36 + 2 * (k % 3), 3.7, 2.9, -6 + 3 * (k % 2), op))
    roseta(m, 'ext', ext, giro=10, r0=0.5, y0=0.3)
    roseta(m, 'med', [(1.9, -52, 3.1, 2.4, -20 + 2 * (k % 2), dict(col=HOJA)) for k in range(5)],
           giro=40, r0=0.4, y0=0.45)
    roseta(m, 'int', [(1.1, -70, 2.0, 1.5, -46, dict(col=HOJA, nervio='leaf_light')),
                      (1.0, -74, 1.7, 1.3, -52, dict(col=HOJA))], giro=75, r0=0.2, y0=0.5)
    return m


def podrida():
    """Desenlace: la planta espiga. Tallo floral alto y amarillento, algo chueco, con hojitas angostas
    y racimos de flores verde amarillentas en las axilas y la punta; la roseta de abajo vencida sobre el
    lomo seco, amarilla y cafe, con moho y una mancha podrida; una hoja caida en el suelo y dos moscas.
    49 cubos con el lomo."""
    m = Model('espinaca_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta', (-2.6, 2, 1.7), (3.4, 0.16, 0.45), 'suelo_grieta', yaw=-24)
    m.box('corona', BASE, (1.8, 0.6, 1.8), 'hoja_seca_dark', yaw=20)
    # roseta vencida: el peciolo casi plano y la lamina cayendo sobre el lomo
    roseta(m, 'baja', [
        (2.4, -8, 3.4, 2.6, 14, dict(col='hoja_seca', pec='hoja_seca_light')),
        (2.3, -10, 3.3, 2.6, 12, dict(col='hoja_marchita', pec='hoja_seca_light', punta='hoja_seca')),
        (2.4, -6, 3.2, 2.5, 16, dict(col='hoja_seca_dark', pec='hoja_seca', punta='podrido')),
        (2.2, -12, 3.2, 2.4, 10, dict(col='hoja_marchita', pec='hoja_marchita', lobulos=True)),
        (2.1, -14, 3.0, 2.3, 8, dict(col='hoja_seca', pec='hoja_seca_light')),
        (1.8, -24, 2.6, 2.0, 2, dict(col='hoja_marchita', pec='cereal_hoja_light', punta='hoja_seca')),
    ], giro=25, r0=0.6, y0=0.3)
    # moho y pudricion sobre tres laminas
    for k, (yaw, d, col) in enumerate([(25, 3.9, 'moho'), (25 + ORO * 2, 3.7, 'podrido_dark'),
                                       (25 + ORO * 4, 3.6, 'moho_light')]):
        r = marco(yaw, 12)
        p = mover(BASE, yaw, d, 0.42)
        caja(m, f'mancha{k}', en(p, r, (0.3, 0.26, 0)), (1.3, 0.12, 1.1), col, r)
    # hoja caida en el suelo, fuera del lomo
    m.box('hoja_suelo', (-3.6, 0, 6.3), (2.4, 0.25, 1.4), 'hoja_seca_dark', yaw=28)
    m.box('hoja_suelo_punta', (-2.3, 0.02, 5.6), (1.0, 0.22, 1.0), 'podrido', yaw=73)
    # tallo floral: dos tramos, el de arriba mas chueco
    t1 = m.stem('tallo1', BASE, 7.0, 0.8, 'hoja_marchita', tilt=5, yaw=30)
    t2 = m.stem('tallo2', t1, 5.2, 0.6, 'hoja_marchita', tilt=12, yaw=60)
    # hojitas del tallo, angostas y en punta, alternas
    for k, (t, seg, yaw, col) in enumerate([(0.35, 1, 200, 'cereal_hoja_light'), (0.7, 1, 20, 'hoja_marchita'),
                                            (0.25, 2, 240, 'cereal_hoja_light'), (0.6, 2, 70, 'cereal_hoja_light')]):
        p = punto(BASE, t1, t) if seg == 1 else punto(t1, t2, t)
        hoja(m, f'hojita{k}', mover(p, yaw, 0.3), yaw, 0, 0, 1.8 - 0.25 * k, 0.8, -38, col=col, grueso=0.25)
    # racimos de flores (glomerulos) en las axilas y la espiga de la punta
    for k, (t, seg, yaw, col) in enumerate([(0.55, 1, 120, 'yellow'), (0.9, 1, 300, 'cereal_hoja_light'),
                                            (0.45, 2, 150, 'yellow'), (0.8, 2, 330, 'yellow')]):
        p = punto(BASE, t1, t) if seg == 1 else punto(t1, t2, t)
        m.box(f'flores{k}', mover(p, yaw, 0.55, -0.4), (0.9, 0.8, 0.9), col, yaw=yaw + 20)
    m.box('espiga', t2, (0.7, 1.6, 0.7), 'yellow', yaw=15)
    m.box('espiga2', (t2[0], t2[1] + 0.4, t2[2]), (1.0, 0.8, 1.0), 'cereal_hoja_light', yaw=60)
    # moscas (lo unico que flota a proposito)
    mosca(m, 'mosca0', (2.6, 6.4, 2.2), 20)
    mosca(m, 'mosca1', (-2.8, 5.2, -1.6), -40)
    return m


ETAPAS = [('espinaca_siembra', siembra), ('espinaca_brote', brote), ('espinaca_crecimiento', crecimiento),
          ('espinaca_madurez', madurez), ('espinaca_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
