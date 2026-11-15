// Vistas de la base de los bloques (laboratorio por pasos): por cultivo, por validacion y por
// necesidad de agua. Solo traducen a color lo que entrega el motor en cada registro de celda;
// sin dato no hay color (nunca se pinta como "poca agua" ni como "mala idea"). No importa Three.js.

import { NOMBRES_CULTIVO_ESCENA, NOMBRES_ETAPA_ESCENA } from './ficha';
import type { BloqueEscena } from './modelo';

export type VistaBase = 'cultivo' | 'validacion' | 'agua';

/** Color de cada cultivo (base de sus bloques y brocha). Tonos tierra de saturacion media. */
export const COLORES_CULTIVO: Record<string, string> = {
  maiz: '#d9a62e', frijol: '#8a4b2f', calabaza: '#d9772b', chile: '#b73a2e',
  sorgo: '#9a5470', sandia: '#3f8a52', camote: '#74539c', cacahuate: '#b08a5c',
};

/**
 * Los cultivos sin color elegido a mano reciben uno estable derivado de su id (tono por
 * angulo aureo, saturacion y luz medias), para que dos cultivos de la parcela se distingan.
 */
function colorDerivado(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tono = (h * 137.508) % 360;
  const luz = 38 + (h % 3) * 8;
  return `hsl(${tono.toFixed(0)}, 48%, ${luz}%)`;
}
export const colorCultivo = (cultivo: string) => COLORES_CULTIVO[cultivo] ?? colorDerivado(cultivo);

/** Niveles de validacion, de mejor a peor `[PROPUESTA]`. */
export const NIVELES_VALIDACION = [
  { nivel: 4, etiqueta: 'Muy buena', color: '#2f8a4e' },
  { nivel: 3, etiqueta: 'Buena', color: '#8dbb4c' },
  { nivel: 2, etiqueta: 'Regular', color: '#e2bf3a' },
  { nivel: 1, etiqueta: 'Mala', color: '#e0782f' },
  { nivel: 0, etiqueta: 'Muy mala', color: '#bf3326' },
] as const;

export interface Validacion {
  /** 0 (muy mala) a 4 (muy buena); null si el motor no dio con que validar. */
  nivel: number | null;
  etiqueta: string;
  motivos: string[];
}

/** Si la siembra del cultivo en ese ciclo cae en la ventana local; null si no hay ventana con fuente. */
export type DentroDeVentana = (cultivo: string, ciclo: number) => boolean | null;

const BASE_POR_ESTADO: Record<string, { nivel: number; motivo: string }> = {
  normal: { nivel: 4, motivo: 'La planta está normal según el balance de agua del motor.' },
  estresada: { nivel: 2, motivo: 'La planta está estresada por agua según el motor.' },
  marchita: { nivel: 1, motivo: 'La planta está marchita según el motor.' },
  podrida: { nivel: 0, motivo: 'La planta está podrida por exceso de agua según el motor.' },
};

/**
 * Que tanto conviene ese cultivo en esa celda, en la fecha mostrada. Parte del estado de la
 * planta que calcula el motor y baja un nivel por cada senal en contra: siembra fuera de la
 * ventana local o calor sobre el umbral; si la fuente local no registra el cultivo en el
 * lugar, queda como mucho en "Mala". Lo desconocido se dice, no castiga.
 */
export function validarBloque(b: BloqueEscena, dentroDeVentana?: DentroDeVentana): Validacion {
  const r = b.registro;
  if (!r || !b.cultivo) return { nivel: null, etiqueta: 'Sin cultivo', motivos: ['La celda no tiene cultivo en esta fecha.'] };
  if (r.estado !== 'EVALUABLE' || !r.estadoPlanta) return { nivel: null, etiqueta: 'NO_EVALUABLE', motivos: [r.motivo ?? 'El motor no evaluó esta celda.'] };
  const base = BASE_POR_ESTADO[r.estadoPlanta];
  if (!base) return { nivel: null, etiqueta: 'NO_EVALUABLE', motivos: ['Estado de la planta desconocido.'] };
  let nivel = base.nivel;
  const motivos = [base.motivo];
  const ventana = r.ciclo != null && dentroDeVentana ? dentroDeVentana(b.cultivo, r.ciclo) : null;
  if (ventana === false) { nivel -= 1; motivos.push('La siembra cae fuera de la ventana del calendario local.'); }
  else if (ventana === true) motivos.push('La siembra está dentro de la ventana del calendario local.');
  else motivos.push('Sin ventana local con fuente para validar la fecha.');
  if (r.estresCalor === true) { nivel -= 1; motivos.push('Ese día el calor supera el umbral del cultivo.'); }
  if (b.noRecomendadoEnLugar) { nivel = Math.min(nivel, 1); motivos.push('La fuente local no registra este cultivo en el lugar.'); }
  nivel = Math.max(0, nivel);
  return { nivel, etiqueta: NIVELES_VALIDACION.find((n) => n.nivel === nivel)!.etiqueta, motivos };
}

