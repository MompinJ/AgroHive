import type { ResultadoRotacion } from '../../../contratos/tipos/contratos';

export function ordenarRotaciones(rotaciones: readonly ResultadoRotacion[]): ResultadoRotacion[] {
  return [...rotaciones].sort((a, b) => (a.ranking?.posicion ?? Infinity) - (b.ranking?.posicion ?? Infinity) || a.rotacionId.localeCompare(b.rotacionId));
}
