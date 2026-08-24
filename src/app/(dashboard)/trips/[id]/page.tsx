"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useFormik } from "formik"
import Link from "next/link"
import { useEnquiry } from "@/context/enquiry-context"
import { useInventory } from "@/context/inventory-context"
import { useCosting } from "@/context/costing-context"
import { CostingSummaryCards } from "@/components/costing/costing-summary-cards"
import { CostBreakdownTable } from "@/components/costing/cost-breakdown-table"
import { PricingControlPanel } from "@/components/costing/pricing-control-panel"
import { AddManualCostModal } from "@/components/costing/add-manual-cost-modal"
import { AddInternalExpenseModal } from "@/components/costing/add-internal-expense-modal"
import { LockCostingModal } from "@/components/costing/lock-costing-modal"
import { RateChangeModal } from "@/components/costing/rate-change-modal"
import { useQuotation } from "@/context/quotation-context"
import { QuotationShareModal } from "@/components/quotation/quotation-share-modal"
import { QuotationVersionModal } from "@/components/quotation/quotation-version-modal"
import { QuotationChangeAlert } from "@/components/quotation/quotation-change-alert"
import { detectQuotationChanges } from "@/lib/quotation/compare-quotation"
import { exportQuotationPDF } from "@/lib/quotation/pdf-service"
import { formatCurrency } from "@/lib/costing-engine"
import { CostItem, InternalExpense, TripStatus, ItineraryDay, MealPlan, Quotation } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getTripStatusBadgeColor } from "../page"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Compass,
  Calendar,
  Info,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  PlusCircle,
  X,
  ExternalLink,
  Hotel,
  Car,
  Ticket,
  FileText,
  MapPin,
  BedDouble,
  Sparkles,
  Users,
  ShieldCheck,
  DollarSign,
  Receipt,
  Layers,
  Percent,
  Share2,
  Download,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import { tripEditSchema, itineraryDaySchema, itineraryPlaceSchema, noteSchema } from "@/lib/validation-schemas"

