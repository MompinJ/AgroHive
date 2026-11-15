"""Generador del rabano (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/rabano.py

Rabano (Raphanus sativus), rabanito rojo redondo tipo Cherry Belle, de ciclo muy corto (unas 3 a 4
semanas). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la base, y=0
superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10) y
el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas y tamanos son CUALITATIVOS, no
medidas reales: la planta es CHICA (roseta de ~7-8 unidades de alto en madurez, mas baja que la
zanahoria) y la semilla y la bolita van agrandadas para que se lean a 20 px.

Rasgos que se respetan (y que lo separan del betabel, morado oscuro con nervadura roja y mas
grande, y del jitomate, frutos colgados de una mata con tutor):
- Roseta baja: las hojas salen todas de la corona, sobre la propia raiz, y se abren en abanico.
- Hoja lirada, lobulada y aspera, verde medio: peciolo con 1-2 pares de lobulos chicos y un lobulo
  terminal grande y redondeado (dos placas: lamina ancha y punta clara).
- Raiz redonda ROJA (bolita, dos cajas cruzadas para redondear y un brillo) que se asoma medio
  enterrada sobre el lomo, con corona verde oscura arriba; la punta y la raicita son BLANCAS, y
  solo se ven en el rabano arrancado acostado en el escalon del lomo (madurez).
- Plantula: tallito rojizo (hipocotilo del rabano rojo), dos cotiledones acorazonados con la
  muesca en la punta (cada uno son dos lobulitos abiertos en V) y una primera hoja alargada.
- Siembra: semillitas redondas cafes rojizas en fila sobre una raya de tierra humeda.
- Desenlace: hojas amarillas y cafes vencidas sobre el lomo seco, bolitas hundidas, oscuras y
  rajadas (la del centro abierta en dos), con moho, el arrancado podrido y dos moscas.
Nada va bajo y=0 (lo pide la prueba de la escena): las raices se asoman sobre el lomo.

Colores solo de la paleta fija (modelos/paleta.py), sin agregar: rabano_raiz (cuerpo), white
(punta, raicita y pulpa), mascota_mejilla (brillo), chile_rojo_dark (rojo oscurecido), leaf_dark /
leaf / leaf_light (hoja), wood / wood_dark (semilla), hoja_seca*, hoja_marchita, podrido*, moho*,
suelo_humedo y suelo_grieta.

Fuentes de forma (consultadas el 15/11/2026):
- UC IPM, Wild radish (plantula de Raphanus: cotiledones de rinon a acorazonados con muesca
  profunda en la punta; hojas bajas lobuladas o divididas en foliolos):
  https://ipm.ucanr.edu/PMG/WEEDS/wild_radish.html
- Virginia Tech Weed ID, Wild radish (cotiledones acorazonados, tallito con pelos rigidos):
  https://weedid.cals.vt.edu/profile/510/
- SARE, Wild radish (el rabano cultivado es muy parecido al silvestre):
  https://sare.org/publications/manage-weeds-on-your-farm/wild-radish
- Botanical Interests, Cherry Belle radish (bolita roja redonda de pulpa blanca, ~3 a 4 semanas):
  https://www.botanicalinterests.com/products/Cherry-Belle-Radish-Seeds
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
from zanahoria import marco, pieza, sobre, moscas  # noqa: E402  (giros con roll y moscas)

BASE = (0, 2, 0)      # anclaje de la corona: encima del monticulo (igual que el maiz)

VERDE = ('leaf_dark', 'leaf_dark', 'leaf', 'leaf_light')        # peciolo, lobulos, lamina, punta
VERDE_SOMBRA = ('leaf_dark', 'leaf_dark', 'leaf_dark', 'leaf')
SECO = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita', 'hoja_seca_light')
SECO2 = ('hoja_seca_dark', 'hoja_seca_dark', 'hoja_seca', 'hoja_marchita')
RAIZ_SANA = ('rabano_raiz', 'rabano_raiz', 'mascota_mejilla')   # banda ancha, nucleo alto, brillo
RAIZ_PODRIDA = ('podrido', 'chile_rojo_dark', 'moho_light')


# ---------------- piezas ----------------
def hoja_lirada(m, nombre, base, yaw, largo, t1, t2, cols=VERDE, pares=1, abre=58):
    """Hoja de rabano: peciolo (tilt t1) con `pares` pares de lobulos chicos y un lobulo terminal
    grande y redondeado (lamina + punta clara, tilt t2). cols = (peciolo, lobulos, lamina, punta).
    3 + 2*pares cubos. Devuelve la punta."""
    a = 0.42 * largo
    r1, r2 = marco(yaw, t1), marco(yaw, t2)
    p1 = pieza(m, nombre + '_pec', base, (0.32, a, 0.32), cols[0], r1)
    for k in range(pares):
        q = p1 if k == 0 else sobre(p1, r1, -0.38 * a)
        s = 1.0 - 0.3 * k
        for lado, sg in (('d', -1), ('i', 1)):
            pieza(m, f'{nombre}_l{k}{lado}', q, (0.15 * largo * s, 0.2 * largo * s, 0.24), cols[1],
                  marco(yaw, t1 + (t2 - t1) * 0.5, sg * abre))
    p2 = pieza(m, nombre + '_lam', p1, (0.28 * largo, 0.32 * largo, 0.26), cols[2], r2)
    return pieza(m, nombre + '_punta', p2, (0.19 * largo, 0.14 * largo, 0.26), cols[3], r2)


def cotiledon(m, nombre, base, yaw, tilt, g=1.0):
    """Cotiledon acorazonado: peciolito y dos lobulitos abiertos en V (la muesca de la punta). 3 cubos."""
    p = pieza(m, nombre + '_pec', base, (0.22, 0.7 * g, 0.22), 'leaf', marco(yaw, tilt))
    for lado, sg in (('d', -1), ('i', 1)):
        pieza(m, f'{nombre}_{lado}', p, (0.75 * g, 0.95 * g, 0.22), 'leaf_light' if sg > 0 else 'leaf',
              marco(yaw, tilt + 14, sg * 24))
    return p


def bolita(m, nombre, x, y0, z, g, h, yaw=0, cols=RAIZ_SANA, luz=True, corona=True):
    """Raiz redonda: dos bandas anchas y bajas giradas 45 grados entre si (octagono en planta) y
    un nucleo angosto y alto (perfil redondeado), brillo arriba al frente y corona verde. 3 a 5
    cubos. Devuelve el centro de la corona (de donde salen las hojas)."""
    m.box(nombre, (x, y0 + 0.22 * h, z), (g, 0.56 * h, g), cols[0], yaw=yaw)
    m.box(nombre + '_b', (x, y0 + 0.17 * h, z), (0.9 * g, 0.66 * h, 0.9 * g), cols[0], yaw=yaw + 45)
    m.box(nombre + '_n', (x, y0, z), (0.62 * g, h, 0.62 * g), cols[1], yaw=yaw + 22)
    if luz:
        yr = math.radians(yaw)
        m.box(nombre + '_luz', (x + 0.18 * g * math.sin(yr), y0 + 0.8 * h, z + 0.18 * g * math.cos(yr)),
              (0.32 * g, 0.12, 0.26 * g), cols[2], yaw=yaw)
    top = y0 + h
    if corona:
        m.box(nombre + '_corona', (x, top, z), (0.7, 0.3, 0.7), 'leaf_dark', yaw=yaw + 20)
        top += 0.3
    return (x, top, z)


def acostado(m, nombre, x, z, g, cols=RAIZ_SANA, punta='white', luz=True):
    """Rabano arrancado acostado en el escalon del lomo (y=1): bolita, corona hacia -x y la punta
    blanca que se afina en la raicita hacia +x. Devuelve el punto de la corona. 6 a 7 cubos."""
    y0 = 1.0
    bolita(m, nombre, x, y0, z, g, g, yaw=0, cols=cols, luz=luz, corona=False)
    yc = y0 + g / 2
    m.box(nombre + '_punta', (x + 0.42 * g, yc, z), (0.42 * g, 0.5 * g, 0.42 * g), punta, tilt=90, yaw=90)
    m.box(nombre + '_punta2', (x + 0.42 * g + 0.48 * g, yc - 0.05, z), (0.22 * g, 0.55 * g, 0.22 * g), punta,
          tilt=92, yaw=96)
    m.box(nombre + '_raicita', (x + 1.42 * g, yc - 0.12, z + 0.1), (0.12, 0.75 * g, 0.12), punta, tilt=96, yaw=104)
    m.box(nombre + '_corona', (x - 0.42 * g, yc, z), (0.7, 0.35, 0.7), 'leaf_dark', tilt=90, yaw=270)
    return (x - 0.42 * g - 0.3, yc, z)


# ---------------- etapas ----------------
def siembra():
    """Raya de siembra recien hecha: tierra humeda a lo largo del lomo, 5 semillitas redondas cafes
    rojizas en fila y un terron. 9 cubos (7 mas el lomo)."""
    m = Model('rabano_siembra', PAL)
    monticulo(m)
    m.box('raya', (0, 2, 0), (8.4, 0.25, 1.8), 'suelo_humedo', yaw=5)
    semillas = [(-3.2, 0.25, 'wood'), (-1.6, -0.15, 'wood_dark'), (0.0, 0.1, 'wood'),
                (1.6, -0.25, 'podrido'), (3.2, 0.2, 'wood_dark')]
    for k, (x, z, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.25, z), (0.8, 0.6, 0.8), col, yaw=20 + 35 * k)
    m.box('terron', (-4.4, 2, -1.7), (1.1, 0.5, 0.9), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula: tallito rojizo, dos cotiledones acorazonados abiertos y la primera hoja alargada
    asomando entre ellos. 12 cubos (10 mas el lomo)."""
    m = Model('rabano_brote', PAL)
    monticulo(m)
    m.box('raya', (0, 2, 0), (5.0, 0.2, 1.6), 'suelo_humedo', yaw=5)
    top = pieza(m, 'tallito', (0, 2.2, 0), (0.32, 1.0, 0.32), 'rabano_raiz', marco(0, 0))
    for k, yaw in enumerate((100, 280)):
        cotiledon(m, f'cotiledon{k}', top, yaw, 62, g=1.4)
    pieza(m, 'hoja1', top, (0.3, 0.7, 0.24), 'leaf_dark', marco(15, 20))
    pieza(m, 'hoja1_lam', sobre(top, marco(15, 20), 0.7), (0.7, 1.0, 0.24), 'leaf', marco(15, 26))
    return m


