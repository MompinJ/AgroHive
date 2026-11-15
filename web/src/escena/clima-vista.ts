// Vistas de luz y temperatura de la escena (paso Escenarios). Puro; solo traduce a color y texto datos reales.
//
// Clima: el promedio de la semana (7 dias que terminan en el dia del clima real que corresponde a la fecha del plan) de la serie de
// NASA POWER de la parcela: la temperatura media y la radiacion solar de onda corta (ALLSKY_SFC_SW_DWN, MJ/m2/dia). La escena avanza por
// semanas, asi que la semana es la unidad. Con menos de 4 dias con dato no se afirma nada.
//
// Temperatura por cultivo: la media de la semana frente al rango de temperatura media de cada cultivo en FAO EcoCrop (catalogo, con fuente).
// OJO: EcoCrop da rangos para medias mensuales; no es un umbral de estres diario (el motor no tiene uno con fuente). Por eso se compara con
// la media semanal y la leyenda lo dice.
//
// Luz: es la misma para toda la parcela (POWER tiene celdas de 0.5 x 0.625 grados) y el catalogo no trae necesidades de luz por cultivo, asi que
// la vista pinta todas las celdas igual y lo dice; no se inventa una diferencia por celda ni por cultivo.

import type { CatalogoCultivos, SerieClima } from '../../../contratos/tipos/contratos';

export interface ClimaSemana {
  /** Ultimo dia de la semana, en la serie climatica real. */
  fechaClima: string;
  /** Dias de la semana con dato de temperatura media. */
  dias: number;
  tMediaC: number | null;
  tMaxC: number | null;
  tMinC: number | null;
  radiacionMjM2Dia: number | null;
}

const DIA_MS = 86400000;
const MIN_DIAS = 4;
const aDia = (f: string) => Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
const deDia = (t: number) => new Date(t).toISOString().slice(0, 10);
type DiaSerie = SerieClima['diario'][number];
const indices = new WeakMap<object, Map<string, DiaSerie>>();

function indiceDe(serie: SerieClima): Map<string, DiaSerie> {
  let m = indices.get(serie);
  if (!m) { m = new Map(serie.diario.map((d) => [d.fecha, d])); indices.set(serie, m); }
  return m;
}

