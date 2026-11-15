import { expect, it } from 'vitest';
import type { SerieBalance } from '../../../contratos/tipos/contratos';
import ejemplo from '../../../contratos/ejemplos/serie-balance.ejemplo.json';
import { desplazarMes, desplazarSemana, DIAS_POR_PASO, fechaDeSemana, fechaEnIndice, indiceDeFecha, rangoDelCiclo, semanaDeFecha, totalSemanas } from './tiempo';

it('solo ofrece fechas sustentadas por la serie del ciclo, incluso en un año bisiesto', () => {
  const serie = structuredClone(ejemplo) as SerieBalance;
  const ciclo = serie.ciclos[0]!;
  ciclo.desde = '2024-02-28';
  ciclo.dias.humedad = [null, null, null];
  expect(rangoDelCiclo(serie, ciclo.ciclo)).toEqual({ desde: '2024-02-28', hasta: '2024-03-01', pasos: 2 });
  expect(fechaEnIndice('2024-02-28', 1)).toBe('2024-02-29');
  expect(indiceDeFecha('2024-02-28', '2024-03-01')).toBe(2);
});
it('no inventa un horizonte si no hay días del motor', () => {
  expect(rangoDelCiclo(null, 1)).toBeNull();
  const serie = structuredClone(ejemplo) as SerieBalance;
  serie.ciclos.forEach((c) => { c.dias.humedad = []; });
  expect(rangoDelCiclo(serie, 1)).toBeNull();
});
it('salta meses sin desbordarse de febrero y conserva los límites disponibles', () => {
  const rango = { desde: '2024-01-15', hasta: '2024-04-10', pasos: 86 };
  expect(desplazarMes('2024-01-31', 1, rango)).toBe('2024-02-29');
  expect(desplazarMes('2024-03-31', -1, rango)).toBe('2024-02-29');
  expect(desplazarMes('2024-04-01', 1, rango)).toBe(rango.hasta);
  expect(desplazarMes('2024-01-31', -1, rango)).toBe(rango.desde);
});

// Ciclo de la demo: 15 jun a 17 oct de 2026, 124 dias.
const ciclo = { desde: '2026-06-15', hasta: '2026-10-17', pasos: 124 };
it('el tiempo avanza por semanas: pasos de 7 dias y el ultimo se recorta al dia de la cosecha', () => {
  expect(DIAS_POR_PASO).toBe(7);
  expect(totalSemanas(ciclo)).toBe(18); // 124 / 7 = 17.7: 17 semanas completas y un paso corto
  expect(fechaDeSemana(ciclo, 0)).toBe('2026-06-15');
  expect(fechaDeSemana(ciclo, 1)).toBe('2026-06-22');
  expect(fechaDeSemana(ciclo, 17)).toBe('2026-10-12');
  expect(fechaDeSemana(ciclo, 18)).toBe('2026-10-17'); // el ultimo paso es la cosecha, no el dia 126
  expect(fechaDeSemana(ciclo, 99)).toBe('2026-10-17');
  expect(fechaDeSemana(ciclo, -3)).toBe('2026-06-15');
});
it('una fecha cae en la semana que le toca y el ultimo dia es el ultimo paso', () => {
  expect(semanaDeFecha(ciclo, '2026-06-15')).toBe(0);
  expect(semanaDeFecha(ciclo, '2026-06-21')).toBe(0);
  expect(semanaDeFecha(ciclo, '2026-06-22')).toBe(1);
  expect(semanaDeFecha(ciclo, '2026-10-16')).toBe(17);
  expect(semanaDeFecha(ciclo, '2026-10-17')).toBe(18);
  expect(semanaDeFecha(ciclo, '2026-01-01')).toBe(0);
  expect(semanaDeFecha(ciclo, '2027-01-01')).toBe(18);
});
it('desplazar una semana no sale del ciclo', () => {
  expect(desplazarSemana('2026-06-15', 1, ciclo)).toBe('2026-06-22');
  expect(desplazarSemana('2026-10-12', 1, ciclo)).toBe('2026-10-17'); // 5 dias: se recorta
  expect(desplazarSemana('2026-10-17', 1, ciclo)).toBe('2026-10-17');
  expect(desplazarSemana('2026-06-18', -1, ciclo)).toBe('2026-06-15');
  expect(desplazarSemana('2026-06-15', -1, ciclo)).toBe('2026-06-15');
});
it('un ciclo de un solo dia no tiene pasos', () => {
  const uno = { desde: '2026-06-15', hasta: '2026-06-15', pasos: 0 };
  expect(totalSemanas(uno)).toBe(0);
  expect(fechaDeSemana(uno, 0)).toBe('2026-06-15');
  expect(semanaDeFecha(uno, '2026-06-15')).toBe(0);
});
