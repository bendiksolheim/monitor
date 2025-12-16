'use client';

import {
  AppShell,
  Avatar,
  SimpleGrid,
  Group,
  Text,
  Badge,
  Button,
} from '@mantine/core';
import Link from 'next/link';
import { IconHeartbeat, IconSettings, IconDatabase } from '@tabler/icons-react';

interface AppShellWrapperProps {
  children: React.ReactNode;
  operational: boolean;
  numberDown: number;
  menu: Array<{ link: string; label: string }>;
}

const icons: Record<string, React.ComponentType<any>> = {
  Services: IconHeartbeat,
  Nodes: IconDatabase,
  Config: IconSettings,
};

export function AppShellWrapper({ children, operational, numberDown, menu }: AppShellWrapperProps) {
  return (
    <AppShell
      header={{ height: 52 }}
      styles={{
        header: {
          backgroundColor: 'var(--mantine-color-white)',
        },
      }}
    >
      <AppShell.Header>
        <SimpleGrid cols={3} h="100%" ml="md" mr="md">
          <Group h="100%">
            <Avatar color="cyan">M</Avatar>
            <Text size="xl">Monitor</Text>
          </Group>
          <Group justify="center" h="100%">
            <Badge
              variant="light"
              size="lg"
              color={operational ? 'green' : 'red'}
            >
              {operational
                ? 'All good ✌️'
                : `${numberDown} service${numberDown > 1 ? 's' : ''} down`}
            </Badge>
          </Group>
          <Group justify="flex-end">
            {menu.map((link) => {
              const Icon = icons[link.label];
              return (
                <Button
                  component={Link}
                  href={link.link}
                  key={link.link}
                  variant="transparent"
                  leftSection={<Icon />}
                >
                  {link.label}
                </Button>
              );
            })}
          </Group>
        </SimpleGrid>
      </AppShell.Header>
      <AppShell.Main>
        <div style={{ marginTop: '1rem' }}>{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
