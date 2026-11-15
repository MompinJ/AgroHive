// Regresion del motor con cada parcela de ejemplo mundial (como A5.5 con Isla): fija escenarios, estados, pilares, ranking,
// proxima temporada y el clima de Koppen-Geiger de cada ejemplo grabado en datos/demo/ejemplos/ (herramientas/ejemplos/grabar.py).
// Las rotaciones de abajo son FIJAS DE PRUEBA con los cultivos de ejemplo del lugar; no son recomendaciones.
// Si un cambio mueve estos numeros A PROPOSITO (motor o regrabacion de un ejemplo), se regenera con
//   ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion-ejemplos.test.ts
// y el diff de pruebas/regresion/ejemplos/<id>.json se revisa y se explica en docs/01 en el mismo commit.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cargarEjemplo, listarEjemplos, type DatosEjemplo } from '../../demo/ejemplos';
import { proximaTemporadaRotacion } from '../analogos';
import { seleccionarEscenarios } from '../escenarios';
import { simularRotacion, type EntradasMotor } from '../motor';
import { rankear } from '../ranking';
import { ESCENARIOS, VERSION_CONTRATO, type PlanSiembra } from '../tipos';
import { validadorContrato } from './utiles';

const CARPETA = fileURLToPath(new URL('./regresion/ejemplos/', import.meta.url));
type Ciclo = [string, string, 'PV' | 'OI'];

/** Rotaciones de prueba por ejemplo (fechas fijas en 2016-2018; PV/OI es solo el semestre del anio agricola). */
const ROTACIONES: Record<string, Record<string, Ciclo[]>> = {
  'bajio-guanajuato': {
    R1: [['maiz', '2016-06-20', 'PV'], ['sorgo', '2017-06-20', 'PV']],
    R2: [['sorgo', '2016-06-20', 'PV'], ['frijol', '2017-06-20', 'PV']],
    R3: [['maiz', '2016-06-20', 'PV'], ['maiz', '2017-06-20', 'PV']],
    // Trigo de temporal en OI: SIAP no lo registra en el municipio, debe quedar EXPLORATORIO y fuera del orden.
    R4: [['maiz', '2016-06-20', 'PV'], ['trigo', '2016-12-01', 'OI'], ['maiz', '2017-06-20', 'PV']],
  },
  'mato-grosso-sorriso': {
    R1: [['soya', '2016-10-15', 'OI'], ['maiz', '2017-02-15', 'OI'], ['soya', '2017-10-15', 'OI']],
    R2: [['soya', '2016-10-15', 'OI'], ['algodon', '2017-01-20', 'OI']],
    R3: [['soya', '2016-10-15', 'OI'], ['soya', '2017-10-15', 'OI']],
  },
  'uasin-gishu-kenia': {
    R1: [['maiz', '2016-04-01', 'PV'], ['frijol', '2016-10-01', 'OI'], ['maiz', '2017-04-01', 'PV']],
    R2: [['trigo', '2016-06-01', 'PV'], ['papa', '2016-11-01', 'OI']],
    R3: [['maiz', '2016-04-01', 'PV'], ['maiz', '2017-04-01', 'PV']],
  },
  'punjab-ludhiana': {
    R1: [['maiz', '2016-06-20', 'PV'], ['trigo', '2016-11-10', 'OI'], ['maiz', '2017-06-20', 'PV']],
    R2: [['algodon', '2016-04-15', 'PV'], ['trigo', '2016-11-10', 'OI']],
    R3: [['papa', '2016-10-10', 'OI'], ['maiz', '2017-06-20', 'PV']],
  },
  'tierra-de-campos-palencia': {
    R1: [['trigo', '2016-10-20', 'OI'], ['girasol', '2017-04-20', 'PV'], ['cebada', '2017-10-20', 'OI']],
    R2: [['cebada', '2016-10-20', 'OI'], ['lenteja', '2017-03-25', 'OI']],
    R3: [['trigo', '2016-10-20', 'OI'], ['trigo', '2017-10-20', 'OI']],
  },
  'iowa-story': {
    R1: [['maiz', '2016-05-01', 'PV'], ['soya', '2017-05-15', 'PV'], ['maiz', '2018-05-01', 'PV']],
    R2: [['maiz', '2016-05-01', 'PV'], ['maiz', '2017-05-01', 'PV']],
  },
};

