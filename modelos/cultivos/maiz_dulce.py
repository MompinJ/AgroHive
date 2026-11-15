"""Generador del maiz dulce (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/maiz_dulce.py

Maiz dulce (Zea mays var. saccharata), cosechado como elote tierno. Convenciones (docs/07):
1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente.
Todas las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0),
y caben en una huella de 16x16 centrada. Usa las utilidades de maiz.py (misma especie) sin
modificarlo. Colores solo de la paleta compartida, sin colores nuevos.

Rasgos que se respetan para distinguirlo del maiz de grano (maiz_madurez):
- Se cosecha TIERNO (estado lechoso, unas 3 semanas despues de que salen los cabellos): en madurez
  la planta sigue verde (todas las hojas verdes y la espiga verde clara, no dorada), los elotes
  tienen el totomoxtle verde fresco y bien cerrado, y los cabellos ya cafes en la punta.
- Grano tierno palido y lechoso (maiz_dulce_grano), no amarillo intenso; se ve en un elote con la
  punta abierta. El totomoxtle sobresale de la punta como una lengueta.
- La semilla seca de maiz dulce sale arrugada (genes su/sh2, "shrunken"): granos palidos con pliegue.
- Hijuelo (rebrote basal) comun en maiz dulce; aqui uno chico al pie de la planta.
- Planta un poco mas baja que el maiz de grano. Las alturas son CUALITATIVAS (decision de diseno),
  no medidas reales.

Fuentes de forma (consultadas el 15/11/2026):
- Cosecha en estado lechoso, cabellos cafes y totomoxtle verde:
  https://extension.msstate.edu/agriculture/crops/commercial-horticulture/sweet-corn/when-should-sweet-corn-be-harvested
  https://yardandgarden.extension.iastate.edu/faq/when-should-i-harvest-sweet-corn
- Semilla arrugada (sh2 = shrunken-2): https://www.uvm.edu/vtvegandberry/factsheets/corngenotypes.html
- Hijuelos en maiz dulce: https://yardandgarden.extension.iastate.edu/faq/should-we-remove-suckers-or-sideshoots-form-sweet-corn
  https://veggiescout.mgcafe.uky.edu/tilleringsuckering
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
from maiz import punta, hoja, monticulo, guardar, tallo, raices, esquinas  # noqa: E402  (misma especie)

BASE = (0, 2, 0)      # anclaje del tallo: encima del lomo (igual que el maiz)
PLANO = 110           # plano de las hojas disticas, en diagonal a la camara (igual que el maiz)
GRANO = 'maiz_dulce_grano'
GRANO_LUZ = 'maiz_dulce_grano_light'


# ---------------- utilidades ----------------
def ejes(tilt, yaw):
    """Ejes locales x y z de una caja girada [tilt, yaw, 0] (perpendiculares a su eje largo)."""
    t, y = math.radians(tilt), math.radians(yaw)
    ex = (math.cos(y), 0.0, -math.sin(y))
    ez = (math.cos(t) * math.sin(y), -math.sin(t), math.cos(t) * math.cos(y))
    return ex, ez


def desplazar(p, ex, ez, a, b):
    """Punto p movido a unidades sobre ex y b sobre ez."""
    return tuple(p[i] + a * ex[i] + b * ez[i] for i in range(3))


def semilla_arrugada(m, nombre, c, yaw, col=GRANO, s=1.0):
    """Grano seco de maiz dulce: cuerpo aplanado y un pliegue hundido encima. 2 cubos."""
    m.box(nombre, c, (1.3 * s, 0.6 * s, 1.6 * s), col, yaw=yaw)
    m.box(nombre + '_pliegue', (c[0], c[1] + 0.6 * s, c[2]), (0.35 * s, 0.15 * s, 1.2 * s), 'espiga', yaw=yaw + 12)


def hijuelo(m, nombre, yaw, alto, col_tallo='maiz_tallo', cols=('maiz_hoja', 'maiz_hoja_light')):
    """Rebrote basal: tallito inclinado hacia afuera con dos hojas. 3 cubos (o 5 si alto > 4)."""
    b = (1.0 * math.sin(math.radians(yaw)), 2.0, 1.0 * math.cos(math.radians(yaw)))
    p = m.stem(nombre, b, alto, 0.9, col_tallo, tilt=14, yaw=yaw)
    m.box(nombre + '_hoja0', punta(b, alto * 0.5, 14, yaw), (1.2, alto * 0.7, 0.3), cols[0], tilt=55, yaw=yaw + 40)
    m.box(nombre + '_punta', p, (0.7, alto * 0.45, 0.3), cols[1], tilt=30, yaw=yaw - 20)
    if alto > 4:
        hoja(m, nombre + '_hoja1', punta(b, alto * 0.75, 14, yaw), yaw - 60, alto * 0.9, ancho=1.2,
             cols=cols, t1=40, t2=110, grosor=0.4)
    return p


def elote(m, nombre, base, yaw, escala=1.0, tilt=26, abierto=False):
    """Elote tierno en la axila: pedunculo, totomoxtle verde fresco, lengueta y cabellos.

    Cerrado: 7 cubos. Abierto (punta deshojada que deja ver el grano palido): 10 cubos."""
    s = escala
    p = m.stem(nombre + '_ped', base, 1.2 * s, 0.7 * s, 'totomoxtle_dark', tilt=tilt + 22, yaw=yaw)
    m.box(nombre + '_toto_base', p, (2.5 * s, 1.4 * s, 2.5 * s), 'totomoxtle_dark', tilt=tilt, yaw=yaw)
    ex, ez = ejes(tilt, yaw)
    if not abierto:
        m.box(nombre + '_toto', p, (2.2 * s, 5.0 * s, 2.2 * s), 'totomoxtle', tilt=tilt, yaw=yaw)
        # el totomoxtle se cierra en una lengueta que sobresale de la punta
        q = punta(p, 5.0 * s, tilt, yaw)
        m.box(nombre + '_lengueta', q, (1.3 * s, 1.3 * s, 1.3 * s), 'totomoxtle_dark', tilt=tilt, yaw=yaw)
        tip = punta(q, 1.3 * s, tilt, yaw)
        m.box(nombre + '_cabello', tip, (1.0 * s, 1.6 * s, 1.0 * s), 'cabello', tilt=tilt + 30, yaw=yaw)
        c2 = punta(tip, 1.4 * s, tilt + 30, yaw)
        m.box(nombre + '_cabello2', c2, (0.8 * s, 1.8 * s, 0.6 * s), 'cabello_light', tilt=tilt + 95, yaw=yaw)
        m.box(nombre + '_cabello3', tip, (0.6 * s, 1.6 * s, 0.6 * s), 'cabello_light', tilt=tilt + 70, yaw=yaw + 70)
        return tip
    # abierto: el totomoxtle cubre la mitad baja y la punta ensena el grano tierno
    m.box(nombre + '_toto', p, (2.3 * s, 3.2 * s, 2.3 * s), 'totomoxtle', tilt=tilt, yaw=yaw)
    g = punta(p, 2.6 * s, tilt, yaw)
    m.box(nombre + '_grano', g, (2.0 * s, 2.8 * s, 2.0 * s), GRANO, tilt=tilt, yaw=yaw)
    # hileras de grano en relieve, con brillo lechoso, en la cara que ve la camara
    m.box(nombre + '_hilera', desplazar(g, ex, ez, 0.0, 1.0 * s), (1.4 * s, 2.4 * s, 0.3 * s), GRANO_LUZ,
          tilt=tilt, yaw=yaw)
    tip = punta(g, 2.8 * s, tilt, yaw)
    m.box(nombre + '_grano_punta', tip, (1.3 * s, 0.6 * s, 1.3 * s), GRANO_LUZ, tilt=tilt, yaw=yaw)
    # dos hojas del totomoxtle abiertas a los lados, dobladas hacia abajo como petalos
    c = punta(p, 3.0 * s, tilt, yaw)
    for k, lado in enumerate((1, -1)):
        h = desplazar(c, ex, ez, lado * 1.0 * s, 0.0)
        m.box(f'{nombre}_hoja_abierta{k}', h, (1.7 * s, 2.4 * s, 0.3 * s), ('totomoxtle', 'totomoxtle_dark')[k],
              tilt=125, yaw=yaw + lado * 90)
    tip2 = punta(tip, 0.6 * s, tilt, yaw)
    m.box(nombre + '_cabello', tip2, (0.9 * s, 1.4 * s, 0.9 * s), 'cabello', tilt=tilt + 60, yaw=yaw)
    m.box(nombre + '_cabello2', punta(tip2, 1.2 * s, tilt + 60, yaw), (0.6 * s, 1.4 * s, 0.6 * s), 'cabello_light',
          tilt=tilt + 120, yaw=yaw)
    return tip


def espiga_verde(m, top, escala=1.0):
    """Espiga todavia verde (planta tierna): eje y 5 ramas cortas. 6 cubos."""
    s = escala
    m.box('espiga_eje', top, (0.7, 5.2 * s, 0.7), 'maiz_tallo_light')
    ramas = [(0.8, 30, 3.2), (1.3, 150, 3.0), (1.9, 270, 2.8), (2.6, 90, 2.4), (3.2, 210, 2.0)]
    for k, (h, yaw, L) in enumerate(ramas):
        m.box(f'espiga_rama{k}', (0, top[1] + h * s, 0), (0.5, L * s, 0.5),
              ('maiz_hoja_light', 'maiz_tallo_light')[k % 2], tilt=50, yaw=yaw)


def guardar_centrado(m, nombre):
    """Guarda con guardar() del maiz y avisa si la caja no queda centrada en la celda."""
    ruta = guardar(m, nombre)
    lo, hi = esquinas(m)
    cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2
    print(f'  centro x={cx:.2f} z={cz:.2f}' + ('  AVISO: descentrado' if max(abs(cx), abs(cz)) >= 1.6 else ''))
    return ruta


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: tres granos arrugados y palidos en el hoyo, terron. 9 cubos mas el lomo."""
    m = Model('maiz_dulce_siembra', PAL)
    monticulo(m)
    m.box('humedad', (0, 2, 0), (7.0, 0.2, 4.4), 'suelo_humedo')
    m.box('hoyo', (0, 2.2, 0), (3.8, 0.1, 2.8), 'soil_dark')
    semilla_arrugada(m, 'semilla1', (-1.0, 2.3, 0.3), 20, GRANO)
    semilla_arrugada(m, 'semilla2', (1.0, 2.3, -0.5), -35, GRANO_LUZ)
    semilla_arrugada(m, 'semilla3', (0.3, 2.3, 1.0), 70, GRANO, s=0.9)
    m.box('terron', (3.6, 2, 1.4), (1.5, 0.9, 1.3), 'suelo_humedo', yaw=30)
    return m


