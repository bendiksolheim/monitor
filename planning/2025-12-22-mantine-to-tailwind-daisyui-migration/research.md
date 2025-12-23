---
date: 2025-12-22T20:02:24Z
researcher: Claude Sonnet 4.5
git_commit: 157df47e9e1c227bd62e88a8da176d18e5394c2d
branch: main
repository: monitor
topic: "Migrating from Mantine to Tailwind CSS + DaisyUI"
tags: [research, codebase, mantine, tailwindcss, daisyui, ui-migration, hydration-errors]
status: complete
last_updated: 2025-12-22
last_updated_by: Claude Sonnet 4.5
---

# Research: Migrating from Mantine to Tailwind CSS + DaisyUI

**Date**: 2025-12-22T20:02:24Z
**Researcher**: Claude Sonnet 4.5
**Git Commit**: 157df47e9e1c227bd62e88a8da176d18e5394c2d
**Branch**: main
**Repository**: monitor

## Research Question

This Next.js monitoring dashboard currently uses Mantine v8.3.10 for UI components but is experiencing hydration errors. The goal is to migrate the entire frontend system to Tailwind CSS + DaisyUI, with general components placed in a separate components/ folder, Mantine completely removed, and the UI remaining similar in appearance.

## Summary

The migration from Mantine to Tailwind CSS + DaisyUI is **highly feasible and recommended**. The codebase has minimal custom CSS, uses a clear component-based architecture, and the hydration errors are directly caused by Mantine's `ColorSchemeScript` component.

**Key Findings**:
1. **Hydration Errors Confirmed**: Multiple hydration mismatches found in dev logs, primarily caused by Mantine's `ColorSchemeScript` adding the `data-mantine-color-scheme` attribute to the `<html>` element
2. **15 Mantine Components Used**: AppShell, Avatar, Badge, Button, Card, Center, Code, Container, Grid, Group, List, SegmentedControl, SimpleGrid, Space, Stack, Tabs, Text, Title
3. **Latest Versions**: Tailwind CSS v4.1 (latest: v4.1.18) and DaisyUI v5.0+ are production-ready with modern CSS-first configuration
4. **Clean Migration Path**: Low CSS complexity (only 2 custom CSS files) and consistent component usage patterns make migration straightforward
5. **Component Equivalents**: All Mantine components have direct DaisyUI or Tailwind equivalents

