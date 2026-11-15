"""Generador de la haba (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/haba.py

Haba (Vicia faba). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la base,
y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz (14x2x10)
y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Las alturas son cualitativas, no
medidas reales (la planta real mide de 0.5 a 1.8 m; aqui solo se respeta que sea la leguminosa mas
alta del juego, por debajo del maiz y el sorgo).

Rasgos que se respetan para no confundirla con el frijol, el chile y el sorgo: planta ERGUIDA y
rigida, con 1 o 2 tallos gruesos de seccion cuadrada (cajas sin girar), sin zarcillos; hoja
paripinnada de foliolos ovalados en pares, color glauco (gris verde), que sube pegada al tallo;
flores blancas con una mancha negra en las alas, chicas y metidas en las axilas; vainas gruesas y
carnosas que salen del tallo apuntando hacia arriba o hacia afuera y que maduran de abajo hacia
arriba hasta ennegrecerse; semilla grande y plana, verde palido a beige, con su hilo (una) oscuro.
La germinacion es hipogea: la semilla se queda en el suelo, el brote no saca cotiledones.
Colores de la paleta fija (haba_*, white, black, hoja_seca*, podrido*, moho*), sin colores nuevos.

Fuentes de forma (consultadas el 15/11):
- FAO Ecocrop, Vicia faba: https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=2146
- PROTA (Pl@ntUse), Vicia faba: https://uses.plantnet-project.org/en/Vicia_faba_(PROTA)
- GRDC GrowNote Faba Bean, fisiologia y etapas (vaina seca y negra al final):
  https://grdc.com.au/__data/assets/pdf_file/0025/369142/GrowNote-Faba-Bean-West-4-Physiology.pdf
- Go Botany, Vicia faba (hoja sin zarcillo, flor blanca con mancha negra):
  https://gobotany.nativeplanttrust.org/species/vicia/faba
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

HOJA = ('haba_hoja_dark', 'haba_hoja', 'haba_hoja_light')     # raquis, par de abajo, par de arriba
SECA = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca')
NEGRA = ('hoja_seca_dark', 'haba_vaina_negra', 'podrido_dark')  # hoja de haba muerta: se pone negra
VERDE = ('haba_vaina', 'haba_hoja_light')                     # vaina tierna: cuerpo y punta
MADURA = ('haba_vaina_negra', 'hoja_seca_dark')               # vaina madura seca, casi negra


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def foliolo(m, nombre, p, yaw, largo, col, caida=-8, ancho=None):
    """Foliolo ovalado que sale de p hacia yaw. caida > 0 baja la punta; < 0 la sube. 1 cubo.

    Gira alrededor de p (pivot): voxelkit ya mueve la caja con el giro, no se recalcula aqui."""
    w = ancho if ancho is not None else largo * 0.62
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (w, 0.3, largo), col, tilt=caida, yaw=yaw, pivot=p)


def hoja(m, nombre, base, yaw, raquis, pares, s, cols=HOJA, tilt_r=45, abre=55, caida=-10):
    """Hoja paripinnada: raquis corto que sube pegado al tallo y 1 o 2 pares de foliolos ovalados,
    sin zarcillo ni foliolo terminal. 1 + 2 * pares cubos. Devuelve la punta del raquis."""
    p = m.stem(nombre + '_raq', base, raquis, 0.35, cols[0], tilt=tilt_r, yaw=yaw)
    fracs = (1.0,) if pares == 1 else (0.45, 1.0)
    for j, f in enumerate(fracs):
        q = punta(base, raquis * f, tilt_r, yaw)
        col = cols[2] if j == 1 else cols[1]
        a = abre + (12 if j == 0 and pares > 1 else 0)
        for k, sg in enumerate((1, -1)):
            foliolo(m, f'{nombre}_f{j}{k}', q, yaw + sg * a, s * (0.9 if j == 0 and pares > 1 else 1.0), col,
                    caida)
    return p


def flor(m, nombre, c, yaw):
    """Flor de haba en la axila: estandarte blanco y las alas con su mancha negra a los lados. 2 cubos."""
    m.box(nombre, c, (0.8, 1.1, 1.0), 'white', yaw=yaw)
    m.box(nombre + '_mancha', (c[0], c[1] + 0.25, c[2]), (1.15, 0.5, 0.55), 'black', yaw=yaw)


def vaina(m, nombre, base, yaw, tilt, largo=3.4, grueso=1.2, cols=VERDE):
    """Vaina gruesa y carnosa que sale del tallo (tilt desde la vertical) con su punta afilada. 2 cubos."""
    q = m.stem(nombre, base, largo, grueso, cols[0], tilt=tilt, yaw=yaw)
    m.box(nombre + '_punta', q, (grueso * 0.55, 0.8, grueso * 0.55), cols[1], tilt=tilt + 20, yaw=yaw)
    return q


def tallo(m, segs, grueso, cols=('haba_hoja_dark', 'haba_hoja_dark', 'haba_hoja'), base=BASE, nombre='tallo'):
    """Tallo recto de seccion cuadrada (cajas sin girar), por segmentos. Devuelve las alturas de nudo."""
    x, y, z = base
    nudos = []
    for i, h in enumerate(segs):
        g = grueso * (1 - 0.08 * i)
        m.box(f'{nombre}{i}', (x, y, z), (g, h, g), cols[min(i, len(cols) - 1)])
        y += h
        nudos.append(y)
    return nudos


def yema(m, nombre, c, col='haba_hoja_light'):
    """Punta del tallo: hojitas nuevas cerradas hacia arriba (2 cubos)."""
    m.box(nombre + '_a', c, (0.7, 1.4, 0.5), col, tilt=-14, yaw=FRENTE)
    m.box(nombre + '_b', c, (0.6, 1.1, 0.5), 'haba_hoja', tilt=16, yaw=FRENTE + 30)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con tres habas grandes y planas (una muestra su hilo negro) y un terron. 8 cubos."""
    m = Model('haba_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (5.0, 0.3, 3.8), 'suelo_humedo')
    semillas = [((-1.3, 0.5), 25, (1.6, 0.6, 2.3)), ((1.2, -0.6), -40, (1.5, 0.6, 2.2)),
                ((0.6, 1.4), 80, (1.4, 0.55, 2.0))]
    for k, ((x, z), yaw, size) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), size, 'haba_semilla', yaw=yaw)
    # hilo (una) negro en el canto de la primera semilla, el rasgo de la haba seca
    m.box('semilla1_hilo', mover((-1.3, 2.9, 0.5), 25, 0.75), (0.3, 0.1, 0.8), 'black', yaw=25 + 90)
    m.box('terron', (-3.9, 2, -1.3), (1.4, 0.8, 1.2), 'soil_dark', yaw=-20)
    return m


