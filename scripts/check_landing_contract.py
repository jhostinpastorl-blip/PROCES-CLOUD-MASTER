#!/usr/bin/env python3
from pathlib import Path
import sys
t=Path("src/app/page.tsx").read_text(encoding="utf-8")
required=['PROCESA CORP','/login','/registro','/demo','id="producto"','id="modulos"','id="como-funciona"','id="planes"','id="seguridad"','id="faq"']
missing=[x for x in required if x not in t]
if missing:
 print("Landing contract FAIL"); [print("-",x) for x in missing]; sys.exit(1)
print("Landing contract PASS")
