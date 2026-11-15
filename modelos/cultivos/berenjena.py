"""Generador de la berenjena (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/berenjena.py

Berenjena (Solanum melongena), id `berenjena`. Convenciones (docs/07): 1 celda = 16 unidades, origen en
el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco
del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las alturas y
tamanos son cualitativos, no medidos.

Rasgos que se respetan para no confundirla con el chile (frutos conicos chicos, hoja lanceolada
oscura) ni con el jitomate (tutor, hoja compuesta, frutos rojos redondos en racimo):
- ARBUSTO erguido y ramificado, sin tutor: tallo central con 3 ramas que abren hacia afuera;
- hojas GRANDES, simples, anchas y ovadas, con el borde ondulado-lobulado (una banda transversal mas
  ancha que la lamina saca los lobulos a los lados) en verde grisaceo;
- flores lila con el cono de anteras amarillo, solitarias y COLGANTES de un pedicelo;
- frutos grandes ALARGADOS (mas anchos abajo) MORADO OSCURO con un brillo, que cuelgan de las ramas,
  con un CALIZ verde grande en la punta de arriba (capuchon y sepalos en estrella);
- podrida: arbusto vencido y ladeado, hojas secas colgando y caidas, berenjenas arrugadas cafes con
  restos de morado y moho, una caida sobre el lomo, y moscas.
Colores de la paleta fija, sin colores nuevos: berenjena_fruto, berenjena_brillo y frijol_negro (fruto),
berenjena_hoja con sandia_hoja_dark y sandia_hoja_light como sombra y luz de la hoja (verdes
grisaceos ya existentes), leaf_dark (tallo, pedicelo), chile_verde_dark y leaf_dark (caliz),
flor_lila y yellow (flor), calabaza_crema (semilla), hoja_seca*, hoja_marchita, podrido* y moho* en
lo seco, suelo_humedo y suelo_grieta en el lomo.

Fuentes de forma (no de medidas):
- PROTA via Pl@ntUse, Solanum melongena (https://plantuse.plantnet.org/en/Solanum_melongena_(PROTA)):
  arbusto de hasta 150 cm muy ramificado; hoja simple ovada con el margen profundamente
  ondulado-lobulado y muy pelosa; flores solitarias o en cimas de 1 a 5, corola violeta de 3 a 4 cm con
  anteras amarillas unidas; caliz que crece mucho con el fruto; baya de ovoide a alargada, de blanca a
  morado negruzco.
- POWO (Kew), Solanum melongena (https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:820053-1/general-information):
  tallos y hojas con pelos estrellados (de ahi el verde grisaceo), corola violeta azulada, caliz
  acrescente en el fruto.
- Botany Brisbane, Solanum melongena (https://www.botanybrisbane.com/plants/solanaceae/solanum/solanum-melongena/):
  caliz de 5 sepalos unidos en copa con lobulos angostos; fruto brillante.
Que el fruto cuelgue es el habito comun de la planta en cultivo (diseno acordado con el equipo); las
fuentes de arriba no lo dicen de forma explicita.
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
from tomate import mover, palo  # noqa: E402  (utilidades de la otra solanacea)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)

TALLO = 'leaf_dark'
HOJA = ('berenjena_hoja', 'sandia_hoja_dark', 'sandia_hoja_light')       # lamina, lobulos, punta
HOJA_BAJA = ('sandia_hoja_dark', 'berenjena_hoja', 'berenjena_hoja')
MORADA = ('chile_verde_dark', 'leaf_dark', 'berenjena_fruto', 'berenjena_fruto', 'berenjena_brillo')
# caliz, sepalos, cuello, cuerpo, brillo
PODRIDA = ('hoja_seca_dark', 'podrido_dark', 'berenjena_fruto', 'podrido', 'moho')        # el brillo pasa a
PODRIDA_B = ('podrido_dark', 'hoja_seca_dark', 'podrido', 'podrido_dark', 'moho_light')  # mancha de moho


# ---------------- utilidades ----------------
def hoja(m, nombre, p, yaw, largo, ancho, cols=HOJA, caida=10):
    """Hoja grande ovada y lobulada que sale de p hacia yaw; caida > 0 baja la punta. 3 cubos.

    Lamina ancha, una banda transversal mas ancha (los lobulos que asoman a los lados) y la punta
    angosta. Las tres giran sobre p, asi quedan en un solo plano."""
    m.box(nombre, (p[0], p[1], p[2] + largo * 0.38), (ancho, 0.3, largo * 0.66), cols[0],
          tilt=caida, yaw=yaw, pivot=p)
    m.box(nombre + '_lobulos', (p[0], p[1] - 0.04, p[2] + largo * 0.46), (ancho * 1.32, 0.3, largo * 0.26),
          cols[1], tilt=caida, yaw=yaw, pivot=p)
    m.box(nombre + '_punta', (p[0], p[1] + 0.03, p[2] + largo * 0.83), (ancho * 0.55, 0.3, largo * 0.3),
          cols[2], tilt=caida, yaw=yaw, pivot=p)


def flor(m, nombre, p, yaw, cols=('flor_lila', 'yellow')):
    """Flor colgante: pedicelo que se dobla hacia abajo, corola lila en campana y cono amarillo. 3 cubos."""
    t = m.stem(nombre + '_pedicelo', p, 1.2, 0.35, TALLO, tilt=135, yaw=yaw)
    m.box(nombre, (t[0], t[1] - 0.7, t[2]), (1.3, 0.7, 1.3), cols[0], yaw=yaw + 45)
    m.box(nombre + '_centro', (t[0], t[1] - 1.15, t[2]), (0.5, 0.5, 0.5), cols[1], yaw=yaw)
    return t


def berenjena(m, nombre, p, sale, largo=5.0, ancho=2.2, cols=MORADA, gira=FRENTE, inclina=-6, pedicelo=1.4,
              col_pedicelo=TALLO):
    """Fruto alargado colgante. 7 cubos: pedicelo, caliz (capuchon), sepalos en estrella, cuello angosto,
    cuerpo ancho, fondo redondeado y un brillo vertical en la cara que ve a la camara (gira).

    Cuelga de p: el pedicelo sale hacia `sale` y baja; el fruto entero gira (gira, inclina) sobre la
    punta del pedicelo, asi queda rigido y casi vertical. Devuelve el punto mas bajo aproximado."""
    t = m.stem(nombre + '_pedicelo', p, pedicelo, 0.55, col_pedicelo, tilt=140, yaw=sale)
    rot = dict(tilt=inclina, yaw=gira, pivot=t)
    caliz, cuello, cuerpo, fondo = 1.0, largo * 0.28, largo * 0.48, largo * 0.1
    m.box(nombre + '_caliz', (t[0], t[1] - caliz, t[2]), (ancho * 0.72, caliz, ancho * 0.72), cols[0], **rot)
    m.box(nombre + '_sepalos', (t[0], t[1] - caliz - 0.3, t[2]), (ancho * 0.95, 0.4, ancho * 0.95), cols[1],
          tilt=inclina, yaw=gira + 45, pivot=t)
    y1 = t[1] - caliz - cuello
    m.box(nombre + '_cuello', (t[0], y1, t[2]), (ancho * 0.66, cuello, ancho * 0.66), cols[2], **rot)
    y2 = y1 - cuerpo
    m.box(nombre, (t[0], y2, t[2]), (ancho, cuerpo, ancho), cols[3], **rot)
    m.box(nombre + '_fondo', (t[0], y2 - fondo, t[2]), (ancho * 0.7, fondo, ancho * 0.7), cols[3], **rot)
    m.box(nombre + '_brillo', (t[0] - ancho * 0.22, y2 + cuerpo * 0.3, t[2] + ancho / 2), (0.4, cuerpo * 0.55, 0.2),
          cols[4], **rot)
    return (t[0], y2 - fondo, t[2])


# ---------------- etapas ----------------
def siembra():
    """Lomo recien sembrado y humedo: hoyo con cinco semillas planas crema y dos terrones. 10 cubos."""
    m = Model('berenjena_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.4, 0.3, 3.4), 'suelo_humedo')
    semillas = [((-1.1, 0.6), 20), ((1.0, -0.6), -35), ((0.4, 1.0), 65), ((-0.5, -0.9), 10), ((1.3, 0.7), 110)]
    for k, ((x, z), yaw) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), (0.8, 0.2, 1.0), 'calabaza_crema', yaw=yaw)
    m.box('terron1', (3.6, 2, 1.4), (1.6, 1.0, 1.4), 'soil_dark', yaw=30)
    m.box('terron2', (-3.8, 2, -1.2), (1.3, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito, 2 cotiledones ovalados y el primer par de hojitas anchas. 9 cubos."""
    m = Model('berenjena_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.3, 2.6), 'suelo_humedo')
    m.box('tallito', BASE, (0.55, 3.4, 0.55), 'berenjena_hoja')
    top = (0, 5.4, 0)
    plano = FRENTE + 90
    for k in range(2):
        m.box(f'cotiledon{k}', (top[0], top[1] - 0.3, top[2] + 1.3), (1.2, 0.25, 2.4),
              ('sandia_hoja_light', 'berenjena_hoja')[k], tilt=12, yaw=plano + 180 * k, pivot=top)
    for k in range(2):
        m.box(f'hojita{k}', (top[0], top[1] + 0.3 + 0.1 * k, top[2] + 0.9), (1.4, 0.25, 1.7),
              ('berenjena_hoja', 'sandia_hoja_dark')[k], tilt=-20, yaw=FRENTE + 50 + 180 * k, pivot=top)
    m.box('cascara', (1.7, 2.3, 0.9), (0.8, 0.2, 1.0), 'calabaza_crema', yaw=25)
    return m


def crecimiento():
    """Arbusto joven: tallo con 2 ramas, 5 hojas grandes lobuladas y 3 flores lila colgantes. 29 cubos."""
    m = Model('berenjena_crecimiento', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 5.6, 0.9, TALLO, tilt=0, yaw=0)
    r0 = m.stem('rama0', (0, 4.4, 0), 3.4, 0.6, TALLO, tilt=48, yaw=FRENTE + 75)
    r1 = m.stem('rama1', (0, 5.2, 0), 3.2, 0.6, TALLO, tilt=46, yaw=FRENTE - 95)
    hoja(m, 'hoja0', r0, FRENTE + 100, 4.2, 2.8, caida=8)
    hoja(m, 'hoja1', r1, FRENTE - 120, 4.2, 2.8, caida=8)
    hoja(m, 'hoja2', top, FRENTE + 190, 4.4, 2.9, caida=-6)
    hoja(m, 'hoja3', top, FRENTE + 15, 3.6, 2.4, caida=-18)
    hoja(m, 'hoja4', (0, 3.4, 0), FRENTE + 150, 3.8, 2.6, HOJA_BAJA, caida=22)
    flor(m, 'flor0', punta((0, 4.4, 0), 2.4, 48, FRENTE + 75), FRENTE + 40)
    flor(m, 'flor1', punta((0, 5.2, 0), 2.2, 46, FRENTE - 95), FRENTE - 40)
    flor(m, 'flor2', (0, 6.6, 0), FRENTE)
    return m


def madurez():
    """Arbusto lleno: tallo con 3 ramas, 7 hojas grandes, 4 berenjenas moradas colgando y 1 flor. 58 cubos."""
    m = Model('berenjena_madurez', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 7.6, 1.1, TALLO, tilt=0, yaw=0)
    specs = [((0, 5.0, 0), 4.6, 45, FRENTE + 75), ((0, 6.0, 0), 4.4, 44, FRENTE - 85),
             ((0, 7.0, 0), 4.0, 40, FRENTE + 185)]
    ramas = [m.stem(f'rama{k}', b, L, 0.7, TALLO, tilt=t, yaw=y) for k, (b, L, t, y) in enumerate(specs)]
    # copa: una hoja grande en cada punta de rama, dos arriba y una baja atras
    hoja(m, 'hoja0', ramas[0], FRENTE + 110, 4.6, 3.1, caida=6)
    hoja(m, 'hoja1', ramas[1], FRENTE - 125, 4.6, 3.1, caida=6)
    hoja(m, 'hoja2', ramas[2], FRENTE + 160, 4.8, 3.2, caida=4)
    hoja(m, 'hoja3', top, FRENTE + 60, 4.2, 2.9, caida=-14)
    hoja(m, 'hoja4', top, FRENTE - 70, 4.2, 2.9, caida=-10)
    hoja(m, 'hoja5', top, FRENTE + 220, 3.8, 2.6, caida=-24)
    hoja(m, 'hoja6', (0, 4.0, 0), FRENTE + 200, 4.0, 2.7, HOJA_BAJA, caida=24)
    # berenjenas colgando de las ramas, tres hacia la camara y una atras
    berenjena(m, 'fruto0', punta(*specs[0][:1], 4.4, 45, FRENTE + 75), FRENTE + 75, 4.4, gira=FRENTE + 10)
    berenjena(m, 'fruto1', punta(*specs[1][:1], 3.8, 44, FRENTE - 85), FRENTE - 85, 5.4, gira=FRENTE - 15)
    berenjena(m, 'fruto2', (0, 8.6, 0), FRENTE, 5.2, 2.3)
    berenjena(m, 'fruto3', punta(*specs[2][:1], 3.4, 40, FRENTE + 185), FRENTE + 185, 4.8, 2.1, gira=FRENTE + 180)
    flor(m, 'flor0', punta(specs[1][0], 2.0, 44, FRENTE - 85), FRENTE - 20)
    return m


def podrida():
    """Desenlace: arbusto ladeado y seco, hojas cafes colgando y caidas, 2 berenjenas arrugadas con moho
    colgando, una caida en el lomo y 2 moscas. 50 cubos."""
    m = Model('berenjena_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (-2.6, 2, 1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    lado = FRENTE + 100
    top = m.stem('tallo', BASE, 7.4, 1.0, 'hoja_seca_dark', tilt=14, yaw=lado)
    m.box('moho_base', BASE, (1.4, 1.0, 1.4), 'moho_dark', tilt=14, yaw=lado)
    m.box('quiebre', top, (1.2, 0.6, 1.2), 'podrido_dark', tilt=14, yaw=lado)
    b0, b1 = punta(BASE, 5.4, 14, lado), punta(BASE, 6.6, 14, lado)
    r0 = m.stem('rama0', b0, 3.6, 0.6, 'hoja_seca', tilt=95, yaw=FRENTE - 85)
    r1 = m.stem('rama1', b1, 3.4, 0.6, 'hoja_seca_dark', tilt=100, yaw=FRENTE + 185)
    r2 = m.stem('rama2_cae', top, 3.0, 0.55, 'hoja_seca_dark', tilt=130, yaw=lado)
    # hojas secas colgando de las ramas y el tallo, angostas (enrolladas)
    secas = [(r0, FRENTE - 140, ('hoja_seca', 'hoja_seca_dark', 'hoja_marchita'), 62),
             (r1, FRENTE + 220, ('hoja_seca_dark', 'podrido', 'hoja_seca'), 68),
             (r2, lado + 40, ('hoja_marchita', 'hoja_seca', 'hoja_seca_light'), 72),
             (top, FRENTE - 30, ('hoja_seca', 'hoja_seca_dark', 'hoja_seca_light'), 55)]
    for k, (b, yaw, cols, c) in enumerate(secas):
        hoja(m, f'hoja{k}', b, yaw, 3.2, 1.7, cols, caida=c)
    # hojas caidas en el lomo y en el suelo (enrolladas, sin lobulos)
    caidas = [((3.0, 2, -1.8), 'hoja_seca', 20), ((-5.6, 1, -3.6), 'hoja_seca_light', 60),
              ((5.6, 1, 3.8), 'hoja_marchita', 10), ((5.2, 1, -3.8), 'podrido', -50)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'hoja_suelo{k}', c, (1.6, 0.3, 2.8), col, yaw=yaw)
    # berenjenas arrugadas colgando: cafes, con resto de morado en el cuello, arruga y moho
    t0 = berenjena(m, 'fruto0', punta(b0, 2.2, 95, FRENTE - 85), FRENTE - 75, 3.8, 1.9, PODRIDA,
                   gira=FRENTE - 10, inclina=-12, pedicelo=1.0, col_pedicelo='hoja_seca_dark')
    m.box('fruto0_arruga', (t0[0], t0[1] + 1.4, t0[2]), (2.05, 0.3, 2.05), 'podrido_dark', yaw=FRENTE + 20)
    m.box('fruto0_moho', (t0[0], t0[1] + 0.1, t0[2]), (1.5, 0.6, 1.5), 'moho_light', yaw=FRENTE)
    berenjena(m, 'fruto1', punta(b1, 2.0, 100, FRENTE + 185), FRENTE + 185, 3.4, 1.8, PODRIDA_B,
              gira=FRENTE + 180, inclina=10, pedicelo=1.0, col_pedicelo='hoja_seca_dark')
    # berenjena caida sobre el lomo, tumbada: cuerpo cafe, cuello aun morado, caliz seco y moho encima
    eje = 190
    c = (3.6, 2, 0.9)
    m.box('fruto_suelo', c, (1.9, 1.7, 3.2), 'podrido', yaw=eje)
    m.box('fruto_suelo_cuello', mover(c, eje, 2.1), (1.3, 1.3, 1.2), 'berenjena_fruto', yaw=eje)
    m.box('fruto_suelo_caliz', mover(c, eje, 2.9), (1.7, 1.6, 0.5), 'hoja_seca_dark', yaw=eje)
    m.box('fruto_suelo_moho', mover(c, eje, -0.4, 1.7), (1.4, 0.4, 1.8), 'moho', yaw=eje + 20)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(2.6, 6.2, 3.0, 20), (-3.6, 4.6, 3.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('berenjena_siembra', siembra), ('berenjena_brote', brote), ('berenjena_crecimiento', crecimiento),
          ('berenjena_madurez', madurez), ('berenjena_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
