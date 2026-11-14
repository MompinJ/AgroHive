// A2.6 y A2.7: simulacion de una rotacion en los tres escenarios y salida en los contratos resultado-rotacion y
// resultado-celda. Funciones puras: mismos datos y plan => mismo resultado (doc 05, propiedades obligatorias).
//
// Clima por ciclo (A2.8, temporada_tipica): cada ciclo se simula en su temporada dentro del anio agricola t del
// escenario, con el mismo mes y dia de siembra del plan. PV: siembra en el anio t. OI: si la siembra es de
// octubre a diciembre, en t-1; de enero a marzo, en t (SIAP_CICLOS). Desde la siembra, el ciclo usa dias reales
// consecutivos de la serie; si no alcanzan, ese ciclo queda NO_EVALUABLE. Las fechas de resultado-celda son las
// fechas del plan; el clima que les corresponde es el del anio real del escenario (anioReal).
import { balanceCiclo, type BalanceCiclo } from './balance';
import { etapaVisual, parametrosCultivo, type ParametrosCultivo } from './cultivo';
import { serieEt0, type MetodoEt0 } from './et0';
import { peorEstado, juntarAdvertencias, sinNumeros } from './estados';
import { aDia, sumarDias } from './fechas';
import { SIAP_CICLOS } from './fuentes';
import { pilarCompatibilidad, pilarProteccion, type CicloParaPilar } from './pilares';
import { siembraEnEscenario } from './temporadas';

export { siembraEnEscenario };
import { FUENTE_DR_INICIAL_CERO, resolverTaw, retencionParaCondicionInicial, type ResultadoTaw } from './suelo';
import {
  ESCENARIOS,
  VERSION_CONTRATO,
  type Advertencia,
  type CalendarioLocal,
  type CatalogoCultivos,
  type ClimaEscenario,
  type Cultivo,
  type CultivoNoRecomendado,
  type Escenario,
  type EstadoEvaluacion,
  type Evidencia,
  type MetricasEscenario,
  type Parcela,
  type PilarAporteIndirecto,
  type PilarDeficitHidrico,
  type PilarCompatibilidadCiclo,
  type PilarExcesoHidrico,
  type PilarProteccionSuelo,
  type PilarRiesgoCalor,
  type PilaresMotor,
  type ProximaTemporadaAproximada,
  type SerieClima,
  type PlanSiembra,
  type RegistroCelda,
  type ResultadoCeldas,
  type ResultadoRotacion,
  type Suelo,
  type TablaSuelos,
  type Temporada,
} from './tipos';

export interface EntradasMotor {
  plan: PlanSiembra;
  parcela: Parcela;
  /** Suelo de la parcela (GET /api/suelo o selector manual). null => NO_EVALUABLE. */
  suelo: Suelo | null;
  tablaSuelos: TablaSuelos;
  catalogo: CatalogoCultivos;
  /** Calendario local que cita el plan (plan.calendarioLocal.calendarioId). */
  calendario?: CalendarioLocal | null;
  /** Salida de seleccionarEscenarios (A2.5). Un escenario ausente es NO_EVALUABLE. */
  escenarios: Partial<Record<Escenario, ClimaEscenario>>;
  /** Opcional (A2.13): capa de GET /api/proxima-temporada y la serie completa de GET /api/clima para los anios analogos. */
  proximaTemporada?: { capa: ProximaTemporadaAproximada | null; serie: SerieClima | null };
}

interface CicloPlan {
  ciclo: number;
  cultivo: string;
  siembra: string;
  temporada: Temporada;
}

export interface CicloSimulado {
  ciclo: number;
  cultivo: string;
  siembraPlan: string;
  siembraClima: string | null;
  estado: EstadoEvaluacion;
  motivo?: string;
  parametros: ParametrosCultivo | null;
  balance: BalanceCiclo | null;
  /** Deficit y exceso acumulados por dia (para resultado-celda). */
  deficitAcum: number[];
  excesoAcum: number[];
  /** tMax del dia, para el riesgo por calor; null si falta. */
  tMax: (number | null)[];
  condicionInicial: 'gwetroot' | 'capacidad_de_campo' | null;
}

/** Lo que la simulacion necesita del clima: un clima-escenario o un anio analogo (proxima temporada). */
export type ClimaParaSimular = Pick<ClimaEscenario, 'meta' | 'anioReal' | 'estado' | 'respaldo' | 'fuente' | 'diario'>;

export interface SimulacionEscenario {
  escenario: Escenario | 'proxima_temporada';
  anioReal: number | null;
  estado: EstadoEvaluacion;
  motivo?: string;
  clima: ClimaParaSimular | null;
  /** Clave `${ciclo}|${cultivo}`: las celdas con el mismo cultivo en el mismo ciclo comparten resultado. */
  ciclos: Map<string, CicloSimulado>;
  metodoEt0: Record<MetodoEt0, number> & { sinDato: number };
}

/**
 * Exceso de agua (percolacion, FAO-56 ec. 88) por escenario, promedio de la parcela. Pilar de exceso [DECIDIDO]
 * 14/11: fraccionLluviaPercolada = percolacion / lluvia de los dias de ciclo; el ranking usa 1 - fraccion (SUPUESTO).
 */
export interface ExcesoEscenario {
  mm: number;
  dias: number;
  /** 0 a 1. Si no llovio en los ciclos, 0 (no hubo exceso). */
  fraccionLluviaPercolada: number;
}

