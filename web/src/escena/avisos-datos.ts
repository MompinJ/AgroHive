// Avisos de datos de la parcela en la escena (pedido de Eduardo): lo que avisa
// usarDatosParcela (web/src/api/) mas lo que trae el terreno de la parcela. Puro: solo
// agrupa y pone nombre corto; el texto completo es el de la API, sin cambiarlo.

import { tt } from '../ui/i18n/actual';
import type { Advertencia } from '../../../contratos/tipos/contratos';
import type { AvisoDatos } from '../api/datosParcela';

/** Codigos del terreno que van en este panel y no en la lista general de la escena. */
export const CODIGOS_TERRENO = new Set(['RESOLUCION_DEM_GRUESA', 'ELEVACION_RESPALDO', 'ELEVACION_DE_EJEMPLO', 'ELEVACION_ERROR_DATOS', 'ELEVACION_INCOMPLETA']);

export interface ResumenAvisos {
  /** Etiquetas cortas de lo importante y los avisos, sin repetir y en orden de severidad. */
  etiquetas: { texto: string; severidad: Advertencia['severidad'] }[];
  /** Cuantas notas informativas hay (se leen al abrir el detalle). */
  notas: number;
  filas: AvisoDatos[];
  /** Severidad mas alta presente; null si no hay avisos. */
  maxima: Advertencia['severidad'] | null;
}

const ORDEN: Record<Advertencia['severidad'], number> = { critico: 0, aviso: 1, info: 2 };

export const NOMBRE_SEVERIDAD: Record<Advertencia['severidad'], string> = { get critico() { return tt('sev.critico'); }, get aviso() { return tt('sev.aviso'); }, get info() { return tt('sev.info'); } };

function etiquetaDe(a: AvisoDatos): string {
  const c = a.codigo.toUpperCase();
  if (a.origen === 'clima') {
    if (c.includes('RESPALDO')) return tt('datos.climaRespaldo');
    if (c.includes('IMERG') || c.includes('SATELITAL')) return tt('datos.imerg');
    return tt('datos.climaRevisar');
  }
  if (a.origen === 'suelo') return c.includes('SUPUESTO') ? tt('datos.sueloSupuesto') : tt('datos.sueloRevisar');
  if (a.origen === 'terreno') {
    if (c === 'RESOLUCION_DEM_GRUESA') return tt('datos.relieve');
    if (c === 'ELEVACION_RESPALDO') return tt('datos.elevRespaldo');
    if (c === 'ELEVACION_DE_EJEMPLO') return tt('datos.elevEjemplo');
    return tt('datos.elevRevisar');
  }
  if (a.origen === 'proxima temporada') return c.includes('NO_DISPONIBLE') ? tt('datos.proximaNo') : tt('datos.proximaRevisar');
  return `${a.origen}: revisar aviso`;
}

/** Junta los avisos de la API con los del terreno de la parcela (advertencias del contrato parcela). */
export function resumirAvisos(avisosApi: readonly AvisoDatos[], advertenciasParcela: readonly Advertencia[] = []): ResumenAvisos {
  const terreno: AvisoDatos[] = advertenciasParcela
    .filter((a) => CODIGOS_TERRENO.has(a.codigo))
    .map((a) => ({ origen: 'terreno', codigo: a.codigo, mensaje: a.mensaje, severidad: a.severidad }));
  const filas = [...avisosApi, ...terreno].sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
  const etiquetas: ResumenAvisos['etiquetas'] = [];
  for (const f of filas) {
    if (f.severidad === 'info') continue;
    const texto = etiquetaDe(f);
    if (!etiquetas.some((e) => e.texto === texto)) etiquetas.push({ texto, severidad: f.severidad });
  }
  return { etiquetas, notas: filas.filter((f) => f.severidad === 'info').length, filas, maxima: filas[0]?.severidad ?? null };
}
