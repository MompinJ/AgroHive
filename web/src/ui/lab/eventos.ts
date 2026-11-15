// Eventos a pantalla completa del laboratorio (paso Escenarios): cosecha y plaga. Puro: decide cuando se
// cruzan y que dicen; no calcula ni cambia nada del motor.
//
// Cosecha: el ultimo dia del ciclo que simula el motor (rango.hasta). Es el dia en que se cosecha segun el motor.
// Plaga: ILUSTRATIVA. Los registros de GBIF dicen que la plaga esta en la region, no cuando ataca; por eso el
// momento (la mitad del ciclo) es una convencion de dibujo `[PROPUESTA]` y el mensaje lo dice. No se predice dano.

import type { RangoTiempo } from '../tiempo';
import { fechaEnIndice } from '../tiempo';

/** Segundos extra (ms) que la reproduccion espera despues de que un aviso o una animacion termina, para que se alcance a leer. */
export const PAUSA_EXTRA_EVENTO_MS = 2500;

export type TipoEvento = 'cosecha' | 'plaga' | 'muerte';
export interface EventoPantalla { tipo: TipoEvento; clave: string; titulo: string; detalle: string; /** Fecha de la simulacion a la que se refiere. */ fecha: string }
/** Un cultivo del ciclo con el dia de su cosecha (siembra mas los dias de su ciclo, o el ultimo dia simulado si no hay dato). */
export interface CultivoCosechado { nombre: string; celdas: number; fecha: string }
export interface PlantasMuertas { nombre: string; estado: 'marchita' | 'podrida'; celdas: number }
export interface PlagaActiva { plaga: string; cultivo: string; bloques: number }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10-17" -> "17 de octubre de 2026". Una fecha invalida se devuelve tal cual: no se inventa otra. */
export function fechaLarga(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : fecha;
}

/** Mitad del ciclo (convencion de dibujo para la plaga). */
export function momentoPlaga(rango: RangoTiempo): string {
  return fechaEnIndice(rango.desde, Math.floor(rango.pasos / 2));
}

/** true si al pasar de `anterior` a `actual` se llego a `marca` avanzando; sin fecha anterior o al retroceder, no. */
export function cruzo(anterior: string | null, actual: string, marca: string): boolean {
  return anterior !== null && anterior < marca && marca <= actual;
}

const celdas = (n: number) => `${n} ${n === 1 ? 'celda' : 'celdas'}`;
const bloques = (n: number) => `${n} ${n === 1 ? 'bloque' : 'bloques'}`;

function lista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

export function eventoCosecha(fecha: string, cultivos: readonly CultivoCosechado[], plaga: PlagaActiva | null, clave: string): EventoPantalla {
  const total = cultivos.reduce((s, c) => s + c.celdas, 0);
  const titulo = cultivos.length === 1
    ? `${cultivos[0]!.nombre} se cosecha el ${fechaLarga(fecha)}`
    : `Se cosechan ${lista(cultivos.map((c) => c.nombre.toLowerCase()))} el ${fechaLarga(fecha)}`;
  const partes = [cultivos.length > 1 ? cultivos.map((c) => `${c.nombre}: ${celdas(c.celdas)}`).join(' · ') : `Se cosechan ${celdas(total)}`];
  if (plaga) partes.push(`Quedaron ${bloques(plaga.bloques)} sin insecticida frente a ${plaga.plaga.toLowerCase()} (ilustración, no un pronóstico de daño).`);
  return { tipo: 'cosecha', clave: `${clave}:cosecha`, fecha, titulo, detalle: partes.join('. ').replace(/\.\./g, '.') };
}

export function eventoPlaga(fecha: string, plaga: PlagaActiva, clave: string): EventoPantalla {
  return {
    tipo: 'plaga',
    clave: `${clave}:plaga`,
    fecha,
    titulo: `${plaga.plaga} se está comiendo tu ${plaga.cultivo.toLowerCase()}`,
    detalle: `${bloques(plaga.bloques)} sin insecticida, hacia el ${fechaLarga(fecha)}. Es una ilustración: la plaga está registrada en tu zona, pero no se predice cuándo ataca ni cuánto daño haría.`,
  };
}

