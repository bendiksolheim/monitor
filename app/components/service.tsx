import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { type Event } from '../lib/events.server';
import { UptimeIndicator } from './uptime-indicator';
import { mapValues } from '../util/record';
import { ReactNode } from 'react';

export type ServiceStatus = 'ok' | 'failing' | 'unknown';

type ServiceProps = {
  name: string;
  events: Record<PropertyKey, Array<Event>>;
  status: ServiceStatus;
  averageLatency: number | null;
};

export function Service(props: ServiceProps): ReactNode {
  const { name, events, status, averageLatency } = props;
  const allEvents: Array<Event> = Object.values(events).flat();
  const uptime = allEvents.filter((e) => e.ok).length / allEvents.length;
  const uptimePercentage = maxTwoDecimals(uptime * 100);

  return (
    <Card shadow="xs" withBorder>
      {/* Header: Badge and Uptime % */}
      <div className="flex justify-between items-center mb-2">
        <Badge variant={serviceStatusToVariant(status)} size="md">
          {name}
        </Badge>
        <div className="text-sm font-medium">{uptimePercentage}%</div>
      </div>

      {/* Average Latency */}
      {averageLatency && (
        <div className="flex justify-between items-center text-xs text-base-content/70 mb-4">
          <span>Average latency</span>
          <span>{Math.round(averageLatency)}ms</span>
        </div>
      )}

      {/* Uptime Indicator */}
      <div className="mt-4">
        <Status events={events} name={name} />
      </div>
    </Card>
  );
}

function Status(props: {
  events: Record<PropertyKey, Array<Event>>;
  name: string;
}): ReactNode {
  if (Object.keys(props.events).length === 0) {
    return <span className="text-sm text-base-content/50">Ingen status enda</span>;
  } else {
    const values = mapValues(props.events, (events) =>
      events.map((event) => event.ok)
    );
    return <UptimeIndicator values={values} name={props.name} />;
  }
}

function serviceStatusToVariant(status: ServiceStatus): 'success' | 'error' | 'warning' {
  switch (status) {
    case 'ok':
      return 'success';
    case 'failing':
      return 'error';
    case 'unknown':
      return 'warning';
  }
}

function maxTwoDecimals(n: number): number {
  return +n.toFixed(2);
}
