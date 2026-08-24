"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFormik } from "formik"
import { Ticket, Plus, ArrowLeft, Check, Sparkles } from "lucide-react"
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
import { activitySchema } from "@/lib/validation-schemas"
import { ActivityCategory, ActivityStatus } from "@/types"
import { toast } from "sonner"

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function NewActivityForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedSupplier = searchParams.get("supplierId") || ""
  const { addActivity, suppliers } = useInventory()

  const formik = useFormik({
    initialValues: {
      name: "",
      destination: "",
      category: "Sightseeing" as ActivityCategory,
      supplierId: preselectedSupplier,
      duration: "2 Hours",
      description: "",
      ageRestrictions: "All ages welcome",
      operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      status: "Active" as ActivityStatus,
      notes: "",
    },
    validationSchema: activitySchema,
    onSubmit: (values) => {
      const newAct = addActivity({
        name: values.name.trim(),
        destination: values.destination.trim(),
        category: values.category,
        supplierId: values.supplierId || undefined,
        duration: values.duration.trim() || undefined,
        description: values.description.trim() || undefined,
        ageRestrictions: values.ageRestrictions.trim() || undefined,
        operatingDays: values.operatingDays,
        status: values.status,
        notes: values.notes.trim() || undefined,
      })

      toast.success("Activity created successfully.")
      router.push(`/activities/${newAct.id}`)
    },
  })

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  const toggleDay = (day: string) => {
    const current = [...formik.values.operatingDays]
    const index = current.indexOf(day)
    if (index > -1) {
      if (current.length === 1) {
        toast.error("At least one operating day must be selected.")
        return
      }
      current.splice(index, 1)
    } else {
      current.push(day)
    }
    formik.setFieldValue("operatingDays", current)
  }

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-w-3xl">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-indigo-600" />
          <span>Activity & Sightseeing Details</span>
        </h3>

        {/* Activity Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Activity / Tour Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Mangrove Kayaking Experience, Kolukkumalai Sunrise Safari..."
            {...formik.getFieldProps("name")}
            className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 ${
              getFieldError("name") ? "border-red-500" : ""
            }`}
          />
          {getFieldError("name") && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
          )}
        </div>

        {/* Destination & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Destination Location <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Alleppey, Munnar, Goa, Srinagar..."
              {...formik.getFieldProps("destination")}
              className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                getFieldError("destination") ? "border-red-500" : ""
              }`}
            />
            {getFieldError("destination") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("destination")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Experience Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={formik.values.category}
              onValueChange={(val) => formik.setFieldValue("category", val as ActivityCategory)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="Sightseeing" className="text-xs">Sightseeing Tour</SelectItem>
                <SelectItem value="Adventure" className="text-xs">Adventure & Trekking</SelectItem>
                <SelectItem value="Water Activity" className="text-xs">Water Sports & Boating</SelectItem>
                <SelectItem value="Wildlife" className="text-xs">Wildlife Safari</SelectItem>
                <SelectItem value="Cultural" className="text-xs">Cultural & Heritage</SelectItem>
                <SelectItem value="Nature" className="text-xs">Nature & Eco Tour</SelectItem>
                <SelectItem value="Experience" className="text-xs">Special Experience / Show</SelectItem>
                <SelectItem value="Transfer" className="text-xs">Transfer Sightseeing</SelectItem>
                <SelectItem value="Other" className="text-xs">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Supplier & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Activity Supplier Partner</label>
            <Select
              value={formik.values.supplierId || "none"}
              onValueChange={(val) => formik.setFieldValue("supplierId", val === "none" ? "" : val)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Select Activity Partner" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="none" className="text-xs">Direct Operator (No Supplier)</SelectItem>
                {suppliers
                  .filter((s) => s.services.includes("Activity"))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.city || s.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Standard Duration</label>
            <Input
              placeholder="e.g. 2.5 Hours, Full Day, 4 Hours..."
              {...formik.getFieldProps("duration")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        {/* Age Restrictions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Age & Physical Suitability</label>
          <Input
            placeholder="e.g. Above 8 years, Not suitable for pregnant women, All ages welcome..."
            {...formik.getFieldProps("ageRestrictions")}
            className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
          />
        </div>

        {/* Operating Days */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700 block">Operating Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = formik.values.operatingDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {day} {isSelected && "✓"}
                </button>
              )
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700">Tour Description & Itinerary Highlights</label>
          <Textarea
            placeholder="Detailed description of the excursion, safety gear provided, photo points..."
            {...formik.getFieldProps("description")}
            className="min-h-[80px] text-xs bg-slate-50/50 border-slate-200 leading-relaxed"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Operational Notes & Slot Advice</label>
          <Textarea
            placeholder="Recommended departure slots, sunrise timing, ticket cancellation policy..."
            {...formik.getFieldProps("notes")}
            className="min-h-[70px] text-xs bg-slate-50/50 border-slate-200 leading-relaxed"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/activities")}
          className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-4 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-6 cursor-pointer shadow-xs"
        >
          Save Activity
        </Button>
      </div>
    </form>
  )
}

export default function NewActivityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="Add New Activity"
          description="Register a guided experience, adventure tour or sightseeing excursion."
          breadcrumbs={[
            { label: "Activities", href: "/activities" },
            { label: "New Activity" },
          ]}
        />

        <div className="max-w-3xl mx-auto w-full">
          <React.Suspense fallback={<div className="text-xs text-slate-400">Loading form...</div>}>
            <NewActivityForm />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
