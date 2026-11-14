"""Generador de la mascota de AgroHive: un elote con cara feliz.

Correr desde la raiz del repo:
    python modelos/props/mascota.py

Genera modelos/props/mascota_feliz.bbmodel. No es una planta ni va en una celda: es un personaje
que la interfaz puede mostrar en una esquina o en tutoriales. Convenciones (docs/07): 1 unidad =
1 px de voxel, origen en el centro de la base, y=0 superficie de apoyo, +Y arriba, +Z frente (la cara
mira a +Z; en el preview se ve de frente con azimut 215). Cabe en x[-8,8] y z[-8,8].

Rasgos que se respetan: mazorca vertical de grano amarillo con la punta redondeada (escalonada en
cruz, look voxel), hileras de granos insinuadas con tiras y granos de dos tonos, totomoxtle verde
abierto como falda con puntas afiladas, mechon de cabello en la punta, y una cara feliz grande al
frente (ojos con brillo, sonrisa en U y mejillas rosadas). Medidas cualitativas, no reales.
"""
import math
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas'))
sys.path.insert(0, os.path.join(AQUI, '..'))
sys.path.insert(0, os.path.join(AQUI, '..', 'cultivos'))

from voxelkit import Model  # noqa: E402
from paleta import PALETA_AGROHIVE as PAL  # noqa: E402
from maiz import esquinas, punta  # noqa: E402  (utilidades compartidas de la milpa)

HUELLA = 8.0      # medio ancho permitido en x y z
Y0 = 1.0          # base del cuerpo (encima de los pies)
Y1 = 21.0         # fin del tramo recto del cuerpo
ANCHO = 8.0       # ancho del frente (donde va la cara)
FONDO = 9.0       # fondo de la caja frontal; la cara queda en z = FONDO / 2
ZC = FONDO / 2    # plano de la cara
RELIEVE = 0.6     # grosor de ojos, boca y mejillas (sobresalen RELIEVE / 2)


# ---------------- utilidades ----------------
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


def mover(p, yaw, d, dy=0.0):
    """Punto a d unidades de p en la direccion horizontal yaw (grados), mas dy en altura."""
    y = math.radians(yaw)
    return (p[0] + d * math.sin(y), p[1] + dy, p[2] + d * math.cos(y))


def cara(m, nombre, x, y, w, h, col, dz=0.0, d=RELIEVE):
    """Cubito pegado al frente: (x, y) es el centro de su cara inferior sobre el plano z = ZC."""
    m.box(nombre, (x, y, ZC + dz), (w, h, d), col)


def hoja(m, nombre, yaw, alto, ancho, cols, abre=16, r=5.0):
    """Hoja de totomoxtle que nace junto a la base del cuerpo hacia yaw y se abre hacia afuera:
    lamina ancha, tramo medio y punta angosta afilada, cada tramo mas abierto. 3 cubos."""
    p = mover((0, 0.3, 0), yaw, r)     # baja casi al suelo para que al abrirse no deje hueco
    m.box(nombre, p, (ancho, alto, 0.6), cols[0], tilt=abre, yaw=yaw)
    t = punta(p, alto, abre, yaw)
    m.box(nombre + '_medio', t, (ancho * 0.6, alto * 0.28, 0.5), cols[0], tilt=abre + 6, yaw=yaw)
    t = punta(t, alto * 0.28, abre + 6, yaw)
    m.box(nombre + '_punta', t, (ancho * 0.26, alto * 0.24, 0.4), cols[1], tilt=abre + 12, yaw=yaw)


