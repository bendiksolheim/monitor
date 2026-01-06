import { Card } from "~/components/ui/card";
import { getConfig, type Config, type Service } from "../../server/config";
import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "~/lib/utils";

export const dynamic = "force-dynamic";

interface SearchParams {
  tab?: string;
}

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || "parsed";
  const config = getConfig();

  return (
    <div>
      <Card shadow="xs">
        <h1 className="text-3xl font-bold mb-2">Configuration</h1>
        <p className="text-base mb-4">
          This is the current configuration from config.json
        </p>
      </Card>
      <div className="flex justify-center">
        <div className="tabs tabs-box mb-4 gap-2" role="tablist">
          <Link
            href="?tab=parsed"
            className={cn("tab transition-all duration-200", {
              "tab-active font-semibold": activeTab === "parsed",
              "hover:bg-base-200": activeTab !== "parsed",
            })}
            role="tab"
          >
            Parsed
          </Link>
          <Link
            href="?tab=raw"
            className={cn("tab transition-all duration-200", {
              "tab-active font-semibold": activeTab === "raw",
              "hover:bg-base-200": activeTab !== "raw",
            })}
            role="tab"
          >
            Raw
          </Link>
        </div>
      </div>

      <Card shadow="xs">
        <div className="py-4" role="tabpanel">
          {activeTab === "parsed" ? (
            <Pretty config={config} />
          ) : (
            <div className="mockup-code">
              <pre>
                <code>{JSON.stringify(config, undefined, 2)}</code>
              </pre>
            </div>
          )}
        </div>
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

      <Section title="Heartbeat">
        {config.heartbeat ? (
          <Card shadow="xs">
            <dl className="space-y-2">
              <div>
                <dt className="font-bold inline">Type: </dt>
                <dd className="inline">{config.heartbeat.type}</dd>
              </div>
              {config.heartbeat.type === "healthchecks.io" ? (
                <div>
                  <dt className="font-bold inline">UUID: </dt>
                  <dd className="inline">{config.heartbeat.uuid}</dd>
                </div>
              ) : (
                <div>
                  <dt className="font-bold inline">Endpoint: </dt>
                  <dd className="inline">https://httpbin.org/get</dd>
                </div>
              )}
              <div>
                <dt className="font-bold inline">Schedule: </dt>
                <dd className="inline">{config.heartbeat.schedule}</dd>
              </div>
            </dl>
          </Card>
        ) : (
          <Card shadow="xs">
            <p className="text-base-content/70">Not configured</p>
          </Card>
        )}
      </Section>

      <Section title="Ntfy.sh">
        {(config.notify ?? []).map((notify) => (
          <Card shadow="xs" key={notify.topic} className="mb-4">
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
    <Card shadow="xs">
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
