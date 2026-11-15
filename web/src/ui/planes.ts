import type { CalendarioLocal, CatalogoCultivos, Ciclo, Fuente, Parcela, PlanSiembra } from '../../../contratos/tipos/contratos';
import { parametrosCultivo } from '../motor/cultivo';
import version from '../../../contratos/package.json';
import { dentroDeVentana } from '../motor/pilares';

/** Nombres con acentos: una sola fuente, la de la escena (ficha.ts). */
import { NOMBRES_CULTIVO_ESCENA } from '../escena/ficha';
export const nombresCultivos: Record<string, string> = NOMBRES_CULTIVO_ESCENA;
/** Colores por cultivo: los define la escena (base de los bloques y brocha). */
export { COLORES_CULTIVO as coloresCultivo, colorCultivo } from '../escena/vistas';
export function referenciaSiembra(cultivo: string, temporada: Ciclo['temporada'], calendario: CalendarioLocal | null) {
  return calendario?.entradas.find((e) => e.cultivo === cultivo && e.temporada === temporada && e.regimen === 'temporal');
}
/** Nombre del lugar del calendario para el texto: municipio (Mexico), si no la region o el pais en espanol. */
export function lugarDelCalendario(calendario: CalendarioLocal): string {
  const u = calendario.ubicacion;
  if (u.municipio) return u.estado ? `${u.municipio}, ${u.estado}` : u.municipio;
  // La region de GGCMI es una celda ("celda GGCMI 20.25,-101.25"): no es un nombre para mostrar.
  if (u.region && !/^celda\b/i.test(u.region)) return u.region;
  let pais = u.pais;
  try { if (u.paisIso) pais = new Intl.DisplayNames(['es'], { type: 'region' }).of(u.paisIso) ?? u.pais; } catch { /* sin Intl: nombre del contrato */ }
  return pais ? `esta zona de ${pais}` : 'esta zona';
}
export function explicarFecha(c: Pick<Ciclo, 'cultivo' | 'temporada'>, calendario: CalendarioLocal | null): { texto: string; fuente?: Fuente } {
  const e = referenciaSiembra(c.cultivo, c.temporada, calendario);
  if (!e || e.ventana.estado !== 'EVALUABLE') return { texto: 'Sin calendario local con ventana evaluable para este cultivo y temporada.' };
  const v = e.ventana;
  return { texto: `Referencia para ${lugarDelCalendario(calendario!)}, ${c.temporada}: ${v.desdeDia ?? 1}/${v.desdeMes} a ${v.hastaDia ?? 'fin'}/${v.hastaMes}. Requiere validación local.`, fuente: v.fuente };
}
export function armarPlan(id: string, parcela: Parcela, ciclos: Ciclo[], calendario: CalendarioLocal | null, porCelda: PlanSiembra['porCelda'] = null): PlanSiembra {
  return {
    meta: { versionContrato: version.version, esEjemplo: false }, rotacionId: id, parcelaId: parcela.id,
    asignacionClima: 'temporada_tipica', porCelda: porCelda && Object.keys(porCelda).length ? porCelda : null,
    calendarioLocal: calendario ? { calendarioId: calendario.id } : { sinCalendarioLocal: true, motivo: 'No hay calendario verificado para el municipio de esta parcela.' },
    ciclos: ciclos.map((c) => {
      const ventana = referenciaSiembra(c.cultivo, c.temporada, calendario)?.ventana;
      const inicio = ventana?.estado === 'EVALUABLE' ? inicioDeVentana(ventana, Number(c.siembra.slice(0, 4))) : null;
      const origen = inicio === c.siembra ? 'Inicio de la ventana del calendario local.' : 'Fecha elegida en el selector.';
      return { ...c, porQue: `${origen} ${explicarFecha(c, calendario).texto}`, dentroDeVentana: ventana?.estado === 'EVALUABLE' ? dentroDeVentana(c.siembra, ventana) : null };
    }) as PlanSiembra['ciclos'],
  };
}
/** Rotaciones de arranque. Con los cultivos sugeridos de un ejemplo, salen de esos cultivos y de las ventanas del calendario del lugar. */
export function planesIniciales(parcela: Parcela, calendario: CalendarioLocal | null, opciones?: { sugeridos: readonly string[]; catalogo: CatalogoCultivos }): PlanSiembra[] {
  const deEjemplo = opciones && opciones.sugeridos.length ? planesDeSugeridos(parcela, calendario, opciones.sugeridos, opciones.catalogo) : null;
  if (deEjemplo?.length) return deEjemplo;
  const definiciones: Record<string, [string, string, Ciclo['temporada']][]> = {
    R1: [['maiz', '2026-06-15', 'PV'], ['frijol', '2026-11-01', 'OI'], ['maiz', '2027-06-15', 'PV']],
    R2: [['maiz', '2026-06-15', 'PV'], ['maiz', '2027-06-15', 'PV']],
    R3: [['maiz', '2026-06-01', 'PV'], ['frijol', '2026-10-10', 'OI'], ['maiz', '2027-06-01', 'PV']],
  };
  return Object.entries(definiciones).map(([id, lista]) => armarPlan(id, parcela, lista.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Plan de demostración editable, no recomendación.' })), calendario));
}

/**
 * Primera fecha desde `desde` que cae en una ventana de siembra de temporal del cultivo (si `desde` ya esta dentro,
 * `desde`). Sin ventana en el calendario, `desde` con la temporada que le toca por mes.
 */
export function fechaEnVentana(cultivo: string, desde: string, calendario: CalendarioLocal | null): { fecha: string; temporada: Ciclo['temporada']; enVentana: boolean } {
  const anio0 = Number(desde.slice(0, 4));
  let mejor: { fecha: string; temporada: Ciclo['temporada'] } | null = null;
  for (const e of calendario?.entradas ?? []) {
    if (e.cultivo !== cultivo || e.regimen !== 'temporal' || e.ventana.estado !== 'EVALUABLE') continue;
    const v = e.ventana;
    for (let anio = anio0 - 1; anio <= anio0 + 2; anio++) {
      const inicio = inicioDeVentana(v, anio);
      const cruza = v.hastaMes < v.desdeMes || (v.hastaMes === v.desdeMes && (v.hastaDia ?? 31) < (v.desdeDia ?? 1));
      const anioFin = cruza ? anio + 1 : anio;
      const fin = v.hastaDia ? `${anioFin}-${dos(v.hastaMes)}-${dos(v.hastaDia)}` : deDia(aDia(`${v.hastaMes === 12 ? anioFin + 1 : anioFin}-${dos(v.hastaMes === 12 ? 1 : v.hastaMes + 1)}-01`) - 1);
      const candidata = desde >= inicio && desde <= fin ? desde : inicio >= desde ? inicio : null;
      if (candidata && (!mejor || candidata < mejor.fecha)) mejor = { fecha: candidata, temporada: e.temporada };
    }
  }
  return mejor ? { ...mejor, enVentana: true } : { fecha: desde, temporada: temporadaDeFecha(desde), enVentana: false };
}

const POR_QUE_EJEMPLO = 'Ejemplo editable con cultivos de la región, no recomendación.';
function planesDeSugeridos(parcela: Parcela, calendario: CalendarioLocal | null, sugeridos: readonly string[], catalogo: CatalogoCultivos): PlanSiembra[] {
  const enCatalogo = sugeridos.filter((c) => catalogo.cultivos.some((x) => x.id === c));
  const [a, b] = enCatalogo;
  if (!a) return [];
  const leguminosa = (id: string) => catalogo.cultivos.find((x) => x.id === id)?.esLeguminosa === true;
  const tercero = enCatalogo.find((c) => c !== a && c !== b && leguminosa(c)) ?? enCatalogo.find((c) => c !== a && c !== b);
  const secuencia = (lista: string[]): Ciclo[] => {
    const ciclos: Ciclo[] = [];
    let desde = '2026-01-01';
    lista.forEach((cultivo, i) => {
      const f = fechaEnVentana(cultivo, desde, calendario);
      ciclos.push({ ciclo: i + 1, cultivo, siembra: f.fecha, temporada: f.temporada, porQue: POR_QUE_EJEMPLO });
      desde = deDia(aDia(f.fecha) + (diasCultivo(cultivo, catalogo) ?? 120) + 1);
    });
    return ciclos;
  };
  const listas: string[][] = [b ? [a, b, a] : [a, a, a], [a, a]];
  if (b && tercero) listas.push([a, tercero, a]);
  return listas.map((lista, i) => armarPlan(`R${i + 1}`, parcela, secuencia(lista), calendario));
}

const dos = (n: number) => String(n).padStart(2, '0');
const DIA_MS = 86400000;
const aDia = (fecha: string) => Math.round(Date.parse(`${fecha}T00:00:00Z`) / DIA_MS);
const deDia = (dia: number) => new Date(dia * DIA_MS).toISOString().slice(0, 10);

export function inicioDeVentana(v: { desdeMes: number; desdeDia?: number }, anio: number): string {
  return `${anio}-${dos(v.desdeMes)}-${dos(v.desdeDia ?? 1)}`;
}

/**
 * Temporada agricola del SIAP segun el mes de siembra: primavera-verano (PV) de abril a
 * septiembre y otono-invierno (OI) de octubre a marzo. Asi el usuario no tiene que elegirla.
 */
export function temporadaDeFecha(fecha: string): Ciclo['temporada'] {
  const mes = Number(fecha.slice(5, 7));
  return mes >= 4 && mes <= 9 ? 'PV' : 'OI';
}

/** Dias del ciclo del cultivo segun el motor (suma de etapas FAO-56); null si no es evaluable. */
export function diasCultivo(cultivo: string, catalogo: CatalogoCultivos): number | null {
  const c = catalogo.cultivos.find((x) => x.id === cultivo);
  if (!c) return null;
  const r = parametrosCultivo(c);
  return r.ok ? r.parametros.totalDias : null;
}

/** Cultivos que siembra el plan en un ciclo: el general mas los pintados por celda. */
export function cultivosDelCiclo(plan: PlanSiembra, ciclo: number): string[] {
  const general = plan.ciclos.find((c) => c.ciclo === ciclo)?.cultivo;
  const pintados = Object.values(plan.porCelda ?? {}).flatMap((l) => l.filter((x) => x.ciclo === ciclo).map((x) => x.cultivo));
  return [...new Set([...(general ? [general] : []), ...pintados])];
}

/** Celdas pintadas por cultivo en un ciclo (sin contar las que siguen al cultivo general). */
export function conteoPintado(plan: PlanSiembra, ciclo: number): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const lista of Object.values(plan.porCelda ?? {})) {
    const x = lista.find((r) => r.ciclo === ciclo);
    if (x) conteo.set(x.cultivo, (conteo.get(x.cultivo) ?? 0) + 1);
  }
  return conteo;
}

