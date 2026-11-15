"""Generador de la zanahoria (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/zanahoria.py

Zanahoria (Daucus carota subsp. sativus). Convenciones (docs/07): 1 celda = 16 unidades, origen en
el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de
surco del maiz (14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas y
tamanos son CUALITATIVOS, no medidas reales: el follaje adulto queda como una mata media (~13 de
alto, como el frijol o el chile) y la semilla esta agrandada para que se vea.

Rasgos que se respetan (y que la separan de la papa, el camote o el cilantro):
- Penacho en roseta de hojas muy divididas (2-3 veces pinnadas, segmentos finales lineales):
  peciolos largos y erguidos que se abren en abanico, cada uno con pares de hojitas angostas
  inclinadas hacia la punta, como helecho. Las hojitas giran dentro del plano de la hoja (giro
  local en z, guardado como Euler ZYX completo).
- Raiz conica tipo Chantenay: hombro ancho que se afina a punta roma, naranja con anillos
  transversales mas oscuros. Va enterrada: solo asoma el hombro naranja sobre el lomo (nada va
  bajo y=0); en madurez y podrida una zanahoria arrancada acostada en el escalon del lomo deja
  ver la raiz entera.
- Plantula: dos cotiledones lineales, largos y muy angostos (casi de pasto), y una primera hoja
  verdadera partida en 3 lobulos. Siembra en chorrillo sobre el lomo humedo.
- Desenlace: follaje seco y tendido, hombros y raiz oscurecidos, partidos y con moho, moscas.

Colores solo de la paleta fija (modelos/paleta.py): zanahoria_hoja, zanahoria_raiz,
zanahoria_raiz_dark, orange (luces), leaf / leaf_dark / cereal_hoja_dark (luz y sombra del
follaje), hoja_seca*, hoja_marchita, espiga_dark, podrido*, moho*.

Fuentes de forma (consultadas el 15/11/2026):
- UC IPM, Wild carrot (plantula: cotiledones lineales, primera hoja en 3 lobulos):
  https://ipm.ucanr.edu/PMG/WEEDS/wild_carrot.html
- Ontario, Weed identification guide, Wild carrot (cotiledones ~20 x 1 mm, primeras hojas):
  https://www.ontario.ca/document/weed-identification-guide-ontario-crops/wild-carrot
- Kew POWO, Daucus carota (hojas basales 2-3 pinnadas, segmentos lineales a lanceolados):
  https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:841063-1/general-information
- Epic Gardening, Chantenay carrots (raiz corta y conica de hombro ancho que puede asomar):
  https://www.epicgardening.com/chantenay-carrots/
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

BASE = (0, 2, 0)      # anclaje de la corona: encima del monticulo (igual que el maiz)

VERDE = ('zanahoria_hoja', 'leaf_dark', 'leaf')                  # peciolo, hojitas, punta clara
VERDE_SOMBRA = ('zanahoria_hoja', 'cereal_hoja_dark', 'zanahoria_hoja')
SECO = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')
SECO2 = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca_light')
RAIZ_SANA = ('zanahoria_raiz', 'zanahoria_raiz_dark', 'orange')  # cuerpo, anillos, luz
RAIZ_PODRIDA = ('zanahoria_raiz_dark', 'podrido', 'podrido_dark')


# ---------------- giros (Euler ZYX, como voxelkit, Blockbench y la web) ----------------
def _rx(a):
    c, s = math.cos(a), math.sin(a)
    return [[1, 0, 0], [0, c, -s], [0, s, c]]


def _ry(a):
    c, s = math.cos(a), math.sin(a)
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]]


def _rz(a):
    c, s = math.cos(a), math.sin(a)
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]]


def _mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _mv(a, v):
    return tuple(sum(a[i][k] * v[k] for k in range(3)) for i in range(3))


def marco(yaw, tilt, roll=0.0):
    """Giro de una pieza: primero roll (en su propio plano, eje z local), luego tilt (x) y yaw (y).

    Con roll=0 es exactamente el [tilt, yaw, 0] de voxelkit."""
    return _mm(_ry(math.radians(yaw)), _mm(_rx(math.radians(tilt)), _rz(math.radians(roll))))


def euler_zyx(r):
    """Angulos [x, y, z] en grados tales que R = Rz Ry Rx (orden ZYX)."""
    b = math.asin(max(-1.0, min(1.0, -r[2][0])))
    a = math.atan2(r[2][1], r[2][2])
    c = math.atan2(r[1][0], r[0][0])
    return [round(math.degrees(v), 3) for v in (a, b, c)]


def pieza(m, nombre, p, size, col, r):
    """Caja por el centro de su cara inferior p, girada con la matriz r alrededor de p.
    Devuelve el centro de su cara superior (la punta) ya girado."""
    e = m.box(nombre, p, size, col)
    rot = euler_zyx(r)
    if any(abs(v) > 1e-6 for v in rot):
        e['rotation'] = rot
    d = _mv(r, (0, size[1], 0))
    return (p[0] + d[0], p[1] + d[1], p[2] + d[2])


def sobre(p, r, t):
    """Punto a t unidades de p a lo largo del eje y local del marco r."""
    d = _mv(r, (0, t, 0))
    return (p[0] + d[0], p[1] + d[1], p[2] + d[2])


# ---------------- piezas ----------------
def hoja_plumosa(m, nombre, base, yaw, largo, t1, t2, cols=VERDE, niveles=2, abre=52, ancho=0.62,
                 grueso=0.42):
    """Hoja compuesta de zanahoria: peciolo largo (tilt t1) y raquis (tilt t2) que se arquea hacia
    fuera, con `niveles` pares de hojitas angostas inclinadas hacia la punta (como helecho) y una
    hojita terminal. cols = (peciolo, hojitas, punta). 2 + 2*niveles + 1 cubos."""
    a, b = 0.36 * largo, 0.64 * largo
    r1, r2 = marco(yaw, t1), marco(yaw, t2)
    p1 = pieza(m, nombre + '_pec', base, (0.34, a, 0.34), cols[0], r1)
    p2 = pieza(m, nombre + '_raq', p1, (0.3, b * 0.78, 0.3), cols[0], r2)
    for k in range(niveles):
        q = sobre(p1, r2, b * (0.4 - 0.18 * (niveles - 1) + 0.34 * k))
        largo_h = largo * 0.30 * (1 - 0.28 * k)
        col = cols[1] if k == 0 else cols[0]
        for lado, sg in (('d', -1), ('i', 1)):
            pieza(m, f'{nombre}_h{k}{lado}', q, (ancho, largo_h, grueso), col, marco(yaw, t2, sg * abre))
    pieza(m, nombre + '_punta', p2, (ancho + 0.1, largo * 0.2, grueso), cols[2], r2)
    return p2


def hoja_chica(m, nombre, base, yaw, largo, tilt, cols=VERDE, abre=50):
    """Hojita joven en 3 lobulos (la primera hoja verdadera): peciolo y tres lobulos. 4 cubos."""
    r = marco(yaw, tilt)
    p = pieza(m, nombre + '_pec', base, (0.3, largo, 0.3), cols[0], r)
    for lado, sg in (('d', -1), ('i', 1)):
        pieza(m, f'{nombre}_{lado}', p, (0.55, largo * 0.55, 0.36), cols[1], marco(yaw, tilt, sg * abre))
    pieza(m, nombre + '_punta', p, (0.6, largo * 0.65, 0.36), cols[2], r)
    return p


def hombro(m, nombre, x, z, g, alto, yaw=0, cols=RAIZ_SANA, anillo=True, cap=True):
    """Hombro de la raiz que asoma del lomo: cuerpo naranja (nace dentro del lomo), anillo oscuro y
    tapa clara. Devuelve el centro de la tapa, donde nacen los peciolos. 1 a 3 cubos."""
    m.box(nombre, (x, 1.4, z), (g, 0.6 + alto, g), cols[0], yaw=yaw)
    if anillo:
        m.box(nombre + '_anillo', (x, 2.0 + alto * 0.3, z), (g + 0.2, 0.3, g + 0.2), cols[1], yaw=yaw)
    top = 2.0 + alto
    if cap:
        m.box(nombre + '_tapa', (x, top, z), (g - 0.6, 0.3, g - 0.6), cols[2], yaw=yaw)
        top += 0.3
    return (x, top, z)


TRAMOS = [(1.00, 0.24, 0), (1.06, 0.04, 1), (0.88, 0.22, 0), (0.92, 0.04, 1), (0.70, 0.20, 0),
          (0.48, 0.16, 0), (0.26, 0.10, 1)]   # (grueso relativo, largo relativo, 0 cuerpo / 1 anillo)


def raiz_tumbada(m, nombre, c, yaw, largo, g, y0, cols=RAIZ_SANA, luz=True, rango=(0, 7)):
    """Zanahoria acostada: c es el centro (x, z) donde empieza el tramo rango[0] (el hombro si es 0);
    la raiz se afina hacia yaw en tramos que se apoyan todos en y0, con dos anillos oscuros y punta
    roma. rango permite hacer solo un pedazo (raiz partida). Devuelve (hombro, fin): el punto donde
    nacen las hojas (hacia yaw + 180) y el centro (x, z) del final del pedazo. 1 cubo por tramo."""
    yr = math.radians(yaw)
    dx, dz = math.sin(yr), math.cos(yr)
    s = 0.0
    for k in range(*rango):
        fg, fl, ic = TRAMOS[k]
        gk, lk = g * fg, largo * fl
        m.box(f'{nombre}{k}', (c[0] + dx * s, y0 + gk / 2, c[1] + dz * s), (gk, lk, gk), cols[ic], tilt=90, yaw=yaw)
        s += lk
    if luz and rango[0] == 0:   # brillo arriba del hombro
        m.box(nombre + '_luz', (c[0] + dx * 0.15 * largo, y0 + g, c[1] + dz * 0.15 * largo),
              (g * 0.5, 0.2, largo * 0.3), cols[2], yaw=yaw)
    return (c[0] - dx * 0.2, y0 + g * 0.5, c[1] - dz * 0.2), (c[0] + dx * s, c[1] + dz * s)


def moscas(m, puntos):
    """Moscas (lo unico que flota a proposito). 2 cubos cada una."""
    for k, (x, y, z, a) in enumerate(puntos):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Chorrillo recien sembrado: raya de tierra humeda a lo largo del lomo con semillitas cafes
    regadas en fila y dos terrones. 11 cubos (9 mas el lomo)."""
    m = Model('zanahoria_siembra', PAL)
    monticulo(m)
    m.box('chorrillo', (0, 2, 0), (9.0, 0.25, 1.6), 'suelo_humedo', yaw=4)
    semillas = [(-3.6, 0.1, 30, 'hoja_seca_dark'), (-2.2, -0.3, -20, 'espiga_dark'), (-0.9, 0.25, 60, 'hoja_seca'),
                (0.5, -0.2, 10, 'hoja_seca_dark'), (1.8, 0.3, -45, 'espiga_dark'), (3.3, -0.1, 25, 'hoja_seca_dark')]
    for k, (x, z, a, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.25, z), (0.6, 0.35, 1.0), col, yaw=a)
    m.box('terron0', (-4.6, 2, 1.6), (1.0, 0.5, 0.9), 'soil_dark', yaw=25)
    m.box('terron1', (4.4, 2, -1.5), (0.9, 0.45, 1.0), 'soil_dark', yaw=-30)
    return m


