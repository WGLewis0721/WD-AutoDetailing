/* Records the customer's answer to the Service Agreement & Waiver before online booking starts.

   POST /api/agreement  { decision: 'accepted' | 'declined', version, clausesHash, acceptedAt, pageUrl }
     -> 200 { id }        stored in mf_agreements with the server-side IP and user agent
     -> 409 { error }     the page showed an older agreement (version or text fingerprint differs)
     -> 400 / 503         bad request / database not configured

   Together the fields are the ESIGN/UETA evidence AGT records: intent (decision), when (acceptedAt and the
   server's recorded_at), what (version + SHA-256 of the exact clauses) and who (IP + user agent). */
import { AGREEMENT, agreementHash } from '../site/src/data/agreement.js';
import { clientIp, db, dbReady, foreignOrigin, json, log, preflight } from './_lib.js';

export const OPTIONS = preflight;

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (foreignOrigin(req)) return json(403, { error: 'Origin not allowed' }, origin);
  if (!dbReady()) { log('agreement_db_not_configured'); return json(503, { error: 'Booking is not set up yet' }, origin); }

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }, origin); }
  const decision = b.decision;
  if (decision !== 'accepted' && decision !== 'declined') return json(400, { error: 'decision must be accepted or declined' }, origin);
  const at = new Date(String(b.acceptedAt ?? ''));
  if (Number.isNaN(at.getTime()) || Math.abs(Date.now() - at.getTime()) > 24 * 3600e3) return json(400, { error: 'Invalid acceptedAt' }, origin);
  if (b.version !== AGREEMENT.version || b.clausesHash !== (await agreementHash())) {
    log('agreement_stale', { version: b.version });
    return json(409, { error: 'The agreement has been updated. Please review it again.', version: AGREEMENT.version }, origin);
  }

  const [row] = await db<{ id: string }[]>('mf_agreements', {
    method: 'POST', prefer: 'return=representation',
    body: {
      decision, version: AGREEMENT.version, clauses_hash: b.clausesHash, accepted_at: at.toISOString(),
      ip: clientIp(req), user_agent: (req.headers.get('user-agent') ?? '').slice(0, 500) || null,
      page_url: String(b.pageUrl ?? '').slice(0, 500) || null,
    },
  });
  log('agreement_recorded', { id: row.id, decision });
  return json(200, { id: row.id }, origin);
}
