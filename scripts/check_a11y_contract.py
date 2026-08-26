#!/usr/bin/env python3
from pathlib import Path
import sys
checks={"src/app/layout.tsx":["skip-link","main-content"],"src/components/ui/mobile-app-nav.tsx":["aria-expanded","aria-controls","aria-label"],"src/app/error.tsx":["Reintentar"],"src/app/not-found.tsx":["404"]}
missing=[]
for f,need in checks.items():
 p=Path(f)
 if not p.exists(): missing.append(f+":missing"); continue
 t=p.read_text(encoding="utf-8",errors="ignore")
 for x in need:
  if x not in t: missing.append(f+":"+x)
if missing:
 print("A11Y contract FAIL")
 [print("-",x) for x in missing]
 sys.exit(1)
print("A11Y contract PASS")
