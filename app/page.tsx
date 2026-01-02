import { ServiceProps, type ServiceStatus } from "./components/service";
import { ServicesGrid } from "./components/services-grid";
import events, { type Event } from "./lib/events.server";
import { getConfig } from "../server/config";
import { oneDayAgo } from "./util/dates";
import { last } from "./util/arrays";
import Link from "next/link";
import { cn } from "./lib/utils";
import { Suspense } from "react";

interface SearchParams {
  show?: string;
}

const statuses = ["all", "failing", "unknown"] as const;

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const show = getShowParam(params.show);

  const services = getServices(show);

  return (
    <>
      <div className="flex justify-center">
        <div className="tabs tabs-box bg-base-300">
          {statuses.map((status) => (
            <Link
              href={`?show=${status}`}
              key={status}
              className={cn("capitalize tab", { "tab-active": status === show })}
              role="tab"
            >
              {status}
            </Link>
          ))}
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <ServicesGrid services={services} />
      </Suspense>
    </>
  );
}

async function getServices(status: (typeof statuses)[number]): Promise<Array<ServiceProps>> {
  const services = getConfig()
    .services.map((service) => service.service)
    .sort();
  const eventsByService = await events.get({
    where: { service: { in: services }, created: { gte: getSince() } },
    orderBy: [{ service: "asc" }, { created: "asc" }],
  });
  const groupedServices = eventsByService.reduce(
    (acc, event) => {
      if (!acc[event.service]) {
        acc[event.service] = {
          name: event.service,
          events: [],
          averageLatency: 0,
          status: "unknown",
        };
      }

      acc[event.service].events.push(event);
      return acc;
    },
    {} as Record<
      string,
      { name: string; events: Array<Event>; averageLatency: number; status: ServiceStatus }
    >,
  );

  Object.keys(groupedServices).forEach((service) => {
    const latencies = groupedServices[service].events
      .map((event) => event.latency)
      .filter((l): l is number => l !== null && l !== undefined);
    const averageLatency = latencies.reduce((acc, latency) => acc + latency, 0) / latencies.length;
    groupedServices[service].averageLatency = averageLatency;
    groupedServices[service].status = serviceStatus(last(groupedServices[service].events));
  });

  return Object.values(groupedServices).filter((service) => {
    switch (status) {
      case "all":
        return true;
      case "failing":
        return service.status === "failing";
      case "unknown":
        return service.status === "unknown";
    }
  });
}

function getShowParam(value?: string): (typeof statuses)[number] {
  if (value && statuses.includes(value as any)) {
    return value as (typeof statuses)[number];
  }
  return "all";
}

function serviceStatus(ev: Event | null): ServiceStatus {
  if (ev === null) return "unknown";
  return ev.ok ? "ok" : "failing";
}

function getSince(): Date {
  const since = oneDayAgo();
  since.setHours(since.getHours() + 1);
  since.setMinutes(0);
  since.setSeconds(0);
  since.setMilliseconds(0);
  return since;
}
