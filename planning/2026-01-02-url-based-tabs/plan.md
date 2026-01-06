# URL-Based Tabs Implementation Plan

## Overview

Convert the config page tabs from client-side state management to URL-based navigation using query parameters. This enables shareable/bookmarkable URLs, maintains consistency with the existing home page pattern, and allows the config page to remain a server component.

## Current State Analysis

**Current Implementation:**
- Config page (`app/config/page.tsx:17-34`) uses client-side Tabs component
- Tabs component (`app/components/ui/tabs.tsx:1-93`) uses React Context + useState for state management
- Tab state is lost on page refresh, cannot be bookmarked/shared
- Requires `"use client"` directive (client component)

**Existing Pattern:**
- Home page (`app/page.tsx:17-36`) already implements URL-based navigation with query parameters
- Uses `searchParams` prop and Next.js `Link` components
- Pattern: `/?show=all`, `/?show=failing`, `/?show=unknown`
- Server component with no client-side state

**Key Discovery:**
- Tabs component is only used in one location (`app/config/page.tsx`)
- No other components import or depend on the Tabs component
- Makes removal safe and straightforward

## Desired End State

After implementation:
- Config page uses URL query parameters: `/config?tab=parsed`, `/config?tab=raw`
- Tab state reflected in URL (shareable, bookmarkable)
- Config page remains a server component
- Tabs component removed from codebase
- Pattern consistent across application (home page + config page)

**Verification:**
1. Navigate to `/config` → defaults to parsed view
2. Click "Raw" tab → URL becomes `/config?tab=raw`
3. Click "Parsed" tab → URL becomes `/config?tab=parsed`
4. Refresh page → active tab persists
5. Browser back/forward → works correctly
6. Share URL → recipient sees correct tab

## What We're NOT Doing

- NOT changing the home page filter implementation (`?show=` params)
- NOT implementing nested route segments (`/config/raw`, `/config/parsed`)
- NOT using parallel routes or advanced Next.js routing features
- NOT adding new features or functionality to the config page
- NOT modifying the visual appearance or styling of tabs
- NOT keeping the Tabs component for future use

## Implementation Approach

**Strategy:** Follow the existing query parameter pattern from the home page to ensure consistency and minimize complexity.

**Why Query Parameters:**
1. Matches existing home page pattern (`?show=` params)
2. Minimal code changes (single file modification)
3. Server component compatible (page receives `searchParams`)
4. Team already familiar with this pattern
5. Simplest to implement and maintain

**Pattern to Replicate:**
The home page shows the ideal pattern at `app/page.tsx:17-36`:
- Server component receives `searchParams` prop
- Extract parameter with default value
- Use Next.js `Link` for navigation
- Apply active state styling with `cn()` utility
- Conditionally render content

## Phase 1: Update Config Page to Use URL Parameters

### Overview
Refactor `app/config/page.tsx` to use URL-based navigation with query parameters, following the exact pattern from the home page.

### Changes Required

#### 1. Config Page Component
**File**: `app/config/page.tsx`

**Step 1:** Add `searchParams` interface and update page function signature

Replace:
```tsx
export default async function ConfigPage() {
  const config = getConfig();
```

With:
```tsx
interface SearchParams {
  tab?: string;
}

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || "parsed";
  const config = getConfig();
```

**Step 2:** Remove Tabs imports

Remove line 2:
```tsx
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
```

**Step 3:** Add Link import

Add to import section (after line 4):
```tsx
import Link from "next/link";
import { cn } from "~/lib/utils";
```

**Step 4:** Replace Tabs component with Link-based navigation

Replace lines 17-34:
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

With:
```tsx
<div className="tabs tabs-bordered mb-4 gap-2" role="tablist">
  <Link
    href="?tab=parsed"
    className={cn("tab transition-all duration-200", {
      "tab-active font-semibold": activeTab === "parsed",
      "hover:bg-base-200": activeTab !== "parsed",
    })}
    role="tab"
  >
    Parsed
  </Link>
  <Link
    href="?tab=raw"
    className={cn("tab transition-all duration-200", {
      "tab-active font-semibold": activeTab === "raw",
      "hover:bg-base-200": activeTab !== "raw",
    })}
    role="tab"
  >
    Raw
  </Link>
</div>

<div className="py-4" role="tabpanel">
  {activeTab === "parsed" ? (
    <Pretty config={config} />
  ) : (
    <div className="mockup-code">
      <pre>
        <code>{JSON.stringify(config, undefined, 2)}</code>
      </pre>
    </div>
  )}
</div>
```

**Reasoning:**
- Matches DaisyUI classes from original Tabs component (`tabs tabs-bordered mb-4 gap-2`)
- Preserves styling (`transition-all duration-200`, `font-semibold`, `hover:bg-base-200`)
- Uses same ARIA roles for accessibility (`role="tablist"`, `role="tab"`, `role="tabpanel"`)
- Conditional rendering replaces TabsPanel show/hide logic

