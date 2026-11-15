// Medicion de la escena en el equipo real (A5.4, la corre Eduardo): abre web/medir.html en
// el navegador del equipo (laptop sin GPU dedicada, celular) o con herramientas/medir-escena/.
// Mide con la parcela demo (paquete sin internet), con el poligono de 518 celdas (elevacion
// de la API) y con ese poligono sembrado con una mezcla de los 4 cultivos, y prueba la perdida del contexto WebGL. No cambia nada de la app: solo monta
// EscenaParcela con datos y lee sus estadisticas.
//
// Parametros de la URL: ?api=<url de la API> (por defecto la de la app), ?viento=<segundos>
// (por defecto 10), ?reposo=<segundos> (por defecto 3), ?auto=0 para no empezar solo.

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Parcela, PlanSiembra, ResultadoCeldas, SerieBalance, SerieClima, Suelo } from '../../../../contratos/tipos/contratos';
import { obtenerTerreno, urlBase } from '../../api/cliente';
import { crearClienteMotor } from '../../motor';
import { generarCuadricula } from '../../ui/cuadricula';
import { entradasDemo, planPrueba } from '../demo-motor';
import { EscenaParcela } from '../EscenaParcela';
import type { EscenaThree, EstadisticasRender } from '../render/escena-three';

const parametros = new URLSearchParams(location.search);
const API = (parametros.get('api') ?? urlBase()).replace(/\/$/, '');
const SEG_VIENTO = Number(parametros.get('viento') ?? 10);
const SEG_REPOSO = Number(parametros.get('reposo') ?? 3);
const AUTO = parametros.get('auto') !== '0';
const POLIGONO_518: [number, number][] = [[-95.526, 18.028], [-95.5236, 18.028], [-95.5236, 18.0302], [-95.5248, 18.0302], [-95.5248, 18.0292], [-95.526, 18.0292]];
const FECHA = '2016-09-29'; // maiz en madurez en la rotacion de prueba R1 (el caso mas pesado)
const FECHA_MEZCLA = '2016-08-15'; // los 4 cultivos del ciclo 1 en etapas distintas

interface Medida {
  caso: string;
  celdas: number;
  primeraEscenaMs: number | null;
  triangulos: number;
  drawCalls: number;
  cuadrosEnReposo: number;
  segundosReposo: number;
  cuadrosPorSegundoConViento: number;
  segundosViento: number;
  memoriaMB: number | null;
  /** Intensidad de lluvia del dia medido (0 a 1); el reposo se mide con la lluvia apagada. */
  lluviaDelDia: number;
  nota?: string;
}

interface Resultado {
  fecha: string;
  url: string;
  api: string;
  navegador: string;
  gpu: { vendedor: string | null; renderer: string | null; webgl2: boolean; webgl1: boolean };
  equipo: { nucleos: number | null; memoriaGB: number | null; pantalla: string; dpr: number; tactil: boolean };
  modo: '3D' | '2D (sin WebGL)';
  /** Motor (Worker) y API: tiempo hasta tener los datos de los dos casos. */
  preparacionMs: number | null;
  medidas: Medida[];
  perdidaContexto: Awaited<ReturnType<EscenaThree['probarPerdidaContexto']>> | null;
  errores: string[];
  terminado: boolean;
}

declare global {
  interface Window {
    __medicion?: Resultado;
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function infoGpu(): Resultado['gpu'] {
  const c = document.createElement('canvas');
  const gl2 = c.getContext('webgl2');
  const gl = gl2 ?? document.createElement('canvas').getContext('webgl');
  const webgl1 = !!(gl2 ? document.createElement('canvas').getContext('webgl') : gl);
  if (!gl) return { vendedor: null, renderer: null, webgl2: false, webgl1: false };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    vendedor: ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR)),
    renderer: ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)),
    webgl2: !!gl2,
    webgl1,
  };
}

function memoriaMB(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round((m.usedJSHeapSize / 1048576) * 10) / 10 : null;
}