def brote():
    """Plantula: tallito, dos cotiledones lineales muy angostos abiertos en V y la primera hoja
    verdadera en 3 lobulos, con una segunda hojita apenas saliendo. 11 cubos (9 mas el lomo)."""
    m = Model('zanahoria_brote', PAL)
    monticulo(m)
    m.box('chorrillo', (0, 2, 0), (7.0, 0.2, 1.4), 'suelo_humedo', yaw=4)
    top = pieza(m, 'tallito', (0, 2.2, 0), (0.35, 0.7, 0.35), 'leaf', marco(0, 0))
    for k, yaw in enumerate((105, 285)):
        pieza(m, f'cotiledon{k}', top, (0.35, 3.0, 0.22), 'leaf', marco(yaw, 58))
    hoja_chica(m, 'hoja1', top, 25, 1.7, 22)
    pieza(m, 'hoja2', top, (0.45, 1.1, 0.3), 'zanahoria_hoja', marco(200, 18))
    return m


def crecimiento():
    """Mata joven: hombro naranja apenas asomando del lomo y un penacho en abanico de 5 hojas
    plumosas de 1 par de hojitas. 29 cubos."""
    m = Model('zanahoria_crecimiento', PAL)
    monticulo(m)
    top = hombro(m, 'hombro', 0, 0, 1.8, 0.5, yaw=15, anillo=False)
    hojas = [(15, 7.4, 14, 42, VERDE), (88, 6.8, 20, 54, VERDE_SOMBRA), (160, 7.0, 16, 48, VERDE),
             (232, 6.6, 22, 56, VERDE_SOMBRA), (300, 7.0, 18, 50, VERDE)]
    for k, (yaw, largo, t1, t2, cols) in enumerate(hojas):
        hoja_plumosa(m, f'hoja{k}', top, yaw, largo, t1, t2, cols=cols, niveles=1)
    return m


