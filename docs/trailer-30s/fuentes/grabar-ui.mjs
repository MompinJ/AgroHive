// Tomas con interfaz en ingles, cuadro por cuadro: reloj de la pagina controlado y animaciones CSS avanzadas a mano.
// Uso: node grabar-ui.mjs <salida> <url base> <id>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [OUT, BASE, ID] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.25, locale: 'en-US' });
await ctx.addInitScript(() => { try { localStorage.setItem('agrohive-idioma', 'en'); localStorage.setItem('agrohive:graficos:v1', 'alto'); } catch {} });
const p = await ctx.newPage();
p.on('pageerror', e => console.log(ID, 'ERR', e.message));
const espera = (ms) => p.waitForTimeout(ms);
const saltar = async () => { await p.getByText('Skip tutorial').click({ timeout: 1500 }).catch(() => {}); };
async function semana(n) {
  await p.locator('input[type=range]').evaluate((r, v) => {
    const val = v < 0 ? Number(r.max) + v : v;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(r, String(val));
    for (const t of ['input', 'change', 'pointerup']) r.dispatchEvent(new Event(t, { bubbles: true }));
  }, n);
}
async function abrirBajio({ tutorialCultivos = false } = {}) {
  await p.goto(`${BASE}/#/terreno`); await espera(2500); await saltar();
  await p.locator('.terrain-ejemplo', { hasText: 'Bajío' }).click();
  await espera(7000);
  if (!tutorialCultivos) await saltar();
}
async function aEscenarios() {
  await p.getByRole('button', { name: /See scenarios/ }).click(); await espera(7000); await saltar();
  await p.getByRole('button', { name: 'Hide tips' }).click({ timeout: 1500 }).catch(() => {});
}
// Cada toma: preparar (antes del reloj), cuadros y acciones por cuadro.
const TOMAS = {
  T3a: { cuadros: 200, async preparar() { await p.goto(`${BASE}/#/terreno`); await espera(2500); await saltar(); await p.locator('.terrain-ejemplo').first().scrollIntoViewIfNeeded(); await espera(800); },
    acciones: { 55: async () => { await p.locator('.terrain-ejemplo', { hasText: 'Bajío' }).hover(); }, 80: async () => { await p.locator('.terrain-ejemplo', { hasText: 'Bajío' }).click(); } } },
  T3b: { cuadros: 230, async preparar() { await abrirBajio({ tutorialCultivos: true }); await espera(2000); await p.getByRole('button', { name: /wide size/ }).click().catch(() => {}); },
    acciones: { 30: async () => { await p.locator('.lab-tip', { hasText: 'Sorghum' }).first().click(); } }, pintar: { desde: 70, hasta: 200, de: [1000, 430], a: [1380, 690] } },
  T4a: { cuadros: 210, async preparar() { await abrirBajio(); await aEscenarios(); await semana(9); await espera(2500); },
    acciones: { 30: async () => p.locator('.lab-escenario-seco').click(), 95: async () => p.locator('.lab-escenario-lluvioso').click(), 160: async () => p.locator('.lab-escenario-seco').click() } },
  T4b: { cuadros: 250, async preparar() { await abrirBajio(); await aEscenarios(); await p.locator('.lab-escenario-seco').click(); await espera(1500); await semana(-1); await espera(2500); },
    acciones: { 15: async () => p.getByRole('button', { name: /Next week/i }).click() } },
  T4c: { cuadros: 230, async preparar() { await abrirBajio(); await aEscenarios(); await p.locator('.lab-escenario-seco').click(); await espera(1500);
      const max = await p.locator('input[type=range]').evaluate(r => Number(r.max)); await semana(Math.floor(max / 2) - 1); await espera(2500); },
    acciones: { 15: async () => p.getByRole('button', { name: /Next week/i }).click() } },
  T5: { cuadros: 300, async preparar() { await abrirBajio(); await aEscenarios(); await p.getByRole('button', { name: /Compare/ }).first().click(); await espera(8000); await saltar(); },
    desplazar: { desde: 40, hasta: 240, px: 3.2 } },
  T6g: { cuadros: 240, async preparar() { await p.goto(`${BASE}/#/terreno`); await espera(2500); await saltar(); await p.locator('.terrain-button-secondary').first().click(); await espera(6000); await saltar(); },
    clicsMapa: { 20: [-120, -70], 45: [110, -90], 70: [140, 80], 95: [-90, 95], 125: [-120, -70] } },
};
const t = TOMAS[ID];
await t.preparar();
const dir = `${OUT}/${ID}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
let mapa = null;
if (t.clicsMapa) { const bb = await p.locator('.leaflet-container').first().boundingBox(); mapa = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; }
await p.clock.install();
await p.clock.pauseAt(Date.now() + 500);
for (let i = 0; i < t.cuadros; i++) {
  if (t.acciones?.[i]) await t.acciones[i]();
  if (t.pintar) {
    const { desde, hasta, de, a } = t.pintar;
    if (i === desde) { await p.mouse.move(de[0], de[1]); await p.mouse.down(); }
    if (i > desde && i <= hasta) { const k = (i - desde) / (hasta - desde); await p.mouse.move(de[0] + (a[0] - de[0]) * k, de[1] + (a[1] - de[1]) * k + Math.sin(k * Math.PI * 3) * 60); }
    if (i === hasta + 1) await p.mouse.up();
  }
  if (t.desplazar && i >= t.desplazar.desde && i < t.desplazar.hasta) { const k = (i - t.desplazar.desde) / (t.desplazar.hasta - t.desplazar.desde); const v = t.desplazar.px * 2 * Math.sin(Math.PI * k); await p.mouse.wheel(0, v); }
  if (mapa && t.clicsMapa[i]) { const [dx, dy] = t.clicsMapa[i]; await p.mouse.click(mapa.x + dx, mapa.y + dy); }
  await p.clock.runFor(1000 / 60);
  await p.evaluate(() => {
    const dt = 1000 / 60;
    for (const a of document.getAnimations()) {
      if (a.playState === 'finished') continue;
      if (a.__t === undefined) { a.pause(); a.__t = 0; } else a.__t += dt;
      const fin = a.effect?.getComputedTiming?.().endTime;
      if (fin !== undefined && Number.isFinite(fin) && a.__t >= fin) a.finish(); else a.currentTime = a.__t;
    }
  });
  await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
}
await b.close();
console.log(ID, 'listo', t.cuadros);
