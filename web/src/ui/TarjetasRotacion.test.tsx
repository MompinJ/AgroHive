import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { TarjetasRotacion } from './TarjetasRotacion';
import ejemplo from '../../../contratos/ejemplos/resultado-rotacion.ejemplo.json';
import type { ResultadoRotacion } from '../../../contratos/tipos/contratos';

it('mantiene huecos y riesgos visibles y conserva la cita recibida', () => {
  const r = structuredClone(ejemplo) as unknown as ResultadoRotacion;
  r.explicacion = { porQue: 'Explicación sintética de prueba', beneficios: [], huecos: ['HUECO_VISIBLE_DE_PRUEBA'], riesgos: ['RIESGO_VISIBLE_DE_PRUEBA'], evidencia: [{ texto: 'Evidencia de prueba', fuente: { nombre: 'Fuente de prueba', url: 'https://example.org' } }], avisoExperto: 'Aviso de prueba', redactadaPor: 'plantilla' };
  const html = renderToStaticMarkup(<TarjetasRotacion rotaciones={[r]} />);
  expect(html).toContain('HUECO_VISIBLE_DE_PRUEBA');
  expect(html).toContain('RIESGO_VISIBLE_DE_PRUEBA');
  expect(html).toContain('href="https://example.org"');
  expect(html).not.toContain('<details');
});
