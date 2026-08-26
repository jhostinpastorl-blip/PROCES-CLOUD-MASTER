#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=[]
for p in sorted((ROOT/"src/app").rglob("page.tsx")):
 route="/"+str(p.parent.relative_to(ROOT/"src/app")).replace("\\","/")
 if route=="/.": route="/"
 text=p.read_text(encoding="utf-8",errors="ignore")
 rows.append((route,
   "yes" if "getUser(" in text or "getActiveCompany(" in text or "requirePlatformAdmin(" in text else "unknown",
   "yes" if "requirePermission(" in text else "no"))
print("route,auth_signal,permission_signal")
for r,a,p in rows: print(f"{r},{a},{p}")
