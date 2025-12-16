---
date: 2025-12-13
author: Claude Sonnet 4.5
git_commit: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
branch: rework-configuration
repository: monitor
topic: "Remix to Next.js Migration with Bree Scheduler"
tags: [migration, nextjs, remix, bree, scheduling, docker]
status: draft
related_research: planning/2025-12-13-remix-to-nextjs-migration/research.md
---

# Remix to Next.js Migration Implementation Plan

## Overview

This plan outlines the complete migration of the Monitor service monitoring application from Remix to Next.js, using Bree for background job scheduling. The migration is designed as an in-place, all-at-once replacement, maintaining Docker deployment and all current functionality while modernizing the framework.

## Current State Analysis

**Framework**: Remix v2.9.1 with Vite and custom Express server
**Routing**: File-based routing in `app/routes/` with 4 routes (/, /nodes, /config, /health)
**Scheduler**: @breejs/later for human-readable schedules ("every 5 minutes")
**Database**: SQLite via Prisma ORM with Event and Notification models
**UI**: Mantine v7.9.1 component library
**Deployment**: Docker with production build
**Jobs**: 3 types - health checks, healthchecks.io heartbeat, ntfy notifications

### Key Discoveries:

- **Scheduler independence**: Background jobs (server/scheduler.ts:19) run completely independently of web server, starting before Express (server.ts:7-9)
- **Configuration-driven**: All services, schedules, and integrations loaded from config.json (server/config.ts:42)
- **Loader pattern**: All routes use loaders for data fetching, no actions (read-only dashboard)
- **Prisma singleton**: Database client uses global singleton pattern (app/db.server.ts:3-17)
- **Resource route**: /health endpoint returns JSON with custom status codes (app/routes/health.ts:8)
- **Time windowing**: Dashboard shows 24-hour event history with hourly grouping (app/routes/_index.tsx:17-34)

## Desired End State

A fully functional Next.js application that:

1. **Maintains 100% feature parity** with current Remix app
2. **Uses Bree scheduler** with human-readable schedules (no cron syntax changes needed)
3. **Runs in Docker** with same deployment characteristics
4. **Keeps all configuration** from config.json working identically
5. **Preserves database schema** and Prisma setup without changes
6. **Uses Next.js App Router** with Server Components for data loading
7. **Runs custom Next.js server** to host both web app and background jobs

### Verification Criteria:

**Automated Verification:**
- [ ] All TypeScript compilation succeeds: `npm run build`
- [ ] Prisma migrations work: `npm run migrate`
- [ ] Docker build succeeds: `docker build -t monitor-nextjs .`
- [ ] All routes accessible and return expected data
- [ ] Background jobs execute on schedule (verify logs)

**Manual Verification:**
- [ ] Dashboard displays all services with correct status
- [ ] Service sparkline charts render 24-hour history
- [ ] Nodes page fetches and displays node information
- [ ] Config page displays current configuration
- [ ] Health endpoint returns correct JSON with status codes
- [ ] Health check jobs create database events
- [ ] Healthchecks.io receives pings when services are up
- [ ] Ntfy notifications send when services fail (with throttling)
- [ ] Application survives restart with jobs resuming

## What We're NOT Doing

1. **Not changing database schema** - Event and Notification models stay identical
2. **Not modifying configuration format** - config.json remains unchanged
3. **Not rewriting job logic** - Health checks, heartbeats, and notifications keep same behavior
4. **Not adding job persistence** - Jobs still reset on restart (same as current)
5. **Not implementing horizontal scaling** - Single-server deployment only
6. **Not changing UI components** - Mantine components copy over directly
7. **Not migrating to Vercel** - Docker-only deployment
8. **Not converting to cron syntax** - Keep human-readable schedules via Bree

## Implementation Approach

**Strategy**: In-place migration with comprehensive backup and testing phases

The migration follows a **bottom-up approach**:
1. Set up Next.js infrastructure first (config, build, dependencies)
2. Migrate database layer (unchanged, just reorganize)
3. Build custom server with Bree scheduler
4. Migrate background jobs to Bree worker format
5. Migrate UI routes to Next.js App Router
6. Update Docker configuration
7. Test thoroughly before deployment

**Key Technical Decision**: Use Bree instead of keeping @breejs/later because:
- Bree is the modern successor to @breejs/later (same team)
- Still supports human-readable schedules ("every 5 minutes")
- Better TypeScript support and active maintenance
- Worker-based architecture is more robust
- Minimal configuration changes needed

---

## Phase 1: Next.js Infrastructure Setup

### Overview
Set up Next.js project structure, install dependencies, and configure build tooling without affecting current Remix app.

