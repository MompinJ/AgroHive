"""Modelos LIGEROS de bloque (AgroHive): un manchon de varias plantas simplificadas en surcos.

Correr desde la raiz del repo:
    python modelos/cultivos/bloques/bloques.py

Genera los 200 bloques (maiz, frijol, calabaza, chile, sorgo, sandia, camote, cacahuate, soya, caupi, haba, chicharo,
lenteja, ejote, cebada, trigo, avena, maiz_dulce, yuca, cana, ajonjoli, girasol, algodon, cartamo, higuerilla, tomate
(jitomate), papa, calabacita, cebolla, pepino, melon, lechuga, zanahoria, berenjena, brocoli, col, coliflor, espinaca,
rabano y betabel x siembra, brote, crecimiento, madurez, podrida) y visor_bloques.html.
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
para cereales de grano chico, cereal; para el maiz dulce, elote; para tallo con algo en la punta, tallo_punta con
copa o cabeza; para capsulas pegadas al tallo, manguito; para arbusto piramidal, escalonada; para siembra de estaca o
trozo, estaca/trozo; para pintar la cara de arriba, mata(arriba=...), con_arriba o punta_color; para trepadora en
espaldera, espaldera con poste/colgado/al_pie; para roseta, roseta; para frondas en V, abanico; para raiz que asoma
del lomo, hombro con fronda; para pintar otra cara de la pieza, con_cara) y la pareja a
CULTIVOS_ETAPAS. Lo que va por surco ademas de las 9 plantas (la raiz de la yuca
madura) va en EXTRAS, como la franja humeda de siembra.
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


def mata(cols, ancho, alto, fondo, resto=nada, arriba=None):
    """Mata baja y densa (1 cubo de follaje, mas ancho que alto) y lo que dibuje resto(). arriba: colores para su
    cara 'up' (las manchas plateadas de la calabacita); sin arriba no gasta azar, asi las matas de antes no cambian."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-30, 30))
        h = alto * escala
        e = caja_ajustada(m, nombre + '_mata', base, (ancho * escala, h, fondo * escala), rng.choice(cols), yaw=yaw)
        if arriba:
            pinta_cara(m, e, 'up', rng.choice(arriba))
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


# ---------------- yuca, cana, ajonjoli, girasol y algodon (ampliacion, tanda 3, 15/11) ----------------
def tallo_punta(cols, alto, grueso, cima, tilt=(0, 0)):
    """Tallo (1 cubo) inclinado tilt grados a lo largo del surco (x), hacia el centro del bloque, y lo que dibuje
    cima(m, nombre, tip, rng, escala, t, y) en su punta real (copa, cabeza, penacho): 2 cubos."""
    def planta(m, nombre, base, rng, escala):
        yaw = 90 * hacia_centro(base, rng) + rng.uniform(-15, 15)
        e = caja_ajustada(m, nombre + '_tallo', base, (grueso, alto * escala, grueso), rng.choice(cols),
                          tilt=r3(rng.uniform(*tilt)), yaw=r3(yaw))
        t, y = e.get('rotation', [0, 0, 0])[:2]
        tip = tuple(r3(v) for v in punta(base, e['to'][1] - e['from'][1], t, y))
        cima(m, nombre, tip, rng, escala, t, y)
    return planta


def copa(cols, size, t=(-8, 8), arriba=None):
    """Copa de hojas (1 cubo mas ancho que alto) apoyada en la punta del tallo; arriba: color de su cara 'up'."""
    def cima(m, nombre, tip, rng, escala, t_tallo, y):
        e = caja_ajustada(m, nombre + '_copa', tip, tuple(v * escala for v in size), rng.choice(cols),
                          tilt=r3(rng.uniform(*t)), yaw=r3(y + rng.uniform(-20, 20)))
        if arriba:
            pinta_cara(m, e, 'up', rng.choice(arriba))
    return cima


def cabeza(cols, size, t_rel, cara, atras=None):
    """Cabeza de girasol (1 cubo delgado) CENTRADA en la punta del tallo (gira alrededor de ella, asi el tallo le
    llega por detras), con la cara (sur, +z local) hacia donde se inclina el tallo; t_rel: grados de mas sobre el
    tallo (negativo la levanta al cielo, 40-60 la agacha, 120 o mas la cuelga). cara/atras: colores de la cara del
    disco y de la de atras. Si se sale de la huella, se encoge."""
    def cima(m, nombre, tip, rng, escala, t_tallo, y):
        w, h, d = size[0] * escala, size[1] * escala, size[2]
        t = r3(t_tallo + rng.uniform(*t_rel))
        col = rng.choice(cols)
        for _ in range(8):
            e = m.box(nombre + '_cabeza', (tip[0], r3(tip[1] - h / 2), tip[2]), (r3(w), r3(h), r3(d)), col, tilt=t,
                      yaw=r3(y), pivot=tip)
            lo, hi = esquinas(_Uno(e))
            if max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) <= HUELLA - 0.1 and lo[1] >= ALTO_LOMO:
                break
            m.els.pop()
            w, h = w * 0.85, h * 0.85
        else:
            raise ValueError(f'{nombre}: la cabeza no cabe en la huella')
        pinta_cara(m, e, 'south', cara)
        if atras:
            pinta_cara(m, e, 'north', atras)
    return cima


def manguito(cols, f, ancho, largo, arriba=None):
    """Capsulas o follaje pegados al tallo derecho (1 cubo que lo envuelve desde la fraccion f de su altura):
    ajonjoli con sus capsulas paradas en fila. arriba: color de la cara 'up' (las ultimas flores en la punta)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        e = caja_ajustada(m, nombre + '_mango', a_lo_alto(base, f * h), (ancho, largo * escala, ancho), rng.choice(cols),
                          yaw=r3(rng.uniform(-20, 20)))
        if arriba:
            pinta_cara(m, e, 'up', rng.choice(arriba))
    return resto


def escalonada(cols_bajo, size_bajo, cols_alto, size_alto, arriba_bajo=None, arriba_alto=None, solo_bajo=0.0):
    """Arbusto piramidal (algodon) en 2 cubos apilados: uno ancho abajo y uno angosto encima. arriba_*: colores para la
    cara 'up' de cada uno (la fibra blanca que se ve desde arriba). solo_bajo: probabilidad de que falte el de arriba."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-30, 30))
        w, h, d = (v * escala for v in size_bajo)
        e = caja_ajustada(m, nombre + '_bajo', base, (w, h, d), rng.choice(cols_bajo), yaw=yaw)
        if arriba_bajo:
            pinta_cara(m, e, 'up', rng.choice(arriba_bajo))
        if rng.random() < solo_bajo:
            return
        e = caja_ajustada(m, nombre + '_alto', a_lo_alto(base, h), tuple(v * escala for v in size_alto), rng.choice(cols_alto),
                          yaw=r3(yaw + rng.uniform(-25, 25)))
        if arriba_alto:
            pinta_cara(m, e, 'up', rng.choice(arriba_alto))
    return planta


