import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

if (!process.env.MONGODB_URI) {
  console.warn("MongoDB URI not found in environment variables. Some features may not work.");
  clientPromise = null;
} else {
  if (process.env.NODE_ENV === "development") {
    // In development, use a global variable so the value is preserved across module reloads
    if (!(global as any)._mongoClientPromise) {
      client = new MongoClient(uri, options);
      (global as any)._mongoClientPromise = client.connect().catch((error) => {
        console.error("Failed to connect to MongoDB:", error.message);
        return null;
      });
    }
    clientPromise = (global as any)._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect().catch((error) => {
      console.error("Failed to connect to MongoDB:", error.message);
      return null;
    });
  }
}

export default clientPromise;