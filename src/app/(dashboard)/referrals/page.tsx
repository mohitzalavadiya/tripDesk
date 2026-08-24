"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useExperience } from "@/context/experience-context";
import { Referral } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Gift,
  Users,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Search,
  Settings,
  Plus,
  Share2,
  Phone,
  RotateCcw,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";

export default function ReferralsAndRewardsPage() {
  const router = useRouter();
  const {
    referrals,
    getReferralStats,
    updateReferralStatus,
    reviewSettings,
    updateReviewSettings,
  } = useExperience();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [rewardAmount, setRewardAmount] = React.useState(
    String(reviewSettings.referralRewardAmount)
  );
  const [friendDiscount, setFriendDiscount] = React.useState(
    String(reviewSettings.referralFriendDiscount)
  );
  const [minBookingAmount, setMinBookingAmount] = React.useState(
    String(reviewSettings.referralMinBookingAmount)
  );

  const stats = getReferralStats();

  const filteredReferrals = React.useMemo(() => {
    return referrals.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mRef = r.referrerName.toLowerCase().includes(q);
        const mFriend = r.referredName.toLowerCase().includes(q);
        const mCode = r.referralCode.toLowerCase().includes(q);
        if (!mRef && !mFriend && !mCode) return false;
      }

      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

      return true;
    });
  }, [referrals, searchQuery, statusFilter]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateReviewSettings({
      referralRewardAmount: parseFloat(rewardAmount) || 500,
      referralFriendDiscount: parseFloat(friendDiscount) || 500,
      referralMinBookingAmount: parseFloat(minBookingAmount) || 10000,
    });
    setIsSettingsOpen(false);
    toast.success("Agency referral policy updated!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Referral Program & Rewards"
          description="Track customer word-of-mouth referrals, friend discounts, booking conversions, and loyalty reward distributions."
          breadcrumbs={[{ label: "Experience & Retention" }, { label: "Referrals & Rewards" }]}
          primaryAction={{
            label: "Referral Policy",
            onClick: () => setIsSettingsOpen(true),
            icon: Settings,
          }}
        />

        {/* ─── 5 OPERATIONAL KPI CARDS ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Referrals */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Referrals</span>
              <Share2 className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalReferrals}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Unique referral shares</p>
          </div>

          {/* 2. Converted Referrals */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Converted Bookings</span>
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">
              {stats.convertedCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Booked / Completed</p>
          </div>

          {/* 3. Conversion Rate */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Conversion Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {stats.conversionRate}%
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Inquiry to trip ratio</p>
          </div>

          {/* 4. Referral Revenue */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Referral Revenue</span>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-700 tracking-tight">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">From referred guests</p>
          </div>

          {/* 5. Rewards Disbursed */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Rewards Disbursed</span>
              <Gift className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {formatCurrency(stats.totalRewardsPaid)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Travel credits issued</p>
          </div>
        </div>

        {/* ─── SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Referrer, Friend, Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Referral Statuses</SelectItem>
                <SelectItem value="Shared">Shared</SelectItem>
                <SelectItem value="Inquiry">Inquiry</SelectItem>
                <SelectItem value="Booked">Booked</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rewarded">Rewarded</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ─── REFERRALS TABLE / LIST ─────────────────────────────────────── */}
        <div className="space-y-3">
          {filteredReferrals.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
              No referrals found matching your query.
            </div>
          ) : (
            filteredReferrals.map((ref) => (
              <div
                key={ref.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                      {ref.referralCode}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {ref.referrerName} → {ref.referredName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        ref.status === "Completed" || ref.status === "Rewarded"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ref.status === "Booked"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : ref.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {ref.status}
                    </span>
                  </div>

                  <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>Friend Phone: <strong>{ref.referredPhone}</strong></span>
                    <span>•</span>
                    <span>Created: {ref.createdAt.split("T")[0]}</span>
                    {ref.bookingNumber && (
                      <>
                        <span>•</span>
                        <span>Booking: <strong className="font-mono text-indigo-600">{ref.bookingNumber}</strong></span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end lg:self-center">
                  {ref.tripValue && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Booking Value
                      </span>
                      <span className="font-black text-sm text-slate-900">
                        {formatCurrency(ref.tripValue)}
                      </span>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] text-purple-600 uppercase font-bold block">
                      Referrer Reward
                    </span>
                    <span className="font-black text-sm text-purple-700">
                      {formatCurrency(ref.rewardAmount)}
                    </span>
                  </div>

                  {/* Status update actions */}
                  {ref.status === "Inquiry" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateReferralStatus(ref.id, "Booked", undefined, "BK-PENDING", 50000)
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                    >
                      Mark Booked
                    </Button>
                  )}

                  {ref.status === "Booked" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateReferralStatus(ref.id, "Completed", ref.bookingId, ref.bookingNumber, ref.tripValue)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                    >
                      Complete & Reward
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── REFERRAL SETTINGS MODAL ────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Agency Referral Policy Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Referrer Reward Amount (₹)</label>
                <Input
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Travel credit credited to the existing customer upon successful tour completion.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Friend Welcome Discount (₹)</label>
                <Input
                  type="number"
                  value={friendDiscount}
                  onChange={(e) => setFriendDiscount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Instant discount deducted from the new guest&apos;s quotation.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Minimum Booking Amount for Reward (₹)</label>
                <Input
                  type="number"
                  value={minBookingAmount}
                  onChange={(e) => setMinBookingAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 text-xs px-4 rounded-xl cursor-pointer"
                >
                  Save Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
