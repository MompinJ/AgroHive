// Pruebas de los hallazgos de la auditoria del back en el motor (docs/hallazgos-back.md). Cada una fallaba antes de su arreglo.
import { describe, expect, it } from 'vitest';
import type { SeleccionEscenarios } from '../escenarios';
import { crearClienteMotor, type WorkerMotor } from '../cliente';
import { EstadoMotor } from '../protocolo';
import type { CatalogoCultivos, Parcela, PlanSiembra, ResultadoCeldas, ResultadoRotacion, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import { seriePowerIsla, serieSintetica, validadorContrato } from './utiles';
import { candidatosAnalogos } from '../analogos';
import { ventanasDe } from '../tarjetas';
import capaDemo from '../../../../datos/demo/respuestas/proxima-temporada.json';
import type { ProximaTemporadaAproximada } from '../../../../contratos/tipos/contratos';

const validarRotacion = validadorContrato('resultado-rotacion');

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
    const roto = { ...b, catalogo: null as unknown as CatalogoCultivos, plan: plan('maiz') };
    expect(m.atender({ id: 3, tipo: 'simular', entradas: roto }).ok).toBe(false);
    expect(m.atender({ id: 4, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' }).ok).toBe(false);
    const rk = m.atender({ id: 6, tipo: 'rankear' });
    expect(rk.ok && (rk.resultado as { orden: unknown[] }).orden).toEqual([]);
  });

  it.each(['2016-02-30', '', '2016-6-15'])('H-M4: una siembra que no es fecha (%j) deja la rotacion NO_EVALUABLE con motivo, sin lanzar', (siembra) => {
    const m = new EstadoMotor();
    const b = base(m);
    const r = m.atender({ id: 2, tipo: 'simular', entradas: { ...b, plan: plan('maiz', siembra) } });
    expect(r.ok).toBe(true);
    const rot = r.ok ? (r.resultado as ResultadoRotacion) : null;
    expect(rot?.estado).toBe('NO_EVALUABLE');
    expect(rot?.porEscenario.seco.pilares.deficitHidrico.motivo).toContain('no es una fecha valida');
    expect(validarRotacion(rot)).toEqual([]);
    expect(m.atender({ id: 3, tipo: 'rankear' }).ok).toBe(true);
    expect(m.atender({ id: 4, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' }).ok).toBe(true);
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

  it('H-M2: sin simular el escenario, el ciclo termina con su duracion del catalogo (no se extiende hasta otra siembra)', () => {
    const m = new EstadoMotor();
    const b = base(m);
    m.atender({ id: 2, tipo: 'simular', entradas: { ...b, suelo: null, plan: plan('maiz') } });
    const c = m.atender({ id: 3, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2030-05-01' });
    const reg = c.ok ? (c.resultado as ResultadoCeldas).registros[0] : null;
    expect(reg?.etapa).toBe('suelo_desnudo');
    expect(reg?.cultivo).toBeNull();
    const dentro = m.atender({ id: 4, tipo: 'celdas', rotacionId: 'R1', escenario: 'seco', fecha: '2016-07-01' });
    const r2 = dentro.ok ? (dentro.resultado as ResultadoCeldas).registros[0] : null;
    expect(r2?.cultivo).toBe('maiz');
    expect(r2?.estado).toBe('NO_EVALUABLE');
    expect(r2?.etapa).not.toBeNull(); // la etapa sale de la duracion del catalogo, el estado del agua no
  });

  it('H-M9: un escenario NO_EVALUABLE lleva todos sus indicadores en null, con motivo (doc 05)', () => {
    const m = new EstadoMotor();
    const b = base(m);
    const r = m.atender({ id: 2, tipo: 'simular', entradas: { ...b, suelo: null, plan: plan('maiz') } });
    const rot = r.ok ? (r.resultado as ResultadoRotacion) : null;
    expect(rot?.estado).toBe('NO_EVALUABLE');
    expect(rot?.filtroClima).toBeNull();
    for (const e of ['seco', 'habitual', 'lluvioso'] as const) {
      const p = rot?.porEscenario[e].pilares;
      expect(p?.proteccionSuelo?.diasSueloDesnudo).toBeNull();
      expect(p?.aporteIndirecto?.incluyeLeguminosa).toBeNull();
      expect(p?.aporteIndirecto?.especiesDistintas).toBeNull();
      expect(p?.compatibilidadCiclo?.siembrasFueraDeVentana).toBeNull();
      expect(p?.proteccionSuelo?.motivo).toBeTruthy();
    }
    expect(validarRotacion(rot)).toEqual([]);
  });

  it('H-M8: sin area dentro de la parcela (fraccionDentro 0) la rotacion es NO_EVALUABLE, nunca NaN', () => {
    const m = new EstadoMotor();
    const b = base(m);
    const sinArea = { ...b.parcela, celdas: b.parcela.celdas.map((c) => ({ ...c, fraccionDentro: 0 })) } as Parcela;
    const r = m.atender({ id: 2, tipo: 'simular', entradas: { ...b, parcela: sinArea, plan: plan('maiz') } });
    const rot = r.ok ? (r.resultado as ResultadoRotacion) : null;
    expect(rot?.estado).toBe('NO_EVALUABLE');
    expect(JSON.stringify(rot)).not.toContain('NaN');
    expect(rot?.porEscenario.seco.pilares.deficitHidrico.motivo).toContain('fraccionDentro');
    for (const e of ['seco', 'habitual', 'lluvioso'] as const) {
      expect(Object.values(rot?.porEscenario[e].pilares ?? {}).every((p) => Object.values(p as object).every((v) => typeof v !== 'number' || Number.isFinite(v)))).toBe(true);
    }
  });
});

describe('H-M5: el cliente del worker nunca deja promesas colgadas', () => {
  class WorkerFalso implements WorkerMotor {
    onmessage: WorkerMotor['onmessage'] = null;
    onerror: WorkerMotor['onerror'] = null;
    onmessageerror: WorkerMotor['onmessageerror'] = null;
    enviados: unknown[] = [];
    postMessage(m: unknown) {
      this.enviados.push(m);
    }
    terminate() {}
  }

  it('un error del worker rechaza lo pendiente y lo que se pida despues', async () => {
    const w = new WorkerFalso();
    const c = crearClienteMotor(() => w);
    const p = c.rankear();
    w.onerror?.({ message: 'no cargo el modulo' } as ErrorEvent);
    await expect(p).rejects.toThrow('no cargo el modulo');
    await expect(c.rankear()).rejects.toThrow('fallo');
  });

  it('terminar() rechaza lo pendiente', async () => {
    const w = new WorkerFalso();
    const c = crearClienteMotor(() => w);
    const p = c.olvidar();
    c.terminar();
    await expect(p).rejects.toThrow('termino');
  });

  it('una respuesta sin id no rompe el cliente; un tipo desconocido responde un error con su id', async () => {
    const w = new WorkerFalso();
    const c = crearClienteMotor(() => w);
    const p = c.olvidar();
    expect(() => w.onmessage?.({ data: undefined } as MessageEvent)).not.toThrow();
    const r = new EstadoMotor().atender({ id: 7, tipo: 'otro' } as unknown as Parameters<EstadoMotor['atender']>[0]);
    expect(r).toEqual({ id: 7, ok: false, error: 'Peticion desconocida: otro.' });
    w.onmessage?.({ data: { id: 1, ok: true, resultado: null } } as MessageEvent);
    await expect(p).resolves.toBeUndefined();
  });
});

describe('H-M10: los huecos de simular salen de lo que paso, no de un texto fijo', () => {
  it('con el suelo real de Isla (GWETROOT) no dice "supuesta a capacidad de campo"; con el selector manual si', () => {
    const m = new EstadoMotor();
    const b = base(m);
    const real = m.atender({ id: 2, tipo: 'simular', entradas: { ...b, suelo: sueloDemo as unknown as Suelo, plan: plan('maiz') } });
    const hReal = real.ok ? (real.resultado as ResultadoRotacion).explicacion.huecos : [];
    expect(real.ok && (real.resultado as ResultadoRotacion).advertencias.map((a) => a.codigo)).toContain('CONDICION_INICIAL_GWETROOT');
    expect(hReal.join(' ')).not.toContain('capacidad de campo');
    expect(hReal.join(' ')).toContain('desde la humedad regional de POWER');
    const manual = m.atender({ id: 3, tipo: 'simular', entradas: { ...b, plan: plan('maiz') } });
    const hManual = manual.ok ? (manual.resultado as ResultadoRotacion).explicacion.huecos : [];
    expect(hManual.join(' ')).toContain('capacidad de campo');
    expect(hManual.join(' ')).not.toContain('desde la humedad regional de POWER');
  });
});

describe('H-M6: los anios analogos no tienen un anio de corte escrito a mano', () => {
  it('con una serie que llega a octubre de 2026, 2026 (nov 2025 a abr 2026) es candidato; 2027, el del horizonte, no', () => {
    const serie = serieSintetica('2005-10-01', '2026-10-31', () => 5);
    const cand = candidatosAnalogos(capaDemo as unknown as ProximaTemporadaAproximada, serie.diario).map((c) => c.anio);
    expect(cand).toContain(2026);
    expect(cand).not.toContain(2027);
    expect(Math.min(...cand)).toBe(2006);
  });
});

describe('H-M11: la tarjeta nombra la fuente real de la ventana', () => {
  it('INIFAP en Isla (el texto de la demo no cambia); GGCMI o SIAP fuera de ahi, sin decir "recomendada"', () => {
    const inifap = { nombre: 'INIFAP, Agenda Tecnica Agricola de Veracruz, 2a edicion (SAGARPA-INIFAP, 2015)' };
    const ggcmi = { nombre: 'GGCMI Phase 3 crop calendar v1.01, maiz de temporal (mai_rf)' };
    expect(ventanasDe([inifap, inifap])).toBe('las ventanas recomendadas por INIFAP');
    expect(ventanasDe([inifap], true)).toBe('la ventana recomendada por INIFAP');
    expect(ventanasDe([ggcmi], true)).toBe('la ventana de siembra de GGCMI Phase 3 crop calendar v1.01');
    expect(ventanasDe([inifap, { nombre: 'SIAP, Cierre agricola' }])).toBe('las ventanas de siembra de INIFAP y SIAP');
    expect(ventanasDe([null])).toBe('las ventanas del calendario local');
  });
});
