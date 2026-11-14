// Pruebas 1 a 5 de doc 05 (A2.6 y A2.7), estados de evaluabilidad y salidas conformes a contratos/.
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { anioDe, sumarDias } from '../fechas';
import { resultadoCeldas, siembraEnEscenario, simularRotacion, type EntradasMotor } from '../motor';
import type { CalendarioLocal, CatalogoCultivos, ClaseTextura, Parcela, PlanSiembra, Suelo, TablaSuelos } from '../tipos';
import catalogoJson from '../../../../datos/catalogos/cultivos.json';
import tablaJson from '../../../../datos/catalogos/suelos.json';
import parcelaJson from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import calendarioJson from '../../../../contratos/ejemplos/calendario-local.ejemplo.json';
import { seriePowerIsla, serieSintetica, validadorContrato } from './utiles';

const catalogo = catalogoJson as unknown as CatalogoCultivos;
const tabla = tablaJson as unknown as TablaSuelos;
const parcela = parcelaJson as unknown as Parcela;
const calendario = calendarioJson as unknown as CalendarioLocal;
const validarRotacion = validadorContrato('resultado-rotacion');
const validarCeldas = validadorContrato('resultado-celda');
const validarSuelo = validadorContrato('suelo');

function sueloManual(clase: ClaseTextura, grupo: 'arenoso' | 'franco' | 'arcilloso'): Suelo {
  return {
    meta: { versionContrato: '0.5.0', esEjemplo: false },
    id: `manual-${clase.replaceAll('_', '-')}`,
    etiqueta: 'SUPUESTO',
    origen: 'selector_manual',
    aviso: 'Tipo de suelo elegido por el usuario; no es una medicion de la parcela.',
    textura: { estado: 'EVALUABLE', etiqueta: 'SUPUESTO', clase, grupo },
    ph: { estado: 'NO_EVALUABLE', motivo: 'Selector manual: sin pH.' },
  };
}
const arena = sueloManual('arena_franca', 'arenoso');
const franco = sueloManual('franco', 'franco');

function plan(ciclos: { cultivo: string; siembra: string; temporada: 'PV' | 'OI' }[], extra: Partial<PlanSiembra> = {}): PlanSiembra {
  const lista = ciclos.map((c, i) => ({ ciclo: i + 1, ...c, porQue: 'Fecha elegida en la prueba.' }));
  return {
    meta: { versionContrato: '0.5.0', esEjemplo: true, aviso: 'Plan de prueba.' },
    rotacionId: 'R9',
    parcelaId: parcela.id,
    calendarioLocal: { sinCalendarioLocal: true, motivo: 'Calendario de Isla pendiente (A0.6).' },
    asignacionClima: 'temporada_tipica',
    ciclos: lista as PlanSiembra['ciclos'],
    porCelda: null,
    ...extra,
  };
}
const milpa = plan([
  { cultivo: 'maiz', siembra: '2016-06-15', temporada: 'PV' },
  { cultivo: 'frijol', siembra: '2016-11-01', temporada: 'OI' },
  { cultivo: 'maiz', siembra: '2017-06-15', temporada: 'PV' },
]);
const monocultivo = plan([
  { cultivo: 'maiz', siembra: '2016-06-15', temporada: 'PV' },
  { cultivo: 'maiz', siembra: '2017-06-15', temporada: 'PV' },
]);

// Serie sintetica de 22 anios con lluvia diaria creciente por anio: 0.3 mm/dia en 2000 hasta 8.7 mm/dia en 2021.
const sintetica = seleccionarEscenarios(serieSintetica('2000-01-01', '2021-12-31', (f) => 0.3 + 0.4 * (anioDe(f) - 2000)));

function entradas(p: PlanSiembra, suelo: Suelo | null, extra: Partial<EntradasMotor> = {}): EntradasMotor {
  return { plan: p, parcela, suelo, tablaSuelos: tabla, catalogo, escenarios: sintetica.escenarios, ...extra };
}

