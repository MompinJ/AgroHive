import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TRIANGULOS } from '../../geo/forma-celda';
import { banderinEnCelda, geometriaPrisma, giroForma, LADO_PLACA_MEDIA, placaEnCelda } from '../render/media-celda';
import { SEMIPLANO } from '../voxel/media';
import { construirEscena } from '../adaptador';
import { generarCuadricula } from '../../geo/cuadricula';

// La mitad que se conserva, en la escena (x este, z sur): a * x + c * z <= 0 (voxel/media.ts).
const dentro = (t: (typeof TRIANGULOS)[number], x: number, z: number) => SEMIPLANO[t][0] * x + SEMIPLANO[t][1] * z <= 1e-9;

describe('piezas de medio cuadrado en la escena', () => {
  it('el prisma girado cae en la mitad de su forma y mide medio bloque', () => {
    const geo = geometriaPrisma();
    const pos = geo.getAttribute('position');
    for (const t of TRIANGULOS) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giroForma(t));
      for (let k = 0; k < pos.count; k++) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, k).applyQuaternion(q);
        expect(dentro(t, p.x, p.z), `${t} ${p.toArray()}`).toBe(true);
      }
    }
    // 2 tapas + 3 lados de 2 triangulos = 8 triangulos.
    expect(pos.count).toBe(24);
  });

  it('las caras del prisma miran hacia afuera', () => {
    const geo = geometriaPrisma();
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    for (let k = 0; k < pos.count; k += 3) {
      const [a, b, c] = [0, 1, 2].map((i) => new THREE.Vector3().fromBufferAttribute(pos, k + i));
      const n = new THREE.Vector3().subVectors(b!, a!).cross(new THREE.Vector3().subVectors(c!, a!)).normalize();
      expect(n.dot(new THREE.Vector3().fromBufferAttribute(nor, k))).toBeGreaterThan(0.99);
    }
  });

  it('la placa y el banderin quedan dentro del triangulo', () => {
    for (const t of TRIANGULOS) {
      const { dx, dz, escala } = placaEnCelda(t, 0.6);
      expect(escala * 0.6).toBeCloseTo(LADO_PLACA_MEDIA);
      const m = LADO_PLACA_MEDIA / 2;
      for (const [x, z] of [[dx - m, dz - m], [dx + m, dz - m], [dx + m, dz + m], [dx - m, dz + m]] as const) {
        expect(dentro(t, x, z)).toBe(true);
        expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThan(0.5);
      }
      const ban = banderinEnCelda(t);
      expect(dentro(t, ban.dx, ban.dz)).toBe(true);
      // La bandera (5/16 de celda hacia +x del asta, girada con giro) no sale de la celda.
      expect(Math.abs(ban.dx + Math.cos(ban.giro) * 5 / 16)).toBeLessThan(0.5);
    }
    expect(placaEnCelda('completa', 0.6)).toEqual({ dx: 0, dz: 0, escala: 1 });
    expect(banderinEnCelda('completa')).toEqual({ dx: -0.42, dz: -0.42, giro: 0 });
  });

  it('el adaptador copia la forma del contrato y usa completa si falta', () => {
    const { parcela } = generarCuadricula([[-95.530, 18.0293], [-95.5293, 18.030], [-95.530, 18.0307], [-95.5307, 18.030]]);
    const escena = construirEscena(parcela, null);
    const porId = new Map(parcela.celdas.map((c) => [c.id, c.forma]));
    expect(escena.bloques.every((b) => b.forma === porId.get(b.celdaId))).toBe(true);
    expect(escena.bloques.some((b) => b.forma !== 'completa')).toBe(true);
    const sinForma = { ...parcela, celdas: parcela.celdas.map(({ forma: _f, ...c }) => c) as typeof parcela.celdas };
    expect(construirEscena(sinForma, null).bloques.every((b) => b.forma === 'completa')).toBe(true);
  });

  it('en la escena, una celda SO del contorno queda al suroeste de su vecina del noreste', () => {
    // Orientacion: norte en -z, este en +x (adaptador). El triangulo SO del contrato debe ser el
    // de la esquina (-x, +z) en la escena, que es la que conserva SEMIPLANO.SO.
    expect(dentro('SO', -0.5, 0.5)).toBe(true);
    expect(dentro('SO', 0.5, -0.5)).toBe(false);
    expect(dentro('NE', 0.5, -0.5)).toBe(true);
    expect(dentro('NO', -0.5, -0.5)).toBe(true);
    expect(dentro('SE', 0.5, 0.5)).toBe(true);
  });
});
