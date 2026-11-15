// Prueba de "reducir movimiento" (A5.1) en un Chrome real. Lanza su propio Chrome sin pantalla, lo conduce por el
// protocolo de depuracion (CDP) y revisa la escena con window.escenaPrueba. Detalle en README.md.
// Uso:  node movimiento.mjs [urlEscena] [puertoChrome]
//   urlEscena     por defecto http://127.0.0.1:5173/escena.html (la vista previa; antes hay que correr `npm run dev` en web/)
//   puertoChrome  por defecto 9333
// Variables: CHROME_PATH (ruta de Chrome o Edge si no se encuentra solo), CHROME_NO_SANDBOX=1 (Linux o CI).
// Codigo de salida: 0 si todo pasa, 1 si algo falla, 2 si no puede correr (Node viejo, sin Chrome o sin servidor).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (typeof WebSocket === 'undefined') {
  console.error(`Hace falta Node 22 o mas (WebSocket global). Version actual: ${process.version}`);
  process.exit(2);
}
const urlEscena = process.argv[2] ?? 'http://127.0.0.1:5173/escena.html';
const puerto = process.argv[3] ?? '9333';

const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const rutaChrome = CANDIDATOS.find((r) => r && existsSync(r));
if (!rutaChrome) {
  console.error('No encontre Chrome ni Edge. Define CHROME_PATH con su ruta.');
  process.exit(2);
}
try {
  const r = await fetch(urlEscena);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
} catch (e) {
  console.error(`La escena no responde en ${urlEscena} (${e.message}). Arranca "npm run dev" en web/.`);
  process.exit(2);
}

