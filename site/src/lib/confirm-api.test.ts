import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://wglewis0721.github.io';
const ENV = {
  SQUARE_ACCESS_TOKEN: 'tok', SQUARE_LOCATION_ID: 'LOC', SUPABASE_URL: 'https://db.example', SUPABASE_SECRET_KEY: 'sb_secret_x',
  SQUARE_WEBHOOK_SIGNATURE_KEY: 'whsec',
};

type Row = Record<string, any>;
const bookingRow = (over: Row = {}): Row => ({
  ref: 'MF-0A1B2C3D', customer_name: 'Jordan Smith', phone: '3345550123', email: 'j@example.com', street: '12 Oak St', city: 'Montgomery', zip: '36104', notes: null,
  appointment_date: '2026-10-10', start_minute: 600, duration_minutes: 150,
  cars: [{ car: 1, vehicle: '2022 Toyota Camry', size: 'sedan', packageId: 'deluxe', extraIds: ['decon'], totalCents: 24000, minutes: 150 }],
  total_cents: 24000, deposit_cents: 4800, balance_cents: 19200, square_order_id: 'ORD1',
  payment_status: 'pending', paid_at: null, calendar_status: 'pending', calendar_attempts: 0, calendar_error: null, square_booking_id: null, ...over,
});
const paidOrder = { state: 'COMPLETED', total_money: { amount: 4800 }, net_amount_due_money: { amount: 0 }, tenders: [{ id: 'PAY1', payment_id: 'PAY1' }] };
const unpaidOrder = { state: 'DRAFT', total_money: { amount: 4800 }, net_amount_due_money: { amount: 4800 } };

/** A PostgREST filter such as ref=eq.X, calendar_status=in.(pending,failed), calendar_attempts=lt.20. */
function matches(r: Row, q: URLSearchParams) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const [op, ...rest] = v.split('.'); const val = rest.join('.');
    if (op === 'eq' && String(r[k]) !== val) return false;
    if (op === 'neq' && String(r[k]) === val) return false;
    if (op === 'lt' && !(Number(r[k]) < Number(val))) return false;
    if (op === 'in' && !val.slice(1, -1).split(',').includes(String(r[k]))) return false;
  }
  return true;
}

