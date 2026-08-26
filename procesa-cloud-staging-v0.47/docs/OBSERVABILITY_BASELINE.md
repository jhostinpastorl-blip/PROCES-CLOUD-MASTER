# Observability Baseline
Current:
- `/api/health`
- `/api/readiness`
- `/api/status`
- release/version metadata
- correlation id via `x-correlation-id`, Cloudflare Ray ID, or generated UUID
- business audit separated from technical status

Future staging:
- structured server logs
- error tracking
- request latency
- DB/query metrics
- auth failure counts
- tenant-safe diagnostics

Never include secrets, passwords, tokens or service role in observability payloads.
