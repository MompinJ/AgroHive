import { describe, expect, it } from 'vitest';
import { armarPlan, calendarioIsla, explicarFecha, planesIniciales } from './planes';
import { parcelaConTerrenoDemo } from '../escena/demo-motor';
import { seleccionarEscenarios } from '../motor/escenarios';
import { simularRotacion } from '../motor/motor';
import { seriePowerIsla, validadorContrato } from '../motor/pruebas/utiles';
import catalogo from '../../../datos/catalogos/cultivos.json';
import tabla from '../../../datos/catalogos/suelos.json';
import suelo from '../../../datos/demo/respuestas/suelo.json';
import type { CatalogoCultivos, Suelo, TablaSuelos } from '../../../contratos/tipos/contratos';

const parcela = parcelaConTerrenoDemo();
describe('planes del selector', () => {
  it('valida todos los planes iniciales contra el contrato', () => {
    const validar = validadorContrato('plan-siembra');
    for (const plan of planesIniciales(parcela, calendarioIsla)) expect(validar(plan)).toEqual([]);
  });
  it('no aplica el calendario de Isla a una parcela sin municipio verificado', () => {
    const plan = planesIniciales(parcela, null)[0]!;
    expect(plan.calendarioLocal).toHaveProperty('sinCalendarioLocal', true);
    expect(explicarFecha(plan.ciclos[0]!, null).texto).toContain('Sin calendario local');
  });
  it('cambiar cultivo actualiza el motivo sin modificar el plan anterior', () => {
    const inicial = planesIniciales(parcela, calendarioIsla)[0]!;
    const nuevo = armarPlan(inicial.rotacionId, parcela, inicial.ciclos.map((c, i) => i === 0 ? { ...c, cultivo: 'calabaza' } : c), calendarioIsla);
    expect(inicial.ciclos[0]!.cultivo).toBe('maiz');
    expect(nuevo.ciclos[0]!.porQue).toContain('Sin calendario local');
    expect(nuevo.asignacionClima).toBe('temporada_tipica');
  });
  it('guarda la comprobación de ventana del motor junto con la fecha', () => {
    const planes = planesIniciales(parcela, calendarioIsla);
    expect(planes.find((p) => p.rotacionId === 'R4')!.ciclos.every((c) => c.dentroDeVentana === true)).toBe(true);
    expect(planes[0]!.ciclos[1]!.dentroDeVentana).toBe(false);
  });
  it('R1 ciclo 2 seco entrega frijol desde el motor con fechas del selector', () => {
    const plan = planesIniciales(parcela, calendarioIsla)[0]!;
    const r = simularRotacion({ plan, parcela, catalogo: catalogo as CatalogoCultivos, tablaSuelos: tabla as TablaSuelos, suelo: suelo as Suelo, calendario: calendarioIsla, escenarios: seleccionarEscenarios(seriePowerIsla()).escenarios });
    expect(r.plan.ciclos[1]!.cultivo).toBe('frijol');
    expect(r.rotacion.porEscenario.seco.anioReal).toBe(2023);
  });
});
