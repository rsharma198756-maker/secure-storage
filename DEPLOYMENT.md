# Magnus — Complete Deployment Reference

> Last updated: 2026-03-03  
> Architecture: Double-protection model across 2 Railway accounts + Cloudflare Pages

---

## 🏗️ Architecture Overview

```
INTERNET
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  securestorage-production.up.railway.app             │
│  GATEWAY SERVICE  (akumar Railway account)           │
│                                                      │
│  Auth: Password → OTP → JWT                         │
│  RBAC: Casbin role/permission checks                │
│  Rate limiting: Redis                               │
│  Audit logging: PostgreSQL                          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
                        │ x-internal-token header
                        │ x-service-authorization (Service JWT, 30s TTL)
                        │ x-user-authorization (forwarded user JWT)
                        ▼
┌─────────────────────────────────────────────────────┐
│  secure-storage-production.up.railway.app            │
│  STORAGE SERVICE  (rsharma Railway account)          │
│                                                      │
│  Re-validates: INTERNAL_TOKEN + Service JWT          │
│  Re-validates: User JWT independently                │
│  Re-checks: RBAC permissions                        │
│  Re-checks: Item ownership/share grants             │
│  Stores files: MinIO (internal network)             │
└─────────────────────────────────────────────────────┘

Admin UI: https://magnus.pages.dev  (Cloudflare Pages, static)
```

---

## 🌐 Live URLs

| Service | URL | Account |
|---|---|---|
| Gateway API | `https://securestorage-production.up.railway.app` | akumar Railway |
| Storage API | `https://secure-storage-production.up.railway.app` | rsharma Railway |
| Admin UI | `https://magnus.pages.dev` | Cloudflare Pages |
| Gateway Health | `https://securestorage-production.up.railway.app/health` | - |
| Gateway Ready | `https://securestorage-production.up.railway.app/ready` | - |

---

## 🚂 Railway — akumar Account (Gateway)

**Account:** `akumar785456-cell`  
**Project:** `endearing-rebirth`  
**Login:** Railway account linked to akumar GitHub

### Services

| Service | Status | Notes |
|---|---|---|
| `securestorage` | 🟢 Online | Gateway, public URL |
| `Postgres` | 🟢 Online | Shared DB for both gateway + storage |
| `Redis` | 🟢 Online | Rate limiting + session cache |

### Gateway Environment Variables
```env
ALLOW_DEV_HEADER=false
BREVO_API_KEY=<set-in-railway-dashboard>
DATABASE_URL=${{Postgres.DATABASE_URL}}
EMAIL_FROM_ADDRESS=guptapayal8820@gmail.com
EMAIL_FROM_NAME=Magnus
INTERNAL_TOKEN=my-super-secret-token-123
JWT_ACCESS_TTL_MINUTES=60
JWT_SECRET=my-jwt-secret-456
OTP_MAX_ATTEMPTS=5
OTP_REQUEST_MAX=20
OTP_REQUEST_WINDOW_SECONDS=60
OTP_SECRET=my-otp-secret-789
OTP_TTL_MINUTES=10
OTP_VERIFY_MAX=20
OTP_VERIFY_WINDOW_SECONDS=60
PORT=3000
REDIS_URL=redis://default:icexnKGbKaIgZFXpLUQZPaZBnPPrZsvp@redis.railway.internal:6379
REFRESH_TOKEN_TTL_DAYS=30
RETURN_OTP_IN_RESPONSE=false
STORAGE_URL=https://secure-storage-production.up.railway.app
SERVICE_JWT_SECRET=gw-storage-super-secret-2024-xK9mP
SERVICE_JWT_ISSUER=secure-gateway
SERVICE_JWT_AUDIENCE=secure-storage
SERVICE_JWT_TTL_SECONDS=30
```

> 📧 **Email:** OTPs are sent via Brevo API. SMTP variables are no longer needed.

### PostgreSQL Connection
- **Internal (Railway):** `${{Postgres.DATABASE_URL}}`
- **Public proxy:** `postgresql://postgres:ZBxapsXAUPQaiErUGtGlFkIsmDcShakJ@yamanote.proxy.rlwy.net:33260/railway`
- **Used by:** Gateway (internal) + Storage (public proxy)