export interface ResultadoMotor {
  rotacion: ResultadoRotacion;
  /** null si el escenario no es evaluable. Lo mismo va en el pilar excesoHidrico de cada escenario (contratos 0.7.0). */
  exceso: Record<Escenario, ExcesoEscenario | null>;
  simulaciones: Record<Escenario, SimulacionEscenario>;
  /** Ciclos de cada celda (generales con los reemplazos de porCelda). */
  ciclosPorCelda: Map<string, CicloPlan[]>;
  parcela: Parcela;
  plan: PlanSiembra;
  noRecomendados: CultivoNoRecomendado[];
  esEjemplo: boolean;
}

const clave = (ciclo: number, cultivo: string) => `${ciclo}|${cultivo}`;
const r = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

function ciclosDeCeldas(plan: PlanSiembra, parcela: Parcela): Map<string, CicloPlan[]> {
  const generales: CicloPlan[] = [...plan.ciclos]
    .sort((a, b) => a.ciclo - b.ciclo)
    .map((c) => ({ ciclo: c.ciclo, cultivo: c.cultivo, siembra: c.siembra, temporada: c.temporada }));
  const salida = new Map<string, CicloPlan[]>();
  for (const celda of parcela.celdas) {
    const reemplazos = plan.porCelda?.[celda.id] ?? [];
    salida.set(
      celda.id,
      generales.map((g) => {
        const rep = reemplazos.find((x) => x.ciclo === g.ciclo);
        return rep ? { ...g, cultivo: rep.cultivo } : g;
      }),
    );
  }
  return salida;
}

/** Lo que el schema no comprueba (contratos/README): ciclos cronologicos, celdas y cultivos existentes. */
function validarPlan(plan: PlanSiembra, parcela: Parcela, porCelda: Map<string, CicloPlan[]>, parametros: Map<string, ParametrosCultivo | null>): string[] {
  const errores: string[] = [];
  const numeros = plan.ciclos.map((c) => c.ciclo);
  if (new Set(numeros).size !== numeros.length) errores.push('Hay numeros de ciclo repetidos en el plan.');
  const ids = new Set(parcela.celdas.map((c) => c.id));
  for (const [celdaId, reemplazos] of Object.entries(plan.porCelda ?? {})) {
    if (!ids.has(celdaId)) errores.push(`porCelda cita la celda ${celdaId}, que no esta en la parcela.`);
    for (const rep of reemplazos) {
      if (!numeros.includes(rep.ciclo)) errores.push(`porCelda (${celdaId}) cita el ciclo ${rep.ciclo}, que no esta en el plan.`);
    }
  }
  const vistos = new Set<string>();
  for (const [celdaId, ciclos] of porCelda) {
    for (let k = 1; k < ciclos.length; k++) {
      const a = ciclos[k - 1] as CicloPlan;
      const b = ciclos[k] as CicloPlan;
      const pa = parametros.get(a.cultivo);
      let error: string | null = null;
      if (aDia(b.siembra) <= aDia(a.siembra)) {
        error = `El ciclo ${b.ciclo} (${b.siembra}) no es posterior al ciclo ${a.ciclo} (${a.siembra}).`;
      } else if (pa && aDia(a.siembra) + pa.totalDias > aDia(b.siembra)) {
        error = `El ciclo ${a.ciclo} (${a.cultivo}, ${pa.totalDias} dias desde ${a.siembra}) se traslapa con la siembra del ciclo ${b.ciclo} (${b.siembra}).`;
      }
      if (error && !vistos.has(error)) {
        vistos.add(error);
        errores.push(plan.porCelda?.[celdaId] ? `${error} (celda ${celdaId})` : error);
      }
    }
  }
  return errores;
}

function cultivosNoRecomendados(plan: PlanSiembra, calendario: CalendarioLocal | null | undefined, ciclos: Map<string, CicloPlan[]>): CultivoNoRecomendado[] {
  if (!calendario || !('calendarioId' in plan.calendarioLocal) || plan.calendarioLocal.calendarioId !== calendario.id) return [];
  const porCultivo = new Map<string, { ciclos: Set<number>; entrada: CalendarioLocal['entradas'][number] }>();
  for (const lista of ciclos.values()) {
    for (const c of lista) {
      const entrada = calendario.entradas.find((e) => e.cultivo === c.cultivo && e.temporada === c.temporada);
      if (entrada && entrada.presencia.estado === 'no_registrado') {
        const prev = porCultivo.get(c.cultivo) ?? { ciclos: new Set<number>(), entrada };
        prev.ciclos.add(c.ciclo);
        porCultivo.set(c.cultivo, prev);
      }
    }
  }
  return [...porCultivo.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([cultivo, { ciclos: cs, entrada }]) => {
      const lista = [...cs].sort((a, b) => a - b) as [number, ...number[]];
      return {
        cultivo,
        ciclos: lista,
        motivo:
          entrada.presencia.nota ??
          `La fuente local no registra ${cultivo} en ${calendario.ubicacion.municipio} (${entrada.temporada}): se muestra, pero no se recomienda.`,
        fuente: entrada.presencia.fuente,
        calendarioId: calendario.id,
      };
    });
}

