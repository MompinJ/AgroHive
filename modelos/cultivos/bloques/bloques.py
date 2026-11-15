"""Modelos LIGEROS de bloque (AgroHive): un manchon de varias plantas simplificadas en surcos.

Correr desde la raiz del repo:
    python modelos/cultivos/bloques/bloques.py

Genera los 90 bloques (maiz, frijol, calabaza, chile, sorgo, sandia, camote, cacahuate, soya, caupi, haba, chicharo,
lenteja, ejote, cebada, trigo, avena y maiz_dulce x siembra, brote, crecimiento, madurez, podrida) y visor_bloques.html.
El nombre es <cultivo>_<etapa>_bloque y el cultivo puede llevar guion bajo (maiz_dulce): la etapa es el penultimo
tramo, nunca el segundo.

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
(o, para rastreras y matas bajas, guia/mata/esqueje/al_lado/encima; para leguminosas, en_v/costado/vaina_costado/con_tutor;
para cereales de grano chico, cereal; para el maiz dulce, elote) y la pareja a CULTIVOS_ETAPAS.
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

from voxelkit import Model, build_visor  # noqa: E402
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


def con_tallo(col, alto, grueso, resto, tilt=None, giro=0):
    """Planta de 2 cubos: un tallo (derecho, o acamado si tilt=(min, max)) y lo que dibuje resto() en su lugar.
    giro=90 orienta hojas y acame a lo largo del surco (x), con menos abanico, para no salir del lomo en z."""
    def planta(m, nombre, base, rng, escala):
        h = alto * escala
        yaw = r3(giro + rng.choice((0, 180)) + rng.uniform(-15, 15)) if giro else lado_hoja(rng)
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


# ---------------- sandia, camote y cacahuate (rastreras y mata baja) ----------------
def hacia_centro(base, rng):
    """+1 o -1 en x apuntando al centro del bloque (lo de la orilla crece hacia adentro y no sale de la huella)."""
    if base[0] > 0.5:
        return -1
    if base[0] < -0.5:
        return 1
    return rng.choice((-1, 1))


def guia(col, largo, resto):
    """Rastrera: una guia tendida sobre el lomo, a lo largo del surco (x), y lo que dibuje resto() encima o en su punta."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-25, 25))
        caja_ajustada(m, nombre + '_guia', base, (largo * escala, 0.4, 0.5), col, yaw=yaw)
        resto(m, nombre, base, rng, escala, 0.4, yaw)
    return planta


def hoja_plana(col, ancho, fondo, f=1.0):
    """Hoja (o par de cotiledones) casi plana, mas ancha que honda, en lo alto del tallo."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        caja_ajustada(m, nombre + '_hoja', a_lo_alto(base, f * h), (ancho * escala, 0.3, fondo * escala), col,
                      tilt=r3(rng.uniform(-10, 10)), yaw=yaw + 90)
    return resto


def al_lado(cols, size, dist):
    """Una pieza tendida sobre el lomo junto a la planta, hacia el centro del bloque (fruto, raiz, vaina, guia)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        lado = hacia_centro(base, rng)
        sitio = (r3(base[0] + lado * dist * escala), base[1], r3(base[2] + rng.uniform(-0.4, 0.4)))
        caja_ajustada(m, nombre + '_lado', sitio, tuple(t * escala for t in size), rng.choice(cols),
                      yaw=r3(rng.uniform(-25, 25)))
    return resto


def encima(col, tam, f=1.0):
    """Una flor (cubito) sobre la mata, un poco fuera del centro."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        sitio = (r3(base[0] + rng.uniform(-0.6, 0.6)), r3(base[1] + f * h), r3(base[2] + rng.uniform(-0.5, 0.5)))
        m.box(nombre + '_flor', sitio, (tam, tam, tam), col, yaw=r3(rng.uniform(0, 90)))
    return resto


def nada(m, nombre, base, rng, escala, h, yaw):
    """Planta sin segundo cubo (para mezclar con alterna)."""


def mata(cols, ancho, alto, fondo, resto=nada):
    """Mata baja y densa (1 cubo de follaje, mas ancho que alto) y lo que dibuje resto()."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-30, 30))
        h = alto * escala
        caja_ajustada(m, nombre + '_mata', base, (ancho * escala, h, fondo * escala), rng.choice(cols), yaw=yaw)
        resto(m, nombre, base, rng, escala, h, yaw)
    return planta


