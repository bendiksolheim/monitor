---
date: 2026-01-02T00:00:00Z
researcher: Claude Sonnet 4.5
git_commit: 35e3183a99be26f574aaa8ce611f3c7ce5f4e72e
branch: main
repository: bendiksolheim/monitor
topic: "Converting client-side tabs to URL-based navigation"
tags: [research, codebase, tabs, navigation, url-state, next.js]
status: complete
last_updated: 2026-01-02
last_updated_by: Claude Sonnet 4.5
---

# Research: Converting Client-Side Tabs to URL-Based Navigation

**Date**: 2026-01-02T00:00:00Z
**Researcher**: Claude Sonnet 4.5
**Git Commit**: 35e3183a99be26f574aaa8ce611f3c7ce5f4e72e
**Branch**: main
**Repository**: bendiksolheim/monitor

## Research Question

The config page (`app/config/page.tsx`) currently uses a client-side Tabs component that maintains tab state in React Context with `useState`. This prevents the active tab from being reflected in the URL and requires the tabs component to be a client component. How can we refactor this to:

1. Reflect active tab state in the URL (shareable/bookmarkable)
2. Simplify the tabs component to not require client-side state
3. Maintain the same UI/UX

## Summary

The application already has a URL-based navigation pattern implemented on the home page using query parameters (`?show=all/failing/unknown`). **The tabs component is only used in one location** (the config page), making migration straightforward.

**Three viable approaches exist:**

1. **Query Parameters** (`/config?tab=raw`) - Simplest, matches existing home page pattern
2. **Nested Route Segments** (`/config/raw`, `/config/parsed`) - Clean URLs, traditional routing
3. **Parallel Routes** (`@tabs` slot) - Most complex, overkill for this use case

**Recommendation**: Use **Query Parameters** approach to match the existing pattern on the home page and minimize code changes.

## Detailed Findings

### Current State Analysis

#### Tabs Component Implementation

**File**: `app/components/ui/tabs.tsx:1-93`

The current implementation:
- Uses `"use client"` directive (client component)
- Manages state with React Context + `useState`
- Implements 4 components: `Tabs`, `TabsList`, `TabsTab`, `TabsPanel`
- Uses DaisyUI styling (`tabs tabs-bordered`)
- Includes accessibility features (ARIA roles)

**State Management**:
```tsx
const [activeTab, setActiveTab] = useState(defaultValue);

<TabsContext.Provider value={{ activeTab, setActiveTab }}>
  {children}
</TabsContext.Provider>
```

**Limitations**:
- Tab state is lost on page refresh
- Cannot bookmark/share specific tab view
- Requires client-side JavaScript
- State not visible in URL

#### Current Usage

**File**: `app/config/page.tsx:17-34`

```tsx
<Tabs defaultValue="parsed">
  <TabsList>
    <TabsTab value="parsed">Parsed</TabsTab>
    <TabsTab value="raw">Raw</TabsTab>
  </TabsList>

  <TabsPanel value="parsed">
    <Pretty config={config} />
  </TabsPanel>

  <TabsPanel value="raw">
    <div className="mockup-code">
      <pre>
        <code>{JSON.stringify(config, undefined, 2)}</code>
      </pre>
    </div>
  </TabsPanel>
</Tabs>
```

**Impact**: Only 1 file uses the Tabs component, making changes low-risk.

### Existing URL-Based Pattern

#### Home Page Implementation

**File**: `app/page.tsx:11-36`

The home page already implements URL-based navigation with query parameters:

```tsx
interface SearchParams {
  show?: string;
}

export default async function Page({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams;
  const show = getShowParam(params.show);
  // ... filter services based on 'show' param
}

// Navigation UI
{statuses.map((status) => (
  <Link
    href={`?show=${status}`}
    key={status}
    className={cn("capitalize tab", { "tab-active": status === show })}
    role="tab"
  >
    {status}
  </Link>
))}
```

**Key Features**:
- Server component (no client-side state)
- Uses Next.js `Link` component
- Active state determined by comparing URL param to current value
- DaisyUI `tabs` classes for styling
- URLs: `/?show=all`, `/?show=failing`, `/?show=unknown`

**Pattern Benefits**:
- Already proven and working in the codebase
- Developers familiar with this approach
- Server-side rendering
- Bookmarkable/shareable

### Routing Architecture

