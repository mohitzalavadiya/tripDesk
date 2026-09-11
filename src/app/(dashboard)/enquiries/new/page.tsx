"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
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
import { Textarea } from "@/components/ui/textarea";
import {
  customerClient,
  enquiryClient,
} from "@/lib/api-client";
import { Customer, EnquirySource, EnquiryPriority, EnquiryStatus } from "@prisma/client";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Users,
  Info,
  Settings2,
  ShieldCheck,
  Calendar,
  IndianRupee,
  Clock,
  Sparkles,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";

const createEnquiryValidationSchema = Yup.object().shape({
  customerMode: Yup.string().oneOf(["existing", "new"]).required(),
  selectedCustomerId: Yup.string().when("customerMode", {
    is: "existing",
    then: (schema) => schema.trim().required("Please select a customer."),
    otherwise: (schema) => schema.notRequired(),
  }),
  newCustomerName: Yup.string().when("customerMode", {
    is: "new",
    then: (schema) =>
      schema
        .trim()
        .required("Customer name is required.")
        .max(120, "Customer name must be at most 120 characters."),
    otherwise: (schema) => schema.notRequired(),
  }),
  newCustomerPhone: Yup.string().when("customerMode", {
    is: "new",
    then: (schema) =>
      schema
        .trim()
        .required("Customer phone number is required.")
        .min(3, "Phone number must have at least 3 characters.")
        .max(30, "Phone number must be at most 30 characters."),
    otherwise: (schema) => schema.notRequired(),
  }),
  newCustomerEmail: Yup.string()
    .trim()
    .email("Please provide a valid email address.")
    .max(120, "Email must be at most 120 characters."),
  title: Yup.string().trim().max(200, "Title cannot exceed 200 characters."),
  destination: Yup.string()
    .trim()
    .required("Destination is required.")
    .max(200, "Destination cannot exceed 200 characters."),
  origin: Yup.string().trim().max(200, "Origin cannot exceed 200 characters."),
  startDate: Yup.string(),
  endDate: Yup.string().test(
    "end-date-after-start",
    "End date cannot be before start date.",
    function (value) {
      const { startDate } = this.parent;
      if (!startDate || !value) return true;
      const start = new Date(startDate);
      const end = new Date(value);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      return end >= start;
    }
  ),
  adults: Yup.number()
    .typeError("Adults count must be a number.")
    .integer("Adults must be an integer.")
    .min(1, "At least 1 adult is required.")
    .required("At least 1 adult is required."),
  children: Yup.number()
    .typeError("Children count must be a number.")
    .integer("Children must be an integer.")
    .min(0, "Children count cannot be negative."),
  infants: Yup.number()
    .typeError("Infants count must be a number.")
    .integer("Infants must be an integer.")
    .min(0, "Infants count cannot be negative."),
  budget: Yup.string().test(
    "valid-budget",
    "Budget must be a valid positive number.",
    (val) => {
      if (!val || val.trim() === "") return true;
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    }
  ),
  budgetType: Yup.string().oneOf(["total", "per_person"]),
  hotelCategory: Yup.string().max(100),
  mealPlan: Yup.string().max(100),
  vehiclePreference: Yup.string().max(100),
  specialRequirements: Yup.string()
    .trim()
    .max(5000, "Special requirements cannot exceed 5000 characters."),
  notes: Yup.string().trim().max(5000, "Notes cannot exceed 5000 characters."),
  internalNotes: Yup.string()
    .trim()
    .max(5000, "Internal notes cannot exceed 5000 characters."),
  followupDate: Yup.string(),
});

