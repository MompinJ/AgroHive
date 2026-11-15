import { useEffect, useRef, useState } from 'react';
import { Inicio } from './paginas/Inicio';
import { EJEMPLO_INICIAL, useLaboratorio } from './ui/useLaboratorio';
import { MetodoFuentes } from './paginas/MetodoFuentes';
import { Terreno } from './paginas/Terreno';
import { ActionLink, MethodNotes, PageHeading } from './ui/components';
import { indicePaso, irA, pages, pasos, usePage } from './ui/navigation';
import { BarraPasos } from './ui/BarraPasos';
import { Laboratorio, type PasoLab } from './ui/lab/Laboratorio';
import type { Parcela } from '../../contratos/tipos/contratos';
import { useIdioma } from './ui/i18n/Idioma';

const rutaDePaso: Record<PasoLab, string> = { cultivos: '/laboratorio', escenarios: '/escenarios', comparacion: '/comparacion' };
const pasoDeRuta: Record<string, PasoLab> = { '/laboratorio': 'cultivos', '/escenarios': 'escenarios', '/comparacion': 'comparacion' };

export default function App() {
  const { t } = useIdioma();
  const { path, mode } = usePage();
  const isHome = path === '/';
  const isTerrain = path === '/terreno';
  const pasoLab = pasoDeRuta[path];
  const [announcement, setAnnouncement] = useState('');
  const [parcela, setParcela] = useState<Parcela | null>(null);
  // Parcela de ejemplo elegida en Terreno (demo/ejemplos.ts); se usa mientras no haya una parcela dibujada.
  const [ejemplo, setEjemplo] = useState(EJEMPLO_INICIAL);
  // Paso mas lejano abierto (indice en `pasos`). Avanzar exige completar el anterior.
  const [progreso, setProgreso] = useState(0);
  const laboratorio = useLaboratorio(parcela, !!pasoLab || path === '/metodo', ejemplo);
  const previousLocation = useRef(`${path}?${mode ?? ''}`);
  const indice = indicePaso(path);
  const bloqueado = indice > progreso;

  // Stepper obligatorio: una ruta de un paso aun cerrado lleva al paso abierto mas lejano.
  useEffect(() => {
    if (bloqueado) {
      setAnnouncement(t('app.completaPaso', { n: progreso + 1, nombre: pasos[progreso]!.label }));
      irA(pasos[progreso]!.path, true);
    }
  }, [bloqueado, progreso]);

  useEffect(() => {
    const page = pages.find((item) => item.path === path);
    document.title = `AgroHive · ${page?.label ?? t('app.noEncontrada')}`;
    const locationKey = `${path}?${mode ?? ''}`;
    if (previousLocation.current !== locationKey) {
      document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousLocation.current = locationKey;
    }
  }, [path, mode]);

  const elegirEjemplo = (id: string) => {
    // Cambiar de parcela reinicia los pasos siguientes; volver a la misma conserva el avance.
    if (parcela || id !== ejemplo) setProgreso(1); else setProgreso((p) => Math.max(p, 1));
    setParcela(null);
    setEjemplo(id);
    setAnnouncement(t('app.ejemploElegido'));
  };
  const guardarParcela = (p: Parcela) => { setParcela(p); setProgreso(1); };
  const avanzar = (destino: PasoLab) => {
    const i = indicePaso(rutaDePaso[destino]);
    setProgreso((p) => Math.max(p, i));
    irA(rutaDePaso[destino]);
  };

  if (isHome) return <div className="app-shell app-shell-home">
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>{t('nav.saltar')}</a>
    <main id="contenido" className="landing-main" tabIndex={-1}><Inicio /></main>
  </div>;

  if (pasoLab) return <div className="app-shell app-shell-lab">
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>{t('nav.saltar')}</a>
    <BarraPasos path={path} progreso={progreso} sobreEscena />
    <main id="contenido" className="lab-main" tabIndex={-1}>{!bloqueado && <Laboratorio estado={laboratorio} paso={pasoLab} onAvanzar={avanzar} />}</main>
    <div className="sr-only" role="status">{announcement}</div>
  </div>;

  let content;
  switch (path) {
    case '/terreno': content = <Terreno polygonMode={mode === 'poligono'} parcela={parcela} ejemplo={parcela ? null : ejemplo} onGuardar={guardarParcela} onElegirEjemplo={elegirEjemplo} />; break;
    case '/metodo': content = <MetodoFuentes estado={laboratorio} />; break;
    default: content = <><PageHeading step="—" title={t('app.noExiste')}>{t('app.noExisteAyuda')}</PageHeading><ActionLink href="#/">{t('app.volver')}</ActionLink></>;
  }

  return <div className={`app-shell${isTerrain ? ' app-shell-terrain' : ''}`}>
    <a className="skip-link" href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }}>{t('nav.saltar')}</a>
    <BarraPasos path={path} progreso={progreso} />
    <main id="contenido" className={isTerrain ? 'terrain-main' : 'wrap main-content'} tabIndex={-1}>{content}{!isTerrain && <MethodNotes />}</main>
    <div className="sr-only" role="status">{announcement}</div>
    {isTerrain ? <footer className="terrain-footer"><p>{t('app.pie')}</p></footer> : <footer className="site-footer wrap"><p>AgroHive <span aria-hidden="true">/</span> Code Hive · NASA Space Apps 2026</p><p>{t('app.pie')}</p></footer>}
  </div>;
}
