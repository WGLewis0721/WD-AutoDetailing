/* Finishing a booking once Square says the deposit is paid. Called by /api/confirm (the customer lands back on the
   site) and /api/square-webhook (Square tells us); both are safe to run any number of times for the same booking.

   1. Ask Square whether the order really is paid. Nothing the browser says is trusted.
   2. Mark the mf_bookings row paid.
   3. Put the appointment on the Square Appointments calendar. Square only allows apps to do that on the Appointments
      Plus or Premium plan; on the free plan the booking stays paid-but-not-on-the-calendar (calendar_status 'failed'
      with the reason saved) and is retried automatically on later runs, so upgrading the plan needs no code change. */
import { packages } from '../site/src/data/menu.js';
import { bookingRequest, type BookingRow } from '../site/src/lib/calendar.js';
import { db, log } from './_lib.js';
import { square, squareErrors } from './_square.js';

export const REF = /^MF-[0-9A-F]{8}$/;
const MAX_ATTEMPTS = 20;

interface Row extends BookingRow {
  square_order_id: string | null; payment_status: 'pending' | 'paid'; calendar_status: 'pending' | 'booked' | 'failed'; calendar_attempts: number;
}
export interface Outcome { found: boolean; paid: boolean; calendar: 'booked' | 'pending' | 'failed' | 'none' }

/** Paid means: a tender is on the order, nothing is left to pay, and the amount is the deposit we quoted. */
const isPaid = (order: any, depositCents: number) =>
  !!order && ['OPEN', 'COMPLETED'].includes(order.state) && order.total_money?.amount === depositCents &&
  order.net_amount_due_money?.amount === 0 && (order.tenders?.length ?? 0) > 0;

const patch = (ref: string, body: Record<string, unknown>, extra = '') =>
  db(`mf_bookings?ref=eq.${encodeURIComponent(ref)}${extra}`, { method: 'PATCH', body, prefer: 'return=minimal' });

async function bookableTeamMember(locationId: string): Promise<string> {
  if (process.env.SQUARE_TEAM_MEMBER_ID) return process.env.SQUARE_TEAM_MEMBER_ID;
  const r = await square(`/v2/bookings/team-member-profiles?bookable_only=true&limit=20&location_id=${locationId}`);
  const id = r.data?.team_member_booking_profiles?.[0]?.team_member_id;
  if (!r.ok || !id) throw new Error(`No bookable team member (${squareErrors(r)})`);
  return id;
}

async function customerFor(row: Row): Promise<string> {
  const found = await square('/v2/customers/search', { method: 'POST', body: { query: { filter: { email_address: { exact: row.email } } }, limit: 1 } });
  const existing = found.data?.customers?.[0]?.id;
  if (found.ok && existing) return existing;
  const [given, ...rest] = row.customer_name.trim().split(/\s+/);
  const made = await square('/v2/customers', {
    method: 'POST',
    body: {
      idempotency_key: `mf-customer-${row.ref}`, given_name: given, family_name: rest.join(' ') || undefined, email_address: row.email,
      phone_number: `+1${row.phone}`, reference_id: row.ref,
      address: { address_line_1: row.street, locality: row.city, administrative_district_level_1: 'AL', postal_code: row.zip, country: 'US' },
    },
  });
  if (!made.ok || !made.data?.customer?.id) throw new Error(`Customer: ${squareErrors(made)}`);
  return made.data.customer.id;
}

