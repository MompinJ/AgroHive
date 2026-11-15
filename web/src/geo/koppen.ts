// Clima de la parcela por Koppen-Geiger con las reglas publicadas de Peel, Finlayson y McMahon (2007), a partir de su
// serie diaria de NASA POWER (contrato serie-clima). Pura: no llama a la red. La usa la escena para elegir el bioma
// DECORATIVO (vegetacion, cielo y luz) segun el lugar, en vez de un bioma fijo. No es un indicador del motor ni entra
// al ranking.
//
// Fuente de las reglas: Peel, M. C., Finlayson, B. L. y McMahon, T. A. (2007). Updated world map of the Koppen-Geiger
// climate classification. Hydrology and Earth System Sciences 11, 1633-1644, doi:10.5194/hess-11-1633-2007.
// Tabla 1 (p. 1636) con sus definiciones; p. 1637: el grupo B se identifica primero (todo punto B cumple tambien
// A, C, D o E) y, si un punto cumple a la vez s y w, se asigna w cuando la lluvia del semestre de verano supera a la del de
// invierno (y s si no). Precipitacion en mm y temperatura en grados C. Verano = el semestre mas calido entre ONDJFM y AMJJAS.
//
// Decisiones propias, declaradas:
// - Las normales se calculan con los anios completos de la ventana de la serie (20 en la ventana estandar). La OMM usa
//   30 anios; con 20 la clase de un punto cerca de un limite puede cambiar.
// - Un mes de un anio cuenta solo si trae todos sus dias con dato para esa variable; cada mes necesita al menos
//   MIN_ANIOS anios validos. Si falta, NO_EVALUABLE con motivo (nunca se rellena).
// - La Tabla 1 deja fuera Thot = 10 exacto (C y D piden Thot > 10, E pide Thot < 10): se toma como C o D, igual que
//   Kottek et al. (2006).
// - El mapeo de la clase al bioma de la escena es decorativo `[PROPUESTA]`.
// - No se corrige por altitud: POWER es una celda de MERRA-2 de 0.5 x 0.625 grados. En zonas altas la celda puede ser mas
//   calida que el sitio (Uasin Gishu, a unos 2200 m, sale Am con Tcold 18.1, en el limite del grupo A).
import type { Fuente, SerieClima } from '../../../contratos/tipos/contratos';
import type { Bioma } from '../escena/render/entorno';

export type GrupoKoppen = 'A' | 'B' | 'C' | 'D' | 'E';
export type ClaseKoppen =
  | 'Af' | 'Am' | 'Aw'
  | 'BWh' | 'BWk' | 'BSh' | 'BSk'
  | 'Csa' | 'Csb' | 'Csc' | 'Cwa' | 'Cwb' | 'Cwc' | 'Cfa' | 'Cfb' | 'Cfc'
  | 'Dsa' | 'Dsb' | 'Dsc' | 'Dsd' | 'Dwa' | 'Dwb' | 'Dwc' | 'Dwd' | 'Dfa' | 'Dfb' | 'Dfc' | 'Dfd'
  | 'ET' | 'EF';

/** Minimo de anios validos por mes para calcular la normal. */
export const MIN_ANIOS = 10;

export const FUENTE_KOPPEN: Fuente = {
  nombre: 'Clasificacion climatica de Koppen-Geiger (reglas de Peel et al. 2007)',
  url: 'https://doi.org/10.5194/hess-11-1633-2007',
  cita: 'Peel, M. C., Finlayson, B. L. y McMahon, T. A. (2007). Updated world map of the Koppen-Geiger climate classification. Hydrology and Earth System Sciences 11, 1633-1644. Tabla 1 (p. 1636) y reglas de precedencia (p. 1637).',
  nota: 'Normales mensuales calculadas con la serie diaria de NASA POWER de la parcela (anios completos de la ventana). Thot = 10 exacto se toma como C o D (Kottek et al. 2006).',
};

/** Normales mensuales: 12 valores, enero primero. */
export interface NormalesMensuales {
  tMediaC: number[];
  lluviaMm: number[];
  /** Anios validos con que se calculo cada mes (el minimo entre temperatura y lluvia). */
  anios: number[];
}

export interface Variables {
  MAT: number; MAP: number; Thot: number; Tcold: number; Tmon10: number; Pdry: number;
  Psdry: number; Pwdry: number; Pswet: number; Pwwet: number; Pthreshold: number;
  /** Semestre mas calido: 'ONDJFM' o 'AMJJAS' (Peel 2007, nota de la Tabla 1). */
  verano: 'ONDJFM' | 'AMJJAS';
  lluviaVeranoMm: number; lluviaInviernoMm: number;
}

