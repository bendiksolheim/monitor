import { PrismaClient, type Event } from "@prisma/client";

let _prisma: PrismaClient | undefined;

declare global {
  var __db__: PrismaClient | undefined;
}

async function getClient(): Promise<PrismaClient> {
  const { DATABASE_URL } = process.env;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  await client.$connect();

  return client;
}

export async function prisma(): Promise<PrismaClient> {
  if (_prisma) {
    return _prisma;
  }

  if (process.env.NODE_ENV === "production") {
    _prisma = await getClient();
  } else {
    if (!global.__db__) {
      global.__db__ = await getClient();
    }
    _prisma = global.__db__;
  }

  return _prisma;
}

export type PrismaEvent = Event;
