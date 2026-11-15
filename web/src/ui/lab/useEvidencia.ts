// Evidencia satelital para los consejos (no entra al motor ni al ranking): NDVI de MODIS
// (verdor de la zona, 250 m) y humedad del suelo SMAP de los ultimos dias (36 km). La demo usa
// el paquete de NDVI precargado; SMAP siempre se pide en vivo y, si falla, no hay consejo.
import { useEffect, useState } from 'react';
import type { Ndvi, Smap } from '../../../../contratos/tipos/contratos';
import { obtenerNdvi, obtenerSmap } from '../../api/cliente';

export interface Evidencia { ndvi: Ndvi | null; smap: Smap | null }

const DIA = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function useEvidencia(centroide: readonly [number, number] | null, esDemo: boolean): Evidencia {
  const [ndvi, setNdvi] = useState<Ndvi | null>(null);
  const [smap, setSmap] = useState<Smap | null>(null);
  const clave = centroide ? `${centroide[0]},${centroide[1]}:${esDemo}` : '';
  useEffect(() => {
    if (!centroide) return;
    const control = new AbortController();
    let activo = true;
    const [lon, lat] = centroide;
    const hoy = Date.now();
    setNdvi(null); setSmap(null);
    void (async () => {
      if (esDemo) {
        const p = await import('../../../../datos/demo/respuestas/ndvi.json');
        if (activo) setNdvi(p.default as unknown as Ndvi);
      } else {
        const r = await obtenerNdvi(lon, lat, iso(hoy - 395 * DIA), iso(hoy - 5 * DIA), { senal: control.signal });
        if (activo && r.ok) setNdvi(r.datos);
      }
    })().catch(() => { /* sin NDVI no hay consejo de verdor */ });
    void obtenerSmap(lon, lat, iso(hoy - 12 * DIA), iso(hoy - 3 * DIA), { senal: control.signal })
      .then((r) => { if (activo && r.ok) setSmap(r.datos); })
      .catch(() => { /* sin SMAP no hay consejo de humedad */ });
    return () => { activo = false; control.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return { ndvi, smap };
}
