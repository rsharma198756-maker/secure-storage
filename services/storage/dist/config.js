export const config = {
    port: Number(process.env.PORT ?? 4000),
    internalToken: process.env.INTERNAL_TOKEN ?? "dev-internal-token",
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
