import * as React from "react";
import {
  TripOperationsStatus,
  TransportStatus,
  ActivityOperationStatus,
  TripIssue,
} from "@/types";
import { cn } from "@/lib/utils";

export function TripOperationsStatusBadge({
  status,
  className,
}: {
  status: TripOperationsStatus;
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "On Trip":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse";
      case "Ready for Trip":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "Pickup Pending":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Completed":
        return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "Delayed":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "Cancelled":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "Upcoming":
      default:
        return "bg-blue-50 text-blue-700 border-blue-200/80";
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
      {status}
    </span>
  );
}

export function TransportStatusBadge({
  status,
  className,
}: {
  status: TransportStatus;
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "Completed":
        return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "Customer Picked Up":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "Arrived":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "Driver On The Way":
        return "bg-blue-50 text-blue-700 border-blue-200/80 animate-pulse";
      case "Driver Assigned":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Delayed":
        return "bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse";
      case "Cancelled":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "Scheduled":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
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
      {status}
    </span>
  );
}

export function ActivityStatusBadge({
  status,
  className,
}: {
  status: ActivityOperationStatus;
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "In Progress":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80 animate-pulse";
      case "Rescheduled":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Skipped":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "Scheduled":
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
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
      {status}
    </span>
  );
}

export function IssuePriorityBadge({
  priority,
  className,
}: {
  priority: TripIssue["priority"];
  className?: string;
}) {
  const getStyles = () => {
    switch (priority) {
      case "Critical":
        return "bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse";
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "Low":
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
      {priority}
    </span>
  );
}

export function IssueStatusBadge({
  status,
  className,
}: {
  status: TripIssue["status"];
  className?: string;
}) {
  const getStyles = () => {
    switch (status) {
      case "Resolved":
      case "Closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Open":
      default:
        return "bg-rose-50 text-rose-700 border-rose-200/80 font-bold";
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
      {status}
    </span>
  );
}
