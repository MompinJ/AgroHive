"""Generador de la calabacita (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/calabacita.py

Calabacita o calabacin (Cucurbita pepo, calabaza de verano). Convenciones (docs/07): 1 celda = 16
unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas
comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella
de 16x16. Las alturas y tamanos son cualitativos, no medidas reales.

Rasgos que se respetan (referencias: UF/IFAS Plant Identification "Squash, Zucchini", NC State
Extension Plant Toolbox "Cucurbita", Ask Extension "Silver zucchini leaves"):
- MATA compacta y erguida, sin guias (las calabazas de verano son de habito arbustivo): un tallo
  central corto y grueso del que salen todos los peciolos, largos y casi verticales, como un paraguas.
  La calabaza (C. moschata, `calabaza.py`) en cambio es rastrera, baja, con guia y zarcillos.
- Hojas GRANDES palmeadas y lobuladas (lobulo central y lobulos laterales abiertos), verde oscuro con
  manchas plateadas cerca de la base de la lamina (rasgo frecuente y normal en el calabacin).
- Flores amarillas grandes, solitarias, en forma de trompeta o embudo, con la garganta naranja.
- Frutos ALARGADOS, cilindricos, verde medio con motas claras, que salen de la base de la mata (de
  las axilas del tallo corto) y se apoyan en el lomo; el fruto joven lleva la flor seca en la punta.
- Desenlace: hojas secas y vencidas, frutos blandos que se aplastan, con la punta podrida (pudricion
  apical) y moho, una hoja con cenicilla (polvo blanco) y moscas.
Silueta: copa de hojas alta sobre peciolos largos y frutos alargados abajo, distinta de la calabaza
(baja y rastrera, fruto redondo), la sandia (rastrera, fruto ovalado rayado) y el pepino (trepador).

Colores: solo de la paleta (calabacita_*, la hoja de la calabaza calabaza_*, yellow, orange y los
marchitos compartidos), sin colores nuevos. Los cubos con giro en los tres ejes (frutos y laminas)
llevan la rotacion Euler ZYX calculada aqui (`caja`); el resto usa tilt/yaw de voxelkit.
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
from calabaza import mover  # noqa: E402  (utilidad de la misma familia)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)

HOJA = ('calabaza_hoja_dark', 'calabaza_hoja', 'calabaza_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')
FRUTO = ('calabacita_fruto', 'calabacita_fruto_light', 'calabaza_fruto_dark')   # piel, motas, punta
PODRIDO = ('podrido', 'moho_light', 'podrido_dark')


# ---------------- rotaciones (Euler ZYX, igual que voxelkit, el visor y la escena) ----------------
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


def marco(yaw=0.0, pitch=0.0, giro=0.0, espin=0.0):
    """Matriz de un objeto cuyo eje largo es +Z local: espin (alrededor de su eje), giro en su plano
    (alrededor de Y local), pitch (positivo = la punta baja) y al final yaw (direccion horizontal)."""
    return _mul(_ry(yaw), _mul(_rx(pitch), _mul(_ry(giro), _rz(espin))))


def _aplica(r, v):
    return tuple(sum(r[i][k] * v[k] for k in range(3)) for i in range(3))


def _euler_zyx(r):
    """Descompone R = Rz(c) Ry(b) Rx(a) en [a, b, c] grados."""
    b = math.asin(max(-1.0, min(1.0, -r[2][0])))
    a = math.atan2(r[2][1], r[2][2])
    c = math.atan2(r[1][0], r[0][0])
    return [round(math.degrees(g), 3) for g in (a, b, c)]


def caja(m, nombre, centro, size, col, r):
    """Caja por su CENTRO geometrico, girada con la matriz r alrededor de ese centro (no se mueve)."""
    x, y, z = centro
    e = m.box(nombre, (x, y - size[1] / 2, z), size, col, pivot=centro)
    rot = _euler_zyx(r)
    if any(abs(g) > 1e-3 for g in rot):
        e['rotation'] = rot
    return e


def en(p, r, local):
    """Punto p + r * local."""
    d = _aplica(r, local)
    return (p[0] + d[0], p[1] + d[1], p[2] + d[2])


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, pec, tilt_pec, s, caida=15, cols=HOJA, lobulos=3, mancha='calabaza_mancha',
         grueso_pec=0.5):
    """Hoja palmeada de calabacita sobre peciolo largo: lobulo central y 1 o 2 pares de lobulos abiertos
    en el plano de la lamina, que cae `caida` grados hacia afuera; mancha plateada cerca de la base.
    Cubos: 1 + lobulos (+1 con mancha). Devuelve la punta del peciolo."""
    p = m.stem(nombre + '_pec', base, pec, grueso_pec, cols[0], tilt=tilt_pec, yaw=yaw)
    specs = [(0, 1.0, 0.6, cols[1], 0.2)]
    if lobulos >= 3:
        specs += [(44, 0.84, 0.52, cols[2], 0.12), (-44, 0.84, 0.52, cols[0], 0.12)]
    if lobulos >= 5:
        specs += [(95, 0.56, 0.42, cols[1], 0.05), (-95, 0.56, 0.42, cols[2], 0.05)]
    for k, (giro, largo, ancho, col, dy) in enumerate(specs):
        r = marco(yaw, caida, giro)
        L = s * largo
        caja(m, f'{nombre}_lobulo{k}', en(p, r, (0, dy + 0.17, L / 2 - 0.4)), (s * ancho, 0.35, L), col, r)
    if mancha:
        r = marco(yaw, caida)
        caja(m, nombre + '_mancha', en(p, r, (0, 0.6, s * 0.3)), (s * 0.3, 0.1, s * 0.4), mancha, r)
    return p


def flor(m, nombre, base, yaw, ped=3.0, tilt=20, escala=1.0):
    """Flor de trompeta: pedicelo, tubo amarillo, corola abierta (dos cuadros girados) y garganta naranja.
    5 cubos."""
    p = m.stem(nombre + '_ped', base, ped, 0.3, 'calabaza_hoja_dark', tilt=tilt, yaw=yaw)
    t = m.stem(nombre + '_tubo', p, 1.3 * escala, 0.8 * escala, 'yellow', tilt=tilt * 0.6, yaw=yaw)
    w = 2.3 * escala
    m.box(nombre + '_corola', t, (w, 0.5, w), 'yellow', tilt=tilt * 0.6, yaw=yaw)
    m.box(nombre + '_corola2', t, (w, 0.45, w), 'yellow', tilt=tilt * 0.6, yaw=yaw + 45)
    m.box(nombre + '_garganta', t, (0.9 * escala, 0.58, 0.9 * escala), 'orange', tilt=tilt * 0.6, yaw=yaw)
    return t


def boton(m, nombre, base, yaw, ped=2.4, tilt=25):
    """Boton de flor cerrado: pedicelo y capullo naranja. 2 cubos."""
    p = m.stem(nombre + '_ped', base, ped, 0.3, 'calabaza_hoja_dark', tilt=tilt, yaw=yaw)
    m.stem(nombre + '_capullo', p, 1.4, 0.7, 'orange', tilt=tilt, yaw=yaw)


def fruto(m, nombre, a, yaw, pitch, L, w, cols=FRUTO, motas=2, punta=True, flor_seca=False, aplastado=1.0,
          ped='calabaza_hoja_dark'):
    """Calabacita alargada desde su pedunculo en a, eje hacia yaw y bajando pitch grados. Seccion
    octagonal (cuerpo + copia girada 45 grados sobre su eje), motas claras, pedunculo oscuro y punta
    (o la flor seca). aplastado < 1 la achata (fruto blando). Cubos: 3 + motas + punta + 2 flor seca."""
    r = marco(yaw, pitch)
    r45 = marco(yaw, pitch, espin=45)
    h = w * aplastado
    centro = en(a, r, (0, 0, L / 2))
    caja(m, nombre, centro, (w, h, L), cols[0], r)
    if aplastado == 1.0:
        caja(m, nombre + '_oct', centro, (w * 0.85, w * 0.85, L - 0.7), cols[0], r45)
    else:   # blando: la panza se desparrama hacia los lados
        caja(m, nombre + '_panza', en(a, r, (0, -h * 0.12, L / 2)), (w * 1.18, h * 0.7, L - 0.9), cols[0], r)
    caja(m, nombre + '_pedunculo', en(a, r, (0, 0, -0.35)), (0.7, 0.7, 1.1), ped, r)
    for k in range(motas):
        u = (0.3 + 0.4 * k / max(1, motas - 1)) if motas > 1 else 0.5
        dx = (0.22, -0.25, 0.1)[k % 3] * w
        caja(m, f'{nombre}_mota{k}', en(a, r, (dx, h / 2 + 0.03, L * u)), (w * 0.3, 0.12, L * 0.16), cols[1], r)
    fin = en(a, r, (0, 0, L))
    if punta:
        caja(m, nombre + '_punta', fin, (w * 0.5, h * 0.5, 0.5), cols[2], r)
    if flor_seca:
        caja(m, nombre + '_flor_seca', en(a, r, (0, 0, L + 0.5)), (1.2, 1.0 * aplastado, 1.0), 'hoja_marchita', r)
        caja(m, nombre + '_flor_seca2', en(a, r, (0, 0.15, L + 1.1)), (1.5, 0.5, 0.6), 'hoja_seca', r45)
    return fin


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: tres semillas crema, planas y ovaladas, una medio tapada. 10 cubos
    (8 mas el lomo)."""
    m = Model('calabacita_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (6.6, 0.12, 4.4), 'soil', yaw=-10)
    m.box('hoyo', (0, 2, 0.2), (4.2, 0.2, 2.6), 'suelo_humedo', yaw=-10)
    # semillas planas en triangulo (se siembran 2 o 3 por golpe)
    m.box('semilla1', (-1.2, 2.18, 0.6), (1.5, 0.3, 0.95), 'calabaza_crema', yaw=20)
    m.box('semilla2', (1.1, 2.18, 0.3), (1.5, 0.3, 0.95), 'calabaza_crema', yaw=-30)
    m.box('semilla3', (0.0, 2.18, -0.6), (1.4, 0.3, 0.9), 'calabaza_crema', yaw=95)
    m.box('tapado', (0.35, 2.2, -0.75), (0.9, 0.45, 1.0), 'soil_dark', yaw=60)
    m.box('terron1', (3.5, 2, 1.5), (1.5, 0.9, 1.3), 'soil_dark', yaw=25)
    m.box('terron2', (-3.6, 2, -1.3), (1.3, 0.8, 1.1), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito grueso, dos cotiledones ovalados lisos y la primera hoja verdadera ya lobulada.
    11 cubos (9 mas el lomo)."""
    m = Model('calabacita_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.25, 2.6), 'suelo_humedo')
    m.box('tallito', BASE, (0.9, 2.6, 0.9), 'calabaza_hoja_light')
    eje = 115
    for k, lado in enumerate((0, 180)):
        r = marco(eje + lado, -8)
        caja(m, f'cotiledon{k}', en((0, 4.6, 0), r, (0, 0, 1.55)), (1.8, 0.4, 2.8),
             ('calabaza_hoja_light', 'calabaza_hoja')[k], r)
    # primera hoja verdadera: peciolo erguido y lamina ya partida en 3 lobulos
    hoja(m, 'hoja1', (0, 4.6, 0), eje + 90, 1.4, 22, 2.6, caida=-12, mancha=None, grueso_pec=0.35)
    m.box('cascara', (1.9, 2, 1.1), (1.3, 0.3, 0.85), 'calabaza_crema', yaw=25)
    return m


def crecimiento():
    """Mata joven erguida: tallo corto, 4 hojas grandes sobre peciolos largos (2 con mancha plateada), una
    hoja nueva en el centro, una flor de trompeta abierta y un boton. 30 cubos con el lomo."""
    m = Model('calabacita_crecimiento', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.5, 1.6, 1.5), 'calabaza_hoja_dark', yaw=20)
    top = (0, 3.4, 0)
    # (yaw, peciolo, tilt del peciolo, tamano de lamina, caida, mancha)
    specs = [(195, 5.0, 30, 4.4, 14, True), (270, 4.6, 34, 4.2, 18, False), (95, 4.6, 34, 4.2, 18, True),
             (330, 4.2, 38, 3.8, 22, False)]
    for k, (yaw, pec, t, s, caida, mancha) in enumerate(specs):
        hoja(m, f'hoja{k}', top, yaw, pec, t, s, caida=caida, mancha='calabaza_mancha' if mancha else None)
    hoja(m, 'hoja_nueva', top, 140, 3.4, 12, 2.2, caida=-30, lobulos=1, mancha=None, grueso_pec=0.4)
    flor(m, 'flor', top, 25, ped=2.8, tilt=26, escala=0.9)
    boton(m, 'boton', top, 60, ped=2.6, tilt=30)
    return m


def madurez():
    """Mata adulta: tallo corto y grueso, copa de 5 hojas grandes lobuladas con manchas plateadas, una flor
    abierta y un boton, y 3 calabacitas alargadas en la base hacia el frente (la joven con la flor seca
    en la punta). 58 cubos con el lomo."""
    m = Model('calabacita_madurez', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.9, 2.2, 1.9), 'calabaza_hoja_dark', yaw=20)
    m.box('tallo_luz', (0, 4.2, 0), (1.4, 0.4, 1.4), 'calabaza_hoja', yaw=20)
    top = (0, 4.4, 0)
    # hojas atras y a los lados: el frente bajo queda libre para los frutos
    specs = [(180, 5.2, 28, 4.6, 12, True), (245, 5.0, 33, 4.4, 16, True), (115, 5.0, 33, 4.4, 16, True),
             (300, 4.6, 40, 3.8, 22, False), (60, 4.6, 40, 3.8, 22, False)]
    for k, (yaw, pec, t, s, caida, mancha) in enumerate(specs):
        hoja(m, f'hoja{k}', top, yaw, pec, t, s, caida=caida, lobulos=5 if mancha else 3,
             mancha='calabaza_mancha' if mancha else None)
    flor(m, 'flor', top, 20, ped=3.4, tilt=24)
    boton(m, 'boton', top, 335, ped=3.0, tilt=30)
    # calabacitas: salen de la base del tallo y se recargan en el lomo, hacia el frente
    fruto(m, 'calabacita1', (0.2, 3.0, 0.9), 8, 18, 6.4, 1.8)
    fruto(m, 'calabacita2', (-0.7, 3.0, 0.5), 318, 16, 5.6, 1.6)
    fruto(m, 'calabacita3', (0.8, 3.0, 0.4), 58, 18, 3.8, 1.2, motas=1, punta=False, flor_seca=True)
    return m


def podrida():
    """Desenlace de estres: hojas secas vencidas sobre el lomo, una con cenicilla, tallo podrido con moho,
    calabacitas blandas y aplastadas con la punta podrida y moho, una caida al suelo, y moscas.
    50 cubos con el lomo."""
    m = Model('calabacita_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.2, 2, -1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.2), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('tallo', BASE, (1.8, 1.4, 1.8), 'podrido', yaw=20)
    m.box('moho_tallo', (0.1, 3.4, 0.1), (1.3, 0.4, 1.3), 'moho_dark', yaw=35)
    top = (0, 3.2, 0)
    # hojas vencidas: peciolos doblados hacia afuera y laminas caidas casi a ras del lomo
    specs = [(185, 3.2, 70, 4.2, 30, SECA, 'hoja_seca_light'),
             (250, 3.0, 76, 4.0, 26, ('hoja_seca_dark', 'podrido', 'hoja_seca'), None),
             (115, 3.0, 74, 4.0, 28, ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca_light'), 'moho_light'),
             (310, 2.6, 80, 3.4, 18, ('podrido_dark', 'hoja_seca_dark', 'podrido'), None)]
    for k, (yaw, pec, t, s, caida, cols, mancha) in enumerate(specs):
        hoja(m, f'hoja{k}', top, yaw, pec, t, s, caida=caida, cols=cols, mancha=mancha)
    # cenicilla extra en la hoja amarillenta
    r = marco(115, 28)
    p = mover(top, 115, 3.0 * math.sin(math.radians(74)), 3.0 * math.cos(math.radians(74)))
    caja(m, 'cenicilla', en(p, r, (-0.8, 0.6, 2.4)), (0.9, 0.1, 1.0), 'moho_light', r)
    # hoja suelta caida al suelo, fuera del lomo
    m.box('hoja_suelo', (-5.4, 0, -6.4), (2.4, 0.25, 1.6), 'hoja_seca', yaw=35)
    # calabacitas blandas: achatadas, oscurecidas, con la punta podrida y moho
    fruto(m, 'calabacita1', (0.2, 2.6, 0.9), 12, 9, 6.0, 1.9, cols=PODRIDO, motas=1, aplastado=0.62, ped='hoja_seca_dark')
    a1, r1 = (0.2, 2.6, 0.9), marco(12, 9)
    caja(m, 'calabacita1_verde', en(a1, r1, (0, 0.62, 1.8)), (1.3, 0.12, 1.6), 'calabacita_fruto', r1)
    caja(m, 'calabacita1_moho', en(a1, r1, (0, 0.1, 5.8)), (1.7, 1.1, 1.0), 'moho', r1)
    fruto(m, 'calabacita2', (-0.7, 2.6, 0.5), 322, 9, 5.2, 1.6,
          cols=('calabacita_fruto', 'moho_light', 'podrido_dark'), motas=1, aplastado=0.7,
          ped='hoja_seca_dark')
    a2, r2 = (-0.7, 2.6, 0.5), marco(322, 9)
    caja(m, 'calabacita2_lesion', en(a2, r2, (0, 0.2, 3.8)), (1.5, 0.75, 2.0), 'podrido_dark', r2)
    # la mas chica se desprendio y quedo tirada en el suelo frente al lomo
    fruto(m, 'calabacita3', (2.4, 0.57, 6.3), 270, 0, 4.6, 1.3, cols=PODRIDO, motas=1, aplastado=0.85,
          ped='hoja_seca_dark')
    m.box('calabacita3_moho', (-0.4, 1.0, 6.3), (1.0, 0.35, 1.0), 'moho_light', yaw=10)
    m.box('flor_caida', (3.2, 1, 3.6), (1.3, 0.3, 1.0), 'hoja_seca_dark', yaw=-30)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(0.8, 5.8, 4.4, 20), (-3.4, 5.0, 3.0, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('calabacita_siembra', siembra), ('calabacita_brote', brote), ('calabacita_crecimiento', crecimiento),
          ('calabacita_madurez', madurez), ('calabacita_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
