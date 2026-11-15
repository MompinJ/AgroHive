"""Generador del algodon (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/algodon.py

Algodon americano (Gossypium hirsutum, tipo upland). Convenciones (docs/07): 1 celda = 16 unidades,
origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el
lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16.
Las alturas y tamanos son cualitativos, no medidos (solo se respeta que sea un arbusto mas alto que
el chile y que la capsula abierta sea grande respecto a la hoja, para que se lea a 20 px).

Rasgos que se respetan para no confundirlo con el chile y la yuca:
- ARBUSTO PIRAMIDAL: tallo principal recto (monopodial) y ramas fruteras (simpodiales) casi
  horizontales, largas abajo y cortas arriba; cada rama termina en su flor o capsula.
- Hoja ANCHA PALMEADA de 3 a 5 lobulos triangulares (aqui 3 lobulos en abanico desde el peciolo; la
  yuca tiene lobulos angostos y largos en peciolo rojo, el chile hoja entera lanceolada).
- Plantula con 2 cotiledones anchos (arrinonados) y luego la primera hoja palmeada.
- Flor grande en copa, crema a amarillo palido, con columna de estambres al centro.
- Bellota (capsula) verde ovoide con punta, sentada sobre sus bracteas.
- Al madurar la capsula se seca cafe y se ABRE en 3-5 gajos mostrando MOTAS de fibra blanca
  esponjosa: es lo que define al algodon y por eso las motas son grandes y estan por toda la planta.
  En madurez las hojas se ponen rojizas o secas y quedan pocas.
- Podrida: arbusto seco y vencido, motas grises y sucias (moho), capsulas cerradas podridas y moscas.
Colores de la paleta fija, sin colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- Ramas vegetativas monopodiales abajo y fruteras simpodiales arriba, cada unidad con capsula
  terminal y hoja opuesta, lo que da la planta piramidal:
  https://www.cotton.org/journal/2007-11/4/upload/jcs11-242.pdf
- Hoja de 3-5 lobulos anchos triangulares, corola crema a amarillo palido que se vuelve rosa con la
  edad, bracteas (involucelo) cordadas y laciniadas persistentes, capsula ovoide o subglobosa de
  3-5 lojas, semilla con pelusa (comosa): https://efloramex.ib.unam.mx/cdm_dataportal/taxon/4e3a8a62-c93d-4742-9f30-4f0d2f8b008e ,
  https://florida.plantatlas.usf.edu/genus/559 y https://floranorthamerica.org/Gossypium
- Etapas (cotiledones, primera hoja verdadera, botones, flor, capsula abierta):
  https://en.wikipedia.org/wiki/BBCH-scale_(cotton) y https://cropscience.bayer.us/articles/dad/cotton-growth-and-development
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
PLANO = 125           # de lado a la camara: ahi abren las ramas bajas para que se lea la piramide

HOJA = ('algodon_hoja', 'leaf_dark', 'leaf')                 # lobulo central, laterales, luz
HOJA_BAJA = ('leaf_dark', 'chile_hoja_dark', 'algodon_hoja')
ROJIZA = ('cabello', 'chile_rojo_dark', 'hoja_marchita')     # hoja vieja que se enrojece
MARCHITA = ('hoja_marchita', 'hoja_seca', 'hoja_seca_light')
SECA = ('hoja_seca', 'hoja_seca_dark', 'hoja_seca_light')
PODRIDA = ('hoja_seca_dark', 'podrido', 'hoja_seca')

FIBRA = ('algodon_capsula_seca', 'algodon_fibra', 'white')   # gajos, mota, lobulo de la mota
SUCIA = ('podrido_dark', 'moho_light', 'moho')               # mota podrida, gris y sucia


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def lobulo(m, nombre, p, yaw, largo, ancho, col, caida):
    """Lamina plana que sale de p hacia yaw y gira sobre p (caida > 0 baja la punta). 1 cubo."""
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (ancho, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)


def hoja(m, nombre, p, yaw, largo, cols=HOJA, caida=10, abre=48, lobulos=3):
    """Hoja palmeada: lobulo central largo y laterales en abanico desde el peciolo. 3 (o 2) cubos.

    Los lobulos se traslapan en la base, asi la hoja se lee ancha con muescas entre lobulos."""
    lobulo(m, nombre, p, yaw, largo, largo * 0.6, cols[0], caida)
    lados = (-1, 1) if lobulos >= 3 else (1,)
    for k, s in enumerate(lados):
        lobulo(m, f'{nombre}_l{k}', (p[0], p[1] + 0.03 * (k + 1), p[2]), yaw + s * abre, largo * 0.8,
               largo * 0.5, cols[1 + k % 2], caida + 4)


def flor(m, nombre, c, cols=('algodon_flor', 'algodon_flor', 'grano_light')):
    """Flor grande en copa: caliz-copa, petalos abiertos a 45 grados y columna de estambres. 3 cubos."""
    m.box(nombre, c, (1.5, 1.2, 1.5), cols[0], yaw=45)
    m.box(nombre + '_petalos', (c[0], c[1] + 1.0, c[2]), (2.3, 0.45, 2.3), cols[1], yaw=20)
    m.box(nombre + '_estambres', (c[0], c[1] + 1.1, c[2]), (0.55, 0.65, 0.55), cols[2], yaw=20)


def bellota(m, nombre, c, yaw=0, escala=1.0):
    """Capsula verde ovoide con punta, sentada sobre sus bracteas. 3 cubos."""
    s = escala
    m.box(nombre + '_bracteas', c, (1.9 * s, 0.7 * s, 1.9 * s), 'leaf_dark', yaw=yaw + 45)
    m.box(nombre, (c[0], c[1] + 0.3 * s, c[2]), (1.5 * s, 1.9 * s, 1.5 * s), 'algodon_bellota', yaw=yaw)
    m.box(nombre + '_punta', (c[0], c[1] + 2.2 * s, c[2]), (0.7 * s, 0.6 * s, 0.7 * s), 'calabaza_fruto', yaw=yaw)


def mota(m, nombre, c, yaw=0, escala=1.0, cols=FIBRA, gajo=False):
    """Capsula seca abierta con su mota de fibra: estrella de gajos cafes y mota esponjosa en dos
    volumenes cruzados (uno mas chico y girado encima). 3 cubos (4 con un gajo levantado).

    c es el centro de la cara inferior de los gajos (donde remata la rama)."""
    s = escala
    m.box(nombre + '_gajos', c, (2.5 * s, 0.6 * s, 2.5 * s), cols[0], yaw=yaw + 45)
    m.box(nombre, (c[0], c[1] + 0.3 * s, c[2]), (2.1 * s, 1.5 * s, 2.1 * s), cols[1], yaw=yaw)
    m.box(nombre + '_copete', (c[0], c[1] + 1.5 * s, c[2]), (1.6 * s, 0.9 * s, 1.6 * s), cols[2], yaw=yaw + 45)
    if gajo:
        # un gajo de la capsula que se abre hacia afuera, como petalo cafe
        p = mover(c, yaw + 45, 1.0 * s, 0.4 * s)
        lobulo(m, nombre + '_gajo', p, yaw + 45, 1.3 * s, 0.9 * s, cols[0], -40)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: hoyo con 3 semillas oscuras envueltas en pelusa blanca. 12 cubos (con el lomo)."""
    m = Model('algodon_siembra', PAL)
    monticulo(m)
    m.box('humedad', (0, 2, 0), (8.0, 0.15, 4.4), 'soil_dark')
    m.box('hoyo', (0, 2.15, 0), (4.4, 0.2, 3.0), 'suelo_humedo')
    semillas = [((-1.1, 0.3), 25), ((1.0, -0.5), -30), ((0.2, 0.95), 70)]
    for k, ((x, z), yaw) in enumerate(semillas):
        m.box(f'pelusa{k + 1}', (x, 2.35, z), (1.4, 0.85, 1.6), 'algodon_fibra', yaw=yaw)
        # la semilla oscura asoma por una punta de su pelusa
        m.box(f'semilla{k + 1}', mover((x, 2.7, z), yaw, 0.6), (0.6, 0.6, 0.8), 'wood_dark', yaw=yaw)
    m.box('terron1', (3.7, 2, 1.3), (1.5, 0.9, 1.3), 'soil_dark', yaw=30)
    m.box('terron2', (-3.8, 2, -1.1), (1.3, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito, 2 cotiledones anchos arrinonados y la primera hoja palmeada asomando. 11 cubos."""
    m = Model('algodon_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.3, 2.6), 'suelo_humedo')
    m.box('tallito', BASE, (0.6, 3.4, 0.6), 'wood')
    top = (0, 5.4, 0)
    for k, s in enumerate((1, -1)):
        yaw = PLANO + (0 if s > 0 else 180)
        m.box(f'cotiledon{k}', (top[0], top[1], top[2] + 1.3), (2.4, 0.3, 2.2),
              ('leaf', 'algodon_hoja')[k], tilt=-12, yaw=yaw, pivot=top)
    # primera hoja verdadera, chica y palmeada, encima de los cotiledones y hacia la camara
    m.box('peciolo', top, (0.35, 1.6, 0.35), 'maiz_tallo', tilt=20, yaw=FRENTE)
    hoja(m, 'hoja0', punta(top, 1.6, 20, FRENTE), FRENTE, 2.6, HOJA, caida=-8, abre=45)
    m.box('pelusa_suelo', (1.7, 2, 0.9), (0.9, 0.4, 0.9), 'algodon_fibra', yaw=25)
    return m


def crecimiento():
    """Arbusto joven: tallo recto, dos ramas fruteras, 4 hojas palmeadas, 2 flores crema, una bellota
    verde y un boton. 29 cubos."""
    m = Model('algodon_crecimiento', PAL)
    monticulo(m)
    cima = m.stem('tallo', BASE, 9.0, 0.8, 'wood', tilt=0, yaw=0)
    m.box('cogollo', cima, (0.9, 1.0, 0.9), 'leaf', yaw=20)
    # ramas fruteras casi horizontales: cada una remata en su flor (crecimiento simpodial)
    ramas = [m.stem(f'rama{k}', (0, 5.4, 0), 3.8, 0.55, 'wood', tilt=66, yaw=PLANO + 180 * k)
             for k in range(2)]
    for k, r in enumerate(ramas):
        flor(m, f'flor{k}', (r[0], r[1] - 0.2, r[2]))
    # hojas palmeadas: una grande abajo al fondo, una en cada rama y una arriba
    hoja(m, 'hoja0', (0, 4.0, 0), FRENTE + 15, 4.0, HOJA_BAJA, caida=8)
    hoja(m, 'hoja1', mover(ramas[0], PLANO + 180, 1.8, -1.0), FRENTE + 70, 3.6, HOJA, caida=6)
    hoja(m, 'hoja2', mover(ramas[1], PLANO, 1.8, -1.0), FRENTE - 75, 3.6, HOJA, caida=6)
    hoja(m, 'hoja3', (0, 8.6, 0), FRENTE + 160, 3.2, HOJA, caida=0, abre=44)
    # bellota verde en un nudo del tallo hacia la camara y boton (cuadro) mas arriba
    bellota(m, 'bellota0', mover((0, 7.0, 0), FRENTE, 1.3), yaw=15, escala=0.8)
    m.box('pedunculo0', (0, 7.0, 0), (0.35, 1.5, 0.35), 'maiz_tallo', tilt=60, yaw=FRENTE)
    m.box('boton', mover((0, 9.6, 0), FRENTE - 40, 0.9), (0.9, 1.0, 0.9), 'leaf_dark', yaw=45)
    return m


def madurez():
    """Arbusto piramidal a punto de pizca: pocas hojas rojizas o secas y 7 capsulas cafes abiertas con
    sus motas blancas por toda la planta. 52 cubos."""
    m = Model('algodon_madurez', PAL)
    monticulo(m)
    medio = m.stem('tallo', BASE, 6.0, 1.0, 'wood_dark', tilt=0, yaw=0)
    cima = m.stem('tallo_alto', medio, 7.2, 0.8, 'wood', tilt=0, yaw=0)
    # ramas fruteras en espiral: largas abajo, cortas arriba (piramide)
    niveles = [(4.6, PLANO, 5.0, 74), (4.6, PLANO + 180, 5.0, 74),
               (8.0, FRENTE - 10, 3.8, 70), (8.0, FRENTE + 175, 3.8, 70),
               (11.0, PLANO + 50, 2.6, 62), (11.0, PLANO + 230, 2.4, 62)]
    puntas = []
    for k, (y, yaw, largo, tilt) in enumerate(niveles):
        puntas.append(m.stem(f'rama{k}', (0, y, 0), largo, 0.55 if k < 4 else 0.45, 'wood', tilt=tilt, yaw=yaw))
    # motas en las puntas de las ramas, en la cima y una en el nudo de una rama baja
    for k, p in enumerate(puntas):
        if k == 5:
            continue          # rama alta de atras: lleva hoja, no mota
        mota(m, f'mota{k}', (p[0], p[1] - 0.2, p[2]), yaw=15 * k, escala=1.15 if k < 4 else 0.95,
             gajo=k in (0, 2))
    mota(m, 'mota_cima', (cima[0], cima[1] - 0.3, cima[2]), yaw=10, escala=1.0)
    mota(m, 'mota_nudo', mover((0, 4.6, 0), PLANO + 180, 2.6, 0.4), yaw=30, escala=0.9)
    # pocas hojas: rojizas, marchitas o secas, opuestas a las capsulas
    hoja(m, 'hoja0', (0, 3.6, 0), FRENTE + 10, 4.0, ROJIZA, caida=10)
    hoja(m, 'hoja1', (0, 6.6, 0), FRENTE + 100, 3.6, MARCHITA, caida=18)
    hoja(m, 'hoja2', (0, 9.6, 0), FRENTE - 100, 3.2, ROJIZA, caida=14)
    hoja(m, 'hoja3', puntas[5], PLANO + 230, 2.6, HOJA, caida=10, abre=44)
    hoja(m, 'hoja4', (0, 5.6, 0), FRENTE + 200, 3.6, SECA, caida=34)
    hoja(m, 'hoja5', (0, 12.0, 0), FRENTE + 60, 2.6, MARCHITA, caida=8, abre=44)
    # mota que se cayo al lomo
    m.box('mota_suelo', (3.0, 2, 2.2), (1.4, 0.8, 1.2), 'algodon_fibra', yaw=30)
    return m


def podrida():
    """Desenlace de estres: arbusto seco y vencido hacia un lado, hojas cafes colgando, motas grises
    con moho, capsulas cerradas podridas, desechos en el suelo y 2 moscas. 48 cubos."""
    m = Model('algodon_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.9, 2, 1.3), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.5), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    # tallo ladeado que se quiebra a media altura; la parte alta cae hacia un lado
    lado = PLANO - 15
    medio = m.stem('tallo', BASE, 5.6, 1.0, 'hoja_seca_dark', tilt=12, yaw=lado)
    m.box('moho_base', BASE, (1.4, 1.1, 1.4), 'moho_dark', tilt=12, yaw=lado)
    m.box('quiebre', medio, (1.2, 0.7, 1.2), 'podrido_dark', tilt=12, yaw=lado)
    cima = m.stem('tallo_alto', medio, 4.4, 0.8, 'hoja_seca', tilt=58, yaw=lado)
    # ramas secas que cuelgan (la piramide se vencio)
    ramas = [m.stem('rama0', (0, 4.4, 0), 4.0, 0.5, 'hoja_seca_dark', tilt=100, yaw=lado + 180),
             m.stem('rama1', (0.3, 5.8, 0.1), 3.4, 0.5, 'wood_dark', tilt=95, yaw=FRENTE + 10),
             m.stem('rama2', medio, 2.8, 0.45, 'hoja_seca_dark', tilt=110, yaw=FRENTE + 160)]
    # motas grises y sucias, una con moho verde encima
    mota(m, 'mota0', (ramas[0][0], ramas[0][1] - 1.2, ramas[0][2]), yaw=20, escala=0.9, cols=SUCIA)
    mota(m, 'mota1', (ramas[1][0], ramas[1][1] - 1.1, ramas[1][2]), yaw=-10, escala=0.85, cols=SUCIA)
    mota(m, 'mota2', (cima[0], cima[1] - 1.0, cima[2]), yaw=40, escala=0.8, cols=SUCIA)
    mota(m, 'mota3', mover(medio, lado, 0.9, -0.6), yaw=5, escala=0.75, cols=('podrido', 'moho', 'moho_dark'))
    m.box('mota0_moho', (ramas[0][0], ramas[0][1] + 0.3, ramas[0][2]), (1.1, 0.4, 1.1), 'moho_dark', yaw=60)
    # capsulas cerradas que se pudrieron sin abrir, colgando
    for k, (b, cols) in enumerate([(ramas[2], ('podrido_dark', 'frijol_negro')),
                                   (mover((0, 7.0, 0), FRENTE - 30, 0.8), ('podrido', 'podrido_dark'))]):
        c = (b[0], b[1] - 1.8, b[2])
        m.box(f'capsula{k}', c, (1.3, 1.7, 1.3), cols[0], yaw=20 * k)
        m.box(f'capsula{k}_moho', (c[0], c[1] - 0.2, c[2]), (1.0, 0.5, 1.0), 'moho', yaw=45)
    # hojas cafes colgando, enrolladas (casi verticales)
    hoja(m, 'hoja0', (0, 3.4, 0), FRENTE + 20, 2.8, SECA, caida=70)
    hoja(m, 'hoja1', medio, lado + 120, 2.6, PODRIDA, caida=75, lobulos=2)
    hoja(m, 'hoja2', cima, lado + 40, 2.4, MARCHITA, caida=80, lobulos=2)
    hoja(m, 'hoja3', (0.3, 5.8, 0.1), FRENTE + 200, 2.6, PODRIDA, caida=68)
    # desechos en el lomo y en el suelo: hojas caidas y una mota sucia
    caidas = [((3.2, 2, -1.7), 'hoja_seca', 20), ((-5.6, 1, -3.6), 'hoja_seca_light', 60),
              ((5.6, 1, 3.8), 'hoja_marchita', 10), ((-5.4, 1, 3.6), 'podrido', -50)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'hoja_suelo{k}', c, (1.8, 0.3, 1.8), col, yaw=yaw)
    m.box('mota_suelo', (-2.2, 2, 2.3), (1.6, 0.8, 1.3), 'moho_light', yaw=-25)
    m.box('mota_suelo_moho', (-2.2, 2.8, 2.3), (0.9, 0.3, 0.8), 'moho_dark', yaw=10)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.8, 8.4, 3.0, 20), (2.8, 5.4, 3.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('algodon_siembra', siembra), ('algodon_brote', brote), ('algodon_crecimiento', crecimiento),
          ('algodon_madurez', madurez), ('algodon_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
