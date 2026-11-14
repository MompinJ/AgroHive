// Vista previa aislada de la escena (solo desarrollo): `npm run dev` y abrir
// /escena.html. Sin tocar App.tsx ni las paginas de balam.
// Fuente "motor": el motor real en su Web Worker (crearClienteMotor) con el
// paquete de demo sin internet (datos/demo/respuestas/). Fuente "ejemplo": los
// ejemplos de contratos/ (DATOS DE EJEMPLO, NO REALES).

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import parcelaEjemplo from '../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { Escenario, Parcela, ResultadoCeldas, SerieClima } from '../../../contratos/tipos/contratos';
import { crearClienteMotor, type ClienteMotor } from '../motor';
import { entradasDemo, fechasPlan, parcelaConTerrenoDemo, type ModoSuelo } from './demo-motor';
import { EscenaParcela } from './EscenaParcela';

type Fuente = 'motor' | 'ejemplo';

const ESCENARIOS: Escenario[] = ['seco', 'habitual', 'lluvioso'];
const FECHAS = fechasPlan();
const estiloFila = { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 44 } as const;

function VistaPrevia() {
  const [fuente, setFuente] = useState<Fuente>('motor');
  const [suelo, setSuelo] = useState<ModoSuelo>('manual_franco');
  const [escenario, setEscenario] = useState<Escenario>('seco');
  const [indiceFecha, setIndiceFecha] = useState(4);
  const [cliente, setCliente] = useState<ClienteMotor | null>(null);
  const [listo, setListo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCeldas | null>(null);
  const [estado, setEstado] = useState('');

  const parcelaMotor = useMemo(() => parcelaConTerrenoDemo(), []);
  const parcela = fuente === 'motor' ? parcelaMotor : (parcelaEjemplo as unknown as Parcela);
  const fecha = FECHAS[indiceFecha] ?? FECHAS[0]!;

  useEffect(() => {
    const c = crearClienteMotor();
    setCliente(c);
    return () => c.terminar();
  }, []);

  // Simula la rotacion de prueba cuando cambia el suelo (el plan y el clima son fijos).
  useEffect(() => {
    if (!cliente || fuente !== 'motor') return;
    let vigente = true;
    setListo(false);
    setEstado('Calculando con el motor...');
    void (async () => {
      try {
        const serie = (await import('../../../datos/demo/respuestas/serie-clima.json')).default as unknown as SerieClima;
        const sel = await cliente.escenarios(serie);
        await cliente.simular({ ...entradasDemo(suelo), escenarios: sel.escenarios });
        if (vigente) setListo(true);
      } catch (e) {
        if (vigente) setEstado(`El motor no respondio: ${(e as Error).message}`);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [cliente, fuente, suelo]);

  // Pide al motor el resultado por celda de la fecha y el escenario elegidos.
  useEffect(() => {
    if (fuente === 'ejemplo') {
      setResultado(resultadoEjemplo as unknown as ResultadoCeldas);
      setEstado('');
      return;
    }
    if (!cliente || !listo) return;
    let vigente = true;
    cliente
      .celdas('R1', escenario, fecha)
      .then((r) => {
        if (!vigente) return;
        setResultado(r);
        setEstado(`Motor: R1, escenario ${escenario} (anio real ${r.anioReal}), fecha del plan ${fecha}.`);
      })
      .catch((e: Error) => {
        if (!vigente) return;
        setResultado(null);
        setEstado(`Sin resultado por celda: ${e.message}`);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, listo, fuente, escenario, fecha]);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', color: '#183e32' }}>
      <h1 style={{ fontSize: '1.2rem' }}>Vista previa de la escena (A3.1, A3.2)</h1>
      <fieldset style={{ display: 'grid', gap: 4, border: '1px solid #d8ded3', borderRadius: 8, marginBottom: 12 }}>
        <legend>Datos</legend>
        <div style={estiloFila}>
          <label>
            Fuente{' '}
            <select value={fuente} onChange={(e) => setFuente(e.target.value as Fuente)}>
              <option value="motor">Motor real + paquete de demo</option>
              <option value="ejemplo">Ejemplo de contratos (ficticio)</option>
            </select>
          </label>
          {fuente === 'motor' && (
            <>
              <label>
                Suelo{' '}
                <select value={suelo} onChange={(e) => setSuelo(e.target.value as ModoSuelo)}>
                  <option value="manual_franco">Selector manual: franco (SUPUESTO)</option>
                  <option value="mapa">Del mapa (TAW NO_EVALUABLE hasta A2.16)</option>
                </select>
              </label>
              <label>
                Escenario{' '}
                <select value={escenario} onChange={(e) => setEscenario(e.target.value as Escenario)}>
                  {ESCENARIOS.map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        {fuente === 'motor' && (
          <label style={estiloFila}>
            Fecha del plan: <strong>{fecha}</strong>
            <input
              type="range"
              min={0}
              max={FECHAS.length - 1}
              value={indiceFecha}
              onChange={(e) => setIndiceFecha(Number(e.target.value))}
              style={{ flex: 1, minWidth: 200 }}
            />
          </label>
        )}
        <p style={{ margin: 0, fontSize: '0.8rem' }} role="status">
          {fuente === 'motor'
            ? 'Plan de prueba R1: maiz (PV 2016), frijol (OI 2016), maiz (PV 2017). '
            : ''}
          {estado}
        </p>
      </fieldset>
      <EscenaParcela parcela={parcela} resultado={resultado} />
    </main>
  );
}

const raiz = document.getElementById('escena-raiz');
if (raiz) createRoot(raiz).render(<StrictMode><VistaPrevia /></StrictMode>);