### Redis Connection
- **Internal:** `redis://default:icexnKGbKaIgZFXpLUQZPaZBnPPrZsvp@redis.railway.internal:6379`

---

## 🚂 Railway — rsharma Account (Storage)

**Account:** `rsharma198756-maker`  
**Project:** `resourceful-amazement`  
**GitHub Repo:** `rsharma198756-maker/secure-storage` (mirror of main repo)

### Services

| Service | Status | Notes |
|---|---|---|
| `secure-storage` | 🟢 Online | Storage API, public URL |
| `minio` | 🟢 Online | File storage, private (internal only) |

### Storage Environment Variables
```env
PORT=4000
DATABASE_URL=postgresql://postgres:ZBxapsXAUPQaiErUGtGlFkIsmDcShakJ@yamanote.proxy.rlwy.net:33260/railway
INTERNAL_TOKEN=my-super-secret-token-123
JWT_SECRET=my-jwt-secret-456
SERVICE_JWT_SECRET=gw-storage-super-secret-2024-xK9mP
SERVICE_JWT_ISSUER=secure-gateway
SERVICE_JWT_AUDIENCE=secure-storage
S3_ENDPOINT=http://minio.railway.internal:9000
S3_FORCE_PATH_STYLE=true
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
S3_BUCKET=secure-storage
S3_AUTO_CREATE_BUCKET=true
S3_PUBLIC_ENDPOINT=
```

### MinIO Configuration
- **Internal URL:** `http://minio.railway.internal:9000`
- **Console port:** `9001`
- **Start command:** `minio server /data --console-address :9001`
- **Volume:** `minio-volume` mounted at `/data`
- **Credentials:** `minioadmin` / `minioadmin123`
- **Bucket:** `secure-storage`

---

## 🌍 Netlify — Admin UI

**Site name:** `securestorage`  

### Build Settings (set in UI or netlify.toml)
| Setting | Value |
|---|---|
| Build command | `cd apps/admin-ui && npm install && npm run build` |
| Publish directory | `apps/admin-ui/dist` |
| Base directory | *(empty)* |

### Environment Variables
```env
VITE_API_BASE=https://securestorage-production.up.railway.app
CORS_ORIGINS=https://securestorage.netlify.app
```

> ⚠️ **Important:** VITE_ variables are baked in at **build time**. If you change this, you must redeploy.

---

## 📊 Database Schema

**Location:** akumar Railway → Postgres

| Table | Purpose |
|---|---|
| `users` | User accounts (email, password_hash, status, first_name, last_name) |
| `roles` | Role definitions (admin, editor, viewer) |
| `permissions` | Permission definitions (items:read, items:write, etc.) |
| `role_permissions` | Maps roles to permissions |
| `user_roles` | Maps users to roles |
| `items` | File/folder metadata (name, type, storage_key, size, parent_id) |
| `item_closure` | Recursive folder hierarchy (closure table) |
| `item_grants` | Sharing grants (who can access what) |
| `otp_tokens` | Active OTP codes (10 min TTL) |
| `refresh_tokens` | Active refresh sessions (30 day TTL) |
| `audit_logs` | Full activity audit trail |

### Run Migrations
```bash
node run-migrations.mjs "$DATABASE_URL"
```
> Uses the public Postgres URL. Safe to re-run (idempotent).

---

## 👤 Admin User

| Field | Value |
|---|---|
| Email | `guptapayal8820@gmail.com` |
| Password | `Admin@123` |
| Role | `admin` |
| Permissions | All 7 (items:read/write/delete/share, users:manage, roles:manage, audit:read) |

---

## 🔐 Security Model

### Double Protection Flow
```
Client → Gateway (Layer 1)
  ✅ Password (bcrypt)
  ✅ OTP (SHA-256 hashed, 10 min TTL)
  ✅ JWT access token (60 min)
  ✅ RBAC via Casbin
  ✅ Redis rate limiting
  ✅ Audit logging

Gateway → Storage (Layer 2)
  ✅ INTERNAL_TOKEN header (shared secret)
  ✅ Service JWT (HS256, 30s TTL, signed by gateway)
  ✅ User JWT forwarded and re-verified independently
  ✅ RBAC re-checked against DB
  ✅ Item ownership re-checked
```

