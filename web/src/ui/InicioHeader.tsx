import { useEffect, useRef, useState } from 'react';

export function InicioHeader() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<'how' | 'resources' | null>(null);

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
  }, [panel]);

  return <>
    <header className="landing-header">
      <a className="landing-brand" href="#/" aria-label="AgroHive, inicio">
        <svg width="24" height="34" viewBox="0 0 24 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 31V8M12 10 6 5M12 10l6-5M12 16l-6 4M12 16l6 5M12 8V5M6 5 5 3M18 5l1-2" />
        </svg>
        <span>AgroHive</span>
      </a>
      <nav className="landing-navigation" aria-label="Navegación principal">
        <a href="#/laboratorio">Producto</a>
        <button type="button" onClick={() => setPanel('how')}>Cómo funciona</button>
        <a href="#/comparacion">Soluciones</a>
        <button type="button" onClick={() => setPanel('resources')}>Recursos</button>
      </nav>
      <a className="landing-demo" href="#/terreno">Explorar demo</a>
    </header>
    <dialog ref={dialog} className="landing-dialog" aria-labelledby="landing-dialog-title" onClose={() => setPanel(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="landing-dialog-content">
        <div className="landing-dialog-heading"><h2 id="landing-dialog-title">{panel === 'how' ? 'Cómo funciona AgroHive' : 'Recursos y límites'}</h2><button type="button" className="landing-close" onClick={() => dialog.current?.close()} aria-label="Cerrar información">Cerrar</button></div>
        {panel === 'how' ? <>
          <ol><li>Elige la parcela de demostración o consulta la entrada de terreno propio.</li><li>Explora los controles de cultivos, ciclos y escenarios en el laboratorio.</li><li>Abre la comparación conservando tus selecciones.</li></ol>
          <p>El laboratorio usa datos climáticos precargados y ejecuta el motor en tu navegador. Para una parcela propia consulta los datos disponibles para su ubicación. Si falta un dato o parámetro, el indicador se muestra como NO_EVALUABLE y explica el motivo.</p>
          <a className="landing-button" href="#/terreno">Explorar parcela demo</a>
        </> : <>
          <p>El clima de la demo proviene de <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER (abre otra pestaña)</a>. Representa información regional, no mediciones de cada bloque. Método y fuentes muestra el origen y los límites de los datos usados.</p>
          <p>Las ilustraciones son decorativas. La demo de Isla, Veracruz usa una parcela ficticia de 2 hectáreas, con clima y estimaciones de suelo de fuentes reales. No representa un levantamiento de campo.</p>
          <p>Los indicadores y el ranking los calcula el motor. Los supuestos y datos faltantes se declaran en el laboratorio. AgroHive no predice cosechas ni ingresos y no reemplaza asesoría agronómica.</p>
        </>}
      </div>
    </dialog>
  </>;
}
