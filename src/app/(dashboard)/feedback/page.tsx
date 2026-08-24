"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useExperience } from "@/context/experience-context";
import { CustomerFeedback, PublicReview } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
  Star,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Settings,
  MessageSquare,
  Share2,
  Search,
  RotateCcw,
  Hotel,
  Car,
  Ticket,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Send,
  X,
} from "lucide-react";

export default function FeedbackAndReviewsPage() {
  const router = useRouter();
  const {
    feedbacks,
    reviews,
    getFeedbackStats,
    updateServiceRecovery,
    reviewSettings,
    updateReviewSettings,
  } = useExperience();

  const [activeTab, setActiveTab] = React.useState<
    "ALL" | "ATTENTION" | "POSITIVE" | "REVIEWS"
  >("ALL");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRecoveryFb, setSelectedRecoveryFb] =
    React.useState<CustomerFeedback | null>(null);
  const [recoveryStatus, setRecoveryStatus] = React.useState<
    CustomerFeedback["serviceRecoveryStatus"]
  >("Contacted");
  const [recoveryNotes, setRecoveryNotes] = React.useState("");

  // Review URL Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [googleUrl, setGoogleUrl] = React.useState(reviewSettings.googleReviewUrl);
  const [tripAdvisorUrl, setTripAdvisorUrl] = React.useState(
    reviewSettings.tripAdvisorUrl || ""
  );

  const stats = getFeedbackStats();

  const filteredFeedbacks = React.useMemo(() => {
    return feedbacks.filter((f) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTrip = f.tripTitle.toLowerCase().includes(q);
        const mCust = f.customerName.toLowerCase().includes(q);
        const mPos = (f.positiveComment || "").toLowerCase().includes(q);
        const mImp = (f.improvementComment || "").toLowerCase().includes(q);
        if (!mTrip && !mCust && !mPos && !mImp) return false;
      }

      if (activeTab === "ATTENTION") {
        return f.overallRating <= 3 || f.serviceRecoveryStatus === "Follow-up Required";
      }
      if (activeTab === "POSITIVE") {
        return f.overallRating >= 4;
      }

      return true;
    });
  }, [feedbacks, searchQuery, activeTab]);

  const handleSaveRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecoveryFb) return;

    updateServiceRecovery(
      selectedRecoveryFb.id,
      recoveryStatus,
      recoveryNotes.trim() || undefined
    );

    toast.success("Service recovery follow-up updated.");
    setSelectedRecoveryFb(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateReviewSettings({
      googleReviewUrl: googleUrl.trim(),
      tripAdvisorUrl: tripAdvisorUrl.trim() || undefined,
    });
    setIsSettingsOpen(false);
    toast.success("Public review URLs updated successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Customer Feedback & Reviews"
          description="Collect post-trip guest ratings, manage service recovery for unhappy guests, and generate Google/TripAdvisor reviews."
          breadcrumbs={[{ label: "Experience & Retention" }, { label: "Feedback & Reviews" }]}
          primaryAction={{
            label: "Review Link Settings",
            onClick: () => setIsSettingsOpen(true),
            icon: Settings,
          }}
        />

        {/* ─── 5 OPERATIONAL KPI CARDS ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Average Rating */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average Rating</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.averageRating} ⭐
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Overall CSAT score</p>
          </div>

          {/* 2. Total Feedbacks */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Feedback</span>
              <MessageSquare className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">
              {stats.totalFeedback}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Post-trip responses</p>
          </div>

          {/* 3. Positive Feedback */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Positive (4-5 ★)</span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {stats.positiveCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Happy travelers</p>
          </div>

          {/* 4. Needs Attention / Service Recovery */}
          <div
            onClick={() => setActiveTab("ATTENTION")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 cursor-pointer hover:border-rose-300 transition-colors group"
          >
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-700">
                Service Recovery
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">
              {stats.needsAttentionCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Rating ≤ 3 (Action needed)</p>
          </div>

          {/* 5. Public Reviews */}
          <div
            onClick={() => setActiveTab("REVIEWS")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1 cursor-pointer hover:border-purple-300 transition-colors group"
          >
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-purple-700">
                Public Reviews
              </span>
              <Share2 className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 tracking-tight">
              {reviews.length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Google & TripAdvisor</p>
          </div>
        </div>

        {/* ─── 2-COLUMN SECTION: CATEGORY RATINGS & STAR DISTRIBUTIONS ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Service Category Averages */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
              Service Performance By Category
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Hotels & Resorts</span>
                  <Hotel className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="text-lg font-black text-slate-900">
                  {stats.categoryAverages.hotels} ⭐
                </p>
                <p className="text-[10px] text-slate-400">Accommodations quality</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Chauffeurs / Drivers</span>
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <p className="text-lg font-black text-slate-900">
                  {stats.categoryAverages.drivers} ⭐
                </p>
                <p className="text-[10px] text-slate-400">Punctuality & behavior</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Vehicles & Fleet</span>
                  <Car className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-lg font-black text-slate-900">
                  {stats.categoryAverages.vehicles} ⭐
                </p>
                <p className="text-[10px] text-slate-400">Cleanliness & AC comfort</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Activities & Sightseeing</span>
                  <Ticket className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-lg font-black text-slate-900">
                  {stats.categoryAverages.activities} ⭐
                </p>
                <p className="text-[10px] text-slate-400">Tour itinerary enjoyment</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1 col-span-2 sm:col-span-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Support Desk & Coordination</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
                </div>
                <p className="text-lg font-black text-teal-700">
                  {stats.categoryAverages.support} ⭐
                </p>
                <p className="text-[10px] text-slate-400">24x7 guest support responsiveness</p>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Rating Distribution */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
              Rating Distribution
            </h3>

            <div className="space-y-2 text-xs">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stats.starCounts[stars] || 0;
                const pct = stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-700 flex items-center gap-1 shrink-0">
                      {stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-400 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="w-8 font-mono text-[11px] text-slate-500 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── FILTER TABS & SEARCH BAR ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: "ALL", label: `All Feedback (${feedbacks.length})` },
              { id: "ATTENTION", label: `Needs Recovery (${stats.needsAttentionCount})` },
              { id: "POSITIVE", label: `Positive (${stats.positiveCount})` },
              { id: "REVIEWS", label: `Public Reviews (${reviews.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search feedback or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* ─── REVIEWS / FEEDBACK CONTENT LIST ────────────────────────────── */}
        {activeTab === "REVIEWS" ? (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No public reviews recorded yet.
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                        {rev.platform}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {rev.customerName}
                      </span>
                      <span className="font-bold text-amber-600">
                        {rev.rating} / 5 Stars ⭐
                      </span>
                    </div>

                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[11px]">
                      Verified Published
                    </span>
                  </div>

                  <p className="text-slate-700 italic leading-relaxed pt-1">
                    &quot;{rev.comment}&quot;
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Tour: {rev.tripTitle || "Custom Tour"}</span>
                    <span>Date: {rev.createdAt.split("T")[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeedbacks.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No feedback found in this filter category.
              </div>
            ) : (
              filteredFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${fb.customerId}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 text-sm transition-colors"
                        >
                          {fb.customerName}
                        </Link>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700">{fb.tripTitle}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {fb.bookingNumber} • {fb.createdAt.split("T")[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="font-black text-amber-600 text-sm bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                        {fb.overallRating} / 5 Stars ⭐
                      </span>

                      {fb.overallRating <= 3 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRecoveryFb(fb);
                            setRecoveryStatus(fb.serviceRecoveryStatus || "Contacted");
                            setRecoveryNotes(fb.serviceRecoveryNotes || "");
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-7.5 px-3 rounded-lg cursor-pointer"
                        >
                          Service Recovery
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Individual Categories */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Hotels</span>
                      <span className="font-bold text-slate-800">{fb.hotelRating || 5} ⭐</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Vehicle</span>
                      <span className="font-bold text-slate-800">{fb.vehicleRating || 5} ⭐</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Driver</span>
                      <span className="font-bold text-slate-800">{fb.driverRating || 5} ⭐</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Activities</span>
                      <span className="font-bold text-slate-800">{fb.activityRating || 5} ⭐</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Support</span>
                      <span className="font-bold text-slate-800">{fb.supportRating || 5} ⭐</span>
                    </div>
                  </div>

                  {fb.positiveComment && (
                    <p className="text-slate-700 italic">
                      <strong>Enjoyed Most:</strong> &quot;{fb.positiveComment}&quot;
                    </p>
                  )}

                  {fb.improvementComment && (
                    <p className="text-slate-600">
                      <strong>Suggested Improvements:</strong> &quot;{fb.improvementComment}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                    <span>Would travel with agency again: <strong>{fb.travelAgain || "Yes"}</strong></span>
                    {fb.serviceRecoveryStatus && fb.serviceRecoveryStatus !== "Not Needed" && (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Recovery Status: {fb.serviceRecoveryStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── SERVICE RECOVERY MODAL ─────────────────────────────────────── */}
      {selectedRecoveryFb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Service Recovery Workflow</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecoveryFb(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <span className="font-bold block">
                {selectedRecoveryFb.customerName} ({selectedRecoveryFb.overallRating} / 5 Stars)
              </span>
              <p className="italic">&quot;{selectedRecoveryFb.improvementComment || "Issue reported"}&quot;</p>
            </div>

            <form onSubmit={handleSaveRecovery} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Follow-up Action Status</label>
                <Select
                  value={recoveryStatus}
                  onValueChange={(v) => setRecoveryStatus(v as any)}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
                    <SelectItem value="Contacted">Customer Contacted / In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved / Credit Offered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Service Recovery Action Notes</label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Spoke to guest Amit Patel; apologized for hotel room AC issue, offered ₹1,500 goodwill credit on next tour."
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRecoveryFb(null)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-xs px-4 rounded-xl cursor-pointer shadow-xs"
                >
                  Save Recovery Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REVIEW LINK CONFIGURATION MODAL ────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Public Review Links Configuration</h3>
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
                <label className="font-bold text-slate-700">Google Business Review URL</label>
                <Input
                  placeholder="https://g.page/r/your-business/review"
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Customers who rate 4 or 5 stars will be invited to leave a review at this URL.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">TripAdvisor Review URL (Optional)</label>
                <Input
                  placeholder="https://www.tripadvisor.com/UserReview-..."
                  value={tripAdvisorUrl}
                  onChange={(e) => setTripAdvisorUrl(e.target.value)}
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs px-4 rounded-xl cursor-pointer"
                >
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
