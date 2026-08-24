"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFormik } from "formik"
import { Hotel, Plus, ArrowLeft, Star, Check } from "lucide-react"
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
import { hotelSchema } from "@/lib/validation-schemas"
import { HotelStatus } from "@/types"
import { toast } from "sonner"

const POPULAR_AMENITIES = [
  "Free WiFi",
  "Swimming Pool",
  "Spa & Wellness",
  "Mountain View",
  "Ocean View",
  "Multi-cuisine Restaurant",
  "Fitness Center / Gym",
  "Kids Play Area",
  "Private Beach Access",
  "Ayurvedic Center",
  "Campfire / Bonfire",
  "24/7 Room Service",
  "Airport Shuttle",
  "Tea Plantation Walk",
]

function NewHotelForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedSupplier = searchParams.get("supplierId") || ""
  const { addHotel, suppliers } = useInventory()

  const formik = useFormik({
    initialValues: {
      name: "",
      destination: "",
      supplierId: preselectedSupplier,
      area: "",
      address: "",
      starCategory: 4,
      contactPerson: "",
      phone: "",
      email: "",
      website: "",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      amenities: ["Free WiFi", "Multi-cuisine Restaurant"],
      description: "",
      status: "Active" as HotelStatus,
      notes: "",
    },
    validationSchema: hotelSchema,
    onSubmit: (values) => {
      const newHotel = addHotel({
        name: values.name.trim(),
        destination: values.destination.trim(),
        supplierId: values.supplierId || undefined,
        area: values.area.trim() || undefined,
        address: values.address.trim() || undefined,
        starCategory: Number(values.starCategory),
        contactPerson: values.contactPerson.trim() || undefined,
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        website: values.website.trim() || undefined,
        checkInTime: values.checkInTime || "14:00",
        checkOutTime: values.checkOutTime || "11:00",
        amenities: values.amenities,
        description: values.description.trim() || undefined,
        status: values.status,
        notes: values.notes.trim() || undefined,
      })

      toast.success("Hotel created successfully.")
      router.push(`/hotels/${newHotel.id}`)
    },
  })

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  const toggleAmenity = (amenity: string) => {
    const current = [...formik.values.amenities]
    const index = current.indexOf(amenity)
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(amenity)
    }
    formik.setFieldValue("amenities", current)
  }

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-w-3xl">
      {/* Property Details Card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
          <Hotel className="h-4 w-4 text-indigo-600" />
          <span>Property Information</span>
        </h3>

        {/* Hotel Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Hotel / Resort Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Parakkat Nature Resort, Munnar Valley Retreat..."
            {...formik.getFieldProps("name")}
            className={`h-9.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 ${
              getFieldError("name") ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
          />
          {getFieldError("name") && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
          )}
        </div>

        {/* Destination & Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Destination City / Region <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Munnar, Alleppey, Goa, Jaipur, Srinagar..."
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
            <label className="text-xs font-bold text-slate-700">Locality / Sector Area</label>
            <Input
              placeholder="e.g. Pallivasal, North Cliff, Candolim..."
              {...formik.getFieldProps("area")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        {/* Supplier & Star Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Supplier Relationship</label>
            <Select
              value={formik.values.supplierId || "none"}
              onValueChange={(val) => formik.setFieldValue("supplierId", val === "none" ? "" : val)}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Select Supplier Partner" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="none" className="text-xs">Direct Property (No Supplier DMC)</SelectItem>
                {suppliers
                  .filter((s) => s.services.includes("Hotel"))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.city || s.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Star Rating</label>
            <Select
              value={String(formik.values.starCategory)}
              onValueChange={(val) => formik.setFieldValue("starCategory", parseInt(val || "3"))}
            >
              <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="5" className="text-xs">5 Star Luxury</SelectItem>
                <SelectItem value="4" className="text-xs">4 Star Premium</SelectItem>
                <SelectItem value="3" className="text-xs">3 Star Deluxe</SelectItem>
                <SelectItem value="2" className="text-xs">2 Star Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Full Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Full Postal Address</label>
          <Input
            placeholder="Street address, landmark, PIN code..."
            {...formik.getFieldProps("address")}
            className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Property Overview</label>
          <Textarea
            placeholder="Key selling points, view highlights, architecture style..."
            {...formik.getFieldProps("description")}
            className="min-h-[80px] text-xs bg-slate-50/50 border-slate-200 leading-relaxed"
          />
        </div>
      </div>

      {/* Amenities Card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
          Hotel Amenities & Facilities
        </h3>
        <p className="text-[11px] text-slate-500">Toggle all available amenities featured at this property.</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {POPULAR_AMENITIES.map((amenity) => {
            const isSelected = formik.values.amenities.includes(amenity)
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                <span>{amenity}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Frontdesk & Timing Card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
          Operations & Reservation Contacts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Check-in Standard Time</label>
            <Input
              placeholder="e.g. 14:00"
              {...formik.getFieldProps("checkInTime")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Check-out Standard Time</label>
            <Input
              placeholder="e.g. 11:00"
              {...formik.getFieldProps("checkOutTime")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Contact / Manager Name</label>
            <Input
              placeholder="e.g. Mathew Varghese"
              {...formik.getFieldProps("contactPerson")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reservation Phone</label>
            <Input
              placeholder="e.g. +91 4865 263000"
              {...formik.getFieldProps("phone")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reservation Email</label>
            <Input
              type="email"
              placeholder="e.g. reservations@hotel.com"
              {...formik.getFieldProps("email")}
              className="h-9.5 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-700">Contract Notes & Policies</label>
          <Textarea
            placeholder="Special B2B inclusions (e.g. complimentary high tea, driver accommodation policy)..."
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
          onClick={() => router.push("/hotels")}
          className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-4 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-6 cursor-pointer shadow-xs"
        >
          Save Hotel
        </Button>
      </div>
    </form>
  )
}

export default function NewHotelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <PageHeader
          title="Add New Hotel"
          description="Register a new hotel or resort property to your B2B inventory."
          breadcrumbs={[
            { label: "Hotels", href: "/hotels" },
            { label: "New Hotel" },
          ]}
        />

        <div className="max-w-3xl mx-auto w-full">
          <React.Suspense fallback={<div className="text-xs text-slate-400">Loading form...</div>}>
            <NewHotelForm />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
