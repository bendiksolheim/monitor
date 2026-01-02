# httpbin Heartbeat Implementation Plan

## Overview

Enable httpbin heartbeat support for local development to allow realistic heartbeat testing without disturbing production healthchecks.io endpoints. The config schema already supports both types via discriminated union - this plan implements the runtime behavior.

## Current State Analysis

The codebase has a well-designed discriminated union for heartbeats (`server/config.ts:15-26`) but the implementation only handles the `healthchecks.io` type:

- **Scheduler** (`server/scheduler-bree.ts:47`) - Only passes `uuid` to worker, causing TypeScript error for httpbin type
- **Heartbeat Job** (`server/jobs/heartbeat.ts:6-18`) - Hardcoded to ping healthchecks.io with uuid
- **Config UI** (`app/config/page.tsx:53-72`) - Section titled "Healthchecks.io" displays uuid unconditionally

### Key Discoveries:
- Discriminated union already defined: `type: "healthchecks.io" | "httpbin"` (server/config.ts:26)
- TypeScript will automatically narrow types in conditional branches
- httpbin.org/get is a reliable public endpoint for development testing
- No additional dependencies needed

## Desired End State

After implementation:
- Heartbeat job accepts and handles both heartbeat types
- httpbin pings go to `https://httpbin.org/get` when type is `httpbin`
- healthchecks.io pings continue working as before
- UI displays appropriate information for each type
- Log messages include heartbeat type for clarity
- Unit tests validate config schema for both heartbeat types

### Verification:
- TypeScript compiles without errors
- All unit tests pass (including new heartbeat config tests)
- Scheduler starts successfully with both config types
- Config page displays correct information for each type
- Heartbeat job logs include type information

## What We're NOT Doing

- Not adding error handling differences between types (both handled identically)
- Not creating example configuration files
- Not adding heartbeat verification/testing endpoints
- Not adding httpbin response validation
- Not changing existing healthchecks.io behavior

## Implementation Approach

Leverage TypeScript's discriminated union type narrowing to handle both heartbeat types. Pass the complete heartbeat config object through the worker pipeline, then use conditional logic based on `type` field. Three files need surgical updates to fix the type mismatch and add conditional rendering.

---

## Phase 1: Update Scheduler to Pass Full Heartbeat Config

### Overview
Fix the TypeScript error in the scheduler by passing the entire heartbeat config object instead of only the uuid field.

### Changes Required:

#### 1. server/scheduler-bree.ts
**File**: `server/scheduler-bree.ts:40-51`
**Changes**: Update workerData to pass complete heartbeat object

**Before**:
```typescript
if (config.heartbeat) {
  jobs.push({
    name: "heartbeat",
    interval: config.heartbeat.schedule,
    path: path.join(jobsDir, `heartbeat.ts`),
    worker: {
      workerData: {
        uuid: config.heartbeat.uuid,  // ❌ Breaks for httpbin type
      },
    },
  });
}
```

**After**:
```typescript
if (config.heartbeat) {
  jobs.push({
    name: "heartbeat",
    interval: config.heartbeat.schedule,
    path: path.join(jobsDir, `heartbeat.ts`),
    worker: {
      workerData: {
        heartbeat: config.heartbeat,  // ✅ Works for both types
      },
    },
  });
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm tsc --noEmit`
- [x] No build errors: `pnpm build`
- [x] All tests pass: `pnpm test`

#### Manual Verification:
- [x] Scheduler initializes without runtime errors when heartbeat is configured

---

## Phase 2: Add Conditional Logic to Heartbeat Job

### Overview
Update the heartbeat job to handle both heartbeat types using TypeScript's discriminated union type narrowing.

### Changes Required:

#### 1. server/jobs/heartbeat.ts
**File**: `server/jobs/heartbeat.ts:1-28`
**Changes**:
1. Update WorkerData interface to accept Heartbeat type
2. Import Heartbeat type from config
3. Add conditional logic for different heartbeat types
4. Update log messages to include heartbeat type