def trozo(col, size, nudo, ancho_nudo):
    """Cana en siembra: un trozo de tallo acostado sobre el lomo, a lo largo del surco, medio tapado, con su nudo
    morado en medio (2 cubos con el mismo giro)."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-20, 20))
        w, h, d = size
        e = caja_ajustada(m, nombre + '_trozo', base, (w * escala, h, d), col, yaw=yaw)
        m.box(nombre + '_nudo', base, (ancho_nudo, r3(h + 0.12), r3(d + 0.12)), nudo, yaw=e.get('rotation', [0, 0, 0])[1])
    return planta


def estaca(col, largo, grueso, tilt, corte):
    """Yuca en siembra: estaca de tallo clavada en el lomo, inclinada a lo largo del surco, con el corte claro arriba
    (1 cubo)."""
    def planta(m, nombre, base, rng, escala):
        yaw = 90 * hacia_centro(base, rng) + rng.uniform(-15, 15)
        e = caja_ajustada(m, nombre + '_estaca', base, (grueso, largo * escala, grueso), col, tilt=r3(rng.uniform(*tilt)),
                          yaw=r3(yaw))
        pinta_cara(m, e, 'up', corte)
    return planta


def raices_yuca(m, zs):
    """Yuca en madurez: una raiz cafe asomando por el costado de cada lomo, entre dos plantas, con el corte blanco
    de la pulpa en una punta (1 cubo por surco, fijo)."""
    for k, z in enumerate(zs):
        x = (-SEP_SURCO / 2, SEP_SURCO / 2, -SEP_SURCO / 2)[k]
        lado = (1, -1, 1)[k]
        e = m.box(f'raiz{k}', (r3(x), ALTO_LOMO - 0.3, r3(z + lado * 0.9)), (2.4, 0.9, 1.0), 'yuca_raiz', yaw=(15, -20, 25)[k])
        pinta_cara(m, e, 'east', 'yuca_pulpa')



# ---------------- cartamo, higuerilla, jitomate, papa y calabacita (ampliacion, tanda 4, 15/11) ----------------
def con_arriba(cols, resto):
    """Pinta la cara 'up' del cubo que dibujo resto() (la pieza de al_lado, la flor de costado) con uno de cols."""
    def r(m, nombre, base, rng, escala, h, yaw):
        n = len(m.els)
        resto(m, nombre, base, rng, escala, h, yaw)
        if len(m.els) > n:
            pinta_cara(m, m.els[-1], 'up', rng.choice(cols))
    return r


def punta_color(cols, resto):
    """Pinta la cara 'up' del tallo (el cubo anterior a resto) y luego dibuja resto(): la higuerilla madura, cuyo
    tallo asoma por encima de la hoja como racimo de capsulas rojas."""
    def r(m, nombre, base, rng, escala, h, yaw):
        pinta_cara(m, m.els[-1], 'up', rng.choice(cols))
        resto(m, nombre, base, rng, escala, h, yaw)
    return r


# ---------------- cebolla, pepino, melon, lechuga y zanahoria (ampliacion, tanda 5, 15/11) ----------------
def espaldera(cols, ancho, alto, fondo, resto=nada, arriba=None):
    """Pepino: la mata guiada en la espaldera, un panel de follaje a lo largo del surco (x), angosto en z y centrado en
    la planta (casi sin giro, para que nunca se cruce al surco), y lo que dibuje resto(): el poste de madera que asoma
    por encima o un pepino colgando de su cara. arriba: colores de la cara 'up' (brotes y flores)."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-6, 6))
        h = alto * escala
        e = caja_ajustada(m, nombre + '_mata', base, (ancho * escala, h, fondo), rng.choice(cols), yaw=yaw)
        if arriba:
            pinta_cara(m, e, 'up', rng.choice(arriba))
        resto(m, nombre, base, rng, escala, h, yaw)
    return planta


def poste(alto, col='wood', grueso=0.35):
    """Poste de la espaldera en el centro de la planta (1 cubo)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        m.box(nombre + '_poste', base, (grueso, r3(alto * escala), grueso), col)
    return resto


def colgado(cols, grueso, largo, f, dist):
    """Fruto que cuelga pegado a una cara del panel (delante o detras, a dist del centro en z) desde la fraccion f de
    su altura, casi vertical y apenas inclinado a lo largo del surco: el pepino maduro (1 cubo)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        lado = rng.choice((-1, 1))
        l = largo * escala
        sitio = (r3(base[0] + rng.uniform(-0.8, 0.8)), r3(base[1] + max(0.15, f * h - l)), r3(base[2] + lado * (dist + grueso / 2)))
        caja_ajustada(m, nombre + '_fruto', sitio, (grueso, l, grueso), rng.choice(cols), tilt=r3(rng.uniform(-8, 8)),
                      yaw=r3(90 + rng.uniform(-10, 10)))
    return resto


def al_pie(cols, size, dist):
    """Pieza tirada sobre el lomo al pie del panel (delante o detras), a lo largo del surco: el pepino caido (1 cubo)."""
    def resto(m, nombre, base, rng, escala, h, yaw):
        lado = rng.choice((-1, 1))
        sitio = (r3(base[0] + rng.uniform(-0.8, 0.8)), base[1], r3(base[2] + lado * dist))
        caja_ajustada(m, nombre + '_pie', sitio, tuple(t * escala for t in size), rng.choice(cols), yaw=r3(rng.uniform(-20, 20)))
    return resto


