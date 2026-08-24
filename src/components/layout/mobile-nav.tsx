"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Compass,
  Plus,
  Menu,
  X,
  PlaneTakeoff,
  ShieldCheck,
  Building,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agencyNavigationConfig, adminNavigationConfig } from "@/lib/navigation";
import { useAuth } from "@/context/auth-context";

interface MobileNavProps {
  open: boolean;
  setOpen: (val: boolean) => void;
}

export function MobileNav({ open, setOpen }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();
  const isPlatformOwner = currentUser.role === "TRIPDESK_OWNER";
  const navSections = isPlatformOwner ? adminNavigationConfig : agencyNavigationConfig;

  // Bottom navigation items for mobile
  const bottomNavItems = isPlatformOwner
    ? [
        { label: "Admin", href: "/admin", icon: Home },
        { label: "Agencies", href: "/admin/agencies", icon: Building },
        { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
        { label: "More", onClick: () => setOpen(true), icon: Menu },
      ]
    : [
        { label: "Home", href: "/dashboard", icon: Home },
        { label: "Customers", href: "/customers", icon: Users },
        {
          label: "Create",
          onClick: () => router.push("/trips/new"),
          icon: Plus,
          isCreate: true,
        },
        { label: "Trips", href: "/trips", icon: Compass, badge: "9" },
        { label: "More", onClick: () => setOpen(true), icon: Menu },
      ];

  return (
    <>
      {/* 1. Mobile Sidebar Drawer Overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop click dismiss */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />

          {/* Drawer contents */}
          <div className="relative flex w-full max-w-[280px] flex-col bg-sidebar text-sidebar-foreground p-5 shadow-2xl animate-in slide-in-from-left duration-250 ease-out z-50">
            {/* Header branding & close button */}
            <div className="flex items-center justify-between pb-4 border-b border-sidebar-border/30 mb-4">
              <Link
                href={isPlatformOwner ? "/admin" : "/dashboard"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 font-bold tracking-tight text-white"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded ${
                    isPlatformOwner ? "bg-purple-600" : "bg-indigo-600"
                  }`}
                >
                  {isPlatformOwner ? (
                    <ShieldCheck className="h-4.5 w-4.5 text-white" />
                  ) : (
                    <PlaneTakeoff className="h-4.5 w-4.5 text-white" />
                  )}
                </div>
                <span className="text-base font-black">
                  Trip<span className={isPlatformOwner ? "text-purple-400" : "text-indigo-400"}>Desk</span>
                </span>
              </Link>

              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-accent text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation item groups */}
            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <h4 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 select-none">
                    {section.title}
                  </h4>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                            isActive
                              ? isPlatformOwner
                                ? "bg-purple-600/20 text-white font-semibold"
                                : "bg-indigo-600/20 text-white font-semibold"
                              : "text-slate-400 hover:text-white hover:bg-sidebar-accent/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive
                                ? isPlatformOwner
                                  ? "text-purple-400"
                                  : "text-indigo-400"
                                : "text-slate-400 group-hover:text-white"
                            )}
                          />
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && (
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
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-white/95 px-2 backdrop-blur-md">
        {bottomNavItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href : false;

          if (item.isCreate) {
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className="flex -mt-6 h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-4 ring-white hover:bg-indigo-700 transition-all cursor-pointer"
                aria-label="Create item"
              >
                <Icon className="h-6 w-6 stroke-[2.5]" />
              </button>
            );
          }

          if (item.onClick) {
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className="flex flex-1 flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={idx}
              href={item.href || "#"}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 transition-colors relative",
                isActive ? "text-indigo-600 font-semibold" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