function plan(d: DatosEjemplo, id: string, ciclos: Ciclo[]): PlanSiembra {
  return {
    meta: { versionContrato: VERSION_CONTRATO, esEjemplo: false },
    rotacionId: id,
    parcelaId: d.parcela.id,
    calendarioLocal: d.calendario ? { calendarioId: d.calendario.id } : { sinCalendarioLocal: true, motivo: 'Ejemplo sin calendario grabado.' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Regresion de ejemplo.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}

function resumen(d: DatosEjemplo) {
  const sel = seleccionarEscenarios(d.serie);
  const planes = Object.entries(ROTACIONES[d.ejemplo.id]!).map(([id, c]) => plan(d, id, c));
  const entradas = (p: PlanSiembra): EntradasMotor => ({ plan: p, parcela: d.parcela, suelo: d.suelo, tablaSuelos: d.tabla, catalogo: d.catalogo, calendario: d.calendario, escenarios: sel.escenarios });
  const sims = Object.fromEntries(planes.map((p) => [p.rotacionId, simularRotacion(entradas(p))]));
  const ranking = rankear(planes.map((p) => ({ rotacion: sims[p.rotacionId]!.rotacion, numeroSiembras: p.ciclos.length })));
  const bloque = d.capa ? proximaTemporadaRotacion(entradas(planes[0]!), d.capa, d.serie) : null;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const v = d.clima.estado === 'EVALUABLE' ? d.clima.variables : null;
  return {
    versionContrato: VERSION_CONTRATO,
    grabado: d.ejemplo.grabado,
    clima: d.clima.estado === 'EVALUABLE'
      ? { clase: d.clima.clase, bioma: d.clima.bioma, MAT: r1(v!.MAT), MAP: r1(v!.MAP), Thot: r1(v!.Thot), Tcold: r1(v!.Tcold), verano: v!.verano }
      : { estado: d.clima.estado, motivo: d.clima.motivo },
    escenarios: Object.fromEntries(ESCENARIOS.map((e) => {
      const c = sel.escenarios[e]!;
      return [e, { anioReal: c.anioReal, percentil: Math.round(sel.percentiles[e]! * 10) / 10, temporadas: c.seleccion.lluviaTemporadasMm }];
    })),
    rotaciones: Object.fromEntries(Object.entries(sims).map(([k, s]) => [k, {
      estado: s.rotacion.estado,
      filtroClima: s.rotacion.filtroClima ?? null,
      pilares: Object.fromEntries(ESCENARIOS.map((e) => {
        const p = s.rotacion.porEscenario[e].pilares;
        return [e, { deficitHidrico: p.deficitHidrico, excesoHidrico: p.excesoHidrico, compatibilidadCiclo: p.compatibilidadCiclo, proteccionSuelo: p.proteccionSuelo }];
      })),
    }])),
    ranking: {
      criterio: ranking.criterio,
      orden: ranking.orden.map((f) => ({ rotacionId: f.rotacionId, arrepentimiento: f.arrepentimiento, peorEscenario: f.peorEscenario })),
    },
    proximaTemporada: bloque ? { analogos: bloque.aniosAnalogos.map((a) => a.anioReal), ciclosEvaluados: bloque.ciclosEvaluados, rango: bloque.rango } : null,
    rankingCumpleContrato: ranking.rotaciones.every((r) => validadorContrato('resultado-rotacion')(r).length === 0),
  };
}

const ejemplos = listarEjemplos();

describe('regresion del motor con las parcelas de ejemplo mundiales', () => {
  it('hay una rotacion de prueba para cada ejemplo del indice', () => {
    expect(ejemplos.map((e) => e.id).sort()).toEqual(Object.keys(ROTACIONES).sort());
  });
  for (const e of ejemplos) {
    describe(e.nombre, () => {
      const ruta = `${CARPETA}${e.id}.json`;
      const msg = (que: string) =>
        `Cambio en ${que} del ejemplo ${e.id}. Si es a proposito: ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion-ejemplos.test.ts, revisar el diff de regresion/ejemplos/${e.id}.json y anotarlo en docs/01.`;
      it('los numeros clave no cambian', { timeout: 120000 }, async () => {
        const actual = JSON.parse(JSON.stringify(resumen(await cargarEjemplo(e.id))));
        if (process.env.ACTUALIZAR_REGRESION === '1') {
          mkdirSync(CARPETA, { recursive: true });
          writeFileSync(ruta, `${JSON.stringify(actual, null, 2)}\n`);
        }
        expect(existsSync(ruta), `Falta ${ruta}: generarla con ACTUALIZAR_REGRESION=1`).toBe(true);
        const ref = JSON.parse(readFileSync(ruta, 'utf8'));
        expect(actual.clima, msg('el clima de Koppen')).toEqual(ref.clima);
        expect(actual.escenarios, msg('los escenarios')).toEqual(ref.escenarios);
        expect(actual.rotaciones, msg('los estados y pilares')).toEqual(ref.rotaciones);
        expect(actual.ranking, msg('el ranking')).toEqual(ref.ranking);
        expect(actual.proximaTemporada, msg('la proxima temporada')).toEqual(ref.proximaTemporada);
        expect(actual.rankingCumpleContrato).toBe(true);
        expect(actual).toEqual(ref);
      });
    });
  }
});
