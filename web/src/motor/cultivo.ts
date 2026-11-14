// A2.6: parametros del cultivo desde el catalogo (contrato cultivo) y curva de Kc FAO-56 (doc 05, paso 3).
// Sin un parametro esencial con fuente, el cultivo es NO_EVALUABLE: nunca se usa un valor por defecto.
import type { Cultivo, EtapaVisual, ValorCitado } from './tipos';
import type { EtapaFao } from './tipos';

export interface ParametrosCultivo {
  id: string;
  /** Duracion de las etapas FAO-56 (Tabla 11), dias. */
  duracion: Record<EtapaFao, number>;
  /** Suma de las cuatro etapas: dias del ciclo que simula el motor. */
  totalDias: number;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  /** Profundidad de raiz Zr (FAO-56 Tabla 22), m. */
  zrM: number;
  /** Fraccion de agotamiento p (FAO-56 Tabla 22) para ETc de 5 mm/dia. */
  p: number;
  /** Etapas sensibles con fuente; null si el catalogo no las trae. */
  etapasSensibles: EtapaFao[] | null;
  esLeguminosa: boolean | null;
  /** Avisos (por ejemplo, cicloDias distinto de la suma de etapas). */
  avisos: string[];
}

export type ResultadoParametros = { ok: true; parametros: ParametrosCultivo } | { ok: false; motivo: string };

const ETAPAS: readonly EtapaFao[] = ['inicial', 'desarrollo', 'media', 'final'];

function valor(v: ValorCitado | undefined, nombre: string, faltan: string[]): number {
  if (v && v.estado === 'EVALUABLE') return v.valor;
  faltan.push(v ? `${nombre} (${v.motivo})` : `${nombre} (no esta en el catalogo)`);
  return NaN;
}

export function parametrosCultivo(c: Cultivo): ResultadoParametros {
  if (c.estado === 'NO_EVALUABLE' || c.estado === 'ERROR_DATOS') {
    return { ok: false, motivo: `El cultivo ${c.id} esta marcado ${c.estado} en el catalogo.` };
  }
  const faltan: string[] = [];
  const duracion = {
    inicial: valor(c.duracionEtapasDias.inicial, 'duracion de la etapa inicial', faltan),
    desarrollo: valor(c.duracionEtapasDias.desarrollo, 'duracion de la etapa de desarrollo', faltan),
    media: valor(c.duracionEtapasDias.media, 'duracion de la etapa media', faltan),
    final: valor(c.duracionEtapasDias.final, 'duracion de la etapa final', faltan),
  };
  const kcIni = valor(c.kc.inicial, 'Kc inicial', faltan);
  const kcMid = valor(c.kc.media, 'Kc medio', faltan);
  const kcEnd = valor(c.kc.final, 'Kc final', faltan);
  const zrM = valor(c.profundidadRaizM, 'profundidad de raiz', faltan);
  const p = valor(c.fraccionAgotamientoP, 'fraccion de agotamiento p', faltan);
  if (faltan.length > 0) {
    return { ok: false, motivo: `Al cultivo ${c.id} le faltan parametros con fuente: ${faltan.join('; ')}.` };
  }
  const totalDias = ETAPAS.reduce((s, e) => s + duracion[e], 0);
  const avisos: string[] = [];
  if (c.cicloDias.estado === 'EVALUABLE' && c.cicloDias.valor !== totalDias) {
    avisos.push(`cicloDias (${c.cicloDias.valor}) no coincide con la suma de etapas FAO-56 (${totalDias}); se usa la suma.`);
  }
  return {
    ok: true,
    parametros: {
      id: c.id,
      duracion,
      totalDias,
      kcIni,
      kcMid,
      kcEnd,
      zrM,
      p,
      etapasSensibles: c.etapasSensibles && c.etapasSensibles.length > 0 ? [...c.etapasSensibles] : null,
      esLeguminosa: c.esLeguminosa ?? null,
      avisos,
    },
  };
}

/** Etapa FAO-56 del dia i del ciclo (1 = dia de siembra). */
export function etapaFao(c: ParametrosCultivo, i: number): EtapaFao {
  let acum = 0;
  for (const e of ETAPAS) {
    acum += c.duracion[e];
    if (i <= acum) return e;
  }
  return 'final';
}

/**
 * Kc del dia i (1 = siembra), FAO-56 ec. 66: constante en la etapa inicial (Kc ini) y media (Kc mid), lineal en
 * desarrollo (Kc ini a Kc mid) y en la final (Kc mid a Kc end). Sin ajuste climatico de la ec. 62 (requiere la
 * altura del cultivo, que no esta en el catalogo).
 */
export function kcDia(c: ParametrosCultivo, i: number): number {
  const { inicial, desarrollo, media } = c.duracion;
  if (i <= inicial) return c.kcIni;
  if (i <= inicial + desarrollo) return c.kcIni + ((i - inicial) / desarrollo) * (c.kcMid - c.kcIni);
  if (i <= inicial + desarrollo + media) return c.kcMid;
  return c.kcMid + ((i - inicial - desarrollo - media) / c.duracion.final) * (c.kcEnd - c.kcMid);
}

/**
 * Etapa visual (doc 07) y avance de 0 a 1 dentro de ella. Correspondencia cualitativa, no es altura real:
 * siembra = dia 1; brote = resto de la etapa inicial FAO; crecimiento = desarrollo y media; madurez = final.
 */
export function etapaVisual(c: ParametrosCultivo, i: number): { etapa: EtapaVisual; avance: number } {
  const { inicial, desarrollo, media, final } = c.duracion;
  if (i <= 1) return { etapa: 'siembra', avance: 1 };
  if (i <= inicial) return { etapa: 'brote', avance: (i - 1) / Math.max(1, inicial - 1) };
  if (i <= inicial + desarrollo + media) return { etapa: 'crecimiento', avance: (i - inicial) / (desarrollo + media) };
  return { etapa: 'madurez', avance: Math.min(1, (i - inicial - desarrollo - media) / final) };
}
