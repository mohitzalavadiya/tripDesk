"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useExperience } from "@/context/experience-context";
import { useEnquiry } from "@/context/enquiry-context";
import { useBooking } from "@/context/booking-context";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Award,
  CreditCard,
  Star,
  Hotel,
  Car,
  ShieldCheck,
  Sparkles,
  UserCheck,
  ArrowRight,
} from "lucide-react";

export default function CustomerInsightsPage() {
  const router = useRouter();
  const { customers, trips } = useEnquiry();
  const { bookings } = useBooking();
  const {
    getFeedbackStats,
    getReferralStats,
    getSupplierPerformanceMetrics,
    feedbacks,
  } = useExperience();

  const fStats = getFeedbackStats();
  const refStats = getReferralStats();
  const supplierMetrics = getSupplierPerformanceMetrics();

  // Basic aggregate computations
  const totalCustomers = customers.length;
  const repeatCustomersCount = customers.filter((c) => {
    const cTrips = trips.filter((t) => t.customerId === c.id);
    return cTrips.length >= 2;
  }).length;

  const repeatRate =
    totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 22.7;

  const totalCompletedBookingsRevenue = bookings
    .filter((b) => b.status !== "Cancelled")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const averageLTV =
    totalCustomers > 0
      ? Math.round(totalCompletedBookingsRevenue / totalCustomers)
      : 125000;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Customer Insights & Retention Analytics"
          description="Track repeat customer rate, loyalty tier distributions, and supplier service performance."
          breadcrumbs={[{ label: "Experience & Retention" }, { label: "Customer Insights" }]}
        />

        {/* ─── 4 RETENTION KPI CARDS ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Customers</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{totalCustomers}</p>
            <p className="text-[11px] text-slate-500 font-medium">Registered traveler profiles</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Repeat Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{repeatRate}%</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {repeatCustomersCount} Repeat Travelers
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average LTV</span>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 tracking-tight">
              {formatCurrency(averageLTV)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Lifetime value per guest</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average CSAT</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {fStats.averageRating} ⭐
            </p>
            <p className="text-[11px] text-slate-500 font-medium">From {fStats.totalFeedback} reviews</p>
          </div>
        </div>

        {/* ─── 2-COLUMN SECTION: LOYALTY TIERS & SUPPLIER PERFORMANCE ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: Loyalty Tier Breakdown */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Loyalty Tier Member Distribution
                </h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="text-purple-900 flex items-center gap-1.5">
                    💎 Platinum Members (5+ Tours)
                  </span>
                  <span className="text-purple-700">10% Member Base</span>
                </div>
                <div className="w-full bg-purple-200/60 rounded-full h-1.5">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: "10%" }}></div>
                </div>
                <span className="text-[10px] text-purple-700 block">
                  Benefits: 10% Discount, Priority Booking & Luxury Welcome Basket
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="text-amber-900 flex items-center gap-1.5">
                    🥇 Gold Members (3–4 Tours)
                  </span>
                  <span className="text-amber-700">35% Member Base</span>
                </div>
                <div className="w-full bg-amber-200/60 rounded-full h-1.5">
                  <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: "35%" }}></div>
                </div>
                <span className="text-[10px] text-amber-700 block">
                  Benefits: 6% Discount, Free Vehicle Upgrades on availability
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    🥈 Silver Members (1–2 Tours)
                  </span>
                  <span className="text-slate-600">55% Member Base</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-slate-600 h-1.5 rounded-full" style={{ width: "55%" }}></div>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Benefits: 3% Discount, ₹500 Referral Credits
                </span>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Supplier Performance Quality Scorecard */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Fleet & Supplier Quality Scorecard
            </h3>

            {/* Drivers Scorecard */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                Top Fleet Chauffeurs
              </span>
              <div className="divide-y divide-slate-100 text-xs">
                {supplierMetrics.drivers.map((drv, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{drv.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {drv.trips} Tours • {drv.complaints === 0 ? "Zero Complaints ✓" : `${drv.complaints} Complaint logged`}
                      </span>
                    </div>
                    <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      {drv.averageRating} ⭐
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hotels Scorecard */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                Hotel Partners Feedback
              </span>
              <div className="divide-y divide-slate-100 text-xs">
                {supplierMetrics.hotels.map((htl, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{htl.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {htl.bookings} Bookings • {htl.complaints} Complaints
                      </span>
                    </div>
                    <span
                      className={`font-black px-2 py-0.5 rounded border ${
                        htl.averageRating >= 4.5
                          ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                          : "text-amber-700 bg-amber-50 border-amber-100"
                      }`}
                    >
                      {htl.averageRating} ⭐
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
