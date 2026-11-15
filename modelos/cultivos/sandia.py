"""Generador de la sandia (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/sandia.py

Sandia (Citrullus lanatus), rastrera. Convenciones (docs/07): 1 celda = 16 unidades, origen en el
centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco
del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben en una huella de 16x16. Es una planta
BAJA: las guias corren a lo largo del lomo (eje x). Las alturas y tamanos son cualitativos, no
medidas reales.

Rasgos que se respetan (referencias: Kew POWO, NC State Extension, Flora of North America):
hoja pinnatifida, profundamente partida en 3 a 5 lobulos angostos con el central mas grande, verde
grisaceo (la calabaza, en cambio, tiene hojas anchas y enteras con manchas plateadas); zarcillos
ramificados; flores amarillas chicas (hasta ~3 cm) solitarias en las axilas, la femenina con un
ovario rayado; fruto ovalado con rayas oscuras a lo largo sobre verde claro y cascara gruesa blanca
bajo la pulpa roja con semillas negras. Fruto siempre al frente (+Z) para que las hojas no lo tapen.
Colores de la paleta (sandia_*, black, yellow y los marchitos compartidos), sin colores nuevos.
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas'))
sys.path.insert(0, os.path.join(AQUI, '..'))
sys.path.insert(0, AQUI)

from voxelkit import Model  # noqa: E402
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402
from maiz import monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)
from calabaza import mover, guia  # noqa: E402  (utilidades de la otra rastrera)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)

HOJA = ('sandia_hoja_dark', 'sandia_hoja', 'sandia_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')
GUIA = ('sandia_hoja_dark', 'sandia_hoja')
CASCARA = ('sandia_cascara_light', 'sandia_cascara_dark', 'sandia_cascara')   # base clara, rayas, extremos


# ---------------- utilidades ----------------
def hoja_sandia(m, nombre, base, yaw, pec, s, cols=HOJA, tilt_pec=62, tilt=82, pares=2):
    """Hoja pinnatifida: peciolo, lobulo central largo y angosto y 1 o 2 pares de lobulos laterales
    angostos separados por huecos (lo que la hace verse 'recortada'). 2 + 2 * pares cubos.

    tilt de la lamina: 90 = plana; menos de 90 la punta sube un poco (se lee mejor en isometrico)."""
    p = m.stem(nombre + '_pec', base, pec, 0.4, cols[0], tilt=tilt_pec, yaw=yaw)
    m.box(nombre + '_central', p, (s * 0.34, s, 0.35), cols[1], tilt=tilt, yaw=yaw)
    # pares de lobulos: el basal mas largo y abierto, el de arriba mas corto y hacia la punta
    lobulos = [(0.12, 0.55, 70, cols[0]), (0.48, 0.42, 44, cols[2])][:pares]
    for k, (u, largo, abre, col) in enumerate(lobulos):
        q = mover(p, yaw, s * u, -0.08)
        for j, lado in enumerate((1, -1)):
            m.box(f'{nombre}_lobulo{k}{j}', q, (s * 0.28, s * largo, 0.3), col, tilt=tilt, yaw=yaw + lado * abre)
    return p


def zarcillo(m, nombre, base, yaw, col='sandia_hoja_light'):
    """Zarcillo ramificado (2-fido): palito que se abre en dos rizos. 3 cubos."""
    q = m.stem(nombre, base, 1.2, 0.2, col, tilt=45, yaw=yaw)
    m.stem(nombre + '_rizo1', q, 0.9, 0.2, col, tilt=115, yaw=yaw + 110)
    m.stem(nombre + '_rizo2', q, 0.8, 0.2, col, tilt=70, yaw=yaw - 70)


def flor(m, nombre, base, yaw, ovario=False):
    """Flor chica amarilla: pedicelo, corola en estrella (dos cuadros girados) y, si es femenina,
    el ovario rayado (una sandia en miniatura) bajo la corola. 3 o 4 cubos."""
    p = m.stem(nombre + '_ped', base, 1.2, 0.25, 'sandia_hoja_dark', tilt=25, yaw=yaw)
    if ovario:
        m.box(nombre + '_ovario', p, (0.7, 0.6, 0.9), 'sandia_cascara', yaw=yaw)
        p = (p[0], p[1] + 0.6, p[2])
    m.box(nombre + '_corola', p, (1.4, 0.35, 1.4), 'yellow', yaw=yaw)
    m.box(nombre + '_corola2', (p[0], p[1] + 0.05, p[2]), (1.4, 0.35, 1.4), 'yellow', yaw=yaw + 45)
    return p


def fruto(m, nombre, c, L, H, W, yaw=0, cols=CASCARA, grande=True):
    """Sandia ovalada tumbada, eje largo en x local. Seccion octagonal: cuerpo alto y angosto, panza
    ancha y extremos redondeados; rayas oscuras a lo largo que asoman 0.06 por la tapa, los hombros y
    los costados. Todas las cajas giran juntas alrededor de c (centro de la base).
    9 cubos (grande) o 6 (chica: una raya arriba y sin rayas de hombro)."""
    x, y, z = c

    def caja(n, dx, dy, dz, size, col):
        m.box(f'{nombre}_{n}', (x + dx, y + dy, z + dz), size, col, yaw=yaw, pivot=c)

    caja('cuerpo', 0, 0, 0, (L, H, W * 0.7), cols[0])
    caja('panza', 0, H * 0.2, 0, (L, H * 0.6, W), cols[0])
    caja('extremos', 0, H * 0.22, 0, (L + 1.0, H * 0.56, W * 0.56), cols[2])
    for k, dz in enumerate((-0.17 * W, 0.17 * W) if grande else (0.0,)):
        caja(f'raya_arriba{k}', 0, 0, dz, (L - 0.4, H + 0.12, 0.6), cols[1])
    if grande:
        for k, lado in enumerate((1, -1)):
            caja(f'raya_hombro{k}', 0, H * 0.2, lado * 0.43 * W, (L - 0.4, H * 0.6 + 0.12, 0.6), cols[1])
    caja('raya_lado', 0, H * 0.36, 0, (L - 0.4, 0.6, W + 0.12), cols[1])
    caja('pedunculo', -(L / 2 + 0.8), H * 0.42, 0, (0.6, 0.4, 0.4), 'sandia_hoja_dark')


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: hoyo, tres semillas negras planas y terrones. 10 cubos (8 mas el lomo)."""
    m = Model('sandia_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (6.4, 0.12, 4.2), 'soil', yaw=12)
    m.box('surco', (0, 2, -0.9), (5.0, 0.18, 0.9), 'suelo_humedo', yaw=12)
    # semillas planas ovaladas de sandia, de canto bajo, una medio tapada
    m.box('semilla1', (-1.3, 2.12, 0.5), (1.4, 0.3, 0.9), 'black', yaw=30)
    m.box('semilla2', (0.9, 2.12, -0.1), (1.4, 0.3, 0.9), 'black', yaw=-35)
    m.box('semilla3', (0.2, 2.12, 1.4), (1.3, 0.3, 0.8), 'black', yaw=75)
    m.box('tapado', (0.6, 2.12, 1.7), (0.9, 0.4, 0.8), 'soil_dark', yaw=60)
    m.box('terron1', (3.4, 2, 1.6), (1.5, 0.9, 1.3), 'soil_dark', yaw=25)
    m.box('terron2', (-3.6, 2, -1.4), (1.3, 0.8, 1.1), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito, dos cotiledones ovalados lisos y la primera hoja ya lobulada. 11 cubos (9 mas el lomo)."""
    m = Model('sandia_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.25, 2.4), 'suelo_humedo')
    m.box('tallito', BASE, (0.7, 2.4, 0.7), 'sandia_hoja_light')
    eje = 110
    for k, lado in enumerate((0, 180)):
        c = mover((0, 4.2, 0), eje + lado, 1.2)
        m.box(f'cotiledon{k}', c, (1.5, 0.4, 2.6), ('sandia_hoja_light', 'sandia_hoja')[k], tilt=-12, yaw=eje + lado)
    # primera hoja verdadera: chica, ya partida en lobulos (1 par), saliendo entre los cotiledones
    hoja_sandia(m, 'hoja1', (0, 4.4, 0), eje + 90, 1.0, 3.0, tilt_pec=25, tilt=65, pares=1)
    m.box('testa', (1.8, 2, 1.0), (1.1, 0.25, 0.7), 'black', yaw=25)
    return m


def crecimiento():
    """Planta vegetativa: corona, dos guias por el lomo con hojas recortadas, zarcillo ramificado y dos
    flores amarillas chicas (una femenina con ovario rayado). 30 cubos con el lomo."""
    m = Model('sandia_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.2, 1.2, 1.2), 'sandia_hoja_dark')
    top = (0, 3.2, 0)
    hoja_sandia(m, 'hoja0', top, 200, 1.6, 4.6)
    # guias rastreras: una a la derecha (+x) con dos tramos y otra a la izquierda (-x), sobre el lomo
    raiz_izq = (-0.4, 2.3, 0.2)
    der = guia(m, 'guia_der', (0.4, 2.3, 0.2), [(2.6, 75, 92), (2.6, 100, 90)], grueso=0.5, cols=GUIA)
    izq = guia(m, 'guia_izq', raiz_izq, [(4.6, 262, 91)], grueso=0.5, cols=GUIA)
    hoja_sandia(m, 'hoja1', der[0], 145, 1.0, 3.8, tilt_pec=55, pares=1)
    hoja_sandia(m, 'hoja2', mover(raiz_izq, 262, 2.4), 215, 1.0, 3.8, tilt_pec=55, pares=1)
    zarcillo(m, 'zarcillo', der[1], 40)
    flor(m, 'flor1', der[1], 20)
    flor(m, 'flor2', izq[0], 340, ovario=True)
    return m


def madurez():
    """Planta adulta: guias largas con 5 hojas recortadas, zarcillo, una flor y dos sandias al frente
    (una grande ovalada y una chica), con rayas oscuras sobre verde claro. 55 cubos con el lomo."""
    m = Model('sandia_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.4, 1.4, 1.4), 'sandia_hoja_dark')
    top = (0, 3.4, 0)
    # hojas hacia atras y a los lados: el frente queda libre para la fruta
    hoja_sandia(m, 'hoja0', top, 180, 1.8, 5.0)
    hoja_sandia(m, 'hoja1', top, 240, 1.6, 4.6)
    hoja_sandia(m, 'hoja2', top, 120, 1.6, 4.6)
    der = guia(m, 'guia_der', (0.5, 2.3, 0.0), [(2.6, 80, 92), (2.0, 105, 90), (1.2, 150, 92)], grueso=0.55,
               cols=GUIA)
    izq = guia(m, 'guia_izq', (-0.5, 2.3, 0.0), [(3.0, 265, 92), (2.4, 290, 90)], grueso=0.55, cols=GUIA)
    hoja_sandia(m, 'hoja3', der[1], 195, 1.0, 3.6, pares=1)
    hoja_sandia(m, 'hoja4', izq[0], 210, 1.0, 3.6, pares=1)
    zarcillo(m, 'zarcillo', izq[1], 300)
    flor(m, 'flor', der[2], 40)
    # frutos apoyados en el borde frontal del lomo
    fruto(m, 'sandia1', (-1.4, 1.0, 2.8), 7.2, 4.0, 4.8, yaw=12)
    fruto(m, 'sandia2', (3.6, 1.0, 3.4), 3.6, 2.6, 2.8, yaw=-40, grande=False)
    return m


def podrida():
    """Desenlace de estres: hojas secas caidas, guias quebradas y la sandia hundida y partida a lo largo
    con la pulpa oscurecida, moho, semillas sueltas y moscas. 56 cubos con el lomo."""
    m = Model('sandia_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, -1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.6), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('corona', BASE, (1.3, 1.0, 1.3), 'podrido')
    m.box('moho_corona', (0, 3.0, 0), (1.0, 0.35, 1.0), 'moho_dark')
    top = (0, 2.8, 0)
    # hojas secas, aplastadas a ras del lomo
    hoja_sandia(m, 'hoja0', top, 185, 1.6, 4.6, cols=SECA, tilt_pec=95, tilt=96)
    hoja_sandia(m, 'hoja1', top, 245, 1.4, 4.0, cols=('hoja_seca_dark', 'podrido', 'hoja_seca'), tilt_pec=100,
                tilt=95, pares=1)
    hoja_sandia(m, 'hoja2', top, 120, 1.4, 4.2, cols=('podrido_dark', 'hoja_seca_dark', 'hoja_seca_light'),
                tilt_pec=100, tilt=94)
    # guias secas y quebradas
    der = guia(m, 'guia_der', (0.4, 2.0, 0.0), [(3.0, 80, 91), (2.2, 115, 92)], grueso=0.45,
               cols=('hoja_seca_dark', 'hoja_seca'))
    izq = guia(m, 'guia_izq', (-0.4, 2.0, 0.0), [(2.8, 270, 91)], grueso=0.45, cols=('hoja_seca', 'hoja_seca_dark'))
    m.box('guia_quiebre', der[0], (0.7, 0.5, 0.7), 'podrido_dark')
    m.box('zarcillo_seco', izq[0], (0.2, 1.0, 0.2), 'hoja_seca_dark', tilt=65, yaw=300)
    # hojas sueltas caidas fuera del lomo
    m.box('hoja_suelo1', (-6.0, 0, -3.6), (1.4, 0.25, 3.0), 'hoja_seca', yaw=55)
    m.box('hoja_suelo2', (5.8, 0, -3.4), (1.2, 0.25, 2.6), 'hoja_seca_dark', yaw=-40)
    # sandia hundida y partida a lo largo: dos mitades que se abren y dejan ver la pulpa podrida
    c, L, H, W, yaw = (-1.2, 1.0, 2.6), 7.2, 2.4, 5.4, 12

    def caja(n, dx, dy, dz, size, col, tilt=0):
        m.box(f'sandia_{n}', (c[0] + dx, c[1] + dy, c[2] + dz), size, col, tilt=tilt, yaw=yaw, pivot=c)

    caja('pulpa', 0, 0, 0, (L - 1.0, H - 0.3, 2.0), 'podrido')
    caja('pulpa_roja', -L * 0.25, H - 0.3, 0, (2.0, 0.25, 1.4), 'sandia_pulpa')
    caja('pulpa_negra', L * 0.18, H - 0.3, 0, (2.6, 0.25, 1.2), 'podrido_dark')
    for k, lado in enumerate((1, -1)):
        t = lado * 16
        caja(f'mitad{k}', 0, 0, lado * W * 0.175, (L, H, W * 0.35), 'sandia_cascara', tilt=t)
        caja(f'mitad{k}_panza', 0, H * 0.2, lado * W / 4, (L, H * 0.6, W / 2), 'sandia_cascara', tilt=t)
        caja(f'mitad{k}_raya', 0, 0, lado * W * 0.2, (L - 0.4, H + 0.12, 0.6), 'sandia_cascara_dark', tilt=t)
        caja(f'mitad{k}_raya_lado', 0, H * 0.36, lado * W / 4, (L - 0.4, 0.6, W / 2 + 0.12), 'sandia_cascara_dark',
             tilt=t)
        caja(f'mitad{k}_corteza', 0, H - 0.05, lado * 0.3, (L - 0.3, 0.2, 0.6), 'sandia_corteza', tilt=t)
    caja('moho1', -L * 0.28, H - 0.1, W * 0.2, (2.2, 0.4, 1.2), 'moho_light', tilt=16)
    caja('moho2', L * 0.3, H - 0.1, -W * 0.2, (1.8, 0.4, 1.0), 'moho', tilt=-16)
    caja('moho3', L / 2 - 0.2, 0.3, 0, (0.8, 1.4, 2.4), 'moho_dark')
    caja('lesion', -L * 0.1, H * 0.15, W * 0.25, (2.6, H * 0.7, W / 2 + 0.25), 'podrido', tilt=16)
    caja('pedunculo', -(L / 2 + 0.3), H * 0.45, 0, (0.6, 0.4, 0.4), 'hoja_seca_dark')
    for k, (dx, dz) in enumerate([(-0.4, 0.3), (1.0, -0.3)]):
        caja(f'semilla{k}', dx, H - 0.05, dz, (0.6, 0.15, 0.4), 'black')
    # escurrimiento oscuro junto a la fruta y semillas regadas en el lomo
    m.box('escurrido', (2.4, 2, 1.6), (2.4, 0.12, 1.6), 'podrido_dark', yaw=20)
    m.box('semilla_suelo1', (2.8, 2, 0.6), (0.7, 0.2, 0.45), 'black', yaw=30)
    m.box('semilla_suelo2', (3.6, 2, 2.0), (0.7, 0.2, 0.45), 'black', yaw=-50)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.8, 6.4, 3.0, 20), (-4.2, 5.4, 1.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('sandia_siembra', siembra), ('sandia_brote', brote), ('sandia_crecimiento', crecimiento),
          ('sandia_madurez', madurez), ('sandia_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
