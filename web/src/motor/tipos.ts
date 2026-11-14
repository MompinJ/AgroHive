// Tipos del motor. Los de datos salen de contratos/tipos (fuente de verdad: los JSON Schema de contratos/).
export type {
  Advertencia,
  CalendarioLocal,
  CatalogoCultivos,
  ClaseTextura,
  Celda,
  ClimaEscenario,
  CriterioRanking,
  Cultivo,
  CultivoNoRecomendado,
  DiaClima,
  Escenario,
  EstadoEvaluacion,
  EstadoPlanta,
  EtapaVisual,
  Evidencia,
  Fuente,
  MetricasEscenario,
  Parcela,
  PilarAporteIndirecto,
  PilarDeficitHidrico,
  PesosPilares,
  PlanSiembra,
  Ponderacion,
  RegistroCelda,
  ResultadoCeldas,
  ResultadoRotacion,
  SerieClima,
  Suelo,
  TablaSuelos,
  Temporada,
  ValorCitado,
} from '../../../contratos/tipos/contratos';

import type { Escenario } from '../../../contratos/tipos/contratos';

/** Version de contratos/ con la que el motor genera sus salidas. */
export const VERSION_CONTRATO = '0.7.0';

export const ESCENARIOS: readonly Escenario[] = ['seco', 'habitual', 'lluvioso'];

/** Pilar de exceso de agua ([DECIDIDO] 14/11, contratos 0.7.0) y alias usados por el motor. */
export type { PilarExcesoHidrico } from '../../../contratos/tipos/contratos';
export type PilaresMotor = import('../../../contratos/tipos/contratos').Pilares;
export type PesosMotor = import('../../../contratos/tipos/contratos').PesosPilares;

/**
 * Escenario "proxima temporada" con anios analogos ([DECIDIDO] 14/11). Forma propuesta para contratos 0.8.0
 * (resultado-rotacion.proximaTemporada); cuando llegue, se reemplaza por el tipo generado.
 */
export interface ProximaTemporadaRotacion {
  estado: 'EXPLORATORIO' | 'NO_EVALUABLE' | 'ERROR_DATOS';
  motivo?: string;
  esPrediccion: false;
  aviso: string;
  emitido: string;
  horizonte: { desde: string; hasta: string };
  criterioAnalogos: string;
  ciclosEvaluados: number[];
  ciclosFuera?: { ciclo: number; motivo: string }[];
  aniosAnalogos: {
    anioReal: number;
    mesesDentro: number;
    deMeses: number;
    estado: import('../../../contratos/tipos/contratos').EstadoEvaluacion;
    motivo?: string;
    deficitHidrico: import('../../../contratos/tipos/contratos').PilarDeficitHidrico;
    excesoHidrico: import('../../../contratos/tipos/contratos').PilarExcesoHidrico;
  }[];
  rango: Record<'proporcionDemandaNoCubierta' | 'fraccionLluviaPercolada' | 'excesoTotalMm', import('../../../contratos/tipos/contratos').RangoIncertidumbre>;
  fuentes: import('../../../contratos/tipos/contratos').Fuente[];
}

/** Etapas FAO-56 (Tabla 11). */
export type EtapaFao = 'inicial' | 'desarrollo' | 'media' | 'final';
