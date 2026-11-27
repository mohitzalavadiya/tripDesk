"use client";

import { useAuth } from "@/context/auth-context";
import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";

import { AssignLeadModal } from "@/components/enquiries/assign-lead-modal";
import { PriorityBadge,StatusBadge } from "@/components/enquiries/status-badge";
import { QuickLogModal } from "@/components/enquiries/quick-log-modal";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { classifyEnquiryUrgency, stripIdempotencyMarker } from "@/lib/utils/crm-urgency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuGroup,
DropdownMenuItem,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
CrmTimelineEvent,
enquiryClient,
EnquiryWithRelations,
followUpClient,
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { formatEnumLabel } from "@/lib/utils/enum-formatters";
import { STANDARD_LOST_REASONS } from "@/lib/validation/enquiry-schema";
import {
EnquiryFollowUp,
EnquiryPriority,
EnquiryStatus,
FollowUpStatus,
FollowUpType,
} from "@prisma/client";
import {
AlertCircle,
AlertTriangle,
ArrowLeft,
Calendar,
CalendarDays,
Check,
CheckCircle2,
Clock,
Compass,
ExternalLink,
FileText,
Info,
Loader2,
Mail,
MessageSquare,
MoreVertical,
Phone,
Plus,
Trash2,
TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams,useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

export default function EnquiryDetailPage() {
  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("ENQUIRY_DETAIL", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Enquiry Details"
          badgeText="Access Restricted"
          description="You do not have permission to view this section. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [enquiry, setEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [timeline, setTimeline] = React.useState<CrmTimelineEvent[]>([]);
  const [isRepeatCustomer, setIsRepeatCustomer] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "timeline" | "followups">("overview");

  // Quick-Log Modal State
  const [isQuickLogOpen, setIsQuickLogOpen] = React.useState(false);
  const [quickLogFollowUpId, setQuickLogFollowUpId] = React.useState<string | null>(null);

  // Assign / Handoff Modal State
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);

  // Follow-up Schedule Modal State
  const [isFollowUpOpen, setIsFollowUpOpen] = React.useState(false);
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [followUpTime, setFollowUpTime] = React.useState("10:00");
  const [followUpType, setFollowUpType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [followUpPriority, setFollowUpPriority] = React.useState<EnquiryPriority>(EnquiryPriority.MEDIUM);
  const [followUpNotes, setFollowUpNotes] = React.useState("");
  const [savingFollowUp, setSavingFollowUp] = React.useState(false);

  // Complete Follow-up Modal State
  const [completeModalOpen, setCompleteModalOpen] = React.useState(false);
  const [activeFollowUp, setActiveFollowUp] = React.useState<EnquiryFollowUp | null>(null);
  const [outcome, setOutcome] = React.useState("");
  const [completeNotes, setCompleteNotes] = React.useState("");
  const [scheduleNext, setScheduleNext] = React.useState(false);
  const [nextType, setNextType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [nextPriority, setNextPriority] = React.useState<EnquiryPriority>(EnquiryPriority.MEDIUM);
  const [nextDate, setNextDate] = React.useState("");
  const [nextTime, setNextTime] = React.useState("10:00");
  const [nextNotes, setNextNotes] = React.useState("");
  const [savingComplete, setSavingComplete] = React.useState(false);

  // Mark as Lost Modal State
  const [lostModalOpen, setLostModalOpen] = React.useState(false);
  const [lostReason, setLostReason] = React.useState<string>("PRICE_TOO_HIGH");
  const [lostExplanation, setLostExplanation] = React.useState("");
  const [savingLost, setSavingLost] = React.useState(false);

  // Convert to Trip Modal State
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);
  const [tripTitle, setTripTitle] = React.useState("");
  const [tripNotes, setTripNotes] = React.useState("");
  const [converting, setConverting] = React.useState(false);

  // Archive Enquiry Modal State
  const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);

  // Internal Notes Editing
  const [internalNotes, setInternalNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Fetch real enquiry details and CRM timeline
  const fetchEnquiry = React.useCallback(async (isSilent = false) => {
    const silent = isSilent || Boolean(enquiry);
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [enquiryRes, timelineRes] = await Promise.all([
        enquiryClient.getEnquiry(id),
        enquiryClient.getTimeline(id),
      ]);

      if (enquiryRes.success && enquiryRes.data) {
        setEnquiry(enquiryRes.data);
        setTripTitle(enquiryRes.data.title || `${enquiryRes.data.destination} Trip`);
        setInternalNotes(enquiryRes.data.internalNotes || "");
        if (enquiryRes.data.isRepeatCustomer !== undefined) {
          setIsRepeatCustomer(Boolean(enquiryRes.data.isRepeatCustomer));
        }
      }

      if (timelineRes.success && timelineRes.data) {
        setTimeline(timelineRes.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load enquiry record.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) fetchEnquiry();
  }, [id, fetchEnquiry]);

  // Handle Quick Log Completion & Timeline Refresh
  const handleQuickLogSuccess = async () => {
    await fetchEnquiry();
  };

  // Update Status / Stage
  const handleStageChange = async (status: EnquiryStatus) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (status === EnquiryStatus.CONVERTED) {
      toast.error("Leads cannot be manually converted. An enquiry is automatically converted when a linked booking is confirmed.");
      return;
    }

    if (status === EnquiryStatus.LOST) {
      setLostModalOpen(true);
      return;
    }

    try {
      await enquiryClient.transitionStage(id, { status });
      toast.success(`Enquiry stage updated to ${status}.`);
      await fetchEnquiry();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update stage.");
    }
  };

  // Submit Mark as Lost
  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostReason) {
      toast.error("Please select a structured lost reason.");
      return;
    }

    try {
      setSavingLost(true);
      const res = await enquiryClient.markLost(id, {
        lostReason,
        lostExplanation: lostExplanation.trim() || undefined,
      });

      if (res.success) {
        toast.success("Lead marked as LOST.");
        setLostModalOpen(false);
        await fetchEnquiry();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to record lost reason.");
    } finally {
      setSavingLost(false);
    }
  };

  // Update Priority
  const handlePriorityChange = async (priority: EnquiryPriority) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      await enquiryClient.updateEnquiry(id, { priority });
      toast.success(`Priority updated to ${priority}.`);
      await fetchEnquiry();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update priority.");
    }
  };

  // Save Internal Notes
  const handleSaveInternalNotes = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      setSavingNotes(true);
      await enquiryClient.updateEnquiry(id, { internalNotes });
      toast.success("Internal agency notes updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save internal notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  // Convert to Trip
  const handleConvertTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      setConverting(true);
      const res = await enquiryClient.convertEnquiry(id, {
        title: tripTitle.trim() || undefined,
        notes: tripNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success("Enquiry successfully converted to Trip workspace!");
        setIsConvertOpen(false);
        router.push(`/trips/${res.data.tripId}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to convert enquiry.");
    } finally {
      setConverting(false);
    }
  };

  // Schedule Follow-Up
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) {
      toast.error("Please choose a date for the follow-up.");
      return;
    }

    try {
      setSavingFollowUp(true);
      const scheduledAt = new Date(`${followUpDate}T${followUpTime || "10:00"}:00`);

      const res = await enquiryClient.createFollowUp(id, {
        type: followUpType,
        priority: followUpPriority,
        scheduledAt,
        notes: followUpNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Follow-up scheduled successfully!");
        setIsFollowUpOpen(false);
        setFollowUpNotes("");
        await fetchEnquiry();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule follow-up.");
    } finally {
      setSavingFollowUp(false);
    }
  };

  // Open Complete Modal
  const handleOpenCompleteFollowUp = (fu: EnquiryFollowUp) => {
    setActiveFollowUp(fu);
    setOutcome("");
    setCompleteNotes("");
    setScheduleNext(false);
    const nextWeek = new Date(Date.now() + 86400000 * 3);
    setNextDate(nextWeek.toISOString().split("T")[0]);
    setNextTime("10:00");
    setNextType(FollowUpType.CALL);
    setNextPriority(EnquiryPriority.MEDIUM);
    setNextNotes("");
    setCompleteModalOpen(true);
  };

  // Submit Complete Follow-Up
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUp) return;

    try {
      setSavingComplete(true);
      let nextPayload = null;
      if (scheduleNext && nextDate) {
        nextPayload = {
          type: nextType,
          priority: nextPriority,
          scheduledAt: new Date(`${nextDate}T${nextTime || "10:00"}:00`),
          notes: nextNotes.trim() || undefined,
        };
      }

      const res = await followUpClient.completeFollowUp(activeFollowUp.id, {
        outcome: outcome.trim() || undefined,
        notes: completeNotes.trim() || undefined,
        scheduleNext,
        nextFollowUp: nextPayload,
      });

      if (res.success) {
        toast.success(
          scheduleNext
            ? "Follow-up completed & next interaction scheduled!"
            : "Follow-up marked as completed!"
        );
        setCompleteModalOpen(false);
        await fetchEnquiry();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete follow-up.");
    } finally {
      setSavingComplete(false);
    }
  };

  // Delete Follow-Up
  const handleDeleteFollowUp = async (followUpId: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      await enquiryClient.deleteFollowUp(id, followUpId);
      toast.success("Follow-up removed.");
      await fetchEnquiry();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove follow-up.");
    }
  };

  // Soft Archive Enquiry
  const handleArchiveEnquiry = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!enquiry) return;

    try {
      setArchiving(true);
      await enquiryClient.archiveEnquiry(id);
      toast.success(`Enquiry ${enquiry.enquiryNumber} archived.`);
      setIsArchiveOpen(false);
      router.push("/enquiries");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive enquiry.");
    } finally {
      setArchiving(false);
    }
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTimeDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading enquiry workspace...</h3>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertTriangle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Enquiry Record Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested enquiry does not exist or has been archived."}
        </p>
        <Link href="/enquiries" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Enquiries
          </Button>
        </Link>
      </div>
    );
  }

  const totalPax = enquiry.adults + enquiry.children + enquiry.infants;

  const PIPELINE_STAGES: { key: EnquiryStatus; label: string }[] = [
    { key: "NEW", label: "New Lead" },
    { key: "CONTACTED", label: "Contacted" },
    { key: "QUALIFIED", label: "Qualified" },
    { key: "QUOTATION_SENT", label: "Quotation Sent" },
    { key: "NEGOTIATION", label: "Negotiation" },
    { key: "CONVERTED", label: "Won / Converted" },
  ];

  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.key === enquiry.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-4 sm:space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Enquiry Workspace" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/enquiries"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                <Info className="h-3 w-3 text-blue-500" />
                Lead CRM
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <StatusBadge status={enquiry.status} className="shrink-0" />
              <PriorityBadge priority={enquiry.priority} className="shrink-0" />
            </div>

            <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 break-words">
                {enquiry.title || `${enquiry.destination} Trip`}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {enquiry.enquiryNumber} •{" "}
                {enquiry.customer?.id ? (
                  <Link
                    href={`/customers/${enquiry.customer.id}`}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                    title="View Customer 360 Workspace"
                  >
                    {enquiry.customer.name}
                  </Link>
                ) : (
                  enquiry.customer?.name
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Compass className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                Destination: <strong>{enquiry.destination}</strong>
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Dates: <strong>{formatDateDisplay(enquiry.startDate)} → {formatDateDisplay(enquiry.endDate)}</strong>
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Captured on {formatDateDisplay(enquiry.createdAt)}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setIsAssignOpen(true)}
                disabled={isReadOnly}
                className="inline-flex items-center gap-1.5 transition-all cursor-pointer font-medium disabled:cursor-default"
                title="Click to assign or reassign lead"
              >
                {enquiry.assignedTo ? (
                  <span className="inline-flex items-center gap-1 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg text-xs font-semibold">
                    <UserCheck className="h-3 w-3 text-indigo-600" />
                    Owner: <strong>{enquiry.assignedTo}</strong>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold">
                    <UserX className="h-3 w-3 text-amber-600" />
                    Unassigned (Assign Lead)
                  </span>
                )}
              </button>
            </div>

            {/* Sales Progression Trail (Lead → Trip → Proposal → Booking) */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                Workflow:
              </span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200/80">
                <CheckCircle2 className="h-3 w-3 text-slate-500" />
                <span>Lead Captured</span>
              </div>
              <span className="text-slate-300">→</span>
              {enquiry.convertedTrip ? (
                <Link
                  href={`/trips/${enquiry.convertedTrip.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors"
                  title="Open Trip Itinerary Workspace"
                >
                  <Compass className="h-3 w-3 text-indigo-600" />
                  <span>Trip: {enquiry.convertedTrip.tripNumber || "View"}</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-100 text-indigo-800">
                    {enquiry.convertedTrip.status}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConvertOpen(true)}
                  disabled={isReadOnly || ["LOST", "CANCELLED", "CONVERTED"].includes(enquiry.status)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200/80 transition-colors cursor-pointer disabled:cursor-default disabled:opacity-60"
                  title="Convert lead to trip workspace"
                >
                  <Plus className="h-3 w-3 text-amber-600" />
                  <span>Trip: Not Created</span>
                </button>
              )}
              <span className="text-slate-300">→</span>
              {enquiry.convertedQuotation ? (
                <Link
                  href={`/quotations/${enquiry.convertedQuotation.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition-colors"
                  title="Open Quotation Proposal"
                >
                  <FileText className="h-3 w-3 text-emerald-600" />
                  <span>Quote: {enquiry.convertedQuotation.quotationNumber}</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    {enquiry.convertedQuotation.status}
                  </span>
                </Link>
              ) : enquiry.convertedTripId ? (
                <Link
                  href={`/trips/${enquiry.convertedTripId}/quotation`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium border border-slate-200 transition-colors"
                  title="Build quotation proposal in trip workspace"
                >
                  <Plus className="h-3 w-3 text-slate-400" />
                  <span>Quote: Pending</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 font-medium border border-slate-200">
                  <span>Quote: Pending</span>
                </span>
              )}
              <span className="text-slate-300">→</span>
              {(() => {
                const confirmedBooking = enquiry.convertedTrip?.bookings?.[0];
                if (confirmedBooking) {
                  return (
                    <Link
                      href={`/bookings/${confirmedBooking.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 hover:bg-emerald-200 transition-colors"
                      title="Open Confirmed Booking Workspace"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                      <span>Booking: #{confirmedBooking.bookingNumber}</span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-200 text-emerald-900">
                        {confirmedBooking.status}
                      </span>
                    </Link>
                  );
                }
                if (enquiry.status === "CONVERTED") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>Won / Converted</span>
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 font-medium border border-slate-200">
                    <span>Booking: Awaiting</span>
                  </span>
                );
              })()}
            </div>

            {/* Next Action / Follow-up Urgency Banner */}
            {(() => {
              const urgencyResult = classifyEnquiryUrgency(enquiry);
              const primaryAction = urgencyResult.primaryNextAction;
              const isTerminal = ["CONVERTED", "LOST", "CANCELLED"].includes(enquiry.status);

              if (primaryAction) {
                const isOverdue = urgencyResult.urgency === "OVERDUE";
                const isToday = urgencyResult.urgency === "DUE_TODAY";
                return (
                  <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                    isOverdue
                      ? "bg-rose-50/70 border-rose-200/80 text-rose-900"
                      : isToday
                      ? "bg-amber-50/70 border-amber-200/80 text-amber-900"
                      : "bg-indigo-50/60 border-indigo-100 text-indigo-900"
                  }`}>
                    <div className="flex items-center gap-2">
                      {primaryAction.type === "CALL" ? (
                        <Phone className={`h-4 w-4 ${isOverdue ? "text-rose-600" : isToday ? "text-amber-600" : "text-indigo-600"}`} />
                      ) : primaryAction.type === "WHATSAPP" ? (
                        <MessageSquare className={`h-4 w-4 ${isOverdue ? "text-rose-600" : isToday ? "text-amber-600" : "text-indigo-600"}`} />
                      ) : primaryAction.type === "EMAIL" ? (
                        <Mail className={`h-4 w-4 ${isOverdue ? "text-rose-600" : isToday ? "text-amber-600" : "text-indigo-600"}`} />
                      ) : (
                        <Clock className={`h-4 w-4 ${isOverdue ? "text-rose-600" : isToday ? "text-amber-600" : "text-indigo-600"}`} />
                      )}
                      <div>
                        <span className="font-bold">Next Action: </span>
                        <span className="font-semibold">
                          {primaryAction.type} •{" "}
                          {new Date(primaryAction.scheduledAt).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(primaryAction.scheduledAt).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isOverdue && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200/70 text-rose-800">
                            Overdue by {urgencyResult.daysDiff}d
                          </span>
                        )}
                        {isToday && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/70 text-amber-800">
                            Due Today
                          </span>
                        )}
                        {primaryAction.notes && (
                          <span className="ml-1 text-[11px] text-slate-500 italic max-w-xs truncate hidden md:inline">
                            ({stripIdempotencyMarker(primaryAction.notes)})
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isReadOnly}
                      onClick={() => {
                        setQuickLogFollowUpId(primaryAction.id);
                        setIsQuickLogOpen(true);
                      }}
                      className={`h-7 px-2.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs ${
                        isOverdue
                          ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300"
                          : isToday
                          ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                          : "bg-white hover:bg-indigo-100 text-indigo-800 border-indigo-200"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Log & Complete
                    </Button>
                  </div>
                );
              }

              if (!isTerminal) {
                return (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 text-amber-900 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        <strong className="font-bold">No Follow-up Scheduled:</strong> This lead has no pending next task. Schedule an interaction to keep it active.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isReadOnly}
                        onClick={() => {
                          setQuickLogFollowUpId(null);
                          setIsQuickLogOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs font-semibold bg-white text-teal-800 border-teal-300 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        <Phone className="h-3 w-3 mr-1 text-teal-600" />
                        Quick Log Interaction
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isReadOnly}
                        onClick={() => {
                          setFollowUpDate(new Date().toISOString().split("T")[0]);
                          setIsFollowUpOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Schedule Follow-up
                      </Button>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 z-10">
              {enquiry.customer?.phone && (
                <a
                  href={`https://wa.me/${enquiry.customer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 h-9 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                  title="Open WhatsApp Chat"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              )}

              <Button
                onClick={() => {
                  setQuickLogFollowUpId(null);
                  setIsQuickLogOpen(true);
                }}
                disabled={isReadOnly}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 px-3.5 sm:px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Phone className="h-4 w-4" />
                <span>Log Interaction</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsAssignOpen(true)}
                disabled={isReadOnly}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs gap-1.5 cursor-pointer disabled:opacity-50"
                title="Assign or hand off lead"
              >
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <span>{enquiry.assignedTo ? "Reassign Lead" : "Assign Owner"}</span>
              </Button>

            {enquiry.convertedTripId ? (
              <Button
                onClick={() => router.push(`/trips/${enquiry.convertedTripId}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3.5 sm:px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                Open Converted Trip
              </Button>
            ) : (
              <Button
                onClick={() => setIsConvertOpen(true)}
                disabled={isReadOnly || enquiry.status === "LOST" || enquiry.status === "CANCELLED" || enquiry.status === "CONVERTED"}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-3.5 sm:px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Compass className="h-4 w-4" />
                Convert to Trip
              </Button>
            )}

            {enquiry.status !== "LOST" && enquiry.status !== "CONVERTED" && enquiry.status !== "CANCELLED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLostModalOpen(true)}
                disabled={isReadOnly}
                className="bg-white hover:bg-rose-50 text-rose-700 border-rose-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
              >
                Mark as Lost
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFollowUpDate(new Date().toISOString().split("T")[0]);
                setIsFollowUpOpen(true);
              }}
              disabled={isReadOnly}
              className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Schedule Follow-up
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-slate-50 border-slate-200 h-9 w-9 p-0 rounded-xl shadow-2xs cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setIsArchiveOpen(true)}
                    disabled={isReadOnly}
                    className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" />
                    Archive Enquiry
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* PIPELINE STAGE PROGRESSION BAR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
              Lead Pipeline Stage Progression
            </span>
            {enquiry.status === "LOST" && (
              <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                Closed as Lost ({enquiry.lostReason || "No reason"})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {PIPELINE_STAGES.map((st, idx) => {
              const isCurrent = enquiry.status === st.key;
              const isPastStage = currentStageIndex > idx && enquiry.status !== "LOST";

              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => handleStageChange(st.key)}
                  disabled={isReadOnly || enquiry.status === "CONVERTED"}
                  className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                    isCurrent
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : isPastStage
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isPastStage && <Check className="h-3 w-3 text-emerald-600" />}
                    <span>{st.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap -mx-3 px-3 sm:mx-0 sm:px-0">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className={`text-xs font-semibold shrink-0 cursor-pointer ${
              activeTab === "overview" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="hidden sm:inline">Lead Specification & Requirements</span>
            <span className="sm:hidden">Requirements</span>
          </Button>

          <Button
            variant={activeTab === "timeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("timeline")}
            className={`text-xs font-semibold gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "timeline" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">CRM Activity Timeline ({timeline.length})</span>
            <span className="sm:hidden">Timeline ({timeline.length})</span>
          </Button>

          <Button
            variant={activeTab === "followups" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("followups")}
            className={`text-xs font-semibold gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "followups" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Follow-up Tasks ({enquiry.followUps?.length || 0})</span>
            <span className="sm:hidden">Follow-ups ({enquiry.followUps?.length || 0})</span>
          </Button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "overview" && (
              <>
                {/* Connected Sales Workspaces & Lead Progression Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Compass className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Connected Workspaces & Sales Progression</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Enquiry → Trip → Quotation → Won Booking
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Linked Trip Workspace */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Trip Itinerary Workspace
                          </span>
                          {enquiry.convertedTrip ? (
                            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                              {enquiry.convertedTrip.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              Not Started
                            </Badge>
                          )}
                        </div>

                        {enquiry.convertedTrip ? (
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                              {enquiry.convertedTrip.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Trip #{enquiry.convertedTrip.tripNumber}
                            </p>
                            <p className="text-[11px] text-slate-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>
                                {formatDateDisplay(enquiry.convertedTrip.startDate)} → {formatDateDisplay(enquiry.convertedTrip.endDate)}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Convert this qualified lead to initialize an itinerary builder, assign hotels & vehicles, and generate pricing proposals.
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
                        {enquiry.convertedTripId ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/trips/${enquiry.convertedTripId}`)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 rounded-lg cursor-pointer flex-1 gap-1"
                            >
                              <Compass className="h-3.5 w-3.5" />
                              <span>Open Trip Workspace</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/trips/${enquiry.convertedTripId}/quotation`)}
                              className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-8 px-2.5 rounded-lg cursor-pointer"
                              title="View Trip Quotations"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setIsConvertOpen(true)}
                            disabled={isReadOnly || enquiry.status === "LOST" || enquiry.status === "CANCELLED" || enquiry.status === "CONVERTED"}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 rounded-lg cursor-pointer flex-1 gap-1 disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Create Trip Workspace</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Linked Quotation Proposal */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Client Quotation Proposal
                          </span>
                          {enquiry.convertedQuotation ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                              {enquiry.convertedQuotation.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              {enquiry.convertedTripId ? "Awaiting Proposal" : "Pending Trip Creation"}
                            </Badge>
                          )}
                        </div>

                        {enquiry.convertedQuotation ? (
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900">
                              Quotation #{enquiry.convertedQuotation.quotationNumber} (v{enquiry.convertedQuotation.version})
                            </h4>
                            <p className="text-sm font-black text-emerald-700 font-mono">
                              {formatCurrency(Number(enquiry.convertedQuotation.finalAmount))}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Official client proposal ready for sharing or revisions.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {enquiry.convertedTripId
                              ? "Trip created! Generate costing and customized tiered quotations for this client inside the trip workspace."
                              : "Once an itinerary is created, you can generate multi-tier quotations (Deluxe, Premium, Ultra Deluxe) with payment milestones."}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
                        {enquiry.convertedQuotationId ? (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/quotations/${enquiry.convertedQuotationId}`)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 rounded-lg cursor-pointer flex-1 gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Open Quotation Proposal</span>
                          </Button>
                        ) : enquiry.convertedTripId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/trips/${enquiry.convertedTripId}/quotation`)}
                            className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-8 px-3 rounded-lg cursor-pointer flex-1 gap-1"
                          >
                            <Plus className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Generate Proposal in Trip</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Requires Trip Workspace
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Travel Specification Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Travel Specification & Passenger Matrix</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Passengers</span>
                      <strong className="text-xs sm:text-sm text-slate-900 block font-black">
                        {totalPax} ({enquiry.adults}A, {enquiry.children}C, {enquiry.infants}I)
                      </strong>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Target Budget</span>
                      <strong className="text-xs sm:text-sm text-emerald-700 block font-black truncate" title={enquiry.budget ? `${formatCurrency(Number(enquiry.budget))}${enquiry.budgetType ? ` (${formatEnumLabel(enquiry.budgetType)})` : ""}` : "Flexible"}>
                        {enquiry.budget
                          ? `${formatCurrency(Number(enquiry.budget))}${enquiry.budgetType ? ` (${formatEnumLabel(enquiry.budgetType)})` : ""}`
                          : "Flexible"}
                      </strong>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Hotel Category</span>
                      <strong className="text-xs text-slate-800 block font-bold truncate">
                        {enquiry.hotelCategory || "Not decided"}
                      </strong>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Meal Plan</span>
                      <strong className="text-xs text-slate-800 block font-bold truncate">
                        {enquiry.mealPlan || "Not decided"}
                      </strong>
                    </div>
                  </div>

                  {/* Vehicle & Requirements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Vehicle / Transport Preference</label>
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                        {enquiry.vehiclePreference || "Standard transport"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Lead Ingestion Source</label>
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-semibold">
                        {formatEnumLabel(enquiry.source)}
                      </p>
                    </div>
                  </div>

                  {enquiry.specialRequirements && (
                    <div className="space-y-1 text-xs pt-1">
                      <label className="font-bold text-slate-700">Special Inclusions / Custom Requests</label>
                      <p className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-900 leading-relaxed whitespace-pre-wrap">
                        {enquiry.specialRequirements}
                      </p>
                    </div>
                  )}
                </div>

                {/* Internal Agency Notes */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-900 text-sm">Internal Staff Notes</h3>
                    <Button
                      size="sm"
                      onClick={handleSaveInternalNotes}
                      disabled={savingNotes || isReadOnly}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer"
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>

                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private remarks, negotiations, supplier quotes, or operational reminders..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </>
            )}

            {activeTab === "timeline" && (
              /* CRM Activity Timeline */
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Chronological CRM Activity History</span>
                  </h3>
                  <span className="text-xs text-slate-500">{timeline.length} recorded events</span>
                </div>

                {timeline.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No CRM activity records logged yet.
                  </div>
                ) : (
                  <div className="relative pl-5 sm:pl-6 space-y-5 sm:space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.map((ev) => (
                      <div key={ev.id} className="relative group">
                        <div className="absolute -left-[23px] sm:-left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                        <div className="bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{ev.title}</span>
                              {ev.actorName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  <Users className="h-2.5 w-2.5 text-indigo-500" />
                                  <span>by {ev.actorName} {ev.actorRole ? `(${ev.actorRole === "AGENCY_OWNER" ? "Owner" : "Staff"})` : ""}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {new Date(ev.timestamp).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{ev.description}</p>
                          {ev.changes && ev.changes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Modifications:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                                {ev.changes.map((c, idx) => (
                                  <div key={idx} className="bg-white/80 p-1.5 rounded-lg border border-slate-200/70">
                                    <span className="font-semibold text-slate-700">{c.label || c.field}: </span>
                                    <span className="line-through text-slate-400 mr-1">{String(c.oldValue ?? "empty")}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-teal-700 font-semibold ml-1">{String(c.newValue ?? "empty")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {ev.referenceUrl && (
                            <Link
                              href={ev.referenceUrl}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 mt-1"
                            >
                              <span>View Linked Record</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "followups" && (
              /* Follow-up Tasks List */
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>CRM Follow-Up Tasks ({enquiry.followUps?.length || 0})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scheduled calls, WhatsApp follow-ups, and client checkpoints.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <Button
                      size="sm"
                      onClick={() => {
                        setQuickLogFollowUpId(null);
                        setIsQuickLogOpen(true);
                      }}
                      disabled={isReadOnly}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-8 px-3 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Phone className="h-3.5 w-3.5 mr-1" /> Log Interaction
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setFollowUpDate(new Date().toISOString().split("T")[0]);
                        setIsFollowUpOpen(true);
                      }}
                      disabled={isReadOnly}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                    </Button>
                  </div>
                </div>

                {enquiry.followUps?.length === 0 ? (
                  <div className="p-8 sm:p-10 text-center space-y-2">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">No follow-up activities logged yet.</p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setQuickLogFollowUpId(null);
                          setIsQuickLogOpen(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" /> Log First Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFollowUpDate(new Date().toISOString().split("T")[0]);
                          setIsFollowUpOpen(true);
                        }}
                        className="text-xs h-8 cursor-pointer"
                      >
                        Schedule Task
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
                    {enquiry.followUps.map((f) => {
                      const isCompleted = f.status === FollowUpStatus.COMPLETED;
                      const isPast = new Date(f.scheduledAt) < new Date() && !isCompleted;

                      return (
                        <div
                          key={f.id}
                          className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 text-xs ${
                            isCompleted
                              ? "bg-slate-50/60 border-slate-200 text-slate-600"
                              : isPast
                              ? "bg-rose-50/50 border-rose-200/80 text-rose-900"
                              : "bg-white border-slate-200 text-slate-800 shadow-2xs"
                          }`}
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase shrink-0 ${
                                  isCompleted
                                    ? "bg-slate-100 text-slate-600"
                                    : isPast
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {f.type}
                              </Badge>
                              <span className="font-semibold text-slate-700 text-xs shrink-0">
                                {formatDateTimeDisplay(f.scheduledAt)}
                              </span>
                              {isCompleted && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                                  Completed
                                </span>
                              )}
                              {isPast && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 animate-pulse shrink-0">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pt-0.5">
                              {stripIdempotencyMarker(f.notes) || "No notes logged for this interaction."}
                            </p>
                            {f.outcome && (
                              <div className="mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                                <strong>Outcome:</strong> {f.outcome}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 w-full sm:w-auto justify-end">
                            {!isCompleted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setQuickLogFollowUpId(f.id);
                                  setIsQuickLogOpen(true);
                                }}
                                disabled={isReadOnly}
                                className="h-7 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border-emerald-200 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Done
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteFollowUp(f.id)}
                              disabled={isReadOnly}
                              title="Remove"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Col: Operations Status & Customer Contact Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status & Priority Control Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Lead Pipeline Control
              </h3>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">Enquiry Status</label>
                <Select
                  value={enquiry.status}
                  onValueChange={(val) => val && handleStageChange(val as EnquiryStatus)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value={EnquiryStatus.NEW}>New Lead</SelectItem>
                    <SelectItem value={EnquiryStatus.CONTACTED}>Contacted</SelectItem>
                    <SelectItem value={EnquiryStatus.QUALIFIED}>Qualified</SelectItem>
                    <SelectItem value={EnquiryStatus.QUOTATION_SENT}>Quotation Sent</SelectItem>
                    <SelectItem value={EnquiryStatus.FOLLOW_UP}>Follow-up</SelectItem>
                    <SelectItem value={EnquiryStatus.NEGOTIATION}>Negotiation</SelectItem>
                    {enquiry.status === EnquiryStatus.CONVERTED && (
                      <SelectItem value={EnquiryStatus.CONVERTED} disabled>Converted (Confirmed Booking)</SelectItem>
                    )}
                    <SelectItem value={EnquiryStatus.LOST}>Lost</SelectItem>
                    <SelectItem value={EnquiryStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">Priority Level</label>
                <Select
                  value={enquiry.priority}
                  onValueChange={(val) => val && handlePriorityChange(val as EnquiryPriority)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value={EnquiryPriority.LOW}>Low</SelectItem>
                    <SelectItem value={EnquiryPriority.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={EnquiryPriority.HIGH}>High</SelectItem>
                    <SelectItem value={EnquiryPriority.URGENT}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lead Owner & Assignment Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Lead Ownership</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={() => setIsAssignOpen(true)}
                  className="h-6 px-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md cursor-pointer disabled:opacity-50"
                >
                  {enquiry.assignedTo ? "Reassign" : "Assign"}
                </Button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  enquiry.assignedTo ? "bg-indigo-600 text-white shadow-2xs" : "bg-amber-100 text-amber-700"
                }`}>
                  {enquiry.assignedTo ? (
                    enquiry.assignedTo.slice(0, 2).toUpperCase()
                  ) : (
                    <UserX className="h-3.5 w-3.5 text-amber-600" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1 text-xs">
                  <span className="font-bold text-slate-900 truncate">
                    {enquiry.assignedTo || "Unassigned"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {enquiry.assignedTo ? "Assigned Sales Consultant" : "In unassigned agency pool"}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Contact Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-3.5">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span>Customer Profile</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Customer Name</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong className="text-slate-900 block font-bold text-sm">{enquiry.customer?.name}</strong>
                    {isRepeatCustomer ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold uppercase">
                        Repeat Customer
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold uppercase">
                        New Customer
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Phone Contact</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-slate-700 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`tel:${enquiry.customer?.phone}`} className="hover:underline text-indigo-600 font-semibold">
                        {enquiry.customer?.phone}
                      </a>
                    </p>
                    {enquiry.customer?.phone && (
                      <a
                        href={`https://wa.me/${enquiry.customer.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                {enquiry.customer?.email && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                    <p className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`mailto:${enquiry.customer?.email}`} className="hover:underline text-indigo-600">
                        {enquiry.customer?.email}
                      </a>
                    </p>
                  </div>
                )}

                {enquiry.customer?.address && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Address / City</span>
                    <p className="text-slate-600 mt-0.5">{enquiry.customer?.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── SCHEDULE FOLLOW-UP MODAL ─── */}
        <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleScheduleFollowUp}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Schedule Follow-Up Task</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Plan a call, email, or WhatsApp touchpoint for {enquiry.customer?.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Interaction Type</label>
                    <Select value={followUpType} onValueChange={(val: any) => setFollowUpType(val)}>
                      <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="CALL">Phone Call</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="MEETING">Meeting</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Priority</label>
                    <Select value={followUpPriority} onValueChange={(val: any) => setFollowUpPriority(val)}>
                      <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="URGENT">Urgent</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Date *</label>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="h-9 text-xs bg-slate-50 border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Time</label>
                    <Input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="h-9 text-xs bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Agenda / Discussion Points</label>
                  <Textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Key questions, quotes to present, or callback discussion items..."
                    rows={3}
                    className="bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFollowUpOpen(false)}
                  className="bg-white border-slate-200 text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingFollowUp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 cursor-pointer"
                >
                  {savingFollowUp ? "Saving..." : "Schedule Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── COMPLETE FOLLOW-UP MODAL ─── */}
        <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Complete Follow-up Call / Interaction
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record interaction outcome and optionally queue the next touchpoint.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Interaction Outcome / Client Response
                </label>
                <Input
                  placeholder="e.g. Client requested customized 4-star hotel quotes; liked the itinerary"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="text-xs border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Internal Notes</label>
                <Textarea
                  placeholder="Add any internal details, client objections, or specific preferences..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  rows={2}
                  className="text-xs border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>

              {/* SCHEDULE NEXT TOGGLE */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Schedule Next Follow-up</span>
                    <span className="text-[11px] text-slate-500">Auto-create the next interaction for this lead</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleNext}
                    onChange={(e) => setScheduleNext(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {scheduleNext && (
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next Type</label>
                        <Select value={nextType} onValueChange={(val: any) => setNextType(val)}>
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CALL">Call</SelectItem>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="MEETING">Meeting</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Priority</label>
                        <Select value={nextPriority} onValueChange={(val: any) => setNextPriority(val)}>
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 block">Next Follow-up Date</label>
                        <div className="flex items-center gap-1">
                          {[
                            { label: "Tomorrow", offset: 1 },
                            { label: "+2 Days", offset: 2 },
                            { label: "+1 Week", offset: 7 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                const target = new Date();
                                target.setDate(target.getDate() + preset.offset);
                                setNextDate(target.toISOString().split("T")[0]);
                              }}
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer shadow-2xs"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={nextDate}
                          onChange={(e) => setNextDate(e.target.value)}
                          className="h-8 text-xs bg-white border-slate-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Time</label>
                        <Input
                          type="time"
                          value={nextTime}
                          onChange={(e) => setNextTime(e.target.value)}
                          className="h-8 text-xs bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Target Agenda</label>
                      <Input
                        placeholder="e.g. Call to finalize payment after sending revised proposal"
                        value={nextNotes}
                        onChange={(e) => setNextNotes(e.target.value)}
                        className="h-8 text-xs bg-white border-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingComplete}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  {savingComplete ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Complete"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── MARK AS LOST MODAL ─── */}
        <Dialog open={lostModalOpen} onOpenChange={setLostModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                Mark Lead as Lost
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record a structured reason to maintain accurate sales pipeline metrics.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleLostSubmit} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Lost Reason *</label>
                <Select value={lostReason} onValueChange={(val) => val && setLostReason(val)}>
                  <SelectTrigger className="text-xs border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_LOST_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Additional Details / Explanation (Optional)
                </label>
                <Textarea
                  placeholder="e.g. Chose another tour operator with 10% lower hotel rate..."
                  value={lostExplanation}
                  onChange={(e) => setLostExplanation(e.target.value)}
                  rows={3}
                  className="text-xs border-slate-200"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLostModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={savingLost}
                  className="font-medium"
                >
                  {savingLost ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Lost"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── CONVERT TO TRIP MODAL ─── */}
        <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleConvertTrip}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Compass className="h-4 w-4 text-indigo-600" />
                  <span>Convert to Active Trip Workspace</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Initialize an official itinerary builder and proposal workspace for {enquiry.customer?.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trip Workspace Title</label>
                  <Input
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    className="h-9 text-xs bg-slate-50 border-slate-200 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Conversion Handover Notes</label>
                  <Textarea
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder="Instructions for itinerary planner, flight constraints, or meal preferences..."
                    rows={3}
                    className="bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConvertOpen(false)}
                  className="bg-white border-slate-200 text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={converting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 cursor-pointer"
                >
                  {converting ? "Creating Workspace..." : "Create Trip Workspace"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── ARCHIVE ENQUIRY MODAL ─── */}
        <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-600" />
                <span>Archive Travel Enquiry</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Are you sure you want to archive {enquiry.enquiryNumber}? This will remove it from the active pipeline.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsArchiveOpen(false)}
                className="bg-white border-slate-200 text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleArchiveEnquiry}
                disabled={archiving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8 cursor-pointer"
              >
                {archiving ? "Archiving..." : "Confirm Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── QUICK LOG INTERACTION MODAL ─── */}
        <QuickLogModal
          enquiry={enquiry}
          isOpen={isQuickLogOpen}
          onClose={() => {
            setIsQuickLogOpen(false);
            setQuickLogFollowUpId(null);
          }}
          onSuccess={handleQuickLogSuccess}
          isReadOnly={isReadOnly}
          initialFollowUpId={quickLogFollowUpId}
          customerId={enquiry?.customerId}
        />

        {/* ─── ASSIGN / HANDOFF LEAD MODAL ─── */}
        <AssignLeadModal
          enquiry={enquiry}
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          onSuccess={async () => {
            setIsAssignOpen(false);
            await fetchEnquiry();
          }}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
