import{headers}from"next/headers";
export async function requestFingerprint(scope:string){
 const h=await headers();const ip=h.get("cf-connecting-ip")||h.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 return `${scope}:${ip}`;
}
