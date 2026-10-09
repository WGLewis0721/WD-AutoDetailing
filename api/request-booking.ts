/* Booking request fallback while seller-level Square CreateBooking is denied by plan.
   This stores the full customer build; it never generates a payment link or pretends
   an appointment is confirmed. */
import { AGREEMENT } from '../site/src/data/agreement.js';
import { SITE } from '../site/src/data/site.js';
import { bookingCars, OrderError, priceOrder, validate, type CheckoutOrder } from '../site/src/lib/checkout.js';
import { BookingUnavailable, ensureSlot } from './_square-booking.js';
import { db, dbReady, foreignOrigin, json, log, preflight, UUID } from './_lib.js';

export const OPTIONS = preflight;
const ref = () => 'MF-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (foreignOrigin(req)) return json(403, { error: 'Origin not allowed' }, origin);
  if (!dbReady()) return json(503, { error: 'Booking requests are temporarily unavailable. Please text us.' }, origin);
  let order: CheckoutOrder;
  try { order = await req.json(); } catch { return json(400, { error: 'Invalid request' }, origin); }
  try { validate(order); }
  catch (e) { return json(400, { error: e instanceof OrderError ? e.message : 'Invalid order' }, origin); }
  const aid = String(order.agreementId ?? '');
  if (!UUID.test(aid)) return json(428, { error: 'Please accept the Service Agreement first.' }, origin);
  let agreed: {id:string}[];
  try {
    agreed = await db<{id:string}[]>('mf_agreements?id=eq.'+aid+'&decision=eq.accepted&version=eq.'+encodeURIComponent(AGREEMENT.version)+'&select=id');
  } catch {
    return json(503, { error: 'Agreement verification unavailable. Please text us.' }, origin);
  }
  if (!agreed.length) return json(428, {error: 'Please accept the Service Agreement first.'},origin);
  const base = new Date(order.date+'T12:00:00Z');
  if (Number.isNaN(base.getTime()) || base.toISOString().slice(0,10) !== order.date)
    return json(400,{error:'Invalid date'},origin);
  const localToday = new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'});
  const today = Date.parse(localToday+'T12:00:00Z');
  const days = Math.round((base.getTime()-today)/86400000);
  if (days < SITE.schedule.leadDays || days > SITE.schedule.horizonDays ||
      SITE.schedule.closedDays.includes(base.getUTCDay() as 0) ||
      order.startMin < SITE.schedule.openHour*60 ||
      order.startMin + priceOrder(order).minutes > SITE.schedule.closeHour*60)
    return json(409,{error:'Please choose a business day and start time.'},origin);
  const simple = order.cars.length===1 && order.cars[0].extraIds.length===0;
  if (simple) {
    try { await ensureSlot(order); }
    catch(e) {
      if(e instanceof BookingUnavailable) return json(e.status,{error:e.message},origin);
      return json(503,{error:'Square availability cannot be checked. Please text us.'},origin);
    }
  }
  const priced = priceOrder(order);
  const reference = ref();
  try {
    await db('mf_bookings',{ method:'POST',prefer:'return=minimal',body:{
      ref:reference, agreement_id:aid, status:'request_pending',
      customer_name:order.name.trim().slice(0,200),phone:order.phone.replace(/\D/g,''),email:order.email.trim().slice(0,254),
      street:order.street.trim().slice(0,200),city:order.city,zip:order.zip,
      notes:order.notes?.trim().slice(0,1000)||null,
      appointment_date:order.date,start_minute:order.startMin,duration_minutes:priced.minutes,
      cars:bookingCars(order),
      total_cents:priced.totalCents,deposit_cents:priced.depositCents,balance_cents:priced.balanceCents,
    }});
    log('appointment_request_received',{ref:reference,multi:!simple});
    return json(200,{ref:reference,confirmed:false,charged:false},origin);
  } catch(e) {
    log('appointment_request_save_failed',{error:String(e).slice(0,120)});
    return json(503,{error:'We could not save your request. Please text us instead.'},origin);
  }
}
