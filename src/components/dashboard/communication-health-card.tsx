"use client";

import * as React from "react";
import { Send, Mail, MessageSquare } from "lucide-react";
import { DashboardCommunicationKPIs } from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";

interface CommunicationHealthCardProps {
  communication?: DashboardCommunicationKPIs | null;
  loading?: boolean;
}

export function CommunicationHealthCard({
  communication,
  loading = false,
}: CommunicationHealthCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 animate-pulse shadow-2xs h-full space-y-4 min-w-0">
        <div className="h-4 w-36 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const total = communication?.totalMessages ?? 0;
  const delivered = communication?.delivered ?? 0;
  const failed = communication?.failed ?? 0;
  const pending = communication?.pending ?? 0;
  const deliveryRate = communication?.deliveryRatePercent ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4 min-w-0 overflow-hidden">
      <div>
        {/* 1. Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="truncate">Communications & Delivery</span>
            </h3>
            <p className="text-xs text-slate-500 truncate">
              WhatsApp, email, and automated delivery health.
            </p>
          </div>
          <Badge
            className={`text-[11px] sm:text-xs font-bold shrink-0 self-start sm:self-center whitespace-nowrap ${
              deliveryRate >= 95
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : deliveryRate >= 80
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-rose-100 text-rose-800 border-rose-200"
            }`}
          >
            {deliveryRate}% Delivered
          </Badge>
        </div>

        {/* 2. 4 Delivery Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-3">
          <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">Total Sent</span>
            <strong className="text-sm sm:text-base text-slate-900 font-mono font-bold block mt-0.5 tabular-nums whitespace-nowrap truncate">
              {total}
            </strong>
          </div>

          <div className="p-2.5 sm:p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 min-w-0">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block truncate">Delivered</span>
            <strong className="text-sm sm:text-base text-emerald-900 font-mono font-bold block mt-0.5 tabular-nums whitespace-nowrap truncate">
              {delivered}
            </strong>
          </div>

          <div className="p-2.5 sm:p-3 bg-rose-50/60 rounded-xl border border-rose-100 min-w-0">
            <span className="text-[10px] uppercase font-bold text-rose-700 block truncate">Failed</span>
            <strong className="text-sm sm:text-base text-rose-900 font-mono font-bold block mt-0.5 tabular-nums whitespace-nowrap truncate">
              {failed}
            </strong>
          </div>

          <div className="p-2.5 sm:p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 min-w-0">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block truncate">Pending</span>
            <strong className="text-sm sm:text-base text-indigo-900 font-mono font-bold block mt-0.5 tabular-nums whitespace-nowrap truncate">
              {pending}
            </strong>
          </div>
        </div>

        {/* 3. Channel Breakdown Row */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-100 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">
              Email: <strong className="text-slate-900 font-bold tabular-nums">{communication?.emailCount ?? 0}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              WhatsApp: <strong className="text-slate-900 font-bold tabular-nums">{communication?.whatsappCount ?? 0}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
