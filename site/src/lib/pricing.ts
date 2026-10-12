import { DEPOSIT_RATE, addonGroups, findExtra, packages, sizes, type SizeId } from '../data/menu.js';

export interface Selection { packageId: string | null; sizeId: SizeId | null; extraIds: string[] }
export interface Quote { lines: { label: string; cents: number }[]; totalCents: number; depositCents: number; balanceCents: number; minutes: number }

export const fmt = (cents: number): string => {
  const d = cents / 100;
  return '$' + (Number.isInteger(d) ? d.toString() : d.toFixed(2));
};

/** One priced add-on line: a single item, or a whole combo when every item of it was chosen. */
export interface PricedExtra { key: string; label: string; cents: number; minutes: number; ids: string[]; square?: string }

/** Turns the chosen add-on ids into priced lines. Choosing every item of a combo is the combo: it is priced at the combo
 * price and shown as one line; any fewer are priced item by item. The order the customer picked them in is kept. */
export function priceExtras(extraIds: string[]): PricedExtra[] {
  const chosen = new Set(extraIds);
  const whole = addonGroups.filter((g) => g.optionIds.every((id) => chosen.has(id)));
  const out: PricedExtra[] = [];
  const done = new Set<string>();
  for (const id of chosen) {
    if (done.has(id)) continue;
    const g = whole.find((x) => x.optionIds.includes(id));
    if (g) {
      g.optionIds.forEach((o) => done.add(o));
      out.push({ key: g.id, label: g.name, cents: g.cents, minutes: g.optionIds.reduce((n, o) => n + findExtra(o)!.minutes, 0), ids: [...g.optionIds] });
      continue;
    }
    const e = findExtra(id);
    if (!e) continue;
    done.add(id);
    out.push({ key: e.id, label: e.name, cents: e.cents, minutes: e.minutes, ids: [e.id], ...(e.square ? { square: e.square } : {}) });
  }
  return out;
}

/** One rule for money everywhere: integer cents, deposit rounded once. */
export function quote(sel: Selection): Quote {
  const lines: Quote['lines'] = [];
  let minutes = 0;
  const pkg = packages.find((p) => p.id === sel.packageId);
  if (pkg) { lines.push({ label: pkg.name, cents: pkg.cents }); minutes += pkg.minutes; }
  const size = sizes.find((s) => s.id === sel.sizeId);
  if (size && size.cents > 0) lines.push({ label: size.name, cents: size.cents });
  for (const e of priceExtras(sel.extraIds)) { lines.push({ label: e.label, cents: e.cents }); minutes += e.minutes; }
  const totalCents = lines.reduce((n, l) => n + l.cents, 0);
  const depositCents = Math.round(totalCents * DEPOSIT_RATE);
  return { lines, totalCents, depositCents, balanceCents: totalCents - depositCents, minutes };
}

export const readiness = (sel: Selection): number => {
  let n = 0;
  if (sel.sizeId) n += 25;
  if (sel.packageId) n += 45;
  n += Math.min(priceExtras(sel.extraIds).length, 3) * 10;
  return Math.min(n, 100);
};

export const MAX_CARS = 4;

export interface CarQuote extends Quote { label: string }
export interface OrderQuote { cars: CarQuote[]; totalCents: number; depositCents: number; balanceCents: number; minutes: number }

/** Each car is priced on its own; the deposit is 20% of the grand total, rounded once. */
export function quoteOrder(cars: { label: string; sel: Selection }[]): OrderQuote {
  const priced = cars.slice(0, MAX_CARS).map((c) => ({ ...quote(c.sel), label: c.label }));
  const totalCents = priced.reduce((n, c) => n + c.totalCents, 0);
  const depositCents = Math.round(totalCents * DEPOSIT_RATE);
  return { cars: priced, totalCents, depositCents, balanceCents: totalCents - depositCents, minutes: priced.reduce((n, c) => n + c.minutes, 0) };
}
