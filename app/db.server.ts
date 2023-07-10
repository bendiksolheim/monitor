import { PrismaClient, Event } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

if (process.env.NODE_ENV === "production") {
  prisma = getClient();
} else {
  if (!global.__db__) {
    global.__db__ = getClient();
  }

  prisma = global.__db__;
}

function getClient(): PrismaClient {
  const { DATABASE_URL } = process.env;

  // const client = new PrismaClient();

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

export async function insert(event: Pick<Event, "service" | "status">) {
  return prisma.event.create({
    data: {
      service: event.service,
      status: event.status,
    },
  });
}

async function getEvents(): Promise<Array<Event>> {
  return prisma.event.findMany();
}

async function removeOld() {
  return prisma.event.deleteMany({
    where: {
      created: {
        lt: oneDayAgo(),
      },
    },
  });
}

async function getLatestStatus(): Promise<Array<Event>> {
  return prisma.$queryRaw`
      select e.id, e.service, e.status, e.created
      from Event e
      inner join (
        select service, max(created) as max_created
        from Event
        group by service
      ) as ee
      on e.service = ee.service and e.created = ee.max_created
    `;
}

function oneDayAgo(): Date {
  const now = Date.now();
  return new Date(now - 24 * 60 * 60 * 1000);
}

export { prisma, getEvents, removeOld, getLatestStatus };
