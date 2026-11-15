// Plagas en el simulador (capa ilustrativa): con los registros de presencia de GBIF cerca de la
// parcela (/api/plagas) y la tabla de cultivos hospederos con fuente, marca en que celdas hay plaga: en cada
// cultivo que una plaga registrada ataca, solo cerca del 20 % de las celdas (un foco fijo). Si el usuario
// no aplica insecticida en esa celda y ciclo, la escena la dibuja comiendose la planta. No cambia el motor ni el ranking: un
// registro de presencia no es un pronostico de dano.
import type { PlanSiembra } from '../../../../contratos/tipos/contratos';
import { cultivoDeCelda } from '../planes';

export type TipoPlaga = 'chapulin' | 'gusano' | 'mosca' | 'escarabajo' | 'pulgon';
export interface PlagaZona {
  id: string;
  nombreComun: string;
  nombreCientifico?: string;
  tipoVisual: TipoPlaga;
  estado: string;
  registros?: number | null;
  ultimoAnio?: number | null;
  cultivos: readonly string[];
}
/** Celdas protegidas con insecticida: por rotacion y por ciclo. */
export type Proteccion = Record<string, Record<string, string[]>>;

/** Plagas con registros cerca, de la mas registrada a la menos. */
export function plagasPresentes(plagas: readonly PlagaZona[] | null | undefined): PlagaZona[] {
  return [...(plagas ?? [])].filter((p) => p.estado === 'presente').sort((a, b) => (b.registros ?? 0) - (a.registros ?? 0));
}

/** La plaga presente mas registrada que ataca ese cultivo, si hay. */
export function plagaDeCultivo(presentes: readonly PlagaZona[], cultivo: string | null | undefined): PlagaZona | undefined {
  return cultivo ? presentes.find((p) => p.cultivos.includes(cultivo)) : undefined;
}

