"""Generador del betabel (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/betabel.py

Betabel o remolacha de mesa (Beta vulgaris, grupo de cultivares de raiz roja). Convenciones
(docs/07): 1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba,
+Z frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje (0, 2, 0),
y caben en una huella de 16x16. Las alturas y tamanos son CUALITATIVOS, no medidas reales: la
roseta adulta queda como mata media (~11-12 de alto), la raiz agrandada para que se lea a 20 px y
el glomerulo (la "semilla") tambien agrandado.

Rasgos que se respetan (y que lo separan del rabano, bolita roja chica con punta blanca y hoja
verde clara, y de la zanahoria, penacho plumoso con hombro naranja):
- Roseta erguida de hojas ANCHAS, ovadas, lisas y algo onduladas, VERDE OSCURO, sobre peciolos
  largos ROJO MORADO; la nervadura central sigue roja sobre la lamina (rasgo de los cultivares de
  raiz roja). La lamina va en dos tramos con distinta inclinacion: unas se arquean y otras
  levantan la punta (ondulado).
- Raiz GRANDE, redonda y un poco achatada, MORADO ROJIZO OSCURO, medio enterrada: asoma del lomo
  como una bola con hombro y corona oscura de donde salen los peciolos. Nada va bajo y=0.
- Corte de la raiz con ANILLOS concentricos alternados (zonas de cambium supernumerario): se
  dibujan como cuadros escalonados betabel_raiz / betabel_nervio sobre la cara del corte, con la
  raicita (raiz pivotante delgada) en la mitad que muestra los anillos.
- Siembra con glomerulos: la "semilla" es un racimo corchoso e irregular (multigermen), cafe;
  por eso en brote salen dos plantitas del mismo glomerulo.
- Plantula: dos cotiledones angostos y alargados sobre un tallito (hipocotilo) rojo.
- Desenlace: hojas amarillas y secas tendidas sobre el lomo agrietado, raices arrugadas,
  hundidas y oscuras con moho, una mitad podrida negra por dentro, y moscas.

Colores solo de la paleta fija (modelos/paleta.py): betabel_raiz, betabel_raiz_dark,
betabel_nervio, espinaca_hoja_dark / espinaca_hoja / leaf_dark / leaf (follaje), wood y
hoja_seca_dark (glomerulo), hoja_marchita, hoja_seca*, podrido*, moho*, suelo_*, black.

Fuentes de forma (consultadas el 15/11/2026):
- Old Farmer's Almanac, Vegetable seedling identification (betabel joven: hojas lisas y oblongas
  sobre tallos rojos o morado rosado; varias plantitas por "semilla"):
  https://www.almanac.com/vegetable-seedling-identification-pictures-and-descriptions
- 7 CFR 201.56-1 (reglas de prueba de semilla, Chenopodiaceae): germinacion epigea, el hipocotilo
  sube los cotiledones; racimo de semilla del que salen varias plantulas:
  https://www.law.cornell.edu/cfr/text/7/201.56-1
- IFSI, The fascinating world of beet rings (anillos concentricos por cambium, zonificacion):
  https://ifsi.com/news-and-insights/the-fascinating-world-of-beet-rings
- Frontiers in Plant Science 2021, 12:689926 (capas de cambium que forman los anillos visibles
  en el corte de la raiz del betabel): https://www.frontiersin.org/articles/10.3389/fpls.2021.689926/pdf
- Growables, Beet, Beta vulgaris (ficha de cultivo de huerta):
  https://growables.org/informationVeg/BeetGarden.htm
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
from maiz import punta, monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)
from papa import mover, moscas  # noqa: E402

BASE = (0, 2, 0)      # anclaje de la corona: encima del monticulo (igual que el maiz)

# hojas: (peciolo y nervio, lamina base, punta de la lamina)
VERDE = ('betabel_nervio', 'espinaca_hoja', 'espinaca_hoja')
SOMBRA = ('betabel_nervio', 'espinaca_hoja_dark', 'espinaca_hoja_dark')
TIERNA = ('betabel_nervio', 'leaf_dark', 'leaf')                  # hoja nueva del centro
AMARILLA = ('betabel_raiz_dark', 'hoja_marchita', 'hoja_marchita')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca')
PARDA = ('podrido', 'hoja_seca_dark', 'hoja_seca')
# raiz: (cuerpo, corona, hombro y panza girada)
SANA = ('betabel_raiz', 'betabel_raiz_dark', 'betabel_raiz')
ARRUGADA = ('betabel_raiz_dark', 'podrido_dark', 'podrido')


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, s, t=(18, 40, 62), cols=VERDE, nervio=True):
    """Hoja de betabel: peciolo rojo largo (tilt t[0]) y lamina ancha ovada en dos tramos (tilt t[1]
    y t[2]; si t[2] < t[1] la punta se levanta y la hoja se ve ondulada). La nervadura central roja
    va sobre el primer tramo, un poco mas gruesa que la lamina para que asome por las dos caras.
    s escala la hoja. 4 cubos (3 sin nervio). Devuelve la punta."""
    p = m.stem(nombre + '_pec', base, 2.6 * s, 0.42, cols[0], tilt=t[0], yaw=yaw)
    m.box(nombre + '_a', p, (2.4 * s, 2.6 * s, 0.28), cols[1], tilt=t[1], yaw=yaw)
    if nervio:
        m.box(nombre + '_nerv', p, (0.32, 2.5 * s, 0.44), cols[0], tilt=t[1], yaw=yaw)
    q = punta(p, 2.5 * s, t[1], yaw)
    m.box(nombre + '_b', q, (1.7 * s, 1.9 * s, 0.28), cols[2], tilt=t[2], yaw=yaw)
    return punta(q, 1.9 * s, t[2], yaw)


def raiz(m, nombre, x, z, g, alto, yaw=0, cols=SANA, y0=1.2, corona=True):
    """Raiz redonda y achatada medio enterrada: nucleo, panza ancha y una segunda panza girada 45
    grados (silueta casi octagonal), hombro y corona oscura. Nace dentro
    del lomo (y0) y asoma sobre el. Devuelve el punto de la corona donde nacen los peciolos.
    4 cubos, 5 con corona."""
    m.box(nombre, (x, y0, z), (0.82 * g, alto, 0.82 * g), cols[0], yaw=yaw)
    m.box(nombre + '_panza', (x, y0 + 0.1 * alto, z), (g, 0.72 * alto, g), cols[0], yaw=yaw)
    m.box(nombre + '_panza2', (x, y0 + 0.16 * alto, z), (0.86 * g, 0.6 * alto, 0.86 * g), cols[2], yaw=yaw + 45)
    top = y0 + alto
    m.box(nombre + '_hombro', (x, top, z), (0.55 * g, 0.3, 0.55 * g), cols[2], yaw=yaw)
    top += 0.3
    if corona:
        m.box(nombre + '_corona', (x, top, z), (0.3 * g, 0.25, 0.3 * g), cols[1], yaw=yaw + 20)
        top += 0.1
    return (x, top, z)


def glomerulo(m, nombre, c, yaw, s=1.0, cols=('wood', 'hoja_seca_dark'), doble=True):
    """Glomerulo de betabel: racimo corchoso irregular (dos cajas chuecas encimadas). 1 o 2 cubos."""
    m.box(nombre, c, (1.1 * s, 0.75 * s, 0.95 * s), cols[0], yaw=yaw)
    if doble:
        m.box(nombre + '_b', (c[0] + 0.25 * s, c[1] + 0.25 * s, c[2] - 0.15 * s), (0.75 * s, 0.7 * s, 0.8 * s),
              cols[1], tilt=14, yaw=yaw + 35)


def anillos(m, nombre, c, yaw, g, cols=('betabel_raiz_dark', 'betabel_raiz', 'betabel_nervio')):
    """Cara del corte: cuadros concentricos escalonados (piel oscura, luego betabel_raiz y
    betabel_nervio alternados hasta el centro). c es el centro de la cara del corte. 6 cubos."""
    tam = [1.0, 0.84, 0.66, 0.48, 0.3, 0.13]
    for k, f in enumerate(tam):
        col = cols[0] if k == 0 else (cols[1] if k % 2 == 1 else cols[2])
        m.box(f'{nombre}{k}', c, (f * g, 0.06 + 0.06 * k, f * g), col, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado con 5 glomerulos cafes, corchosos e irregulares, en fila sobre
    la raya de siembra. 11 cubos (9 mas el lomo)."""
    m = Model('betabel_siembra', PAL)
    monticulo(m)
    m.box('raya', (0, 2, 0), (9.0, 0.25, 2.0), 'suelo_humedo', yaw=-5)
    semillas = [((-3.4, 2.1, 0.2), 30, 1.0, True), ((-1.6, 2.1, -0.3), -25, 0.9, False),
                ((0.1, 2.1, 0.3), 60, 1.1, True), ((1.8, 2.1, -0.2), 10, 0.9, False),
                ((3.4, 2.1, 0.25), -40, 1.0, True)]
    for k, (c, yaw, s, doble) in enumerate(semillas):
        cols = ('wood', 'hoja_seca_dark') if k % 2 == 0 else ('hoja_seca_dark', 'wood')
        glomerulo(m, f'glomerulo{k}', c, yaw, s, cols, doble)
    return m


