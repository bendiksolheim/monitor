import { prisma } from "../db.server";

export type Notification = {
  id: number;
  timestamp: Date;
  message: string;
};

type NewNotification = Omit<Notification, "id" | "timestamp">;

const create = (notification: NewNotification): Promise<Notification> =>
  prisma().notification.create({
    data: {
      ...notification,
    },
  });

const single = (
  order: Parameters<ReturnType<typeof prisma>["notification"]["findFirst"]>[0]
): Promise<Notification | null> => prisma().notification.findFirst(order);

export default { single, create };
