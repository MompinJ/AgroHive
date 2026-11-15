"""Modelos LIGEROS de bloque (AgroHive): un manchon de varias plantas simplificadas en surcos.

Correr desde la raiz del repo:
    python modelos/cultivos/bloques/bloques.py

En la escena cada bloque (celda de 10 x 10 m) usa uno de estos modelos en lugar de la planta detallada, que se
queda para la celda seleccionada. Es una representacion visual, NO a escala: el numero de plantas, su tamano y la
separacion de surcos son cualitativos.

Reglas (Mompin, 14/11; las exige web/src/escena/pruebas/bloques.test.ts):
- tope de 24 cubos por modelo (lomos incluidos); sin cara inferior en ningun cubo (texture null en down);
- un lomo bajo por surco: caja de 1 unidad de alto, base en y=0, largo >= 8 en x;
- 9 plantas de 1 o 2 cubos con variacion leve (+-15 % de altura, giro y desplazamiento) DETERMINISTA:
  el generador usa random.Random con una semilla fija por modelo, asi que regenerar da el mismo archivo;
- convenciones de docs/07 y la paleta compartida sin colores nuevos.

Trazado comun (para que una parcela de bloques pegados se lea continua): 3 surcos paralelos a x, separados
16/3 unidades (la misma distancia que queda entre el ultimo surco de un bloque y el primero del vecino), y 3 plantas
por surco con esa misma separacion (x = -16/3, 0, 16/3), tambien continuas entre bloques. Los lomos ocupan x[-8, 8].

Para agregar un cultivo/etapa: agregar su planta (1 o 2 cubos) a PLANTAS con las ayudas con_tallo/hoja/pieza/semilla
y la pareja a CULTIVOS_ETAPAS.
"""
import math
import os
import random
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CULTIVOS = os.path.abspath(os.path.join(AQUI, '..'))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas'))
sys.path.insert(0, os.path.join(RAIZ, 'modelos'))
sys.path.insert(0, CULTIVOS)

from voxelkit import Model  # noqa: E402
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402
from maiz import esquinas, punta  # noqa: E402

HUELLA = 8.0              # medio ancho de la celda (16 / 2)
TOPE_CUBOS = 24
ALTO_LOMO = 1.0           # 1 unidad (1 px de voxel); el lomo del modelo detallado es de 2
SEP_SURCO = 16.0 / 3.0    # continua entre bloques vecinos
SURCOS_Z = (-SEP_SURCO, 0.0, SEP_SURCO)
PLANTAS_X = (-SEP_SURCO, 0.0, SEP_SURCO)  # 3 plantas por surco, 9 por bloque
VARIA = 0.15              # +-15 % de altura


def r3(v):
    """Redondeo a 3 decimales para que el archivo sea estable y legible."""
    return round(v, 3)


def surcos(m, ancho=3.0, col='soil_light', zs=SURCOS_Z, largo=2 * HUELLA):
    """Un lomo bajo por surco (1 x ALTO_LOMO x ancho), base en y=0. Devuelve las z de los surcos."""
    for k, z in enumerate(zs):
        m.box(f'lomo{k}', (0, 0, r3(z)), (largo, ALTO_LOMO, ancho), col)
    return zs


def bloque(nombre, planta, semilla, zs=SURCOS_Z, xs=PLANTAS_X, jitter=0.35, extra=None):
    """Arma un bloque: lomos + una planta por posicion (surco x columna), con variacion determinista.

    planta(m, nombre, base, rng, escala) dibuja una planta con base en (x, ALTO_LOMO, z).
    extra(m, zs) agrega detalles por surco (p. ej. la franja humeda de siembra) antes de las plantas.
    """
    m = Model(nombre, PAL)
    rng = random.Random(semilla)
    surcos(m, zs=zs)
    if extra:
        extra(m, zs)
    for i, z in enumerate(zs):
        for j, x in enumerate(xs):
            dx = rng.uniform(-jitter, jitter)
            dz = rng.uniform(-jitter, jitter)
            escala = 1.0 + rng.uniform(-VARIA, VARIA)
            planta(m, f'p{i}{j}', (r3(x + dx), ALTO_LOMO, r3(z + dz)), rng, escala)
    for e in m.els:  # sin caras de abajo (decision de Mompin, 14/11): nunca se ven y pesan ~17 %
        e['faces']['down']['texture'] = None
    if len(m.els) > TOPE_CUBOS:
        raise ValueError(f'{nombre}: {len(m.els)} cubos, pasa el tope de {TOPE_CUBOS}')
    return m


