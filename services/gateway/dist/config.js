export const config = {
    port: Number(process.env.PORT ?? 3000),
    storageUrl: process.env.STORAGE_URL ?? "http://localhost:4000",
    internalToken: process.env.INTERNAL_TOKEN ?? "dev-internal-token",
    serviceJwt: {
        secret: process.env.SERVICE_JWT_SECRET ?? "dev-service-jwt-secret",
        issuer: process.env.SERVICE_JWT_ISSUER ?? "secure-gateway",
        audience: process.env.SERVICE_JWT_AUDIENCE ?? "secure-storage",
        ttlSeconds: Number(process.env.SERVICE_JWT_TTL_SECONDS ?? 30)
    },
    databaseUrl: process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/secure_storage",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret",
    jwtAccessTtlMinutes: Number(process.env.JWT_ACCESS_TTL_MINUTES ?? 60),
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    otpSecret: process.env.OTP_SECRET ?? "dev-otp-secret",
    otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
    otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    otpRequestWindowSeconds: Number(process.env.OTP_REQUEST_WINDOW_SECONDS ?? 600),
    otpRequestMax: Number(process.env.OTP_REQUEST_MAX ?? 5),
    otpVerifyWindowSeconds: Number(process.env.OTP_VERIFY_WINDOW_SECONDS ?? 600),
    otpVerifyMax: Number(process.env.OTP_VERIFY_MAX ?? 10),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 104857600),
    maxNameLength: Number(process.env.MAX_NAME_LENGTH ?? 255),
    returnOtpInResponse: process.env.RETURN_OTP_IN_RESPONSE === "true",
    allowDevHeader: process.env.ALLOW_DEV_HEADER === "true",
    smtp: {
        host: process.env.SMTP_HOST ?? "localhost",
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: process.env.SMTP_SECURE !== undefined
            ? process.env.SMTP_SECURE === "true"
            : Number(process.env.SMTP_PORT ?? 1025) === 465,
        requireTls: process.env.SMTP_REQUIRE_TLS === "true",
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
        from: process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            "no-reply@secure-storage.local"
    }
};
if (process.env.NODE_ENV === "production") {
    if (config.serviceJwt.secret === "dev-service-jwt-secret") {
        throw new Error("SERVICE_JWT_SECRET must be set to a strong secret in production");
    }
    if (config.internalToken === "dev-internal-token") {
        throw new Error("INTERNAL_TOKEN must be set to a strong secret in production");
    }
}
