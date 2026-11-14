// Modelo de escena (A3.1): lo que la escena 3D necesita para dibujar, derivado
// sin calculos agronomicos de los contratos parcela y resultado-celda.
// La escena solo representa lo que entrega el motor: aqui no se recalcula
// ningun indicador ni se rellena ningun hueco.

import type {
  Advertencia,
  EstadoEvaluacion,
  EstadoPlanta,
  EtapaVisual,
  IdCelda,
  IdCultivo,
  RegistroCelda,
} from '../../../contratos/tipos/contratos';

/** Tope de celdas de la cuadricula (doc 08 y contrato parcela, A2.9). */
export const TOPE_CELDAS = 1600;

/**
 * Unidades de la escena: 1 unidad = 1 celda (lado de la celda).
 * Los .bbmodel usan 16 unidades por celda (doc 07); el cargador escala por 1/16.
 */
export const UNIDADES_BBMODEL_POR_CELDA = 16;

/**
 * Exageracion vertical por defecto del relieve `[PROPUESTA]`.
 * Es solo de presentacion y siempre se declara en pantalla: el relieve real de
 * una parcela de 2 ha es de pocos metros frente a celdas de decenas de metros.
 */
export const EXAGERACION_VERTICAL_DEFECTO = 10;

/** Grosor minimo del bloque bajo el punto mas bajo, en celdas (presentacion). */
export const GROSOR_BASE = 0.25;

/**
 * Estado visual de un bloque. Sale tal cual del registro del motor; los
 * casos sin dato son explicitos y nunca se dibujan como "normal" ni como cero.
 * - NO_EVALUABLE / ERROR_DATOS: el registro del motor lo dice.
 * - sin_resultado: el motor no entrego registro para esa celda y fecha.
 * - suelo_desnudo: entre ciclos o tras la cosecha (etapa del motor).
 */
export type EstadoVisual =
  | EstadoPlanta
  | 'suelo_desnudo'
  | 'NO_EVALUABLE'
  | 'ERROR_DATOS'
  | 'sin_resultado';

/** Relieve de un bloque: medido (con su altura en la escena) o hueco. */
export type Relieve =
  | { tipo: 'medido'; elevacionM: number; alturaEscena: number }
  | { tipo: 'sin_elevacion'; motivo: string };

export interface BloqueEscena {
  celdaId: IdCelda;
  i: number;
  j: number;
  /** Centro del bloque en la escena (x = columna, z = fila), en celdas. */
  x: number;
  z: number;
  relieve: Relieve;
  /** Pendiente tal como la entrega la parcela; null si no se calculo. */
  pendientePct: number | null;
  fraccionDentro: number | null;
  estadoVisual: EstadoVisual;
  /** Estado de evaluacion del registro (doc 04); null si no hay registro. */
  estadoEvaluacion: EstadoEvaluacion | null;
  motivo: string | null;
  cultivo: IdCultivo | null;
  etapa: EtapaVisual | null;
  avanceEtapa: number | null;
  noRecomendadoEnLugar: boolean;
  /** Registro original del motor, para tooltips (A3.8). */
  registro: RegistroCelda | null;
}

export interface EscenaModelo {
  /** true si la parcela o el resultado son datos de ejemplo (meta.esEjemplo). */
  esEjemplo: boolean;
  /** Avisos visibles (meta.aviso de ejemplo, advertencias de los contratos y de la escena). */
  avisos: Advertencia[];
  parcelaId: string;
  /** Fecha de los registros representados; null si no hay resultado. */
  fecha: string | null;
  exageracionVertical: number;
  /** Elevacion de referencia (minimo medido); null si ninguna celda tiene elevacion. */
  elevacionBaseM: number | null;
  tamanoCeldaM: number;
  filas: number;
  columnas: number;
  bloques: BloqueEscena[];
}
