"""Generador de la cebolla (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/cebolla.py

Cebolla (Allium cepa). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la
base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz
(14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas y tamanos son
CUALITATIVOS, no medidas reales (la mata en crecimiento llega a ~14 unidades; el bulbo maduro mide
~5.4 de ancho, exagerado a proposito para que se lea a 20 px).

En cada etapa hay 3 cebollas sobre el lomo: la principal en el anclaje y dos chicas en diagonal
(una atras a la derecha, otra al frente a la izquierda), igual que en el almacigo se trasplantan
varias por surco. Rasgos que se respetan para no confundirla con el ajo ni con un pasto:
- hojas TUBULARES (huecas, cilindricas, mas anchas cerca de la base y con punta roma), erguidas y
  en abanico, verde azulado (ceroso); algunas se doblan en la punta. Son tubos de seccion cuadrada,
  no laminas planas como las del maiz o los cereales;
- salen de un cuello (falso tallo) sobre un BULBO redondo que se asoma medio enterrado en el lomo,
  con raicitas en la base;
- siembra = cebollitas de almacigo (bulbitos con tunica dorada y la punta seca) clavadas en el lomo;
  brote = las mismas con 2-3 hojitas tubulares;
- madurez = el cuello se ablanda, las hojas se doblan y caen (se acaman) y amarillean, y el bulbo
  grande blanco con la tunica dorada de papel se ve claro sobre el lomo: es lo que marca la cosecha;
- podrida = hojas secas tendidas, bulbos blandos y hundidos, oscurecidos con moho; uno partido
  deja ver las capas (anillos) negras por dentro; moscas.
Los bulbos NO bajan de y=0 (lo pide la prueba de la escena): se asoman medio hundidos en el lomo.
No se dibuja la umbela (flor blanca): una cebolla para bulbo que florece es un defecto, no la meta.

Fuentes de forma (consultadas el 15/11):
- Wikipedia, Onion: hojas carnosas, huecas y cilindricas con un lado aplanado, mas anchas a un
  cuarto de su altura, que se afinan hacia una punta roma; capas externas del bulbo de papel.
  https://en.wikipedia.org/wiki/Onion
- Vectree, Allium cepa: hoja hueca y cilindrica con cuticula cerosa verde azulada (glauca).
  https://vectree.io/c/allium-cepa
- NEON biorepo, Allium cepa: tunica del bulbo de papel a ligeramente correosa, amarilla a
  rojo morada; hojas cilindricas y huecas.
  https://biorepo.neonscience.org/portal/taxa/index.php?taxon=1899
- National Onion Association (lecciones de etapas) y Epic Gardening: al madurar el cuello se
  ablanda y las hojas caen; se cosecha con la mayoria de las hojas tendidas.
  https://www.onions-usa.org/wp-content/uploads/2020/01/Lesson-1-Growth-Stage-Timeline-A.pdf
  https://www.epicgardening.com/time-harvest-onions/
Colores solo de la paleta fija: cebolla_hoja, cebolla_bulbo, cebolla_tunica, sombra con
cereal_hoja_dark, puntas con cereal_hoja_light, y marchitos, secos, podrido y moho compartidos.
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

BASE = (0, 2, 0)      # anclaje de la cebolla principal: encima del monticulo (igual que el maiz)
# cebollas chicas a los lados, en diagonal para que no se tapen desde la camara por defecto
IZQ = (-4.0, 2, 1.7)
DER = (4.0, 2, -1.7)
PLANO = 115           # el abanico de hojas va en diagonal para leerse en la vista isometrica
CAIDA = 235           # las hojas maduras caen juntas hacia atras a la izquierda: el bulbo queda al frente

VERDE = ('cebolla_hoja', 'cebolla_hoja', 'cereal_hoja_light')      # base, medio, punta
SOMBRA = ('cereal_hoja_dark', 'cebolla_hoja', 'cebolla_hoja')
CLARA = ('cereal_hoja_light',) * 3
MARCHITA = ('cebolla_hoja', 'hoja_marchita', 'hoja_marchita')
AMARILLA = ('hoja_marchita', 'hoja_marchita', 'hoja_seca')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')
# bulbo: (panza a lo largo de x, panza a lo largo de z, cuerpo, hombro)
BLANCO = ('cebolla_bulbo',) * 4
MADURO = ('cebolla_tunica', 'cebolla_bulbo', 'cebolla_bulbo', 'cebolla_bulbo')   # tunica que se pela
PODRIDO = ('hoja_seca_dark', 'podrido', 'hoja_seca', 'podrido_dark')   # restos de tunica y carne blanda


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def suelo(x, z):
    """Altura de la superficie del lomo en (x, z): tapa (10x6) a y=2, escalon (14x10) a y=1."""
    if abs(x) <= 5 and abs(z) <= 3:
        return 2.0
    return 1.0 if abs(x) <= 7 and abs(z) <= 5 else 0.0


def tramo(m, nombre, p, q, grosor, col):
    """Tubo recto de p a q (como stem, pero por puntos). Devuelve q."""
    dx, dy, dz = q[0] - p[0], q[1] - p[1], q[2] - p[2]
    h = math.hypot(dx, dz)
    largo = math.sqrt(h * h + dy * dy)
    m.stem(nombre, p, largo, grosor, col, tilt=math.degrees(math.atan2(h, dy)),
           yaw=math.degrees(math.atan2(dx, dz)))
    return q


def tubo(m, nombre, base, yaw, tramos, cols=VERDE):
    """Hoja tubular: cadena de tubos de seccion cuadrada que se afinan hacia la punta.

    tramos = [(largo, tilt, grosor)]; tilt pequeno = erguido, ~90 = horizontal, > 90 = cae.
    El color de cada tramo sale de cols (base, medio, punta). Devuelve la punta. 1 cubo por tramo."""
    p = base
    n = len(tramos)
    for k, (largo, tilt, grosor) in enumerate(tramos):
        col = cols[0] if k == 0 else (cols[2] if k == n - 1 else cols[1])
        p = m.stem(f'{nombre}_{k}', p, largo, grosor, col, tilt=tilt, yaw=yaw)
    return p


def tendida(m, nombre, base, yaw, arranque, baja, ras, grosor=0.7, cols=AMARILLA):
    """Hoja acamada: arranca con los tramos de `arranque` (se dobla en el cuello), baja en linea
    recta hasta el suelo a `baja` unidades en horizontal y sigue `ras` unidades tendida a ras del
    lomo (apoyada, sin flotar, aunque pase de la tapa al escalon). 2 cubos mas los de arranque."""
    p = tubo(m, nombre, base, yaw, arranque, cols=(cols[0],) * 3) if arranque else base
    a = mover(p, yaw, baja)
    a = (a[0], suelo(a[0], a[2]) + grosor / 2, a[2])
    tramo(m, nombre + '_baja', p, a, grosor, cols[1])
    b = mover(a, yaw, ras)
    while suelo(b[0], b[2]) == 0.0 and ras > 0.4:     # que no cuelgue del borde del lomo
        ras -= 0.2
        b = mover(a, yaw, ras)
    b = (b[0], suelo(b[0], b[2]) + 0.8 * grosor / 2, b[2])
    return tramo(m, nombre + '_ras', a, b, 0.8 * grosor, cols[2])


def bulbo(m, nombre, c, d, h, cols=BLANCO, yaw=0, cubos=4):
    """Bulbo redondo: panza en cruz (dos losas), cuerpo girado 45 grados y hombro mas angosto y alto,
    que juntos se leen como esfera achatada. c es el centro de la base (se hunde en el lomo).
    Con cols=MADURO la tunica dorada de papel queda en los costados x y el blanco asoma en z y
    arriba. cubos=2 deja solo panza y cuerpo (cebollas chicas). Devuelve la cima."""
    x, y, z = c
    m.box(nombre + '_panza_a', (x, y + 0.18 * h, z), (d, 0.56 * h, 0.72 * d), cols[0], yaw=yaw)
    if cubos > 2:
        m.box(nombre + '_panza_b', (x, y + 0.18 * h, z), (0.72 * d, 0.56 * h, d), cols[1], yaw=yaw)
    m.box(nombre + '_cuerpo', (x, y, z), (0.7 * d, 0.86 * h, 0.7 * d), cols[2], yaw=yaw + 45)
    if cubos > 2:
        m.box(nombre + '_hombro', (x, y + 0.3 * h, z), (0.46 * d, 0.7 * h, 0.46 * d), cols[3], yaw=yaw)
        return (x, y + h, z)
    return (x, y + 0.86 * h, z)


def raices(m, nombre, c, r, yaws, col='hoja_seca_light', largo=1.4):
    """Raicitas que salen de la base del bulbo y se meten al lomo (casi a ras). 1 cubo por raiz."""
    for k, a in enumerate(yaws):
        b = mover(c, a, r, 0.0)
        m.stem(f'{nombre}{k}', b, largo, 0.22, col, tilt=100, yaw=a)


def cebollita(m, nombre, c, s=1.0, punta_seca=True, yaw=20):
    """Cebollita de almacigo: bulbito con tunica dorada medio hundido y, si no ha brotado, la cima
    y la punta seca. Devuelve el punto de donde salen las hojas. 3 cubos (1 si ya broto)."""
    x, y, z = c
    m.box(nombre, (x, y - 0.5 * s, z), (1.7 * s, 1.6 * s, 1.7 * s), 'cebolla_tunica', yaw=yaw)
    if not punta_seca:
        return (x, y + 0.9 * s, z)
    m.box(nombre + '_cima', (x, y + 1.1 * s, z), (1.0 * s, 0.6 * s, 1.0 * s), 'cebolla_tunica', yaw=yaw + 45)
    m.box(nombre + '_punta', (x, y + 1.7 * s, z), (0.35, 0.9 * s, 0.35), 'hoja_seca_dark', yaw=yaw)
    return (x, y + 2.6 * s, z)


def moscas(m, puntos):
    """Moscas (lo unico que flota a proposito). 2 cubos cada una."""
    for k, (x, y, z, a) in enumerate(puntos):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Tres cebollitas de almacigo clavadas en el lomo, con su tunica dorada y la punta seca hacia
    arriba. 11 cubos (9 mas el lomo)."""
    m = Model('cebolla_siembra', PAL)
    monticulo(m)
    cebollita(m, 'cebollita0', BASE, 1.1, yaw=15)
    cebollita(m, 'cebollita1', IZQ, 0.95, yaw=-20)
    cebollita(m, 'cebollita2', DER, 1.0, yaw=5)
    return m


