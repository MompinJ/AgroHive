import { describe, expect, it } from 'vitest';
import { AJUSTES_GRAFICOS, esNivelGraficos, NIVELES_GRAFICOS, nivelInicial } from './graficos';

describe('nivel de graficos', () => {
  it('cada nivel pide mas que el anterior', () => {
    const a = NIVELES_GRAFICOS.map((n) => AJUSTES_GRAFICOS[n]);
    for (let k = 1; k < a.length; k++) {
      expect(a[k]!.pixelRatioMax).toBeGreaterThan(a[k - 1]!.pixelRatioMax);
      expect(a[k]!.insectosMax).toBeGreaterThan(a[k - 1]!.insectosMax);
    }
    expect(AJUSTES_GRAFICOS.bajo.pixelRatioMax).toBe(1);
    expect(AJUSTES_GRAFICOS.bajo.ambiente).toBe(false);
    expect(AJUSTES_GRAFICOS.alto.insectosMax).toBe(480); // el tope de siempre: alto conserva lo que ya se veia
    expect(AJUSTES_GRAFICOS.alto.pixelRatioMax).toBe(2);
  });
  it('lo guardado por el usuario manda; un valor raro se ignora', () => {
    expect(nivelInicial('bajo', 16, 32)).toBe('bajo');
    expect(nivelInicial('alto', 1, 1)).toBe('alto');
    expect(esNivelGraficos('ultra')).toBe(false);
    expect(nivelInicial('ultra', 16, 32)).toBe('alto');
    expect(nivelInicial('', 16, 32)).toBe('alto');
  });
  it('sin eleccion se sugiere segun el equipo, y sin dato del equipo queda alto', () => {
    expect(nivelInicial(null, 18, 32)).toBe('alto');
    expect(nivelInicial(null, 4, 8)).toBe('medio');
    expect(nivelInicial(null, 8, 4)).toBe('medio');
    expect(nivelInicial(null, 2, 8)).toBe('bajo');
    expect(nivelInicial(null, 8, 2)).toBe('bajo');
    expect(nivelInicial(null)).toBe('alto'); // Safari no declara deviceMemory
    expect(nivelInicial(undefined, undefined, undefined)).toBe('alto');
  });
});
