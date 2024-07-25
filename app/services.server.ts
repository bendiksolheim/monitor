import { getConfig } from "../server/config";
import events, { type Event } from "./events";

async function status(): Promise<Array<Event>> {
  const config = getConfig();
  const services = config.services.map((service) => service.service);
  const status = await events.latestStatus();

  return status.filter((s) => services.includes(s.service));
}

export default { status };
