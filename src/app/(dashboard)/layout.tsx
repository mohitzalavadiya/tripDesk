import * as React from "react"
import { AppShell } from "@/components/layout/app-shell"
import { EnquiryProvider } from "@/context/enquiry-context"
import { InventoryProvider } from "@/context/inventory-context"
import { CostingProvider } from "@/context/costing-context"
import { QuotationProvider } from "@/context/quotation-context"
import { BookingProvider } from "@/context/booking-context"
import { OperationsProvider } from "@/context/operations-context"
import { ExperienceProvider } from "@/context/experience-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <EnquiryProvider>
      <InventoryProvider>
        <CostingProvider>
          <QuotationProvider>
            <BookingProvider>
              <OperationsProvider>
                <ExperienceProvider>
                  <AppShell>{children}</AppShell>
                </ExperienceProvider>
              </OperationsProvider>
            </BookingProvider>
          </QuotationProvider>
        </CostingProvider>
      </InventoryProvider>
    </EnquiryProvider>
  )
}

