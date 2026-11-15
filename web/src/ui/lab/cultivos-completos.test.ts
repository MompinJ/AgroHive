// Cada cultivo del catalogo debe poder usarse en el laboratorio: sus 10 modelos (5 etapas,
// detallado y bloque) existen y se leen, y el motor lo evalua salvo que su ciclo no quepa en el
// anio de clima del escenario (DIAS_MAX_CLIMA), que la paleta marca como no evaluable.
import { describe, expect, it } from 'vitest';
import type { CatalogoCultivos, Suelo, TablaSuelos } from '../../../../contratos/tipos/contratos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import suelo from '../../../../datos/demo/respuestas/suelo.json';
import { parcelaConTerrenoDemo } from '../../escena/demo-motor';
import { seleccionarEscenarios } from '../../motor/escenarios';
import { simularRotacion } from '../../motor/motor';
import { seriePowerIsla } from '../../motor/pruebas/utiles';
import { cargarModelo, MODELOS_DISPONIBLES } from '../../escena/voxel/fuente-modelos';
import { iconoDeCultivo } from '../iconosCultivo2D';
import { armarPlan, calendarioIsla, DIAS_MAX_CLIMA, diasCultivo } from '../planes';

const cat = catalogo as CatalogoCultivos;
const ETAPAS = ['siembra', 'brote', 'crecimiento', 'madurez', 'podrida'];

describe('cultivos completos', () => {
  it('cada cultivo tiene sus 10 modelos legibles y su icono para la paleta', async () => {
    const faltan: string[] = [];
    for (const c of cat.cultivos) {
      if (!iconoDeCultivo(c.id)) faltan.push(`${c.id}: sin icono`);
      for (const e of ETAPAS) for (const clave of [`${c.id}_${e}`, `${c.id}_${e}_bloque`]) {
        if (!MODELOS_DISPONIBLES.has(clave)) { faltan.push(`sin ${clave}`); continue; }
        const m = await cargarModelo(clave);
        if (!m.cubos.length) faltan.push(`${clave} vacio`);
      }
    }
    expect(faltan).toEqual([]);
  });

  it('el motor evalua cada cultivo, salvo los de ciclo mas largo que el anio de clima', () => {
    const parcela = parcelaConTerrenoDemo();
    const esc = seleccionarEscenarios(seriePowerIsla()).escenarios;
    const noEvaluables: string[] = [];
    for (const c of cat.cultivos) {
      const plan = armarPlan('R1', parcela, [{ ciclo: 1, cultivo: c.id, siembra: '2026-06-15', temporada: 'PV', porQue: 'prueba' }], calendarioIsla);
      const r = simularRotacion({ plan, parcela, catalogo: cat, tablaSuelos: tabla as TablaSuelos, suelo: suelo as Suelo, calendario: calendarioIsla, escenarios: esc });
      if (r.rotacion.estado === 'NO_EVALUABLE' || r.rotacion.estado === 'ERROR_DATOS') noEvaluables.push(c.id);
    }
    const largos = cat.cultivos.filter((c) => (diasCultivo(c.id, cat) ?? 0) > DIAS_MAX_CLIMA).map((c) => c.id);
    expect(noEvaluables).toEqual(largos);
  });
});
