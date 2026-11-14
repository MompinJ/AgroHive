import { useEffect, useRef, useState } from 'react';
import { LaboratorioConectado } from './ui/LaboratorioConectado';
import { Inicio } from './paginas/Inicio';
import { useLaboratorio } from './ui/useLaboratorio';
import { Terreno } from './paginas/Terreno';
import { ActionLink, Brand, MethodNotes, Navigation, PageHeading } from './ui/components';
import { pages, usePage } from './ui/navigation';

import { InicioHeader } from './ui/InicioHeader';
import { useMotor } from './ui/useMotor';
import type { Parcela } from '../../contratos/tipos/contratos';

export default function App() {
  const estadoMotor = useMotor();
  const { path, mode } = usePage();
  const isHome = path === '/';
  const isTerrain = path === '/terreno';
  const [announcement, setAnnouncement] = useState('');
  const [parcela, setParcela] = useState<Parcela | null>(null);
  const laboratorio = useLaboratorio(parcela, path === '/laboratorio' || path === '/comparacion');
  const previousLocation = useRef(`${path}?${mode ?? ''}`);

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

  let content;
  switch (path) {
    case '/': content = <Inicio />; break;
    case '/terreno': content = <Terreno polygonMode={mode === 'poligono'} parcela={parcela} onGuardar={setParcela} onSelectDemo={() => { setParcela(null); setAnnouncement('Parcela de ejemplo seleccionada.'); }} />; break;
    case '/laboratorio': content = <LaboratorioConectado estado={laboratorio} />; break;
    case '/comparacion': content = <LaboratorioConectado estado={laboratorio} comparacion />; break;
    default: content = <><PageHeading step="—" title="Esta página no existe.">Puedes volver al inicio para continuar explorando.</PageHeading><ActionLink href="#/">Volver al inicio</ActionLink></>;
  }

  return <div className={`app-shell${isHome ? ' app-shell-home' : isTerrain ? ' app-shell-terrain' : ''}`}>
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    {isHome ? <InicioHeader /> : <>
      <header className="site-header"><div className="header-inner"><Brand /><Navigation path={path} /><span className="prototype-badge"><span aria-hidden="true" />Demostración</span></div></header>
      <div className="prototype-strip"><div className="wrap"><strong>Interfaz de demostración</strong><span role="status">{estadoMotor}. El laboratorio ejecuta las simulaciones en tu navegador.</span><span>{parcela ? 'Contorno del usuario; consulta fuentes, supuestos y datos faltantes en el laboratorio.' : 'Demo de Isla: parcela ficticia con datos climáticos y estimaciones de suelo de fuentes reales.'}</span></div></div>
    </>}
    <main id="contenido" className={isHome ? 'landing-main' : isTerrain ? 'terrain-main' : 'wrap main-content'} tabIndex={-1}>{!isHome && !isTerrain && parcela && <p role="status">Parcela seleccionada: {parcela.areaHa.toFixed(3)} ha · {parcela.celdas.length} celdas · relieve {parcela.terreno.estado}. </p>}{content}{!isHome && <MethodNotes />}</main>
    <div className="sr-only" role="status">{announcement}</div>
    {isTerrain ? <footer className="terrain-footer"><p>Apoya la decisión del agricultor. No reemplaza asesoría agronómica.</p></footer> : !isHome && <footer className="site-footer wrap"><p>AgroHive <span aria-hidden="true">/</span> Code Hive · NASA Space Apps 2026</p><p>Apoya la decisión del agricultor. No reemplaza asesoría agronómica.</p></footer>}
  </div>;
}