/** Demanda de agua (ETc del dia) que se pinta como azul marino; mas alla, igual `[PROPUESTA]`. */
export const AGUA_MAX_MM = 8;
const GRIS: [number, number, number] = [0xc9, 0xcd, 0xd1];
const MARINO: [number, number, number] = [0x0b, 0x2a, 0x5b];

/** Color de la necesidad de agua: gris (casi nada) a azul marino (mucha); null sin dato. */
export function colorAgua(etcMm: number | null | undefined): string | null {
  if (etcMm == null || !Number.isFinite(etcMm)) return null;
  const t = Math.max(0, Math.min(1, etcMm / AGUA_MAX_MM));
  const c = GRIS.map((g, i) => Math.round(g + (MARINO[i]! - g) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** Color de la base de cada celda para una vista; las celdas sin dato no aparecen. */
export function coloresBase(bloques: readonly BloqueEscena[], vista: VistaBase, dentroDeVentana?: DentroDeVentana): Map<string, string> {
  const salida = new Map<string, string>();
  for (const b of bloques) {
    let color: string | null = null;
    if (vista === 'cultivo') color = b.cultivo ? colorCultivo(b.cultivo) : null;
    else if (vista === 'validacion') {
      const v = validarBloque(b, dentroDeVentana);
      color = v.nivel == null ? null : NIVELES_VALIDACION.find((n) => n.nivel === v.nivel)!.color;
    } else color = b.registro?.estado === 'EVALUABLE' ? colorAgua(b.registro.etcMm) : null;
    if (color) salida.set(b.celdaId, color);
  }
  return salida;
}

/** Lineas del globo al pasar el cursor, segun la vista. */
export function detalleVista(b: BloqueEscena, vista: VistaBase, dentroDeVentana?: DentroDeVentana): { titulo: string; lineas: string[] } {
  const r = b.registro;
  const cultivo = b.cultivo ? NOMBRES_CULTIVO_ESCENA[b.cultivo] ?? b.cultivo : 'Sin cultivo';
  const mm = (n: number | null | undefined) => (n == null ? 'NO_EVALUABLE' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })} mm`);
  if (vista === 'cultivo') {
    return { titulo: cultivo, lineas: [r?.ciclo != null ? `Ciclo ${r.ciclo}` : 'Entre ciclos', `Etapa: ${b.etapa ? NOMBRES_ETAPA_ESCENA[b.etapa] ?? b.etapa : 'NO_EVALUABLE'}`, `Celda ${b.celdaId}`] };
  }
  if (vista === 'validacion') {
    const v = validarBloque(b, dentroDeVentana);
    return { titulo: `${cultivo}: ${v.etiqueta}`, lineas: v.motivos };
  }
  const evaluable = r?.estado === 'EVALUABLE';
  return {
    titulo: `${cultivo}: ${evaluable && r?.etcMm != null ? `${r.etcMm.toLocaleString('es-MX', { maximumFractionDigits: 1 })} mm/día` : 'sin dato'}`,
    lineas: evaluable
      ? [`Demanda del día (ETc): ${mm(r?.etcMm)}`, `Humedad del suelo: ${r?.humedad == null ? 'NO_EVALUABLE' : `${Math.round(r.humedad * 100)} % del agua disponible`}`, `Déficit acumulado: ${mm(r?.deficitMm)}`, `Exceso acumulado: ${mm(r?.excesoMm)}`]
      : [r?.motivo ?? 'El motor no evaluó esta celda.'],
  };
}
