// Que modelo representa cada celda (A3.2). Puro: decide la clave del modelo con
// lo que entrega el motor (cultivo, etapa, estadoPlanta) y agrupa las celdas por
// clave para crear un InstancedMesh por combinacion cultivo + etapa.
// Nombres de archivo: <cultivo>_<etapa>.bbmodel (doc 07); el desenlace de
// estres "podrida" es su propio modelo (<cultivo>_podrida).

import type { BloqueEscena } from '../modelo';
import type { ModeloVoxel } from './bbmodel';

export type ResolucionModelo =
  | { tipo: 'bbmodel'; clave: string }
  /** No existe el .bbmodel: se usa la planta procedural de respaldo (doc 07), siempre declarada. */
  | { tipo: 'respaldo'; clave: string; motivo: string };

/**
 * Clave del modelo para un bloque, o null si no lleva planta (suelo desnudo o
 * sin cultivo). "estresada" y "marchita" usan el modelo de su etapa; su estado
 * se representa con color, patron e icono (A3.3), no con otro modelo.
 */
export function claveModelo(bloque: Pick<BloqueEscena, 'cultivo' | 'etapa' | 'registro'>): string | null {
  const { cultivo, etapa } = bloque;
  if (!cultivo || !etapa || etapa === 'suelo_desnudo') return null;
  if (bloque.registro?.estadoPlanta === 'podrida') return `${cultivo}_podrida`;
  return `${cultivo}_${etapa}`;
}

export function resolverModelo(clave: string, disponibles: ReadonlySet<string>): ResolucionModelo {
  if (disponibles.has(clave)) return { tipo: 'bbmodel', clave };
  return { tipo: 'respaldo', clave, motivo: `Sin modelo ${clave}.bbmodel en modelos/: se dibuja una planta provisional.` };
}

export interface GrupoInstancias {
  clave: string;
  resolucion: ResolucionModelo;
  bloques: BloqueEscena[];
}

/** Agrupa los bloques con planta por clave de modelo (un InstancedMesh por grupo). */
export function agruparPorModelo(bloques: readonly BloqueEscena[], disponibles: ReadonlySet<string>): GrupoInstancias[] {
  const grupos = new Map<string, GrupoInstancias>();
  for (const b of bloques) {
    const clave = claveModelo(b);
    if (!clave) continue;
    let g = grupos.get(clave);
    if (!g) {
      g = { clave, resolucion: resolverModelo(clave, disponibles), bloques: [] };
      grupos.set(clave, g);
    }
    g.bloques.push(b);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

/** Giro de la planta en pasos de 90 grados, estable por celda (variacion visual, doc 07). */
export function giroCelda(celdaId: string): 0 | 1 | 2 | 3 {
  let h = 2166136261;
  for (let k = 0; k < celdaId.length; k++) {
    h ^= celdaId.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 4) as 0 | 1 | 2 | 3;
}

/**
 * Escala por avance dentro de la etapa (doc 06: ~85 % a 100 %), tal como lo
 * entrega el motor en avanceEtapa. Sin avance (null), tamano completo de la etapa.
 */
export function escalaPorAvance(avanceEtapa: number | null): number {
  if (avanceEtapa === null || !Number.isFinite(avanceEtapa)) return 1;
  return 0.85 + 0.15 * Math.min(1, Math.max(0, avanceEtapa));
}

const ALTURA_RESPALDO: Record<string, number> = { siembra: 1, brote: 3, crecimiento: 7, madurez: 11, podrida: 4 };

/**
 * Planta procedural de respaldo (doc 07): un tallo y una copa en cajas, para no
 * bloquear la escena cuando falta un .bbmodel. Usa los indices de la paleta
 * compartida (modelos/paleta.md: 0 soil, 4 leaf_dark, 3 leaf, 16 suelo_seco).
 * No pretende parecerse al cultivo: la leyenda lo declara como provisional.
 */
export function modeloRespaldo(clave: string, textura: ModeloVoxel['textura']): ModeloVoxel {
  const etapa = clave.slice(clave.lastIndexOf('_') + 1);
  const alto = ALTURA_RESPALDO[etapa] ?? 4;
  const hoja = etapa === 'podrida' ? 16 : 3;
  const caras = (i: number) => ({ north: i, south: i, east: i, west: i, up: i, down: i });
  return {
    nombre: `respaldo_${clave}`,
    textura,
    cubos: [
      { nombre: 'lomo', desde: [-6, 0, -4], hasta: [6, 1, 4], origen: [0, 0, 0], rotacion: [0, 0, 0], caras: caras(0) },
      { nombre: 'tallo', desde: [-0.5, 1, -0.5], hasta: [0.5, 1 + alto, 0.5], origen: [0, 0, 0], rotacion: [0, 0, 0], caras: caras(4) },
      { nombre: 'copa', desde: [-2, alto * 0.6, -2], hasta: [2, 1 + alto, 2], origen: [0, 0, 0], rotacion: [0, 0, 0], caras: caras(hoja) },
    ],
  };
}