def brote():
    """Las mismas cebollitas ya brotadas: de cada una salen 2 o 3 hojitas tubulares erguidas, la mas
    nueva en verde claro. 12 cubos (10 mas el lomo)."""
    m = Model('cebolla_brote', PAL)
    monticulo(m)
    p = cebollita(m, 'cebollita0', BASE, 1.1, punta_seca=False, yaw=15)
    m.stem('hoja0a', p, 4.0, 0.6, 'cebolla_hoja', tilt=12, yaw=PLANO)
    m.stem('hoja0b', p, 3.2, 0.6, 'cebolla_hoja', tilt=16, yaw=PLANO + 180)
    m.stem('hoja0c', p, 2.4, 0.5, 'cereal_hoja_light', tilt=6, yaw=PLANO + 90)
    p = cebollita(m, 'cebollita1', IZQ, 0.95, punta_seca=False, yaw=-20)
    m.stem('hoja1a', p, 3.0, 0.55, 'cebolla_hoja', tilt=14, yaw=PLANO + 20)
    m.stem('hoja1b', p, 2.0, 0.45, 'cereal_hoja_light', tilt=18, yaw=PLANO + 200)
    p = cebollita(m, 'cebollita2', DER, 1.0, punta_seca=False, yaw=5)
    m.stem('hoja2a', p, 3.2, 0.55, 'cebolla_hoja', tilt=10, yaw=PLANO + 160)
    m.stem('hoja2b', p, 2.2, 0.45, 'cereal_hoja_light', tilt=20, yaw=PLANO - 10)
    return m