def crecimiento():
    """Planta joven: hombro rojo apenas asomando del lomo y una roseta de 5 hojas liradas (una
    todavia chica). 29 cubos."""
    m = Model('rabano_crecimiento', PAL)
    monticulo(m)
    top = bolita(m, 'hombro', 0, 1.3, 0, 1.9, 1.3, yaw=15, luz=False)
    hojas = [(20, 5.6, 40, 66, VERDE, 1), (95, 5.4, 44, 70, VERDE_SOMBRA, 1), (165, 5.8, 40, 66, VERDE, 1),
             (240, 5.4, 44, 70, VERDE_SOMBRA, 1), (310, 3.6, 24, 50, VERDE, 0)]
    for k, (yaw, largo, t1, t2, cols, pares) in enumerate(hojas):
        hoja_lirada(m, f'hoja{k}', top, yaw, largo, t1, t2, cols=cols, pares=pares)
    return m


def madurez():
    """Lista para cosecha: tres rabanos rojos redondos asomando bien sobre el lomo, cada uno con su
    roseta de hojas liradas abierta hacia atras y a los lados, y uno arrancado acostado al frente,
    en el escalon del lomo, con la punta y la raicita blancas y su hoja tendida. 60 cubos."""
    m = Model('rabano_madurez', PAL)
    monticulo(m)
    c = bolita(m, 'rabano', 0.2, 1.6, -0.6, 2.8, 2.6, yaw=10)
    iz = bolita(m, 'rabano_i', -3.5, 1.6, 0.3, 2.4, 2.2, yaw=-25, luz=False)
    de = bolita(m, 'rabano_d', 3.5, 1.6, -0.2, 2.5, 2.3, yaw=35, luz=False)
    hojas = [(c, 180, 6.8, 34, 60, VERDE, 1), (c, 125, 6.4, 40, 64, VERDE_SOMBRA, 1),
             (c, 235, 6.4, 38, 62, VERDE, 1),
             (iz, 270, 5.0, 40, 66, VERDE_SOMBRA, 1), (iz, 200, 5.2, 34, 62, VERDE, 1),
             (de, 90, 5.0, 40, 66, VERDE, 1), (de, 155, 5.2, 34, 62, VERDE_SOMBRA, 1)]
    for k, (p, yaw, largo, t1, t2, cols, pares) in enumerate(hojas):
        hoja_lirada(m, f'hoja{k}', p, yaw, largo, t1, t2, cols=cols, pares=pares)
    # arrancado: bolita al frente, corona hacia -x con la hoja tendida sobre el escalon
    q = acostado(m, 'arrancado', -0.6, 4.0, 2.2, luz=False)
    hoja_lirada(m, 'arrancado_hoja', q, 268, 4.6, 104, 89, cols=VERDE, pares=0)
    return m


