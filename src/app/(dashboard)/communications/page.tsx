"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  NotificationChannel,
  CustomerNotificationType,
  NotificationDeliveryStatus,
  Customer,
} from "@prisma/client";
import {
  communicationClient,
  CommunicationLogItem,
} from "@/lib/api-client/communication-client";
import { customerClient } from "@/lib/api-client/customer-client";
import { tripClient } from "@/lib/api-client/trip-client";
import { toast } from "sonner";

export default function CommunicationsPage() {
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
    fetchCommunications();
  }, [page, selectedChannel, selectedType, selectedStatus]);

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
    if (!formData.customerId) {
      toast.error("Please select a recipient customer.");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Please provide a title or subject.");
      return;
    }
    if (!formData.message.trim()) {
      toast.error("Please provide a message body.");
      return;
    }

    try {
      setIsSubmitting(true);
      await communicationClient.createCommunication({
        customerId: formData.customerId,
        tripId: formData.tripId || undefined,
        bookingId: formData.bookingId || undefined,
        channel: formData.channel,
        type: formData.type,
        title: formData.title.trim(),
        message: formData.message.trim(),
      });

      toast.success("Customer message dispatched successfully.");
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
      console.error("Failed to send message:", err);
      toast.error(err?.message || "Failed to send customer communication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunAutomations = async () => {
    try {
      setIsAutomating(true);
      const res = await communicationClient.runAutomation("all");
      toast.success(
        `Automations executed: ${res.summary.totalDispatched} reminder(s) queued or sent.`
      );
      fetchCommunications();
    } catch (err: any) {
      toast.error(err?.message || "Failed to trigger automation sweep.");
    } finally {
      setIsAutomating(false);
    }
  };

  const getChannelBadge = (channel: NotificationChannel) => {
    switch (channel) {
      case NotificationChannel.WHATSAPP:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp
          </span>
        );
      case NotificationChannel.EMAIL:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
            <Mail className="w-3 h-3 text-blue-600" /> Email
          </span>
        );
      case NotificationChannel.IN_APP:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
            <MessageSquare className="w-3 h-3 text-purple-600" /> In-App Portal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200/80">
            {channel}
          </span>
        );
    }
  };

  const getStatusBadge = (status: NotificationDeliveryStatus) => {
    switch (status) {
      case NotificationDeliveryStatus.DELIVERED:
      case NotificationDeliveryStatus.READ:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {status}
          </Badge>
        );
      case NotificationDeliveryStatus.SENT:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-bold text-[10px]">
            <Send className="w-3 h-3 mr-1" /> SENT
          </Badge>
        );
      case NotificationDeliveryStatus.PENDING:
      case NotificationDeliveryStatus.QUEUED:
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> {status}
          </Badge>
        );
      case NotificationDeliveryStatus.FAILED:
      case NotificationDeliveryStatus.CANCELLED:
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none font-bold text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" /> {status}
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
    <div className="space-y-6 pb-12">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Communication Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time traveler communications, automated reminders, and customer portal alert telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAutomations}
            disabled={isAutomating}
            className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 h-9"
          >
            {isAutomating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-600" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            )}
            Run Automation Sweeps
          </Button>

          <Button
            size="sm"
            onClick={() => setIsSendModalOpen(true)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-xs shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Send Customer Message
          </Button>
        </div>
      </div>

      {/* ─── 4 KPI SCORECARDS ────────────────────────────────────────────── */}
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

      {/* ─── FILTERS & SEARCH BAR ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search recipient, message, customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          {/* Channel Filter */}
          <div>
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value as any);
                setPage(1);
              }}
              className="w-full h-9 text-xs font-semibold px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-indigo-600"
            >
              <option value="">All Channels</option>
              <option value={NotificationChannel.IN_APP}>In-App Portal</option>
              <option value={NotificationChannel.EMAIL}>Email</option>
              <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
              <option value={NotificationChannel.SMS}>SMS</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as any);
                setPage(1);
              }}
              className="w-full h-9 text-xs font-semibold px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-indigo-600"
            >
              <option value="">All Event Types</option>
              <option value={CustomerNotificationType.BOOKING_CONFIRMED}>Booking Confirmed</option>
              <option value={CustomerNotificationType.PAYMENT_RECEIVED}>Payment Received</option>
              <option value={CustomerNotificationType.PAYMENT_DUE}>Payment Reminder</option>
              <option value={CustomerNotificationType.TRIP_CONFIRMED}>Trip Confirmed</option>
              <option value={CustomerNotificationType.TRIP_STARTED}>Trip Started</option>
              <option value={CustomerNotificationType.TRIP_COMPLETED}>Trip Completed</option>
              <option value={CustomerNotificationType.FEEDBACK_REQUEST}>Feedback Request</option>
              <option value={CustomerNotificationType.DOCUMENT_READY}>Document Ready</option>
              <option value={CustomerNotificationType.OPERATIONS_ALERT}>Operations Alert</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setPage(1);
              }}
              className="w-full h-9 text-xs font-semibold px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-indigo-600"
            >
              <option value="">All Statuses</option>
              <option value={NotificationDeliveryStatus.SENT}>Sent</option>
              <option value={NotificationDeliveryStatus.DELIVERED}>Delivered</option>
              <option value={NotificationDeliveryStatus.READ}>Read</option>
              <option value={NotificationDeliveryStatus.PENDING}>Pending</option>
              <option value={NotificationDeliveryStatus.FAILED}>Failed</option>
              <option value={NotificationDeliveryStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </form>
      </div>

      {/* ─── COMMUNICATION HISTORY LEDGER TABLE ──────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">Communication Ledger</h2>
            <Badge variant="outline" className="text-[10px] font-bold">
              {totalLogs} Record{totalLogs !== 1 ? "s" : ""}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCommunications}
            className="h-8 text-xs text-slate-500 hover:text-slate-900"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Recipient / Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Title & Preview</th>
                  <th className="py-3 px-4">Ref (Trip/Booking)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.customerName || "Customer"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.recipient || log.customerPhone || log.customerEmail || "No contact info"}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-700">
                        {formatEventType(log.type)}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getChannelBadge(log.channel)}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">{log.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{log.message}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                      {log.tripTitle && (
                        <div className="flex items-center gap-1 text-slate-800 font-semibold truncate max-w-[140px]">
                          <Compass className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{log.tripTitle}</span>
                        </div>
                      )}
                      {log.bookingNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          BK: {log.bookingNumber}
                        </div>
                      )}
                      {!log.tripTitle && !log.bookingNumber && (
                        <span className="text-slate-400 text-[10px]">Direct</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setIsDetailModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-bold"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── PAGINATION ─────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({totalLogs} items)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 w-8 p-0 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 w-8 p-0 rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SEND MESSAGE MODAL ───────────────────────────────────────────── */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Send Customer Communication
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch an in-app notice, email update, or WhatsApp message to a traveler.
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

            <form onSubmit={handleSendMessage} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Recipient Customer *
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full h-9 text-xs font-medium px-3 rounded-xl border border-slate-200 focus:outline-indigo-600"
                >
                  <option value="">Select a Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email || "No direct phone"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Related Trip (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Related Trip (Optional)
                </label>
                <select
                  value={formData.tripId}
                  onChange={(e) => setFormData({ ...formData, tripId: e.target.value })}
                  className="w-full h-9 text-xs font-medium px-3 rounded-xl border border-slate-200 focus:outline-indigo-600"
                >
                  <option value="">No specific trip (General Notice)</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.tripNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel & Event Type Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Channel *
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) =>
                      setFormData({ ...formData, channel: e.target.value as NotificationChannel })
                    }
                    className="w-full h-9 text-xs font-medium px-3 rounded-xl border border-slate-200 focus:outline-indigo-600"
                  >
                    <option value={NotificationChannel.IN_APP}>In-App Portal</option>
                    <option value={NotificationChannel.EMAIL}>Email</option>
                    <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Category Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as CustomerNotificationType,
                      })
                    }
                    className="w-full h-9 text-xs font-medium px-3 rounded-xl border border-slate-200 focus:outline-indigo-600"
                  >
                    <option value={CustomerNotificationType.OPERATIONS_ALERT}>Operations Alert</option>
                    <option value={CustomerNotificationType.TRIP_UPDATED}>Trip Update</option>
                    <option value={CustomerNotificationType.PAYMENT_DUE}>Payment Reminder</option>
                    <option value={CustomerNotificationType.DOCUMENT_READY}>Document Ready</option>
                    <option value={CustomerNotificationType.FEEDBACK_REQUEST}>Feedback Request</option>
                  </select>
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
  );
}
