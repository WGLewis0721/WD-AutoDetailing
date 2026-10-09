/* Shared helpers for the Mirror Finish functions. Files starting with "_" in api/ are not deployed as routes. */

export const SITE_URL = process.env.SITE_URL || 'https://wglewis0721.github.io/WD-AutoDetailing';
export const ORIGINS = (process.env.ALLOWED_ORIGINS || new URL(SITE_URL).origin).split(',').map((o) => o.trim()).filter(Boolean);

export const cors = (origin: string | null): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});
export const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
export const preflight = (req: Request) => new Response(null, { status: 204, headers: cors(req.headers.get('origin')) });
export const foreignOrigin = (req: Request) => { const o = req.headers.get('origin'); return !!o && !ORIGINS.includes(o); };
export const log = (event: string, detail: Record<string, unknown> = {}) => console.log(JSON.stringify({ event, ...detail }));

/** Who sent the request, as Vercel's edge saw it (the browser cannot set these). */
export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null;

/* Mirror Finish's dedicated Supabase project is required before paid online bookings are enabled.
   Server-only key: tables have RLS and no browser-access policies. Never expose this credential to clients. */
export const dbReady = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

export async function db<T = unknown>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const key = process.env.SUPABASE_SECRET_KEY!;
  const res = await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`, {
    method: init.method ?? 'GET',
    // sb_secret_* keys are opaque API keys, not JWTs. Supabase rejects them as Bearer tokens.
    headers: { apikey: key, 'Content-Type': 'application/json', ...(init.prefer ? { Prefer: init.prefer } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
