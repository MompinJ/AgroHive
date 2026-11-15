"""Generador del frijol caupi (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/caupi.py

Frijol caupi o de ojo negro (Vigna unguiculata), de porte semirrastrero. Convenciones (docs/07):
1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas
las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben
en una huella de 16x16. Las alturas y largos son cualitativos, no medidas reales.

Rasgos que se respetan para no confundirlo con el frijol, la soya y el cacahuate: mata baja,
semirrastrera y abierta (guias casi acostadas sobre el lomo, mas extendida que el frijol); hoja
trifoliada con foliolos LANCEOLADOS (largos y puntiagudos, el terminal en dos cubos para que se lea
la punta) y brillantes (tono claro arriba); pedunculos LARGOS y erguidos que salen del follaje y
llevan en la punta las flores lila palido o las vainas; vainas MUY largas y delgadas que cuelgan en
pares abiertos en V desde la punta del pedunculo, color paja al secar. Semilla crema arrinonada con
su ojo negro (el hilo). Colores de la paleta fija, sin colores nuevos.

Fuentes de forma (consultadas el 14/11):
- Kew, Plants of the World Online, Vigna unguiculata: foliolos ovados, rombicos o lanceolados;
  pedunculo de 2 a 36 cm. https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:1127257-2
- Iowa State, Crop Improvement, cap. 9 (Cowpea Breeding): los pedunculos largos son un rasgo
  unico del caupi entre leguminosas; 2 o 3 vainas por pedunculo.
  https://iastate.pressbooks.pub/cropimprovement/chapter/cowpea-breeding/
- Wikipedia, Cowpea: vainas de 10 a 110 cm segun el grupo; semilla con el ojo alrededor del hilo.
  https://en.wikipedia.org/wiki/Cowpea
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
from maiz import monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (la del juego, desde +x +z)

HOJA = ('caupi_hoja_dark', 'caupi_hoja', 'caupi_hoja_light')   # peciolo y guia, laterales, terminal (brillo)
SECA = ('hoja_seca_dark', 'hoja_marchita', 'hoja_seca')
VAINA_VERDE = ('caupi_vaina', 'caupi_hoja_light')
VAINA_SECA = ('caupi_vaina_seca', 'hoja_seca')


# ---------------- utilidades ----------------
def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def adelante(p, yaw, caida, d):
    """Punto a d unidades de p sobre una lamina que sale hacia yaw y baja caida grados (Rx y luego Ry)."""
    c, y = math.radians(caida), math.radians(yaw)
    return (p[0] + d * math.cos(c) * math.sin(y), p[1] - d * math.sin(c), p[2] + d * math.cos(c) * math.cos(y))


def lamina(m, nombre, p, yaw, largo, ancho, col, caida=8, grosor=0.3):
    """Lamina plana que nace en p y se extiende largo hacia yaw (gira con pivote en p). 1 cubo."""
    m.box(nombre, (p[0], p[1], p[2] + largo / 2), (ancho, grosor, largo), col, tilt=caida, yaw=yaw, pivot=p)


def lanceolado(m, nombre, p, yaw, largo, ancho, cols, caida=8):
    """Foliolo lanceolado: cuerpo largo y una punta angosta que sigue la misma lamina. 2 cubos."""
    lamina(m, nombre, p, yaw, largo * 0.64, ancho, cols[0], caida)
    q = adelante(p, yaw, caida, largo * 0.58)
    lamina(m, nombre + '_punta', q, yaw, largo * 0.42, ancho * 0.5, cols[1], caida + 4)


def trifoliada(m, nombre, base, yaw, peciolo, s, cols=HOJA, tilt_pec=55, caida=8, abre=62):
    """Hoja trifoliada de caupi: peciolo, terminal lanceolado (2 cubos) y 2 laterales angostos. 5 cubos.

    Devuelve la punta del peciolo."""
    p = m.stem(nombre + '_pec', base, peciolo, 0.35, cols[0], tilt=tilt_pec, yaw=yaw)
    lanceolado(m, nombre + '_t', p, yaw, s, s * 0.36, (cols[2], cols[2]), caida)
    for k, s_ in enumerate((1, -1)):
        lamina(m, f'{nombre}_l{k}', mover(p, yaw, -0.1), yaw + s_ * abre, s * 0.8, s * 0.3, cols[1], caida + 6)
    return p


def flor(m, nombre, c, yaw, cols=('flor_lila', 'white')):
    """Flor papilionacea grande en la punta del pedunculo: estandarte lila erguido y quilla clara. 2 cubos."""
    m.box(nombre + '_estandarte', c, (1.5, 1.3, 0.35), cols[0], tilt=-12, yaw=yaw)
    m.box(nombre + '_quilla', mover(c, yaw, 0.45), (0.7, 0.55, 0.9), cols[1], yaw=yaw)


def vaina(m, nombre, p, yaw, largo, cols, tilt=140, grueso=0.5, cae=170):
    """Vaina larga y delgada colgando desde p: sale abierta (tilt) y el resto cae casi vertical (cae). 2 cubos."""
    q = m.stem(nombre, p, largo * 0.5, grueso, cols[0], tilt=tilt, yaw=yaw)
    m.stem(nombre + '_punta', q, largo * 0.55, grueso * 0.8, cols[1], tilt=cae, yaw=yaw)


def par_vainas(m, nombre, p, yaw, largo, cols, abre=90, tilt=140, cae=170):
    """Par de vainas desde la misma punta de pedunculo, abiertas en V hacia los lados de yaw. 4 cubos.

    cols es un par (cuerpo, punta) para las dos o un par de pares, uno por vaina."""
    for k, s_ in enumerate((1, -1)):
        vaina(m, f'{nombre}_{k}', p, yaw + s_ * abre, largo, cols[k] if isinstance(cols[0], tuple) else cols,
              tilt=tilt, cae=cae)


def guia(m, nombre, base, yaw, largo, col='caupi_hoja_dark', tilt=84, grueso=0.55):
    """Guia (rama semirrastrera) casi acostada sobre el lomo. Devuelve su punta."""
    return m.stem(nombre, base, largo, grueso, col, tilt=tilt, yaw=yaw)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: tres semillas crema arrinonadas con su ojo negro y un terron. 10 cubos."""
    m = Model('caupi_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (5.2, 0.3, 3.6), 'suelo_humedo')
    semillas = [((-1.3, 0.5), 20), ((1.2, -0.5), -40), ((0.4, 1.1), 75)]
    for k, ((x, z), yaw) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), (1.0, 0.85, 1.6), 'caupi_semilla', yaw=yaw)
        # ojo negro al centro, sobre el hilo
        m.box(f'semilla{k + 1}_ojo', (x, 3.15, z), (0.55, 0.12, 0.6), 'black', yaw=yaw)
    m.box('terron', (3.7, 2, 1.3), (1.5, 0.9, 1.3), 'soil_dark', yaw=30)
    return m


