import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { Pool, type PoolClient } from "pg";
import crypto from "node:crypto";
import { isIP } from "node:net";
import archiver from "archiver";
import { config } from "./config.js";
import {
  type AccessTokenClaims,
  generateOtp,
  hashOtp,
  hashPassword,
  isValidEmail,
  normalizePhoneNumber,
  normalizeEmail,
  sendOtp,
  signAccessToken,
  signPhoneEnrollmentToken,
  signSecurityActionToken,
  signServiceToken,
  verifyAccessToken,
  verifyPhoneEnrollmentToken,
  verifySecurityActionToken,
  verifyPassword
} from "./auth.js";
import { getRedis } from "./redis.js";
import {
  findRefreshToken,
  generateRefreshToken,
  hashRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  revokeRefreshTokenWithMetadata,
  revokeRefreshTokensForUser,
  storeRefreshToken
} from "./refreshTokens.js";
import { hasPermission, invalidateEnforcer } from "./rbac.js";

const app = Fastify({ logger: true, trustProxy: config.trustProxy });
const pool = new Pool({ connectionString: config.databaseUrl });

const INTERNAL_AUTH_HEADER = "x-internal-token";
const SERVICE_AUTH_HEADER = "x-service-authorization";
const FORWARDED_USER_AUTH_HEADER = "x-user-authorization";
const SECURITY_ACTION_HEADER = "x-security-action-token";

const MAINTENANCE_RETRY_AFTER_SECONDS = 90;
const MAINTENANCE_PAYLOAD = {
  error: "service_temporarily_unavailable",
  message: "We're performing routine service maintenance. Please try again shortly."
};

type SecurityControls = {
  globalLogoutAfter: Date | null;
  tapOffActive: boolean;
  tapOffStartedAt: Date | null;
  tapOffEndedAt: Date | null;
  tapOffByUserId: string | null;
  tapOffReason: string | null;
};

type SecurityActionClaims = {
  sub?: string;
  scope?: string;
  kind?: string;
  exp?: number;
};

type IpAccessRuleRecord = {
  id: string;
  ipAddress: string;
  label: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string | null;
  updatedByEmail: string | null;
};

type IpAccessState = {
  enabledIpAddresses: Set<string>;
  disabledIpAddresses: Set<string>;
};

type DashboardRange = "7d" | "today" | "yesterday";

