import { extras, packages, sizes, type SizeId } from '../data/menu';
import { SITE } from '../data/site';
import { bodyStyles, makes, modelsFor, years, type ModelKey, type Shape } from './vehicles';
import { MAX_CARS, fmt, quoteOrder, readiness, type Selection } from './pricing';
import { dayState, hourLabel, iso, slotsFor, type DayState } from './schedule';
import { icon } from './icons';
import { createStill, type Still } from './stills';

interface Car {
  year: string; make: string; model: string; shape: Shape | null; size: SizeId | null; mesh: ModelKey | null;
  manual: boolean; manualStyle: string; packageId: string | null; extraIds: string[];
}
interface State {
  step: number; cars: Car[]; active: number;
  date: string; startMin: number; month: string;
  city: string; name: string; phone: string; email: string; street: string; zip: string; notes: string; agree: boolean;
}
/** Payment outcomes the deposit step has to handle once Square checkout is live. Preview mode simulates them with ?demo=declined or ?demo=taken. */
type Pay = 'idle' | 'processing' | 'declined';

const KEY = 'mf-build-v3';
const OTHER = 'other';
const STEPS = ['Vehicles', 'Build', 'When', 'Details', 'Deposit'];
const REWARD = { title: '$10 off your next detail', body: 'Preview reward. Mirror Finish sets the final offer before launch.' };
const TIPS: Record<string, string> = {
  sedan: 'Dry your car after rain so water spots do not etch into the clear coat.',
  coupe: 'Dry your car after rain so water spots do not etch into the clear coat.',
  hatch: 'Vacuum the cargo area monthly; grit there gets everywhere.',
  suv: 'Rinse mud out of the wheel wells and door jambs weekly.',
  truck: 'Rinse the bed after hauling dirt or mulch to protect the finish.',
  van: 'Wipe high-touch surfaces weekly to keep the cabin fresh.',
};
const PKG_ICON: Record<string, string> = { deluxe: 'sparkle', exterior: 'droplet', interior: 'car' };
const EXTRA_ICON = ['droplet', 'sparkle', 'shield', 'wand'];
const DAY_WHY: Record<DayState, string> = { open: '', closed: 'Closed', full: 'Fully booked', past: 'Not available', far: 'Not open for booking yet' };

const newCar = (): Car => ({ year: '', make: '', model: '', shape: null, size: null, mesh: null, manual: false, manualStyle: '', packageId: null, extraIds: [] });
const fresh = (): State => ({ step: 1, cars: [newCar()], active: 0, date: '', startMin: -1, month: '', city: '', name: '', phone: '', email: '', street: '', zip: '', notes: '', agree: false });

let s: State = fresh();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) { const p = JSON.parse(raw) as State; if (Array.isArray(p.cars) && p.cars.length) s = { ...fresh(), ...p }; }
} catch { /* storage unavailable */ }

const params = new URLSearchParams(location.search);
const preMake = params.get('make'); const prePkg = params.get('pkg');
if (preMake && makes.includes(preMake)) {
  const c = s.cars[0]; c.make = preMake; c.manual = false;
  const m = modelsFor(preMake).find((x) => x.name === params.get('model'));
  if (m) { c.model = m.name; c.shape = m.shape; c.size = m.size; c.mesh = m.model; s.step = 1; }
}
const preStyle = bodyStyles.find((b) => b.id === params.get('style'));
if (preStyle) { const c = s.cars[0]; c.manual = true; c.manualStyle = preStyle.id; c.shape = preStyle.shape; c.size = preStyle.size; c.mesh = preStyle.model; c.make = ''; c.model = ''; s.step = 1; }
if (prePkg && packages.some((p) => p.id === prePkg)) s.cars[0].packageId = prePkg;
const preCity = params.get('city');
if (preCity && (SITE.serviceArea as readonly string[]).includes(preCity)) s.city = preCity;
const demo = params.get('demo');

