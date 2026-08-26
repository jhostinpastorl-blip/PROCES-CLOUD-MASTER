#!/usr/bin/env python3
from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[1]
catalog=(ROOT/"src/lib/auth/permission-catalog.ts").read_text(encoding="utf-8")
known=set(re.findall(r'"([a-z0-9_.-]+)"',catalog))
used=set()
for p in (ROOT/"src").rglob("*"):
    if not p.is_file() or p.suffix not in {".ts",".tsx"}: continue
    t=p.read_text(encoding="utf-8",errors="ignore")
    used.update(re.findall(r'requirePermission\([^,]+,\s*"([a-z0-9_.-]+)"',t))
    used.update(re.findall(r'permissions\.includes\("([a-z0-9_.-]+)"\)',t))
unknown=sorted(used-known)
print("Known permissions:",len(known))
print("Used permissions:",len(used))
if unknown:
    print("Permission catalog FAIL")
    for x in unknown: print("-",x)
    sys.exit(1)
print("Permission catalog PASS")
