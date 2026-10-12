import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { AGREEMENT } from '../data/agreement';

const aid='0b6f3a2e-1c4d-4e5f-8a9b-0c1d2e3f4a5b';
const order={
 agreementId:aid,
 cars:[{year:'2022',make:'Toyota',model:'Camry',packageId:'deluxe',extraIds:[]}],
 date:'2026-10-14',startMin:600,name:'Jordan Smith',phone:'3345550123',email:'j@example.com',
 street:'12 Oak St',city:'Montgomery',zip:'36104',
};
const post=(payload:unknown)=>new Request('https://checkout.example/api/request-booking',{
 method:'POST',headers:{origin:'https://wglewis0721.github.io','content-type':'application/json'},
 body:JSON.stringify(payload),
});
beforeEach(()=>{
 vi.useFakeTimers();
 vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
 vi.resetModules();
 Object.entries({
  SQUARE_ENV:'production',SQUARE_ACCESS_TOKEN:'test-token',SQUARE_LOCATION_ID:'LOC',
  SQUARE_APPOINTMENT_TEAM_MEMBER_ID:'TM',SQUARE_APPOINTMENT_DELUXE_VARIATION_ID:'VAR',
  SQUARE_APPOINTMENT_DELUXE_VERSION:'123',
  SUPABASE_URL:'https://db.example',SUPABASE_SECRET_KEY:'sb_secret_test',
 }).forEach(([key,value])=>vi.stubEnv(key,value));
 vi.spyOn(console,'log').mockImplementation(()=>{});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('on-site appointment requests',()=>{
 it('records agreement-backed, real Square-available time with no payment link or charge',async()=>{
  const calls:{url:string;init:RequestInit}[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit={})=>{
   calls.push({url,init});
   if(url.includes('mf_agreements?id=eq.'))return new Response(JSON.stringify([{id:aid}]),{status:200});
   if(url.endsWith('/v2/bookings/availability/search'))return new Response(JSON.stringify({availabilities:[{start_at:'2026-10-14T15:00:00Z'}]}),{status:200});
   if(url.endsWith('/rest/v1/mf_bookings'))return new Response('',{status:201});
   throw Error('Unexpected call '+url);
  }));
  const {POST}=await import('../../../api/request-booking.ts');
  const response=await POST(post(order));
  expect(response.status).toBe(200);
  const data=await response.json();
  expect(data).toMatchObject({confirmed:false,charged:false,totalCents:20000,depositCents:4000,balanceCents:16000});
  const calendarLink=new URL(data.calendarUrl);
  expect(calendarLink.pathname).toBe('/api/calendar-request');
  expect(calendarLink.searchParams.get('ref')).toBe(data.ref);
  expect(calendarLink.searchParams.get('sig')).toMatch(/^[a-f0-9]{64}$/);
  expect(data.calendarUrl).not.toContain(order.email);
  expect(data.calendarUrl).not.toContain(order.phone);
  expect(data.ref).toMatch(/^MF-[A-Z0-9]{8}$/);
  const save=calls.find(c=>c.url.endsWith('/rest/v1/mf_bookings'))!;
  const row=JSON.parse(String(save.init.body));
  expect(row).toMatchObject({status:'request_pending',agreement_id:aid,total_cents:20000,deposit_cents:4000,appointment_date:'2026-10-14',start_minute:600});
  expect(calls.some(c=>/\/payments|\/payment-links|\/v2\/bookings$/.test(c.url))).toBe(false);
 });
 it('does not create requests without accepted agreement',async()=>{
  const calls:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
   calls.push(url);
   return new Response('[]',{status:200});
  }));
  const {POST}=await import('../../../api/request-booking.ts');
  expect((await POST(post(order))).status).toBe(428);
  expect(calls.some(x=>x.endsWith('/mf_bookings'))).toBe(false);
 });
 it('does not offer a nonexistent Square slot as a confirmed request',async()=>{
  const calls:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
   calls.push(url);
   if(url.includes('mf_agreements?'))return new Response(JSON.stringify([{id:aid}]),{status:200});
   return new Response(JSON.stringify({availabilities:[]}),{status:200});
  }));
  const {POST}=await import('../../../api/request-booking.ts');
  expect((await POST(post(order))).status).toBe(409);
  expect(calls.some(x=>x.endsWith('/mf_bookings'))).toBe(false);
 });
});
