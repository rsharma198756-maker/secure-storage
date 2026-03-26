export const config = {
  port: Number(process.env.PORT ?? 3000),
  trustProxy:
    process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production",
  storageUrl: process.env.STORAGE_URL ?? "http://localhost:4000",
  internalToken: process.env.INTERNAL_TOKEN ?? "dev-internal-token",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Magnus <noreply@securestorage.app>",
  emailFromName: process.env.EMAIL_FROM_NAME ?? "Magnus",
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS ?? "solutionnyx@gmail.com",
  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTls: process.env.SMTP_REQUIRE_TLS !== "false",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? ""
  },
  msg91: {
    apiBaseUrl: process.env.MSG91_API_BASE_URL ?? "https://api.msg91.com/api/v5",
    authKey: process.env.MSG91_AUTH_KEY ?? "",
    templateId: process.env.MSG91_TEMPLATE_ID ?? "",
    senderId: process.env.MSG91_SENDER_ID ?? ""
  },
  serviceJwt: {
    secret: process.env.SERVICE_JWT_SECRET ?? "dev-service-jwt-secret",
    issuer: process.env.SERVICE_JWT_ISSUER ?? "secure-gateway",
    audience: process.env.SERVICE_JWT_AUDIENCE ?? "secure-storage",
    ttlSeconds: Number(process.env.SERVICE_JWT_TTL_SECONDS ?? 30)
  },
  databaseUrl:
    process.env.DATABASE_URL ??
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
  securityControlsEnabled: process.env.SECURITY_CONTROLS_ENABLED === "true",
  securityStepUpTtlSeconds: Number(process.env.SECURITY_STEPUP_TTL_SECONDS ?? 300),
  // Comma-separated list of allowed CORS origins, e.g. "https://app.netlify.app,https://myapp.com"
  // Leave empty to allow all origins (development only)
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [] as string[]
};

if (process.env.NODE_ENV === "production") {
  if (config.serviceJwt.secret === "dev-service-jwt-secret") {
    throw new Error("SERVICE_JWT_SECRET must be set to a strong secret in production");
  }
  if (config.internalToken === "dev-internal-token") {
    throw new Error("INTERNAL_TOKEN must be set to a strong secret in production");
  }
}
