export type ActionOk<T=undefined>={ok:true;data:T};
export type ActionFail={ok:false;code:string;message:string};
export type ActionResult<T=undefined>=ActionOk<T>|ActionFail;

export function ok<T>(data:T):ActionOk<T>{return{ok:true,data}}
export function fail(code:string,message:string):ActionFail{return{ok:false,code,message}}
