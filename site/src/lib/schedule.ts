import { SITE } from '../data/site';

const S = SITE.schedule;

export const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hourLabel = (minutesFromMidnight: number): string => {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${ap}`;
};

/** Sample bookings so the preview shows some taken slots (replaced by real availability later). */
export const sampleTaken = (dateIso: string, startMin: number): boolean =>
  ([...(dateIso + startMin)].reduce((n, c) => n + c.charCodeAt(0), 0) % 7) === 0;

export interface Slot { startMin: number; label: string; taken: boolean }

/** Start times where the whole order (one detailer, back to back) fits inside working hours. */
export function slotsFor(dateIso: string, totalMinutes: number): Slot[] {
  const open = S.openHour * 60;
  const close = S.closeHour * 60;
  const out: Slot[] = [];
  for (let t = open; t + totalMinutes <= close; t += S.stepMinutes) {
    out.push({ startMin: t, label: hourLabel(t), taken: sampleTaken(dateIso, t) });
  }
  return out;
}

export const isOpenDay = (d: Date, today: Date): boolean => {
  const first = new Date(today); first.setDate(first.getDate() + S.leadDays);
  const last = new Date(today); last.setDate(last.getDate() + S.horizonDays);
  return d >= first && d <= last && !(S.closedDays as readonly number[]).includes(d.getDay());
};

export type DayState = 'open' | 'closed' | 'full' | 'past' | 'far';

/** Why a day can or cannot be picked, so the calendar can say so instead of only greying it out. */
export function dayState(d: Date, today: Date, totalMinutes: number): DayState {
  const first = new Date(today); first.setDate(first.getDate() + S.leadDays);
  const last = new Date(today); last.setDate(last.getDate() + S.horizonDays);
  if (d < first) return 'past';
  if (d > last) return 'far';
  if ((S.closedDays as readonly number[]).includes(d.getDay())) return 'closed';
  return dayHasRoom(iso(d), totalMinutes) ? 'open' : 'full';
}

/** A day can host the order if at least one start time fits and is free. */
export const dayHasRoom = (dateIso: string, totalMinutes: number): boolean => slotsFor(dateIso, totalMinutes).some((s) => !s.taken);
