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
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Trash2,
  Loader2,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Video,
  Send,
  MoreVertical,
  IndianRupee,
} from "lucide-react";
import {
  enquiryClient,
  EnquiryWithRelations,
} from "@/lib/api-client";
import {
  EnquiryStatus,
  EnquiryPriority,
  FollowUpType,
  FollowUpStatus,
  EnquiryFollowUp,
} from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [enquiry, setEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Follow-up Schedule Modal State
  const [isFollowUpOpen, setIsFollowUpOpen] = React.useState(false);
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [followUpTime, setFollowUpTime] = React.useState("10:00");
  const [followUpType, setFollowUpType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [followUpNotes, setFollowUpNotes] = React.useState("");
  const [savingFollowUp, setSavingFollowUp] = React.useState(false);

  // Convert to Trip Modal State
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);
  const [tripTitle, setTripTitle] = React.useState("");
  const [tripNotes, setTripNotes] = React.useState("");
  const [converting, setConverting] = React.useState(false);

  // Internal Notes Editing
  const [internalNotes, setInternalNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Fetch real enquiry details
  const fetchEnquiry = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await enquiryClient.getEnquiry(id);
      if (res.success && res.data) {
        setEnquiry(res.data);
        setTripTitle(res.data.title || `${res.data.destination} Trip`);
        setInternalNotes(res.data.internalNotes || "");
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

  // Update Status
  const handleStatusChange = async (status: EnquiryStatus) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      await enquiryClient.updateEnquiry(id, { status });
      toast.success(`Enquiry status updated to ${status}.`);
      await fetchEnquiry();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
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
      const [year, month, day] = followUpDate.split("-");
      const [hour, minute] = followUpTime.split(":");
      const scheduledAt = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour || "10"),
        parseInt(minute || "0")
      );

      const res = await enquiryClient.createFollowUp(id, {
        type: followUpType,
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

  // Complete Follow-Up
  const handleCompleteFollowUp = async (followUpId: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      await enquiryClient.updateFollowUp(id, followUpId, {
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
      });
      toast.success("Follow-up marked as completed.");
      await fetchEnquiry();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete follow-up.");
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
    if (!confirm(`Archive enquiry ${enquiry.enquiryNumber}? Converted trips will remain intact.`)) {
      return;
    }

    try {
      await enquiryClient.archiveEnquiry(id);
      toast.success(`Enquiry ${enquiry.enquiryNumber} archived.`);
      router.push("/enquiries");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive enquiry.");
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
                Enquiry Workspace
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

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
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
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Compass className="h-4 w-4" />
                Convert to Trip
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
                    onClick={handleArchiveEnquiry}
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

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Travel Requirements + CRM Activity Timeline */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* CRM Follow-Up Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>CRM Follow-Up Timeline ({enquiry.followUps?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological client interaction logs, calls, WhatsApp notes, and scheduled tasks.
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
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Activity
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
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!isCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteFollowUp(f.id)}
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
                  onValueChange={(val) => val && handleStatusChange(val as EnquiryStatus)}
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
                    <SelectItem value={EnquiryStatus.CONVERTED}>Converted</SelectItem>
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
                  <strong className="text-slate-900 block font-bold text-sm">{enquiry.customer?.name}</strong>
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Interaction Type</label>
                    <Select
                      value={followUpType}
                      onValueChange={(val) => val && setFollowUpType(val as FollowUpType)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value={FollowUpType.CALL}>Phone Call</SelectItem>
                        <SelectItem value={FollowUpType.WHATSAPP}>WhatsApp Message</SelectItem>
                        <SelectItem value={FollowUpType.EMAIL}>Email Follow-up</SelectItem>
                        <SelectItem value={FollowUpType.MEETING}>Direct Meeting</SelectItem>
                        <SelectItem value={FollowUpType.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Scheduled Time</label>
                    <Input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Scheduled Date *</label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Task Agenda / Notes</label>
                  <Textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="e.g. Discuss revised Bali hotel quotation, confirm flight preferences..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={savingFollowUp}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {savingFollowUp ? "Saving..." : "Schedule Follow-up"}
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
                  <Compass className="h-4 w-4 text-emerald-600" />
                  <span>Convert to Trip Workspace</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Initialize an active itinerary, traveler roster, and costing builder from this enquiry.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Trip Title *</label>
                  <Input
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    placeholder="e.g. 5N Kerala Family Holiday"
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Trip Notes</label>
                  <Textarea
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder="Inherit or add trip operational instructions..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={converting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {converting ? "Converting..." : "Confirm & Open Trip"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