function backend(opts: { rows?: Row[]; order?: unknown; bookingResult?: { status: number; body: unknown }; bookingResults?: { status: number; body: unknown }[] } = {}) {
  const rows = opts.rows ?? [bookingRow()];
  const calls: { url: string; init: RequestInit }[] = [];
  const bookingResults = [...(opts.bookingResults ?? [opts.bookingResult ?? { status: 200, body: { booking: { id: 'BK1' } } }])];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if (url.startsWith('https://db.example/rest/v1/mf_bookings')) {
      const q = new URL(url).searchParams;
      const hit = rows.filter((r) => matches(r, q));
      if (init.method === 'PATCH') { for (const r of hit) Object.assign(r, JSON.parse(String(init.body))); return new Response(null, { status: 204 }); }
      return json(200, hit.map((r) => ({ ...r })));
    }
    if (url.includes('/v2/orders/')) return json(200, { order: opts.order ?? paidOrder });
    if (url.includes('/v2/bookings/team-member-profiles')) return json(200, { team_member_booking_profiles: [{ team_member_id: 'TM1', is_bookable: true }] });
    if (url.endsWith('/v2/catalog/batch-retrieve')) return json(200, { objects: [{ id: 'FTS5EPOWPWUIMLQC5EP2UIXJ', version: 111 }] });
    if (url.endsWith('/v2/customers/search')) return json(200, {});
    if (url.endsWith('/v2/customers')) return json(200, { customer: { id: 'CUST1' } });
    if (url.endsWith('/v2/bookings')) { const r = bookingResults.length > 1 ? bookingResults.shift()! : bookingResults[0]; return json(r.status, r.body); }
    return json(404, {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return { rows, calls, squareBookingCalls: () => calls.filter((c) => c.url.endsWith('/v2/bookings')) };
}

async function load(mod: 'confirm' | 'square-webhook', env: Record<string, string> = ENV) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import(`../../../api/${mod}.ts`);
}
const post = (body: unknown, origin = ORIGIN) =>
  new Request('https://checkout.example/api/confirm', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const SUBSCRIPTION = { status: 403, body: { errors: [{ code: 'FORBIDDEN', detail: 'Merchant subscription does not support write operations.' }] } };

describe('confirm: deposit paid, appointment on the calendar', () => {
  it('does nothing until Square says the order is paid', async () => {
    const { rows, squareBookingCalls } = backend({ order: unpaidOrder });
    const { POST } = await load('confirm');
    const r = await POST(post({ ref: 'MF-0A1B2C3D' }));
    expect(await r.json()).toEqual({ paid: false, calendar: 'none' });
    expect(rows[0].payment_status).toBe('pending');
    expect(squareBookingCalls()).toHaveLength(0);
  });

  it('does not trust a paid order for a different amount than the quoted deposit', async () => {
    const { rows } = backend({ order: { ...paidOrder, total_money: { amount: 100 } } });
    const { POST } = await load('confirm');
    expect((await (await POST(post({ ref: 'MF-0A1B2C3D' }))).json()).paid).toBe(false);
    expect(rows[0].payment_status).toBe('pending');
  });

  it('marks the booking paid and creates the Square appointment', async () => {
    const { rows, squareBookingCalls } = backend();
    const { POST } = await load('confirm');
    const r = await POST(post({ ref: 'MF-0A1B2C3D' }));
    expect(await r.json()).toEqual({ paid: true, calendar: 'booked' });
    expect(rows[0]).toMatchObject({ payment_status: 'paid', square_payment_id: 'PAY1', calendar_status: 'booked', square_booking_id: 'BK1', calendar_attempts: 1, calendar_error: null });
    const sent = JSON.parse(String(squareBookingCalls()[0].init.body));
    expect(sent.idempotency_key).toBe('mf-booking-MF-0A1B2C3D');
    expect(sent.booking).toMatchObject({ location_id: 'LOC', customer_id: 'CUST1', start_at: '2026-10-10T15:00:00.000Z' });
    expect(sent.booking.appointment_segments).toEqual([{ duration_minutes: 150, service_variation_id: 'FTS5EPOWPWUIMLQC5EP2UIXJ', service_variation_version: 111, team_member_id: 'TM1' }]);
  });

  it('is safe to run twice: the second call books nothing new', async () => {
    const { squareBookingCalls } = backend();
    const { POST } = await load('confirm');
    await POST(post({ ref: 'MF-0A1B2C3D' }));
    expect(await (await POST(post({ ref: 'MF-0A1B2C3D' }))).json()).toEqual({ paid: true, calendar: 'booked' });
    expect(squareBookingCalls()).toHaveLength(1);
  });

  it('keeps the paid booking and records why when the Square plan does not allow API appointments', async () => {
    const { rows } = backend({ bookingResult: SUBSCRIPTION });
    const { POST } = await load('confirm');
    const r = await POST(post({ ref: 'MF-0A1B2C3D' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ paid: true, calendar: 'failed' });
    expect(rows[0]).toMatchObject({ payment_status: 'paid', calendar_status: 'failed', calendar_attempts: 1 });
    expect(rows[0].calendar_error).toContain('Merchant subscription does not support write operations');
  });

  it('retries without the customer address when Square rejects the location type', async () => {
    const { squareBookingCalls } = backend({
      bookingResults: [{ status: 400, body: { errors: [{ code: 'INVALID_VALUE', detail: 'location_type CUSTOMER_LOCATION is not enabled' }] } }, { status: 200, body: { booking: { id: 'BK2' } } }],
    });
    const { POST } = await load('confirm');
    expect((await (await POST(post({ ref: 'MF-0A1B2C3D' }))).json()).calendar).toBe('booked');
    const [first, second] = squareBookingCalls().map((c) => JSON.parse(String(c.init.body)).booking);
    expect(first.location_type).toBe('CUSTOMER_LOCATION');
    expect(second).not.toHaveProperty('location_type');
  });

  it('catches earlier paid bookings up on the calendar once Square starts accepting them', async () => {
    const earlier = bookingRow({ ref: 'MF-AAAAAAAA', square_order_id: 'ORD0', payment_status: 'paid', paid_at: '2026-10-09T10:00:00Z', calendar_status: 'failed', calendar_attempts: 2, calendar_error: 'old' });
    const { rows } = backend({ rows: [earlier, bookingRow()] });
    const { POST } = await load('confirm');
    await POST(post({ ref: 'MF-0A1B2C3D' }));
    expect(rows[0]).toMatchObject({ ref: 'MF-AAAAAAAA', calendar_status: 'booked', calendar_error: null, calendar_attempts: 3 });
  });

  it('stops retrying a booking after 20 attempts', async () => {
    const stuck = bookingRow({ ref: 'MF-BBBBBBBB', square_order_id: 'ORD9', payment_status: 'paid', paid_at: '2026-10-01T10:00:00Z', calendar_status: 'failed', calendar_attempts: 20 });
    const { rows } = backend({ rows: [stuck, bookingRow()] });
    const { POST } = await load('confirm');
    await POST(post({ ref: 'MF-0A1B2C3D' }));
    expect(rows[0].calendar_status).toBe('failed');
    expect(rows[0].calendar_attempts).toBe(20);
  });

  it('validates the request', async () => {
    backend({ rows: [] });
    const { POST } = await load('confirm');
    expect((await POST(post({ ref: 'nope' }))).status).toBe(400);
    expect((await POST(post({ ref: 'MF-0A1B2C3D' }))).status).toBe(404);
    expect((await POST(post({ ref: 'MF-0A1B2C3D' }, 'https://evil.example'))).status).toBe(403);
  });

  it('says so plainly when the database is not connected', async () => {
    backend();
    const { POST } = await load('confirm', { ...ENV, SUPABASE_SECRET_KEY: '' });
    expect((await POST(post({ ref: 'MF-0A1B2C3D' }))).status).toBe(503);
  });
});

describe('square webhook', () => {
  const URL_ = 'https://checkout.example/api/square-webhook';
  const event = (over: Record<string, unknown> = {}) =>
    JSON.stringify({ type: 'payment.updated', data: { object: { payment: { id: 'PAY1', order_id: 'ORD1', status: 'COMPLETED', ...over } } } });
  async function signed(body: string, key = 'whsec') {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(URL_ + body)))));
  }
  const hook = async (body: string, sig?: string) =>
    new Request(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'x-square-hmacsha256-signature': sig ?? (await signed(body)) }, body });

  it('rejects a request that is not signed by Square', async () => {
    const { rows } = backend();
    const { POST } = await load('square-webhook');
    expect((await POST(await hook(event(), 'AAAA'))).status).toBe(403);
    expect((await POST(await hook(event(), await signed(event(), 'wrong-key')))).status).toBe(403);
    expect(rows[0].payment_status).toBe('pending');
  });

  it('finishes the booking for a completed payment', async () => {
    const { rows } = backend();
    const { POST } = await load('square-webhook');
    expect((await POST(await hook(event()))).status).toBe(200);
    expect(rows[0]).toMatchObject({ payment_status: 'paid', calendar_status: 'booked' });
  });

  it('ignores other events, unfinished payments and orders it does not know', async () => {
    const { rows, squareBookingCalls } = backend();
    const { POST } = await load('square-webhook');
    for (const body of [JSON.stringify({ type: 'order.updated', data: {} }), event({ status: 'APPROVED' }), event({ order_id: 'SOMEONE-ELSES' })]) {
      const r = await POST(await hook(body));
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ ignored: true });
    }
    expect(rows[0].payment_status).toBe('pending');
    expect(squareBookingCalls()).toHaveLength(0);
  });

  it('is off until the signature key is set', async () => {
    backend();
    const { POST } = await load('square-webhook', { ...ENV, SQUARE_WEBHOOK_SIGNATURE_KEY: '' });
    expect((await POST(await hook(event()))).status).toBe(503);
  });

  it('asks Square to retry when the work fails midway', async () => {
    backend();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const { POST } = await load('square-webhook');
    expect((await POST(await hook(event()))).status).toBe(500);
  });
});
