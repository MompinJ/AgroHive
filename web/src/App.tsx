import { useEffect, useRef, useState } from 'react';
import { Inicio } from './paginas/Inicio';
import { useLaboratorio } from './ui/useLaboratorio';
import { MetodoFuentes } from './paginas/MetodoFuentes';
import { Terreno } from './paginas/Terreno';
import { ActionLink, MethodNotes, PageHeading } from './ui/components';
import { indicePaso, irA, pages, pasos, usePage } from './ui/navigation';
import { BarraPasos } from './ui/BarraPasos';
import { Laboratorio, type PasoLab } from './ui/lab/Laboratorio';
import { InicioHeader } from './ui/InicioHeader';
import type { Parcela } from '../../contratos/tipos/contratos';

const rutaDePaso: Record<PasoLab, string> = { cultivos: '/laboratorio', escenarios: '/escenarios', comparacion: '/comparacion' };
const pasoDeRuta: Record<string, PasoLab> = { '/laboratorio': 'cultivos', '/escenarios': 'escenarios', '/comparacion': 'comparacion' };

export default function App() {
  const { path, mode } = usePage();
  const isHome = path === '/';
  const isTerrain = path === '/terreno';
  const pasoLab = pasoDeRuta[path];
  const [announcement, setAnnouncement] = useState('');
  const [parcela, setParcela] = useState<Parcela | null>(null);
  // Paso mas lejano abierto (indice en `pasos`). Avanzar exige completar el anterior.
  const [progreso, setProgreso] = useState(0);
  const laboratorio = useLaboratorio(parcela, !!pasoLab || path === '/metodo');
  const previousLocation = useRef(`${path}?${mode ?? ''}`);
  const indice = indicePaso(path);
  const bloqueado = indice > progreso;

  // Stepper obligatorio: una ruta de un paso aun cerrado lleva al paso abierto mas lejano.
  useEffect(() => {
    if (bloqueado) {
      setAnnouncement(`Completa primero el paso ${progreso + 1}: ${pasos[progreso]!.label}.`);
      irA(pasos[progreso]!.path, true);
    }
  }, [bloqueado, progreso]);

  useEffect(() => {
    const page = pages.find((item) => item.path === path);
    document.title = `AgroHive · ${page?.label ?? 'Página no encontrada'}`;
    const locationKey = `${path}?${mode ?? ''}`;
    if (previousLocation.current !== locationKey) {
      document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousLocation.current = locationKey;
    }
  }, [path, mode]);

  const elegirDemo = () => {
    if (parcela) setProgreso(1); else setProgreso((p) => Math.max(p, 1));
    setParcela(null);
    setAnnouncement('Parcela de ejemplo seleccionada.');
  };
  const guardarParcela = (p: Parcela) => { setParcela(p); setProgreso(1); };
  const avanzar = (destino: PasoLab) => {
    const i = indicePaso(rutaDePaso[destino]);
    setProgreso((p) => Math.max(p, i));
    irA(rutaDePaso[destino]);
  };

  if (isHome) return <div className="app-shell app-shell-home">
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    <InicioHeader />
    <main id="contenido" className="landing-main" tabIndex={-1}><Inicio /></main>
  </div>;

  if (pasoLab) return <div className="app-shell app-shell-lab">
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    <BarraPasos path={path} progreso={progreso} sobreEscena />
    <main id="contenido" className="lab-main" tabIndex={-1}>{!bloqueado && <Laboratorio estado={laboratorio} paso={pasoLab} onAvanzar={avanzar} />}</main>
    <div className="sr-only" role="status">{announcement}</div>
  </div>;

  let content;
  switch (path) {
    case '/terreno': content = <Terreno polygonMode={mode === 'poligono'} parcela={parcela} onGuardar={guardarParcela} onSelectDemo={elegirDemo} />; break;
    case '/metodo': content = <MetodoFuentes estado={laboratorio} />; break;
    default: content = <><PageHeading step="—" title="Esta página no existe.">Puedes volver al inicio para continuar explorando.</PageHeading><ActionLink href="#/">Volver al inicio</ActionLink></>;
  }

  return <div className={`app-shell${isTerrain ? ' app-shell-terrain' : ''}`}>
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    <BarraPasos path={path} progreso={progreso} />
    <main id="contenido" className={isTerrain ? 'terrain-main' : 'wrap main-content'} tabIndex={-1}>{content}{!isTerrain && <MethodNotes />}</main>
    <div className="sr-only" role="status">{announcement}</div>
    {isTerrain ? <footer className="terrain-footer"><p>Apoya la decisión del agricultor. No reemplaza asesoría agronómica.</p></footer> : <footer className="site-footer wrap"><p>AgroHive <span aria-hidden="true">/</span> Code Hive · NASA Space Apps 2026</p><p>Apoya la decisión del agricultor. No reemplaza asesoría agronómica.</p></footer>}
  </div>;
}
