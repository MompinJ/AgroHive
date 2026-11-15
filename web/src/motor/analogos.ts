// A2.13: escenario "proxima temporada" con anios analogos reales ([DECIDIDO] 14/11, Mompin). EXPLORATORIO, sin ranking.
//
// Criterio: el anio agricola t es analogo si su lluvia mensual real cae dentro de la banda de lluvia (p10 a p90) de
// la capa proxima-temporada en todos los meses del horizonte (octubre a diciembre en t-1, enero a septiembre en t,
// como SIAP_CICLOS). Solo lluvia: la temperatura no entra. Si ningun anio cae en todos los meses, se usan los anios
// con mas meses dentro, y se declara. Solo se simulan los ciclos del plan sembrados en un mes del horizonte (lo que el
// usuario va a sembrar ahora); con dias reales consecutivos del anio analogo, sin generar series a partir de la banda.
// El resultado es un rango (minimo y maximo entre los anios analogos), nunca una cifra.
import { peorEstado, sinNumeros } from './estados';
import { mesDe } from './fechas';
import { pilaresAguaEnClima, simularRotacion, type ClimaParaSimular, type EntradasMotor, type ResultadoMotor } from './motor';
import { lluviaMensual, mesEnEscenario, vistaProximaTemporada } from './proxima';
import { VERSION_CONTRATO, type DiaClima, type ProximaTemporadaAproximada, type ProximaTemporadaRotacion, type SerieClima } from './tipos';

export const AVISO_ANALOGOS = 'Anios parecidos a lo que se espera para los proximos meses; no es una prediccion.';

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export interface AnioCandidato {
  anio: number;
  mesesDentro: number;
  deMeses: number;
}

/** Cuantos meses del horizonte caen dentro de la banda, por anio agricola con todos los meses completos. */
export function candidatosAnalogos(capa: ProximaTemporadaAproximada, diario: readonly DiaClima[]): AnioCandidato[] {
  const meses = capa.meses.filter((m) => m.lluviaMm.inferior !== null && m.lluviaMm.superior !== null);
  if (meses.length === 0 || diario.length === 0) return [];
  const fechas = diario.map((d) => d.fecha).sort();
  const primero = Number((fechas[0] as string).slice(0, 4));
  const ultimo = Number((fechas[fechas.length - 1] as string).slice(0, 4));
  const salida: AnioCandidato[] = [];
  for (let t = primero; t <= ultimo + 1; t++) {
    let dentro = 0;
    let completo = true;
    for (const m of meses) {
      const ll = lluviaMensual(diario, mesEnEscenario(m.mes, t));
      if (ll === null) {
        completo = false;
        break;
      }
      if (ll >= (m.lluviaMm.inferior as number) && ll <= (m.lluviaMm.superior as number)) dentro++;
    }
    // H-M6: sin anio de corte escrito a mano (antes `t <= 2025`): entra todo anio con los meses del horizonte completos, y
    // el anio del propio horizonte (el que se esta por vivir) nunca esta completo en la serie historica.
    if (completo) salida.push({ anio: t, mesesDentro: dentro, deMeses: meses.length });
  }
  return salida;
}

function climaDeAnio(serie: SerieClima, t: number): ClimaParaSimular {
  const desde = `${t - 1}-10-01`;
  const hasta = `${t + 1}-03-31`;
  return {
    meta: { versionContrato: VERSION_CONTRATO, esEjemplo: serie.meta.esEjemplo, ...(serie.meta.aviso ? { aviso: serie.meta.aviso } : {}) },
    anioReal: t,
    estado: serie.meta.esEjemplo ? peorEstado(serie.estado, 'EXPLORATORIO') : serie.estado,
    respaldo: serie.respaldo,
    fuente: serie.fuente,
    diario: serie.diario.filter((d) => d.fecha >= desde && d.fecha <= hasta).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)),
  };
}

const vacio = { inferior: null, superior: null };

// Solo se llama con una capa que trae meses: emitido y horizonte salen de ella, nunca de un valor por defecto.
function sinResultado(
  estado: 'NO_EVALUABLE' | 'ERROR_DATOS',
  motivo: string,
  capa: ProximaTemporadaAproximada,
  extra: Partial<ProximaTemporadaRotacion> = {},
): ProximaTemporadaRotacion {
  const meses = capa.meses as { mes: string }[];
  return {
    estado,
    motivo,
    esPrediccion: false,
    aviso: AVISO_ANALOGOS,
    emitido: capa.emitido,
    horizonte: { desde: (meses[0] as { mes: string }).mes, hasta: (meses[meses.length - 1] as { mes: string }).mes },
    criterioAnalogos: 'Sin anios analogos.',
    ciclosEvaluados: [],
    aniosAnalogos: [],
    rango: { proporcionDemandaNoCubierta: vacio, fraccionLluviaPercolada: vacio, excesoTotalMm: vacio },
    fuentes: capa.fuentes,
    ...extra,
  };
}