def brote():
    """Dos plantitas que salen del mismo glomerulo (semilla multigermen): tallito rojo (hipocotilo)
    con dos cotiledones angostos y alargados; la mayor ya asoma su primer par de hojitas
    verdaderas. 12 cubos (10 mas el lomo)."""
    m = Model('betabel_brote', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (4.4, 0.2, 3.0), 'suelo_humedo', yaw=8)
    glomerulo(m, 'glomerulo', (0.2, 2.05, 0.5), 25, 0.9, doble=False)
    # plantita mayor
    t = m.stem('tallo0', (-0.3, 2.0, 0.0), 2.6, 0.38, 'betabel_nervio', tilt=6, yaw=250)
    for lado, yaw in (('i', 110), ('d', 290)):
        m.box(f'cotiledon0{lado}', t, (0.75, 2.6, 0.24), 'espinaca_hoja', tilt=68, yaw=yaw)
    for lado, yaw in (('i', 20), ('d', 200)):
        m.box(f'hojita{lado}', t, (0.8, 1.4, 0.22), 'leaf_dark', tilt=30, yaw=yaw)
    # plantita menor del mismo glomerulo
    t1 = m.stem('tallo1', (0.7, 2.0, 0.6), 1.6, 0.34, 'betabel_nervio', tilt=14, yaw=60)
    for lado, yaw in (('i', 160), ('d', 340)):
        m.box(f'cotiledon1{lado}', t1, (0.6, 1.9, 0.22), 'espinaca_hoja_dark', tilt=64, yaw=yaw)
    return m


