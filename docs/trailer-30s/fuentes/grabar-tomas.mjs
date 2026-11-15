// Graba tomas de la escena 3D sin pantalla y sin interfaz, cuadro por cuadro con el reloj de la pagina controlado.
// Uso: node grabar-tomas.mjs <salida> [--vista] [id...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [OUT, ...resto] = process.argv.slice(2);
const VISTA = resto.includes('--vista');
const SOLO = resto.filter(x => !x.startsWith('--'));
const TOMAS = [
  { id: 'T1', ejemplo: 'Bajío, Guanajuato', escenario: 'seco', semana: 3, cambio: { cuadro: 110, semana: 10 }, zoom: 2, dx: -0.9, cuadros: 260 },
  { id: 'T2', ejemplo: 'Bajío, Guanajuato', escenario: 'seco', semana: 12, zoom: 0, dx: 1.1, cuadros: 280 },
  { id: 'T6a', ejemplo: 'Bajío, Guanajuato', escenario: 'habitual', semana: 9, zoom: 0, dx: 1.4, cuadros: 100 },
  { id: 'T6b', ejemplo: 'Sorriso, Mato Grosso', escenario: 'habitual', semana: 9, zoom: 0, dx: 1.4, cuadros: 100 },
  { id: 'T6c', ejemplo: 'Uasin Gishu, Rift Valley', escenario: 'habitual', semana: 9, zoom: 0, dx: 1.4, cuadros: 100 },
  { id: 'T6d', ejemplo: 'Ludhiana, Punjab', escenario: 'habitual', semana: 9, zoom: 0, dx: 1.4, cuadros: 100 },
  { id: 'T6e', ejemplo: 'Tierra de Campos, Castilla y León', escenario: 'habitual', semana: 9, zoom: 0, dx: 1.4, cuadros: 100 },
  { id: 'T6f', ejemplo: 'Story County, Iowa', escenario: 'habitual', semana: 9, zoom: 0, dx: 1.4, cuadros: 100 },
];
const CSS = `body *{visibility:hidden!important}body *:has(canvas),canvas{visibility:visible!important}`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
async function semana(p, n) {
  await p.locator('input[type=range]').evaluate((r, v) => {
    const max = Number(r.max); const val = Math.min(v, max);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(r, String(val));
    for (const t of ['input', 'change', 'pointerup']) r.dispatchEvent(new Event(t, { bubbles: true }));
  }, n);
}
for (const t of TOMAS) {
  if (SOLO.length && !SOLO.includes(t.id)) continue;
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.25 });
  await ctx.addInitScript(() => { try { localStorage.setItem('agrohive:graficos:v1', 'alto'); } catch {} });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(t.id, 'ERR', e.message));
  await p.goto('http://127.0.0.1:5173/#/terreno');
  await p.waitForTimeout(1500);
  await p.getByText('Saltar tutorial').click().catch(() => {});
  await p.getByText(t.ejemplo, { exact: false }).first().click();
  await p.waitForTimeout(5000);
  await p.getByText('Saltar tutorial').click().catch(() => {});
  await p.getByRole('button', { name: /Ver escenarios/ }).click();
  await p.waitForTimeout(6000);
  await p.getByText('Saltar tutorial').click().catch(() => {});
  await p.locator(`.lab-escenario-${t.escenario}`).click();
  await p.waitForTimeout(2500);
  await semana(p, t.semana);
  await p.getByRole('button', { name: 'Ocultar consejos' }).click().catch(() => {});
  await p.getByRole('button', { name: 'Ocultar el panel' }).click().catch(() => {});
  await p.waitForTimeout(2500);
  await p.addStyleTag({ content: CSS });
  await p.locator('canvas').first().evaluate(c => { c.tabIndex = c.tabIndex < 0 ? 0 : c.tabIndex; c.focus(); });
  for (let i = 0; i < t.zoom; i++) { await p.keyboard.press('Equal'); await p.waitForTimeout(700); }
  await p.waitForTimeout(3000);
  const dir = `${OUT}/${t.id}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  if (VISTA) { await p.screenshot({ path: `${OUT}/vista-${t.id}.png` }); await ctx.close(); console.log(t.id, 'vista'); continue; }
  await p.clock.install();
  await p.clock.pauseAt(Date.now() + 500);
  let x = 960, y = 640;
  await p.mouse.move(x, y);
  await p.mouse.down({ button: 'right' });
  for (let i = 0; i < t.cuadros; i++) {
    if (t.cambio && i === t.cambio.cuadro) await semana(p, t.cambio.semana);
    x += t.dx;
    await p.mouse.move(x, y);
    await p.clock.runFor(1000 / 60);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 });
  }
  await p.mouse.up({ button: 'right' });
  await ctx.close();
  console.log(t.id, 'listo', t.cuadros);
}
await b.close();
