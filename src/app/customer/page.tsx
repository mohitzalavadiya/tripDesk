"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { CustomerBookingSummaryView } from "@/lib/services/customer-portal-service";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Sparkles,
  FileText,
  CreditCard,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = React.useState<CustomerBookingSummaryView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"ALL" | "ACTIVE" | "UPCOMING" | "COMPLETED">("ALL");

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await customerPortalClient.getBookings();
        setBookings(data);
      } catch (err: any) {
        if (err?.message?.includes("CUSTOMER_UNAUTHORIZED") || err?.message?.includes("Access denied")) {
          router.push("/customer/login");
        } else {
          setError(err?.message || "Failed to load bookings.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const activeTrip = bookings.find((b) => b.category === "ACTIVE");
  const upcomingTrips = bookings.filter((b) => b.category === "UPCOMING");
  const completedTrips = bookings.filter((b) => b.category === "COMPLETED");

  const filteredBookings = React.useMemo(() => {
    if (activeTab === "ACTIVE") return bookings.filter((b) => b.category === "ACTIVE");
    if (activeTab === "UPCOMING") return upcomingTrips;
    if (activeTab === "COMPLETED") return completedTrips;
    return bookings;
  }, [activeTab, bookings, upcomingTrips, completedTrips]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-semibold">Retrieving your travel itineraries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm my-12">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Unable to load trips</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/customer/login">
          <Button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold">
            Re-enter Booking Details
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/10">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>TripDesk Guest Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Your Personal Travel Hub
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 font-medium">
            Access day-by-day schedules, hotel vouchers, chauffeur details, and travel documents in one secure place.
          </p>
        </div>
      </div>

      {/* Active Ongoing Journey Highlight (if any) */}
      {activeTrip && (
        <div className="rounded-3xl bg-white border-2 border-indigo-500/30 p-6 sm:p-7 shadow-lg shadow-indigo-500/5 space-y-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                Active Journey in Progress
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Booking: <strong className="text-slate-900">{activeTrip.bookingNumber}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeTrip.tripTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                {activeTrip.travelStartDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>
                      {new Date(activeTrip.travelStartDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      –{" "}
                      {activeTrip.travelEndDate &&
                        new Date(activeTrip.travelEndDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{activeTrip.packageOptionName || "Confirmed Package"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-center">
              <Link href={`/customer/trips/${activeTrip.tripId}`} className="w-full">
                <Button className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2">
                  <span>View Live Itinerary</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href={`/customer/trips/${activeTrip.tripId}/documents`} className="w-full">
                <Button variant="outline" className="w-full h-11 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Travel Vouchers</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tabs / Filter Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              My Travel Bookings ({bookings.length})
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "ALL" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "UPCOMING" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upcoming ({upcomingTrips.length})
            </button>
            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "COMPLETED" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Past ({completedTrips.length})
            </button>
          </div>
        </div>

        {/* Bookings List Cards */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <Compass className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No bookings in this category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              If you recently confirmed a tour, please ask your travel coordinator to share your access token.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredBookings.map((b) => (
              <div
                key={b.id}
                className="group bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-500/40 p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      Ref: {b.bookingNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        b.category === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : b.category === "COMPLETED"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {b.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {b.tripTitle}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    {b.travelStartDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(b.travelStartDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          –{" "}
                          {b.travelEndDate &&
                            new Date(b.travelEndDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span>Organized by {b.agency.name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block leading-none">Payment</span>
                    <span className={`font-bold ${b.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                      {b.paymentStatus === "PAID" ? "Settled (₹" + b.totalAmount + ")" : "Due: ₹" + b.balanceAmount}
                    </span>
                  </div>

                  <Link href={`/customer/trips/${b.tripId}`}>
                    <Button
                      size="sm"
                      className="rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs gap-1.5 transition-colors"
                    >
                      <span>Explore Trip</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
