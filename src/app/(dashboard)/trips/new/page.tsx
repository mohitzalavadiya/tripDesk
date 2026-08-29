"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { customerClient, tripClient } from "@/lib/api-client";
import { Customer, TripStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Compass, Calendar, Users, Info, Loader2, AlertCircle, Plus } from "lucide-react";

const createTripValidationSchema = Yup.object().shape({
  customerId: Yup.string()
    .required("Please select a customer"),
  title: Yup.string()
    .trim()
    .required("Trip title is required")
    .min(3, "Trip title must be at least 3 characters")
    .max(150, "Trip title cannot exceed 150 characters"),
  startDate: Yup.string()
    .required("Start date is required")
    .test("valid-start", "Please enter a valid Start Date", (value) => {
      if (!value) return false;
      return !isNaN(new Date(value).getTime());
    }),
  endDate: Yup.string()
    .required("End date is required")
    .test("valid-end", "Please enter a valid End Date", (value) => {
      if (!value) return false;
      return !isNaN(new Date(value).getTime());
    })
    .test("end-after-start", "End date cannot be before start date", function (value) {
      const { startDate } = this.parent;
      if (!value || !startDate) return true;
      const start = new Date(startDate);
      const end = new Date(value);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      return end >= start;
    }),
  status: Yup.string().default("PLANNING"),
  notes: Yup.string().max(2000, "Notes cannot exceed 2000 characters"),
});

export default function NewTripPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="mt-2 text-xs text-slate-500 font-semibold">Loading form...</span>
        </div>
      }
    >
      <NewTripForm />
    </React.Suspense>
  );
}

function NewTripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");

  // State
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Fetch real customers from API
  React.useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        const res = await customerClient.getCustomers({ limit: 100 });
        if (res.success && res.data) {
          setCustomers(res.data);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, []);

  const formik = useFormik({
    initialValues: {
      customerId: customerIdParam || "",
      title: "",
      startDate: "",
      endDate: "",
      status: "PLANNING" as TripStatus,
      notes: "",
    },
    validationSchema: createTripValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Trip creation is restricted to read-only mode.");
        return;
      }

      try {
        setApiError(null);
        setSubmitting(true);

        const res = await tripClient.createTrip({
          customerId: values.customerId,
          title: values.title.trim(),
          startDate: new Date(values.startDate),
          endDate: new Date(values.endDate),
          status: values.status as TripStatus,
          notes: values.notes?.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Trip "${res.data.title}" created successfully.`);
          router.push(`/trips/${res.data.id}`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
          toast.error("Subscription expired. Read-only mode is active.");
        } else {
          setApiError(err?.message || "Failed to create trip workspace. Please try again.");
          toast.error(err?.message || "Failed to create trip.");
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Calculate Duration
  const durationString = React.useMemo(() => {
    if (!formik.values.startDate || !formik.values.endDate) return "";
    const start = new Date(formik.values.startDate);
    const end = new Date(formik.values.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return "End date must be after start date";
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Same Day Trip";
    return `${diffDays} Nights / ${diffDays + 1} Days`;
  }, [formik.values.startDate, formik.values.endDate]);

  const fieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched];
    const error = formik.errors[field as keyof typeof formik.errors];
    return touched && error ? (error as string) : undefined;
  };

  const inputCls = (field: string, base: string) => {
    const err = fieldError(field);
    return `${base} ${err ? "border-red-500 focus-visible:ring-red-500" : ""}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Subscription Warning Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Trip Creation" />}

        <PageHeader
          title="Create New Trip Workspace"
          description="Initialize a new travel itinerary package and link it to an agency customer account."
          breadcrumbs={[
            { label: "Trips", href: "/trips" },
            { label: "New Trip" },
          ]}
        />

        {apiError && (
          <div className="max-w-4xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Main Details block */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Compass className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Trip Information
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Customer Account <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formik.values.customerId}
                    onValueChange={(val) => formik.setFieldValue("customerId", val || "")}
                    disabled={loadingCustomers}
                  >
                    <SelectTrigger
                      className={`h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500 ${
                        fieldError("customerId") ? "border-red-500 focus:ring-red-500" : ""
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          loadingCustomers ? "Loading customers..." : "Select a customer..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name} ({c.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError("customerId") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {fieldError("customerId")}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Trip Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Compass className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="e.g. 7-Day Golden Triangle Tour"
                      {...formik.getFieldProps("title")}
                      className={inputCls(
                        "title",
                        "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500"
                      )}
                    />
                  </div>
                  {fieldError("title") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {fieldError("title")}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Trip Status
                  </label>
                  <Select
                    value={formik.values.status}
                    onValueChange={(val) => formik.setFieldValue("status", val)}
                  >
                    <SelectTrigger className="h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500">
                      <SelectValue placeholder="Trip Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="PLANNING" className="text-xs">
                        Planning (Inquiry & Itinerary Drafting)
                      </SelectItem>
                      <SelectItem value="QUOTED" className="text-xs">
                        Quoted (Proposal Sent to Client)
                      </SelectItem>
                      <SelectItem value="BOOKED" className="text-xs">
                        Confirmed (Booked & Payment Received)
                      </SelectItem>
                      <SelectItem value="ONGOING" className="text-xs">
                        In Progress (Client Travelling)
                      </SelectItem>
                      <SelectItem value="COMPLETED" className="text-xs">
                        Completed (Trip Finished)
                      </SelectItem>
                      <SelectItem value="DRAFT" className="text-xs">
                        Draft
                      </SelectItem>
                      <SelectItem value="CANCELLED" className="text-xs">
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Travel Schedule dates Block */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Travel Schedule & Duration
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    {...formik.getFieldProps("startDate")}
                    className={inputCls(
                      "startDate",
                      "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500"
                    )}
                  />
                  {fieldError("startDate") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {fieldError("startDate")}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    {...formik.getFieldProps("endDate")}
                    className={inputCls(
                      "endDate",
                      "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500"
                    )}
                  />
                  {fieldError("endDate") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {fieldError("endDate")}
                    </p>
                  )}
                </div>
              </div>

              {durationString && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 text-xs flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="font-bold text-indigo-900">
                    Calculated Duration: {durationString}
                  </span>
                </div>
              )}
            </div>

            {/* Notes Block */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Planning Notes / Special Client Requests
                </label>
                <Textarea
                  placeholder="Details about hotel preferences, transfers, flight numbers, special instructions..."
                  {...formik.getFieldProps("notes")}
                  className={inputCls(
                    "notes",
                    "min-h-[100px] bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500"
                  )}
                />
                {fieldError("notes") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {fieldError("notes")}
                  </p>
                )}
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex gap-2 text-slate-400 text-xs leading-normal">
                <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <span>
                  After creating the workspace, you can manage day-by-day itineraries and travelers.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/trips")}
                  className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formik.isSubmitting || isReadOnly}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {formik.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Workspace
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
