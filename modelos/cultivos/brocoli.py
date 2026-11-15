"""Generador del brocoli (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/brocoli.py

Brocoli (Brassica oleracea var. italica). Convenciones (docs/07): 1 celda = 16 unidades, origen en
el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de
surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las
alturas y tamanos son CUALITATIVOS, no medidas reales: la planta madura queda en ~13 unidades, con
la cabeza arriba de las hojas.

Rasgos que se respetan:
- TALLO GRUESO y erguido, verde claro ceroso, que se engrosa al crecer; las hojas salen de el a
  distintas alturas (no es una roseta pegada al suelo como la lechuga).
- Hojas GRANDES, oblongas y de borde ondulado, GLAUCAS (verde azulado con cera, chile_hoja_*),
  sobre PECIOLO LARGO y abiertas hacia afuera: las de abajo casi horizontales, las de arriba mas
  paradas. Nervadura central clara.
- En madurez, una CABEZA central de floretes verde oscuro y GRANULADA (bolitas agrupadas en domo,
  como la copa de un arbolito) sobre el tallo, con ramitas claras que asoman bajo el borde. Se
  distingue de la col (cabeza lisa, verde claro, sin tallo visible) y de la coliflor (cabeza crema).
- Siembra: semillas chicas, redondas y oscuras (cafe negruzco) sobre el lomo humedo.
- Plantula: dos cotiledones bilobulados (acorazonados, con muesca) sobre un tallito y la primera
  hoja verdadera.
- Desenlace: la cabeza se "espiga" y florea amarilla (flores de 4 petalos, yellow) por un lado y se
  pudre cafe con moho por el otro; hojas secas y marchitas vencidas, una tirada en el suelo, tallo
  oscuro y moscas.
Silueta a 20 px: tallo con hojas azuladas abiertas y un domo verde oscuro grumoso arriba.

Fuentes de forma (consultadas el 15/11):
- Ohio State University Extension, HYG-1605 (brocoli): la cabeza es un racimo de botones florales
  inmaduros sobre el tallo principal. https://ohioline.osu.edu/factsheet/hyg-1605
- Encyclopedia.pub, "Plant Growth and Development of Broccoli": etapas vegetativa, iniciacion y
  desarrollo de la cabeza (13 a 31 hojas antes de la cabeza). https://encyclopedia.pub/entry/35086
- Gardenary, "Is broccoli really a flower": cabeza de botones; al pasarse abre flores amarillas.
  https://www.gardenary.com/blog/is-broccoli-really-a-flower
- Epic Gardening, "How to grow broccoli": planta de 2 a 3 pies, tallo que se engrosa, hojas grandes
  parecidas a la col; espigado (bolting). https://www.epicgardening.com/growing-broccoli/
- PROSEA / Pl@ntNet, Brassica oleracea: hojas glabras cubiertas de cera; semilla globosa de 2 a 4
  mm, gris negra a cafe rojiza. https://uses.plantnet-project.org/en/Brassica_oleracea_(PROSEA)
- 7 CFR 201.56-3 (plantulas de Brassica): cotiledones bilobulados.
  https://www.law.cornell.edu/cfr/text/7/201.56-3

Colores solo de la paleta fija: chile_hoja_dark/_hoja/_hoja_light (hoja glauca y tallo, compartida
con col y coliflor), brocoli_cabeza_dark/_cabeza (floretes), yellow (floracion), wood_dark y
podrido_dark (semilla), y los marchitos compartidos (hoja_seca*, hoja_marchita, podrido*, moho*).
Las hojas giran en los tres ejes con `marco` y `caja` de calabacita.py (rotacion Euler ZYX
alrededor del centro de cada cubo, sin mover la caja).
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
from calabaza import mover  # noqa: E402
from calabacita import marco, caja, en  # noqa: E402  (giros libres en Euler ZYX)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)

# (peciolo, lamina, punta ondulada)
OSCURA = ('chile_hoja_light', 'chile_hoja_dark', 'chile_hoja')
MEDIA = ('chile_hoja_light', 'chile_hoja', 'chile_hoja_dark')
CLARA = ('chile_hoja_light', 'chile_hoja', 'chile_hoja_light')
SECA = ('hoja_seca', 'hoja_seca_dark', 'hoja_seca')
MARCHITA = ('hoja_seca_light', 'hoja_marchita', 'hoja_seca')
PODRIDA = ('hoja_seca_dark', 'podrido', 'hoja_seca_dark')


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, pec, p_pec, L, W, p_lam, cols=MEDIA, nervio=True, punta=True,
         grueso=0.4, gp=0.5):
    """Hoja de brasica desde `base` hacia `yaw`: peciolo largo y delgado (pendiente p_pec, negativo =
    sube), lamina oblonga ancha (pendiente p_lam) con nervadura central clara y una punta ondulada
    girada sobre su eje. Cubos: 2 + nervio + punta. Devuelve la punta."""
    r1 = marco(yaw, p_pec)
    caja(m, nombre + '_pec', en(base, r1, (0, 0, pec / 2)), (gp, gp, pec), cols[0], r1)
    fin = en(base, r1, (0, 0, pec - 0.2))
    r2 = marco(yaw, p_lam)
    lam = L - (1.4 if punta else 0)
    caja(m, nombre + '_lam', en(fin, r2, (0, 0, lam / 2)), (W, grueso, lam), cols[1], r2)
    if nervio:
        caja(m, nombre + '_nervio', en(fin, r2, (0, grueso / 2 + 0.05, lam * 0.45)), (0.45, 0.12, lam * 0.85),
             'chile_hoja_light' if cols[1].startswith('chile') else cols[0], r2)
    tip = en(fin, r2, (0, 0, lam))
    if punta:   # orilla ondulada: un tramo final un poco mas angosto, torcido y mas caido
        r3 = marco(yaw, p_lam + 14, espin=14 if sum(map(ord, nombre)) % 2 else -14)
        caja(m, nombre + '_punta', en(tip, r3, (0, 0, 0.75)), (W * 0.82, grueso, 1.6), cols[2], r3)
        tip = en(tip, r3, (0, 0, 1.5))
    return tip


def tallo(m, alto, ancho, col='chile_hoja_light', col2='chile_hoja'):
    """Tallo grueso octagonal: dos prismas cuadrados, uno girado 45 grados. 2 cubos."""
    m.box('tallo', BASE, (ancho, alto, ancho), col)
    m.box('tallo2', BASE, (ancho * 0.86, alto * 0.94, ancho * 0.86), col2, yaw=45)


def cabeza(m, y0, radio=3.2, cols=('brocoli_cabeza', 'brocoli_cabeza_dark'), sanos=None, pref='flor'):
    """Cabeza de floretes en domo sobre el tallo, apoyada en y0: nucleo oscuro, anillo de 8 bolitas,
    4 arriba y una corona. `sanos` (lista de indices del anillo) permite reemplazar bolitas en la
    podrida. Devuelve la lista de posiciones (x, y, z, yaw) del anillo y la altura de la cima."""
    m.box(pref + '_nucleo', (0, y0, 0), (radio * 1.55, 2.2, radio * 1.55), 'brocoli_cabeza_dark', yaw=22)
    anillo = []
    for k in range(8):
        a = 360 * k / 8 + 10
        p = mover((0, y0 + 0.5, 0), a, radio * 0.78, 0.25 * (k % 2))
        anillo.append((p[0], p[1], p[2], a))
        if sanos is None or k in sanos:
            m.box(f'{pref}_r{k}', p, (2.2, 1.9, 2.2), cols[k % 2], yaw=a + 15 * (k % 3))
    for k in range(4):
        a = 90 * k + 55
        p = mover((0, y0 + 1.9, 0), a, radio * 0.36, 0.2 * (k % 2))
        m.box(f'{pref}_t{k}', p, (2.1, 1.5, 2.1), cols[(k + 1) % 2], yaw=a + 20)
    m.box(pref + '_cima', (0.15, y0 + 3.0, -0.1), (1.8, 0.9, 1.8), cols[0], yaw=35)
    return anillo, y0 + 3.9


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: hoyo oscuro y 5 semillitas redondas cafe negruzco (cubos chicos
    girados), una medio tapada, y un terron. 11 cubos con el lomo."""
    m = Model('brocoli_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (6.4, 0.12, 4.2), 'suelo_humedo', yaw=-8)
    m.box('hoyo', (0, 2, 0.1), (4.0, 0.2, 2.8), 'soil', yaw=-8)
    semillas = [(-1.5, 0.6, 20, 'podrido_dark'), (0.1, 0.9, 45, 'podrido_dark'), (1.6, 0.3, 10, 'podrido_dark'),
                (-0.7, -0.5, 35, 'podrido_dark'), (0.8, -0.4, 60, 'wood_dark')]
    for k, (x, z, a, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.2, z), (0.6, 0.55, 0.6), col, yaw=a)
    m.box('tapado', (1.0, 2.2, -1.1), (1.0, 0.45, 0.9), 'soil_dark', yaw=25)
    m.box('terron', (-3.5, 2, -1.6), (1.3, 0.8, 1.1), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula: tallito claro, dos cotiledones bilobulados (cada uno dos lobulos abiertos en V que
    dejan la muesca del corazon) casi horizontales, y la primera hoja verdadera sobre su peciolo,
    erguida. 10 cubos con el lomo."""
    m = Model('brocoli_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.2, 2.6), 'suelo_humedo', yaw=-8)
    m.box('tallito', BASE, (0.55, 2.3, 0.55), 'chile_hoja_light')
    top = (0, 4.2, 0)
    eje = 115
    for k, lado in enumerate((0, 180)):
        yaw = eje + lado
        col = ('chile_hoja', 'chile_hoja_light')[k]
        # dos lobulos que se abren +-24 grados desde el cabito: forman el corazon con muesca en la punta
        for j, s in enumerate((-1, 1)):
            r = marco(yaw + 24 * s, -6)
            caja(m, f'cotiledon{k}_{j}', en(top, r, (0, 0, 1.25)), (1.15, 0.3, 1.9), col, r)
    # primera hoja verdadera: peciolo parado y lamina oblonga, ya glauca
    hoja(m, 'hoja1', (0, 4.1, 0), eje + 90, 1.4, -62, 1.9, 1.3, -40, cols=MEDIA, nervio=False, punta=False,
         grueso=0.3, gp=0.3)
    return m


def crecimiento():
    """Planta joven sin cabeza: tallo corto y grueso, 7 hojas glaucas grandes en espiral sobre peciolos
    largos (las bajas abiertas y oscuras, las altas paradas y claras) y un cogollo de hojitas al centro.
    30 cubos con el lomo."""
    m = Model('brocoli_crecimiento', PAL)
    monticulo(m)
    tallo(m, 3.6, 1.7)
    # (yaw, altura de salida, peciolo, pendiente peciolo, lamina, ancho, pendiente lamina, colores)
    specs = [(20, 0.8, 2.2, -22, 4.2, 2.8, -6, OSCURA), (157, 1.1, 2.2, -26, 4.2, 2.8, -8, OSCURA),
             (295, 1.4, 2.0, -32, 4.0, 2.7, -12, MEDIA), (72, 1.8, 2.0, -38, 3.8, 2.6, -16, MEDIA),
             (210, 2.2, 1.8, -46, 3.4, 2.4, -22, MEDIA), (347, 2.6, 1.6, -56, 3.0, 2.2, -32, CLARA),
             (125, 3.0, 1.4, -64, 2.6, 1.9, -44, CLARA)]
    for k, (yaw, h, pec, pp, L, W, pl, cols) in enumerate(specs):
        hoja(m, f'hoja{k}', mover(BASE, yaw, 0.6, h), yaw, pec, pp, L, W, pl, cols=cols, punta=k < 3)
    # cogollo: dos hojitas nuevas casi verticales en la punta del tallo
    for k, yaw in enumerate((60, 240)):
        r = marco(yaw, -72)
        caja(m, f'cogollo{k}', en((0, 5.4, 0), r, (0, 0, 0.9)), (1.2, 0.3, 1.9), 'chile_hoja_light', r)
    return m


HOJAS_MADUREZ = [
    # (yaw, altura de salida, peciolo, pendiente peciolo, lamina, ancho, pendiente lamina, colores)
    (15, 0.6, 2.4, -34, 5.0, 3.4, -8, OSCURA), (105, 0.9, 2.4, -36, 4.9, 3.4, -10, OSCURA),
    (195, 0.7, 2.4, -34, 5.0, 3.4, -6, OSCURA), (285, 1.0, 2.4, -36, 4.9, 3.4, -10, OSCURA),
    (60, 2.0, 2.8, -44, 4.4, 3.2, -30, MEDIA), (150, 2.3, 2.8, -46, 4.2, 3.2, -32, MEDIA),
    (240, 2.1, 2.8, -44, 4.4, 3.2, -30, MEDIA), (330, 2.5, 2.6, -48, 4.0, 3.0, -34, CLARA),
]


def madurez():
    """Planta lista para cosecha: tallo grueso y alto, 8 hojas glaucas grandes sobre peciolos largos
    (4 bajas abiertas casi horizontales, 4 altas mas paradas) y arriba la cabeza de floretes verde
    oscuro granulada en domo, con 3 ramitas claras que asoman bajo el borde. 53 cubos con el lomo."""
    m = Model('brocoli_madurez', PAL)
    monticulo(m)
    tallo(m, 5.4, 2.4)
    for k, (yaw, h, pec, pp, L, W, pl, cols) in enumerate(HOJAS_MADUREZ):
        hoja(m, f'hoja{k}', mover(BASE, yaw, 0.8, h), yaw, pec, pp, L, W, pl, cols=cols)
    # ramitas del arbolito bajo el borde de la cabeza
    for k, yaw in enumerate((40, 160, 280)):
        r = marco(yaw, -42)
        caja(m, f'ramita{k}', en((0, 6.8, 0), r, (0, 0, 1.4)), (0.8, 0.8, 2.6), 'chile_hoja_light', r)
    cabeza(m, 7.4)
    return m


def podrida():
    """Desenlace de estres: lomo seco con grietas, tallo oscuro, hojas secas y marchitas vencidas
    (las bajas tocan el lomo, una tirada en el suelo), la cabeza espigada: la mitad florea amarilla
    con varitas que se alargan y la otra mitad podrida cafe con moho, y dos moscas. 52 cubos con el
    lomo."""
    m = Model('brocoli_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.8, 2, -1.7), (3.4, 0.16, 0.45), 'suelo_grieta', yaw=28)
    m.box('grieta2', (-2.9, 2, 1.5), (0.45, 0.16, 2.6), 'suelo_grieta', yaw=-20)
    tallo(m, 5.0, 2.3, col='hoja_seca', col2='podrido')
    # hojas vencidas: peciolo casi plano y lamina colgando hacia el lomo
    vencidas = [(15, 1.0, 2.4, -2, 4.0, 2.8, 30, SECA), (105, 1.3, 2.4, 2, 4.0, 2.6, 34, MARCHITA),
                (285, 1.4, 2.4, 0, 4.0, 2.8, 32, PODRIDA), (60, 3.0, 2.2, -14, 3.8, 2.6, 40, MARCHITA),
                (240, 3.2, 2.2, -12, 3.8, 2.6, 44, SECA), (330, 3.6, 2.0, -20, 3.4, 2.4, 36, MARCHITA)]
    for k, (yaw, h, pec, pp, L, W, pl, cols) in enumerate(vencidas):
        hoja(m, f'hoja{k}', mover(BASE, yaw, 0.8, h), yaw, pec, pp, L, W, pl, cols=cols, punta=False)
    # hoja caida en el suelo, fuera del lomo (la que falta a 195 grados)
    m.box('hoja_suelo', (-2.2, 0, -6.4), (3.6, 0.25, 2.0), 'hoja_seca', yaw=-12)
    m.box('hoja_suelo_nervio', (-2.2, 0.25, -6.4), (3.0, 0.1, 0.4), 'hoja_seca_light', yaw=-12)
    # cabeza: el lado de -x podrido (cafe, hundido, con moho); el de +x se espiga y florea amarillo
    y0 = 6.9   # la cabeza podrida se ladea y se hunde un poco respecto a la madurez (7.4)
    m.box('flor_nucleo', (0, y0, 0), (4.8, 2.0, 4.8), 'podrido', yaw=22)
    for k in range(8):
        a = 360 * k / 8 + 10
        p = mover((0, y0 + 0.4, 0), a, 2.4, 0.2 * (k % 2))
        if math.sin(math.radians(a)) < 0.2:      # lado podrido: bolitas cafes hundidas
            m.box(f'flor_r{k}', (p[0], p[1] - 0.3, p[2]), (2.1, 1.5, 2.1), ('podrido_dark', 'podrido')[k % 2],
                  yaw=a + 10)
        else:                                     # lado que florea: floretes aun verdes
            m.box(f'flor_r{k}', p, (2.1, 1.8, 2.1), ('brocoli_cabeza', 'brocoli_cabeza_dark')[k % 2], yaw=a + 15)
    # varitas que se alargan (espigado) con su ramillete amarillo en la punta
    for k, (yaw, pitch, L) in enumerate([(70, -62, 3.4), (110, -72, 4.2), (30, -58, 3.0), (150, -66, 3.2)]):
        r = marco(yaw, pitch)
        b = mover((0, y0 + 1.6, 0), yaw, 0.9)
        caja(m, f'varita{k}', en(b, r, (0, 0, L / 2)), (0.4, 0.4, L), 'brocoli_cabeza', r)
        tip = en(b, r, (0, 0, L))
        m.box(f'amarillo{k}', (tip[0], tip[1] - 0.3, tip[2]), (1.4, 0.9, 1.4), 'yellow', yaw=yaw + 20)
    # moho sobre lo podrido
    m.box('moho1', (-1.4, y0 + 1.8, 0.5), (1.6, 0.35, 1.5), 'moho_light', yaw=20)
    m.box('moho2', (-0.8, y0 + 1.5, -1.6), (1.3, 0.3, 1.2), 'moho', yaw=-15)
    m.box('moho3', (-2.6, y0 + 0.9, -0.6), (0.8, 0.3, 1.2), 'moho_dark', yaw=40)
    m.box('escurrido', (-1.7, 2, 1.9), (1.8, 0.12, 1.4), 'podrido_dark', yaw=-25)
    m.box('petalos', (2.6, 2, 2.2), (1.1, 0.12, 0.9), 'yellow', yaw=30)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-2.6, 12.6, 1.6, 20), (-3.8, 10.6, -2.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('brocoli_siembra', siembra), ('brocoli_brote', brote), ('brocoli_crecimiento', crecimiento),
          ('brocoli_madurez', madurez), ('brocoli_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
