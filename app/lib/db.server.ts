import { PrismaClient, type Event } from "@prisma/client";

let _prisma: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

if (process.env.NODE_ENV === "production") {
  _prisma = getClient();
} else {
  if (!global.__db__) {
    global.__db__ = getClient();
  }

  _prisma = global.__db__;
}

function getClient(): PrismaClient {
  const { DATABASE_URL } = process.env;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  client.$connect();

  return client;
}

export function prisma(): PrismaClient {
  return _prisma;
}

export type PrismaEvent = Event;
