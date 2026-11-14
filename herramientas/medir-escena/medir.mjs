#!/usr/bin/env node
// Medicion de la escena 3D en este equipo (A5.4). Abre web/medir.html en Chrome con un
// perfil temporal, espera a que la pagina termine y guarda el resultado en JSON y texto.
// Uso:
//   node herramientas/medir-escena/medir.mjs [--url URL] [--ventana] [--chrome RUTA] [--salida DIR]
//   --url      pagina de medicion (por defecto http://127.0.0.1:5173/medir.html)
//              agrega ?api=<url> para medir contra otra API (por ejemplo el droplet)
//   --ventana  abre Chrome con ventana: usa la GPU real del equipo (headless suele usar
//              render por software y da cifras pesimistas)
//   --chrome   ruta del ejecutable (por defecto google-chrome-stable, google-chrome o chromium)
//   --salida   carpeta de resultados (por defecto herramientas/medir-escena/resultados)
// Requiere Node 22 o mas reciente (WebSocket global). No usa la sesion del usuario.

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (nombre, defecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : defecto;
};
const url = opcion('url', 'http://127.0.0.1:5173/medir.html');
const ventana = args.includes('--ventana');
const salida = opcion('salida', join(dirname(fileURLToPath(import.meta.url)), 'resultados'));
const chrome =
  opcion('chrome', null) ??
  ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);
if (!chrome) {
  console.error('No encontre Chrome o Chromium; indica la ruta con --chrome.');
  process.exit(1);
}

const perfil = mkdtempSync(join(tmpdir(), 'agrohive-medir-'));
const puerto = 9400 + Math.floor(Math.random() * 400);
const banderas = [`--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${puerto}`, '--window-size=1280,900'];
if (!ventana) banderas.push('--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const proceso = spawn(chrome, [...banderas, 'about:blank'], { stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const terminar = async (codigo) => {
  const salio = new Promise((r) => proceso.once('exit', r));
  proceso.kill();
  await Promise.race([salio, dormir(5000)]);
  rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  process.exit(codigo);
};

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try {
    const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
    const pagina = lista.find((t) => t.type === 'page');
    if (pagina) ws = new WebSocket(pagina.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await dormir(250);
}
if (!ws) {
  console.error('Chrome no abrio el puerto de depuracion.');
  await terminar(1);
}
if (ws.readyState !== 1) await new Promise((r) => ws.addEventListener('open', r));

let id = 0;
const pendientes = new Map();
const errores = [];
const cmd = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pendientes.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m.result ?? m.error);
    pendientes.delete(m.id);
  } else if (m.method === 'Runtime.exceptionThrown') {
    errores.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errores.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});
await cmd('Runtime.enable');
await cmd('Page.enable');
console.log(`Midiendo ${url} (${ventana ? 'con ventana, GPU del equipo' : 'headless, render por software'})...`);
await cmd('Page.navigate', { url });

let resultado = null;
for (let t = 0; t < 300; t++) {
  await dormir(1000);
  const r = await cmd('Runtime.evaluate', { expression: 'window.__medicion ?? null', returnByValue: true });
  resultado = r?.result?.value ?? null;
  if (resultado?.terminado) break;
}
if (!resultado?.terminado) {
  console.error('La medicion no termino en 5 minutos.', resultado ? '' : 'La pagina no respondio (revisa la URL).');
  await terminar(1);
}
resultado.erroresConsola = errores;

mkdirSync(salida, { recursive: true });
const sello = resultado.fecha.replace(/[:.]/g, '-');
const foto = await cmd('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(salida, `medicion-${sello}.png`), Buffer.from(foto.data, 'base64'));
writeFileSync(join(salida, `medicion-${sello}.json`), JSON.stringify(resultado, null, 2));

const lineas = [
  `Medicion de la escena 3D · ${resultado.fecha}`,
  `Navegador: ${resultado.navegador}`,
  `GPU: ${resultado.gpu.renderer ?? 'desconocida'} (${resultado.gpu.vendedor ?? '?'}) · WebGL2 ${resultado.gpu.webgl2 ? 'si' : 'no'} · WebGL1 ${resultado.gpu.webgl1 ? 'si' : 'no'} · modo ${resultado.modo}`,
  `Preparacion de datos (motor y API): ${resultado.preparacionMs ?? 'sin dato'} ms`,
  `Equipo: ${resultado.equipo.nucleos ?? '?'} nucleos · memoria ${resultado.equipo.memoriaGB ?? '?'} GB · pantalla ${resultado.equipo.pantalla} · dpr ${resultado.equipo.dpr}`,
  ...resultado.medidas.map(
    (m) =>
      `- ${m.caso}: primera escena ${m.primeraEscenaMs ?? 'sin dato'} ms · ${m.triangulos} triangulos · ${m.drawCalls} draw calls · ${m.cuadrosEnReposo} cuadros en ${m.segundosReposo} s de reposo · ${m.cuadrosPorSegundoConViento} cuadros/s con viento · memoria ${m.memoriaMB ?? 'no disponible'} MB · lluvia del dia ${m.lluviaDelDia}${m.nota ? ` · ${m.nota}` : ''}`,
  ),
  `Perdida de contexto: ${resultado.perdidaContexto ? (resultado.perdidaContexto.extension ? `perdido ${resultado.perdidaContexto.perdido ? 'si' : 'no'}, recuperado ${resultado.perdidaContexto.restaurado ? 'si' : 'no'}` : 'sin WEBGL_lose_context') : 'no se probo'}`,
  `Errores: ${[...resultado.errores, ...errores].length === 0 ? 'ninguno' : [...resultado.errores, ...errores].join(' | ')}`,
];
writeFileSync(join(salida, `medicion-${sello}.txt`), lineas.join('\n') + '\n');
console.log(lineas.join('\n'));
console.log(`\nGuardado en ${salida}/medicion-${sello}.{json,txt,png}`);
await terminar(0);
