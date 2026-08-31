"use client";

import * as React from "react";
import { ConfirmationStatus } from "@prisma/client";
import { ActivityConfirmationWithDetails } from "@/lib/api-client";
import { ActivityStatusBadge } from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  Users,
  Copy,
  Check,
  Send,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  Download,
  Ticket,
  FileText,
  Tag,
} from "lucide-react";
import { ActivityDialogMode } from "./activity-confirmation-dialog";

interface ActivityConfirmationCardProps {
  activityConfirmation: ActivityConfirmationWithDetails;
  operationId: string;
  isReadOnly?: boolean;
  onOpenDialog: (
    activity: ActivityConfirmationWithDetails,
    mode: ActivityDialogMode
  ) => void;
}

export function ActivityConfirmationCard({
  activityConfirmation,
  operationId,
  isReadOnly = false,
  onOpenDialog,
}: ActivityConfirmationCardProps) {
  const [copied, setCopied] = React.useState(false);

  const activityName =
    activityConfirmation.tripActivity?.name ||
    activityConfirmation.activity?.name ||
    "Tour Activity";
  const location =
    activityConfirmation.tripActivity?.location ||
    activityConfirmation.activity?.location ||
    "Activity Location";
  const participants =
    activityConfirmation.tripActivity?.numberOfParticipants || 1;
  const supplierName =
    (activityConfirmation.activity as any)?.supplier?.name ||
    (activityConfirmation.tripActivity?.activity as any)?.supplier?.name;

  const activityDate = activityConfirmation.tripActivity?.date
    ? new Date(activityConfirmation.tripActivity.date)
    : null;
  const activityTime =
    activityConfirmation.tripActivity?.time || "09:30 AM";

  const handleCopyPass = () => {
    const passCode =
      activityConfirmation.ticketNumber || activityConfirmation.confirmationNumber;
    if (!passCode) return;
    navigator.clipboard.writeText(passCode);
    setCopied(true);
    toast.success("Ticket / Pass # copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const status = activityConfirmation.status;

  return (
    <div
      className={`border rounded-2xl p-5 shadow-2xs transition-all space-y-4 ${
        status === ConfirmationStatus.CONFIRMED
          ? "bg-white border-slate-200/90 hover:border-purple-200"
          : status === ConfirmationStatus.REQUESTED
          ? "bg-blue-50/20 border-blue-200/80"
          : status === ConfirmationStatus.AMENDED
          ? "bg-amber-50/20 border-amber-200/80"
          : status === ConfirmationStatus.CANCELLED
          ? "bg-rose-50/20 border-rose-200/60 opacity-80"
          : "bg-white border-slate-200/80"
      }`}
    >
      {/* ─── CARD HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl border mt-0.5 ${
              status === ConfirmationStatus.CONFIRMED
                ? "bg-purple-50 border-purple-200 text-purple-700"
                : status === ConfirmationStatus.REQUESTED
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : status === ConfirmationStatus.AMENDED
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : status === ConfirmationStatus.CANCELLED
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}
          >
            <Compass className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-slate-900 leading-tight">
                {activityName}
              </h4>
              {supplierName && (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  Provider: {supplierName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {participants} Participant(s)
              </span>
            </div>
          </div>
        </div>

        <div className="self-start sm:self-auto flex items-center gap-2">
          <ActivityStatusBadge status={status} />
        </div>
      </div>

      {/* ─── OPERATIONAL & SCHEDULE DETAILS GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 text-xs">
        {/* Schedule Date */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Scheduled Date
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>
              {activityDate
                ? activityDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "TBD / Flexible"}
            </span>
          </div>
        </div>

        {/* Schedule Time */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Time / Slot
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>{activityTime}</span>
          </div>
        </div>

        {/* Confirmation Number */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Provider Conf #
          </span>
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-mono font-bold text-slate-900">
              {activityConfirmation.confirmationNumber || "—"}
            </span>
          </div>
        </div>

        {/* Ticket / Pass Number */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            E-Ticket / Pass #
          </span>
          <div className="flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            {activityConfirmation.ticketNumber || activityConfirmation.confirmationNumber ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  {activityConfirmation.ticketNumber || activityConfirmation.confirmationNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPass}
                  title="Copy pass code"
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : (
              <span className="text-slate-400 italic">Pending Issue</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── SUPPLIER NOTES & INSTRUCTIONS ─────────────────────────────────── */}
      {activityConfirmation.supplierNotes && (
        <div className="text-xs bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
            <FileText className="h-3.5 w-3.5 text-amber-600" />
            <span>OPERATOR INSTRUCTIONS & NOTES</span>
          </div>
          <p className="text-slate-600 pl-5 leading-relaxed">
            {activityConfirmation.supplierNotes}
          </p>
        </div>
      )}

      {/* ─── CONTEXTUAL ACTION BUTTONS ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {activityConfirmation.confirmedAt && (
            <span>
              Confirmed:{" "}
              {new Date(activityConfirmation.confirmedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Action: Pass PDF Download for Confirmed / Amended */}
          {(status === ConfirmationStatus.CONFIRMED || status === ConfirmationStatus.AMENDED) && (
            <a
              href={`/api/operations/${operationId}/documents/activity/${activityConfirmation.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold h-8 px-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer shadow-2xs transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Pass PDF
            </a>
          )}

          {/* Action: Request Confirmation */}
          {status === ConfirmationStatus.PENDING && (
            <Button
              size="sm"
              variant="outline"
              disabled={isReadOnly}
              onClick={() => onOpenDialog(activityConfirmation, "REQUEST")}
              className="text-xs font-bold h-8 px-3 text-blue-700 hover:bg-blue-50 border-blue-200 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Request Booking
            </Button>
          )}

          {/* Action: Confirm Activity */}
          {(status === ConfirmationStatus.PENDING ||
            status === ConfirmationStatus.REQUESTED ||
            status === ConfirmationStatus.AMENDED) && (
            <Button
              size="sm"
              disabled={isReadOnly}
              onClick={() => onOpenDialog(activityConfirmation, "CONFIRM")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {status === ConfirmationStatus.AMENDED ? "Reconfirm Pass" : "Confirm Pass"}
            </Button>
          )}

          {/* Action: Amend Schedule */}
          {status === ConfirmationStatus.CONFIRMED && (
            <Button
              size="sm"
              variant="outline"
              disabled={isReadOnly}
              onClick={() => onOpenDialog(activityConfirmation, "AMEND")}
              className="text-xs font-bold h-8 px-3 text-amber-700 hover:bg-amber-50 border-amber-200 cursor-pointer"
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1" />
              Amend Schedule
            </Button>
          )}

          {/* Action: Cancel Activity */}
          {status !== ConfirmationStatus.CANCELLED && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isReadOnly}
              onClick={() => onOpenDialog(activityConfirmation, "CANCEL")}
              className="text-xs font-bold h-8 px-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
