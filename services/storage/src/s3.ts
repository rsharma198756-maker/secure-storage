import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";

const credentials =
  config.s3AccessKey && config.s3SecretKey
    ? {
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey
      }
    : undefined;

const s3Internal = new S3Client({
  region: config.s3Region,
  endpoint: config.s3Endpoint || undefined,
  forcePathStyle: config.s3ForcePathStyle,
  credentials
});

const s3Public = new S3Client({
  region: config.s3Region,
  endpoint: (config.s3PublicEndpoint || config.s3Endpoint) || undefined,
  forcePathStyle: config.s3ForcePathStyle,
  credentials
});

let bucketReady = false;

const ensureBucket = async () => {
  if (!config.s3AutoCreateBucket || bucketReady) return;
  try {
    await s3Internal.send(new HeadBucketCommand({ Bucket: config.s3Bucket }));
    bucketReady = true;
  } catch {
    await s3Internal.send(new CreateBucketCommand({ Bucket: config.s3Bucket }));
    bucketReady = true;
  }
};

export const presignUpload = async (key: string, contentType?: string) => {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream"
  });

  const url = await getSignedUrl(s3Public, command, { expiresIn: 900 });
  return { url, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream" } };
};

export const presignDownload = async (key: string) => {
  await ensureBucket();
  const command = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: key
  });

  const url = await getSignedUrl(s3Public, command, { expiresIn: 900 });
  return { url, method: "GET" };
};

export const presignInternalDownload = async (key: string) => {
  await ensureBucket();
  const command = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: key
  });

  const url = await getSignedUrl(s3Internal, command, { expiresIn: 900 });
  return { url, method: "GET" };
};

export const getObject = async (key: string) => {
  await ensureBucket();
  const result = await s3Internal.send(
    new GetObjectCommand({
      Bucket: config.s3Bucket,
      Key: key
    })
  );

  return {
    body: result.Body,
    contentType: result.ContentType ?? "application/octet-stream",
    contentLength: result.ContentLength
  };
};
