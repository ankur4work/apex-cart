import { MongoClient } from "mongodb";
import { Session } from "@shopify/shopify-api";

let client;
let collection;

const getMongoConfig = () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  const collectionName = process.env.MONGODB_SESSION_COLLECTION || "shopify_sessions";
  return { uri, dbName, collectionName };
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getSessionCollection = async () => {
  const { uri, dbName, collectionName } = getMongoConfig();

  if (!uri || !dbName) {
    throw new Error("Missing MONGODB_URI or MONGODB_DB_NAME environment variables");
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB for session storage");
  }

  if (!collection) {
    collection = client.db(dbName).collection(collectionName);
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ shop: 1 });
  }

  return collection;
};

const serializeSession = (session) => {
  const payload = typeof session.toObject === "function" ? session.toObject() : { ...session };

  return {
    id: session.id,
    shop: session.shop,
    state: session.state,
    isOnline: session.isOnline,
    scope: session.scope ?? null,
    accessToken: session.accessToken ?? null,
    expires: normalizeDateValue(session.expires),
    onlineAccessInfo: session.onlineAccessInfo ?? null,
    refreshToken: session.refreshToken ?? null,
    refreshTokenExpires: normalizeDateValue(session.refreshTokenExpires),
    payload,
    updatedAt: new Date(),
  };
};

const hydrateSession = (doc) => {
  if (!doc) return undefined;

  const payload = {
    ...(doc.payload || {}),
    id: doc.id,
    shop: doc.shop,
    state: doc.state,
    isOnline: doc.isOnline,
    scope: doc.scope ?? undefined,
    accessToken: doc.accessToken ?? undefined,
    expires: normalizeDateValue(doc.expires) ?? undefined,
    onlineAccessInfo: doc.onlineAccessInfo ?? undefined,
    refreshToken: doc.refreshToken ?? undefined,
    refreshTokenExpires: normalizeDateValue(doc.refreshTokenExpires) ?? undefined,
  };

  if (typeof Session.fromPropertyArray === "function") {
    return Session.fromPropertyArray(Object.entries(payload));
  }

  const session = new Session(payload.id, payload.shop, payload.state, payload.isOnline);
  Object.assign(session, payload);
  return session;
};

export class CustomMongoDBSessionStorage {
  async storeSession(session) {
    const sessions = await getSessionCollection();
    const serialized = serializeSession(session);

    await sessions.updateOne(
      { id: serialized.id },
      { $set: serialized },
      { upsert: true }
    );

    return true;
  }

  async loadSession(id) {
    const sessions = await getSessionCollection();
    const doc = await sessions.findOne({ id });
    return hydrateSession(doc);
  }

  async deleteSession(id) {
    const sessions = await getSessionCollection();
    await sessions.deleteOne({ id });
    return true;
  }

  async deleteSessions(ids = []) {
    if (!ids.length) return true;
    const sessions = await getSessionCollection();
    await sessions.deleteMany({ id: { $in: ids } });
    return true;
  }

  async findSessionsByShop(shop) {
    const sessions = await getSessionCollection();
    const docs = await sessions.find({ shop }).toArray();
    return docs.map(hydrateSession).filter(Boolean);
  }
}

export const sessionStorage = new CustomMongoDBSessionStorage();

export const connectToMongoDB = async () => {
  return getSessionCollection();
};
