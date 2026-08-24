"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useFormik } from "formik"
import { PageHeader } from "@/components/shared/page-header"
import { useEnquiry } from "@/context/enquiry-context"
import { ContactMethod } from "@/types"
import { customerSchema } from "@/lib/validation-schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { User, Phone, Mail, MapPin, MessageSquare, Compass, Info } from "lucide-react"

export default function NewCustomerPage() {
  const router = useRouter()
  const { addCustomer, updateCustomer } = useEnquiry()

  const formik = useFormik({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      city: "",
      preferredContact: "WhatsApp",
      notes: "",
      hotelCategory: "",
      mealPlan: "",
      vehicle: "",
      destination: "",
      preferences: "",
    },
    validationSchema: customerSchema,
    onSubmit: (values) => {
      const trimmedName = values.name.trim()
      const trimmedPhone = values.phone.trim()
      const trimmedEmail = values.email.trim()
      const trimmedCity = values.city.trim()
      const trimmedDestination = values.destination.trim()
      const trimmedPreferences = values.preferences.trim()
      const trimmedNotes = values.notes.trim()

      // Add customer using the context function
      const cust = addCustomer(
        trimmedName,
        trimmedPhone,
        trimmedEmail || undefined,
        trimmedCity || undefined,
        values.preferredContact as ContactMethod
      )

      // Save notes and preferences if entered
      if (trimmedNotes || values.hotelCategory || values.mealPlan || values.vehicle || trimmedDestination || trimmedPreferences) {
        updateCustomer(cust.id, {
          notes: trimmedNotes || undefined,
          preferredHotelCategory: values.hotelCategory || undefined,
          preferredMealPlan: values.mealPlan || undefined,
          preferredVehicle: values.vehicle || undefined,
          preferredDestination: trimmedDestination || undefined,
          preferences: trimmedPreferences || undefined,
        })
      }

      toast.success("Customer created successfully.")
      router.push(`/customers/${cust.id}`)
    },
  })

  // Helper to check if a field has an error and has been touched
  const fieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  // Helper for input className with error state
  const inputCls = (field: string, base: string) => {
    const err = fieldError(field)
    return `${base} ${err ? "border-red-500 focus-visible:ring-red-500" : ""}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="Add New Customer"
          description="Create a new customer profile with travel preferences, contact information and planning notes."
          breadcrumbs={[
            { label: "Customers", href: "/customers" },
            { label: "New Customer" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
          
          {/* Main Form Fields */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <User className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Basic Contact Information
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rahul Patel"
                    {...formik.getFieldProps("name")}
                    className={inputCls("name", "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                  />
                </div>
                {fieldError("name") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("name")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="+91 98765 43210"
                    {...formik.getFieldProps("phone")}
                    className={inputCls("phone", "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                  />
                </div>
                {fieldError("phone") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("phone")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="rahul@example.com"
                    type="email"
                    {...formik.getFieldProps("email")}
                    className={inputCls("email", "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                  />
                </div>
                {fieldError("email") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("email")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Mumbai"
                    {...formik.getFieldProps("city")}
                    className={inputCls("city", "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                  />
                </div>
                {fieldError("city") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("city")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Preferred Contact Method
                </label>
                <Select
                  value={formik.values.preferredContact}
                  onValueChange={(val) => formik.setFieldValue("preferredContact", val)}
                >
                  <SelectTrigger className="h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Preferred contact method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="WhatsApp" className="text-xs">WhatsApp</SelectItem>
                    <SelectItem value="Email" className="text-xs">Email</SelectItem>
                    <SelectItem value="Phone" className="text-xs">Phone Call</SelectItem>
                    <SelectItem value="SMS" className="text-xs">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Internal Notes / Biography
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  placeholder="Additional background context, family details, business interactions..."
                  {...formik.getFieldProps("notes")}
                  className={inputCls("notes", "pl-9 min-h-[80px] bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
              </div>
              {fieldError("notes") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("notes")}</p>
              )}
            </div>
          </div>

          {/* Travel Preferences Section */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <Compass className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Travel Preferences (Optional)
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Preferred Hotel Category
                </label>
                <Select value={formik.values.hotelCategory} onValueChange={(val) => formik.setFieldValue("hotelCategory", val || "")}>
                  <SelectTrigger className="h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="5 Star" className="text-xs">5 Star / Luxury</SelectItem>
                    <SelectItem value="4 Star" className="text-xs">4 Star / Premium</SelectItem>
                    <SelectItem value="3 Star" className="text-xs">3 Star / Standard</SelectItem>
                    <SelectItem value="2 Star" className="text-xs">2 Star / Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Preferred Meal Plan
                </label>
                <Select value={formik.values.mealPlan} onValueChange={(val) => formik.setFieldValue("mealPlan", val || "")}>
                  <SelectTrigger className="h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Select meal plan..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="CP" className="text-xs">CP - Breakfast Only</SelectItem>
                    <SelectItem value="MAP" className="text-xs">MAP - Breakfast + Lunch/Dinner</SelectItem>
                    <SelectItem value="AP" className="text-xs">AP - All Meals Included</SelectItem>
                    <SelectItem value="EP" className="text-xs">EP - Room Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Preferred Vehicle Class
                </label>
                <Select value={formik.values.vehicle} onValueChange={(val) => formik.setFieldValue("vehicle", val || "")}>
                  <SelectTrigger className="h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Select vehicle type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Private Sedan" className="text-xs">Private Sedan (Dezire/Etios)</SelectItem>
                    <SelectItem value="Private SUV" className="text-xs">Private SUV (Innova/Ertiga)</SelectItem>
                    <SelectItem value="Luxury Coach" className="text-xs">Luxury Coach / Traveller</SelectItem>
                    <SelectItem value="Self Drive" className="text-xs">Self Drive / Car Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Preferred Destination
                </label>
                <Input
                  placeholder="e.g. Kerala, Maldives, Goa"
                  {...formik.getFieldProps("destination")}
                  className={inputCls("destination", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("destination") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("destination")}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Special Travel Remarks / Accommodation Preferences
              </label>
              <Textarea
                placeholder="e.g. Family-friendly hotels, wheel-chair accessibility, pure-veg options, early flight preferences..."
                {...formik.getFieldProps("preferences")}
                className={inputCls("preferences", "min-h-[85px] bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
              />
              {fieldError("preferences") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("preferences")}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex gap-2 text-slate-400 text-xs leading-normal">
              <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <span>Fields marked with asterisk (*) are required.</span>
            </div>

            <div className="flex items-center gap-3">
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 cursor-pointer shadow-sm"
              >
                Save Profile
              </Button>
            </div>
          </div>

        </form>
      </div>
      </div>
    </div>
  )
}
