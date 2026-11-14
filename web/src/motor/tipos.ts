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

/** Etapas FAO-56 (Tabla 11). */
export type EtapaFao = 'inicial' | 'desarrollo' | 'media' | 'final';
