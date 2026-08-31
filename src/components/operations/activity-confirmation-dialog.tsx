"use client";

import * as React from "react";
import { useFormik } from "formik";
import { ConfirmationStatus } from "@prisma/client";
import { operationsClient, ActivityConfirmationWithDetails } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  X,
  Compass,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  Send,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Ticket,
  FileText,
} from "lucide-react";

export type ActivityDialogMode = "REQUEST" | "CONFIRM" | "AMEND" | "CANCEL";

interface ActivityConfirmationDialogProps {
  operationId: string;
  activityConfirmation: ActivityConfirmationWithDetails | null;
  mode: ActivityDialogMode;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ActivityConfirmationDialog({
  operationId,
  activityConfirmation,
  mode,
  isOpen,
  onClose,
  onSuccess,
}: ActivityConfirmationDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const activityName =
    activityConfirmation?.tripActivity?.name ||
    activityConfirmation?.activity?.name ||
    "Tour Activity";
  const location =
    activityConfirmation?.tripActivity?.location ||
    activityConfirmation?.activity?.location ||
    "Activity Location";
  const plannedDate = activityConfirmation?.tripActivity?.date
    ? new Date(activityConfirmation.tripActivity.date).toISOString().split("T")[0]
    : "";
  const plannedTime = activityConfirmation?.tripActivity?.time || "09:30 AM";

  const formik = useFormik({
    initialValues: {
      confirmationNumber: activityConfirmation?.confirmationNumber || "",
      ticketNumber: activityConfirmation?.ticketNumber || "",
      date: plannedDate,
      time: plannedTime,
      location: location,
      supplierNotes:
        activityConfirmation?.supplierNotes ||
        (mode === "REQUEST"
          ? "Reservation request sent to excursion operator / guide."
          : mode === "AMEND"
          ? "Schedule / participant amendment requested with provider."
          : mode === "CANCEL"
          ? "Activity cancelled per customer / operations request."
          : ""),
      confirmedAt: new Date().toISOString().split("T")[0],
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (mode === "CONFIRM" && !values.confirmationNumber?.trim() && !values.ticketNumber?.trim()) {
        errors.confirmationNumber = "Either confirmation or ticket/pass number is required";
      }
      if (mode === "CANCEL" && !values.supplierNotes?.trim()) {
        errors.supplierNotes = "Please provide a reason for cancellation";
      }
      return errors;
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!activityConfirmation || !operationId) return;

      try {
        setLoading(true);

        let targetStatus: ConfirmationStatus = activityConfirmation.status;
        let successMessage = "Activity confirmation updated.";

        if (mode === "REQUEST") {
          targetStatus = ConfirmationStatus.REQUESTED;
          successMessage = "Activity requested from supplier.";
        } else if (mode === "CONFIRM") {
          targetStatus = ConfirmationStatus.CONFIRMED;
          successMessage = "Activity confirmed & pass updated!";
        } else if (mode === "AMEND") {
          targetStatus = ConfirmationStatus.AMENDED;
          successMessage = "Activity schedule amended.";
        } else if (mode === "CANCEL") {
          targetStatus = ConfirmationStatus.CANCELLED;
          successMessage = "Activity cancelled successfully.";
        }

        await operationsClient.updateActivityConfirmation(
          operationId,
          activityConfirmation.id,
          {
            status: targetStatus,
            confirmationNumber: values.confirmationNumber?.trim() || null,
            ticketNumber: values.ticketNumber?.trim() || null,
            supplierNotes: values.supplierNotes?.trim() || null,
            date: values.date ? new Date(values.date) : undefined,
            time: values.time?.trim() || undefined,
            location: values.location?.trim() || undefined,
            cancellationReason:
              mode === "CANCEL" ? values.supplierNotes?.trim() || undefined : undefined,
            confirmedAt:
              targetStatus === ConfirmationStatus.CONFIRMED
                ? new Date(values.confirmedAt || new Date())
                : undefined,
          }
        );

        toast.success(successMessage);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to update activity.");
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !activityConfirmation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            mode === "CONFIRM"
              ? "bg-emerald-50/70 border-emerald-100"
              : mode === "REQUEST"
              ? "bg-blue-50/70 border-blue-100"
              : mode === "AMEND"
              ? "bg-amber-50/70 border-amber-100"
              : "bg-rose-50/70 border-rose-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                mode === "CONFIRM"
                  ? "bg-emerald-100/70 border-emerald-200 text-emerald-700"
                  : mode === "REQUEST"
                  ? "bg-blue-100/70 border-blue-200 text-blue-700"
                  : mode === "AMEND"
                  ? "bg-amber-100/70 border-amber-200 text-amber-700"
                  : "bg-rose-100/70 border-rose-200 text-rose-700"
              }`}
            >
              {mode === "CONFIRM" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : mode === "REQUEST" ? (
                <Send className="h-5 w-5" />
              ) : mode === "AMEND" ? (
                <CalendarClock className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {mode === "CONFIRM" && "Confirm Activity & Issue Pass"}
                {mode === "REQUEST" && "Request Activity Booking"}
                {mode === "AMEND" && "Amend Activity Schedule"}
                {mode === "CANCEL" && "Cancel Activity Booking"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {activityName} • {location}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-white/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={formik.handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Planned Details Summary Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{activityName}</span>
              <span className="font-semibold text-slate-600">
                {activityConfirmation.tripActivity?.numberOfParticipants || 1} Guest(s)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-500 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {plannedDate
                    ? new Date(plannedDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Flexible Date"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{plannedTime}</span>
              </div>
            </div>
          </div>

          {/* Form Fields: Confirm / Amend / Request */}
          {(mode === "CONFIRM" || mode === "AMEND") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  Provider Confirmation Ref
                </label>
                <Input
                  name="confirmationNumber"
                  placeholder="e.g. AMBER-4411-EXP"
                  value={formik.values.confirmationNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`text-xs font-mono ${
                    formik.touched.confirmationNumber && formik.errors.confirmationNumber
                      ? "border-rose-400 focus:ring-rose-200"
                      : ""
                  }`}
                />
                {formik.touched.confirmationNumber && formik.errors.confirmationNumber && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {formik.errors.confirmationNumber}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5 text-slate-400" />
                  Ticket / Pass Number
                </label>
                <Input
                  name="ticketNumber"
                  placeholder="e.g. TKT-ROYAL-88220"
                  value={formik.values.ticketNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Schedule fields for Amend */}
          {mode === "AMEND" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Scheduled Date
                </label>
                <Input
                  type="date"
                  name="date"
                  value={formik.values.date}
                  onChange={formik.handleChange}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Time / Slot
                </label>
                <Input
                  name="time"
                  placeholder="e.g. 09:30 AM - 01:00 PM"
                  value={formik.values.time}
                  onChange={formik.handleChange}
                  className="text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Meeting Point / Activity Location
                </label>
                <Input
                  name="location"
                  placeholder="e.g. Main Palace Ticket Gate / Hotel Lobby"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* Supplier Notes / Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              {mode === "CANCEL"
                ? "Cancellation Reason (Required)"
                : "Operational Notes & Guest Instructions"}
            </label>
            <Textarea
              name="supplierNotes"
              rows={3}
              placeholder={
                mode === "CANCEL"
                  ? "Explain why this activity is being cancelled..."
                  : "e.g. Guide contact details, dress code, entry gates, meeting time instructions..."
              }
              value={formik.values.supplierNotes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`text-xs ${
                formik.touched.supplierNotes && formik.errors.supplierNotes
                  ? "border-rose-400 focus:ring-rose-200"
                  : ""
              }`}
            />
            {formik.touched.supplierNotes && formik.errors.supplierNotes && (
              <p className="text-[11px] text-rose-600 font-medium">
                {formik.errors.supplierNotes}
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`text-xs font-bold h-9 px-5 text-white cursor-pointer shadow-xs ${
                mode === "CONFIRM"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : mode === "REQUEST"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : mode === "AMEND"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : mode === "CONFIRM" ? (
                "Confirm Activity & Pass"
              ) : mode === "REQUEST" ? (
                "Send Booking Request"
              ) : mode === "AMEND" ? (
                "Save Amendments"
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
