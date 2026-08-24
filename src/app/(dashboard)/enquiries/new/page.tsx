"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { useEnquiry } from "@/context/enquiry-context"
import { EnquirySource } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { User, MapPin, Users, Info, Settings2, ShieldCheck } from "lucide-react"

export default function NewEnquiryPage() {
  const router = useRouter()
  const { customers, addCustomer, addEnquiry } = useEnquiry()

  // Form Mode
  const [customerMode, setCustomerMode] = React.useState<"existing" | "new">("existing")

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("")
  const [newCustomerName, setNewCustomerName] = React.useState("")
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("")
  const [newCustomerEmail, setNewCustomerEmail] = React.useState("")

  // Travel Details State
  const [destination, setDestination] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")

  // Travellers State
  const [adults, setAdults] = React.useState(2)
  const [children, setChildren] = React.useState(0)
  const [infants, setInfants] = React.useState(0)

  // Preferences State
  const [hotelCategory, setHotelCategory] = React.useState("Not decided")
  const [mealPlan, setMealPlan] = React.useState("Not decided")
  const [vehiclePreference, setVehiclePreference] = React.useState("Not decided")
  const [budget, setBudget] = React.useState("")
  const [budgetType, setBudgetType] = React.useState<"total" | "per_person">("total")

  // Requirements & Metadata State
  const [notes, setNotes] = React.useState("")
  const [internalNotes, setInternalNotes] = React.useState("")
  const [source, setSource] = React.useState<string>("WhatsApp")

  // Duration Helper
  const getDurationString = React.useMemo(() => {
    if (!startDate || !endDate) return ""
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ""
    const diffTime = end.getTime() - start.getTime()
    if (diffTime < 0) return "End date must be after start date"
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Same Day Trip"
    return `${diffDays} Nights / ${diffDays + 1} Days`
  }, [startDate, endDate])

  // Form Submitting / Validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Validation
    let finalCustomerId = selectedCustomerId

    if (customerMode === "new") {
      if (!newCustomerName.trim()) {
        toast.error("Customer name is required")
        return
      }
      if (!newCustomerPhone.trim()) {
        toast.error("Customer phone number is required")
        return
      }
      // Save customer
      const cust = addCustomer(newCustomerName, newCustomerPhone, newCustomerEmail)
      finalCustomerId = cust.id
    } else {
      if (!finalCustomerId) {
        toast.error("Please select an existing customer or create a new one")
        return
      }
    }

    if (!destination.trim()) {
      toast.error("Destination is required")
      return
    }

    if (!startDate) {
      toast.error("Start date is required")
      return
    }

    if (!endDate) {
      toast.error("End date is required")
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end < start) {
      toast.error("End date cannot be before start date")
      return
    }

    if (adults < 1) {
      toast.error("At least 1 adult is required")
      return
    }

    const parsedBudget = budget ? parseFloat(budget) : undefined
    if (parsedBudget !== undefined && (isNaN(parsedBudget) || parsedBudget < 0)) {
      toast.error("Budget amount must be a positive number")
      return
    }

    // 2. Save Enquiry
    const savedEnq = addEnquiry({
      customerId: finalCustomerId,
      destination,
      startDate,
      endDate,
      adults,
      children,
      infants,
      budget: parsedBudget,
      budgetType,
      hotelCategory,
      mealPlan,
      vehiclePreference,
      source: source as EnquirySource,
      status: "New",
      notes: notes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
    })

    toast.success("Enquiry created successfully")
    router.push(`/enquiries/${savedEnq.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="New Enquiry"
          description="Fill in customer details, destination preferences, and travel criteria to register a new sales pipeline lead."
          breadcrumbs={[
            { label: "Enquiries", href: "/enquiries" },
            { label: "New" },
          ]}
        />

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Section 1: Customer Information */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-2">
            <User className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Customer Information</h3>
          </div>

          {/* Toggle between select existing vs create new */}
          <div className="grid grid-cols-2 gap-2 p-0.5 bg-slate-100 rounded-lg w-full max-w-xs">
            <button
              type="button"
              onClick={() => setCustomerMode("existing")}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                customerMode === "existing"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Select Existing
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("new")}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                customerMode === "new"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create New Customer
            </button>
          </div>

          {customerMode === "existing" ? (
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Select Customer
              </label>
              <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v || "")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:ring-indigo-500">
                  <SelectValue placeholder="Search or select a customer..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-[250px]">
                  {customers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>
                      {cust.name} ({cust.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                If the customer doesn&apos;t exist, switch to &quot;Create New Customer&quot; above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Rahul Patel"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. +91 98765 43210"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 max-w-md">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Email Address <span className="text-slate-400">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. rahul@example.com"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Travel Details */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Travel Details</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Destination Selection */}
            <div className="space-y-1.5 sm:col-span-2 max-w-md">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Destination <span className="text-red-500">*</span>
              </label>
              <Select value={destination} onValueChange={(v) => setDestination(v || "")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:ring-indigo-500">
                  <SelectValue placeholder="Select travel destination..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {["Kerala", "Goa", "Rajasthan", "Kashmir", "Himachal Pradesh", "Dubai", "Maldives", "Andaman"].map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                End Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 text-slate-700"
              />
            </div>

            {/* Calculated duration display */}
            {getDurationString && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-lg bg-indigo-50/50 border border-indigo-100/50 p-3 text-indigo-700 text-xs font-semibold">
                <Info className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
                <span>Computed Duration: <b>{getDurationString}</b></span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Travellers */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Traveller Count</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Adults
              </label>
              <Input
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Children
              </label>
              <Input
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Infants
              </label>
              <Input
                type="number"
                min="0"
                value={infants}
                onChange={(e) => setInfants(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Travel Preferences */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Travel Preferences</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Hotel Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Hotel Category
              </label>
              <Select value={hotelCategory} onValueChange={(v) => setHotelCategory(v || "Not decided")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-9.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {["3 Star", "4 Star", "5 Star", "Luxury", "Budget", "Not decided"].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meal Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Meal Plan
              </label>
              <Select value={mealPlan} onValueChange={(v) => setMealPlan(v || "Not decided")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-9.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="EP">EP (Only Room)</SelectItem>
                  <SelectItem value="CP">CP (Room + Breakfast)</SelectItem>
                  <SelectItem value="MAP">MAP (Room + Breakfast + Dinner)</SelectItem>
                  <SelectItem value="AP">AP (All Meals)</SelectItem>
                  <SelectItem value="Not decided">Not decided</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Vehicle Preference
              </label>
              <Select value={vehiclePreference} onValueChange={(v) => setVehiclePreference(v || "Not decided")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-9.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {["Sedan", "SUV", "Tempo Traveller", "Mini Bus", "Not decided"].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget Input */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Budget Amount (₹)
              </label>
              <Input
                type="number"
                placeholder="e.g. 120000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 font-semibold"
              />
            </div>

            {/* Budget Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Budget Type
              </label>
              <Select value={budgetType} onValueChange={(v) => setBudgetType((v as "total" | "per_person") || "total")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-9.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="total">Total Budget</SelectItem>
                  <SelectItem value="per_person">Per Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 5: Requirements, Notes, Source */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Requirements & Source</h3>
          </div>

          <div className="space-y-4">
            {/* Source */}
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                How did this enquiry reach you?
              </label>
              <Select value={source} onValueChange={(v) => setSource(v || "WhatsApp")}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-9.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {["WhatsApp", "Instagram", "Facebook", "Website", "Phone", "Referral", "Walk-in", "Google", "Other"].map((src) => (
                    <SelectItem key={src} value={src}>
                      {src}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Special requirements */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Special Requirements <span className="text-slate-400">(Shared with customers)</span>
              </label>
              <Textarea
                placeholder="e.g. Customer prefers beach-facing rooms, private transport, and local sightseeing guides..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Internal Agency Notes <span className="text-slate-400">(Private)</span>
              </label>
              <Textarea
                placeholder="e.g. Flight ticket pricing is currently high. Follow up immediately to seal booking before budget exceeds."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 min-h-[80px]"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/enquiries")}
            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer h-9 px-5 font-semibold"
          >
            Create Enquiry
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