### Secret Values (for production rotation)
| Secret | Current Value | Where Used |
|---|---|---|
| `JWT_SECRET` | `ae3343208a1170d43e44bebdc227fd224b046383efa6b563b9e474626ca6faa74365d27171b1e06c402b917280f50953` | Both gateway + storage |
| `INTERNAL_TOKEN` | `95304adfa540f5841eee486fded9fd34aca6b36df504c25db1685873dc889e94` | Both gateway + storage |
| `SERVICE_JWT_SECRET` | `8df255ae18ef9106ff1484e665c1ec4e4275ba18a4c7e7d4ba2737b260fb0b5520f5f74147353e476184f0b4df42fbe5` | Both gateway + storage |
| `OTP_SECRET` | `6f0bd09409f52aefdac267e20da3a1b83178f86599c14f0fbb9f2c73968dfc04` | Gateway only |
| MinIO root password | `minioadmin123` | rsharma MinIO |
| Postgres password | `ZBxapsXAUPQaiErUGtGlFkIsmDcShakJ` | akumar Postgres |

> ⚠️ **Before going to production:** Replace ALL secret values with strong random strings!

---

## 📁 File Storage

### How Files Are Stored
```
Upload path:   Client → Gateway → Storage → MinIO
Download path: Client → Gateway → Storage → MinIO → back to client

Storage key format: items/<uuid-of-item>
MinIO bucket: secure-storage
```

### Where Data Lives
| Data | Location |
|---|---|
| File metadata (name, size, type) | Postgres (akumar) |
| File bytes (actual content) | MinIO (rsharma) |
| User sessions | Redis (akumar) |

---

## 🔄 Deploying Code Changes

### Push to Both Railway Accounts
```bash
# After making changes:
git add -A
git commit -m "your message"
git push origin main           # → akumar Railway auto-deploys gateway
git push storage-deploy main   # → rsharma Railway auto-deploys storage
```

### GitHub Remotes
| Remote | Repo | Deploys |
|---|---|---|
| `origin` | `akumar785456-cell/securestorage` | akumar Railway (gateway) |
| `storage-deploy` | `rsharma198756-maker/secure-storage` | rsharma Railway (storage) |

> **Note:** Both repos carry the full codebase. Railway only deploys the service it's configured for.

### Railway Build Config
| Account | Service | Builder | Dockerfile Path |
|---|---|---|---|
| akumar | `securestorage` | Dockerfile | `services/gateway/Dockerfile` |
| rsharma | `secure-storage` | Dockerfile | `services/storage/Dockerfile` |

---

## 🛠️ Common Tasks

### Test the full API
```bash
# Health check
curl https://securestorage-production.up.railway.app/health
curl https://securestorage-production.up.railway.app/ready

# Login (temporarily set RETURN_OTP_IN_RESPONSE=true on Railway for testing)
curl -X POST https://securestorage-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"guptapayal8820@gmail.com","password":"Admin@123"}'
```

### Create a new user (via API)
```bash
curl -X POST https://securestorage-production.up.railway.app/admin/users \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"Password@123","roles":["viewer"]}'
```

### Check storage service health
```bash
curl -H "x-internal-token: my-super-secret-token-123" \
  https://secure-storage-production.up.railway.app/health
```

---

## ⚠️ Important Notes

1. **RETURN_OTP_IN_RESPONSE** — Set to `false` in production. Only enable temporarily for testing.
2. **Shared PostgreSQL** — Both gateway and storage use the same DB (akumar's Postgres). Don't delete the Postgres service from akumar.
3. **MinIO volume** — The `minio-volume` on rsharma stores all uploaded files. If deleted, all files are lost.
4. **Service JWT TTL** — 30 seconds. This is intentionally short for security.
5. **Railway Trial** — Both Railway accounts are on limited trial (30 days or $5). Upgrade before expiry.
6. **Netlify rebuild** — After any `VITE_` env var change, you must trigger a new Netlify deploy.

---

## 📞 Service URLs Quick Reference

```
Gateway:          https://securestorage-production.up.railway.app
Storage:          https://secure-storage-production.up.railway.app
Admin UI:         https://securestorage.netlify.app
MinIO (internal): http://minio.railway.internal:9000
Postgres (proxy): yamanote.proxy.rlwy.net:33260
```
