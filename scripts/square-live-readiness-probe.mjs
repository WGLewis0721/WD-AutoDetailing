// One-time read-only production Square readiness probe. No payment or booking is created.
if(process.env.SQUARE_LAUNCH_PROBE!=='mirror-finish-readonly-probe-20261009'){console.log('MF_PROBE_SKIPPED');process.exit(0)}
const need=['SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID','SQUARE_WEBHOOK_URL','SQUARE_APPOINTMENT_TEAM_MEMBER_ID'];
for(const k of need)if(!process.env[k])throw Error('MF_PROBE_MISSING_'+k);
if(process.env.SQUARE_ENV!=='production')throw Error('MF_PROBE_NOT_PRODUCTION');
const version='2026-09-16', base='https://connect.squareup.com';
async function call(route,body){
 const r=await fetch(base+'/v2'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.SQUARE_ACCESS_TOKEN,'Square-Version':version,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const b=await r.json().catch(()=>({}));
 return {status:r.status,ok:r.ok,errors:(b.errors||[]).map(e=>e.code),data:b};
}
const services=['DELUXE','EXTERIOR','INTERIOR'],minutes={DELUXE:120,EXTERIOR:60,INTERIOR:60};
for(const name of services){
 const id=process.env['SQUARE_APPOINTMENT_'+name+'_VARIATION_ID'];
 const version=Number(process.env['SQUARE_APPOINTMENT_'+name+'_VERSION']);
 const o=await call('/catalog/object/'+id);
 const x=o.data.object?.item_variation_data;
 const correct=o.ok&&o.data.object?.version===version&&x?.service_duration===minutes[name]*60000&&x?.team_member_ids?.includes(process.env.SQUARE_APPOINTMENT_TEAM_MEMBER_ID)&&x?.available_for_booking===true;
 console.log('MF_SERVICE '+name+' '+(correct?'OK':'FAIL')+' HTTP='+o.status+' errors='+o.errors.join(','));
}
const profile=await call('/bookings/business-booking-profile');
console.log('MF_PROFILE HTTP='+profile.status+' errors='+profile.errors.join(',')+' data='+JSON.stringify({seller_level:profile.data.business_booking_profile?.seller_level,booking_enabled:profile.data.business_booking_profile?.booking_enabled}));
const members=await call('/bookings/team-member-booking-profiles');
console.log('MF_TEAM HTTP='+members.status+' errors='+members.errors.join(',')+' matching='+(members.data.team_member_booking_profiles||[]).some(t=>t.team_member_id===process.env.SQUARE_APPOINTMENT_TEAM_MEMBER_ID&&t.is_bookable));
const w=await call('/webhooks/subscriptions');
const sub=(w.data.subscriptions||[]).find(x=>x.notification_url===process.env.SQUARE_WEBHOOK_URL&&x.enabled&&x.event_types?.includes('payment.created')&&x.event_types?.includes('payment.updated'));
console.log('MF_WEBHOOK HTTP='+w.status+' subscription='+!!sub+' liveKeyPresent='+Boolean(sub?.signature_key)+' keyMatchesOld='+(Boolean(sub?.signature_key)&&sub.signature_key===process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)+' errors='+w.errors.join(','));
if(sub?.id){const detail=await call('/webhooks/subscriptions/'+encodeURIComponent(process.env.SQUARE_WEBHOOK_SUBSCRIPTION_ID||sub.id));console.log('MF_WEBHOOK_DETAIL HTTP='+detail.status+' activeKeyPresent='+Boolean(detail.data.subscription?.signature_key)+' matchesVercelKey='+(Boolean(detail.data.subscription?.signature_key)&&detail.data.subscription.signature_key===process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)+' errors='+detail.errors.join(','));}
const loc=process.env.SQUARE_LOCATION_ID,team=process.env.SQUARE_APPOINTMENT_TEAM_MEMBER_ID;
const locProfile=await call('/bookings/location-booking-profiles/'+loc);
console.log('MF_LOCATION_PROFILE HTTP='+locProfile.status+' onlineBookingEnabled='+locProfile.data.location_booking_profile?.online_booking_enabled+' errors='+locProfile.errors.join(','));
const actualLocation=await call('/locations/'+loc);
console.log('MF_LOCATION HTTP='+actualLocation.status+' status='+actualLocation.data.location?.status+' timezone='+actualLocation.data.location?.timezone+' errors='+actualLocation.errors.join(','));
for(const name of services){
 const result=await call('/bookings/availability/search',{query:{filter:{location_id:loc,start_at_range:{start_at:'2026-10-11T00:00:00Z',end_at:'2026-11-10T00:00:00Z'},segment_filters:[{service_variation_id:process.env['SQUARE_APPOINTMENT_'+name+'_VARIATION_ID'],team_member_id_filter:{any:[team]}}]}}});
 const slots=result.data.availabilities||[];
 const durationCorrect=slots.length===0||slots.every(s=>s.appointment_segments?.[0]?.duration_minutes===minutes[name]&&s.appointment_segments?.[0]?.service_variation_version===Number(process.env['SQUARE_APPOINTMENT_'+name+'_VERSION']));
 console.log('MF_AVAIL '+name+' HTTP='+result.status+' slots='+slots.length+' durationMatches='+durationCorrect+' first='+(slots[0]?.start_at||'none')+' errors='+result.errors.join(','));
}

const webhookTest=await call('/webhooks/subscriptions/'+encodeURIComponent(process.env.SQUARE_WEBHOOK_SUBSCRIPTION_ID)+'/test',{event_type:'payment.created'});
console.log('MF_WEBHOOK_TEST API_HTTP='+webhookTest.status+' endpoint_status='+webhookTest.data.subscription_test_result?.status_code+' errors='+webhookTest.errors.join(','));