def roseta(cols, ancho, alto, cols_cor, ancho_cor, alto_cor, arriba=None):
    """Lechuga: roseta de hojas (1 cubo ancho y bajo) y, girado 45 grados sobre el mismo centro, el cogollo o la
    segunda vuelta de hojas (1 cubo mas angosto y alto): desde arriba se lee como estrella de 8 puntas. arriba:
    colores de la cara 'up' del cogollo (el corazon mas claro)."""
    def planta(m, nombre, base, rng, escala):
        yaw = r3(rng.uniform(-30, 30))
        caja_ajustada(m, nombre + '_hojas', base, (ancho * escala, alto * escala, ancho * escala), rng.choice(cols), yaw=yaw)
        e = caja_ajustada(m, nombre + '_cogollo', base, (ancho_cor * escala, alto_cor * escala, ancho_cor * escala),
                          rng.choice(cols_cor), yaw=r3(yaw + 45 + rng.uniform(-8, 8)))
        if arriba:
            pinta_cara(m, e, 'up', rng.choice(arriba))
    return planta


def abanico(cols, size, abre):
    """Zanahoria: dos frondas finas que salen del mismo punto abiertas en V a lo largo del surco (x), abre grados
    cada una (2 cubos). size = (ancho en z, largo, grueso en x)."""
    def planta(m, nombre, base, rng, escala):
        w, h, d = size
        for k, lado in enumerate((90, -90)):
            caja_ajustada(m, f'{nombre}_fronda{k}', base, (w, h * escala, d), rng.choice(cols), tilt=r3(rng.uniform(*abre)),
                          yaw=r3(lado + rng.uniform(-15, 15)))
    return planta


def hombro(cols, size, hundido, cima, arriba=None):
    """Zanahoria madura: el hombro de la raiz (1 cubo) asomando del lomo, hundido `hundido` unidades en el, y lo que
    dibuje cima(m, nombre, tope, rng, escala) en su tope (el penacho). arriba: color de su cara 'up' (moho)."""
    def planta(m, nombre, base, rng, escala):
        w, h, d = (v * escala for v in size)
        sitio = (base[0], r3(base[1] - hundido), base[2])
        e = caja_ajustada(m, nombre + '_hombro', sitio, (w, h, d), rng.choice(cols), yaw=r3(rng.uniform(-30, 30)))
        if arriba:
            pinta_cara(m, e, 'up', rng.choice(arriba))
        cima(m, nombre, (base[0], r3(base[1] - hundido + h), base[2]), rng, escala)
    return planta


def fronda(cols, size, tilt):
    """Penacho (1 cubo como abanico plano en el plano x-y) inclinado tilt grados a lo largo del surco, hacia un lado al
    azar. size = (ancho en z, largo, ancho en x)."""
    def cima(m, nombre, tope, rng, escala):
        w, h, d = size
        caja_ajustada(m, nombre + '_penacho', tope, (w, h * escala, d), rng.choice(cols), tilt=r3(rng.uniform(*tilt)),
                      yaw=r3(rng.choice((90, -90)) + rng.uniform(-15, 15)))
    return cima


# ---------------- berenjena, brocoli, col, coliflor, espinaca, rabano y betabel (ampliacion, tanda 6, 15/11) ----------------
def con_cara(cara, cols, resto):
    """Como con_arriba, pero en cualquier cara: pinta la cara `cara` del cubo que dibujo resto() con uno de cols
    (el brillo de la berenjena en su costado, la punta blanca del rabano arrancado)."""
    def r(m, nombre, base, rng, escala, h, yaw):
        n = len(m.els)
        resto(m, nombre, base, rng, escala, h, yaw)
        if len(m.els) > n:
            pinta_cara(m, m.els[-1], cara, rng.choice(cols))
    return r


