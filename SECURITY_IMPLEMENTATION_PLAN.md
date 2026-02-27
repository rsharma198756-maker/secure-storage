# Security Implementation Plan

Date: February 27, 2026  
Project: Secure Storage (`gateway` + `storage` + Admin UI)  
Constraint: Production must use 2 separate Railway projects.

## 1) Goals

1. Keep the edge/public API separated from the core/data API (client requirement: 2 projects).
2. Ensure only Project A (edge server) can call Project B (core server).
3. Harden auth, secrets, file handling, and operational security.
4. Build verifiable controls with tests and deployment gates.

## 2) Current Security Findings (from this repo)

Severity scale: Critical, High, Medium, Low.

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | Critical | Git remotes contain live GitHub PATs in `.git/config`; immediate secret exposure risk | `.git/config` lines with `ghp_...` tokens |
| 2 | High | Dev header impersonation path enabled in compose (`ALLOW_DEV_HEADER=true`) | [docker-compose.yml](./docker-compose.yml) line 107, [services/gateway/src/server.ts](./services/gateway/src/server.ts) lines 49, 134 |
| 3 | High | OTP can be returned in API response in compose defaults (`RETURN_OTP_IN_RESPONSE=true`) | [docker-compose.yml](./docker-compose.yml) line 106 |
| 4 | High | CORS allows any origin (`origin: true`) on gateway | [services/gateway/src/server.ts](./services/gateway/src/server.ts) line 114 |
| 5 | Medium | OTP generation uses `Math.random` instead of cryptographic randomness | [services/gateway/src/auth.ts](./services/gateway/src/auth.ts) line 18 |
| 6 | Medium | Password policy is weak (min length only) | [services/gateway/src/server.ts](./services/gateway/src/server.ts) lines 760, 810 |
| 7 | Medium | Access tokens are stored in `localStorage` in Admin UI (XSS blast radius) | [apps/admin-ui/src/App.tsx](./apps/admin-ui/src/App.tsx) lines 456, 683 |
| 8 | Medium | Cross-service token includes `scope`, but storage currently does not enforce scope claims | [services/storage/src/server.ts](./services/storage/src/server.ts) lines 25, 182+ |
| 9 | Medium | Schema drift risk: code expects `first_name/last_name`; migration shown does not add them | [services/gateway/src/server.ts](./services/gateway/src/server.ts) lines 348, 728, 774; [db/init/002_passwords_and_roles.sql](./db/init/002_passwords_and_roles.sql) |

## 3) Required 2-Project Architecture

Railway private networking is per project/environment. With 2 separate projects, Project A -> Project B traffic is public internet unless you add restrictions.

### Target Topology (2-project compliant)

```text
                    Public Internet
                          |
                          v
            +-------------------------------+
            | Project A (Edge)              |
            | gateway (public domain ON)    |
            +-------------------------------+
                          |
                          | HTTPS
                          | + service JWT + internal token
                          | + request signature + nonce
                          | source IP = static outbound IP
                          v
            +-------------------------------+
            | Ingress Protection Layer      |
            | (WAF/API GW/IP allowlist)     |
            +-------------------------------+
                          |
                          v
            +-------------------------------+
            | Project B (Core)              |
            | storage/core API (restricted) |
            +-------------------------------+
                          |
                          v
            +-------------------------------+
            | DB/Redis/Object Store         |
            | no public proxy/domain        |
            +-------------------------------+
```

## 4) Implementation Plan (Phased)

## Phase 0: Immediate Containment (Day 0)

1. Rotate all exposed GitHub PATs found in git remotes.
2. Replace remote URLs with tokenless HTTPS or SSH.
3. Rotate Railway secrets that may have been exposed in logs/history:
`INTERNAL_TOKEN`, `SERVICE_JWT_SECRET`, `JWT_SECRET`, SMTP/API keys.
4. Set emergency runtime defaults in production:
`ALLOW_DEV_HEADER=false`, `RETURN_OTP_IN_RESPONSE=false`.

Exit criteria:
- No PATs remain in `.git/config`.
- All rotated secrets confirmed in runtime env.

## Phase 1: Railway Network Control for 2 Projects (Days 1-2)

1. Keep `gateway` in Project A with public domain.
2. Put `storage` (core API) and DB services in Project B.
3. Enable static outbound IP on Project A.
4. Protect Project B ingress with allowlist so only Project A static IP can reach core API.
5. Remove public DB exposure in Project B:
disable public domain/proxy for DB and internal-only services.
6. Add fallback deny rule for all other inbound IPs to Project B API.

Exit criteria:
- Core API is unreachable from arbitrary internet hosts.
- Core API reachable only from Project A egress IP.
- DB not publicly reachable.

## Phase 2: Service-to-Service Authentication Hardening (Days 2-3)

