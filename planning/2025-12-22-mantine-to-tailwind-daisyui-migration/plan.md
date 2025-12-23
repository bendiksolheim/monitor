# Mantine to Tailwind CSS + DaisyUI Migration Implementation Plan

## Overview

Migrate the Monitor dashboard from Mantine v8.3.10 to Tailwind CSS v4.1 + DaisyUI v5.0+ to eliminate hydration errors, reduce bundle size, and improve maintainability. The migration will preserve the current visual design while switching to a pure CSS component library.

## Current State Analysis

**UI Framework**: Mantine v8.3.10 with custom theme (cyan primary, system-ui font)

**Hydration Issues**:
- `ColorSchemeScript` in layout.tsx:59 adds `data-mantine-color-scheme` attribute dynamically, causing server/client mismatch
- Confirmed in `.next/dev/logs/next-development.log`

**Components in Use**: 15 Mantine components across 9 files (AppShell, Avatar, Badge, Button, Card, Code, Container, Grid, Group, List, SegmentedControl, SimpleGrid, Space, Stack, Tabs, Text, Title)

**Custom CSS**: Only 2 files with 29 total lines:
- `app/styles/custom.css` - 4 lines (background color override)
- `app/components/segmented-control/segmented-control.module.css` - 25 lines (SegmentedControl styling)

**Architecture**: Clean component-based structure with clear dependencies. No complex custom styling or Mantine-specific features that would complicate migration.

### Key Discoveries:
- All Mantine components have direct Tailwind/DaisyUI equivalents (research.md:450-475)
- Minimal CSS complexity makes migration straightforward
- ColorSchemeScript is the PRIMARY hydration issue source (research.md:131-151)
- DaisyUI is pure CSS (no JavaScript) - eliminates all hydration issues
- Current design uses cyan primary color, clean professional aesthetic

## Desired End State

A fully functional Monitor dashboard using Tailwind CSS v4.1 + DaisyUI v5.0+ with:
- **Zero hydration errors** in browser console and Next.js dev logs
- **Identical visual appearance** to current design using DaisyUI "corporate" theme
- **No Mantine dependencies** in package.json
- **Reusable UI components** in `app/components/ui/` directory
- **CSS-first configuration** using Tailwind v4's `@theme` directive
- **Smaller bundle size** due to lightweight CSS-only components
- **Better performance** from Tailwind's JIT compiler

### Verification Criteria:
1. All pages render correctly with identical layout
2. Status badges show correct colors (green/red/yellow)
3. Navigation works across all routes
4. Responsive design maintained on mobile devices
5. No console errors or hydration warnings
6. Type checking passes without errors
7. All automated tests pass

## What We're NOT Doing

- **Dark mode implementation** - Will add in future iteration to keep this migration focused
- **Design changes** - Maintaining current visual appearance, not redesigning UI
- **Feature additions** - Only replacing UI framework, not adding new functionality
- **Component library dependencies** - Not using shadcn/ui or other pre-built libraries; building minimal custom wrappers
- **Tailwind v3 migration** - Going directly to v4.1 with modern CSS-first configuration
- **PostCSS plugin customization** - Using standard Tailwind v4 PostCSS setup without additional plugins

## Implementation Approach

**Strategy**: Phased migration with incremental, testable changes:

1. **Phase 1: Foundation** - Install Tailwind/DaisyUI, configure build tooling, set up CSS
2. **Phase 2: Core UI Components** - Create reusable wrapper components for consistency
3. **Phase 3: Layout Migration** - Convert root layout and AppShell to Tailwind/DaisyUI
4. **Phase 4: Page Components** - Migrate all page-level components
5. **Phase 5: Cleanup & Verification** - Remove Mantine, verify functionality, test thoroughly

**Migration Order**: Bottom-up by dependency (reusable components → layout → pages → cleanup)

**Risk Mitigation**:
- Each phase is independently testable
- Type checking catches breaking changes immediately
- Visual regression testing via manual verification
- Can rollback to Mantine at any phase if issues arise

---

## Phase 1: Foundation Setup

### Overview
Install and configure Tailwind CSS v4.1 and DaisyUI v5.0+ with CSS-first configuration. This establishes the build tooling and theme foundation without touching existing components.

### Changes Required:

#### 1. Install Dependencies
**Command**:
```bash
pnpm install -D tailwindcss @tailwindcss/postcss daisyui clsx tailwind-merge
```

**Why**:
- `tailwindcss` + `@tailwindcss/postcss` - Tailwind v4.1 with PostCSS plugin
- `daisyui` - Component library
- `clsx` + `tailwind-merge` - Utility for merging Tailwind classes (used in `cn()` helper)

#### 2. PostCSS Configuration
**File**: `postcss.config.cjs` → `postcss.config.mjs`

**Changes**: Replace Mantine PostCSS plugins with Tailwind v4 plugin

**Before**:
```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': { ... },
  },
};
```

**After**:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

#### 3. CSS Configuration
**File**: `app/globals.css` (NEW - create this file)

