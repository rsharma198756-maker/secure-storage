# Magnus — Implementation Plan v2

## Overview

Transform the current open-registration, OTP-only authentication system into a controlled, admin-managed platform with password-based login + OTP verification, role-based access (admin/editor/viewer), comprehensive audit logging, and configurable session management.

---

## Current State vs Target State

| Feature | Current | Target |
|---|---|---|
| **User Registration** | Self-service (anyone with email) | Admin-only (admin creates users with email + password) |
| **Auth Flow** | Email → OTP → signed in | Email + Password → OTP → signed in |
| **Roles** | `admin`, `user` | `admin`, `editor`, `viewer` |
| **Admin User** | First signup becomes admin | Seeded in database, always exists |
| **Session TTL** | Hardcoded 30min access / 30 day refresh | Configurable via env vars (default 60min / 30 day) |
| **Audit Logs** | Backend logging only | Visible in Admin UI with filtering |
| **Role Permissions** | Fixed per role | Admin can edit permissions per role |

---

## Role & Permission Matrix

| Permission | Admin | Editor | Viewer |
|---|---|---|---|
| `items:read` | ✅ | ✅ | ✅ |
| `items:write` | ✅ | ✅ | ❌ |
| `items:delete` | ✅ | ✅ | ❌ |
| `items:share` | ✅ | ✅ | ❌ |
| `users:manage` | ✅ | ❌ | ❌ |
| `roles:manage` | ✅ | ❌ | ❌ |
| `audit:read` | ✅ | ❌ | ❌ |

---

## Implementation Phases

### Phase 1 — Database Migration
**File:** `db/init/002_passwords_and_roles.sql`

1. Add `password_hash TEXT` column to `users` table
2. Add `audit:read` permission
3. Insert `editor` and `viewer` roles (rename `user` → `editor`)
4. Configure permissions for each role:
   - `viewer`: `items:read` only
   - `editor`: `items:read`, `items:write`, `items:delete`, `items:share`
   - `admin`: all permissions
5. Seed a default admin user:
   - Email: `admin@magnus.local`
   - Password: `Admin@123` (bcrypt hashed)
   - Role: `admin`

### Phase 2 — Gateway Auth Changes
**Files:** `services/gateway/src/auth.ts`, `services/gateway/src/config.ts`, `services/gateway/src/server.ts`, `services/gateway/package.json`

1. **Add bcrypt dependency** for password hashing
2. **`auth.ts`**: Add `hashPassword()` and `verifyPassword()` functions using bcrypt
3. **`config.ts`**: Add `refreshTokenTtlDays` env var (default 30), update `jwtAccessTtlMinutes` default to 60
4. **Auth flow changes** in `server.ts`:
   - `POST /auth/login` (NEW) — validate email + password, return `{ status: "otp_sent" }`
     - Check user exists, is active, password matches
     - Generate and send OTP
     - Return status (and OTP in dev mode)
   - `POST /auth/verify-otp` (MODIFIED) — now requires prior password validation
     - Verify OTP as before, issue tokens
   - Remove `POST /auth/request-otp` (replaced by `/auth/login`)
   - Remove auto-user-creation in OTP verification (admin creates users now)
5. **Admin user creation** in `server.ts`:
   - `POST /admin/users` (NEW) — admin creates user with email, password, role
     - Requires `users:manage` permission
     - Hashes password with bcrypt
     - Assigns specified role
     - Audit logs the creation
6. **Admin password reset**:
   - `POST /admin/users/:id/reset-password` (NEW) — admin resets a user's password
7. **Configurable token TTL**:
   - Use `config.refreshTokenTtlDays` for refresh token expiry calculation
   - Ensure `config.jwtAccessTtlMinutes` is used everywhere

### Phase 3 — Audit Log Enhancements
**File:** `services/gateway/src/server.ts`

1. Ensure ALL actions are audit logged:
   - `auth.login` — user logged in
   - `auth.login_failed` — failed login attempt
   - `auth.logout` — user logged out
   - `auth.refresh` — token refreshed
   - `user.created` — admin created user
   - `user.status_changed` — admin enabled/disabled user
   - `user.role_changed` — role added/removed
   - `user.password_reset` — admin reset password
   - `item.folder_created` — folder created
   - `item.file_created` — file uploaded
   - `item.deleted` — item deleted
   - `item.shared` — sharing grant added
   - `item.unshared` — sharing grant removed
   - `item.downloaded` — file downloaded
2. `GET /admin/audit-logs` — supports pagination and filtering by action, user, date range

### Phase 4 — Admin UI Updates
**Files:** `apps/admin-ui/src/api.ts`, `apps/admin-ui/src/App.tsx`, `apps/admin-ui/src/styles.css`

1. **Login flow** (3-step wizard):
   - Step 1: Enter email
   - Step 2: Enter password
   - Step 3: Enter OTP
2. **Users tab** enhancements:
   - "Create User" button → modal with email, password, role fields
   - Show user role inline
   - Admin can change role, disable/enable, reset password
3. **Audit Logs tab** (NEW):
   - Table showing all activities
   - Columns: Time, User, Action, Target, Details
   - Filter by action type and date range
   - Only visible to admin (via `audit:read` permission check)
4. **Sidebar** update:
   - Add "Audit Logs" nav item (with icon)
   - Only show if user has admin role

### Phase 5 — Docker & Config
**File:** `docker-compose.yml`

1. Add new env vars:
   - `JWT_ACCESS_TTL_MINUTES=60`
   - `REFRESH_TOKEN_TTL_DAYS=30`
   - `ADMIN_EMAIL=admin@magnus.local`
   - `ADMIN_PASSWORD=Admin@123`
2. Ensure Postgres picks up the new migration file

---

## Execution Order

```
Step 1: Database migration (002_passwords_and_roles.sql)
Step 2: Add bcrypt dependency to gateway
Step 3: Update config.ts with new env vars
Step 4: Update auth.ts with password hashing
Step 5: Update server.ts — new auth flow + admin endpoints
Step 6: Update api.ts — new API methods
Step 7: Update App.tsx — new login flow + create user + audit tab
Step 8: Update docker-compose.yml
Step 9: Rebuild & test
```

---

## Auth Flow Diagram

```
User                    Gateway                   Database
  |                        |                         |
  |-- POST /auth/login --> |                         |
  |   (email, password)    |-- Check user exists --> |
  |                        |-- Verify password ----> |
  |                        |-- Generate OTP -------> |
  |                        |-- Send OTP email -----> |
  | <-- { status: "otp_sent" }                       |
  |                        |                         |
  |-- POST /auth/verify-otp ->                       |
  |   (email, otp)         |-- Verify OTP ---------> |
  |                        |-- Issue JWT + refresh -> |
  | <-- { accessToken, refreshToken }                |
```

---

## Security Notes

- Passwords hashed with **bcrypt** (cost factor 12)
- OTP still rate-limited per email and IP
- Failed login attempts are audit-logged
- Admin password should be changed on first setup
- Session TTL configurable but defaults to 60 min for security
