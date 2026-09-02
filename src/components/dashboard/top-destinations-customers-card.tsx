"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Users, ArrowRight, Award, Trophy } from "lucide-react";
import { TopDestinationItem, TopCustomerItem } from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";

interface TopDestinationsCustomersCardProps {
  destinations?: TopDestinationItem[];
  customers?: TopCustomerItem[];
  loading?: boolean;
}

export function TopDestinationsCustomersCard({
  destinations = [],
  customers = [],
  loading = false,
}: TopDestinationsCustomersCardProps) {
  const formatRupees = (val?: number) => {
    if (!val || isNaN(val)) return "₹0";
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 h-64" />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 h-64" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Top Destinations */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <span>Top Destinations by Volume & Revenue</span>
            </h3>
            <p className="text-xs text-slate-500">
              Most popular travel locations and itinerary demand.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {destinations.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
              No destination data recorded for this period.
            </p>
          ) : (
            destinations.map((d, i) => (
              <div
                key={d.destination}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold flex items-center justify-center text-[10px]">
                    #{i + 1}
                  </span>
                  <div>
                    <strong className="text-slate-800 font-bold">{d.destination}</strong>
                    <span className="text-[10px] text-slate-500 block">
                      {d.bookingsCount} bookings • {d.percentageOfRevenue}% of revenue
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-slate-900">
                  {formatRupees(d.revenue)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Top High-Value Customers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span>Top High-Value Travelers & VIPs</span>
            </h3>
            <p className="text-xs text-slate-500">
              Leading clients by confirmed booking spend and trip history.
            </p>
          </div>
          <Link href="/customers" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer">
            Directory <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {customers.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
              No customer bookings recorded for this period.
            </p>
          ) : (
            customers.map((c, i) => (
              <Link
                key={c.customerId}
                href={`/customers/${c.customerId}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-md bg-amber-50 text-amber-700 font-mono font-bold flex items-center justify-center text-[10px]">
                    #{i + 1}
                  </span>
                  <div>
                    <strong className="text-slate-800 font-bold">{c.name}</strong>
                    <span className="text-[10px] text-slate-500 block">
                      {c.bookingsCount} bookings • {c.phone}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-700">
                  {formatRupees(c.totalSpend)}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
