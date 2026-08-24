"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useFormik } from "formik"
import {
  Car,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Fuel,
  IndianRupee,
  Building2,
  FileSpreadsheet,
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
  vehicleSchema,
  vehicleRateSchema,
} from "@/lib/validation-schemas"
import {
  Vehicle,
  VehicleType,
  VehicleStatus,
  VehiclePricingType,
  VehicleRate,
  RateStatus,
} from "@/types"
import { toast } from "sonner"

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vehicleId = params.id as string

  const {
    vehicles,
    vehicleRates,
    suppliers,
    updateVehicle,
    deleteVehicle,
    addVehicleRate,
    updateVehicleRate,
    deleteVehicleRate,
  } = useInventory()

  const [activeTab, setActiveTab] = React.useState<"overview" | "rates" | "supplier">("overview")
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false)
  const [isAddRateOpen, setIsAddRateOpen] = React.useState(false)
  const [editingRate, setEditingRate] = React.useState<VehicleRate | null>(null)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const supplier = vehicle?.supplierId ? suppliers.find((s) => s.id === vehicle.supplierId) : null
  const rates = vehicleRates.filter((vr) => vr.vehicleId === vehicleId)

  // Edit Vehicle Formik
  const editVehicleFormik = useFormik({
    initialValues: {
      name: vehicle?.name || "",
      vehicleType: (vehicle?.vehicleType || "SUV") as VehicleType,
      seatingCapacity: vehicle?.seatingCapacity || 6,
      luggageCapacity: vehicle?.luggageCapacity || 4,
      supplierId: vehicle?.supplierId || "",
      baseLocation: vehicle?.baseLocation || "",
      ac: vehicle?.ac ?? true,
      driverIncluded: vehicle?.driverIncluded ?? true,
      model: vehicle?.model || "",
      permitType: vehicle?.permitType || "",
      status: (vehicle?.status || "Active") as VehicleStatus,
      notes: vehicle?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: vehicleSchema,
    onSubmit: (values) => {
      if (!vehicle) return
      updateVehicle(vehicle.id, {
        name: values.name.trim(),
        vehicleType: values.vehicleType,
        seatingCapacity: Number(values.seatingCapacity),
        luggageCapacity: Number(values.luggageCapacity) || undefined,
        supplierId: values.supplierId || undefined,
        baseLocation: values.baseLocation.trim() || undefined,
        ac: Boolean(values.ac),
        driverIncluded: Boolean(values.driverIncluded),
        model: values.model.trim() || undefined,
        permitType: values.permitType.trim() || undefined,
        status: values.status,
        notes: values.notes.trim() || undefined,
      })
      toast.success("Vehicle updated successfully.")
      setIsEditVehicleOpen(false)
    },
  })

  // Rate Formik
  const rateFormik = useFormik({
    initialValues: {
      pricingType: (editingRate?.pricingType || "PerDay") as VehiclePricingType,
      currency: editingRate?.currency || "INR",
      baseRate: editingRate?.baseRate || 3500,
      includedKm: editingRate?.includedKm || 200,
      extraKmRate: editingRate?.extraKmRate || 18,
      driverAllowance: editingRate?.driverAllowance || 400,
      nightHalt: editingRate?.nightHalt || 500,
      tollIncluded: editingRate?.tollIncluded || false,
      parkingIncluded: editingRate?.parkingIncluded || false,
      validFrom: editingRate?.validFrom || "2026-10-01",
      validTo: editingRate?.validTo || "2027-03-31",
      status: (editingRate?.status || "Active") as RateStatus,
      notes: editingRate?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: vehicleRateSchema,
    onSubmit: (values) => {
      if (!vehicle) return
      if (editingRate) {
        updateVehicleRate(editingRate.id, {
          pricingType: values.pricingType,
          currency: values.currency,
          baseRate: Number(values.baseRate),
          includedKm: Number(values.includedKm) || undefined,
          extraKmRate: Number(values.extraKmRate) || undefined,
          driverAllowance: Number(values.driverAllowance) || undefined,
          nightHalt: Number(values.nightHalt) || undefined,
          tollIncluded: Boolean(values.tollIncluded),
          parkingIncluded: Boolean(values.parkingIncluded),
          validFrom: values.validFrom || undefined,
          validTo: values.validTo || undefined,
          status: values.status,
          notes: values.notes.trim() || undefined,
        })
        toast.success("Vehicle rate updated.")
        setEditingRate(null)
      } else {
        addVehicleRate({
          vehicleId: vehicle.id,
          pricingType: values.pricingType,
          currency: values.currency,
          baseRate: Number(values.baseRate),
          includedKm: Number(values.includedKm) || undefined,
          extraKmRate: Number(values.extraKmRate) || undefined,
          driverAllowance: Number(values.driverAllowance) || undefined,
          nightHalt: Number(values.nightHalt) || undefined,
          tollIncluded: Boolean(values.tollIncluded),
          parkingIncluded: Boolean(values.parkingIncluded),
          validFrom: values.validFrom || undefined,
          validTo: values.validTo || undefined,
          status: values.status,
          notes: values.notes.trim() || undefined,
        })
        toast.success("Vehicle rate added.")
        setIsAddRateOpen(false)
      }
      rateFormik.resetForm()
    },
  })

  if (!vehicle) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
        <PageHeader
          title="Vehicle Not Found"
          breadcrumbs={[{ label: "Vehicles", href: "/vehicles" }, { label: "Not Found" }]}
        />
        <div className="px-4 py-8 md:px-8 max-w-lg">
          <EmptyState
            icon={Car}
            title="Vehicle Record Not Found"
            description="The requested vehicle ID does not exist."
            actionText="Back to Vehicles"
            onAction={() => router.push("/vehicles")}
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
                  href="/vehicles"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Car className="h-3 w-3 text-indigo-500" />
                  Vehicle Fleet
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {vehicle.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    vehicle.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${vehicle.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {vehicle.status}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {vehicle.name}
                </h1>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {vehicle.vehicleType}
                </span>
              </div>

              {/* Micro-Telemetry Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="font-bold text-blue-950">{vehicle.seatingCapacity} Seats</span>
                </div>
                {vehicle.baseLocation && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <MapPin className="h-3 w-3 text-indigo-500" />
                    <span>Base: {vehicle.baseLocation}</span>
                  </div>
                )}
                {supplier && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <span>Transporter:</span>
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
                onClick={() => setIsEditVehicleOpen(true)}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                Edit Vehicle
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
              { id: "overview", label: "Overview & Specifications", icon: Building2 },
              { id: "rates", label: "Transport Tariffs", icon: Sparkles, count: rates.length },
              { id: "supplier", label: "Transporter Partner", icon: Car },
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
                <Car className="h-4 w-4 text-indigo-600" />
                <span>Vehicle Fleet Specifications</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passenger Seats</span>
                  <div className="font-bold text-slate-900 text-sm">{vehicle.seatingCapacity} Pax</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Luggage Capacity</span>
                  <div className="font-bold text-slate-900 text-sm">{vehicle.luggageCapacity || 2} Bags</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AC Status</span>
                  <div className="font-bold text-slate-900 text-sm">{vehicle.ac ? "Air Conditioned" : "Non-AC"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Service</span>
                  <div className="font-bold text-slate-900 text-sm">{vehicle.driverIncluded ? "Chauffeur Included" : "Self Drive"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model / Year</span>
                  <div className="font-bold text-slate-900 text-sm">{vehicle.model || "Standard"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Station</span>
                  <div className="font-bold text-slate-900 text-sm">{vehicle.baseLocation || "Kerala"}</div>
                </div>
              </div>

              {vehicle.permitType && (
                <div className="pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Permit Authorization
                  </span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>{vehicle.permitType}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Driver & Fuel Policy Notes
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {vehicle.notes || <span className="text-slate-400 italic">No special notes configured.</span>}
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
                  Transport Rates ({rates.length})
                </h3>
                <p className="text-[11px] text-slate-500">Per Day, Per KM and Transfer pricing structures.</p>
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
                Add Vehicle Rate
              </Button>
            </div>

            {rates.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No rates set for this vehicle"
                description="Add pricing structures like ₹5,500/day with 250 KM included or ₹18/extra KM."
                actionText="Add First Rate"
                onAction={() => setIsAddRateOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Pricing Model</th>
                      <th className="py-3 px-4">Base Rate</th>
                      <th className="py-3 px-4">Included KM</th>
                      <th className="py-3 px-4">Extra KM</th>
                      <th className="py-3 px-4">Driver Allowance</th>
                      <th className="py-3 px-4">Night Halt</th>
                      <th className="py-3 px-4">Toll / Parking</th>
                      <th className="py-3 px-4">Validity</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            {rate.pricingType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          ₹{rate.baseRate.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rate.includedKm ? `${rate.includedKm} KM/day` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rate.extraKmRate ? `₹${rate.extraKmRate}/KM` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rate.driverAllowance ? `₹${rate.driverAllowance}/day` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rate.nightHalt ? `₹${rate.nightHalt}` : "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${rate.tollIncluded ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {rate.tollIncluded ? "Toll Incl." : "Toll Extra"}
                          </span>
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
                                if (confirm("Delete this vehicle rate?")) {
                                  deleteVehicleRate(rate.id)
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
              Transport Partner Information
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fleet Contact</span>
                    <span className="font-semibold text-slate-800">{supplier.contactPerson || "Operations"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispatch Phone</span>
                    <span className="font-semibold text-slate-800">{supplier.phone || "—"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4">In-house self fleet vehicle.</div>
            )}
          </div>
        )}
      </div>

      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-lg p-6">
          <form onSubmit={editVehicleFormik.handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">Edit Vehicle</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Update model name, seating capacity and features for {vehicle.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs mt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Vehicle Name *</label>
                <Input {...editVehicleFormik.getFieldProps("name")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Vehicle Type *</label>
                  <Select
                    value={editVehicleFormik.values.vehicleType}
                    onValueChange={(val) => editVehicleFormik.setFieldValue("vehicleType", val as VehicleType)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Sedan" className="text-xs">Sedan</SelectItem>
                      <SelectItem value="SUV" className="text-xs">SUV</SelectItem>
                      <SelectItem value="MUV" className="text-xs">MUV</SelectItem>
                      <SelectItem value="Tempo Traveller" className="text-xs">Tempo Traveller</SelectItem>
                      <SelectItem value="Mini Bus" className="text-xs">Mini Bus</SelectItem>
                      <SelectItem value="Luxury" className="text-xs">Luxury 4x4</SelectItem>
                      <SelectItem value="Other" className="text-xs">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Seats *</label>
                  <Input type="number" {...editVehicleFormik.getFieldProps("seatingCapacity")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Base Station</label>
                  <Input {...editVehicleFormik.getFieldProps("baseLocation")} className="h-9 text-xs bg-slate-50/50 border-slate-200" />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Status</label>
                  <Select
                    value={editVehicleFormik.values.status}
                    onValueChange={(val) => editVehicleFormik.setFieldValue("status", val as VehicleStatus)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Active" className="text-xs">Active</SelectItem>
                      <SelectItem value="Inactive" className="text-xs">Inactive</SelectItem>
                      <SelectItem value="Archived" className="text-xs">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Notes</label>
                <Textarea {...editVehicleFormik.getFieldProps("notes")} className="min-h-[70px] text-xs bg-slate-50/50 border-slate-200" />
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

      {/* Add / Edit Vehicle Rate Dialog */}
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
                {editingRate ? "Edit Transport Rate" : "Add Transport Rate"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Configure rate calculation model (Per Day / Per KM / Transfer).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Pricing Model *</label>
                  <Select
                    value={rateFormik.values.pricingType}
                    onValueChange={(val) => rateFormik.setFieldValue("pricingType", val as VehiclePricingType)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="PerDay" className="text-xs">Per Day (Daily Hiring)</SelectItem>
                      <SelectItem value="PerKM" className="text-xs">Per KM (Running Distance)</SelectItem>
                      <SelectItem value="PerTransfer" className="text-xs">Per Transfer (Airport Pickup/Drop)</SelectItem>
                      <SelectItem value="PerTrip" className="text-xs">Per Trip / Sightseeing Tour</SelectItem>
                      <SelectItem value="Package" className="text-xs">Fixed Package Tariff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Base Rate (₹) *</label>
                  <Input
                    type="number"
                    {...rateFormik.getFieldProps("baseRate")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Included KM / Day</label>
                  <Input
                    type="number"
                    placeholder="250"
                    {...rateFormik.getFieldProps("includedKm")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Extra KM Rate (₹)</label>
                  <Input
                    type="number"
                    placeholder="25"
                    {...rateFormik.getFieldProps("extraKmRate")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Driver Allowance (₹/Day)</label>
                  <Input
                    type="number"
                    placeholder="500"
                    {...rateFormik.getFieldProps("driverAllowance")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Night Halt (₹)</label>
                  <Input
                    type="number"
                    placeholder="750"
                    {...rateFormik.getFieldProps("nightHalt")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
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
