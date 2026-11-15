// Consejos de la mascota. Pura: arma frases cortas con lo que ya existe (calendario local,
// resultado del motor y evidencia satelital NDVI y SMAP). No inventa cifras: si falta un dato,
// ese consejo no aparece. Los cortes de NDVI y SMAP solo ponen palabras a un numero `[PROPUESTA]`.
import type { CalendarioLocal, Escenario, Ndvi, PlanSiembra, ResultadoRotacion, Smap } from '../../../../contratos/tipos/contratos';
import { referenciaSiembra } from '../planes';
import { nombreCultivo, nombreEscenario, rangoVentana } from './piezas';
import { idiomaActual, tt } from '../i18n/actual';
import type { ClaveTexto } from '../i18n/diccionarios';

export type PasoConsejo = 'cultivos' | 'escenarios' | 'comparacion';
export interface Consejo { id: string; texto: string; tono: 'dato' | 'ojo' | 'idea' }

/** NDVI: escaso, moderado o denso (Earth Observatory de NASA describe esos rangos). */
export function nivelNdvi(v: number): string {
  return v < 0.2 ? tt('cons.sinVeg') : v < 0.5 ? tt('cons.vegMod') : tt('cons.vegDensa');
}
/** Humedad del suelo SMAP en m3/m3. */
export function nivelSmap(v: number): string {
  return v < 0.15 ? tt('cons.seco') : v < 0.3 ? tt('cons.media') : tt('cons.humedo');
}

const buena = (d: { ndvi: number | null; calidad?: number | null; estado?: string }) => d.ndvi != null && (d.calidad == null || d.calidad <= 1) && d.estado !== 'NO_EVALUABLE';