**File Structure**:
```
app/
├── layout.tsx              (Root layout, force-dynamic)
├── page.tsx                (Home - uses ?show= query params)
├── config/
│   └── page.tsx            (Config - uses client Tabs)
├── nodes/
│   └── page.tsx            (Nodes page)
└── components/
    └── ui/
        └── tabs.tsx        (Client component with state)
```

**Routing Patterns**:
- Simple file-based routing (no dynamic segments, route groups, or parallel routes)
- All pages are async Server Components
- Root layout exports `force-dynamic` for fresh data
- Only the home page uses URL parameters currently

## Architecture Insights

### Next.js App Router Approaches

Based on Next.js v16.1.1 documentation, three approaches are available for URL-based tabs:

#### 1. Query Parameter Approach (?tab=value)

**URL Structure**: `/config?tab=raw`, `/config?tab=parsed`

**Implementation**:
```tsx
// app/config/page.tsx (Server Component)
export default async function ConfigPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams;
  const activeTab = params.tab || 'parsed';

  return (
    <div>
      <TabNavigation activeTab={activeTab} />
      {activeTab === 'parsed' ? <Pretty /> : <RawJSON />}
    </div>
  );
}

// Separate component for navigation (can be Server Component)
function TabNavigation({ activeTab }: { activeTab: string }) {
  return (
    <div className="tabs tabs-bordered">
      <Link
        href="?tab=parsed"
        className={cn("tab", { "tab-active": activeTab === "parsed" })}
      >
        Parsed
      </Link>
      <Link
        href="?tab=raw"
        className={cn("tab", { "tab-active": activeTab === "raw" })}
      >
        Raw
      </Link>
    </div>
  );
}
```

**Pros**:
- ✅ Simplest implementation
- ✅ Matches existing home page pattern
- ✅ Server Component compatible (page receives searchParams)
- ✅ Minimal file structure changes
- ✅ Query params easily combine with other filters

**Cons**:
- ❌ Slightly verbose URLs (`?tab=raw` visible)

#### 2. Nested Route Segments (/config/raw, /config/parsed)

**URL Structure**: `/config/raw`, `/config/parsed`

**File Structure**:
```
app/
└── config/
    ├── layout.tsx         (shared navigation)
    ├── raw/
    │   └── page.tsx
    ├── parsed/
    │   └── page.tsx
    └── page.tsx           (default/redirect)
```

**Implementation**:
```tsx
// app/config/layout.tsx
'use client'
import { usePathname } from 'next/navigation'

export default function ConfigLayout({ children }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="tabs tabs-bordered">
        <Link
          href="/config/parsed"
          className={cn("tab", {
            "tab-active": pathname === "/config/parsed"
          })}
        >
          Parsed
        </Link>
        <Link
          href="/config/raw"
          className={cn("tab", {
            "tab-active": pathname === "/config/raw"
          })}
        >
          Raw
        </Link>
      </nav>
      {children}
    </>
  );
}

// app/config/raw/page.tsx
export default async function RawPage() {
  const config = getConfig();
  return <RawJSON config={config} />;
}

// app/config/parsed/page.tsx
export default async function ParsedPage() {
  const config = getConfig();
  return <Pretty config={config} />;
}
```

**Pros**:
- ✅ Clean, semantic URLs
- ✅ Traditional routing pattern
- ✅ Each route can have independent loading/error states

**Cons**:
- ❌ More files to manage (3 pages instead of 1)
- ❌ Navigation requires `usePathname()` client hook OR prop passing
- ❌ More boilerplate

#### 3. Parallel Routes (@tabs)

**URL Structure**: `/config/raw`, `/config/parsed`

**File Structure**:
```
app/
└── config/
    ├── layout.tsx
    ├── @tabs/
    │   ├── layout.tsx
    │   ├── raw/
    │   │   └── page.tsx
    │   ├── parsed/
    │   │   └── page.tsx
    │   └── default.tsx
    └── page.tsx
```

**Pros**:
- ✅ Advanced Next.js pattern
- ✅ Independent loading states per slot
- ✅ Great for complex dashboards

**Cons**:
- ❌ Most complex approach
- ❌ Requires understanding of parallel routes
- ❌ Overkill for simple 2-tab scenario
- ❌ Needs default.tsx for fallback handling

### Comparison Table

