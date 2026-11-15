"""Generador de la coliflor (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/coliflor.py

Coliflor (Brassica oleracea var. botrytis). Convenciones (docs/07): 1 celda = 16 unidades, origen en
el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco
del maiz (14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas y tamanos son
CUALITATIVOS, no medidas reales: la planta madura llega a ~10 unidades y la pella queda a media altura
(de ~3 a ~7), mas baja que el brocoli.

Rasgos que se respetan:
- Hojas GRANDES, largas y erguidas, gruesas y cerosas, verde azulado (glaucas, brasica_hoja_*), con
  la nervadura central clara y marcada. Cada hoja es una tira oblonga en tres tramos: base angosta y
  oscura casi vertical, lamina ancha y punta clara que se abre un poco hacia afuera.
- PELLA (cabeza) en el centro: domo crema hecho de grumos apretados (botones florales sin abrir,
  "como racimo"), con la sombra entre grumos en coliflor_cabeza_dark. Se distingue del brocoli
  (cabeza verde granulada sobre tallo alto) y de la col (cabeza de hojas lisas apretadas, sin pella).
- Blanqueo: en madurez 3 hojas interiores suben pegadas a la pella y se doblan encima a medias, como
  cuando se amarran para que el sol no amarillee la pella; el frente de la pella queda a la vista.
- Siembra: semillitas redondas y oscuras (las de brasica son esferitas cafe oscuro) sobre lomo humedo.
- Plantula: dos cotiledones acorazonados (dos lobulos con la muesca en la punta) y la primera hoja.
- Desenlace: pella hundida y manchada de cafe con moho, hojas secas vencidas sobre el lomo (una caida
  al suelo), lomo seco agrietado y moscas.
Silueta a 20 px: domo crema dentro de una corona de hojas azuladas.

Fuentes de forma (consultadas el 15/11):
- University of Minnesota Extension, "Growing cauliflower in home gardens": blanqueo de la pella
  amarrando las hojas y variedades autoblanqueantes.
  https://extension.umn.edu/vegetables/growing-cauliflower
- UF/IFAS Gardening Solutions, "Cauliflower": hojas exteriores grandes que se juntan sobre la pella
  para sombrearla (blanqueo).
  https://gardeningsolutions.ifas.ufl.edu/plants/edibles/vegetables/cauliflower
- West Coast Seeds, "About Cauliflower (Brassica oleracea Botrytis group)": la pella es una masa de
  botones florales sin desarrollar; botrytis viene del griego "racimo".
  https://seedlings.westcoastseeds.com/blogs/wcs-academy/about-cauliflower
Las hojas erguidas y largas son el diseno acordado con el equipo (las fuentes hablan de hojas
grandes, cerosas y verde azulado que rodean el centro, no de su angulo).

Colores solo de la paleta fija: brasica_hoja_dark/_hoja/_hoja_light (compartidos con brocoli y col),
coliflor_cabeza y coliflor_cabeza_dark (pella), wood_dark y podrido_dark (semilla), y los marchitos
compartidos (hoja_seca*, hoja_marchita, podrido*, moho*). Las hojas giran en los tres ejes con `marco`
y `caja` de calabacita.py (rotacion Euler ZYX alrededor del centro de cada cubo, sin mover la caja).
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

BASE = (0, 2, 0)      # anclaje: encima del monticulo (igual que el maiz)

# tramos de hoja: (base, lamina, punta)
VIEJA = ('brasica_hoja_dark', 'brasica_hoja_dark', 'brasica_hoja')
MEDIA = ('brasica_hoja_dark', 'brasica_hoja', 'brasica_hoja_light')
NUEVA = ('brasica_hoja', 'brasica_hoja_light', 'brasica_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')
MARCHITA = ('hoja_seca', 'hoja_marchita', 'hoja_seca_light')
PODRIDA = ('podrido', 'hoja_seca_dark', 'hoja_seca')


def suelo(x, z):
    """Altura del lomo del maiz en (x, z): 2 en la tapa, 1 en el escalon, 0 fuera."""
    if abs(x) <= 5 and abs(z) <= 3:
        return 2.0
    if abs(x) <= 7 and abs(z) <= 5:
        return 1.0
    return 0.0


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, tramos, cols=MEDIA, nervio=None, grueso=0.45):
    """Hoja oblonga de brasica desde `base` hacia `yaw`, en tramos [(pitch, largo, ancho), ...]
    (pitch negativo = sube, positivo = cae; menos de -90 = se dobla hacia el centro). Cada tramo usa
    el color cols[k]. `nervio` agrega la nervadura central clara a lo largo del primer tramo y del
    arranque del segundo, mas gruesa que la lamina para que se vea por las dos caras.
    Cubos: len(tramos) (+1 con nervio). Devuelve la punta."""
    fin = base
    for k, (p, largo, ancho) in enumerate(tramos):
        r = marco(yaw, p)
        traslape = 0.3 if k else 0.0
        caja(m, f'{nombre}_t{k}', en(fin, r, (0, 0, largo / 2 - traslape)),
             (ancho, grueso * (0.9 if k else 1.0), largo), cols[min(k, len(cols) - 1)], r)
        if k == 0 and nervio:
            caja(m, nombre + '_nervio', en(fin, r, (0, 0, largo * 0.55)), (0.5, grueso + 0.3, largo * 1.05), nervio, r)
        fin = en(fin, r, (0, 0, largo - traslape))
    return fin


def caida(p, yaw, largo, holgura=0.3):
    """Pitch (positivo) para que un tramo de `largo` que sale de p hacia yaw acabe apoyado en el lomo
    o en el suelo, con `holgura` de grosor. Itera porque la altura del lomo cambia con la distancia."""
    pitch = 30.0
    for _ in range(12):
        d = largo * math.cos(math.radians(pitch))
        q = mover(p, yaw, d)
        bajar = p[1] - (suelo(q[0], q[2]) + holgura)
        pitch = math.degrees(math.asin(max(-1.0, min(1.0, bajar / largo))))
    return pitch


def pella(m, nombre, base_y, radio, cols=('coliflor_cabeza_dark', 'coliflor_cabeza', 'coliflor_cabeza'),
          giro=0.0, hundir=0.0, n=7):
    """Domo de grumos: nucleo octagonal oscuro, un anillo de n grumos, 4 grumos altos y uno en la cima.
    Lo que queda entre grumos se ve oscuro (sombra granulada). cols = (nucleo, anillo, cima); cada
    entrada puede ser una tupla para alternar colores por grumo. hundir aplasta el domo.
    Cubos: 2 + n + 4 + 1."""
    def col(c, k):
        return c[k % len(c)] if isinstance(c, tuple) else c
    lado = radio * 1.75
    m.box(nombre + '_nucleo', (0, base_y, 0), (lado, 2.6 - hundir * 0.4, lado), col(cols[0], 0), yaw=giro)
    m.box(nombre + '_nucleo2', (0, base_y, 0), (lado * 0.85, 3.2 - hundir * 0.6, lado * 0.85), col(cols[0], 1),
          yaw=giro + 45)
    y1 = base_y + 1.7 - hundir * 0.5
    for k in range(n):
        a = giro + 360 * k / n + 20
        c = mover((0, y1, 0), a, radio * 0.62)
        m.box(f'{nombre}_grumo{k}', c, (2.2, 1.4, 2.2), col(cols[1], k), yaw=a + 15 * (k % 3))
    y2 = y1 + 0.9 - hundir * 0.3
    for k in range(4):
        a = giro + 90 * k + 45
        c = mover((0, y2, 0), a, radio * 0.3)
        m.box(f'{nombre}_alto{k}', c, (2.0, 1.3, 2.0), col(cols[2], k), yaw=a + 20)
    m.box(nombre + '_cima', (0, y2 + 0.8 - hundir * 0.3, 0), (1.8, 1.0, 1.8), col(cols[2], 1), yaw=giro + 30)
    return y2 + 1.8 - hundir * 0.6


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: una franja oscura con 5 semillitas redondas cafe oscuro, una medio
    tapada, y un terron. 11 cubos con el lomo."""
    m = Model('coliflor_siembra', PAL)
    monticulo(m)
    m.box('chorrillo', (0, 2, 0), (6.0, 0.16, 0.9), 'suelo_humedo', yaw=-10)
    m.box('humedo', (0.4, 2, 0.2), (3.0, 0.12, 2.6), 'suelo_humedo', yaw=25)
    semillas = [(-2.5, 0.75, 'wood_dark'), (-1.3, -0.6, 'podrido_dark'), (-0.1, 1.4, 'wood_dark'),
                (1.3, -1.2, 'wood_dark'), (2.4, 0.2, 'podrido_dark')]
    for k, (x, z, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.12, z), (0.75, 0.62, 0.75), col, yaw=20 + 35 * k)
    m.box('tapado', (2.45, 2.12, 0.2), (1.0, 0.38, 1.0), 'soil_dark', yaw=25)
    m.box('terron', (-3.0, 2, -1.8), (1.3, 0.75, 1.1), 'soil_dark', yaw=30)
    return m


