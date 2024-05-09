import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { group } from "~/util/arrays";
import { Service } from "~/components/service";
import { Container, Group } from "@mantine/core";
import events, { type Event } from "~/events";

export const loader = async () => {
  const serviceMap = group(await events.all(), (event) => event.service);

  return json({ serviceMap });
};

export default function Index(): JSX.Element {
  const { serviceMap } = useLoaderData<typeof loader>();
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
