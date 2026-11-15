// Barra de herramientas flotante del paso Cultivos (a la orilla izquierda de la escena): iconos
// con globo y atajos de teclado. B brocha, X goma, I insecticida, M mover, 1 a 3 tamano,
// Ctrl o Cmd + Z deshace y Ctrl + Y (o Mayusculas + Ctrl + Z) rehace.
import { useEffect } from 'react';
import { useIdioma } from '../i18n/Idioma';
import { IconoBrocha, IconoCubeta, IconoDeshacer, IconoGoma, IconoInsecticida, IconoMano, IconoRehacer, IconoTamano } from './iconos';

export type Herramienta = 'brocha' | 'goma' | 'insecticida' | 'mover';
const tamanos = [{ valor: 1, texto: 'barra.fina', ayuda: 'barra.unBloque' }, { valor: 2, texto: 'barra.media', ayuda: 'barra.tres' }, { valor: 3, texto: 'barra.ancha', ayuda: 'barra.cinco' }] as const;

export function BarraHerramientas({ herramienta, setHerramienta, tamano, setTamano, onSembrarTodo, sembrarTexto, onRociarTodo, deshacer, rehacer, puedeDeshacer, puedeRehacer }: {
  herramienta: Herramienta; setHerramienta: (h: Herramienta) => void;
  tamano: number; setTamano: (n: number) => void;
  onSembrarTodo: (() => void) | null; sembrarTexto: string;
  onRociarTodo: (() => void) | null;
  deshacer: () => void; rehacer: () => void; puedeDeshacer: boolean; puedeRehacer: boolean;
}) {
  const { t: tr } = useIdioma();
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) rehacer(); else deshacer(); return; }
      if (mod && k === 'y') { e.preventDefault(); rehacer(); return; }
      if (mod || e.altKey) return;
      const accion: Record<string, () => void> = {
        b: () => setHerramienta('brocha'), x: () => setHerramienta('goma'), i: () => setHerramienta('insecticida'), m: () => setHerramienta('mover'),
        '1': () => setTamano(1), '2': () => setTamano(2), '3': () => setTamano(3),
      };
      if (accion[k]) { e.preventDefault(); accion[k](); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [deshacer, rehacer, setHerramienta, setTamano]);

  const herramientas = [
    ['brocha', tr('barra.brocha'), <IconoBrocha key="b" />],
    ['goma', tr('barra.goma'), <IconoGoma key="g" />],
    ['insecticida', tr('barra.insecticida'), <IconoInsecticida key="i" />],
    ['mover', tr('barra.mover'), <IconoMano key="m" />],
  ] as const;
  return <div className="barra-herr" role="toolbar" aria-label={tr('barra.herramientas')} aria-orientation="vertical">
    <div role="radiogroup" aria-label={tr('barra.herramienta')} className="barra-herr-grupo">
      {herramientas.map(([id, tip, icono]) => <button type="button" role="radio" key={id} className={`lab-tip barra-herr-${id}`} data-tip={tip} aria-label={tip} aria-checked={herramienta === id} onClick={() => setHerramienta(id)}>{icono}</button>)}
    </div>
    <span className="barra-herr-sep" aria-hidden="true" />
    <div role="radiogroup" aria-label={tr('barra.tamano')} className="barra-herr-grupo">
      {tamanos.map((t) => <button type="button" role="radio" key={t.valor} className="lab-tip" data-tip={tr('barra.tamanoTip', { texto: tr(t.texto), ayuda: tr(t.ayuda), valor: t.valor })} aria-label={tr('barra.tamanoEtiqueta', { texto: tr(t.texto), ayuda: tr(t.ayuda) })} aria-checked={tamano === t.valor} disabled={herramienta === 'mover'} onClick={() => setTamano(t.valor)}><IconoTamano nivel={t.valor} /></button>)}
    </div>
    <span className="barra-herr-sep" aria-hidden="true" />
    <div className="barra-herr-grupo">
      {onSembrarTodo && <button type="button" className="lab-tip" data-tip={sembrarTexto} aria-label={sembrarTexto} onClick={onSembrarTodo}><IconoCubeta /></button>}
      {onRociarTodo && <button type="button" className="lab-tip" data-tip={tr('barra.rociarTip')} aria-label={tr('barra.rociarEtiqueta')} onClick={onRociarTodo}><IconoInsecticida /></button>}
      <button type="button" className="lab-tip" data-tip={tr('barra.deshacerTip')} aria-label={tr('barra.deshacer')} disabled={!puedeDeshacer} onClick={deshacer}><IconoDeshacer /></button>
      <button type="button" className="lab-tip" data-tip={tr('barra.rehacerTip')} aria-label={tr('barra.rehacer')} disabled={!puedeRehacer} onClick={rehacer}><IconoRehacer /></button>
    </div>
  </div>;
}
