"use client";

import { cn } from "~/lib/utils";
import { ReactNode, createContext, useContext, useState } from "react";

type TabsContextValue = {
  activeTab: string;
  setActiveTab: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs component");
  }
  return context;
}

type TabsProps = {
  children: ReactNode;
  defaultValue: string;
  className?: string;
};

export function Tabs({ children, defaultValue, className }: TabsProps): ReactNode {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  children: ReactNode;
  className?: string;
};

export function TabsList({ children, className }: TabsListProps): ReactNode {
  return (
    <div className={cn("tabs tabs-bordered mb-4 gap-2", className)} role="tablist">
      {children}
    </div>
  );
}

type TabsTabProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsTab({ value, children, className }: TabsTabProps): ReactNode {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      className={cn(
        "tab transition-all duration-200",
        isActive ? "tab-active font-semibold" : "hover:bg-base-200",
        className
      )}
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

export function TabsPanel({ value, children, className }: TabsPanelProps): ReactNode {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div className={cn("py-4", className)} role="tabpanel">
      {children}
    </div>
  );
}
