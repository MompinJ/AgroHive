import { describe, expect, it } from 'vitest';
import type { SerieClima } from '../../../contratos/tipos/contratos';
import { biomaDeKoppen, claseKoppen, climaDeSerie, describirKoppen, MIN_ANIOS, normalesMensuales, variablesKoppen, type ClaseKoppen } from './koppen';

/** Clase directa desde 12 normales (enero primero). */
const clase = (t: number[], p: number[]) => claseKoppen(variablesKoppen({ tMediaC: t, lluviaMm: p }));

/** Serie diaria sintetica: cada dia del mes con la temperatura del mes y la lluvia del mes repartida en sus dias. */
function serieDe(t: number[], p: number[], anios: number[], quitar: (fecha: string) => boolean = () => false): Pick<SerieClima, 'diario'> {
  const diario: SerieClima['diario'] = [];
  for (const anio of anios) {
    for (let mes = 0; mes < 12; mes++) {
      const dias = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
      for (let d = 1; d <= dias; d++) {
        const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const fuera = quitar(fecha);
        diario.push({ fecha, tMediaC: fuera ? null : t[mes]!, lluviaMm: fuera ? null : p[mes]! / dias } as SerieClima['diario'][number]);
      }
    }
  }
  return { diario };
}
const ANIOS = Array.from({ length: 20 }, (_, i) => 2006 + i);

