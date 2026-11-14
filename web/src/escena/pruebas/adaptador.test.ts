import { describe, expect, it } from 'vitest';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { Parcela, RegistroCelda, ResultadoCeldas } from '../../../../contratos/tipos/contratos';
import { construirEscena, estadoVisualDe, fechasDe } from '../adaptador';
import { TOPE_CELDAS } from '../modelo';

// Datos de prueba: ejemplos de contratos/ (meta.esEjemplo = true, valores ficticios).
const parcela = (): Parcela => structuredClone(parcelaEjemplo) as Parcela;
const resultado = (): ResultadoCeldas => structuredClone(resultadoEjemplo) as ResultadoCeldas;

describe('construirEscena con los ejemplos de contratos', () => {
  const escena = construirEscena(parcela(), resultado());
  const bloque = (id: string) => escena.bloques.find((b) => b.celdaId === id)!;

  it('crea un bloque por celda en una cuadricula 2 x 2 centrada', () => {
    expect(escena.bloques).toHaveLength(4);
    expect(escena.filas).toBe(2);
    expect(escena.columnas).toBe(2);
    expect(bloque('c-0-0')).toMatchObject({ x: -0.5, z: -0.5 });
    expect(bloque('c-1-1')).toMatchObject({ x: 0.5, z: 0.5 });
  });

  it('marca los datos de ejemplo con un aviso critico visible', () => {
    expect(escena.esEjemplo).toBe(true);
    const aviso = escena.avisos.find((a) => a.codigo === 'DATOS_DE_EJEMPLO');
    expect(aviso?.severidad).toBe('critico');
    expect(escena.avisos.filter((a) => a.codigo === 'DATOS_DE_EJEMPLO')).toHaveLength(1);
  });

  it('calcula la altura relativa a la elevacion medida mas baja, con la exageracion declarada', () => {
    expect(escena.elevacionBaseM).toBe(29.5);
    const r = bloque('c-0-0').relieve;
    expect(r.tipo).toBe('medido');
    if (r.tipo === 'medido') {
      expect(r.alturaEscena).toBeCloseTo(((31 - 29.5) / 70.71) * escena.exageracionVertical, 6);
    }
    expect(escena.avisos.some((a) => a.codigo === 'ESCENA_EXAGERACION_VERTICAL')).toBe(true);
  });

  it('una celda sin elevacion es un hueco NO_EVALUABLE, no nivel cero', () => {
    const b = bloque('c-1-1');
    expect(b.relieve.tipo).toBe('sin_elevacion');
    expect(b.relieve).not.toHaveProperty('alturaEscena');
    expect(escena.avisos.some((a) => a.codigo === 'ESCENA_ELEVACION_FALTANTE')).toBe(true);
  });

  it('copia el estado de la planta que entrega el motor', () => {
    expect(bloque('c-0-0').estadoVisual).toBe('estresada');
    expect(bloque('c-0-1').estadoVisual).toBe('normal');
    expect(bloque('c-1-0').estadoVisual).toBe('marchita');
  });

  it('un registro NO_EVALUABLE se muestra como NO_EVALUABLE, con su motivo y su cultivo no recomendado', () => {
    const b = bloque('c-1-1');
    expect(b.estadoVisual).toBe('NO_EVALUABLE');
    expect(b.motivo).toMatch(/Calabaza/);
    expect(b.noRecomendadoEnLugar).toBe(true);
    expect(b.cultivo).toBe('calabaza');
  });

  it('usa la fecha mas temprana si no se pide otra', () => {
    expect(escena.fecha).toBe('2015-12-01');
  });
});

