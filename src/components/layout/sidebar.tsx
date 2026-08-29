"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaneTakeoff, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { agencyNavigationConfig, adminNavigationConfig, secondaryNavigation } from "@/lib/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, isPlatformOwner } = useAuth();
  const isPlatform = isPlatformOwner || pathname.startsWith("/admin");
  const navSections = isPlatform ? adminNavigationConfig : agencyNavigationConfig;

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/30 transition-all duration-300 ease-in-out z-30 select-none shrink-0",
          collapsed ? "w-[72px]" : "w-[256px]"
        )}
      >
        {/* Branding Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border/30 shrink-0">
          <Link
            href={isPlatform ? "/admin" : "/dashboard"}
            className="flex items-center gap-2.5 font-bold tracking-tight text-white focus-visible:ring-1 focus-visible:ring-indigo-400 rounded-md"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm shrink-0 ${
                isPlatform ? "bg-purple-600" : "bg-indigo-600"
              }`}
            >
              {isPlatform ? (
                <ShieldCheck className="h-5 w-5 text-white" />
              ) : (
                <PlaneTakeoff className="h-5 w-5 text-white stroke-[2]" />
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-white">
                  Trip<span className={isPlatform ? "text-purple-400" : "text-indigo-400"}>Desk</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                  {isPlatform ? "SaaS Platform" : "Agency Suite"}
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 no-scrollbar">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <h4 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 select-none">
                  {section.title}
                </h4>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Tooltip key={item.label} disabled={!collapsed}>
                      <TooltipTrigger
                        render={
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                              isActive
                                ? isPlatform
                                  ? "bg-purple-600/15 text-white font-semibold"
                                  : "bg-indigo-600/10 text-white font-semibold"
                                : "text-slate-400 hover:text-white hover:bg-sidebar-accent/50"
                            )}
                          >
                            {/* Active state vertical outline indicator */}
                            {isActive && (
                              <span
                                className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md ${
                                  isPlatform ? "bg-purple-500" : "bg-indigo-500"
                                }`}
                              />
                            )}

                            <Icon
                              className={cn(
                                "h-5 w-5 shrink-0 transition-colors",
                                isActive
                                  ? isPlatform
                                    ? "text-purple-400"
                                    : "text-indigo-400"
                                  : "text-slate-400 group-hover:text-white"
                              )}
                            />

                            {!collapsed && (
                              <span className="truncate flex-1 animate-in fade-in duration-150">
                                {item.label}
                              </span>
                            )}

                            {!collapsed && item.badge && (
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 leading-none select-none",
                                  item.badgeVariant === "success" && "bg-emerald-500/15 text-emerald-400",
                                  item.badgeVariant === "info" && "bg-blue-500/15 text-blue-400",
                                  item.badgeVariant === "warning" && "bg-amber-500/15 text-amber-400",
                                  item.badgeVariant === "travel" && "bg-purple-500/15 text-purple-400"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        }
                      />
                      <TooltipContent
                        side="right"
                        className="bg-slate-900 border border-slate-800 text-white px-2 py-1 text-xs rounded-md shadow-md"
                      >
                        {item.label}
                        {item.badge && (
                          <span className="ml-1.5 font-bold text-slate-400">({item.badge})</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Support section */}
        <div className="p-3 border-t border-sidebar-border/30 shrink-0">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Tooltip key={item.label} disabled={!collapsed}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                        isActive
                          ? "bg-indigo-600/10 text-white"
                          : "text-slate-400 hover:text-white hover:bg-sidebar-accent/50"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-indigo-500" />
                      )}
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate flex-1 animate-in fade-in duration-150">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  }
                />
                <TooltipContent
                  side="right"
                  className="bg-slate-900 border border-slate-800 text-white px-2 py-1 text-xs rounded-md"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-10 w-full items-center justify-center rounded-lg hover:bg-sidebar-accent text-slate-400 hover:text-white transition-colors cursor-pointer mt-2"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