def brote():
    """Plantula epigea: tallito, 2 cotiledones gruesos y el primer par de hojas simples lanceoladas. 12 cubos."""
    m = Model('caupi_brote', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (3.2, 0.3, 2.6), 'suelo_humedo')
    m.box('tallito', BASE, (0.6, 3.4, 0.6), 'caupi_hoja')
    eje = FRENTE - 45      # cotiledones y hojas cruzados, los dos pares en diagonal a la camara
    for k in range(2):
        c = mover((0, 3.4, 0), eje + 180 * k, 0.75)
        m.box(f'cotiledon{k}', c, (1.2, 0.6, 1.6), ('caupi_semilla', 'caupi_vaina')[k], tilt=-12 if k else 12,
              yaw=eje)
    top = (0, 5.4, 0)
    for k in range(2):
        yaw = eje + 90 + 180 * k
        p = m.stem(f'peciolo{k}', top, 1.0, 0.3, 'caupi_hoja_dark', tilt=62, yaw=yaw)
        cols = (('caupi_hoja_light', 'caupi_hoja_light'), ('caupi_hoja', 'caupi_hoja_light'))[k]
        lanceolado(m, f'hoja{k}', p, yaw, 3.6, 1.3, cols, caida=-4)
    return m


def crecimiento():
    """Mata joven abierta: 3 guias bajas con trifoliadas y 2 flores lila en pedunculos largos. 29 cubos."""
    m = Model('caupi_crecimiento', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 1.4, 0.7, 'caupi_hoja_dark', tilt=0, yaw=0)
    # hojas primarias simples (las primeras), ya oscuras, pegadas a la base
    for k, yaw in enumerate((FRENTE + 60, FRENTE + 240)):
        lamina(m, f'primaria{k}', mover(top, yaw, 0.3, -0.3), yaw, 2.6, 1.1, 'caupi_hoja_dark', caida=4)
    # tres guias casi acostadas sobre el lomo, abiertas; cada una con su trifoliada en la punta
    for k, (yaw, L) in enumerate([(FRENTE - 40, 2.8), (FRENTE + 80, 4.0), (FRENTE + 200, 4.0)]):
        r = guia(m, f'guia{k}', (0, 2.5, 0), yaw, L, tilt=84)
        trifoliada(m, f'hoja{k}', r, yaw, 1.4, 3.2, tilt_pec=52, caida=6)
    # pedunculos largos y erguidos que sobresalen del follaje, con su flor lila en la punta
    for k, (yaw, L) in enumerate([(FRENTE + 100, 6.0), (FRENTE - 80, 5.6)]):
        f = m.stem(f'pedunculo{k}', top, L, 0.35, 'caupi_hoja', tilt=22, yaw=yaw)
        flor(m, f'flor{k}', f, FRENTE)
    return m


