import { tt } from '../ui/i18n/actual';
import type { ClaveTexto } from '../ui/i18n/diccionarios';
// Problemas de un cultivo en la simulacion, para la mini marca de su seccion. Puro: lee lo que el motor ya entrego en cada
// registro de celda (estado de la planta y calor sobre el umbral); no calcula nada nuevo.
//
// UNA entrada por cultivo (el grupo de celdas de la misma planta), no una por celda: la marca dice cuantas celdas del grupo
// tienen problemas y de que tipo.

export type Gravedad = 'aviso' | 'alto' | 'critico';
export type EstadoProblema = 'estresada' | 'marchita' | 'podrida';

export interface RegistroProblema {
  cultivo?: string | null;
  estado?: string;
  estadoPlanta?: string | null;
  estresCalor?: boolean | null;
}

export interface ProblemaCultivo {
  cultivo: string;
  /** Celdas del grupo (todas las del cultivo, con o sin problema). */
  celdas: number;
  conProblema: number;
  gravedad: Gravedad;
  estados: Partial<Record<EstadoProblema, number>>;
  /** Celdas donde el motor marca calor sobre el umbral del cultivo. */
  calor: number;
}

const GRAVEDAD: Record<EstadoProblema, Gravedad> = { estresada: 'aviso', marchita: 'alto', podrida: 'critico' };
const PESO: Record<Gravedad, number> = { aviso: 1, alto: 2, critico: 3 };
const esProblema = (x: string | null | undefined): x is EstadoProblema => x === 'estresada' || x === 'marchita' || x === 'podrida';

/** Cultivos con problemas en esa fecha, del mas grave al menos grave; los cultivos sin problemas no aparecen. */
export function problemasPorCultivo(registros: readonly RegistroProblema[]): ProblemaCultivo[] {
  const grupos = new Map<string, ProblemaCultivo>();
  for (const r of registros) {
    if (!r.cultivo) continue;
    const g = grupos.get(r.cultivo) ?? { cultivo: r.cultivo, celdas: 0, conProblema: 0, gravedad: 'aviso' as Gravedad, estados: {}, calor: 0 };
    g.celdas += 1;
    grupos.set(r.cultivo, g);
    if (r.estado !== undefined && r.estado !== 'EVALUABLE') continue; // lo no evaluable no es un problema: es falta de dato
    const estado = esProblema(r.estadoPlanta) ? r.estadoPlanta : null;
    const calor = r.estresCalor === true;
    if (!estado && !calor) continue;
    g.conProblema += 1;
    if (calor) g.calor += 1;
    if (estado) {
      g.estados[estado] = (g.estados[estado] ?? 0) + 1;
      if (PESO[GRAVEDAD[estado]] > PESO[g.gravedad]) g.gravedad = GRAVEDAD[estado];
    }
  }
  return [...grupos.values()].filter((g) => g.conProblema > 0).sort((a, b) => PESO[b.gravedad] - PESO[a.gravedad] || b.conProblema - a.conProblema || a.cultivo.localeCompare(b.cultivo));
}

const NOMBRE_ESTADO: Record<EstadoProblema, [ClaveTexto, ClaveTexto]> = { estresada: ['prob.estresada', 'prob.estresadas'], marchita: ['prob.marchita', 'prob.marchitas'], podrida: ['prob.podrida', 'prob.podridas'] };

/** "Maíz: 3 de 4 celdas con problemas (2 estresadas, 1 marchita; calor en 1)". */
export function textoProblema(p: ProblemaCultivo, nombre: string): string {
  const partes = (['podrida', 'marchita', 'estresada'] as const).filter((e) => p.estados[e]).map((e) => `${p.estados[e]} ${tt(NOMBRE_ESTADO[e][p.estados[e] === 1 ? 0 : 1])}`);
  if (p.calor) partes.push(tt('prob.calor', { n: p.calor }));
  return tt('prob.texto', { nombre, n: p.conProblema, total: p.celdas, celdas: p.celdas === 1 ? tt('esc3d.celdaS') : tt('esc3d.celdasP'), partes: partes.join(', ') });
}

export const NOMBRE_GRAVEDAD: Record<Gravedad, string> = { get aviso() { return tt('grav.aviso'); }, get alto() { return tt('grav.alto'); }, get critico() { return tt('grav.critico'); } };
