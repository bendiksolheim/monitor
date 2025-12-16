# Object Logging Fix Implementation Plan

## Overview

Fix the `[object Object]` issue in logs by refactoring the `log` function to accept varargs and handle object serialization centrally, rather than fixing it in each individual logger method.

## Current State Analysis

The custom logger in `server/log.ts` currently:
- Has a `log(value: string, level: LogLevel = "info")` function that takes a pre-joined string
- Each logger method (debug, info, warn, error) joins arguments using `.join(", ")` before passing to `log()`
- When objects are passed (by the Bree scheduler), `.join()` calls `toString()` which returns `"[object Object]"`

**Root Cause**: `server/log.ts:10-17` - Logger methods use `[message, ...args].join(", ")` which doesn't serialize objects properly.

**Direct `log()` usage** (will need updating):
- `server-nextjs.ts:68` - `log(message)` with default level
- `server/scheduler-bree.ts:86` - `log(message)` with default level
- `server/jobs/ntfy.ts:57-59` - `log(message)` with default level

All logger method usage (`logger.info()`, `logger.error()`, etc.) passes only strings currently, except for Bree's internal calls which pass metadata objects.

## Desired End State

After implementation:
- The `log()` function accepts varargs: `log(level: LogLevel, ...args: any[])`
- Object serialization happens in one place (inside `log()`)
- Logger methods simply delegate to `log()` without manual joining
- Direct `log()` call sites updated to use logger methods

**Verification**:
- Run the app and trigger a job completion
- Check that log output shows JSON-serialized metadata instead of `[object Object]`
- Example: `[2025-12-15T21:12:27.041Z] [INFO] Worker for job "health-Monitor" signaled completion, {"name":"health-Monitor","message":"done"}`

## What We're NOT Doing

- Not adding pretty-printing or indentation for objects (keep logs compact)
- Not adding truncation for large objects (premature optimization)
- Not adding special Error object handling (can be added later if needed)
- Not changing the logger method signatures or their external API

## Implementation Approach

Refactor the `log()` function to:
1. Accept level as first parameter, then varargs
2. Serialize each argument appropriately (strings as-is, objects via JSON.stringify)
3. Join serialized arguments with `", "`
4. Update the three direct call sites to use logger methods instead

This centralizes all serialization logic in one place, making it easier to maintain and extend.

## Phase 1: Refactor log function

### Overview
Rewrite the `log()` function to accept varargs and handle serialization internally.

### Changes Required:

#### 1. server/log.ts - Add serializeArg helper function
**File**: `server/log.ts`
**Changes**: Add a helper function before the `log` function to serialize arguments properly

```typescript
function serializeArg(arg: any): string {
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  try {
    return JSON.stringify(arg);
  } catch (err) {
    // Handle circular references or other JSON.stringify errors
    return String(arg);
  }
}
```

**Rationale**: This function handles all the edge cases for serialization:
- Primitives are converted to strings directly
- Objects are JSON-serialized
- Circular references fall back to `String()`

#### 2. server/log.ts - Refactor log function signature and implementation
**File**: `server/log.ts:3-7`
**Changes**: Change signature to accept varargs and perform serialization

```typescript
export function log(level: LogLevel, ...args: any[]) {
  const now = new Date();
  const serialized = args.map(serializeArg).join(", ");
  process.stdout.write(`[${now.toISOString()}] [${level.toUpperCase()}] ${serialized}\n`);
}
```

**Rationale**:
- Level is now required as first parameter (cleaner than optional parameter)
- All arguments are serialized before joining
- Single place for all serialization logic

#### 3. server/log.ts - Simplify logger methods
**File**: `server/log.ts:9-18`
**Changes**: Update logger methods to just pass through to `log()`

```typescript
export const logger = {
  debug: (message: string, ...args: any[]) => log("debug", message, ...args),
  info: (message: string, ...args: any[]) => log("info", message, ...args),
  warn: (message: string, ...args: any[]) => log("warn", message, ...args),
  error: (message: string, ...args: any[]) => log("error", message, ...args),
};
```

