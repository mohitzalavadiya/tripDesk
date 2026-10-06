"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, Sparkles, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuotaExceededCardProps {
  resourceName: string;
  currentUsage?: number;
  limit?: number | null;
  planName?: string;
  backHref: string;
  backLabel: string;
}

export function QuotaExceededCard({
  resourceName,
  currentUsage = 20,
  limit = 20,
  planName = "Starter",
  backHref,
  backLabel,
}: QuotaExceededCardProps) {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center text-white shadow-xl relative overflow-hidden my-6 max-w-2xl mx-auto">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Icon Monogram */}
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 shadow-inner">
          <ShieldAlert className="h-8 w-8 stroke-[1.75]" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold mb-3">
          <Sparkles className="h-3.5 w-3.5 text-rose-400" />
          <span>{planName} Plan Limit Reached</span>
        </div>

        {/* Title */}
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
          {resourceName} Quota Exhausted
        </h3>

        {/* Telemetry pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-300 my-2">
          <span>Usage: <strong className="text-rose-400">{currentUsage}</strong> / <strong>{limit}</strong> {resourceName}s created</span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          You have created all <strong>{limit} {resourceName.toLowerCase()}s</strong> permitted in your current {planName} billing cycle. Upgrade to the Professional Plan for unlimited capacity.
        </p>

        {/* Benefits Preview */}
        <div className="w-full bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-bold text-slate-200">Professional Plan includes:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Unlimited Trips</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Unlimited Quotations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Unlimited Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Custom Agency Logo</span>
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

          <Link href="/subscription" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 h-11 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Upgrade to Professional</span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
