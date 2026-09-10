"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  Send,
  Eye,
  XCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  FileText,
  Ban,
  BadgeAlert,
} from "lucide-react";

export type UniversalStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "VOIDED"
  | "CONFIRMED"
  | "ONGOING"
  | "COMPLETED"
  | "PLANNING"
  | "QUOTED"
  | "BOOKED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "FAILED"
  | "REFUNDED"
  | "TRIAL"
  | string;

interface StatusBadgeProps {
  status: UniversalStatus;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, className = "", size = "sm" }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  const getConfig = () => {
    switch (norm) {
      // Success / Complete
      case "PAID":
      case "ACCEPTED":
      case "CONFIRMED":
      case "BOOKED":
      case "COMPLETED":
      case "ACTIVE":
      case "DISPATCHED":
        return {
          icon: CheckCircle2,
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          defaultLabel:
            norm === "PAID"
              ? "Paid"
              : norm === "ACTIVE"
              ? "Active"
              : norm === "ACCEPTED"
              ? "Accepted"
              : norm === "DISPATCHED"
              ? "Dispatched"
              : norm === "CONFIRMED" || norm === "BOOKED"
              ? "Confirmed"
              : "Completed",
        };

      // Info / Issued / Sent / Quoted / Scheduled / Assigned
      case "ISSUED":
      case "SENT":
      case "QUOTED":
      case "SCHEDULED":
      case "ASSIGNED":
        return {
          icon: Send,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          defaultLabel:
            norm === "ISSUED"
              ? "Issued"
              : norm === "SENT"
              ? "Sent"
              : norm === "SCHEDULED"
              ? "Scheduled"
              : norm === "ASSIGNED"
              ? "Assigned"
              : "Quoted",
        };

      // In Progress / Partial / Viewed / Planning / Ongoing / On Duty
      case "PARTIALLY_PAID":
        return {
          icon: Clock,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          defaultLabel: "Partially Paid",
        };
      case "VIEWED":
        return {
          icon: Eye,
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          defaultLabel: "Viewed",
        };
      case "PLANNING":
      case "ONGOING":
      case "IN PROGRESS":
      case "ON_DUTY":
        return {
          icon: Sparkles,
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          defaultLabel: norm === "PLANNING" ? "Planning" : norm === "ON_DUTY" ? "On Duty" : "In Progress",
        };

      // Pending / Trial / Expired / Pending Confirmation
      case "PENDING":
      case "TRIAL":
      case "PENDING_CONFIRMATION":
        return {
          icon: Clock,
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          defaultLabel:
            norm === "TRIAL"
              ? "Trial"
              : norm === "PENDING_CONFIRMATION"
              ? "Pending Confirmation"
              : "Pending",
        };
      case "EXPIRED":
        return {
          icon: Clock,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          defaultLabel: "Expired",
        };

      // Cancelled / Rejected / Revoked / Voided / Failed
      case "CANCELLED":
      case "REJECTED":
      case "REVOKED":
        return {
          icon: XCircle,
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          defaultLabel: norm === "REVOKED" ? "Revoked" : norm === "REJECTED" ? "Rejected" : "Cancelled",
        };
      case "VOIDED":
        return {
          icon: Ban,
          bg: "bg-slate-100 text-slate-700 border-slate-300 font-mono",
          defaultLabel: "VOIDED",
        };
      case "FAILED":
        return {
          icon: ShieldAlert,
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          defaultLabel: "Failed",
        };
      case "REFUNDED":
        return {
          icon: RotateCcw,
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          defaultLabel: "Refunded",
        };

      case "OVERDUE":
        return {
          icon: AlertCircle,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          defaultLabel: "Overdue",
        };
      case "GENERATED":
        return {
          icon: Clock,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          defaultLabel: "Draft / Generated",
        };
      case "SUPERSEDED":
        return {
          icon: RotateCcw,
          bg: "bg-slate-100 text-slate-600 border-slate-200",
          defaultLabel: "Superseded",
        };

      // Draft / Inactive / Default
      case "DRAFT":
      case "INACTIVE":
      default:
        return {
          icon: FileText,
          bg: "bg-slate-100 text-slate-600 border-slate-200",
          defaultLabel: norm === "INACTIVE" ? "Inactive" : "Draft",
        };
    }
  };

  const { icon: Icon, bg, defaultLabel } = getConfig();
  const displayLabel = label || defaultLabel;
  const padding = size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border tracking-wide select-none ${padding} ${bg} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0 stroke-[2]" />
      <span>{displayLabel}</span>
    </span>
  );
}
