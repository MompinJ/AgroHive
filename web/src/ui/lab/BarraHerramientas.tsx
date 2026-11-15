// Barra de herramientas flotante del paso Cultivos (a la orilla izquierda de la escena): iconos
// con globo y atajos de teclado. B brocha, X goma, I insecticida, M mover, 1 a 3 tamano,
// Ctrl o Cmd + Z deshace y Ctrl + Y (o Mayusculas + Ctrl + Z) rehace.
import { useEffect } from 'react';
import { IconoBrocha, IconoCubeta, IconoDeshacer, IconoGoma, IconoInsecticida, IconoMano, IconoRehacer, IconoTamano } from './iconos';

export type Herramienta = 'brocha' | 'goma' | 'insecticida' | 'mover';
const tamanos = [{ valor: 1, texto: 'fina', ayuda: '1 bloque' }, { valor: 2, texto: 'media', ayuda: '3 × 3 bloques' }, { valor: 3, texto: 'ancha', ayuda: '5 × 5 bloques' }] as const;

export function BarraHerramientas({ herramienta, setHerramienta, tamano, setTamano, onSembrarTodo, sembrarTexto, onRociarTodo, deshacer, rehacer, puedeDeshacer, puedeRehacer }: {
  herramienta: Herramienta; setHerramienta: (h: Herramienta) => void;
  tamano: number; setTamano: (n: number) => void;
  onSembrarTodo: (() => void) | null; sembrarTexto: string;
  onRociarTodo: (() => void) | null;
  deshacer: () => void; rehacer: () => void; puedeDeshacer: boolean; puedeRehacer: boolean;
}) {
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
    ['brocha', 'Brocha: siembra el cultivo elegido (B)', <IconoBrocha key="b" />],
    ['goma', 'Goma: regresa al cultivo del ciclo (X)', <IconoGoma key="g" />],
    ['insecticida', 'Insecticida: protege bloques de las plagas (I)', <IconoInsecticida key="i" />],
    ['mover', 'Mover la cámara (M)', <IconoMano key="m" />],
  ] as const;
  return <div className="barra-herr" role="toolbar" aria-label="Herramientas" aria-orientation="vertical">
    <div role="radiogroup" aria-label="Herramienta" className="barra-herr-grupo">
      {herramientas.map(([id, tip, icono]) => <button type="button" role="radio" key={id} className={`lab-tip barra-herr-${id}`} data-tip={tip} aria-label={tip} aria-checked={herramienta === id} onClick={() => setHerramienta(id)}>{icono}</button>)}
    </div>
    <span className="barra-herr-sep" aria-hidden="true" />
    <div role="radiogroup" aria-label="Tamaño" className="barra-herr-grupo">
      {tamanos.map((t) => <button type="button" role="radio" key={t.valor} className="lab-tip" data-tip={`Tamaño ${t.texto}: ${t.ayuda} (${t.valor})`} aria-label={`Tamaño ${t.texto}, ${t.ayuda}`} aria-checked={tamano === t.valor} disabled={herramienta === 'mover'} onClick={() => setTamano(t.valor)}><IconoTamano nivel={t.valor} /></button>)}
    </div>
    <span className="barra-herr-sep" aria-hidden="true" />
    <div className="barra-herr-grupo">
      {onSembrarTodo && <button type="button" className="lab-tip" data-tip={sembrarTexto} aria-label={sembrarTexto} onClick={onSembrarTodo}><IconoCubeta /></button>}
      {onRociarTodo && <button type="button" className="lab-tip" data-tip="Insecticida en toda la parcela (este ciclo)" aria-label="Insecticida en toda la parcela, este ciclo" onClick={onRociarTodo}><IconoInsecticida /></button>}
      <button type="button" className="lab-tip" data-tip="Deshacer (Ctrl + Z)" aria-label="Deshacer" disabled={!puedeDeshacer} onClick={deshacer}><IconoDeshacer /></button>
      <button type="button" className="lab-tip" data-tip="Rehacer (Ctrl + Y)" aria-label="Rehacer" disabled={!puedeRehacer} onClick={rehacer}><IconoRehacer /></button>
    </div>
  </div>;
}
