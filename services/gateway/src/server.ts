import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { Pool } from "pg";
import crypto from "node:crypto";
import archiver from "archiver";
import { config } from "./config.js";
import {
  generateOtp,
  hashOtp,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  sendOtpEmail,
  signAccessToken,
  signServiceToken,
  verifyAccessToken,
  verifyPassword
} from "./auth.js";
import { getRedis } from "./redis.js";
import {
  findRefreshToken,
  generateRefreshToken,
  hashRefreshToken,
  revokeRefreshToken,
  storeRefreshToken
} from "./refreshTokens.js";
import { hasPermission, invalidateEnforcer } from "./rbac.js";

const app = Fastify({ logger: true });
const pool = new Pool({ connectionString: config.databaseUrl });

const INTERNAL_AUTH_HEADER = "x-internal-token";
const SERVICE_AUTH_HEADER = "x-service-authorization";
const FORWARDED_USER_AUTH_HEADER = "x-user-authorization";

type ItemPermission = "read" | "write" | "delete" | "manage";
const PERMISSION_MAP: Record<ItemPermission, ItemPermission[]> = {
  read: ["read", "write", "delete", "manage"],
  write: ["write", "delete", "manage"],
  delete: ["delete", "manage"],
  manage: ["manage"]
};

const allowedPermissions = (required: ItemPermission) =>
  PERMISSION_MAP[required];

const getUserIdFromHeader = (request: { headers: Record<string, unknown> }) => {
  const header = request.headers["x-user-id"];
  if (!header || Array.isArray(header)) return undefined;
  return header as string;
};

const getUserIdFromAuth = (request: { headers: Record<string, unknown> }) => {
  const auth = request.headers["authorization"];
  if (!auth || Array.isArray(auth)) return undefined;
  const [scheme, token] = (auth as string).split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  try {
    const payload = verifyAccessToken(token);
    return payload.sub;
  } catch {
    return undefined;
  }
};

const getAuthorizationHeader = (request: {
  headers: Record<string, unknown>;
}) => {
  const auth = request.headers["authorization"];
  if (!auth || Array.isArray(auth)) return undefined;
  return auth as string;
};

const makeStorageHeaders = (params: {
  scope: string;
  userId?: string;
  authorization?: string;
}) => {
  const headers: Record<string, string> = {
    [INTERNAL_AUTH_HEADER]: config.internalToken,
    [SERVICE_AUTH_HEADER]: `Bearer ${signServiceToken({
      kind: params.userId ? "user" : "system",
      scope: params.scope,
      userId: params.userId
    })}`
  };

  if (params.authorization) {
    headers[FORWARDED_USER_AUTH_HEADER] = params.authorization;
  }

  return headers;
};

const storageFetch = (
  path: string,
  init: RequestInit,
  context: {
    scope: string;
    userId?: string;
    authorization?: string;
  }
) =>
  fetch(`${config.storageUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...makeStorageHeaders(context)
    }
  });

app.register(cors, {
  origin: (origin, cb) => {
    // No origin = server-to-server or same-origin — always allow
    if (!origin) { cb(null, true); return; }
    // If no allowlist configured, allow all (dev/local mode)
    if (config.corsOrigins.length === 0) { cb(null, true); return; }
    // Check against explicit allowlist
    cb(null, config.corsOrigins.includes(origin));
  },
  allowedHeaders: ["Authorization", "Content-Type", "X-File-Name"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});

app.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => {
  done(null, body);
});

// Password complexity validator
const validatePassword = (password: string): string | null => {
  if (!password || password.length < 8) return "password_min_8_chars";
  if (!/[A-Z]/.test(password)) return "password_needs_uppercase";
  if (!/[a-z]/.test(password)) return "password_needs_lowercase";
  if (!/[0-9]/.test(password)) return "password_needs_number";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    return "password_needs_special_char";
  return null;
};

app.addHook("preHandler", async (request, reply) => {
  if (
    request.url.startsWith("/health") ||
    request.url.startsWith("/ready") ||
    request.url.startsWith("/internal/") ||
    request.url.startsWith("/auth/")
  ) {
    return;
  }

  const userId = getUserIdFromAuth(request) ??
    (config.allowDevHeader ? getUserIdFromHeader(request) : undefined);

  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }
  const active = await ensureActiveUser(userId);
  if (!active) {
    reply.code(403).send({ error: "user_disabled" });
    return;
  }
  request.userId = userId;
});

const requirePermission = async (
  request: { userId?: string },
  reply: any,
  permissionKey: string
) => {
  const userId = request.userId;
  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }
  const ok = await hasPermission(pool, userId, permissionKey);
  if (!ok) {
    reply.code(403).send({ error: "forbidden" });
    return false;
  }
  return true;
};

const ensureActiveUser = async (userId: string) => {
  const res = await pool.query("SELECT status FROM users WHERE id = $1", [userId]);
  if (!res.rowCount || res.rowCount === 0) return false;
  return res.rows[0].status === "active";
};

const writeAuditLog = async (params: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        params.actorUserId ?? null,
        params.action,
        params.targetType,
        params.targetId ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null
      ]
    );
  } catch (error) {
    app.log.error({ err: error }, "audit_log_failed");
  }
};

const normalizeName = (name: string) => name.trim();

const validateName = (name: string) => {
  const trimmed = normalizeName(name);
  if (!trimmed) return "name_required";
  if (trimmed.length > config.maxNameLength) return "name_too_long";
  if (trimmed.includes("/")) return "invalid_name";
  return null;
};

const sanitizePathSegment = (value: string) => {
  const cleaned = value.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "untitled";
};

const sanitizeArchivePath = (relativePath: string) =>
  relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => sanitizePathSegment(segment))
    .join("/");

const toContentDispositionFilename = (filename: string) =>
  encodeURIComponent(filename);

const guessContentTypeFromName = (name: string) => {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    html: "text/html; charset=utf-8",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
  return contentTypes[ext];
};

const resolveContentType = (name: string, value?: string | null) => {
  const current = (value ?? "").toLowerCase();
  if (current && current !== "application/octet-stream") {
    return value;
  }
  return guessContentTypeFromName(name) ?? value ?? "application/octet-stream";
};

app.get("/health", async () => ({ status: "ok" }));

app.get("/ready", async (_request, reply) => {
  const checks = { db: false, redis: false, storage: false };
  try {
    await pool.query("SELECT 1");
    checks.db = true;
  } catch {
    checks.db = false;
  }

  try {
    const redis = await getRedis();
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  try {
    const res = await storageFetch(
      "/health",
      { method: "GET" },
      { scope: "health.check" }
    );
    checks.storage = res.ok;
  } catch {
    checks.storage = false;
  }

  const ok = checks.db && checks.redis && checks.storage;
  reply.code(ok ? 200 : 503).send({ status: ok ? "ok" : "degraded", checks });
});

app.get("/internal/storage-health", async (_request, reply) => {
  try {
    const res = await storageFetch(
      "/health",
      { method: "GET" },
      { scope: "health.proxy" }
    );
    const body = await res.json().catch(() => ({}));
    reply.code(res.status).send(body);
  } catch (_error) {
    reply.code(502).send({ error: "storage_unreachable" });
  }
});

const shouldLimit = async (key: string, max: number, windowSeconds: number) => {
  const redis = await getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count > max;
};

const otpRequestLimiter = async (email: string, ip?: string) => {
  const limitEmail = await shouldLimit(
    `otp:req:email:${email}`,
    config.otpRequestMax,
    config.otpRequestWindowSeconds
  );
  if (limitEmail) return true;

  if (ip) {
    return shouldLimit(
      `otp:req:ip:${ip}`,
      config.otpRequestMax,
      config.otpRequestWindowSeconds
    );
  }
  return false;
};

const otpVerifyLimiter = async (email: string, ip?: string) => {
  const limitEmail = await shouldLimit(
    `otp:verify:email:${email}`,
    config.otpVerifyMax,
    config.otpVerifyWindowSeconds
  );
  if (limitEmail) return true;

  if (ip) {
    return shouldLimit(
      `otp:verify:ip:${ip}`,
      config.otpVerifyMax,
      config.otpVerifyWindowSeconds
    );
  }
  return false;
};

const getUserProfile = async (userId: string) => {
  const userRes = await pool.query(
    "SELECT first_name, last_name FROM users WHERE id = $1",
    [userId]
  );
  const user = userRes.rows[0];

  const rolesRes = await pool.query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [userId]
  );
  const roles = rolesRes.rows.map((r: { name: string }) => r.name);

  const permsRes = await pool.query(
    `SELECT DISTINCT p.key FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  const permissions = permsRes.rows.map((p: { key: string }) => p.key);

  return {
    roles,
    permissions,
    firstName: user?.first_name ?? "",
    lastName: user?.last_name ?? ""
  };
};