const HOME = document.getElementById('app')?.dataset.home ?? '/';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const car = () => s.cars[s.active];
const inArea = () => !!s.city && s.city !== OTHER;
const address = () => `${s.street.trim()}, ${s.city}, ${SITE.region} ${s.zip.trim()}`;
const carLabel = (c: Car) => (c.manual ? bodyStyles.find((b) => b.id === c.manualStyle)?.label ?? '' : [c.year, c.make, c.model].filter(Boolean).join(' '));
const sizeOf = (c: Car) => sizes.find((x) => x.id === c.size);
const selOf = (c: Car): Selection => ({ packageId: c.packageId, sizeId: c.size, extraIds: c.extraIds });
const order = () => quoteOrder(s.cars.map((c, i) => ({ label: carLabel(c) || `Car ${i + 1}`, sel: selOf(c) })));
const textUs = (label: string) => `<a class="link" href="${SITE.phoneSms}">${label}</a>`;

let viewer: Still | null = null;
let errors: Record<string, string> = {};
let lastTotal = 0;
let lastDeposit = 0;
let pay: Pay = 'idle';
let slotLost = false;
let demoUsed = false;
const today = new Date(); today.setHours(0, 0, 0, 0);

function valid(step: number): boolean {
  errors = {};
  if (step === 1) return inArea() && s.cars.every((c) => c.shape && c.size);
  if (step === 2) return s.cars.every((c) => c.packageId);
  if (step === 3) return !!s.date && s.startMin >= 0;
  if (step === 4) {
    if (s.name.trim().length < 2) errors.name = 'Enter your name';
    if (s.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(s.email.trim())) errors.email = 'Enter a valid email address';
    if (s.street.trim().length < 5 || !/\d/.test(s.street)) errors.street = 'Enter the street address with its number';
    if (!inArea()) errors.city2 = 'Choose your town';
    if (!/^\d{5}$/.test(s.zip.trim())) errors.zip = 'Enter a 5-digit ZIP code';
    return Object.keys(errors).length === 0;
  }
  return s.agree && pay !== 'processing';
}

/* ---------- fleet strip ---------- */
function fleet(): string {
  const chips = s.cars.map((c, i) => {
    const sz = sizeOf(c);
    const label = carLabel(c) || 'Choose vehicle';
    return `<div class="car ${i === s.active ? 'on' : ''}"><button type="button" class="carbtn" data-car="${i}" aria-pressed="${i === s.active}"><span class="cn">Car ${i + 1}</span><b>${esc(label)}</b><small>${sz ? sz.short : 'Size set automatically'}</small></button>${i > 0 ? `<button type="button" class="rm" data-remove="${i}" aria-label="Remove car ${i + 1}">${icon('x', 16)}</button>` : ''}</div>`;
  }).join('');
  const atMax = s.cars.length >= MAX_CARS;
  return `<div class="fleet" role="group" aria-label="Your vehicles">${chips}<button type="button" class="addcar" data-addcar ${atMax ? 'disabled' : ''}>${icon('plus', 18)}<span>${atMax ? 'Max 4 cars' : 'Add a car'}</span></button></div>`;
}

const cityOptions = (val: string, withOther: boolean) => `<option value="">Select your town</option>` + SITE.serviceArea.map((c) => `<option value="${c}" ${c === val ? 'selected' : ''}>${c}, ${SITE.region}</option>`).join('') + (withOther ? `<option value="${OTHER}" ${val === OTHER ? 'selected' : ''}>Somewhere else</option>` : '');