/** Cultivo que tiene una celda en un ciclo (el pintado o, si no, el general). */
export function cultivoDeCelda(plan: PlanSiembra, celdaId: string, ciclo: number): string | undefined {
  return plan.porCelda?.[celdaId]?.find((x) => x.ciclo === ciclo)?.cultivo ?? plan.ciclos.find((c) => c.ciclo === ciclo)?.cultivo;
}

/**
 * Lo que el motor rechazaria (motor.ts, validarPlan): ciclos fuera de orden o un cultivo que
 * no termina antes de la siembra del ciclo siguiente. Se revisa antes de enviar el plan para
 * no perder el calculo de todas las rotaciones por un trazo.
 */
export function conflictosPlan(plan: PlanSiembra, catalogo: CatalogoCultivos): string[] {
  const ciclos = [...plan.ciclos].sort((a, b) => a.ciclo - b.ciclo);
  const errores: string[] = [];
  for (let k = 1; k < ciclos.length; k++) {
    const a = ciclos[k - 1]!;
    const b = ciclos[k]!;
    if (aDia(b.siembra) <= aDia(a.siembra)) {
      errores.push(`La siembra del ciclo ${b.ciclo} debe ser posterior a la del ciclo ${a.ciclo}.`);
      continue;
    }
    for (const cultivo of cultivosDelCiclo(plan, a.ciclo)) {
      const dias = diasCultivo(cultivo, catalogo);
      if (dias != null && aDia(a.siembra) + dias > aDia(b.siembra)) {
        errores.push(`${nombresCultivos[cultivo] ?? cultivo} del ciclo ${a.ciclo} dura ${dias} días y termina el ${deDia(aDia(a.siembra) + dias)}, después de la siembra del ciclo ${b.ciclo} (${b.siembra}).`);
      }
    }
  }
  return errores;
}

