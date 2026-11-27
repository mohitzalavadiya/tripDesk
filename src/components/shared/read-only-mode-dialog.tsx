"use client";

import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { ReadOnlyReason } from "@/context/subscription-context";
import { Lock,Phone,ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export interface ReadOnlyModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: ReadOnlyReason;
  actionName?: string;
  actionLabel?: string;
}

export function ReadOnlyModeDialog({
  open,
  onOpenChange,
  reason = "SUSPENDED",
  actionName,
  actionLabel,
}: ReadOnlyModeDialogProps) {
  const router = useRouter();
  const effectiveActionName = actionLabel || actionName || "This action";

  const isSuspended = reason === "SUSPENDED";

  const handleContactSupport = () => {
    onOpenChange(false);
    router.push("/support");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xl gap-4 sm:gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border ${
              isSuspended
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-blue-50 text-blue-600 border-blue-100"
            }`}
          >
            {isSuspended ? (
              <ShieldAlert className="h-6 w-6 stroke-[2]" />
            ) : (
              <Lock className="h-6 w-6 stroke-[2]" />
            )}
          </div>

          <div className="space-y-1.5 pt-0.5 flex-1 min-w-0">
            <DialogHeader className="p-0 text-left">
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase mb-1 border ${
                  isSuspended
                    ? "bg-rose-50 text-rose-700 border-rose-100/80"
                    : "bg-blue-50 text-blue-700 border-blue-100/80"
                }`}
              >
                <span>{isSuspended ? "Account Suspended" : "Read-Only Mode"}</span>
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                {isSuspended ? "Agency Workspace Suspended" : "Read-Only Mode Active"}
              </DialogTitle>
            </DialogHeader>

            <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1">
              {isSuspended ? (
                <span>
                  Your agency workspace has been suspended by Platform Administration. <strong>{effectiveActionName}</strong> and other business modification actions are disabled. Please contact Your Travel Desk support to reactivate your workspace.
                </span>
              ) : (
                <span>
                  This workspace is currently in read-only mode. Existing records remain accessible, while <strong>{effectiveActionName}</strong> and data creation are restricted.
                </span>
              )}
            </DialogDescription>
          </div>
        </div>

        {/* Informative Guidance Box */}
        <div
          className={`border rounded-xl p-3.5 space-y-1.5 text-xs ${
            isSuspended
              ? "bg-rose-50/50 border-rose-100 text-rose-900"
              : "bg-slate-50 border-slate-100 text-slate-700"
          }`}
        >
          <p className="font-bold text-slate-800">What can you do?</p>
          <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
            <li>You can continue browsing existing trips, quotations, and bookings.</li>
            <li>All agency financial and customer records are safely preserved.</li>
            <li>Reach out to our support team for workspace assistance or reactivation.</li>
          </ul>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 bg-transparent -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:px-6 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto justify-center h-9 px-4 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
          >
            Close
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleContactSupport}
            className="w-full sm:w-auto justify-center h-9 px-4 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs gap-1.5 cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Contact Support</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
