"""Generador de las losas de suelo (AgroHive, A2.12): 3 tipos x 3 humedades.

Correr desde la raiz del repo:
    python modelos/suelos/suelos.py

Cada modelo es una LOSA DELGADA que se pone encima de la columna procedural de
la escena (web/src/escena/suelo.ts), no un bloque completo:
- ocupa la celda entera x[-8,8], z[-8,8] para que las celdas contiguas encajen;
- cuerpo de 2 unidades, de y=-2 a y=0 (la cara superior queda en y=0);
- el detalle sobresale como maximo 1 unidad (y <= 1).
Los modelos de planta se apoyan en y=0 con un lomo de 14x2x10 al centro, asi que
el detalle se reparte por toda la cara (en suelo desnudo se ve todo) pero cuida
los margenes (|z|>5, |x|>7), que es lo que queda visible bajo una planta.

Tipos = grupos del selector de suelo (arenoso, franco, arcilloso). Humedades =
los tres puntos de la escala de suelo.ts (seco, medio, humedo). El franco usa los
mismos colores que la columna (suelo_seco, soil, suelo_humedo). Los looks son
cualitativos, no mediciones.
"""
import math
import os
import random
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas'))
sys.path.insert(0, os.path.join(AQUI, '..'))

from voxelkit import Model  # noqa: E402
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402

HUELLA = 8.0      # medio ancho de la celda (16 / 2)
GROSOR = 2.0      # espesor del cuerpo de la losa
TOPE = 1.0        # maximo que puede sobresalir el detalle por encima de y=0
RAS = 0.05        # lo que asoma una grieta "al ras" para no pelear con la cara superior


# ---------------- utilidades ----------------
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
    print(f'{nombre}: {n} cubos, x[{lo[0]:.2f},{hi[0]:.2f}] y[{lo[1]:.2f},{hi[1]:.2f}] '
          f'z[{lo[2]:.2f},{hi[2]:.2f}]')
    if max(abs(lo[0]), abs(hi[0]), abs(lo[2]), abs(hi[2])) > HUELLA + 0.01:
        print(f'  AVISO: {nombre} sale de la celda 16x16')
    if lo[1] < -GROSOR - 0.01 or hi[1] > TOPE + 0.01:
        print(f'  AVISO: {nombre} sale de y[-2,1]')
    if not 12 <= n <= 35:
        print(f'  AVISO: {nombre} fuera del presupuesto de 12 a 35 cubos')
    return ruta


def cuerpo(m, col):
    """Losa base: 16x2x16, cara superior en y=0."""
    m.box('cuerpo', (0, -GROSOR, 0), (16, GROSOR, 16), col)


def dentro(x, z, w, d, yaw=0.0):
    """True si una caja de w x d centrada en (x, z) y girada yaw cabe en la celda."""
    a = math.radians(yaw)
    ex = abs(w / 2 * math.cos(a)) + abs(d / 2 * math.sin(a))
    ez = abs(w / 2 * math.sin(a)) + abs(d / 2 * math.cos(a))
    return abs(x) + ex <= HUELLA - 0.1 and abs(z) + ez <= HUELLA - 0.1


def granos(m, pref, n, cols, tam, alto, semilla, yaw=True):
    """n granos sueltos repartidos por la cara superior (sin encimarse demasiado)."""
    rnd = random.Random(semilla)
    puestos = []
    k = 0
    intentos = 0
    while k < n and intentos < 2000:
        intentos += 1
        x, z = rnd.uniform(-7.4, 7.4), rnd.uniform(-7.4, 7.4)
        w = rnd.uniform(*tam)
        d = rnd.uniform(*tam)
        a = rnd.uniform(-40, 40) if yaw else 0.0
        if not dentro(x, z, w, d, a):
            continue
        if any((x - px) ** 2 + (z - pz) ** 2 < 2.6 ** 2 for px, pz in puestos):
            continue
        puestos.append((x, z))
        h = rnd.uniform(*alto)
        m.box(f'{pref}{k}', (x, 0, z), (w, h, d), cols[k % len(cols)], yaw=a)
        k += 1
    return k


