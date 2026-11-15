// Estado de los paneles de la izquierda (Cultivos y Escenarios): plegados o abiertos. Es uno solo para los dos y se recuerda en el navegador.
// Almacen fuera de React (useSyncExternalStore): el mismo valor en todos los componentes y sin escribir dentro de un render.
import { useSyncExternalStore } from 'react';

const LLAVE = 'agrohive:panel-izq:v1';
let plegado = false;
try { plegado = typeof localStorage !== 'undefined' && localStorage.getItem(LLAVE) === '1'; } catch { /* sin almacenamiento */ }
const oyentes = new Set<() => void>();

export const panelPlegado = () => plegado;
export function fijarPanelPlegado(valor: boolean) {
  if (valor === plegado) return;
  plegado = valor;
  try { localStorage.setItem(LLAVE, valor ? '1' : '0'); } catch { /* sin almacenamiento */ }
  oyentes.forEach((f) => f());
}
const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };
export const usePanelPlegado = (): boolean => useSyncExternalStore(suscribir, panelPlegado, panelPlegado);
