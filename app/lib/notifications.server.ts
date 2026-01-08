import { prisma } from "./db.server.ts";

const single = async (
  criteria: Parameters<
    Awaited<ReturnType<typeof prisma>>["notification"]["findFirst"]
  >[0],
) => {
  const db = await prisma();
  return db.notification.findFirst(criteria);
};

const create = async (data: { message: string }) => {
  const db = await prisma();
  return db.notification.create({ data });
};

export default { single, create };
