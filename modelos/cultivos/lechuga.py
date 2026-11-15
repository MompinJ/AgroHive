"""Generador de la lechuga (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/lechuga.py

Lechuga (Lactuca sativa), tipo de hoja suelta / romana. Convenciones (docs/07): 1 celda = 16
unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas
comparten el lomo de surco del maiz (14x2x10) y el anclaje (0, 2, 0), y caben en una huella de
16x16. Las alturas y tamanos son CUALITATIVOS, no medidas reales: la cabeza madura queda en ~8
unidades, pegada al lomo (la mas baja de las hortalizas de hoja junto con la espinaca).

Rasgos que se respetan:
- ROSETA basal: tallo casi nulo (no se alarga hasta que espiga) y todas las hojas salen del centro,
  abriendose como una flor; las de afuera mas grandes, abiertas y oscuras, el corazon claro y
  apretado.
- Hojas anchas (obovadas o espatuladas) con el borde ONDULADO y rizado: cada hoja lleva al final
  uno o dos "rizos" (cubos cortos y anchos mas claros, inclinados en zigzag) que rompen la orilla.
  Las exteriores llevan la nervadura central clara.
- Verde claro (lechuga_hoja_*), no azulado: se distingue de la col (hoja lisa, cerosa y azulada) y
  de la espinaca (hoja lisa, verde oscuro).
- Siembra en chorrillo: semillas (aquenios) chicas y alargadas en fila sobre el lomo humedo.
- Plantula: dos cotiledones ovalados y lisos y las dos primeras hojas espatuladas.
- Desenlace: hojas exteriores cafes y marchitas vencidas sobre el lomo, una caida al suelo, centro
  podrido oscuro y hundido con moho, manchas de pudricion y moscas.
Silueta a 20 px: bola verde clara rizada pegada al lomo.

Fuentes de forma (consultadas el 15/11):
- NC State Extension Plant Toolbox, Lactuca sativa: hojas alternas en roseta basal (rosulate),
  obovadas o espatuladas, margen ondulado (undulate) o sinuado, 6 a 12 pulgadas de alto y ancho; el
  tallo queda muy corto hasta que espiga; flores amarillas chicas en tallos altos.
  https://plants.ces.ncsu.edu/plants/lactuca-sativa/
- Frontiers in Plant Science 2021 (espigado de la lechuga): el paso a reproductivo se marca por el
  alargamiento del tallo y deja la hoja amarga (no se usa aqui; el desenlace es la pudricion).
  https://frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.632708/full
- Northern Nester, etapas de la lechuga romana (guia de huerta, menos rigurosa): germinacion,
  cotiledones, hojas verdaderas, roseta y cabeza.
  https://northernnester.com/romaine-lettuce-growing-stages/

Colores solo de la paleta fija: lechuga_hoja_dark/_hoja/_hoja_light, white (nervadura),
calabaza_crema y hoja_seca_light (semilla), y los marchitos compartidos (hoja_seca*, hoja_marchita,
podrido*, moho*). Las hojas giran en los tres ejes con `marco` y `caja` de calabacita.py (rotacion
Euler ZYX alrededor del centro de cada cubo, sin mover la caja).
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

OSCURA = ('lechuga_hoja_dark', 'lechuga_hoja_dark', 'lechuga_hoja')
MEDIA = ('lechuga_hoja_dark', 'lechuga_hoja', 'lechuga_hoja_light')
CLARA = ('lechuga_hoja', 'lechuga_hoja_light', 'lechuga_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')
MARCHITA = ('hoja_seca', 'hoja_marchita', 'hoja_seca_light')


# ---------------- piezas ----------------
def hoja(m, nombre, base, yaw, p1, L1, p2, L2, W, cols=MEDIA, rizos=1, nervio=None, grueso=0.45):
    """Hoja de lechuga en dos tramos desde `base` hacia `yaw`: tramo basal angosto con pendiente p1 y
    lamina ancha con pendiente p2 (negativo = sube, positivo = cae), y al final `rizos` cubos anchos
    inclinados en zigzag (borde ondulado). L2 = 0 deja la hoja de un solo tramo. Cubos:
    1 o 2 + rizos (+1 con nervio). Devuelve la punta."""
    r1 = marco(yaw, p1)
    caja(m, nombre + '_base', en(base, r1, (0, 0, L1 / 2)), (W * 0.62, grueso, L1), cols[0], r1)
    fin, r, ancho = en(base, r1, (0, 0, L1)), r1, W * 0.62
    if L2:
        r = marco(yaw, p2)
        caja(m, nombre + '_lamina', en(fin, r, (0, 0, L2 / 2 - 0.3)), (W, grueso * 0.9, L2), cols[1], r)
        fin, ancho = en(fin, r, (0, 0, L2 - 0.3)), W
    if nervio:   # sobre la lamina, que es lo que queda a la vista
        caja(m, nombre + '_nervio', en(fin, r, (0, grueso * 0.45 + 0.04, -L2 * 0.45 if L2 else -L1 * 0.45)),
             (0.4, 0.1, (L2 or L1) * 0.75), nervio, r)
    pend = p2 if L2 else p1
    for k in range(rizos):
        dx = (k - (rizos - 1) / 2) * ancho / rizos
        s = 1 if k % 2 == 0 else -1
        rr = marco(yaw, pend - 22 * s, espin=16 * s)
        caja(m, f'{nombre}_rizo{k}', en(fin, r, (dx, 0.12, -0.25)), (ancho / rizos * 1.12, 0.35, 1.5), cols[2], rr)
    return fin


def corona(m, nombre, specs, cols, rizos, nervios=(), r0=0.8, y0=0.3, giro=0.0):
    """Anillo de hojas: specs = [(p1, L1, p2, L2, W), ...] repartidos en yaw desde `giro`."""
    n = len(specs)
    for k, (p1, L1, p2, L2, W) in enumerate(specs):
        yaw = giro + 360 * k / n
        b = mover(BASE, yaw, r0, y0)
        hoja(m, f'{nombre}{k}', b, yaw, p1, L1, p2, L2, W, cols=cols[k % len(cols)] if isinstance(cols[0], tuple) else cols,
             rizos=rizos, nervio='white' if k in nervios else None)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo sembrado a chorrillo: una franja oscura y semillitas alargadas crema en fila, una
    medio tapada, y un terron. 11 cubos con el lomo."""
    m = Model('lechuga_siembra', PAL)
    monticulo(m)
    m.box('chorrillo', (0, 2, 0), (8.4, 0.14, 1.8), 'suelo_humedo', yaw=-8)
    semillas = [(-3.3, 0.45, 30, 'calabaza_crema'), (-1.9, 0.2, -25, 'calabaza_crema'),
                (-0.6, 0.0, 70, 'hoja_seca_light'), (0.8, -0.25, 10, 'calabaza_crema'),
                (2.1, -0.3, -50, 'calabaza_crema'), (3.4, -0.5, 35, 'hoja_seca_light')]
    for k, (x, z, a, col) in enumerate(semillas):
        m.box(f'semilla{k}', (x, 2.14, z), (1.0, 0.3, 0.38), col, yaw=a)
    m.box('tapado', (0.75, 2.14, -0.3), (0.8, 0.42, 0.9), 'soil_dark', yaw=20)
    m.box('terron', (-3.4, 2, -1.9), (1.2, 0.7, 1.0), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula: tallito corto, dos cotiledones ovalados lisos casi horizontales y las dos primeras
    hojas verdaderas espatuladas, mas erguidas, una con el borde ya rizado. 11 cubos con el lomo."""
    m = Model('lechuga_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.4, 0.16, 2.8), 'suelo_humedo', yaw=-8)
    m.box('tallito', BASE, (0.5, 1.0, 0.5), 'lechuga_hoja_light')
    top = (0, 2.9, 0)
    for k, yaw in enumerate((120, 300)):
        r = marco(yaw, -10)
        caja(m, f'cotiledon{k}', en(top, r, (0, 0, 1.0)), (1.1, 0.3, 1.8), 'lechuga_hoja_light', r)
    # hojas verdaderas espatuladas: cabo angosto y lamina ancha, la primera ya con el borde rizado
    hoja(m, 'hoja1', mover(top, 30, 0.1, 0.05), 30, -40, 1.1, -18, 1.6, 1.6, cols=MEDIA, rizos=1, grueso=0.3)
    hoja(m, 'hoja2', mover(top, 210, 0.1, 0.05), 210, -44, 1.0, -24, 1.3, 1.4, cols=CLARA, rizos=0, grueso=0.3)
    return m


def crecimiento():
    """Roseta abierta de 7 hojas onduladas en espiral: las viejas mas grandes, bajas y oscuras, las
    nuevas chicas, erguidas y claras (las 3 viejas con doble rizo), y un cogollo al centro. 28 cubos con
    el lomo."""
    m = Model('lechuga_crecimiento', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.2, 0.6, 1.2), 'lechuga_hoja_dark', yaw=15)
    # (yaw, p1, L1, p2, L2, W, cols): angulo de oro (~137.5) para que no se encimen
    specs = [(20, -22, 2.6, 4, 2.6, 3.6, OSCURA), (157, -24, 2.6, 2, 2.5, 3.5, OSCURA),
             (295, -28, 2.4, 0, 2.3, 3.3, MEDIA), (72, -36, 2.2, -10, 2.1, 3.0, MEDIA),
             (210, -44, 2.0, -16, 1.8, 2.7, MEDIA), (347, -55, 1.8, -28, 1.5, 2.3, CLARA),
             (125, -64, 1.6, -38, 1.2, 2.0, CLARA)]
    for k, (yaw, p1, L1, p2, L2, W, cols) in enumerate(specs):
        hoja(m, f'hoja{k}', mover(BASE, yaw, 0.4, 0.4), yaw, p1, L1, p2, L2, W, cols=cols, rizos=2 if k < 3 else 1)
    m.box('cogollo', (0, 2.5, 0), (1.3, 1.6, 1.3), 'lechuga_hoja_light', yaw=40)
    return m


def madurez():
    """Cabeza llena y redondeada: 6 hojas exteriores grandes y abiertas (verde medio, nervadura clara y
    doble rizo en la orilla), 5 intermedias mas paradas, 4 interiores que suben y se doblan sobre el
    corazon y un corazon claro y apretado. 54 cubos con el lomo."""
    m = Model('lechuga_madurez', PAL)
    monticulo(m)
    m.box('tallo', BASE, (1.8, 0.6, 1.8), 'lechuga_hoja_dark', yaw=20)
    # exteriores: suben 34-40 grados y la orilla se abre y cae un poco
    corona(m, 'ext', [(-36, 3.3, 8, 3.0, 4.6), (-40, 3.2, 4, 2.9, 4.4), (-34, 3.4, 10, 3.0, 4.6),
                      (-38, 3.3, 6, 2.9, 4.5), (-36, 3.2, 8, 3.0, 4.4), (-40, 3.3, 4, 2.9, 4.6)],
           OSCURA, rizos=2, nervios=(0, 2, 4), r0=1.0, y0=0.3, giro=10)
    # intermedias: mas paradas, un solo tramo con la orilla rizada
    corona(m, 'med', [(-56, 4.2, 0, 0, 4.2), (-60, 4.0, 0, 0, 4.0), (-54, 4.2, 0, 0, 4.2),
                      (-58, 4.0, 0, 0, 4.0), (-60, 4.1, 0, 0, 4.1)],
           MEDIA, rizos=1, r0=0.8, y0=0.5, giro=46)
    # interiores: suben casi verticales y la punta se dobla hacia adentro, sobre el corazon
    corona(m, 'int', [(-76, 3.0, -122, 2.0, 3.4)] * 4, CLARA, rizos=1, r0=1.0, y0=0.6, giro=0)
    # corazon claro y apretado: domo octagonal
    m.box('corazon', (0, 2.6, 0), (3.4, 3.8, 3.4), 'lechuga_hoja_light')
    m.box('corazon2', (0, 2.6, 0), (2.8, 4.4, 2.8), 'lechuga_hoja_light', yaw=45)
    return m


def podrida():
    """Desenlace de estres: lomo seco y agrietado, hojas exteriores cafes y marchitas vencidas sobre el
    lomo (una caida al suelo), intermedias amarillentas dobladas, centro podrido, oscuro y hundido con
    moho, manchas de pudricion y dos moscas. 46 cubos con el lomo."""
    m = Model('lechuga_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.6, 2, -1.6), (3.6, 0.16, 0.45), 'suelo_grieta', yaw=28)
    m.box('grieta2', (-2.8, 2, 1.4), (0.45, 0.16, 2.8), 'suelo_grieta', yaw=-20)
    m.box('tallo', BASE, (1.8, 0.5, 1.8), 'podrido_dark', yaw=20)
    # exteriores vencidas: el tramo basal casi plano y la lamina colgando hasta el lomo o el suelo
    ext = [(15, 6, 3.2, 24, 2.8, 4.0, SECA), (75, 4, 3.4, 12, 3.0, 4.2, MARCHITA),
           (135, 8, 3.0, 26, 2.6, 3.8, SECA), (200, 5, 3.2, 22, 2.8, 4.0, ('podrido', 'hoja_seca_dark', 'hoja_seca')),
           (255, 4, 3.4, 12, 3.0, 4.2, SECA), (320, 7, 3.0, 24, 2.6, 3.9, MARCHITA)]
    for k, (yaw, p1, L1, p2, L2, W, cols) in enumerate(ext):
        hoja(m, f'ext{k}', mover(BASE, yaw, 0.9, 0.35), yaw, p1, L1, p2, L2, W, cols=cols, rizos=1)
    # manchas de pudricion sobre tres laminas
    for k, (yaw, d) in enumerate([(75, 4.6), (200, 4.0), (320, 3.8)]):
        r = marco(yaw, 8)
        p = mover(BASE, yaw, d, 0.25)
        caja(m, f'mancha{k}', en(p, r, (0.5, 0.28, 0)), (1.4, 0.1, 1.2), 'podrido_dark', r)
    # hoja suelta en el suelo, fuera del lomo
    m.box('hoja_suelo', (5.6, 0, 6.2), (2.6, 0.25, 1.7), 'hoja_seca', yaw=-35)
    m.box('hoja_suelo_rizo', (6.5, 0.25, 5.5), (1.5, 0.25, 1.0), 'hoja_seca_light', yaw=-10)
    # intermedias amarillentas, dobladas a media altura
    corona(m, 'med', [(-20, 3.0, 0, 0, 3.0), (-14, 3.2, 0, 0, 3.2), (-24, 2.8, 0, 0, 2.9), (-16, 3.0, 0, 0, 3.0)],
           (('hoja_marchita', 'hoja_marchita', 'hoja_seca_light'), ('hoja_seca', 'hoja_seca', 'hoja_marchita')),
           rizos=1, r0=0.6, y0=0.5, giro=45)
    # centro podrido hundido, con moho
    m.box('centro', (0, 2.3, 0), (3.4, 1.3, 3.4), 'podrido_dark', yaw=15)
    m.box('centro2', (0.2, 2.3, -0.1), (2.6, 1.8, 2.6), 'podrido', yaw=60)
    m.box('moho1', (-0.3, 4.1, 0.2), (1.5, 0.3, 1.3), 'moho_light', yaw=20)
    m.box('moho2', (1.0, 3.6, -0.8), (1.1, 0.3, 1.0), 'moho', yaw=-15)
    m.box('moho3', (0.9, 2.2, 1.7), (1.2, 0.3, 0.9), 'moho_dark', yaw=40)
    m.box('escurrido', (-1.6, 2, 1.8), (1.8, 0.12, 1.4), 'podrido_dark', yaw=-25)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(1.4, 7.2, 1.8, 20), (-2.4, 6.2, -1.2, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('lechuga_siembra', siembra), ('lechuga_brote', brote), ('lechuga_crecimiento', crecimiento),
          ('lechuga_madurez', madurez), ('lechuga_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
