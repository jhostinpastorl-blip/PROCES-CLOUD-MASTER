#!/usr/bin/env python3
from pathlib import Path
import re,sys,json
ROOT=Path(__file__).resolve().parents[1]
issues=[]
required=[
 "package.json",".gitignore",".env.example",
 "src/app/page.tsx","src/app/login/page.tsx","src/app/registro/page.tsx",
 "src/app/app/layout.tsx","src/app/procesa-admin/layout.tsx",
 "src/lib/supabase/server.ts","src/lib/supabase/admin.ts",
 "supabase/migrations"
]
for x in required:
 if not (ROOT/x).exists(): issues.append(f"MISSING:{x}")
migs=sorted((ROOT/"supabase/migrations").glob("*.sql"))
nums=[]
for p in migs:
 m=re.match(r"(\d+)_",p.name)
 if not m: issues.append(f"BAD_MIGRATION_NAME:{p.name}")
 else: nums.append(int(m.group(1)))
if nums:
 gaps=[x for x in range(min(nums),max(nums)+1) if x not in nums]
 if gaps: issues.append(f"MIGRATION_GAPS:{gaps}")
 if len(nums)!=len(set(nums)): issues.append("DUPLICATE_MIGRATION_PREFIX")
env=(ROOT/".env.example").read_text(encoding="utf-8")
for key in ["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY"]:
 if key not in env: issues.append(f"ENV_TEMPLATE_MISSING:{key}")
print(json.dumps({"status":"PASS" if not issues else "FAIL","issues":issues,"migration_count":len(migs)},indent=2))
sys.exit(1 if issues else 0)
