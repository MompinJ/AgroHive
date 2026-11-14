import { describe, expect, it } from 'vitest';
import type { SeleccionEscenarios } from '../escenarios';
import { EstadoMotor } from '../protocolo';
import type { CatalogoCultivos, Parcela, PlanSiembra, Suelo, TablaSuelos } from '../tipos';
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
const plan = (cultivo: string): PlanSiembra => ({
  meta: { versionContrato: '0.5.0', esEjemplo: false },
  rotacionId: 'R1',
  parcelaId: 'parcela-demo-isla',
  calendarioLocal: { sinCalendarioLocal: true, motivo: 'Pendiente A0.6.' },
  asignacionClima: 'temporada_tipica',
  ciclos: [{ ciclo: 1, cultivo, siembra: '2016-06-15', temporada: 'PV', porQue: 'Prueba.' }],
  porCelda: null,
});

describe('protocolo del Web Worker', () => {
  it('escenarios -> simular -> celdas; cambiar el plan invalida y reemplaza el resultado', () => {
    const m = new EstadoMotor();
    const sel = m.atender({ id: 1, tipo: 'escenarios', serie: seriePowerIsla() });
    expect(sel.ok).toBe(true);
    const escenarios = sel.ok ? (sel.resultado as SeleccionEscenarios).escenarios : {};
    const base = {
      parcela: parcela as unknown as Parcela,
      suelo,
      tablaSuelos: tabla as unknown as TablaSuelos,
      catalogo: catalogo as unknown as CatalogoCultivos,
      escenarios,
    };
    expect(m.atender({ id: 2, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' }).ok).toBe(false);
    expect(m.atender({ id: 3, tipo: 'simular', entradas: { ...base, plan: plan('maiz') } }).ok).toBe(true);
    const c1 = m.atender({ id: 4, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' });
    expect(c1.ok && (c1.resultado as { registros: { cultivo: string }[] }).registros[0]?.cultivo).toBe('maiz');
    m.atender({ id: 5, tipo: 'simular', entradas: { ...base, plan: plan('frijol') } });
    const c2 = m.atender({ id: 6, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' });
    expect(c2.ok && (c2.resultado as { registros: { cultivo: string }[] }).registros[0]?.cultivo).toBe('frijol');
    const rk = m.atender({ id: 61, tipo: 'rankear' });
    expect(rk.ok && (rk.resultado as { orden: { rotacionId: string }[] }).orden.map((f) => f.rotacionId)).toEqual(['R1']);
    expect(m.atender({ id: 62, tipo: 'rankear', rotacionIds: ['R2'] }).ok).toBe(false);
    m.atender({ id: 7, tipo: 'olvidar' });
    expect(m.atender({ id: 8, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' }).ok).toBe(false);
  });
});
