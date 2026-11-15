import { describe, expect, it } from 'vitest';
import { crearMotor, DURACION_MAX_S, PENTATONICA, programar, RECETAS, type NombreSonido } from './sonido';

/** Contexto de audio falso: cuenta lo que se programa, sin sonar. */
function falso() {
  const log = { osciladores: [] as { tipo: string; f: number; f2?: number | undefined; inicio: number; fin: number }[], ruidos: 0, resumido: 0, creado: 0 };
  const parametro = (aVal?: (n: number) => void) => ({ value: 0, setValueAtTime: (v: number) => aVal?.(v), exponentialRampToValueAtTime: (v: number) => aVal?.(v) });
  const ctx = {
    currentTime: 10, sampleRate: 8000, state: 'running', destination: {},
    createGain: () => ({ gain: parametro(), connect() {} }),
    createOscillator() {
      const o = { type: 'sine', frequency: { value: 0, setValueAtTime(v: number) { r.f = v; }, exponentialRampToValueAtTime(v: number) { r.f2 = v; } }, connect() {}, start(t: number) { r.inicio = t; }, stop(t: number) { r.fin = t; } };
      const r = { tipo: 'sine', f: 0, f2: undefined as number | undefined, inicio: 0, fin: 0 };
      Object.defineProperty(o, 'type', { set(v: string) { r.tipo = v; }, get() { return r.tipo; } });
      log.osciladores.push(r);
      return o;
    },
    createBufferSource: () => { log.ruidos += 1; return { buffer: null, connect() {}, start() {}, stop() {} }; },
    createBiquadFilter: () => ({ type: '', frequency: parametro(), Q: parametro(), connect() {} }),
    createBuffer: (_c: number, largo: number) => ({ getChannelData: () => new Float32Array(largo) }),
    resume: () => { log.resumido += 1; return Promise.resolve(); },
  } as unknown as AudioContext;
  return { ctx, log, fabrica: { crear: () => { log.creado += 1; return ctx; } } };
}
const almacen = (inicial: string | null = null) => { let v = inicial; return { getItem: () => v, setItem: (_k: string, x: string) => { v = x; }, valor: () => v }; };

