"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SalesFunnelCard } from "@/components/dashboard/sales-funnel-card";
import { ReceivablesPayablesCard } from "@/components/dashboard/receivables-payables-card";
import { FollowUpsList } from "@/components/dashboard/follow-ups-list";
import { RecentEnquiriesTable } from "@/components/dashboard/recent-enquiries-table";
import { UpcomingTripsList } from "@/components/dashboard/upcoming-trips-list";
import { CommunicationHealthCard } from "@/components/dashboard/communication-health-card";
import { TopDestinationsCustomersCard } from "@/components/dashboard/top-destinations-customers-card";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  FileDown,
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  dashboardClient,
  DashboardApiResponse,
  DashboardFinanceApiResponse,
  DashboardOperationsApiResponse,
} from "@/lib/api-client";
import { DashboardPreset } from "@/lib/validation/dashboard-schema";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();

  // Filter state
  const [preset, setPreset] = React.useState<DashboardPreset>("THIS_MONTH");
  const [startDate, setStartDate] = React.useState<string | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = React.useState<"OVERVIEW" | "SALES" | "FINANCE" | "OPERATIONS">("OVERVIEW");

  // Data state
  const [data, setData] = React.useState<DashboardApiResponse | null>(null);
  const [financeData, setFinanceData] = React.useState<DashboardFinanceApiResponse | null>(null);
  const [opsData, setOpsData] = React.useState<DashboardOperationsApiResponse | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboardData = React.useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        setError(null);

        const filter = { preset, startDate, endDate };

        const [summaryRes, finRes, opsRes] = await Promise.all([
          dashboardClient.getSummary(filter),
          dashboardClient.getFinance(filter),
          dashboardClient.getOperations(15),
        ]);

        setData(summaryRes);
        setFinanceData(finRes);
        setOpsData(opsRes);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load authoritative dashboard metrics.");
        if (!isSilent) toast.error("Could not refresh dashboard data.");
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [preset, startDate, endDate]
  );

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    toast.info("Refreshing live dashboard metrics...");
    await fetchDashboardData(false);
    toast.success("Dashboard metrics updated.");
  };

  const handlePresetChange = (newPreset: DashboardPreset) => {
    setPreset(newPreset);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleCustomRangeChange = (start: string, end: string) => {
    setPreset("CUSTOM_RANGE");
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Executive Command Center & Analytics"
        description="Authoritative, server-aggregated operational, commercial, and financial intelligence."
        breadcrumbs={[]}
        primaryAction={{
          label: "New Enquiry",
          onClick: () => router.push("/enquiries/new"),
          icon: Plus,
        }}
        secondaryActions={[
          {
            label: "Export CSV",
            onClick: () => {
              window.open(dashboardClient.getExportUrl({ preset, startDate, endDate }), "_blank");
            },
            icon: FileDown,
            variant: "outline",
          },
          {
            label: "Refresh",
            onClick: handleRefresh,
            icon: RefreshCw,
            variant: "outline",
          },
        ]}
      />

      {/* Error state if API call failed */}
      {error && !loading && (
        <div className="px-4 md:px-8 mt-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchDashboardData()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* 2. Main Dashboard Content Grid */}
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* Date Filter & Tab Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            {[
              { id: "OVERVIEW", label: "Executive Overview", icon: LayoutDashboard },
              { id: "SALES", label: "Sales & Pipeline", icon: TrendingUp },
              { id: "FINANCE", label: "Finance & Profitability", icon: CreditCard },
              { id: "OPERATIONS", label: "Operations & Departures", icon: Compass },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date Range Selector */}
          <DateRangeFilter
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={handlePresetChange}
            onCustomRangeChange={handleCustomRangeChange}
            loading={loading}
          />
        </div>

        {/* Global Executive KPI Cards */}
        <KpiCards summary={data?.summary} loading={loading} />

        {/* TAB 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* Sales Funnel + Revenue Chart */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <SalesFunnelCard funnel={data?.funnel} loading={loading} />
              </div>
              <div className="lg:col-span-2">
                <RevenueChart analytics={data?.revenueTrend} loading={loading} />
              </div>
            </div>

            {/* Receivables & Payables */}
            <ReceivablesPayablesCard
              receivables={financeData?.receivables}
              payables={financeData?.payables}
              loading={loading}
            />

            {/* Upcoming Departures & Communications */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <UpcomingTripsList trips={opsData?.upcomingDepartures} loading={loading} />
              </div>
              <div className="space-y-6">
                <CommunicationHealthCard
                  communication={data?.summary.communication}
                  loading={loading}
                />
              </div>
            </div>

            {/* Top Destinations & VIP Customers */}
            <TopDestinationsCustomersCard
              destinations={data?.destinations}
              customers={data?.customers}
              loading={loading}
            />
          </div>
        )}

        {/* TAB 2: SALES & PIPELINE */}
        {activeTab === "SALES" && (
          <div className="space-y-6">
            <SalesFunnelCard funnel={data?.funnel} loading={loading} />
            <TopDestinationsCustomersCard
              destinations={data?.destinations}
              customers={data?.customers}
              loading={loading}
            />
          </div>
        )}

        {/* TAB 3: FINANCE & PROFITABILITY */}
        {activeTab === "FINANCE" && (
          <div className="space-y-6">
            <RevenueChart analytics={data?.revenueTrend} loading={loading} />
            <ReceivablesPayablesCard
              receivables={financeData?.receivables}
              payables={financeData?.payables}
              loading={loading}
            />
          </div>
        )}

        {/* TAB 4: OPERATIONS & DEPARTURES */}
        {activeTab === "OPERATIONS" && (
          <div className="space-y-6">
            <UpcomingTripsList trips={opsData?.upcomingDepartures} loading={loading} />
            <CommunicationHealthCard
              communication={data?.summary.communication}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
