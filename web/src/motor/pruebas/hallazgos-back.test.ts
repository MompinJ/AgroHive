// Pruebas de los hallazgos de la auditoria del back en el motor (docs/hallazgos-back.md). Cada una fallaba antes de su arreglo.
import { describe, expect, it } from 'vitest';
import type { SeleccionEscenarios } from '../escenarios';
import { EstadoMotor } from '../protocolo';
import type { CatalogoCultivos, Parcela, PlanSiembra, ResultadoCeldas, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import { seriePowerIsla } from './utiles';

const suelo: Suelo = {
  meta: { versionContrato: '0.5.0', esEjemplo: false },
  id: 'manual-franco',
  etiqueta: 'SUPUESTO',
  origen: 'selector_manual',
  aviso: 'Tipo de suelo elegido por el usuario.',
  textura: { estado: 'EVALUABLE', etiqueta: 'SUPUESTO', clase: 'franco', grupo: 'franco' },
  ph: { estado: 'NO_EVALUABLE', motivo: 'Selector manual.' },
};
const plan = (cultivo: string, siembra = '2016-06-15'): PlanSiembra => ({
  meta: { versionContrato: '0.5.0', esEjemplo: false },
  rotacionId: 'R1',
  parcelaId: 'parcela-demo-isla',
  calendarioLocal: { sinCalendarioLocal: true, motivo: 'Prueba.' },
  asignacionClima: 'temporada_tipica',
  ciclos: [{ ciclo: 1, cultivo, siembra, temporada: 'PV', porQue: 'Prueba.' }],
  porCelda: null,
});

function base(m: EstadoMotor) {
  const sel = m.atender({ id: 1, tipo: 'escenarios', serie: seriePowerIsla() });
  const escenarios = sel.ok ? (sel.resultado as SeleccionEscenarios).escenarios : {};
  return {
    parcela: parcela as unknown as Parcela,
    suelo,
    tablaSuelos: tabla as unknown as TablaSuelos,
    catalogo: catalogo as unknown as CatalogoCultivos,
    escenarios,
  };
}

describe('hallazgos del back en el motor', () => {
  it('H-M3: rankear sin rotaciones responde "sin opcion robusta" en vez de un TypeError', () => {
    const m = new EstadoMotor();
    for (const p of [{ id: 1, tipo: 'rankear' as const }, { id: 2, tipo: 'rankear' as const, rotacionIds: [] }]) {
      const r = m.atender(p);
      expect(r.ok).toBe(true);
      expect(r.ok && (r.resultado as { orden: unknown[] }).orden).toEqual([]);
    }
  });

  it('H-M4: un simular que falla invalida el resultado anterior de esa rotacion', () => {
    const m = new EstadoMotor();
    const b = base(m);
    expect(m.atender({ id: 2, tipo: 'simular', entradas: { ...b, plan: plan('maiz') } }).ok).toBe(true);
    expect(m.atender({ id: 3, tipo: 'simular', entradas: { ...b, plan: plan('maiz', '') } }).ok).toBe(false);
    expect(m.atender({ id: 4, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' }).ok).toBe(false);
    const rk = m.atender({ id: 6, tipo: 'rankear' });
    expect(rk.ok && (rk.resultado as { orden: unknown[] }).orden).toEqual([]);
  });

  it('H-M2: resultado-celda de un escenario NO_EVALUABLE no sale EVALUABLE aunque la fecha sea antes de la siembra', () => {
    const m = new EstadoMotor();
    const b = base(m);
    const s = m.atender({ id: 2, tipo: 'simular', entradas: { ...b, suelo: null, plan: plan('maiz') } });
    expect(s.ok).toBe(true);
    const c = m.atender({ id: 3, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-05-01' });
    expect(c.ok).toBe(true);
    const celdas = c.ok ? (c.resultado as ResultadoCeldas) : null;
    expect(celdas?.estado).toBe('NO_EVALUABLE');
  });
});
