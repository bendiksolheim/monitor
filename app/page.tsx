import { type ServiceStatus } from './components/service';
import { SegmentedControlWrapper } from './components/segmented-control-wrapper';
import { ServicesGrid } from './components/services-grid';
import events, { type Event } from './lib/events.server';
import { getConfig } from '../server/config';
import { oneDayAgo } from './util/dates';
import { last } from './util/arrays';

export const dynamic = 'force-dynamic';

interface SearchParams {
  show?: string;
}

export default async function Page({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const wantedServices = getConfig()
    .services.map((service) => service.service)
    .sort();

  const servicesList = await Promise.all(
    wantedServices.map(async (service) => {
      const eventsForService = await events.get({
        where: { service: service, created: { gte: getSince() } },
        orderBy: { created: 'asc' }
      });

      const averageLatency = await events.aggregate({
        _avg: { latency: true },
        where: { service: service }
      });

      return {
        name: service,
        status: serviceStatus(last(eventsForService)),
        events: eventsForService,  // Pass raw events directly
        averageLatency: averageLatency._avg?.latency ?? null
      };
    })
  );

  const statuses: Record<string, Array<ServiceStatus>> = {
    all: ['ok', 'failing', 'unknown'],
    failing: ['failing'],
    unknown: ['unknown']
  };

  const show = getShowParam(params.show);

  const filteredServices = servicesList.filter((service) =>
    statuses[show].includes(service.status)
  );

  return (
    <div>
      <SegmentedControlWrapper
        data={[
          { value: 'all', label: 'All' },
          { value: 'failing', label: 'Failing' },
          { value: 'unknown', label: 'Unknown' }
        ]}
        defaultValue={show}
      />
      <ServicesGrid services={filteredServices} />
    </div>
  );
}

const allowedShowValues = ['all', 'failing', 'unknown'] as const;

function getShowParam(
  value?: string
): (typeof allowedShowValues)[number] {
  if (value && allowedShowValues.includes(value as any)) {
    return value as (typeof allowedShowValues)[number];
  }
  return 'all';
}

function serviceStatus(ev: Event | null): ServiceStatus {
  if (ev === null) return 'unknown';
  return ev.ok ? 'ok' : 'failing';
}

function getSince(): Date {
  const since = oneDayAgo();
  since.setHours(since.getHours() + 1);
  since.setMinutes(0);
  since.setSeconds(0);
  since.setMilliseconds(0);
  return since;
}
