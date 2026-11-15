// Vistas de la base de los bloques (laboratorio por pasos): por cultivo, por validacion y por
// necesidad de agua; y, en el paso Escenarios, por luz y por temperatura (clima de la semana, clima-vista.ts).
// Solo traducen a color lo que entrega el motor en cada registro de celda o la serie climatica real;
// sin dato no hay color (nunca se pinta como "poca agua" ni como "mala idea"). No importa Three.js.

import { tt } from '../ui/i18n/actual';
import { nombreCultivo, NOMBRES_ETAPA_ESCENA } from './ficha';
import type { BloqueEscena } from './modelo';
import { colorLuz, colorNivelTemperatura, etiquetaNivelTemperatura, grados, megajoules, nivelTemperatura, type ClimaSemana, type RangoTemperatura } from './clima-vista';

export type VistaBase = 'cultivo' | 'validacion' | 'agua' | 'luz' | 'temperatura';
/** Vistas que dependen del clima de la fecha: solo se ofrecen cuando la escena tiene la serie del escenario. */
export const VISTAS_CLIMA: readonly VistaBase[] = ['luz', 'temperatura'];

/** Lo que necesitan las vistas de luz y temperatura: el clima de la semana y el rango de cada cultivo. */
export interface ContextoVista { clima: ClimaSemana | null; rangos: Readonly<Record<string, RangoTemperatura>> }

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
  { nivel: 4, get etiqueta() { return tt('val.muyBuena'); }, color: '#2f8a4e' },
  { nivel: 3, get etiqueta() { return tt('val.buena'); }, color: '#8dbb4c' },
  { nivel: 2, get etiqueta() { return tt('val.regular'); }, color: '#e2bf3a' },
  { nivel: 1, get etiqueta() { return tt('val.mala'); }, color: '#e0782f' },
  { nivel: 0, get etiqueta() { return tt('val.muyMala'); }, color: '#bf3326' },
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
  normal: { nivel: 4, get motivo() { return tt('val.normal'); } },
  estresada: { nivel: 2, get motivo() { return tt('val.estresada'); } },
  marchita: { nivel: 1, get motivo() { return tt('val.marchita'); } },
  podrida: { nivel: 0, get motivo() { return tt('val.podrida'); } },
};

/**
 * Que tanto conviene ese cultivo en esa celda, en la fecha mostrada. Parte del estado de la
 * planta que calcula el motor y baja un nivel por cada senal en contra: siembra fuera de la
 * ventana local o calor sobre el umbral; si la fuente local no registra el cultivo en el
 * lugar, queda como mucho en "Mala". Lo desconocido se dice, no castiga.
 */
