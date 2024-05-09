import { Card, Container, Title } from "@mantine/core";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { Config, getConfig } from "~/../server/config";

type SystemInfo = {
  node: {
    ip: string;
    hostname: string;
  };
  cpu: {
    load: number;
    temperature: number;
  };
};

const schema = z.custom<SystemInfo>();

type NodeStatus =
  | { status: "success"; node: string; info: SystemInfo }
  | { status: "error"; node: string };

export const loader = async () => {
  const config = getConfig();
  const nodes = config.nodes ?? [];
  const status = await Promise.all(
    nodes.map((node) =>
      fetch(`${node}/status`)
        .then((res) => res.json())
        .then((json) => schema.parse(json))
        .then((info) => ({ status: "success", node, info }))
        .catch(() => ({ status: "error", node }))
    )
  );

  return json({ status });
};

export default function Nodes(): JSX.Element {
  const { status } = useLoaderData<{ status: Array<NodeStatus> }>();

  return (
    <Container>
      {status.map((node) => (
        <NodeStatus node={node} key={node.node} />
      ))}
    </Container>
  );
}

function NodeStatus(props: { node: NodeStatus }): JSX.Element {
  const { node } = props;
  switch (node.status) {
    case "success":
      return <NodeStatusSuccess node={node.info} />;
    case "error":
      return <NodeStatusError node={node.node} />;
  }
}

function NodeStatusSuccess(props: { node: SystemInfo }): JSX.Element {
  return (
    <Card withBorder shadow="xs">
      <Title order={2}>{props.node.node.hostname}</Title>
    </Card>
  );
}

function NodeStatusError(props: { node: string }): JSX.Element {
  return (
    <Card withBorder shadow="xs">
      <Title order={2}>Not reachable: {props.node}</Title>
    </Card>
  );
}
