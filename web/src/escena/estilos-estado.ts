// Tabla unica de estilo por estado visual. Base para A3.3 (color + icono +
// patron, legible con daltonismo): A3.3 ajusta esta tabla y el dibujo final de
// iconos; la escena, la leyenda y el modo 2D la leen de aqui para no divergir.
// Colores provisionales `[PROPUESTA]`, tomados de la paleta Okabe-Ito
// (Okabe y Ito, "Color Universal Design", 2008), que se distingue con los
// tipos comunes de daltonismo. El color nunca va solo: cada estado tiene un
// patron y un icono propios, distintos de los demas, y una etiqueta de texto.

import { tintaSobre } from './contraste';
import type { EstadoVisual } from './modelo';

/** Patron que se superpone a la placa de estado (ver patrones.ts). */
export type Patron =
  | 'liso'
  | 'puntos'
  | 'rayas'
  | 'rayas_densas'
  | 'verticales'
  | 'cruces'
  | 'cuadros'
  | 'horizontales';

/** Iconos provisionales (ver iconos.ts); A3.3 define el dibujo final. */
export type Icono = 'hoja' | 'gota_tachada' | 'hoja_caida' | 'moho' | 'surco' | 'interrogacion' | 'alerta' | 'vacio';

export interface EstiloEstado {
  etiqueta: string;
  /** Color de la placa de estado (hex). */
  color: string;
  /** Negro o blanco: patron, icono y borde sobre `color` (contraste verificado en pruebas). */
  tinta: string;
  patron: Patron;
  icono: Icono;
  /** Nombre del patron e icono en palabras, para la leyenda y lectores de pantalla. */
  descripcionPatron: string;
  descripcion: string;
}

type EstiloBase = Omit<EstiloEstado, 'tinta'>;

const conTinta = (e: EstiloBase): EstiloEstado => ({ ...e, tinta: tintaSobre(e.color) });

/** Orden fijo de la leyenda: de mejor a peor, luego los huecos. */
export const ORDEN_ESTADOS: readonly EstadoVisual[] = [
  'normal',
  'estresada',
  'marchita',
  'podrida',
  'suelo_desnudo',
  'NO_EVALUABLE',
  'ERROR_DATOS',
  'sin_resultado',
];

export const ESTILOS_ESTADO: Record<EstadoVisual, EstiloEstado> = {
  normal: conTinta({
    etiqueta: 'Normal',
    color: '#009e73',
    patron: 'liso',
    icono: 'hoja',
    descripcionPatron: 'placa lisa con icono de hoja',
    descripcion: 'El motor no reporta estres en la planta.',
  }),
  estresada: conTinta({
    etiqueta: 'Estresada',
    color: '#e69f00',
    patron: 'puntos',
    icono: 'gota_tachada',
    descripcionPatron: 'puntos con icono de gota tachada',
    descripcion: 'El motor reporta estres en la planta.',
  }),
  marchita: conTinta({
    etiqueta: 'Marchita',
    color: '#d55e00',
    patron: 'rayas',
    icono: 'hoja_caida',
    descripcionPatron: 'rayas diagonales con icono de hoja caida',
    descripcion: 'El motor reporta marchitez.',
  }),
  podrida: conTinta({
    etiqueta: 'Podrida',
    color: '#cc79a7',
    patron: 'rayas_densas',
    icono: 'moho',
    descripcionPatron: 'rayas diagonales densas con icono de moho',
    descripcion: 'El motor reporta el desenlace de estres (podrida).',
  }),
  suelo_desnudo: conTinta({
    etiqueta: 'Suelo desnudo',
    color: '#8a6240',
    patron: 'verticales',
    icono: 'surco',
    descripcionPatron: 'surcos verticales',
    descripcion: 'Entre ciclos o despues de la cosecha.',
  }),
  NO_EVALUABLE: conTinta({
    etiqueta: 'NO_EVALUABLE',
    color: '#9a9a9a',
    patron: 'cruces',
    icono: 'interrogacion',
    descripcionPatron: 'cruces con signo de interrogacion',
    descripcion: 'Falta un dato o parametro: no se muestra ningun valor.',
  }),
  ERROR_DATOS: conTinta({
    etiqueta: 'ERROR_DATOS',
    color: '#000000',
    patron: 'cuadros',
    icono: 'alerta',
    descripcionPatron: 'cuadros con signo de alerta',
    descripcion: 'Fallo una fuente de datos sin respaldo.',
  }),
  sin_resultado: conTinta({
    etiqueta: 'Sin resultado',
    color: '#bdbdbd',
    patron: 'horizontales',
    icono: 'vacio',
    descripcionPatron: 'lineas horizontales con circulo vacio',
    descripcion: 'El motor no entrego resultado para esta celda.',
  }),
};

/** Estilo del relieve faltante (celda sin elevacion): hueco, no nivel cero. */
export const ESTILO_SIN_ELEVACION: EstiloEstado = conTinta({
  etiqueta: 'Sin elevacion',
  color: '#9a9a9a',
  patron: 'cruces',
  icono: 'interrogacion',
  descripcionPatron: 'bloque hundido con cruces',
  descripcion: 'Elevacion no obtenida (NO_EVALUABLE): se dibuja hueco, no a nivel cero.',
});