/** Hojas y estados de planta que mueren, en lenguaje llano. */
const VERBO_MUERTE = { marchita: 'se marchitan', podrida: 'se pudren' } as const;

export function eventoMuerte(fecha: string, muertas: readonly PlantasMuertas[], clave: string): EventoPantalla {
  const total = muertas.reduce((s, m) => s + m.celdas, 0);
  const una = muertas.length === 1 ? muertas[0]! : null;
  const titulo = una
    ? `${una.nombre}: ${una.celdas === 1 ? 'una planta' : 'las plantas'} ${una.celdas === 1 ? (una.estado === 'marchita' ? 'se marchita' : 'se pudre') : VERBO_MUERTE[una.estado]} (${celdas(una.celdas)})`
    : `Mueren plantas en ${celdas(total)}`;
  const detalle = (una ? [] : muertas.map((m) => `${m.nombre}: ${celdas(m.celdas)} (${m.estado === 'marchita' ? 'marchitas' : 'podridas'})`)).concat(['Según el balance de agua del motor en esa fecha: el agua o el exceso de agua las dejó sin remedio.']).join('. ');
  return { tipo: 'muerte', clave: `${clave}:muerte:${fecha}`, fecha, titulo, detalle };
}

/**
 * Eventos al avanzar de `anterior` a `actual` dentro del ciclo `rango`:
 *  - plaga: a la mitad del ciclo, solo si quedan bloques sin insecticida (ilustrativa);
 *  - cosecha: UNA por cada dia en que algun cultivo del ciclo llega a su cosecha (cada cultivo en su fecha; los que coinciden van juntos).
 * Si un salto cruza varias marcas salen todas, en orden de fecha.
 */
export function eventosAlAvanzar(a: {
  anterior: string | null; actual: string; rango: RangoTiempo; clave: string;
  cosecha: readonly CultivoCosechado[]; plaga: PlagaActiva | null;
}): EventoPantalla[] {
  const salida: EventoPantalla[] = [];
  const mitad = momentoPlaga(a.rango);
  if (a.plaga && a.plaga.bloques > 0 && cruzo(a.anterior, a.actual, mitad)) salida.push(eventoPlaga(mitad, a.plaga, a.clave));
  const porFecha = new Map<string, CultivoCosechado[]>();
  for (const c of a.cosecha) if (cruzo(a.anterior, a.actual, c.fecha)) porFecha.set(c.fecha, [...(porFecha.get(c.fecha) ?? []), c]);
  for (const fecha of [...porFecha.keys()].sort()) salida.push(eventoCosecha(fecha, porFecha.get(fecha)!, a.plaga && a.plaga.bloques > 0 ? a.plaga : null, a.clave));
  return salida;
}

/** Celdas cuya planta paso de viva a marchita o podrida entre dos fechas, agrupadas por cultivo y estado. */
export function plantasQueMueren(
  antes: ReadonlyMap<string, string | null | undefined>,
  ahora: readonly { celdaId: string; cultivo?: string | null; estado?: string; estadoPlanta?: string | null }[],
  nombre: (cultivo: string) => string,
): PlantasMuertas[] {
  const grupos = new Map<string, PlantasMuertas>();
  for (const r of ahora) {
    if (r.estado !== undefined && r.estado !== 'EVALUABLE') continue;
    const e = r.estadoPlanta;
    if ((e !== 'marchita' && e !== 'podrida') || !r.cultivo) continue;
    const previo = antes.get(r.celdaId);
    if (previo === e || (previo === 'podrida' && e === 'marchita')) continue; // ya estaba asi (o ya estaba peor)
    const clave = `${r.cultivo}:${e}`;
    const g = grupos.get(clave) ?? { nombre: nombre(r.cultivo), estado: e, celdas: 0 };
    g.celdas += 1;
    grupos.set(clave, g);
  }
  return [...grupos.values()].sort((x, y) => y.celdas - x.celdas || x.nombre.localeCompare(y.nombre));
}
