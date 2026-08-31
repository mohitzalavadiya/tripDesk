"use client";

import * as React from "react";
import {
  OperationsOverviewKPIs,
} from "@/lib/api-client/operations-client";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Building,
  Car,
  Ticket,
  IndianRupee,
  Star,
  Clock,
} from "lucide-react";

interface KpiGridProps {
  overview?: OperationsOverviewKPIs;
  loading?: boolean;
}

export function OperationsAnalyticsKpiGrid({ overview, loading = false }: KpiGridProps) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-slate-200/80 bg-white p-4 animate-pulse"
          >
            <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const kpis = [
    {
      title: "Total Operations",
      value: overview.totalOperations.toString(),
      subtext: `${overview.statusBreakdown.ongoing} Active • ${overview.statusBreakdown.ready} Ready`,
      icon: Compass,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Avg Readiness",
      value: `${overview.readinessOverview.averageReadinessPercent}%`,
      subtext: `${overview.readinessOverview.readyBeforeDeparturePercent}% Ready before departure`,
      icon: CheckCircle2,
      iconColor: overview.readinessOverview.averageReadinessPercent >= 80 ? "text-emerald-600" : "text-amber-600",
      bgColor: overview.readinessOverview.averageReadinessPercent >= 80 ? "bg-emerald-50" : "bg-amber-50",
    },
    {
      title: "Open Issues",
      value: overview.issuesOverview.openIssues.toString(),
      subtext: `${overview.issuesOverview.criticalIssues} Critical • ${overview.issuesOverview.highIssues} High`,
      icon: AlertTriangle,
      iconColor: overview.issuesOverview.criticalIssues > 0 ? "text-rose-600" : "text-amber-600",
      bgColor: overview.issuesOverview.criticalIssues > 0 ? "bg-rose-50" : "bg-amber-50",
    },
    {
      title: "Service Confirmation",
      value: `${overview.servicesOverview.hotelConfirmationRate}%`,
      subtext: `H: ${overview.servicesOverview.hotelConfirmationRate}% • V: ${overview.servicesOverview.vehicleDispatchRate}% • A: ${overview.servicesOverview.activityConfirmationRate}%`,
      icon: Building,
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Cost Variance",
      value: formatCurrency(overview.financialOverview.totalVariance),
      subtext: `${overview.financialOverview.overBudgetCount} Over-budget • ${overview.financialOverview.savingsCount} Under`,
      icon: IndianRupee,
      iconColor: overview.financialOverview.totalVariance > 0 ? "text-rose-600" : "text-emerald-600",
      bgColor: overview.financialOverview.totalVariance > 0 ? "bg-rose-50" : "bg-emerald-50",
    },
    {
      title: "Guest Satisfaction",
      value: overview.guestSatisfactionOverview.averageGuestRating > 0 ? `${overview.guestSatisfactionOverview.averageGuestRating} ★` : "N/A",
      subtext: `${overview.guestSatisfactionOverview.reviewsCompletedCount} Reviews recorded`,
      icon: Star,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 truncate">{kpi.title}</span>
              <div className={`p-1.5 rounded-lg ${kpi.bgColor} ${kpi.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">{kpi.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
