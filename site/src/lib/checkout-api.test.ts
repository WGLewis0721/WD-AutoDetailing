import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGREEMENT, agreementHash } from '../data/agreement';

const ORIGIN = 'https://wglewis0721.github.io';
const AID = '0b6f3a2e-1c4d-4e5f-8a9b-0c1d2e3f4a5b';
const order = {
  agreementId: AID,
  cars: [{ year: '2022', make: 'Toyota', model: 'Camry', packageId: 'deluxe', extraIds: ['decon'] }],
  date: '2026-10-10', startMin: 600, name: 'Jordan Smith', phone: '3345550123', email: 'j@example.com',
  street: '12 Oak St', city: 'Montgomery', zip: '36104',
};
const post = (body: unknown, origin = ORIGIN, headers: Record<string, string> = {}) =>
  new Request('https://checkout.example/api/x', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

const ENV = { SQUARE_ACCESS_TOKEN: 'tok', SQUARE_LOCATION_ID: 'LOC', SUPABASE_URL: 'https://db.example', SUPABASE_SECRET_KEY: 'sb_secret_x' };

/** Fake Square + Supabase. `agreements` are the accepted ids the database knows. */
function backend({ agreements = [AID], square = { status: 200, body: { payment_link: { id: 'PL1', url: 'https://square.link/u/abc', order_id: 'O1' } } } as { status: number; body: unknown }, dbFail = false } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    if (url.startsWith('https://db.example/rest/v1/mf_agreements?')) {
      const id = /id=eq\.([^&]+)/.exec(url)?.[1];
      return new Response(JSON.stringify(agreements.includes(id!) ? [{ id }] : []), { status: 200 });
    }
    if (url === 'https://db.example/rest/v1/mf_agreements') return new Response(JSON.stringify([{ id: 'new-agreement-id' }]), { status: 201 });
    if (url === 'https://db.example/rest/v1/mf_bookings') return dbFail ? new Response('boom', { status: 500 }) : new Response('', { status: 201 });
    return new Response(JSON.stringify(square.body), { status: square.status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

async function load(mod: 'create-checkout' | 'agreement', env: Record<string, string> = ENV) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import(`../../../api/${mod}.ts`);
}

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('checkout function', () => {
  it('answers CORS preflight for the site only', async () => {
    const { OPTIONS } = await load('create-checkout');
    const r = OPTIONS(new Request('https://x/api', { method: 'OPTIONS', headers: { origin: ORIGIN } }));
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('refuses other origins', async () => {
    backend();
    const { POST } = await load('create-checkout');
    expect((await POST(post(order, 'https://evil.example'))).status).toBe(403);
  });

  it('says so plainly when Square or the database is not configured', async () => {
    const { POST } = await load('create-checkout', { ...ENV, SUPABASE_SECRET_KEY: '' });
    expect((await POST(post(order))).status).toBe(503);
  });

  it('will not start checkout without an accepted agreement', async () => {
    const { calls } = backend({ agreements: [] });
    const { POST } = await load('create-checkout');
    const r = await POST(post(order));
    expect(r.status).toBe(428);
    expect((await r.json()).agreement).toBe(true);
    expect(calls.some((c) => c.url.includes('squareup'))).toBe(false);
    expect((await POST(post({ ...order, agreementId: 'not-a-uuid' }))).status).toBe(428);
  });

  it('rejects a bad order before calling Square', async () => {
    const { calls } = backend();
    const { POST } = await load('create-checkout');
    const r = await POST(post({ ...order, cars: [{ ...order.cars[0], packageId: 'free' }] }));
    expect(r.status).toBe(400);
    expect(calls.some((c) => c.url.includes('squareup'))).toBe(false);
  });

  it('creates an itemised payment link and saves the whole build with the agreement', async () => {
    const { calls } = backend();
    const { POST } = await load('create-checkout');
    const r = await POST(post({ ...order, notes: 'Gate code 4321' }));
    expect(r.status).toBe(200);
    const out = await r.json();
    expect(out.url).toBe('https://square.link/u/abc');
    expect(out.ref).toMatch(/^MF-[0-9A-F]{8}$/);

    const sq = calls.find((c) => c.url.includes('squareupsandbox'))!;
    expect((sq.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const sent = JSON.parse(String(sq.init.body));
    expect(sent.order.line_items.map((l: { catalog_object_id: string }) => l.catalog_object_id)).toEqual(['FTS5EPOWPWUIMLQC5EP2UIXJ', 'ME7R5HV4XSEHJ4WPTUFYWXHY']);
    expect(sent.payment_note).toContain(`Agreed: v${AGREEMENT.version} ${AID.slice(0, 8)}`);

    const save = calls.find((c) => c.url === 'https://db.example/rest/v1/mf_bookings')!;
    expect((save.init.headers as Record<string, string>).apikey).toBe('sb_secret_x');
    const row = JSON.parse(String(save.init.body));
    expect(row).toMatchObject({
      ref: out.ref, agreement_id: AID, customer_name: 'Jordan Smith', phone: '3345550123', city: 'Montgomery', notes: 'Gate code 4321',
      appointment_date: '2026-10-10', start_minute: 600, total_cents: 24000, deposit_cents: 4800, balance_cents: 19200,
      square_payment_link_id: 'PL1', square_order_id: 'O1', square_checkout_url: 'https://square.link/u/abc',
    });
    expect(row.cars[0]).toMatchObject({ car: 1, vehicle: '2022 Toyota Camry', make: 'Toyota', size: 'sedan', packageId: 'deluxe', extraIds: ['decon'], totalCents: 24000 });
  });

  it('still sends the customer to Square if saving the build fails', async () => {
    backend({ dbFail: true });
    const { POST } = await load('create-checkout');
    const r = await POST(post(order));
    expect(r.status).toBe(200);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('booking_save_failed'));
  });

  it('uses production Square only when asked', async () => {
    const { calls } = backend();
    const { POST } = await load('create-checkout', { ...ENV, SQUARE_ENV: 'production' });
    await POST(post(order));
    expect(calls.some((c) => c.url.startsWith('https://connect.squareup.com/'))).toBe(true);
  });

  it('turns a Square error into a 502 without leaking details', async () => {
    backend({ square: { status: 401, body: { errors: [{ code: 'UNAUTHORIZED' }] } } });
    const { POST } = await load('create-checkout');
    const r = await POST(post(order));
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: 'Payment system error' });
  });
});

describe('agreement function', () => {
  const answer = async (patch: Record<string, unknown> = {}) => ({
    decision: 'accepted', version: AGREEMENT.version, clausesHash: await agreementHash(), acceptedAt: new Date().toISOString(), pageUrl: 'https://site/book/', ...patch,
  });

  it('records an acceptance with the server-side IP and user agent', async () => {
    const { calls } = backend();
    const { POST } = await load('agreement');
    const r = await POST(post(await answer(), ORIGIN, { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'user-agent': 'Mozilla/5.0 Test' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ id: 'new-agreement-id' });
    const row = JSON.parse(String(calls[0].init.body));
    expect(row).toMatchObject({ decision: 'accepted', version: AGREEMENT.version, ip: '203.0.113.9', user_agent: 'Mozilla/5.0 Test', page_url: 'https://site/book/' });
    expect(row.clauses_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('records a decline too', async () => {
    const { calls } = backend();
    const { POST } = await load('agreement');
    expect((await POST(post(await answer({ decision: 'declined' })))).status).toBe(200);
    expect(JSON.parse(String(calls[0].init.body)).decision).toBe('declined');
  });

  it('refuses answers to an older or altered agreement', async () => {
    backend();
    const { POST } = await load('agreement');
    expect((await POST(post(await answer({ version: '0.9.0' })))).status).toBe(409);
    expect((await POST(post(await answer({ clausesHash: 'a'.repeat(64) })))).status).toBe(409);
  });

  it('validates the request', async () => {
    backend();
    const { POST } = await load('agreement');
    expect((await POST(post(await answer({ decision: 'maybe' })))).status).toBe(400);
    expect((await POST(post(await answer({ acceptedAt: 'yesterday' })))).status).toBe(400);
    expect((await POST(post(await answer(), 'https://evil.example'))).status).toBe(403);
  });
});

describe('agreement text', () => {
  it('has AGT’s seven clauses and a stable fingerprint', async () => {
    expect(AGREEMENT.clauses).toHaveLength(7);
    expect(await agreementHash()).toBe(await agreementHash());
    expect(await agreementHash()).not.toBe(await agreementHash({ ...AGREEMENT, clauses: [...AGREEMENT.clauses.slice(0, 6), 'changed'] }));
  });
});
