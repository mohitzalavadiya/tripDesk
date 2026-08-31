"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  operationsClient,
  OperationDetailWithRelations,
  ReadinessSummary,
  HotelConfirmationWithDetails,
  VehicleDispatchWithDetails,
  ActivityConfirmationWithDetails,
} from "@/lib/api-client";
import {
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
  OperationalIssue,
  OperationEvent,
} from "@prisma/client";
import {
  TripOperationsStatusBadge,
  TransportStatusBadge,
  HotelConfirmationStatusBadge,
  ActivityStatusBadge,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/operations/operations-status-badge";
import { HotelConfirmationCard } from "@/components/operations/hotel-confirmation-card";
import { HotelConfirmationDialog, HotelDialogMode } from "@/components/operations/hotel-confirmation-dialog";
import { VehicleDispatchCard } from "@/components/operations/vehicle-dispatch-card";
import { AssignDriverModal } from "@/components/operations/assign-driver-modal";
import { ReportDelayModal } from "@/components/operations/report-delay-modal";
import { ActivityConfirmationCard } from "@/components/operations/activity-confirmation-card";
import { ActivityConfirmationDialog, ActivityDialogMode } from "@/components/operations/activity-confirmation-dialog";
import { RescheduleActivityModal } from "@/components/operations/reschedule-activity-modal";
import { CreateIssueModal } from "@/components/operations/create-issue-modal";
import { ResolveIssueDialog } from "@/components/operations/resolve-issue-dialog";
import { OperationalIssueCard } from "@/components/operations/operational-issue-card";
import { CompleteTripModal } from "@/components/operations/complete-trip-modal";
import { CommunicationModal } from "@/components/operations/communication-modal";
import { TravelKitReadinessModal } from "@/components/operations/travel-kit-readiness-modal";
import { ServiceReconciliationCard } from "@/components/operations/service-reconciliation-card";
import { PostTourReviewCard } from "@/components/operations/post-tour-review-card";
import { FinancialReconciliationCard } from "@/components/operations/financial-reconciliation-card";
import { FinalizationChecklistCard } from "@/components/operations/finalization-checklist-card";
import { OperationsClosureSummary } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton, CardSkeleton, TableSkeleton } from "@/components/shared/loading-skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
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
  Share2,
  Phone,
  Mail,
  MapPin,
  Users,
  Search,
  Compass,
  FileText,
  Plus,
  Loader2,
  ExternalLink,
  ShieldAlert,
  History,
  Check,
  Download,
  MessageSquare,
  Send,
  Lock,
  Scale,
} from "lucide-react";

