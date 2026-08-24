"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { PipelineView } from "@/components/dashboard/pipeline-view"
import { FollowUpsList } from "@/components/dashboard/follow-ups-list"
import { RecentEnquiriesTable } from "@/components/dashboard/recent-enquiries-table"
import { UpcomingTripsList } from "@/components/dashboard/upcoming-trips-list"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function DashboardPage() {
  const handleRefresh = () => {
    toast.info("Refreshing dashboard data...")
    setTimeout(() => {
      toast.success("Dashboard data updated")
    }, 800)
  }

  const handleNewEnquiry = () => {
    toast.success("Create Enquiry form overlay coming in Phase 2!")
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8">
      {/* 1. Page Header widget */}
      <PageHeader
        title="Good afternoon, Mohit 👋"
        description="Here's what's happening with your travel business today."
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

      {/* 2. Main Dashboard content dashboard grid */}
      <div className="px-4 py-6 md:px-8 space-y-6">
        {/* KPI Cards Grid */}
        <KpiCards />

        {/* Pipeline stage tracker */}
        <PipelineView />

        {/* Chart & Followups layout */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <FollowUpsList />
          </div>
        </div>

        {/* Recent Enquiries table & Upcoming Trips list */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentEnquiriesTable />
          </div>
          <div>
            <UpcomingTripsList />
          </div>
        </div>
      </div>
    </div>
  )
}