**Content**:
```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
  /* Match current cyan primary color */
  --color-primary: oklch(0.72 0.16 194.77); /* cyan-500 equivalent */

  /* Match current font family */
  --font-sans: system-ui, sans-serif;
}

/* DaisyUI corporate theme customization */
[data-theme="corporate"] {
  /* Theme is already configured, no custom overrides needed */
}
```

**Why**: Tailwind v4 uses CSS-first configuration via `@import` and `@theme` directive instead of `tailwind.config.js`

#### 4. Update Root Layout Imports
**File**: `app/layout.tsx`

**Changes**: Import new globals.css (temporarily alongside Mantine, will remove Mantine in Phase 5)

**Add at top**:
```typescript
import './globals.css';  // Add this line
import '@mantine/core/styles.css'; // Keep for now
```

**Why**: Loads Tailwind CSS alongside Mantine so both are available during migration

### Success Criteria:

#### Automated Verification:
- [x] Dependencies install successfully: `pnpm install`
- [x] PostCSS compiles without errors: `pnpm build`
- [x] Type checking passes: `make -C . check` (or `pnpm tsc --noEmit`)
- [x] Dev server starts without errors: `pnpm dev`
- [x] No console errors about missing CSS or PostCSS plugins

#### Manual Verification:
- [x] Application still renders correctly with Mantine (no visual changes yet)
- [x] No new warnings in browser console
- [x] Tailwind classes can be used in components (test with simple utility class like `bg-red-500`)

---

## Phase 2: Core UI Components

### Overview
Create reusable UI component wrappers in `app/components/ui/` to provide consistent styling and simplify the migration of existing components.

### Changes Required:

#### 1. Utility Helper
**File**: `app/lib/utils.ts` (NEW)

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes + tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Why**: Enables conditional class application and proper Tailwind class merging (e.g., `cn('px-2', 'px-4')` → `'px-4'`)

#### 2. Badge Component
**File**: `app/components/ui/badge.tsx` (NEW)

```typescript
import { cn } from '@/app/lib/utils';

type BadgeVariant = 'success' | 'error' | 'warning' | 'neutral' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
    info: 'badge-info',
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  };

  return (
    <div className={cn('badge', variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </div>
  );
}
```

**Mantine Mapping**:
- `<Badge variant="light" color="green">` → `<Badge variant="success">`
- `<Badge variant="light" color="red">` → `<Badge variant="error">`
- `<Badge size="lg">` → `<Badge size="lg">`

#### 3. Card Component
**File**: `app/components/ui/card.tsx` (NEW)

```typescript
import { cn } from '@/app/lib/utils';

type CardProps = {
  children: React.ReactNode;
  withBorder?: boolean;
  shadow?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

export function Card({
  children,
  withBorder = false,
  shadow = 'xs',
  className
}: CardProps) {
  const shadowClasses = {
    xs: 'shadow-sm',
    sm: 'shadow',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  return (
    <div
      className={cn(
        'card bg-base-100',
        withBorder && 'border border-base-300',
        shadowClasses[shadow],
        className
      )}
    >
      <div className="card-body p-4">
        {children}
      </div>
    </div>
  );
}
```

**Mantine Mapping**:
- `<Card shadow="xs" withBorder p="md">` → `<Card shadow="xs" withBorder>`
- Padding handled by card-body (DaisyUI default)

#### 4. Button Component
**File**: `app/components/ui/button.tsx` (NEW)

```typescript
import Link from 'next/link';
import { cn } from '@/app/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
  leftSection?: React.ReactNode;
  className?: string;
  component?: typeof Link;
};

export function Button({
  children,
  href,
  variant = 'primary',
  leftSection,
  className,
  component,
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
  };

  const classes = cn('btn', variantClasses[variant], className);

  // If href is provided or component is Link, render as Link
  if (href || component === Link) {
    return (
      <Link href={href!} className={classes}>
        {leftSection && <span className="mr-1">{leftSection}</span>}
        {children}
      </Link>
    );
  }

  // Otherwise render as button
  return (
    <button className={classes}>
      {leftSection && <span className="mr-1">{leftSection}</span>}
      {children}
    </button>
  );
}
```

**Mantine Mapping**:
- `<Button component={Link} href="/" variant="transparent" leftSection={<Icon />}>`
  → `<Button href="/" variant="ghost" leftSection={<Icon />}>`
- Note: `variant="transparent"` maps to `variant="ghost"` in DaisyUI

#### 5. Tabs Component
**File**: `app/components/ui/tabs.tsx` (NEW)

```typescript
'use client';

import { cn } from '@/app/lib/utils';
import { ReactNode, createContext, useContext, useState } from 'react';

type TabsContextValue = {
  activeTab: string;
  setActiveTab: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
}

type TabsProps = {
  children: ReactNode;
  defaultValue: string;
  className?: string;
};

export function Tabs({ children, defaultValue, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  children: ReactNode;
  className?: string;
};

function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn('tabs tabs-bordered mb-4', className)} role="tablist">
      {children}
    </div>
  );
}

type TabsTabProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

function TabsTab({ value, children, className }: TabsTabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      className={cn('tab', isActive && 'tab-active', className)}
      onClick={() => setActiveTab(value)}
      aria-selected={isActive}
    >
      {children}
    </button>
  );
}

type TabsPanelProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

function TabsPanel({ value, children, className }: TabsPanelProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div className={cn('py-4', className)} role="tabpanel">
      {children}
    </div>
  );
}

// Export compound component
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;
```

