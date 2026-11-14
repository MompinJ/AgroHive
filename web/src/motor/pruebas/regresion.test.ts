// A5.5: regresion del motor y de contratos. Fija los numeros clave de la demo (paquete A2.4, suelo real de Isla) para
// que nadie los cambie sin darse cuenta. Si un cambio los mueve A PROPOSITO, se regenera la referencia con
//   ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion.test.ts
// y el diff de pruebas/regresion/demo-isla.json se revisa y se explica en docs/01 en el mismo commit.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { candidatosAnalogos, proximaTemporadaRotacion, simularRotacionCompleta } from '../analogos';
import { seleccionarEscenarios } from '../escenarios';
import { resultadoCeldas, simularRotacion, type EntradasMotor } from '../motor';
import { vistaProximaTemporada } from '../proxima';
import { rankear } from '../ranking';
import { conTarjetas } from '../tarjetas';
import {
  ESCENARIOS,
  VERSION_CONTRATO,
  type CalendarioLocal,
  type CatalogoCultivos,
  type Parcela,
  type PlanSiembra,
  type ProximaTemporadaAproximada,
  type Suelo,
  type TablaSuelos,
} from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import calendarioIsla from '../../../../datos/catalogos/calendario-isla.json';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import planEjemplo from '../../../../contratos/ejemplos/plan-siembra.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import terrenoDemo from '../../../../datos/demo/respuestas/terreno.json';
import capaDemo from '../../../../datos/demo/respuestas/proxima-temporada.json';
import paqueteContratos from '../../../../contratos/package.json';
import { seriePowerIsla, validadorContrato } from './utiles';

const RUTA = fileURLToPath(new URL('./regresion/demo-isla.json', import.meta.url));

const parcela = structuredClone(parcelaEjemplo) as unknown as Parcela;
for (const c of parcela.celdas) {
  const t = (terrenoDemo as unknown as { celdas: { id: string; elevacionM: number | null; pendientePct: number | null }[] }).celdas.find((x) => x.id === c.id);
  if (t) Object.assign(c, { elevacionM: t.elevacionM, pendientePct: t.pendientePct });
}
const serie = seriePowerIsla();
const sel = seleccionarEscenarios(serie);
const capa = capaDemo as unknown as ProximaTemporadaAproximada;