/** Create the appointment. Returns the Square booking id or throws with Square's reason. */
async function bookOnCalendar(row: Row): Promise<string> {
  const locationId = process.env.SQUARE_LOCATION_ID!;
  const teamMemberId = await bookableTeamMember(locationId);
  const variationIds = [...new Set(row.cars.map((c) => packages.find((p) => p.id === c.packageId)?.square).filter(Boolean) as string[])];
  const catalog = await square('/v2/catalog/batch-retrieve', { method: 'POST', body: { object_ids: variationIds } });
  const versions: Record<string, number> = {};
  for (const o of catalog.data?.objects ?? []) versions[o.id] = o.version;
  if (!catalog.ok || variationIds.some((id) => !(id in versions))) throw new Error(`Services: ${squareErrors(catalog)}`);

  const customerId = await customerFor(row);
  const ctx = { locationId, teamMemberId, customerId, versions };
  let res = await square('/v2/bookings', { method: 'POST', body: bookingRequest(row, ctx) });
  // Square's settings may not allow the "customer's location" type: book it without, the address is in the seller note.
  if (res.status === 400 && /location_type|address/i.test(JSON.stringify(res.data?.errors ?? []))) {
    res = await square('/v2/bookings', { method: 'POST', body: bookingRequest(row, ctx, { withAddress: false }) });
  }
  if (!res.ok || !res.data?.booking?.id) throw new Error(squareErrors(res));
  return res.data.booking.id;
}

async function tryCalendar(row: Row): Promise<'booked' | 'failed'> {
  try {
    const id = await bookOnCalendar(row);
    await patch(row.ref, { calendar_status: 'booked', square_booking_id: id, calendar_error: null, calendar_attempts: row.calendar_attempts + 1 });
    log('calendar_booked', { ref: row.ref, booking_id: id });
    return 'booked';
  } catch (e) {
    const reason = String((e as Error).message ?? e).slice(0, 500);
    await patch(row.ref, { calendar_status: 'failed', calendar_error: reason, calendar_attempts: row.calendar_attempts + 1 });
    log('calendar_failed', { ref: row.ref, reason });
    return 'failed';
  }
}

/** Confirm payment for one booking (by its MF- reference) and put it on the calendar. */
export async function finalizeBooking(ref: string): Promise<Outcome> {
  const [row] = await db<Row[]>(`mf_bookings?ref=eq.${encodeURIComponent(ref)}&select=*`);
  if (!row) return { found: false, paid: false, calendar: 'none' };

  if (row.payment_status !== 'paid') {
    if (!row.square_order_id) return { found: true, paid: false, calendar: 'none' };
    const order = await square(`/v2/orders/${row.square_order_id}`);
    if (!order.ok || !isPaid(order.data.order, row.deposit_cents)) return { found: true, paid: false, calendar: 'none' };
    const tender = order.data.order.tenders[0];
    // Only the first writer flips pending -> paid; a racing webhook/confirm pair just repeats harmless work.
    await patch(ref, { payment_status: 'paid', paid_at: new Date().toISOString(), square_payment_id: tender.payment_id ?? tender.id ?? null }, '&payment_status=eq.pending');
    row.payment_status = 'paid';
    log('deposit_paid', { ref });
  }

  if (row.calendar_status === 'booked') return { found: true, paid: true, calendar: 'booked' };
  const calendar = await tryCalendar(row);
  // The calendar works (plan upgraded, or it always did): catch up any earlier paid bookings that missed it.
  if (calendar === 'booked') await retryMissed(ref);
  return { found: true, paid: true, calendar };
}

/** Paid bookings that never reached the calendar, oldest first, a few per run. */
async function retryMissed(skipRef: string, limit = 3) {
  const rows = await db<Row[]>(
    `mf_bookings?payment_status=eq.paid&calendar_status=in.(pending,failed)&calendar_attempts=lt.${MAX_ATTEMPTS}&ref=neq.${encodeURIComponent(skipRef)}&order=paid_at.asc&limit=${limit}&select=*`,
  );
  for (const r of rows) await tryCalendar(r);
}

/** The booking a Square payment belongs to, by its Square order id. */
export async function refForOrder(orderId: string): Promise<string | null> {
  const [row] = await db<{ ref: string }[]>(`mf_bookings?square_order_id=eq.${encodeURIComponent(orderId)}&select=ref`);
  return row?.ref ?? null;
}