const issueTokens = async (params: {
  userId: string;
  email: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) => {
  const access = signAccessToken(params.userId, params.email);
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await storeRefreshToken(pool, {
    userId: params.userId,
    tokenHash: refreshHash,
    expiresAt,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress
  });

  const profile = await getUserProfile(params.userId);

  return {
    accessToken: access.token,
    accessExpiresInMinutes: access.expiresInMinutes,
    refreshToken,
    refreshExpiresAt: expiresAt.toISOString(),
    user: {
      id: params.userId,
      email: params.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      roles: profile.roles,
      permissions: profile.permissions
    }
  };
};

app.post("/auth/login", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  if (!body?.email || !body?.password) {
    reply.code(400).send({ error: "email_and_password_required" });
    return;
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    reply.code(400).send({ error: "invalid_email" });
    return;
  }

  const isLimited = await otpRequestLimiter(email, request.ip);
  if (isLimited) {
    reply.code(429).send({ error: "rate_limited" });
    return;
  }

  // Check user exists and is active
  const userRes = await pool.query(
    "SELECT id, password_hash, status FROM users WHERE email = $1",
    [email]
  );

  if (userRes.rowCount === 0) {
    // Don't reveal whether email exists — still delay
    await writeAuditLog({
      actorUserId: null,
      action: "auth.login_failed",
      targetType: "user",
      metadata: { email, reason: "not_found" }
    });
    reply.code(401).send({ error: "invalid_credentials" });
    return;
  }

  const user = userRes.rows[0];
  if (user.status !== "active") {
    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.login_failed",
      targetType: "user",
      targetId: user.id,
      metadata: { reason: "disabled" }
    });
    reply.code(403).send({ error: "user_disabled" });
    return;
  }

  if (!user.password_hash) {
    reply.code(401).send({ error: "password_not_set" });
    return;
  }

  const passwordValid = await verifyPassword(body.password, user.password_hash);
  if (!passwordValid) {
    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.login_failed",
      targetType: "user",
      targetId: user.id,
      metadata: { reason: "wrong_password" }
    });
    reply.code(401).send({ error: "invalid_credentials" });
    return;
  }

  // Password valid — send OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

  await pool.query(
    "UPDATE otp_tokens SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL",
    [email]
  );

  await pool.query(
    `INSERT INTO otp_tokens (email, otp_hash, expires_at) VALUES ($1,$2,$3)`,
    [email, otpHash, expiresAt]
  );

  try {
    await sendOtpEmail(email, otp);
  } catch (error: any) {
    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.login_failed",
      targetType: "user",
      targetId: user.id,
      metadata: { reason: "otp_email_send_failed", error: error?.message ?? "unknown" }
    });
    reply.code(502).send({ error: "otp_email_send_failed" });
    return;
  }

  const payload: { status: string; otp?: string } = { status: "otp_sent" };
  if (config.returnOtpInResponse) {
    payload.otp = otp;
  }
  reply.send(payload);
});

app.post("/auth/verify-otp", async (request, reply) => {
  const body = request.body as { email?: string; otp?: string };
  if (!body?.email || !body?.otp) {
    reply.code(400).send({ error: "invalid_payload" });
    return;
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    reply.code(400).send({ error: "invalid_email" });
    return;
  }

  const isLimited = await otpVerifyLimiter(email, request.ip);
  if (isLimited) {
    reply.code(429).send({ error: "rate_limited" });
    return;
  }

  const tokenRes = await pool.query(
    `
    SELECT id, otp_hash, expires_at, attempts
    FROM otp_tokens
    WHERE email = $1 AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email]
  );

  if (tokenRes.rowCount === 0) {
    reply.code(400).send({ error: "otp_not_found" });
    return;
  }

  const tokenRow = tokenRes.rows[0];
  if (tokenRow.attempts >= config.otpMaxAttempts) {
    reply.code(400).send({ error: "otp_attempts_exceeded" });
    return;
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    reply.code(400).send({ error: "otp_expired" });
    return;
  }

  const otpHash = hashOtp(body.otp);
  if (otpHash !== tokenRow.otp_hash) {
    await pool.query(
      "UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1",
      [tokenRow.id]
    );
    reply.code(400).send({ error: "otp_invalid" });
    return;
  }

  await pool.query(
    "UPDATE otp_tokens SET consumed_at = now() WHERE id = $1",
    [tokenRow.id]
  );

  // User must already exist (created by admin, no auto-registration)
  const userRes = await pool.query(
    "SELECT id, status FROM users WHERE email = $1",
    [email]
  );

  if (userRes.rowCount === 0) {
    reply.code(400).send({ error: "user_not_found" });
    return;
  }

  const userId = userRes.rows[0].id;
  if (userRes.rows[0].status !== "active") {
    reply.code(403).send({ error: "user_disabled" });
    return;
  }

  // Mark email as verified if not already
  await pool.query(
    "UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1",
    [userId]
  );

  const tokens = await issueTokens({
    userId,
    email,
    userAgent: request.headers["user-agent"] as string | undefined,
    ipAddress: request.ip
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "auth.login",
    targetType: "user",
    targetId: userId,
    metadata: { method: "password_otp" }
  });

  reply.send(tokens);
});

app.post("/auth/refresh", async (request, reply) => {
  const body = request.body as { refreshToken?: string };
  if (!body?.refreshToken) {
    reply.code(400).send({ error: "refresh_token_required" });
    return;
  }

  const refreshHash = hashRefreshToken(body.refreshToken);
  const record = await findRefreshToken(pool, refreshHash);

  if (!record || record.revoked_at) {
    reply.code(401).send({ error: "invalid_refresh_token" });
    return;
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    reply.code(401).send({ error: "refresh_token_expired" });
    return;
  }

  await revokeRefreshToken(pool, refreshHash);

  const userRes = await pool.query(
    "SELECT email, status FROM users WHERE id = $1",
    [record.user_id]
  );
  if (userRes.rowCount === 0) {
    reply.code(401).send({ error: "invalid_user" });
    return;
  }
  if (userRes.rows[0].status !== "active") {
    reply.code(403).send({ error: "user_disabled" });
    return;
  }

  const tokens = await issueTokens({
    userId: record.user_id,
    email: userRes.rows[0].email,
    userAgent: request.headers["user-agent"] as string | undefined,
    ipAddress: request.ip
  });

  await writeAuditLog({
    actorUserId: record.user_id,
    action: "auth.refresh",
    targetType: "user",
    targetId: record.user_id
  });

  reply.send(tokens);
});

app.post("/auth/logout", async (request, reply) => {
  const body = request.body as { refreshToken?: string };
  if (!body?.refreshToken) {
    reply.code(400).send({ error: "refresh_token_required" });
    return;
  }
  const refreshHash = hashRefreshToken(body.refreshToken);
  const record = await findRefreshToken(pool, refreshHash);
  await revokeRefreshToken(pool, refreshHash);
  if (record) {
    await writeAuditLog({
      actorUserId: record.user_id,
      action: "auth.logout",
      targetType: "user",
      targetId: record.user_id
    });
  }
  reply.send({ status: "ok" });
});

// Get current user profile
app.get("/auth/me", async (request, reply) => {
  const userId = getUserIdFromAuth(request) ??
    (config.allowDevHeader ? getUserIdFromHeader(request) : undefined);
  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }

  const userRes = await pool.query(
    "SELECT id, email, status FROM users WHERE id = $1",
    [userId]
  );
  if (userRes.rowCount === 0) {
    reply.code(401).send({ error: "invalid_user" });
    return;
  }
  if (userRes.rows[0].status !== "active") {
    reply.code(403).send({ error: "user_disabled" });
    return;
  }

  const profile = await getUserProfile(userId);
  reply.send({
    id: userId,
    email: userRes.rows[0].email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    roles: profile.roles,
    permissions: profile.permissions
  });
});

app.get("/admin/users", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const res = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.created_at,
            COALESCE(
              (
                SELECT json_agg(r.name)
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id
                  AND r.name IN ('viewer', 'editor')
              ),
              '[]'
            ) AS roles
     FROM users u ORDER BY u.created_at DESC`
  );
  reply.send(res.rows);
});

