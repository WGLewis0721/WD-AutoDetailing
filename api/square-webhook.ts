/* payment.created/payment.updated: validate Square's HMAC over the EXACT raw body,
   then idempotently create an appointment only after the deposit is COMPLETED. */
import { db, dbReady, log } from './_lib.js';
import { BookingUnavailable, bookingService, SQUARE_API, SQUARE_VERSION, slotIso } from './_square-booking.js';

type StoredBooking = {
  ref: string; status: string; square_booking_id: string | null; customer_name: string;
  email: string; phone: string; street: string; city: string; zip: string;
  appointment_date: string; start_minute: number; duration_minutes: number;
  deposit_cents: number; cars: { packageId: string; extraIds: string[] }[];
};
const reply = (status: number) => new Response(status === 200 ? 'ok' : 'unavailable', { status });
/** Obtain the ACTIVE Square subscription key on the server for each webhook.
 * This survives Square key rotation, and never trusts an exposed/stale local key. */
async function verify(raw: string, signature: string) {
  const url = process.env.SQUARE_WEBHOOK_URL;
  if (!url || !signature) return false;
  const response = await fetch(SQUARE_API + '/v2/webhooks/subscriptions', {
    headers: { Authorization: 'Bearer ' + process.env.SQUARE_ACCESS_TOKEN,
      'Square-Version': SQUARE_VERSION, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Unable to retrieve Square webhook subscription');
  const data = await response.json();
  const subscription = (Array.isArray(data.subscriptions) ? data.subscriptions : []).find(
    (s: { enabled?: boolean; notification_url?: string; signature_key?: string; event_types?: string[] }) =>
      s.enabled && s.notification_url === url &&
      s.event_types?.includes('payment.created') && s.event_types?.includes('payment.updated'));
  if (!subscription?.signature_key) throw new Error('No valid active Square webhook subscription key');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(subscription.signature_key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  try {
    const digest = Uint8Array.from(atob(signature), (ch) => ch.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, digest, new TextEncoder().encode(url + raw));
  } catch { return false; }
}
async function square(path: string, body: unknown) {
  const res = await fetch(SQUARE_API + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.SQUARE_ACCESS_TOKEN,
      'Square-Version': SQUARE_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Square ' + res.status + ': ' + JSON.stringify(data.errors ?? []).slice(0, 160));
  return data;
}
async function appointment(row: StoredBooking, paymentCustomerId?: string) {
  if (!row.cars || row.cars.length !== 1 || row.cars[0].extraIds?.length) {
    throw new BookingUnavailable('This order requires manual appointment confirmation.');
  }
  const service = bookingService(row.cars[0].packageId);
  let customerId = paymentCustomerId;
  if (!customerId) {
    const names = row.customer_name.trim().split(/\s+/);
    const c = await square('/v2/customers', {
      idempotency_key: 'mf-customer-' + row.ref,
      given_name: names[0], family_name: names.slice(1).join(' '),
      email_address: row.email, phone_number: '+1' + row.phone,
    });
    customerId = c.customer?.id;
    if (!customerId) throw new Error('Square did not return a customer ID');
  }
  const b = await square('/v2/bookings', {
    idempotency_key: 'mf-appointment-' + row.ref,
    booking: {
      customer_id: customerId, location_id: process.env.SQUARE_LOCATION_ID,
      start_at: slotIso(row.appointment_date, row.start_minute),
      seller_note: (row.ref + ' | Mobile service: ' + row.street + ', ' + row.city + ', AL ' + row.zip).slice(0, 450),
      appointment_segments: [{
        duration_minutes: row.duration_minutes, team_member_id: service.team,
        service_variation_id: service.id, service_variation_version: service.version,
      }],
    },
  });
  if (!b.booking?.id) throw new Error('Square did not return an appointment ID');
  return { bookingId: b.booking.id as string, customerId };
}
export async function POST(req: Request) {
  if (!dbReady() || !process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_WEBHOOK_URL) return reply(503);
  const raw = await req.text();
  let valid = false;
  try { valid = await verify(raw, req.headers.get('x-square-hmacsha256-signature') || ''); }
  catch {
    log('square_webhook_verification_unavailable');
    return reply(503); // Fail closed; Square should retry a temporarily unavailable verifier.
  }
  if (!valid) return reply(403);
  let event: Record<string, any>;
  try { event = JSON.parse(raw); } catch { return reply(400); }
  if (!['payment.created','payment.updated'].includes(event.type)) return reply(200);
  const payment = event.data?.object?.payment;
  if (!payment || payment.status !== 'COMPLETED' || !payment.order_id) return reply(200);
  if (payment.location_id && payment.location_id !== process.env.SQUARE_LOCATION_ID) return reply(200);
  try {
    const matches = await db<StoredBooking[]>(
      'mf_bookings?square_order_id=eq.' + encodeURIComponent(payment.order_id) + '&select=*');
    if (matches.length === 0) return reply(200); // Not a Mirror Finish web checkout order.
    const row = matches[0];
    if (row.status === 'confirmed' && row.square_booking_id) return reply(200);
    if (payment.amount_money?.currency !== 'USD' ||
        Number(payment.amount_money?.amount) !== row.deposit_cents) {
      log('square_payment_amount_mismatch', { ref: row.ref });
      return reply(503);
    }
    const path = 'mf_bookings?ref=eq.' + encodeURIComponent(row.ref);
    await db(path, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'paid_pending_appointment' } });
    const done = await appointment(row, payment.customer_id);
    await db(path, { method: 'PATCH', prefer: 'return=minimal',
      body: { status: 'confirmed', square_booking_id: done.bookingId, square_customer_id: done.customerId } });
    log('square_appointment_confirmed', { ref: row.ref, bookingId: done.bookingId });
    return reply(200);
  } catch (error) {
    // 503 requests a webhook retry. Square booking & customer creation use stable idempotency keys.
    log('square_appointment_retry_required', { error: String(error).slice(0, 160) });
    return reply(503);
  }
}
