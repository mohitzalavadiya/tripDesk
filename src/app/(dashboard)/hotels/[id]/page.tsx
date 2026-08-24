"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useFormik } from "formik"
import {
  Hotel,
  BedDouble,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Star,
  Building2,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Phone,
  Mail,
  Globe,
  Tag,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Archive,
  Info,
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
  hotelSchema,
  hotelRoomSchema,
  hotelRateSchema,
} from "@/lib/validation-schemas"
import {
  Hotel as HotelType,
  HotelStatus,
  HotelRoom,
  HotelRate,
  MealPlan,
  RateStatus,
  RateSourceType,
} from "@/types"
import { toast } from "sonner"

export default function HotelProfilePage() {
  const params = useParams()
  const router = useRouter()
  const hotelId = params.id as string

  const {
    hotels,
    suppliers,
    hotelRooms,
    hotelRates,
    rateSheets,
    updateHotel,
    deleteHotel,
    addHotelRoom,
    updateHotelRoom,
    deleteHotelRoom,
    addHotelRate,
    updateHotelRate,
    deleteHotelRate,
  } = useInventory()

  const [activeTab, setActiveTab] = React.useState<"overview" | "rooms" | "rates" | "supplier" | "policies">("overview")

  // Modal States
  const [isEditHotelOpen, setIsEditHotelOpen] = React.useState(false)
  const [isAddRoomOpen, setIsAddRoomOpen] = React.useState(false)
  const [editingRoom, setEditingRoom] = React.useState<HotelRoom | null>(null)
  const [isAddRateOpen, setIsAddRateOpen] = React.useState(false)
  const [editingRate, setEditingRate] = React.useState<HotelRate | null>(null)

  const hotel = hotels.find((h) => h.id === hotelId)
  const supplier = hotel?.supplierId ? suppliers.find((s) => s.id === hotel.supplierId) : null
  const rooms = hotelRooms.filter((r) => r.hotelId === hotelId)
  const rates = hotelRates.filter((r) => r.hotelId === hotelId)

  // ─── Edit Hotel Formik ────────────────────────────────────────────────
  const editHotelFormik = useFormik({
    initialValues: {
      name: hotel?.name || "",
      destination: hotel?.destination || "",
      supplierId: hotel?.supplierId || "",
      area: hotel?.area || "",
      address: hotel?.address || "",
      starCategory: hotel?.starCategory || 3,
      contactPerson: hotel?.contactPerson || "",
      phone: hotel?.phone || "",
      email: hotel?.email || "",
      website: hotel?.website || "",
      checkInTime: hotel?.checkInTime || "14:00",
      checkOutTime: hotel?.checkOutTime || "11:00",
      description: hotel?.description || "",
      status: (hotel?.status || "Active") as HotelStatus,
      notes: hotel?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: hotelSchema,
    onSubmit: (values) => {
      if (!hotel) return
      updateHotel(hotel.id, {
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
        description: values.description.trim() || undefined,
        status: values.status,
        notes: values.notes.trim() || undefined,
      })
      toast.success("Hotel updated successfully.")
      setIsEditHotelOpen(false)
    },
  })

  // ─── Room Formik (Add / Edit) ─────────────────────────────────────────
  const roomFormik = useFormik({
    initialValues: {
      name: editingRoom?.name || "",
      maxAdults: editingRoom?.maxAdults || 2,
      maxChildren: editingRoom?.maxChildren || 1,
      bedType: editingRoom?.bedType || "King Bed",
      description: editingRoom?.description || "",
      status: (editingRoom?.status || "Active") as "Active" | "Inactive",
    },
    enableReinitialize: true,
    validationSchema: hotelRoomSchema,
    onSubmit: (values) => {
      if (!hotel) return
      if (editingRoom) {
        updateHotelRoom(editingRoom.id, {
          name: values.name.trim(),
          maxAdults: values.maxAdults,
          maxChildren: values.maxChildren,
          bedType: values.bedType.trim() || undefined,
          description: values.description.trim() || undefined,
          status: values.status,
        })
        toast.success("Room category updated.")
        setEditingRoom(null)
      } else {
        addHotelRoom({
          hotelId: hotel.id,
          name: values.name.trim(),
          maxAdults: values.maxAdults,
          maxChildren: values.maxChildren,
          bedType: values.bedType.trim() || undefined,
          description: values.description.trim() || undefined,
          status: values.status,
        })
        toast.success("Room category added.")
        setIsAddRoomOpen(false)
      }
      roomFormik.resetForm()
    },
  })

  // ─── Rate Formik (Add / Edit) ─────────────────────────────────────────
  const rateFormik = useFormik({
    initialValues: {
      roomId: editingRate?.roomId || (rooms[0]?.id || ""),
      rateSheetId: editingRate?.rateSheetId || "",
      mealPlan: (editingRate?.mealPlan || "CPAI") as MealPlan,
      currency: editingRate?.currency || "INR",
      baseRate: editingRate?.baseRate || 5000,
      occupancyAdults: editingRate?.occupancyAdults || 2,
      occupancyChildren: editingRate?.occupancyChildren || 0,
      extraAdultRate: editingRate?.extraAdultRate || 0,
      childRate: editingRate?.childRate || 0,
      validFrom: editingRate?.validFrom || "2026-10-01",
      validTo: editingRate?.validTo || "2027-03-31",
      status: (editingRate?.status || "Active") as RateStatus,
      notes: editingRate?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: hotelRateSchema,
    onSubmit: (values) => {
      if (!hotel) return
      if (editingRate) {
        updateHotelRate(editingRate.id, {
          roomId: values.roomId,
          rateSheetId: values.rateSheetId || undefined,
          mealPlan: values.mealPlan,
          currency: values.currency,
          baseRate: Number(values.baseRate),
          occupancyAdults: Number(values.occupancyAdults),
          occupancyChildren: Number(values.occupancyChildren),
          extraAdultRate: Number(values.extraAdultRate),
          childRate: Number(values.childRate),
          validFrom: values.validFrom,
          validTo: values.validTo,
          status: values.status,
          notes: values.notes.trim() || undefined,
        })
        toast.success("Hotel rate updated.")
        setEditingRate(null)
      } else {
        addHotelRate({
          hotelId: hotel.id,
          roomId: values.roomId,
          rateSheetId: values.rateSheetId || undefined,
          mealPlan: values.mealPlan,
          currency: values.currency,
          baseRate: Number(values.baseRate),
          occupancyAdults: Number(values.occupancyAdults),
          occupancyChildren: Number(values.occupancyChildren),
          extraAdultRate: Number(values.extraAdultRate),
          childRate: Number(values.childRate),
          validFrom: values.validFrom,
          validTo: values.validTo,
          status: values.status,
          sourceType: "Manual",
          notes: values.notes.trim() || undefined,
        })
        toast.success("Hotel rate added.")
        setIsAddRateOpen(false)
      }
      rateFormik.resetForm()
    },
  })

  if (!hotel) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
        <PageHeader
          title="Hotel Not Found"
          breadcrumbs={[{ label: "Hotels", href: "/hotels" }, { label: "Not Found" }]}
        />
        <div className="px-4 py-8 md:px-8 max-w-lg">
          <EmptyState
            icon={Hotel}
            title="Hotel Record Not Found"
            description="The requested hotel ID does not exist or has been removed."
            actionText="Back to Hotels"
            onAction={() => router.push("/hotels")}
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
                  href="/hotels"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Hotel className="h-3 w-3 text-indigo-500" />
                  Hotel Inventory
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {hotel.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    hotel.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${hotel.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {hotel.status}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {hotel.name}
                </h1>
                {hotel.starCategory && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span>{hotel.starCategory} Star Property</span>
                  </div>
                )}
              </div>

              {/* Micro-Telemetry Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                  <MapPin className="h-3 w-3 text-indigo-500" />
                  <span className="font-bold text-slate-900">{hotel.destination}</span>
                  {hotel.area && <span className="text-slate-400">({hotel.area})</span>}
                </div>
                {supplier && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <span>Partner:</span>
                    <Link href={`/suppliers/${supplier.id}`} className="font-bold text-indigo-600 hover:underline">
                      {supplier.name}
                    </Link>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                  <BedDouble className="h-3 w-3 text-blue-600" />
                  <span className="font-bold text-blue-950">{rooms.length}</span> Room Categories
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span className="font-bold text-emerald-950">{rates.length}</span> Loaded Rates
                </div>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2.5 z-10 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditHotelOpen(true)}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                Edit Hotel
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAddRateOpen(true)}
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
              { id: "overview", label: "Overview & Facilities", icon: Building2 },
              { id: "rooms", label: "Room Categories", icon: BedDouble, count: rooms.length },
              { id: "rates", label: "Seasonal Rates", icon: Sparkles, count: rates.length },
              { id: "supplier", label: "Contract Partner", icon: Tag },
              { id: "policies", label: "Policies & Terms", icon: Clock },
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
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-2">
              {/* Hotel Overview */}
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>Property Details</span>
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {hotel.description || <span className="text-slate-400 italic">No description added.</span>}
                </p>

                {/* Timings & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Check-in / Check-out
                    </span>
                    <div className="font-semibold text-slate-800">
                      In: <span className="font-mono text-indigo-600">{hotel.checkInTime || "14:00"}</span> | Out:{" "}
                      <span className="font-mono text-indigo-600">{hotel.checkOutTime || "11:00"}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Postal Address
                    </span>
                    <div className="font-semibold text-slate-800">
                      {hotel.address || `${hotel.destination}, India`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Featured Amenities
                </h3>
                {hotel.amenities && hotel.amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hotel.amenities.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{a}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No amenities specified.</p>
                )}
              </div>
            </div>

            {/* Sidebar Contact Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  Frontdesk Contacts
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Manager</span>
                    <span className="font-semibold text-slate-800">{hotel.contactPerson || "Front Office"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct Phone</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {hotel.phone || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {hotel.email || "—"}
                    </span>
                  </div>
                  {hotel.website && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Website</span>
                      <a href={hotel.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{hotel.website}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rooms */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Configured Room Categories ({rooms.length})
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingRoom(null)
                  setIsAddRoomOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Room Category
              </Button>
            </div>

            {rooms.length === 0 ? (
              <EmptyState
                icon={BedDouble}
                title="No room categories defined"
                description="Add room categories (e.g. Deluxe Room, Pool Villa, Suite) to attach seasonal rates."
                actionText="Add First Room"
                onAction={() => setIsAddRoomOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const roomRates = rates.filter((r) => r.roomId === room.id && r.status === "Active")
                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{room.name}</h4>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{room.id}</p>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              room.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {room.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 pt-1 font-medium">
                          <span>{room.maxAdults} Adults</span>
                          <span>•</span>
                          <span>{room.maxChildren} Children</span>
                          {room.bedType && (
                            <>
                              <span>•</span>
                              <span>{room.bedType}</span>
                            </>
                          )}
                        </div>

                        {room.description && (
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {room.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600">
                          {roomRates.length} {roomRates.length === 1 ? "Rate" : "Rates"} Active
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRoom(room)
                              setIsAddRoomOpen(true)
                            }}
                            className="h-7 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 cursor-pointer"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${room.name}"?`)) {
                                deleteHotelRoom(room.id)
                                toast.success("Room category deleted.")
                              }
                            }}
                            className="h-7 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 cursor-pointer"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Rates */}
        {activeTab === "rates" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  B2B Net Contract Rates ({rates.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Direct net tariffs by room category, meal plan and validity dates.
                </p>
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
                Add Rate
              </Button>
            </div>

            {rates.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No rates configured"
                description="Add seasonal B2B contract rates with meal plans (RO, CPAI, MAPAI, APAI) and validity ranges."
                actionText="Add First Rate"
                onAction={() => setIsAddRateOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider select-none">
                      <tr>
                        <th className="py-3 px-4">Room Type</th>
                        <th className="py-3 px-4">Meal Plan</th>
                        <th className="py-3 px-4">Base Rate (Net)</th>
                        <th className="py-3 px-4">Occupancy</th>
                        <th className="py-3 px-4">Extra Adult / Child</th>
                        <th className="py-3 px-4">Validity Range</th>
                        <th className="py-3 px-4">Rate Sheet / Source</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {rates.map((rate) => {
                        const room = rooms.find((r) => r.id === rate.roomId)
                        const rateSheet = rateSheets.find((rs) => rs.id === rate.rateSheetId)
                        const isExpired = new Date(rate.validTo) < new Date()

                        return (
                          <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Room */}
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900">{room?.name || rate.roomId}</span>
                            </td>

                            {/* Meal Plan */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {rate.mealPlan}
                              </span>
                            </td>

                            {/* Base Rate */}
                            <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                              ₹{rate.baseRate.toLocaleString("en-IN")}
                              <span className="text-[10px] text-slate-400 font-normal block">/ room / night</span>
                            </td>

                            {/* Occupancy */}
                            <td className="py-3.5 px-4 text-slate-600">
                              <span>{rate.occupancyAdults} Adults</span>
                              {rate.occupancyChildren ? <span> + {rate.occupancyChildren} Child</span> : ""}
                            </td>

                            {/* Extra Adult / Child */}
                            <td className="py-3.5 px-4 text-slate-600">
                              <div>Adult: {rate.extraAdultRate ? `₹${rate.extraAdultRate}` : "—"}</div>
                              <div className="text-[11px] text-slate-400">Child: {rate.childRate ? `₹${rate.childRate}` : "—"}</div>
                            </td>

                            {/* Validity */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                              <div>{formatDate(rate.validFrom)} → {formatDate(rate.validTo)}</div>
                              {isExpired && (
                                <span className="text-[10px] font-bold text-amber-600 font-sans">
                                  Expired contract
                                </span>
                              )}
                            </td>

                            {/* Rate Sheet / Source */}
                            <td className="py-3.5 px-4">
                              {rateSheet ? (
                                <Link
                                  href={`/rate-sheets/${rateSheet.id}`}
                                  className="text-indigo-600 hover:underline font-semibold block text-[11px]"
                                >
                                  {rateSheet.name}
                                </Link>
                              ) : (
                                <span className="text-slate-400 italic">Direct Tariff</span>
                              )}
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 mt-0.5">
                                {rate.sourceType || "Manual"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rate.status === "Active" && !isExpired
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {isExpired ? "Expired" : rate.status}
                              </span>
                            </td>

                            {/* Actions */}
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
                                    if (confirm("Archive this rate?")) {
                                      updateHotelRate(rate.id, { status: "Archived" })
                                      toast.success("Rate archived.")
                                    }
                                  }}
                                  className="h-7 text-xs font-semibold text-slate-400 hover:text-amber-600 px-2 cursor-pointer"
                                  title="Archive Rate"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Supplier Partner */}
        {activeTab === "supplier" && (
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs max-w-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Contracted Supplier Partnership
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Contact</span>
                    <span className="font-semibold text-slate-800">{supplier.contactPerson || "Commercial Team"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone</span>
                    <span className="font-semibold text-slate-800">{supplier.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                    <span className="font-semibold text-slate-800">{supplier.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                    <span className="font-semibold text-emerald-600">{supplier.status}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4">
                This property is managed directly without a third-party DMC/Wholesaler supplier.
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Policies */}
        {activeTab === "policies" && (
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs max-w-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Policies, Inclusions & Cutoffs
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {hotel.notes || <span className="text-slate-400 italic">No special policies recorded for this property.</span>}
            </p>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Room Dialog ────────────────────────────────────── */}
      <Dialog
        open={isAddRoomOpen}
        onOpenChange={(open) => {
          setIsAddRoomOpen(open)
          if (!open) setEditingRoom(null)
        }}
      >
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-md p-6">
          <form onSubmit={roomFormik.handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">
                {editingRoom ? "Edit Room Category" : "Add Room Category"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Define room category, bed configuration and maximum occupancy limits.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs mt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Room Category Name *</label>
                <Input
                  placeholder="e.g. Deluxe Room, Lake View Cottage..."
                  {...roomFormik.getFieldProps("name")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Max Adults *</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    {...roomFormik.getFieldProps("maxAdults")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Max Children</label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    {...roomFormik.getFieldProps("maxChildren")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Bed Type</label>
                <Input
                  placeholder="e.g. King Bed, Twin Beds, Four Poster Bed..."
                  {...roomFormik.getFieldProps("bedType")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Room Description</label>
                <Textarea
                  placeholder="Balcony view, square footage, bathroom features..."
                  {...roomFormik.getFieldProps("description")}
                  className="min-h-[70px] text-xs bg-slate-50/50 border-slate-200"
                />
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
                {editingRoom ? "Save Changes" : "Add Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Add / Edit Rate Dialog ────────────────────────────────────── */}
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
                {editingRate ? "Edit B2B Hotel Rate" : "Add B2B Hotel Rate"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Specify room category, meal plan, net base rate, extra person costs and validity dates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Room Category *</label>
                  <Select
                    value={rateFormik.values.roomId}
                    onValueChange={(val) => rateFormik.setFieldValue("roomId", val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select Room" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Meal Plan *</label>
                  <Select
                    value={rateFormik.values.mealPlan}
                    onValueChange={(val) => rateFormik.setFieldValue("mealPlan", val as MealPlan)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="RO" className="text-xs">RO (Room Only)</SelectItem>
                      <SelectItem value="CPAI" className="text-xs">CPAI (Room + Breakfast)</SelectItem>
                      <SelectItem value="MAPAI" className="text-xs">MAPAI (Room + Breakfast + Dinner)</SelectItem>
                      <SelectItem value="APAI" className="text-xs">APAI (Room + All Meals)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Base Rate (₹) *</label>
                  <Input
                    type="number"
                    placeholder="5500"
                    {...rateFormik.getFieldProps("baseRate")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Extra Adult (₹)</label>
                  <Input
                    type="number"
                    placeholder="1500"
                    {...rateFormik.getFieldProps("extraAdultRate")}
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
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Valid From *</label>
                  <Input
                    type="date"
                    {...rateFormik.getFieldProps("validFrom")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Valid To *</label>
                  <Input
                    type="date"
                    {...rateFormik.getFieldProps("validTo")}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Link Rate Sheet</label>
                  <Select
                    value={rateFormik.values.rateSheetId || "none"}
                    onValueChange={(val) => rateFormik.setFieldValue("rateSheetId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Direct / Standalone" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="none" className="text-xs">None (Standalone Rate)</SelectItem>
                      {rateSheets.map((rs) => (
                        <SelectItem key={rs.id} value={rs.id} className="text-xs">
                          {rs.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="Archived" className="text-xs">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Rate Notes / Blackout Rules</label>
                <Input
                  placeholder="e.g. Mandatory gala dinner supplement on New Year's Eve..."
                  {...rateFormik.getFieldProps("notes")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
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
