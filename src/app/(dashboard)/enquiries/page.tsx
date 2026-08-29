"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { EnquiryTable } from "@/components/enquiries/enquiry-table";
import { EnquiryPipeline } from "@/components/enquiries/enquiry-pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Inbox,
  Plus,
  List,
  KanbanSquare,
  Search,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
  Compass,
  ArrowRight,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import {
  enquiryClient,
  EnquiryWithRelations,
} from "@/lib/api-client";
import { EnquiryStatus, EnquiryPriority, EnquirySource } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function EnquiriesPage() {
  const router = useRouter();

  // Data states
  const [enquiries, setEnquiries] = React.useState<EnquiryWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // View preference ("list" | "pipeline")
  const [view, setView] = React.useState<"list" | "pipeline">("list");

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Restore view preference from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("enquiry_view_preference");
      if (saved === "list" || saved === "pipeline") setView(saved);
    } catch {}
  }, []);

  const handleViewChange = (newView: "list" | "pipeline") => {
    setView(newView);
    try {
      localStorage.setItem("enquiry_view_preference", newView);
    } catch {}
  };

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch real enquiries from PostgreSQL API
  const fetchEnquiries = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await enquiryClient.getEnquiries({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? (statusFilter as EnquiryStatus) : undefined,
        priority: priorityFilter !== "all" ? (priorityFilter as EnquiryPriority) : undefined,
        source: sourceFilter !== "all" ? (sourceFilter as EnquirySource) : undefined,
        page,
        limit: view === "pipeline" ? 100 : 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setEnquiries(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load enquiries from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, priorityFilter, sourceFilter, page, view]);

  React.useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setSourceFilter("all");
    setPage(1);
  };

  const isFilterActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    sourceFilter !== "all";

  // Update Status
  const handleStatusChange = async (id: string, status: EnquiryStatus) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode active.");
      return;
    }

    try {
      await enquiryClient.updateEnquiry(id, { status });
      toast.success(`Enquiry status updated to ${status}.`);
      await fetchEnquiries();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    }
  };

  // Convert to Trip
  const handleConvertTrip = async (id: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode active.");
      return;
    }

    try {
      const res = await enquiryClient.convertEnquiry(id);
      if (res.success && res.data) {
        toast.success("Enquiry converted to Trip workspace!");
        router.push(`/trips/${res.data.tripId}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to convert enquiry.");
    }
  };

  // Archive Enquiry
  const handleArchive = async (id: string, enquiryNumber: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode active.");
      return;
    }

    if (!confirm(`Archive enquiry ${enquiryNumber}? Converted trips will remain intact.`)) {
      return;
    }

    try {
      await enquiryClient.archiveEnquiry(id);
      toast.success(`Enquiry ${enquiryNumber} archived.`);
      await fetchEnquiries();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive enquiry.");
    }
  };

  // KPI telemetry sums
  const stats = React.useMemo(() => {
    const total = pagination.total;
    const activeStatuses: EnquiryStatus[] = [
      EnquiryStatus.NEW,
      EnquiryStatus.CONTACTED,
      EnquiryStatus.QUALIFIED,
      EnquiryStatus.QUOTATION_SENT,
      EnquiryStatus.FOLLOW_UP,
      EnquiryStatus.NEGOTIATION,
    ];
    const active = enquiries.filter((e) => activeStatuses.includes(e.status as EnquiryStatus)).length;
    const converted = enquiries.filter((e) => e.status === EnquiryStatus.CONVERTED).length;
    const quotedStatuses: EnquiryStatus[] = [
      EnquiryStatus.QUOTATION_SENT,
      EnquiryStatus.NEGOTIATION,
      EnquiryStatus.CONVERTED,
    ];
    const quotedPipelineValue = enquiries
      .filter((e) => e.budget && quotedStatuses.includes(e.status as EnquiryStatus))
      .reduce((sum, e) => sum + (e.budget ? Number(e.budget) : 0), 0);

    return { total, active, converted, quotedPipelineValue };
  }, [enquiries, pagination.total]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Enquiries & Leads CRM" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Status Quick Tabs */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100">
                <Inbox className="h-3 w-3 text-blue-500" />
                Leads & CRM
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} enquiries captured
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Enquiries & CRM
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Inbound customer inquiries, travel requirements, lead stages, and follow-ups
              </span>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              {[
                { label: "All", value: "all" },
                { label: "New", value: EnquiryStatus.NEW },
                { label: "Contacted", value: EnquiryStatus.CONTACTED },
                { label: "Qualified", value: EnquiryStatus.QUALIFIED },
                { label: "Quotation Sent", value: EnquiryStatus.QUOTATION_SENT },
                { label: "Follow-up", value: EnquiryStatus.FOLLOW_UP },
                { label: "Negotiation", value: EnquiryStatus.NEGOTIATION },
                { label: "Converted", value: EnquiryStatus.CONVERTED },
                { label: "Lost", value: EnquiryStatus.LOST },
                { label: "Cancelled", value: EnquiryStatus.CANCELLED },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    statusFilter === tab.value
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Action Controls (View Switcher + New Enquiry) */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => handleViewChange("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  view === "list"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => handleViewChange("pipeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  view === "pipeline"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                <span>Pipeline</span>
              </button>
            </div>

            <Button
              onClick={() => router.push("/enquiries/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Enquiry
            </Button>
          </div>
        </div>

        {/* KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Captured</span>
              <h4 className="text-lg font-black text-slate-900">{stats.total}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Leads</span>
              <h4 className="text-lg font-black text-slate-900">{stats.active}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Converted Trips</span>
              <h4 className="text-lg font-black text-slate-900">{stats.converted}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Quoted Value</span>
              <h4 className="text-lg font-black text-indigo-600">{formatCurrency(stats.quotedPipelineValue)}</h4>
            </div>
          </div>
        </div>

        {/* Master Card (Filter Bar + Table / Pipeline) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by enquiry #, customer name, phone, destination..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Priority:</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value={EnquiryPriority.URGENT}>Urgent</option>
                    <option value={EnquiryPriority.HIGH}>High</option>
                    <option value={EnquiryPriority.MEDIUM}>Medium</option>
                    <option value={EnquiryPriority.LOW}>Low</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Source:</span>
                  <select
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Sources</option>
                    <option value={EnquirySource.WHATSAPP}>WhatsApp</option>
                    <option value={EnquirySource.WEBSITE}>Website</option>
                    <option value={EnquirySource.INSTAGRAM}>Instagram</option>
                    <option value={EnquirySource.FACEBOOK}>Facebook</option>
                    <option value={EnquirySource.PHONE}>Phone</option>
                    <option value={EnquirySource.EMAIL}>Email</option>
                    <option value={EnquirySource.REFERRAL}>Referral</option>
                    <option value={EnquirySource.WALK_IN}>Walk-in</option>
                  </select>
                </div>

                {isFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-16 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching enquiries from database...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEnquiries()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Main Content (Table or Pipeline) */}
          {!loading && !error && enquiries.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Inbox}
                title={isFilterActive ? "No matching enquiries found" : "No enquiries captured yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search query, priority, or source filters."
                    : "Capture customer travel inquiries, schedule follow-ups, and convert leads into trip itineraries."
                }
                actionText={isFilterActive ? "Clear Filter" : "Create New Enquiry"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/enquiries/new")}
              />
            </div>
          ) : !loading && !error && (
            <div>
              {view === "list" ? (
                <EnquiryTable
                  enquiries={enquiries}
                  isReadOnly={isReadOnly}
                  onStatusChange={handleStatusChange}
                  onConvertTrip={handleConvertTrip}
                  onArchive={handleArchive}
                />
              ) : (
                <div className="p-4">
                  <EnquiryPipeline
                    enquiries={enquiries}
                    isReadOnly={isReadOnly}
                    onStatusChange={handleStatusChange}
                  />
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
    </div>
  );
}
