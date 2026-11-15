import { chromium } from 'playwright';
export async function abrir({ gpu = false, ejemplo = 'Bajío, Guanajuato', w = 1920, h = 1080 } = {}) {
  const args = gpu ? ['--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--enable-features=Vulkan'] : ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'];
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://127.0.0.1:5173/#/terreno');
  await p.waitForTimeout(1500);
  await p.getByText('Saltar tutorial').click().catch(()=>{});
  await p.getByText(ejemplo).click();
  await p.waitForTimeout(5000);
  await p.getByText('Saltar tutorial').click().catch(()=>{});
  return { b, p };
}
export async function aEscenarios(p) {
  await p.getByRole('button', { name: /Ver escenarios/ }).click();
  await p.waitForTimeout(6000);
  await p.getByText('Saltar tutorial').click().catch(()=>{});
}
export const LIMPIO = `body * { visibility: hidden !important; } canvas, canvas * { visibility: visible !important; }`;