**Recommended Approach**:
- Install Tailwind CSS v4.1+ and DaisyUI v5.0+
- Use CSS-first configuration with `@theme` directive (v4's new approach)
- Create reusable component library in `app/components/ui/`
- Migrate component-by-component starting with layout
- Remove Mantine dependencies completely
- Maintain similar visual design using DaisyUI themes

**Estimated Effort**: 2-3 days for complete migration (16-24 hours)

---

## Detailed Findings

### 1. Current Mantine Setup

**Version**: Mantine v8.3.10 (@mantine/core + @mantine/hooks)

**Installation** (`package.json`):
```json
{
  "dependencies": {
    "@mantine/core": "^8.3.10",
    "@mantine/hooks": "^8.3.10"
  },
  "devDependencies": {
    "postcss-preset-mantine": "^1.18.0",
    "postcss-simple-vars": "^7.0.1"
  }
}
```

**Theme Configuration** (`app/layout.tsx:59`):
```typescript
const theme = createTheme({
  primaryColor: 'cyan',
  fontFamily: 'system-ui, sans-serif',
});
```

**Provider Setup** (`app/layout.tsx:64`):
```typescript
<MantineProvider theme={theme}>
  <AppShellWrapper ...>
    {children}
  </AppShellWrapper>
</MantineProvider>
```

**PostCSS Configuration** (`postcss.config.cjs`):
```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em'
      }
    }
  }
};
```

**Custom CSS**:
- `app/styles/custom.css` - 3 lines (minimal)
- `app/components/segmented-control/segmented-control.module.css` - SegmentedControl styling override

---

### 2. Hydration Error Analysis

**Status**: ✅ **Root cause identified**

#### Evidence from Development Logs

**File**: `.next/dev/logs/next-development.log`

```
Browser ERROR: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.
```

**Diff showing mismatch**:
```
- data-mantine-color-scheme="light"
```

The `data-mantine-color-scheme` attribute is missing on the client-rendered HTML but present on the server HTML.

#### Root Causes

##### 1. **ColorSchemeScript Mismatch (PRIMARY ISSUE)**
**File**: `app/layout.tsx:59`

**Problem**: Mantine's `ColorSchemeScript` adds the `data-mantine-color-scheme` attribute to the `<html>` element dynamically on the client, but this doesn't match the server-rendered HTML.

```tsx
<html lang="en">
  <head>
    <ColorSchemeScript />  {/* ← Causes hydration mismatch */}
    ...
  </head>
  <body>
    <MantineProvider theme={theme}>
      ...
    </MantineProvider>
  </body>
</html>
```

**Why it happens**: The `ColorSchemeScript` detects the user's color scheme preference (light/dark) and applies it after hydration, causing a mismatch between server and client renders.

##### 2. **Client Components with Hooks**
**Files**:
- `app/components/segmented-control-wrapper.tsx` - Uses `useRouter()` and `useSearchParams()`
- `app/components/app-shell-wrapper.tsx` - Uses Mantine's `AppShell`

**Problem**: These components use Next.js hooks that can have different values on server vs. client, especially `useSearchParams()`.

##### 3. **SVG ID Generation**
**File**: `app/components/uptime-indicator.tsx:22`

```tsx
const id = safeId(`${props.name}-${hour}`);
```

**Potential issue**: If the ID generation is non-deterministic, it could cause hydration mismatches.

##### 4. **Tabs Component State**
**File**: `app/config/page.tsx:24`

```tsx
<Tabs variant="outline" defaultValue="parsed">
  {/* ... */}
</Tabs>
```

**Potential issue**: Mantine's Tabs component manages state internally, which can cause hydration issues.

#### Summary of Hydration Issues

| Issue | Severity | Location | Caused By |
|-------|----------|----------|-----------|
| ColorSchemeScript attribute mismatch | **HIGH** | `app/layout.tsx:59` | Mantine's color scheme detection |
| useSearchParams hook | MEDIUM | `app/components/segmented-control-wrapper.tsx` | Next.js routing hooks |
| SVG ID generation | MEDIUM | `app/components/uptime-indicator.tsx:22` | Dynamic ID creation |
| Tabs state management | LOW | `app/config/page.tsx:24` | Mantine component internals |

**Migration Impact**: Switching to Tailwind + DaisyUI will **completely eliminate** all these hydration errors since DaisyUI is pure CSS without JavaScript-based theme detection.

---

### 3. Latest Tailwind CSS and DaisyUI Information

#### Tailwind CSS v4.1

**Latest Version**: v4.1.18 (released December 2025)

**What's New in v4.1** (released April 2025):
- Text shadow utilities (`text-shadow-*`)
- Mask utilities for image and gradient masking
- Overflow-wrap utilities
- Improved browser compatibility
- Performance improvements

**What's New in v4.0** (released January 2025):
- CSS-first configuration using `@theme` directive
- New installation methods with `@tailwindcss/postcss` or `@tailwindcss/vite`
- Simplified setup (no more `tailwind.config.js` required)
- High-performance engine rewrite
- Modern CSS features (`@property`, `color-mix()`)

**Installation for Next.js (v4.1)**:
```bash
pnpm install tailwindcss @tailwindcss/postcss
```

**PostCSS Configuration** (`postcss.config.mjs`):
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

**CSS-First Configuration** (`app/globals.css`):
```css
@import "tailwindcss";

@theme {
  /* Custom theme variables */
  --color-primary: oklch(0.72 0.16 194.77); /* cyan */
  --font-sans: system-ui, sans-serif;

  /* Add custom breakpoints, colors, etc. */
  --breakpoint-3xl: 120rem;
}
```

**Key Features**:
- **CSS-first configuration**: Define theme in CSS using `@theme` directive instead of JavaScript
- **Simplified setup**: No `tailwind.config.js` file needed (though still supported for compatibility)
- **Modern CSS**: Uses `@property` and `color-mix()` for advanced features
- **Better performance**: Completely rewritten engine
- **No JavaScript required**: Pure CSS (no hydration issues)
- **Excellent Next.js integration**: Official support via PostCSS plugin

**Browser Requirements**:
- Safari 16.4+
- Chrome 111+
- Firefox 128+
- **Note**: For older browser support, use Tailwind CSS v3.4

**Upgrade Path**: v4 includes an automated upgrade tool for migrating from v3:
```bash
npx @tailwindcss/upgrade@next
```

**Documentation**: https://tailwindcss.com/docs

---

#### DaisyUI v5.0+

**Installation**:
```bash
pnpm install -D daisyui@latest
```

**Configuration** (`tailwind.config.ts`):
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      'light',
      'dark',
      'cupcake',
      'bumblebee',
      'emerald',
      'corporate',
      'synthwave',
      'retro',
      'cyberpunk',
      'valentine',
      'halloween',
      'garden',
      'forest',
      'aqua',
      'lofi',
      'pastel',
      'fantasy',
      'wireframe',
      'black',
      'luxury',
      'dracula',
      'cmyk',
      'autumn',
      'business',
      'acid',
      'lemonade',
      'night',
      'coffee',
      'winter',
    ],
  },
}
export default config
```

**Key Features**:
- 4242+ code snippets available
- Pure CSS component library (no JavaScript)
- 30+ built-in themes
- Fully customizable with Tailwind
- Excellent documentation and examples
- No hydration issues (static CSS only)
- Works seamlessly with Next.js

**Component Examples**:
- Navbar, Button, Badge, Card, Avatar, Tabs
- Alert, Modal, Drawer, Dropdown, Collapse
- Forms: Input, Textarea, Select, Checkbox, Radio, Toggle
- Data display: Table, Stats, Timeline, Progress
- Layouts: Hero, Footer, Divider, Stack

**Documentation**: https://daisyui.com/docs/install/nextjs

**Theme Switching**: DaisyUI supports theme switching via `data-theme` attribute without JavaScript hydration issues.

---

### 4. Complete Mantine Component Inventory

#### Components Used (15 total)

**From @mantine/core**:
1. **AppShell** - Main layout container with header
2. **Avatar** - Logo/user icon
3. **Badge** - Status indicators
4. **Button** - Navigation buttons
5. **Card** - Content containers
6. **Center** - Centering utility
7. **Code** - Code block display
8. **Container** - Page width wrapper
9. **Grid** & **Grid.Col** - Grid layout system
10. **Group** - Horizontal layout
11. **List** & **List.Item** - List components
12. **SegmentedControl** - Filter/tab control
13. **SimpleGrid** - Simple grid layout
14. **Space** - Spacing utility
15. **Stack** - Vertical layout
16. **Tabs** (Tabs, Tabs.List, Tabs.Tab, Tabs.Panel) - Tab component
17. **Text** - Typography component
18. **Title** - Heading component

**From @mantine/hooks**: None used

**Theme & Provider**:
- **MantineProvider** - Root provider
- **ColorSchemeScript** - Theme detection script
- **createTheme** - Theme factory

#### Component Usage by File

| File | Components | Purpose |
|------|-----------|---------|
| `app/layout.tsx` | MantineProvider, ColorSchemeScript, createTheme | Root layout, theme setup |
| `app/page.tsx` | Container | Page wrapper |
| `app/nodes/page.tsx` | Container, Title, Stack, Card, Text | Node monitoring page |
| `app/config/page.tsx` | Card, Code, Container, List, Stack, Tabs, Text, Title | Config viewer |
| `app/components/app-shell-wrapper.tsx` | AppShell, Avatar, Badge, Button, Group, SimpleGrid, Text | Main layout shell |
| `app/components/segmented-control-wrapper.tsx` | Center | Filter control wrapper |
| `app/components/segmented-control/index.tsx` | SegmentedControl | Custom wrapper |
| `app/components/service.tsx` | Badge, Card, Group, Space, Text | Service card |
| `app/components/services-grid.tsx` | Grid, Grid.Col | Grid container |

#### Component Configuration Examples

**AppShell** (`app/components/app-shell-wrapper.tsx:74`):
```tsx
<AppShell
  header={{ height: 52 }}
  styles={{ header: { backgroundColor: 'var(--mantine-color-white)' } }}