**Before**:
```typescript
import { parentPort, workerData } from "worker_threads";
import services from "../../app/lib/services.server.ts";
import { logger } from "../log.ts";

interface WorkerData {
  uuid: string;
}

const { uuid } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const everythingOk = latestStatus.every((e: any) => e.ok);

    if (everythingOk) {
      logger.info("Everything OK, pinging healthcheck");
      await fetch(`https://hc-ping.com/${uuid}`);
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

**After**:
```typescript
import { parentPort, workerData } from "worker_threads";
import services from "../../app/lib/services.server.ts";
import { logger } from "../log.ts";
import type { Heartbeat } from "../config.ts";

interface WorkerData {
  heartbeat: Heartbeat;
}

const { heartbeat } = workerData as WorkerData;

(async () => {
  try {
    const latestStatus = await services.status();
    const everythingOk = latestStatus.every((e: any) => e.ok);

    if (everythingOk) {
      logger.info(`Everything OK, pinging heartbeat (${heartbeat.type})`);

      if (heartbeat.type === "healthchecks.io") {
        await fetch(`https://hc-ping.com/${heartbeat.uuid}`);
      } else if (heartbeat.type === "httpbin") {
        await fetch(`https://httpbin.org/get`);
      }
    } else {
      logger.info("Some service is down, postponing heartbeat ping");
    }

    if (parentPort) parentPort.postMessage("done");
  } catch (error) {
    logger.error(`Heartbeat error: ${error}`);
    if (parentPort) parentPort.postMessage("error");
  }
})();
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm tsc --noEmit`
- [x] No build errors: `pnpm build`
- [x] All tests pass: `pnpm test`
- [x] Scheduler can be instantiated with both heartbeat types

#### Manual Verification:
- [x] With healthchecks.io config: job logs show "pinging heartbeat (healthchecks.io)"
- [x] With httpbin config: job logs show "pinging heartbeat (httpbin)"
- [x] httpbin endpoint receives GET request (verify via httpbin.org or network monitor)
- [x] healthchecks.io endpoint continues to work as before

---

## Phase 3: Update UI to Display Heartbeat Config Correctly

### Overview
Fix the config page to display the correct heartbeat information for each type, rename the section to "Heartbeat", and add conditional rendering.

### Changes Required:

#### 1. app/config/page.tsx
**File**: `app/config/page.tsx:53-72`
**Changes**:
1. Rename section title from "Healthchecks.io" to "Heartbeat"
2. Add conditional rendering based on `heartbeat.type`
3. Display UUID for healthchecks.io type
4. Display endpoint URL for httpbin type

**Before**:
```typescript
<Section title="Healthchecks.io">
  {config.heartbeat ? (
    <Card shadow="xs">
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
    <Card shadow="xs">
      <p className="text-base-content/70">Not configured</p>
    </Card>
  )}
</Section>
```

**After**:
```typescript
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
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm tsc --noEmit`
- [x] Next.js builds successfully: `pnpm build`
- [x] All tests pass: `pnpm test`
- [x] No React rendering errors in development mode

#### Manual Verification:
- [x] Config page loads without errors at `/config`
- [x] With healthchecks.io config: displays "Type: healthchecks.io", UUID, and schedule
- [x] With httpbin config: displays "Type: httpbin", "Endpoint: https://httpbin.org/get", and schedule
- [x] Section title shows "Heartbeat" instead of "Healthchecks.io"
- [x] No TypeScript errors when accessing heartbeat properties

---

## Phase 4: Add Config Parsing Tests

### Overview
Add unit tests to verify the heartbeat discriminated union schema correctly validates both heartbeat types. This ensures the Zod schema catches invalid configs and allows both valid types.

### Changes Required:

#### 1. server/config.ts
**File**: `server/config.ts:26`
**Changes**: Export the heartbeats schema for testing

**Before**:
```typescript
const heartbeats = z.discriminatedUnion("type", [healthchecksio, httpbin]);
```

**After**:
```typescript
const heartbeats = z.discriminatedUnion("type", [healthchecksio, httpbin]);