def podrida():
    """Desenlace de estres: lomo seco y agrietado, hojas amarillas y cafes vencidas sobre el lomo,
    el rabano del centro hundido y rajado en dos (pulpa expuesta y moho), los de los lados oscuros
    con grieta y moho, el arrancado podrido y dos moscas. 53 cubos."""
    m = Model('rabano_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.6, 1.96, 1.9), (3.0, 0.1, 0.4), 'suelo_grieta', yaw=-20)
    m.box('grieta2', (-1.9, 1.96, -2.1), (0.4, 0.1, 1.8), 'suelo_grieta', yaw=15)
    # centro: dos mitades separadas y ladeadas, pulpa sucia y hueco oscuro entre ellas
    m.box('rabano_a', (-0.75, 1.5, -0.6), (1.3, 1.9, 2.4), 'chile_rojo_dark', yaw=-14)
    m.box('rabano_b', (0.85, 1.5, -0.5), (1.3, 1.6, 2.3), 'podrido', yaw=18)
    m.box('rabano_hueco', (0.05, 1.5, -0.55), (0.6, 1.2, 1.9), 'podrido_dark', yaw=2)
    m.box('rabano_pulpa', (-0.2, 1.8, 0.45), (0.25, 1.1, 0.5), 'hoja_seca_light', yaw=-14)
    m.box('rabano_moho', (-0.8, 3.4, -0.7), (1.0, 0.25, 1.4), 'moho_light', yaw=-14)
    m.box('rabano_moho2', (0.9, 3.1, -0.4), (0.9, 0.25, 1.0), 'moho', yaw=18)
    iz = bolita(m, 'rabano_i', -3.5, 1.4, 0.3, 2.2, 1.6, yaw=-25, cols=RAIZ_PODRIDA, luz=False, corona=False)
    m.box('rabano_i_grieta', (-3.5, 1.7, 1.42), (0.25, 1.1, 0.12), 'podrido_dark', yaw=-25)
    m.box('rabano_i_moho', iz, (1.1, 0.25, 0.9), 'moho', yaw=10)
    de = bolita(m, 'rabano_d', 3.5, 1.4, -0.2, 2.3, 1.7, yaw=35, cols=RAIZ_PODRIDA, luz=False, corona=False)
    m.box('rabano_d_grieta', (3.5, 1.7, 0.95), (0.25, 1.2, 0.12), 'podrido_dark', yaw=35)
    m.box('rabano_d_moho', de, (0.8, 0.25, 1.0), 'moho_light', yaw=-20)
    # hojas vencidas: el peciolo apenas se levanta y la lamina cae sobre el lomo
    top = (0.0, 2.6, -0.6)
    hojas = [(top, 245, 5.4, 95, 100, SECO, 1), (top, 115, 5.0, 95, 100, SECO2, 1),
             (top, 185, 4.2, 95, 98, SECO, 0),
             ((iz[0] - 0.4, iz[1] - 0.6, iz[2]), 300, 3.2, 95, 100, SECO2, 0),
             ((de[0] + 0.4, de[1] - 0.6, de[2]), 70, 3.2, 95, 100, SECO, 0)]
    for k, (p, yaw, largo, t1, t2, cols, pares) in enumerate(hojas):
        hoja_lirada(m, f'hoja{k}', p, yaw, largo, t1, t2, cols=cols, pares=pares)
    # arrancado podrido: punta parda, sin brillo, con moho y una mancha negra
    q = acostado(m, 'arrancado', -0.6, 4.0, 2.0, cols=RAIZ_PODRIDA, punta='hoja_seca', luz=False)
    m.box('arrancado_moho', (-0.4, 3.0, 4.1), (1.2, 0.25, 1.0), 'moho_light', yaw=20)
    m.box('arrancado_mancha', (-0.6, 1.8, 5.0), (0.9, 0.7, 0.12), 'podrido_dark', yaw=5)
    pieza(m, 'arrancado_hoja', q, (0.9, 2.2, 0.22), 'hoja_seca_dark', marco(265, 98))
    moscas(m, [(0.8, 5.4, 1.4, 20), (-2.6, 4.4, 4.2, -40)])
    return m


ETAPAS = [('rabano_siembra', siembra), ('rabano_brote', brote), ('rabano_crecimiento', crecimiento),
          ('rabano_madurez', madurez), ('rabano_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
