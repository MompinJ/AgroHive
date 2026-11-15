// Ampliacion del catalogo (15/11): cada cultivo del catalogo real, incluidos los que no tienen modelo 3D ni ventana de
// siembra con fuente, se simula en Isla sin tronar y con estados honestos: lo que falta sale NO_EVALUABLE con motivo
// (nunca un numero) y lo que SIAP no registra en Isla deja la rotacion en EXPLORATORIO (doc 05).
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { parametrosCultivo } from '../cultivo';
import { resultadoCeldas, simularRotacion, type EntradasMotor } from '../motor';
import { rankear } from '../ranking';
import { serieBalance } from '../series';
import { conTarjetas } from '../tarjetas';
import { ESCENARIOS, VERSION_CONTRATO, type CalendarioLocal, type CatalogoCultivos, type Parcela, type PlanSiembra, type Suelo, type TablaSuelos } from '../tipos';
import catalogoJson from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import calendarioJson from '../../../../datos/catalogos/calendario-isla.json';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import { seriePowerIsla, validadorContrato } from './utiles';

const catalogo = catalogoJson as unknown as CatalogoCultivos;
const calendario = calendarioJson as unknown as CalendarioLocal;
const parcela = structuredClone(parcelaEjemplo) as unknown as Parcela;
const sel = seleccionarEscenarios(seriePowerIsla());
const validarRotacion = validadorContrato('resultado-rotacion');
const validarCelda = validadorContrato('resultado-celda');
const validarSerie = validadorContrato('serie-balance');

function plan(cultivo: string, siembra: string, temporada: 'PV' | 'OI', n = 1): PlanSiembra {
  return {
    meta: { versionContrato: VERSION_CONTRATO, esEjemplo: false },
    rotacionId: `R${n}`,
    parcelaId: parcela.id,
    calendarioLocal: { calendarioId: calendario.id },
    asignacionClima: 'temporada_tipica',
    ciclos: [{ ciclo: 1, cultivo, siembra, temporada, porQue: 'Prueba del catalogo ampliado.' }] as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const entradas = (p: PlanSiembra): EntradasMotor => ({
  plan: p,
  parcela,
  suelo: sueloDemo as unknown as Suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo,
  calendario,
  escenarios: sel.escenarios,
});

const SIEMBRA = { PV: '2016-06-15', OI: '2016-11-01' } as const;
const casos = catalogo.cultivos.flatMap((c) => (['PV', 'OI'] as const).map((t) => [c.id, t] as const));

describe('catalogo ampliado: todos los cultivos se simulan con estados honestos', () => {
  it('ids unicos y sin modelo3d en los cultivos de la ampliacion', () => {
    const ids = catalogo.cultivos.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const i = ids.indexOf('soya');
    expect(i).toBeGreaterThan(0);
    for (const c of catalogo.cultivos.slice(i)) expect(c.modelo3d, c.id).toBeUndefined();
  });

  it('cada cultivo tiene sus parametros esenciales con fuente', () => {
    for (const c of catalogo.cultivos) expect(parametrosCultivo(c).ok, c.id).toBe(true);
  });

  it('cada cultivo tiene entrada en el calendario de Isla en PV y OI', () => {
    for (const [cultivo, temporada] of casos) {
      expect(calendario.entradas.some((e) => e.cultivo === cultivo && e.temporada === temporada), `${cultivo} ${temporada}`).toBe(true);
    }
  });

  it.each(casos)('%s en %s', (cultivo, temporada) => {
    const res = simularRotacion(entradas(plan(cultivo, SIEMBRA[temporada], temporada)));
    const r = res.rotacion;
    expect(validarRotacion(r)).toEqual([]);
    const entrada = calendario.entradas.find((e) => e.cultivo === cultivo && e.temporada === temporada)!;
    for (const e of ESCENARIOS) {
      const comp = r.porEscenario[e].pilares.compatibilidadCiclo!;
      if (entrada.ventana.estado !== 'EVALUABLE') {
        expect(comp.estado).toBe('NO_EVALUABLE');
        expect(comp.siembrasFueraDeVentana).toBeNull();
        expect(comp.motivo).toContain(cultivo);
      }
    }
    if (entrada.presencia.estado === 'no_registrado') {
      expect(['EXPLORATORIO', 'NO_EVALUABLE']).toContain(r.estado);
      expect(r.cultivosNoRecomendados?.map((n) => n.cultivo)).toContain(cultivo);
    }
    // Lo que consume la escena y el dashboard tampoco truena y cumple su contrato.
    const celdas = resultadoCeldas(res, 'habitual', SIEMBRA[temporada]);
    if (celdas) expect(validarCelda(celdas)).toEqual([]);
    const serie = serieBalance(res, 'habitual');
    if (serie) expect(validarSerie(serie)).toEqual([]);
  });

  it('un ciclo que no cabe en la serie del escenario sale NO_EVALUABLE con motivo, sin numeros (cana de 480 d en PV)', () => {
    const pv = simularRotacion(entradas(plan('cana', SIEMBRA.PV, 'PV'))).rotacion;
    expect(pv.estado).toBe('NO_EVALUABLE');
    expect(pv.advertencias?.some((a) => a.mensaje.includes('la serie termina antes de terminar el ciclo'))).toBe(true);
    for (const e of ESCENARIOS) {
      const x = pv.porEscenario[e];
      expect(x.estado).toBe('NO_EVALUABLE');
      expect(x.pilares.deficitHidrico?.proporcionDemandaNoCubierta ?? null).toBeNull();
    }
    const oi = simularRotacion(entradas(plan('cana', SIEMBRA.OI, 'OI'))).rotacion;
    for (const e of ESCENARIOS) expect(oi.porEscenario[e].pilares.deficitHidrico?.proporcionDemandaNoCubierta).toEqual(expect.any(Number));
  });

  it('las tarjetas y el ranking aguantan una comparacion con cultivos nuevos', () => {
    const ids = catalogo.cultivos.slice(-3).map((c) => c.id);
    const motores = Object.fromEntries(ids.map((id, i) => [`R${i + 1}`, simularRotacion(entradas(plan(id, SIEMBRA.PV, 'PV', i + 1)))]));
    const ranking = rankear(Object.values(motores).map((m) => ({ rotacion: m.rotacion, numeroSiembras: 1 })));
    const conT = conTarjetas({ ranking, motores, catalogo, calendario, suelo: sueloDemo as unknown as Suelo });
    expect(conT).toHaveLength(ids.length);
    for (const r of conT) expect(validarRotacion(r)).toEqual([]);
  });
});