def madurez():
    """Mata extendida y verde, vainas muy largas en V (paja y una verde) en pedunculos largos y una flor. 56 cubos."""
    m = Model('caupi_madurez', PAL)
    monticulo(m)
    top = m.stem('tallo', BASE, 1.4, 0.8, 'caupi_hoja_dark', tilt=0, yaw=0)
    # cuatro guias acostadas en cruz sobre el lomo (las largas a lo largo del lomo), con su trifoliada
    guias = [(FRENTE - 35, 3.0), (FRENTE + 55, 3.6), (FRENTE + 145, 3.0), (FRENTE + 235, 3.6)]
    for k, (yaw, L) in enumerate(guias):
        r = guia(m, f'guia{k}', (0, 2.5, 0), yaw, L, tilt=86)
        trifoliada(m, f'hoja{k}', r, yaw + 8, 1.2, 3.3, tilt_pec=58, caida=8)
    for k, yaw in enumerate((FRENTE + 100, FRENTE + 280)):
        trifoliada(m, f'hoja{k + 4}', top, yaw, 1.8, 3.1, tilt_pec=40, caida=4)
    # una hoja vieja amarilla en la base
    lamina(m, 'hoja_vieja', mover(top, FRENTE + 190, 0.3, -0.4), FRENTE + 190, 2.4, 1.0, 'hoja_marchita', caida=10)
    # pedunculos largos que salen del follaje por los huecos entre guias; en la punta, un par de vainas en V
    peds = [(FRENTE + 10, 8.0, VAINA_SECA), (FRENTE + 100, 7.4, VAINA_VERDE), (FRENTE + 280, 7.8, VAINA_SECA)]
    for k, (yaw, L, cols) in enumerate(peds):
        f = m.stem(f'pedunculo{k}', top, L, 0.4, 'caupi_hoja', tilt=26, yaw=yaw)
        par_vainas(m, f'vaina{k}', f, yaw, 5.4, cols, abre=80, tilt=138, cae=170)
    # un pedunculo tardio todavia en flor, el mas alto, hacia atras
    f = m.stem('pedunculo3', top, 8.6, 0.4, 'caupi_hoja', tilt=12, yaw=FRENTE + 190)
    flor(m, 'flor0', f, FRENTE)
    return m


