import { last } from "~/util/arrays";
import { Sparkline } from "./sparkline";
import { Badge, Card } from "@mantine/core";
import { type Event } from "~/events";

export function Service(props: { events: Array<Event> }): JSX.Element {
  const { events } = props;
  const operational = last(events)?.ok;
  const latencies = events.map((event) => event.latency);
  return (
    <Card shadow="xs" withBorder p="md">
      <Badge variant="light" color={operational ? "green" : "red"} size="md">
        {events[0].service}
      </Badge>
      <div>
        <Sparkline values={latencies} />
      </div>
    </Card>
  );
}
