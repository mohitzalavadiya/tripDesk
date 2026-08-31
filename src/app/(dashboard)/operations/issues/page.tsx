"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  operationsClient,
  OperationListItem,
} from "@/lib/api-client";
import {
  IssuePriority,
  IssueStatus,
  OperationalIssue,
} from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/operations/operations-status-badge";
import { CreateIssueModal } from "@/components/operations/create-issue-modal";
import { ResolveIssueDialog } from "@/components/operations/resolve-issue-dialog";
import { OperationalIssueCard } from "@/components/operations/operational-issue-card";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  Plus,
  Compass,
  Building,
  Car,
  Ticket,
  Check,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

type AgencyIssueItem = OperationalIssue & {
  tripOperation: {
    id: string;
    trip: {
      id: string;
      tripNumber: string;
      title: string;
      customer: { id: string; name: string; phone: string; email?: string | null };
    };
    booking?: { id: string; bookingNumber: string; totalAmount: number; status: string } | null;
  };
};

export function GlobalIssuesDashboardPage() {
  const router = useRouter();

  // Data states
  const [issues, setIssues] = React.useState<AgencyIssueItem[]>([]);
  const [summary, setSummary] = React.useState({
    total: 0,
    open: 0,
    inProgress: 0,
    critical: 0,
    highPriority: 0,
    resolved: 0,
  });
  const [operationList, setOperationList] = React.useState<
    Array<{ id: string; title: string; bookingNumber?: string | null; customerName?: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Modals & Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [resolvingIssue, setResolvingIssue] = React.useState<OperationalIssue | null>(null);
  const [resolvingOpId, setResolvingOpId] = React.useState<string>("");
  const [dialogTargetStatus, setDialogTargetStatus] = React.useState<IssueStatus>(
    IssueStatus.RESOLVED
  );

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");

  // Fetch operations list for modal dropdown
  const fetchOperationsDropdown = React.useCallback(async () => {
    try {
      const listRes = await operationsClient.getOperations({ limit: 100 });
      const ops = listRes.data || [];
      setOperationList(
        ops.map((o) => ({
          id: o.id,
          title: o.trip.title,
          bookingNumber: o.booking?.bookingNumber || o.trip.tripNumber,
          customerName: o.trip.customer.name,
        }))
      );
    } catch {
      // Non-blocking
    }
  }, []);

  // Fetch agency issues with query filters
  const fetchIssues = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await operationsClient.listAgencyIssues({
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery,
        limit: 100,
      });

      setIssues(res.data || []);
      if (res.meta?.summary) {
        setSummary(res.meta.summary);
      }
    } catch (err: any) {
      if (err.statusCode === 403 && err.code === "READ_ONLY_ACCESS") {
        setIsReadOnly(true);
      } else {
        setError(err.message || "Failed to load operational issues.");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery]);

  React.useEffect(() => {
    fetchOperationsDropdown();
  }, [fetchOperationsDropdown]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchIssues();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchIssues]);

  // Action handlers
  const handleStartInvestigation = async (issue: OperationalIssue, operationId: string) => {
    try {
      await operationsClient.updateIssue(operationId, issue.id, {
        status: IssueStatus.IN_PROGRESS,
      });
      toast.success(`Issue "${issue.title}" is now In Progress`);
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || "Failed to update issue status.");
    }
  };

  const handleOpenResolveDialog = (
    issue: OperationalIssue,
    operationId: string,
    target: IssueStatus = IssueStatus.RESOLVED
  ) => {
    setResolvingIssue(issue);
    setResolvingOpId(operationId);
    setDialogTargetStatus(target);
  };

  const handleReopenIssue = async (issue: OperationalIssue, operationId: string) => {
    try {
      await operationsClient.updateIssue(operationId, issue.id, {
        status: IssueStatus.OPEN,
      });
      toast.success(`Issue "${issue.title}" reopened`);
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen issue.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Operations" />}

        {/* Top Header */}
        <PageHeader
          title="Operations Issue Tracker"
          description="Track customer issues, chauffeur delays, hotel complaints, and tour escalations across all active operations."
          breadcrumbs={[
            { label: "Operations", href: "/operations" },
            { label: "Issues" },
          ]}
          primaryAction={{
            label: "Log New Issue",
            onClick: () => {
              if (!isReadOnly) setIsCreateModalOpen(true);
            },
            icon: Plus,
          }}
          secondaryActions={[
            {
              label: "Operations Dashboard",
              onClick: () => router.push("/operations"),
              icon: ArrowLeft,
              variant: "outline",
            },
          ]}
        />

        {/* ─── 5 ISSUE KPI CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* 1. Open Issues */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Open Tickets</span>
              <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">{summary.open}</p>
            <p className="text-[11px] text-slate-500 font-medium">Unresolved tickets</p>
          </div>

          {/* 2. Critical */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-red-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Critical Blockers</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-700 tracking-tight">{summary.critical}</p>
            <p className="text-[11px] text-slate-500 font-medium">Immediate escalations</p>
          </div>

          {/* 3. High Priority */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-orange-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">High Priority</span>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-700 tracking-tight">{summary.highPriority}</p>
            <p className="text-[11px] text-slate-500 font-medium">Urgent attention</p>
          </div>

          {/* 4. In Progress */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{summary.inProgress}</p>
            <p className="text-[11px] text-slate-500 font-medium">Under active coordination</p>
          </div>

          {/* 5. Resolved */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{summary.resolved}</p>
            <p className="text-[11px] text-slate-500 font-medium">Settled & closed</p>
          </div>
        </div>

        {/* ─── FILTERS & SEARCH BAR ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, description, guest, tour..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
              <SelectTrigger className="h-9.5 text-xs font-semibold w-full sm:w-40 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={IssueStatus.OPEN}>Open</SelectItem>
                <SelectItem value={IssueStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={IssueStatus.RESOLVED}>Resolved</SelectItem>
                <SelectItem value={IssueStatus.CLOSED}>Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || "ALL")}>
              <SelectTrigger className="h-9.5 text-xs font-semibold w-full sm:w-40 bg-white">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value={IssuePriority.CRITICAL}>Critical</SelectItem>
                <SelectItem value={IssuePriority.HIGH}>High</SelectItem>
                <SelectItem value={IssuePriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={IssuePriority.LOW}>Low</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                }}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ─── MAIN ISSUES LIST ───────────────────────────────────────────── */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState
            title="Unable to load issues"
            description={error}
            onRetry={fetchIssues}
          />
        ) : issues.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={
              searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL"
                ? "No matching issues found"
                : "No operational issues logged"
            }
            description={
              searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL"
                ? "Try clearing your search query or selecting a different status/priority filter."
                : "Great job! All operational activities, flights, hotels, and fleet dispatches are running without open issues."
            }
            actionText="Log Issue"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                All Operational Tickets ({issues.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {issues.map((issue) => (
                <div key={issue.id} className="space-y-2">
                  {/* Trip Header Banner */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-200/60 rounded-xl text-xs">
                    <Link
                      href={`/operations/${issue.tripOperation?.trip?.id || issue.tripOperationId}`}
                      className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span>
                        {issue.tripOperation?.trip?.title || "Tour Itinerary"}
                      </span>
                      <span className="text-slate-500 font-normal">
                        ({issue.tripOperation?.trip?.customer?.name || "Guest"})
                      </span>
                    </Link>

                    <Link
                      href={`/operations/${issue.tripOperation?.trip?.id || issue.tripOperationId}`}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>Open Tour File</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <OperationalIssueCard
                    issue={issue}
                    onStartInvestigation={() =>
                      handleStartInvestigation(issue, issue.tripOperationId)
                    }
                    onResolve={() =>
                      handleOpenResolveDialog(
                        issue,
                        issue.tripOperationId,
                        IssueStatus.RESOLVED
                      )
                    }
                    onCloseIssue={() =>
                      handleOpenResolveDialog(
                        issue,
                        issue.tripOperationId,
                        IssueStatus.CLOSED
                      )
                    }
                    onReopen={() => handleReopenIssue(issue, issue.tripOperationId)}
                    isReadOnly={isReadOnly}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── LOG ISSUE MODAL ──────────────────────────────────────────────── */}
      <CreateIssueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        operationList={operationList}
        onSuccess={fetchIssues}
      />

      {/* ─── RESOLVE ISSUE DIALOG ─────────────────────────────────────────── */}
      <ResolveIssueDialog
        isOpen={!!resolvingIssue}
        onClose={() => setResolvingIssue(null)}
        onSuccess={fetchIssues}
        operationId={resolvingOpId}
        issue={resolvingIssue}
        targetStatus={dialogTargetStatus}
      />
    </div>
  );
}

export default GlobalIssuesDashboardPage;