/**
 * Cambia el cultivo general de un ciclo y quita lo pintado en ese ciclo. La fecha sale del
 * calendario local (inicio de su ventana en la temporada del ciclo) si existe y no choca con
 * los otros ciclos; si no, se conserva la fecha del plan. La temporada se deduce de la fecha.
 */
export function rellenarCiclo(plan: PlanSiembra, parcela: Parcela, ciclo: number, cultivo: string, calendario: CalendarioLocal | null, catalogo: CatalogoCultivos): PlanSiembra {
  const actual = plan.ciclos.find((c) => c.ciclo === ciclo);
  if (!actual) return plan;
  const porCelda = limpiarCiclo(plan.porCelda, ciclo);
  const armar = (siembra: string) => armarPlan(plan.rotacionId, parcela, plan.ciclos.map((c) => c.ciclo === ciclo ? { ...c, cultivo, siembra, temporada: temporadaDeFecha(siembra) } : c), calendario, porCelda);
  for (const siembra of candidatasSiembra(cultivo, actual.siembra, calendario)) {
    const nuevo = armar(siembra);
    if (!conflictosPlan(nuevo, catalogo).length) return nuevo;
  }
  return armar(actual.siembra);
}

/** Fechas candidatas: inicio de la ventana local (en el anio mas cercano a la fecha actual) y la fecha actual. */
function candidatasSiembra(cultivo: string, actual: string, calendario: CalendarioLocal | null): string[] {
  const temporada = temporadaDeFecha(actual);
  const entradas = (calendario?.entradas ?? []).filter((e) => e.cultivo === cultivo && e.regimen === 'temporal' && e.ventana.estado === 'EVALUABLE');
  const entrada = entradas.find((e) => e.temporada === temporada) ?? entradas[0];
  const fechas: string[] = [];
  if (entrada && entrada.ventana.estado === 'EVALUABLE') {
    const v = entrada.ventana;
    const anio = Number(actual.slice(0, 4));
    const opciones = [anio - 1, anio, anio + 1].map((a) => inicioDeVentana(v, a)).sort((x, y) => Math.abs(aDia(x) - aDia(actual)) - Math.abs(aDia(y) - aDia(actual)));
    fechas.push(opciones[0]!);
  }
  fechas.push(actual);
  return fechas;
}

