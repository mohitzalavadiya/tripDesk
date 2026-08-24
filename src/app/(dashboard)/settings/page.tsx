import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8">
      <PageHeader
        title="Settings"
        description="Configure agency policies, profile signatures, and notification parameters."
        breadcrumbs={[{ label: "Settings" }]}
      />
      <div className="px-4 py-6 md:px-8">
        <EmptyState
          icon={Settings}
          title="System Settings coming soon"
          description="In Phase 2, this will support managing agency profile logos, team permissions, WhatsApp integrations, and default terms & conditions."
          actionText="Edit Settings"
        />
      </div>
    </div>
  )
}
