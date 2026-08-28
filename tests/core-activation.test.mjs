import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {resolveFirstEntry,sanitizeNextPath} from "../src/lib/activation/first-entry-policy.ts";
import {recommendSolution} from "../src/lib/activation/recommendation.ts";
import {parseBranchActiveState} from "../src/lib/branches/contracts.ts";

const base={authenticated:true,emailConfirmed:true,activationEnabled:true,companyCount:0,hasValidContext:false};

test("next only accepts internal application routes",()=>{assert.equal(sanitizeNextPath("/app/dashboard?tab=1"),"/app/dashboard?tab=1");assert.equal(sanitizeNextPath("https://evil.test/app/dashboard"),null);assert.equal(sanitizeNextPath("//evil.test/app/dashboard"),null);assert.equal(sanitizeNextPath("/marketing"),null)});
test("first entry sends anonymous users to login",()=>{assert.equal(resolveFirstEntry({...base,authenticated:false,safeNext:"/app/modules"}),"/login?next=%2Fapp%2Fmodules")});
test("invitation precedes verification and onboarding",()=>{assert.equal(resolveFirstEntry({...base,emailConfirmed:false,pendingInvitationPath:"/aceptar-invitacion?token=safe"}),"/aceptar-invitacion?token=safe")});
test("unconfirmed email enters verification flow",()=>{assert.equal(resolveFirstEntry({...base,emailConfirmed:false}),"/verificar-correo")});
test("new user starts canonical profile",()=>{assert.equal(resolveFirstEntry(base),"/onboarding/profile")});
test("incomplete workflow resumes exact canonical step",()=>{assert.equal(resolveFirstEntry({...base,onboarding:{currentStep:"activation",companyId:"abc"},companyCount:1}),"/onboarding/activation?company=abc")});
test("existing user without valid context chooses context",()=>{assert.equal(resolveFirstEntry({...base,onboarding:{currentStep:"complete",status:"COMPLETED"},companyCount:1}),"/app/context")});
test("existing user with context reaches safe destination",()=>{assert.equal(resolveFirstEntry({...base,onboarding:{currentStep:"complete",status:"COMPLETED"},companyCount:1,hasValidContext:true,safeNext:"/app/modules"}),"/app/modules")});
test("recommendation is deterministic and honest about roadmap",()=>{assert.equal(recommendSolution({industry:"minimarket",primaryNeed:"sales",selectedNeeds:["sales","cash"]}).solutionCode,"pos");assert.equal(recommendSolution({industry:"restaurante",primaryNeed:"sales",selectedNeeds:["sales"]}).solutionCode,"rest")});
test("only evidenced solution is activatable",async()=>{const{SOLUTIONS}=await import("../src/lib/activation/catalog.ts");assert.equal(SOLUTIONS.pos.activatable,true);for(const code of ["rest","conta","gym","vet"])assert.equal(SOLUTIONS[code].activatable,false)});
test("branch toggle parses the canonical enable field",()=>{assert.equal(parseBranchActiveState("true"),true);assert.equal(parseBranchActiveState("false"),false);assert.equal(parseBranchActiveState(null),false)});
test("migration keeps branch legacy compatibility and tenant constraints",async()=>{const sql=await readFile(new URL("../supabase/migrations/072_core_saas_activation_foundation.sql",import.meta.url),"utf8");assert.match(sql,/absence of an explicit row means ALL_BRANCHES/i);assert.match(sql,/membership_can_access_branch/);assert.match(sql,/unique\(company_id,solution_id\)/);assert.match(sql,/for select to authenticated/);assert.match(sql,/create or replace function public\.activate_solution_package/)});
test("activation retry and branch authorization remain tenant-bound",async()=>{const sql=await readFile(new URL("../supabase/migrations/072_core_saas_activation_foundation.sql",import.meta.url),"utf8");assert.match(sql,/on conflict\(company_id,solution_id\) do update/);assert.match(sql,/where cm\.company_id=p_company_id/);assert.match(sql,/where mba\.membership_id=cm\.id and mba\.company_id=p_company_id and mba\.branch_id=p_branch_id/);assert.match(sql,/branches membership scope read/)});