def crecimiento():
    """Tres matas jovenes, verdes y erguidas: la principal con 6 hojas tubulares altas en abanico
    (2 doblan la punta) sobre un cuello blanco y un bulbo apenas engrosado; las chicas con 3 hojas.
    29 cubos."""
    m = Model('cebolla_crecimiento', PAL)
    monticulo(m)
    # principal
    cima = bulbo(m, 'bulbo', (0, 1.4, 0), 2.8, 2.6, yaw=10)
    q = m.stem('cuello', cima, 1.8, 0.95, 'cebolla_bulbo', tilt=0, yaw=0)
    q = (q[0], q[1] - 0.2, q[2])
    tubo(m, 'hoja0', q, PLANO, [(8.2, 10, 0.85)])
    tubo(m, 'hoja1', q, PLANO + 180, [(7.6, 13, 0.85)], cols=SOMBRA)
    tubo(m, 'hoja2', q, PLANO + 35, [(4.0, 22, 0.85), (2.4, 45, 0.7), (1.8, 100, 0.6)])
    tubo(m, 'hoja3', q, PLANO + 215, [(3.8, 26, 0.85), (2.2, 55, 0.7), (1.6, 110, 0.6)], cols=SOMBRA)
    tubo(m, 'hoja4', q, PLANO + 100, [(5.6, 5, 0.8)], cols=CLARA)
    tubo(m, 'hoja5', q, PLANO - 70, [(3.6, 30, 0.8)], cols=SOMBRA)
    # chicas: bulbito de 2 cubos y 3 hojas
    for tag, c, sg in (('i', IZQ, 1), ('d', DER, -1)):
        cima = bulbo(m, f'bulbo{tag}', (c[0], 1.5, c[2]), 1.9, 1.9, yaw=-15 * sg, cubos=2)
        q = (cima[0], cima[1] - 0.2, cima[2])
        tubo(m, f'hoja{tag}0', q, PLANO, [(5.6, 12, 0.7)])
        tubo(m, f'hoja{tag}1', q, PLANO + 180, [(3.0, 20, 0.7), (1.6, 70, 0.55)], cols=SOMBRA)
        tubo(m, f'hoja{tag}2', q, PLANO + 90 * sg, [(3.4, 8, 0.65)], cols=CLARA)
    return m


