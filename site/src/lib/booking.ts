import { extras, packages, sizes, type SizeId } from '../data/menu';
import { SITE } from '../data/site';
import { bodyStyles, makes, modelsFor, years, type Shape } from './vehicles';
import { fmt, quote, readiness, type Selection } from './pricing';
import { createViewer, type Viewer } from './car3d';

interface State {
  step: number;
  year: string; make: string; model: string; shape: Shape | null; size: SizeId | null; manualStyle: string; manual: boolean;
  packageId: string | null; extraIds: string[];
  date: string; time: string; month: string;
  name: string; phone: string; email: string; address: string; agree: boolean;
}
const KEY = 'mf-build-v1';
const STEPS = ['Vehicle', 'Build', 'When', 'Details', 'Deposit'];
const SLOTS = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'];
const REWARD = { title: '$10 off your next detail', body: 'Preview reward. Mirror Finish sets the final offer before launch.' };
const TIPS: Record<string, string> = {
  sedan: 'Dry your car after rain so water spots do not etch into the clear coat.',
  coupe: 'Dry your car after rain so water spots do not etch into the clear coat.',
  hatch: 'Vacuum the cargo area monthly; grit there gets everywhere.',
  suv: 'Rinse mud out of the wheel wells and door jambs weekly.',
  truck: 'Rinse the bed after hauling dirt or mulch to protect the finish.',
  van: 'Wipe high-touch surfaces weekly to keep the cabin fresh.',
};

const fresh = (): State => ({ step: 1, year: '', make: '', model: '', shape: null, size: null, manualStyle: '', manual: false, packageId: null, extraIds: [], date: '', time: '', month: '', name: '', phone: '', email: '', address: '', agree: false });
let s: State = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) s = { ...fresh(), ...JSON.parse(raw) }; } catch { /* storage unavailable */ }
const params = new URLSearchParams(location.search);
const pre = params.get('pkg');
if (pre && packages.some((p) => p.id === pre)) { s.packageId = pre; }

const HOME = document.getElementById('app')?.dataset.home ?? '/';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const sel = (): Selection => ({ packageId: s.packageId, sizeId: s.size, extraIds: s.extraIds });
const vehicleLabel = () => (s.manual ? bodyStyles.find((b) => b.id === s.manualStyle)?.label ?? '' : [s.year, s.make, s.model].filter(Boolean).join(' '));
const sizeObj = () => sizes.find((x) => x.id === s.size);

let viewer: Viewer | null = null;
let errors: Record<string, string> = {};

function valid(step: number): boolean {
  errors = {};
  if (step === 1) return !!s.size && !!s.shape;
  if (step === 2) return !!s.packageId;
  if (step === 3) return !!s.date && !!s.time;
  if (step === 4) {
    if (s.name.trim().length < 2) errors.name = 'Enter your name';
    if (s.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(s.email.trim())) errors.email = 'Enter a valid email';
    if (s.address.trim().length < 8) errors.address = 'Enter the full service address';
    return Object.keys(errors).length === 0;
  }
  return s.agree;
}

/* ---------- availability (sample data in preview) ---------- */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = new Date(); today.setHours(0, 0, 0, 0);
const horizon = new Date(today); horizon.setDate(horizon.getDate() + 42);
const dayOpen = (d: Date) => d > today && d <= horizon && d.getDay() !== 0;
const taken = (dateIso: string, slot: string) => ([...(dateIso + slot)].reduce((n, c) => n + c.charCodeAt(0), 0) % 5) === 0;

/* ---------- renderers ---------- */
function stepper() {
  $('stepper').innerHTML = STEPS.map((n, i) => {
    const k = i + 1;
    const state = k === s.step ? 'on' : k < s.step ? 'done' : '';
    return `<button type="button" class="st ${state}" data-go="${k}" ${k > s.step ? 'disabled' : ''} ${k === s.step ? 'aria-current="step"' : ''}><span>${k < s.step ? '&#10003;' : k}</span><b>${n}</b></button>`;
  }).join('');
}