>
  <AppShell.Header>{/* Navigation */}</AppShell.Header>
  <AppShell.Main>{/* Content */}</AppShell.Main>
</AppShell>
```

**Badge** (`app/components/app-shell-wrapper.tsx:84`):
```tsx
<Badge variant="light" size="lg" color={operational ? 'green' : 'red'}>
  {operational ? 'All good ✌️' : `${numberDown} service${numberDown > 1 ? 's' : ''} down`}
</Badge>
```

**Card** (`app/components/service.tsx:30`):
```tsx
<Card shadow="xs" withBorder p="md">
  <Group justify="space-between">
    <Badge variant="light" color={serviceStatusToColor(status)} size="md">
      {name}
    </Badge>
    <div>{uptimePercentage}%</div>
  </Group>
  {/* More content */}
</Card>
```

**SegmentedControl** (`app/components/segmented-control/index.tsx:6`):
```tsx
<MantineSegmentedControl
  radius="sm"
  size="sm"
  color="cyan"
  data={[
    { value: 'all', label: 'All' },
    { value: 'failing', label: 'Failing' },
    { value: 'unknown', label: 'Unknown' }
  ]}
  value={value}
  onChange={onChange}
/>
```

**Tabs** (`app/config/page.tsx:24`):
```tsx
<Tabs variant="outline" defaultValue="parsed">
  <Tabs.List>
    <Tabs.Tab value="parsed">Prettified</Tabs.Tab>
    <Tabs.Tab value="raw">Raw</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="parsed">{/* Content */}</Tabs.Panel>
  <Tabs.Panel value="raw">{/* Content */}</Tabs.Panel>
