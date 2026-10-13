import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = {
  title: "Trip Details & Itinerary",
  description: "View real-time trip itinerary, travel schedule, and vouchers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
