"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
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
import { customerClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  Users,
  Building,
  Plus,
  Loader2,
  Calendar,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Customer } from "@prisma/client";

const createCustomerValidationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Customer name is required.")
    .max(120, "Customer name must be at most 120 characters."),
  phone: Yup.string()
    .trim()
    .required("Phone number is required.")
    .min(3, "Phone number must have at least 3 characters.")
    .max(30, "Phone number must be at most 30 characters."),
  alternatePhone: Yup.string().trim().max(30, "Alternate phone must be at most 30 characters."),
  email: Yup.string().trim().email("Please provide a valid email address.").max(120, "Email must be at most 120 characters."),
  dateOfBirth: Yup.string(),
  gender: Yup.string().trim().max(30),
  nationality: Yup.string().trim().max(60),
  address: Yup.string().trim().max(255, "Address must be at most 255 characters."),
  city: Yup.string().trim().max(100),
  state: Yup.string().trim().max(100),
  country: Yup.string().trim().max(100),
  postalCode: Yup.string().trim().max(20, "Postal code cannot exceed 20 characters."),
  source: Yup.string().trim().max(60),
  notes: Yup.string().trim().max(5000, "Notes must be at most 5000 characters."),
  internalNotes: Yup.string().trim().max(5000, "Internal notes must be at most 5000 characters."),
});

