// Globo de ayuda unico para todo lo que lleve data-tip (iconos de herramientas, rotaciones,
// cultivos). Posicion fija para que no lo recorten los paneles con desplazamiento. Aparece al
// pasar el cursor o al enfocar con teclado; es decorativo (el boton ya tiene aria-label).
import { useEffect, useState } from 'react';

export function Globo() {
  const [globo, setGlobo] = useState<{ texto: string; x: number; y: number; abajo: boolean } | null>(null);
  useEffect(() => {
    const mostrar = (ev: Event) => {
      const el = (ev.target as Element | null)?.closest?.<HTMLElement>('[data-tip]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const abajo = r.top < 64;
      setGlobo({ texto: el.dataset.tip ?? '', x: Math.min(window.innerWidth - 136, Math.max(136, r.left + r.width / 2)), y: abajo ? r.bottom + 8 : r.top - 8, abajo });
    };
    const ocultar = (ev: Event) => {
      const el = (ev.target as Element | null)?.closest?.('[data-tip]');
      if (el) setGlobo(null);
    };
    const quitar = () => setGlobo(null);
    document.addEventListener('pointerover', mostrar);
    document.addEventListener('pointerout', ocultar);
    document.addEventListener('focusin', mostrar);
    document.addEventListener('focusout', ocultar);
    window.addEventListener('scroll', quitar, true);
    return () => {
      document.removeEventListener('pointerover', mostrar);
      document.removeEventListener('pointerout', ocultar);
      document.removeEventListener('focusin', mostrar);
      document.removeEventListener('focusout', ocultar);
      window.removeEventListener('scroll', quitar, true);
    };
  }, []);
  if (!globo?.texto) return null;
  return <div className={`lab-globo${globo.abajo ? ' lab-globo-abajo' : ''}`} style={{ left: globo.x, top: globo.y }} aria-hidden="true">{globo.texto}</div>;
}