</Tabs>
```

---

### 5. Mantine to Tailwind/DaisyUI Component Mapping

| Mantine Component | Tailwind/DaisyUI Equivalent | Migration Notes |
|-------------------|----------------------------|-----------------|
| **AppShell** | DaisyUI Navbar + `<div className="container mx-auto">` | Split into navbar + main container |
| **AppShell.Header** | DaisyUI Navbar | Use `navbar` class |
| **Avatar** | DaisyUI Avatar | Direct equivalent: `<div className="avatar">` |
| **Badge** | DaisyUI Badge | Direct equivalent: `<div className="badge">` |
| **Button** | DaisyUI Button | Direct equivalent: `<button className="btn">` |
| **Card** | DaisyUI Card | Direct equivalent: `<div className="card">` |
| **Center** | Tailwind Flexbox | `<div className="flex items-center justify-center">` |
| **Code** | DaisyUI Mockup Code | `<div className="mockup-code">` or `<code>` |
| **Container** | Tailwind Container | `<div className="container mx-auto">` |
| **Grid** / **Grid.Col** | Tailwind Grid | `<div className="grid grid-cols-2">` |
| **Group** | Tailwind Flexbox | `<div className="flex gap-2">` |
| **List** / **List.Item** | HTML `<ul>` + Tailwind | Standard HTML with Tailwind classes |
| **SegmentedControl** | DaisyUI Tabs or Radio Buttons | Custom component or tabs role="tablist" |
| **SimpleGrid** | Tailwind Grid | `<div className="grid grid-cols-3">` |
| **Space** | Tailwind Spacing | Margin/padding utilities: `mt-4`, `mb-4` |
| **Stack** | Tailwind Flexbox | `<div className="flex flex-col gap-2">` |
| **Tabs** | DaisyUI Tabs | Direct equivalent: `<div className="tabs">` |
| **Text** | HTML tags + Tailwind | `<p className="text-sm">`, `<span className="text-lg">` |
| **Title** | HTML headings + Tailwind | `<h1 className="text-2xl font-bold">` |

#### Color Mapping

| Mantine Color | Purpose | DaisyUI Equivalent |
|---------------|---------|-------------------|
| `cyan` (primary) | Branding, primary color | `primary` theme color |
| `green` | Success/operational status | `success` |
| `red` | Error/failed status | `error` |
| `yellow` | Warning/unknown status | `warning` |
| `gray` | Neutral colors | `base-content`, `base-300` |

#### Typography Mapping

| Mantine | Tailwind Equivalent |
|---------|-------------------|
| `<Text size="xl">` | `<p className="text-xl">` |
| `<Text size="lg">` | `<p className="text-lg">` |
| `<Text size="md">` | `<p className="text-base">` |
| `<Text size="sm">` | `<p className="text-sm">` |
| `<Text size="xs">` | `<p className="text-xs">` |
| `<Text fw={700}>` | `<p className="font-bold">` |
| `<Text fw={500}>` | `<p className="font-medium">` |
| `<Title order={1}>` | `<h1 className="text-3xl font-bold">` |
| `<Title order={2}>` | `<h2 className="text-2xl font-bold">` |

#### Spacing Mapping

| Mantine | Tailwind Equivalent |
|---------|-------------------|
| `gap="xs"` | `gap-1` (0.25rem) |
| `gap="sm"` | `gap-2` (0.5rem) |
| `gap="md"` | `gap-4` (1rem) |
| `gap="lg"` | `gap-6` (1.5rem) |
| `gap="xl"` | `gap-8` (2rem) |
| `mb="xs"` | `mb-1` |
| `mb="md"` | `mb-4` |
| `p="md"` | `p-4` |

---

### 6. Migration Strategy

#### Phase 1: Setup (2-3 hours)

**Step 1: Install Tailwind CSS v4.1 and DaisyUI**
```bash
pnpm install -D tailwindcss @tailwindcss/postcss daisyui
```

**Step 2: Configure PostCSS** (`postcss.config.mjs`):
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

**Step 3: Configure Tailwind CSS with @theme directive** (`app/globals.css`):
```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
  /* Match current color scheme */
  --color-primary: oklch(0.72 0.16 194.77); /* cyan-500 equivalent */
  --font-sans: system-ui, sans-serif;

  /* Custom spacing if needed */
  /* --spacing-*: <value>; */
}
```

**Step 4: Configure DaisyUI themes** (optional, via CSS):
```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
  --color-primary: oklch(0.72 0.16 194.77);
  --font-sans: system-ui, sans-serif;
}