export default function TripOperationsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  // Data states
  const [operation, setOperation] = React.useState<OperationDetailWithRelations | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessSummary | null>(null);
  const [timeline, setTimeline] = React.useState<OperationEvent[]>([]);
  const [closureSummary, setClosureSummary] = React.useState<OperationsClosureSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [initializing, setInitializing] = React.useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "accommodations" | "fleet" | "activities" | "issues" | "documents" | "timeline" | "closure"
  >("overview");

  // Modals state
  const [selectedDispatchForDriver, setSelectedDispatchForDriver] =
    React.useState<VehicleDispatchWithDetails | null>(null);
  const [selectedDispatchForDelay, setSelectedDispatchForDelay] =
    React.useState<VehicleDispatchWithDetails | null>(null);
  const [selectedActivityForReschedule, setSelectedActivityForReschedule] =
    React.useState<ActivityConfirmationWithDetails | null>(null);
  const [selectedActivityForDialog, setSelectedActivityForDialog] =
    React.useState<ActivityConfirmationWithDetails | null>(null);
  const [activityDialogMode, setActivityDialogMode] =
    React.useState<ActivityDialogMode>("CONFIRM");
  const [hotelForDialog, setHotelForDialog] =
    React.useState<HotelConfirmationWithDetails | null>(null);
  const [hotelDialogMode, setHotelDialogMode] =
    React.useState<HotelDialogMode>("CONFIRM");
  const [isIssueModalOpen, setIsIssueModalOpen] = React.useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = React.useState(false);
  const [isCommunicationModalOpen, setIsCommunicationModalOpen] = React.useState(false);

  // Hotel search & filter states
  const [hotelSearch, setHotelSearch] = React.useState("");
  const [hotelStatusFilter, setHotelStatusFilter] = React.useState<string>("ALL");

  // Dispatch search & filter states
  const [dispatchSearch, setDispatchSearch] = React.useState("");
  const [dispatchStatusFilter, setDispatchStatusFilter] = React.useState<string>("ALL");

  // Activity search & filter states
  const [activitySearch, setActivitySearch] = React.useState("");
  const [activityStatusFilter, setActivityStatusFilter] = React.useState<string>("ALL");

  // Inline edit state for hotels & activities
  const [editingHotelId, setEditingHotelId] = React.useState<string | null>(null);
  const [hotelConfNumber, setHotelConfNumber] = React.useState("");
  const [hotelStatus, setHotelStatus] = React.useState<ConfirmationStatus>(ConfirmationStatus.CONFIRMED);

  // Resolve issue state
  const [selectedIssueForResolve, setSelectedIssueForResolve] =
    React.useState<OperationalIssue | null>(null);
  const [issueDialogTargetStatus, setIssueDialogTargetStatus] =
    React.useState<IssueStatus>(IssueStatus.RESOLVED);
  const [issueSearchQuery, setIssueSearchQuery] = React.useState("");
  const [issueStatusFilter, setIssueStatusFilter] = React.useState("ALL");
  const [issuePriorityFilter, setIssuePriorityFilter] = React.useState("ALL");

  // Documents & Travel Kit state
  const [isTravelKitModalOpen, setIsTravelKitModalOpen] = React.useState(false);
  const [documentsSummary, setDocumentsSummary] = React.useState<any>(null);
  const [documentsLoading, setDocumentsLoading] = React.useState(false);

  // Fetch full operation details
  const fetchOperationData = React.useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Operation
      const res = await operationsClient.getOperationByTripId(tripId);
      const op = res.data;

      if (!op) {
        setOperation(null);
        setLoading(false);
        return;
      }

      setOperation(op);

      // 2. Fetch Readiness, Timeline, Documents & Closure in parallel
      const [readinessRes, timelineRes, docsRes, closureRes] = await Promise.all([
        operationsClient.getReadiness(op.id).catch(() => ({ data: null })),
        operationsClient.getTimeline(op.id).catch(() => ({ data: [] })),
        operationsClient.getDocumentsSummary(op.id).catch(() => ({ data: null })),
        operationsClient.getClosureSummary(op.id).catch(() => ({ data: null })),
      ]);

      if (readinessRes.data) setReadiness(readinessRes.data);
      if (timelineRes.data) setTimeline(timelineRes.data);
      if (docsRes.data) setDocumentsSummary(docsRes.data);
      if (closureRes.data) setClosureSummary(closureRes.data);
    } catch (err: any) {
      if (err.statusCode === 403 && err.code === "READ_ONLY_ACCESS") {
        setIsReadOnly(true);
      } else {
        setError(err.message || "Failed to load trip operation details.");
      }
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => {
    fetchOperationData();
  }, [fetchOperationData]);

  // Handle Initialize Operation
  const handleInitializeOperation = async () => {
    try {
      setInitializing(true);
      await operationsClient.createOperation({
        tripId,
        status: OperationStatus.PREPARING,
      });
      toast.success("Operations initialized for this trip!");
      await fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize operations.");
    } finally {
      setInitializing(false);
    }
  };

  // Handle Operation Status Change
  const handleStatusChange = async (newStatus: OperationStatus) => {
    if (!operation) return;
    try {
      await operationsClient.updateOperation(operation.id, { status: newStatus });
      toast.success(`Operation status updated to ${newStatus}`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update operation status.");
    }
  };

  // Handle Hotel Confirmation Update
  const handleSaveHotelConfirmation = async (confirmationId: string) => {
    if (!operation) return;
    try {
      await operationsClient.updateHotelConfirmation(operation.id, confirmationId, {
        confirmationNumber: hotelConfNumber.trim() || undefined,
        status: hotelStatus,
      });
      toast.success("Hotel confirmation updated!");
      setEditingHotelId(null);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save hotel confirmation");
    }
  };

  // Dispatch lifecycle action handlers
  const handleConfirmDispatch = async (dispatch: VehicleDispatchWithDetails) => {
    if (!operation) return;
    try {
      await operationsClient.updateVehicleDispatch(operation.id, dispatch.id, {
        status: DispatchStatus.CONFIRMED,
      });
      toast.success(`Dispatch for ${dispatch.tripVehicle?.vehicleName || "Vehicle"} confirmed!`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm dispatch");
    }
  };

  const handleStartDuty = async (dispatch: VehicleDispatchWithDetails) => {
    if (!operation) return;
    try {
      await operationsClient.updateVehicleDispatch(operation.id, dispatch.id, {
        status: DispatchStatus.ON_DUTY,
      });
      toast.success(`Chauffeur ${dispatch.driverName || "Driver"} is now On Duty!`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to start duty");
    }
  };

  const handleCompleteDuty = async (dispatch: VehicleDispatchWithDetails) => {
    if (!operation) return;
    try {
      await operationsClient.updateVehicleDispatch(operation.id, dispatch.id, {
        status: DispatchStatus.COMPLETED,
      });
      toast.success(`Transport duty for ${dispatch.tripVehicle?.vehicleName || "Vehicle"} completed!`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete duty");
    }
  };

  const handleCancelDispatch = async (dispatch: VehicleDispatchWithDetails) => {
    if (!operation) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel the dispatch for ${dispatch.tripVehicle?.vehicleName || "this vehicle"}?`
    );
    if (!confirmCancel) return;

    try {
      await operationsClient.updateVehicleDispatch(operation.id, dispatch.id, {
        status: DispatchStatus.CANCELLED,
        notes: dispatch.notes
          ? `${dispatch.notes}\n[CANCELLED]: Cancelled by operations coordinator.`
          : "[CANCELLED]: Cancelled by operations coordinator.",
      });
      toast.success(`Dispatch cancelled.`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel dispatch");
    }
  };

  // Handle Issue Actions
  const handleStartInvestigation = async (issue: OperationalIssue) => {
    if (!operation) return;
    try {
      await operationsClient.updateIssue(operation.id, issue.id, {
        status: IssueStatus.IN_PROGRESS,
      });
      toast.success(`Issue "${issue.title}" is now In Progress`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update issue status.");
    }
  };

  const handleResolveIssueClick = (issue: OperationalIssue) => {
    setSelectedIssueForResolve(issue);
    setIssueDialogTargetStatus(IssueStatus.RESOLVED);
  };

  const handleCloseIssueClick = (issue: OperationalIssue) => {
    setSelectedIssueForResolve(issue);
    setIssueDialogTargetStatus(IssueStatus.CLOSED);
  };

  const handleReopenIssue = async (issue: OperationalIssue) => {
    if (!operation) return;
    try {
      await operationsClient.updateIssue(operation.id, issue.id, {
        status: IssueStatus.OPEN,
      });
      toast.success(`Issue "${issue.title}" reopened`);
      fetchOperationData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen issue.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 sm:p-8 max-w-[1550px] mx-auto">
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 sm:p-8 max-w-[1550px] mx-auto">
        <ErrorState
          title="Operation Not Found"
          description={error}
          onRetry={fetchOperationData}
        />
      </div>
    );
  }

  // If no operation exists yet for this trip
  if (!operation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <Activity className="h-12 w-12 text-indigo-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Operation Record Not Initialized</h2>
          <p className="text-xs text-slate-500">
            No active operational file found for trip ID &quot;{tripId}&quot;. Would you like to initialize operation tracking for this trip now?
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push("/operations")}
              className="text-xs font-semibold cursor-pointer"
            >
              Back to Operations
            </Button>
            <Button
              onClick={handleInitializeOperation}
              disabled={initializing || isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              {initializing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Operation"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Read-only Banner */}
        {isReadOnly && (
          <ReadOnlyBanner moduleName="Operations" />
        )}

        {/* ─── TOP BREADCRUMB & HEADER BAR ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/operations" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Operations
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-700">{operation.booking?.bookingNumber || operation.trip.tripNumber}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {operation.trip.title}
              </h1>
              <TripOperationsStatusBadge status={operation.status} />
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Client: <strong>{operation.trip.customer.name}</strong> ({operation.trip.customer.phone})</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                {new Date(operation.trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → {new Date(operation.trip.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span>•</span>
              <span>{operation.trip.travelers?.length || 1} Traveler(s)</span>
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            {/* Communication Modal Trigger */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCommunicationModalOpen(true)}
              className="text-xs font-bold h-9 px-3 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 cursor-pointer shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Guest Message
            </Button>

            {/* Travel Kit Modal Trigger */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTravelKitModalOpen(true)}
              className="text-xs font-bold h-9 px-3 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 border-indigo-200 cursor-pointer shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Travel Kit (PDF)
            </Button>

            {/* Booking Confirmation PDF Link */}
            <a
              href={`/api/operations/${operation.id}/documents/booking/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold h-9 px-3 rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Booking PDF
            </a>

            {/* Status Selector */}
            <Select
              value={operation.status}
              onValueChange={(val) => handleStatusChange(val as OperationStatus)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-9 text-xs font-bold bg-white w-36 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value={OperationStatus.PREPARING}>Preparing</SelectItem>
                <SelectItem value={OperationStatus.READY}>Ready for Trip</SelectItem>
                <SelectItem value={OperationStatus.ONGOING}>On Trip (Ongoing)</SelectItem>
                <SelectItem value={OperationStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={OperationStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Dispatch Departure Button (when in Preparing or Ready) */}
            {(operation.status === OperationStatus.PREPARING || operation.status === OperationStatus.READY) && (
              <Button
                size="sm"
                onClick={() => handleStatusChange(OperationStatus.ONGOING)}
                disabled={isReadOnly}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-3 cursor-pointer shadow-xs"
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Dispatch Tour
              </Button>
            )}

            {/* Log Issue Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsIssueModalOpen(true)}
              disabled={isReadOnly}
              className="text-xs font-bold h-9 px-3 text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer"
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              Log Issue
            </Button>

            {/* Mark Completed Button */}
            {operation.status !== OperationStatus.COMPLETED && (
              <Button
                size="sm"
                onClick={() => setIsCompleteModalOpen(true)}
                disabled={isReadOnly}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold h-9 px-3 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Complete Tour
              </Button>
            )}
          </div>
        </div>

        {/* ─── READINESS BAR & BREAKDOWN ───────────────────────────────────── */}
        {readiness && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`h-5 w-5 ${readiness.isReady ? "text-emerald-600" : "text-amber-600"}`} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Operational Readiness & Checklist
                </h3>
              </div>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${readiness.score === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {readiness.score}% Ready
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${readiness.score === 100 ? "bg-emerald-500" : readiness.score >= 50 ? "bg-indigo-500" : "bg-amber-500"}`}
                style={{ width: `${readiness.score}%` }}
              />
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {readiness.checks.map((check) => (
                <div
                  key={check.key}
                  className={`rounded-xl p-3 border text-xs space-y-0.5 ${check.passed ? "bg-emerald-50/50 border-emerald-100 text-emerald-900" : "bg-amber-50/50 border-amber-100 text-amber-900"}`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{check.passed ? "✓" : "⚠"}</span>
                    <span>{check.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium pl-4">
                    {check.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── WORKSPACE TABS ─────────────────────────────────────────────── */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview" },
              { id: "accommodations", label: `Accommodations (${operation.hotelConfirmations?.length || 0})` },
              { id: "fleet", label: `Fleet & Dispatch (${operation.vehicleDispatches?.length || 0})` },
              { id: "activities", label: `Activities (${operation.activityConfirmations?.length || 0})` },
              { id: "issues", label: `Issues Tracker (${operation.issues?.length || 0})` },
              { id: "documents", label: `Documents & Vouchers (${documentsSummary?.documents?.length || 5})` },
              { id: "timeline", label: `Live Timeline (${timeline.length})` },
              {
                id: "closure",
                label: `Closure & Reconciliation ${
                  closureSummary?.isFinalized
                    ? "🔒"
                    : closureSummary?.closureStatus === "RECONCILED"
                    ? "✓"
                    : ""
                }`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-bold text-xs whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Quick Info & Component Summary */}
            <div className="lg:col-span-8 space-y-5">
              {/* Trip Information Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Tour Details & Customer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Customer Name</span>
                    <span className="font-bold text-slate-800 text-sm">{operation.trip.customer.name}</span>
                    <span className="text-slate-500 block">{operation.trip.customer.phone} • {operation.trip.customer.email || "No email"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Booking Reference</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">{operation.booking?.bookingNumber || "Unattached"}</span>
                    {operation.booking && (
                      <span className="text-slate-500 block">
                        Total: ₹{Number(operation.booking.totalAmount).toLocaleString("en-IN")} • Balance: ₹{Number(operation.booking.balanceAmount).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Travel Dates</span>
                    <span className="font-bold text-slate-800">
                      {new Date(operation.trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} → {new Date(operation.trip.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Traveler Count</span>
                    <span className="font-bold text-slate-800">{operation.trip.travelers?.length || 1} Adult(s)</span>
                  </div>
                </div>
              </div>

              {/* Travelers Manifest */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Traveler Manifest ({operation.trip.travelers?.length || 0})
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {operation.trip.travelers?.map((trav) => (
                    <div key={trav.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{trav.name}</span>
                        {trav.isPrimary && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 uppercase text-[11px] font-semibold">{trav.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Summary & Quick Actions */}
            <div className="lg:col-span-4 space-y-5">
              {/* Operations Checklist Summary */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Component Summary
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <Hotel className="h-4 w-4 text-slate-400" />
                      Hotels
                    </span>
                    <span className="font-bold text-slate-900">
                      {operation.hotelConfirmations?.filter((h) => h.status === "CONFIRMED").length}/{operation.hotelConfirmations?.length || 0} Confirmed
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <Car className="h-4 w-4 text-slate-400" />
                      Vehicle Dispatches
                    </span>
                    <span className="font-bold text-slate-900">
                      {operation.vehicleDispatches?.filter((v) => v.status === "ASSIGNED" || v.status === "CONFIRMED" || v.status === "ON_DUTY").length}/{operation.vehicleDispatches?.length || 0} Assigned
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <Ticket className="h-4 w-4 text-slate-400" />
                      Activities
                    </span>
                    <span className="font-bold text-slate-900">
                      {operation.activityConfirmations?.filter((a) => a.status === "CONFIRMED").length}/{operation.activityConfirmations?.length || 0} Confirmed
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <AlertTriangle className="h-4 w-4 text-slate-400" />
                      Open Issues
                    </span>
                    <span className="font-bold text-rose-600">
                      {operation.issues?.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length || 0} Open
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ACCOMMODATIONS ──────────────────────────────────────── */}
        {activeTab === "accommodations" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Hotel Confirmation Workflow ({operation.hotelConfirmations?.length || 0})
                </h3>
              </div>

              {/* Status Summary Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-700">
                  Total: {operation.hotelConfirmations?.length || 0}
                </span>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                  Confirmed: {operation.hotelConfirmations?.filter((h) => h.status === ConfirmationStatus.CONFIRMED).length || 0}
                </span>
                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                  Requested: {operation.hotelConfirmations?.filter((h) => h.status === ConfirmationStatus.REQUESTED).length || 0}
                </span>
                <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-100">
                  Pending: {operation.hotelConfirmations?.filter((h) => h.status === ConfirmationStatus.PENDING).length || 0}
                </span>
                {operation.hotelConfirmations?.some((h) => h.status === ConfirmationStatus.CANCELLED) && (
                  <span className="bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                    Cancelled: {operation.hotelConfirmations?.filter((h) => h.status === ConfirmationStatus.CANCELLED).length || 0}
                  </span>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-72">
                <Input
                  placeholder="Search by hotel, city, or voucher #..."
                  value={hotelSearch}
                  onChange={(e) => setHotelSearch(e.target.value)}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={hotelStatusFilter}
                  onValueChange={(val) => setHotelStatusFilter(val || "ALL")}
                >
                  <SelectTrigger className="h-8.5 text-xs font-semibold w-full sm:w-40 bg-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value={ConfirmationStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={ConfirmationStatus.REQUESTED}>Requested</SelectItem>
                    <SelectItem value={ConfirmationStatus.CONFIRMED}>Confirmed</SelectItem>
                    <SelectItem value={ConfirmationStatus.AMENDED}>Amended</SelectItem>
                    <SelectItem value={ConfirmationStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {(hotelSearch || hotelStatusFilter !== "ALL") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setHotelSearch("");
                      setHotelStatusFilter("ALL");
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 h-8.5 px-2 cursor-pointer"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Hotel Cards List */}
            {operation.hotelConfirmations?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No hotel accommodations attached to this tour itinerary.
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {operation.hotelConfirmations
                  ?.filter((h) => {
                    if (hotelStatusFilter !== "ALL" && h.status !== hotelStatusFilter) return false;
                    if (hotelSearch.trim()) {
                      const q = hotelSearch.toLowerCase();
                      const name = (h.tripHotel?.hotel?.name || "").toLowerCase();
                      const city = (h.tripHotel?.hotel?.city || "").toLowerCase();
                      const supp = (h.supplier?.name || "").toLowerCase();
                      const conf = (h.confirmationNumber || "").toLowerCase();
                      if (!name.includes(q) && !city.includes(q) && !supp.includes(q) && !conf.includes(q)) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map((hotelConf) => (
                    <HotelConfirmationCard
                      key={hotelConf.id}
                      hotelConfirmation={hotelConf}
                      isReadOnly={isReadOnly}
                      onOpenDialog={(hotel, mode) => {
                        setHotelForDialog(hotel);
                        setHotelDialogMode(mode);
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: FLEET & DISPATCH ────────────────────────────────────── */}
        {activeTab === "fleet" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Chauffeur & Fleet Dispatch ({operation.vehicleDispatches?.length || 0})
                </h3>
              </div>

              {/* Status Summary Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-700">
                  Total: {operation.vehicleDispatches?.length || 0}
                </span>
                <span className="bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded-full border border-teal-100">
                  Confirmed: {operation.vehicleDispatches?.filter((v) => v.status === DispatchStatus.CONFIRMED).length || 0}
                </span>
                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                  On Duty: {operation.vehicleDispatches?.filter((v) => v.status === DispatchStatus.ON_DUTY).length || 0}
                </span>
                <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                  Assigned: {operation.vehicleDispatches?.filter((v) => v.status === DispatchStatus.ASSIGNED).length || 0}
                </span>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                  Completed: {operation.vehicleDispatches?.filter((v) => v.status === DispatchStatus.COMPLETED).length || 0}
                </span>
                {operation.vehicleDispatches?.some((v) => v.status === DispatchStatus.CANCELLED) && (
                  <span className="bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                    Cancelled: {operation.vehicleDispatches?.filter((v) => v.status === DispatchStatus.CANCELLED).length || 0}
                  </span>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-72">
                <Input
                  placeholder="Search by driver, plate #, route, vehicle..."
                  value={dispatchSearch}
                  onChange={(e) => setDispatchSearch(e.target.value)}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={dispatchStatusFilter}
                  onValueChange={(val) => setDispatchStatusFilter(val || "ALL")}
                >
                  <SelectTrigger className="h-8.5 text-xs font-semibold w-full sm:w-40 bg-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value={DispatchStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={DispatchStatus.ASSIGNED}>Assigned</SelectItem>
                    <SelectItem value={DispatchStatus.CONFIRMED}>Confirmed</SelectItem>
                    <SelectItem value={DispatchStatus.ON_DUTY}>On Duty</SelectItem>
                    <SelectItem value={DispatchStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={DispatchStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {(dispatchSearch || dispatchStatusFilter !== "ALL") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDispatchSearch("");
                      setDispatchStatusFilter("ALL");
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 h-8.5 px-2 cursor-pointer"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Dispatch Cards List */}
            {operation.vehicleDispatches?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No vehicles or transport dispatches scheduled for this trip.
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {operation.vehicleDispatches
                  ?.filter((d) => {
                    if (dispatchStatusFilter !== "ALL" && d.status !== dispatchStatusFilter) return false;
                    if (dispatchSearch.trim()) {
                      const q = dispatchSearch.toLowerCase();
                      const vName = (d.tripVehicle?.vehicleName || d.vehicle?.name || "").toLowerCase();
                      const dName = (d.driverName || "").toLowerCase();
                      const dPhone = (d.driverPhone || "").toLowerCase();
                      const plate = (d.vehicleNumber || d.vehicle?.registrationNumber || "").toLowerCase();
                      const route = `${d.pickupLocation || ""} ${d.dropLocation || ""}`.toLowerCase();
                      if (!vName.includes(q) && !dName.includes(q) && !dPhone.includes(q) && !plate.includes(q) && !route.includes(q)) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map((dispatch) => (
                    <VehicleDispatchCard
                      key={dispatch.id}
                      dispatch={dispatch}
                      isReadOnly={isReadOnly}
                      onAssignDriver={(d) => setSelectedDispatchForDriver(d)}
                      onReportDelay={(d) => setSelectedDispatchForDelay(d)}
                      onConfirmDispatch={handleConfirmDispatch}
                      onStartDuty={handleStartDuty}
                      onCompleteDuty={handleCompleteDuty}
                      onCancelDispatch={handleCancelDispatch}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: ACTIVITIES ──────────────────────────────────────────── */}
        {activeTab === "activities" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Activity & Excursion Bookings ({operation.activityConfirmations?.length || 0})
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manage sightseeing vouchers, entry passes, supplier confirmations, and schedule amendments
                </p>
              </div>
            </div>

            {/* Activities KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total</span>
                <span className="text-lg font-black text-slate-900">{operation.activityConfirmations?.length || 0}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Confirmed</span>
                <span className="text-lg font-black text-emerald-800">
                  {operation.activityConfirmations?.filter((a) => a.status === ConfirmationStatus.CONFIRMED).length || 0}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Requested</span>
                <span className="text-lg font-black text-blue-800">
                  {operation.activityConfirmations?.filter((a) => a.status === ConfirmationStatus.REQUESTED).length || 0}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Amended</span>
                <span className="text-lg font-black text-amber-800">
                  {operation.activityConfirmations?.filter((a) => a.status === ConfirmationStatus.AMENDED).length || 0}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Pending</span>
                <span className="text-lg font-black text-slate-700">
                  {operation.activityConfirmations?.filter((a) => a.status === ConfirmationStatus.PENDING).length || 0}
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Cancelled</span>
                <span className="text-lg font-black text-rose-800">
                  {operation.activityConfirmations?.filter((a) => a.status === ConfirmationStatus.CANCELLED).length || 0}
                </span>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search activities by name, provider, location, confirmation #, ticket #..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-8 text-xs h-8.5 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={activityStatusFilter}
                  onValueChange={(val) => setActivityStatusFilter(val || "ALL")}
                >
                  <SelectTrigger className="text-xs h-8.5 w-36 bg-slate-50/50">
                    <SelectValue placeholder="Status Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value={ConfirmationStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={ConfirmationStatus.REQUESTED}>Requested</SelectItem>
                    <SelectItem value={ConfirmationStatus.CONFIRMED}>Confirmed</SelectItem>
                    <SelectItem value={ConfirmationStatus.AMENDED}>Amended</SelectItem>
                    <SelectItem value={ConfirmationStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Activities List */}
            {operation.activityConfirmations?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No activities or excursions planned for this trip.
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {operation.activityConfirmations
                  ?.filter((act) => {
                    if (activityStatusFilter !== "ALL" && act.status !== activityStatusFilter) return false;
                    if (activitySearch.trim()) {
                      const q = activitySearch.toLowerCase();
                      const name = (act.tripActivity?.name || act.activity?.name || "").toLowerCase();
                      const loc = (act.tripActivity?.location || act.activity?.location || "").toLowerCase();
                      const supplier = (
                        (act.activity as any)?.supplier?.name ||
                        (act.tripActivity?.activity as any)?.supplier?.name ||
                        ""
                      ).toLowerCase();
                      const confNum = (act.confirmationNumber || "").toLowerCase();
                      const tktNum = (act.ticketNumber || "").toLowerCase();
                      if (!name.includes(q) && !loc.includes(q) && !supplier.includes(q) && !confNum.includes(q) && !tktNum.includes(q)) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map((actConf) => (
                    <ActivityConfirmationCard
                      key={actConf.id}
                      activityConfirmation={actConf}
                      operationId={operation.id}
                      isReadOnly={isReadOnly}
                      onOpenDialog={(act, mode) => {
                        setSelectedActivityForDialog(act);
                        setActivityDialogMode(mode);
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: ISSUES TRACKER ──────────────────────────────────────── */}
        {activeTab === "issues" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Operational Issues & Escalations ({operation.issues?.length || 0})
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Track blockers, delays, guest escalations, and resolution notes
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsIssueModalOpen(true)}
                disabled={isReadOnly}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-8 px-3 cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Report New Issue
              </Button>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search issues by title, description, reporter or assignee..."
                  value={issueSearchQuery}
                  onChange={(e) => setIssueSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8.5 bg-slate-50/50"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={issueStatusFilter}
                  onValueChange={(val) => setIssueStatusFilter(val || "ALL")}
                >
                  <SelectTrigger className="text-xs h-8.5 w-32 bg-slate-50/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={issuePriorityFilter}
                  onValueChange={(val) => setIssuePriorityFilter(val || "ALL")}
                >
                  <SelectTrigger className="text-xs h-8.5 w-32 bg-slate-50/50">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Issues List */}
            {operation.issues?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No operational issues or escalations reported for this tour.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {operation.issues
                  ?.filter((issue) => {
                    if (issueStatusFilter !== "ALL" && issue.status !== issueStatusFilter) return false;
                    if (issuePriorityFilter !== "ALL" && issue.priority !== issuePriorityFilter) return false;
                    if (issueSearchQuery.trim()) {
                      const q = issueSearchQuery.toLowerCase();
                      const matchTitle = issue.title.toLowerCase().includes(q);
                      const matchDesc = (issue.description || "").toLowerCase().includes(q);
                      const matchReporter = (issue.reportedBy || "").toLowerCase().includes(q);
                      const matchAssignee = (issue.assignedTo || "").toLowerCase().includes(q);
                      if (!matchTitle && !matchDesc && !matchReporter && !matchAssignee) return false;
                    }
                    return true;
                  })
                  .map((issue) => (
                    <OperationalIssueCard
                      key={issue.id}
                      issue={issue}
                      isReadOnly={isReadOnly}
                      onStartInvestigation={handleStartInvestigation}
                      onResolve={(i) => {
                        setSelectedIssueForResolve(i);
                        setIssueDialogTargetStatus(IssueStatus.RESOLVED);
                      }}
                      onCloseIssue={(i) => {
                        setSelectedIssueForResolve(i);
                        setIssueDialogTargetStatus(IssueStatus.CLOSED);
                      }}
                      onReopen={handleReopenIssue}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: DOCUMENTS & TRAVEL KIT ──────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Operational Documents & Official Travel Vouchers
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Generate, preview, and download sanitized guest-facing vouchers and Travel Kits
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsTravelKitModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8.5 px-3.5 cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Generate Travel Kit Pack
              </Button>
            </div>

            {/* Travel Kit Banner */}
            <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-slate-50 border border-indigo-100/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    MASTER TRAVEL KIT
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Comprehensive Guest Itinerary & Stay Pack
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Consolidates full day-by-day itineraries, confirmed hotel bookings, assigned chauffeurs, entry passes, and 24/7 concierge contacts into a single printable PDF.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/operations/${operation.id}/documents/travel-kit/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Travel Kit (PDF)
                </a>
              </div>
            </div>

            {/* Documents Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Available Document Roster ({documentsSummary?.documents?.length || 0})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {documentsSummary?.documents?.map((docItem: any) => (
                  <div
                    key={docItem.id + docItem.type}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {docItem.documentNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            docItem.isReady
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {docItem.status}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-900 leading-snug">
                        {docItem.title}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {docItem.subtitle}
                      </p>

                      {docItem.warnings && docItem.warnings.length > 0 && (
                        <div className="text-[11px] text-amber-700 bg-amber-50/60 border border-amber-100 p-2 rounded-lg space-y-0.5">
                          {docItem.warnings.map((w: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                      <a
                        href={docItem.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold h-8 px-3.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 7: LIVE TIMELINE ───────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Operational Audit & Lifecycle Timeline ({timeline.length})
              </h3>
            </div>

            {timeline.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No timeline events recorded yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((event) => (
                  <div key={event.id} className="relative space-y-1">
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900">{event.description}</span>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {new Date(event.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Event: {event.eventType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 8: OPERATIONS CLOSURE & FINANCIAL RECONCILIATION ───────── */}
        {activeTab === "closure" && (
          <div className="space-y-6">
            {closureSummary ? (
              <>
                {/* 1. Finalization Status & Immutability Lock */}
                <FinalizationChecklistCard
                  summary={closureSummary}
                  onSuccess={fetchOperationData}
                />

                {/* 2. Service Delivery & Discrepancies Reconciliation */}
                <ServiceReconciliationCard summary={closureSummary} />

                {/* 3. Post-Tour Quality Review */}
                <PostTourReviewCard
                  summary={closureSummary}
                  onSuccess={fetchOperationData}
                />

                {/* 4. Internal Financial & Cost Reconciliation */}
                <FinancialReconciliationCard
                  summary={closureSummary}
                  onSuccess={fetchOperationData}
                />
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading Operations Closure & Reconciliation summary...
              </div>
            )}
          </div>
        )}
      </div>

      {hotelForDialog && (
        <HotelConfirmationDialog
          operationId={operation.id}
          hotelConfirmation={hotelForDialog}
          mode={hotelDialogMode}
          isOpen={!!hotelForDialog}
          onClose={() => setHotelForDialog(null)}
          onSuccess={fetchOperationData}
        />
      )}

      {selectedActivityForDialog && (
        <ActivityConfirmationDialog
          operationId={operation.id}
          activityConfirmation={selectedActivityForDialog}
          mode={activityDialogMode}
          isOpen={!!selectedActivityForDialog}
          onClose={() => setSelectedActivityForDialog(null)}
          onSuccess={fetchOperationData}
        />
      )}

      {selectedDispatchForDriver && (
        <AssignDriverModal
          operationId={operation.id}
          dispatch={selectedDispatchForDriver}
          isOpen={!!selectedDispatchForDriver}
          onClose={() => setSelectedDispatchForDriver(null)}
          onSuccess={fetchOperationData}
        />
      )}

      {selectedDispatchForDelay && (
        <ReportDelayModal
          operationId={operation.id}
          dispatch={selectedDispatchForDelay}
          isOpen={!!selectedDispatchForDelay}
          onClose={() => setSelectedDispatchForDelay(null)}
          onSuccess={fetchOperationData}
        />
      )}

      {selectedActivityForReschedule && (
        <RescheduleActivityModal
          operationId={operation.id}
          activityConfirmation={selectedActivityForReschedule}
          isOpen={!!selectedActivityForReschedule}
          onClose={() => setSelectedActivityForReschedule(null)}
          onSuccess={fetchOperationData}
        />
      )}

      <CreateIssueModal
        operationId={operation.id}
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={fetchOperationData}
      />

      <ResolveIssueDialog
        isOpen={!!selectedIssueForResolve}
        onClose={() => setSelectedIssueForResolve(null)}
        onSuccess={fetchOperationData}
        operationId={operation.id}
        issue={selectedIssueForResolve}
        targetStatus={issueDialogTargetStatus}
      />

      <CompleteTripModal
        operation={operation}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onSuccess={fetchOperationData}
      />

      <CommunicationModal
        operation={operation}
        isOpen={isCommunicationModalOpen}
        onClose={() => setIsCommunicationModalOpen(false)}
        onSuccess={fetchOperationData}
      />

      {operation && (
        <TravelKitReadinessModal
          isOpen={isTravelKitModalOpen}
          onClose={() => setIsTravelKitModalOpen(false)}
          tripTitle={operation.trip.title}
          tripNumber={operation.trip.tripNumber || "N/A"}
          readinessScore={readiness?.score || 100}
          totalHotels={readiness?.totalHotels || operation.hotelConfirmations?.length || 0}
          confirmedHotels={readiness?.confirmedHotels || 0}
          totalVehicles={readiness?.totalVehicles || operation.vehicleDispatches?.length || 0}
          assignedVehicles={readiness?.confirmedVehicles || 0}
          totalActivities={readiness?.totalActivities || operation.activityConfirmations?.length || 0}
          confirmedActivities={readiness?.confirmedActivities || 0}
          openCriticalIssues={readiness?.criticalIssuesCount || 0}
          downloadUrl={`/api/operations/${operation.id}/documents/travel-kit/pdf`}
        />
      )}
    </div>
  );
}
