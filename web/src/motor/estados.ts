// A2.7: estados de evaluabilidad de doc 04 y como se combinan.
// Del mas fuerte al mas debil: ERROR_DATOS > NO_EVALUABLE > EXPLORATORIO > RESPALDO_HISTORICO > EVALUABLE.
// Un resultado hereda el estado mas fuerte de sus entradas: por ejemplo, un ciclo con clima de respaldo es
// RESPALDO_HISTORICO, y una rotacion con un cultivo no registrado en el lugar no pasa de EXPLORATORIO.
import type { Advertencia, EstadoEvaluacion } from './tipos';

const FUERZA: Record<EstadoEvaluacion, number> = {
  EVALUABLE: 0,
  RESPALDO_HISTORICO: 1,
  EXPLORATORIO: 2,
  NO_EVALUABLE: 3,
  ERROR_DATOS: 4,
};

export function peorEstado(...estados: EstadoEvaluacion[]): EstadoEvaluacion {
  let peor: EstadoEvaluacion = 'EVALUABLE';
  for (const e of estados) if (FUERZA[e] > FUERZA[peor]) peor = e;
  return peor;
}

/** true si el estado obliga a dejar todos los indicadores en null (doc 05, prueba 5). */
export function sinNumeros(e: EstadoEvaluacion): boolean {
  return e === 'NO_EVALUABLE' || e === 'ERROR_DATOS';
}

/** Junta advertencias sin repetir codigo y mensaje, en orden de aparicion. */
export function juntarAdvertencias(...listas: (readonly Advertencia[] | undefined)[]): Advertencia[] {
  const vistas = new Set<string>();
  const salida: Advertencia[] = [];
  for (const l of listas) {
    for (const a of l ?? []) {
      const k = `${a.codigo}|${a.mensaje}`;
      if (!vistas.has(k)) {
        vistas.add(k);
        salida.push(a);
      }
    }
  }
  return salida;
}