### Changes Required:

#### 1. Install Next.js and Dependencies
**Files**: `package.json`

**Changes**:
- Remove Remix dependencies: `@remix-run/*`, `remix-typedjson`
- Add Next.js: `next@latest`, `@next/bundle-analyzer`
- Replace `@breejs/later` with `bree@^9.2.3`
- Add Bree dependencies: `@types/bree`, `graceful-fs` (for job file management)
- Keep: `@mantine/core`, `@mantine/hooks`, `@prisma/client`, `zod`, `react`, `react-dom`

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "@mantine/core": "^7.9.1",
    "@mantine/hooks": "^7.9.1",
    "@prisma/client": "^5.13.0",
    "@tabler/icons-react": "^3.3.0",
    "bree": "^9.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.2.0"
  },
  "devDependencies": {
    "@types/bree": "^7.1.7",
    "@types/node": "^20.12.11",
    "postcss": "^8.4.38",
    "postcss-preset-mantine": "^1.15.0",
    "postcss-simple-vars": "^7.0.1",
    "prisma": "^5.13.0",
    "tsx": "^4.9.3",
    "typescript": "^5.4.5"
  }
}
```

#### 2. Update npm Scripts
**File**: `package.json`

**Changes**:
```json
{
  "scripts": {
    "build": "next build",
    "start": "npm run migrate && npm run start:server",
    "start:server": "cross-env NODE_ENV=production node server.js",
    "migrate": "prisma migrate deploy",
    "dev": "cross-env NODE_ENV=development tsx ./server.ts",
    "format": "prettier --write .",
    "docker:build": "docker image build . -t bendiksolheim/monitor:latest",
    "docker:push": "docker push bendiksolheim/monitor:latest"
  }
}
```

#### 3. Create Next.js Configuration
**File**: `next.config.js` (new)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable standalone mode since we use custom server
  output: undefined,

  // Keep PostCSS config for Mantine
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks']
  },

  // Disable webpack build warnings for worker files
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude job files from main bundle
      config.externals = [...(config.externals || []), 'bree']
    }
    return config
  }
}

module.exports = nextConfig
```

#### 4. Create TypeScript Configuration for Next.js
**File**: `tsconfig.json`

**Changes**: Update to extend Next.js defaults while keeping project settings

```json
{
  "extends": "./node_modules/next/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "~/*": ["./app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "build"]
}
```

#### 5. Create Root Environment Types
**File**: `next-env.d.ts` (generated by Next.js but needs custom additions)

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    NODE_ENV: 'development' | 'production' | 'test'
    VITE_VERSION?: string
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Dependencies install cleanly: `npm clean-install`
- [ ] TypeScript configuration validates: `npx tsc --noEmit`
- [ ] Next.js builds without errors: `npm run build` (will fail on missing app/ directory, expected at this phase)

#### Manual Verification:
- [ ] No conflicting dependencies in package.json
- [ ] PostCSS configuration still valid for Mantine
- [ ] Build scripts reference correct commands

---

## Phase 2: Database and Server Utilities Migration

### Overview
Move database configuration, Prisma client, and server utilities to Next.js structure. No logic changes, just reorganization.

### Changes Required:

#### 1. Reorganize Server Directory Structure

**New structure**:
```
/Users/bendik/dev/monitor/
├── app/                          # Next.js app directory
│   └── lib/                      # Shared server utilities
│       ├── db.server.ts          # Prisma client (moved from app/)
│       ├── events.server.ts      # Event operations (moved from app/events/)
│       ├── notifications.server.ts # Notification operations (moved from app/notifications/)
│       └── services.server.ts    # Service status utilities (moved from app/)
├── server/                       # Custom server + scheduler
│   ├── config.ts                 # Config loader (unchanged)
│   ├── log.ts                    # Logger (unchanged)
│   ├── jobs/                     # Bree job workers (new)
│   │   ├── health-check.ts
│   │   ├── heartbeat.ts
│   │   └── ntfy.ts
│   └── scheduler.ts              # Bree scheduler (rewritten)
├── server.ts                     # Custom Next.js server (rewritten)
└── prisma/                       # Database schema (unchanged)
```

#### 2. Move Database Client
**From**: `app/db.server.ts`
**To**: `app/lib/db.server.ts`

**Changes**: None, just move the file

