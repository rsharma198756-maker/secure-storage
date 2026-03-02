import crypto from "node:crypto";
import { Pool } from "pg";

export const generateRefreshToken = () =>
  crypto.randomBytes(48).toString("base64url");

export const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const storeRefreshToken = async (
  pool: Pool,
  params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }
) => {
  await pool.query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [
      params.userId,
      params.tokenHash,
      params.expiresAt,
      params.userAgent ?? null,
      params.ipAddress ?? null
    ]
  );
};

export const revokeRefreshToken = async (pool: Pool, tokenHash: string) => {
  await pool.query(
    `
    UPDATE refresh_tokens
    SET
      revoked_at = now(),
      revoked_reason = COALESCE(revoked_reason, 'logout'),
      revoked_by_user_id = COALESCE(revoked_by_user_id, user_id)
    WHERE token_hash = $1
    `,
    [tokenHash]
  );
};

export const revokeRefreshTokenWithMetadata = async (
  pool: Pool,
  params: {
    tokenHash: string;
    reason: string;
    revokedByUserId?: string | null;
  }
) => {
  await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = now(), revoked_reason = $2, revoked_by_user_id = $3
    WHERE token_hash = $1
    `,
    [params.tokenHash, params.reason, params.revokedByUserId ?? null]
  );
};

export const findRefreshToken = async (pool: Pool, tokenHash: string) => {
  const res = await pool.query(
    `
    SELECT id, user_id, expires_at, revoked_at, created_at
    FROM refresh_tokens
    WHERE token_hash = $1
    LIMIT 1
    `,
    [tokenHash]
  );
  return res.rowCount ? res.rows[0] : null;
};

export const revokeRefreshTokensForUser = async (
  pool: Pool,
  params: {
    userId: string;
    reason: string;
    revokedByUserId?: string | null;
  }
) => {
  const res = await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = now(), revoked_reason = $2, revoked_by_user_id = $3
    WHERE user_id = $1
      AND revoked_at IS NULL
    `,
    [params.userId, params.reason, params.revokedByUserId ?? null]
  );
  return res.rowCount ?? 0;
};

export const revokeAllRefreshTokens = async (
  pool: Pool,
  params: {
    reason: string;
    revokedByUserId?: string | null;
  }
) => {
  const res = await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = now(), revoked_reason = $1, revoked_by_user_id = $2
    WHERE revoked_at IS NULL
    `,
    [params.reason, params.revokedByUserId ?? null]
  );
  return res.rowCount ?? 0;
};