| Aspect | Query Params | Nested Segments | Parallel Routes |
|--------|------------|-----------------|-----------------|
| **URL Example** | `/config?tab=raw` | `/config/raw` | `/config/raw` |
| **Complexity** | Low | Medium | High |
| **Files Changed** | 1 file | 3-4 files | 5+ files |
| **Matches Existing Pattern** | Yes (home page) | No | No |
| **Server Component** | Yes | Mostly | Yes |
| **Learning Curve** | Low | Low | High |
| **Recommended** | ✅ **YES** | Maybe | No |

## Code References

### Files to Modify (Query Params Approach)

1. **`app/config/page.tsx:1-143`** - Convert to use searchParams
2. **`app/components/ui/tabs.tsx:1-93`** - Can be simplified or removed

### Files to Reference (Existing Pattern)

- `app/page.tsx:11-36` - Existing searchParams implementation
- `app/page.tsx:28-36` - Link-based tab navigation pattern

### Navigation Component Pattern

The home page shows the ideal pattern to replicate:

```tsx
// Server Component - receives searchParams
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const activeValue = params.show || 'default';

  return (
    <div className="tabs">
      {options.map((option) => (
        <Link
          href={`?show=${option}`}
          className={cn("tab", { "tab-active": option === activeValue })}
        >
          {option}
        </Link>
      ))}
    </div>
  );
}
```

## Implementation Plan

### Recommended Approach: Query Parameters

**Why?**
1. Matches existing home page pattern (`?show=` params)
2. Minimal code changes (single file)
3. Server Component compatible
4. Team already familiar with this pattern
5. Simplest to implement and maintain

**Steps**:

1. **Modify `app/config/page.tsx`**:
   - Add `searchParams` prop to page function
   - Extract `tab` param with default value `'parsed'`
   - Replace `<Tabs>` component with navigation Links
   - Conditionally render content based on `tab` value
   - Remove import of Tabs components

2. **Simplify or remove `app/components/ui/tabs.tsx`**:
   - Since only used in one place, can be removed
   - Alternatively, keep for potential future use

3. **Test**:
   - Navigate to `/config` (should default to parsed view)
   - Click "Raw" tab → URL should become `/config?tab=raw`
   - Click "Parsed" tab → URL should become `/config?tab=parsed`
   - Refresh page → should maintain active tab
   - Browser back/forward → should work correctly

**Expected Changes**:
- Remove client-side state management
- Enable URL sharing/bookmarking
- Make tabs component server-side
- Consistent pattern across app (home + config both use query params)

## Alternative Approach: Nested Segments

If clean URLs without query params are preferred (`/config/raw` instead of `/config?tab=raw`):

**Steps**:

1. **Create route structure**:
   ```
   app/config/
   ├── layout.tsx           (new - contains tab navigation)
   ├── parsed/
   │   └── page.tsx         (new - parsed view)
   ├── raw/
   │   └── page.tsx         (new - raw view)
   └── page.tsx             (modify - redirect to /config/parsed)
   ```

2. **Implement layout with navigation**:
   - Use `usePathname()` client hook for active state
   - Or use prop passing from individual pages

3. **Create separate pages**:
   - Each page fetches config independently
   - Render specific view

**Trade-offs**:
- More files to manage
- Requires client hook for active state detection OR prop passing
- Doesn't match existing pattern in app
- More code to maintain

## Open Questions

1. **Should the Tabs component be removed or kept?**
   - Currently only used in one location
   - Could be useful for future features
   - Recommendation: Keep but document that URL-based navigation is preferred

2. **Should we use query params or nested segments?**
   - Query params match existing pattern
   - Nested segments give cleaner URLs
   - Recommendation: Query params for consistency

3. **Should the home page filter remain query-based?**
   - Currently uses `?show=all/failing/unknown`
   - Works well and should remain unchanged
   - Provides consistency if config uses same pattern

4. **Default tab behavior?**
   - When visiting `/config`, should it show parsed view?
   - Recommendation: Yes, default to `parsed` (current default)
   - URL becomes `/config?tab=parsed` on first interaction

## Conclusion

Converting the config page tabs from client-side state to URL-based navigation is straightforward. The **Query Parameter approach** is recommended because it:

- Matches the existing pattern on the home page
- Requires minimal code changes (single file modification)
- Maintains full server component benefits
- Enables shareable/bookmarkable URLs
- Is familiar to the team

The tabs component can be simplified to a server-side navigation component using Next.js `Link` with query parameters, eliminating the need for client-side state management while preserving the exact same UI/UX.