// Create a new user (admin only)
app.post("/admin/users", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const body = request.body as {
    email?: string;
    password?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  };
  if (!body?.email || !body?.password) {
    reply.code(400).send({ error: "email_and_password_required" });
    return;
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    reply.code(400).send({ error: "invalid_email" });
    return;
  }

  const pwError = validatePassword(body.password);
  if (pwError) {
    reply.code(400).send({ error: pwError });
    return;
  }

  // Check email uniqueness
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if ((existing.rowCount ?? 0) > 0) {
    reply.code(409).send({ error: "email_already_exists" });
    return;
  }

  const passwordHash = await hashPassword(body.password);
  const insertRes = await pool.query(
    `INSERT INTO users (email, password_hash, status, first_name, last_name, email_verified_at)
     VALUES ($1, $2, 'active', $3, $4, now())
     RETURNING id`,
    [email, passwordHash, body.firstName ?? "", body.lastName ?? ""]
  );
  const newUserId = insertRes.rows[0].id;

  // Assign role (default to 'viewer')
  // Only allow creating editor or viewer — admin creation is restricted
  const roleName = body.role && ["editor", "viewer"].includes(body.role) ? body.role : "viewer";
  const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1 LIMIT 1", [roleName]);
  if (roleRes.rowCount && roleRes.rowCount > 0) {
    await pool.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [newUserId, roleRes.rows[0].id]
    );
    invalidateEnforcer();
  }

  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.created",
    targetType: "user",
    targetId: newUserId,
    metadata: { email, role: roleName }
  });

  reply.send({ id: newUserId, email, status: "active", role: roleName });
});

// Update user profile fields (admin only)
app.patch("/admin/users/:id", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const { id } = request.params as { id: string };
  const body = request.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
  };

  const updates: string[] = [];
  const params: (string | number)[] = [];
  const metadata: Record<string, string> = {};

  if (body?.email !== undefined) {
    const normalizedEmail = normalizeEmail(body.email);
    if (!isValidEmail(normalizedEmail)) {
      reply.code(400).send({ error: "invalid_email" });
      return;
    }
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
      [normalizedEmail, id]
    );
    if ((existing.rowCount ?? 0) > 0) {
      reply.code(409).send({ error: "email_already_exists" });
      return;
    }
    params.push(normalizedEmail);
    updates.push(`email = $${params.length}`);
    metadata.email = normalizedEmail;
  }

  if (body?.firstName !== undefined) {
    const firstName = body.firstName.trim();
    params.push(firstName);
    updates.push(`first_name = $${params.length}`);
    metadata.firstName = firstName;
  }

  if (body?.lastName !== undefined) {
    const lastName = body.lastName.trim();
    params.push(lastName);
    updates.push(`last_name = $${params.length}`);
    metadata.lastName = lastName;
  }

  if (updates.length === 0) {
    reply.code(400).send({ error: "no_fields_to_update" });
    return;
  }

  params.push(id);
  const res = await pool.query(
    `
    UPDATE users
    SET ${updates.join(", ")}, updated_at = now()
    WHERE id = $${params.length}
    RETURNING id, email, first_name, last_name, status, created_at
    `,
    params
  );

  if ((res.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "user_not_found" });
    return;
  }

  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.profile.update",
    targetType: "user",
    targetId: id,
    metadata
  });

  reply.send(res.rows[0]);
});

// Remove user account (admin only)
app.delete("/admin/users/:id", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const { id } = request.params as { id: string };
  if (request.userId === id) {
    reply.code(400).send({ error: "cannot_delete_self" });
    return;
  }

  const client = await pool.connect();
  let targetEmail: string | null = null;

  try {
    await client.query("BEGIN");

    const targetRes = await client.query(
      `
      SELECT
        u.email,
        EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id
            AND r.name = 'admin'
        ) AS is_admin
      FROM users u
      WHERE u.id = $1
      LIMIT 1
      `,
      [id]
    );

    if ((targetRes.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      reply.code(404).send({ error: "user_not_found" });
      return;
    }

    const target = targetRes.rows[0] as { email: string; is_admin: boolean };
    targetEmail = target.email;

    if (target.is_admin) {
      const adminCountRes = await client.query(
        `
        SELECT COUNT(DISTINCT ur.user_id)::int AS total
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        `
      );
      const adminCount = Number(adminCountRes.rows[0]?.total ?? 0);
      if (adminCount <= 1) {
        await client.query("ROLLBACK");
        reply.code(400).send({ error: "cannot_delete_last_admin" });
        return;
      }
    }

    // Remove grants explicitly assigned to this user on other users' items.
    await client.query(
      "DELETE FROM item_grants WHERE subject_type = 'user' AND subject_id = $1",
      [id]
    );

    // Keep audit history while removing user by detaching actor references.
    await client.query("UPDATE audit_logs SET actor_user_id = NULL WHERE actor_user_id = $1", [id]);

    const deleteRes = await client.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    );
    if ((deleteRes.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      reply.code(404).send({ error: "user_not_found" });
      return;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  invalidateEnforcer();
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.deleted",
    targetType: "user",
    targetId: id,
    metadata: targetEmail ? { email: targetEmail } : undefined
  });

  reply.send({ status: "ok" });
});

