import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { DatosLaboratorio } from '../ui/useLaboratorio';
import catalogo from '../../../datos/catalogos/cultivos.json';
import { AVISO_EJEMPLOS, cargarEjemplo, existeEjemplo, listarEjemplos } from './ejemplos';
import { validadorContrato } from '../motor/pruebas/utiles';

const RAIZ = fileURLToPath(new URL('../../../datos/demo/ejemplos/', import.meta.url));
const manifiesto = (id: string) => JSON.parse(readFileSync(`${RAIZ}${id}/manifiesto.json`, 'utf8')) as { datos: Record<string, { estado: string; motivo?: string; fraccionCultivo?: number }> };
const ids = new Set((catalogo as { cultivos: { id: string }[] }).cultivos.map((c) => c.id));

describe('indice de ejemplos mundiales', () => {
  const lista = listarEjemplos();
  it('5 o 6 ejemplos en al menos 5 continentes, sin Isla', () => {
    expect(lista.length).toBeGreaterThanOrEqual(5);
    expect(lista.length).toBeLessThanOrEqual(6);
    expect(new Set(lista.map((e) => e.id)).size).toBe(lista.length);
    expect(new Set(lista.map((e) => e.continente)).size).toBeGreaterThanOrEqual(5);
    expect(lista.some((e) => /isla/i.test(e.id) || /isla/i.test(e.nombre))).toBe(false);
  });
  it('cada uno con cultivos del catalogo de 40, 1 a 5 ha y clima calculado', () => {
    for (const e of lista) {
      expect(e.cultivosSugeridos.length, e.id).toBeGreaterThan(0);
      for (const c of e.cultivosSugeridos) expect(ids.has(c), `${e.id}: ${c} no esta en el catalogo`).toBe(true);
      expect(e.areaHa).toBeGreaterThanOrEqual(1);
      expect(e.areaHa).toBeLessThanOrEqual(5);
      expect(e.clima?.clase, e.id).toMatch(/^[ABCDE]/);
    }
  });
  it('el poligono cae en tierra de cultivo de ESA WorldCover (casi todos los pixeles de clase 40)', () => {
    for (const e of lista) expect(manifiesto(e.id).datos.worldcover?.fraccionCultivo ?? 0, e.id).toBeGreaterThanOrEqual(0.95);
  });
  it('aviso honesto', () => {
    expect(AVISO_EJEMPLOS).toMatch(/no son levantamientos/);
    expect(existeEjemplo('no-existe')).toBe(false);
    expect(existeEjemplo(lista[0]!.id)).toBe(true);
  });
  it('cargarEjemplo con un id que no existe falla con un mensaje claro', async () => {
    await expect(cargarEjemplo('isla-veracruz')).rejects.toThrow(/No hay un ejemplo/);
  });
});

describe('cargarEjemplo: lo mismo que la rama esDemo del laboratorio, validado contra contratos/', () => {
  for (const e of listarEjemplos()) {
    it(e.nombre, { timeout: 60000 }, async () => {
      const d = await cargarEjemplo(e.id);
      // Misma forma que DatosLaboratorio: Eduardo solo cambia el import.
      const comoLaboratorio: DatosLaboratorio = d;
      expect(comoLaboratorio.esDemo).toBe(true);
      expect(validadorContrato('parcela')(d.parcela)).toEqual([]);
      expect(d.parcela.coordenadasIlustrativas).toBe(true);
      expect(d.parcela.origen).toBe('demo');
      expect(d.parcela.meta.esEjemplo).toBe(true);
      expect(d.parcela.meta.aviso).toMatch(/no es un levantamiento/);
      expect(d.parcela.celdas.every((c) => c.elevacionM != null)).toBe(d.parcela.terreno.estado !== 'NO_EVALUABLE');
      expect(validadorContrato('serie-clima')(d.serie)).toEqual([]);
      expect(d.serie.estado).toBe('EVALUABLE');
      expect(d.serie.diario[0]!.fecha).toBe('2005-10-01');
      expect(d.serie.diario.at(-1)!.fecha).toBe('2025-12-31');
      const m = manifiesto(e.id).datos;
      const revisar = (dato: string, valor: unknown, contrato: string) => {
        if (valor == null) {
          expect(m[dato]?.estado, `${dato} falta sin estar NO_EVALUABLE en el manifiesto`).toBe('NO_EVALUABLE');
          expect(m[dato]?.motivo).toBeTruthy();
          expect(d.faltan.some((f) => f.dato === dato)).toBe(true);
        } else {
          expect(validadorContrato(contrato)(valor), dato).toEqual([]);
        }
      };
      revisar('suelo', d.suelo, 'suelo');
      revisar('proxima-temporada', d.capa, 'proxima-temporada');
      revisar('calendario', d.calendario, 'calendario-local');
      revisar('ndvi', d.evidencia.ndvi, 'ndvi');
      revisar('smap', d.evidencia.smap, 'smap');
      revisar('plagas', d.evidencia.plagas, 'plagas');
      revisar('cdl', d.evidencia.cdl, 'ee-uu');
      revisar('ssurgo', d.evidencia.ssurgo, 'ee-uu');
      if (d.suelo) expect(d.parcela.sueloId).toBe(d.suelo.id);
      // Los numeros del catalogo y la tabla son los del front.
      expect(d.catalogo.cultivos.length).toBe(40);
      expect(d.avisos[0]).toMatch(new RegExp(`Parcela de ejemplo en ${e.nombre}`));
      expect(d.avisosDatos.every((a) => a.mensaje.length > 0)).toBe(true);
      // Clima y bioma salen de la serie con geo/koppen.ts y coinciden con el indice.
      expect(d.clima.estado).toBe('EVALUABLE');
      expect(d.clima.clase).toBe(e.clima!.clase);
      expect(d.bioma).toBe(e.clima!.bioma);
    });
  }

  it('dos cargas no comparten la parcela (se puede editar sin tocar el paquete)', async () => {
    const id = listarEjemplos()[0]!.id;
    const a = await cargarEjemplo(id);
    a.parcela.celdas[0]!.elevacionM = -9999;
    const b = await cargarEjemplo(id);
    expect(b.parcela.celdas[0]!.elevacionM).not.toBe(-9999);
  });

  it('Iowa trae CDL y SSURGO evaluables; fuera de EE. UU. van NO_EVALUABLE sin inventar', async () => {
    const iowa = await cargarEjemplo('iowa-story');
    expect(iowa.evidencia.cdl?.estado).toBe('EVALUABLE');
    expect(iowa.evidencia.ssurgo?.estado).toBe('EVALUABLE');
    for (const e of listarEjemplos().filter((x) => x.paisIso !== 'US')) {
      const d = await cargarEjemplo(e.id);
      if (d.evidencia.cdl) expect(d.evidencia.cdl.estado, e.id).toBe('NO_EVALUABLE');
      if (d.evidencia.ssurgo) expect(d.evidencia.ssurgo.estado, e.id).toBe('NO_EVALUABLE');
    }
  });
});
