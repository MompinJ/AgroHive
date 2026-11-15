import { describe, expect, it } from 'vitest';
import type { CatalogoCultivos, Parcela, PlanSiembra, ResultadoRotacion } from '../../../../contratos/tipos/contratos';
import catalogoJson from '../../../../datos/catalogos/cultivos.json';
import { armarDatosResumen, type EntradaResumen } from './armarResumen';

const catalogo = catalogoJson as unknown as CatalogoCultivos;
const pilares = (mm: number | null) => ({ deficitHidrico: { deficitTotalMm: mm } });
const resultado = (id: string, pos: number | null, mm: [number | null, number | null, number | null], extra: Record<string, unknown> = {}) => ({
  rotacionId: id, estado: 'EVALUABLE', ranking: pos ? { posicion: pos } : null, peorCaso: { escenario: 'seco' },
  porEscenario: { seco: { anioReal: 2023, pilares: pilares(mm[0]) }, habitual: { anioReal: 2016, pilares: pilares(mm[1]) }, lluvioso: { anioReal: 2024, pilares: pilares(mm[2]) } },
  explicacion: { riesgos: ['riesgo A'], beneficios: ['beneficio A'] }, ...extra,
}) as unknown as ResultadoRotacion;
const plan = (id: string): PlanSiembra => ({ rotacionId: id, ciclos: [{ ciclo: 1, cultivo: 'maiz', siembra: '2026-06-15' }, { ciclo: 2, cultivo: 'noexiste', siembra: '2026-11-01' }] }) as unknown as PlanSiembra;

const entrada = (): EntradaResumen => ({
  ordenadas: [resultado('R1', 1, [25.3, 7.9, 3.1]), resultado('R2', null, [null, 12, 5])],
  planes: [plan('R1'), plan('R2')], catalogo, nombreRotacion: (id) => `Rotación ${id.slice(1)}`,
  plagasDe: (id) => (id === 'R1' ? [{ ciclo: 1, plaga: 'Chapulín de la milpa', cultivo: 'Maíz', bloques: 4 }] : []),
  parcela: { nombre: 'Isla, Veracruz', areaHa: 2, celdas: [{}, {}, {}, {}] as unknown as Parcela['celdas'], tamanoCeldaM: 70.71 },
  esDemo: true, ponderacion: 'Gana la que menos sufre.', limites: ['limite 1'], hechos: [], elegida: 'R1', fecha: new Date(Date.UTC(2026, 10, 15)),
});

describe('datos del resumen en PDF', () => {
  const d = armarDatosResumen(entrada());
  it('conserva el orden del ranking y los lugares del motor', () => {
    expect(d.rotaciones.map((r) => [r.nombre, r.posicion])).toEqual([['Rotación 1', 1], ['Rotación 2', null]]);
    expect(d.elegida).toBe('R1');
  });
  it('lleva el agua que falto en cada anio real, y sin dato queda null (no cero)', () => {
    expect(d.rotaciones[0]!.anios).toEqual([{ nombre: 'Año seco', anioReal: 2023, mm: 25.3 }, { nombre: 'Año normal', anioReal: 2016, mm: 7.9 }, { nombre: 'Año lluvioso', anioReal: 2024, mm: 3.1 }]);
    expect(d.rotaciones[1]!.anios[0]!.mm).toBeNull();
    expect(d.rotaciones[0]!.peor).toBe('Año seco');
  });
  it('la cosecha es la siembra mas los dias del ciclo del catalogo; sin ciclo en el catalogo no se inventa', () => {
    const c1 = d.rotaciones[0]!.ciclos[0]!;
    expect(c1.cultivo).toBe('Maíz');
    expect(c1.dias).toBeGreaterThan(60);
    expect(Date.parse(`${c1.cosecha}T00:00:00Z`) - Date.parse('2026-06-15T00:00:00Z')).toBe(c1.dias! * 86400000);
    const c2 = d.rotaciones[0]!.ciclos[1]!;
    expect(c2.dias).toBeNull();
    expect(c2.cosecha).toBeNull();
  });
  it('las plagas pendientes se asignan a su ciclo y con texto de bloques sin insecticida', () => {
    expect(d.rotaciones[0]!.ciclos[0]!.plagas).toEqual(['Chapulín de la milpa: 4 bloques de maíz sin insecticida']);
    expect(d.rotaciones[0]!.ciclos[1]!.plagas).toEqual([]);
    expect(d.rotaciones[1]!.ciclos[0]!.plagas).toEqual([]);
  });
  it('trae las debilidades y fortalezas que redacta el motor, sin cambiarlas', () => {
    expect(d.rotaciones[0]!.debilidades).toEqual(['riesgo A']);
    expect(d.rotaciones[0]!.fortalezas).toEqual(['beneficio A']);
  });
  it('describe la parcela con su numero de celdas y marca la demo; sin nombre usa uno generico', () => {
    expect(d.parcela).toEqual({ nombre: 'Isla, Veracruz', areaHa: 2, celdas: 4, tamanoCeldaM: 70.71, esDemo: true });
    const e = entrada();
    e.parcela = { ...e.parcela, nombre: undefined as unknown as string, areaHa: undefined as unknown as number };
    const sin = armarDatosResumen(e);
    expect(sin.parcela.nombre).toBe('Tu parcela');
    expect(sin.parcela.areaHa).toBeNull();
  });
});
