import { AppShell } from "@/components/layout/app-shell";
import { BookingProvider } from "@/context/booking-context";
import { CostingProvider } from "@/context/costing-context";
import { EnquiryProvider } from "@/context/enquiry-context";
import { InventoryProvider } from "@/context/inventory-context";
import { OperationsProvider } from "@/context/operations-context";
import { QuotationProvider } from "@/context/quotation-context";
import { SubscriptionProvider } from "@/context/subscription-context";
import { requireAgencyOwner } from "@/lib/auth";
import type { Metadata } from "next";

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
