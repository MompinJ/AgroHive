"""Generador de la col (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/col.py

Col o repollo (Brassica oleracea var. capitata), tipo blanco de cabeza redonda. Convenciones
(docs/07): 1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z
frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje (0, 2, 0), y
caben en una huella de 16x16. Las alturas y tamanos son CUALITATIVOS, no medidas reales: la planta
madura es BAJA y ancha (~15 unidades de ancho por ~10 de alto), con la cabeza a la vista.

Rasgos que se respetan:
- Tallo corto y grueso: todas las hojas salen casi del suelo, en roseta.
- Hojas exteriores GRANDES, anchas y redondeadas (sin rizo), lisas y cerosas, verde azulado
  (glaucas, brasica_hoja_*), con la nervadura central blanca y marcada; abiertas como una COPA:
  suben desde el tallo, se aplanan y la orilla se dobla un poco hacia afuera.
- Hojas de envoltura mas claras que abrazan la parte baja de la cabeza.
- CABEZA redonda, lisa y apretada (hojas de cabeceo encimadas), verde claro (col_cabeza), como una
  bola que sobresale de la copa.
- Siembra: semillas chicas, redondas y oscuras (cafe rojizo) sobre el lomo humedo.
- Plantula: dos cotiledones acorazonados (con escotadura en la punta) y la primera hoja verdadera.
- Crecimiento: roseta de hojas glaucas en la que las de adentro ya se cierran sobre el centro.
- Desenlace: hojas exteriores cafes caidas sobre el lomo (una en el suelo), cabeza rajada y hundida
  con pudricion y moho, y moscas.
Silueta a 20 px: bola lisa verde clara dentro de una copa azulada. Se distingue de la lechuga (rizada,
verde claro, sin bola lisa), del brocoli (cabeza granulada verde oscura) y de la coliflor (crema).

Fuentes de forma (consultadas el 15/11):
- PROSEA / PROTA, Brassica oleracea (col de cabeza): hojas glabras cubiertas de cera, gris a verde
  azulado en la roseta y blanco cremoso dentro de la cabeza; las primeras hojas forman roseta y las
  siguientes solo se abren a medias y forman la cabeza mientras el tallo engruesa.
  https://prosea.prota4u.org/view.aspx?id=2151
  https://uses.plantnet-project.org/en/Brassica_oleracea_-_headed_cabbage_(PROTA)
- Encyclopedia.com, Cabbage and crucifer plants: la cabeza es un conjunto de hojas encimadas sobre un
  tallo acortado. https://encyclopedia.com/food/encyclopedias-almanacs-transcripts-and-maps/cabbage-and-crucifer-plants
- Plants 2024 (PMC10934306), formacion de la cabeza: hojas de plantula, de roseta, de plegado y de
  cabeceo; las de cabeceo se curvan hacia adentro. https://pmc.ncbi.nlm.nih.gov/articles/PMC10934306

Colores solo de la paleta fija: brasica_hoja_dark/_hoja/_hoja_light, col_cabeza, white (nervadura),
wood_dark y podrido_dark (semilla) y los marchitos compartidos (hoja_seca*, hoja_marchita, podrido*,
moho*). Las hojas giran en los tres ejes con `marco` y `caja` de calabacita.py (Euler ZYX alrededor
del centro de cada cubo, sin mover la caja).
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

OSCURA = ('brasica_hoja_dark', 'brasica_hoja', 'brasica_hoja')
MEDIA = ('brasica_hoja_dark', 'brasica_hoja', 'brasica_hoja_light')
FALDON = ('brasica_hoja_dark', 'brasica_hoja_dark', 'brasica_hoja_dark')
COPA = (('brasica_hoja_dark', 'brasica_hoja', 'brasica_hoja'), ('brasica_hoja', 'brasica_hoja_light', 'brasica_hoja_light'))
CLARA = ('brasica_hoja', 'brasica_hoja_light', 'brasica_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')
MARCHITA = ('hoja_seca', 'hoja_marchita', 'hoja_seca')
PODRE = ('podrido', 'hoja_seca_dark', 'hoja_seca')


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, p1, L1, W1, p2, L2, W2, cols=MEDIA, nervio=None, punta=True, p3=None,
         grueso=0.5):
    """Hoja de col lisa y redondeada desde `base` hacia `yaw`: tramo basal angosto (pendiente p1),
    lamina ancha (p2) y punta mas angosta (p3) que redondea la orilla. Pendiente negativa = sube,
    positiva = cae. Con `nervio`, la nervadura central sobre la lamina. Cubos: 2 o 3 (+1 con nervio).
    Devuelve el final de la lamina."""
    r1 = marco(yaw, p1)
    caja(m, nombre + '_base', en(base, r1, (0, 0, L1 / 2)), (W1, grueso, L1), cols[0], r1)
    fin = en(base, r1, (0, 0, L1 - 0.25))
    r2 = marco(yaw, p2)
    caja(m, nombre + '_lamina', en(fin, r2, (0, 0, L2 / 2)), (W2, grueso * 0.9, L2), cols[1], r2)
    fin2 = en(fin, r2, (0, 0, L2 - 0.25))
    if punta:
        r3 = marco(yaw, p2 + 14 if p3 is None else p3)
        caja(m, nombre + '_punta', en(fin2, r3, (0, 0, 0.6)), (W2 * 0.62, grueso * 0.85, 1.3), cols[2], r3)
    if nervio:
        caja(m, nombre + '_nervio', en(fin, r2, (0, grueso * 0.45 + 0.05, L2 * 0.42)), (0.5, 0.12, L2 * 0.9),
             nervio, r2)
    return fin2


def cotiledon(m, nombre, top, yaw, col_a, col_b, largo=1.4, ancho=0.95, pend=-12):
    """Cotiledon acorazonado: dos lobulos que se abren en V desde el peciolo y dejan la escotadura en la
    punta (lejos del tallo). 2 cubos."""
    for k, s in enumerate((1, -1)):
        r = marco(yaw, pend, giro=14 * s)
        p = en(top, marco(yaw, pend), (0.3 * s, 0, 0.35))
        caja(m, f'{nombre}_lobulo{k}', en(p, r, (0, 0, largo / 2)), (ancho, 0.28, largo), col_a if k == 0 else col_b, r)


def bola(m, nombre, c, R, col='col_cabeza', sy=1.0, col_diag=None):
    """Cabeza redonda escalonada con centro c y radio R: ecuador en cruz (dos cajas y una girada 45 que
    llena las diagonales), bandas alta y baja mas angostas y una tapa. `sy` < 1 la aplasta (cabeza
    vencida) y `col_diag` pinta las diagonales de otro color. 6 cubos."""
    x, y, z = c
    h = R * sy
    m.box(nombre + '_ec1', (x, y - 0.45 * h, z), (2 * R, 0.9 * h, 1.45 * R), col)
    m.box(nombre + '_ec2', (x, y - 0.45 * h, z), (1.45 * R, 0.9 * h, 2 * R), col)
    m.box(nombre + '_diag', (x, y - 0.45 * h, z), (1.7 * R, 0.9 * h, 1.7 * R), col_diag or col, yaw=45)
    m.box(nombre + '_alta', (x, y + 0.45 * h, z), (1.6 * R, 0.37 * h, 1.6 * R), col, yaw=22)
    m.box(nombre + '_baja', (x, y - 0.8 * h, z), (1.6 * R, 0.36 * h, 1.6 * R), col, yaw=22)
    m.box(nombre + '_tapa', (x, y + 0.82 * h, z), (1.0 * R, 0.2 * h, 1.0 * R), col, yaw=-12)


# ---------------- etapas ----------------
def siembra():
    """Lomo recien regado: una raya humeda oscura (el surquito) y, en fila junto a ella sobre la tierra
    clara, 5 semillitas redondas cafe oscuro, una medio tapada en lo humedo, y un terron. 10 cubos con
    el lomo."""
    m = Model('col_siembra', PAL)
    monticulo(m)
    m.box('surquito', (0, 2, -0.9), (8.8, 0.12, 1.3), 'suelo_humedo', yaw=-4)
    semillas = [(-3.3, 0.55, 'wood_dark'), (-1.65, 0.35, 'wood_dark'), (0.0, 0.6, 'podrido_dark'),
                (1.65, 0.3, 'wood_dark'), (3.3, -0.85, 'wood_dark')]
    for k, (x, z, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.0 if z > 0 else 2.12, z), (0.75, 0.62, 0.75), col, yaw=20 + 25 * k)
    m.box('tapado', (3.55, 2.12, -0.75), (0.8, 0.42, 0.9), 'soil_dark', yaw=15)
    m.box('terron', (-3.8, 2, -2.3), (1.3, 0.7, 1.1), 'soil_dark', yaw=30)
    return m


def brote():
    """Plantula: tallito corto, dos cotiledones acorazonados casi horizontales y la primera hoja
    verdadera glauca, mas erguida, con su nervio claro. 10 cubos con el lomo."""
    m = Model('col_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.6, 0.16, 3.0), 'suelo_humedo', yaw=-8)
    m.box('tallito', BASE, (0.5, 1.2, 0.5), 'brasica_hoja_light')
    top = (0, 3.1, 0)
    cotiledon(m, 'cot0', top, 100, 'brasica_hoja', 'brasica_hoja_light')
    cotiledon(m, 'cot1', top, 280, 'brasica_hoja_light', 'brasica_hoja')
    # primera hoja verdadera: peciolo y lamina redondeada, mas parada
    r = marco(15, -50)
    caja(m, 'hoja1_pec', en(top, r, (0, 0, 0.55)), (0.35, 0.3, 1.1), 'brasica_hoja_light', r)
    p = en(top, r, (0, 0, 1.0))
    r2 = marco(15, -22)
    caja(m, 'hoja1_lamina', en(p, r2, (0, 0, 0.85)), (1.6, 0.3, 1.7), 'brasica_hoja', r2)
    return m


def crecimiento():
    """Roseta de 7 hojas glaucas: 5 exteriores anchas que suben un poco y se abren (nervio blanco) y 2
    interiores claras que suben y se doblan sobre el centro, donde empieza a cerrarse un cogollo verde
    claro. 28 cubos con el lomo."""
    m = Model('col_crecimiento', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.4, 0.7, 1.4), 'brasica_hoja_light', yaw=15)
    for k in range(5):
        yaw = 15 + 72 * k
        hoja(m, f'ext{k}', mover(BASE, yaw, 0.6, 0.4), yaw, -36 + 6 * (k % 2), 1.8, 2.2, -12 + 4 * (k % 2),
             2.5, 3.8, cols=COPA[k % 2], nervio='white', p3=6)
    # interiores: suben empinadas y la lamina se dobla sobre el centro
    for k in range(2):
        yaw = 50 + 180 * k
        hoja(m, f'int{k}', mover(BASE, yaw, 1.1, 0.5), yaw, -72, 1.8, 2.0, -118, 1.4, 2.8, cols=CLARA,
             punta=False)
    m.box('cogollo', (0, 2.5, 0), (2.0, 2.0, 2.0), 'col_cabeza', yaw=30)
    return m


def madurez():
    """Col lista: 4 hojas viejas bajas y oscuras (faldon) y 6 que suben en copa, glaucas y con nervio
    blanco; 5 hojas de envoltura claras que abrazan la parte baja de la cabeza, y la cabeza redonda, lisa
    y apretada verde claro, con la orilla de una hoja de cabeceo apenas marcada. 55 cubos con el lomo."""
    m = Model('col_madurez', PAL)
    monticulo(m)
    m.box('tallo', BASE, (2.2, 0.8, 2.2), 'brasica_hoja_light', yaw=20)
    # faldon: 4 hojas viejas, bajas y oscuras, casi planas sobre el lomo (en las diagonales)
    for k in range(4):
        yaw = 45 + 90 * k
        hoja(m, f'faldon{k}', mover(BASE, yaw, 1.5, 0.25), yaw, -20, 2.0, 3.0, -2, 2.8, 5.2,
             cols=FALDON, nervio='white', p3=12)
    # copa: 6 hojas que suben empinadas, la lamina se abre y la orilla se dobla hacia afuera
    for k in range(6):
        yaw = 60 * k + (6 if k % 2 else -4)
        hoja(m, f'copa{k}', mover(BASE, yaw, 1.2, 0.4), yaw, -56 + 4 * (k % 2), 2.2, 2.6, -32 + 5 * (k % 3),
             3.0, 4.6, cols=COPA[k % 2], nervio='white', p3=-2)
    # envoltura: casi verticales, abrazan la parte baja de la cabeza
    for k in range(5):
        yaw = 46 + 72 * k
        r = marco(yaw, -62)
        b = mover(BASE, yaw, 2.5, 0.7)
        caja(m, f'envoltura{k}', en(b, r, (0, 0, 1.5)), (3.4, 0.45, 3.0), 'brasica_hoja_light' if k % 2 else 'brasica_hoja', r)
    bola(m, 'cabeza', (0, 6.0, 0), 3.1)
    # orilla de una hoja de cabeceo, en relieve sobre la banda alta de la cabeza
    r = marco(30, 0)
    caja(m, 'cabeceo', en((0, 8.54 + 0.09, 0), r, (2.0, 0, 0)), (0.3, 0.18, 2.6), 'brasica_hoja_light', r)
    return m


def podrida():
    """Desenlace de estres: lomo seco y agrietado, hojas exteriores cafes y marchitas caidas sobre el
    lomo (una suelta en el suelo), envolturas vencidas, cabeza ladeada y rajada con el interior podrido,
    moho y dos moscas. 51 cubos con el lomo."""
    m = Model('col_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.8, 2, -1.8), (3.4, 0.16, 0.45), 'suelo_grieta', yaw=30)
    m.box('grieta2', (-3.0, 2, 1.5), (0.45, 0.16, 2.6), 'suelo_grieta', yaw=-20)
    m.box('tallo', BASE, (2.2, 0.6, 2.2), 'podrido_dark', yaw=20)
    # exteriores vencidas: el tramo basal casi plano y la lamina colgando sobre el lomo
    ext = [(10, 4, 18, SECA), (62, 0, 14, MARCHITA), (115, 6, 22, PODRE), (170, 2, 16, SECA),
           (240, 5, 20, MARCHITA), (300, 3, 18, SECA)]
    for k, (yaw, p1, p2, cols) in enumerate(ext):
        hoja(m, f'ext{k}', mover(BASE, yaw, 1.4, 0.3), yaw, p1, 2.0, 2.4, p2, 2.6, 4.2, cols=cols,
             nervio='hoja_seca_light' if k in (0, 3) else None, p3=p2 + 10)
    # hoja suelta en el suelo, fuera del lomo
    m.box('hoja_suelo', (5.4, 0, 6.0), (3.0, 0.25, 2.2), 'hoja_seca', yaw=-30)
    m.box('hoja_suelo_nervio', (5.4, 0.25, 6.0), (2.6, 0.1, 0.4), 'hoja_seca_light', yaw=-30)
    # envolturas vencidas hacia afuera
    for k in range(3):
        yaw = 80 + 120 * k
        r = marco(yaw, -38)
        b = mover(BASE, yaw, 2.6, 0.5)
        caja(m, f'envoltura{k}', en(b, r, (0, 0, 1.4)), (3.4, 0.45, 2.8), 'hoja_marchita' if k % 2 else 'hoja_seca', r)
    # cabeza vencida: la misma bola, aplastada y corrida, con un costado amarillento, una raja en la
    # tapa que deja ver lo podrido, manchas blandas y moho
    c = (0.4, 4.6, -0.2)
    R = 3.0
    bola(m, 'cabeza', c, R, sy=0.78, col_diag='hoja_marchita')
    tope = c[1] + 1.02 * R * 0.78
    m.box('costado', (c[0] + 2.95, 2.9, c[2] - 0.2), (0.4, 2.6, 3.6), 'hoja_marchita', yaw=-6)
    m.box('costado2', (c[0] + 1.9, 2.9, c[2] + 2.55), (2.4, 2.1, 0.4), 'hoja_marchita', yaw=40)
    m.box('raja', (c[0] - 0.2, tope, c[2] + 0.2), (0.6, 0.12, 3.2), 'podrido_dark', yaw=12)
    m.box('raja_lado', (c[0] - 0.2, c[1] - 1.1, c[2] + R + 0.05), (0.6, 2.5, 0.3), 'podrido_dark')
    m.box('hundido', (c[0] + 0.9, tope - 0.25, c[2] + 0.5), (1.8, 0.4, 2.0), 'podrido', yaw=20)
    m.box('mancha1', (c[0] - 1.6, 3.4, c[2] + 2.85), (1.5, 1.3, 0.3), 'podrido', yaw=-8)
    m.box('mancha2', (c[0] - 2.95, 3.0, c[2] - 1.0), (0.3, 1.2, 1.4), 'podrido_dark', yaw=4)
    m.box('moho1', (c[0] - 1.2, tope - 0.1, c[2] - 0.7), (1.5, 0.3, 1.4), 'moho_light', yaw=20)
    m.box('moho2', (c[0] + 0.6, c[1] + 0.9, c[2] + 2.3), (1.3, 0.3, 1.0), 'moho', yaw=-15)
    m.box('moho3', (c[0] + 0.3, 2.2, c[2] + 3.4), (1.4, 0.3, 1.0), 'moho_dark', yaw=35)
    m.box('escurrido', (-1.8, 2, 3.2), (2.0, 0.12, 1.4), 'podrido_dark', yaw=-25)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(1.8, 8.6, 1.4, 20), (-2.6, 7.6, -1.8, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('col_siembra', siembra), ('col_brote', brote), ('col_crecimiento', crecimiento),
          ('col_madurez', madurez), ('col_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