export function validarBloque(b: BloqueEscena, dentroDeVentana?: DentroDeVentana): Validacion {
  const r = b.registro;
  if (!r || !b.cultivo) return { nivel: null, etiqueta: tt('val.sinCultivo'), motivos: [tt('val.celdaSinCultivo')] };
  if (r.estado !== 'EVALUABLE' || !r.estadoPlanta) return { nivel: null, etiqueta: 'NO_EVALUABLE', motivos: [r.motivo ?? tt('val.noEvaluo')] };
  const base = BASE_POR_ESTADO[r.estadoPlanta];
  if (!base) return { nivel: null, etiqueta: 'NO_EVALUABLE', motivos: [tt('val.desconocido')] };
  let nivel = base.nivel;
  const motivos = [base.motivo];
  const ventana = r.ciclo != null && dentroDeVentana ? dentroDeVentana(b.cultivo, r.ciclo) : null;
  if (ventana === false) { nivel -= 1; motivos.push(tt('val.fuera')); }
  else if (ventana === true) motivos.push(tt('val.dentro'));
  else motivos.push(tt('val.sinVentana'));
  if (r.estresCalor === true) { nivel -= 1; motivos.push(tt('val.calor')); }
  if (b.noRecomendadoEnLugar) { nivel = Math.min(nivel, 1); motivos.push(tt('val.noRegistrado')); }
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
export function coloresBase(bloques: readonly BloqueEscena[], vista: VistaBase, dentroDeVentana?: DentroDeVentana, contexto?: ContextoVista): Map<string, string> {
  const salida = new Map<string, string>();
  for (const b of bloques) {
    let color: string | null = null;
    if (vista === 'cultivo') color = b.cultivo ? colorCultivo(b.cultivo) : null;
    else if (vista === 'validacion') {
      const v = validarBloque(b, dentroDeVentana);
      color = v.nivel == null ? null : NIVELES_VALIDACION.find((n) => n.nivel === v.nivel)!.color;
    } else if (vista === 'luz') color = colorLuz(contexto?.clima?.radiacionMjM2Dia); // la misma para toda la parcela
    else if (vista === 'temperatura') {
      const rango = b.cultivo ? contexto?.rangos[b.cultivo] : undefined;
      const t = contexto?.clima?.tMediaC;
      color = rango && t != null ? colorNivelTemperatura(nivelTemperatura(t, rango)) : null;
    } else color = b.registro?.estado === 'EVALUABLE' ? colorAgua(b.registro.etcMm) : null;
    if (color) salida.set(b.celdaId, color);
  }
  return salida;
}

/** Lineas del globo al pasar el cursor, segun la vista. */
export function detalleVista(b: BloqueEscena, vista: VistaBase, dentroDeVentana?: DentroDeVentana, contexto?: ContextoVista): { titulo: string; lineas: string[] } {
  const r = b.registro;
  const cultivo = b.cultivo ? nombreCultivo(b.cultivo) : tt('val.sinCultivo');
  const mm = (n: number | null | undefined) => (n == null ? 'NO_EVALUABLE' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })} mm`);
  if (vista === 'cultivo') {
    return { titulo: cultivo, lineas: [r?.ciclo != null ? tt('det.ciclo', { n: r.ciclo }) : tt('det.entreCiclos'), tt('det.etapa', { etapa: b.etapa ? NOMBRES_ETAPA_ESCENA[b.etapa] ?? b.etapa : 'NO_EVALUABLE' }), tt('esc3d.celda', { id: b.celdaId })] };
  }
  if (vista === 'validacion') {
    const v = validarBloque(b, dentroDeVentana);
    return { titulo: `${cultivo}: ${v.etiqueta}`, lineas: v.motivos };
  }
  const clima = contexto?.clima ?? null;
  if (vista === 'luz') {
    if (clima?.radiacionMjM2Dia == null) return { titulo: tt('det.luzSinDato'), lineas: [tt('det.luzSinDatoAyuda')] };
    return { titulo: tt('det.luz', { valor: megajoules(clima.radiacionMjM2Dia) }), lineas: [tt('det.luz1'), tt('det.luz2'), tt('det.luz3', { fecha: clima.fechaClima })] };
  }
  if (vista === 'temperatura') {
    const rango = b.cultivo ? contexto?.rangos[b.cultivo] : undefined;
    if (!b.cultivo) return { titulo: tt('val.sinCultivo'), lineas: [tt('val.celdaSinCultivo')] };
    if (clima?.tMediaC == null) return { titulo: tt('det.sinDato', { cultivo }), lineas: [tt('det.sinTemp')] };
    if (!rango) return { titulo: tt('det.sinRango', { cultivo }), lineas: [tt('det.tMedia', { t: grados(clima.tMediaC) }), tt('det.sinRangoAyuda')] };
    const nivel = nivelTemperatura(clima.tMediaC, rango);
    return {
      titulo: `${cultivo}: ${etiquetaNivelTemperatura(nivel).toLowerCase()}`,
      lineas: [
        tt('det.tMediaMaxMin', { t: grados(clima.tMediaC), max: grados(clima.tMaxC), min: grados(clima.tMinC) }),
        tt('det.ideal', { a: grados(rango.tOptMinC), b: grados(rango.tOptMaxC) }),
        tt('det.limites', { a: grados(rango.tMinAbsC), b: grados(rango.tMaxAbsC) }),
        ...(r?.estresCalor === true ? [tt('det.calorUmbral')] : []),
      ],
    };
  }
  const evaluable = r?.estado === 'EVALUABLE';
  return {
    titulo: `${cultivo}: ${evaluable && r?.etcMm != null ? tt('det.mmDia', { n: r.etcMm.toLocaleString('es-MX', { maximumFractionDigits: 1 }) }) : tt('det.sinDatoCorto')}`,
    lineas: evaluable
      ? [tt('det.demanda', { v: mm(r?.etcMm) }), tt('det.humedad', { v: r?.humedad == null ? 'NO_EVALUABLE' : tt('det.humedadPct', { n: Math.round(r.humedad * 100) }) }), tt('det.deficit', { v: mm(r?.deficitMm) }), tt('det.exceso', { v: mm(r?.excesoMm) })]
      : [r?.motivo ?? tt('val.noEvaluo')],
  };
}
