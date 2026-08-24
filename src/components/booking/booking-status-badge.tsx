import * as React from "react";
import { BookingStatus, PaymentStatus, BookingItemStatus } from "@/types";
import { cn } from "@/lib/utils";

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "Confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "On Trip":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "Completed":
        return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "Partially Confirmed":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Pending Confirmation":
        return "bg-amber-50 text-amber-700 border-amber-200/80 animate-pulse";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "Draft":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none capitalize whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {status}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "Partially Paid":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Refund Pending":
        return "bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse";
      case "Refunded":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "Unpaid":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none capitalize whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {status}
    </span>
  );
}

export function ItemStatusBadge({
  status,
  className,
}: {
  status: BookingItemStatus;
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "Confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "Requested":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "Pending":
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
