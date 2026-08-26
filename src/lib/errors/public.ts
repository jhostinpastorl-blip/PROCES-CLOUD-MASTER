import{ERROR_CODES}from"./codes";
const SAFE:Record<string,string>={
 [ERROR_CODES.PLAN_USER_LIMIT]:"Tu plan alcanzó el límite de usuarios.",
 [ERROR_CODES.PLAN_BRANCH_LIMIT]:"Tu plan alcanzó el límite de sucursales.",
 [ERROR_CODES.UNAUTHENTICATED]:"Debes iniciar sesión.",
 [ERROR_CODES.FORBIDDEN]:"No tienes permiso para realizar esta acción.",
 [ERROR_CODES.CROSS_TENANT_ROLE_ASSIGNMENT]:"La asignación solicitada no pertenece a esta empresa.",
 [ERROR_CODES.INVITATION_INVALID]:"La invitación no es válida o ya fue utilizada.",
 [ERROR_CODES.INVITATION_EXPIRED]:"La invitación ha vencido.",
 [ERROR_CODES.INVITATION_EMAIL_MISMATCH]:"La invitación pertenece a otro correo."
};
export function publicErrorMessage(error:unknown){
 const raw=error instanceof Error?error.message:String(error??"");
 for(const[k,v]of Object.entries(SAFE))if(raw.includes(k))return v;
 return"No pudimos completar la operación. Intenta nuevamente o contacta a soporte.";
}
