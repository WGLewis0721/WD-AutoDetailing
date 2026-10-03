/* Mirror Finish checkout function (Vercel). The website stays on GitHub Pages; this is the one piece that has to run
   on a server, because it holds the Square access token.

   POST /api/create-checkout  { cars, date, startMin, name, phone, email, street, city, zip, notes }
     -> 200 { url, ref }   the customer is sent to Square's hosted checkout, which lists everything they built
     -> 400 { error }      the order failed validation (unknown package, vehicle, area...)
     -> 502 { error }      Square refused the request

   Environment (Vercel project settings, never in the repo):
     SQUARE_ACCESS_TOKEN   Square access token (sandbox or production)
     SQUARE_LOCATION_ID    the Mirror Finish location
     SQUARE_ENV            "sandbox" (default) or "production"
     SITE_URL              where the website lives, for the return link (default: the GitHub Pages URL)
     ALLOWED_ORIGINS       comma-separated origins allowed to call this (default: the GitHub Pages origin) */
import { buildPaymentLink, lineTotal, OrderError, type CheckoutOrder } from '../site/src/lib/checkout.js';

const SITE_URL = process.env.SITE_URL || 'https://wglewis0721.github.io/WD-AutoDetailing';
const ORIGINS = (process.env.ALLOWED_ORIGINS || new URL(SITE_URL).origin).split(',').map((o) => o.trim()).filter(Boolean);
const SQUARE_API = process.env.SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
const SQUARE_VERSION = '2025-01-23';

const cors = (origin: string | null): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});
const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
const log = (event: string, detail: Record<string, unknown> = {}) => console.log(JSON.stringify({ event, ...detail }));

/** Short, readable booking reference; also the idempotency key, so a double-tap can't create two links. */
const newRef = () => 'MF-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get('origin')) });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && !ORIGINS.includes(origin)) return json(403, { error: 'Origin not allowed' }, origin);
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    log('checkout_not_configured');
    return json(503, { error: 'Online payment is not set up yet' }, origin);
  }

  let order: CheckoutOrder;
  try { order = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }, origin); }

  const ref = newRef();
  let body;
  try {
    body = buildPaymentLink(order, { locationId: process.env.SQUARE_LOCATION_ID, ref, siteUrl: SITE_URL });
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
  return json(200, { url: data.payment_link.url, ref }, origin);
}
