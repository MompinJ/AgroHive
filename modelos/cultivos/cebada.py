"""Generador de la cebada (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/cebada.py

Cebada (Hordeum vulgare). Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la
base, y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el lomo de surco del maiz
(14x2x10) y el anclaje (0, 2, 0), y caben en una huella de 16x16. Las alturas y tamanos son
CUALITATIVOS, no medidas reales (solo se respeta que sea mas baja que el maiz y el sorgo).

Rasgos que se respetan (y que la distinguen del trigo y la avena, que tambien son macollos):
- MACOLLO: 5 tallos finos (canas) que salen juntos de la corona, no un tallo unico como el maiz o el
  sorgo; hojas angostas verde azulado que se arquean desde las canas.
- La espiga es de dos hileras, plana y angosta, con ARISTAS (barbas) muy largas, casi el doble de la
  espiga, que siguen su eje y se abren un poco en abanico.
- Al madurar, el cuello de la espiga se curva y la espiga CABECEA (cuelga hacia afuera y abajo); la
  planta entera se pone color paja palida y las hojas bajas se secan.
- Grano alargado y puntiagudo, color paja, para la siembra; la plantula es como pasto (hojitas finas).
- Podrida: canas acamadas (tumbadas sobre el lomo) y oscuras, espigas negras con moho, aristas rotas,
  grano tirado y moscas. Colores de la paleta fija (cereal_hoja*, cebada_*, hoja_seca*, espiga*,
  podrido*, moho*), sin colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- Etapas (macollaje despues de la tercera hoja, encanado, espigado, madurez) y escala de Zadoks:
  https://extension.umn.edu/growing-small-grains/spring-barley-growth-and-development-guide y
  https://www.uidaho.edu/extension/cereals/scseidaho/growstage/barley
- Cana hueca con nudos, arista de la espiguilla central de 50 mm o mas, inflorescencia que en madurez
  cabecea y planta a menudo recostada:
  https://www.herbiguide.com.au/Descriptions/hg_Barley.htm y
  https://www.smmflowers.org/bloom/ANF-descriptions/Hordeum_vulgare_vulgare_UCLA_SantaMonicas.pdf
- Espiga de dos o seis hileras (gen Vrs1): https://pmc.ncbi.nlm.nih.gov/articles/PMC2749621
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
from maiz import punta, hoja, monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)

BASE = (0, 2, 0)      # anclaje de la corona: encima del monticulo (igual que el maiz)

VERDE = ('cereal_hoja_dark', 'cereal_hoja', 'cereal_hoja_light')
PAJA = ('espiga_dark', 'espiga', 'cebada_espiga')          # raquis, grano, cana color paja palida
SECA = ('hoja_seca_dark', 'hoja_seca', 'hoja_seca_light')
ARISTA = 'cebada_arista'


# ---------------- utilidades ----------------
def eje(tilt, yaw):
    """Vector unitario del eje largo de una caja girada [tilt, yaw, 0] (igual que punta)."""
    t, y = math.radians(tilt), math.radians(yaw)
    return (math.sin(t) * math.sin(y), math.cos(t), math.sin(t) * math.cos(y))


def lado(yaw):
    """Eje x local (ancho) de una caja girada en yaw: horizontal y perpendicular a su direccion."""
    y = math.radians(yaw)
    return (math.cos(y), 0.0, -math.sin(y))


def angulos(v):
    """(tilt, yaw) que apuntan el eje largo de una caja en la direccion v."""
    n = math.sqrt(sum(c * c for c in v))
    t = math.degrees(math.acos(max(-1.0, min(1.0, v[1] / n))))
    y = math.degrees(math.atan2(v[0], v[2]))
    return t, y


def mover(p, v, d):
    """Punto p movido d unidades en la direccion v."""
    return tuple(p[i] + d * v[i] for i in range(3))


def pie(yaw, r=0.45):
    """Base de una cana del macollo: pegada a la corona, un poco hacia su lado."""
    y = math.radians(yaw)
    return (r * math.sin(y), BASE[1], r * math.cos(y))


def hojita(m, nombre, base, yaw, largo, cols, t1=35, t2=95, ancho=0.8):
    """Hoja angosta de cereal: dos laminas finas, la primera sube y la segunda se arquea. 2 cubos."""
    return hoja(m, nombre, base, yaw, largo, ancho=ancho, cols=cols, t1=t1, t2=t2, grosor=0.25)


def espiga_cebada(m, nombre, base, tilt, yaw, largo=3.2, cols=PAJA[:2], arista=ARISTA, la=6.0,
                  n=3, abre=0.14, ancho=1.1, raquis=True):
    """Espiga de dos hileras: raquis, cuerpo de grano plano y n aristas largas en abanico. 1-2 + n cubos.

    Las aristas salen de lo largo de la espiga, siguen su eje y la rebasan (la > largo); se abren
    poquito hacia los lados de la espiga plana (abre = cuanto se separan por unidad)."""
    if raquis:
        m.box(nombre + '_raquis', base, (0.45, largo, 0.45), cols[0], tilt=tilt, yaw=yaw)
    m.box(nombre + '_grano', punta(base, 0.3, tilt, yaw), (ancho, largo * 0.8, 0.7), cols[1], tilt=tilt, yaw=yaw)
    a, x = eje(tilt, yaw), lado(yaw)
    for k in range(n):
        f = k - (n - 1) / 2
        p = mover(punta(base, 0.9 + 0.5 * abs(f), tilt, yaw), x, 0.35 * f)
        d = tuple(a[i] + abre * f * x[i] for i in range(3))
        t2, y2 = angulos(d)
        m.box(f'{nombre}_arista{k}', p, (0.28, la, 0.28), arista, tilt=t2, yaw=y2)
    return punta(base, largo, tilt, yaw)


def mosca(m, nombre, p, a):
    """Mosca: cuerpo negro y alas claras. 2 cubos (lo unico que flota a proposito)."""
    m.box(nombre, p, (0.6, 0.4, 0.6), 'black', yaw=a)
    m.box(nombre + '_ala', (p[0], p[1] + 0.4, p[2]), (1.1, 0.1, 0.4), 'moho_light', yaw=a)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo con un surquito y 5 granos alargados color paja, uno medio tapado. 10 cubos."""
    m = Model('cebada_siembra', PAL)
    monticulo(m)
    m.box('surco', (0, 2, 0), (7.0, 0.3, 2.0), 'suelo_humedo', yaw=20)
    # la cebada se siembra a chorrillo: hilera de granos alargados y puntiagudos
    granos = [(-2.6, 'cebada_espiga', 30), (-1.3, 'espiga', -25), (0.0, 'cebada_espiga', 60),
              (1.3, 'espiga_dark', 5), (2.6, 'cebada_espiga', -40)]
    du = (math.sin(math.radians(110)), math.cos(math.radians(110)))
    for k, (u, col, a) in enumerate(granos):
        m.box(f'grano{k}', (u * du[0], 2.2, u * du[1]), (0.6, 0.6, 1.5), col, yaw=a)
    m.box('tapado', (1.3 * du[0], 2.3, 1.3 * du[1]), (1.6, 0.5, 1.2), 'soil', yaw=35)
    m.box('terron', (2.6, 2, 2.0), (1.3, 0.8, 1.1), 'soil_dark', yaw=25)
    return m