def podrida():
    """Desenlace de estres: follaje seco tendido, vainas podridas con moho, colgando y en el lomo, y moscas. 48 cubos."""
    m = Model('caupi_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.4), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    top = m.stem('tallo', BASE, 1.2, 0.8, 'hoja_seca_dark', tilt=20, yaw=FRENTE + 160)
    m.box('moho_base', BASE, (1.3, 0.8, 1.3), 'moho_dark')
    # guias secas tendidas en el lomo con las hojas lacias caidas; una quedo pelona
    secas = [SECA, ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light'), ('podrido', 'hoja_seca_dark', 'hoja_marchita'),
             None]
    guias = [(FRENTE - 30, 3.2), (FRENTE + 65, 4.2), (FRENTE + 150, 3.2), (FRENTE + 245, 4.0)]
    for k, ((yaw, L), cols) in enumerate(zip(guias, secas)):
        r = guia(m, f'guia{k}', (0, 2.4, 0), yaw, L, col=('hoja_seca_dark', 'hoja_seca')[k % 2], tilt=90)
        if cols:
            trifoliada(m, f'hoja{k}', r, yaw + 10, 0.6, 2.8, cols=cols, tilt_pec=84, caida=14, abre=72)
    # pedunculo quebrado: sube, se dobla y deja colgando un par de vainas podridas con moho
    lado = FRENTE + 15
    f = m.stem('pedunculo0', top, 3.4, 0.35, 'hoja_seca', tilt=30, yaw=lado)
    f = m.stem('pedunculo0_doblez', f, 2.0, 0.35, 'hoja_seca_dark', tilt=118, yaw=lado)
    par_vainas(m, 'vaina0', f, lado, 4.0, (('podrido_dark', 'podrido'), ('podrido', 'hoja_seca_dark')),
               abre=80, tilt=125, cae=160)
    m.box('vaina0_moho', f, (0.9, 0.6, 0.9), 'moho_light', yaw=lado)
    # otro pedunculo vencido hacia atras con una sola vaina negra (la otra ya cayo)
    lado = FRENTE + 200
    f = m.stem('pedunculo1', top, 3.6, 0.35, 'hoja_seca_dark', tilt=62, yaw=lado)
    vaina(m, 'vaina1', f, lado + 60, 3.6, ('podrido_dark', 'podrido'), tilt=130, cae=165)
    # vainas caidas sobre el lomo: largas, una paja y otra podrida, con moho; una semilla suelta con su ojo
    m.box('vaina_suelo0', (-1.6, 2, 2.6), (0.6, 0.45, 5.6), 'podrido', yaw=75)
    m.box('vaina_suelo0_moho', (-1.0, 2.45, 2.75), (1.0, 0.4, 1.8), 'moho', yaw=80)
    m.box('vaina_suelo1', (2.4, 2, -2.3), (0.6, 0.45, 5.0), 'caupi_vaina_seca', yaw=-65)
    m.box('vaina_suelo1_moho', (2.8, 2.45, -2.5), (0.9, 0.35, 1.3), 'moho_dark', yaw=-60)
    m.box('semilla_suelo', (0.6, 2, 3.8), (1.0, 0.6, 1.3), 'caupi_semilla', yaw=15)
    m.box('semilla_suelo_ojo', (0.6, 2.6, 3.8), (0.5, 0.1, 0.5), 'black', yaw=15)
    # foliolos sueltos en el suelo
    caidas = [((-5.8, 1, -3.6), 'hoja_seca_dark', 60), ((5.9, 1, 3.6), 'hoja_seca_light', 15),
              ((-5.6, 1, 3.8), 'podrido', -40)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'foliolo_suelo{k}', c, (0.9, 0.3, 2.4), col, yaw=yaw)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(2.6, 6.6, 2.4, 20), (-2.2, 5.6, 1.6, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('caupi_siembra', siembra), ('caupi_brote', brote), ('caupi_crecimiento', crecimiento),
          ('caupi_madurez', madurez), ('caupi_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
