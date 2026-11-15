// Retrato de la mascota (elote feliz) para la interfaz: se dibuja UNA vez su .bbmodel con un
// renderer propio fuera de pantalla y se devuelve como imagen PNG. Asi la mascota de la pantalla
// es la misma del modelo 3D, sin dibujarla dentro de la parcela. Decorativo: no lleva datos.

import * as THREE from 'three';
import type { Vec3 } from '../voxel/bbmodel';
import { cargarModelo, MODELOS_DISPONIBLES } from '../voxel/fuente-modelos';
import { unirCubos } from '../voxel/geometria';
import { decodificarPaletaPng } from '../voxel/paleta-png';

let pendiente: Promise<string | null> | null = null;

/** PNG (data URL) de la mascota de frente, con fondo transparente; null si no hay modelo o WebGL. */
export function retratoMascota(lado = 240): Promise<string | null> {
  pendiente ??= dibujar(lado).catch(() => null);
  return pendiente;
}

async function dibujar(lado: number): Promise<string | null> {
  if (!MODELOS_DISPONIBLES.has('mascota_feliz') || typeof document === 'undefined') return null;
  const modelo = await cargarModelo('mascota_feliz');
  const paleta = await decodificarPaletaPng(modelo.textura.fuente);
  const c = new THREE.Color();
  const unida = unirCubos(modelo, (i) => {
    const p = paleta[i];
    if (!p || p.alfa === 0) return null;
    c.setStyle(p.hex, THREE.SRGBColorSpace);
    return [c.r, c.g, c.b] as Vec3;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(unida.posiciones, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(unida.normales, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(unida.colores, 3));
  geo.computeBoundingBox();

  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = lado;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    geo.dispose();
    return null;
  }
  try {
    renderer.setClearColor(0x000000, 0);
    const escena = new THREE.Scene();
    escena.add(new THREE.HemisphereLight('#ffffff', '#8a7a55', 1.9));
    const sol = new THREE.DirectionalLight('#fff3dc', 1.3);
    sol.position.set(3, 6, 8);
    escena.add(sol);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const malla = new THREE.Mesh(geo, material);
    // La cara mira a +Z: un poco girada y desde arriba para que se vea con volumen.
    malla.rotation.y = -0.35;
    escena.add(malla);
    const caja = geo.boundingBox!;
    const centro = caja.getCenter(new THREE.Vector3());
    const tam = caja.getSize(new THREE.Vector3());
    const media = Math.max(tam.x, tam.y, tam.z) * 0.54;
    const camara = new THREE.OrthographicCamera(-media, media, media, -media, -100, 100);
    camara.position.set(centro.x + 2, centro.y + 6, centro.z + 30);
    camara.lookAt(centro.x, centro.y, centro.z);
    renderer.render(escena, camara);
    const url = lienzo.toDataURL('image/png');
    material.dispose();
    return url;
  } finally {
    geo.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
