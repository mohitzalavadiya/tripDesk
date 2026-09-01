"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  RefreshCw,
  MapPin,
  Ticket,
} from "lucide-react";
import { experienceClient } from "@/lib/api-client/experience-client";
import { CustomerInsightsData } from "@/lib/services/customer-insights-service";

export default function CustomerInsightsPage() {
  const router = useRouter();

  const [data, setData] = React.useState<CustomerInsightsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchInsights = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await experienceClient.getCustomerInsights();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load customer insights");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const overview = data?.overview || {
    totalCustomers: 0,
    repeatCustomersCount: 0,
    repeatRate: 0,
    totalBookingsCount: 0,
    totalBookingRevenue: 0,
    averageLTV: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  };

  const feedback = data?.feedback || {
    averageRating: 5.0,
    totalFeedbacks: 0,
    positivePercentage: 100,
    attentionCount: 0,
    hotelRating: 5.0,
    driverRating: 5.0,
    vehicleRating: 5.0,
    activityRating: 5.0,
    supportRating: 5.0,
  };

  const referrals = data?.referrals || {
    totalReferrals: 0,
    convertedReferrals: 0,
    conversionRate: 0,
    totalRewardsDistributed: 0,
  };

  const topDestinations = data?.topDestinations || [];
  const topCustomers = data?.topCustomers || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Customer Insights & Retention Analytics"
          description="Track repeat customer rate, lifetime value (LTV), destination revenue, and quality performance."
          breadcrumbs={[{ label: "Experience & Retention" }, { label: "Customer Insights" }]}
          primaryAction={{
            label: "Refresh Analytics",
            onClick: fetchInsights,
            icon: RefreshCw,
          }}
        />

        {/* ─── 4 RETENTION KPI CARDS ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Customers</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {overview.totalCustomers}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Registered traveler profiles</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Repeat Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {overview.repeatRate}%
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {overview.repeatCustomersCount} Repeat Travelers
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average LTV</span>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 tracking-tight">
              {formatCurrency(overview.averageLTV)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Lifetime booking value / guest</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average CSAT</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {feedback.averageRating} ⭐
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              From {feedback.totalFeedbacks} verified reviews
            </p>
          </div>
        </div>

        {/* ─── 2-COLUMN SECTION: TOP DESTINATIONS & VIP GUESTS ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 6 Cols: Top Customer Destinations */}
          <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Top Destinations By Traveler Demand
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading destinations...</div>
            ) : topDestinations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No destinations recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {topDestinations.map((dest, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 block">{dest.destination}</span>
                      <span className="text-[10px] text-slate-400">
                        {dest.tripsCount} Completed Tours
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block font-mono">
                        {formatCurrency(dest.revenue)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        Total Volume
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right 6 Cols: Top Spender VIP Guests */}
          <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Top Valued Guests (VIP Accounts)
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading VIP accounts...</div>
            ) : topCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No customer spend data recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {topCustomers.map((cust) => (
                  <div key={cust.id} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 block">{cust.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {cust.tripsCount} Tours • Phone: {cust.phone}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-purple-700 block font-mono">
                        {formatCurrency(cust.totalSpend)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Lifetime GMV
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── SERVICE QUALITY BENCHMARKS ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
            Service Quality & Satisfaction Breakdown
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold text-[11px]">Hotels & Resorts</span>
                <Hotel className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xl font-black text-slate-900">{feedback.hotelRating} ⭐</p>
              <p className="text-[10px] text-slate-400">Room quality & amenities</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold text-[11px]">Chauffeurs</span>
                <UserCheck className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-xl font-black text-slate-900">{feedback.driverRating} ⭐</p>
              <p className="text-[10px] text-slate-400">Professionalism & punctuality</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold text-[11px]">Fleet / Vehicles</span>
                <Car className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xl font-black text-slate-900">{feedback.vehicleRating} ⭐</p>
              <p className="text-[10px] text-slate-400">Cleanliness & AC comfort</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold text-[11px]">Sightseeing</span>
                <Ticket className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xl font-black text-slate-900">{feedback.activityRating} ⭐</p>
              <p className="text-[10px] text-slate-400">Tour itinerary flow</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold text-[11px]">Agency Support Desk</span>
                <ShieldCheck className="h-4 w-4 text-teal-500" />
              </div>
              <p className="text-xl font-black text-teal-700">{feedback.supportRating} ⭐</p>
              <p className="text-[10px] text-slate-400">24x7 resolution speed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
