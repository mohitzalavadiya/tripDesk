"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge, PriorityBadge } from "@/components/enquiries/status-badge";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  Phone,
  Mail,
  User,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Trash2,
  Loader2,
  Sparkles,
  PhoneCall,
  Video,
  MessageSquare,
  MoreVertical,
  CalendarDays,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  enquiryClient,
  EnquiryWithRelations,
  CrmTimelineEvent,
  followUpClient,
} from "@/lib/api-client";
import {
  EnquiryStatus,
  EnquiryPriority,
  FollowUpType,
  FollowUpStatus,
  EnquiryFollowUp,
} from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { STANDARD_LOST_REASONS } from "@/lib/validation/enquiry-schema";
import { toast } from "sonner";

export default function EnquiryDetailPage() {
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
  const fetchEnquiry = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [enquiryRes, timelineRes] = await Promise.all([
        enquiryClient.getEnquiry(id),
        enquiryClient.getTimeline(id),
      ]);

      if (enquiryRes.success && enquiryRes.data) {
        setEnquiry(enquiryRes.data);
        setTripTitle(enquiryRes.data.title || `${enquiryRes.data.destination} Trip`);
        setInternalNotes(enquiryRes.data.internalNotes || "");
        if ((enquiryRes.data as any).isRepeatCustomer !== undefined) {
          setIsRepeatCustomer((enquiryRes.data as any).isRepeatCustomer);
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
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) fetchEnquiry();
  }, [id, fetchEnquiry]);

  // Update Status / Stage
  const handleStageChange = async (status: EnquiryStatus) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
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
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Enquiry Workspace" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/enquiries"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100">
                <Info className="h-3 w-3 text-blue-500" />
                Lead CRM
              </span>
              <span className="text-slate-300">•</span>
              <StatusBadge status={enquiry.status} />
              <PriorityBadge priority={enquiry.priority} />
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {enquiry.title || `${enquiry.destination} Trip`}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {enquiry.enquiryNumber} • {enquiry.customer?.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Compass className="h-3.5 w-3.5 text-indigo-500" />
                Destination: <strong>{enquiry.destination}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Dates: <strong>{formatDateDisplay(enquiry.startDate)} → {formatDateDisplay(enquiry.endDate)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Captured on {formatDateDisplay(enquiry.createdAt)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            {enquiry.convertedTripId ? (
              <Button
                onClick={() => router.push(`/trips/${enquiry.convertedTripId}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                Open Converted Trip
              </Button>
            ) : (
              <Button
                onClick={() => setIsConvertOpen(true)}
                disabled={isReadOnly || enquiry.status === "LOST" || enquiry.status === "CANCELLED"}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Compass className="h-4 w-4" />
                Convert to Trip
              </Button>
            )}

            {enquiry.status !== "LOST" && enquiry.status !== "CONVERTED" && (
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
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
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className={`text-xs font-semibold ${
              activeTab === "overview" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Lead Specification & Requirements
          </Button>

          <Button
            variant={activeTab === "timeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("timeline")}
            className={`text-xs font-semibold gap-1.5 ${
              activeTab === "timeline" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            CRM Activity Timeline ({timeline.length})
          </Button>

          <Button
            variant={activeTab === "followups" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("followups")}
            className={`text-xs font-semibold gap-1.5 ${
              activeTab === "followups" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Follow-up Tasks ({enquiry.followUps?.length || 0})
          </Button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "overview" && (
              <>
                {/* Travel Specification Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-indigo-600" />
                    <span>Travel Specification & Passenger Matrix</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Passengers</span>
                      <strong className="text-sm text-slate-900 block font-black">
                        {totalPax} ({enquiry.adults}A, {enquiry.children}C, {enquiry.infants}I)
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Target Budget</span>
                      <strong className="text-sm text-emerald-700 block font-black">
                        {enquiry.budget ? formatCurrency(Number(enquiry.budget)) : "Flexible"}
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Hotel Category</span>
                      <strong className="text-xs text-slate-800 block font-bold truncate">
                        {enquiry.hotelCategory || "Not decided"}
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
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
                        {enquiry.source}
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
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
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
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <span>Chronological CRM Activity History</span>
                  </h3>
                  <span className="text-xs text-slate-500">{timeline.length} recorded events</span>
                </div>

                {timeline.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No CRM activity records logged yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.map((ev) => (
                      <div key={ev.id} className="relative group">
                        <div className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{ev.title}</span>
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
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span>CRM Follow-Up Tasks ({enquiry.followUps?.length || 0})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scheduled calls, WhatsApp follow-ups, and client checkpoints.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setFollowUpDate(new Date().toISOString().split("T")[0]);
                      setIsFollowUpOpen(true);
                    }}
                    disabled={isReadOnly}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                  </Button>
                </div>

                {enquiry.followUps?.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">No follow-up activities logged yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFollowUpDate(new Date().toISOString().split("T")[0]);
                        setIsFollowUpOpen(true);
                      }}
                      className="text-xs h-8 cursor-pointer mt-2"
                    >
                      Schedule First Call
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 space-y-4">
                    {enquiry.followUps.map((f) => {
                      const isCompleted = f.status === FollowUpStatus.COMPLETED;
                      const isPast = new Date(f.scheduledAt) < new Date() && !isCompleted;

                      return (
                        <div
                          key={f.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 text-xs ${
                            isCompleted
                              ? "bg-slate-50/60 border-slate-200 text-slate-600"
                              : isPast
                              ? "bg-rose-50/50 border-rose-200/80 text-rose-900"
                              : "bg-white border-slate-200 text-slate-800 shadow-2xs"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase ${
                                  isCompleted
                                    ? "bg-slate-100 text-slate-600"
                                    : isPast
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {f.type}
                              </Badge>
                              <span className="font-semibold text-slate-700">
                                {formatDateTimeDisplay(f.scheduledAt)}
                              </span>
                              {isCompleted && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  Completed
                                </span>
                              )}
                              {isPast && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 animate-pulse">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pt-0.5">
                              {f.notes || "No notes logged for this interaction."}
                            </p>
                            {f.outcome && (
                              <div className="mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                                <strong>Outcome:</strong> {f.outcome}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isCompleted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCompleteFollowUp(f)}
                                disabled={isReadOnly}
                                className="h-7 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border-emerald-200 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Done
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteFollowUp(f.id)}
                              disabled={isReadOnly}
                              title="Remove"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer disabled:opacity-50"
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
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
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
                    <SelectItem value={EnquiryStatus.CONVERTED}>Converted (Won)</SelectItem>
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

            {/* Customer Contact Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3.5">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span>Customer Profile</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Client Name</span>
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
                  <p className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`tel:${enquiry.customer?.phone}`} className="hover:underline text-indigo-600 font-semibold">
                      {enquiry.customer?.phone}
                    </a>
                  </p>
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
      </div>
    </div>
  );
}