describe('Koppen-Geiger con las reglas de Peel et al. (2007)', () => {
  it('Herberton Post Office (Peel 2007, Tabla 2 y p. 1637): cumple Cs y Cw y, con mas lluvia en verano, es Cw; Thot 23.3 da Cwa', () => {
    const P = [238.4, 229.7, 214.4, 86.0, 46.9, 33.3, 22.0, 18.2, 16.5, 25.3, 77.3, 137.9];
    const T = [23.2, 22.8, 21.9, 20.0, 17.9, 16.0, 15.5, 16.5, 18.6, 21.0, 22.4, 23.3];
    const v = variablesKoppen({ tMediaC: T, lluviaMm: P });
    // Las cifras que el articulo calcula para ese caso.
    expect(v.verano).toBe('ONDJFM');
    expect(v.MAP).toBeCloseTo(1145.9, 1);
    expect(v.Pthreshold).toBeCloseTo(2 * v.MAT + 28, 9); // mas del 70 % de la lluvia en verano
    // "678 mm (10 * (2 * 19.9 + 28))": el articulo redondea MAT a 19.9; con los 12 meses da 19.925.
    expect(Math.abs(10 * v.Pthreshold - 678)).toBeLessThan(1);
    expect(v.Psdry).toBe(25.3);
    expect(v.Pwwet).toBe(86.0);
    expect(v.Pwdry).toBe(16.5);
    expect(v.Pswet).toBe(238.4);
    expect(v.Tcold).toBe(15.5);
    expect(claseKoppen(v)).toBe('Cwa');
  });

  it('el grupo B se identifica antes que A, C, D y E', () => {
    // Calido todo el anio (seria A) pero con 300 mm: arido.
    expect(clase(Array(12).fill(27), Array(12).fill(25))).toBe('BWh');
    // Frio todo el anio (Thot < 10, seria E) con 60 mm, todos en verano: umbral 2 MAT + 28 = 14 y 60 < 5 x 14, desierto frio.
    expect(clase([-20, -18, -14, -8, -2, 3, 6, 5, 0, -6, -12, -18], [0, 0, 0, 0, 5, 15, 20, 15, 5, 0, 0, 0])).toBe('BWk');
  });

  it('desierto y estepa, calido y frio, con el umbral de lluvia segun en que semestre llueve', () => {
    const tCalida = [20, 21, 23, 26, 29, 31, 32, 31, 29, 26, 22, 20];
    // Lluvia repartida: Pthreshold = 2 MAT + 14
    expect(clase(tCalida, Array(12).fill(20))).toBe('BWh'); // 240 mm < 5 x 65
    expect(clase(tCalida, Array(12).fill(40))).toBe('BSh'); // 480 mm
    const tFria = [0, 2, 6, 10, 14, 18, 21, 20, 16, 11, 5, 1];
    expect(clase(tFria, Array(12).fill(25))).toBe('BSk'); // 300 mm, MAT 10.3
    // Toda la lluvia en invierno: umbral 2 MAT (sin el +14), el mismo total ya no es arido.
    const inviernoLluvioso = [80, 70, 60, 50, 0, 0, 0, 0, 0, 0, 60, 80];
    const v = variablesKoppen({ tMediaC: tFria, lluviaMm: inviernoLluvioso });
    expect(v.lluviaInviernoMm / v.MAP).toBeGreaterThanOrEqual(0.7);
    expect(v.Pthreshold).toBeCloseTo(2 * v.MAT, 9);
    expect(claseKoppen(v)).not.toMatch(/^B/);
  });

  it('tropicales: Af, Am y Aw por la lluvia del mes mas seco', () => {
    const t = Array(12).fill(26);
    expect(clase(t, Array(12).fill(200))).toBe('Af');
    // Pdry 30 >= 100 - 2900/25 = -16: monzonico.
    expect(clase(t, [400, 400, 400, 300, 200, 100, 30, 30, 100, 300, 300, 340])).toBe('Am');
    // Pdry 5 < 100 - 1200/25 = 52: sabana.
    expect(clase(t, [250, 220, 200, 80, 20, 5, 5, 5, 20, 80, 150, 165])).toBe('Aw');
  });

  it('templados y frios: segunda letra (s, w, f) y tercera (a, b, c, d)', () => {
    // Mediterraneo del hemisferio norte: verano seco (AMJJAS), Thot 25.
    expect(clase([10, 11, 13, 15, 19, 23, 25, 25, 22, 18, 14, 11], [70, 60, 50, 40, 20, 5, 1, 4, 20, 60, 80, 80])).toBe('Csa');
    // Oceanico: lluvia pareja, Thot 17, mas de 4 meses arriba de 10.
    expect(clase([5, 5, 7, 9, 12, 15, 17, 17, 14, 11, 8, 6], Array(12).fill(70))).toBe('Cfb');
    // Subpolar oceanico: solo 2 meses arriba de 10.
    expect(clase([1, 1, 2, 4, 6, 9, 11, 11, 9, 6, 3, 2], Array(12).fill(80))).toBe('Cfc');
    // Continental con invierno seco del hemisferio norte.
    expect(clase([-15, -12, -3, 7, 15, 21, 24, 22, 15, 6, -4, -12], [3, 4, 10, 25, 50, 100, 160, 140, 60, 20, 8, 4])).toBe('Dwa');
    // Continental humedo con verano templado.
    expect(clase([-8, -6, -1, 6, 12, 16, 19, 18, 13, 7, 0, -5], Array(12).fill(60))).toBe('Dfb');
    // Invierno muy frio (Tcold < -38).
    expect(clase([-45, -40, -28, -10, 4, 14, 17, 13, 3, -12, -32, -42], [3, 3, 3, 6, 12, 30, 40, 35, 20, 12, 10, 3])).toBe('Dwd');
  });

  it('polares: ET y EF', () => {
    expect(clase([-25, -26, -24, -18, -8, 0, 4, 3, -2, -10, -18, -22], Array(12).fill(40))).toBe('ET');
    expect(clase(Array(12).fill(-20).map((x, i) => x + i * 0.5), Array(12).fill(40))).toBe('EF');
  });

  it('Thot = 10 exacto (fuera de la Tabla 1) se toma como C o D, no como E', () => {
    expect(clase([2, 2, 3, 5, 7, 9, 10, 10, 8, 6, 4, 3], Array(12).fill(90))[0]).toBe('C');
  });

  it('el verano es el semestre mas calido, sin mirar el hemisferio', () => {
    const norte = [0, 2, 6, 10, 14, 18, 21, 20, 16, 11, 5, 1];
    const sur = [...norte.slice(6), ...norte.slice(0, 6)];
    expect(variablesKoppen({ tMediaC: norte, lluviaMm: Array(12).fill(50) }).verano).toBe('AMJJAS');
    expect(variablesKoppen({ tMediaC: sur, lluviaMm: Array(12).fill(50) }).verano).toBe('ONDJFM');
  });
});