function limpiarCiclo(porCelda: PlanSiembra['porCelda'], ciclo: number): PlanSiembra['porCelda'] {
  if (!porCelda) return null;
  const salida: NonNullable<PlanSiembra['porCelda']> = {};
  for (const [celda, lista] of Object.entries(porCelda)) {
    const resto = lista.filter((x) => x.ciclo !== ciclo);
    if (resto.length) salida[celda] = resto as typeof lista;
  }
  return Object.keys(salida).length ? salida : null;
}

/**
 * Brocha: asigna `cultivo` a las celdas en un ciclo (porCelda). Pintar con el cultivo general
 * o con la goma (cultivo null) devuelve la celda al cultivo general del ciclo.
 */
export function pintarCeldas(plan: PlanSiembra, parcela: Parcela, ciclo: number, celdas: readonly string[], cultivo: string | null, calendario: CalendarioLocal | null): PlanSiembra {
  const general = plan.ciclos.find((c) => c.ciclo === ciclo)?.cultivo;
  if (!general) return plan;
  const validas = new Set(parcela.celdas.map((c) => c.id));
  const salida: NonNullable<PlanSiembra['porCelda']> = { ...(plan.porCelda ?? {}) };
  for (const celda of celdas) {
    if (!validas.has(celda)) continue;
    const resto = (salida[celda] ?? []).filter((x) => x.ciclo !== ciclo);
    const lista = cultivo && cultivo !== general ? [...resto, { ciclo, cultivo }].sort((a, b) => a.ciclo - b.ciclo) : resto;
    if (lista.length) salida[celda] = lista as NonNullable<PlanSiembra['porCelda']>[string];
    else delete salida[celda];
  }
  return armarPlan(plan.rotacionId, parcela, plan.ciclos, calendario, salida);
}