def brote():
    """Plantula: coleoptilo, dos hojitas arqueadas y el grano arrugado a un lado. 8 cubos mas el lomo."""
    m = Model('maiz_dulce_brote', PAL)
    monticulo(m)
    m.box('hoyo', (0, 2, 0), (3.0, 0.3, 2.4), 'suelo_humedo')
    m.box('coleoptilo', BASE, (1.0, 2.6, 1.0), 'maiz_tallo_light')
    m.box('hojita1', (0, 2.6, 0), (1.4, 3.0, 0.4), 'maiz_hoja', tilt=60, yaw=PLANO)
    hoja(m, 'hojita2', (0, 3.4, 0), PLANO + 180, 4.0, ancho=1.4, cols=('maiz_hoja', 'maiz_hoja_light'),
         t1=35, t2=95, grosor=0.4)
    m.box('cogollo', (0, 4.4, 0), (0.6, 1.5, 0.6), 'maiz_hoja_light', tilt=10, yaw=PLANO)
    semilla_arrugada(m, 'semilla', (1.6, 2.3, 0.9), 25, GRANO, s=0.85)
    return m


def crecimiento():
    """Planta vegetativa verde: tallo medio, 6 hojas largas, cogollo e hijuelo chico. 26 cubos."""
    m = Model('maiz_dulce_crecimiento', PAL)
    monticulo(m)
    raices(m, 3, largo=2.4)
    nudos = tallo(m, [3.5, 3.5, 3.5, 3.0], 1.4, cols=('maiz_tallo', 'maiz_tallo'))
    alturas = [3.2, 5.6, 8.0, 10.4, 12.6, 14.4]
    largos = [7.6, 9.0, 9.6, 9.4, 8.2, 6.2]
    for k, (h, L) in enumerate(zip(alturas, largos)):
        yaw = PLANO + (k % 2) * 180 + (k - 2) * 8
        cols = ('maiz_hoja_dark', 'maiz_hoja') if k < 2 else ('maiz_hoja', 'maiz_hoja_light')
        hoja(m, f'hoja{k}', (0, h, 0), yaw, L, ancho=1.9, cols=cols, t1=40 - k * 2, t2=115)
    top = nudos[-1]
    m.box('cogollo', (0, top, 0), (1.0, 2.8, 1.0), 'maiz_hoja_light')
    m.box('cogollo_hoja', (0, top + 0.5, 0), (1.0, 3.0, 0.4), 'maiz_hoja', tilt=18, yaw=PLANO + 90)
    hijuelo(m, 'hijuelo', 20, 3.2, col_tallo='maiz_tallo_light')
    return m


