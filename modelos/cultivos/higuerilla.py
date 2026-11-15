"""Generador de la higuerilla (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/higuerilla.py

Higuerilla o ricino (Ricinus communis), arbusto de la familia Euphorbiaceae. Convenciones (docs/07):
1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las
etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una
huella de 16x16. Las alturas y tamanos son cualitativos, no medidos: solo se respeta que en madurez sea
un arbusto alto (como la yuca o un poco mas) y que la hoja sea muy grande respecto al tallo.

Rasgos que se respetan para no confundirla con la yuca y el algodon:
- ARBUSTO alto de tallo grueso, liso y ROJO VINO (la yuca lo tiene gris pardo con nudos).
- Hoja MUY GRANDE, PALMEADA y PELTADA: el peciolo largo y rojizo se pega al centro de la lamina, y los
  lobulos (5 a 9, aqui 5 o 7) salen todo alrededor como una ESTRELLA, anchos y de punta aguda (la yuca
  tiene lobulos angostos como dedos en abanico). Cada lobulo es un rombo plano (un cubo girado 45
  grados) con la punta hacia afuera, sobre un centro mas oscuro con el punto rojo del peciolo.
- RACIMO erguido en la punta del tallo y de las ramas: flores masculinas crema abajo y CAPSULAS
  ESPINOSAS ROJAS arriba (un cubo y otro girado en diagonal que asoma sus esquinas como picos). Al
  madurar algunas capsulas se secan cafes y se abren en 3 valvas dejando ver la semilla.
- Semilla grande, ovalada y MOTEADA, con carúncula clara en una punta; germinacion epigea con 2
  cotiledones anchos que a veces salen con la cascara de la semilla pegada.
- Podrida: tallo quebrado, hojas secas colgando, racimos cafes con moho y moscas.
Colores solo de la paleta fija (higuerilla_*, verdes de sombra, hoja seca y marchita, podrido, moho).

Fuentes de forma (consultadas el 15/11/2026):
- Hoja alterna, peltada, palmeada en 7 a 10 (5 a 12) lobulos dentados; racimo terminal con flores
  femeninas arriba y masculinas abajo, sin petalos; capsula espinosa de 3 partes que se separan al
  madurar, 3 semillas por capsula: https://edis.ifas.ufl.edu/publication/FR306 ,
  https://plants.ces.ncsu.edu/plants/ricinus-communis/ y https://www.nparks.gov.sg/florafaunaweb/flora/2/3/2389
- Forma de arbusto o arbolito y hoja en estrella: https://iewf.org/weedid/Ricinus_communis.htm
- Cotiledones anchos y cascara pegada al brotar: rasgo general de la germinacion epigea del ricino,
  no verificado con una fuente puntual (se marca como estimado).
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

TALLO = 'higuerilla_tallo'
HOJA = ('higuerilla_hoja', 'yuca_hoja_dark')                 # lobulos, centro en sombra
HOJA_JOVEN = ('leaf_dark', 'yuca_hoja_dark')
SECA = ('hoja_seca', 'hoja_seca_dark')
MARCHITA = ('hoja_marchita', 'hoja_seca_dark')
CAPSULA = ('higuerilla_capsula', 'red')                     # cuerpo, picos
CAPSULA_PODRIDA = ('podrido', 'moho_dark')
FLOR = ('hoja_seca_light', 'yellow')                        # flores masculinas: crema y polen


# ---------------- rotaciones libres ----------------
# voxelkit solo gira con [tilt, yaw, 0]; para inclinar una hoja entera (y sus lobulos con ella) se
# compone la matriz y se pasa a Euler ZYX, el orden que usan Blockbench, el visor y web/.
def _rx(a):
    a = math.radians(a)
    c, s = math.cos(a), math.sin(a)
    return [[1, 0, 0], [0, c, -s], [0, s, c]]


def _ry(a):
    a = math.radians(a)
    c, s = math.cos(a), math.sin(a)
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]]


def _mul(*ms):
    r = ms[0]
    for b in ms[1:]:
        r = [[sum(r[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    return r


def _app(r, v):
    return [sum(r[i][k] * v[k] for k in range(3)) for i in range(3)]


def _euler_zyx(r):
    """Angulos [x, y, z] en grados tales que R = Rz @ Ry @ Rx."""
    ry = math.asin(max(-1.0, min(1.0, -r[2][0])))
    rx = math.atan2(r[2][1], r[2][2])
    rz = math.atan2(r[1][0], r[0][0])
    return [round(math.degrees(v), 4) for v in (rx, ry, rz)]


def pieza(m, nombre, c, size, col, rot=None):
    """Caja centrada en c (centro del volumen, no de la base) girada con la matriz rot alrededor de su
    centro. 1 cubo."""
    e = m.box(nombre, (c[0], c[1] - size[1] / 2, c[2]), size, col)
    e['origin'] = [c[0], c[1], c[2]]
    if rot is not None:
        ang = _euler_zyx(rot)
        if any(abs(v) > 1e-6 for v in ang):
            e['rotation'] = ang
    return e


def _mas(p, v):
    return (p[0] + v[0], p[1] + v[1], p[2] + v[2])


# ---------------- piezas ----------------
def hoja_estrella(m, nombre, c, radio, n=7, yaw=0.0, tilt=0.0, caida=10.0, cols=HOJA, centro=True,
                  punto=True, giro=0.0):
    """Hoja palmeada peltada en estrella con centro en c. La lamina entera se inclina tilt grados
    hacia yaw (positivo: el lado de yaw baja) y cada lobulo cae caida grados hacia su punta (negativo:
    se enrosca hacia arriba, como hoja seca). Los lobulos son rombos planos con la punta hacia afuera.
    n cubos + 1 si centro (lamina oscura del medio) + 1 si punto (union roja del peciolo)."""
    hoja = _mul(_ry(yaw), _rx(tilt))
    lado = 0.55 if n >= 7 else 0.62
    s = lado * radio
    rc = radio - s / math.sqrt(2)
    if centro:
        pieza(m, nombre + '_centro', c, (0.72 * radio, 0.3, 0.72 * radio), cols[1],
              _mul(hoja, _ry(giro + 180.0 / n)))
    for k in range(n):
        a = giro + 360.0 * k / n
        r_lob = _mul(hoja, _ry(a), _rx(caida))
        p = _mas(c, _app(r_lob, [0, 0.08 + 0.025 * k, rc]))
        pieza(m, f'{nombre}_lob{k}', p, (s, 0.3, s), cols[0], _mul(r_lob, _ry(-45)))
    if punto:
        pieza(m, nombre + '_punto', _mas(c, _app(hoja, [0, 0.22, 0])), (0.55, 0.3, 0.55), TALLO, hoja)


def hoja(m, nombre, base, yaw, largo_pec, tilt_pec, radio, n=7, tilt=14.0, caida=10.0, cols=HOJA,
         centro=True, punto=True, col_pec=TALLO, giro=0.0):
    """Peciolo largo y rojizo desde base y la hoja en estrella pegada por el centro a su punta (hoja
    peltada). La lamina cae tilt grados hacia afuera. 1 cubo + los de la hoja."""
    q = m.stem(nombre + '_pec', base, largo_pec, 0.35, col_pec, tilt=tilt_pec, yaw=yaw)
    c = _mas(q, _app(_mul(_ry(yaw), _rx(tilt)), [0, 0.1, 0]))
    hoja_estrella(m, nombre, c, radio, n=n, yaw=yaw, tilt=tilt, caida=caida, cols=cols, centro=centro,
                  punto=punto, giro=giro)
    return c


def capsula(m, nombre, c, s, giro=0.0, cols=CAPSULA):
    """Capsula espinosa: cubo redondeado y otro girado en diagonal cuyas esquinas asoman como picos.
    2 cubos."""
    pieza(m, nombre, c, (0.86 * s, 0.8 * s, 0.86 * s), cols[0], _ry(giro))
    pieza(m, nombre + '_pico', c, (0.84 * s, 0.84 * s, 0.84 * s), cols[1], _mul(_ry(giro + 45), _rx(45)))


def capsula_abierta(m, nombre, c, s, giro=0.0, col='hoja_seca_dark', semilla='higuerilla_semilla'):
    """Capsula seca que se abre: 2 valvas cafes separadas como gajos y la semilla moteada entre ellas.
    3 cubos."""
    for k, a in enumerate((giro, giro + 180)):
        r = _mul(_ry(a), _rx(-32))
        pieza(m, f'{nombre}_valva{k}', _mas(c, _app(r, [0, 0.1, 0.36 * s])), (0.8 * s, 0.85 * s, 0.32 * s), col, r)
    pieza(m, nombre + '_semilla', _mas(c, (0, -0.1 * s, 0)), (0.5 * s, 0.45 * s, 0.38 * s), semilla, _ry(giro + 90))


def racimo(m, nombre, base, largo, tilt, yaw, capsulas, abiertas=(), flores=1, s=1.5, cols=CAPSULA,
           col_eje=TALLO):
    """Racimo erguido: eje desde base, flores masculinas crema abajo y capsulas arriba. capsulas y
    abiertas son listas de (d, angulo, radio): a d unidades sobre el eje, corridas radio unidades
    hacia el angulo. Devuelve la punta del eje."""
    tip = m.stem(nombre + '_eje', base, largo, 0.5, col_eje, tilt=tilt, yaw=yaw)
    for k in range(flores):
        p = punta(base, 0.9 + 0.9 * k, tilt, yaw)
        m.box(f'{nombre}_flor{k}', (p[0], p[1] - 0.1, p[2]), (1.5 - 0.3 * k, 0.8, 1.5 - 0.3 * k), FLOR[k % 2],
              yaw=yaw + 30 * k)
    for k, (d, a, r) in enumerate(capsulas):
        p = punta(base, d, tilt, yaw)
        ar = math.radians(a)
        capsula(m, f'{nombre}_cap{k}', (p[0] + r * math.sin(ar), p[1], p[2] + r * math.cos(ar)), s, giro=a, cols=cols)
    for k, (d, a, r) in enumerate(abiertas):
        p = punta(base, d, tilt, yaw)
        ar = math.radians(a)
        capsula_abierta(m, f'{nombre}_abierta{k}', (p[0] + r * math.sin(ar), p[1], p[2] + r * math.cos(ar)),
                        s * 1.1, giro=a)
    return tip


def semilla(m, nombre, c, yaw, tilt=0.0):
    """Semilla grande moteada tumbada: cuerpo ovalado, mancha oscura encima y carúncula clara en una
    punta. c es el centro de la base. 3 cubos."""
    m.box(nombre, c, (1.7, 1.0, 2.6), 'higuerilla_semilla', tilt=tilt, yaw=yaw)
    m.box(nombre + '_mancha', (c[0] + 0.3, c[1] + 1.0, c[2] - 0.35), (0.85, 0.1, 1.05), 'podrido_dark', tilt=tilt,
          yaw=yaw + 35, pivot=c)
    m.box(nombre + '_caruncula', (c[0], c[1] + 0.2, c[2] + 1.45), (0.7, 0.55, 0.35), 'hoja_seca_light',
          tilt=tilt, yaw=yaw, pivot=c)


def moscas(m, puntos):
    """Moscas (lo unico que flota a proposito). 2 cubos cada una."""
    for k, (x, y, z, a) in enumerate(puntos):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado con 3 semillas grandes moteadas a la vista. 12 cubos (10 mas el
    lomo)."""
    m = Model('higuerilla_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (8.0, 0.3, 5.0), 'suelo_humedo', yaw=6)
    semilla(m, 'semilla0', (-2.4, 2.3, -0.4), 70)
    semilla(m, 'semilla1', (2.0, 2.3, -1.0), 125)
    semilla(m, 'semilla2', (0.2, 2.3, 1.2), 20, tilt=6)
    return m


def brote():
    """Plantula: tallito rojo, 2 cotiledones anchos (uno todavia con la cascara de la semilla) y la
    primera hoja verdadera ya en estrella. 12 cubos (10 mas el lomo)."""
    m = Model('higuerilla_brote', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 3.6, 0.7, TALLO, tilt=3, yaw=40)
    for k, a in enumerate((125, 305)):
        r = _mul(_ry(a), _rx(-12))
        pieza(m, f'cotiledon{k}', _mas(top, _app(r, [0, -0.2, 1.4])), (1.9, 0.25, 2.6), 'leaf_dark', r)
    r = _mul(_ry(305), _rx(-12))
    pieza(m, 'cascara', _mas(top, _app(r, [0, 0.05, 2.5])), (0.9, 0.5, 0.7), 'higuerilla_semilla', r)
    hoja(m, 'hoja', top, 35, 2.0, 18, 2.4, n=5, tilt=-10, caida=6, cols=HOJA, centro=False, punto=False)
    return m


def crecimiento():
    """Planta joven: tallo rojo grueso y 3 hojas en estrella grandes en peciolos largos (2 de 7 lobulos
    abajo y 1 de 5 arriba), con el cogollo rojizo en la punta. 30 cubos."""
    m = Model('higuerilla_crecimiento', PAL)
    monticulo(m)
    n1 = m.stem('tallo0', BASE, 5.0, 1.2, TALLO, tilt=3, yaw=30)
    n2 = m.stem('tallo1', n1, 4.0, 1.0, TALLO, tilt=4, yaw=210)
    hoja(m, 'hoja0', n1, 130, 3.6, 62, 4.0, n=7, tilt=14)
    hoja(m, 'hoja1', n1, 310, 3.6, 64, 4.0, n=7, tilt=16, punto=False, giro=10)
    hoja(m, 'hoja2', n2, 40, 2.4, 42, 3.0, n=5, tilt=6, centro=False, punto=False, cols=HOJA_JOVEN)
    m.box('cogollo', n2, (0.8, 1.4, 0.8), TALLO, tilt=-8, yaw=200)
    return m


def madurez():
    """Arbusto alto de tallo rojo vino con una rama, 3 hojas grandes en estrella y 1 joven, y 2 racimos
    erguidos de capsulas rojas espinosas (algunas ya cafes y abiertas) sobre flores crema. 60 cubos."""
    m = Model('higuerilla_madurez', PAL)
    monticulo(m)
    n1 = m.stem('tallo0', BASE, 6.5, 1.6, TALLO, tilt=3, yaw=30)
    n2 = m.stem('tallo1', n1, 5.5, 1.4, TALLO, tilt=4, yaw=210)
    n3 = m.stem('tallo2', n2, 4.0, 1.2, TALLO, tilt=3, yaw=60)
    r1 = m.stem('rama', n2, 5.0, 0.9, TALLO, tilt=34, yaw=255)
    # hojas grandes abajo a los lados, una atras arriba y una joven al frente
    hoja(m, 'hoja0', n1, 130, 4.0, 64, 4.6, n=7, tilt=16)
    hoja(m, 'hoja1', n1, 310, 3.8, 62, 4.4, n=7, tilt=16, punto=False, giro=12)
    hoja(m, 'hoja2', n2, 210, 3.4, 56, 4.0, n=7, tilt=14, punto=False, giro=6)
    hoja(m, 'hoja3', n2, 40, 2.8, 50, 3.0, n=5, tilt=8, centro=False, punto=False, cols=HOJA_JOVEN)
    # racimo principal en la punta y otro en la rama
    racimo(m, 'racimo0', n3, 7.0, 3, 40,
           capsulas=[(3.0, 30, 1.0), (3.6, 210, 1.0), (5.1, 120, 0.9), (6.6, 0, 0.0)],
           abiertas=[(4.6, 300, 1.05)], flores=1, s=1.6)
    racimo(m, 'racimo1', r1, 5.0, 8, 255,
           capsulas=[(2.6, 80, 0.9), (3.2, 260, 0.9), (4.4, 0, 0.0)], flores=0, s=1.45)
    return m


def podrida():
    """Desenlace de estres: el tallo se quebro y la punta cuelga con su racimo podrido casi hasta el
    lomo; hojas secas colgando, una caida en el lomo, el racimo de la rama cafe con moho y 2 moscas.
    52 cubos."""
    m = Model('higuerilla_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta0', (2.4, 2, -1.4), (3.6, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta1', (-2.2, 2, 1.8), (0.5, 0.2, 2.6), 'suelo_grieta', yaw=-20)
    n1 = m.stem('tallo0', BASE, 6.5, 1.6, TALLO, tilt=5, yaw=30)
    n2 = m.stem('tallo1', n1, 4.5, 1.4, 'podrido', tilt=9, yaw=210)
    m.box('moho_base', (0.05, 2.0, 0.1), (2.0, 0.9, 2.0), 'moho_dark', yaw=30)
    m.box('astilla0', n2, (0.6, 1.0, 0.5), 'hoja_seca_light', tilt=16, yaw=40)
    # la punta quebrada cuelga hacia el frente derecho con el racimo podrido
    q1 = m.stem('quebrado0', n2, 4.0, 1.2, 'hoja_seca_dark', tilt=112, yaw=75)
    q2 = m.stem('quebrado1', q1, 2.6, 1.0, 'hoja_seca_dark', tilt=165, yaw=75)
    racimo(m, 'racimo0', q2, 3.6, 172, 75,
           capsulas=[(1.4, 0, 0.75), (1.8, 180, 0.75), (3.2, 90, 0.0)], flores=0, s=1.4, cols=CAPSULA_PODRIDA,
           col_eje='podrido')
    m.box('racimo0_moho', _mas(punta(q2, 3.2, 172, 75), (0, -0.85, 0)), (1.5, 0.4, 1.5), 'moho_light', yaw=20)
    # rama con su racimo seco, todavia en pie pero cafe y con moho
    r1 = m.stem('rama', n1, 4.2, 0.9, 'podrido', tilt=38, yaw=290)
    racimo(m, 'racimo1', r1, 4.2, 14, 290,
           capsulas=[(2.0, 20, 0.85), (3.6, 0, 0.0)], abiertas=[(2.4, 200, 0.95)], flores=0, s=1.3,
           cols=CAPSULA_PODRIDA, col_eje='podrido')
    m.box('racimo1_moho', punta(r1, 4.1, 14, 290), (1.2, 0.3, 1.2), 'moho_light', yaw=45)
    # hojas secas colgando del tallo, enroscadas
    hoja(m, 'hoja0', n1, 110, 3.0, 118, 3.2, n=7, tilt=72, caida=-20, cols=SECA, punto=False,
         col_pec='hoja_seca_dark')
    hoja(m, 'hoja1', n1, 350, 2.6, 112, 3.0, n=5, tilt=66, caida=-18, cols=MARCHITA, centro=False,
         punto=False, col_pec='hoja_seca_dark')
    # hoja caida y enroscada sobre el lomo
    hoja_estrella(m, 'caida', (-3.4, 2.3, -1.6), 2.8, n=5, yaw=200, tilt=0, caida=-14, cols=SECA, centro=False,
                  punto=False, giro=20)
    moscas(m, [(3.2, 7.4, 3.4, 25), (-2.6, 9.0, 2.0, -40)])
    return m


ETAPAS = [('higuerilla_siembra', siembra), ('higuerilla_brote', brote),
          ('higuerilla_crecimiento', crecimiento), ('higuerilla_madurez', madurez),
          ('higuerilla_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
