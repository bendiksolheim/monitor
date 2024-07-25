import {
  AppShell,
  Avatar,
  Badge,
  Button,
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
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import { IconHeartbeat, IconSettings, IconDatabase } from "@tabler/icons-react";
import { Config, getConfig } from "server/config";
import services from "./services.server";

const theme = createTheme({
  primaryColor: "cyan",
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
  ];
};

const menuItems = [
  {
    link: "/",
    label: "Services",
    enabled: () => true,
  },
  {
    link: "/nodes",
    label: "Nodes",
    enabled: (config: Config) => (config.nodes?.length ?? 0) > 0,
  },
  {
    link: "/config",
    label: "Config",
    enabled: () => true,
  },
];

export const loader = async () => {
  const config = getConfig();
  const menu = menuItems.filter((item) => item.enabled(config));
  const latestStatus = await services.status();
  const numberDown = latestStatus.filter((e) => !e.ok).length;
  const operational = numberDown === 0;
  return json({ numberDown, operational, menu });
};

const icons: Record<string, () => JSX.Element> = {
  Services: () => <IconHeartbeat />,
  Nodes: () => <IconDatabase />,
  Config: () => <IconSettings />,
};

export default function App() {
  const { operational, numberDown, menu } = useLoaderData<typeof loader>();
  const location = useLocation();

  const links = menu.map((link) => (
    <Button
      component={Link}
      to={link.link}
      key={link.link}
      variant={link.link === location.pathname ? "filled" : "transparent"}
      leftSection={icons[link.label]()}
    >
      {link.label}
    </Button>
  ));
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
                <Group justify="flex-end">{links}</Group>
              </SimpleGrid>
            </AppShell.Header>
            <AppShell.Main>
              <Space h="lg" />
              <Outlet />
            </AppShell.Main>
          </AppShell>
          <Scripts />
          <ScrollRestoration />
        </MantineProvider>
      </body>
    </html>
  );
}
