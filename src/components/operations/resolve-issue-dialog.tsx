"use client";

import * as React from "react";
import { IssueStatus, IssuePriority, OperationalIssue } from "@prisma/client";
import { operationsClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, X, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/operations/operations-status-badge";

interface ResolveIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  operationId: string;
  issue: OperationalIssue | null;
  targetStatus?: IssueStatus; // default RESOLVED
}

export function ResolveIssueDialog({
  isOpen,
  onClose,
  onSuccess,
  operationId,
  issue,
  targetStatus = IssueStatus.RESOLVED,
}: ResolveIssueDialogProps) {
  const [resolution, setResolution] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (issue?.resolution) {
      setResolution(issue.resolution);
    } else {
      setResolution("");
    }
  }, [issue, isOpen]);

  if (!isOpen || !issue) return null;

  const isClosing = targetStatus === IssueStatus.CLOSED;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution.trim()) {
      toast.error("Please enter a resolution note before submitting.");
      return;
    }

    try {
      setLoading(true);
      await operationsClient.updateIssue(operationId, issue.id, {
        status: targetStatus,
        resolution: resolution.trim(),
      });

      toast.success(
        isClosing
          ? `Issue "${issue.title}" closed successfully!`
          : `Issue "${issue.title}" marked as RESOLVED!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update issue resolution.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                isClosing
                  ? "bg-slate-100 border border-slate-200 text-slate-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-600"
              }`}
            >
              {isClosing ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isClosing ? "Close Operational Issue" : "Resolve Operational Issue"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isClosing
                  ? "Finalize and permanently close this issue"
                  : "Record corrective action and restore operational readiness"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Issue Context Summary */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
              {issue.title}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0">
              <IssuePriorityBadge priority={issue.priority} />
              <IssueStatusBadge status={issue.status} />
            </div>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {issue.description || "No description provided."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Resolution Notes & Corrective Actions *</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Required
              </span>
            </label>
            <Textarea
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Explain how this issue was resolved, refund/voucher details, or supplier resolution..."
              className="text-xs resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !resolution.trim()}
              className={`text-xs h-9 gap-1.5 font-semibold text-white ${
                isClosing
                  ? "bg-slate-800 hover:bg-slate-900"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : isClosing ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Confirm & Close Issue
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark as Resolved
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
