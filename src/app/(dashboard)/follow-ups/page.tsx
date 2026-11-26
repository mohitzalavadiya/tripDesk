"use client";

import { useAuth } from "@/context/auth-context";
import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";

import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  enquiryClient,
  EnquiryAssignee,
  EnquiryWithRelations,
  followUpClient,
  FollowUpSummaryStats,
  FollowUpWithRelations,
} from "@/lib/api-client";
import { EnquiryPriority, FollowUpStatus, FollowUpType } from "@prisma/client";
import { STRUCTURED_CONTACT_OUTCOMES } from "@/lib/utils/crm-urgency";
import { getTodayBoundaries } from "@/lib/utils/timezone";
import { QuickLogModal } from "@/components/enquiries/quick-log-modal";
import {
AlertCircle,
AlertTriangle,
ArrowRight,
CalendarDays,
Check,
CheckCircle2,
ChevronLeft,
ChevronRight,
Clock,
Filter,
Loader2,
Mail,
MessageSquare,
Phone,
PhoneCall,
Plus,
RotateCcw,
Search,
Sparkles,
Video,
X
} from "lucide-react";

const OUTCOME_PRESETS: { code: string; label: string; qualifying: boolean }[] = [
  { code: STRUCTURED_CONTACT_OUTCOMES.CONNECTED_MEANINGFUL, label: "Connected / Discussed", qualifying: true },
  { code: STRUCTURED_CONTACT_OUTCOMES.QUOTATION_DISCUSSED, label: "Quote Discussed", qualifying: true },
  { code: STRUCTURED_CONTACT_OUTCOMES.REQUIREMENTS_GATHERED, label: "Requirements Gathered", qualifying: true },
  { code: STRUCTURED_CONTACT_OUTCOMES.NO_ANSWER, label: "No Answer", qualifying: false },
  { code: STRUCTURED_CONTACT_OUTCOMES.BUSY, label: "Busy", qualifying: false },
  { code: STRUCTURED_CONTACT_OUTCOMES.WRONG_NUMBER, label: "Wrong Number", qualifying: false },
  { code: STRUCTURED_CONTACT_OUTCOMES.MESSAGE_LEFT, label: "Left Message", qualifying: false },
];
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
const TYPE_FILTER_LABELS: Record<string, string> = {
  all: "All Channels",
  CALL: "Call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  MEETING: "Meeting",
  OTHER: "Other",
};