// Reset user password (admin only)
app.post("/admin/users/:id/reset-password", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const { id } = request.params as { id: string };
  const body = request.body as { password?: string };
  const pwErr = validatePassword(body?.password ?? "");
  if (pwErr) {
    reply.code(400).send({ error: pwErr });
    return;
  }

  const passwordHash = await hashPassword(body.password!);
  const res = await pool.query(
    "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING id",
    [passwordHash, id]
  );
  if ((res.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "user_not_found" });
    return;
  }

  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.password_reset",
    targetType: "user",
    targetId: id
  });

  reply.send({ status: "ok" });
});

// Audit logs (admin only)
app.get("/admin/audit-logs", async (request, reply) => {
  if (!(await requirePermission(request, reply, "audit:read"))) return;

  const query = request.query as { limit?: string; offset?: string; action?: string; userId?: string };
  const limit = Math.min(Number(query.limit ?? 50), 200);
  const offset = Number(query.offset ?? 0);

  let sql = `
    SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
           u.email AS actor_email
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_user_id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query.action) {
    params.push(query.action);
    conditions.push(`a.action = $${params.length}`);
  }
  if (query.userId) {
    params.push(query.userId);
    conditions.push(`a.actor_user_id = $${params.length}`);
  }

  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY a.created_at DESC";
  params.push(limit);
  sql += ` LIMIT $${params.length}`;
  params.push(offset);
  sql += ` OFFSET $${params.length}`;

  const res = await pool.query(sql, params);
  reply.send(res.rows);
});

app.get("/admin/dashboard", async (request, reply) => {
  if (!(await requirePermission(request, reply, "audit:read"))) return;

  const [
    usersRes,
    rolesRes,
    permissionsRes,
    itemsRes,
    grantsRes,
    last24hRes,
    topActionsRes,
    recentAuditRes
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled
      FROM users
      `
    ),
    pool.query("SELECT COUNT(*)::int AS total FROM roles"),
    pool.query("SELECT COUNT(*)::int AS total FROM permissions"),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS total_active,
        COUNT(*) FILTER (WHERE status = 'active' AND type = 'file')::int AS files,
        COUNT(*) FILTER (WHERE status = 'active' AND type = 'folder')::int AS folders,
        COUNT(*) FILTER (WHERE status = 'deleted')::int AS deleted
      FROM items
      `
    ),
    pool.query("SELECT COUNT(*)::int AS total FROM item_grants"),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE action = 'auth.login')::int AS logins,
        COUNT(*) FILTER (WHERE action = 'auth.login_failed')::int AS login_failed,
        COUNT(*) FILTER (WHERE action = 'item.upload')::int AS uploads,
        COUNT(*) FILTER (WHERE action = 'item.download')::int AS downloads
      FROM audit_logs
      WHERE created_at >= now() - interval '24 hours'
      `
    ),
    pool.query(
      `
      SELECT action, COUNT(*)::int AS count
      FROM audit_logs
      WHERE created_at >= now() - interval '7 days'
      GROUP BY action
      ORDER BY count DESC, action ASC
      LIMIT 8
      `
    ),
    pool.query(
      `
      SELECT
        a.id,
        a.action,
        a.target_type,
        a.target_id,
        a.metadata,
        a.created_at,
        u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC
      LIMIT 12
      `
    )
  ]);

  reply.send({
    users: usersRes.rows[0],
    roles: rolesRes.rows[0],
    permissions: permissionsRes.rows[0],
    items: itemsRes.rows[0],
    shares: grantsRes.rows[0],
    activityLast24h: last24hRes.rows[0],
    topActions7d: topActionsRes.rows,
    recentAudit: recentAuditRes.rows
  });
});

app.get("/dashboard", async (request, reply) => {
  const userId = request.userId;
  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }

  const profile = await getUserProfile(userId);
  const primaryRole =
    profile.roles.includes("admin")
      ? "admin"
      : profile.roles.includes("editor")
        ? "editor"
        : profile.roles.includes("viewer")
          ? "viewer"
          : profile.roles[0] ?? "viewer";

  const [
    itemsRes,
    activityRes,
    topActionsRes,
    recentActivityRes
  ] = await Promise.all([
    pool.query(
      `
      WITH accessible AS (
        SELECT DISTINCT i.id, i.type, i.owner_user_id
        FROM items i
        LEFT JOIN item_closure ic ON ic.descendant_id = i.id
        LEFT JOIN item_grants ig ON ig.item_id = ic.ancestor_id
          AND ig.permission = ANY($2)
        LEFT JOIN user_roles ur
          ON ur.user_id = $1
          AND ig.subject_type = 'role'
          AND ur.role_id = ig.subject_id
        WHERE i.status = 'active'
          AND (
            i.owner_user_id = $1 OR
            (ig.subject_type = 'user' AND ig.subject_id = $1) OR
            (ig.subject_type = 'role' AND ur.user_id IS NOT NULL)
          )
      )
      SELECT
        COUNT(*)::int AS total_accessible,
        COUNT(*) FILTER (WHERE type = 'file')::int AS files,
        COUNT(*) FILTER (WHERE type = 'folder')::int AS folders,
        COUNT(*) FILTER (WHERE owner_user_id = $1)::int AS owned,
        COUNT(*) FILTER (WHERE owner_user_id <> $1)::int AS shared_with_me
      FROM accessible
      `,
      [userId, allowedPermissions("read")]
    ),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE action = 'auth.login')::int AS logins,
        COUNT(*) FILTER (WHERE action = 'item.upload')::int AS uploads,
        COUNT(*) FILTER (WHERE action = 'item.download')::int AS downloads,
        COUNT(*) FILTER (WHERE action = 'item.update')::int AS updates,
        COUNT(*) FILTER (WHERE action = 'item.delete')::int AS deletes,
        COUNT(*) FILTER (WHERE action LIKE 'item.share.%')::int AS shares
      FROM audit_logs
      WHERE actor_user_id = $1
        AND created_at >= now() - interval '24 hours'
      `,
      [userId]
    ),
    pool.query(
      `
      SELECT action, COUNT(*)::int AS count
      FROM audit_logs
      WHERE actor_user_id = $1
        AND created_at >= now() - interval '7 days'
      GROUP BY action
      ORDER BY count DESC, action ASC
      LIMIT 8
      `,
      [userId]
    ),
    pool.query(
      `
      SELECT
        a.id,
        a.action,
        a.target_type,
        a.target_id,
        a.metadata,
        a.created_at,
        u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.actor_user_id = $1
      ORDER BY a.created_at DESC
      LIMIT 12
      `,
      [userId]
    )
  ]);

  reply.send({
    role: primaryRole,
    permissions: profile.permissions,
    items: itemsRes.rows[0],
    activityLast24h: activityRes.rows[0],
    topActions7d: topActionsRes.rows,
    recentActivity: recentActivityRes.rows
  });
});

app.patch("/admin/users/:id/status", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;
  const { id } = request.params as { id: string };
  const body = request.body as { status?: "active" | "disabled" };
  if (!body?.status || !["active", "disabled"].includes(body.status)) {
    reply.code(400).send({ error: "invalid_status" });
    return;
  }
  if (request.userId === id && body.status === "disabled") {
    reply.code(400).send({ error: "cannot_disable_self" });
    return;
  }

  await pool.query("UPDATE users SET status = $1 WHERE id = $2", [
    body.status,
    id
  ]);
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.status.update",
    targetType: "user",
    targetId: id,
    metadata: { status: body.status }
  });
  reply.send({ status: "ok" });
});

app.post("/admin/users/:id/reset-roles", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;
  const { id } = request.params as { id: string };

  await pool.query("DELETE FROM user_roles WHERE user_id = $1", [id]);
  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE name = 'viewer' LIMIT 1"
  );
  if (roleRes.rowCount !== null && roleRes.rowCount > 0) {
    await pool.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)",
      [id, roleRes.rows[0].id]
    );
  }
  invalidateEnforcer();
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.roles.reset",
    targetType: "user",
    targetId: id
  });
  reply.send({ status: "ok" });
});

app.put("/admin/users/:id/role", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const { id } = request.params as { id: string };
  const body = request.body as { roleId?: string };
  if (!body?.roleId) {
    reply.code(400).send({ error: "role_id_required" });
    return;
  }

  const userRes = await pool.query("SELECT id FROM users WHERE id = $1 LIMIT 1", [id]);
  if ((userRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "user_not_found" });
    return;
  }

  const roleRes = await pool.query("SELECT id, name FROM roles WHERE id = $1 LIMIT 1", [body.roleId]);
  if ((roleRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "role_not_found" });
    return;
  }

  const roleName = roleRes.rows[0].name as string;
  if (!["viewer", "editor"].includes(roleName)) {
    reply.code(400).send({ error: "role_not_assignable" });
    return;
  }

  const isAdminRes = await pool.query(
    `
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
      AND r.name = 'admin'
    LIMIT 1
    `,
    [id]
  );
  if ((isAdminRes.rowCount ?? 0) > 0) {
    reply.code(400).send({ error: "cannot_modify_admin_user_roles" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      DELETE FROM user_roles
      WHERE user_id = $1
        AND role_id IN (
          SELECT id FROM roles WHERE name IN ('viewer', 'editor', 'user')
        )
      `,
      [id]
    );
    await client.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [id, body.roleId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  invalidateEnforcer();
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.role.set",
    targetType: "user",
    targetId: id,
    metadata: { roleId: body.roleId, roleName }
  });

  reply.send({ status: "ok", role: roleName });
});