/** Ultimo NDVI de buena calidad. */
export function ultimoNdvi(n: Ndvi | null): { fecha: string; valor: number } | null {
  const d = [...(n?.serie ?? [])].reverse().find(buena);
  return d && d.ndvi != null ? { fecha: d.fecha, valor: d.ndvi } : null;
}
/** Promedio de NDVI de buena calidad en un anio; null si no hay datos. */
export function ndviDelAnio(n: Ndvi | null, anio: number): number | null {
  const v = (n?.serie ?? []).filter((d) => buena(d) && d.fecha.startsWith(`${anio}-`)).map((d) => d.ndvi as number);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
/** Ultimo dia con humedad SMAP. */
export function ultimaHumedad(s: Smap | null): { fecha: string; valor: number } | null {
  const d = [...(s?.dias ?? [])].reverse().find((x) => x.humedadM3M3 != null);
  return d && d.humedadM3M3 != null ? { fecha: d.fecha, valor: d.humedadM3M3 } : null;
}

const fechaLarga = (f: string) => tt('cons.fechaDia', { dia: Number(f.slice(8, 10)), mes: tt(`mesLargo.${Number(f.slice(5, 7))}` as ClaveTexto) });
const dos = (v: number) => v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
const mm = (v: number) => `${Math.round(v)} mm`;

export interface EntradaConsejos {
  paso: PasoConsejo;
  plan: PlanSiembra | null;
  ciclo: number;
  calendario: CalendarioLocal | null;
  escenario: Escenario;
  resultado: ResultadoRotacion | null;
  ordenadas: readonly ResultadoRotacion[];
  nombreRotacion: (id: string) => string;
  leguminosas: ReadonlySet<string>;
  ndvi: Ndvi | null;
  smap: Smap | null;
  /** Plagas registradas en la zona que atacan el ciclo visible y bloques sin insecticida. */
  riesgos?: readonly { plaga: string; cultivo: string; bloques: number }[];
  /** Bioma aproximado de la parcela, con su temperatura media y lluvia anual (NASA POWER). */
  bioma?: { nombre: string; tMedia: number | null; lluvia: number | null } | null;
}

export function consejos(e: EntradaConsejos): Consejo[] {
  const salida: Consejo[] = [];
  const visible = e.plan?.ciclos.find((c) => c.ciclo === e.ciclo) ?? e.plan?.ciclos[0];
  const humedad = ultimaHumedad(e.smap);
  const verdor = ultimoNdvi(e.ndvi);

  if (e.paso === 'cultivos') {
    salida.push({ id: 'pintar', tono: 'idea', texto: tt('cons.pintar', { brocha: '{brocha}' }) });
    if (visible) {
      const ref = referenciaSiembra(visible.cultivo, visible.temporada, e.calendario);
      const v = ref?.ventana.estado === 'EVALUABLE' ? ref.ventana : null;
      if (v && visible.dentroDeVentana === false) salida.push({ id: 'ventana-fuera', tono: 'ojo', texto: tt('cons.ventanaFuera', { cultivo: nombreCultivo(visible.cultivo).toLowerCase(), ventana: rangoVentana(v) }) });
      else if (v) salida.push({ id: 'ventana', tono: 'dato', texto: tt('cons.ventana', { cultivo: nombreCultivo(visible.cultivo).toLowerCase(), del: idiomaActual() === 'en' || /^(cerca|en) /.test(rangoVentana(v)) ? '' : 'del ', ventana: rangoVentana(v) }) });
      if (ref?.presencia.estado === 'no_registrado') salida.push({ id: 'no-registrado', tono: 'ojo', texto: tt('cons.noRegistrado', { cultivo: nombreCultivo(visible.cultivo) }) });
    }
    if (e.plan && !e.plan.ciclos.some((c) => e.leguminosas.has(c.cultivo))) {
      salida.push({ id: 'leguminosa', tono: 'idea', texto: tt('cons.leguminosa') });
    }
    const r = e.riesgos?.[0];
    if (r) salida.splice(1, 0, { id: 'plaga', tono: 'ojo', texto: tt('cons.plaga', { plaga: r.plaga.toLowerCase(), cultivo: r.cultivo.toLowerCase(), insecticida: '{insecticida}', n: r.bloques, bloques: r.bloques === 1 ? tt('cultivos.bloque') : tt('cultivos.bloques') }) });
    if (e.bioma && e.bioma.tMedia != null && e.bioma.lluvia != null) salida.push({ id: 'bioma', tono: 'dato', texto: tt('cons.bioma', { bioma: e.bioma.nombre, t: Math.round(e.bioma.tMedia), lluvia: Math.round(e.bioma.lluvia).toLocaleString('es-MX') }) });
    if (humedad) salida.push({ id: 'smap', tono: 'dato', texto: tt('cons.smap', { nivel: nivelSmap(humedad.valor), fecha: fechaLarga(humedad.fecha), valor: dos(humedad.valor) }) });
    if (verdor) salida.push({ id: 'ndvi', tono: 'dato', texto: tt('cons.ndvi', { valor: dos(verdor.valor), fecha: fechaLarga(verdor.fecha), anio: verdor.fecha.slice(0, 4), nivel: nivelNdvi(verdor.valor) }) });
  }

  if (e.paso === 'escenarios') {
    salida.push({ id: 'tiempo', tono: 'idea', texto: tt('cons.tiempo', { calendario: '{calendario}' }) });
    const m = e.resultado?.porEscenario[e.escenario];
    const falta = m?.pilares.deficitHidrico.deficitTotalMm;
    const sobra = m?.pilares.excesoHidrico?.excesoTotalMm;
    if (falta != null && falta >= 20) salida.push({ id: 'falta', tono: 'ojo', texto: tt('cons.falta', { escenario: nombreEscenario[e.escenario]!.toLowerCase(), mm: mm(falta) }) });
    else if (falta != null) salida.push({ id: 'falta-poca', tono: 'dato', texto: tt('cons.faltaPoca', { escenario: nombreEscenario[e.escenario]!.toLowerCase(), mm: mm(falta) }) });
    if (sobra != null && sobra >= 500 && e.escenario !== 'seco') salida.push({ id: 'sobra', tono: 'ojo', texto: tt('cons.sobra', { escenario: nombreEscenario[e.escenario]!.toLowerCase(), mm: mm(sobra) }) });
    const anio = m?.anioReal;
    const normal = e.resultado?.porEscenario.habitual.anioReal;
    if (anio && normal && e.escenario !== 'habitual') {
      const a = ndviDelAnio(e.ndvi, anio), b = ndviDelAnio(e.ndvi, normal);
      if (a != null && b != null) salida.push({ id: 'ndvi-anio', tono: 'dato', texto: tt('cons.ndviAnio', { comp: a < b ? tt('cons.menos') : tt('cons.mas'), anio, a: dos(a), normal, b: dos(b) }) });
    }
  }

  if (e.paso === 'comparacion') {
    const primera = e.ordenadas.find((r) => r.ranking?.posicion === 1);
    if (primera) {
      salida.push({ id: 'ganadora', tono: 'dato', texto: tt('cons.ganadora', { rotacion: idiomaActual() === 'en' ? e.nombreRotacion(primera.rotacionId) : e.nombreRotacion(primera.rotacionId).toLowerCase() }) });
      const debil = primera.explicacion?.riesgos[0];
      if (debil) salida.push({ id: 'debil', tono: 'ojo', texto: tt('cons.debil', { texto: `${debil.charAt(0).toLowerCase()}${debil.slice(1)}` }) });
    }
    salida.push({ id: 'mejorar', tono: 'idea', texto: tt('cons.mejorar') });
  }
  return salida;
}
