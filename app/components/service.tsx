import { Badge, Card, Group, Space } from "@mantine/core";
import { type Event } from "~/events";
import { UptimeIndicator } from "./uptime-indicator";
import { mapValues } from "~/util/record";

export type ServiceStatus = "ok" | "failing" | "unknown";

type ServiceProps = {
  name: string;
  events: Record<PropertyKey, Array<Event>>;
  status: ServiceStatus;
};

export function Service(props: ServiceProps): JSX.Element {
  const { name, events, status } = props;
  const allEvents: Array<Event> = Object.values(events).flat();
  const uptime = allEvents.filter((e) => e.ok).length / allEvents.length;
  const uptimePercentage = maxTwoDecimals(uptime * 100);
  return (
    <Card shadow="xs" withBorder p="md">
      <Group justify="space-between">
        <Badge variant="light" color={serviceStatusToColor(status)} size="md">
          {name}
        </Badge>
        <div>{uptimePercentage}%</div>
      </Group>
      <Space h="lg" />
      <Status events={events} name={name} />
    </Card>
  );
}

function Status(props: {
  events: Record<PropertyKey, Array<Event>>;
  name: string;
}): JSX.Element {
  if (Object.keys(props.events).length === 0) {
    return <span>Ingen status enda</span>;
  } else {
    const values = mapValues(props.events, (events) =>
      events.map((event) => event.ok)
    );
    return <UptimeIndicator values={values} name={props.name} />;
    /* const latencies = props.events.map((event) => event.latency); */
    /* return <Sparkline values={latencies} />; */
  }
}

function serviceStatusToColor(status: ServiceStatus): string {
  switch (status) {
    case "ok":
      return "green";
    case "failing":
      return "red";
    case "unknown":
      return "yellow";
  }
}

/**
 * Weird hack to round numbers to at most 2 decimals.
 * 10 => 10
 * 10.1 => 10.1
 * 10.01 => 10.01
 * 10.005 => 10.01
 */
function maxTwoDecimals(n: number): number {
  return +n.toFixed(2);
}
