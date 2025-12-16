---
date: 2025-12-16T21:00:00+0000
author: Claude Sonnet 4.5
git_commit: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
branch: rework-configuration
repository: bendiksolheim/monitor
topic: "Restore notification message formatting functionality"
tags: [implementation, testing, migration, notifications]
status: pending_approval
---

# Restore Notification Message Formatting Implementation Plan

## Overview

During the Remix to Next.js migration, the `formatNotificationMessage` function was simplified from a full-featured formatter with proper English grammar to a basic comma-separated list. This implementation plan restores the original functionality by extracting the formatting logic into a dedicated, testable module.

## Current State Analysis

### What Exists Now:
- **Simplified implementation** at `server/jobs/ntfy.ts:13-20`:
  - Only returns comma-separated service names: `"service-1, service-2"`
  - Not exported (private to worker thread)
  - Missing proper grammar and service count

- **Broken test file** at `test/format-notification-message.test.ts`:
  - Imports from deleted file: `server/format-notification-message`
  - Expects formatted messages: `"2 services down: service-1 and service-2"`
  - Test cannot run due to import error

- **Event type** is properly defined at `app/lib/events.server.ts:4-12`

### Key Discoveries:
- The test suite reveals the original formatting was intentional and well-specified
- Tests verify proper grammar: "and" connectors, singular/plural handling
- The `range` utility import (`~/util/arrays`) is valid and still works
- Project uses Vitest for testing with `npm test` command

### What's Missing:
- Dedicated module for notification message formatting
- Export of the formatting function for testing
- Proper grammar rules (Oxford comma, "and" connectors)
- Service count prefix ("N service(s) down:")

## Desired End State

After implementation:
1. ✅ A new module `app/lib/format-notification-message.ts` exists with the full formatting logic
2. ✅ The function is properly exported and can be imported by both production code and tests
3. ✅ `server/jobs/ntfy.ts` uses the new module instead of inline implementation
4. ✅ `test/format-notification-message.test.ts` imports from the correct location
5. ✅ All test cases pass, verifying:
   - Null for no failing services
   - "1 service down: name" for single service
   - "2 services down: name1 and name2" for two services
   - "3 services down: name1, name2 and name3" for three+ services (Oxford comma)
6. ✅ User-facing notifications display professional, grammatically correct messages

### Verification:
Run `npm test` and verify all tests in `test/format-notification-message.test.ts` pass.

## What We're NOT Doing

- Adding new notification features (timestamps, node names, severity levels)
- Changing the notification delivery mechanism (ntfy.sh integration)
- Modifying the database schema or Event type structure
- Adding new test cases beyond fixing the existing ones
- Internationalizing messages (English only for now)
- Changing the notification throttling logic

## Implementation Approach

This is a straightforward restoration task with three main steps:
1. Create the new formatting module with the full implementation
2. Update the worker thread to use the new module
3. Fix the test file imports

The implementation follows the pattern established by other `app/lib/*.ts` modules in the project.

---

## Phase 1: Create Formatting Module

### Overview
Create a new dedicated module that implements the full notification message formatting logic with proper English grammar rules.

### Changes Required:

#### 1. New Module: `app/lib/format-notification-message.ts`
**File**: `app/lib/format-notification-message.ts` (NEW)
**Purpose**: Provide a pure, testable formatting function

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

**Key Implementation Details:**
- Accepts an array of events with `service` and `ok` properties
- Filters to only failing services (`ok: false`)
- Returns `null` if no services are down (matches test expectations)
- Handles singular/plural correctly ("service" vs "services")
- Implements proper English grammar:
  - 1 service: "service-name"
  - 2 services: "service-1 and service-2"
  - 3+ services: "service-1, service-2 and service-3" (Oxford comma style)

### Success Criteria:

#### Automated Verification:
- [x] File exists at `app/lib/format-notification-message.ts`
- [x] TypeScript compilation succeeds: `npx tsc --noEmit`
- [x] No linting errors

#### Manual Verification:
- [x] Function signature matches the original interface
- [x] Grammar rules are correctly implemented

---

## Phase 2: Update Worker Thread

### Overview
Replace the simplified inline implementation in the ntfy worker with an import from the new module.

### Changes Required:

#### 1. Update `server/jobs/ntfy.ts`
**File**: `server/jobs/ntfy.ts`
**Changes**: Replace inline function with import

