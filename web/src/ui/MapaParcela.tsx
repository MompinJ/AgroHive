import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LonLat } from '../../../contratos/tipos/contratos';

export default function MapaParcela({ puntos, bordes, onPunto }: { puntos: LonLat[]; bordes: LonLat[][]; onPunto: (p: LonLat) => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const capas = useRef<L.LayerGroup | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const agregar = useRef(onPunto);
  agregar.current = onPunto;
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!contenedor.current) return;
    const mapa = L.map(contenedor.current).setView([18.03, -95.53], 16);
    mapaRef.current = mapa;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(mapa);
    tiles.on('tileerror', () => setError(true));
    capas.current = L.layerGroup().addTo(mapa);
    mapa.on('click', (ev: L.LeafletMouseEvent) => agregar.current([ev.latlng.lng, ev.latlng.lat]));
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(contenedor.current);
    return () => { observador.disconnect(); mapa.remove(); capas.current = null; mapaRef.current = null; };
  }, []);
  useEffect(() => {
    const grupo = capas.current;
    if (!grupo) return;
    grupo.clearLayers();
    const tinta = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
    const latlng = (p: LonLat): L.LatLngTuple => [p[1], p[0]];
    bordes.forEach((b) => L.polygon(b.map(latlng), { color: tinta, weight: 1, fillOpacity: 0.05, interactive: false }).addTo(grupo));
    if (puntos.length >= 3) L.polygon(puntos.map(latlng), { color: tinta, fillOpacity: 0.12, interactive: false }).addTo(grupo);
    else if (puntos.length) L.polyline(puntos.map(latlng), { color: tinta, interactive: false }).addTo(grupo);
    puntos.forEach((p) => L.circleMarker(latlng(p), { radius: 5, color: tinta, fillOpacity: 1, interactive: false }).addTo(grupo));
  }, [puntos, bordes]);
  return <><div ref={contenedor} className="parcel-map" aria-label="Mapa para dibujar el contorno de la parcela" /><button disabled={!puntos.length} onClick={() => {
    mapaRef.current?.fitBounds(L.latLngBounds(puntos.map(([lon, lat]) => [lat, lon] as L.LatLngTuple)), { padding: [24, 24], maxZoom: 18 });
  }}>Centrar en el contorno</button>{error && <p role="status">No se pudo cargar parte del mapa base. Puedes seguir usando las coordenadas.</p>}</>;
}
