/* Mirror Finish checkout function (Vercel). The website stays on GitHub Pages; this is the one piece that has to run
   on a server, because it holds the Square access token and the database key.

   POST /api/create-checkout  { agreementId, cars, date, startMin, name, phone, email, street, city, zip, notes }
     -> 200 { url, ref }   the customer is sent to Square's hosted checkout, which lists everything they built
     -> 400 { error }      the order failed validation (unknown package, vehicle, area...)
     -> 428 { error }      no accepted Service Agreement on record for this customer: show the agreement again
     -> 502 { error }      Square refused the request

   Before Square is called, the agreement id must point at an 'accepted' row for the current agreement version.
   After Square creates the link, the whole build is saved to mf_bookings with the agreement and Square ids.

   Environment (Vercel project settings, never in the repo):
     SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENV ("sandbox" default, or "production")
     SUPABASE_URL, SUPABASE_SECRET_KEY       the Mirror Finish tables (mf_agreements, mf_bookings)
     SITE_URL, ALLOWED_ORIGINS               return link and allowed callers (default: the GitHub Pages site) */
import { AGREEMENT } from '../site/src/data/agreement.js';
import { bookingCars, buildPaymentLink, lineTotal, OrderError, priceOrder, type CheckoutOrder } from '../site/src/lib/checkout.js';
import { db, dbReady, foreignOrigin, json, log, preflight, SITE_URL, UUID } from './_lib.js';

const SQUARE_API = process.env.SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
const SQUARE_VERSION = '2025-01-23';

/** Short, readable booking reference; also the idempotency key, so a double-tap can't create two links. */
const newRef = () => 'MF-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

export const OPTIONS = preflight;

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (foreignOrigin(req)) return json(403, { error: 'Origin not allowed' }, origin);
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID || !dbReady()) {
    log('checkout_not_configured', { square: !!process.env.SQUARE_ACCESS_TOKEN, db: dbReady() });
    return json(503, { error: 'Online payment is not set up yet' }, origin);
  }

  let order: CheckoutOrder;
  try { order = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }, origin); }

  // The Service Agreement gate: no accepted agreement for the current version, no checkout.
  const aid = String(order.agreementId ?? '');
  const agreed = UUID.test(aid)
    ? await db<{ id: string }[]>(`mf_agreements?id=eq.${aid}&decision=eq.accepted&version=eq.${encodeURIComponent(AGREEMENT.version)}&select=id`)
    : [];
  if (!agreed.length) { log('agreement_missing', { has_id: !!aid }); return json(428, { error: 'Please review and accept the Service Agreement first.', agreement: true }, origin); }

  const ref = newRef();
  let body;
  try {
    body = buildPaymentLink(order, { locationId: process.env.SQUARE_LOCATION_ID, ref, siteUrl: SITE_URL, agreement: `v${AGREEMENT.version} ${aid.slice(0, 8)}` });
  } catch (e) {
    if (e instanceof OrderError) { log('order_rejected', { reason: e.message }); return json(400, { error: e.message }, origin); }
    throw e;
  }
  const charged = lineTotal(body.order.line_items) - body.order.discounts.reduce((n, d) => n + d.amount_money.amount, 0);
  log('order_priced', { ref, cars: order.cars.length, lines: body.order.line_items.length, deposit_cents: charged });

  const res = await fetch(`${SQUARE_API}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`, 'Square-Version': SQUARE_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.payment_link?.url) {
    log('square_error', { ref, status: res.status, errors: data.errors });
    return json(502, { error: 'Payment system error' }, origin);
  }
  log('payment_link_created', { ref, order_id: data.payment_link.order_id });

  // Save the build. A database hiccup must not strand a customer who is ready to pay: the Square order already
  // carries the reference, the build and the agreement id, so log loudly and still send them to checkout.
  const q = priceOrder(order);
  try {
    await db('mf_bookings', {
      method: 'POST', prefer: 'return=minimal',
      body: {
        ref, agreement_id: aid,
        customer_name: order.name.trim().slice(0, 200), phone: order.phone.replace(/\D/g, ''), email: order.email.trim().slice(0, 254),
        street: order.street.trim().slice(0, 200), city: order.city, zip: order.zip, notes: order.notes?.trim().slice(0, 1000) || null,
        appointment_date: order.date, start_minute: order.startMin, duration_minutes: q.minutes,
        cars: bookingCars(order),
        total_cents: q.totalCents, deposit_cents: q.depositCents, balance_cents: q.balanceCents,
        square_payment_link_id: data.payment_link.id ?? null, square_order_id: data.payment_link.order_id ?? null, square_checkout_url: data.payment_link.url,
      },
    });
    log('booking_saved', { ref });
  } catch (e) {
    log('booking_save_failed', { ref, detail: String(e) });
  }
  return json(200, { url: data.payment_link.url, ref }, origin);
}
