// Regresion de las tarjetas en ingles ([DECIDIDO] 15/11: la app tiene espanol e ingles) con un ejemplo mundial: Bajio.
// Fija el texto en ingles de las tarjetas y de los motivos de noOrdenadas, y comprueba que las cifras y las fuentes son
// las mismas que en espanol (solo cambia la redaccion). La regresion A5.5 en espanol (regresion.test.ts) no cambia.
// Las rotaciones son las de prueba de regresion-ejemplos.test.ts para Bajio (FIJAS DE PRUEBA, no recomendaciones).
// Si el texto cambia A PROPOSITO, se regenera con
//   ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion-ingles.test.ts
// y el diff de pruebas/regresion/ingles/bajio-guanajuato.json se revisa y se explica en docs/01 en el mismo commit.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cargarEjemplo, type DatosEjemplo } from '../../demo/ejemplos';
import { seleccionarEscenarios } from '../escenarios';
import type { IdiomaMotor } from '../idioma';
import type { EntradasMotor } from '../motor';
import { EstadoMotor } from '../protocolo';
import type { ResultadoRanking } from '../ranking';
import { VERSION_CONTRATO, type PlanSiembra, type ResultadoRotacion } from '../tipos';
import { validadorContrato } from './utiles';

const CARPETA = fileURLToPath(new URL('./regresion/ingles/', import.meta.url));
const RUTA = `${CARPETA}bajio-guanajuato.json`;
type Ciclo = [string, string, 'PV' | 'OI'];
const ROTACIONES: Record<string, Ciclo[]> = {
  R1: [['maiz', '2016-06-20', 'PV'], ['sorgo', '2017-06-20', 'PV']],
  R2: [['sorgo', '2016-06-20', 'PV'], ['frijol', '2017-06-20', 'PV']],
  R3: [['maiz', '2016-06-20', 'PV'], ['maiz', '2017-06-20', 'PV']],
  // Trigo de temporal en OI: SIAP no lo registra en el municipio, queda EXPLORATORIO y fuera del orden.
  R4: [['maiz', '2016-06-20', 'PV'], ['trigo', '2016-12-01', 'OI'], ['maiz', '2017-06-20', 'PV']],
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

/** Ranking con tarjetas por el mismo camino que la interfaz: el Worker (EstadoMotor), simular y rankear con idioma. */
function rankearEn(d: DatosEjemplo, idioma?: IdiomaMotor): ResultadoRanking {
  const sel = seleccionarEscenarios(d.serie);
  const m = new EstadoMotor();
  let id = 1;
  for (const [rid, c] of Object.entries(ROTACIONES)) {
    const entradas: EntradasMotor = { plan: plan(d, rid, c), parcela: d.parcela, suelo: d.suelo, tablaSuelos: d.tabla, catalogo: d.catalogo, calendario: d.calendario, escenarios: sel.escenarios };
    const r = m.atender({ id: id++, tipo: 'simular', entradas });
    if (!r.ok) throw new Error(r.error);
  }
  const r = m.atender({ id: id++, tipo: 'rankear', ...(idioma ? { idioma } : {}) });
  if (!r.ok) throw new Error(r.error);
  return r.resultado as ResultadoRanking;
}

const tarjeta = (r: ResultadoRotacion) => {
  const x = r.explicacion;
  return { porQue: x.porQue, beneficios: x.beneficios, riesgos: x.riesgos, huecos: x.huecos, evidencia: x.evidencia.map((e) => e.texto), avisoExperto: x.avisoExperto };
};
const textos = (r: ResultadoRotacion) => {
  const t = tarjeta(r);
  return [t.porQue, ...t.beneficios, ...t.riesgos, ...t.huecos, ...t.evidencia, t.avisoExperto];
};

/** Palabras del espanol que no deben quedar en una tarjeta en ingles (los nombres propios y las citas no se cuentan). */
const ESPANOL = /\b(año|años|días|dias|lluvia|cultivo|cultivos|siembra|suelo|agua|falta|faltó|ventana|rotación|rotacion|sembrado|ciclo|seco|lluvioso|del|las|los|que|una|por|con|sin)\b|[áéíóúñ]/i;
/** Hasta que el catalogo tenga nombreComunEn (parte 2), el nombre del cultivo sale en espanol. */
const NOMBRES_PENDIENTES = /\b(maíz|sorgo|frijol|trigo)\b/gi;

describe('regresion de las tarjetas en ingles: Bajio (Jaral del Progreso, Guanajuato)', async () => {
  const d = await cargarEjemplo('bajio-guanajuato');
  const en = rankearEn(d, 'en');
  const es = rankearEn(d);
  const porId = (rk: ResultadoRanking) => Object.fromEntries(rk.rotaciones.map((r) => [r.rotacionId, r])) as Record<string, ResultadoRotacion>;
  const ren = porId(en);
  const res = porId(es);

  it('el texto en ingles no cambia', () => {
    const actual = JSON.parse(
      JSON.stringify({
        versionContrato: VERSION_CONTRATO,
        grabado: d.ejemplo.grabado,
        orden: en.orden.map((f) => f.rotacionId),
        noOrdenadas: en.noOrdenadas,
        mensaje: en.mensaje ?? null,
        tarjetas: Object.fromEntries(Object.keys(ROTACIONES).map((k) => [k, tarjeta(ren[k]!)])),
      }),
    );
    if (process.env.ACTUALIZAR_REGRESION === '1') {
      mkdirSync(CARPETA, { recursive: true });
      writeFileSync(RUTA, `${JSON.stringify(actual, null, 2)}\n`);
    }
    expect(existsSync(RUTA), `Falta ${RUTA}: generarla con ACTUALIZAR_REGRESION=1`).toBe(true);
    const ref = JSON.parse(readFileSync(RUTA, 'utf8'));
    expect(actual, 'Cambio en el texto en ingles de Bajio. Si es a proposito: ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion-ingles.test.ts y anotarlo en docs/01.').toEqual(ref);
  });

  it('mismo orden, mismas cifras y mismas fuentes que en espanol: solo cambia la redaccion', () => {
    expect(en.orden).toEqual(es.orden);
    expect(en.noOrdenadas.map((x) => x.rotacionId)).toEqual(es.noOrdenadas.map((x) => x.rotacionId));
    for (const k of Object.keys(ROTACIONES)) {
      const a = ren[k]!;
      const b = res[k]!;
      // Todo lo que no es texto de la tarjeta es identico.
      expect({ ...a, explicacion: null }).toEqual({ ...b, explicacion: null });
      const sinTexto = (r: ResultadoRotacion) => r.explicacion.evidencia.map((e) => ({ ...e, texto: null }));
      expect(sinTexto(a)).toEqual(sinTexto(b));
      for (const campo of ['beneficios', 'riesgos', 'huecos'] as const) expect(a.explicacion[campo].length).toBe(b.explicacion[campo].length);
      // La evidencia dice los mismos numeros, y el ingles no trae ningun numero que no este en el espanol.
      // (Al reves no: el motivo de SIAP en espanol cita los anios 2021-2025, que el texto en ingles no repite.)
      const numeros = (xs: string[]) => xs.flatMap((x) => x.match(/\d+(?:\.\d+)?/g) ?? []).sort();
      expect(numeros(a.explicacion.evidencia.map((e) => e.texto))).toEqual(numeros(b.explicacion.evidencia.map((e) => e.texto)));
      const enEspanol = new Set(numeros(textos(b)));
      for (const n of numeros(textos(a))) expect(enEspanol.has(n), `${k}: ${n}`).toBe(true);
    }
  });

  it('no queda espanol en las tarjetas (fuera de nombres propios y citas) y cumplen el contrato', () => {
    const validar = validadorContrato('resultado-rotacion');
    for (const r of en.rotaciones) {
      for (const x of textos(r)) expect(x.replace(/Jaral del Progreso|SIAP|GGCMI[^,;)]*/g, '').replace(NOMBRES_PENDIENTES, ''), x).not.toMatch(ESPANOL);
      expect(r.explicacion.avisoExperto).toMatch(/^This is a comparison with real past years, not a prediction\./);
      expect(validar(r)).toEqual([]);
    }
    expect(en.noOrdenadas.every((x) => !ESPANOL.test(x.motivo))).toBe(true);
  });

  it('el trigo que SIAP no registra se explica en ingles, con el municipio y la temporada', () => {
    expect(ren.R4!.estado).toBe('EXPLORATORIO');
    expect(ren.R4!.explicacion.porQue).toMatch(/^Shown for exploration, but not recommended: SIAP does not record rainfed (wheat|trigo) in Jaral del Progreso in the OI season\.$/);
    expect(res.R4!.explicacion.porQue).toMatch(/^Se muestra para explorar, pero no se recomienda: SIAP no registra 'Trigo grano'/);
  });
});
