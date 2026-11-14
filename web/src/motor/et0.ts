// A2.6: evapotranspiracion de referencia ET0 (doc 05, paso 3). Ecuaciones de FAO-56, capitulo 3.
// Orden de preferencia por dia: ET0 entregada por la fuente (Open-Meteo, FAO Penman-Monteith) >
// Penman-Monteith FAO-56 (ec. 6) con las variables de POWER > Hargreaves (ec. 52) si faltan humedad, viento o
// radiacion (menor precision, siempre declarada) > null si faltan las temperaturas.
import { diaDelAnio } from './fechas';
import type { DiaClima } from './tipos';

const GSC = 0.082; // constante solar, MJ m-2 min-1 (ec. 21)
const SIGMA = 4.903e-9; // Stefan-Boltzmann, MJ K-4 m-2 dia-1 (ec. 39)
const ALBEDO = 0.23; // cultivo de referencia (ec. 38)

/** Presion atmosferica en kPa a la elevacion z en m (ec. 7). */
export function presion(zM: number): number {
  return 101.3 * ((293 - 0.0065 * zM) / 293) ** 5.26;
}

/** Presion de vapor a saturacion en kPa (ec. 11). */
export function eSat(tC: number): number {
  return 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3));
}

/** Radiacion extraterrestre diaria en MJ m-2 dia-1 (ec. 21 a 25). Latitud en grados (sur negativa). */
export function radiacionExtraterrestre(latGrados: number, diaAnio: number): number {
  const phi = (latGrados * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * diaAnio);
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * diaAnio - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * GSC * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

export interface EntradaPenmanMonteith {
  tMaxC: number;
  tMinC: number;
  /** Radiacion solar de onda corta medida, MJ m-2 dia-1. */
  rsMjM2Dia: number;
  /** Viento a 2 m, m/s. */
  u2MS: number;
  /** Humedad relativa media, % (ec. 19). Se ignora si viene eaKPa. */
  rhMediaPct?: number;
  /** Presion de vapor real en kPa, si ya se conoce (ejemplos de FAO-56). */
  eaKPa?: number;
  elevacionM: number;
  latGrados: number;
  diaAnio: number;
}

/** ET0 diaria FAO Penman-Monteith (ec. 6), mm/dia. Flujo de calor del suelo G = 0 a escala diaria (ec. 42). */
export function et0PenmanMonteith(e: EntradaPenmanMonteith): number {
  const tMedia = (e.tMaxC + e.tMinC) / 2; // ec. 9
  const es = (eSat(e.tMaxC) + eSat(e.tMinC)) / 2; // ec. 12
  const ea = e.eaKPa ?? ((e.rhMediaPct ?? NaN) / 100) * es; // ec. 19
  const delta = (4098 * eSat(tMedia)) / (tMedia + 237.3) ** 2; // ec. 13
  const gamma = 0.665e-3 * presion(e.elevacionM); // ec. 8
  const ra = radiacionExtraterrestre(e.latGrados, e.diaAnio);
  const rso = (0.75 + 2e-5 * e.elevacionM) * ra; // ec. 37
  const rns = (1 - ALBEDO) * e.rsMjM2Dia; // ec. 38
  const relRs = Math.min(e.rsMjM2Dia / rso, 1);
  const tk4 = ((e.tMaxC + 273.16) ** 4 + (e.tMinC + 273.16) ** 4) / 2;
  const rnl = SIGMA * tk4 * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * relRs - 0.35); // ec. 39
  const rn = rns - rnl; // ec. 40
  const num = 0.408 * delta * rn + gamma * (900 / (tMedia + 273)) * e.u2MS * (es - ea);
  const den = delta + gamma * (1 + 0.34 * e.u2MS);
  return Math.max(0, num / den);
}

/** ET0 de Hargreaves (FAO-56 ec. 52), mm/dia; Ra pasada a mm/dia con el factor 0.408 (ec. 20). */
export function et0Hargreaves(tMaxC: number, tMinC: number, raMjM2Dia: number): number {
  const tMedia = (tMaxC + tMinC) / 2;
  return Math.max(0, 0.0023 * (tMedia + 17.8) * Math.sqrt(Math.max(0, tMaxC - tMinC)) * 0.408 * raMjM2Dia);
}

export type MetodoEt0 = 'fuente' | 'penman_monteith_fao56' | 'hargreaves_fao56';

export interface SerieEt0 {
  /** ET0 por dia, mismo orden que el diario. null si no se pudo calcular. */
  et0Mm: (number | null)[];
  metodo: (MetodoEt0 | null)[];
  conteo: Record<MetodoEt0, number> & { sinDato: number };
}

/**
 * ET0 de cada dia del diario. elevacionM null => sin presion atmosferica ni Rso: no hay Penman-Monteith y se usa
 * Hargreaves, que no depende de la elevacion.
 */
export function serieEt0(diario: readonly DiaClima[], latGrados: number, elevacionM: number | null): SerieEt0 {
  const et0Mm: (number | null)[] = [];
  const metodo: (MetodoEt0 | null)[] = [];
  const conteo = { fuente: 0, penman_monteith_fao56: 0, hargreaves_fao56: 0, sinDato: 0 };
  for (const d of diario) {
    let v: number | null = null;
    let m: MetodoEt0 | null = null;
    if (typeof d.et0Mm === 'number') {
      v = d.et0Mm;
      m = 'fuente';
    } else if (d.tMaxC !== null && d.tMinC !== null) {
      const J = diaDelAnio(d.fecha);
      const rs = d.radiacionMjM2Dia;
      const rh = d.humedadRelativaPct;
      const u2 = d.vientoMS;
      if (elevacionM !== null && typeof rs === 'number' && typeof rh === 'number' && typeof u2 === 'number') {
        v = et0PenmanMonteith({ tMaxC: d.tMaxC, tMinC: d.tMinC, rsMjM2Dia: rs, u2MS: u2, rhMediaPct: rh, elevacionM, latGrados, diaAnio: J });
        m = 'penman_monteith_fao56';
      } else {
        v = et0Hargreaves(d.tMaxC, d.tMinC, radiacionExtraterrestre(latGrados, J));
        m = 'hargreaves_fao56';
      }
    }
    et0Mm.push(v);
    metodo.push(m);
    if (m) conteo[m]++;
    else conteo.sinDato++;
  }
  return { et0Mm, metodo, conteo };
}
