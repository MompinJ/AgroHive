"""Generador del trigo harinero (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/trigo.py

Trigo harinero (Triticum aestivum). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro
de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz
(14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas son cualitativas, no
medidas reales (solo se respeta que sea bastante mas bajo que el maiz y el sorgo).

Rasgos que se respetan para no confundirlo con el maiz, el sorgo, la cebada y la avena:
- MACOLLO: 4-5 tallos finos (hijos) que salen juntos de la base y se abren un poco, con hojas
  angostas y arqueadas; no un tallo unico grueso como el maiz o el sorgo.
- Espiga COMPACTA, gruesa y ERGUIDA, en la misma linea del tallo (no cabecea como la cebada ni es
  panicula abierta como la avena), con espiguillas sentadas que alternan a los dos lados del raquis
  (dos filas) y a lo mas una puntita corta (variedad de aristas cortas o mocha).
- Color DORADO intenso al madurar (trigo_espiga en 3 tonos para que se lea el grano), con la paja y
  las hojas ya secas, mas palidas que la espiga.
- Siembra con granos ovalados dorados; brote como pasto fino; podrida acamada (tallos tumbados),
  espigas negras con moho y moscas.
Colores de la paleta fija, sin colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- Espiga distica, espiguillas solitarias y sentadas, 3-6 flores, lema sin arista o con arista segun
  la variedad: https://www.delta-intkey.com/grass/www/triticum.htm y
  https://floraseries.landcareresearch.co.nz/taxa/4d30d988-9ddf-4068-ac3b-0f9a676900d6
- Espiguillas alternas a los dos lados del raquis y pegadas a el; aristas cortas en la forma barbada:
  https://w3.biosci.utexas.edu/prc/K12/pdf/Triticum%20aestivum
- Etapas (emergencia, amacollamiento, hoja bandera, espigado, madurez) y numero de hijos por planta:
  https://extension.umn.edu/growing-small-grains/spring-wheat-growth-and-development-guide y
  https://ohioline.osu.edu/factsheet/agf-126
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

BASE = (0, 2, 0)      # anclaje del macollo: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)

VERDE = ('cereal_hoja_dark', 'cereal_hoja', 'cereal_hoja_light')
DORADO = ('trigo_espiga_dark', 'trigo_espiga', 'trigo_espiga_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')
PAJA = ('espiga_dark', 'espiga')                    # paja madura: mas palida que la espiga
PODRIDA = ('podrido_dark', 'podrido', 'moho')


# ---------------- utilidades ----------------
def hijo(m, nombre, yaw, tilt, largo, col, grueso=0.5, base=BASE):
    """Tallo fino de un hijo del macollo desde la base. Devuelve la punta. 1 cubo."""
    return m.stem(nombre, base, largo, grueso, col, tilt=tilt, yaw=yaw)


def espiga_trigo(m, nombre, base, tilt, yaw, largo=4.6, n=2, cols=DORADO, puntita=True, ancho=1.0):
    """Espiga compacta y erguida en la linea del tallo: raquis grueso y n espiguillas por lado que
    alternan en dos filas, mas una puntita corta (arista corta). 1 + 2n (+1) cubos.

    Todas las cajas comparten tilt y yaw: la espiga entera sigue al tallo como una pieza."""
    ex, ez = ejes(tilt, yaw)
    m.box(nombre + '_raquis', base, (ancho, largo, ancho * 0.9), cols[0], tilt=tilt, yaw=yaw)
    paso = 0.85 * largo / (2 * n)
    for k in range(2 * n):
        lado = -1 if k % 2 == 0 else 1
        u = 0.08 * largo + k * paso
        p = desplazar(punta(base, u, tilt, yaw), ex, ez, lado * ancho * 0.72, 0.0)
        c = cols[1] if k < n else cols[2]          # luz arriba: espiguillas altas mas claras
        m.box(f'{nombre}_esp{k}', p, (0.75, paso * 1.6, ancho * 1.3), c, tilt=tilt, yaw=yaw)
    if puntita:
        m.box(nombre + '_punta', punta(base, largo, tilt, yaw), (0.4, 0.9, 0.4), cols[2], tilt=tilt, yaw=yaw)
    return punta(base, largo, tilt, yaw)


def hoja_trigo(m, nombre, base, yaw, largo, cols, t1=50, t2=112, ancho=0.8):
    """Hoja angosta de cereal: sube y se arquea hacia afuera. 2 cubos."""
    return hoja(m, nombre, base, yaw, largo, ancho=ancho, cols=cols, t1=t1, t2=t2, grosor=0.3)


def sobre(yaw, tilt, h):
    """Punto a h unidades a lo largo de un hijo (yaw, tilt) que sale de BASE."""
    return punta(BASE, h, tilt, yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con un surquito y 5 granos ovalados dorados apenas cubiertos. 10 cubos."""
    m = Model('trigo_siembra', PAL)
    monticulo(m)
    m.box('surco', BASE, (7.0, 0.3, 2.2), 'suelo_humedo', yaw=FRENTE + 90)
    # granos ovalados (mas largos que anchos) con el surco ventral oscuro arriba en dos de ellos
    du = (math.sin(math.radians(FRENTE + 90)), math.cos(math.radians(FRENTE + 90)))
    granos = [(-2.6, 0.3, 'trigo_espiga', 20), (-1.2, -0.4, 'trigo_espiga_dark', -35),
              (0.2, 0.4, 'trigo_espiga_light', 60), (1.5, -0.3, 'trigo_espiga', -15),
              (2.8, 0.2, 'trigo_espiga_dark', 40)]
    for k, (u, lat, col, a) in enumerate(granos):
        x = u * du[0] + lat * du[1]
        z = u * du[1] - lat * du[0]
        m.box(f'grano{k}', (x, 2.15, z), (0.6, 0.55, 1.1), col, yaw=a)
    m.box('tapado', (0.9 * du[0], 2.3, 0.9 * du[1]), (1.8, 0.35, 1.2), 'soil_dark', yaw=FRENTE + 70)
    m.box('terron', (-3.6, 2, 2.1), (1.3, 0.8, 1.1), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula: coleoptilo y 4 hojitas finas como pasto, el grano a un lado. 11 cubos."""
    m = Model('trigo_brote', PAL)
    monticulo(m)
    m.box('hoyo', BASE, (2.6, 0.3, 2.0), 'suelo_humedo', yaw=FRENTE)
    m.box('coleoptilo', BASE, (0.6, 1.2, 0.6), 'cereal_hoja_light')
    # hojitas: dos casi paradas y dos que ya se arquean, finas como pasto
    m.box('hojita0', (0, 2.6, 0), (0.35, 4.6, 0.25), 'cereal_hoja', tilt=8, yaw=FRENTE + 200)
    m.box('hojita1', (0, 2.6, 0), (0.35, 3.6, 0.25), 'cereal_hoja_light', tilt=18, yaw=FRENTE + 20)
    hoja_trigo(m, 'hojita2', (0, 2.8, 0), FRENTE + 110, 4.2, ('cereal_hoja', 'cereal_hoja_light'),
               t1=30, t2=95, ancho=0.4)
    hoja_trigo(m, 'hojita3', (0, 2.6, 0), FRENTE - 80, 3.4, ('cereal_hoja_dark', 'cereal_hoja'),
               t1=40, t2=105, ancho=0.4)
    m.box('grano', (1.3, 2, -0.9), (0.6, 0.5, 1.0), 'trigo_espiga_dark', yaw=30)
    return m


# Hijos del macollo (yaw, tilt, largo del tallo). El principal casi vertical en medio.
HIJOS_CREC = [(FRENTE, 3, 10.5), (FRENTE + 95, 12, 9.0), (FRENTE - 90, 11, 9.5), (FRENTE + 190, 10, 8.5)]
HIJOS_MAD = [(FRENTE, 3, 14.0), (FRENTE + 95, 12, 12.5), (FRENTE - 90, 11, 13.0),
             (FRENTE + 190, 9, 12.0), (FRENTE - 40, 16, 10.5)]


def crecimiento():
    """Macollo verde espigando: 4 hijos con hojas angostas, hoja bandera y espigas verdes. 29 cubos."""
    m = Model('trigo_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.6, 1.0, 1.6), 'cereal_hoja_dark', yaw=FRENTE)
    for k, (yaw, tilt, L) in enumerate(HIJOS_CREC):
        tope = hijo(m, f'hijo{k}', yaw, tilt, L, 'cereal_hoja')
        espiga_trigo(m, f'espiga{k}', tope, tilt, yaw, largo=3.6, n=1,
                     cols=('cereal_hoja', 'cereal_hoja_light', 'cereal_hoja_light'), puntita=False, ancho=0.9)
    # hojas: dos basales grandes, una por hijo lateral y la bandera del principal
    specs = [(0, 1.0, FRENTE - 25, 7.0, VERDE[:2], 50, 120),
             (1, 3.5, FRENTE + 60, 5.5, VERDE[1:], 48, 115),
             (2, 4.0, FRENTE - 130, 5.8, VERDE[1:], 50, 115),
             (3, 3.0, FRENTE + 230, 5.0, VERDE[1:], 50, 118),
             (0, 7.0, FRENTE + 100, 4.0, VERDE[1:], 32, 85)]       # hoja bandera
    for k, (h, a, yaw, L, cols, t1, t2) in enumerate(specs):
        hy, ht, _ = HIJOS_CREC[h]
        hoja_trigo(m, f'hoja{k}', sobre(hy, ht, a), yaw, L, cols, t1=t1, t2=t2)
    return m


def madurez():
    """Macollo dorado: 5 hijos de paja con espigas compactas erguidas y hojas ya secas. 52 cubos."""
    m = Model('trigo_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.8, 1.0, 1.8), 'hoja_seca_dark', yaw=FRENTE)
    for k, (yaw, tilt, L) in enumerate(HIJOS_MAD):
        tope = hijo(m, f'hijo{k}', yaw, tilt, L, PAJA[1] if k % 2 == 0 else 'hoja_seca_light')
        corta = k == 4                                  # hijo tardio: espiga mas chica
        espiga_trigo(m, f'espiga{k}', tope, tilt, yaw, largo=4.0 if corta else 4.8, n=2,
                     ancho=0.9 if corta else 1.05)
    yaw0, t0, _ = HIJOS_MAD[0]
    for k, h in enumerate((4.5, 9.0)):
        m.box(f'nudo{k}', sobre(yaw0, t0, h), (0.75, 0.45, 0.75), PAJA[0], tilt=t0, yaw=yaw0)
    # hojas secas: las bajas caidas y oscuras, las altas palidas y aun arqueadas
    specs = [(0, 1.0, FRENTE + 150, 6.5, ('hoja_seca_dark', 'podrido'), 48, 145),
             (0, 1.2, FRENTE + 15, 6.0, SECA[:2], 50, 148),
             (1, 3.5, FRENTE + 65, 6.0, SECA[:2], 42, 135),
             (2, 4.0, FRENTE - 125, 6.0, SECA[1:], 42, 138),
             (3, 3.0, FRENTE + 235, 5.5, SECA[1:], 44, 135),
             (0, 9.5, FRENTE + 105, 4.5, SECA[1:], 30, 110)]       # hoja bandera seca
    for k, (h, a, yaw, L, cols, t1, t2) in enumerate(specs):
        hy, ht, _ = HIJOS_MAD[h]
        hoja_trigo(m, f'hoja{k}', sobre(hy, ht, a), yaw, L, cols, t1=t1, t2=t2)
    return m


def podrida():
    """Desenlace de estres: macollo acamado hacia un lado (viento y lluvia), paja negra, espigas
    podridas con moho, un hijo quebrado y moscas. 46 cubos."""
    m = Model('trigo_podrida', PAL)
    monticulo(m)
    m.box('charco', (2.0, 2, -0.6), (5.0, 0.2, 3.2), 'suelo_humedo', yaw=-20)   # suelo encharcado
    m.box('corona', BASE, (1.8, 0.9, 1.8), 'podrido_dark', yaw=FRENTE)
    m.box('moho_base', (-0.3, 2.6, 0.3), (1.2, 0.5, 1.0), 'moho_dark', yaw=FRENTE + 20)
    # hijos acamados: todos se vencen hacia +x (el acame tumba el macollo en una sola direccion);
    # se doblan en la base, corren casi pegados al lomo y la espiga podrida cae al suelo
    acamados = [(52, 2.4, 2.2), (76, 2.4, 1.6), (102, 2.4, 1.6), (126, 2.4, 2.2)]
    for k, (yaw, l1, l2) in enumerate(acamados, start=1):
        col = 'hoja_seca_dark' if k % 2 else 'podrido'
        p = m.stem(f'hijo{k}', BASE, l1, 0.5, col, tilt=48 + 3 * k, yaw=yaw)
        p = m.stem(f'hijo{k}_b', p, l2, 0.5, 'podrido' if k % 2 else 'hoja_seca_dark', tilt=80, yaw=yaw)
        cols = PODRIDA if k != 3 else ('podrido_dark', 'moho_dark', 'moho_light')
        espiga_trigo(m, f"espiga{k}", p, 96, yaw, largo=2.8, n=1, cols=cols, puntita=False, ancho=0.9)
        if k == 2:
            m.box('moho_espiga', punta(p, 1.2, 96, yaw), (1.5, 1.0, 1.5), 'moho_light', tilt=96, yaw=yaw)
    # un hijo que quedo parado del otro lado pero quebrado: la punta cuelga con la espiga boca abajo
    lado = 250
    p = m.stem('hijo0', BASE, 6.5, 0.5, 'hoja_seca_dark', tilt=12, yaw=lado)
    m.box('quiebre', p, (0.8, 0.6, 0.8), 'podrido_dark', tilt=12, yaw=lado)
    p = m.stem('hijo0_punta', p, 1.8, 0.5, 'podrido', tilt=125, yaw=lado)
    espiga_trigo(m, 'espiga0', p, 168, lado, largo=3.2, n=1, cols=PODRIDA, puntita=False, ancho=0.9)
    # hojas negras y lacias, vencidas hacia el mismo lado
    specs = [((0, 2.6, 0), 40, 5.0, ('podrido', 'podrido_dark'), 72, 115),
             ((0, 2.8, 0), 140, 4.6, ('hoja_seca_dark', 'podrido'), 70, 112),
             (sobre(lado, 12, 3.0), 200, 4.0, ('hoja_seca_dark', 'podrido_dark'), 62, 140)]
    for k, (b, yaw, L, cols, t1, t2) in enumerate(specs):
        hoja_trigo(m, f'hoja{k}', b, yaw, L, cols, t1=t1, t2=t2)
    # paja y grano caidos, enmohecidos
    m.box('paja_suelo', (-4.4, 2, -1.8), (0.5, 0.3, 4.0), 'hoja_seca_dark', yaw=65)
    for k, (x, z, col, a) in enumerate([(-2.4, 2.4, 'moho_light', 20), (-3.0, -0.2, 'podrido_dark', -40),
                                        (5.4, 3.2, 'trigo_espiga_dark', 55)]):
        m.box(f'grano_suelo{k}', (x, 2 if abs(x) < 5 else 1, z), (0.6, 0.45, 1.0), col, yaw=a)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(3.4, 6.6, 1.2, 20), (5.0, 5.0, -2.2, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('trigo_siembra', siembra), ('trigo_brote', brote), ('trigo_crecimiento', crecimiento),
          ('trigo_madurez', madurez), ('trigo_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
