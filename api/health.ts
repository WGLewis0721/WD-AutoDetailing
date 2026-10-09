/* Non-secret operational readiness. Returns 503 unless the backend is actually configured. */
import { json } from './_lib.js';
export async function GET() {
  const required = ['SUPABASE_URL','SUPABASE_SECRET_KEY','SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID',
    'SQUARE_APPOINTMENT_TEAM_MEMBER_ID','SQUARE_APPOINTMENT_DELUXE_VARIATION_ID',
    'SQUARE_APPOINTMENT_DELUXE_VERSION','SQUARE_APPOINTMENT_EXTERIOR_VARIATION_ID',
    'SQUARE_APPOINTMENT_EXTERIOR_VERSION','SQUARE_APPOINTMENT_INTERIOR_VARIATION_ID',
    'SQUARE_APPOINTMENT_INTERIOR_VERSION','SQUARE_WEBHOOK_URL','SQUARE_WEBHOOK_SUBSCRIPTION_ID'];
  const missing = required.filter(k => !process.env[k]);
  // A complete env list does not prove Square can create a real booking after payment.
  // Only enable customer checkout after a verified, production-safe end-to-end cutover.
  if (process.env.SQUARE_BOOKING_LAUNCH_APPROVED !== 'true') missing.push('SQUARE_BOOKING_LAUNCH_APPROVED');
  return json(missing.length ? 503 : 200,
    { ready: missing.length === 0, missing, mode:missing.length?'request':'paid', note:missing.length?'Appointment requests only. Deposits disabled until Square write permissions are verified.':'Payment configuration enabled; monitor webhook confirmations.' }, null);
}
