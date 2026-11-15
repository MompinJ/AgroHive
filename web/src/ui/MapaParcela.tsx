// Mapa para dibujar el contorno: clic agrega un vertice; los vertices se arrastran; el punto
// medio de cada lado se arrastra para insertar uno nuevo; doble clic o clic derecho en un
// vertice lo borra. El contorno se actualiza en vivo durante el arrastre y el cambio se
// entrega al soltar. La vista se cambia con un interruptor Satelite / Mapa.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LonLat } from '../../../contratos/tipos/contratos';

export interface MapaParcelaProps {
  puntos: LonLat[];
  bordes: LonLat[][];
  onPunto: (p: LonLat) => void;
  onMover: (indice: number, p: LonLat) => void;
  onInsertar: (indice: number, p: LonLat) => void;
  onBorrar: (indice: number) => void;
  /** Cambia para pedir que el mapa encuadre el contorno. */
  centrar?: number;
  /** Capas de interfaz encima del mapa (barra de herramientas, resumen); reciben acercar y alejar. */
  children?: (mapa: { acercar: () => void; alejar: () => void }) => ReactNode;
}

const latlng = (p: LonLat): L.LatLngTuple => [p[1], p[0]];
const lonlat = (ll: L.LatLng): LonLat => [ll.lng, ll.lat];

function icono(clase: string, tamano: number) {
  return L.divIcon({ className: clase, iconSize: [tamano, tamano], iconAnchor: [tamano / 2, tamano / 2] });
}

