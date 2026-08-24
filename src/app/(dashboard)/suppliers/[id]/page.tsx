"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useFormik } from "formik"
import {
  Truck,
  Hotel,
  Car,
  Ticket,
  FileSpreadsheet,
  Edit,
  Plus,
  Mail,
  Phone,
  Building2,
  Globe,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  CheckCircle2,
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
import { supplierSchema } from "@/lib/validation-schemas"
import { SupplierType, SupplierService, SupplierStatus } from "@/types"
import { toast } from "sonner"

export default function SupplierProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supplierId = params.id as string

  const {
    suppliers,
    hotels,
    hotelRooms,
    hotelRates,
    rateSheets,
    vehicles,
    vehicleRates,
    activities,
    activityRates,
    updateSupplier,
  } = useInventory()

  const [activeTab, setActiveTab] = React.useState<"overview" | "hotels" | "vehicles" | "activities" | "rate-sheets">("overview")
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

  const supplier = suppliers.find((s) => s.id === supplierId)

  // Associated resources
  const supplierHotels = hotels.filter((h) => h.supplierId === supplierId)
  const supplierVehicles = vehicles.filter((v) => v.supplierId === supplierId)
  const supplierActivities = activities.filter((a) => a.supplierId === supplierId)
  const supplierRateSheets = rateSheets.filter((rs) => rs.supplierId === supplierId)

  // Total active rates
  const supplierHotelIds = supplierHotels.map((h) => h.id)
  const activeHotelRatesCount = hotelRates.filter((hr) => supplierHotelIds.includes(hr.hotelId) && hr.status === "Active").length

  const supplierVehicleIds = supplierVehicles.map((v) => v.id)
  const activeVehicleRatesCount = vehicleRates.filter((vr) => supplierVehicleIds.includes(vr.vehicleId) && vr.status === "Active").length

  const supplierActivityIds = supplierActivities.map((a) => a.id)
  const activeActivityRatesCount = activityRates.filter((ar) => supplierActivityIds.includes(ar.activityId) && ar.status === "Active").length

  const totalActiveRates = activeHotelRatesCount + activeVehicleRatesCount + activeActivityRatesCount

  // Formik for Edit Supplier Dialog
  const editFormik = useFormik({
    initialValues: {
      name: supplier?.name || "",
      type: (supplier?.type || "Hotel Supplier") as SupplierType,
      contactPerson: supplier?.contactPerson || "",
      phone: supplier?.phone || "",
      email: supplier?.email || "",
      city: supplier?.city || "",
      website: supplier?.website || "",
      services: (supplier?.services || ["Hotel"]) as SupplierService[],
      status: (supplier?.status || "Active") as SupplierStatus,
      notes: supplier?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: supplierSchema,
    onSubmit: (values) => {
      if (!supplier) return
      updateSupplier(supplier.id, {
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
      toast.success("Supplier details updated.")
      setIsEditDialogOpen(false)
    },
  })

  const getEditFieldError = (field: string) => {
    const touched = editFormik.touched[field as keyof typeof editFormik.touched]
    const error = editFormik.errors[field as keyof typeof editFormik.errors]
    return touched && error ? (error as string) : undefined
  }

  const toggleEditService = (service: SupplierService) => {
    const current = [...editFormik.values.services]
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
    editFormik.setFieldValue("services", current)
  }

  if (!supplier) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
        <PageHeader
          title="Supplier Not Found"
          breadcrumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: "Not Found" }]}
        />
        <div className="px-4 py-8 md:px-8 max-w-lg">
          <EmptyState
            icon={Truck}
            title="Supplier Record Not Found"
            description="The requested supplier ID does not exist or has been removed from the database."
            actionText="Back to Suppliers"
            onAction={() => router.push("/suppliers")}
          />
        </div>
      </div>
    )
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
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
                  href="/suppliers"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Truck className="h-3 w-3 text-indigo-500" />
                  Supplier Partner
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {supplier.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    supplier.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${supplier.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {supplier.status}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {supplier.name}
                </h1>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {supplier.type}
                </span>
              </div>

              {/* Micro-Telemetry Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {supplier.city && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <span>📍 {supplier.city}</span>
                  </div>
                )}
                {supplier.contactPerson && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <span className="font-bold text-slate-900">{supplier.contactPerson}</span>
                    {supplier.phone && <span className="text-slate-400">({supplier.phone})</span>}
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span className="font-bold text-emerald-950">{totalActiveRates}</span> Active Tariffs
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                  <span className="font-bold text-blue-950">{supplierHotels.length}</span> Hotels
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100/60">
                  <span className="font-bold text-amber-950">{supplierVehicles.length}</span> Vehicles
                </div>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2.5 z-10 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                Edit Supplier
              </Button>

              <Button
                size="sm"
                onClick={() => router.push(`/rate-sheets/new?supplierId=${supplier.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                Add Rate Sheet
              </Button>
            </div>
          </div>

          {/* Sub Navigation Segmented Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 border-t border-slate-100 pt-3 no-scrollbar z-10">
            {([
              { id: "overview", label: "Overview & Contacts", icon: Building2 },
              { id: "hotels", label: "Hotels", icon: Hotel, count: supplierHotels.length },
              { id: "vehicles", label: "Vehicles", icon: Car, count: supplierVehicles.length },
              { id: "activities", label: "Activities", icon: Ticket, count: supplierActivities.length },
              { id: "rate-sheets", label: "Rate Sheets", icon: FileSpreadsheet, count: supplierRateSheets.length },
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
        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Details Card */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4 lg:col-span-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Primary Commercial Contact</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Person</span>
                  <div className="font-semibold text-slate-800 text-sm">
                    {supplier.contactPerson || <span className="text-slate-400 font-normal italic">None provided</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone / WhatsApp</span>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{supplier.phone || "—"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{supplier.email || "—"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">City / Regional Hub</span>
                  <div className="font-semibold text-slate-800 text-sm">
                    {supplier.city || "—"}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website Portal</span>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    {supplier.website ? (
                      <a href={supplier.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                        <span>{supplier.website}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 font-normal italic">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Services Badges */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Active Service Lines
                </span>
                <div className="flex flex-wrap gap-2">
                  {supplier.services.map((svc) => (
                    <span
                      key={svc}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                        svc === "Hotel"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : svc === "Vehicle"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {svc === "Hotel" && <Hotel className="h-3.5 w-3.5 text-amber-600" />}
                      {svc === "Vehicle" && <Car className="h-3.5 w-3.5 text-blue-600" />}
                      {svc === "Activity" && <Ticket className="h-3.5 w-3.5 text-emerald-600" />}
                      {svc} Partner
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes & Audit info */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Internal Operation Notes
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {supplier.notes || <span className="text-slate-400 italic">No notes recorded for this supplier yet. Click Edit Supplier to add contract terms or cutoff remarks.</span>}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-2.5 text-xs text-slate-500">
                <h4 className="font-bold text-slate-800 text-xs">Record Metadata</h4>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span>Created At:</span>
                  <span className="font-mono text-slate-700">{formatDate(supplier.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span>Last Modified:</span>
                  <span className="font-mono text-slate-700">{formatDate(supplier.updatedAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Audited System ID:</span>
                  <span className="font-mono font-semibold text-indigo-600">{supplier.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === "hotels" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hotels & Properties Managed by {supplier.name}
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/hotels/new?supplierId=${supplier.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Hotel
              </Button>
            </div>

            {supplierHotels.length === 0 ? (
              <EmptyState
                icon={Hotel}
                title="No hotels added for this supplier yet"
                description="Link hotel properties to this partner to manage contract rooms and meal plan tariffs."
                actionText="Add First Hotel"
                onAction={() => router.push(`/hotels/new?supplierId=${supplier.id}`)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierHotels.map((hotel) => {
                  const roomsCount = hotelRooms.filter((r) => r.hotelId === hotel.id).length
                  const ratesCount = hotelRates.filter((r) => r.hotelId === hotel.id && r.status === "Active").length
                  return (
                    <div
                      key={hotel.id}
                      onClick={() => router.push(`/hotels/${hotel.id}`)}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                              {hotel.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {hotel.destination} {hotel.area && `(${hotel.area})`}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            {hotel.starCategory} Star
                          </span>
                        </div>

                        {hotel.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {hotel.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{roomsCount} Rooms</span>
                        <span className="font-bold text-indigo-600">{ratesCount} Active Rates</span>
                        <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === "vehicles" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Fleet & Transport Inventory from {supplier.name}
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/vehicles/new?supplierId=${supplier.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Vehicle
              </Button>
            </div>

            {supplierVehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No vehicles listed for this supplier"
                description="Add Sedans, SUVs, Urbania tempo travellers or luxury coaches from this transport partner."
                actionText="Add Vehicle"
                onAction={() => router.push(`/vehicles/new?supplierId=${supplier.id}`)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierVehicles.map((vehicle) => {
                  const rates = vehicleRates.filter((vr) => vr.vehicleId === vehicle.id && vr.status === "Active")
                  const minRate = rates.length > 0 ? Math.min(...rates.map((r) => r.baseRate)) : null
                  return (
                    <div
                      key={vehicle.id}
                      onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                              {vehicle.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {vehicle.vehicleType} • {vehicle.baseLocation || "Kerala Circuit"}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            {vehicle.seatingCapacity} Seats
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {vehicle.ac ? "AC" : "Non-AC"}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {vehicle.driverIncluded ? "Driver Incl." : "Self Drive"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{rates.length} Rates</span>
                        {minRate ? (
                          <span className="font-bold text-indigo-600">From ₹{minRate.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-slate-400 italic">No rates set</span>
                        )}
                        <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Experiences & Sightseeing from {supplier.name}
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/activities/new?supplierId=${supplier.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Activity
              </Button>
            </div>

            {supplierActivities.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No activities listed for this supplier"
                description="Add guided tours, sunset cruises, scuba dives or cultural shows provided by this partner."
                actionText="Add Activity"
                onAction={() => router.push(`/activities/new?supplierId=${supplier.id}`)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierActivities.map((activity) => {
                  const rates = activityRates.filter((ar) => ar.activityId === activity.id && ar.status === "Active")
                  const sampleRate = rates[0]
                  return (
                    <div
                      key={activity.id}
                      onClick={() => router.push(`/activities/${activity.id}`)}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                              {activity.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {activity.destination} • {activity.category}
                            </p>
                          </div>
                          {activity.duration && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              {activity.duration}
                            </span>
                          )}
                        </div>

                        {activity.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {activity.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{rates.length} Rates</span>
                        {sampleRate ? (
                          <span className="font-bold text-indigo-600">
                            {sampleRate.adultRate ? `₹${sampleRate.adultRate.toLocaleString("en-IN")}/pax` : `₹${sampleRate.bookingRate?.toLocaleString("en-IN")}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No rate</span>
                        )}
                        <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Rate Sheets Tab */}
        {activeTab === "rate-sheets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Supplier Contracts & Rate Sheets
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/rate-sheets/new?supplierId=${supplier.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Rate Sheet
              </Button>
            </div>

            {supplierRateSheets.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No rate sheets uploaded for this supplier"
                description="Upload an Excel/CSV contract sheet or create a seasonal rate sheet tariff."
                actionText="Create Rate Sheet"
                onAction={() => router.push(`/rate-sheets/new?supplierId=${supplier.id}`)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Rate Sheet Name</th>
                      <th className="py-3 px-4">Validity Range</th>
                      <th className="py-3 px-4">Source Type</th>
                      <th className="py-3 px-4 text-center">Rates Count</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {supplierRateSheets.map((rs) => {
                      const linkedRates = hotelRates.filter((hr) => hr.rateSheetId === rs.id).length
                      return (
                        <tr
                          key={rs.id}
                          onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {rs.name}
                            </div>
                            {rs.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5 font-sans">
                                {rs.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {formatDate(rs.validFrom)} → {formatDate(rs.validTo)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {rs.sourceType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {linkedRates} rates
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rs.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {rs.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                              className="h-7 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 cursor-pointer"
                            >
                              Open
                              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-2xl p-6">
          <form onSubmit={editFormik.handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">Edit Supplier Details</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Update business name, category, contact information and operational notes for {supplier.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs mt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Supplier Name *</label>
                <Input
                  {...editFormik.getFieldProps("name")}
                  className={`h-9 text-xs bg-slate-50/50 border-slate-200 ${
                    getEditFieldError("name") ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                />
                {getEditFieldError("name") && (
                  <p className="text-[10px] text-red-500 font-semibold">{getEditFieldError("name")}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Category *</label>
                  <Select
                    value={editFormik.values.type}
                    onValueChange={(val) => editFormik.setFieldValue("type", val as SupplierType)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Hotel Supplier" className="text-xs">Hotel Supplier</SelectItem>
                      <SelectItem value="Transport Supplier" className="text-xs">Transport Supplier</SelectItem>
                      <SelectItem value="Activity Supplier" className="text-xs">Activity Supplier</SelectItem>
                      <SelectItem value="DMC" className="text-xs">DMC</SelectItem>
                      <SelectItem value="Travel Partner" className="text-xs">Travel Partner</SelectItem>
                      <SelectItem value="Other" className="text-xs">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Status</label>
                  <Select
                    value={editFormik.values.status}
                    onValueChange={(val) => editFormik.setFieldValue("status", val as SupplierStatus)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Active" className="text-xs">Active</SelectItem>
                      <SelectItem value="Inactive" className="text-xs">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Services Provided checkboxes */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Services Provided *</label>
                <div className="flex gap-2">
                  {(["Hotel", "Vehicle", "Activity"] as SupplierService[]).map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleEditService(svc)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        editFormik.values.services.includes(svc)
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      {svc} {editFormik.values.services.includes(svc) && "✓"}
                    </button>
                  ))}
                </div>
                {getEditFieldError("services") && (
                  <p className="text-[10px] text-red-500 font-semibold">{getEditFieldError("services")}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Contact Person</label>
                  <Input {...editFormik.getFieldProps("contactPerson")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Phone Number</label>
                  <Input {...editFormik.getFieldProps("phone")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                  {getEditFieldError("phone") && (
                    <p className="text-[10px] text-red-500 font-semibold">{getEditFieldError("phone")}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Email Address</label>
                  <Input type="email" {...editFormik.getFieldProps("email")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                  {getEditFieldError("email") && (
                    <p className="text-[10px] text-red-500 font-semibold">{getEditFieldError("email")}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Base City</label>
                  <Input {...editFormik.getFieldProps("city")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Notes & Remarks</label>
                <Textarea {...editFormik.getFieldProps("notes")} className="min-h-[70px] text-xs bg-slate-50/50 border-slate-200" />
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
      </div>
    </div>
  )
}