const parseDashboardRange = (value?: string): DashboardRange => {
  if (value === "today" || value === "yesterday" || value === "7d") return value;
  return "7d";
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDashboardRangeWindow = (range: DashboardRange) => {
  const now = new Date();
  if (range === "today") {
    return { from: startOfDay(now), to: now };
  }
  if (range === "yesterday") {
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    return { from: yesterdayStart, to: todayStart };
  }
  return {
    from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    to: now
  };
};

const SECURITY_STATE_CACHE_MS = 1000;
const IP_ACCESS_RULES_CACHE_MS = 1000;
const IP_DISABLED_PAYLOAD = {
  error: "ip_address_blocked",
  message: "Access from this IP address has been disabled by an administrator."
};
const IP_NOT_ALLOWLISTED_PAYLOAD = {
  error: "ip_address_blocked",
  message: "You do not have access from this IP address."
};
let securityControlsCache:
  | {
      value: SecurityControls;
      loadedAt: number;
    }
  | undefined;
let warnedMissingSecurityControlsTable = false;
let ipAccessStateCache:
  | {
      value: IpAccessState;
      loadedAt: number;
    }
  | undefined;
let warnedMissingIpAccessRulesTable = false;

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

const getAccessClaimsFromAuth = (request: {
  headers: Record<string, unknown>;
}) => {
  const auth = request.headers["authorization"];
  if (!auth || Array.isArray(auth)) return undefined;
  const [scheme, token] = (auth as string).split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  try {
    return verifyAccessToken(token);
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

const getSecurityActionTokenHeader = (request: {
  headers: Record<string, unknown>;
}) => {
  const header = request.headers[SECURITY_ACTION_HEADER];
  if (!header || Array.isArray(header)) return undefined;
  const value = header as string;
  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token;
  return value;
};

const sendMaintenanceResponse = (reply: any) => {
  reply.header("retry-after", String(MAINTENANCE_RETRY_AFTER_SECONDS));
  reply.code(503).send(MAINTENANCE_PAYLOAD);
};

const getSecurityControls = async (): Promise<SecurityControls> => {
  if (!config.securityControlsEnabled) {
    return {
      globalLogoutAfter: null,
      tapOffActive: false,
      tapOffStartedAt: null,
      tapOffEndedAt: null,
      tapOffByUserId: null,
      tapOffReason: null
    };
  }

  const now = Date.now();
  if (securityControlsCache && now - securityControlsCache.loadedAt < SECURITY_STATE_CACHE_MS) {
    return securityControlsCache.value;
  }

  let value: SecurityControls;
  try {
    const res = await pool.query(
      `
      SELECT global_logout_after, tap_off_active, tap_off_started_at, tap_off_ended_at,
             tap_off_by_user_id, tap_off_reason
      FROM security_controls
      WHERE id = true
      LIMIT 1
      `
    );
    const row = res.rows[0] ?? {};
    value = {
      globalLogoutAfter: row.global_logout_after ? new Date(row.global_logout_after) : null,
      tapOffActive: Boolean(row.tap_off_active),
      tapOffStartedAt: row.tap_off_started_at ? new Date(row.tap_off_started_at) : null,
      tapOffEndedAt: row.tap_off_ended_at ? new Date(row.tap_off_ended_at) : null,
      tapOffByUserId: row.tap_off_by_user_id ?? null,
      tapOffReason: row.tap_off_reason ?? null
    };
  } catch (error: any) {
    if (error?.code === "42P01") {
      if (!warnedMissingSecurityControlsTable) {
        warnedMissingSecurityControlsTable = true;
        app.log.warn(
          "security_controls table is missing; security controls are temporarily disabled until migrations are applied"
        );
      }
      value = {
        globalLogoutAfter: null,
        tapOffActive: false,
        tapOffStartedAt: null,
        tapOffEndedAt: null,
        tapOffByUserId: null,
        tapOffReason: null
      };
    } else {
      throw error;
    }
  }

  securityControlsCache = { value, loadedAt: now };
  return value;
};

const invalidateSecurityControlsCache = () => {
  securityControlsCache = undefined;
};

const createEmptyIpAccessState = (): IpAccessState => ({
  enabledIpAddresses: new Set<string>(),
  disabledIpAddresses: new Set<string>()
});

const addIpAccessEntryToState = (state: IpAccessState, ipAddress: string | null | undefined, enabled: boolean) => {
  const normalized = normalizeIpAddress(String(ipAddress ?? ""));
  if (!normalized) {
    return;
  }

  if (enabled) {
    state.enabledIpAddresses.add(normalized);
    state.disabledIpAddresses.delete(normalized);
    return;
  }

  state.disabledIpAddresses.add(normalized);
  state.enabledIpAddresses.delete(normalized);
};

const buildIpAccessStateFromRows = (rows: Array<{ ip_address?: string | null; enabled?: unknown }>) => {
  const state = createEmptyIpAccessState();
  for (const row of rows) {
    addIpAccessEntryToState(state, row.ip_address ?? null, Boolean(row.enabled));
  }
  return state;
};

const buildIpAccessStateFromRules = (rules: Array<{ ipAddress?: string | null; enabled?: boolean }>) => {
  const state = createEmptyIpAccessState();
  for (const rule of rules) {
    addIpAccessEntryToState(state, rule.ipAddress ?? null, Boolean(rule.enabled));
  }
  return state;
};

const getIpAccessDecision = (state: IpAccessState, ipAddress?: string | null) => {
  if (!ipAddress) {
    return { allowed: true, reason: null as "disabled" | "not_allowlisted" | null };
  }

  if (state.disabledIpAddresses.has(ipAddress)) {
    return { allowed: false, reason: "disabled" as const };
  }

  if (state.enabledIpAddresses.size > 0 && !state.enabledIpAddresses.has(ipAddress)) {
    return { allowed: false, reason: "not_allowlisted" as const };
  }

  return { allowed: true, reason: null as "disabled" | "not_allowlisted" | null };
};

const invalidateIpAccessStateCache = () => {
  ipAccessStateCache = undefined;
};

const mapIpAccessRuleRow = (row: any): IpAccessRuleRecord => ({
  id: row.id as string,
  ipAddress: row.ip_address as string,
  label: row.label ?? null,
  enabled: Boolean(row.enabled),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
  createdByEmail: row.created_by_email ?? null,
  updatedByEmail: row.updated_by_email ?? null
});

const getIpAccessState = async () => {
  const now = Date.now();
  if (ipAccessStateCache && now - ipAccessStateCache.loadedAt < IP_ACCESS_RULES_CACHE_MS) {
    return ipAccessStateCache.value;
  }

  try {
    const res = await pool.query(
      `
      SELECT host(ip_address) AS ip_address, enabled
      FROM ip_access_rules
      `
    );
    const value = buildIpAccessStateFromRows(res.rows);
    ipAccessStateCache = { value, loadedAt: now };
    return value;
  } catch (error: any) {
    if (error?.code === "42P01") {
      if (!warnedMissingIpAccessRulesTable) {
        warnedMissingIpAccessRulesTable = true;
        app.log.warn(
          "ip_access_rules table is missing; IP access controls are temporarily disabled until migrations are applied"
        );
      }
      const value = createEmptyIpAccessState();
      ipAccessStateCache = { value, loadedAt: now };
      return value;
    }
    throw error;
  }
};

const listIpAccessRules = async () => {
  const res = await pool.query(
    `
    SELECT
      r.id,
      host(r.ip_address) AS ip_address,
      r.label,
      r.enabled,
      r.created_at,
      r.updated_at,
      creator.email AS created_by_email,
      updater.email AS updated_by_email
    FROM ip_access_rules r
    LEFT JOIN users creator ON creator.id = r.created_by_user_id
    LEFT JOIN users updater ON updater.id = r.updated_by_user_id
    ORDER BY r.updated_at DESC, r.created_at DESC
    `
  );

  return res.rows.map(mapIpAccessRuleRow);
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
  allowedHeaders: ["Authorization", "Content-Type", "X-File-Name", "X-Security-Action-Token"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});

app.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => {
  done(null, body);
});

app.addHook("onRequest", async (request, reply) => {
  if (
    request.url.startsWith("/health") ||
    request.url.startsWith("/ready") ||
    request.url.startsWith("/internal/")
  ) {
    return;
  }

  const ipAddress = getRequestIpAddress(request);
  if (!ipAddress) {
    return;
  }

  const ipAccessState = await getIpAccessState();
  const decision = getIpAccessDecision(ipAccessState, ipAddress);
  if (decision.allowed) {
    return;
  }

  request.log.warn(
    { ipAddress, url: request.url, reason: decision.reason },
    "request blocked by IP access rule"
  );
  return reply
    .code(403)
    .send(decision.reason === "disabled" ? IP_DISABLED_PAYLOAD : IP_NOT_ALLOWLISTED_PAYLOAD);
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

const parsePhoneNumberInput = (value: unknown) => {
  if (value === undefined) {
    return { provided: false, value: null as string | null };
  }

  if (value === null) {
    return { provided: true, value: null as string | null };
  }

  if (typeof value !== "string") {
    return { provided: true, value: null as string | null, error: "invalid_phone_number" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { provided: true, value: null as string | null };
  }

  try {
    return { provided: true, value: normalizePhoneNumber(trimmed) };
  } catch {
    return { provided: true, value: null as string | null, error: "invalid_phone_number" };
  }
};

const normalizeIpAddress = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  if (normalized.startsWith("::ffff:")) {
    normalized = normalized.slice("::ffff:".length);
  }
  const zoneIndex = normalized.indexOf("%");
  if (zoneIndex !== -1) {
    normalized = normalized.slice(0, zoneIndex);
  }

  if (!isIP(normalized)) {
    return null;
  }

  return normalized.toLowerCase();
};

const getRequestIpAddress = (request: { ip?: string }) => {
  if (!request.ip) return null;
  return normalizeIpAddress(request.ip);
};

const parseIpAddressInput = (value: unknown) => {
  if (value === undefined || value === null) {
    return { provided: false, value: null as string | null };
  }

  if (typeof value !== "string") {
    return { provided: true, value: null as string | null, error: "invalid_ip_address" };
  }

  const normalized = normalizeIpAddress(value);
  if (!normalized) {
    return { provided: true, value: null as string | null, error: "invalid_ip_address" };
  }

  return { provided: true, value: normalized };
};

const parseLabelInput = (value: unknown) => {
  if (value === undefined) {
    return { provided: false, value: null as string | null };
  }
  if (value === null) {
    return { provided: true, value: null as string | null };
  }
  if (typeof value !== "string") {
    return { provided: true, value: null as string | null, error: "invalid_label" };
  }

  const trimmed = value.trim();
  return { provided: true, value: trimmed || null };
};

const getOtpDeliveryFailure = (error: any) => {
  const reason = error?.message ?? "unknown";
  if (reason === "phone_number_required" || reason === "invalid_phone_number") {
    return { code: 400, error: reason };
  }
  if (reason === "otp_sms_not_configured") {
    return { code: 503, error: reason };
  }
  return { code: 502, error: "otp_delivery_failed" as const };
};

type DbClient = Pick<PoolClient, "query">;

type HardDeleteUserResult = {
  id: string;
  email: string;
  status: string;
  isAdmin: boolean;
};

const isMissingRelationOrColumn = (error: unknown) => {
  const pgError = error as { code?: string } | undefined;
  return pgError?.code === "42P01" || pgError?.code === "42703";
};

const hardDeleteUserAccount = async (
  client: DbClient,
  userId: string,
  options?: { enforceLastAdminCheck?: boolean }
): Promise<HardDeleteUserResult | null> => {
  const targetRes = await client.query(
    `
    SELECT
      u.id,
      u.email,
      u.status,
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
    [userId]
  );

  if ((targetRes.rowCount ?? 0) === 0) {
    return null;
  }

  const target = targetRes.rows[0] as {
    id: string;
    email: string;
    status: string;
    is_admin: boolean;
  };
  const enforceLastAdminCheck = options?.enforceLastAdminCheck ?? true;
  if (enforceLastAdminCheck && target.is_admin && target.status !== "deleted") {
    const remainingAdminsRes = await client.query(
      `
      SELECT COUNT(DISTINCT ur.user_id)::int AS total
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE r.name = 'admin'
        AND u.status <> 'deleted'
        AND u.id <> $1
      `,
      [userId]
    );
    const remainingActiveAdmins = Number(remainingAdminsRes.rows[0]?.total ?? 0);
    if (remainingActiveAdmins < 1) {
      throw new Error("cannot_delete_last_admin");
    }
  }

  await client.query(
    "DELETE FROM item_grants WHERE subject_type = 'user' AND subject_id = $1",
    [userId]
  );
  await client.query("DELETE FROM otp_tokens WHERE email = $1", [target.email]);
  await client.query("UPDATE audit_logs SET actor_user_id = NULL WHERE actor_user_id = $1", [userId]);
  try {
    await client.query(
      "UPDATE refresh_tokens SET revoked_by_user_id = NULL WHERE revoked_by_user_id = $1",
      [userId]
    );
  } catch (error) {
    if (!isMissingRelationOrColumn(error)) throw error;
  }
  try {
    await client.query(
      "UPDATE security_controls SET tap_off_by_user_id = NULL, updated_at = now() WHERE tap_off_by_user_id = $1",
      [userId]
    );
  } catch (error) {
    if (!isMissingRelationOrColumn(error)) throw error;
  }

  const deleteRes = await client.query(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [userId]
  );
  if ((deleteRes.rowCount ?? 0) === 0) {
    return null;
  }

  const verifyRes = await client.query(
    "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
    [target.email]
  );
  if ((verifyRes.rowCount ?? 0) > 0) {
    throw new Error("user_delete_not_complete");
  }

  return {
    id: target.id,
    email: target.email,
    status: target.status,
    isAdmin: Boolean(target.is_admin)
  };
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

  const accessClaims = getAccessClaimsFromAuth(request);
  const userId = accessClaims?.sub ??
    (config.allowDevHeader ? getUserIdFromHeader(request) : undefined);

  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }

  const [userState, controls] = await Promise.all([
    getUserAuthState(userId),
    getSecurityControls()
  ]);

  if (!userState) {
    reply.code(401).send({ error: "invalid_user" });
    return;
  }

  if (userState.status !== "active") {
    reply.code(403).send({ error: "user_disabled" });
    return;
  }

  const isSecurityControlRoute = request.url.startsWith("/admin/security/");
  if (
    accessClaims &&
    !isSecurityControlRoute &&
    isAccessTokenRevokedByCutoff(accessClaims, userState.forceLogoutAfter, controls.globalLogoutAfter)
  ) {
    reply.code(401).send({ error: "session_revoked" });
    return;
  }

  if (controls.tapOffActive && !request.url.startsWith("/admin/")) {
    sendMaintenanceResponse(reply);
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

const requireSecurityControlAccess = async (
  request: { userId?: string; headers: Record<string, unknown> },
  reply: any,
  options?: { requireStepUp?: boolean }
) => {
  if (!ensureSecurityControlsEnabled(reply)) return false;
  if (!(await requirePermission(request, reply, "security:control"))) return false;
  if (options?.requireStepUp === false) return true;
  if (!requireSecurityActionToken(request, reply)) return false;
  return true;
};

const ensureSecurityControlsEnabled = (reply: any) => {
  if (config.securityControlsEnabled) return true;
  reply.code(404).send({ error: "not_found" });
  return false;
};

const getUserAuthState = async (userId: string) => {
  const res = await pool.query(
    "SELECT id, status, force_logout_after FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  if (!res.rowCount) return null;
  return {
    id: res.rows[0].id as string,
    status: res.rows[0].status as string,
    forceLogoutAfter: res.rows[0].force_logout_after
      ? new Date(res.rows[0].force_logout_after)
      : null
  };
};

const isAccessTokenRevokedByCutoff = (
  claims: AccessTokenClaims,
  userCutoff: Date | null,
  globalCutoff: Date | null
) => {
  if (typeof claims.iat !== "number") return false;
  const tokenIat = claims.iat;
  const toEpochSeconds = (value: Date | null) =>
    value ? Math.floor(value.getTime() / 1000) : null;
  const userCutoffEpoch = toEpochSeconds(userCutoff);
  const globalCutoffEpoch = toEpochSeconds(globalCutoff);
  if (userCutoffEpoch !== null && tokenIat <= userCutoffEpoch) return true;
  if (globalCutoffEpoch !== null && tokenIat <= globalCutoffEpoch) return true;
  return false;
};

const requireSecurityActionToken = (
  request: { userId?: string; headers: Record<string, unknown> },
  reply: any
) => {
  const userId = request.userId;
  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }

  const token = getSecurityActionTokenHeader(request);
  if (!token) {
    reply.code(401).send({ error: "security_action_token_required" });
    return null;
  }

  let claims: SecurityActionClaims;
  try {
    claims = verifySecurityActionToken(token) as SecurityActionClaims;
  } catch {
    reply.code(401).send({ error: "security_action_token_invalid" });
    return null;
  }

  if (
    claims.kind !== "security_action" ||
    claims.scope !== "security:control" ||
    claims.sub !== userId
  ) {
    reply.code(401).send({ error: "security_action_token_invalid" });
    return null;
  }

  return claims;
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

const securityStepUpRequestLimiter = async (email: string, ip?: string) => {
  const limitEmail = await shouldLimit(
    `otp:stepup:req:email:${email}`,
    config.otpRequestMax,
    config.otpRequestWindowSeconds
  );
  if (limitEmail) return true;

  if (ip) {
    return shouldLimit(
      `otp:stepup:req:ip:${ip}`,
      config.otpRequestMax,
      config.otpRequestWindowSeconds
    );
  }
  return false;
};

const securityStepUpVerifyLimiter = async (email: string, ip?: string) => {
  const limitEmail = await shouldLimit(
    `otp:stepup:verify:email:${email}`,
    config.otpVerifyMax,
    config.otpVerifyWindowSeconds
  );
  if (limitEmail) return true;

  if (ip) {
    return shouldLimit(
      `otp:stepup:verify:ip:${ip}`,
      config.otpVerifyMax,
      config.otpVerifyWindowSeconds
    );
  }
  return false;
};

const ensureAuthFlowAvailable = async (reply: any) => {
  if (!config.securityControlsEnabled) return true;
  const controls = await getSecurityControls();
  if (!controls.tapOffActive) return true;
  sendMaintenanceResponse(reply);
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

const issueLoginOtpChallenge = async (params: {
  email: string;
  phoneNumber?: string | null;
}) => {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

  await pool.query(
    "UPDATE otp_tokens SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL AND purpose = 'login'",
    [params.email]
  );

  await pool.query(
    `INSERT INTO otp_tokens (email, otp_hash, expires_at, purpose) VALUES ($1,$2,$3,'login')`,
    [params.email, otpHash, expiresAt]
  );

  const delivery = await sendOtp({
    phoneNumber: params.phoneNumber ?? null,
    otp
  });

  const payload: { status: "otp_sent"; otp?: string; delivery: "email" | "sms" } = {
    status: "otp_sent",
    delivery: delivery.channel
  };
  if (config.returnOtpInResponse) {
    payload.otp = otp;
  }

  return payload;
};

app.post("/auth/login", async (request, reply) => {
  if (!(await ensureAuthFlowAvailable(reply))) return;

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
    "SELECT id, password_hash, status, phone_number FROM users WHERE email = $1",
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

  let loginPhoneNumber: string | null = null;
  if (user.phone_number) {
    try {
      loginPhoneNumber = normalizePhoneNumber(user.phone_number);
    } catch {
      loginPhoneNumber = null;
    }
  }

  if (!loginPhoneNumber) {
    reply.send({
      status: "phone_number_required",
      phoneEnrollmentToken: signPhoneEnrollmentToken(user.id, email)
    });
    return;
  }

  try {
    const payload = await issueLoginOtpChallenge({
      email,
      phoneNumber: loginPhoneNumber
    });
    reply.send(payload);
    return;
  } catch (error: any) {
    const failure = getOtpDeliveryFailure(error);
    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.login_failed",
      targetType: "user",
      targetId: user.id,
      metadata: { reason: failure.error, error: error?.message ?? "unknown" }
    });
    reply.code(failure.code).send({ error: failure.error });
    return;
  }
});

app.post("/auth/login/register-phone", async (request, reply) => {
  if (!(await ensureAuthFlowAvailable(reply))) return;

  const body = request.body as {
    phoneEnrollmentToken?: string;
    phoneNumber?: string | null;
  };

  if (!body?.phoneEnrollmentToken) {
    reply.code(400).send({ error: "phone_enrollment_token_required" });
    return;
  }

  const normalizedPhone = parsePhoneNumberInput(body.phoneNumber);
  if (normalizedPhone.error || !normalizedPhone.value) {
    reply.code(400).send({ error: normalizedPhone.error ?? "phone_number_required" });
    return;
  }

  let claims: { sub?: string; email?: string; kind?: string };
  try {
    claims = verifyPhoneEnrollmentToken(body.phoneEnrollmentToken);
  } catch {
    reply.code(401).send({ error: "phone_enrollment_token_invalid" });
    return;
  }

  if (claims.kind !== "phone_enrollment" || !claims.sub || !claims.email) {
    reply.code(401).send({ error: "phone_enrollment_token_invalid" });
    return;
  }

  const email = normalizeEmail(claims.email);
  const userId = claims.sub;

  const isLimited = await otpRequestLimiter(email, request.ip);
  if (isLimited) {
    reply.code(429).send({ error: "rate_limited" });
    return;
  }

  const client = await pool.connect();
  let phoneRegistered = false;

  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT id, email, status, phone_number FROM users WHERE id = $1 AND email = $2 LIMIT 1",
      [userId, email]
    );

    if ((userRes.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      reply.code(401).send({ error: "phone_enrollment_token_invalid" });
      return;
    }

    const user = userRes.rows[0] as {
      id: string;
      email: string;
      status: string;
      phone_number: string | null;
    };

    if (user.status !== "active") {
      await client.query("ROLLBACK");
      reply.code(403).send({ error: "user_disabled" });
      return;
    }

    let existingPhoneNumber: string | null = null;
    if (user.phone_number) {
      try {
        existingPhoneNumber = normalizePhoneNumber(user.phone_number);
      } catch {
        existingPhoneNumber = null;
      }
    }

    if (existingPhoneNumber && existingPhoneNumber !== normalizedPhone.value) {
      await client.query("ROLLBACK");
      reply.code(409).send({ error: "phone_number_already_registered" });
      return;
    }

    if (!existingPhoneNumber) {
      const existingPhone = await client.query(
        "SELECT id FROM users WHERE phone_number = $1 AND id <> $2 LIMIT 1",
        [normalizedPhone.value, userId]
      );
      if ((existingPhone.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        reply.code(409).send({ error: "phone_number_already_exists" });
        return;
      }

      await client.query(
        "UPDATE users SET phone_number = $1, updated_at = now() WHERE id = $2",
        [normalizedPhone.value, userId]
      );
      phoneRegistered = true;
    }

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") {
      reply.code(409).send({ error: "phone_number_already_exists" });
      return;
    }
    throw error;
  } finally {
    client.release();
  }

  if (phoneRegistered) {
    await writeAuditLog({
      actorUserId: userId,
      action: "user.phone_registered",
      targetType: "user",
      targetId: userId,
      metadata: {
        duringLogin: true,
        phoneNumber: normalizedPhone.value
      }
    });
  }

  try {
    const payload = await issueLoginOtpChallenge({
      email,
      phoneNumber: normalizedPhone.value
    });
    reply.send(payload);
    return;
  } catch (error: any) {
    const failure = getOtpDeliveryFailure(error);
    await writeAuditLog({
      actorUserId: userId,
      action: "auth.login_failed",
      targetType: "user",
      targetId: userId,
      metadata: {
        reason: failure.error,
        duringPhoneRegistration: phoneRegistered,
        error: error?.message ?? "unknown"
      }
    });
    reply.code(failure.code).send({ error: failure.error });
    return;
  }
});

app.post("/auth/verify-otp", async (request, reply) => {
  if (!(await ensureAuthFlowAvailable(reply))) return;

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
    WHERE email = $1 AND consumed_at IS NULL AND purpose = 'login'
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
  if (!(await ensureAuthFlowAvailable(reply))) return;

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

  await revokeRefreshTokenWithMetadata(pool, {
    tokenHash: refreshHash,
    reason: "refresh_rotation",
    revokedByUserId: record.user_id
  });

  const userRes = await pool.query(
    "SELECT email, status, force_logout_after FROM users WHERE id = $1",
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

  const controls = await getSecurityControls();
  const issuedAtSeconds = Math.floor(new Date(record.created_at).getTime() / 1000);
  if (
    isAccessTokenRevokedByCutoff(
      { sub: record.user_id, email: userRes.rows[0].email, iat: issuedAtSeconds },
      userRes.rows[0].force_logout_after
        ? new Date(userRes.rows[0].force_logout_after)
        : null,
      controls.globalLogoutAfter
    )
  ) {
    reply.code(401).send({ error: "session_revoked" });
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
  await revokeRefreshTokenWithMetadata(pool, {
    tokenHash: refreshHash,
    reason: "logout",
    revokedByUserId: record?.user_id ?? null
  });
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
  const accessClaims = getAccessClaimsFromAuth(request);
  const userId = accessClaims?.sub ??
    (config.allowDevHeader ? getUserIdFromHeader(request) : undefined);
  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }

  const controls = await getSecurityControls();
  if (controls.tapOffActive) {
    sendMaintenanceResponse(reply);
    return;
  }

  const userRes = await pool.query(
    "SELECT id, email, status, force_logout_after FROM users WHERE id = $1",
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

  if (
    accessClaims &&
    isAccessTokenRevokedByCutoff(
      accessClaims,
      userRes.rows[0].force_logout_after
        ? new Date(userRes.rows[0].force_logout_after)
        : null,
      controls.globalLogoutAfter
    )
  ) {
    reply.code(401).send({ error: "session_revoked" });
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

app.post("/admin/security/step-up/request", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply, { requireStepUp: false }))) return;

  const body = request.body as { password?: string };
  if (!body?.password) {
    reply.code(400).send({ error: "password_required" });
    return;
  }

  const userId = request.userId!;
  const userRes = await pool.query(
    "SELECT id, email, status, password_hash, phone_number FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  if ((userRes.rowCount ?? 0) === 0) {
    reply.code(401).send({ error: "invalid_user" });
    return;
  }

  const user = userRes.rows[0];
  if (user.status !== "active") {
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
      actorUserId: userId,
      action: "security.stepup.request_failed",
      targetType: "security_control",
      metadata: { reason: "wrong_password" }
    });
    reply.code(401).send({ error: "invalid_credentials" });
    return;
  }

  const email = normalizeEmail(user.email as string);
  const isLimited = await securityStepUpRequestLimiter(email, request.ip);
  if (isLimited) {
    reply.code(429).send({ error: "rate_limited" });
    return;
  }

  let stepUpPhoneNumber: string | null = null;
  if (user.phone_number) {
    try {
      stepUpPhoneNumber = normalizePhoneNumber(user.phone_number);
    } catch {
      stepUpPhoneNumber = null;
    }
  }

  if (!stepUpPhoneNumber) {
    reply.code(400).send({ error: "phone_number_required" });
    return;
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

  await pool.query(
    "UPDATE otp_tokens SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL AND purpose = 'security_stepup'",
    [email]
  );
  await pool.query(
    "INSERT INTO otp_tokens (email, otp_hash, expires_at, purpose) VALUES ($1,$2,$3,'security_stepup')",
    [email, otpHash, expiresAt]
  );

  try {
    const delivery = await sendOtp({
      phoneNumber: stepUpPhoneNumber,
      otp
    });
    await writeAuditLog({
      actorUserId: userId,
      action: "security.stepup.request",
      targetType: "security_control",
      metadata: {
        channel: delivery.channel,
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      }
    });
    reply.send({ status: "otp_sent", delivery: delivery.channel });
    return;
  } catch (error: any) {
    const failure = getOtpDeliveryFailure(error);
    await writeAuditLog({
      actorUserId: userId,
      action: "security.stepup.request_failed",
      targetType: "security_control",
      metadata: { reason: failure.error, error: error?.message ?? "unknown" }
    });
    reply.code(failure.code).send({ error: failure.error });
    return;
  }
});

app.post("/admin/security/step-up/verify", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply, { requireStepUp: false }))) return;

  const body = request.body as { otp?: string };
  if (!body?.otp) {
    reply.code(400).send({ error: "otp_required" });
    return;
  }

  const userId = request.userId!;
  const userRes = await pool.query(
    "SELECT id, email, status FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  if ((userRes.rowCount ?? 0) === 0) {
    reply.code(401).send({ error: "invalid_user" });
    return;
  }
  const user = userRes.rows[0];
  if (user.status !== "active") {
    reply.code(403).send({ error: "user_disabled" });
    return;
  }

  const email = normalizeEmail(user.email as string);
  const isLimited = await securityStepUpVerifyLimiter(email, request.ip);
  if (isLimited) {
    reply.code(429).send({ error: "rate_limited" });
    return;
  }

  const tokenRes = await pool.query(
    `
    SELECT id, otp_hash, expires_at, attempts
    FROM otp_tokens
    WHERE email = $1 AND consumed_at IS NULL AND purpose = 'security_stepup'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email]
  );
  if ((tokenRes.rowCount ?? 0) === 0) {
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

  await pool.query("UPDATE otp_tokens SET consumed_at = now() WHERE id = $1", [
    tokenRow.id
  ]);

  const securityActionToken = signSecurityActionToken(userId);
  await writeAuditLog({
    actorUserId: userId,
    action: "security.stepup.verify",
    targetType: "security_control",
    metadata: {
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    }
  });

  reply.send({
    securityActionToken,
    expiresInSeconds: config.securityStepUpTtlSeconds
  });
});

app.get("/admin/security/state", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const controls = await getSecurityControls();
  let tapOffBy: string | null = null;
  if (controls.tapOffByUserId) {
    const actorRes = await pool.query("SELECT email FROM users WHERE id = $1 LIMIT 1", [
      controls.tapOffByUserId
    ]);
    tapOffBy = actorRes.rows[0]?.email ?? null;
  }

  reply.send({
    tapOffActive: controls.tapOffActive,
    globalLogoutAfter: controls.globalLogoutAfter
      ? controls.globalLogoutAfter.toISOString()
      : null,
    tapOffStartedAt: controls.tapOffStartedAt
      ? controls.tapOffStartedAt.toISOString()
      : null,
    tapOffBy
  });
});

app.get("/admin/security/ip-access", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply, { requireStepUp: false }))) return;

  try {
    const rules = await listIpAccessRules();
    reply.send({
      currentIpAddress: getRequestIpAddress(request),
      rules
    });
  } catch (error: any) {
    if (error?.code === "42P01") {
      reply.code(503).send({ error: "ip_access_controls_unavailable" });
      return;
    }
    throw error;
  }
});

