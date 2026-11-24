import { MongoClient, type Db } from "mongodb";

// `next dev` reloads this module whenever a file changes. Keeping the
// connection on globalThis lets a reload reuse it instead of opening a new
// one each time.
const globalForMongo = globalThis as typeof globalThis & {
  mongoConnection?: Promise<MongoClient>;
};

/**
 * Connects to MongoDB on the first call and shares that connection after.
 *
 * What is kept is the promise of a connected client, so requests that arrive
 * together all wait for the same connection.
 *
 * The defaults match docker-compose.yml, so the app runs without a
 * .env.local. The environment is read here, not when this file loads, so the
 * seed script can load .env.local before connecting.
 */
export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoConnection) {
    const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27018";

    // Fail after 4 seconds, not the driver's 30, when MongoDB is not running.
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });

    globalForMongo.mongoConnection = client.connect().catch((error: unknown) => {
      // A client whose first connection fails cannot be used again. Forget
      // it, so the next request makes a new one. Without this, starting the
      // app before MongoDB would leave every page failing until a restart.
      globalForMongo.mongoConnection = undefined;
      throw error;
    });
  }

  return globalForMongo.mongoConnection;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB ?? "website_manager");
}
