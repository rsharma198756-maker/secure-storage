# Regression Test Suite

## What This Covers
- OTP request/verify, refresh token rotation, logout
- OTP rate limiting (email + IP)
- RBAC enforcement (admin vs user)
- User management (disable/enable, reset roles)
- Items: folders, nested lists, file upload/download, delete
- Sharing: grant read access and enforce delete denied
- Audit logs

## Prerequisites
- Docker Desktop running
- Stack running via docker compose
- Node.js 18+ available on host (for Vitest)

## One-Time Install (host)
```bash
cd "/Users/apple/Desktop/Projects/February/Secure storage"
npm install
```

## Start the Stack
```bash
cd "/Users/apple/Desktop/Projects/February/Secure storage"
docker compose up -d --build
```

## Clean DB (recommended for full regression)
This ensures the first user created becomes admin.
```bash
docker compose down -v
docker compose up -d --build
```

## Run the Regression Suite
```bash
npm run test:e2e
```

## Environment Overrides (optional)
You can override API endpoints if needed:
```
API_BASE=http://localhost:3000
MAILPIT_URL=http://localhost:8025
```

## Notes
- Tests will read OTP from the `/auth/request-otp` response when `RETURN_OTP_IN_RESPONSE=true` (set in docker-compose).
- If you disable that flag, tests fall back to Mailpit (`http://localhost:8025`).
- If admin check fails, reset the DB and re-run.
