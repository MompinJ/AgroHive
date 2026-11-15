"""Generador del melon (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/melon.py

Melon reticulado tipo cantaloupe (Cucumis melo, grupo reticulatus), rastrero. Convenciones (docs/07):
1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas
las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben
en una huella de 16x16. Es una planta BAJA: las guias corren por el lomo y las hojas se levantan
poco. Las alturas y tamanos son cualitativos, no medidas reales.

Rasgos que se respetan (referencias: NC State Extension Plant Toolbox, PROTA / Pl@ntUse, NParks
Flora & Fauna Web, Go Botany):
- hoja redondeada a reniforme, entera o apenas lobulada (3 a 5 lobulos someros), con nervadura
  palmada: aqui es una lamina casi circular (dos cajas en cruz = octagono) con su nervio claro.
  La sandia, en cambio, tiene la hoja partida en lobulos angostos y la calabaza, lobulos y manchas
  plateadas.
- zarcillos SIMPLES (sin ramificar), a diferencia de la sandia.
- flores amarillas chicas en las axilas (las masculinas en grupitos).
- fruto redondo u ovalado corto con la cascara beige verdosa cubierta por una red corchosa clara
  (reticulado) y gajos (suturas) marcados de polo a polo; pulpa naranja salmon con la cavidad de
  semillas crema al centro.
El fruto va siempre al frente (+Z) para que las hojas no lo tapen.
Colores de la paleta (melon_*, calabaza_hoja*, leaf_light, yellow, calabaza_crema y los marchitos
compartidos), sin colores nuevos. Las suturas usan vaina_dark (verde oliva) y la cavidad del fruto
partido calabaza_naranja.
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
from calabaza import mover, guia, zarcillo  # noqa: E402  (utilidades de la otra rastrera)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)

HOJA = ('calabaza_hoja_dark', 'calabaza_hoja', 'calabaza_hoja_light')
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_marchita')
GUIA = ('calabaza_hoja_dark', 'calabaza_hoja')
FRUTO = ('melon_cascara', 'melon_red', 'vaina_dark')      # cascara, red clara, suturas (gajos)


# ---------------- utilidades ----------------
def hoja_redonda(m, nombre, base, yaw, pec, s, cols=HOJA, tilt_pec=55, tilt=-8, nervio=True):
    """Hoja redondeada de melon: peciolo, lamina casi circular (dos cajas en cruz forman un octagono)
    y nervio central claro. La lamina se sienta con el peciolo en su borde (base acorazonada).
    3 o 4 cubos."""
    p = m.stem(nombre + '_pec', base, pec, 0.4, cols[0], tilt=tilt_pec, yaw=yaw)
    c = mover(p, yaw, s * 0.42, -0.15)
    m.box(nombre + '_lamina', c, (s, 0.35, s * 0.7), cols[1], tilt=tilt, yaw=yaw)
    m.box(nombre + '_lamina2', c, (s * 0.7, 0.35, s), cols[1], tilt=tilt, yaw=yaw)
    if nervio:
        m.box(nombre + '_nervio', c, (0.3, 0.45, s * 0.78), cols[2], tilt=tilt, yaw=yaw)
    return c


def flor(m, nombre, base, yaw, h=1.1):
    """Flor chica amarilla: pedicelo y corola de cinco puntas (dos cuadros girados). 3 cubos."""
    p = m.stem(nombre + '_ped', base, h, 0.25, 'calabaza_hoja_dark', tilt=25, yaw=yaw)
    m.box(nombre + '_corola', p, (1.3, 0.3, 1.3), 'yellow', yaw=yaw)
    m.box(nombre + '_corola2', (p[0], p[1] + 0.05, p[2]), (1.3, 0.3, 1.3), 'yellow', yaw=yaw + 45)
    return p


def fruto(m, nombre, c, a, h, yaw=0, cols=FRUTO, grande=True):
    """Melon redondo reticulado. Cuerpo en cruz (nucleo alto y dos panzas anchas): seccion octagonal
    y perfil redondeado. Encima, las suturas oscuras de polo a polo (gajos) en cruz y la red clara:
    un ecuador y una X en la tapa. Todas las cajas giran juntas alrededor de c.
    12 cubos (grande) o 10 (chico: sin suturas laterales)."""
    x, y, z = c
    k = 0.7 * a     # ancho del nucleo y de las panzas en su lado corto

    def caja(n, dx, dy, dz, size, col, yaw_extra=0):
        m.box(f'{nombre}_{n}', (x + dx, y + dy, z + dz), size, col, yaw=yaw + yaw_extra, pivot=c)

    caja('nucleo', 0, 0, 0, (k, h, k), cols[0])
    caja('panza_x', 0, 0.15 * h, 0, (a, 0.7 * h, k), cols[0])
    caja('panza_z', 0, 0.15 * h, 0, (k, 0.7 * h, a), cols[0])
    # suturas: cruz de lineas oscuras que bajan por la tapa y los hombros
    caja('sutura_x', 0, -0.02, 0, (0.3, h + 0.08, k + 0.08), cols[2])
    caja('sutura_z', 0, -0.02, 0, (k + 0.08, h + 0.08, 0.3), cols[2])
    if grande:
        caja('sutura_lado_x', 0, 0.15 * h - 0.04, 0, (0.3, 0.7 * h + 0.08, a + 0.08), cols[2])
        caja('sutura_lado_z', 0, 0.15 * h - 0.04, 0, (a + 0.08, 0.7 * h + 0.08, 0.3), cols[2])
    # red clara: ecuador (dos cajas para dar la vuelta) y una X en la tapa
    caja('red_ecuador_x', 0, 0.45 * h, 0, (a + 0.14, 0.3, k + 0.14), cols[1])
    caja('red_ecuador_z', 0, 0.45 * h, 0, (k + 0.14, 0.3, a + 0.14), cols[1])
    for j, giro in enumerate((45, -45)):
        caja(f'red_tapa{j}', 0, h, 0, (0.28, 0.1, k * 1.25), cols[1], yaw_extra=giro)
    caja('pedunculo', 0, h, 0, (0.5, 0.6, 0.5), 'calabaza_hoja_dark', yaw_extra=20)


def fruto_partido(m, nombre, c, a, h, yaw=0):
    """Medio melon con el corte hacia arriba: cascara reticulada por fuera, borde fino de cascara,
    pulpa naranja salmon y la cavidad central con semillas crema. 12 cubos."""
    x, y, z = c
    k = 0.7 * a

    def caja(n, dx, dy, dz, size, col, yaw_extra=0):
        m.box(f'{nombre}_{n}', (x + dx, y + dy, z + dz), size, col, yaw=yaw + yaw_extra, pivot=c)

    # media esfera: lo mas ancho queda arriba, en el corte
    caja('nucleo', 0, 0, 0, (k, h, k), 'melon_cascara')
    caja('panza_x', 0, 0.35 * h, 0, (a, 0.65 * h, k), 'melon_cascara')
    caja('panza_z', 0, 0.35 * h, 0, (k, 0.65 * h, a), 'melon_cascara')
    caja('red_x', 0, 0.55 * h, 0, (a + 0.12, 0.28, k + 0.12), 'melon_red')
    caja('red_z', 0, 0.55 * h, 0, (k + 0.12, 0.28, a + 0.12), 'melon_red')
    caja('sutura', 0, 0.35 * h - 0.04, 0, (0.3, 0.65 * h + 0.02, a + 0.08), 'vaina_dark')
    # cara del corte: pulpa salmon dejando ver un borde de cascara
    caja('pulpa_x', 0, h, 0, (a - 0.5, 0.12, k - 0.5), 'melon_pulpa')
    caja('pulpa_z', 0, h, 0, (k - 0.5, 0.12, a - 0.5), 'melon_pulpa')
    caja('cavidad', 0, h + 0.02, 0, (0.42 * a, 0.14, 0.42 * a), 'calabaza_naranja', yaw_extra=45)
    for j, (dx, dz, g) in enumerate([(-0.35, 0.2, 30), (0.3, -0.25, -40), (0.1, 0.45, 80)]):
        caja(f'semilla{j}', dx, h + 0.1, dz, (0.5, 0.1, 0.28), 'calabaza_crema', yaw_extra=g)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: surco, tres semillas crema planas y terrones. 10 cubos (8 mas el lomo)."""
    m = Model('melon_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (6.4, 0.12, 4.2), 'suelo_humedo', yaw=-10)
    m.box('surco', (0, 2, 0.3), (5.0, 0.2, 1.0), 'soil_dark', yaw=-10)
    # semillas de melon: ovaladas, planas y chicas, color crema
    m.box('semilla1', (-1.4, 2.12, 0.6), (1.2, 0.3, 0.7), 'calabaza_crema', yaw=25)
    m.box('semilla2', (0.9, 2.12, -0.3), (1.2, 0.3, 0.7), 'calabaza_crema', yaw=-30)
    m.box('semilla3', (0.1, 2.12, 1.5), (1.1, 0.3, 0.65), 'calabaza_crema', yaw=70)
    m.box('tapado', (0.5, 2.12, 1.8), (0.9, 0.4, 0.8), 'soil_dark', yaw=60)
    m.box('terron1', (3.4, 2, 1.6), (1.5, 0.9, 1.3), 'soil_dark', yaw=25)
    m.box('terron2', (-3.6, 2, -1.4), (1.3, 0.8, 1.1), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito, dos cotiledones ovalados y la primera hoja ya redondeada. 10 cubos (8 mas el lomo)."""
    m = Model('melon_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.25, 2.4), 'suelo_humedo')
    m.box('tallito', BASE, (0.6, 2.2, 0.6), 'calabaza_hoja_light')
    eje = 100
    for k, lado in enumerate((0, 180)):
        c = mover((0, 4.0, 0), eje + lado, 1.1)
        m.box(f'cotiledon{k}', c, (1.3, 0.35, 2.4), ('calabaza_hoja_light', 'calabaza_hoja')[k], tilt=-12,
              yaw=eje + lado)
    # primera hoja verdadera: chica y casi circular, sin nervio para no pasar del presupuesto
    hoja_redonda(m, 'hoja1', (0, 4.1, 0), eje + 80, 0.9, 2.6, tilt_pec=30, tilt=-20, nervio=False)
    m.box('testa', (1.8, 2, 1.0), (1.0, 0.25, 0.6), 'calabaza_crema', yaw=25)
    return m


def crecimiento():
    """Planta vegetativa: corona, hojas redondas, dos guias por el lomo con zarcillo simple y dos
    flores amarillas chicas. 28 cubos con el lomo."""
    m = Model('melon_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.1, 1.1, 1.1), 'calabaza_hoja_dark')
    top = (0, 3.1, 0)
    hoja_redonda(m, 'hoja0', top, 195, 1.8, 4.0)
    hoja_redonda(m, 'hoja1', top, 135, 1.6, 3.6)
    # guias rastreras a lo largo del lomo
    der = guia(m, 'guia_der', (0.4, 2.3, 0.2), [(2.8, 80, 92), (2.4, 100, 90)], grueso=0.45, cols=GUIA)
    izq = guia(m, 'guia_izq', (-0.4, 2.3, 0.2), [(4.4, 265, 91)], grueso=0.45, cols=GUIA)
    hoja_redonda(m, 'hoja2', der[0], 170, 1.2, 3.2, tilt_pec=50, nervio=False)
    hoja_redonda(m, 'hoja3', mover((-0.4, 2.3, 0.2), 265, 2.6), 225, 1.2, 3.2, tilt_pec=50, nervio=False)
    zarcillo(m, 'zarcillo', der[1], 30, col='leaf_light')
    flor(m, 'flor1', der[1], 10)
    flor(m, 'flor2', izq[0], 330)
    return m


def madurez():
    """Planta adulta: guias con hojas redondas, zarcillos simples y una flor; al frente un melon grande
    reticulado, uno chico y uno partido con la pulpa salmon y semillas crema. 59 cubos con el lomo."""
    m = Model('melon_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.3, 1.2, 1.3), 'calabaza_hoja_dark')
    top = (0, 3.2, 0)
    # hojas hacia atras y a los lados: el frente queda libre para los frutos
    hoja_redonda(m, 'hoja0', top, 180, 2.0, 4.4)
    hoja_redonda(m, 'hoja1', top, 238, 1.8, 4.0)
    hoja_redonda(m, 'hoja2', top, 122, 1.8, 4.0, nervio=False)
    der = guia(m, 'guia_der', (0.5, 2.3, 0.0), [(2.8, 82, 92), (2.4, 108, 90)], grueso=0.5, cols=GUIA)
    izq = guia(m, 'guia_izq', (-0.5, 2.3, 0.0), [(3.4, 268, 92)], grueso=0.5, cols=GUIA)
    hoja_redonda(m, 'hoja3', der[1], 160, 1.0, 3.0, tilt_pec=45, nervio=False)
    zarcillo(m, 'zarcillo', izq[0], 300, col='leaf_light')
    flor(m, 'flor', der[0], 35)
    # frutos apoyados en el borde frontal del lomo
    fruto(m, 'melon1', (-1.6, 1.0, 2.9), 5.6, 4.6, yaw=12)
    fruto(m, 'melon2', (-5.6, 1.0, 4.6), 3.0, 2.6, yaw=-25, grande=False)
    fruto_partido(m, 'melon3', (3.9, 1.0, 3.6), 4.4, 2.2, yaw=-18)
    return m


def podrida():
    """Desenlace de estres: hojas secas enroscadas, guias quebradas y el melon hundido, oscuro y
    rajado, con moho, semillas regadas y moscas. Un melon chico ya negro a un lado. 50 cubos."""
    m = Model('melon_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, -1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.6, 2, -1.6), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    m.box('corona', BASE, (1.2, 0.9, 1.2), 'podrido')
    m.box('moho_corona', (0, 2.9, 0), (0.9, 0.3, 0.9), 'moho_dark')
    top = (0, 2.7, 0)
    # hojas secas caidas sobre el lomo, con el borde enroscado (tilt fuerte)
    hoja_redonda(m, 'hoja0', top, 185, 1.6, 4.2, cols=SECA, tilt_pec=98, tilt=14)
    hoja_redonda(m, 'hoja1', top, 245, 1.4, 3.6, cols=('hoja_seca_dark', 'podrido', 'hoja_seca'),
                 tilt_pec=102, tilt=22, nervio=False)
    hoja_redonda(m, 'hoja2', top, 120, 1.4, 3.8, cols=('podrido_dark', 'hoja_seca_dark', 'hoja_seca_light'),
                 tilt_pec=100, tilt=-18)
    # guias secas y quebradas
    der = guia(m, 'guia_der', (0.4, 2.0, 0.0), [(3.0, 80, 91), (2.2, 115, 92)], grueso=0.4,
               cols=('hoja_seca_dark', 'hoja_seca'))
    izq = guia(m, 'guia_izq', (-0.4, 2.0, 0.0), [(3.0, 270, 91)], grueso=0.4, cols=('hoja_seca', 'hoja_seca_dark'))
    m.box('guia_quiebre', der[0], (0.6, 0.5, 0.6), 'podrido_dark')
    m.box('zarcillo_seco', izq[0], (0.2, 1.0, 0.2), 'hoja_seca_dark', tilt=65, yaw=300)
    # hojas sueltas en el suelo, fuera del lomo
    m.box('hoja_suelo1', (-6.0, 0, -3.4), (2.2, 0.25, 1.6), 'hoja_seca', yaw=35)
    m.box('hoja_suelo1b', (-6.0, 0, -3.4), (1.6, 0.25, 2.2), 'hoja_seca', yaw=35)
    m.box('hoja_suelo2', (5.8, 0, -3.6), (1.8, 0.25, 1.4), 'hoja_seca_dark', yaw=-40)
    # melon grande hundido: mas bajo y ancho, la tapa se vence, una raja deja ver la pulpa pasada
    c, a, h, yaw = (-1.4, 1.0, 2.9), 5.8, 3.2, 12
    x, y, z = c
    k = 0.7 * a

    def caja(n, dx, dy, dz, size, col, tilt=0, yaw_extra=0):
        m.box(f'melon_{n}', (x + dx, y + dy, z + dz), size, col, tilt=tilt, yaw=yaw + yaw_extra, pivot=c)

    caja('nucleo', 0, 0, 0, (k, h, k), 'podrido')
    caja('panza_x', 0, 0.1 * h, 0, (a, 0.62 * h, k), 'podrido')
    caja('panza_z', 0, 0.1 * h, 0, (k, 0.62 * h, a), 'podrido')
    # restos de la red y de las suturas, sucios pero todavia legibles
    caja('red_x', 0, 0.42 * h, 0, (a + 0.12, 0.25, k + 0.12), 'hoja_seca')
    caja('red_z', 0, 0.42 * h, 0, (k + 0.12, 0.25, a + 0.12), 'hoja_seca')
    caja('sutura', 0, 0.1 * h - 0.04, 0, (0.3, 0.62 * h + 0.08, a + 0.08), 'hoja_seca_dark')
    caja('red_tapa', 0, h, 0, (0.28, 0.1, k * 1.2), 'hoja_seca', yaw_extra=45)
    # tapa vencida: hundimiento oscuro con moho encima
    caja('hundido', 0.4, h - 0.2, -0.3, (k * 0.75, 0.3, k * 0.75), 'podrido_dark', yaw_extra=45)
    caja('moho1', -0.7, h, 0.6, (2.2, 0.4, 1.6), 'moho_light', yaw_extra=-20)
    caja('moho3', 1.3, h - 0.1, -1.0, (1.1, 0.35, 1.1), 'moho', yaw_extra=30)
    # raja al frente: borde negro y pulpa pasada naranja adentro
    caja('raja', 0.9, 0.18 * h, a * 0.5 - 0.15, (2.4, 1.5, 0.5), 'podrido_dark')
    caja('pulpa_pasada', 0.9, 0.18 * h + 0.35, a * 0.5 - 0.05, (1.6, 0.8, 0.5), 'calabaza_naranja')
    caja('moho2', -k * 0.5 - 0.1, 0.2, -0.4, (1.2, 1.6, 2.2), 'moho')
    caja('lesion', -1.6, 0.3, a * 0.5 - 0.2, (1.2, 1.0, 0.45), 'moho_dark')
    caja('pedunculo', 0.4, h + 0.1, -0.3, (0.5, 0.5, 0.5), 'hoja_seca_dark', tilt=40, yaw_extra=200)
    # melon chico ya negro y aplastado
    c2 = (4.6, 1.0, 3.8)
    m.box('melon2', c2, (2.6, 1.4, 2.0), 'podrido_dark', yaw=-30)
    m.box('melon2_b', c2, (2.0, 1.2, 2.6), 'podrido', yaw=-30)
    m.box('melon2_moho', (c2[0] - 0.2, 2.4, c2[2]), (1.4, 0.3, 1.2), 'moho_light', yaw=10)
    # escurrido y semillas regadas
    m.box('escurrido', (2.0, 2, 1.6), (2.4, 0.12, 1.6), 'podrido_dark', yaw=20)
    m.box('semilla_suelo1', (2.4, 2.12, 0.8), (0.6, 0.15, 0.35), 'calabaza_crema', yaw=30)
    m.box('semilla_suelo2', (1.4, 2.12, 2.0), (0.6, 0.15, 0.35), 'hoja_seca_light', yaw=-50)
    # moscas (lo unico que flota a proposito)
    for k2, (fx, fy, fz, g) in enumerate([(-1.8, 6.4, 3.2, 20), (-4.0, 5.4, 1.4, -40)]):
        m.box(f'mosca{k2}', (fx, fy, fz), (0.6, 0.4, 0.6), 'black', yaw=g)
        m.box(f'mosca{k2}_ala', (fx, fy + 0.4, fz), (1.1, 0.1, 0.4), 'moho_light', yaw=g)
    return m


ETAPAS = [('melon_siembra', siembra), ('melon_brote', brote), ('melon_crecimiento', crecimiento),
          ('melon_madurez', madurez), ('melon_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
