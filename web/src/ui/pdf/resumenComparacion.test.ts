import { describe, expect, it } from 'vitest';
import type { Hecho } from '../lab/historial';
import { AVISO_PIE, construirResumenPdf, FUENTES_PDF, MAX_HECHOS_EN_PDF, nombreArchivoPdf, type DatosResumen, type RotacionResumen } from './resumenComparacion';

const aTexto = (b: Uint8Array) => Array.from(b, (x) => String.fromCharCode(x)).join('');
/** El texto que el PDF dibuja de verdad: cada (..) Tj desescapado y unido con espacios (un renglon de tabla puede partirse en dos). */
const dibujado = (bytes: Uint8Array) => [...aTexto(bytes).matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1]!.replace(/\\([()\\])/g, '$1')).join(' ').replace(/\s+/g, ' ');
const anios = (a: number | null, b: number | null, c: number | null) => [
  { nombre: 'Año seco', anioReal: 2023, mm: a }, { nombre: 'Año normal', anioReal: 2016, mm: b }, { nombre: 'Año lluvioso', anioReal: 2024, mm: c },
];
const rotacion = (id: string, nombre: string, posicion: number | null, extra: Partial<RotacionResumen> = {}): RotacionResumen => ({
  id, nombre, posicion, estado: 'EVALUABLE',
  ciclos: [
    { ciclo: 1, cultivo: 'Maíz', siembra: '2026-06-15', cosecha: '2026-10-17', dias: 124, plagas: ['Chapulín de la milpa: 4 bloques de maíz sin insecticida'] },
    { ciclo: 2, cultivo: 'Frijol', siembra: '2026-11-01', cosecha: null, dias: null, plagas: [] },
  ],
  anios: anios(25.3, 7.9, 3.1), peor: 'Año seco', debilidades: ['Le faltó agua en el año seco.'], fortalezas: ['Aguanta el año lluvioso.'], ...extra,
});
const hecho = (id: number, titulo: string, extra: Partial<Hecho> = {}): Hecho => ({ id, tipo: 'cosecha', cuando: id * 1000, titulo, ...extra });
const base = (): DatosResumen => ({
  fecha: new Date(Date.UTC(2026, 10, 15, 18, 0)),
  parcela: { nombre: 'Isla, Veracruz', areaHa: 2, celdas: 4, tamanoCeldaM: 70.71, esDemo: true },
  ponderacion: 'Gana la que menos sufre en su peor año.',
  rotaciones: [rotacion('R1', 'Rotación 1', 1), rotacion('R2', 'Rotación 2', 2, { anios: anios(40, 12, null), peor: 'Año seco' })],
  elegida: 'R1', limites: ['Clima regional de NASA POWER: el mismo para toda la parcela.'],
  hechos: [hecho(1, 'Maíz se cosecha el 17 de octubre de 2026', { fechaSim: '2026-10-17' }), { id: 2, tipo: 'siembra', cuando: 2000, celdas: 3, sujeto: 'Frijol', ciclo: 2 }],
});