def brote():
    """Plantula: tallito, dos cotiledones acorazonados (dos lobulos con la muesca en la punta) sobre
    peciolos cortos y la primera hoja verdadera, oblonga y erguida, con su nervio. 12 cubos con el lomo."""
    m = Model('coliflor_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.4, 0.16, 2.8), 'suelo_humedo', yaw=-10)
    m.box('tallito', BASE, (0.5, 1.3, 0.5), 'brasica_hoja_light')
    top = (0, 3.2, 0)
    for k, yaw in enumerate((100, 280)):
        r = marco(yaw, -14)
        caja(m, f'cotiledon{k}_pec', en(top, r, (0, 0, 0.4)), (0.35, 0.3, 0.8), 'brasica_hoja', r)
        centro = en(top, r, (0, 0, 0.8))
        for s in (-1, 1):   # dos lobulos abiertos en V: la punta queda con muesca (acorazonado)
            rl = marco(yaw + 22 * s, -12)
            caja(m, f'cotiledon{k}_lobulo{s + 1}', en(centro, rl, (0, 0, 0.75)), (1.0, 0.28, 1.5),
                 'brasica_hoja' if s < 0 else 'brasica_hoja_light', rl)
    hoja(m, 'hoja1', mover(top, 200, 0.1, 0.05), 200, [(-66, 1.3, 0.7), (-48, 1.7, 1.4)],
         cols=('brasica_hoja', 'brasica_hoja_light'), grueso=0.25)
    return m


def crecimiento():
    """Roseta de 7 hojas glaucas erguidas en espiral (angulo de oro): las viejas mas grandes, abiertas
    y oscuras con la nervadura clara, las nuevas chicas, paradas y claras; en el centro un cogollo de
    hojitas, todavia sin pella. 26 cubos con el lomo."""
    m = Model('coliflor_crecimiento', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.3, 0.7, 1.3), 'brasica_hoja_light', yaw=15)
    # (yaw, p1, L1, W1, p2, L2, W2, cols)
    specs = [(20, -58, 2.8, 1.8, -42, 3.2, 2.9, VIEJA), (157, -60, 2.8, 1.8, -44, 3.2, 2.9, VIEJA),
             (295, -64, 2.8, 1.7, -48, 3.1, 2.8, MEDIA), (72, -68, 2.7, 1.6, -54, 3.0, 2.6, MEDIA),
             (210, -72, 2.6, 1.5, -58, 2.8, 2.4, MEDIA), (347, -76, 2.4, 1.4, -64, 2.5, 2.1, NUEVA),
             (125, -80, 2.2, 1.3, -70, 2.2, 1.9, NUEVA)]
    for k, (yaw, p1, L1, W1, p2, L2, W2, cols) in enumerate(specs):
        hoja(m, f'hoja{k}', mover(BASE, yaw, 0.5, 0.5), yaw, [(p1, L1, W1), (p2, L2, W2)],
             cols=cols, nervio='brasica_hoja_light' if cols != NUEVA else 'brasica_hoja')
    m.box('cogollo', (0, 2.6, 0), (1.2, 1.4, 1.2), 'brasica_hoja_light', yaw=40)
    m.box('cogollo2', (0.1, 2.6, -0.1), (0.8, 2.0, 0.8), 'brasica_hoja', yaw=-10)
    return m


