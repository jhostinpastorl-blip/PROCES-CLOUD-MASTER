# Observability baseline
Health: /api/health verifies process availability.
Readiness: /api/ready verifies database reachability.
Version: /api/version identifies deployed Core version.
Production logging must avoid passwords, tokens, service keys, full auth headers and unnecessary PII.
Critical business mutations go to audit_logs. Technical logs and business audit are separate concerns.
Future: error tracking and metrics only after cost/privacy evaluation.
