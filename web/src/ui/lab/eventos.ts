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

export type TipoEvento = 'cosecha' | 'plaga';
export interface EventoPantalla { tipo: TipoEvento; clave: string; titulo: string; detalle: string; /** Fecha de la simulacion a la que se refiere. */ fecha: string }
export interface CultivoCosechado { nombre: string; celdas: number }
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

/**
 * Eventos que dispara avanzar de `anterior` a `actual` dentro del ciclo `rango`: primero la plaga (mitad del ciclo, solo si
 * quedan bloques sin insecticida) y despues la cosecha (ultimo dia). Si saltas de golpe de un extremo al otro salen los dos, en ese orden.
 */
export function eventosAlAvanzar(a: {
  anterior: string | null; actual: string; rango: RangoTiempo; clave: string;
  cosecha: readonly CultivoCosechado[]; plaga: PlagaActiva | null;
}): EventoPantalla[] {
  const salida: EventoPantalla[] = [];
  const mitad = momentoPlaga(a.rango);
  if (a.plaga && a.plaga.bloques > 0 && cruzo(a.anterior, a.actual, mitad)) salida.push(eventoPlaga(mitad, a.plaga, a.clave));
  if (a.cosecha.length > 0 && cruzo(a.anterior, a.actual, a.rango.hasta)) salida.push(eventoCosecha(a.rango.hasta, a.cosecha, a.plaga && a.plaga.bloques > 0 ? a.plaga : null, a.clave));
  return salida;
}