# ---------------- arenoso ----------------
# Arena: claro y amarillento, grano fino, casi sin terrones. Rizos de viento en lo
# seco (lo mas reconocible de una arena suelta), que desaparecen al mojarse.
def arenoso_seco():
    """Arena seca: la mas clara, granos claros y oscuros que resaltan, rizos y dos piedritas. 24 cubos."""
    m = Model('suelo_arenoso_seco', PAL)
    cuerpo(m, 'arenoso_seco')
    for k, (x, z, L, a) in enumerate([(-3.0, -5.6, 9.0, 8), (2.4, 0.4, 10.0, 8), (-1.5, 6.0, 9.5, 8)]):
        m.box(f'rizo{k}', (x, 0, z), (L, 0.25, 1.1), 'arenoso_seco_light', yaw=a)
    granos(m, 'grano', 18, ('arenoso_seco_dark', 'arenoso_seco_light', 'arenoso_seco_dark'),
           (0.5, 0.8), (0.3, 0.45), semilla=11)
    m.box('piedrita0', (5.6, 0, -6.2), (1.4, 0.8, 1.1), 'stone', yaw=25)
    m.box('piedrita1', (-6.3, 0, 2.6), (1.0, 0.6, 0.9), 'stone', yaw=-30)
    return m


def arenoso_medio():
    """Arena con humedad media: mas oscura, granos dispersos, un rizo suave y una piedrita. 16 cubos."""
    m = Model('suelo_arenoso_medio', PAL)
    cuerpo(m, 'arenoso_medio')
    m.box('rizo0', (-2.0, 0, 5.8), (9.0, 0.2, 1.0), 'arenoso_medio_light', yaw=8)
    m.box('mancha0', (3.4, 0, -4.6), (5.0, 0.12, 3.6), 'arenoso_medio_dark', yaw=20)
    granos(m, 'grano', 12, ('arenoso_medio_light', 'arenoso_medio_dark'), (0.5, 0.75), (0.25, 0.35), semilla=23)
    m.box('piedrita0', (-6.0, 0, -5.8), (1.2, 0.7, 1.0), 'stone', yaw=35)
    return m


def arenoso_humedo():
    """Arena humeda: oscura y uniforme, granos apenas visibles, dos manchas de agua. 13 cubos."""
    m = Model('suelo_arenoso_humedo', PAL)
    cuerpo(m, 'arenoso_humedo')
    m.box('mancha0', (-3.6, 0, -4.4), (6.0, 0.1, 4.0), 'arenoso_humedo_dark', yaw=-15)
    m.box('mancha1', (4.2, 0, 4.8), (5.0, 0.1, 3.4), 'arenoso_humedo_dark', yaw=25)
    granos(m, 'grano', 10, ('arenoso_humedo_light', 'arenoso_humedo_dark'), (0.5, 0.7), (0.15, 0.25), semilla=37)
    return m


# ---------------- franco ----------------
# Franco: marron medio, terroncitos pequenos y mezclados. Colores = los de la columna.
def terrones(m, pref, specs, cols):
    for k, (x, z, w, d, h, a) in enumerate(specs):
        m.box(f'{pref}{k}', (x, 0, z), (w, h, d), cols[k % len(cols)], yaw=a)


TERRONES = [(-5.6, -5.8, 2.0, 1.6, 0.8, 20), (-0.8, -6.4, 1.6, 1.4, 0.6, -25), (4.6, -5.4, 2.2, 1.8, 0.9, 35),
            (6.4, -1.0, 1.4, 1.2, 0.6, 10), (-6.4, 0.4, 1.6, 1.8, 0.7, -15), (-2.4, 1.6, 1.8, 1.5, 0.6, 40),
            (2.6, 2.2, 1.5, 1.3, 0.7, -35), (-4.8, 6.0, 1.8, 1.6, 0.8, 15), (0.8, 6.2, 1.4, 1.6, 0.6, -10),
            (5.6, 5.6, 2.0, 1.7, 0.9, 30), (1.6, -2.4, 1.2, 1.1, 0.5, 5), (-6.6, -2.8, 1.0, 1.1, 0.5, 30)]


def franco_seco():
    """Franco seco: base clara (suelo_seco), terrones mezclados y grietas finas. 16 cubos."""
    m = Model('suelo_franco_seco', PAL)
    cuerpo(m, 'suelo_seco')
    # grietas finas: hundidas 1 unidad, asoman RAS para no pelear con la cara superior
    for k, (x, z, L, a) in enumerate([(-1.0, -2.8, 7.0, 20), (3.2, 3.6, 6.0, -35), (-4.6, 3.4, 4.0, 70)]):
        m.box(f'grieta{k}', (x, -1.0, z), (L, 1.0 + RAS, 0.4), 'suelo_grieta', yaw=a)
    terrones(m, 'terron', TERRONES[:10] + TERRONES[11:],
             ('soil_light', 'soil', 'soil_light', 'soil_dark'))
    m.box('costra', (2.0, 0, -0.6), (3.2, 0.15, 2.4), 'soil_light', yaw=-20)
    return m


