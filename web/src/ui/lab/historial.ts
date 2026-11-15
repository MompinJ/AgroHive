// Historial de hechos del laboratorio: lo que paso y lo que hizo el usuario, en orden. Puro (la persistencia va en useHistorial).
//
// Los hechos son de dos clases: acciones del usuario (sembrar, insecticida) y sucesos de la simulacion (cosecha, plaga, problemas de un
// cultivo). Un solo trazo de la brocha suele tocar varias celdas y se suelta muchas veces seguidas: los trazos consecutivos del mismo cultivo
// y ciclo se agrupan en un hecho, para que la lista cuente lo que paso y no cada movimiento del raton.

export type TipoHecho = 'siembra' | 'insecticida' | 'cosecha' | 'plaga' | 'problema' | 'muerte';

export interface Hecho {
  id: number;
  tipo: TipoHecho;
  /** Cuando paso (reloj real, ms). */
  cuando: number;
  /** Fecha de la simulacion a la que se refiere, si aplica (AAAA-MM-DD). */
  fechaSim?: string | undefined;
  ciclo?: number | undefined;
  /** Cultivo (siembra) para armar el texto. null = se devolvieron al cultivo general. */
  sujeto?: string | null | undefined;
  celdas?: number | undefined;
  /** Texto ya armado (cosecha, plaga, problema). */
  titulo?: string | undefined;
  detalle?: string | undefined;
  /** Mismo valor = mismo hecho que se puede agrupar. */
  clave?: string | undefined;
}

export const TOPE_HECHOS = 200;
export const VENTANA_AGRUPAR_MS = 4000;

export const NOMBRE_TIPO_HECHO: Record<TipoHecho, string> = { siembra: 'Siembra', insecticida: 'Insecticida', cosecha: 'Cosecha', plaga: 'Plaga', problema: 'Problema', muerte: 'Plantas muertas' };

const celdas = (n: number) => `${n} ${n === 1 ? 'celda' : 'celdas'}`;

/** El texto del hecho. Siembra e insecticida dependen de cuantas celdas llevan; el resto trae su texto. */
export function textoHecho(h: Hecho): string {
  if (h.tipo === 'siembra') {
    const n = h.celdas ?? 0;
    const ciclo = h.ciclo != null ? ` (ciclo ${h.ciclo})` : '';
    return h.sujeto ? `Sembraste ${h.sujeto} en ${celdas(n)}${ciclo}` : `Devolviste ${celdas(n)} al cultivo general${ciclo}`;
  }
  if (h.tipo === 'insecticida') {
    const n = h.celdas ?? 0;
    return `Aplicaste insecticida en ${n} ${n === 1 ? 'bloque' : 'bloques'}${h.ciclo != null ? ` (ciclo ${h.ciclo})` : ''}`;
  }
  return h.titulo ?? NOMBRE_TIPO_HECHO[h.tipo];
}

const agrupable = (t: TipoHecho) => t === 'siembra' || t === 'insecticida';

/** Agrega un hecho; si continua el anterior (mismo tipo y clave, a pocos segundos), se suma a el. Nunca pasa de TOPE_HECHOS (se van los mas viejos). */
export function registrar(lista: readonly Hecho[], nuevo: Omit<Hecho, 'id'>): Hecho[] {
  const ultimo = lista.at(-1);
  if (ultimo && agrupable(nuevo.tipo) && ultimo.tipo === nuevo.tipo && ultimo.clave !== undefined && ultimo.clave === nuevo.clave && nuevo.cuando - ultimo.cuando <= VENTANA_AGRUPAR_MS) {
    return [...lista.slice(0, -1), { ...ultimo, cuando: nuevo.cuando, celdas: (ultimo.celdas ?? 0) + (nuevo.celdas ?? 0) }];
  }
  const id = (lista.reduce((m, h) => Math.max(m, h.id), 0)) + 1;
  return [...lista, { ...nuevo, id }].slice(-TOPE_HECHOS);
}

/** Del mas reciente al mas viejo, para mostrar. */
export const masRecientesPrimero = (lista: readonly Hecho[]): Hecho[] => [...lista].reverse();

const TIPOS: readonly string[] = ['siembra', 'insecticida', 'cosecha', 'plaga', 'problema', 'muerte'];

/** Lee lo guardado sin confiar en el: descarta lo que no tenga la forma de un hecho. */
export function leerHechos(crudo: string | null | undefined): Hecho[] {
  if (!crudo) return [];
  try {
    const x: unknown = JSON.parse(crudo);
    if (!Array.isArray(x)) return [];
    return x.filter((h): h is Hecho => typeof h === 'object' && h !== null && typeof (h as Hecho).id === 'number' && TIPOS.includes((h as Hecho).tipo) && typeof (h as Hecho).cuando === 'number').slice(-TOPE_HECHOS);
  } catch { return []; }
}
