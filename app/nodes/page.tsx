import { Card } from '~/components/ui/card';
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
    <div>
      <h2 className="text-2xl font-bold mb-4">Nodes</h2>
      <div className="flex flex-col gap-4">
        {status.map((s) => (
          <Card key={s.node} shadow="sm" withBorder>
            <p className="text-lg font-medium mb-2">{s.node}</p>
            {s.status === 'success' ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm">Hostname: {s.info.hostname}</p>
                <p className="text-sm">CPU: {s.info.cpu.toFixed(1)}%</p>
                <p className="text-sm">Memory: {s.info.memory.toFixed(1)}%</p>
                {s.info.temperature && (
                  <p className="text-sm">
                    Temperature: {s.info.temperature.toFixed(1)}°C
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-error">Failed to fetch status</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
