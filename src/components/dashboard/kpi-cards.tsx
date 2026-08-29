"use client";

import * as React from "react";
import Link from "next/link";
import {
  Inbox,
  FileText,
  Compass,
  IndianRupee,
  ArrowUpRight,
  Hotel,
  Car,
  Ticket,
  Building2,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { DashboardSummary } from "@/lib/services/dashboard-service";

interface KpiCardsProps {
  summary?: DashboardSummary | null;
  loading?: boolean;
}

export function KpiCards({ summary, loading = false }: KpiCardsProps) {
  const formatRupees = (valStr?: string) => {
    const val = Number(valStr || "0");
    if (isNaN(val)) return "₹0";
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const newEnquiriesCount = summary?.enquiries.new ?? 0;
  const activeQuotationsCount = summary?.quotations.total ?? 0;
  const confirmedBookingsCount = summary?.bookings.confirmed ?? 0;
  const totalCollected = summary?.payments.collected ?? "0.00";
  const totalOutstanding = summary?.payments.outstanding ?? "0.00";

  const kpiItems = [
    {
      title: "New Enquiries",
      value: String(newEnquiriesCount).padStart(2, "0"),
      subtext: `${summary?.enquiries.total ?? 0} total lifetime`,
      icon: Inbox,
      href: "/enquiries?status=NEW",
    },
    {
      title: "Active Quotations",
      value: String(activeQuotationsCount).padStart(2, "0"),
      subtext: `${summary?.quotations.accepted ?? 0} accepted`,
      icon: FileText,
      href: "/quotations",
    },
    {
      title: "Confirmed Bookings",
      value: String(confirmedBookingsCount).padStart(2, "0"),
      subtext: `${summary?.bookings.total ?? 0} total bookings`,
      icon: Compass,
      href: "/bookings",
    },
    {
      title: "Payments Collected",
      value: formatRupees(totalCollected),
      subtext: `₹${Number(totalOutstanding).toLocaleString("en-IN")} balance due`,
      icon: IndianRupee,
      href: "/payments",
    },
  ];

  const activeHotels = summary?.inventory.activeHotels ?? 0;
  const activeVehicles = summary?.inventory.activeVehicles ?? 0;
  const activeActivities = summary?.inventory.activeActivities ?? 0;
  const activeSuppliers = summary?.inventory.activeSuppliers ?? 0;
  const activeRateSheets = summary?.inventory.activeRateSheets ?? 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-slate-100 bg-white p-5 animate-pulse shadow-2xs"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-8 w-8 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-7 w-16 bg-slate-200 rounded mt-4" />
              <div className="h-3 w-32 bg-slate-100 rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 4 Core Sales KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiItems.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-xs hover:border-indigo-200 group/card animate-in fade-in duration-200 slide-in-from-bottom-2 cursor-pointer"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 group-hover/card:bg-indigo-50 group-hover/card:text-indigo-600 transition-colors">
                  <Icon className="h-4 w-4 stroke-[1.8]" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  {kpi.value}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{kpi.subtext}</span>
                <span className="flex items-center font-semibold text-indigo-600 group-hover/card:translate-x-0.5 transition-transform">
                  View <ChevronRight className="h-3 w-3 ml-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Inventory & Supplier Live Quick Strip */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Travel Inventory & B2B Rates Network
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {activeRateSheets} Active Supplier Tariffs Loaded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <Link
            href="/hotels"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-indigo-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Hotel className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Hotels</div>
                <div className="text-sm font-bold text-slate-900">{activeHotels} Active</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
          </Link>

          <Link
            href="/vehicles"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-blue-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Vehicles</div>
                <div className="text-sm font-bold text-slate-900">{activeVehicles} Fleet</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
          </Link>

          <Link
            href="/activities"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-emerald-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Ticket className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Activities</div>
                <div className="text-sm font-bold text-slate-900">{activeActivities} Tours</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
          </Link>

          <Link
            href="/suppliers"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-purple-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Suppliers</div>
                <div className="text-sm font-bold text-slate-900">{activeSuppliers} Vendors</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}
