---
date: 2025-12-16T00:00:00+01:00
researcher: Claude Sonnet 4.5
git_commit: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
branch: rework-configuration
repository: bendiksolheim/monitor
topic: "Color-Coded Log Levels: Library vs DIY Comparison"
tags: [research, codebase, logging, terminal-colors, dependencies]
status: complete
last_updated: 2025-12-16
last_updated_by: Claude Sonnet 4.5
---

# Research: Color-Coded Log Levels: Library vs DIY Comparison

**Date**: 2025-12-16T00:00:00+01:00
**Researcher**: Claude Sonnet 4.5
**Git Commit**: 5d6972df63d3aef22747eaeb757492f5d1aea3f5
**Branch**: rework-configuration
**Repository**: bendiksolheim/monitor

## Research Question

How should color-coded log levels be implemented in the custom logging system at `server/log.ts`? Compare lightweight libraries versus DIY ANSI escape code implementation.

## Summary

The custom logger in `server/log.ts` currently outputs plain text logs with timestamps and level prefixes. To add color coding, there are two viable approaches:

1. **DIY ANSI Escape Codes** - Zero dependencies, ~10 lines of code, perfect control
2. **Lightweight Libraries** - Minimal footprint (6-44KB), battle-tested, richer features

**Recommendation**: Use **picocolors** (6.3KB, fastest) or **DIY ANSI codes** (0KB) depending on whether you value minimal dependencies over convenience and future extensibility.

## Current Implementation Analysis

### Logger Structure (`server/log.ts`)

The logger exports four methods (`debug`, `info`, `warn`, `error`) that format messages with ISO timestamps and write to stdout/stderr:

```typescript
export function log(level: LogLevel, ...args: any[]) {
  const now = new Date();
  const serialized = args.map(serializeArg).join(", ");
  const message = `[${now.toISOString()}] [${level.toUpperCase()}] ${serialized}\n`;
  if (level === "error") {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
}
```

**Reference**: `server/log.ts:16-25`

### Usage Statistics

Logger is used across **6 files** with **20 total invocations**:

| Log Level | Usage Count | Primary Use Cases |
|-----------|-------------|-------------------|
| `info` | 11 | Operational milestones (server start, job completion) |
| `error` | 6 | Error handling in catch blocks |
| `warn` | 2 | HTTP 404 responses |
| `debug` | 1 | Console.debug interception |

**Key Usage Locations**:
- `server-nextjs.ts:23,27,51,53,55,68` - Server lifecycle & HTTP logging (6 calls)
- `server/jobs/ntfy.ts:28,45,57,64` - Notification worker (4 calls)
- `server/scheduler-bree.ts:78,81,86` - Job scheduler (3 calls, including Bree integration)
- `server/jobs/health-check.ts:15,34` - Health checks (2 calls)
- `server/jobs/heartbeat.ts:17,20,25` - Heartbeat pings (3 calls)
- `instrumentation.ts:9,13,17,21,25` - Console patching (5 calls)

**Pattern**: Template literals with context are preferred (`logger.info(\`Checking ${service}\`)`)

### Current Dependencies

From `package.json`, the project has minimal dependencies with no existing color/styling library. Current unpacked size focus suggests preference for lightweight solutions.

## Detailed Findings

### Option 1: DIY ANSI Escape Codes

ANSI escape codes are terminal control sequences that have been standard since early UNIX. They're supported by all modern terminals and require zero dependencies.

#### Implementation

```typescript
// Color codes for each log level
const colors = {
  debug: '\x1b[36m',    // Cyan
  info: '\x1b[32m',     // Green
  warn: '\x1b[33m',     // Yellow
  error: '\x1b[31m',    // Red
  reset: '\x1b[0m',     // Reset to default
};

export function log(level: LogLevel, ...args: any[]) {
  const now = new Date();
  const serialized = args.map(serializeArg).join(", ");
  const colorCode = colors[level];
  const message = `${colorCode}[${now.toISOString()}] [${level.toUpperCase()}]${colors.reset} ${serialized}\n`;
  if (level === "error") {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
}
```

#### ANSI Code Reference

Common color codes:
- Foreground colors: 30-37 (black, red, green, yellow, blue, magenta, cyan, white)
- Background colors: 40-47
- Bright variants: 90-97 (foreground), 100-107 (background)
- Styles: 1 (bold), 2 (dim), 4 (underline)
- Reset: 0

**Pattern**: `\x1b[<code>m` where `\x1b` is the escape character

