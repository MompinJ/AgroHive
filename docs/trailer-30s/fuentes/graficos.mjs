// Cartones, textos en pantalla (PNG transparentes) y carton final del pre-corte, con Inter.
import { chromium } from 'playwright';
const OUT = process.argv[2];
const LOGO = `<svg viewBox="0 0 40 40" width="__W" height="__W"><path d="M20 2 36 11v18L20 38 4 29V11Z" fill="#f6f5ef"/><path d="M20 29V15m0 6c-7 0-10-4-10-8 7 0 10 3 10 8Zm0-3c0-6 4-9 10-9 0 6-4 9-10 9Z" fill="none" stroke="#183e32" stroke-width="2" stroke-linejoin="round"/></svg>`;
const base = `*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;font-family:Inter,"Inter Display",sans-serif;-webkit-font-smoothing:antialiased}`;
const sombra = `text-shadow:0 2px 18px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.5)`;
const supers = {
  'super-whatif': `<div style="position:absolute;inset:0;display:grid;place-items:center"><div style="font:800 150px 'Inter Display',Inter;letter-spacing:.04em;color:#fff;${sombra}">WHAT IF?</div></div>`,
  'super-seco': `<div style="position:absolute;left:96px;top:84px;font:700 44px Inter;letter-spacing:.14em;color:#fff;${sombra}">DRY YEAR <span style="opacity:.8;font-weight:500">· 2009</span></div>`,
  'super-nasa': `<div style="position:absolute;right:110px;top:100px;font:600 30px Inter;letter-spacing:.12em;color:#fff;background:rgba(16,34,26,.78);padding:14px 26px;border-radius:999px">NASA POWER CLIMATE DATA <span style="opacity:.8;font-weight:500">· 2005–2025</span></div>`,
  'super-anios': `<div style="position:absolute;left:96px;top:84px;font:700 40px Inter;letter-spacing:.12em;color:#fff;${sombra}">DRY 2009 <span style="opacity:.6">·</span> NORMAL 2016 <span style="opacity:.6">·</span> WET 2018</div>`,
  'super-peor': `<div style="position:absolute;left:96px;top:84px;font:700 44px Inter;letter-spacing:.12em;color:#fff;${sombra}">RANKED BY THE WORST YEAR</div>`,
  'super-dibuja': `<div style="position:absolute;inset:0;display:grid;place-items:center"><div style="font:800 84px 'Inter Display',Inter;color:#fff;${sombra}">Or draw your own field.</div></div>`,
};
const lugares = [['T6a','BAJÍO','MEXICO'],['T6b','SORRISO','BRAZIL'],['T6c','UASIN GISHU','KENYA'],['T6d','LUDHIANA','INDIA'],['T6e','TIERRA DE CAMPOS','SPAIN'],['T6f','STORY COUNTY','IOWA, USA']];
for (const [id, a, b] of lugares) supers[`lugar-${id}`] = `<div style="position:absolute;left:96px;bottom:250px;color:#fff;${sombra}"><div style="font:800 76px 'Inter Display',Inter;letter-spacing:.02em">${a}</div><div style="font:600 32px Inter;letter-spacing:.3em;opacity:.9;margin-top:6px">${b}</div></div>`;
const huecos = {
  'hueco-T3': ['T3a + T3b', 'Terrain: pick “Bajío, Mexico” · Cultivos: Esquilote waves, paint maize, sorghum, beans'],
  'hueco-T4': ['T4a + T4b + T4c', 'Dry / Normal / Wet switch · harvest scythe · pest swarm'],
  'hueco-T5': ['T5', 'Comparison: robustness ranking, highlight row 1 and “worst scenario”'],
  'hueco-T6g': ['T6g', 'Draw your own field on the map, grid appears'],
};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [n, html] of Object.entries(supers)) {
  await p.setContent(`<style>${base}body{background:transparent}</style>${html}`);
  await p.screenshot({ path: `${OUT}/${n}.png`, omitBackground: true });
}
for (const [n, [t, d]] of Object.entries(huecos)) {
  await p.setContent(`<style>${base}body{background:radial-gradient(120% 120% at 50% 40%,#1f3a2c,#0c1812);color:#f6f5ef}</style>
  <div style="position:absolute;inset:48px;border:3px dashed rgba(246,245,239,.28);border-radius:28px"></div>
  <div style="position:absolute;left:96px;bottom:300px;max-width:1500px">
    <div style="font:700 26px Inter;letter-spacing:.3em;color:#e8b04a">PENDING · ENGLISH UI (B7)</div>
    <div style="font:800 64px 'Inter Display',Inter;margin-top:18px">${t}</div>
    <div style="font:500 34px Inter;opacity:.8;margin-top:14px;line-height:1.35">${d}</div>
  </div>`);
  await p.screenshot({ path: `${OUT}/${n}.png` });
}
await p.setContent(`<style>${base}body{background:radial-gradient(130% 130% at 50% 32%,#245a40,#0f2219 70%);color:#f6f5ef}
.n{font:600 30px Inter;letter-spacing:.01em}</style>
<div style="position:absolute;left:0;right:0;top:118px;display:flex;flex-direction:column;align-items:center;text-align:center">
  <div style="display:flex;align-items:center;gap:26px">${LOGO.replaceAll('__W','112')}<div style="font:800 120px 'Inter Display',Inter;letter-spacing:-.01em">Agro<span style="font-weight:300">Hive</span></div></div>
  <div style="font:600 50px Inter;margin-top:18px">Plan for the bad year.</div>
  <div style="font:500 30px Inter;margin-top:40px;opacity:.9"><span style="opacity:.7;letter-spacing:.2em;font-size:22px;font-weight:700">CHALLENGE&nbsp;&nbsp;</span>Field Shift: Adapting Farms with NASA Data</div>
  <div style="font:700 22px Inter;letter-spacing:.3em;opacity:.7;margin-top:48px">TEAM CODE HIVE</div>
  <div style="display:grid;grid-template-columns:auto auto;column-gap:80px;row-gap:12px;margin-top:18px">
    <div class="n">Balam Eduardo Silva Dominguez</div><div class="n">Maria Fernanda Covarrubias Mugica</div>
    <div class="n">Eduardo Oropeza Viola</div><div class="n">Jorge Alberto Mompin Gonzalez</div>
  </div>
  <div style="font:600 32px Inter;margin-top:44px;padding:12px 32px;border:2px solid rgba(246,245,239,.45);border-radius:999px">agrohive.space</div>
</div>
<div style="position:absolute;left:0;right:0;bottom:40px;text-align:center;font:500 20px Inter;opacity:.7;line-height:1.55">Explores real climate history. Does not forecast yields, income or the weather. The farmer decides.<br>Climate data: NASA POWER. Voice and music: AI-generated (ElevenLabs via Krea).</div>`);
await p.screenshot({ path: `${OUT}/carton-final-A.png` });
await b.close();
console.log('ok');
