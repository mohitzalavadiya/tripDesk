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
import { ShieldAlert, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export interface QuotaExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName: string;
  currentUsage?: number;
  limit?: number | null;
  planName?: string;
}

export function QuotaExceededDialog({
  open,
  onOpenChange,
  resourceName,
  currentUsage = 20,
  limit = 20,
  planName = "Starter",
}: QuotaExceededDialogProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push("/subscription");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-xl gap-5">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="h-6 w-6 stroke-[2]" />
          </div>

          <div className="space-y-1.5 pt-0.5 flex-1 min-w-0">
            <DialogHeader className="p-0 text-left">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold tracking-wider uppercase mb-1 border border-rose-100/80">
                <span>Limit Reached ({currentUsage} / {limit})</span>
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                {resourceName} Quota Exhausted
              </DialogTitle>
            </DialogHeader>

            <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1 space-y-2">
              <span>
                You have reached your <strong>{planName}</strong> limit of <strong>{limit} {resourceName}</strong> for the current billing cycle.
              </span>
            </DialogDescription>
          </div>
        </div>

        {/* Benefits Preview Strip */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Upgrade to Professional Plan to unlock:</span>
          </p>
          <ul className="space-y-1.5 text-[11px] text-slate-600 pl-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span><strong>Unlimited</strong> Trips, Quotations & Bookings</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Custom Agency Branding & Logo on PDF proposals</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Advanced Revenue Analytics & Customer Insights</span>
            </li>
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

          <Button
            type="button"
            size="sm"
            onClick={handleUpgrade}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 cursor-pointer"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
