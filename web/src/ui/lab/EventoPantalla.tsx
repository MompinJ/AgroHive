// Animacion a pantalla completa de un evento del laboratorio: cosecha (una guadana barre la pantalla y caen briznas) o
// plaga (un enjambre cruza). Va con un aviso que dice que paso y cuando. Decorativa y sin captura de eventos: no
// bloquea la parcela. Con "reducir movimiento" solo se muestra el aviso. Se cierra sola.
import { useEffect } from 'react';
import type { EventoPantalla as Evento } from './eventos';
import './evento.css';

export const DURACION_EVENTO_MS = 3800;

// Posiciones fijas (sin azar): la misma animacion cada vez, y las pruebas ven el mismo HTML.
const BRIZNAS = Array.from({ length: 26 }, (_, k) => ({
  x: 6 + ((k * 37) % 88), giro: ((k * 53) % 360) - 180, retraso: 0.55 + (k % 9) * 0.1, largo: 8 + ((k * 7) % 9), verde: k % 3 === 0,
}));
const BICHOS = Array.from({ length: 18 }, (_, k) => ({ y: 8 + ((k * 29) % 78), retraso: (k % 6) * 0.22, duracion: 1.9 + ((k * 13) % 7) * 0.12, tam: 22 + ((k * 11) % 5) * 5 }));

function Guadana() {
  return <svg className="evento-guadana-dibujo" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
    {/* mango (el "snath"), con dos empunaduras */}
    <path d="M520 585C430 440 330 300 190 125" fill="none" stroke="#7a5230" strokeWidth="16" strokeLinecap="round" />
    <path d="M350 330l-34 22M425 440l-36 20" stroke="#5b3a1f" strokeWidth="12" strokeLinecap="round" />
    {/* hoja curva */}
    <path d="M176 120C86 96 26 160 14 272C62 198 122 166 198 158z" fill="#d6dde3" stroke="#8e99a3" strokeWidth="4" strokeLinejoin="round" />
    <path d="M40 240C80 190 130 168 186 160" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
    <circle cx="190" cy="132" r="9" fill="#5b3a1f" />
  </svg>;
}

function Bicho({ tam }: { tam: number }) {
  return <svg width={tam} height={tam} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <g stroke="#3b2d17" strokeWidth="1.6" strokeLinecap="round"><path d="M14 22l-8 5M14 25l-9 1M16 28l-7 7M26 22l8 5M26 25l9 1M24 28l7 7" /><path d="M17 11l-5-6M23 11l5-6" /></g>
    <ellipse cx="14" cy="17" rx="9" ry="5" fill="#cfe3f0" opacity=".75" transform="rotate(-25 14 17)" />
    <ellipse cx="26" cy="17" rx="9" ry="5" fill="#cfe3f0" opacity=".75" transform="rotate(25 26 17)" />
    <ellipse cx="20" cy="24" rx="7" ry="10" fill="#6b4a1f" /><path d="M14 22h12M14 26h12" stroke="#c99a3a" strokeWidth="2" />
    <circle cx="20" cy="12" r="5" fill="#3b2d17" /><circle cx="18" cy="11" r="1.2" fill="#fff" /><circle cx="22" cy="11" r="1.2" fill="#fff" />
  </svg>;
}

export function EventoPantalla({ evento, onTerminar }: { evento: Evento | null; onTerminar: () => void }) {
  useEffect(() => {
    if (!evento) return;
    const t = window.setTimeout(onTerminar, DURACION_EVENTO_MS);
    return () => window.clearTimeout(t);
  }, [evento?.clave]);
  if (!evento) return null;
  return <div className={`evento evento-${evento.tipo}`} key={evento.clave}>
    <div className="evento-escena" aria-hidden="true">
      {evento.tipo === 'cosecha' ? <>
        <div className="evento-estela" />
        <div className="evento-guadana"><Guadana /></div>
        {BRIZNAS.map((b, k) => <span key={k} className={`evento-brizna${b.verde ? ' evento-brizna-verde' : ''}`} style={{ left: `${b.x}%`, width: b.largo, animationDelay: `${b.retraso}s`, ['--giro' as string]: `${b.giro}deg` }} />)}
      </> : BICHOS.map((b, k) => <span key={k} className="evento-bicho" style={{ top: `${b.y}%`, animationDelay: `${b.retraso}s`, animationDuration: `${b.duracion}s` }}><Bicho tam={b.tam} /></span>)}
    </div>
    <div className="evento-aviso" role="status" aria-live="polite">
      <p className="evento-tipo">{evento.tipo === 'cosecha' ? 'Cosecha' : 'Plaga'}</p>
      <p className="evento-titulo">{evento.titulo}</p>
      <p className="evento-detalle">{evento.detalle}</p>
    </div>
  </div>;
}