/** Cambia la fecha de siembra de un ciclo; la temporada se deduce de la fecha. */
export function cambiarSiembra(plan: PlanSiembra, parcela: Parcela, ciclo: number, siembra: string, calendario: CalendarioLocal | null): PlanSiembra {
  return armarPlan(plan.rotacionId, parcela, plan.ciclos.map((c) => c.ciclo === ciclo ? { ...c, siembra, temporada: temporadaDeFecha(siembra) } : c), calendario, plan.porCelda);
}

/**
 * Ventana local por cultivo y ciclo, para la vista de validacion: usa la fecha del ciclo del
 * plan (los cultivos pintados comparten la fecha de su ciclo) y la misma regla que el motor.
 */
export function ventanaDelPlan(plan: PlanSiembra, calendario: CalendarioLocal | null) {
  return (cultivo: string, ciclo: number): boolean | null => {
    const c = plan.ciclos.find((x) => x.ciclo === ciclo);
    const v = c ? referenciaSiembra(cultivo, c.temporada, calendario)?.ventana : undefined;
    return c && v?.estado === 'EVALUABLE' ? dentroDeVentana(c.siembra, v) : null;
  };
}

/** Fecha a mitad del ciclo: en el paso de cultivos se ven las plantas crecidas, no recien sembradas. */
export function fechaParaVer(siembra: string, cultivo: string, catalogo: CatalogoCultivos): string {
  const dias = diasCultivo(cultivo, catalogo);
  return dias ? deDia(aDia(siembra) + Math.round(dias * 0.6)) : siembra;
}

/**
 * Grupos de la paleta (solo para ordenar la interfaz, no es un dato agronomico del catalogo).
 * Las leguminosas salen del campo esLeguminosa del catalogo; lo que no esta en la lista va en "Otros".
 */
const GRUPOS_PALETA: [string, string[]][] = [
  ['Cereales', ['maiz', 'maiz_dulce', 'sorgo', 'trigo', 'cebada', 'avena']],
  ['Cucurbitáceas', ['calabaza', 'calabacita', 'sandia', 'melon', 'pepino']],
  ['Raíces y tubérculos', ['camote', 'yuca', 'papa', 'zanahoria', 'rabano', 'betabel']],
  ['Hortalizas', ['chile', 'tomate', 'cebolla', 'lechuga', 'berenjena', 'brocoli', 'col', 'coliflor', 'espinaca']],
  ['Industriales y oleaginosas', ['cana', 'ajonjoli', 'girasol', 'algodon', 'cartamo', 'higuerilla']],
];
export function agruparCultivos<T extends { id: string; esLeguminosa?: boolean | null }>(cultivos: readonly T[]): { nombre: string; cultivos: T[] }[] {
  const leguminosas = cultivos.filter((c) => c.esLeguminosa === true);
  const resto = cultivos.filter((c) => c.esLeguminosa !== true);
  const grupos = [
    { nombre: 'Cereales', cultivos: resto.filter((c) => GRUPOS_PALETA[0]![1].includes(c.id)) },
    { nombre: 'Leguminosas', cultivos: leguminosas },
    ...GRUPOS_PALETA.slice(1).map(([nombre, ids]) => ({ nombre, cultivos: resto.filter((c) => ids.includes(c.id)) })),
  ];
  const agrupados = new Set(grupos.flatMap((g) => g.cultivos.map((c) => c.id)));
  grupos.push({ nombre: 'Otros', cultivos: resto.filter((c) => !agrupados.has(c.id)) });
  return grupos.filter((g) => g.cultivos.length > 0);
}

