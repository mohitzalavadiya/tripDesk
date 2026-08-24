import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Clock } from "lucide-react"

export default function FollowUpsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8">
      <PageHeader
        title="Follow-ups"
        description="Schedule callbacks, track payment alerts, and maintain active client relationships."
        breadcrumbs={[{ label: "Follow-ups" }]}
      />
      <div className="px-4 py-6 md:px-8">
        <EmptyState
          icon={Clock}
          title="Follow-ups scheduler coming soon"
          description="In Phase 2, this will support task reminders, automated WhatsApp followups, and calendar schedules."
          actionText="Add Follow-up Task"
        />
      </div>
    </div>
  )
}
