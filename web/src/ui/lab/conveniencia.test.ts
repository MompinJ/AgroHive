import { describe, expect, it } from 'vitest';
import type { CatalogoCultivos, SerieClima } from '../../../../contratos/tipos/contratos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import serie from '../../../../datos/demo/respuestas/serie-clima.json';

import { climatologia, conveniencia, tMediaCiclo } from './conveniencia';
import calendarioJson from '../../../../datos/catalogos/calendario-isla.json';
import type { CalendarioLocal as CalendarioPrueba } from '../../../../contratos/tipos/contratos';
/** Calendario SIAP/INIFAP de Isla: fixture de prueba (la app ya no lo usa como demo). */
const calendarioIsla = calendarioJson as unknown as CalendarioPrueba;

const clima = climatologia(serie as unknown as SerieClima);
const cultivos = (catalogo as CatalogoCultivos).cultivos;
const evaluar = (id: string, extra: Partial<Parameters<typeof conveniencia>[1]> = {}) =>
  conveniencia(cultivos.find((c) => c.id === id)!, { clima, siembra: '2026-06-15', temporada: 'PV', dias: 120, disponibles: 139, calendario: calendarioIsla, plagas: [], ...extra });

describe('conveniencia', () => {
  it('climatologia de la serie de NASA POWER del paquete de prueba (trópico húmedo)', () => {
    expect(clima.tMediaAnual).toBeGreaterThan(20);
    expect(clima.lluviaAnualMm).toBeGreaterThan(1500);
  });

  it('el maiz en junio en Isla es buena opcion y explica por que', () => {
    const v = evaluar('maiz');
    expect(v.nivel).toBe('buena');
    expect(v.motivos.join(' ')).toContain('mejor época');
    expect(tMediaCiclo(clima, '2026-06-15', 120)).toBeGreaterThan(20);
  });

  it('lo que no cabe o tiene plaga baja en el orden', () => {
    const noCabe = evaluar('maiz', { dias: 200 });
    expect(noCabe.noCabe).toBe(true);
    expect(noCabe.demasiadoLargo).toBe(false);
    expect(noCabe.puntos).toBe(evaluar('maiz').puntos - 1);
    const cana = evaluar('cana', { dias: 480 });
    expect(cana.demasiadoLargo).toBe(true);
    expect(cana.nivel).toBe('mala');
    const conPlaga = evaluar('maiz', { plagas: [{ nombreComun: 'Gusano cogollero', cultivos: ['maiz'] }] });
    expect(conPlaga.puntos).toBe(evaluar('maiz').puntos - 1);
    expect(conPlaga.motivos.join(' ')).toContain('Gusano cogollero');
  });
});
