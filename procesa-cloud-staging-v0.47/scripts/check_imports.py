#!/usr/bin/env python3
from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"src"
issues=[]
rx=re.compile(r"""from\s+["'](@/[^"']+)["']|import\s*\(\s*["'](@/[^"']+)["']\s*\)""")
for p in SRC.rglob("*"):
    if not p.is_file() or p.suffix not in {".ts",".tsx",".js",".jsx"}: continue
    t=p.read_text(encoding="utf-8",errors="ignore")
    for m in rx.finditer(t):
        imp=m.group(1) or m.group(2)
        rel=imp[2:]
        base=SRC/rel
        candidates=[base,base.with_suffix(".ts"),base.with_suffix(".tsx"),base.with_suffix(".js"),base.with_suffix(".jsx"),base/"index.ts",base/"index.tsx",base/"index.js",base/"index.jsx"]
        if not any(x.exists() for x in candidates):
            issues.append(f"{p.relative_to(ROOT)} -> {imp}")
if issues:
    print("Import check FAIL")
    for x in issues: print("-",x)
    sys.exit(1)
print("Import check PASS")
