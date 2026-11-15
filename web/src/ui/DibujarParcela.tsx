// Editor del contorno de la parcela (paso 1). El mapa ocupa el editor; encima van la barra de
// herramientas con iconos, el resumen y la accion final. La cuadricula se genera sola al tener
// un contorno valido; "Usar esta parcela" consulta la elevacion, guarda y abre el laboratorio.
import { forwardRef, lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { LonLat, Parcela } from '../../../contratos/tipos/contratos';
import { obtenerTerreno } from '../api/cliente';
import { generarCuadricula, type Cuadricula } from './cuadricula';
import { SelectorTamanoCelda } from './SelectorTamanoCelda';
import { describirCelda } from '../geo/escala-celda';
import type { PedidoTamano } from '../geo/tamano-celda';

const MapaParcela = lazy(() => import('./MapaParcela'));
const sinBordes: LonLat[][] = [];
const LIMITE = 200;

function Icono({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const iconos = {
  deshacer: <Icono><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icono>,
  borrar: <Icono><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></Icono>,
  coordenadas: <Icono><circle cx="12" cy="12" r="7" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></Icono>,
  centrar: <Icono><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /><rect x="9" y="9" width="6" height="6" rx="1" /></Icono>,
  acercar: <Icono><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></Icono>,
  alejar: <Icono><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" /></Icono>,
  ayuda: <Icono><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" /><path d="M12 17h.01" /></Icono>,
};

const BotonHerramienta = forwardRef<HTMLButtonElement, { nombre: string; icono: ReactNode; onClick: () => void; disabled?: boolean; activo?: boolean }>(
  ({ nombre, icono, onClick, disabled = false, activo }, ref) => <button ref={ref} type="button" className="dibujo-herramienta" aria-label={nombre} title={nombre} disabled={disabled} aria-pressed={activo} onClick={onClick}>
    {icono}<span className="dibujo-tooltip" aria-hidden="true">{nombre}</span>
  </button>,
);

type Estado = { tipo: 'nada' } | { tipo: 'consultando' } | { tipo: 'error'; mensaje: string };

export function DibujarParcela({ onGuardar, guardada }: { onGuardar: (p: Parcela) => void; guardada: Parcela | null }) {
  const id = useId();
  const [puntos, setPuntos] = useState<LonLat[]>(() => guardada?.origen === 'poligono_usuario' ? guardada.poligono.slice(0, -1) : []);
  const [historial, setHistorial] = useState<LonLat[][]>([]);
  const [centrar, setCentrar] = useState(0);
  const [coordenadas, setCoordenadas] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [longitud, setLongitud] = useState('');
  const [latitud, setLatitud] = useState('');
  const [errorCoordenadas, setErrorCoordenadas] = useState('');
  const [aviso, setAviso] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'nada' });
  // Lado de celda pedido (escala elegida, Mompin 14/11 noche); 'auto' es la regla de siempre.
  const [tamano, setTamano] = useState<PedidoTamano>('auto');
  const peticion = useRef<AbortController | null>(null);
  const botonCoordenadas = useRef<HTMLButtonElement>(null);
  useEffect(() => () => peticion.current?.abort(), []);

  // La cuadricula se genera sola con un contorno de 3 o mas vertices.
  const cuadricula = useMemo<{ ok: true; valor: Cuadricula } | { ok: false; motivo: string } | null>(() => {
    if (puntos.length < 3) return null;
    try { return { ok: true, valor: generarCuadricula(puntos, { tamanoCeldaM: tamano }) }; }
    catch (e) { return { ok: false, motivo: e instanceof Error ? e.message : 'No se pudo generar la cuadrícula.' }; }
  }, [puntos, tamano]);

  function cambiar(nuevos: LonLat[]) {
    peticion.current?.abort();
    setEstado({ tipo: 'nada' });
    setAviso('');
    setHistorial((h) => [...h.slice(-49), puntos]);
    setPuntos(nuevos);
  }
  function agregar(p: LonLat) {
    if (puntos.length >= LIMITE) { setAviso(`El límite es de ${LIMITE} vértices.`); return; }
    cambiar([...puntos, p]);
  }
  const mover = (i: number, p: LonLat) => cambiar(puntos.map((x, k) => (k === i ? p : x)));
  const insertar = (i: number, p: LonLat) => {
    if (puntos.length >= LIMITE) { setAviso(`El límite es de ${LIMITE} vértices.`); return; }
    cambiar([...puntos.slice(0, i), p, ...puntos.slice(i)]);
  };
  const borrar = (i: number) => cambiar(puntos.filter((_, k) => k !== i));
  function deshacer() {
    const anterior = historial.at(-1);
    if (!anterior) return;
    peticion.current?.abort();
    setEstado({ tipo: 'nada' });
    setHistorial((h) => h.slice(0, -1));
    setPuntos(anterior);
  }

  function construir(c: Cuadricula, datos?: Awaited<ReturnType<typeof obtenerTerreno>> & { ok: true }): Parcela {
    if (!datos) return c.parcela;
    const alturas = new Map(datos.datos.celdas.map((x) => [x.id, x]));
    const f = datos.datos.terreno.fuente;
    const fuente: Parcela['terreno']['fuente'] = {
      nombre: f.nombre,
      ...(f.url != null ? { url: f.url } : {}),
      ...(f.cita != null ? { cita: f.cita } : {}),
      ...(f.coordenada != null ? { coordenada: f.coordenada } : {}),
      ...(f.periodo != null ? { periodo: f.periodo } : {}),
      ...(f.unidades != null ? { unidades: f.unidades } : {}),
      ...(f.consultado != null ? { consultado: f.consultado } : {}),
      ...(f.resolucion != null ? { resolucion: f.resolucion } : {}),
      ...(f.nota != null ? { nota: f.nota } : {}),
    };
    return {
      ...c.parcela, terreno: { estado: datos.datos.terreno.estado, fuente },
      celdas: c.parcela.celdas.map((x) => ({ ...x, elevacionM: alturas.get(x.id)?.elevacionM ?? null, pendientePct: alturas.get(x.id)?.pendientePct ?? null })) as Parcela['celdas'],
      advertencias: [...(c.parcela.advertencias ?? []), ...datos.datos.advertencias, ...(datos.datos.meta.esEjemplo ? [{ codigo: 'ELEVACION_DE_EJEMPLO', severidad: 'critico' as const, mensaje: 'La elevación recibida es de ejemplo, no corresponde a mediciones reales.' }] : [])],
    };
  }
  function usar(parcela: Parcela) {
    onGuardar(parcela);
    window.location.hash = '/laboratorio';
  }
  async function confirmar() {
    if (!cuadricula?.ok) return;
    const c = cuadricula.valor;
    peticion.current?.abort();
    const control = new AbortController();
    peticion.current = control;
    setEstado({ tipo: 'consultando' });
    const r = await obtenerTerreno({ tamanoCeldaM: c.parcela.tamanoCeldaM, celdas: c.parcela.celdas.map(({ id: celda, i, j, centro }) => ({ id: celda, i, j, centro })) }, { senal: control.signal });
    if (control.signal.aborted) return;
    if (!r.ok) { setEstado({ tipo: 'error', mensaje: r.error.motivo }); return; }
    setEstado({ tipo: 'nada' });
    usar(construir(c, r));
  }

  function agregarCoordenada(e: FormEvent) {
    e.preventDefault();
    const lon = Number(longitud), lat = Number(latitud);
    if (!longitud.trim() || !latitud.trim() || !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) >= 85) {
      setErrorCoordenadas('Longitud entre −180 y 180; latitud entre −85 y 85.');
      return;
    }
    setErrorCoordenadas('');
    agregar([lon, lat]);
    setLongitud(''); setLatitud('');
    setCentrar((n) => n + 1);
  }

  const area = cuadricula?.ok ? cuadricula.valor.parcela.areaHa : null;
  const celdas = cuadricula?.ok ? cuadricula.valor.parcela.celdas.length : null;
  const resumen = puntos.length === 0 ? 'Haz clic en el mapa para marcar el primer vértice'
    : `${puntos.length} ${puntos.length === 1 ? 'vértice' : 'vértices'}${area != null ? ` · ${area.toLocaleString('es-MX', { maximumFractionDigits: 2 })} ha · ${celdas} celdas` : puntos.length < 3 ? ' · faltan ' + (3 - puntos.length) : ''}`;

  return <section className="dibujo" aria-labelledby={`${id}-titulo`}>
    <div className="dibujo-cabeza">
      <h2 id={`${id}-titulo`} tabIndex={-1}>Dibuja tu parcela</h2>
      <p>Marca las esquinas en el mapa. Arrastra un vértice para moverlo o el punto de en medio de un lado para agregar uno.</p>
    </div>
    <Suspense fallback={<div className="mapa-dibujo mapa-dibujo-carga" role="status">Cargando mapa…</div>}>
      <MapaParcela puntos={puntos} bordes={cuadricula?.ok ? cuadricula.valor.contornos : sinBordes} onPunto={agregar} onMover={mover} onInsertar={insertar} onBorrar={borrar} centrar={centrar}>
        {(mapa) => <>
        <div className="mapa-capa dibujo-barra" role="toolbar" aria-label="Herramientas de dibujo" aria-orientation="vertical">
          <BotonHerramienta nombre="Deshacer" icono={iconos.deshacer} onClick={deshacer} disabled={!historial.length} />
          <BotonHerramienta nombre="Borrar todo" icono={iconos.borrar} onClick={() => cambiar([])} disabled={!puntos.length} />
          <BotonHerramienta ref={botonCoordenadas} nombre="Agregar por coordenadas" icono={iconos.coordenadas} onClick={() => setCoordenadas((v) => !v)} activo={coordenadas} />
          <BotonHerramienta nombre="Centrar en el contorno" icono={iconos.centrar} onClick={() => setCentrar((n) => n + 1)} disabled={!puntos.length} />
          <span className="dibujo-separador" aria-hidden="true" />
          <BotonHerramienta nombre="Acercar" icono={iconos.acercar} onClick={mapa.acercar} />
          <BotonHerramienta nombre="Alejar" icono={iconos.alejar} onClick={mapa.alejar} />
          <span className="dibujo-separador" aria-hidden="true" />
          <BotonHerramienta nombre="Cómo dibujar" icono={iconos.ayuda} onClick={() => setAyuda((v) => !v)} activo={ayuda} />
        </div>

        {coordenadas && <form className="mapa-capa dibujo-pop" onSubmit={agregarCoordenada} aria-label="Agregar vértice por coordenadas" onKeyDown={(e) => { if (e.key === 'Escape') { setCoordenadas(false); botonCoordenadas.current?.focus(); } }}>
          <label>Longitud<input autoFocus inputMode="decimal" type="number" step="any" min="-180" max="180" value={longitud} onChange={(e) => setLongitud(e.target.value)} placeholder="-95.53" /></label>
          <label>Latitud<input inputMode="decimal" type="number" step="any" min="-84.999999" max="84.999999" value={latitud} onChange={(e) => setLatitud(e.target.value)} placeholder="18.03" /></label>
          <button type="submit" className="dibujo-boton">Agregar</button>
          {errorCoordenadas && <p role="alert">{errorCoordenadas}</p>}
        </form>}

        {ayuda && <div className="mapa-capa dibujo-pop dibujo-ayuda" role="note">
          <p><strong>Clic</strong> en el mapa: agrega un vértice.</p>
          <p><strong>Arrastra</strong> un vértice: lo mueve.</p>
          <p><strong>Arrastra</strong> el punto medio de un lado: agrega uno ahí.</p>
          <p><strong>Doble clic</strong> o clic derecho en un vértice: lo borra (con teclado, Suprimir).</p>
        </div>}

        <p className="mapa-capa dibujo-chip" role="status">{resumen}</p>

        {(cuadricula || aviso) && <div className="mapa-capa dibujo-final">
          {aviso && <p className="dibujo-error" role="alert">{aviso}</p>}
          {cuadricula && !cuadricula.ok && <p className="dibujo-error" role="alert">{cuadricula.motivo}</p>}
          {cuadricula?.ok && cuadricula.valor.parcela.advertencias?.[0] && <p className="dibujo-nota">{cuadricula.valor.parcela.advertencias[0].mensaje}</p>}
          {cuadricula?.ok && <details className="dibujo-escala"><summary>Tamaño de celda: {tamano === 'auto' ? 'automático' : `${tamano} m`}{describirCelda(cuadricula.valor.escala.ladoM) ? ` · ${describirCelda(cuadricula.valor.escala.ladoM)!.texto}` : ''}</summary>
            <SelectorTamanoCelda valor={tamano} escala={cuadricula.valor.escala} onCambio={(t) => { peticion.current?.abort(); setEstado({ tipo: 'nada' }); setTamano(t); }} />
          </details>}
          {cuadricula?.ok && estado.tipo === 'error' && <>
            <p className="dibujo-error" role="alert">No se pudo consultar la elevación. {estado.mensaje}</p>
            <button type="button" className="dibujo-enlace" onClick={() => usar(cuadricula.valor.parcela)}>Continuar sin elevación</button>
          </>}
          {cuadricula?.ok && <button type="button" className="dibujo-boton dibujo-usar" disabled={estado.tipo === 'consultando'} onClick={() => void confirmar()}>
            {estado.tipo === 'consultando' ? 'Consultando elevación…' : estado.tipo === 'error' ? 'Reintentar' : 'Usar esta parcela'}
            {estado.tipo !== 'consultando' && <span aria-hidden="true">→</span>}
          </button>}
        </div>}
        </>}
      </MapaParcela>
    </Suspense>
  </section>;
}
