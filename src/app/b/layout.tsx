import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = {
  title: "Booking Confirmation & Details",
  description: "View verified booking confirmation, travel dates, and payment history.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
