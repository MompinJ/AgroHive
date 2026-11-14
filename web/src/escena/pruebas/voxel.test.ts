import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { construirEscena } from '../adaptador';
import { ErrorBbmodel, leerBbmodel, type ModeloVoxel } from '../voxel/bbmodel';
import { agruparPorModelo, claveModelo, escalaPorAvance, giroCelda, modeloRespaldo } from '../voxel/catalogo';
import { matrizRotacionZYX, unirCubos } from '../voxel/geometria';
import { decodificarPaletaPng } from '../voxel/paleta-png';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { Parcela, ResultadoCeldas } from '../../../../contratos/tipos/contratos';

const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const carpetaCultivos = `${raiz}modelos/cultivos/`;
const archivos = readdirSync(carpetaCultivos).filter((f) => f.endsWith('.bbmodel'));
const leerArchivo = (f: string) => leerBbmodel(JSON.parse(readFileSync(carpetaCultivos + f, 'utf8')), f);

// Tabla de colores documentada por Mafer en modelos/paleta.md (fuente: modelos/paleta.py).
const paletaDocumentada = [...readFileSync(`${raiz}modelos/paleta.md`, 'utf8').matchAll(/^\| (\d+) \| \S+ \| (#[0-9a-f]{6}) \|/gm)]
  .map((m) => [Number(m[1]), m[2]] as const);

describe('modelos de modelos/cultivos (A1.4, A2.11)', () => {
  it('hay modelos para probar', () => {
    expect(archivos.length).toBeGreaterThan(0);
    expect(paletaDocumentada.length).toBeGreaterThanOrEqual(16);
  });

  for (const f of archivos) {
    describe(f, () => {
      const modelo = leerArchivo(f);

      it('sigue la convencion de nombre <cultivo>_<etapa>', () => {
        expect(f).toMatch(/^[a-z]+_[a-z]+\.bbmodel$/);
      });

      it('su paleta incrustada coincide con modelos/paleta.md', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        expect(paleta).toHaveLength(modelo.textura.ancho * modelo.textura.alto);
        for (const [indice, hex] of paletaDocumentada) expect(paleta[indice]?.hex).toBe(hex);
      });

      it('se une en una geometria apoyada en el suelo y centrada en la celda', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        const g = unirCubos(modelo, (i) => (paleta[i] && paleta[i].alfa > 0 ? [1, 1, 1] : null));
        expect(g.vertices % 3).toBe(0);
        expect(g.vertices).toBeGreaterThan(0);
        // Origen = centro de la base y y = 0 es la superficie (doc 07).
        expect(g.caja.min[1]).toBeGreaterThanOrEqual(-0.01);
        expect(Math.abs(g.caja.min[0] + g.caja.max[0]) / 2).toBeLessThan(0.1);
        expect(Math.abs(g.caja.min[2] + g.caja.max[2]) / 2).toBeLessThan(0.1);
        // Cabe en su celda (1 celda = 16 unidades).
        expect(g.caja.max[0] - g.caja.min[0]).toBeLessThanOrEqual(1);
        expect(g.caja.max[2] - g.caja.min[2]).toBeLessThanOrEqual(1);
      });
    });
  }
});

const cubo = (extra: Partial<ModeloVoxel['cubos'][number]> = {}): ModeloVoxel => ({
  nombre: 'prueba',
  textura: { ancho: 16, alto: 16, fuente: 'data:image/png;base64,' },
  cubos: [{
    nombre: 'c',
    desde: [-8, 0, -8],
    hasta: [8, 16, 8],
    origen: [0, 0, 0],
    rotacion: [0, 0, 0],
    caras: { north: 1, south: 1, east: 1, west: 1, up: 2, down: 1 },
    ...extra,
  }],
});

describe('leerBbmodel', () => {
  const minimo = (meta: Record<string, unknown>, faces: Record<string, unknown> = {}) => ({
    meta: { format_version: '5.0', model_format: 'free', box_uv: false, ...meta },
    name: 'x',
    textures: [{ width: 16, height: 16, uv_width: 16, uv_height: 16, source: 'data:image/png;base64,AAAA' }],
    elements: [{
      name: 'a', type: 'cube', from: [0, 0, 0], to: [1, 1, 1], origin: [0, 0, 0],
      faces: { north: { uv: [3, 2, 4, 3], texture: 0 }, up: { uv: [0, 0, 1, 1], texture: null }, ...faces },
    }],
  });

  it('el indice de paleta es y * 16 + x del pixel del uv', () => {
    const m = leerBbmodel(minimo({}));
    expect(m.cubos[0]?.caras.north).toBe(2 * 16 + 3);
  });

  it('una cara sin textura o ausente no se dibuja', () => {
    const m = leerBbmodel(minimo({}));
    expect(m.cubos[0]?.caras.up).toBeNull();
    expect(m.cubos[0]?.caras.south).toBeNull();
  });

  it('rechaza modelos fuera de la convencion de doc 07', () => {
    expect(() => leerBbmodel(minimo({ model_format: 'java_block' }))).toThrow(ErrorBbmodel);
    expect(() => leerBbmodel(minimo({ box_uv: true }))).toThrow(ErrorBbmodel);
    expect(() => leerBbmodel(minimo({ format_version: '4.0' }))).toThrow(ErrorBbmodel);
    expect(() => leerBbmodel(minimo({}, { east: { uv: [16, 0, 17, 1], texture: 0 } }))).toThrow(ErrorBbmodel);
  });
});

describe('unirCubos', () => {
  it('un cubo de 16 unidades ocupa una celda: 36 vertices de [-0.5, 0, -0.5] a [0.5, 1, 0.5]', () => {
    const g = unirCubos(cubo(), () => [1, 0, 0]);
    expect(g.vertices).toBe(36);
    expect(g.caja.min).toEqual([-0.5, 0, -0.5]);
    expect(g.caja.max).toEqual([0.5, 1, 0.5]);
  });

  it('omite las caras cuyo color no se resuelve', () => {
    const g = unirCubos(cubo(), (i) => (i === 2 ? [0, 1, 0] : null));
    expect(g.vertices).toBe(6);
    expect([...g.normales.slice(0, 3)]).toEqual([0, 1, 0]);
  });

  it('las normales apuntan hacia fuera del cubo', () => {
    const g = unirCubos(cubo(), () => [1, 1, 1]);
    for (let v = 0; v < g.vertices; v += 3) {
      const p = [g.posiciones[v * 3]!, g.posiciones[v * 3 + 1]! - 0.5, g.posiciones[v * 3 + 2]!];
      const n = [g.normales[v * 3]!, g.normales[v * 3 + 1]!, g.normales[v * 3 + 2]!];
      expect(p[0]! * n[0]! + p[1]! * n[1]! + p[2]! * n[2]!).toBeGreaterThan(0);
    }
  });

  it('los triangulos giran en sentido antihorario visto desde fuera', () => {
    const g = unirCubos(cubo(), () => [1, 1, 1]);
    const v = (k: number) => [g.posiciones[k * 3]!, g.posiciones[k * 3 + 1]!, g.posiciones[k * 3 + 2]!];
    for (let t = 0; t < g.vertices; t += 3) {
      const [a, b, c] = [v(t), v(t + 1), v(t + 2)];
      const u = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
      const w = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
      const cruz = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
      const n = [g.normales[t * 3]!, g.normales[t * 3 + 1]!, g.normales[t * 3 + 2]!];
      expect(cruz[0]! * n[0]! + cruz[1]! * n[1]! + cruz[2]! * n[2]!).toBeGreaterThan(0);
    }
  });

  it('rota alrededor de origin en orden ZYX (igual que voxelkit.py)', () => {
    // Cubo delgado a lo largo de +X, girado 90 grados en Y: queda a lo largo de -Z.
    const g = unirCubos(cubo({ desde: [0, 0, 0], hasta: [16, 1, 1], rotacion: [0, 90, 0] }), () => [1, 1, 1]);
    expect(g.caja.min[2]).toBeCloseTo(-1, 6);
    expect(g.caja.max[0]).toBeCloseTo(1 / 16, 6);
    const m = matrizRotacionZYX([30, 0, 0]);
    expect(m[4]).toBeCloseTo(Math.cos(Math.PI / 6), 9);
  });
});

describe('catalogo de modelos', () => {
  const escena = construirEscena(structuredClone(parcelaEjemplo) as Parcela, structuredClone(resultadoEjemplo) as ResultadoCeldas);

  it('la clave es <cultivo>_<etapa>; podrida usa su modelo; marchita y estresada usan el de su etapa', () => {
    const b = escena.bloques.find((x) => x.celdaId === 'c-1-0')!;
    expect(b.estadoVisual).toBe('marchita');
    expect(claveModelo(b)).toBe('frijol_madurez');
    const podrida = { ...b, registro: { ...b.registro!, estadoPlanta: 'podrida' as const } };
    expect(claveModelo(podrida)).toBe('frijol_podrida');
  });

  it('suelo desnudo no lleva planta', () => {
    expect(claveModelo({ cultivo: null, etapa: 'suelo_desnudo', registro: null })).toBeNull();
  });

  it('agrupa un InstancedMesh por clave y declara el respaldo cuando falta el .bbmodel', () => {
    const grupos = agruparPorModelo(escena.bloques, new Set(['frijol_crecimiento']));
    expect(grupos.map((g) => [g.clave, g.resolucion.tipo, g.bloques.length])).toEqual([
      ['calabaza_crecimiento', 'respaldo', 1],
      ['frijol_crecimiento', 'bbmodel', 2],
      ['frijol_madurez', 'respaldo', 1],
    ]);
  });

  it('el giro por celda es estable y en pasos de 90 grados', () => {
    expect(giroCelda('c-3-7')).toBe(giroCelda('c-3-7'));
    const giros = new Set(Array.from({ length: 50 }, (_, k) => giroCelda(`c-${k}-${k}`)));
    expect([...giros].every((g) => [0, 1, 2, 3].includes(g))).toBe(true);
    expect(giros.size).toBeGreaterThan(1);
  });

  it('la escala sigue avanceEtapa del motor entre 85 % y 100 %; sin avance, 100 %', () => {
    expect(escalaPorAvance(0)).toBeCloseTo(0.85);
    expect(escalaPorAvance(1)).toBeCloseTo(1);
    expect(escalaPorAvance(null)).toBe(1);
  });

  it('la planta de respaldo se apoya en el suelo y cabe en la celda', () => {
    const g = unirCubos(modeloRespaldo('frijol_madurez', cubo().textura), () => [1, 1, 1]);
    expect(g.caja.min[1]).toBe(0);
    expect(g.caja.max[0] - g.caja.min[0]).toBeLessThanOrEqual(1);
  });
});
