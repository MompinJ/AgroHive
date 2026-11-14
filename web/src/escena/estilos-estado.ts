// Tabla unica de estilo por estado visual. Base para A3.3 (color + icono +
// patron, legible con daltonismo): A3.3 ajusta esta tabla y dibuja iconos y
// leyenda; la escena y el modo 2D la leen de aqui para no divergir.
// Colores provisionales `[PROPUESTA]`, tomados de la paleta Okabe-Ito
// (Okabe y Ito, "Color Universal Design", 2008), que se distingue con los
// tipos comunes de daltonismo. El color nunca va solo: siempre con patron e icono.

import type { EstadoVisual } from './modelo';

/** Patron que se superpone a la cara superior del bloque. */
export type Patron = 'liso' | 'puntos' | 'rayas' | 'rayas_densas' | 'cruces' | 'cuadros' | 'interrogacion';

export interface EstiloEstado {
  etiqueta: string;
  /** Color de acento del estado (hex). */
  color: string;
  patron: Patron;
  /** Clave del icono (A3.3 define el dibujo). */
  icono: string;
  descripcion: string;
}

export const ESTILOS_ESTADO: Record<EstadoVisual, EstiloEstado> = {
  normal: {
    etiqueta: 'Normal',
    color: '#009e73',
    patron: 'liso',
    icono: 'hoja',
    descripcion: 'El motor no reporta estres en la planta.',
  },
  estresada: {
    etiqueta: 'Estresada',
    color: '#e69f00',
    patron: 'puntos',
    icono: 'gota_tachada',
    descripcion: 'El motor reporta estres (por ejemplo, falta de agua).',
  },
  marchita: {
    etiqueta: 'Marchita',
    color: '#d55e00',
    patron: 'rayas',
    icono: 'hoja_caida',
    descripcion: 'El motor reporta marchitez.',
  },
  podrida: {
    etiqueta: 'Podrida',
    color: '#cc79a7',
    patron: 'rayas_densas',
    icono: 'calavera',
    descripcion: 'El motor reporta el desenlace de estres (podrida).',
  },
  suelo_desnudo: {
    etiqueta: 'Suelo desnudo',
    color: '#8a6240',
    patron: 'liso',
    icono: 'surco',
    descripcion: 'Entre ciclos o despues de la cosecha.',
  },
  NO_EVALUABLE: {
    etiqueta: 'NO_EVALUABLE',
    color: '#9a9a9a',
    patron: 'cruces',
    icono: 'interrogacion',
    descripcion: 'Falta un dato o parametro: no se muestra ningun valor.',
  },
  ERROR_DATOS: {
    etiqueta: 'ERROR_DATOS',
    color: '#000000',
    patron: 'cuadros',
    icono: 'alerta',
    descripcion: 'Fallo una fuente de datos sin respaldo.',
  },
  sin_resultado: {
    etiqueta: 'Sin resultado',
    color: '#bdbdbd',
    patron: 'interrogacion',
    icono: 'interrogacion',
    descripcion: 'El motor no entrego resultado para esta celda.',
  },
};

/** Estilo del relieve faltante (celda sin elevacion). */
export const ESTILO_SIN_ELEVACION: EstiloEstado = {
  etiqueta: 'Sin elevacion',
  color: '#9a9a9a',
  patron: 'cruces',
  icono: 'interrogacion',
  descripcion: 'Elevacion no obtenida (NO_EVALUABLE): se dibuja hueco, no a nivel cero.',
};
