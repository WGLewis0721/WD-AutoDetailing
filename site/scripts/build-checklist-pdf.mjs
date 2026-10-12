// Builds public/Mirror-Finish-Service-Checklist.pdf from src/data/checklist.ts, in the website's own colours and fonts
// (colours are read from src/styles/tokens.css, fonts from the @fontsource packages). Run with `npm run checklist`
// after changing the checklist, the menu or the design; commit the PDF and src/data/checklist.hash together.
// Needs Playwright with Chromium (installed globally in the cloud workspace; set PLAYWRIGHT_MODULE to override).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checklist, checklistFingerprint } from '../src/data/checklist.ts';
import { extras, packages } from '../src/data/menu.ts';
import { SITE } from '../src/data/site.ts';
import { AGREEMENT } from '../src/data/agreement.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'public', 'Mirror-Finish-Service-Checklist.pdf');
const HASH = join(root, 'src', 'data', 'checklist.hash');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = (pkg, file) => readFileSync(join(root, 'node_modules', pkg, 'files', file)).toString('base64');
const tokens = [...readFileSync(join(root, 'src/styles/tokens.css'), 'utf8').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => `${m[1]}:${m[2]}`).join(';');

const box = '<span class="box"></span>';
const rows = (items) => items.map((t) => `<li><span class="task">${esc(t)}</span></li>`).join('');
const section = (s) => `<section class="sec"><header><div><h3>${esc(s.title)}</h3><p>${esc(s.note)}</p></div></header><ul>${rows(s.items)}</ul></section>`;
const pick = (label) => `<span class="pick">${box}${esc(label)}</span>`;
const line = (label) => `<div class="field"><span>${label}</span><i></i></div>`;