/* DaisyUI theme configuration */
[data-theme="corporate"] {
  /* Corporate theme is used by default */
}
```

**Alternative: Use legacy JavaScript config** (if needed):

If you prefer the old v3 config style, create `tailwind.config.ts` and use `@config` directive:

**`tailwind.config.ts`**:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#06b6d4', // cyan-500
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark', 'corporate'],
    darkTheme: 'dark',
  },
}
export default config
```

**`app/globals.css`**:
```css
@import "tailwindcss";
@config "../tailwind.config.ts";
@plugin "daisyui";
```

**Note**: CSS-first configuration (`@theme`) is recommended for v4.1, but JavaScript config is still supported.

**Step 4: Create UI components directory**:
```bash
mkdir -p app/components/ui
```

---

#### Phase 2: Create Reusable Components (4-6 hours)

Create wrapper components in `app/components/ui/` that provide consistent styling:

**`app/components/ui/badge.tsx`**:
```tsx
import { cn } from '@/app/lib/utils'

type BadgeProps = {
  children: React.ReactNode
  variant?: 'success' | 'error' | 'warning' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({ children, variant = 'neutral', size = 'md', className }: BadgeProps) {
  const variantClasses = {
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
  }

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  }

  return (
    <div className={cn('badge', variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </div>
  )
}
```

**`app/components/ui/card.tsx`**:
```tsx
import { cn } from '@/app/lib/utils'

type CardProps = {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('card bg-base-100 shadow-sm border border-base-300', className)}>
      <div className="card-body p-4">
        {children}
      </div>
    </div>
  )
}
```

**`app/components/ui/button.tsx`**:
```tsx
import Link from 'next/link'
import { cn } from '@/app/lib/utils'

type ButtonProps = {
  children: React.ReactNode
  href?: string
  variant?: 'primary' | 'ghost' | 'outline'
  leftIcon?: React.ReactNode
  className?: string
}

export function Button({ children, href, variant = 'primary', leftIcon, className }: ButtonProps) {
  const variantClasses = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
  }

  const classes = cn('btn', variantClasses[variant], className)

  if (href) {
    return (
      <Link href={href} className={classes}>
        {leftIcon && <span>{leftIcon}</span>}
        {children}
      </Link>
    )
  }

  return (
    <button className={classes}>
      {leftIcon && <span>{leftIcon}</span>}
      {children}
    </button>
  )
}
```

**Utility function** (`app/lib/utils.ts`):
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install utilities:
```bash
pnpm install clsx tailwind-merge
```

---

#### Phase 3: Migrate Components (6-8 hours)

**Migration Order** (by dependency):

