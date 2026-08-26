# RC0 Preflight v0.28

Preflight exists to catch structural errors before GitHub/Supabase QA.

Run:
```bash
python scripts/secret_scan.py
python scripts/preflight.py
python scripts/route_inventory.py
```

Then:
```bash
npm ci
npm run typecheck
npm run build
```

Only after these PASS should migrations be applied to Supabase QA.

Static preflight is not a replacement for real database/security testing.
