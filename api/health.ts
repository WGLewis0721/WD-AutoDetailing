/* Non-secret operational readiness. Returns 503 unless the backend is actually configured. */
import { json } from './_lib.js';
export async function GET() {
  const required = ['SUPABASE_URL','SUPABASE_SECRET_KEY','SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID',
    'SQUARE_APPOINTMENT_TEAM_MEMBER_ID','SQUARE_APPOINTMENT_DELUXE_VARIATION_ID',
    'SQUARE_APPOINTMENT_DELUXE_VERSION','SQUARE_APPOINTMENT_EXTERIOR_VARIATION_ID',
    'SQUARE_APPOINTMENT_EXTERIOR_VERSION','SQUARE_APPOINTMENT_INTERIOR_VARIATION_ID',
    'SQUARE_APPOINTMENT_INTERIOR_VERSION','SQUARE_WEBHOOK_SIGNATURE_KEY','SQUARE_WEBHOOK_URL'];
  const missing = required.filter(k => !process.env[k]);
  return json(missing.length ? 503 : 200,
    { ready: missing.length === 0, missing, note: 'Configuration only; a live Square entitlement and end-to-end test are still required.' }, null);
}
