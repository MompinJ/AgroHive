// Efectos de sonido de AgroHive: tonos suaves tipo juego de estrategia por turnos (marimba, campanitas y soplidos, en escala
// pentatonica) SINTETIZADOS con el audio del navegador; no hay archivos de audio ni muestras de ningun juego.
//
// Reglas: el audio solo arranca despues de una accion del usuario (politica de los navegadores), se puede silenciar con un boton y la
// eleccion se guarda; sin audio disponible no pasa nada. Es decoracion: nada depende de que suene.

export type NombreSonido = 'clic' | 'pintar' | 'rociar' | 'semana' | 'aviso' | 'cosecha' | 'plaga' | 'habla' | 'paso' | 'exito';

/** Una nota o soplido de una receta. t y d en segundos desde el inicio del sonido. */
export interface Nota { t: number; d: number; f: number; tipo?: OscillatorType; g?: number; f2?: number; ruido?: boolean; q?: number }

// Escala pentatonica de do mayor (Hz): suena bien sin importar el orden.
const DO5 = 523.25, RE5 = 587.33, MI5 = 659.25, SOL5 = 783.99, LA5 = 880, DO6 = 1046.5;
export const PENTATONICA = [DO5, RE5, MI5, SOL5, LA5, DO6] as const;

export const RECETAS: Readonly<Record<NombreSonido, readonly Nota[]>> = {
  clic: [{ t: 0, d: 0.06, f: 900, f2: 620, tipo: 'triangle', g: 0.16 }],
  pintar: [{ t: 0, d: 0.1, f: 420, f2: 760, tipo: 'sine', g: 0.2 }],
  rociar: [{ t: 0, d: 0.55, f: 3200, ruido: true, g: 0.1, q: 0.8 }, { t: 0.06, d: 0.42, f: 1800, ruido: true, g: 0.07, q: 1.1 }],
  semana: [{ t: 0, d: 0.08, f: MI5, tipo: 'triangle', g: 0.12 }, { t: 0.03, d: 0.1, f: MI5 * 2, tipo: 'sine', g: 0.04 }],
  aviso: [{ t: 0, d: 0.18, f: MI5, tipo: 'sine', g: 0.2 }, { t: 0.13, d: 0.32, f: LA5, tipo: 'sine', g: 0.18 }],
  // Cosecha: un soplido de guadana que cruza y un arpegio de campanitas que sube.
  cosecha: [
    { t: 0, d: 0.5, f: 1100, ruido: true, g: 0.14, q: 0.6 },
    { t: 0.38, d: 0.3, f: DO5, tipo: 'triangle', g: 0.17 }, { t: 0.5, d: 0.3, f: MI5, tipo: 'triangle', g: 0.17 },
    { t: 0.62, d: 0.3, f: SOL5, tipo: 'triangle', g: 0.17 }, { t: 0.74, d: 0.55, f: DO6, tipo: 'sine', g: 0.19 },
  ],
  // Plaga: un zumbido grave que baja un poco, con un segundo tono desafinado.
  plaga: [{ t: 0, d: 0.7, f: 150, f2: 105, tipo: 'sawtooth', g: 0.06 }, { t: 0, d: 0.7, f: 158, f2: 110, tipo: 'square', g: 0.035 }, { t: 0.1, d: 0.5, f: 2600, ruido: true, g: 0.04, q: 3 }],
  habla: [{ t: 0, d: 0.05, f: MI5, tipo: 'triangle', g: 0.08 }],
  paso: [{ t: 0, d: 0.09, f: RE5, tipo: 'triangle', g: 0.15 }, { t: 0.07, d: 0.13, f: SOL5, tipo: 'triangle', g: 0.14 }],
  exito: [{ t: 0, d: 0.16, f: DO5, tipo: 'sine', g: 0.18 }, { t: 0.1, d: 0.16, f: MI5, tipo: 'sine', g: 0.18 }, { t: 0.2, d: 0.4, f: SOL5, tipo: 'sine', g: 0.2 }],
};

export const DURACION_MAX_S = 1.5;
const LLAVE = 'agrohive:sonido:v1';

// ---- Motor (con el contexto de audio inyectable para las pruebas)