/* ---------- panels ---------- */
function panelVehicle(): string {
  const c = car();
  const opts = (list: string[], val: string, ph: string) => `<option value="">${ph}</option>` + list.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const models = c.make ? modelsFor(c.make).map((m) => m.name) : [];
  const auto = c.manual
    ? `<div class="chips" role="radiogroup" aria-label="Body style">${bodyStyles.map((b) => `<button type="button" class="pick ${c.manualStyle === b.id ? 'on' : ''}" role="radio" aria-checked="${c.manualStyle === b.id}" data-style="${b.id}">${b.label}</button>`).join('')}</div>`
    : `<div class="trio"><div class="field"><label for="year">Year</label><select id="year">${opts(years.map(String), c.year, 'Year')}</select></div>
       <div class="field"><label for="make">Make</label><select id="make">${opts(makes, c.make, 'Make')}</select></div>
       <div class="field"><label for="model">Model</label><select id="model" ${c.make ? '' : 'disabled'}>${opts(models, c.model, 'Model')}</select></div></div>`;
  const sz = sizeOf(c);
  const area = s.city === OTHER
    ? `<div class="found warn" role="status"><span>We may still be able to help.</span>${textUs(`Text ${SITE.phoneDisplay} with your location`)}</div>`
    : inArea() ? `<div class="found"><span>We come to you in</span><b>${esc(s.city)}, ${SITE.region}</b><i>${icon('check', 16)}</i></div>` : '';
  return `<h2 tabindex="-1">What are we <em>detailing?</em></h2><p class="muted">Tell us where you are, then pick each vehicle. We set the size class and price for you. You can add up to ${MAX_CARS} cars to one order.</p>
    <div class="card box"><p class="boxt">Service area</p><div class="field"><label for="city">Where will the vehicle be?</label><select id="city">${cityOptions(s.city, true)}</select></div>${area}</div>
    ${fleet()}
    <div class="card box"><p class="boxt">Car ${s.active + 1}</p>${auto}
    <button type="button" class="link" id="toggleManual">${c.manual ? 'Search by make and model instead' : 'Not listed? Pick a body style'}</button>
    ${sz ? `<div class="found"><span>Detected size</span><b>${sz.name}</b><i>${sz.cents ? '+' + fmt(sz.cents) : 'Included'}</i></div>` : ''}</div>`;
}

function panelBuild(): string {
  const c = car();
  const pk = packages.map((p) => `<button type="button" class="opt ${c.packageId === p.id ? 'on' : ''}" role="radio" aria-checked="${c.packageId === p.id}" data-pkg="${p.id}">
      ${p.badge ? `<em>${p.badge}</em>` : ''}<span class="oi">${icon(PKG_ICON[p.id], 22)}</span><strong>${p.name}</strong><span class="amt">${fmt(p.cents)}</span><small>${p.features.join(' &middot; ')}</small><span class="tick">${icon('check', 16)}</span></button>`).join('');
  const ex = extras.map((e, i) => `<button type="button" class="opt ${c.extraIds.includes(e.id) ? 'on' : ''}" aria-pressed="${c.extraIds.includes(e.id)}" data-extra="${e.id}">
      <span class="oi">${icon(EXTRA_ICON[i % 4], 22)}</span><strong>${e.name}</strong><span class="amt">+${fmt(e.cents)}</span><small>${e.blurb}</small><span class="tick">${icon('check', 16)}</span></button>`).join('');
  const canCopy = s.active > 0 && s.cars[0].packageId;
  return `<h2 tabindex="-1">Build your <em>detail</em></h2><p class="muted">Choose a package and add-ons for each car.</p>${fleet()}
    <div class="rowhead"><h3 class="sub">Package for Car ${s.active + 1}</h3>${canCopy ? `<button type="button" class="link" data-copy>Same build as Car 1</button>` : ''}</div>
    <div class="grid3" role="radiogroup" aria-label="Package">${pk}</div>
    <h3 class="sub">Add to it</h3><div class="grid2">${ex}</div>`;
}

const hours = (m: number) => `${Math.round((m / 60) * 10) / 10} hr`;

function monthDays(m: Date, total: number): string {
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  let html = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => `<span class="dow">${d}</span>`).join('');
  html += '<i></i>'.repeat(first.getDay());
  for (let d = 1; d <= count; d++) {
    const dt = new Date(m.getFullYear(), m.getMonth(), d);
    const v = iso(dt);
    const st = dayState(dt, today, total);
    const long = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    html += `<button type="button" class="day ${st} ${s.date === v ? 'on' : ''} ${dt.getTime() === today.getTime() ? 'today' : ''}" data-date="${v}" aria-label="${long}${st === 'open' ? '' : ', ' + DAY_WHY[st].toLowerCase()}" ${st === 'open' ? '' : `disabled title="${DAY_WHY[st]}"`}>${d}</button>`;
  }
  return html;
}

