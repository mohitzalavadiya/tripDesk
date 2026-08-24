"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { AgencyLifecycleBanner } from "./agency-lifecycle-banner";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Mobile Drawer & Bottom Navigation Bar */}
      <MobileNav open={mobileMenuOpen} setOpen={setMobileMenuOpen} />

      {/* Main workspace area */}
      <div className="flex flex-col flex-1 min-w-0 pb-16 md:pb-0">
        {/* Top Navbar */}
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Agency Lifecycle Notice Banner (Trial, Read-Only, Suspended) */}
        <AgencyLifecycleBanner />

        {/* Centered responsive main content area */}
        <main className="flex-1 w-full max-w-[1550px] mx-auto focus-visible:outline-none">
          {children}
        </main>
      </div>

      {/* Global sonner feedback provider */}
      <Toaster position="top-right" closeButton theme="light" />
    </div>
  );
}
