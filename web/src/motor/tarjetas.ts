// A4.3 (parte logica): tarjeta de cada rotacion en el campo `explicacion` de resultado-rotacion (doc 05, paso 8).
// Plantilla para un agricultor, sin LLM, en espanol (por defecto) o en ingles ([DECIDIDO] 15/11, idioma en ContextoTarjetas).
// Cada frase sale de un numero o una fuente del resultado: si no hay dato, la frase no se dice o se dice que falta. No se
// habla de plagas, rendimiento, precios ni nitrogeno medido, porque el motor no los calcula. Las cifras de la evidencia
// llevan su fuente. Los dos idiomas usan las mismas cifras y las mismas fuentes: solo cambia la redaccion (TEXTOS).
import { fao56, SIAP_CICLOS } from './fuentes';
import { sumarDias } from './fechas';
import { IDIOMA_MOTOR_POR_DEFECTO, idiomaMotor, type IdiomaMotor } from './idioma';
import { dentroDeVentana, diasAnioAgricola } from './pilares';
import type { ResultadoMotor } from './motor';
import type { ResultadoRanking } from './ranking';
import {
  ESCENARIOS,
  type CalendarioLocal,
  type CatalogoCultivos,
  type CultivoNoRecomendado,
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
  /** Idioma de la tarjeta; por defecto 'es'. */
  idioma?: IdiomaMotor;
}

type Ventana = { desdeMes: number; hastaMes: number; desdeDia?: number; hastaDia?: number };
type Deficit = { proporcionDemandaNoCubierta: number | null; diasDeficit: number | null; deficitTotalMm?: number | null | undefined };