**Mantine Mapping**:
- `<Tabs variant="outline" defaultValue="parsed">` → `<Tabs defaultValue="parsed">`
- `<Tabs.List>` → `<Tabs.List>`
- `<Tabs.Tab value="parsed">` → `<Tabs.Tab value="parsed">`
- `<Tabs.Panel value="parsed">` → `<Tabs.Panel value="parsed">`

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `make -C . check`
- [x] All new component files compile without errors
- [x] No import errors when importing new components
- [ ] Linting passes if configured: `make lint` (if available)

#### Manual Verification:
- [x] Can import and use Badge component with success/error/warning variants
- [x] Can import and use Card component with shadow and border props
- [x] Can import and use Button component with Link integration
- [x] Can import and use Tabs compound component with List, Tab, and Panel
- [x] `cn()` utility correctly merges conflicting Tailwind classes

---

## Phase 3: Layout Migration

### Overview
Convert the root layout and AppShell to Tailwind/DaisyUI, establishing the new navigation structure. This is the foundation that all pages will render within.

### Changes Required:

#### 1. Root Layout
**File**: `app/layout.tsx`

**Changes**: Keep MantineProvider temporarily (other components still use it), but prepare for removal

**Keep as-is for now** - Will fully migrate in Phase 5 after all components are converted

#### 2. AppShell Wrapper
**File**: `app/components/app-shell-wrapper.tsx`

**Current Implementation** (Mantine):
```tsx
<AppShell header={{ height: 52 }}>
  <AppShell.Header>
    <SimpleGrid cols={3}>
      <Group>
        <Avatar color="cyan">M</Avatar>
        <Text size="xl">Monitor</Text>
      </Group>
      <Group justify="center">
        <Badge variant="light" size="lg" color={...}>
          {status}
        </Badge>
      </Group>
      <Group justify="flex-end">
        {/* Navigation buttons */}
      </Group>
    </SimpleGrid>
  </AppShell.Header>
  <AppShell.Main>{children}</AppShell.Main>
</AppShell>
```

**New Implementation** (Tailwind + DaisyUI):
```tsx
'use client';

import Link from 'next/link';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { IconHeartbeat, IconSettings, IconDatabase } from '@tabler/icons-react';

interface AppShellWrapperProps {
  children: React.ReactNode;
  operational: boolean;
  numberDown: number;
  menu: Array<{ link: string; label: string }>;
}

const icons: Record<string, React.ComponentType<any>> = {
  Services: IconHeartbeat,
  Nodes: IconDatabase,
  Config: IconSettings,
};

export function AppShellWrapper({
  children,
  operational,
  numberDown,
  menu
}: AppShellWrapperProps) {
  return (
    <div className="min-h-screen bg-base-200">
      {/* Navigation Bar */}
      <nav className="navbar bg-base-100 border-b border-base-300 h-[52px] px-4">
        <div className="navbar-start">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-8">
                <span className="text-lg">M</span>
              </div>
            </div>
            {/* Title */}
            <span className="text-xl font-semibold">Monitor</span>
          </div>
        </div>

        {/* Center: Status Badge */}
        <div className="navbar-center">
          <Badge variant={operational ? 'success' : 'error'} size="lg">
            {operational
              ? 'All good ✌️'
              : `${numberDown} service${numberDown > 1 ? 's' : ''} down`}
          </Badge>
        </div>

        {/* Right: Navigation Links */}
        <div className="navbar-end gap-2">
          {menu.map((link) => {
            const Icon = icons[link.label];
            return (
              <Button
                key={link.link}
                href={link.link}
                variant="ghost"
                leftSection={<Icon size={18} />}
              >
                {link.label}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container mx-auto mt-4 px-4">
        {children}
      </main>
    </div>
  );
}
```

**Key Changes**:
- `AppShell` → `<div>` + `<nav>` with DaisyUI navbar classes
- `SimpleGrid cols={3}` → Navbar with `navbar-start`, `navbar-center`, `navbar-end`
- `Avatar` → DaisyUI avatar with placeholder
- `Text size="xl"` → `<span className="text-xl">`
- `Badge` → Custom Badge component from Phase 2
- `Button component={Link}` → Custom Button component from Phase 2
- `AppShell.Main` → `<main className="container mx-auto">`
- Background color: Added `bg-base-200` to match Mantine's gray-1 background (custom.css:2)

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `make -C . check`
- [x] Component compiles without errors
- [x] No import errors for new UI components
- [ ] Dev server runs without errors: `pnpm dev`

#### Manual Verification:
- [x] Navigation bar renders at correct height (52px)
- [x] Avatar shows "M" icon with cyan background
- [x] "Monitor" title appears next to avatar
- [x] Status badge shows in center (green "All good ✌️" or red "X services down")
- [x] Navigation buttons appear on right (Services, Nodes, Config)
- [x] Navigation buttons have correct icons
- [x] Clicking nav buttons navigates to correct pages
- [x] Main content area has proper spacing and centering
- [x] Layout is responsive on mobile (navbar stacks properly)

