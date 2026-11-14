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
export const VERSION_CONTRATO = '0.11.0';

export const ESCENARIOS: readonly Escenario[] = ['seco', 'habitual', 'lluvioso'];

/** Pilar de exceso de agua ([DECIDIDO] 14/11, contratos 0.7.0) y alias usados por el motor. */
export type { PilarExcesoHidrico } from '../../../contratos/tipos/contratos';
export type PilaresMotor = import('../../../contratos/tipos/contratos').Pilares;
export type PesosMotor = import('../../../contratos/tipos/contratos').PesosPilares;

/** Escenario "proxima temporada" con anios analogos ([DECIDIDO] 14/11, contratos 0.8.0). */
export type { ProximaTemporadaRotacion, ProximaTemporadaAproximada } from '../../../contratos/tipos/contratos';

/**
 * serie-balance (A4.1): misma forma que la propuesta a contratos (scratchpad, 14/11). Cuando llegue, se reemplaza por el
 * tipo generado.
 */
export interface SerieBalance {
  meta: import('../../../contratos/tipos/contratos').Meta;
  rotacionId: string;
  escenario: import('../../../contratos/tipos/contratos').Escenario;
  anioReal: number;
  estado: import('../../../contratos/tipos/contratos').EstadoEvaluacion;
  motivo?: string;
  unidades: {
    lluviaMm: 'mm/dia';
    et0Mm: 'mm/dia';
    etcMm: 'mm/dia';
    etcAjMm: 'mm/dia';
    drMm: 'mm';
    rawMm: 'mm';
    humedad: 'fraccion de TAW (0 a 1)';
    percolacionMm: 'mm/dia';
    deficitMm: 'mm/dia';
  };
  fuentes: [import('../../../contratos/tipos/contratos').Fuente, ...import('../../../contratos/tipos/contratos').Fuente[]];
  ciclos: {
    ciclo: number;
    cultivo: string;
    celdas: [string, ...string[]] | string[];
    estado: import('../../../contratos/tipos/contratos').EstadoEvaluacion;
    motivo?: string;
    desde: string;
    fechaClima: string | null;
    tawMm: number | null;
    dias: Record<'lluviaMm' | 'et0Mm' | 'etcMm' | 'etcAjMm' | 'drMm' | 'rawMm' | 'humedad' | 'percolacionMm' | 'deficitMm', number[]>;
    mensual: {
      mes: string;
      mesClima: string;
      dias: number;
      lluviaMm: number;
      et0Mm: number;
      etcMm: number;
      etcAjMm: number;
      percolacionMm: number;
      deficitMm: number;
      humedadMedia: number;
    }[];
  }[];
  advertencias?: import('../../../contratos/tipos/contratos').Advertencia[];
}

/** Etapas FAO-56 (Tabla 11). */
export type EtapaFao = 'inicial' | 'desarrollo' | 'media' | 'final';
