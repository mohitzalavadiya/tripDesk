"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBooking } from "@/context/booking-context";
import { BookingItem, BookingDocument } from "@/types";
import { BookingStatusBadge, PaymentStatusBadge, ItemStatusBadge } from "@/components/booking/booking-status-badge";
import { AddPaymentModal } from "@/components/booking/add-payment-modal";
import { SupplierPaymentModal } from "@/components/booking/supplier-payment-modal";
import { ConfirmItemModal } from "@/components/booking/confirm-item-modal";
import { CancelBookingModal } from "@/components/booking/cancel-booking-modal";
import { DocumentPreviewModal } from "@/components/booking/document-preview-modal";
import { formatCurrency } from "@/lib/costing-engine";
import { generatePaymentReminderMessage, generateBookingShareMessage } from "@/lib/booking/document-templates";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  ShieldCheck,
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
} from "lucide-react";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { getBooking } = useBooking();

  const booking = getBooking(bookingId);

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "items" | "itinerary" | "payments" | "financials" | "documents" | "timeline"
  >("overview");

  // Modal States
  const [isAddPaymentOpen, setIsAddPaymentOpen] = React.useState(false);
  const [isSupplierPaymentOpen, setIsSupplierPaymentOpen] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [selectedItemForConfirm, setSelectedItemForConfirm] = React.useState<BookingItem | null>(null);
  const [previewDocType, setPreviewDocType] = React.useState<BookingDocument["type"] | null>(null);
  const [previewItem, setPreviewItem] = React.useState<BookingItem | null>(null);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Booking File Not Found</h2>
          <p className="text-xs text-slate-500">
            The booking with ID &quot;{bookingId}&quot; does not exist or has been archived.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/bookings")}
            className="text-xs font-semibold cursor-pointer"
          >
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  // Calculate Confirmation Progress
  const totalItems = booking.items.length;
  const confirmedItems = booking.items.filter((i) => i.status === "Confirmed").length;
  const confirmationProgress = totalItems > 0 ? Math.round((confirmedItems / totalItems) * 100) : 0;

  // Copy WhatsApp Reminder
  const handleCopyPaymentReminder = () => {
    const msg = generatePaymentReminderMessage(booking, booking.agencySnapshot?.phone);
    navigator.clipboard.writeText(msg);
    toast.success("Payment reminder message copied to clipboard!");
  };

  // Copy Public Customer Portal Link
  const handleCopyCustomerLink = () => {
    const url = `${window.location.origin}/trip/${booking.secureToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Customer booking portal link copied!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ─── TOP BREADCRUMB & ACTION BAR ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/bookings" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Bookings
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-700">{booking.bookingNumber}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {booking.title}
              </h1>
              <BookingStatusBadge status={booking.status} />
              <PaymentStatusBadge status={booking.paymentStatus} />
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Customer: <strong>{booking.customerSnapshot.name}</strong></span>
              <span>•</span>
              <span>{booking.startDate} → {booking.endDate}</span>
              <span>•</span>
              <span>{booking.adults} Adults {booking.children > 0 && `+ ${booking.children} Kids`}</span>
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            {/* Customer Portal Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCustomerLink}
              className="text-xs font-semibold h-8.5 rounded-xl cursor-pointer bg-white"
              title="Copy public customer portal link"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Customer Link
            </Button>

            {/* Add Payment */}
            <Button
              size="sm"
              onClick={() => setIsAddPaymentOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer shadow-2xs"
            >
              <IndianRupee className="h-3.5 w-3.5 mr-1" />
              Add Payment
            </Button>

            {/* Document Preview */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewDocType("Booking Confirmation");
                setPreviewItem(null);
              }}
              className="text-xs font-semibold h-8.5 rounded-xl cursor-pointer bg-white"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Voucher / Docs
            </Button>

            {/* Cancel Booking */}
            {booking.status !== "Cancelled" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs font-semibold h-8.5 rounded-xl cursor-pointer"
              >
                Cancel Booking
              </Button>
            )}
          </div>
        </div>

        {/* ─── NAVIGATION TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-px no-scrollbar">
          {[
            { id: "overview", label: "Overview" },
            { id: "items", label: `Bookings (${booking.items.length})` },
            { id: "itinerary", label: "Itinerary" },
            { id: "payments", label: `Payments (${booking.payments.length})` },
            { id: "financials", label: "Financials (Internal)", isInternal: true },
            { id: "documents", label: `Documents (${booking.documents.length})` },
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
                {tab.isInternal && <Lock className="h-3 w-3 text-amber-500" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in-0">
            {/* Operational Alerts Banner */}
            {booking.pendingAmount > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Payment Pending: {formatCurrency(booking.pendingAmount)} Outstanding
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Send a reminder or record payment when received from {booking.customerSnapshot.name}.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleCopyPaymentReminder}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer shrink-0"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Copy WhatsApp Reminder
                </Button>
              </div>
            )}

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Customer Information
                  </span>
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{booking.customerSnapshot.name}</p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {booking.customerSnapshot.phone || "-"}
                  </p>
                  {booking.customerSnapshot.email && (
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {booking.customerSnapshot.email}
                    </p>
                  )}
                  {booking.customerSnapshot.city && (
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {booking.customerSnapshot.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Trip Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Trip Overview
                  </span>
                  <Compass className="h-4 w-4 text-slate-400" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{booking.destination}</p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {booking.startDate} → {booking.endDate}
                  </p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {booking.adults} Adults{booking.children > 0 ? `, ${booking.children} Children` : ""}
                  </p>
                  <p className="text-[11px] text-indigo-600 font-semibold pt-1">
                    Quotation Ref: {booking.quotationId ? "QT-Linked" : "Direct"}
                  </p>
                </div>
              </div>

              {/* Payment Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Customer Payment Status
                  </span>
                  <IndianRupee className="h-4 w-4 text-slate-400" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500">Total Price:</span>
                    <span className="font-black text-slate-900 text-base">{formatCurrency(booking.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Collected:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(booking.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pending:</span>
                    <span className="font-bold text-amber-600">{formatCurrency(booking.pendingAmount)}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          booking.totalAmount > 0
                            ? Math.min(100, (booking.paidAmount / booking.totalAmount) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Services Confirmation Progress */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supplier Confirmation Progress</h3>
                  <p className="text-xs text-slate-500">
                    {confirmedItems} of {totalItems} travel services confirmed by suppliers
                  </p>
                </div>
                <span className="text-sm font-black text-indigo-600 font-mono">
                  {confirmationProgress}% Complete
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    confirmationProgress === 100 ? "bg-emerald-500" : "bg-indigo-600"
                  }`}
                  style={{ width: `${confirmationProgress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {booking.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemForConfirm(item);
                    }}
                    className="border border-slate-100 rounded-xl p-3 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-200 transition-all cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-800 truncate block">{item.title}</span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {item.type} • {item.supplierName || "Direct"}
                      </span>
                    </div>
                    <ItemStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: BOOKINGS (ITEMS) ────────────────────────────────────── */}
        {activeTab === "items" && (
          <div className="space-y-6 animate-in fade-in-0">
            {/* Hotels Section */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Hotel & Resort Bookings
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {booking.items
                  .filter((i) => i.type === "Hotel")
                  .map((hotel) => (
                    <div
                      key={hotel.id}
                      className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{hotel.title}</h4>
                            <ItemStatusBadge status={hotel.status} />
                          </div>
                          <p className="text-xs text-slate-500">
                            {hotel.destination} • {hotel.roomType} ({hotel.numberOfRooms} Room{hotel.numberOfRooms && hotel.numberOfRooms > 1 ? "s" : ""}) • {hotel.mealPlan}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {hotel.confirmationNumber && (
                            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                              Ref: {hotel.confirmationNumber}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedItemForConfirm(hotel)}
                            className="h-8 text-xs font-semibold cursor-pointer bg-white"
                          >
                            Update / Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPreviewDocType("Hotel Voucher");
                              setPreviewItem(hotel);
                            }}
                            className="h-8 text-xs font-semibold cursor-pointer"
                            title="Generate Hotel Voucher"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Voucher
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-in</span>
                          <span className="font-bold text-slate-800">{hotel.startDate || booking.startDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-out</span>
                          <span className="font-bold text-slate-800">{hotel.endDate || booking.endDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration</span>
                          <span className="font-bold text-slate-800">{hotel.nights || 2} Nights</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier Partner</span>
                          <span className="font-bold text-indigo-600">{hotel.supplierName || "Direct"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Vehicles Section */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Vehicle & Fleet Bookings
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {booking.items
                  .filter((i) => i.type === "Vehicle")
                  .map((veh) => (
                    <div
                      key={veh.id}
                      className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{veh.title}</h4>
                            <ItemStatusBadge status={veh.status} />
                          </div>
                          <p className="text-xs text-slate-500">{veh.subtitle || "Private AC Vehicle"}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {veh.confirmationNumber && (
                            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                              Slip: {veh.confirmationNumber}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedItemForConfirm(veh)}
                            className="h-8 text-xs font-semibold cursor-pointer bg-white"
                          >
                            Update / Assign Driver
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPreviewDocType("Vehicle Confirmation");
                              setPreviewItem(veh);
                            }}
                            className="h-8 text-xs font-semibold cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Voucher
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Pickup</span>
                          <span className="font-bold text-slate-800">{veh.pickupLocation || booking.destination}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Drop</span>
                          <span className="font-bold text-slate-800">{veh.dropLocation || booking.destination}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Driver</span>
                          <span className="font-bold text-slate-800">{veh.driverName || "Pending Assignment"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Driver Phone</span>
                          <span className="font-bold text-slate-800">{veh.driverPhone || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Activities Section */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Activities & Excursions
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {booking.items
                  .filter((i) => i.type === "Activity")
                  .map((act) => (
                    <div
                      key={act.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900">{act.title}</h4>
                          <ItemStatusBadge status={act.status} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {act.destination} • {act.guests || booking.adults} Guests • {act.time || "Scheduled Slot"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {act.confirmationNumber && (
                          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                            {act.confirmationNumber}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItemForConfirm(act)}
                          className="h-8 text-xs font-semibold cursor-pointer bg-white"
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: ITINERARY ───────────────────────────────────────────── */}
        {activeTab === "itinerary" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Confirmed Travel Itinerary
            </h3>

            {booking.itinerarySnapshot && booking.itinerarySnapshot.length > 0 ? (
              <div className="space-y-4">
                {booking.itinerarySnapshot.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="flex gap-4 border-l-2 border-indigo-500 pl-4 py-1"
                  >
                    <div className="shrink-0 font-bold text-xs text-indigo-600">
                      Day {day.dayNumber}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-slate-900">{day.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{day.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No day-by-day itinerary snapshot available for this booking.
              </p>
            )}
          </div>
        )}

        {/* ─── TAB 4: PAYMENTS ────────────────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-in fade-in-0">
            {/* Customer Payments Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Customer Payment Transactions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Collected {formatCurrency(booking.paidAmount)} of {formatCurrency(booking.totalAmount)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsAddPaymentOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-3 rounded-xl cursor-pointer"
                  >
                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                    + Add Payment
                  </Button>
                </div>
              </div>

              {booking.payments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No customer payments recorded yet. Click &quot;+ Add Payment&quot; above.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {booking.payments.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(p.amount)}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {p.date} • {p.method} {p.transactionId && `(Ref: ${p.transactionId})`}
                        </p>
                        {p.notes && <p className="text-[11px] text-slate-600 italic">{p.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                          {p.receiptNumber}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPreviewDocType("Payment Receipt");
                            setPreviewItem(null);
                          }}
                          className="h-7.5 text-xs font-semibold cursor-pointer bg-white"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Refunds Section (If Any) */}
            {booking.refunds.length > 0 && (
              <div className="bg-white border border-rose-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-rose-600" />
                    <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                      Customer Refund Records
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {booking.refunds.map((ref) => (
                    <div
                      key={ref.id}
                      className="border border-rose-100 bg-rose-50/40 rounded-xl p-3.5 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-black text-rose-700 text-sm">
                          {formatCurrency(ref.amount)}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Status: <strong>{ref.status}</strong> • Date: {ref.date}
                        </p>
                        {ref.notes && <p className="text-[11px] text-slate-500 mt-0.5">{ref.notes}</p>}
                      </div>

                      {ref.status === "Pending" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const refNo = prompt("Enter Refund Reference / Bank UTR Number:");
                            if (refNo) {
                              toast.success("Refund processed successfully!");
                            }
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 cursor-pointer"
                        >
                          Process Refund
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: FINANCIALS (INTERNAL ONLY) ──────────────────────────── */}
        {activeTab === "financials" && (
          <div className="space-y-6 animate-in fade-in-0">
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Internal Agent Financial Summary — strictly confidential and never visible on customer links.</span>
            </div>

            {/* Financial Breakdown Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Profit & Loss Breakdown
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Selling</span>
                  <span className="text-sm font-black text-slate-900">{formatCurrency(booking.totalAmount)}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Paid</span>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(booking.paidAmount)}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier Cost</span>
                  <span className="text-sm font-bold text-slate-700">{formatCurrency(booking.totalSupplierCost)}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier Paid</span>
                  <span className="text-sm font-bold text-blue-600">{formatCurrency(booking.paidSupplierCost)}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier Payable</span>
                  <span className="text-sm font-bold text-amber-600">{formatCurrency(booking.pendingSupplierCost)}</span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Expected Profit</span>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(booking.expectedProfit)}</span>
                </div>
              </div>
            </div>

            {/* Supplier Payables Log */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Supplier Payable Disbursements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paid {formatCurrency(booking.paidSupplierCost)} of {formatCurrency(booking.totalSupplierCost)}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsSupplierPaymentOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3 rounded-xl cursor-pointer"
                >
                  + Record Supplier Payment
                </Button>
              </div>

              {booking.supplierPayments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No supplier disbursements recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {booking.supplierPayments.map((sp) => (
                    <div key={sp.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{formatCurrency(sp.amount)}</span>
                        <p className="text-[11px] text-slate-500">
                          To: <strong>{sp.supplierName}</strong> • {sp.date} • {sp.method}
                        </p>
                        {sp.notes && <p className="text-[11px] text-slate-500 italic">{sp.notes}</p>}
                      </div>
                      {sp.transactionId && (
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                          {sp.transactionId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 6: DOCUMENTS ───────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Generated Vouchers & Documents
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {booking.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{doc.name}</h4>
                      <p className="text-[11px] text-slate-400">{doc.type}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewDocType(doc.type);
                      setPreviewItem(null);
                    }}
                    className="text-xs font-semibold h-8 rounded-lg cursor-pointer bg-white"
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    Print
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 7: TIMELINE ────────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Booking Activity & Audit Log
            </h3>

            <div className="space-y-4">
              {booking.timeline.map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{event.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{event.createdAt.split("T")[0]}</span>
                    </div>
                    {event.description && <p className="text-slate-600">{event.description}</p>}
                    {event.actor && <p className="text-[10px] text-indigo-600">By: {event.actor}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      <AddPaymentModal
        booking={booking}
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
      />

      <SupplierPaymentModal
        booking={booking}
        isOpen={isSupplierPaymentOpen}
        onClose={() => setIsSupplierPaymentOpen(false)}
      />

      <ConfirmItemModal
        bookingId={booking.id}
        item={selectedItemForConfirm}
        isOpen={!!selectedItemForConfirm}
        onClose={() => setSelectedItemForConfirm(null)}
      />

      <CancelBookingModal
        booking={booking}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
      />

      <DocumentPreviewModal
        booking={booking}
        docType={previewDocType || "Booking Confirmation"}
        selectedItem={previewItem}
        isOpen={!!previewDocType}
        onClose={() => setPreviewDocType(null)}
      />
    </div>
  );
}
