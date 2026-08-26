"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PipelineView } from "@/components/dashboard/pipeline-view";
import { FollowUpsList } from "@/components/dashboard/follow-ups-list";
import { RecentEnquiriesTable } from "@/components/dashboard/recent-enquiries-table";
import { UpcomingTripsList } from "@/components/dashboard/upcoming-trips-list";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { dashboardClient, DashboardApiResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = React.useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboardData = React.useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await dashboardClient.getSummary();
      setData(res);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load live dashboard metrics.");
      if (!isSilent) toast.error("Could not refresh dashboard data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    toast.info("Refreshing live dashboard metrics...");
    await fetchDashboardData(false);
    toast.success("Dashboard metrics updated.");
  };

  const handleNewEnquiry = () => {
    router.push("/enquiries/new");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8">
      {/* 1. Page Header widget */}
      <PageHeader
        title="Agency Operations & Sales Dashboard"
        description="Live overview of client enquiries, confirmed bookings, financial collections, and scheduled trips."
        breadcrumbs={[]}
        primaryAction={{
          label: "New Enquiry",
          onClick: handleNewEnquiry,
          icon: Plus,
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

      {/* Error state if API call failed */}
      {error && !loading && (
        <div className="px-4 md:px-8 mt-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchDashboardData()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* 2. Main Dashboard content dashboard grid */}
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* KPI Cards Grid */}
        <KpiCards summary={data?.summary} loading={loading} />

        {/* Pipeline stage tracker */}
        <PipelineView pipeline={data?.pipeline} loading={loading} />

        {/* Chart & Followups layout */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart revenueTrend={data?.revenueTrend} loading={loading} />
          </div>
          <div>
            <FollowUpsList
              followUps={data?.pendingFollowUps}
              loading={loading}
              onRefresh={() => fetchDashboardData(true)}
            />
          </div>
        </div>

        {/* Recent Enquiries table & Upcoming Trips list */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentEnquiriesTable enquiries={data?.recentEnquiries} loading={loading} />
          </div>
          <div>
            <UpcomingTripsList trips={data?.upcomingTrips} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