function simularEscenario(
  escenario: Escenario | 'proxima_temporada',
  clima: ClimaParaSimular | undefined,
  e: EntradasMotor,
  taw: ResultadoTaw,
  clavesCiclo: Map<string, CicloPlan>,
  parametros: Map<string, ParametrosCultivo | null>,
  motivosCultivo: Map<string, string>,
  erroresPlan: string[],
): SimulacionEscenario {
  const vacio = { fuente: 0, penman_monteith_fao56: 0, hargreaves_fao56: 0, sinDato: 0 };
  const base = { escenario, ciclos: new Map<string, CicloSimulado>(), metodoEt0: vacio };
  if (!clima) {
    return { ...base, anioReal: null, estado: 'NO_EVALUABLE', motivo: `Falta la serie del escenario ${escenario} (A2.5).`, clima: null };
  }
  const anio = clima.anioReal;
  if (sinNumeros(clima.estado)) {
    return { ...base, anioReal: anio, estado: clima.estado, motivo: `La serie del escenario ${escenario} esta en ${clima.estado}.`, clima };
  }
  if (erroresPlan.length > 0) {
    return { ...base, anioReal: anio, estado: 'NO_EVALUABLE', motivo: `Plan invalido: ${erroresPlan.join(' ')}`, clima };
  }
  if (!taw.ok) return { ...base, anioReal: anio, estado: 'NO_EVALUABLE', motivo: taw.motivo, clima };

  const elevaciones = e.parcela.celdas.map((c) => c.elevacionM).filter((z): z is number => z !== null);
  const z = elevaciones.length > 0 ? elevaciones.reduce((a, b) => a + b, 0) / elevaciones.length : null;
  const et0 = serieEt0(clima.diario, e.parcela.centroide[1], z);
  const indice = new Map<string, number>();
  clima.diario.forEach((d, i) => indice.set(d.fecha, i));
  const retencion = taw.desdeSuelo ? retencionParaCondicionInicial(e.suelo) : null;

  const ciclos = new Map<string, CicloSimulado>();
  let estado: EstadoEvaluacion = clima.estado;
  const motivos: string[] = [];
  for (const [k, c] of clavesCiclo) {
    const p = parametros.get(c.cultivo) ?? null;
    const sim: CicloSimulado = {
      ciclo: c.ciclo,
      cultivo: c.cultivo,
      siembraPlan: c.siembra,
      siembraClima: null,
      estado: 'NO_EVALUABLE',
      parametros: p,
      balance: null,
      deficitAcum: [],
      excesoAcum: [],
      tMax: [],
      condicionInicial: null,
    };
    ciclos.set(k, sim);
    if (!p) {
      sim.motivo = motivosCultivo.get(c.cultivo) ?? `Cultivo ${c.cultivo} sin parametros.`;
      motivos.push(`Ciclo ${c.ciclo}: ${sim.motivo}`);
      continue;
    }
    const s = siembraEnEscenario(c.siembra, c.temporada, anio);
    sim.siembraClima = s.fecha;
    const i0 = indice.get(s.fecha);
    const lluvia: number[] = [];
    const et: number[] = [];
    let problema: string | null = i0 === undefined ? `la serie del escenario no incluye la siembra (${s.fecha})` : null;
    for (let j = 0; j < p.totalDias && !problema; j++) {
      const i = (i0 as number) + j;
      const dia = clima.diario[i];
      const fecha = sumarDias(s.fecha, j);
      if (!dia || dia.fecha !== fecha) problema = `la serie termina antes de terminar el ciclo (falta ${fecha})`;
      else if (dia.lluviaMm === null) problema = `falta la lluvia del ${fecha} (no se rellena)`;
      else if (et0.et0Mm[i] === null || et0.et0Mm[i] === undefined) problema = `no hay temperaturas para ET0 el ${fecha}`;
      else {
        lluvia.push(dia.lluviaMm);
        et.push(et0.et0Mm[i] as number);
        sim.tMax.push(dia.tMaxC);
      }
    }
    if (problema) {
      sim.motivo = `Ciclo ${c.ciclo} (${c.cultivo}, siembra ${s.fecha} en el clima de ${anio}): ${problema}.`;
      motivos.push(sim.motivo);
      continue;
    }
    let drInicial = 0;
    sim.condicionInicial = 'capacidad_de_campo';
    const gwet = clima.diario[i0 as number]?.humedadRaizFraccionSat;
    if (retencion?.ok && typeof gwet === 'number') {
      const theta = gwet * retencion.thetaSat;
      drInicial = 1000 * (retencion.thetaFc - theta) * p.zrM; // FAO-56 ec. 87
      sim.condicionInicial = 'gwetroot';
    }
    const b = balanceCiclo({ cultivo: p, tawMmPorM: taw.tawMmPorM, lluviaMm: lluvia, et0Mm: et, drInicialMm: drInicial });
    sim.balance = b;
    let da = 0;
    let ea = 0;
    for (const d of b.dias) {
      da += d.deficitMm;
      ea += d.percolacionMm;
      sim.deficitAcum.push(da);
      sim.excesoAcum.push(ea);
    }
    sim.estado = clima.estado;
    if (s.aviso) sim.motivo = s.aviso;
  }
  if (motivos.length > 0) estado = peorEstado(estado, 'NO_EVALUABLE');
  const res: SimulacionEscenario = { escenario, anioReal: anio, estado, clima, ciclos, metodoEt0: et0.conteo };
  if (motivos.length > 0) res.motivo = motivos.join(' ');
  return res;
}

