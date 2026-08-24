"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useEnquiry } from "@/context/enquiry-context"
import { StatusBadge } from "@/components/enquiries/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
  Calendar,
  MapPin,
  MessageSquare,
  Plus,
  Phone,
  Mail,
  User,
  Info,
  Clock,
  ExternalLink,
  CheckCircle,
  FileText,
  AlertTriangle,
  Building,
  Utensils,
  Car,
  Compass,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { EnquiryStatus, FollowUp } from "@/types"

export default function EnquiryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const {
    enquiries,
    customers,
    followups,
    activities,
    trips,
    updateEnquiryStatus,
    addNote,
    scheduleFollowUp,
    completeFollowUp,
    convertToTrip,
  } = useEnquiry()

  // 1. Fetch data
  const enquiry = enquiries.find((e) => e.id === id)
  const customer = enquiry ? customers.find((c) => c.id === enquiry.customerId) : undefined
  const enquiryActivities = activities.filter((act) => act.enquiryId === id)
  const enquiryFollowups = followups.filter((f) => f.enquiryId === id)

  // Form states
  const [noteContent, setNoteContent] = React.useState("")
  const [followupDate, setFollowupDate] = React.useState("")
  const [followupTime, setFollowupTime] = React.useState("10:00")
  const [followupNote, setFollowupNote] = React.useState("")
  const [isConvertOpen, setIsConvertOpen] = React.useState(false)

  if (!enquiry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Enquiry not found</h3>
        <p className="text-sm text-slate-500 max-w-xs mt-1">
          The enquiry with ID {id} does not exist or has been removed.
        </p>
        <Link href="/enquiries" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Enquiries
          </Button>
        </Link>
      </div>
    )
  }

  const formatRupees = (val?: number) => {
    if (val === undefined) return "-"
    return `₹${val.toLocaleString("en-IN")}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Duration Helper
  const getDurationString = () => {
    if (!enquiry.startDate || !enquiry.endDate) return ""
    const start = new Date(enquiry.startDate)
    const end = new Date(enquiry.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ""
    const diffTime = end.getTime() - start.getTime()
    if (diffTime < 0) return ""
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Same Day"
    return `${diffDays} Nights / ${diffDays + 1} Days`
  }

  // Handle actions
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return
    addNote(id, noteContent.trim())
    setNoteContent("")
    toast.success("Note added successfully")
  }

  const handleScheduleFollowupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!followupDate) {
      toast.error("Please select a date")
      return
    }
    if (!followupNote.trim()) {
      toast.error("Please enter a follow-up note")
      return
    }
    scheduleFollowUp(id, followupDate, followupTime, followupNote.trim())
    setFollowupDate("")
    setFollowupTime("10:00")
    setFollowupNote("")
    toast.success("Follow-up scheduled successfully")
  }

  const handleCompleteFollowup = (fId: string) => {
    completeFollowUp(fId)
    toast.success("Follow-up marked as completed")
  }

  const handleConvertConfirmed = () => {
    try {
      const trip = convertToTrip(id)
      setIsConvertOpen(false)
      toast.success(`Success! Converted to Trip ${trip.id}`)
      router.push(`/trips/${trip.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to convert")
    }
  }

  const handleStatusChange = (status: EnquiryStatus) => {
    updateEnquiryStatus(id, status)
    toast.success(`Status updated to ${status}`)
  }

  // Follow-up status checker
  const getFollowUpBadge = (f: FollowUp) => {
    if (f.status === "Completed") {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold">Completed</span>
    }
    const todayStr = new Date().toISOString().split("T")[0]
    if (f.date === todayStr) {
      return <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] font-bold">Due Today</span>
    } else if (f.date < todayStr) {
      return <span className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse">Overdue</span>
    } else {
      return <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[9px] font-bold">Upcoming</span>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/enquiries"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Compass className="h-3 w-3 text-indigo-500" />
                Enquiry Workspace
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {enquiry.id}
              </span>
              <StatusBadge status={enquiry.status} />
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {enquiry.destination} Holiday
              </h1>
              <span className="text-xs font-medium text-slate-500">
                Created {formatDate(enquiry.createdAt)}
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                <User className="h-3 w-3 text-slate-500" />
                <span className="font-bold text-slate-900">{customer?.name}</span>
                {customer?.phone && <span className="text-slate-400 font-mono">({customer.phone})</span>}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                <Calendar className="h-3 w-3 text-blue-600" />
                <span className="font-bold text-blue-950">{formatDate(enquiry.startDate)}</span>
                {getDurationString() && <span>• {getDurationString()}</span>}
              </div>
              {enquiry.budget && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                  <span className="font-bold text-emerald-950">{formatRupees(enquiry.budget)}</span>
                  <span className="text-emerald-700/70 text-[11px]">budget</span>
                </div>
              )}
              {enquiry.source && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  Source: {enquiry.source}
                </div>
              )}
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2.5 z-10 self-start lg:self-center">
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer">
                    Change Status
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="bg-white border border-slate-200 max-h-[300px] shadow-md rounded-xl p-1 w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Pipeline Stage</DropdownMenuLabel>
                  {(["New", "Contacted", "Qualified", "Quoted", "Follow-up", "Confirmed", "Lost", "Cancelled"] as const).map((st) => (
                    <DropdownMenuItem
                      key={st}
                      disabled={enquiry.status === st}
                      onClick={() => handleStatusChange(st)}
                      className="text-xs cursor-pointer rounded-md"
                    >
                      {st}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Convert to Trip CTA */}
            {(() => {
              const existingTrip = trips.find((t) => t.enquiryId === id)
              if (existingTrip) {
                return (
                  <Link href={`/trips/${existingTrip.id}`}>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs h-9 text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      Trip {existingTrip.id} <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )
              }
              return (
                <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs h-9 text-xs rounded-xl cursor-pointer"
                        disabled={enquiry.status === "Confirmed"}
                      >
                        Convert to Trip
                      </Button>
                    }
                  />
                  <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 font-bold text-base">Convert enquiry to trip?</DialogTitle>
                      <DialogDescription className="text-slate-500 text-xs mt-1 leading-relaxed">
                        This will create a new trip record using the details from this enquiry and set the enquiry status to <b>Confirmed</b>.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="border border-slate-100 rounded-xl bg-slate-50/80 p-4 space-y-2 mt-4 text-xs font-medium text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Customer:</span>
                        <span className="font-semibold text-slate-900">{customer?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Destination:</span>
                        <span className="font-semibold text-slate-900">{enquiry.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Travel Dates:</span>
                        <span className="font-semibold text-slate-900">{formatDate(enquiry.startDate)} – {formatDate(enquiry.endDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Travellers:</span>
                        <span className="font-semibold text-slate-900">{enquiry.adults} Adults {enquiry.children > 0 && `+ ${enquiry.children} Children`}</span>
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
                      <Button
                        onClick={handleConvertConfirmed}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                      >
                        Convert to Trip
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )
            })()}
          </div>
        </div>

        {/* Workspace Content Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Main 2/3 column layout */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Travel details criteria details card */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <MapPin className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Travel Requirements</h3>
              </div>

              <div className="grid gap-x-6 gap-y-4 grid-cols-2 sm:grid-cols-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Destination</span>
                  <span className="text-indigo-950 font-bold text-sm block mt-1">{enquiry.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Dates</span>
                  <span className="text-slate-800 font-semibold block mt-1">
                    {formatDate(enquiry.startDate)} – {formatDate(enquiry.endDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Duration</span>
                  <span className="text-slate-800 font-semibold block mt-1">{getDurationString() || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Travellers</span>
                  <span className="text-slate-800 font-semibold block mt-1">
                    {enquiry.adults} Adults
                    {enquiry.children > 0 && `, ${enquiry.children} Children`}
                    {enquiry.infants > 0 && `, ${enquiry.infants} Infants`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Budget</span>
                  <span className="text-slate-900 font-bold block mt-1">
                    {formatRupees(enquiry.budget)}
                    {enquiry.budgetType && (
                      <span className="text-[10px] font-normal text-slate-400 ml-1 uppercase">
                        ({enquiry.budgetType.replace("_", " ")})
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Source</span>
                  <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-bold mt-1">
                    {enquiry.source}
                  </span>
                </div>
              </div>

              {/* Prefs Grid */}
              <div className="grid gap-4 sm:grid-cols-3 border-t border-slate-100 pt-5 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/20">
                  <Building className="h-4 w-4 text-indigo-500" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Hotel Category</span>
                    <span className="font-semibold text-slate-800">{enquiry.hotelCategory || "Not decided"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/20">
                  <Utensils className="h-4 w-4 text-indigo-500" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Meal Preference</span>
                    <span className="font-semibold text-slate-800">{enquiry.mealPlan || "Not decided"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/20">
                  <Car className="h-4 w-4 text-indigo-500" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Vehicle Preference</span>
                    <span className="font-semibold text-slate-800">{enquiry.vehiclePreference || "Not decided"}</span>
                  </div>
                </div>
              </div>

              {/* Special Requirements Text */}
              {enquiry.notes && (
                <div className="border-t border-slate-100 pt-4 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Special Requirements</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/40 p-3 rounded-lg border border-slate-100/50">
                    {enquiry.notes}
                  </p>
                </div>
              )}

              {/* Internal Notes Text */}
              {enquiry.internalNotes && (
                <div className="border-t border-slate-100 pt-4 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Internal Agency Notes</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/40 p-3 rounded-lg border border-slate-100/50 font-serif italic">
                    {enquiry.internalNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Note creation panel */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Add Note</h3>
              </div>

              <form onSubmit={handleAddNoteSubmit} className="space-y-3">
                <Textarea
                  placeholder="Type a new activity note here (e.g. Speak to customer regarding flight bookings...)..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 min-h-[90px] text-xs"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-4 cursor-pointer"
                    disabled={!noteContent.trim()}
                  >
                    Save Note
                  </Button>
                </div>
              </form>
            </div>

            {/* Activity timeline component log */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Clock className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Activity History</h3>
              </div>

              <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-6">
                {enquiryActivities.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2">No activity records logged yet.</div>
                ) : (
                  enquiryActivities.map((act) => {
                    const getIcon = () => {
                      switch (act.type) {
                        case "ENQUIRY_CREATED":
                          return <Plus className="h-3 w-3" />
                        case "STATUS_CHANGED":
                          return <Info className="h-3 w-3" />
                        case "NOTE_ADDED":
                          return <MessageSquare className="h-3 w-3" />
                        case "FOLLOW_UP_SCHEDULED":
                          return <Calendar className="h-3 w-3" />
                        case "FOLLOW_UP_COMPLETED":
                          return <CheckCircle className="h-3 w-3" />
                        case "TRIP_CREATED":
                          return <FileText className="h-3 w-3" />
                        default:
                          return <Info className="h-3 w-3" />
                      }
                    };

                    const getBadgeColors = () => {
                      switch (act.type) {
                        case "ENQUIRY_CREATED":
                          return "bg-indigo-50 text-indigo-600 border-indigo-100"
                        case "STATUS_CHANGED":
                          return "bg-blue-50 text-blue-600 border-blue-100"
                        case "NOTE_ADDED":
                          return "bg-slate-50 text-slate-600 border-slate-200"
                        case "FOLLOW_UP_SCHEDULED":
                          return "bg-amber-50 text-amber-600 border-amber-100"
                        case "FOLLOW_UP_COMPLETED":
                          return "bg-emerald-50 text-emerald-600 border-emerald-100"
                        case "TRIP_CREATED":
                          return "bg-indigo-100 text-indigo-700 border-indigo-200"
                        default:
                          return "bg-slate-50 text-slate-500 border-slate-100"
                      }
                    }

                    return (
                      <div key={act.id} className="relative">
                        {/* Timeline dot icon indicator */}
                        <div className={`absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${getBadgeColors()}`}>
                          {getIcon()}
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[12px]">{act.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(act.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} - {formatDate(act.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed font-medium">{act.description}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right sidebar column */}
          <div className="space-y-6">
            
            {/* Customer Details panel */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Customer Information
                  </h4>
                </div>
              </div>

              {customer ? (
                <div className="space-y-3.5 text-xs font-medium text-slate-700">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{customer.name}</h5>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{customer.id}</span>
                  </div>

                  <div className="space-y-2 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{customer.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions placeholders */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("Dialing Integration coming in Phase 3")}
                      className="bg-white hover:bg-slate-50 border-slate-200 h-8 text-[11px] font-semibold gap-1.5"
                    >
                      <Phone className="h-3 w-3" /> Call
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("WhatsApp sync interface coming in Phase 3")}
                      className="bg-white hover:bg-slate-50 border-slate-200 h-8 text-[11px] font-semibold gap-1.5 text-emerald-600 hover:text-emerald-700"
                    >
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Loading customer details...</div>
              )}
            </div>

            {/* Follow-up card panel */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Follow-ups
                  </h4>
                </div>
              </div>

              {/* Schedule Followup Form */}
              <form onSubmit={handleScheduleFollowupSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
                    <Input
                      type="date"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className="h-8 bg-slate-50/50 border-slate-200 text-xs px-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Time</label>
                    <Input
                      type="time"
                      value={followupTime}
                      onChange={(e) => setFollowupTime(e.target.value)}
                      className="h-8 bg-slate-50/50 border-slate-200 text-xs px-2"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Follow-up Note</label>
                  <Input
                    placeholder="e.g. Quote check call..."
                    value={followupNote}
                    onChange={(e) => setFollowupNote(e.target.value)}
                    className="h-8 bg-slate-50/50 border-slate-200 text-xs px-2"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 cursor-pointer"
                >
                  Schedule Follow-up
                </Button>
              </form>

              {/* Scheduled followups list */}
              <div className="space-y-2 pt-3 border-t border-slate-50">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Scheduled Tasks
                </h5>
                
                {enquiryFollowups.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic">No follow-ups scheduled yet.</div>
                ) : (
                  enquiryFollowups.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-100/80 bg-slate-50/20 text-[11px] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-bold">
                          {formatDate(item.date)} at {item.time}
                        </span>
                        {getFollowUpBadge(item)}
                      </div>
                      <p className="text-slate-600 leading-normal font-medium">{item.note}</p>
                      
                      {item.status !== "Completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCompleteFollowup(item.id)}
                          className="h-6 w-full text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-dashed border-emerald-200/50 hover:border-emerald-300 mt-1 cursor-pointer"
                        >
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2.5">
                Quick Actions
              </h4>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("Quotation Builder interface belongs to Phase 3")}
                  className="w-full bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold justify-start gap-2 text-slate-600"
                >
                  <FileText className="h-4 w-4 text-indigo-500" /> Create Quotation
                </Button>
              </div>
            </div>

          </div>

        </div>
      </div>
      
    </div>
  )
}
