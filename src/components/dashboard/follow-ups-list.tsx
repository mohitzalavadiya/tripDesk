"use client";

import * as React from "react";
import { PhoneCall, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PendingFollowUpItem } from "@/lib/services/dashboard-service";

interface FollowUpsListProps {
  followUps?: PendingFollowUpItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function FollowUpsList({
  followUps = [],
  loading = false,
  onRefresh,
}: FollowUpsListProps) {
  const router = useRouter();

  // Get count due today
  const dueTodayCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return followUps.filter((f) => {
      const fDate = new Date(f.scheduledAt).toISOString().split("T")[0];
      return fDate === todayStr;
    }).length;
  }, [followUps]);

  const handleCall = (clientName: string, phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, "_self");
    } else {
      toast.info(`Dialing ${clientName}`);
    }
  };

  const getDueDateLabel = (date: Date | string) => {
    const today = new Date();
    const d = new Date(date);
    const todayStr = today.toISOString().split("T")[0];
    const dStr = d.toISOString().split("T")[0];

    if (dStr === todayStr) return "Today";

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    if (dStr === tomorrowStr) return "Tomorrow";

    if (d.getTime() < today.getTime()) return "Overdue";

    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const handleComplete = async (enquiryId: string, followUpId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/follow-ups/${followUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!res.ok) {
        throw new Error("Failed to complete follow up");
      }

      toast.success("Follow-up marked as completed");
      if (onRefresh) onRefresh();
    } catch {
      toast.error("Failed to complete follow up task");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs h-full">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-100 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 flex flex-col transition-all hover:shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Pending Follow-ups
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tasks requiring immediate agent outreach
          </p>
        </div>
        <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full select-none">
          {dueTodayCount} Due
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {followUps.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-10">
            All follow-ups completed! No tasks pending.
          </div>
        ) : (
          followUps.map((item) => {
            const customerName = item.customerName || item.enquiry?.customer?.name || "Client";
            const destination = item.destination || item.enquiry?.destination || "-";
            const phone = item.customerPhone || item.enquiry?.customer?.phone || "";
            const dueLabel = getDueDateLabel(item.scheduledAt);
            const isOverdue = dueLabel === "Overdue";
            const isToday = dueLabel === "Today";

            return (
              <div
                key={item.id}
                onClick={() => router.push(`/enquiries/${item.enquiryId}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group cursor-pointer"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {customerName}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none ${
                        isOverdue
                          ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse"
                          : isToday
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {dueLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="font-semibold text-slate-700 truncate max-w-[90px]">{destination}</span>
                    <span>•</span>
                    <span className="truncate">{item.type}</span>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-slate-400 truncate max-w-[190px]" title={item.notes}>
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleComplete(item.enquiryId, item.id, e)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer"
                    title="Mark completed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleCall(customerName, phone)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer"
                    title={`Call ${customerName} (${phone})`}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => router.push(`/enquiries/${item.enquiryId}`)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