function excesoEscenario(sim: SimulacionEscenario, celdas: Parcela['celdas'], ciclosPorCelda: Map<string, CicloPlan[]>): ExcesoEscenario | null {
  if (sinNumeros(sim.estado)) return null;
  let w = 0;
  let mm = 0;
  let dias = 0;
  let lluvia = 0;
  for (const celda of celdas) {
    const peso = celda.fraccionDentro ?? 1;
    w += peso;
    for (const c of ciclosPorCelda.get(celda.id) ?? []) {
      const b = sim.ciclos.get(clave(c.ciclo, c.cultivo))?.balance as BalanceCiclo;
      mm += peso * b.excesoTotalMm;
      dias += peso * b.diasExceso;
      lluvia += peso * b.lluviaTotalMm;
    }
  }
  return { mm: r(mm / w, 1), dias: Math.round(dias / w), fraccionLluviaPercolada: lluvia > 0 ? r(Math.min(1, mm / lluvia), 4) : 0 };
}

function pilarHidrico(sim: SimulacionEscenario, celdas: Parcela['celdas'], ciclosPorCelda: Map<string, CicloPlan[]>): PilarDeficitHidrico {
  if (sinNumeros(sim.estado)) {
    return {
      estado: sim.estado,
      motivo: sim.motivo ?? `Escenario ${sim.estado}.`,
      proporcionDemandaNoCubierta: null,
      diasDeficit: null,
      diasDeficitEtapasSensibles: null,
      deficitTotalMm: null,
      excesoTotalMm: null,
    };
  }
  let w = 0;
  let etc = 0;
  let deficit = 0;
  let exceso = 0;
  let dias = 0;
  let sens: number | null = 0;
  for (const celda of celdas) {
    const peso = celda.fraccionDentro ?? 1;
    w += peso;
    for (const c of ciclosPorCelda.get(celda.id) ?? []) {
      const b = sim.ciclos.get(clave(c.ciclo, c.cultivo))?.balance as BalanceCiclo;
      etc += peso * b.etcTotalMm;
      deficit += peso * b.deficitTotalMm;
      exceso += peso * b.excesoTotalMm;
      dias += peso * b.diasDeficit;
      sens = sens === null || b.diasDeficitEtapasSensibles === null ? null : sens + peso * b.diasDeficitEtapasSensibles;
    }
  }
  const pilar: PilarDeficitHidrico = {
    estado: sim.estado,
    proporcionDemandaNoCubierta: etc > 0 ? r(deficit / etc, 4) : 0,
    diasDeficit: Math.round(dias / w),
    diasDeficitEtapasSensibles: sens === null ? null : Math.round(sens / w),
    deficitTotalMm: r(deficit / w, 1),
    excesoTotalMm: r(exceso / w, 1),
  };
  if (sim.estado !== 'EVALUABLE') pilar.motivo = sim.clima?.respaldo ? 'Clima de respaldo (no es NASA POWER).' : `Clima del escenario en ${sim.estado}.`;
  return pilar;
}

function pilarAporte(ciclos: Map<string, CicloPlan[]>, catalogo: Map<string, Cultivo>): PilarAporteIndirecto {
  const cultivos = new Set<string>();
  for (const l of ciclos.values()) for (const c of l) cultivos.add(c.cultivo);
  const legum = [...cultivos].map((c) => catalogo.get(c)?.esLeguminosa ?? null);
  const incluye = legum.includes(true) ? true : legum.includes(null) ? null : false;
  if (incluye === null) {
    return {
      estado: 'NO_EVALUABLE',
      motivo: 'Algun cultivo del plan no tiene clasificado si es leguminosa en el catalogo.',
      incluyeLeguminosa: null,
      especiesDistintas: null,
    };
  }
  return { estado: 'EVALUABLE', incluyeLeguminosa: incluye, especiesDistintas: cultivos.size };
}

function metricas(
  sim: SimulacionEscenario,
  e: EntradasMotor,
  ciclosPorCelda: Map<string, CicloPlan[]>,
  catalogo: Map<string, Cultivo>,
  aporte: PilarAporteIndirecto,
  compat: PilarCompatibilidadCiclo,
  paraPilar: Map<string, CicloParaPilar[]>,
  planValido: boolean,
): MetricasEscenario {
  const hidrico = pilarHidrico(sim, e.parcela.celdas, ciclosPorCelda);
  const ex = excesoEscenario(sim, e.parcela.celdas, ciclosPorCelda);
  const exceso: PilarExcesoHidrico = ex
    ? { estado: hidrico.estado, excesoTotalMm: ex.mm, diasExceso: ex.dias, fraccionLluviaPercolada: ex.fraccionLluviaPercolada }
    : { estado: hidrico.estado, motivo: hidrico.motivo ?? `Escenario ${hidrico.estado}.`, excesoTotalMm: null, diasExceso: null, fraccionLluviaPercolada: null };
  if (ex && hidrico.motivo) exceso.motivo = hidrico.motivo;
  const umbrales = [...new Set([...ciclosPorCelda.values()].flat().map((c) => c.cultivo))].map((c) => catalogo.get(c)?.umbrales.tEstresCalorC);
  const sinUmbral = umbrales.some((u) => !u || u.estado !== 'EVALUABLE');
  const pesos = new Map(e.parcela.celdas.map((c) => [c.id, c.fraccionDentro ?? 1]));
  const proteccion: PilarProteccionSuelo = planValido
    ? pilarProteccion(sim.anioReal, paraPilar, pesos)
    : { estado: 'NO_EVALUABLE', motivo: 'Plan invalido: no se pueden contar los dias de suelo desnudo.', indiceErosionRelativo: null, diasSueloDesnudo: null };
  const pilares: PilaresMotor = {
      deficitHidrico: hidrico,
      excesoHidrico: exceso,
      compatibilidadCiclo: compat,
      proteccionSuelo: proteccion,
      riesgoCalor: sinUmbral
        ? { estado: 'NO_EVALUABLE', motivo: 'El catalogo no tiene umbral de estres por calor con fuente para todos los cultivos del plan.', diasEstresCalor: null }
        : riesgoCalor(sim, e.parcela.celdas, ciclosPorCelda, catalogo),
      aporteIndirecto: aporte,
  };
  return { anioReal: sim.anioReal, estado: hidrico.estado, pilares, puntaje: null };
}

