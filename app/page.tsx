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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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
              className={cn("capitalize tab", {
                "tab-active": status === show,
              })}
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

// Cache TTL in seconds (configurable via environment variable)
const CACHE_TTL_SECONDS = parseInt(process.env.SERVICES_CACHE_TTL || "60", 10);
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

// Manual cache with true expiration (not stale-while-revalidate)
let servicesCache: {
  data: Array<ServiceProps>;
  timestamp: number;
} | null = null;

async function fetchServicesData(): Promise<Array<ServiceProps>> {
  const services = getConfig()
    .services.map((service) => service.service)
    .sort();

  const since = getSince();

  // Fetch events and average latencies in parallel
  const [eventsByService, avgLatencies] = await Promise.all([
    events.get({
      where: { service: { in: services }, created: { gte: since } },
      orderBy: [{ service: "asc" }, { created: "asc" }],
    }),
    events.averageLatencyByService(services, since),
  ]);

  const groupedServices = eventsByService.reduce(
    (acc, event) => {
      if (!acc[event.service]) {
        acc[event.service] = {
          name: event.service,
          events: [],
          averageLatency: avgLatencies[event.service] ?? 0,
          status: "unknown" as ServiceStatus,
        };
      }

      acc[event.service].events.push(event);
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        events: Array<Event>;
        averageLatency: number;
        status: ServiceStatus;
      }
    >,
  );

  // Determine status from last event
  Object.keys(groupedServices).forEach((service) => {
    groupedServices[service].status = serviceStatus(
      last(groupedServices[service].events),
    );
  });

  return Object.values(groupedServices);
}

async function getCachedServicesData(): Promise<Array<ServiceProps>> {
  const now = Date.now();

  // Check if cache exists and is still valid
  if (servicesCache && (now - servicesCache.timestamp) < CACHE_TTL_MS) {
    return servicesCache.data;
  }

  // Cache is stale or doesn't exist - fetch fresh data
  const freshData = await fetchServicesData();

  // Update cache
  servicesCache = {
    data: freshData,
    timestamp: now,
  };

  return freshData;
}

async function getServices(
  status: (typeof statuses)[number],
): Promise<Array<ServiceProps>> {
  const allServices = await getCachedServicesData();

  // Filter by status (filtering happens after cache to maximize cache hits)
  return allServices.filter((service) => {
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
