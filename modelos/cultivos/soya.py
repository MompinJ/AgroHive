"""Generador de la soya (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/soya.py

Soya (Glycine max), tipo de mata erguida. Convenciones (docs/07): 1 celda = 16 unidades, origen en
el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de
surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las
alturas son cualitativas, no medidas reales (solo se respeta que sea mas alta que el frijol y el
cacahuate).

Rasgos que se respetan para no confundirla con el frijol, el cacahuate y el caupi: planta ERGUIDA y
arbustiva, con un tallo principal recto (sin zigzag ni guia) y pocas ramas cortas que suben en
angulo agudo; hoja trifoliada de foliolos OVALADOS alargados (el frijol los tiene en rombo y el
cacahuate tiene 4); plantula con 2 cotiledones gruesos y un par de hojas simples opuestas
(unifoliadas) antes de las trifoliadas; flores chiquitas lila en las axilas; vainas cortas en racimos
pegadas al tallo en cada nudo (no cuelgan largas como en el frijol). La soya se cosecha SECA: en
madurez la planta casi no tiene hojas, es tostada y va cargada de vainas secas a todo lo largo del
tallo, con pocas hojas amarillas. Colores de la paleta fija, sin colores nuevos.

Fuentes de forma (consultadas el 14/11/2026):
- Etapas VE, VC (unifoliadas que se abren sobre los cotiledones) y R8 (vainas de color maduro):
  https://extension.umn.edu/agriculture/crop-production/soybean/soybean-growth-stages y
  https://content.ces.ncsu.edu/the-soybean-plant
- Porte erguido y arbustivo, planta pubescente, flores chicas blancas a moradas en racimos axilares,
  vainas en racimos de pedicelo corto con 2-3 semillas y hojas que caen cuando maduran las vainas:
  https://laji.fi/en/taxon/MX.38970 , https://nparks.gov.sg/florafaunaweb/flora/5/7/5769 y
  https://www.rhs.org.uk/plants/158994/glycine-max/details
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

HOJA = ('soya_hoja_dark', 'soya_hoja', 'soya_hoja_light')   # peciolo, laterales, terminal
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')
VAINAS = ('soya_vaina_seca', 'hoja_seca_dark', 'hoja_seca')  # base, sombra, luz de la vaina madura


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def foliolo(m, nombre, p, yaw, largo, ancho, col, caida=8):
    """Foliolo ovalado alargado que sale de p hacia yaw. caida > 0 baja la punta. 1 cubo."""
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (ancho, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)


def trifoliada(m, nombre, base, yaw, peciolo, s, cols=HOJA, tilt_pec=55, caida=8, abre=62):
    """Hoja trifoliada de soya: peciolo largo, foliolo terminal adelante y 2 laterales. 4 cubos.

    Los foliolos son ovalos alargados (ancho ~0.58 del largo) y no rombos como en el frijol; el
    terminal arranca un poco mas adelante (su peciolulo). Devuelve la punta del peciolo."""
    p = m.stem(nombre + '_pec', base, peciolo, 0.35, cols[0], tilt=tilt_pec, yaw=yaw)
    foliolo(m, nombre + '_t', mover(p, yaw, 0.4), yaw, s, s * 0.58, cols[2], caida)
    for k, sg in enumerate((1, -1)):
        foliolo(m, f'{nombre}_l{k}', p, yaw + sg * abre, s * 0.82, s * 0.5, cols[1], caida + 6)
    return p


def tallo_recto(m, segs, cols, base=BASE, inclina=None):
    """Tallo principal recto por segmentos (lo que la distingue del zigzag del frijol).

    segs = [(largo, grueso)]; inclina = [(tilt, yaw)] opcional por segmento. Devuelve los nudos."""
    p = base
    nudos = []
    for i, (largo, grueso) in enumerate(segs):
        t, y = inclina[i] if inclina else (0, 0)
        p = m.stem(f'tallo{i}', p, largo, grueso, cols[i % len(cols)], tilt=t, yaw=y)
        nudos.append(p)
    return nudos


def vaina(m, nombre, nodo, yaw, tilt=150, largo=2.0, col='soya_vaina_seca', sale=0.4):
    """Vaina corta y gruesa pegada al nudo (pedicelo corto), apuntando hacia yaw. 1 cubo.

    tilt 150-165 la deja colgando hacia afuera; tilt 20-40 la deja parada (racimo terminal).
    Devuelve el punto de arranque."""
    c = mover(nodo, yaw, sale)
    m.box(nombre, c, (0.6, largo, 0.95), col, tilt=tilt, yaw=yaw)
    return c


def racimo(m, nombre, nodo, yaws, tilts, largo=2.0, cols=VAINAS, sale=0.4):
    """Racimo de vainas alrededor de un nudo: una vaina por yaw. len(yaws) cubos."""
    for k, yaw in enumerate(yaws):
        vaina(m, f'{nombre}_{k}', nodo, yaw, tilts[k % len(tilts)], largo, cols[k % len(cols)], sale)


def moho_en(m, nombre, nodo, yaw, tilt, largo, col, sale=0.4):
    """Mancha de moho que envuelve la mitad de una vaina (mismo eje, un poco mas gruesa). 1 cubo."""
    c = punta(mover(nodo, yaw, sale), largo * 0.35, tilt, yaw)
    m.box(nombre, c, (0.85, largo * 0.45, 1.15), col, tilt=tilt, yaw=yaw)


def flor(m, nombre, c, yaw=0):
    """Flor chiquita lila (papilionacea) en la axila de una hoja. 1 cubo."""
    m.box(nombre, c, (0.95, 0.8, 0.95), 'flor_lila', yaw=yaw + 45)


def semilla(m, nombre, c, col='soya_semilla', s=1.0, yaw=0):
    """Grano casi esferico: dos cajas cruzadas se leen redondas desde arriba. 2 cubos."""
    m.box(nombre, c, (1.15 * s, 0.85 * s, 0.8 * s), col, yaw=yaw)
    m.box(nombre + '_b', c, (0.8 * s, 0.85 * s, 1.15 * s), col, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo: hoyo con tres granos redondos crema (uno con su hilo cafe) y un terron. 11 cubos."""
    m = Model('soya_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.4, 0.3, 3.2), 'suelo_humedo')
    semilla(m, 'semilla1', (-1.1, 2.3, 0.4), yaw=20)
    semilla(m, 'semilla2', (1.1, 2.3, -0.5), s=0.95, yaw=-30)
    semilla(m, 'semilla3', (0.3, 2.3, 1.1), s=0.9, yaw=60)
    # hilo (cicatriz) cafe de un grano, visible desde la camara
    m.box('semilla1_hilo', mover((-1.1, 3.15, 0.4), 20, 0.25), (0.5, 0.1, 0.25), 'hoja_seca_dark', yaw=20)
    m.box('terron', (-3.8, 2, -1.2), (1.4, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula epigea: tallito, 2 cotiledones gruesos y el par de hojas unifoliadas opuestas. 12 cubos."""
    m = Model('soya_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.4), 'suelo_humedo')
    m.box('tallito', BASE, (0.7, 3.6, 0.7), 'soya_hoja')
    eje = FRENTE + 45          # cotiledones y unifoliadas cruzados, ambos en diagonal a la camara
    for k, col in enumerate(('soya_vaina', 'soya_hoja_light')):
        c = mover((0, 3.5, 0), eje + 180 * k, 0.95)
        m.box(f'cotiledon{k}', c, (1.4, 0.9, 1.9), col, yaw=eje)
    m.box('epicotilo', (0, 5.6, 0), (0.5, 0.9, 0.5), 'soya_hoja')
    top = (0, 6.3, 0)
    for k in range(2):
        yaw = FRENTE - 45 + 180 * k
        p = m.stem(f'peciolo{k}', top, 1.1, 0.3, 'soya_hoja_dark', tilt=62, yaw=yaw)
        foliolo(m, f'unifoliada{k}', p, yaw, 2.6, 1.6, ('soya_hoja', 'soya_hoja_light')[k], caida=-6)
    m.box('yema', (0, 6.3, 0), (0.5, 0.5, 0.5), 'soya_hoja_light', yaw=45)
    return m


def crecimiento():
    """Matita erguida: tallo recto, unifoliadas abajo, 4 trifoliadas alternas y 3 flores lila. 29 cubos."""
    m = Model('soya_crecimiento', PAL)
    monticulo(m)
    nudos = tallo_recto(m, [(2.6, 0.8), (2.6, 0.75), (2.4, 0.65)], ('soya_hoja_dark', 'soya_hoja'))
    m.box('cogollo', nudos[2], (0.6, 0.9, 0.6), 'soya_hoja_light', tilt=8, yaw=FRENTE)
    # par de hojas simples opuestas (unifoliadas) en el primer nudo, ya bajas
    for k in range(2):
        yaw = FRENTE + 90 + 180 * k
        p = m.stem(f'unifoliada{k}_pec', nudos[0], 1.3, 0.3, 'soya_hoja_dark', tilt=72, yaw=yaw)
        foliolo(m, f'unifoliada{k}', p, yaw, 2.2, 1.3, 'soya_hoja_dark', caida=14)
    # trifoliadas alternas de peciolo largo, subiendo; la de la punta, joven y mas parada
    specs = [(nudos[1], FRENTE + 180, 2.8, 2.7, 58, 8), (nudos[1], FRENTE - 10, 2.6, 2.6, 55, 8),
             (nudos[2], FRENTE + 100, 2.4, 2.5, 45, 4), (nudos[2], FRENTE - 80, 1.8, 2.1, 30, -4)]
    for k, (b, yaw, L, s, t, c) in enumerate(specs):
        trifoliada(m, f'trifoliada{k}', b, yaw, L, s, tilt_pec=t, caida=c)
    # flores lila chiquitas en las axilas, del lado de la camara
    for k, (n, yaw) in enumerate([(nudos[0], FRENTE + 15), (nudos[1], FRENTE + 75), (nudos[2], FRENTE - 40)]):
        flor(m, f'flor{k}', mover(n, yaw, 0.6, -0.2), yaw)
    return m


def madurez():
    """Lista para cosecha (seca): mata tostada en florero, casi sin hojas, cargada de vainas. 48 cubos."""
    m = Model('soya_madurez', PAL)
    monticulo(m)
    nudos = tallo_recto(m, [(3.4, 1.0), (3.4, 0.9), (3.2, 0.8), (2.8, 0.7)], ('wood_dark', 'hoja_seca_dark'))
    # ramas que salen de los nudos bajos y suben casi paralelas al tallo: mata erguida en florero
    ramas = [(punta(BASE, 1.6, 0, 0), FRENTE + 80, 7.2, 24), (punta(BASE, 1.6, 0, 0), FRENTE + 260, 6.8, 26),
             (nudos[0], FRENTE + 170, 5.8, 22), (nudos[0], FRENTE - 10, 5.0, 20)]
    for k, (b, yaw, L, t) in enumerate(ramas):
        m.stem(f'rama{k}', b, L, 0.6, 'hoja_seca_dark', tilt=t, yaw=yaw)
    # racimos de vainas pegados al tallo en cada nudo: dos cuelgan y una se para (se ve tupido)
    for k, n in enumerate(nudos):
        g = FRENTE + 25 + 50 * k
        racimo(m, f'racimo{k}', n, (g, g + 120, g + 240), (160, 35, 150), 1.8,
               VAINAS[k % 3:] + VAINAS[:k % 3], sale=0.3)
    # racimo terminal: vainas paradas en la punta del tallo
    racimo(m, 'racimo_punta', nudos[3], (FRENTE + 90, FRENTE + 270), (25, 30), 1.6,
           ('soya_vaina_seca', 'hoja_seca'), sale=0.1)
    # dos racimos por rama (a media rama y en la punta), del lado de afuera
    for k, (b, yaw, L, t) in enumerate(ramas):
        for j, f in enumerate((0.5, 1.0)):
            n = punta(b, L * f, t, yaw)
            racimo(m, f'racimo_rama{k}_{j}', n, (yaw - 50 + 30 * j, yaw + 50 + 30 * j), (160 - 120 * j, 155),
                   1.7, ('hoja_seca', 'soya_vaina_seca', 'hoja_seca_dark')[j:], sale=0.3)
    # las pocas hojas amarillas que quedan, colgando, y una vaina abierta con dos granos crema en el lomo
    p = m.stem('peciolo_amarillo', nudos[2], 1.4, 0.3, 'hoja_seca_dark', tilt=65, yaw=FRENTE - 60)
    foliolo(m, 'hoja_amarilla0', p, FRENTE - 60, 2.0, 1.1, 'hoja_marchita', caida=55)
    foliolo(m, 'hoja_amarilla1', p, FRENTE - 120, 1.7, 1.0, 'hoja_seca', caida=60)
    for k, (c, col, yaw) in enumerate([((-3.6, 2, 1.8), 'hoja_marchita', 30), ((4.8, 1, -3.8), 'hoja_seca', -20)]):
        m.box(f'hoja_suelo{k}', c, (1.1, 0.3, 1.9), col, yaw=yaw)
    eje = FRENTE + 70
    c = (3.0, 2, 2.6)
    m.box('abierta_cascara', c, (1.1, 0.4, 2.4), 'soya_vaina_seca', yaw=eje)
    m.box('abierta_grano0', mover(c, eje, 0.5, 0.4), (0.8, 0.6, 0.8), 'soya_semilla', yaw=eje)
    m.box('abierta_grano1', mover(c, eje, -0.5, 0.4), (0.75, 0.55, 0.75), 'soya_semilla', yaw=eje + 20)
    return m


def podrida():
    """Desenlace de estres: tallo vencido y oscuro, vainas negras con moho, hojas caidas, moscas. 46 cubos."""
    m = Model('soya_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    # tallo: base ladeada, quiebre y la punta vencida colgando hacia el lomo
    lado = 100
    p0 = m.stem('tallo0', BASE, 4.0, 0.95, 'podrido_dark', tilt=10, yaw=lado)
    m.box('moho_base', BASE, (1.5, 1.1, 1.5), 'moho_dark', tilt=10, yaw=lado)
    p1 = m.stem('tallo1', p0, 3.4, 0.8, 'hoja_seca_dark', tilt=55, yaw=lado)
    m.box('quiebre', p0, (1.2, 0.7, 1.2), 'podrido', tilt=55, yaw=lado)
    p2 = m.stem('tallo2', p1, 2.6, 0.7, 'podrido', tilt=128, yaw=lado + 10)
    # ramas cortas vencidas, casi tendidas
    n0 = punta(BASE, 2.6, 10, lado)
    r0 = m.stem('rama0', n0, 3.4, 0.55, 'podrido', tilt=78, yaw=lado + 150)
    r1 = m.stem('rama1', n0, 3.0, 0.5, 'hoja_seca_dark', tilt=88, yaw=lado + 230)
    # racimos de vainas podridas, algunos con moho
    PODRIDAS = ('podrido_dark', 'podrido', 'hoja_seca_dark')
    specs = [('r_p0', p0, (FRENTE, FRENTE + 120, FRENTE + 240), (150, 160, 145)),
             ('r_p1', p1, (lado + 90, lado - 90), (165, 160)),
             ('r_p2', p2, (lado + 60, lado - 60), (175, 170)),
             ('r_r0', r0, (lado + 110, lado + 190, lado + 250), (165, 150, 160)),
             ('r_r1', r1, (lado + 200, lado + 280), (160, 168))]
    for nombre, n, yaws, tilts in specs:
        racimo(m, nombre, n, yaws, tilts, 1.9, PODRIDAS, sale=0.3)
    for k, (n, yaw, tilt, col) in enumerate([(p0, FRENTE, 150, 'moho_light'), (r0, lado + 110, 165, 'moho'),
                                             (p1, lado + 90, 165, 'moho_light'), (r1, lado + 200, 160, 'moho')]):
        moho_en(m, f'moho{k}', n, yaw, tilt, 1.9, col, sale=0.3)
    # una trifoliada muerta que sigue colgada
    trifoliada(m, 'hoja_muerta', p0, lado - 100, 1.6, 2.0, cols=('podrido', 'hoja_seca_dark', 'hoja_seca'),
               tilt_pec=95, caida=55)
    # vainas caidas en el lomo, abiertas, con moho y granos podridos
    for k, (c, yaw, col) in enumerate([((-2.4, 2, 2.2), 70, 'podrido_dark'), ((1.6, 2, 2.6), -30, 'podrido'),
                                       ((-3.4, 2, -1.6), 15, 'hoja_seca_dark')]):
        m.box(f'vaina_suelo{k}', c, (0.9, 0.5, 2.0), col, yaw=yaw)
    m.box('vaina_suelo0_moho', (-2.3, 2.5, 2.2), (1.0, 0.35, 1.2), 'moho_light', yaw=80)
    m.box('vaina_suelo1_moho', (1.7, 2.5, 2.7), (0.9, 0.3, 1.0), 'moho_dark', yaw=-30)
    m.box('grano_suelo0', (0.0, 2, 3.3), (0.8, 0.6, 0.8), 'podrido', yaw=15)
    m.box('grano_suelo1', (-0.9, 2, 3.4), (0.75, 0.55, 0.75), 'moho', yaw=40)
    # foliolos sueltos en el lomo y en el suelo
    for k, (c, col, yaw) in enumerate([((-5.6, 1, -3.8), 'hoja_seca_dark', 60), ((5.4, 1, 3.8), 'hoja_seca', 10),
                                       ((-5.4, 1, 3.6), 'podrido', -50), ((3.2, 2, -2.2), 'hoja_marchita', 35)]):
        m.box(f'foliolo_suelo{k}', c, (1.1, 0.3, 1.9), col, yaw=yaw)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-2.0, 4.6, 3.0, 20), (2.6, 7.6, 2.2, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('soya_siembra', siembra), ('soya_brote', brote), ('soya_crecimiento', crecimiento),
          ('soya_madurez', madurez), ('soya_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
