"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { TripOperation, TripIssue } from "@/types";
import { useOperations } from "@/context/operations-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, AlertCircle } from "lucide-react";

interface CreateIssueModalProps {
  operation?: TripOperation | null;
  isOpen: boolean;
  onClose: () => void;
}

const issueSchema = Yup.object({
  type: Yup.string().required("Type is required"),
  priority: Yup.string().required("Priority is required"),
  title: Yup.string().required("Title is required"),
  description: Yup.string().required("Description is required"),
  assignedTo: Yup.string().optional(),
});

export function CreateIssueModal({
  operation,
  isOpen,
  onClose,
}: CreateIssueModalProps) {
  const { createIssue, operations } = useOperations();
  const [selectedTripId, setSelectedTripId] = React.useState<string>(
    operation?.tripId || operations[0]?.tripId || ""
  );

  const currentOp = operation || operations.find((o) => o.tripId === selectedTripId);

  const formik = useFormik({
    initialValues: {
      type: "Hotel" as TripIssue["type"],
      priority: "High" as TripIssue["priority"],
      title: "",
      description: "",
      assignedTo: "Kishan (Support Desk)",
    },
    validationSchema: issueSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (!currentOp) return;

      createIssue({
        tripId: currentOp.tripId,
        bookingId: currentOp.bookingId,
        customerId: currentOp.customerSnapshot.id,
        customerName: currentOp.customerSnapshot.name,
        type: values.type,
        priority: values.priority,
        title: values.title.trim(),
        description: values.description.trim(),
        status: "Open",
        assignedTo: values.assignedTo.trim() || undefined,
      });

      toast.success(`Operational Issue "${values.title}" logged successfully!`);
      formik.resetForm();
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center font-bold text-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Log Operational Issue</h3>
              <p className="text-xs text-slate-500 font-mono">
                {currentOp ? `${currentOp.title} (${currentOp.bookingNumber})` : "Select Active Trip"}
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

        {/* Trip Selector if not pre-selected */}
        {!operation && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Select Trip</label>
            <Select value={selectedTripId} onValueChange={(val) => setSelectedTripId(val || "")}>
              <SelectTrigger className="h-9.5 text-xs font-semibold">
                <SelectValue placeholder="Select Trip" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {operations.map((op) => (
                  <SelectItem key={op.tripId} value={op.tripId}>
                    {op.title} • {op.bookingNumber} ({op.customerSnapshot.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Issue Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={formik.values.type}
                onValueChange={(val) => formik.setFieldValue("type", val)}
              >
                <SelectTrigger className="h-9.5 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="Hotel">Hotel / Resort Room Issue</SelectItem>
                  <SelectItem value="Transport">Transport / Chauffeur Issue</SelectItem>
                  <SelectItem value="Activity">Activity / Excursion Issue</SelectItem>
                  <SelectItem value="Customer">Customer Request / Change</SelectItem>
                  <SelectItem value="Payment">Payment & Billing</SelectItem>
                  <SelectItem value="Itinerary">Itinerary Modification</SelectItem>
                  <SelectItem value="Supplier">DMC / Supplier Delay</SelectItem>
                  <SelectItem value="Other">Other Operational Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Urgency Priority <span className="text-red-500">*</span>
              </label>
              <Select
                value={formik.values.priority}
                onValueChange={(val) => formik.setFieldValue("priority", val)}
              >
                <SelectTrigger className="h-9.5 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="Critical">🔴 Critical (Immediate Action Required)</SelectItem>
                  <SelectItem value="High">🟠 High Priority</SelectItem>
                  <SelectItem value="Medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="Low">⚪ Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Issue Summary Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Hotel room not ready upon guest check-in"
              {...formik.getFieldProps("title")}
              className="h-9.5 text-xs font-semibold"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Provide exact details, room number, guest complaint, or supplier remarks..."
              {...formik.getFieldProps("description")}
              className="text-xs min-h-[70px]"
            />
          </div>

          {/* Assigned Support Desk */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Resolution Desk / Department</label>
            <Input
              placeholder="e.g. Operations Support Desk"
              {...formik.getFieldProps("assignedTo")}
              className="h-9.5 text-xs font-medium"
            />
          </div>

          {/* Action Buttons */}
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
              Log Issue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
