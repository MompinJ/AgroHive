import { useEffect, useMemo, useState } from 'react';
import type { CalendarioLocal, CatalogoCultivos, Escenario, Parcela, PlanSiembra, ProximaTemporadaAproximada, SerieClima, Suelo, TablaSuelos } from '../../../contratos/tipos/contratos';
import { cargarEjemplo, listarEjemplos, type DatosEjemplo } from '../demo/ejemplos';
import { usarDatosParcela } from '../api/usarDatosParcela';
import type { AvisoDatos } from '../api/datosParcela';
import { crearClienteMotor, type ClienteMotor } from '../motor/cliente';
import type { ResultadoRanking } from '../motor/ranking';
import type { VistaProximaTemporada } from '../motor/proxima';
import { claveDeParcela, planesIniciales, reconstruirPlan } from './planes';
import { useIdioma } from './i18n/Idioma';

export interface DatosLaboratorio {
  esDemo: boolean; parcela: Parcela; serie: SerieClima; suelo: Suelo | null; catalogo: CatalogoCultivos; tabla: TablaSuelos; calendario: CalendarioLocal | null; capa: ProximaTemporadaAproximada | null; avisos: string[]; avisosDatos: AvisoDatos[];
  /** Solo en una parcela de ejemplo (demo/ejemplos.ts): el lugar, la evidencia grabada (sirve sin red), el clima de Koppen y lo que no se grabo. */
  ejemplo?: DatosEjemplo['ejemplo']; evidencia?: DatosEjemplo['evidencia']; clima?: DatosEjemplo['clima']; bioma?: DatosEjemplo['bioma']; faltan?: DatosEjemplo['faltan'];
}
/** Ejemplo que se abre si no se eligio ninguno (el primero del indice). */
export const EJEMPLO_INICIAL = listarEjemplos()[0]?.id ?? '';
type Calculo = { clave: string; ranking: ResultadoRanking; proxima: VistaProximaTemporada; cliente: ClienteMotor };

/**
 * Rotaciones guardadas en el navegador (caché local), por parcela. Si el navegador no deja
 * guardar o lo guardado no sirve, se usan las rotaciones de ejemplo.
 */
const LLAVE_PLANES = 'agrohive:rotaciones:v1:';
function leerPlanes(clave: string): PlanSiembra[] | null {
  try {
    const crudo = localStorage.getItem(LLAVE_PLANES + clave);
    if (!crudo) return null;
    const planes = JSON.parse(crudo) as PlanSiembra[];
    const valido = Array.isArray(planes) && planes.length > 0 && planes.every((p) => /^R\d+$/.test(p.rotacionId) && Array.isArray(p.ciclos) && p.ciclos.length > 0);
    return valido ? planes : null;
  } catch { return null; }
}
function guardarPlanes(clave: string, planes: PlanSiembra[]) {
  try { localStorage.setItem(LLAVE_PLANES + clave, JSON.stringify(planes)); } catch { /* sin almacenamiento: queda en memoria */ }
}

/** En un ejemplo, las rotaciones de arranque salen de sus cultivos sugeridos. */
function opcionesIniciales(d: DatosLaboratorio) {
  return d.ejemplo ? { sugeridos: d.ejemplo.cultivosSugeridos, catalogo: d.catalogo } : undefined;
}
export function conLimite<T>(promesa: Promise<T>, ms = 120000): Promise<T> {
  return new Promise((resolve, reject) => {
    const reloj = setTimeout(() => reject(new Error('El motor no respondió a tiempo. Reintenta el cálculo.')), ms);
    promesa.then((r) => { clearTimeout(reloj); resolve(r); }, (e: unknown) => { clearTimeout(reloj); reject(e); });
  });
}
/** Id del suelo de una parcela cuyo lugar no tiene datos de suelo: el contrato pide un id, y el suelo en si va `null` (NO_EVALUABLE). */
export const SUELO_SIN_DATOS = 'sin-datos-de-suelo';

