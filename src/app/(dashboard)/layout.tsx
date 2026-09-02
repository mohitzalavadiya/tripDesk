import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EnquiryProvider } from "@/context/enquiry-context";
import { InventoryProvider } from "@/context/inventory-context";
import { CostingProvider } from "@/context/costing-context";
import { QuotationProvider } from "@/context/quotation-context";
import { BookingProvider } from "@/context/booking-context";
import { OperationsProvider } from "@/context/operations-context";
import { requireAgencyOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireAgencyOwner();

  return (
    <EnquiryProvider>
      <InventoryProvider>
        <CostingProvider>
          <QuotationProvider>
            <BookingProvider>
              <OperationsProvider>
                <AppShell>{children}</AppShell>
              </OperationsProvider>
            </BookingProvider>
          </QuotationProvider>
        </CostingProvider>
      </InventoryProvider>
    </EnquiryProvider>
  );
}