/** El cliente de la API pide a urlBase(); para medir contra otra API se reescribe la URL. */
const fetchApi: typeof fetch = (entrada, init) => fetch(String(entrada).replace(urlBase(), API), init);

type Caso = { nombre: string; parcela: Parcela; resultado: ResultadoCeldas | null; serie: SerieBalance | null; suelo: Suelo | null; fecha?: string; nota?: string };

async function prepararCasos(registrar: (t: string) => void): Promise<Caso[]> {
  const cliente = crearClienteMotor();
  try {
    const serie = (await import('../../../../datos/demo/respuestas/serie-clima.json')).default as unknown as SerieClima;
    const sel = await cliente.escenarios(serie);
    const casos: Caso[] = [];
    // Demo: parcela de 4 celdas del paquete sin internet.
    const demo = entradasDemo('mapa');
    await cliente.simular({ ...demo, escenarios: sel.escenarios });
    casos.push({ nombre: 'demo (4 celdas)', parcela: demo.parcela, resultado: await cliente.celdas('R1', 'seco', FECHA), serie: await cliente.serieBalance('R1', 'seco'), suelo: demo.suelo });
    registrar('Demo lista.');
    // Poligono propio: cuadricula de balam + elevacion de la API.
    const { parcela } = generarCuadricula(POLIGONO_518);
    let conTerreno: Parcela = { ...parcela, id: 'parcela-medicion-518' };
    let nota: string | undefined;
    const r = await obtenerTerreno({ tamanoCeldaM: parcela.tamanoCeldaM, celdas: parcela.celdas.map(({ id, i, j, centro }) => ({ id, i, j, centro })) }, { fetchFn: fetchApi });
    if (r.ok) {
      const alturas = new Map(r.datos.celdas.map((c) => [c.id, c]));
      conTerreno = {
        ...conTerreno,
        terreno: { estado: r.datos.terreno.estado, fuente: { nombre: r.datos.terreno.fuente.nombre } },
        celdas: parcela.celdas.map((c) => ({ ...c, elevacionM: alturas.get(c.id)?.elevacionM ?? null, pendientePct: alturas.get(c.id)?.pendientePct ?? null })) as Parcela['celdas'],
      };
    } else {
      nota = `Sin elevacion (${r.error.motivo}): las celdas se dibujan como huecos; el resto de la medicion vale.`;
    }
    await cliente.simular({ ...demo, parcela: conTerreno, plan: planPrueba(conTerreno.id), escenarios: sel.escenarios });
    casos.push({ nombre: 'poligono propio (518 celdas)', parcela: conTerreno, resultado: await cliente.celdas('R1', 'seco', FECHA), serie: await cliente.serieBalance('R1', 'seco'), suelo: demo.suelo, ...(nota ? { nota } : {}) });
    registrar('Poligono de 518 celdas listo.');
    // Mezcla: el mismo poligono con franjas de maiz, frijol, calabaza y chile en el ciclo 1
    // (plan.porCelda); a mediados de agosto cada cultivo va en una etapa distinta.
    const cultivos = ['maiz', 'frijol', 'calabaza', 'chile'];
    const planMezcla = planPrueba(conTerreno.id);
    planMezcla.porCelda = Object.fromEntries(
      conTerreno.celdas.map((c) => [c.id, [{ ciclo: 1, cultivo: cultivos[Math.floor(c.j / 4) % 4]! }, { ciclo: 2, cultivo: 'frijol' }, { ciclo: 3, cultivo: 'maiz' }]]),
    ) as PlanSiembra['porCelda'];
    await cliente.simular({ ...demo, parcela: conTerreno, plan: planMezcla, escenarios: sel.escenarios });
    casos.push({ nombre: 'mezcla de 4 cultivos (518 celdas)', parcela: conTerreno, resultado: await cliente.celdas('R1', 'seco', FECHA_MEZCLA), serie: await cliente.serieBalance('R1', 'seco'), suelo: demo.suelo, fecha: FECHA_MEZCLA, ...(nota ? { nota } : {}) });
    registrar('Mezcla de cultivos lista.');
    return casos;
  } finally {
    cliente.terminar();
  }
}

