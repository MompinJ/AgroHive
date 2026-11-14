// A2.6: capacidad de la cubeta (TAW por metro) y condicion inicial a partir del suelo de la parcela.
// Orden: TAW del documento de suelo (pedotransferencia de Saxton y Rawls, A2.16) > tabla FAO-56 Tabla 19 por clase
// (A1.6) > clase representante del grupo del selector manual > NO_EVALUABLE. Siempre SUPUESTO (doc 04).
import { fao56 } from './fuentes';
import type { Fuente, Suelo, TablaSuelos } from './tipos';

export type ResultadoTaw =
  /** desdeSuelo: el TAW viene del propio documento de suelo (misma retencion que la condicion inicial con GWETROOT). */
  | { ok: true; tawMmPorM: number; fuente: Fuente; descripcion: string; desdeSuelo: boolean }
  | { ok: false; motivo: string };

export function resolverTaw(suelo: Suelo | null | undefined, tabla: TablaSuelos): ResultadoTaw {
  if (!suelo) return { ok: false, motivo: 'No hay suelo de la parcela: elegir un tipo en el selector manual.' };
  const agua = suelo.agua?.tawMmPorM;
  if (agua && agua.estado === 'EVALUABLE') {
    const metodo = suelo.agua?.metodoTaw?.metodo ?? 'sin metodo declarado';
    return { ok: true, tawMmPorM: agua.valor, fuente: agua.fuente, descripcion: `TAW del suelo ${suelo.id} (${metodo})`, desdeSuelo: true };
  }
  const clase = suelo.textura.clase ?? (suelo.origen === 'selector_manual' ? tabla.representanteGrupo[suelo.textura.grupo] : null);
  if (!clase) {
    return { ok: false, motivo: `El suelo ${suelo.id} no tiene clase textural ni TAW${agua ? ` (${agua.motivo})` : ''}.` };
  }
  const fila = tabla.texturas.find((t) => t.clase === clase);
  if (!fila) return { ok: false, motivo: `La clase ${clase} no esta en la tabla de suelos.` };
  if (fila.tawMmPorM.estado !== 'EVALUABLE') {
    return {
      ok: false,
      motivo: `TAW de la clase ${clase} NO_EVALUABLE: ${fila.tawMmPorM.motivo} (se calculara con Saxton y Rawls en A2.16; mientras, usar el selector manual).`,
    };
  }
  return { ok: true, tawMmPorM: fila.tawMmPorM.valor, fuente: fila.tawMmPorM.fuente, descripcion: `Tabla de suelos, clase ${clase}`, desdeSuelo: false };
}

export type ResultadoCondicionInicial =
  | { ok: true; thetaFc: number; thetaSat: number; fuente: Fuente }
  | { ok: false; motivo: string };

/**
 * Lo que hace falta para pasar la humedad de POWER (GWETROOT, fraccion de saturacion) a agotamiento inicial:
 * theta = GWETROOT x thetaSat y Dr,i = 1000 (thetaFC - theta) Zr (FAO-56 ec. 87). Sin thetaSat y thetaFC con
 * fuente (Saxton y Rawls, A2.16) es NO_EVALUABLE.
 */
export function retencionParaCondicionInicial(suelo: Suelo | null | undefined): ResultadoCondicionInicial {
  const r = suelo?.agua?.retencion;
  if (!r) return { ok: false, motivo: 'El suelo no trae thetaSat, thetaFC y thetaWP (Saxton y Rawls, A2.16).' };
  if (r.thetaSatM3M3.estado !== 'EVALUABLE' || r.thetaFcM3M3.estado !== 'EVALUABLE') {
    return { ok: false, motivo: 'thetaSat o thetaFC del suelo son NO_EVALUABLE.' };
  }
  return { ok: true, thetaSat: r.thetaSatM3M3.valor, thetaFc: r.thetaFcM3M3.valor, fuente: r.thetaFcM3M3.fuente };
}

export const FUENTE_DR_INICIAL_CERO = fao56(
  'Capitulo 8, agotamiento inicial: tras lluvia intensa o riego se puede suponer la zona de raices cerca de capacidad de campo, Dr,i = 0',
  'https://www.fao.org/4/x0490e/x0490e0e.htm',
);
