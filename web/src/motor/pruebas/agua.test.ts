// A2.6: ET0, Kc y cubeta contra los ejemplos resueltos de FAO-56 y contra propiedades del balance.
import { describe, expect, it } from 'vitest';
import { balanceCiclo } from '../balance';
import { etapaFao, etapaVisual, kcDia, parametrosCultivo, type ParametrosCultivo } from '../cultivo';
import { eSat, et0Hargreaves, et0PenmanMonteith, presion, radiacionExtraterrestre, serieEt0 } from '../et0';
import type { CatalogoCultivos } from '../tipos';
import catalogoJson from '../../../../datos/catalogos/cultivos.json';

const catalogo = catalogoJson as unknown as CatalogoCultivos;
const maiz = (() => {
  const r = parametrosCultivo(catalogo.cultivos.find((c) => c.id === 'maiz')!);
  if (!r.ok) throw new Error(r.motivo);
  return r.parametros;
})();

describe('ET0, FAO-56 capitulo 3', () => {
  it('Ejemplo 2: presion a 1800 m = 81.8 kPa', () => {
    expect(presion(1800)).toBeCloseTo(81.8, 1);
  });
  it('Ejemplo 3: es para Tmax 24.5 y Tmin 15 C = 2.39 kPa', () => {
    expect((eSat(24.5) + eSat(15)) / 2).toBeCloseTo(2.39, 2);
  });
  it('Ejemplo 8: Ra a 20 grados S el 3 de septiembre = 32.2 MJ/m2/dia', () => {
    expect(radiacionExtraterrestre(-20, 246)).toBeCloseTo(32.2, 1);
  });
  it('Ejemplo 18: ET0 diaria de Bruselas el 6 de julio = 3.9 mm/dia', () => {
    const et0 = et0PenmanMonteith({
      tMaxC: 21.5,
      tMinC: 12.3,
      rsMjM2Dia: 22.07,
      u2MS: 2.078,
      eaKPa: 1.409,
      elevacionM: 100,
      latGrados: 50 + 48 / 60,
      diaAnio: 187,
    });
    expect(et0).toBeCloseTo(3.9, 1);
  });
  it('Hargreaves (ec. 52) da el mismo orden que Penman-Monteith en el ejemplo 18', () => {
    const ra = radiacionExtraterrestre(50 + 48 / 60, 187);
    const h = et0Hargreaves(21.5, 12.3, ra);
    expect(h).toBeGreaterThan(3);
    expect(h).toBeLessThan(5);
  });
  it('serieEt0 prefiere la ET0 de la fuente, luego Penman-Monteith, luego Hargreaves y deja null sin temperaturas', () => {
    const base = { lluviaMm: 0, tMaxC: 32, tMinC: 22, radiacionMjM2Dia: 20, humedadRelativaPct: 75, vientoMS: 2 };
    const s = serieEt0(
      [
        { fecha: '2016-06-01', ...base, et0Mm: 4.2 },
        { fecha: '2016-06-02', ...base },
        { fecha: '2016-06-03', ...base, vientoMS: null },
        { fecha: '2016-06-04', ...base, tMaxC: null },
      ],
      18,
      100,
    );
    expect(s.metodo).toEqual(['fuente', 'penman_monteith_fao56', 'hargreaves_fao56', null]);
    expect(s.et0Mm[0]).toBe(4.2);
    expect(s.et0Mm[3]).toBeNull();
    expect(serieEt0([{ fecha: '2016-06-02', ...base }], 18, null).metodo).toEqual(['hargreaves_fao56']);
  });
});

