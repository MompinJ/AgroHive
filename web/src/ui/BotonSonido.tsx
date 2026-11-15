// Boton para activar o silenciar los efectos de sonido; la eleccion se guarda (sonido.ts).
import { useSyncExternalStore } from 'react';
import { motor } from './sonido';

export function BotonSonido() {
  const activo = useSyncExternalStore(motor.suscribir, motor.estaActivo, () => true);
  return <button type="button" className="boton-sonido" aria-pressed={activo} aria-label={activo ? 'Silenciar los efectos de sonido' : 'Activar los efectos de sonido'}
    title={activo ? 'Sonido activado: toca para silenciar' : 'Sonido silenciado: toca para activar'}
    onClick={() => { motor.alternar(); if (motor.estaActivo()) motor.tocar('aviso'); }}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
      {activo ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
    </svg>
  </button>;
}
