// Medio cuadrado en la vista 2D (bordes diagonales, [DECIDIDO] Mompin 14/11 noche). Sin Three.js:
// la vista 2D no lo importa. La celda conserva su boton cuadrado (toque, teclado y foco no
// cambian); solo el fondo marca la mitad que queda, con la diagonal visible, y la otra mitad
// queda transparente. El icono de cultivo y la placa de estado no se recortan.
import type { FormaCelda } from '../geo/forma-celda';
import './media-2d.css';

/** Clases de la celda 2D segun su forma ('' si es completa). */
export function claseMedia2D(forma: FormaCelda): string {
  return forma === 'completa' ? '' : ` parcela2d-media parcela2d-media-${forma.toLowerCase()}`;
}
