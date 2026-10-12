/* The customer is back from Square's checkout: confirm the deposit and finish the booking.

   POST /api/confirm  { ref }
     -> 200 { paid, calendar }   what Square says (paid or not yet) and where the appointment stands
     -> 400 / 404 / 503          bad reference / no such booking / not set up

   The reference alone proves nothing: payment is checked against Square's own order, so this only ever
   finishes bookings that really were paid. The Square webhook does the same for customers who never come back. */
import { dbReady, foreignOrigin, json, log, preflight } from './_lib.js';
import { finalizeBooking, REF } from './_finalize.js';
import { squareReady } from './_square.js';

export const OPTIONS = preflight;

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (foreignOrigin(req)) return json(403, { error: 'Origin not allowed' }, origin);
  if (!squareReady() || !dbReady()) return json(503, { error: 'Not set up yet' }, origin);

  let body: { ref?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }, origin); }
  const ref = String(body.ref ?? '');
  if (!REF.test(ref)) return json(400, { error: 'Invalid reference' }, origin);

  try {
    const out = await finalizeBooking(ref);
    if (!out.found) return json(404, { error: 'Unknown booking' }, origin);
    return json(200, { paid: out.paid, calendar: out.calendar }, origin);
  } catch (e) {
    log('confirm_failed', { ref, detail: String(e) });
    return json(502, { error: 'Could not confirm yet' }, origin);
  }
}
