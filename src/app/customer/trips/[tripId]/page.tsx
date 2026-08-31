"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { CustomerTripDetailView } from "@/lib/services/customer-portal-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Compass,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  FileText,
  CreditCard,
  Hotel,
  Car,
  Ticket,
  Users,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  Star,
} from "lucide-react";

export default function CustomerTripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = (params?.tripId as string) || "";

  const [trip, setTrip] = React.useState<CustomerTripDetailView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<
    "ITINERARY" | "HOTELS" | "TRANSFERS" | "ACTIVITIES" | "TRAVELERS"
  >("ITINERARY");

  React.useEffect(() => {
    async function loadTrip() {
      if (!tripId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await customerPortalClient.getTrip(tripId);
        setTrip(data);
      } catch (err: any) {
        if (err?.message?.includes("CUSTOMER_UNAUTHORIZED")) {
          router.push("/customer/login");
        } else {
          setError(err?.message || "Failed to load trip workspace.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadTrip();
  }, [tripId, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-semibold">Loading your travel experience...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm my-12">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Trip Unavailable</h2>
        <p className="text-xs text-slate-500">{error || "Trip not found."}</p>
        <Link href="/customer">
          <Button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold">
            Return to My Trips
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Back Button */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/customer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Trips</span>
        </Link>

        {/* Quick Document & Payment Shortcuts */}
        <div className="flex items-center gap-2">
          <Link href={`/customer/trips/${trip.id}/documents`}>
            <Button
              size="sm"
              variant="outline"
              className="h-8.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Documents</span>
            </Button>
          </Link>
          <Link href={`/customer/trips/${trip.id}/payments`}>
            <Button
              size="sm"
              variant="outline"
              className="h-8.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Payment</span>
            </Button>
          </Link>
          {trip.status === "COMPLETED" && (
            <Link href={`/customer/trips/${trip.id}/feedback`}>
              <Button
                size="sm"
                className="h-8.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold gap-1.5 shadow-2xs"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>Rate Trip</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Trip #{trip.tripNumber}
            </span>
            {trip.bookingSummary && (
              <span className="text-[11px] font-bold text-slate-300">
                Booking: <strong className="text-white">{trip.bookingSummary.bookingNumber}</strong>
              </span>
            )}
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{trip.customerStatusLabel}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{trip.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>
                {new Date(trip.startDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                –{" "}
                {new Date(trip.endDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>{trip.travelers.length} Travelers</span>
            </div>
          </div>
        </div>

        {/* Agency Support Strip */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Tour Operator</span>
            <span className="font-bold text-white">{trip.agency.name}</span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            {trip.agency.phone && (
              <a
                href={`tel:${trip.agency.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{trip.agency.phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-slate-200/70 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveSection("ITINERARY")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "ITINERARY"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Itinerary ({trip.itinerary.length} Days)</span>
        </button>
        <button
          onClick={() => setActiveSection("HOTELS")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "HOTELS"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Hotel className="w-4 h-4" />
          <span>Hotels ({trip.accommodations.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("TRANSFERS")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "TRANSFERS"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Transfers & Drivers ({trip.transfers.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("ACTIVITIES")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "ACTIVITIES"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Activities ({trip.activities.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("TRAVELERS")}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "TRAVELERS"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Travelers ({trip.travelers.length})</span>
        </button>
      </div>

      {/* 1. ITINERARY SECTION */}
      {activeSection === "ITINERARY" && (
        <div className="space-y-4">
          {trip.itinerary.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-semibold">
              Itinerary schedule is being finalized by your travel coordinator.
            </div>
          ) : (
            <div className="space-y-4">
              {trip.itinerary.map((day) => (
                <div
                  key={day.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center border border-indigo-100">
                        D{day.dayNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{day.title}</h3>
                    </div>
                    {day.visitTime && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{day.visitTime}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                    {day.description}
                  </p>

                  {day.location && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold pt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{day.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. HOTELS SECTION */}
      {activeSection === "HOTELS" && (
        <div className="space-y-4">
          {trip.accommodations.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-semibold">
              No hotel stays configured for this itinerary.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {trip.accommodations.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                        {h.category || "Hotel Accommodation"}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmed</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{h.hotelName}</h3>
                    {h.city && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{h.city}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Check-In</span>
                        <span className="font-bold text-slate-800">
                          {new Date(h.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Check-Out</span>
                        <span className="font-bold text-slate-800">
                          {new Date(h.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Room Type</span>
                        <span className="font-bold text-slate-800">{h.roomType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Meal Plan</span>
                        <span className="font-bold text-slate-800">{h.mealPlan || "Room Only"}</span>
                      </div>
                    </div>
                  </div>

                  {h.confirmationNumber && (
                    <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                      <span>Hotel Conf Ref:</span>
                      <strong className="text-slate-900">{h.confirmationNumber}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. TRANSFERS SECTION */}
      {activeSection === "TRANSFERS" && (
        <div className="space-y-4">
          {trip.transfers.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-semibold">
              No private transfers or vehicle dispatches assigned.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {trip.transfers.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {t.category || "Vehicle Transfer"}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.status}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{t.vehicleName}</h3>

                  <div className="space-y-2 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    {t.pickupLocation && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Pickup Location</span>
                          <span className="font-semibold text-slate-800">{t.pickupLocation}</span>
                        </div>
                      </div>
                    )}
                    {t.dropLocation && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Drop Location</span>
                          <span className="font-semibold text-slate-800">{t.dropLocation}</span>
                        </div>
                      </div>
                    )}
                    {t.pickupTime && (
                      <div className="flex items-center gap-2 pt-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Pickup Time: <strong>{t.pickupTime}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Driver / Chauffeur Card */}
                  {t.driverName ? (
                    <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-indigo-600 block">Chauffeur Assigned</span>
                        <span className="font-bold text-slate-900">{t.driverName}</span>
                        {t.vehicleNumber && <span className="text-slate-500 block text-[11px] font-semibold">{t.vehicleNumber}</span>}
                      </div>
                      {t.driverPhone && (
                        <a
                          href={`tel:${t.driverPhone}`}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-indigo-700 shadow-2xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-semibold text-center py-1">
                      Chauffeur details will be updated prior to departure.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ACTIVITIES SECTION */}
      {activeSection === "ACTIVITIES" && (
        <div className="space-y-4">
          {trip.activities.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-semibold">
              No excursions or activities configured for this package.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {trip.activities.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      {a.type || "Excursion"}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">Confirmed</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{a.activityName}</h3>

                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    {a.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{a.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{a.participantsCount} Participants</span>
                    </div>
                  </div>

                  {a.ticketNumber && (
                    <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
                      <span className="text-slate-400">Pass / Ticket Ref:</span>
                      <strong className="text-slate-900">{a.ticketNumber}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TRAVELERS SECTION */}
      {activeSection === "TRAVELERS" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Passenger Manifest ({trip.travelers.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trip.travelers.map((t, index) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{index + 1}. {t.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {t.type}
                  </span>
                </div>
                {t.specialRequirements && (
                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    Special Requests: {t.specialRequirements}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
