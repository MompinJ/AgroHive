// Vista previa aislada de la escena (solo desarrollo): `npm run dev` y abrir
// /escena.html. Sin tocar App.tsx ni las paginas de balam.
// Fuente "motor": el motor real en su Web Worker (crearClienteMotor) con el
// paquete de demo sin internet (datos/demo/respuestas/). Fuente "ejemplo": los
// ejemplos de contratos/ (DATOS DE EJEMPLO, NO REALES).

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import parcelaEjemplo from '../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { CatalogoCultivos, Escenario, Parcela, ProximaTemporadaAproximada, ResultadoCeldas, SerieBalance, SerieClima, Suelo } from '../../../contratos/tipos/contratos';
import { crearClienteMotor, type ClienteMotor } from '../motor';
import { avisosDe, type AvisoDatos } from '../api/datosParcela';
import {
  planPrueba,
  entradasCarga,
  entradasDemo,
  fechasPlan,
  parcelaCargaSintetica,
  parcelaConTerrenoDemo,
  parcelaCuadriculaBalam,
  ROTACIONES_PRUEBA,
  type ModoSuelo,
  type RotacionPrueba,
} from './demo-motor';
import type { EscenaThree } from './render/escena-three';

// Para medir rendimiento desde una prueba automatizada (A5.4): window.escenaPrueba.estadisticas().
declare global {
  interface Window {
    escenaPrueba?: EscenaThree | null;
  }
}
import { EscenaParcela } from './EscenaParcela';

type Fuente = 'motor' | 'cuadricula' | 'carga' | 'ejemplo';

const ESCENARIOS: Escenario[] = ['seco', 'habitual', 'lluvioso'];
const FECHAS = fechasPlan();
const estiloFila = { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 44 } as const;

