// A4.2: ranking de rotaciones por robustez (doc 05, paso 7). Criterio B [DECIDIDO] 14/11, respaldo A.
//
// Normalizacion de cada pilar a un subpuntaje de 0 a 1 (mayor es mejor), definida aqui (A4.2):
//   deficitHidrico      1 - proporcionDemandaNoCubierta = ETc ajustada / ETc del periodo (FAO-56 ec. 80: la fraccion
//                       de la demanda del cultivo que el agua del suelo cubrio). No es rendimiento.
//   compatibilidadCiclo 1 - siembrasFueraDeVentana / numero de siembras del plan (fraccion de siembras en ventana).
//   proteccionSuelo     1 - indiceErosionRelativo (el indice ya va de 0 a 1; su construccion la fija A3.7).
//   riesgoCalor y aporteIndirecto son complementarios en doc 05 (tabla del paso 6): se muestran, no entran al puntaje.
// Pesos: los de la fuente o del usuario (F8) si se pasan; si no, iguales entre los pilares que entran, declarados
// SUPUESTO. Un pilar entra solo si tiene numero en todos los escenarios de todas las rotaciones comparadas.
//
// B: puntaje por escenario = suma de pesos x subpuntajes; robustez = peor puntaje (peorCaso); arrepentimiento del
//    escenario = mejor puntaje del escenario entre las rotaciones comparadas - puntaje de la rotacion; se ordena por
//    menor arrepentimiento maximo, desempate por mayor puntaje promedio y despues por rotacionId.
// A (respaldo, si los pilares 2 y 3 no tienen numero: con un solo pilar B no aporta nada sobre A): se ordena por menor
//    proporcion de demanda no cubierta en el peor escenario, desempate por menor promedio y despues por rotacionId.
// Solo se ordenan las rotaciones EVALUABLE o RESPALDO_HISTORICO. Una EXPLORATORIO (cultivo no registrado en el
// lugar) recibe sus metricas y peor caso, pero no posicion: se ilustra, no se recomienda.
import { juntarAdvertencias } from './estados';
import {
  ESCENARIOS,
  type Advertencia,
  type CriterioRanking,
  type Escenario,
  type Fuente,
  type MetricasEscenario,
  type PesosPilares,
  type Ponderacion,
  type ResultadoRotacion,
} from './tipos';

export type PilarPuntaje = keyof PesosPilares;
const PILARES: readonly PilarPuntaje[] = ['deficitHidrico', 'compatibilidadCiclo', 'proteccionSuelo', 'riesgoCalor', 'aporteIndirecto'];
const COMPLEMENTARIOS: readonly PilarPuntaje[] = ['riesgoCalor', 'aporteIndirecto'];
const TOL = 1e-9;
export const SIN_OPCION_ROBUSTA = 'No podemos determinar una opcion mas robusta con estos datos.';

export interface RotacionParaRanking {
  rotacion: ResultadoRotacion;
  /** Siembras del plan (para normalizar la compatibilidad de ciclo). */
  numeroSiembras: number;
}

export interface OpcionesRanking {
  /** Pesos dados por el usuario (F8) o con fuente. Se renormalizan entre los pilares que entran al puntaje. */
  pesos?: PesosPilares;
  etiquetaPesos?: 'USUARIO' | 'FUENTE';
  fuentePesos?: Fuente;
  /** Fuerza un criterio; por defecto B si entran al menos dos pilares, si no A. */
  criterio?: CriterioRanking;
}

export interface FilaRanking {
  rotacionId: string;
  posicion: number;
  peorEscenario: Escenario;
  /** B: peor puntaje; A: peor proporcion de demanda no cubierta. */
  peorValor: number;
  arrepentimiento: number | null;
  promedio: number;
}

export interface ResultadoRanking {
  criterio: CriterioRanking | null;
  ponderacion: Ponderacion | null;
  /** Rotaciones ordenadas (posicion 1 = mas robusta). */
  orden: FilaRanking[];
  noOrdenadas: { rotacionId: string; motivo: string }[];
  /** Las rotaciones de entrada con peorCaso, puntaje, arrepentimiento, ponderacion y ranking llenos. */
  rotaciones: ResultadoRotacion[];
  mensaje?: string;
  advertencias: Advertencia[];
}

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

