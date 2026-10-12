/* Public read-only lookup: times are sourced from Square Appointments, never sample data. */
import { packages } from '../site/src/data/menu.js';
import { cors, foreignOrigin, json, preflight } from './_lib.js';
import { BookingUnavailable, squareSlots } from './_square-booking.js';

export const OPTIONS = preflight;
export async function GET(req: Request) {
  const origin = req.headers.get('origin');
  if (foreignOrigin(req)) return json(403, { error: 'Origin not allowed' }, origin);
  // Availability is read-only and safe to display even when deposits are disabled.
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || '';
  const pkg = url.searchParams.get('package') || '';
  if (!packages.some(p => p.id === pkg)) return json(400, { error: 'Invalid package' }, origin);
  try {
    const slots = await squareSlots(date, pkg);
    return new Response(JSON.stringify({ date, package: pkg, starts: slots }), {
      status: 200, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', ...cors(origin) },
    });
  } catch (e) {
    if (e instanceof BookingUnavailable) return json(e.status, { error: e.message }, origin);
    return json(503, { error: 'Availability check unavailable. Please book by text.' }, origin);
  }
}
