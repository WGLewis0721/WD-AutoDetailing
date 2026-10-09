/* One-time Vercel production build maintenance; never exposed as an HTTP route.
   This is gated by an exact one-time environment flag and must be removed after execution. */
if(process.env.SQUARE_CATALOG_DURATION_SYNC!=='mirror-finish-catalog-durations-20261009'){
  console.log('Mirror Finish Square catalog maintenance skipped');
  process.exit(0);
}
if(process.env.SQUARE_ENV!=='production'||!process.env.SQUARE_ACCESS_TOKEN||!process.env.SQUARE_LOCATION_ID)
  throw Error('Production Square configuration required');
const expected=[
 {name:'deluxe',id:'FTS5EPOWPWUIMLQC5EP2UIXJ',parent:'2Y6EYM6UVOLZTUJAJACERG4G',price:20000,minutes:120},
 {name:'exterior',id:'R2RWG6N5PK7ZJENI25APGMLL',parent:'IAKG6NTAOZPBAVCNEYIW7URD',price:10000,minutes:60},
 {name:'interior',id:'4BKQZYOKRBMH3W5S3RHCY35C',parent:'6QRNJ4HR3G3P5OVYVR5C2ERU',price:10000,minutes:60}
];
const headers={Authorization:'Bearer '+process.env.SQUARE_ACCESS_TOKEN,'Square-Version':'2026-09-16','Content-Type':'application/json'};
async function call(path,method='GET',payload){
 const r=await fetch('https://connect.squareup.com/v2'+path,{method,headers,...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) throw Error('Square '+method+' '+path+' HTTP '+r.status+' errors='+(data.errors||[]).map(e=>e.code).join(','));
 return data;
}
const assertService=(o,s)=>{
 const d=o?.item_variation_data;
 if(o?.id!==s.id||o?.type!=='ITEM_VARIATION'||!Number.isSafeInteger(o.version)||
    d?.item_id!==s.parent||d?.pricing_type!=='FIXED_PRICING'||
    d?.price_money?.amount!==s.price||d?.price_money?.currency!=='USD'||
    d?.available_for_booking!==true||!d?.team_member_ids?.includes('TMfdWG_wSQ1qdcK5')||
    !Number.isInteger(d?.service_duration)) throw Error('Unexpected live Square service: '+s.name);
 if(o.present_at_all_locations===false && !o.present_at_location_ids?.includes(process.env.SQUARE_LOCATION_ID))
    throw Error('Square service not present at configured location: '+s.name);
};
const snapshots=[];
for(const s of expected){const o=(await call('/catalog/object/'+s.id)).object;assertService(o,s);snapshots.push(o);}
for(let i=0;i<expected.length;i++){
 const s=expected[i],original=snapshots[i],duration=s.minutes*60000;
 const fresh=(await call('/catalog/object/'+s.id)).object;
 assertService(fresh,s);
 if(fresh.version!==original.version) throw Error('Square object changed concurrently: '+s.name);
 if(fresh.item_variation_data.service_duration!==duration){
  // Square upsert replaces omitted variation fields. Preserve the entire service data.
  const object={type:fresh.type,id:fresh.id,version:fresh.version,
   ...(fresh.present_at_all_locations===undefined?{}:{present_at_all_locations:fresh.present_at_all_locations}),
   ...(fresh.present_at_location_ids===undefined?{}:{present_at_location_ids:fresh.present_at_location_ids}),
   ...(fresh.absent_at_location_ids===undefined?{}:{absent_at_location_ids:fresh.absent_at_location_ids}),
   item_variation_data:{...fresh.item_variation_data,service_duration:duration}};
  await call('/catalog/object','POST',{idempotency_key:'mirror-finish-duration-20261009-'+s.name,object});
 }
 const verified=(await call('/catalog/object/'+s.id)).object;
 assertService(verified,s);
 if(verified.item_variation_data.service_duration!==duration) throw Error('Square duration verification failed: '+s.name);
 console.log('MF_DURATION_OK '+s.name+' version='+verified.version+' minutes='+s.minutes);
}
try {
 const all=await call('/webhooks/subscriptions');
 const w=(all.subscriptions||[]).find(s=>s.notification_url===process.env.SQUARE_WEBHOOK_URL&&s.enabled&&s.event_types?.includes('payment.created')&&s.event_types?.includes('payment.updated'));
 if(!w) console.log('MF_WEBHOOK_UNVERIFIED: matching enabled event subscription not found');
 else if(w.signature_key && w.signature_key!==process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
   console.log('MF_WEBHOOK_UNVERIFIED: signature key mismatch');
 else console.log('MF_WEBHOOK_SUBSCRIPTION_OK');
}catch{console.log('MF_WEBHOOK_UNVERIFIED: subscription query unavailable');}
