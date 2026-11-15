import type { ReactNode } from 'react';
import { IconoBicho, IconoBrocha, IconoCalendario, IconoCubeta, IconoDeshacer, IconoEscudo, IconoGoma, IconoInsecticida, IconoMano, IconoRehacer } from '../lab/iconos';
import { partes, recortar, type NombreIcono } from './texto';

const ICONOS: Record<NombreIcono, () => ReactNode> = {
  brocha: IconoBrocha, goma: IconoGoma, mover: IconoMano, insecticida: IconoInsecticida, bicho: IconoBicho,
  escudo: IconoEscudo, deshacer: IconoDeshacer, rehacer: IconoRehacer, cubeta: IconoCubeta, calendario: IconoCalendario,
};

/** Texto con los iconos de las herramientas en linea. `visibles` limita cuantas posiciones se muestran (efecto de escritura). */
export function TextoConIconos({ texto, visibles }: { texto: string; visibles?: number }) {
  const todas = partes(texto);
  const ps = visibles === undefined ? todas : recortar(todas, visibles);
  return <>{ps.map((p, k) => (p.tipo === 'texto' ? <span key={k}>{p.valor}</span> : <span key={k} className={`icono-en-texto icono-${p.nombre}`}>{ICONOS[p.nombre]()}</span>))}</>;
}
