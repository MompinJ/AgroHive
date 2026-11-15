"""Generador del pepino (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/pepino.py

Pepino (Cucumis sativus), guia trepadora en ESPALDERA. Convenciones (docs/07): 1 celda = 16 unidades,
origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo
de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. La
espaldera (marco de dos postes de madera con un hilo alto, un hilo medio y un hilo vertical al centro,
como una malla de 2x2) esta puesta desde la siembra, a lo ancho del lomo y un poco detras del tallo.
Las alturas y tamanos son cualitativos, no medidas reales.

Rasgos que se respetan:
- Guia trepadora que sube por el hilo central de la espaldera y en madurez se abre en dos brazos a lo
  largo del hilo medio, hasta los postes (la espaldera queda cubierta a lo ancho).
- ZARCILLOS simples, sin ramificar, que nacen junto al peciolo y se enroscan en los hilos (helice de
  palitos alrededor del hilo vertical o del horizontal).
- Hojas medianas, triangulares, con 3 lobulos angulosos: una franja ancha en la base de la lamina (los
  dos lobulos laterales) y un rombo en la punta (el lobulo central puntiagudo).
- Flores amarillas chicas de 5 petalos (un cuadro girado 45 grados se lee como estrella); la femenina
  lleva detras el ovario, un pepinito en miniatura.
- Frutos ALARGADOS y cilindricos (seccion octagonal), verde oscuro, con una franja clara desde la punta
  y espinitas claras (verrugas), COLGANDO de los brazos de la guia por debajo del hilo medio.
- Desenlace: la guia seca se cae de la espaldera, el hilo central se revienta, queda un cabo seco
  enroscado en el hilo medio con un pepino amarillento colgando, y en el lomo hay pepinos podridos con
  moho, hojas secas, grietas y moscas.
Silueta: marco ancho de espaldera con follaje arriba y pepinos colgando en medio, distinta del chicharo
(un solo tutor de varita y vainas) y de la calabacita (mata sin guias, frutos en el lomo).

Colores: solo de la paleta (pepino_*, sombra de hoja calabaza_hoja_dark, tallo leaf_dark, zarcillos
chicharo_hoja_light, flor yellow, espaldera wood/wood_dark/white, semilla calabaza_crema y los marchitos
compartidos), sin colores nuevos. Los cubos con giro en tres ejes usan `caja`/`marco` de calabacita.py.

Fuentes de forma (no de medidas):
- University of Michigan Herbarium, Climbers: Cucumis sativus (https://climbers.lsa.umich.edu/cucumis-sativa):
  hojas simples alternas con 3 a 7 lobulos palmeados y margen dentado; zarcillo simple, sin ramificar,
  junto a la base del peciolo; flores amarillas unisexuales (planta monoica); fruto baya cilindrica,
  lisa o con verrugas.
- NC State Extension Plant Toolbox, Cucumis sativus (https://plants.ces.ncsu.edu/plants/cucumis-sativus):
  enredadera anual con zarcillos, hoja aspera triangular a acorazonada, flor amarilla de 5 petalos.
- Go Botany (Native Plant Trust), Cucumis sativus (https://gobotany.nativeplanttrust.org/species/cucumis/sativus):
  zarcillos no ramificados; exocarpo con elevaciones punzantes (espinitas).
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
from chicharo import palo  # noqa: E402  (caja recta de a a b, de la otra trepadora)
from calabacita import marco, caja, en  # noqa: E402  (rotaciones ZYX de la misma familia)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)

# espaldera (cualitativo): plano x-y detras del tallo
ZE = -2.0             # z del plano de la espaldera
XP = 6.0              # x de los postes (+-)
Y_ALTO = 16.2         # hilo alto
Y_MEDIO = 9.5         # hilo medio
ZG = -1.4             # z por donde sube la guia, pegada al frente de la malla

HOJA = ('calabaza_hoja_dark', 'pepino_hoja', 'pepino_hoja')     # sombra, lamina base, lobulo central
SOMBRA = ('calabaza_hoja_dark', 'calabaza_hoja_dark', 'pepino_hoja')
TALLO = 'leaf_dark'
ZARC = 'chicharo_hoja_light'
FRUTO = ('pepino_fruto', 'pepino_fruto_light')                 # piel, franja y espinitas


# ---------------- piezas ----------------
def espaldera(m, roto=False):
    """Marco de dos postes de madera con hilo alto, hilo medio y un hilo vertical al centro. 5 cubos.

    roto: el hilo central se revento y su mitad de arriba cuelga torcida del hilo alto."""
    for k, x in enumerate((-XP, XP)):
        m.box(f'poste{k}', (x, 1, ZE), (1.0, 16.6, 1.0), 'wood' if k == 0 else 'wood_dark')
    m.box('hilo_alto', (0, Y_ALTO, ZE), (2 * XP, 0.3, 0.3), 'white')
    m.box('hilo_medio', (0, Y_MEDIO, ZE), (2 * XP, 0.3, 0.3), 'white')
    if roto:
        palo(m, 'hilo_central_roto', (0, Y_ALTO, ZE), (0.9, Y_MEDIO - 2.0, ZE + 0.6), 0.25, 'white')
    else:
        m.box('hilo_central', (0, 2, ZE), (0.3, Y_ALTO - 2, 0.3), 'white')


def enrosque(m, nombre, ini, nodo, n=2, r=0.45, paso=0.45, giro=120, ang0=0, horizontal=False, col=ZARC):
    """Zarcillo simple: palito del nudo al hilo y n tramos de helice enroscados en el hilo. n + 1 cubos.

    ini: punto del eje del hilo donde empieza la helice. Vertical: sube en y alrededor del hilo central;
    horizontal: avanza en x alrededor del hilo medio o alto."""
    pts = []
    for k in range(n + 1):
        a = math.radians(ang0 + giro * k)
        if horizontal:
            pts.append((ini[0] + paso * k, ini[1] + r * math.cos(a), ini[2] + r * math.sin(a)))
        else:
            pts.append((ini[0] + r * math.sin(a), ini[1] + paso * k, ini[2] + r * math.cos(a)))
    palo(m, nombre, nodo, pts[0], 0.25, col)
    for k in range(n):
        palo(m, f'{nombre}{k}', pts[k], pts[k + 1], 0.25, col)


def hoja(m, nombre, nodo, yaw, s=3.0, pec=1.6, tilt_pec=62, caida=50, cols=HOJA, giro=0):
    """Hoja triangular de 3 lobulos sobre peciolo: franja ancha en la base (lobulos laterales) y rombo
    en la punta (lobulo central). La lamina cae `caida` grados. 3 cubos. Devuelve la punta del peciolo."""
    p = m.stem(nombre + '_pec', nodo, pec, 0.3, cols[0], tilt=tilt_pec, yaw=yaw)
    r = marco(yaw, caida, giro)
    caja(m, nombre + '_base', en(p, r, (0, 0.17, s * 0.24)), (s, 0.32, s * 0.48), cols[1], r)
    r45 = marco(yaw, caida, giro + 45)
    d = s * 0.48
    caja(m, nombre + '_punta', en(p, r, (0, 0.2, s * 0.62)), (d, 0.3, d), cols[2], r45)
    return p


def flor(m, nombre, nodo, yaw, ped=1.0, ovario=False):
    """Flor amarilla chica: pedicelo y corola en estrella de cara a la camara. Si es femenina, el ovario
    (pepinito con una espinita clara) entre pedicelo y corola. 2 o 4 cubos."""
    p = m.stem(nombre + '_ped', nodo, ped, 0.25, TALLO, tilt=70, yaw=yaw)
    r = marco(yaw, 0)
    if ovario:
        caja(m, nombre + '_ovario', en(p, r, (0, 0, 0.6)), (0.55, 0.55, 1.2), FRUTO[0], r)
        caja(m, nombre + '_ovario_esp', en(p, r, (0, 0, 0.55)), (0.8, 0.2, 0.2), FRUTO[1], r)
        p = en(p, r, (0, 0, 1.2))
    rc = marco(yaw, -25, espin=45)   # cara hacia afuera y un poco arriba, girada 45 (estrella)
    caja(m, nombre + '_corola', en(p, marco(yaw, -25), (0, 0, 0.12)), (1.25, 1.25, 0.25), 'yellow', rc)
    return p


def pepino(m, nombre, nodo, yaw=15, pitch=82, L=5.0, w=1.3, ped=0.8, cols=FRUTO, espin=True, aplastado=1.0):
    """Pepino alargado colgando del nudo: pedunculo, cuerpo octagonal (caja y copia girada 45 grados
    sobre su eje), franja clara desde la punta hacia la camara (yaw) y un par de espinitas claras a los
    lados. pitch 90 = vertical; 0 = tumbado. 4 o 5 cubos. Devuelve la punta."""
    r = marco(yaw, pitch)
    caja(m, nombre + '_pedunculo', en(nodo, r, (0, 0, ped / 2)), (0.35, 0.35, ped), TALLO, r)
    a = en(nodo, r, (0, 0, ped))
    h = w * aplastado
    caja(m, nombre, en(a, r, (0, 0, L / 2)), (w, h, L), cols[0], r)
    if aplastado == 1.0:
        caja(m, nombre + '_oct', en(a, r, (0, 0, L / 2)), (w * 0.86, w * 0.86, L - 0.6), cols[0],
             marco(yaw, pitch, espin=45))
    caja(m, nombre + '_franja', en(a, r, (0, h / 2, L * 0.62)), (w * 0.3, 0.1, L * 0.62), cols[1], r)
    if espin:
        caja(m, nombre + '_espinas', en(a, r, (0, 0, L * 0.34)), (w + 0.36, 0.28, 0.28), cols[1], r)
    return en(a, r, (0, 0, L))


def sobre(a, b, t, dz=0.0):
    """Punto a fraccion t del tramo a-b (para colgar pepinos de un brazo de la guia)."""
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + dz)


def moscas(m, lugares):
    """Moscas (lo unico que flota a proposito): cuerpo negro y alas. 2 cubos por mosca."""
    for k, (x, y, z, a) in enumerate(lugares):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con la espaldera ya puesta y tres semillas crema, planas y angostas. 12 cubos (10 mas
    el lomo)."""
    m = Model('pepino_siembra', PAL)
    monticulo(m)
    espaldera(m)
    m.box('humedo', (0, 2, 0.4), (5.4, 0.12, 3.6), 'suelo_humedo', yaw=-8)
    for k, ((x, z), yaw) in enumerate([((-1.0, 0.9), 25), ((0.9, 0.5), -35), ((0.1, -0.5), 80)]):
        m.box(f'semilla{k + 1}', (x, 2.12, z), (1.3, 0.25, 0.65), 'calabaza_crema', yaw=yaw)
    m.box('terron', (3.5, 2, 1.6), (1.4, 0.8, 1.2), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula al pie del hilo central: tallito, dos cotiledones ovalados y la primera hoja verdadera,
    ya triangular. 12 cubos (10 mas el lomo)."""
    m = Model('pepino_brote', PAL)
    monticulo(m)
    espaldera(m)
    top = palo(m, 'tallito', BASE, (0.1, 4.4, -0.3), 0.5, 'leaf')
    for k, lado in enumerate((0, 180)):
        r = marco(100 + lado, -10)
        caja(m, f'cotiledon{k}', en((0.05, 3.9, -0.2), r, (0, 0, 1.15)), (1.2, 0.3, 2.0),
             ('leaf_light', 'leaf')[k], r)
    # primera hoja verdadera de cara al frente, chica, sin peciolo visible
    r = marco(20, -35)
    caja(m, 'hoja1_base', en(top, r, (0, 0.15, 0.55)), (2.2, 0.3, 1.1), 'pepino_hoja', r)
    caja(m, 'hoja1_punta', en(top, r, (0, 0.18, 1.45)), (1.05, 0.28, 1.05), 'pepino_hoja', marco(20, -35, 45))
    return m


def crecimiento():
    """Guia subiendo por el hilo central: 3 tramos de tallo, 3 hojas triangulares, 2 zarcillos enroscados
    (en el hilo medio y en el central) y 2 flores amarillas. 30 cubos con el lomo."""
    m = Model('pepino_crecimiento', PAL)
    monticulo(m)
    espaldera(m)
    n1 = palo(m, 'tallo0', BASE, (0.45, 5.4, ZG), 0.55, TALLO)
    n2 = palo(m, 'tallo1', n1, (-0.4, 8.9, ZG), 0.5, TALLO)
    n3 = palo(m, 'tallo2', n2, (0.3, 12.0, ZG), 0.45, TALLO)
    m.box('yema', n3, (0.6, 0.9, 0.6), 'leaf_light', tilt=-10, yaw=20)
    hoja(m, 'hoja0', n1, -62, s=3.0, caida=48, cols=SOMBRA)
    hoja(m, 'hoja1', n2, 58, s=3.2, caida=46)
    hoja(m, 'hoja2', n3, -38, s=2.5, caida=36)
    enrosque(m, 'zarcillo0', (1.4, Y_MEDIO, ZE), n2, n=2, horizontal=True, ang0=90)
    enrosque(m, 'zarcillo1', (0, 12.8, ZE), n3, n=2, ang0=200)
    flor(m, 'flor0', n2, 5)
    flor(m, 'flor1', n1, 40, ped=0.9)
    return m


def madurez():
    """Espaldera cubierta: guia hasta el hilo alto con dos brazos sobre el hilo medio hasta los postes,
    5 hojas, 2 zarcillos enroscados, una flor femenina con su pepinito y 4 pepinos colgando bajo los
    brazos. 59 cubos con el lomo."""
    m = Model('pepino_madurez', PAL)
    monticulo(m)
    espaldera(m)
    n1 = palo(m, 'tallo0', BASE, (0.45, 5.2, ZG), 0.6, TALLO)
    n2 = palo(m, 'tallo1', n1, (-0.3, 10.0, ZG), 0.55, TALLO)
    n3 = palo(m, 'tallo2', n2, (0.4, 13.4, ZG), 0.5, TALLO)
    n4 = palo(m, 'tallo3', n3, (-0.2, 16.3, ZG), 0.45, TALLO)
    # brazos sobre el hilo medio, hacia los postes
    i1 = palo(m, 'brazo_i0', n2, (-2.9, 10.7, ZG + 0.1), 0.45, TALLO)
    i2 = palo(m, 'brazo_i1', i1, (-5.2, 10.3, ZG + 0.1), 0.4, TALLO)
    d1 = palo(m, 'brazo_d0', n2, (2.9, 10.9, ZG + 0.1), 0.45, TALLO)
    d2 = palo(m, 'brazo_d1', d1, (5.2, 11.6, ZG + 0.1), 0.4, TALLO)
    # follaje arriba de los pepinos y en las puntas de los brazos
    hoja(m, 'hoja0', n3, 58, s=3.3, caida=44)
    hoja(m, 'hoja1', n4, -48, s=3.1, caida=40)
    hoja(m, 'hoja2', i2, -30, s=3.0, pec=1.3, tilt_pec=20, caida=30, cols=SOMBRA)
    hoja(m, 'hoja3', d2, 32, s=3.0, pec=1.3, tilt_pec=20, caida=30)
    hoja(m, 'hoja4', n3, -70, s=2.8, pec=1.3, tilt_pec=50, caida=48, cols=SOMBRA)
    enrosque(m, 'zarcillo0', (-1.6, Y_ALTO, ZE), n4, n=2, horizontal=True, ang0=90)
    enrosque(m, 'zarcillo1', (0, 7.0, ZE), n1, n=2, ang0=200)
    flor(m, 'flor0', n4, 20, ovario=True)
    # pepinos colgando bajo los brazos, un poco hacia la camara
    pepino(m, 'pepino1', sobre(n2, i1, 0.62, 0.4), yaw=10, L=5.2)
    pepino(m, 'pepino2', sobre(i1, i2, 0.7, 0.4), yaw=-15, pitch=84, L=4.6, w=1.2)
    pepino(m, 'pepino3', sobre(n2, d1, 0.68, 0.4), yaw=25, pitch=80, L=5.4)
    pepino(m, 'pepino4', sobre(d1, d2, 0.65, 0.4), yaw=40, pitch=85, L=4.4, w=1.2)
    return m


def podrida():
    """Desenlace de estres: el hilo central se revento y la guia seca cayo sobre el lomo; queda un cabo
    seco enroscado en el hilo medio con un pepino amarillento colgando. Hojas secas vencidas, dos pepinos
    podridos y aplastados con moho en el lomo, grietas y 2 moscas. 48 cubos con el lomo."""
    m = Model('pepino_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.0, 2, 1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.8, 2, -0.6), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    espaldera(m, roto=True)
    # guia caida: sube un poco, se dobla y queda tendida en el lomo hacia la derecha
    m.box('moho_base', BASE, (1.2, 0.7, 1.2), 'moho_dark', yaw=20)
    a = palo(m, 'tallo0', BASE, (0.5, 4.6, -0.9), 0.55, 'hoja_seca_dark')
    b = palo(m, 'tallo1', a, (3.0, 3.3, 0.2), 0.5, 'hoja_seca')
    c = palo(m, 'tallo2', b, (4.7, 2.25, 1.6), 0.45, 'hoja_seca_dark')
    hoja(m, 'hoja0', a, -60, s=2.8, pec=1.2, tilt_pec=95, caida=72,
         cols=('hoja_seca_dark', 'hoja_seca', 'hoja_marchita'))
    hoja(m, 'hoja1', b, 15, s=2.8, pec=1.0, tilt_pec=100, caida=60,
         cols=('hoja_seca_dark', 'hoja_marchita', 'hoja_seca_light'))
    hoja(m, 'hoja2', c, 165, s=2.4, pec=0.8, tilt_pec=95, caida=40, cols=('podrido', 'hoja_seca_dark', 'hoja_seca'))
    # cabo seco que quedo enroscado en el hilo medio, con una hoja marchita y un pepino amarillento
    cabo0 = (-3.4, Y_MEDIO - 0.2, ZG + 0.1)
    enrosque(m, 'zarcillo_seco', (-4.4, Y_MEDIO, ZE), cabo0, n=2, horizontal=True, ang0=90, col='hoja_seca_dark')
    cabo1 = palo(m, 'cabo', cabo0, (-3.1, Y_MEDIO - 1.4, ZG + 0.4), 0.4, 'hoja_seca')
    hoja(m, 'hoja3', cabo0, -25, s=2.4, pec=0.8, tilt_pec=110, caida=80,
         cols=('hoja_seca_dark', 'hoja_marchita', 'hoja_seca'))
    p1 = pepino(m, 'pepino1', cabo1, yaw=5, pitch=86, L=4.0, w=1.35, ped=0.5,
                cols=('hoja_marchita', 'hoja_seca_light'))
    m.box('pepino1_moho', (p1[0], p1[1], p1[2]), (1.1, 1.2, 1.1), 'moho_light', yaw=20)
    # pepinos caidos en el lomo: blandos, aplastados, con moho y la punta podrida
    p2 = pepino(m, 'pepino2', (-1.4, 2.45, 2.6), yaw=105, pitch=0, L=4.4, w=1.4, ped=0.4,
                cols=('hoja_marchita', 'podrido'), espin=False, aplastado=0.7)
    m.box('pepino2_moho', (p2[0] - 0.9, 2.95, p2[2] + 0.15), (1.5, 0.35, 1.1), 'moho', yaw=105)
    p3 = pepino(m, 'pepino3', (2.4, 2.4, -1.0), yaw=-60, pitch=0, L=4.0, w=1.3, ped=0.4,
                cols=('podrido', 'podrido_dark'), espin=False, aplastado=0.65)
    m.box('pepino3_moho', (p3[0] + 1.0, 2.85, p3[2] - 0.6), (1.3, 0.3, 1.2), 'moho_light', yaw=-60)
    # hojas sueltas en el suelo
    m.box('hoja_suelo0', (-5.6, 0, 6.0), (2.2, 0.25, 1.5), 'hoja_seca', yaw=30)
    m.box('hoja_suelo1', (5.4, 1, -3.6), (1.8, 0.25, 1.4), 'hoja_seca_light', yaw=-20)
    moscas(m, [(-1.0, 5.4, 3.4, 20), (2.8, 4.6, 0.8, -40)])
    return m


ETAPAS = [('pepino_siembra', siembra), ('pepino_brote', brote), ('pepino_crecimiento', crecimiento),
          ('pepino_madurez', madurez), ('pepino_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
