import { describe, expect, it } from 'vitest';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { Parcela, ResultadoCeldas } from '../../../../contratos/tipos/contratos';
import { construirEscena } from '../adaptador';
import { bloqueCentral, fichaBloque, vecino } from '../ficha';

const escena = construirEscena(structuredClone(parcelaEjemplo) as unknown as Parcela, structuredClone(resultadoEjemplo) as unknown as ResultadoCeldas);
const bloque = (id: string) => escena.bloques.find((b) => b.celdaId === id)!;
const valor = (id: string, etiqueta: string) => fichaBloque(bloque(id)).filas.find((f) => f.etiqueta === etiqueta);

describe('ficha de un bloque (A3.8)', () => {
  it('muestra los valores del motor con sus unidades', () => {
    const r = bloque('c-0-0').registro!;
    expect(valor('c-0-0', 'Humedad del suelo')?.valor).toBe(`${Math.round(r.humedad! * 100)} % del agua disponible`);
    expect(valor('c-0-0', 'Déficit acumulado')?.valor).toMatch(/^[\d.,]+ mm$/);
    expect(valor('c-0-0', 'Exceso acumulado')?.valor).toMatch(/ mm$/);
    expect(valor('c-0-0', 'Pendiente')?.valor).toMatch(/ %$/);
    expect(valor('c-0-0', 'Elevación')?.valor).toMatch(/ m$/);
    expect(valor('c-0-0', 'Cultivo')?.valor).toBe('Frijol');
  });

  it('un registro NO_EVALUABLE no muestra ningun numero: dice que falta y por que', () => {
    const f = fichaBloque(bloque('c-1-1'));
    for (const e of ['Humedad del suelo', 'Déficit acumulado', 'Exceso acumulado', 'Riesgo de erosión', 'Elevación', 'Pendiente']) {
      const fila = f.filas.find((x) => x.etiqueta === e)!;
      expect(fila.valor).toBe('NO_EVALUABLE');
      expect(fila.faltante).toBe(true);
      expect(fila.nota && fila.nota.length).toBeGreaterThan(3);
    }
    expect(f.filas.some((x) => /\b0(\.0)? (mm|%|m)\b/.test(x.valor))).toBe(false);
    expect(f.filas.find((x) => x.etiqueta === 'En este lugar')?.valor).toBe('Cultivo no recomendado');
    expect(f.filas.find((x) => x.etiqueta === 'Estado')?.nota).toMatch(/Calabaza/);
    expect(f.resumen).toMatch(/no recomendado/);
  });

  it('sin resultado del motor, la ficha lo dice en cada indicador', () => {
    const sin = construirEscena(structuredClone(parcelaEjemplo) as unknown as Parcela, null);
    const f = fichaBloque(sin.bloques[0]!);
    expect(f.filas.find((x) => x.etiqueta === 'Humedad del suelo')).toMatchObject({ valor: 'NO_EVALUABLE', nota: 'el motor no entregó resultado para esta celda' });
    expect(f.filas.find((x) => x.etiqueta === 'Cultivo')?.valor).toBe('Sin cultivo');
  });

  it('en un registro EXPLORATORIO con numeros, un hueco no se explica con el motivo general del registro', () => {
    const f = fichaBloque(bloque('c-0-1'));
    const erosion = f.filas.find((x) => x.etiqueta === 'Riesgo de erosión')!;
    expect(erosion.valor).not.toBe('NO_EVALUABLE'); // el ejemplo trae 0.3
    const r = structuredClone(resultadoEjemplo) as unknown as ResultadoCeldas;
    r.registros[0] = { ...r.registros[0]!, riesgoErosion: null };
    const e = construirEscena(structuredClone(parcelaEjemplo) as unknown as Parcela, r);
    const fila = fichaBloque(e.bloques.find((b) => b.celdaId === 'c-0-0')!).filas.find((x) => x.etiqueta === 'Riesgo de erosión')!;
    expect(fila.nota).toMatch(/erosión no se calcula/);
  });

  it('el riesgo de erosion sin calcular en un registro evaluable explica que el pilar no se calcula', () => {
    const r = structuredClone(resultadoEjemplo) as unknown as ResultadoCeldas;
    r.registros[0] = { ...r.registros[0]!, estado: 'EVALUABLE', riesgoErosion: null };
    delete r.registros[0]!.motivo;
    const e = construirEscena(structuredClone(parcelaEjemplo) as unknown as Parcela, r);
    const fila = fichaBloque(e.bloques.find((b) => b.celdaId === 'c-0-0')!).filas.find((x) => x.etiqueta === 'Riesgo de erosión')!;
    expect(fila).toMatchObject({ valor: 'NO_EVALUABLE', faltante: true });
    expect(fila.nota).toMatch(/erosión no se calcula/);
  });

  it('teclado: centro y vecinos en pantalla (este +x, norte -z)', () => {
    const c = bloqueCentral(escena.bloques)!;
    expect(c).toBeDefined();
    const sw = escena.bloques.find((b) => b.x < 0 && b.z > 0)!;
    expect(vecino(escena.bloques, sw, 1, 0).x).toBeGreaterThan(sw.x);
    expect(vecino(escena.bloques, sw, 0, -1).z).toBeLessThan(sw.z);
    expect(vecino(escena.bloques, sw, -1, 0)).toBe(sw); // borde: se queda
  });
});
