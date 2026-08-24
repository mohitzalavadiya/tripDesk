import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { BarChart } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8">
      <PageHeader
        title="Reports & Analytics"
        description="Review agency sales performance, agent conversion rates, and revenue trends."
        breadcrumbs={[{ label: "Reports" }]}
      />
      <div className="px-4 py-6 md:px-8">
        <EmptyState
          icon={BarChart}
          title="Performance Reports coming soon"
          description="In Phase 4, you will be able to export conversion rate sheets, destination summaries, and tax accounting reports."
          actionText="Export Summary"
        />
      </div>
    </div>
  )
}