export type ClimaKoppen =
  | {
      estado: 'EVALUABLE';
      clase: ClaseKoppen;
      grupo: GrupoKoppen;
      descripcion: string;
      bioma: Bioma;
      variables: Variables;
      normales: NormalesMensuales;
      fuente: Fuente;
    }
  | { estado: 'NO_EVALUABLE'; motivo: string; clase: null; bioma: null; fuente: Fuente };

const PRIMERA: Record<GrupoKoppen, string> = { A: 'tropical', B: 'árido', C: 'templado', D: 'frío', E: 'polar' };
const COMPLETA: Partial<Record<ClaseKoppen, string>> = { Af: 'selva tropical', Am: 'monzónico', Aw: 'sabana tropical', ET: 'tundra', EF: 'hielo perpetuo' };
const VERANO: Record<string, string> = { a: 'cálido', b: 'templado', c: 'fresco' };

/** Descripcion corta en espanol, armada con los nombres de la Tabla 1 de Peel et al. (2007). */
export function describirKoppen(clase: ClaseKoppen): string {
  const g = clase[0] as GrupoKoppen;
  const completa = COMPLETA[clase];
  if (completa) return `${PRIMERA[g]}, ${completa}`;
  if (g === 'B') return `${PRIMERA[g]}, ${clase[1] === 'W' ? 'desértico' : 'estepa'} ${clase[2] === 'h' ? 'cálido' : 'frío'}`;
  const s = clase[1], t = clase[2]!;
  const fin = t === 'd' ? 'invierno muy frío' : `verano ${VERANO[t]}`;
  if (s === 's') return `${PRIMERA[g]}, ${t === 'd' ? `verano seco e ${fin}` : `verano seco y ${VERANO[t]}`}`;
  if (s === 'w' && t === 'd') return `${PRIMERA[g]}, invierno seco y muy frío`;
  return `${PRIMERA[g]}, ${s === 'w' ? 'invierno seco' : 'sin estación seca'} ${t === 'd' ? 'e' : 'y'} ${fin}`;
}

/** Bioma decorativo de la escena para cada clase `[PROPUESTA]`: solo apariencia. */
export function biomaDeKoppen(clase: ClaseKoppen): Bioma {
  if (clase === 'Af' || clase === 'Am') return 'tropical_humedo';
  if (clase === 'Aw') return 'tropical_seco';
  if (clase[0] === 'B') return 'arido';
  if (clase[0] === 'C') return 'templado';
  return 'frio';
}

const DIAS_MES = (anio: number, mes: number) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

/**
 * Normales mensuales de la serie diaria. Un mes de un anio cuenta para una variable solo si trae todos sus dias con
 * dato. Devuelve null en cada mes con menos de MIN_ANIOS anios validos.
 */
export function normalesMensuales(serie: Pick<SerieClima, 'diario'>): { normales: NormalesMensuales; faltan: number[] } {
  type Acum = { t: number; nt: number; p: number; np: number; dias: number };
  const porMes = new Map<string, Acum>();
  for (const d of serie.diario) {
    const clave = d.fecha.slice(0, 7);
    const a = porMes.get(clave) ?? { t: 0, nt: 0, p: 0, np: 0, dias: 0 };
    if (d.tMediaC != null) { a.t += d.tMediaC; a.nt += 1; }
    if (d.lluviaMm != null) { a.p += d.lluviaMm; a.np += 1; }
    porMes.set(clave, a);
  }
  const t: number[][] = Array.from({ length: 12 }, () => []);
  const p: number[][] = Array.from({ length: 12 }, () => []);
  for (const [clave, a] of porMes) {
    const anio = Number(clave.slice(0, 4));
    const mes = Number(clave.slice(5, 7)) - 1;
    const dias = DIAS_MES(anio, mes);
    if (a.nt === dias) t[mes]!.push(a.t / dias);
    if (a.np === dias) p[mes]!.push(a.p);
  }
  const media = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length;
  const anios = t.map((v, i) => Math.min(v.length, p[i]!.length));
  const faltan = anios.flatMap((n, i) => (n < MIN_ANIOS ? [i + 1] : []));
  return {
    normales: { tMediaC: t.map((v) => (v.length ? media(v) : Number.NaN)), lluviaMm: p.map((v) => (v.length ? media(v) : Number.NaN)), anios },
    faltan,
  };
}

