"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ArrowLeft,
  Share2,
  Download,
  IndianRupee,
  Hotel,
  Car,
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  Copy,
  Printer,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Building,
  CreditCard,
  History,
  Lock,
  Compass,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Edit2,
  ShieldCheck,
  Layers,
  Sparkles,
  Send,
} from "lucide-react";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/booking/booking-status-badge";
import {
  bookingClient,
  paymentClient,
  financeClient,
  documentClient,
  DocumentItem,
  BookingWithRelations,
  BookingPaymentScheduleResult,
} from "@/lib/api-client";
import {
  BookingStatus,
  BookingPaymentStatus,
  PaymentMethod,
  PaymentStatus,
  Payment,
  TravelDocumentType,
} from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  // Data states
  const [booking, setBooking] = React.useState<BookingWithRelations | null>(null);
  const [schedule, setSchedule] = React.useState<BookingPaymentScheduleResult | null>(null);
  const [bookingDocs, setBookingDocs] = React.useState<DocumentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [generatingDocs, setGeneratingDocs] = React.useState(false);

  // Add Payment Modal State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.UPI);
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [savingPayment, setSavingPayment] = React.useState(false);

  // Cancel Booking Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);

  // Fetch real booking from database API
  const fetchBooking = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, schedRes, docsRes] = await Promise.all([
        bookingClient.getBooking(bookingId),
        financeClient.getBookingPaymentSchedule(bookingId).catch(() => null),
        documentClient.list({ bookingId, limit: 50 }).catch(() => ({ data: [] })),
      ]);
      if (res.success && res.data) {
        setBooking(res.data);
      }
      if (schedRes && (schedRes as any).data) {
        setSchedule((schedRes as any).data);
      }
      if (docsRes && docsRes.data) {
        setBookingDocs(docsRes.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  React.useEffect(() => {
    if (bookingId) fetchBooking();
  }, [bookingId, fetchBooking]);

  // Update Status
  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (newStatus === BookingStatus.CANCELLED) {
      setIsCancelModalOpen(true);
      return;
    }

    try {
      await bookingClient.updateBooking(bookingId, { status: newStatus });
      toast.success(`Booking status updated to ${newStatus}.`);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update booking status.");
    }
  };

  // Confirm Cancellation
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCancelling(true);
      await bookingClient.cancelBooking(bookingId, cancelReason.trim() || "Cancelled by agency staff.");
      toast.success("Booking cancelled successfully.");
      setIsCancelModalOpen(false);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  // Add Payment
  const handleOpenAddPayment = () => {
    if (!booking) return;
    const remaining = Number(booking.balanceAmount);
    setPaymentAmount(remaining > 0 ? String(remaining) : "1000");
    setPaymentMethod(PaymentMethod.UPI);
    setReferenceNumber("");
    setReceiptNumber("");
    setPaymentNotes("");
    setIsAddPaymentOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    const amt = Number(paymentAmount);
    if (amt <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }

    try {
      setSavingPayment(true);
      const res = await paymentClient.createPayment({
        bookingId,
        amount: amt,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(`Payment ${res.data.paymentNumber} recorded successfully!`);
        setIsAddPaymentOpen(false);
        await fetchBooking();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  // Archive / Delete Payment
  const handleDeletePayment = async (paymentId: string, paymentNumber: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!confirm(`Archive payment ${paymentNumber}? This will recalculate booking balance.`)) {
      return;
    }

    try {
      await paymentClient.deletePayment(paymentId);
      toast.success(`Payment ${paymentNumber} archived.`);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive payment.");
    }
  };

  // Generate Booking Documents
  const handleGenerateDocuments = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }
    setGeneratingDocs(true);
    try {
      const res = await documentClient.generateForBooking(bookingId);
      toast.success(`Generated ${res.generatedCount} travel documents!`);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate documents.");
    } finally {
      setGeneratingDocs(false);
    }
  };

  // Issue Document
  const handleIssueDoc = async (docId: string, docNum: string) => {
    try {
      await documentClient.issue(docId, { notifyCustomer: false });
      toast.success(`Document ${docNum} issued.`);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err?.message || "Failed to issue document.");
    }
  };

  // Resend Document
  const handleResendDoc = async (docId: string, docNum: string) => {
    try {
      await documentClient.resend(docId);
      toast.success(`Document ${docNum} sent to traveler.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send document.");
    }
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading booking workspace...</h3>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Booking Record Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested booking record does not exist or has been archived."}
        </p>
        <Link href="/bookings" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  const total = Number(booking.totalAmount);
  const paid = Number(booking.paidAmount);
  const balance = Number(booking.balanceAmount);
  const paidPercentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const readiness = booking.operationalReadiness;
  const readinessScore = readiness?.score ?? 0;
  const isReady = readiness?.isReady ?? false;

  const hotelConfirmations = booking.tripOperation?.hotelConfirmations || [];
  const vehicleDispatches = booking.tripOperation?.vehicleDispatches || [];
  const activityConfirmations = booking.tripOperation?.activityConfirmations || [];
  const events = booking.tripOperation?.events || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Booking Workspace" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/bookings"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CalendarCheck className="h-3 w-3 text-emerald-500" />
                Booking Record
              </span>
              <span className="text-slate-300">•</span>
              <BookingStatusBadge status={booking.status} />
              <PaymentStatusBadge status={booking.paymentStatus} />
              {readiness && (
                <Badge
                  className={`text-[10px] font-bold ${
                    isReady
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : readinessScore >= 50
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-rose-100 text-rose-800 border-rose-200"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Readiness: {readinessScore}%
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {booking.bookingNumber}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {booking.trip?.title} ({booking.customer?.name})
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Travel: <strong>{formatDateDisplay(booking.travelStartDate)} → {formatDateDisplay(booking.travelEndDate)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Booked on: {formatDateDisplay(booking.bookingDate)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/operations/${booking.tripId}`)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Operations Workspace
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/trips/${booking.tripId}`)}
              className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Trip Overview
            </Button>

            {booking.quotationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/trips/${booking.tripId}/quotation/preview`)}
                className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Proposal View
              </Button>
            )}

            <Button
              onClick={handleOpenAddPayment}
              disabled={isReadOnly}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              Add Payment
            </Button>
          </div>
        </div>

        {/* Operational Readiness Banner */}
        {readiness && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 ${isReady ? "text-emerald-600" : "text-amber-500"}`} />
                  <span>Operational Readiness Check</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated service confirmations and blocker validation for departure readiness.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 font-mono">
                  {readinessScore}% Ready
                </span>
                <Link href={`/operations/${booking.tripId}`}>
                  <Button size="sm" variant="outline" className="text-xs h-7.5 bg-slate-50 border-slate-200 cursor-pointer">
                    Manage Operations <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isReady ? "bg-emerald-500" : readinessScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${readinessScore}%` }}
              />
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
              {readiness.checks.map((c) => (
                <div
                  key={c.key}
                  className={`p-3 rounded-xl border ${
                    c.passed
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                      : "bg-amber-50/50 border-amber-100 text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    {c.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>{c.label}</span>
                  </div>
                  {c.details && <p className="text-[10px] text-slate-600 mt-1">{c.details}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col (2 cols): Services + Financials + Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Operational Services Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-indigo-600" />
                    <span>Operational Services & Allocations</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time status of hotel vouchers, chauffeur dispatches, and activity passes.
                  </p>
                </div>

                <Link href={`/operations/${booking.tripId}`}>
                  <Button size="sm" variant="outline" className="text-xs h-8 cursor-pointer">
                    Operations Desk <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>

              {/* Services Sub-Tabs / Tables */}
              <div className="p-5 space-y-5">
                {/* Hotels */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                    <Hotel className="h-3.5 w-3.5 text-slate-400" />
                    <span>Hotel Accommodations ({hotelConfirmations.length})</span>
                  </h4>

                  {hotelConfirmations.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No hotel confirmation records initialized yet.
                    </p>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                          <TableRow>
                            <TableHead className="py-2 px-3">Hotel</TableHead>
                            <TableHead className="py-2 px-3">Room & Meal</TableHead>
                            <TableHead className="py-2 px-3">Confirmation #</TableHead>
                            <TableHead className="py-2 px-3 text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotelConfirmations.map((h) => (
                            <TableRow key={h.id} className="text-xs border-b border-slate-50 hover:bg-slate-50/50">
                              <TableCell className="py-2.5 px-3 font-semibold text-slate-900">
                                {h.tripHotel?.hotel?.name || "Hotel Accommodation"}
                                {h.tripHotel?.hotel?.city && (
                                  <span className="text-[10px] text-slate-400 block">{h.tripHotel.hotel.city}</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-600">
                                {h.roomDetails || h.tripHotel?.roomType || "Standard"} • {h.mealPlan || h.tripHotel?.mealPlan || "EP"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                                {h.confirmationNumber || "Pending"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right">
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    h.status === "CONFIRMED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {h.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Vehicles */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-slate-400" />
                    <span>Transport & Fleet Dispatches ({vehicleDispatches.length})</span>
                  </h4>

                  {vehicleDispatches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No vehicle dispatch allocations initialized yet.
                    </p>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                          <TableRow>
                            <TableHead className="py-2 px-3">Vehicle</TableHead>
                            <TableHead className="py-2 px-3">Chauffeur</TableHead>
                            <TableHead className="py-2 px-3">Plate #</TableHead>
                            <TableHead className="py-2 px-3 text-right">Dispatch Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicleDispatches.map((v) => (
                            <TableRow key={v.id} className="text-xs border-b border-slate-50 hover:bg-slate-50/50">
                              <TableCell className="py-2.5 px-3 font-semibold text-slate-900">
                                {v.vehicle?.name || "Private Dedicated Vehicle"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-600">
                                {v.driverName ? `${v.driverName} (${v.driverPhone || "N/A"})` : "Driver to be assigned"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                                {v.vehicleNumber || "Pending"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right">
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    v.status === "CONFIRMED" || v.status === "ASSIGNED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {v.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Activities */}
                {activityConfirmations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 text-slate-400" />
                      <span>Activity Passes & Sightseeing ({activityConfirmations.length})</span>
                    </h4>

                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                          <TableRow>
                            <TableHead className="py-2 px-3">Activity</TableHead>
                            <TableHead className="py-2 px-3">Location</TableHead>
                            <TableHead className="py-2 px-3">Pass / Voucher #</TableHead>
                            <TableHead className="py-2 px-3 text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityConfirmations.map((a) => (
                            <TableRow key={a.id} className="text-xs border-b border-slate-50 hover:bg-slate-50/50">
                              <TableCell className="py-2.5 px-3 font-semibold text-slate-900">
                                {a.activity?.name || "Sightseeing Activity"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-600">
                                {a.activityLocation || a.activity?.location || "Destination"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                                {a.passNumber || "Pending"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right">
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    a.status === "CONFIRMED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {a.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Official Travel Documents & Vouchers Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>Official Travel Documents & Vouchers ({bookingDocs.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official booking confirmations, hotel vouchers, transport passes, and itineraries.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateDocuments}
                    disabled={generatingDocs || isReadOnly || booking.status === "CANCELLED"}
                    className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold cursor-pointer gap-1"
                  >
                    {generatingDocs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {bookingDocs.length === 0 ? "Generate All Documents" : "Re-sync Documents"}
                  </Button>

                  <Link href="/documents">
                    <Button size="sm" variant="ghost" className="text-xs h-8 text-slate-500 hover:text-slate-900 cursor-pointer">
                      Document Center <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-5">
                {bookingDocs.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No travel documents generated yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                      Click "Generate All Documents" to build official booking confirmations, stay vouchers, and itineraries.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleGenerateDocuments}
                      disabled={generatingDocs || isReadOnly || booking.status === "CANCELLED"}
                      className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer gap-1"
                    >
                      {generatingDocs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Generate All Documents
                    </Button>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <TableRow>
                          <TableHead className="py-2 px-3">Doc # / Ver</TableHead>
                          <TableHead className="py-2 px-3">Type & Title</TableHead>
                          <TableHead className="py-2 px-3">Status</TableHead>
                          <TableHead className="py-2 px-3 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingDocs.map((doc) => (
                          <TableRow key={doc.id} className="text-xs border-b border-slate-50 hover:bg-slate-50/50">
                            <TableCell className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              <div className="flex items-center gap-1">
                                <span>{doc.documentNumber}</span>
                                <span className="text-[9px] font-normal px-1 py-0.5 rounded bg-slate-100 text-slate-600">
                                  v{doc.version}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">{doc.title}</div>
                              <div className="text-[10px] text-slate-500">{doc.documentType}</div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge
                                className={`text-[9px] font-bold ${
                                  doc.status === "ISSUED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : doc.status === "GENERATED"
                                    ? "bg-amber-100 text-amber-800"
                                    : doc.status === "REVOKED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={documentClient.getDownloadUrl(doc.id)}
                                  download
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>

                                {doc.status === "GENERATED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleIssueDoc(doc.id, doc.documentNumber)}
                                    className="h-7 px-2 text-[10px] text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold cursor-pointer gap-1"
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Issue
                                  </Button>
                                )}

                                {doc.status === "ISSUED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResendDoc(doc.id, doc.documentNumber)}
                                    className="h-7 px-2 text-[10px] text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold cursor-pointer gap-1"
                                  >
                                    <Send className="h-3 w-3" /> Send
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Financial Status Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  <span>Commercial Financial Ledger</span>
                </h3>
                <span className="text-xs font-bold text-slate-500 font-mono">{paidPercentage}% Collected</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paidPercentage}%` }}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-1 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Contract</span>
                  <strong className="text-base text-slate-900 block font-black">{formatCurrency(total)}</strong>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Total Received</span>
                  <strong className="text-base text-emerald-900 block font-black">{formatCurrency(paid)}</strong>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-700">Outstanding Due</span>
                  <strong className="text-base text-rose-900 block font-black">{formatCurrency(balance)}</strong>
                </div>
              </div>

              {/* Payment Milestones & Schedule Breakdown */}
              {schedule && schedule.milestones && schedule.milestones.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Payment Milestone Schedule & Allocation ({schedule.milestones.length})</span>
                    </h4>
                    {schedule.overdueMilestonesCount > 0 && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {schedule.overdueMilestonesCount} Overdue ({formatCurrency(schedule.overdueMilestonesAmount)})
                      </Badge>
                    )}
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <TableRow>
                          <TableHead className="py-2 px-3">Milestone</TableHead>
                          <TableHead className="py-2 px-3">Due Date</TableHead>
                          <TableHead className="py-2 px-3 text-right">Planned</TableHead>
                          <TableHead className="py-2 px-3 text-right">Allocated</TableHead>
                          <TableHead className="py-2 px-3 text-right">Remaining</TableHead>
                          <TableHead className="py-2 px-3 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.milestones.map((m, idx) => (
                          <TableRow key={m.id || idx} className="text-xs border-b border-slate-50 hover:bg-slate-50/50">
                            <TableCell className="py-2.5 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{m.title}</span>
                                {m.percentage > 0 && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                    {m.percentage}%
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-slate-600">
                              {m.dueDate ? (
                                <span className={m.isOverdue ? "text-rose-600 font-semibold flex items-center gap-1" : ""}>
                                  {m.isOverdue && <AlertCircle className="h-3 w-3 inline" />}
                                  {formatDateDisplay(m.dueDate)}
                                </span>
                              ) : (
                                "Upon Confirmation"
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-medium text-slate-800 font-mono">
                              {formatCurrency(m.plannedAmount)}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                              {formatCurrency(m.allocatedAmount)}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-medium text-slate-700 font-mono">
                              {formatCurrency(m.remainingAmount)}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-center">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  m.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : m.status === "PARTIALLY_PAID"
                                    ? "bg-amber-100 text-amber-800"
                                    : m.isOverdue
                                    ? "bg-rose-100 text-rose-800 border-rose-300"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {m.isOverdue && m.status !== "PAID" ? "OVERDUE" : m.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Payment Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Payment Transactions ({booking.payments?.length || 0})</h3>
                  <p className="text-xs text-slate-500">
                    Real-time payment logs, advance deposits, and settlement entries.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleOpenAddPayment}
                  disabled={isReadOnly}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Payment
                </Button>
              </div>

              {booking.payments?.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">No payments recorded against this booking yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddPayment}
                    className="text-xs h-8 cursor-pointer mt-2"
                  >
                    Record First Deposit
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Payment Ref</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Date</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Method</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Status</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Amount</TableHead>
                        <TableHead className="py-2.5 px-4 text-right font-bold text-slate-600">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {booking.payments.map((p) => (
                        <TableRow key={p.id} className="border-b border-slate-100 text-xs hover:bg-slate-50/50">
                          <TableCell className="py-3 px-4 font-semibold text-slate-900">
                            <div>
                              <span>{p.paymentNumber}</span>
                              {p.referenceNumber && (
                                <p className="text-[10px] text-slate-400">Ref: {p.referenceNumber}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-slate-700">
                            {formatDateDisplay(p.paymentDate)}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {p.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <PaymentStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="py-3 px-4 font-extrabold text-emerald-700">
                            {formatCurrency(Number(p.amount))}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeletePayment(p.id, p.paymentNumber)}
                              disabled={isReadOnly}
                              title="Archive Payment"
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* 4. Chronological Operational Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <span>Booking & Operations Audit Timeline</span>
              </h3>

              {events.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No operational events recorded yet.</p>
              ) : (
                <div className="space-y-4 pt-1">
                  {events.map((e, idx) => (
                    <div key={e.id} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                          <Sparkles className="h-3 w-3 text-indigo-600" />
                        </div>
                        {idx < events.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className="pb-3 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <strong className="text-slate-900">{e.title}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(e.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {e.description && <p className="text-slate-600 mt-0.5">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Operations Status & Customer Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Control Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Operational Status
              </h3>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700">Booking Lifecycle Status</label>
                <Select
                  value={booking.status}
                  onValueChange={(val) => val && handleStatusChange(val as BookingStatus)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value={BookingStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={BookingStatus.CONFIRMED}>Confirmed</SelectItem>
                    <SelectItem value={BookingStatus.ONGOING}>On Trip / Active</SelectItem>
                    <SelectItem value={BookingStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={BookingStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {booking.cancellationReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-rose-800 uppercase text-[10px]">Cancellation Reason</span>
                  <p className="text-rose-700 leading-relaxed">{booking.cancellationReason}</p>
                </div>
              )}
            </div>

            {/* Customer Contact Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3.5">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span>Customer Profile</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Lead Passenger</span>
                  <strong className="text-slate-900 block">{booking.customer?.name}</strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Phone Contact</span>
                  <p className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`tel:${booking.customer?.phone}`} className="hover:underline text-indigo-600 font-semibold">
                      {booking.customer?.phone}
                    </a>
                  </p>
                </div>

                {booking.customer?.email && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                    <p className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`mailto:${booking.customer?.email}`} className="hover:underline text-indigo-600">
                        {booking.customer?.email}
                      </a>
                    </p>
                  </div>
                )}

                {booking.trip?.travelers && booking.trip.travelers.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Travelers ({booking.trip.travelers.length})</span>
                    <div className="mt-1 space-y-1">
                      {booking.trip.travelers.map((t) => (
                        <div key={t.id} className="text-slate-600 flex justify-between">
                          <span>{t.name}</span>
                          <span className="text-slate-400 text-[10px]">{t.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes & Remarks Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Booking Remarks
              </h3>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Customer Remarks</label>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {booking.notes || "No custom remarks recorded."}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Agency Notes</label>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {booking.internalNotes || "No internal staff notes recorded."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── ADD PAYMENT MODAL ─── */}
        <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSavePayment}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Record Customer Payment</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Log deposit or full payment for booking {booking.bookingNumber}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Outstanding Due:</span>
                  <strong className="text-rose-600 font-extrabold text-sm">{formatCurrency(balance)}</strong>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹) *</label>
                    <Input
                      type="number"
                      min={0.01}
                      step="any"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Method</label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(val) => val && setPaymentMethod(val as PaymentMethod)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value={PaymentMethod.UPI}>UPI / GPay / PhonePe</SelectItem>
                        <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS)</SelectItem>
                        <SelectItem value={PaymentMethod.CASH}>Cash Deposit</SelectItem>
                        <SelectItem value={PaymentMethod.CARD}>Credit / Debit Card</SelectItem>
                        <SelectItem value={PaymentMethod.CHEQUE}>Cheque</SelectItem>
                        <SelectItem value={PaymentMethod.OTHER}>Other Method</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Ref / UTR</label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. UTR123456789"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Receipt # (Optional)</label>
                    <Input
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="e.g. REC-001"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Payment notes or remarks..."
                    rows={2}
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
                  disabled={savingPayment}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {savingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── CANCEL BOOKING MODAL ─── */}
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleConfirmCancel}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base text-rose-700">Cancel Booking</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Are you sure you want to mark booking {booking.bookingNumber} as cancelled?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Reason for Cancellation</label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Customer emergency, date reschedule..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Back
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={cancelling}
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

