"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFormik } from "formik"
import { FileSpreadsheet, Plus, ArrowLeft } from "lucide-react"
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
import { rateSheetSchema } from "@/lib/validation-schemas"
import { RateSheetStatus, RateSheetSourceType } from "@/types"
import { toast } from "sonner"

function NewRateSheetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedSupplier = searchParams.get("supplierId") || ""
  const { addRateSheet, suppliers } = useInventory()

  const formik = useFormik({
    initialValues: {
      name: "",
      supplierId: preselectedSupplier,
      description: "",
      validFrom: "2026-10-01",
      validTo: "2027-03-31",
      status: "Active" as RateSheetStatus,
      sourceType: "Excel" as RateSheetSourceType,
    },
    validationSchema: rateSheetSchema,
    onSubmit: (values) => {
      const newRs = addRateSheet({
        name: values.name.trim(),
        supplierId: values.supplierId,
        description: values.description.trim() || undefined,
        validFrom: values.validFrom,
        validTo: values.validTo,
        status: values.status,
        sourceType: values.sourceType,
      })

      toast.success("Rate sheet created. You can now import rates.")
      router.push(`/rate-sheets/${newRs.id}`)
    },
  })

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-purple-600" />
          <span>Contract Header & Validity Period</span>
        </h3>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Rate Sheet Title / Contract Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. 2026–27 WGH Annual Contract, Kerala Monsoon Promo..."
            {...formik.getFieldProps("name")}
            className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 ${
              getFieldError("name") ? "border-red-500" : ""
            }`}
          />
          {getFieldError("name") && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
          )}
        </div>

        {/* Supplier & Source Format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Supplier Partner <span className="text-red-500">*</span>
            </label>
            <Select
              value={formik.values.supplierId}
              onValueChange={(val) => formik.setFieldValue("supplierId", val)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name} ({s.city || s.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError("supplierId") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("supplierId")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Expected Import Format</label>
            <Select
              value={formik.values.sourceType}
              onValueChange={(val) => formik.setFieldValue("sourceType", val as RateSheetSourceType)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="Excel" className="text-xs">Excel (.xlsx / .xls)</SelectItem>
                <SelectItem value="CSV" className="text-xs">CSV Spreadsheet (.csv)</SelectItem>
                <SelectItem value="Manual" className="text-xs">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Validity Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Contract Valid From <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              {...formik.getFieldProps("validFrom")}
              className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                getFieldError("validFrom") ? "border-red-500" : ""
              }`}
            />
            {getFieldError("validFrom") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("validFrom")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Contract Valid To <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              {...formik.getFieldProps("validTo")}
              className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                getFieldError("validTo") ? "border-red-500" : ""
              }`}
            />
            {getFieldError("validTo") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("validTo")}</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Initial Status</label>
          <Select
            value={formik.values.status}
            onValueChange={(val) => formik.setFieldValue("status", val as RateSheetStatus)}
          >
            <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="Active" className="text-xs">Active (Available for cost calculation)</SelectItem>
              <SelectItem value="Draft" className="text-xs">Draft (Under review)</SelectItem>
              <SelectItem value="Expired" className="text-xs">Expired</SelectItem>
              <SelectItem value="Archived" className="text-xs">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700">Contract Scope & Description</label>
          <Textarea
            placeholder="Contract terms, blackout periods, commission discounts, supplier remarks..."
            {...formik.getFieldProps("description")}
            className="min-h-[80px] text-xs bg-slate-50/50 border-slate-200 leading-relaxed"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/rate-sheets")}
          className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-4 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-6 cursor-pointer shadow-xs"
        >
          Create Rate Sheet
        </Button>
      </div>
    </form>
  )
}

export default function NewRateSheetPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="New Rate Sheet"
          description="Create a rate sheet container to organize supplier tariffs and Excel imports."
          breadcrumbs={[
            { label: "Rate Sheets", href: "/rate-sheets" },
            { label: "New Rate Sheet" },
          ]}
        />

        <div className="max-w-3xl mx-auto w-full">
          <React.Suspense fallback={<div className="text-xs text-slate-400">Loading form...</div>}>
            <NewRateSheetForm />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
