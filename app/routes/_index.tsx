import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { useSearchParams } from "@remix-run/react";
import { last } from "~/util/arrays";
import { Service } from "~/components/service";
import { Center, Container, Group } from "@mantine/core";
import events from "~/events";
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
      const ok = last(eventsForService)!.ok;
      return { name: service, ok, events: eventsForService };
    })
  );

  return typedjson({ services });
};

const statuses = {
  all: [true, false],
  failing: [false],
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
          ]}
          onChange={(value) => {
            searchParams.set("show", value);
            setSearchParams(searchParams);
          }}
          mb="lg"
        />
      </Center>
      <Group>
        {services
          .filter((service) =>
            statuses[getShowParam(searchParams)].includes(service.ok)
          )
          .map((service) => (
            <Service key={service.name} events={service.events} />
          ))}
      </Group>
    </Container>
  );
}

const allowedShowValues = ["all", "failing"] as const;

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
