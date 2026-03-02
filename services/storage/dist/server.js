import "dotenv/config";
import Fastify from "fastify";
import { Readable } from "node:stream";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { config } from "./config.js";
import { getObject, presignDownload, presignInternalDownload, presignUpload, putObject } from "./s3.js";
const app = Fastify({ logger: true });
const pool = new Pool({ connectionString: config.databaseUrl });
// Accept raw binary bodies for file uploads.
// Fastify's built-in application/json parser still takes priority over "*".
app.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
const INTERNAL_AUTH_HEADER = "x-internal-token";
const SERVICE_AUTH_HEADER = "x-service-authorization";
const FORWARDED_USER_AUTH_HEADER = "x-user-authorization";
const MAINTENANCE_RETRY_AFTER_SECONDS = 90;
const MAINTENANCE_PAYLOAD = {
    error: "service_temporarily_unavailable",
    message: "We're performing routine service maintenance. Please try again shortly."
};
const SECURITY_STATE_CACHE_MS = 1000;
let tapOffCache;
let warnedMissingSecurityControlsTable = false;
const PERMISSION_MAP = {
    read: ["read", "write", "delete", "manage"],
    write: ["write", "delete", "manage"],
    delete: ["delete", "manage"],
    manage: ["manage"]
};
const allowedPermissions = (required) => PERMISSION_MAP[required];
const getServiceClaims = (request) => request.serviceClaims;
const parseBearerToken = (header) => {
    if (!header || Array.isArray(header))
        return null;
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token)
        return null;
    return token;
};
const sendMaintenanceResponse = (reply) => {
    reply.header("retry-after", String(MAINTENANCE_RETRY_AFTER_SECONDS));
    reply.code(503).send(MAINTENANCE_PAYLOAD);
};
const isTapOffActive = async () => {
    if (!config.securityControlsEnabled)
        return false;
    const now = Date.now();
    if (tapOffCache && now - tapOffCache.loadedAt < SECURITY_STATE_CACHE_MS) {
        return tapOffCache.tapOffActive;
    }
    let tapOffActive = false;
    try {
        const res = await pool.query("SELECT tap_off_active FROM security_controls WHERE id = true LIMIT 1");
        tapOffActive = Boolean(res.rows[0]?.tap_off_active);
    }
    catch (error) {
        if (error?.code === "42P01") {
            if (!warnedMissingSecurityControlsTable) {
                warnedMissingSecurityControlsTable = true;
                app.log.warn("security_controls table is missing; tap-off enforcement is temporarily disabled until migrations are applied");
            }
            tapOffActive = false;
        }
        else {
            throw error;
        }
    }
    tapOffCache = { tapOffActive, loadedAt: now };
    return tapOffActive;
};
const ensureActiveUser = async (userId) => {
    const res = await pool.query("SELECT status FROM users WHERE id = $1", [userId]);
    if (!res.rowCount)
        return false;
    return res.rows[0].status === "active";
};
const hasPermission = async (userId, permissionKey) => {
    const res = await pool.query(`
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = $1
      AND p.key = $2
    LIMIT 1
    `, [userId, permissionKey]);
    return (res.rowCount ?? 0) > 0;
};
const isOwner = async (userId, itemId) => {
    const res = await pool.query("SELECT owner_user_id FROM items WHERE id = $1 AND status = 'active'", [itemId]);
    if (!res.rowCount)
        return { exists: false, owner: false };
    return { exists: true, owner: res.rows[0].owner_user_id === userId };
};
const hasItemPermission = async (userId, itemId, required) => {
    const ownerCheck = await isOwner(userId, itemId);
    if (!ownerCheck.exists)
        return false;
    if (ownerCheck.owner)
        return true;
    const allowed = allowedPermissions(required);
    const res = await pool.query(`
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
    `, [userId, itemId, allowed]);
    return (res.rowCount ?? 0) > 0;
};
const requireForwardedUser = async (request, reply) => {
    const claims = getServiceClaims(request);
    if (!claims || claims.kind !== "user" || !claims.userId) {
        reply.code(403).send({ error: "storage_user_context_required" });
        return null;
    }
    const forwardedAuth = request.headers[FORWARDED_USER_AUTH_HEADER];
    const token = parseBearerToken(forwardedAuth);
    if (!token) {
        reply.code(401).send({ error: "forwarded_user_token_required" });
        return null;
    }
    try {
        const payload = jwt.verify(token, config.jwtSecret);
        if (!payload?.sub || payload.sub !== claims.userId) {
            reply.code(401).send({ error: "forwarded_user_token_invalid" });
            return null;
        }
    }
    catch {
        reply.code(401).send({ error: "forwarded_user_token_invalid" });
        return null;
    }
    const active = await ensureActiveUser(claims.userId);
    if (!active) {
        reply.code(403).send({ error: "user_disabled" });
        return null;
    }
    return claims.userId;
};
const getFileStorageKey = async (itemId) => {
    const itemRes = await pool.query(`
    SELECT id, type, storage_key
    FROM items
    WHERE id = $1
      AND status = 'active'
    LIMIT 1
    `, [itemId]);
    if (!itemRes.rowCount) {
        return { error: "item_not_found" };
    }
    const item = itemRes.rows[0];
    if (item.type !== "file") {
        return { error: "not_a_file" };
    }
    if (!item.storage_key) {
        return { error: "missing_storage_key" };
    }
    return { storageKey: item.storage_key };
};
app.addHook("onRequest", async (request, reply) => {
    // Health/ready checks only need the internal token — no service JWT required.
    // This allows the gateway's /ready endpoint to call storage's /health without
    // needing to produce a full service JWT.
    const isHealthCheck = request.url === "/health" || request.url === "/ready";
    const internalToken = request.headers[INTERNAL_AUTH_HEADER];
    if (internalToken !== config.internalToken) {
        reply.code(401).send({ error: "unauthorized" });
        return;
    }
    if (isHealthCheck)
        return; // Internal token is enough for health checks
    const authHeader = request.headers[SERVICE_AUTH_HEADER];
    const serviceToken = parseBearerToken(authHeader);
    if (!serviceToken) {
        reply.code(401).send({ error: "service_token_required" });
        return;
    }
    try {
        const claims = jwt.verify(serviceToken, config.serviceJwt.secret, {
            issuer: config.serviceJwt.issuer,
            audience: config.serviceJwt.audience
        });
        // Enforce scope — each endpoint only accepts its designated scope
        const url = request.url.split("?")[0];
        const SCOPE_MAP = {
            "/internal/presign/upload": ["items.upload"],
            "/internal/presign/download": ["items.download"],
            "/internal/presign/download-internal": ["items.download"],
            "/internal/object/download": ["items.download"],
            "/internal/object/upload": ["items.upload"]
        };
        const allowedScopes = SCOPE_MAP[url];
        if (allowedScopes && !allowedScopes.includes(claims.scope)) {
            reply.code(403).send({ error: "service_token_scope_insufficient" });
            return;
        }
        if (await isTapOffActive()) {
            sendMaintenanceResponse(reply);
            return;
        }
        request.serviceClaims = claims;
    }
    catch {
        reply.code(401).send({ error: "service_token_invalid" });
        return;
    }
});
app.get("/health", async () => ({ status: "ok" }));
app.get("/ready", async () => ({ status: "ok" }));
app.post("/internal/presign/upload", async (request, reply) => {
    const body = request.body;
    if (!body?.itemId) {
        reply.code(400).send({ error: "item_id_required" });
        return;
    }
    const userId = await requireForwardedUser(request, reply);
    if (!userId)
        return;
    const canWrite = await hasPermission(userId, "items:write");
    if (!canWrite) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const canWriteItem = await hasItemPermission(userId, body.itemId, "write");
    if (!canWriteItem) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const resolved = await getFileStorageKey(body.itemId);
    if ("error" in resolved) {
        reply.code(400).send({ error: resolved.error });
        return;
    }
    const result = await presignUpload(resolved.storageKey, body.contentType);
    reply.send(result);
});
app.post("/internal/presign/download", async (request, reply) => {
    const body = request.body;
    if (!body?.itemId) {
        reply.code(400).send({ error: "item_id_required" });
        return;
    }
    const userId = await requireForwardedUser(request, reply);
    if (!userId)
        return;
    const canRead = await hasPermission(userId, "items:read");
    if (!canRead) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const canReadItem = await hasItemPermission(userId, body.itemId, "read");
    if (!canReadItem) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const resolved = await getFileStorageKey(body.itemId);
    if ("error" in resolved) {
        reply.code(400).send({ error: resolved.error });
        return;
    }
    const result = await presignDownload(resolved.storageKey);
    reply.send(result);
});
app.post("/internal/presign/download-internal", async (request, reply) => {
    const body = request.body;
    if (!body?.itemId) {
        reply.code(400).send({ error: "item_id_required" });
        return;
    }
    const userId = await requireForwardedUser(request, reply);
    if (!userId)
        return;
    const canRead = await hasPermission(userId, "items:read");
    if (!canRead) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const canReadItem = await hasItemPermission(userId, body.itemId, "read");
    if (!canReadItem) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const resolved = await getFileStorageKey(body.itemId);
    if ("error" in resolved) {
        reply.code(400).send({ error: resolved.error });
        return;
    }
    const result = await presignInternalDownload(resolved.storageKey);
    reply.send(result);
});
app.post("/internal/object/upload", async (request, reply) => {
    const userId = await requireForwardedUser(request, reply);
    if (!userId)
        return;
    const itemId = request.headers["x-item-id"];
    if (!itemId) {
        reply.code(400).send({ error: "x-item-id_header_required" });
        return;
    }
    const canWrite = await hasPermission(userId, "items:write");
    if (!canWrite) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const canWriteItem = await hasItemPermission(userId, itemId, "write");
    if (!canWriteItem) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const resolved = await getFileStorageKey(itemId);
    if ("error" in resolved) {
        reply.code(400).send({ error: resolved.error });
        return;
    }
    const contentType = request.headers["x-file-content-type"] ||
        "application/octet-stream";
    const body = request.body;
    const buffer = Buffer.isBuffer(body)
        ? body
        : body instanceof Uint8Array
            ? Buffer.from(body)
            : typeof body === "string"
                ? Buffer.from(body)
                : null;
    if (!buffer) {
        reply.code(400).send({ error: "binary_body_required" });
        return;
    }
    await putObject(resolved.storageKey, buffer, contentType);
    reply.send({ status: "ok" });
});
const toNodeReadable = (body) => {
    if (!body) {
        throw new Error("object_body_missing");
    }
    if (body instanceof Readable) {
        return body;
    }
    if (typeof body.getReader === "function") {
        return Readable.fromWeb(body);
    }
    if (typeof body.stream === "function") {
        return Readable.fromWeb(body.stream());
    }
    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
        return Readable.from(body);
    }
    return Readable.from(body);
};
app.post("/internal/object/download", async (request, reply) => {
    const body = request.body;
    if (!body?.itemId) {
        reply.code(400).send({ error: "item_id_required" });
        return;
    }
    const userId = await requireForwardedUser(request, reply);
    if (!userId)
        return;
    const canRead = await hasPermission(userId, "items:read");
    if (!canRead) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const canReadItem = await hasItemPermission(userId, body.itemId, "read");
    if (!canReadItem) {
        reply.code(403).send({ error: "forbidden" });
        return;
    }
    const resolved = await getFileStorageKey(body.itemId);
    if ("error" in resolved) {
        reply.code(400).send({ error: resolved.error });
        return;
    }
    try {
        const object = await getObject(resolved.storageKey);
        // Collect stream into buffer for reliable cross-network response
        const chunks = [];
        for await (const chunk of object.body) {
            chunks.push(Buffer.from(chunk));
        }
        const data = Buffer.concat(chunks);
        reply.header("content-type", object.contentType);
        reply.header("content-length", String(data.byteLength));
        reply.send(data);
    }
    catch (error) {
        request.log.error({ err: error, itemId: body.itemId }, "object_download_failed");
        reply.code(404).send({ error: "object_not_found" });
    }
});
const start = async () => {
    try {
        await app.listen({ port: config.port, host: "0.0.0.0" });
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