/** Dias de ciclo con tMax sobre el umbral de calor del cultivo (catalogo, con fuente), promedio de la parcela. */
function riesgoCalor(sim: SimulacionEscenario, celdas: Parcela['celdas'], ciclosPorCelda: Map<string, CicloPlan[]>, catalogo: Map<string, Cultivo>): PilarRiesgoCalor {
  if (sinNumeros(sim.estado)) return { estado: sim.estado, motivo: sim.motivo ?? `Escenario ${sim.estado}.`, diasEstresCalor: null };
  let w = 0;
  let dias = 0;
  for (const celda of celdas) {
    const peso = celda.fraccionDentro ?? 1;
    w += peso;
    for (const c of ciclosPorCelda.get(celda.id) ?? []) {
      const u = catalogo.get(c.cultivo)?.umbrales.tEstresCalorC;
      const tmax = sim.ciclos.get(clave(c.ciclo, c.cultivo))?.tMax ?? [];
      if (u?.estado !== 'EVALUABLE') continue;
      if (tmax.some((t) => t === null)) return { estado: 'NO_EVALUABLE', motivo: `Faltan temperaturas maximas en el ciclo ${c.ciclo}.`, diasEstresCalor: null };
      dias += peso * tmax.filter((t) => (t as number) > u.valor).length;
    }
  }
  return { estado: sim.estado, diasEstresCalor: Math.round(dias / w) };
}

interface Preparacion {
  catalogo: Map<string, Cultivo>;
  ciclosPorCelda: Map<string, CicloPlan[]>;
  parametros: Map<string, ParametrosCultivo | null>;
  motivosCultivo: Map<string, string>;
  avisosCultivo: string[];
  clavesCiclo: Map<string, CicloPlan>;
  erroresPlan: string[];
  taw: ResultadoTaw;
}

function preparar(e: EntradasMotor): Preparacion {
  const catalogo = new Map(e.catalogo.cultivos.map((c) => [c.id, c]));
  const ciclosPorCelda = ciclosDeCeldas(e.plan, e.parcela);
  const parametros = new Map<string, ParametrosCultivo | null>();
  const motivosCultivo = new Map<string, string>();
  const avisosCultivo: string[] = [];
  const clavesCiclo = new Map<string, CicloPlan>();
  for (const lista of ciclosPorCelda.values()) {
    for (const c of lista) {
      clavesCiclo.set(clave(c.ciclo, c.cultivo), c);
      if (parametros.has(c.cultivo)) continue;
      const cat = catalogo.get(c.cultivo);
      if (!cat) {
        parametros.set(c.cultivo, null);
        motivosCultivo.set(c.cultivo, `El cultivo ${c.cultivo} no esta en el catalogo.`);
        continue;
      }
      const rp = parametrosCultivo(cat);
      parametros.set(c.cultivo, rp.ok ? rp.parametros : null);
      if (!rp.ok) motivosCultivo.set(c.cultivo, rp.motivo);
      else avisosCultivo.push(...rp.parametros.avisos);
    }
  }
  const erroresPlan = validarPlan(e.plan, e.parcela, ciclosPorCelda, parametros);
  const taw = resolverTaw(e.suelo, e.tablaSuelos);
  return { catalogo, ciclosPorCelda, parametros, motivosCultivo, avisosCultivo, clavesCiclo, erroresPlan, taw };
}

/**
 * Pilares de agua (deficit y exceso) del plan en un clima cualquiera: lo usa la proxima temporada para los anios
 * analogos. Mismas reglas y estados que los escenarios.
 */
export function pilaresAguaEnClima(
  e: EntradasMotor,
  clima: ClimaParaSimular,
): { estado: EstadoEvaluacion; motivo?: string; deficitHidrico: PilarDeficitHidrico; exceso: ExcesoEscenario | null } {
  const pr = preparar(e);
  const sim = simularEscenario('proxima_temporada', clima, e, pr.taw, pr.clavesCiclo, pr.parametros, pr.motivosCultivo, pr.erroresPlan);
  const salida = {
    estado: sim.estado,
    deficitHidrico: pilarHidrico(sim, e.parcela.celdas, pr.ciclosPorCelda),
    exceso: excesoEscenario(sim, e.parcela.celdas, pr.ciclosPorCelda),
  };
  return sim.motivo ? { ...salida, motivo: sim.motivo } : salida;
}

