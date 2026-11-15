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

const NOMBRE_ESTADO: Record<EstadoProblema, [string, string]> = { estresada: ['estresada', 'estresadas'], marchita: ['marchita', 'marchitas'], podrida: ['podrida', 'podridas'] };

/** "Maíz: 3 de 4 celdas con problemas (2 estresadas, 1 marchita; calor en 1)". */
export function textoProblema(p: ProblemaCultivo, nombre: string): string {
  const partes = (['podrida', 'marchita', 'estresada'] as const).filter((e) => p.estados[e]).map((e) => `${p.estados[e]} ${NOMBRE_ESTADO[e][p.estados[e] === 1 ? 0 : 1]}`);
  if (p.calor) partes.push(`calor sobre el umbral en ${p.calor}`);
  return `${nombre}: ${p.conProblema} de ${p.celdas} ${p.celdas === 1 ? 'celda' : 'celdas'} con problemas (${partes.join(', ')})`;
}

export const NOMBRE_GRAVEDAD: Record<Gravedad, string> = { aviso: 'Atención', alto: 'Problema', critico: 'Problema grave' };
