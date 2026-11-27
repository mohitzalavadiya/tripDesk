"use client";

import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Hourglass,
  Inbox,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

export interface CrmActionSummaryProps {
  overdueCount?: number;
  dueTodayCount?: number;
  upcomingCount?: number;
  uncontactedLeadsCount?: number;
  staleLeadsCount?: number;
  urgentEnquiriesCount?: number;
  crmLoading?: boolean;
  crmError?: string | null;
  onRetryCrm?: () => void;
}

export function CrmActionSummary({
  overdueCount = 0,
  dueTodayCount = 0,
  upcomingCount = 0,
  uncontactedLeadsCount = 0,
  staleLeadsCount = 0,
  urgentEnquiriesCount = 0,
  crmLoading = false,
  crmError = null,
  onRetryCrm,
}: CrmActionSummaryProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Sales Command Center &amp; Action Radar</span>
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Live CRM Triage • Asia/Kolkata
        </span>
      </div>

      {crmError && !crmLoading ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Unable to load live CRM attention metrics: {crmError}</span>
          </div>
          {onRetryCrm && (
            <button
              type="button"
              onClick={onRetryCrm}
              className="text-xs font-bold text-rose-900 hover:text-rose-950 flex items-center gap-1 cursor-pointer bg-white border border-rose-200 px-2.5 py-1 rounded-lg"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {/* CARD 1: Overdue Follow-ups */}
          {crmLoading ? (
            <CardSkeleton />
          ) : (
            <Link
              href="/follow-ups?scope=overdue"
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
                overdueCount > 0
                  ? "bg-gradient-to-br from-rose-50/90 via-white to-white border-rose-200/90 hover:border-rose-300"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Overdue
                  </span>
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      overdueCount > 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span
                    className={`text-2xl font-black tracking-tight tabular-nums ${
                      overdueCount > 0 ? "text-rose-900" : "text-slate-800"
                    }`}
                  >
                    {overdueCount}
                  </span>
                  {overdueCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-rose-100 text-rose-800 border-rose-200 text-[8px] font-bold px-1 py-0 rounded"
                    >
                      Urgent
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Clear
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-2">
                <span className="text-slate-500 truncate">Callbacks past due</span>
                <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}

          {/* CARD 2: Due Today */}
          {crmLoading ? (
            <CardSkeleton />
          ) : (
            <Link
              href="/follow-ups?scope=today"
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
                dueTodayCount > 0
                  ? "bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-200/90 hover:border-amber-300"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Due Today
                  </span>
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      dueTodayCount > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span
                    className={`text-2xl font-black tracking-tight tabular-nums ${
                      dueTodayCount > 0 ? "text-amber-950" : "text-slate-800"
                    }`}
                  >
                    {dueTodayCount}
                  </span>
                  {dueTodayCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800 border-amber-200 text-[8px] font-bold px-1 py-0 rounded"
                    >
                      Today
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">None today</span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-2">
                <span className="text-slate-500 truncate">Touchpoints</span>
                <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}

          {/* CARD 3: Upcoming Touchpoints */}
          {crmLoading ? (
            <CardSkeleton />
          ) : (
            <Link
              href="/follow-ups?scope=upcoming"
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
                upcomingCount > 0
                  ? "bg-gradient-to-br from-sky-50/70 via-white to-white border-sky-200/90 hover:border-sky-300"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Upcoming
                  </span>
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      upcomingCount > 0
                        ? "bg-sky-100 text-sky-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span
                    className={`text-2xl font-black tracking-tight tabular-nums ${
                      upcomingCount > 0 ? "text-sky-950" : "text-slate-800"
                    }`}
                  >
                    {upcomingCount}
                  </span>
                  {upcomingCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-sky-100 text-sky-800 border-sky-200 text-[8px] font-bold px-1 py-0 rounded"
                    >
                      Queued
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">No queue</span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-2">
                <span className="text-slate-500 truncate">Future callbacks</span>
                <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}

          {/* CARD 4: Needs First Contact / Uncontacted */}
          {crmLoading ? (
            <CardSkeleton />
          ) : (
            <Link
              href="/enquiries?status=NEW"
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
                uncontactedLeadsCount > 0
                  ? "bg-gradient-to-br from-violet-50/70 via-white to-white border-violet-200/90 hover:border-violet-300"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Uncontacted
                  </span>
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      uncontactedLeadsCount > 0
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Inbox className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span
                    className={`text-2xl font-black tracking-tight tabular-nums ${
                      uncontactedLeadsCount > 0 ? "text-violet-950" : "text-slate-800"
                    }`}
                  >
                    {uncontactedLeadsCount}
                  </span>
                  {uncontactedLeadsCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-violet-100 text-violet-800 border-violet-200 text-[8px] font-bold px-1 py-0 rounded"
                    >
                      Triage
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> All Done
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-2">
                <span className="text-slate-500 truncate">No next action</span>
                <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}

          {/* CARD 5: Stale Leads (7d+ inactive) */}
          {crmLoading ? (
            <CardSkeleton />
          ) : (
            <Link
              href="/enquiries?urgency=stale"
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
                staleLeadsCount > 0
                  ? "bg-gradient-to-br from-amber-50/70 via-white to-white border-orange-200/90 hover:border-orange-300"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Stale Leads
                  </span>
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      staleLeadsCount > 0
                        ? "bg-orange-100 text-orange-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Hourglass className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span
                    className={`text-2xl font-black tracking-tight tabular-nums ${
                      staleLeadsCount > 0 ? "text-orange-950" : "text-slate-800"
                    }`}
                  >
                    {staleLeadsCount}
                  </span>
                  {staleLeadsCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-orange-100 text-orange-800 border-orange-200 text-[8px] font-bold px-1 py-0 rounded"
                    >
                      7d+ Inactive
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Healthy
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-2">
                <span className="text-slate-500 truncate">At-risk leads</span>
                <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}

          {/* CARD 6: Urgent / High Priority */}
          {crmLoading ? (
            <CardSkeleton />
          ) : (
            <Link
              href="/enquiries?priority=URGENT"
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md ${
                urgentEnquiriesCount > 0
                  ? "bg-gradient-to-br from-rose-50/60 via-amber-50/30 to-white border-amber-300/80 hover:border-amber-400"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    High Priority
                  </span>
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                      urgentEnquiriesCount > 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Flame className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span
                    className={`text-2xl font-black tracking-tight tabular-nums ${
                      urgentEnquiriesCount > 0 ? "text-rose-950" : "text-slate-800"
                    }`}
                  >
                    {urgentEnquiriesCount}
                  </span>
                  {urgentEnquiriesCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-rose-100 text-rose-800 border-rose-200 text-[8px] font-bold px-1 py-0 rounded"
                    >
                      VIP Attention
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">Standard</span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] mt-2">
                <span className="text-slate-500 truncate">VIP &amp; Urgent leads</span>
                <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-28 rounded-2xl border border-slate-200/80 bg-white p-3.5 animate-pulse shadow-2xs space-y-2.5">
      <div className="h-3 w-16 bg-slate-200 rounded" />
      <div className="h-7 w-12 bg-slate-200 rounded-lg" />
      <div className="h-2.5 w-20 bg-slate-100 rounded" />
    </div>
  );
}
