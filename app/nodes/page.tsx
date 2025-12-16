import { Container, Title, Stack, Card, Text } from '@mantine/core';
import { getConfig } from '../../server/config';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  hostname: z.string(),
  cpu: z.number(),
  memory: z.number(),
  temperature: z.number().optional()
});

type NodeInfo = z.infer<typeof schema>;

export default async function NodesPage() {
  const nodes = getConfig().nodes ?? [];

  const status = await Promise.all(
    nodes.map((node) =>
      fetch(`${node}/status`)
        .then((res) => res.json())
        .then((json) => schema.parse(json))
        .then((info) => ({ status: 'success' as const, node, info }))
        .catch(() => ({ status: 'error' as const, node }))
    )
  );

  return (
    <Container>
      <Title order={2} mb="md">
        Nodes
      </Title>
      <Stack gap="md">
        {status.map((s) => (
          <Card key={s.node} shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500} size="lg" mb="xs">
              {s.node}
            </Text>
            {s.status === 'success' ? (
              <Stack gap="xs">
                <Text size="sm">Hostname: {s.info.hostname}</Text>
                <Text size="sm">CPU: {s.info.cpu.toFixed(1)}%</Text>
                <Text size="sm">Memory: {s.info.memory.toFixed(1)}%</Text>
                {s.info.temperature && (
                  <Text size="sm">
                    Temperature: {s.info.temperature.toFixed(1)}°C
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="red" size="sm">
                Failed to fetch status
              </Text>
            )}
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