const rango = (xs: number[]) => (xs.length === 0 ? vacio : { inferior: Math.min(...xs), superior: Math.max(...xs) });

/**
 * Bloque proximaTemporada de una rotacion: anios analogos, sus pilares de agua y el rango entre ellos. null si no hay
 * una capa con meses: sin ella no hay fecha de emision ni horizonte que declarar, y el bloque es opcional.
 */
export function proximaTemporadaRotacion(
  e: EntradasMotor,
  capa: ProximaTemporadaAproximada | null | undefined,
  serie: SerieClima | null | undefined,
): ProximaTemporadaRotacion | null {
  if (!capa || capa.meses.length === 0) return null;
  const vista = vistaProximaTemporada(capa, {});
  if (vista.estado !== 'EXPLORATORIO') {
    return sinResultado(vista.estado === 'ERROR_DATOS' ? 'ERROR_DATOS' : 'NO_EVALUABLE', vista.motivo ?? 'La capa de proxima temporada no es valida.', capa);
  }
  if (!serie || sinNumeros(serie.estado)) {
    return sinResultado(serie?.estado === 'ERROR_DATOS' ? 'ERROR_DATOS' : 'NO_EVALUABLE', 'Sin la serie historica completa para buscar anios analogos.', capa);
  }

  // Ciclos que se siembran dentro del horizonte.
  const mesesHorizonte = new Set(capa.meses.map((m) => mesDe(`${m.mes}-01`)));
  const nombres = [...mesesHorizonte].map((m) => NOMBRES_MES[m - 1]).join(', ');
  const ciclosEvaluados: number[] = [];
  const ciclosFuera: { ciclo: number; motivo: string }[] = [];
  for (const c of e.plan.ciclos) {
    if (mesesHorizonte.has(mesDe(c.siembra))) ciclosEvaluados.push(c.ciclo);
    else ciclosFuera.push({ ciclo: c.ciclo, motivo: `Se siembra en ${NOMBRES_MES[mesDe(c.siembra) - 1]}, fuera del horizonte (${nombres}).` });
  }
  const horizonte = { desde: (capa.meses[0] as { mes: string }).mes, hasta: (capa.meses[capa.meses.length - 1] as { mes: string }).mes };
  const extraBase = { horizonte, emitido: capa.emitido, ciclosFuera };
  if (ciclosEvaluados.length === 0) {
    return sinResultado('NO_EVALUABLE', `Ningun ciclo del plan se siembra dentro del horizonte (${nombres}).`, capa, extraBase);
  }

  const cand = candidatosAnalogos(capa, serie.diario);
  const deMeses = cand[0]?.deMeses ?? 0;
  const maxDentro = Math.max(0, ...cand.map((c) => c.mesesDentro));
  if (cand.length === 0 || maxDentro === 0) {
    return sinResultado('NO_EVALUABLE', 'Ningun anio del historico cae dentro de la banda de lluvia en algun mes del horizonte.', capa, { ...extraBase, ciclosEvaluados });
  }
  const analogos = cand.filter((c) => c.mesesDentro === maxDentro).sort((a, b) => a.anio - b.anio);
  const todos = maxDentro === deMeses;
  const criterioAnalogos =
    (todos
      ? `Anios agricolas cuya lluvia mensual real cae dentro de la banda p${capa.banda.percentilInferior}-p${capa.banda.percentilSuperior} de lluvia en los ${deMeses} meses del horizonte`
      : `Ningun anio cae dentro de la banda en los ${deMeses} meses: se usan los que caen en mas meses (${maxDentro} de ${deMeses})`) +
    ` (${analogos.length} de ${cand.length} anios con datos completos). Solo lluvia; octubre a diciembre del anio t-1 y enero a septiembre de t.`;

  // El plan solo con los ciclos del horizonte.
  const plan = {
    ...e.plan,
    ciclos: e.plan.ciclos.filter((c) => ciclosEvaluados.includes(c.ciclo)) as typeof e.plan.ciclos,
    porCelda: e.plan.porCelda
      ? Object.fromEntries(
          Object.entries(e.plan.porCelda)
            .map(([k, v]) => [k, v.filter((x) => ciclosEvaluados.includes(x.ciclo))] as const)
            .filter(([, v]) => v.length > 0),
        )
      : null,
  } as typeof e.plan;
  const entradas = { ...e, plan };

  const anios: ProximaTemporadaRotacion['aniosAnalogos'] = analogos.map((a) => {
    const r = pilaresAguaEnClima(entradas, climaDeAnio(serie, a.anio));
    const estado = sinNumeros(r.estado) ? r.estado : peorEstado(r.estado, 'EXPLORATORIO');
    const motivoExpl = 'Anio analogo de la proxima temporada: ilustra, no predice.';
    const deficit = sinNumeros(r.estado) ? r.deficitHidrico : { ...r.deficitHidrico, estado, motivo: r.deficitHidrico.motivo ?? motivoExpl };
    const exceso = r.exceso
      ? { estado, motivo: motivoExpl, excesoTotalMm: r.exceso.mm, diasExceso: r.exceso.dias, fraccionLluviaPercolada: r.exceso.fraccionLluviaPercolada }
      : { estado, motivo: r.motivo ?? `Anio ${a.anio} ${r.estado}.`, excesoTotalMm: null, diasExceso: null, fraccionLluviaPercolada: null };
    const item: ProximaTemporadaRotacion['aniosAnalogos'][number] = {
      anioReal: a.anio,
      mesesDentro: a.mesesDentro,
      deMeses: a.deMeses,
      estado,
      deficitHidrico: deficit,
      excesoHidrico: exceso,
    };
    item.motivo = r.motivo ?? motivoExpl;
    return item;
  });
  const conNumeros = anios.filter((a) => a.deficitHidrico.proporcionDemandaNoCubierta !== null);
  if (conNumeros.length === 0) {
    const motivo = anios.find((a) => a.motivo)?.motivo ?? 'Ningun anio analogo se pudo simular.';
    return sinResultado('NO_EVALUABLE', motivo, capa, { ...extraBase, ciclosEvaluados, criterioAnalogos, aniosAnalogos: [] });
  }
  return {
    estado: 'EXPLORATORIO',
    esPrediccion: false,
    aviso: AVISO_ANALOGOS + (conNumeros.length === 1 ? ' Solo hay un anio analogo: el rango es un solo anio real.' : ''),
    emitido: capa.emitido,
    horizonte,
    criterioAnalogos,
    ciclosEvaluados,
    ...(ciclosFuera.length > 0 ? { ciclosFuera } : {}),
    aniosAnalogos: anios,
    rango: {
      proporcionDemandaNoCubierta: rango(conNumeros.map((a) => a.deficitHidrico.proporcionDemandaNoCubierta as number)),
      fraccionLluviaPercolada: rango(conNumeros.map((a) => a.excesoHidrico.fraccionLluviaPercolada).filter((x): x is number => x !== null)),
      excesoTotalMm: rango(conNumeros.map((a) => a.excesoHidrico.excesoTotalMm).filter((x): x is number => x !== null)),
    },
    fuentes: [...capa.fuentes, serie.fuente] as ProximaTemporadaRotacion['fuentes'],
  };
}

