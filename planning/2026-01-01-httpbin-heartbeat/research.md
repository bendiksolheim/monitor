---
date: 2026-01-01T22:25:02+0000
researcher: Claude Sonnet 4.5
git_commit: d925af0bda027bf1d5b0843d3add8505ce9e7079
branch: main
repository: bendiksolheim/monitor
topic: "Adding httpbin heartbeat type for local development"
tags: [research, codebase, heartbeat, httpbin, config, scheduler]
status: complete
last_updated: 2026-01-01
last_updated_by: Claude Sonnet 4.5
---

# Research: Adding httpbin heartbeat type for local development

**Date**: 2026-01-01T22:25:02+0000
**Researcher**: Claude Sonnet 4.5
**Git Commit**: d925af0bda027bf1d5b0843d3add8505ce9e7079
**Branch**: main
**Repository**: bendiksolheim/monitor

## Research Question

How to implement httpbin heartbeat support in server/jobs/heartbeat.ts to allow realistic heartbeat testing during development without disturbing the production healthchecks.io endpoint?

## Summary

The config schema already supports a discriminated union for heartbeats (`healthchecks.io` vs `httpbin`), but the implementation only handles healthchecks.io. To support httpbin in development, three files need updates:

1. **server/scheduler-bree.ts** - Update workerData to pass heartbeat type, not just uuid
2. **server/jobs/heartbeat.ts** - Add conditional logic to handle both heartbeat types
3. **app/config/page.tsx** - Update UI to display httpbin heartbeat info correctly

The key architectural constraint is that the discriminated union type is already defined in config.ts, so implementation should leverage TypeScript's type narrowing capabilities.

## Detailed Findings

### Current Heartbeat Configuration Schema

**File**: `server/config.ts:15-26`

The config defines a discriminated union with two heartbeat types:

```typescript
const healthchecksio = z.object({
  type: z.literal("healthchecks.io"),
  uuid: z.string().uuid(),
  schedule: z.string(),
});

const httpbin = z.object({
  type: z.literal("httpbin"),
  schedule: z.string(),
});

const heartbeats = z.discriminatedUnion("type", [healthchecksio, httpbin]);
```

Key observations:
- **healthchecks.io** type has `uuid` field (for hc-ping.com endpoint)
- **httpbin** type does NOT have `uuid` field (will ping httpbin.org/get)
- Both types have `type` discriminator and `schedule` fields
- Union is exported as `Heartbeat` type (server/config.ts:43)

### Current Job Scheduler Implementation

**File**: `server/scheduler-bree.ts:40-51`

The scheduler only passes `uuid` to the heartbeat worker:

```typescript
if (config.heartbeat) {
  jobs.push({
    name: "heartbeat",
    interval: config.heartbeat.schedule,
    path: path.join(jobsDir, `heartbeat.ts`),
    worker: {
      workerData: {
        uuid: config.heartbeat.uuid,  // ❌ Problem: httpbin type doesn't have uuid
      },
    },
  });
}
```

**Issue**: TypeScript error occurs because `config.heartbeat.uuid` doesn't exist when `type: "httpbin"`. The workerData needs to pass the entire heartbeat config object instead.

### Current Heartbeat Job Implementation

**File**: `server/jobs/heartbeat.ts:1-28`

The job only handles healthchecks.io:

