"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Inbox,
  FileText,
  FileCheck,
  CalendarCheck,
  IndianRupee,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
  Megaphone,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  notificationClient,
  UserNotificationItem,
} from "@/lib/api-client/notification-client";
import { UserNotificationType } from "@prisma/client";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function NotificationsPopover() {
  const router = useRouter();
  const { isPlatformOwner } = useAuth();
  const [notifications, setNotifications] = React.useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await notificationClient.getNotifications({ limit: 20 });
      if (res.success && res.data) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.meta?.unreadCount || 0);
      }
    } catch {
      // Non-blocking background fetch
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();

    // Periodic background refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationClient.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleNotificationClick = async (notif: UserNotificationItem) => {
    if (!notif.isRead) {
      try {
        await notificationClient.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Non-blocking
      }
    }

    setIsOpen(false);

    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    } else {
      toast(notif.title, { description: notif.message });
    }
  };

  const getCategoryIcon = (type: UserNotificationType) => {
    switch (type) {
      case UserNotificationType.AGENCY_SIGNUP:
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case UserNotificationType.SUBSCRIPTION_PAYMENT_SUBMITTED:
        return <IndianRupee className="h-4 w-4 text-amber-600" />;
      case UserNotificationType.SUBSCRIPTION_PAYMENT_VERIFIED:
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case UserNotificationType.SUBSCRIPTION_PAYMENT_REJECTED:
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case UserNotificationType.AGENCY_STATUS_CHANGED:
        return <ShieldAlert className="h-4 w-4 text-orange-600" />;
      case UserNotificationType.QUOTATION_ACCEPTED:
        return <FileCheck className="h-4 w-4 text-emerald-600" />;
      case UserNotificationType.QUOTATION_CHANGE_REQUESTED:
        return <FileText className="h-4 w-4 text-amber-600" />;
      case UserNotificationType.BOOKING_CREATED:
        return <CalendarCheck className="h-4 w-4 text-indigo-600" />;
      case UserNotificationType.PAYMENT_RECEIVED:
        return <IndianRupee className="h-4 w-4 text-blue-600" />;
      case UserNotificationType.CUSTOMER_ENQUIRY_CREATED:
        return <Inbox className="h-4 w-4 text-violet-600" />;
      case UserNotificationType.PLATFORM_ANNOUNCEMENT:
        return <Megaphone className="h-4 w-4 text-indigo-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            aria-label="Open notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-slate-50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4 stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 overflow-hidden bg-white border border-border rounded-xl shadow-lg mt-1 z-50"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto" />
              <p className="text-slate-400 text-[11px]">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-slate-700">No notifications yet</p>
              <p className="text-[11px] text-slate-400">You are all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80 cursor-pointer",
                  !notif.isRead && "bg-indigo-50/20"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    !notif.isRead ? "bg-indigo-100/70" : "bg-slate-100"
                  )}
                >
                  {getCategoryIcon(notif.type)}
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-xs truncate",
                        !notif.isRead
                          ? "font-bold text-slate-900"
                          : "font-medium text-slate-700"
                      )}
                    >
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                    {notif.message}
                  </p>
                  <span className="text-[9px] text-slate-400 block pt-0.5 font-mono">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-center">
          <button
            onClick={() => {
              setIsOpen(false);
              router.push(isPlatformOwner ? "/admin/audit-logs" : "/communications");
            }}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
          >
            {isPlatformOwner ? "View platform audit logs" : "View communication ledger"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
