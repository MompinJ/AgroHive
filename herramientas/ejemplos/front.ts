// Lo que grabar.py necesita del codigo del front, para no reimplementarlo en Python. grabar.py compila este archivo con
// Vite (--ssr) dentro de web/node_modules/.ejemplos y lo corre con node; escribe JSON en stdout.
//
//   node front.js parcelas <lugares.json>     {id: Parcela} con la MISMA cuadricula que arma el front al dibujar
//                                             (web/src/geo/cuadricula.ts). El poligono es un rectangulo de anchoM x altoM
//                                             centrado en `centro`, con la esquina noreste cortada a 45 grados
//                                             (chaflanNoresteM) para que el ejemplo tenga orillas diagonales.
//   node front.js clima <carpeta> <id>...     {id: {clase, descripcion, bioma}}: Koppen-Geiger de la serie grabada
//                                             (web/src/geo/koppen.ts, Peel et al. 2007), o null si es NO_EVALUABLE.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generarCuadricula } from '../../web/src/geo/cuadricula';
import { climaDeSerie } from '../../web/src/geo/koppen';
import type { LonLat, Parcela, SerieClima } from '../../contratos/tipos/contratos';

interface Lugar { id: string; nombre: string; ubicacion: Parcela['ubicacion']; centro: LonLat }
interface Definicion { geometria: { anchoM: number; altoM: number; chaflanNoresteM: number; tamanoCeldaM: number }; lugares: Lugar[] }

function parcelas(ruta: string): Record<string, Parcela> {
  const def = JSON.parse(readFileSync(ruta, 'utf-8')) as Definicion;
  const radio = 6371008.8; // mismo radio que cuadricula.ts
  const metrosLat = Math.PI * radio / 180;
  const r7 = (x: number) => Math.round(x * 1e7) / 1e7;
  const salida: Record<string, Parcela> = {};
  for (const l of def.lugares) {
    const { anchoM, altoM, chaflanNoresteM: c, tamanoCeldaM } = def.geometria;
    const [lon0, lat0] = l.centro;
    const metrosLon = metrosLat * Math.cos(lat0 * Math.PI / 180);
    // Se encoge 10 cm cada medida: asi el redondeo a 1 cm de los vertices no deja una franja de celdas
    // de unos milimetros en la orilla este o norte (la cuadricula arranca en la esquina suroeste).
    const a = anchoM - 0.1, b = altoM - 0.1, d = c - 0.1;
    const p = (x: number, y: number): LonLat => [r7(lon0 + (x - anchoM / 2) / metrosLon), r7(lat0 + (y - altoM / 2) / metrosLat)];
    const vertices: LonLat[] = [p(0, 0), p(a, 0), p(a, b - d), p(a - d, b), p(0, b)];
    const { parcela } = generarCuadricula(vertices, { tamanoCeldaM });
    salida[l.id] = {
      ...parcela,
      id: `ejemplo-${l.id}`,
      nombre: `Parcela de ejemplo · ${l.nombre}`,
      origen: 'demo',
      ...(l.ubicacion ? { ubicacion: l.ubicacion } : {}),
      coordenadasIlustrativas: true,
    };
  }
  return salida;
}

function clima(carpeta: string, ids: string[]) {
  return Object.fromEntries(ids.map((id) => {
    const serie = JSON.parse(readFileSync(join(carpeta, id, 'respuestas', 'serie-clima.json'), 'utf-8')) as SerieClima;
    const k = climaDeSerie(serie);
    return [id, k.estado === 'EVALUABLE' ? { clase: k.clase, descripcion: k.descripcion, bioma: k.bioma } : null];
  }));
}

const [modo, ...resto] = process.argv.slice(2);
if (modo === 'parcelas') process.stdout.write(JSON.stringify(parcelas(resto[0]!)));
else if (modo === 'clima') process.stdout.write(JSON.stringify(clima(resto[0]!, resto.slice(1))));
else throw new Error('uso: node front.js parcelas <lugares.json> | clima <carpeta> <id>...');