def guardar(m, nombre):
    ruta = os.path.join(AQUI, nombre + '.bbmodel')
    n = m.save(ruta)
    lo, hi = esquinas(m)
    fuera = max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) > HUELLA + 0.01
    print(f'{nombre}: {n} cubos ({30 * n} vertices, sin cara inferior), x[{lo[0]:.2f},{hi[0]:.2f}] y[{lo[1]:.2f},{hi[1]:.2f}] '
          f'z[{lo[2]:.2f},{hi[2]:.2f}]' + ('  AVISO: sale de la huella 16x16' if fuera else ''))
    if lo[1] < -0.01:
        print(f'  AVISO: {nombre} baja de y=0')
    return ruta


class _Uno:
    def __init__(self, e):
        self.els = [e]


def caja_ajustada(m, nombre, base, size, col, tilt=0, yaw=0, margen=0.1):
    """Caja que debe quedar dentro de la huella. Si girada sale, prueba otros giros (yaw+180, +-90) y luego encoge
    TODAS sus dimensiones (sirve para hojas planas). Determinista: el orden de intentos es fijo."""
    w, h, d = size
    lim = HUELLA - margen
    for k in range(8):
        for dy in (0, 180, 90, -90):
            e = m.box(nombre, base, (r3(w), r3(h), r3(d)), col, tilt=tilt, yaw=r3(yaw + dy))
            lo, hi = esquinas(_Uno(e))
            if max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) <= lim and lo[1] >= -0.001:
                return e
            m.els.pop()
        w, h, d = w * 0.85, h * 0.85, d * 0.85
    raise ValueError(f'{nombre}: no cabe en la huella')


def a_lo_alto(base, alto):
    return (base[0], r3(base[1] + alto), base[2])


def lado_hoja(rng):
    return rng.choice((0, 180)) + rng.uniform(-35, 35)


# ---------------- plantas de 1 o 2 cubos ----------------
def franja_siembra(m, zs):
    """Tierra humeda recien removida a lo largo de cada lomo (1 cubo por surco)."""
    for k, z in enumerate(zs):
        m.box(f'franja{k}', (0, ALTO_LOMO, r3(z)), (2 * HUELLA - 1, 0.2, 1.4), 'suelo_humedo')


def semilla(cols, tam):
    """Siembra: una semilla asomando en el lomo (1 cubo)."""
    def planta(m, nombre, base, rng, escala):
        m.box(nombre, (base[0], base[1] + 0.2, base[2]), tuple(r3(t * escala) for t in tam), rng.choice(cols),
              yaw=r3(rng.uniform(-40, 40)))
    return planta


def con_tallo(col, alto, grueso, resto, tilt=None):
    """Planta de 2 cubos: un tallo (derecho, o acamado si tilt=(min, max)) y lo que dibuje resto() en su lugar."""
    def planta(m, nombre, base, rng, escala):
        h = alto * escala
        yaw = lado_hoja(rng)
        if tilt:
            caja_ajustada(m, nombre + '_tallo', base, (grueso, h, grueso), col, tilt=r3(rng.uniform(*tilt)), yaw=yaw)
        else:
            m.box(nombre + '_tallo', base, (grueso, r3(h), grueso), col)
        resto(m, nombre, base, rng, escala, h, yaw)
    return planta


def hoja(col, f, ancho, largo, t0, t1, giro=0):
    """Una hoja plana a la fraccion f del tallo, inclinada entre t0 y t1 grados."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        caja_ajustada(m, nombre + '_hoja', a_lo_alto(base, f * h), (ancho, largo * escala, 0.3), col,
                      tilt=r3(rng.uniform(t0, t1)), yaw=yaw + giro)
    return resto


def pieza(cols, f, grueso, largo, t0, t1, giro=0):
    """Un fruto, vaina o mazorca (caja delgada) a la fraccion f del tallo, inclinada entre t0 y t1."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        caja_ajustada(m, nombre + '_pieza', a_lo_alto(base, f * h), (grueso, largo * escala, grueso),
                      rng.choice(cols), tilt=r3(rng.uniform(t0, t1)), yaw=yaw + giro)
    return resto


