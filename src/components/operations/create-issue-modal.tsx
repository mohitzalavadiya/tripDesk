"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { IssuePriority } from "@prisma/client";
import { operationsClient } from "@/lib/api-client";
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
import { X, AlertCircle, Loader2 } from "lucide-react";

interface CreateIssueModalProps {
  operationId?: string;
  operationList?: Array<{
    id: string;
    title: string;
    bookingNumber?: string | null;
    customerName?: string;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const issueSchema = Yup.object({
  title: Yup.string().required("Issue title is required"),
  description: Yup.string().required("Issue description is required"),
  priority: Yup.string().required("Priority is required"),
  assignedTo: Yup.string().optional(),
  reportedBy: Yup.string().optional(),
});

export function CreateIssueModal({
  operationId,
  operationList = [],
  isOpen,
  onClose,
  onSuccess,
}: CreateIssueModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [selectedOpId, setSelectedOpId] = React.useState<string>(
    operationId || operationList[0]?.id || ""
  );

  React.useEffect(() => {
    if (operationId) {
      setSelectedOpId(operationId);
    } else if (operationList.length > 0 && !selectedOpId) {
      setSelectedOpId(operationList[0].id);
    }
  }, [operationId, operationList]);

  const formik = useFormik({
    initialValues: {
      priority: IssuePriority.HIGH,
      title: "",
      description: "",
      assignedTo: "",
      reportedBy: "Operations Desk",
    },
    validationSchema: issueSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      const targetId = operationId || selectedOpId;
      if (!targetId) {
        toast.error("Please select an operation for this issue.");
        return;
      }

      try {
        setLoading(true);
        await operationsClient.createIssue(targetId, {
          title: values.title.trim(),
          description: values.description.trim(),
          priority: values.priority as IssuePriority,
          assignedTo: values.assignedTo?.trim() || undefined,
          reportedBy: values.reportedBy?.trim() || undefined,
        });

        toast.success(`Operational issue "${values.title}" logged successfully!`);
        formik.resetForm();
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to create issue. Please try again.");
      } finally {
        setLoading(false);
      }
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
              <p className="text-xs text-slate-500 font-medium">
                Record blockers, guest complaints, or delays
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

        {/* Operation Selector if opened globally */}
        {!operationId && operationList.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Select Trip Operation <span className="text-red-500">*</span></label>
            <Select value={selectedOpId} onValueChange={(val) => setSelectedOpId(val || "")}>
              <SelectTrigger className="h-9.5 text-xs font-semibold">
                <SelectValue placeholder="Select Trip Operation">
                  {(val: string | null) => {
                    if (!val) return undefined;
                    const op = operationList.find((item) => item.id === val);
                    return op ? `${op.title} ${op.bookingNumber ? `• ${op.bookingNumber}` : ""} ${op.customerName ? `(${op.customerName})` : ""}` : val;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {operationList.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.title} {op.bookingNumber ? `• ${op.bookingNumber}` : ""} {op.customerName ? `(${op.customerName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Priority Level <span className="text-red-500">*</span>
              </label>
              <Select
                value={formik.values.priority}
                onValueChange={(val) => formik.setFieldValue("priority", val)}
              >
                <SelectTrigger className="h-9.5 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value={IssuePriority.CRITICAL} className="text-rose-700 font-bold">
                    🔴 CRITICAL (Immediate Blocker)
                  </SelectItem>
                  <SelectItem value={IssuePriority.HIGH} className="text-rose-600 font-bold">
                    🟠 HIGH (Urgent Resolution)
                  </SelectItem>
                  <SelectItem value={IssuePriority.MEDIUM} className="text-amber-600 font-semibold">
                    🟡 MEDIUM (Normal Attention)
                  </SelectItem>
                  <SelectItem value={IssuePriority.LOW} className="text-slate-600 font-medium">
                    ⚪ LOW (Minor Note)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Assigned Team Member
              </label>
              <Input
                placeholder="e.g. Operations Manager"
                {...formik.getFieldProps("assignedTo")}
                className="h-9.5 text-xs font-medium"
              />
            </div>
          </div>

          {/* Issue Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Issue Summary / Headline <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Flight delayed by 2 hours / Hotel room upgrade requested"
              {...formik.getFieldProps("title")}
              className="h-9.5 text-xs font-semibold"
            />
            {formik.touched.title && formik.errors.title && (
              <p className="text-[11px] text-red-500">{formik.errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Detailed Description & Action Plan <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Describe the operational issue, impact on guests, and actions being taken..."
              {...formik.getFieldProps("description")}
              className="text-xs min-h-[80px]"
            />
            {formik.touched.description && formik.errors.description && (
              <p className="text-[11px] text-red-500">{formik.errors.description}</p>
            )}
          </div>

          {/* Reported By */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Reported By
            </label>
            <Input
              placeholder="e.g. Chauffeur / Guest WhatsApp / Front Desk"
              {...formik.getFieldProps("reportedBy")}
              className="h-9.5 text-xs font-medium"
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
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Issue Ticket"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
