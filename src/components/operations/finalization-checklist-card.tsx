"use client";

import * as React from "react";
import {
  OperationsClosureSummary,
  operationsClient,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  FileText,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface FinalizationChecklistCardProps {
  summary: OperationsClosureSummary;
  onSuccess: () => void;
}

export function FinalizationChecklistCard({
  summary,
  onSuccess,
}: FinalizationChecklistCardProps) {
  const { checklist, isFinalized, finalizedAt, finalizedBy, reopenedAt, reopenReason, closureNotes } = summary;

  const [finalizeDialogOpen, setFinalizeDialogOpen] = React.useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = React.useState(false);

  const [notes, setNotes] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [reopenText, setReopenText] = React.useState("");

  const [processing, setProcessing] = React.useState(false);

  const handleFinalize = async () => {
    if (!acknowledged) {
      toast.error("Please acknowledge all service deliveries and discrepancies before final sign-off.");
      return;
    }

    try {
      setProcessing(true);
      await operationsClient.finalizeOperation(summary.operationId, {
        closureNotes: notes.trim() || undefined,
        acknowledgedDiscrepancies: true,
      });

      toast.success("Tour operation has been permanently finalized and locked!");
      setFinalizeDialogOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize operation.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenText.trim() || reopenText.trim().length < 5) {
      toast.error("A detailed reason (min 5 characters) is required to reopen this operation.");
      return;
    }

    try {
      setProcessing(true);
      await operationsClient.reopenOperation(summary.operationId, {
        reopenReason: reopenText.trim(),
      });

      toast.success("Operation successfully reopened for corrections.");
      setReopenDialogOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen operation.");
    } finally {
      setProcessing(false);
    }
  };

  const pdfUrl = operationsClient.getClosureSummaryPdfUrl(summary.operationId);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Final Operational Sign-Off & Immutability Lock
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            Internal Closure PDF
          </a>
        </div>
      </div>

      {/* Finalized Banner if locked */}
      {isFinalized ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                Operation Finalized & Locked
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReopenDialogOpen(true)}
              className="text-xs font-bold h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 cursor-pointer"
            >
              <Unlock className="h-3 w-3 mr-1" /> Reopen Operation
            </Button>
          </div>
          <p className="text-xs text-emerald-800">
            This tour operation has been audited and signed off. All supplier allocations, vouchers, and issues are immutable to maintain strict audit integrity.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-700 pt-1 font-mono">
            {finalizedAt && <span>Finalized: {new Date(finalizedAt).toLocaleString("en-IN")}</span>}
            {closureNotes && <span>Notes: {closureNotes}</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Reopen history note if previously reopened */}
          {summary.closureStatus === "REOPENED" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Operation Currently Reopened for Corrections</span>
                <span>Reason: {reopenReason || "Operational adjustments requested."}</span>
              </div>
            </div>
          )}

          {/* Checklist Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Completed Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-700">1. Tour Operational Status Completed</span>
              {checklist.isCompleted ? (
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Completed
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-700">
                  <XCircle className="h-4 w-4 text-rose-600" /> {summary.status}
                </span>
              )}
            </div>

            {/* 2. Critical Issues */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-700">2. No Critical Blockers Unresolved</span>
              {checklist.criticalIssuesResolved ? (
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Clear
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-700">
                  <XCircle className="h-4 w-4 text-rose-600" /> Critical Open
                </span>
              )}
            </div>

            {/* 3. Post-Tour Review */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-700">3. Post-Tour Quality Review Recorded</span>
              {checklist.reviewCompleted ? (
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Recorded
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-amber-700">
                  <XCircle className="h-4 w-4 text-amber-600" /> Pending Review
                </span>
              )}
            </div>

            {/* 4. Financial Reconciliation */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-700">4. Financial Cost Reconciliation</span>
              {checklist.reconciliationReviewed ? (
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reconciled
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-amber-700">
                  <XCircle className="h-4 w-4 text-amber-600" /> Pending Audit
                </span>
              )}
            </div>
          </div>

          {/* Finalize Action Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              Finalizing locks the operation against accidental edits and logs an irreversible sign-off audit event.
            </p>
            <Button
              type="button"
              disabled={!checklist.canFinalize}
              onClick={() => setFinalizeDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Finalize Tour Operation
            </Button>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Dialog */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" /> Finalize Tour Operation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              You are about to permanently finalize and sign off this operation. All accommodations, dispatches, vouchers, and issues will be sealed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Final Closure Sign-Off Notes</label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. All guest services concluded satisfactorily and vendor accounts reconciled."
                className="text-xs bg-slate-50"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600"
              />
              <span>
                I confirm that all services were audited, customer review was logged, and supplier cost variances are reconciled.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFinalizeDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!acknowledged || processing}
              onClick={handleFinalize}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Confirm Finalization"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Unlock className="h-4 w-4 text-amber-600" /> Reopen Finalized Operation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reopening unlocks the operation for modifications. A mandatory reason must be recorded for audit compliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Mandatory Reopen Reason *</span>
              <span className="text-[10px] text-slate-400">Min 5 characters</span>
            </label>
            <Textarea
              rows={3}
              value={reopenText}
              onChange={(e) => setReopenText(e.target.value)}
              placeholder="Explain why this finalized operation must be unlocked (e.g. late vendor adjustment, corrected invoice)..."
              className="text-xs bg-slate-50"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReopenDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!reopenText.trim() || reopenText.trim().length < 5 || processing}
              onClick={handleReopen}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Reopening...
                </>
              ) : (
                "Unlock Operation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