const perfil = mkdtempSync(join(tmpdir(), 'agrohive-movimiento-'));
const chrome = spawn(
  rutaChrome,
  ['--headless=new', `--remote-debugging-port=${puerto}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,900',
    `--user-data-dir=${perfil}`, ...(process.env.CHROME_NO_SANDBOX ? ['--no-sandbox'] : []), 'about:blank'],
  { stdio: 'ignore' },
);
// Pase lo que pase (exito, falla o excepcion), no dejar Chrome ni su perfil temporal.
process.on('exit', () => {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
    else chrome.kill();
  } catch { /* ya cerrado */ }
  // En Windows los archivos del perfil siguen bloqueados un instante tras cerrar Chrome: reintentar.
  for (let i = 0; i < 8; i++) {
    try { rmSync(perfil, { recursive: true, force: true }); break; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300); }
  }
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const resultados = [];
const anotar = (nombre, ok, detalle) => { resultados.push({ nombre, ok, detalle }); console.log(`${ok ? 'OK    ' : 'FALLA '} ${nombre}${detalle ? '  -> ' + detalle : ''}`); };

async function conectar() {
  for (let i = 0; i < 80; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
      const pag = lista.find((t) => t.type === 'page');
      if (pag) return pag.webSocketDebuggerUrl;
    } catch { /* Chrome aun no escucha */ }
    await dormir(500);
  }
  throw new Error('Chrome no respondio en el puerto de depuracion');
}

const ws = new WebSocket(await conectar());
await new Promise((r) => (ws.onopen = r));
let n = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const enviar = (method, params = {}) => new Promise((res) => { const i = ++n; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluar = async (expr) => {
  const r = await enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.error) throw new Error(JSON.stringify(r.error));
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'excepcion en la pagina');
  return r.result.result.value;
};
const emular = (reducir) => enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducir ? 'reduce' : 'no-preference' }] });

// Lo que se evalua dentro de la pagina.
const ESTADO = `(() => { const e = window.escenaPrueba; if (!e) return null; const s = e.estadisticas();
  const pl = e.raiz.children.filter((c) => c.isInstancedMesh && String(c.name).startsWith('planta-'));
  let mn = Infinity, mx = 0; for (const m of pl) for (let k = 0; k < m.count; k++) { const a = m.instanceMatrix.array, o = k * 16, esc = Math.hypot(a[o], a[o+1], a[o+2]); if (esc < mn) mn = esc; if (esc > mx) mx = esc; }
  const caja = (t) => [...document.querySelectorAll('label')].find((l) => l.textContent.includes(t))?.querySelector('input');
  return { cuadros: s.cuadros, inercia: s.inercia, transiciones: s.transiciones, viento: s.viento, mascota: s.mascota,
    lluvia: s.lluvia, gotas: s.gotas, intensidadLluvia: e.intensidadLluviaActual(),
    plantas: pl.length, escalaMin: pl.length ? mn : null, escalaMax: pl.length ? mx : null, saliendo: e.salida.children.length,
    chkReducir: caja('Reducir movimiento')?.checked ?? null, chkVientoDeshab: caja('Viento leve')?.disabled ?? null, chkViento: caja('Viento leve')?.checked ?? null }; })()`;
const CAMBIAR_ETAPA = `(() => { const e = window.escenaPrueba; const m = JSON.parse(JSON.stringify(e.modeloActual));
  let c = 0; for (const b of m.bloques) if (b.cultivo && b.etapa && b.etapa !== 'suelo_desnudo') { b.etapa = b.etapa === 'madurez' ? 'brote' : 'madurez'; c++; }
  e.actualizar(m); return c; })()`;
// La lluvia del dia (doc 06) anima a proposito mientras se ve, como el viento: el reposo se mide sin ella, igual que
// web/medir.html. El dia por defecto de la vista previa (seco, 2016-07-16, clima real 2023-07-16) trae 19.9 mm.
const QUITAR_LLUVIA = `(() => { window.escenaPrueba.setLluvia(0); return true; })()`;
const CLIC = (t) => `(() => { const i = [...document.querySelectorAll('label')].find((l) => l.textContent.includes(${JSON.stringify(t)}))?.querySelector('input'); if (!i) return false; i.click(); return true; })()`;

async function cargar(reducir) {
  await emular(reducir);
  await enviar('Page.enable'); await enviar('Page.navigate', { url: urlEscena });
  for (let i = 0; i < 120; i++) { await dormir(500); try { const s = await evaluar(ESTADO); if (s && s.plantas > 0 && s.transiciones === 0) return s; } catch { /* pagina cargando */ } }
  throw new Error('la escena no llego a dibujar plantas');
}
// Muestrea durante `ms`: maximo de transiciones, y cuanto tardo en quedar en 0.
async function muestrear(ms) {
  const t0 = Date.now(); let maxT = 0, finT = null, maxSal = 0;
  while (Date.now() - t0 < ms) { const s = await evaluar(ESTADO); maxT = Math.max(maxT, s.transiciones); maxSal = Math.max(maxSal, s.saliendo);
    if (maxT > 0 && s.transiciones === 0 && finT === null) finT = Date.now() - t0; await dormir(25); }
  return { maxT, finT, maxSal };
}
const cuadrosEnReposo = async (ms = 700) => { const a = (await evaluar(ESTADO)).cuadros; await dormir(ms); return (await evaluar(ESTADO)).cuadros - a; };

// ---------- A. Sin reducir movimiento: debe animar y quedar quieta (control) ----------
let s = await cargar(false);
anotar('A0. sin preferencia: la inercia esta activa y hay plantas', s.inercia === true && s.plantas > 0, `inercia=${s.inercia}, mallas=${s.plantas}, checkbox reducir=${s.chkReducir}`);
// Control de la lluvia: si el dia de la vista previa no lloviera, se pone una intensidad de prueba.
if (!(s.intensidadLluvia > 0)) await evaluar(`(() => { window.escenaPrueba.setLluvia(0.4); return true; })()`);
await dormir(100); s = await evaluar(ESTADO);
anotar('L1. con lluvia del dia y sin reducir, la lluvia se anima y la escena dibuja (control)', s.lluvia === true && s.gotas > 0 && (await cuadrosEnReposo(500)) > 5, `lluvia=${s.lluvia}, gotas=${s.gotas}, intensidad=${s.intensidadLluvia?.toFixed(2)}`);
await evaluar(QUITAR_LLUVIA); await dormir(100);
anotar('L2. sin lluvia, viento ni transiciones, la escena queda en reposo (0 cuadros)', (await cuadrosEnReposo()) === 0, '');
await evaluar(CAMBIAR_ETAPA);
let m = await muestrear(1400);
anotar('A1. al cambiar de etapa HAY transicion (control: si no la hubiera, la prueba no probaria nada)', m.maxT > 0, `transiciones max=${m.maxT}, termino a los ${m.finT} ms (esperado ~450), plantas saliendo max=${m.maxSal}`);
let r0 = await cuadrosEnReposo();
anotar('A2. terminada la transicion, la escena queda en reposo (0 cuadros)', r0 === 0, `${r0} cuadros en 700 ms`);
s = await evaluar(ESTADO);
anotar('A3. al terminar, las plantas estan en su escala final (no en 0)', s.escalaMin > 0.8 && s.escalaMax <= 1.0001, `escala min=${s.escalaMin?.toFixed(3)} max=${s.escalaMax?.toFixed(3)}`);

// ---------- B. Viento y cambio en vivo ----------
await evaluar(CLIC('Viento leve'));
await dormir(250); s = await evaluar(ESTADO);
anotar('B1. con "Viento leve" encendido, el viento corre y la escena sigue dibujando', s.viento === true && (await cuadrosEnReposo(500)) > 5, `viento=${s.viento}`);
await evaluar(CAMBIAR_ETAPA); await dormir(120);
const antes = await evaluar(ESTADO);
anotar('B2. hay una transicion en curso justo antes de reducir', antes.transiciones > 0, `transiciones=${antes.transiciones}`);
await emular(true); await dormir(300);                                   // el sistema pide menos movimiento EN VIVO
s = await evaluar(ESTADO);
anotar('B3. en vivo: las transiciones en curso terminan de inmediato', s.transiciones === 0 && s.saliendo === 0, `transiciones=${s.transiciones}, mallas saliendo=${s.saliendo}`);
anotar('B4. en vivo: se apagan inercia y viento, y el control refleja la preferencia', s.inercia === false && s.viento === false && s.chkReducir === true && s.chkVientoDeshab === true, `inercia=${s.inercia}, viento=${s.viento}, checkbox reducir=${s.chkReducir}, viento deshabilitado=${s.chkVientoDeshab}`);
anotar('B5. en vivo: tras reducir, la escena queda en reposo (0 cuadros)', (await cuadrosEnReposo()) === 0, '');
s = await evaluar(ESTADO);
anotar('B6. las plantas que estaban a medio crecer quedan en su escala final', s.escalaMin > 0.8 && s.escalaMax <= 1.0001, `escala min=${s.escalaMin?.toFixed(3)} max=${s.escalaMax?.toFixed(3)}`);

// ---------- C. Con reducir activo, un cambio de etapa no anima ----------
await evaluar(CAMBIAR_ETAPA);
m = await muestrear(1200);
anotar('C1. con reducir activo, cambiar de etapa NO crea transiciones ni mallas saliendo', m.maxT === 0 && m.maxSal === 0, `transiciones max=${m.maxT}, saliendo max=${m.maxSal}`);
s = await evaluar(ESTADO);
anotar('C2. el cambio se ve de inmediato: plantas nuevas ya en su escala final', s.plantas > 0 && s.escalaMin > 0.8, `mallas=${s.plantas}, escala min=${s.escalaMin?.toFixed(3)}`);
anotar('C3. y la escena queda en reposo (0 cuadros)', (await cuadrosEnReposo()) === 0, '');
await evaluar(CLIC('Viento leve'));
await dormir(250); s = await evaluar(ESTADO);
anotar('C4. con reducir activo, el viento no se puede encender (el control esta deshabilitado)', s.viento === false && s.chkVientoDeshab === true, `viento=${s.viento}, deshabilitado=${s.chkVientoDeshab}`);

// ---------- D. Arranque con la preferencia ya activa ----------
s = await cargar(true);
anotar('D1. arranque con la preferencia activa: sin inercia, sin transiciones, sin viento', s.inercia === false && s.transiciones === 0 && s.viento === false, `inercia=${s.inercia}, transiciones=${s.transiciones}, viento=${s.viento}`);
anotar('D2. arranque con la preferencia activa: el checkbox sale marcado y las plantas en escala final', s.chkReducir === true && s.escalaMin > 0.8, `checkbox=${s.chkReducir}, escala min=${s.escalaMin?.toFixed(3)}`);
anotar('D3. arranque con la preferencia activa: reposo total (0 cuadros)', (await cuadrosEnReposo()) === 0, '');
anotar('D4. la mascota esta en la escena y no se mueve (0 cuadros)', s.mascota === true, `mascota=${s.mascota}`);
anotar('L3. con reducir, un dia con lluvia no dibuja gotas ni anima (queda el indicador fijo)', s.intensidadLluvia > 0 && s.lluvia === false && s.gotas === 0, `intensidad=${s.intensidadLluvia?.toFixed(2)}, lluvia=${s.lluvia}, gotas=${s.gotas}`);

// ---------- E. El control manual (sin preferencia del sistema) ----------
s = await cargar(false);
await evaluar(CLIC('Reducir movimiento')); await dormir(300);
s = await evaluar(ESTADO);
anotar('E1. el checkbox manual apaga inercia y viento aunque el sistema no lo pida', s.inercia === false && s.viento === false && s.chkReducir === true, `inercia=${s.inercia}, checkbox=${s.chkReducir}`);
await evaluar(CAMBIAR_ETAPA); m = await muestrear(1000);
anotar('E2. con el checkbox manual, cambiar de etapa tampoco anima', m.maxT === 0, `transiciones max=${m.maxT}`);
await evaluar(CLIC('Reducir movimiento')); await dormir(300);
await evaluar(CAMBIAR_ETAPA); m = await muestrear(1400);
anotar('E3. al desmarcarlo, vuelve a animar (la animacion no queda rota)', m.maxT > 0, `transiciones max=${m.maxT}, termino a los ${m.finT} ms`);

// ---------- F. Inercia REAL de la camara: arrastrar con el mouse y soltar ----------
const POS = `(() => { const p = window.escenaPrueba.camara.position; return [p.x, p.y, p.z]; })()`;
const distancia = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
async function arrastrarYSoltar() {
  const c = await evaluar(`(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const inicio = await evaluar(POS);
  await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
  await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.x, y: c.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 10; i++) { await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x + i * 30, y: c.y + i * 2, button: 'left', buttons: 1 }); await dormir(16); }
  await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.x + 300, y: c.y + 20, button: 'left', buttons: 0, clickCount: 1 });
  const alSoltar = await evaluar(POS);
  await dormir(500);
  const despues = await evaluar(POS);
  return { girado: distancia(inicio, alSoltar), inerciaTrasSoltar: distancia(alSoltar, despues) };
}
s = await cargar(false);
let g = await arrastrarYSoltar();
anotar('F1. sin reducir: arrastrar SI gira la camara (control)', g.girado > 0.5, `giro=${g.girado.toFixed(2)} unidades`);
anotar('F2. sin reducir: al soltar la camara sigue moviendose por inercia (control)', g.inerciaTrasSoltar > 0.05, `movimiento tras soltar=${g.inerciaTrasSoltar.toFixed(3)}`);
s = await cargar(true);
g = await arrastrarYSoltar();
anotar('F3. con reducir: arrastrar SI sigue girando la camara (la vista no se bloquea)', g.girado > 0.5, `giro=${g.girado.toFixed(2)} unidades`);
anotar('F4. con reducir: al soltar la camara se detiene en seco (sin inercia)', g.inerciaTrasSoltar < 0.001, `movimiento tras soltar=${g.inerciaTrasSoltar.toFixed(5)}`);
anotar('F5. con reducir: tras soltar, la escena queda en reposo (0 cuadros)', (await cuadrosEnReposo()) === 0, '');