/** Nombre visible de una rotacion: su lugar en la lista ("Rotacion 1", "Rotacion 2"...). */
export function nombreRotacion(id: string, planes: readonly Pick<PlanSiembra, 'rotacionId'>[]): string {
  const i = planes.findIndex((p) => p.rotacionId === id);
  return `Rotación ${i >= 0 ? i + 1 : id.replace(/^R/, '')}`;
}

/** Rotacion nueva: copia de la elegida con el siguiente id libre (R1, R2...). */
export function nuevaRotacion(base: PlanSiembra, planes: readonly PlanSiembra[], parcela: Parcela, calendario: CalendarioLocal | null): PlanSiembra {
  const siguiente = Math.max(0, ...planes.map((p) => Number(p.rotacionId.slice(1)) || 0)) + 1;
  return armarPlan(`R${siguiente}`, parcela, base.ciclos, calendario, base.porCelda);
}

/**
 * Agrega un ciclo al final: alterna con el cultivo de dos ciclos atras (o repite el ultimo) y
 * se siembra al terminar el ciclo anterior, en el inicio de la ventana local si la hay despues.
 */
export function agregarCiclo(plan: PlanSiembra, parcela: Parcela, calendario: CalendarioLocal | null, catalogo: CatalogoCultivos): PlanSiembra {
  const ciclos = [...plan.ciclos].sort((a, b) => a.ciclo - b.ciclo);
  const ultimo = ciclos[ciclos.length - 1]!;
  const cultivo = ciclos[ciclos.length - 2]?.cultivo ?? ultimo.cultivo;
  const dias = Math.max(1, ...cultivosDelCiclo(plan, ultimo.ciclo).map((c) => diasCultivo(c, catalogo) ?? 0));
  const libre = aDia(ultimo.siembra) + dias + 1;
  // Si el dia libre ya cae en una ventana local, se siembra ahi; si la siguiente ventana empieza
  // pronto (90 dias o menos), se espera a ella; si no, se siembra al quedar libre la parcela.
  const ventanas = (calendario?.entradas ?? []).flatMap((e) => (e.cultivo === cultivo && e.regimen === 'temporal' && e.ventana.estado === 'EVALUABLE' ? [e.ventana] : []));
  const fechaLibre = deDia(libre);
  const anio = Number(fechaLibre.slice(0, 4));
  const proxima = ventanas.flatMap((v) => [anio, anio + 1].map((a) => inicioDeVentana(v, a))).filter((f) => aDia(f) >= libre).sort()[0];
  const siembra = ventanas.some((v) => dentroDeVentana(fechaLibre, v)) ? fechaLibre
    : proxima && aDia(proxima) - libre <= 90 ? proxima : fechaLibre;
  const nuevo: Ciclo = { ciclo: ultimo.ciclo + 1, cultivo, siembra, temporada: temporadaDeFecha(siembra), porQue: 'Ciclo agregado en el selector.' };
  return armarPlan(plan.rotacionId, parcela, [...ciclos, nuevo], calendario, plan.porCelda);
}

/** Quita un ciclo (queda al menos uno) y renumera los siguientes, tambien en lo pintado. */
export function quitarCiclo(plan: PlanSiembra, parcela: Parcela, ciclo: number, calendario: CalendarioLocal | null): PlanSiembra {
  if (plan.ciclos.length <= 1) return plan;
  const ciclos = plan.ciclos.filter((c) => c.ciclo !== ciclo).map((c) => (c.ciclo > ciclo ? { ...c, ciclo: c.ciclo - 1 } : c));
  let porCelda: PlanSiembra['porCelda'] = null;
  if (plan.porCelda) {
    const salida: NonNullable<PlanSiembra['porCelda']> = {};
    for (const [celda, lista] of Object.entries(plan.porCelda)) {
      const resto = lista.filter((x) => x.ciclo !== ciclo).map((x) => (x.ciclo > ciclo ? { ...x, ciclo: x.ciclo - 1 } : x));
      if (resto.length) salida[celda] = resto as typeof lista;
    }
    porCelda = salida;
  }
  return armarPlan(plan.rotacionId, parcela, ciclos, calendario, porCelda);
}