/** Simula la rotacion del plan en los tres escenarios. */
export function simularRotacion(e: EntradasMotor): ResultadoMotor {
  const { catalogo, ciclosPorCelda, parametros, motivosCultivo, avisosCultivo, clavesCiclo, erroresPlan, taw } = preparar(e);
  const noRecomendados = cultivosNoRecomendados(e.plan, e.calendario, ciclosPorCelda);
  const simulaciones = {} as Record<Escenario, SimulacionEscenario>;
  for (const esc of ESCENARIOS) {
    simulaciones[esc] = simularEscenario(esc, e.escenarios[esc], e, taw, clavesCiclo, parametros, motivosCultivo, erroresPlan);
  }
  const aporte = pilarAporte(ciclosPorCelda, catalogo);
  const paraPilar = new Map(
    [...ciclosPorCelda].map(([id, l]) => [id, l.map((c) => ({ ...c, totalDias: parametros.get(c.cultivo)?.totalDias ?? null }))] as const),
  );
  const pesosCelda = new Map(e.parcela.celdas.map((c) => [c.id, c.fraccionDentro ?? 1]));
  const comp = erroresPlan.length > 0
    ? { pilar: { estado: 'NO_EVALUABLE' as const, motivo: `Plan invalido: ${erroresPlan.join(' ')}`, siembrasFueraDeVentana: null }, avisos: [] }
    : pilarCompatibilidad(e.plan, e.calendario, paraPilar, pesosCelda);
  const m = (x: Escenario) => metricas(simulaciones[x], e, ciclosPorCelda, catalogo, aporte, comp.pilar, paraPilar, erroresPlan.length === 0);
  const porEscenario = { seco: m('seco'), habitual: m('habitual'), lluvioso: m('lluvioso') };
  let estado = peorEstado(...ESCENARIOS.map((x) => porEscenario[x].estado));
  if (noRecomendados.length > 0) estado = peorEstado(estado, 'EXPLORATORIO');

  const esEjemplo =
    e.plan.meta.esEjemplo || e.parcela.meta.esEjemplo || ESCENARIOS.some((x) => e.escenarios[x]?.meta.esEjemplo === true);
  const advertencias = construirAdvertencias(e, simulaciones, taw, erroresPlan, [...avisosCultivo, ...comp.avisos], noRecomendados, estado);
  const exceso = {
    seco: excesoEscenario(simulaciones.seco, e.parcela.celdas, ciclosPorCelda),
    habitual: excesoEscenario(simulaciones.habitual, e.parcela.celdas, ciclosPorCelda),
    lluvioso: excesoEscenario(simulaciones.lluvioso, e.parcela.celdas, ciclosPorCelda),
  };
  const rotacion: ResultadoRotacion = {
    meta: esEjemplo
      ? { versionContrato: VERSION_CONTRATO, esEjemplo: true, aviso: 'Calculado con entradas de ejemplo o sinteticas: no son datos reales.' }
      : { versionContrato: VERSION_CONTRATO, esEjemplo: false },
    rotacionId: e.plan.rotacionId,
    estado,
    // Paso 7.1: una siembra fuera de la ventana local cae fuera en todos los escenarios (la ventana no depende del clima).
    filtroClima: comp.pilar.siembrasFueraDeVentana === null ? null : comp.pilar.siembrasFueraDeVentana > 0,
    porEscenario,
    peorCaso: null,
    arrepentimiento: null,
    ponderacion: null,
    ranking: null,
    advertencias,
    explicacion: explicacion(e, simulaciones, porEscenario, taw, exceso),
  };
  if (noRecomendados.length > 0) rotacion.cultivosNoRecomendados = noRecomendados;
  return { rotacion, exceso, simulaciones, ciclosPorCelda, parcela: e.parcela, plan: e.plan, noRecomendados, esEjemplo };
}

