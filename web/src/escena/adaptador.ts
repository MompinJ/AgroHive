// Adaptador puro (A3.1): parcela + resultado del motor -> modelo de escena.
// No calcula indicadores: solo coloca bloques y copia lo que entrega el motor.
// Lo que falta se marca como hueco (NO_EVALUABLE / sin_resultado), nunca como cero.

import type {
  Advertencia,
  Parcela,
  RegistroCelda,
  ResultadoCeldas,
} from '../../../contratos/tipos/contratos';
import {
  EXAGERACION_VERTICAL_DEFECTO,
  TOPE_CELDAS,
  type BloqueEscena,
  type EscenaModelo,
  type EstadoVisual,
  type Relieve,
} from './modelo';

export interface OpcionesEscena {
  /** Fecha de los registros a representar. Si falta, se usa la mas temprana del resultado. */
  fecha?: string;
  /** Exageracion vertical del relieve (presentacion). */
  exageracionVertical?: number;
}

export function estadoVisualDe(registro: RegistroCelda | null): { estado: EstadoVisual; motivo: string | null } {
  if (!registro) {
    return { estado: 'sin_resultado', motivo: 'El motor no entrego resultado para esta celda y fecha.' };
  }
  const motivo = registro.motivo ?? null;
  if (registro.estado === 'NO_EVALUABLE' || registro.estado === 'ERROR_DATOS') {
    return { estado: registro.estado, motivo };
  }
  if (registro.etapa === 'suelo_desnudo') return { estado: 'suelo_desnudo', motivo };
  if (registro.estadoPlanta === null) {
    return { estado: 'sin_resultado', motivo: motivo ?? 'El motor no entrego el estado de la planta.' };
  }
  return { estado: registro.estadoPlanta, motivo };
}

function agregarAviso(avisos: Advertencia[], aviso: Advertencia) {
  if (!avisos.some((a) => a.codigo === aviso.codigo && a.mensaje === aviso.mensaje)) avisos.push(aviso);
}

/** Fechas distintas presentes en el resultado, en orden cronologico (ISO). */
export function fechasDe(resultado: ResultadoCeldas | null): string[] {
  if (!resultado) return [];
  return [...new Set(resultado.registros.map((r) => r.fecha))].sort();
}

