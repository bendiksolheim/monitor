import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Center,
  ColorSchemeScript,
  Group,
  MantineProvider,
  SimpleGrid,
  Space,
  Text,
  createTheme,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import { IconHeart, IconSettings } from "@tabler/icons-react";
import custom from "~/styles/custom.css";
import { getLatestStatus } from "./db.server";

const theme = createTheme({
  fontFamily: "system-ui, sans-serif",
});

export const meta: MetaFunction = () => [
  {
    charset: "utf-8",
    title: "Monitor",
    viewport: "width=device-width,initial-scale=1",
  },
];

export const links: LinksFunction = () => {
  return [
    ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
    { rel: "stylesheet", href: custom },
  ];
};

export const loader = async () => {
  const latestStatus = await getLatestStatus();
  const numberDown = latestStatus.filter((e) => e.status !== "OK").length;
  const operational = numberDown === 0;
  return json({ numberDown, operational });
};

export default function App() {
  const { operational, numberDown } = useLoaderData<typeof loader>();
  const location = useLocation();
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <AppShell
            header={{ height: 52 }}
            styles={{
              header: {
                backgroundColor: "var(--mantine-color-white)",
              },
            }}
          >
            <AppShell.Header>
              <SimpleGrid cols={3} h="100%" ml="md" mr="md">
                <Group h="100%">
                  <Avatar color="cyan">M</Avatar>
                  <Text size="xl">Monitor</Text>
                </Group>
                <Center inline>
                  <Badge
                    variant="light"
                    size="lg"
                    color={operational ? "green" : "red"}
                  >
                    {operational
                      ? "All good ✌️"
                      : `${numberDown} service${
                          numberDown > 1 ? "s" : ""
                        } down`}
                  </Badge>
                </Center>
                <Group justify="flex-end">
                  {location.pathname == "/" ? (
                    <Link to="/config">
                      <ActionIcon variant="transparent" color="gray" size="lg">
                        <IconSettings />
                      </ActionIcon>
                    </Link>
                  ) : (
                    <Link to="/">
                      <ActionIcon variant="transparent" color="gray" size="lg">
                        <IconHeart />
                      </ActionIcon>
                    </Link>
                  )}
                </Group>
              </SimpleGrid>
            </AppShell.Header>
            <AppShell.Main>
              <Space h="lg" />
              <Outlet />
            </AppShell.Main>
          </AppShell>
          <Scripts />
          <ScrollRestoration />
          {process.env.NODE_ENV === "development" && <LiveReload />}
        </MantineProvider>
      </body>
    </html>
  );
}
