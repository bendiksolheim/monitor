import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { useSearchParams } from "@remix-run/react";
import { last } from "~/util/arrays";
import { Service, type ServiceStatus } from "~/components/service";
import { Center, Container, Grid } from "@mantine/core";
import events, { type Event } from "~/events";
import { SegmentedControl } from "~/components/segmented-control";
import { getConfig } from "../../server/config";

export const loader = async () => {
  const wantedServices = getConfig()
    .services.map((service) => service.service)
    .toSorted();
  const services = await Promise.all(
    wantedServices.map(async (service) => {
      const eventsForService = await events.get({
        where: { service: service },
      });
      return {
        name: service,
        status: serviceStatus(last(eventsForService)),
        events: eventsForService,
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
  console.log(
    getShowParam(searchParams),
    services.map((s) => statuses[getShowParam(searchParams)].includes(s.status))
  );
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
            <Grid.Col span={6} key={service.name} style={{ minHeight: 227 }}>
              <Service
                name={service.name}
                status={service.status}
                events={service.events}
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
