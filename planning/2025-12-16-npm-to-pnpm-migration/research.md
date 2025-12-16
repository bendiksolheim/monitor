---
date: 2025-12-16T21:16:46+0000
researcher: Claude Sonnet 4.5
git_commit: e7c29c2ffda8c5d50cbfa15c6b12388ee9d01d9b
branch: rework-configuration
repository: monitor
topic: "Migration from npm to pnpm"
tags: [research, codebase, package-manager, npm, pnpm, migration, docker, ci-cd]
status: complete
last_updated: 2025-12-16
last_updated_by: Claude Sonnet 4.5
---

# Research: Migration from npm to pnpm

**Date**: 2025-12-16T21:16:46+0000
**Researcher**: Claude Sonnet 4.5
**Git Commit**: e7c29c2ffda8c5d50cbfa15c6b12388ee9d01d9b
**Branch**: rework-configuration
**Repository**: monitor

## Research Question
What is needed to migrate this codebase from npm to pnpm as the package manager?

## Summary
The monitor project currently uses npm as its package manager with a clean, minimal configuration. The migration to pnpm will require changes across:

1. **Lock file replacement**: Replace `package-lock.json` with `pnpm-lock.yaml`
2. **Docker configuration**: Update Dockerfile to use pnpm commands
3. **CI/CD workflows**: Update GitHub Actions to install and use pnpm
4. **Documentation**: Update 9 markdown files that reference npm commands
5. **No .npmrc file exists**: No custom npm configuration to migrate

The project uses npm primarily through:
- Dockerfile (4 npm commands)
- GitHub Actions (2 workflows)
- package.json scripts (12 scripts)
- Documentation (9 markdown files)

## Detailed Findings

### 1. Package Configuration

**File**: `/Users/bendik/dev/monitor/package.json`

**Current Setup:**
- Package manager: npm (implicit)
- Lock file: `package-lock.json` (v3 format, npm 7+)
- Type: ES modules (`"type": "module"`)
- Version: 3.3.0
- Dependencies: 8 production, 9 dev dependencies
- No `engines` field (no version constraints)
- No `.npmrc` file (uses default npm settings)

**Scripts that will work with pnpm as-is:**
```json
{
  "build": "next build && tsc ...",
  "start": "npm run migrate && npm run start:server",  // ⚠️ Contains npm run
  "start:server": "cross-env NODE_ENV=production node .next/server-nextjs.js",
  "migrate": "prisma migrate deploy",
  "dev": "cross-env NODE_ENV=development tsx ./server-nextjs.ts",
  "format": "prettier --write .",
  "docker:build": "docker image build . -t ...",
  "docker:push": "docker push ...",
  "create-config": "mkdir -p config && cp config.example.json config/config.json",
  "generate-test-data": "cross-env NODE_ENV=development npx tsx test/generate-test-data.ts",
  "check-updates": "npx npm-check-updates",
  "update-all": "npx npm-check-updates -u",
  "test": "vitest run"
}
```

**⚠️ Script requiring update:**
- `start` script uses `npm run migrate` - should be updated to `pnpm run migrate` or use `$npm_execpath run migrate` for compatibility

### 2. Docker Configuration

**File**: `/Users/bendik/dev/monitor/Dockerfile`

**Current npm usage:**
```dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./                    # Line 4: ⚠️ Needs update for pnpm
RUN npm clean-install                    # Line 5: ⚠️ Change to pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate                  # Line 9: ⚠️ Change to pnpm exec prisma generate
RUN npm run build                        # Line 10: ⚠️ Change to pnpm run build
CMD ["npm", "run", "start"]              # Line 11: ⚠️ Change to pnpm run start
```

**Required changes for pnpm:**
1. Install pnpm in the Docker image
2. Copy `pnpm-lock.yaml` instead of `package-lock.json`
3. Replace `npm clean-install` with `pnpm install --frozen-lockfile`
4. Replace `npx` with `pnpm exec` or `pnpm dlx`
5. Replace `npm run` with `pnpm run`

**Recommended Dockerfile pattern:**
```dockerfile
FROM node:20

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application
COPY . .

# Generate Prisma client and build
RUN pnpm exec prisma generate
RUN pnpm run build

CMD ["pnpm", "run", "start"]
```

**File**: `/Users/bendik/dev/monitor/.dockerignore`

**Current configuration:** Already excludes `node_modules` - no changes needed

### 3. CI/CD Configuration

#### GitHub Actions CI Workflow
**File**: `/Users/bendik/dev/monitor/.github/workflows/ci.yml`

**Current setup:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "npm"                          # ⚠️ Change to "pnpm"

