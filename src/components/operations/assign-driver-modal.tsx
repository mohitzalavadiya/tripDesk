"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { DispatchStatus } from "@prisma/client";
import { operationsClient, VehicleDispatchWithDetails } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, UserCheck, Car, Calendar, Clock, Loader2 } from "lucide-react";

interface AssignDriverModalProps {
  operationId: string;
  dispatch: VehicleDispatchWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const driverAssignSchema = Yup.object({
  driverName: Yup.string().required("Driver name is required"),
  driverPhone: Yup.string().required("Driver phone is required"),
  vehicleNumber: Yup.string().optional(),
  pickupLocation: Yup.string().optional(),
  dropLocation: Yup.string().optional(),
  pickupTime: Yup.string().optional(),
});

export function AssignDriverModal({
  operationId,
  dispatch,
  isOpen,
  onClose,
  onSuccess,
}: AssignDriverModalProps) {
  const [loading, setLoading] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      driverName: dispatch?.driverName || "",
      driverPhone: dispatch?.driverPhone || "",
      vehicleNumber: dispatch?.vehicleNumber || dispatch?.vehicle?.registrationNumber || "",
      pickupLocation: dispatch?.pickupLocation || dispatch?.tripVehicle?.pickupLocation || "",
      dropLocation: dispatch?.dropLocation || dispatch?.tripVehicle?.dropLocation || "",
      pickupTime: dispatch?.pickupTime || "09:00 AM",
      notes: dispatch?.notes || "",
    },
    validationSchema: driverAssignSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!dispatch || !operationId) return;

      try {
        setLoading(true);
        const targetStatus =
          dispatch.status === DispatchStatus.PENDING || dispatch.status === DispatchStatus.CANCELLED
            ? DispatchStatus.ASSIGNED
            : dispatch.status;

        await operationsClient.updateVehicleDispatch(operationId, dispatch.id, {
          driverName: values.driverName.trim(),
          driverPhone: values.driverPhone.trim(),
          vehicleNumber: values.vehicleNumber?.trim() || undefined,
          pickupLocation: values.pickupLocation?.trim() || undefined,
          dropLocation: values.dropLocation?.trim() || undefined,
          pickupTime: values.pickupTime?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          status: targetStatus,
        });

        toast.success(`Chauffeur ${values.driverName} saved successfully!`);
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to assign driver. Please try again.");
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !dispatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Chauffeur & Vehicle</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {dispatch.tripVehicle?.vehicleName || dispatch.vehicle?.name || "Vehicle Dispatch"}
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

        {/* Schedule Info */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">
              {dispatch.pickupDate
                ? new Date(dispatch.pickupDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Scheduled"}
            </span>
            <span>•</span>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">{dispatch.pickupTime || "TBD"}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
            {dispatch.pickupLocation || "Pickup"} → {dispatch.dropLocation || "Drop"}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Driver Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Chauffeur / Driver Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Rajesh Kumar"
                {...formik.getFieldProps("driverName")}
                className="h-9.5 text-xs font-semibold"
              />
              {formik.touched.driverName && formik.errors.driverName && (
                <p className="text-[11px] text-red-500">{formik.errors.driverName}</p>
              )}
            </div>

            {/* Driver Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Driver Phone / WhatsApp <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. +91 94471 22334"
                {...formik.getFieldProps("driverPhone")}
                className="h-9.5 text-xs font-semibold"
              />
              {formik.touched.driverPhone && formik.errors.driverPhone && (
                <p className="text-[11px] text-red-500">{formik.errors.driverPhone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Vehicle Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Registration / Plate Number
              </label>
              <Input
                placeholder="e.g. KL 07 CC 9812"
                {...formik.getFieldProps("vehicleNumber")}
                className="h-9.5 text-xs font-mono font-bold uppercase"
              />
            </div>

            {/* Pickup Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pickup Time</label>
              <Input
                placeholder="e.g. 09:30 AM"
                {...formik.getFieldProps("pickupTime")}
                className="h-9.5 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Pickup Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pickup Location</label>
              <Input
                placeholder="e.g. Kochi Airport (COK)"
                {...formik.getFieldProps("pickupLocation")}
                className="h-9.5 text-xs"
              />
            </div>

            {/* Drop Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Drop Location</label>
              <Input
                placeholder="e.g. Munnar Resort"
                {...formik.getFieldProps("dropLocation")}
                className="h-9.5 text-xs"
              />
            </div>
          </div>

          {/* Special Notes & Route Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Dispatch Instructions / Route Remarks
            </label>
            <Input
              placeholder="e.g. Meet guests with name board outside Arrival Gate 2"
              {...formik.getFieldProps("notes")}
              className="h-9.5 text-xs"
            />
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Assignment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
