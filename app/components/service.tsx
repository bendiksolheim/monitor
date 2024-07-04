import { last } from "~/util/arrays";
import { Sparkline } from "./sparkline";
import { Badge, Card } from "@mantine/core";
import { type Event } from "~/events";

export type ServiceStatus = "ok" | "failing" | "unknown";

type ServiceProps = {
  name: string;
  events: Array<Event>;
  status: ServiceStatus;
};

export function Service(props: ServiceProps): JSX.Element {
  const { name, events, status } = props;
  return (
    <Card shadow="xs" withBorder p="md" style={{ minHeight: 227 }}>
      <Badge variant="light" color={serviceStatusToColor(status)} size="md">
        {name}
      </Badge>
      <div>
        <Status events={events} />
      </div>
    </Card>
  );
}

function Status(props: { events: Array<Event> }): JSX.Element {
  const latencies = props.events.map((event) => event.latency);
  if (props.events.length === 0) {
    return <span>Ingen status enda</span>;
  } else {
    return <Sparkline values={latencies} />;
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
