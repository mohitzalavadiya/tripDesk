import * as React from "react";
import {
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
} from "@prisma/client";
import { cn } from "@/lib/utils";

export function TripOperationsStatusBadge({
  status,
  className,
}: {
  status: OperationStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase().replace(/\s+/g, "_");

  const getStyles = () => {
    switch (norm) {
      case "ONGOING":
      case "ON_TRIP":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse";
      case "READY":
      case "READY_FOR_TRIP":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "PREPARING":
      case "PICKUP_PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "COMPLETED":
        return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "CANCELLED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "PENDING":
      default:
        return "bg-blue-50 text-blue-700 border-blue-200/80";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "ONGOING":
      case "ON_TRIP":
        return "On Trip";
      case "READY":
      case "READY_FOR_TRIP":
        return "Ready for Trip";
      case "PREPARING":
        return "Preparing";
      case "PICKUP_PENDING":
        return "Pickup Pending";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      case "PENDING":
      default:
        return "Pending";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export function TransportStatusBadge({
  status,
  className,
}: {
  status: DispatchStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase().replace(/\s+/g, "_");

  const getStyles = () => {
    switch (norm) {
      case "COMPLETED":
        return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "ON_DUTY":
      case "CUSTOMER_PICKED_UP":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse";
      case "CONFIRMED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "ASSIGNED":
      case "DRIVER_ASSIGNED":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "CANCELLED":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "PENDING":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "COMPLETED":
        return "Completed";
      case "ON_DUTY":
        return "On Duty";
      case "CONFIRMED":
        return "Confirmed";
      case "ASSIGNED":
      case "DRIVER_ASSIGNED":
        return "Assigned";
      case "CANCELLED":
        return "Cancelled";
      case "PENDING":
      default:
        return "Pending";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export function HotelConfirmationStatusBadge({
  status,
  className,
}: {
  status: ConfirmationStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase().replace(/\s+/g, "_");

  const getStyles = () => {
    switch (norm) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "REQUESTED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "AMENDED":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "PENDING":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "CONFIRMED":
        return "Confirmed";
      case "REQUESTED":
        return "Requested";
      case "AMENDED":
        return "Amended";
      case "CANCELLED":
        return "Cancelled";
      case "PENDING":
      default:
        return "Pending";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export function ActivityStatusBadge({
  status,
  className,
}: {
  status: ConfirmationStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase().replace(/\s+/g, "_");

  const getStyles = () => {
    switch (norm) {
      case "CONFIRMED":
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "REQUESTED":
      case "IN_PROGRESS":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80 animate-pulse";
      case "AMENDED":
      case "RESCHEDULED":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "PENDING":
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "CONFIRMED":
        return "Confirmed";
      case "REQUESTED":
        return "Requested";
      case "AMENDED":
        return "Amended";
      case "CANCELLED":
        return "Cancelled";
      case "PENDING":
      default:
        return "Pending";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

export function IssuePriorityBadge({
  priority,
  className,
}: {
  priority: IssuePriority | string;
  className?: string;
}) {
  const norm = String(priority || "").toUpperCase();

  const getStyles = () => {
    switch (norm) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse";
      case "HIGH":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 font-medium";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border select-none uppercase tracking-wider",
        getStyles(),
        className
      )}
    >
      {norm}
    </span>
  );
}

export function IssueStatusBadge({
  status,
  className,
}: {
  status: IssueStatus | string;
  className?: string;
}) {
  const norm = String(status || "").toUpperCase().replace(/\s+/g, "_");

  const getStyles = () => {
    switch (norm) {
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "IN_PROGRESS":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "OPEN":
      default:
        return "bg-rose-50 text-rose-700 border-rose-200/80 font-bold";
    }
  };

  const getLabel = () => {
    switch (norm) {
      case "RESOLVED":
        return "Resolved";
      case "CLOSED":
        return "Closed";
      case "IN_PROGRESS":
        return "In Progress";
      case "OPEN":
      default:
        return "Open";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border select-none whitespace-nowrap",
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}
