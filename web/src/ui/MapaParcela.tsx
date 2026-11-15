// Mapa para dibujar el contorno: clic agrega un vertice; los vertices se arrastran; el punto
// medio de cada lado se arrastra para insertar uno nuevo; doble clic o clic derecho en un
// vertice lo borra. El contorno se actualiza en vivo durante el arrastre y el cambio se
// entrega al soltar. La vista se cambia con un interruptor Satelite / Mapa.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LonLat } from '../../../contratos/tipos/contratos';
import { useIdioma } from './i18n/Idioma';
import { BuscadorMapa } from './mapa/BuscadorMapa';

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
  const { idioma } = useIdioma();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaBordes = useRef<L.LayerGroup | null>(null);
  const capaContorno = useRef<L.LayerGroup | null>(null);
  const capaVertices = useRef<L.LayerGroup | null>(null);
  const fondos = useRef<{ satelite: L.TileLayer; calles: L.TileLayer; etiquetas: L.TileLayer } | null>(null);
  const versionVista = useRef(0);
  const pedidoUbicacion = useRef(0);
  const puntosActuales = useRef(puntos);
  puntosActuales.current = puntos;
  const llamadas = useRef({ onPunto, onMover, onInsertar, onBorrar });
  llamadas.current = { onPunto, onMover, onInsertar, onBorrar };
  const [vista, setVista] = useState<'satelite' | 'calles'>('satelite');
  const [error, setError] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [ubicacion, setUbicacion] = useState<'amplia' | 'localizada' | 'denegada' | 'sinubicacion' | 'busqueda'>('amplia');
  const mensajes = idioma === 'en'
    ? { amplia: '', localizada: '', denegada: 'Location access was not allowed. You can still search or move the map.', sinubicacion: 'Your location could not be obtained. Search for a place or move the map.', busqueda: '' }
    : { amplia: '', localizada: '', denegada: 'No se permitió acceder a tu ubicación. Puedes buscar un lugar o mover el mapa.', sinubicacion: 'No se pudo obtener tu ubicación. Busca un lugar o mueve el mapa.', busqueda: '' };

  function ubicar() {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!navigator.geolocation) { setUbicacion('sinubicacion'); return; }
    const pedido = ++pedidoUbicacion.current;
    const version = versionVista.current;
    setUbicando(true);
    navigator.geolocation.getCurrentPosition((posicion) => {
      if (mapaRef.current !== mapa || pedidoUbicacion.current !== pedido) return;
      setUbicando(false);
      // Un permiso tardio no debe deshacer una busqueda, un dibujo o un desplazamiento.
      if (versionVista.current !== version) return;
      const { latitude, longitude } = posicion.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 85 || Math.abs(longitude) > 180) { setUbicacion('sinubicacion'); return; }
      mapa.setView([latitude, longitude], 13, { animate: false });
      setUbicacion('localizada');
    }, (fallo) => {
      if (mapaRef.current !== mapa || pedidoUbicacion.current !== pedido) return;
      setUbicando(false);
      if (versionVista.current === version) setUbicacion(fallo.code === 1 ? 'denegada' : 'sinubicacion');
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 });
  }

  useEffect(() => {
    if (!contenedor.current) return;
    // Sin zoom por doble clic: el doble clic borra vertices y no debe sumar puntos ni acercar.
    const mapa = L.map(contenedor.current, { doubleClickZoom: false, zoomControl: false }).setView([20, 0], 2);
    mapaRef.current = mapa;
    mapa.attributionControl.addAttribution('Lugares: <a href="https://open-meteo.com/en/docs/geocoding-api">Open-Meteo</a> / <a href="https://www.geonames.org/">GeoNames</a>');
    if (puntosActuales.current.length) mapa.fitBounds(L.latLngBounds(puntosActuales.current.map(latlng)), { padding: [48, 48], maxZoom: 16 });
    mapa.on('dragstart zoomstart', () => { versionVista.current++; });
    const panelEtiquetas = mapa.createPane('nombresCiudades');
    panelEtiquetas.style.zIndex = '350';
    panelEtiquetas.style.pointerEvents = 'none';
    const calles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19,
    });
    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imágenes: <a href="https://goto.arcgisonline.com/maps/World_Imagery">Esri</a>', maxZoom: 19,
    });
    const etiquetas = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Nombres: Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19, pane: 'nombresCiudades',
    });
    fondos.current = { satelite, calles, etiquetas };
    for (const fondo of [satelite, calles, etiquetas]) fondo.on('tileerror', () => { if (mapa.hasLayer(fondo)) setError(true); });
    capaBordes.current = L.layerGroup().addTo(mapa);
    capaContorno.current = L.layerGroup().addTo(mapa);
    capaVertices.current = L.layerGroup().addTo(mapa);
    mapa.on('click', (ev: L.LeafletMouseEvent) => { versionVista.current++; llamadas.current.onPunto(lonlat(ev.latlng)); });
    const versionInicial = versionVista.current;
    // Solo centra automaticamente si el usuario ya concedio el permiso.
    if (!puntosActuales.current.length && navigator.permissions?.query) {
      void navigator.permissions.query({ name: 'geolocation' }).then((permiso) => {
        if (permiso.state === 'granted' && mapaRef.current === mapa && versionVista.current === versionInicial && !puntosActuales.current.length) ubicar();
      }).catch(() => { /* El boton de ubicacion sigue disponible. */ });
    }
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(contenedor.current);
    return () => {
      observador.disconnect(); mapa.remove();
      pedidoUbicacion.current++;
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
    if (vista === 'satelite') bases.etiquetas.addTo(mapa);
    else mapa.removeLayer(bases.etiquetas);
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

  return <div className="mapa-editor">
    <div className="mapa-dibujo">
    <div ref={contenedor} className="mapa-dibujo-lienzo" role="application" aria-label={idioma === 'en' ? 'Map for drawing plot boundaries. Click to add a vertex.' : 'Mapa para dibujar el contorno de la parcela. Clic agrega un vértice.'} />
    <BuscadorMapa ubicando={ubicando} aviso={mensajes[ubicacion]} onUbicar={ubicar} onElegir={(lugar) => {
      versionVista.current++;
      mapaRef.current?.setView(latlng(lugar.centro), 13, { animate: false });
      setUbicacion('busqueda');
      contenedor.current?.focus({ preventScroll: true });
    }} />
    <div className="mapa-capa mapa-capa-vista" role="radiogroup" aria-label={idioma === 'en' ? 'Map view' : 'Vista del mapa'}>
      <button type="button" role="radio" aria-checked={vista === 'satelite'} onClick={() => setVista('satelite')}>{idioma === 'en' ? 'Satellite' : 'Satélite'}</button>
      <button type="button" role="radio" aria-checked={vista === 'calles'} onClick={() => setVista('calles')}>{idioma === 'en' ? 'Map' : 'Mapa'}</button>
    </div>
    {error && <p className="mapa-capa mapa-aviso" role="status">{idioma === 'en' ? 'Some map tiles or labels could not load. Try the other view.' : 'No cargó parte del mapa o sus etiquetas. Prueba la otra vista.'}</p>}
    {children?.({ acercar: () => mapaRef.current?.zoomIn(), alejar: () => mapaRef.current?.zoomOut() })}
    </div>
  </div>;
}