export interface FabricaAudio { crear(): AudioContext | null }
const fabricaNavegador: FabricaAudio = {
  crear() {
    const Ctor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    try { return Ctor ? new Ctor() : null; } catch { return null; }
  },
};

/** Programa una receta en el contexto; devuelve cuantas notas programo. */
export function programar(ctx: AudioContext, salida: AudioNode, receta: readonly Nota[], inicio = ctx.currentTime, tono = 1, ruido?: AudioBuffer): number {
  let n = 0;
  for (const nota of receta) {
    const t0 = inicio + nota.t;
    const t1 = t0 + Math.min(nota.d, DURACION_MAX_S);
    const volumen = ctx.createGain();
    volumen.gain.setValueAtTime(0.0001, t0);
    volumen.gain.exponentialRampToValueAtTime(Math.max(0.0002, nota.g ?? 0.15), t0 + 0.012);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t1);
    volumen.connect(salida);
    if (nota.ruido) {
      if (!ruido) continue;
      const fuente = ctx.createBufferSource();
      fuente.buffer = ruido;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.setValueAtTime(nota.f * tono, t0);
      filtro.Q.setValueAtTime(nota.q ?? 1.2, t0);
      fuente.connect(filtro);
      filtro.connect(volumen);
      fuente.start(t0);
      fuente.stop(t1 + 0.05);
    } else {
      const osc = ctx.createOscillator();
      osc.type = nota.tipo ?? 'sine';
      osc.frequency.setValueAtTime(nota.f * tono, t0);
      if (nota.f2) osc.frequency.exponentialRampToValueAtTime(nota.f2 * tono, t1);
      osc.connect(volumen);
      osc.start(t0);
      osc.stop(t1 + 0.05);
    }
    n += 1;
  }
  return n;
}

export function crearMotor(fabrica: FabricaAudio = fabricaNavegador, almacen: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage) {
  let ctx: AudioContext | null = null;
  let maestro: GainNode | null = null;
  let ruido: AudioBuffer | undefined;
  let activo = true;
  try { if (almacen?.getItem(LLAVE) === '0') activo = false; } catch { /* sin almacenamiento: queda activo */ }
  const oyentes = new Set<() => void>();

  function asegurar(): AudioContext | null {
    if (ctx) return ctx;
    ctx = fabrica.crear();
    if (!ctx) return null;
    maestro = ctx.createGain();
    maestro.gain.value = 0.55;
    maestro.connect(ctx.destination);
    // Un segundo de ruido blanco, compartido por los soplidos.
    const largo = Math.floor(ctx.sampleRate);
    ruido = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = ruido.getChannelData(0);
    for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    return ctx;
  }

  return {
    estaActivo: () => activo,
    alternar(valor?: boolean) {
      activo = valor ?? !activo;
      try { almacen?.setItem(LLAVE, activo ? '1' : '0'); } catch { /* sin almacenamiento */ }
      oyentes.forEach((f) => f());
    },
    suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f); }; },
    /** Toca un efecto; no hace nada si esta silenciado o no hay audio. `tono` multiplica las frecuencias (1 = normal). */
    tocar(nombre: NombreSonido, tono = 1): boolean {
      if (!activo) return false;
      const c = asegurar();
      if (!c || !maestro) return false;
      if (c.state === 'suspended') void c.resume().catch(() => {});
      programar(c, maestro, RECETAS[nombre], c.currentTime, tono, ruido);
      return true;
    },
  };
}

// Motor unico de la aplicacion.
export const motor = crearMotor();
export const tocar = (nombre: NombreSonido, tono = 1) => motor.tocar(nombre, tono);

/** Un "clic" suave en cada boton o enlace de la pagina. Devuelve la funcion que lo quita. */
export function instalarClicGlobal(raiz: Document = document): () => void {
  const alClic = (ev: Event) => {
    const objetivo = (ev.target as Element | null)?.closest?.('button, a, [role="radio"], summary');
    if (objetivo && !objetivo.hasAttribute('disabled') && objetivo.getAttribute('aria-disabled') !== 'true' && !objetivo.hasAttribute('data-sin-sonido')) motor.tocar('clic');
  };
  raiz.addEventListener('click', alClic, true);
  return () => raiz.removeEventListener('click', alClic, true);
}
