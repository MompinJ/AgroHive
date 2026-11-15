// Efecto de escritura: el texto aparece de a poco, como si Esquilote lo dijera. Con "reducir movimiento" (o sin
// navegador, como en las pruebas) el texto sale completo. Mientras escribe, `escribiendo` es true: la mascota "habla".
import { useCallback, useEffect, useState } from 'react';
import { largo, partes } from './texto';

export const MS_POR_LETRA = 28;
const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useEscribir(texto: string, alEscribir?: (posicion: number) => void): { visibles: number; escribiendo: boolean; completar: () => void } {
  const total = largo(partes(texto));
  const inicial = typeof window === 'undefined' || reducido() ? total : 0;
  const [estado, setEstado] = useState({ texto, n: inicial });
  const n = estado.texto === texto ? estado.n : inicial; // otro texto: vuelve a empezar sin parpadear el anterior
  useEffect(() => {
    if (typeof window === 'undefined' || reducido()) { setEstado({ texto, n: total }); return; }
    setEstado({ texto, n: 0 });
    let k = 0;
    const reloj = window.setInterval(() => {
      k += 1;
      setEstado({ texto, n: Math.min(k, total) });
      alEscribir?.(k);
      if (k >= total) window.clearInterval(reloj);
    }, MS_POR_LETRA);
    return () => window.clearInterval(reloj);
  }, [texto, total]);
  const completar = useCallback(() => setEstado({ texto, n: total }), [texto, total]);
  return { visibles: n, escribiendo: n < total, completar };
}
