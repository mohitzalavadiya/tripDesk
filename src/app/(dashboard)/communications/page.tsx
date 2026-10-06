"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Compass,
  CalendarCheck,
  RotateCcw,
  X,
  Loader2,
  FileText,
  Bell,
  Building2,
  IndianRupee,
  Megaphone,
  ShieldAlert,
  Check,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NotificationChannel,
  CustomerNotificationType,
  NotificationDeliveryStatus,
  Customer,
  UserNotificationType,
} from "@prisma/client";
import {
  communicationClient,
  CommunicationLogItem,
} from "@/lib/api-client/communication-client";
import {
  notificationClient,
  UserNotificationItem,
} from "@/lib/api-client/notification-client";
import { customerClient } from "@/lib/api-client/customer-client";
import { tripClient } from "@/lib/api-client/trip-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CHANNEL_FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  [NotificationChannel.IN_APP]: "In-App Portal",
  [NotificationChannel.EMAIL]: "Email",
  [NotificationChannel.WHATSAPP]: "WhatsApp",
  [NotificationChannel.SMS]: "SMS",
};

const TYPE_FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  [CustomerNotificationType.BOOKING_CONFIRMED]: "Booking Confirmed",
  [CustomerNotificationType.PAYMENT_RECEIVED]: "Payment Received",
  [CustomerNotificationType.PAYMENT_DUE]: "Payment Reminder",
  [CustomerNotificationType.TRIP_CONFIRMED]: "Trip Confirmed",
  [CustomerNotificationType.TRIP_STARTED]: "Trip Started",
  [CustomerNotificationType.TRIP_COMPLETED]: "Trip Completed",
  [CustomerNotificationType.FEEDBACK_REQUEST]: "Feedback Request",
  [CustomerNotificationType.DOCUMENT_READY]: "Document Ready",
  [CustomerNotificationType.OPERATIONS_ALERT]: "Operations Alert",
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  [NotificationDeliveryStatus.SENT]: "Sent",
  [NotificationDeliveryStatus.DELIVERED]: "Delivered",
  [NotificationDeliveryStatus.READ]: "Read",
  [NotificationDeliveryStatus.PENDING]: "Pending",
  [NotificationDeliveryStatus.FAILED]: "Failed",
  [NotificationDeliveryStatus.CANCELLED]: "Cancelled",
};

const MODAL_CHANNEL_LABELS: Record<string, string> = {
  [NotificationChannel.IN_APP]: "In-App Portal",
  [NotificationChannel.EMAIL]: "Email",
  [NotificationChannel.WHATSAPP]: "WhatsApp",
};

