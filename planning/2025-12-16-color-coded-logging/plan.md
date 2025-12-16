---
date: 2025-12-16T00:00:00+01:00
author: Claude Sonnet 4.5
git_commit: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
branch: rework-configuration
repository: bendiksolheim/monitor
topic: "Add Color-Coded Log Levels with Picocolors"
tags: [implementation, logging, terminal-colors, picocolors]
status: ready
last_updated: 2025-12-16
last_updated_by: Claude Sonnet 4.5
related_research: planning/2025-12-16-color-coded-logging/research.md
---

# Color-Coded Log Levels Implementation Plan

## Overview

Add color coding to the custom logger at `server/log.ts` using the picocolors library. This will make log levels visually distinct in terminal output while maintaining zero transitive dependencies and automatic NO_COLOR/FORCE_COLOR support.

## Current State Analysis

The logger currently outputs plain text logs with ISO timestamps and uppercase log level prefixes:
- Format: `[2025-12-16T10:30:45.123Z] [INFO] message`
- Used across 6 files with 20 total invocations
- Outputs to stdout (debug/info/warn) and stderr (error)
- Custom serialization handles all types including circular references
- Logger object is passed to Bree scheduler, requiring interface stability

**Key Constraint**: Must maintain the existing API and format while adding colors only to the timestamp and log level prefix.

## Desired End State

Log output with color-coded prefixes based on severity:
- DEBUG: Cyan prefix
- INFO: Green prefix
- WARN: Yellow prefix
- ERROR: Red prefix

### Verification:
Run the development server and observe colored log output in the terminal:
```bash
npm run dev
```

Expected output format:
```
[cyan][2025-12-16T10:30:45.123Z] [DEBUG][reset] Starting health check
[green][2025-12-16T10:30:45.456Z] [INFO][reset] Server listening on port 3000
[yellow][2025-12-16T10:30:45.789Z] [WARN][reset] Endpoint not found
[red][2025-12-16T10:30:46.012Z] [ERROR][reset] Failed to connect to service
```

## What We're NOT Doing

- Not changing the logger API or function signatures
- Not adding bold, dim, underline, or other text styles (just colors)
- Not coloring the message content itself (only timestamp/level prefix)
- Not adding background colors
- Not implementing custom TTY detection (picocolors handles this)
- Not adding configuration options for color schemes
- Not changing stdout/stderr routing behavior
- Not modifying the serialization logic

## Implementation Approach

Single-phase implementation:
1. Install picocolors as a production dependency
2. Import picocolors in `server/log.ts`
3. Create a color mapping for each log level
4. Wrap the timestamp and level prefix with the appropriate color function
5. Maintain existing message format and stdout/stderr routing

This approach was chosen over DIY ANSI codes because:
- Adds only 6.3KB with zero transitive dependencies
- Provides automatic NO_COLOR, FORCE_COLOR, and CI environment variable support
- Handles terminal capability detection
- Battle-tested in production (used by Vite, PostCSS)
- Future-proof for potential styling extensions

## Phase 1: Add Picocolors Color Coding

### Overview
Install picocolors and modify the log function to colorize the timestamp and log level prefix while preserving the exact output format and behavior.

### Changes Required:

#### 1. Package Dependencies
**File**: `package.json`
**Changes**: Add picocolors to production dependencies

```bash
npm install picocolors
```

Expected change in package.json:
```json
"dependencies": {
  "@mantine/core": "^7.9.1",
  "@mantine/hooks": "^7.9.1",
  "@prisma/client": "^5.13.0",
  "@tabler/icons-react": "^3.3.0",
  "bree": "^9.2.3",
  "cross-env": "^7.0.3",
  "next": "^15.1.0",
  "picocolors": "^1.1.1",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "zod": "^3.23.8",
  "zod-validation-error": "^3.2.0"
}
```

#### 2. Logger Implementation
**File**: `server/log.ts`
**Changes**: Import picocolors and add color mapping to the log function

Add import at the top:
```typescript
import pc from 'picocolors';
```

Add color mapping after the LogLevel type definition (after line 1):
```typescript
const levelColors = {
  debug: pc.cyan,
  info: pc.green,
  warn: pc.yellow,
  error: pc.red,
} as const;
```

Modify the log function (lines 16-25) to apply colors:
```typescript
export function log(level: LogLevel, ...args: any[]) {
  const now = new Date();
  const serialized = args.map(serializeArg).join(", ");
  const colorize = levelColors[level];
  const message = `${colorize(`[${now.toISOString()}] [${level.toUpperCase()}]`)} ${serialized}\n`;
  if (level === "error") {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
}
```

**Key change**: The template literal now wraps `[timestamp] [LEVEL]` with the colorize function, keeping the message content uncolored.

### Success Criteria:

#### Automated Verification:
- [x] picocolors installs successfully: `npm install picocolors`
- [x] TypeScript compilation succeeds: `npm run build`
- [x] No type errors in log.ts
- [x] Project builds without errors

#### Manual Verification:
- [ ] Run development server: `npm run dev`
- [ ] Verify DEBUG logs appear in cyan (check console.debug interception)
- [ ] Verify INFO logs appear in green (server start, job completion)
- [ ] Verify WARN logs appear in yellow (trigger 404 endpoint)
- [ ] Verify ERROR logs appear in red (trigger an error condition)
- [ ] Verify colors are disabled when NO_COLOR=1 is set: `NO_COLOR=1 npm run dev`
- [ ] Verify message content remains uncolored (only prefix is colored)
- [ ] Verify stderr routing still works for errors
- [ ] Verify stdout routing still works for debug/info/warn
- [ ] Verify Bree scheduler integration still works (check scheduled jobs run)

### Testing Strategy

#### Manual Testing Steps:
1. **Start development server**:
   ```bash
   npm run dev
   ```
   Expected: Green INFO log for "Server listening on port..."

2. **Trigger 404 warning**:
   ```bash
   curl http://localhost:3000/nonexistent-endpoint
   ```
   Expected: Yellow WARN log in terminal

3. **Check scheduled jobs**:
   Wait for health check or heartbeat job to run
   Expected: Colored logs from job execution (green for success, red for errors)

4. **Test NO_COLOR environment variable**:
   ```bash
   NO_COLOR=1 npm run dev
   ```
   Expected: Plain text logs without colors

5. **Test piped output** (colors should auto-disable):
   ```bash
   npm run dev 2>&1 | cat
   ```
   Expected: Plain text logs without ANSI codes

#### No Unit Tests Required:
The change is purely cosmetic to output formatting. Existing integration tests will continue to work as the logger API remains unchanged.

## Performance Considerations

- Picocolors is designed to be the fastest color library (6.3KB unpacked size)
- Color function calls add negligible overhead (~nanoseconds per log call)
- No impact on serialization or I/O performance
- NO_COLOR detection happens once at startup, not per log call

## Migration Notes

No migration required:
- Existing logs will automatically gain colors
- No configuration changes needed
- No data format changes
- Backward compatible with existing logger consumers

## Environment Variable Support

Picocolors automatically respects:
- `NO_COLOR=1` - Disables all colors
- `FORCE_COLOR=1` - Forces colors even in non-TTY environments
- `CI=true` - Disables colors in CI environments
- `TERM=dumb` - Disables colors for dumb terminals

## References

- Related research: `planning/2025-12-16-color-coded-logging/research.md`
- Current logger implementation: `server/log.ts:16-25`
- Logger usage patterns: `server-nextjs.ts`, `server/jobs/*.ts`, `server/scheduler-bree.ts`
- Picocolors documentation: https://www.npmjs.com/package/picocolors