app.get("/admin/roles", async (request, reply) => {
  if (!(await requirePermission(request, reply, "roles:manage"))) return;
  const res = await pool.query(
    "SELECT id, name, description FROM roles ORDER BY name ASC"
  );
  reply.send(res.rows);
});

app.get("/admin/permissions", async (request, reply) => {
  if (!(await requirePermission(request, reply, "roles:manage"))) return;
  const res = await pool.query(
    "SELECT id, key, description FROM permissions ORDER BY key ASC"
  );
  reply.send(res.rows);
});

// Role-permission matrix for the Permissions page
app.get("/admin/role-permissions", async (request, reply) => {
  if (!(await requirePermission(request, reply, "roles:manage"))) return;

  const res = await pool.query(`
    SELECT r.name AS role_name, array_agg(p.key ORDER BY p.key) AS permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    GROUP BY r.name
    ORDER BY r.name
  `);
  reply.send(res.rows);
});

app.patch("/admin/roles/:id/permissions", async (request, reply) => {
  if (!(await requirePermission(request, reply, "roles:manage"))) return;

  const { id } = request.params as { id: string };
  const body = request.body as { permissionIds?: string[] };

  if (!Array.isArray(body?.permissionIds)) {
    reply.code(400).send({ error: "permission_ids_required" });
    return;
  }

  const permissionIds = Array.from(
    new Set(body.permissionIds.filter((value) => typeof value === "string" && value.trim().length > 0))
  );

  const roleRes = await pool.query(
    "SELECT id, name FROM roles WHERE id = $1 LIMIT 1",
    [id]
  );
  if ((roleRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "role_not_found" });
    return;
  }
  const roleName = roleRes.rows[0].name as string;
  if (!["viewer", "editor"].includes(roleName)) {
    reply.code(400).send({ error: "role_not_assignable" });
    return;
  }

  if (permissionIds.length > 0) {
    const validPermsRes = await pool.query(
      "SELECT id FROM permissions WHERE id = ANY($1::uuid[])",
      [permissionIds]
    );
    if ((validPermsRes.rowCount ?? 0) !== permissionIds.length) {
      reply.code(400).send({ error: "invalid_permission_ids" });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions WHERE role_id = $1", [id]);
    if (permissionIds.length > 0) {
      await client.query(
        `
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT $1, permission_id
        FROM UNNEST($2::uuid[]) AS t(permission_id)
        ON CONFLICT DO NOTHING
        `,
        [id, permissionIds]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  invalidateEnforcer();
  await writeAuditLog({
    actorUserId: request.userId,
    action: "role.permissions.update",
    targetType: "role",
    targetId: id,
    metadata: {
      roleName,
      permissionCount: permissionIds.length
    }
  });

  reply.send({ status: "ok" });
});

app.get("/admin/users/:id/roles", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;
  const { id } = request.params as { id: string };
  const res = await pool.query(
    `
    SELECT r.id, r.name
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
      AND r.name IN ('viewer', 'editor')
    `,
    [id]
  );
  reply.send(res.rows);
});

app.post("/admin/users/:id/roles", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;
  const { id } = request.params as { id: string };
  const body = request.body as { roleId?: string };
  if (!body?.roleId) {
    reply.code(400).send({ error: "role_id_required" });
    return;
  }

  const userRes = await pool.query("SELECT id FROM users WHERE id = $1 LIMIT 1", [id]);
  if ((userRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "user_not_found" });
    return;
  }

  const roleRes = await pool.query("SELECT id, name FROM roles WHERE id = $1 LIMIT 1", [body.roleId]);
  if ((roleRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "role_not_found" });
    return;
  }

  const roleName = roleRes.rows[0].name as string;
  if (!["viewer", "editor"].includes(roleName)) {
    reply.code(400).send({ error: "role_not_assignable" });
    return;
  }
  await pool.query(
    `
    INSERT INTO user_roles (user_id, role_id)
    VALUES ($1,$2)
    ON CONFLICT DO NOTHING
    `,
    [id, body.roleId]
  );
  invalidateEnforcer();
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.role.add",
    targetType: "user",
    targetId: id,
    metadata: { roleId: body.roleId, roleName }
  });
  reply.code(201).send({ status: "ok" });
});