describe('mapeo de la siembra a la temporada del escenario (temporada_tipica, SIAP)', () => {
  it('PV en el anio agricola t; OI de octubre a diciembre en t-1 y de enero a marzo en t', () => {
    expect(siembraEnEscenario('2016-06-15', 'PV', 2023).fecha).toBe('2023-06-15');
    expect(siembraEnEscenario('2016-11-01', 'OI', 2023).fecha).toBe('2022-11-01');
    expect(siembraEnEscenario('2017-01-20', 'OI', 2023).fecha).toBe('2023-01-20');
    expect(siembraEnEscenario('2016-02-29', 'OI', 2023)).toMatchObject({ fecha: '2023-02-28' });
    expect(siembraEnEscenario('2016-11-01', 'PV', 2023).aviso).toMatch(/fuera de la ventana/);
  });
});

describe('Prueba 1: parcela plana, suelo arenoso, anio seco => deficit alto', () => {
  const r = simularRotacion(entradas(milpa, arena));
  const rFranco = simularRotacion(entradas(milpa, franco));
  it('el seco en arena tiene el deficit mas alto y es alto en terminos absolutos', () => {
    const seco = r.rotacion.porEscenario.seco.pilares.deficitHidrico;
    const lluviosoFranco = rFranco.rotacion.porEscenario.lluvioso.pilares.deficitHidrico;
    expect(seco.estado).toBe('EXPLORATORIO'); // serie sintetica: esEjemplo
    expect(seco.proporcionDemandaNoCubierta).toBeGreaterThan(0.3);
    expect(seco.proporcionDemandaNoCubierta!).toBeGreaterThan(rFranco.rotacion.porEscenario.seco.pilares.deficitHidrico.proporcionDemandaNoCubierta!);
    expect(seco.proporcionDemandaNoCubierta!).toBeGreaterThan(lluviosoFranco.proporcionDemandaNoCubierta!);
    expect(seco.diasDeficit!).toBeGreaterThan(100);
  });
  it('cumple resultado-rotacion', () => {
    expect(validarRotacion(r.rotacion)).toEqual([]);
  });
});

describe('Prueba 2: anio lluvioso => sube el exceso', () => {
  const r = simularRotacion(entradas(milpa, franco));
  it('el exceso del lluvioso supera al del seco', () => {
    const p = r.rotacion.porEscenario;
    expect(p.lluvioso.pilares.deficitHidrico.excesoTotalMm!).toBeGreaterThan(p.seco.pilares.deficitHidrico.excesoTotalMm!);
    expect(p.lluvioso.pilares.deficitHidrico.proporcionDemandaNoCubierta!).toBeLessThan(p.seco.pilares.deficitHidrico.proporcionDemandaNoCubierta!);
  });
  it.todo('el riesgo de erosion sube con la pendiente (pilar 3, A3.7; la cubeta no tiene escurrimiento con fuente)');
});

describe('Prueba 3: rotacion con leguminosa mejora el indicador indirecto frente a monocultivo', () => {
  it('milpa con frijol: incluye leguminosa y 2 especies; monocultivo de maiz: no y 1', () => {
    const conFrijol = simularRotacion(entradas(milpa, franco)).rotacion.porEscenario.habitual.pilares.aporteIndirecto;
    const mono = simularRotacion(entradas(monocultivo, franco)).rotacion.porEscenario.habitual.pilares.aporteIndirecto;
    expect(conFrijol).toMatchObject({ estado: 'EVALUABLE', incluyeLeguminosa: true, especiesDistintas: 2 });
    expect(mono).toMatchObject({ estado: 'EVALUABLE', incluyeLeguminosa: false, especiesDistintas: 1 });
  });
});