def madurez():
    """Planta tierna lista para elote: verde, mas baja que el maiz de grano, espiga verde clara,
    2 elotes con totomoxtle fresco y cabellos (uno con la punta abierta) e hijuelo. 57 cubos."""
    m = Model('maiz_dulce_madurez', PAL)
    monticulo(m)
    raices(m, 4, largo=3.0)
    nudos = tallo(m, [3.6] * 6, 1.7, cols=('maiz_tallo', 'maiz_tallo'))
    for k, h in enumerate(nudos[:-1]):
        m.box(f'nudo{k}', (0, h - 0.3, 0), (2.0, 0.6, 2.0), 'maiz_tallo_dark')
    alturas = [4.0, 7.2, 10.4, 13.6, 16.8, 19.8, 22.4]
    largos = [8.4, 9.6, 9.8, 9.6, 9.0, 7.6, 5.6]
    for k, (h, L) in enumerate(zip(alturas, largos)):
        yaw = PLANO + (k % 2) * 180 + (k - 3) * 7
        cols = ('maiz_hoja_dark', 'maiz_hoja') if k < 3 else ('maiz_hoja', 'maiz_hoja_light')
        hoja(m, f'hoja{k}', (0, h, 0), yaw, L, ancho=2.1, cols=cols, t1=42 - k * 2, t2=118)
    # elotes en axilas, fuera del plano de las hojas: el de abajo abierto hacia la camara
    elote(m, 'elote1', (0, 9.6, 0), -15, escala=1.15, tilt=32, abierto=True)
    elote(m, 'elote2', (0, 13.4, 0), 170, escala=1.0, tilt=30)
    espiga_verde(m, (0, nudos[-1], 0))
    hijuelo(m, 'hijuelo', 350, 3.6)
    return m