describe('efectos de sonido', () => {
  it('cada efecto tiene notas con tiempos y volumenes sensatos y no dura mas del maximo', () => {
    for (const [nombre, receta] of Object.entries(RECETAS)) {
      expect(receta.length, nombre).toBeGreaterThan(0);
      for (const n of receta) {
        expect(n.d, nombre).toBeGreaterThan(0);
        expect(n.t + Math.min(n.d, DURACION_MAX_S), nombre).toBeLessThanOrEqual(1.6);
        expect(n.f, nombre).toBeGreaterThan(20);
        expect(n.f, nombre).toBeLessThan(8000);
        expect(n.g ?? 0.15, nombre).toBeLessThanOrEqual(0.25); // suaves: nada fuerte
      }
    }
  });
  it('los efectos melodicos usan la escala pentatonica y los otros son tonos o soplidos', () => {
    for (const nombre of ['aviso', 'exito', 'paso', 'habla'] as NombreSonido[]) {
      for (const n of RECETAS[nombre]) expect(PENTATONICA as readonly number[], nombre).toContain(n.f);
    }
    expect(RECETAS.cosecha.some((n) => n.ruido)).toBe(true); // el soplido de la guadana
    expect(RECETAS.rociar.every((n) => n.ruido)).toBe(true);
  });
  it('programa osciladores y soplidos en el contexto', () => {
    const { ctx, log } = falso();
    const n = programar(ctx, {} as AudioNode, RECETAS.cosecha, 10, 1, { } as AudioBuffer);
    expect(n).toBe(RECETAS.cosecha.length);
    expect(log.ruidos).toBe(1);
    expect(log.osciladores).toHaveLength(RECETAS.cosecha.length - 1);
    expect(log.osciladores[0]!.inicio).toBeCloseTo(10.38, 5);
    expect(programar(ctx, {} as AudioNode, RECETAS.rociar, 10, 1, undefined)).toBe(0); // sin buffer de ruido no inventa un tono
  });
  it('el tono multiplica las frecuencias', () => {
    const { ctx, log } = falso();
    programar(ctx, {} as AudioNode, RECETAS.habla, 0, 2);
    expect(log.osciladores[0]!.f).toBeCloseTo(RECETAS.habla[0]!.f * 2, 6);
  });
  it('no crea audio hasta que se toca algo, y reutiliza el contexto', () => {
    const { fabrica, log } = falso();
    const m = crearMotor(fabrica, almacen());
    expect(log.creado).toBe(0);
    expect(m.tocar('clic')).toBe(true);
    expect(m.tocar('pintar')).toBe(true);
    expect(log.creado).toBe(1);
  });
  it('silenciado no suena ni crea audio, y la eleccion se guarda', () => {
    const { fabrica, log } = falso();
    const a = almacen();
    const m = crearMotor(fabrica, a);
    m.alternar(false);
    expect(m.estaActivo()).toBe(false);
    expect(m.tocar('cosecha')).toBe(false);
    expect(log.creado).toBe(0);
    expect(a.valor()).toBe('0');
    expect(crearMotor(fabrica, almacen('0')).estaActivo()).toBe(false); // recuerda lo guardado
    m.alternar();
    expect(m.estaActivo()).toBe(true);
    expect(a.valor()).toBe('1');
  });
  it('avisa a quien escucha cuando se alterna y sin audio disponible no falla', () => {
    const m = crearMotor({ crear: () => null }, almacen());
    let veces = 0;
    const quitar = m.suscribir(() => { veces += 1; });
    m.alternar(false); m.alternar(true);
    expect(veces).toBe(2);
    quitar(); m.alternar(false);
    expect(veces).toBe(2);
    m.alternar(true);
    expect(m.tocar('clic')).toBe(false); // activo, pero el navegador no tiene audio: no pasa nada
  });
  it('reanuda un contexto suspendido (politica de autoplay)', () => {
    const { ctx, fabrica, log } = falso();
    (ctx as unknown as { state: string }).state = 'suspended';
    crearMotor(fabrica, almacen()).tocar('clic');
    expect(log.resumido).toBe(1);
  });

  it('con gesto exigido, nada suena ni se crea audio hasta el primer gesto del usuario', () => {
    const { fabrica, log } = falso();
    const m = crearMotor(fabrica, almacen(), true);
    expect(m.estaDesbloqueado()).toBe(false);
    expect(m.tocar('habla')).toBe(false); // p. ej. los blips de Esquilote antes de cualquier clic
    expect(log.creado).toBe(0);
    m.desbloquear();
    expect(log.creado).toBe(1);
    expect(m.estaDesbloqueado()).toBe(true);
    expect(m.tocar('clic')).toBe(true);
    expect(log.osciladores.length).toBeGreaterThan(0);
  });
  it('al desbloquear despierta un audio dormido y las notas esperan a que corra el reloj', async () => {
    const { ctx, fabrica, log } = falso();
    (ctx as unknown as { state: string }).state = 'suspended';
    (ctx as unknown as { resume: () => Promise<void> }).resume = () => { log.resumido += 1; (ctx as unknown as { state: string }).state = 'running'; return Promise.resolve(); };
    const m = crearMotor(fabrica, almacen(), true);
    m.desbloquear();
    expect(log.resumido).toBe(1);
    (ctx as unknown as { state: string }).state = 'suspended';
    m.tocar('pintar');
    expect(log.osciladores).toHaveLength(0); // aun dormido: no programa nada
    await Promise.resolve(); await Promise.resolve();
    expect(log.osciladores.length).toBeGreaterThan(0); // ya corre: ahora si
  });
  it('si el navegador no lo deja despertar, no programa notas ni falla', async () => {
    const { ctx, fabrica, log } = falso();
    (ctx as unknown as { state: string }).state = 'suspended';
    (ctx as unknown as { resume: () => Promise<void> }).resume = () => Promise.resolve(); // sigue suspended
    const m = crearMotor(fabrica, almacen(), true);
    m.desbloquear();
    m.tocar('aviso');
    await Promise.resolve(); await Promise.resolve();
    expect(log.osciladores).toHaveLength(0);
  });
  it('silenciado, el desbloqueo no hace sonar nada', () => {
    const { fabrica, log } = falso();
    const m = crearMotor(fabrica, almacen('0'), true);
    m.desbloquear();
    expect(m.tocar('clic')).toBe(false);
    expect(log.osciladores).toHaveLength(0);
  });
});
