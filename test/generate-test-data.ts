import { getConfig } from "../server/config";
import { prisma } from "../app/db.server";

const ONE_MINUTE = 60;

type Second = number;

const config = getConfig();
const services = config.services.map((service) => service.service);

// Delete all existing data
const removed = await prisma().event.deleteMany();
console.log(`Removed ${removed.count} old events`);

// Generate new data
console.log(`Generating data for services: ${services.join(", ")}`);
services.forEach(async (service) => {
  const now: Second = Math.ceil(Date.now() / 1000);
  let oneDayAgo: Second = now - 86_400;
  while (oneDayAgo < now) {
    if (Math.random() < 0.005) {
      await prisma().event.create({
        data: {
          status: "ERROR",
          service: service,
          created: new Date(oneDayAgo * 1000),
        },
      });
    } else {
      await prisma().event.create({
        data: {
          status: "OK",
          service: service,
          latency: 50 + Math.random() * 500,
          created: new Date(oneDayAgo * 1000),
        },
      });
    }
    oneDayAgo = oneDayAgo + ONE_MINUTE;
  }
});
