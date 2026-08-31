"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { DispatchStatus } from "@prisma/client";
import { operationsClient, VehicleDispatchWithDetails } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Clock, Loader2 } from "lucide-react";

interface ReportDelayModalProps {
  operationId: string;
  dispatch: VehicleDispatchWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const delaySchema = Yup.object({
  delayReason: Yup.string().required("Please state the reason for delay"),
  expectedArrivalTime: Yup.string().required("Estimated revised time required"),
});

export function ReportDelayModal({
  operationId,
  dispatch,
  isOpen,
  onClose,
  onSuccess,
}: ReportDelayModalProps) {
  const [loading, setLoading] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      delayReason: "Heavy highway / traffic congestion",
      expectedArrivalTime: "11:15 AM",
      createIssue: true,
    },
    validationSchema: delaySchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!dispatch || !operationId) return;

      try {
        setLoading(true);
        const updatedNotes = dispatch.notes
          ? `${dispatch.notes}\n[DELAY REPORTED]: ${values.delayReason} (ETA: ${values.expectedArrivalTime})`
          : `[DELAY REPORTED]: ${values.delayReason} (ETA: ${values.expectedArrivalTime})`;

        const targetStatus =
          dispatch.status === DispatchStatus.COMPLETED || dispatch.status === DispatchStatus.CANCELLED
            ? dispatch.status
            : DispatchStatus.ON_DUTY;

        await operationsClient.updateVehicleDispatch(operationId, dispatch.id, {
          pickupTime: values.expectedArrivalTime.trim(),
          notes: updatedNotes,
          status: targetStatus,
        });

        if (values.createIssue) {
          try {
            await operationsClient.createIssue(operationId, {
              title: `Chauffeur Delay: ${dispatch.driverName || "Driver"} (${dispatch.tripVehicle?.vehicleName || "Vehicle"})`,
              description: `Delay reported: ${values.delayReason}. Revised ETA: ${values.expectedArrivalTime}. Location: ${dispatch.pickupLocation || "Pickup point"}`,
              priority: "HIGH" as any,
            });
          } catch (issueErr) {
            console.error("Non-fatal error creating issue ticket:", issueErr);
          }
        }

        toast.warning(
          `Delay recorded for ${dispatch.tripVehicle?.vehicleName || "Vehicle"}. Status updated to On Duty.`
        );
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to log delay. Please try again.");
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !dispatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center font-bold text-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Report Chauffeur Delay</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {dispatch.tripVehicle?.vehicleName || "Vehicle"} • {dispatch.driverName || "Assigned Driver"}
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

        {/* Schedule */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-amber-800">Original Scheduled Time:</span>
            <span className="font-bold">{dispatch.pickupTime || "TBD"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-amber-800">Pickup Location:</span>
            <span>{dispatch.pickupLocation || "Scheduled location"}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Revised Estimated Arrival Time <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. 11:15 AM (Delayed by 25 mins)"
              {...formik.getFieldProps("expectedArrivalTime")}
              className="h-9.5 text-xs font-semibold"
            />
            {formik.touched.expectedArrivalTime && formik.errors.expectedArrivalTime && (
              <p className="text-[11px] text-red-500">{formik.errors.expectedArrivalTime}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Delay Reason & Operations Notes <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Heavy highway jam at Aluva bridge due to rain; driver is 6 km away"
              {...formik.getFieldProps("delayReason")}
              className="text-xs min-h-[70px]"
            />
            {formik.touched.delayReason && formik.errors.delayReason && (
              <p className="text-[11px] text-red-500">{formik.errors.delayReason}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="createIssue"
              checked={formik.values.createIssue}
              onChange={(e) => formik.setFieldValue("createIssue", e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="createIssue" className="text-xs font-medium text-slate-700 cursor-pointer">
              Log as High-Priority Issue in Issues Tracker
            </label>
          </div>

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
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Delay & Flag Fleet"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