```typescript
// app/lib/db.server.ts
import { PrismaClient, type Event } from "@prisma/client";

let _prisma: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

if (process.env.NODE_ENV === "production") {
  _prisma = getClient();
} else {
  if (!global.__db__) {
    global.__db__ = getClient();
  }
  _prisma = global.__db__;
}

function getClient(): PrismaClient {
  const { DATABASE_URL } = process.env;

  const client = new PrismaClient({
    datasources: {
      db: { url: DATABASE_URL }
    }
  });

  client.$connect();
  return client;
}

export function prisma(): PrismaClient {
  return _prisma;
}

export type PrismaEvent = Event;
```

#### 3. Consolidate Event Operations
**From**: `app/events/index.ts`
**To**: `app/lib/events.server.ts`

**Changes**: Import path updates only

```typescript
// app/lib/events.server.ts
import { prisma } from "./db.server";
import type { Event } from "@prisma/client";

const events = {
  get: async (args: any) => {
    return await prisma().event.findMany(args);
  },

  aggregate: async (args: any) => {
    return await prisma().event.aggregate(args);
  },

  create: async (data: { service: string; ok: boolean; latency?: number }) => {
    return await prisma().event.create({
      data: {
        service: data.service,
        status: data.ok ? "ok" : "fail",
        latency: data.latency
      }
    });
  }
};

export default events;
export type { Event };
```

#### 4. Consolidate Notification Operations
**From**: `app/notifications/index.ts`
**To**: `app/lib/notifications.server.ts`

**Changes**: Import path updates only

```typescript
// app/lib/notifications.server.ts
import { prisma } from "./db.server";

const notifications = {
  single: async (args: any) => {
    return await prisma().notification.findFirst(args);
  },

  create: async (data: { message: string }) => {
    return await prisma().notification.create({ data });
  }
};

export default notifications;
```

#### 5. Move Service Utilities
**From**: `app/services.server.ts`
**To**: `app/lib/services.server.ts`

**Changes**: Update imports to reference new locations

```typescript
// app/lib/services.server.ts
import events from "./events.server";
import { getConfig } from "../../server/config";

const services = {
  status: async () => {
    const wantedServices = getConfig().services.map(s => s.service);

    const statuses = await Promise.all(
      wantedServices.map(async (service) => {
        const latest = await events.get({
          where: { service },
          orderBy: { created: "desc" },
          take: 1
        });

        return {
          service,
          ok: latest[0]?.status === "ok" ?? false
        };
      })
    );

    return statuses;
  }
};

export default services;
```

#### 6. Keep Prisma Schema Unchanged
**File**: `prisma/schema.prisma`

No changes needed - schema remains identical.

### Success Criteria:

#### Automated Verification:
- [ ] Prisma client generates successfully: `npx prisma generate`
- [ ] TypeScript compilation succeeds with new paths: `npx tsc --noEmit`
- [ ] No import errors in moved files

#### Manual Verification:
- [ ] All database operation files correctly reference prisma client
- [ ] Import paths updated throughout codebase
- [ ] No duplicate files remain in old locations

---

## Phase 3: Bree Scheduler and Custom Server

### Overview
Replace the @breejs/later scheduler with Bree and create a custom Next.js server that initializes both the scheduler and the web app.

### Changes Required:

#### 1. Create Bree Scheduler
**File**: `server/scheduler.ts` (rewrite)

**Changes**: Complete rewrite to use Bree instead of @breejs/later

```typescript
// server/scheduler.ts
import Bree from 'bree';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from './log.js';
import type { Config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createScheduler(config: Config): Bree {
  const jobs = [];

  // Health check jobs for each service
  for (const service of config.services) {
    jobs.push({
      name: `health-${service.service}`,
      interval: service.schedule, // "every 5 minutes" works directly!
      path: path.join(__dirname, 'jobs', 'health-check.js'),
      worker: {
        workerData: {
          service: service.service,
          url: service.url,
          okStatusCode: service.okStatusCode
        }
      }
    });
  }

  // Healthchecks.io heartbeat
  if (config.heartbeat) {
    jobs.push({
      name: 'heartbeat',
      interval: config.heartbeat.schedule,
      path: path.join(__dirname, 'jobs', 'heartbeat.js'),
      worker: {
        workerData: {
          uuid: config.heartbeat.uuid
        }
      }
    });
  }

  // Ntfy notifications
  if (config.notify) {
    for (const notify of config.notify) {
      jobs.push({
        name: `ntfy-${notify.topic}`,
        interval: notify.schedule,
        path: path.join(__dirname, 'jobs', 'ntfy.js'),
        worker: {
          workerData: {
            topic: notify.topic,
            minutesBetween: notify.minutesBetween
          }
        }
      });
    }
  }

  const bree = new Bree({
    jobs,
    root: false, // We provide absolute paths
    errorHandler: (error, workerMetadata) => {
      log(`Job error in ${workerMetadata.name}: ${error.message}`);
    }
  });

  bree.on('worker created', (name) => {
    log(`Started job: ${name}`);
  });

  return bree;
}
```

