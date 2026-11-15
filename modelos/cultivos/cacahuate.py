"""Generador del cacahuate (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/cacahuate.py

Cacahuate o mani (Arachis hypogaea), tipo de mata (no rastrero). Convenciones (docs/07): 1 celda =
16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas
comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una
huella de 16x16. Las alturas son cualitativas, no medidas reales.

Rasgos que se respetan para no confundirlo con el frijol y el chile: planta baja y arbustiva, mas
ancha que alta, con ramas que salen casi acostadas desde la base; hoja compuesta de 4 foliolos
ovalados en dos pares (sin foliolo terminal, a diferencia de la trifoliada del frijol); flores
amarillas chicas pegadas a la base; clavos (ginoforos) palidos que bajan de la planta al suelo; y
vainas beige reticuladas con su cintura entre semilla y semilla, que aqui se asoman sobre el lomo
(nada baja de y=0). Semilla con tegumento rojizo. Colores de la paleta fija, sin colores nuevos.
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
FRENTE = 35           # direccion de la camara isometrica por defecto (la del juego, desde +x +z)
RAMAS = 0             # cruz de ramas casi sobre los ejes del lomo; los huecos diagonales quedan para las vainas

HOJA = ('cacahuate_hoja_dark', 'cacahuate_hoja', 'cacahuate_hoja_light')   # peciolo, par basal, par de punta
SECA = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca')
VAINA = ('cacahuate_vaina_dark', 'cacahuate_vaina', 'cacahuate_vaina_light')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def foliolo(m, nombre, p, yaw, largo, col, caida=8, ancho=None):
    """Foliolo ovalado que sale de p hacia yaw. caida > 0 baja la punta; < 0 la sube (plegado). 1 cubo."""
    w = ancho if ancho is not None else largo * 0.62
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (w, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)


def hoja4(m, nombre, base, yaw, peciolo, s, cols=HOJA, tilt_pec=60, caida=8, abre=62, ancho=None):
    """Hoja paripinnada de 4 foliolos: peciolo y dos pares opuestos, sin foliolo terminal. 5 cubos.

    El par basal sale a yaw +- abre y el de la punta a yaw +- (abre - 30), un poco mas adelante,
    asi desde arriba se lee como una cruz de cuatro ovalos. Devuelve la punta del peciolo."""
    p = m.stem(nombre + '_pec', base, peciolo, 0.35, cols[0], tilt=tilt_pec, yaw=yaw)
    q = mover(p, yaw, s * 0.55, -0.05)
    for k, s_ in enumerate((1, -1)):
        foliolo(m, f'{nombre}_b{k}', p, yaw + s_ * abre, s, cols[1], caida, ancho)
        foliolo(m, f'{nombre}_p{k}', q, yaw + s_ * (abre - 30), s, cols[2], caida, ancho)
    return p


def flor(m, nombre, c, yaw=0):
    """Flor amarilla chica (papilionacea) pegada a la base de la mata. 1 cubo."""
    m.box(nombre, c, (0.9, 0.8, 0.5), 'yellow', yaw=yaw)


def vaina(m, nombre, c, yaw, cols=VAINA, escala=1.0):
    """Vaina tumbada que asoma sobre el lomo: dos lobulos y una cintura angosta entre ellos. 3 cubos.

    c es el centro de la cintura, al ras del suelo; yaw es el eje largo. Lobulos en tono base y
    claro y la cintura en tono oscuro: la constriccion que la distingue de una vaina de frijol.
    Baja de alto (medio enterrada a la vista) pero apoyada en y del suelo, sin bajar de el."""
    s = escala
    m.box(nombre + '_cintura', c, (0.8 * s, 0.7 * s, 0.9 * s), cols[0], yaw=yaw)
    m.box(nombre + '_a', mover(c, yaw, 1.1 * s), (1.3 * s, 0.95 * s, 1.6 * s), cols[1], yaw=yaw + 6)
    m.box(nombre + '_b', mover(c, yaw, -1.05 * s), (1.2 * s, 0.9 * s, 1.5 * s), cols[2], yaw=yaw - 5)


def clavo(m, nombre, desde, hasta, grueso=0.35, col='cacahuate_clavo'):
    """Ginoforo: hilo palido recto de desde a hasta (baja de la planta al suelo). 1 cubo."""
    dx, dy, dz = (hasta[i] - desde[i] for i in range(3))
    largo = math.sqrt(dx * dx + dy * dy + dz * dz)
    tilt = math.degrees(math.acos(dy / largo))
    yaw = math.degrees(math.atan2(dx, dz))
    m.box(nombre, desde, (grueso, largo, grueso), col, tilt=tilt, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con tres semillas de tegumento rojizo y media vaina vacia a un lado. 12 cubos."""
    m = Model('cacahuate_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.6, 0.3, 3.4), 'suelo_humedo')
    semillas = [((-1.2, 0.6), 25, (0.95, 0.85, 1.7)), ((1.1, -0.6), -40, (0.95, 0.85, 1.6)),
                ((0.5, 1.3), 80, (0.9, 0.8, 1.5))]
    for k, ((x, z), yaw, size) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), size, 'cacahuate_semilla', yaw=yaw)
    # germen claro en la punta de una semilla (donde se parte en dos)
    m.box('semilla1_germen', mover((-1.2, 3.2, 0.6), 25, 0.5), (0.5, 0.12, 0.5), 'cacahuate_vaina_light', yaw=25)
    # media vaina vacia (de donde salieron las semillas): cascara alargada, dos huecos claros y la cintura
    eje = 70
    c = (3.4, 2, 1.4)
    m.box('cascara', c, (1.4, 0.6, 3.6), 'cacahuate_vaina', yaw=eje)
    m.box('cascara_cintura', c, (1.6, 0.7, 0.5), 'cacahuate_vaina_dark', yaw=eje)
    for k, d in enumerate((1.0, -1.0)):
        m.box(f'cascara_hueco{k}', mover(c, eje, d, 0.6), (0.9, 0.05, 1.1), 'cacahuate_vaina_light', yaw=eje)
    m.box('terron', (-3.8, 2, -1.4), (1.4, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula baja: tallito corto y 2 hojas de 4 foliolos aun plegados hacia arriba. 13 cubos."""
    m = Model('cacahuate_brote', PAL)
    monticulo(m)
    top = m.stem('tallito', BASE, 2.2, 0.6, 'cacahuate_hoja', tilt=0, yaw=0)
    # dos hojas opuestas; los foliolos, chicos y redondos, van medio cerrados (recien abiertos)
    for k, yaw in enumerate((FRENTE + 90, FRENTE + 270)):
        hoja4(m, f'hoja{k}', top, yaw, 0.9, 1.6, tilt_pec=55, caida=-22, abre=65, ancho=1.2)
    return m


def crecimiento():
    """Matita baja y abierta: 4 hojas de 4 foliolos y 3 flores amarillas en la base. 28 cubos."""
    m = Model('cacahuate_crecimiento', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 2.6, 0.8, 'cacahuate_hoja_dark', tilt=0, yaw=0)
    # ramas laterales que salen desde abajo, abiertas y casi horizontales (porte de mata ancha)
    for k, yaw in enumerate((FRENTE + 90, FRENTE + 270)):
        r = m.stem(f'rama{k}', (0, 2.5, 0), 2.8, 0.55, 'cacahuate_hoja_dark', tilt=72, yaw=yaw)
        hoja4(m, f'hoja{k}', r, yaw, 1.0, 2.0, tilt_pec=65, caida=6)
    # hojas del tallo central, hacia el frente y hacia atras
    hoja4(m, 'hoja2', top, FRENTE, 1.2, 2.0, tilt_pec=50, caida=0)
    hoja4(m, 'hoja3', top, FRENTE + 180, 1.2, 2.0, tilt_pec=50, caida=0)
    # flores amarillas chicas pegadas a la base, repartidas para que se vean desde cualquier lado
    for k, yaw in enumerate((FRENTE + 45, FRENTE + 160, FRENTE + 280)):
        flor(m, f'flor{k}', mover(BASE, yaw, 1.4, 0.4), yaw)
    return m


def madurez():
    """Mata densa, baja y redondeada, 2 flores, 4 clavos y 4 vainas en el lomo (una abierta). 57 cubos."""
    m = Model('cacahuate_madurez', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 3.0, 0.9, 'cacahuate_hoja_dark', tilt=0, yaw=0)
    # nucleo de follaje en sombra: tapa los huecos bajo las hojas sin verse como bloque
    m.box('follaje', (0, 2.2, 0), (4.0, 1.8, 3.6), 'cacahuate_hoja_dark', yaw=RAMAS + 45)
    # cuatro ramas casi acostadas en cruz, a lo largo de los ejes del lomo; las vainas van entre ellas
    for k in range(4):
        yaw = RAMAS + 90 * k
        r = m.stem(f'rama{k}', (0, 2.8, 0), 3.0, 0.6, 'cacahuate_hoja_dark', tilt=66, yaw=yaw + 8)
        hoja4(m, f'hoja{k}', r, yaw + 8, 0.8, 2.4, tilt_pec=72, caida=10, abre=48)
    # copa: dos hojas en lo alto del tallo, sobre los huecos de las ramas
    hoja4(m, 'hoja4', top, RAMAS + 45, 1.2, 2.3, tilt_pec=55, caida=4)
    hoja4(m, 'hoja5', top, RAMAS + 225, 1.2, 2.3, tilt_pec=55, caida=4)
    # flores amarillas en la base, en dos huecos opuestos
    flor(m, 'flor0', mover(BASE, RAMAS + 45, 2.4, 0.5), RAMAS + 45)
    flor(m, 'flor1', mover(BASE, RAMAS + 225, 2.4, 0.5), RAMAS + 225)
    # vainas tumbadas en las esquinas del lomo, cada una al final de su clavo (sobre y=2: no se entierran)
    for k, ((x, z), eje) in enumerate([((3.3, 2.2), 95), ((-3.3, -2.2), 85), ((3.3, -2.2), 80)]):
        c = (x, 2, z)
        vaina(m, f'vaina{k}', c, eje)
        clavo(m, f'clavo{k}', (x * 0.3, 3.4, z * 0.3), (x * 0.82, 2.8, z * 0.82))
    # vaina abierta: media cascara boca arriba con 2 semillas rojizas y la otra mitad volteada al lado
    eje = 92
    c = (-3.4, 2, 2.2)
    m.box('abierta_cascara', c, (1.4, 0.5, 3.4), 'cacahuate_vaina_dark', yaw=eje)
    m.box('abierta_semilla0', mover(c, eje, 0.8, 0.5), (1.0, 0.7, 1.15), 'cacahuate_semilla', yaw=eje)
    m.box('abierta_semilla1', mover(c, eje, -0.8, 0.5), (0.95, 0.65, 1.05), 'cacahuate_semilla', yaw=eje + 10)
    m.box('abierta_tapa', (-5.6, 1, 3.4), (1.2, 0.45, 3.0), 'cacahuate_vaina_light', yaw=eje + 30)
    clavo(m, 'clavo3', (-1.0, 3.4, 0.66), (-2.0, 2.6, 1.6))
    return m


def podrida():
    """Desenlace de estres: mata seca y aplastada, hojas caidas, vainas podridas con moho y moscas. 52 cubos."""
    m = Model('cacahuate_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    # tallo corto ladeado, moho en el cuello y un monton bajo de follaje seco
    lado = FRENTE + 150
    top = m.stem('tallo', BASE, 2.2, 0.8, 'hoja_seca_dark', tilt=28, yaw=lado)
    m.box('moho_base', BASE, (1.3, 0.9, 1.3), 'moho_dark', tilt=28, yaw=lado)
    m.box('follaje', (0, 2, 0), (3.6, 1.0, 3.0), 'hoja_seca_dark', yaw=RAMAS + 30)
    # ramas vencidas, tendidas sobre el lomo; una quedo pelona
    secas = [SECA, ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light'), ('podrido', 'hoja_seca_dark', 'hoja_marchita'),
             None]
    for k, cols in enumerate(secas):
        yaw = RAMAS + 15 + 90 * k + (k % 2) * 12
        r = m.stem(f'rama{k}', (0, 2.8, 0), 3.2, 0.55, ('hoja_seca_dark', 'hoja_seca')[k % 2], tilt=86, yaw=yaw)
        if cols:
            hoja4(m, f'hoja{k}', r, yaw, 0.6, 2.0, cols=cols, tilt_pec=95, caida=12, abre=55)
    # una hoja amarilla que aun cuelga del tallo, con los foliolos caidos
    hoja4(m, 'hoja4', top, lado + 40, 0.9, 1.8, cols=('hoja_seca_dark', 'hoja_marchita', 'hoja_marchita'),
          tilt_pec=90, caida=55)
    # foliolos sueltos en el lomo y en el suelo
    caidas = [((-3.6, 2, 2.4), 'hoja_marchita', -35), ((-5.8, 1, -3.8), 'hoja_seca_dark', 60),
              ((5.8, 1, 3.8), 'hoja_seca_light', 10), ((5.8, 1, -3.8), 'podrido', -50)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'foliolo_suelo{k}', c, (1.1, 0.3, 1.7), col, yaw=yaw)
    # vainas oscurecidas y podridas en el lomo, con su clavo seco y moho encima
    specs = [((3.3, 2.2), 95, ('podrido_dark', 'cacahuate_vaina_dark', 'podrido'), 'moho_light'),
             ((-3.3, -2.2), 85, ('podrido_dark', 'podrido', 'podrido_dark'), 'moho')]
    for k, ((x, z), eje, cols, moho) in enumerate(specs):
        c = (x, 2, z)
        vaina(m, f'vaina{k}', c, eje, cols)
        clavo(m, f'clavo{k}', (x * 0.3, 3.0, z * 0.3), (x * 0.82, 2.6, z * 0.82), col='hoja_seca_dark')
        m.box(f'vaina{k}_moho', mover(c, eje, 0.9, 0.9), (1.1, 0.35, 1.2), moho, yaw=eje + 15)
    # vaina abierta y vacia, con moho y una semilla podrida al lado
    eje = 80
    c = (3.4, 2, -2.0)
    m.box('abierta_cascara', c, (1.3, 0.5, 3.2), 'podrido', yaw=eje)
    m.box('abierta_moho', mover(c, eje, 0.7, 0.5), (1.0, 0.25, 1.3), 'moho_dark', yaw=eje + 10)
    m.box('semilla_suelo', (1.4, 2, -2.4), (0.9, 0.6, 1.1), 'podrido_dark', yaw=eje + 30)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(3.0, 4.6, 3.2, 20), (-2.4, 5.4, -2.0, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('cacahuate_siembra', siembra), ('cacahuate_brote', brote), ('cacahuate_crecimiento', crecimiento),
          ('cacahuate_madurez', madurez), ('cacahuate_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