describe('climaDeSerie: normales desde la serie diaria', () => {
  const T = [23.2, 22.8, 21.9, 20.0, 17.9, 16.0, 15.5, 16.5, 18.6, 21.0, 22.4, 23.3];
  const P = [238.4, 229.7, 214.4, 86.0, 46.9, 33.3, 22.0, 18.2, 16.5, 25.3, 77.3, 137.9];

  it('reproduce las normales y la clase de una serie diaria completa', () => {
    const r = climaDeSerie(serieDe(T, P, ANIOS));
    expect(r.estado).toBe('EVALUABLE');
    if (r.estado !== 'EVALUABLE') return;
    expect(r.clase).toBe('Cwa');
    expect(r.bioma).toBe('templado');
    r.normales.tMediaC.forEach((x, i) => expect(x).toBeCloseTo(T[i]!, 9));
    r.normales.lluviaMm.forEach((x, i) => expect(x).toBeCloseTo(P[i]!, 9));
    expect(r.normales.anios).toEqual(Array(12).fill(20));
    expect(r.fuente.url).toBe('https://doi.org/10.5194/hess-11-1633-2007');
  });

  it('un mes con un dia sin dato no cuenta ese anio (no se rellena)', () => {
    const { normales } = normalesMensuales(serieDe(T, P, ANIOS, (f) => f === '2010-03-15'));
    expect(normales.anios[2]).toBe(19);
    expect(normales.anios[3]).toBe(20);
  });

  it('con menos de MIN_ANIOS anios completos en algun mes es NO_EVALUABLE con motivo', () => {
    const pocos = Array.from({ length: MIN_ANIOS - 1 }, (_, i) => 2010 + i);
    const r = climaDeSerie(serieDe(T, P, pocos));
    expect(r.estado).toBe('NO_EVALUABLE');
    expect(r.clase).toBeNull();
    expect(r.bioma).toBeNull();
    if (r.estado === 'NO_EVALUABLE') expect(r.motivo).toMatch(/No se rellenan/);
    expect(climaDeSerie(null).estado).toBe('NO_EVALUABLE');
    expect(climaDeSerie({ diario: [] }).estado).toBe('NO_EVALUABLE');
  });

  it('una serie que empieza en octubre (ventana estandar) usa solo los meses completos', () => {
    const r = normalesMensuales(serieDe(T, P, [2005, ...ANIOS], (f) => f < '2005-10-01'));
    expect(r.normales.anios[9]).toBe(21); // octubre de 2005 a 2025
    expect(r.normales.anios[0]).toBe(20); // enero de 2006 a 2025
  });
});

describe('bioma decorativo y descripcion', () => {
  it('cada clase cae en uno de los 5 biomas que tiene la escena', () => {
    const casos: [ClaseKoppen, string][] = [['Af', 'tropical_humedo'], ['Am', 'tropical_humedo'], ['Aw', 'tropical_seco'], ['BWh', 'arido'], ['BSk', 'arido'],
      ['Csa', 'templado'], ['Cwb', 'templado'], ['Cfa', 'templado'], ['Dfa', 'frio'], ['Dwd', 'frio'], ['ET', 'frio'], ['EF', 'frio']];
    for (const [c, b] of casos) expect(biomaDeKoppen(c)).toBe(b);
  });
  it('describe con los nombres de la Tabla 1', () => {
    expect(describirKoppen('Cwa')).toBe('templado, invierno seco y verano cálido');
    expect(describirKoppen('BSk')).toBe('árido, estepa frío');
    expect(describirKoppen('Aw')).toBe('tropical, sabana tropical');
    expect(describirKoppen('ET')).toBe('polar, tundra');
    expect(describirKoppen('Csb')).toBe('templado, verano seco y templado');
    expect(describirKoppen('Dfa')).toBe('frío, sin estación seca y verano cálido');
    expect(describirKoppen('Dsd')).toBe('frío, verano seco e invierno muy frío');
    expect(describirKoppen('Dwd')).toBe('frío, invierno seco y muy frío');
    expect(describirKoppen('BWh')).toBe('árido, desértico cálido');
  });
});
