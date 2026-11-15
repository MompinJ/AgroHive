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
