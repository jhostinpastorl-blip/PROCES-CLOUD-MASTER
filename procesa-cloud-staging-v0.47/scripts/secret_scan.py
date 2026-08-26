#!/usr/bin/env python3
from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[1]
SKIP={".git","node_modules",".next","dist","out"}
patterns=[
 ("supabase_service_role",re.compile(r"SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!\s*$)(.+)",re.I)),
 ("generic_private_key",re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
]
bad=[]
for p in ROOT.rglob("*"):
 if not p.is_file() or any(x in p.parts for x in SKIP): continue
 if p.name==".env.example": continue
 if p.suffix.lower() not in {".ts",".tsx",".js",".json",".sql",".md",".yml",".yaml",".env"}: continue
 t=p.read_text(encoding="utf-8",errors="ignore")
 for name,rx in patterns:
  if rx.search(t): bad.append((str(p.relative_to(ROOT)),name))
if bad:
 print("Secret scan FAILED:")
 for f,k in bad: print(f"- {f}: {k}")
 sys.exit(1)
print("Secret scan PASS")