function VistaPrevia() {
  const [fuente, setFuente] = useState<Fuente>('motor');
  const [suelo, setSuelo] = useState<ModoSuelo>('manual_franco');
  const [escenario, setEscenario] = useState<Escenario>('seco');
  const [rotacion, setRotacion] = useState<RotacionPrueba>('R1');
  const [indiceFecha, setIndiceFecha] = useState(4);
  const [cliente, setCliente] = useState<ClienteMotor | null>(null);
  const [listo, setListo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCeldas | null>(null);
  const [estado, setEstado] = useState('');
  const [avisosDatos, setAvisosDatos] = useState<AvisoDatos[]>([]);
  const [serieBal, setSerieBal] = useState<SerieBalance | null>(null);

  // Avisos reales del paquete de demo, como los daria usarDatosParcela con la API.
  useEffect(() => {
    void Promise.all([
      import('../../../datos/demo/respuestas/serie-clima.json'),
      import('../../../datos/demo/respuestas/suelo.json'),
      import('../../../datos/demo/respuestas/proxima-temporada.json'),
      import('../../../datos/catalogos/cultivos.json'),
    ]).then(([c, s, p, k]) =>
      setAvisosDatos(
        avisosDe({
          clima: { ok: true, datos: c.default as unknown as SerieClima },
          suelo: { ok: true, datos: s.default as unknown as Suelo },
          proximaTemporada: { ok: true, datos: p.default as unknown as ProximaTemporadaAproximada },
          cultivos: { ok: true, datos: k.default as unknown as CatalogoCultivos },
        }),
      ),
    );
  }, []);

  const parcelaMotor = useMemo(() => parcelaConTerrenoDemo(), []);
  const parcelaCarga = useMemo(() => parcelaCargaSintetica(), []);
  const [parcelaBalam, setParcelaBalam] = useState<Parcela | null>(null);
  const parcela =
    fuente === 'motor' ? parcelaMotor : fuente === 'carga' ? parcelaCarga : fuente === 'cuadricula' ? (parcelaBalam ?? parcelaMotor) : (parcelaEjemplo as unknown as Parcela);
  const conMotor = fuente !== 'ejemplo' && (fuente !== 'cuadricula' || parcelaBalam !== null);
  const sueloEscena = useMemo(() => (fuente === 'ejemplo' ? null : entradasDemo(suelo).suelo), [fuente, suelo]);
  const idRotacion: RotacionPrueba = fuente === 'carga' ? 'R1' : rotacion;

  useEffect(() => {
    if (fuente !== 'cuadricula' || parcelaBalam) return;
    setEstado('Generando la cuadricula y pidiendo la elevacion...');
    void parcelaCuadriculaBalam().then(({ parcela: p, nota }) => {
      setParcelaBalam(p);
      console.info(`[escena] ${nota}`);
    });
  }, [fuente, parcelaBalam]);
  const fecha = FECHAS[indiceFecha] ?? FECHAS[0]!;

  useEffect(() => {
    const c = crearClienteMotor();
    setCliente(c);
    return () => c.terminar();
  }, []);

  // Simula la rotacion de prueba cuando cambia el suelo (el plan y el clima son fijos).
  useEffect(() => {
    if (!cliente || !conMotor) return;
    let vigente = true;
    setListo(false);
    setEstado('Calculando con el motor...');
    void (async () => {
      try {
        const serie = (await import('../../../datos/demo/respuestas/serie-clima.json')).default as unknown as SerieClima;
        const sel = await cliente.escenarios(serie);
        const entradas =
          fuente === 'carga'
            ? entradasCarga(suelo)
            : fuente === 'cuadricula' && parcelaBalam
              ? { ...entradasDemo(suelo, rotacion), parcela: parcelaBalam, plan: planPrueba(parcelaBalam.id, rotacion) }
              : entradasDemo(suelo, rotacion);
        const t0 = performance.now();
        await cliente.simular({ ...entradas, escenarios: sel.escenarios });
        console.info(`[escena] motor: simular ${entradas.parcela.celdas.length} celdas en ${Math.round(performance.now() - t0)} ms`);
        if (vigente) setListo(true);
      } catch (e) {
        if (vigente) setEstado(`El motor no respondio: ${(e as Error).message}`);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [cliente, fuente, conMotor, suelo, rotacion, parcelaBalam]);

  // Serie del balance (lluvia del dia y demas columnas) de la rotacion y el escenario elegidos.
  useEffect(() => {
    if (!cliente || !listo || fuente === 'ejemplo') return;
    let vigente = true;
    cliente
      .serieBalance(idRotacion, escenario)
      .then((s) => {
        if (vigente) setSerieBal(s);
      })
      .catch(() => {
        if (vigente) setSerieBal(null);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, listo, fuente, escenario, idRotacion]);

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
      .celdas(idRotacion, escenario, fecha)
      .then((r) => {
        // Un resultado de la rotacion anterior (otra parcela) se descarta mientras se recalcula.
        if (!vigente || r.parcelaId !== parcela.id) return;
        setResultado(r);
        setEstado(`Motor: ${idRotacion}, escenario ${escenario} (anio real ${r.anioReal}), fecha del plan ${fecha}.`);
      })
      .catch((e: Error) => {
        if (!vigente) return;
        setResultado(null);
        setEstado(`Sin resultado por celda: ${e.message}`);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, listo, fuente, escenario, fecha, parcela.id, idRotacion]);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', color: '#183e32' }}>
      <h1 style={{ fontSize: '1.2rem' }}>Vista previa de la escena (A3.1, A3.2)</h1>
      <fieldset style={{ display: 'grid', gap: 4, border: '1px solid #d8ded3', borderRadius: 8, marginBottom: 12, minWidth: 0 }}>
        <legend>Datos</legend>
        <div style={estiloFila}>
          <label>
            Fuente{' '}
            <select value={fuente} onChange={(e) => setFuente(e.target.value as Fuente)}>
              <option value="motor">Motor real + paquete de demo</option>
              <option value="cuadricula">Cuadricula de balam (poligono en L) + elevacion de la API</option>
              <option value="carga">Prueba de carga: 1600 celdas sinteticas (no son datos)</option>
              <option value="ejemplo">Ejemplo de contratos (ficticio)</option>
            </select>
          </label>
          {conMotor && (
            <>
              {(fuente === 'motor' || fuente === 'cuadricula') && (
                <label>
                  Rotacion{' '}
                  <select value={rotacion} onChange={(e) => setRotacion(e.target.value as RotacionPrueba)}>
                    <option value="R1">R1: maiz, frijol, maiz</option>
                    <option value="R2">R2: calabaza, frijol, maiz</option>
                  </select>
                </label>
              )}
              <label>
                Suelo{' '}
                <select value={suelo} onChange={(e) => setSuelo(e.target.value as ModoSuelo)}>
                  <option value="manual_franco">Selector manual: franco (SUPUESTO)</option>
                  <option value="mapa">Del mapa (TAW de Saxton y Rawls, SUPUESTO)</option>
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
        {conMotor && (
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
          {conMotor
            ? `Plan de prueba ${idRotacion} sin calendario local: ${ROTACIONES_PRUEBA[idRotacion].map(([c, f, t]) => `${c} (${t} ${f.slice(0, 4)})`).join(', ')}. `
            : ''}
          {estado}
        </p>
      </fieldset>
      <EscenaParcela
        parcela={parcela}
        resultado={resultado}
        suelo={sueloEscena}
        avisosDatos={fuente === 'ejemplo' ? [] : avisosDatos}
        serieBalance={fuente === 'ejemplo' ? null : serieBal}
        onEscena={(e) => {
          window.escenaPrueba = e;
        }}
      />
    </main>
  );
}

const raiz = document.getElementById('escena-raiz');
if (raiz) createRoot(raiz).render(<StrictMode><VistaPrevia /></StrictMode>);