/** Huella de la malla de la parcela (tamano de celda y ids). Si cambia, las celdas ya no son las mismas: la proteccion guardada no aplica. */
export function firmaMalla(celdas: readonly string[], tamanoCeldaM: number): string {
  let h = 0x811c9dc5; // FNV-1a de 32 bits: basta para distinguir mallas, no es seguridad
  for (const s of [String(tamanoCeldaM), ...celdas]) for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

/** Celdas que una plaga ataca en el ciclo y que no tienen insecticida: lo que "proteger" debe cubrir, sin el resto de la parcela. */
export function celdasEnRiesgo(riesgos: readonly { sinProteger: readonly string[] }[]): string[] {
  return [...new Set(riesgos.flatMap((r) => r.sinProteger))];
}

type CeldaIJ = { id: string; i: number; j: number };

/** Fraccion de las celdas de un grupo (mismo cultivo) donde aparece la plaga: no ataca toda la parcela de golpe. */
export const FRACCION_CON_PLAGA = 0.2;

/** Cuantas celdas de un grupo de `n` llevan la plaga: el 20 % redondeado y, si hay grupo, al menos una. */
export function cuantasConPlaga(n: number, fraccion = FRACCION_CON_PLAGA): number {
  return n <= 0 ? 0 : Math.min(n, Math.max(1, Math.round(n * fraccion)));
}

function hash(texto: string): number {
  let h = 0x811c9dc5; // FNV-1a de 32 bits: reparte la semilla, no es seguridad
  for (let k = 0; k < texto.length; k++) { h ^= texto.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

/**
 * Las celdas de un grupo donde aparece la plaga: un foco de celdas contiguas. Una celda de arranque la fija `semilla` (misma semilla y mismo
 * grupo, mismo foco: los insectos no saltan de una celda a otra al recalcular) y se suman las mas cercanas hasta llegar al 20 % del grupo.
 * No depende del orden en que lleguen las celdas.
 */
export function focoDelGrupo(grupo: readonly CeldaIJ[], semilla: string, fraccion = FRACCION_CON_PLAGA): string[] {
  const k = cuantasConPlaga(grupo.length, fraccion);
  if (k === 0) return [];
  const ordenado = [...grupo].sort((a, b) => a.i - b.i || a.j - b.j);
  const arranque = ordenado[hash(semilla) % ordenado.length]!;
  return ordenado
    .map((c) => ({ c, d: (c.i - arranque.i) ** 2 + (c.j - arranque.j) ** 2 }))
    .sort((x, y) => x.d - y.d || x.c.i - y.c.i || x.c.j - y.c.j)
    .slice(0, k)
    .map((x) => x.c.id);
}

/**
 * Celdas con plaga en un ciclo. La zona de cada cultivo atacado (el 20 % de las celdas de la PARCELA, un foco) se fija con el plan, el ciclo, el
 * cultivo y la plaga, y no depende de que se haya plantado: una celda lleva la plaga si su cultivo es atacado y cae en la zona de ese cultivo.
 * Asi, plantar o borrar algo solo hace aparecer o desaparecer la plaga en las celdas afectadas; las demas no se mueven. Es ilustrativo.
 */
export function celdasConPlaga(plan: PlanSiembra, celdas: readonly CeldaIJ[], presentes: readonly PlagaZona[], ciclo: number): Set<string> {
  const grupos = new Map<string, { semilla: string; celdas: CeldaIJ[] }>();
  for (const c of celdas) {
    const cultivo = cultivoDeCelda(plan, c.id, ciclo);
    const plaga = plagaDeCultivo(presentes, cultivo);
    if (!plaga || !cultivo) continue;
    const g = grupos.get(cultivo) ?? { semilla: `${plan.rotacionId}:${ciclo}:${cultivo}:${plaga.id}`, celdas: [] };
    g.celdas.push(c);
    grupos.set(cultivo, g);
  }
  const salida = new Set<string>();
  for (const g of grupos.values()) {
    const zona = new Set(focoDelGrupo(celdas, g.semilla));
    const dentro = g.celdas.filter((c) => zona.has(c.id));
    // Un cultivo atacado siempre tiene plaga: si no cayo nada en su zona fija, la plaga va a su propio foco (el 20 % de ese cultivo, al menos una celda).
    for (const id of dentro.length > 0 ? dentro.map((c) => c.id) : focoDelGrupo(g.celdas, g.semilla)) salida.add(id);
  }
  return salida;
}

/** Los focos de un plan por ciclo, con cache: `focos(ciclo)` da las celdas con plaga en ese ciclo. */
export function focosDelPlan(plan: PlanSiembra, celdas: readonly CeldaIJ[], presentes: readonly PlagaZona[]): (ciclo: number) => ReadonlySet<string> {
  const cache = new Map<number, Set<string>>();
  return (ciclo) => { let f = cache.get(ciclo); if (!f) { f = celdasConPlaga(plan, celdas, presentes, ciclo); cache.set(ciclo, f); } return f; };
}

export function protegidas(proteccion: Proteccion, rotacion: string, ciclo: number): ReadonlySet<string> {
  return new Set(proteccion[rotacion]?.[String(ciclo)] ?? []);
}

export function proteger(proteccion: Proteccion, rotacion: string, ciclo: number, celdas: readonly string[], quitar = false): Proteccion {
  const actuales = new Set(proteccion[rotacion]?.[String(ciclo)] ?? []);
  for (const c of celdas) { if (quitar) actuales.delete(c); else actuales.add(c); }
  return { ...proteccion, [rotacion]: { ...(proteccion[rotacion] ?? {}), [String(ciclo)]: [...actuales].sort() } };
}

/** Mapa para la escena: celdas con cultivo atacado por una plaga presente y sin insecticida. */
export function mapaPlagas(
  registros: readonly { celdaId: string; cultivo?: string | null; ciclo?: number | null }[],
  presentes: readonly PlagaZona[], proteccion: Proteccion, rotacion: string,
): Map<string, { tipo: TipoPlaga; comiendo: boolean; nombre: string }> {
  const salida = new Map<string, { tipo: TipoPlaga; comiendo: boolean; nombre: string }>();
  for (const r of registros) {
    if (r.ciclo == null || !r.cultivo) continue;
    const plaga = plagaDeCultivo(presentes, r.cultivo);
    if (!plaga || protegidas(proteccion, rotacion, r.ciclo).has(r.celdaId)) continue;
    salida.set(r.celdaId, { tipo: plaga.tipoVisual, comiendo: true, nombre: plaga.nombreComun });
  }
  return salida;
}

/** Por ciclo: que plaga ataca y cuantas celdas quedan sin insecticida en el plan. */
export function riesgosDelPlan(plan: PlanSiembra, celdas: readonly string[], presentes: readonly PlagaZona[], proteccion: Proteccion, focos?: (ciclo: number) => ReadonlySet<string>) {
  return plan.ciclos.flatMap((c) => {
    const porPlaga = new Map<string, { plaga: PlagaZona; cultivo: string; sinProteger: string[] }>();
    const prot = protegidas(proteccion, plan.rotacionId, c.ciclo);
    const foco = focos?.(c.ciclo);
    for (const celda of celdas) {
      if (foco && !foco.has(celda)) continue; // la plaga solo esta en su foco
      const cultivo = cultivoDeCelda(plan, celda, c.ciclo);
      const plaga = plagaDeCultivo(presentes, cultivo);
      if (!plaga || !cultivo || prot.has(celda)) continue;
      const clave = `${plaga.id}:${cultivo}`;
      const e = porPlaga.get(clave) ?? { plaga, cultivo, sinProteger: [] };
      e.sinProteger.push(celda);
      porPlaga.set(clave, e);
    }
    return [...porPlaga.values()].map((e) => ({ ciclo: c.ciclo, ...e }));
  });
}
