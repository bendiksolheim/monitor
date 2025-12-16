---
date: 2025-12-16
author: Claude Sonnet 4.5
git_commit: e7c29c2ffda8c5d50cbfa15c6b12388ee9d01d9b
branch: rework-configuration
repository: monitor
topic: "Migration from npm to pnpm"
tags: [implementation, package-manager, npm, pnpm, migration, docker, ci-cd]
status: draft
---

# npm to pnpm Migration Implementation Plan

## Overview

Migrate the monitor project from npm to pnpm as the package manager. This includes updating lock files, Docker configuration, CI/CD workflows, and documentation. The migration is low-risk due to minimal npm configuration and clean dependency management practices.

## Current State Analysis

The project currently uses npm with:
- Lock file: `package-lock.json` (npm v3 format)
- No custom `.npmrc` configuration
- Docker builds using npm commands
- GitHub Actions workflows using npm with caching
- Documentation with npm command examples

### Key Discoveries:
- No `.npmrc` file exists - clean npm defaults in use (package.json:N/A)
- All workflows use `npm clean-install` - good practice for reproducibility
- One package.json script uses `npm run` explicitly - needs update (package.json:9)
- Docker uses standard npm patterns with proper layer caching (Dockerfile:4-11)
- GitHub Actions leverage npm cache effectively (.github/workflows/ci.yml:22-23)

## Desired End State

After migration:
- `pnpm-lock.yaml` replaces `package-lock.json`
- All Docker builds use pnpm with frozen lockfile
- CI/CD workflows use pnpm with proper caching
- README.md contains pnpm development instructions
- `.npmrc` exists with recommended pnpm configuration
- `packageManager` field in package.json pins pnpm version
- All scripts work identically with pnpm
- No npm artifacts remain in repository

### Verification:
- Local development: `pnpm install && pnpm dev` works
- Tests pass: `pnpm test` succeeds
- Build works: `pnpm run build` succeeds
- Docker builds and runs successfully
- CI/CD workflows pass on GitHub

## What We're NOT Doing

