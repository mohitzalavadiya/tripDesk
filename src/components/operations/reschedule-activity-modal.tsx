"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { DailyActivityOperation } from "@/types";
import { useOperations } from "@/context/operations-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, CalendarClock, Calendar, Clock } from "lucide-react";

interface RescheduleActivityModalProps {
  tripId: string;
  dayNumber: number;
  activity: DailyActivityOperation | null;
  isOpen: boolean;
  onClose: () => void;
}

const rescheduleSchema = Yup.object({
  newDate: Yup.string().required("New date is required"),
  newTime: Yup.string().required("New time is required"),
  reason: Yup.string().required("Please state the reason for rescheduling"),
});

export function RescheduleActivityModal({
  tripId,
  dayNumber,
  activity,
  isOpen,
  onClose,
}: RescheduleActivityModalProps) {
  const { rescheduleActivity } = useOperations();

  const formik = useFormik({
    initialValues: {
      newDate: activity?.date || new Date().toISOString().split("T")[0],
      newTime: activity?.time || "10:00 AM",
      reason: "Customer requested postponement due to weather",
    },
    validationSchema: rescheduleSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (!activity) return;

      rescheduleActivity(
        tripId,
        dayNumber,
        activity.id,
        values.newDate,
        values.newTime,
        values.reason.trim()
      );

      toast.success(
        `${activity.title} rescheduled to ${values.newDate} (${values.newTime})`
      );
      onClose();
    },
  });

  if (!isOpen || !activity) return null;

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
              <h3 className="text-base font-bold text-slate-900">Reschedule Activity</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {activity.title}
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
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-500">Currently Scheduled:</span>
            <span className="font-bold text-slate-800">{activity.date} at {activity.time || "Scheduled"}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                New Target Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  {...formik.getFieldProps("newDate")}
                  className="pl-9 h-9.5 text-xs font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                New Time Slot <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. 02:30 PM"
                  {...formik.getFieldProps("newTime")}
                  className="pl-9 h-9.5 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Reason for Reschedule & Audit Notes <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Rain in Munnar; shifted afternoon boat ride to next morning per guest preference"
              {...formik.getFieldProps("reason")}
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
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              Confirm Reschedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
