// A4.3: tarjetas de rotacion (plantilla sin LLM). Cada frase sale de un numero o una fuente del resultado.
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { simularRotacion, type EntradasMotor } from '../motor';
import { EstadoMotor } from '../protocolo';
import { rankear } from '../ranking';
import { AVISO_EXPERTO, conTarjetas } from '../tarjetas';
import type { CalendarioLocal, CatalogoCultivos, Parcela, PlanSiembra, ResultadoRotacion, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import calendarioIsla from '../../../../datos/catalogos/calendario-isla.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import { seriePowerIsla, validadorContrato } from './utiles';

const sel = seleccionarEscenarios(seriePowerIsla());
const validar = validadorContrato('resultado-rotacion');
function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][]): PlanSiembra {
  return {
    meta: { versionContrato: '0.10.0', esEjemplo: false },
    rotacionId: id,
    parcelaId: 'parcela-demo-isla',
    calendarioLocal: { calendarioId: 'calendario-isla' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Prueba.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const PLANES = [
  plan('R1', [['maiz', '2026-06-15', 'PV'], ['frijol', '2026-11-01', 'OI'], ['maiz', '2027-06-15', 'PV']]),
  plan('R2', [['maiz', '2026-06-15', 'PV'], ['maiz', '2027-06-15', 'PV']]),
  plan('R3', [['frijol', '2026-06-15', 'PV'], ['frijol', '2026-11-01', 'OI']]),
  plan('R4', [['maiz', '2026-06-01', 'PV'], ['frijol', '2026-10-10', 'OI'], ['maiz', '2027-06-01', 'PV']]),
];
const entradas = (p: PlanSiembra): EntradasMotor => ({
  plan: p,
  parcela: parcela as unknown as Parcela,
  suelo: sueloDemo as unknown as Suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo: catalogo as unknown as CatalogoCultivos,
  calendario: calendarioIsla as unknown as CalendarioLocal,
  escenarios: sel.escenarios,
});
function tarjetas(planes: PlanSiembra[]) {
  const motores = Object.fromEntries(planes.map((p) => [p.rotacionId, simularRotacion(entradas(p))]));
  const ranking = rankear(planes.map((p) => ({ rotacion: motores[p.rotacionId]!.rotacion, numeroSiembras: p.ciclos.length })));
  const rs = conTarjetas({ ranking, motores, catalogo: catalogo as unknown as CatalogoCultivos, calendario: calendarioIsla as unknown as CalendarioLocal, suelo: sueloDemo as unknown as Suelo });
  return Object.fromEntries(rs.map((r) => [r.rotacionId, r])) as Record<string, ResultadoRotacion>;
}
const textos = (r: ResultadoRotacion) => [r.explicacion.porQue, ...r.explicacion.beneficios, ...r.explicacion.riesgos, ...r.explicacion.huecos, ...r.explicacion.evidencia.map((e) => e.texto)];

describe('tarjetas de la demo (R1 a R4, suelo real de Isla)', () => {
  const t = tarjetas(PLANES);

  it('R4, la milpa sembrada en ventana, es la sugerida por el ranking y su tarjeta lo explica con los anios reales', () => {
    expect(t.R4!.ranking?.posicion).toBe(1);
    expect(t.R4!.explicacion.porQue).toMatch(/^Es la opción más robusta de las 4 rotaciones comparadas/);
    expect(t.R4!.explicacion.porQue).toContain('año seco 2023, año habitual 2016, año lluvioso 2024');
    expect(t.R4!.explicacion.beneficios).toContain('Fechas: todas las siembras caen en las ventanas recomendadas por INIFAP para la zona.');
    expect(t.R4!.explicacion.beneficios.some((b) => b.includes('leguminosa (frijol)'))).toBe(true);
  });

  it('cada cifra de la evidencia es la del resultado y lleva fuente', () => {
    const r = t.R4!;
    const dias = r.porEscenario.seco.pilares.proteccionSuelo!.diasSueloDesnudo!;
    expect(r.explicacion.evidencia.some((e) => e.valor === dias && e.texto.includes(`${dias} de 365 días`))).toBe(true);
    const exc = r.porEscenario.lluvioso.pilares.excesoHidrico!;
    expect(r.explicacion.evidencia.some((e) => e.valor === exc.excesoTotalMm && e.texto.includes(`${exc.diasExceso} días`))).toBe(true);
    const lluvia = sel.escenarios.seco!.seleccion.lluviaTemporadasMm!.total!;
    expect(r.explicacion.evidencia.some((e) => e.valor === lluvia && e.texto.includes(`${Math.round(lluvia)} mm`))).toBe(true);
    for (const e of r.explicacion.evidencia) expect(e.fuente.nombre.length).toBeGreaterThan(0);
    expect(r.explicacion.evidencia.filter((e) => /INIFAP/.test(e.fuente.nombre))).toHaveLength(3);
  });

  it('R1 avisa la siembra de frijol fuera de la ventana de INIFAP; R2 no dice "0 %" de falta de agua', () => {
    expect(t.R1!.explicacion.riesgos).toContain('El frijol del ciclo 2 se siembra el 1 de noviembre, fuera de la ventana recomendada por INIFAP (del 20 de septiembre al 20 de octubre).');
    expect(textos(t.R2!).some((x) => /faltó el 0 %/.test(x))).toBe(false);
    expect(t.R2!.explicacion.porQue).toMatch(/^Queda en el lugar 4 de 4/);
  });

  it('declara los huecos: fechas fuera de la comparacion por R3, calor, erosion, suelo estimado y clima regional', () => {
    const h = t.R4!.explicacion.huecos.join(' | ');
    expect(h).toContain('R3 tiene una siembra sin ventana con fuente');
    expect(h).toContain('No se evalúa el calor');
    expect(h).toContain('No se calcula el riesgo de erosión');
    expect(h).toContain('franco arcillo arenoso, 122 mm');
    expect(h).toContain('unos 56 por 66 km');
    expect(h).toContain('No se consideran precios, costos, rendimiento ni plagas.');
  });

  it('no afirma lo que el motor no mide: ni plagas, ni nitrogeno, ni rendimiento como beneficio o riesgo', () => {
    for (const r of Object.values(t)) {
      for (const x of [...r.explicacion.beneficios, ...r.explicacion.riesgos, r.explicacion.porQue]) expect(x).not.toMatch(/plaga|nitr[oó]geno|rendimiento|tonelada|ganancia/i);
      expect(r.explicacion.redactadaPor).toBe('plantilla');
      expect(r.explicacion.avisoExperto).toBe(AVISO_EXPERTO);
      expect(validar(r)).toEqual([]);
    }
  });
});

describe('tarjetas fuera del ranking', () => {
  it('EXPLORATORIO (calabaza que SIAP no registra): se explora, no se recomienda', () => {
    const t = tarjetas([PLANES[3]!, plan('R5', [['calabaza', '2026-06-15', 'PV'], ['frijol', '2026-10-10', 'OI']])]);
    expect(t.R5!.explicacion.porQue).toMatch(/^Se muestra para explorar, pero no se recomienda/);
    expect(t.R5!.explicacion.riesgos[0]).toMatch(/^calabaza: /);
    expect(validar(t.R5)).toEqual([]);
  });
  it('NO_EVALUABLE (cultivo fuera del catalogo): lo dice y no inventa cifras', () => {
    const t = tarjetas([PLANES[3]!, plan('R6', [['sorgo', '2026-06-15', 'PV']])]);
    expect(t.R6!.explicacion.porQue).toMatch(/^No se puede evaluar esta rotación: .*sorgo/);
    expect(t.R6!.explicacion.evidencia).toEqual([]);
    expect(t.R6!.explicacion.beneficios).toEqual([]);
    expect(validar(t.R6)).toEqual([]);
  });
  it('chile: declara que sus datos vienen del pimiento dulce de FAO-56', () => {
    const t = tarjetas([PLANES[3]!, plan('R7', [['chile', '2026-06-15', 'PV']])]);
    expect(t.R7!.explicacion.huecos.some((h) => /pimiento dulce .*Sweet Peppers/.test(h))).toBe(true);
  });
});

describe('el Worker devuelve el ranking con las tarjetas', () => {
  it('rankear llena explicacion con la plantilla', () => {
    const m = new EstadoMotor();
    for (const [i, p] of PLANES.entries()) m.atender({ id: i, tipo: 'simular', entradas: entradas(p) });
    const r = m.atender({ id: 9, tipo: 'rankear', rotacionIds: PLANES.map((p) => p.rotacionId) });
    expect(r.ok).toBe(true);
    const rot = (r as { resultado: { rotaciones: ResultadoRotacion[] } }).resultado.rotaciones.find((x) => x.rotacionId === 'R4')!;
    expect(rot.explicacion.porQue).toMatch(/^Es la opción más robusta/);
  });
});