def esqueje(col, largo, tilt, col_hoja, tam_hoja):
    """Camote: trozo de guia clavado en el lomo, inclinado hacia el centro, con una hoja en la punta (2 cubos)."""
    def planta(m, nombre, base, rng, escala):
        yaw = 90 * hacia_centro(base, rng) + rng.uniform(-25, 25)
        e = caja_ajustada(m, nombre + '_tallo', base, (0.4, largo * escala, 0.4), col, tilt=r3(rng.uniform(*tilt)), yaw=yaw)
        t, y = e['rotation'][0], e['rotation'][1]
        tip = punta(base, e['to'][1] - e['from'][1], t, y)
        caja_ajustada(m, nombre + '_hoja', tuple(r3(v) for v in tip), (tam_hoja * escala, 0.3, tam_hoja * 0.85 * escala),
                      col_hoja, tilt=r3(rng.uniform(-12, 12)), yaw=r3(y))
    return planta


def fruto_rayado(cols, raya, largo, alto, fondo):
    """Sandia: fruto ovalado tendido sobre el lomo y una raya oscura a lo largo, con el mismo giro (2 cubos)."""
    def planta(m, nombre, base, rng, escala):
        e = caja_ajustada(m, nombre + '_fruto', base, (largo * escala, alto * escala, fondo * escala), rng.choice(cols),
                          yaw=r3(rng.uniform(-20, 20)))
        w, h, d = (e['to'][i] - e['from'][i] for i in range(3))
        m.box(nombre + '_raya', base, (r3(w + 0.1), r3(h + 0.1), r3(d * 0.35)), raya, yaw=e.get('rotation', [0, 0, 0])[1])
    return planta


def fruto_largo_podrido(largo, alto, fondo):
    """Sandia podrida: fruto hundido (bajo y oscuro) con una mancha de moho encima (2 cubos)."""
    def planta(m, nombre, base, rng, escala):
        a = alto * escala
        e = caja_ajustada(m, nombre + '_fruto', base, (largo * escala, a, fondo * escala), rng.choice(('podrido', 'podrido_dark')),
                          yaw=r3(rng.uniform(-20, 20)))
        m.box(nombre + '_moho', (r3(base[0] + rng.uniform(-0.6, 0.6)), r3(base[1] + a), base[2]),
              (r3(largo * 0.4), 0.4, r3(fondo * 0.6)), rng.choice(('moho', 'moho_light')), yaw=e.get('rotation', [0, 0, 0])[1])
    return planta


# ---------------- soya, caupi, haba, chicharo y lenteja (leguminosas de la ampliacion, 15/11) ----------------
def en_v(col_hoja, ancho, alto, fondo, cols_vaina, largo, abre):
    """Caupi en madurez: mata baja y una vaina larga que sale de lo alto abierta hacia un lado; como el lado se
    alterna (yaw 0 o 180) las vainas de plantas vecinas se leen en V. 2 cubos."""
    def planta(m, nombre, base, rng, escala):
        h = alto * escala
        caja_ajustada(m, nombre + '_mata', base, (ancho * escala, h, fondo * escala), rng.choice(col_hoja),
                      yaw=r3(rng.uniform(-30, 30)))
        caja_ajustada(m, nombre + '_vaina', a_lo_alto(base, 0.8 * h), (0.4, largo * escala, 0.4), rng.choice(cols_vaina),
                      tilt=r3(rng.uniform(*abre)), yaw=r3(rng.choice((0, 180)) + rng.uniform(-30, 30)))
    return planta


def costado(col, tam, f, mancha=None):
    """Flor (cubito) pegada al costado de la mata, a la fraccion f de su altura. mancha: color de la cara frontal
    (+z), p. ej. la mancha negra de la flor de haba (misma paleta, otra cara)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        lado = hacia_centro(base, rng)
        sitio = (r3(base[0] + lado * 0.8 * escala), r3(base[1] + f * h), r3(base[2] + rng.uniform(-0.4, 0.4)))
        e = m.box(nombre + '_flor', sitio, (tam, tam, tam), col, yaw=r3(rng.uniform(-20, 20)))
        if mancha:
            i = m.names.index(mancha)
            e['faces']['south']['uv'] = [i % 16, i // 16, i % 16 + 1, i // 16 + 1]
    return resto


def vaina_costado(cols, f, grueso, largo, dist, t0=-12, t1=12):
    """Vaina pegada al costado de la mata (fuera del follaje, hacia el centro del bloque), casi vertical, con su base
    a la fraccion f de la altura (haba, soya y lenteja en madurez)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        lado = hacia_centro(base, rng)
        sitio = (r3(base[0] + lado * (dist + grueso / 2) * escala), r3(base[1] + f * h), r3(base[2] + rng.uniform(-0.3, 0.3)))
        caja_ajustada(m, nombre + '_vaina', sitio, (grueso, largo * escala, grueso), rng.choice(cols),
                      tilt=r3(rng.uniform(t0, t1)), yaw=r3(rng.uniform(-20, 20)))
    return resto


