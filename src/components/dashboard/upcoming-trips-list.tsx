"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  Calendar,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Hotel,
  Car,
  Ticket,
  ExternalLink,
} from "lucide-react";
import { UpcomingDepartureItem } from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";

interface UpcomingTripsListProps {
  trips?: UpcomingDepartureItem[];
  loading?: boolean;
}

export function UpcomingTripsList({
  trips = [],
  loading = false,
}: UpcomingTripsListProps) {
  const formatDate = (dateVal?: string | null) => {
    if (!dateVal) return "-";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatRupees = (val?: number) => {
    if (!val || isNaN(val)) return "₹0";
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs h-full flex flex-col justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-600" />
            <span>Upcoming Departures & Operational Command</span>
          </h3>
          <p className="text-xs text-slate-500">
            Real-time operational readiness, payment clearance, and travel document status.
          </p>
        </div>
        <Link
          href="/operations"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          Operations Center <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
        {trips.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-12 bg-slate-50 rounded-xl">
            No upcoming departures scheduled in the next 30 days.
          </div>
        ) : (
          trips.map((trip) => {
            const rScore = trip.readiness.score;
            const rBadgeColor =
              rScore >= 100
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : rScore >= 50
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-rose-50 text-rose-700 border-rose-200";

            return (
              <div
                key={trip.tripId}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-100/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/trips/${trip.tripId}`}
                      className="font-bold text-xs text-slate-900 hover:text-indigo-600 transition-colors truncate max-w-[200px]"
                    >
                      {trip.tripTitle}
                    </Link>
                    <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 ${rBadgeColor}`}>
                      {rScore}% Ready
                    </Badge>
                    {trip.booking && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono font-bold px-1.5 py-0 ${
                          trip.booking.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : trip.booking.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {trip.booking.paymentStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                    <span>
                      Traveler: <strong className="text-slate-700 font-bold">{trip.customer.name}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                    </span>
                    <span>•</span>
                    <span className="text-slate-600 font-bold">{trip.destination}</span>
                  </div>
                </div>

                {/* Document Readiness Badges & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <span
                      title={`Hotel Voucher: ${trip.documents.hasHotelVoucher ? "Generated" : "Missing"}`}
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        trip.documents.hasHotelVoucher
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      <Hotel className="h-3 w-3" />
                    </span>
                    <span
                      title={`Vehicle Voucher: ${trip.documents.hasVehicleVoucher ? "Generated" : "Missing"}`}
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        trip.documents.hasVehicleVoucher
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      <Car className="h-3 w-3" />
                    </span>
                    <span
                      title={`Activity Voucher: ${trip.documents.hasActivityVoucher ? "Generated" : "Missing"}`}
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        trip.documents.hasActivityVoucher
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      <Ticket className="h-3 w-3" />
                    </span>
                    <span
                      title={`Confirmation: ${trip.documents.hasBookingConfirmation ? "Generated" : "Missing"}`}
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        trip.documents.hasBookingConfirmation
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      <FileCheck className="h-3 w-3" />
                    </span>
                  </div>

                  {trip.booking && (
                    <Link
                      href={`/bookings/${trip.booking.id}`}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                    >
                      Booking
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