export default function TripDetailPage() {
  const params = useParams()
  const id = params.id as string

  const {
    trips,
    customers,
    enquiries,
    activities: timelineActivities,
    itineraryDays,
    tripNotes,
    updateTrip,
    updateTripStatus,
    addTripNote,
    deleteTripNote,
    addItineraryDay,
    updateItineraryDay,
    deleteItineraryDay,
    reorderItineraryDays,
    addItineraryPlace,
    removeItineraryPlace,
  } = useEnquiry()

  const {
    hotels,
    hotelRooms,
    hotelRates,
    vehicles,
    vehicleRates,
    activities: invActivities,
    activityRates,
    tripHotels,
    tripVehicles,
    tripActivities: invTripActivities,
    addTripHotel,
    removeTripHotel,
    addTripVehicle,
    removeTripVehicle,
    addTripActivity,
    removeTripActivity,
    suppliers,
  } = useInventory()

  const trip = trips.find((t) => t.id === id)
  const customer = trip ? customers.find((c) => c.id === trip.customerId) : undefined
  const enquiry = trip?.enquiryId ? enquiries.find((e) => e.id === trip.enquiryId) : undefined

  // Filter trip services
  const thisTripHotels = tripHotels.filter((th) => th.tripId === id)
  const thisTripVehicles = tripVehicles.filter((tv) => tv.tripId === id)
  const thisTripActivities = invTripActivities.filter((ta) => ta.tripId === id)

  // Costing Engine Context Hook
  const {
    taxRules,
    getCostingForTrip,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    addInternalExpense,
    updateInternalExpense,
    deleteInternalExpense,
    updatePricingSettings,
    lockCosting,
    unlockCosting,
    recalculateTripCosting,
    syncInventoryServicesToCosting,
    refreshRateSnapshot,
  } = useCosting()

  // Active Tab state
  const [activeTab, setActiveTab] = React.useState<
    | "overview"
    | "itinerary"
    | "hotels"
    | "vehicles"
    | "activities"
    | "costing"
    | "quotation"
    | "documents"
    | "timeline"
  >("overview")

  // Quotation Context Hooks & Modals
  const {
    getQuotationsForTrip,
    createQuotationFromTrip,
    createQuotationVersion,
    markQuotationSent,
    deleteQuotation,
  } = useQuotation()

  const tripQuotations = trip ? getQuotationsForTrip(trip.id) : []
  const activeQuotation = tripQuotations[0]

  const [isQuotationShareModalOpen, setIsQuotationShareModalOpen] = React.useState(false)
  const [isQuotationVersionModalOpen, setIsQuotationVersionModalOpen] = React.useState(false)
  const [selectedQuotationForAction, setSelectedQuotationForAction] = React.useState<Quotation | null>(null)

  // Costing Modal States
  const [isAddManualCostOpen, setIsAddManualCostOpen] = React.useState(false)
  const [editingCostItem, setEditingCostItem] = React.useState<CostItem | null>(null)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false)
  const [editingExpense, setEditingExpense] = React.useState<InternalExpense | null>(null)
  const [isLockModalOpen, setIsLockModalOpen] = React.useState(false)
  const [lockActionType, setLockActionType] = React.useState<"lock" | "unlock">("lock")
  const [rateChangeItem, setRateChangeItem] = React.useState<CostItem | null>(null)
  const [isRateChangeModalOpen, setIsRateChangeModalOpen] = React.useState(false)

  // Edit Trip states
  const [isEditOpen, setIsEditOpen] = React.useState(false)

  // Trip Note states
  const [newNoteContent, setNewNoteContent] = React.useState("")
  const [noteErrors, setNoteErrors] = React.useState<Record<string, string>>({})
  const [dayErrors, setDayErrors] = React.useState<Record<string, string>>({})
  const [placeErrors, setPlaceErrors] = React.useState<Record<string, string>>({})

  // Service modal states (declared at top level to satisfy Rules of Hooks)
  const [isAddHotelToTripOpen, setIsAddHotelToTripOpen] = React.useState(false)
  const [selectedHotelId, setSelectedHotelId] = React.useState("")
  const [selectedRoomId, setSelectedRoomId] = React.useState("")
  const [selectedMealPlan, setSelectedMealPlan] = React.useState<MealPlan>("CPAI")
  const [hotelCheckIn, setHotelCheckIn] = React.useState(trip?.startDate || "")
  const [hotelCheckOut, setHotelCheckOut] = React.useState(trip?.endDate || "")
  const [hotelRoomsCount, setHotelRoomsCount] = React.useState(1)
  const [hotelAdultsCount, setHotelAdultsCount] = React.useState(trip?.adults || 2)
  const [hotelChildrenCount, setHotelChildrenCount] = React.useState(trip?.children || 0)
  const [hotelBookingNotes, setHotelBookingNotes] = React.useState("")

  const [isAddVehicleToTripOpen, setIsAddVehicleToTripOpen] = React.useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = React.useState("")
  const [selectedVehicleRateId, setSelectedVehicleRateId] = React.useState("")
  const [vehicleStartDate, setVehicleStartDate] = React.useState(trip?.startDate || "")
  const [vehicleEndDate, setVehicleEndDate] = React.useState(trip?.endDate || "")
  const [vehicleBookingNotes, setVehicleBookingNotes] = React.useState("")

  const [isAddActivityToTripOpen, setIsAddActivityToTripOpen] = React.useState(false)
  const [selectedActivityId, setSelectedActivityId] = React.useState("")
  const [selectedActivityRateId, setSelectedActivityRateId] = React.useState("")
  const [activityDate, setActivityDate] = React.useState(trip?.startDate || "")
  const [activityAdultsCount, setActivityAdultsCount] = React.useState(trip?.adults || 2)
  const [activityChildrenCount, setActivityChildrenCount] = React.useState(trip?.children || 0)
  const [activityBookingNotes, setActivityBookingNotes] = React.useState("")

  // Retrieve Live Costing Data for this trip
  const tripCostingData = trip ? getCostingForTrip(trip.id) : null

  // Auto-sync Phase 4 selected inventory to Costing items
  React.useEffect(() => {
    if (trip && tripCostingData && tripCostingData.costing.status !== "Locked") {
      syncInventoryServicesToCosting(
        trip.id,
        {
          hotels: thisTripHotels,
          vehicles: thisTripVehicles,
          activities: thisTripActivities,
        },
        {
          hotelRates,
          vehicleRates,
          activityRates,
        }
      )
    }
  }, [trip?.id, thisTripHotels.length, thisTripVehicles.length, thisTripActivities.length])

  // Formik for Edit Trip Properties dialog
  const editTripFormik = useFormik({
    initialValues: {
      tripName: "",
      destination: "",
      startDate: "",
      endDate: "",
      adults: 2,
      children: 0,
      infants: 0,
      budget: "",
      status: "Planning" as string,
      notes: "",
    },
    validationSchema: tripEditSchema,
    enableReinitialize: false,
    onSubmit: (values) => {
      if (!trip) return
      const trimmedTripName = values.tripName.trim()
      const trimmedDestination = values.destination.trim()
      const parsedBudget = values.budget ? parseFloat(values.budget) : undefined

      updateTrip(trip.id, {
        name: trimmedTripName || `${trimmedDestination} Holiday`,
        destination: trimmedDestination,
        startDate: values.startDate,
        endDate: values.endDate,
        adults: values.adults,
        children: values.children,
        infants: values.infants,
        budget: parsedBudget,
        status: values.status as TripStatus,
        notes: values.notes.trim() || undefined,
      })

      toast.success("Trip updated successfully.")
      setIsEditOpen(false)
    },
  })

  // Helper for edit trip formik errors
  const editFieldError = (field: string) => {
    const touched = editTripFormik.touched[field as keyof typeof editTripFormik.touched]
    const error = editTripFormik.errors[field as keyof typeof editTripFormik.errors]
    return touched && error ? (error as string) : undefined
  }

  // Itinerary add/edit day states
  const [isAddDayOpen, setIsAddDayOpen] = React.useState(false)
  const [isEditDayOpen, setIsEditDayOpen] = React.useState(false)
  const [selectedDayId, setSelectedDayId] = React.useState<string | null>(null)
  
  const [dayTitle, setDayTitle] = React.useState("")
  const [dayDescription, setDayDescription] = React.useState("")
  const [dayDate, setDayDate] = React.useState("")
  const [dayNotes, setDayNotes] = React.useState("")

  // Place states
  const [isAddPlaceOpen, setIsAddPlaceOpen] = React.useState(false)
  const [placeName, setPlaceName] = React.useState("")
  const [placeDescription, setPlaceDescription] = React.useState("")
  const [placeVisitTime, setPlaceVisitTime] = React.useState("")
  const [placeNotes, setPlaceNotes] = React.useState("")

  // Manual Progress checklist
  const [progressState, setProgressState] = React.useState({
    customerConfirmed: true,
    requirementsCollected: true,
    tripCreated: true,
    hotelsSelected: false,
    vehicleSelected: false,
    activitiesAdded: false,
    itineraryCompleted: false,
    quotationPrepared: false,
    finalConfirmed: false,
  })

  // Date helper
  const addDaysToDate = (dateStr: string, days: number) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    d.setDate(d.getDate() + days)
    return d.toISOString().split("T")[0]
  }

  // Pre-fill Edit Trip fields when opening Dialog
  const handleOpenEditDialogChange = (open: boolean) => {
    if (open && trip) {
      editTripFormik.resetForm({
        values: {
          tripName: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          adults: trip.adults,
          children: trip.children,
          infants: trip.infants,
          budget: trip.budget ? String(trip.budget) : "",
          status: trip.status,
          notes: trip.notes || "",
        },
      })
    }
    setIsEditOpen(open)
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Compass className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Trip not found</h3>
        <Link href="/trips" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Trips
          </Button>
        </Link>
      </div>
    )
  }

  // Calculate Nights and Days
  const getDurationNightsDays = (start: string, end: string) => {
    if (!start || !end) return { nights: 0, days: 0 }
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return { nights: 0, days: 0 }
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
    return { nights: diff, days: diff + 1 }
  }
  
  const { nights, days } = getDurationNightsDays(trip.startDate, trip.endDate)

  // Filter itinerary days for this trip
  const tripItinerary = itineraryDays
    .filter((d) => d.tripId === trip.id)
    .sort((a, b) => a.dayNumber - b.dayNumber)

  // Filter internal notes for this trip
  const tripNotesList = tripNotes.filter((n) => n.tripId === trip.id)

  // Filter activities timeline for this trip
  const tripTimelineEvents = timelineActivities.filter((act) => act.tripId === trip.id)

  const formatRupees = (val?: number) => {
    if (val === undefined) return "-"
    return `₹${val.toLocaleString("en-IN")}`
  }

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Actions
  const handleStatusChange = (status: TripStatus) => {
    updateTripStatus(trip.id, status)
    toast.success("Trip status updated.")
  }

  const handleAddNote = () => {
    const trimmed = newNoteContent.trim()
    try {
      noteSchema.validateSync({ content: trimmed })
      setNoteErrors((prev) => {
        const copy = { ...prev }
        delete copy.newNote
        return copy
      })
      addTripNote(trip.id, trimmed)
      setNewNoteContent("")
      toast.success("Note added.")
    } catch (err) {
      if (err instanceof Error) {
        setNoteErrors((prev) => ({ ...prev, newNote: err.message }))
      }
    }
  }

  const handleDeleteNote = (noteId: string) => {
    if (confirm("Are you sure you want to delete this internal note?")) {
      deleteTripNote(noteId)
      toast.success("Note deleted.")
    }
  }

  // Itinerary handlers
  const handleAddDayClick = () => {
    const nextDayNum = tripItinerary.length + 1
    // Auto-calculate suggested date
    const suggestedDate = addDaysToDate(trip.startDate, nextDayNum - 1)
    
    setDayTitle("")
    setDayDescription("")
    setDayDate(suggestedDate)
    setDayNotes("")
    setIsAddDayOpen(true)
  }

  const handleSaveDay = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTitle = dayTitle.trim()
    const trimmedDesc = dayDescription.trim()
    const trimmedNotes = dayNotes.trim()

    try {
      itineraryDaySchema.validateSync(
        { dayTitle: trimmedTitle || `Day ${tripItinerary.length + 1} Itinerary`, dayDate, dayDescription: trimmedDesc, dayNotes: trimmedNotes },
        { abortEarly: false }
      )
      setDayErrors({})
    } catch (err) {
      const newErrors: Record<string, string> = {}
      if (err && typeof err === "object" && "inner" in err) {
        const yupErr = err as { inner: Array<{ path?: string; message: string }> }
        yupErr.inner.forEach((e) => {
          if (e.path) newErrors[e.path] = e.message
        })
      }
      if (!dayDate) newErrors.dayDate = "Day date is required"
      if (Object.keys(newErrors).length > 0) {
        setDayErrors(newErrors)
        return
      }
    }

    if (!dayDate) {
      setDayErrors({ dayDate: "Day date is required" })
      return
    }

    // Validation check: date outside trip bounds warning
    if (dayDate < trip.startDate || dayDate > trip.endDate) {
      toast.warning("Note: Day date is outside trip travel schedule.")
    }

    const nextDayNum = tripItinerary.length + 1
    addItineraryDay(trip.id, {
      tripId: trip.id,
      dayNumber: nextDayNum,
      date: dayDate,
      title: trimmedTitle || `Day ${nextDayNum} Itinerary`,
      description: trimmedDesc || undefined,
      notes: trimmedNotes || undefined,
    })

    toast.success("Itinerary day added.")
    setIsAddDayOpen(false)
  }

  const handleStartEditDay = (d: ItineraryDay) => {
    setSelectedDayId(d.id)
    setDayTitle(d.title)
    setDayDescription(d.description || "")
    setDayDate(d.date)
    setDayNotes(d.notes || "")
    setIsEditDayOpen(true)
  }

  const handleSaveEditDay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDayId) return

    const trimmedTitle = dayTitle.trim()
    const trimmedDesc = dayDescription.trim()
    const trimmedNotes = dayNotes.trim()

    try {
      itineraryDaySchema.validateSync(
        { dayTitle: trimmedTitle || "Itinerary Day", dayDate, dayDescription: trimmedDesc, dayNotes: trimmedNotes },
        { abortEarly: false }
      )
      setDayErrors({})
    } catch (err) {
      const newErrors: Record<string, string> = {}
      if (err && typeof err === "object" && "inner" in err) {
        const yupErr = err as { inner: Array<{ path?: string; message: string }> }
        yupErr.inner.forEach((e) => {
          if (e.path) newErrors[e.path] = e.message
        })
      }
      if (!dayDate) newErrors.dayDate = "Day date is required"
      if (Object.keys(newErrors).length > 0) {
        setDayErrors(newErrors)
        return
      }
    }

    if (!dayDate) {
      setDayErrors({ dayDate: "Day date is required" })
      return
    }

    if (dayDate < trip.startDate || dayDate > trip.endDate) {
      toast.warning("Note: Day date is outside trip travel schedule.")
    }

    updateItineraryDay(selectedDayId, {
      title: trimmedTitle || "Itinerary Day",
      description: trimmedDesc || undefined,
      date: dayDate,
      notes: trimmedNotes || undefined,
    })

    toast.success("Itinerary day updated.")
    setIsEditDayOpen(false)
    setSelectedDayId(null)
  }

  const handleDeleteDay = (dayId: string, dayNum: number) => {
    if (confirm(`Delete itinerary day?\nThis will remove Day ${dayNum} from this trip itinerary.`)) {
      deleteItineraryDay(dayId)
      toast.success("Itinerary day deleted.")
    }
  }

  const handleMoveDay = (idx: number, direction: "up" | "down") => {
    const dayIds = tripItinerary.map((d) => d.id)
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    
    if (targetIdx < 0 || targetIdx >= dayIds.length) return

    const temp = dayIds[idx]
    dayIds[idx] = dayIds[targetIdx]
    dayIds[targetIdx] = temp

    reorderItineraryDays(trip.id, dayIds)
    toast.success("Itinerary order updated.")
  }

  // Places Handlers
  const handleOpenAddPlace = (dayId: string) => {
    setSelectedDayId(dayId)
    setPlaceName("")
    setPlaceDescription("")
    setPlaceVisitTime("")
    setPlaceNotes("")
    setIsAddPlaceOpen(true)
  }

  const handleAddPlaceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDayId) return

    const trimmedName = placeName.trim()
    const trimmedDesc = placeDescription.trim()
    const trimmedTime = placeVisitTime.trim()
    const trimmedNotes = placeNotes.trim()

    try {
      itineraryPlaceSchema.validateSync(
        { placeName: trimmedName, placeDescription: trimmedDesc, placeVisitTime: trimmedTime, placeNotes: trimmedNotes },
        { abortEarly: false }
      )
      setPlaceErrors({})
    } catch (err) {
      const newErrors: Record<string, string> = {}
      if (err && typeof err === "object" && "inner" in err) {
        const yupErr = err as { inner: Array<{ path?: string; message: string }> }
        yupErr.inner.forEach((e) => {
          if (e.path) newErrors[e.path] = e.message
        })
      }
      if (Object.keys(newErrors).length > 0) {
        setPlaceErrors(newErrors)
        return
      }
    }

    addItineraryPlace(selectedDayId, {
      name: trimmedName,
      description: trimmedDesc || undefined,
      visitTime: trimmedTime || undefined,
      notes: trimmedNotes || undefined,
    })

    toast.success("Itinerary place added.")
    setIsAddPlaceOpen(false)
    setSelectedDayId(null)
  }

  const handleRemovePlace = (dayId: string, placeId: string) => {
    if (confirm("Remove this place from day itinerary?")) {
      removeItineraryPlace(dayId, placeId)
      toast.success("Itinerary place removed.")
    }
  }

  const handleMovePlace = (day: ItineraryDay, pIdx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? pIdx - 1 : pIdx + 1
    if (targetIdx < 0 || targetIdx >= day.places.length) return

    const newPlaces = [...day.places]
    const temp = newPlaces[pIdx]
    newPlaces[pIdx] = newPlaces[targetIdx]
    newPlaces[targetIdx] = temp

    updateItineraryDay(day.id, { places: newPlaces })
    toast.success("Place order updated.")
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
                  href="/trips"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Compass className="h-3 w-3 text-indigo-500" />
                  Trip Workspace
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {trip.id}
                </span>

                {/* Status Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full"
                      >
                        <Badge className={`border select-none text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${getTripStatusBadgeColor(trip.status)}`}>
                          {trip.status}
                        </Badge>
                      </button>
                    }
                  />
                  <DropdownMenuContent align="start" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-44">
                    <DropdownMenuLabel className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1">Change Status</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {(["Planning", "Quoting", "Confirmed", "In Progress", "Completed", "Cancelled"] as const).map((st) => (
                        <DropdownMenuItem
                          key={st}
                          disabled={trip.status === st}
                          onClick={() => handleStatusChange(st)}
                          className="text-xs cursor-pointer rounded-md"
                        >
                          {st}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {trip.name}
                </h1>
                <span className="text-xs font-medium text-slate-500">
                  Destination: <b className="text-slate-800">{trip.destination}</b>
                </span>
              </div>

              {/* Micro-Telemetry Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                  <span>Customer:</span>
                  <Link href={`/customers/${trip.customerId}`} className="font-bold text-indigo-600 hover:underline">
                    {customer?.name || "Client"}
                  </Link>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  <span className="font-bold text-blue-950">{formatDateDisplay(trip.startDate)} – {formatDateDisplay(trip.endDate)}</span>
                  <span>• {nights}N / {days}D</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                  <Users className="h-3 w-3 text-emerald-600" />
                  <span className="font-bold text-emerald-950">{trip.adults} Adults {trip.children > 0 && `+ ${trip.children} Kids`}</span>
                </div>
                {trip.budget && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100/60">
                    <span className="font-bold text-amber-950">{formatRupees(trip.budget)}</span>
                    <span className="text-amber-700/70 text-[11px]">budget</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2.5 z-10 self-start lg:self-center">
              <Dialog open={isEditOpen} onOpenChange={handleOpenEditDialogChange}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer">
                      <Edit2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Edit Trip
                    </Button>
                  }
                />
                <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
                  <form onSubmit={editTripFormik.handleSubmit}>
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 font-bold text-base">Edit Trip Workspace</DialogTitle>
                      <DialogDescription className="text-slate-500 text-xs mt-1">
                        Modify travel properties, passenger counts, budget and operations planning.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Trip Name</label>
                        <Input {...editTripFormik.getFieldProps("tripName")} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("tripName") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                        {editFieldError("tripName") && (
                          <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("tripName")}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Destination</label>
                          <Input {...editTripFormik.getFieldProps("destination")} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("destination") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("destination") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("destination")}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Trip Status</label>
                          <Select value={editTripFormik.values.status} onValueChange={(val) => editTripFormik.setFieldValue("status", val)}>
                            <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                              <SelectValue />
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                          <Input type="date" {...editTripFormik.getFieldProps("startDate")} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("startDate") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("startDate") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("startDate")}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                          <Input type="date" {...editTripFormik.getFieldProps("endDate")} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("endDate") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("endDate") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("endDate")}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Adults</label>
                          <Input type="number" min={1} {...editTripFormik.getFieldProps("adults")} onChange={(e) => editTripFormik.setFieldValue("adults", parseInt(e.target.value) || 0)} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("adults") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("adults") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("adults")}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Children</label>
                          <Input type="number" min={0} {...editTripFormik.getFieldProps("children")} onChange={(e) => editTripFormik.setFieldValue("children", parseInt(e.target.value) || 0)} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("children") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("children") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("children")}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Infants</label>
                          <Input type="number" min={0} {...editTripFormik.getFieldProps("infants")} onChange={(e) => editTripFormik.setFieldValue("infants", parseInt(e.target.value) || 0)} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("infants") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("infants") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("infants")}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Budget</label>
                          <Input type="number" min={0} {...editTripFormik.getFieldProps("budget")} className={`h-9 bg-slate-50/50 border-slate-200 ${editFieldError("budget") ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                          {editFieldError("budget") && (
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">{editFieldError("budget")}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Internal Operations Notes</label>
                        <Textarea {...editTripFormik.getFieldProps("notes")} rows={3} className="bg-slate-50/50 border-slate-200" />
                      </div>
                    </div>

                    <DialogFooter className="mt-6 flex justify-end gap-2.5">
                      <DialogClose
                        render={
                          <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl">
                            Cancel
                          </Button>
                        }
                      />
                      <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl">
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                onClick={() => {
                  toast.success("Navigated to day-by-day Itinerary builder.")
                  setActiveTab("itinerary")
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4.5 rounded-xl cursor-pointer shadow-xs"
              >
                Continue Planning
              </Button>
            </div>
          </div>

          {/* Sub Navigation Segmented Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 border-t border-slate-100 pt-3 no-scrollbar z-10">
            {([
              { id: "overview", label: "Overview", icon: Compass },
              { id: "itinerary", label: "Itinerary", icon: Calendar, count: tripItinerary.length },
              { id: "hotels", label: "Hotels", icon: Hotel, count: thisTripHotels.length },
              { id: "vehicles", label: "Vehicles", icon: Car, count: thisTripVehicles.length },
              { id: "activities", label: "Activities", icon: Ticket, count: thisTripActivities.length },
              {
                id: "costing",
                label: "Costing & Pricing",
                icon: DollarSign,
                count: (tripCostingData?.costItems.length || 0) + (tripCostingData?.internalExpenses.length || 0),
              },
              {
                id: "quotation",
                label: "Quotation Proposal",
                icon: FileText,
                count: tripQuotations.length,
              },
              { id: "documents", label: "Documents", icon: Receipt },
              { id: "timeline", label: "Timeline", icon: Clock, count: tripTimelineEvents.length },
            ] as Array<{ id: "overview" | "itinerary" | "hotels" | "vehicles" | "activities" | "costing" | "quotation" | "documents" | "timeline"; label: string; icon: React.ElementType; count?: number }>).map((tab) => {
              const TabIcon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
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

        {/* Main Workspace content */}
        <div className="space-y-6">
        
        {activeTab === "overview" && (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 animate-in fade-in duration-150">
            
            {/* Left 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Trip Summary grid */}
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2.5">
                  Trip Summary Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium text-slate-700">
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Destination</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{trip.destination}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Start Date</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{formatDateDisplay(trip.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">End Date</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{formatDateDisplay(trip.endDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Duration</span>
                    <span className="text-indigo-650 font-bold block mt-0.5">{nights} Nights / {days} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Travellers</span>
                    <span className="text-slate-900 font-bold block mt-0.5">
                      {trip.adults} Adults {trip.children > 0 && `+ ${trip.children} Child`} {trip.infants > 0 && `+ ${trip.infants} Inf`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Trip Value</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{formatRupees(trip.budget)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Status</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{trip.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Created</span>
                    <span className="text-slate-500 block mt-0.5">{formatDateDisplay(trip.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Last Updated</span>
                    <span className="text-slate-500 block mt-0.5">{formatDateDisplay(trip.updatedAt || trip.createdAt)}</span>
                  </div>
                </div>

                {trip.notes && (
                  <div className="border-t border-slate-50 pt-3 mt-2">
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Remarks / Requirements Note</span>
                    <p className="text-slate-650 leading-relaxed font-medium mt-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
                      {trip.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* CRM Customer Info Card */}
              <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Customer Contact Profile
                  </h3>
                  <Link href={`/customers/${trip.customerId}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-indigo-650 hover:bg-indigo-50/50 hover:text-indigo-850 font-bold text-[11px] gap-1 cursor-pointer">
                      View CRM Profile <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                
                {customer ? (
                  <div className="grid sm:grid-cols-2 gap-4 text-xs font-medium text-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Name</span>
                      <span className="text-slate-900 font-bold mt-0.5">{customer.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone</span>
                      <span className="text-slate-900 font-bold mt-0.5">{customer.phone}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email</span>
                      <span className="text-slate-700 mt-0.5">{customer.email || "-"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">City</span>
                      <span className="text-slate-700 mt-0.5">{customer.city || "-"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No customer account associated with this record.</div>
                )}
              </div>

              {/* Original Enquiry Relationship */}
              {enquiry ? (
                <div className="bg-indigo-50/20 border border-indigo-150/40 rounded-xl p-5 shadow-2xs space-y-3 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-indigo-950 font-bold text-xs block">Created From Sales Enquiry</span>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Linked Enquiry: <span className="font-bold text-indigo-700">{enquiry.id}</span> – {enquiry.destination} Holiday
                    </p>
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100/50">
                      Conversion Status: Converted
                    </span>
                  </div>

                  <Link href={`/enquiries/${enquiry.id}`} className="shrink-0">
                    <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8 cursor-pointer shadow-xs">
                      View Enquiry
                    </Button>
                  </Link>
                </div>
              ) : null}

            </div>

            {/* Right Column: Progress checklist and Internal Notes */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Trip Operations Progress Checklist */}
              <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2.5">
                  Trip Progress Tracker
                </h3>

                <div className="space-y-2.5 text-xs font-semibold text-slate-650">
                  {([
                    { key: "customerConfirmed", label: "Customer Confirmed", initial: true },
                    { key: "requirementsCollected", label: "Travel Requirements Collected", initial: true },
                    { key: "tripCreated", label: "Trip Workspace Created", initial: true },
                    { key: "hotelsSelected", label: "Hotels Selected", initial: false },
                    { key: "vehicleSelected", label: "Vehicle Arranged", initial: false },
                    { key: "activitiesAdded", label: "Activities Configured", initial: false },
                    { key: "itineraryCompleted", label: "Itinerary Completed", initial: false },
                    { key: "quotationPrepared", label: "Quotation Prepared", initial: false },
                    { key: "finalConfirmed", label: "Final Booking Voucher Issued", initial: false },
                  ] as const).map((item) => {
                    const isDone = progressState[item.key]
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          setProgressState((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                          toast.info(`Updated operations item: ${item.label}`)
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer select-none"
                      >
                        <CheckCircle2 className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                          isDone ? "text-emerald-500 fill-emerald-50" : "text-slate-300"
                        }`} />
                        <span className={`text-[11px] leading-none ${isDone ? "text-slate-800 font-bold" : "text-slate-500 font-medium"}`}>
                          {item.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Trip Notes Section */}
              <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
                  <Info className="h-4.5 w-4.5 text-indigo-550 shrink-0" />
                  <span>Internal Planning Notes</span>
                </h3>

                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add an internal note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNote()
                      }}
                      className={`h-9.5 bg-slate-50/50 border-slate-200 text-xs focus-visible:ring-indigo-500 flex-1 ${noteErrors.newNote ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    <Button
                      onClick={handleAddNote}
                      className="bg-indigo-650 hover:bg-indigo-755 text-white font-semibold text-xs h-9.5 px-4 cursor-pointer shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                  {noteErrors.newNote && (
                    <p className="text-[11px] text-red-500 font-semibold mt-0.5">{noteErrors.newNote}</p>
                  )}
                </div>

                {tripNotesList.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">No internal operational notes yet.</div>
                ) : (
                  <div className="space-y-2 pt-1 max-h-[250px] overflow-y-auto no-scrollbar">
                    {tripNotesList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50/20 text-xs space-y-1.5 flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-slate-650 font-medium leading-relaxed flex-1 whitespace-pre-wrap">
                            {item.content}
                          </p>
                          <button
                            onClick={() => handleDeleteNote(item.id)}
                            className="text-slate-400 hover:text-red-650 transition-colors shrink-0 p-0.5 cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {formatDateDisplay(item.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {activeTab === "itinerary" && (
          <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            
            {/* Itinerary control header panel */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Day-by-day Itinerary Builder</h3>
                <p className="text-xs text-slate-500">
                  Dates: {formatDateDisplay(trip.startDate)} to {formatDateDisplay(trip.endDate)} ({nights} Nights / {days} Days)
                </p>
              </div>

              <Button
                onClick={handleAddDayClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Day
              </Button>
            </div>

            {/* Itinerary days stack */}
            {tripItinerary.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No itinerary added yet"
                description="Start building your operational day-by-day travel plan including transfers, sightseeing, and coordinates."
                actionText="Add Day 1"
                onAction={handleAddDayClick}
              />
            ) : (
              <div className="space-y-4">
                {tripItinerary.map((day, dIdx) => {
                  const isDateWarning = day.date < trip.startDate || day.date > trip.endDate
                  return (
                    <div
                      key={day.id}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4 hover:shadow-xs transition-all relative"
                    >
                      {/* Day Header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-3 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black bg-indigo-600/10 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Day {day.dayNumber}
                            </span>
                            <h4 className="font-extrabold text-slate-905 text-sm">{day.title}</h4>
                          </div>
                          <span className={`text-[11px] font-semibold flex items-center gap-1.5 mt-0.5 ${
                            isDateWarning ? "text-amber-600" : "text-slate-450"
                          }`}>
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {formatDateDisplay(day.date)}
                            {isDateWarning && (
                              <Badge className="bg-amber-50 text-amber-700 border border-amber-200/50 text-[9px] px-1 rounded-sm select-none font-bold">
                                Outside bounds warning
                              </Badge>
                            )}
                          </span>
                        </div>

                        {/* Operations Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={dIdx === 0}
                            onClick={() => handleMoveDay(dIdx, "up")}
                            className="p-1.5 rounded-md border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-750 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            title="Move Day Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            disabled={dIdx === tripItinerary.length - 1}
                            onClick={() => handleMoveDay(dIdx, "down")}
                            className="p-1.5 rounded-md border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-750 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            title="Move Day Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>

                          <div className="w-[1px] h-4.5 bg-slate-100 mx-1" />

                          <button
                            onClick={() => handleStartEditDay(day)}
                            className="p-1.5 rounded-md border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-indigo-650 cursor-pointer"
                            title="Edit Day Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDay(day.id, day.dayNumber)}
                            className="p-1.5 rounded-md border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-red-650 cursor-pointer"
                            title="Delete Day"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Day description content */}
                      {day.description && (
                        <p className="text-slate-650 text-xs font-medium leading-relaxed whitespace-pre-wrap">
                          {day.description}
                        </p>
                      )}

                      {/* Day internal operations planning notes */}
                      {day.notes && (
                        <div className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100 text-[11px] font-medium leading-relaxed text-slate-500">
                          <span className="font-bold text-slate-450 uppercase text-[9px] block mb-0.5">Internal Day Remark</span>
                          {day.notes}
                        </div>
                      )}

                      {/* Places stack inside day card */}
                      <div className="space-y-2 pt-1 border-t border-slate-50/50 mt-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Places & Sightseeing itinerary
                          </h5>
                          <button
                            onClick={() => handleOpenAddPlace(day.id)}
                            className="text-[11px] font-bold text-indigo-650 hover:text-indigo-855 flex items-center gap-0.5 cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> Add Place
                          </button>
                        </div>

                        {day.places.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-1 pl-1">No sightseeing coordinates added.</div>
                        ) : (
                          <div className="space-y-1.5 pl-1">
                            {day.places.map((place, pIdx) => (
                              <div
                                key={place.id}
                                className="flex items-start justify-between gap-3 p-2 border border-slate-100/80 bg-slate-50/20 rounded-lg group"
                              >
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs">{place.name}</span>
                                    {place.visitTime && (
                                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded-sm">
                                        {place.visitTime}
                                      </span>
                                    )}
                                  </div>
                                  {place.description && (
                                    <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                                      {place.description}
                                    </p>
                                  )}
                                  {place.notes && (
                                    <span className="text-[10px] text-slate-400 italic font-semibold block">
                                      Note: {place.notes}
                                    </span>
                                  )}
                                </div>

                                {/* Place ordering/delete controls */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    disabled={pIdx === 0}
                                    onClick={() => handleMovePlace(day, pIdx, "up")}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 cursor-pointer"
                                    title="Move Place Up"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    disabled={pIdx === day.places.length - 1}
                                    onClick={() => handleMovePlace(day, pIdx, "down")}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 cursor-pointer"
                                    title="Move Place Down"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleRemovePlace(day.id, place.id)}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="Remove Place"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>

                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            )}

            {/* Accordion / Preview itinerary summary list */}
            {tripItinerary.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center justify-between">
                  <span>Itinerary Overview Preview</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">DRAFT</span>
                </h4>
                <div className="space-y-2 text-xs font-semibold text-slate-750">
                  {tripItinerary.map((day) => (
                    <div key={day.id} className="flex gap-4">
                      <span className="text-indigo-650 shrink-0 font-extrabold w-[45px]">Day {day.dayNumber}:</span>
                      <span className="text-slate-800 flex-1">{day.title}</span>
                      <span className="text-slate-400 text-[10px] font-medium font-mono">{formatDateDisplay(day.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {activeTab === "timeline" && (
          <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5 animate-in fade-in duration-150 max-w-2xl mx-auto w-full">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Trip Workspace Activity Timeline</span>
            </h3>

            {tripTimelineEvents.length === 0 ? (
              <div className="text-xs text-slate-450 italic py-6 text-center">No timeline updates recorded for this workspace. Change status or add notes to trigger timeline entries.</div>
            ) : (
              <div className="space-y-6 pl-4 border-l border-slate-100 relative mt-4">
                {tripTimelineEvents.map((act) => (
                  <div key={act.id} className="relative space-y-1.5">
                    {/* Circle timeline pin */}
                    <span className="absolute -left-[22.5px] top-0.5 h-4 w-4 rounded-full border border-white bg-indigo-600 flex items-center justify-center shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    
                    <div className="flex items-center justify-between text-xs">
                      <h4 className="font-bold text-slate-850">{act.title}</h4>
                      <span className="text-slate-400 font-medium font-mono">{formatDateDisplay(act.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-550 font-medium leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── HOTELS TAB ────────────────────────────────────────────── */}
        {activeTab === "hotels" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Selected Accommodations ({thisTripHotels.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Hotels, room categories and contracted supplier rates attached to this itinerary.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedHotelId(hotels[0]?.id || "")
                  setSelectedRoomId("")
                  setSelectedMealPlan("CPAI")
                  setHotelCheckIn(trip.startDate)
                  setHotelCheckOut(trip.endDate)
                  setHotelRoomsCount(1)
                  setHotelAdultsCount(trip.adults || 2)
                  setHotelChildrenCount(trip.children || 0)
                  setHotelBookingNotes("")
                  setIsAddHotelToTripOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 px-3 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Hotel to Trip
              </Button>
            </div>

            {thisTripHotels.length === 0 ? (
              <EmptyState
                icon={Hotel}
                title="No hotels added to this trip"
                description="Attach hotel rooms and meal plans from your inventory with verified B2B rate snapshots."
                actionText="Add Hotel"
                onAction={() => {
                  setSelectedHotelId(hotels[0]?.id || "")
                  setIsAddHotelToTripOpen(true)
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {thisTripHotels.map((th) => {
                  const hotel = hotels.find((h) => h.id === th.hotelId)
                  const room = hotelRooms.find((r) => r.id === th.roomId)
                  const nightsCount = th.checkIn && th.checkOut ? getDurationNightsDays(th.checkIn, th.checkOut).nights : 1

                  return (
                    <div
                      key={th.id}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                            <Hotel className="h-5 w-5 stroke-[1.8]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {hotel?.name || th.rateSnapshot?.name || "Hotel"}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <span className="font-semibold text-slate-700">
                                {room?.name || th.rateSnapshot?.roomName || "Standard Room"}
                              </span>
                              <span>•</span>
                              <span>{hotel?.destination}</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Remove this hotel from trip?")) {
                              removeTripHotel(th.id)
                              toast.success("Hotel removed from trip.")
                            }
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Stay parameters */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50/75 p-3 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stay Dates</span>
                          <span className="font-semibold text-slate-800">
                            {formatDateDisplay(th.checkIn)} → {formatDateDisplay(th.checkOut)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">({nightsCount} {nightsCount === 1 ? "Night" : "Nights"})</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rooms / Guests</span>
                          <span className="font-semibold text-slate-800">
                            {th.rooms} {th.rooms === 1 ? "Room" : "Rooms"}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {th.adults} Adults {th.children ? `• ${th.children} Ch` : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meal Plan</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 mt-0.5">
                            {th.rateSnapshot?.mealPlan || "CPAI"}
                          </span>
                        </div>
                      </div>

                      {/* Rate Snapshot Banner */}
                      {th.rateSnapshot && (
                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Unit B2B Tariff (Rate Snapshot)
                            </span>
                            <div className="font-bold text-indigo-600 text-sm">
                              ₹{th.rateSnapshot.baseRate.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-normal text-slate-500">/ room / night</span>
                            </div>
                          </div>

                          {th.rateSnapshot.supplierName && (
                            <div className="text-right text-[11px] text-slate-500">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier</span>
                              <span className="font-semibold text-slate-700">{th.rateSnapshot.supplierName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {th.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-amber-50/50 border border-amber-100 p-2 rounded">
                          Note: {th.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── VEHICLES TAB ───────────────────────────────────────────── */}
        {activeTab === "vehicles" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Transport Services ({thisTripVehicles.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Fleet vehicles, cabs and transport tariffs linked to this trip.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedVehicleId(vehicles[0]?.id || "")
                  setSelectedVehicleRateId("")
                  setVehicleStartDate(trip.startDate)
                  setVehicleEndDate(trip.endDate)
                  setVehicleBookingNotes("")
                  setIsAddVehicleToTripOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 px-3 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Vehicle to Trip
              </Button>
            </div>

            {thisTripVehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No vehicles attached to this trip"
                description="Attach chauffeur-driven sedans, SUVs or tempo travellers with daily or per-KM rates."
                actionText="Add Vehicle"
                onAction={() => {
                  setSelectedVehicleId(vehicles[0]?.id || "")
                  setIsAddVehicleToTripOpen(true)
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {thisTripVehicles.map((tv) => {
                  const veh = vehicles.find((v) => v.id === tv.vehicleId)

                  return (
                    <div
                      key={tv.id}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                            <Car className="h-5 w-5 stroke-[1.8]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {veh?.name || tv.rateSnapshot?.name || "Vehicle"}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {veh?.vehicleType || tv.rateSnapshot?.vehicleType}
                              </span>
                              <span>•</span>
                              <span>{veh?.seatingCapacity || 4} Seats</span>
                              <span>•</span>
                              <span>{veh?.ac ? "AC" : "Non-AC"}</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Remove this vehicle from trip?")) {
                              removeTripVehicle(tv.id)
                              toast.success("Vehicle removed from trip.")
                            }
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Travel schedule */}
                      <div className="bg-slate-50/75 p-3 rounded-lg text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Schedule</span>
                        <div className="font-semibold text-slate-800">
                          {formatDateDisplay(tv.startDate)} → {formatDateDisplay(tv.endDate)}
                        </div>
                      </div>

                      {/* Rate Snapshot Banner */}
                      {tv.rateSnapshot && (
                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Unit Transport Tariff (Snapshot)
                            </span>
                            <div className="font-bold text-blue-600 text-sm">
                              ₹{tv.rateSnapshot.baseRate.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-normal text-slate-500">
                                /{tv.rateSnapshot.rateType || "day"}
                              </span>
                            </div>
                          </div>

                          {tv.rateSnapshot.supplierName && (
                            <div className="text-right text-[11px] text-slate-500">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fleet Vendor</span>
                              <span className="font-semibold text-slate-700">{tv.rateSnapshot.supplierName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {tv.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-blue-50/50 border border-blue-100 p-2 rounded">
                          Route / Notes: {tv.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── ACTIVITIES TAB ─────────────────────────────────────────── */}
        {activeTab === "activities" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sightseeing & Experiences ({thisTripActivities.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Excursions, guided tours and adventure bookings for this trip.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedActivityId(invActivities[0]?.id || "")
                  setSelectedActivityRateId("")
                  setActivityDate(trip.startDate)
                  setActivityAdultsCount(trip.adults || 2)
                  setActivityChildrenCount(trip.children || 0)
                  setActivityBookingNotes("")
                  setIsAddActivityToTripOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 px-3 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Activity to Trip
              </Button>
            </div>

            {thisTripActivities.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No activities added to this trip"
                description="Select guided tours, cultural shows, houseboats and adventure excursions from inventory."
                actionText="Add Activity"
                onAction={() => {
                  setSelectedActivityId(invActivities[0]?.id || "")
                  setIsAddActivityToTripOpen(true)
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {thisTripActivities.map((ta) => {
                  const act = invActivities.find((a) => a.id === ta.activityId)

                  return (
                    <div
                      key={ta.id}
                      className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                            <Ticket className="h-5 w-5 stroke-[1.8]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {act?.name || ta.rateSnapshot?.name || "Activity"}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {act?.category || "Sightseeing"}
                              </span>
                              <span>•</span>
                              <span>{act?.destination}</span>
                              {act?.duration && (
                                <>
                                  <span>•</span>
                                  <span>{act.duration}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Remove this activity from trip?")) {
                              removeTripActivity(ta.id)
                              toast.success("Activity removed from trip.")
                            }
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Excursion details */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50/75 p-3 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Activity Date</span>
                          <span className="font-semibold text-slate-800">{formatDateDisplay(ta.date || "")}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Participants</span>
                          <span className="font-semibold text-slate-800">
                            {ta.adults} Adults {ta.children ? `• ${ta.children} Ch` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Rate Snapshot Banner */}
                      {ta.rateSnapshot && (
                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Unit Activity Rate (Snapshot)
                            </span>
                            <div className="font-bold text-emerald-700 text-sm">
                              ₹{ta.rateSnapshot.baseRate.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-normal text-slate-500">
                                /{ta.rateSnapshot.rateType || "person"}
                              </span>
                            </div>
                          </div>

                          {ta.rateSnapshot.supplierName && (
                            <div className="text-right text-[11px] text-slate-500">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Activity Vendor</span>
                              <span className="font-semibold text-slate-700">{ta.rateSnapshot.supplierName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {ta.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-emerald-50/50 border border-emerald-100 p-2 rounded">
                          Timing / Notes: {ta.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── PHASE 5: COSTING & PRICING ENGINE TAB ───────────────────────── */}
        {activeTab === "costing" && tripCostingData && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top 5 Hero KPI Summary Cards */}
            <CostingSummaryCards
              summary={tripCostingData.summary}
              settings={tripCostingData.costing.settings}
              isLocked={tripCostingData.costing.status === "Locked"}
            />

            {/* Commercial Pricing & Margin Control Panel */}
            <PricingControlPanel
              settings={tripCostingData.costing.settings}
              summary={tripCostingData.summary}
              taxRules={taxRules}
              isLocked={tripCostingData.costing.status === "Locked"}
              onUpdateSettings={(settings) => updatePricingSettings(trip.id, settings)}
              onLockCosting={() => {
                setLockActionType("lock")
                setIsLockModalOpen(true)
              }}
              onUnlockCosting={() => {
                setLockActionType("unlock")
                setIsLockModalOpen(true)
              }}
              onRecalculate={() => recalculateTripCosting(trip.id)}
            />

            {/* Cost Breakdown & Tariffs Table */}
            <CostBreakdownTable
              costItems={tripCostingData.costItems}
              internalExpenses={tripCostingData.internalExpenses}
              isLocked={tripCostingData.costing.status === "Locked"}
              onAddManualCost={() => {
                setEditingCostItem(null)
                setIsAddManualCostOpen(true)
              }}
              onAddInternalExpense={() => {
                setEditingExpense(null)
                setIsAddExpenseOpen(true)
              }}
              onEditCostItem={(item) => {
                setEditingCostItem(item)
                setIsAddManualCostOpen(true)
              }}
              onDeleteCostItem={(itemId) => deleteCostItem(itemId)}
              onEditInternalExpense={(exp) => {
                setEditingExpense(exp)
                setIsAddExpenseOpen(true)
              }}
              onDeleteInternalExpense={(expId) => deleteInternalExpense(expId)}
              onRefreshRateCheck={(item) => {
                setRateChangeItem(item)
                setIsRateChangeModalOpen(true)
              }}
            />
          </div>
        )}

        {/* ─── PHASE 6: CUSTOMER QUOTATION PROPOSAL TAB ────────────────── */}
        {activeTab === "quotation" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {activeQuotation ? (
              <div className="space-y-6">
                {/* Change Alert if live Trip or Costing diverged from saved quotation */}
                {(() => {
                  const diff = detectQuotationChanges(
                    activeQuotation,
                    trip,
                    tripCostingData?.costing,
                    tripItinerary,
                    thisTripHotels,
                    thisTripVehicles,
                    thisTripActivities
                  )
                  return (
                    <QuotationChangeAlert
                      difference={diff}
                      onCreateVersion={() => {
                        setSelectedQuotationForAction(activeQuotation)
                        setIsQuotationVersionModalOpen(true)
                      }}
                    />
                  )
                })()}

                {/* Hero Active Quotation Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold font-mono text-base shrink-0">
                      QT
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-900 text-lg">
                          {activeQuotation.quotationNumber}
                        </span>
                        {activeQuotation.version > 1 && (
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                            Version {activeQuotation.version}
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            activeQuotation.status === "Sent"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : activeQuotation.status === "Ready"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : activeQuotation.status === "Viewed"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {activeQuotation.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm">{activeQuotation.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Prepared for <strong className="text-slate-700">{activeQuotation.customerSnapshot.name}</strong> • Valid until {activeQuotation.validUntil}
                      </p>
                    </div>
                  </div>

                  {/* Selling Price & Quick Action Toolbar */}
                  <div className="flex flex-col md:items-end gap-3 shrink-0">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block md:text-right">
                        Final Customer Selling Price
                      </span>
                      <div className="text-2xl font-black text-indigo-600 md:text-right">
                        {formatCurrency(activeQuotation.sellingPrice, activeQuotation.currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/trips/${trip.id}/quotation`}
                        className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl transition-colors text-slate-700"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        Open Editor
                      </Link>

                      <Link
                        href={`/trips/${trip.id}/quotation/preview`}
                        className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl transition-colors text-slate-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        Preview
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportQuotationPDF(activeQuotation)}
                        className="bg-white border-slate-200 text-xs font-semibold h-8.5 rounded-xl cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        PDF
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedQuotationForAction(activeQuotation)
                          setIsQuotationShareModalOpen(true)
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1" />
                        Share Proposal
                      </Button>
                    </div>
                  </div>
                </div>

                {/* All Quotation Versions for this trip */}
                {tripQuotations.length > 1 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Proposal Version History
                    </h4>
                    <div className="divide-y divide-slate-100 text-xs">
                      {tripQuotations.map((q) => (
                        <div key={q.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800">{q.quotationNumber}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                              {q.status}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Created {q.createdAt.split("T")[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">{formatCurrency(q.sellingPrice, q.currency)}</span>
                            <Link
                              href={`/trips/${trip.id}/quotation`}
                              className="text-indigo-600 hover:underline font-semibold text-[11px]"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No quotation created yet */
              <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center max-w-xl mx-auto shadow-xs space-y-4 my-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Generate Customer Quotation Proposal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Take your itinerary, selected hotel rooms, private vehicle, and Phase 5 final selling price to compile a customer quotation proposal.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/trips/${trip.id}/quotation`}
                    className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Open Quotation Builder
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab Placeholder */}
        {activeTab === "documents" && (
          <div className="bg-white rounded-xl border border-border p-8 shadow-2xs text-center max-w-2xl mx-auto w-full animate-in zoom-in-98 duration-200">
            <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Documents & Vouchers</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed font-medium">
              Vouchers, hotel confirmations, driver assignment slips and customer invoices will be managed in future phases.
            </p>
          </div>
        )}

      </div>

      {/* --- ITINERARY DAY DIALOGS --- */}

      {/* Add Day Dialog */}
      <Dialog open={isAddDayOpen} onOpenChange={setIsAddDayOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-md p-6">
          <form onSubmit={handleSaveDay}>
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">Add Itinerary Day</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Enter details for Day {tripItinerary.length + 1} of the itinerary.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Day Number</label>
                  <Input type="number" value={tripItinerary.length + 1} disabled className="h-9 bg-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                  <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${dayErrors.dayDate ? 'border-red-500 focus-visible:ring-red-500' : ''}`} required />
                  {dayErrors.dayDate && (
                    <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Day Title</label>
                <Input
                  placeholder="e.g. Arrival & Munnar Transfer"
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  className={`h-9 bg-slate-50/50 border-slate-200 ${dayErrors.dayTitle ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                />
                {dayErrors.dayTitle && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayTitle}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Day Summary Description</label>
                <Textarea
                  placeholder="Sightseeing routes, transfer timelines, check-in instructions..."
                  value={dayDescription}
                  onChange={(e) => setDayDescription(e.target.value)}
                  className={`min-h-[70px] bg-slate-50/50 border-slate-200 ${dayErrors.dayDescription ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {dayErrors.dayDescription && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayDescription}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Internal Operation Notes</label>
                <Input
                  placeholder="e.g. Leave resort by 9:00 AM..."
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  className={`h-9 bg-slate-50/50 border-slate-200 ${dayErrors.dayNotes ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {dayErrors.dayNotes && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayNotes}</p>
                )}
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
                Add Day
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Day Dialog */}
      <Dialog open={isEditDayOpen} onOpenChange={setIsEditDayOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-md p-6">
          <form onSubmit={handleSaveEditDay}>
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">Edit Itinerary Day</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Update date, title, details and remarks for this day card.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${dayErrors.dayDate ? 'border-red-500 focus-visible:ring-red-500' : ''}`} required />
                {dayErrors.dayDate && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayDate}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Day Title</label>
                <Input value={dayTitle} onChange={(e) => setDayTitle(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${dayErrors.dayTitle ? 'border-red-500 focus-visible:ring-red-500' : ''}`} required />
                {dayErrors.dayTitle && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayTitle}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Day Summary Description</label>
                <Textarea value={dayDescription} onChange={(e) => setDayDescription(e.target.value)} className={`min-h-[70px] bg-slate-50/50 border-slate-200 ${dayErrors.dayDescription ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {dayErrors.dayDescription && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayDescription}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Internal Operation Notes</label>
                <Input value={dayNotes} onChange={(e) => setDayNotes(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${dayErrors.dayNotes ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {dayErrors.dayNotes && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{dayErrors.dayNotes}</p>
                )}
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
                Save Day
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Place Dialog */}
      <Dialog open={isAddPlaceOpen} onOpenChange={setIsAddPlaceOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-md p-6">
          <form onSubmit={handleAddPlaceSubmit}>
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base">Add Sightseeing Location</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Specify destination, coordinates, visit time and notes for this day itinerary.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Place Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Mattupetty Dam" value={placeName} onChange={(e) => setPlaceName(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${placeErrors.placeName ? 'border-red-500 focus-visible:ring-red-500' : ''}`} required />
                {placeErrors.placeName && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{placeErrors.placeName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Suggested Visit Time</label>
                  <Input placeholder="e.g. 10:30 AM" value={placeVisitTime} onChange={(e) => setPlaceVisitTime(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${placeErrors.placeVisitTime ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                  {placeErrors.placeVisitTime && (
                    <p className="text-[10px] text-red-500 font-semibold mt-0.5">{placeErrors.placeVisitTime}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Operation Remark</label>
                  <Input placeholder="e.g. Boat ride" value={placeNotes} onChange={(e) => setPlaceNotes(e.target.value)} className={`h-9 bg-slate-50/50 border-slate-200 ${placeErrors.placeNotes ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                  {placeErrors.placeNotes && (
                    <p className="text-[10px] text-red-500 font-semibold mt-0.5">{placeErrors.placeNotes}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Location Description</label>
                <Textarea placeholder="Short overview of sightseeing activities, entrance criteria..." value={placeDescription} onChange={(e) => setPlaceDescription(e.target.value)} className={`min-h-[60px] bg-slate-50/50 border-slate-200 ${placeErrors.placeDescription ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {placeErrors.placeDescription && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{placeErrors.placeDescription}</p>
                )}
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
                Add Place
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADD HOTEL TO TRIP DIALOG ────────────────────────────────────── */}
      <Dialog open={isAddHotelToTripOpen} onOpenChange={setIsAddHotelToTripOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!selectedHotelId) {
                toast.error("Please select a hotel.")
                return
              }
              const hotel = hotels.find((h) => h.id === selectedHotelId)
              const availableRooms = hotelRooms.filter((r) => r.hotelId === selectedHotelId)
              const room = availableRooms.find((r) => r.id === selectedRoomId) || availableRooms[0]
              const availableRates = hotelRates.filter((hr) => hr.hotelId === selectedHotelId && (!room || hr.roomId === room.id))
              const matchedRate = availableRates.find((hr) => hr.mealPlan === selectedMealPlan) || availableRates[0]
              const supplier = hotel?.supplierId ? suppliers.find((s) => s.id === hotel.supplierId) : null

              addTripHotel({
                tripId: trip.id,
                hotelId: selectedHotelId,
                roomId: room?.id,
                rateId: matchedRate?.id,
                checkIn: hotelCheckIn,
                checkOut: hotelCheckOut,
                rooms: Number(hotelRoomsCount) || 1,
                adults: Number(hotelAdultsCount) || 2,
                children: Number(hotelChildrenCount) || 0,
                notes: hotelBookingNotes.trim() || undefined,
                rateSnapshot: {
                  name: hotel?.name || "Hotel",
                  roomName: room?.name || "Standard Room",
                  mealPlan: (matchedRate?.mealPlan || selectedMealPlan) as MealPlan,
                  supplierName: supplier?.name,
                  supplierId: supplier?.id,
                  baseRate: matchedRate?.baseRate || 4500,
                  currency: "INR",
                  rateType: "Per Room / Night",
                  validity: matchedRate?.validFrom ? `${matchedRate.validFrom} – ${matchedRate.validTo}` : undefined,
                },
              })

              toast.success("Hotel accommodation added to trip.")
              setIsAddHotelToTripOpen(false)
            }}
            className="space-y-4 text-xs"
          >
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                <Hotel className="h-5 w-5 text-indigo-600" />
                <span>Add Hotel to Trip</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Select property, room category, meal plan and stay dates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-2">
              {/* Hotel Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Select Hotel / Resort *</label>
                <Select
                  value={selectedHotelId}
                  onValueChange={(val) => {
                    setSelectedHotelId(val || "")
                    const rooms = hotelRooms.filter((r) => r.hotelId === val)
                    setSelectedRoomId(rooms[0]?.id || "")
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Choose Hotel Property" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={h.id} className="text-xs">
                        {h.name} ({h.destination} • {h.starCategory}★)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Room & Meal Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Room Category</label>
                  <Select
                    value={selectedRoomId || (hotelRooms.filter((r) => r.hotelId === selectedHotelId)[0]?.id || "")}
                    onValueChange={(val) => setSelectedRoomId(val || "")}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select Room" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {hotelRooms
                        .filter((r) => r.hotelId === selectedHotelId)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Meal Plan</label>
                  <Select
                    value={selectedMealPlan}
                    onValueChange={(val) => setSelectedMealPlan(val as MealPlan)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="CPAI" className="text-xs">CPAI (Bed & Breakfast)</SelectItem>
                      <SelectItem value="MAPAI" className="text-xs">MAPAI (Breakfast + Dinner)</SelectItem>
                      <SelectItem value="APAI" className="text-xs">APAI (All Meals Included)</SelectItem>
                      <SelectItem value="RO" className="text-xs">RO (Room Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CheckIn & CheckOut */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Check-in Date</label>
                  <Input
                    type="date"
                    value={hotelCheckIn}
                    onChange={(e) => setHotelCheckIn(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Check-out Date</label>
                  <Input
                    type="date"
                    value={hotelCheckOut}
                    onChange={(e) => setHotelCheckOut(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Rooms & Pax */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Rooms</label>
                  <Input
                    type="number"
                    min={1}
                    value={hotelRoomsCount}
                    onChange={(e) => setHotelRoomsCount(parseInt(e.target.value) || 1)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Adults</label>
                  <Input
                    type="number"
                    min={1}
                    value={hotelAdultsCount}
                    onChange={(e) => setHotelAdultsCount(parseInt(e.target.value) || 1)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Children</label>
                  <Input
                    type="number"
                    min={0}
                    value={hotelChildrenCount}
                    onChange={(e) => setHotelChildrenCount(parseInt(e.target.value) || 0)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>

              {/* Booking Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Special Requests / Room Notes</label>
                <Input
                  placeholder="e.g. Valley facing room, early check-in requested..."
                  value={hotelBookingNotes}
                  onChange={(e) => setHotelBookingNotes(e.target.value)}
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
                Add Hotel to Trip
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADD VEHICLE TO TRIP DIALOG ──────────────────────────────────── */}
      <Dialog open={isAddVehicleToTripOpen} onOpenChange={setIsAddVehicleToTripOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!selectedVehicleId) {
                toast.error("Please select a vehicle.")
                return
              }
              const veh = vehicles.find((v) => v.id === selectedVehicleId)
              const availableRates = vehicleRates.filter((vr) => vr.vehicleId === selectedVehicleId)
              const matchedRate = availableRates.find((vr) => vr.id === selectedVehicleRateId) || availableRates[0]
              const supplier = veh?.supplierId ? suppliers.find((s) => s.id === veh.supplierId) : null

              addTripVehicle({
                tripId: trip.id,
                vehicleId: selectedVehicleId,
                rateId: matchedRate?.id,
                startDate: vehicleStartDate,
                endDate: vehicleEndDate,
                notes: vehicleBookingNotes.trim() || undefined,
                rateSnapshot: {
                  name: veh?.name || "Vehicle",
                  vehicleType: veh?.vehicleType,
                  supplierName: supplier?.name,
                  supplierId: supplier?.id,
                  baseRate: matchedRate?.baseRate || 3500,
                  currency: "INR",
                  rateType: `${matchedRate?.pricingType || "PerDay"} (${matchedRate?.includedKm || 200} KM/day)`,
                },
              })

              toast.success("Transport service added to trip.")
              setIsAddVehicleToTripOpen(false)
            }}
            className="space-y-4 text-xs"
          >
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <span>Add Vehicle / Transport</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Select fleet model, contracted rate structure and travel duration.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-2">
              {/* Vehicle Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Select Vehicle Model *</label>
                <Select
                  value={selectedVehicleId}
                  onValueChange={(val) => {
                    setSelectedVehicleId(val || "")
                    const vRates = vehicleRates.filter((vr) => vr.vehicleId === val)
                    setSelectedVehicleRateId(vRates[0]?.id || "")
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Choose Vehicle" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.name} ({v.vehicleType} • {v.seatingCapacity} Seats • {v.baseLocation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Service Start Date</label>
                  <Input
                    type="date"
                    value={vehicleStartDate}
                    onChange={(e) => setVehicleStartDate(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Service End Date</label>
                  <Input
                    type="date"
                    value={vehicleEndDate}
                    onChange={(e) => setVehicleEndDate(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Route / Pickup Notes</label>
                <Input
                  placeholder="e.g. Airport pickup to Munnar resort, sightseeing & drop..."
                  value={vehicleBookingNotes}
                  onChange={(e) => setVehicleBookingNotes(e.target.value)}
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
                Add Vehicle to Trip
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADD ACTIVITY TO TRIP DIALOG ─────────────────────────────────── */}
      <Dialog open={isAddActivityToTripOpen} onOpenChange={setIsAddActivityToTripOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!selectedActivityId) {
                toast.error("Please select an activity.")
                return
              }
              const act = invActivities.find((a) => a.id === selectedActivityId)
              const availableRates = activityRates.filter((ar) => ar.activityId === selectedActivityId)
              const matchedRate = availableRates.find((ar) => ar.id === selectedActivityRateId) || availableRates[0]
              const supplier = act?.supplierId ? suppliers.find((s) => s.id === act.supplierId) : null

              addTripActivity({
                tripId: trip.id,
                activityId: selectedActivityId,
                rateId: matchedRate?.id,
                date: activityDate,
                adults: Number(activityAdultsCount) || 2,
                children: Number(activityChildrenCount) || 0,
                notes: activityBookingNotes.trim() || undefined,
                rateSnapshot: {
                  name: act?.name || "Activity",
                  supplierName: supplier?.name,
                  supplierId: supplier?.id,
                  baseRate: matchedRate?.adultRate || matchedRate?.bookingRate || 1000,
                  currency: "INR",
                  rateType: matchedRate?.pricingType || "PerPerson",
                },
              })

              toast.success("Sightseeing activity added to trip.")
              setIsAddActivityToTripOpen(false)
            }}
            className="space-y-4 text-xs"
          >
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                <Ticket className="h-5 w-5 text-emerald-600" />
                <span>Add Sightseeing / Activity</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Attach excursion, adventure sport or cultural experience from inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-2">
              {/* Activity Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Select Activity *</label>
                <Select
                  value={selectedActivityId}
                  onValueChange={(val) => {
                    setSelectedActivityId(val || "")
                    const aRates = activityRates.filter((ar) => ar.activityId === val)
                    setSelectedActivityRateId(aRates[0]?.id || "")
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Choose Activity" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {invActivities.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.name} ({a.destination} • {a.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Participants */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Date</label>
                  <Input
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Adults</label>
                  <Input
                    type="number"
                    min={1}
                    value={activityAdultsCount}
                    onChange={(e) => setActivityAdultsCount(parseInt(e.target.value) || 1)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Children</label>
                  <Input
                    type="number"
                    min={0}
                    value={activityChildrenCount}
                    onChange={(e) => setActivityChildrenCount(parseInt(e.target.value) || 0)}
                    className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Timing / Slot Notes</label>
                <Input
                  placeholder="e.g. Morning 06:30 AM sunrise slot..."
                  value={activityBookingNotes}
                  onChange={(e) => setActivityBookingNotes(e.target.value)}
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
                Add Activity to Trip
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── PHASE 5: COSTING MODALS ──────────────────────────────────────── */}
      <AddManualCostModal
        open={isAddManualCostOpen}
        onOpenChange={setIsAddManualCostOpen}
        tripId={trip.id}
        suppliers={suppliers}
        editingItem={editingCostItem}
        onSubmitCost={(data) => addCostItem(data)}
        onUpdateCost={(itemId, updates) => updateCostItem(itemId, updates)}
      />

      <AddInternalExpenseModal
        open={isAddExpenseOpen}
        onOpenChange={setIsAddExpenseOpen}
        tripId={trip.id}
        editingExpense={editingExpense}
        onSubmitExpense={(data) => addInternalExpense(data)}
        onUpdateExpense={(expId, updates) => updateInternalExpense(expId, updates)}
      />

      <LockCostingModal
        open={isLockModalOpen}
        onOpenChange={setIsLockModalOpen}
        actionType={lockActionType}
        onConfirm={() => {
          if (lockActionType === "lock") {
            lockCosting(trip.id)
          } else {
            unlockCosting(trip.id)
          }
        }}
      />

      <RateChangeModal
        open={isRateChangeModalOpen}
        onOpenChange={setIsRateChangeModalOpen}
        costItem={rateChangeItem}
        currentInventoryRate={
          rateChangeItem?.serviceType === "Hotel"
            ? hotelRates.find((hr) => hr.id === rateChangeItem.rateId)?.baseRate || rateChangeItem.unitCost
            : rateChangeItem?.serviceType === "Vehicle"
            ? vehicleRates.find((vr) => vr.id === rateChangeItem.rateId)?.baseRate || rateChangeItem.unitCost
            : rateChangeItem?.serviceType === "Activity"
            ? activityRates.find((ar) => ar.id === rateChangeItem.rateId)?.adultRate || rateChangeItem.unitCost
            : rateChangeItem?.unitCost || 0
        }
        onUpdateRate={(costItemId, newRate) => refreshRateSnapshot(costItemId, newRate)}
      />

      {/* ─── PHASE 6: QUOTATION MODALS ───────────────────────────────────── */}
      <QuotationShareModal
        open={isQuotationShareModalOpen}
        onOpenChange={setIsQuotationShareModalOpen}
        quotation={selectedQuotationForAction || activeQuotation}
        onMarkSent={(id) => markQuotationSent(id)}
      />

      <QuotationVersionModal
        open={isQuotationVersionModalOpen}
        onOpenChange={setIsQuotationVersionModalOpen}
        quotation={selectedQuotationForAction || activeQuotation}
        onConfirmVersion={() => {
          const target = selectedQuotationForAction || activeQuotation
          if (target) {
            createQuotationVersion(
              target.id,
              trip,
              customer,
              tripItinerary,
              thisTripHotels,
              thisTripVehicles,
              thisTripActivities,
              tripCostingData?.costing,
              { hotels, hotelRooms, vehicles, activities: invActivities }
            )
          }
        }}
      />
      </div>
    </div>
  )
}


