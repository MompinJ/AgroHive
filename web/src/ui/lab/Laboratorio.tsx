// Laboratorio por pasos: la parcela (3D o 2D) cubre la pantalla y cada paso pone sus
// paneles flotantes encima. Cultivos (brocha) -> Escenarios (tiempo y metricas) ->
// Comparacion (ranking). Los valores salen del motor; la interfaz no los recalcula.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResultadoCeldas } from '../../../../contratos/tipos/contratos';
import { conLimite, type LaboratorioEstado } from '../useLaboratorio';
import { useSerieBalance } from '../useSerieBalance';
import { rangoDelCiclo } from '../tiempo';
import { aplicarAcomodando, colorCultivo, fechaParaVer, nombresCultivos, pintarCeldas, rellenarCiclo, ventanaDelPlan } from '../planes';
import type { PincelEscena } from '../../escena/pincel';
import { PanelCultivos } from './PanelCultivos';
import { BarraHerramientas, type Herramienta } from './BarraHerramientas';
import { celdasEnRiesgo, firmaMalla, mapaPlagas, plagasPresentes, proteger, riesgosDelPlan } from './plagas';
import { usePlagasZona, useProteccion } from './usePlagas';
import { biomaDe, climatologia, NOMBRE_BIOMA } from './conveniencia';
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
  // Mismos anchos que lab.css: panel izquierdo de 372 px (336 px hasta 1180 px) y hoja inferior en movil.
  const desplazamiento = useMemo(() => {
    if (paso === 'comparacion') return { x: 0, y: 0 };
    if (ventana.ancho <= 760) return { x: 0, y: Math.round(ventana.alto * 0.22) };
    const panel = ventana.ancho <= 1180 ? 336 : 372;
    return { x: Math.round((panel + 16) / 2), y: paso === 'escenarios' ? 40 : 0 };
  }, [paso, ventana.ancho, ventana.alto]);

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
  const serie = useSerieBalance(estado.calculo?.cliente, estado.calculo?.clave, plan?.rotacionId, escenario, paso === 'escenarios' || graficas);
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
  const plagasZona = usePlagasZona(datos?.parcela.centroide ?? null, datos?.esDemo ?? false);
  const presentes = useMemo(() => plagasPresentes(plagasZona), [plagasZona]);
  const celdasParcela = useMemo(() => datos?.parcela.celdas.map((c) => c.id) ?? [], [datos]);
  // La proteccion va ligada a la malla: si cambia el tamano de celda, empieza vacia en vez de apuntar a celdas ajenas.
  const claveProteccion = datos ? `${estado.claveGuardado}:${firmaMalla(celdasParcela, datos.parcela.tamanoCeldaM)}` : null;
  const [proteccion, setProteccion] = useProteccion(claveProteccion);
  const rociar = useCallback((ids: string[]) => {
    if (!plan || !visible || !ids.length) return;
    setProteccion(proteger(proteccion, plan.rotacionId, visible.ciclo, ids));
    setRociado({ celdas: ids, clave: Date.now() });
  }, [plan, visible, proteccion, setProteccion]);
  const riesgos = useMemo(() => (plan && visible ? riesgosDelPlan(plan, celdasParcela, presentes, proteccion).filter((r) => r.ciclo === visible.ciclo) : []), [plan, visible, celdasParcela, presentes, proteccion]);
  const plagasEscena = useMemo(() => (resultado && plan ? mapaPlagas(resultado.registros, presentes, proteccion, plan.rotacionId) : undefined), [resultado, plan, presentes, proteccion]);

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
      },
    };
  }, [paso, herramienta, plan, visible, datos, cultivoActivo, tamano, estado, rociar]);

  const sembrarTodo = plan && visible && datos && cultivoActivo && cultivoActivo !== visible.cultivo && herramienta === 'brocha' ? () => {
    const r = aplicarAcomodando(rellenarCiclo(plan, datos.parcela, visible.ciclo, cultivoActivo, datos.calendario, datos.catalogo), datos.parcela, datos.calendario, datos.catalogo);
    if ('error' in r) { setAviso(r.error); return; }
    setNota(textoMovidos(r.movidos));
    estado.actualizar(r.plan);
    setCultivoPincel(null);
  } : null;
  const rociarTodo = () => rociar(celdasParcela);
  const protegerRiesgo = () => rociar(celdasEnRiesgo(riesgos));

  const clima = useMemo(() => climatologia(datos?.serie), [datos?.serie]);
  const bioma = useMemo(() => biomaDe(clima), [clima]);
  const dentroDeVentana = useMemo(() => (plan && datos ? ventanaDelPlan(plan, datos.calendario) : undefined), [plan, datos]);
  const fondo = !webglDisponible ? <div className="lab-sin-webgl" role="alert"><strong>Este navegador no puede dibujar la parcela en 3D (WebGL).</strong><p>Prueba con otro navegador o equipo. Las cifras del motor siguen en los paneles.</p></div>
    : datos && plan ? <Suspense fallback={<div className="lab-fondo-carga" aria-hidden="true" />}>
      <Escena modo="fondo" mascota={false} hud={paso !== 'comparacion'} parcela={datos.parcela} suelo={datos.suelo} avisosDatos={datos.avisosDatos} serieBalance={paso === 'escenarios' ? serie.datos : null} resultado={resultado} fecha={fechaEscena} pincel={pincel} marcas={pendientes} desplazamiento={desplazamiento} dentroDeVentana={dentroDeVentana} plagas={plagasEscena} rociado={rociado} bioma={bioma ?? undefined} />
    </Suspense> : <div className="lab-fondo-carga" aria-hidden="true" />;

  const comun = { estado, onAvanzar };
  const evidencia = useEvidencia(datos?.parcela.centroide ?? null, datos?.esDemo ?? false);
  const leguminosas = useMemo(() => new Set((datos?.catalogo.cultivos ?? []).filter((c) => c.esLeguminosa === true).map((c) => c.id)), [datos]);
  const listaConsejos = useMemo(() => consejos({
    paso, plan: plan ?? null, ciclo, calendario: datos?.calendario ?? null, escenario,
    resultado: estado.calculo?.ranking.rotaciones.find((r) => r.rotacionId === plan?.rotacionId) ?? null,
    ordenadas: ordenarRotaciones(estado.calculo?.ranking.rotaciones ?? []),
    nombreRotacion: (id) => nombreRotacion(id, estado.planes), leguminosas, ndvi: evidencia.ndvi, smap: evidencia.smap,
    bioma: bioma ? { nombre: NOMBRE_BIOMA[bioma], tMedia: clima.tMediaAnual, lluvia: clima.lluviaAnualMm } : null,
    riesgos: riesgos.map((r) => ({ plaga: r.plaga.nombreComun, cultivo: nombresCultivos[r.cultivo] ?? r.cultivo, bloques: r.sinProteger.length })),
  }), [paso, plan, ciclo, datos, escenario, estado.calculo, estado.planes, leguminosas, evidencia, riesgos, bioma, clima]);
  return <div className={`lab lab-paso-${paso}`}>
    <Globo />
    {datos && paso !== 'comparacion' && <Mascota consejos={listaConsejos} paso={paso} />}
    <div className="lab-fondo">{fondo}</div>
    {paso === 'comparacion' && <div className="lab-velo" aria-hidden="true" />}
    {paso === 'cultivos' && <PanelCultivos {...comun} herramienta={herramienta} setHerramienta={setHerramienta} cultivoActivo={cultivoActivo} setCultivoPincel={setCultivoPincel} calculando={!estado.calculo || !celdasListas} riesgos={riesgos} hayPlagas={presentes.some((p) => plan?.ciclos.some((c) => p.cultivos.includes(c.cultivo)))} onProteger={riesgos.length ? protegerRiesgo : null} presentes={presentes} />}
    {paso === 'cultivos' && datos && <BarraHerramientas herramienta={herramienta} setHerramienta={setHerramienta} tamano={tamano} setTamano={setTamano}
      onSembrarTodo={sembrarTodo} sembrarTexto={`Sembrar ${nombresCultivos[cultivoActivo ?? ''] ?? cultivoActivo ?? ''} en toda la parcela`}
      onRociarTodo={presentes.length ? rociarTodo : null} deshacer={estado.deshacer} rehacer={estado.rehacer} puedeDeshacer={estado.puedeDeshacer} puedeRehacer={estado.puedeRehacer} />}
    {paso === 'escenarios' && <PanelEscenarios {...comun} fecha={fecha} rango={rango} serie={serie} celdasListas={celdasListas} errorCeldas={errorCeldas} onFecha={cambiarFecha} claveTiempo={`${estado.calculo?.clave}:${plan?.rotacionId}:${escenario}:${visible?.ciclo}`} />}
    {paso === 'comparacion' && <PanelComparacion {...comun} serie={serie} setGraficas={setGraficas} plagasDe={(id) => {
      const p = estado.planes.find((x) => x.rotacionId === id);
      return p ? riesgosDelPlan(p, celdasParcela, presentes, proteccion).map((r) => ({ ciclo: r.ciclo, plaga: r.plaga.nombreComun, cultivo: nombresCultivos[r.cultivo] ?? r.cultivo, bloques: r.sinProteger.length })) : [];
    }} />}
    {aviso && <Aviso tipo="error" className="lab-toast" onCerrar={() => setAviso('')}>{aviso}</Aviso>}
    {!aviso && nota && <Aviso tipo="info" className="lab-toast" onCerrar={() => setNota('')}>{nota}</Aviso>}
    {paso !== 'cultivos' && errorCeldas && <Aviso tipo="error" className="lab-toast" accion={{ texto: 'Reintentar', onClick: () => setIntentoCeldas((n) => n + 1) }}>{errorCeldas}</Aviso>}
  </div>;
}
