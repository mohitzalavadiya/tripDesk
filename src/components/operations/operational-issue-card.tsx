"use client";

import * as React from "react";
import { IssuePriority, IssueStatus, OperationalIssue } from "@prisma/client";
import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  User,
  Calendar,
  AlertCircle,
  FileText,
  Play,
} from "lucide-react";

interface OperationalIssueCardProps {
  issue: OperationalIssue;
  onStartInvestigation?: (issue: OperationalIssue) => void;
  onResolve?: (issue: OperationalIssue) => void;
  onReopen?: (issue: OperationalIssue) => void;
  onCloseIssue?: (issue: OperationalIssue) => void;
  isReadOnly?: boolean;
}

function formatDate(date: Date | string) {
  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date);
  }
}

export function OperationalIssueCard({
  issue,
  onStartInvestigation,
  onResolve,
  onReopen,
  onCloseIssue,
  isReadOnly = false,
}: OperationalIssueCardProps) {
  const isResolved = issue.status === IssueStatus.RESOLVED;
  const isClosed = issue.status === IssueStatus.CLOSED;
  const isOpen = issue.status === IssueStatus.OPEN;
  const isInProgress = issue.status === IssueStatus.IN_PROGRESS;
  const isCriticalOrHigh =
    issue.priority === IssuePriority.CRITICAL || issue.priority === IssuePriority.HIGH;
  const isBlocker = (isOpen || isInProgress) && isCriticalOrHigh;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-5 ${
        isBlocker
          ? "bg-rose-50/40 border-rose-200/90 shadow-sm"
          : isResolved
          ? "bg-emerald-50/30 border-emerald-200/70"
          : isClosed
          ? "bg-slate-50/50 border-slate-200/70 opacity-80"
          : "bg-white border-slate-200/80 hover:border-slate-300 shadow-xs"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left Side: Priority, Title, Context */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <IssuePriorityBadge priority={issue.priority} />
            <IssueStatusBadge status={issue.status} />

            {isBlocker && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                Readiness Blocker
              </span>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              {issue.title}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
              {issue.description || "No detailed description provided."}
            </p>
          </div>

          {/* Reporter & Assignee Metadata */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-slate-500 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Reported {formatDate(issue.createdAt)}
              </span>
            </div>

            {issue.reportedBy && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  By <strong className="font-semibold text-slate-700">{issue.reportedBy}</strong>
                </span>
              </div>
            )}

            {issue.assignedTo ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <span>
                  Assigned to <strong className="font-semibold text-slate-700">{issue.assignedTo}</strong>
                </span>
              </div>
            ) : (
              <span className="text-slate-400 italic">Unassigned</span>
            )}
          </div>

          {/* Resolution Box if resolved or closed */}
          {(issue.resolution || issue.resolvedAt) && (
            <div className="mt-3 bg-white/80 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Resolution Details</span>
                </div>
                {issue.resolvedAt && (
                  <span className="text-slate-400 font-normal">
                    {formatDate(issue.resolvedAt)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {issue.resolution || "Issue resolved."}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        {!isReadOnly && (
          <div className="flex items-center md:flex-col gap-2 shrink-0 justify-end">
            {isOpen && (
              <>
                {onStartInvestigation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onStartInvestigation(issue)}
                    className="text-xs h-8 gap-1.5 bg-blue-50/50 hover:bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <Play className="h-3 w-3" />
                    Start Investigation
                  </Button>
                )}
                {onResolve && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onResolve(issue)}
                    className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve Issue
                  </Button>
                )}
              </>
            )}

            {isInProgress && (
              <>
                {onResolve && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onResolve(issue)}
                    className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve Issue
                  </Button>
                )}
              </>
            )}

            {isResolved && (
              <>
                {onCloseIssue && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onCloseIssue(issue)}
                    className="text-xs h-8 gap-1.5 bg-slate-800 hover:bg-slate-900 text-white"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Close Issue
                  </Button>
                )}
                {onReopen && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onReopen(issue)}
                    className="text-xs h-8 gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reopen
                  </Button>
                )}
              </>
            )}

            {isClosed && onReopen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onReopen(issue)}
                className="text-xs h-8 gap-1.5 text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="h-3 w-3" />
                Reopen Issue
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