# Melon maduro: fruto redondo beige con la red clara arriba y, al lado, una hoja o medio melon con la pulpa al aire.
# Va dos veces en melon_madurez para que haya mas melones que guias.
MELON_MADURO = mata(('melon_cascara',), 2.0, 1.7, 2.0, alterna(
    al_lado(('calabaza_hoja', 'calabaza_hoja_dark'), (2.0, 0.3, 1.7), 2.1),
    con_arriba(('melon_pulpa',), al_lado(('melon_cascara',), (1.3, 0.6, 1.3), 1.8))), arriba=('melon_red',))


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
    # yuca (arbusto ralo: tallo lenoso gris pardo, copa de hojas palmeadas; siembra = estaca; raiz cafe al madurar)
    'yuca_siembra': estaca('yuca_tallo', 2.2, 0.6, (15, 28), 'yuca_pulpa'),
    'yuca_brote': tallo_punta(('yuca_tallo',), 2.2, 0.6, copa(('yuca_hoja_light',), (1.7, 0.5, 1.5)), tilt=(10, 20)),
    'yuca_crecimiento': tallo_punta(('yuca_tallo',), 4.2, 0.5, copa(('yuca_hoja', 'yuca_hoja_dark'), (2.6, 0.9, 2.3),
                                                                    arriba=('yuca_hoja_light', 'yuca_hoja')), tilt=(0, 8)),
    'yuca_madurez': tallo_punta(('yuca_tallo',), 6.2, 0.6, copa(('yuca_hoja_dark', 'yuca_hoja'), (3.0, 1.1, 2.6),
                                                                arriba=('yuca_hoja', 'yuca_hoja_light')), tilt=(2, 10)),
    'yuca_podrida': tallo_punta(('hoja_seca_dark', 'yuca_tallo'), 4.0, 0.6, alterna(
        copa(('hoja_seca', 'hoja_marchita'), (2.4, 0.7, 2.2), t=(35, 50)),
        copa(('podrido', 'hoja_seca_dark'), (2.2, 0.7, 2.0), t=(40, 55), arriba=('moho', 'moho_dark'))), tilt=(14, 24)),
    # cana de azucar (macollo de tallos gruesos verde amarillento, hojas solo arriba, la mas alta; siembra = trozo
    # acostado con su nudo morado)
    'cana_siembra': trozo('cana_tallo', (2.6, 0.7, 0.7), 'cana_nudo', 0.35),
    'cana_brote': cereal(('maiz_hoja_light',), 2.0, 0.7, 0.5, ('maiz_hoja',), (0.45, 2.2, 0.25), (25, 40)),
    'cana_crecimiento': tallo_punta(('cana_tallo_dark', 'cana_tallo'), 6.0, 0.9, copa(('maiz_hoja', 'maiz_hoja_dark'),
                                                                                    (1.4, 2.2, 3.0), t=(-18, 18)), tilt=(0, 5)),
    'cana_madurez': tallo_punta(('cana_tallo', 'cana_tallo_light'), 9.6, 1.0, copa(('maiz_hoja', 'maiz_hoja_dark'),
                                                                                  (1.5, 2.4, 3.2), t=(-18, 18)), tilt=(0, 5)),
    'cana_podrida': tallo_punta(('hoja_seca_dark', 'cana_tallo_dark'), 6.4, 1.0, alterna(
        copa(('hoja_seca', 'hoja_marchita'), (1.3, 2.0, 2.6), t=(70, 90)),
        copa(('podrido', 'cana_nudo'), (1.2, 1.8, 2.4), t=(75, 95), arriba=('moho', 'moho_dark'))), tilt=(20, 30)),
    # ajonjoli (tallo unico recto; capsulas paradas en fila a lo largo del tallo; flor tubular rosa palido)
    'ajonjoli_siembra': semilla(('ajonjoli_semilla',), (0.5, 0.3, 0.7)),
    'ajonjoli_brote': con_tallo('ajonjoli_hoja', 1.4, 0.35, hoja_plana('ajonjoli_capsula', 1.6, 0.9)),
    'ajonjoli_crecimiento': con_tallo('ajonjoli_hoja', 4.2, 0.4, alterna(
        manguito(('ajonjoli_hoja',), 0.3, 1.3, 2.6, arriba=('ajonjoli_flor',)),
        manguito(('ajonjoli_hoja',), 0.3, 1.3, 2.4),
        costado('ajonjoli_flor', 0.6, 0.75))),
    'ajonjoli_madurez': con_tallo('ajonjoli_hoja', 5.6, 0.4, manguito(('ajonjoli_capsula',), 0.4, 1.0, 2.8,
                                                                      arriba=('ajonjoli_flor', 'ajonjoli_flor', 'ajonjoli_capsula'))),
    'ajonjoli_podrida': tallo_punta(('hoja_seca_dark', 'podrido'), 4.0, 0.4, alterna(
        copa(('podrido_dark', 'podrido'), (0.8, 1.8, 0.8), t=(130, 160)),
        copa(('hoja_seca_dark',), (0.8, 1.6, 0.8), t=(120, 150), arriba=('moho', 'moho_light'))), tilt=(18, 32)),
    # girasol (tallo unico alto; cabeza de petalos amarillos con disco cafe que mira al cielo y en madurez se agacha;
    # podrida: cabeza negra colgando)
    'girasol_siembra': semilla(('black', 'girasol_disco_dark'), (0.5, 0.35, 0.9)),
    'girasol_brote': con_tallo('girasol_hoja', 1.6, 0.4, hoja_plana('girasol_hoja', 2.2, 1.0)),
    'girasol_crecimiento': tallo_punta(('girasol_hoja',), 6.0, 0.55, alterna(
        cabeza(('girasol_petalo',), (2.2, 2.2, 0.8), (-40, -25), 'girasol_disco'),
        cabeza(('girasol_petalo',), (2.2, 2.2, 0.8), (-40, -25), 'girasol_disco'),
        copa(('girasol_hoja',), (1.1, 1.0, 1.1), arriba=('girasol_petalo',))), tilt=(0, 6)),
    'girasol_madurez': tallo_punta(('girasol_hoja',), 8.6, 0.6, cabeza(('girasol_petalo',), (2.6, 2.6, 0.8), (40, 55),
                                                                       'girasol_disco_dark'), tilt=(2, 8)),
    'girasol_podrida': tallo_punta(('hoja_seca_dark',), 6.0, 0.6, cabeza(('girasol_disco_dark', 'podrido_dark'), (2.2, 2.2, 0.7),
                                                                         (110, 135), 'moho_dark', atras='podrido'), tilt=(15, 28)),
    # algodon (arbusto piramidal en 2 escalones; madurez: motas blancas de fibra en las capsulas cafes, vistas desde arriba)
    'algodon_siembra': semilla(('algodon_fibra', 'white', 'hoja_seca_light'), (0.6, 0.45, 0.8)),
    'algodon_brote': con_tallo('yuca_peciolo', 1.3, 0.35, hoja_plana('algodon_hoja', 2.0, 1.1)),
    'algodon_crecimiento': escalonada(('algodon_hoja',), (2.4, 1.6, 2.2), ('algodon_hoja', 'algodon_bellota'), (1.4, 1.3, 1.3),
                                      arriba_alto=('algodon_hoja', 'algodon_flor', 'algodon_bellota')),
    'algodon_madurez': escalonada(('algodon_capsula_seca', 'hoja_seca_dark', 'algodon_hoja'), (2.6, 1.8, 2.4),
                                  ('algodon_capsula_seca', 'algodon_capsula_seca', 'algodon_fibra'), (1.6, 1.4, 1.5),
                                  arriba_bajo=('algodon_fibra', 'algodon_fibra', 'algodon_capsula_seca'),
                                  arriba_alto=('algodon_fibra',)),
    'algodon_podrida': escalonada(('podrido', 'hoja_seca_dark'), (2.4, 1.3, 2.2), ('podrido_dark', 'algodon_capsula_seca'),
                                  (1.4, 1.0, 1.3), arriba_bajo=('moho', 'hoja_seca_dark'), arriba_alto=('moho_light', 'moho'),
                                  solo_bajo=0.3),
    # cartamo (erguido y ramificado arriba, hoja espinosa verde grisaceo; madurez: cabezuelas de penacho naranja en las
    # puntas, vistas desde arriba; semilla blanca)
    'cartamo_siembra': semilla(('white', 'hoja_seca_light'), (0.55, 0.4, 0.85)),
    'cartamo_brote': con_tallo('cartamo_hoja', 1.0, 0.35, hoja_plana('cartamo_hoja', 2.1, 1.3)),
    'cartamo_crecimiento': con_tallo('cartamo_hoja', 3.8, 0.4, manguito(('cartamo_hoja',), 0.25, 1.5, 2.8)),
    'cartamo_madurez': tallo_punta(('cartamo_hoja',), 2.6, 0.45, copa(('cartamo_hoja',), (1.9, 2.3, 1.7), t=(-6, 6),
                                                                     arriba=('cartamo_flor', 'cartamo_flor', 'orange')), tilt=(0, 6)),
    'cartamo_podrida': tallo_punta(('hoja_seca_dark', 'hoja_seca'), 3.4, 0.45, alterna(
        copa(('hoja_seca', 'hoja_seca_dark'), (1.2, 1.4, 1.1), t=(40, 60), arriba=('podrido_dark', 'hoja_seca_dark')),
        copa(('podrido', 'hoja_seca_dark'), (1.1, 1.3, 1.0), t=(45, 65), arriba=('moho', 'moho_dark'))), tilt=(14, 26)),
    # higuerilla (arbusto de tallo rojo vino y hoja grande en estrella verde bronce; madurez: el tallo asoma sobre la hoja
    # con la punta roja del racimo de capsulas)
    'higuerilla_siembra': semilla(('higuerilla_semilla',), (0.7, 0.45, 1.0)),
    'higuerilla_brote': con_tallo('higuerilla_tallo', 1.6, 0.45, hoja_plana('higuerilla_hoja', 2.3, 1.4)),
    'higuerilla_crecimiento': tallo_punta(('higuerilla_tallo',), 3.8, 0.55, copa(('higuerilla_hoja',), (2.9, 0.6, 2.7)),
                                          tilt=(0, 8)),
    'higuerilla_madurez': con_tallo('higuerilla_tallo', 6.4, 0.7, punta_color(('higuerilla_capsula',), alterna(
        manguito(('higuerilla_hoja',), 0.55, 3.1, 0.7), manguito(('higuerilla_hoja',), 0.62, 3.0, 0.7)))),
    'higuerilla_podrida': tallo_punta(('higuerilla_tallo', 'hoja_seca_dark'), 4.4, 0.6, alterna(
        copa(('hoja_seca', 'hoja_marchita'), (2.5, 0.6, 2.3), t=(35, 50)),
        copa(('podrido', 'hoja_seca_dark'), (2.3, 0.6, 2.1), t=(40, 55), arriba=('moho', 'moho_dark'))), tilt=(14, 24)),
    # jitomate (planta amarrada a un tutor de madera, hoja compuesta verde oscuro; madurez: jitomates rojos, alguno verde)
    'tomate_siembra': semilla(('hoja_seca_light', 'hoja_seca'), (0.5, 0.3, 0.7)),
    'tomate_brote': con_tallo('tomate_hoja_dark', 1.5, 0.4, hoja_plana('tomate_hoja', 1.9, 1.3)),
    'tomate_crecimiento': con_tutor(5.6, ('tomate_hoja', 'tomate_hoja_dark'), 1.4, 3.4),
    'tomate_madurez': alterna_plantas(
        con_tutor(6.0, ('tomate_hoja_dark', 'tomate_hoja'), 1.6, 4.6),
        mata(('tomate_hoja_dark',), 1.6, 4.4, 1.6, alterna(costado('tomate_fruto', 1.2, 0.3), costado('tomate_fruto', 1.2, 0.5),
                                                          costado('tomate_verde', 1.1, 0.45)))),
    'tomate_podrida': alterna_plantas(
        con_tutor(5.6, ('hoja_seca_dark', 'hoja_marchita', 'podrido'), 1.3, 2.4, tilt=(18, 30)),
        mata(('hoja_seca_dark', 'podrido'), 1.5, 1.2, 1.4, al_lado(('podrido', 'podrido_dark', 'moho'), (1.0, 0.8, 1.0), 1.3))),
    # papa (mata redondeada de hoja compuesta, flor blanca o lila; siembra = papa semilla brotada; madurez: la mata
    # amarillea y asoman papas beige sobre el lomo)
    'papa_siembra': mata(('papa_tuberculo', 'papa_tuberculo', 'papa_tuberculo_dark'), 1.4, 0.8, 1.1, encima('papa_hoja', 0.4)),
    'papa_brote': con_tallo('papa_hoja', 1.3, 0.45, hoja_plana('papa_hoja', 1.9, 1.5)),
    'papa_crecimiento': mata(('papa_hoja',), 2.6, 2.1, 2.5, alterna(encima('white', 0.6), encima('flor_lila', 0.6), nada)),
    'papa_madurez': mata(('hoja_marchita', 'hoja_marchita', 'papa_hoja'), 2.4, 1.6, 2.3, alterna(
        al_lado(('papa_tuberculo', 'papa_tuberculo'), (1.3, 0.8, 1.0), 2.0),
        al_lado(('papa_tuberculo', 'papa_tuberculo_dark'), (1.2, 0.75, 0.95), 2.0))),
    'papa_podrida': mata(('hoja_seca_dark', 'podrido', 'hoja_marchita'), 2.4, 0.8, 2.2,
                         al_lado(('podrido', 'papa_tuberculo_dark', 'moho'), (1.1, 0.6, 0.85), 1.8)),
    # calabacita (mata compacta de hoja grande con manchas plateadas, flor amarilla grande; madurez: calabacitas alargadas
    # verdes moteadas en la base)
    'calabacita_siembra': semilla(('calabaza_crema',), (0.9, 0.5, 1.3)),
    'calabacita_brote': con_tallo('calabaza_hoja_dark', 1.1, 0.5, hoja_plana('calabaza_hoja_light', 2.2, 1.1)),
    'calabacita_crecimiento': mata(('calabaza_hoja', 'calabaza_hoja_dark'), 3.0, 1.9, 2.8, alterna(
        encima('yellow', 0.9), encima('orange', 0.8), nada), arriba=('calabaza_mancha', 'calabaza_hoja', 'calabaza_hoja')),
    'calabacita_madurez': mata(('calabaza_hoja', 'calabaza_hoja_dark'), 2.4, 1.6, 2.3, alterna(
        con_arriba(('calabacita_fruto_light',), al_lado(('calabacita_fruto',), (2.3, 0.95, 0.95), 2.55)),
        con_arriba(('calabacita_fruto',), al_lado(('calabacita_fruto_light',), (2.1, 0.9, 0.9), 2.45)),
        encima('yellow', 0.9))),
    'calabacita_podrida': mata(('hoja_seca_dark', 'hoja_marchita', 'podrido'), 2.6, 0.9, 2.4,
                               al_lado(('podrido', 'podrido_dark', 'moho'), (2.1, 0.6, 0.7), 2.3)),
    # cebolla (mata de hojas tubulares erguidas verde azulado sobre un bulbo blanco; madurez: hojas dobladas a lo largo
    # del surco y bulbo blanco grande con la tunica dorada arriba; siembra = bulbillo con su punta verde)
    'cebolla_siembra': con_tallo('cebolla_hoja', 1.0, 0.25, pieza(('cebolla_tunica',), 0.0, 0.8, 0.6, 0, 0)),
    'cebolla_brote': con_tallo('cebolla_hoja', 2.0, 0.3, hoja('cebolla_hoja', 0.3, 0.3, 1.7, 18, 30), giro=90),
    'cebolla_crecimiento': con_tallo('cebolla_hoja', 3.6, 0.6, alterna(
        pieza(('cebolla_bulbo',), 0.0, 1.0, 0.7, 0, 0), pieza(('cebolla_bulbo',), 0.0, 1.0, 0.7, 0, 0),
        hoja('cebolla_hoja', 0.45, 0.35, 2.4, 14, 24)), giro=90),
    'cebolla_madurez': mata(('cebolla_bulbo', 'cebolla_bulbo', 'cebolla_tunica'), 1.5, 1.2, 1.5, alterna(
        hoja('cebolla_hoja', 0.85, 0.5, 2.6, 62, 78, 90), hoja('cebolla_hoja', 0.85, 0.5, 2.6, 62, 78, -90),
        hoja('hoja_marchita', 0.85, 0.5, 2.4, 70, 88, 90)), arriba=('cebolla_tunica', 'cebolla_tunica', 'cebolla_bulbo')),
    'cebolla_podrida': mata(('podrido', 'cebolla_tunica', 'podrido_dark'), 1.3, 0.8, 1.3, alterna(
        hoja('hoja_seca', 0.8, 0.65, 2.2, 82, 95, 90), hoja('hoja_seca_dark', 0.8, 0.65, 2.0, 82, 95, -90), nada),
        arriba=('moho', 'moho_light', 'podrido_dark')),
    # pepino (trepa por una espaldera: panel de follaje a lo largo del surco con postes de madera que asoman; madurez:
    # pepinos alargados verde oscuro colgando; podrida: follaje seco caido, postes oscuros y pepinos tirados)
    'pepino_siembra': semilla(('white', 'calabaza_crema'), (0.55, 0.3, 1.0)),
    'pepino_brote': con_tallo('pepino_fruto_light', 1.2, 0.4, hoja_plana('pepino_hoja', 2.0, 1.0)),
    'pepino_crecimiento': espaldera(('pepino_hoja',), 3.0, 2.4, 0.8, poste(4.4), arriba=('pepino_hoja', 'pepino_hoja', 'leaf_light')),
    'pepino_madurez': espaldera(('pepino_hoja', 'leaf'), 3.4, 3.8, 0.9, alterna(
        poste(4.8), colgado(('pepino_fruto',), 0.7, 2.0, 0.75, 0.38), colgado(('pepino_fruto',), 0.7, 1.8, 0.6, 0.38)),
        arriba=('pepino_hoja', 'pepino_hoja', 'pepino_hoja', 'yellow')),
    'pepino_podrida': espaldera(('hoja_seca_dark', 'hoja_marchita', 'hoja_seca'), 3.0, 1.8, 0.8, alterna(
        poste(4.4, 'wood_dark'), al_pie(('podrido', 'pepino_fruto', 'moho'), (1.7, 0.5, 0.5), 0.75)),
        arriba=('moho', 'hoja_seca_dark', 'podrido')),
    # melon (rastrero de hojas redondeadas; madurez: melon redondo beige con la red clara arriba y, en alguno, medio
    # melon con la pulpa naranja al aire)
    'melon_siembra': semilla(('melon_red', 'calabaza_crema'), (0.75, 0.35, 1.2)),
    'melon_brote': con_tallo('calabaza_hoja_dark', 1.0, 0.5, hoja_plana('calabaza_hoja_light', 1.8, 1.4)),
    'melon_crecimiento': guia('calabaza_hoja_dark', 3.2, alterna(
        hoja_sobre_peciolo('calabaza_hoja', 2.0, 1.0),
        hoja_sobre_peciolo('calabaza_hoja_light', 1.8, 1.0),
        al_lado(('yellow',), (0.7, 0.7, 0.7), 1.3))),
    'melon_madurez': alterna_plantas(MELON_MADURO, MELON_MADURO,
                                     guia('calabaza_hoja_dark', 3.2, hoja_sobre_peciolo('calabaza_hoja', 2.2, 1.0))),
    'melon_podrida': alterna_plantas(
        mata(('melon_cascara', 'podrido', 'podrido'), 1.9, 1.1, 1.9,
             al_lado(('hoja_seca', 'hoja_marchita'), (1.8, 0.3, 1.5), 2.0), arriba=('moho', 'moho_light', 'podrido_dark')),
        guia('hoja_seca_dark', 3.0, hoja_sobre_peciolo('hoja_seca', 1.9, 1.0))),
    # lechuga (roseta baja de hojas onduladas verde claro; madurez: cabeza redonda apretada con el corazon mas claro;
    # siembra = plantula trasplantada)
    'lechuga_siembra': semilla(('lechuga_hoja_light', 'lechuga_hoja'), (0.7, 0.35, 0.7)),
    'lechuga_brote': roseta(('lechuga_hoja',), 1.4, 0.45, ('lechuga_hoja_light',), 1.0, 0.7),
    'lechuga_crecimiento': roseta(('lechuga_hoja', 'lechuga_hoja_dark'), 2.5, 0.7, ('lechuga_hoja',), 2.0, 1.1,
                                  arriba=('lechuga_hoja_light', 'lechuga_hoja')),
    'lechuga_madurez': roseta(('lechuga_hoja_dark', 'lechuga_hoja'), 2.6, 0.7, ('lechuga_hoja',), 1.9, 1.9,
                              arriba=('lechuga_hoja_light',)),
    'lechuga_podrida': roseta(('hoja_marchita', 'hoja_seca'), 2.5, 0.4, ('podrido', 'lechuga_hoja_dark', 'podrido_dark'), 1.6, 0.9,
                              arriba=('moho', 'moho_light', 'podrido_dark')),
    # zanahoria (penacho plumoso verde fino abierto en V a lo largo del surco; madurez: hombro naranja asomando del lomo
    # con su penacho; podrida: hombro oscuro con moho y penacho seco tumbado)
    'zanahoria_siembra': semilla(('hoja_seca', 'hoja_seca_dark'), (0.45, 0.3, 0.75)),
    'zanahoria_brote': abanico(('zanahoria_hoja',), (0.5, 1.4, 0.3), (14, 24)),
    'zanahoria_crecimiento': abanico(('zanahoria_hoja', 'leaf'), (0.9, 2.6, 0.45), (14, 26)),
    'zanahoria_madurez': hombro(('zanahoria_raiz',), (1.3, 0.9, 1.3), 0.3,
                                fronda(('zanahoria_hoja', 'zanahoria_hoja', 'leaf'), (0.5, 2.9, 1.5), (10, 22))),
    'zanahoria_podrida': hombro(('podrido', 'zanahoria_raiz_dark', 'podrido_dark'), (1.1, 0.6, 1.1), 0.35,
                                fronda(('hoja_seca', 'hoja_seca_dark', 'hoja_marchita'), (0.6, 2.4, 0.9), (65, 85)),
                                arriba=('moho', 'moho_light', 'zanahoria_raiz_dark')),
    # berenjena (arbusto de hoja verde grisaceo, flor lila; madurez: frutos morado oscuro brillante colgando con su caliz
    # verde; podrida: arbusto seco y frutos tirados con moho)
    'berenjena_siembra': semilla(('hoja_seca_light', 'hoja_seca'), (0.5, 0.3, 0.7)),
    'berenjena_brote': con_tallo('berenjena_hoja', 1.3, 0.4, hoja_plana('berenjena_hoja', 2.0, 1.3)),
    'berenjena_crecimiento': mata(('berenjena_hoja',), 2.4, 2.4, 2.3, alterna(
        encima('flor_lila', 0.6), nada, nada)),
    'berenjena_madurez': mata(('berenjena_hoja',), 2.4, 2.8, 2.3, alterna(
        con_cara('up', ('berenjena_hoja',), con_cara('east', ('berenjena_brillo',), vaina_costado(
            ('berenjena_fruto',), 0.12, 0.95, 1.8, 1.3, -6, 6))),
        con_cara('up', ('berenjena_hoja',), con_cara('east', ('berenjena_brillo',), vaina_costado(
            ('berenjena_fruto',), 0.2, 0.9, 1.6, 1.3, -6, 6))),
        encima('flor_lila', 0.6))),
    'berenjena_podrida': mata(('hoja_seca_dark', 'hoja_marchita', 'podrido'), 2.2, 1.3, 2.0,
                              con_arriba(('moho', 'moho_light'), al_lado(('berenjena_fruto', 'podrido_dark', 'podrido'),
                                                                         (1.6, 0.75, 0.8), 1.9))),
    # brocoli (hojas glaucas grandes y erguidas; madurez: cabeza verde oscura granulada arriba al centro; podrida: hojas
    # marchitas y la cabeza pasada, florecida en amarillo o podrida con moho)
    'brocoli_siembra': semilla(('chile_hoja_light', 'chile_hoja'), (0.7, 0.4, 0.7)),
    'brocoli_brote': roseta(('chile_hoja',), 1.4, 0.6, ('chile_hoja_light',), 0.9, 1.0),
    'brocoli_crecimiento': roseta(('chile_hoja', 'chile_hoja_dark'), 2.4, 1.4, ('chile_hoja',), 1.7, 1.9,
                                  arriba=('chile_hoja_light', 'chile_hoja')),
    'brocoli_madurez': roseta(('chile_hoja', 'chile_hoja_dark'), 2.6, 1.7, ('brocoli_cabeza',), 1.5, 2.4,
                              arriba=('brocoli_cabeza_dark', 'brocoli_cabeza_dark', 'brocoli_cabeza')),
    'brocoli_podrida': roseta(('hoja_marchita', 'hoja_seca', 'chile_hoja_dark'), 2.4, 0.9, ('podrido', 'brocoli_cabeza_dark'),
                              1.3, 1.6, arriba=('yellow', 'moho', 'podrido_dark')),
    # col (hojas glaucas anchas y abiertas casi al ras; madurez: bola lisa verde claro; podrida: bola hundida con moho)
    'col_siembra': semilla(('brasica_hoja', 'brasica_hoja_light'), (0.75, 0.35, 0.75)),
    'col_brote': roseta(('brasica_hoja',), 1.6, 0.45, ('brasica_hoja_light',), 1.0, 0.7),
    'col_crecimiento': roseta(('brasica_hoja', 'brasica_hoja_dark'), 2.6, 0.7, ('brasica_hoja_light',), 1.6, 1.2,
                              arriba=('brasica_hoja_light', 'col_cabeza')),
    'col_madurez': roseta(('brasica_hoja_dark', 'brasica_hoja'), 2.7, 0.7, ('col_cabeza',), 1.9, 1.6,
                          arriba=('col_cabeza',)),
    'col_podrida': roseta(('hoja_marchita', 'hoja_seca', 'hoja_seca_dark'), 2.6, 0.4, ('podrido', 'col_cabeza', 'podrido_dark'),
                          1.8, 1.1, arriba=('moho', 'moho_light', 'podrido_dark')),
    # coliflor (hojas glaucas erguidas que abrazan la pella; madurez: pella crema que asoma arriba; podrida: pella
    # manchada de cafe y moho)
    'coliflor_siembra': semilla(('chicharo_hoja_light', 'chicharo_hoja'), (0.65, 0.45, 0.65)),
    'coliflor_brote': roseta(('chicharo_hoja_light',), 1.3, 0.7, ('chicharo_hoja',), 0.8, 1.1),
    'coliflor_crecimiento': roseta(('chicharo_hoja', 'chicharo_hoja_dark'), 2.2, 1.8, ('chicharo_hoja',), 1.5, 2.2,
                                   arriba=('chicharo_hoja_light',)),
    'coliflor_madurez': roseta(('chicharo_hoja', 'chicharo_hoja_dark'), 2.4, 2.0, ('coliflor_cabeza_dark',), 1.6, 2.4,
                               arriba=('coliflor_cabeza',)),
    'coliflor_podrida': roseta(('hoja_marchita', 'hoja_seca_dark', 'hoja_seca'), 2.2, 1.0, ('coliflor_cabeza_dark', 'podrido'),
                               1.4, 1.4, arriba=('podrido', 'moho', 'moho_dark')),
    # espinaca (roseta baja de hojas lisas verde oscuro brillante; podrida: espigada, roseta seca y tallo floral)
    'espinaca_siembra': semilla(('hoja_seca', 'hoja_seca_light'), (0.5, 0.35, 0.5)),
    'espinaca_brote': abanico(('espinaca_hoja',), (0.6, 1.3, 0.3), (28, 42)),
    'espinaca_crecimiento': roseta(('espinaca_hoja', 'espinaca_hoja_dark'), 2.0, 0.5, ('espinaca_hoja',), 1.5, 0.8),
    'espinaca_madurez': roseta(('espinaca_hoja_dark',), 2.5, 0.6, ('espinaca_hoja_dark', 'espinaca_hoja'), 1.9, 1.0,
                               arriba=('espinaca_hoja',)),
    'espinaca_podrida': mata(('hoja_marchita', 'hoja_seca_dark', 'podrido'), 2.1, 0.4, 2.0,
                             con_arriba(('hoja_seca_light', 'hoja_marchita'), pieza(('hoja_marchita', 'hoja_seca'), 0.5, 0.4, 3.0,
                                                                                    6, 16, 90)),
                             arriba=('moho', 'hoja_seca_dark', 'moho_light')),
    # rabano (roseta chica verde; madurez: bolita roja asomando del lomo con sus hojas y, en alguna, el rabano ya
    # arrancado tendido con la punta blanca; podrida: bola oscura con moho y hojas secas tumbadas)
    'rabano_siembra': semilla(('wood', 'hoja_seca'), (0.45, 0.35, 0.45)),
    'rabano_brote': con_tallo('leaf_light', 0.7, 0.3, hoja_plana('leaf_light', 1.6, 0.9)),
    'rabano_crecimiento': roseta(('leaf', 'leaf_dark'), 1.7, 0.6, ('leaf_light', 'leaf'), 1.1, 1.2),
    'rabano_madurez': alterna_plantas(
        hombro(('rabano_raiz',), (1.3, 1.1, 1.3), 0.3, fronda(('leaf', 'leaf', 'leaf_dark'), (0.5, 1.7, 1.5), (16, 30))),
        hombro(('rabano_raiz',), (1.3, 1.1, 1.3), 0.3, fronda(('leaf', 'leaf', 'leaf_dark'), (0.5, 1.7, 1.5), (16, 30))),
        mata(('leaf', 'leaf_dark'), 1.4, 0.8, 1.3, con_cara('east', ('white',), al_lado(('rabano_raiz',), (1.5, 0.95, 0.95), 1.5)))),
    'rabano_podrida': hombro(('rabano_raiz', 'podrido', 'podrido_dark'), (1.1, 0.7, 1.1), 0.35,
                             fronda(('hoja_seca', 'hoja_seca_dark', 'hoja_marchita'), (0.6, 1.9, 0.9), (65, 85)),
                             arriba=('moho', 'moho_light', 'podrido_dark')),
    # betabel (hojas verde oscuro con peciolo rojo; madurez: raiz morada grande asomando, con la corona roja de los
    # peciolos arriba; podrida: raiz oscura con moho y hojas secas tumbadas)
    'betabel_siembra': semilla(('hoja_seca', 'hoja_seca_dark'), (0.6, 0.4, 0.6)),
    'betabel_brote': con_tallo('betabel_nervio', 0.9, 0.3, hoja_plana('leaf', 1.6, 0.8)),
    'betabel_crecimiento': tallo_punta(('betabel_nervio',), 1.2, 0.8, copa(('leaf_dark', 'leaf_dark', 'leaf'), (2.2, 0.8, 2.0),
                                                                          arriba=('leaf_dark', 'leaf'))),
    'betabel_madurez': hombro(('betabel_raiz',), (1.7, 1.3, 1.7), 0.35,
                              fronda(('leaf_dark', 'leaf_dark', 'leaf'), (0.6, 2.1, 2.0), (10, 22)), arriba=('betabel_nervio',)),
    'betabel_podrida': hombro(('betabel_raiz_dark', 'podrido', 'podrido_dark'), (1.4, 0.8, 1.4), 0.4,
                              fronda(('hoja_seca_dark', 'hoja_marchita', 'hoja_seca'), (0.6, 2.2, 1.1), (65, 85)),
                              arriba=('moho', 'moho_light', 'podrido_dark')),
}

