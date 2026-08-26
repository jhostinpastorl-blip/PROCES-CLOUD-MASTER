import{requireCompany}from"./context";import type{CorePermission}from"./permission-catalog";
export async function requirePermission(companyId:string,permission:CorePermission|string){
 const ctx=await requireCompany(companyId);
 if(!ctx.permissions.includes(permission))throw new Error("FORBIDDEN_PERMISSION");
 return ctx;
}
export async function requireAnyPermission(companyId:string,permissions:(CorePermission|string)[]){
 const ctx=await requireCompany(companyId);
 if(!permissions.some(p=>ctx.permissions.includes(p)))throw new Error("FORBIDDEN_PERMISSION");
 return ctx;
}
