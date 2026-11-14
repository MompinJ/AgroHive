import type { SerieBalance } from '../../../contratos/tipos/contratos';

const DIA = 86400000;
const instante = (fecha: string) => Date.parse(`${fecha}T00:00:00Z`);
export interface RangoTiempo { desde: string; hasta: string; pasos: number }
export const fechaEnIndice = (desde: string, indice: number) => new Date(instante(desde) + indice * DIA).toISOString().slice(0, 10);
export const indiceDeFecha = (desde: string, fecha: string) => Math.round((instante(fecha) - instante(desde)) / DIA);

/** Solo calendario de presentación: el horizonte viene de los días del motor. */
export function rangoDelCiclo(serie: SerieBalance | null, ciclo: number): RangoTiempo | null {
  const segmentos = serie?.ciclos.filter((c) => c.ciclo === ciclo && c.dias.humedad.length > 0) ?? [];
  if (!segmentos.length) return null;
  const desde = segmentos.map((c) => c.desde).sort()[0]!;
  const hasta = segmentos.map((c) => fechaEnIndice(c.desde, c.dias.humedad.length - 1)).sort().at(-1)!;
  return { desde, hasta, pasos: indiceDeFecha(desde, hasta) };
}

export function desplazarMes(fecha: string, direccion: -1 | 1, rango: RangoTiempo): string {
  const origen = new Date(instante(fecha));
  const mes = origen.getUTCMonth() + direccion;
  const ultimoDia = new Date(Date.UTC(origen.getUTCFullYear(), mes + 1, 0)).getUTCDate();
  const destino = new Date(Date.UTC(origen.getUTCFullYear(), mes, Math.min(origen.getUTCDate(), ultimoDia))).toISOString().slice(0, 10);
  return destino < rango.desde ? rango.desde : destino > rango.hasta ? rango.hasta : destino;
}
