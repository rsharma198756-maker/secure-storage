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
This ensures migrations run cleanly and the seeded admin user is present.
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
- Login flow is password + OTP (`/auth/login` then `/auth/verify-otp`).
- Seeded admin credentials come from migration defaults:
  `admin@magnus.local / Admin@123` (change in real environments).
- Tests can still read OTP from Mailpit (`http://localhost:8025`) when needed.
