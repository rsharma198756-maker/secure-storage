export const config = {
    port: Number(process.env.PORT ?? 4000),
    internalToken: process.env.INTERNAL_TOKEN ?? "dev-internal-token",
    jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret",
    serviceJwt: {
        secret: process.env.SERVICE_JWT_SECRET ?? "dev-service-jwt-secret",
        issuer: process.env.SERVICE_JWT_ISSUER ?? "secure-gateway",
        audience: process.env.SERVICE_JWT_AUDIENCE ?? "secure-storage"
    },
    databaseUrl: process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/secure_storage",
    s3Endpoint: process.env.S3_ENDPOINT ?? "",
    s3PublicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? "",
    s3Region: process.env.S3_REGION ?? "us-east-1",
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" ||
        Boolean(process.env.S3_ENDPOINT),
    s3AccessKey: process.env.S3_ACCESS_KEY ?? "",
    s3SecretKey: process.env.S3_SECRET_KEY ?? "",
    s3Bucket: process.env.S3_BUCKET ?? "secure-storage",
    s3AutoCreateBucket: process.env.S3_AUTO_CREATE_BUCKET === "true"
};
if (process.env.NODE_ENV === "production") {
    if (config.serviceJwt.secret === "dev-service-jwt-secret") {
        throw new Error("SERVICE_JWT_SECRET must be set to a strong secret in production");
    }
    if (config.internalToken === "dev-internal-token") {
        throw new Error("INTERNAL_TOKEN must be set to a strong secret in production");
    }
    if (config.jwtSecret === "dev-jwt-secret") {
        throw new Error("JWT_SECRET must be set to a strong secret in production");
    }
}
