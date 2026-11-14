// Utilidades de prueba del motor: series sinteticas, fixture real de POWER y validacion contra contratos/.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { aDia, deDia } from '../fechas';
import type { DiaClima, SerieClima } from '../tipos';
import fixture from './datos/power-isla-2006-2025.json';

const dirContratos = fileURLToPath(new URL('../../../../contratos/', import.meta.url));

/** Validador de un contrato (JSON Schema 2020-12 de contratos/, con ajv instalado en contratos/ por npm ci). */
export function validadorContrato(contrato: string): (doc: unknown) => string[] {
  const requerir = createRequire(join(dirContratos, 'package.json'));
  const Ajv2020 = requerir('ajv/dist/2020.js').default;
  const formatos = requerir('ajv-formats').default;
  const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true, allowUnionTypes: true });
  formatos(ajv);
  for (const f of readdirSync(dirContratos).filter((f) => f.endsWith('.schema.json'))) {
    ajv.addSchema(JSON.parse(readFileSync(join(dirContratos, f), 'utf8')));
  }
  const v = ajv.getSchema(`https://agrohive.example/contratos/${contrato}.schema.json`);
  if (!v) throw new Error(`Sin schema ${contrato}`);
  return (doc: unknown) => {
    const ok = v(doc);
    return ok ? [] : (v.errors ?? []).map((e: { instancePath: string; message?: string }) => `${e.instancePath} ${e.message ?? ''}`);
  };
}

/** Serie real de NASA POWER de la celda demo (2006 a 2025) como respuesta de GET /api/clima. */
export function seriePowerIsla(): SerieClima {
  const f = fixture as unknown as {
    fuente: SerieClima['fuente'];
    inicio: string;
    dias: number;
    lluviaMm: (number | null)[];
    tMaxC: (number | null)[];
    tMinC: (number | null)[];
    tMediaC: (number | null)[];
    radiacionMjM2Dia: (number | null)[];
    humedadRelativaPct: (number | null)[];
    vientoMS: (number | null)[];
  };
  const d0 = aDia(f.inicio);
  const diario: DiaClima[] = [];
  for (let i = 0; i < f.dias; i++) {
    diario.push({
      fecha: deDia(d0 + i),
      lluviaMm: f.lluviaMm[i] ?? null,
      tMaxC: f.tMaxC[i] ?? null,
      tMinC: f.tMinC[i] ?? null,
      tMediaC: f.tMediaC[i] ?? null,
      radiacionMjM2Dia: f.radiacionMjM2Dia[i] ?? null,
      humedadRelativaPct: f.humedadRelativaPct[i] ?? null,
      vientoMS: f.vientoMS[i] ?? null,
      et0Mm: null,
    });
  }
  return {
    meta: { versionContrato: '0.5.0', esEjemplo: false },
    estado: 'EVALUABLE',
    respaldo: false,
    coordenada: [-95.625, 18.0],
    periodo: { desde: '2006-01-01', hasta: '2025-12-31' },
    fuente: f.fuente,
    diario,
    advertencias: [],
  };
}

/** Serie sintetica: lluvia por anio (mm/dia constante) y clima tropical fijo. Solo para pruebas. */
export function serieSintetica(desde: string, hasta: string, lluviaDia: (fecha: string) => number | null): SerieClima {
  const diario: DiaClima[] = [];
  for (let d = aDia(desde); d <= aDia(hasta); d++) {
    const fecha = deDia(d);
    diario.push({
      fecha,
      lluviaMm: lluviaDia(fecha),
      tMaxC: 32,
      tMinC: 22,
      tMediaC: 27,
      radiacionMjM2Dia: 20,
      humedadRelativaPct: 75,
      vientoMS: 2,
      et0Mm: null,
    });
  }
  return {
    meta: { versionContrato: '0.5.0', esEjemplo: true, aviso: 'Serie sintetica de prueba, no son datos reales.' },
    estado: 'EVALUABLE',
    respaldo: false,
    coordenada: [-95.625, 18.0],
    periodo: { desde, hasta },
    fuente: { nombre: 'Serie sintetica de prueba (no es NASA POWER)' },
    diario,
    advertencias: [],
  };
}