def brote():
    """Plantula de pasto: coleoptilo y 4 hojitas finas, una arqueada, y el grano a un lado. 10 cubos."""
    m = Model('cebada_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (2.6, 0.3, 2.2), 'suelo_humedo', yaw=20)
    m.box('coleoptilo', BASE, (0.7, 1.2, 0.7), VERDE[2])
    m.box('hojita0', (0, 2.6, 0), (0.5, 4.6, 0.2), VERDE[1], tilt=12, yaw=125)
    m.box('hojita1', (0, 2.6, 0), (0.5, 3.8, 0.2), VERDE[2], tilt=20, yaw=300)
    m.box('hojita2', (0, 2.4, 0), (0.45, 3.0, 0.2), VERDE[1], tilt=34, yaw=30)
    hojita(m, 'hojita3', (0, 2.6, 0), 215, 4.6, (VERDE[1], VERDE[2]), t1=26, t2=80, ancho=0.5)
    m.box('grano', (1.3, 2, 0.9), (0.6, 0.5, 1.4), 'cebada_espiga', yaw=40)
    return m


# canas del macollo: (yaw, largo de la cana, inclinacion). En diagonal a la camara para que se lean.
CANAS = [(125, 11.5, 8), (197, 12.5, 6), (269, 11.0, 6), (341, 12.0, 7), (53, 10.5, 10)]


# hojas del crecimiento (una por cana): (yaw, largo); de lado a la camara para que se vean largas
HOJAS_CREC = [(100, 8.0), (160, 7.4), (285, 7.8), (325, 7.0), (65, 6.6)]


def crecimiento():
    """Macollo verde: 5 canas con hojas angostas; 3 espigas recien salidas, erguidas, con aristas. 27 cubos."""
    m = Model('cebada_crecimiento', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.6, 1.2, 1.6), VERDE[0])
    for k, (yaw, L, t) in enumerate(CANAS):
        L *= 0.72
        b = pie(yaw)
        top = m.stem(f'cana{k}', b, L, 0.5, VERDE[1], tilt=t, yaw=yaw)
        # una hoja por cana, arqueada hacia afuera y alternando de lado
        hb = punta(b, 0.6 + 0.6 * (k % 3), t, yaw)
        cols = (VERDE[0], VERDE[1]) if k % 2 else (VERDE[1], VERDE[2])
        hyaw, hl = HOJAS_CREC[k]
        hojita(m, f'hoja{k}', hb, hyaw, hl, cols, t1=28, t2=100, ancho=1.0)
        if k in (0, 1, 3):
            # espiga recien salida de la vaina: erguida, verde, aristas verdes mas claras
            espiga_cebada(m, f'espiga{k}', top, t, yaw, largo=2.4, cols=(VERDE[0], VERDE[1]),
                          arista=VERDE[2], la=4.0, n=2, abre=0.10, ancho=0.9, raquis=False)
    return m


