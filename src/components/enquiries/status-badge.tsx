import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { EnquiryStatus, EnquiryPriority } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: EnquiryStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = String(status || "").toUpperCase();

  const getStyle = () => {
    switch (norm) {
      case "NEW":
        return {
          badge: "bg-blue-50/80 text-blue-700 border-blue-200/60 hover:bg-blue-50",
          dot: "bg-blue-500",
          label: "New",
        };
      case "CONTACTED":
        return {
          badge: "bg-purple-50/80 text-purple-700 border-purple-200/60 hover:bg-purple-50",
          dot: "bg-purple-500",
          label: "Contacted",
        };
      case "QUALIFIED":
        return {
          badge: "bg-teal-50/80 text-teal-700 border-teal-200/60 hover:bg-teal-50",
          dot: "bg-teal-500",
          label: "Qualified",
        };
      case "QUOTATION_SENT":
      case "QUOTED":
        return {
          badge: "bg-indigo-50/80 text-indigo-700 border-indigo-200/60 hover:bg-indigo-50",
          dot: "bg-indigo-500",
          label: "Quotation Sent",
        };
      case "FOLLOW_UP":
      case "FOLLOW-UP":
        return {
          badge: "bg-amber-50/80 text-amber-700 border-amber-200/60 hover:bg-amber-50",
          dot: "bg-amber-500 animate-pulse",
          label: "Follow-up",
        };
      case "NEGOTIATION":
        return {
          badge: "bg-orange-50/80 text-orange-700 border-orange-200/60 hover:bg-orange-50",
          dot: "bg-orange-500",
          label: "Negotiation",
        };
      case "CONVERTED":
      case "CONFIRMED":
        return {
          badge: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60 hover:bg-emerald-50 font-semibold",
          dot: "bg-emerald-500",
          label: "Converted",
        };
      case "LOST":
        return {
          badge: "bg-rose-50/80 text-rose-700 border-rose-200/60 hover:bg-rose-50",
          dot: "bg-rose-500",
          label: "Lost",
        };
      case "CANCELLED":
        return {
          badge: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
          dot: "bg-slate-400",
          label: "Cancelled",
        };
      default:
        return {
          badge: "bg-slate-50 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          label: status,
        };
    }
  };

  const { badge, dot, label } = getStyle();

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium tracking-tight rounded-full border shadow-2xs select-none whitespace-nowrap",
        badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      <span>{label}</span>
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: EnquiryPriority | string; className?: string }) {
  const norm = String(priority || "").toUpperCase();

  const getStyle = () => {
    switch (norm) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "LOW":
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider select-none",
        getStyle(),
        className
      )}
    >
      {norm}
    </span>
  );
}
