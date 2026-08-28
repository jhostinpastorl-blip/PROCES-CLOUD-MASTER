import{z}from"zod";

export const emailSchema=z.string().trim().toLowerCase().email().max(254);
export const passwordSchema=z.string().min(10).max(128);
export const companyIdSchema=z.string().uuid();
export const branchCodeSchema=z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/);
export const companyNameSchema=z.string().trim().min(2).max(160);
export const legalNameSchema=z.string().trim().min(2).max(180);
export const taxIdSchema=z.string().trim().max(40).optional();

export const registrationSchema=z.object({
  name:z.string().trim().min(2).max(120),
  email:emailSchema,
  password:passwordSchema,
  terms:z.literal("yes")
});

export const passwordUpdateSchema=z.object({
  password:passwordSchema,
  confirm:passwordSchema
}).refine(v=>v.password===v.confirm,{path:["confirm"],message:"PASSWORD_MISMATCH"});

export const companySchema=z.object({
  name:companyNameSchema,
  legalName:legalNameSchema,
  taxId:taxIdSchema,
  currency:z.string().trim().length(3).transform(v=>v.toUpperCase()),
  timezone:z.string().trim().min(3).max(80)
});

export const firstBranchSchema=z.object({
  companyId:companyIdSchema,
  name:z.string().trim().min(2).max(120),
  code:branchCodeSchema.transform(v=>v.toUpperCase())
});

export const onboardingProfileSchema=z.object({
  fullName:z.string().trim().min(2).max(120),
  phone:z.string().trim().max(30).optional(),
  jobTitle:z.string().trim().max(100).optional()
});

export const businessDiscoverySchema=z.object({
  industry:z.enum(["bodega","ferreteria","minimarket","panaderia","restaurante","gimnasio","veterinaria","servicios","otro"]),
  primaryNeed:z.enum(["sales","inventory","cash","purchases","employees","accounting","documents","collections"]),
  selectedNeeds:z.array(z.enum(["sales","inventory","cash","purchases","employees","accounting","documents","collections"])).min(1).max(8),
  employeeRange:z.enum(["1","2-5","6-20","21-50","51+"]),
  branchRange:z.enum(["1","2-3","4-10","11+"])
});

export const invitationSchema=z.object({
  companyId:companyIdSchema,
  email:emailSchema,
  roleId:z.union([z.string().uuid(),z.literal("")]).optional()
});