def franco_medio():
    """Franco con humedad media: base soil, 12 terroncitos claros y oscuros mezclados. 13 cubos."""
    m = Model('suelo_franco_medio', PAL)
    cuerpo(m, 'soil')
    terrones(m, 'terron', TERRONES, ('soil_dark', 'soil_light', 'soil_dark', 'suelo_seco'))
    return m


def franco_humedo():
    """Franco humedo: base oscura, terrones redondeados (cuerpo + tapa chica) y un charquito. 16 cubos."""
    m = Model('suelo_franco_humedo', PAL)
    cuerpo(m, 'suelo_humedo')
    redondos = [(-5.4, -5.6, 2.2, 0.6, 20), (4.4, -5.6, 2.4, 0.7, -30), (-6.0, 1.0, 1.8, 0.5, 10),
                (6.2, 0.4, 1.8, 0.5, 40), (-3.6, 5.8, 2.2, 0.6, -15), (3.6, 6.0, 2.4, 0.7, 25),
                (0.4, -1.0, 1.8, 0.5, 0)]
    for k, (x, z, w, h, a) in enumerate(redondos):
        m.box(f'terron{k}', (x, 0, z), (w, h, w * 0.85), 'soil_dark', yaw=a)
        m.box(f'terron{k}_tapa', (x, h, z), (w * 0.6, 0.3, w * 0.5), 'soil', yaw=a)
    m.box('charco', (0.6, 0, 3.0), (3.6, 0.08, 2.0), 'suelo_grieta', yaw=-10)
    return m


# ---------------- arcilloso ----------------
# Arcilla: rojiza y oscura. Seca = placas poligonales separadas por grietas (el fondo
# de la losa es oscuro y las placas son la capa de arriba); humeda = lisa con brillo.
def placas_secas():
    """Particion irregular de la celda en placas (x0, x1, z0, z1). Bordes de celda al ras."""
    filas = [(-8.0, -2.6, [-8.0, -3.2, 2.4, 8.0]),
             (-2.6, 2.8, [-8.0, -5.2, 0.4, 4.6, 8.0]),
             (2.8, 8.0, [-8.0, -1.8, 3.4, 8.0])]
    out = []
    for z0, z1, xs in filas:
        for x0, x1 in zip(xs, xs[1:]):
            out.append((x0, x1, z0, z1))
    return out


def arcilloso_seco():
    """Arcilla seca: placas rojizas con grietas poligonales hundidas y bordes levantados. 18 cubos."""
    m = Model('suelo_arcilloso_seco', PAL)
    # fondo de grieta: la mitad inferior de la losa, oscura
    m.box('cuerpo', (0, -GROSOR, 0), (16, 1.0, 16), 'arcilloso_seco_dark')
    g = 0.5    # medio ancho de grieta entre placas
    levantadas = {1: (5, 0), 4: (-5, 90), 8: (6, 180)}   # indice -> (tilt, yaw): borde que se enrosca
    claras = {1, 4, 6, 8}
    for k, (x0, x1, z0, z1) in enumerate(placas_secas()):
        a0 = x0 + (g if x0 > -HUELLA else 0)
        a1 = x1 - (g if x1 < HUELLA else 0)
        b0 = z0 + (g if z0 > -HUELLA else 0)
        b1 = z1 - (g if z1 < HUELLA else 0)
        c = ((a0 + a1) / 2, -1.0, (b0 + b1) / 2)
        col = 'arcilloso_seco_light' if k in claras else 'arcilloso_seco'
        if k in levantadas:
            t, yw = levantadas[k]
            # se achica un poco para que al inclinarse no salga de la celda ni pase de y=1
            m.box(f'placa{k}', c, (a1 - a0 - 0.6, 1.0, b1 - b0 - 0.6), col, tilt=t, yaw=yw)
        else:
            m.box(f'placa{k}', c, (a1 - a0, 1.0, b1 - b0), col)
    # grietas diagonales que parten las placas grandes y rompen la reticula
    for k, (x, z, L, a) in enumerate([(-5.6, -5.2, 4.6, 35), (5.2, -5.0, 4.0, -40), (-4.8, 5.4, 5.0, -30),
                                      (5.6, 5.2, 3.6, 50), (2.4, 0.0, 3.0, 20)]):
        m.box(f'grieta{k}', (x, -1.0, z), (L, 1.0 + RAS, 0.6), 'arcilloso_seco_dark', yaw=a)
    # escamas sueltas
    m.box('escama0', (-1.0, 0, -5.4), (1.2, 0.3, 0.9), 'arcilloso_seco_light', yaw=25)
    m.box('escama1', (6.6, 0, 1.4), (0.9, 0.3, 1.0), 'arcilloso_seco', yaw=-20)
    return m


