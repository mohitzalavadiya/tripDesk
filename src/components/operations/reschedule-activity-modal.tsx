"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ConfirmationStatus } from "@prisma/client";
import { operationsClient, ActivityConfirmationWithDetails } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, CalendarClock, Loader2 } from "lucide-react";

interface RescheduleActivityModalProps {
  operationId: string;
  activityConfirmation: ActivityConfirmationWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const rescheduleSchema = Yup.object({
  supplierNotes: Yup.string().required("Please state the reason/notes for rescheduling"),
  confirmationNumber: Yup.string().optional(),
  ticketNumber: Yup.string().optional(),
});

export function RescheduleActivityModal({
  operationId,
  activityConfirmation,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleActivityModalProps) {
  const [loading, setLoading] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      confirmationNumber: activityConfirmation?.confirmationNumber || "",
      ticketNumber: activityConfirmation?.ticketNumber || "",
      supplierNotes: activityConfirmation?.supplierNotes || "Rescheduled due to guest request / weather condition",
    },
    validationSchema: rescheduleSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!activityConfirmation || !operationId) return;

      try {
        setLoading(true);
        await operationsClient.updateActivityConfirmation(
          operationId,
          activityConfirmation.id,
          {
            confirmationNumber: values.confirmationNumber?.trim() || undefined,
            ticketNumber: values.ticketNumber?.trim() || undefined,
            supplierNotes: values.supplierNotes.trim(),
            status: ConfirmationStatus.AMENDED,
          }
        );

        toast.success(
          `Activity status updated to Amended with revised schedule notes.`
        );
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to update activity. Please try again.");
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !activityConfirmation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center font-bold text-sm">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reschedule / Amend Activity</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {activityConfirmation.tripActivity?.name || activityConfirmation.activity?.name || "Activity"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Confirmation / Voucher #</label>
              <Input
                placeholder="e.g. ACT-CONF-9812"
                {...formik.getFieldProps("confirmationNumber")}
                className="h-9.5 text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ticket / Pass #</label>
              <Input
                placeholder="e.g. TKT-2026-0012"
                {...formik.getFieldProps("ticketNumber")}
                className="h-9.5 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Reschedule Details & Supplier Notes <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Moved from 10:00 AM to 03:30 PM slot with tour guide approval..."
              {...formik.getFieldProps("supplierNotes")}
              className="text-xs min-h-[80px]"
            />
            {formik.touched.supplierNotes && formik.errors.supplierNotes && (
              <p className="text-[11px] text-red-500">{formik.errors.supplierNotes}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Amendments"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