def alterna(*restos):
    """Cada planta del bloque dibuja uno de los restos (el azar es el del bloque, determinista)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        rng.choice(restos)(m, nombre, base, rng, escala, h, yaw)
    return resto


def hoja_sobre_peciolo(col, ancho, f):
    """Hoja grande casi plana en lo alto del peciolo (calabaza)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        caja_ajustada(m, nombre + '_hoja', a_lo_alto(base, f * h), (ancho, 0.3, ancho), col,
                      tilt=r3(rng.uniform(-8, 8)), yaw=yaw)
    return resto


def fruto_calabaza(cols, ancho, alto):
    """Fruto de calabaza sobre el lomo, con su pedunculo (2 cubos, sin tallo)."""
    def planta(m, nombre, base, rng, escala):
        yaw = rng.uniform(-30, 30)
        a = alto * escala
        caja_ajustada(m, nombre + '_fruto', base, (ancho, a, ancho), rng.choice(cols), yaw=yaw)
        m.box(nombre + '_peduncu', a_lo_alto(base, a), (0.6, 0.5, 0.6), 'calabaza_fruto_dark')
    return planta


def fruto_podrido(ancho, alto):
    """Fruto de calabaza podrido con moho encima (2 cubos)."""
    def planta(m, nombre, base, rng, escala):
        a = alto * escala
        caja_ajustada(m, nombre + '_fruto', base, (ancho, a, ancho), 'podrido', yaw=rng.uniform(-30, 30))
        m.box(nombre + '_moho', a_lo_alto(base, a), (r3(ancho * 0.6), 0.6, r3(ancho * 0.6)), 'moho', yaw=r3(rng.uniform(0, 90)))
    return planta


def alterna_plantas(*plantas):
    def planta(m, nombre, base, rng, escala):
        rng.choice(plantas)(m, nombre, base, rng, escala)
    return planta