def madurez():
    """Lista para cosecha: corona de 7 hojas grandes erguidas en tres tramos con la nervadura clara, las
    del frente un poco mas abiertas para dejar ver la pella; pella crema granulada grande en el centro y
    3 hojas interiores que suben pegadas a ella y se doblan encima a medias (blanqueo), por atras y los
    lados. 51 cubos con el lomo."""
    m = Model('coliflor_madurez', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.8, 1.0, 1.8), 'brasica_hoja_light', yaw=20)
    # exteriores: (yaw, p1, p2, p3, cols); las del frente de la camara (yaw ~35) mas abiertas
    ext = [(35, -64, -46, -26, MEDIA), (86, -70, -54, -32, VIEJA), (138, -78, -64, -42, MEDIA),
           (190, -80, -68, -46, VIEJA), (242, -78, -66, -44, MEDIA), (294, -72, -58, -36, VIEJA),
           (346, -66, -50, -28, MEDIA)]
    for k, (yaw, p1, p2, p3, cols) in enumerate(ext):
        hoja(m, f'ext{k}', mover(BASE, yaw, 2.6, 0.3), yaw, [(p1, 3.0, 2.4), (p2, 3.6, 3.6), (p3, 2.2, 2.7)],
             cols=cols, nervio='brasica_hoja_light')
    pella(m, 'pella', 3.0, 3.0)
    # interiores de blanqueo: suben pegadas a la pella y se doblan sobre ella, sin taparla toda
    for k, yaw in enumerate((165, 235, 300)):
        hoja(m, f'int{k}', mover(BASE, yaw, 3.3, 0.6), yaw, [(-86, 4.6, 2.6), (-160, 2.6, 2.8)],
             cols=('brasica_hoja', 'brasica_hoja_light'))
    return m


