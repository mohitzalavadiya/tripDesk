"use client";

import * as React from "react";
import { Menu, PlaneTakeoff, Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationsPopover } from "@/components/shared/notifications-popover";
import { UserMenu } from "@/components/shared/user-menu";
import Link from "next/link";

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({ onOpenMobileMenu, onToggleSidebar }: TopbarProps) {
  const { currentUser, currentAgency, isPlatformOwner } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-white/95 px-4 md:px-8 backdrop-blur-xs select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu Button */}
        <button
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 md:hidden cursor-pointer"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Context Indicator */}
        <div className="flex items-center gap-2.5">
          <Link
            href={isPlatformOwner ? "/admin" : "/dashboard"}
            className="flex items-center gap-2 font-bold tracking-tight text-foreground select-none"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded shrink-0 ${
                isPlatformOwner ? "bg-purple-600 text-white" : "bg-indigo-600 text-white"
              }`}
            >
              {isPlatformOwner ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <PlaneTakeoff className="h-4 w-4" />
              )}
            </div>
            <span className="text-sm font-black hidden sm:inline">TripDesk</span>
          </Link>

          {/* Agency Context Pill for Agency Owner */}
          {!isPlatformOwner ? (
            <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs">
              <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold text-indigo-900 truncate max-w-[160px] sm:max-w-[220px]">
                {currentAgency.name || "Agency"}
              </span>
              {currentAgency.plan && (
                <span className="text-[10px] text-indigo-500 font-mono font-semibold hidden md:inline">
                  ({currentAgency.plan})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg text-xs">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
              <span className="font-bold text-purple-900">Platform SaaS Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Center / Right Section */}
      <div className="flex items-center gap-3">
        <GlobalSearch />

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}
