// A4.3 (parte logica): tarjeta de cada rotacion en el campo `explicacion` de resultado-rotacion (doc 05, paso 8).
// Plantilla en espanol para un agricultor, sin LLM. Cada frase sale de un numero o una fuente del resultado: si no hay
// dato, la frase no se dice o se dice que falta. No se habla de plagas, rendimiento, precios ni nitrogeno medido,
// porque el motor no los calcula. Las cifras de la evidencia llevan su fuente.
import { fao56, SIAP_CICLOS } from './fuentes';
import { sumarDias } from './fechas';
import { dentroDeVentana, diasAnioAgricola } from './pilares';
import type { ResultadoMotor } from './motor';
import type { ResultadoRanking } from './ranking';
import {
  ESCENARIOS,
  type CalendarioLocal,
  type CatalogoCultivos,
  type Escenario,
  type Evidencia,
  type Fuente,
  type ResultadoRotacion,
  type Suelo,
} from './tipos';

export interface ContextoTarjetas {
  ranking: ResultadoRanking;
  /** Resultado del motor de cada rotacion (plan y simulaciones), por rotacionId. */
  motores: Record<string, ResultadoMotor>;
  catalogo: CatalogoCultivos;
  calendario?: CalendarioLocal | null;
  suelo?: Suelo | null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NOMBRE_ESC: Record<Escenario, string> = { seco: 'año seco', habitual: 'año habitual', lluvioso: 'año lluvioso' };
const PILAR: Record<string, string> = {
  deficitHidrico: 'falta de agua',
  excesoHidrico: 'exceso de agua',
  compatibilidadCiclo: 'fechas de siembra',
  proteccionSuelo: 'días sin cultivo',
  riesgoCalor: 'calor',
  aporteIndirecto: 'aporte indirecto al suelo',
};
/** Nombre para el texto (con acentos); si no esta aqui, el nombre comun del catalogo. */
const NOMBRE_CULTIVO: Record<string, string> = { maiz: 'maíz', frijol: 'frijol', calabaza: 'calabaza', chile: 'chile' };
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const r2 = (x: number) => Math.round(x * 100) / 100;
export const AVISO_EXPERTO =
  'Es una comparación con años reales del pasado, no una predicción. Antes de decidir, revísela con un técnico o agrónomo de la zona.';

const pct = (x: number) => `${Math.round(x * 1000) / 10} %`;
const mm = (x: number) => `${Math.round(x)} mm`;
const fecha = (f: string) => `${Number(f.slice(8, 10))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
const ventanaTexto = (v: { desdeMes: number; hastaMes: number; desdeDia?: number; hastaDia?: number }) =>
  `del ${v.desdeDia ?? 1} de ${MESES[v.desdeMes - 1]} al ${v.hastaDia ?? 'fin'} de ${MESES[v.hastaMes - 1]}`.replace(' al fin de', ' a fines de');

function nombreCultivo(ctx: ContextoTarjetas, id: string): string {
  return NOMBRE_CULTIVO[id] ?? (ctx.catalogo.cultivos.find((c) => c.id === id)?.nombreComun ?? id).toLowerCase();
}

/** Falta de agua en palabras: sin redondear a "0 %" cuando hubo algo. */
function faltaDeAgua(h: { proporcionDemandaNoCubierta: number | null; diasDeficit: number | null; deficitTotalMm?: number | null | undefined }): string {
  const p = h.proporcionDemandaNoCubierta ?? 0;
  if (!h.diasDeficit) return 'al cultivo no le faltó agua';
  if (p < 0.0005) return `al cultivo casi no le faltó agua (${h.diasDeficit} días, menos de 1 mm)`;
  return `al cultivo le faltó el ${pct(p)} del agua que necesitaba (${h.diasDeficit} días con falta de agua, ${mm(h.deficitTotalMm ?? 0)})`;
}

/** Mes (del clima del escenario) con mas deficit o mas exceso en los ciclos del plan general. */
function mesMayor(motor: ResultadoMotor, esc: Escenario, campo: 'deficitMm' | 'percolacionMm'): { mes: string; mm: number } | null {
  const sim = motor.simulaciones[esc];
  const porMes = new Map<string, number>();
  for (const c of motor.plan.ciclos) {
    const s = sim.ciclos.get(`${c.ciclo}|${c.cultivo}`);
    if (!s?.balance || !s.siembraClima) continue;
    s.balance.dias.forEach((d, i) => {
      const m = sumarDias(s.siembraClima as string, i).slice(0, 7);
      porMes.set(m, (porMes.get(m) ?? 0) + d[campo]);
    });
  }
  let mejor: { mes: string; mm: number } | null = null;
  for (const [mes, v] of porMes) if (v > 0 && (!mejor || v > mejor.mm)) mejor = { mes, mm: v };
  return mejor;
}
const mesTexto = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;

function evidenciaEscenarios(r: ResultadoRotacion, motor: ResultadoMotor): Evidencia[] {
  const ev: Evidencia[] = [];
  for (const e of ESCENARIOS) {
    const m = r.porEscenario[e];
    const clima = motor.simulaciones[e].clima;
    if (!clima || m.anioReal === null) continue;
    const lluvia = (clima as { seleccion?: { lluviaTemporadasMm?: { total: number | null } } }).seleccion?.lluviaTemporadasMm?.total;
    if (typeof lluvia === 'number') {
      ev.push({ texto: `${NOMBRE_ESC[e]} (${m.anioReal}): llovieron ${mm(lluvia)} en las temporadas de siembra PV y OI.`, valor: lluvia, unidad: 'mm', fuente: clima.fuente });
    }
    const h = m.pilares.deficitHidrico;
    if (h.proporcionDemandaNoCubierta !== null) {
      ev.push({
        texto: `${NOMBRE_ESC[e]} (${m.anioReal}): ${faltaDeAgua(h)}.`,
        valor: h.proporcionDemandaNoCubierta,
        unidad: 'fraccion de la demanda',
        fuente: clima.fuente,
      });
    }
    const x = m.pilares.excesoHidrico;
    if (x && x.excesoTotalMm !== null) {
      ev.push({
        texto: `${NOMBRE_ESC[e]} (${m.anioReal}): ${mm(x.excesoTotalMm)} de lluvia se fueron por debajo de la raíz en ${x.diasExceso} días (el ${pct(x.fraccionLluviaPercolada ?? 0)} de lo que llovió durante los ciclos).`,
        valor: x.excesoTotalMm,
        unidad: 'mm',
        fuente: fao56('Capitulo 8, ecuacion 88 (percolacion profunda)', 'https://www.fao.org/4/x0490e/x0490e0e.htm'),
      });
    }
    const p = m.pilares.proteccionSuelo;
    if (p && p.diasSueloDesnudo !== null) {
      ev.push({
        texto: `${NOMBRE_ESC[e]} (${m.anioReal}): el terreno queda sin cultivo ${p.diasSueloDesnudo} de ${diasAnioAgricola(m.anioReal)} días del año agrícola.`,
        valor: p.diasSueloDesnudo,
        unidad: 'dias',
        fuente: SIAP_CICLOS,
      });
    }
  }
  return ev.map((x) => ({ ...x, texto: mayus(x.texto) }));
}

interface SiembraVentana {
  ciclo: number;
  cultivo: string;
  siembra: string;
  dentro: boolean | null;
  texto: string | null;
  fuente: Fuente | null;
}

/** H-M11: quien da la ventana, desde su fuente (antes decia siempre INIFAP, aunque fuera SIAP o GGCMI fuera de Mexico).
 * Se nombra la institucion (lo que va antes de la primera coma de fuente.nombre); la cita completa esta en la evidencia. */
export function ventanasDe(fuentes: (Fuente | null)[], una = false): string {
  const quienes = [...new Set(fuentes.map((f) => f?.nombre.split(',')[0]?.trim()).filter((q): q is string => !!q))];
  if (quienes.length === 0) return una ? 'la ventana del calendario local' : 'las ventanas del calendario local';
  const lista = quienes.join(' y ');
  const recomendada = quienes.every((q) => q === 'INIFAP');
  if (una) return recomendada ? `la ventana recomendada por ${lista}` : `la ventana de siembra de ${lista}`;
  return recomendada ? `las ventanas recomendadas por ${lista}` : `las ventanas de siembra de ${lista}`;
}

function siembrasYVentanas(ctx: ContextoTarjetas, motor: ResultadoMotor): SiembraVentana[] {
  return motor.plan.ciclos.map((c) => {
    const e = ctx.calendario?.entradas.find((x) => x.cultivo === c.cultivo && x.temporada === c.temporada);
    if (!e || e.ventana.estado !== 'EVALUABLE') return { ciclo: c.ciclo, cultivo: c.cultivo, siembra: c.siembra, dentro: null, texto: null, fuente: null };
    return { ciclo: c.ciclo, cultivo: c.cultivo, siembra: c.siembra, dentro: dentroDeVentana(c.siembra, e.ventana), texto: ventanaTexto(e.ventana), fuente: e.ventana.fuente };
  });
}

/** Tarjeta (campo explicacion) de una rotacion ya ordenada. */
export function tarjetaRotacion(ctx: ContextoTarjetas, r: ResultadoRotacion): ResultadoRotacion['explicacion'] {
  const motor = ctx.motores[r.rotacionId];
  const base = { evidencia: [] as Evidencia[], beneficios: [] as string[], huecos: [] as string[], riesgos: [] as string[], avisoExperto: AVISO_EXPERTO, redactadaPor: 'plantilla' as const };
  if (!motor) return { ...base, porQue: `No hay resultado del motor para la rotación ${r.rotacionId}.`, huecos: ['Falta simular esta rotación.'] };
  const cultivos = [...new Set(motor.plan.ciclos.map((c) => nombreCultivo(ctx, c.cultivo)))];
  const evaluadas = ctx.ranking.rotaciones.filter((x) => x.peorCaso !== null);
  const siembras = siembrasYVentanas(ctx, motor);

  // Por que
  let porQue: string;
  if (r.estado === 'NO_EVALUABLE' || r.estado === 'ERROR_DATOS') {
    const motivo = r.porEscenario.seco.pilares.deficitHidrico.motivo ?? r.advertencias.find((a) => a.severidad === 'critico')?.mensaje ?? 'faltan datos';
    // Sin resultado no hay evidencia, beneficios ni riesgos que contar: solo el motivo.
    return { ...base, porQue: `No se puede evaluar esta rotación: ${motivo}`, huecos: ['Faltan datos o parámetros con fuente para simularla (ver el motivo).'] };
  } else if (!r.ranking) {
    const nr = r.cultivosNoRecomendados?.[0];
    porQue = `Se muestra para explorar, pero no se recomienda${nr ? `: ${nr.motivo}` : '.'}`;
  } else {
    const pc = r.peorCaso!;
    const anio = r.porEscenario[pc.escenario].anioReal;
    const lugar = r.ranking.posicion === 1 ? `Es la opción más robusta de las ${r.ranking.de} rotaciones comparadas` : `Queda en el lugar ${r.ranking.posicion} de ${r.ranking.de} por robustez`;
    if (pc.criterio === 'B_minimax_arrepentimiento') {
      const cero = (r.arrepentimiento ?? 1) === 0;
      const que = Object.keys(r.ponderacion?.pesos ?? {}).map((k) => PILAR[k] ?? k);
      const combina = que.length > 0 ? ` (el puntaje combina ${que.slice(0, -1).join(', ')}${que.length > 1 ? ' y ' : ''}${que[que.length - 1]}; 1 es lo mejor)` : '';
      porQue =
        `${lugar}. ` +
        (cero
          ? `En los tres años de referencia (${ESCENARIOS.map((e) => `${NOMBRE_ESC[e]} ${r.porEscenario[e].anioReal}`).join(', ')}) tiene el mejor puntaje de todas${combina}. `
          : `En el año en que más se aleja de la mejor opción queda ${r2(r.arrepentimiento ?? 0)} puntos por debajo de ella${combina}. `) +
        `Su peor año es el ${NOMBRE_ESC[pc.escenario]} (${anio}), con ${r2(pc.valor)} de 1.`;
    } else {
      porQue = `${lugar}. En su peor año, el ${NOMBRE_ESC[pc.escenario]} (${anio}), ${faltaDeAgua(r.porEscenario[pc.escenario].pilares.deficitHidrico)}.`;
    }
    porQue += ` Cultivos: ${cultivos.length > 1 ? `${cultivos.slice(0, -1).join(', ')} y ${cultivos[cultivos.length - 1]}` : cultivos[0]}.`;
  }

  const evidencia = evidenciaEscenarios(r, motor);
  for (const s of siembras) {
    if (s.dentro === null || !s.fuente) continue;
    evidencia.push({
      texto: `Ciclo ${s.ciclo}, ${nombreCultivo(ctx, s.cultivo)} sembrado el ${fecha(s.siembra)}: ${s.dentro ? 'dentro' : 'fuera'} de la ventana recomendada (${s.texto}).`,
      unidad: 'fecha',
      fuente: s.fuente,
    });
  }

  // Beneficios: solo hechos medidos, comparados con las demas rotaciones evaluadas.
  const beneficios: string[] = [];
  if (r.ranking) {
    const seco = r.porEscenario.seco;
    const h = seco.pilares.deficitHidrico.proporcionDemandaNoCubierta;
    if (h !== null && seco.anioReal !== null) beneficios.push(`Agua: aun en el año seco (${seco.anioReal}) el suelo le dio al cultivo el ${pct(1 - h)} del agua que necesitaba.`);
    const dias = (x: ResultadoRotacion) => x.porEscenario.habitual.pilares.proteccionSuelo?.diasSueloDesnudo ?? null;
    const propios = dias(r);
    const otros = evaluadas.filter((x) => x.rotacionId !== r.rotacionId).map(dias).filter((d): d is number => d !== null);
    if (propios !== null && otros.length > 0 && propios < Math.min(...otros)) {
      beneficios.push(`Suelo: es la que menos tiempo deja el terreno sin cultivo (${propios} días en el año habitual, contra ${Math.min(...otros)} a ${Math.max(...otros)} días de las demás).`);
    }
    const ex = (x: ResultadoRotacion) => x.porEscenario.lluvioso.pilares.excesoHidrico?.fraccionLluviaPercolada ?? null;
    const fx = ex(r);
    const fo = evaluadas.filter((x) => x.rotacionId !== r.rotacionId).map(ex).filter((d): d is number => d !== null);
    if (fx !== null && fo.length > 0 && fx < Math.min(...fo)) {
      beneficios.push(`Agua de lluvia: en el año lluvioso es la que menos lluvia pierde por debajo de la raíz (${pct(fx)}).`);
    }
    if (siembras.length > 0 && siembras.every((s) => s.dentro === true)) beneficios.push(`Fechas: todas las siembras caen en ${ventanasDe(siembras.map((s) => s.fuente))} para la zona.`);
  }
  const aporte = r.porEscenario.habitual.pilares.aporteIndirecto;
  if (aporte?.incluyeLeguminosa === true) {
    const leg = motor.plan.ciclos.map((c) => c.cultivo).filter((c) => ctx.catalogo.cultivos.find((x) => x.id === c)?.esLeguminosa);
    beneficios.push(`Rotación: combina ${aporte.especiesDistintas} especies e incluye una leguminosa (${[...new Set(leg.map((c) => nombreCultivo(ctx, c)))].join(', ')}). Este simulador no mide su aporte al suelo.`);
  } else if (aporte?.especiesDistintas && aporte.especiesDistintas > 1) {
    beneficios.push(`Rotación: combina ${aporte.especiesDistintas} especies.`);
  }

  // Huecos de informacion
  const huecos: string[] = [];
  const excluidos = r.ponderacion?.pilaresExcluidos ?? [];
  if (excluidos.includes('compatibilidadCiclo')) {
    const sinVentana = evaluadas.filter((x) => x.porEscenario.habitual.pilares.compatibilidadCiclo?.estado !== 'EVALUABLE').map((x) => x.rotacionId);
    huecos.push(
      sinVentana.length > 0
        ? `Las fechas de siembra no entran a la comparación: ${sinVentana.join(', ')} ${sinVentana.length > 1 ? 'tienen' : 'tiene'} una siembra sin ventana con fuente en el calendario local.`
        : 'Las fechas de siembra no entran a la comparación: falta el calendario local.',
    );
  }
  if (r.porEscenario.habitual.pilares.riesgoCalor?.estado === 'NO_EVALUABLE') {
    huecos.push('No se evalúa el calor: el catálogo no tiene un umbral de temperatura con fuente para estos cultivos.');
  }
  for (const p of ['deficitHidrico', 'excesoHidrico', 'proteccionSuelo'] as const) {
    if (excluidos.includes(p)) huecos.push(`La ${PILAR[p]} no entra a la comparación: no todas las rotaciones la tienen calculada.`);
  }
  const prot = r.porEscenario.habitual.pilares.proteccionSuelo;
  if (prot?.estado === 'EVALUABLE' && prot.indiceErosionRelativo === null) {
    huecos.push('No se calcula el riesgo de erosión: haría falta la intensidad de la lluvia en lapsos de 30 minutos y datos de cobertura y pendiente con fuente; solo se cuentan los días sin cultivo.');
  }
  if (ctx.suelo) {
    const taw = ctx.suelo.agua?.tawMmPorM;
    const clase = ctx.suelo.textura.clase?.replaceAll('_', ' ') ?? ctx.suelo.textura.grupo;
    huecos.push(
      `El suelo (${clase}${taw?.estado === 'EVALUABLE' ? `, ${Math.round(taw.valor)} mm de agua útil por metro` : ''}) es una estimación (${ctx.suelo.origen === 'mapa_global' ? 'mapa global' : 'elegido en el selector'}), no una medición de su parcela.`,
    );
  }
  if (r.advertencias.some((a) => a.codigo === 'RESOLUCION_GRUESA')) {
    // Celda MERRA-2 de POWER: 0.5 grados de latitud por 0.625 de longitud (1 grado de latitud ~ 111 km).
    const lat = (motor.parcela.centroide[1] * Math.PI) / 180;
    const ns = Math.round(0.5 * 111.32);
    const eo = Math.round(0.625 * 111.32 * Math.cos(lat));
    huecos.push(`El clima de NASA POWER es regional (cuadros de 0.5 por 0.625 grados, unos ${ns} por ${eo} km aquí): es el mismo para toda la parcela.`);
  }
  if (r.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_GWETROOT')) huecos.push('La humedad del suelo al sembrar viene de un modelo regional (NASA POWER), no de una medición en el campo.');
  if (r.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_SUPUESTA')) huecos.push('Se supone el suelo húmedo al sembrar: en un año seco la falta de agua puede ser mayor.');
  for (const c of new Set(motor.plan.ciclos.map((x) => x.cultivo))) {
    const cat = ctx.catalogo.cultivos.find((x) => x.id === c);
    const cita = cat?.kc.media.estado === 'EVALUABLE' ? cat.kc.media.fuente.cita ?? '' : '';
    if (c === 'chile' && /pepper/i.test(cita)) {
      huecos.push(`Los datos del chile vienen del pimiento dulce (${cita}): FAO-56 no tiene una fila propia para el chile.`);
    }
  }
  huecos.push('No se consideran precios, costos, rendimiento ni plagas.');

  // Riesgos
  const riesgos: string[] = [];
  if (r.estado === 'EXPLORATORIO') for (const n of r.cultivosNoRecomendados ?? []) riesgos.push(`${nombreCultivo(ctx, n.cultivo)}: ${n.motivo}`);
  if (r.peorCaso) {
    const e = r.peorCaso.escenario;
    const m = r.porEscenario[e];
    const h = m.pilares.deficitHidrico;
    const x = m.pilares.excesoHidrico;
    riesgos.push(
      `Su peor año es el ${NOMBRE_ESC[e]} (${m.anioReal}): ` +
        [
          h.proporcionDemandaNoCubierta !== null && h.proporcionDemandaNoCubierta >= 0.0005 ? `faltó el ${pct(h.proporcionDemandaNoCubierta)} del agua` : null,
          x?.excesoTotalMm ? `${mm(x.excesoTotalMm)} de lluvia se fueron por debajo de la raíz` : null,
        ]
          .filter(Boolean)
          .join(' y ') +
        '.',
    );
  }
  const masExceso = mesMayor(motor, 'lluvioso', 'percolacionMm');
  if (masExceso && r.porEscenario.lluvioso.anioReal !== null) {
    riesgos.push(`Exceso de agua: en el año lluvioso (${r.porEscenario.lluvioso.anioReal}) el mes más difícil fue ${mesTexto(masExceso.mes)}, con ${mm(masExceso.mm)} que el suelo no pudo guardar.`);
  }
  const masDeficit = mesMayor(motor, 'seco', 'deficitMm');
  if (masDeficit && masDeficit.mm >= 0.5) {
    riesgos.push(`Falta de agua: en el año seco el mes más difícil fue ${mesTexto(masDeficit.mes)} (${mm(masDeficit.mm)} que el cultivo pidió y no tuvo).`);
  }
  for (const s of siembras.filter((x) => x.dentro === false)) {
    riesgos.push(`El ${nombreCultivo(ctx, s.cultivo)} del ciclo ${s.ciclo} se siembra el ${fecha(s.siembra)}, fuera de ${ventanasDe([s.fuente], true)} (${s.texto}).`);
  }

  return { ...base, porQue, evidencia, beneficios, huecos, riesgos };
}

/** Copia de las rotaciones del ranking con su tarjeta en `explicacion`. */
export function conTarjetas(ctx: ContextoTarjetas): ResultadoRotacion[] {
  return ctx.ranking.rotaciones.map((r) => ({ ...r, explicacion: tarjetaRotacion(ctx, r) }));
}