def podrida():
    """Desenlace de estres: lomo seco y agrietado, hojas exteriores secas y marchitas vencidas sobre el
    lomo (una caida al suelo), pella hundida y manchada de cafe, con grumos podridos y moho, y dos
    moscas. 44 cubos con el lomo."""
    m = Model('coliflor_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.8, 2, -1.7), (3.4, 0.16, 0.45), 'suelo_grieta', yaw=28)
    m.box('grieta2', (-3.0, 2, 1.5), (0.45, 0.16, 2.6), 'suelo_grieta', yaw=-20)
    m.box('tallo', BASE, (1.8, 0.8, 1.8), 'podrido_dark', yaw=20)
    # exteriores vencidas: arranque casi plano y la lamina colgando hasta apoyarse en el lomo, dos
    # con mancha de pudricion
    ext = [(20, -14, 2.8, 2.0, 3.6, 2.6, SECA), (78, -22, 2.8, 1.9, 3.8, 2.6, MARCHITA),
           (140, -10, 2.8, 2.0, 3.4, 2.7, PODRIDA), (200, -18, 2.8, 1.9, 3.6, 2.6, SECA),
           (262, -24, 2.8, 2.0, 3.8, 2.7, MARCHITA), (322, -12, 2.8, 1.9, 3.4, 2.6, SECA)]
    for k, (yaw, p1, L1, W1, L2, W2, cols) in enumerate(ext):
        b = mover(BASE, yaw, 1.8, 0.4)
        codo = en(b, marco(yaw, p1), (0, 0, L1 - 0.3))
        p2 = caida(codo, yaw, L2 - 0.3, holgura=0.35)
        hoja(m, f'ext{k}', b, yaw, [(p1, L1, W1), (p2, L2, W2)], cols=cols,
             nervio='hoja_seca_light' if k in (0, 3) else None)
        if k in (1, 4):
            r2 = marco(yaw, p2)
            caja(m, f'ext{k}_mancha', en(codo, r2, (0.3, 0.24, L2 * 0.55)), (1.3, 0.12, 1.2), 'podrido_dark', r2)
    # hoja suelta en el suelo, fuera del lomo
    m.box('hoja_suelo', (-5.4, 0, 6.3), (3.0, 0.25, 1.8), 'hoja_seca', yaw=30)
    m.box('hoja_suelo_nervio', (-5.4, 0.25, 6.3), (2.6, 0.12, 0.4), 'hoja_seca_light', yaw=30)
    # pella hundida, cafe y manchada
    pella(m, 'pella', 2.6, 3.3,
          cols=(('podrido', 'podrido_dark'), ('coliflor_cabeza_dark', 'podrido', 'hoja_seca_dark', 'coliflor_cabeza_dark',
                                               'podrido_dark', 'hoja_seca'),
                ('hoja_seca_dark', 'coliflor_cabeza_dark', 'podrido')),
          giro=12, hundir=1.6, n=6)
    m.box('moho1', (-0.6, 5.55, 0.5), (1.7, 0.3, 1.4), 'moho_light', yaw=20)
    m.box('moho2', (1.6, 4.6, -0.8), (1.3, 0.3, 1.1), 'moho', yaw=-15)
    m.box('moho3', (-1.9, 4.5, -1.3), (1.2, 0.3, 1.0), 'moho_dark', yaw=40)
    m.box('escurrido', (1.9, 2, 2.0), (1.8, 0.12, 1.4), 'podrido_dark', yaw=-25)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(1.3, 8.2, 1.6, 20), (-2.2, 7.3, -1.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('coliflor_siembra', siembra), ('coliflor_brote', brote), ('coliflor_crecimiento', crecimiento),
          ('coliflor_madurez', madurez), ('coliflor_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