export function useLaboratorio(parcela: Parcela | null, habilitado: boolean, ejemploId: string = EJEMPLO_INICIAL) {
  const [rotacion, setRotacion] = useState('R1');
  const [ciclo, setCiclo] = useState(1);
  const [escenario, setEscenario] = useState<Escenario>('habitual');
  const [fechaElegida, setFecha] = useState<{ clave: string; fecha: string } | null>(null);
  const [mostrarBanda, setMostrarBanda] = useState(false);
  const [iniciado, setIniciado] = useState(habilitado);
  const remotos = usarDatosParcela(iniciado && parcela ? parcela.centroide : null);
  const datosRemotos = remotos.state === 'ready' ? remotos.datos : null;
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState<{ clave: string; datos: DatosLaboratorio } | null>(null);
  const [error, setError] = useState('');
  const [planesEditados, setPlanes] = useState<{ clave: string; planes: PlanSiembra[] } | null>(null);
  // Deshacer y rehacer cambios del plan (pintar, sembrar, fechas, ciclos, rotaciones): hasta 50 pasos.
  const [historia, setHistoria] = useState<{ clave: string; atras: PlanSiembra[][]; adelante: PlanSiembra[][] }>({ clave: '', atras: [], adelante: [] });
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const [errorMotor, setErrorMotor] = useState('');
  const [revision, setRevision] = useState(0);
  const claveParcela = JSON.stringify(parcela ?? `ejemplo:${ejemploId}`);
  useEffect(() => { if (habilitado) setIniciado(true); }, [habilitado]);
  useEffect(() => {
    if (!iniciado) return;
    const control = new AbortController(); let activo = true;
    setError('');
    async function cargar() {
      let siguiente: DatosLaboratorio;
      if (!parcela) {
        siguiente = await cargarEjemplo(ejemploId);
      } else {
        if (!datosRemotos || remotos.state !== 'ready') return;
        const tab = await import('../../../datos/catalogos/suelos.json');
        const respuesta = datosRemotos;
        if (!respuesta.clima.ok) throw new Error(respuesta.clima.error.motivo);
        if (!respuesta.cultivos.ok) throw new Error(respuesta.cultivos.error.motivo);
        siguiente = { esDemo: false, parcela: { ...parcela, sueloId: respuesta.suelo.ok ? respuesta.suelo.datos.id : SUELO_SIN_DATOS }, serie: respuesta.clima.datos, suelo: respuesta.suelo.ok ? respuesta.suelo.datos : null, capa: respuesta.proximaTemporada.ok ? respuesta.proximaTemporada.datos : null, catalogo: respuesta.cultivos.datos, tabla: tab.default as TablaSuelos, calendario: respuesta.calendario?.ok ? respuesta.calendario.datos : null, avisos: [...remotos.avisos.map((a) => a.mensaje), ...(respuesta.calendario?.ok ? [] : ['Sin calendario local verificado para esta parcela.'])], avisosDatos: remotos.avisos };
      }
      if (activo) setDatos({ clave: claveParcela, datos: siguiente });
    }
    void cargar().catch((e: unknown) => { if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.'); });
    return () => { activo = false; control.abort(); };
  }, [claveParcela, iniciado, intento, datosRemotos]);
  const actual = datos?.clave === claveParcela && (!parcela || remotos.state === 'ready') ? datos.datos : null;
  // Cada parcela guarda lo suyo: la demo por su id; una propia por su centro y su cuadricula
  // (todas las parcelas dibujadas tienen el mismo id).
  const claveGuardado = actual ? claveDeParcela(actual.parcela, actual.esDemo) : 'demo';
  const planes = useMemo(() => {
    if (!actual) return [];
    if (planesEditados?.clave === claveParcela) return planesEditados.planes;
    // Lo guardado se rearma contra la parcela y el calendario de ahora.
    const guardados = leerPlanes(claveGuardado)?.filter((p) => p.parcelaId === actual.parcela.id).map((p) => reconstruirPlan(p, actual.parcela, actual.calendario));
    return guardados?.length ? guardados : planesIniciales(actual.parcela, actual.calendario, opcionesIniciales(actual));
  }, [actual, planesEditados, claveParcela, claveGuardado]);
  const aplicarPlanes = (lista: PlanSiembra[]) => { guardarPlanes(claveGuardado, lista); setPlanes({ clave: claveParcela, planes: lista }); };
  const pila = historia.clave === claveParcela ? historia : { clave: claveParcela, atras: [], adelante: [] };
  const fijarPlanes = (lista: PlanSiembra[]) => {
    setHistoria({ clave: claveParcela, atras: [...pila.atras, planes].slice(-50), adelante: [] });
    aplicarPlanes(lista);
  };
  const volverA = (lista: PlanSiembra[]) => {
    aplicarPlanes(lista);
    if (!lista.some((p) => p.rotacionId === rotacion)) { setRotacion(lista[0]!.rotacionId); setCiclo(1); }
  };
  const deshacer = () => {
    const previo = pila.atras.at(-1);
    if (!previo) return;
    setHistoria({ clave: claveParcela, atras: pila.atras.slice(0, -1), adelante: [planes, ...pila.adelante] });
    volverA(previo);
  };
  const rehacer = () => {
    const siguiente = pila.adelante[0];
    if (!siguiente) return;
    setHistoria({ clave: claveParcela, atras: [...pila.atras, planes], adelante: pila.adelante.slice(1) });
    volverA(siguiente);
  };
  const { idioma } = useIdioma();
  // B7: el idioma entra a la clave para que las tarjetas del motor se rehagan al cambiarlo (docs/05, paso 8).
  const clave = JSON.stringify([claveParcela, planes, revision, intento, idioma]);
  useEffect(() => {
    if (!actual || !planes.length) return;
    let activo = true; let cliente: ClienteMotor | undefined;
    setErrorMotor('');
    async function simular() {
      cliente = crearClienteMotor();
      const escenarios = await conLimite(cliente.escenarios(actual!.serie));
      for (const plan of planes) await conLimite(cliente.simular({ plan, parcela: actual!.parcela, suelo: actual!.suelo, catalogo: actual!.catalogo, tablaSuelos: actual!.tabla, calendario: actual!.calendario, escenarios: escenarios.escenarios, proximaTemporada: { capa: actual!.capa, serie: actual!.serie } }));
      const ranking = await conLimite(cliente.rankear(planes.map((p) => p.rotacionId), undefined, idioma));
      const proxima = await conLimite(cliente.proxima(actual!.capa, escenarios.escenarios));
      if (activo) setCalculo({ clave, ranking, proxima, cliente });
    }
    void simular().catch((e: unknown) => { if (activo) { setErrorMotor(e instanceof Error ? e.message : 'No se pudo simular.'); cliente?.terminar(); } });
    return () => { activo = false; cliente?.terminar(); };
  }, [actual, planes, clave, idioma]);
  return { seleccion: { rotacion, setRotacion, ciclo, setCiclo, escenario, setEscenario, fechaElegida, setFecha, mostrarBanda, setMostrarBanda }, datos: actual, planes, calculo: calculo?.clave === clave && actual ? calculo : null, error: parcela && remotos.state === 'error' ? remotos.error.motivo : error || errorMotor, actualizar: (plan: PlanSiembra) => fijarPlanes(planes.map((p) => p.rotacionId === plan.rotacionId ? plan : p)),
    claveGuardado, deshacer, rehacer, puedeDeshacer: pila.atras.length > 0, puedeRehacer: pila.adelante.length > 0,
    agregarRotacion: (plan: PlanSiembra) => { fijarPlanes([...planes, plan]); setRotacion(plan.rotacionId); setCiclo(1); },
    quitarRotacion: (id: string) => {
      if (planes.length <= 1) return;
      const resto = planes.filter((p) => p.rotacionId !== id);
      fijarPlanes(resto);
      if (rotacion === id) { setRotacion(resto[0]!.rotacionId); setCiclo(1); }
    },
    restablecerRotaciones: () => { if (actual) fijarPlanes(planesIniciales(actual.parcela, actual.calendario, opcionesIniciales(actual))); setRotacion('R1'); setCiclo(1); }, reintentar: () => { setDatos(null); remotos.reintentar(); setIntento((n) => n + 1); setRevision((n) => n + 1); } };
}
export type LaboratorioEstado = ReturnType<typeof useLaboratorio>;
