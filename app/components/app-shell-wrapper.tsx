"use client";

import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { IconHeartbeat, IconSettings, IconDatabase } from "@tabler/icons-react";

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

export function AppShellWrapper({ children, operational, numberDown, menu }: AppShellWrapperProps) {
  return (
    <div className="min-h-screen bg-base-200">
      {/* Navigation Bar */}
      <nav className="navbar bg-base-100 border-b border-base-300 h-13 px-4 shadow-sm">
        <div className="navbar-start">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">Monitor</span>
          </div>
        </div>

        {/* Center: Status Badge */}
        <div className="navbar-center">
          <Badge variant={operational ? "success" : "error"} size="lg">
            {operational ? "All good ✌️" : `${numberDown} service${numberDown > 1 ? "s" : ""} down`}
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
      <main className="container mx-auto mt-4 px-4">{children}</main>
    </div>
  );
}
