"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, ShieldAlert, ArrowRight, ArrowLeft, Phone, CreditCard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadOnlyReason } from "@/context/subscription-context";

export interface ReadOnlyModeCardProps {
  resourceName?: string;
  title?: string;
  description?: string;
  reason?: ReadOnlyReason;
  backHref: string;
  backLabel: string;
}

export function ReadOnlyModeCard({
  resourceName = "Record",
  title,
  description,
  reason = "EXPIRED",
  backHref,
  backLabel,
}: ReadOnlyModeCardProps) {
  const isSuspended = reason === "SUSPENDED";

  const handleContactSupport = () => {
    window.open(
      `https://wa.me/919847099000?text=${encodeURIComponent(
        `Hi TripDesk Support! Our agency workspace is currently suspended and we cannot create new ${resourceName}s. Please assist us in reactivating our account.`
      )}`,
      "_blank"
    );
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center text-white shadow-xl relative overflow-hidden my-6 max-w-2xl mx-auto">
      {/* Background Decorative Gradients */}
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isSuspended ? "bg-rose-600/15" : "bg-blue-600/15"
        }`}
      />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Icon Monogram */}
        <div
          className={`h-16 w-16 rounded-2xl border flex items-center justify-center mb-5 shadow-inner ${
            isSuspended
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}
        >
          {isSuspended ? (
            <ShieldAlert className="h-8 w-8 stroke-[1.75]" />
          ) : (
            <Lock className="h-8 w-8 stroke-[1.75]" />
          )}
        </div>

        {/* Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${
            isSuspended
              ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
              : "bg-blue-500/10 border-blue-500/20 text-blue-300"
          }`}
        >
          <span>{isSuspended ? "Agency Workspace Suspended" : "Read-Only Mode Active"}</span>
        </div>

        {/* Title */}
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
          {resourceName} Creation Restricted
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {isSuspended ? (
            <>
              Your agency workspace has been suspended by Platform Administration. Direct creation of new <strong>{resourceName.toLowerCase()}s</strong> and data mutations are temporarily disabled.
            </>
          ) : (
            <>
              Your subscription or trial is inactive. You have full read-only access to review existing workspace data, but initializing new <strong>{resourceName.toLowerCase()}s</strong> requires an active plan.
            </>
          )}
        </p>

        {/* Features / Notice Box */}
        <div className="w-full bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-bold text-slate-200">Workspace Status Overview:</p>
          <div className="space-y-1.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>All historical trips, quotations, and bookings remain safe and accessible.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>PDF proposal and voucher generation for existing records is fully functional.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>
                {isSuspended
                  ? "Support team assistance is available to reactivate your workspace."
                  : "Instant plan renewal reactivates unlimited creation workflows immediately."}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <Link href={backHref} className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-semibold text-xs h-11 px-5 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel}</span>
            </Button>
          </Link>

          {isSuspended ? (
            <Button
              size="lg"
              onClick={handleContactSupport}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-6 h-11 rounded-xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              <span>Contact TripDesk Support</span>
            </Button>
          ) : (
            <Link href="/subscription" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 h-11 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <CreditCard className="h-4 w-4" />
                <span>Renew Subscription</span>
                <ArrowRight className="h-4 w-4 ml-0.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