/**
 * Rearma una rotacion guardada contra la parcela y el calendario de ahora: recalcula el
 * calendario citado, los motivos, la ventana y la temporada, y quita lo pintado en celdas que
 * ya no existen o en ciclos que ya no estan. Asi un guardado viejo (otra parcela u otro
 * calendario) no llega al motor con referencias que no corresponden.
 */
export function reconstruirPlan(plan: PlanSiembra, parcela: Parcela, calendario: CalendarioLocal | null): PlanSiembra {
  const celdas = new Set(parcela.celdas.map((c) => c.id));
  const ciclos = new Set(plan.ciclos.map((c) => c.ciclo));
  let porCelda: PlanSiembra['porCelda'] = null;
  if (plan.porCelda) {
    const salida: NonNullable<PlanSiembra['porCelda']> = {};
    for (const [celda, lista] of Object.entries(plan.porCelda)) {
      const validos = celdas.has(celda) ? lista.filter((x) => ciclos.has(x.ciclo)) : [];
      if (validos.length) salida[celda] = validos as typeof lista;
    }
    porCelda = salida;
  }
  return armarPlan(plan.rotacionId, parcela, plan.ciclos.map((c) => ({ ...c, temporada: temporadaDeFecha(c.siembra) })), calendario, porCelda);
}

/** Llave del guardado local: la demo por su id; una parcela propia por su centro y su cuadricula. */
export function claveDeParcela(parcela: Parcela, esDemo: boolean): string {
  if (esDemo) return parcela.id;
  const [lon, lat] = parcela.centroide;
  return `${parcela.id}@${lon.toFixed(5)},${lat.toFixed(5)}#${parcela.celdas.length}`;
}

/**
 * Corre hacia adelante los ciclos que se enciman con el anterior: cada uno empieza, como pronto,
 * el dia siguiente a que termina el ciclo previo (su cultivo mas largo, contando lo pintado).
 * Devuelve el plan rearmado y que ciclos se movieron. No mueve nada hacia atras.
 */
export function acomodarCiclos(plan: PlanSiembra, parcela: Parcela, calendario: CalendarioLocal | null, catalogo: CatalogoCultivos): { plan: PlanSiembra; movidos: { ciclo: number; antes: string; despues: string }[] } {
  const ciclos = [...plan.ciclos].sort((a, b) => a.ciclo - b.ciclo).map((c) => ({ ...c }));
  const movidos: { ciclo: number; antes: string; despues: string }[] = [];
  for (let k = 1; k < ciclos.length; k++) {
    const previo = ciclos[k - 1]!;
    const dias = Math.max(1, ...cultivosDelCiclo(plan, previo.ciclo).map((c) => diasCultivo(c, catalogo) ?? 0));
    const libre = aDia(previo.siembra) + dias + 1;
    const actual = ciclos[k]!;
    if (aDia(actual.siembra) < libre) {
      const despues = deDia(libre);
      movidos.push({ ciclo: actual.ciclo, antes: actual.siembra, despues });
      actual.siembra = despues;
      actual.temporada = temporadaDeFecha(despues);
    }
  }
  return { plan: movidos.length ? armarPlan(plan.rotacionId, parcela, ciclos, calendario, plan.porCelda) : plan, movidos };
}

/** Aplica un cambio: si se encima con otros ciclos, los acomoda; si ni asi se puede, devuelve el motivo. */
export function aplicarAcomodando(nuevo: PlanSiembra, parcela: Parcela, calendario: CalendarioLocal | null, catalogo: CatalogoCultivos):
  { plan: PlanSiembra; movidos: { ciclo: number; antes: string; despues: string }[] } | { error: string } {
  const conflictos = conflictosPlan(nuevo, catalogo);
  if (!conflictos.length) return { plan: nuevo, movidos: [] };
  const r = acomodarCiclos(nuevo, parcela, calendario, catalogo);
  return conflictosPlan(r.plan, catalogo).length ? { error: conflictos[0]! } : r;
}

/** Ciclo mas largo que el motor puede evaluar con un anio de clima de escenario (la serie llega a marzo del anio siguiente). */
export const DIAS_MAX_CLIMA = 290;
