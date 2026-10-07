import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = {
  title: "Trip Proposal & Itinerary",
  description: "View trip itinerary, hotel reservations, inclusions, and package cost details.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function QuotationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
