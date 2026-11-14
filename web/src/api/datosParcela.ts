// Carga de los datos de una parcela desde la API (A4.6): lo que necesitan el laboratorio y el motor. No calcula nada.
// Clima, suelo y cultivos son obligatorios; la proxima temporada es una capa opcional (docs/13) y no bloquea.
import type { Advertencia, CatalogoCultivos, ProximaTemporadaAproximada, SerieClima, Suelo } from '../../../contratos/tipos/contratos';
import { obtenerClimaEstandar, obtenerCultivos, obtenerProximaTemporada, obtenerSuelo, type ErrorApi, type Resultado } from './cliente';

export type DatosParcela = {
  clima: Resultado<SerieClima>;
  suelo: Resultado<Suelo>;
  cultivos: Resultado<CatalogoCultivos>;
  proximaTemporada: Resultado<ProximaTemporadaAproximada>;
};

type Opciones = { senal?: AbortSignal; tiempoMs?: number; fetchFn?: typeof fetch };
export type Obligatorio = 'clima' | 'suelo' | 'cultivos';
const OBLIGATORIOS: readonly Obligatorio[] = ['clima', 'suelo', 'cultivos'];

/** Pide las cuatro respuestas en paralelo para el centroide de la parcela. Nunca lanza. */
export async function cargarDatosParcela(centroide: readonly [number, number], opciones: Opciones = {}): Promise<DatosParcela> {
  const [lon, lat] = centroide;
  const [clima, suelo, cultivos, proximaTemporada] = await Promise.all([
    obtenerClimaEstandar(lon, lat, opciones),
    obtenerSuelo(lon, lat, opciones),
    obtenerCultivos(opciones),
    obtenerProximaTemporada(lon, lat, opciones),
  ]);
  return { clima, suelo, cultivos, proximaTemporada };
}

/** La primera falla de lo obligatorio (`falla` es el nombre del dato); null si clima, suelo y cultivos llegaron. */
export function fallaObligatoria(d: DatosParcela): { falla: Obligatorio; error: ErrorApi } | null {
  for (const dato of OBLIGATORIOS) {
    const r = d[dato];
    if (!r.ok) return { falla: dato, error: r.error };
  }
  return null;
}

export type AvisoDatos = { origen: string; codigo: string; mensaje: string; severidad: Advertencia['severidad'] };

/**
 * Lo que la interfaz debe mostrar siempre: las advertencias de cada respuesta, el estado de respaldo del clima y que la
 * proxima temporada no cargo. Sin esto un RESPALDO_HISTORICO pasaria inadvertido (docs/04: el respaldo siempre es visible).
 */
export function avisosDe(d: DatosParcela): AvisoDatos[] {
  const avisos: AvisoDatos[] = [];
  const de = (origen: string, lista: readonly Advertencia[] | undefined) =>
    (lista ?? []).forEach((a) => avisos.push({ origen, codigo: a.codigo, mensaje: a.mensaje, severidad: a.severidad }));
  if (d.clima.ok) {
    if (d.clima.datos.estado !== 'EVALUABLE') {
      avisos.push({ origen: 'clima', codigo: `CLIMA_${d.clima.datos.estado}`, mensaje: `El clima viene en estado ${d.clima.datos.estado}: ${d.clima.datos.fuente.nombre}.`, severidad: 'aviso' });
    }
    de('clima', d.clima.datos.advertencias);
  }
  if (d.suelo.ok) de('suelo', d.suelo.datos.advertencias);
  if (d.proximaTemporada.ok) de('proxima temporada', d.proximaTemporada.datos.advertencias);
  else avisos.push({ origen: 'proxima temporada', codigo: 'PROXIMA_TEMPORADA_NO_DISPONIBLE', mensaje: d.proximaTemporada.error.motivo, severidad: 'info' });
  return avisos;
}