1. Keep current `x-internal-token` + service JWT checks.
2. Enforce JWT claims strictly in storage:
validate issuer, audience, expiry, `kind`, and `scope`.
3. Add replay resistance:
`x-request-ts`, `x-request-nonce`, HMAC signature over method/path/body hash.
4. Reject old timestamps and reused nonces (Redis nonce cache).
5. Keep service token TTL short (30s is acceptable).

Exit criteria:
- Stolen old request cannot be replayed.
- Wrong scope/kind request is rejected.

## Phase 3: Gateway/Auth Hardening (Days 3-5)

1. Replace OTP generation with `crypto.randomInt`.
2. Increase password policy:
min length 12 and block common passwords.
3. Add login abuse controls:
account lock window + IP/device anomaly checks.
4. Restrict CORS to explicit trusted origins in production.
5. Add JWT claims for access tokens:
issuer, audience, `jti`, `iat`; verify all on decode.
6. Keep disabled-user checks on every protected route (already present).

Exit criteria:
- Password/OTP brute-force resistance improved.
- Browser origins are explicitly controlled.

## Phase 4: Session and Frontend Token Security (Days 5-7)

1. Move from `localStorage` bearer tokens to secure HTTP-only cookies where feasible.
2. If bearer tokens remain in browser:
strict CSP, no inline scripts, trusted types, and dependency pinning.
3. Add CSRF protection if cookie-based auth is introduced.
4. Add forced logout on password reset and role downgrade.

Exit criteria:
- Token theft via XSS becomes significantly harder.
- Session revocation is enforced.

## Phase 5: Data and File Security (Week 2)

1. Validate file content by magic bytes (not only extension/content-type).
2. Add antivirus/malware scanning queue before marking file active.
3. Enforce per-tenant/user quotas and upload rate limits.
4. Add checksum verification and immutable audit of file replacements.
5. Ensure object storage encryption-at-rest and least-privileged IAM keys.

Exit criteria:
- Malicious file upload path is controlled.
- Storage credentials cannot perform unnecessary actions.

## Phase 6: Database and Schema Integrity (Week 2)

1. Fix schema drift (`first_name`, `last_name`) with explicit migration.
2. Add migration CI gate: application starts only if schema version matches.
3. Restrict DB roles:
separate runtime role (no DDL) and migration role.
4. Backup/restore runbook with periodic restore testing.

Exit criteria:
- Runtime cannot drift from migration state.
- DB access follows least privilege.

## Phase 7: Monitoring, Detection, and Incident Response (Week 2-3)

1. Centralize logs with correlation IDs:
`gateway request id -> storage request id`.
2. Alert on:
failed auth bursts, token validation failures, blocked IPs, abnormal downloads.
3. Protect audit logs:
append-only policy and export to immutable storage.
4. Create incident runbooks:
token leak, account takeover, malicious upload, data exfiltration.

Exit criteria:
- Security incidents are detectable quickly.
- Response steps are documented and testable.

## Phase 8: Security Testing and Release Gates (Week 3)

1. Add automated checks in CI:
SAST, dependency audit, secret scan, IaC config scan.
2. Add security integration tests:
forged service JWT, bad scope, replayed nonce, direct core access attempts.
3. Add external penetration test for Project A -> Project B boundary.
4. Enforce go-live checklist sign-off.

Exit criteria:
- Deployment is blocked if critical security checks fail.

## 5) Concrete Code Changes Backlog

1. Gateway: replace OTP RNG with `crypto.randomInt`.
2. Gateway: set production CORS allowlist.
3. Gateway: remove any production path that accepts `x-user-id`.
4. Gateway: enforce stronger password policy and add lockout strategy.
5. Storage: enforce service token `scope` per endpoint.
6. Storage/Gateway: implement request signing + nonce replay cache.
7. Admin UI: migrate auth to HTTP-only cookie strategy or add strict CSP controls.
8. Migrations: add missing `first_name/last_name` migration and schema version gate.

## 6) Suggested Environment Baseline (Production)

1. `ALLOW_DEV_HEADER=false`
2. `RETURN_OTP_IN_RESPONSE=false`
3. Strong random values for:
`INTERNAL_TOKEN`, `SERVICE_JWT_SECRET`, `JWT_SECRET`
4. `SERVICE_JWT_TTL_SECONDS=30`
5. Explicit CORS origins only (no wildcard).
6. No public DB proxy/domain.
7. Core API ingress restricted to Project A static outbound IP.

## 7) Verification Checklist

1. Direct call to Project B core API from laptop/public internet returns denied.
2. Call from Project A gateway to Project B succeeds.
3. Replay same signed request fails.
4. Invalid service token scope fails.
5. Disabled user cannot call protected APIs.
6. OTP is never returned in API responses in production.
7. No tokens/secrets exist in git remotes/config or build logs.

## 8) Priority Order

1. Containment and secret rotation.
2. Cross-project ingress restriction (IP allowlist + static outbound IP).
3. Service auth replay/scope hardening.
4. Gateway/auth controls.
5. Frontend/session hardening.
6. File/data and monitoring improvements.

