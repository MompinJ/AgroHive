// Anillo que encierra e ilumina el componente del que habla Esquilote: un marco dorado que late y atenua el resto de la
// pantalla. Sigue al elemento si se mueve o cambia de tamano; si no esta en pantalla, no dibuja nada.
import { useEffect, useState } from 'react';

interface Caja { x: number; y: number; w: number; h: number }
const MARGEN = 8;

export function Resalte({ selector }: { selector: string | undefined }) {
  const [caja, setCaja] = useState<Caja | null>(null);
  useEffect(() => {
    if (!selector || typeof document === 'undefined') { setCaja(null); return; }
    document.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    let activo = true;
    let ultimo = 0;
    let id = 0;
    const medir = (t: number) => {
      if (!activo) return;
      if (t - ultimo > 80) {
        ultimo = t;
        const el = document.querySelector<HTMLElement>(selector);
        const r = el?.getBoundingClientRect();
        const nueva = r && r.width > 0 && r.height > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null;
        setCaja((a) => (a && nueva && a.x === nueva.x && a.y === nueva.y && a.w === nueva.w && a.h === nueva.h ? a : nueva));
      }
      id = requestAnimationFrame(medir);
    };
    id = requestAnimationFrame(medir);
    return () => { activo = false; cancelAnimationFrame(id); setCaja(null); };
  }, [selector]);
  if (!caja) return null;
  return <div className="esquilote-anillo" style={{ left: caja.x - MARGEN, top: caja.y - MARGEN, width: caja.w + 2 * MARGEN, height: caja.h + 2 * MARGEN }} aria-hidden="true" />;
}
