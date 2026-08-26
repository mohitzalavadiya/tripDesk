import * as React from "react";
import { BookingStatus, BookingPaymentStatus, PaymentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase();

  const getStyles = () => {
    switch (norm) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "ONGOING":
      case "ON TRIP":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "COMPLETED":
        return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "DRAFT":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "CONFIRMED":
        return "Confirmed";
      case "ONGOING":
      case "ON TRIP":
        return "On Trip";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      case "DRAFT":
      default:
        return "Draft";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: BookingPaymentStatus | PaymentStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase();

  const getStyles = () => {
    switch (norm) {
      case "PAID":
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "PARTIALLY_PAID":
      case "PARTIALLY PAID":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200/80 animate-pulse";
      case "REFUNDED":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "FAILED":
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "UNPAID":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "PAID":
      case "COMPLETED":
        return "Paid";
      case "PARTIALLY_PAID":
      case "PARTIALLY PAID":
        return "Partially Paid";
      case "PENDING":
        return "Pending";
      case "REFUNDED":
        return "Refunded";
      case "FAILED":
        return "Failed";
      case "CANCELLED":
        return "Cancelled";
      case "UNPAID":
      default:
        return "Unpaid";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export function ItemStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase();

  const getStyles = () => {
    switch (norm) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "REQUESTED":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "PENDING":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border select-none capitalize whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {status}
    </span>
  );
}
