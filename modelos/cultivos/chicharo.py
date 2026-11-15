"""Generador del chicharo (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/chicharo.py

Chicharo o guisante (Pisum sativum), de guia trepadora sobre tutor. Convenciones (docs/07): 1 celda =
16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas
comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una
huella de 16x16. El tutor (varita de madera) esta clavado en el lomo, un poco detras del tallo, desde
la siembra. Las alturas son cualitativas, no medidas reales.

Rasgos que se respetan para no confundirlo con el frijol, el haba y el caupi: planta trepadora que
sube pegada a un tutor; hoja compuesta de 1 o 2 pares de foliolos ovalados cuyo raquis termina en
ZARCILLO (los de la punta se enroscan en el tutor y los de las hojas forman rizos libres); estipulas
grandes, mas que los foliolos, abrazando el tallo en cada nudo, en verde claro glauco; flores
blancas; vainas verde brillante que cuelgan, a veces en par desde el mismo nudo, y una vaina abierta
sobre el lomo con los chicharos verdes redondos en fila. Colores de la paleta fija, sin colores
nuevos (chicharo_*, wood para el tutor, white para la flor, hoja_seca*, podrido* y moho* en lo seco).

Fuentes de forma (no de medidas):
- University of Michigan Herbarium, Climbers: Pisum sativum (https://climbers.lsa.umich.edu/pisum-sativum):
  hojas compuestas con estipulas grandes, a menudo mas que los foliolos; raquis en zarcillo; vaina de
  4-15 cm por 1.5-2.5 cm con 2-10 semillas.
- Flora of New Zealand, Pisum sativum (https://nzflora.info/factsheet/Taxon/Pisum-sativum.html):
  1-3 pares de foliolos opuestos, zarcillo ramificado al final, semilla globosa lisa o rugosa.
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
from maiz import punta, monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)
ALTO_TUTOR = 18.0     # varita clavada en el lomo; cualitativo


def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


TUTOR = mover(BASE, FRENTE + 180, 1.3)   # pie del tutor, detras del tallo visto desde la camara

HOJA = ('chicharo_hoja_dark', 'chicharo_hoja', 'chicharo_hoja_light')   # tallo y zarcillo, foliolo, estipula
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')


# ---------------- utilidades ----------------
def palo(m, nombre, a, b, grueso, col):
    """Caja recta de a a b (tallo, zarcillo, pedunculo). 1 cubo. Devuelve b."""
    dx, dy, dz = (b[i] - a[i] for i in range(3))
    largo = math.sqrt(dx * dx + dy * dy + dz * dz)
    tilt = math.degrees(math.acos(max(-1.0, min(1.0, dy / largo))))
    yaw = math.degrees(math.atan2(dx, dz))
    m.box(nombre, a, (grueso, largo, grueso), col, tilt=tilt, yaw=yaw)
    return b


def tutor(m, tilt=0, yaw=0, alto=ALTO_TUTOR):
    """Varita de madera clavada en el lomo con su corte oscuro arriba. 2 cubos. Devuelve la punta."""
    top = m.stem('tutor', TUTOR, alto, 0.9, 'wood', tilt=tilt, yaw=yaw)
    m.box('tutor_corte', top, (1.0, 0.5, 1.0), 'wood_dark', tilt=tilt, yaw=yaw)
    return top


def en_tutor(h, ang, r, tilt=0, yaw=0):
    """Punto a radio r del eje del tutor, a la altura h (sobre el pie) y en el angulo ang."""
    eje = punta(TUTOR, h, tilt, yaw)
    return mover(eje, ang, r)


def enrosque(m, nombre, h, ang0, n=3, r=0.85, paso=0.45, col=HOJA[2], giro=95, tilt=0, yaw=0):
    """Zarcillo enroscado en el tutor: n tramos de helice alrededor de la varita. n cubos.

    Devuelve el punto donde empieza (para unirlo con la hoja o la punta del tallo)."""
    pts = [en_tutor(h + paso * k, ang0 + giro * k, r, tilt, yaw) for k in range(n + 1)]
    for k in range(n):
        palo(m, f'{nombre}{k}', pts[k], pts[k + 1], 0.3, col)
    return pts[0]


def rizo(m, nombre, base, yaw, s=1.0, col=HOJA[2]):
    """Zarcillo libre en rizo: sube, se dobla y se recoge hacia abajo como gancho. 2 cubos."""
    q = m.stem(nombre, base, 1.5 * s, 0.3, col, tilt=35, yaw=yaw)
    q = m.stem(nombre + '_b', q, 1.2 * s, 0.3, col, tilt=125, yaw=yaw + 80)
    return q


def foliolo(m, nombre, p, yaw, largo, col, caida=8, ancho=None):
    """Foliolo ovalado que sale de p hacia yaw; caida > 0 baja la punta. 1 cubo."""
    w = ancho if ancho is not None else largo * 0.66
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (w, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)


def estipulas(m, nombre, nodo, yaw, s=2.6, col=HOJA[2]):
    """Par de estipulas grandes que abrazan el tallo en el nudo: una lamina ancha atravesada. 1 cubo."""
    m.box(nombre, (nodo[0], nodo[1] - 0.25, nodo[2]), (s, 0.3, s * 0.55), col, tilt=-12, yaw=yaw)


def hoja(m, nombre, nodo, yaw, s=2.2, pares=1, cols=HOJA, pec=1.2, tilt_pec=62, caida=10, zarcillo=True):
    """Hoja de chicharo: estipulas, peciolo, 1 o 2 pares de foliolos y zarcillo al final del raquis.

    4 + 2 * pares cubos con zarcillo (2 + 2 * pares sin el). Devuelve el final del raquis."""
    estipulas(m, nombre + '_estip', nodo, yaw, col=cols[2])
    p = m.stem(nombre + '_pec', nodo, pec, 0.3, cols[0], tilt=tilt_pec, yaw=yaw)
    for k in range(pares):
        q = mover(p, yaw, s * 0.5 * k, -0.05 * k)
        for j, lado in enumerate((1, -1)):
            foliolo(m, f'{nombre}_f{k}{j}', q, yaw + lado * (58 - 16 * k), s * (1 - 0.12 * k), cols[1], caida)
        p = q
    if zarcillo:
        p = rizo(m, nombre + '_zar', mover(p, yaw, s * 0.45, 0.05), yaw, s=0.9, col=cols[2])
    return p


def flor(m, nombre, base, yaw):
    """Flor blanca papilionacea: pedicelo, estandarte erguido y quilla con alas. 3 cubos."""
    p = m.stem(nombre + '_ped', base, 1.0, 0.25, HOJA[0], tilt=55, yaw=yaw)
    m.box(nombre + '_estandarte', mover(p, yaw, -0.2), (1.3, 1.2, 0.3), 'white', tilt=-15, yaw=yaw)
    m.box(nombre + '_quilla', mover(p, yaw, 0.35, -0.1), (0.75, 0.6, 0.9), 'white', yaw=yaw)
    return p


def vaina(m, nombre, base, yaw, largo=4.4, cols=('chicharo_vaina', 'chicharo_vaina'), ped=0.9, curva=14):
    """Vaina colgante: pedunculo corto y vaina recta-curva en dos tramos verde brillante. 3 cubos."""
    p = m.stem(nombre + '_ped', base, ped, 0.25, HOJA[0], tilt=115, yaw=yaw)
    a = largo * 0.56
    m.box(nombre + '_a', p, (1.15, a, 0.85), cols[0], tilt=172, yaw=yaw)
    q = punta(p, a - 0.1, 172, yaw)
    m.box(nombre + '_b', q, (1.0, largo - a, 0.8), cols[1], tilt=172 - curva, yaw=yaw)
    return punta(q, largo - a, 172 - curva, yaw)


def vaina_abierta(m, nombre, c, eje, n=5, cols=('chicharo_vaina', 'chicharo_hoja_dark', 'chicharo_semilla'),
                  semillas=None):
    """Vaina abierta tumbada en el lomo: fondo oscuro, dos valvas abiertas en V y los chicharos en fila.

    El eje largo va en x local (y = eje - 90) para que las valvas giren sobre su costura. semillas:
    lista de colores, uno por chicharo (None = hueco). 3 + chicharos + 1 cubos."""
    y = eje - 90
    largo = 1.0 * n + 0.6
    m.box(nombre + '_fondo', c, (largo, 0.45, 0.9), cols[1], yaw=y)
    for j, lado in enumerate((-1, 1)):
        bisagra = mover(c, y, lado * 0.45)
        # la valva de atras (lado -1) se levanta como respaldo; la del frente queda baja y deja ver
        # los chicharos desde la camara
        ancho = 1.5 if lado < 0 else 1.2
        m.box(f'{nombre}_valva{j}', mover(bisagra, y, lado * ancho / 2), (largo + 0.3, 0.3, ancho), cols[0],
              tilt=-lado * (68 if lado < 0 else 18), yaw=y, pivot=bisagra)
    sem = semillas if semillas is not None else [cols[2]] * n
    for k, col in enumerate(sem):
        if col is None:
            continue
        u = (k - (n - 1) / 2) * 1.0
        m.box(f'{nombre}_chicharo{k}', mover(c, eje, u, 0.35), (0.95, 0.9, 0.95), col, yaw=y + 45 * (k % 2))
    # caliz (cabito) en un extremo y pico de la vaina en el otro
    m.box(nombre + '_caliz', mover(c, eje, -largo / 2 - 0.2, 0.05), (0.7, 0.5, 0.6), HOJA[0], yaw=y)
    return c


def tallo(m, alturas, angulos, r=1.0, grueso=0.5, col=HOJA[0], nombre='tallo'):
    """Tallo que sube por el tutor en zigzag, pegado a la varita del lado de la camara.

    Parte de BASE; cada nudo esta a radio r del tutor, a la altura dada y en el angulo dado. Devuelve los nudos."""
    nudos = [BASE]
    for k, (h, ang) in enumerate(zip(alturas, angulos)):
        nudos.append(palo(m, f'{nombre}{k}', nudos[-1], en_tutor(h, ang, r), grueso, col))
    return nudos


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con el tutor ya clavado y tres chicharos redondos (cubo y cubo girado 45 grados, que
    se lee como octagono). 12 cubos (10 mas el lomo)."""
    m = Model('chicharo_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (6.6, 0.12, 4.2), 'suelo_humedo', yaw=10)
    tutor(m, alto=6.0)
    for k, ((x, z), yaw, s) in enumerate([((-0.9, 0.9), 20, 1.15), ((0.9, 0.4), -30, 1.05), ((0.1, 1.9), 55, 1.0)]):
        m.box(f'chicharo{k + 1}', (x, 2.1, z), (s, s * 0.95, s), 'chicharo_semilla', yaw=yaw)
        m.box(f'chicharo{k + 1}_redondo', (x, 2.2, z), (s * 0.95, s * 0.75, s * 0.95), 'chicharo_hoja_light',
              yaw=yaw + 45)
    m.box('terron', (3.6, 2, 1.2), (1.5, 0.9, 1.3), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula junto al tutor: tallito, estipulas, un par de foliolos, yema y un zarcillo que ya se
    enrosca en la varita. 12 cubos (10 mas el lomo)."""
    m = Model('chicharo_brote', PAL)
    monticulo(m)
    tutor(m, alto=8.0)
    nudo = palo(m, 'tallito', BASE, (0.15, 4.4, 0.25), 0.45, 'chicharo_hoja')
    estipulas(m, 'estipulas', (0.1, 3.7, 0.18), FRENTE + 90, s=2.0)
    for j, lado in enumerate((1, -1)):
        foliolo(m, f'foliolo{j}', (0.1, 3.8, 0.18), FRENTE + lado * 70, 1.7, 'chicharo_hoja', caida=-12)
    m.box('yema', nudo, (0.7, 0.9, 0.6), 'chicharo_hoja_light', tilt=-15, yaw=FRENTE)
    # zarcillo: del apice hacia la varita y una vuelta en ella
    ini = enrosque(m, 'zarcillo_vuelta', 3.0, FRENTE + 60, n=2, r=0.75, paso=0.3)
    palo(m, 'zarcillo', nudo, ini, 0.3, 'chicharo_hoja_light')
    return m


def crecimiento():
    """Guia subiendo por el tutor: tallo en zigzag, 2 hojas con estipulas y rizos, zarcillos enroscados
    en la punta y 2 flores blancas. 28 cubos."""
    m = Model('chicharo_crecimiento', PAL)
    monticulo(m)
    tutor(m, alto=13.0)
    nudos = tallo(m, [4.0, 7.2, 9.6], [FRENTE + 30, FRENTE - 30, FRENTE + 15], grueso=0.5)
    hoja(m, 'hoja0', nudos[1], FRENTE + 75, s=2.2, caida=12)
    hoja(m, 'hoja1', nudos[2], FRENTE - 80, s=2.2, caida=8)
    # punta tierna y zarcillos de la punta enroscados en la varita
    m.box('yema', nudos[3], (0.7, 1.0, 0.6), 'chicharo_hoja_light', tilt=-10, yaw=FRENTE)
    ini = enrosque(m, 'zarcillo_punta', 10.4, FRENTE - 40, n=3)
    palo(m, 'zarcillo_punta', nudos[3], ini, 0.3, 'chicharo_hoja_light')
    # flores blancas en las axilas, hacia la camara
    flor(m, 'flor0', nudos[2], FRENTE + 10)
    flor(m, 'flor1', nudos[1], FRENTE - 40)
    return m


def madurez():
    """Planta en el tutor: 3 hojas con estipulas y zarcillos, punta enroscada, una flor tardia, 3 vainas
    colgando (un par en el mismo nudo) y una vaina abierta en el lomo con 5 chicharos en fila. 55 cubos."""
    m = Model('chicharo_madurez', PAL)
    monticulo(m)
    tutor(m, alto=14.5)
    nudos = tallo(m, [3.4, 6.7, 9.9, 12.5], [FRENTE + 30, FRENTE - 30, FRENTE + 30, FRENTE - 10], grueso=0.55)
    hoja(m, 'hoja0', nudos[1], FRENTE + 80, s=2.3, caida=14)
    hoja(m, 'hoja1', nudos[2], FRENTE - 85, s=2.4, pares=2, caida=10)
    hoja(m, 'hoja2', nudos[3], FRENTE + 85, s=2.2, caida=6)
    # punta: yema y zarcillos enroscados en lo alto de la varita
    m.box('yema', nudos[4], (0.7, 1.0, 0.6), 'chicharo_hoja_light', tilt=-10, yaw=FRENTE)
    ini = enrosque(m, 'zarcillo_punta', 13.0, FRENTE - 50, n=3)
    palo(m, 'zarcillo_punta', nudos[4], ini, 0.3, 'chicharo_hoja_light')
    # flor tardia arriba
    flor(m, 'flor0', nudos[3], FRENTE - 30)
    # vainas: un par desde el nudo 2 y una sola desde el nudo 3, colgando hacia la camara
    vaina(m, 'vaina0', nudos[2], FRENTE + 55, largo=4.6, ped=1.6)
    vaina(m, 'vaina1', nudos[2], FRENTE - 50, largo=4.2, ped=1.6, curva=-10)
    vaina(m, 'vaina2', nudos[1], FRENTE - 60, largo=4.0, ped=1.4)
    # vaina abierta en el lomo, de costado a la camara, con los chicharos en fila
    vaina_abierta(m, 'abierta', (-0.6, 2, 1.9), 90)
    return m


def podrida():
    """Desenlace de estres: la guia seca se zafo del tutor y cayo sobre el lomo; solo queda un zarcillo
    seco enroscado con un cabo colgando. Hojas marchitas, vainas podridas con moho, la vaina abierta
    vacia a medias y 2 moscas. 52 cubos."""
    m = Model('chicharo_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.0), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    inc = (5, FRENTE + 180)   # el tutor se vencio un poco hacia atras
    tutor(m, tilt=inc[0], yaw=inc[1], alto=12.0)
    # lo que quedo en el tutor: zarcillo seco enroscado y un cabo de tallo roto colgando
    ini = enrosque(m, 'zarcillo_seco', 10.0, FRENTE - 40, n=3, col='hoja_seca_dark', tilt=inc[0], yaw=inc[1])
    cabo = palo(m, 'cabo', ini, (ini[0] + 0.3, ini[1] - 3.2, ini[2] + 0.6), 0.4, 'hoja_seca')
    m.box('cabo_hoja', cabo, (1.4, 0.25, 2.0), 'hoja_marchita', tilt=60, yaw=FRENTE + 20)
    # guia caida: sale de la base, se dobla y queda tendida sobre el lomo hacia la derecha
    m.box('moho_base', BASE, (1.2, 0.8, 1.2), 'moho_dark', yaw=20)
    a = palo(m, 'tallo0', BASE, (0.9, 4.4, 0.6), 0.55, 'hoja_seca_dark')
    b = palo(m, 'tallo1', a, (3.4, 3.3, 1.4), 0.5, 'hoja_seca')
    c = palo(m, 'tallo2', b, (5.4, 2.25, 1.0), 0.5, 'hoja_seca_dark')
    d = palo(m, 'tallo3', c, (6.6, 1.25, 3.2), 0.45, 'podrido')
    # hojas secas que cuelgan de la guia, con los foliolos vencidos
    hoja(m, 'hoja0', a, FRENTE - 70, s=2.0, cols=SECA, tilt_pec=95, caida=55, zarcillo=False)
    hoja(m, 'hoja1', b, FRENTE + 20, s=2.0, cols=('hoja_seca_dark', 'hoja_marchita', 'hoja_seca_light'),
         tilt_pec=100, caida=40, zarcillo=False)
    hoja(m, 'hoja2', c, FRENTE - 140, s=1.8, cols=('podrido', 'hoja_seca_dark', 'hoja_seca'), tilt_pec=95,
         caida=30, zarcillo=False)
    rizo(m, 'zarcillo_guia', d, FRENTE + 60, s=0.8, col='hoja_seca_dark')
    # foliolos sueltos en el lomo y el suelo
    for k, (p, col, yaw) in enumerate([((-3.8, 2, 2.0), 'hoja_marchita', -35), ((-5.8, 1, -3.6), 'hoja_seca_dark', 60),
                                       ((5.9, 1, -3.4), 'hoja_seca_light', 15)]):
        m.box(f'foliolo_suelo{k}', p, (1.2, 0.3, 1.8), col, yaw=yaw)
    # vaina podrida que aun cuelga de la guia, ennegrecida y con moho
    fin = vaina(m, 'vaina0', a, FRENTE + 10, largo=2.0, cols=('podrido', 'podrido_dark'), ped=0.6, curva=20)
    m.box('vaina0_moho', (fin[0], max(fin[1], 2.0), fin[2]), (0.9, 0.5, 0.9), 'moho_light', yaw=15)
    # vainas caidas en el lomo, podridas y con moho
    for k, ((x, z), eje, col, moho) in enumerate([((-3.2, -1.6), 70, 'podrido', 'moho'),
                                                  ((-1.6, 2.4), 115, 'podrido_dark', 'moho_light')]):
        m.box(f'vaina{k + 1}', (x, 2, z), (1.0, 0.8, 4.0), col, yaw=eje)
        m.box(f'vaina{k + 1}_moho', mover((x, 2.8, z), eje, 0.6), (0.9, 0.35, 1.6), moho, yaw=eje + 12)
    # vaina abierta en el lomo: valvas podridas, chicharos arrugados, uno con moho y dos que faltan
    vaina_abierta(m, 'abierta', (1.0, 2, 2.0), 90, n=5,
                  cols=('hoja_seca_dark', 'podrido_dark', 'podrido'),
                  semillas=['podrido', None, 'moho_light', 'hoja_marchita', None])
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, ang) in enumerate([(1.0, 5.2, 3.4, 20), (-2.6, 4.8, 0.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=ang)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=ang)
    return m


ETAPAS = [('chicharo_siembra', siembra), ('chicharo_brote', brote), ('chicharo_crecimiento', crecimiento),
          ('chicharo_madurez', madurez), ('chicharo_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