function construirAdvertencias(
  e: EntradasMotor,
  sims: Record<Escenario, SimulacionEscenario>,
  taw: ResultadoTaw,
  erroresPlan: string[],
  avisosCultivo: string[],
  noRec: CultivoNoRecomendado[],
  estado: EstadoEvaluacion,
): Advertencia[] {
  const a: Advertencia[] = [];
  if (sinNumeros(estado)) {
    const motivos = ESCENARIOS.map((x) => sims[x].motivo && `${x}: ${sims[x].motivo}`).filter(Boolean);
    a.push({ codigo: estado, mensaje: `La rotacion no se puede evaluar. ${[...new Set(motivos)].join(' ')}`, severidad: 'critico' });
  }
  for (const m of erroresPlan) a.push({ codigo: 'PLAN_INVALIDO', mensaje: m, severidad: 'critico' });
  if (taw.ok) {
    a.push({
      codigo: 'SUELO_SUPUESTO',
      mensaje: `Capacidad de agua del suelo: ${taw.tawMmPorM} mm/m (${taw.descripcion}). Es una estimacion por textura, no una medicion de la parcela.`,
      severidad: 'aviso',
    });
  }
  const conGwet = ESCENARIOS.some((x) => [...sims[x].ciclos.values()].some((c) => c.condicionInicial === 'gwetroot'));
  a.push(
    conGwet
      ? {
          codigo: 'CONDICION_INICIAL_GWETROOT',
          mensaje: 'Agua al sembrar desde la humedad de POWER (GWETROOT, regional) convertida con thetaSat y thetaFC del suelo (FAO-56 ec. 87).',
          severidad: 'info',
        }
      : {
          codigo: 'CONDICION_INICIAL_SUPUESTA',
          mensaje: `Cada ciclo arranca con el suelo a capacidad de campo (Dr,i = 0; ${FUENTE_DR_INICIAL_CERO.cita}). La conversion de GWETROOT queda NO_EVALUABLE hasta tener thetaSat, thetaFC y thetaWP (Saxton y Rawls, A2.16). En un escenario seco este supuesto subestima el deficit.`,
          severidad: 'aviso',
        },
  );
  a.push({
    codigo: 'KC_SIN_AJUSTE_CLIMATICO',
    mensaje: 'Kc medio y final de FAO-56 Tabla 12 sin el ajuste climatico de la ec. 62 (requiere la altura del cultivo, que no esta en el catalogo).',
    severidad: 'info',
  });
  a.push({
    codigo: 'SIN_ESCURRIMIENTO',
    mensaje: 'La cubeta no separa escurrimiento: toda la lluvia infiltra y lo que excede la capacidad se cuenta como exceso (percolacion). La pendiente no cambia el balance: no hay coeficiente de escurrimiento con fuente para la celda.',
    severidad: 'info',
  });
  const et0 = ESCENARIOS.reduce((s, x) => s + sims[x].metodoEt0.hargreaves_fao56, 0);
  if (et0 > 0) {
    a.push({ codigo: 'ET0_HARGREAVES', mensaje: `${et0} dias con ET0 de Hargreaves (FAO-56 ec. 52) por falta de humedad, viento, radiacion o elevacion: menor precision.`, severidad: 'aviso' });
  }
  const sinSens = [...new Set([...e.plan.ciclos.map((c) => c.cultivo)])].filter((c) => {
    const cat = e.catalogo.cultivos.find((x) => x.id === c);
    return !cat?.etapasSensibles || cat.etapasSensibles.length === 0;
  });
  if (sinSens.length > 0) {
    a.push({ codigo: 'ETAPAS_SENSIBLES_SIN_FUENTE', mensaje: `Sin etapas sensibles con fuente en el catalogo (${sinSens.join(', ')}): diasDeficitEtapasSensibles queda en null.`, severidad: 'info' });
  }
  if (e.parcela.celdas.length > 1) {
    a.push({ codigo: 'AGREGACION_PARCELA', mensaje: 'Los pilares de la rotacion son el promedio de las celdas ponderado por su fraccion dentro del poligono; los dias se redondean al entero.', severidad: 'info' });
  }
  a.push({ codigo: 'RESOLUCION_GRUESA', mensaje: 'El clima es el mismo para toda la parcela: NASA POWER tiene celdas de 0.5 x 0.625 grados.', severidad: 'info' });
  if ('sinCalendarioLocal' in e.plan.calendarioLocal) {
    a.push({ codigo: 'SIN_CALENDARIO_LOCAL', mensaje: `Sin calendario local: ${e.plan.calendarioLocal.motivo}`, severidad: 'aviso' });
  } else if (!e.calendario || e.calendario.id !== e.plan.calendarioLocal.calendarioId) {
    a.push({ codigo: 'CALENDARIO_NO_DISPONIBLE', mensaje: `El plan cita el calendario ${e.plan.calendarioLocal.calendarioId}, que no se recibio: no se revisa si los cultivos se registran en el lugar.`, severidad: 'aviso' });
  }
  for (const n of noRec) a.push({ codigo: 'CULTIVO_NO_RECOMENDADO', mensaje: `${n.cultivo} (ciclos ${n.ciclos.join(', ')}): ${n.motivo}`, severidad: 'aviso' });
  for (const m of avisosCultivo) a.push({ codigo: 'CATALOGO', mensaje: m, severidad: 'info' });
  const avisosSiembra = new Set<string>();
  for (const x of ESCENARIOS) for (const c of sims[x].ciclos.values()) if (c.estado !== 'NO_EVALUABLE' && c.motivo) avisosSiembra.add(c.motivo);
  for (const m of avisosSiembra) a.push({ codigo: 'SIEMBRA_TEMPORADA', mensaje: m, severidad: 'aviso' });
  const clima = ESCENARIOS.map((x) => e.escenarios[x]?.advertencias?.filter((w) => w.severidad !== 'info'));
  return juntarAdvertencias(a, ...clima);
}

function explicacion(
  e: EntradasMotor,
  sims: Record<Escenario, SimulacionEscenario>,
  porEscenario: Record<Escenario, MetricasEscenario>,
  taw: ResultadoTaw,
  exceso: Record<Escenario, ExcesoEscenario | null>,
): ResultadoRotacion['explicacion'] {
  const evidencia: Evidencia[] = [];
  for (const x of ESCENARIOS) {
    const s = sims[x];
    const h = porEscenario[x].pilares.deficitHidrico;
    if (!s.clima || h.proporcionDemandaNoCubierta === null) continue;
    evidencia.push({
      texto: `Escenario ${x} (anio agricola ${s.anioReal}): ${r(h.proporcionDemandaNoCubierta * 100, 1)} % de la demanda de agua del cultivo sin cubrir, ${h.diasDeficit} dias con deficit, ${h.deficitTotalMm} mm de deficit y ${h.excesoTotalMm} mm de exceso.`,
      valor: h.proporcionDemandaNoCubierta,
      unidad: 'fraccion de la demanda',
      fuente: s.clima.fuente,
    });
    const ex = exceso[x];
    if (ex) {
      evidencia.push({
        texto: `Escenario ${x} (anio agricola ${s.anioReal}): ${ex.dias} dias con exceso de agua (lluvia que no cabe en el suelo y drena), ${ex.mm} mm en total.`,
        valor: ex.dias,
        unidad: 'dias con exceso',
        fuente: s.clima.fuente,
      });
    }
  }
  const huecos = [
    'Suelo estimado por textura (SUPUESTO), no medido en la parcela.',
    'Agua del suelo al sembrar supuesta a capacidad de campo hasta convertir la humedad de POWER (A2.16).',
    'Clima regional de NASA POWER: el mismo para toda la parcela.',
    'Sin datos de mercado ni de rendimiento: no se estiman toneladas ni ingresos.',
    'Sin indice de erosion con fuente (falta intensidad de lluvia sub-diaria y factores C y LS): la proteccion del suelo se mide con los dias de suelo desnudo.',
    'Sin umbral de calor con fuente en el catalogo: el riesgo por calor no se evalua.',
  ];
  if (!taw.ok) huecos.unshift(taw.motivo);
  return {
    porQue: `Pilar de deficit hidrico de la rotacion ${e.plan.rotacionId} en los tres escenarios historicos. El ranking entre rotaciones se calcula en A4.2.`,
    evidencia,
    beneficios: [],
    huecos,
    riesgos: [],
    avisoExperto: 'Es una comparacion con historia climatica real, no una prediccion. Validar con un agronomo o tecnico local antes de decidir.',
    redactadaPor: 'plantilla',
  };
}

