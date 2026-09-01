"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs h-full space-y-4">
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
  const deliveryRate = communication?.deliveryRatePercent ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4 text-teal-600" />
              <span>Multi-Channel Communication Health</span>
            </h3>
            <p className="text-xs text-slate-500">
              WhatsApp & Email automated delivery status and reliability.
            </p>
          </div>
          <Badge
            className={`text-xs font-bold ${
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

        {/* 4 Delivery Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Sent</span>
            <strong className="text-base text-slate-900 font-mono font-bold block mt-0.5">
              {total}
            </strong>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Delivered</span>
            <strong className="text-base text-emerald-900 font-mono font-bold block mt-0.5">
              {delivered}
            </strong>
          </div>

          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Failed</span>
            <strong className="text-base text-rose-900 font-mono font-bold block mt-0.5">
              {failed}
            </strong>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Pending</span>
            <strong className="text-base text-indigo-900 font-mono font-bold block mt-0.5">
              {communication?.pending ?? 0}
            </strong>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="pt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-indigo-600" />
            <span>Email Dispatches: <strong className="text-slate-900 font-bold">{communication?.emailCount ?? 0}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>WhatsApp Messages: <strong className="text-slate-900 font-bold">{communication?.whatsappCount ?? 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