**Rationale**: Logger methods now just delegate to `log()` - no more manual joining.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] No import errors when server starts: `node server-nextjs.ts` (or development command)

#### Manual Verification:
- [ ] Cannot fully verify until Phase 2 call sites are updated

---

## Phase 2: Update Direct Call Sites

### Overview
Update the three direct `log()` call sites to use logger methods instead, since the signature changed.

### Changes Required:

#### 1. server-nextjs.ts - Use logger.info instead of log
**File**: `server-nextjs.ts:68`
**Changes**: Replace direct `log()` call with `logger.info()`

**Before**:
```typescript
log(`Server listening on http://${hostname}:${port}`);
```

**After**:
```typescript
logger.info(`Server listening on http://${hostname}:${port}`);
```

**Rationale**: All direct log calls were using default info level anyway.

#### 2. server/scheduler-bree.ts - Use logger.info instead of log
**File**: `server/scheduler-bree.ts:86`
**Changes**: Replace direct `log()` call with `logger.info()`

**Before**:
```typescript
log(`Started job: ${name}`);
```

**After**:
```typescript
logger.info(`Started job: ${name}`);
```

#### 3. server/jobs/ntfy.ts - Use logger.info instead of log
**File**: `server/jobs/ntfy.ts:57-59`
**Changes**: Replace direct `log()` call with `logger.info()`

**Before**:
```typescript
log(
  `Ntfy: ${minutesSinceLastNotification} minutes since last notification, waiting until ${minutesBetween}`,
);
```

**After**:
```typescript
logger.info(
  `Ntfy: ${minutesSinceLastNotification} minutes since last notification, waiting until ${minutesBetween}`,
);
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] Application starts without errors: Start development server
- [ ] No runtime errors in logs during startup

#### Manual Verification:
- [ ] Start the application and verify server startup message appears correctly
- [ ] Verify scheduler job start messages appear correctly
- [ ] Trigger a job completion (health check or heartbeat) and verify the log shows JSON metadata instead of `[object Object]`
- [ ] Example expected output: `[2025-12-16T...] [INFO] Worker for job "health-Monitor" signaled completion, {"name":"health-Monitor","message":"done"}`

---

## Testing Strategy

### Unit Tests:
Since this is a logging utility without existing tests, unit tests are not required for this fix. However, if tests are added in the future, they should cover:
- `serializeArg()` with various types (string, number, boolean, null, undefined, object, circular reference)
- `log()` output format with multiple arguments

### Integration Tests:
- Start the application in development mode
- Verify all existing log messages appear correctly
- Trigger Bree job completions to verify object serialization

### Manual Testing Steps:
1. Start the application: `npm run dev` (or equivalent)
2. Verify server startup message appears
3. Wait for or trigger a scheduled job (health check runs frequently)
4. Check logs for job completion messages
5. Verify metadata appears as JSON, not `[object Object]`
6. Check that no existing log messages are broken

## Performance Considerations

**JSON.stringify Performance**:
- Only called when objects are actually logged
- Bree metadata objects are small (typically <100 bytes)
- Try-catch handles circular references without crashing
- Negligible performance impact for this use case

**Logging Frequency**:
- Application logging is infrequent (startup, job events, errors)
- Not called in hot paths or request handlers
- No performance concerns

## Migration Notes

This is a refactoring of internal logging implementation with no external API changes:
- The `logger` object's methods keep the same signature
- Direct `log()` calls were internal-only and are being migrated
- No database or configuration changes needed
- No version migration required

## References

- Research document: `planning/2025-12-16-object-logging-fix/research.md`
- Logger implementation: `server/log.ts:3-18`
- Bree integration: `server/scheduler-bree.ts:24-25`
- Bree library code: `node_modules/bree/src/index.js:423`
