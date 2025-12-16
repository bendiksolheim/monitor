'use client';

import { Grid } from '@mantine/core';
import { Service, type ServiceStatus } from './service';
import { type Event } from '../lib/events.server';

interface ServiceData {
  name: string;
  status: ServiceStatus;
  events: Record<PropertyKey, Array<Event>>;
  averageLatency: number | null;
}

interface ServicesGridProps {
  services: ServiceData[];
}

export function ServicesGrid({ services }: ServicesGridProps) {
  return (
    <Grid justify="flex-start" align="stretch">
      {services.map((service) => (
        <Grid.Col span={6} key={service.name}>
          <Service
            name={service.name}
            status={service.status}
            events={service.events}
            averageLatency={service.averageLatency}
          />
        </Grid.Col>
      ))}
    </Grid>
  );
}
