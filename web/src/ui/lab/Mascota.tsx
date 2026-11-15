// La mascota (elote) en la pantalla, no dentro de la parcela: da consejos del paso actual.
// Su imagen es el retrato del mismo .bbmodel (escena/render/retrato.ts, carga diferida).
import { useEffect, useState } from 'react';
import type { Consejo } from './consejos';

export function Mascota({ consejos, paso }: { consejos: Consejo[]; paso: string }) {
  const [imagen, setImagen] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  // En pantallas chicas empieza plegada para no tapar la parcela; se abre al tocarla.
  const amplia = () => typeof window === 'undefined' || window.innerWidth > 760;
  const [abierta, setAbierta] = useState(amplia);
  useEffect(() => {
    let activo = true;
    void import('../../escena/render/retrato').then((m) => m.retratoMascota()).then((url) => { if (activo) setImagen(url); });
    return () => { activo = false; };
  }, []);
  // Cada paso empieza por su primer consejo.
  useEffect(() => { setIndice(0); setAbierta(amplia()); }, [paso]);
  const total = consejos.length;
  const actual = total ? consejos[Math.min(indice, total - 1)]! : null;
  return <div className={`mascota${abierta && actual ? ' mascota-abierta' : ''}`}>
    {abierta && actual && <div className={`mascota-globo mascota-${actual.tono}`} role="status" aria-live="polite">
      <p>{actual.texto}</p>
      <div className="mascota-pie">
        {total > 1 && <span className="mascota-cuenta" aria-hidden="true">{Math.min(indice, total - 1) + 1}/{total}</span>}
        {total > 1 && <button type="button" onClick={() => setIndice((i) => (i + 1) % total)}>Otro consejo</button>}
        <button type="button" className="mascota-cerrar" onClick={() => setAbierta(false)} aria-label="Ocultar consejos">×</button>
      </div>
    </div>}
    <button type="button" className="mascota-boton" onClick={() => { if (abierta) setIndice((i) => (i + 1) % Math.max(1, total)); else setAbierta(true); }}
      aria-label={abierta ? 'Siguiente consejo de la mascota' : 'Mostrar consejos de la mascota'} title={abierta ? 'Otro consejo' : 'Consejos'}>
      {imagen ? <img src={imagen} alt="" width={96} height={96} /> : <span className="mascota-respaldo" aria-hidden="true" />}
    </button>
  </div>;
}