const r2 = (x: number) => Math.round(x * 100) / 100;
const r1pct = (x: number) => Math.round(x * 1000) / 10;
const mm = (x: number) => `${Math.round(x)} mm`;
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "a, b y c" / "a, b and c". */
/** "1 day" / "2 days" (solo en ingles; el espanol queda como estaba). */
const dias = (n: number | null) => `${n} day${n === 1 ? '' : 's'}`;
const lista = (xs: string[], y: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${y} ${xs[xs.length - 1]}` : (xs[0] ?? ''));

/** Todo lo que la tarjeta dice en palabras. Las cifras entran ya calculadas; aqui no se calcula nada. */
interface Textos {
  meses: string[];
  escenario: Record<Escenario, string>;
  pilar: Record<string, string>;
  /** Clase textural USDA y grupo del selector (contrato suelo). */
  textura: Record<string, string>;
  y: string;
  avisoExperto: string;
  pct(x: number): string;
  fecha(f: string): string;
  ventana(v: Ventana): string;
  mesAnio(mes: string, anio: string): string;
  faltaDeAgua(h: Deficit): string;
  ventanasDe(quienes: string[], una: boolean): string;
  evLluvia(esc: string, anio: number, lluvia: string): string;
  evDeficit(esc: string, anio: number, falta: string): string;
  evExceso(esc: string, anio: number, exceso: string, dias: number | null, fraccion: string): string;
  evSuelo(esc: string, anio: number, dias: number, total: number): string;
  evSiembra(ciclo: number, cultivo: string, fecha: string, dentro: boolean, ventana: string): string;
  sinMotor(id: string): string;
  sinMotorHueco: string;
  noEvaluable(motivo: string | null): string;
  noEvaluableHueco: string;
  exploratorio(motivo: string | null): string;
  /** Motivo de un cultivo que la fuente local no registra; null = usar el del motor (que ya viene en espanol). */
  noRecomendado(n: CultivoNoRecomendado, cultivo: string, institucion: string | null, lugar: string | null, temporada: string | null): string | null;
  lugarPrimero(de: number): string;
  lugarN(posicion: number, de: number): string;
  combina(pilares: string[]): string;
  mejorEnTodos(anios: string): string;
  arrepentimiento(puntos: number): string;
  peorAnioPuntaje(esc: string, anio: number | null, valor: number): string;
  peorAnioAgua(lugar: string, esc: string, anio: number | null, falta: string): string;
  cultivos(nombres: string[]): string;
  escAnio(esc: string, anio: number | null): string;
  benAgua(anio: number, pct: string): string;
  benSuelo(propios: number, min: number, max: number): string;
  benLluvia(pct: string): string;
  benFechas(ventanas: string): string;
  benLeguminosa(especies: number, leguminosas: string): string;
  benEspecies(especies: number): string;
  huecoFechas(sinVentana: string[]): string;
  huecoCalor: string;
  huecoPilar(pilar: string): string;
  huecoErosion: string;
  huecoSuelo(clase: string, tawMmPorM: number | null, mapaGlobal: boolean): string;
  huecoResolucion(ns: number, eo: number): string;
  huecoGwetroot: string;
  huecoSupuesta: string;
  huecoChile(cultivo: string, cita: string): string;
  huecoNoConsidera: string;
  riesgoNoRecomendado(cultivo: string, motivo: string): string;
  riesgoPeorAnio(esc: string, anio: number | null, falta: string | null, exceso: string | null): string;
  riesgoMesExceso(anio: number, mes: string, exceso: string): string;
  riesgoMesDeficit(mes: string, deficit: string): string;
  riesgoFueraDeVentana(cultivo: string, ciclo: number, fecha: string, ventana: string, texto: string): string;
}

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ES: Textos = {
  meses: MESES_ES,
  escenario: { seco: 'año seco', habitual: 'año normal', lluvioso: 'año lluvioso' },
  pilar: {
    deficitHidrico: 'falta de agua',
    excesoHidrico: 'exceso de agua',
    compatibilidadCiclo: 'fechas de siembra',
    proteccionSuelo: 'días sin cultivo',
    riesgoCalor: 'calor',
    aporteIndirecto: 'aporte indirecto al suelo',
  },
  textura: {},
  y: 'y',
  avisoExperto: 'Es una comparación con años reales del pasado, no una predicción. Antes de decidir, revísela con un técnico o agrónomo de la zona.',
  pct: (x) => `${r1pct(x)} %`,
  fecha: (f) => `${Number(f.slice(8, 10))} de ${MESES_ES[Number(f.slice(5, 7)) - 1]}`,
  ventana: (v) => `del ${v.desdeDia ?? 1} de ${MESES_ES[v.desdeMes - 1]} al ${v.hastaDia ?? 'fin'} de ${MESES_ES[v.hastaMes - 1]}`.replace(' al fin de', ' a fines de'),
  mesAnio: (mes, anio) => `${mes} de ${anio}`,
  faltaDeAgua(h) {
    const p = h.proporcionDemandaNoCubierta ?? 0;
    if (!h.diasDeficit) return 'al cultivo no le faltó agua';
    if (p < 0.0005) return `al cultivo casi no le faltó agua (${h.diasDeficit} días, menos de 1 mm)`;
    return `al cultivo le faltó el ${this.pct(p)} del agua que necesitaba (${h.diasDeficit} días con falta de agua, ${mm(h.deficitTotalMm ?? 0)})`;
  },
  ventanasDe(quienes, una) {
    if (quienes.length === 0) return una ? 'la ventana del calendario local' : 'las ventanas del calendario local';
    const l = quienes.join(' y ');
    const recomendada = quienes.every((q) => q === 'INIFAP');
    if (una) return recomendada ? `la ventana recomendada por ${l}` : `la ventana de siembra de ${l}`;
    return recomendada ? `las ventanas recomendadas por ${l}` : `las ventanas de siembra de ${l}`;
  },
  evLluvia: (esc, anio, lluvia) => `${esc} (${anio}): llovieron ${lluvia} en las temporadas de siembra PV y OI.`,
  evDeficit: (esc, anio, falta) => `${esc} (${anio}): ${falta}.`,
  evExceso: (esc, anio, exceso, dias, fraccion) => `${esc} (${anio}): ${exceso} de lluvia se fueron por debajo de la raíz en ${dias} días (el ${fraccion} de lo que llovió durante los ciclos).`,
  evSuelo: (esc, anio, dias, total) => `${esc} (${anio}): el terreno queda sin cultivo ${dias} de ${total} días del año agrícola.`,
  evSiembra: (ciclo, cultivo, fecha, dentro, ventana) => `Ciclo ${ciclo}, ${cultivo} sembrado el ${fecha}: ${dentro ? 'dentro' : 'fuera'} de la ventana recomendada (${ventana}).`,
  sinMotor: (id) => `No hay resultado del motor para la rotación ${id}.`,
  sinMotorHueco: 'Falta simular esta rotación.',
  noEvaluable: (motivo) => `No se puede evaluar esta rotación: ${motivo ?? 'faltan datos'}`,
  noEvaluableHueco: 'Faltan datos o parámetros con fuente para simularla (ver el motivo).',
  exploratorio: (motivo) => `Se muestra para explorar, pero no se recomienda${motivo ? `: ${motivo}` : '.'}`,
  noRecomendado: () => null,
  lugarPrimero: (de) => `Es la opción más robusta de las ${de} rotaciones comparadas`,
  lugarN: (posicion, de) => `Queda en el lugar ${posicion} de ${de} por robustez`,
  combina: (p) => (p.length > 0 ? ` (el puntaje combina ${p.slice(0, -1).join(', ')}${p.length > 1 ? ' y ' : ''}${p[p.length - 1]}; 1 es lo mejor)` : ''),
  mejorEnTodos: (anios) => `En los tres años de referencia (${anios}) tiene el mejor puntaje de todas`,
  arrepentimiento: (puntos) => `En el año en que más se aleja de la mejor opción queda ${puntos} puntos por debajo de ella`,
  peorAnioPuntaje: (esc, anio, valor) => `Su peor año es el ${esc} (${anio}), con ${valor} de 1.`,
  peorAnioAgua: (lugar, esc, anio, falta) => `${lugar}. En su peor año, el ${esc} (${anio}), ${falta}.`,
  cultivos: (n) => ` Cultivos: ${lista(n, 'y')}.`,
  escAnio: (esc, anio) => `${esc} ${anio}`,
  benAgua: (anio, pct) => `Agua: aun en el año seco (${anio}) el suelo le dio al cultivo el ${pct} del agua que necesitaba.`,
  benSuelo: (p, min, max) => `Suelo: es la que menos tiempo deja el terreno sin cultivo (${p} días en el año normal, contra ${min} a ${max} días de las demás).`,
  benLluvia: (pct) => `Agua de lluvia: en el año lluvioso es la que menos lluvia pierde por debajo de la raíz (${pct}).`,
  benFechas: (v) => `Fechas: todas las siembras caen en ${v} para la zona.`,
  benLeguminosa: (n, leg) => `Rotación: combina ${n} especies e incluye una leguminosa (${leg}). Este simulador no mide su aporte al suelo.`,
  benEspecies: (n) => `Rotación: combina ${n} especies.`,
  huecoFechas: (sv) =>
    sv.length > 0
      ? `Las fechas de siembra no entran a la comparación: ${sv.join(', ')} ${sv.length > 1 ? 'tienen' : 'tiene'} una siembra sin ventana con fuente en el calendario local.`
      : 'Las fechas de siembra no entran a la comparación: falta el calendario local.',
  huecoCalor: 'No se evalúa el calor: el catálogo no tiene un umbral de temperatura con fuente para estos cultivos.',
  huecoPilar: (p) => `La ${p} no entra a la comparación: no todas las rotaciones la tienen calculada.`,
  huecoErosion:
    'No se calcula el riesgo de erosión: haría falta la intensidad de la lluvia en lapsos de 30 minutos y datos de cobertura y pendiente con fuente; solo se cuentan los días sin cultivo.',
  huecoSuelo: (clase, taw, global) =>
    `El suelo (${clase}${taw !== null ? `, ${Math.round(taw)} mm de agua útil por metro` : ''}) es una estimación (${global ? 'mapa global' : 'elegido en el selector'}), no una medición de su parcela.`,
  huecoResolucion: (ns, eo) => `El clima de NASA POWER es regional (cuadros de 0.5 por 0.625 grados, unos ${ns} por ${eo} km aquí): es el mismo para toda la parcela.`,
  huecoGwetroot: 'La humedad del suelo al sembrar viene de un modelo regional (NASA POWER), no de una medición en el campo.',
  huecoSupuesta: 'Se supone el suelo húmedo al sembrar: en un año seco la falta de agua puede ser mayor.',
  huecoChile: (_c, cita) => `Los datos del chile vienen del pimiento dulce (${cita}): FAO-56 no tiene una fila propia para el chile.`,
  huecoNoConsidera: 'No se consideran precios, costos, rendimiento ni plagas.',
  riesgoNoRecomendado: (c, motivo) => `${c}: ${motivo}`,
  riesgoPeorAnio: (esc, anio, falta, exceso) =>
    `Su peor año es el ${esc} (${anio}): ` + [falta ? `faltó el ${falta} del agua` : null, exceso ? `${exceso} de lluvia se fueron por debajo de la raíz` : null].filter(Boolean).join(' y ') + '.',
  riesgoMesExceso: (anio, mes, ex) => `Exceso de agua: en el año lluvioso (${anio}) el mes más difícil fue ${mes}, con ${ex} que el suelo no pudo guardar.`,
  riesgoMesDeficit: (mes, d) => `Falta de agua: en el año seco el mes más difícil fue ${mes} (${d} que el cultivo pidió y no tuvo).`,
  riesgoFueraDeVentana: (c, ciclo, fecha, v, texto) => `El ${c} del ciclo ${ciclo} se siembra el ${fecha}, fuera de ${v} (${texto}).`,
};

const EN: Textos = {
  meses: MESES_EN,
  escenario: { seco: 'dry year', habitual: 'normal year', lluvioso: 'wet year' },
  pilar: {
    deficitHidrico: 'water shortage',
    excesoHidrico: 'excess water',
    compatibilidadCiclo: 'planting dates',
    proteccionSuelo: 'days without a crop',
    riesgoCalor: 'heat',
    aporteIndirecto: 'indirect contribution to the soil',
  },
  // Nombres USDA de las clases texturales (USDA Soil Survey Manual, cap. 3) y grupos del selector.
  textura: {
    arena: 'sand',
    arena_franca: 'loamy sand',
    franco_arenoso: 'sandy loam',
    franco: 'loam',
    franco_limoso: 'silt loam',
    limo: 'silt',
    franco_arcillo_arenoso: 'sandy clay loam',
    franco_arcilloso: 'clay loam',
    franco_arcillo_limoso: 'silty clay loam',
    arcillo_arenoso: 'sandy clay',
    arcillo_limoso: 'silty clay',
    arcilla: 'clay',
    arenoso: 'sandy',
    arcilloso: 'clayey',
  },
  y: 'and',
  avisoExperto: 'This is a comparison with real past years, not a prediction. Before deciding, review it with a local technician or agronomist.',
  pct: (x) => `${r1pct(x)}%`,
  fecha: (f) => `${MESES_EN[Number(f.slice(5, 7)) - 1]} ${Number(f.slice(8, 10))}`,
  ventana: (v) =>
    v.hastaDia === undefined
      ? `from ${MESES_EN[v.desdeMes - 1]} ${v.desdeDia ?? 1} to late ${MESES_EN[v.hastaMes - 1]}`
      : `from ${MESES_EN[v.desdeMes - 1]} ${v.desdeDia ?? 1} to ${MESES_EN[v.hastaMes - 1]} ${v.hastaDia}`,
  mesAnio: (mes, anio) => `${mes} ${anio}`,
  faltaDeAgua(h) {
    const p = h.proporcionDemandaNoCubierta ?? 0;
    if (!h.diasDeficit) return 'the crop never ran short of water';
    if (p < 0.0005) return `the crop was barely short of water (${dias(h.diasDeficit)}, less than 1 mm)`;
    return `the crop lacked ${this.pct(p)} of the water it needed (${dias(h.diasDeficit)} short of water, ${mm(h.deficitTotalMm ?? 0)})`;
  },
  ventanasDe(quienes, una) {
    if (quienes.length === 0) return una ? 'the local calendar window' : 'the local calendar windows';
    const l = quienes.join(' and ');
    const recomendada = quienes.every((q) => q === 'INIFAP');
    if (una) return recomendada ? `the window recommended by ${l}` : `the ${l} planting window`;
    return recomendada ? `the windows recommended by ${l}` : `the ${l} planting windows`;
  },
  evLluvia: (esc, anio, lluvia) => `${esc} (${anio}): ${lluvia} of rain fell in the PV and OI planting seasons.`,
  evDeficit: (esc, anio, falta) => `${esc} (${anio}): ${falta}.`,
  evExceso: (esc, anio, exceso, n, fraccion) => `${esc} (${anio}): ${exceso} of rain drained below the roots on ${dias(n)} (${fraccion} of the rain that fell during the cycles).`,
  evSuelo: (esc, anio, dias, total) => `${esc} (${anio}): the field is left without a crop ${dias} of the ${total} days of the agricultural year.`,
  evSiembra: (ciclo, cultivo, fecha, dentro, ventana) => `Cycle ${ciclo}, ${cultivo} planted on ${fecha}: ${dentro ? 'inside' : 'outside'} the recommended window (${ventana}).`,
  sinMotor: (id) => `There is no engine result for rotation ${id}.`,
  sinMotorHueco: 'This rotation still has to be simulated.',
  // Los motivos tecnicos del motor (NO_EVALUABLE) se escriben en espanol: se citan tal cual, marcados, sin traducirlos a ojo.
  noEvaluable: (motivo) => (motivo ? `This rotation cannot be evaluated. Engine reason (in Spanish): ${motivo}` : 'This rotation cannot be evaluated: data are missing.'),
  noEvaluableHueco: 'Data or sourced parameters needed to simulate it are missing (see the reason).',
  exploratorio: (motivo) => `Shown for exploration, but not recommended${motivo ? `: ${motivo}` : '.'}`,
  noRecomendado: (_n, cultivo, inst, lugar, temporada) =>
    `${inst ?? 'The local source'} does not record rainfed ${cultivo} in ${lugar ?? 'this place'}${temporada ? ` in the ${temporada} season` : ''}.`,
  lugarPrimero: (de) => `It is the most robust option of the ${de} rotations compared`,
  lugarN: (posicion, de) => `It ranks ${posicion} of ${de} by robustness`,
  combina: (p) => (p.length > 0 ? ` (the score combines ${lista(p, 'and')}; 1 is best)` : ''),
  mejorEnTodos: (anios) => `In all three reference years (${anios}) it has the best score of all`,
  arrepentimiento: (puntos) => `In the year it falls furthest behind the best option, it is ${puntos} points below it`,
  peorAnioPuntaje: (esc, anio, valor) => `Its worst year is the ${esc} (${anio}), with ${valor} out of 1.`,
  peorAnioAgua: (lugar, esc, anio, falta) => `${lugar}. In its worst year, the ${esc} (${anio}), ${falta}.`,
  cultivos: (n) => ` Crops: ${lista(n, 'and')}.`,
  escAnio: (esc, anio) => `${esc} ${anio}`,
  benAgua: (anio, pct) => `Water: even in the dry year (${anio}) the soil gave the crop ${pct} of the water it needed.`,
  benSuelo: (p, min, max) => `Soil: it leaves the field without a crop for the shortest time (${p} days in the normal year, against ${min} to ${max} days for the others).`,
  benLluvia: (pct) => `Rainwater: in the wet year it loses the least rain below the roots (${pct}).`,
  benFechas: (v) => `Dates: every planting falls within ${v} for the area.`,
  benLeguminosa: (n, leg) => `Rotation: it combines ${n} species and includes a legume (${leg}). This simulator does not measure its contribution to the soil.`,
  benEspecies: (n) => `Rotation: it combines ${n} species.`,
  huecoFechas: (sv) =>
    sv.length > 0
      ? `Planting dates are left out of the comparison: ${sv.join(', ')} ${sv.length > 1 ? 'have' : 'has'} a planting without a sourced window in the local calendar.`
      : 'Planting dates are left out of the comparison: the local calendar is missing.',
  huecoCalor: 'Heat is not evaluated: the catalog has no sourced temperature threshold for these crops.',
  huecoPilar: (p) => `${mayus(p)} is left out of the comparison: not every rotation has it calculated.`,
  huecoErosion:
    'Erosion risk is not calculated: it would need rainfall intensity over 30-minute intervals and sourced cover and slope data; only the days without a crop are counted.',
  huecoSuelo: (clase, taw, global) =>
    `The soil (${clase}${taw !== null ? `, ${Math.round(taw)} mm of available water per meter` : ''}) is an estimate (${global ? 'global map' : 'chosen in the selector'}), not a measurement of your field.`,
  huecoResolucion: (ns, eo) => `NASA POWER climate is regional (cells of 0.5 by 0.625 degrees, about ${ns} by ${eo} km here): it is the same for the whole field.`,
  huecoGwetroot: 'Soil moisture at planting comes from a regional model (NASA POWER), not from a field measurement.',
  huecoSupuesta: 'The soil is assumed moist at planting: in a dry year the water shortage may be larger.',
  huecoChile: (c, cita) => `The ${c} data come from sweet pepper (${cita}): FAO-56 has no row of its own for this crop.`,
  huecoNoConsidera: 'Prices, costs, yield and pests are not considered.',
  riesgoNoRecomendado: (c, motivo) => `${mayus(c)}: ${motivo}`,
  riesgoPeorAnio: (esc, anio, falta, exceso) =>
    `Its worst year is the ${esc} (${anio}): ` + [falta ? `${falta} of the water was missing` : null, exceso ? `${exceso} of rain drained below the roots` : null].filter(Boolean).join(' and ') + '.',
  riesgoMesExceso: (anio, mes, ex) => `Excess water: in the wet year (${anio}) the hardest month was ${mes}, with ${ex} the soil could not hold.`,
  riesgoMesDeficit: (mes, d) => `Water shortage: in the dry year the hardest month was ${mes} (${d} the crop needed and did not get).`,
  riesgoFueraDeVentana: (c, ciclo, fecha, v, texto) => `The ${c} of cycle ${ciclo} is planted on ${fecha}, outside ${v} (${texto}).`,
};

const TEXTOS: Record<IdiomaMotor, Textos> = { es: ES, en: EN };

/** Aviso fijo de cada tarjeta, por idioma. */
export const AVISOS_EXPERTO: Record<IdiomaMotor, string> = { es: ES.avisoExperto, en: EN.avisoExperto };
export const AVISO_EXPERTO = AVISOS_EXPERTO.es;
/** Nombre del escenario en el texto ('año seco' / 'dry year'), por si la interfaz quiere el mismo que la tarjeta. */
export function nombreEscenario(e: Escenario, idioma: IdiomaMotor = IDIOMA_MOTOR_POR_DEFECTO): string {
  return TEXTOS[idiomaMotor(idioma)].escenario[e];
}

/** Nombre para el texto en espanol (con acentos); si no esta aqui, el nombre comun del catalogo. */
const NOMBRE_CULTIVO_ES: Record<string, string> = { maiz: 'maíz', frijol: 'frijol', calabaza: 'calabaza', chile: 'chile' };

/** Nombre del cultivo en el texto: en ingles, nombreComunEn del catalogo (contratos 0.16.0); si falta, el de espanol. */
function nombreCultivo(ctx: ContextoTarjetas, id: string): string {
  const c = ctx.catalogo.cultivos.find((x) => x.id === id);
  if (idiomaMotor(ctx.idioma) === 'en' && c?.nombreComunEn) return c.nombreComunEn.toLowerCase();
  return NOMBRE_CULTIVO_ES[id] ?? (c?.nombreComun ?? id).toLowerCase();
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
const mesTexto = (T: Textos, m: string) => T.mesAnio(T.meses[Number(m.slice(5, 7)) - 1] as string, m.slice(0, 4));

function evidenciaEscenarios(T: Textos, r: ResultadoRotacion, motor: ResultadoMotor): Evidencia[] {
  const ev: Evidencia[] = [];
  for (const e of ESCENARIOS) {
    const m = r.porEscenario[e];
    const clima = motor.simulaciones[e].clima;
    if (!clima || m.anioReal === null) continue;
    const esc = T.escenario[e];
    const lluvia = (clima as { seleccion?: { lluviaTemporadasMm?: { total: number | null } } }).seleccion?.lluviaTemporadasMm?.total;
    if (typeof lluvia === 'number') {
      ev.push({ texto: T.evLluvia(esc, m.anioReal, mm(lluvia)), valor: lluvia, unidad: 'mm', fuente: clima.fuente });
    }
    const h = m.pilares.deficitHidrico;
    if (h.proporcionDemandaNoCubierta !== null) {
      ev.push({ texto: T.evDeficit(esc, m.anioReal, T.faltaDeAgua(h)), valor: h.proporcionDemandaNoCubierta, unidad: 'fraccion de la demanda', fuente: clima.fuente });
    }
    const x = m.pilares.excesoHidrico;
    if (x && x.excesoTotalMm !== null) {
      ev.push({
        texto: T.evExceso(esc, m.anioReal, mm(x.excesoTotalMm), x.diasExceso, T.pct(x.fraccionLluviaPercolada ?? 0)),
        valor: x.excesoTotalMm,
        unidad: 'mm',
        fuente: fao56('Capitulo 8, ecuacion 88 (percolacion profunda)', 'https://www.fao.org/4/x0490e/x0490e0e.htm'),
      });
    }
    const p = m.pilares.proteccionSuelo;
    if (p && p.diasSueloDesnudo !== null) {
      ev.push({ texto: T.evSuelo(esc, m.anioReal, p.diasSueloDesnudo, diasAnioAgricola(m.anioReal)), valor: p.diasSueloDesnudo, unidad: 'dias', fuente: SIAP_CICLOS });
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

/** Institucion de una fuente: lo que va antes de la primera coma de fuente.nombre. */
const institucion = (f: Fuente | null | undefined) => f?.nombre.split(',')[0]?.trim() || null;

/** H-M11: quien da la ventana, desde su fuente (antes decia siempre INIFAP, aunque fuera SIAP o GGCMI fuera de Mexico).
 * Se nombra la institucion (lo que va antes de la primera coma de fuente.nombre); la cita completa esta en la evidencia. */
export function ventanasDe(fuentes: (Fuente | null)[], una = false, idioma: IdiomaMotor = IDIOMA_MOTOR_POR_DEFECTO): string {
  const quienes = [...new Set(fuentes.map(institucion).filter((q): q is string => !!q))];
  return TEXTOS[idiomaMotor(idioma)].ventanasDe(quienes, una);
}

function siembrasYVentanas(T: Textos, ctx: ContextoTarjetas, motor: ResultadoMotor): SiembraVentana[] {
  return motor.plan.ciclos.map((c) => {
    const e = ctx.calendario?.entradas.find((x) => x.cultivo === c.cultivo && x.temporada === c.temporada);
    if (!e || e.ventana.estado !== 'EVALUABLE') return { ciclo: c.ciclo, cultivo: c.cultivo, siembra: c.siembra, dentro: null, texto: null, fuente: null };
    return { ciclo: c.ciclo, cultivo: c.cultivo, siembra: c.siembra, dentro: dentroDeVentana(c.siembra, e.ventana), texto: T.ventana(e.ventana), fuente: e.ventana.fuente };
  });
}

/** Motivo de un cultivo no recomendado en el idioma de la tarjeta (en espanol, el del motor tal cual). */
function motivoNoRecomendado(T: Textos, ctx: ContextoTarjetas, motor: ResultadoMotor, n: CultivoNoRecomendado): string {
  const temporada = motor.plan.ciclos.find((c) => c.ciclo === n.ciclos[0])?.temporada ?? null;
  const u = ctx.calendario?.id === n.calendarioId ? ctx.calendario?.ubicacion : undefined;
  return T.noRecomendado(n, nombreCultivo(ctx, n.cultivo), institucion(n.fuente), u?.municipio ?? null, temporada) ?? n.motivo;
}

/** Tarjeta (campo explicacion) de una rotacion ya ordenada, en ctx.idioma (por defecto espanol). */
export function tarjetaRotacion(ctx: ContextoTarjetas, r: ResultadoRotacion): ResultadoRotacion['explicacion'] {
  const T = TEXTOS[idiomaMotor(ctx.idioma)];
  const motor = ctx.motores[r.rotacionId];
  const base = { evidencia: [] as Evidencia[], beneficios: [] as string[], huecos: [] as string[], riesgos: [] as string[], avisoExperto: T.avisoExperto, redactadaPor: 'plantilla' as const };
  if (!motor) return { ...base, porQue: T.sinMotor(r.rotacionId), huecos: [T.sinMotorHueco] };
  const cultivos = [...new Set(motor.plan.ciclos.map((c) => nombreCultivo(ctx, c.cultivo)))];
  const evaluadas = ctx.ranking.rotaciones.filter((x) => x.peorCaso !== null);
  const siembras = siembrasYVentanas(T, ctx, motor);

  // Por que
  let porQue: string;
  if (r.estado === 'NO_EVALUABLE' || r.estado === 'ERROR_DATOS') {
    const motivo = r.porEscenario.seco.pilares.deficitHidrico.motivo ?? r.advertencias.find((a) => a.severidad === 'critico')?.mensaje ?? null;
    // Sin resultado no hay evidencia, beneficios ni riesgos que contar: solo el motivo.
    return { ...base, porQue: T.noEvaluable(motivo), huecos: [T.noEvaluableHueco] };
  } else if (!r.ranking) {
    const nr = r.cultivosNoRecomendados?.[0];
    porQue = T.exploratorio(nr ? motivoNoRecomendado(T, ctx, motor, nr) : null);
  } else {
    const pc = r.peorCaso!;
    const anio = r.porEscenario[pc.escenario].anioReal;
    const lugar = r.ranking.posicion === 1 ? T.lugarPrimero(r.ranking.de) : T.lugarN(r.ranking.posicion, r.ranking.de);
    if (pc.criterio === 'B_minimax_arrepentimiento') {
      const cero = (r.arrepentimiento ?? 1) === 0;
      const combina = T.combina(Object.keys(r.ponderacion?.pesos ?? {}).map((k) => T.pilar[k] ?? k));
      porQue =
        `${lugar}. ` +
        (cero
          ? `${T.mejorEnTodos(ESCENARIOS.map((e) => T.escAnio(T.escenario[e], r.porEscenario[e].anioReal)).join(', '))}${combina}. `
          : `${T.arrepentimiento(r2(r.arrepentimiento ?? 0))}${combina}. `) +
        T.peorAnioPuntaje(T.escenario[pc.escenario], anio, r2(pc.valor));
    } else {
      porQue = T.peorAnioAgua(lugar, T.escenario[pc.escenario], anio, T.faltaDeAgua(r.porEscenario[pc.escenario].pilares.deficitHidrico));
    }
    porQue += T.cultivos(cultivos);
  }

  const evidencia = evidenciaEscenarios(T, r, motor);
  for (const s of siembras) {
    if (s.dentro === null || !s.fuente) continue;
    evidencia.push({ texto: T.evSiembra(s.ciclo, nombreCultivo(ctx, s.cultivo), T.fecha(s.siembra), s.dentro, s.texto as string), unidad: 'fecha', fuente: s.fuente });
  }

  // Beneficios: solo hechos medidos, comparados con las demas rotaciones evaluadas.
  const beneficios: string[] = [];
  if (r.ranking) {
    const seco = r.porEscenario.seco;
    const h = seco.pilares.deficitHidrico.proporcionDemandaNoCubierta;
    if (h !== null && seco.anioReal !== null) beneficios.push(T.benAgua(seco.anioReal, T.pct(1 - h)));
    const dias = (x: ResultadoRotacion) => x.porEscenario.habitual.pilares.proteccionSuelo?.diasSueloDesnudo ?? null;
    const propios = dias(r);
    const otros = evaluadas.filter((x) => x.rotacionId !== r.rotacionId).map(dias).filter((d): d is number => d !== null);
    if (propios !== null && otros.length > 0 && propios < Math.min(...otros)) beneficios.push(T.benSuelo(propios, Math.min(...otros), Math.max(...otros)));
    const ex = (x: ResultadoRotacion) => x.porEscenario.lluvioso.pilares.excesoHidrico?.fraccionLluviaPercolada ?? null;
    const fx = ex(r);
    const fo = evaluadas.filter((x) => x.rotacionId !== r.rotacionId).map(ex).filter((d): d is number => d !== null);
    if (fx !== null && fo.length > 0 && fx < Math.min(...fo)) beneficios.push(T.benLluvia(T.pct(fx)));
    if (siembras.length > 0 && siembras.every((s) => s.dentro === true)) beneficios.push(T.benFechas(T.ventanasDe([...new Set(siembras.map((s) => institucion(s.fuente)).filter((q): q is string => !!q))], false)));
  }
  const aporte = r.porEscenario.habitual.pilares.aporteIndirecto;
  if (aporte?.incluyeLeguminosa === true) {
    const leg = motor.plan.ciclos.map((c) => c.cultivo).filter((c) => ctx.catalogo.cultivos.find((x) => x.id === c)?.esLeguminosa);
    beneficios.push(T.benLeguminosa(aporte.especiesDistintas as number, [...new Set(leg.map((c) => nombreCultivo(ctx, c)))].join(', ')));
  } else if (aporte?.especiesDistintas && aporte.especiesDistintas > 1) {
    beneficios.push(T.benEspecies(aporte.especiesDistintas));
  }

  // Huecos de informacion
  const huecos: string[] = [];
  const excluidos = r.ponderacion?.pilaresExcluidos ?? [];
  if (excluidos.includes('compatibilidadCiclo')) {
    huecos.push(T.huecoFechas(evaluadas.filter((x) => x.porEscenario.habitual.pilares.compatibilidadCiclo?.estado !== 'EVALUABLE').map((x) => x.rotacionId)));
  }
  if (r.porEscenario.habitual.pilares.riesgoCalor?.estado === 'NO_EVALUABLE') huecos.push(T.huecoCalor);
  for (const p of ['deficitHidrico', 'excesoHidrico', 'proteccionSuelo'] as const) {
    if (excluidos.includes(p)) huecos.push(T.huecoPilar(T.pilar[p] as string));
  }
  const prot = r.porEscenario.habitual.pilares.proteccionSuelo;
  if (prot?.estado === 'EVALUABLE' && prot.indiceErosionRelativo === null) huecos.push(T.huecoErosion);
  if (ctx.suelo) {
    const taw = ctx.suelo.agua?.tawMmPorM;
    const clave = ctx.suelo.textura.clase ?? ctx.suelo.textura.grupo;
    const clase = T.textura[clave] ?? clave.replaceAll('_', ' ');
    huecos.push(T.huecoSuelo(clase, taw?.estado === 'EVALUABLE' ? taw.valor : null, ctx.suelo.origen === 'mapa_global'));
  }
  if (r.advertencias.some((a) => a.codigo === 'RESOLUCION_GRUESA')) {
    // Celda MERRA-2 de POWER: 0.5 grados de latitud por 0.625 de longitud (1 grado de latitud ~ 111 km).
    const lat = (motor.parcela.centroide[1] * Math.PI) / 180;
    huecos.push(T.huecoResolucion(Math.round(0.5 * 111.32), Math.round(0.625 * 111.32 * Math.cos(lat))));
  }
  if (r.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_GWETROOT')) huecos.push(T.huecoGwetroot);
  if (r.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_SUPUESTA')) huecos.push(T.huecoSupuesta);
  for (const c of new Set(motor.plan.ciclos.map((x) => x.cultivo))) {
    const cat = ctx.catalogo.cultivos.find((x) => x.id === c);
    const cita = cat?.kc.media.estado === 'EVALUABLE' ? cat.kc.media.fuente.cita ?? '' : '';
    if (c === 'chile' && /pepper/i.test(cita)) huecos.push(T.huecoChile(nombreCultivo(ctx, c), cita));
  }
  huecos.push(T.huecoNoConsidera);

  // Riesgos
  const riesgos: string[] = [];
  if (r.estado === 'EXPLORATORIO') for (const n of r.cultivosNoRecomendados ?? []) riesgos.push(T.riesgoNoRecomendado(nombreCultivo(ctx, n.cultivo), motivoNoRecomendado(T, ctx, motor, n)));
  if (r.peorCaso) {
    const e = r.peorCaso.escenario;
    const m = r.porEscenario[e];
    const h = m.pilares.deficitHidrico;
    const x = m.pilares.excesoHidrico;
    riesgos.push(
      T.riesgoPeorAnio(
        T.escenario[e],
        m.anioReal,
        h.proporcionDemandaNoCubierta !== null && h.proporcionDemandaNoCubierta >= 0.0005 ? T.pct(h.proporcionDemandaNoCubierta) : null,
        x?.excesoTotalMm ? mm(x.excesoTotalMm) : null,
      ),
    );
  }
  const masExceso = mesMayor(motor, 'lluvioso', 'percolacionMm');
  if (masExceso && r.porEscenario.lluvioso.anioReal !== null) riesgos.push(T.riesgoMesExceso(r.porEscenario.lluvioso.anioReal, mesTexto(T, masExceso.mes), mm(masExceso.mm)));
  const masDeficit = mesMayor(motor, 'seco', 'deficitMm');
  if (masDeficit && masDeficit.mm >= 0.5) riesgos.push(T.riesgoMesDeficit(mesTexto(T, masDeficit.mes), mm(masDeficit.mm)));
  for (const s of siembras.filter((x) => x.dentro === false)) {
    riesgos.push(T.riesgoFueraDeVentana(nombreCultivo(ctx, s.cultivo), s.ciclo, T.fecha(s.siembra), T.ventanasDe([institucion(s.fuente)].filter((q): q is string => !!q), true), s.texto as string));
  }

  return { ...base, porQue, evidencia, beneficios, huecos, riesgos };
}

/** Copia de las rotaciones del ranking con su tarjeta en `explicacion` (en ctx.idioma; por defecto espanol). */
export function conTarjetas(ctx: ContextoTarjetas): ResultadoRotacion[] {
  return ctx.ranking.rotaciones.map((r) => ({ ...r, explicacion: tarjetaRotacion(ctx, r) }));
}
