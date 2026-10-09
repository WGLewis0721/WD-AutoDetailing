/* Booking integration deliberately fails closed until Mirror Finish's actual Square
   Appointments service variations, team member and plan have been verified.
   A Square catalog item sold at checkout is NOT automatically a bookable service. */
import { packages } from '../site/src/data/menu.js';
import { SITE } from '../site/src/data/site.js';
import { priceOrder, type CheckoutOrder } from '../site/src/lib/checkout.js';

export const SQUARE_API = process.env.SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
export const SQUARE_VERSION = '2026-09-16';
const ZONE = 'America/Chicago';

export class BookingUnavailable extends Error {
  constructor(message: string, public readonly status = 503) { super(message); }
}

export function bookingService(packageId: string) {
  const key = packageId.toUpperCase();
  if (!packages.some(p => p.id === packageId)) throw new BookingUnavailable('Unknown service', 400);
  const id = process.env['SQUARE_APPOINTMENT_' + key + '_VARIATION_ID'];
  const version = Number(process.env['SQUARE_APPOINTMENT_' + key + '_VERSION']);
  const team = process.env.SQUARE_APPOINTMENT_TEAM_MEMBER_ID;
  if (!id || !Number.isSafeInteger(version) || version < 1 || !team) {
    throw new BookingUnavailable('Live appointment availability is not configured. Please book by text.');
  }
  return { id, version, team };
}
export function supportsOnlineAppointment(o: CheckoutOrder) {
  if (o.cars.length !== 1 || o.cars[0].extraIds.length > 0) {
    throw new BookingUnavailable('Multi-car and add-on appointments require manual scheduling. Please book by text.', 409);
  }
  return { ...bookingService(o.cars[0].packageId), minutes: priceOrder(o).minutes };
}
const local = (iso: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return { day: [get('year'), get('month'), get('day')].join('-'),
    minute: Number(get('hour')) * 60 + Number(get('minute')) };
};

export async function squareSlots(date: string, packageId: string): Promise<number[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) {
    throw new BookingUnavailable('Invalid appointment date', 400);
  }
  const service = bookingService(packageId);
  const duration = packages.find(p => p.id === packageId)!.minutes;
  // Conservative local-time range works in CST and CDT; filter returned results to the requested day.
  const d = Date.parse(date + 'T00:00:00Z');
  const start = new Date(d - 864e5).toISOString();
  const end = new Date(d + 2 * 864e5).toISOString();
  const res = await fetch(SQUARE_API + '/v2/bookings/availability/search', {
    method: 'POST', headers: {
      Authorization: 'Bearer ' + process.env.SQUARE_ACCESS_TOKEN,
      'Content-Type': 'application/json', 'Square-Version': SQUARE_VERSION,
    },
    body: JSON.stringify({ query: { filter: {
      location_id: process.env.SQUARE_LOCATION_ID,
      start_at_range: { start_at: start, end_at: end },
      segment_filters: [{ service_variation_id: service.id, team_member_id_filter: { any: [service.team] } }],
    } } }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new BookingUnavailable('Square appointment availability cannot be verified');
  const available = Array.isArray(body.availabilities) ? body.availabilities : [];
  const open = SITE.schedule.openHour * 60, close = SITE.schedule.closeHour * 60;
  return [...new Set<number>(available.flatMap((a: { start_at?: string; appointment_segments?: { service_variation_id?: string }[] }) => {
    if (!a.start_at) return [];
    const when = local(a.start_at);
    if (when.day !== date || when.minute < open || when.minute + duration > close) return [];
    if (when.minute % SITE.schedule.stepMinutes) return [];
    // Square availability for the exact service + team is the source of truth; never add synthetic openings.
    return [when.minute];
  }))].sort((a,b) => a-b);
}
export async function ensureSlot(o: CheckoutOrder): Promise<void> {
  const { minutes } = supportsOnlineAppointment(o);
  const pkg = packages.find(p => p.id === o.cars[0].packageId)!;
  if (minutes !== pkg.minutes) throw new BookingUnavailable('Custom-duration services require manual scheduling.', 409);
  const now = new Date();
  // Date validity and workday range, in the business time zone, not the buyer's computer zone.
  const today = local(now.toISOString()).day;
  const chosen = Date.parse(o.date + 'T12:00:00Z');
  const base = Date.parse(today + 'T12:00:00Z');
  const days = Math.round((chosen-base)/864e5);
  if (days < SITE.schedule.leadDays || days > SITE.schedule.horizonDays ||
      SITE.schedule.closedDays.includes(new Date(chosen).getUTCDay() as 0)) {
    throw new BookingUnavailable('That date is outside booking hours.', 409);
  }
  const slots = await squareSlots(o.date, o.cars[0].packageId);
  if (!slots.includes(o.startMin)) throw new BookingUnavailable('That appointment time is no longer available. Choose another time.', 409);
}
