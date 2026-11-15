// Plagas en el simulador (capa ilustrativa): con los registros de presencia de GBIF cerca de la
// parcela (/api/plagas) y la tabla de cultivos hospederos con fuente, marca que celdas tienen un
// cultivo que una plaga registrada en la zona ataca. Si el usuario no aplica insecticida en esa
// celda y ciclo, la escena la dibuja comiendose la planta. No cambia el motor ni el ranking: un
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

/** Radios de la zona de plagas, en celdas. null = toda la parcela. */
export const RADIOS_PLAGA = [1, 2, 3] as const;
export const RADIO_PLAGA_INICIAL = 2;
type CeldaIJ = { id: string; i: number; j: number };

/** Celda del medio de la parcela (la mas cercana al promedio de filas y columnas): centro por defecto de la zona. */
export function celdaCentral(celdas: readonly CeldaIJ[]): string | null {
  if (!celdas.length) return null;
  const mi = celdas.reduce((s, c) => s + c.i, 0) / celdas.length;
  const mj = celdas.reduce((s, c) => s + c.j, 0) / celdas.length;
  let mejor = celdas[0]!;
  let d = Infinity;
  for (const c of celdas) {
    const x = (c.i - mi) ** 2 + (c.j - mj) ** 2;
    if (x < d) { d = x; mejor = c; }
  }
  return mejor.id;
}

/**
 * Celdas de la zona de plagas: las que estan a `radio` celdas o menos de la celda elegida (circulo: di2 + dj2 <= (radio + 0.5)2).
 * Sin celda elegida usa la central. radio null = toda la parcela. Una celda elegida que ya no existe cae a la central.
 * La escena solo dibuja insectos aqui: menos modelos cargados y una zona que el usuario puede ver y proteger.
 */
export function celdasEnRadio(celdas: readonly CeldaIJ[], centroId: string | null, radio: number | null): ReadonlySet<string> {
  if (radio === null) return new Set(celdas.map((c) => c.id));
  const centro = celdas.find((c) => c.id === centroId) ?? celdas.find((c) => c.id === celdaCentral(celdas));
  if (!centro) return new Set();
  const limite = (radio + 0.5) ** 2;
  return new Set(celdas.filter((c) => (c.i - centro.i) ** 2 + (c.j - centro.j) ** 2 <= limite).map((c) => c.id));
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
export function riesgosDelPlan(plan: PlanSiembra, celdas: readonly string[], presentes: readonly PlagaZona[], proteccion: Proteccion) {
  return plan.ciclos.flatMap((c) => {
    const porPlaga = new Map<string, { plaga: PlagaZona; cultivo: string; sinProteger: string[] }>();
    const prot = protegidas(proteccion, plan.rotacionId, c.ciclo);
    for (const celda of celdas) {
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
