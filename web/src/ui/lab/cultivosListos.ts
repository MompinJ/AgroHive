// Que cultivos se ofrecen para pintar: solo los que tienen informacion suficiente para desplegarse bien. Un cultivo incompleto no sale en la
// paleta (ni se ve una planta provisional ni un resultado sin evaluar). Puro.
//
// Completo = el motor puede evaluarlo (parametros con fuente: Kc, etapas, raiz...) Y la escena tiene todos sus modelos: la planta en sus
// cuatro etapas y podrida, y el manchon (bloque) de las tres etapas con cultivo en pie.
import type { CatalogoCultivos, Cultivo } from '../../../../contratos/tipos/contratos';
import { parametrosCultivo } from '../../motor/cultivo';

export const ETAPAS_PLANTA = ['siembra', 'brote', 'crecimiento', 'madurez', 'podrida'] as const;
export const ETAPAS_BLOQUE = ['brote', 'crecimiento', 'madurez'] as const;

export interface FaltaCultivo { id: string; motivos: string[] }

/** Lo que le falta a un cultivo para ofrecerse; lista vacia = completo. */
export function faltantes(c: Cultivo, modelos: ReadonlySet<string>): string[] {
  const falta: string[] = [];
  const p = parametrosCultivo(c);
  if (!p.ok) falta.push(`el motor no lo puede evaluar (${p.motivo})`);
  const sinPlanta = ETAPAS_PLANTA.filter((e) => !modelos.has(`${c.id}_${e}`));
  if (sinPlanta.length) falta.push(`sin modelo de planta: ${sinPlanta.join(', ')}`);
  const sinBloque = ETAPAS_BLOQUE.filter((e) => !modelos.has(`${c.id}_${e}_bloque`));
  if (sinBloque.length) falta.push(`sin manchón: ${sinBloque.join(', ')}`);
  return falta;
}

export const cultivoCompleto = (c: Cultivo, modelos: ReadonlySet<string>): boolean => faltantes(c, modelos).length === 0;

/** Cultivos que se ofrecen, en el orden del catalogo, y los que se dejan fuera con su motivo. */
export function cultivosParaPintar(catalogo: CatalogoCultivos, modelos: ReadonlySet<string>): { listos: Cultivo[]; fuera: FaltaCultivo[] } {
  const listos: Cultivo[] = [];
  const fuera: FaltaCultivo[] = [];
  for (const c of catalogo.cultivos) {
    const f = faltantes(c, modelos);
    if (f.length === 0) listos.push(c); else fuera.push({ id: c.id, motivos: f });
  }
  return { listos, fuera };
}
