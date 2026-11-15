"""Generador de la cana de azucar (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/cana.py

Cana de azucar (Saccharum officinarum), id `cana`. Convenciones (docs/07): 1 celda = 16 unidades,
origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el
lomo de surco del maiz (14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas
son cualitativas, no medidas reales: solo se respeta que en madurez sea la planta mas alta de la
parcela (mas que el maiz y el sorgo).

Rasgos que se respetan para no confundirla con el maiz, el sorgo y los cereales:
- MACOLLO de 3-4 tallos GRUESOS que salen juntos de la cepa, no un tallo unico.
- Tallo SEGMENTADO en canutos (entrenudos) separados por nudos marcados con un anillo morado opaco
  (cana_nudo); los canutos de abajo son mas cortos. Con yemas en los nudos.
- Hojas largas y arqueadas solo ARRIBA, en penacho, con un cogollo parado en medio; el tallo de
  abajo queda DESNUDO (las hojas viejas se caen) y se ven los nudos. Sin mazorca ni panoja compacta.
- En madurez, una panoja plumosa clara (la "flecha") en el tallo mas alto.
- Siembra por trozo de tallo (canuto con 2 nudos y yemas) acostado en el lomo, no por semilla; el
  brote son hijitos como pasto que salen de las yemas del trozo.
- Podrida: tallos quebrados y acamados, oscuros, con moho, hojas secas y moscas.
Colores de la paleta fija (cana_tallo*, cana_nudo, maiz_hoja*, white/espiga, seco y podrido), sin
colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- Tallo en "joints" (nudo + entrenudo); el nudo lleva la yema y la banda de raices, anillo de
  crecimiento y banda de cera; la vaina envuelve el tallo; inflorescencia en panicula abierta;
  se propaga por trozos de tallo con dos o mas nudos con yema: UF/IFAS, "Sugarcane Plant
  Anatomy" (SC034), https://edis.ifas.ufl.edu/publication/SC034
- Morfologia del nudo (banda de raices, primordios, yema) y de la hoja:
  https://www.ikisan.com/tg-sugarcane-morphology.html
- Habito de la planta y propagacion por estacas: https://growables.org/informationVeg/Sugarcane.htm
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
from maiz import punta, hoja, monticulo, guardar  # noqa: E402  (utilidades de la milpa)
from sorgo import ejes, desplazar  # noqa: E402  (ejes locales de una caja girada)

BASE = (0, 2, 0)      # anclaje de la cepa: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)
TROZO = FRENTE + 15   # eje largo del trozo de siembra: de lado a la camara para que se lean sus nudos

TALLO = ('cana_tallo_dark', 'cana_tallo', 'cana_tallo_light')
NUDO = 'cana_nudo'
VERDE = ('maiz_hoja_dark', 'maiz_hoja', 'maiz_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')


# ---------------- utilidades ----------------
def nudo(m, nombre, base, u, tilt, yaw, grueso, col=NUDO):
    """Anillo del nudo a u unidades a lo largo de un tallo (base, tilt, yaw). 1 cubo."""
    m.box(nombre, punta(base, u - 0.3, tilt, yaw), (grueso + 0.5, 0.6, grueso + 0.5), col, tilt=tilt, yaw=yaw)


def tallo_cana(m, nombre, base, tilt, yaw, desnudo, vaina=0.0, grueso=2.0, nudos=(), col=TALLO[1],
               col_vaina=VERDE[0], col_nudo=NUDO):
    """Tallo segmentado: canuto desnudo (1 cubo) con un anillo por nudo y, arriba, la parte envuelta
    por las vainas de las hojas (1 cubo verde). Devuelve la punta. 1 + len(nudos) (+1) cubos."""
    m.box(nombre, base, (grueso, desnudo, grueso), col, tilt=tilt, yaw=yaw)
    for k, u in enumerate(nudos):
        nudo(m, f'{nombre}_nudo{k}', base, u, tilt, yaw, grueso, col_nudo)
    p = punta(base, desnudo, tilt, yaw)
    if vaina > 0:
        m.box(nombre + '_vaina', p, (grueso * 0.9, vaina, grueso * 0.9), col_vaina, tilt=tilt, yaw=yaw)
        p = punta(p, vaina, tilt, yaw)
    return p


def penacho(m, nombre, tope, specs, cogollo=4.0, col_cogollo=VERDE[2]):
    """Hojas largas arqueadas que salen juntas del tope del tallo y un cogollo parado en medio.
    specs: (yaw, largo, t1, t2, cols, baja). 2 cubos por hoja (+1 del cogollo)."""
    for k, (yaw, largo, t1, t2, cols, baja) in enumerate(specs):
        b = (tope[0], tope[1] - baja, tope[2])
        hoja(m, f'{nombre}_hoja{k}', b, yaw, largo, ancho=1.7, cols=cols, t1=t1, t2=t2, grosor=0.4)
    if cogollo:
        m.box(nombre + '_cogollo', (tope[0], tope[1] - 0.5, tope[2]), (0.8, cogollo, 0.6), col_cogollo,
              tilt=6, yaw=FRENTE + 90)


def trozo(m, nombre, c, yaw, largo=8.0, grueso=1.8, col=TALLO[1], col_nudo=NUDO, corte=TALLO[2],
          yemas=True, cortes=True):
    """Trozo de cana acostado (semilla vegetativa): canuto con un nudo cerca de cada punta, cortes
    claros en los extremos y una yema en cada nudo, alternando de lado. Devuelve los dos nudos.
    c es el centro de la cara de abajo; el eje largo va sobre el x local (yaw). 3 a 7 cubos."""
    ex, ez = ejes(0, yaw)
    m.box(nombre, c, (largo, grueso, grueso), col, yaw=yaw)
    for lado in ((-1, 1) if cortes else ()):
        p = desplazar(c, ex, ez, lado * (largo / 2 - 0.15), 0)
        m.box(f'{nombre}_corte{(lado + 1) // 2}', (p[0], p[1] + 0.2, p[2]), (0.3, grueso - 0.4, grueso - 0.4),
              corte, yaw=yaw)
    nudos = []
    for k, u in enumerate((-largo * 0.3, largo * 0.3)):
        p = desplazar(c, ex, ez, u, 0)
        m.box(f'{nombre}_nudo{k}', (p[0], p[1] - 0.25, p[2]), (0.6, grueso + 0.5, grueso + 0.5), col_nudo, yaw=yaw)
        nudos.append(p)
    if yemas:
        # yema: botoncito sobre el nudo, la primera arriba y la segunda de lado (alternas)
        p = nudos[0]
        m.box(f'{nombre}_yema0', (p[0], p[1] + grueso + 0.2, p[2]), (0.7, 0.5, 0.7), TALLO[0], yaw=yaw)
        p = desplazar(nudos[1], ex, ez, 0, grueso / 2 + 0.3)
        m.box(f'{nombre}_yema1', (p[0], p[1] + 0.5, p[2]), (0.7, 0.7, 0.5), TALLO[0], yaw=yaw)
    return nudos


# ---------------- etapas ----------------
def siembra():
    """Lomo con el surco abierto y un trozo de cana (2 nudos y 2 yemas) acostado, a medio tapar. 11 cubos."""
    m = Model('cana_siembra', PAL)
    monticulo(m)
    m.box('surco', BASE, (10.0, 0.3, 3.0), 'suelo_humedo', yaw=TROZO)
    trozo(m, 'trozo', (0, 2.0, 0), TROZO)
    m.box('tapado', (1.2, 2.3, -1.4), (1.8, 0.5, 1.4), 'soil_dark', yaw=TROZO - 25)
    return m


def brote():
    """El trozo acostado (ya mas oscuro) con 3 hijitos como pasto que salen de las yemas. 12 cubos."""
    m = Model('cana_brote', PAL)
    monticulo(m)
    m.box('surco', BASE, (10.0, 0.3, 3.0), 'suelo_humedo', yaw=TROZO)
    n0, n1 = trozo(m, 'trozo', (0, 2.0, 0), TROZO, col=TALLO[0], yemas=False, cortes=False)
    ex, ez = ejes(0, TROZO)
    # (nudo, desvio lateral, alto de la hoja parada, yaw, tilt, hoja arqueada: yaw, largo)
    brotes = [(n0, 0.0, 5.0, FRENTE + 200, 8, FRENTE + 60, 5.0),
              (n0, -0.9, 3.4, TROZO + 180, 20, FRENTE - 60, 3.8),
              (n1, 1.2, 4.6, TROZO + 60, 16, 0, 0)]
    for k, (n, lat, alto, yaw, tilt, yh, lh) in enumerate(brotes):
        b = desplazar((n[0], 3.4 if lat == 0 else 2.8, n[2]), ex, ez, 0, lat)
        m.box(f'brote{k}', b, (0.7, alto, 0.35), VERDE[1] if k != 1 else VERDE[2], tilt=tilt, yaw=yaw)
        if k == 0:      # el brote mayor ya arquea su primera hoja
            hoja(m, f'brote{k}_hoja', b, yh, lh, ancho=0.8, cols=VERDE[1:], t1=30, t2=105, grosor=0.3)
        elif k == 1:
            m.box(f'brote{k}_hoja', b, (0.6, lh, 0.3), VERDE[1], tilt=48, yaw=yh)
    return m


def crecimiento():
    """Macollo joven: 3 tallos cortos con el primer nudo a la vista, un hijo tardio y mucha hoja
    arqueada en fuente. 29 cubos."""
    m = Model('cana_crecimiento', PAL)
    monticulo(m)
    # (base, tilt, yaw, desnudo, vaina, nudos, hojas (yaw, largo, t1, t2, cols, baja), cogollo)
    tallos = [((-0.8, 2, -0.6), 3, 225, 3.6, 6.0, (2.0,),
               [(225, 10.0, 38, 128, VERDE[:2], 0.6), (305, 10.5, 34, 124, VERDE[1:], 1.4)], 3.5),
              ((1.0, 2, -0.5), 5, 120, 2.8, 5.0, (1.6,),
               [(125, 10.0, 40, 130, VERDE[1:], 0.6), (40, 9.5, 36, 126, VERDE[:2], 1.2)], 0),
              ((-0.3, 2, 1.0), 5, 340, 3.2, 4.2, (1.8,),
               [(345, 9.0, 42, 132, VERDE[1:], 0.5), (210, 9.5, 30, 120, VERDE[:2], 1.0),
                (85, 8.5, 46, 134, VERDE[1:], 1.6)], 0)]
    for k, (b, t, y, d, v, nn, hs, cog) in enumerate(tallos):
        tope = tallo_cana(m, f'tallo{k}', b, t, y, d, v, grueso=1.6, nudos=nn)
        penacho(m, f'p{k}', tope, hs, cogollo=cog)
    # hijo tardio: solo un abanico de hoja desde la cepa
    hb = (1.0, 2, 1.2)
    m.box('hijo3', hb, (0.9, 3.0, 0.9), VERDE[0], tilt=10, yaw=60)
    hoja(m, 'hijo3_hoja', punta(hb, 2.6, 10, 60), 60, 8.0, ancho=1.4, cols=VERDE[1:], t1=44,
         t2=130, grosor=0.4)
    return m


def madurez():
    """Macollo alto: 3 tallos gruesos desnudos abajo con nudos morados, penachos arriba, un hijo
    tardio y la flecha (panoja plumosa) en el tallo mayor. 57 cubos."""
    m = Model('cana_madurez', PAL)
    monticulo(m)
    # tallo mayor (atras): canutos cortos abajo y mas largos arriba
    ta = ((-1.0, 2, -0.8), 2, 225)
    tope_a = tallo_cana(m, 'tallo0', *ta, desnudo=22, vaina=8, grueso=2.2, nudos=(2.4, 5.8, 10.0, 14.6, 19.6))
    penacho(m, 'p0', tope_a, [(225, 11.0, 32, 128, VERDE[:2], 2.8),
                              (300, 10.5, 28, 124, VERDE[1:], 1.6),
                              (155, 10.5, 30, 126, VERDE[1:], 2.2)], cogollo=0)
    # flecha: pedunculo delgado y panoja plumosa clara, larga como lanza y apenas cabeceando
    p = m.stem('flecha_pedunculo', tope_a, 3.5, 0.6, TALLO[2], tilt=3, yaw=FRENTE + 110)
    plumas = [(0.0, 1.2, 1.4, 'espiga'), (1.1, 2.3, 3.6, 'white'), (4.4, 1.6, 2.6, 'white'),
              (6.7, 0.8, 1.8, 'vaina_light')]
    for k, (u, w, h, col) in enumerate(plumas):
        m.box(f'flecha{k}', punta(p, u, 7, FRENTE + 110), (w, h, w), col, tilt=7, yaw=FRENTE + 110 + 45 * (k % 2))
    # tallo de la derecha
    tb = ((1.2, 2, -0.6), 3, 120)
    tope_b = tallo_cana(m, 'tallo1', *tb, desnudo=19, vaina=8, grueso=2.0, nudos=(2.2, 5.4, 9.6, 14.4))
    penacho(m, 'p1', tope_b, [(130, 10.0, 32, 128, VERDE[1:], 1.4),
                              (50, 10.0, 36, 130, VERDE[:2], 2.6),
                              (200, 9.5, 26, 120, VERDE[1:], 2.0)])
    # tallo del frente: el que mejor se ve, con yemas en los nudos de abajo
    tc = ((-0.3, 2, 1.3), 3, 330)
    tope_c = tallo_cana(m, 'tallo2', *tc, desnudo=17, vaina=8, grueso=2.0, nudos=(2.0, 5.2, 9.0, 13.4),
                        col=TALLO[2])
    penacho(m, 'p2', tope_c, [(325, 9.5, 34, 128, VERDE[1:], 1.2),
                              (35, 9.6, 30, 126, VERDE[:2], 2.4),
                              (260, 9.5, 36, 130, VERDE[1:], 2.0)])
    for k, u in enumerate((5.2, 9.0)):
        lado = FRENTE + (25 if k == 0 else -55)
        b = punta(tc[0], u, tc[1], tc[2])
        r = 1.15
        m.box(f'tallo2_yema{k}', (b[0] + r * math.sin(math.radians(lado)), b[1] + 0.1,
                                  b[2] + r * math.cos(math.radians(lado))), (0.7, 0.8, 0.7), TALLO[0], yaw=lado)
    # hijo tardio corto, todavia con hoja hasta abajo
    td = ((1.3, 2, 1.4), 10, 60)
    tope_d = tallo_cana(m, 'tallo3', *td, desnudo=4, vaina=6, grueso=1.5, nudos=(2.0,))
    penacho(m, 'p3', tope_d, [(70, 7.0, 38, 128, VERDE[:2], 1.0),
                              (5, 7.5, 32, 124, VERDE[1:], 0.6)], cogollo=0)
    # hoja vieja seca que cuelga pegada al tallo de abajo y otra caida en el lomo
    m.box('hoja_vieja', punta(tb[0], 11.0, tb[1], tb[2]), (1.4, 6.0, 0.4), SECA[1], tilt=172, yaw=tb[2] + 20)
    m.box('hoja_suelo', (-3.6, 2, 1.8), (1.3, 0.3, 5.0), SECA[0], yaw=70)
    return m


def podrida():
    """Desenlace de estres: cepa podrida con moho, un tallo quebrado con la punta colgando, otro
    acamado, un canuto tirado en el lomo y un tocon; hojas secas y moscas. 45 cubos."""
    m = Model('cana_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.4, 2, 1.6), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-3.0, 2, -1.6), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('cepa', BASE, (3.6, 1.0, 3.0), 'podrido_dark', yaw=FRENTE)
    m.box('moho_cepa', (-0.4, 2.8, 0.2), (2.2, 0.6, 1.8), 'moho_dark', yaw=FRENTE + 20)
    # 1) quebrado: sigue parado, se dobla en un nudo y la punta cuelga hacia el frente con su penacho seco
    lado = 325
    t1 = ((-0.6, 2, -1.0), 5, lado)
    p = tallo_cana(m, 'tallo0', *t1, desnudo=11, grueso=2.0, nudos=(2.4, 6.4), col='hoja_seca_dark',
                   col_nudo='podrido_dark')
    m.box('quiebre0', p, (2.4, 1.0, 2.4), 'podrido', tilt=5, yaw=lado)
    m.box('moho0', punta(t1[0], 3.4, 5, lado), (2.5, 1.6, 2.5), 'moho_dark', tilt=5, yaw=lado)
    pc = punta(p, 0.8, 5, lado)
    q = m.stem('tallo0_colgante', pc, 6.0, 1.8, 'podrido', tilt=145, yaw=lado)
    nudo(m, 'tallo0_colgante_nudo', pc, 3.2, 145, lado, 1.8, 'podrido_dark')
    hoja(m, 'tallo0_hoja0', q, lado - 30, 4.0, ancho=1.3, cols=SECA[:2], t1=160, t2=178, grosor=0.4)
    hoja(m, 'tallo0_hoja1', q, lado + 40, 3.5, ancho=1.3, cols=('hoja_marchita', SECA[0]), t1=150, t2=175,
         grosor=0.4)
    # 2) acamado: vencido hacia +x -z, casi echado, con el penacho seco colgando al suelo
    t2 = ((0.9, 2, -0.3), 64, 128)
    p = tallo_cana(m, 'tallo1', *t2, desnudo=8, grueso=1.9, nudos=(2.6, 5.8), col=TALLO[0],
                   col_nudo='podrido_dark')
    m.box('moho1', punta(t2[0], 3.6, 64, 128), (2.4, 1.2, 2.4), 'moho', tilt=64, yaw=128)
    hoja(m, 'tallo1_hoja0', p, 90, 3.6, ancho=1.3, cols=SECA[1:], t1=150, t2=175, grosor=0.4)
    hoja(m, 'tallo1_hoja1', p, 170, 3.4, ancho=1.3, cols=SECA[:2], t1=145, t2=170, grosor=0.4)
    # 3) tirado: canuto suelto en el lomo, con dos nudos y una mancha de moho
    c3 = (-2.8, 2, 2.4)
    ex, ez = ejes(0, 30)
    m.box('tirado', c3, (7.0, 1.8, 1.8), 'podrido', yaw=30)
    for k, u in enumerate((-2.0, 1.8)):
        q = desplazar(c3, ex, ez, u, 0)
        m.box(f'tirado_nudo{k}', (q[0], q[1] - 0.2, q[2]), (0.6, 2.3, 2.3), NUDO if k else 'podrido_dark', yaw=30)
    q = desplazar(c3, ex, ez, 0.2, 0)
    m.box('tirado_moho', (q[0], q[1] + 1.7, q[2]), (2.2, 0.4, 1.4), 'moho_light', yaw=30)
    q = desplazar(c3, ex, ez, -3.4, 0)
    m.box('tirado_corte', (q[0], q[1] + 0.2, q[2]), (0.3, 1.4, 1.4), 'moho', yaw=30)
    # 4) tocon: tallo quebrado bajo, astillado arriba y con moho
    t4 = ((1.6, 2, 1.6), 4, 40)
    p = tallo_cana(m, 'tocon', *t4, desnudo=4.5, grueso=1.8, nudos=(2.2,), col='podrido_dark',
                   col_nudo=NUDO)
    m.box('tocon_astilla', p, (0.7, 1.6, 0.6), SECA[0], tilt=14, yaw=70)
    m.box('tocon_moho', punta(p, -0.3, 4, 40), (2.0, 0.5, 2.0), 'moho_light', yaw=40)
    # hojas secas en la cepa y en el suelo
    hoja(m, 'hoja_cepa', (0, 2.6, 0), 215, 6.0, ancho=1.3, cols=SECA[:2], t1=70, t2=110, grosor=0.4)
    m.box('hoja_suelo1', (-4.6, 2, -2.0), (1.2, 0.3, 4.0), SECA[1], yaw=-55)
    m.box('hoja_suelo2', (-5.4, 1, -3.8), (1.1, 0.3, 4.0), SECA[2], yaw=75)
    m.box('hoja_suelo3', (5.4, 1, 3.8), (1.0, 0.3, 3.4), 'hoja_marchita', yaw=-25)
    # penacho seco que se desprendio: queda tirado en el lomo junto al tocon
    m.box('penacho_suelo', (3.4, 2, 2.6), (1.4, 0.4, 4.6), SECA[0], yaw=-70)
    m.box('penacho_suelo_b', (3.0, 2.4, 2.4), (1.0, 0.3, 3.6), SECA[2], yaw=-35)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-2.4, 6.0, 3.4, 20), (2.4, 9.0, -0.6, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('cana_siembra', siembra), ('cana_brote', brote), ('cana_crecimiento', crecimiento),
          ('cana_madurez', madurez), ('cana_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
