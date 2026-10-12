// Builds the outreach visuals in ../marketing/outreach/: for each audience an email banner (JPEG, small enough for email), a one-page flyer
// (PDF + PNG) with a QR code, and a square post (PNG). Colours come from src/styles/tokens.css, fonts from the
// @fontsource packages, photos from src/assets, and prices/phone from src/data, so the ads follow the website.
// Run with `npm run ads` (needs Playwright with Chromium; set PLAYWRIGHT_MODULE to override).
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { addonGroups, extras, packages, optionsOf } from '../src/data/menu.ts';
import { SITE } from '../src/data/site.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, '..', 'marketing', 'outreach');
mkdirSync(OUT, { recursive: true });

const DOMAIN = 'mirrorfinishmgm.com';
const money = (cents) => '$' + cents / 100;
const catalog = [...packages, ...extras, ...addonGroups];
const price = (id) => money(catalog.find((x) => x.id === id).cents);
const name = (id) => catalog.find((x) => x.id === id).name;
/** A combo is advertised from the cheapest single item in it; everything else at its price. */
const fromCents = (id) => Math.min(...optionsOf(addonGroups.find((x) => x.id === id)).map((o) => o.cents));
const fromPrice = (id) => (addonGroups.some((x) => x.id === id) ? 'from ' + money(fromCents(id)) : price(id));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const font = (pkg, file) => readFileSync(join(root, 'node_modules', pkg, 'files', file)).toString('base64');
const tokens = [...readFileSync(join(root, 'src/styles/tokens.css'), 'utf8').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => `${m[1]}:${m[2]}`).join(';');
const tokenHex = (n) => tokens.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`))[1];

const photoCache = new Map();
async function photo(file, width = 1700) {
  if (!photoCache.has(file)) {
    const buf = await sharp(join(root, 'src/assets', file)).resize({ width, withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer();
    photoCache.set(file, `data:image/jpeg;base64,${buf.toString('base64')}`);
  }
  return photoCache.get(file);
}
const logo = async () => `data:image/png;base64,${(await sharp(join(root, 'src/assets/logo.webp')).resize(160).png().toBuffer()).toString('base64')}`;
const qr = (url) => QRCode.toString(url, { type: 'svg', margin: 4, errorCorrectionLevel: 'M', color: { dark: tokenHex('black'), light: tokenHex('white') } });
const check = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/* ---- the three audiences -------------------------------------------------------------------------------------- */
const rideshareAddons = ['stain-removal', 'refresh-interior', 'pet-hair'];
const ads = [
  {
    id: 'property-managers', utm: 'property-managers', audience: 'For property managers',
    headline: ['A resident perk that costs your property', 'nothing.'],
    sub: 'We detail residents’ cars right where they park. Residents book online and pay after the job.',
    chips: [`Interior ${price('interior')}`, `Exterior ${price('exterior')}`, `Deluxe ${price('deluxe')}`],
    hero: 'hero-loop-poster.jpg', heroPos: 'center 60%', strip: ['ig_12.jpg', 'ig_07.jpg', 'ig_04.jpg'], highlight: 'deluxe',
    points: [
      'No cost to your property. Residents book online and pay after the job.',
      'We come to the parking spot: no trips, no time off work.',
      'Pilot day: you share the link, residents choose times, we show up.',
      'Happy to work within your community’s rules.',
    ],
    steps: ['Share the link or this flyer with residents.', 'Residents build their detail and pick a time.', 'We detail the car at their spot. They pay when it’s done.'],
    addons: ['stain-removal', 'refresh-interior', 'pet-hair', 'decon', 'headlight'], cta: 'Book a pilot day',
    needs: 'Needs access to water and electricity at each car.',
  },
  {
    id: 'used-car-lots', utm: 'used-car-lots', audience: 'For used car lots',
    headline: ['Front-line ready,', 'right where they sit.'],
    sub: 'We come to your lot and detail the cars in place. No transport, no waiting on a shop.',
    chips: [`Interior ${price('interior')}`, `Exterior ${price('exterior')}`, `Full detail ${price('deluxe')}`],
    hero: 'ig_04.jpg', heroPos: 'center 55%', strip: ['ig_16.jpg', 'ig_08.jpg', 'ig_12.jpg'], highlight: 'deluxe',
    points: [
      'We come to your lot: no transport, no waiting on a shop.',
      'A freshly detailed car shows and photographs better.',
      'Extras for tougher units: stain removal, steam cleaning, pet hair, paint and glass decontamination, headlights.',
      '24-hour satisfaction guarantee.',
    ],
    steps: ['Pick the cars and a day.', 'We detail them where they sit.', 'Payment is due when the service is complete.'],
    addons: ['stain-removal', 'refresh-interior', 'pet-hair', 'decon', 'headlight'], cta: 'Try one car',
    needs: 'Needs access to water and power on your lot.',
  },
  {
    id: 'rideshare-drivers', utm: 'rideshare-drivers', audience: 'For rideshare drivers',
    headline: ['Your car is your paycheck.', 'Keep it spotless.'],
    sub: 'Mobile interior detail for drivers. About an hour, and we come to you.',
    chips: [`Interior detail ${price('interior')}`, 'About an hour', 'We come to you'],
    hero: 'ig_06.jpg', heroPos: 'center 55%', strip: ['ig_12.jpg', 'ig_16.jpg', 'ig_08.jpg'], highlight: 'interior',
    points: [
      'Seats and carpets vacuumed, upholstery cleaned.',
      'Hard surfaces, plastics and leather cleaned and conditioned.',
      'Door and trunk jambs deep cleaned, odors reduced.',
      `Pet hair, stains or smells? Stain removal from ${money(fromCents('stain-removal'))}, steam cleaning and more.`,
    ],
    steps: ['Book online or text us.', 'We come to your driveway or parking spot.', 'You pay when it’s done.'],
    addons: rideshareAddons, cta: 'Book an interior',
    needs: 'Needs water and electricity where we park.',
  },
];

/* ---- shared styles -------------------------------------------------------------------------------------------- */
const css = `
@font-face{font-family:'Manrope';font-weight:200 800;src:url(data:font/woff2;base64,${font('@fontsource-variable/manrope', 'manrope-latin-wght-normal.woff2')}) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:normal;src:url(data:font/woff2;base64,${font('@fontsource/instrument-serif', 'instrument-serif-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:italic;src:url(data:font/woff2;base64,${font('@fontsource/instrument-serif', 'instrument-serif-latin-400-italic.woff2')}) format('woff2')}
:root{${tokens}}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Manrope',sans-serif;color:var(--black);background:var(--white);word-spacing:.06em}
h1,h2{font-family:'Instrument Serif',serif;font-weight:400}
h1 em,h2 em{color:var(--gold-hi);font-style:italic}
h1 em{display:block}
.eyebrow{font-size:13px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;color:var(--gold)}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:15px;letter-spacing:.04em;line-height:1.2;color:var(--white)}
.brand{text-shadow:0 1px 12px var(--black)}
.brand img{width:52px;height:52px;border-radius:13px}
.brand small{display:block;font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:var(--muted-on-dark)}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{border:1.5px solid var(--gold);color:var(--gold-hi);border-radius:999px;padding:7px 16px;font-weight:700;font-size:17px;letter-spacing:.02em;white-space:nowrap}

/* email banner 1200 x 520 */
.banner{width:1200px;height:520px;position:relative;background:var(--black);overflow:hidden;color:var(--white)}
.banner .ph{position:absolute;right:0;top:0;width:58%;height:100%;background-size:cover}
.banner .fade{position:absolute;inset:0;background:linear-gradient(90deg,var(--black) 46%,transparent 76%)}
.banner .copy{position:absolute;left:64px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center;gap:20px}
.banner .eyebrow{font-size:17px}
.banner h1{font-size:76px;line-height:.98}
.banner .sub{font-size:23px;line-height:1.35;color:var(--muted-on-dark);max-width:560px}
.banner .foot{position:absolute;left:64px;bottom:34px;font-size:16px;letter-spacing:.06em;color:var(--muted-on-dark)}
.banner .foot b{color:var(--gold-hi)}
.banner .rule{position:absolute;left:0;right:0;bottom:0;height:7px;background:var(--gold)}

/* square 1080 x 1080 */
.sq{width:1080px;height:1080px;position:relative;background:var(--black);overflow:hidden;color:var(--white)}
.sq .ph{position:absolute;left:0;top:0;width:100%;height:640px;background-size:cover}
.sq .grad{position:absolute;left:0;top:0;width:100%;height:640px;background:linear-gradient(180deg,var(--scrim-dark) 0%,transparent 18%,var(--scrim-dark-strong) 58%,var(--black) 100%)}
.sq .brand{position:absolute;left:56px;top:48px;font-size:22px;gap:18px}
.sq .brand img{width:76px;height:76px;border-radius:18px}
.sq .brand small{font-size:15px}
.sq .head{position:absolute;left:56px;right:56px;top:318px}
.sq .head .eyebrow{font-size:20px;margin-bottom:14px}
.sq h1{font-size:96px;line-height:.97}
.sq .panel{position:absolute;left:56px;right:56px;top:690px}
.sq .sub{font-size:34px;line-height:1.35;color:var(--muted-on-dark);margin-bottom:26px;max-width:900px}
.sq .chips{margin-bottom:30px}.sq .chip{font-size:24px;padding:10px 22px}
.sq .cta{display:flex;align-items:center;justify-content:space-between;gap:24px}
.sq .btn{background:var(--gold);color:var(--black);border-radius:999px;padding:20px 36px;font-weight:800;font-size:30px;letter-spacing:.01em}
.sq .site{font-size:26px;font-weight:700;color:var(--gold-hi);letter-spacing:.04em}
.sq .rule{position:absolute;left:0;right:0;bottom:0;height:10px;background:var(--gold)}

/* flyer: US Letter */
@page{size:Letter;margin:0}
.fl{width:816px;height:1056px;position:relative;overflow:hidden;background:var(--ivory)}
.fl .hero{height:300px;position:relative;background-size:cover;color:var(--white)}
.fl .hero:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,var(--scrim-dark) 0%,transparent 22%,var(--scrim-dark-strong) 60%,var(--black) 100%)}
.fl .hero .brand{position:absolute;left:40px;top:30px;z-index:2}
.fl .hero .hd{position:absolute;left:40px;right:40px;bottom:26px;z-index:2}
.fl .hero .eyebrow{margin-bottom:8px}
.fl .hero h1{font-size:54px;line-height:1}
.fl .rule{height:5px;background:var(--gold)}
.fl .body{padding:22px 40px 0}
.fl .points{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 26px}
.fl .points li{display:flex;gap:10px;font-size:14.5px;line-height:1.35;font-weight:600}
.fl .points svg{flex:none;color:var(--gold-deep);margin-top:1px}
.fl .strip{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}
.fl .strip div{height:118px;border-radius:12px;background-size:cover;background-position:center}
.fl .strip-l{margin-top:20px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--gold-deep)}
.fl .prices{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px}
.fl .card{background:var(--white);border:1.5px solid var(--line-light);border-radius:14px;padding:14px 16px}
.fl .card h3{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700}
.fl .card b{display:block;font-family:'Instrument Serif',serif;font-weight:400;font-size:44px;line-height:1.05}
.fl .card span{font-size:12px;color:var(--muted);font-weight:600}
.fl .card.hi{background:var(--black);border-color:var(--black)}
.fl .card.hi h3{color:var(--muted-on-dark)}.fl .card.hi b{color:var(--gold-hi)}.fl .card.hi span{color:var(--muted-on-dark)}
.fl .addons{margin-top:10px;font-size:12.5px;color:var(--muted);line-height:1.5}
.fl .addons b{color:var(--black)}
.fl .foot{position:absolute;left:0;right:0;bottom:0;height:262px;background:var(--black);color:var(--white);padding:22px 40px 0;display:grid;grid-template-columns:1fr 128px 178px;gap:22px}
.fl .foot .rule2{position:absolute;left:0;right:0;top:0;height:5px;background:var(--gold)}
.fl .steps h4,.fl .go h4,.fl .qcol h4{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-weight:700}
.fl .steps ol{list-style:none;display:grid;gap:9px}
.fl .steps li{display:flex;gap:12px;font-size:13.5px;line-height:1.35;color:var(--muted-on-dark)}
.fl .steps li i{flex:none;width:24px;height:24px;border-radius:50%;background:var(--gold);color:var(--black);font-style:normal;font-weight:800;font-size:13px;display:grid;place-items:center}
.fl .steps .needs{margin-top:12px;font-size:12.5px;color:var(--gold-hi);font-weight:700}
.fl .qcol .q{background:var(--white);border-radius:14px;overflow:hidden;width:128px;height:128px}
.fl .qcol .q svg{width:100%;height:100%;display:block}
.fl .qcol .scan{display:block;margin-top:9px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-on-dark);white-space:nowrap}
.fl .go .cta{display:block;font-family:'Instrument Serif',serif;font-size:27px;line-height:1.05;color:var(--white)}
.fl .go .tel{display:block;margin-top:8px;font-size:19px;font-weight:800;color:var(--gold-hi);letter-spacing:.01em;white-space:nowrap}
.fl .go .web{display:block;font-size:12.5px;font-weight:600;color:var(--muted-on-dark);margin-top:3px;white-space:nowrap}
.fl .fine{position:absolute;left:40px;right:40px;bottom:12px;font-size:9.5px;line-height:1.4;color:var(--muted-on-dark);opacity:.9}
`;

const phone = SITE.phoneDisplay;
const head = (ad) => `<span>${esc(ad.headline[0])}</span> <em>${esc(ad.headline[1])}</em>`;

const bannerHtml = async (ad) => `<div class="banner"><div class="ph" style="background-image:url(${await photo(ad.hero, 1600)});background-position:${ad.heroPos}"></div><div class="fade"></div>
  <div class="copy"><p class="eyebrow">${esc(ad.audience)}</p><h1>${head(ad)}</h1><p class="sub">${esc(ad.sub)}</p></div>
  <div class="foot"><b>Mirror Finish</b> Mobile Detailing &nbsp;·&nbsp; Montgomery, AL &nbsp;·&nbsp; ${phone}</div><div class="rule"></div></div>`;

const squareHtml = async (ad, lg) => `<div class="sq"><div class="ph" style="background-image:url(${await photo(ad.hero, 1700)});background-position:${ad.heroPos}"></div><div class="grad"></div>
  <div class="brand"><img src="${lg}" alt=""><div>MIRROR FINISH<small>Mobile Detailing</small></div></div>
  <div class="head"><p class="eyebrow">${esc(ad.audience)}</p><h1>${head(ad)}</h1></div>
  <div class="panel"><p class="sub">${esc(ad.sub)}</p><div class="chips">${ad.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
  <div class="cta"><span class="btn">Text ${phone}</span><span class="site">${DOMAIN}</span></div></div><div class="rule"></div></div>`;

const flyerHtml = async (ad, lg) => {
  const url = `https://${DOMAIN}/?utm_source=${ad.utm}&utm_medium=flyer&utm_campaign=outreach`;
  const card = (id, note) => `<div class="card${ad.highlight === id ? ' hi' : ''}"><h3>${name(id)}</h3><b>${price(id)}</b><span>${note}</span></div>`;
  const mins = (id) => { const m = packages.find((p) => p.id === id).minutes; return m >= 120 ? 'about 2 hours' : 'about 1 hour'; };
  const strip = (await Promise.all(ad.strip.map(async (f) => `<div style="background-image:url(${await photo(f, 700)})"></div>`))).join('');
  return `<div class="fl"><div class="hero" style="background-image:url(${await photo(ad.hero, 1700)});background-position:${ad.heroPos}">
    <div class="brand"><img src="${lg}" alt=""><div>MIRROR FINISH<small>Mobile Detailing · Montgomery, AL</small></div></div>
    <div class="hd"><p class="eyebrow">${esc(ad.audience)}</p><h1>${head(ad)}</h1></div></div><div class="rule"></div>
  <div class="body"><ul class="points">${ad.points.map((p) => `<li>${check}<span>${esc(p)}</span></li>`).join('')}</ul>
    <p class="strip-l">Recent work around Montgomery</p><div class="strip" style="margin-top:8px">${strip}</div>
    <div class="prices">${card('interior', mins('interior'))}${card('exterior', mins('exterior'))}${card('deluxe', 'inside + out · ' + mins('deluxe'))}</div>
    <p class="addons"><b>Add-ons:</b> ${ad.addons.map((id) => `${name(id)} ${fromPrice(id)}`).join(' · ')}</p></div>
  <div class="foot"><div class="rule2"></div><div class="steps"><h4>How it works</h4><ol>${ad.steps.map((s, i) => `<li><i>${i + 1}</i><span>${esc(s)}</span></li>`).join('')}</ol><p class="needs">${esc(ad.needs)}</p></div>
    <div class="qcol"><h4>Scan</h4><div class="q">${await qr(url)}</div><span class="scan">Prices &amp; booking</span></div>
    <div class="go"><h4>${esc(ad.cta)}</h4><span class="cta">Text or call</span><span class="tel">${phone}</span><span class="web">${DOMAIN}</span></div>
    <p class="fine">Prices are for sedans and coupes; larger vehicles cost more. The customer provides accessible water and electricity. Payment is due when the service is complete. 24-hour satisfaction guarantee.</p></div></div>`;
};

/* ---- render --------------------------------------------------------------------------------------------------- */
async function loadPlaywright() {
  try { return await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright'); } catch { /* use the global install */ }
  return import(pathToFileURL(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')).href);
}
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const lg = await logo();
const doc = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

async function shoot(html, width, height, file, { scale = 1, pdf = false, jpeg = false } = {}) {
  const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale })).newPage();
  await page.setContent(doc(html), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot(jpeg
    ? { path: join(OUT, file + '.jpg'), type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width, height } }
    : { path: join(OUT, file + '.png'), clip: { x: 0, y: 0, width, height } });
  if (pdf) { await page.emulateMedia({ media: 'print' }); await page.pdf({ path: join(OUT, file + '.pdf'), width: '8.5in', height: '11in', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } }); }
  await page.close();
}
for (const ad of ads) {
  await shoot(await bannerHtml(ad), 1200, 520, `${ad.id}-email-banner`, { jpeg: true });
  await shoot(await flyerHtml(ad, lg), 816, 1056, `${ad.id}-flyer`, { scale: 2, pdf: true });
  await shoot(await squareHtml(ad, lg), 1080, 1080, `${ad.id}-square-post`);
  console.log('built', ad.id);
}
await browser.close();
console.log('wrote', OUT);