app.delete("/admin/users/:id/roles", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;
  const { id } = request.params as { id: string };
  const body = request.body as { roleId?: string };
  if (!body?.roleId) {
    reply.code(400).send({ error: "role_id_required" });
    return;
  }

  const userRes = await pool.query("SELECT id FROM users WHERE id = $1 LIMIT 1", [id]);
  if ((userRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "user_not_found" });
    return;
  }

  const roleRes = await pool.query("SELECT id, name FROM roles WHERE id = $1 LIMIT 1", [body.roleId]);
  if ((roleRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "role_not_found" });
    return;
  }

  const roleName = roleRes.rows[0].name as string;
  if (!["viewer", "editor"].includes(roleName)) {
    reply.code(400).send({ error: "role_not_assignable" });
    return;
  }

  const deleteRes = await pool.query(
    "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING user_id",
    [id, body.roleId]
  );
  if ((deleteRes.rowCount ?? 0) === 0) {
    reply.code(400).send({ error: "role_not_assigned" });
    return;
  }

  invalidateEnforcer();
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.role.remove",
    targetType: "user",
    targetId: id,
    metadata: { roleId: body.roleId, roleName }
  });
  reply.send({ status: "ok" });
});

const isOwner = async (userId: string, itemId: string) => {
  const res = await pool.query(
    "SELECT owner_user_id FROM items WHERE id = $1 AND status = 'active'",
    [itemId]
  );
  if (res.rowCount === 0) return { exists: false, owner: false };
  return { exists: true, owner: res.rows[0].owner_user_id === userId };
};

const hasItemPermission = async (
  userId: string,
  itemId: string,
  required: ItemPermission
) => {
  const ownerCheck = await isOwner(userId, itemId);
  if (!ownerCheck.exists) return false;
  if (ownerCheck.owner) return true;

  const allowed = allowedPermissions(required);
  const res = await pool.query(
    `
    SELECT 1
    FROM item_closure ic
    JOIN item_grants ig ON ig.item_id = ic.ancestor_id
    LEFT JOIN user_roles ur
      ON ur.user_id = $1
      AND ig.subject_type = 'role'
      AND ur.role_id = ig.subject_id
    WHERE ic.descendant_id = $2
      AND ig.permission = ANY($3)
      AND (
        (ig.subject_type = 'user' AND ig.subject_id = $1) OR
        (ig.subject_type = 'role' AND ur.user_id IS NOT NULL)
      )
    LIMIT 1
    `,
    [userId, itemId, allowed]
  );
  return (res.rowCount ?? 0) > 0;
};

