// Laboratorio por pasos: la parcela (3D o 2D) cubre la pantalla y cada paso pone sus
// paneles flotantes encima. Cultivos (brocha) -> Escenarios (tiempo y metricas) ->
// Comparacion (ranking). Los valores salen del motor; la interfaz no los recalcula.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResultadoCeldas } from '../../../../contratos/tipos/contratos';
import { conLimite, type LaboratorioEstado } from '../useLaboratorio';
import { useSerieBalance } from '../useSerieBalance';
import { fechaEnIndice, rangoDelCiclo } from '../tiempo';
import { aplicarAcomodando, colorCultivo, cultivoDeCelda, diasCultivo, fechaParaVer, nombresCultivos, pintarCeldas, rellenarCiclo, ventanaDelPlan } from '../planes';
import { EventoPantalla } from './EventoPantalla';
import { tocar } from '../sonido';
import { PanelHistorial } from './PanelHistorial';
import { usePanelPlegado } from './panelColapsable';
import { useHistorial } from './useHistorial';
import { textoProblema } from '../../escena/problemas';
import { rangosTemperatura } from '../../escena/clima-vista';
import { problemasPorCultivo } from '../../escena/problemas';
import { eventoMuerte, eventosAlAvanzar, PAUSA_EXTRA_EVENTO_MS, plantasQueMueren, type CultivoCosechado, type EventoPantalla as EventoLab, type PlagaActiva } from './eventos';
import type { PincelEscena } from '../../escena/pincel';
import { PanelCultivos } from './PanelCultivos';
import { BarraHerramientas, type Herramienta } from './BarraHerramientas';
import { celdasEnRiesgo, firmaMalla, focosDelPlan, mapaPlagas, plagasPresentes, proteger, riesgosDelPlan } from './plagas';
import { usePlagasZona, useProteccion } from './usePlagas';
import { climatologia } from './conveniencia';
import { climaDeSerie } from '../../geo/koppen';
import type { Bioma } from '../../escena/render/entorno';

/** Sin clima evaluable no se adivina la zona: entorno templado, que no sugiere un lugar concreto. */
const BIOMA_NEUTRO: Bioma = 'templado';
import { PanelEscenarios } from './PanelEscenarios';
import { PanelComparacion } from './PanelComparacion';
import { Aviso, textoMovidos } from './piezas';
import { Globo } from './Globo';
import { Mascota } from './Mascota';
import { consejos } from './consejos';
import { useEvidencia } from './useEvidencia';
import { ordenarRotaciones } from '../ordenRotaciones';
import { nombreRotacion } from '../planes';
import './lab.css';

const Escena = lazy(() => import('../../escena/EscenaParcela').then((m) => ({ default: m.EscenaParcela })));

export type PasoLab = 'cultivos' | 'escenarios' | 'comparacion';

function puedeUsarWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const contexto = document.createElement('canvas').getContext('webgl2');
    if (!contexto) return false;
    contexto.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

/** Tamano de la ventana, para centrar la parcela en el espacio que dejan libre los paneles. */
function useVentana() {
  const [v, setV] = useState(() => ({ ancho: typeof window === 'undefined' ? 1440 : window.innerWidth, alto: typeof window === 'undefined' ? 900 : window.innerHeight }));
  useEffect(() => {
    const cambio = () => setV({ ancho: window.innerWidth, alto: window.innerHeight });
    window.addEventListener('resize', cambio);
    return () => window.removeEventListener('resize', cambio);
  }, []);
  return v;
}