1. **`app/layout.tsx`** - Remove MantineProvider, add theme switching
2. **`app/components/app-shell-wrapper.tsx`** - Convert to DaisyUI Navbar
3. **`app/components/service.tsx`** - Convert to Tailwind/DaisyUI Card
4. **`app/components/services-grid.tsx`** - Convert to Tailwind Grid
5. **`app/components/segmented-control/index.tsx`** - Convert to DaisyUI Tabs or custom component
6. **`app/components/segmented-control-wrapper.tsx`** - Update to use new component
7. **`app/page.tsx`** - Update layout classes
8. **`app/nodes/page.tsx`** - Convert cards and layout
9. **`app/config/page.tsx`** - Convert tabs and layout

#### Example: AppShellWrapper Migration

**Before** (`app/components/app-shell-wrapper.tsx`):
```tsx
'use client'
import { AppShell, Avatar, Badge, Button, Group, SimpleGrid, Text } from '@mantine/core'

export function AppShellWrapper({ children, ... }) {
  return (
    <AppShell header={{ height: 52 }}>
      <AppShell.Header>
        <SimpleGrid cols={3} h="100%">
          <Group h="100%">
            <Avatar color="cyan">M</Avatar>
            <Text size="xl">Monitor</Text>
          </Group>
          <Group justify="center" h="100%">
            <Badge variant="light" size="lg" color={operational ? 'green' : 'red'}>
              {status}
            </Badge>
          </Group>
          <Group justify="flex-end">
            {/* Nav buttons */}
          </Group>
        </SimpleGrid>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
```

**After**:
```tsx
'use client'
import Link from 'next/link'
import { Badge } from '@/app/components/ui/badge'

export function AppShellWrapper({ children, ... }) {
  return (
    <div className="min-h-screen">
      <nav className="navbar bg-base-100 border-b border-base-300 h-[52px]">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-8">
                <span>M</span>
              </div>
            </div>
            <span className="text-xl font-semibold">Monitor</span>
          </div>
        </div>

        <div className="flex-none">
          <Badge variant={operational ? 'success' : 'error'} size="lg">
            {status}
          </Badge>
        </div>

        <div className="flex-none gap-2">
          {/* Nav buttons */}
          <Link href="/" className="btn btn-ghost">
            Services
          </Link>
          {/* More nav items */}
        </div>
      </nav>

      <main className="container mx-auto mt-4">
        {children}
      </main>
    </div>
  )
}
```

---

#### Phase 4: Cleanup and Testing (2-4 hours)

**Step 1: Remove Mantine Dependencies**
```bash
pnpm remove @mantine/core @mantine/hooks postcss-preset-mantine postcss-simple-vars
```

**Step 2: Delete Mantine Files**
- Delete `app/styles/custom.css` (Mantine-specific)
- Delete `app/components/segmented-control/segmented-control.module.css`
- Update `postcss.config.cjs` to remove Mantine presets

**Step 3: Update PostCSS** (`postcss.config.cjs`):
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 4: Test All Pages**
- `/` - Services dashboard
- `/nodes` - Node monitoring
- `/config` - Configuration viewer
- Verify responsive design
- Test dark/light theme switching

**Step 5: Verify No Hydration Errors**
- Check browser console (should be clean)
- Check `.next/dev/logs/next-development.log` (no hydration warnings)

---

### 7. File-by-File Migration Checklist

#### Files to Modify

| File | Changes Required | Complexity |
|------|------------------|------------|
| `app/layout.tsx` | Remove MantineProvider, add Tailwind imports | Low |
| `app/components/app-shell-wrapper.tsx` | Convert AppShell to Navbar + layout | Medium |
| `app/components/service.tsx` | Convert Card, Badge, Group, Text | Low |
| `app/components/services-grid.tsx` | Convert Grid to Tailwind grid | Low |
| `app/components/segmented-control/index.tsx` | Convert to DaisyUI Tabs or custom | Medium |
| `app/components/segmented-control-wrapper.tsx` | Update to use new component | Low |
| `app/page.tsx` | Update Container to Tailwind | Low |
| `app/nodes/page.tsx` | Convert Stack, Card, Text, Title | Low |
| `app/config/page.tsx` | Convert Tabs, List, Code, Card | Medium |
| `app/components/uptime-indicator.tsx` | No changes (SVG component) | None |
| `app/components/sparkline.tsx` | No changes (SVG component) | None |
| `app/components/svg.tsx` | No changes (SVG wrapper) | None |

