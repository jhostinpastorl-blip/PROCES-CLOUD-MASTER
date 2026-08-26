#!/usr/bin/env python3
from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/"src"
issues=[]
for p in src.rglob("actions.ts"):
    t=p.read_text(encoding="utf-8",errors="ignore")
    if "Object.fromEntries(" in t and "@/lib/forms/schemas" not in t and "@/lib/forms/from-data" not in t:
        issues.append(str(p.relative_to(ROOT)))
if issues:
    print("Form schema adoption WARN")
    for x in issues: print("-",x)
    print("Legacy validations remain; review before RC0.")
    sys.exit(0)
print("Form schema adoption PASS")