const MODAL_CATEGORY_LABELS: Record<string, string> = {
  [CustomerNotificationType.OPERATIONS_ALERT]: "Operations Alert",
  [CustomerNotificationType.TRIP_UPDATED]: "Trip Update",
  [CustomerNotificationType.PAYMENT_DUE]: "Payment Reminder",
  [CustomerNotificationType.DOCUMENT_READY]: "Document Ready",
  [CustomerNotificationType.FEEDBACK_REQUEST]: "Feedback Request",
};

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
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function CommunicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"notifications" | "outbound">(
    tabParam === "notifications" ? "notifications" : "outbound"
  );

  useEffect(() => {
    if (tabParam === "notifications") {
      setActiveTab("notifications");
    } else if (tabParam === "outbound") {
      setActiveTab("outbound");
    }
  }, [tabParam]);

  // ─── INTERNAL SYSTEM NOTIFICATIONS STATE ────────────────────────────
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [notifLimit] = useState(20);
  const [notifTotalPages, setNotifTotalPages] = useState(1);
  const [notifTotal, setNotifTotal] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");

  const fetchNotificationsList = useCallback(async () => {
    try {
      setNotifLoading(true);
      const res = await notificationClient.getNotifications({
        page: notifPage,
        limit: notifLimit,
        unreadOnly: notifFilter === "unread" ? true : undefined,
      });
      if (res.success && res.data) {
        setNotifications(res.data.data || []);
        setNotifTotal(res.data.meta?.total || 0);
        setNotifTotalPages(res.data.meta?.totalPages || 1);
        setNotifUnreadCount(res.data.meta?.unreadCount || 0);
      }
    } catch (err: any) {
      console.error("Failed to load system notifications:", err);
      toast.error(err?.message || "Failed to load system notifications.");
    } finally {
      setNotifLoading(false);
    }
  }, [notifPage, notifLimit, notifFilter]);

  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotificationsList();
    }
  }, [activeTab, fetchNotificationsList]);

  const handleMarkNotifRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setNotifUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await notificationClient.markAsRead(id);
      if (!res.success) {
        toast.error("Failed to mark notification as read");
        fetchNotificationsList();
      }
    } catch {
      toast.error("Failed to mark notification as read");
      fetchNotificationsList();
    }
  };

  const handleMarkAllNotifRead = async () => {
    try {
      const res = await notificationClient.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setNotifUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleNotifRowClick = async (notif: UserNotificationItem) => {
    if (!notif.isRead) {
      try {
        await notificationClient.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setNotifUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Non-blocking
      }
    }
    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    } else {
      toast(notif.title, { description: notif.message });
    }
  };

  const getNotifCategoryIcon = (type: UserNotificationType) => {
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
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
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

  // ─── OUTBOUND COMMUNICATIONS STATE ──────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<CommunicationLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalCommunications: 0,
    deliveredCount: 0,
    pendingCount: 0,
    failedCount: 0,
    unreadCount: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | "">("");
  const [selectedType, setSelectedType] = useState<CustomerNotificationType | "">("");
  const [selectedStatus, setSelectedStatus] = useState<NotificationDeliveryStatus | "">("");

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CommunicationLogItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);

  // Send Message Form State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [formData, setFormData] = useState<{
    customerId: string;
    tripId: string;
    bookingId: string;
    channel: NotificationChannel;
    type: CustomerNotificationType;
    title: string;
    message: string;
  }>({
    customerId: "",
    tripId: "",
    bookingId: "",
    channel: NotificationChannel.IN_APP,
    type: CustomerNotificationType.OPERATIONS_ALERT,
    title: "",
    message: "",
  });

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const res = await communicationClient.getCommunications({
        search: search.trim() || undefined,
        channel: selectedChannel || undefined,
        type: selectedType || undefined,
        status: selectedStatus || undefined,
        page,
        limit,
      });

      setLogs(res.data || []);
      setTotalLogs(res.total || 0);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      console.error("Failed to load communications:", err);
      toast.error(err?.message || "Failed to load communications ledger.");
    } finally {
      setLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    try {
      const [custList, tripList] = await Promise.all([
        customerClient.getCustomers({ limit: 100 }),
        tripClient.getTrips({ limit: 100 }),
      ]);
      setCustomers((custList as any).data || []);
      setTrips((tripList as any).data || []);
    } catch (e) {
      console.error("Failed to load customer/trip auxiliary data", e);
    }
  };

  useEffect(() => {
    if (activeTab === "outbound") {
      fetchCommunications();
    }
  }, [page, selectedChannel, selectedType, selectedStatus, activeTab]);

  useEffect(() => {
    loadAuxiliaryData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCommunications();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.title || !formData.message) {
      toast.error("Please fill in recipient customer, title, and message.");
      return;
    }

    try {
      setIsSubmitting(true);
      await communicationClient.sendManual({
        customerId: formData.customerId,
        tripId: formData.tripId || undefined,
        bookingId: formData.bookingId || undefined,
        channel: formData.channel,
        type: formData.type,
        title: formData.title,
        message: formData.message,
      });

      toast.success("Communication dispatched successfully.");
      setIsSendModalOpen(false);
      setFormData({
        customerId: "",
        tripId: "",
        bookingId: "",
        channel: NotificationChannel.IN_APP,
        type: CustomerNotificationType.OPERATIONS_ALERT,
        title: "",
        message: "",
      });
      fetchCommunications();
    } catch (err: any) {
      console.error("Dispatch error:", err);
      toast.error(err?.message || "Failed to send communication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunAutomations = async () => {
    try {
      setIsAutomating(true);
      toast.info("Running automated communication sweeps...");
      const res = await communicationClient.runAutomation("all");
      toast.success(`Automations finished: ${res.summary?.totalDispatched ?? 0} sweeps processed.`);
      fetchCommunications();
    } catch (err: any) {
      console.error("Sweep error:", err);
      toast.error(err?.message || "Failed to execute sweeps.");
    } finally {
      setIsAutomating(false);
    }
  };

  const getStatusBadge = (status: NotificationDeliveryStatus) => {
    switch (status) {
      case NotificationDeliveryStatus.DELIVERED:
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Delivered
          </Badge>
        );
      case NotificationDeliveryStatus.READ:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Read
          </Badge>
        );
      case NotificationDeliveryStatus.SENT:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-bold text-[10px]">
            <Send className="w-3 h-3 mr-1" /> Sent
          </Badge>
        );
      case NotificationDeliveryStatus.PENDING:
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case NotificationDeliveryStatus.QUEUED:
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> Queued
          </Badge>
        );
      case NotificationDeliveryStatus.FAILED:
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none font-bold text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      case NotificationDeliveryStatus.CANCELLED:
        return (
          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-none font-bold text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatEventType = (type: CustomerNotificationType) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      <div className="max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* ─── HEADER ──────────────────────────────────────────────────────── */}
        <PageHeader
          title="Communication Center"
          description={
            activeTab === "notifications"
              ? "Internal operator notifications, quotation updates, booking milestones, and system alerts."
              : "Real-time traveler communications, automated reminders, and customer portal alert telemetry."
          }
          breadcrumbs={[{ label: "Communications" }]}
          primaryAction={
            activeTab === "outbound"
              ? {
                  label: "Send Customer Message",
                  onClick: () => setIsSendModalOpen(true),
                  icon: Plus,
                }
              : notifUnreadCount > 0
              ? {
                  label: "Mark All as Read",
                  onClick: handleMarkAllNotifRead,
                  icon: Check,
                }
              : undefined
          }
          secondaryActions={
            activeTab === "outbound"
              ? [
                  {
                    label: isAutomating ? "Running Sweeps..." : "Run Automation Sweeps",
                    onClick: handleRunAutomations,
                    icon: isAutomating ? Loader2 : RotateCcw,
                    variant: "outline",
                  },
                ]
              : [
                  {
                    label: "Refresh",
                    onClick: fetchNotificationsList,
                    icon: RefreshCw,
                    variant: "outline",
                  },
                ]
          }
        />

        {/* ─── NAVIGATION TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap pb-px">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === "notifications"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/30 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bell className="h-4 w-4 shrink-0" />
            System Notifications
            {notifUnreadCount > 0 && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full ml-1 shrink-0">
                {notifUnreadCount} new
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("outbound")}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === "outbound"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/30 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Outbound Communications
          </button>
        </div>

        {/* ─── TAB 1: SYSTEM NOTIFICATIONS VIEW ───────────────────────────── */}
        {activeTab === "notifications" ? (
          <div className="space-y-4">
            {/* Filter Pill Controls */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNotifFilter("all");
                    setNotifPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                    notifFilter === "all"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  All Notifications ({notifTotal})
                </button>
                <button
                  onClick={() => {
                    setNotifFilter("unread");
                    setNotifPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                    notifFilter === "unread"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <span>Unread Only</span>
                  {notifUnreadCount > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full",
                        notifFilter === "unread"
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 text-indigo-700"
                      )}
                    >
                      {notifUnreadCount}
                    </span>
                  )}
                </button>
              </div>

              {notifUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllNotifRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
              {notifLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs text-slate-400 font-medium">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Notifications</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {notifFilter === "unread"
                      ? "You have caught up with all internal notifications."
                      : "There are no notifications recorded for your account yet."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-120 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifRowClick(notif)}
                      className={cn(
                        "group relative flex items-start justify-between gap-4 p-4.5 hover:bg-slate-50/80 transition-colors cursor-pointer",
                        !notif.isRead && "bg-indigo-50/20"
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            !notif.isRead ? "bg-indigo-100/70" : "bg-slate-100"
                          )}
                        >
                          {getNotifCategoryIcon(notif.type)}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "text-xs",
                                !notif.isRead
                                  ? "font-bold text-slate-900"
                                  : "font-semibold text-slate-700"
                              )}
                            >
                              {notif.title}
                            </span>
                            {!notif.isRead && (
                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                                New
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* {notif.linkUrl && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800 pt-0.5">
                              View details <ExternalLink className="h-3 w-3" />
                            </span>
                          )} */}
                        </div>
                      </div>

                      {/* Right Action: Hover Mark as Read or Unread Indicator */}
                      <div className="flex items-center gap-2 shrink-0 self-center">
                        {!notif.isRead ? (
                          <>
                            <button
                              type="button"
                              aria-label="Mark notification as read"
                              title="Mark as read"
                              onClick={(e) => handleMarkNotifRead(e, notif.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 shadow-2xs cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 group-hover:hidden" />
                          </>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 hidden sm:inline-block">
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notification Pagination Bar */}
              {notifTotalPages > 1 && (
                <div className="p-3 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {(notifPage - 1) * notifLimit + 1} to{" "}
                    {Math.min(notifPage * notifLimit, notifTotal)} of {notifTotal} notifications
                  </span>
                  <div className="flex items-center gap-1 self-end sm:self-auto shrink-0 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={notifPage <= 1 || notifLoading}
                      onClick={() => setNotifPage((prev) => Math.max(1, prev - 1))}
                      className="h-8 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-bold text-slate-700 px-2 shrink-0 whitespace-nowrap">
                      {notifPage} / {notifTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={notifPage >= notifTotalPages || notifLoading}
                      onClick={() => setNotifPage((prev) => Math.min(notifTotalPages, prev + 1))}
                      className="h-8 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── TAB 2: OUTBOUND COMMUNICATIONS VIEW ─────────────────────────── */
          <div className="space-y-6">
            {/* 4 KPI SCORECARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Dispatches
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {summary.totalCommunications.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">All Channels</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Delivered & Read
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-700 tracking-tight">
                    {summary.deliveredCount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {summary.totalCommunications > 0
                      ? `${Math.round((summary.deliveredCount / summary.totalCommunications) * 100)}% Success`
                      : "100% Rate"}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Pending / Queued
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-700 tracking-tight">
                    {summary.pendingCount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] font-bold text-amber-600">Active Queue</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Failed / Cancelled
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-700 tracking-tight">
                    {summary.failedCount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] font-bold text-rose-600">Attention Items</span>
                </div>
              </div>
            </div>

            {/* FILTERS & SEARCH BAR */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <form
                onSubmit={handleSearchSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                {/* Search Term */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search traveler name, phone, subject..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9.5 rounded-xl bg-slate-50/70 border-slate-200 focus:bg-white"
                  />
                </div>

                {/* Channel Filter */}
                <div>
                  <Select
                    value={selectedChannel || "ALL"}
                    onValueChange={(val) => {
                      setSelectedChannel(val === "ALL" ? "" : (val as any));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full h-9.5 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                      <SelectValue placeholder="All">
                        {(val) => CHANNEL_FILTER_LABELS[val] ?? "All"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                      <SelectItem value="ALL">All Channels</SelectItem>
                      <SelectItem value={NotificationChannel.IN_APP}>In-App Portal</SelectItem>
                      <SelectItem value={NotificationChannel.EMAIL}>Email</SelectItem>
                      <SelectItem value={NotificationChannel.WHATSAPP}>WhatsApp</SelectItem>
                      <SelectItem value={NotificationChannel.SMS}>SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div>
                  <Select
                    value={selectedType || "ALL"}
                    onValueChange={(val) => {
                      setSelectedType(val === "ALL" ? "" : (val as any));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full h-9.5 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                      <SelectValue placeholder="All">
                        {(val) => TYPE_FILTER_LABELS[val] ?? "All"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                      <SelectItem value="ALL">All Event Types</SelectItem>
                      <SelectItem value={CustomerNotificationType.BOOKING_CONFIRMED}>Booking Confirmed</SelectItem>
                      <SelectItem value={CustomerNotificationType.PAYMENT_RECEIVED}>Payment Received</SelectItem>
                      <SelectItem value={CustomerNotificationType.PAYMENT_DUE}>Payment Reminder</SelectItem>
                      <SelectItem value={CustomerNotificationType.TRIP_CONFIRMED}>Trip Confirmed</SelectItem>
                      <SelectItem value={CustomerNotificationType.TRIP_STARTED}>Trip Started</SelectItem>
                      <SelectItem value={CustomerNotificationType.TRIP_COMPLETED}>Trip Completed</SelectItem>
                      <SelectItem value={CustomerNotificationType.FEEDBACK_REQUEST}>Feedback Request</SelectItem>
                      <SelectItem value={CustomerNotificationType.DOCUMENT_READY}>Document Ready</SelectItem>
                      <SelectItem value={CustomerNotificationType.OPERATIONS_ALERT}>Operations Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div>
                  <Select
                    value={selectedStatus || "ALL"}
                    onValueChange={(val) => {
                      setSelectedStatus(val === "ALL" ? "" : (val as any));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full h-9.5 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                      <SelectValue placeholder="All">
                        {(val) => STATUS_FILTER_LABELS[val] ?? "All"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value={NotificationDeliveryStatus.SENT}>Sent</SelectItem>
                      <SelectItem value={NotificationDeliveryStatus.DELIVERED}>Delivered</SelectItem>
                      <SelectItem value={NotificationDeliveryStatus.READ}>Read</SelectItem>
                      <SelectItem value={NotificationDeliveryStatus.PENDING}>Pending</SelectItem>
                      <SelectItem value={NotificationDeliveryStatus.FAILED}>Failed</SelectItem>
                      <SelectItem value={NotificationDeliveryStatus.CANCELLED}>Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>

            {/* COMMUNICATION HISTORY LEDGER TABLE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-extrabold text-slate-900">Communication Ledger</h2>
                  <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                    {totalLogs} Record{totalLogs !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchCommunications}
                  className="h-8 text-xs text-slate-500 hover:text-slate-900 px-2.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs text-slate-400 font-medium">Loading communication logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Communications Found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No matching communications were found for the selected criteria. Send a manual traveler message or trigger automated reminder sweeps.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Recipient / Customer</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4">Title & Preview</th>
                        <th className="py-3 px-4">Ref (Trip/Booking)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                            {new Date(log.sentAt || log.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{log.customerName || "Customer"}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{log.recipient || "N/A"}</div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">
                              {formatEventType(log.type)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {log.channel === NotificationChannel.IN_APP && (
                                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                              {log.channel === NotificationChannel.EMAIL && (
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                              )}
                              {log.channel === NotificationChannel.WHATSAPP && (
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              {log.channel === NotificationChannel.SMS && (
                                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              {CHANNEL_FILTER_LABELS[log.channel] || log.channel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-slate-900 truncate">{log.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{log.message}</div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                            {log.tripTitle ? (
                              <div className="font-semibold text-indigo-600 truncate max-w-[140px]">
                                {log.tripTitle}
                              </div>
                            ) : log.bookingNumber ? (
                              <div className="font-mono text-[10px] text-slate-600">
                                #{log.bookingNumber}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getStatusBadge(log.status)}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                                setIsDetailModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-800"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Outbound Pagination Bar */}
              {totalPages > 1 && (
                <div className="p-3 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, totalLogs)} of {totalLogs} dispatches
                  </span>
                  <div className="flex items-center gap-1 self-end sm:self-auto shrink-0 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      className="h-8 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-bold text-slate-700 px-2 shrink-0 whitespace-nowrap">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      className="h-8 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── SEND CUSTOMER MESSAGE MODAL ──────────────────────────────────── */}
        {isSendModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Send Customer Message
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Dispatch an immediate alert or update to traveler portal / email.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSendModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-3.5">
                {/* Target Customer */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Select Traveler / Customer *
                  </label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(val) =>
                      val && setFormData({ ...formData, customerId: val })
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500">
                      <SelectValue placeholder="Choose a recipient customer">
                        {(val) =>
                          customers.find((c) => c.id === val)?.name ||
                          "Choose a recipient customer"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50 max-h-56">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional Trip Reference */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Associate with Trip (Optional)
                  </label>
                  <Select
                    value={formData.tripId || "NONE"}
                    onValueChange={(val) =>
                      setFormData({
                        ...formData,
                        tripId: val && val !== "NONE" ? val : "",
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500">
                      <SelectValue placeholder="Select relevant itinerary">
                        {(val) =>
                          val === "NONE" || !val
                            ? "None (General Notification)"
                            : trips.find((t) => t.id === val)?.title || val
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50 max-h-56">
                      <SelectItem value="NONE">None (General Notification)</SelectItem>
                      {trips.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Channel
                    </label>
                    <Select
                      value={formData.channel}
                      onValueChange={(val) =>
                        val && setFormData({ ...formData, channel: val as NotificationChannel })
                      }
                    >
                      <SelectTrigger className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500">
                        <SelectValue placeholder="Select Channel">
                          {(val) => MODAL_CHANNEL_LABELS[val] ?? val}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                        <SelectItem value={NotificationChannel.IN_APP}>In-App Portal</SelectItem>
                        <SelectItem value={NotificationChannel.EMAIL}>Email</SelectItem>
                        <SelectItem value={NotificationChannel.WHATSAPP}>WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Category Type
                    </label>
                    <Select
                      value={formData.type}
                      onValueChange={(val) =>
                        val &&
                        setFormData({
                          ...formData,
                          type: val as CustomerNotificationType,
                        })
                      }
                    >
                      <SelectTrigger className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500">
                        <SelectValue placeholder="Select Category">
                          {(val) => MODAL_CATEGORY_LABELS[val] ?? val}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                        <SelectItem value={CustomerNotificationType.OPERATIONS_ALERT}>Operations Alert</SelectItem>
                        <SelectItem value={CustomerNotificationType.TRIP_UPDATED}>Trip Update</SelectItem>
                        <SelectItem value={CustomerNotificationType.PAYMENT_DUE}>Payment Reminder</SelectItem>
                        <SelectItem value={CustomerNotificationType.DOCUMENT_READY}>Document Ready</SelectItem>
                        <SelectItem value={CustomerNotificationType.FEEDBACK_REQUEST}>Feedback Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Title / Subject */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Subject / Title *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Airport Chauffeur Details for Arrival"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Message Content */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Message Body *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {formData.message.length}/5000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={5000}
                    placeholder="Type your message content to the customer..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-indigo-600"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSendModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Communication</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── DETAIL VIEW MODAL ────────────────────────────────────────────── */}
        {isDetailModalOpen && selectedLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Communication Details
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      ID: {selectedLog.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-600">Status</span>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Recipient
                    </span>
                    <span className="font-bold text-slate-900">
                      {selectedLog.customerName || "Traveler"}
                    </span>
                    <p className="text-[10px] text-slate-500">{selectedLog.recipient || "N/A"}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Channel & Type
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatEventType(selectedLog.type)}
                    </span>
                    <p className="text-[10px] text-slate-500">{selectedLog.channel}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Subject / Title
                  </span>
                  <p className="font-bold text-slate-900">{selectedLog.title}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Message Content
                  </span>
                  <p className="text-slate-800 whitespace-pre-wrap font-medium">
                    {selectedLog.message}
                  </p>
                </div>

                {selectedLog.failureReason && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1 text-rose-800">
                    <span className="text-[10px] font-bold block uppercase">
                      Failure / Skip Reason
                    </span>
                    <p className="text-xs">{selectedLog.failureReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div>
                    <span className="font-bold block">Created:</span>
                    {new Date(selectedLog.createdAt).toLocaleString("en-IN")}
                  </div>
                  <div>
                    <span className="font-bold block">Sent:</span>
                    {new Date(selectedLog.sentAt).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
