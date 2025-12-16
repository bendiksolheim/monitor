import '@mantine/core/styles.css';
import { MantineProvider, ColorSchemeScript, createTheme } from '@mantine/core';
import type { Metadata } from 'next';
import { getConfig, type Config } from '../server/config';
import services from './lib/services.server';
import { AppShellWrapper } from './components/app-shell-wrapper';

export const dynamic = 'force-dynamic';

const theme = createTheme({
  primaryColor: 'cyan',
  fontFamily: 'system-ui, sans-serif',
});

export const metadata: Metadata = {
  title: 'Monitor',
  description: 'Service monitoring dashboard',
};

const menuItems = [
  {
    link: '/',
    label: 'Services',
    enabled: () => true,
  },
  {
    link: '/nodes',
    label: 'Nodes',
    enabled: (config: Config) => (config.nodes?.length ?? 0) > 0,
  },
  {
    link: '/config',
    label: 'Config',
    enabled: () => true,
  },
];

async function getStatusInfo() {
  const config = getConfig();
  const menu = menuItems
    .filter((item) => item.enabled(config))
    .map(({ link, label }) => ({ link, label })); // Only pass serializable data
  const latestStatus = await services.status();
  const numberDown = latestStatus.filter((e) => !e.ok).length;
  const operational = numberDown === 0;
  return { numberDown, operational, menu };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { operational, numberDown, menu } = await getStatusInfo();

  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <AppShellWrapper
            operational={operational}
            numberDown={numberDown}
            menu={menu}
          >
            {children}
          </AppShellWrapper>
        </MantineProvider>
      </body>
    </html>
  );
}
