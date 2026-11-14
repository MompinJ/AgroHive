// Fechas civiles 'AAAA-MM-DD' manejadas en UTC para que el resultado no dependa de la zona horaria.

const MS_DIA = 86_400_000;

export function aDia(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  if (a === undefined || m === undefined || d === undefined || Number.isNaN(a + m + d)) {
    throw new Error(`Fecha invalida: ${fecha}`);
  }
  return Math.round(Date.UTC(a, m - 1, d) / MS_DIA);
}

export function deDia(dia: number): string {
  return new Date(dia * MS_DIA).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, n: number): string {
  return deDia(aDia(fecha) + n);
}

export function anioDe(fecha: string): number {
  return Number(fecha.slice(0, 4));
}

export function mesDe(fecha: string): number {
  return Number(fecha.slice(5, 7));
}

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Dia del anio (1 a 365 o 366), FAO-56 ecuacion 25. */
export function diaDelAnio(fecha: string): number {
  return aDia(fecha) - aDia(`${fecha.slice(0, 4)}-01-01`) + 1;
}

/** Recorre del dia desde al dia hasta, ambos incluidos. */
export function* rangoFechas(desde: string, hasta: string): Generator<string> {
  for (let d = aDia(desde), fin = aDia(hasta); d <= fin; d++) yield deDia(d);
}