function subpuntaje(p: PilarPuntaje, m: MetricasEscenario, siembras: number): number | null {
  const x = m.pilares;
  switch (p) {
    case 'deficitHidrico':
      return x.deficitHidrico.proporcionDemandaNoCubierta === null ? null : 1 - x.deficitHidrico.proporcionDemandaNoCubierta;
    case 'compatibilidadCiclo': {
      const f = x.compatibilidadCiclo?.siembrasFueraDeVentana;
      return f === null || f === undefined || siembras <= 0 ? null : 1 - Math.min(f, siembras) / siembras;
    }
    case 'proteccionSuelo': {
      const i = x.proteccionSuelo?.indiceErosionRelativo;
      return i === null || i === undefined ? null : 1 - i;
    }
    default:
      return null;
  }
}

function conNumeros(r: ResultadoRotacion): boolean {
  return ESCENARIOS.every((e) => r.porEscenario[e].pilares.deficitHidrico.proporcionDemandaNoCubierta !== null);
}

const ordenable = (r: ResultadoRotacion) => r.estado === 'EVALUABLE' || r.estado === 'RESPALDO_HISTORICO';

/** Ordena las rotaciones por robustez. Puras: no modifica la entrada, devuelve copias. */
export function rankear(entrada: readonly RotacionParaRanking[], opciones: OpcionesRanking = {}): ResultadoRanking {
  const rotaciones = entrada.map((x) => structuredClone(x.rotacion));
  const siembras = new Map(entrada.map((x) => [x.rotacion.rotacionId, x.numeroSiembras]));
  const advertencias: Advertencia[] = [];
  const noOrdenadas: ResultadoRanking['noOrdenadas'] = [];

  // Todas deben compararse contra los mismos anios.
  const anios = (r: ResultadoRotacion) => ESCENARIOS.map((e) => r.porEscenario[e].anioReal).join('/');
  const conAnio = rotaciones.filter(conNumeros);
  if (new Set(conAnio.map(anios)).size > 1) {
    return {
      criterio: null,
      ponderacion: null,
      orden: [],
      noOrdenadas: rotaciones.map((r) => ({ rotacionId: r.rotacionId, motivo: 'Las rotaciones no usan los mismos anios de escenario.' })),
      rotaciones,
      mensaje: SIN_OPCION_ROBUSTA,
      advertencias: [{ codigo: 'ESCENARIOS_DISTINTOS', mensaje: 'Solo se comparan rotaciones calculadas con los mismos tres anios reales.', severidad: 'critico' }],
    };
  }

  const candidatas = rotaciones.filter((r) => conNumeros(r) && r.estado !== 'NO_EVALUABLE' && r.estado !== 'ERROR_DATOS');
  const ordenar = candidatas.filter(ordenable);
  for (const r of rotaciones) {
    if (!ordenable(r)) {
      noOrdenadas.push({
        rotacionId: r.rotacionId,
        motivo:
          r.estado === 'EXPLORATORIO'
            ? 'EXPLORATORIO: se muestra, pero no se recomienda (por ejemplo, un cultivo que la fuente local no registra en el lugar).'
            : `${r.estado}: sin metricas completas en los tres escenarios.`,
      });
    }
  }
  if (ordenar.length === 0) {
    return { criterio: null, ponderacion: null, orden: [], noOrdenadas, rotaciones, mensaje: SIN_OPCION_ROBUSTA, advertencias };
  }

  // Pilares que entran al puntaje.
  const entran: PilarPuntaje[] = [];
  const excluidos: PilarPuntaje[] = [];
  for (const p of PILARES) {
    const ok =
      !COMPLEMENTARIOS.includes(p) &&
      candidatas.every((r) => ESCENARIOS.every((e) => subpuntaje(p, r.porEscenario[e], siembras.get(r.rotacionId) ?? 0) !== null));
    (ok ? entran : excluidos).push(p);
  }
  const criterio: CriterioRanking = opciones.criterio ?? (entran.length >= 2 ? 'B_minimax_arrepentimiento' : 'A_exposicion_hidrica_peor_caso');
  if (criterio === 'B_minimax_arrepentimiento' && entran.length < 1) {
    return { criterio: null, ponderacion: null, orden: [], noOrdenadas, rotaciones, mensaje: SIN_OPCION_ROBUSTA, advertencias };
  }

  let ponderacion: Ponderacion | null = null;
  const valorEscenario = new Map<string, Record<Escenario, number>>();
  if (criterio === 'B_minimax_arrepentimiento') {
    const dados = opciones.pesos;
    const base = entran.map((p) => [p, dados ? (dados[p] ?? 0) : 1] as const);
    const suma = base.reduce((s, [, w]) => s + w, 0);
    const usarIguales = !dados || suma <= 0;
    // Se calcula con los pesos exactos; en ponderacion se publican redondeados.
    const exactos: PesosPilares = {};
    const pesos: PesosPilares = {};
    for (const [p, w] of base) {
      exactos[p] = usarIguales ? 1 / entran.length : w / suma;
      pesos[p] = r4(exactos[p] as number);
    }
    const ignorados = dados ? excluidos.filter((p) => (dados[p] ?? 0) > 0) : [];
    const etiqueta = usarIguales ? 'SUPUESTO' : (opciones.etiquetaPesos ?? 'USUARIO');
    ponderacion = {
      pesos,
      etiqueta,
      pilaresExcluidos: excluidos,
      nota:
        (usarIguales
          ? `Pesos iguales entre los ${entran.length} pilares con numero (sin pesos con fuente ni del usuario): es un supuesto, no un dato.`
          : `Pesos ${etiqueta === 'FUENTE' ? 'con fuente' : 'del usuario'}, renormalizados entre los pilares con numero.`) +
        ' Subpuntajes de 0 a 1: deficit hidrico = fraccion de la demanda cubierta; compatibilidad = fraccion de siembras en ventana; proteccion del suelo = 1 - indice de erosion.' +
        ' Calor y aporte indirecto son complementarios y no entran.' +
        (ignorados.length > 0 ? ` Pesos ignorados (pilar sin numero o complementario): ${ignorados.join(', ')}.` : ''),
    };
    if (etiqueta === 'FUENTE' && opciones.fuentePesos) ponderacion.fuente = opciones.fuentePesos;
    for (const r of candidatas) {
      const v = {} as Record<Escenario, number>;
      for (const e of ESCENARIOS) {
        v[e] = entran.reduce((s, p) => s + (exactos[p] as number) * (subpuntaje(p, r.porEscenario[e], siembras.get(r.rotacionId) ?? 0) as number), 0);
      }
      valorEscenario.set(r.rotacionId, v);
    }
  } else {
    for (const r of candidatas) {
      const v = {} as Record<Escenario, number>;
      for (const e of ESCENARIOS) v[e] = r.porEscenario[e].pilares.deficitHidrico.proporcionDemandaNoCubierta as number;
      valorEscenario.set(r.rotacionId, v);
    }
  }

  const esB = criterio === 'B_minimax_arrepentimiento';
  // Mejor valor por escenario entre las rotaciones ordenables (las exploratorias no fijan la referencia).
  const mejor = {} as Record<Escenario, number>;
  for (const e of ESCENARIOS) {
    const vals = ordenar.map((r) => (valorEscenario.get(r.rotacionId) as Record<Escenario, number>)[e]);
    mejor[e] = esB ? Math.max(...vals) : Math.min(...vals);
  }
  const filas: (Omit<FilaRanking, 'posicion'> & { ordenable: boolean })[] = candidatas.map((r) => {
    const v = valorEscenario.get(r.rotacionId) as Record<Escenario, number>;
    let peor: Escenario = 'seco';
    for (const e of ESCENARIOS) if (esB ? v[e] < v[peor] - TOL : v[e] > v[peor] + TOL) peor = e;
    const promedio = ESCENARIOS.reduce((s, e) => s + v[e], 0) / ESCENARIOS.length;
    const arrep = esB ? Math.max(...ESCENARIOS.map((e) => Math.max(mejor[e], v[e]) - v[e])) : null;
    return { rotacionId: r.rotacionId, peorEscenario: peor, peorValor: v[peor], arrepentimiento: arrep, promedio, ordenable: ordenable(r) };
  });
  const comparar = (a: (typeof filas)[number], b: (typeof filas)[number]) => {
    if (esB) {
      const d = (a.arrepentimiento as number) - (b.arrepentimiento as number);
      if (Math.abs(d) > TOL) return d;
      const p = b.promedio - a.promedio;
      if (Math.abs(p) > TOL) return p;
    } else {
      const d = a.peorValor - b.peorValor;
      if (Math.abs(d) > TOL) return d;
      const p = a.promedio - b.promedio;
      if (Math.abs(p) > TOL) return p;
    }
    return a.rotacionId < b.rotacionId ? -1 : a.rotacionId > b.rotacionId ? 1 : 0;
  };
  const orden: FilaRanking[] = filas
    .filter((f) => f.ordenable)
    .sort(comparar)
    .map((f, i) => ({
      rotacionId: f.rotacionId,
      posicion: i + 1,
      peorEscenario: f.peorEscenario,
      peorValor: r4(f.peorValor),
      arrepentimiento: f.arrepentimiento === null ? null : r4(f.arrepentimiento),
      promedio: r4(f.promedio),
    }));

  const desempate = esB
    ? 'Empate de arrepentimiento maximo: mayor puntaje promedio; despues, rotacionId.'
    : 'Empate en el peor caso: menor proporcion promedio de demanda no cubierta; despues, rotacionId.';
  const avisoCriterio: Advertencia = esB
    ? { codigo: 'RANKING_CRITERIO_B', mensaje: `Criterio B: puntaje compuesto con ${entran.join(', ')}; robustez = peor puntaje; orden por menor arrepentimiento maximo.`, severidad: 'info' }
    : {
        codigo: 'RANKING_RESPALDO_A',
        mensaje: `Criterio A (respaldo): solo el pilar de deficit hidrico tiene numero${excluidos.length ? ` (sin numero: ${excluidos.filter((p) => !COMPLEMENTARIOS.includes(p)).join(', ')})` : ''}; con un solo pilar el puntaje compuesto no aporta. Orden por menor demanda no cubierta en el peor escenario.`,
        severidad: 'aviso',
      };
  advertencias.push(avisoCriterio);

  for (const r of rotaciones) {
    const f = filas.find((x) => x.rotacionId === r.rotacionId);
    if (!f) continue;
    const v = valorEscenario.get(r.rotacionId) as Record<Escenario, number>;
    if (esB) for (const e of ESCENARIOS) r.porEscenario[e].puntaje = r4(v[e]);
    r.peorCaso = {
      escenario: f.peorEscenario,
      criterio,
      metrica: esB ? 'puntaje' : 'deficitHidrico.proporcionDemandaNoCubierta',
      valor: r4(f.peorValor),
    };
    r.arrepentimiento = f.arrepentimiento === null ? null : r4(f.arrepentimiento);
    r.ponderacion = esB ? ponderacion : null;
    const fila = orden.find((x) => x.rotacionId === r.rotacionId);
    r.ranking = fila ? { posicion: fila.posicion, de: orden.length, criterio, desempate } : null;
    const extra: Advertencia[] = [avisoCriterio];
    if (esB && ponderacion?.etiqueta === 'SUPUESTO') {
      extra.push({ codigo: 'PESOS_SUPUESTO', mensaje: ponderacion.nota, severidad: 'aviso' });
    }
    if (!fila) {
      extra.push({ codigo: 'SIN_POSICION', mensaje: 'Rotacion EXPLORATORIO: tiene metricas y peor caso, pero no entra al ranking.', severidad: 'aviso' });
    }
    r.advertencias = juntarAdvertencias(r.advertencias, extra);
    r.explicacion = { ...r.explicacion, porQue: porQue(r, f, fila ?? null, orden.length, esB) };
  }

  return { criterio, ponderacion, orden, noOrdenadas, rotaciones, advertencias };
}

function porQue(r: ResultadoRotacion, f: { peorEscenario: Escenario; peorValor: number }, fila: FilaRanking | null, total: number, esB: boolean): string {
  const anio = r.porEscenario[f.peorEscenario].anioReal;
  const peor = esB
    ? `su peor escenario es el ${f.peorEscenario} (anio agricola ${anio}), con puntaje ${r4(f.peorValor)} de 1`
    : `en su peor escenario, el ${f.peorEscenario} (anio agricola ${anio}), queda sin cubrir el ${Math.round(f.peorValor * 1000) / 10} % de la demanda de agua del cultivo`;
  const lugar = fila
    ? `Posicion ${fila.posicion} de ${total} por robustez (${esB ? 'criterio B: menor arrepentimiento maximo' : 'criterio A, respaldo: menor exposicion hidrica en el peor caso'})`
    : 'Sin posicion en el ranking (se muestra como exploratoria)';
  return `${lugar}: ${peor}.${esB && fila ? ` Arrepentimiento maximo: ${fila.arrepentimiento}.` : ''}`;
}
