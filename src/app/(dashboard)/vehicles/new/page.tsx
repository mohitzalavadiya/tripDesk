"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Car, ArrowLeft, Loader2, Plus, AlertCircle, Info } from "lucide-react";
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
import { vehicleClient } from "@/lib/api-client";
import { toast } from "sonner";

const createVehicleSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Vehicle name is required")
    .max(100, "Name cannot exceed 100 characters"),
  type: Yup.string()
    .trim()
    .required("Vehicle type is required")
    .max(50, "Type cannot exceed 50 characters"),
  capacity: Yup.number()
    .typeError("Capacity must be a number")
    .required("Seating capacity is required")
    .integer("Must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity cannot exceed 100"),
  registrationNumber: Yup.string().trim().max(50, "Registration number cannot exceed 50 characters"),
  driverName: Yup.string().trim().max(100, "Driver name cannot exceed 100 characters"),
  driverPhone: Yup.string().trim().max(30, "Driver phone cannot exceed 30 characters"),
  pricingType: Yup.string().oneOf(["PER_KM", "PER_DAY", "FIXED", "INCLUDED"]).default("PER_KM"),
  baseRate: Yup.number().typeError("Base rate must be a number").min(0, "Cannot be negative").nullable(),
  ratePerKm: Yup.number().typeError("Rate per km must be a number").min(0, "Cannot be negative").nullable(),
  notes: Yup.string().trim().max(2000, "Notes cannot exceed 2000 characters"),
});

export default function NewVehiclePage() {
  const router = useRouter();
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      type: "Sedan",
      capacity: 4,
      registrationNumber: "",
      driverName: "",
      driverPhone: "",
      pricingType: "PER_KM",
      baseRate: "",
      ratePerKm: "",
      notes: "",
    },
    validationSchema: createVehicleSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Modifications are restricted to read-only mode.");
        return;
      }

      try {
        setApiError(null);
        setSubmitting(true);

        const res = await vehicleClient.createVehicle({
          name: values.name.trim(),
          type: values.type.trim(),
          capacity: Number(values.capacity),
          registrationNumber: values.registrationNumber.trim() || undefined,
          driverName: values.driverName.trim() || undefined,
          driverPhone: values.driverPhone.trim() || undefined,
          pricingType: values.pricingType as any,
          baseRate: values.baseRate !== "" ? Number(values.baseRate) : undefined,
          ratePerKm: values.ratePerKm !== "" ? Number(values.ratePerKm) : undefined,
          notes: values.notes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Vehicle "${res.data.name}" added successfully.`);
          router.push(`/vehicles/${res.data.id}`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
          toast.error("Subscription expired. Read-only mode is active.");
        } else {
          setApiError(err?.message || "Failed to create vehicle.");
          toast.error(err?.message || "Failed to add vehicle.");
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
        {isReadOnly && <ReadOnlyBanner moduleName="Vehicle Fleet" />}

        <PageHeader
          title="Add Vehicle to Fleet"
          description="Register a new vehicle, tempo traveller, coach, or chauffeur option in your inventory."
          breadcrumbs={[
            { label: "Vehicles", href: "/vehicles" },
            { label: "New Vehicle" },
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
            {/* Vehicle Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Car className="h-4 w-4 text-indigo-600" />
                <span>Vehicle Specifications</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Vehicle Name / Model <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Toyota Innova Crysta, Maruti Dzire, 17-Seater Tempo Traveller..."
                    {...formik.getFieldProps("name")}
                    className={inputCls("name")}
                  />
                  {getFieldError("name") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Vehicle Category / Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formik.values.type}
                    onValueChange={(val) => formik.setFieldValue("type", val)}
                  >
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sedan">Sedan</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="MUV">MUV</SelectItem>
                      <SelectItem value="Hatchback">Hatchback</SelectItem>
                      <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                      <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                      <SelectItem value="Coach">Coach</SelectItem>
                      <SelectItem value="Luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Seating Capacity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="e.g. 4, 7, 12, 17..."
                    {...formik.getFieldProps("capacity")}
                    className={inputCls("capacity")}
                  />
                  {getFieldError("capacity") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("capacity")}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Registration Number</label>
                  <Input
                    placeholder="e.g. KL 07 CD 1234 (Optional)"
                    {...formik.getFieldProps("registrationNumber")}
                    className={inputCls("registrationNumber")}
                  />
                </div>
              </div>
            </div>

            {/* Driver & Tariff Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Default Driver & Tariffs
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Driver Name</label>
                  <Input
                    placeholder="Assigned driver name (optional)"
                    {...formik.getFieldProps("driverName")}
                    className={inputCls("driverName")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Driver Phone</label>
                  <Input
                    placeholder="+91..."
                    {...formik.getFieldProps("driverPhone")}
                    className={inputCls("driverPhone")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pricing Model</label>
                  <Select
                    value={formik.values.pricingType}
                    onValueChange={(val) => formik.setFieldValue("pricingType", val)}
                  >
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select pricing model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_KM">Per Kilometer (₹/km)</SelectItem>
                      <SelectItem value="PER_DAY">Per Day Rate (₹/day)</SelectItem>
                      <SelectItem value="FIXED">Fixed Trip Rate (₹)</SelectItem>
                      <SelectItem value="INCLUDED">Included in Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Rate per KM (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 18.00"
                    {...formik.getFieldProps("ratePerKm")}
                    className={inputCls("ratePerKm")}
                  />
                </div>
              </div>
            </div>

            {/* Notes Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <label className="text-xs font-bold text-slate-700">Internal Fleet Notes</label>
              <Textarea
                placeholder="Vehicle condition, permit areas, fuel policy, luggage guidance..."
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
                onClick={() => router.push("/vehicles")}
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
                    Save Vehicle
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
