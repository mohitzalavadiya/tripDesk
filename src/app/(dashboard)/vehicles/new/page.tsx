"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFormik } from "formik"
import { Car, Plus, ArrowLeft, Users, ShieldCheck, Check } from "lucide-react"
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
import { vehicleSchema } from "@/lib/validation-schemas"
import { VehicleType, VehicleStatus } from "@/types"
import { toast } from "sonner"

function NewVehicleForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedSupplier = searchParams.get("supplierId") || ""
  const { addVehicle, suppliers } = useInventory()

  const formik = useFormik({
    initialValues: {
      name: "",
      vehicleType: "SUV" as VehicleType,
      seatingCapacity: 6,
      luggageCapacity: 4,
      supplierId: preselectedSupplier,
      baseLocation: "Kochi",
      ac: true,
      driverIncluded: true,
      model: "2024 Model",
      permitType: "All India Tourist Permit",
      status: "Active" as VehicleStatus,
      notes: "",
    },
    validationSchema: vehicleSchema,
    onSubmit: (values) => {
      const newVeh = addVehicle({
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

      toast.success("Vehicle created successfully.")
      router.push(`/vehicles/${newVeh.id}`)
    },
  })

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-w-3xl">
      {/* Basic Specs Card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <Car className="h-4 w-4 text-indigo-600" />
          <span>Vehicle Specifications</span>
        </h3>

        {/* Vehicle Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Vehicle Name / Model Display <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Force Urbania (17-Seater), Toyota Innova Crysta, Ertiga MUV..."
            {...formik.getFieldProps("name")}
            className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 ${
              getFieldError("name") ? "border-red-500" : ""
            }`}
          />
          {getFieldError("name") && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
          )}
        </div>

        {/* Vehicle Type & Seating */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <Select
              value={formik.values.vehicleType}
              onValueChange={(val) => formik.setFieldValue("vehicleType", val as VehicleType)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="Sedan" className="text-xs">Sedan (Dzire / Etios)</SelectItem>
                <SelectItem value="SUV" className="text-xs">SUV (Innova / Scorpio)</SelectItem>
                <SelectItem value="MUV" className="text-xs">MUV (Ertiga / Carens)</SelectItem>
                <SelectItem value="Tempo Traveller" className="text-xs">Tempo Traveller / Urbania</SelectItem>
                <SelectItem value="Mini Bus" className="text-xs">Mini Bus (20-26 Seats)</SelectItem>
                <SelectItem value="Bus" className="text-xs">Large Coach Bus (35-45 Seats)</SelectItem>
                <SelectItem value="Luxury" className="text-xs">Luxury 4x4 / Fortuner</SelectItem>
                <SelectItem value="Other" className="text-xs">Other / Special Vehicle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Passenger Seats <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              {...formik.getFieldProps("seatingCapacity")}
              className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 ${
                getFieldError("seatingCapacity") ? "border-red-500" : ""
              }`}
            />
            {getFieldError("seatingCapacity") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("seatingCapacity")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Luggage Capacity (Bags)</label>
            <Input
              type="number"
              min={0}
              max={50}
              {...formik.getFieldProps("luggageCapacity")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        {/* Supplier & Base Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Transport Supplier Partner</label>
            <Select
              value={formik.values.supplierId || "none"}
              onValueChange={(val) => formik.setFieldValue("supplierId", val === "none" ? "" : val)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Select Transport Vendor" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="none" className="text-xs">Self Fleet (In-house Cabs)</SelectItem>
                {suppliers
                  .filter((s) => s.services.includes("Vehicle"))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.city || s.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Base Station / Garage City</label>
            <Input
              placeholder="e.g. Kochi Airport, Goa, Srinagar, Jaipur..."
              {...formik.getFieldProps("baseLocation")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        {/* Features Toggle Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Air Conditioning (AC)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => formik.setFieldValue("ac", true)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  formik.values.ac
                    ? "bg-blue-50 border-blue-500 text-blue-800 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                AC Fitted
              </button>
              <button
                type="button"
                onClick={() => formik.setFieldValue("ac", false)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  !formik.values.ac
                    ? "bg-amber-50 border-amber-500 text-amber-800 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Non-AC
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Driver Provision</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => formik.setFieldValue("driverIncluded", true)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  formik.values.driverIncluded
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Chauffeur Driven
              </button>
              <button
                type="button"
                onClick={() => formik.setFieldValue("driverIncluded", false)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  !formik.values.driverIncluded
                    ? "bg-amber-50 border-amber-500 text-amber-800 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Self-Drive Rental
              </button>
            </div>
          </div>
        </div>

        {/* Model and Permit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Model Year / Generation</label>
            <Input
              placeholder="e.g. 2025 Luxury Cruiser, 2024 Crysta GX..."
              {...formik.getFieldProps("model")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Permit Authorization</label>
            <Input
              placeholder="e.g. All India Tourist Permit, Kerala & Tamil Nadu..."
              {...formik.getFieldProps("permitType")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-700">Transport Notes & Policies</label>
          <Textarea
            placeholder="Driver allowance rules, night halt charges, luggage restrictions..."
            {...formik.getFieldProps("notes")}
            className="min-h-[80px] text-xs bg-slate-50/50 border-slate-200 leading-relaxed"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/vehicles")}
          className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-4 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-6 cursor-pointer shadow-xs"
        >
          Save Vehicle
        </Button>
      </div>
    </form>
  )
}

export default function NewVehiclePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="Add New Vehicle"
          description="Register a fleet vehicle or transport model to your B2B transport inventory."
          breadcrumbs={[
            { label: "Vehicles", href: "/vehicles" },
            { label: "New Vehicle" },
          ]}
        />

        <div className="max-w-3xl mx-auto w-full">
          <React.Suspense fallback={<div className="text-xs text-slate-400">Loading form...</div>}>
            <NewVehicleForm />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
