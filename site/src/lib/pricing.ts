import { DEPOSIT_RATE, extras, packages, sizes, type SizeId } from '../data/menu';

export interface Selection { packageId: string | null; sizeId: SizeId | null; extraIds: string[] }
export interface Quote { lines: { label: string; cents: number }[]; totalCents: number; depositCents: number; balanceCents: number; minutes: number }

export const fmt = (cents: number): string => {
  const d = cents / 100;
  return '$' + (Number.isInteger(d) ? d.toString() : d.toFixed(2));
};

/** One rule for money everywhere: integer cents, deposit rounded once. */
export function quote(sel: Selection): Quote {
  const lines: Quote['lines'] = [];
  let minutes = 0;
  const pkg = packages.find((p) => p.id === sel.packageId);
  if (pkg) { lines.push({ label: pkg.name, cents: pkg.cents }); minutes += pkg.minutes; }
  const size = sizes.find((s) => s.id === sel.sizeId);
  if (size && size.cents > 0) lines.push({ label: size.name, cents: size.cents });
  for (const id of sel.extraIds) {
    const e = extras.find((x) => x.id === id);
    if (e) { lines.push({ label: e.name, cents: e.cents }); minutes += e.minutes; }
  }
  const totalCents = lines.reduce((n, l) => n + l.cents, 0);
  const depositCents = Math.round(totalCents * DEPOSIT_RATE);
  return { lines, totalCents, depositCents, balanceCents: totalCents - depositCents, minutes };
}

export const readiness = (sel: Selection): number => {
  let n = 0;
  if (sel.sizeId) n += 25;
  if (sel.packageId) n += 45;
  n += Math.min(sel.extraIds.length, 3) * 10;
  return Math.min(n, 100);
};