export function construirEscena(
  parcela: Parcela,
  resultado: ResultadoCeldas | null,
  opciones: OpcionesEscena = {},
): EscenaModelo {
  const exageracion = opciones.exageracionVertical ?? EXAGERACION_VERTICAL_DEFECTO;
  if (!(exageracion > 0)) throw new RangeError('La exageracion vertical debe ser mayor que cero.');

  const avisos: Advertencia[] = [];
  const esEjemplo = parcela.meta.esEjemplo || (resultado?.meta.esEjemplo ?? false);
  for (const meta of [parcela.meta, resultado?.meta]) {
    if (meta?.esEjemplo) {
      agregarAviso(avisos, {
        codigo: 'DATOS_DE_EJEMPLO',
        mensaje: meta.aviso ?? 'DATOS DE EJEMPLO, NO REALES.',
        severidad: 'critico',
      });
    }
  }
  for (const a of parcela.advertencias ?? []) agregarAviso(avisos, a);

  const base = {
    esEjemplo,
    parcelaId: parcela.id,
    exageracionVertical: exageracion,
    tamanoCeldaM: parcela.tamanoCeldaM,
  };

  if (parcela.celdas.length > TOPE_CELDAS) {
    agregarAviso(avisos, {
      codigo: 'TOPE_CELDAS_SUPERADO',
      mensaje: `La parcela tiene ${parcela.celdas.length} celdas y el tope es ${TOPE_CELDAS}: no se dibuja para no mostrar una parcela recortada.`,
      severidad: 'critico',
    });
    return { ...base, avisos, fecha: null, elevacionBaseM: null, filas: 0, columnas: 0, bloques: [] };
  }

  // Resultado: solo se usa si es de esta parcela.
  let resultadoUsable = resultado;
  if (resultado && resultado.parcelaId !== parcela.id) {
    agregarAviso(avisos, {
      codigo: 'RESULTADO_DE_OTRA_PARCELA',
      mensaje: `El resultado es de la parcela ${resultado.parcelaId}, no de ${parcela.id}: no se representa.`,
      severidad: 'critico',
    });
    resultadoUsable = null;
  }
  for (const a of resultadoUsable?.advertencias ?? []) agregarAviso(avisos, a);

  const fechas = fechasDe(resultadoUsable);
  const fecha = resultadoUsable ? (opciones.fecha ?? fechas[0] ?? null) : null;
  if (resultadoUsable && fecha !== null && !fechas.includes(fecha)) {
    agregarAviso(avisos, {
      codigo: 'FECHA_SIN_REGISTROS',
      mensaje: `El resultado no tiene registros para ${fecha}.`,
      severidad: 'aviso',
    });
  }

  const porCelda = new Map<string, RegistroCelda>();
  for (const r of resultadoUsable?.registros ?? []) {
    if (r.fecha !== fecha) continue;
    if (porCelda.has(r.celdaId)) {
      agregarAviso(avisos, {
        codigo: 'REGISTRO_DUPLICADO',
        mensaje: `La celda ${r.celdaId} tiene mas de un registro para ${fecha}: se usa el primero.`,
        severidad: 'aviso',
      });
      continue;
    }
    porCelda.set(r.celdaId, r);
  }
  const idsCeldas = new Set(parcela.celdas.map((c) => c.id));
  const ajenos = [...porCelda.keys()].filter((id) => !idsCeldas.has(id));
  if (ajenos.length > 0) {
    agregarAviso(avisos, {
      codigo: 'REGISTROS_SIN_CELDA',
      mensaje: `${ajenos.length} registro(s) del motor no corresponden a celdas de la parcela: ${ajenos.slice(0, 5).join(', ')}.`,
      severidad: 'aviso',
    });
  }

  // Relieve: altura relativa a la elevacion medida mas baja. Sin medida, hueco.
  const medidas = parcela.celdas
    .map((c) => c.elevacionM)
    .filter((e): e is number => e !== null && Number.isFinite(e));
  const elevacionBaseM = medidas.length > 0 ? Math.min(...medidas) : null;
  const faltantes = parcela.celdas.length - medidas.length;
  if (faltantes > 0) {
    agregarAviso(avisos, {
      codigo: 'ESCENA_ELEVACION_FALTANTE',
      mensaje: `${faltantes} celda(s) sin elevacion: se dibujan como hueco NO_EVALUABLE, no a nivel cero.`,
      severidad: 'aviso',
    });
  }
  if (parcela.terreno.estado !== 'EVALUABLE') {
    agregarAviso(avisos, {
      codigo: 'ESCENA_RELIEVE_ESTADO',
      mensaje: `Relieve ${parcela.terreno.estado}: ${parcela.terreno.fuente.nombre}.`,
      severidad: 'aviso',
    });
  }
  agregarAviso(avisos, {
    codigo: 'ESCENA_EXAGERACION_VERTICAL',
    mensaje: `Relieve exagerado ${exageracion} veces en vertical para que se aprecie; las celdas miden ${parcela.tamanoCeldaM} m de lado.`,
    severidad: 'info',
  });

  const iMin = Math.min(...parcela.celdas.map((c) => c.i));
  const jMin = Math.min(...parcela.celdas.map((c) => c.j));
  const filas = Math.max(...parcela.celdas.map((c) => c.i)) - iMin + 1;
  const columnas = Math.max(...parcela.celdas.map((c) => c.j)) - jMin + 1;
  // El contrato no fija hacia donde crecen i y j: se orienta con las coordenadas
  // de los centros para que el norte quede al fondo (-z) y el este a la derecha (+x),
  // igual que en el mapa. El ejemplo de contratos tiene i = 0 al norte; la
  // cuadricula de web/src/ui/cuadricula.ts, i = 0 al sur.
  const { iCreceAlNorte, jCreceAlOeste } = orientacion(parcela);

  const bloques: BloqueEscena[] = parcela.celdas.map((celda) => {
    const relieve: Relieve =
      celda.elevacionM !== null && Number.isFinite(celda.elevacionM) && elevacionBaseM !== null
        ? {
            tipo: 'medido',
            elevacionM: celda.elevacionM,
            alturaEscena: ((celda.elevacionM - elevacionBaseM) / parcela.tamanoCeldaM) * exageracion,
          }
        : { tipo: 'sin_elevacion', motivo: 'Elevacion no obtenida para esta celda (NO_EVALUABLE).' };
    const registro = porCelda.get(celda.id) ?? null;
    const { estado, motivo } = estadoVisualDe(registro);
    return {
      celdaId: celda.id,
      i: celda.i,
      j: celda.j,
      // Centrado en el origen para que la camara y los controles giren sobre la parcela.
      x: (jCreceAlOeste ? -1 : 1) * (celda.j - jMin - (columnas - 1) / 2),
      z: (iCreceAlNorte ? -1 : 1) * (celda.i - iMin - (filas - 1) / 2),
      relieve,
      pendientePct: celda.pendientePct,
      fraccionDentro: celda.fraccionDentro ?? null,
      estadoVisual: estado,
      estadoEvaluacion: registro?.estado ?? null,
      motivo,
      cultivo: registro?.cultivo ?? null,
      etapa: registro?.etapa ?? null,
      avanceEtapa: registro?.avanceEtapa ?? null,
      noRecomendadoEnLugar: registro?.noRecomendadoEnLugar ?? false,
      registro,
    };
  });

  return { ...base, avisos, fecha, elevacionBaseM, filas, columnas, bloques };
}

/** Promedio de una coordenada (0 lon, 1 lat) de las celdas con un indice dado. */
function promedio(celdas: Parcela['celdas'], campo: 'i' | 'j', valor: number, eje: 0 | 1): number {
  const sel = celdas.filter((c) => c[campo] === valor);
  return sel.reduce((s, c) => s + c.centro[eje], 0) / sel.length;
}

/** Hacia donde crecen las filas y columnas segun los centros (por defecto, como el ejemplo de contratos). */
export function orientacion(parcela: Parcela): { iCreceAlNorte: boolean; jCreceAlOeste: boolean } {
  const is = parcela.celdas.map((c) => c.i);
  const js = parcela.celdas.map((c) => c.j);
  const [iMin, iMax, jMin, jMax] = [Math.min(...is), Math.max(...is), Math.min(...js), Math.max(...js)];
  const iCreceAlNorte = iMax > iMin && promedio(parcela.celdas, 'i', iMax, 1) > promedio(parcela.celdas, 'i', iMin, 1);
  const jCreceAlOeste = jMax > jMin && promedio(parcela.celdas, 'j', jMax, 0) < promedio(parcela.celdas, 'j', jMin, 0);
  return { iCreceAlNorte, jCreceAlOeste };
}
