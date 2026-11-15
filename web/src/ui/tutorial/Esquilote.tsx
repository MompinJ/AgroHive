// Esquilote, el elote mascota de AgroHive. Se dibuja con el retrato del modelo voxel 3D de la mascota
// (escena/render/retrato.ts), el mismo de los consejos de la pantalla: es un solo personaje. No hay dibujo 2D
// de respaldo; sin WebGL queda el hueco (el texto del tutorial lleva el sentido). Decorativo.
import { useEffect, useState } from 'react';

export function Esquilote({ ancho = 84, saluda = false, habla = false }: { ancho?: number; saluda?: boolean; habla?: boolean }) {
  const [retrato, setRetrato] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    void import('../../escena/render/retrato').then((m) => m.retratoMascota()).then((url) => { if (activo) setRetrato(url); }).catch(() => {});
    return () => { activo = false; };
  }, []);
  return <span className={`esquilote-dibujo${saluda ? ' esquilote-saluda' : ''}${habla ? ' esquilote-habla' : ''}`} style={{ width: ancho, height: ancho }} aria-hidden="true">
    {retrato ? <img src={retrato} alt="" width={ancho} height={ancho} /> : null}
  </span>;
}
