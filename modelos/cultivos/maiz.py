"""Generador del maiz (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/maiz.py

Convenciones (docs/07): 1 celda = 16 unidades, origen en el centro de la base,
y=0 superficie, +Y arriba, +Z frente. Todas las etapas comparten el monticulo
y el punto de anclaje del tallo (0, 2, 0) y caben en una huella de 16x16.
Las alturas son cualitativas, no medidas reales.
"""
import math
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas'))
sys.path.insert(0, os.path.join(AQUI, '..'))

from voxelkit import Model  # noqa: E402
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo
HUELLA = 8.0          # medio ancho de la celda (16 / 2)


# ---------------- utilidades ----------------
def punta(base, largo, tilt, yaw):
    """Misma cuenta que Model.stem: punta de una caja inclinada desde base."""
    t, y = math.radians(tilt), math.radians(yaw)
    vz = largo * math.sin(t)
    return (base[0] + vz * math.sin(y), base[1] + largo * math.cos(t), base[2] + vz * math.cos(y))


def hoja(m, nombre, base, yaw, largo, ancho=2.0, cols=('maiz_hoja', 'maiz_hoja_light'),
         t1=55, t2=105, grosor=0.5):
    """Hoja arqueada de maiz: dos laminas planas, la primera sube y la segunda cae."""
    a = largo * 0.58
    b = largo - a
    m.box(nombre + '_a', base, (ancho, a, grosor), cols[0], tilt=t1, yaw=yaw)
    p = punta(base, a, t1, yaw)
    m.box(nombre + '_b', p, (ancho * 0.7, b, grosor), cols[1], tilt=t2, yaw=yaw)
    return punta(p, b, t2, yaw)


def monticulo(m, seco=False):
    """Base comun de todas las etapas: lomo de surco de 14x2x10."""
    m.box('lomo', (0, 0, 0), (14, 1, 10), 'soil_light' if seco else 'soil')
    m.box('lomo_top', (0, 1, 0), (10, 1, 6), 'suelo_seco' if seco else 'soil_light')


def esquinas(m):
    """Caja envolvente real (con rotaciones) para revisar la huella."""
    lo = [1e9] * 3
    hi = [-1e9] * 3
    for e in m.els:
        f, t, o = e['from'], e['to'], e['origin']
        rx, ry, rz = [math.radians(v) for v in e.get('rotation', [0, 0, 0])]
        for x in (f[0], t[0]):
            for y in (f[1], t[1]):
                for z in (f[2], t[2]):
                    v = [x - o[0], y - o[1], z - o[2]]
                    # R = Rz @ Ry @ Rx (igual que el preview y el visor)
                    v = [v[0], v[1] * math.cos(rx) - v[2] * math.sin(rx), v[1] * math.sin(rx) + v[2] * math.cos(rx)]
                    v = [v[0] * math.cos(ry) + v[2] * math.sin(ry), v[1], -v[0] * math.sin(ry) + v[2] * math.cos(ry)]
                    v = [v[0] * math.cos(rz) - v[1] * math.sin(rz), v[0] * math.sin(rz) + v[1] * math.cos(rz), v[2]]
                    p = [v[0] + o[0], v[1] + o[1], v[2] + o[2]]
                    for i in range(3):
                        lo[i] = min(lo[i], p[i])
                        hi[i] = max(hi[i], p[i])
    return lo, hi


def guardar(m, nombre):
    ruta = os.path.join(AQUI, nombre + '.bbmodel')
    n = m.save(ruta)
    lo, hi = esquinas(m)
    fuera = max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) > HUELLA + 0.01
    print(f'{nombre}: {n} cubos, x[{lo[0]:.1f},{hi[0]:.1f}] y[{lo[1]:.1f},{hi[1]:.1f}] '
          f'z[{lo[2]:.1f},{hi[2]:.1f}]' + ('  AVISO: sale de la huella 16x16' if fuera else ''))
    if lo[1] < -0.01:
        print(f'  AVISO: {nombre} baja de y=0')
    return ruta


# ---------------- etapas ----------------
# Las hojas del maiz son disticas (alternas en un plano). Ese plano va en diagonal
# (yaw ~110 / 290) para que se lea desde la camara isometrica por defecto.
PLANO = 110


