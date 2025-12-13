import { Card, List, Text } from "@mantine/core";
import { type Healthchecksio, type Heartbeat } from "server/config";

export function ShowHeartbeat(props: { heartbeat?: Heartbeat }): JSX.Element {
  const heartbeat = props.heartbeat;
  if (heartbeat === undefined) {
    return <NoHeartbeat />;
  }
  switch (heartbeat.type) {
    case "healthcheaks.io":
      return <Healthchecksio config={heartbeat} />;
  }
}

function Healthchecksio(props: { config: Healthchecksio }): JSX.Element {
  return (
    <Card withBorder shadow="xs">
      <List listStyleType="none">
        <List.Item>
          <Text fw={700} span>
            UUID
          </Text>{" "}
          {props.config.schedule}
        </List.Item>
        <List.Item>
          <Text fw={700} span>
            Schedule
          </Text>{" "}
          {props.config.schedule}
        </List.Item>
      </List>
    </Card>
  );
}

function NoHeartbeat(): JSX.Element {
  return (
    <Card withBorder shadow="xs">
      No heartbeat configured
    </Card>
  );
}