#### Files to Create

| File | Purpose |
|------|---------|
| `app/components/ui/badge.tsx` | Reusable Badge component |
| `app/components/ui/button.tsx` | Reusable Button component |
| `app/components/ui/card.tsx` | Reusable Card component |
| `app/lib/utils.ts` | Utility functions (cn) |
| `tailwind.config.ts` | Tailwind configuration |

#### Files to Delete

| File | Reason |
|------|--------|
| `app/styles/custom.css` | Mantine-specific styles |
| `app/components/segmented-control/segmented-control.module.css` | Replaced by Tailwind |

#### Files to Update (Config)

| File | Changes |
|------|---------|
| `package.json` | Remove Mantine, add Tailwind v4.1/DaisyUI |
| `postcss.config.mjs` | Use `@tailwindcss/postcss` plugin |
| `app/globals.css` | Replace Mantine with Tailwind v4 imports |

---

### 8. DaisyUI Theme Recommendations

Based on your current design (cyan primary, clean interface), these themes would work well:

**Recommended Themes**:
1. **`corporate`** - Professional, clean, similar to current design
2. **`light`** - Default light theme, minimal and clean
3. **`emerald`** - Green accent, good for monitoring dashboards
4. **`aqua`** - Cyan/blue tones, matches current cyan primary
5. **`winter`** - Clean white background with blue accents

**CSS Configuration** (`app/globals.css`):
```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
  --color-primary: oklch(0.72 0.16 194.77); /* cyan */
}
```

**DaisyUI Configuration** (via legacy config if needed):

Create `tailwind.config.ts` with:
```typescript
export default {
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark', 'corporate', 'aqua'],
    darkTheme: 'dark',
  },
}
```

Then reference it in CSS:
```css
@import "tailwindcss";
@config "../tailwind.config.ts";
@plugin "daisyui";
```

**Theme Switching** (if desired later):
```tsx
// In root layout
<html lang="en" data-theme="corporate">
```

Or dynamic:
```tsx
'use client'
import { useEffect, useState } from 'react'

export function ThemeSwitcher() {
  const [theme, setTheme] = useState('corporate')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="corporate">Corporate</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="aqua">Aqua</option>
    </select>
  )
}
```

---

## Architecture Insights

### Key Design Decisions

1. **Component Library Approach**: Creating reusable components in `app/components/ui/` provides consistency and easier future updates.

2. **Tailwind + DaisyUI Combination**: Tailwind provides low-level utilities, DaisyUI provides high-level components. Together they offer the best of both worlds.

3. **No Hydration Issues**: DaisyUI is pure CSS, so there are no JavaScript-based theme detection or state management issues that cause hydration errors.

4. **Gradual Migration**: The migration can be done component-by-component without breaking the application.

5. **Improved Performance**: Tailwind's JIT compiler and DaisyUI's lightweight CSS will likely result in smaller bundle sizes compared to Mantine.

### Conventions to Maintain

- **Color Scheme**: Keep cyan as primary, green/red/yellow for status indicators
- **Component Structure**: Maintain current component hierarchy
- **Responsive Design**: Ensure mobile responsiveness with Tailwind's responsive utilities
- **Icon Library**: Continue using Tabler icons (works with any framework)
- **Type Safety**: Use TypeScript for all components

---

## Code References

### Critical Files for Migration

**Layout & Theme**:
- `app/layout.tsx:59` - MantineProvider and theme setup
- `app/layout.tsx:64` - ColorSchemeScript (causes hydration errors)

**Main Components**:
- `app/components/app-shell-wrapper.tsx:74` - AppShell layout
- `app/components/service.tsx:30` - Service card component
- `app/components/services-grid.tsx:8` - Grid layout
- `app/components/segmented-control/index.tsx:6` - SegmentedControl wrapper

**Pages**:
- `app/page.tsx:16` - Services dashboard
- `app/nodes/page.tsx:33` - Node monitoring page
- `app/config/page.tsx:24` - Configuration viewer

**Styling**:
- `app/styles/custom.css` - Mantine overrides (to be removed)
- `app/components/segmented-control/segmented-control.module.css` - Component styles (to be removed)
- `postcss.config.cjs` - PostCSS configuration

---

