import { area, bbox, booleanValid, centroid, featureCollection, intersect, kinks, polygon } from '@turf/turf';
import type { LonLat, Parcela } from '../../../contratos/tipos/contratos';
import version from '../../../contratos/package.json';

export type Cuadricula = { parcela: Parcela; bordes: LonLat[][] };

export function generarCuadricula(puntos: LonLat[]): Cuadricula {
  if (puntos.length < 3 || puntos.length > 200) throw new Error('Usa entre 3 y 200 vértices.');
  if (puntos.some(([lon, lat]) => !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) >= 85)) {
    throw new Error('Coordenadas inválidas. Usa longitud entre −180 y 180 y latitud entre −85 y 85.');
  }
  const anillo = puntos.map((p) => [...p] as LonLat);
  const primero = anillo[0]!;
  const ultimo = anillo.at(-1)!;
  if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) anillo.push([...primero]);
  const vertices = anillo.slice(0, -1);
  if (new Set(vertices.map((p) => p.join(','))).size !== vertices.length) throw new Error('Hay vértices repetidos.');
  const contorno = polygon([anillo]);
  if (!booleanValid(contorno) || kinks(contorno).features.length) throw new Error('El contorno se cruza o no forma un polígono válido.');
  const superficie = area(contorno);
  if (superficie < 1) throw new Error('El contorno debe cubrir al menos un metro cuadrado.');
  const [oeste, sur, este, norte] = bbox(contorno);
  if (este! - oeste! > 180) throw new Error('No se admiten parcelas que crucen el antimeridiano.');
  // Conversión local esférica; no se usa para inferir indicadores agronómicos.
  const radio = 6371008.8;
  const metrosLat = Math.PI * radio / 180;
  const metrosLon = metrosLat * Math.cos((sur! + norte!) / 2 * Math.PI / 180);
  const ancho = (este! - oeste!) * metrosLon;
  const alto = (norte! - sur!) * metrosLat;
  if (Math.max(ancho, alto) > 100000) throw new Error('La parcela supera el límite local de 100 km. Dibuja un contorno menor.');
  const lado = Math.max(10, ancho / 40, alto / 40);
  const columnas = Math.min(40, Math.ceil(ancho / lado));
  const filas = Math.min(40, Math.ceil(alto / lado));
  const celdas: Parcela['celdas'][number][] = [];
  const bordes: LonLat[][] = [];
  for (let i = 0; i < filas; i++) for (let j = 0; j < columnas; j++) {
    const x = oeste! + j * lado / metrosLon;
    const y = sur! + i * lado / metrosLat;
    const dx = lado / metrosLon;
    const dy = lado / metrosLat;
    const borde: LonLat[] = [[x, y], [x + dx, y], [x + dx, y + dy], [x, y + dy], [x, y]];
    const cuadrado = polygon([borde]);
    const recorte = intersect(featureCollection([contorno, cuadrado]));
    if (!recorte || area(recorte) < 0.000001) continue;
    celdas.push({ id: `c-${i}-${j}`, i, j, centro: [x + dx / 2, y + dy / 2], fraccionDentro: Math.min(1, area(recorte) / area(cuadrado)), elevacionM: null, pendientePct: null });
    bordes.push(borde);
  }
  if (!celdas.length) throw new Error('No se pudieron generar celdas para este contorno.');
  return {
    bordes,
    parcela: {
      meta: { versionContrato: version.version, esEjemplo: false },
      id: 'parcela-usuario', nombre: 'Mi parcela', origen: 'poligono_usuario',
      poligono: anillo as Parcela['poligono'], areaHa: superficie / 10000,
      centroide: centroid(contorno).geometry.coordinates as LonLat,
      tamanoCeldaM: lado, sueloId: 'suelo-pendiente',
      terreno: { estado: 'NO_EVALUABLE', fuente: { nombre: 'Sin elevación consultada', nota: 'Contorno del usuario; cuadrícula local generada con Turf. Falta consultar el suelo.' } },
      celdas: celdas as Parcela['celdas'],
    },
  };
}
