import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { LonLat, Parcela } from '../../../contratos/tipos/contratos';
import { obtenerTerreno } from '../api/cliente';
import { generarCuadricula, type Cuadricula } from './cuadricula';
import { SelectorTamanoCelda } from './SelectorTamanoCelda';
import type { PedidoTamano } from '../geo/tamano-celda';

const MapaParcela = lazy(() => import('./MapaParcela'));
const sinBordes: LonLat[][] = [];

export function DibujarParcela({ onGuardar, guardada }: { onGuardar: (p: Parcela) => void; guardada: Parcela | null }) {
  const [puntos, setPuntos] = useState<LonLat[]>(() => guardada?.origen === 'poligono_usuario' ? guardada.poligono.slice(0, -1) : []);
  const [longitud, setLongitud] = useState('');
  const [latitud, setLatitud] = useState('');
  const [cuadricula, setCuadricula] = useState<Cuadricula | null>(null);
  const [tamano, setTamano] = useState<PedidoTamano>('auto');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Parcela | null>(null);
  const peticion = useRef<AbortController | null>(null);
  useEffect(() => () => peticion.current?.abort(), []);

  function cambiar(nuevos: LonLat[]) {
    peticion.current?.abort();
    setCargando(false); setPuntos(nuevos); setCuadricula(null); setResultado(null); setMensaje('');
  }
  function agregar(p: LonLat) {
    if (puntos.length >= 200) { setMensaje('El límite es de 200 vértices.'); return; }
    cambiar([...puntos, p]);
  }
  function preparar(pedido: PedidoTamano = tamano) {
    peticion.current?.abort(); setCargando(false); setResultado(null);
    try { const c = generarCuadricula(puntos, { tamanoCeldaM: pedido }); setCuadricula(c); setMensaje(`${c.parcela.advertencias?.[0] ? `${c.parcela.advertencias[0].mensaje} ` : ''}Revisa el contorno y confirma para consultar elevación.`); }
    catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo generar la cuadrícula.'); }
  }
  async function consultar() {
    if (!cuadricula) return;
    peticion.current?.abort();
    const control = new AbortController();
    peticion.current = control;
    setCargando(true); setMensaje('Consultando elevación y pendiente…'); setResultado(null);
    const r = await obtenerTerreno({ tamanoCeldaM: cuadricula.parcela.tamanoCeldaM, celdas: cuadricula.parcela.celdas.map(({ id, i, j, centro }) => ({ id, i, j, centro })) }, { senal: control.signal });
    if (control.signal.aborted) return;
    setCargando(false);
    if (!r.ok) { setMensaje(r.error.motivo); return; }
    const alturas = new Map(r.datos.celdas.map((c) => [c.id, c]));
    const f = r.datos.terreno.fuente;
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
    const parcela: Parcela = {
      ...cuadricula.parcela, terreno: { estado: r.datos.terreno.estado, fuente },
      celdas: cuadricula.parcela.celdas.map((c) => ({ ...c, elevacionM: alturas.get(c.id)?.elevacionM ?? null, pendientePct: alturas.get(c.id)?.pendientePct ?? null })) as Parcela['celdas'],
      advertencias: [...(cuadricula.parcela.advertencias ?? []), ...r.datos.advertencias, ...(r.datos.meta.esEjemplo ? [{ codigo: 'ELEVACION_DE_EJEMPLO', severidad: 'critico' as const, mensaje: 'La elevación recibida es de ejemplo, no corresponde a mediciones reales.' }] : [])],
    };
    setResultado(parcela); onGuardar(parcela);
    setMensaje('Parcela guardada para esta sesión. El suelo y la simulación se conectan en el laboratorio.');
  }
  return <section className="parcel-editor" aria-labelledby="dibujar-titulo">
    <h2 id="dibujar-titulo">Dibuja tu parcela</h2>
    <p>Toca los vértices del contorno en orden. Desplaza y acerca el mapa para localizar tu terreno. También puedes escribir coordenadas con el teclado.</p>
    <Suspense fallback={<p role="status">Cargando mapa…</p>}><MapaParcela puntos={puntos} bordes={cuadricula?.contornos ?? sinBordes} onPunto={agregar} /></Suspense>
    <form className="parcel-coordinate-form" onSubmit={(e) => {
      e.preventDefault(); const lon = Number(longitud), lat = Number(latitud);
      if (!longitud.trim() || !latitud.trim() || !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) >= 85) { setMensaje('Escribe coordenadas válidas: longitud −180 a 180; latitud −85 a 85.'); return; }
      agregar([lon, lat]); setLongitud(''); setLatitud('');
    }}>
      <label>Longitud<input required type="number" step="any" min="-180" max="180" value={longitud} onChange={(e) => setLongitud(e.target.value)} /></label>
      <label>Latitud<input required type="number" step="any" min="-84.999999" max="84.999999" value={latitud} onChange={(e) => setLatitud(e.target.value)} /></label>
      <button type="submit">Agregar vértice</button>
    </form>
    <p>{puntos.length} vértices · límite de 200</p>
    {puntos.length > 0 && <details><summary>Ver coordenadas del contorno</summary><ol>{puntos.map(([lon, lat], i) => <li key={i}>{lon.toFixed(6)}, {lat.toFixed(6)}</li>)}</ol></details>}
    <div className="parcel-actions">
      <button disabled={!puntos.length} onClick={() => cambiar(puntos.slice(0, -1))}>Deshacer vértice</button>
      <button disabled={!puntos.length} onClick={() => cambiar([])}>Reiniciar</button>
      <button disabled={puntos.length < 3 || cargando} onClick={() => preparar()}>Generar cuadrícula</button>
    </div>
    <SelectorTamanoCelda valor={tamano} escala={cuadricula?.escala ?? null} onCambio={(t) => { setTamano(t); if (cuadricula) preparar(t); }} />
    {cuadricula && <div className="parcel-summary">
      <p>{cuadricula.parcela.areaHa.toLocaleString('es-MX', { maximumFractionDigits: 3 })} ha · {cuadricula.parcela.celdas.length} celdas · lado {cuadricula.parcela.tamanoCeldaM.toFixed(1)} m. Los bordes usan solo su fracción dentro del contorno.</p>
      <button disabled={cargando} onClick={() => void consultar()}>{cargando ? 'Consultando…' : 'Confirmar y consultar elevación / reintentar'}</button>
      <button disabled={cargando} onClick={() => { onGuardar(cuadricula.parcela); setResultado(cuadricula.parcela); setMensaje('Contorno guardado sin elevación. Relieve NO_EVALUABLE.'); }}>Guardar sin elevación</button>
    </div>}
    <p role="status">{mensaje}</p>
    {resultado && <div><p>Terreno: {resultado.terreno.estado}. Fuente: {resultado.terreno.fuente.nombre}.</p>
      {resultado.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
      <p>{resultado.celdas.filter((c) => c.elevacionM === null).length} celdas sin elevación; no se sustituyen por cero.</p>
      <a className="terrain-button" href="#/laboratorio">Continuar al laboratorio</a>
    </div>}
  </section>;
}
