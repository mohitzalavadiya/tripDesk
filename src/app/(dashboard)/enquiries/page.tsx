"use client";

import { useAuth } from "@/context/auth-context";
import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";

import { AssignLeadModal } from "@/components/enquiries/assign-lead-modal";
import { EnquiryPipeline } from "@/components/enquiries/enquiry-pipeline";
import { EnquiryTable } from "@/components/enquiries/enquiry-table";
import { QuickLogModal } from "@/components/enquiries/quick-log-modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  enquiryClient,
  EnquiryAssignee,
  EnquiryWithRelations,
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { getErrorMessage } from "@/lib/utils";
import type { EnquiryPriority, EnquirySource, EnquiryStatus } from "@prisma/client";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Filter,
  Inbox,
  KanbanSquare,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Stages",
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTATION_SENT: "Quotation Sent",
  FOLLOW_UP: "Follow-up",
  NEGOTIATION: "Negotiation",
  CONVERTED: "Converted",
  LOST: "Lost",
  CANCELLED: "Cancelled",
};

const PRIORITY_FILTER_LABELS: Record<string, string> = {
  all: "All Priorities",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const SOURCE_FILTER_LABELS: Record<string, string> = {
  all: "All Sources",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  PHONE: "Phone",
  EMAIL: "Email",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
};

const URGENCY_FILTER_LABELS: Record<string, string> = {
  all: "All Follow-ups",
  overdue: "Overdue",
  due_today: "Due Today",
  upcoming: "Upcoming",
  no_next_action: "No Next Action",
  stale: "Stale (7d+ inactive)",
};

export default function EnquiriesPage() {
  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("ENQUIRIES", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Enquiries Pipeline"
          badgeText="Access Restricted"
          description="You do not have permission to view this section. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  const router = useRouter();

  // Data states
  const [enquiries, setEnquiries] = React.useState<EnquiryWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [updatingIds, setUpdatingIds] = React.useState<Record<string, boolean>>({});

  // View preference ("list" | "pipeline") - default is pipeline (board-first)
  const [view, setView] = React.useState<"list" | "pipeline">("pipeline");

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<"all" | "my">("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = React.useState<string>("all");
  const [ownerFilter, setOwnerFilter] = React.useState<string>("all");
  const [assignees, setAssignees] = React.useState<EnquiryAssignee[]>([]);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [pipelinePage, setPipelinePage] = React.useState(1);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Quick Log & Assign Modal States
  const [quickLogEnquiry, setQuickLogEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [isQuickLogOpen, setIsQuickLogOpen] = React.useState(false);
  const [assignModalEnquiry, setAssignModalEnquiry] = React.useState<EnquiryWithRelations | null>(null);

  // Load authorized assignees for the agency
  React.useEffect(() => {
    enquiryClient
      .getAssignees()
      .then((res) => {
        if (res.data) setAssignees(res.data);
      })
      .catch((err) => {
        console.error("Failed to load assignees:", err);
      });
  }, []);

  // Restore view preference from localStorage & URL filter parameters
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("enquiry_view_preference");
      if (saved === "list" || saved === "pipeline") setView(saved);
    } catch {}

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlScope = params.get("scope");
      const urlStatus = params.get("status");
      const urlPriority = params.get("priority");
      const urlSource = params.get("source");
      const urlUrgency = params.get("urgency");
      const urlOwner = params.get("assignedTo") || params.get("owner");
      const urlSearch = params.get("search");
      const urlView = params.get("view");
      if (urlScope === "my") setScopeFilter("my");
      if (urlStatus) setStatusFilter(urlStatus);
      if (urlPriority) setPriorityFilter(urlPriority);
      if (urlSource) setSourceFilter(urlSource);
      if (urlUrgency) setUrgencyFilter(urlUrgency);
      if (urlOwner) setOwnerFilter(urlOwner);
      if (urlSearch) setSearch(urlSearch);
      if (urlView === "list" || urlView === "pipeline") setView(urlView);
    }
  }, []);

  // Synchronize active filters & view to URL query string
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (scopeFilter === "my") url.searchParams.set("scope", "my");
      else url.searchParams.delete("scope");

      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      else url.searchParams.delete("status");

      if (priorityFilter !== "all") url.searchParams.set("priority", priorityFilter);
      else url.searchParams.delete("priority");

      if (sourceFilter !== "all") url.searchParams.set("source", sourceFilter);
      else url.searchParams.delete("source");

      if (urgencyFilter !== "all") url.searchParams.set("urgency", urgencyFilter);
      else url.searchParams.delete("urgency");

      if (ownerFilter !== "all") url.searchParams.set("assignedTo", ownerFilter);
      else url.searchParams.delete("assignedTo");

      if (debouncedSearch) url.searchParams.set("search", debouncedSearch);
      else url.searchParams.delete("search");

      if (view !== "pipeline") url.searchParams.set("view", view);
      else url.searchParams.delete("view");

      window.history.replaceState({}, "", url.toString());
    }
  }, [scopeFilter, statusFilter, priorityFilter, sourceFilter, urgencyFilter, ownerFilter, debouncedSearch, view]);

  const handleViewChange = (newView: "list" | "pipeline") => {
    setView(newView);
    setPipelinePage(1);
    try {
      localStorage.setItem("enquiry_view_preference", newView);
    } catch {}
  };

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setPipelinePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch real enquiries from PostgreSQL API
  const fetchEnquiries = React.useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const res = await enquiryClient.getEnquiries({
        search: debouncedSearch || undefined,
        scope: scopeFilter === "my" ? "my" : undefined,
        status: statusFilter !== "all" ? (statusFilter as EnquiryStatus) : undefined,
        priority: priorityFilter !== "all" ? (priorityFilter as EnquiryPriority) : undefined,
        source: sourceFilter !== "all" ? (sourceFilter as EnquirySource) : undefined,
        urgency: urgencyFilter !== "all" ? (urgencyFilter as any) : undefined,
        assignedTo: ownerFilter !== "all" ? ownerFilter : undefined,
        page: view === "pipeline" ? 1 : page,
        limit: view === "pipeline" ? 50 : 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setEnquiries(res.data);
        setPagination(res.meta);
        setPipelinePage(1);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(getErrorMessage(err, "Unable to load enquiries. Please try again."));
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [debouncedSearch, scopeFilter, statusFilter, priorityFilter, sourceFilter, urgencyFilter, ownerFilter, page, view]);

  const handleLoadMorePipeline = async () => {
    if (loadingMore || enquiries.length >= pagination.total) return;
    try {
      setLoadingMore(true);
      const nextPage = pipelinePage + 1;
      const res = await enquiryClient.getEnquiries({
        search: debouncedSearch || undefined,
        scope: scopeFilter === "my" ? "my" : undefined,
        status: statusFilter !== "all" ? (statusFilter as EnquiryStatus) : undefined,
        priority: priorityFilter !== "all" ? (priorityFilter as EnquiryPriority) : undefined,
        source: sourceFilter !== "all" ? (sourceFilter as EnquirySource) : undefined,
        urgency: urgencyFilter !== "all" ? (urgencyFilter as any) : undefined,
        assignedTo: ownerFilter !== "all" ? ownerFilter : undefined,
        page: nextPage,
        limit: 50,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setEnquiries((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newUnique = res.data.filter((e) => !existingIds.has(e.id));
          return [...prev, ...newUnique];
        });
        setPipelinePage(nextPage);
        setPagination(res.meta);
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to load additional enquiries."));
    } finally {
      setLoadingMore(false);
    }
  };

  React.useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setScopeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSourceFilter("all");
    setUrgencyFilter("all");
    setOwnerFilter("all");
    setPage(1);
    setPipelinePage(1);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  };

  const secondaryFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0);

  const isFilterActive =
    search.trim() !== "" ||
    scopeFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    sourceFilter !== "all" ||
    urgencyFilter !== "all" ||
    ownerFilter !== "all";

  // Update Status
  const handleStatusChange = async (id: string, status: EnquiryStatus) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode active.");
      throw new Error("Subscription expired. Read-only mode active.");
    }

    if (status === "CONVERTED") {
      toast.error("Leads cannot be manually converted. An enquiry is automatically converted when a linked booking is confirmed.");
      throw new Error("Direct conversion to CONVERTED is restricted.");
    }

    setUpdatingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await enquiryClient.updateEnquiry(id, { status });
      toast.success(`Enquiry status updated to ${status}.`);
      await fetchEnquiries(true);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to update status."));
      throw err;
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Convert to Trip
  const handleConvertTrip = async (id: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode active.");
      return;
    }

    setUpdatingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await enquiryClient.convertEnquiry(id);
      if (res.success && res.data) {
        toast.success("Enquiry converted to Trip workspace!");
        router.push(`/trips/${res.data.tripId}`);
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to convert enquiry."));
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Archive Enquiry
  const handleArchive = (id: string, enquiryNumber: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode active.");
      return;
    }

    setConfirmAction({
      title: "Archive enquiry?",
      description: `Archive enquiry ${enquiryNumber}? Converted trips will remain intact.`,
      confirmText: "Archive Enquiry",
      variant: "destructive",
      action: async () => {
        try {
          setActionLoading(true);
          await enquiryClient.archiveEnquiry(id);
          toast.success(`Enquiry ${enquiryNumber} archived.`);
          setConfirmAction(null);
          await fetchEnquiries(true);
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't archive the enquiry. Please try again."));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // KPI telemetry sums
  const stats = React.useMemo(() => {
    const total = pagination.total;
    const activeStatuses: EnquiryStatus[] = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "QUOTATION_SENT",
      "FOLLOW_UP",
      "NEGOTIATION",
    ];
    const active = enquiries.filter((e) => activeStatuses.includes(e.status as EnquiryStatus)).length;
    const converted = enquiries.filter((e) => e.status === "CONVERTED").length;
    return { total, active, converted };
  }, [enquiries, pagination.total]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-slate-100/50 pb-4 md:pb-6">
      <div className="max-w-[1750px] mx-auto px-3 sm:px-5 lg:px-6 pt-3 sm:pt-4 space-y-3">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Enquiries & Leads CRM" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Live Telemetry Pills */}
          <div className="space-y-1 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100">
                <Inbox className="h-3 w-3 text-blue-500" />
                Leads & CRM
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} enquiries captured
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                <Clock className="h-3 w-3 text-amber-600" />
                {stats.active} Active
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {stats.converted} Converted
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                Enquiries & CRM
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden md:inline-block">
                Inbound requirements, pipeline stages, and follow-ups
              </span>
            </div>
          </div>

          {/* Right Action Controls (View Switcher + New Enquiry) */}
          <div className="flex items-center gap-2.5 z-10 shrink-0">
            {/* View Mode Toggle (Board-first order) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => handleViewChange("pipeline")}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  view === "pipeline"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <KanbanSquare className="h-3.5 w-3.5 text-teal-700" />
                <span>Board</span>
              </button>
              <button
                onClick={() => handleViewChange("list")}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  view === "list"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5 text-slate-500" />
                <span>Table</span>
              </button>
            </div>

            <Button
              onClick={() => router.push("/enquiries/new")}
              disabled={isReadOnly}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs h-9 px-3.5 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50 justify-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              New Enquiry
            </Button>
          </div>
        </div>

        {/* Master Card (Filter Bar + Table / Pipeline) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Consolidated Single-Line Search & Filter Toolbar */}
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Left: Search Bar & Segmented Toggle (All vs My Enquiries) */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search enquiry #, customer, phone, destination..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-9 h-9 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Segmented Control: All Enquiries vs My Enquiries */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("all");
                      setPage(1);
                      setPipelinePage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      scopeFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    All Enquiries
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("my");
                      setPage(1);
                      setPipelinePage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      scopeFilter === "my"
                        ? "bg-white text-teal-800 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-teal-700" />
                    <span>My Enquiries</span>
                  </button>
                </div>
              </div>

              {/* Right: Urgency Filter & Secondary Filters Popover */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Urgency Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Select
                    value={urgencyFilter}
                    onValueChange={(val) => {
                      if (val) {
                        setUrgencyFilter(val);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none w-[135px]">
                      <SelectValue placeholder="All Follow-ups">
                        {(val) => URGENCY_FILTER_LABELS[val] ?? "All Follow-ups"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                      <SelectItem value="all">All Follow-ups</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="due_today">Due Today</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="no_next_action">No Next Action</SelectItem>
                      <SelectItem value="stale">Stale (7d+ inactive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Secondary Filters Popover */}
                <Popover>
                  <PopoverTrigger
                    className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all ${
                      secondaryFiltersCount > 0 ? "border-teal-400 bg-teal-50/40 text-teal-900" : "text-slate-700 bg-white"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span>Filters</span>
                    {secondaryFiltersCount > 0 && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center">
                        {secondaryFiltersCount}
                      </span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4 space-y-3 bg-white border border-slate-200 shadow-xl rounded-2xl z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Secondary Filters</span>
                      {secondaryFiltersCount > 0 && (
                        <button
                          onClick={() => {
                            setStatusFilter("all");
                            setPriorityFilter("all");
                            setSourceFilter("all");
                            setOwnerFilter("all");
                          }}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Stage Filter */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Lead Stage</span>
                      <Select
                        value={statusFilter}
                        onValueChange={(val) => {
                          if (val) {
                            setStatusFilter(val);
                            setPage(1);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-800 w-full">
                          <SelectValue placeholder="All Stages">
                            {(val) => STATUS_FILTER_LABELS[val] ?? "All Stages"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-white p-1 text-slate-800 shadow-lg border border-slate-200 z-50 max-h-56">
                          {Object.entries(STATUS_FILTER_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Priority</span>
                      <Select
                        value={priorityFilter}
                        onValueChange={(val) => {
                          if (val) {
                            setPriorityFilter(val);
                            setPage(1);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-800 w-full">
                          <SelectValue placeholder="All Priorities">
                            {(val) => PRIORITY_FILTER_LABELS[val] ?? "All Priorities"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-white p-1 text-slate-800 shadow-lg border border-slate-200 z-50">
                          {Object.entries(PRIORITY_FILTER_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Source Filter */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Acquisition Source</span>
                      <Select
                        value={sourceFilter}
                        onValueChange={(val) => {
                          if (val) {
                            setSourceFilter(val);
                            setPage(1);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-800 w-full">
                          <SelectValue placeholder="All Sources">
                            {(val) => SOURCE_FILTER_LABELS[val] ?? "All Sources"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-white p-1 text-slate-800 shadow-lg border border-slate-200 z-50 max-h-48">
                          {Object.entries(SOURCE_FILTER_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Owner / Assignee Filter */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Assigned Consultant</span>
                      <Select
                        value={ownerFilter}
                        onValueChange={(val) => {
                          if (val) {
                            setOwnerFilter(val);
                            setPage(1);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-800 w-full">
                          <SelectValue placeholder="All Owners">
                            {ownerFilter === "all"
                              ? "All Owners"
                              : ownerFilter === "unassigned"
                              ? "Unassigned"
                              : ownerFilter === "assigned"
                              ? "Assigned"
                              : ownerFilter}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-white p-1 text-slate-800 shadow-lg border border-slate-200 z-50 max-h-48">
                          <SelectItem value="all">All Owners</SelectItem>
                          <SelectItem value="unassigned" className="text-amber-700 font-semibold">
                            Unassigned Leads
                          </SelectItem>
                          <SelectItem value="assigned" className="text-indigo-700 font-semibold">
                            Assigned Leads
                          </SelectItem>
                          {assignees.map((a) => (
                            <SelectItem key={a.name} value={a.name}>
                              {a.name} {a.isUser ? "• Team" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Clear / Reset Active Filters Button */}
                {isFilterActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-9 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer rounded-xl gap-1 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Workload Filter Strip */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
              Workload:
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setUrgencyFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                statusFilter === "all" && urgencyFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs font-bold"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              All Workload
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter(urgencyFilter === "overdue" ? "all" : "overdue");
                setStatusFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                urgencyFilter === "overdue"
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200/80"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Needs Attention</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter(urgencyFilter === "due_today" ? "all" : "due_today");
                setStatusFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                urgencyFilter === "due_today"
                  ? "bg-amber-600 text-white shadow-2xs font-bold"
                  : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200/80"
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Due Today</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter(urgencyFilter === "no_next_action" ? "all" : "no_next_action");
                setStatusFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                urgencyFilter === "no_next_action"
                  ? "bg-orange-600 text-white shadow-2xs font-bold"
                  : "bg-white text-orange-700 hover:bg-orange-50 border border-orange-200/80"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>No Next Action</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === "QUALIFIED" ? "all" : "QUALIFIED");
                setUrgencyFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                statusFilter === "QUALIFIED"
                  ? "bg-teal-700 text-white shadow-2xs font-bold"
                  : "bg-white text-teal-800 hover:bg-teal-50 border border-teal-200/80"
              }`}
            >
              <Compass className="h-3 w-3" />
              <span>Trip Planning</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === "QUOTATION_SENT" ? "all" : "QUOTATION_SENT");
                setUrgencyFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                statusFilter === "QUOTATION_SENT"
                  ? "bg-indigo-600 text-white shadow-2xs font-bold"
                  : "bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200/80"
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>Quotation Sent</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === "NEGOTIATION" ? "all" : "NEGOTIATION");
                setUrgencyFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                statusFilter === "NEGOTIATION"
                  ? "bg-purple-600 text-white shadow-2xs font-bold"
                  : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200/80"
              }`}
            >
              <Users className="h-3 w-3" />
              <span>Negotiation</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === "CONVERTED" ? "all" : "CONVERTED");
                setUrgencyFilter("all");
                setPage(1);
                setPipelinePage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                statusFilter === "CONVERTED"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200/80"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Won</span>
            </button>
          </div>

          {/* Loading Skeleton State (Only initial full mount) */}
          {loading && enquiries.length === 0 && (
            <div className="p-4">
              <TableSkeleton rows={6} />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8">
              <ErrorState
                title="Unable to load enquiries"
                description={error}
                onRetry={() => fetchEnquiries()}
              />
            </div>
          )}

          {/* Main Content (Table or Pipeline) */}
          {(!loading || enquiries.length > 0) && !error && enquiries.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Inbox}
                title={isFilterActive ? "No matching enquiries found" : "No enquiries captured yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search query, priority, source, or urgency filters."
                    : "Capture customer travel inquiries, schedule follow-ups, and convert leads into trip itineraries."
                }
                actionText={isFilterActive ? "Clear Filter" : "Create New Enquiry"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/enquiries/new")}
              />
            </div>
          ) : (!loading || enquiries.length > 0) && !error && (
            <div>
              {view === "list" ? (
                <EnquiryTable
                  enquiries={enquiries}
                  isReadOnly={isReadOnly}
                  updatingIds={updatingIds}
                  onStatusChange={handleStatusChange}
                  onConvertTrip={handleConvertTrip}
                  onArchive={handleArchive}
                  onQuickLog={(enq) => {
                    setQuickLogEnquiry(enq);
                    setIsQuickLogOpen(true);
                  }}
                  onAssign={(enq) => setAssignModalEnquiry(enq)}
                />
              ) : (
                <div className="p-3 sm:p-4">
                  <EnquiryPipeline
                    enquiries={enquiries}
                    isReadOnly={isReadOnly}
                    updatingIds={updatingIds}
                    onStatusChange={handleStatusChange}
                    onConvertTrip={handleConvertTrip}
                    onArchive={handleArchive}
                    onAssign={(enq) => setAssignModalEnquiry(enq)}
                    onRefresh={() => fetchEnquiries(true)}
                  />

                  {/* Pipeline Pagination & Incremental Loading Controls */}
                  {pagination.total > enquiries.length ? (
                    <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">
                          Showing {enquiries.length} of {pagination.total} enquiries in Pipeline.
                        </span>
                        <span className="text-slate-400">
                          (Additional leads available)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingMore}
                          onClick={handleLoadMorePipeline}
                          className="h-8 px-3 text-xs font-semibold rounded-lg bg-white shadow-2xs hover:bg-slate-50 cursor-pointer"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              Loading more...
                            </>
                          ) : (
                            `Load Next ${Math.min(50, pagination.total - enquiries.length)} Leads`
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewChange("list")}
                          className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold cursor-pointer"
                        >
                          Switch to Table View
                        </Button>
                      </div>
                    </div>
                  ) : pagination.total > 0 ? (
                    <div className="mt-3 py-2 px-3 text-center text-xs text-slate-400 font-medium">
                      All {pagination.total} matching enquiries loaded in pipeline.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Master Footer with Pagination */}
          {view === "list" && (
            <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <span>
                Showing <strong className="text-slate-800">{enquiries.length}</strong> of{" "}
                <strong className="text-slate-800">{pagination.total}</strong> enquiries
              </span>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                  </Button>
                  <span className="text-xs font-bold text-slate-700 px-1">
                    {page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages || loading}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setConfirmAction(null);
        }}
        title={confirmAction?.title || ""}
        description={confirmAction?.description || ""}
        confirmText={confirmAction?.confirmText || "Confirm"}
        variant={confirmAction?.variant || "destructive"}
        loading={actionLoading}
        onConfirm={async () => {
          if (confirmAction?.action) {
            await confirmAction.action();
          }
        }}
      />

      {/* Quick Log Modal for Table & List Interactions */}
      {quickLogEnquiry && (
        <QuickLogModal
          enquiry={quickLogEnquiry}
          customerId={quickLogEnquiry.customer?.id}
          isOpen={isQuickLogOpen}
          onClose={() => {
            setIsQuickLogOpen(false);
            setQuickLogEnquiry(null);
          }}
          onSuccess={async () => {
            setIsQuickLogOpen(false);
            setQuickLogEnquiry(null);
            await fetchEnquiries(true);
          }}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Assign / Handoff Lead Modal */}
      <AssignLeadModal
        enquiry={assignModalEnquiry}
        isOpen={Boolean(assignModalEnquiry)}
        onClose={() => setAssignModalEnquiry(null)}
        onSuccess={async () => {
          setAssignModalEnquiry(null);
          await fetchEnquiries(true);
        }}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
