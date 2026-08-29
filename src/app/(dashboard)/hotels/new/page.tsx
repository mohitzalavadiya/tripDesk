"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Hotel, ArrowLeft, Loader2, Plus, AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hotelClient } from "@/lib/api-client";
import { toast } from "sonner";

const createHotelSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Hotel name is required")
    .min(1, "Hotel name must be at least 1 character")
    .max(200, "Hotel name must be at most 200 characters"),
  category: Yup.string().trim().max(100, "Category cannot exceed 100 characters"),
  address: Yup.string().trim().max(500, "Address cannot exceed 500 characters"),
  city: Yup.string().trim().max(100, "City cannot exceed 100 characters"),
  state: Yup.string().trim().max(100, "State cannot exceed 100 characters"),
  country: Yup.string().trim().max(100, "Country cannot exceed 100 characters").default("India"),
  phone: Yup.string().trim().max(30, "Phone cannot exceed 30 characters"),
  email: Yup.string().trim().email("Invalid email format").max(150, "Email cannot exceed 150 characters"),
  website: Yup.string().trim().max(250, "Website URL cannot exceed 250 characters"),
  notes: Yup.string().trim().max(2000, "Notes cannot exceed 2000 characters"),
});

export default function NewHotelPage() {
  const router = useRouter();
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      category: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      phone: "",
      email: "",
      website: "",
      notes: "",
    },
    validationSchema: createHotelSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Modifications are restricted to read-only mode.");
        return;
      }

      try {
        setApiError(null);
        setSubmitting(true);

        const res = await hotelClient.createHotel({
          name: values.name.trim(),
          category: values.category.trim() || undefined,
          address: values.address.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          country: values.country.trim() || "India",
          phone: values.phone.trim() || undefined,
          email: values.email.trim() || undefined,
          website: values.website.trim() || undefined,
          notes: values.notes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Hotel "${res.data.name}" added successfully.`);
          router.push(`/hotels/${res.data.id}`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
          toast.error("Subscription expired. Read-only mode is active.");
        } else {
          setApiError(err?.message || "Failed to create hotel property.");
          toast.error(err?.message || "Failed to add hotel.");
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
        {isReadOnly && <ReadOnlyBanner moduleName="Hotel Creation" />}

        <PageHeader
          title="Add Contracted Hotel Property"
          description="Register a new hotel or resort property in your agency inventory database."
          breadcrumbs={[
            { label: "Hotels", href: "/hotels" },
            { label: "New Hotel" },
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
            {/* Property Information Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Hotel className="h-4 w-4 text-indigo-600" />
                <span>Property Details</span>
              </h3>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Hotel / Resort Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Parakkat Nature Resort, Munnar Retreat..."
                    {...formik.getFieldProps("name")}
                    className={inputCls("name")}
                  />
                  {getFieldError("name") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Category / Rating
                  </label>
                  <Input
                    placeholder="e.g. 5-Star Luxury Resort, Heritage Haveli, Boutique Hotel..."
                    {...formik.getFieldProps("category")}
                    className={inputCls("category")}
                  />
                </div>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5 sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700">
                    Street Address
                  </label>
                  <Input
                    placeholder="e.g. Near Tea Museum, Pallivasal..."
                    {...formik.getFieldProps("address")}
                    className={inputCls("address")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">City / Destination</label>
                  <Input
                    placeholder="e.g. Munnar"
                    {...formik.getFieldProps("city")}
                    className={inputCls("city")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">State / Region</label>
                  <Input
                    placeholder="e.g. Kerala"
                    {...formik.getFieldProps("state")}
                    className={inputCls("state")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Country</label>
                  <Input
                    placeholder="India"
                    {...formik.getFieldProps("country")}
                    className={inputCls("country")}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Contact & Website
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Phone</label>
                  <Input
                    placeholder="+91..."
                    {...formik.getFieldProps("phone")}
                    className={inputCls("phone")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email</label>
                  <Input
                    type="email"
                    placeholder="reservations@hotel.com"
                    {...formik.getFieldProps("email")}
                    className={inputCls("email")}
                  />
                  {getFieldError("email") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("email")}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Website</label>
                  <Input
                    placeholder="https://..."
                    {...formik.getFieldProps("website")}
                    className={inputCls("website")}
                  />
                </div>
              </div>
            </div>

            {/* Notes Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <label className="text-xs font-bold text-slate-700">Internal Agency Notes</label>
              <Textarea
                placeholder="Contract notes, point of contact, check-in policies, special instructions..."
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
                onClick={() => router.push("/hotels")}
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
                    Save Hotel Property
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
