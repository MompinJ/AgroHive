// Esquilote, el elote mascota de AgroHive. Se dibuja con el retrato del mismo modelo voxel que la mascota de la
// pantalla (escena/render/retrato.ts), asi es un solo personaje; si no hay WebGL, un dibujo SVG de respaldo.
// Decorativo: el texto del tutorial lleva el sentido.
import { useEffect, useState } from 'react';

const GRANOS = Array.from({ length: 10 }, (_, fila) => Array.from({ length: 3 }, (_, col) => ({ fila, col }))).flat().filter(({ fila }) => fila < 3 || fila > 6);

export function Esquilote({ ancho = 84, saluda = false }: { ancho?: number; saluda?: boolean }) {
  const [retrato, setRetrato] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    void import('../../escena/render/retrato').then((m) => m.retratoMascota()).then((url) => { if (activo) setRetrato(url); }).catch(() => {});
    return () => { activo = false; };
  }, []);
  if (retrato) return <img className={`esquilote-dibujo esquilote-retrato${saluda ? ' esquilote-saluda' : ''}`} src={retrato} alt="" width={ancho} height={ancho} />;
  return <svg className={`esquilote-dibujo${saluda ? ' esquilote-saluda' : ''}`} width={ancho} height={Math.round(ancho * 1.5)} viewBox="0 0 100 150" aria-hidden="true" focusable="false">
    <ellipse cx="50" cy="143" rx="26" ry="5" fill="#1d2b21" opacity=".16" />
    {/* hojas de atras */}
    <path d="M32 126C8 96 12 62 30 40c5 30 8 60 18 88z" fill="#3b8240" />
    <path d="M68 126C92 96 88 62 70 40c-5 30-8 60-18 88z" fill="#3b8240" />
    {/* barbas */}
    <path d="M50 16c-3-9-9-12-15-12M50 16c0-10 2-13 7-15M50 16c4-8 10-10 15-9" fill="none" stroke="#b98a2e" strokeWidth="2.4" strokeLinecap="round" />
    {/* mazorca */}
    <rect x="26" y="14" width="48" height="108" rx="24" fill="#f4c631" stroke="#c99a12" strokeWidth="2" />
    {GRANOS.map(({ fila, col }) => <rect key={`${fila}-${col}`} x={33 + col * 11.4} y={21 + fila * 10.6} width="9.4" height="8" rx="3" fill="#fadf7c" />)}
    {/* cara */}
    <ellipse cx="41" cy="58" rx="3.8" ry="4.8" fill="#2b2418" />
    <ellipse cx="59" cy="58" rx="3.8" ry="4.8" fill="#2b2418" />
    <circle cx="42.2" cy="56.4" r="1.2" fill="#fff" />
    <circle cx="60.2" cy="56.4" r="1.2" fill="#fff" />
    <ellipse cx="34.5" cy="70" rx="5" ry="3.4" fill="#f08a7a" opacity=".55" />
    <ellipse cx="65.5" cy="70" rx="5" ry="3.4" fill="#f08a7a" opacity=".55" />
    <path d="M42 70q8 9 16 0" fill="none" stroke="#2b2418" strokeWidth="2.6" strokeLinecap="round" />
    {/* hojas de adelante */}
    <path d="M26 124C10 106 14 78 26 68c5 20 12 40 26 58z" fill="#4fa355" />
    <path d="M74 124C90 106 86 78 74 68c-5 20-12 40-26 58z" fill="#4fa355" />
    <path d="M50 130c-8-4-14-10-18-18 10 2 18 8 18 18zM50 130c8-4 14-10 18-18-10 2-18 8-18 18z" fill="#5db563" />
  </svg>;
}