describe('Prueba 4: cambiar de escenario sin cambiar el plan => solo cambia el clima', () => {
  const r = simularRotacion(entradas(milpa, franco));
  it('mismo ciclo, cultivo y etapa en cada fecha; cambian anio y agua', () => {
    let cambiaAgua = false;
    for (let d = 0; d < 380; d += 7) {
      const fecha = sumarDias('2016-06-15', d);
      const seco = resultadoCeldas(r, 'seco', fecha)!;
      const lluv = resultadoCeldas(r, 'lluvioso', fecha)!;
      expect(seco.anioReal).not.toBe(lluv.anioReal);
      seco.registros.forEach((reg, i) => {
        const otro = lluv.registros[i]!;
        expect([reg.celdaId, reg.ciclo, reg.cultivo, reg.etapa, reg.avanceEtapa]).toEqual([otro.celdaId, otro.ciclo, otro.cultivo, otro.etapa, otro.avanceEtapa]);
        if (reg.humedad !== otro.humedad) cambiaAgua = true;
      });
    }
    expect(cambiaAgua).toBe(true);
  });
  it('cada escenario depende solo de su clima y el motor es determinista', () => {
    const soloSeco = simularRotacion(entradas(milpa, franco, { escenarios: { seco: sintetica.escenarios.seco! } }));
    expect(soloSeco.rotacion.porEscenario.seco).toEqual(r.rotacion.porEscenario.seco);
    expect(simularRotacion(entradas(milpa, franco)).rotacion).toEqual(r.rotacion);
  });
  it('resultado-celda cumple el contrato (en ciclo, entre ciclos y fuera del plan)', () => {
    for (const fecha of ['2016-06-15', '2016-08-01', '2016-10-25', '2017-01-10', '2018-01-01']) {
      expect(validarCeldas(resultadoCeldas(r, 'seco', fecha))).toEqual([]);
    }
    expect(resultadoCeldas(r, 'seco', '2016-10-25')!.registros[0]).toMatchObject({ etapa: 'suelo_desnudo', ciclo: null, cultivo: null, humedad: null });
    expect(resultadoCeldas(r, 'seco', '2016-08-01')!.registros[0]).toMatchObject({ ciclo: 1, cultivo: 'maiz', etapa: 'crecimiento' });
  });
});

describe('Prueba 5: cultivo sin parametros => NO_EVALUABLE, nunca cero', () => {
  const sinKc = structuredClone(catalogo);
  sinKc.cultivos.find((c) => c.id === 'maiz')!.kc.media = { estado: 'NO_EVALUABLE', motivo: 'Sin fuente (prueba).' };
  const r = simularRotacion(entradas(milpa, franco, { catalogo: sinKc }));
  it('la rotacion y cada escenario quedan NO_EVALUABLE con motivo y todos los indicadores en null', () => {
    expect(r.rotacion.estado).toBe('NO_EVALUABLE');
    for (const esc of ['seco', 'habitual', 'lluvioso'] as const) {
      const h = r.rotacion.porEscenario[esc].pilares.deficitHidrico;
      expect(h.estado).toBe('NO_EVALUABLE');
      expect(h.motivo).toContain('Kc medio');
      expect([h.proporcionDemandaNoCubierta, h.diasDeficit, h.diasDeficitEtapasSensibles, h.deficitTotalMm, h.excesoTotalMm]).toEqual([null, null, null, null, null]);
    }
    expect(r.rotacion.peorCaso).toBeNull();
    expect(validarRotacion(r.rotacion)).toEqual([]);
  });
  it('las celdas del ciclo sin parametros no llevan numeros; las del frijol si', () => {
    const maiz = resultadoCeldas(r, 'seco', '2016-07-01')!;
    expect(maiz.registros[0]).toMatchObject({ estado: 'NO_EVALUABLE', etapa: null, humedad: null, deficitMm: null, estadoPlanta: null });
    expect(validarCeldas(maiz)).toEqual([]);
    expect(resultadoCeldas(r, 'seco', '2016-12-01')!.registros[0]!.humedad).not.toBeNull();
  });
  it('un cultivo que no esta en el catalogo tambien es NO_EVALUABLE', () => {
    const r2 = simularRotacion(entradas(plan([{ cultivo: 'chile', siembra: '2016-06-15', temporada: 'PV' }]), franco));
    expect(r2.rotacion.estado).toBe('NO_EVALUABLE');
    expect(r2.rotacion.porEscenario.seco.pilares.deficitHidrico.motivo).toContain('no esta en el catalogo');
  });
});

