// Generador de la cuadricula de la parcela (antes en web/src/ui/cuadricula.ts, de balam;
// ui/cuadricula.ts lo reexporta). Agrega, sin cambiar fraccionDentro ni que celdas existen:
//   - la forma de dibujo de cada celda de borde (completa o medio cuadrado, forma-celda.ts);
//   - el tamano de celda que pide el usuario (tamano-celda.ts), con el tope de 1600 celdas.
// fraccionDentro se sigue midiendo con turf (area geodesica) como antes: es lo que pesa en el motor.

import { area, bbox, booleanValid, centroid, featureCollection, intersect, kinks, polygon } from '@turf/turf';
import type { Advertencia, LonLat, Parcela } from '../../../contratos/tipos/contratos';
import version from '../../../contratos/package.json';
import { areaConSigno, celdasQueTocan, contornoForma, type Punto } from './forma-celda';
import { dimensiones, elegirLado, TOPE_CELDAS, type EscalaCelda, type PedidoTamano } from './tamano-celda';

export type Cuadricula = {
  parcela: Parcela;
  /** Cuadrado de cada celda (anillo cerrado), en el orden de parcela.celdas, como antes. */
  bordes: LonLat[][];
  /** Contorno de DIBUJO de cada celda (cuadrado o triangulo, segun celda.forma), mismo orden. */
  contornos: LonLat[][];
  /** Tamano pedido y el que se uso (subido si el pedido rebasaba el tope). */
  escala: EscalaCelda;
};

export interface OpcionesCuadricula {
  /** Lado de celda pedido en metros, o 'auto' (por defecto, la regla de siempre). */
  tamanoCeldaM?: PedidoTamano;
}

export function generarCuadricula(puntos: LonLat[], opciones: OpcionesCuadricula = {}): Cuadricula {
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

  // Contorno en metros locales con origen en la esquina suroeste de la caja.
  const local: Punto[] = vertices.map(([lon, lat]) => [(lon - oeste!) * metrosLon, (lat - sur!) * metrosLat]);
  const automatico = (opciones.tamanoCeldaM ?? 'auto') === 'auto';
  const candidatas = (l: number) => {
    const { filas, columnas } = dimensiones(ancho, alto, l, automatico);
    return celdasQueTocan(local, l, filas, columnas);
  };
  const escala = elegirLado(opciones.tamanoCeldaM ?? 'auto', ancho, alto, Math.abs(areaConSigno(local)), (l) => candidatas(l).length);
  const lado = escala.ladoM;
  const aLonLat = ([x, y]: Punto): LonLat => [oeste! + x / metrosLon, sur! + y / metrosLat];

  const celdas: Parcela['celdas'][number][] = [];
  const bordes: LonLat[][] = [];
  const contornos: LonLat[][] = [];
  for (const { i, j, forma } of candidatas(lado)) {
    const x = oeste! + j * lado / metrosLon;
    const y = sur! + i * lado / metrosLat;
    const dx = lado / metrosLon;
    const dy = lado / metrosLat;
    const borde: LonLat[] = [[x, y], [x + dx, y], [x + dx, y + dy], [x, y + dy], [x, y]];
    const cuadrado = polygon([borde]);
    const recorte = intersect(featureCollection([contorno, cuadrado]));
    if (!recorte || area(recorte) < 0.000001) continue;
    celdas.push({
      id: `c-${i}-${j}`, i, j, centro: [x + dx / 2, y + dy / 2],
      fraccionDentro: Math.min(1, area(recorte) / area(cuadrado)), forma,
      elevacionM: null, pendientePct: null,
    });
    bordes.push(borde);
    const dibujo = contornoForma(forma, j * lado, i * lado, lado).map(aLonLat);
    contornos.push([...dibujo, dibujo[0]!]);
  }
  if (!celdas.length) throw new Error('No se pudieron generar celdas para este contorno.');
  if (celdas.length > TOPE_CELDAS) throw new Error(`La cuadrícula pasa de ${TOPE_CELDAS} celdas; elige un tamaño de celda mayor.`);
  const advertencias: Advertencia[] = escala.subido
    ? [{
        codigo: 'TAMANO_CELDA_AJUSTADO',
        mensaje: `Pediste celdas de ${escala.pedido} m; se usan de ${lado.toFixed(1)} m para no pasar de ${TOPE_CELDAS} celdas.`,
        severidad: 'aviso',
      }]
    : [];
  return {
    bordes,
    contornos,
    escala,
    parcela: {
      meta: { versionContrato: version.version, esEjemplo: false },
      id: 'parcela-usuario', nombre: 'Mi parcela', origen: 'poligono_usuario',
      poligono: anillo as Parcela['poligono'], areaHa: superficie / 10000,
      centroide: centroid(contorno).geometry.coordinates as LonLat,
      tamanoCeldaM: lado, sueloId: 'suelo-pendiente',
      terreno: { estado: 'NO_EVALUABLE', fuente: { nombre: 'Sin elevación consultada', nota: 'Contorno del usuario; cuadrícula local generada con Turf. Falta consultar el suelo.' } },
      celdas: celdas as Parcela['celdas'],
      ...(advertencias.length ? { advertencias } : {}),
    },
  };
}
