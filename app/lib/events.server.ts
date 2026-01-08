import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, type PrismaEvent } from "./db.server.ts";

const event = z.object({
  id: z.number(),
  service: z.string(),
  ok: z.boolean(),
  created: z.date(),
  latency: z.number().optional(),
});

export type Event = z.infer<typeof event>;

const newEvent = event.omit({ id: true, created: true });

type NewEvent = z.infer<typeof newEvent>;

const create = async (ev: NewEvent): Promise<Event> => {
  const db = await prisma();
  return db.event
    .create({
      data: {
        service: ev.service,
        status: ev.ok ? "OK" : "ERROR",
        latency: ev.latency ?? null,
      },
    })
    .then((ev: PrismaEvent) => ({
      ...ev,
      ok: ev.status === "OK",
      latency: ev.latency ?? undefined,
    }));
};

const get = async (
  criteria: Parameters<
    Awaited<ReturnType<typeof prisma>>["event"]["findMany"]
  >[0],
): Promise<Array<Event>> => {
  const db = await prisma();
  return db.event.findMany(criteria).then((events) =>
    events.map(
      (ev): Event => ({
        ...ev,
        ok: ev.status === "OK",
        latency: ev.latency ?? undefined,
      }),
    ),
  );
};

const all = async (): Promise<Array<Event>> => {
  const db = await prisma();
  return db.event.findMany().then((events) =>
    events.map(
      (ev): Event => ({
        ...ev,
        ok: ev.status === "OK",
        latency: ev.latency ?? undefined,
      }),
    ),
  );
};

const remove = async (
  criteria: Parameters<
    Awaited<ReturnType<typeof prisma>>["event"]["deleteMany"]
  >[0],
) => {
  const db = await prisma();
  return db.event.deleteMany(criteria);
};

const latestStatus = async (): Promise<Array<Event>> => {
  const db = await prisma();
  return db.$queryRaw<Array<PrismaEvent>>`
      select e.id, e.service, e.status, e.created
      from Event e
      inner join (
        select service, max(created) as max_created
        from Event
        group by service
      ) as ee
      on e.service = ee.service and e.created = ee.max_created
  `.then((events: Array<PrismaEvent>): Array<Event> => {
    return events.map((ev) => ({
      id: ev.id,
      created: ev.created,
      service: ev.service,
      ok: ev.status === "OK",
      latency: ev.latency ?? undefined,
    }));
  });
};

const aggregate = async (
  criteria: Parameters<
    Awaited<ReturnType<typeof prisma>>["event"]["aggregate"]
  >[0],
) => {
  const db = await prisma();
  return db.event.aggregate(criteria);
};

const averageLatencyByService = async (
  services: string[],
  since: Date,
): Promise<Record<string, number>> => {
  const db = await prisma();

  // Get average latency per service using raw SQL for better performance
  const results = await db.$queryRaw<
    Array<{ service: string; avg_latency: number | null }>
  >`
    SELECT service, AVG(latency) as avg_latency
    FROM Event
    WHERE service IN (${Prisma.join(services)})
      AND created >= ${since}
      AND latency IS NOT NULL
    GROUP BY service
  `;

  // Convert to a dictionary for easy lookup
  return results.reduce(
    (acc, row) => {
      acc[row.service] = row.avg_latency ?? 0;
      return acc;
    },
    {} as Record<string, number>,
  );
};

export default {
  create,
  get,
  all,
  remove,
  latestStatus,
  aggregate,
  averageLatencyByService,
};
