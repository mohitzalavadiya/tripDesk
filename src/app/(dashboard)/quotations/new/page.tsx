"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FileText, ArrowLeft, Loader2, Plus, AlertCircle, Sparkles, Compass } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tripClient, quotationClient, TripWithRelations } from "@/lib/api-client";
import { toast } from "sonner";

const createQuotationValidationSchema = Yup.object().shape({
  selectedTripId: Yup.string()
    .trim()
    .required("Please select a trip."),
  markupPct: Yup.number()
    .typeError("Markup must be a number.")
    .min(0, "Markup percentage cannot be negative.")
    .max(500, "Markup percentage cannot exceed 500%.")
    .required("Markup percentage is required."),
  discountPct: Yup.number()
    .typeError("Discount must be a number.")
    .min(0, "Discount percentage cannot be negative.")
    .max(100, "Discount percentage cannot exceed 100%.")
    .required("Discount percentage is required."),
  taxPct: Yup.number()
    .typeError("Tax percentage must be a number.")
    .min(0, "Tax percentage cannot be negative.")
    .max(100, "Tax percentage cannot exceed 100%.")
    .required("Tax percentage is required."),
});

export default function NewQuotationPage() {
  const router = useRouter();
  const [trips, setTrips] = React.useState<TripWithRelations[]>([]);
  const [loadingTrips, setLoadingTrips] = React.useState(true);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      selectedTripId: "",
      markupPct: 10,
      discountPct: 0,
      taxPct: 5,
    },
    validationSchema: createQuotationValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Read-only mode is active.");
        return;
      }

      try {
        setSubmitting(true);
        const res = await quotationClient.generateTripQuotation(values.selectedTripId, {
          markupPercentage: Number(values.markupPct) || 0,
          discountPercentage: Number(values.discountPct) || 0,
          taxPercentage: Number(values.taxPct) || 0,
        });

        if (res.success && res.data) {
          toast.success(`Quotation ${res.data.quotationNumber} generated successfully!`);
          router.push(`/trips/${values.selectedTripId}/quotation`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
          toast.error("Subscription expired. Read-only mode is active.");
        } else {
          toast.error(err?.message || "Failed to generate quotation.");
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? (formik.errors[field] as string) : null;
  };

  // Load active trips
  React.useEffect(() => {
    async function loadTrips() {
      try {
        setLoadingTrips(true);
        const res = await tripClient.getTrips({ limit: 100 });
        if (res.success && res.data) {
          setTrips(res.data);
          if (res.data.length > 0 && !formik.values.selectedTripId) {
            formik.setFieldValue("selectedTripId", res.data[0].id);
          }
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
      } finally {
        setLoadingTrips(false);
      }
    }
    loadTrips();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Quotations & Proposals" />}

        <PageHeader
          title="Generate New Quotation"
          description="Create a commercial proposal by snapshotting live trip itinerary, hotel, vehicle, and activity assignments."
          breadcrumbs={[
            { label: "Quotations", href: "/quotations" },
            { label: "New Quotation" },
          ]}
        />

        <div className="max-w-2xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} noValidate className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-600" />
                <span>Select Trip Source</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Trip Workspace *</label>
                  {loadingTrips ? (
                    <div className="h-9.5 flex items-center gap-2 text-slate-400 text-xs px-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading trips...
                    </div>
                  ) : trips.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                      No active trips found. Please create a trip workspace first.
                    </div>
                  ) : (
                    <>
                      <Select
                        value={formik.values.selectedTripId}
                        onValueChange={(val) => {
                          if (val) {
                            formik.setFieldValue("selectedTripId", val);
                            formik.setFieldTouched("selectedTripId", true);
                          }
                        }}
                      >
                        <SelectTrigger
                          className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                            getFieldError("selectedTripId")
                              ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Choose a trip...">
                            {(val: string | null) => {
                              if (!val) return undefined;
                              const t = trips.find((item) => item.id === val);
                              return t ? `${t.tripNumber} — ${t.title} (${t.customer?.name || "Customer"})` : val;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {trips.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.tripNumber} — {t.title} ({t.customer?.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getFieldError("selectedTripId") && (
                        <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                          {getFieldError("selectedTripId")}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Agency Markup (%)</label>
                    <Input
                      type="number"
                      name="markupPct"
                      value={formik.values.markupPct}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="10"
                      className={`h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold ${
                        getFieldError("markupPct")
                          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                    />
                    {getFieldError("markupPct") && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                        {getFieldError("markupPct")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Discount (%)</label>
                    <Input
                      type="number"
                      name="discountPct"
                      value={formik.values.discountPct}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="0"
                      className={`h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold ${
                        getFieldError("discountPct")
                          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                    />
                    {getFieldError("discountPct") && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                        {getFieldError("discountPct")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tax / GST (%)</label>
                    <Input
                      type="number"
                      name="taxPct"
                      value={formik.values.taxPct}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="5"
                      className={`h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold ${
                        getFieldError("taxPct")
                          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                    />
                    {getFieldError("taxPct") && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                        {getFieldError("taxPct")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/quotations")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formik.isSubmitting || isReadOnly || trips.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {formik.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Snapshot...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Proposal
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
