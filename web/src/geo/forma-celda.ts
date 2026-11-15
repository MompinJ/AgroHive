// Forma de dibujo de una celda de borde (bordes diagonales, [DECIDIDO] Mompin 14/11 noche).
// Puro: sin turf, sin three. Trabaja en metros locales (x al este, y al norte).
//
// La forma es SOLO como se dibuja la celda: lo que pesa en el motor sigue siendo
// fraccionDentro (contrato parcela). Una celda de borde se dibuja completa o como
// medio cuadrado (triangulo rectangulo cortado por la diagonal), nombrado por la
// esquina del angulo recto, que es la mitad que se conserva:
//   SO: mitad suroeste (diagonal de la esquina NO a la SE)
//   SE: mitad sureste (diagonal de SO a NE)
//   NE: mitad noreste (diagonal de NO a SE)
//   NO: mitad noroeste (diagonal de SO a NE)
//
// Regla (cubierta hacia afuera, para que las orillas queden rectas y toda celda
// con area dentro siga visible y se pueda tocar):
//   - sin area dentro                       -> 'fuera' (el generador no la emite)
//   - 2, 3 o 4 esquinas dentro              -> 'completa' (orillas rectas o casi llenas)
//   - 1 esquina dentro                      -> triangulo de esa esquina, salvo que la celda
//                                              completa se parezca mas (diferencia simetrica)
//   - 0 esquinas dentro (punta o franja)    -> el triangulo que contiene casi todo lo de
//                                              dentro; si ninguno, 'completa'
// Una esquina sobre la orilla del poligono cuenta como fuera: asi una orilla a 45
// grados que pasa por dos esquinas da el triangulo exacto.

export type FormaCelda = 'completa' | 'NE' | 'NO' | 'SE' | 'SO';
export type FormaGeometrica = FormaCelda | 'fuera';
export type Punto = readonly [number, number];

export const TRIANGULOS = ['SO', 'SE', 'NE', 'NO'] as const;
export type Triangulo = (typeof TRIANGULOS)[number];

/** Parte del area que debe caber en un triangulo para usarlo cuando no hay esquinas dentro. */
const CABE_EN_TRIANGULO = 0.98;

