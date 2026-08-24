import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { IndianRupee } from "lucide-react"

export default function PaymentsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8">
      <PageHeader
        title="Payments & Accounts"
        description="Verify booking advances, track due balances, and generate supplier vouchers."
        breadcrumbs={[{ label: "Payments" }]}
      />
      <div className="px-4 py-6 md:px-8">
        <EmptyState
          icon={IndianRupee}
          title="Accounts Ledger coming soon"
          description="In Phase 4, this ledger will track customer invoices, GST records, payment link states, and commission payments."
          actionText="Log Payment"
        />
      </div>
    </div>
  )
}