#### Pros
- ✅ Zero dependencies
- ✅ Minimal code (~10 lines)
- ✅ Complete control over implementation
- ✅ No bundle size impact
- ✅ Instant to implement
- ✅ Easy to understand and maintain

#### Cons
- ❌ No automatic NO_COLOR/FORCE_COLOR environment variable support
- ❌ No terminal capability detection
- ❌ Manual handling of Windows compatibility (pre-Windows 10)
- ❌ Limited to basic colors without significant code additions
- ❌ Need to handle edge cases yourself

#### Best For
- Projects with zero-dependency philosophy
- Simple color needs (just log levels)
- Teams comfortable with ANSI codes
- When bundle size is critical

### Option 2: Lightweight Libraries

Multiple libraries provide terminal coloring with minimal overhead. Here's a comprehensive comparison:

#### Library Comparison Table

| Library | Version | Size | Performance | Dependencies | Notable Features |
|---------|---------|------|-------------|--------------|------------------|
| **picocolors** | 1.1.1 | 6.3KB | Fastest | 0 | Tiniest, ESM/CJS, auto NO_COLOR |
| **colorette** | 2.0.20 | 17KB | Fast | 0 | Zero deps, lightweight |
| **kleur** | 4.1.5 | 20KB | Fastest claim | 0 | Chainable API, no deps |
| **chalk** | 5.6.2 | 44KB | Moderate | 0 | Most popular, rich API, ESM-only v5 |

**Data Source**: npm package metadata via `npm view <package>`

#### Recommended: picocolors

**Why picocolors**:
- Smallest footprint (6.3KB unpacked)
- Described as "tiniest and fastest" by maintainers
- Zero dependencies
- Automatic NO_COLOR/FORCE_COLOR/TERM support
- ESM and CJS compatible
- Used by major projects (Vite, PostCSS)

**Implementation Example**:
```typescript
import pc from 'picocolors';

const levelColors = {
  debug: pc.cyan,
  info: pc.green,
  warn: pc.yellow,
  error: pc.red,
};

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

**Installation**: `npm install picocolors`

#### Alternative: chalk (if richer features needed)

Chalk is the most popular option with extensive styling capabilities:
- Template literal syntax: `chalk.red.bold('Error')`
- RGB and hex color support
- Nested styles
- 256/Truecolor support

**Trade-off**: 7x larger than picocolors (44KB vs 6.3KB)

**Note**: Chalk v5+ is ESM-only. Your project uses `"type": "module"` so this is compatible.

#### Pros (All Libraries)
- ✅ Battle-tested in production
- ✅ Automatic terminal capability detection
- ✅ Environment variable support (NO_COLOR, etc.)
- ✅ TypeScript types included
- ✅ Cross-platform (Windows/Unix)
- ✅ Future extensibility (more colors, styles)

#### Cons
- ❌ Adds a dependency (though tiny)
- ❌ Slight bundle size increase
- ❌ External code to trust/maintain

#### Best For
- Projects valuing convenience over minimalism
- When you want automatic NO_COLOR support
- If you might add more styling later (bold, dim, etc.)
- Cross-platform robustness requirements

## Code References

- `server/log.ts:1-32` - Complete logger implementation
- `server-nextjs.ts:51` - Error level usage example
- `server-nextjs.ts:53` - Warn level usage example
- `server-nextjs.ts:55` - Info level usage example
- `server/jobs/ntfy.ts:64` - Error handling pattern
- `server/scheduler-bree.ts:78` - Logger passed to Bree library
- `instrumentation.ts:9-26` - Console patching integration

## Architecture Insights

### Design Patterns Observed

1. **Dependency Philosophy**: The project has minimal dependencies (11 production packages), suggesting preference for lightweight solutions

2. **Direct Write Pattern**: Using `process.stdout.write()` and `process.stderr.write()` directly rather than `console.log()` gives fine-grained control

3. **Serialization Strategy**: Custom `serializeArg()` function handles all types, including circular references

4. **Library Integration**: The Bree scheduler accepts the logger object directly (`logger: logger`), meaning any changes must maintain the same interface

5. **Console Interception**: `instrumentation.ts` patches all console methods to route through the logger, ensuring consistent formatting across the entire application including Next.js internals

### Constraints for Implementation

1. **Interface Stability**: Must maintain the same exported API:
   ```typescript
   logger.{debug|info|warn|error}(message: string, ...args: any[])
   ```

2. **Bree Compatibility**: The logger object is passed to Bree, so the interface must remain compatible

3. **Performance**: Uses `process.stdout.write()` for synchronous writes, no buffering delays

4. **Formatting**: Existing format `[timestamp] [LEVEL] message` should be preserved, with colors added to the level prefix or timestamp

## Implementation Recommendations

### Approach 1: Minimal DIY (Recommended if zero-dependency is priority)

```typescript
// Add at top of server/log.ts
const colors = {
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  reset: '\x1b[0m',
} as const;