describe('Kc y etapas FAO-56 (maiz del catalogo: 20/35/40/30 dias; Kc 0.3/1.2/0.35)', () => {
  it('curva de la ec. 66', () => {
    expect(kcDia(maiz, 1)).toBe(0.3);
    expect(kcDia(maiz, 20)).toBe(0.3);
    expect(kcDia(maiz, 55)).toBeCloseTo(1.2);
    expect(kcDia(maiz, 37.5)).toBeCloseTo(0.75);
    expect(kcDia(maiz, 95)).toBe(1.2);
    expect(kcDia(maiz, 125)).toBeCloseTo(0.35);
  });
  it('etapas FAO y visuales', () => {
    expect(etapaFao(maiz, 20)).toBe('inicial');
    expect(etapaFao(maiz, 21)).toBe('desarrollo');
    expect(etapaFao(maiz, 96)).toBe('final');
    expect(etapaVisual(maiz, 1).etapa).toBe('siembra');
    expect(etapaVisual(maiz, 10).etapa).toBe('brote');
    expect(etapaVisual(maiz, 60).etapa).toBe('crecimiento');
    expect(etapaVisual(maiz, 125)).toEqual({ etapa: 'madurez', avance: 1 });
  });
  it('un cultivo sin parametros con fuente es NO_EVALUABLE con motivo', () => {
    const sin = structuredClone(catalogo.cultivos[0]!);
    sin.kc.media = { estado: 'NO_EVALUABLE', motivo: 'sin fuente' };
    const r = parametrosCultivo(sin);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain('Kc medio');
  });
});

describe('cubeta FAO-56 capitulo 8', () => {
  const n = maiz.totalDias;
  const correr = (c: ParametrosCultivo, lluvia: number, et0: number, taw = 155) =>
    balanceCiclo({ cultivo: c, tawMmPorM: taw, lluviaMm: Array(n).fill(lluvia), et0Mm: Array(n).fill(et0), drInicialMm: 0 });

  it('conserva masa: lluvia - ETc ajustada - percolacion = cambio de agua almacenada', () => {
    const b = balanceCiclo({
      cultivo: maiz,
      tawMmPorM: 90,
      lluviaMm: Array.from({ length: n }, (_, i) => (i % 9 === 0 ? 40 : 0)),
      et0Mm: Array(n).fill(5),
      drInicialMm: 0,
    });
    const lluvia = Array.from({ length: n }, (_, i) => (i % 9 === 0 ? 40 : 0)).reduce((a: number, x) => a + x, 0);
    const etcAj = b.dias.reduce((a, d) => a + d.etcAjMm, 0);
    const drFinal = b.dias[n - 1]!.drMm;
    expect(lluvia - etcAj - b.excesoTotalMm).toBeCloseTo(-drFinal, 6);
  });

  it('humedad siempre entre 0 y 1 y agotamiento nunca negativo ni mayor que TAW', () => {
    for (const [ll, et] of [[0, 8], [50, 1], [3, 5]] as const) {
      const b = correr(maiz, ll, et, 90);
      for (const d of b.dias) {
        expect(d.humedad).toBeGreaterThanOrEqual(0);
        expect(d.humedad).toBeLessThanOrEqual(1);
        expect(d.drMm).toBeGreaterThanOrEqual(0);
        expect(d.drMm).toBeLessThanOrEqual(b.tawMm + 1e-9);
      }
    }
  });

  it('con lluvia suficiente no hay deficit; sin lluvia el deficit crece y la planta pasa a estresada', () => {
    const humedo = correr(maiz, 10, 4);
    expect(humedo.deficitTotalMm).toBe(0);
    expect(humedo.diasDeficit).toBe(0);
    const seco = correr(maiz, 0, 5);
    expect(seco.deficitTotalMm).toBeGreaterThan(0);
    expect(seco.dias.some((d) => d.estadoPlanta === 'estresada')).toBe(true);
    expect(seco.dias[0]!.estadoPlanta).toBe('normal');
  });

  it('sin etapas sensibles con fuente, diasDeficitEtapasSensibles es null (nunca cero)', () => {
    expect(correr(maiz, 0, 5).diasDeficitEtapasSensibles).toBeNull();
    const conSens = { ...maiz, etapasSensibles: ['media' as const] };
    expect(correr(conSens, 0, 5).diasDeficitEtapasSensibles).toBeGreaterThan(0);
  });
});
