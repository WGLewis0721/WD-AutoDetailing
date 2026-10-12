/* Signed, on-demand Google Calendar drafts for Mirror Finish operators.
 * A customer sends this link in their prefilled SMS. Opening the URL shows
 * a Google Calendar prefilled PENDING appointment; nothing is auto-created.
 * Signed URLs are bearer links. Never include private customer data in them.
 */
import { slotIso } from './_square-booking.js';

const KEY_PURPOSE = 'mirror-finish:operator-calendar-request:v1:';
const REF = /^MF-[A-Z0-9]{8}$/;
const HEX = /^[a-f0-9]{64}$/;

export type CalendarRequestRow = {
  ref: string; status: string; customer_name: string; phone: string;
  email: string; street: string; city: string; zip: string;
  appointment_date: string; start_minute: number; duration_minutes: number;
  notes: string | null; cars: {
    vehicle: string; packageId: string; size: string;
    lines: { label: string; cents: number }[];
  }[];
  total_cents: number; deposit_cents: number; balance_cents: number;
};

const signingKey = async () => crypto.subtle.importKey('raw',
  new TextEncoder().encode(process.env.SUPABASE_SECRET_KEY || ''),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function calendarSignature(ref: string): Promise<string> {
  if (!REF.test(ref) || !process.env.SUPABASE_SECRET_KEY) throw Error('Calendar signing unavailable');
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(),
    new TextEncoder().encode(KEY_PURPOSE + ref)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validCalendarSignature(ref: string, signature: string): Promise<boolean> {
  if (!REF.test(ref) || !HEX.test(signature) || !process.env.SUPABASE_SECRET_KEY) return false;
  const bytes = new Uint8Array(signature.match(/.{2}/g)!.map(v => parseInt(v, 16)));
  return crypto.subtle.verify('HMAC', await signingKey(), bytes, new TextEncoder().encode(KEY_PURPOSE + ref));
}

export async function calendarRequestLink(ref: string, requestUrl: string): Promise<string> {
  // Use the API's deployed URL, never an origin provided by the customer.
  const u = new URL('/api/calendar-request', requestUrl);
  u.searchParams.set('ref', ref);
  u.searchParams.set('sig', await calendarSignature(ref));
  return u.toString();
}

const money = (cents: number) => '$' + (cents / 100).toFixed(2);
const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalendarDraft(row: CalendarRequestRow): string {
  const start = slotIso(row.appointment_date, row.start_minute);
  const end = new Date(Date.parse(start) + row.duration_minutes * 60_000).toISOString();
  const pending = row.status !== 'confirmed';
  const title = (pending ? 'PENDING — ' : '') + 'Mirror Finish | ' + row.customer_name.trim() + ' | ' + row.ref;
  const vehicles = row.cars.map((c, i) => [
    'Vehicle ' + (i + 1) + ': ' + c.vehicle,
    'Package: ' + c.packageId,
    'Size: ' + c.size,
    ...(c.lines ?? []).map(line => '  ' + line.label + ': ' + money(line.cents)),
  ].join('\n')).join('\n\n');
  const details = [
    pending ? 'APPOINTMENT REQUEST — NOT CONFIRMED. Review before saving to the calendar.' : 'Booking confirmed.',
    'Reference: ' + row.ref,
    'Customer: ' + row.customer_name,
    'Phone: ' + row.phone,
    'Email: ' + row.email,
    vehicles,
    'Total: ' + money(row.total_cents),
    'Deposit due after confirmation (20%): ' + money(row.deposit_cents),
    'Remaining balance after detailing: ' + money(row.balance_cents),
    pending ? 'No payment was collected by the booking request form.' : '',
    row.notes ? 'Notes: ' + row.notes : '',
  ].filter(Boolean).join('\n');
  const u = new URL('https://calendar.google.com/calendar/r/eventedit');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('dates', stamp(start) + '/' + stamp(end));
  u.searchParams.set('stz', 'America/Chicago');
  u.searchParams.set('etz', 'America/Chicago');
  u.searchParams.set('text', title);
  u.searchParams.set('details', details);
  u.searchParams.set('location', row.street + ', ' + row.city + ', AL ' + row.zip);
  return u.toString();
}
