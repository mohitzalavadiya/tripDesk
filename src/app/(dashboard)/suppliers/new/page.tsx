"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useFormik } from "formik"
import { Truck, Hotel, Car, Ticket, ArrowLeft, Check } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInventory } from "@/context/inventory-context"
import { supplierSchema } from "@/lib/validation-schemas"
import { SupplierType, SupplierService, SupplierStatus } from "@/types"
import { toast } from "sonner"

export default function NewSupplierPage() {
  const router = useRouter()
  const { addSupplier } = useInventory()

  const formik = useFormik({
    initialValues: {
      name: "",
      type: "Hotel Supplier" as SupplierType,
      contactPerson: "",
      phone: "",
      email: "",
      city: "",
      website: "",
      services: ["Hotel"] as SupplierService[],
      status: "Active" as SupplierStatus,
      notes: "",
    },
    validationSchema: supplierSchema,
    onSubmit: (values) => {
      const newSup = addSupplier({
        name: values.name.trim(),
        type: values.type,
        contactPerson: values.contactPerson.trim() || undefined,
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        city: values.city.trim() || undefined,
        website: values.website.trim() || undefined,
        services: values.services,
        status: values.status,
        notes: values.notes.trim() || undefined,
      })

      toast.success("Supplier created successfully.")
      router.push(`/suppliers/${newSup.id}`)
    },
  })

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  const toggleService = (service: SupplierService) => {
    const current = [...formik.values.services]
    const index = current.indexOf(service)
    if (index > -1) {
      if (current.length === 1) {
        toast.error("At least one service must be selected.")
        return
      }
      current.splice(index, 1)
    } else {
      current.push(service)
    }
    formik.setFieldValue("services", current)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="Add New Supplier"
          description="Register a new hotel chain, fleet transport vendor or local DMC partner."
          breadcrumbs={[
            { label: "Suppliers", href: "/suppliers" },
            { label: "New Supplier" },
          ]}
        />

        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              <span>Partner Profile & Categorization</span>
            </h3>

            {/* Supplier Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Supplier / Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. WGH Hotels & Resorts, Kerala Travel Partners..."
                {...formik.getFieldProps("name")}
                className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 ${
                  getFieldError("name") ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
              {getFieldError("name") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
              )}
            </div>

            {/* Supplier Type & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Supplier Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formik.values.type}
                  onValueChange={(val) => formik.setFieldValue("type", val as SupplierType)}
                >
                  <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Hotel Supplier" className="text-xs">Hotel Supplier (Chains / Properties)</SelectItem>
                    <SelectItem value="Transport Supplier" className="text-xs">Transport Supplier (Fleet / Cabs)</SelectItem>
                    <SelectItem value="Activity Supplier" className="text-xs">Activity Supplier (Guides / Operators)</SelectItem>
                    <SelectItem value="DMC" className="text-xs">DMC (Destination Management Co.)</SelectItem>
                    <SelectItem value="Travel Partner" className="text-xs">Travel Partner / Wholesaler</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
                {getFieldError("type") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("type")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Account Status</label>
                <Select
                  value={formik.values.status}
                  onValueChange={(val) => formik.setFieldValue("status", val as SupplierStatus)}
                >
                  <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Active" className="text-xs">Active (Available for costing)</SelectItem>
                    <SelectItem value="Inactive" className="text-xs">Inactive (Hold / Suspended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Services Provided */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 block">
                Services Provided <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500">Select all operational inventories managed through this supplier.</p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => toggleService("Hotel")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    formik.values.services.includes("Hotel")
                      ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-2xs font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Hotel className="h-4 w-4 text-amber-600" />
                  <span>Hotels & Resorts</span>
                  {formik.values.services.includes("Hotel") && <Check className="h-3.5 w-3.5 text-amber-600 ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleService("Vehicle")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    formik.values.services.includes("Vehicle")
                      ? "bg-blue-500/10 border-blue-500 text-blue-900 shadow-2xs font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Car className="h-4 w-4 text-blue-600" />
                  <span>Vehicles & Transport</span>
                  {formik.values.services.includes("Vehicle") && <Check className="h-3.5 w-3.5 text-blue-600 ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={() => toggleService("Activity")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    formik.values.services.includes("Activity")
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 shadow-2xs font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Ticket className="h-4 w-4 text-emerald-600" />
                  <span>Activities & Sightseeing</span>
                  {formik.values.services.includes("Activity") && <Check className="h-3.5 w-3.5 text-emerald-600 ml-1" />}
                </button>
              </div>
              {getFieldError("services") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("services")}</p>
              )}
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Contact & Communication Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Contact Person</label>
                <Input
                  placeholder="e.g. Rajesh Kumar"
                  {...formik.getFieldProps("contactPerson")}
                  className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
                />
                {getFieldError("contactPerson") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("contactPerson")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <Input
                  placeholder="e.g. +91 98470 12345"
                  {...formik.getFieldProps("phone")}
                  className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                    getFieldError("phone") ? "border-red-500" : ""
                  }`}
                />
                {getFieldError("phone") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("phone")}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. contracts@wghhotels.com"
                  {...formik.getFieldProps("email")}
                  className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                    getFieldError("email") ? "border-red-500" : ""
                  }`}
                />
                {getFieldError("email") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("email")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Base City / Location</label>
                <Input
                  placeholder="e.g. Kochi, Jaipur, Srinagar..."
                  {...formik.getFieldProps("city")}
                  className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
                />
                {getFieldError("city") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("city")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Website URL</label>
                <Input
                  placeholder="e.g. https://partner.example.com"
                  {...formik.getFieldProps("website")}
                  className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
                />
                {getFieldError("website") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("website")}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700">Contract & Operational Notes</label>
              <Textarea
                placeholder="Internal instructions, credit terms, cutoff policies, special discounts..."
                {...formik.getFieldProps("notes")}
                className="min-h-[90px] text-xs bg-slate-50/50 border-slate-200 leading-relaxed"
              />
              {getFieldError("notes") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("notes")}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/suppliers")}
              className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-6 cursor-pointer shadow-xs"
            >
              Save Supplier
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}