- name: Clean install dependencies
  run: npm clean-install                  # ⚠️ Change to pnpm install --frozen-lockfile

- name: Build
  run: npm run build                      # ⚠️ Change to pnpm run build

- name: Test
  run: npm run test                       # ⚠️ Change to pnpm run test
```

**Required changes:**
1. Install pnpm before setup-node (use `pnpm/action-setup@v4`)
2. Change `cache: "npm"` to `cache: "pnpm"`
3. Replace all `npm` commands with `pnpm`

**Recommended pattern:**
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9  # or latest

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "pnpm"

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm run build

- name: Test
  run: pnpm run test
```

#### GitHub Actions Build and Publish Workflow
**File**: `/Users/bendik/dev/monitor/.github/workflows/build-and-publish.yml`

**Current setup:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "npm"                          # ⚠️ Change to "pnpm"

- name: Clean install dependencies
  run: npm clean-install                  # ⚠️ Change to pnpm install --frozen-lockfile

- name: Build
  run: npm run build                      # ⚠️ Change to pnpm run build
```

**Required changes:** Same as ci.yml workflow above

### 4. Documentation Updates

**Files requiring npm → pnpm command updates:**

1. **`/Users/bendik/dev/monitor/README.md`** - Main documentation
   - Development setup instructions (3 npm commands)

2. **`/Users/bendik/dev/monitor/planning/2025-12-16-color-coded-logging/plan.md`**
   - Installation: `npm install picocolors` → `pnpm add picocolors`
   - Build/dev commands (5 npm commands)

3. **`/Users/bendik/dev/monitor/planning/2025-12-16-color-coded-logging/research.md`**
   - Installation and package lookup commands (2 npm commands)

4. **`/Users/bendik/dev/monitor/planning/2025-12-13-remix-to-nextjs-migration/plan.md`**
   - Extensive npm usage (8+ npm commands)
   - Docker configuration examples

5. **`/Users/bendik/dev/monitor/planning/2025-12-13-remix-to-nextjs-migration/research.md`**
   - Docker and installation patterns

6. **`/Users/bendik/dev/monitor/planning/2025-12-16-notification-test-import-errors/plan.md`**
   - Test and build commands (2 npm commands)

7. **`/Users/bendik/dev/monitor/planning/2025-12-16-migration-completion-status/research.md`**
   - Build and Docker patterns (4 npm commands)

8. **`/Users/bendik/dev/monitor/planning/2025-12-16-object-logging-fix/plan.md`**
   - Development server command (1 npm command)

9. **`/Users/bendik/dev/monitor/.claude/commands/plan.md`**
   - Example commands documentation (3 npm commands)

**Common replacements needed:**
- `npm install <package>` → `pnpm add <package>`
- `npm clean-install` → `pnpm install --frozen-lockfile`
- `npm run <script>` → `pnpm run <script>` or `pnpm <script>`
- `npx <command>` → `pnpm exec <command>` or `pnpm dlx <command>`
- `npm view <package>` → `pnpm view <package>`
- `npm test` → `pnpm test`

### 5. NPM-Specific Configuration

**No custom npm configuration found:**
- No `.npmrc` file exists
- No `publishConfig` in package.json
- No `engines` field in package.json
- Node version managed via GitHub Actions (20) and Docker (node:20)

**pnpm configuration considerations:**
- May want to create `.npmrc` or `pnpm-workspace.yaml` if needed
- pnpm uses strict peer dependencies by default (may need `strict-peer-dependencies=false` if issues arise)
- pnpm uses content-addressable storage (saves disk space)

### 6. Lock File

**Current**: `/Users/bendik/dev/monitor/package-lock.json`
- Format: npm v3 (lockfileVersion 3)
- Size: 131KB

**After migration**: Will be replaced with `pnpm-lock.yaml`
- Format: YAML
- Different structure and resolution algorithm
- May result in different dependency tree

## Code References

**Critical files requiring updates:**

| File | Lines | Changes Needed |
|------|-------|----------------|
| `Dockerfile` | 4, 5, 9, 10, 11 | Install pnpm, update all commands |
| `.github/workflows/ci.yml` | 22-23, 30, 33, 36 | Add pnpm setup, change cache, update commands |
| `.github/workflows/build-and-publish.yml` | 17-18, 25, 28 | Add pnpm setup, change cache, update commands |
| `package.json` | 9 | Update `start` script to use pnpm or be package-manager agnostic |
| `README.md` | - | Update development instructions |
| Various planning/*.md | - | Update for historical accuracy (optional) |

## Architecture Insights

**Current npm setup characteristics:**
1. **Minimal configuration**: No custom .npmrc, using defaults
2. **Lock file discipline**: Uses `npm clean-install` everywhere (good practice)
3. **CI/CD integration**: Leverages GitHub Actions npm cache
4. **Docker optimization**: Layer caching with package files copied first
5. **Node version consistency**: Fixed at Node 20 across all environments

**pnpm advantages for this project:**
1. **Faster installs**: Content-addressable storage reduces redundancy
2. **Disk space savings**: Symlinked dependencies save space
3. **Strict dependency management**: Helps catch phantom dependencies
4. **Monorepo ready**: If project grows to workspace structure

**pnpm considerations:**
1. **Symlink compatibility**: Some tools may not handle symlinks (unlikely with this stack)
2. **Docker layer caching**: Still effective with pnpm
3. **Migration effort**: Straightforward due to minimal npm customization

## Migration Checklist

### Prerequisites
1. ✅ No .npmrc file to migrate
2. ✅ No custom npm configuration in package.json
3. ✅ Standard dependencies (no npm-specific packages)
4. ✅ Clean npm practices (using clean-install)

### Required Changes

**Core files:**
- [ ] Delete `package-lock.json`
- [ ] Run `pnpm import` (imports from package-lock.json) OR run `pnpm install` (clean install)
- [ ] Commit `pnpm-lock.yaml`
- [ ] Update `package.json` "start" script (line 9)

**Docker:**
- [ ] Update `Dockerfile` to install pnpm
- [ ] Update `Dockerfile` COPY command (line 4)
- [ ] Replace npm commands with pnpm (lines 5, 9, 10, 11)

**CI/CD:**
- [ ] Update `.github/workflows/ci.yml` - add pnpm setup, change cache, update commands
- [ ] Update `.github/workflows/build-and-publish.yml` - add pnpm setup, change cache, update commands

**Documentation:**
- [ ] Update `README.md` - development setup instructions
- [ ] Optionally update planning/*.md files for historical accuracy

**Testing:**
- [ ] Test local development: `pnpm install && pnpm run dev`
- [ ] Test build: `pnpm run build`
- [ ] Test tests: `pnpm test`
- [ ] Test Docker build: `docker build .`
- [ ] Test CI/CD workflows (push to branch)

### Optional Enhancements
- [ ] Add `packageManager` field to package.json (e.g., `"packageManager": "pnpm@9.0.0"`)
- [ ] Add `.npmrc` if custom pnpm configuration needed
- [ ] Consider workspace setup if planning monorepo structure
- [ ] Add pnpm-specific scripts (e.g., `pnpm prune` in CI)

## Historical Context (from planning/)

No previous research or plans found regarding package manager migration. This is the first documented exploration of moving from npm to pnpm.

## Related Research

None found in the planning/ directory.

## Open Questions

1. **pnpm version**: Which version should be pinned? (Latest stable is 9.x)
2. **Corepack vs manual install**: Use Node's built-in corepack or install pnpm separately?
3. **Package manager field**: Should we add `"packageManager": "pnpm@x.x.x"` to package.json?
4. **Strict peer dependencies**: Should we disable strict peer deps if conflicts arise?
5. **Workspace setup**: Is there any plan to migrate to monorepo structure in the future?
6. **Documentation updates**: Should planning/*.md files be updated or left as historical records?
7. **Migration timing**: Should this be done on a separate branch or on the current `rework-configuration` branch?

## Recommendations

**Migration Strategy:**
1. **Start with local development**: Test pnpm locally first
2. **Separate branch**: Create a dedicated migration branch from `rework-configuration`
3. **Incremental approach**:
   - Day 1: Update package.json, lock file, local development
   - Day 2: Update Dockerfile, test Docker build
   - Day 3: Update CI/CD, test workflows
   - Day 4: Update documentation
4. **Use `pnpm import`**: Migrate from package-lock.json to preserve resolutions
5. **Pin pnpm version**: Use `packageManager` field for reproducibility
6. **Use corepack**: Leverage Node's built-in corepack for pnpm installation

**Recommended pnpm configuration (.npmrc):**
```ini
# Ensures reproducible builds
frozen-lockfile=true

# May be needed if peer dependency issues arise
strict-peer-dependencies=false

# Use same registry as npm (default)
registry=https://registry.npmjs.org/
```

**Testing priority:**
1. Local development workflow (`pnpm install`, `pnpm dev`)
2. Docker build and run
3. CI/CD workflows
4. Production deployment

This migration is **low-risk** due to the project's minimal npm configuration and clean dependency management practices.
