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
  PilarCompatibilidadCiclo,
  PilarProteccionSuelo,
  PilarRiesgoCalor,
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
export const VERSION_CONTRATO = '0.15.0';

export const ESCENARIOS: readonly Escenario[] = ['seco', 'habitual', 'lluvioso'];

/** Pilar de exceso de agua ([DECIDIDO] 14/11, contratos 0.7.0) y alias usados por el motor. */
export type { PilarExcesoHidrico } from '../../../contratos/tipos/contratos';
export type PilaresMotor = import('../../../contratos/tipos/contratos').Pilares;
export type PesosMotor = import('../../../contratos/tipos/contratos').PesosPilares;

/** Escenario "proxima temporada" con anios analogos ([DECIDIDO] 14/11, contratos 0.8.0). */
export type { ProximaTemporadaRotacion, ProximaTemporadaAproximada } from '../../../contratos/tipos/contratos';

/** serie-balance (A4.1, contratos 0.11.0). */
export type { SerieBalance, CicloSerieBalance } from '../../../contratos/tipos/contratos';

/** Etapas FAO-56 (Tabla 11). */
export type EtapaFao = 'inicial' | 'desarrollo' | 'media' | 'final';
