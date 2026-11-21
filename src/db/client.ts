import { MongoClient, type Db } from "mongodb";

// The defaults match docker-compose.yml, so the app runs without a .env.local.
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27018";
const dbName = process.env.MONGODB_DB ?? "website_manager";

// `next dev` reloads this module whenever a file changes. Keeping the client
// on globalThis lets a reload reuse the open connections instead of opening a
// new set each time.
const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
};

export function getMongoClient(): MongoClient {
  // Fail after 4 seconds, not the driver's 30, when MongoDB is not running.
  globalForMongo.mongoClient ??= new MongoClient(uri, {
    serverSelectionTimeoutMS: 4000,
  });
  return globalForMongo.mongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(dbName);
}
