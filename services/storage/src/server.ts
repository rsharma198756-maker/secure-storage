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
app.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) =>
  done(null, body)
);


const INTERNAL_AUTH_HEADER = "x-internal-token";
const SERVICE_AUTH_HEADER = "x-service-authorization";
const FORWARDED_USER_AUTH_HEADER = "x-user-authorization";

type ServiceClaims = {
  kind: "system" | "user";
  scope: string;
  userId?: string;
};

type ItemPermission = "read" | "write" | "delete" | "manage";
const PERMISSION_MAP: Record<ItemPermission, ItemPermission[]> = {
  read: ["read", "write", "delete", "manage"],
  write: ["write", "delete", "manage"],
  delete: ["delete", "manage"],
  manage: ["manage"]
};

const allowedPermissions = (required: ItemPermission) => PERMISSION_MAP[required];

const getServiceClaims = (request: { serviceClaims?: ServiceClaims }) =>
  request.serviceClaims;

const parseBearerToken = (header?: string | string[]) => {
  if (!header || Array.isArray(header)) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

const ensureActiveUser = async (userId: string) => {
  const res = await pool.query("SELECT status FROM users WHERE id = $1", [userId]);
  if (!res.rowCount) return false;
  return res.rows[0].status === "active";
};

const hasPermission = async (userId: string, permissionKey: string) => {
  const res = await pool.query(
    `
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = $1
      AND p.key = $2
    LIMIT 1
    `,
    [userId, permissionKey]
  );
  return (res.rowCount ?? 0) > 0;
};

const isOwner = async (userId: string, itemId: string) => {
  const res = await pool.query(
    "SELECT owner_user_id FROM items WHERE id = $1 AND status = 'active'",
    [itemId]
  );
  if (!res.rowCount) return { exists: false, owner: false };
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

const requireForwardedUser = async (
  request: {
    headers: Record<string, unknown>;
    serviceClaims?: ServiceClaims;
  },
  reply: any
) => {
  const claims = getServiceClaims(request);
  if (!claims || claims.kind !== "user" || !claims.userId) {
    reply.code(403).send({ error: "storage_user_context_required" });
    return null;
  }

  const forwardedAuth = request.headers[FORWARDED_USER_AUTH_HEADER] as
    | string
    | string[]
    | undefined;
  const token = parseBearerToken(forwardedAuth);
  if (!token) {
    reply.code(401).send({ error: "forwarded_user_token_required" });
    return null;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
    if (!payload?.sub || payload.sub !== claims.userId) {
      reply.code(401).send({ error: "forwarded_user_token_invalid" });
      return null;
    }
  } catch {
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

const getFileStorageKey = async (itemId: string) => {
  const itemRes = await pool.query(
    `
    SELECT id, type, storage_key
    FROM items
    WHERE id = $1
      AND status = 'active'
    LIMIT 1
    `,
    [itemId]
  );

  if (!itemRes.rowCount) {
    return { error: "item_not_found" as const };
  }

  const item = itemRes.rows[0];
  if (item.type !== "file") {
    return { error: "not_a_file" as const };
  }
  if (!item.storage_key) {
    return { error: "missing_storage_key" as const };
  }

  return { storageKey: item.storage_key as string };
};

app.addHook("onRequest", async (request, reply) => {
  // Health/ready checks only need the internal token — no service JWT required.
  // This allows the gateway's /ready endpoint to call storage's /health without
  // needing to produce a full service JWT.
  const isHealthCheck =
    request.url === "/health" || request.url === "/ready";

  const internalToken = request.headers[INTERNAL_AUTH_HEADER] as
    | string
    | undefined;
  if (internalToken !== config.internalToken) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }

  if (isHealthCheck) return; // Internal token is enough for health checks

  const authHeader = request.headers[SERVICE_AUTH_HEADER] as
    | string
    | string[]
    | undefined;
  const serviceToken = parseBearerToken(authHeader);
  if (!serviceToken) {
    reply.code(401).send({ error: "service_token_required" });
    return;
  }

  try {
    const claims = jwt.verify(serviceToken, config.serviceJwt.secret, {
      issuer: config.serviceJwt.issuer,
      audience: config.serviceJwt.audience
    }) as ServiceClaims;
    request.serviceClaims = claims;
  } catch {
    reply.code(401).send({ error: "service_token_invalid" });
    return;
  }
});

app.get("/health", async () => ({ status: "ok" }));
app.get("/ready", async () => ({ status: "ok" }));

app.post("/internal/presign/upload", async (request, reply) => {
  const body = request.body as { itemId?: string; contentType?: string };
  if (!body?.itemId) {
    reply.code(400).send({ error: "item_id_required" });
    return;
  }

  const userId = await requireForwardedUser(request, reply);
  if (!userId) return;

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
  const body = request.body as { itemId?: string };
  if (!body?.itemId) {
    reply.code(400).send({ error: "item_id_required" });
    return;
  }

  const userId = await requireForwardedUser(request, reply);
  if (!userId) return;

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
  const body = request.body as { itemId?: string };
  if (!body?.itemId) {
    reply.code(400).send({ error: "item_id_required" });
    return;
  }

  const userId = await requireForwardedUser(request, reply);
  if (!userId) return;

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
  if (!userId) return;

  const itemId = request.headers["x-item-id"] as string | undefined;
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

  const contentType =
    (request.headers["x-file-content-type"] as string | undefined) ||
    "application/octet-stream";

  const body = request.body;
  const buffer =
    Buffer.isBuffer(body)
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

const toNodeReadable = (body: any): Readable => {
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
  const body = request.body as { itemId?: string };
  if (!body?.itemId) {
    reply.code(400).send({ error: "item_id_required" });
    return;
  }

  const userId = await requireForwardedUser(request, reply);
  if (!userId) return;

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
    reply.header("content-type", object.contentType);
    if (typeof object.contentLength === "number") {
      reply.header("content-length", String(object.contentLength));
    }
    reply.send(toNodeReadable(object.body));
  } catch (error: any) {
    request.log.error(
      { err: error, itemId: body.itemId },
      "object_download_failed"
    );
    reply.code(404).send({ error: "object_not_found" });
  }
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
