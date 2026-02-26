import "dotenv/config";
import Fastify from "fastify";
import { Readable } from "node:stream";
import { config } from "./config.js";
import { getObject, presignDownload, presignInternalDownload, presignUpload } from "./s3.js";
const app = Fastify({ logger: true });
const INTERNAL_AUTH_HEADER = "x-internal-token";
app.addHook("onRequest", async (request, reply) => {
    const token = request.headers[INTERNAL_AUTH_HEADER];
    if (token !== config.internalToken) {
        reply.code(401).send({ error: "unauthorized" });
        return;
    }
});
app.get("/health", async () => ({ status: "ok" }));
app.get("/ready", async () => ({ status: "ok" }));
app.post("/internal/presign/upload", async (request, reply) => {
    const body = request.body;
    if (!body?.key) {
        reply.code(400).send({ error: "key_required" });
        return;
    }
    const result = await presignUpload(body.key, body.contentType);
    reply.send(result);
});
app.post("/internal/presign/download", async (request, reply) => {
    const body = request.body;
    if (!body?.key) {
        reply.code(400).send({ error: "key_required" });
        return;
    }
    const result = await presignDownload(body.key);
    reply.send(result);
});
app.post("/internal/presign/download-internal", async (request, reply) => {
    const body = request.body;
    if (!body?.key) {
        reply.code(400).send({ error: "key_required" });
        return;
    }
    const result = await presignInternalDownload(body.key);
    reply.send(result);
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
    if (!body?.key) {
        reply.code(400).send({ error: "key_required" });
        return;
    }
    try {
        const object = await getObject(body.key);
        reply.header("content-type", object.contentType);
        if (typeof object.contentLength === "number") {
            reply.header("content-length", String(object.contentLength));
        }
        reply.send(toNodeReadable(object.body));
    }
    catch (error) {
        request.log.error({ err: error, key: body.key }, "object_download_failed");
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
