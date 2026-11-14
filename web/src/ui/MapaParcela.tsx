import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LonLat } from '../../../contratos/tipos/contratos';

export default function MapaParcela({ puntos, bordes, onPunto }: { puntos: LonLat[]; bordes: LonLat[][]; onPunto: (p: LonLat) => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const capas = useRef<L.LayerGroup | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const fondos = useRef<{ satelite: L.TileLayer; calles: L.TileLayer } | null>(null);
  const agregar = useRef(onPunto);
  agregar.current = onPunto;
  const [vista, setVista] = useState<'satelite' | 'calles'>('satelite');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!contenedor.current) return;
    const mapa = L.map(contenedor.current).setView([18.03, -95.53], 16);
    mapaRef.current = mapa;
    const calles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19,
    });
    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imágenes: <a href="https://goto.arcgisonline.com/maps/World_Imagery">Esri</a>, Vantor, Earthstar Geographics y GIS User Community', maxZoom: 19,
    });
    fondos.current = { satelite, calles };
    for (const fondo of [satelite, calles]) fondo.on('tileerror', () => { if (mapa.hasLayer(fondo)) setError(true); });
    capas.current = L.layerGroup().addTo(mapa);
    mapa.on('click', (ev: L.LeafletMouseEvent) => agregar.current([ev.latlng.lng, ev.latlng.lat]));
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(contenedor.current);
    return () => { observador.disconnect(); mapa.remove(); capas.current = null; mapaRef.current = null; fondos.current = null; };
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
    const grupo = capas.current;
    if (!grupo) return;
    grupo.clearLayers();
    const tinta = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
    const contraste = getComputedStyle(document.documentElement).getPropertyValue('--color-on-action').trim();
    const latlng = (p: LonLat): L.LatLngTuple => [p[1], p[0]];
    const color = vista === 'satelite' ? contraste : tinta;
    bordes.forEach((b) => L.polygon(b.map(latlng), { color, weight: 1, fillOpacity: 0.04, interactive: false }).addTo(grupo));
    if (puntos.length) {
      L.polyline([...puntos, ...(puntos.length >= 3 ? [puntos[0]!] : [])].map(latlng), { color: tinta, weight: 7, interactive: false }).addTo(grupo);
      if (puntos.length >= 3) L.polygon(puntos.map(latlng), { color, weight: 3, fillOpacity: 0.08, interactive: false }).addTo(grupo);
      else L.polyline(puntos.map(latlng), { color, weight: 3, interactive: false }).addTo(grupo);
    }
    puntos.forEach((p) => L.circleMarker(latlng(p), { radius: 6, color: tinta, fillColor: contraste, weight: 2, fillOpacity: 1, interactive: false }).addTo(grupo));
  }, [puntos, bordes, vista]);
  return <><label htmlFor="vista-mapa">Vista del mapa</label><select id="vista-mapa" value={vista} onChange={(e) => setVista(e.target.value as typeof vista)}><option value="satelite">Satélite · imágenes reales</option><option value="calles">Mapa de calles · OpenStreetMap</option></select>
    <p className="quiet-note">{vista === 'satelite' ? 'Imágenes satelitales y aéreas de Esri World Imagery. No son en vivo; su fecha y detalle varían por lugar.' : 'Mapa de calles de OpenStreetMap.'} Cambiar la vista conserva el contorno y la cuadrícula.</p>
    <div ref={contenedor} className="parcel-map" aria-label="Mapa para dibujar el contorno de la parcela" /><button disabled={!puntos.length} onClick={() => {
    mapaRef.current?.fitBounds(L.latLngBounds(puntos.map(([lon, lat]) => [lat, lon] as L.LatLngTuple)), { padding: [24, 24], maxZoom: 18 });
  }}>Centrar en el contorno</button>{error && <p role="status">No se pudo cargar parte de esta vista. Cambia la vista del mapa o sigue usando las coordenadas.</p>}</>;
}