function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][]): PlanSiembra {
  return {
    meta: { versionContrato: VERSION_CONTRATO, esEjemplo: false },
    rotacionId: id,
    parcelaId: parcela.id,
    calendarioLocal: { calendarioId: 'calendario-isla' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Regresion.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const PLANES = {
  R1: plan('R1', [['maiz', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI'], ['maiz', '2017-06-15', 'PV']]),
  R2: plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]),
  R3: plan('R3', [['frijol', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']]),
  R4: plan('R4', [['maiz', '2016-06-01', 'PV'], ['frijol', '2016-10-10', 'OI'], ['maiz', '2017-06-01', 'PV']]),
};
const entradas = (p: PlanSiembra): EntradasMotor => ({
  plan: p,
  parcela,
  suelo: sueloDemo as unknown as Suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo: catalogo as unknown as CatalogoCultivos,
  calendario: calendarioIsla as unknown as CalendarioLocal,
  escenarios: sel.escenarios,
});

/** Lo que se fija: todo redondeado como lo entrega el motor. */
function resumen() {
  const sims = Object.fromEntries(Object.entries(PLANES).map(([k, p]) => [k, simularRotacion(entradas(p))]));
  const rk = (ids: (keyof typeof PLANES)[]) =>
    rankear(ids.map((i) => ({ rotacion: sims[i]!.rotacion, numeroSiembras: PLANES[i].ciclos.length })));
  const orden = (r: ReturnType<typeof rk>) => ({
    criterio: r.criterio,
    pesos: r.ponderacion?.pesos ?? null,
    orden: r.orden.map((f) => ({ rotacionId: f.rotacionId, arrepentimiento: f.arrepentimiento, peorEscenario: f.peorEscenario })),
  });
  const bloque = proximaTemporadaRotacion(entradas(PLANES.R1), capa, serie)!;
  const todas = rk(['R1', 'R2', 'R3', 'R4']);
  const conT = conTarjetas({ ranking: todas, motores: sims, catalogo: catalogo as unknown as CatalogoCultivos, calendario: calendarioIsla as unknown as CalendarioLocal, suelo: sueloDemo as unknown as Suelo });
  const tarjeta = (id: string) => {
    const x = conT.find((r) => r.rotacionId === id)!.explicacion;
    return { porQue: x.porQue, beneficios: x.beneficios, riesgos: x.riesgos, huecos: x.huecos, evidencia: x.evidencia.map((e) => e.texto) };
  };
  const vista = vistaProximaTemporada(capa, sel.escenarios);
  return {
    versionContrato: VERSION_CONTRATO,
    escenarios: Object.fromEntries(
      ESCENARIOS.map((e) => {
        const c = sel.escenarios[e]!;
        return [e, { anioReal: c.anioReal, percentil: Math.round(sel.percentiles[e]! * 10) / 10, temporadas: c.seleccion.lluviaTemporadasMm }];
      }),
    ),
    pilaresMilpa: Object.fromEntries(
      ESCENARIOS.map((e) => {
        const p = sims.R1!.rotacion.porEscenario[e].pilares;
        return [e, { deficitHidrico: p.deficitHidrico, excesoHidrico: p.excesoHidrico, compatibilidadCiclo: p.compatibilidadCiclo, proteccionSuelo: p.proteccionSuelo }];
      }),
    ),
    estados: Object.fromEntries(Object.entries(sims).map(([k, s]) => [k, { estado: s.rotacion.estado, filtroClima: s.rotacion.filtroClima ?? null }])),
    celdaMilpaSeco20160801: resultadoCeldas(sims.R1!, 'seco', '2016-08-01')!.registros[0],
    rankingTresRotaciones: orden(rk(['R1', 'R2', 'R3'])),
    rankingCuatroPilares: orden(rk(['R1', 'R2', 'R4'])),
    rankingDemoR1aR4: orden(todas),
    tarjetas: { R4: tarjeta('R4'), R2: tarjeta('R2') },
    proximaTemporada: {
      coincidencias: vista.coincidencias,
      analogos: bloque.aniosAnalogos.map((a) => a.anioReal),
      ciclosEvaluados: bloque.ciclosEvaluados,
      rango: bloque.rango,
      candidatos: candidatosAnalogos(capa, serie.diario).map((c) => `${c.anio}:${c.mesesDentro}`),
    },
  };
}

describe('A5.5 regresion de la demo (paquete A2.4, suelo real de Isla)', () => {
  const actual = JSON.parse(JSON.stringify(resumen()));
  if (process.env.ACTUALIZAR_REGRESION === '1') {
    writeFileSync(RUTA, `${JSON.stringify(actual, null, 2)}\n`);
  }
  it('existe la referencia', () => {
    expect(existsSync(RUTA), `Falta ${RUTA}: generarla con ACTUALIZAR_REGRESION=1`).toBe(true);
  });
  const ref = existsSync(RUTA) ? JSON.parse(readFileSync(RUTA, 'utf8')) : {};
  const msg = (que: string) =>
    `Cambio en ${que} de la demo. Si es a proposito: ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion.test.ts, revisar el diff de demo-isla.json y anotarlo en docs/01.`;
  it('escenarios 2023 / 2016 / 2024 con su lluvia de temporadas', () => {
    expect(actual.escenarios, msg('los escenarios')).toEqual(ref.escenarios);
    expect([actual.escenarios.seco.anioReal, actual.escenarios.habitual.anioReal, actual.escenarios.lluvioso.anioReal]).toEqual([2023, 2016, 2024]);
  });
  it('pilares de la milpa (deficit, exceso, compatibilidad y suelo desnudo)', () => {
    expect(actual.pilaresMilpa, msg('los pilares de la milpa')).toEqual(ref.pilaresMilpa);
  });
  it('estados de las rotaciones y un registro por celda', () => {
    expect(actual.estados, msg('los estados')).toEqual(ref.estados);
    expect(actual.celdaMilpaSeco20160801, msg('resultado-celda')).toEqual(ref.celdaMilpaSeco20160801);
  });
  it('orden del ranking (tres rotaciones y cuatro pilares)', () => {
    expect(actual.rankingTresRotaciones, msg('el ranking de tres rotaciones')).toEqual(ref.rankingTresRotaciones);
    expect(actual.rankingCuatroPilares, msg('el ranking con cuatro pilares')).toEqual(ref.rankingCuatroPilares);
  });
  it('ranking de la demo (R1 a R4, R4 sugerida) y tarjetas de R4 y R2 (A4.3)', () => {
    expect(actual.rankingDemoR1aR4, msg('el ranking R1 a R4')).toEqual(ref.rankingDemoR1aR4);
    expect(actual.rankingDemoR1aR4.orden[0].rotacionId).toBe('R4');
    expect(actual.tarjetas, msg('el texto de las tarjetas')).toEqual(ref.tarjetas);
  });
  it('proxima temporada: comparacion con la banda y anios analogos', () => {
    expect(actual.proximaTemporada, msg('la proxima temporada')).toEqual(ref.proximaTemporada);
  });
});

describe('A5.5 regresion de contratos', () => {
  it('el motor escribe la misma version de contrato que contratos/', () => {
    expect(VERSION_CONTRATO).toBe((paqueteContratos as { version: string }).version);
  });
  it('el plan de ejemplo de contratos/ pasa por el motor y su salida cumple los schemas', () => {
    const e: EntradasMotor = { ...entradas(planEjemplo as unknown as PlanSiembra), parcela: parcelaEjemplo as unknown as Parcela };
    const r = simularRotacionCompleta({ ...e, proximaTemporada: { capa, serie } });
    expect(validadorContrato('resultado-rotacion')(r.rotacion)).toEqual([]);
    for (const esc of ESCENARIOS) {
      expect(validadorContrato('clima-escenario')(sel.escenarios[esc])).toEqual([]);
      expect(validadorContrato('resultado-celda')(resultadoCeldas(r, esc, '2015-07-01'))).toEqual([]);
    }
  });
  it('las cuatro rotaciones de la demo cumplen resultado-rotacion despues del ranking', () => {
    const res = rankear(Object.values(PLANES).map((p) => ({ rotacion: simularRotacionCompleta({ ...entradas(p), proximaTemporada: { capa, serie } }).rotacion, numeroSiembras: p.ciclos.length })));
    for (const r of res.rotaciones) expect(validadorContrato('resultado-rotacion')(r)).toEqual([]);
  });
});
