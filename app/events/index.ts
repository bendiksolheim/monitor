import { z } from "zod";
import { prisma, PrismaEvent } from "../db.server";

export const event = z.object({
  id: z.number(),
  service: z.string(),
  ok: z.boolean(),
  created: z.date(),
  latency: z.number().optional(),
});

export type Event = z.infer<typeof event>;

export const newEvent = event.omit({ id: true, created: true });

export type NewEvent = z.infer<typeof newEvent>;

const create = (ev: NewEvent): Promise<Event> =>
  prisma()
    .event.create({
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

const get = (
  criteria: Parameters<ReturnType<typeof prisma>["event"]["findMany"]>[0]
) =>
  prisma()
    .event.findMany(criteria)
    .then((events) =>
      events.map(
        (ev): Event => ({
          ...ev,
          ok: ev.status === "OK",
          latency: ev.latency ?? undefined,
        })
      )
    );

const all = (): Promise<Array<Event>> =>
  prisma()
    .event.findMany()
    .then((events) =>
      events.map(
        (ev): Event => ({
          ...ev,
          ok: ev.status === "OK",
          latency: ev.latency ?? undefined,
        })
      )
    );

const remove = (
  criteria: Parameters<ReturnType<typeof prisma>["event"]["deleteMany"]>[0]
) => prisma().event.deleteMany(criteria);

const latestStatus = (): Promise<Array<Event>> =>
  prisma().$queryRaw<Array<PrismaEvent>>`
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

export default { create, get, all, remove, latestStatus };