CULTIVOS_ETAPAS = [(c, e) for c in ('maiz', 'frijol', 'calabaza', 'chile', 'sorgo', 'sandia', 'camote', 'cacahuate',
                                    'soya', 'caupi', 'haba', 'chicharo', 'lenteja',
                                    'ejote', 'cebada', 'trigo', 'avena', 'maiz_dulce',
                                    'yuca', 'cana', 'ajonjoli', 'girasol', 'algodon',
                                    'cartamo', 'higuerilla', 'tomate', 'papa', 'calabacita',
                                    'cebolla', 'pepino', 'melon', 'lechuga', 'zanahoria',
                                    'berenjena', 'brocoli', 'col', 'coliflor', 'espinaca', 'rabano', 'betabel')
                   for e in ('siembra', 'brote', 'crecimiento', 'madurez', 'podrida')]


# Detalles por surco ademas de las 9 plantas (fuera de siembra, que lleva su franja humeda)
EXTRAS = {'yuca_madurez': raices_yuca}


def modelo(cultivo, etapa):
    clave = f'{cultivo}_{etapa}'
    extra = franja_siembra if etapa == 'siembra' else EXTRAS.get(clave)
    return bloque(clave + '_bloque', PLANTAS[clave], clave + '_bloque', extra=extra)


MODELOS = [(f'{c}_{e}_bloque', (lambda c=c, e=e: modelo(c, e))) for c, e in CULTIVOS_ETAPAS]

if __name__ == '__main__':
    rutas = [guardar(f(), nombre) for nombre, f in MODELOS]
    print(build_visor(os.path.join(AQUI, 'visor_bloques.html'), rutas), 'cubos en visor_bloques.html')
