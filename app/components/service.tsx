import { Event } from "@prisma/client";
import { last } from "~/util/arrays";
import { StatusPill } from "./status-pill";
import { Sparkline } from "./sparkline";

export function Service(props: { events: Array<Event> }): JSX.Element {
  const { events } = props;
  const operational = last(events)?.status === "OK";
  const latencies = events.map((event) => event.latency);
  return (
    <li>
      <div className="service">
        <StatusPill title={events[0].service} operational={operational} />
        <div>
          <Sparkline values={latencies} />
        </div>
      </div>
    </li>
  );
}