def madurez():
    """Cosecha: el cuello se ablando y casi todas las hojas se doblaron y cayeron juntas hacia atras
    (verdes, amarillas y secas, tendidas en el lomo); queda una en pie que se dobla. Los bulbos
    grandes, blancos con la tunica dorada de papel que se pela, se ven claros al frente sobre el lomo
    con sus raicitas. Las chicas igual, mas pequenas. 50 cubos."""
    m = Model('cebolla_madurez', PAL)
    monticulo(m)
    # principal
    c = (0, 1.0, 0)
    cima = bulbo(m, 'bulbo', c, 5.4, 5.0, cols=MADURO, yaw=8)
    m.box('tunica_pelada', mover(c, 50, 2.15, 2.1), (1.7, 2.3, 0.25), 'cebolla_tunica', tilt=-14, yaw=50)
    m.box('tunica_cuello', (0, cima[1] - 0.4, 0), (1.8, 0.7, 1.8), 'cebolla_tunica', yaw=30)
    raices(m, 'raiz', (0, 2.05, 0), 2.3, [15, 70, 125], largo=1.5)
    q = m.stem('cuello', (0, cima[1] - 0.1, 0), 1.0, 1.1, 'hoja_marchita', tilt=25, yaw=CAIDA)
    # hojas acamadas en manojo: se doblan en el cuello y caen hacia atras a la izquierda
    tendida(m, 'hoja0', q, CAIDA - 20, [(0.8, 70, 0.9)], 4.6, 2.0, 0.85, cols=MARCHITA)
    tendida(m, 'hoja1', q, CAIDA, [(0.8, 75, 0.9)], 4.4, 2.4, 0.85, cols=AMARILLA)
    tendida(m, 'hoja2', q, CAIDA + 20, [(0.8, 70, 0.85)], 4.4, 2.0, 0.8, cols=MARCHITA)
    tendida(m, 'hoja3', q, CAIDA - 45, [], 4.2, 1.6, 0.75, cols=SECA)
    tendida(m, 'hoja4', q, CAIDA + 38, [], 4.2, 1.8, 0.75, cols=AMARILLA)
    tubo(m, 'hoja5', q, CAIDA + 150, [(2.6, 12, 0.85), (2.0, 50, 0.7), (1.6, 120, 0.6)], cols=MARCHITA)
    # chicas: tambien acamadas hacia el mismo lado
    for tag, c, giro in (('i', IZQ, 250), ('d', DER, 290)):
        b = (c[0], 1.5, c[2])
        cima = bulbo(m, f'bulbo{tag}', b, 2.8, 2.7, cols=MADURO, yaw=-20 if tag == 'i' else 25)
        raices(m, f'raiz{tag}', (c[0], 2.05, c[2]), 1.1, [giro - 200, giro - 130], largo=1.1)
        q = (cima[0], cima[1] - 0.2, cima[2])
        tendida(m, f'hoja{tag}0', q, CAIDA, [], 2.6, 1.2, 0.6, cols=AMARILLA)
        tendida(m, f'hoja{tag}1', q, CAIDA + 40, [(0.6, 40, 0.65)], 2.4, 0.8, 0.6, cols=MARCHITA)
    return m


