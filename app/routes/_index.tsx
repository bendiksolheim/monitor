import { json } from "@remix-run/node";
import { getEvents, getLatestStatus } from "../db.server";
import { useLoaderData } from "@remix-run/react";
import { group } from "~/util/arrays";
import { Event } from "@prisma/client";
import { Service } from "~/components/service";
import { Container, Group, Stack } from "@mantine/core";

export const loader = async () => {
  const events = await getEvents();
  const serviceMap: Record<string, Array<Event>> = group(
    events,
    (event) => event.service
  );
  const latestStatus = await getLatestStatus();

  return json({ serviceMap, latestStatus });
};

export default function Index(): JSX.Element {
  const { serviceMap, latestStatus } = useLoaderData<typeof loader>();
  const services = Object.keys(serviceMap);
  return (
    <Container>
      <Group>
        {services.map((service) => {
          // TODO: Why do I need to cast this?
          const events: Array<Event> = serviceMap[
            service
          ] as unknown as Array<Event>;
          return <Service key={service} events={events} />;
        })}
      </Group>
    </Container>
  );
}
