import { prisma } from "../db.server";

export type Event = {
  id: number;
  service: string;
  status: string;
  created: Date;
  latency: number | undefined;
};

type NewEvent = Omit<Event, "id" | "created">;

const create = (ev: NewEvent): Promise<Event> =>
  prisma()
    .event.create({
      data: {
        service: ev.service,
        status: ev.status,
        latency: ev.latency ?? null,
      },
    })
    .then((ev) => ({ ...ev, latency: ev.latency ?? undefined }));

const all = (): Promise<Array<Event>> =>
  prisma()
    .event.findMany()
    .then((events) =>
      events.map(
        (ev): Event => ({
          ...ev,
          latency: ev.latency ?? undefined,
        })
      )
    );

const remove = (
  criteria: Parameters<ReturnType<typeof prisma>["event"]["deleteMany"]>[0]
) => prisma().event.deleteMany(criteria);

const latestStatus = (): Promise<Array<Event>> =>
  prisma().$queryRaw`
      select e.id, e.service, e.status, e.created
      from Event e
      inner join (
        select service, max(created) as max_created
        from Event
        group by service
      ) as ee
      on e.service = ee.service and e.created = ee.max_created
  `;

export default { create, all, remove, latestStatus };
