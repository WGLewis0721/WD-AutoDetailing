/* Customer-facing status check contains no PII. A redirect query string does not prove payment. */
import { db, dbReady, foreignOrigin, json } from './_lib.js';
export async function GET(req: Request) {
  const origin = req.headers.get('origin');
  if (foreignOrigin(req)) return json(403,{error:'Origin not allowed'},origin);
  const ref = new URL(req.url).searchParams.get('ref') || '';
  if (!/^MF-[0-9A-F]{8}$/.test(ref)) return json(400,{error:'Invalid reference'},origin);
  if (!dbReady()) return json(503,{confirmed:false,error:'Verification unavailable'},origin);
  try {
    const rows = await db<{status:string;square_booking_id:string|null}[]>(
      'mf_bookings?ref=eq.'+encodeURIComponent(ref)+'&select=status,square_booking_id');
    const confirmed = rows.length === 1 && rows[0].status === 'confirmed' && !!rows[0].square_booking_id;
    return json(200,{confirmed, state:confirmed?'confirmed':rows.length?'pending':'unrecognized'},origin);
  } catch { return json(503,{confirmed:false,error:'Verification unavailable'},origin); }
}
