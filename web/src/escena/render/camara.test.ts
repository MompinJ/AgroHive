import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { polarDeZoom, ZOOM_MAX, ZOOM_MIN } from './camara';

describe('camara de granja', () => {
  it('la inclinacion sigue al zoom: lejos casi desde arriba, cerca mas de lado', () => {
    const grados = (z: number) => THREE.MathUtils.radToDeg(polarDeZoom(z));
    expect(grados(ZOOM_MIN)).toBeCloseTo(42);
    expect(grados(ZOOM_MAX)).toBeCloseTo(66);
    expect(grados(1)).toBeGreaterThan(42);
    expect(grados(2)).toBeGreaterThan(grados(1));
    expect(grados(100)).toBeCloseTo(66);
    expect(grados(0.1)).toBeCloseTo(42);
  });
});
