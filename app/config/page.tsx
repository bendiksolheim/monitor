import { Card } from "~/components/ui/card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
import { getConfig, type Config, type Service } from "../../server/config";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const config = getConfig();

  return (
    <div>
      <Card withBorder shadow="xs">
        <h1 className="text-3xl font-bold mb-2">Configuration</h1>
        <p className="text-base mb-4">This is the current configuration from config.json</p>

        <Tabs defaultValue="parsed">
          <TabsList>
            <TabsTab value="parsed">Prettified</TabsTab>
            <TabsTab value="raw">Raw</TabsTab>
          </TabsList>

          <TabsPanel value="parsed">
            <Pretty config={config} />
          </TabsPanel>

          <TabsPanel value="raw">
            <div className="mockup-code">
              <pre>
                <code>{JSON.stringify(config, undefined, 2)}</code>
              </pre>
            </div>
          </TabsPanel>
        </Tabs>
      </Card>
    </div>
  );
}

function Pretty(props: { config: Config }): ReactNode {
  const config = props.config;

  return (
    <div className="space-y-6">
      <Section title="Services">
        <div className="flex flex-col gap-4">
          {config.services.map((service) => (
            <ServiceConfig service={service} key={service.service} />
          ))}
        </div>
      </Section>

      <Section title="Healthchecks.io">
        {config.heartbeat ? (
          <Card withBorder shadow="xs">
            <dl className="space-y-2">
              <div>
                <dt className="font-bold inline">Url: </dt>
                <dd className="inline">{config.heartbeat.uuid}</dd>
              </div>
              <div>
                <dt className="font-bold inline">Expression: </dt>
                <dd className="inline">{config.heartbeat.schedule}</dd>
              </div>
            </dl>
          </Card>
        ) : (
          <Card withBorder shadow="xs">
            <p className="text-base-content/70">Not configured</p>
          </Card>
        )}
      </Section>

      <Section title="Ntfy.sh">
        {(config.notify ?? []).map((notify) => (
          <Card withBorder shadow="xs" key={notify.topic} className="mb-4">
            <dl className="space-y-2">
              <div>
                <dt className="font-bold inline">Topic: </dt>
                <dd className="inline">{notify.topic}</dd>
              </div>
              <div>
                <dt className="font-bold inline">Expression: </dt>
                <dd className="inline">{notify.schedule}</dd>
              </div>
              <div>
                <dt className="font-bold inline">Minutes between: </dt>
                <dd className="inline">{notify.minutesBetween}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function ServiceConfig(props: { service: Service }): ReactNode {
  const service = props.service;

  return (
    <Card withBorder shadow="xs">
      <dl className="space-y-2">
        <div>
          <dt className="font-bold inline">Name: </dt>
          <dd className="inline">{service.service}</dd>
        </div>
        <div>
          <dt className="font-bold inline">URL: </dt>
          <dd className="inline">{service.url}</dd>
        </div>
        <div>
          <dt className="font-bold inline">Schedule: </dt>
          <dd className="inline">{service.schedule}</dd>
        </div>
        <div>
          <dt className="font-bold inline">Ok status code: </dt>
          <dd className="inline">{service.okStatusCode}</dd>
        </div>
      </dl>
    </Card>
  );
}
