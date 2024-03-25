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
import { json, useLoaderData } from "@remix-run/react";
import { Config, Service, getConfig } from "~/../server/config";

export const loader = async () => {
  const config = getConfig();
  return json({ config });
};

export default function ConfigView(): JSX.Element {
  const { config } = useLoaderData<typeof loader>();

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

function Pretty(props: { config: Config }): JSX.Element {
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
      {config.healthcheck ? (
        <Card withBorder shadow="xs">
          <List listStyleType="none">
            <List.Item>
              <Text fw={700} span>
                Url
              </Text>{" "}
              {config.healthcheck.url}
            </List.Item>
            <List.Item>
              <Text fw={700} span>
                Expression
              </Text>{" "}
              {config.healthcheck.expression}
            </List.Item>
          </List>
        </Card>
      ) : (
        <Card withBorder shadow="xs">
          Not configured
        </Card>
      )}
      <Title order={2}>Ntfy.sh</Title>
      {config.ntfy ? (
        <Card withBorder shadow="xs">
          <List listStyleType="none">
            <List.Item>
              <Text fw={700} span>
                Topic
              </Text>{" "}
              {config.ntfy.topic}
            </List.Item>
            <List.Item>
              <Text fw={700} span>
                Expression
              </Text>{" "}
              {config.ntfy.expression}
            </List.Item>
          </List>
        </Card>
      ) : (
        <Card withBorder shadow="xs">
          Not configured
        </Card>
      )}
    </>
  );
}

function ServiceConfig(props: { service: Service }): JSX.Element {
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
            Expression:
          </Text>{" "}
          {service.expression}
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