# ---------------- modelo ----------------
def mascota_feliz():
    """Elote feliz de pie: pies, falda de totomoxtle, cuerpo de grano, cara, bracitos y cabello."""
    m = Model('mascota_feliz', PAL)

    # pies: dos zapatitos de hoja que asoman al frente (lo unico que toca y=0)
    for k, s in enumerate((-1, 1)):
        m.box(f'pie{k}', (s * 2.2, 0, 1.2), (2.8, Y0 + 0.2, 5.0), 'totomoxtle_dark', yaw=s * 8)
        m.box(f'pie{k}_punta', (s * 2.2 + s * 0.25, 0, 3.4), (2.4, 0.9, 1.4), 'totomoxtle', yaw=s * 8)

    # cuerpo: dos cajas en cruz (esquinas recortadas, look voxel redondeado); la de fondo FONDO da el frente plano
    alto = Y1 - Y0
    m.box('cuerpo', (0, Y0, 0), (ANCHO, alto, FONDO), 'grano')
    m.box('cuerpo_lados', (0, Y0, 0), (ANCHO + 2.0, alto, FONDO - 2.0), 'grano')
    m.box('cuerpo_base', (0, Y0 - 0.01, 0), (ANCHO + 1.0, 1.2, FONDO - 1.0), 'grano_dark')
    # punta redondeada: dos escalones que se angostan, lo claro arriba (luz)
    m.box('hombro', (0, Y1, 0), (ANCHO - 1.0, 1.8, FONDO - 2.0), 'grano')
    m.box('hombro_b', (0, Y1, 0), (ANCHO + 0.4, 1.8, FONDO - 3.2), 'grano')
    m.box('hombro_c', (0, Y1, 0), (ANCHO - 2.6, 1.8, FONDO - 0.6), 'grano')
    m.box('corona', (0, Y1 + 1.8, 0), (ANCHO - 3.0, 1.2, FONDO - 4.0), 'grano_light')
    m.box('corona_b', (0, Y1 + 1.8, 0), (ANCHO - 4.4, 1.2, FONDO - 2.4), 'grano_light')
    m.box('punta', (0, Y1 + 3.0, 0), (2.6, 0.8, 2.6), 'grano_light', yaw=45)

    # hileras de granos: tiras verticales mas oscuras en lados y espalda, y granos claros entre ellas
    xl = (ANCHO + 2.0) / 2
    for k, s in enumerate((-1, 1)):
        for j, z in enumerate((-1.6, 1.6)):
            m.box(f'hilera_lado{k}{j}', (s * xl, 10.5, z), (0.3, 10.0, 0.4), 'grano_dark')
        for j, (z, y) in enumerate(((0.0, 17.5), (2.9, 14.0))):
            m.box(f'grano_lado{k}{j}', (s * xl, y, z), (0.4, 1.2, 1.2), 'grano_light')
    for j, x in enumerate((-2.0, 0.0, 2.0)):
        m.box(f'hilera_espalda{j}', (x, 10.5, -ZC), (0.4, 10.0, 0.3), 'grano_dark')
    # al frente: hilera de granos claros en la frente y dos surcos en la panza (entre la falda)
    for j, x in enumerate((-2.6, -0.9, 0.9, 2.6)):
        cara(m, f'grano_frente{j}', x, 19.6, 1.2, 1.0, 'grano_light', d=0.4)
    for j, x in enumerate((-1.3, 1.3)):
        cara(m, f'hilera_panza{j}', x, 2.4, 0.4, 7.0, 'grano_dark', d=0.3)

    # falda de totomoxtle: 5 hojas abiertas, con hueco al frente para que se vean panza y pies
    falda = [(40, 7.5, 4.4, ('totomoxtle', 'maiz_hoja_light'), 13, 5.8),
             (140, 8.0, 4.8, ('totomoxtle_dark', 'totomoxtle'), 13, 5.8),
             (180, 7.5, 5.0, ('totomoxtle', 'maiz_hoja_light'), 10, 4.8),
             (220, 8.0, 4.8, ('totomoxtle_dark', 'totomoxtle'), 13, 5.8),
             (320, 7.5, 4.4, ('totomoxtle', 'maiz_hoja_light'), 13, 5.8)]
    for k, (yaw, alto_h, ancho_h, cols, abre, r) in enumerate(falda):
        hoja(m, f'totomoxtle{k}', yaw, alto_h, ancho_h, cols, abre, r)

    # bracitos de hoja: el izquierdo (x-) abajo y el derecho (x+) saludando
    hombro_i = (-xl + 0.6, 12.0, 1.2)
    t = m.stem('brazo_izq', hombro_i, 3.0, 1.2, 'totomoxtle_dark', tilt=145, yaw=-90)
    m.box('mano_izq', (t[0], t[1] - 0.8, t[2]), (1.6, 1.6, 1.6), 'totomoxtle', yaw=20)
    hombro_d = (xl - 0.6, 13.0, 1.2)
    t = m.stem('brazo_der', hombro_d, 2.6, 1.2, 'totomoxtle_dark', tilt=50, yaw=90)
    m.box('mano_der', (t[0], t[1] - 0.6, t[2]), (1.6, 1.8, 1.6), 'totomoxtle', yaw=-15)
    m.box('mano_der_pulgar', (t[0] - 0.2, t[1] + 1.0, t[2] + 0.4), (0.6, 0.9, 0.6), 'maiz_hoja_light', yaw=-15)

    # cara: ojos grandes con brillo, sonrisa en U con las esquinas arriba y mejillas rosadas
    for k, s in enumerate((-1, 1)):
        cara(m, f'ojo{k}', s * 1.7, 15.6, 1.4, 2.6, 'black')
        cara(m, f'ojo{k}_brillo', s * 1.7 - 0.3, 17.1, 0.6, 0.7, 'white', dz=0.3, d=0.4)
        cara(m, f'mejilla{k}', s * 3.1, 13.6, 1.4, 1.0, 'mascota_mejilla', d=0.4)
    sonrisa = [(0.0, 11.4, 2.4), (-1.6, 11.9, 1.0), (1.6, 11.9, 1.0),
               (-2.3, 12.7, 0.8), (2.3, 12.7, 0.8)]
    for k, (x, y, w) in enumerate(sonrisa):
        cara(m, f'sonrisa{k}', x, y, w, 1.0, 'black')

    # cabello del elote: mechon que sale de la punta y cae hacia los lados
    top = (0, Y1 + 3.6, 0)
    pelo = [(0, 15, 3.4, 'cabello'), (60, 45, 3.0, 'cabello_light'), (150, 50, 3.2, 'cabello'),
            (220, 40, 3.0, 'cabello_light'), (300, 55, 3.2, 'cabello')]
    for k, (yaw, tilt, largo, col) in enumerate(pelo):
        m.stem(f'cabello{k}', top, largo, 0.6, col, tilt=tilt, yaw=yaw)
    return m


if __name__ == '__main__':
    guardar(mascota_feliz(), 'mascota_feliz')
