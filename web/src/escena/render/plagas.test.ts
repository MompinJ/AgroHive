import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PlagasEscena, type PlagaCelda } from './plagas';

const apoyos = Array.from({ length: 100 }, (_, n) => ({ celdaId: `c-${Math.floor(n / 10)}-${n % 10}`, x: n % 10, y: 0, z: Math.floor(n / 10) }));
const gusanos = new Map<string, PlagaCelda>(apoyos.map((a) => [a.celdaId, { tipo: 'gusano', comiendo: true }]));

/** Piezas (cajas) dibujadas: lo que cuesta en la GPU. */
function piezas(p: PlagasEscena): number {
  let n = 0;
  p.grupo.traverse((o) => { if (o instanceof THREE.InstancedMesh) n += o.count; });
  return n;
}

describe('insectos: tope por nivel de graficos', () => {
  it('con un tope menor se dibujan menos piezas, y con tope 0 ninguna de insecto', () => {
    const alto = new PlagasEscena();
    alto.setTope(480);
    alto.construir(apoyos, gusanos);
    const bajo = new PlagasEscena();
    bajo.setTope(20);
    bajo.construir(apoyos, gusanos);
    const ninguno = new PlagasEscena();
    ninguno.setTope(0);
    ninguno.construir(apoyos, gusanos);
    expect(piezas(bajo)).toBeLessThan(piezas(alto));
    expect(bajo.hayInsectos()).toBe(true);
    expect(ninguno.hayInsectos()).toBe(false);
  });
  it('no dibuja nada si ninguna celda esta siendo atacada', () => {
    const p = new PlagasEscena();
    p.construir(apoyos, new Map(apoyos.map((a) => [a.celdaId, { tipo: 'gusano', comiendo: false } as PlagaCelda])));
    expect(p.hayInsectos()).toBe(false);
    p.construir(apoyos, null);
    expect(piezas(p)).toBe(0);
  });
  it('un tope negativo o con decimales se normaliza', () => {
    const p = new PlagasEscena();
    p.setTope(-5);
    p.construir(apoyos, gusanos);
    expect(p.hayInsectos()).toBe(false);
  });
});
