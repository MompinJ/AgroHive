// Suelo de cada celda en la escena (doc 06: "bloques de suelo que se oscurecen con
// humedad y se aclaran si esta seco"; A2.12: losas por tipo y humedad).
// Solo representa: el tipo sale del contrato suelo (textura.grupo, del mapa global
// o del selector manual) y la humedad del registro del motor (fraccion de TAW, 0 a 1).
// Sin humedad (null o sin registro) no hay losa y la columna va en un gris que no
// esta en ninguna escala, para no confundir "sin dato" con "humedad media".
// Colores de modelos/paleta.md: franco 16 suelo_seco, 0 soil, 17 suelo_humedo;
// arenoso 60, 63, 66; arcilloso 69, 72, 75; sin humedad 8 stone.

import type { GrupoSuelo, Suelo } from '../../../contratos/tipos/contratos';
import { hexARgb } from './contraste';

export type NivelHumedad = 'seco' | 'medio' | 'humedo';

/**
 * Cortes de la humedad (fraccion de TAW) para elegir la losa `[PROPUESTA]`: tercios
 * iguales. Es solo para el dibujo: no dice si la planta sufre estres (eso lo decide
 * el motor y se ve en la placa de estado).
 */
export const CORTES_HUMEDAD = { secoHasta: 1 / 3, humedoDesde: 2 / 3 } as const;

export const TONOS_SUELO: Record<GrupoSuelo, Record<NivelHumedad, string>> = {
  arenoso: { seco: '#c9ad7c', medio: '#a88c5e', humedo: '#7b6241' },
  franco: { seco: '#9b7a55', medio: '#6b4a2f', humedo: '#3f2b19' },
  arcilloso: { seco: '#96604a', medio: '#6e3f2a', humedo: '#452419' },
};

/** Tipo de la escala cuando no se conoce el suelo: tonos genericos (los del franco), declarados en la leyenda. */
const GENERICO: GrupoSuelo = 'franco';

export const SUELO_SECO = TONOS_SUELO.franco.seco;
export const SUELO_MEDIO = TONOS_SUELO.franco.medio;
export const SUELO_HUMEDO = TONOS_SUELO.franco.humedo;
export const SUELO_SIN_HUMEDAD = '#8d8d86';

export function nivelHumedad(humedad: number | null | undefined): NivelHumedad | null {
  if (humedad === null || humedad === undefined || !Number.isFinite(humedad)) return null;
  if (humedad < CORTES_HUMEDAD.secoHasta) return 'seco';
  if (humedad >= CORTES_HUMEDAD.humedoDesde) return 'humedo';
  return 'medio';
}

/** Grupo de textura del contrato suelo; null si no hay suelo o su textura no es usable. */
export function grupoDeSuelo(suelo: Suelo | null | undefined): GrupoSuelo | null {
  if (!suelo) return null;
  const t = suelo.textura;
  if (t.estado === 'NO_EVALUABLE' || t.estado === 'ERROR_DATOS') return null;
  return t.grupo;
}

/** rgb 0..255 de la columna: tono del tipo y del nivel de humedad; null -> gris sin dato. */
export function colorSuelo(humedad: number | null, grupo: GrupoSuelo | null = null): [number, number, number] {
  const nivel = nivelHumedad(humedad);
  if (!nivel) return hexARgb(SUELO_SIN_HUMEDAD);
  return hexARgb(TONOS_SUELO[grupo ?? GENERICO][nivel]);
}

/** Losa de modelos/suelos/ (A2.12): solo con tipo y humedad conocidos; si falta uno, ninguna. */
export function claveLosa(grupo: GrupoSuelo | null, humedad: number | null | undefined): string | null {
  const nivel = nivelHumedad(humedad);
  return grupo && nivel ? `suelo_${grupo}_${nivel}` : null;
}

const pct = (n: number) => `${Math.round(n * 100)} %`;

export function textoEscalaSuelo(grupo: GrupoSuelo | null): string {
  const tipo = grupo
    ? `Suelo ${grupo} (SUPUESTO: estimado del mapa o elegido en el selector).`
    : 'Tipo de suelo sin dato: tonos genericos y sin losas.';
  return (
    `${tipo} Color y losa segun la humedad del motor (fraccion de agua disponible): seco por debajo de ${pct(CORTES_HUMEDAD.secoHasta)}, ` +
    `humedo desde ${pct(CORTES_HUMEDAD.humedoDesde)}, medio entre ambos. Gris: humedad NO_EVALUABLE.`
  );
}
