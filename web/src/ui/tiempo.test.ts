import { expect, it } from 'vitest';
import type { SerieBalance } from '../../../contratos/tipos/contratos';
import ejemplo from '../../../contratos/ejemplos/serie-balance.ejemplo.json';
import { desplazarMes, fechaEnIndice, indiceDeFecha, rangoDelCiclo } from './tiempo';

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