/**
 * simularRotacion mas el bloque proximaTemporada cuando las entradas traen la capa y la serie completa. El bloque no
 * cambia el estado ni el ranking de la rotacion: es EXPLORATORIO y va aparte.
 */
export function simularRotacionCompleta(e: EntradasMotor): ResultadoMotor {
  const r = simularRotacion(e);
  if (e.proximaTemporada) {
    const bloque = proximaTemporadaRotacion(e, e.proximaTemporada.capa, e.proximaTemporada.serie);
    if (!bloque) {
      r.rotacion.advertencias.push({ codigo: 'PROXIMA_TEMPORADA_NO_DISPONIBLE', mensaje: 'No llego la capa de proxima temporada: no hay anios analogos.', severidad: 'info' });
      return r;
    }
    r.rotacion.proximaTemporada = bloque;
    r.rotacion.advertencias.push({
      codigo: 'PROXIMA_TEMPORADA_EXPLORATORIA',
      mensaje:
        bloque.estado === 'EXPLORATORIO'
          ? `${AVISO_ANALOGOS} ${bloque.aniosAnalogos.length} anios analogos (${bloque.aniosAnalogos.map((a) => a.anioReal).join(', ')}); no entran al ranking.`
          : `Proxima temporada: ${bloque.motivo ?? bloque.estado}`,
      severidad: 'info',
    });
  }
  return r;
}