#### 2. Create Health Check Job Worker
**File**: `server/jobs/health-check.ts` (new)

```typescript
// server/jobs/health-check.ts
import { parentPort, workerData } from 'worker_threads';
import events from '../../app/lib/events.server.js';
import { log } from '../log.js';

interface WorkerData {
  service: string;
  url: string;
  okStatusCode: number;
}

const { service, url, okStatusCode } = workerData as WorkerData;

(async () => {
  try {
    log(`Checking ${service}`);
    const start = Date.now();

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: 'manual'
    });

    const end = Date.now();
    const status = response.status === okStatusCode;

    await events.create({
      service,
      ok: status,
      latency: end - start
    });

    if (parentPort) parentPort.postMessage('done');
  } catch (error) {
    log(`Error checking ${service}: ${error}`);

    await events.create({
      service,
      ok: false,
      latency: undefined
    });

    if (parentPort) parentPort.postMessage('error');
  }
})();
```

#### 3. Create Heartbeat Job Worker
**File**: `server/jobs/heartbeat.ts` (new)

```typescript
// server/jobs/heartbeat.ts
import { parentPort, workerData } from 'worker_threads';
import services from '../../app/lib/services.server.js';
import { log } from '../log.js';

interface WorkerData {
  uuid: string;
}

const { uuid } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const everythingOk = latestStatus.every((e: any) => e.ok);

    if (everythingOk) {
      log('Everything OK, pinging healthcheck');
      await fetch(`https://hc-ping.com/${uuid}`);
    } else {
      log('Some service is down, postponing healthcheck ping');
    }

    if (parentPort) parentPort.postMessage('done');
  } catch (error) {
    log(`Heartbeat error: ${error}`);
    if (parentPort) parentPort.postMessage('error');
  }
})();
```

#### 4. Create Ntfy Job Worker
**File**: `server/jobs/ntfy.ts` (new)

```typescript
// server/jobs/ntfy.ts
import { parentPort, workerData } from 'worker_threads';
import services from '../../app/lib/services.server.js';
import notifications from '../../app/lib/notifications.server.js';
import { log } from '../log.js';

interface WorkerData {
  topic: string;
  minutesBetween: number;
}

const { topic, minutesBetween } = workerData as WorkerData;

function formatNotificationMessage(statuses: Array<{ service: string; ok: boolean }>): string | null {
  const failing = statuses.filter(s => !s.ok);
  if (failing.length === 0) return null;

  return failing.map(s => s.service).join(', ');
}