function Medidor() {
  const [caso, setCaso] = useState<Caso | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [bitacora, setBitacora] = useState<string[]>([]);
  const escena = useRef<EscenaThree | null>(null);
  const inicioCaso = useRef(0);
  const registrar = (t: string) => setBitacora((b) => [...b, t]);

  const medir = async () => {
    const gpu = infoGpu();
    const r: Resultado = {
      fecha: new Date().toISOString(),
      url: location.href,
      api: API,
      navegador: navigator.userAgent,
      gpu,
      equipo: {
        nucleos: navigator.hardwareConcurrency ?? null,
        memoriaGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
        pantalla: `${screen.width}x${screen.height}`,
        dpr: devicePixelRatio,
        tactil: navigator.maxTouchPoints > 0,
      },
      modo: gpu.webgl1 || gpu.webgl2 ? '3D' : '2D (sin WebGL)',
      preparacionMs: null,
      medidas: [],
      perdidaContexto: null,
      errores: [],
      terminado: false,
    };
    window.__medicion = r;
    setResultado({ ...r });
    if (r.modo !== '3D') {
      r.terminado = true;
      setResultado({ ...r });
      return;
    }
    try {
      registrar('Preparando datos (motor y API)...');
      const t0Prep = performance.now();
      const casos = await prepararCasos(registrar);
      r.preparacionMs = Math.round(performance.now() - t0Prep);
      for (const c of casos) {
        registrar(`Midiendo ${c.nombre}...`);
        escena.current = null;
        inicioCaso.current = performance.now();
        setCaso(c);
        // Primera escena: la escena existe y ya dibujo plantas (mallas de terreno + plantas).
        let primera: number | null = null;
        for (let t = 0; t < 30000; t += 100) {
          // escena.current lo pone onEscena desde React (TypeScript no lo ve cambiar).
          const st = (escena.current as EscenaThree | null)?.estadisticas();
          if (st && st.cuadros > 0 && st.mallas >= 3) {
            primera = Math.round(performance.now() - inicioCaso.current);
            break;
          }
          await esperar(100);
        }
        await esperar(1500); // que terminen las transiciones y la carga de modelos
        const e = escena.current as EscenaThree | null;
        if (!e) throw new Error('La escena no se creo.');
        // Reposo sin lluvia (si ese dia llueve, la lluvia anima a proposito y se reporta aparte).
        const lluvia = e.intensidadLluviaActual();
        e.setLluvia(0);
        await esperar(300);
        const quieto: EstadisticasRender = e.estadisticas();
        await esperar(SEG_REPOSO * 1000);
        const tras: EstadisticasRender = e.estadisticas();
        e.setLluvia(lluvia);
        // Con viento la escena dibuja sin parar: cuadros/s reales del equipo.
        const viento = [...document.querySelectorAll('.escena-check')].find((l) => l.textContent?.includes('Viento'))?.querySelector('input');
        viento?.click();
        await esperar(500);
        const a = e.estadisticas();
        const t0 = performance.now();
        await esperar(SEG_VIENTO * 1000);
        const b = e.estadisticas();
        const segundos = (performance.now() - t0) / 1000;
        viento?.click();
        r.medidas.push({
          caso: c.nombre,
          celdas: c.parcela.celdas.length,
          primeraEscenaMs: primera,
          triangulos: quieto.triangulos,
          drawCalls: quieto.drawCalls,
          cuadrosEnReposo: tras.cuadros - quieto.cuadros,
          segundosReposo: SEG_REPOSO,
          cuadrosPorSegundoConViento: Math.round(((b.cuadros - a.cuadros) / segundos) * 10) / 10,
          segundosViento: SEG_VIENTO,
          memoriaMB: memoriaMB(),
          lluviaDelDia: Math.round(lluvia * 100) / 100,
          ...(c.nota ? { nota: c.nota } : {}),
        });
        setResultado({ ...r });
      }
      registrar('Probando la perdida del contexto WebGL...');
      r.perdidaContexto = (await escena.current?.probarPerdidaContexto()) ?? null;
    } catch (e) {
      r.errores.push(e instanceof Error ? e.message : String(e));
    }
    r.terminado = true;
    window.__medicion = r;
    setResultado({ ...r });
    registrar('Medicion terminada.');
  };

  // Una sola medicion aunque React (modo estricto) monte el efecto dos veces.
  const iniciada = useRef(false);
  useEffect(() => {
    if (AUTO && !iniciada.current) {
      iniciada.current = true;
      void medir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const json = resultado ? JSON.stringify(resultado, null, 2) : '';
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', color: '#183e32' }}>
      <h1 style={{ fontSize: '1.2rem' }}>Medición de la escena 3D (A5.4)</h1>
      <p style={{ fontSize: '0.85rem' }}>
        Mide este equipo con la parcela demo y con un polígono de 518 celdas. Tarda unos {Math.round(2 * (SEG_VIENTO + SEG_REPOSO) + 30)} s. API: {API || '(mismo origen)'}.
      </p>
      {!AUTO && !resultado && (
        <button
          type="button"
          onClick={() => {
            if (iniciada.current) return;
            iniciada.current = true;
            void medir();
          }}
          style={{ minHeight: 44, padding: '8px 16px' }}
        >
          Empezar medición
        </button>
      )}
      <ul aria-live="polite" style={{ fontSize: '0.8rem' }}>
        {bitacora.map((b, k) => (
          <li key={k}>{b}</li>
        ))}
      </ul>
      {resultado && (
        <section aria-label="Resultado">
          <p>
            <strong>{resultado.terminado ? 'Terminado' : 'Midiendo...'}</strong> · Modo {resultado.modo} · GPU: {resultado.gpu.renderer ?? 'desconocida'} · WebGL2 {resultado.gpu.webgl2 ? 'sí' : 'no'}
          </p>
          <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Caso', 'Celdas', 'Primera escena (ms)', 'Triángulos', 'Draw calls', 'Cuadros en reposo', 'Cuadros/s con viento', 'Memoria (MB)'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid #ccc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultado.medidas.map((m) => (
                <tr key={m.caso}>
                  {[m.caso, m.celdas, m.primeraEscenaMs ?? 'sin dato', m.triangulos, m.drawCalls, `${m.cuadrosEnReposo} en ${m.segundosReposo} s`, m.cuadrosPorSegundoConViento, m.memoriaMB ?? 'no disponible'].map((v, k) => (
                    <td key={k} style={{ padding: 4 }}>{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {resultado.perdidaContexto && (
            <p style={{ fontSize: '0.85rem' }}>
              Pérdida de contexto: {resultado.perdidaContexto.extension ? `perdido ${resultado.perdidaContexto.perdido ? 'sí' : 'no'}, recuperado ${resultado.perdidaContexto.restaurado ? 'sí' : 'no'} (${resultado.perdidaContexto.cuadrosTras} cuadros tras restaurar)` : 'el navegador no ofrece WEBGL_lose_context'}.
            </p>
          )}
          {resultado.terminado && (
            <button type="button" style={{ minHeight: 44, padding: '8px 16px' }} onClick={() => void navigator.clipboard?.writeText(json)}>
              Copiar JSON
            </button>
          )}
          <details>
            <summary>JSON completo</summary>
            <pre style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>{json}</pre>
          </details>
        </section>
      )}
      {caso && (
        <div style={{ marginTop: 16 }}>
          <EscenaParcela
            key={caso.nombre}
            parcela={caso.parcela}
            resultado={caso.resultado}
            fecha={caso.fecha ?? FECHA}
            suelo={caso.suelo}
            serieBalance={caso.serie}
            onEscena={(e) => {
              escena.current = e;
            }}
          />
        </div>
      )}
    </main>
  );
}

const raiz = document.getElementById('medir-raiz');
if (raiz) createRoot(raiz).render(<StrictMode><Medidor /></StrictMode>);