def crecimiento():
    """Roseta joven y erguida de 6 hojas anchas verde oscuro con peciolos y nervaduras rojas (la
    del centro mas tierna y clara); el hombro morado de la raiz apenas asoma del lomo. 30 cubos."""
    m = Model('betabel_crecimiento', PAL)
    monticulo(m)
    c = raiz(m, 'raiz', 0.0, 0.0, 2.6, 1.3, yaw=15, y0=1.5, corona=False)
    c = (c[0], c[1] - 0.2, c[2])
    hojas = [(20, 1.05, (14, 34, 52), VERDE), (95, 0.95, (22, 44, 36), SOMBRA), (160, 1.0, (18, 38, 58), VERDE),
             (225, 0.95, (24, 46, 40), SOMBRA), (300, 1.0, (16, 36, 56), VERDE)]
    for k, (yaw, s, t, cols) in enumerate(hojas):
        hoja(m, f'hoja{k}', c, yaw, s, t, cols)
    hoja(m, 'hoja_nueva', c, 350, 0.7, (6, 20, 34), TIERNA)
    return m


def madurez():
    """Lista para cosecha: dos betabeles grandes morado rojizo asomando medio enterrados en el lomo,
    cada uno con su roseta de hojas oscuras de peciolo rojo, y al frente uno arrancado y partido: la
    mitad boca arriba muestra los anillos y la raicita, la otra mitad queda con la piel arriba. 53 cubos."""
    m = Model('betabel_madurez', PAL)
    monticulo(m)
    ca = raiz(m, 'raizA', -2.5, -0.6, 4.0, 3.0, yaw=10)
    cb = raiz(m, 'raizB', 2.6, 0.2, 3.6, 2.7, yaw=-25)
    ca = (ca[0], ca[1] - 0.2, ca[2])
    cb = (cb[0], cb[1] - 0.2, cb[2])
    # follaje hacia atras, arriba y a los lados: el frente bajo (+Z) queda para el betabel partido
    hoja(m, 'hojaA0', ca, 250, 1.0, (24, 46, 66), VERDE)
    hoja(m, 'hojaA1', ca, 175, 1.1, (14, 34, 54), SOMBRA)
    hoja(m, 'hojaA2', ca, 320, 0.95, (10, 30, 20), VERDE)
    hoja(m, 'hojaA3', ca, 110, 0.85, (18, 40, 30), TIERNA)
    hoja(m, 'hojaB0', cb, 80, 1.0, (24, 48, 66), VERDE)
    hoja(m, 'hojaB1', cb, 150, 1.05, (14, 32, 52), SOMBRA)
    hoja(m, 'hojaB2', cb, 30, 0.9, (8, 26, 16), VERDE)
    # el partido, al frente sobre el escalon del lomo
    c1 = (0.6, 1.0, 4.0)
    m.box('mitad1_base', c1, (2.4, 0.5, 2.4), 'betabel_raiz_dark', yaw=12)
    m.box('mitad1', (c1[0], 1.4, c1[2]), (3.4, 0.9, 3.4), 'betabel_raiz_dark', yaw=12)
    anillos(m, 'anillo', (c1[0], 2.3, c1[2]), 12, 3.2)
    r = m.stem('raicita', (c1[0] + 1.4, 1.2, c1[2] + 0.3), 1.6, 0.55, 'betabel_raiz', tilt=95, yaw=102)
    m.stem('raicita_punta', r, 1.2, 0.3, 'betabel_raiz_dark', tilt=100, yaw=96)
    c2 = (-3.0, 1.0, 3.9)
    m.box('mitad2', c2, (3.2, 0.8, 3.2), 'betabel_raiz', yaw=-20)
    m.box('mitad2_cima', (c2[0], 1.8, c2[2]), (2.2, 0.6, 2.2), 'betabel_raiz', yaw=-20)
    m.box('mitad2_tocon', mover((c2[0], 2.4, c2[2]), 70, 0.3), (0.5, 0.5, 0.5), 'betabel_nervio', yaw=-20)
    return m