def madurez():
    """Macollo color paja: 5 canas con nudo, cuello curvo y espiga que cabecea con aristas largas,
    hojas bajas secas. 54 cubos."""
    m = Model('cebada_madurez', PAL)
    monticulo(m)
    m.box('corona', BASE, (1.7, 1.0, 1.7), SECA[0])
    for k, (yaw, L, t) in enumerate(CANAS):
        b = pie(yaw)
        top = m.stem(f'cana{k}', b, L, 0.55, PAJA[2], tilt=t, yaw=yaw)
        m.box(f'nudo{k}', punta(b, L * 0.45, t, yaw), (0.75, 0.5, 0.75), PAJA[0], tilt=t, yaw=yaw)
        # cuello (pedunculo) que se curva con el peso del grano
        c = m.stem(f'cuello{k}_a', top, 1.4, 0.4, PAJA[2], tilt=t + 30, yaw=yaw)
        c = m.stem(f'cuello{k}_b', c, 1.3, 0.4, PAJA[1], tilt=t + 80, yaw=yaw)
        espiga_cebada(m, f'espiga{k}', c, 148, yaw, largo=3.6, la=5.6, n=2 if k % 2 else 3, ancho=1.25)
    # hojas: las de abajo ya secas y caidas, una mas arriba todavia palida
    specs = [(0, 1.0, 50, 6.0, (SECA[0], SECA[1]), 60, 130), (1, 1.5, -45, 5.4, (SECA[1], SECA[0]), 55, 125),
             (2, 2.5, 40, 6.2, (SECA[1], SECA[2]), 45, 115), (3, 3.5, -40, 5.6, (SECA[2], PAJA[2]), 40, 105)]
    for j, (k, h, dyaw, Lh, cols, t1, t2) in enumerate(specs):
        yaw, _, t = CANAS[k]
        hojita(m, f'hoja{j}', punta(pie(yaw), h, t, yaw), yaw + dyaw, Lh, cols, t1=t1, t2=t2)
    return m