describe('estados de evaluabilidad (A2.7)', () => {
  it('suelo franco arcillo arenoso (Isla) => TAW NO_EVALUABLE hasta A2.16', () => {
    const isla: Suelo = { ...sueloManual('franco_arcillo_arenoso', 'arcilloso'), origen: 'mapa_global' };
    expect(validarSuelo(isla)).toEqual([]);
    const r = simularRotacion(entradas(milpa, isla));
    expect(r.rotacion.estado).toBe('NO_EVALUABLE');
    expect(r.rotacion.porEscenario.seco.pilares.deficitHidrico.motivo).toMatch(/A2.16/);
  });
  it('sin suelo => NO_EVALUABLE', () => {
    expect(simularRotacion(entradas(milpa, null)).rotacion.estado).toBe('NO_EVALUABLE');
  });
  it('ciclos traslapados => plan invalido, NO_EVALUABLE', () => {
    const malo = plan([
      { cultivo: 'maiz', siembra: '2016-06-15', temporada: 'PV' },
      { cultivo: 'frijol', siembra: '2016-08-01', temporada: 'PV' },
    ]);
    const r = simularRotacion(entradas(malo, franco));
    expect(r.rotacion.estado).toBe('NO_EVALUABLE');
    expect(r.rotacion.advertencias.some((a) => a.codigo === 'PLAN_INVALIDO' && a.mensaje.includes('se traslapa'))).toBe(true);
  });
  it('falta un escenario => ese escenario NO_EVALUABLE y la rotacion tambien', () => {
    const r = simularRotacion(entradas(milpa, franco, { escenarios: { seco: sintetica.escenarios.seco!, habitual: sintetica.escenarios.habitual! } }));
    expect(r.rotacion.porEscenario.lluvioso.estado).toBe('NO_EVALUABLE');
    expect(r.rotacion.porEscenario.lluvioso.anioReal).toBeNull();
    expect(r.rotacion.estado).toBe('NO_EVALUABLE');
    expect(validarRotacion(r.rotacion)).toEqual([]);
    expect(resultadoCeldas(r, 'lluvioso', '2016-07-01')).toBeNull();
  });
  it('clima de respaldo => RESPALDO_HISTORICO', () => {
    const base = serieSintetica('2000-01-01', '2021-12-31', (f) => 0.3 + 0.4 * (anioDe(f) - 2000));
    const sel = seleccionarEscenarios({ ...base, meta: { versionContrato: '0.5.0', esEjemplo: false }, estado: 'RESPALDO_HISTORICO', respaldo: true });
    const r = simularRotacion(entradas(milpa, franco, { escenarios: sel.escenarios }));
    expect(r.rotacion.porEscenario.habitual.pilares.deficitHidrico.estado).toBe('RESPALDO_HISTORICO');
    expect(r.rotacion.estado).toBe('RESPALDO_HISTORICO');
    expect(validarRotacion(r.rotacion)).toEqual([]);
  });
  it('cultivo no registrado en el lugar => se muestra, no se recomienda: EXPLORATORIO', () => {
    const conCalabaza = plan(
      [
        { cultivo: 'calabaza', siembra: '2016-06-15', temporada: 'PV' },
        { cultivo: 'frijol', siembra: '2016-11-01', temporada: 'OI' },
      ],
      { calendarioLocal: { calendarioId: calendario.id } },
    );
    const r = simularRotacion(entradas(conCalabaza, franco, { calendario }));
    expect(r.rotacion.estado).toBe('EXPLORATORIO');
    expect(r.rotacion.cultivosNoRecomendados?.[0]).toMatchObject({ cultivo: 'calabaza', ciclos: [1] });
    expect(validarRotacion(r.rotacion)).toEqual([]);
    const celdas = resultadoCeldas(r, 'habitual', '2016-07-01')!;
    expect(celdas.registros[0]).toMatchObject({ estado: 'EXPLORATORIO', noRecomendadoEnLugar: true });
    expect(validarCeldas(celdas)).toEqual([]);
  });
});

