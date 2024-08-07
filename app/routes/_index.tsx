import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { useSearchParams } from "@remix-run/react";
import { group, last } from "~/util/arrays";
import { Service, type ServiceStatus } from "~/components/service";
import { Center, Container, Grid } from "@mantine/core";
import events, { type Event } from "~/events";
import { SegmentedControl } from "~/components/segmented-control";
import { getConfig } from "../../server/config";
import { oneDayAgo } from "~/util/dates";

export const loader = async () => {
  const wantedServices = getConfig()
    .services.map((service) => service.service)
    .toSorted();
  const services = await Promise.all(
    wantedServices.map(async (service) => {
      const eventsForService = await events.get({
        where: { service: service, created: { gte: getSince() } },
        orderBy: { created: "asc" },
      });

      const averageLatency = await events.aggregate({
        _avg: {
          latency: true,
        },
        where: {
          service: service,
        },
      });

      const eventsByHour = group(eventsForService, (event) => {
        const timestamp = event.created;
        return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
      });
      return {
        name: service,
        status: serviceStatus(last(eventsForService)),
        events: eventsByHour,
        averageLatency: averageLatency._avg?.latency ?? null,
      };
    })
  );

  return typedjson({ services });
};

const statuses: Record<string, Array<ServiceStatus>> = {
  all: ["ok", "failing", "unknown"],
  failing: ["failing"],
  unknown: ["unknown"],
};

export default function Index(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { services } = useTypedLoaderData<typeof loader>();
  return (
    <Container>
      <Center>
        <SegmentedControl
          data={[
            { value: "all", label: "All" },
            { value: "failing", label: "Failing" },
            { value: "unknown", label: "Unknown" },
          ]}
          onChange={(value) => {
            searchParams.set("show", value);
            setSearchParams(searchParams);
          }}
          mb="lg"
        />
      </Center>
      <Grid justify="flex-start" align="stretch">
        {services
          .filter((service) =>
            statuses[getShowParam(searchParams)].includes(service.status)
          )
          .map((service) => (
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
    </Container>
  );
}

const allowedShowValues = ["all", "failing", "unknown"] as const;

function getShowParam(
  searchParams: URLSearchParams
): (typeof allowedShowValues)[number] {
  const value = searchParams.get("show") ?? "all";
  if (allowedShowValues.includes(value as any)) {
    return value as (typeof allowedShowValues)[number];
  } else {
    return "all";
  }
}

function serviceStatus(ev: Event | null): ServiceStatus {
  if (ev === null) {
    return "unknown";
  } else if (ev.ok) {
    return "ok";
  } else {
    return "failing";
  }
}

function getSince(): Date {
  const since = oneDayAgo();
  since.setHours(since.getHours() + 1);
  since.setMinutes(0);
  since.setSeconds(0);
  since.setMilliseconds(0);

  return since;
}
