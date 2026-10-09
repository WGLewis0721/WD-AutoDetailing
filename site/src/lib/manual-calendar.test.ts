import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ref = 'MF-A1B2C3D4';
const base = 'https://mirror-finish-checkout.vercel.app';
const request = {
  ref, status: 'request_pending', customer_name: 'Jordan Smith',
  phone: '3345550123', email: 'jordan@example.org',
  street: '12 Oak Street', city: 'Montgomery', zip: '36104',
  appointment_date: '2026-10-14', start_minute: 600, duration_minutes: 120, notes: 'Gate code',
  cars: [{vehicle: '2022 Toyota Camry', packageId: 'deluxe', size:'sedan',
    lines: [{label:'Deluxe',cents:20000}]}],
  total_cents: 20000, deposit_cents: 4000, balance_cents: 16000,
};
beforeEach(()=>{
  vi.resetModules();
  vi.stubEnv('SUPABASE_URL','https://db.example');
  vi.stubEnv('SUPABASE_SECRET_KEY','sb_secret_test_hmac_signing');
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe('manual Google Calendar booking request',()=>{
  it('sends a signed private reference, not personal details or prices',async()=>{
    const {calendarRequestLink}=await import('../../../api/_calendar-request.ts');
    const u=new URL(await calendarRequestLink(ref,base+'/api/request-booking'));
    expect(u.origin).toBe(base);
    expect(u.pathname).toBe('/api/calendar-request');
    expect(u.searchParams.get('ref')).toBe(ref);
    expect(u.searchParams.get('sig')).toMatch(/^[a-f0-9]{64}$/);
    expect(u.href).not.toContain('Jordan');
    expect(u.href).not.toContain('20000');
  });

  it('opens a pending Google Calendar draft with full order, prices and Chicago time, without writing to Google or Square',async()=>{
    const {calendarRequestLink}=await import('../../../api/_calendar-request.ts');
    const url=await calendarRequestLink(ref,base+'/api/request-booking');
    const calls:{url:string;method:string}[]=[];
    vi.stubGlobal('fetch',vi.fn(async(url:string,opts?:RequestInit)=>{
      calls.push({url,method:opts?.method||'GET'});
      if(url.includes('mf_bookings?ref='))return new Response(JSON.stringify([request]),{status:200});
      throw Error('Unexpected external call '+url);
    }));
    const {GET}=await import('../../../api/calendar-request.ts');
    const res=await GET(new Request(url));
    expect(res.status).toBe(303);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const loc=new URL(res.headers.get('location')!);
    expect(loc.origin).toBe('https://calendar.google.com');
    expect(loc.searchParams.get('action')).toBe('TEMPLATE');
    expect(loc.searchParams.get('dates')).toBe('20261014T150000Z/20261014T170000Z');
    expect(loc.searchParams.get('stz')).toBe('America/Chicago');
    expect(loc.searchParams.get('text')).toContain('PENDING');
    expect(loc.searchParams.get('details')).toContain('Deposit due after confirmation (20%): $40.00');
    expect(loc.searchParams.get('details')).toContain('Remaining balance after detailing: $160.00');
    expect(loc.searchParams.get('details')).toContain('2022 Toyota Camry');
    expect(loc.searchParams.get('location')).toContain('12 Oak Street');
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('GET');
  });

  it('uses the correct Central Standard Time offset for winter requests',async()=>{
    const {googleCalendarDraft}=await import('../../../api/_calendar-request.ts');
    const winter=new URL(googleCalendarDraft({
      ...request,appointment_date:'2026-11-10', start_minute:600,
    }));
    expect(winter.searchParams.get('dates')).toBe('20261110T160000Z/20261110T180000Z');
    expect(winter.searchParams.get('etz')).toBe('America/Chicago');
  });

  it('rejects forged and tampered URLs before accessing customer data',async()=>{
    const {calendarRequestLink}=await import('../../../api/_calendar-request.ts');
    const url=new URL(await calendarRequestLink(ref,base+'/api/request-booking'));
    url.searchParams.set('ref','MF-DEADBEEF');
    const fetchMock=vi.fn();
    vi.stubGlobal('fetch',fetchMock);
    const {GET}=await import('../../../api/calendar-request.ts');
    expect((await GET(new Request(url.toString()))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
