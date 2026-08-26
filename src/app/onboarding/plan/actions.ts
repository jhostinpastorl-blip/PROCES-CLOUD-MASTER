"use server";import{z}from"zod";import{redirect}from"next/navigation";import{saveOnboardingState}from"@/lib/onboarding/persist";
const allowed=z.enum(["free","lite","pro","business","enterprise"]);
export async function selectPlan(f:FormData){const code=allowed.parse(f.get("planCode"));await saveOnboardingState("company",{plan:code});redirect("/onboarding/company")}
