// Tono de la columna y losa de suelo (A2.12) en la escena: tipo del contrato suelo y
// humedad del motor; sin uno de los dos, nada se inventa.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import serieDemo from '../../../../datos/demo/respuestas/serie-clima.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import type { SerieClima, Suelo } from '../../../../contratos/tipos/contratos';
import { seleccionarEscenarios } from '../../motor/escenarios';
import { resultadoCeldas, simularRotacion } from '../../motor/motor';
import { construirEscena } from '../adaptador';
import { razonContraste } from '../contraste';
import { entradasDemo, parcelaConTerrenoDemo, SUELO_MANUAL_FRANCO } from '../demo-motor';
import { ESTILOS_ESTADO } from '../estilos-estado';
import { claveLosa, colorSuelo, CORTES_HUMEDAD, grupoDeSuelo, nivelHumedad, SUELO_SIN_HUMEDAD, TONOS_SUELO } from '../suelo';
import { hexARgb } from '../contraste';

const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const paleta = new Map(
  [...readFileSync(`${raiz}modelos/paleta.md`, 'utf8').matchAll(/^\| \d+ \| (\S+) \| (#[0-9a-f]{6}) \|/gm)].map((m) => [m[1]!, m[2]!]),
);

describe('tonos y cortes', () => {
  it('los tonos salen de modelos/paleta.md (franco = escala de siempre)', () => {
    expect(TONOS_SUELO.franco).toEqual({ seco: paleta.get('suelo_seco'), medio: paleta.get('soil'), humedo: paleta.get('suelo_humedo') });
    for (const tipo of ['arenoso', 'arcilloso'] as const) {
      for (const nivel of ['seco', 'medio', 'humedo'] as const) expect(TONOS_SUELO[tipo][nivel]).toBe(paleta.get(`${tipo}_${nivel}`));
    }
  });

  it('cortes declarados en tercios de TAW', () => {
    expect(CORTES_HUMEDAD).toEqual({ secoHasta: 1 / 3, humedoDesde: 2 / 3 });
    expect([0, 0.33, 1 / 3, 0.5, 0.66, 2 / 3, 1].map(nivelHumedad)).toEqual(['seco', 'seco', 'medio', 'medio', 'medio', 'humedo', 'humedo']);
    expect(nivelHumedad(null)).toBeNull();
    expect(nivelHumedad(Number.NaN)).toBeNull();
  });

  it('sin humedad, gris fuera de todas las escalas y sin losa', () => {
    expect(colorSuelo(null, 'arcilloso')).toEqual(hexARgb(SUELO_SIN_HUMEDAD));
    for (const t of Object.values(TONOS_SUELO)) expect(Object.values(t)).not.toContain(SUELO_SIN_HUMEDAD);
    expect(claveLosa('arcilloso', null)).toBeNull();
  });

  it('sin tipo de suelo no hay losa (los tonos son genericos y se declaran)', () => {
    expect(claveLosa(null, 0.5)).toBeNull();
    expect(colorSuelo(0.5, null)).toEqual(hexARgb(TONOS_SUELO.franco.medio));
  });

  it('cada combinacion tipo x humedad tiene su .bbmodel en modelos/suelos', () => {
    for (const tipo of ['arenoso', 'franco', 'arcilloso'] as const) {
      for (const h of [0.1, 0.5, 0.9]) expect(existsSync(`${raiz}modelos/suelos/${claveLosa(tipo, h)}.bbmodel`)).toBe(true);
    }
  });

  it('la placa de estado se distingue (3:1) de cualquier tono de suelo por su borde negro y blanco', () => {
    const tonos = [...Object.values(TONOS_SUELO).flatMap((t) => Object.values(t)), SUELO_SIN_HUMEDAD];
    for (const e of Object.values(ESTILOS_ESTADO)) {
      for (const t of tonos) expect(Math.max(...[e.color, '#000000', '#ffffff'].map((c) => razonContraste(c, t)))).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('grupo del contrato suelo', () => {
  it('suelo del mapa de Isla: arcilloso; selector manual: franco; textura NO_EVALUABLE: sin tipo', () => {
    expect(grupoDeSuelo(sueloDemo as unknown as Suelo)).toBe('arcilloso');
    expect(grupoDeSuelo(SUELO_MANUAL_FRANCO)).toBe('franco');
    const sinTextura = structuredClone(sueloDemo) as unknown as Suelo;
    sinTextura.textura = { ...sinTextura.textura, estado: 'NO_EVALUABLE' };
    expect(grupoDeSuelo(sinTextura)).toBeNull();
    expect(grupoDeSuelo(null)).toBeNull();
  });
});

describe('escena con el motor real y el suelo de Isla', () => {
  const escenarios = seleccionarEscenarios(structuredClone(serieDemo) as unknown as SerieClima).escenarios;
  const entradas = entradasDemo('mapa');
  const r = simularRotacion({ ...entradas, escenarios });
  const celdas = resultadoCeldas(r, 'habitual', '2016-08-01');

  it('cada celda lleva la losa de su tipo y del nivel de su humedad', () => {
    const e = construirEscena(parcelaConTerrenoDemo(), celdas, { suelo: entradas.suelo });
    expect(e.grupoSuelo).toBe('arcilloso');
    for (const b of e.bloques) expect(b.losa).toBe(`suelo_arcilloso_${nivelHumedad(b.registro!.humedad)}`);
  });

  it('sin suelo no hay losas aunque haya humedad', () => {
    const e = construirEscena(parcelaConTerrenoDemo(), celdas);
    expect(e.grupoSuelo).toBeNull();
    expect(e.bloques.every((b) => b.losa === null)).toBe(true);
  });

  it('sin resultado del motor no hay losas aunque haya suelo', () => {
    const e = construirEscena(parcelaConTerrenoDemo(), null, { suelo: entradas.suelo });
    expect(e.bloques.every((b) => b.losa === null)).toBe(true);
  });
});
