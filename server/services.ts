import { Service } from "./config";
import { log } from "./log";
import { schedule } from "./scheduler.server";

export function configureServices(services: Array<Service>) {
  services.forEach((service) => {
    log(`├─ ${service.service} (${service.expression})`);
    schedule(service);
  });
}