def podrida():
    """Desenlace de estres: planta doblada, hojas secas, elote con grano podrido y moho, moscas. 45 cubos."""
    m = Model('maiz_dulce_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (1.6, 2, 1.4), (3.6, 0.2, 0.5), 'suelo_grieta', yaw=30)
    m.box('charco_podrido', (-1.8, 2, -1.4), (2.6, 0.2, 2.0), 'podrido_dark', yaw=-15)
    raices(m, 3, col='podrido', largo=2.6)
    # tallo doblado: base inclinada, codo y parte alta vencida hacia el suelo
    lado = 300
    m.box('tallo0', BASE, (1.6, 6.0, 1.6), 'hoja_marchita', tilt=8, yaw=lado)
    m.box('moho_base', BASE, (2.0, 1.4, 2.0), 'moho_dark', tilt=8, yaw=lado)
    p1 = punta(BASE, 6.0, 8, lado)
    m.box('nudo0', p1, (1.9, 0.6, 1.9), 'podrido', tilt=8, yaw=lado)
    m.box('tallo1', p1, (1.5, 4.0, 1.5), 'hoja_seca', tilt=42, yaw=lado)
    p2 = punta(p1, 4.0, 42, lado)
    m.box('codo', p2, (1.8, 0.8, 1.8), 'podrido_dark', tilt=42, yaw=lado)
    m.box('tallo2', p2, (1.3, 3.4, 1.3), 'hoja_seca_dark', tilt=118, yaw=lado)
    p3 = punta(p2, 3.4, 118, lado)
    # espiga marchita colgando
    m.box('espiga_eje', p3, (0.6, 2.2, 0.6), 'hoja_marchita', tilt=165, yaw=lado)
    m.box('espiga_rama0', p3, (0.4, 1.8, 0.4), 'hoja_seca', tilt=140, yaw=lado - 50)
    m.box('espiga_rama1', p3, (0.4, 1.6, 0.4), 'hoja_seca_dark', tilt=150, yaw=lado + 55)
    # hojas secas y marchitas colgando, asimetricas
    specs = [((0, 3.5, 0), PLANO + 10, 6.0, ('hoja_seca_dark', 'podrido'), 75, 140),
             ((0, 5.6, 0), PLANO + 190, 5.6, ('hoja_marchita', 'hoja_seca'), 65, 140),
             (punta(p1, 1.8, 42, lado), lado - 100, 5.0, ('hoja_seca', 'hoja_seca_dark'), 80, 145),
             (punta(p1, 3.4, 42, lado), lado + 80, 4.4, ('hoja_marchita', 'hoja_seca_light'), 70, 140)]
    for k, (b, yaw, L, cols, t1, t2) in enumerate(specs):
        hoja(m, f'hoja{k}', b, yaw, L, ancho=1.7, cols=cols, t1=t1, t2=t2)
    m.box('hoja_suelo1', (-3.4, 2, -1.4), (1.5, 0.3, 4.4), 'hoja_seca', yaw=-55)
    m.box('hoja_suelo2', (-5.2, 1, 3.6), (1.4, 0.3, 4.0), 'hoja_seca_dark', yaw=70)
    m.box('hoja_suelo3', (5.0, 1, -3.8), (1.2, 0.3, 2.8), 'hoja_marchita', yaw=-30)
    # elote aun pegado, colgando de su pedunculo: totomoxtle seco abierto y grano podrido con moho
    ya = 55
    q = m.stem('elote_ped', (0, 7.0, 0), 1.6, 0.7, 'hoja_seca_dark', tilt=100, yaw=ya)
    m.box('elote_toto', q, (2.1, 1.8, 2.1), 'totomoxtle_seco', tilt=168, yaw=ya)
    g = punta(q, 1.6, 168, ya)
    m.box('elote_grano', g, (2.0, 2.6, 2.0), 'podrido', tilt=168, yaw=ya)
    m.box('elote_moho1', punta(g, 0.8, 168, ya), (2.3, 1.0, 1.4), 'moho_light', tilt=168, yaw=ya + 30)
    m.box('elote_moho2', punta(g, 1.6, 168, ya), (1.4, 0.8, 2.3), 'moho', tilt=168, yaw=ya + 30)
    m.box('elote_punta', punta(g, 2.6, 168, ya), (1.2, 0.6, 1.2), 'podrido_dark', tilt=168, yaw=ya)
    m.box('elote_hoja_rota', q, (1.4, 2.6, 0.3), 'hoja_seca', tilt=150, yaw=ya + 80)
    # elote caido sobre el lomo, abierto, con el grano podrido y manchas de moho
    eje = 100
    du = (math.sin(math.radians(eje)), math.cos(math.radians(eje)))

    def sobre(u, y):
        """Punto a u unidades a lo largo del eje del elote tumbado."""
        return (-2.6 + u * du[0], y, 2.4 + u * du[1])
    m.box('caido_toto', sobre(-1.4, 2), (2.3, 1.4, 3.0), 'hoja_seca', yaw=eje)
    m.box('caido_grano', sobre(0.9, 2), (2.0, 1.7, 2.8), 'podrido', yaw=eje)
    m.box('caido_moho1', sobre(0.7, 3.7), (1.6, 0.5, 1.8), 'moho', yaw=eje + 20)
    m.box('caido_moho2', sobre(1.8, 3.2), (1.0, 0.5, 1.0), 'moho_light', yaw=eje - 30)
    m.box('caido_punta', sobre(2.6, 2), (1.2, 1.1, 1.0), 'podrido_dark', yaw=eje)
    m.box('caido_cabello', sobre(3.4, 2), (0.6, 0.4, 1.2), 'podrido_dark', yaw=eje - 25)
    m.box('caido_hoja', sobre(-2.2, 2), (1.5, 0.3, 3.0), 'totomoxtle_seco', yaw=eje + 50)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(2.6, 6.2, 3.6, 20), (3.6, 4.4, 0.4, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('maiz_dulce_siembra', siembra), ('maiz_dulce_brote', brote), ('maiz_dulce_crecimiento', crecimiento),
          ('maiz_dulce_madurez', madurez), ('maiz_dulce_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar_centrado(f(), nombre)
