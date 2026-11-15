// Consejos de la mascota. Pura: arma frases cortas con lo que ya existe (calendario local,
// resultado del motor y evidencia satelital NDVI y SMAP). No inventa cifras: si falta un dato,
// ese consejo no aparece. Los cortes de NDVI y SMAP solo ponen palabras a un numero `[PROPUESTA]`.
import type { CalendarioLocal, Escenario, Ndvi, PlanSiembra, ResultadoRotacion, Smap } from '../../../../contratos/tipos/contratos';
import { referenciaSiembra } from '../planes';
import { nombreCultivo, nombreEscenario, rangoVentana } from './piezas';

export type PasoConsejo = 'cultivos' | 'escenarios' | 'comparacion';
export interface Consejo { id: string; texto: string; tono: 'dato' | 'ojo' | 'idea' }

/** NDVI: escaso, moderado o denso (Earth Observatory de NASA describe esos rangos). */
export function nivelNdvi(v: number): string {
  return v < 0.2 ? 'casi sin vegetación' : v < 0.5 ? 'vegetación moderada' : 'vegetación densa';
}
/** Humedad del suelo SMAP en m3/m3. */
export function nivelSmap(v: number): string {
  return v < 0.15 ? 'seco' : v < 0.3 ? 'con humedad media' : 'húmedo';
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

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (f: string) => `${Number(f.slice(8, 10))} de ${meses[Number(f.slice(5, 7)) - 1]}`;
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
    salida.push({ id: 'pintar', tono: 'idea', texto: '¡Hola! Elige un cultivo y arrastra con la brocha {brocha} sobre la parcela para sembrarlo. Clic derecho (o dos dedos) gira la vista.' });
    if (visible) {
      const ref = referenciaSiembra(visible.cultivo, visible.temporada, e.calendario);
      const v = ref?.ventana.estado === 'EVALUABLE' ? ref.ventana : null;
      if (v && visible.dentroDeVentana === false) salida.push({ id: 'ventana-fuera', tono: 'ojo', texto: `Tu ${nombreCultivo(visible.cultivo).toLowerCase()} se siembra fuera de su mejor época aquí (${rangoVentana(v)}). Prueba moverla en "Siembra".` });
      else if (v) salida.push({ id: 'ventana', tono: 'dato', texto: `La mejor época para sembrar ${nombreCultivo(visible.cultivo).toLowerCase()} en esta zona es ${/^(cerca|en) /.test(rangoVentana(v)) ? '' : 'del '}${rangoVentana(v)}.` });
      if (ref?.presencia.estado === 'no_registrado') salida.push({ id: 'no-registrado', tono: 'ojo', texto: `${nombreCultivo(visible.cultivo)} casi no se siembra en esta zona. Compáralo con un cultivo que sí se dé aquí.` });
    }
    if (e.plan && !e.plan.ciclos.some((c) => e.leguminosas.has(c.cultivo))) {
      salida.push({ id: 'leguminosa', tono: 'idea', texto: 'Muchas rotaciones alternan con una leguminosa (frijol, haba, soya). Arma otra rotación con una y compáralas; este simulador no mide su aporte al suelo.' });
    }
    const r = e.riesgos?.[0];
    if (r) salida.splice(1, 0, { id: 'plaga', tono: 'ojo', texto: `¡Cuidado! Hay registros de ${r.plaga.toLowerCase()} cerca de aquí y ataca tu ${r.cultivo.toLowerCase()}. Usa el insecticida {insecticida} o se comerá tus plantas (${r.bloques} ${r.bloques === 1 ? 'bloque' : 'bloques'} sin proteger).` });
    if (e.bioma && e.bioma.tMedia != null && e.bioma.lluvia != null) salida.push({ id: 'bioma', tono: 'dato', texto: `Tu parcela tiene ${e.bioma.nombre}: unos ${Math.round(e.bioma.tMedia)} °C en promedio y ${Math.round(e.bioma.lluvia).toLocaleString('es-MX')} mm de lluvia al año. Los cultivos de arriba en la lista son los que mejor van con eso.` });
    if (humedad) salida.push({ id: 'smap', tono: 'dato', texto: `Según el satélite SMAP, el suelo de tu zona estaba ${nivelSmap(humedad.valor)} el ${fechaLarga(humedad.fecha)} (${dos(humedad.valor)} m³/m³). Es un dato regional, no de tu parcela.` });
    if (verdor) salida.push({ id: 'ndvi', tono: 'dato', texto: `El verdor de la zona (NDVI) era de ${dos(verdor.valor)} el ${fechaLarga(verdor.fecha)} de ${verdor.fecha.slice(0, 4)}: ${nivelNdvi(verdor.valor)}. Mide la vegetación de alrededor, no tu cultivo.` });
  }

  if (e.paso === 'escenarios') {
    salida.push({ id: 'tiempo', tono: 'idea', texto: 'Mueve la línea de tiempo {calendario} de abajo y suéltala para ver cómo crece tu cultivo, semana a semana.' });
    const m = e.resultado?.porEscenario[e.escenario];
    const falta = m?.pilares.deficitHidrico.deficitTotalMm;
    const sobra = m?.pilares.excesoHidrico?.excesoTotalMm;
    if (falta != null && falta >= 20) salida.push({ id: 'falta', tono: 'ojo', texto: `En el ${nombreEscenario[e.escenario]!.toLowerCase()} a tu plan le faltaron ${mm(falta)} de agua. Prueba otra fecha de siembra o un cultivo de ciclo más corto y compara.` });
    else if (falta != null) salida.push({ id: 'falta-poca', tono: 'dato', texto: `En el ${nombreEscenario[e.escenario]!.toLowerCase()} casi no le faltó agua a tu plan (${mm(falta)}).` });
    if (sobra != null && sobra >= 500 && e.escenario !== 'seco') salida.push({ id: 'sobra', tono: 'ojo', texto: `En el ${nombreEscenario[e.escenario]!.toLowerCase()} sobraron ${mm(sobra)} de lluvia que el suelo no pudo guardar. Un cultivo que aguante más humedad podría irle mejor: pruébalo.` });
    const anio = m?.anioReal;
    const normal = e.resultado?.porEscenario.habitual.anioReal;
    if (anio && normal && e.escenario !== 'habitual') {
      const a = ndviDelAnio(e.ndvi, anio), b = ndviDelAnio(e.ndvi, normal);
      if (a != null && b != null) salida.push({ id: 'ndvi-anio', tono: 'dato', texto: `El satélite vio la zona ${a < b ? 'menos' : 'más'} verde en ${anio} (NDVI ${dos(a)}) que en el año normal ${normal} (${dos(b)}).` });
    }
  }

  if (e.paso === 'comparacion') {
    const primera = e.ordenadas.find((r) => r.ranking?.posicion === 1);
    if (primera) {
      salida.push({ id: 'ganadora', tono: 'dato', texto: `La ${e.nombreRotacion(primera.rotacionId).toLowerCase()} es la que mejor aguanta su peor año.` });
      const debil = primera.explicacion?.riesgos[0];
      if (debil) salida.push({ id: 'debil', tono: 'ojo', texto: `Aun así, su punto débil: ${debil.charAt(0).toLowerCase()}${debil.slice(1)}` });
    }
    salida.push({ id: 'mejorar', tono: 'idea', texto: 'Usa "Mejorarla" para cambiar cultivos o fechas de una rotación y vuelve a comparar. La decisión final es tuya.' });
  }
  return salida;
}
