"""Generador del ejote (AgroHive) en 5 etapas: siembra, brote, crecimiento, madurez, podrida.

Correr desde la raiz del repo:
    python modelos/cultivos/ejote.py

Ejote o judia verde de mata (Phaseolus vulgaris cosechado como vaina tierna). Convenciones (docs/07):
1 celda = 16 unidades, origen en el centro de la base, y=0 superficie, +Y arriba, +Z frente. Todas
las etapas comparten el lomo de surco del maiz (14x2x10) y el anclaje del tallo (0, 2, 0), y caben
en una huella de 16x16. Las alturas y largos son cualitativos, no medidas reales (el ejote esta
exagerado a proposito para que se lea a 20 px).

Rasgos que se respetan para no confundirlo con el frijol, la soya y el caupi: es la misma especie
que el frijol, asi que reutiliza su mata en domo de hojas trifoliadas (foliolos romboidales, tallo
en zigzag) y sus utilidades; lo que cambia es la cosecha, que es VERDE: muchas vainas LARGAS,
delgadas y cilindricas, verde brillante (ejote_vaina*), que cuelgan casi rectas bajo el domo y
entre las hojas, con su piquito curvo en la punta. El domo va alto sobre un tallo corto para que
los ejotes se vean debajo. Flores blancas chicas (el frijol negro las tiene lilas). Semilla blanca
o crema sin ojo negro (el caupi lo tiene y el frijol de milpa es negro). En la madurez no hay
vainas amarillas ni semilla negra: eso es del frijol. Colores de la paleta fija, sin colores nuevos.

Fuentes de forma (consultadas el 15/11/2026):
- UConn Home & Garden, Snap Beans: el ejote de mata se sostiene solo, mide de 30 a 60 cm y da su
  cosecha en 1 a 3 semanas; las vainas se cortan tiernas, antes de que se marque la semilla.
  https://homegarden.cahnr.uconn.edu/snap-beans
- University of Idaho Extension, etapas del frijol ejotero (R1 flor abierta, R2-R3 vainas chicas en
  los nudos bajos, R8 hojas amarillas y vainas que se secan).
  https://objects.lib.uidaho.edu/uiext/uiext27958.pdf
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
from maiz import punta, monticulo, guardar  # noqa: E402  (utilidades compartidas de la milpa)
from frijol import mover, foliolo, trifoliada, tallo_zigzag, PLANO, SECA  # noqa: E402  (misma especie)

BASE = (0, 2, 0)      # anclaje del tallo: encima del monticulo (igual que el maiz)
FRENTE = 35           # direccion de la camara isometrica por defecto (desde +x +z)

VERDE = ('ejote_vaina', 'ejote_vaina_dark')          # cuerpo, piquito
VERDE_LUZ = ('ejote_vaina_light', 'ejote_vaina')
PODRIDO = ('podrido_dark', 'podrido')


# ---------------- utilidades ----------------
def ejote(m, nombre, p, yaw, largo, cols=VERDE, tilt=176, grueso=0.55, curva=16, gira=20):
    """Ejote colgando desde p: cuerpo recto y casi vertical y punta mas delgada que se curva (piquito). 2 cubos.

    curva: cuanto se dobla la punta hacia yaw + gira. Devuelve el extremo de la punta."""
    q = m.stem(nombre, p, largo * 0.55, grueso, cols[0], tilt=tilt, yaw=yaw)
    return m.stem(nombre + '_punta', q, largo * 0.5, grueso * 0.75, cols[1], tilt=tilt - curva, yaw=yaw + gira)


def flor(m, nombre, c, yaw, col='white'):
    """Flor blanca chica de frijol ejotero: estandarte y quilla en un cubo y un botoncito. 2 cubos."""
    m.box(nombre, c, (0.9, 0.8, 0.9), col, yaw=yaw)
    m.box(nombre + '_boton', mover(c, yaw + 90, 0.55, -0.5), (0.6, 0.6, 0.6), 'calabaza_crema', yaw=yaw + 20)


# ---------------- etapas ----------------
def siembra():
    """Lomo humedo recien sembrado: tres semillas blancas (una con su hilo crema) y dos terrones. 10 cubos."""
    m = Model('ejote_siembra', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (5.2, 0.3, 3.6), 'suelo_humedo')
    semillas = [((-1.3, 0.5), 20, 'white'), ((1.2, -0.5), -40, 'white'), ((0.4, 1.2), 75, 'calabaza_crema')]
    for k, ((x, z), yaw, col) in enumerate(semillas):
        m.box(f'semilla{k + 1}', (x, 2.3, z), (1.9, 1.0, 1.2), col, yaw=yaw)
    # hilo (la cicatriz de la semilla) en tono crema, sin ojo negro: no es caupi
    m.box('semilla1_hilo', (-1.3, 3.3, 0.5), (0.7, 0.12, 0.35), 'calabaza_crema', yaw=20)
    m.box('semilla2_hilo', (1.2, 3.3, -0.5), (0.7, 0.12, 0.35), 'calabaza_crema', yaw=-40)
    m.box('terron1', (4.2, 2, -1.6), (1.5, 0.9, 1.3), 'soil_dark', yaw=30)
    m.box('terron2', (-4.2, 2, 1.6), (1.3, 0.8, 1.2), 'soil_light', yaw=-20)
    return m


def brote():
    """Plantula epigea: tallito, 2 cotiledones crema, el primer par de hojas simples y la testa blanca. 11 cubos."""
    m = Model('ejote_brote', PAL)
    monticulo(m)
    m.box('humedo', (0, 2, 0), (3.2, 0.3, 2.6), 'suelo_humedo')
    m.box('tallito', BASE, (0.7, 3.8, 0.7), 'frijol_hoja')
    eje = FRENTE - 45      # cotiledones y hojas cruzados, los dos pares en diagonal a la camara
    for k in range(2):
        c = mover((0, 3.6, 0), eje + 180 * k, 0.9)
        m.box(f'cotiledon{k}', c, (1.4, 0.9, 1.9), ('calabaza_crema', 'white')[k], yaw=eje)
    top = (0, 5.8, 0)
    for k in range(2):
        yaw = eje + 90 + 180 * k
        p = m.stem(f'peciolo{k}', top, 1.2, 0.3, 'frijol_hoja_dark', tilt=65, yaw=yaw)
        foliolo(m, f'hoja{k}', mover(p, yaw, 1.1, -0.2), yaw, 2.4, ('frijol_hoja', 'frijol_hoja_light')[k], tilt=10)
    # cascara de la semilla tirada junto al tallito
    m.box('testa', (1.9, 2, 1.3), (1.1, 0.3, 0.7), 'white', yaw=60)
    return m


def crecimiento():
    """Matita trifoliada en zigzag con flores blancas y el primer ejote chiquito asomando. 30 cubos."""
    m = Model('ejote_crecimiento', PAL)
    monticulo(m)
    nudos = tallo_zigzag(m, [(2.6, 8, PLANO), (2.4, 12, PLANO + 180), (2.0, 12, PLANO)], 0.8)
    # un cotiledon que queda, ya arrugado
    m.box('cotiledon0', (0.5, 3.4, 0.3), (1.0, 0.6, 1.2), 'hoja_marchita', yaw=40)
    # hojas primarias (simples y opuestas) en el primer nudo
    for k, yaw in enumerate((130, 310)):
        p = m.stem(f'primaria{k}_pec', nudos[0], 1.8, 0.35, 'frijol_hoja_dark', tilt=70, yaw=yaw)
        foliolo(m, f'primaria{k}', mover(p, yaw, 1.2, -0.2), yaw, 2.4, 'frijol_hoja_dark', tilt=12)
    # trifoliadas alternas
    specs = [(nudos[1], 30, 3.0, 2.6, 58), (nudos[1], 220, 2.6, 2.4, 52), (nudos[2], 100, 2.4, 2.4, 40)]
    for k, (b, yaw, L, s, t) in enumerate(specs):
        trifoliada(m, f'trifoliada{k}', b, yaw, L, s, tilt_pec=t)
    # racimos florales blancos que asoman sobre la mata
    for k, (yaw, L) in enumerate([(FRENTE - 20, 2.4), (FRENTE + 160, 2.2)]):
        f = m.stem(f'pedunculo{k}', nudos[2], L, 0.3, 'frijol_hoja', tilt=24, yaw=yaw)
        flor(m, f'flor{k}', f, yaw)
    # primer ejote chiquito (R3) colgando del nudo bajo, hacia la camara
    ejote(m, 'ejote0', mover(nudos[1], FRENTE + 20, 1.1, -0.2), FRENTE + 20, 2.8, VERDE_LUZ, grueso=0.45)
    return m


def madurez():
    """Mata en domo lleno, flores blancas y 9 ejotes largos verde brillante colgando entre las hojas. 60 cubos."""
    m = Model('ejote_madurez', PAL)
    monticulo(m)
    nudos = tallo_zigzag(m, [(2.6, 6, PLANO), (2.8, 12, PLANO + 180), (2.4, 10, PLANO)], 0.9)
    # anillo bajo: tres trifoliadas casi acostadas atras y a los lados; son el fondo verde de los ejotes
    for k, (yaw, cols) in enumerate([(FRENTE + 130, None), (FRENTE + 180, ('frijol_hoja_dark', 'frijol_hoja_dark',
                                                                          'hoja_marchita')), (FRENTE + 230, None)]):
        trifoliada(m, f'baja{k}', nudos[0], yaw, 2.8, 2.6, cols=cols or ('frijol_hoja_dark', 'frijol_hoja_dark',
                                                                          'frijol_hoja'), tilt_pec=78)
    # nivel medio: tres ramas (al frente y a los lados) con su trifoliada; de ellas cuelgan los ejotes
    ramas = [(FRENTE, 2.8, 50), (FRENTE + 85, 3.2, 62), (FRENTE - 85, 3.2, 62)]
    puntas = []
    for k, (yaw, L, t) in enumerate(ramas):
        puntas.append(m.stem(f'rama{k}', nudos[1], L, 0.55, 'frijol_hoja_dark', tilt=t, yaw=yaw))
        trifoliada(m, f'trifoliada{k}', puntas[-1], yaw, 1.4, 2.6, tilt_pec=70)
    # copa: dos trifoliadas altas que cierran el domo, con dos flores blancas tardias encima
    for k, (yaw, t, s) in enumerate([(FRENTE + 135, 35, 2.4), (FRENTE - 45, 30, 2.3)]):
        p = trifoliada(m, f'copa{k}', nudos[2], yaw, 2.0, s, tilt_pec=t)
        m.box(f'flor{k}', mover(p, yaw + 90, 0.4, 0.1), (0.9, 0.8, 0.9), 'white', yaw=yaw)
    # ejotes: bajo cada rama (su punta y el foliolo de afuera) y uno del centro; sueltos, de largos distintos,
    # con la punta en el aire sobre el lomo y delante de las hojas bajas; los de enfrente mas claros
    cuelgan = [(0, -40, 0.5, 4.8, VERDE_LUZ), (0, 40, 0.5, 4.2, VERDE), (0, 0, 1.6, 5.2, VERDE_LUZ), (0, -85, 1.5, 4.4, VERDE),
               (1, -45, 0.5, 4.4, VERDE), (1, 30, 1.5, 4.8, VERDE_LUZ),
               (2, 45, 0.5, 4.6, VERDE_LUZ), (2, -30, 1.5, 4.2, VERDE)]
    for j, (k, da, d, lg, cols) in enumerate(cuelgan):
        yaw = ramas[k][0]
        ejote(m, f'ejote{j}', mover(puntas[k], yaw + da, d, -0.1), yaw + da, lg, cols, gira=(25 if j % 2 else -25))
    ejote(m, 'ejote8', mover(nudos[2], FRENTE + 25, 1.0, -0.4), FRENTE + 25, 5.0, VERDE, gira=-20)
    return m


def podrida():
    """Desenlace de estres: mata vencida en arco, ejotes negros largos con moho colgando y tirados, moscas. 46 cubos."""
    m = Model('ejote_podrida', PAL)
    monticulo(m, seco=True)
    m.box('grieta1', (-1.8, 2, -1.4), (4.0, 0.2, 0.5), 'suelo_grieta', yaw=25)
    m.box('grieta2', (2.6, 2, -1.2), (0.5, 0.2, 3.0), 'suelo_grieta', yaw=-15)
    # tallo vencido en arco hacia un lado (de perfil a la camara): sube, se quiebra y la punta cae
    lado = FRENTE + 90
    p0 = m.stem('tallo0', BASE, 3.4, 0.9, 'hoja_seca_dark', tilt=12, yaw=lado)
    m.box('moho_base', BASE, (1.4, 1.0, 1.4), 'moho_dark', tilt=12, yaw=lado)
    p1 = m.stem('tallo1', p0, 3.0, 0.8, 'hoja_seca', tilt=45, yaw=lado)
    m.box('quiebre', p1, (1.1, 0.7, 1.1), 'podrido_dark', tilt=45, yaw=lado)
    p2 = m.stem('tallo2', p1, 2.8, 0.7, 'hoja_seca_dark', tilt=135, yaw=lado)
    # rama seca al otro lado, casi horizontal
    ra = m.stem('rama0', p0, 3.0, 0.55, 'hoja_seca_dark', tilt=72, yaw=lado + 180)
    # trifoliadas marchitas con los foliolos caidos
    trifoliada(m, 'trifoliada0', ra, lado + 180, 1.0, 2.3, cols=SECA, tilt_pec=110, caida=0.8)
    trifoliada(m, 'trifoliada1', p1, FRENTE + 180, 1.6, 2.2, cols=('hoja_seca_dark', 'hoja_seca', 'hoja_marchita'),
               tilt_pec=105, caida=0.8)
    trifoliada(m, 'trifoliada2', p2, lado, 1.0, 2.0, cols=('podrido', 'hoja_seca_dark', 'hoja_seca'),
               tilt_pec=150, caida=0.5)
    # ejotes podridos colgando del arco y de la rama: largos todavia, negros y con moho; uno a medio pudrir
    cuelgan = [(mover(p1, FRENTE, 0.5, -0.3), FRENTE - 20, 4.6, PODRIDO, 'moho_light'),
               (mover(p1, FRENTE + 60, 0.6, -0.3), FRENTE + 70, 4.0, ('ejote_vaina_dark', 'podrido_dark'), None),
               (mover(ra, FRENTE, 0.4, -0.2), FRENTE + 10, 3.6, ('podrido', 'podrido_dark'), 'moho'),
               (mover(ra, FRENTE + 180, 0.5, -0.2), FRENTE + 160, 3.2, PODRIDO, None)]
    for k, (r, yaw, lg, cols, moho) in enumerate(cuelgan):
        ejote(m, f'ejote{k}', r, yaw, lg, cols, tilt=172, curva=24, gira=(30 if k % 2 else -30))
        if moho:
            m.box(f'ejote{k}_moho', punta(r, lg * 0.3, 172, yaw), (0.9, 0.7, 0.9), moho, yaw=yaw)
    # ejotes caidos al frente del lomo, aguados y con moho
    m.box('ejote_suelo0', (-1.6, 2, 2.4), (0.6, 0.45, 5.0), 'podrido_dark', yaw=70)
    m.box('ejote_suelo0_moho', (-1.2, 2.45, 2.5), (0.9, 0.4, 1.8), 'moho_light', yaw=75)
    m.box('ejote_suelo1', (2.2, 2, 2.3), (0.6, 0.45, 4.4), 'black', yaw=-55)
    m.box('ejote_suelo1_moho', (2.4, 2.45, 2.2), (0.8, 0.35, 1.2), 'moho_dark', yaw=-55)
    m.box('ejote_suelo2', (4.6, 1, 4.2), (0.6, 0.45, 3.6), 'ejote_vaina_dark', yaw=95)
    m.box('ejote_suelo2_mancha', (4.4, 1.45, 4.2), (0.7, 0.3, 1.4), 'podrido_dark', yaw=95)
    # foliolos sueltos en las orillas
    caidas = [((-4.0, 2, -1.6), 'hoja_marchita', -35), ((-5.8, 1, -3.6), 'hoja_seca_dark', 60),
              ((5.8, 1, -3.4), 'hoja_seca_light', 10), ((-5.9, 1, 3.8), 'hoja_seca', 25)]
    for k, (c, col, yaw) in enumerate(caidas):
        m.box(f'foliolo_suelo{k}', c, (1.6, 0.3, 1.6), col, yaw=yaw + 45)
    # moscas (lo unico que flota a proposito)
    for k, (x, y, z, a) in enumerate([(-1.0, 5.0, 3.6, 20), (1.6, 8.4, 3.0, -40)]):
        m.box(f'mosca{k}', (x, y, z), (0.6, 0.4, 0.6), 'black', yaw=a)
        m.box(f'mosca{k}_ala', (x, y + 0.4, z), (1.1, 0.1, 0.4), 'moho_light', yaw=a)
    return m


ETAPAS = [('ejote_siembra', siembra), ('ejote_brote', brote), ('ejote_crecimiento', crecimiento),
          ('ejote_madurez', madurez), ('ejote_podrida', podrida)]

if __name__ == '__main__':
    for nombre, f in ETAPAS:
        guardar(f(), nombre)