describe('resumen de la comparacion en PDF', () => {
  const bytes = construirResumenPdf(base());
  const crudo = aTexto(bytes);
  const t = dibujado(bytes);
  it('es un PDF valido con el titulo y la fecha', () => {
    expect(crudo.startsWith('%PDF-1.4')).toBe(true);
    expect(crudo.endsWith('%%EOF\n')).toBe(true);
    expect(t).toContain('Generado el 15 de noviembre de 2026 · Isla, Veracruz');
  });
  it('describe la parcela con la escala de la celda y dice que la demo es ficticia', () => {
    expect(t).toContain('2 hectáreas, 4 celdas (1 celda = 70.7 m × 70.7 m (~ 0.50 ha))'); // el signo ≈ no existe en WinAnsi: sale ~
    expect(t).toContain('sus 2 hectáreas son ficticias');
  });
  it('lista el ranking con el agua que falto en cada anio real y marca el plan elegido', () => {
    expect(t).toContain('Rotación 1 (tu plan)');
    expect(t).toContain('25 mm (2023)');
    expect(t).toContain('sin dato'); // el año lluvioso de la rotacion 2 no tiene dato
    expect(t).toContain('Lugar 1 · Rotación 1 (la más robusta) · tu plan');
    expect(t).toContain('Lugar 2 · Rotación 2');
  });
  it('por rotacion trae siembra, cosecha aproximada, plagas, peor anio, debilidades y fortalezas', () => {
    expect(t).toContain('15 de junio de 2026');
    expect(t).toContain('17 de octubre de 2026 (124 días)');
    expect(t).toContain('Chapulín de la milpa: 4 bloques de maíz sin insecticida');
    expect(t).toContain('Sin plagas pendientes');
    expect(t).toContain('Su peor año: año seco.');
    expect(t).toContain('Le faltó agua en el año seco.');
    expect(t).toContain('Aguanta el año lluvioso.');
  });
  it('un ciclo sin cosecha calculable dice "sin dato" en vez de inventarla', () => {
    expect(t).toContain('1 de noviembre de 2026 sin dato'); // la cosecha del ciclo 2 no se puede calcular: no se inventa
    expect(t).not.toContain('null');
  });
  it('incluye el historial de hechos, las fuentes y los limites', () => {
    expect(t).toContain('Historial de hechos');
    expect(t).toContain('Cosecha: Maíz se cosecha el 17 de octubre de 2026 (en la simulación: 17 de octubre de 2026)');
    expect(t).toContain('Siembra: Sembraste Frijol en 3 celdas (ciclo 2)');
    expect(t).toContain('Lo que este cálculo no ve');
    for (const f of FUENTES_PDF) expect(t).toContain(f);
    expect(t).toContain('no predice cosechas ni ingresos');
  });
  it('el pie con el aviso esta en cada pagina', () => {
    const paginas = Number(/\/Count (\d+)/.exec(crudo)![1]);
    expect(t.split(AVISO_PIE)).toHaveLength(paginas + 1);
  });
});

describe('casos sin datos', () => {
  it('sin rotaciones, hechos ni limites lo dice y sigue siendo un PDF valido', () => {
    const bytes = construirResumenPdf({ ...base(), rotaciones: [], elegida: null, hechos: [], limites: [] });
    const t = dibujado(bytes);
    expect(t).toContain('Todavía no hay rotaciones comparadas.');
    expect(t).toContain('No se registraron hechos en esta sesión.');
    expect(t).not.toContain('Lo que este cálculo no ve');
    expect(aTexto(bytes).endsWith('%%EOF\n')).toBe(true);
  });
  it('una parcela propia no lleva la nota de demostracion y sin area no la inventa', () => {
    const t = dibujado(construirResumenPdf({ ...base(), parcela: { nombre: 'Mi parcela', areaHa: null, celdas: 1, tamanoCeldaM: 100, esDemo: false } }));
    expect(t).not.toContain('ficticias');
    expect(t).toContain('Mi parcela: 1 celda (1 celda = 100 m × 100 m (~ 1.00 ha)).');
    expect(t).not.toContain('hectáreas,');
  });
  it('una rotacion que no se pudo evaluar lo dice', () => {
    const t = dibujado(construirResumenPdf({ ...base(), rotaciones: [rotacion('R1', 'Rotación 1', null, { estado: 'NO_EVALUABLE' })], elegida: null }));
    expect(t).toContain('Estado: sin evaluar.');
  });
  it('con muchos hechos muestra solo los ultimos y avisa', () => {
    const hechos = Array.from({ length: MAX_HECHOS_EN_PDF + 15 }, (_, k) => hecho(k + 1, `Hecho ${k + 1}`));
    const t = dibujado(construirResumenPdf({ ...base(), hechos }));
    expect(t).toContain(`Se muestran los últimos ${MAX_HECHOS_EN_PDF} de ${MAX_HECHOS_EN_PDF + 15} hechos.`);
    expect(t).toContain(`Hecho ${MAX_HECHOS_EN_PDF + 15}`);
    expect(t).not.toMatch(/Cosecha: Hecho 1(?!\d)/); // el hecho 1 ya no cabe: quedan los 60 ultimos
  });
  it('el nombre del archivo lleva la fecha', () => {
    expect(nombreArchivoPdf(new Date(Date.UTC(2026, 10, 15)))).toBe('agrohive-resumen-2026-11-15.pdf');
  });
});
