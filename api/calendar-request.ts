/* Manual-only Google Calendar action opened by Mirror Finish after receiving SMS.
 * The signed URL is an unguessable bearer link, not a public booking lookup.
 * Returns a prefilled calendar draft, never writes to any calendar. */
import { db, dbReady } from './_lib.js';
import { googleCalendarDraft, validCalendarSignature, type CalendarRequestRow } from './_calendar-request.js';

const missing = (status: number) => new Response('Calendar draft unavailable', {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
});

export async function GET(req: Request) {
  const u = new URL(req.url);
  const ref = u.searchParams.get('ref') || '';
  const sig = u.searchParams.get('sig') || '';
  if (!dbReady() || !await validCalendarSignature(ref, sig)) return missing(404);
  try {
    const rows = await db<CalendarRequestRow[]>('mf_bookings?ref=eq.' +
      encodeURIComponent(ref) +
      '&select=ref,status,customer_name,phone,email,street,city,zip,appointment_date,start_minute,duration_minutes,notes,cars,total_cents,deposit_cents,balance_cents');
    const row = rows[0];
    if (!row || !['request_pending','confirmed'].includes(row.status)) return missing(404);
    const destination = googleCalendarDraft(row);
    return new Response(null, {status: 303, headers: {
      Location: destination, 'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    }});
  } catch { return missing(503); }
}