const ONDJFM = [9, 10, 11, 0, 1, 2];
const AMJJAS = [3, 4, 5, 6, 7, 8];

/** Variables de la Tabla 1 de Peel et al. (2007) a partir de las normales mensuales. */
export function variablesKoppen(n: Pick<NormalesMensuales, 'tMediaC' | 'lluviaMm'>): Variables {
  const T = n.tMediaC, P = n.lluviaMm;
  const suma = (v: number[]) => v.reduce((a, b) => a + b, 0);
  const tDe = (meses: number[]) => suma(meses.map((m) => T[m]!)) / 6;
  const verano = tDe(ONDJFM) > tDe(AMJJAS) ? 'ONDJFM' : 'AMJJAS';
  const mv = verano === 'ONDJFM' ? ONDJFM : AMJJAS;
  const mi = verano === 'ONDJFM' ? AMJJAS : ONDJFM;
  const pv = mv.map((m) => P[m]!), pi = mi.map((m) => P[m]!);
  const MAT = suma(T) / 12, MAP = suma(P);
  const lluviaVeranoMm = suma(pv), lluviaInviernoMm = suma(pi);
  const Pthreshold = lluviaInviernoMm >= 0.7 * MAP ? 2 * MAT : lluviaVeranoMm >= 0.7 * MAP ? 2 * MAT + 28 : 2 * MAT + 14;
  return {
    MAT, MAP, Thot: Math.max(...T), Tcold: Math.min(...T), Tmon10: T.filter((x) => x > 10).length, Pdry: Math.min(...P),
    Psdry: Math.min(...pv), Pwdry: Math.min(...pi), Pswet: Math.max(...pv), Pwwet: Math.max(...pi), Pthreshold,
    verano, lluviaVeranoMm, lluviaInviernoMm,
  };
}

/** Clase de Koppen-Geiger con las reglas de Peel et al. (2007). */
export function claseKoppen(v: Variables): ClaseKoppen {
  // B primero (p. 1637).
  if (v.MAP < 10 * v.Pthreshold) {
    return `B${v.MAP < 5 * v.Pthreshold ? 'W' : 'S'}${v.MAT >= 18 ? 'h' : 'k'}` as ClaseKoppen;
  }
  if (v.Tcold >= 18) {
    if (v.Pdry >= 60) return 'Af';
    return v.Pdry >= 100 - v.MAP / 25 ? 'Am' : 'Aw';
  }
  if (v.Thot < 10) return v.Thot > 0 ? 'ET' : 'EF';
  const grupo = v.Tcold > 0 ? 'C' : 'D';
  const s = v.Psdry < 40 && v.Psdry < v.Pwwet / 3;
  const w = v.Pwdry < v.Pswet / 10;
  const segunda = s && w ? (v.lluviaVeranoMm > v.lluviaInviernoMm ? 'w' : 's') : s ? 's' : w ? 'w' : 'f';
  let tercera: 'a' | 'b' | 'c' | 'd';
  if (v.Thot >= 22) tercera = 'a';
  else if (v.Tmon10 >= 4) tercera = 'b';
  else if (grupo === 'D' && v.Tcold < -38) tercera = 'd';
  else tercera = 'c';
  return `${grupo}${segunda}${tercera}` as ClaseKoppen;
}

/** Clima de la parcela a partir de su serie de clima. Sin normales completas, NO_EVALUABLE con motivo. */
export function climaDeSerie(serie: Pick<SerieClima, 'diario'> | null | undefined): ClimaKoppen {
  if (!serie || !serie.diario.length) return { estado: 'NO_EVALUABLE', motivo: 'Sin serie de clima.', clase: null, bioma: null, fuente: FUENTE_KOPPEN };
  const { normales, faltan } = normalesMensuales(serie);
  if (faltan.length) {
    return {
      estado: 'NO_EVALUABLE', clase: null, bioma: null, fuente: FUENTE_KOPPEN,
      motivo: `Meses con menos de ${MIN_ANIOS} años completos de temperatura y lluvia: ${faltan.join(', ')}. No se rellenan.`,
    };
  }
  const variables = variablesKoppen(normales);
  const clase = claseKoppen(variables);
  return { estado: 'EVALUABLE', clase, grupo: clase[0] as GrupoKoppen, descripcion: describirKoppen(clase), bioma: biomaDeKoppen(clase), variables, normales, fuente: FUENTE_KOPPEN };
}