/** Area con signo (positiva si el anillo va antihorario). Acepta anillo abierto o cerrado. */
export function areaConSigno(anillo: readonly Punto[]): number {
  let s = 0;
  for (let k = 0; k < anillo.length; k++) {
    const [x0, y0] = anillo[k]!;
    const [x1, y1] = anillo[(k + 1) % anillo.length]!;
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

/** Recorta un poligono (puede ser concavo) con un semiplano a*x + b*y <= c (Sutherland-Hodgman). */
function recortarSemiplano(pol: readonly Punto[], a: number, b: number, c: number): Punto[] {
  const salida: Punto[] = [];
  const n = pol.length;
  for (let k = 0; k < n; k++) {
    const p = pol[k]!;
    const q = pol[(k + 1) % n]!;
    const fp = a * p[0] + b * p[1] - c;
    const fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) salida.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq);
      salida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return salida;
}

/**
 * Recorta un poligono con otro CONVEXO. Para un sujeto concavo el resultado puede llevar
 * aristas degeneradas, pero su area (con signo) es correcta, que es lo unico que se usa aqui.
 */
export function recortarConvexo(sujeto: readonly Punto[], convexo: readonly Punto[]): Punto[] {
  const ccw = areaConSigno(convexo) > 0;
  let pol: Punto[] = abrir(sujeto);
  const n = convexo.length;
  for (let k = 0; k < n && pol.length > 0; k++) {
    const p = convexo[k]!;
    const q = convexo[(k + 1) % n]!;
    // Interior a la izquierda de p->q si el convexo es antihorario.
    const ex = q[0] - p[0];
    const ey = q[1] - p[1];
    const [a, b] = ccw ? [ey, -ex] : [-ey, ex];
    pol = recortarSemiplano(pol, a, b, a * p[0] + b * p[1]);
  }
  return pol;
}

function abrir(anillo: readonly Punto[]): Punto[] {
  const a = [...anillo];
  if (a.length > 1) {
    const p = a[0]!;
    const q = a.at(-1)!;
    if (p[0] === q[0] && p[1] === q[1]) a.pop();
  }
  return a;
}

/** Area del poligono dentro del convexo, en las unidades al cuadrado de las coordenadas. */
export function areaDentro(poligono: readonly Punto[], convexo: readonly Punto[]): number {
  const r = recortarConvexo(poligono, convexo);
  return r.length < 3 ? 0 : Math.abs(areaConSigno(r));
}

function distanciaSegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** true si el punto esta dentro del poligono y a mas de `tolerancia` de su orilla. */
export function dentroEstricto(p: Punto, poligono: readonly Punto[], tolerancia: number): boolean {
  const pol = abrir(poligono);
  let dentro = false;
  for (let k = 0, m = pol.length - 1; k < pol.length; m = k++) {
    const a = pol[k]!;
    const b = pol[m]!;
    if (distanciaSegmento(p, a, b) <= tolerancia) return false;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
  }
  return dentro;
}

/** Esquinas de la celda [x0, x0 + lado] x [y0, y0 + lado], por nombre. */
export function esquinas(x0: number, y0: number, lado: number): Record<Triangulo, Punto> {
  return { SO: [x0, y0], SE: [x0 + lado, y0], NE: [x0 + lado, y0 + lado], NO: [x0, y0 + lado] };
}

/**
 * Contorno antihorario (abierto) de la forma de dibujo de la celda: el cuadrado o el
 * triangulo rectangulo con el angulo recto en la esquina que nombra.
 */
export function contornoForma(forma: FormaCelda, x0: number, y0: number, lado: number): Punto[] {
  const e = esquinas(x0, y0, lado);
  switch (forma) {
    case 'completa': return [e.SO, e.SE, e.NE, e.NO];
    case 'SO': return [e.SO, e.SE, e.NO];
    case 'SE': return [e.SO, e.SE, e.NE];
    case 'NE': return [e.SE, e.NE, e.NO];
    case 'NO': return [e.SO, e.NE, e.NO];
  }
}

/**
 * Forma de dibujo de la celda [x0, x0 + lado] x [y0, y0 + lado] frente al poligono
 * (anillo en las mismas unidades, abierto o cerrado). Ver la regla arriba.
 */
export function formaCelda(poligono: readonly Punto[], x0: number, y0: number, lado: number): FormaGeometrica {
  const cuadrado = contornoForma('completa', x0, y0, lado);
  const dentro = areaDentro(poligono, cuadrado);
  if (dentro <= lado * lado * 1e-9) return 'fuera';
  const tolerancia = lado * 1e-7;
  const e = esquinas(x0, y0, lado);
  const adentro = TRIANGULOS.filter((t) => dentroEstricto(e[t], poligono, tolerancia));
  if (adentro.length >= 2) return 'completa';
  if (adentro.length === 1) {
    // Se queda con lo que mas se parece a lo de dentro (menor diferencia simetrica): la
    // esquina de un rectangulo que llena casi toda la celda, o una celda de la orilla de la
    // caja con esquinas sobre la orilla, siguen completas.
    const t = adentro[0]!;
    const enTriangulo = areaDentro(poligono, contornoForma(t, x0, y0, lado));
    const difTriangulo = dentro + (lado * lado) / 2 - 2 * enTriangulo;
    const difCompleta = lado * lado - dentro;
    return difTriangulo < difCompleta ? t : 'completa';
  }
  let mejor: Triangulo | null = null;
  let mejorArea = 0;
  for (const t of TRIANGULOS) {
    const a = areaDentro(poligono, contornoForma(t, x0, y0, lado));
    if (a > mejorArea) [mejor, mejorArea] = [t, a];
  }
  return mejor && mejorArea >= dentro * CABE_EN_TRIANGULO ? mejor : 'completa';
}

export interface CeldaCandidata {
  /** Fila desde el sur y columna desde el oeste (contrato parcela). */
  i: number;
  j: number;
  forma: FormaCelda;
  /** Area dentro, en m2 planos locales (solo para contar; el generador mide fraccionDentro aparte). */
  areaDentro: number;
}

/**
 * Celdas de lado `lado` (origen en 0, 0) que tocan el poligono, con su forma. Recorre fila por
 * fila solo el tramo de columnas que el poligono ocupa en esa franja, para que una parcela
 * larga y diagonal no obligue a probar toda su caja envolvente.
 */
export function celdasQueTocan(poligono: readonly Punto[], lado: number, filas: number, columnas: number): CeldaCandidata[] {
  const pol = abrir(poligono);
  const salida: CeldaCandidata[] = [];
  for (let i = 0; i < filas; i++) {
    const y0 = i * lado;
    const franja = recortarSemiplano(recortarSemiplano(pol, 0, -1, -y0), 0, 1, y0 + lado);
    if (franja.length < 3) continue;
    const xs = franja.map((p) => p[0]);
    const jDesde = Math.max(0, Math.floor(Math.min(...xs) / lado));
    const jHasta = Math.min(columnas - 1, Math.ceil(Math.max(...xs) / lado) - 1);
    for (let j = jDesde; j <= jHasta; j++) {
      const x0 = j * lado;
      // La forma se decide con el poligono completo: en la franja recortada las esquinas
      // de la celda caerian sobre la orilla del recorte y contarian como fuera.
      const forma = formaCelda(pol, x0, y0, lado);
      if (forma === 'fuera') continue;
      salida.push({ i, j, forma, areaDentro: areaDentro(franja, contornoForma('completa', x0, y0, lado)) });
    }
  }
  return salida;
}