function panelVehicle(): string {
  const opts = (list: string[], val: string, ph: string) => `<option value="">${ph}</option>` + list.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const models = s.make ? modelsFor(s.make).map((m) => m.name) : [];
  const auto = s.manual
    ? `<div class="chips" role="radiogroup" aria-label="Body style">${bodyStyles.map((b) => `<button type="button" class="pick ${s.manualStyle === b.id ? 'on' : ''}" role="radio" aria-checked="${s.manualStyle === b.id}" data-style="${b.id}">${b.label}</button>`).join('')}</div>`
    : `<div class="trio"><div class="field"><label for="year">Year</label><select id="year">${opts(years.map(String), s.year, 'Year')}</select></div>
       <div class="field"><label for="make">Make</label><select id="make">${opts(makes, s.make, 'Make')}</select></div>
       <div class="field"><label for="model">Model</label><select id="model" ${s.make ? '' : 'disabled'}>${opts(models, s.model, 'Model')}</select></div></div>`;
  return `<h2>What are we detailing?</h2><p class="muted">Pick your vehicle and we set the size and price for you.</p>${auto}
    <button type="button" class="link" id="toggleManual">${s.manual ? 'Search by make and model instead' : 'Not listed? Pick a body style'}</button>
    ${s.size ? `<div class="found"><span>Detected size</span><b>${sizeObj()!.name}</b><i>${sizeObj()!.cents ? '+' + fmt(sizeObj()!.cents) : 'Included'}</i></div>` : ''}`;
}

function panelBuild(): string {
  const pk = packages.map((p) => `<button type="button" class="opt ${s.packageId === p.id ? 'on' : ''}" role="radio" aria-checked="${s.packageId === p.id}" data-pkg="${p.id}">
      ${p.badge ? `<em>${p.badge}</em>` : ''}<strong>${p.name}</strong><span class="amt">${fmt(p.cents)}</span><small>${p.features.join(' &middot; ')}</small></button>`).join('');
  const ex = extras.map((e) => `<button type="button" class="opt ${s.extraIds.includes(e.id) ? 'on' : ''}" aria-pressed="${s.extraIds.includes(e.id)}" data-extra="${e.id}">
      <strong>${e.name}</strong><span class="amt">+${fmt(e.cents)}</span><small>${e.blurb}</small></button>`).join('');
  return `<h2>Build your detail</h2><h3 class="sub">Package</h3><div class="grid3" role="radiogroup" aria-label="Package">${pk}</div>
    <h3 class="sub">Add to it</h3><div class="grid2">${ex}</div>`;
}

function monthDays(m: Date): string {
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  let html = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => `<span class="dow">${d}</span>`).join('');
  html += '<i></i>'.repeat(first.getDay());
  for (let d = 1; d <= count; d++) {
    const dt = new Date(m.getFullYear(), m.getMonth(), d);
    const v = iso(dt);
    const open = dayOpen(dt);
    html += `<button type="button" class="day ${s.date === v ? 'on' : ''}" data-date="${v}" ${open ? '' : 'disabled'}>${d}</button>`;
  }
  return html;
}

