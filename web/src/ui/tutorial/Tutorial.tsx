// Tutorial guiado por Esquilote. La primera vez que se entra a cada pantalla del flujo se abre solo; despues,
// el boton con la mascota lo vuelve a abrir. No bloquea la pantalla: es una tarjeta que se puede ignorar o cerrar
// (Escape tambien). Esquilote escribe el texto de a poco y "habla" mientras tanto; un anillo encierra e ilumina el
// componente del que habla, si esta en pantalla.
import { useEffect, useState } from 'react';
import { usePage } from '../navigation';
import { Esquilote } from './Esquilote';
import { Resalte } from './Resalte';
import { TextoConIconos } from './TextoConIconos';
import { useEscribir } from './useEscribir';
import { PENTATONICA, tocar } from '../sonido';
import { textoPlano } from './texto';
import { marcarVisto, navegar, TUTORIALES, tutorialDeRuta, tutorialVisto, type EstadoTutorial, type IdTutorial, type PasoTutorial } from './pasos';
import './tutorial.css';

export function TarjetaTutorial({ pasos, paso, onSiguiente, onAnterior, onCerrar, enfocar = false }: {
  pasos: readonly PasoTutorial[]; paso: number; onSiguiente: () => void; onAnterior: () => void; onCerrar: () => void; enfocar?: boolean;
}) {
  const actual = pasos[paso]!;
  const ultimo = paso === pasos.length - 1;
  // El texto se escribe de a poco y Esquilote "habla" mientras tanto; tocar el texto lo completa.
  // Cada tres letras, un blip suave de la escala pentatonica: Esquilote "habla".
  const { visibles, escribiendo, completar } = useEscribir(actual.texto, (k) => { if (k % 3 === 0) tocar('habla', PENTATONICA[(k / 3) % PENTATONICA.length]! / PENTATONICA[2]!); });
  return <section className="esquilote esquilote-tarjeta" role="dialog" aria-modal="false" aria-labelledby="esquilote-titulo" aria-describedby="esquilote-texto">
    <Esquilote saluda={paso === 0 && !escribiendo} habla={escribiendo} />
    <div className="esquilote-cuerpo">
      <p className="esquilote-nombre">Esquilote · paso {paso + 1} de {pasos.length}</p>
      <h2 id="esquilote-titulo">{actual.titulo}</h2>
      <p id="esquilote-texto" aria-live="polite" aria-label={textoPlano(actual.texto)} onClick={completar}><TextoConIconos texto={actual.texto} visibles={visibles} /></p>
      <div className="esquilote-acciones">
        <button type="button" className="esquilote-saltar" data-sin-sonido onClick={onCerrar}>{ultimo ? 'Cerrar' : 'Saltar tutorial'}</button>
        {paso > 0 && <button type="button" className="esquilote-atras" data-sin-sonido onClick={onAnterior}>Anterior</button>}
        <button type="button" className="esquilote-siguiente" data-sin-sonido onClick={onSiguiente} autoFocus={enfocar}>{ultimo ? '¡Entendido!' : 'Siguiente'}</button>
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
    tocar(accion === 'cerrar' ? 'clic' : 'paso');
    const siguiente = navegar(estado, accion);
    if (siguiente) setEstado(siguiente); else terminar(estado);
  };

  // Con la tarjeta abierta, los consejos de la mascota de la pantalla se ocultan: Esquilote habla una sola vez.
  const guiando = estado !== null;
  useEffect(() => {
    document.body.classList.toggle('esquilote-guia', guiando);
    return () => document.body.classList.remove('esquilote-guia');
  }, [guiando]);

  // Escape cierra la tarjeta.
  useEffect(() => {
    if (!estado) return;
    const alTeclear = (ev: KeyboardEvent) => { if (ev.key === 'Escape') terminar(estado); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [estado]);

  const selector = estado ? TUTORIALES[estado.id][estado.paso]?.destacar : undefined;

  if (!id) return null;
  if (!estado) {
    return <button type="button" className="esquilote esquilote-boton" onClick={() => { setManual(true); setEstado({ id: id as IdTutorial, paso: 0 }); }} aria-label="Abrir el tutorial con Esquilote">
      <Esquilote ancho={44} />
      <span>Tutorial</span>
    </button>;
  }
  return <>
    <Resalte selector={selector} />
    <TarjetaTutorial pasos={TUTORIALES[estado.id]} paso={estado.paso} onSiguiente={() => mover('siguiente')} onAnterior={() => mover('anterior')} onCerrar={() => mover('cerrar')} enfocar={manual} />
  </>;
}
