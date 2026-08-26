#!/usr/bin/env python3
from pathlib import Path
import sys
required=["src/app/page.tsx","src/app/login/page.tsx","src/app/registro/page.tsx","src/app/demo/page.tsx","src/app/app/dashboard/page.tsx","src/app/app/company/page.tsx","src/app/app/branches/page.tsx","src/app/app/users/page.tsx","src/app/app/roles/page.tsx","src/app/app/modules/page.tsx","src/app/app/subscription/page.tsx","src/app/app/notifications/page.tsx","src/app/app/audit/page.tsx","src/app/app/settings/page.tsx","src/app/procesa-admin/page.tsx"]
missing=[x for x in required if not Path(x).exists()]
if missing:
 print("RC0 route contract FAIL")
 [print("-",x) for x in missing]
 sys.exit(1)
print("RC0 route contract PASS")
