"""Modelos LIGEROS de bloque (AgroHive): un manchon de varias plantas simplificadas en surcos.

Correr desde la raiz del repo:
    python modelos/cultivos/bloques/bloques.py

En la escena cada bloque (celda de 10 x 10 m) usa uno de estos modelos en lugar de la planta detallada, que se
queda para la celda seleccionada. Es una representacion visual, NO a escala: el numero de plantas, su tamano y la
separacion de surcos son cualitativos.

Reglas (Mompin, 14/11; las exige web/src/escena/pruebas/bloques.test.ts):
- tope de 55 cubos por modelo (lomos incluidos);
- un lomo bajo por surco: caja de 1 unidad de alto, base en y=0, largo >= 8 en x;
- 9 a 16 plantas de 1 a 4 cubos con variacion leve (+-15 % de altura, giro y desplazamiento) DETERMINISTA:
  el generador usa random.Random con una semilla fija por modelo, asi que regenerar da el mismo archivo;
- convenciones de docs/07 y la paleta compartida sin colores nuevos.

Trazado comun (para que una parcela de bloques pegados se lea continua): 3 surcos paralelos a x, separados
16/3 unidades (la misma distancia que queda entre el ultimo surco de un bloque y el primero del vecino), y 4 plantas
por surco cada 4 unidades (x = -6, -2, 2, 6), tambien continuas entre bloques. Los lomos ocupan x[-8, 8].

Para agregar un cultivo/etapa: escribir una funcion planta_<x>(m, nombre, base, rng) que dibuje 1 a 4 cubos y
llamar a bloque(...) con ella; registrar el par en MODELOS.
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
TOPE_CUBOS = 55
ALTO_LOMO = 1.0           # 1 unidad (1 px de voxel); el lomo del modelo detallado es de 2
SEP_SURCO = 16.0 / 3.0    # continua entre bloques vecinos
SURCOS_Z = (-SEP_SURCO, 0.0, SEP_SURCO)
PLANTAS_X = (-6.0, -2.0, 2.0, 6.0)
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
    if len(m.els) > TOPE_CUBOS:
        raise ValueError(f'{nombre}: {len(m.els)} cubos, pasa el tope de {TOPE_CUBOS}')
    return m


def guardar(m, nombre):
    ruta = os.path.join(AQUI, nombre + '.bbmodel')
    n = m.save(ruta)
    lo, hi = esquinas(m)
    fuera = max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) > HUELLA + 0.01
    print(f'{nombre}: {n} cubos ({36 * n} vertices), x[{lo[0]:.2f},{hi[0]:.2f}] y[{lo[1]:.2f},{hi[1]:.2f}] '
          f'z[{lo[2]:.2f},{hi[2]:.2f}]' + ('  AVISO: sale de la huella 16x16' if fuera else ''))
    if lo[1] < -0.01:
        print(f'  AVISO: {nombre} baja de y=0')
    return ruta


class _Uno:
    def __init__(self, e):
        self.els = [e]


def caja_dentro(m, nombre, base, size, col, tilt=0, yaw=0, margen=0.1):
    """Como m.box, pero si la caja girada sale de la huella prueba otros giros (yaw+180, +-90) y luego la acorta.

    Es determinista: el orden de intentos es fijo. Pensado para hojas de plantas en las orillas del bloque.
    """
    w, h, d = size
    lim = HUELLA - margen
    for k in range(6):
        for dy in (0, 180, 90, -90):
            e = m.box(nombre, base, (w, r3(h), d), col, tilt=tilt, yaw=r3(yaw + dy))
            lo, hi = esquinas(_Uno(e))
            if max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) <= lim and lo[1] >= 0:
                return e
            m.els.pop()
        h *= 0.85
    raise ValueError(f'{nombre}: no cabe en la huella')


# ---------------- maiz ----------------
def franja_siembra(m, zs):
    """Tierra humeda recien removida a lo largo de cada lomo (1 cubo por surco)."""
    for k, z in enumerate(zs):
        m.box(f'franja{k}', (0, ALTO_LOMO, r3(z)), (2 * HUELLA - 1, 0.2, 1.4), 'suelo_humedo')


def planta_maiz_siembra(m, nombre, base, rng, escala):
    """Una semilla de maiz asomando en el lomo: 1 cubo."""
    col = rng.choice(('grano', 'grano_dark', 'grano_light'))
    m.box(nombre, (base[0], base[1] + 0.2, base[2]), (r3(1.0 * escala), r3(0.7 * escala), r3(1.2 * escala)), col,
          yaw=r3(rng.uniform(-40, 40)))


def planta_maiz_madurez(m, nombre, base, rng, escala):
    """Maiz adulto simplificado, 4 cubos: tallo, hoja(s) inclinada(s), mazorca o segunda hoja, espiga.

    Las hojas van casi en el plano z (entre surcos), como el dosel cerrado de un maizal, para no salir de la huella
    en x. La mitad de las plantas lleva mazorca amarilla en lugar de la segunda hoja.
    """
    h = 8.0 * escala
    x, y, z = base
    m.box(nombre + '_tallo', base, (0.8, r3(h), 0.8), 'maiz_tallo')
    lado = rng.choice((0, 180))
    yaw = lado + rng.uniform(-35, 35)
    caja_dentro(m, nombre + '_hoja1', (x, r3(y + 0.35 * h), z), (1.7, 4.4 * escala, 0.3), 'maiz_hoja',
                tilt=r3(rng.uniform(52, 64)), yaw=yaw)
    if rng.random() < 0.5:
        m.box(nombre + '_mazorca', (x, r3(y + 0.5 * h), z), (1.1, r3(2.2 * escala), 1.1), 'grano',
              tilt=25, yaw=r3(yaw + 180 + rng.uniform(-20, 20)))
    else:
        caja_dentro(m, nombre + '_hoja2', (x, r3(y + 0.62 * h), z), (1.5, 3.8 * escala, 0.3), 'maiz_hoja_light',
                    tilt=r3(rng.uniform(48, 60)), yaw=yaw + 180 + rng.uniform(-25, 25))
    m.box(nombre + '_espiga', (x, r3(y + h), z), (0.5, r3(2.0 * escala), 0.5), 'espiga',
          tilt=r3(rng.uniform(0, 12)), yaw=r3(rng.uniform(0, 360)))


def maiz_siembra_bloque():
    """3 lomos + 3 franjas humedas + 12 semillas = 18 cubos."""
    return bloque('maiz_siembra_bloque', planta_maiz_siembra, 'maiz_siembra_bloque', extra=franja_siembra)


def maiz_madurez_bloque():
    """3 lomos + 12 plantas de 4 cubos = 51 cubos."""
    return bloque('maiz_madurez_bloque', planta_maiz_madurez, 'maiz_madurez_bloque')


MODELOS = [('maiz_siembra_bloque', maiz_siembra_bloque), ('maiz_madurez_bloque', maiz_madurez_bloque)]

if __name__ == '__main__':
    for nombre, f in MODELOS:
        guardar(f(), nombre)
