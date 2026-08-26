"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Ticket, ArrowLeft, Loader2, Plus, AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
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
import { activityClient } from "@/lib/api-client";
import { ActivityType } from "@prisma/client";
import { toast } from "sonner";

const createActivitySchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Activity name is required")
    .max(200, "Name cannot exceed 200 characters"),
  location: Yup.string().trim().max(200, "Location cannot exceed 200 characters"),
  description: Yup.string().trim().max(2000, "Description cannot exceed 2000 characters"),
  duration: Yup.string().trim().max(100, "Duration cannot exceed 100 characters"),
  type: Yup.string().oneOf(Object.values(ActivityType)).default(ActivityType.INCLUDED),
  adultPrice: Yup.number().typeError("Price must be a number").min(0, "Cannot be negative").nullable(),
  childPrice: Yup.number().typeError("Price must be a number").min(0, "Cannot be negative").nullable(),
  price: Yup.number().typeError("Price must be a number").min(0, "Cannot be negative").nullable(),
  notes: Yup.string().trim().max(2000, "Notes cannot exceed 2000 characters"),
});

export default function NewActivityPage() {
  const router = useRouter();
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      location: "",
      description: "",
      duration: "Half Day",
      type: ActivityType.INCLUDED,
      adultPrice: "",
      childPrice: "",
      price: "",
      notes: "",
    },
    validationSchema: createActivitySchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Modifications are restricted to read-only mode.");
        return;
      }

      try {
        setApiError(null);
        setSubmitting(true);

        const res = await activityClient.createActivity({
          name: values.name.trim(),
          location: values.location.trim() || undefined,
          description: values.description.trim() || undefined,
          duration: values.duration.trim() || undefined,
          type: values.type as ActivityType,
          adultPrice: values.adultPrice !== "" ? Number(values.adultPrice) : undefined,
          childPrice: values.childPrice !== "" ? Number(values.childPrice) : undefined,
          price: values.price !== "" ? Number(values.price) : undefined,
          notes: values.notes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Activity "${res.data.name}" added successfully.`);
          router.push(`/activities/${res.data.id}`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
          toast.error("Subscription expired. Read-only mode is active.");
        } else {
          setApiError(err?.message || "Failed to create activity.");
          toast.error(err?.message || "Failed to add activity.");
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched];
    const error = formik.errors[field as keyof typeof formik.errors];
    return touched && error ? (error as string) : undefined;
  };

  const inputCls = (field: string) => {
    const err = getFieldError(field);
    return `h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 ${
      err ? "border-red-500 focus-visible:ring-red-500" : ""
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Activities & Excursions" />}

        <PageHeader
          title="Add Activity / Tour"
          description="Register a new sightseeing day-tour, entry ticket, or adventure activity."
          breadcrumbs={[
            { label: "Activities", href: "/activities" },
            { label: "New Activity" },
          ]}
        />

        {apiError && (
          <div className="max-w-3xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Activity Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Ticket className="h-4 w-4 text-indigo-600" />
                <span>Excursion Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Activity Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Scuba Diving at Grande Island, Desert Safari with BBQ Dinner..."
                    {...formik.getFieldProps("name")}
                    className={inputCls("name")}
                  />
                  {getFieldError("name") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Inclusion Category</label>
                  <Select
                    value={formik.values.type}
                    onValueChange={(val) => val && formik.setFieldValue("type", val)}
                  >
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ActivityType.INCLUDED}>Included in Package</SelectItem>
                      <SelectItem value={ActivityType.OPTIONAL}>Optional / Add-on</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Duration</label>
                  <Input
                    placeholder="e.g. 2 Hours, Half Day, Full Day..."
                    {...formik.getFieldProps("duration")}
                    className={inputCls("duration")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Location / Landmark</label>
                  <Input
                    placeholder="e.g. Calangute Beach, North Goa"
                    {...formik.getFieldProps("location")}
                    className={inputCls("location")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <Textarea
                    placeholder="Overview of the experience, inclusions, itinerary highlights..."
                    rows={3}
                    {...formik.getFieldProps("description")}
                    className="text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Tariff Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Pricing & Tariffs
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Adult Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    {...formik.getFieldProps("adultPrice")}
                    className={inputCls("adultPrice")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Child Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 800"
                    {...formik.getFieldProps("childPrice")}
                    className={inputCls("childPrice")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Flat Group Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Optional flat rate"
                    {...formik.getFieldProps("price")}
                    className={inputCls("price")}
                  />
                </div>
              </div>
            </div>

            {/* Notes Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <label className="text-xs font-bold text-slate-700">Internal Agency Notes</label>
              <Textarea
                placeholder="Vendor terms, cancellation policy, timing recommendations..."
                rows={3}
                {...formik.getFieldProps("notes")}
                className="text-xs bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* Actions Panel */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/activities")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formik.isSubmitting || isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {formik.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save Activity
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
