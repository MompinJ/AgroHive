import { useEffect, useMemo, useState } from 'react';
import type { CalendarioLocal, CatalogoCultivos, Escenario, Parcela, PlanSiembra, ProximaTemporadaAproximada, SerieClima, Suelo, TablaSuelos } from '../../../contratos/tipos/contratos';
import { usarDatosParcela } from '../api/usarDatosParcela';
import { avisosDe, type AvisoDatos } from '../api/datosParcela';
import { crearClienteMotor, type ClienteMotor } from '../motor/cliente';
import type { ResultadoRanking } from '../motor/ranking';
import type { VistaProximaTemporada } from '../motor/proxima';
import { calendarioIsla, planesIniciales } from './planes';

export interface DatosLaboratorio { parcela: Parcela; serie: SerieClima; suelo: Suelo | null; catalogo: CatalogoCultivos; tabla: TablaSuelos; calendario: CalendarioLocal | null; capa: ProximaTemporadaAproximada | null; avisos: string[]; avisosDatos: AvisoDatos[] }
type Calculo = { clave: string; ranking: ResultadoRanking; proxima: VistaProximaTemporada; cliente: ClienteMotor };

export function conLimite<T>(promesa: Promise<T>, ms = 120000): Promise<T> {
  return new Promise((resolve, reject) => {
    const reloj = setTimeout(() => reject(new Error('El motor no respondió a tiempo. Reintenta el cálculo.')), ms);
    promesa.then((r) => { clearTimeout(reloj); resolve(r); }, (e: unknown) => { clearTimeout(reloj); reject(e); });
  });
}
export function useLaboratorio(parcela: Parcela | null, habilitado: boolean) {
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
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const [errorMotor, setErrorMotor] = useState('');
  const [revision, setRevision] = useState(0);
  const claveParcela = JSON.stringify(parcela ?? 'demo');
  useEffect(() => { if (habilitado) setIniciado(true); }, [habilitado]);
  useEffect(() => {
    if (!iniciado) return;
    const control = new AbortController(); let activo = true;
    setError('');
    async function cargar() {
      const [cat, tab] = await Promise.all([import('../../../datos/catalogos/cultivos.json'), import('../../../datos/catalogos/suelos.json')]);
      let siguiente: DatosLaboratorio;
      if (!parcela) {
        const [p, serie, suelo, capa] = await Promise.all([import('../escena/demo-motor'), import('../../../datos/demo/respuestas/serie-clima.json'), import('../../../datos/demo/respuestas/suelo.json'), import('../../../datos/demo/respuestas/proxima-temporada.json')]);
        const clima = serie.default as unknown as SerieClima;
        const sueloDatos = suelo.default as Suelo;
        const proxima = capa.default as ProximaTemporadaAproximada;
        siguiente = { parcela: p.parcelaConTerrenoDemo(), serie: clima, suelo: sueloDatos, capa: proxima, catalogo: cat.default as CatalogoCultivos, tabla: tab.default as TablaSuelos, calendario: calendarioIsla, avisos: ['Paquete precargado de Isla: parcela ficticia con datos climáticos y estimaciones de suelo de fuentes reales. No representa un levantamiento de campo.'], avisosDatos: avisosDe({ clima: { ok: true, datos: clima }, suelo: { ok: true, datos: sueloDatos }, cultivos: { ok: true, datos: cat.default as CatalogoCultivos }, proximaTemporada: { ok: true, datos: proxima } }) };
      } else {
        if (!datosRemotos || remotos.state !== 'ready') return;
        const respuesta = datosRemotos;
        if (!respuesta.clima.ok) throw new Error(respuesta.clima.error.motivo);
        if (!respuesta.suelo.ok) throw new Error(respuesta.suelo.error.motivo);
        if (!respuesta.cultivos.ok) throw new Error(respuesta.cultivos.error.motivo);
        siguiente = { parcela: { ...parcela, sueloId: respuesta.suelo.datos.id }, serie: respuesta.clima.datos, suelo: respuesta.suelo.datos, capa: respuesta.proximaTemporada.ok ? respuesta.proximaTemporada.datos : null, catalogo: respuesta.cultivos.datos, tabla: tab.default as TablaSuelos, calendario: null, avisos: [...remotos.avisos.map((a) => a.mensaje), 'Sin calendario local verificado para esta parcela.'], avisosDatos: remotos.avisos };
      }
      if (activo) setDatos({ clave: claveParcela, datos: siguiente });
    }
    void cargar().catch((e: unknown) => { if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.'); });
    return () => { activo = false; control.abort(); };
  }, [claveParcela, iniciado, intento, datosRemotos]);
  const actual = datos?.clave === claveParcela && (!parcela || remotos.state === 'ready') ? datos.datos : null;
  const planes = useMemo(() => actual ? planesEditados?.clave === claveParcela ? planesEditados.planes : planesIniciales(actual.parcela, actual.calendario) : [], [actual, planesEditados, claveParcela]);
  const clave = JSON.stringify([claveParcela, planes, revision, intento]);
  useEffect(() => {
    if (!actual || !planes.length) return;
    let activo = true; let cliente: ClienteMotor | undefined;
    setErrorMotor('');
    async function simular() {
      cliente = crearClienteMotor();
      const escenarios = await conLimite(cliente.escenarios(actual!.serie));
      for (const plan of planes) await conLimite(cliente.simular({ plan, parcela: actual!.parcela, suelo: actual!.suelo, catalogo: actual!.catalogo, tablaSuelos: actual!.tabla, calendario: actual!.calendario, escenarios: escenarios.escenarios, proximaTemporada: { capa: actual!.capa, serie: actual!.serie } }));
      const ranking = await conLimite(cliente.rankear(planes.map((p) => p.rotacionId)));
      const proxima = await conLimite(cliente.proxima(actual!.capa, escenarios.escenarios));
      if (activo) setCalculo({ clave, ranking, proxima, cliente });
    }
    void simular().catch((e: unknown) => { if (activo) { setErrorMotor(e instanceof Error ? e.message : 'No se pudo simular.'); cliente?.terminar(); } });
    return () => { activo = false; cliente?.terminar(); };
  }, [actual, planes, clave]);
  return { seleccion: { rotacion, setRotacion, ciclo, setCiclo, escenario, setEscenario, fechaElegida, setFecha, mostrarBanda, setMostrarBanda }, datos: actual, planes, calculo: calculo?.clave === clave && actual ? calculo : null, error: parcela && remotos.state === 'error' ? remotos.error.motivo : error || errorMotor, actualizar: (plan: PlanSiembra) => setPlanes({ clave: claveParcela, planes: planes.map((p) => p.rotacionId === plan.rotacionId ? plan : p) }), reintentar: () => { setDatos(null); remotos.reintentar(); setIntento((n) => n + 1); setRevision((n) => n + 1); } };
}
export type LaboratorioEstado = ReturnType<typeof useLaboratorio>;
