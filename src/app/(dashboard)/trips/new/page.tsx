"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFormik } from "formik"
import { PageHeader } from "@/components/shared/page-header"
import { useEnquiry } from "@/context/enquiry-context"
import { TripStatus } from "@/types"
import { tripSchema } from "@/lib/validation-schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Compass, Calendar, MapPin, Users, Info } from "lucide-react"

export default function NewTripPage() {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="mt-2 text-xs text-slate-500 font-semibold">Loading form...</span>
      </div>
    }>
      <NewTripForm />
    </React.Suspense>
  )
}

function NewTripForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const enquiryId = searchParams.get("enquiryId")
  const customerIdParam = searchParams.get("customerId")
  const similarTripId = searchParams.get("similarTripId")

  const { customers, enquiries, trips, addTrip } = useEnquiry()

  // Pre-fetch enquiry or similar trip on render
  const enq = React.useMemo(() => {
    return enquiryId ? enquiries.find((e) => e.id === enquiryId) : null
  }, [enquiryId, enquiries])

  const similarTrip = React.useMemo(() => {
    return similarTripId ? trips.find((t) => t.id === similarTripId) : null
  }, [similarTripId, trips])

  // Track enquiry association
  const [associatedEnquiryId] = React.useState<string | undefined>(enq?.id || undefined)

  // Redirect if duplicate conversion is detected
  React.useEffect(() => {
    if (enquiryId) {
      const existingTrip = trips.find((t) => t.enquiryId === enquiryId)
      if (existingTrip) {
        toast.warning(`Trip already created for this enquiry. Redirecting...`)
        router.push(`/trips/${existingTrip.id}`)
      }
    }
  }, [enquiryId, trips, router])

  const formik = useFormik({
    initialValues: {
      customerId: enq?.customerId || customerIdParam || similarTrip?.customerId || "",
      tripName: enq
        ? `${enq.destination} Holiday`
        : similarTrip
        ? `${similarTrip.destination} Tour (Repeat Trip)`
        : "",
      destination: enq?.destination || similarTrip?.destination || "",
      startDate: enq?.startDate || "",
      endDate: enq?.endDate || "",
      adults: enq?.adults ?? similarTrip?.adults ?? 2,
      children: enq?.children ?? similarTrip?.children ?? 0,
      infants: enq?.infants ?? similarTrip?.infants ?? 0,
      budget: enq?.budget
        ? String(enq.budget)
        : similarTrip?.budget
        ? String(similarTrip.budget)
        : "",
      status: "Planning" as TripStatus,
      notes: enq
        ? enq.notes || enq.internalNotes || ""
        : similarTrip
        ? `Repeat booking based on ${similarTrip.name}. ${similarTrip.notes || ""}`
        : "",
    },
    validationSchema: tripSchema,
    onSubmit: (values) => {
      const trimmedTripName = values.tripName.trim()
      const finalTripName = trimmedTripName || `${values.destination.trim()} Holiday`
      const parsedBudget = values.budget ? parseFloat(values.budget) : undefined

      const newTrip = addTrip({
        enquiryId: associatedEnquiryId,
        customerId: values.customerId,
        name: finalTripName,
        destination: values.destination.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        adults: values.adults,
        children: values.children,
        infants: values.infants,
        budget: parsedBudget,
        status: values.status as TripStatus,
        notes: values.notes.trim() || undefined,
      })

      toast.success("Trip created successfully.")
      router.push(`/trips/${newTrip.id}`)
    },
  })

  // Duration Nights/Days Calculation
  const durationString = React.useMemo(() => {
    if (!formik.values.startDate || !formik.values.endDate) return ""
    const start = new Date(formik.values.startDate)
    const end = new Date(formik.values.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ""
    const diffTime = end.getTime() - start.getTime()
    if (diffTime < 0) return "End date must be after start date"
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Same Day Trip"
    return `${diffDays} Nights / ${diffDays + 1} Days`
  }, [formik.values.startDate, formik.values.endDate])

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
          title="Create New Trip"
          description="Initialize a new travel itinerary package and connect it to a customer CRM account."
          breadcrumbs={[
            { label: "Trips", href: "/trips" },
            { label: "New Trip" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
          
          {/* Main Details block */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <Compass className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Trip Operations Metadata
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Customer <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formik.values.customerId}
                  onValueChange={(val) => formik.setFieldValue("customerId", val || "")}
                  disabled={!!enquiryId} // Locked if converted from enquiry
                >
                  <SelectTrigger className={`h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500 ${fieldError("customerId") ? "border-red-500 focus:ring-red-500" : ""}`}>
                    <SelectValue placeholder="Select a customer..." />
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
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("customerId")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Trip Workspace Name
                </label>
                <div className="relative">
                  <Compass className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Kerala Family Getaway"
                    {...formik.getFieldProps("tripName")}
                    className={inputCls("tripName", "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                  />
                </div>
                {fieldError("tripName") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("tripName")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Destination <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Kerala, Rajasthan"
                    {...formik.getFieldProps("destination")}
                    className={inputCls("destination", "pl-9 h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                  />
                </div>
                {fieldError("destination") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("destination")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Trip Status
                </label>
                <Select value={formik.values.status} onValueChange={(val) => formik.setFieldValue("status", val)}>
                  <SelectTrigger className="h-10.5 text-xs bg-slate-50/30 border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Trip Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Planning" className="text-xs">Planning</SelectItem>
                    <SelectItem value="Quoting" className="text-xs">Quoting</SelectItem>
                    <SelectItem value="Confirmed" className="text-xs">Confirmed</SelectItem>
                    <SelectItem value="In Progress" className="text-xs">In Progress</SelectItem>
                    <SelectItem value="Completed" className="text-xs">Completed</SelectItem>
                    <SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Travel Schedule dates Block */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
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
                  className={inputCls("startDate", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("startDate") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("startDate")}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  {...formik.getFieldProps("endDate")}
                  className={inputCls("endDate", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("endDate") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("endDate")}</p>
                )}
              </div>
            </div>

            {durationString && (
              <div className="bg-indigo-50/50 border border-indigo-150/40 rounded-lg p-3 text-xs flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-indigo-650 shrink-0" />
                <span className="font-bold text-indigo-900">
                  Calculated Duration: {durationString}
                </span>
              </div>
            )}
          </div>

          {/* Passengers & Finance Details Block */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Travellers & Budget Configuration
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Adults (12y+) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  {...formik.getFieldProps("adults")}
                  onChange={(e) => formik.setFieldValue("adults", parseInt(e.target.value) || 0)}
                  className={inputCls("adults", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("adults") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("adults")}</p>
                )}
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Children (2-12y)
                </label>
                <Input
                  type="number"
                  min={0}
                  {...formik.getFieldProps("children")}
                  onChange={(e) => formik.setFieldValue("children", parseInt(e.target.value) || 0)}
                  className={inputCls("children", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("children") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("children")}</p>
                )}
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Infants (Under 2y)
                </label>
                <Input
                  type="number"
                  min={0}
                  {...formik.getFieldProps("infants")}
                  onChange={(e) => formik.setFieldValue("infants", parseInt(e.target.value) || 0)}
                  className={inputCls("infants", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("infants") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("infants")}</p>
                )}
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Trip Budget (INR)
                </label>
                <Input
                  placeholder="e.g. 150000"
                  type="number"
                  {...formik.getFieldProps("budget")}
                  className={inputCls("budget", "h-10.5 bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
                />
                {fieldError("budget") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("budget")}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Planning Notes / Special Remarks
              </label>
              <Textarea
                placeholder="Details about hotel vouchers, transfer vehicles, special instructions..."
                {...formik.getFieldProps("notes")}
                className={inputCls("notes", "min-h-[85px] bg-slate-50/30 border-slate-200 text-xs focus-visible:ring-indigo-500")}
              />
              {fieldError("notes") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">{fieldError("notes")}</p>
              )}
            </div>
          </div>

          {/* Actions panel */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex gap-2 text-slate-400 text-xs leading-normal">
              <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <span>Creating a trip creates an active workspace. You can edit itinerary days later.</span>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 cursor-pointer shadow-sm animate-in zoom-in-95 duration-200"
              >
                Create Workspace
              </Button>
            </div>
          </div>

        </form>
      </div>
      </div>
    </div>
  )
}