def podrida():
    """Desenlace de estres: lomo seco y agrietado, hojas amarillas y secas tendidas, raices
    hundidas, arrugadas y oscuras con moho, una mitad podrida negra por dentro y dos moscas. 45 cubos."""
    m = Model('betabel_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, -1.8), (4.2, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-3.2, 2, 1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    ca = raiz(m, 'raizA', -2.4, -0.5, 3.6, 1.6, yaw=22, cols=ARRUGADA, y0=1.0)
    cb = raiz(m, 'raizB', 2.7, 0.3, 3.0, 1.3, yaw=-35, cols=('podrido', 'podrido_dark', 'betabel_raiz_dark'),
              y0=1.0, corona=False)
    m.box('raizA_moho', (ca[0] + 0.5, ca[1] - 0.15, ca[2] + 0.4), (1.5, 0.3, 1.2), 'moho_light', yaw=40)
    m.box('raizA_moho2', (ca[0] - 1.2, 2.3, ca[2] + 1.0), (1.1, 0.4, 0.8), 'moho', yaw=10)
    m.box('raizB_moho', (cb[0] - 0.4, cb[1] - 0.2, cb[2] - 0.3), (1.2, 0.3, 1.1), 'moho', yaw=-10)
    # hojas vencidas: peciolos casi acostados y laminas tendidas sobre el lomo
    hoja(m, 'hojaA0', ca, 250, 0.72, (84, 106, 116), AMARILLA)
    hoja(m, 'hojaA1', ca, 175, 0.78, (82, 104, 112), SECA, nervio=False)
    hoja(m, 'hojaA2', ca, 315, 0.7, (80, 102, 110), PARDA)
    hoja(m, 'hojaB0', cb, 95, 0.7, (84, 106, 118), SECA, nervio=False)
    hoja(m, 'hojaB1', cb, 145, 0.72, (82, 104, 112), AMARILLA)
    hoja(m, 'hojaB2', cb, 35, 0.62, (40, 72, 100), PARDA)
    # mitad podrida al frente: piel oscura, corte negro con moho
    c1 = (0.4, 1.0, 4.0)
    m.box('mitad', c1, (3.0, 0.8, 3.0), 'podrido_dark', yaw=18)
    m.box('mitad_corte', (c1[0], 1.8, c1[2]), (2.4, 0.1, 2.4), 'black', yaw=18)
    m.box('mitad_moho', (c1[0] + 0.3, 1.9, c1[2] - 0.2), (1.2, 0.2, 1.0), 'moho_light', yaw=40)
    moscas(m, [(0.9, 4.2, 4.2, 25), (-2.0, 5.4, 0.4, -40)])
    return m


ETAPAS = [('betabel_siembra', siembra), ('betabel_brote', brote), ('betabel_crecimiento', crecimiento),
          ('betabel_madurez', madurez), ('betabel_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