def siembra():
    """Lomo recien sembrado: hoyo con tres granos visibles y terrones. 8 cubos."""
    m = Model('maiz_siembra', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (4.2, 0.3, 3.0), 'suelo_humedo')
    m.box('semilla1', (-1.0, 2.3, 0.3), (1.4, 0.9, 1.7), 'grano', yaw=20)
    m.box('semilla2', (1.0, 2.3, -0.5), (1.3, 0.8, 1.6), 'grano_dark', yaw=-35)
    m.box('semilla3', (0.3, 2.3, 0.9), (1.2, 0.8, 1.5), 'grano_light', yaw=70)
    m.box('terron1', (3.6, 2, 1.4), (1.6, 1.0, 1.4), 'soil_dark', yaw=30)
    m.box('terron2', (-3.8, 2, -1.2), (1.3, 0.8, 1.2), 'suelo_humedo', yaw=-20)
    return m


def brote():
    """Plantula: tallito con hojitas arqueadas y el grano a un lado. 9 cubos."""
    m = Model('maiz_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.4), 'suelo_humedo')
    m.box('tallito', BASE, (1.0, 3.2, 1.0), 'maiz_tallo_light')
    m.box('hojita1', (0, 3.0, 0), (1.4, 3.0, 0.4), 'maiz_hoja', tilt=60, yaw=PLANO)
    hoja(m, 'hojita2', (0, 4.0, 0), PLANO + 180, 4.0, ancho=1.4, cols=('maiz_hoja', 'maiz_hoja_light'),
         t1=35, t2=95, grosor=0.4)
    m.box('cogollo', (0, 5.0, 0), (0.6, 1.6, 0.6), 'maiz_hoja_light', tilt=10, yaw=PLANO)
    m.box('semilla', (1.6, 2, 0.8), (1.1, 0.7, 1.3), 'grano_dark', yaw=25)
    return m


def tallo(m, segs, grueso, y0=2.0, cols=('maiz_tallo', 'maiz_tallo_dark')):
    """Tallo recto por segmentos. Devuelve la lista de alturas de los nudos."""
    y = y0
    nudos = []
    for i, h in enumerate(segs):
        m.box(f'tallo{i}', (0, y, 0), (grueso, h, grueso), cols[i % 2])
        y += h
        nudos.append(y)
    return nudos


def raices(m, n, col='maiz_tallo_dark', largo=3.2):
    """Raices de soporte (adventicias) que bajan del primer nudo al suelo."""
    for k in range(n):
        yaw = 45 + 360 * k / n
        r = 2.4
        m.box(f'raiz{k}', (r * math.sin(math.radians(yaw)), 1.5, r * math.cos(math.radians(yaw))),
              (0.6, largo, 0.6), col, tilt=-38, yaw=yaw)


def crecimiento():
    """Planta vegetativa: tallo medio, 6 hojas alternas arqueadas y cogollo. 23 cubos."""
    m = Model('maiz_crecimiento', PAL)
    monticulo(m)
    raices(m, 3, largo=2.6)
    nudos = tallo(m, [4, 4, 4, 3], 1.5, cols=('maiz_tallo', 'maiz_tallo'))
    alturas = [3.5, 6.0, 8.5, 11.0, 13.5, 15.5]
    largos = [7.0, 8.5, 9.2, 9.0, 8.0, 6.0]
    for k, (h, L) in enumerate(zip(alturas, largos)):
        yaw = PLANO + (k % 2) * 180 + (k - 2) * 8
        cols = ('maiz_hoja_dark', 'maiz_hoja') if k < 2 else ('maiz_hoja', 'maiz_hoja_light')
        hoja(m, f'hoja{k}', (0, h, 0), yaw, L, ancho=1.9, cols=cols, t1=40 - k * 2, t2=115)
    top = nudos[-1]
    m.box('cogollo', (0, top, 0), (1.1, 3.0, 1.1), 'maiz_hoja_light')
    m.box('cogollo_hoja', (0, top + 0.5, 0), (1.0, 3.2, 0.4), 'maiz_hoja', tilt=18, yaw=PLANO + 90)
    return m


def mazorca(m, nombre, base, yaw, escala=1.0, tilt=28):
    """Mazorca en la axila: pedunculo, totomoxtle, grano asomando y cabello. 7 cubos."""
    s = escala
    p = m.stem(nombre + '_ped', base, 1.2 * s, 0.7 * s, 'totomoxtle_dark', tilt=tilt + 20, yaw=yaw)
    m.box(nombre + '_toto', p, (2.2 * s, 5.2 * s, 2.2 * s), 'totomoxtle', tilt=tilt, yaw=yaw)
    m.box(nombre + '_toto_base', p, (2.5 * s, 1.6 * s, 2.5 * s), 'totomoxtle_dark', tilt=tilt, yaw=yaw)
    # totomoxtle abierto que deja ver el grano
    g = punta(p, 2.2 * s, tilt, yaw)
    m.box(nombre + '_grano', g, (2.4 * s, 2.4 * s, 2.4 * s), 'grano', tilt=tilt, yaw=yaw)
    m.box(nombre + '_grano_luz', punta(g, 2.4 * s, tilt, yaw), (1.6 * s, 0.5 * s, 1.6 * s), 'grano_light',
          tilt=tilt, yaw=yaw)
    tip = punta(p, 5.2 * s, tilt, yaw)
    m.box(nombre + '_cabello', tip, (1.0 * s, 1.6 * s, 1.0 * s), 'cabello', tilt=tilt + 15, yaw=yaw)
    c2 = punta(tip, 1.4 * s, tilt + 15, yaw)
    m.box(nombre + '_cabello2', c2, (0.7 * s, 1.6 * s, 0.7 * s), 'cabello_light', tilt=tilt + 80, yaw=yaw)
    return tip


def espiga(m, top):
    """Panoja: eje central y ramas laterales inclinadas. 6 cubos."""
    m.box('espiga_eje', top, (0.7, 6.0, 0.7), 'espiga')
    ramas = [(0.8, 30, 3.6), (1.4, 150, 3.4), (2.0, 270, 3.2), (2.8, 90, 2.6), (3.4, 210, 2.2)]
    for k, (h, yaw, L) in enumerate(ramas):
        m.box(f'espiga_rama{k}', (0, top[1] + h, 0), (0.5, L, 0.5), ('espiga', 'espiga_dark')[k % 2],
              tilt=55, yaw=yaw)


def madurez():
    """Planta adulta: tallo alto con nudos, 8 hojas, 2 mazorcas con cabello y espiga. 55 cubos."""
    m = Model('maiz_madurez', PAL)
    monticulo(m)
    raices(m, 4)
    segs = [4, 4, 4, 4, 4, 4, 4]
    nudos = tallo(m, segs, 1.8, cols=('maiz_tallo', 'maiz_tallo'))
    for k, h in enumerate(nudos[:-1]):
        m.box(f'nudo{k}', (0, h - 0.3, 0), (2.1, 0.6, 2.1), 'maiz_tallo_dark')
    alturas = [4.5, 8.0, 11.5, 15.0, 18.5, 22.0, 25.0, 28.0]
    largos = [8.0, 9.4, 9.6, 9.6, 9.2, 8.2, 7.0, 5.2]
    for k, (h, L) in enumerate(zip(alturas, largos)):
        yaw = PLANO + (k % 2) * 180 + (k - 3) * 7
        if k == 0:
            cols = ('hoja_marchita', 'hoja_seca')      # hoja basal ya senescente
        elif k < 3:
            cols = ('maiz_hoja_dark', 'maiz_hoja')
        else:
            cols = ('maiz_hoja', 'maiz_hoja_light')
        hoja(m, f'hoja{k}', (0, h, 0), yaw, L, ancho=2.2, cols=cols, t1=42 - k * 2, t2=118)
    # mazorcas en axilas, fuera del plano de las hojas para que no choquen
    mazorca(m, 'mazorca1', (0, 12.0, 0), PLANO - 45, escala=1.0)
    mazorca(m, 'mazorca2', (0, 16.0, 0), PLANO + 120, escala=0.75)
    espiga(m, (0, nudos[-1], 0))
    return m


def podrida():
    """Desenlace de estres: tallo acamado y quebrado, hojas secas, mazorca con moho, moscas. 43 cubos."""
    m = Model('maiz_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.8, 2, 1.2), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (-2.4, 2, -1.2), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    raices(m, 3, col='podrido', largo=2.8)
    # tallo: base inclinada, quiebre y parte superior colgando (acame)
    lado = PLANO - 20
    m.box('tallo0', BASE, (1.8, 6, 1.8), 'hoja_seca_dark', tilt=6, yaw=lado)
    m.box('moho_base', BASE, (2.2, 1.6, 2.2), 'moho_dark', tilt=6, yaw=lado)
    p1 = punta(BASE, 6, 6, lado)
    m.box('nudo0', p1, (2.1, 0.6, 2.1), 'podrido', tilt=6, yaw=lado)
    m.box('tallo1', p1, (1.7, 6, 1.7), 'hoja_seca', tilt=16, yaw=lado)
    p2 = punta(p1, 6, 16, lado)
    m.box('quiebre', p2, (2.1, 0.9, 2.1), 'podrido_dark', tilt=16, yaw=lado)
    m.box('tallo2', p2, (1.5, 5.0, 1.5), 'hoja_seca_dark', tilt=125, yaw=lado)
    p3 = punta(p2, 5.0, 125, lado)
    # espiga rota colgando hacia el suelo
    m.box('espiga_eje', p3, (0.6, 2.6, 0.6), 'espiga_dark', tilt=170, yaw=lado)
    m.box('espiga_rama0', p3, (0.4, 2.0, 0.4), 'hoja_seca_dark', tilt=140, yaw=lado - 40)
    m.box('espiga_rama1', p3, (0.4, 1.8, 0.4), 'espiga_dark', tilt=150, yaw=lado + 50)
    # hojas secas colgando, asimetricas
    specs = [((0, 3.5, 0), PLANO + 200, 6.0, ('hoja_seca_dark', 'podrido'), 75, 140),
             ((0, 6.0, 0), PLANO + 30, 6.0, ('hoja_seca', 'hoja_seca_dark'), 70, 140),
             (punta(p1, 2.5, 16, lado), PLANO + 190, 6.0, ('hoja_marchita', 'hoja_seca'), 60, 130),
             (punta(p1, 5.0, 16, lado), PLANO + 20, 5.0, ('hoja_seca', 'hoja_seca_light'), 80, 145),
             (punta(p2, 2.0, 125, lado), PLANO + 200, 3.6, ('hoja_seca_dark', 'podrido'), 100, 160)]
    for k, (b, yaw, L, cols, t1, t2) in enumerate(specs):
        hoja(m, f'hoja{k}', b, yaw, L, ancho=1.8, cols=cols, t1=t1, t2=t2)
    # hojas caidas sobre el lomo y el suelo
    m.box('hoja_suelo1', (3.0, 2, -1.0), (1.6, 0.3, 5.0), 'hoja_seca', yaw=-60)
    m.box('hoja_suelo2', (-5.0, 1, 3.6), (1.5, 0.3, 4.2), 'hoja_seca_dark', yaw=70)
    m.box('hoja_suelo3', (-5.6, 1, -3.8), (1.4, 0.3, 3.2), 'podrido', yaw=10)
    m.box('hoja_suelo4', (5.2, 1, 3.8), (1.2, 0.3, 3.0), 'hoja_seca_light', yaw=-30)
    # mazorca caida, tumbada sobre el lomo al frente izquierdo, con moho
    eje = 105
    du = (math.sin(math.radians(eje)), math.cos(math.radians(eje)))

    def sobre(u, y):
        """Punto a u unidades a lo largo del eje de la mazorca tumbada."""
        return (-2.2 + u * du[0], y, 1.4 + u * du[1])
    m.box('mazorca_toto', sobre(0, 2), (2.4, 1.8, 5.0), 'totomoxtle_seco', yaw=eje)
    m.box('mazorca_grano', sobre(-1.2, 2.2), (2.0, 1.8, 2.4), 'podrido', yaw=eje)
    m.box('mazorca_moho1', sobre(-0.8, 3.8), (1.8, 0.6, 2.2), 'moho_light', yaw=eje + 15)
    m.box('mazorca_moho2', sobre(1.2, 3.6), (1.2, 0.6, 1.2), 'moho', yaw=eje + 40)
    m.box('mazorca_moho3', sobre(-2.2, 2.0), (1.0, 1.2, 1.0), 'moho_dark', yaw=eje + 10)
    m.box('mazorca_cabello', sobre(2.8, 2.0), (0.8, 0.6, 1.4), 'podrido_dark', yaw=eje - 20)
    # mazorca chica aun pegada al tallo, ennegrecida
    pm = punta(BASE, 4.5, 6, lado)
    m.box('mazorca2_ped', pm, (0.6, 1.2, 0.6), 'hoja_seca_dark', tilt=70, yaw=lado + 120)
    m2 = punta(pm, 1.0, 70, lado + 120)
    m.box('mazorca2_toto', m2, (1.6, 3.0, 1.6), 'hoja_seca_dark', tilt=80, yaw=lado + 120)
    m.box('mazorca2_moho', punta(m2, 1.4, 80, lado + 120), (1.8, 1.0, 1.8), 'moho', tilt=80, yaw=lado + 120)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.2, 6.6, 2.8, 20), (-3.8, 5.4, 0.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('maiz_siembra', siembra), ('maiz_brote', brote), ('maiz_crecimiento', crecimiento),
          ('maiz_madurez', madurez), ('maiz_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
