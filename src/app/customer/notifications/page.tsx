"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Hotel,
  Car,
  Ticket,
  FileText,
  CreditCard,
  Compass,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calendar,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function CustomerNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [markingAll, setMarkingAll] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerPortalClient.getNotifications({
        unreadOnly: unreadOnly || undefined,
      });
      setNotifications(res.data || []);
    } catch (err: any) {
      if (err?.message?.includes("CUSTOMER_UNAUTHORIZED")) {
        router.push("/customer/login");
      } else {
        setError(err?.message || "Failed to load notifications.");
      }
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, router]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await customerPortalClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      toast.success("Notification marked as read.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as read.");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await customerPortalClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.startsWith("HOTEL_")) {
      return <Hotel className="w-5 h-5 text-purple-600" />;
    }
    if (type.startsWith("VEHICLE_")) {
      return <Car className="w-5 h-5 text-blue-600" />;
    }
    if (type.startsWith("ACTIVITY_")) {
      return <Ticket className="w-5 h-5 text-emerald-600" />;
    }
    if (type.startsWith("PAYMENT_")) {
      return <CreditCard className="w-5 h-5 text-amber-600" />;
    }
    if (type === "DOCUMENT_READY") {
      return <FileText className="w-5 h-5 text-indigo-600" />;
    }
    if (type.includes("ALERT") || type.includes("DELAY")) {
      return <AlertTriangle className="w-5 h-5 text-rose-600" />;
    }
    return <Compass className="w-5 h-5 text-indigo-600" />;
  };

  const filteredNotifications = React.useMemo(() => {
    let list = notifications;
    if (categoryFilter === "TRIPS") {
      list = list.filter((n) => n.type.startsWith("TRIP_") || n.type === "FEEDBACK_REQUEST");
    } else if (categoryFilter === "HOTELS") {
      list = list.filter((n) => n.type.startsWith("HOTEL_"));
    } else if (categoryFilter === "FLEET") {
      list = list.filter((n) => n.type.startsWith("VEHICLE_"));
    } else if (categoryFilter === "ACTIVITIES") {
      list = list.filter((n) => n.type.startsWith("ACTIVITY_"));
    } else if (categoryFilter === "DOCUMENTS") {
      list = list.filter((n) => n.type === "DOCUMENT_READY");
    } else if (categoryFilter === "PAYMENTS") {
      list = list.filter((n) => n.type.startsWith("PAYMENT_"));
    }
    return list;
  }, [notifications, categoryFilter]);

  const unreadTotal = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Back and Mark All Read Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/customer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Trips</span>
        </Link>

        {unreadTotal > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={markingAll}
            onClick={handleMarkAllAsRead}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-bold gap-1.5"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>Mark All Read</span>
          </Button>
        )}
      </div>

      {/* Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Trip Notifications & Alerts
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Live updates for your hotel reservations, chauffeur dispatches, activity passes, and payments.
              </p>
            </div>
          </div>

          {unreadTotal > 0 && (
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-bold">
              {unreadTotal} Unread
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        <button
          onClick={() => { setCategoryFilter("ALL"); setUnreadOnly(false); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "ALL" && !unreadOnly
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            unreadOnly
              ? "bg-rose-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Unread ({unreadTotal})
        </button>
        <button
          onClick={() => { setCategoryFilter("TRIPS"); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "TRIPS"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Trip Updates
        </button>
        <button
          onClick={() => { setCategoryFilter("HOTELS"); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "HOTELS"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Hotels
        </button>
        <button
          onClick={() => { setCategoryFilter("FLEET"); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "FLEET"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Transfers
        </button>
        <button
          onClick={() => { setCategoryFilter("ACTIVITIES"); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "ACTIVITIES"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Activities
        </button>
        <button
          onClick={() => { setCategoryFilter("DOCUMENTS"); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "DOCUMENTS"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => { setCategoryFilter("PAYMENTS"); }}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            categoryFilter === "PAYMENTS"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900"
          }`}
        >
          Payments
        </button>
      </div>

      {/* Notification Items List */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-semibold">Loading your alerts...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-rose-600 text-xs font-semibold">
          {error}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
          <Bell className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Notifications in this Category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You are all caught up! New travel confirmations and live status changes will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-3xl border p-5 sm:p-6 shadow-2xs transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !n.isRead
                  ? "bg-white border-indigo-500/40 ring-1 ring-indigo-500/20"
                  : "bg-white/80 border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
                  {getNotificationIcon(n.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {n.title}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {new Date(n.sentAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {!n.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="rounded-xl text-slate-500 hover:text-indigo-600 text-xs font-semibold h-8.5 px-3"
                  >
                    Mark Read
                  </Button>
                )}
                {n.linkUrl && (
                  <Link href={n.linkUrl}>
                    <Button
                      size="sm"
                      className="rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold h-8.5 gap-1.5 shadow-2xs transition-colors"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