app.post("/admin/security/ip-access", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const body = request.body as {
    ipAddress?: string;
    label?: string | null;
    enabled?: boolean;
  };
  const normalizedIpAddress = parseIpAddressInput(body?.ipAddress);
  if (normalizedIpAddress.error) {
    reply.code(400).send({ error: normalizedIpAddress.error });
    return;
  }
  if (!normalizedIpAddress.provided || !normalizedIpAddress.value) {
    reply.code(400).send({ error: "ip_address_required" });
    return;
  }

  const normalizedLabel = parseLabelInput(body?.label);
  if (normalizedLabel.error) {
    reply.code(400).send({ error: normalizedLabel.error });
    return;
  }
  if (body?.enabled !== undefined && typeof body.enabled !== "boolean") {
    reply.code(400).send({ error: "invalid_enabled_value" });
    return;
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO ip_access_rules (
        ip_address,
        label,
        enabled,
        created_by_user_id,
        updated_by_user_id
      )
      VALUES ($1::inet, $2, $3, $4, $4)
      ON CONFLICT (ip_address) DO UPDATE
      SET label = EXCLUDED.label,
          enabled = EXCLUDED.enabled,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          updated_at = now()
      RETURNING id
      `,
      [
        normalizedIpAddress.value,
        normalizedLabel.provided ? normalizedLabel.value : null,
        body?.enabled ?? true,
        request.userId ?? null
      ]
    );

    invalidateIpAccessStateCache();
    const rules = await listIpAccessRules();
    const rule = rules.find((entry) => entry.id === result.rows[0]?.id);
    if (!rule) {
      reply.code(500).send({ error: "ip_access_rule_save_failed" });
      return;
    }

    const currentIpAddress = getRequestIpAddress(request);
    const currentIpBlocked = !getIpAccessDecision(buildIpAccessStateFromRules(rules), currentIpAddress).allowed;

    await writeAuditLog({
      actorUserId: request.userId,
      action: "security.ip_access.upsert",
      targetType: "ip_access_rule",
      targetId: rule.id,
      metadata: {
        ipAddress: rule.ipAddress,
        label: rule.label,
        enabled: rule.enabled,
        currentIpBlocked,
        requestIp: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      }
    });

    reply.send({
      status: "ok",
      rule,
      currentIpBlocked
    });
  } catch (error: any) {
    if (error?.code === "42P01") {
      reply.code(503).send({ error: "ip_access_controls_unavailable" });
      return;
    }
    throw error;
  }
});

app.patch("/admin/security/ip-access/:id", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const params = request.params as { id?: string };
  if (!params?.id) {
    reply.code(400).send({ error: "ip_access_rule_id_required" });
    return;
  }

  const body = request.body as {
    label?: string | null;
    enabled?: boolean;
  };
  const normalizedLabel = parseLabelInput(body?.label);
  if (normalizedLabel.error) {
    reply.code(400).send({ error: normalizedLabel.error });
    return;
  }
  if (body?.enabled !== undefined && typeof body.enabled !== "boolean") {
    reply.code(400).send({ error: "invalid_enabled_value" });
    return;
  }

  const updates: string[] = [];
  const values: Array<string | boolean | null> = [];

  if (normalizedLabel.provided) {
    values.push(normalizedLabel.value);
    updates.push(`label = $${values.length}`);
  }
  if (body?.enabled !== undefined) {
    values.push(body.enabled);
    updates.push(`enabled = $${values.length}`);
  }

  if (updates.length === 0) {
    reply.code(400).send({ error: "no_fields_to_update" });
    return;
  }

  values.push(request.userId ?? null);
  updates.push(`updated_by_user_id = $${values.length}`);
  updates.push("updated_at = now()");
  values.push(params.id);

  try {
    const result = await pool.query(
      `
      UPDATE ip_access_rules
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING id
      `,
      values
    );
    if ((result.rowCount ?? 0) === 0) {
      reply.code(404).send({ error: "ip_access_rule_not_found" });
      return;
    }

    invalidateIpAccessStateCache();
    const rules = await listIpAccessRules();
    const rule = rules.find((entry) => entry.id === result.rows[0]?.id);
    if (!rule) {
      reply.code(500).send({ error: "ip_access_rule_save_failed" });
      return;
    }

    const currentIpAddress = getRequestIpAddress(request);
    const currentIpBlocked = !getIpAccessDecision(buildIpAccessStateFromRules(rules), currentIpAddress).allowed;

    await writeAuditLog({
      actorUserId: request.userId,
      action: "security.ip_access.update",
      targetType: "ip_access_rule",
      targetId: rule.id,
      metadata: {
        ipAddress: rule.ipAddress,
        label: rule.label,
        enabled: rule.enabled,
        currentIpBlocked,
        requestIp: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      }
    });

    reply.send({
      status: "ok",
      rule,
      currentIpBlocked
    });
  } catch (error: any) {
    if (error?.code === "42P01") {
      reply.code(503).send({ error: "ip_access_controls_unavailable" });
      return;
    }
    throw error;
  }
});

app.delete("/admin/security/ip-access/:id", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const params = request.params as { id?: string };
  if (!params?.id) {
    reply.code(400).send({ error: "ip_access_rule_id_required" });
    return;
  }

  try {
    const existingRes = await pool.query(
      `
      SELECT id, host(ip_address) AS ip_address, label, enabled
      FROM ip_access_rules
      WHERE id = $1
      LIMIT 1
      `,
      [params.id]
    );
    if ((existingRes.rowCount ?? 0) === 0) {
      reply.code(404).send({ error: "ip_access_rule_not_found" });
      return;
    }

    const existingRule = existingRes.rows[0];
    await pool.query("DELETE FROM ip_access_rules WHERE id = $1", [params.id]);
    invalidateIpAccessStateCache();

    await writeAuditLog({
      actorUserId: request.userId,
      action: "security.ip_access.delete",
      targetType: "ip_access_rule",
      targetId: params.id,
      metadata: {
        ipAddress: existingRule.ip_address,
        label: existingRule.label ?? null,
        enabled: Boolean(existingRule.enabled),
        requestIp: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      }
    });

    reply.send({
      status: "ok",
      id: params.id
    });
  } catch (error: any) {
    if (error?.code === "42P01") {
      reply.code(503).send({ error: "ip_access_controls_unavailable" });
      return;
    }
    throw error;
  }
});

app.post("/admin/security/logout-user", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const body = request.body as { userId?: string; reason?: string };
  if (!body?.userId) {
    reply.code(400).send({ error: "user_id_required" });
    return;
  }

  const cutoffRes = await pool.query(
    `
    UPDATE users
    SET force_logout_after = now(), updated_at = now()
    WHERE id = $1
    RETURNING force_logout_after
    `,
    [body.userId]
  );
  if ((cutoffRes.rowCount ?? 0) === 0) {
    reply.code(404).send({ error: "user_not_found" });
    return;
  }

  const revokedRefreshCount = await revokeRefreshTokensForUser(pool, {
    userId: body.userId,
    reason: "admin_forced_logout_user",
    revokedByUserId: request.userId ?? null
  });

  await writeAuditLog({
    actorUserId: request.userId,
    action: "security.logout_user",
    targetType: "user",
    targetId: body.userId,
    metadata: {
      reason: body.reason?.trim() || null,
      revokedRefreshCount,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    }
  });

  reply.send({
    status: "ok",
    userId: body.userId,
    forcedLogoutAfter: new Date(cutoffRes.rows[0].force_logout_after).toISOString(),
    revokedRefreshCount
  });
});

app.post("/admin/security/logout-all", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const body = request.body as { reason?: string };
  const cutoffRes = await pool.query(
    `
    INSERT INTO security_controls (id, global_logout_after, updated_at)
    VALUES (true, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET global_logout_after = EXCLUDED.global_logout_after,
        updated_at = EXCLUDED.updated_at
    RETURNING global_logout_after
    `
  );

  const revokedRefreshCount = await revokeAllRefreshTokens(pool, {
    reason: "admin_forced_logout_all",
    revokedByUserId: request.userId ?? null
  });

  invalidateSecurityControlsCache();

  await writeAuditLog({
    actorUserId: request.userId,
    action: "security.logout_all",
    targetType: "security_control",
    metadata: {
      reason: body.reason?.trim() || null,
      revokedRefreshCount,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    }
  });

  reply.send({
    status: "ok",
    globalLogoutAfter: new Date(cutoffRes.rows[0].global_logout_after).toISOString(),
    revokedRefreshCount
  });
});

app.post("/admin/security/tap-off", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const body = request.body as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    reply.code(400).send({ error: "reason_required" });
    return;
  }

  const controlsRes = await pool.query(
    `
    INSERT INTO security_controls (
      id, tap_off_active, tap_off_started_at, tap_off_ended_at,
      tap_off_reason, tap_off_by_user_id, global_logout_after, updated_at
    )
    VALUES (true, true, now(), NULL, $1, $2, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET tap_off_active = true,
        tap_off_started_at = now(),
        tap_off_ended_at = NULL,
        tap_off_reason = EXCLUDED.tap_off_reason,
        tap_off_by_user_id = EXCLUDED.tap_off_by_user_id,
        global_logout_after = now(),
        updated_at = now()
    RETURNING tap_off_active, tap_off_started_at
    `,
    [reason, request.userId ?? null]
  );

  const revokedRefreshCount = await revokeAllRefreshTokens(pool, {
    reason: "emergency_tap_off",
    revokedByUserId: request.userId ?? null
  });

  invalidateSecurityControlsCache();

  await writeAuditLog({
    actorUserId: request.userId,
    action: "security.tap_off",
    targetType: "security_control",
    metadata: {
      reason,
      revokedRefreshCount,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    }
  });

  reply.send({
    status: "ok",
    tapOffActive: controlsRes.rows[0].tap_off_active,
    startedAt: new Date(controlsRes.rows[0].tap_off_started_at).toISOString()
  });
});

app.post("/admin/security/tap-on", async (request, reply) => {
  if (!(await requireSecurityControlAccess(request, reply))) return;

  const body = request.body as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    reply.code(400).send({ error: "reason_required" });
    return;
  }

  const controlsRes = await pool.query(
    `
    INSERT INTO security_controls (
      id, tap_off_active, tap_off_started_at, tap_off_ended_at,
      tap_off_reason, tap_off_by_user_id, updated_at
    )
    VALUES (true, false, NULL, now(), $1, $2, now())
    ON CONFLICT (id) DO UPDATE
    SET tap_off_active = false,
        tap_off_ended_at = now(),
        tap_off_reason = EXCLUDED.tap_off_reason,
        tap_off_by_user_id = EXCLUDED.tap_off_by_user_id,
        updated_at = now()
    RETURNING tap_off_active, tap_off_ended_at
    `,
    [reason, request.userId ?? null]
  );

  invalidateSecurityControlsCache();

  await writeAuditLog({
    actorUserId: request.userId,
    action: "security.tap_on",
    targetType: "security_control",
    metadata: {
      reason,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null
    }
  });

  reply.send({
    status: "ok",
    tapOffActive: controlsRes.rows[0].tap_off_active,
    endedAt: new Date(controlsRes.rows[0].tap_off_ended_at).toISOString()
  });
});

app.get("/admin/users", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const res = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.created_at,
            u.phone_number,
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
    phoneNumber?: string | null;
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

  const normalizedPhone = parsePhoneNumberInput(body.phoneNumber);
  if (normalizedPhone.error) {
    reply.code(400).send({ error: normalizedPhone.error });
    return;
  }

  const roleName = body.role && ["editor", "viewer"].includes(body.role) ? body.role : "viewer";

  const client = await pool.connect();
  let newUserId = "";
  let purgedLegacyDeletedUser = false;

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id, status FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const existingUser = existing.rows[0] as { id: string; status: string };
      if (existingUser.status === "deleted") {
        const purged = await hardDeleteUserAccount(client, existingUser.id, {
          enforceLastAdminCheck: false
        });
        purgedLegacyDeletedUser = Boolean(purged);
      } else {
        await client.query("ROLLBACK");
        reply.code(409).send({ error: "email_already_exists" });
        return;
      }
    }

    if (normalizedPhone.value) {
      const existingPhone = await client.query(
        "SELECT id FROM users WHERE phone_number = $1 LIMIT 1",
        [normalizedPhone.value]
      );
      if ((existingPhone.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        reply.code(409).send({ error: "phone_number_already_exists" });
        return;
      }
    }

    const roleRes = await client.query("SELECT id FROM roles WHERE name = $1 LIMIT 1", [roleName]);
    const passwordHash = await hashPassword(body.password);
    const insertRes = await client.query(
      `INSERT INTO users (email, password_hash, status, first_name, last_name, phone_number, email_verified_at)
       VALUES ($1, $2, 'active', $3, $4, $5, now())
       RETURNING id`,
      [
        email,
        passwordHash,
        body.firstName ?? "",
        body.lastName ?? "",
        normalizedPhone.value
      ]
    );
    newUserId = insertRes.rows[0].id;

    // Assign role (default to 'viewer')
    // Only allow creating editor or viewer — admin creation is restricted
    if (roleRes.rowCount && roleRes.rowCount > 0) {
      await client.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [newUserId, roleRes.rows[0].id]
      );
    }

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") {
      reply.code(409).send({ error: "email_already_exists" });
      return;
    }
    throw error;
  } finally {
    client.release();
  }

  invalidateEnforcer();
  if (purgedLegacyDeletedUser) {
    await writeAuditLog({
      actorUserId: request.userId,
      action: "user.legacy_deleted_purged",
      targetType: "user",
      metadata: { email }
    });
  }
  await writeAuditLog({
    actorUserId: request.userId,
    action: "user.created",
    targetType: "user",
    targetId: newUserId,
    metadata: { email, role: roleName, phoneNumber: normalizedPhone.value }
  });

  reply.send({
    id: newUserId,
    email,
    phone_number: normalizedPhone.value,
    status: "active",
    role: roleName
  });
});

// Update user profile fields (admin only)
app.patch("/admin/users/:id", async (request, reply) => {
  if (!(await requirePermission(request, reply, "users:manage"))) return;

  const { id } = request.params as { id: string };
  const body = request.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
  };

  const updates: string[] = [];
  const params: (string | number | null)[] = [];
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

  if (body?.phoneNumber !== undefined) {
    const normalizedPhone = parsePhoneNumberInput(body.phoneNumber);
    if (normalizedPhone.error) {
      reply.code(400).send({ error: normalizedPhone.error });
      return;
    }
    if (normalizedPhone.value) {
      const existingPhone = await pool.query(
        "SELECT id FROM users WHERE phone_number = $1 AND id <> $2 LIMIT 1",
        [normalizedPhone.value, id]
      );
      if ((existingPhone.rowCount ?? 0) > 0) {
        reply.code(409).send({ error: "phone_number_already_exists" });
        return;
      }
    }
    params.push(normalizedPhone.value);
    updates.push(`phone_number = $${params.length}`);
    metadata.phoneNumber = normalizedPhone.value ?? "";
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
    RETURNING id, email, first_name, last_name, phone_number, status, created_at
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
  let deletedUser: HardDeleteUserResult | null = null;

  try {
    await client.query("BEGIN");
    deletedUser = await hardDeleteUserAccount(client, id, { enforceLastAdminCheck: true });
    if (!deletedUser) {
      await client.query("ROLLBACK");
      reply.code(404).send({ error: "user_not_found" });
      return;
    }
    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error?.message === "cannot_delete_last_admin") {
      reply.code(400).send({ error: "cannot_delete_last_admin" });
      return;
    }
    if (error?.message === "user_delete_not_complete") {
      reply.code(500).send({ error: "user_delete_failed" });
      return;
    }
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
    metadata: deletedUser ? { email: deletedUser.email } : undefined
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
  const query = request.query as { range?: string };
  const range = parseDashboardRange(query.range);
  const rangeWindow = getDashboardRangeWindow(range);

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
      WHERE created_at >= $1
        AND created_at < $2
      GROUP BY action
      ORDER BY count DESC, action ASC
      LIMIT 8
      `,
      [rangeWindow.from.toISOString(), rangeWindow.to.toISOString()]
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
      WHERE a.created_at >= $1
        AND a.created_at < $2
      ORDER BY a.created_at DESC
      LIMIT 12
      `,
      [rangeWindow.from.toISOString(), rangeWindow.to.toISOString()]
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
    recentAudit: recentAuditRes.rows,
    selectedRange: range
  });
});

app.get("/dashboard", async (request, reply) => {
  const userId = request.userId;
  if (!userId) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }
  const query = request.query as { range?: string };
  const range = parseDashboardRange(query.range);
  const rangeWindow = getDashboardRangeWindow(range);

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
        AND created_at >= $2
        AND created_at < $3
      GROUP BY action
      ORDER BY count DESC, action ASC
      LIMIT 8
      `,
      [userId, rangeWindow.from.toISOString(), rangeWindow.to.toISOString()]
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
        AND a.created_at >= $2
        AND a.created_at < $3
      ORDER BY a.created_at DESC
      LIMIT 12
      `,
      [userId, rangeWindow.from.toISOString(), rangeWindow.to.toISOString()]
    )
  ]);

  reply.send({
    role: primaryRole,
    permissions: profile.permissions,
    items: itemsRes.rows[0],
    activityLast24h: activityRes.rows[0],
    topActions7d: topActionsRes.rows,
    recentActivity: recentActivityRes.rows,
    selectedRange: range
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
