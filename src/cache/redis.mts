import { setTimeout as sleep } from "node:timers/promises";
import { createClient } from "redis";

/** The connection to Redis. (Why this is a .mts file: see page-cache.mts.) */

// The same file can be loaded more than once in a process: by Node as the
// cache handler, and again inside the code Next.js bundles. Keeping the
// connection on globalThis means they share one.
const globalForRedis = globalThis as typeof globalThis & {
  redisConnection?: ReturnType<typeof connect>;
};

function connect() {
  const client = createClient({
    url: process.env.REDIS_URL ?? "redis://127.0.0.1:6380",
    socket: { connectTimeout: 1000 },
  });

  // The client tries to reconnect every couple of seconds for as long as it
  // takes. Say something when Redis goes and when it returns, not every time.
  let isDown = false;
  client.on("error", (error: Error) => {
    if (!isDown) {
      console.warn(
        `Redis is not available (${error.message}). Until it is, public pages are rendered on every request.`,
      );
    }
    isDown = true;
  });
  client.on("ready", () => {
    if (isDown) console.log("Redis is available again.");
    isDown = false;
  });

  // connect() only finishes once Redis answers, so stop waiting after a second.
  return { client, firstAttempt: Promise.race([client.connect(), sleep(1000)]) };
}

/**
 * Connects on the first call and shares that connection after. Redis may not
 * be there, so check the client's `isReady` before relying on it.
 */
export async function getRedis() {
  globalForRedis.redisConnection ??= connect();
  await globalForRedis.redisConnection.firstAttempt;
  return globalForRedis.redisConnection.client;
}