// Modify the log function:
export function log(level: LogLevel, ...args: any[]) {
  const now = new Date();
  const serialized = args.map(serializeArg).join(", ");
  const colorCode = colors[level];
  const reset = colors.reset;
  const message = `${colorCode}[${now.toISOString()}] [${level.toUpperCase()}]${reset} ${serialized}\n`;
  if (level === "error") {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
}
```

**Impact**:
- 0 bytes added to bundle
- 5 lines of code added
- No external dependencies
- Works in all modern terminals

**Limitation**: No automatic NO_COLOR support (would need to check `process.env.NO_COLOR`)

### Approach 2: Picocolors (Recommended if convenience is priority)

```bash
npm install picocolors
```

```typescript
// At top of server/log.ts
import pc from 'picocolors';

const levelColors = {
  debug: pc.cyan,
  info: pc.green,
  warn: pc.yellow,
  error: pc.red,
} as const;

// Modify the log function:
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

**Impact**:
- 6.3KB added to bundle
- 1 new dependency (with 0 transitive deps)
- Automatic NO_COLOR/FORCE_COLOR support
- Terminal capability detection included

**Advantage**: Production-ready edge case handling

### Approach 3: Enhanced DIY with Environment Support

If you want zero dependencies but with proper NO_COLOR support:

```typescript
const shouldUseColor =
  !process.env.NO_COLOR &&
  (process.env.FORCE_COLOR || process.stdout.isTTY);

const colors = shouldUseColor ? {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
} : {
  debug: '',
  info: '',
  warn: '',
  error: '',
  reset: '',
};

// Rest same as Approach 1
```

**Impact**:
- 0 bytes to bundle
- ~8 lines of code
- Respects NO_COLOR standard
- Detects TTY for color support

## Open Questions

1. **Color Scheme Preference**: Should timestamps also be colored, or only the log level?
   - Option A: Color entire prefix `[timestamp] [LEVEL]`
   - Option B: Color only `[LEVEL]`
   - Option C: Timestamp in dim/gray, level in bright color

2. **Stderr Coloring**: Should stderr output (errors) also be colored, or left plain for parsing?
   - Consider: Some log aggregators strip ANSI codes automatically
   - Current behavior: Errors go to stderr, others to stdout

3. **Future Styling**: Are there plans to add bold, dim, or underline styles?
   - If yes: Library makes sense
   - If no: DIY sufficient

4. **Testing/CI**: Should colors be disabled in CI environments?
   - picocolors handles this automatically via `CI` env var
   - DIY would need: `!process.env.CI` check

## Sources

- [Using ANSI escape codes in nodejs | Dustin John Pfister](https://dustinpfister.github.io/2019/09/19/nodejs-ansi-escape-codes/)
- [Using console colors with Node.js - LogRocket Blog](https://blog.logrocket.com/using-console-colors-node-js/)
- [Using Console Colors with Node.js: A Complete Guide - Medium](https://medium.com/@dulthiwanka2015/using-console-colors-with-node-js-a-complete-guide-for-cleaner-smarter-terminal-output-856f7781fc05)
- [ansi-colors - npm](https://www.npmjs.com/package/ansi-colors)
- [How to Change NodeJS console Font Color? - GeeksforGeeks](https://www.geeksforgeeks.org/node-js/how-to-set-node-js-console-font-color/)
- [ansicolor - npm](https://www.npmjs.com/package/ansicolor)
- [GitHub - myrotvorets/ansi-color](https://github.com/myrotvorets/ansi-color)
- [Using Console Colors with Node.js - DEV Community](https://dev.to/dthiwanka/using-console-colors-with-nodejs-a-complete-guide-for-cleaner-smarter-terminal-output-a7k)
- [GitHub - chalk/ansi-styles](https://github.com/chalk/ansi-styles)
- [ANSI Colors in Node.JS - GitHub Gist](https://gist.github.com/pinksynth/209937bd424edb2bd21f7c8bf756befd)