function panelWhen(): string {
  const m = s.month ? new Date(s.month + '-01T00:00') : new Date(today.getFullYear(), today.getMonth(), 1);
  const title = m.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const prevOk = m > new Date(today.getFullYear(), today.getMonth(), 1);
  const nextOk = new Date(m.getFullYear(), m.getMonth() + 1, 1) <= horizon;
  const slots = s.date ? SLOTS.map((t) => { const off = taken(s.date, t); return `<button type="button" class="slot ${s.time === t ? 'on' : ''}" data-time="${t}" ${off ? 'disabled' : ''}>${t}${off ? '<small>Booked</small>' : ''}</button>`; }).join('') : '';
  const hrs = Math.round((quote(sel()).minutes / 60) * 10) / 10;
  return `<h2>Pick a day and time</h2><p class="muted">Estimated time for your build: about ${hrs} hr. We come to you.</p>
    <div class="cal"><div class="calhead"><button type="button" class="ghostbtn" data-month="-1" ${prevOk ? '' : 'disabled'} aria-label="Previous month">&lsaquo;</button><b>${title}</b><button type="button" class="ghostbtn" data-month="1" ${nextOk ? '' : 'disabled'} aria-label="Next month">&rsaquo;</button></div>
    <div class="calgrid">${monthDays(m)}</div></div>
    ${s.date ? `<h3 class="sub">${new Date(s.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3><div class="slots">${slots}</div>` : '<p class="muted hint">Choose a day to see times.</p>'}
    <p class="note">Preview: availability shown is sample data until booking goes live.</p>`;
}

const field = (id: string, label: string, type: string, auto: string, val: string, extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" autocomplete="${auto}" value="${esc(val)}" ${extra} ${errors[id] ? 'aria-invalid="true"' : ''}><span class="err" role="alert">${errors[id] ?? ''}</span></div>`;

function panelDetails(): string {
  return `<h2>Where and who?</h2><p class="muted">We use this to confirm your booking and find you.</p>
    ${field('name', 'Full name', 'text', 'name', s.name)}${field('phone', 'Mobile phone', 'tel', 'tel', s.phone, 'inputmode="tel"')}
    ${field('email', 'Email (Square sends your confirmation here)', 'email', 'email', s.email, 'inputmode="email"')}${field('address', 'Service address', 'text', 'street-address', s.address)}`;
}

function panelDeposit(): string {
  const q = quote(sel());
  const when = new Date(s.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + s.time;
  const pkg = packages.find((p) => p.id === s.packageId);
  return `<h2>Review and book</h2>
    <table class="rev"><tbody><tr><th>Vehicle</th><td>${esc(vehicleLabel())}</td></tr><tr><th>Build</th><td>${esc(pkg?.name ?? '')}${s.extraIds.length ? ' + ' + s.extraIds.map((id) => esc(extras.find((e) => e.id === id)?.name ?? '')).join(', ') : ''}</td></tr>
    <tr><th>When</th><td>${when}</td></tr><tr><th>Where</th><td>${esc(s.address)}</td></tr><tr><th>Total</th><td>${fmt(q.totalCents)}</td></tr><tr><th>Deposit today (20%)</th><td>${fmt(q.depositCents)}</td></tr><tr><th>Due after the detail</th><td>${fmt(q.balanceCents)}</td></tr></tbody></table>
    <label class="agree"><input type="checkbox" id="agree" ${s.agree ? 'checked' : ''}> I agree to the booking terms. Final price may vary with vehicle condition and size after inspection.</label>
    <p class="note">Preview mode: no payment is taken in this version.</p>`;
}

function summary() {
  const q = quote(sel());
  const rd = readiness(sel());
  const v = vehicleLabel();
  $('summary').innerHTML = `<div class="sumhead"><span>Your build</span><b>${rd}% ready</b></div><div class="meter" aria-hidden="true"><i style="width:${rd}%"></i></div>
    ${v ? `<p class="sumv">${esc(v)}</p>` : '<p class="muted">Start with your vehicle.</p>'}
    ${q.lines.map((l) => `<div class="ln"><span>${esc(l.label)}</span><b>${fmt(l.cents)}</b></div>`).join('')}
    <div class="ln tot"><span>Total</span><b>${fmt(q.totalCents)}</b></div>
    <div class="ln"><span>Deposit today (20%)</span><b>${fmt(q.depositCents)}</b></div><div class="ln"><span>Due after the detail</span><b>${fmt(q.balanceCents)}</b></div>`;
  $('mtotal').innerHTML = q.totalCents ? `<b>${fmt(q.totalCents)}</b><small>${fmt(q.depositCents)} today</small>` : '<small>Build your detail</small>';
}

function render() {
  stepper();
  const panels = [panelVehicle, panelBuild, panelWhen, panelDetails, panelDeposit];
  $('panel').innerHTML = panels[s.step - 1]();
  const q = quote(sel());
  const label = s.step === 5 ? `Pay ${fmt(q.depositCents)} deposit to book` : s.step === 4 ? 'Review' : 'Continue';
  const ok = s.step === 4 ? true : valid(s.step);
  for (const id of ['next', 'mnext']) { const b = $(id); b.textContent = id === 'mnext' && s.step < 5 ? 'Next' : label; b.toggleAttribute('disabled', !ok); }
  $('back').toggleAttribute('hidden', s.step === 1);
  summary();
  if (viewer && s.shape) viewer.setShape(s.shape);
  $('vtag').innerHTML = s.size ? `<b>${sizeObj()!.name}</b><span>${sizeObj()!.cents ? '+' + fmt(sizeObj()!.cents) : 'Included'}</span>` : '<span>Pick your vehicle to see its size</span>';
  save();
}

/* ---------- actions ---------- */
function resolveModel() {
  const m = modelsFor(s.make).find((x) => x.name === s.model);
  if (m) { s.shape = m.shape; s.size = m.size; } else if (!s.manual) { s.shape = null; s.size = null; }
}
function go(step: number) { s.step = step; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function next() {
  if (s.step === 4 && !valid(4)) { render(); const first = document.querySelector<HTMLInputElement>('[aria-invalid="true"]'); first?.focus(); return; }
  if (!valid(s.step)) return;
  if (s.step === 5) { confirm(); return; }
  go(s.step + 1);
}

function ics(): string {
  const [h, rest] = s.time.split(':'); const hour = (Number(h) % 12) + (s.time.includes('PM') ? 12 : 0);
  const start = new Date(s.date + 'T00:00'); start.setHours(hour, Number(rest.slice(0, 2)));
  const end = new Date(start.getTime() + quote(sel()).minutes * 60000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${SITE.name} detail`, `LOCATION:${s.address.replace(/,/g, '\\,')}`, `DESCRIPTION:${vehicleLabel()}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function confirm() {
  const q = quote(sel());
  const ref = 'MF-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const pkg = packages.find((p) => p.id === s.packageId)!;
  const when = new Date(s.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + s.time;
  const art = $('app').dataset.passArt ?? '';
  $('app').innerHTML = `<section class="thanks wrap"><p class="eyebrow">Booking confirmed</p><h1>You're booked.</h1>
    <p class="lead">${esc(s.name.split(' ')[0])}, your ${esc(pkg.name)} detail is set. Square will send your confirmation to ${esc(s.email)}.</p>
    <div class="passwrap"><article class="pass" style="background-image:linear-gradient(var(--scrim-dark),var(--scrim-dark-strong)),url('${art}')">
      <header><b>DETAIL PASS</b><span>${ref}</span></header><h3>${esc(vehicleLabel())}</h3>
      <p>${esc(pkg.name)}${s.extraIds.length ? ' + ' + s.extraIds.length + ' add-on' + (s.extraIds.length > 1 ? 's' : '') : ''}</p><p>${when}</p><p>${esc(s.address)}</p>
      <footer><span>Deposit paid ${fmt(q.depositCents)}</span><span>Due after ${fmt(q.balanceCents)}</span></footer></article>
      <div class="side2"><div class="card reward"><em>Your reward</em><h3>${REWARD.title}</h3><p class="muted">${REWARD.body}</p></div>
        <div class="card"><em>While you wait</em><p>${TIPS[s.shape ?? 'sedan']}</p></div>
        <div class="row"><button class="btn" id="cal">Add to calendar</button><button class="btn btn--ghost" id="share">Share my build</button></div></div></div>
    <h2 class="alt">Keep exploring</h2><div class="alts"><a class="card" href="${HOME}#gallery"><b>See recent work</b><span class="muted">Real jobs from around Montgomery.</span></a><a class="card" href="${SITE.phoneSms}"><b>Text us a question</b><span class="muted">${SITE.phoneDisplay}</span></a><a class="card" href="${SITE.instagramUrl}"><b>Follow on Instagram</b><span class="muted">@mfmd_mgm</span></a><a class="card" href="${HOME}"><b>Back to the home page</b><span class="muted">Packages, areas and more.</span></a></div></section>`;
  $('cal').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics()], { type: 'text/calendar' })); a.download = 'mirror-finish-detail.ics'; a.click(); });
  $('share').addEventListener('click', async () => { const url = `${location.origin}/book?pkg=${s.packageId}`; const text = `My ${pkg.name} detail with ${SITE.name}`; try { if (navigator.share) await navigator.share({ title: SITE.name, text, url }); else { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copied'; } } catch { /* cancelled */ } });
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.scrollTo({ top: 0 });
}

/* ---------- events ---------- */
function bind() {
  const app = $('app');
  app.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button,[data-go]');
    if (!t) return;
    const d = t.dataset;
    if (d.go) go(Number(d.go));
    else if (d.pkg) { s.packageId = d.pkg; render(); }
    else if (d.extra) { s.extraIds = s.extraIds.includes(d.extra) ? s.extraIds.filter((x) => x !== d.extra) : [...s.extraIds, d.extra]; render(); }
    else if (d.style) { const b = bodyStyles.find((x) => x.id === d.style)!; s.manualStyle = b.id; s.shape = b.shape; s.size = b.size; render(); }
    else if (d.date) { s.date = d.date; s.time = ''; render(); }
    else if (d.time) { s.time = d.time; render(); }
    else if (d.month) { const m = s.month ? new Date(s.month + '-01T00:00') : new Date(today.getFullYear(), today.getMonth(), 1); m.setMonth(m.getMonth() + Number(d.month)); s.month = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`; render(); }
    else if (t.id === 'toggleManual') { s.manual = !s.manual; s.shape = null; s.size = null; s.model = ''; s.manualStyle = ''; if (!s.manual) resolveModel(); render(); }
    else if (t.id === 'next' || t.id === 'mnext') next();
    else if (t.id === 'back') go(s.step - 1);
  });
  app.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.id === 'year') s.year = t.value;
    else if (t.id === 'make') { s.make = t.value; s.model = ''; s.shape = null; s.size = null; }
    else if (t.id === 'model') { s.model = t.value; resolveModel(); }
    else if (t.id === 'agree') s.agree = (t as HTMLInputElement).checked;
    else return;
    render();
  });
  app.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (['name', 'phone', 'email', 'address'].includes(t.id)) { (s as unknown as Record<string, string>)[t.id] = t.value; save(); }
  });
}

export function initBooking() {
  bind();
  const host = $('viewer');
  viewer = createViewer(host);
  if (!viewer) host.classList.add('nogl');
  render();
}