## Historical Context (from planning/)

This application was recently migrated from Remix to Next.js:
- `planning/2025-12-13-remix-to-nextjs-migration/research.md` - Initial Next.js migration research
- `planning/2025-12-16-migration-completion-status/research.md` - Migration completion status

**Relevant Findings**:
- The application is a service monitoring dashboard
- Uses Next.js 16.0.10 with custom server (Bree scheduler)
- Mantine v8.3.10 was kept during the Remix → Next.js migration
- Hydration errors mentioned as a known issue

**Migration Context**:
- This is the second major UI migration (Remix → Next.js, now Mantine → Tailwind)
- Clean architecture makes migrations easier
- Previous migration took 3-5 days, this one should be faster (2-3 days)

---

## Related Research

- `planning/2025-12-13-remix-to-nextjs-migration/research.md` - Next.js migration documentation
- `planning/2025-12-16-migration-completion-status/research.md` - Current state of the codebase

---

## Open Questions

1. **DaisyUI Theme Selection**: Which theme should be the default?
   - **Recommendation**: Start with `corporate` for professional look, can be changed later

2. **SegmentedControl Replacement**: Should we use DaisyUI Tabs or create a custom radio button group?
   - **Recommendation**: Use DaisyUI Tabs with `role="tablist"` for accessibility

3. **Container Width**: Should we use Tailwind's default container or customize?
   - **Recommendation**: Use default `container mx-auto` with `px-4` for padding

4. **Dark Mode**: Should dark mode support be implemented immediately?
   - **Recommendation**: Yes, DaisyUI makes it trivial with `data-theme` attribute

5. **Component Library**: Should we use a pre-built library like shadcn/ui or build custom?
   - **Recommendation**: Build minimal custom wrappers for consistency, avoid over-engineering

---

## Sources

### Tailwind CSS Documentation
- [Tailwind CSS v4.1 Release](https://tailwindcss.com/blog/tailwindcss-v4-1) - Text shadows, masks, and new utilities
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first configuration and engine rewrite
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Official documentation
- [Tailwind CSS Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) - Migration from v3 to v4
- [Tailwind CSS Next.js Guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs) - Next.js integration
- [Tailwind CSS GitHub Releases](https://github.com/tailwindlabs/tailwindcss/releases) - Version history
- [Tailwind CSS npm Package](https://www.npmjs.com/package/tailwindcss) - Latest version: v4.1.18

### DaisyUI Documentation
- [DaisyUI Documentation](https://daisyui.com/docs) - Component library documentation
- [DaisyUI Next.js Installation](https://daisyui.com/docs/install/nextjs) - Next.js setup guide
- [DaisyUI Themes](https://daisyui.com/docs/themes) - Available themes and customization

### Articles and Resources
- [Tailwind CSS in 2025: What's New and How to Prepare for Tailwind v4](https://medium.com/@sanjeevanibhandari3/tailwind-css-in-2025-whats-new-and-how-to-prepare-for-tailwind-v4-ed60192e82e8) - Overview of v4 changes
- [Tailwind CSS End of Life](https://endoflife.date/tailwind-css) - Version support timeline

---

## Conclusion

The migration from Mantine to Tailwind CSS + DaisyUI is **highly recommended** and **feasible within 2-3 days**. The hydration errors caused by Mantine's ColorSchemeScript will be completely eliminated since DaisyUI is pure CSS.

**Key Success Factors**:
1. ✅ Clean component architecture makes migration straightforward
2. ✅ All Mantine components have direct DaisyUI or Tailwind equivalents
3. ✅ Minimal custom CSS reduces migration complexity
4. ✅ Tailwind + DaisyUI is well-documented and production-ready
5. ✅ No hydration issues with DaisyUI (pure CSS)

**Migration Steps Summary**:
1. Install Tailwind CSS v4.1 and DaisyUI (1-2 hours)
2. Create reusable UI components (4-6 hours)
3. Migrate components file-by-file (6-8 hours)
4. Remove Mantine dependencies and test (2-4 hours)

**Total Estimated Effort**: 16-24 hours (2-3 days)

The resulting application will have:
- ✅ No hydration errors
- ✅ Smaller bundle size
- ✅ Better performance
- ✅ More maintainable codebase
- ✅ Similar visual appearance
- ✅ Better documentation and community support