describe('condicion inicial con GWETROOT (requiere retencion de Saxton y Rawls, A2.16)', () => {
  it('sin retencion del suelo se usa capacidad de campo declarada; con retencion se convierte GWETROOT', () => {
    const r = simularRotacion(entradas(milpa, franco));
    expect(r.rotacion.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_SUPUESTA')).toBe(true);
    const cita = { nombre: 'Prueba (no es Saxton y Rawls)' };
    const conRetencion: Suelo = {
      ...franco,
      agua: {
        tawMmPorM: { estado: 'EVALUABLE', valor: 150, unidad: 'mm/m', fuente: cita },
        metodoTaw: { metodo: 'pedotransferencia_saxton_rawls_2006', fuente: cita },
        retencion: {
          thetaSatM3M3: { estado: 'EVALUABLE', valor: 0.45, unidad: 'm3/m3', fuente: cita },
          thetaFcM3M3: { estado: 'EVALUABLE', valor: 0.3, unidad: 'm3/m3', fuente: cita },
          thetaWpM3M3: { estado: 'EVALUABLE', valor: 0.15, unidad: 'm3/m3', fuente: cita },
        },
      },
    };
    const escenarios = Object.fromEntries(
      Object.entries(sintetica.escenarios).map(([k, v]) => [k, { ...v, diario: v.diario.map((d) => ({ ...d, humedadRaizFraccionSat: 0.5 })) }]),
    );
    const g = simularRotacion(entradas(milpa, conRetencion, { escenarios }));
    expect(g.rotacion.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_GWETROOT')).toBe(true);
    // theta = 0.5 x 0.45 = 0.225 < thetaFC: arranca con agotamiento y en el lluvioso hay menos exceso que a capacidad de campo.
    const base = simularRotacion(entradas(milpa, { ...conRetencion, agua: { ...conRetencion.agua!, retencion: undefined as never } }));
    expect(g.rotacion.porEscenario.lluvioso.pilares.deficitHidrico.excesoTotalMm!).toBeLessThan(
      base.rotacion.porEscenario.lluvioso.pilares.deficitHidrico.excesoTotalMm!,
    );
  });
});

describe('integracion con la serie real del paquete de demo (A2.4), suelo franco del selector', () => {
  const sel = seleccionarEscenarios(seriePowerIsla());
  const r = simularRotacion(entradas(milpa, franco, { escenarios: sel.escenarios }));
  it('evalua la milpa en 2023 / 2008 / 2024 con Penman-Monteith y salida conforme al contrato', () => {
    const p = r.rotacion.porEscenario;
    expect([p.seco.anioReal, p.habitual.anioReal, p.lluvioso.anioReal]).toEqual([2023, 2008, 2024]);
    for (const esc of ['seco', 'habitual', 'lluvioso'] as const) {
      expect(r.simulaciones[esc].metodoEt0.penman_monteith_fao56).toBeGreaterThan(500);
      expect(r.simulaciones[esc].metodoEt0.hargreaves_fao56).toBe(0);
    }
    expect(p.seco.pilares.deficitHidrico.proporcionDemandaNoCubierta!).toBeGreaterThan(p.lluvioso.pilares.deficitHidrico.proporcionDemandaNoCubierta!);
    expect(validarRotacion(r.rotacion)).toEqual([]);
    expect(validarCeldas(resultadoCeldas(r, 'seco', '2016-08-15'))).toEqual([]);
  });
  it('rapido: recalcular la rotacion en los tres escenarios toma menos de 300 ms', () => {
    const t0 = performance.now();
    simularRotacion(entradas(milpa, franco, { escenarios: sel.escenarios }));
    expect(performance.now() - t0).toBeLessThan(300);
  });
});