const PRIORITY_FILTER_LABELS: Record<string, string> = {
  all: "All Priorities",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Statuses",
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function FollowUpsPage() {
  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("FOLLOW_UPS", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Follow-ups & CRM Activity"
          badgeText="Access Restricted"
          description="You do not have permission to view this section. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  // Data States
  const [followUps, setFollowUps] = React.useState<FollowUpWithRelations[]>([]);
  const [summary, setSummary] = React.useState<FollowUpSummaryStats>({
    overdueCount: 0,
    todayCount: 0,
    upcomingCount: 0,
    completedCount: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Scope & Filters
  const [scope, setScope] = React.useState<"overdue" | "today" | "upcoming" | "completed" | "all">("today");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [assignedUserFilter, setAssignedUserFilter] = React.useState<string>("all");
  const [assignees, setAssignees] = React.useState<EnquiryAssignee[]>([]);
  const [datePreset, setDatePreset] = React.useState<string>("all");
  const [startDateFilter, setStartDateFilter] = React.useState<string>("");
  const [endDateFilter, setEndDateFilter] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Quick Log Modal State
  const [quickLogEnquiry, setQuickLogEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [quickLogFollowUpId, setQuickLogFollowUpId] = React.useState<string | null>(null);
  const [isQuickLogOpen, setIsQuickLogOpen] = React.useState(false);
  const [loadingQuickLogId, setLoadingQuickLogId] = React.useState<string | null>(null);

  // Modal States
  const [completeModalOpen, setCompleteModalOpen] = React.useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = React.useState(false);
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const [activeFollowUp, setActiveFollowUp] = React.useState<FollowUpWithRelations | null>(null);

  // Complete Modal Form State
  const [outcome, setOutcome] = React.useState("");
  const [completeNotes, setCompleteNotes] = React.useState("");
  const [scheduleNext, setScheduleNext] = React.useState(false);
  const [nextType, setNextType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [nextPriority, setNextPriority] = React.useState<EnquiryPriority>(EnquiryPriority.MEDIUM);
  const [nextDate, setNextDate] = React.useState("");
  const [nextTime, setNextTime] = React.useState("10:00");
  const [nextNotes, setNextNotes] = React.useState("");
  const [savingAction, setSavingAction] = React.useState(false);

  // Reschedule Modal Form State
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleTime, setRescheduleTime] = React.useState("10:00");
  const [rescheduleNotes, setRescheduleNotes] = React.useState("");

  // Cancel Modal Form State
  const [cancelReason, setCancelReason] = React.useState("");

  // Create Modal Form State
  const [enquiries, setEnquiries] = React.useState<EnquiryWithRelations[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = React.useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = React.useState("");
  const [createType, setCreateType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [createPriority, setCreatePriority] = React.useState<EnquiryPriority>(EnquiryPriority.MEDIUM);
  const [createDate, setCreateDate] = React.useState("");
  const [createTime, setCreateTime] = React.useState("10:00");
  const [createNotes, setCreateNotes] = React.useState("");
  const [modalEnquirySearch, setModalEnquirySearch] = React.useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync scope and filters from URL parameters on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlScope = params.get("scope");
      if (urlScope && ["overdue", "today", "upcoming", "completed", "all"].includes(urlScope)) {
        setScope(urlScope as any);
      }
      const urlType = params.get("type");
      if (urlType) setTypeFilter(urlType);
      const urlPriority = params.get("priority");
      if (urlPriority) setPriorityFilter(urlPriority);
      const urlStatus = params.get("status");
      if (urlStatus) setStatusFilter(urlStatus);
      const urlSearch = params.get("search");
      if (urlSearch) setSearch(urlSearch);
    }
  }, []);

  const handleScopeChange = (newScope: "overdue" | "today" | "upcoming" | "completed" | "all") => {
    setScope(newScope);
    setPage(1);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("scope", newScope);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Load summary and list
  const fetchData = React.useCallback(async (isSilent = false) => {
    const silent = isSilent || followUps.length > 0;
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [summaryRes, followUpsRes] = await Promise.all([
        followUpClient.getSummary({
          type: typeFilter !== "all" ? (typeFilter as FollowUpType) : undefined,
          priority: priorityFilter !== "all" ? (priorityFilter as EnquiryPriority) : undefined,
          search: debouncedSearch || undefined,
          assignedToUserId: assignedUserFilter !== "all" ? assignedUserFilter : undefined,
          startDate: startDateFilter || undefined,
          endDate: endDateFilter || undefined,
        }),
        followUpClient.getFollowUps({
          scope,
          status: statusFilter !== "all" ? (statusFilter as FollowUpStatus) : undefined,
          type: typeFilter !== "all" ? (typeFilter as FollowUpType) : undefined,
          priority: priorityFilter !== "all" ? (priorityFilter as EnquiryPriority) : undefined,
          search: debouncedSearch || undefined,
          assignedToUserId: assignedUserFilter !== "all" ? assignedUserFilter : undefined,
          startDate: startDateFilter || undefined,
          endDate: endDateFilter || undefined,
          page,
          limit: 20,
        }),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      if (followUpsRes.success && followUpsRes.data) {
        setFollowUps(followUpsRes.data);
        if (followUpsRes.meta) {
          setPagination(followUpsRes.meta);
        }
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      } else {
        setError(err?.message || "Failed to load follow-ups.");
      }
    } finally {
      setLoading(false);
    }
  }, [scope, statusFilter, typeFilter, priorityFilter, assignedUserFilter, startDateFilter, endDateFilter, debouncedSearch, page, followUps.length]);

    // Fetch authorized assignees on mount
  React.useEffect(() => {
    enquiryClient
      .getAssignees()
      .then((res) => {
        if (res.success && res.data) {
          setAssignees(res.data);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load active enquiries for create modal with search beyond 100 limit
  const loadEnquiriesForCreate = async (searchQuery?: string) => {
    try {
      setLoadingEnquiries(true);
      const res = await enquiryClient.getEnquiries({
        limit: 50,
        search: searchQuery?.trim() || undefined,
      });
      if (res.success && res.data) {
        const active = res.data.filter((e) => e.status !== "LOST" && e.status !== "CANCELLED");
        setEnquiries(active);
        if (active.length > 0 && !selectedEnquiryId) {
          setSelectedEnquiryId(active[0].id);
        }
      }
    } catch {
      toast.error("Failed to load enquiries list");
    } finally {
      setLoadingEnquiries(false);
    }
  };

  React.useEffect(() => {
    if (!createModalOpen) return;
    const timer = setTimeout(() => {
      loadEnquiriesForCreate(modalEnquirySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [modalEnquirySearch, createModalOpen]);

  const handleOpenCreateModal = () => {
    const tomorrow = new Date(Date.now() + 86400000);
    setCreateDate(tomorrow.toISOString().split("T")[0]);
    setCreateTime("10:00");
    setCreateNotes("");
    setCreateType(FollowUpType.CALL);
    setCreatePriority(EnquiryPriority.MEDIUM);
    loadEnquiriesForCreate();
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiryId) {
      toast.error("Please select a lead/enquiry.");
      return;
    }
    if (!createDate) {
      toast.error("Please select a scheduled date.");
      return;
    }

    try {
      setSavingAction(true);
      const scheduledDateTime = new Date(`${createDate}T${createTime || "10:00"}:00`);

      const res = await followUpClient.createFollowUp({
        enquiryId: selectedEnquiryId,
        type: createType,
        priority: createPriority,
        scheduledAt: scheduledDateTime,
        notes: createNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Follow-up scheduled successfully!");
        setCreateModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule follow-up.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenComplete = (fu: FollowUpWithRelations) => {
    setActiveFollowUp(fu);
    setOutcome("");
    setCompleteNotes("");
    setScheduleNext(false);
    const nextWeek = new Date(Date.now() + 86400000 * 3);
    setNextDate(nextWeek.toISOString().split("T")[0]);
    setNextTime("10:00");
    setNextType(FollowUpType.CALL);
    setNextPriority(EnquiryPriority.MEDIUM);
    setNextNotes("");
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUp) return;

    try {
      setSavingAction(true);
      let nextPayload = null;
      if (scheduleNext && nextDate) {
        nextPayload = {
          type: nextType,
          priority: nextPriority,
          scheduledAt: new Date(`${nextDate}T${nextTime || "10:00"}:00`),
          notes: nextNotes.trim() || undefined,
        };
      }

      const res = await followUpClient.completeFollowUp(activeFollowUp.id, {
        outcome: outcome.trim() || undefined,
        notes: completeNotes.trim() || undefined,
        scheduleNext,
        nextFollowUp: nextPayload,
      });

      if (res.success) {
        toast.success(
          scheduleNext
            ? "Follow-up completed & next interaction scheduled!"
            : "Follow-up marked as completed!"
        );
        setCompleteModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete follow-up.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenReschedule = (fu: FollowUpWithRelations) => {
    setActiveFollowUp(fu);
    const existingDate = new Date(fu.scheduledAt);
    setRescheduleDate(existingDate.toISOString().split("T")[0]);
    setRescheduleTime(
      `${String(existingDate.getHours()).padStart(2, "0")}:${String(existingDate.getMinutes()).padStart(2, "0")}`
    );
    setRescheduleNotes("");
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUp) return;
    if (!rescheduleDate) {
      toast.error("Please pick a new date.");
      return;
    }

    try {
      setSavingAction(true);
      const scheduledDateTime = new Date(`${rescheduleDate}T${rescheduleTime || "10:00"}:00`);

      const res = await followUpClient.rescheduleFollowUp(activeFollowUp.id, {
        scheduledAt: scheduledDateTime,
        notes: rescheduleNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Follow-up rescheduled successfully!");
        setRescheduleModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to reschedule follow-up.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenCancel = (fu: FollowUpWithRelations) => {
    setActiveFollowUp(fu);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUp) return;

    try {
      setSavingAction(true);
      const res = await followUpClient.cancelFollowUp(activeFollowUp.id, {
        reason: cancelReason.trim() || "Cancelled by agency owner",
      });

      if (res.success) {
        toast.success("Follow-up cancelled.");
        setCancelModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel follow-up.");
    } finally {
      setSavingAction(false);
    }
  };

  const getTypeIcon = (type: FollowUpType) => {
    switch (type) {
      case "CALL":
        return <Phone className="h-3.5 w-3.5 text-blue-600" />;
      case "WHATSAPP":
        return <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />;
      case "EMAIL":
        return <Mail className="h-3.5 w-3.5 text-indigo-600" />;
      case "MEETING":
        return <Video className="h-3.5 w-3.5 text-purple-600" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-600" />;
    }
  };

  const getPriorityBadge = (p: EnquiryPriority) => {
    switch (p) {
      case "URGENT":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Urgent</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">High</Badge>;
      case "MEDIUM":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Medium</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Low</Badge>;
    }
  };

  const checkUrgency = (fu: FollowUpWithRelations) => {
    if (fu.status !== "PENDING") {
      return { isOverdue: false, isToday: false, isUpcoming: false, overdueDays: 0, overdueLabel: "" };
    }
    const { start: todayStart, end: todayEnd } = getTodayBoundaries("Asia/Kolkata");
    const schTime = new Date(fu.scheduledAt).getTime();
    const isOverdue = schTime < todayStart.getTime();
    const daysDiff = isOverdue ? Math.max(1, Math.floor((todayStart.getTime() - schTime) / (1000 * 60 * 60 * 24))) : 0;
    return {
      isOverdue,
      isToday: schTime >= todayStart.getTime() && schTime <= todayEnd.getTime(),
      isUpcoming: schTime > todayEnd.getTime(),
      overdueDays: daysDiff,
      overdueLabel: isOverdue ? (daysDiff === 1 ? "Overdue 1d" : `Overdue ${daysDiff}d`) : "",
    };
  };

  const isOverdue = (fu: FollowUpWithRelations) => checkUrgency(fu).isOverdue;
  const isToday = (fu: FollowUpWithRelations) => checkUrgency(fu).isToday;
  const isUpcoming = (fu: FollowUpWithRelations) => checkUrgency(fu).isUpcoming;

  const handleOpenQuickLog = async (fu: FollowUpWithRelations) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }
    if (!fu.enquiry?.id) return;
    try {
      setLoadingQuickLogId(fu.id);
      const res = await enquiryClient.getEnquiry(fu.enquiry.id);
      if (res.success && res.data) {
        setQuickLogEnquiry(res.data);
        setQuickLogFollowUpId(fu.id);
        setIsQuickLogOpen(true);
      } else {
        toast.error("Failed to load enquiry details.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load enquiry details.");
    } finally {
      setLoadingQuickLogId(null);
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    statusFilter !== "all" ||
    assignedUserFilter !== "all" ||
    datePreset !== "all" ||
    startDateFilter ||
    endDateFilter ||
    scope !== "today"
  );

  const handleResetFilters = () => {
    setScope("today");
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setAssignedUserFilter("all");
    setDatePreset("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/50 pb-4 md:pb-6">
      {isReadOnly && <ReadOnlyBanner />}

      <div className="max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-4">
        <PageHeader
          title="CRM Follow-ups & Callbacks"
          description="Streamline customer touchpoints, track callbacks, log interaction outcomes, and prevent lost leads."
          breadcrumbs={[{ label: "CRM" }, { label: "Follow-ups" }]}
          primaryAction={{
            label: "Schedule Follow-up",
            icon: Plus,
            onClick: handleOpenCreateModal,
          }}
        />

        <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI TELEMETRY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleScopeChange("overdue")}
            className={`p-4 rounded-xl border text-left transition-all bg-white shadow-sm flex flex-col justify-between cursor-pointer ${
              scope === "overdue"
                ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 tracking-wider uppercase">Overdue</span>
              <div className="p-2 rounded-lg bg-rose-100/70 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">{summary.overdueCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Requires immediate attention</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange("today")}
            className={`p-4 rounded-xl border text-left transition-all bg-white shadow-sm flex flex-col justify-between cursor-pointer ${
              scope === "today"
                ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 tracking-wider uppercase">Today</span>
              <div className="p-2 rounded-lg bg-amber-100/70 text-amber-600">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">{summary.todayCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Scheduled for today</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange("upcoming")}
            className={`p-4 rounded-xl border text-left transition-all bg-white shadow-sm flex flex-col justify-between cursor-pointer ${
              scope === "upcoming"
                ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">Upcoming</span>
              <div className="p-2 rounded-lg bg-blue-100/70 text-blue-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">{summary.upcomingCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Scheduled future calls</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange("completed")}
            className={`p-4 rounded-xl border text-left transition-all bg-white shadow-sm flex flex-col justify-between cursor-pointer ${
              scope === "completed"
                ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 tracking-wider uppercase">Completed</span>
              <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">{summary.completedCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">Recorded interactions</div>
            </div>
          </button>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {(["today", "overdue", "upcoming", "completed", "all"] as const).map((tab) => (
              <Button
                key={tab}
                variant={scope === tab ? "default" : "outline"}
                size="sm"
                onClick={() => handleScopeChange(tab)}
                className={`capitalize text-xs font-medium cursor-pointer ${
                  scope === tab
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900 border-slate-200"
                }`}
              >
                {tab === "today" && `Today (${summary.todayCount})`}
                {tab === "overdue" && `Overdue (${summary.overdueCount})`}
                {tab === "upcoming" && `Upcoming (${summary.upcomingCount})`}
                {tab === "completed" && `Completed (${summary.completedCount})`}
                {tab === "all" && `All Tasks (${summary.totalPending + summary.completedCount})`}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search lead or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-9 h-9.5 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9.5 w-32 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                <SelectValue placeholder="All Channels">
                  {(val) => TYPE_FILTER_LABELS[val] ?? "All Channels"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="CALL">Call</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="MEETING">Meeting</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(val) => {
                setPriorityFilter(val || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9.5 w-32 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                <SelectValue placeholder="All Priorities">
                  {(val) => PRIORITY_FILTER_LABELS[val] ?? "All Priorities"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9.5 w-32 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                <SelectValue placeholder="All Statuses">
                  {(val) => STATUS_FILTER_LABELS[val] ?? "All Statuses"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Assigned Consultant Filter */}
            <Select
              value={assignedUserFilter}
              onValueChange={(val) => {
                setAssignedUserFilter(val || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9.5 w-36 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                <SelectValue placeholder="All Consultants" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                <SelectItem value="all">All Consultants</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name || a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Preset Filter */}
            <Select
              value={datePreset}
              onValueChange={(val) => {
                setDatePreset(val || "all");
                const today = new Date();
                if (val === "today") {
                  const todayStr = today.toISOString().split("T")[0];
                  setStartDateFilter(todayStr);
                  setEndDateFilter(todayStr);
                } else if (val === "this_week") {
                  const startOfWeek = new Date(today);
                  startOfWeek.setDate(today.getDate() - today.getDay());
                  const endOfWeek = new Date(today);
                  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
                  setStartDateFilter(startOfWeek.toISOString().split("T")[0]);
                  setEndDateFilter(endOfWeek.toISOString().split("T")[0]);
                } else if (val === "this_month") {
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  setStartDateFilter(startOfMonth.toISOString().split("T")[0]);
                  setEndDateFilter(endOfMonth.toISOString().split("T")[0]);
                } else {
                  setStartDateFilter("");
                  setEndDateFilter("");
                }
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9.5 w-32 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 gap-1 px-2.5 rounded-xl cursor-pointer"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchData()}
              title="Refresh"
              className="h-9.5 w-9.5 text-slate-600 border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* MAIN TABLE CONTENT */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading && followUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading CRM follow-ups...</p>
            </div>
          ) : error && followUps.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to load follow-ups</h3>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <Button onClick={() => fetchData()} size="sm" variant="outline">
                Retry
              </Button>
            </div>
          ) : followUps.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No follow-ups found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                {hasActiveFilters
                  ? "No follow-up tasks match your selected filters. Try clearing or relaxing your filters."
                  : scope === "overdue"
                  ? "Great job! You have no overdue callbacks."
                  : scope === "today"
                  ? "No follow-ups scheduled for today. Create one to keep leads warm."
                  : scope === "upcoming"
                  ? "No upcoming follow-ups scheduled."
                  : scope === "completed"
                  ? "No completed follow-ups recorded yet."
                  : "No follow-up tasks match your selected filters."}
              </p>
              <div className="flex items-center justify-center gap-2">
                {hasActiveFilters && (
                  <Button onClick={handleResetFilters} size="sm" variant="outline" className="gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    Reset Filters
                  </Button>
                )}
                <Button onClick={handleOpenCreateModal} size="sm" className="bg-indigo-600 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule New Follow-up
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-420px)] min-h-[300px] overflow-y-auto custom-scrollbar overscroll-contain">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                  <TableRow className="border-slate-200">
                    <TableHead className="w-[180px] text-xs font-semibold text-slate-700">Scheduled Time</TableHead>
                    <TableHead className="w-[240px] text-xs font-semibold text-slate-700">Customer & Lead</TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold text-slate-700">Type & Priority</TableHead>
                    <TableHead className="w-[150px] text-xs font-semibold text-slate-700">Assigned Consultant</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Notes / Outcome</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-[240px] text-right text-xs font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUps.map((fu) => {
                    const urgency = checkUrgency(fu);

                    return (
                      <TableRow
                        key={fu.id}
                        className={`hover:bg-slate-50/60 transition-colors border-slate-100 ${
                          urgency.isOverdue ? "bg-rose-50/25 border-l-2 border-l-rose-400" : urgency.isToday ? "bg-amber-50/25 border-l-2 border-l-amber-400" : ""
                        }`}
                      >
                        <TableCell className="align-top py-3.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                              {new Date(fu.scheduledAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {new Date(fu.scheduledAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {urgency.isOverdue && (
                              <Badge className="mt-1 w-fit text-[10px] bg-rose-100 text-rose-800 border-rose-200 font-bold gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                                <Clock className="h-2.5 w-2.5 text-rose-600" />
                                {urgency.overdueLabel || "Overdue"}
                              </Badge>
                            )}
                            {urgency.isToday && (
                              <Badge className="mt-1 w-fit text-[10px] bg-amber-100 text-amber-800 border-amber-200 font-bold gap-1">
                                <Clock className="h-2.5 w-2.5 text-amber-600" />
                                Due Today
                              </Badge>
                            )}
                            {urgency.isUpcoming && (
                              <Badge className="mt-1 w-fit text-[10px] bg-sky-50 text-sky-800 border-sky-200 font-medium gap-1">
                                <CalendarDays className="h-2.5 w-2.5 text-sky-600" />
                                Upcoming
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          <div className="flex flex-col">
                            {fu.enquiry?.customer?.id ? (
                              <Link
                                href={`/customers/${fu.enquiry.customer.id}`}
                                className="font-semibold text-xs text-slate-900 hover:text-indigo-600 hover:underline flex items-center gap-1 group/cust"
                              >
                                <span>{fu.enquiry.customer.name || "Anonymous Customer"}</span>
                                <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover/cust:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span className="font-semibold text-xs text-slate-900">
                                {fu.enquiry?.customer?.name || "Anonymous Customer"}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                              {fu.enquiry?.customer?.phone && (
                                <a
                                  href={`tel:${fu.enquiry.customer.phone}`}
                                  className="hover:text-indigo-600 flex items-center gap-1 font-mono"
                                >
                                  <PhoneCall className="h-2.5 w-2.5 text-slate-400" />
                                  {fu.enquiry.customer.phone}
                                </a>
                              )}
                              {fu.enquiry?.customer?.phone && (
                                <a
                                  href={`https://wa.me/${fu.enquiry.customer.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 rounded font-medium transition-colors"
                                  title="Open WhatsApp Click-to-Chat"
                                >
                                  <MessageSquare className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                            {fu.enquiry?.id && (
                              <Link
                                href={`/enquiries/${fu.enquiry.id}`}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mt-1 group/enq"
                              >
                                <span>
                                  {fu.enquiry.enquiryNumber} • {fu.enquiry.destination}
                                </span>
                                <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover/enq:opacity-100 transition-opacity" />
                              </Link>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 capitalize">
                              {getTypeIcon(fu.type)}
                              <span>{fu.type.toLowerCase()}</span>
                            </div>
                            <div>{getPriorityBadge(fu.priority)}</div>
                          </div>
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          {fu.enquiry?.assignedToUser?.name || fu.enquiry?.assignedTo ? (
                            <div
                              className="flex items-center gap-1.5"
                              title={`Assigned to ${fu.enquiry.assignedToUser?.name || fu.enquiry.assignedTo}`}
                            >
                              <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(fu.enquiry.assignedToUser?.name || fu.enquiry.assignedTo || "U").slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-slate-800 truncate max-w-[120px]">
                                  {fu.enquiry.assignedToUser?.name || fu.enquiry.assignedTo}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          <div className="text-xs text-slate-700 max-w-md">
                            {fu.notes && (
                              <p className="line-clamp-2 text-slate-600">{fu.notes}</p>
                            )}
                            {fu.outcome && (
                              <div className="mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                                <strong>Outcome:</strong> {fu.outcome}
                              </div>
                            )}
                            {!fu.notes && !fu.outcome && (
                              <span className="text-slate-400 italic text-[11px]">No notes recorded</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          {fu.status === "COMPLETED" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                              <Check className="h-3 w-3" />
                              Done
                            </Badge>
                          ) : fu.status === "CANCELLED" ? (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200">Cancelled</Badge>
                          ) : (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>
                          )}
                        </TableCell>

                        <TableCell className="align-top py-3.5 text-right">
                          {fu.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isReadOnly || loadingQuickLogId === fu.id}
                                onClick={() => handleOpenQuickLog(fu)}
                                className="h-7 px-2 text-xs text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300 font-semibold gap-1 cursor-pointer"
                                title="Quick Log customer interaction and update follow-up"
                              >
                                {loadingQuickLogId === fu.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                                ) : (
                                  <Phone className="h-3 w-3 text-teal-600" />
                                )}
                                <span>Quick Log</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenComplete(fu)}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm font-medium"
                              >
                                <Check className="h-3 w-3" />
                                Complete
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReschedule(fu)}
                                className="h-7 px-2 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                              >
                                Reschedule
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenCancel(fu)}
                                title="Cancel Task"
                                className="h-7 w-7 text-slate-400 hover:text-rose-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {fu.completedAt
                                ? `Completed on ${new Date(fu.completedAt).toLocaleDateString("en-IN")}`
                                : "Archived"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(page - 1) * pagination.limit + 1} to{" "}
                {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} tasks
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="h-7 px-2 border-slate-200"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* COMPLETE MODAL */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Complete Follow-up Call / Interaction
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record interaction outcomes and optionally queue the next touchpoint.
            </DialogDescription>
          </DialogHeader>

          {activeFollowUp && (
            <form onSubmit={handleCompleteSubmit} className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-900">
                  {activeFollowUp.enquiry?.customer?.name} • {activeFollowUp.enquiry?.destination}
                </div>
                <div className="text-slate-500">
                  Lead Ref: {activeFollowUp.enquiry?.enquiryNumber} • Type: {activeFollowUp.type}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Interaction Outcome / Client Response
                  </label>
                  <span className="text-[10px] text-slate-400">Select preset or type below</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {OUTCOME_PRESETS.map((p) => {
                    const isActive = outcome === p.code || outcome === p.label;
                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setOutcome(p.code)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                          isActive
                            ? p.qualifying
                              ? "bg-teal-100 text-teal-800 border-teal-300 font-semibold shadow-2xs"
                              : "bg-rose-100 text-rose-800 border-rose-300 font-semibold shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="e.g. Client requested customized 4-star hotel quotes; liked the itinerary"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="text-xs border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Internal Notes</label>
                <Textarea
                  placeholder="Add any internal details, client objections, or specific preferences..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  rows={2}
                  className="text-xs border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>

              {/* SCHEDULE NEXT TOGGLE */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Schedule Next Follow-up</span>
                    <span className="text-[11px] text-slate-500">Auto-create the next interaction for this lead</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleNext}
                    onChange={(e) => setScheduleNext(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {scheduleNext && (
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next Type</label>
                        <Select value={nextType} onValueChange={(val: any) => setNextType(val)}>
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CALL">Call</SelectItem>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="MEETING">Meeting</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Priority</label>
                        <Select value={nextPriority} onValueChange={(val: any) => setNextPriority(val)}>
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 block">Next Follow-up Date</label>
                        <div className="flex items-center gap-1">
                          {[
                            { label: "Tomorrow", offset: 1 },
                            { label: "+2 Days", offset: 2 },
                            { label: "+1 Week", offset: 7 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                const target = new Date();
                                target.setDate(target.getDate() + preset.offset);
                                setNextDate(target.toISOString().split("T")[0]);
                              }}
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer shadow-2xs"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={nextDate}
                          onChange={(e) => setNextDate(e.target.value)}
                          className="h-8 text-xs bg-white border-slate-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Time</label>
                        <Input
                          type="time"
                          value={nextTime}
                          onChange={(e) => setNextTime(e.target.value)}
                          className="h-8 text-xs bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Target Agenda</label>
                      <Input
                        placeholder="e.g. Call to finalize payment after sending revised proposal"
                        value={nextNotes}
                        onChange={(e) => setNextNotes(e.target.value)}
                        className="h-8 text-xs bg-white border-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingAction}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                >
                  {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save & Complete
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* RESCHEDULE MODAL */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Reschedule Follow-up
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pick a new date and time for this callback.
            </DialogDescription>
          </DialogHeader>

          {activeFollowUp && (
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-semibold text-slate-900">
                  {activeFollowUp.enquiry?.customer?.name} • {activeFollowUp.enquiry?.destination}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">New Date</label>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="text-xs border-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">New Time</label>
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="text-xs border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reschedule Reason / Note</label>
                <Input
                  placeholder="e.g. Client requested callback on weekend"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="text-xs border-slate-200"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRescheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingAction}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save New Date"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CANCEL MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Cancel Follow-up Task
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a brief note explaining why this follow-up is no longer needed.
            </DialogDescription>
          </DialogHeader>

          {activeFollowUp && (
            <form onSubmit={handleCancelSubmit} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Cancellation Reason</label>
                <Input
                  placeholder="e.g. Lead was converted directly, customer cancelled trip"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs border-slate-200"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Keep Task
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={savingAction}
                  className="font-medium"
                >
                  {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancel"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE NEW FOLLOW-UP MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Schedule New Follow-up
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assign a callback or touchpoint to any active travel lead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Select Travel Lead / Customer</label>
                {loadingEnquiries && (
                  <span className="text-[11px] text-indigo-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching leads...
                  </span>
                )}
              </div>

              <div className="relative mb-2">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by customer name, phone, or enquiry #..."
                  value={modalEnquirySearch}
                  onChange={(e) => setModalEnquirySearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white border-slate-200 rounded-lg focus-visible:ring-indigo-500"
                />
              </div>

              {loadingEnquiries && enquiries.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  Loading active leads...
                </div>
              ) : enquiries.length === 0 ? (
                <div className="p-2.5 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                  No active travel leads match "{modalEnquirySearch}".
                </div>
              ) : (
                <Select value={selectedEnquiryId} onValueChange={(val) => val && setSelectedEnquiryId(val)}>
                  <SelectTrigger className="text-xs border-slate-200">
                    <SelectValue placeholder="Pick a lead...">
                      {(val) => {
                        if (!val) return undefined;
                        const e = enquiries.find((x) => x.id === val);
                        return e ? `${e.enquiryNumber} • ${e.customer?.name || "Customer"} (${e.destination || "Trip"})` : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {enquiries.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">
                        {e.enquiryNumber} • {e.customer?.name} ({e.destination})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Interaction Type</label>
                <Select value={createType} onValueChange={(val: any) => setCreateType(val)}>
                  <SelectTrigger className="text-xs border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                <Select value={createPriority} onValueChange={(val: any) => setCreatePriority(val)}>
                  <SelectTrigger className="text-xs border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Scheduled Date</label>
                <Input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="text-xs border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Time</label>
                <Input
                  type="time"
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                  className="text-xs border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Agenda / Follow-up Notes</label>
              <Textarea
                placeholder="e.g. Call to discuss budget adjustments for Shimla itinerary"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                rows={2}
                className="text-xs border-slate-200"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingAction || !selectedEnquiryId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule Follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── QUICK LOG MODAL INTEGRATION ─── */}
      {quickLogEnquiry && (
        <QuickLogModal
          enquiry={quickLogEnquiry}
          initialFollowUpId={quickLogFollowUpId}
          customerId={quickLogEnquiry.customer?.id}
          isOpen={isQuickLogOpen}
          onClose={() => {
            setIsQuickLogOpen(false);
            setQuickLogEnquiry(null);
            setQuickLogFollowUpId(null);
          }}
          onSuccess={async () => {
            setIsQuickLogOpen(false);
            setQuickLogEnquiry(null);
            setQuickLogFollowUpId(null);
            await fetchData();
          }}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