```typescript
interface WorkerData {
  uuid: string;  // ❌ Only expects uuid
}

const { uuid } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const everythingOk = latestStatus.every((e: any) => e.ok);

    if (everythingOk) {
      logger.info("Everything OK, pinging healthcheck");
      await fetch(`https://hc-ping.com/${uuid}`);  // ❌ Only pings healthchecks.io
    } else {
      logger.info("Some service is down, postponing healthcheck ping");
    }

    if (parentPort) parentPort.postMessage("done");
  } catch (error) {
    logger.error(`Heartbeat error: ${error}`);
    if (parentPort) parentPort.postMessage("error");
  }
})();
```

**Issues**:
- WorkerData interface only expects `uuid: string`
- No conditional logic for different heartbeat types
- Hardcoded healthchecks.io endpoint

### Configuration Display Page

**File**: `app/config/page.tsx:54-63`

The UI displays heartbeat config:

```typescript
{config.heartbeat ? (
  <div className="flex flex-col space-y-1">
    <dt className="text-sm font-medium text-gray-500">Heartbeat</dt>
    <dd className="text-sm text-gray-900">
      <dl className="divide-y divide-gray-100">
        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium text-gray-900">UUID</dt>
          <dd className="mt-1 text-sm text-gray-700 sm:col-span-2 sm:mt-0">{config.heartbeat.uuid}</dd>
        </div>
```

**Issue**: Displays `config.heartbeat.uuid` which doesn't exist for httpbin type. Needs conditional rendering based on heartbeat type.

## Code References

### Core Configuration Files
- `server/config.ts:15-26` - Heartbeat discriminated union schema definition
- `server/config.ts:43` - Heartbeat type export

### Scheduler & Job Files
- `server/scheduler-bree.ts:40-51` - Heartbeat job creation and workerData construction
- `server/jobs/heartbeat.ts:5-9` - WorkerData interface and destructuring
- `server/jobs/heartbeat.ts:13-18` - Service status check and healthchecks.io ping

### UI Files
- `app/config/page.tsx:54-63` - Heartbeat configuration display

### Supporting Files
- `server-nextjs.ts:17-20` - Server initialization and scheduler startup
- `app/lib/services.server.ts:13` - Service status retrieval used by heartbeat job

## Architecture Insights

### Job Scheduling Pattern

The monitor application uses **Bree** (v9.2.6) as its job scheduler, with a configuration-driven approach:

1. **Configuration Loading** (`server/config.ts:47-65`):
   - Zod validates JSON config file at startup
   - Exits process with error if validation fails
   - Returns typed Config object

2. **Job Creation** (`server/scheduler-bree.ts`):
   - `createScheduler()` dynamically builds job array from config
   - Each service gets its own health-check job
   - Optional heartbeat and ntfy notification jobs
   - Jobs run in isolated worker threads

3. **Worker Thread Pattern** (`server/jobs/*.ts`):
   - Each job is a self-contained TypeScript module
   - Receives data via `workerData` from worker_threads
   - Signals completion via `parentPort.postMessage()`
   - Async IIFE pattern for execution
   - Shared database access via Prisma singleton

### TypeScript Worker Support

The system uses a custom TypeScript plugin (`@breejs/ts-worker`) that allows running `.ts` files without precompilation:

- **Plugin**: `server/ts-worker/index.ts` - Extends Bree to intercept `.ts` files
- **Proxy Worker**: `server/ts-worker/worker.ts` - Dynamically imports actual job file
- **Benefit**: No build step needed for job development

### Discriminated Union Pattern

The codebase uses TypeScript discriminated unions for type-safe configuration:

```typescript
type Heartbeat =
  | { type: "healthchecks.io"; uuid: string; schedule: string }
  | { type: "httpbin"; schedule: string };
```

This pattern enables:
- **Type narrowing**: TypeScript can infer properties based on `type` field
- **Exhaustive checking**: Compiler ensures all cases are handled
- **Runtime safety**: Zod validates the discriminator at config load time

## Implementation Requirements

Based on the research, implementing httpbin support requires:

### 1. Update Scheduler (server/scheduler-bree.ts:40-51)

**Current approach**: Only passes `uuid`
```typescript
workerData: {
  uuid: config.heartbeat.uuid,  // ❌ Breaks for httpbin
}
```

**Required approach**: Pass entire heartbeat config
```typescript
workerData: {
  heartbeat: config.heartbeat,  // ✅ Works for both types
}
```

This allows the job to access all heartbeat properties and discriminate based on `type`.

### 2. Update Heartbeat Job (server/jobs/heartbeat.ts)

**Required changes**:
1. Update WorkerData interface to accept `heartbeat: Heartbeat` (import type from config.ts)
2. Add conditional logic based on `heartbeat.type`:
   - `type: "healthchecks.io"` → ping `https://hc-ping.com/${heartbeat.uuid}`
   - `type: "httpbin"` → ping `https://httpbin.org/get`
3. Update log messages to reflect the heartbeat type being used

**Type safety**: TypeScript will automatically narrow the heartbeat type in each branch:
```typescript
if (heartbeat.type === "healthchecks.io") {
  // TypeScript knows heartbeat.uuid exists here
  await fetch(`https://hc-ping.com/${heartbeat.uuid}`);
} else if (heartbeat.type === "httpbin") {
  // TypeScript knows heartbeat doesn't have uuid here
  await fetch(`https://httpbin.org/get`);
}
```

### 3. Update Config Display (app/config/page.tsx:54-63)

**Required changes**:
1. Add conditional rendering based on `config.heartbeat.type`
2. Display different fields for each type:
   - healthchecks.io: Show UUID
   - httpbin: Show endpoint URL or other relevant info
3. Always display schedule for both types

### Benefits of This Approach

1. **Type Safety**: Leverages TypeScript's discriminated union type narrowing
2. **Minimal Changes**: Only three files need updates
3. **Backwards Compatible**: Existing healthchecks.io configs work unchanged
4. **Testable**: httpbin.org/get is public and always returns 200 OK
5. **Development-Friendly**: No risk of polluting production healthchecks.io data

## Related Research

No previous research documents found in planning/ directory.

## Open Questions

1. **Logging**: Should httpbin heartbeat pings use different log messages to distinguish from production healthchecks.io?
2. **Error Handling**: Should httpbin heartbeat failures be handled differently (e.g., no alerts since it's dev-only)?
3. **Configuration Examples**: Should example configs in docs show both heartbeat types?
4. **UI Display**: What information should be shown for httpbin heartbeats in the config page? (Just endpoint URL, or more details?)
