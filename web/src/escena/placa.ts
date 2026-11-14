// Placa de estado: la textura que va sobre la cara superior de cada bloque.
// Patron del estado en todo el fondo, borde doble (negro y blanco) y, al centro,
// un recuadro liso con borde y el icono, para que el estado se lea sin depender del color. Puro (RGBA); la
// escena 3D la vuelve DataTexture y el modo 2D puede pintarla en un canvas.

import { BLANCO, hexARgb, NEGRO } from './contraste';
import type { EstiloEstado } from './estilos-estado';
import { LADO_PATRON, mascaraIcono, mascaraPatron } from './patrones';

export const LADO_PLACA = 32;

export interface ImagenRgba {
  ancho: number;
  alto: number;
  /** ancho * alto * 4 bytes, por filas desde arriba. */
  datos: Uint8Array;
}

export function rgbaPlaca(estilo: EstiloEstado): ImagenRgba {
  const lado = LADO_PLACA;
  const datos = new Uint8Array(lado * lado * 4);
  const color = hexARgb(estilo.color);
  const tinta = hexARgb(estilo.tinta);
  const opuesto = hexARgb(estilo.tinta === NEGRO ? BLANCO : NEGRO);
  const patron = mascaraPatron(estilo.patron, LADO_PATRON);
  const icono = mascaraIcono(estilo.icono);
  const inicioCuadro = 8;
  const finCuadro = 24; // recuadro de 16 x 16 al centro
  const inicioIcono = (lado - icono.lado) / 2;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let entinta: boolean;
      const enCuadro = x >= inicioCuadro && x < finCuadro && y >= inicioCuadro && y < finCuadro;
      if (enCuadro) {
        const borde = x === inicioCuadro || x === finCuadro - 1 || y === inicioCuadro || y === finCuadro - 1;
        const ix = x - inicioIcono;
        const iy = y - inicioIcono;
        const enIcono = ix >= 0 && iy >= 0 && ix < icono.lado && iy < icono.lado && icono.pixeles[iy * icono.lado + ix] === 1;
        entinta = borde || enIcono;
      } else {
        // Borde doble para separar la placa del suelo con cualquier humedad (WCAG 1.4.11, 3:1):
        // anillo exterior en el opuesto de la tinta y anillo interior en tinta. Uno de los dos
        // (negro o blanco) contrasta con cualquier color de suelo (prueba en estados.test.ts).
        const anillo = Math.min(x, y, lado - 1 - x, lado - 1 - y);
        if (anillo === 0) {
          const k = (y * lado + x) * 4;
          datos[k] = opuesto[0];
          datos[k + 1] = opuesto[1];
          datos[k + 2] = opuesto[2];
          datos[k + 3] = 255;
          continue;
        }
        entinta = anillo === 1 || patron.pixeles[(y % LADO_PATRON) * LADO_PATRON + (x % LADO_PATRON)] === 1;
      }
      const c = entinta ? tinta : color;
      const k = (y * lado + x) * 4;
      datos[k] = c[0];
      datos[k + 1] = c[1];
      datos[k + 2] = c[2];
      datos[k + 3] = 255;
    }
  }
  return { ancho: lado, alto: lado, datos };
}
