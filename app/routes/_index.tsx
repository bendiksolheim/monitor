import { json } from "@remix-run/node";
import { getEvents, getLatestStatus } from "../db.server";
import { useLoaderData } from "@remix-run/react";
import { group, last } from "~/util/arrays";
import { Event } from "@prisma/client";
import { relativeTimeSince } from "~/util/dates";
import { Suspense } from "react";
import { Sparkline } from "~/sparkline";

export const loader = async () => {
  const events = await getEvents();
  const serviceMap: Record<string, Array<Event>> = group(
    events,
    (event) => event.service
  );
  const latestStatus = await getLatestStatus();

  return json({ serviceMap, latestStatus });
};

export default function Index(): JSX.Element {
  const { serviceMap, latestStatus } = useLoaderData<typeof loader>();
  const everythingOk = latestStatus.every((e) => e.status === "OK");
  const services = Object.keys(serviceMap);
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Status</h1>
      <div className={`pill`}>
        <div
          className={`pill__status pill__status--${
            everythingOk ? "ok" : "error"
          }`}
        ></div>
        <div>{everythingOk ? "Operational" : "Some service failing"}</div>
      </div>
      <ul className="services">
        {services.map((service) => {
          // TODO: Why do I need to cast this?
          const events: Array<Event> = serviceMap[
            service
          ] as unknown as Array<Event>;
          return <Service key={service} events={events} />;
        })}
      </ul>
    </div>
  );
}

function Service(props: { events: Array<Event> }): JSX.Element {
  const { events } = props;
  const operational = last(events)?.status === "OK";
  const latencies = events.map((event) => event.latency);
  return (
    <li>
      <div className="service">
        <h2 className="service__name">{events[0].service}</h2>
        <div className="service__operational pill">
          <div
            className={`pill__status pill__status--${
              operational ? "ok" : "error"
            }`}
          ></div>
          <div>{operational ? "Operational" : "Failing"}</div>
        </div>
        <div>
          <Sparkline values={latencies} />
        </div>
      </div>
    </li>
  );
}