const interior = checklist.packageSections.find((s) => s.id === 'interior');
const exterior = checklist.packageSections.find((s) => s.id === 'exterior');
const guarantee = AGREEMENT.clauses[6];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mirror Finish service checklist</title><style>
@font-face{font-family:'Manrope';font-weight:200 800;src:url(data:font/woff2;base64,${font('@fontsource-variable/manrope', 'manrope-latin-wght-normal.woff2')}) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:normal;src:url(data:font/woff2;base64,${font('@fontsource/instrument-serif', 'instrument-serif-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:italic;src:url(data:font/woff2;base64,${font('@fontsource/instrument-serif', 'instrument-serif-latin-400-italic.woff2')}) format('woff2')}
:root{${tokens}}
@page{size:Letter;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Manrope',sans-serif;color:var(--black);background:var(--ivory);font-size:10pt;line-height:1.35;word-spacing:.07em}
.page{width:8.5in;height:11in;position:relative;overflow:hidden;page-break-after:always;background:var(--ivory)}
.page:last-child{page-break-after:auto}
.band{background:var(--black);color:var(--white);padding:.4in .6in .3in}
.brand{display:flex;justify-content:space-between;align-items:baseline;font-size:8pt;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
.brand b{font-weight:700}.brand span{color:var(--muted-on-dark);letter-spacing:.12em}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:40pt;line-height:1;margin-top:.16in}
h1 em{color:var(--gold-hi)}
.lead{color:var(--muted-on-dark);margin-top:.08in;max-width:5.6in;font-size:10.5pt}
.rule{height:3px;background:var(--gold)}
.body{padding:.22in .6in 0}
.fields{display:grid;grid-template-columns:1.2fr 1.2fr .8fr .8fr;gap:.2in}
.field span{display:block;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700}
.field i{display:block;border-bottom:1px solid var(--black);height:.26in}
.booked{margin-top:.16in;padding:.1in .16in;background:var(--white);border:1px solid var(--line-light);border-radius:10px;display:grid;grid-template-columns:auto 1fr;gap:.06in .16in;align-items:center}
.booked b{font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-deep)}
.pick{display:inline-flex;align-items:center;gap:.06in;margin-right:.18in;font-weight:600;font-size:9pt;white-space:nowrap}
.box{display:inline-block;width:.17in;height:.17in;border:1.4px solid var(--black);border-radius:3px;background:var(--white);flex:none}
.sec{margin-top:.18in}
.sec header{display:flex;align-items:flex-end;gap:.1in;border-bottom:2px solid var(--black);padding-bottom:.05in}
.sec header>div{flex:1}
.sec h3{font-family:'Instrument Serif',serif;font-weight:400;font-size:19pt;line-height:1.05}
.sec header p{font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-deep);font-weight:700;margin-top:2px}
.sec ul{list-style:none}
.sec li{display:flex;align-items:center;gap:.1in;padding:.048in 0;border-bottom:1px solid var(--line-light)}
.sec li .task{flex:1;font-weight:500}
.sec li::before{content:'';width:.075in;height:.075in;border-radius:50%;background:var(--gold);flex:none;margin:0 .04in}
.legend{margin-top:.1in;font-size:8pt;color:var(--muted)}
.cond{margin-top:.24in}
.cond h3{font-family:'Instrument Serif',serif;font-weight:400;font-size:19pt;border-bottom:2px solid var(--black);padding-bottom:.05in}
.cond p{font-size:8.5pt;color:var(--muted);margin-top:.06in}
.cond .ln{border-bottom:1px solid var(--line-dark);height:.3in}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:.35in;margin-top:.3in}
.sign .field i{height:.38in}
.confirm{margin-top:.08in;font-size:8pt;color:var(--muted)}
.guarantee{margin-top:.28in;padding:.16in .2in;background:var(--black);color:var(--white);border-radius:12px;font-size:9pt}
.guarantee b{display:block;font-family:'Instrument Serif',serif;font-weight:400;font-style:italic;color:var(--gold-hi);font-size:15pt;margin-bottom:2px}
.foot{position:absolute;left:.6in;right:.6in;bottom:.32in;display:flex;justify-content:space-between;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);border-top:1px solid var(--line-light);padding-top:.09in}
.foot b{color:var(--gold-deep)}
</style></head><body>
<div class="page">
  <div class="band"><div class="brand"><b>Mirror Finish</b><span>Mobile Detailing · Montgomery, AL</span></div>
    <h1>Service <em>checklist</em></h1>
    <p class="lead">One list for both of us: every service we perform on your vehicle, item by item.</p></div>
  <div class="rule"></div>
  <div class="body">
    <div class="fields">${line('Customer')}${line('Vehicle')}${line('Date')}${line('Detailer')}</div>
    <div class="booked"><b>Package</b><div>${packages.map((p) => pick(p.name)).join('')}</div><b>Add-ons</b><div>${extras.map((e) => pick(e.name)).join('')}</div></div>
    <p class="legend">Deluxe includes everything in both the Interior and Exterior details. Add-on services are on page 2.</p>
    ${section(interior)}
    ${section(exterior)}
  </div>
  <div class="foot"><span><b>Mirror Finish</b> · ${esc(SITE.phoneDisplay)}</span><span>Page 1 of 2</span></div>
</div>
<div class="page">
  <div class="body" style="padding-top:.55in">
    ${checklist.addonSections.map(section).join('')}
    <div class="cond"><h3>Vehicle condition before service</h3><p>Note existing scratches, dents, stains or items to be careful with. We document the vehicle's condition before service begins.</p>
      <div class="ln"></div><div class="ln"></div><div class="ln"></div></div>
    <div class="sign">${line('Detailer signature / date')}${line('Customer signature / date')}</div>
    <p class="confirm">Signing confirms the booked services above were completed.</p>
    <div class="guarantee"><b>Our promise</b>${esc(guarantee)}</div>
  </div>
  <div class="foot"><span><b>Mirror Finish</b> · ${esc(SITE.phoneDisplay)} · mirrorfinishmgm.com</span><span>Page 2 of 2</span></div>
</div>
</body></html>`;

async function loadPlaywright() {
  try { return await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright'); } catch { /* fall back to the global install */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return import(pathToFileURL(join(globalRoot, 'playwright', 'index.mjs')).href);
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT, format: 'Letter', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
await browser.close();
writeFileSync(HASH, checklistFingerprint() + '\n');
console.log('wrote', OUT, 'and', HASH);
