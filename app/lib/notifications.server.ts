import { prisma } from "./db.server.ts";

const single = (
  criteria: Parameters<
    ReturnType<typeof prisma>["notification"]["findFirst"]
  >[0],
) => prisma().notification.findFirst(criteria);

const create = (data: { message: string }) =>
  prisma().notification.create({ data });

export default { single, create };
