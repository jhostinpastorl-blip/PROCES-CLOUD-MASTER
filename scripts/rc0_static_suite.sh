#!/usr/bin/env bash
set -euo pipefail
python scripts/secret_scan.py
python scripts/preflight.py
python scripts/check_imports.py
python scripts/check_permissions.py
node scripts/verify-project.mjs
node scripts/check-tenant-sql.mjs
python scripts/route_inventory.py > /tmp/procesa-route-inventory.csv
echo "RC0 static suite PASS"