(async () => {
  try {
    const latestStatus = await services.status();
    const message = formatNotificationMessage(latestStatus);

    if (message === null) {
      log('Ntfy: no services down');
      if (parentPort) parentPort.postMessage('done');
      return;
    }

    const latestNotification = await notifications.single({
      orderBy: { timestamp: 'desc' }
    });

    const latestNotificationTimestamp = (
      latestNotification?.timestamp ?? new Date(0)
    ).getTime();

    const minutesSinceLastNotification =
      (Date.now() - latestNotificationTimestamp) / (1000 * 60);

    if (minutesSinceLastNotification > minutesBetween) {
      log(`Ntfy: sending message [${message}]`);
      await notifications.create({ message });

      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        body: message,
        headers: {
          Title: 'Service down',
          Tags: 'warning'
        }
      });
    } else {
      log(
        `Ntfy: ${minutesSinceLastNotification} minutes since last notification, waiting until ${minutesBetween}`
      );
    }

    if (parentPort) parentPort.postMessage('done');
  } catch (error) {
    log(`Ntfy error: ${error}`);
    if (parentPort) parentPort.postMessage('error');
  }
})();
```

#### 5. Create Custom Next.js Server
**File**: `server.ts` (rewrite)

**Changes**: Complete rewrite to use Next.js instead of Remix

```typescript
// server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { getConfig } from './server/config.js';
import { createScheduler } from './server/scheduler.js';
import { log } from './server/log.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Initialize configuration
  const config = getConfig();

  // Create and start Bree scheduler
  const scheduler = createScheduler(config);
  await scheduler.start();

  log('Background jobs started');

  // Graceful shutdown handler
  const gracefulShutdown = async () => {
    log('Shutting down gracefully...');
    await scheduler.stop();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Create HTTP server
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, () => {
    log(`Server listening on http://${hostname}:${port}`);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles job workers: `npx tsc --noEmit`
- [ ] Server starts without errors: `npm run dev`
- [ ] Bree initializes all jobs from config

#### Manual Verification:
- [ ] Logs show "Background jobs started" on server start
- [ ] Logs show each job starting (e.g., "Started job: health-api")
- [ ] Job workers execute on schedule (check logs for "Checking [service]")
- [ ] Database events table receives new entries from jobs
- [ ] Graceful shutdown works (CTRL+C stops jobs cleanly)

---

## Phase 4: Next.js App Router Migration

### Overview
Migrate all Remix routes to Next.js App Router using Server Components. Convert loaders to async functions, replace Remix-specific patterns with Next.js equivalents.

### Changes Required:

#### 1. Create Root Layout
**File**: `app/layout.tsx` (new, replaces `app/root.tsx`)

```typescript
// app/layout.tsx
import '@mantine/core/styles.css';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { AppShell, Burger, Group, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

export const metadata = {
  title: 'Monitor',
  description: 'Service monitoring dashboard'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <MantineProvider>
          <Navigation>{children}</Navigation>
        </MantineProvider>
      </body>
    </html>
  );
}

function Navigation({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <div>Monitor</div>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink href="/" label="Services" />
        <NavLink href="/nodes" label="Nodes" />
        <NavLink href="/config" label="Config" />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
```

#### 2. Migrate Services Dashboard (Index Route)
**File**: `app/page.tsx` (new, replaces `app/routes/_index.tsx`)

```typescript
// app/page.tsx
import { Container, Grid, Center } from '@mantine/core';
import { Service, type ServiceStatus } from './components/Service';
import { SegmentedControl } from './components/SegmentedControl';
import events, { type Event } from './lib/events.server';
import { getConfig } from '../server/config';
import { oneDayAgo } from './util/dates';
import { group, last } from './util/arrays';

interface SearchParams {
  show?: string;
}

export default async function Page({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const wantedServices = getConfig()
    .services.map((service) => service.service)
    .toSorted();

  const services = await Promise.all(
    wantedServices.map(async (service) => {
      const eventsForService = await events.get({
        where: { service: service, created: { gte: getSince() } },
        orderBy: { created: 'asc' }
      });

      const averageLatency = await events.aggregate({
        _avg: { latency: true },
        where: { service: service }
      });

      const eventsByHour = group(eventsForService, (event) => {
        const timestamp = event.created;
        return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
      });

      return {
        name: service,
        status: serviceStatus(last(eventsForService)),
        events: eventsByHour,
        averageLatency: averageLatency._avg?.latency ?? null
      };
    })
  );

  const statuses: Record<string, Array<ServiceStatus>> = {
    all: ['ok', 'failing', 'unknown'],
    failing: ['failing'],
    unknown: ['unknown']
  };

  const show = getShowParam(searchParams.show);

  return (
    <Container>
      <Center>
        <SegmentedControl
          data={[
            { value: 'all', label: 'All' },
            { value: 'failing', label: 'Failing' },
            { value: 'unknown', label: 'Unknown' }
          ]}
          defaultValue={show}
        />
      </Center>
      <Grid justify="flex-start" align="stretch">
        {services
          .filter((service) => statuses[show].includes(service.status))
          .map((service) => (
            <Grid.Col span={6} key={service.name}>
              <Service
                name={service.name}
                status={service.status}
                events={service.events}
                averageLatency={service.averageLatency}
              />
            </Grid.Col>
          ))}
      </Grid>
    </Container>
  );
}

const allowedShowValues = ['all', 'failing', 'unknown'] as const;

function getShowParam(
  value?: string
): (typeof allowedShowValues)[number] {
  if (value && allowedShowValues.includes(value as any)) {
    return value as (typeof allowedShowValues)[number];
  }
  return 'all';
}

function serviceStatus(ev: Event | null): ServiceStatus {
  if (ev === null) return 'unknown';
  return ev.ok ? 'ok' : 'failing';
}

function getSince(): Date {
  const since = oneDayAgo();
  since.setHours(since.getHours() + 1);
  since.setMinutes(0);
  since.setSeconds(0);
  since.setMilliseconds(0);
  return since;
}
```

#### 3. Migrate Nodes Page
**File**: `app/nodes/page.tsx` (new, replaces `app/routes/nodes.tsx`)

```typescript
// app/nodes/page.tsx
import { Container, Title, Stack, Card, Text } from '@mantine/core';
import { getConfig } from '../../server/config';
import { z } from 'zod';

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
```

#### 4. Migrate Config Page
**File**: `app/config/page.tsx` (new, replaces `app/routes/config.tsx`)

```typescript
// app/config/page.tsx
import { Container, Title, Code } from '@mantine/core';
import { getConfig } from '../../server/config';

export default async function ConfigPage() {
  const config = getConfig();

  return (
    <Container>
      <Title order={2} mb="md">
        Configuration
      </Title>
      <Code block>{JSON.stringify(config, null, 2)}</Code>
    </Container>
  );
}
```

#### 5. Migrate Health API Endpoint
**File**: `app/api/health/route.ts` (new, replaces `app/routes/health.ts`)

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import services from '../../lib/services.server';

export async function GET() {
  const version = process.env.VITE_VERSION || 'unknown';
  const latestStatus = await services.status();
  const operational = latestStatus.every((e) => e.ok);

  return NextResponse.json(
    {
      version,
      operational,
      ...(operational ? {} : { statuses: latestStatus })
    },
    { status: operational ? 200 : 500 }
  );
}
```

#### 6. Update SegmentedControl Component for Client-Side Navigation
**File**: `app/components/SegmentedControl.tsx`

**Changes**: Convert to Client Component with URL search params

```typescript
// app/components/SegmentedControl.tsx
'use client';

import { SegmentedControl as MantineSegmentedControl } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';

interface SegmentedControlProps {
  data: Array<{ value: string; label: string }>;
  defaultValue: string;
}

export function SegmentedControl({ data, defaultValue }: SegmentedControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get('show') || defaultValue;

  return (
    <MantineSegmentedControl
      data={data}
      value={value}
      onChange={(value) => {
        const params = new URLSearchParams(searchParams);
        params.set('show', value);
        router.push(`/?${params.toString()}`);
      }}
      mb="lg"
    />
  );
}
```

#### 7. Copy UI Components Unchanged
**Files**: All files in `app/components/` directory

**Changes**: None - copy directly

Components to copy:
- `app/components/Service.tsx`
- `app/components/Sparkline.tsx`
- Any other component files

### Success Criteria:

#### Automated Verification:
- [ ] Next.js builds successfully: `npm run build`
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All routes respond without errors: Test with curl or browser

#### Manual Verification:
- [ ] Dashboard (/) displays all services with correct status colors
- [ ] Service filter buttons work (All, Failing, Unknown)
- [ ] Sparkline charts render historical data
- [ ] Nodes page displays node information or error states
- [ ] Config page shows current configuration JSON
- [ ] Health API endpoint returns correct JSON and status codes
- [ ] Navigation between pages works smoothly
- [ ] Mantine styles apply correctly

---

## Phase 5: Docker and Deployment Configuration

### Overview
Update Docker configuration to build and run the Next.js app with custom server and Bree scheduler.

### Changes Required:

#### 1. Update Dockerfile
**File**: `Dockerfile`

**Changes**: Update to build Next.js app and include job workers

```dockerfile
FROM node:20
WORKDIR /usr/app

# Install dependencies
COPY package*.json ./
RUN npm clean-install

# Copy source code
COPY . .

# Add environment file for Docker
ADD .env.docker .env

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
```

#### 2. Update .dockerignore
**File**: `.dockerignore`

**Changes**: Add Next.js specific ignores

```
node_modules
.next
.git
*.log
npm-debug.log*
.DS_Store
.env.local
.env.*.local
build
.remix
```

#### 3. Verify docker-compose.yml
**File**: `docker-compose.yml` (if exists)

**Changes**: Ensure environment variables are correctly set

```yaml
version: '3.8'

services:
  monitor:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/usr/app/data/monitor.db
      - NODE_ENV=production
    volumes:
      - ./data:/usr/app/data
      - ./config:/config
    restart: unless-stopped
```

#### 4. Create Production Environment Template
**File**: `.env.docker`

```
DATABASE_URL=file:/usr/app/data/monitor.db
NODE_ENV=production
```

### Success Criteria:

#### Automated Verification:
- [ ] Docker image builds successfully: `docker build -t monitor .`
- [ ] Docker container starts: `docker run -p 3000:3000 monitor`
- [ ] Container logs show scheduler starting
- [ ] Container logs show Next.js server listening

#### Manual Verification:
- [ ] Web interface accessible at http://localhost:3000
- [ ] Background jobs execute inside container (check logs)
- [ ] Database persists data across container restarts (if using volume)
- [ ] Configuration mounts correctly from host
- [ ] Healthcheck endpoint responds correctly

---

## Phase 6: Cleanup and Final Testing

### Overview
Remove old Remix files, verify all functionality, and perform comprehensive testing.

### Changes Required:

#### 1. Remove Remix-Specific Files

**Files to delete**:
- `remix.config.js`
- `vite.config.js` (if not using Vite for other purposes)
- `app/entry.client.tsx`
- `app/entry.server.tsx`
- `app/root.tsx`
- `app/routes/` directory (entire directory)
- Old `server/services.ts` (replaced by job workers)
- Old `app/events/` directory (consolidated to `app/lib/events.server.ts`)
- Old `app/notifications/` directory (consolidated to `app/lib/notifications.server.ts`)

#### 2. Update .gitignore
**File**: `.gitignore`

**Changes**: Replace Remix patterns with Next.js patterns

```
# Dependencies
node_modules

# Next.js
.next
out

# Production
build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Database
data/
*.db
*.db-journal

# Config
config/config.json
```

#### 3. Create Migration Verification Script
**File**: `scripts/verify-migration.sh` (new)

```bash
#!/bin/bash

echo "Migration Verification Checklist"
echo "================================"
echo ""

# Check dependencies
echo "1. Checking dependencies..."
if npm list next &> /dev/null; then
    echo "   ✓ Next.js installed"
else
    echo "   ✗ Next.js not installed"
    exit 1
fi

if npm list bree &> /dev/null; then
    echo "   ✓ Bree installed"
else
    echo "   ✗ Bree not installed"
    exit 1
fi

# Check build
echo ""
echo "2. Checking build..."
if npm run build; then
    echo "   ✓ Build successful"
else
    echo "   ✗ Build failed"
    exit 1
fi

# Check file structure
echo ""
echo "3. Checking file structure..."
if [ -f "app/page.tsx" ]; then
    echo "   ✓ app/page.tsx exists"
else
    echo "   ✗ app/page.tsx missing"
    exit 1
fi

if [ -d "server/jobs" ]; then
    echo "   ✓ server/jobs directory exists"
else
    echo "   ✗ server/jobs directory missing"
    exit 1
fi

# Check for old files
echo ""
echo "4. Checking for old Remix files..."
if [ -f "remix.config.js" ]; then
    echo "   ⚠ Warning: remix.config.js still exists"
fi

if [ -d "app/routes" ]; then
    echo "   ⚠ Warning: app/routes directory still exists"
fi

echo ""
echo "Migration verification complete!"
```

### Success Criteria:

#### Automated Verification:
- [ ] Migration verification script passes: `bash scripts/verify-migration.sh`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build completes: `npm run build`
- [ ] Tests pass (if any): `npm test`
- [ ] Docker build succeeds: `docker build -t monitor .`

#### Manual Verification:
- [ ] All routes functional: /, /nodes, /config, /api/health
- [ ] Background jobs running (check logs for job execution messages)
- [ ] Database events being created by health checks
- [ ] Notifications sending when services fail
- [ ] Heartbeat pinging when all services healthy
- [ ] No console errors in browser
- [ ] Navigation works smoothly
- [ ] Search params persist (e.g., ?show=failing)
- [ ] Graceful shutdown works (CTRL+C, SIGTERM)
- [ ] Application restarts successfully
- [ ] Docker deployment works identically to local

---

## Testing Strategy

### Unit Tests

If time allows, add tests for:
- **Job workers**: Mock `parentPort` and verify database writes
- **Service status utility**: Test status aggregation logic
- **Configuration parser**: Test Zod schema validation

Example test structure:
```typescript
// server/jobs/__tests__/health-check.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('health-check job', () => {
  it('creates success event when service responds with correct status', async () => {
    // Mock fetch, events.create
    // Execute job logic
    // Assert events.create called with ok: true
  });

  it('creates failure event when service returns wrong status code', async () => {
    // Test error case
  });
});
```

### Integration Tests

Manual integration tests to perform:

1. **End-to-End Service Monitoring**:
   - Add a test service to config.json
   - Verify health check job runs
   - Verify event appears in database
   - Verify dashboard displays service status

2. **Notification Flow**:
   - Temporarily break a service (wrong URL)
   - Wait for notification schedule to trigger
   - Verify ntfy message received
   - Verify throttling works (no spam)

3. **Heartbeat Flow**:
   - Ensure all services healthy
   - Wait for heartbeat schedule
   - Verify healthchecks.io receives ping
   - Break a service, verify heartbeat pauses

4. **Configuration Changes**:
   - Update config.json (change schedule, add service)
   - Restart application
   - Verify new configuration loaded
   - Verify jobs reflect new schedules

### Load Testing

For production confidence:
- Run with 10+ services
- Monitor memory usage over 24 hours
- Verify no memory leaks from scheduler
- Check database size growth is expected

### Manual Testing Checklist

Before declaring migration complete:

**Web Interface**:
- [ ] Dashboard loads and displays services
- [ ] Filter buttons work (All, Failing, Unknown)
- [ ] Service status colors correct (green/red/gray)
- [ ] Sparkline charts display historical data
- [ ] Average latency displays correctly
- [ ] Nodes page shows node information
- [ ] Config page displays valid JSON
- [ ] Health endpoint returns JSON with correct status
- [ ] Navigation works between all pages
- [ ] No JavaScript errors in console

**Background Jobs**:
- [ ] Logs show jobs starting on server boot
- [ ] Health check jobs execute on schedule
- [ ] Database events table receives new records
- [ ] Healthchecks.io receives pings (when services healthy)
- [ ] Ntfy notifications send (when services failing)
- [ ] Notification throttling works correctly
- [ ] Jobs survive across server restarts
- [ ] Graceful shutdown stops all jobs cleanly

**Docker Deployment**:
- [ ] Docker build completes without errors
- [ ] Container starts successfully
- [ ] Web interface accessible from host
- [ ] Jobs execute inside container
- [ ] Configuration mounts from host volume
- [ ] Database persists across container restarts
- [ ] Logs accessible via `docker logs`

---

## Performance Considerations

### Expected Performance Characteristics

**Memory Usage**:
- Next.js app: ~150-200 MB baseline
- Bree scheduler: ~5-10 MB per job worker
- Prisma client: ~20-30 MB
- **Total estimate**: 250-350 MB for 10 services

**CPU Usage**:
- Idle: <1% (waiting for schedule triggers)
- During health checks: 2-5% per concurrent check
- Dashboard rendering: 5-10% per request

**Database Growth**:
- Assumptions: 10 services × 5-minute checks = 120 events/hour/service
- Daily growth: ~28,800 events per day for 10 services
- SQLite file size: ~1-2 MB per day (no cleanup)

**Recommendation**: Implement event retention policy (e.g., delete events older than 30 days) in future phase.

### Optimization Opportunities (Not In Scope)

- Add database indexes on `service` and `created` columns
- Implement event aggregation for older data
- Use Next.js caching for dashboard data
- Add Redis for distributed job coordination (if scaling needed)

---

## Migration Notes

### Breaking Changes

**None expected** - Migration is designed for 100% feature parity.

### Rollback Plan

If migration fails critically:

1. **Restore from backup**:
   - Git: `git checkout main` (assuming migration done on branch)
   - Database: Restore from pre-migration database backup
   - Docker: Revert to previous image tag

2. **Restore Dependencies**:
   ```bash
   git restore package.json package-lock.json
   npm clean-install
   ```

3. **Restore Old Server**:
   ```bash
   git restore server.ts
   npm run dev
   ```

### Data Migration

**Not required** - Prisma schema and database structure remain unchanged.

### Configuration Migration

**Not required** - config.json format is identical.

Only change: Bree supports the same human-readable schedules as @breejs/later, so no config changes needed.

---

## Post-Migration Tasks

After migration is complete and verified:

1. **Update Documentation**:
   - README.md: Update from Remix to Next.js
   - Add architecture diagram showing custom server + Bree
   - Document job worker pattern

2. **Monitor Production**:
   - Watch logs for job execution patterns
   - Monitor memory usage over first week
   - Verify database growth is expected

3. **Consider Future Enhancements**:
   - Add job monitoring dashboard (Bull Board or custom)
   - Implement event retention policy
   - Add database indexes for performance
   - Set up error alerting for job failures

---

## References

- **Related Research**: `planning/2025-12-13-remix-to-nextjs-migration/research.md`
- **Next.js Documentation**: https://nextjs.org/docs
- **Bree Documentation**: https://github.com/breejs/bree
- **Custom Server Guide**: https://nextjs.org/docs/pages/guides/custom-server
- **Mantine with Next.js**: https://mantine.dev/guides/next/
- **Prisma with Next.js**: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-monorepo

---

## Summary

This migration plan provides a comprehensive, step-by-step approach to migrating from Remix to Next.js while maintaining all functionality. The critical decision to use Bree as the scheduler ensures minimal configuration changes and preserves human-readable schedules.

**Key Success Factors**:
1. Thorough testing at each phase before proceeding
2. Verification of background job execution throughout
3. Docker build validation early in the process
4. Comprehensive manual testing before production deployment

**Estimated Timeline**:
- Phase 1 (Infrastructure): 2-3 hours
- Phase 2 (Database): 1-2 hours
- Phase 3 (Scheduler): 3-4 hours
- Phase 4 (Routes): 4-6 hours
- Phase 5 (Docker): 1-2 hours
- Phase 6 (Cleanup & Testing): 2-3 hours

**Total**: 13-20 hours (2-3 days of focused work)
