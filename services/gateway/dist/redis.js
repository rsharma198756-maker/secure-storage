import { createClient } from "redis";
import { config } from "./config.js";
const client = createClient({ url: config.redisUrl });
client.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Redis error", err);
});
let connectPromise = null;
export const getRedis = async () => {
    if (!connectPromise) {
        connectPromise = client.connect();
    }
    await connectPromise;
    return client;
};
