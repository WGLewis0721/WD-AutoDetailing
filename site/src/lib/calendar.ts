/* Turns a saved booking (mf_bookings row) into a Square Appointments booking.
   Pure functions only, shared with the Vercel functions and unit-tested without any network. */
import { extras, packages } from '../data/menu.js';

export const TIMEZONE = 'America/Chicago';

/** One car as saved by bookingCars() in mf_bookings.cars. */
export interface BookedCar {
  car: number; vehicle: string; size: string; packageId: string; extraIds: string[]; totalCents: number; minutes: number;
}

/** The columns of mf_bookings the calendar step needs. */
export interface BookingRow {
  ref: string; customer_name: string; phone: string; email: string; street: string; city: string; zip: string; notes: string | null;
  appointment_date: string; start_minute: number; duration_minutes: number; cars: BookedCar[];
  total_cents: number; deposit_cents: number; balance_cents: number;
}

/** Wall-clock time in Montgomery (date "YYYY-MM-DD", minutes after midnight) as the exact UTC instant, DST included. */
export function localToUtc(date: string, minutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, minutes);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const offset = (t: number) => {
    const part = (k: string) => Number(fmt.formatToParts(new Date(t)).find((p) => p.type === k)!.value);
    return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute')) - t;
  };
  const first = naive - offset(naive);
  return new Date(naive - offset(first));
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const nameOf = (id: string) => [...packages, ...extras].find((x) => x.id === id)?.name ?? id;

/** What the detailer needs on the calendar entry: who, where, what, and what is still owed. Square allows 4000 characters. */
export function sellerNote(r: BookingRow): string {
  const lines = [
    `${r.ref} | Deposit paid ${dollars(r.deposit_cents)} | Balance due on completion ${dollars(r.balance_cents)} (total ${dollars(r.total_cents)})`,
    ...r.cars.map((c) => `Car ${c.car}: ${c.vehicle} (${c.size}) - ${[nameOf(c.packageId), ...c.extraIds.map(nameOf)].join(' + ')} - ${c.minutes} min`),
    `Address: ${r.street}, ${r.city}, AL ${r.zip}`,
    `Customer: ${r.customer_name} | ${r.phone} | ${r.email}`,
    ...(r.notes ? [`Customer notes: ${r.notes}`] : []),
  ];
  return lines.join('\n').slice(0, 3900);
}

export interface BookingContext {
  locationId: string; teamMemberId: string; customerId: string;
  /** Catalog version of each service variation id, from Square. */
  versions: Record<string, number>;
}

/** One appointment segment per car (its package service), lasting that car's whole time including add-ons, so the
    calendar blocks exactly the time the customer was promised. The segments always add up to duration_minutes. */
export function appointmentSegments(r: BookingRow, ctx: Pick<BookingContext, 'teamMemberId' | 'versions'>) {
  const segs = r.cars.map((c) => {
    const variation = packages.find((p) => p.id === c.packageId)?.square;
    if (!variation || !(variation in ctx.versions)) throw new Error(`No Square service for package ${c.packageId}`);
    return { duration_minutes: c.minutes, service_variation_id: variation, service_variation_version: ctx.versions[variation], team_member_id: ctx.teamMemberId };
  });
  const diff = r.duration_minutes - segs.reduce((n, s) => n + s.duration_minutes, 0);
  if (diff !== 0 && segs[segs.length - 1].duration_minutes + diff > 0) segs[segs.length - 1].duration_minutes += diff;
  return segs;
}

/** The body for POST /v2/bookings. Mobile service: the customer's address, when Square's settings allow that type. */
export function bookingRequest(r: BookingRow, ctx: BookingContext, opts: { withAddress?: boolean } = {}) {
  const withAddress = opts.withAddress ?? true;
  return {
    idempotency_key: `mf-booking-${r.ref}`,
    booking: {
      location_id: ctx.locationId,
      customer_id: ctx.customerId,
      start_at: localToUtc(r.appointment_date, r.start_minute).toISOString(),
      appointment_segments: appointmentSegments(r, ctx),
      seller_note: sellerNote(r),
      customer_note: r.notes ? r.notes.slice(0, 500) : undefined,
      ...(withAddress
        ? {
            location_type: 'CUSTOMER_LOCATION',
            address: { address_line_1: r.street, locality: r.city, administrative_district_level_1: 'AL', postal_code: r.zip, country: 'US' },
          }
        : {}),
    },
  };
}
