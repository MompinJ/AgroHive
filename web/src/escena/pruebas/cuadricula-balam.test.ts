// La parcela que sale de la cuadricula de balam (web/src/ui/cuadricula.ts, A2.9)
// se dibuja bien en la escena: contrato, tope, huecos sin elevacion y orientacion.
import { describe, expect, it } from 'vitest';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import type { LonLat, Parcela } from '../../../../contratos/tipos/contratos';
import { validadorContrato } from '../../motor/pruebas/utiles';
import { generarCuadricula } from '../../ui/cuadricula';
import { construirEscena, orientacion } from '../adaptador';
import { TOPE_CELDAS } from '../modelo';

const validar = validadorContrato('parcela');
const LAT0 = 18.03;
const LON0 = -95.53;
const M_LAT = 1 / 111195;
const M_LON = 1 / (111195 * Math.cos((LAT0 * Math.PI) / 180));
const enMetros = (puntos: [number, number][]): LonLat[] => puntos.map(([x, y]) => [LON0 + x * M_LON, LAT0 + y * M_LAT]);

describe('cuadricula de balam -> escena', () => {
  it('la parcela demo cumple el contrato y la escena la dibuja como huecos hasta tener elevacion', () => {
    const { parcela } = generarCuadricula(parcelaEjemplo.poligono.slice(0, -1) as LonLat[]);
    expect(validar(parcela)).toEqual([]);
    const e = construirEscena(parcela, null);
    expect(e.bloques).toHaveLength(parcela.celdas.length);
    expect(e.bloques.every((b) => b.relieve.tipo === 'sin_elevacion' && b.estadoVisual === 'sin_resultado')).toBe(true);
    expect(e.avisos.some((a) => a.codigo === 'ESCENA_ELEVACION_FALTANTE')).toBe(true);
  });

  it('una parcela grande no pasa del tope y la escena la dibuja completa', () => {
    const { parcela } = generarCuadricula(enMetros([[0, 0], [5000, 0], [5000, 3000], [0, 3000]]));
    expect(parcela.celdas.length).toBeLessThanOrEqual(TOPE_CELDAS);
    expect(validar(parcela)).toEqual([]);
    expect(construirEscena(parcela, null).bloques).toHaveLength(parcela.celdas.length);
  });

  it('orienta el relieve como el mapa: norte al fondo (-z) y este a la derecha (+x)', () => {
    const { parcela } = generarCuadricula(enMetros([[0, 0], [400, 0], [400, 300], [0, 300]]));
    expect(orientacion(parcela)).toEqual({ iCreceAlNorte: true, jCreceAlOeste: false });
    // Elevacion de prueba que sube hacia el norte (no son datos: solo para ver la orientacion).
    const conRelieve: Parcela = {
      ...parcela,
      celdas: parcela.celdas.map((c) => ({ ...c, elevacionM: Math.round((c.centro[1] - LAT0) / M_LAT) })) as Parcela['celdas'],
    };
    const e = construirEscena(conRelieve, null, { exageracionVertical: 1 });
    const alto = (b: (typeof e.bloques)[number]) => (b.relieve.tipo === 'medido' ? b.relieve.alturaEscena : -1);
    const masAlto = e.bloques.reduce((a, b) => (alto(b) > alto(a) ? b : a));
    const masBajo = e.bloques.reduce((a, b) => (alto(b) < alto(a) ? b : a));
    expect(masAlto.z).toBeLessThan(masBajo.z);
    const oeste = e.bloques.reduce((a, b) => (b.registro === null && parcela.celdas.find((c) => c.id === b.celdaId)!.centro[0] < parcela.celdas.find((c) => c.id === a.celdaId)!.centro[0] ? b : a));
    expect(oeste.x).toBeLessThan(0);
  });

  it('el ejemplo de contratos (i = 0 al norte) conserva su orientacion', () => {
    expect(orientacion(parcelaEjemplo as unknown as Parcela)).toEqual({ iCreceAlNorte: false, jCreceAlOeste: false });
    const e = construirEscena(parcelaEjemplo as unknown as Parcela, null);
    expect(e.bloques.find((b) => b.celdaId === 'c-0-0')!.z).toBeLessThan(0);
  });

  it('una celda de borde parcial conserva su fraccionDentro', () => {
    const { parcela } = generarCuadricula(enMetros([[0, 0], [300, 0], [300, 100], [100, 100], [100, 300], [0, 300]]));
    expect(validar(parcela)).toEqual([]);
    const e = construirEscena(parcela, null);
    expect(e.bloques.some((b) => b.fraccionDentro !== null && b.fraccionDentro < 1)).toBe(true);
  });
});
