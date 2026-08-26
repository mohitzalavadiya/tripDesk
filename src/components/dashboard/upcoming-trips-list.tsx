"use client";

import * as React from "react";
import { Compass, Calendar, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { UpcomingTripItem } from "@/lib/services/dashboard-service";

interface UpcomingTripsListProps {
  trips?: UpcomingTripItem[];
  loading?: boolean;
}

export function UpcomingTripsList({
  trips = [],
  loading = false,
}: UpcomingTripsListProps) {
  const router = useRouter();

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const getDurationString = (start: Date, end: Date) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
    const diff = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    return `${diff} Nights / ${diff + 1} Days`;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs h-full flex flex-col justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-xs flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Upcoming Trips
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed and planning travel schedules
          </p>
        </div>
        <button
          onClick={() => router.push("/trips")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {trips.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-10">
            No upcoming trips scheduled yet.
          </div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => router.push(`/trips/${trip.id}`)}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group cursor-pointer"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {trip.title}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none capitalize ${
                      trip.status === "BOOKED" || trip.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {trip.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                    {trip.customer.name}
                  </span>
                  <span>•</span>
                  <span>{getDurationString(trip.startDate, trip.endDate)}</span>
                  <span>•</span>
                  <span>{trip.travelerCount} Pax</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
