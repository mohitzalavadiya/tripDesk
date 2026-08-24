"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOperations } from "@/context/operations-context";
import { TripIssue } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
} from "lucide-react";

export default function GlobalIssuesDashboardPage() {
  const router = useRouter();
  const { operations, resolveIssue } = useOperations();

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");

  // Flatten all issues from all operations
  const allIssues = React.useMemo(() => {
    return operations.flatMap((o) => o.issues);
  }, [operations]);

  // Derived KPIs
  const kpis = React.useMemo(() => {
    const open = allIssues.filter((i) => i.status === "Open").length;
    const highPriority = allIssues.filter(
      (i) => i.priority === "High" || i.priority === "Critical"
    ).length;
    const inProgress = allIssues.filter((i) => i.status === "In Progress").length;
    const resolved = allIssues.filter((i) => i.status === "Resolved").length;

    return { open, highPriority, inProgress, resolved };
  }, [allIssues]);

  // Filtered issues
  const filteredIssues = React.useMemo(() => {
    return allIssues.filter((iss) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = iss.title.toLowerCase().includes(q);
        const mCust = iss.customerName.toLowerCase().includes(q);
        const mDesc = iss.description.toLowerCase().includes(q);
        if (!mTitle && !mCust && !mDesc) return false;
      }

      if (statusFilter !== "ALL" && iss.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && iss.priority !== priorityFilter) return false;

      return true;
    });
  }, [allIssues, searchQuery, statusFilter, priorityFilter]);

  const isFilterActive = searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Operations Issue Tracker"
          description="Track customer issues, chauffeur delays, hotel complaints, and tour escalations."
          breadcrumbs={[
            { label: "Operations", href: "/operations" },
            { label: "Issues" },
          ]}
          primaryAction={{
            label: "Log New Issue",
            onClick: () => setIsCreateModalOpen(true),
            icon: Plus,
          }}
        />

        {/* ─── 4 KPI SUMMARY CARDS ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Open Issues</span>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">{kpis.open}</p>
            <p className="text-[11px] text-slate-500 font-medium">Awaiting action</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">High / Critical</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{kpis.highPriority}</p>
            <p className="text-[11px] text-slate-500 font-medium">Urgent attention</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">{kpis.inProgress}</p>
            <p className="text-[11px] text-slate-500 font-medium">Being handled</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-teal-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-2xl font-black text-teal-700 tracking-tight">{kpis.resolved}</p>
            <p className="text-[11px] text-slate-500 font-medium">Successfully closed</p>
          </div>
        </div>

        {/* ─── SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Issue, Customer, Hotel, Chauffeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="h-9 text-xs w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || "ALL")}>
                <SelectTrigger className="h-9 text-xs w-36">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setPriorityFilter("ALL");
                  }}
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─── ISSUES LIST ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
              <EmptyState
                icon={CheckCircle2}
                title="No operational issues found"
                description={
                  isFilterActive
                    ? "Try adjusting your search query or status filters."
                    : "Great job! All operational and customer tickets are currently clear."
                }
              />
            </div>
          ) : (
            filteredIssues.map((iss) => (
              <div
                key={iss.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <IssuePriorityBadge priority={iss.priority} />
                      <IssueStatusBadge status={iss.status} />
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                        {iss.type}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{iss.title}</h3>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {iss.description}
                    </p>

                    <p className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                      <span>Customer: <strong>{iss.customerName}</strong></span>
                      <span>•</span>
                      <span>Assigned: <strong>{iss.assignedTo || "Support Desk"}</strong></span>
                      <span>•</span>
                      <span>Logged: {iss.createdAt.split("T")[0]}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      href={`/operations/${iss.tripId}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Open Trip Workspace →
                    </Link>

                    {iss.status !== "Resolved" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const note = prompt("Enter resolution notes / remarks:");
                          if (note) resolveIssue(iss.id, note);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3.5 rounded-xl cursor-pointer shadow-2xs"
                      >
                        Resolve Issue
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mini Timeline if available */}
                {iss.timeline && iss.timeline.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] space-y-1">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      Activity Log
                    </span>
                    {iss.timeline.map((entry) => (
                      <div key={entry.id} className="flex justify-between text-slate-600">
                        <span>• {entry.text} ({entry.actor})</span>
                        <span className="font-mono text-slate-400">{entry.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <CreateIssueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
