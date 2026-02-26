import crypto from "node:crypto";
export const generateRefreshToken = () => crypto.randomBytes(48).toString("base64url");
export const hashRefreshToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
export const storeRefreshToken = async (pool, params) => {
    await pool.query(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES ($1,$2,$3,$4,$5)
    `, [
        params.userId,
        params.tokenHash,
        params.expiresAt,
        params.userAgent ?? null,
        params.ipAddress ?? null
    ]);
};
export const revokeRefreshToken = async (pool, tokenHash) => {
    await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [tokenHash]);
};
export const findRefreshToken = async (pool, tokenHash) => {
    const res = await pool.query(`
    SELECT id, user_id, expires_at, revoked_at
    FROM refresh_tokens
    WHERE token_hash = $1
    LIMIT 1
    `, [tokenHash]);
    return res.rowCount ? res.rows[0] : null;
};