def arcilloso_medio():
    """Arcilla con humedad media: rojiza oscura, grietas cerrandose y terrones lisos. 13 cubos."""
    m = Model('suelo_arcilloso_medio', PAL)
    cuerpo(m, 'arcilloso_medio')
    for k, (x, z, L, a) in enumerate([(-3.6, -5.6, 7.0, 15), (4.4, -3.8, 5.0, -50), (-4.8, 4.2, 6.0, -25),
                                      (3.8, 5.4, 5.0, 30)]):
        m.box(f'grieta{k}', (x, -0.6, z), (L, 0.6 + RAS, 0.3), 'arcilloso_medio_dark', yaw=a)
    lisos = [(-6.0, -1.4, 2.4, 2.0, 0.4, 15), (6.0, 1.0, 2.2, 1.8, 0.4, -20), (0.0, -6.4, 2.6, 1.6, 0.35, 5),
             (-0.6, 6.2, 2.4, 1.8, 0.4, -10), (1.6, 1.0, 2.0, 1.6, 0.3, 30), (-6.2, 6.4, 1.6, 1.4, 0.3, 40)]
    for k, (x, z, w, d, h, a) in enumerate(lisos):
        m.box(f'liso{k}', (x, 0, z), (w, h, d), 'arcilloso_medio_light', yaw=a)
    m.box('mancha', (5.2, 0, -6.2), (3.0, 0.1, 2.0), 'arcilloso_medio_dark', yaw=10)
    m.box('mancha2', (-2.6, 0, -1.6), (2.6, 0.1, 2.0), 'arcilloso_medio_dark', yaw=-30)
    return m


def arcilloso_humedo():
    """Arcilla humeda: lisa y oscura, ondulaciones bajas, charcos y tres brillos. 12 cubos."""
    m = Model('suelo_arcilloso_humedo', PAL)
    cuerpo(m, 'arcilloso_humedo')
    # ondulaciones bajas del mismo color: solo se notan por el canto, la tapa sigue lisa
    for k, (x, z, w, d, a) in enumerate([(-4.6, -5.0, 5.0, 4.0, 15), (4.8, -1.6, 4.4, 5.0, -10),
                                         (-4.4, 4.2, 5.2, 4.2, -20), (3.6, 6.0, 4.6, 2.8, 5)]):
        m.box(f'loma{k}', (x, 0, z), (w, 0.3, d), 'arcilloso_humedo', yaw=a)
    m.box('charco0', (0.6, 0, -6.2), (4.0, 0.1, 2.4), 'arcilloso_humedo_dark', yaw=-8)
    m.box('charco1', (-6.2, 0, 0.0), (2.6, 0.1, 3.4), 'arcilloso_humedo_dark', yaw=12)
    m.box('charco2', (6.0, 0, 3.2), (2.4, 0.1, 1.8), 'arcilloso_humedo_dark', yaw=-25)
    m.box('charco3', (0.2, 0, 2.0), (3.0, 0.1, 2.2), 'arcilloso_humedo_dark', yaw=20)
    # brillos sobre las lomas (lo unico claro de la arcilla mojada)
    m.box('brillo0', (-4.2, 0.3, -5.2), (1.2, 0.1, 0.6), 'arcilloso_humedo_light', yaw=15)
    m.box('brillo1', (5.2, 0.3, -2.4), (0.9, 0.1, 0.6), 'arcilloso_humedo_light', yaw=-10)
    m.box('brillo2', (-3.6, 0.3, 5.0), (1.0, 0.1, 0.5), 'arcilloso_humedo_light', yaw=-20)
    return m


VARIANTES = [('suelo_arenoso_seco', arenoso_seco), ('suelo_arenoso_medio', arenoso_medio),
             ('suelo_arenoso_humedo', arenoso_humedo),
             ('suelo_franco_seco', franco_seco), ('suelo_franco_medio', franco_medio),
             ('suelo_franco_humedo', franco_humedo),
             ('suelo_arcilloso_seco', arcilloso_seco), ('suelo_arcilloso_medio', arcilloso_medio),
             ('suelo_arcilloso_humedo', arcilloso_humedo)]

if __name__ == '__main__':
    for nombre, f in VARIANTES:
        guardar(f(), nombre)
