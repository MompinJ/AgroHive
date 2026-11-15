// Laboratorio por pasos: la parcela (3D o 2D) cubre la pantalla y cada paso pone sus
// paneles flotantes encima. Cultivos (brocha) -> Escenarios (tiempo y metricas) ->
// Comparacion (ranking). Los valores salen del motor; la interfaz no los recalcula.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResultadoCeldas } from '../../../../contratos/tipos/contratos';
import { conLimite, type LaboratorioEstado } from '../useLaboratorio';
import { useSerieBalance } from '../useSerieBalance';
import { rangoDelCiclo } from '../tiempo';
import { colorCultivo, conflictosPlan, fechaParaVer, pintarCeldas } from '../planes';
import type { PincelEscena } from '../../escena/pincel';
import { PanelCultivos, type Herramienta } from './PanelCultivos';
import { PanelEscenarios } from './PanelEscenarios';
import { PanelComparacion } from './PanelComparacion';
import { Aviso } from './piezas';
import './lab.css';

const Escena = lazy(() => import('../../escena/EscenaParcela').then((m) => ({ default: m.EscenaParcela })));
const Parcela2D = lazy(() => import('../Parcela2D').then((m) => ({ default: m.Parcela2D })));

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
  const { rotacion, ciclo, escenario, fechaElegida, setFecha, vista, setVista } = estado.seleccion;
  const [webglDisponible] = useState(puedeUsarWebGL);
  const vistaVisible = webglDisponible ? vista : '2d';
  const [celdas, setCeldas] = useState<{ clave: string; valor: ResultadoCeldas } | null>(null);
  const [falloCeldas, setFalloCeldas] = useState<{ clave: string; motivo: string } | null>(null);
  const [intentoCeldas, setIntentoCeldas] = useState(0);
  const [herramienta, setHerramienta] = useState<Herramienta>('brocha');
  const [cultivoPincel, setCultivoPincel] = useState<string | null>(null);
  const [tamano, setTamano] = useState(1);
  const [pendientes, setPendientes] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [aviso, setAviso] = useState('');
  const [graficas, setGraficas] = useState(false);
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
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  // En Cultivos la escena conserva el ultimo resultado mientras el motor recalcula, para que
  // pintar no deje la parcela vacia; lo pintado se cubre con su marca hasta que llega lo nuevo.
  // En Escenarios y Comparacion solo se muestra el resultado vigente.
  const ultimo = useRef<{ rotacion: string; ciclo: number; valor: ResultadoCeldas } | null>(null);
  if (celdasListas && plan && visible) ultimo.current = { rotacion: plan.rotacionId, ciclo: visible.ciclo, valor: celdas!.valor };
  const resultado = celdasListas ? celdas!.valor
    : paso === 'cultivos' && ultimo.current && ultimo.current.rotacion === plan?.rotacionId && ultimo.current.ciclo === visible?.ciclo ? ultimo.current.valor : null;

  const cultivoActivo = cultivoPincel ?? visible?.cultivo ?? null;
  const pincel: PincelEscena | null = useMemo(() => {
    if (paso !== 'cultivos' || herramienta === 'mover' || !plan || !visible || !datos) return null;
    const cultivo = herramienta === 'goma' ? null : cultivoActivo;
    const color = cultivo ? colorCultivo(cultivo) : colorCultivo(visible.cultivo);
    return {
      tamano, color,
      onTrazo: (ids: string[]) => {
        const nuevo = pintarCeldas(plan, datos.parcela, visible.ciclo, ids, cultivo, datos.calendario);
        const conflictos = conflictosPlan(nuevo, datos.catalogo);
        if (conflictos.length) { setAviso(conflictos[0]!); return; }
        if (JSON.stringify(nuevo.porCelda) === JSON.stringify(plan.porCelda)) return;
        setAviso('');
        setPendientes((p) => { const m = new Map(p); for (const id of ids) m.set(id, color); return m; });
        estado.actualizar(nuevo);
      },
    };
  }, [paso, herramienta, plan, visible, datos, cultivoActivo, tamano, estado]);

  const fondo = datos && plan ? <Suspense fallback={<div className="lab-fondo-carga" aria-hidden="true" />}>
    {vistaVisible === '2d'
      ? <div className="lab-fondo-2d"><Parcela2D parcela={datos.parcela} suelo={datos.suelo} avisosDatos={datos.avisosDatos} resultado={resultado} fecha={fecha} pincel={pincel} marcas={pendientes} compacta /></div>
      : <Escena modo="fondo" hud={paso !== 'comparacion'} parcela={datos.parcela} suelo={datos.suelo} avisosDatos={datos.avisosDatos} serieBalance={paso === 'escenarios' ? serie.datos : null} resultado={resultado} fecha={fecha} pincel={pincel} marcas={pendientes} desplazamiento={desplazamiento} />}
  </Suspense> : <div className="lab-fondo-carga" aria-hidden="true" />;

  const comun = { estado, onAvanzar };
  return <div className={`lab lab-paso-${paso}`}>
    <div className="lab-fondo">{fondo}</div>
    {paso === 'comparacion' && <div className="lab-velo" aria-hidden="true" />}
    {datos && <div className="lab-vista" role="radiogroup" aria-label="Vista de la parcela">
      <button type="button" role="radio" aria-checked={vistaVisible === '3d'} disabled={!webglDisponible} onClick={() => setVista('3d')}>3D</button>
      <button type="button" role="radio" aria-checked={vistaVisible === '2d'} onClick={() => setVista('2d')}>2D</button>
    </div>}
    {paso === 'cultivos' && <PanelCultivos {...comun} herramienta={herramienta} setHerramienta={setHerramienta} cultivoActivo={cultivoActivo} setCultivoPincel={setCultivoPincel} tamano={tamano} setTamano={setTamano} calculando={!estado.calculo || !celdasListas} />}
    {paso === 'escenarios' && <PanelEscenarios {...comun} fecha={fecha} rango={rango} serie={serie} celdasListas={celdasListas} errorCeldas={errorCeldas} onFecha={cambiarFecha} claveTiempo={`${estado.calculo?.clave}:${plan?.rotacionId}:${escenario}:${visible?.ciclo}:${vistaVisible}`} />}
    {paso === 'comparacion' && <PanelComparacion {...comun} serie={serie} setGraficas={setGraficas} />}
    {!webglDisponible && <p className="lab-toast lab-toast-info" role="status">WebGL no está disponible: mostramos la vista 2D con los mismos resultados del motor.</p>}
    {aviso && <Aviso tipo="error" className="lab-toast" onCerrar={() => setAviso('')}>{aviso}</Aviso>}
    {paso !== 'cultivos' && errorCeldas && <Aviso tipo="error" className="lab-toast" accion={{ texto: 'Reintentar', onClick: () => setIntentoCeldas((n) => n + 1) }}>{errorCeldas}</Aviso>}
  </div>;
}
