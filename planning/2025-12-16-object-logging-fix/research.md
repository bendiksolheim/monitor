---
date: 2025-12-16T00:00:00Z
researcher: Claude Sonnet 4.5
git_commit: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
branch: rework-configuration
repository: monitor
topic: "Object Logging Bug - [object Object] in Logs"
tags: [research, codebase, logging, bree, scheduler]
status: complete
last_updated: 2025-12-16
last_updated_by: Claude Sonnet 4.5
---

# Research: Object Logging Bug - [object Object] in Logs

**Date**: 2025-12-16T00:00:00Z
**Researcher**: Claude Sonnet 4.5
**Git Commit**: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
**Branch**: rework-configuration
**Repository**: monitor

## Research Question

When watching the app logs, the following log line appears:
```
[2025-12-15T21:12:27.041Z] [INFO] Worker for job "health-Monitor" signaled completion, [object Object]
```

What causes the `[object Object]` output in the custom logging system (server/log.ts), and how should it be fixed?

## Summary

The `[object Object]` issue occurs because the **Bree job scheduler library** passes an object as a second argument to `logger.info()`, but the custom logger implementation in `server/log.ts` doesn't properly serialize objects - it simply uses `.join(", ")` on all arguments, which converts objects to the string `"[object Object]"`.

**Root Cause**: In `server/log.ts:10-17`, the logger methods use:
```typescript
log([message, ...args].join(", "), level)
```

When JavaScript's `.join()` method encounters an object, it calls `toString()` on it, which returns `"[object Object]"` for plain objects.

**Fix**: Serialize non-string arguments to JSON before joining them.

## Detailed Findings

### 1. Where the Log Message Originates

**Location**: `node_modules/bree/src/index.js:423`

**Code**:
```javascript
this.config.logger.info(`${prefix} signaled completion`, metadata);
```

The Bree scheduler library (v9.2.3) is calling the logger with:
1. **First argument (message)**: A string like `"Worker for job \"health-Monitor\" signaled completion"`
2. **Second argument (metadata)**: An object returned from `getWorkerMetadata(name, { message })`

**Metadata Object Structure**:
```typescript
{
  name: string,           // job name (e.g., "health-Monitor")
  message?: string,       // worker message ("done" or "error")
  err?: Error,           // error object (if applicable)
  worker?: {             // if outputWorkerMetadata is enabled
    isMainThread: boolean,
    resourceLimits: object,
    threadId: number
  }
}
```

### 2. Logger Implementation Analysis

**File**: `server/log.ts`

The logger has four methods (debug, info, warn, error) that all follow this pattern:

```typescript
debug: (message: string, ...args: any[]) =>
  log([message, ...args].join(", "), "debug")
```

**Problem**: When `args` contains objects, `.join(", ")` converts them to `"[object Object]"`.

### 3. Logger Usage Patterns in Codebase

All logger calls in the application's own code pass only strings:

**Examples**:
- `instrumentation.ts`: Wraps console methods, converts first arg to string
- `server-nextjs.ts`: Uses template literals to build strings before logging
- `server/scheduler-bree.ts`: Uses template literals: `` logger.error(`Job error in ${workerMetadata.name}: ${error.message}`) ``
- `server/jobs/health-check.ts`: Simple string messages
- `server/jobs/heartbeat.ts`: Simple string messages
- `server/jobs/ntfy.ts`: Simple string messages with template literals

**No objects are passed by application code** - the Bree library is the only source passing objects to the logger.

### 4. Bree Integration

**File**: `server/scheduler-bree.ts:24-25`

The logger is passed to Bree as a configuration option:

```typescript
const bree = new Bree({
  logger: logger,
  // ...
});
```

Bree uses this logger internally for various events, including job completion, and passes metadata objects as additional arguments.

## Code References

- `server/log.ts:10-17` - Logger method implementations with `.join()` issue
- `node_modules/bree/src/index.js:423` - Where Bree logs with metadata object
- `server/scheduler-bree.ts:24-25` - Logger passed to Bree configuration
- `server/jobs/health-check.ts:32,42` - Jobs send "done" or "error" messages
- `server/jobs/heartbeat.ts` - Similar job completion pattern
- `server/jobs/ntfy.ts` - Similar job completion pattern

## Architecture Insights

1. **Custom Logger Design**: The application uses a custom logger instead of console to ensure structured logging with timestamps and log levels, bypassing console entirely via `process.stdout.write()`.

2. **Bree Scheduler Integration**: The Bree job scheduler is configured to use the custom logger, which allows centralized logging but exposes the object serialization issue.

3. **Job Worker Pattern**: All jobs follow a consistent pattern of sending simple "done" or "error" messages via `parentPort.postMessage()`, with side effects (database writes) happening before the message is sent.

4. **Console Patching**: The `instrumentation.ts` file patches console methods to use the custom logger, preserving variadic arguments which could include objects from third-party libraries.

## Proposed Fix

Modify `server/log.ts` to serialize non-string arguments to JSON:

```typescript
export const logger = {
  debug: (message: string, ...args: any[]) =>
    log([message, ...args.map(serializeArg)].join(", "), "debug"),
  info: (message: string, ...args: any[]) =>
    log([message, ...args.map(serializeArg)].join(", "), "info"),
  warn: (message: string, ...args: any[]) =>
    log([message, ...args.map(serializeArg)].join(", "), "warn"),
  error: (message: string, ...args: any[]) =>
    log([message, ...args.map(serializeArg)].join(", "), "error"),
};

function serializeArg(arg: any): string {
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  try {
    return JSON.stringify(arg);
  } catch (err) {
    return String(arg);
  }
}
```

**Alternative approach**: Accept that Bree passes objects and handle them specifically:

```typescript
export const logger = {
  info: (message: string, ...args: any[]) => {
    const serializedArgs = args.map(arg =>
      typeof arg === "object" ? JSON.stringify(arg) : String(arg)
    );
    log([message, ...serializedArgs].join(", "), "info");
  },
  // ... similar for other methods
};
```

## Expected Output After Fix

Instead of:
```
[2025-12-15T21:12:27.041Z] [INFO] Worker for job "health-Monitor" signaled completion, [object Object]
```

You'll see:
```
[2025-12-15T21:12:27.041Z] [INFO] Worker for job "health-Monitor" signaled completion, {"name":"health-Monitor","message":"done"}
```

This provides actual debugging information about what metadata Bree is passing.

## Open Questions

1. **Performance**: Should JSON.stringify be wrapped in a try-catch for circular references?
2. **Formatting**: Should objects be pretty-printed with indentation, or kept compact?
3. **Truncation**: Should very large objects be truncated to prevent log bloat?
4. **Error Objects**: Should Error objects be specially handled to preserve stack traces?
