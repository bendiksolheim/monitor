---
date: 2025-12-16T20:33:57+0000
researcher: Claude Sonnet 4.5
git_commit: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
branch: rework-configuration
repository: bendiksolheim/monitor
topic: "Test import errors after Remix to Next.js migration"
tags: [research, codebase, testing, migration, notifications]
status: complete
last_updated: 2025-12-16
last_updated_by: Claude Sonnet 4.5
---

# Research: Test Import Errors After Remix to Next.js Migration

**Date**: 2025-12-16T20:33:57+0000
**Researcher**: Claude Sonnet 4.5
**Git Commit**: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
**Branch**: rework-configuration
**Repository**: bendiksolheim/monitor

## Research Question

After the Remix to Next.js migration, `test/format-notification-message.test.ts` has import errors. The test cannot import the function it's testing. What happened during the migration, and how can we fix it?

## Summary

The test file has **two issues** after the migration:

1. **Missing function**: `formatNotificationMessage` was moved from the deleted file `server/format-notification-message.ts` to inline in `server/jobs/ntfy.ts` (lines 13-20), but it's not exported.

2. **Implementation mismatch**: The current implementation was **simplified** during migration - it only returns comma-separated service names, but the tests expect formatted messages with proper English grammar like "1 service down: my-service-0" and "2 services down: service-0 and service-1".

The test imports from a deleted file path and expects functionality that no longer exists in the same form.

## Detailed Findings

### What Happened During Migration

**Before (Remix):**
- Function existed in: `server/format-notification-message.ts` (now deleted)
- Full implementation with proper message formatting:
  - Prefix: "N service(s) down: "
  - Proper grammar: "service1 and service2" or "service1, service2 and service3"

**After (Next.js):**
- Function moved inline to: `server/jobs/ntfy.ts:13-20`
- **Simplified implementation**: Just returns comma-separated service names
- Not exported (private to the worker thread module)
- Test file not updated to reflect changes

### Current Implementation

File: `server/jobs/ntfy.ts:13-20`

```typescript
function formatNotificationMessage(
  statuses: Array<{ service: string; ok: boolean }>,
): string | null {
  const failing = statuses.filter((s) => !s.ok);
  if (failing.length === 0) return null;

  return failing.map((s) => s.service).join(", ");
}
```

**Output examples:**
- 1 service: `"my-service-0"`
- 2 services: `"my-service-0, my-service-1"`
- 3 services: `"my-service-0, my-service-1, my-service-2"`

### Test Expectations

File: `test/format-notification-message.test.ts`

The tests expect:
- 0 services: `null`
- 1 service: `"1 service down: my-service-0"`
- 2 services: `"2 services down: my-service-0 and my-service-1"`
- 3 services: `"3 services down: my-service-0, my-service-1 and my-service-2"`

**Import statement (line 3):**
```typescript
import { formatNotificationMessage } from "../server/format-notification-message";
```

This path no longer exists.

### Secondary Import Issue

The test also imports:
```typescript
import { range } from "~/util/arrays";
```

**Status**: This import is **valid** - the `range` function exists at `app/util/arrays.ts:22-26` and the `~` alias correctly points to the `app/` directory in the Next.js tsconfig.

## Code References

- `test/format-notification-message.test.ts:3` - Broken import path
- `server/jobs/ntfy.ts:13-20` - Current (simplified) implementation
- `server/jobs/ntfy.ts:25` - Function usage in notification job
- `app/util/arrays.ts:22-26` - `range` utility (still valid)

## Fix Strategies

### Option 1: Extract and Restore Full Implementation (Recommended)

**Restore the original functionality** by creating a new shared module with the proper formatting logic.

**Steps:**
1. Create `app/lib/format-notification-message.ts` or `server/format-notification-message.ts`
2. Implement the full formatting logic with proper grammar
3. Export the function
4. Update `server/jobs/ntfy.ts` to import from the new location
5. Update `test/format-notification-message.test.ts` to import from the new location

**Pros:**
- Maintains test coverage
- Restores user-friendly message formatting
- Follows separation of concerns (testable utility vs. job logic)

**Cons:**
- Adds back a file that was removed during simplification

### Option 2: Export from Current Location

**Make the current simplified implementation available** to the test.

**Steps:**
1. Export `formatNotificationMessage` from `server/jobs/ntfy.ts`
2. Update test import to: `import { formatNotificationMessage } from "../server/jobs/ntfy"`
3. Update test expectations to match simplified output (comma-separated only)

**Pros:**
- Minimal code changes
- Works with current implementation

**Cons:**
- Loses the nice formatting ("and" connectors, service count prefix)
- Tests become less meaningful (just testing `.join(", ")`)
- Breaks module encapsulation (exporting from a worker thread file)

### Option 3: Delete the Test

Remove the test file entirely.

**Pros:**
- No import errors
- Simplest immediate fix

**Cons:**
- Loses test coverage for notification message formatting
- Not recommended unless the formatting logic is deemed unnecessary

## Recommended Approach

**Option 1** is recommended because:
1. The tests reveal that **proper message formatting was intentional** (grammar rules with "and")
2. User-facing notifications benefit from professional formatting
3. The logic is testable and reusable
4. Separation of concerns: pure formatting function vs. side-effect-heavy job

## Implementation Example

Create `app/lib/format-notification-message.ts`:

```typescript
export function formatNotificationMessage(
  events: Array<{ service: string; ok: boolean }>,
): string | null {
  const failing = events.filter((e) => !e.ok);

  if (failing.length === 0) return null;

  const serviceNames = failing.map((e) => e.service);
  const count = serviceNames.length;
  const plural = count === 1 ? "service" : "services";

  let namesList: string;
  if (count === 1) {
    namesList = serviceNames[0];
  } else if (count === 2) {
    namesList = `${serviceNames[0]} and ${serviceNames[1]}`;
  } else {
    const last = serviceNames[serviceNames.length - 1];
    const rest = serviceNames.slice(0, -1).join(", ");
    namesList = `${rest} and ${last}`;
  }

  return `${count} ${plural} down: ${namesList}`;
}
```

Then update:
- `server/jobs/ntfy.ts:13-20` - Replace inline function with import
- `test/format-notification-message.test.ts:3` - Update import path

## Open Questions

1. Was the message formatting intentionally simplified during migration, or accidentally lost?
2. Are there other deleted utility functions that need to be restored?
3. Should notification messages include additional context (timestamp, node name)?
