import{cookies}from"next/headers";import{requireCompany}from"@/lib/auth/context";import{canAccessBranch}from"@/lib/branches/scope";
const COMPANY_COOKIE="procesa_company";const BRANCH_COOKIE="procesa_branch";
export async function getActiveCompany(){const c=await cookies();const id=c.get(COMPANY_COOKIE)?.value;if(!id)return null;try{return await requireCompany(id)}catch{return null}}
export async function getActiveBranchId(){const c=await cookies();return c.get(BRANCH_COOKIE)?.value??null}
export async function setActiveContext(companyId:string,branchId?:string){await requireCompany(companyId);if(branchId&&!await canAccessBranch(companyId,branchId))throw new Error("FORBIDDEN_BRANCH");const c=await cookies();c.set(COMPANY_COOKIE,companyId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/"});if(branchId)c.set(BRANCH_COOKIE,branchId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/"});else c.delete(BRANCH_COOKIE)}
