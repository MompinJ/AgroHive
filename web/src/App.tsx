import { useEffect, useRef, useState } from 'react';
import { Comparacion } from './paginas/Comparacion';
import { Inicio } from './paginas/Inicio';
import { Laboratorio } from './paginas/Laboratorio';
import { Terreno } from './paginas/Terreno';
import { ActionLink, Brand, MethodNotes, Navigation, PageHeading } from './ui/components';
import { pages, usePage } from './ui/navigation';
import { demo } from './ui/demo';
import { initialRotations } from './ui/selections';
import type { Crop, Cycle, RotationChoices, RotationId, Scenario } from './ui/selections';

export default function App() {
  const { path, mode } = usePage();
  const [rotation, setRotation] = useState<RotationId>('R1');
  const [cycle, setCycle] = useState<Cycle>(1);
  const [scenario, setScenario] = useState<Scenario>('Habitual');
  const [rotations, setRotations] = useState<RotationChoices>(initialRotations);
  const [announcement, setAnnouncement] = useState('');
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

  function selectCrop(selectedCycle: Cycle, crop: Crop) {
    setRotations((previous) => {
      const sequence = [...previous[rotation]] as [Crop, Crop, Crop];
      sequence[selectedCycle - 1] = crop;
      return { ...previous, [rotation]: sequence };
    });
    setAnnouncement(`${rotation}, ciclo ${selectedCycle}: ${crop}. Selección de ejemplo guardada durante esta sesión. Sin evaluación científica.`);
  }

  let content;
  switch (path) {
    case '/': content = <Inicio />; break;
    case '/terreno': content = <Terreno polygonMode={mode === 'poligono'} onSelectDemo={() => setAnnouncement('Parcela de ejemplo seleccionada. Datos reales pendientes.')} />; break;
    case '/laboratorio': content = <Laboratorio rotation={rotation} sequence={rotations[rotation]} cycle={cycle} scenario={scenario} onRotation={setRotation} onCycle={setCycle} onScenario={setScenario} onCrop={selectCrop} />; break;
    case '/comparacion': content = <Comparacion rotations={rotations} rotation={rotation} cycle={cycle} scenario={scenario} />; break;
    default: content = <><PageHeading step="—" title="Esta página no existe.">Puedes volver al inicio para continuar explorando.</PageHeading><ActionLink href="#/">Volver al inicio</ActionLink></>;
  }

  return <>
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    <header className="site-header"><div className="header-inner"><Brand /><Navigation path={path} /><span className="prototype-badge"><span aria-hidden="true" />Prototipo A1.2</span></div></header>
    <div className="prototype-strip"><div className="wrap"><strong>Interfaz de demostración</strong><span>Sin conexión a datos NASA ni al motor de simulación.</span><span>{demo.notice}</span></div></div>
    <main id="contenido" className="wrap main-content" tabIndex={-1}>{content}<MethodNotes /></main>
    <div className="sr-only" role="status">{announcement}</div>
    <footer className="site-footer wrap"><p>AgroHive <span aria-hidden="true">/</span> Code Hive · NASA Space Apps 2026</p><p>Apoya la decisión del agricultor. No reemplaza asesoría agronómica.</p></footer>
  </>;
}