export function Laboratorio({ estado, paso, onAvanzar }: { estado: LaboratorioEstado; paso: PasoLab; onAvanzar: (destino: PasoLab) => void }) {
  const { rotacion, ciclo, escenario, fechaElegida, setFecha } = estado.seleccion;
  const [webglDisponible] = useState(puedeUsarWebGL);
  const [celdas, setCeldas] = useState<{ clave: string; valor: ResultadoCeldas } | null>(null);
  const [falloCeldas, setFalloCeldas] = useState<{ clave: string; motivo: string } | null>(null);
  const [intentoCeldas, setIntentoCeldas] = useState(0);
  const [herramienta, setHerramienta] = useState<Herramienta>('brocha');
  const [cultivoPincel, setCultivoPincel] = useState<string | null>(null);
  const [tamano, setTamano] = useState(1);
  const [pendientes, setPendientes] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [aviso, setAviso] = useState('');
  const [nota, setNota] = useState('');
  const [graficas, setGraficas] = useState(false);
  const [rociado, setRociado] = useState<{ celdas: string[]; clave: number } | null>(null);
  const ventana = useVentana();
  const plegado = usePanelPlegado();
  // Mismos anchos que lab.css: panel izquierdo de 372 px (336 px hasta 1180 px) y hoja inferior en movil.
  const desplazamiento = useMemo(() => {
    if (paso === 'comparacion') return { x: 0, y: 0 };
    if (ventana.ancho <= 760) return { x: 0, y: Math.round(ventana.alto * 0.22) };
    const panel = plegado ? 44 : ventana.ancho <= 1180 ? 336 : 372; // plegado: solo la pestana
    return { x: Math.round((panel + 16) / 2), y: paso === 'escenarios' ? 40 : 0 };
  }, [paso, ventana.ancho, ventana.alto, plegado]);

  const datos = estado.datos;
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const claveFecha = `${plan?.rotacionId}:${visible?.ciclo}:${visible?.siembra}`;
  // Se muestra el ciclo a ~60 % de su duracion: plantas crecidas, no recien sembradas.
  const fechaInicial = visible && datos ? fechaParaVer(visible.siembra, visible.cultivo, datos.catalogo) : visible?.siembra ?? '';
  const fecha = paso !== 'cultivos' && fechaElegida?.clave === claveFecha ? fechaElegida.fecha : fechaInicial;
  const claveCeldas = `${estado.calculo?.clave}:${plan?.rotacionId}:${escenario}:${fecha}:${intentoCeldas}`;
  const errorCeldas = falloCeldas?.clave === claveCeldas ? falloCeldas.motivo : '';
  const celdasListas = !!estado.calculo && celdas?.clave === claveCeldas;
  const serie = useSerieBalance(estado.calculo?.cliente, estado.calculo?.clave, plan?.rotacionId, escenario, paso === 'escenarios' || paso === 'cultivos' || graficas);
  const rango = useMemo(() => rangoDelCiclo(serie.datos, visible?.ciclo ?? ciclo), [serie.datos, visible?.ciclo, ciclo]);
  const cambiarFecha = useCallback((nueva: string) => setFecha({ clave: claveFecha, fecha: nueva }), [claveFecha, setFecha]);

  useEffect(() => {
    if (!estado.calculo || !plan || !fecha) return;
    let activo = true;
    const calculo = estado.calculo;
    // Agrupa el arrastre rapido: solo consulta la ultima fecha estable.
    const reloj = setTimeout(() => {
      setFalloCeldas(null);
      void conLimite(calculo.cliente.celdas(plan.rotacionId, escenario, fecha)).then((valor) => {
        if (activo) { setCeldas({ clave: claveCeldas, valor }); setFalloCeldas(null); }
      }).catch((e: unknown) => { if (activo) setFalloCeldas({ clave: claveCeldas, motivo: e instanceof Error ? e.message : 'No se pudieron consultar las celdas.' }); });
    }, 120);
    return () => { activo = false; clearTimeout(reloj); };
  }, [estado.calculo, plan, escenario, fecha, claveCeldas]);

  // Lo pintado deja de marcarse cuando el motor entrega el resultado del plan nuevo.
  useEffect(() => { if (celdasListas) setPendientes((p) => (p.size ? new Map() : p)); }, [celdasListas, claveCeldas]);
  // Los avisos de la brocha se apagan solos.
  useEffect(() => {
    if (!aviso && !nota) return;
    const t = setTimeout(() => { setAviso(''); setNota(''); }, 6000);
    return () => clearTimeout(t);
  }, [aviso, nota]);

  // La escena conserva el ultimo resultado de la misma rotacion y ciclo mientras llega el nuevo
  // (otra fecha, escenario o plan recalculado), para que no parpadee vacia; lo pintado se cubre
  // con su marca hasta que llega lo nuevo. Las cifras de los paneles solo usan el vigente.
  const ultimo = useRef<{ rotacion: string; ciclo: number; fecha: string; valor: ResultadoCeldas } | null>(null);
  if (celdasListas && plan && visible) ultimo.current = { rotacion: plan.rotacionId, ciclo: visible.ciclo, fecha, valor: celdas!.valor };
  const previo = !celdasListas && ultimo.current && ultimo.current.rotacion === plan?.rotacionId && ultimo.current.ciclo === visible?.ciclo ? ultimo.current : null;
  const resultado = celdasListas ? celdas!.valor : previo?.valor ?? null;
  const fechaEscena = previo?.fecha ?? fecha;

  const cultivoActivo = cultivoPincel ?? visible?.cultivo ?? null;
  // Plagas registradas en la zona y proteccion con insecticida (por rotacion y ciclo).
  const plagasZona = usePlagasZona(datos?.parcela.centroide ?? null, datos?.evidencia ? datos.evidencia.plagas : undefined);
  const presentes = useMemo(() => plagasPresentes(plagasZona), [plagasZona]);
  const celdasParcela = useMemo(() => datos?.parcela.celdas.map((c) => c.id) ?? [], [datos]);
  // La plaga no ataca toda la parcela: en cada grupo de celdas del mismo cultivo solo cerca del 20 % (un foco) la lleva.
  // Menos modelos cargados y una infestacion creible; es ilustrativo, el motor y el ranking no lo usan.
  const celdasIJ = useMemo(() => datos?.parcela.celdas ?? [], [datos]);
  const focos = useMemo(() => (plan ? focosDelPlan(plan, celdasIJ, presentes) : undefined), [plan, celdasIJ, presentes]);
  // La proteccion va ligada a la malla: si cambia el tamano de celda, empieza vacia en vez de apuntar a celdas ajenas.
  const claveProteccion = datos ? `${estado.claveGuardado}:${firmaMalla(celdasParcela, datos.parcela.tamanoCeldaM)}` : null;
  const [proteccion, setProteccion] = useProteccion(claveProteccion);
  // Historial de hechos (siembras, insecticida, cosecha, plaga y problemas por cultivo), guardado por parcela.
  const historial = useHistorial(datos ? estado.claveGuardado : null);
  const rociar = useCallback((ids: string[]) => {
    if (!plan || !visible || !ids.length) return;
    setProteccion(proteger(proteccion, plan.rotacionId, visible.ciclo, ids));
    setRociado({ celdas: ids, clave: Date.now() });
    tocar('rociar');
    historial.agregar({ tipo: 'insecticida', celdas: ids.length, ciclo: visible.ciclo, clave: `${plan.rotacionId}:${visible.ciclo}:insecticida` });
  }, [plan, visible, proteccion, setProteccion, historial.agregar]);
  const riesgos = useMemo(() => (plan && visible ? riesgosDelPlan(plan, celdasParcela, presentes, proteccion, focos).filter((r) => r.ciclo === visible.ciclo) : []), [plan, visible, celdasParcela, presentes, proteccion, focos]);
  const plagasEscena = useMemo(() => (resultado && plan ? mapaPlagas(resultado.registros.filter((r) => r.ciclo != null && !!focos?.(r.ciclo).has(r.celdaId)), presentes, proteccion, plan.rotacionId) : undefined), [resultado, plan, presentes, proteccion, focos]);

  // Eventos a pantalla completa (paso Escenarios): al avanzar la fecha hasta la mitad del ciclo (plaga, ilustrativa) o hasta su
  // ultimo dia (cosecha, segun el motor). Solo al avanzar: cambiar de rotacion, ciclo o escenario no dispara nada.
  const [cola, setCola] = useState<EventoLab[]>([]);
  const cultivosDelCiclo = useMemo<CultivoCosechado[]>(() => {
    if (!plan || !visible) return [];
    const n = new Map<string, number>();
    for (const id of celdasParcela) { const c = cultivoDeCelda(plan, id, visible.ciclo); if (c) n.set(c, (n.get(c) ?? 0) + 1); }
    // Cada cultivo se cosecha en su fecha: siembra mas los dias de su ciclo (catalogo); sin dato, el ultimo dia simulado.
    const diaSim = (c: string) => { const d = datos ? diasCultivo(c, datos.catalogo) : null; return d ? fechaEnIndice(visible.siembra, d) : null; };
    return [...n].sort((a, b) => b[1] - a[1]).map(([c, celdas]) => {
      const propia = diaSim(c);
      const fecha = propia && rango ? (propia > rango.hasta ? rango.hasta : propia) : propia ?? rango?.hasta ?? visible.siembra;
      return { nombre: nombresCultivos[c] ?? c, celdas, fecha };
    });
  }, [plan, visible, celdasParcela, datos, rango]);
  const plagaActiva = useMemo<PlagaActiva | null>(() => {
    const r = [...riesgos].sort((a, b) => b.sinProteger.length - a.sinProteger.length)[0];
    return r ? { plaga: r.plaga.nombreComun, cultivo: nombresCultivos[r.cultivo] ?? r.cultivo, bloques: r.sinProteger.length } : null;
  }, [riesgos]);
  // Con un aviso o una animacion en pantalla, la reproduccion espera; y unos segundos mas despues, para que se alcance a leer.
  const [retener, setRetener] = useState(false);
  useEffect(() => {
    if (cola.length > 0) { setRetener(true); return; }
    if (!retener) return;
    const t = window.setTimeout(() => setRetener(false), PAUSA_EXTRA_EVENTO_MS);
    return () => window.clearTimeout(t);
  }, [cola.length, retener]);
  const datosEvento = useRef({ cosecha: cultivosDelCiclo, plaga: plagaActiva });
  datosEvento.current = { cosecha: cultivosDelCiclo, plaga: plagaActiva };
  const fechaPrevia = useRef<{ clave: string; fecha: string } | null>(null);
  useEffect(() => {
    if (paso !== 'escenarios' || !rango || !fecha || !plan || !visible) {
      fechaPrevia.current = null;
      setCola((c) => (c.length ? [] : c));
      return;
    }
    const clave = `${plan.rotacionId}:${visible.ciclo}:${escenario}`;
    const anterior = fechaPrevia.current?.clave === clave ? fechaPrevia.current.fecha : null;
    fechaPrevia.current = { clave, fecha };
    if (anterior !== null && anterior !== fecha) tocar('semana'); // un golpecito por cada paso del tiempo
    const nuevos = eventosAlAvanzar({ anterior, actual: fecha, rango, clave, cosecha: datosEvento.current.cosecha, plaga: datosEvento.current.plaga });
    if (nuevos.length) {
      setCola((c) => [...c, ...nuevos]);
      for (const e of nuevos) historial.agregar({ tipo: e.tipo, titulo: e.titulo, detalle: e.detalle, fechaSim: e.fecha, ciclo: visible.ciclo });
    }
  }, [paso, fecha, rango, plan?.rotacionId, visible?.ciclo, escenario]);

  // Plantas que mueren: al avanzar la fecha, las celdas que pasan de viva a marchita o podrida (segun el motor) disparan la animacion.
  const estadosPrevios = useRef<{ clave: string; fecha: string; estados: Map<string, string | null> } | null>(null);
  useEffect(() => {
    if (paso !== 'escenarios' || !celdasListas || !celdas || !plan || !visible) { if (paso !== 'escenarios') estadosPrevios.current = null; return; }
    const clave = `${plan.rotacionId}:${visible.ciclo}:${escenario}`;
    const prev = estadosPrevios.current;
    const registros = celdas.valor.registros.filter((r) => r.ciclo === visible.ciclo);
    if (prev && prev.clave === clave && fecha > prev.fecha) {
      const muertas = plantasQueMueren(prev.estados, registros, (c) => nombresCultivos[c] ?? c);
      if (muertas.length) {
        const e = eventoMuerte(fecha, muertas, clave);
        setCola((c) => [...c, e]);
        historial.agregar({ tipo: 'muerte', titulo: e.titulo, detalle: e.detalle, fechaSim: fecha, ciclo: visible.ciclo });
      }
    }
    estadosPrevios.current = { clave, fecha, estados: new Map(registros.map((r) => [r.celdaId, r.estadoPlanta ?? null])) };
  }, [celdasListas, claveCeldas]);

  // Luz y temperatura (paso Escenarios): rangos de temperatura de cada cultivo (FAO EcoCrop, del catalogo) y problemas por cultivo en la fecha mostrada.
  const rangosCultivos = useMemo(() => rangosTemperatura(datos?.catalogo), [datos?.catalogo]);
  const problemasCultivos = useMemo(() => (celdasListas && celdas ? problemasPorCultivo(celdas.valor.registros) : []), [celdasListas, celdas]);

  // Un problema nuevo en un grupo de cultivo (no una vez por celda ni cada vez que se mueve la fecha) queda en el historial.
  const problemasVistos = useRef(new Set<string>());
  useEffect(() => {
    if (paso !== 'escenarios' || !plan || !visible || !celdasListas) return;
    for (const p of problemasCultivos) {
      const llave = `${estado.claveGuardado}:${plan.rotacionId}:${visible.ciclo}:${escenario}:${p.cultivo}:${p.gravedad}`;
      if (problemasVistos.current.has(llave)) continue;
      problemasVistos.current.add(llave);
      historial.agregar({ tipo: 'problema', titulo: textoProblema(p, nombresCultivos[p.cultivo] ?? p.cultivo), fechaSim: fecha, ciclo: visible.ciclo });
    }
  }, [problemasCultivos, paso, celdasListas]);

  const pincel: PincelEscena | null = useMemo(() => {
    if (paso !== 'cultivos' || herramienta === 'mover' || !plan || !visible || !datos) return null;
    if (herramienta === 'insecticida') return { tamano, color: '#7cc3ea', onTrazo: rociar };
    const cultivo = herramienta === 'goma' ? null : cultivoActivo;
    const color = cultivo ? colorCultivo(cultivo) : colorCultivo(visible.cultivo);
    return {
      tamano, color,
      onTrazo: (ids: string[]) => {
        const pintado = pintarCeldas(plan, datos.parcela, visible.ciclo, ids, cultivo, datos.calendario);
        if (JSON.stringify(pintado.porCelda) === JSON.stringify(plan.porCelda)) return;
        const r = aplicarAcomodando(pintado, datos.parcela, datos.calendario, datos.catalogo);
        if ('error' in r) { setAviso(r.error); return; }
        setAviso('');
        setNota(textoMovidos(r.movidos));
        setPendientes((p) => { const m = new Map(p); for (const id of ids) m.set(id, color); return m; });
        estado.actualizar(r.plan);
        tocar('pintar');
        historial.agregar({ tipo: 'siembra', sujeto: cultivo ? nombresCultivos[cultivo] ?? cultivo : null, celdas: ids.length, ciclo: visible.ciclo, clave: `${plan.rotacionId}:${visible.ciclo}:${cultivo ?? 'general'}` });
      },
    };
  }, [paso, herramienta, plan, visible, datos, cultivoActivo, tamano, estado, rociar, historial.agregar]);

  const sembrarTodo = plan && visible && datos && cultivoActivo && cultivoActivo !== visible.cultivo && herramienta === 'brocha' ? () => {
    const r = aplicarAcomodando(rellenarCiclo(plan, datos.parcela, visible.ciclo, cultivoActivo, datos.calendario, datos.catalogo), datos.parcela, datos.calendario, datos.catalogo);
    if ('error' in r) { setAviso(r.error); return; }
    setNota(textoMovidos(r.movidos));
    estado.actualizar(r.plan);
    setCultivoPincel(null);
    historial.agregar({ tipo: 'siembra', sujeto: nombresCultivos[cultivoActivo] ?? cultivoActivo, celdas: celdasParcela.length, ciclo: visible.ciclo, clave: `${plan.rotacionId}:${visible.ciclo}:${cultivoActivo}` });
  } : null;
  const rociarTodo = () => rociar(celdasParcela);
  const protegerRiesgo = () => rociar(celdasEnRiesgo(riesgos));

  const clima = useMemo(() => climatologia(datos?.serie), [datos?.serie]);
  // Zona climatica de Koppen-Geiger (Peel 2007): la grabada en un ejemplo o la de la serie de la parcela dibujada.
  const koppen = useMemo(() => datos?.clima ?? climaDeSerie(datos?.serie), [datos?.clima, datos?.serie]);
  const bioma = koppen.bioma;
  const dentroDeVentana = useMemo(() => (plan && datos ? ventanaDelPlan(plan, datos.calendario) : undefined), [plan, datos]);
  const fondo = !webglDisponible ? <div className="lab-sin-webgl" role="alert"><strong>Este navegador no puede dibujar la parcela en 3D (WebGL).</strong><p>Prueba con otro navegador o equipo. Las cifras del motor siguen en los paneles.</p></div>
    : datos && plan ? <Suspense fallback={<div className="lab-fondo-carga" aria-hidden="true" />}>
      <Escena modo="fondo" mascota={false} hud={paso !== 'comparacion'} parcela={datos.parcela} suelo={datos.suelo} avisosDatos={datos.avisosDatos} serieBalance={paso === 'escenarios' ? serie.datos : null} resultado={resultado} fecha={fechaEscena} pincel={pincel} marcas={pendientes} desplazamiento={desplazamiento} dentroDeVentana={dentroDeVentana} plagas={plagasEscena} tMediaDia={clima.tMediaDia} serieClima={datos.serie} serieVistas={serie.datos} rangosTemperatura={rangosCultivos} rociado={rociado} bioma={bioma ?? BIOMA_NEUTRO} />
    </Suspense> : <div className="lab-fondo-carga" aria-hidden="true" />;

  const comun = { estado, onAvanzar };
  const evidencia = useEvidencia(datos?.parcela.centroide ?? null, datos?.evidencia);
  const leguminosas = useMemo(() => new Set((datos?.catalogo.cultivos ?? []).filter((c) => c.esLeguminosa === true).map((c) => c.id)), [datos]);
  const listaConsejos = useMemo(() => consejos({
    paso, plan: plan ?? null, ciclo, calendario: datos?.calendario ?? null, escenario,
    resultado: estado.calculo?.ranking.rotaciones.find((r) => r.rotacionId === plan?.rotacionId) ?? null,
    ordenadas: ordenarRotaciones(estado.calculo?.ranking.rotaciones ?? []),
    nombreRotacion: (id) => nombreRotacion(id, estado.planes), leguminosas, ndvi: evidencia.ndvi, smap: evidencia.smap,
    bioma: koppen.estado === 'EVALUABLE' ? { nombre: `clima ${koppen.descripcion}`, tMedia: clima.tMediaAnual, lluvia: clima.lluviaAnualMm } : null,
    riesgos: riesgos.map((r) => ({ plaga: r.plaga.nombreComun, cultivo: nombresCultivos[r.cultivo] ?? r.cultivo, bloques: r.sinProteger.length })),
  }), [paso, plan, ciclo, datos, escenario, estado.calculo, estado.planes, leguminosas, evidencia, riesgos, koppen, clima]);
  return <div className={`lab lab-paso-${paso}`}>
    <Globo />
    {datos && paso !== 'comparacion' && <Mascota consejos={listaConsejos} paso={paso} />}
    <EventoPantalla evento={cola[0] ?? null} onTerminar={() => setCola((c) => c.slice(1))} />
    {datos && <PanelHistorial hechos={historial.hechos} onBorrar={historial.borrar} />}
    <div className="lab-fondo">{fondo}</div>
    {paso === 'comparacion' && <div className="lab-velo" aria-hidden="true" />}
    {paso === 'cultivos' && <PanelCultivos {...comun} herramienta={herramienta} setHerramienta={setHerramienta} cultivoActivo={cultivoActivo} setCultivoPincel={setCultivoPincel} calculando={!estado.calculo || !celdasListas} riesgos={riesgos} hayPlagas={presentes.some((p) => plan?.ciclos.some((c) => p.cultivos.includes(c.cultivo)))} onProteger={riesgos.length ? protegerRiesgo : null} presentes={presentes} />}
    {paso === 'cultivos' && datos && <BarraHerramientas herramienta={herramienta} setHerramienta={setHerramienta} tamano={tamano} setTamano={setTamano}
      onSembrarTodo={sembrarTodo} sembrarTexto={`Sembrar ${nombresCultivos[cultivoActivo ?? ''] ?? cultivoActivo ?? ''} en toda la parcela`}
      onRociarTodo={presentes.length ? rociarTodo : null} deshacer={estado.deshacer} rehacer={estado.rehacer} puedeDeshacer={estado.puedeDeshacer} puedeRehacer={estado.puedeRehacer} />}
    {paso === 'escenarios' && <PanelEscenarios {...comun} fecha={fecha} rango={rango} serie={serie} celdasListas={celdasListas} errorCeldas={errorCeldas} onFecha={cambiarFecha} claveTiempo={`${estado.calculo?.clave}:${plan?.rotacionId}:${escenario}:${visible?.ciclo}`} retener={retener} problemas={problemasCultivos} />}
    {paso === 'comparacion' && <PanelComparacion {...comun} serie={serie} setGraficas={setGraficas} hechos={historial.hechos} plagasDe={(id) => {
      const p = estado.planes.find((x) => x.rotacionId === id);
      return p ? riesgosDelPlan(p, celdasParcela, presentes, proteccion, focosDelPlan(p, celdasIJ, presentes)).map((r) => ({ ciclo: r.ciclo, plaga: r.plaga.nombreComun, cultivo: nombresCultivos[r.cultivo] ?? r.cultivo, bloques: r.sinProteger.length })) : [];
    }} />}
    {aviso && <Aviso tipo="error" className="lab-toast" onCerrar={() => setAviso('')}>{aviso}</Aviso>}
    {!aviso && nota && <Aviso tipo="info" className="lab-toast" onCerrar={() => setNota('')}>{nota}</Aviso>}
    {paso !== 'cultivos' && errorCeldas && <Aviso tipo="error" className="lab-toast" accion={{ texto: 'Reintentar', onClick: () => setIntentoCeldas((n) => n + 1) }}>{errorCeldas}</Aviso>}
  </div>;
}
