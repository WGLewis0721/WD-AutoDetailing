import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = {
  SQUARE_ENV: 'sandbox', SQUARE_ACCESS_TOKEN: 'tok', SQUARE_LOCATION_ID: 'LOC',
  SUPABASE_URL: 'https://db.example', SUPABASE_SECRET_KEY: 'sb_secret_example',
  SQUARE_APPOINTMENT_TEAM_MEMBER_ID: 'TM1', SQUARE_APPOINTMENT_DELUXE_VARIATION_ID: 'SERVICE1',
  SQUARE_APPOINTMENT_DELUXE_VERSION: '1234567',
  SQUARE_WEBHOOK_SIGNATURE_KEY: 'test-signature-key',
  SQUARE_WEBHOOK_URL: 'https://checkout.example/api/square-webhook',
};
beforeEach(() => {
  vi.resetModules();
  Object.entries(env).forEach(([key,value])=>vi.stubEnv(key,value));
  vi.spyOn(console,'log').mockImplementation(()=>{});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Square real availability', () => {
  it('returns only slots actually supplied by Square, mapped to Montgomery time', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch',vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ availabilities: [
        { start_at: '2026-10-10T15:00:00Z' },
        { start_at: '2026-10-11T15:00:00Z' },
        { start_at: '2026-10-10T23:00:00Z' },
      ] }), { status: 200 });
    }));
    const { squareSlots, slotIso } = await import('../../../api/_square-booking.ts');
    expect(await squareSlots('2026-10-10','deluxe')).toEqual([600]);
    expect(slotIso('2026-10-10',600)).toBe('2026-10-10T15:00:00.000Z');
    expect(slotIso('2026-12-10',600)).toBe('2026-12-10T16:00:00.000Z');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/v2/bookings/availability/search');
  });
  it('never invents slots if Square denies access', async () => {
    vi.stubGlobal('fetch',vi.fn(async ()=>new Response('{}',{status:403})));
    const { squareSlots } = await import('../../../api/_square-booking.ts');
    await expect(squareSlots('2026-10-10','deluxe')).rejects.toThrow('cannot be verified');
  });
});

describe('Square payment webhook', () => {
  const row = {
    ref: 'MF-ABCDEF12', status: 'checkout_created', square_booking_id: null, square_order_id: 'O1',
    customer_name: 'Jordan Smith', phone: '3345550123', email: 'j@example.com',
    street: '12 Oak Street', city: 'Montgomery', zip: '36104',
    appointment_date: '2026-10-10', start_minute: 600, duration_minutes: 120,
    deposit_cents: 4000, cars: [{ packageId:'deluxe', extraIds: [] }],
  };
  const event = JSON.stringify({
    type: 'payment.updated', data: { object: { payment: {
      status:'COMPLETED', order_id:'O1', location_id:'LOC',
      amount_money: { currency:'USD', amount:4000 },
    } } },
  });
  const req = async (raw: string, signatureKey = env.SQUARE_WEBHOOK_SIGNATURE_KEY) => {
    const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(signatureKey),
      { name:'HMAC', hash:'SHA-256' },false,['sign']);
    const sig = await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(env.SQUARE_WEBHOOK_URL+raw));
    const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return new Request(env.SQUARE_WEBHOOK_URL,{
      method:'POST',body:raw,headers:{ 'x-square-hmacsha256-signature':b64 },
    });
  };
  it('rejects an event signed by a different key before changing records',async () => {
    const fetchMock=vi.fn();
    vi.stubGlobal('fetch',fetchMock);
    const { POST } = await import('../../../api/square-webhook.ts');
    expect((await POST(await req(event,'imposter'))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('creates one idempotent Square appointment only after a verified completed deposit',async () => {
    const calls: {url:string;init:RequestInit}[]=[];
    vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit={})=>{
      calls.push({url,init});
      if(url.includes('?square_order_id=eq.O1')) return new Response(JSON.stringify([row]),{status:200});
      if(url.endsWith('/v2/customers')) return new Response(JSON.stringify({customer:{id:'C1'}}),{status:200});
      if(url.endsWith('/v2/bookings')) return new Response(JSON.stringify({booking:{id:'B1'}}),{status:200});
      if(url.includes('mf_bookings?ref=eq.')) return new Response(null,{status:204});
      throw Error('Unexpected request '+url);
    }));
    const { POST } = await import('../../../api/square-webhook.ts');
    expect((await POST(await req(event))).status).toBe(200);
    const booking = calls.find(x=>x.url.endsWith('/v2/bookings'));
    expect(booking).toBeDefined();
    const sent=JSON.parse(String(booking!.init.body));
    expect(sent.idempotency_key).toBe('mf-appointment-MF-ABCDEF12');
    expect(sent.booking.start_at).toBe('2026-10-10T15:00:00.000Z');
    expect(sent.booking.appointment_segments[0].service_variation_id).toBe('SERVICE1');
    expect(calls.filter(x=>x.url.includes('mf_bookings?ref=eq.'))).toHaveLength(2);
    expect(JSON.parse(String(calls.at(-1)!.init.body))).toMatchObject({
      status:'confirmed',square_booking_id:'B1',
    });
  });
});
