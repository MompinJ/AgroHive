import { describe, expect, it } from 'vitest';
import { armarPlan, calendarioIsla, cambiarSiembra, conflictosPlan, conteoPintado, cultivoDeCelda, explicarFecha, pintarCeldas, planesIniciales, rellenarCiclo, temporadaDeFecha } from './planes';
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

describe('brocha y fechas derivadas', () => {
  const cat = catalogo as CatalogoCultivos;
  const r1 = () => planesIniciales(parcela, calendarioIsla).find((p) => p.rotacionId === 'R1')!;
  const celdas = parcela.celdas.map((c) => c.id);

  it('deduce la temporada SIAP del mes de siembra', () => {
    expect(temporadaDeFecha('2026-04-01')).toBe('PV');
    expect(temporadaDeFecha('2026-09-30')).toBe('PV');
    expect(temporadaDeFecha('2026-10-01')).toBe('OI');
    expect(temporadaDeFecha('2027-03-31')).toBe('OI');
  });

  it('pinta celdas en porCelda, valida contra el contrato y la goma las devuelve al cultivo general', () => {
    const validar = validadorContrato('plan-siembra');
    const pintado = pintarCeldas(r1(), parcela, 1, [celdas[0]!, celdas[1]!], 'frijol', calendarioIsla);
    expect(validar(pintado)).toEqual([]);
    expect(pintado.porCelda?.[celdas[0]!]).toEqual([{ ciclo: 1, cultivo: 'frijol' }]);
    expect(conteoPintado(pintado, 1).get('frijol')).toBe(2);
    expect(cultivoDeCelda(pintado, celdas[2]!, 1)).toBe('maiz');
    const borrado = pintarCeldas(pintado, parcela, 1, [celdas[0]!], null, calendarioIsla);
    expect(Object.keys(borrado.porCelda ?? {})).toEqual([celdas[1]]);
    const conGeneral = pintarCeldas(borrado, parcela, 1, [celdas[1]!], 'maiz', calendarioIsla);
    expect(conGeneral.porCelda).toBeNull();
    expect(pintarCeldas(r1(), parcela, 1, ['no-existe'], 'frijol', calendarioIsla).porCelda).toBeNull();
  });

  it('el motor evalua el cultivo pintado en cada celda', () => {
    const plan = pintarCeldas(r1(), parcela, 1, [celdas[0]!], 'frijol', calendarioIsla);
    const r = simularRotacion({ plan, parcela, catalogo: cat, tablaSuelos: tabla as TablaSuelos, suelo: suelo as Suelo, calendario: calendarioIsla, escenarios: seleccionarEscenarios(seriePowerIsla()).escenarios });
    expect(r.ciclosPorCelda.get(celdas[0]!)![0]!.cultivo).toBe('frijol');
    expect(r.ciclosPorCelda.get(celdas[1]!)![0]!.cultivo).toBe('maiz');
  });

  it('detecta antes del motor un ciclo que se traslapa con el siguiente', () => {
    expect(conflictosPlan(r1(), cat)).toEqual([]);
    const temprano = cambiarSiembra(r1(), parcela, 2, '2026-09-01', calendarioIsla);
    expect(temprano.ciclos[1]!.temporada).toBe('PV');
    expect(conflictosPlan(temprano, cat)[0]).toContain('ciclo 1');
    const desordenado = cambiarSiembra(r1(), parcela, 2, '2026-05-01', calendarioIsla);
    expect(conflictosPlan(desordenado, cat)[0]).toContain('posterior');
  });

  it('rellenar un ciclo usa el inicio de la ventana local si no choca y limpia lo pintado de ese ciclo', () => {
    const movido = cambiarSiembra(r1(), parcela, 1, '2026-07-01', calendarioIsla);
    const pintado = pintarCeldas(movido, parcela, 1, [celdas[0]!], 'frijol', calendarioIsla);
    const lleno = rellenarCiclo(pintado, parcela, 1, 'maiz', calendarioIsla, cat);
    expect(lleno.ciclos[0]!.siembra).toBe('2026-06-01');
    expect(lleno.ciclos[0]!.temporada).toBe('PV');
    expect(lleno.ciclos[0]!.porQue).toContain('Inicio de la ventana');
    expect(lleno.porCelda).toBeNull();
    // Frijol OI empieza el 1 de septiembre, que choca con el maiz del ciclo 1: se conserva la fecha del plan.
    const frijol = rellenarCiclo(r1(), parcela, 2, 'frijol', calendarioIsla, cat);
    expect(frijol.ciclos[1]!.siembra).toBe('2026-11-01');
    // Sin ventana con fuente (calabaza), tambien se conserva la fecha.
    expect(rellenarCiclo(r1(), parcela, 3, 'calabaza', calendarioIsla, cat).ciclos[2]!.siembra).toBe('2027-06-15');
  });
});