// ---------- G. Cambios rapidos no se acumulan ----------
for (const reducir of [false, true]) {
  s = await cargar(reducir);
  await evaluar(QUITAR_LLUVIA);
  for (let i = 0; i < 8; i++) { await evaluar(CAMBIAR_ETAPA); await dormir(35); }      // 8 cambios en ~0.3 s
  await dormir(1600);
  const f = await evaluar(ESTADO);
  anotar(`G${reducir ? 2 : 1}. ${reducir ? 'con' : 'sin'} reducir: 8 cambios seguidos no dejan mallas de mas, ni salientes, ni transiciones colgadas`, f.plantas === 1 && f.saliendo === 0 && f.transiciones === 0, `mallas de plantas=${f.plantas} (esperado 1), saliendo=${f.saliendo}, transiciones=${f.transiciones}`);
  anotar(`G${reducir ? 2 : 1}b. ${reducir ? 'con' : 'sin'} reducir: despues de los 8 cambios las plantas estan en su escala final y hay reposo`, f.escalaMin > 0.8 && f.escalaMax <= 1.0001 && (await cuadrosEnReposo()) === 0, `escala min=${f.escalaMin?.toFixed(3)} max=${f.escalaMax?.toFixed(3)}`);
}

const fallos = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} comprobaciones en verde`);
ws.close(); process.exit(fallos ? 1 : 0);
