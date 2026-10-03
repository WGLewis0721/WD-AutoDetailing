import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://wglewis0721.github.io';
const order = {
  cars: [{ year: '2022', make: 'Toyota', model: 'Camry', packageId: 'deluxe', extraIds: ['decon'] }],
  date: '2026-10-10', startMin: 600, name: 'Jordan Smith', phone: '3345550123', email: 'j@example.com',
  street: '12 Oak St', city: 'Montgomery', zip: '36104',
};
const post = (body: unknown, origin = ORIGIN) =>
  new Request('https://checkout.example/api/create-checkout', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('../../../api/create-checkout');
}

describe('checkout function', () => {
  beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('answers CORS preflight for the site only', async () => {
    const { OPTIONS } = await load({});
    const r = OPTIONS(new Request('https://x/api', { method: 'OPTIONS', headers: { origin: ORIGIN } }));
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('refuses other origins', async () => {
    const { POST } = await load({ SQUARE_ACCESS_TOKEN: 't', SQUARE_LOCATION_ID: 'L' });
    expect((await POST(post(order, 'https://evil.example'))).status).toBe(403);
  });

  it('says so plainly when Square is not configured', async () => {
    const { POST } = await load({ SQUARE_ACCESS_TOKEN: '', SQUARE_LOCATION_ID: '' });
    expect((await POST(post(order))).status).toBe(503);
  });

  it('rejects a bad order before calling Square', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await load({ SQUARE_ACCESS_TOKEN: 't', SQUARE_LOCATION_ID: 'L' });
    const r = await POST(post({ ...order, cars: [{ ...order.cars[0], packageId: 'free' }] }));
    expect(r.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates an itemised sandbox payment link and returns its URL', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ payment_link: { url: 'https://sandbox.square.link/u/abc', order_id: 'O1' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await load({ SQUARE_ACCESS_TOKEN: 'tok', SQUARE_LOCATION_ID: 'LOC' });
    const r = await POST(post(order));
    expect(r.status).toBe(200);
    const out = await r.json();
    expect(out.url).toBe('https://sandbox.square.link/u/abc');
    expect(out.ref).toMatch(/^MF-[0-9A-F]{8}$/);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://connect.squareupsandbox.com/v2/online-checkout/payment-links');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const sent = JSON.parse(String(init.body));
    expect(sent.order.location_id).toBe('LOC');
    expect(sent.order.line_items.map((l: { catalog_object_id: string }) => l.catalog_object_id)).toEqual(['FTS5EPOWPWUIMLQC5EP2UIXJ', 'ME7R5HV4XSEHJ4WPTUFYWXHY']);
    expect(sent.order.line_items[0].base_price_money).toBeUndefined();
    expect(sent.idempotency_key).toBe(out.ref);
  });

  it('uses production Square only when asked', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ payment_link: { url: 'u' } })));
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await load({ SQUARE_ACCESS_TOKEN: 't', SQUARE_LOCATION_ID: 'L', SQUARE_ENV: 'production' });
    await POST(post(order));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/^https:\/\/connect\.squareup\.com\//);
  });

  it('turns a Square error into a 502 without leaking details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ errors: [{ code: 'UNAUTHORIZED' }] }), { status: 401 })));
    const { POST } = await load({ SQUARE_ACCESS_TOKEN: 'bad', SQUARE_LOCATION_ID: 'L' });
    const r = await POST(post(order));
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: 'Payment system error' });
  });
});
