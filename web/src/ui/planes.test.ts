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
    expect(planes.find((p) => p.rotacionId === 'R3')!.ciclos.every((c) => c.dentroDeVentana === true)).toBe(true);
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

describe('paleta de cultivos', () => {
  it('agrupa el catalogo por tipo sin perder ni repetir cultivos', async () => {
    const { agruparCultivos } = await import('./planes');
    const cultivos = (catalogo as CatalogoCultivos).cultivos;
    const grupos = agruparCultivos(cultivos);
    const ids = grupos.flatMap((g) => g.cultivos.map((c) => c.id));
    expect(ids.sort()).toEqual(cultivos.map((c) => c.id).sort());
    expect(grupos.find((g) => g.nombre === 'Leguminosas')!.cultivos.every((c) => c.esLeguminosa === true)).toBe(true);
    expect(grupos[0]!.nombre).toBe('Cereales');
  });
});

describe('rotaciones sin limite de ciclos', () => {
  it('agrega un ciclo despues del ultimo, sin traslapes, y lo puede quitar renumerando', async () => {
    const { agregarCiclo, quitarCiclo, nuevaRotacion, nombreRotacion } = await import('./planes');
    const cat = catalogo as CatalogoCultivos;
    const planes = planesIniciales(parcela, calendarioIsla);
    expect(planes.map((p) => p.rotacionId)).toEqual(['R1', 'R2', 'R3']);
    const r1 = planes[0]!;
    const con4 = agregarCiclo(r1, parcela, calendarioIsla, cat);
    expect(con4.ciclos).toHaveLength(4);
    expect(con4.ciclos[3]!.cultivo).toBe('frijol');
    expect(conflictosPlan(con4, cat)).toEqual([]);
    // No espera casi un anio a la siguiente ventana.
    expect(Date.parse(con4.ciclos[3]!.siembra) - Date.parse(con4.ciclos[2]!.siembra)).toBeLessThan(250 * 86400000);
    const pintado = pintarCeldas(con4, parcela, 4, [parcela.celdas[0]!.id], 'maiz', calendarioIsla);
    const sin2 = quitarCiclo(pintado, parcela, 2, calendarioIsla);
    expect(sin2.ciclos.map((c) => c.ciclo)).toEqual([1, 2, 3]);
    expect(sin2.porCelda?.[parcela.celdas[0]!.id]).toEqual([{ ciclo: 3, cultivo: 'maiz' }]);
    const nueva = nuevaRotacion(r1, planes, parcela, calendarioIsla);
    expect(nueva.rotacionId).toBe('R4');
    expect(nombreRotacion('R3', [...planes, nueva])).toBe('Rotación 3');
    expect(validadorContrato('plan-siembra')(con4)).toEqual([]);
  });
});

describe('guardado por parcela', () => {
  it('una rotacion guardada de otra parcela o calendario se rearma con la de ahora', async () => {
    const { reconstruirPlan, claveDeParcela } = await import('./planes');
    const guardada = pintarCeldas(planesIniciales(parcela, calendarioIsla)[0]!, parcela, 1, [parcela.celdas[0]!.id], 'frijol', calendarioIsla);
    // Otra parcela con otras celdas y sin calendario local (por ejemplo, fuera de Mexico).
    const otra = { ...parcela, centroide: [-98.5, 39.5] as [number, number], celdas: parcela.celdas.slice(1) } as typeof parcela;
    const r = reconstruirPlan(guardada, otra, null);
    expect(r.calendarioLocal).toHaveProperty('sinCalendarioLocal', true);
    expect(r.ciclos.every((c) => !c.porQue.includes('Isla'))).toBe(true);
    expect(r.ciclos.every((c) => c.dentroDeVentana === null)).toBe(true);
    expect(r.porCelda).toBeNull();
    expect(validadorContrato('plan-siembra')(r)).toEqual([]);
    expect(claveDeParcela(parcela, true)).toBe(parcela.id);
    expect(claveDeParcela(otra, false)).not.toBe(claveDeParcela({ ...otra, centroide: [-90, 20] } as typeof parcela, false));
  });
});

describe('reacomodo de ciclos', () => {
  it('un cultivo largo recorre los ciclos siguientes en vez de bloquearse', async () => {
    const { acomodarCiclos, aplicarAcomodando, rellenarCiclo } = await import('./planes');
    const cat = catalogo as CatalogoCultivos;
    const r1 = planesIniciales(parcela, calendarioIsla)[0]!;
    // Jitomate (145 dias) desde el 15 de junio no termina antes del 1 de noviembre.
    const conTomate = rellenarCiclo(r1, parcela, 1, 'tomate', calendarioIsla, cat);
    expect(conflictosPlan(conTomate, cat).length).toBeGreaterThan(0);
    const r = aplicarAcomodando(conTomate, parcela, calendarioIsla, cat);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(conflictosPlan(r.plan, cat)).toEqual([]);
    expect(r.movidos[0]!.ciclo).toBe(2);
    expect(r.plan.ciclos[1]!.siembra > '2026-11-01').toBe(true);
    expect(validadorContrato('plan-siembra')(r.plan)).toEqual([]);
    // Sin conflicto no mueve nada.
    expect(acomodarCiclos(r1, parcela, calendarioIsla, cat).movidos).toEqual([]);
  });
});
