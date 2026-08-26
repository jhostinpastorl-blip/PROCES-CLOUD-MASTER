type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();
export function localRateLimit(key:string,limit:number,windowMs:number){
 const now=Date.now();const b=buckets.get(key);
 if(!b||b.resetAt<=now){buckets.set(key,{count:1,resetAt:now+windowMs});return{ok:true,remaining:limit-1}}
 if(b.count>=limit)return{ok:false,remaining:0,retryAfterMs:b.resetAt-now};
 b.count++;return{ok:true,remaining:limit-b.count};
}
// Development fallback only. Production must use a distributed edge/backend limiter.
