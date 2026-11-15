// Tutorial guiado por Esquilote. La primera vez que se entra a cada pantalla del flujo se abre solo; despues,
// el boton con la mascota lo vuelve a abrir. No bloquea la pantalla: es una tarjeta que se puede ignorar o cerrar
// (Escape tambien). Resalta el elemento del paso si esta en pantalla.
import { useEffect, useState } from 'react';
import { usePage } from '../navigation';
import { Esquilote } from './Esquilote';
import { marcarVisto, navegar, TUTORIALES, tutorialDeRuta, tutorialVisto, type EstadoTutorial, type IdTutorial, type PasoTutorial } from './pasos';
import './tutorial.css';

export function TarjetaTutorial({ pasos, paso, onSiguiente, onAnterior, onCerrar, enfocar = false }: {
  pasos: readonly PasoTutorial[]; paso: number; onSiguiente: () => void; onAnterior: () => void; onCerrar: () => void; enfocar?: boolean;
}) {
  const actual = pasos[paso]!;
  const ultimo = paso === pasos.length - 1;
  return <section className="esquilote esquilote-tarjeta" role="dialog" aria-modal="false" aria-labelledby="esquilote-titulo" aria-describedby="esquilote-texto">
    <Esquilote saluda={paso === 0} />
    <div className="esquilote-cuerpo">
      <p className="esquilote-nombre">Esquilote · paso {paso + 1} de {pasos.length}</p>
      <h2 id="esquilote-titulo">{actual.titulo}</h2>
      <p id="esquilote-texto" aria-live="polite">{actual.texto}</p>
      <div className="esquilote-acciones">
        <button type="button" className="esquilote-saltar" onClick={onCerrar}>{ultimo ? 'Cerrar' : 'Saltar tutorial'}</button>
        {paso > 0 && <button type="button" className="esquilote-atras" onClick={onAnterior}>Anterior</button>}
        <button type="button" className="esquilote-siguiente" onClick={onSiguiente} autoFocus={enfocar}>{ultimo ? '¡Entendido!' : 'Siguiente'}</button>
      </div>
    </div>
  </section>;
}

export function TutorialEsquilote() {
  const { path } = usePage();
  const id = tutorialDeRuta(path);
  const [estado, setEstado] = useState<EstadoTutorial | null>(null);
  const [manual, setManual] = useState(false);

  // Primera vez en una pantalla: se abre solo. Al cambiar de pantalla se cierra el de la anterior.
  useEffect(() => {
    setManual(false);
    setEstado(id && !tutorialVisto(id) ? { id, paso: 0 } : null);
  }, [id]);

  const terminar = (e: EstadoTutorial) => { marcarVisto(e.id); setEstado(null); };
  const mover = (accion: 'siguiente' | 'anterior' | 'cerrar') => {
    if (!estado) return;
    const siguiente = navegar(estado, accion);
    if (siguiente) setEstado(siguiente); else terminar(estado);
  };

  // Escape cierra la tarjeta.
  useEffect(() => {
    if (!estado) return;
    const alTeclear = (ev: KeyboardEvent) => { if (ev.key === 'Escape') terminar(estado); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [estado]);

  // Resalta el elemento del paso (si esta en pantalla) y lo deja como estaba al cambiar de paso.
  const selector = estado ? TUTORIALES[estado.id][estado.paso]?.destacar : undefined;
  useEffect(() => {
    if (!selector) return;
    const elemento = document.querySelector<HTMLElement>(selector);
    if (!elemento) return;
    elemento.classList.add('esquilote-resalte');
    return () => elemento.classList.remove('esquilote-resalte');
  }, [selector, estado?.id, estado?.paso]);

  if (!id) return null;
  if (!estado) {
    return <button type="button" className="esquilote esquilote-boton" onClick={() => { setManual(true); setEstado({ id: id as IdTutorial, paso: 0 }); }} aria-label="Abrir el tutorial con Esquilote">
      <Esquilote ancho={44} />
      <span>Tutorial</span>
    </button>;
  }
  return <TarjetaTutorial pasos={TUTORIALES[estado.id]} paso={estado.paso} onSiguiente={() => mover('siguiente')} onAnterior={() => mover('anterior')} onCerrar={() => mover('cerrar')} enfocar={manual} />;
}
