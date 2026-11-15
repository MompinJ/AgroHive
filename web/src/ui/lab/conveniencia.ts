// Orden de la paleta (de mas a menos conveniente para la tierra y la fecha). El bioma de la escena sale
// de Koppen-Geiger (geo/koppen.ts).
// Pura. Usa el clima diario de NASA POWER de la parcela, los rangos de FAO EcoCrop del catalogo
// (temperatura optima y absoluta, lluvia anual), el calendario local y las plagas registradas.
// Es una ayuda para elegir `[PROPUESTA]`: no es un indicador del motor ni entra al ranking.
import type { CalendarioLocal, Cultivo, SerieClima } from '../../../../contratos/tipos/contratos';
import { dentroDeVentana } from '../../motor/pilares';
import { DIAS_MAX_CLIMA, referenciaSiembra } from '../planes';

export interface Climatologia {
  /** Temperatura media por dia del anio (0 = 1 de enero), promedio de todos los anios. */
  tMediaDia: (number | null)[];
  tMediaAnual: number | null;
  /** Lluvia anual promedio (solo anios completos). */
  lluviaAnualMm: number | null;
}

const diaDelAnio = (f: string) => {
  const t = Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
  return Math.floor((t - Date.UTC(Number(f.slice(0, 4)), 0, 1)) / 86400000);
};

export function climatologia(serie: SerieClima | null | undefined): Climatologia {
  const suma = new Array<number>(366).fill(0);
  const n = new Array<number>(366).fill(0);
  const lluvia = new Map<string, { mm: number; dias: number }>();
  for (const d of serie?.diario ?? []) {
    const k = diaDelAnio(d.fecha);
    if (d.tMediaC != null) { suma[k]! += d.tMediaC; n[k]! += 1; }
    if (d.lluviaMm != null) {
      const a = d.fecha.slice(0, 4);
      const e = lluvia.get(a) ?? { mm: 0, dias: 0 };
      e.mm += d.lluviaMm; e.dias += 1;
      lluvia.set(a, e);
    }
  }
  const tMediaDia = suma.map((s, i) => (n[i]! ? s / n[i]! : null));
  const validos = tMediaDia.filter((x): x is number => x != null);
  const completos = [...lluvia.values()].filter((e) => e.dias >= 360).map((e) => e.mm);
  return {
    tMediaDia,
    tMediaAnual: validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null,
    lluviaAnualMm: completos.length ? completos.reduce((a, b) => a + b, 0) / completos.length : null,
  };
}

/** Temperatura media del ciclo: promedio climatologico de los dias entre siembra y cosecha. */
export function tMediaCiclo(c: Climatologia, siembra: string, dias: number): number | null {
  const inicio = diaDelAnio(siembra);
  const v: number[] = [];
  for (let i = 0; i < dias; i++) { const t = c.tMediaDia[(inicio + i) % 365]; if (t != null) v.push(t); }
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export interface Conveniencia { puntos: number; nivel: 'buena' | 'regular' | 'mala'; motivos: string[]; noCabe: boolean; demasiadoLargo: boolean }
const valor = (x: { estado: string; valor?: number | null } | undefined) => (x?.estado === 'EVALUABLE' && x.valor != null ? x.valor : null);
const redondo = (n: number) => Math.round(n).toLocaleString('es-MX');

export function conveniencia(cultivo: Cultivo, entrada: {
  clima: Climatologia; siembra: string; temporada: 'PV' | 'OI'; dias: number | null; disponibles: number | null;
  calendario: CalendarioLocal | null; plagas: readonly { nombreComun: string; cultivos: readonly string[] }[];
}): Conveniencia {
  const motivos: string[] = [];
  let puntos = 0;
  const u = cultivo.umbrales as unknown as Record<string, { estado: string; valor?: number | null } | undefined>;
  const demasiadoLargo = entrada.dias != null && entrada.dias > DIAS_MAX_CLIMA;
  const noCabe = !demasiadoLargo && entrada.disponibles != null && entrada.dias != null && entrada.dias > entrada.disponibles;
  if (demasiadoLargo) motivos.push(`Tarda ${entrada.dias} días: más que el año de clima del simulador, no se puede evaluar.`);
  else if (noCabe) { puntos -= 1; motivos.push(`Tarda ${entrada.dias} días: los ciclos siguientes se recorren para que quepa.`); }
  const t = entrada.dias ? tMediaCiclo(entrada.clima, entrada.siembra, entrada.dias) : null;
  const [optMin, optMax, absMin, absMax] = [valor(u.tOptMinC), valor(u.tOptMaxC), valor(u.tMinAbsC), valor(u.tMaxAbsC)];
  if (t != null && optMin != null && optMax != null) {
    if (t >= optMin && t <= optMax) { puntos += 2; motivos.push(`Temperatura ideal en esa época (${redondo(t)} °C).`); }
    else if (absMin != null && absMax != null && (t < absMin || t > absMax)) { puntos -= 3; motivos.push(`${t < absMin ? 'Demasiado frío' : 'Demasiado calor'} en esa época (${redondo(t)} °C).`); }
    else motivos.push(`Temperatura aceptable, no la ideal (${redondo(t)} °C).`);
  }
  const p = entrada.clima.lluviaAnualMm;
  const [lMin, lMax] = [valor(u.lluviaAnualMinMm), valor(u.lluviaAnualMaxMm)];
  if (p != null && lMin != null && lMax != null) {
    if (p >= lMin && p <= lMax) { puntos += 1; motivos.push(`Aguanta la lluvia de la zona (${redondo(p)} mm al año).`); }
    else { puntos -= 2; motivos.push(p > lMax ? `Llueve más de lo que aguanta (${redondo(p)} mm al año).` : `Llueve menos de lo que necesita (${redondo(p)} mm al año).`); }
  }
  const ref = referenciaSiembra(cultivo.id, entrada.temporada, entrada.calendario);
  if (ref?.presencia.estado === 'registrado') { puntos += 2; motivos.push('Se siembra en esta zona.'); }
  else if (ref?.presencia.estado === 'no_registrado') { puntos -= 2; motivos.push('Casi no se siembra en esta zona.'); }
  if (ref?.ventana.estado === 'EVALUABLE') {
    if (dentroDeVentana(entrada.siembra, ref.ventana)) { puntos += 2; motivos.push('Tu fecha cae en su mejor época.'); }
    else { puntos -= 1; motivos.push('Tu fecha no es su mejor época.'); }
  }
  const plaga = entrada.plagas.find((x) => x.cultivos.includes(cultivo.id));
  if (plaga) { puntos -= 1; motivos.push(`${plaga.nombreComun} registrada cerca lo ataca.`); }
  const nivel = demasiadoLargo || puntos < 0 ? 'mala' : puntos >= 3 ? 'buena' : 'regular';
  return { puntos: demasiadoLargo ? -99 : puntos, nivel, motivos, noCabe, demasiadoLargo };
}
