"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  operationsClient,
  OperationsAnalyticsDashboard,
  AnalyticsPreset,
} from "@/lib/api-client/operations-client";
import { OperationsAnalyticsKpiGrid } from "@/components/operations/analytics/operations-analytics-kpi-grid";
import { OperationsRiskCard } from "@/components/operations/analytics/operations-risk-card";
import { OperationsReadinessChart } from "@/components/operations/analytics/operations-readiness-chart";
import { OperationsIssuesAnalyticsCard } from "@/components/operations/analytics/operations-issues-analytics-card";
import { OperationsSupplierScorecard } from "@/components/operations/analytics/operations-supplier-scorecard";
import { OperationsFinancialAnalyticsCard } from "@/components/operations/analytics/operations-financial-analytics-card";
import { OperationsSatisfactionCard } from "@/components/operations/analytics/operations-satisfaction-card";
import { OperationsTrendChart } from "@/components/operations/analytics/operations-trend-chart";
import {
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  Compass,
  AlertCircle,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_LABELS: { label: string; value: AnalyticsPreset }[] = [
  { label: "Today", value: "TODAY" },
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "Last 90 Days", value: "LAST_90_DAYS" },
  { label: "This Month", value: "CURRENT_MONTH" },
  { label: "Last Month", value: "PREVIOUS_MONTH" },
  { label: "This Year", value: "CURRENT_YEAR" },
  { label: "Custom Range", value: "CUSTOM" },
];

export default function OperationsAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [preset, setPreset] = React.useState<AnalyticsPreset>("LAST_30_DAYS");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const [data, setData] = React.useState<OperationsAnalyticsDashboard | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        setError(null);

        const res = await operationsClient.getOperationsAnalytics({
          preset,
          startDate: preset === "CUSTOM" && startDate ? startDate : undefined,
          endDate: preset === "CUSTOM" && endDate ? endDate : undefined,
        });

        setData(res.data);
      } catch (err: any) {
        console.error("Operations analytics fetch error:", err);
        setError(err.message || "Failed to load live operations analytics.");
        if (!isSilent) toast.error("Could not load operations analytics data.");
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [preset, startDate, endDate]
  );

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    toast.info("Refreshing operations analytics...");
    await fetchAnalytics(false);
    toast.success("Operations analytics updated.");
  };

  const handleExportCsv = () => {
    const url = operationsClient.getOperationsAnalyticsExportUrl({
      preset,
      startDate: preset === "CUSTOM" && startDate ? startDate : undefined,
      endDate: preset === "CUSTOM" && endDate ? endDate : undefined,
    });
    window.open(url, "_blank");
    toast.success("Operations Analytics CSV export downloaded.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Operations Analytics & Performance Insights"
        description="Executive operational health, readiness distributions, deterministic risk scoring, supplier scorecards, and financial variance audits."
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Analytics & Performance" },
        ]}
        primaryAction={{
          label: "Export CSV",
          onClick: handleExportCsv,
          icon: Download,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            onClick: handleRefresh,
            icon: RefreshCw,
            variant: "outline",
          },
        ]}
      />

      {/* 2. Controls & Date Presets Bar */}
      <div className="px-4 md:px-8 mt-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-slate-500 mr-1.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date Range:
            </span>
            {PRESET_LABELS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  preset === p.value
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "CUSTOM" && (
            <div className="flex items-center gap-2 text-xs">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <Button size="sm" onClick={() => fetchAnalytics()} className="h-8 text-xs">
                Apply
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link href="/operations">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-slate-600 hover:text-slate-900">
                <Compass className="h-3.5 w-3.5" /> Command Center
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && !loading && (
        <div className="px-4 md:px-8 mt-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchAnalytics()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* 4. Main Dashboard Grid */}
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Executive KPI Grid */}
        <OperationsAnalyticsKpiGrid overview={data?.overview} loading={loading} />

        {/* Section 1: Risk Matrix & Readiness Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperationsRiskCard riskData={data?.risk} loading={loading} />
          <OperationsReadinessChart readinessData={data?.readiness} loading={loading} />
        </div>

        {/* Section 2: Issue Velocity & Supplier Scorecard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperationsIssuesAnalyticsCard issueData={data?.issues} loading={loading} />
          <OperationsSupplierScorecard supplierData={data?.suppliers} loading={loading} />
        </div>

        {/* Section 3: Financial Variance & Guest Satisfaction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperationsFinancialAnalyticsCard financialData={data?.financial} loading={loading} />
          <OperationsSatisfactionCard satisfactionData={data?.guestSatisfaction} loading={loading} />
        </div>

        {/* Section 4: Operational & Issue Trends Chart */}
        <OperationsTrendChart trends={data?.trends} loading={loading} />
      </div>
    </div>
  );
}
