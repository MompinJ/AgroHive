"""Generador del jitomate (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/tomate.py

Jitomate o tomate rojo (Solanum lycopersicum), id `tomate`, de habito indeterminado y conducido a un
TUTOR. Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la base, y=0 superficie,
+Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del
tallo (0, 2, 0), y caben en una huella de 16x16. El tutor (estaca recta de madera) esta clavado en el
lomo, un poco detras del tallo visto desde la camara, desde la siembra. Las alturas y tamanos son
cualitativos, no medidos.

Rasgos que se respetan para no confundirlo con el chile (frutos conicos colgantes, sin tutor) ni con
el chicharo (tutor tambien, pero con vainas y zarcillos):
- tallo verde que sube junto a la estaca y va AMARRADO a ella con cintas blancas;
- hoja COMPUESTA imparipinnada: raquis con 2 pares de foliolos opuestos y uno terminal, foliolos
  dentados (el dentado se sugiere con un diente girado 45 grados en el foliolo terminal) en verde
  oscuro;
- flores amarillas chicas en racimo (cima) que sale del tallo entre hojas;
- RACIMOS de jitomates REDONDOS (caja y caja girada 45 grados, que se lee como octagono) con su caliz
  verde en estrellita encima; en madurez la mayoria rojos y alguno verde;
- podrida: la planta se zafo del tutor (amarre roto) y cayo sobre el lomo; hojas secas, jitomates
  negros con moho, uno reventado en el lomo con sus semillas, y moscas.
Colores de la paleta fija, sin colores nuevos: tomate_hoja_dark, tomate_hoja, tomate_fruto,
tomate_verde, yellow (flor), wood y wood_dark (tutor), white (amarre y brillo), calabaza_crema y
chile_semilla (semilla), hoja_seca*, hoja_marchita, podrido* y moho* en lo seco.

Fuentes de forma (no de medidas):
- KPU Plant Database, Solanum lycopersicum (https://plantdatabase.kpu.ca/Plant/lyly): hojas
  imparipinnadas de 5 a 9 foliolos de tamano variable; flores amarillas en cima.
- NParks Flora & Fauna Web, Solanum lycopersicum (https://nparks.gov.sg/florafaunaweb/flora/5/7/5772):
  flores amarillas de 5 lobulos puntiagudos en grupos de 3 a 12; caliz verde persistente que crece con
  el fruto.
- VicFlora, Solanum lycopersicum (https://vicflora.rbg.vic.gov.au/flora/taxon/bede19ce-e3ad-48cd-a1bb-69d1348bfdb8):
  hoja con varios pares de foliolos; fruto en baya.
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
ALTO_TUTOR = 19.0     # estaca clavada en el lomo; cualitativo


def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


TUTOR = mover(BASE, FRENTE + 180, 1.4)   # pie del tutor, detras del tallo visto desde la camara

HOJA = ('tomate_hoja_dark', 'tomate_hoja')          # foliolo, raquis y foliolo terminal
TALLO = 'tomate_hoja'
ROJO = ('tomate_fruto', 'tomate_fruto')             # cuerpo, redondeo
VERDE = ('tomate_verde', 'tomate_verde')
NEGRO = ('podrido_dark', 'frijol_negro')
CAFE = ('podrido', 'podrido_dark')


# ---------------- utilidades ----------------
def palo(m, nombre, a, b, grueso, col):
    """Caja recta de a a b (tallo, pedunculo). 1 cubo. Devuelve b."""
    dx, dy, dz = (b[i] - a[i] for i in range(3))
    largo = math.sqrt(dx * dx + dy * dy + dz * dz)
    tilt = math.degrees(math.acos(max(-1.0, min(1.0, dy / largo))))
    yaw = math.degrees(math.atan2(dx, dz))
    m.box(nombre, a, (grueso, largo, grueso), col, tilt=tilt, yaw=yaw)
    return b


def tutor(m, tilt=0, yaw=0, alto=ALTO_TUTOR):
    """Estaca de madera clavada en el lomo con su corte oscuro arriba. 2 cubos. Devuelve la punta."""
    top = m.stem('tutor', TUTOR, alto, 1.1, 'wood', tilt=tilt, yaw=yaw)
    m.box('tutor_corte', top, (1.2, 0.5, 1.2), 'wood_dark', tilt=tilt, yaw=yaw)
    return top


def en_tutor(h, ang, r, tilt=0, yaw=0):
    """Punto a radio r del eje del tutor, a la altura h (sobre el pie) y en el angulo ang."""
    return mover(punta(TUTOR, h, tilt, yaw), ang, r)


def amarre(m, nombre, p, h, col='white'):
    """Cinta que amarra el tallo (en p) al tutor a la altura h: lazo plano que abraza a los dos. 1 cubo."""
    eje = punta(TUTOR, h, 0, 0)
    dx, dz = p[0] - eje[0], p[2] - eje[2]
    yaw = math.degrees(math.atan2(dx, dz))
    d = math.hypot(dx, dz)
    c = ((p[0] + eje[0]) / 2, p[1] - 0.25, (p[2] + eje[2]) / 2)
    m.box(nombre, c, (1.5, 0.5, d + 1.6), col, yaw=yaw)


def tallo(m, alturas, angulos, r=1.05, grueso=0.7, col=TALLO, nombre='tallo'):
    """Tallo que sube junto al tutor en zigzag suave, del lado de la camara.

    Parte de BASE; cada nudo esta a radio r del eje del tutor, a la altura dada y en el angulo dado.
    Devuelve los nudos (el primero es BASE)."""
    nudos = [BASE]
    for k, (h, ang) in enumerate(zip(alturas, angulos)):
        g = grueso * (1 - 0.1 * k)
        nudos.append(palo(m, f'{nombre}{k}', nudos[-1], en_tutor(h, ang, r), g, col))
    return nudos


def foliolo(m, nombre, p, yaw, largo, col, caida=10, ancho=None):
    """Foliolo ovalado que sale de p hacia yaw; caida > 0 baja la punta. 1 cubo."""
    w = ancho if ancho is not None else largo * 0.62
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (w, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)


def hoja(m, nombre, nodo, yaw, s=1.0, cols=HOJA, tilt_raq=72, caida=12, pares=2, diente=True):
    """Hoja compuesta de jitomate: raquis, `pares` pares de foliolos opuestos y un foliolo terminal con
    un diente girado 45 grados (dentado). 2 + 2 * pares (+1 con diente) cubos. Devuelve el final del raquis."""
    L = 4.6 * s
    m.box(nombre + '_raquis', nodo, (0.3, L, 0.3), cols[1], tilt=tilt_raq, yaw=yaw)
    for k in range(pares):
        q = punta(nodo, L * (0.38 + 0.36 * k), tilt_raq, yaw)
        largo = 2.1 * s * (1 - 0.08 * k)
        for j, lado in enumerate((1, -1)):
            foliolo(m, f'{nombre}_f{k}{j}', q, yaw + lado * (62 - 8 * k), largo, cols[0], caida + 6 * j)
    fin = punta(nodo, L, tilt_raq, yaw)
    largo = 2.4 * s
    foliolo(m, nombre + '_term', fin, yaw, largo, cols[1], caida, ancho=largo * 0.6)
    if diente:
        c = mover(fin, yaw, largo * 0.42, -math.sin(math.radians(caida)) * largo * 0.42 - 0.02)
        m.box(nombre + '_diente', c, (largo * 0.5, 0.3, largo * 0.5), cols[1], yaw=yaw + 45)
    return fin


def jitomate(m, nombre, top, s, cols=ROJO, yaw=0, brillo=False, caliz='tomate_hoja_dark'):
    """Jitomate redondo que cuelga de top: cuerpo, redondeo girado 45 grados y caliz en estrellita
    (cuadro girado sobre la tapa). 3 cubos (4 con brillo). Devuelve el centro de la base."""
    h = s * 0.82
    b = (top[0], top[1] - h, top[2])
    m.box(nombre, b, (s, h, s), cols[0], yaw=yaw)
    m.box(nombre + '_redondo', (b[0], b[1] + h * 0.14, b[2]), (s * 0.94, h * 0.72, s * 0.94), cols[1], yaw=yaw + 45)
    if caliz:
        m.box(nombre + '_caliz', (b[0], b[1] + h, b[2]), (s * 0.66, 0.25, s * 0.66), caliz, yaw=yaw + 45)
    if brillo:
        # en la cara que mira a la camara, justo afuera de la mas saliente de las dos cajas
        def sale(lado, giro):
            d = math.radians((FRENTE - giro) % 90)
            return lado / 2 / math.cos(min(d, math.pi / 2 - d))
        r = max(sale(s, yaw), sale(s * 0.94, yaw + 45))
        c = mover((b[0], b[1] + h * 0.52, b[2]), FRENTE, r + 0.04)
        m.box(nombre + '_brillo', c, (s * 0.3, s * 0.26, 0.12), 'white', yaw=FRENTE)
    return b


def racimo(m, nombre, nodo, yaw, largo, frutos, tilt=100, col=TALLO):
    """Racimo de jitomates: pedunculo que sale del nudo hacia yaw y frutos colgando a lo largo.

    frutos: lista de (u, lado, dy, s, cols, brillo); u en 0..1 a lo largo del pedunculo, lado
    desplaza a los costados (perpendicular) y dy baja el fruto. 1 + 3 o 4 por fruto cubos."""
    m.box(nombre + '_ped', nodo, (0.35, largo, 0.35), col, tilt=tilt, yaw=yaw)
    for k, (u, lado, dy, s, cols, brillo) in enumerate(frutos):
        q = punta(nodo, largo * u, tilt, yaw)
        q = mover(q, yaw + 90, lado, dy - 0.15)
        jitomate(m, f'{nombre}_j{k}', q, s, cols, yaw=yaw + 20 * k, brillo=brillo)


def flores(m, nombre, nodo, yaw, largo, n=3, tilt=62, estrella=True):
    """Racimo de flores amarillas: pedunculo que sube y se arquea, flores chicas en estrella colgando.
    1 + n cubos (con estrella, la ultima flor lleva un segundo cuadro cruzado: + 1)."""
    m.box(nombre + '_ped', nodo, (0.3, largo, 0.3), TALLO, tilt=tilt, yaw=yaw)
    for k in range(n):
        u = 0.45 + 0.55 * k / max(1, n - 1)
        q = mover(punta(nodo, largo * u, tilt, yaw), yaw + 90, 0.55 * (1 if k % 2 else -1), -0.55)
        m.box(f'{nombre}_flor{k}', q, (0.95, 0.3, 0.95), 'yellow', yaw=yaw + 30 * k)
        if estrella and k == n - 1:
            m.box(f'{nombre}_flor{k}_b', (q[0], q[1] + 0.02, q[2]), (0.95, 0.3, 0.95), 'yellow', yaw=yaw + 30 * k + 45)


def mosca(m, nombre, p, ang):
    """Mosca: cuerpo negro y alas. 2 cubos (lo unico que flota a proposito)."""
    m.box(nombre, p, (0.6, 0.4, 0.6), 'black', yaw=ang)
    m.box(nombre + '_ala', (p[0], p[1] + 0.4, p[2]), (1.1, 0.1, 0.4), 'moho_light', yaw=ang)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con el tutor ya clavado y 5 semillitas planas crema. 11 cubos (9 mas el lomo)."""
    m = Model('tomate_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0.4, 2, 0.6), (6.4, 0.12, 4.0), 'suelo_humedo', yaw=10)
    tutor(m, alto=6.5)
    semillas = [((-1.2, 0.6), 20, 'calabaza_crema'), ((0.6, 0.2), -35, 'chile_semilla'),
                ((1.9, 1.3), 60, 'calabaza_crema'), ((-0.2, 1.8), 5, 'chile_semilla'),
                ((1.2, -0.9), 40, 'chile_semilla')]
    for k, ((x, z), yaw, col) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.12, z), (0.85, 0.2, 0.85), col, yaw=yaw)
    m.box('terron', (-3.6, 2, 1.5), (1.4, 0.8, 1.2), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula junto al tutor: tallito, 2 cotiledones angostos y 2 hojitas verdaderas (con su
    foliolo terminal y un foliolo lateral) y la yema. 12 cubos (10 mas el lomo)."""
    m = Model('tomate_brote', PAL)
    monticulo(m)
    tutor(m, alto=8.5)
    top = palo(m, 'tallito', BASE, (0.15, 5.2, 0.2), 0.45, 'tomate_hoja')
    # cotiledones angostos y largos, de lado a la camara
    nudo = (0.12, 4.6, 0.18)
    for k, s in enumerate((1, -1)):
        m.box(f'cotiledon{k}', (nudo[0], nudo[1], nudo[2] + 1.4), (0.6, 0.25, 2.8), 'tomate_hoja',
              tilt=-10 if k else -16, yaw=FRENTE + 90 + (0 if s > 0 else 180), pivot=nudo)
    # primer par de hojas verdaderas, ya compuestas: foliolo terminal y un foliolo lateral
    for k, yaw in enumerate((FRENTE + 15, FRENTE + 200)):
        foliolo(m, f'hojita{k}', top, yaw, 2.3, 'tomate_hoja_dark', caida=-35, ancho=1.3)
        foliolo(m, f'hojita{k}_lat', mover(top, yaw, 0.6, 0.35), yaw + 75, 1.2, 'tomate_hoja_dark', caida=-10,
                ancho=0.7)
    m.box('yema', top, (0.5, 0.6, 0.5), 'tomate_hoja', yaw=FRENTE)
    return m


def crecimiento():
    """Planta joven amarrada al tutor: tallo en 3 tramos con 1 amarre, 2 hojas compuestas, punta
    tierna y 2 racimos de flores amarillas (3 y 2 flores). 30 cubos."""
    m = Model('tomate_crecimiento', PAL)
    monticulo(m)
    tutor(m, alto=13.5)
    nudos = tallo(m, [4.8, 8.4, 11.0], [FRENTE + 25, FRENTE - 25, FRENTE + 10], grueso=0.65)
    amarre(m, 'amarre0', nudos[1], 4.8)
    hoja(m, 'hoja0', nudos[1], FRENTE + 95, s=0.95, caida=12, diente=False)
    hoja(m, 'hoja1', nudos[2], FRENTE - 100, s=0.9, caida=8, diente=False)
    # punta tierna: yema y un foliolo chico que abre
    m.box('yema', nudos[3], (0.6, 0.9, 0.6), 'tomate_hoja', tilt=-10, yaw=FRENTE)
    foliolo(m, 'punta0', nudos[3], FRENTE + 60, 1.7, 'tomate_hoja', caida=-25, ancho=1.0)
    # racimos de flores entre hojas, hacia la camara
    flores(m, 'flores0', mover(nudos[1], 0, 0, 1.4), FRENTE + 30, 2.8, n=3)
    flores(m, 'flores1', mover(nudos[2], 0, 0, 0.8), FRENTE - 35, 2.4, n=2, estrella=False)
    return m


def madurez():
    """Planta alta amarrada al tutor: tallo en 4 tramos con 2 amarres, 3 hojas compuestas, punta,
    3 racimos de jitomates (5 rojos, 2 con brillo, y 2 verdes arriba) y una flor tardia. 59 cubos."""
    m = Model('tomate_madurez', PAL)
    monticulo(m)
    tutor(m, alto=15.0)
    nudos = tallo(m, [3.9, 7.3, 10.5, 13.0], [FRENTE + 25, FRENTE - 25, FRENTE + 25, FRENTE - 5], grueso=0.8)
    amarre(m, 'amarre0', nudos[1], 3.9)
    amarre(m, 'amarre1', nudos[3], 10.5)
    hoja(m, 'hoja0', nudos[1], FRENTE + 100, s=1.15, caida=14)
    hoja(m, 'hoja1', nudos[2], FRENTE - 95, s=1.15, caida=10)
    hoja(m, 'hoja2', nudos[3], FRENTE + 165, s=1.0, caida=6, pares=1, diente=False)
    # punta: foliolos tiernos
    for k, yaw in enumerate((FRENTE + 50, FRENTE - 130)):
        foliolo(m, f'punta{k}', nudos[4], yaw, 1.7, 'tomate_hoja', caida=-25, ancho=1.0)
    # racimos: el de abajo maduro (rojos grandes), el de en medio rojo, el de arriba verde
    racimo(m, 'racimo0', mover(nudos[1], 0, 0, -0.3), FRENTE + 15, 3.8, [
        (0.45, -0.6, 0.0, 2.4, ROJO, True), (0.95, 0.7, -0.3, 2.3, ROJO, False), (0.7, -0.2, -2.0, 2.1, ROJO, False)])
    racimo(m, 'racimo1', mover(nudos[2], 0, 0, -0.2), FRENTE - 40, 3.4, [
        (0.5, 0.6, 0.0, 2.2, ROJO, True), (0.95, -0.6, -0.2, 2.0, ROJO, False)], tilt=95)
    racimo(m, 'racimo2', nudos[3], FRENTE + 60, 2.8, [
        (0.55, 0.3, 0.0, 1.6, VERDE, False), (1.0, -0.4, -0.1, 1.4, VERDE, False)], tilt=92)
    # flor tardia en la punta
    flores(m, 'flores0', mover(nudos[3], 0, 0, 1.2), FRENTE - 20, 1.8, n=1, tilt=55)
    return m


def podrida():
    """Desenlace de estres: el amarre se rompio y la planta seca cayo del tutor sobre el lomo; hojas
    secas, racimo de jitomates negros con moho, un jitomate reventado en el lomo con semillas y moho,
    otro caido y 2 moscas. 51 cubos."""
    m = Model('tomate_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (2.0, 2, -1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.8, 2, 1.0), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    tutor(m, alto=13.0)
    # amarre roto colgando del tutor: lazo flojo y un cabo de cinta
    m.box('amarre_roto', punta(TUTOR, 9.0, 0, 0), (1.5, 0.45, 1.5), 'white', yaw=20)
    m.box('amarre_cabo', mover(punta(TUTOR, 9.0, 0, 0), FRENTE, 0.7), (0.4, 1.6, 0.25), 'white', tilt=170,
          yaw=FRENTE)
    # tallo seco: sale de la base, se dobla y queda tendido sobre el lomo hacia la derecha
    m.box('moho_base', BASE, (1.3, 0.8, 1.3), 'moho_dark', yaw=20)
    a = palo(m, 'tallo0', BASE, (1.3, 5.6, 0.9), 0.7, 'hoja_seca_dark')
    b = palo(m, 'tallo1', a, (4.0, 4.2, 1.4), 0.6, 'hoja_seca')
    c = palo(m, 'tallo2', b, (6.2, 2.4, 0.6), 0.55, 'hoja_seca_dark')
    m.box('quiebre', a, (1.0, 0.7, 1.0), 'podrido_dark', yaw=30)
    # hojas compuestas secas, colgando con los foliolos vencidos
    hoja(m, 'hoja0', a, FRENTE + 175, s=0.9, cols=('hoja_seca_dark', 'hoja_seca'), tilt_raq=105, caida=45,
         diente=False)
    hoja(m, 'hoja1', b, FRENTE - 150, s=0.85, cols=('hoja_marchita', 'hoja_seca'), tilt_raq=110, caida=35,
         pares=1, diente=False)
    hoja(m, 'hoja2', c, FRENTE + 130, s=0.7, cols=('hoja_seca', 'podrido'), tilt_raq=100, caida=30, pares=1,
         diente=False)
    # foliolos sueltos en el lomo y el suelo
    for k, (p, col, yaw) in enumerate([((-4.2, 2, -1.8), 'hoja_marchita', -35), ((-6.0, 1, 3.6), 'hoja_seca_dark', 60),
                                       ((6.0, 1, -3.6), 'hoja_seca_light', 15)]):
        m.box(f'foliolo_suelo{k}', p, (1.2, 0.3, 1.9), col, yaw=yaw)
    # racimo que aun cuelga del tallo vencido: jitomates negros arrugados, uno con moho
    m.box('racimo_ped', b, (0.35, 1.6, 0.35), 'hoja_seca_dark', tilt=150, yaw=FRENTE)
    q = punta(b, 1.6, 150, FRENTE)
    jitomate(m, 'negro0', q, 1.7, NEGRO, yaw=15, caliz='hoja_seca_dark')
    m.box('negro0_moho', mover(q, 0, 0, -1.55), (1.2, 0.5, 1.2), 'moho_light', yaw=40)
    jitomate(m, 'negro1', mover(q, FRENTE + 90, 1.0, 0.6), 1.4, CAFE, yaw=-10, caliz='hoja_seca')
    # jitomate reventado en el lomo: aplastado, con la pulpa roja abierta, semillas y moho
    rc = (-2.8, 2, 2.3)
    m.box('reventado', rc, (2.6, 0.7, 2.2), 'podrido', yaw=-20)
    m.box('reventado_pulpa', (rc[0], 2.7, rc[2]), (1.8, 0.2, 1.5), 'red', yaw=-5)
    for k, (dx, dz, yaw) in enumerate([(-0.4, 0.2, 10), (0.4, -0.3, 50)]):
        m.box(f'reventado_semilla{k}', (rc[0] + dx, 2.9, rc[2] + dz), (0.5, 0.12, 0.5), 'chile_semilla', yaw=yaw)
    m.box('reventado_moho', (rc[0] + 0.9, 2.7, rc[2] - 0.5), (1.0, 0.4, 1.0), 'moho', yaw=35)
    m.box('reventado_jugo', (rc[0] + 0.4, 2, rc[2] + 1.0), (2.8, 0.1, 1.2), 'podrido_dark', yaw=-30)
    # otro jitomate caido sobre el lomo, podrido y con moho
    fc = (2.8, 2, 2.6)
    m.box('caido', fc, (1.7, 1.3, 1.7), 'podrido_dark', yaw=25)
    m.box('caido_redondo', (fc[0], 2.15, fc[2]), (1.6, 0.95, 1.6), 'frijol_negro', yaw=70)
    m.box('caido_moho', (fc[0], 3.3, fc[2]), (1.1, 0.35, 1.1), 'moho_light', yaw=10)
    # moscas (lo unico que flota a proposito)
    mosca(m, 'mosca0', (-2.4, 5.4, 3.0), 20)
    mosca(m, 'mosca1', (2.6, 6.6, 3.4), -40)
    return m


ETAPAS = [('tomate_siembra', siembra), ('tomate_brote', brote), ('tomate_crecimiento', crecimiento),
          ('tomate_madurez', madurez), ('tomate_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
