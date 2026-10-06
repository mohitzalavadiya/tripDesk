import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { SubscriptionProvider } from "@/context/subscription-context";
import { EnquiryProvider } from "@/context/enquiry-context";
import { InventoryProvider } from "@/context/inventory-context";
import { CostingProvider } from "@/context/costing-context";
import { QuotationProvider } from "@/context/quotation-context";
import { BookingProvider } from "@/context/booking-context";
import { OperationsProvider } from "@/context/operations-context";
import { requireAgencyOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireAgencyOwner();

  return (
    <SubscriptionProvider>
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
    </SubscriptionProvider>
  );
}