def podrida():
    """Desenlace de estres: canas acamadas y oscuras, espigas negras con moho, aristas rotas, grano
    tirado y moscas. 47 cubos."""
    m = Model('cebada_podrida', PAL)
    monticulo(m)
    m.box('charco', (-2.6, 2, -1.4), (3.4, 0.3, 2.2), 'suelo_humedo', yaw=15)
    m.box('corona', BASE, (1.8, 0.9, 1.8), 'podrido_dark')
    m.box('moho_corona', (0.5, 2.6, 0.3), (1.0, 0.5, 1.2), 'moho', yaw=30)
    oscuro = ('podrido_dark', 'podrido')
    # dos canas acamadas del todo: tumbadas sobre el lomo, la espiga cae por la orilla
    for k, (yaw, L) in enumerate([(78, 4.2), (250, 4.2)]):
        b = (0.3 * math.sin(math.radians(yaw)), 2.25, 0.3 * math.cos(math.radians(yaw)))
        top = m.stem(f'acamada{k}', b, L, 0.5, SECA[0] if k else 'podrido', tilt=90, yaw=yaw)
        espiga_cebada(m, f'espiga_acamada{k}', top, 104, yaw, largo=2.8, cols=oscuro,
                      arista=SECA[0], la=2.2, n=2, abre=0.5, ancho=1.0)
        m.box(f'moho_espiga{k}', punta(top, 1.2, 100, yaw), (0.9, 0.4, 0.9), 'moho_light', yaw=yaw)
    # dos canas vencidas: muy inclinadas, cuello quebrado y espiga colgando hasta el lomo
    for k, (yaw, L, t) in enumerate([(165, 6.2, 52), (330, 5.6, 58)]):
        top = m.stem(f'vencida{k}', pie(yaw), L, 0.5, SECA[1] if k else SECA[0], tilt=t, yaw=yaw)
        m.box(f'quiebre{k}', top, (0.7, 0.6, 0.7), 'podrido_dark', tilt=t, yaw=yaw)
        c = m.stem(f'cuello_roto{k}', top, 1.0, 0.4, 'podrido', tilt=150, yaw=yaw)
        espiga_cebada(m, f'espiga_vencida{k}', c, 172, yaw + 20, largo=2.6, cols=oscuro,
                      arista='hoja_seca_dark', la=2.6 if k else 1.6, n=2, abre=0.4, ancho=1.0)
    m.box('moho_vencida', punta(pie(165), 3.0, 52, 165), (0.9, 0.5, 0.9), 'moho', tilt=52, yaw=165)
    m.box('tocon', pie(20), (0.6, 2.2, 0.6), 'podrido_dark', tilt=8, yaw=20)
    # hojas podridas colgando de las canas y tiradas
    hojita(m, 'hoja0', punta(pie(165), 1.0, 52, 165), 120, 5.0, ('podrido', SECA[0]), t1=70, t2=120)
    hojita(m, 'hoja1', punta(pie(330), 1.4, 58, 330), 15, 4.6, (SECA[0], 'moho_dark'), t1=65, t2=115)
    m.box('hoja_suelo0', (4.8, 1, -3.6), (0.8, 0.25, 4.0), SECA[0], yaw=70)
    m.box('hoja_suelo1', (-4.6, 1, 3.6), (0.8, 0.25, 3.6), 'podrido', yaw=-55)
    m.box('hoja_suelo2', (2.2, 2, 2.2), (0.7, 0.25, 3.0), 'moho_dark', yaw=20)
    # grano tirado, podrido o con moho
    for k, (x, z, col, a) in enumerate([(-1.6, 2.4, 'podrido_dark', 30), (-0.4, 2.7, 'moho_light', -20),
                                        (1.2, -2.4, 'espiga_dark', 60)]):
        m.box(f'grano_suelo{k}', (x, 2, z), (0.5, 0.45, 1.2), col, yaw=a)
    mosca(m, 'mosca0', (-1.6, 6.4, 1.8), 25)
    mosca(m, 'mosca1', (2.4, 4.6, -1.2), -40)
    return m


ETAPAS = [('cebada_siembra', siembra), ('cebada_brote', brote), ('cebada_crecimiento', crecimiento),
          ('cebada_madurez', madurez), ('cebada_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