const promedio = (v: number[]) => (v.length >= MIN_DIAS ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Clima de la semana que termina en `fechaClima`; null si no hay serie o fecha. */
export function climaDeLaSemana(serie: SerieClima | null | undefined, fechaClima: string | null | undefined): ClimaSemana | null {
  if (!serie || !fechaClima || !/^\d{4}-\d{2}-\d{2}/.test(fechaClima)) return null;
  const idx = indiceDe(serie);
  const fin = aDia(fechaClima);
  const dias: DiaSerie[] = [];
  for (let k = 6; k >= 0; k--) { const d = idx.get(deDia(fin - k * DIA_MS)); if (d) dias.push(d); }
  const medias = dias.map((d) => d.tMediaC ?? (d.tMaxC != null && d.tMinC != null ? (d.tMaxC + d.tMinC) / 2 : null)).filter((x): x is number => x != null && Number.isFinite(x));
  const maximas = dias.map((d) => d.tMaxC).filter((x): x is number => x != null && Number.isFinite(x));
  const minimas = dias.map((d) => d.tMinC).filter((x): x is number => x != null && Number.isFinite(x));
  const rad = dias.map((d) => d.radiacionMjM2Dia).filter((x): x is number => x != null && Number.isFinite(x));
  return {
    fechaClima, dias: medias.length,
    tMediaC: promedio(medias),
    tMaxC: maximas.length ? Math.max(...maximas) : null,
    tMinC: minimas.length ? Math.min(...minimas) : null,
    radiacionMjM2Dia: promedio(rad),
  };
}

// ---- Temperatura por cultivo (FAO EcoCrop)

export interface RangoTemperatura { tMinAbsC: number; tOptMinC: number; tOptMaxC: number; tMaxAbsC: number }
export type NivelTemperatura = 'helada' | 'fresca' | 'optima' | 'calida' | 'excesiva';

/** De mas frio a mas calor. Azules, verde, naranja y rojo: se distinguen tambien por la leyenda y el texto del globo. */
export const NIVELES_TEMPERATURA: readonly { nivel: NivelTemperatura; etiqueta: string; color: string }[] = [
  { nivel: 'helada', etiqueta: 'Demasiado frío', color: '#3b66b0' },
  { nivel: 'fresca', etiqueta: 'Fresca', color: '#8cc3e6' },
  { nivel: 'optima', etiqueta: 'Ideal', color: '#58a868' },
  { nivel: 'calida', etiqueta: 'Cálida', color: '#f0a23c' },
  { nivel: 'excesiva', etiqueta: 'Demasiado calor', color: '#c4412b' },
];
export const colorNivelTemperatura = (n: NivelTemperatura) => NIVELES_TEMPERATURA.find((x) => x.nivel === n)!.color;
export const etiquetaNivelTemperatura = (n: NivelTemperatura) => NIVELES_TEMPERATURA.find((x) => x.nivel === n)!.etiqueta;

export function nivelTemperatura(tMediaC: number, r: RangoTemperatura): NivelTemperatura {
  if (tMediaC < r.tMinAbsC) return 'helada';
  if (tMediaC < r.tOptMinC) return 'fresca';
  if (tMediaC <= r.tOptMaxC) return 'optima';
  if (tMediaC <= r.tMaxAbsC) return 'calida';
  return 'excesiva';
}

const valor = (x: { estado: string; valor?: number | null } | undefined) => (x?.estado === 'EVALUABLE' && x.valor != null ? x.valor : null);

/** Rangos de temperatura por cultivo del catalogo; solo los que tienen los cuatro valores con fuente (EVALUABLE). */
export function rangosTemperatura(catalogo: CatalogoCultivos | null | undefined): Record<string, RangoTemperatura> {
  const salida: Record<string, RangoTemperatura> = {};
  for (const c of catalogo?.cultivos ?? []) {
    const u = c.umbrales as unknown as Record<string, { estado: string; valor?: number | null } | undefined>;
    const [tMinAbsC, tOptMinC, tOptMaxC, tMaxAbsC] = [valor(u.tMinAbsC), valor(u.tOptMinC), valor(u.tOptMaxC), valor(u.tMaxAbsC)];
    if (tMinAbsC != null && tOptMinC != null && tOptMaxC != null && tMaxAbsC != null && tMinAbsC <= tOptMinC && tOptMinC <= tOptMaxC && tOptMaxC <= tMaxAbsC) {
      salida[c.id] = { tMinAbsC, tOptMinC, tOptMaxC, tMaxAbsC };
    }
  }
  return salida;
}

// ---- Luz

/** Radiacion que se pinta como el amarillo mas claro `[PROPUESTA]`: cota de dibujo; en la superficie rara vez se pasa de unos 30 MJ/m2/dia. */
export const LUZ_MAX_MJ = 30;
const OSCURO: [number, number, number] = [0x4a, 0x5d, 0x78];
const CLARO: [number, number, number] = [0xff, 0xd4, 0x47];

/** Color de la luz: azul pizarra (poca) a amarillo (mucha); null sin dato. */
export function colorLuz(mj: number | null | undefined): string | null {
  if (mj == null || !Number.isFinite(mj)) return null;
  const t = Math.max(0, Math.min(1, mj / LUZ_MAX_MJ));
  const c = OSCURO.map((o, i) => Math.round(o + (CLARO[i]! - o) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export const grados = (n: number | null | undefined) => (n == null ? 'sin dato' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })} °C`);
export const megajoules = (n: number | null | undefined) => (n == null ? 'sin dato' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })} MJ/m² al día`);
