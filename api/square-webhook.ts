/* Square tells us a payment changed. Optional but recommended: it finishes bookings for customers who pay and then
   close the tab before returning to the site (/api/confirm covers everyone who does come back).

   One-time setup (Square Developer Dashboard -> your application -> Webhooks -> Add endpoint):
     URL      https://<this Vercel project>/api/square-webhook
     Event    payment.updated
   then copy the endpoint's Signature Key into the Vercel env var SQUARE_WEBHOOK_SIGNATURE_KEY. If the URL Square calls
   differs from the one derived from the request (custom domain, proxy), also set SQUARE_WEBHOOK_URL to it exactly.

   Square signs every delivery: base64(HMAC-SHA256(key, notification URL + raw body)) in x-square-hmacsha256-signature.
   Unsigned or wrongly signed requests are rejected. */
import { dbReady, log, validSignature } from './_lib.js';
import { finalizeBooking, refForOrder } from './_finalize.js';
import { squareReady } from './_square.js';

const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(req: Request) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !squareReady() || !dbReady()) { log('webhook_not_configured'); return reply(503, { error: 'Not set up yet' }); }

  const raw = await req.text();
  const url = process.env.SQUARE_WEBHOOK_URL || new URL(req.url).origin + new URL(req.url).pathname;
  if (!(await validSignature(raw, url, key, req.headers.get('x-square-hmacsha256-signature') ?? ''))) {
    log('webhook_bad_signature');
    return reply(403, { error: 'Bad signature' });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid JSON' }); }
  const payment = event?.data?.object?.payment;
  // Only a completed payment on an order matters; everything else is acknowledged and ignored.
  if (event?.type !== 'payment.updated' || payment?.status !== 'COMPLETED' || !payment?.order_id) return reply(200, { ignored: true });

  try {
    const ref = await refForOrder(payment.order_id);
    if (!ref) { log('webhook_unknown_order', { order_id: payment.order_id }); return reply(200, { ignored: true }); }
    const out = await finalizeBooking(ref);
    log('webhook_finalized', { ref, paid: out.paid, calendar: out.calendar });
    return reply(200, { ok: true });
  } catch (e) {
    log('webhook_failed', { detail: String(e) });
    return reply(500, { error: 'Try again' }); // Square retries on non-2xx
  }
}