export default function NewCustomerPage() {
  const router = useRouter();
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Duplicate warning state
  const [duplicateMatches, setDuplicateMatches] = React.useState<Customer[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      nationality: "Indian",
      address: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
      source: "Direct",
      notes: "",
      internalNotes: "",
    },
    validationSchema: createCustomerValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Read-only mode is active.");
        return;
      }

      try {
        setSubmitting(true);
        const res = await customerClient.createCustomer({
          name: values.name.trim(),
          phone: values.phone.trim(),
          alternatePhone: values.alternatePhone.trim() || undefined,
          email: values.email.trim() || undefined,
          dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : undefined,
          gender: values.gender || undefined,
          nationality: values.nationality.trim() || undefined,
          address: values.address.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          country: values.country.trim() || undefined,
          postalCode: values.postalCode.trim() || undefined,
          source: values.source.trim() || undefined,
          notes: values.notes.trim() || undefined,
          internalNotes: values.internalNotes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Customer ${res.data.customerNumber || res.data.name} created successfully!`);
          router.push(`/customers/${res.data.id}`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
        toast.error(err?.message || "Failed to create customer.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
  };

  // Debounced duplicate checker hooked to Formik phone and email values
  React.useEffect(() => {
    const phone = formik.values.phone.trim();
    const email = formik.values.email.trim();
    if (!phone && !email) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicates(true);
        const res = await customerClient.checkDuplicate({
          phone: phone || undefined,
          email: email || undefined,
        });

        if (res.success && res.data) {
          setDuplicateMatches(res.data.duplicates);
        }
      } catch {
        // Ignore duplicate check network errors
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formik.values.phone, formik.values.email]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Customer Directory" />}

        <PageHeader
          title="Register New Customer"
          description="Create a client profile to track their travel history, inquiries, bookings, and financial ledger."
          breadcrumbs={[
            { label: "Customers", href: "/customers" },
            { label: "New Customer" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          {/* Live Duplicate Warning Banner */}
          {duplicateMatches.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-xs flex items-start gap-3.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-amber-900">
                  Potential Existing Customer Match Detected ({duplicateMatches.length})
                </h4>
                <p className="text-amber-800">
                  A client with a matching phone number or email is already registered:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {duplicateMatches.map((d) => (
                    <Link
                      key={d.id}
                      href={`/customers/${d.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900 hover:bg-amber-100/60 font-semibold"
                    >
                      <span>{d.name} ({d.phone}) • {d.customerNumber || "CUS"}</span>
                      <ExternalLink className="h-3 w-3 text-amber-600" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} noValidate className="space-y-6">
            {/* 1. Identity & Contact */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span>Primary Identity & Contact Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Full Name *</label>
                  <Input
                    {...formik.getFieldProps("name")}
                    placeholder="e.g. Rajesh Kumar"
                    className={`h-9.5 bg-slate-50/50 border-slate-200 font-semibold text-xs ${getFieldError("name") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("name") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("name")}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Primary Phone / WhatsApp *</label>
                  <Input
                    {...formik.getFieldProps("phone")}
                    placeholder="+91 98765 43210"
                    className={`h-9.5 bg-slate-50/50 border-slate-200 font-semibold text-xs ${getFieldError("phone") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("phone") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("phone")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Alternate Phone</label>
                  <Input
                    {...formik.getFieldProps("alternatePhone")}
                    placeholder="Optional secondary contact"
                    className={`h-9.5 bg-slate-50/50 border-slate-200 text-xs ${getFieldError("alternatePhone") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("alternatePhone") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("alternatePhone")}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <Input
                    type="email"
                    {...formik.getFieldProps("email")}
                    placeholder="rajesh@example.com"
                    className={`h-9.5 bg-slate-50/50 border-slate-200 text-xs ${getFieldError("email") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("email") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("email")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Date of Birth</label>
                  <Input
                    type="date"
                    {...formik.getFieldProps("dateOfBirth")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Gender</label>
                  <Select
                    value={formik.values.gender}
                    onValueChange={(val) => {
                      formik.setFieldValue("gender", val);
                      formik.setFieldTouched("gender", true);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nationality</label>
                  <Input
                    {...formik.getFieldProps("nationality")}
                    placeholder="Indian"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Address & Location */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span>Address & Geographic Location</span>
              </h3>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Street Address</label>
                <Input
                  {...formik.getFieldProps("address")}
                  placeholder="e.g. 402, Sunrise Residency, Linking Road"
                  className={`h-9.5 bg-slate-50/50 border-slate-200 text-xs ${getFieldError("address") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("address") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("address")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <Input
                    {...formik.getFieldProps("city")}
                    placeholder="Mumbai"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">State</label>
                  <Input
                    {...formik.getFieldProps("state")}
                    placeholder="Maharashtra"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Country</label>
                  <Input
                    {...formik.getFieldProps("country")}
                    placeholder="India"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Postal Code</label>
                  <Input
                    {...formik.getFieldProps("postalCode")}
                    placeholder="400050"
                    className={`h-9 bg-slate-50/50 border-slate-200 text-xs ${getFieldError("postalCode") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("postalCode") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("postalCode")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Acquisition Source & Remarks */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span>Client Acquisition Source & Remarks</span>
              </h3>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Lead / Referral Source</label>
                <Select
                  value={formik.values.source}
                  onValueChange={(val) => {
                    formik.setFieldValue("source", val);
                    formik.setFieldTouched("source", true);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Direct">Direct / Walk-in</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp Enquiry</SelectItem>
                    <SelectItem value="Website">Website Form</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Referral">Client Referral</SelectItem>
                    <SelectItem value="B2B Agent">B2B Travel Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Preferences / General Notes</label>
                  <Textarea
                    {...formik.getFieldProps("notes")}
                    placeholder="e.g. Vegetarian preference, prefers 4-star boutique hotels, travels with family annually..."
                    rows={3}
                    className={`bg-slate-50/50 border-slate-200 text-xs ${getFieldError("notes") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("notes") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("notes")}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Agency Remarks</label>
                  <Textarea
                    {...formik.getFieldProps("internalNotes")}
                    placeholder="Private staff instructions or operational reminders..."
                    rows={3}
                    className={`bg-slate-50/50 border-slate-200 text-xs ${getFieldError("internalNotes") ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                  {getFieldError("internalNotes") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("internalNotes")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/customers")}
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
                    Registering Client...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save & Register Customer
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
