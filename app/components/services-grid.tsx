'use client';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
      {services.map((service) => (
        <Service
          key={service.name}
          name={service.name}
          status={service.status}
          events={service.events}
          averageLatency={service.averageLatency}
        />
      ))}
    </div>
  );
}