export default function NewEnquiryPage() {
  const router = useRouter();

  // Data states
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Duplicate Enquiry Detection State
  const [duplicateEnquiries, setDuplicateEnquiries] = React.useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      customerMode: "existing" as "existing" | "new",
      selectedCustomerId: "",
      newCustomerName: "",
      newCustomerPhone: "",
      newCustomerEmail: "",
      title: "",
      destination: "",
      origin: "",
      startDate: "",
      endDate: "",
      adults: 2,
      children: 0,
      infants: 0,
      hotelCategory: "3 Star",
      mealPlan: "MAP",
      vehiclePreference: "Sedan",
      transportRequired: true,
      budget: "",
      budgetType: "total" as "total" | "per_person",
      source: EnquirySource.WHATSAPP,
      priority: EnquiryPriority.MEDIUM,
      status: EnquiryStatus.NEW,
      specialRequirements: "",
      notes: "",
      internalNotes: "",
      followupDate: "",
    },
    validationSchema: createEnquiryValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Read-only mode is active.");
        return;
      }

      try {
        setSubmitting(true);
        let customerId = values.selectedCustomerId;

        // 1. If new customer mode, create customer first via real API
        if (values.customerMode === "new") {
          const custRes = await customerClient.createCustomer({
            name: values.newCustomerName.trim(),
            phone: values.newCustomerPhone.trim(),
            email: values.newCustomerEmail.trim() || undefined,
          });

          if (custRes.success && custRes.data) {
            customerId = custRes.data.id;
          } else {
            throw new Error("Failed to create new customer.");
          }
        }

        if (!customerId) {
          toast.error("Please select or create a customer.");
          return;
        }

        // 2. Create Enquiry
        const res = await enquiryClient.createEnquiry({
          customerId,
          title: values.title.trim() || undefined,
          destination: values.destination.trim(),
          origin: values.origin.trim() || undefined,
          startDate: values.startDate ? new Date(values.startDate) : undefined,
          endDate: values.endDate ? new Date(values.endDate) : undefined,
          adults: values.adults,
          children: values.children,
          infants: values.infants,
          budget: values.budget ? Number(values.budget) : undefined,
          budgetType: values.budgetType,
          hotelCategory: values.hotelCategory !== "Not decided" ? values.hotelCategory : undefined,
          mealPlan: values.mealPlan !== "Not decided" ? values.mealPlan : undefined,
          vehiclePreference: values.vehiclePreference !== "Not decided" ? values.vehiclePreference : undefined,
          transportRequired: values.transportRequired,
          source: values.source,
          priority: values.priority,
          status: values.status,
          specialRequirements: values.specialRequirements.trim() || undefined,
          notes: values.notes.trim() || undefined,
          internalNotes: values.internalNotes.trim() || undefined,
          nextFollowUpAt: values.followupDate ? new Date(values.followupDate) : undefined,
        });

        if (res.success && res.data) {
          toast.success(`Enquiry ${res.data.enquiryNumber} captured successfully!`);
          router.push(`/enquiries/${res.data.id}`);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
        toast.error(err?.message || "Failed to create enquiry.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? (formik.errors[field] as string) : null;
  };

  // Load real customers from PostgreSQL API
  React.useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        const res = await customerClient.getCustomers({ limit: 100 });
        if (res.success && res.data) {
          setCustomers(res.data);
          if (res.data.length > 0 && !formik.values.selectedCustomerId) {
            formik.setFieldValue("selectedCustomerId", res.data[0].id);
          }
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

  // Debounced Duplicate Lead Detection
  React.useEffect(() => {
    const customerId = formik.values.selectedCustomerId;
    const mode = formik.values.customerMode;
    const destination = formik.values.destination.trim();
    const startDate = formik.values.startDate;
    const endDate = formik.values.endDate;

    if (!customerId || mode === "new") {
      setDuplicateEnquiries([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicates(true);
        const res = await enquiryClient.checkDuplicate({
          customerId,
          destination: destination || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (res.success && res.data) {
          setDuplicateEnquiries(res.data.duplicates || []);
        }
      } catch {
        // Silently ignore duplicate check errors
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    formik.values.selectedCustomerId,
    formik.values.customerMode,
    formik.values.destination,
    formik.values.startDate,
    formik.values.endDate,
  ]);

  // Duration Helper
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Enquiries & Leads CRM" />}

        <PageHeader
          title="Create New Enquiry"
          description="Capture customer travel preferences, dates, passenger counts, budget, and follow-up schedules."
          breadcrumbs={[
            { label: "Enquiries", href: "/enquiries" },
            { label: "New Enquiry" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} noValidate className="space-y-6">
            {/* 1. Customer Selection Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>Customer Information</span>
                </h3>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      formik.setFieldValue("customerMode", "existing");
                      if (customers.length > 0 && !formik.values.selectedCustomerId) {
                        formik.setFieldValue("selectedCustomerId", customers[0].id);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      formik.values.customerMode === "existing"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      formik.setFieldValue("customerMode", "new");
                      setDuplicateEnquiries([]);
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      formik.values.customerMode === "new"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    + Quick Add Customer
                  </button>
                </div>
              </div>

              {formik.values.customerMode === "existing" ? (
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700">Select Customer *</label>
                  {loadingCustomers ? (
                    <div className="h-9.5 flex items-center gap-2 text-slate-400 text-xs px-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Loading customer directory...
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                      No customers found. Switch to Quick Add Customer to create one.
                    </div>
                  ) : (
                    <>
                      <Select
                        value={formik.values.selectedCustomerId}
                        onValueChange={(val) => {
                          if (val) {
                            formik.setFieldValue("selectedCustomerId", val);
                            formik.setFieldTouched("selectedCustomerId", true);
                          }
                        }}
                      >
                        <SelectTrigger
                          className={`h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl ${
                            getFieldError("selectedCustomerId")
                              ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Choose existing client...">
                            {(val: string | null) => {
                              if (!val) return undefined;
                              const c = customers.find((item) => item.id === val);
                              return c
                                ? `${c.name}${c.phone ? ` (${c.phone})` : ""}${c.email ? ` • ${c.email}` : ""}`
                                : val;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name} ({c.phone}) {c.email ? `• ${c.email}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getFieldError("selectedCustomerId") && (
                        <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                          {getFieldError("selectedCustomerId")}
                        </p>
                      )}
                    </>
                  )}

                  {/* DUPLICATE WARNING BANNER */}
                  {duplicateEnquiries.length > 0 && (
                    <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span>Existing Active Enquiries Detected ({duplicateEnquiries.length})</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        This customer already has active inquiries. You can proceed with a new trip request or update an existing lead:
                      </p>
                      <div className="space-y-1 pt-1">
                        {duplicateEnquiries.map((dup) => (
                          <div
                            key={dup.id}
                            className="flex items-center justify-between bg-white/80 p-2 rounded border border-amber-100 text-[11px]"
                          >
                            <div>
                              <strong className="text-slate-800">{dup.enquiryNumber}</strong> •{" "}
                              <span className="text-slate-600">{dup.destination}</span>{" "}
                              <span className="text-slate-400">({dup.status})</span>
                            </div>
                            <a
                              href={`/enquiries/${dup.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
                            >
                              View Lead ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Full Name *</label>
                    <Input
                      {...formik.getFieldProps("newCustomerName")}
                      placeholder="e.g. Ananya Sharma"
                      className={`h-9 bg-slate-50/50 border-slate-200 text-xs ${
                        getFieldError("newCustomerName")
                          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                    />
                    {getFieldError("newCustomerName") && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                        {getFieldError("newCustomerName")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Phone Number *</label>
                    <Input
                      {...formik.getFieldProps("newCustomerPhone")}
                      placeholder="+91 98765 43210"
                      className={`h-9 bg-slate-50/50 border-slate-200 text-xs ${
                        getFieldError("newCustomerPhone")
                          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                    />
                    {getFieldError("newCustomerPhone") && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                        {getFieldError("newCustomerPhone")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Email Address (Optional)</label>
                    <Input
                      type="email"
                      {...formik.getFieldProps("newCustomerEmail")}
                      placeholder="ananya@example.com"
                      className={`h-9 bg-slate-50/50 border-slate-200 text-xs ${
                        getFieldError("newCustomerEmail")
                          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                    />
                    {getFieldError("newCustomerEmail") && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                        {getFieldError("newCustomerEmail")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Destination & Dates Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>Travel Details & Dates</span>
                </h3>
                {durationString && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {durationString}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Destination *</label>
                  <Input
                    {...formik.getFieldProps("destination")}
                    placeholder="e.g. Kerala, Bali, Kashmir..."
                    className={`h-9.5 bg-slate-50/50 border-slate-200 text-xs font-semibold ${
                      getFieldError("destination")
                        ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {getFieldError("destination") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("destination")}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Departure City / Origin</label>
                  <Input
                    {...formik.getFieldProps("origin")}
                    placeholder="e.g. Mumbai, Delhi, Ahmedabad..."
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tentative Start Date</label>
                  <Input
                    type="date"
                    {...formik.getFieldProps("startDate")}
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tentative End Date</label>
                  <Input
                    type="date"
                    {...formik.getFieldProps("endDate")}
                    className={`h-9.5 bg-slate-50/50 border-slate-200 text-xs ${
                      getFieldError("endDate")
                        ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {getFieldError("endDate") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("endDate")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Passengers & Budget Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Passenger Count & Commercial Budget</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Adults (12+ yrs) *</label>
                  <Input
                    type="number"
                    min={1}
                    name="adults"
                    value={formik.values.adults}
                    onChange={(e) => formik.setFieldValue("adults", parseInt(e.target.value) || 0)}
                    onBlur={formik.handleBlur}
                    className={`h-9 bg-slate-50/50 border-slate-200 text-xs font-bold ${
                      getFieldError("adults")
                        ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {getFieldError("adults") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("adults")}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Children (2-11 yrs)</label>
                  <Input
                    type="number"
                    min={0}
                    name="children"
                    value={formik.values.children}
                    onChange={(e) => formik.setFieldValue("children", parseInt(e.target.value) || 0)}
                    onBlur={formik.handleBlur}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Infants (0-2 yrs)</label>
                  <Input
                    type="number"
                    min={0}
                    name="infants"
                    value={formik.values.infants}
                    onChange={(e) => formik.setFieldValue("infants", parseInt(e.target.value) || 0)}
                    onBlur={formik.handleBlur}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Estimated Budget (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    {...formik.getFieldProps("budget")}
                    placeholder="e.g. 75000"
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs font-bold text-emerald-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Budget Structure</label>
                  <Select
                    value={formik.values.budgetType}
                    onValueChange={(val) => {
                      formik.setFieldValue("budgetType", val as "total" | "per_person");
                      formik.setFieldTouched("budgetType", true);
                    }}
                  >
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="total">Total Package Budget</SelectItem>
                      <SelectItem value="per_person">Per Person Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 4. Preferences & Requirements Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-amber-600" />
                <span>Package Preferences & Lead Source</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hotel Category</label>
                  <Select
                    value={formik.values.hotelCategory}
                    onValueChange={(val) => {
                      if (val) {
                        formik.setFieldValue("hotelCategory", val);
                        formik.setFieldTouched("hotelCategory", true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Budget / 2 Star">Budget / 2 Star</SelectItem>
                      <SelectItem value="3 Star">3 Star</SelectItem>
                      <SelectItem value="4 Star">4 Star</SelectItem>
                      <SelectItem value="5 Star">5 Star</SelectItem>
                      <SelectItem value="Luxury Resort">Luxury Resort</SelectItem>
                      <SelectItem value="Not decided">Not decided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Meal Plan</label>
                  <Select
                    value={formik.values.mealPlan}
                    onValueChange={(val) => {
                      if (val) {
                        formik.setFieldValue("mealPlan", val);
                        formik.setFieldTouched("mealPlan", true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="EP (Room Only)">EP (Room Only)</SelectItem>
                      <SelectItem value="CP (Breakfast Only)">CP (Breakfast Only)</SelectItem>
                      <SelectItem value="MAP (Breakfast + Dinner)">MAP (Breakfast + Dinner)</SelectItem>
                      <SelectItem value="AP (All Meals)">AP (All Meals)</SelectItem>
                      <SelectItem value="Not decided">Not decided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Vehicle / Transport</label>
                  <Select
                    value={formik.values.vehiclePreference}
                    onValueChange={(val) => {
                      if (val) {
                        formik.setFieldValue("vehiclePreference", val);
                        formik.setFieldTouched("vehiclePreference", true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Sedan (Dzire/Etios)">Sedan (Dzire/Etios)</SelectItem>
                      <SelectItem value="SUV (Innova/Crysta)">SUV (Innova/Crysta)</SelectItem>
                      <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                      <SelectItem value="Not required / Flights Only">Not required</SelectItem>
                      <SelectItem value="Not decided">Not decided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Lead Source</label>
                  <Select
                    value={formik.values.source}
                    onValueChange={(val) => {
                      if (val) {
                        formik.setFieldValue("source", val as EnquirySource);
                        formik.setFieldTouched("source", true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={EnquirySource.WHATSAPP}>WhatsApp</SelectItem>
                      <SelectItem value={EnquirySource.WEBSITE}>Website</SelectItem>
                      <SelectItem value={EnquirySource.INSTAGRAM}>Instagram</SelectItem>
                      <SelectItem value={EnquirySource.FACEBOOK}>Facebook</SelectItem>
                      <SelectItem value={EnquirySource.PHONE}>Phone Call</SelectItem>
                      <SelectItem value={EnquirySource.EMAIL}>Email</SelectItem>
                      <SelectItem value={EnquirySource.REFERRAL}>Referral</SelectItem>
                      <SelectItem value={EnquirySource.WALK_IN}>Walk-in</SelectItem>
                      <SelectItem value={EnquirySource.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Priority</label>
                  <Select
                    value={formik.values.priority}
                    onValueChange={(val) => {
                      if (val) {
                        formik.setFieldValue("priority", val as EnquiryPriority);
                        formik.setFieldTouched("priority", true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={EnquiryPriority.LOW}>Low</SelectItem>
                      <SelectItem value={EnquiryPriority.MEDIUM}>Medium</SelectItem>
                      <SelectItem value={EnquiryPriority.HIGH}>High</SelectItem>
                      <SelectItem value={EnquiryPriority.URGENT}>Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">First Follow-up Date</label>
                  <Input
                    type="date"
                    {...formik.getFieldProps("followupDate")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. Notes & Special Remarks Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
                Special Requirements & Notes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Special Requirements</label>
                  <Textarea
                    {...formik.getFieldProps("specialRequirements")}
                    placeholder="e.g. Honeymoon inclusions, candle light dinner, wheelchair access..."
                    rows={3}
                    className={`bg-slate-50/50 border-slate-200 text-xs ${
                      getFieldError("specialRequirements")
                        ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {getFieldError("specialRequirements") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("specialRequirements")}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Agency Remarks</label>
                  <Textarea
                    {...formik.getFieldProps("internalNotes")}
                    placeholder="Private staff instructions or operational requirements..."
                    rows={3}
                    className={`bg-slate-50/50 border-slate-200 text-xs ${
                      getFieldError("internalNotes")
                        ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {getFieldError("internalNotes") && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                      {getFieldError("internalNotes")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/enquiries")}
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
                    Capturing Enquiry...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save & Create Enquiry
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