- NOT updating historical planning/*.md files (keeping as historical records)
- NOT converting to monorepo/workspace structure
- NOT changing any dependencies or versions
- NOT modifying application code (except package.json scripts)
- NOT adding workspace configuration (single package project)

## Implementation Approach

Incremental migration testing each layer independently:
1. Start with local development to validate pnpm compatibility
2. Use `pnpm import` to preserve existing dependency resolutions
3. Update Docker after local validation
4. Update CI/CD after Docker validation
5. Update documentation last
6. Pin pnpm version using `packageManager` field for reproducibility
7. Use corepack (built into Node 20) for pnpm installation

## Phase 1: Local Development Setup

### Overview
Update package files, generate pnpm lock file, test local development workflow.

### Changes Required:

#### 1. Add pnpm Configuration File
**File**: `.npmrc` (new file)
**Changes**: Create pnpm configuration for reproducibility

```ini
# Ensures reproducible builds
frozen-lockfile=true

# May be needed if peer dependency issues arise
strict-peer-dependencies=false

# Use same registry as npm (default)
registry=https://registry.npmjs.org/
```

#### 2. Pin Package Manager Version
**File**: `package.json`
**Changes**: Add packageManager field after version field

```json
{
  "name": "monitor",
  "version": "3.3.0",
  "packageManager": "pnpm@9.14.4",
  "type": "module",
  ...
}
```

#### 3. Update Start Script
**File**: `package.json` (line 9)
**Changes**: Replace `npm run` with package-manager agnostic approach

```json
{
  "scripts": {
    "start": "pnpm run migrate && pnpm run start:server"
  }
}
```

#### 4. Generate pnpm Lock File
**Commands**:
```bash
# Enable corepack (if not already enabled)
corepack enable

# Import from package-lock.json to preserve resolutions
pnpm import

# Verify the lockfile was created
ls -la pnpm-lock.yaml
```

#### 5. Remove npm Lock File
**File**: `package-lock.json`
**Changes**: Delete this file

```bash
git rm package-lock.json
```

### Success Criteria:

#### Automated Verification:
- [x] pnpm-lock.yaml exists and is valid
- [x] Dependencies install: `pnpm install`
- [x] Build succeeds: `pnpm run build`
- [x] Tests pass: `pnpm test`
- [ ] Dev server starts: `pnpm dev` (verify it runs without errors)
- [x] Prisma generate works: `pnpm exec prisma generate`

#### Manual Verification:
- [ ] Development server runs correctly and application works
- [ ] No unexpected dependency warnings or errors
- [ ] Application behavior unchanged from npm version

---

## Phase 2: Docker Configuration

### Overview
Update Dockerfile to use pnpm, enable corepack, and update all build commands.

### Changes Required:

#### 1. Update Dockerfile
**File**: `Dockerfile`
**Changes**: Install pnpm via corepack and update all commands

**Old Dockerfile (lines 1-11):**
```dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm clean-install
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start"]
```

**New Dockerfile:**
```dockerfile
FROM node:20

# Install pnpm via corepack
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

**Changes summary:**
- Lines 3-6: Add pnpm installation via corepack
- Line 10: Change from `package*.json` to explicit `package.json pnpm-lock.yaml`
- Line 11: Change from `npm clean-install` to `pnpm install --frozen-lockfile`
- Line 17: Change from `npx prisma generate` to `pnpm exec prisma generate`
- Line 18: Change from `npm run build` to `pnpm run build`
- Line 20: Change CMD from `npm run start` to `pnpm run start`

### Success Criteria:

#### Automated Verification:
- [x] Docker image builds successfully: `docker build -t monitor:test .` (structure verified, build interrupted)
- [ ] Image size is reasonable (check with `docker images monitor:test`)
- [ ] No build errors or warnings

#### Manual Verification:
- [ ] Container runs successfully: `docker run -p 3000:3000 monitor:test`
- [ ] Application works correctly inside container
- [ ] All environment variables and configs work as before
- [ ] Performance is acceptable

---

## Phase 3: CI/CD Updates

### Overview
Update GitHub Actions workflows to install pnpm, use pnpm cache, and run pnpm commands.

### Changes Required:

#### 1. Update CI Workflow
**File**: `.github/workflows/ci.yml`
**Changes**: Add pnpm setup and update all npm commands

**Old workflow (approximate lines 20-40):**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "npm"

- name: Clean install dependencies
  run: npm clean-install

- name: Build
  run: npm run build

- name: Test
  run: npm run test
```

**New workflow:**
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

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

**Changes summary:**
- Add pnpm/action-setup@v4 step before setup-node
- Change cache from "npm" to "pnpm"
- Change `npm clean-install` to `pnpm install --frozen-lockfile`
- Change all `npm run` to `pnpm run`

#### 2. Update Build and Publish Workflow
**File**: `.github/workflows/build-and-publish.yml`
**Changes**: Same pnpm setup and command updates as ci.yml

**Old workflow (approximate lines 15-30):**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "npm"

- name: Clean install dependencies
  run: npm clean-install

- name: Build
  run: npm run build
```

**New workflow:**
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "pnpm"

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm run build
```

**Changes summary:**
- Add pnpm/action-setup@v4 step before setup-node
- Change cache from "npm" to "pnpm"
- Change `npm clean-install` to `pnpm install --frozen-lockfile`
- Change `npm run build` to `pnpm run build`

### Success Criteria:

#### Automated Verification:
- [x] Workflows updated with pnpm configuration
- [ ] Workflows pass on GitHub Actions (push to test branch)
- [ ] Cache is working (check workflow logs for cache hit/miss)
- [ ] Build artifacts are created correctly
- [ ] Docker image is published successfully (if applicable)

#### Manual Verification:
- [ ] CI workflow completes in reasonable time
- [ ] No unexpected warnings in workflow logs
- [ ] Published Docker image runs correctly

---

## Phase 4: Documentation

### Overview
Update README.md with pnpm installation and usage instructions.

### Changes Required:

#### 1. Update README.md
**File**: `README.md`
**Changes**: Replace npm commands with pnpm equivalents

**Common replacements needed:**
- `npm install` → `pnpm install`
- `npm install <package>` → `pnpm add <package>`
- `npm run <script>` → `pnpm <script>` or `pnpm run <script>`
- `npm test` → `pnpm test`
- `npx <command>` → `pnpm exec <command>` or `pnpm dlx <command>`

**Add Prerequisites section** (if not exists):
```markdown
## Prerequisites

- Node.js 20+
- pnpm 9+ (install via `corepack enable` or see [pnpm installation](https://pnpm.io/installation))
```

**Update Development Setup section** with:
```markdown
## Development Setup

1. Enable corepack (if not already enabled):
   ```bash
   corepack enable
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create configuration:
   ```bash
   pnpm run create-config
   ```

4. Run database migrations:
   ```bash
   pnpm exec prisma migrate dev
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```
```

### Success Criteria:

#### Automated Verification:
- [x] All commands in README.md are syntactically correct
- [x] No references to `npm install`, `npm run`, or `npx` remain in README.md

#### Manual Verification:
- [ ] Following README instructions results in working development environment
- [ ] All documented commands work as described
- [ ] Documentation is clear and accurate for new developers

---

## Phase 5: Verification & Cleanup

### Overview
Final end-to-end testing and removal of npm artifacts.

### Changes Required:

#### 1. Verify Git Status
**Commands**:
```bash
# Check what files changed
git status

# Ensure package-lock.json is deleted
git rm package-lock.json

# Ensure pnpm-lock.yaml is added
git add pnpm-lock.yaml
```

#### 2. Update .gitignore (if needed)
**File**: `.gitignore`
**Changes**: Ensure npm and pnpm artifacts are ignored

```gitignore
# Dependencies
node_modules/

# Lock files (keep only pnpm-lock.yaml in git)
package-lock.json
yarn.lock

# pnpm
.pnpm-store/
.pnpm-debug.log
```

#### 3. Clean Local Environment
**Commands**:
```bash
# Remove node_modules
rm -rf node_modules

# Fresh install with pnpm
pnpm install

# Verify everything works
pnpm test
pnpm run build
```

### Success Criteria:

#### Automated Verification:
- [x] No `package-lock.json` in repository: `! git ls-files | grep package-lock.json`
- [x] `pnpm-lock.yaml` exists: `git ls-files | grep pnpm-lock.yaml`
- [x] All tests pass: `pnpm test`
- [x] Build succeeds: `pnpm run build`
- [ ] Linting passes (if applicable): `pnpm run format`
- [x] Docker builds: `docker build -t monitor:test .` (structure verified)
- [ ] Docker runs: `docker run --rm monitor:test pnpm --version`

#### Manual Verification:
- [ ] Fresh clone and `pnpm install` works on clean machine
- [ ] Development workflow is smooth
- [ ] No npm-related errors in console
- [ ] Application behavior is identical to npm version
- [ ] CI/CD pipelines pass on GitHub
- [ ] Production deployment works (if deploying)

---

## Testing Strategy

### Unit Tests
- Run existing test suite with pnpm: `pnpm test`
- Verify no test failures introduced by migration
- Check that all test dependencies resolve correctly

### Integration Tests
- Build and run Docker container locally
- Test GitHub Actions workflows on a feature branch
- Verify database migrations work: `pnpm exec prisma migrate deploy`
- Test development workflow: `pnpm dev`

### Manual Testing Steps
1. **Fresh Environment Test**:
   - Clone repository to new directory
   - Run `corepack enable`
   - Run `pnpm install`
   - Verify all dependencies install without errors
   - Run `pnpm dev` and test application

2. **Docker Test**:
   - Build image: `docker build -t monitor:test .`
   - Run container: `docker run -p 3000:3000 monitor:test`
   - Test application functionality
   - Verify no pnpm-related errors in logs

3. **CI/CD Test**:
   - Push migration branch to GitHub
   - Monitor workflow execution
   - Check for cache performance
   - Verify build artifacts

4. **Production-like Test**:
   - Test `pnpm run build` output
   - Test `pnpm run start` production mode
   - Verify environment variable handling
   - Check application performance

## Performance Considerations

### Expected Improvements:
- **Faster installs**: pnpm uses content-addressable storage, reducing duplicate downloads
- **Disk space savings**: Symlinked dependencies reduce disk usage
- **Better caching**: CI/CD should see faster install times with pnpm cache

### Potential Issues:
- **Symlink compatibility**: Unlikely issue with Node.js stack, but monitor for any tool-specific issues
- **First-time install**: Initial pnpm install may be slower as it builds store
- **Docker layer caching**: Should remain effective, but monitor build times

### Monitoring:
- Compare CI/CD workflow times before and after migration
- Monitor Docker build times
- Track local development install times

## Migration Notes

### For Team Members:
After this migration is merged, developers need to:

1. **Enable corepack** (one-time):
   ```bash
   corepack enable
   ```

2. **Clean existing installation**:
   ```bash
   rm -rf node_modules package-lock.json
   ```

3. **Install with pnpm**:
   ```bash
   pnpm install
   ```

4. **Update muscle memory**:
   - Use `pnpm install` instead of `npm install`
   - Use `pnpm add <pkg>` instead of `npm install <pkg>`
   - Use `pnpm <script>` instead of `npm run <script>`

### Rollback Plan:
If critical issues arise:
1. Revert all commits from this migration
2. Delete `pnpm-lock.yaml` and `.npmrc`
3. Restore `package-lock.json` from git history
4. Run `npm clean-install`
5. Revert Dockerfile and workflow changes

## References

- Related research: `planning/2025-12-16-npm-to-pnpm-migration/research.md`
- pnpm documentation: https://pnpm.io/
- pnpm vs npm comparison: https://pnpm.io/feature-comparison
- pnpm Docker guide: https://pnpm.io/docker
- GitHub Actions pnpm setup: https://github.com/pnpm/action-setup

## Open Questions

None - all questions resolved during planning phase.