def madurez():
    """Lista para cosecha: penacho grande de hojas plumosas (2 pares de hojitas) que sale de tres
    hombros naranjas con anillo asomando del lomo, y una zanahoria entera arrancada acostada al
    frente, en el escalon del lomo, con su hoja tendida. 60 cubos."""
    m = Model('zanahoria_madurez', PAL)
    monticulo(m)
    c = hombro(m, 'hombro', 0, -0.4, 2.6, 0.9, yaw=10)
    iz = hombro(m, 'hombro_i', -3.4, -0.9, 2.0, 0.6, yaw=-20, anillo=False)
    de = hombro(m, 'hombro_d', 3.3, 0.5, 2.1, 0.7, yaw=30, anillo=False)
    hojas = [(c, 5, 10.4, 10, 36, VERDE), (c, 140, 10.6, 14, 42, VERDE_SOMBRA), (c, 220, 10.0, 12, 40, VERDE),
             (iz, 290, 7.4, 16, 42, VERDE_SOMBRA), (de, 75, 7.4, 16, 42, VERDE)]
    for k, (p, yaw, largo, t1, t2, cols) in enumerate(hojas):
        hoja_plumosa(m, f'hoja{k}', p, yaw, largo, t1, t2, cols=cols, niveles=2)
    hoja_plumosa(m, 'hoja_nueva', c, 95, 7.6, 4, 16, cols=('zanahoria_hoja', 'leaf', 'leaf'), niveles=0)
    # zanahoria arrancada: hombro a la izquierda, punta hacia +x; hoja tendida hacia -x
    q, _ = raiz_tumbada(m, 'arrancada', (-2.2, 4.0), 92, 7.4, 1.9, 1.0)
    m.box('arrancada_corona', (q[0] - 0.1, 1.5, q[2]), (0.8, 0.9, 0.9), 'leaf_dark', tilt=90, yaw=272)
    hoja_chica(m, 'arrancada_hoja', (q[0] - 0.6, 1.25, q[2]), 268, 2.4, 90, cols=VERDE, abre=38)
    return m