export { heartbeats };
```

#### 2. test/heartbeat-config.test.ts
**File**: `test/heartbeat-config.test.ts` (new file)
**Changes**: Create test file with 4 test cases

```typescript
import { test, expect, describe } from "vitest";
import { heartbeats } from "../server/config";

describe("Heartbeat config parsing", () => {
  test("accepts healthchecks.io type with uuid", () => {
    const config = {
      type: "healthchecks.io",
      uuid: "12345678-1234-1234-1234-123456789012",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(true);
  });

  test("accepts httpbin type without uuid", () => {
    const config = {
      type: "httpbin",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(true);
  });

  test("rejects healthchecks.io without uuid", () => {
    const config = {
      type: "healthchecks.io",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(false);
  });

  test("rejects invalid heartbeat type", () => {
    const config = {
      type: "invalid",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(false);
  });

  test("rejects healthchecks.io with invalid uuid format", () => {
    const config = {
      type: "healthchecks.io",
      uuid: "not-a-valid-uuid",
      schedule: "every 5 minutes",
    };
    const result = heartbeats.safeParse(config);
    expect(result.success).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `pnpm tsc --noEmit`
- [x] All tests pass: `pnpm test`
- [x] Specifically, all 5 heartbeat config tests pass

#### Manual Verification:
- [x] Test file is readable and follows existing test patterns in `test/format-notification-message.test.ts`
- [x] Test output clearly shows which scenarios pass/fail

---

## Testing Strategy

### Unit Tests:
Added comprehensive config parsing tests in Phase 4:
- Validates both heartbeat types are accepted
- Ensures invalid configs are rejected
- Tests UUID format validation for healthchecks.io type
- Prevents regressions in the discriminated union schema

These tests follow the existing Vitest pattern from `test/format-notification-message.test.ts`.

### Integration Tests:
Not adding integration tests for this change since:
- Worker threads are difficult to integration test
- Manual testing provides sufficient coverage for runtime behavior

### Manual Testing Steps:

#### Test 1: healthchecks.io Type (Existing Behavior)
1. Create config with `heartbeat: { type: "healthchecks.io", uuid: "test-uuid", schedule: "every 5 minutes" }`
2. Start dev server: `pnpm dev`
3. Verify scheduler logs show job started
4. Trigger heartbeat job manually or wait for scheduled run
5. Verify logs show: "Everything OK, pinging heartbeat (healthchecks.io)"
6. Verify network request to `hc-ping.com/test-uuid`
7. Visit `/config` page
8. Verify displays: Type, UUID, and Schedule

#### Test 2: httpbin Type (New Behavior)
1. Create config with `heartbeat: { type: "httpbin", schedule: "every 5 minutes" }`
2. Start dev server: `pnpm dev`
3. Verify scheduler logs show job started
4. Trigger heartbeat job manually or wait for scheduled run
5. Verify logs show: "Everything OK, pinging heartbeat (httpbin)"
6. Verify network request to `httpbin.org/get` returns 200
7. Visit `/config` page
8. Verify displays: Type, Endpoint URL, and Schedule

#### Test 3: No Heartbeat Configured
1. Create config without heartbeat field
2. Start dev server: `pnpm dev`
3. Verify scheduler doesn't create heartbeat job
4. Visit `/config` page
5. Verify "Not configured" message appears

## Performance Considerations

No performance impact expected:
- httpbin.org/get is a public, reliable endpoint
- Single HTTP GET request (same as healthchecks.io)
- No additional processing or data transformation

## Migration Notes

No migration needed:
- Existing healthchecks.io configs continue working unchanged
- New httpbin type is additive, not breaking
- Config validation already enforces correct schema

## References

- Related research: `planning/2026-01-01-httpbin-heartbeat/research.md`
- Heartbeat schema: `server/config.ts:15-26`
- Scheduler implementation: `server/scheduler-bree.ts:40-51`
- Heartbeat job: `server/jobs/heartbeat.ts:1-28`
- Config UI: `app/config/page.tsx:53-72`