function nextAvailable(total: number): string[] {
  const out: string[] = [];
  for (let i = 1; i < 45 && out.length < 3; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i);
    if (dayState(d, today, total) === 'open') out.push(iso(d));
  }
  return out;
}

function panelWhen(): string {
  const o = order();
  const total = o.minutes;
  const m = s.month ? new Date(s.month + '-01T00:00') : new Date(today.getFullYear(), today.getMonth(), 1);
  const title = m.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const prevOk = m > new Date(today.getFullYear(), today.getMonth(), 1);
  const nextOk = new Date(m.getFullYear(), m.getMonth() + 1, 1) <= new Date(today.getTime() + SITE.schedule.horizonDays * 864e5);
  const quick = nextAvailable(total).map((v) => `<button type="button" class="chipbtn ${s.date === v ? 'on' : ''}" data-date="${v}">${new Date(v + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</button>`).join('');
  let slotsHtml = '<p class="muted hint">Choose a day to see start times.</p>';
  if (s.date) {
    const all = slotsFor(s.date, total);
    const grp = (name: string, list: typeof all) => list.length ? `<div class="grp"><b>${name}</b><div class="slots">${list.map((x) => `<button type="button" class="slot ${s.startMin === x.startMin ? 'on' : ''}" data-start="${x.startMin}" ${x.taken ? 'disabled' : ''}>${x.label}${x.taken ? '<small>Booked</small>' : ''}</button>`).join('')}</div></div>` : '';
    slotsHtml = grp('Morning', all.filter((x) => x.startMin < 720)) + grp('Afternoon', all.filter((x) => x.startMin >= 720));
  }
  const cars = s.cars.length;
  const lost = slotLost ? `<div class="errsum" role="alert"><b>That time was just booked.</b> Your build is saved. Pick another start time below.</div>` : '';
  return `<h2 tabindex="-1">Pick a <em>day and time</em></h2>${lost}
    <p class="muted">${cars > 1 ? `${cars} cars, one detailer, back to back: about ${hours(total)}.` : `Estimated time for your build: about ${hours(total)}.`} We come to you. Start times shown fit your whole order.</p>
    ${quick ? `<div class="quickdays"><span>Soonest:</span>${quick}</div>` : `<p class="note">This order is too long for one day. ${textUs('Text us')} and we will arrange it.</p>`}
    <div class="cal card"><div class="calhead"><button type="button" class="ghostbtn" data-month="-1" ${prevOk ? '' : 'disabled'} aria-label="Previous month">&lsaquo;</button><b>${title}</b><button type="button" class="ghostbtn" data-month="1" ${nextOk ? '' : 'disabled'} aria-label="Next month">&rsaquo;</button></div>
    <div class="calgrid">${monthDays(m, total)}</div>
    <ul class="legend"><li><i class="k open"></i>Open</li><li><i class="k full"></i>Fully booked</li><li><i class="k closed"></i>Closed</li></ul></div>
    ${s.date ? `<h3 class="sub">${new Date(s.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>` : ''}${slotsHtml}
    <p class="note">Preview: availability shown is sample data until booking goes live.</p>`;
}

const describe = (id: string) => (errors[id] ? `aria-invalid="true" aria-describedby="e-${id}"` : '');
const field = (id: string, label: string, type: string, auto: string, val: string, extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" autocomplete="${auto}" value="${esc(val)}" ${extra} ${describe(id)}><span class="err" id="e-${id}">${errors[id] ?? ''}</span></div>`;

function panelDetails(): string {
  const errs = Object.values(errors);
  return `<h2 tabindex="-1">Where and <em>who?</em></h2><p class="muted">We use this to confirm your booking and find you.</p>
    ${errs.length ? `<div class="errsum" role="alert"><b>Please fix ${errs.length} ${errs.length > 1 ? 'fields' : 'field'}:</b> ${errs.join(' · ')}</div>` : ''}
    <div class="card box"><p class="boxt">You</p>${field('name', 'Full name', 'text', 'name', s.name)}${field('phone', 'Mobile phone', 'tel', 'tel', s.phone, 'inputmode="tel" placeholder="(334) 555-0123"')}
    ${field('email', 'Email (Square sends your confirmation here)', 'email', 'email', s.email, 'inputmode="email"')}</div>
    <div class="card box"><p class="boxt">Where we are coming</p>${field('street', 'Street address', 'text', 'address-line1', s.street)}
    <div class="duo"><div class="field"><label for="city2">Town</label><select id="city2" autocomplete="address-level2" ${describe('city2')}>${cityOptions(s.city, false)}</select><span class="err" id="e-city2">${errors.city2 ?? ''}</span></div>
    ${field('zip', 'ZIP code', 'text', 'postal-code', s.zip, 'inputmode="numeric" maxlength="5"')}</div>
    <div class="field"><label for="notes">Notes for your detailer <span class="opt-l">(optional)</span></label><textarea id="notes" rows="3" maxlength="400" placeholder="Gate code, where the vehicle is parked, anything we should know">${esc(s.notes)}</textarea></div></div>`;
}

function whenLabel(): string {
  return new Date(s.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + hourLabel(s.startMin);
}

function panelDeposit(): string {
  const o = order();
  const rows = s.cars.map((c, i) => {
    const p = packages.find((x) => x.id === c.packageId);
    const ex = c.extraIds.map((id) => esc(extras.find((e) => e.id === id)?.name ?? '')).join(', ');
    return `<tr><th>Car ${i + 1}</th><td><b>${esc(carLabel(c))}</b><small>${esc(p?.name ?? '')}${ex ? ' + ' + ex : ''}</small></td></tr>`;
  }).join('');
  const declined = pay === 'declined' ? `<div class="errsum" role="alert"><b>The deposit did not go through.</b> Nothing was charged and your time is not booked yet. Try again, or ${textUs('text us')} and we will book it with you.</div>` : '';
  return `<h2 tabindex="-1">Review and <em>book</em></h2>${declined}
    <div class="card box"><table class="rev"><tbody>${rows}<tr><th>When</th><td>${whenLabel()}</td></tr><tr><th>Where</th><td>${esc(address())}</td></tr>
    ${s.notes.trim() ? `<tr><th>Notes</th><td class="wrapt">${esc(s.notes.trim())}</td></tr>` : ''}
    <tr class="sumr"><th>Total</th><td>${fmt(o.totalCents)}</td></tr><tr><th>Deposit today (20%)</th><td>${fmt(o.depositCents)}</td></tr><tr><th>Due after the detail</th><td>${fmt(o.balanceCents)}</td></tr></tbody></table></div>
    <label class="agree"><input type="checkbox" id="agree" ${s.agree ? 'checked' : ''}> <span>I agree to the booking terms. Final price may vary with vehicle condition and size after inspection.</span></label>
    <p class="note">Preview mode: no payment is taken in this version.</p>`;
}

/* ---------- summary ---------- */
function tween(el: HTMLElement | null, from: number, to: number) {
  if (!el) return;
  if (reduced || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / 420);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function summary() {
  const o = order();
  const rd = Math.round(s.cars.reduce((n, c) => n + readiness(selOf(c)), 0) / s.cars.length);
  const groups = o.cars.map((q, i) => {
    const c = s.cars[i];
    const label = carLabel(c);
    return `<div class="sg"><p class="sgt"><b>Car ${i + 1}</b><span>${esc(label || 'Choose a vehicle')}</span></p>${q.lines.map((l) => `<div class="ln"><span>${esc(l.label)}</span><b class="num">${fmt(l.cents)}</b></div>`).join('')}${s.cars.length > 1 && q.totalCents ? `<div class="ln sub"><span>Car ${i + 1} subtotal</span><b class="num">${fmt(q.totalCents)}</b></div>` : ''}</div>`;
  }).join('');
  const where = inArea() ? `<div class="ln sub"><span>Where</span><b>${esc(s.city)}, ${SITE.region}</b></div>` : '';
  const when = s.date && s.startMin >= 0 ? `<div class="ln sub"><span>When</span><b>${whenLabel()}</b></div>` : '';
  $('summary').innerHTML = `<div class="sumhead"><span>Your order</span><b>${rd}% ready</b></div><div class="meter" aria-hidden="true"><i style="width:${rd}%"></i></div>${groups}${where}${when}
    <div class="ln tot"><span>Total</span><b class="num" id="grand">${fmt(lastTotal)}</b></div>
    <div class="ln"><span>Deposit today (20%)</span><b class="num" id="dep">${fmt(lastDeposit)}</b></div><div class="ln"><span>Due after the detail</span><b class="num">${fmt(o.balanceCents)}</b></div>`;
  tween($('grand'), lastTotal, o.totalCents);
  tween($('dep'), lastDeposit, o.depositCents);
  $('mtotal').innerHTML = o.totalCents ? `<b class="num">${fmt(o.totalCents)}</b><small>${fmt(o.depositCents)} today${s.cars.length > 1 ? ' · ' + s.cars.length + ' cars' : ''}</small>` : '<small>Build your order</small>';
  lastTotal = o.totalCents; lastDeposit = o.depositCents;
}

function progress() {
  $('stepper').innerHTML = STEPS.map((n, i) => {
    const k = i + 1;
    const st = k === s.step ? 'on' : k < s.step ? 'done' : '';
    return `<button type="button" class="st ${st}" data-go="${k}" ${k > s.step ? 'disabled' : ''} ${k === s.step ? 'aria-current="step"' : ''}><span>${k < s.step ? icon('check', 14) : k}</span><b>${n}</b></button>`;
  }).join('');
  $('bar').style.setProperty('--p', String(((s.step - 1) / (STEPS.length - 1)) * 100) + '%');
}

function render(focus = false) {
  progress();
  const panels = [panelVehicle, panelBuild, panelWhen, panelDetails, panelDeposit];
  const panel = $('panel');
  panel.innerHTML = panels[s.step - 1]();
  if (focus) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); panel.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }); }
  const o = order();
  const busy = pay === 'processing';
  const label = busy ? 'Processing…' : s.step === 5 ? `${pay === 'declined' ? 'Try again: pay' : 'Pay'} ${fmt(o.depositCents)} deposit to book` : s.step === 4 ? 'Review order' : 'Continue';
  const ok = s.step === 4 ? true : valid(s.step);
  for (const id of ['next', 'mnext']) { const b = $(id); b.innerHTML = `<span>${id === 'mnext' && s.step < 5 ? 'Next' : label}</span>${busy ? '' : icon('arrow', 18)}`; b.toggleAttribute('disabled', !ok); b.setAttribute('aria-busy', String(busy)); }
  $('back').toggleAttribute('hidden', s.step === 1);
  $('back').toggleAttribute('disabled', busy);
  summary();
  const c = car();
  viewer?.setModel(c.mesh);
  const sz = sizeOf(c);
  $('vtag').innerHTML = sz ? `<b>${sz.name}</b><span>${sz.cents ? '+' + fmt(sz.cents) : 'Included'}</span>` : '<span>Pick a vehicle to see its size</span>';
  $('vcar').textContent = s.cars.length > 1 ? `Car ${s.active + 1} of ${s.cars.length}` : '';
  save();
}

/* ---------- actions ---------- */
function resolveModel() {
  const c = car();
  const m = modelsFor(c.make).find((x) => x.name === c.model);
  if (m) { c.shape = m.shape; c.size = m.size; c.mesh = m.model; } else if (!c.manual) { c.shape = null; c.size = null; c.mesh = null; }
}
function go(step: number) { s.step = step; if (step !== 3) slotLost = false; if (step !== 5) pay = 'idle'; render(true); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }
function next() {
  if (s.step === 4 && !valid(4)) { render(); document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
  if (!valid(s.step)) return;
  if (s.step === 5) { payDeposit(); return; }
  go(s.step + 1);
}

/**
 * Round 3 replaces the timer with the Square hosted-checkout round trip. The three outcomes stay the same:
 * paid (confirm), declined (stay on review, nothing booked), slot taken while paying (back to the calendar, build kept).
 */
function payDeposit() {
  pay = 'processing'; render();
  window.setTimeout(() => {
    if (demo === 'declined' && !demoUsed) { demoUsed = true; pay = 'declined'; render(true); return; }
    if (demo === 'taken' && !demoUsed) { demoUsed = true; pay = 'idle'; s.startMin = -1; slotLost = true; s.step = 3; render(true); window.scrollTo({ top: 0 }); return; }
    pay = 'idle'; confirmOrder();
  }, reduced ? 0 : 900);
}

const icsText = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
function icsFile(): string {
  const start = new Date(s.date + 'T00:00'); start.setMinutes(s.startMin);
  const end = new Date(start.getTime() + order().minutes * 60000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const desc = s.cars.map(carLabel).join(' / ') + (s.notes.trim() ? '\n' + s.notes.trim() : '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${SITE.name} detail`, `LOCATION:${icsText(address())}`, `DESCRIPTION:${icsText(desc)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function confirmOrder() {
  const o = order();
  const ref = 'MF-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const when = new Date(s.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + hourLabel(s.startMin);
  const art = $('app').dataset.passArt ?? '';
  const list = s.cars.map((c) => { const p = packages.find((x) => x.id === c.packageId)!; return `<li><b>${esc(carLabel(c))}</b><span>${p.name}${c.extraIds.length ? ' + ' + c.extraIds.length + ' add-on' + (c.extraIds.length > 1 ? 's' : '') : ''}</span></li>`; }).join('');
  const first = s.cars[0];
  const ics = icsFile();
  /* TODO: client to supply the cancellation and reschedule policy. Until then the page only says how to reach us. */
  $('app').innerHTML = `<section class="thanks wrap"><p class="eyebrow">Booking confirmed</p><h1>You're <em>booked.</em></h1>
    <p class="lead">${esc(s.name.split(' ')[0])}, your ${s.cars.length > 1 ? s.cars.length + '-car order is' : 'detail is'} set. Square will send your confirmation to ${esc(s.email)}.</p>
    <div class="passwrap"><article class="pass" style="background-image:linear-gradient(var(--scrim-dark),var(--scrim-dark-strong)),url('${art}')">
      <header><b>DETAIL PASS</b><span>${ref}</span></header><ul class="plist">${list}</ul>
      <p class="pwhen">${icon('calendar', 16)} ${when}</p><p class="pwhen">${icon('pin', 16)} ${esc(address())}</p>
      <footer><span>Deposit paid ${fmt(o.depositCents)}</span><span>Due after ${fmt(o.balanceCents)}</span></footer></article>
      <div class="side2"><div class="card reward"><em>${icon('gift', 16)} Your reward</em><h3>${REWARD.title}</h3><p class="muted">${REWARD.body}</p></div>
        <div class="card"><em>${icon('phone', 16)} Need to change something?</em><p>Text <a href="${SITE.phoneSms}">${SITE.phoneDisplay}</a> with your reference ${ref} to move or cancel your detail.</p></div>
        <div class="card"><em>While you wait</em><p>${TIPS[first.shape ?? 'sedan']}</p></div>
        <div class="row"><button class="btn" id="cal" type="button"><span>Add to calendar</span>${icon('calendar', 18)}</button><button class="btn btn--ghost" id="share" type="button">Share my build</button></div></div></div>
    <h2 class="alt">Keep <em>exploring</em></h2><div class="alts2"><a class="card" href="${HOME}#gallery"><b>See recent work</b><span class="muted">Real jobs from around Montgomery.</span></a><a class="card" href="${SITE.phoneSms}"><b>Text us a question</b><span class="muted">${SITE.phoneDisplay}</span></a><a class="card" href="${SITE.instagramUrl}"><b>Follow on Instagram</b><span class="muted">@mfmd_mgm</span></a><a class="card" href="${HOME}"><b>Back to the home page</b><span class="muted">Packages, areas and more.</span></a></div></section>`;
  $('cal').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'mirror-finish-detail.ics'; a.click(); });
  $('share').addEventListener('click', async () => { const url = `${location.origin}${location.pathname}`; try { if (navigator.share) await navigator.share({ title: SITE.name, text: `My detail with ${SITE.name}`, url }); else { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copied'; } } catch { /* cancelled */ } });
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.scrollTo({ top: 0 });
}

const fmtPhone = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 10); if (d.length < 4) return d; if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`; return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; };

function bind() {
  const app = $('app');
  app.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || pay === 'processing') return;
    const d = t.dataset;
    const c = car();
    if (d.go) go(Number(d.go));
    else if (d.car) { s.active = Number(d.car); render(); }
    else if (d.remove) { const i = Number(d.remove); s.cars.splice(i, 1); s.active = Math.min(s.active, s.cars.length - 1); s.date = ''; s.startMin = -1; render(); }
    else if (d.addcar !== undefined) { if (s.cars.length < MAX_CARS) { s.cars.push(newCar()); s.active = s.cars.length - 1; s.date = ''; s.startMin = -1; s.step = 1; render(true); } }
    else if (d.copy !== undefined) { const f = s.cars[0]; c.packageId = f.packageId; c.extraIds = [...f.extraIds]; render(); }
    else if (d.pkg) { c.packageId = d.pkg; render(); }
    else if (d.extra) { c.extraIds = c.extraIds.includes(d.extra) ? c.extraIds.filter((x) => x !== d.extra) : [...c.extraIds, d.extra]; render(); }
    else if (d.style) { const b = bodyStyles.find((x) => x.id === d.style)!; c.manualStyle = b.id; c.shape = b.shape; c.size = b.size; c.mesh = b.model; render(); }
    else if (d.date) { s.date = d.date; s.startMin = -1; slotLost = false; render(); }
    else if (d.start) { s.startMin = Number(d.start); slotLost = false; render(); }
    else if (d.month) { const m = s.month ? new Date(s.month + '-01T00:00') : new Date(today.getFullYear(), today.getMonth(), 1); m.setMonth(m.getMonth() + Number(d.month)); s.month = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`; render(); }
    else if (t.id === 'toggleManual') { c.manual = !c.manual; c.shape = null; c.size = null; c.mesh = null; c.model = ''; c.manualStyle = ''; if (!c.manual) resolveModel(); render(); }
    else if (t.id === 'next' || t.id === 'mnext') next();
    else if (t.id === 'back') go(s.step - 1);
  });
  app.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    const c = car();
    if (t.id === 'year') c.year = t.value;
    else if (t.id === 'make') { c.make = t.value; c.model = ''; c.shape = null; c.size = null; c.mesh = null; }
    else if (t.id === 'model') { c.model = t.value; resolveModel(); }
    else if (t.id === 'city' || t.id === 'city2') s.city = t.value;
    else if (t.id === 'agree') s.agree = (t as HTMLInputElement).checked;
    else return;
    render();
  });
  app.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'phone') { t.value = fmtPhone(t.value); }
    if (t.id === 'zip') { t.value = t.value.replace(/\D/g, '').slice(0, 5); }
    if (['name', 'phone', 'email', 'street', 'zip', 'notes'].includes(t.id)) { (s as unknown as Record<string, string>)[t.id] = t.value; save(); }
  });
}

export function initBooking() {
  bind();
  viewer = createStill($('viewer'));
  render(false);
}
