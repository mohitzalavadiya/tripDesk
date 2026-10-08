"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert, Phone, CreditCard, ArrowRight } from "lucide-react";
import { ReadOnlyReason } from "@/context/subscription-context";

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
  reason = "EXPIRED",
  actionName,
  actionLabel,
}: ReadOnlyModeDialogProps) {
  const router = useRouter();
  const effectiveActionName = actionLabel || actionName || "This action";

  const isSuspended = reason === "SUSPENDED";

  const handleContactSupport = () => {
    onOpenChange(false);
    window.open(
      `https://wa.me/919847099000?text=${encodeURIComponent(
        "Hi Your Travel Desk Support! Our agency workspace is currently suspended. Please assist us in reactivating our account."
      )}`,
      "_blank"
    );
  };

  const handleRenew = () => {
    onOpenChange(false);
    router.push("/subscription");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-xl gap-5">
        <div className="flex items-start gap-4">
          <div
            className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border ${
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
                  Your subscription or free trial has expired. Existing records remain accessible in read-only mode, but <strong>{effectiveActionName}</strong> and data creation are restricted. Renew your plan to resume operations.
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
            {isSuspended ? (
              <li>Reach out to our support team for account reactivation.</li>
            ) : (
              <li>Select a plan to immediately unlock full creation and editing capabilities.</li>
            )}
          </ul>
        </div>

        <DialogFooter className="flex-row justify-end gap-2.5 pt-2 border-t border-slate-100 bg-transparent -mx-6 -mb-6 p-4 px-6 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
          >
            Close
          </Button>

          {isSuspended ? (
            <Button
              type="button"
              size="sm"
              onClick={handleContactSupport}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs gap-1.5 cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Contact Support</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleRenew}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Renew Subscription</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
