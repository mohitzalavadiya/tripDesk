"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useFormik } from "formik"
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Users,
  Compass,
  Building2,
  Archive,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInventory } from "@/context/inventory-context"
import {
  activitySchema,
  activityRateSchema,
} from "@/lib/validation-schemas"
import {
  Activity,
  ActivityCategory,
  ActivityStatus,
  ActivityPricingType,
  ActivityRate,
  RateStatus,
} from "@/types"
import { toast } from "sonner"

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function ActivityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const activityId = params.id as string

  const {
    activities,
    activityRates,
    suppliers,
    updateActivity,
    deleteActivity,
    addActivityRate,
    updateActivityRate,
    deleteActivityRate,
  } = useInventory()

  const [activeTab, setActiveTab] = React.useState<"overview" | "rates" | "supplier">("overview")
  const [isEditActivityOpen, setIsEditActivityOpen] = React.useState(false)
  const [isAddRateOpen, setIsAddRateOpen] = React.useState(false)
  const [editingRate, setEditingRate] = React.useState<ActivityRate | null>(null)

  const activity = activities.find((a) => a.id === activityId)
  const supplier = activity?.supplierId ? suppliers.find((s) => s.id === activity.supplierId) : null
  const rates = activityRates.filter((ar) => ar.activityId === activityId)

  // Edit Activity Formik
  const editActivityFormik = useFormik({
    initialValues: {
      name: activity?.name || "",
      destination: activity?.destination || "",
      category: (activity?.category || "Sightseeing") as ActivityCategory,
      supplierId: activity?.supplierId || "",
      duration: activity?.duration || "",
      description: activity?.description || "",
      ageRestrictions: activity?.ageRestrictions || "",
      operatingDays: activity?.operatingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      status: (activity?.status || "Active") as ActivityStatus,
      notes: activity?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: activitySchema,
    onSubmit: (values) => {
      if (!activity) return
      updateActivity(activity.id, {
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
      toast.success("Activity updated successfully.")
      setIsEditActivityOpen(false)
    },
  })

  // Rate Formik
  const rateFormik = useFormik({
    initialValues: {
      pricingType: (editingRate?.pricingType || "PerPerson") as ActivityPricingType,
      currency: editingRate?.currency || "INR",
      adultRate: editingRate?.adultRate || 1000,
      childRate: editingRate?.childRate || 500,
      groupRate: editingRate?.groupRate || 0,
      vehicleRate: editingRate?.vehicleRate || 0,
      bookingRate: editingRate?.bookingRate || 0,
      validFrom: editingRate?.validFrom || "2026-10-01",
      validTo: editingRate?.validTo || "2027-03-31",
      status: (editingRate?.status || "Active") as RateStatus,
      notes: editingRate?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: activityRateSchema,
    onSubmit: (values) => {
      if (!activity) return
      if (editingRate) {
        updateActivityRate(editingRate.id, {
          pricingType: values.pricingType,
          currency: values.currency,
          adultRate: values.adultRate ? Number(values.adultRate) : undefined,
          childRate: values.childRate ? Number(values.childRate) : undefined,
          groupRate: values.groupRate ? Number(values.groupRate) : undefined,
          vehicleRate: values.vehicleRate ? Number(values.vehicleRate) : undefined,
          bookingRate: values.bookingRate ? Number(values.bookingRate) : undefined,
          validFrom: values.validFrom || undefined,
          validTo: values.validTo || undefined,
          status: values.status,
          notes: values.notes.trim() || undefined,
        })
        toast.success("Activity rate updated.")
        setEditingRate(null)
      } else {
        addActivityRate({
          activityId: activity.id,
          pricingType: values.pricingType,
          currency: values.currency,
          adultRate: values.adultRate ? Number(values.adultRate) : undefined,
          childRate: values.childRate ? Number(values.childRate) : undefined,
          groupRate: values.groupRate ? Number(values.groupRate) : undefined,
          vehicleRate: values.vehicleRate ? Number(values.vehicleRate) : undefined,
          bookingRate: values.bookingRate ? Number(values.bookingRate) : undefined,
          validFrom: values.validFrom || undefined,
          validTo: values.validTo || undefined,
          status: values.status,
          notes: values.notes.trim() || undefined,
        })
        toast.success("Activity rate added.")
        setIsAddRateOpen(false)
      }
      rateFormik.resetForm()
    },
  })

  if (!activity) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
        <PageHeader
          title="Activity Not Found"
          breadcrumbs={[{ label: "Activities", href: "/activities" }, { label: "Not Found" }]}
        />
        <div className="px-4 py-8 md:px-8 max-w-lg">
          <EmptyState
            icon={Ticket}
            title="Activity Record Not Found"
            description="The requested activity ID does not exist."
            actionText="Back to Activities"
            onAction={() => router.push("/activities")}
          />
        </div>
      </div>
    )
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  const toggleOperatingDay = (day: string) => {
    const current = [...editActivityFormik.values.operatingDays]
    const index = current.indexOf(day)
    if (index > -1) {
      current.splice(index, 1)
    } else {
  current.push(day)
    }
    editActivityFormik.setFieldValue("operatingDays", current)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Hero Command Header */}
        <div className="flex flex-col gap-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Top Title & Telemetry Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Link
                  href="/activities"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Ticket className="h-3 w-3 text-indigo-500" />
                  Activity & Excursion
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {activity.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    activity.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${activity.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {activity.status}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {activity.name}
                </h1>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-md">
                  {activity.category}
                </span>
              </div>

              {/* Micro-Telemetry Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                  <MapPin className="h-3 w-3 text-indigo-500" />
                  <span className="font-bold text-slate-900">{activity.destination}</span>
                </div>
                {activity.duration && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>Duration: {activity.duration}</span>
                  </div>
                )}
                {supplier && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <span>Vendor:</span>
                    <Link href={`/suppliers/${supplier.id}`} className="font-bold text-indigo-600 hover:underline">
                      {supplier.name}
                    </Link>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span className="font-bold text-emerald-950">{rates.length}</span> Tariffs
                </div>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2.5 z-10 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditActivityOpen(true)}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                Edit Activity
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEditingRate(null)
                  setIsAddRateOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Rate
              </Button>
            </div>
          </div>

          {/* Sub Navigation Segmented Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 border-t border-slate-100 pt-3 no-scrollbar z-10">
            {([
              { id: "overview", label: "Overview & Schedule", icon: Building2 },
              { id: "rates", label: "Pricing & Tariffs", icon: Sparkles, count: rates.length },
              { id: "supplier", label: "Vendor Partner", icon: Ticket },
            ] as const).map((tab) => {
              const TabIcon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {"count" in tab && tab.count !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 border border-slate-200/50"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

        </div>

        {/* Tab Content Container */}
        <div className="space-y-6">

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4 lg:col-span-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-600" />
                <span>Tour Overview & Highlights</span>
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {activity.description || <span className="text-slate-400 italic">No detailed description provided.</span>}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                  <div className="font-semibold text-slate-800">{activity.duration || "Self Paced"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age & Physical Criteria</span>
                  <div className="font-semibold text-slate-800">{activity.ageRestrictions || "All ages"}</div>
                </div>
              </div>

              {/* Operating Days */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Operating Days
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const operates = activity.operatingDays?.includes(day)
                    return (
                      <span
                        key={day}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          operates
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                            : "bg-slate-100 text-slate-400 line-through opacity-50"
                        }`}
                      >
                        {day}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Operational Guidelines
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {activity.notes || <span className="text-slate-400 italic">No special operation notes added.</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rates */}
        {activeTab === "rates" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Experience Rates ({rates.length})
                </h3>
                <p className="text-[11px] text-slate-500">Per Person, Adult/Child or Group booking tariff.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingRate(null)
                  setIsAddRateOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Activity Rate
              </Button>
            </div>

            {rates.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No rates set for this activity"
                description="Add adult, child or group booking rates for this tour."
                actionText="Add Rate"
                onAction={() => setIsAddRateOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Pricing Model</th>
                      <th className="py-3 px-4">Adult Rate</th>
                      <th className="py-3 px-4">Child Rate</th>
                      <th className="py-3 px-4">Vehicle / Group Rate</th>
                      <th className="py-3 px-4">Validity Range</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {rate.pricingType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {rate.adultRate ? `₹${rate.adultRate.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {rate.childRate ? `₹${rate.childRate.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">
                          {rate.bookingRate
                            ? `₹${rate.bookingRate.toLocaleString("en-IN")} /booking`
                            : rate.groupRate
                            ? `₹${rate.groupRate.toLocaleString("en-IN")} /group`
                            : "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {rate.validFrom ? `${formatDate(rate.validFrom)} → ${formatDate(rate.validTo)}` : "Open Tariff"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {rate.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRate(rate)
                                setIsAddRateOpen(true)
                              }}
                              className="h-7 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 cursor-pointer"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete this activity rate?")) {
                                  deleteActivityRate(rate.id)
                                  toast.success("Rate deleted.")
                                }
                              }}
                              className="h-7 text-xs font-semibold text-red-600 hover:text-red-700 px-2 cursor-pointer"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Supplier */}
        {activeTab === "supplier" && (
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs max-w-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Activity Provider & Operator Partner
            </h3>
            {supplier ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{supplier.name}</h4>
                    <p className="text-slate-500">{supplier.type} • {supplier.city}</p>
                  </div>
                  <Link href={`/suppliers/${supplier.id}`}>
                    <Button size="sm" variant="outline" className="text-xs font-semibold border-slate-200">
                      View Supplier Profile
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Guide</span>
                    <span className="font-semibold text-slate-800">{supplier.contactPerson || "Reservations"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone</span>
                    <span className="font-semibold text-slate-800">{supplier.phone || "—"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4">Direct operator excursion.</div>
            )}
          </div>
        )}
      </div>

      {/* Edit Activity Dialog */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-lg p-6">
          <form onSubmit={editActivityFormik.handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">Edit Activity</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Update tour name, duration and operating conditions for {activity.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs mt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Activity Name *</label>
                <Input {...editActivityFormik.getFieldProps("name")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Destination *</label>
                  <Input {...editActivityFormik.getFieldProps("destination")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Category *</label>
                  <Select
                    value={editActivityFormik.values.category}
                    onValueChange={(val) => editActivityFormik.setFieldValue("category", val as ActivityCategory)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Sightseeing" className="text-xs">Sightseeing Tour</SelectItem>
                      <SelectItem value="Adventure" className="text-xs">Adventure & Trekking</SelectItem>
                      <SelectItem value="Water Activity" className="text-xs">Water Activity</SelectItem>
                      <SelectItem value="Wildlife" className="text-xs">Wildlife Safari</SelectItem>
                      <SelectItem value="Cultural" className="text-xs">Cultural & Heritage</SelectItem>
                      <SelectItem value="Experience" className="text-xs">Experience / Show</SelectItem>
                      <SelectItem value="Transfer" className="text-xs">Transfer Sightseeing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Duration</label>
                  <Input {...editActivityFormik.getFieldProps("duration")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Age Restrictions</label>
                  <Input {...editActivityFormik.getFieldProps("ageRestrictions")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Description</label>
                <Textarea {...editActivityFormik.getFieldProps("description")} className="min-h-[70px] text-xs bg-slate-50/50 border-slate-200" />
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Activity Rate Dialog */}
      <Dialog
        open={isAddRateOpen}
        onOpenChange={(open) => {
          setIsAddRateOpen(open)
          if (!open) setEditingRate(null)
        }}
      >
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-lg p-6">
          <form onSubmit={rateFormik.handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">
                {editingRate ? "Edit Activity Rate" : "Add Activity Rate"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Specify pricing model (Per Person, Per Adult, Per Group/Vehicle) and validity range.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs mt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Pricing Model *</label>
                <Select
                  value={rateFormik.values.pricingType}
                  onValueChange={(val) => rateFormik.setFieldValue("pricingType", val as ActivityPricingType)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="PerPerson" className="text-xs">Per Person (Flat rate)</SelectItem>
                    <SelectItem value="PerAdult" className="text-xs">Per Adult / Child</SelectItem>
                    <SelectItem value="PerGroup" className="text-xs">Per Group (up to max pax)</SelectItem>
                    <SelectItem value="PerVehicle" className="text-xs">Per Vehicle / Boat (Private booking)</SelectItem>
                    <SelectItem value="PerBooking" className="text-xs">Per Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Adult Rate (₹)</label>
                  <Input
                    type="number"
                    placeholder="1200"
                    {...rateFormik.getFieldProps("adultRate")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Child Rate (₹)</label>
                  <Input
                    type="number"
                    placeholder="800"
                    {...rateFormik.getFieldProps("childRate")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Group / Boat Rate (₹)</label>
                  <Input
                    type="number"
                    placeholder="2500"
                    {...rateFormik.getFieldProps("bookingRate")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Rate Status</label>
                  <Select
                    value={rateFormik.values.status}
                    onValueChange={(val) => rateFormik.setFieldValue("status", val as RateStatus)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Active" className="text-xs">Active</SelectItem>
                      <SelectItem value="Draft" className="text-xs">Draft</SelectItem>
                      <SelectItem value="Expired" className="text-xs">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Valid From</label>
                  <Input type="date" {...rateFormik.getFieldProps("validFrom")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Valid To</label>
                  <Input type="date" {...rateFormik.getFieldProps("validTo")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4">
                {editingRate ? "Save Rate" : "Add Rate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