/** resultado-celda de todas las celdas en una fecha del plan. null si el escenario no tiene anio (no hay clima). */
export function resultadoCeldas(res: ResultadoMotor, escenario: Escenario, fecha: string): ResultadoCeldas | null {
  const sim = res.simulaciones[escenario];
  if (sim.anioReal === null) return null;
  const registros: RegistroCelda[] = res.parcela.celdas.map((celda) => registroCelda(res, sim, celda.id, fecha));
  const estado = peorEstado(...registros.map((x) => x.estado));
  const salida: ResultadoCeldas = {
    meta: res.esEjemplo
      ? { versionContrato: VERSION_CONTRATO, esEjemplo: true, aviso: 'Calculado con entradas de ejemplo o sinteticas: no son datos reales.' }
      : { versionContrato: VERSION_CONTRATO, esEjemplo: false },
    rotacionId: res.plan.rotacionId,
    escenario,
    anioReal: sim.anioReal,
    parcelaId: res.parcela.id,
    estado,
    registros,
    advertencias: [
      {
        codigo: 'FECHAS_DEL_PLAN',
        mensaje: `Las fechas son las del plan; el clima de cada ciclo es el de su temporada en el anio agricola ${sim.anioReal} (${SIAP_CICLOS.nombre}).`,
        severidad: 'info',
      },
    ],
  };
  return salida;
}

function registroCelda(res: ResultadoMotor, sim: SimulacionEscenario, celdaId: string, fecha: string): RegistroCelda {
  const ciclos = res.ciclosPorCelda.get(celdaId) ?? [];
  const dia = aDia(fecha);
  let actual: CicloPlan | undefined;
  let iDia = 0;
  for (let k = 0; k < ciclos.length; k++) {
    const c = ciclos[k] as CicloPlan;
    const inicio = aDia(c.siembra);
    const sc = sim.ciclos.get(clave(c.ciclo, c.cultivo));
    const fin = sc?.parametros ? inicio + sc.parametros.totalDias : ciclos[k + 1] ? aDia((ciclos[k + 1] as CicloPlan).siembra) : Infinity;
    if (dia >= inicio && dia < fin) {
      actual = c;
      iDia = dia - inicio + 1;
      break;
    }
  }
  const nulos = { avanceEtapa: null, estadoPlanta: null, humedad: null, deficitMm: null, excesoMm: null, etcMm: null, estresCalor: null, riesgoErosion: null };
  if (!actual) {
    return { celdaId, fecha, estado: 'EVALUABLE', ciclo: null, cultivo: null, etapa: 'suelo_desnudo', ...nulos };
  }
  const sc = sim.ciclos.get(clave(actual.ciclo, actual.cultivo));
  const noRec = res.noRecomendados.find((n) => n.cultivo === actual.cultivo && n.ciclos.includes(actual.ciclo));
  const extra: Partial<RegistroCelda> = noRec ? { noRecomendadoEnLugar: true, fuenteMotivo: noRec.fuente } : {};
  const p = sc?.parametros ?? null;
  const ev = p ? etapaVisual(p, iDia) : null;
  if (!sc || !sc.balance) {
    return {
      celdaId,
      fecha,
      estado: sim.estado === 'ERROR_DATOS' ? 'ERROR_DATOS' : 'NO_EVALUABLE',
      motivo: sc?.motivo ?? sim.motivo ?? 'Sin resultado para este ciclo.',
      ciclo: actual.ciclo,
      cultivo: actual.cultivo,
      etapa: ev?.etapa ?? null,
      ...nulos,
      ...extra,
    };
  }
  const d = sc.balance.dias[iDia - 1];
  const estado = peorEstado(sc.estado, noRec ? 'EXPLORATORIO' : 'EVALUABLE');
  const registro: RegistroCelda = {
    celdaId,
    fecha,
    estado,
    ciclo: actual.ciclo,
    cultivo: actual.cultivo,
    etapa: (ev as NonNullable<typeof ev>).etapa,
    avanceEtapa: r((ev as NonNullable<typeof ev>).avance, 3),
    estadoPlanta: d?.estadoPlanta ?? null,
    humedad: d ? r(d.humedad, 3) : null,
    deficitMm: r(sc.deficitAcum[iDia - 1] ?? 0, 2),
    excesoMm: r(sc.excesoAcum[iDia - 1] ?? 0, 2),
    etcMm: d ? r(d.etcMm, 2) : null,
    estresCalor: null,
    riesgoErosion: null,
    ...extra,
  };
  if (estado !== 'EVALUABLE') {
    registro.motivo = noRec ? noRec.motivo : sim.clima?.respaldo ? 'Clima de respaldo (no es NASA POWER).' : `Clima del escenario en ${estado}.`;
  }
  return registro;
}