def brote():
    """Plantula erguida: tallito cuadrado, 2 hojas glaucas de un par y la yema arriba. 12 cubos."""
    m = Model('haba_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.2, 0.3, 2.6), 'suelo_humedo')
    (y1,) = tallo(m, [3.8], 0.7, cols=('haba_hoja_dark',))
    # dos hojas alternas que suben pegadas al tallo, de lado a la camara para que se lean
    hoja(m, 'hoja0', (0, 3.6, 0), FRENTE + 90, 1.0, 1, 2.4, tilt_r=50, abre=52, caida=-16)
    hoja(m, 'hoja1', (0, 4.8, 0), FRENTE - 90, 1.0, 1, 2.3, tilt_r=45, abre=52, caida=-20)
    yema(m, 'yema', (0, y1, 0))
    return m


def crecimiento():
    """Tallo alto y cuadrado con 4 hojas glaucas que suben pegadas y 3 flores blancas de mancha negra. 28 cubos."""
    m = Model('haba_crecimiento', PAL)
    monticulo(m)
    nudos = tallo(m, [6.0, 5.5], 1.1)
    # hojas alternas en espiral: abajo las grandes de 2 pares, arriba las de 1 par
    hoja(m, 'hoja0', (0, 4.6, 0), FRENTE + 95, 2.2, 2, 2.9, tilt_r=55)
    hoja(m, 'hoja1', (0, 7.2, 0), FRENTE - 85, 2.0, 2, 2.8, tilt_r=50)
    hoja(m, 'hoja2', (0, 9.8, 0), FRENTE + 170, 1.4, 1, 2.6, tilt_r=40)
    hoja(m, 'hoja3', (0, 11.6, 0), FRENTE + 60, 1.2, 1, 2.3, tilt_r=35, caida=-18)
    # flores en las axilas, del lado de la camara
    flor(m, 'flor0', mover((0, 7.6, 0), FRENTE + 15, 0.95), FRENTE + 15)
    flor(m, 'flor1', mover((0, 9.6, 0), FRENTE - 40, 0.95), FRENTE - 40)
    flor(m, 'flor2', mover((0, 11.2, 0), FRENTE - 5, 0.9), FRENTE - 5)
    yema(m, 'yema', (0, nudos[-1], 0))
    return m


def madurez():
    """Dos tallos erguidos; vainas gruesas: abajo ya negras y de lado, arriba verdes hacia arriba;
    hojas de abajo secas y aun 2 flores en la punta. 57 cubos."""
    m = Model('haba_madurez', PAL)
    monticulo(m)
    nudos = tallo(m, [6.0, 6.0, 5.5], 1.3)
    # segundo tallo (hijo) desde la base, hacia atras para no tapar al principal
    hijo = (-1.0, 2, -0.9)
    m.stem('hijo', hijo, 11.0, 1.0, 'haba_hoja_dark', tilt=9, yaw=FRENTE + 180)
    # hojas de abajo ya secas y caidas
    hoja(m, 'seca0', (0, 4.4, 0), FRENTE + 100, 1.4, 1, 2.2, cols=SECA, tilt_r=75, caida=28)
    hoja(m, 'seca1', (0, 5.6, 0), FRENTE - 80, 1.4, 1, 2.1, cols=('hoja_seca_dark', 'hoja_seca', 'hoja_marchita'),
         tilt_r=70, caida=22)
    # vainas maduras abajo: negras, pesadas, salen de lado y se vencen un poco
    vaina(m, 'negra0', mover((0, 6.8, 0), FRENTE + 40, 0.6), FRENTE + 40, 100, 3.6, 1.35, MADURA)
    vaina(m, 'negra1', mover((0, 8.0, 0), FRENTE - 55, 0.6), FRENTE - 55, 95, 3.4, 1.3, MADURA)
    vaina(m, 'negra2', mover((0, 9.2, 0), FRENTE + 150, 0.6), FRENTE + 150, 85, 3.2, 1.3,
          ('haba_vaina_negra', 'haba_vaina'))
    # hojas glaucas de la mitad para arriba, mas bien hacia atras: las vainas quedan al frente
    hoja(m, 'hoja0', (0, 10.0, 0), FRENTE + 125, 2.2, 2, 2.9, tilt_r=55)
    hoja(m, 'hoja1', (0, 12.6, 0), FRENTE - 125, 2.0, 2, 2.8, tilt_r=50)
    hoja(m, 'hoja2', (0, 15.0, 0), FRENTE + 180, 1.6, 2, 2.5, tilt_r=42)
    hoja(m, 'hoja3', (0, 17.2, 0), FRENTE + 80, 1.2, 1, 2.3, tilt_r=35, caida=-18)
    hoja(m, 'hoja4', (0, 18.4, 0), FRENTE - 95, 1.0, 1, 2.0, tilt_r=30, caida=-20)
    # vainas tiernas arriba: verdes y gruesas, apuntando hacia arriba y afuera, del lado de la camara
    vaina(m, 'verde0', mover((0, 11.0, 0), FRENTE + 60, 0.65), FRENTE + 60, 42, 3.8, 1.35)
    vaina(m, 'verde1', mover((0, 12.4, 0), FRENTE - 50, 0.65), FRENTE - 50, 36, 3.6, 1.3)
    vaina(m, 'verde2', mover((0, 14.4, 0), FRENTE + 10, 0.65), FRENTE + 10, 28, 3.2, 1.25)
    # ultimas flores en la punta
    flor(m, 'flor0', mover((0, 16.4, 0), FRENTE - 20, 1.0), FRENTE - 20)
    flor(m, 'flor1', mover((0, 18.0, 0), FRENTE + 35, 0.9), FRENTE + 35)
    yema(m, 'yema', (0, nudos[-1], 0))
    # el hijo: una hoja glauca y una vaina verde
    hoja(m, 'hijo_hoja', punta(hijo, 8.5, 9, FRENTE + 180), FRENTE + 150, 1.4, 1, 2.4, tilt_r=45)
    vaina(m, 'hijo_vaina', punta(hijo, 6.5, 9, FRENTE + 180), FRENTE + 250, 38, 3.2, 1.25)
    # foliolo seco que ya cayo al lomo
    m.box('caido0', (3.2, 2, 2.4), (1.2, 0.3, 1.9), 'hoja_seca', yaw=30)
    return m


def podrida():
    """Desenlace de estres: tallo vencido y doblado, hojas negras, vainas podridas con moho, 2 moscas. 41 cubos."""
    m = Model('haba_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.4), (4.2, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.2), (0.5, 0.2, 3.2), 'suelo_grieta', yaw=-15)
    lado = 100    # hacia donde se vence (+x, de lado a la camara), sin salir de la huella
    # tallo: la parte baja aun de pie y ladeada; se dobla en un nudo y la punta cuelga
    q = m.stem('tallo0', BASE, 7.5, 1.2, 'hoja_seca_dark', tilt=22, yaw=lado)
    m.box('nudo', q, (1.3, 0.8, 1.3), 'podrido_dark', tilt=22, yaw=lado)
    r = m.stem('tallo1', q, 4.6, 1.0, 'podrido', tilt=128, yaw=lado)
    m.box('punta_negra', r, (0.8, 1.2, 0.8), 'haba_vaina_negra', tilt=150, yaw=lado)
    m.box('moho_base', BASE, (1.7, 1.0, 1.7), 'moho_dark')
    # hijo seco y cortado, con moho en el corte
    hijo = (-1.0, 2, -0.9)
    ph = m.stem('hijo', hijo, 4.4, 0.9, 'hoja_seca_dark', tilt=14, yaw=FRENTE + 180)
    m.box('hijo_moho', ph, (1.1, 0.4, 1.1), 'moho', tilt=14, yaw=FRENTE + 180)
    # hojas negras y secas que cuelgan del tallo
    hoja(m, 'hoja0', punta(BASE, 2.8, 22, lado), FRENTE - 90, 1.4, 1, 2.2, cols=NEGRA, tilt_r=80, caida=40)
    hoja(m, 'hoja1', punta(BASE, 5.0, 22, lado), FRENTE + 170, 1.4, 1, 2.2, cols=SECA, tilt_r=85, caida=45)
    hoja(m, 'hoja2', punta(q, 2.2, 128, lado), lado + 70, 1.0, 1, 2.0,
         cols=('hoja_seca_dark', 'haba_vaina_negra', 'haba_vaina_negra'), tilt_r=140, caida=50)
    hoja(m, 'hoja3', punta(hijo, 2.6, 14, FRENTE + 180), FRENTE + 230, 1.0, 1, 1.9, cols=NEGRA,
         tilt_r=85, caida=40)
    # vainas podridas: dos aun colgadas del tallo, ennegrecidas y con moho; las otras ya en el lomo
    b0 = punta(BASE, 6.2, 22, lado)
    vaina(m, 'vaina0', mover(b0, FRENTE - 20, 0.7), FRENTE - 20, 150, 3.0, 1.25, ('podrido_dark', 'podrido'))
    m.box('vaina0_moho', punta(mover(b0, FRENTE - 20, 0.7), 1.2, 150, FRENTE - 20), (1.5, 0.6, 1.4),
          'moho_light', tilt=150, yaw=FRENTE - 20)
    b1 = punta(BASE, 4.0, 22, lado)
    vaina(m, 'vaina1', mover(b1, FRENTE + 200, 0.7), FRENTE + 200, 135, 2.8, 1.2, ('haba_vaina_negra', 'podrido'))
    suelo = [((2.4, 2, 2.8), 70, 'podrido', 'moho'), ((-3.6, 2, 2.0), -20, 'haba_vaina_negra', 'moho_light'),
             ((-4.4, 2, -2.2), 40, 'podrido_dark', 'moho_dark')]
    for k, (c, yaw, col, moho) in enumerate(suelo):
        m.box(f'suelo_vaina{k}', c, (1.3, 1.0, 3.3), col, yaw=yaw)
        m.box(f'suelo_vaina{k}_moho', mover(c, yaw, 0.5, 1.0), (1.0, 0.35, 1.5), moho, yaw=yaw + 10)
    # semilla que se salio de una vaina abierta, podrida
    m.box('semilla0', (0.6, 2, 3.4), (1.1, 0.5, 1.5), 'podrido', yaw=20)
    # foliolos negros caidos
    caidas = [((-5.6, 1, 3.6), 'hoja_seca_dark', -60),
              ((5.6, 1, 3.8), 'podrido_dark', 15)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'foliolo_suelo{k}', c, (1.2, 0.3, 1.9), col, yaw=yaw)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(1.8, 6.0, 3.0, 20), (-2.6, 8.4, -1.6, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('haba_siembra', siembra), ('haba_brote', brote), ('haba_crecimiento', crecimiento),
          ('haba_madurez', madurez), ('haba_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
