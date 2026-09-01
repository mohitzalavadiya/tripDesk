"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  RefreshCw,
} from "lucide-react";
import { experienceClient } from "@/lib/api-client/experience-client";
import { customerClient } from "@/lib/api-client/customer-client";
import { AgencyReferralItem, ReferralSummaryStats } from "@/lib/services/referral-service";

export default function ReferralsAndRewardsPage() {
  const router = useRouter();

  const [referrals, setReferrals] = React.useState<AgencyReferralItem[]>([]);
  const [stats, setStats] = React.useState<ReferralSummaryStats>({
    totalReferrals: 0,
    convertedCount: 0,
    rewardedCount: 0,
    conversionRate: 0,
    totalRewardsDistributed: 0,
  });
  const [loading, setLoading] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Create Referral Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [friendName, setFriendName] = React.useState("");
  const [friendPhone, setFriendPhone] = React.useState("");
  const [friendEmail, setFriendEmail] = React.useState("");
  const [customReward, setCustomReward] = React.useState("500");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Policy Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [rewardAmount, setRewardAmount] = React.useState("500");
  const [friendDiscount, setFriendDiscount] = React.useState("500");
  const [minBookingAmount, setMinBookingAmount] = React.useState("10000");

  const fetchReferrals = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await experienceClient.listReferrals({
        status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      });

      if (res.success && res.data) {
        setReferrals(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  React.useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Load customer list for referral creation modal
  const loadCustomers = async () => {
    try {
      const res = await customerClient.getCustomers({ limit: 100 });
      if (res.success && res.data) {
        setCustomers(res.data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })));
      }
    } catch (err) {
      console.error("Failed to load customer list", err);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a referrer customer.");
      return;
    }
    if (!friendName.trim()) {
      toast.error("Please enter friend's full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await experienceClient.createReferral({
        referrerCustomerId: selectedCustomerId,
        referredName: friendName.trim(),
        referredPhone: friendPhone.trim() || undefined,
        referredEmail: friendEmail.trim() || undefined,
        rewardAmount: Number(customReward) || 500,
        notes: notes.trim() || undefined,
      });

      toast.success("Referral record created successfully!");
      setIsCreateOpen(false);
      setSelectedCustomerId("");
      setFriendName("");
      setFriendPhone("");
      setFriendEmail("");
      setNotes("");
      fetchReferrals();
    } catch (err: any) {
      toast.error(err.message || "Failed to create referral");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (referralId: string, newStatus: "PENDING" | "CONVERTED" | "REWARDED" | "CANCELLED") => {
    try {
      await experienceClient.updateReferralStatus(referralId, {
        status: newStatus,
      });
      toast.success(`Referral status updated to ${newStatus}`);
      fetchReferrals();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingsOpen(false);
    toast.success("Agency referral policy updated!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Referral Program & Customer Rewards"
          description="Track customer word-of-mouth referrals, friend discounts, booking conversions, and loyalty reward distributions."
          breadcrumbs={[{ label: "Experience & Retention" }, { label: "Referrals & Rewards" }]}
          primaryAction={{
            label: "Record New Referral",
            onClick: () => {
              loadCustomers();
              setIsCreateOpen(true);
            },
            icon: Plus,
          }}
          secondaryActions={[
            {
              label: "Referral Policy",
              onClick: () => setIsSettingsOpen(true),
              icon: Settings,
            },
          ]}
        />

        {/* ─── 4 OPERATIONAL KPI CARDS ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* 1. Total Referrals */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Referrals</span>
              <Share2 className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalReferrals}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Recorded referral links</p>
          </div>

          {/* 2. Converted Bookings */}
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
            <p className="text-[11px] text-slate-500 font-medium">Lead to booked ratio</p>
          </div>

          {/* 4. Rewards Distributed */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Rewards Distributed</span>
              <Gift className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {formatCurrency(stats.totalRewardsDistributed)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Loyalty cash/credits</p>
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
                <SelectItem value="PENDING">Pending (Inquiry)</SelectItem>
                <SelectItem value="CONVERTED">Converted (Booked)</SelectItem>
                <SelectItem value="REWARDED">Rewarded (Completed)</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
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

            <Button
              variant="outline"
              size="sm"
              onClick={fetchReferrals}
              className="h-9 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ─── REFERRALS TABLE / LIST ─────────────────────────────────────── */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center p-16 bg-white rounded-2xl border border-slate-200/90 text-slate-400 text-xs gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
              Loading database referral records...
            </div>
          ) : referrals.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
              No referrals found matching your query.
            </div>
          ) : (
            referrals.map((ref) => (
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
                        ref.status === "REWARDED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ref.status === "CONVERTED"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : ref.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {ref.status}
                    </span>
                  </div>

                  <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>Friend Phone: <strong>{ref.referredPhone || "N/A"}</strong></span>
                    <span>•</span>
                    <span>Created: {ref.createdAt.split("T")[0]}</span>
                    {ref.convertedBookingNumber && (
                      <>
                        <span>•</span>
                        <span>Booking: <strong className="font-mono text-indigo-600">{ref.convertedBookingNumber}</strong></span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end lg:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-purple-600 uppercase font-bold block">
                      Referrer Reward
                    </span>
                    <span className="font-black text-sm text-purple-700">
                      {formatCurrency(ref.rewardAmount || 500)}
                    </span>
                  </div>

                  {/* Status update actions */}
                  {ref.status === "PENDING" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusTransition(ref.id, "CONVERTED")}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                    >
                      Mark Converted
                    </Button>
                  )}

                  {ref.status === "CONVERTED" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusTransition(ref.id, "REWARDED")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                    >
                      Distribute Reward
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── CREATE REFERRAL MODAL ─────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Record New Customer Referral</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Existing Referrer Customer *</label>
                <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v || "")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select existing customer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 max-h-56">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Referred Friend Full Name *</label>
                <Input
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Friend Phone Number</label>
                  <Input
                    value={friendPhone}
                    onChange={(e) => setFriendPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Friend Email</label>
                  <Input
                    type="email"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    placeholder="friend@gmail.com"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Referrer Reward Amount (₹)</label>
                <Input
                  type="number"
                  value={customReward}
                  onChange={(e) => setCustomReward(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Notes / Vacation Preference</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Planning a honeymoon to Bali in November."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="h-8.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer"
                >
                  {isSubmitting ? "Recording..." : "Create Referral"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REFERRAL POLICY MODAL ──────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
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

            <form onSubmit={handleSaveSettings} className="space-y-4">
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
                  className="h-8.5 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8.5 text-xs px-4 rounded-xl cursor-pointer"
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
