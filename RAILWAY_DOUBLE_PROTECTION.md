# Railway Double-Protection Deployment

This project now enforces a two-layer protection model:

1. Public `gateway` handles user auth (`password + OTP`) and RBAC.
2. Private `storage` only accepts trusted server-to-server requests and re-checks user auth/RBAC.

## 1) Deploy Two Services

1. Deploy `gateway` as a public Railway service.
2. Deploy `storage` as a private Railway service (no public domain).

## 2) Required Shared Secrets

Set these to strong random values in Railway (do **not** use defaults):

- `INTERNAL_TOKEN`
- `SERVICE_JWT_SECRET`
- `JWT_SECRET`

Set these consistently across both services:

- `SERVICE_JWT_ISSUER=secure-gateway`
- `SERVICE_JWT_AUDIENCE=secure-storage`

Gateway-only:

- `SERVICE_JWT_TTL_SECONDS=30`

## 3) Gateway Environment

Minimum gateway variables:

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `STORAGE_URL` (must point to storage private URL)
- `JWT_SECRET`
- `INTERNAL_TOKEN`
- `SERVICE_JWT_SECRET`
- `SERVICE_JWT_ISSUER`
- `SERVICE_JWT_AUDIENCE`
- `SERVICE_JWT_TTL_SECONDS`
- OTP/SMTP variables as needed

## 4) Storage Environment

Minimum storage variables:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `INTERNAL_TOKEN`
- `SERVICE_JWT_SECRET`
- `SERVICE_JWT_ISSUER`
- `SERVICE_JWT_AUDIENCE`
- S3/MinIO variables (`S3_*`)

## 5) Network Rules

1. Do not attach a public domain to `storage`.
2. Only `gateway` should call `storage` using private networking.
3. Keep object storage bucket private.

## 6) Verification Checklist

1. Direct call to storage without headers fails (`401`).
2. Direct call to storage with only one token fails (`401`).
3. Gateway file upload/download works through gateway endpoints.
4. `/items/:id/presign-download` returns disabled (`410`).
5. Non-authorized users are blocked both at gateway and storage layers.
