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
export const VERSION_CONTRATO = '0.6.0';

export const ESCENARIOS: readonly Escenario[] = ['seco', 'habitual', 'lluvioso'];

/**
 * Pilar de exceso de agua [DECIDIDO] 14/11 (Mompin). Misma forma que la propuesta para contratos 0.7.0
 * (resultado-rotacion $defs.pilarExcesoHidrico); cuando llegue al contrato, este tipo se reemplaza por el generado.
 */
export interface PilarExcesoHidrico {
  estado: import('../../../contratos/tipos/contratos').EstadoEvaluacion;
  motivo?: string;
  excesoTotalMm: number | null;
  diasExceso: number | null;
  /** Percolacion / lluvia de los dias de ciclo (0 a 1). */
  fraccionLluviaPercolada: number | null;
}
export type PilaresMotor = import('../../../contratos/tipos/contratos').Pilares & { excesoHidrico?: PilarExcesoHidrico };
export type PesosMotor = import('../../../contratos/tipos/contratos').PesosPilares & { excesoHidrico?: number };

/** Etapas FAO-56 (Tabla 11). */
export type EtapaFao = 'inicial' | 'desarrollo' | 'media' | 'final';
