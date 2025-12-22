import {
  Card,
  Code,
  Container,
  List,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { getConfig, type Config, type Service } from "../../server/config";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const config = getConfig();

  return (
    <Container>
      <Card withBorder shadow="xs">
        <Title order={1}>Configuration</Title>
        <Text>This is the current configuration from config.json</Text>
        <Tabs variant="outline" defaultValue="parsed">
          <Tabs.List>
            <Tabs.Tab value="parsed">Prettified</Tabs.Tab>
            <Tabs.Tab value="raw">Raw</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="parsed">
            <Pretty config={config} />
          </Tabs.Panel>

          <Tabs.Panel value="raw">
            <Code block>{JSON.stringify(config, undefined, 4)}</Code>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Container>
  );
}

function Pretty(props: { config: Config }): ReactNode {
  const config = props.config;

  return (
    <>
      <Title order={2}>Services</Title>
      <Stack>
        {config.services.map((service) => (
          <ServiceConfig service={service} key={service.service} />
        ))}
      </Stack>
      <Title order={2}>Healthchecks.io</Title>
      {config.heartbeat ? (
        <Card withBorder shadow="xs">
          <List listStyleType="none">
            <List.Item>
              <Text fw={700} span>
                Url
              </Text>{" "}
              {config.heartbeat.uuid}
            </List.Item>
            <List.Item>
              <Text fw={700} span>
                Expression
              </Text>{" "}
              {config.heartbeat.schedule}
            </List.Item>
          </List>
        </Card>
      ) : (
        <Card withBorder shadow="xs">
          Not configured
        </Card>
      )}
      <Title order={2}>Ntfy.sh</Title>
      {(config.notify ?? []).map((notify) => (
        <Card withBorder shadow="xs" key={notify.topic}>
          <List listStyleType="none">
            <List.Item>
              <Text fw={700} span>
                Topic:
              </Text>{" "}
              {notify.topic}
            </List.Item>
            <List.Item>
              <Text fw={700} span>
                Expression:
              </Text>{" "}
              {notify.schedule}
            </List.Item>
            <List.Item>
              <Text fw={700} span>
                Minutes between:
              </Text>{" "}
              {notify.minutesBetween}
            </List.Item>
          </List>
        </Card>
      ))}
    </>
  );
}

function ServiceConfig(props: { service: Service }): ReactNode {
  const service = props.service;
  return (
    <Card withBorder shadow="xs">
      <List listStyleType="none">
        <List.Item>
          <Text fw={700} span>
            Name:
          </Text>{" "}
          {service.service}
        </List.Item>
        <List.Item>
          <Text fw={700} span>
            URL:
          </Text>{" "}
          {service.url}
        </List.Item>
        <List.Item>
          <Text fw={700} span>
            Schedule:
          </Text>{" "}
          {service.schedule}
        </List.Item>
        <List.Item>
          <Text fw={700} span>
            Ok status code:
          </Text>{" "}
          {service.okStatusCode}
        </List.Item>
      </List>
    </Card>
  );
}
