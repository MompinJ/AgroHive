// A2.13, parte del motor: capa "proxima temporada (aproximada)". La banda la construye la API (contrato
// proxima-temporada, metodo de doc 13). El motor no la recalcula ni la convierte en una cifra: la valida y la pone
// junto a los tres escenarios historicos (A2.5) para que la interfaz compare. Para cada mes de la banda toma la
// lluvia real de ese mismo mes en el anio agricola de cada escenario (octubre a diciembre en t-1; enero a septiembre
// en t, como en SIAP_CICLOS) y dice si queda debajo, dentro o encima de la banda.
// No se suman las bandas de varios meses: la suma de percentiles mensuales no es un percentil de la suma.
import { mesDe } from './fechas';
import type { ClimaEscenario, Escenario } from './tipos';
import { ESCENARIOS, type Advertencia } from './tipos';
import type { ProximaTemporadaAproximada, RangoIncertidumbre } from '../../../contratos/tipos/contratos';

export type PosicionEnBanda = 'debajo' | 'dentro' | 'encima';

export interface EscenarioEnMes {
  anioReal: number;
  /** Mes calendario del escenario que corresponde al mes de la banda (AAAA-MM). */
  mesReal: string;
  /** Lluvia real del mes (suma de diarios). null si falta algun dia. */
  lluviaMm: number | null;
  /** null si la banda o la lluvia del mes no tienen numero. */
  posicion: PosicionEnBanda | null;
}

export interface MesProximaTemporada {
  mes: string;
  lluviaMm: RangoIncertidumbre;
  tMediaC: RangoIncertidumbre;
  climatologiaLluviaMm: number | null;
  escenarios: Record<Escenario, EscenarioEnMes | null>;
}

export interface VistaProximaTemporada {
  /** EXPLORATORIO por naturaleza (contrato); NO_EVALUABLE o ERROR_DATOS si no hay banda valida. */
  estado: 'EXPLORATORIO' | 'NO_EVALUABLE' | 'ERROR_DATOS';
  motivo?: string;
  esPrediccion: false;
  aviso: string;
  metodo: ProximaTemporadaAproximada['metodo'] | null;
  emitido: string | null;
  meses: MesProximaTemporada[];
  /** Por escenario: en cuantos meses su lluvia real cae dentro de la banda (de los meses con numero). */
  coincidencias: Record<Escenario, { dentro: number; deMeses: number } | null>;
  fuentes: ProximaTemporadaAproximada['fuentes'] | [];
  advertencias: Advertencia[];
}

const AVISO_SIN_BANDA = 'Sin rango aproximado de la proxima temporada.';
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Comprueba lo que el contrato obliga y el motor no debe romper: sin prediccion, sin cifra unica, 6 meses. */
function problemas(doc: ProximaTemporadaAproximada): string[] {
  const p: string[] = [];
  if (doc.esPrediccion !== false) p.push('esPrediccion debe ser false.');
  if (doc.horizonteMeses !== 6) p.push(`El horizonte debe ser de 6 meses (llego ${String(doc.horizonteMeses)}).`);
  if (doc.meses.length > 6) p.push(`Llegaron ${doc.meses.length} meses; el horizonte es de 6.`);
  for (const m of doc.meses) {
    for (const [nombre, r] of [['lluvia', m.lluviaMm], ['temperatura', m.tMediaC]] as const) {
      if ((r.inferior === null) !== (r.superior === null)) p.push(`${m.mes}: banda de ${nombre} con un solo extremo.`);
      else if (r.inferior !== null && r.superior !== null && r.inferior > r.superior) p.push(`${m.mes}: banda de ${nombre} invertida.`);
    }
  }
  return p;
}

function lluviaDelMes(esc: ClimaEscenario, mesReal: string): number | null {
  const dias = esc.diario.filter((d) => d.fecha.startsWith(mesReal));
  const [a, m] = mesReal.split('-').map(Number) as [number, number];
  const enMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  if (dias.length !== enMes || dias.some((d) => d.lluviaMm === null)) return null;
  return r1(dias.reduce((s, d) => s + (d.lluviaMm as number), 0));
}

/** Mes de la banda (AAAA-MM) llevado al anio agricola t del escenario: octubre a diciembre en t-1, el resto en t. */
export function mesEnEscenario(mes: string, anioAgricola: number): string {
  const m = mesDe(`${mes}-01`);
  return `${m >= 10 ? anioAgricola - 1 : anioAgricola}-${mes.slice(5, 7)}`;
}

export function vistaProximaTemporada(
  doc: ProximaTemporadaAproximada | null | undefined,
  escenarios: Partial<Record<Escenario, ClimaEscenario>>,
): VistaProximaTemporada {
  const nulos = { seco: null, habitual: null, lluvioso: null };
  if (!doc) {
    return { estado: 'NO_EVALUABLE', motivo: 'No llego la capa de proxima temporada (GET /api/proxima-temporada).', esPrediccion: false, aviso: AVISO_SIN_BANDA, metodo: null, emitido: null, meses: [], coincidencias: nulos, fuentes: [], advertencias: [] };
  }
  const base = { esPrediccion: false as const, aviso: doc.aviso, metodo: doc.metodo, emitido: doc.emitido, fuentes: doc.fuentes, advertencias: [...(doc.advertencias ?? [])] };
  if (doc.estado !== 'EXPLORATORIO') {
    return { ...base, estado: doc.estado, motivo: `La capa de proxima temporada llego como ${doc.estado}.`, meses: [], coincidencias: nulos };
  }
  const malos = problemas(doc);
  if (malos.length > 0) {
    return { ...base, estado: 'NO_EVALUABLE', motivo: `La capa no cumple el contrato: ${malos.join(' ')}`, meses: [], coincidencias: nulos };
  }

  const coincidencias: VistaProximaTemporada['coincidencias'] = { ...nulos };
  const meses: MesProximaTemporada[] = doc.meses.map((m) => {
    const porEsc = { ...nulos } as Record<Escenario, EscenarioEnMes | null>;
    for (const e of ESCENARIOS) {
      const esc = escenarios[e];
      if (!esc || esc.estado === 'ERROR_DATOS' || esc.estado === 'NO_EVALUABLE') continue;
      const mesReal = mesEnEscenario(m.mes, esc.anioReal);
      const lluvia = lluviaDelMes(esc, mesReal);
      const { inferior, superior } = m.lluviaMm;
      const posicion: PosicionEnBanda | null =
        lluvia === null || inferior === null || superior === null ? null : lluvia < inferior ? 'debajo' : lluvia > superior ? 'encima' : 'dentro';
      porEsc[e] = { anioReal: esc.anioReal, mesReal, lluviaMm: lluvia, posicion };
    }
    return { mes: m.mes, lluviaMm: m.lluviaMm, tMediaC: m.tMediaC, climatologiaLluviaMm: m.climatologiaLluviaMm ?? null, escenarios: porEsc };
  });
  for (const e of ESCENARIOS) {
    const con = meses.map((m) => m.escenarios[e]).filter((x): x is EscenarioEnMes => x !== null && x.posicion !== null);
    if (con.length > 0) coincidencias[e] = { dentro: con.filter((x) => x.posicion === 'dentro').length, deMeses: con.length };
  }
  base.advertencias.push({
    codigo: 'NO_ES_PREDICCION',
    mensaje: 'Rango aproximado por mes, no una prediccion. La comparacion con los escenarios usa la lluvia real de esos anios; no dice cual va a ocurrir.',
    severidad: 'aviso',
  });
  return { ...base, estado: 'EXPLORATORIO', meses, coincidencias };
}
