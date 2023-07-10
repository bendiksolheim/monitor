import { json } from "@remix-run/node";
import { getEvents, getLatestStatus } from "../db.server";
import { useLoaderData } from "@remix-run/react";
import { group, last } from "~/util/arrays";
import { Event } from "@prisma/client";
import { relativeTimeSince } from "~/util/dates";
import { Suspense } from "react";

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
  const lastSuccess = last(events.filter((event) => event.status === "OK"));
  return (
    <li>
      <div className="service">
        <h2 className="service__name">{events[0].service}</h2>
        <h3 className="service__last-success">
          Last success:{" "}
          <Suspense fallback="-">
            {lastSuccess !== null
              ? relativeTimeSince(lastSuccess.created)
              : "unknown"}
          </Suspense>
        </h3>
        <div className="service__events">
          {events.map((event) => (
            <div
              className={`service__event service__event--${event.status}`}
              key={event.id}
              title={`${event.created}`}
            ></div>
          ))}
        </div>
      </div>
    </li>
  );
}
