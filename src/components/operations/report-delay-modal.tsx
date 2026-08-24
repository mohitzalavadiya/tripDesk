"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { TransportOperation } from "@/types";
import { useOperations } from "@/context/operations-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Clock, AlertTriangle } from "lucide-react";

interface ReportDelayModalProps {
  tripId: string;
  transport: TransportOperation | null;
  isOpen: boolean;
  onClose: () => void;
}

const delaySchema = Yup.object({
  delayReason: Yup.string().required("Please state the reason for delay"),
  expectedArrivalTime: Yup.string().required("Estimated revised time required"),
});

export function ReportDelayModal({
  tripId,
  transport,
  isOpen,
  onClose,
}: ReportDelayModalProps) {
  const { updateTransportStatus } = useOperations();

  const formik = useFormik({
    initialValues: {
      delayReason: "Heavy highway / airport flyover traffic congestion",
      expectedArrivalTime: "11:15 AM",
    },
    validationSchema: delaySchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (!transport) return;

      updateTransportStatus(
        tripId,
        transport.id,
        "Delayed",
        values.delayReason.trim(),
        values.expectedArrivalTime.trim()
      );

      toast.warning(
        `Chauffeur delay recorded for ${transport.title}. Operations issue generated.`
      );
      onClose();
    },
  });

  if (!isOpen || !transport) return null;

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
                {transport.title} • {transport.driverName || "Assigned Driver"}
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

        {/* Current Schedule */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-amber-800">Original Scheduled Time:</span>
            <span className="font-bold">{transport.time} ({transport.date})</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-amber-800">Pickup Location:</span>
            <span>{transport.pickupLocation}</span>
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
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              Log Delay & Flag Issue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