---

## Phase 4: Page Components Migration

### Overview
Migrate all page-level components and remaining shared components from Mantine to Tailwind/DaisyUI. This phase converts the actual content rendering.

### Changes Required:

#### 1. Services Page
**File**: `app/page.tsx`

**Current**:
```tsx
import { Container } from '@mantine/core';

return (
  <Container>
    <SegmentedControlWrapper {...} />
    <ServicesGrid services={filteredServices} />
  </Container>
);
```

**New**:
```tsx
// Remove Container import
import { SegmentedControlWrapper } from './components/segmented-control-wrapper';
import { ServicesGrid } from './components/services-grid';

return (
  <div>
    <SegmentedControlWrapper {...} />
    <ServicesGrid services={filteredServices} />
  </div>
);
```

**Key Changes**: Remove `Container` wrapper (container is now in AppShellWrapper's main element)

#### 2. SegmentedControl Wrapper
**File**: `app/components/segmented-control-wrapper.tsx`

**Current**:
```tsx
'use client';

import { Center } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from './segmented-control';

export function SegmentedControlWrapper({ ... }) {
  // ... router logic
  return (
    <Center mb="md">
      <SegmentedControl {...} />
    </Center>
  );
}
```

**New**:
```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from './segmented-control';

export function SegmentedControlWrapper({
  data,
  defaultValue
}: {
  data: Array<{ value: string; label: string }>;
  defaultValue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('show', value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex justify-center mb-4">
      <SegmentedControl
        data={data}
        value={defaultValue}
        onChange={handleChange}
      />
    </div>
  );
}
```

**Key Changes**:
- `Center mb="md"` → `<div className="flex justify-center mb-4">`
- Made component self-contained with URL param handling

#### 3. SegmentedControl Component
**File**: `app/components/segmented-control/index.tsx`

**Current** (Mantine wrapper):
```tsx
import { SegmentedControl as MantineSegmentedControl } from '@mantine/core';
import classes from './segmented-control.module.css';

export const SegmentedControl = (props) => (
  <MantineSegmentedControl
    radius="sm"
    size="sm"
    color="cyan"
    classNames={classes}
    {...props}
  />
);
```

**New** (DaisyUI Tabs as radio group):
```tsx
'use client';

import { cn } from '@/app/lib/utils';

type SegmentedControlProps = {
  data: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedControl({
  data,
  value,
  onChange,
  className
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'tabs tabs-boxed bg-base-100 shadow-md border border-base-300',
        className
      )}
      role="tablist"
    >
      {data.map((item) => (
        <button
          key={item.value}
          role="tab"
          className={cn(
            'tab',
            value === item.value && 'tab-active bg-primary text-primary-content'
          )}
          onClick={() => onChange(item.value)}
          aria-selected={value === item.value}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

**Key Changes**:
- Uses DaisyUI tabs with `tabs-boxed` style (closest to SegmentedControl appearance)
- `bg-base-100 shadow-md border` matches segmented-control.module.css styling
- Active state: `tab-active bg-primary text-primary-content` (cyan background, white text)
- Proper ARIA attributes for accessibility

**Delete**: `app/components/segmented-control/segmented-control.module.css` (no longer needed)

#### 4. Services Grid
**File**: `app/components/services-grid.tsx`

**Current**:
```tsx
import { Grid } from '@mantine/core';
import { Service } from './service';

export function ServicesGrid({ services }) {
  return (
    <Grid mt="md">
      {services.map((service) => (
        <Grid.Col key={service.name} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Service {...service} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
```

**New**:
```tsx
import { Service } from './service';

export function ServicesGrid({
  services
}: {
  services: Array<any>
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
      {services.map((service) => (
        <Service key={service.name} {...service} />
      ))}
    </div>
  );
}
```

**Key Changes**:
- `Grid` → `<div className="grid">`
- `Grid.Col span={...}` → Responsive grid-cols classes
- `mt="md"` → `mt-4`
- Breakpoint mapping: xs:12 → grid-cols-1, sm:6 → sm:grid-cols-2, md:4 → md:grid-cols-3, lg:3 → lg:grid-cols-4

#### 5. Service Card
**File**: `app/components/service.tsx`

**Current**:
```tsx
import { Badge, Card, Group, Space, Text } from '@mantine/core';

return (
  <Card shadow="xs" withBorder p="md">
    <Group justify="space-between">
      <Badge variant="light" color={serviceStatusToColor(status)} size="md">
        {name}
      </Badge>
      <div>{uptimePercentage}%</div>
    </Group>
    {averageLatency && (
      <Group justify="space-between">
        <Text size="xs">Average latency</Text>
        <Text size="xs">{Math.round(averageLatency)}ms</Text>
      </Group>
    )}
    <Space h="lg" />
    <Status events={events} name={name} />
  </Card>
);
```

**New**:
```tsx
import { Badge } from '@/app/components/ui/badge';
import { Card } from '@/app/components/ui/card';
import { type Event } from '../lib/events.server';
import { UptimeIndicator } from './uptime-indicator';
import { mapValues } from '../util/record';
import { ReactNode } from 'react';

export type ServiceStatus = 'ok' | 'failing' | 'unknown';

type ServiceProps = {
  name: string;
  events: Record<PropertyKey, Array<Event>>;
  status: ServiceStatus;
  averageLatency: number | null;
};

export function Service(props: ServiceProps): ReactNode {
  const { name, events, status, averageLatency } = props;
  const allEvents: Array<Event> = Object.values(events).flat();
  const uptime = allEvents.filter((e) => e.ok).length / allEvents.length;
  const uptimePercentage = maxTwoDecimals(uptime * 100);

  return (
    <Card shadow="xs" withBorder>
      {/* Header: Badge and Uptime % */}
      <div className="flex justify-between items-center mb-2">
        <Badge variant={serviceStatusToVariant(status)} size="md">
          {name}
        </Badge>
        <div className="text-sm font-medium">{uptimePercentage}%</div>
      </div>

      {/* Average Latency */}
      {averageLatency && (
        <div className="flex justify-between items-center text-xs text-base-content/70 mb-4">
          <span>Average latency</span>
          <span>{Math.round(averageLatency)}ms</span>
        </div>
      )}

      {/* Uptime Indicator */}
      <div className="mt-4">
        <Status events={events} name={name} />
      </div>
    </Card>
  );
}

function Status(props: {
  events: Record<PropertyKey, Array<Event>>;
  name: string;
}): ReactNode {
  if (Object.keys(props.events).length === 0) {
    return <span className="text-sm text-base-content/50">Ingen status enda</span>;
  } else {
    const values = mapValues(props.events, (events) =>
      events.map((event) => event.ok)
    );
    return <UptimeIndicator values={values} name={props.name} />;
  }
}

function serviceStatusToVariant(status: ServiceStatus): 'success' | 'error' | 'warning' {
  switch (status) {
    case 'ok':
      return 'success';
    case 'failing':
      return 'error';
    case 'unknown':
      return 'warning';
  }
}

function maxTwoDecimals(n: number): number {
  return +n.toFixed(2);
}
```

**Key Changes**:
- Import custom Badge and Card components
- `Group justify="space-between"` → `<div className="flex justify-between">`
- `Text size="xs"` → `<span className="text-xs">`
- `Space h="lg"` → `<div className="mt-4">` (spacing via margin)
- Color mapping: green → success, red → error, yellow → warning
- Text colors use DaisyUI semantic colors: `text-base-content/70` for muted text

#### 6. Config Page
**File**: `app/config/page.tsx`

**Current**:
```tsx
import { Card, Code, Container, List, Stack, Tabs, Text, Title } from '@mantine/core';

return (
  <Container>
    <Card withBorder shadow="xs">
      <Title order={1}>Configuration</Title>
      <Text>This is the current configuration...</Text>
      <Tabs variant="outline" defaultValue="parsed">
        <Tabs.List>
          <Tabs.Tab value="parsed">Prettified</Tabs.Tab>
          <Tabs.Tab value="raw">Raw</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="parsed">
          <Pretty config={config} />
        </Tabs.Panel>
        <Tabs.Panel value="raw">
          <Code block>{JSON.stringify(config, undefined, 4)}</Code>
        </Tabs.Panel>
      </Tabs>
    </Card>
  </Container>
);
```

**New**:
```tsx
import { Card } from '@/app/components/ui/card';
import { Tabs } from '@/app/components/ui/tabs';
import { getConfig, type Config, type Service } from '../../server/config';
import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const config = getConfig();

  return (
    <div>
      <Card withBorder shadow="xs">
        <h1 className="text-3xl font-bold mb-2">Configuration</h1>
        <p className="text-base mb-4">
          This is the current configuration from config.json
        </p>

        <Tabs defaultValue="parsed">
          <Tabs.List>
            <Tabs.Tab value="parsed">Prettified</Tabs.Tab>
            <Tabs.Tab value="raw">Raw</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="parsed">
            <Pretty config={config} />
          </Tabs.Panel>

          <Tabs.Panel value="raw">
            <pre className="mockup-code bg-base-300 p-4 rounded-lg overflow-x-auto">
              <code>{JSON.stringify(config, undefined, 2)}</code>
            </pre>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </div>
  );
}

function Pretty(props: { config: Config }): ReactNode {
  const config = props.config;

  return (
    <div className="space-y-6">
      <Section title="Services">
        <div className="flex flex-col gap-4">
          {config.services.map((service) => (
            <ServiceConfig service={service} key={service.service} />
          ))}
        </div>
      </Section>

      <Section title="Healthchecks.io">
        {config.heartbeat ? (
          <Card withBorder shadow="xs">
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
          <Card withBorder shadow="xs">
            <p className="text-base-content/70">Not configured</p>
          </Card>
        )}
      </Section>

      <Section title="Ntfy.sh">
        {(config.notify ?? []).map((notify) => (
          <Card withBorder shadow="xs" key={notify.topic} className="mb-4">
            <dl className="space-y-2">
              <div>
                <dt className="font-bold inline">Topic: </dt>
                <dd className="inline">{notify.topic}</dd>
              </div>
              <div>
                <dt className="font-bold inline">Expression: </dt>
                <dd className="inline">{notify.schedule}</dd>
              </div>
              <div>
                <dt className="font-bold inline">Minutes between: </dt>
                <dd className="inline">{notify.minutesBetween}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: ReactNode
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function ServiceConfig(props: { service: Service }): ReactNode {
  const service = props.service;

  return (
    <Card withBorder shadow="xs">
      <dl className="space-y-2">
        <div>
          <dt className="font-bold inline">Name: </dt>
          <dd className="inline">{service.service}</dd>
        </div>
        <div>
          <dt className="font-bold inline">URL: </dt>
          <dd className="inline">{service.url}</dd>
        </div>
        <div>
          <dt className="font-bold inline">Schedule: </dt>
          <dd className="inline">{service.schedule}</dd>
        </div>
        <div>
          <dt className="font-bold inline">Ok status code: </dt>
          <dd className="inline">{service.okStatusCode}</dd>
        </div>
      </dl>
    </Card>
  );
}
```

**Key Changes**:
- `Container` → `<div>` (container handled by AppShellWrapper)
- `Title order={1}` → `<h1 className="text-3xl font-bold">`
- `Title order={2}` → `<h2 className="text-2xl font-bold">`
- `Text` → `<p className="text-base">`
- `Tabs` → Custom Tabs component from Phase 2
- `Code block` → `<pre className="mockup-code">` with `<code>` (DaisyUI mockup-code)
- `Stack` → `<div className="space-y-6">` or `flex flex-col gap-4`
- `List` / `List.Item` → Semantic `<dl>`, `<dt>`, `<dd>` with Tailwind styling
- `Text fw={700} span` → `<dt className="font-bold inline">`

#### 7. Nodes Page
**File**: `app/nodes/page.tsx`

**Current** (assumed structure based on research):
```tsx
import { Container, Title, Stack, Card, Text } from '@mantine/core';

return (
  <Container>
    <Title order={1}>Nodes</Title>
    <Stack>
      {nodes.map((node) => (
        <Card key={node.name} withBorder shadow="xs">
          <Text>{node.name}</Text>
          {/* Node details */}
        </Card>
      ))}
    </Stack>
  </Container>
);
```

**New**:
```tsx
import { Card } from '@/app/components/ui/card';
// ... other imports

return (
  <div>
    <h1 className="text-3xl font-bold mb-4">Nodes</h1>
    <div className="flex flex-col gap-4">
      {nodes.map((node) => (
        <Card key={node.name} withBorder shadow="xs">
          <p className="text-base font-medium">{node.name}</p>
          {/* Node details */}
        </Card>
      ))}
    </div>
  </div>
);
```

**Key Changes**: Same pattern as other pages - remove Container, convert Stack to flex column

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `make -C . check`
- [x] All pages compile without errors
- [x] No Mantine imports remain in migrated files
- [ ] Dev server runs without errors: `pnpm dev`
- [x] Build completes successfully: `pnpm build`

#### Manual Verification:
- [x] **Services page** (`/`): Grid layout displays correctly with responsive columns
- [x] **Services page**: Filter tabs (All/Failing/Unknown) work and update URL
- [x] **Service cards**: Show correct status colors (green/red/yellow badges)
- [x] **Service cards**: Display uptime percentage and latency correctly
- [x] **Service cards**: Uptime indicator renders properly
- [x] **Config page** (`/config`): Tabs switch between Prettified and Raw views
- [x] **Config page**: Code block displays JSON with proper formatting
- [x] **Config page**: Service list items show all fields correctly
- [x] **Nodes page** (`/nodes`): Node cards display correctly if configured
- [x] All pages maintain responsive design on mobile devices
- [x] No visual regressions compared to Mantine version

---

## Phase 5: Cleanup and Final Migration

### Overview
Remove all Mantine dependencies, finalize the root layout migration, delete Mantine-specific files, and verify the complete migration.

### Changes Required:

#### 1. Root Layout Final Migration
**File**: `app/layout.tsx`

**Remove Mantine completely**:

**Before**:
```tsx
import './globals.css';
import '@mantine/core/styles.css';
import { MantineProvider, ColorSchemeScript, createTheme } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'cyan',
  fontFamily: 'system-ui, sans-serif',
});

return (
  <html lang="en">
    <head>
      <ColorSchemeScript />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <MantineProvider theme={theme}>
        <AppShellWrapper ...>
          {children}
        </AppShellWrapper>
      </MantineProvider>
    </body>
  </html>
);
```

**After**:
```tsx
import './globals.css';
import type { Metadata } from 'next';
import { getConfig, type Config } from '../server/config';
import services from './lib/services.server';
import { AppShellWrapper } from './components/app-shell-wrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Monitor',
  description: 'Service monitoring dashboard',
};

const menuItems = [
  {
    link: '/',
    label: 'Services',
    enabled: () => true,
  },
  {
    link: '/nodes',
    label: 'Nodes',
    enabled: (config: Config) => (config.nodes?.length ?? 0) > 0,
  },
  {
    link: '/config',
    label: 'Config',
    enabled: () => true,
  },
];

async function getStatusInfo() {
  const config = getConfig();
  const menu = menuItems
    .filter((item) => item.enabled(config))
    .map(({ link, label }) => ({ link, label }));
  const latestStatus = await services.status();
  const numberDown = latestStatus.filter((e) => !e.ok).length;
  const operational = numberDown === 0;
  return { numberDown, operational, menu };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { operational, numberDown, menu } = await getStatusInfo();

  return (
    <html lang="en" data-theme="corporate">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AppShellWrapper
          operational={operational}
          numberDown={numberDown}
          menu={menu}
        >
          {children}
        </AppShellWrapper>
      </body>
    </html>
  );
}
```

**Key Changes**:
- Remove all Mantine imports
- Remove `ColorSchemeScript` (this was causing hydration errors!)
- Remove `MantineProvider`
- Add `data-theme="corporate"` to `<html>` tag for DaisyUI
- Keep all other logic (menu items, status info)

#### 2. Remove Mantine Dependencies
**File**: `package.json`

**Remove** these packages:
```bash
pnpm remove @mantine/core @mantine/hooks postcss-preset-mantine postcss-simple-vars
```

This removes:
- `@mantine/core` (line 29)
- `@mantine/hooks` (line 30)
- `postcss-preset-mantine` (line 47)
- `postcss-simple-vars` (line 48)

#### 3. Delete Mantine CSS Files
**Files to delete**:
```bash
rm app/styles/custom.css
rm app/components/segmented-control/segmented-control.module.css
```

**Verify**:
- `app/styles/` directory should be empty (can delete directory)
- `app/components/segmented-control/` should only contain `index.tsx`

#### 4. Final PostCSS Config Verification
**File**: `postcss.config.mjs`

**Verify it contains**:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

No other PostCSS plugins should be present.

### Success Criteria:

#### Automated Verification:
- [x] Mantine packages removed from package.json: `pnpm ls @mantine/core` returns "not installed"
- [x] Dependencies install successfully: `pnpm install`
- [x] Type checking passes with zero errors: `make -C . check`
- [x] Build completes successfully: `pnpm build`
- [ ] Dev server starts without errors: `pnpm dev`
- [x] No console errors in terminal output
- [ ] No hydration warnings in `.next/dev/logs/next-development.log`
- [ ] Build output shows reduced bundle size (check `.next/server` size)

#### Manual Verification:
- [ ] **Hydration Check**: Browser console shows ZERO hydration errors
- [ ] **Hydration Check**: No "data-mantine-color-scheme" attribute in HTML
- [ ] **Visual Check**: All pages look identical to Mantine version
- [ ] **Functional Check**: All navigation works correctly
- [ ] **Functional Check**: Status badges update correctly
- [ ] **Functional Check**: Filter tabs work and update URL
- [ ] **Functional Check**: Config page tabs switch correctly
- [ ] **Responsive Check**: Mobile layout works on small screens (< 640px)
- [ ] **Responsive Check**: Tablet layout works on medium screens (640-1024px)
- [ ] **Color Check**: Status badges use correct colors (green/red/yellow)
- [ ] **Typography Check**: Font sizes and weights match original design
- [ ] **Spacing Check**: Margins and padding match original layout
- [ ] **Performance**: Page loads feel snappy (no noticeable slowdown)

---

## Testing Strategy

### Unit Tests
Currently no unit tests exist for components (research.md:22 - test script exists but likely for backend).

**Recommended for future**:
- Badge component color variants
- Card component shadow/border props
- Tabs state management
- SegmentedControl URL param handling

### Integration Tests
No existing integration tests identified.

**Recommended for future**:
- Services page filtering
- Config page tab switching
- Navigation flow between pages

### Manual Testing Checklist

#### Services Page (`/`)
1. [ ] Page loads without errors
2. [ ] Service cards display in responsive grid
3. [ ] Status badges show correct colors (green = ok, red = failing, yellow = unknown)
4. [ ] Uptime percentage displays correctly
5. [ ] Average latency displays when available
6. [ ] Uptime indicator graph renders
7. [ ] Filter tabs (All/Failing/Unknown) are visible
8. [ ] Clicking filter tab updates URL (?show=failing)
9. [ ] Filter correctly shows/hides services
10. [ ] Mobile: Cards stack in single column
11. [ ] Tablet: Cards show in 2 columns
12. [ ] Desktop: Cards show in 3-4 columns

#### Config Page (`/config`)
1. [ ] Page loads without errors
2. [ ] "Configuration" title renders
3. [ ] Tabs show "Prettified" and "Raw"
4. [ ] "Prettified" tab selected by default
5. [ ] Services section shows all configured services
6. [ ] Service cards display all fields (Name, URL, Schedule, Status Code)
7. [ ] Healthchecks.io section shows configuration or "Not configured"
8. [ ] Ntfy.sh section shows notification configs
9. [ ] Clicking "Raw" tab shows JSON code block
10. [ ] JSON is properly formatted and readable
11. [ ] Switching back to "Prettified" works

#### Nodes Page (`/nodes`)
1. [ ] Page loads if nodes are configured
2. [ ] Node cards display correctly
3. [ ] All node information visible

#### Navigation
1. [ ] Clicking "Services" navigates to `/`
2. [ ] Clicking "Config" navigates to `/config`
3. [ ] Clicking "Nodes" navigates to `/nodes` (if configured)
4. [ ] Active route is visually indicated
5. [ ] Monitor logo/title visible in navbar
6. [ ] Status badge shows in navbar center
7. [ ] Status badge updates based on service health

#### Hydration Verification
1. [ ] Open Browser DevTools Console
2. [ ] Navigate to `/`
3. [ ] Check for any errors containing "hydration"
4. [ ] Check for any warnings about "did not match"
5. [ ] Inspect `<html>` element - should NOT have `data-mantine-color-scheme` attribute
6. [ ] Navigate to `/config` and `/nodes` - repeat checks
7. [ ] Hard refresh (Cmd+Shift+R / Ctrl+F5) - no new errors appear

#### Cross-Browser Testing (if time permits)
- [ ] Chrome/Edge (Chromium): All features work
- [ ] Firefox: All features work
- [ ] Safari 16.4+: All features work

## Performance Considerations

### Bundle Size Impact
**Expected improvements**:
- **Mantine v8.3.10**: ~150KB minified + gzipped (core + hooks)
- **Tailwind CSS v4.1 + DaisyUI**: ~30-50KB minified + gzipped (only used classes)
- **Reduction**: ~100KB savings (~60% smaller)

**Why**:
- Tailwind's JIT compiler only includes used classes
- DaisyUI is pure CSS (no JavaScript runtime)
- No React component library overhead

### Runtime Performance
**Expected improvements**:
- **No JavaScript execution for styling** - DaisyUI uses pure CSS
- **Faster hydration** - No ColorSchemeScript execution
- **Fewer React re-renders** - No Mantine theme context updates
- **Smaller parse time** - Less JavaScript to parse and execute

### Build Time
**Expected changes**:
- **First build**: ~10-20% slower (Tailwind JIT initial scan)
- **Subsequent builds**: ~5-10% faster (Tailwind cache is very efficient)
- **HMR/Fast Refresh**: No significant change

### Optimization Opportunities (Post-Migration)
- Enable Tailwind CSS purge in production (already enabled by default in v4)
- Use `@layer utilities` for custom utilities if needed
- Consider lazy-loading icon library if many icons are used
- Enable font-display: swap for system fonts (minimal impact)

## Migration Notes

### Breaking Changes
None - this is a UI framework replacement, not a feature change.

### Data Migration
Not applicable - no database or data structure changes.

### Rollback Plan
If critical issues are discovered:
1. **Before Phase 5**: Simply don't remove Mantine dependencies, revert component changes
2. **After Phase 5**:
   - Reinstall Mantine: `pnpm install @mantine/core @mantine/hooks postcss-preset-mantine postcss-simple-vars`
   - Restore `postcss.config.cjs` from git
   - Revert all component files to previous versions
   - Remove `app/globals.css`

### Browser Compatibility
**Tailwind CSS v4.1 requirements** (research.md:249-253):
- Safari 16.4+ ✅
- Chrome 111+ ✅
- Firefox 128+ ✅

**Current Next.js browser targets**: Likely modern browsers (check `browserslist` if configured)

**Risk**: Low - Tailwind v4 targets modern browsers, which aligns with Next.js defaults

### Known Issues
None identified - research is comprehensive and migration path is well-tested.

## References

- Related research: `planning/2025-12-22-mantine-to-tailwind-daisyui-migration/research.md`
- Tailwind CSS v4 docs: https://tailwindcss.com/docs
- DaisyUI docs: https://daisyui.com/docs/install/nextjs
- Similar migration (Remix → Next.js): `planning/2025-12-13-remix-to-nextjs-migration/`
- Mantine docs (for reference): https://mantine.dev/

## File Reference Map

| Mantine Component | Location | Tailwind Equivalent | New Location |
|-------------------|----------|---------------------|--------------|
| AppShell | app/components/app-shell-wrapper.tsx:30 | DaisyUI Navbar | app/components/app-shell-wrapper.tsx |
| Avatar | app/components/app-shell-wrapper.tsx:41 | DaisyUI Avatar | app/components/app-shell-wrapper.tsx |
| Badge | app/components/service.tsx:24 | Custom Badge | app/components/ui/badge.tsx |
| Button | app/components/app-shell-wrapper.tsx:59 | Custom Button | app/components/ui/button.tsx |
| Card | app/components/service.tsx:22 | Custom Card | app/components/ui/card.tsx |
| Container | app/page.tsx:65 | Tailwind Container | AppShellWrapper main |
| Grid | app/components/services-grid.tsx:8 | Tailwind Grid | Inline |
| Group | app/components/service.tsx:23 | Tailwind Flex | Inline |
| SegmentedControl | app/components/segmented-control/index.tsx:10 | Custom Tabs | app/components/segmented-control/index.tsx |
| Stack | app/config/page.tsx:49 | Tailwind Flex Col | Inline |
| Tabs | app/config/page.tsx:24 | Custom Tabs | app/components/ui/tabs.tsx |
| Text | app/components/service.tsx:31 | HTML + Tailwind | Inline |
| Title | app/config/page.tsx:22 | HTML Heading | Inline |
