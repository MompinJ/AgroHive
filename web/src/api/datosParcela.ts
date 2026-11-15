// Carga de los datos de una parcela desde la API (A4.6): lo que necesitan el laboratorio y el motor. No calcula nada.
// Clima, suelo y cultivos son obligatorios; la proxima temporada es una capa opcional (docs/13) y no bloquea.
import type { Advertencia, CalendarioLocal, CatalogoCultivos, ProximaTemporadaAproximada, SerieClima, Suelo } from '../../../contratos/tipos/contratos';
import { obtenerCalendario, obtenerClimaEstandar, obtenerCultivos, obtenerProximaTemporada, obtenerSuelo, type ErrorApi, type Resultado } from './cliente';

export type DatosParcela = {
  clima: Resultado<SerieClima>;
  suelo: Resultado<Suelo>;
  cultivos: Resultado<CatalogoCultivos>;
  proximaTemporada: Resultado<ProximaTemporadaAproximada>;
  /** Opcional como la proxima temporada: sin calendario el motor marca la compatibilidad de fechas NO_EVALUABLE, no se inventa uno. */
  calendario?: Resultado<CalendarioLocal>;
};

type Opciones = { senal?: AbortSignal; tiempoMs?: number; fetchFn?: typeof fetch };
// Cualquier lugar del mundo se puede dibujar y se toma solo la informacion que hay de el. Sin clima o sin catalogo no hay simulacion posible,
// asi que esos dos son obligatorios; el suelo (SoilGrids no cubre oceano, hielo ni algunos desiertos), el calendario local y la proxima
// temporada son opcionales: si faltan, lo que depende de ellos queda NO_EVALUABLE y se avisa, no se inventa.
export type Obligatorio = 'clima' | 'cultivos';
const OBLIGATORIOS: readonly Obligatorio[] = ['clima', 'cultivos'];

/** Pide las cinco respuestas en paralelo para el centroide de la parcela. Nunca lanza. */
export async function cargarDatosParcela(centroide: readonly [number, number], opciones: Opciones = {}): Promise<DatosParcela> {
  const [lon, lat] = centroide;
  const [clima, suelo, cultivos, proximaTemporada, calendario] = await Promise.all([
    obtenerClimaEstandar(lon, lat, opciones),
    obtenerSuelo(lon, lat, opciones),
    obtenerCultivos(opciones),
    obtenerProximaTemporada(lon, lat, opciones),
    obtenerCalendario(lon, lat, opciones),
  ]);
  return { clima, suelo, cultivos, proximaTemporada, calendario };
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
  else avisos.push({ origen: 'suelo', codigo: 'SUELO_NO_DISPONIBLE', mensaje: `Sin datos de suelo para este lugar (${d.suelo.error.motivo}): lo que depende del suelo, como el balance de agua, queda NO_EVALUABLE; el clima, las fechas y las plagas siguen disponibles.`, severidad: 'aviso' });
  if (d.proximaTemporada.ok) de('proxima temporada', d.proximaTemporada.datos.advertencias);
  else avisos.push({ origen: 'proxima temporada', codigo: 'PROXIMA_TEMPORADA_NO_DISPONIBLE', mensaje: d.proximaTemporada.error.motivo, severidad: 'info' });
  if (d.calendario?.ok) de('calendario', d.calendario.datos.advertencias);
  else if (d.calendario) avisos.push({ origen: 'calendario', codigo: 'CALENDARIO_NO_DISPONIBLE', mensaje: d.calendario.error.motivo, severidad: 'info' });
  return avisos;
}