def podrida():
    """Desenlace de estres: lomo seco y agrietado, follaje amarillo y cafe tendido sobre el lomo,
    hombros oscurecidos (el del centro partido en dos) con moho, la zanahoria arrancada partida,
    negra por dentro y con moho, y dos moscas. 54 cubos."""
    m = Model('zanahoria_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.2, 2, -1.6), (3.6, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-3.4, 2, 1.4), (0.5, 0.2, 2.6), 'suelo_grieta', yaw=-15)
    # hombro central partido: dos mitades separadas, oscuras, con moho
    m.box('hombro_a', (-0.75, 1.4, -0.4), (1.2, 1.2, 2.4), 'zanahoria_raiz_dark', yaw=-12)
    m.box('hombro_b', (0.75, 1.4, -0.4), (1.2, 0.9, 2.3), 'podrido', yaw=14)
    m.box('hombro_hueco', (0, 1.6, -0.4), (0.5, 0.8, 1.8), 'podrido_dark', yaw=2)
    m.box('hombro_moho', (-0.8, 2.6, -0.6), (1.0, 0.3, 1.2), 'moho_light', yaw=-12)
    iz = hombro(m, 'hombro_i', -3.4, -0.9, 1.8, 0.3, yaw=-20, cols=RAIZ_PODRIDA, anillo=False, cap=False)
    m.box('hombro_i_moho', iz, (1.2, 0.3, 1.0), 'moho', yaw=10)
    de = hombro(m, 'hombro_d', 3.3, 0.5, 1.9, 0.4, yaw=30, cols=RAIZ_PODRIDA, anillo=False, cap=False)
    # follaje seco tendido: los peciolos se vencen y las hojas caen sobre el lomo
    top = (0, 2.4, -0.4)
    hojas = [(80, 6.2, 60, 112, SECO), (262, 6.4, 58, 112, SECO2), (195, 5.0, 62, 115, SECO),
             (335, 4.6, 64, 112, SECO2)]
    for k, (yaw, largo, t1, t2, cols) in enumerate(hojas):
        hoja_plumosa(m, f'hoja{k}', top, yaw, largo, t1, t2, cols=cols, niveles=2 if k < 2 else 1)
    hoja_plumosa(m, 'hoja_d', (de[0], de[1] + 0.1, de[2]), 30, 4.4, 62, 112, cols=SECO, niveles=1)
    # zanahoria arrancada podrida y partida en dos, con moho; la mitad de la punta se corre
    _, fin = raiz_tumbada(m, 'arrancada', (-2.6, 4.0), 92, 7.0, 1.8, 1.0, cols=RAIZ_PODRIDA, luz=False,
                          rango=(0, 3))
    m.box('arrancada_corte', (fin[0] - 0.1, 1.0 + 0.8, fin[1]), (1.3, 0.25, 1.3), 'podrido_dark', tilt=90, yaw=92)
    raiz_tumbada(m, 'arrancada_b', (fin[0] + 0.9, fin[1] + 0.3), 108, 7.0, 1.8, 1.0, cols=RAIZ_PODRIDA,
                 luz=False, rango=(3, 7))
    m.box('arrancada_moho', (-2.0, 2.8, 4.0), (1.4, 0.3, 1.2), 'moho_light', yaw=20)
    m.box('arrancada_moho2', (fin[0] + 1.8, 2.15, fin[1] + 0.6), (1.0, 0.3, 1.0), 'moho', yaw=-30)
    moscas(m, [(0.6, 5.6, 2.6, 20), (-2.6, 4.6, 4.4, -40)])
    return m


ETAPAS = [('zanahoria_siembra', siembra), ('zanahoria_brote', brote), ('zanahoria_crecimiento', crecimiento),
          ('zanahoria_madurez', madurez), ('zanahoria_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
