# Health / readiness
`GET /api/health`: process responds; no DB dependency; never returns secrets.
`GET /api/readiness`: validates DB reachability and returns 503 when dependency unavailable.
Neither endpoint exposes connection strings, keys, tenant data, stack traces or internal SQL.