export default function MapaParcela({ puntos, bordes, onPunto, onMover, onInsertar, onBorrar, centrar = 0, children }: MapaParcelaProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaBordes = useRef<L.LayerGroup | null>(null);
  const capaContorno = useRef<L.LayerGroup | null>(null);
  const capaVertices = useRef<L.LayerGroup | null>(null);
  const fondos = useRef<{ satelite: L.TileLayer; calles: L.TileLayer } | null>(null);
  const llamadas = useRef({ onPunto, onMover, onInsertar, onBorrar });
  llamadas.current = { onPunto, onMover, onInsertar, onBorrar };
  const [vista, setVista] = useState<'satelite' | 'calles'>('satelite');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!contenedor.current) return;
    // Sin zoom por doble clic: el doble clic borra vertices y no debe sumar puntos ni acercar.
    const mapa = L.map(contenedor.current, { doubleClickZoom: false, zoomControl: false }).setView([18.03, -95.53], 16);
    mapaRef.current = mapa;
    const calles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    });
    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imágenes: <a href="https://goto.arcgisonline.com/maps/World_Imagery">Esri</a>', maxZoom: 19,
    });
    fondos.current = { satelite, calles };
    for (const fondo of [satelite, calles]) fondo.on('tileerror', () => { if (mapa.hasLayer(fondo)) setError(true); });
    capaBordes.current = L.layerGroup().addTo(mapa);
    capaContorno.current = L.layerGroup().addTo(mapa);
    capaVertices.current = L.layerGroup().addTo(mapa);
    mapa.on('click', (ev: L.LeafletMouseEvent) => llamadas.current.onPunto(lonlat(ev.latlng)));
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(contenedor.current);
    return () => {
      observador.disconnect(); mapa.remove();
      mapaRef.current = null; fondos.current = null; capaBordes.current = null; capaContorno.current = null; capaVertices.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    const bases = fondos.current;
    if (!mapa || !bases) return;
    setError(false);
    mapa.removeLayer(vista === 'satelite' ? bases.calles : bases.satelite);
    bases[vista].addTo(mapa);
  }, [vista]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !centrar || puntos.length === 0) return;
    mapa.fitBounds(L.latLngBounds(puntos.map(latlng)), { padding: [48, 48], maxZoom: 18 });
    // Solo al pedirlo, no en cada cambio de vertices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centrar]);

  // Cuadricula generada (bordes de las celdas).
  useEffect(() => {
    const grupo = capaBordes.current;
    if (!grupo) return;
    grupo.clearLayers();
    const color = vista === 'satelite' ? '#ffffff' : '#1f5a43';
    bordes.forEach((b) => L.polygon(b.map(latlng), { color, weight: 1, opacity: 0.8, fillOpacity: 0.05, interactive: false }).addTo(grupo));
  }, [bordes, vista]);

  // Contorno, vertices arrastrables y puntos medios para insertar.
  useEffect(() => {
    const contorno = capaContorno.current;
    const vertices = capaVertices.current;
    if (!contorno || !vertices) return;
    contorno.clearLayers();
    vertices.clearLayers();
    const trabajo = puntos.map(latlng);
    const cerrado = trabajo.length >= 3;
    const sombra = L.polyline([], { color: '#11221a', weight: 6, opacity: 0.35, interactive: false }).addTo(contorno);
    const linea = cerrado
      ? L.polygon([], { color: '#e9c46a', weight: 3, fillColor: '#e9c46a', fillOpacity: 0.12, interactive: false }).addTo(contorno)
      : L.polyline([], { color: '#e9c46a', weight: 3, dashArray: '6 6', interactive: false }).addTo(contorno);
    const redibujar = (lista: L.LatLngTuple[]) => {
      sombra.setLatLngs(lista.length >= 3 ? [...lista, lista[0]!] : lista);
      linea.setLatLngs(lista);
    };
    redibujar(trabajo);

    trabajo.forEach((ll, i) => {
      const m = L.marker(ll, { icon: icono('mapa-vertice', 18), draggable: true, keyboard: true, title: `Vértice ${i + 1}: arrastra para mover; doble clic o clic derecho para borrar`, alt: `Vértice ${i + 1}`, riseOnHover: true }).addTo(vertices);
      m.on('drag', () => { const p = m.getLatLng(); const copia = [...trabajo]; copia[i] = [p.lat, p.lng]; redibujar(copia); });
      m.on('dragend', () => llamadas.current.onMover(i, lonlat(m.getLatLng())));
      m.on('dblclick', (e) => { L.DomEvent.stop(e); llamadas.current.onBorrar(i); });
      m.on('contextmenu', (e) => { L.DomEvent.stop(e); llamadas.current.onBorrar(i); });
      // Con teclado: el vertice es enfocable; Suprimir o Retroceso lo borran.
      m.getElement()?.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); llamadas.current.onBorrar(i); }
      });
    });

    // Punto medio de cada lado (incluido el de cierre): arrastrarlo inserta un vertice nuevo.
    const lados = cerrado ? trabajo.length : trabajo.length - 1;
    if (trabajo.length < 200) for (let i = 0; i < lados; i++) {
      const a = trabajo[i]!;
      const b = trabajo[(i + 1) % trabajo.length]!;
      const medio: L.LatLngTuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const m = L.marker(medio, { icon: icono('mapa-medio', 14), draggable: true, keyboard: false, title: 'Arrastra para agregar un vértice en este lado', opacity: 0.85 }).addTo(vertices);
      m.on('drag', () => { const p = m.getLatLng(); const copia = [...trabajo]; copia.splice(i + 1, 0, [p.lat, p.lng]); redibujar(copia); });
      m.on('dragend', () => llamadas.current.onInsertar(i + 1, lonlat(m.getLatLng())));
    }
  }, [puntos]);

  return <div className="mapa-dibujo">
    <div ref={contenedor} className="mapa-dibujo-lienzo" role="application" aria-label="Mapa para dibujar el contorno de la parcela. Clic agrega un vértice." />
    <div className="mapa-capa mapa-capa-vista" role="radiogroup" aria-label="Vista del mapa">
      <button type="button" role="radio" aria-checked={vista === 'satelite'} onClick={() => setVista('satelite')}>Satélite</button>
      <button type="button" role="radio" aria-checked={vista === 'calles'} onClick={() => setVista('calles')}>Mapa</button>
    </div>
    {error && <p className="mapa-capa mapa-aviso" role="status">No cargó parte del mapa. Prueba la otra vista.</p>}
    {children?.({ acercar: () => mapaRef.current?.zoomIn(), alejar: () => mapaRef.current?.zoomOut() })}
  </div>;
}
