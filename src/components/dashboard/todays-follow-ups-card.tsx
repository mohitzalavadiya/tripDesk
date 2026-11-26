"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CRMAndFollowUpAnalytics,
  CRMUpcomingFollowUpItem,
} from "@/lib/services/dashboard-service";
import { stripIdempotencyMarker } from "@/lib/utils/crm-urgency";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface TodaysFollowUpsCardProps {
  followUps?: CRMAndFollowUpAnalytics | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onQuickLog: (item: CRMUpcomingFollowUpItem) => void;
  loadingEnquiryId?: string | null;
}

type FollowUpFilterScope = "all" | "overdue" | "today";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  CALL: {
    label: "Phone Call",
    icon: Phone,
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: MessageSquare,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  EMAIL: {
    label: "Email",
    icon: Mail,
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  MEETING: {
    label: "Meeting",
    icon: Users,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "New Lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export function TodaysFollowUpsCard({
  followUps,
  loading = false,
  error = null,
  onRetry,
  onQuickLog,
  loadingEnquiryId,
}: TodaysFollowUpsCardProps) {
  const [filterScope, setFilterScope] = React.useState<FollowUpFilterScope>("all");

  const overdueList = followUps?.overdueFollowUps || [];
  const dueTodayList = followUps?.dueTodayFollowUps || [];
  const overdueCount = followUps?.overdueCount ?? overdueList.length;
  const dueTodayCount = followUps?.dueTodayCount ?? dueTodayList.length;
  const totalActionable = overdueCount + dueTodayCount;

  // Filtered items based on active tab
  const displayedItems = React.useMemo(() => {
    if (filterScope === "overdue") return overdueList;
    if (filterScope === "today") return dueTodayList;
    // For 'all', prioritize overdue items at the top
    return [...overdueList, ...dueTodayList];
  }, [filterScope, overdueList, dueTodayList]);

  const formatFollowUpTime = (dateVal?: string | null) => {
    if (!dateVal) return "-";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "-";

    const isMidnightUtc =
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0;

    if (isMidnightUtc) {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xs space-y-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1.5">
            <div className="h-5 w-64 bg-slate-200 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
          </div>
          <div className="h-8 w-44 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-rose-800 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-bold text-rose-900">
              Unable to load today&apos;s follow-ups
            </h4>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Today&apos;s Follow-ups &amp; Action Required</span>
            </h3>
            {totalActionable > 0 && (
              <Badge
                variant="outline"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  overdueCount > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {totalActionable} Actionable
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Prioritized callbacks and scheduled client touchpoints for your agency.
          </p>
        </div>

        {/* Filter pills & CRM link */}
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
          <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl text-xs font-medium max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterScope("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterScope === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalActionable})
            </button>
            <button
              type="button"
              onClick={() => setFilterScope("overdue")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                filterScope === "overdue"
                  ? "bg-white text-rose-700 shadow-2xs"
                  : "text-slate-600 hover:text-rose-600"
              }`}
            >
              Overdue ({overdueCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterScope("today")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterScope === "today"
                  ? "bg-white text-amber-800 shadow-2xs"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              Due Today ({dueTodayCount})
            </button>
          </div>

          <Link
            href="/follow-ups"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pl-1"
          >
            <span>All CRM</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Main List / Content */}
      {displayedItems.length === 0 ? (
        <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-2.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              {filterScope === "overdue"
                ? "No overdue follow-ups!"
                : filterScope === "today"
                ? "No follow-ups scheduled for today"
                : "All caught up on follow-ups!"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              {filterScope === "overdue"
                ? "Great job! All your pending customer callbacks are currently on schedule."
                : "No pending customer touchpoints require immediate action right now."}
            </p>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <Link
              href="/enquiries"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Browse active enquiries →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] sm:max-h-[480px] overflow-y-auto pr-1">
          {displayedItems.map((item) => {
            const isItemOverdue = item.isOverdue;
            const typeConfig = TYPE_CONFIG[item.type] || {
              label: item.type,
              icon: Clock,
              badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
            };
            const TypeIcon = typeConfig.icon;
            const cleanNotes = stripIdempotencyMarker(item.notes);
            const isItemLoading = loadingEnquiryId === item.enquiryId;
            const stageLabel = item.stage ? (STAGE_LABELS[item.stage] || item.stage) : null;

            return (
              <div
                key={item.id}
                className={`group rounded-xl border p-3.5 sm:p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isItemOverdue
                    ? "border-rose-200/90 bg-rose-50/20 hover:bg-rose-50/40 border-l-4 border-l-rose-500"
                    : "border-slate-200/90 bg-white hover:bg-slate-50/60 border-l-4 border-l-amber-500"
                }`}
              >
                {/* Left: Customer, Enquiry & Follow-up Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Status & Channel Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isItemOverdue ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold px-2 py-0.5 gap-1 shrink-0"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        OVERDUE
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold px-2 py-0.5 gap-1 shrink-0"
                      >
                        <Clock className="h-3 w-3" />
                        DUE TODAY
                      </Badge>
                    )}

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2 py-0.5 gap-1 shrink-0 ${typeConfig.badgeClass}`}
                    >
                      <TypeIcon className="h-2.5 w-2.5" />
                      {typeConfig.label}
                    </Badge>

                    {stageLabel && (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium px-1.5 py-0.5 shrink-0"
                      >
                        {stageLabel}
                      </Badge>
                    )}

                    {/* Scheduled time */}
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                      {formatFollowUpTime(item.scheduledAt)}
                    </span>
                  </div>

                  {/* Customer name & Enquiry reference */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.customerName}
                    </h4>
                    {item.customerPhone && item.customerPhone !== "—" && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={`tel:${item.customerPhone}`}
                          className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-mono transition-colors"
                          title="Click to call customer"
                        >
                          <Phone className="h-3 w-3 text-slate-400" />
                          {item.customerPhone}
                        </a>
                        <a
                          href={`https://wa.me/${item.customerPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 rounded font-medium transition-colors"
                          title="Open WhatsApp Click-to-Chat"
                        >
                          <MessageSquare className="h-2.5 w-2.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {item.destination}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.enquiryNumber}
                    </span>
                  </div>

                  {/* Enquiry title & notes */}
                  <div className="text-xs text-slate-600 space-y-0.5">
                    {item.enquiryTitle && item.enquiryTitle !== "Trip Enquiry" && (
                      <p className="text-slate-700 font-medium truncate max-w-xl">
                        {item.enquiryTitle}
                      </p>
                    )}
                    {cleanNotes && (
                      <p className="text-slate-500 italic text-[11px] line-clamp-2">
                        &ldquo;{cleanNotes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isItemLoading}
                    onClick={() => onQuickLog(item)}
                    aria-label={`Log contact for ${item.customerName} (${item.enquiryNumber})`}
                    className="h-8 px-3 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0 transition-all"
                  >
                    {isItemLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PhoneCall className="h-3.5 w-3.5" />
                    )}
                    <span>Quick Log</span>
                  </Button>

                  <Link
                    href={`/enquiries/${item.enquiryId}`}
                    aria-label={`View enquiry ${item.enquiryNumber} for ${item.customerName}`}
                    className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-2xs transition-all gap-1 shrink-0"
                  >
                    <span>View</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
