import { describe, expect, it } from 'vitest';
import type { CatalogoCultivos, Cultivo } from '../../../../contratos/tipos/contratos';
import catalogoJson from '../../../../datos/catalogos/cultivos.json';
import { MODELOS_DISPONIBLES } from '../../escena/voxel/fuente-modelos';
import { cultivoCompleto, cultivosParaPintar, ETAPAS_BLOQUE, ETAPAS_PLANTA, faltantes } from './cultivosListos';

const catalogo = catalogoJson as unknown as CatalogoCultivos;
const maiz = catalogo.cultivos.find((c) => c.id === 'maiz')!;
const todos = (id: string) => new Set([...ETAPAS_PLANTA.map((e) => `${id}_${e}`), ...ETAPAS_BLOQUE.map((e) => `${id}_${e}_bloque`)]);

describe('cultivos que se ofrecen para pintar', () => {
  it('un cultivo con parametros y todos sus modelos esta completo', () => {
    expect(faltantes(maiz, todos('maiz'))).toEqual([]);
    expect(cultivoCompleto(maiz, todos('maiz'))).toBe(true);
  });
  it('si falta un modelo de planta o de manchon, no se ofrece y se dice cual', () => {
    const sin = todos('maiz'); sin.delete('maiz_madurez');
    expect(cultivoCompleto(maiz, sin)).toBe(false);
    expect(faltantes(maiz, sin)).toEqual(['sin modelo de planta: madurez']);
    const sinBloque = todos('maiz'); sinBloque.delete('maiz_brote_bloque'); sinBloque.delete('maiz_crecimiento_bloque');
    expect(faltantes(maiz, sinBloque)).toEqual(['sin manchón: brote, crecimiento']);
  });
  it('si el motor no puede evaluarlo (sin parametros con fuente), no se ofrece', () => {
    const roto = { ...maiz, estado: 'NO_EVALUABLE' } as unknown as Cultivo;
    const f = faltantes(roto, todos('maiz'));
    expect(f).toHaveLength(1);
    expect(f[0]).toContain('el motor no lo puede evaluar');
  });
  it('separa listos y fuera, conservando el orden del catalogo', () => {
    const cat = { ...catalogo, cultivos: [maiz, { ...maiz, id: 'raro' }, catalogo.cultivos[1]!] } as unknown as CatalogoCultivos;
    const modelos = new Set([...todos('maiz'), ...todos(catalogo.cultivos[1]!.id)]);
    const r = cultivosParaPintar(cat, modelos);
    expect(r.listos.map((c) => c.id)).toEqual(['maiz', catalogo.cultivos[1]!.id]);
    expect(r.fuera.map((x) => x.id)).toEqual(['raro']);
  });
  it('con los modelos reales de modelos/, los 40 cultivos del catalogo estan completos (hoy no se oculta ninguno)', () => {
    const r = cultivosParaPintar(catalogo, MODELOS_DISPONIBLES);
    expect(r.fuera, JSON.stringify(r.fuera)).toEqual([]);
    expect(r.listos).toHaveLength(40);
  });
});
