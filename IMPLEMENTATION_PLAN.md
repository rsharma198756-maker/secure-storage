# Secure Storage Product – Detailed Implementation Plan

## Goals
- Build a secure document storage product hosted on AWS.
- Gateway (accessing) service must run on a separate server from the storage (data) service.
- Storage service must be reachable only by the gateway service running in the same AWS VPC.
- Provide email OTP sign-in, RBAC authorization, and document storage APIs.
- Use open-source and free components wherever possible, except AWS services for production.
- Start with a fully local environment that mirrors production behavior.

## Architecture Overview
- Gateway Service (public API + Admin UI) on its own server
- Storage Service (private API) on a separate server
- Postgres (metadata, RBAC, audit logs)
- Redis (OTP TTL, rate limits, sessions)
- Object Storage (MinIO locally, S3 in AWS)

```
Client -> Gateway Service (public)
Gateway Service -> Storage Service (private)
Storage Service -> Object Storage (MinIO or S3)
Gateway Service -> Postgres / Redis
```

## Technology Stack (Open-Source First)
- Language: Node.js (TypeScript)
- Web framework: Fastify (or Express if preferred)
- Admin UI: React + Vite (or Next.js if you want SSR)
- ORM / query builder: Kysely + `pg` (or Prisma if you prefer)
- Migrations: Kysely migrations or `node-pg-migrate`
- RBAC: Casbin (Node) or OPA (policy engine)
- Cache / TTL / rate limits: Redis
- Email (local): Mailpit or MailHog
- Object storage (local): MinIO
- Containerization: Docker + Docker Compose
- IaC: Terraform
- AWS services: ECS Fargate, ALB, RDS Postgres, ElastiCache Redis, S3, Secrets Manager, CloudWatch

## Repository Structure (Proposed)
- `services/gateway` (public API + serves Admin UI or API for Admin UI)
- `services/storage` (private API)
- `apps/admin-ui` (React admin UI, optional if not served from gateway)
- `packages/shared` (types, utils, auth, errors)
- `infra/terraform` (AWS infrastructure)
- `docker-compose.yml` (local dev stack)
- `docs/` (architecture and runbooks)

## Data Model (Minimum)
- `users` (id, email, status, created_at)
- `roles` (id, name)
- `permissions` (id, name)
- `user_roles` (user_id, role_id)
- `role_permissions` (role_id, permission_id)
- `documents` (id, owner_id, key, size, content_type, created_at)
- `otp_tokens` (email, otp_hash, expires_at, attempts, created_at)
- `refresh_tokens` (user_id, token_hash, expires_at, created_at)
- `audit_logs` (actor_id, action, target_id, metadata, created_at)

## Security Model
- Storage service has no public endpoint.
- Gateway and storage run as separate services on separate servers/instances.
- In local dev, storage service has no host port and is only reachable on the Docker network.
- In AWS, storage runs in private subnets with security group inbound allowed only from gateway security group.
- All documents are stored in S3 with private bucket policy and KMS encryption.
- Use JWT access tokens and refresh tokens.
- OTP stored hashed (argon2 or bcrypt).
- Rate limit OTP requests and verification attempts.

## Local Environment Plan (First Milestone)
1. Create `docker-compose.yml` with services: gateway, storage, admin-ui, postgres, redis, minio, mailpit.
2. Configure networks so only gateway can reach storage.
3. Add `.env` files for local configuration.
4. Build a single command to start the full stack: `docker compose up`.
5. Validate local flows:
   - OTP email arrives in Mailpit.
   - OTP sign-in returns JWT.
   - Document upload and download works via gateway.
   - Admin UI can manage users/roles and upload files.

## Implementation Phases

### Phase 1 – Project Setup
1. Initialize repo with workspace tooling (pnpm or npm workspaces).
2. Add TypeScript config and shared lint rules.
3. Create gateway and storage service skeletons.
4. Add shared package for types and auth helpers.

### Phase 2 – Auth (Email OTP)
1. Implement `/auth/request-otp` in gateway.
2. Generate OTP, hash it, store in Redis + Postgres.
3. Send OTP email via SMTP adapter.
4. Implement `/auth/verify-otp` to validate OTP and issue JWT + refresh token.
5. Add rate limiting and IP throttling.
6. Add unit tests and integration tests in local docker stack.

### Phase 3 – RBAC
1. Define role and permission list in code.
2. Implement Casbin policy model and enforcement middleware.
3. Store policy rules in Postgres.
4. Add admin endpoints for role assignment.
5. Test RBAC allow/deny scenarios.

### Phase 4 – Storage Service + Document APIs
1. Implement storage service endpoints for file lifecycle.
2. Storage uses AWS SDK (S3-compatible) with MinIO locally.
3. Add metadata records in Postgres.
4. Add pre-signed URL flow for uploads and downloads.
5. Gateway enforces RBAC and proxies to storage service.

### Phase 4b – Admin UI
1. Build Admin UI (React + Vite or Next.js).
2. Admin UI connects to gateway API using JWT.
3. UI screens:
   - Sign in (email OTP)
   - Users list + role assignments
   - Roles + permissions editor
   - Document list + upload/download
4. Protect Admin UI routes by role (admin).

### Phase 5 – Audit Logging and Hardening
1. Add audit log entries for all access events.
2. Enforce file size limits and content-type validation.
3. Add structured logs and trace IDs.
4. Add health checks and readiness endpoints.

### Phase 6 – AWS Deployment
1. Terraform modules for VPC, subnets, SGs, ECS, ALB, RDS, Redis, S3, Secrets Manager.
2. Gateway and storage are separate ECS services (or EC2 instances).
3. Storage in private subnets, no public IPs.
4. Security group rules: storage inbound only from gateway SG.
5. S3 bucket policy restricted to storage role only.
6. Enable VPC endpoint for S3 to avoid public egress.

### Phase 7 – CI/CD
1. Add GitHub Actions (or similar) for lint, test, build.
2. Build and push Docker images.
3. Deploy infra via Terraform.
4. Deploy services via ECS task definitions.

### Phase 8 – Observability and Operations
1. CloudWatch logging and alarms.
2. Slow query logging for Postgres.
3. Redis metrics and alerts.
4. Basic runbook for incidents and recovery.

## Local Testing Strategy
- Unit tests: OTP, JWT, RBAC enforcement.
- Integration tests: gateway → storage → MinIO.
- Email tests: verify OTP email in Mailpit.
- Load tests: optional with k6.

## Open Questions to Finalize
- Choose Fastify or Express.
- Choose Casbin or OPA.
- Decide single-tenant or multi-tenant RBAC.
- Set file size limits and retention requirements.

## Next Deliverables
- `docker-compose.yml` for local dev.
- Initial service skeletons and shared package.
- DB migrations and RBAC seed data.
- OTP auth endpoints with tests.
- Admin UI skeleton and role-protected routes.
