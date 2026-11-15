// Historial de hechos guardado en el navegador, por parcela (como la proteccion con insecticida). Ver historial.ts.
//
// Es un almacen FUERA de React (se conecta con useSyncExternalStore): leer y escribir el almacenamiento dentro de la funcion de
// actualizacion de un useState es un efecto secundario que React, en desarrollo, ejecuta dos veces, y el segundo intento leia lo que
// escribio el primero y lo sumaba (un clic guardaba el doble). Aqui cada accion se aplica exactamente una vez.
import { useMemo, useSyncExternalStore } from 'react';
import { leerHechos, registrar, type Hecho } from './historial';

const LLAVE = 'agrohive:historial:v1:';
type Almacenamiento = Pick<Storage, 'getItem' | 'setItem'>;
const navegador = (): Almacenamiento | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export interface AlmacenHistorial {
  instantanea: () => Hecho[];
  suscribir: (f: () => void) => () => void;
  agregar: (nuevo: Omit<Hecho, 'id' | 'cuando'>) => void;
  borrar: () => void;
}

/** Almacen de los hechos de una parcela (`clave`); sin clave no guarda nada. `ahora` y `almacen` se pueden inyectar. */
export function crearAlmacenHistorial(clave: string | null, almacen: Almacenamiento | null = navegador(), ahora: () => number = Date.now): AlmacenHistorial {
  let hechos: Hecho[] = [];
  if (clave) { try { hechos = leerHechos(almacen?.getItem(LLAVE + clave)); } catch { hechos = []; } }
  const oyentes = new Set<() => void>();
  const guardar = () => { if (clave) { try { almacen?.setItem(LLAVE + clave, JSON.stringify(hechos)); } catch { /* sin almacenamiento: queda en memoria */ } } };
  const avisar = () => oyentes.forEach((f) => f());
  return {
    instantanea: () => hechos,
    suscribir(f) { oyentes.add(f); return () => { oyentes.delete(f); }; },
    agregar(nuevo) {
      if (!clave) return;
      hechos = registrar(hechos, { ...nuevo, cuando: ahora() });
      guardar();
      avisar();
    },
    borrar() {
      if (!clave) return;
      hechos = [];
      guardar();
      avisar();
    },
  };
}

const VACIO: Hecho[] = [];

export function useHistorial(clave: string | null): { hechos: Hecho[]; agregar: AlmacenHistorial['agregar']; borrar: () => void } {
  const almacen = useMemo(() => crearAlmacenHistorial(clave), [clave]);
  const hechos = useSyncExternalStore(almacen.suscribir, almacen.instantanea, () => VACIO);
  return { hechos, agregar: almacen.agregar, borrar: almacen.borrar };
}