def podrida():
    """Desenlace de estres: hojas secas tendidas sobre el lomo agrietado, el bulbo principal blando y
    hundido, oscurecido y con moho; una cebolla chica partida deja ver sus capas negras; la otra se
    deshizo en una mancha. Moscas. 42 cubos."""
    m = Model('cebolla_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.2, 2, 2.4), (4.2, 0.2, 0.5), 'suelo_grieta', yaw=-20)
    m.box('grieta2', (-2.6, 2, -2.0), (0.5, 0.2, 2.6), 'suelo_grieta', yaw=15)
    # principal: bulbo achatado y blando
    c = (0.3, 1.0, 0.2)
    cima = bulbo(m, 'bulbo', c, 5.6, 4.2, cols=PODRIDO, yaw=22)
    m.box('bulbo_hundido', (c[0] + 0.4, cima[1] - 0.3, c[2] + 0.3), (2.2, 0.4, 2.0), 'podrido_dark', yaw=30)
    m.box('moho_a', mover(c, 60, 1.3, 3.4), (2.0, 0.35, 1.6), 'moho', yaw=40)
    m.box('moho_b', mover(c, 200, 0.9, 3.5), (1.4, 0.3, 1.4), 'moho_light', yaw=-10)
    m.box('moho_c', mover(c, 115, 2.4, 1.8), (1.2, 1.2, 0.3), 'moho_dark', yaw=115)
    m.box('tunica_suelta', mover(c, 25, 3.6, 1.0), (1.8, 0.2, 1.2), 'hoja_seca_dark', yaw=-35)
    raices(m, 'raiz', (c[0], 2.05, c[2]), 2.4, [40, 160], col='podrido', largo=1.3)
    q = (cima[0] - 0.2, cima[1] - 0.2, cima[2] - 0.2)
    m.box('cuello', q, (1.2, 0.6, 1.2), 'podrido_dark', yaw=10)
    q = (q[0], q[1] + 0.3, q[2])
    # hojas secas tendidas a ras del lomo
    tendida(m, 'hoja0', q, 210, [], 4.0, 2.2, 0.7, cols=SECA)
    tendida(m, 'hoja1', q, 255, [], 4.2, 2.0, 0.7, cols=('hoja_seca_dark', 'hoja_seca_dark', 'hoja_seca'))
    tendida(m, 'hoja2', q, 165, [], 3.8, 1.8, 0.65, cols=AMARILLA)
    tendida(m, 'hoja3', q, 300, [], 3.6, 1.2, 0.6, cols=('podrido',) * 3)
    # chica izquierda: partida; una mitad boca arriba deja ver las capas (anillos) negras, la otra cayo
    x, z = IZQ[0], IZQ[2]
    b = (x - 0.3, 1.6, z + 0.2)
    m.box('mitad_a', b, (2.8, 1.1, 2.0), 'podrido', yaw=20)
    m.box('mitad_a_b', b, (2.0, 1.1, 2.8), 'podrido', yaw=20)
    for k, (t, col) in enumerate(((2.3, 'hoja_seca'), (1.7, 'podrido_dark'), (1.1, 'hoja_seca_dark'),
                                  (0.5, 'black'))):
        m.box(f'mitad_a_capa{k}', (b[0], b[1] + 1.1, b[2]), (t, 0.1 + 0.04 * k, t), col, yaw=20)
    c2 = (x + 1.4, 1.6, z - 1.5)
    m.box('mitad_b', c2, (1.4, 1.9, 2.4), 'podrido', yaw=-30)
    m.box('mitad_b_cima', (c2[0], c2[1] + 0.3, c2[2]), (1.8, 1.4, 1.6), 'podrido', yaw=-30)
    m.box('mitad_moho', (c2[0], c2[1] + 1.9, c2[2]), (1.0, 0.3, 1.4), 'moho_light', yaw=-30)
    # chica derecha: deshecha, una mancha blanda con moho y su hoja seca
    x, z = DER[0], DER[2]
    m.box('mancha', (x, 1.6, z), (3.2, 0.7, 2.6), 'podrido_dark', yaw=-25)
    m.box('mancha_bulbo', (x, 2.0, z), (2.2, 1.2, 2.0), 'podrido', yaw=10)
    m.box('mancha_moho', (x + 0.2, 3.1, z), (1.4, 0.35, 1.2), 'moho', yaw=30)
    tendida(m, 'hojad', (x, 3.0, z), 60, [], 1.6, 1.4, 0.5, cols=('hoja_seca_dark',) * 3)
    moscas(m, [(1.6, 7.4, 2.2, 20), (-3.6, 5.4, 2.8, -40)])
    return m


ETAPAS = [('cebolla_siembra', siembra), ('cebolla_brote', brote), ('cebolla_crecimiento', crecimiento),
          ('cebolla_madurez', madurez), ('cebolla_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
