"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { tripPublicClient, bookingPublicClient } from "@/lib/api-client";
import { PublicTripPayload } from "@/lib/services/trip-public-service";
import { PublicBookingPayload } from "@/lib/services/booking-public-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Compass,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Users,
  Hotel,
  Car,
  Ticket,
  Printer,
  Phone,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  IndianRupee,
  AlertTriangle,
  HelpCircle,
  X,
  CreditCard,
  Building2,
} from "lucide-react";

export default function CustomerTripPortalPage() {
  const params = useParams();
  const secureToken = (params?.secureToken as string) || "";

  const [trip, setTrip] = React.useState<PublicTripPayload | null>(null);
  const [booking, setBooking] = React.useState<PublicBookingPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [helpMessage, setHelpMessage] = React.useState("");

  React.useEffect(() => {
    async function loadData() {
      if (!secureToken) {
        setError("Invalid or missing portal token.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try fetching public trip first
        let tripData: PublicTripPayload | null = null;
        try {
          tripData = await tripPublicClient.getByToken(secureToken);
        } catch {
          // If trip lookup fails, try booking lookup
        }

        let bookingData: PublicBookingPayload | null = null;
        try {
          bookingData = await bookingPublicClient.getByToken(secureToken);
        } catch {
          // It's okay if booking lookup fails
        }

        if (tripData) {
          setTrip(tripData);
        }
        if (bookingData) {
          setBooking(bookingData);
          if (!tripData && bookingData.trip) {
            // Reconstruct minimal trip payload if only booking resolved
            setTrip({
              id: bookingData.trip.id,
              tripNumber: bookingData.trip.tripNumber,
              title: bookingData.trip.title,
              startDate: bookingData.trip.startDate,
              endDate: bookingData.trip.endDate,
              status: bookingData.trip.status as any,
              agency: bookingData.agency,
              customer: bookingData.customer,
              travelers: bookingData.trip.travelers,
              itinerary: bookingData.trip.itinerary,
              hotels: bookingData.trip.hotels,
              vehicles: bookingData.trip.vehicles,
              activities: bookingData.trip.activities,
              bookingSummary: {
                id: bookingData.id,
                bookingNumber: bookingData.bookingNumber,
                status: bookingData.status,
                paymentStatus: bookingData.paymentStatus,
                packageOptionName: bookingData.packageOptionName,
                currency: bookingData.currency,
                totalAmount: bookingData.totalAmount,
                paidAmount: bookingData.paidAmount,
                balanceAmount: bookingData.balanceAmount,
              },
            });
          }
        }

        if (!tripData && !bookingData) {
          setError("Trip or Booking portal link not found or has expired.");
        }
      } catch (err: any) {
        console.error("Failed to load public portal:", err);
        setError("Unable to load travel details. Please contact your travel advisor.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [secureToken]);

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRupees = (valStr?: string) => {
    const val = Number(valStr || "0");
    if (isNaN(val)) return "₹0";
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 mx-auto" />
          <div className="h-5 w-48 bg-slate-700 rounded mx-auto" />
          <div className="h-3 w-64 bg-slate-700/60 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Portal Link Expired</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error || "We couldn't locate an active travel booking associated with this link."}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">Please contact your travel agency for assistance.</p>
        </div>
      </div>
    );
  }

  const isConfirmed = trip.status === "BOOKED" || trip.bookingSummary?.status === "CONFIRMED";
  const isOngoing = trip.status === "ONGOING";
  const isCompleted = trip.status === "COMPLETED";

  const handleHelpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneClean = (trip.agency.phone || "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hello ${trip.agency.name}, I need assistance with Trip ${trip.tripNumber} (${trip.title}): ${helpMessage}`
    );
    window.open(`https://wa.me/${phoneClean}?text=${text}`, "_blank");
    setIsHelpModalOpen(false);
    toast.success("Opening WhatsApp chat with your travel consultant.");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white font-sans antialiased pb-28">
      {/* ─── FLOATING TOP BRANDING BAR ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs py-3 px-4 sm:px-8 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm block truncate">
                {trip.agency.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                Ref: {trip.bookingSummary?.bookingNumber || trip.tripNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-xl hidden sm:inline-flex cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Print Itinerary
            </Button>

            <Button
              size="sm"
              onClick={() => setIsHelpModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>Contact Advisor</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MAIN PORTAL BODY ───────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl ${
            isOngoing
              ? "bg-gradient-to-tr from-slate-950 via-emerald-950 to-indigo-950"
              : isCompleted
              ? "bg-gradient-to-tr from-slate-900 via-indigo-950 to-teal-950"
              : isConfirmed
              ? "bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900"
              : "bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950"
          }`}
        >
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              {isOngoing ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  LIVE ON TOUR
                </span>
              ) : isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                  TOUR COMPLETED
                </span>
              ) : isConfirmed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  CONFIRMED BOOKING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  PLANNED ITINERARY
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {trip.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>Guest: <strong>{trip.customer.name}</strong></span>
                <span>•</span>
                <span>{formatDate(trip.startDate)} → {formatDate(trip.endDate)}</span>
                <span>•</span>
                <span>{trip.travelers.length || 1} Travelers</span>
              </p>
            </div>
          </div>
        </div>

        {/* ─── PAYMENT STATEMENT (IF BOOKING EXISTS) ──────────────────────── */}
        {trip.bookingSummary && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Payment Statement
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {trip.bookingSummary.bookingNumber}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Package</span>
                <span className="text-sm sm:text-base font-black text-slate-900">
                  {formatRupees(trip.bookingSummary.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount Paid</span>
                <span className="text-sm sm:text-base font-bold text-emerald-600">
                  {formatRupees(trip.bookingSummary.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance Due</span>
                <span className="text-sm sm:text-base font-bold text-amber-600">
                  {formatRupees(trip.bookingSummary.balanceAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── DAY-BY-DAY ITINERARY SCHEDULE ─────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Day-by-Day Travel Schedule
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {trip.itinerary.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Detailed day schedule will be updated shortly by your advisor.
              </p>
            ) : (
              trip.itinerary.map((day) => (
                <div
                  key={day.id}
                  className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/40 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                        {day.dayNumber}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{day.title}</h4>
                    </div>
                    {day.location && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {day.location}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    {day.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── CONFIRMED ACCOMMODATIONS ──────────────────────────────────── */}
        {trip.hotels.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Hotel Accommodations
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {trip.hotels.map((h) => (
                <div
                  key={h.id}
                  className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{h.hotelName}</h4>
                      <p className="text-xs text-slate-500">{h.city}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded self-start sm:self-auto">
                      {h.nights} Nights • {h.roomsCount} Rooms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-in</span>
                      <span className="font-bold text-slate-800">{formatDate(h.checkIn)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-out</span>
                      <span className="font-bold text-slate-800">{formatDate(h.checkOut)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                      <span className="font-bold text-slate-800">{h.roomType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Meal Plan</span>
                      <span className="font-bold text-slate-800">{h.mealPlan}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── DEDICATED FLEET & VEHICLES ────────────────────────────────── */}
        {trip.vehicles.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Car className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Private Transport & Transfers
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trip.vehicles.map((v) => (
                <div key={v.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle</span>
                  <p className="font-bold text-slate-900 text-sm">{v.vehicleName} ({v.category})</p>
                  <p className="text-xs text-slate-500">
                    Duration: {formatDate(v.startDate)} – {formatDate(v.endDate)}
                  </p>
                  {v.driverName && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Chauffeur</span>
                      <p className="font-semibold text-slate-800 text-xs">{v.driverName}</p>
                      {v.driverPhone && (
                        <a
                          href={`tel:${v.driverPhone}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1"
                        >
                          <Phone className="h-3 w-3" /> {v.driverPhone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SIGHTSEEING & ACTIVITIES ─────────────────────────────────── */}
        {trip.activities.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Ticket className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Sightseeing & Experiences
              </h3>
            </div>

            <div className="space-y-2.5">
              {trip.activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900">{a.activityName}</span>
                    <p className="text-slate-500">{a.location} • {formatDate(a.date)}</p>
                  </div>
                  <span className="font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {a.participantsCount} Participants
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ─── "CONTACT ADVISOR" MODAL ────────────────────────────────────── */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Message Your Travel Advisor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleHelpSubmit} className="space-y-3">
              <textarea
                placeholder="Type your question or request..."
                rows={3}
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-indigo-600"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHelpModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Send via WhatsApp
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
