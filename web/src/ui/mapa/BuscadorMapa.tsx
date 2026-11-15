import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useIdioma } from '../i18n/Idioma';
import { buscarLugares, type LugarMapa } from './lugares';
import './mapa.css';

const textos = {
  es: { buscar: 'Buscar', buscando: 'Buscando…', etiqueta: 'Buscar ciudad o localidad', ejemplo: 'Ciudad o código postal', ubicacion: 'Mi ubicación', localizando: 'Localizando…', vacio: 'No encontramos ese lugar. Prueba con otra ciudad o añade el país.', error: 'No se pudo buscar. Revisa tu conexión y vuelve a intentarlo.', corto: 'Escribe al menos dos caracteres.', resultados: 'Resultados de lugares', encontrados: 'Elige un resultado para centrar el mapa.', fuente: 'Lugares: ', vista: 'Buscar solo mueve el mapa; no cambia tu parcela.' },
  en: { buscar: 'Search', buscando: 'Searching…', etiqueta: 'Search for a city or town', ejemplo: 'City or postal code', ubicacion: 'My location', localizando: 'Locating…', vacio: 'No places found. Try another city or add the country.', error: 'Search failed. Check your connection and try again.', corto: 'Enter at least two characters.', resultados: 'Place results', encontrados: 'Choose a result to center the map.', fuente: 'Places: ', vista: 'Searching only moves the map; it does not change your plot.' },
};

export function BuscadorMapa({ onElegir, onUbicar, ubicando, aviso }: { onElegir: (lugar: LugarMapa) => void; onUbicar: () => void; ubicando: boolean; aviso: string }) {
  const { idioma } = useIdioma();
  const t = textos[idioma];
  const id = useId();
  const [consulta, setConsulta] = useState('');
  const [lugares, setLugares] = useState<LugarMapa[]>([]);
  const [estado, setEstado] = useState<'nada' | 'buscando' | 'vacio' | 'error' | 'corto' | 'resultados'>('nada');
  const peticion = useRef<AbortController | null>(null);
  useEffect(() => { peticion.current?.abort(); peticion.current = null; setLugares([]); setEstado('nada'); }, [idioma]);
  useEffect(() => () => { peticion.current?.abort(); peticion.current = null; }, []);

  async function buscar(e: FormEvent) {
    e.preventDefault(); peticion.current?.abort(); setLugares([]);
    if (consulta.trim().length < 2) { setEstado('corto'); return; }
    const control = new AbortController(); peticion.current = control;
    const limite = setTimeout(() => control.abort(), 10_000);
    setEstado('buscando');
    try {
      const encontrados = await buscarLugares(consulta, idioma, control.signal);
      if (peticion.current !== control || control.signal.aborted) return;
      setLugares(encontrados); setEstado(encontrados.length ? 'resultados' : 'vacio');
    } catch {
      if (peticion.current === control) setEstado('error');
    } finally { clearTimeout(limite); }
  }
  const cerrar = () => { peticion.current?.abort(); peticion.current = null; setLugares([]); setEstado('nada'); };
  return <div className="mapa-buscador" onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}>
    <div className="mapa-buscador-fila">
      <form role="search" aria-label={t.etiqueta} onSubmit={buscar} className="mapa-buscador-form">
        <label htmlFor={id} className="sr-only">{t.etiqueta}</label>
        <input id={id} type="search" autoComplete="off" placeholder={t.ejemplo} value={consulta} onChange={(e) => { cerrar(); setConsulta(e.target.value); }} aria-describedby={`${id}-estado`} />
        <button type="submit" disabled={estado === 'buscando'} aria-label={estado === 'buscando' ? t.buscando : t.buscar} title={t.buscar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        </button>
      </form>
      <button type="button" className="mapa-ubicar" onClick={onUbicar} disabled={ubicando} aria-label={ubicando ? t.localizando : t.ubicacion} title={t.ubicacion}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></svg>
      </button>
    </div>
    <p id={`${id}-estado`} className="mapa-buscador-estado" role="status" hidden={estado === 'nada'}>{estado === 'error' ? t.error : estado === 'vacio' ? t.vacio : estado === 'corto' ? t.corto : estado === 'resultados' ? t.encontrados : estado === 'buscando' ? t.buscando : ''}</p>
    {lugares.length > 0 && <ul className="mapa-lugares" aria-label={t.resultados}>{lugares.map((lugar) => <li key={lugar.id}><button type="button" onClick={() => { cerrar(); setConsulta(lugar.nombre); onElegir(lugar); }}><strong>{lugar.nombre}</strong>{lugar.detalle && <span>{lugar.detalle}</span>}</button></li>)}</ul>}
    {aviso && <p className="mapa-buscador-estado" role="status">{aviso}</p>}
  </div>;
}