const createItem = async (params: {
  id?: string;
  ownerUserId: string;
  parentId?: string | null;
  type: "folder" | "file";
  name: string;
  storageKey?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
}) => {
  const client = await pool.connect();
  const id = params.id ?? crypto.randomUUID();
  const storageKey = params.storageKey ?? null;
  const contentType = params.contentType ?? null;
  const sizeBytes = params.sizeBytes ?? null;

  try {
    await client.query("BEGIN");

    if (params.parentId) {
      const parent = await client.query(
        "SELECT id, type FROM items WHERE id = $1 AND status = 'active'",
        [params.parentId]
      );
      if (parent.rowCount === 0) {
        throw new Error("parent_not_found");
      }
      if (parent.rows[0].type !== "folder") {
        throw new Error("parent_not_folder");
      }
    }

    const insertRes = await client.query(
      `
      INSERT INTO items (
        id, owner_user_id, parent_id, type, name,
        storage_key, content_type, size_bytes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        id,
        params.ownerUserId,
        params.parentId ?? null,
        params.type,
        params.name,
        storageKey,
        contentType,
        sizeBytes
      ]
    );

    await client.query(
      "INSERT INTO item_closure (ancestor_id, descendant_id, depth) VALUES ($1,$1,0)",
      [id]
    );

    if (params.parentId) {
      await client.query(
        `
        INSERT INTO item_closure (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, $1, depth + 1
        FROM item_closure
        WHERE descendant_id = $2
        `,
        [id, params.parentId]
      );
    }

    // Auto-share with all roles: editor gets 'write', viewer gets 'read'
    await client.query(
      `
      INSERT INTO item_grants (item_id, subject_type, subject_id, permission)
      SELECT $1, 'role', r.id,
        CASE r.name WHEN 'editor' THEN 'write' ELSE 'read' END
      FROM roles r
      WHERE r.name IN ('editor', 'viewer')
      ON CONFLICT DO NOTHING
      `,
      [id]
    );

    await client.query("COMMIT");

    return insertRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

type StorageUserContext = {
  userId: string;
  authorization: string;
};

const getStorageUserContext = (
  request: { userId?: string; headers: Record<string, unknown> },
  reply: any
) => {
  if (!request.userId) {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  const authorization = getAuthorizationHeader(request);
  if (!authorization) {
    reply.code(401).send({ error: "authorization_required" });
    return null;
  }
  return { userId: request.userId, authorization };
};

const presignUpload = async (
  context: StorageUserContext,
  itemId: string,
  contentType?: string
) => {
  const res = await storageFetch(
    "/internal/presign/upload",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, contentType })
    },
    {
      scope: "items.upload",
      userId: context.userId,
      authorization: context.authorization
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "storage_presign_failed");
  }

  return res.json() as Promise<{
    url: string;
    method: string;
    headers: Record<string, string>;
  }>;
};

const uploadStorageObject = async (
  context: StorageUserContext,
  itemId: string,
  body: Buffer | Uint8Array,
  contentType?: string
) => {
  const res = await storageFetch(
    "/internal/object/upload",
    {
      method: "POST",
      headers: {
        "x-item-id": itemId,
        "x-file-content-type": contentType || "application/octet-stream",
        "content-type": contentType || "application/octet-stream"
      },
      body: body as unknown as BodyInit
    },
    {
      scope: "items.upload",
      userId: context.userId,
      authorization: context.authorization
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? "storage_upload_failed");
  }
};

const fetchStorageObject = async (
  context: StorageUserContext,
  itemId: string
) => {
  const res = await storageFetch(
    "/internal/object/download",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId })
    },
    {
      scope: "items.download",
      userId: context.userId,
      authorization: context.authorization
    }
  );
  if (!res.ok) {
    throw new Error("storage_object_fetch_failed");
  }
  if (!res.body) {
    throw new Error("storage_object_missing_body");
  }
  return res;
};

app.get("/items", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:read"))) return;
  const userId = request.userId!;
  const parentId = (request.query as { parentId?: string }).parentId ?? null;
  const res = await pool.query(
    `
    SELECT DISTINCT i.*
    FROM items i
    LEFT JOIN item_closure ic ON ic.descendant_id = i.id
    LEFT JOIN item_grants ig ON ig.item_id = ic.ancestor_id
      AND ig.permission = ANY($3)
    LEFT JOIN user_roles ur
      ON ur.user_id = $2
      AND ig.subject_type = 'role'
      AND ur.role_id = ig.subject_id
    WHERE i.parent_id IS NOT DISTINCT FROM $1
      AND (
        i.owner_user_id = $2 OR
        (ig.subject_type = 'user' AND ig.subject_id = $2) OR
        (ig.subject_type = 'role' AND ur.user_id IS NOT NULL)
      )
      AND status = 'active'
    ORDER BY i.type DESC, i.name ASC
    `,
    [parentId, userId, allowedPermissions("read")]
  );
  reply.send(res.rows);
});

app.get("/items/:id", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:read"))) return;
  const userId = request.userId!;
  const { id } = request.params as { id: string };

  const canRead = await hasItemPermission(userId, id, "read");
  if (!canRead) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  const res = await pool.query(
    "SELECT * FROM items WHERE id = $1 AND status = 'active'",
    [id]
  );
  if (res.rowCount === 0) {
    reply.code(404).send({ error: "not_found" });
    return;
  }
  reply.send(res.rows[0]);
});

app.patch("/items/:id", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:write"))) return;
  const userId = request.userId!;
  const { id } = request.params as { id: string };
  const body = request.body as { name?: string };

  if (!body?.name) {
    reply.code(400).send({ error: "name_required" });
    return;
  }

  const canWrite = await hasItemPermission(userId, id, "write");
  if (!canWrite) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  const nameError = validateName(body.name);
  if (nameError) {
    reply.code(400).send({ error: nameError });
    return;
  }

  try {
    const updateRes = await pool.query(
      `
      UPDATE items
      SET name = $1, updated_at = now()
      WHERE id = $2 AND status = 'active'
      RETURNING *
      `,
      [normalizeName(body.name), id]
    );

    if (updateRes.rowCount === 0) {
      reply.code(404).send({ error: "not_found" });
      return;
    }

    await writeAuditLog({
      actorUserId: userId,
      action: "item.update",
      targetType: "item",
      targetId: id,
      metadata: { name: updateRes.rows[0].name }
    });

    reply.send(updateRes.rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      reply.code(409).send({ error: "duplicate_name" });
      return;
    }
    throw error;
  }
});

app.post("/items/folder", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:write"))) return;
  const userId = request.userId!;
  const body = request.body as { name?: string; parentId?: string | null };
  if (!body?.name) {
    reply.code(400).send({ error: "name_required" });
    return;
  }
  const nameError = validateName(body.name);
  if (nameError) {
    reply.code(400).send({ error: nameError });
    return;
  }

  if (body.parentId) {
    const parentRes = await pool.query(
      "SELECT 1 FROM items WHERE id = $1 AND type = 'folder' AND status = 'active'",
      [body.parentId]
    );
    if (parentRes.rowCount === 0) {
      reply.code(400).send({ error: "parent_not_found" });
      return;
    }

    const canWriteParent = await hasItemPermission(userId, body.parentId, "write");
    if (!canWriteParent) {
      reply.code(403).send({ error: "forbidden" });
      return;
    }
  }

  try {
    const item = await createItem({
      ownerUserId: userId,
      parentId: body.parentId ?? null,
      type: "folder",
      name: normalizeName(body.name)
    });
    await writeAuditLog({
      actorUserId: userId,
      action: "item.create",
      targetType: "item",
      targetId: item.id,
      metadata: { type: "folder", name: item.name, parentId: item.parent_id }
    });
    reply.code(201).send(item);
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

app.post("/items/file", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:write"))) return;
  const userId = request.userId!;
  const body = request.body as {
    name?: string;
    parentId?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
  };

  if (!body?.name) {
    reply.code(400).send({ error: "name_required" });
    return;
  }
  const nameError = validateName(body.name);
  if (nameError) {
    reply.code(400).send({ error: nameError });
    return;
  }
  if (typeof body.sizeBytes === "number") {
    if (body.sizeBytes < 0) {
      reply.code(400).send({ error: "invalid_size" });
      return;
    }
    if (body.sizeBytes > config.maxUploadBytes) {
      reply.code(400).send({ error: "file_too_large" });
      return;
    }
  }

  if (body.parentId) {
    const parentRes = await pool.query(
      "SELECT 1 FROM items WHERE id = $1 AND type = 'folder' AND status = 'active'",
      [body.parentId]
    );
    if (parentRes.rowCount === 0) {
      reply.code(400).send({ error: "parent_not_found" });
      return;
    }

    const canWriteParent = await hasItemPermission(userId, body.parentId, "write");
    if (!canWriteParent) {
      reply.code(403).send({ error: "forbidden" });
      return;
    }
  }

  try {
    const itemId = crypto.randomUUID();
    const storageKey = `items/${itemId}`;

    const item = await createItem({
      id: itemId,
      ownerUserId: userId,
      parentId: body.parentId ?? null,
      type: "file",
      name: normalizeName(body.name),
      storageKey,
      contentType: body.contentType ?? null,
      sizeBytes: body.sizeBytes ?? null
    });

    await writeAuditLog({
      actorUserId: userId,
      action: "item.create",
      targetType: "item",
      targetId: item.id,
      metadata: {
        type: "file",
        name: item.name,
        parentId: item.parent_id,
        sizeBytes: item.size_bytes,
        contentType: item.content_type
      }
    });
    reply.code(201).send({ item, uploadPath: `/items/${item.id}/content` });
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

app.put("/items/:id/content", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:write"))) return;
  const userId = request.userId!;
  const storageContext = getStorageUserContext(request, reply);
  if (!storageContext) return;
  const { id } = request.params as { id: string };
  const body = request.body;

  const canWrite = await hasItemPermission(userId, id, "write");
  if (!canWrite) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  const payload =
    Buffer.isBuffer(body)
      ? body
      : typeof body === "string"
        ? Buffer.from(body)
        : body instanceof Uint8Array
          ? Buffer.from(body)
          : null;

  if (!payload) {
    reply.code(400).send({ error: "binary_body_required" });
    return;
  }

  if (payload.byteLength > config.maxUploadBytes) {
    reply.code(400).send({ error: "file_too_large" });
    return;
  }

  const fileNameHeader = request.headers["x-file-name"];
  const nextNameHeader =
    fileNameHeader && !Array.isArray(fileNameHeader)
      ? fileNameHeader
      : undefined;
  const contentTypeHeader = request.headers["content-type"];
  const nextContentType =
    contentTypeHeader && !Array.isArray(contentTypeHeader)
      ? contentTypeHeader.split(";")[0]?.trim() || null
      : null;

  const itemRes = await pool.query(
    `
    SELECT id, name, type
    FROM items
    WHERE id = $1 AND status = 'active'
    `,
    [id]
  );

  if (itemRes.rowCount === 0) {
    reply.code(404).send({ error: "not_found" });
    return;
  }

  const item = itemRes.rows[0];
  if (item.type !== "file") {
    reply.code(400).send({ error: "not_a_file" });
    return;
  }

  const nextName = nextNameHeader ? normalizeName(nextNameHeader) : item.name;
  const nameError = validateName(nextName);
  if (nameError) {
    reply.code(400).send({ error: nameError });
    return;
  }

  try {
    // Stream directly to storage (which writes to MinIO internally)
    // This avoids cross-network MinIO presigned URL access
    await uploadStorageObject(storageContext, id, payload, nextContentType ?? undefined);

    const updated = await pool.query(
      `
      UPDATE items
      SET
        name = $1,
        content_type = $2,
        size_bytes = $3,
        updated_at = now()
      WHERE id = $4
      RETURNING *
      `,
      [nextName, nextContentType, payload.byteLength, id]
    );

    await writeAuditLog({
      actorUserId: userId,
      action: "item.upload",
      targetType: "item",
      targetId: id,
      metadata: {
        name: nextName,
        contentType: nextContentType ?? null,
        sizeBytes: payload.byteLength
      }
    });

    reply.send({ item: updated.rows[0] });
  } catch (error: any) {
    if (error?.code === "23505") {
      reply.code(409).send({ error: "duplicate_name" });
      return;
    }
    throw error;
  }
});

app.post("/items/:id/presign-download", async (request, reply) => {
  reply.code(410).send({ error: "direct_download_links_disabled" });
});

app.get("/items/:id/download", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:read"))) return;
  const userId = request.userId!;
  const storageContext = getStorageUserContext(request, reply);
  if (!storageContext) return;
  const { id } = request.params as { id: string };
  const query = request.query as { disposition?: "attachment" | "inline" };
  const disposition =
    query.disposition === "inline" ? "inline" : "attachment";

  const canRead = await hasItemPermission(userId, id, "read");
  if (!canRead) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  const itemRes = await pool.query(
    `
    SELECT id, name, type, storage_key, content_type
    FROM items
    WHERE id = $1 AND status = 'active'
    `,
    [id]
  );
  if (itemRes.rowCount === 0) {
    reply.code(404).send({ error: "not_found" });
    return;
  }

  const item = itemRes.rows[0];

  if (item.type === "file") {
    let upstream: Response;
    try {
      upstream = await fetchStorageObject(storageContext, item.id);
    } catch (_error) {
      reply.code(502).send({ error: "download_unavailable" });
      return;
    }

    reply.header(
      "content-type",
      resolveContentType(
        item.name,
        item.content_type ?? upstream.headers.get("content-type")
      )
    );
    reply.header(
      "content-disposition",
      `${disposition}; filename*=UTF-8''${toContentDispositionFilename(
        sanitizePathSegment(item.name)
      )}`
    );

    const payload = Buffer.from(await upstream.arrayBuffer());
    reply.header("content-length", String(payload.byteLength));

    await writeAuditLog({
      actorUserId: userId,
      action: "item.download",
      targetType: "item",
      targetId: id
    });

    reply.send(payload);
    return;
  }

  const treeRes = await pool.query(
    `
    WITH RECURSIVE item_tree AS (
      SELECT id, parent_id, name, type, storage_key, name::text AS rel_path
      FROM items
      WHERE id = $1 AND status = 'active'
      UNION ALL
      SELECT child.id, child.parent_id, child.name, child.type, child.storage_key,
        (item_tree.rel_path || '/' || child.name) AS rel_path
      FROM items child
      JOIN item_tree ON child.parent_id = item_tree.id
      WHERE child.status = 'active'
    )
    SELECT id, rel_path
    FROM item_tree
    WHERE type = 'file'
    ORDER BY rel_path
    `,
    [id]
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("warning", (err: Error) => {
    app.log.warn({ err }, "archive_warning");
  });
  archive.on("error", (err: Error) => {
    app.log.error({ err }, "archive_error");
  });

  reply.header("content-type", "application/zip");
  reply.header(
    "content-disposition",
    `attachment; filename*=UTF-8''${toContentDispositionFilename(
      `${sanitizePathSegment(item.name)}.zip`
    )}`
  );

  void (async () => {
    for (const row of treeRes.rows as Array<{ id: string; rel_path: string }>) {
      try {
        const upstream = await fetchStorageObject(storageContext, row.id);
        const payload = Buffer.from(await upstream.arrayBuffer());
        archive.append(payload, {
          name: sanitizeArchivePath(row.rel_path)
        });
      } catch (error) {
        app.log.error({ err: error, itemId: id, relPath: row.rel_path }, "archive_file_fetch_failed");
      }
    }
    await archive.finalize();
  })().catch((error) => {
    archive.destroy(error as Error);
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "item.download",
    targetType: "item",
    targetId: id,
    metadata: { archive: true, fileCount: treeRes.rowCount ?? 0 }
  });

  reply.send(archive);
});

app.post("/items/:id/share", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:share"))) return;
  const userId = request.userId!;
  const { id } = request.params as { id: string };
  const body = request.body as {
    subjectType?: "user" | "role";
    subjectId?: string;
    permission?: ItemPermission;
  };

  if (!body?.subjectType || !body?.subjectId || !body?.permission) {
    reply.code(400).send({ error: "invalid_payload" });
    return;
  }

  const canManage = await hasItemPermission(userId, id, "manage");
  if (!canManage) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  await pool.query(
    `
    INSERT INTO item_grants (item_id, subject_type, subject_id, permission)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT DO NOTHING
    `,
    [id, body.subjectType, body.subjectId, body.permission]
  );

  await writeAuditLog({
    actorUserId: userId,
    action: "item.share.add",
    targetType: "item",
    targetId: id,
    metadata: {
      subjectType: body.subjectType,
      subjectId: body.subjectId,
      permission: body.permission
    }
  });

  reply.code(201).send({ status: "ok" });
});

app.delete("/items/:id/share", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:share"))) return;
  const userId = request.userId!;
  const { id } = request.params as { id: string };
  const body = request.body as {
    subjectType?: "user" | "role";
    subjectId?: string;
    permission?: ItemPermission;
  };

  if (!body?.subjectType || !body?.subjectId || !body?.permission) {
    reply.code(400).send({ error: "invalid_payload" });
    return;
  }

  const canManage = await hasItemPermission(userId, id, "manage");
  if (!canManage) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  await pool.query(
    `
    DELETE FROM item_grants
    WHERE item_id = $1 AND subject_type = $2 AND subject_id = $3 AND permission = $4
    `,
    [id, body.subjectType, body.subjectId, body.permission]
  );

  await writeAuditLog({
    actorUserId: userId,
    action: "item.share.remove",
    targetType: "item",
    targetId: id,
    metadata: {
      subjectType: body.subjectType,
      subjectId: body.subjectId,
      permission: body.permission
    }
  });

  reply.send({ status: "ok" });
});

app.get("/items/:id/shares", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:share"))) return;
  const userId = request.userId!;
  const { id } = request.params as { id: string };

  const canManage = await hasItemPermission(userId, id, "manage");
  if (!canManage) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  const res = await pool.query(
    "SELECT * FROM item_grants WHERE item_id = $1 ORDER BY granted_at DESC",
    [id]
  );
  reply.send(res.rows);
});

app.delete("/items/:id", async (request, reply) => {
  if (!(await requirePermission(request, reply, "items:delete"))) return;
  const userId = request.userId!;
  const { id } = request.params as { id: string };

  const canDelete = await hasItemPermission(userId, id, "delete");
  if (!canDelete) {
    reply.code(403).send({ error: "forbidden" });
    return;
  }

  const res = await pool.query(
    "SELECT 1 FROM items WHERE id = $1 AND status = 'active'",
    [id]
  );
  if (res.rowCount === 0) {
    reply.code(404).send({ error: "not_found" });
    return;
  }

  await pool.query(
    `
    UPDATE items
    SET status = 'deleted', updated_at = now()
    WHERE id IN (
      SELECT descendant_id FROM item_closure WHERE ancestor_id = $1
    )
    `,
    [id]
  );

  await writeAuditLog({
    actorUserId: userId,
    action: "item.delete",
    targetType: "item",
    targetId: id
  });

  reply.send({ status: "ok" });
});

const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
