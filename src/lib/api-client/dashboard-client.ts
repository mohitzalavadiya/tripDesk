import {
  DashboardSummary,
  PipelineStageMetric,
  MonthlyRevenueMetric,
  RecentEnquiryItem,
  UpcomingTripItem,
  PendingFollowUpItem,
} from "@/lib/services/dashboard-service";

export interface DashboardApiResponse {
  summary: DashboardSummary;
  pipeline: PipelineStageMetric[];
  revenueTrend: MonthlyRevenueMetric[];
  recentEnquiries: RecentEnquiryItem[];
  upcomingTrips: UpcomingTripItem[];
  pendingFollowUps: PendingFollowUpItem[];
}

export const dashboardClient = {
  async getSummary(): Promise<DashboardApiResponse> {
    const res = await fetch("/api/dashboard/summary", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch dashboard metrics.");
    }

    return json.data;
  },
};