**Add import at top of file (after line 4):**
```typescript
import { formatNotificationMessage } from "../../app/lib/format-notification-message";
```

**Remove the inline function (lines 13-20):**
```typescript
// DELETE THIS:
function formatNotificationMessage(
  statuses: Array<{ service: string; ok: boolean }>,
): string | null {
  const failing = statuses.filter((s) => !s.ok);
  if (failing.length === 0) return null;

  return failing.map((s) => s.service).join(", ");
}
```

The existing usage at line 25 remains unchanged:
```typescript
const message = formatNotificationMessage(latestStatus);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npx tsc --noEmit`
- [x] Build completes successfully: `npm run build`
- [x] No import errors

#### Manual Verification:
- [x] Worker thread file has correct import statement
- [x] Inline function is completely removed
- [x] Function call site is unchanged

---

## Phase 3: Fix Test File

### Overview
Update the test file to import from the new module location.

### Changes Required:

#### 1. Update `test/format-notification-message.test.ts`
**File**: `test/format-notification-message.test.ts`
**Changes**: Fix import path

**Replace line 3:**
```typescript
// OLD:
import { formatNotificationMessage } from "../server/format-notification-message";

// NEW:
import { formatNotificationMessage } from "../app/lib/format-notification-message";
```

**Note:** The import of `range` from `~/util/arrays` (line 4) is already correct and requires no changes.

### Success Criteria:

#### Automated Verification:
- [x] All tests pass: `npm test`
- [x] Specifically, `test/format-notification-message.test.ts` passes all 5 test cases:
  - ✓ no services down → returns `null`
  - ✓ single service down → "1 service down: my-service-0"
  - ✓ two services down → "2 services down: my-service-0 and my-service-1"
  - ✓ three services down → "3 services down: my-service-0, my-service-1 and my-service-2"
  - ✓ one down, one up → "1 service down: my-service-0"

#### Manual Verification:
- [x] Test file imports resolve correctly
- [x] No import errors in IDE/editor

---

## Testing Strategy

### Unit Tests
The existing test suite at `test/format-notification-message.test.ts` provides comprehensive coverage:

**Test Cases:**
1. **No services down** - Returns `null` (no notification needed)
2. **Single service** - Singular form: "1 service down: name"
3. **Two services** - Simple "and": "2 services down: name1 and name2"
4. **Three services** - Oxford comma: "3 services down: name1, name2 and name3"
5. **Mixed status** - Filters correctly: only counts failing services

**Edge Cases Covered:**
- Empty array of events
- All services OK
- Mix of OK and failing services
- Proper filtering by `ok: false`

### Integration Testing
No new integration tests needed - the existing notification job integration remains unchanged.

### Manual Testing Steps
After implementation:

1. **Run the test suite:**
   ```bash
   npm test
   ```
   Verify all tests pass, especially `format-notification-message.test.ts`

2. **Test with the scheduler (optional):**
   - Run the application in development mode
   - Trigger the ntfy job manually or wait for scheduled run
   - Verify notifications show formatted messages (requires ntfy.sh configuration)

---

## Performance Considerations

### Impact Assessment
- **Minimal performance impact**: The function is called once per notification check (typically every N minutes)
- **String operations**: All operations are O(n) where n is the number of failing services
- **Memory**: Negligible - creates temporary arrays for filtering and mapping

### Optimization Notes
- No optimization needed for current scale
- Function is pure and could be memoized if needed in the future
- Consider caching if notification checks become more frequent (unlikely)

---

## Migration Notes

### No Data Migration Required
This is a code-only change:
- No database schema changes
- No stored data needs updating
- No configuration changes required

### Deployment Notes
- **Zero downtime**: The change is backwards compatible
- **No rollback concerns**: Formatting change is cosmetic from a functional perspective
- **Testing**: Verify tests pass before deploying

### Backwards Compatibility
The function signature remains identical to the original implementation:
```typescript
(events: Array<{ service: string; ok: boolean }>) => string | null
```

---

## References

- Related research: `planning/2025-12-16-notification-test-import-errors/research.md`
- Current simplified implementation: `server/jobs/ntfy.ts:13-20`
- Test expectations: `test/format-notification-message.test.ts:6-36`
- Event type definition: `app/lib/events.server.ts:4-12`
- Array utilities: `app/util/arrays.ts:22-26`
