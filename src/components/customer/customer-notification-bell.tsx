"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { customerPortalClient } from "@/lib/api-client";

export function CustomerNotificationBell() {
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    async function checkUnread() {
      try {
        const count = await customerPortalClient.getUnreadNotificationsCount();
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch {
        // silent fail on unauthenticated
      }
    }
    checkUnread();

    const interval = setInterval(checkUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/customer/notifications"
      className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors flex items-center justify-center group"
      title="Notifications & Trip Alerts"
    >
      <Bell className="w-5 h-5 group-hover:scale-105 transition-transform" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs border-2 border-white animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