def con_tutor(alto_tutor, cols, ancho, alto, tilt=None):
    """Chicharo: un tutor fino de madera y la planta pegada a el (columna angosta de follaje), centrados juntos en
    la posicion del trazado. tilt=(min, max) recarga la planta (podrida). 2 cubos."""
    def planta(m, nombre, base, rng, escala):
        lado = hacia_centro(base, rng)
        sep = 0.25 + ancho * escala / 2
        m.box(nombre + '_tutor', (r3(base[0] - lado * sep / 2), base[1], base[2]), (0.3, r3(alto_tutor * escala), 0.3), 'wood')
        sitio = (r3(base[0] + lado * sep / 2), base[1], r3(base[2] + rng.uniform(-0.2, 0.2)))
        caja_ajustada(m, nombre + '_mata', sitio, (ancho * escala, alto * escala, ancho * escala), rng.choice(cols),
                      tilt=r3(rng.uniform(*tilt)) if tilt else 0, yaw=r3(rng.uniform(-20, 20)))
    return planta


# ---------------- ejote, cebada, trigo, avena y maiz dulce (ampliacion, tanda 2, 15/11) ----------------
def pinta_cara(m, e, cara, col):
    """Otro color de la paleta en una sola cara del cubo (p. ej. el cabello en la punta del elote)."""
    i = m.names.index(col)
    e['faces'][cara]['uv'] = [i % 16, i // 16, i % 16 + 1, i // 16 + 1]


def cereal(cols_tallo, alto, ancho, fondo, cols_esp, tam_esp, t_esp, tilt=(0, 6), punta_col=None):
    """Cereal de grano chico (2 cubos): un macollo (los tallos juntos en 1 cubo) que se inclina a lo largo del surco
    (x), hacia el centro del bloque, y en su punta una espiga u hoja (1 cubo) que sigue esa direccion con t_esp
    grados de mas: casi 0 erguida (trigo), 15-30 cabeceando (avena), 100 o mas doblada (cebada madura).
    tilt=(55, 75) acama la planta (podrida). La espiga se calcula desde la punta real del macollo.
    punta_col: color de la cara 'up' de la espiga (aristas claras de la cebada)."""
    def planta(m, nombre, base, rng, escala):
        yaw = 90 * hacia_centro(base, rng) + rng.uniform(-15, 15)
        e = caja_ajustada(m, nombre + '_macollo', base, (ancho, alto * escala, fondo), rng.choice(cols_tallo),
                          tilt=r3(rng.uniform(*tilt)), yaw=r3(yaw))
        t, y = e.get('rotation', [0, 0, 0])[:2]
        tip = punta(base, e['to'][1] - e['from'][1], t, y)
        w, h, d = tam_esp
        esp = caja_ajustada(m, nombre + '_espiga', tuple(r3(v) for v in tip), (w, h * escala, d), rng.choice(cols_esp),
                            tilt=r3(t + rng.uniform(*t_esp)), yaw=r3(y))
        if punta_col:
            pinta_cara(m, esp, 'up', punta_col)
    return planta


def elote(cols, f, grueso, largo, t0, t1, cabello, giro=180):
    """Elote pegado al tallo a la fraccion f, inclinado entre t0 y t1, con el cabello pintado en su cara de arriba
    (la punta, porque va inclinado): 1 cubo."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        e = caja_ajustada(m, nombre + '_elote', a_lo_alto(base, f * h), (grueso, largo * escala, grueso),
                          rng.choice(cols), tilt=r3(rng.uniform(t0, t1)), yaw=yaw + giro)
        pinta_cara(m, e, 'up', cabello)
    return resto


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
    # sandia (rastrera: guias con hoja lobulada verde grisaceo, flor amarilla, fruto ovalado con rayas)
    'sandia_siembra': semilla(('black',), (0.8, 0.3, 1.3)),
    'sandia_brote': con_tallo('sandia_hoja_dark', 1.2, 0.5, hoja_plana('sandia_hoja_light', 2.4, 1.0)),
    'sandia_crecimiento': guia('sandia_hoja_dark', 3.4, alterna(
        hoja_sobre_peciolo('sandia_hoja', 2.3, 1.0),
        hoja_sobre_peciolo('sandia_hoja_light', 2.0, 1.0),
        al_lado(('yellow',), (0.8, 0.8, 0.8), 1.4))),
    'sandia_madurez': alterna_plantas(
        fruto_rayado(('sandia_cascara_light',), 'sandia_cascara_dark', 3.2, 2.0, 2.1),
        guia('sandia_hoja_dark', 3.4, hoja_sobre_peciolo('sandia_hoja', 2.4, 1.0))),
    'sandia_podrida': alterna_plantas(
        fruto_largo_podrido(3.0, 1.0, 2.0),
        guia('hoja_seca_dark', 3.0, hoja_sobre_peciolo('hoja_seca', 2.0, 1.0))),
    # camote (rastrero y bajo: guia morada, hoja acorazonada verde oscuro, raiz rosa morada de pulpa naranja)
    'camote_siembra': esqueje('camote_morado', 2.6, (62, 72), 'camote_hoja', 1.1),
    'camote_brote': esqueje('camote_morado', 2.0, (18, 30), 'camote_hoja_light', 1.7),
    'camote_crecimiento': mata(('camote_hoja', 'camote_hoja_dark'), 2.8, 1.1, 2.6, alterna(
        encima('camote_flor', 0.8),
        al_lado(('camote_morado',), (2.6, 0.4, 0.5), 2.2))),
    'camote_madurez': mata(('camote_hoja', 'camote_hoja_dark'), 3.0, 1.3, 2.8, alterna(
        al_lado(('camote_piel', 'camote_piel_dark'), (2.2, 0.9, 1.0), 2.9),
        al_lado(('camote_piel', 'camote_piel_dark'), (2.2, 0.9, 1.0), 2.9),
        al_lado(('camote_pulpa',), (1.4, 0.9, 1.0), 2.5))),
    'camote_podrida': mata(('hoja_marchita', 'hoja_seca'), 2.6, 0.6, 2.4,
                           al_lado(('podrido', 'podrido_dark', 'moho'), (2.0, 0.8, 1.0), 2.6)),
    # cacahuate (mata baja mas ancha que alta, foliolos verde medio, flor amarilla, vainas beige en el suelo)
    'cacahuate_siembra': semilla(('cacahuate_semilla', 'cacahuate_semilla', 'cacahuate_vaina'), (0.8, 0.6, 1.1)),
    'cacahuate_brote': con_tallo('cacahuate_hoja_dark', 1.6, 0.5, hoja_plana('cacahuate_hoja_light', 1.9, 1.5)),
    'cacahuate_crecimiento': mata(('cacahuate_hoja', 'cacahuate_hoja_light'), 2.6, 1.5, 2.6, alterna(
        encima('yellow', 0.6), encima('yellow', 0.6), nada)),
    'cacahuate_madurez': mata(('cacahuate_hoja', 'cacahuate_hoja_dark'), 3.2, 2.0, 3.0, alterna(
        al_lado(('cacahuate_vaina', 'cacahuate_vaina_light'), (1.5, 0.6, 0.8), 2.6),
        al_lado(('cacahuate_vaina', 'cacahuate_vaina_light'), (1.5, 0.6, 0.8), 2.6),
        encima('yellow', 0.6))),
    'cacahuate_podrida': mata(('hoja_seca', 'hoja_seca_dark'), 2.8, 0.9, 2.6,
                              al_lado(('cacahuate_vaina_dark', 'podrido', 'moho'), (1.5, 0.6, 0.8), 2.4)),
    # soya (erguida y arbustiva, trifoliada verde oscuro, flor lila; madurez seca: planta tostada con vainas)
    'soya_siembra': semilla(('soya_semilla',), (0.8, 0.6, 0.9)),
    'soya_brote': con_tallo('soya_hoja_dark', 1.8, 0.5, hoja_plana('soya_hoja_light', 1.9, 1.2)),
    'soya_crecimiento': mata(('soya_hoja', 'soya_hoja_dark'), 2.0, 3.4, 1.9, alterna(
        encima('flor_lila', 0.6), encima('flor_lila', 0.6), nada)),
    'soya_madurez': mata(('soya_vaina_seca', 'soya_vaina_seca', 'hoja_seca_dark'), 1.7, 4.0, 1.6, alterna(
        vaina_costado(('hoja_seca', 'soya_vaina_seca'), 0.3, 0.5, 1.6, 0.85),
        vaina_costado(('hoja_seca', 'soya_vaina_seca'), 0.45, 0.5, 1.6, 0.85),
        encima('hoja_marchita', 0.7))),
    'soya_podrida': mata(('hoja_seca_dark', 'podrido'), 1.8, 2.2, 1.6, alterna(
        al_lado(('moho', 'moho_dark'), (1.4, 0.5, 0.7), 1.5),
        pieza(('podrido_dark',), 0.7, 0.5, 1.6, 110, 140))),
    # caupi (semirrastrero abierto: guia baja con foliolos lanceolados brillantes; vainas largas color paja en V)
    'caupi_siembra': semilla(('caupi_semilla',), (0.7, 0.5, 1.1)),
    'caupi_brote': con_tallo('caupi_hoja_dark', 1.5, 0.5, hoja_plana('caupi_hoja_light', 2.3, 0.8)),
    'caupi_crecimiento': guia('caupi_hoja_dark', 3.2, alterna(
        hoja('caupi_hoja_light', 1.0, 1.3, 2.8, 22, 38, 90), hoja('caupi_hoja', 1.0, 1.2, 2.6, 22, 38, 90))),
    'caupi_madurez': en_v(('caupi_hoja', 'caupi_hoja_light'), 2.6, 1.2, 2.2, ('caupi_vaina_seca', 'caupi_vaina_seca', 'caupi_vaina'),
                          3.0, (45, 60)),
    'caupi_podrida': guia('hoja_seca_dark', 3.0, alterna(
        al_lado(('moho', 'podrido'), (2.4, 0.4, 0.5), 1.0),
        hoja('hoja_seca', 1.0, 1.0, 2.0, 70, 85))),
    # haba (erguida y alta, gris verde; flor blanca con mancha negra; vainas gruesas, las bajas negras)
    'haba_siembra': semilla(('haba_semilla',), (1.2, 0.6, 1.5)),
    'haba_brote': con_tallo('haba_hoja_dark', 2.4, 0.6, hoja('haba_hoja_light', 0.8, 1.4, 1.6, 40, 55)),
    'haba_crecimiento': mata(('haba_hoja', 'haba_hoja_light'), 1.5, 5.0, 1.5, alterna(
        costado('white', 0.7, 0.55, mancha='black'), costado('white', 0.7, 0.7, mancha='black'), nada)),
    'haba_madurez': mata(('haba_hoja', 'haba_hoja_dark'), 1.6, 5.4, 1.6, alterna(
        vaina_costado(('haba_vaina',), 0.5, 0.9, 2.2, 0.8),
        vaina_costado(('haba_vaina_negra',), 0.08, 0.9, 2.0, 0.8),
        vaina_costado(('haba_vaina_negra',), 0.15, 0.9, 2.0, 0.8))),
    'haba_podrida': con_tallo('hoja_seca_dark', 4.4, 0.8, alterna(
        pieza(('haba_vaina_negra', 'moho'), 0.5, 0.8, 2.0, 130, 150, 60),
        hoja('podrido', 0.4, 1.4, 2.2, 95, 115, 160)), tilt=(20, 32)),
    # chicharo (trepa por un tutor de madera; follaje verde claro glauco; vainas verde brillante)
    'chicharo_siembra': semilla(('chicharo_semilla',), (0.8, 0.7, 0.8)),
    'chicharo_brote': con_tutor(4.0, ('chicharo_hoja_light',), 0.8, 1.6),
    'chicharo_crecimiento': con_tutor(5.6, ('chicharo_hoja', 'chicharo_hoja_light'), 1.0, 4.0),
    'chicharo_madurez': con_tutor(6.0, ('chicharo_vaina', 'chicharo_hoja', 'chicharo_vaina'), 1.3, 4.8),
    'chicharo_podrida': con_tutor(5.6, ('hoja_seca_dark', 'podrido', 'moho'), 1.2, 2.2, tilt=(18, 30)),
    # lenteja (la mas chica y fina, plumosa; madurez color paja con vainas cortas)
    'lenteja_siembra': semilla(('lenteja_semilla',), (0.7, 0.3, 0.7)),
    'lenteja_brote': con_tallo('lenteja_hoja', 1.3, 0.3, hoja('lenteja_hoja_light', 0.9, 0.6, 0.9, 25, 45)),
    'lenteja_crecimiento': mata(('lenteja_hoja', 'lenteja_hoja_light'), 1.3, 2.0, 1.3, alterna(
        encima('lenteja_hoja_light', 0.8, 0.7), encima('white', 0.4), nada)),
    'lenteja_madurez': mata(('hoja_seca_light', 'hoja_marchita'), 1.3, 2.1, 1.3, alterna(
        vaina_costado(('lenteja_vaina',), 0.4, 0.5, 0.9, 0.65),
        vaina_costado(('lenteja_vaina',), 0.55, 0.5, 0.9, 0.65),
        nada)),
    'lenteja_podrida': mata(('podrido', 'hoja_seca_dark'), 1.4, 0.9, 1.4,
                            al_lado(('moho', 'podrido_dark'), (0.9, 0.4, 0.6), 1.1)),
    # ejote (mata de frijol en domo verde; vainas largas verde brillante colgando; semilla blanca o crema)
    'ejote_siembra': semilla(('white', 'calabaza_crema'), (0.8, 0.6, 1.1)),
    'ejote_brote': con_tallo('frijol_hoja_dark', 1.6, 0.5, hoja_plana('frijol_hoja_light', 2.0, 1.2)),
    'ejote_crecimiento': mata(('frijol_hoja', 'frijol_hoja_light'), 2.3, 2.2, 2.1, alterna(
        encima('white', 0.5), encima('white', 0.5), nada)),
    'ejote_madurez': mata(('frijol_hoja_dark', 'frijol_hoja_dark', 'frijol_hoja'), 2.6, 2.3, 2.3,
                          vaina_costado(('ejote_vaina_light', 'ejote_vaina_light', 'ejote_vaina'), 0.05, 0.5, 2.7, 1.35, -8, 8)),
    'ejote_podrida': mata(('hoja_seca_dark', 'podrido', 'hoja_marchita'), 2.3, 1.0, 2.0,
                          al_lado(('moho', 'podrido_dark', 'ejote_vaina_dark'), (1.9, 0.45, 0.55), 1.9)),
    # cebada (macollo de tallos finos; espiga con aristas largas que se dobla al madurar; paja palida)
    'cebada_siembra': semilla(('cebada_espiga', 'espiga'), (0.6, 0.4, 0.9)),
    'cebada_brote': cereal(('cereal_hoja_light',), 1.4, 0.8, 0.6, ('cereal_hoja_light',), (0.5, 1.4, 0.25), (28, 42)),
    'cebada_crecimiento': cereal(('cereal_hoja', 'cereal_hoja_dark'), 2.8, 1.0, 0.8, ('cereal_hoja_light',),
                                 (0.55, 1.8, 0.55), (0, 8)),
    'cebada_madurez': cereal(('hoja_seca',), 3.9, 0.9, 0.7, ('cebada_espiga',), (0.65, 2.2, 0.65), (95, 115),
                             punta_col='cebada_arista'),
    'cebada_podrida': cereal(('hoja_seca_dark', 'podrido'), 3.6, 0.9, 0.7, ('podrido', 'moho'), (0.6, 2.0, 0.6), (15, 30),
                             tilt=(55, 72), punta_col='moho_dark'),
    # trigo (macollo; espiga compacta y erguida; madurez dorada intensa)
    'trigo_siembra': semilla(('trigo_espiga_dark', 'trigo_espiga'), (0.6, 0.4, 0.9)),
    'trigo_brote': cereal(('cereal_hoja',), 1.5, 0.8, 0.6, ('cereal_hoja_light',), (0.5, 1.3, 0.25), (22, 36)),
    'trigo_crecimiento': cereal(('cereal_hoja', 'cereal_hoja_dark'), 2.8, 1.0, 0.8, ('cereal_hoja_light',),
                                (0.8, 1.3, 0.8), (0, 5)),
    'trigo_madurez': cereal(('trigo_espiga_dark',), 3.7, 0.9, 0.7, ('trigo_espiga', 'trigo_espiga_light'), (0.9, 1.7, 0.9),
                            (0, 5), punta_col='trigo_espiga_light'),
    'trigo_podrida': cereal(('hoja_seca_dark', 'podrido'), 3.6, 0.9, 0.7, ('trigo_espiga_dark', 'moho_dark'), (0.9, 1.6, 0.9),
                            (5, 15), tilt=(55, 72), punta_col='moho'),
    # avena (macollo; panicula abierta y ancha, que cabecea, con espiguillas colgantes; madurez paja clara)
    'avena_siembra': semilla(('avena_espiga', 'avena_espiga_dark'), (0.5, 0.4, 1.0)),
    'avena_brote': cereal(('cereal_hoja_light',), 1.6, 0.8, 0.6, ('cereal_hoja',), (0.55, 1.5, 0.25), (30, 45)),
    'avena_crecimiento': cereal(('cereal_hoja', 'cereal_hoja_dark'), 3.0, 1.0, 0.8, ('cereal_hoja_light',),
                                (0.45, 1.8, 1.4), (6, 14)),
    'avena_madurez': cereal(('avena_espiga_dark',), 3.9, 0.9, 0.7, ('avena_espiga',), (0.5, 2.2, 2.0), (15, 28),
                            punta_col='avena_espiga_dark'),
    'avena_podrida': cereal(('hoja_seca_dark', 'podrido'), 3.8, 0.9, 0.7, ('avena_espiga_dark', 'moho'), (0.5, 2.0, 1.7),
                            (10, 25), tilt=(55, 72), punta_col='moho_dark'),
    # maiz dulce (planta de maiz mas baja que sigue VERDE en madurez; elote de totomoxtle verde con cabello)
    'maiz_dulce_siembra': semilla(('maiz_dulce_grano', 'grano_light'), (0.9, 0.5, 1.1)),
    'maiz_dulce_brote': con_tallo('maiz_tallo_light', 2.2, 0.6, hoja('maiz_hoja_light', 0.6, 1.0, 2.4, 40, 55), giro=90),
    'maiz_dulce_crecimiento': con_tallo('maiz_tallo', 4.4, 0.8, hoja('maiz_hoja', 0.55, 1.5, 3.0, 48, 60), giro=90),
    'maiz_dulce_madurez': con_tallo('maiz_tallo', 6.2, 0.8, alterna(
        elote(('totomoxtle', 'totomoxtle', 'totomoxtle_dark'), 0.5, 1.2, 2.3, 20, 28, 'cabello'),
        elote(('totomoxtle', 'totomoxtle', 'totomoxtle_dark'), 0.5, 1.2, 2.3, 20, 28, 'cabello_light'),
        hoja('maiz_hoja', 0.62, 1.5, 3.4, 50, 62)), giro=90),
    'maiz_dulce_podrida': con_tallo('hoja_seca_dark', 3.8, 0.8, alterna(
        elote(('podrido', 'podrido_dark'), 0.0, 1.2, 2.0, 70, 82, 'moho'),
        hoja('hoja_marchita', 0.3, 1.3, 2.6, 95, 110, 180)), tilt=(20, 32), giro=90),
}

CULTIVOS_ETAPAS = [(c, e) for c in ('maiz', 'frijol', 'calabaza', 'chile', 'sorgo', 'sandia', 'camote', 'cacahuate',
                                    'soya', 'caupi', 'haba', 'chicharo', 'lenteja',
                                    'ejote', 'cebada', 'trigo', 'avena', 'maiz_dulce')
                   for e in ('siembra', 'brote', 'crecimiento', 'madurez', 'podrida')]


def modelo(cultivo, etapa):
    clave = f'{cultivo}_{etapa}'
    return bloque(clave + '_bloque', PLANTAS[clave], clave + '_bloque', extra=franja_siembra if etapa == 'siembra' else None)


MODELOS = [(f'{c}_{e}_bloque', (lambda c=c, e=e: modelo(c, e))) for c, e in CULTIVOS_ETAPAS]

if __name__ == '__main__':
    rutas = [guardar(f(), nombre) for nombre, f in MODELOS]
    print(build_visor(os.path.join(AQUI, 'visor_bloques.html'), rutas), 'cubos en visor_bloques.html')
