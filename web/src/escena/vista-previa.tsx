// Vista previa aislada de la escena (solo desarrollo): `npm run dev` y abrir
// /escena.html. Usa los ejemplos de contratos/ (DATOS DE EJEMPLO, NO REALES),
// sin tocar App.tsx ni las paginas de balam.

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import parcelaEjemplo from '../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { Parcela, ResultadoCeldas } from '../../../contratos/tipos/contratos';
import { EscenaParcela } from './EscenaParcela';

// El JSON importado ensancha los enums a string; los ejemplos ya validan contra su schema en contratos/.
const parcela = parcelaEjemplo as Parcela;
const resultado = resultadoEjemplo as ResultadoCeldas;

function VistaPrevia() {
  const [conResultado, setConResultado] = useState(true);
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.2rem' }}>Vista previa de la escena (A3.1, A3.2)</h1>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
        <input type="checkbox" checked={conResultado} onChange={(e) => setConResultado(e.target.checked)} />
        Con resultado del motor (ejemplo R1, seco, ciclo 2)
      </label>
      <EscenaParcela parcela={parcela} resultado={conResultado ? resultado : null} />
    </main>
  );
}

const raiz = document.getElementById('escena-raiz');
if (raiz) createRoot(raiz).render(<StrictMode><VistaPrevia /></StrictMode>);