### Success Criteria

#### Automated Verification:
- [x] TypeScript type checking passes: `make -C . check` or `pnpm tsc --noEmit`
- [x] Build completes successfully: `pnpm build`
- [ ] Linting passes: `pnpm lint` (if configured)
- [ ] No console errors when loading page
- [x] Config page exports `force-dynamic` (line 6 should remain unchanged)

#### Manual Verification:
- [ ] Navigate to `/config` without params → shows parsed view by default
- [ ] Click "Raw" tab → URL changes to `/config?tab=raw` and shows raw JSON
- [ ] Click "Parsed" tab → URL changes to `/config?tab=parsed` and shows parsed view
- [ ] Refresh page on `/config?tab=raw` → still shows raw view
- [ ] Refresh page on `/config?tab=parsed` → still shows parsed view
- [ ] Browser back button works correctly (switches between tabs)
- [ ] Browser forward button works correctly
- [ ] Tab styling matches original (active tab is bold, hover effects work)
- [ ] No visual regressions in layout or spacing
- [ ] ARIA roles present for accessibility

---

## Phase 2: Remove Unused Tabs Component

### Overview
Delete the Tabs component file since it's no longer used anywhere in the codebase.

### Changes Required

#### 1. Delete Tabs Component
**File**: `app/components/ui/tabs.tsx`

**Action**: Delete the entire file

**Reasoning:**
- Only used in config page (verified by grep search)
- No other components import it
- Reduces codebase size and maintenance burden
- Follows decision to remove rather than keep for future use

### Success Criteria

#### Automated Verification:
- [x] File no longer exists: `test ! -f app/components/ui/tabs.tsx`
- [x] No imports of tabs component exist: `! grep -r "from.*tabs" app/`
- [x] TypeScript compilation still passes: `pnpm tsc --noEmit`
- [x] Build succeeds: `pnpm build`

#### Manual Verification:
- [ ] Config page still works correctly
- [ ] No broken imports or runtime errors

---

## Phase 3: Testing & Verification

### Overview
Comprehensive testing to ensure the migration is complete and correct.

### Testing Strategy

#### Unit Tests
**Note:** This codebase doesn't appear to have unit tests for UI components. If tests exist:
- Update any tests that import or test the Tabs component
- Add tests for config page URL parameter handling

#### Integration Tests
**Manual E2E Testing Flow:**

1. **Default Behavior:**
   - Navigate to `/config`
   - Verify URL remains `/config` (no query param added automatically)
   - Verify parsed view is displayed
   - Verify "Parsed" tab has active styling

2. **Tab Switching:**
   - Click "Raw" tab
   - Verify URL changes to `/config?tab=raw`
   - Verify raw JSON is displayed
   - Verify "Raw" tab has active styling
   - Verify "Parsed" tab no longer has active styling

3. **Direct URL Access:**
   - Navigate directly to `/config?tab=raw`
   - Verify raw view is displayed immediately
   - Navigate directly to `/config?tab=parsed`
   - Verify parsed view is displayed immediately
   - Navigate to `/config?tab=invalid`
   - Verify parsed view is displayed (default behavior)

4. **Browser Navigation:**
   - Navigate through tabs (Parsed → Raw → Parsed)
   - Press browser back button → should go to previous tab
   - Press browser forward button → should advance to next tab
   - Verify URL reflects each navigation

5. **Page Refresh:**
   - While on `/config?tab=raw`, refresh page
   - Verify raw view persists after refresh
   - While on `/config?tab=parsed`, refresh page
   - Verify parsed view persists after refresh

6. **URL Sharing:**
   - Copy `/config?tab=raw` URL
   - Open in new tab/window
   - Verify raw view is displayed

### Performance Considerations

**Before (Client-Side Tabs):**
- Requires client-side JavaScript bundle
- React Context + useState overhead
- Client component hydration required

**After (URL-Based Navigation):**
- Server component (smaller JS bundle)
- No client-side state management
- No hydration overhead for tab logic
- Faster initial page load

**Expected Improvements:**
- Reduced JavaScript bundle size (Tabs component removed)
- Faster Time to Interactive (no client component hydration)
- Better SEO (server-rendered with URL state)

### Migration Notes

**No Data Migration Required:**
- No database changes
- No user data affected
- No configuration changes needed

**Deployment Notes:**
- Safe to deploy (backward compatible)
- No feature flags needed
- Users visiting old `/config` URL will see default parsed view
- No breaking changes to API or data flow

**Rollback Plan:**
If issues arise:
1. Revert commit with changes
2. Original Tabs component and usage will be restored
3. No data cleanup required

## References

- Related research: `planning/2026-01-02-url-based-tabs/research.md`
- Existing pattern: `app/page.tsx:17-36` (home page searchParams implementation)
- Current Tabs component: `app/components/ui/tabs.tsx:1-93`
- Current config page: `app/config/page.tsx:17-34`
- Next.js searchParams docs: [Next.js Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional)
