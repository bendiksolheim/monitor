import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
import styles from "~/styles/styles.css";
import { getLatestStatus } from "./db.server";
import { Header } from "./components/header";

export const meta: MetaFunction = () => [
  {
    charset: "utf-8",
    title: "Monitor",
    viewport: "width=device-width,initial-scale=1",
  },
];

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const loader = async () => {
  const latestStatus = await getLatestStatus();
  const operational = latestStatus.every((e) => e.status === "OK");
  return json({ operational });
};

export default function App() {
  const { operational } = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Header title="Monitor" operational={operational} />
        <Outlet />
        <Scripts />
        <ScrollRestoration />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}
