// One-time guarded live Square appointment CREATE+immediate CANCEL verification.
// No payment, customer, or messages. Restore default build command and disable flag after run.
if (process.env.MF_TEST_APPOINTMENT!=='create-cancel-once-20261009') {console.log('MF_TEST_OFF');process.exit(0)}
if(process.env.SQUARE_ENV!=='production')throw Error('Requires production env');
const base='https://connect.squareup.com/v2',token=process.env.SQUARE_ACCESS_TOKEN;
async function request(path,body){
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Square-Version':'2026-09-16','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const j=await r.json().catch(()=>({}));
  return {ok:r.ok,status:r.status,data:j,codes:(j.errors||[]).map(e=>e.code)};
}
const dates={start_at:'2026-10-14T00:00:00Z',end_at:'2026-10-24T00:00:00Z'};
const variation=process.env.SQUARE_APPOINTMENT_EXTERIOR_VARIATION_ID;
const member=process.env.SQUARE_APPOINTMENT_TEAM_MEMBER_ID;
const slots=await request('/bookings/availability/search',{query:{filter:{start_at_range:dates,location_id:process.env.SQUARE_LOCATION_ID,segment_filters:[{service_variation_id:variation,team_member_id_filter:{any:[member]}}]}}});
if(!slots.ok||!slots.data.availabilities?.length)throw Error('No available test slot HTTP='+slots.status+' '+slots.codes);
const slot=slots.data.availabilities.find(a=>Array.isArray(a.appointment_segments)&&a.appointment_segments.some(x=>x.service_variation_id===variation));
if(!slot)throw Error('No service segment');
const segment=slot.appointment_segments.find(x=>x.service_variation_id===variation);
const idempotency_key='mf-verify-create-cancel-20261009';
const test=await request('/bookings',{idempotency_key,booking:{start_at:slot.start_at,location_id:process.env.SQUARE_LOCATION_ID,seller_note:'API INTEGRATION TEST—CANCEL IMMEDIATELY; not a customer booking',appointment_segments:[{duration_minutes:60,team_member_id:member,service_variation_id:variation,service_variation_version:Number(process.env.SQUARE_APPOINTMENT_EXTERIOR_VERSION)}]}});
console.log('MF_CREATE_BOOKING HTTP='+test.status+' codes='+test.codes.join(',')+' hasId='+!!test.data.booking?.id);
if(!test.ok||!test.data.booking?.id)process.exit(0);
const b=test.data.booking;
const cancel=await request('/bookings/'+encodeURIComponent(b.id)+'/cancel',{idempotency_key:'mf-verify-cancel-20261009',booking_version:b.version});
console.log('MF_CANCEL_BOOKING HTTP='+cancel.status+' codes='+cancel.codes.join(',')+' status='+(cancel.data.booking?.status||'unknown')+' id='+b.id);
if(!cancel.ok||!cancel.data.booking?.status?.startsWith('CANCELLED'))throw Error('TEST_BOOKING_REQUIRES_MANUAL_CANCELLATION id='+b.id);