describe('huecos y casos limite', () => {
  it('sin resultado del motor, todas las celdas quedan sin_resultado (nunca normal)', () => {
    const e = construirEscena(parcela(), null);
    expect(e.fecha).toBeNull();
    expect(e.bloques.every((b) => b.estadoVisual === 'sin_resultado' && b.registro === null)).toBe(true);
  });

  it('una celda sin registro queda sin_resultado', () => {
    const r = resultado();
    r.registros = r.registros.filter((x) => x.celdaId !== 'c-0-1');
    const e = construirEscena(parcela(), r);
    expect(e.bloques.find((b) => b.celdaId === 'c-0-1')?.estadoVisual).toBe('sin_resultado');
  });

  it('no representa un resultado de otra parcela', () => {
    const r = resultado();
    r.parcelaId = 'otra-parcela';
    const e = construirEscena(parcela(), r);
    expect(e.avisos.some((a) => a.codigo === 'RESULTADO_DE_OTRA_PARCELA' && a.severidad === 'critico')).toBe(true);
    expect(e.bloques.every((b) => b.estadoVisual === 'sin_resultado')).toBe(true);
  });

  it('elige los registros de la fecha pedida', () => {
    const r = resultado();
    const otro: RegistroCelda = { ...r.registros[0]!, fecha: '2015-12-15', estadoPlanta: 'podrida' };
    r.registros.push(otro);
    expect(fechasDe(r)).toEqual(['2015-12-01', '2015-12-15']);
    const e = construirEscena(parcela(), r, { fecha: '2015-12-15' });
    expect(e.bloques.find((b) => b.celdaId === 'c-0-0')?.estadoVisual).toBe('podrida');
    expect(e.bloques.find((b) => b.celdaId === 'c-0-1')?.estadoVisual).toBe('sin_resultado');
  });

  it('respeta el tope de celdas: no dibuja una parcela recortada', () => {
    const p = parcela();
    const base = p.celdas[0];
    p.celdas = Array.from({ length: TOPE_CELDAS + 1 }, (_, k) => ({
      ...base,
      id: `c-${Math.floor(k / 41)}-${k % 41}`,
      i: Math.floor(k / 41),
      j: k % 41,
    })) as Parcela['celdas'];
    const e = construirEscena(p, null);
    expect(e.bloques).toHaveLength(0);
    expect(e.avisos.some((a) => a.codigo === 'TOPE_CELDAS_SUPERADO' && a.severidad === 'critico')).toBe(true);
  });

  it('acepta exactamente el tope de celdas', () => {
    const p = parcela();
    const base = p.celdas[0];
    p.celdas = Array.from({ length: TOPE_CELDAS }, (_, k) => ({
      ...base,
      id: `c-${Math.floor(k / 40)}-${k % 40}`,
      i: Math.floor(k / 40),
      j: k % 40,
    })) as Parcela['celdas'];
    const e = construirEscena(p, null);
    expect(e.bloques).toHaveLength(TOPE_CELDAS);
    expect(e.filas).toBe(40);
    expect(e.columnas).toBe(40);
  });

  it('sin ninguna elevacion no hay base ni alturas inventadas', () => {
    const p = parcela();
    for (const c of p.celdas) c.elevacionM = null;
    const e = construirEscena(p, null);
    expect(e.elevacionBaseM).toBeNull();
    expect(e.bloques.every((b) => b.relieve.tipo === 'sin_elevacion')).toBe(true);
  });

  it('rechaza una exageracion vertical no positiva', () => {
    expect(() => construirEscena(parcela(), null, { exageracionVertical: 0 })).toThrow(RangeError);
  });

  it('la exageracion escala la altura de forma lineal', () => {
    const a = construirEscena(parcela(), null, { exageracionVertical: 1 }).bloques[0]!.relieve;
    const b = construirEscena(parcela(), null, { exageracionVertical: 5 }).bloques[0]!.relieve;
    if (a.tipo !== 'medido' || b.tipo !== 'medido') throw new Error('se esperaba relieve medido');
    expect(b.alturaEscena).toBeCloseTo(a.alturaEscena * 5, 9);
  });
});

describe('estadoVisualDe', () => {
  const base = resultado().registros[0]!;
  it('ERROR_DATOS gana sobre el estado de la planta', () => {
    expect(estadoVisualDe({ ...base, estado: 'ERROR_DATOS', motivo: 'API caida' }).estado).toBe('ERROR_DATOS');
  });
  it('suelo desnudo es su propio estado', () => {
    expect(estadoVisualDe({ ...base, etapa: 'suelo_desnudo', cultivo: null, estadoPlanta: null }).estado).toBe('suelo_desnudo');
  });
  it('sin estadoPlanta no se supone normal', () => {
    expect(estadoVisualDe({ ...base, estadoPlanta: null }).estado).toBe('sin_resultado');
  });
});
