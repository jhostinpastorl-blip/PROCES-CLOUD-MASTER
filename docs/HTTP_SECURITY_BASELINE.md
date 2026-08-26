# HTTP Security Baseline v0.30
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/microphone/geolocation disabled by default
- X-Frame-Options: DENY
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Resource-Policy: same-site
- Origin-Agent-Cluster: ?1
- Authenticated areas: Cache-Control no-store, private

Before production:
- add CSP tuned to actual assets/integrations;
- HSTS only after HTTPS/domain is confirmed;
- Cloudflare rate limiting for login/demo/reset.