PLANTAS = {
    # maiz
    'maiz_siembra': semilla(('grano', 'grano_dark', 'grano_light'), (1.0, 0.7, 1.2)),
    'maiz_brote': con_tallo('maiz_tallo_light', 2.6, 0.6, hoja('maiz_hoja_light', 0.6, 1.1, 2.8, 40, 55)),
    'maiz_crecimiento': con_tallo('maiz_tallo', 5.5, 0.8, hoja('maiz_hoja', 0.55, 1.6, 3.6, 50, 62)),
    'maiz_madurez': con_tallo('maiz_tallo', 8.0, 0.8, alterna(
        hoja('maiz_hoja', 0.62, 1.6, 4.2, 52, 64),
        pieza(('grano',), 0.5, 1.1, 2.2, 22, 28, 180))),
    'maiz_podrida': con_tallo('hoja_seca_dark', 4.2, 0.8, alterna(
        pieza(('podrido',), 0.0, 1.3, 1.5, 0, 0),
        hoja('hoja_seca', 0.3, 1.4, 3.0, 95, 115, 150)), tilt=(20, 32)),
    # frijol
    'frijol_siembra': semilla(('frijol_negro',), (0.9, 0.6, 1.2)),
    'frijol_brote': con_tallo('frijol_hoja_dark', 2.3, 0.6, hoja('vaina', 0.8, 1.6, 1.4, 55, 70)),
    'frijol_crecimiento': con_tallo('frijol_hoja_dark', 4.6, 0.6, hoja('frijol_hoja', 0.7, 2.2, 2.3, 62, 76)),
    'frijol_madurez': con_tallo('frijol_hoja_dark', 5.2, 0.6, alterna(
        hoja('frijol_hoja', 0.8, 2.0, 2.2, 62, 76),
        pieza(('vaina', 'vaina_dark'), 0.6, 0.5, 2.8, 160, 170, 180))),
    'frijol_podrida': con_tallo('hoja_seca_dark', 4.0, 0.6, alterna(
        pieza(('frijol_negro',), 0.5, 0.6, 2.2, 120, 140, 60),
        hoja('hoja_seca', 0.4, 1.8, 2.2, 95, 115, 160)), tilt=(20, 32)),
    # calabaza
    'calabaza_siembra': semilla(('calabaza_crema',), (1.1, 0.6, 1.6)),
    'calabaza_brote': con_tallo('calabaza_hoja_dark', 1.3, 0.6, hoja('calabaza_hoja_light', 0.85, 2.0, 1.7, 62, 76)),
    'calabaza_crecimiento': con_tallo('calabaza_hoja_dark', 2.6, 0.6, hoja_sobre_peciolo('calabaza_hoja', 2.6, 1.0)),
    'calabaza_madurez': alterna_plantas(
        fruto_calabaza(('calabaza_fruto', 'calabaza_naranja'), 2.2, 1.8),
        con_tallo('calabaza_hoja_dark', 3.0, 0.6, hoja_sobre_peciolo('calabaza_hoja', 2.6, 1.0))),
    'calabaza_podrida': alterna_plantas(
        fruto_podrido(2.0, 1.4),
        con_tallo('hoja_seca_dark', 2.0, 0.6, hoja_sobre_peciolo('hoja_seca', 2.2, 1.0))),
    # sorgo
    'sorgo_siembra': semilla(('cabello', 'wood'), (0.7, 0.5, 0.8)),
    'sorgo_brote': con_tallo('maiz_tallo_light', 2.8, 0.5, hoja('maiz_hoja', 0.6, 0.9, 3.0, 45, 60)),
    'sorgo_crecimiento': con_tallo('maiz_tallo', 6.0, 0.7, hoja('maiz_hoja', 0.55, 1.2, 4.0, 52, 64)),
    'sorgo_madurez': con_tallo('maiz_tallo', 8.5, 0.7, pieza(('cabello', 'wood'), 1.0, 1.2, 2.4, 4, 14)),
    'sorgo_podrida': con_tallo('hoja_seca_dark', 4.4, 0.7, alterna(
        pieza(('podrido', 'moho'), 0.9, 1.1, 2.2, 150, 170),
        hoja('hoja_seca', 0.3, 1.4, 3.0, 95, 115, 150)), tilt=(20, 32)),
    # chile
    'chile_siembra': semilla(('chile_semilla',), (0.8, 0.5, 1.0)),
    'chile_brote': con_tallo('chile_hoja_dark', 2.4, 0.6, hoja('chile_hoja_light', 0.85, 1.4, 1.5, 55, 70)),
    'chile_crecimiento': con_tallo('chile_hoja_dark', 4.6, 0.7, hoja('chile_hoja', 0.6, 1.8, 2.0, 50, 62)),
    'chile_madurez': con_tallo('chile_hoja_dark', 5.2, 0.8, alterna(
        pieza(('red',), 0.6, 0.7, 2.4, 160, 170, 180),
        pieza(('chile_verde',), 0.7, 0.7, 2.0, 160, 170, 90))),
    'chile_podrida': con_tallo('hoja_seca_dark', 3.6, 0.7, alterna(
        pieza(('podrido',), 0.5, 0.7, 2.2, 140, 155, 70),
        hoja('hoja_marchita', 0.4, 1.6, 2.0, 95, 115, 160)), tilt=(20, 32)),
}

CULTIVOS_ETAPAS = [(c, e) for c in ('maiz', 'frijol', 'calabaza', 'chile', 'sorgo')
                   for e in ('siembra', 'brote', 'crecimiento', 'madurez', 'podrida')]


def modelo(cultivo, etapa):
    clave = f'{cultivo}_{etapa}'
    return bloque(clave + '_bloque', PLANTAS[clave], clave + '_bloque', extra=franja_siembra if etapa == 'siembra' else None)


MODELOS = [(f'{c}_{e}_bloque', (lambda c=c, e=e: modelo(c, e))) for c, e in CULTIVOS_ETAPAS]

if __name__ == '__main__':
    for nombre, f in MODELOS:
        guardar(f(), nombre)
