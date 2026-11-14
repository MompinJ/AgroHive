// La escena con el motor real y el paquete de demo (A2.4): el motor calcula, la escena solo representa.
import { describe, expect, it } from 'vitest';
import serieDemo from '../../../../datos/demo/respuestas/serie-clima.json';
import type { SerieClima } from '../../../../contratos/tipos/contratos';
import { seleccionarEscenarios } from '../../motor/escenarios';
import { resultadoCeldas, simularRotacion } from '../../motor/motor';
import { construirEscena } from '../adaptador';
import { entradasDemo, fechasPlan, parcelaConTerrenoDemo } from '../demo-motor';
import { agruparPorModelo } from '../voxel/catalogo';
import { MODELOS_DISPONIBLES } from '../voxel/fuente-modelos';

const escenarios = seleccionarEscenarios(structuredClone(serieDemo) as unknown as SerieClima).escenarios;

describe('vista previa con el motor real', () => {
  it('la parcela usa el terreno real del paquete y sigue marcada como ejemplo', () => {
    const p = parcelaConTerrenoDemo();
    expect(p.celdas.map((c) => c.elevacionM)).toEqual([63.1, 62.6, 62.0, 63.3]);
    expect(p.terreno.fuente.nombre).toMatch(/Terrarium/);
    expect(p.meta.esEjemplo).toBe(true);
    const e = construirEscena(p, null);
    expect(e.bloques.every((b) => b.relieve.tipo === 'medido')).toBe(true);
    expect(e.elevacionBaseM).toBe(62);
  });

  it('con el suelo del mapa (TAW NO_EVALUABLE) toda la escena es NO_EVALUABLE: nada se inventa', () => {
    const r = simularRotacion({ ...entradasDemo('mapa'), escenarios });
    const celdas = resultadoCeldas(r, 'seco', '2016-08-01');
    expect(celdas).not.toBeNull();
    const e = construirEscena(parcelaConTerrenoDemo(), celdas);
    expect(e.bloques.every((b) => b.estadoVisual === 'NO_EVALUABLE')).toBe(true);
    expect(e.bloques.every((b) => b.registro?.humedad === null)).toBe(true);
  });

  it('con el selector manual (SUPUESTO) el maiz del ciclo 1 aparece con los modelos de Mafer', () => {
    const r = simularRotacion({ ...entradasDemo('manual_franco'), escenarios });
    const celdas = resultadoCeldas(r, 'habitual', '2016-08-01')!;
    const e = construirEscena(parcelaConTerrenoDemo(), celdas);
    expect(e.bloques.every((b) => b.cultivo === 'maiz')).toBe(true);
    expect(e.bloques.every((b) => b.estadoVisual !== 'sin_resultado')).toBe(true);
    const grupos = agruparPorModelo(e.bloques, MODELOS_DISPONIBLES);
    expect(grupos.length).toBeGreaterThan(0);
    expect(grupos.every((g) => g.resolucion.tipo === 'bbmodel' && g.clave.startsWith('maiz_'))).toBe(true);
  });

  it('las fechas del plan recorren los tres ciclos y la escena se arma en todas', () => {
    const r = simularRotacion({ ...entradasDemo('manual_franco'), escenarios });
    const p = parcelaConTerrenoDemo();
    const cultivos = new Set<string>();
    for (const f of fechasPlan()) {
      const e = construirEscena(p, resultadoCeldas(r, 'seco', f));
      expect(e.bloques).toHaveLength(4);
      for (const b of e.bloques) if (b.cultivo) cultivos.add(b.cultivo);
    }
    expect([...cultivos].sort()).toEqual(['frijol', 'maiz']);
  });
});
