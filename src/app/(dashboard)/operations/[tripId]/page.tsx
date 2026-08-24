"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOperations } from "@/context/operations-context";
import { useBooking } from "@/context/booking-context";
import {
  TransportOperation,
  DailyActivityOperation,
  TripIssue,
  TripOperationsStatus,
} from "@/types";
import {
  TripOperationsStatusBadge,
  TransportStatusBadge,
  ActivityStatusBadge,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/operations/operations-status-badge";
import { AssignDriverModal } from "@/components/operations/assign-driver-modal";
import { ReportDelayModal } from "@/components/operations/report-delay-modal";
import { RescheduleActivityModal } from "@/components/operations/reschedule-activity-modal";
import { CreateIssueModal } from "@/components/operations/create-issue-modal";
import { CommunicationModal } from "@/components/operations/communication-modal";
import { CompleteTripModal } from "@/components/operations/complete-trip-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  Hotel,
  Ticket,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Share2,
  Phone,
  Mail,
  MapPin,
  Users,
  Compass,
  FileText,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Plus,
  RotateCcw,
  Check,
} from "lucide-react";

export default function TripOperationsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const {
    getOperationByTripId,
    updateTripOperationsStatus,
    updateTransportStatus,
    updateActivityStatus,
    resolveIssue,
    addEmergencyContact,
    toggleDriverVisibility,
  } = useOperations();
  const { getBooking } = useBooking();

  const operation = getOperationByTripId(tripId);
  const booking = operation ? getBooking(operation.bookingId) : undefined;

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<
    | "overview"
    | "dailyPlan"
    | "transport"
    | "bookings"
    | "contacts"
    | "documents"
    | "issues"
    | "timeline"
  >("overview");

  // Modals state
  const [selectedTransportForDriver, setSelectedTransportForDriver] =
    React.useState<TransportOperation | null>(null);
  const [selectedTransportForDelay, setSelectedTransportForDelay] =
    React.useState<TransportOperation | null>(null);
  const [selectedActivityForReschedule, setSelectedActivityForReschedule] =
    React.useState<{ dayNumber: number; activity: DailyActivityOperation } | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = React.useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = React.useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = React.useState(false);

  // Quick emergency contact form
  const [newContactName, setNewContactName] = React.useState("");
  const [newContactPhone, setNewContactPhone] = React.useState("");
  const [newContactType, setNewContactType] = React.useState("Emergency Contact");

  if (!operation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <Activity className="h-12 w-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Trip Operation Record Not Found</h2>
          <p className="text-xs text-slate-500">
            No active operational file found for trip ID &quot;{tripId}&quot;.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/operations")}
            className="text-xs font-semibold cursor-pointer"
          >
            Back to Operations
          </Button>
        </div>
      </div>
    );
  }

  const handleAddEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    addEmergencyContact(tripId, {
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      type: newContactType as any,
      isCustomerVisible: true,
    });

    setNewContactName("");
    setNewContactPhone("");
    toast.success("Emergency support contact added!");
  };

  const handleCopyCustomerLink = () => {
    if (!booking) return;
    const url = `${window.location.origin}/trip/${booking.secureToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Customer trip portal link copied!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ─── TOP BREADCRUMB & HEADER BAR ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/operations" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Operations
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-700">{operation.bookingNumber}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {operation.title}
              </h1>
              <TripOperationsStatusBadge status={operation.operationsStatus} />
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Customer: <strong>{operation.customerSnapshot.name}</strong></span>
              <span>•</span>
              <span>{operation.startDate} → {operation.endDate}</span>
              <span>•</span>
              <span>{operation.adults} Adults{operation.children > 0 ? `, ${operation.children} Children` : ""}</span>
              <span>•</span>
              <span className="text-indigo-600 font-bold">
                Day {operation.currentDay} of {operation.totalDays} ({operation.currentLocation})
              </span>
            </p>
          </div>

          {/* Top Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            {/* Status Selector */}
            <Select
              value={operation.operationsStatus}
              onValueChange={(val) =>
                updateTripOperationsStatus(tripId, val as TripOperationsStatus)
              }
            >
              <SelectTrigger className="h-8.5 text-xs font-bold w-40 bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="Upcoming">Upcoming</SelectItem>
                <SelectItem value="Ready for Trip">Ready for Trip</SelectItem>
                <SelectItem value="Pickup Pending">Pickup Pending</SelectItem>
                <SelectItem value="On Trip">On Trip</SelectItem>
                <SelectItem value="Delayed">Delayed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Communication Templates */}
            <Button
              size="sm"
              onClick={() => setIsCommModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Templates
            </Button>

            {/* Log Issue */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIssueModalOpen(true)}
              className="text-xs font-semibold h-8.5 rounded-xl cursor-pointer bg-white"
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
              Log Issue
            </Button>

            {/* Customer Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCustomerLink}
              className="text-xs font-semibold h-8.5 rounded-xl cursor-pointer bg-white"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Customer Link
            </Button>

            {/* Mark Trip Completed */}
            {operation.operationsStatus !== "Completed" && (
              <Button
                size="sm"
                onClick={() => setIsCompleteModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Complete Trip
              </Button>
            )}
          </div>
        </div>

        {/* ─── NAVIGATION TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-px no-scrollbar">
          {[
            { id: "overview", label: "Overview" },
            { id: "dailyPlan", label: `Daily Plan (${operation.dailyPlans.length} Days)` },
            { id: "transport", label: `Transport (${operation.transports.length})` },
            { id: "bookings", label: "Bookings & Vouchers" },
            { id: "contacts", label: `Contacts (${operation.emergencyContacts.length})` },
            { id: "issues", label: `Issues (${operation.issues.length})` },
            { id: "timeline", label: "Timeline" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in-0">
            {/* Top Operational Status Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Day Tracker */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Live Tour Day</span>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    Day {operation.currentDay}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">of {operation.totalDays} Days</span>
                </div>
                <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Currently at {operation.currentLocation}
                </p>
              </div>

              {/* Chauffeur Details */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Dedicated Chauffeur</span>
                  <UserCheck className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {operation.transports[0]?.driverName || "Chauffeur Pending"}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {operation.transports[0]?.driverPhone || "Not assigned"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Vehicle: {operation.transports[0]?.vehicleName || "Vehicle Allocated"}
                </p>
              </div>

              {/* Trip Readiness Summary */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Trip Readiness
                  </span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded ${
                      operation.readiness.score === 100
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {operation.readiness.score}%
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900">{operation.readiness.status}</p>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      operation.readiness.score === 100 ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${operation.readiness.score}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* ─── TRIP READINESS CHECKLIST BREAKDOWN ──────────────────────── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Pre-Departure Readiness Checklist
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {operation.readiness.checks.filter((c) => c.passed).length} of{" "}
                  {operation.readiness.checks.length} Checks Cleared
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {operation.readiness.checks.map((check) => (
                  <div
                    key={check.key}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      check.passed
                        ? "bg-emerald-50/40 border-emerald-100/80"
                        : "bg-rose-50/50 border-rose-200"
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <span
                        className={`font-bold text-xs block ${
                          check.passed ? "text-slate-800" : "text-rose-900"
                        }`}
                      >
                        {check.label}
                      </span>
                      {check.message && (
                        <p className="text-[11px] text-rose-700 leading-tight">
                          {check.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-Trip Feedback Card (If Received) */}
            {operation.feedback && (
              <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    Customer Post-Trip Review
                  </span>
                  <span className="font-bold text-sm text-teal-900">
                    {operation.feedback.rating} / 5 Stars ⭐
                  </span>
                </div>
                <p className="text-xs text-slate-700 italic">
                  &quot;{operation.feedback.comment}&quot;
                </p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  By {operation.feedback.customerName} • {operation.feedback.recommend ? "Would recommend agency" : ""}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: DAILY PLAN ──────────────────────────────────────────── */}
        {activeTab === "dailyPlan" && (
          <div className="space-y-6 animate-in fade-in-0">
            {operation.dailyPlans.map((day) => (
              <div
                key={day.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-indigo-600 uppercase font-mono">
                        Day {day.dayNumber} • {day.date}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          day.status === "Today"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse"
                            : day.status === "Completed"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {day.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{day.title}</h3>
                  </div>

                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {day.location}
                  </span>
                </div>

                {/* Day's Activities list */}
                <div className="space-y-3">
                  {day.activities.map((act) => (
                    <div
                      key={act.id}
                      className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200/80">
                            {act.time || "Scheduled"}
                          </span>
                          <span className="font-bold text-xs text-slate-900">{act.title}</span>
                          <ActivityStatusBadge status={act.status} />
                        </div>
                        {act.location && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 pl-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {act.location}
                          </p>
                        )}
                        {act.rescheduledDate && (
                          <p className="text-[11px] text-amber-700 font-semibold pl-1">
                            Rescheduled to: {act.rescheduledDate} ({act.rescheduleReason})
                          </p>
                        )}
                      </div>

                      {/* Status quick toggle buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateActivityStatus(tripId, day.dayNumber, act.id, "Completed")
                          }
                          className="h-7.5 text-xs font-semibold cursor-pointer bg-white"
                        >
                          <Check className="h-3 w-3 mr-1 text-emerald-600" />
                          Done
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateActivityStatus(tripId, day.dayNumber, act.id, "In Progress")
                          }
                          className="h-7.5 text-xs font-semibold cursor-pointer bg-white"
                        >
                          In Progress
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSelectedActivityForReschedule({ dayNumber: day.dayNumber, activity: act })
                          }
                          className="h-7.5 text-xs font-semibold cursor-pointer"
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB 3: TRANSPORT ───────────────────────────────────────────── */}
        {activeTab === "transport" && (
          <div className="space-y-6 animate-in fade-in-0">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Transport & Chauffeur Operations
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {operation.transports.map((tr) => (
                  <div
                    key={tr.id}
                    className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{tr.title}</h4>
                          <TransportStatusBadge status={tr.status} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {tr.date} at {tr.time} • {tr.type}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTransportForDriver(tr)}
                          className="h-8 text-xs font-semibold cursor-pointer bg-white"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Assign Driver
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTransportStatus(tripId, tr.id, "Customer Picked Up")
                          }
                          className="h-8 text-xs font-semibold cursor-pointer bg-white"
                        >
                          Picked Up
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTransportStatus(tripId, tr.id, "Completed")
                          }
                          className="h-8 text-xs font-semibold cursor-pointer bg-white"
                        >
                          Complete
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedTransportForDelay(tr)}
                          className="h-8 text-xs font-semibold cursor-pointer"
                        >
                          Report Delay
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Pickup</span>
                        <span className="font-bold text-slate-800">{tr.pickupLocation}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Drop</span>
                        <span className="font-bold text-slate-800">{tr.dropLocation}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle</span>
                        <span className="font-bold text-slate-800">{tr.vehicleName || "Pending"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Chauffeur</span>
                        <span className="font-bold text-indigo-600">{tr.driverName || "Not Assigned"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: BOOKINGS ────────────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Linked Bookings & Supplier Inclusions
            </h3>

            {booking?.items && booking.items.length > 0 ? (
              <div className="space-y-3">
                {booking.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        {item.type === "Hotel" ? (
                          <Hotel className="h-4 w-4" />
                        ) : item.type === "Vehicle" ? (
                          <Car className="h-4 w-4" />
                        ) : (
                          <Ticket className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{item.title}</span>
                        <span className="text-[11px] text-slate-500">{item.subtitle}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {item.confirmationNumber || item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No items found for this linked booking.
              </p>
            )}
          </div>
        )}

        {/* ─── TAB 5: CONTACTS & VISIBILITY ───────────────────────────────── */}
        {activeTab === "contacts" && (
          <div className="space-y-6 animate-in fade-in-0">
            {/* Customer Visibility Toggle */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xs text-slate-900">
                  Customer Driver Contact Visibility
                </h4>
                <p className="text-[11px] text-slate-500">
                  Allow guest to view chauffeur phone and call driver directly from their trip link.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                <input
                  type="checkbox"
                  checked={operation.isDriverVisibleToCustomer}
                  onChange={(e) => toggleDriverVisibility(tripId, e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer"
                />
                <span>Visible to Guest</span>
              </label>
            </div>

            {/* Emergency Contacts List */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Emergency & Tour Support Contacts
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {operation.emergencyContacts.map((c) => (
                  <div
                    key={c.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-1.5 text-xs"
                  >
                    <span className="text-[10px] font-bold uppercase text-indigo-600 block">
                      {c.type}
                    </span>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-slate-600 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {c.phone}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add Contact Form */}
              <form
                onSubmit={handleAddEmergencyContact}
                className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Contact Name</label>
                  <Input
                    placeholder="e.g. Local Station Manager"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Phone Number</label>
                  <Input
                    placeholder="+91 XXXXX XXXXX"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Contact Type</label>
                  <Select value={newContactType} onValueChange={(val) => setNewContactType(val || "Emergency Contact")}>
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Agency Desk">Agency Support Desk</SelectItem>
                      <SelectItem value="Driver">Driver</SelectItem>
                      <SelectItem value="Hotel">Hotel Duty Manager</SelectItem>
                      <SelectItem value="Local Supplier">Local Supplier</SelectItem>
                      <SelectItem value="Emergency Contact">Emergency Helpline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 rounded-xl cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Contact
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB 6: ISSUES ──────────────────────────────────────────────── */}
        {activeTab === "issues" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Operational Issues & Tickets ({operation.issues.length})
              </h3>
              <Button
                size="sm"
                onClick={() => setIsIssueModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Log New Issue
              </Button>
            </div>

            {operation.issues.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                ✓ No operational issues logged for this trip.
              </div>
            ) : (
              <div className="space-y-3">
                {operation.issues.map((iss) => (
                  <div
                    key={iss.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <IssuePriorityBadge priority={iss.priority} />
                          <IssueStatusBadge status={iss.status} />
                          <span className="font-bold text-xs text-slate-900">{iss.title}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{iss.description}</p>
                      </div>

                      {iss.status !== "Resolved" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const note = prompt("Enter resolution notes / remarks:");
                            if (note) resolveIssue(iss.id, note);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7.5 px-3 rounded-lg cursor-pointer shrink-0"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Assigned To: {iss.assignedTo || "Support Desk"}</span>
                      <span>Created: {iss.createdAt.split("T")[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 7: TIMELINE ────────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Operational Live Audit Timeline
            </h3>

            <div className="space-y-4">
              {operation.timeline.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{evt.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{evt.time || evt.createdAt.split("T")[0]}</span>
                    </div>
                    {evt.description && <p className="text-slate-600">{evt.description}</p>}
                    {evt.actor && <p className="text-[10px] text-indigo-600">By: {evt.actor}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      <AssignDriverModal
        tripId={tripId}
        transport={selectedTransportForDriver}
        isOpen={!!selectedTransportForDriver}
        onClose={() => setSelectedTransportForDriver(null)}
      />

      <ReportDelayModal
        tripId={tripId}
        transport={selectedTransportForDelay}
        isOpen={!!selectedTransportForDelay}
        onClose={() => setSelectedTransportForDelay(null)}
      />

      <RescheduleActivityModal
        tripId={tripId}
        dayNumber={selectedActivityForReschedule?.dayNumber || 1}
        activity={selectedActivityForReschedule?.activity || null}
        isOpen={!!selectedActivityForReschedule}
        onClose={() => setSelectedActivityForReschedule(null)}
      />

      <CreateIssueModal
        operation={operation}
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />

      <CommunicationModal
        operation={operation}
        isOpen={isCommModalOpen}
        onClose={() => setIsCommModalOpen(false)}
      />

      <CompleteTripModal
        operation={operation}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
      />
    </div>
  );
}
