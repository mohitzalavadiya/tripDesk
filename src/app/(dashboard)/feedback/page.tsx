"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  RefreshCw,
} from "lucide-react";
import { experienceClient } from "@/lib/api-client/experience-client";
import { AgencyFeedbackItem, FeedbackStats } from "@/lib/services/feedback-service";

export default function FeedbackAndReviewsPage() {
  const router = useRouter();

  const [feedbacks, setFeedbacks] = React.useState<AgencyFeedbackItem[]>([]);
  const [stats, setStats] = React.useState<FeedbackStats>({
    totalFeedbacks: 0,
    averageRating: 5.0,
    hotelRating: 5.0,
    driverRating: 5.0,
    vehicleRating: 5.0,
    activityRating: 5.0,
    supportRating: 5.0,
    positivePercentage: 100,
    attentionCount: 0,
  });
  const [loading, setLoading] = React.useState(true);

  const [activeTab, setActiveTab] = React.useState<
    "ALL" | "ATTENTION" | "POSITIVE" | "REVIEWS"
  >("ALL");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRecoveryFb, setSelectedRecoveryFb] =
    React.useState<AgencyFeedbackItem | null>(null);
  const [recoveryStatus, setRecoveryStatus] = React.useState<
    "Not Needed" | "Follow-up Required" | "Contacted" | "Resolved"
  >("Contacted");
  const [recoveryNotes, setRecoveryNotes] = React.useState("");
  const [savingRecovery, setSavingRecovery] = React.useState(false);

  // Review URL Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [googleUrl, setGoogleUrl] = React.useState("https://g.page/r/tripdesk-holidays/review");
  const [tripAdvisorUrl, setTripAdvisorUrl] = React.useState("https://www.tripadvisor.com/UserReview-tripdesk-holidays");

  const fetchFeedbacks = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await experienceClient.listFeedbacks({
        tab: activeTab !== "REVIEWS" ? activeTab : "ALL",
        search: searchQuery.trim() || undefined,
        limit: 100,
      });

      if (res.success && res.data) {
        setFeedbacks(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  React.useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Compute star distribution from live feedbacks
  const starCounts = React.useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const f of feedbacks) {
      counts[f.overallRating] = (counts[f.overallRating] || 0) + 1;
    }
    return counts;
  }, [feedbacks]);

  const handleSaveRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecoveryFb) return;

    setSavingRecovery(true);
    try {
      await experienceClient.updateServiceRecovery(selectedRecoveryFb.id, {
        serviceRecoveryStatus: recoveryStatus,
        serviceRecoveryNotes: recoveryNotes.trim() || undefined,
      });

      toast.success("Service recovery follow-up updated in database.");
      setSelectedRecoveryFb(null);
      fetchFeedbacks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update service recovery");
    } finally {
      setSavingRecovery(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingsOpen(false);
    toast.success("Public review URLs updated successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Customer Feedback & Post-Trip Reviews"
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
              {stats.totalFeedbacks}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Post-trip responses</p>
          </div>

          {/* 3. Positive Feedback */}
          <div
            onClick={() => setActiveTab("POSITIVE")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 cursor-pointer hover:border-emerald-300 transition-colors group"
          >
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-700">
                Positive ({stats.positivePercentage}%)
              </span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {stats.positivePercentage}%
            </p>
            <p className="text-[11px] text-slate-500 font-medium">4-5 Star ratings</p>
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
              {stats.attentionCount}
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
              {stats.totalFeedbacks}
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
                <p className="text-lg font-black text-slate-900">{stats.hotelRating} ⭐</p>
                <p className="text-[10px] text-slate-400">Accommodations quality</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Chauffeurs / Drivers</span>
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <p className="text-lg font-black text-slate-900">{stats.driverRating} ⭐</p>
                <p className="text-[10px] text-slate-400">Punctuality & behavior</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Vehicles & Fleet</span>
                  <Car className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-lg font-black text-slate-900">{stats.vehicleRating} ⭐</p>
                <p className="text-[10px] text-slate-400">Cleanliness & AC comfort</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Activities & Sightseeing</span>
                  <Ticket className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-lg font-black text-slate-900">{stats.activityRating} ⭐</p>
                <p className="text-[10px] text-slate-400">Tour itinerary enjoyment</p>
              </div>

              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-1 col-span-2 sm:col-span-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-[11px]">Support Desk & Coordination</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
                </div>
                <p className="text-lg font-black text-teal-700">{stats.supportRating} ⭐</p>
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
                const count = starCounts[stars] || 0;
                const pct = stats.totalFeedbacks > 0 ? (count / stats.totalFeedbacks) * 100 : 0;
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

        {/* ─── TAB FILTER CONTROLS & SEARCH BAR ───────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <Button
              variant={activeTab === "ALL" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("ALL")}
              className={`h-8.5 text-xs font-bold rounded-xl cursor-pointer ${
                activeTab === "ALL" ? "bg-purple-600 text-white" : "text-slate-600"
              }`}
            >
              All Guest Feedback ({stats.totalFeedbacks})
            </Button>
            <Button
              variant={activeTab === "ATTENTION" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("ATTENTION")}
              className={`h-8.5 text-xs font-bold rounded-xl cursor-pointer ${
                activeTab === "ATTENTION"
                  ? "bg-rose-600 text-white"
                  : "text-rose-600 hover:bg-rose-50"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Service Recovery ({stats.attentionCount})
            </Button>
            <Button
              variant={activeTab === "POSITIVE" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("POSITIVE")}
              className={`h-8.5 text-xs font-bold rounded-xl cursor-pointer ${
                activeTab === "POSITIVE"
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Happy Guests (4-5 ★)
            </Button>
            <Button
              variant={activeTab === "REVIEWS" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("REVIEWS")}
              className={`h-8.5 text-xs font-bold rounded-xl cursor-pointer ${
                activeTab === "REVIEWS"
                  ? "bg-indigo-600 text-white"
                  : "text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Public Reviews
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Guest, Trip, Feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8.5 text-xs"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-8.5 text-xs text-slate-500 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFeedbacks}
              className="h-8.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ─── FEEDBACK LIST LEDGER / PUBLIC REVIEWS ───────────────────────── */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-16 bg-white rounded-3xl border border-slate-200/90 text-slate-400 text-xs gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
              Loading database feedback records...
            </div>
          ) : activeTab === "REVIEWS" ? (
            /* Public Google & TripAdvisor Review Links */
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">
                  Public Review Hub & Links
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-8 text-xs font-semibold"
                >
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Configure Review Links
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200/90 rounded-2xl p-5 bg-gradient-to-br from-white to-slate-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌟</span>
                    <h4 className="font-bold text-slate-900">Google Reviews URL</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-mono break-all">{googleUrl}</p>
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 gap-1"
                  >
                    Open Google Review Page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="border border-slate-200/90 rounded-2xl p-5 bg-gradient-to-br from-white to-slate-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🦉</span>
                    <h4 className="font-bold text-slate-900">TripAdvisor URL</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-mono break-all">{tripAdvisorUrl}</p>
                  <a
                    href={tripAdvisorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700 gap-1"
                  >
                    Open TripAdvisor Page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 shadow-2xs text-center space-y-3">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No guest feedback found matching criteria.</p>
            </div>
          ) : (
            feedbacks.map((fb) => {
              const isAttention = fb.overallRating <= 3 || fb.serviceRecoveryStatus === "Follow-up Required";
              return (
                <div
                  key={fb.id}
                  className={`bg-white border rounded-3xl p-6 shadow-2xs space-y-4 transition-all ${
                    isAttention ? "border-rose-200 bg-rose-50/20" : "border-slate-200/90"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{fb.tripTitle}</h4>
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {fb.bookingNumber || fb.tripNumber}
                        </span>
                        {isAttention && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Action Needed
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Source: {fb.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Guest: <strong className="text-slate-700">{fb.customerName}</strong> ({fb.customerPhone}) • Submitted on{" "}
                        {new Date(fb.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/60">
                        <span className="font-black text-amber-700 text-base">{fb.overallRating}</span>
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </div>
                    </div>
                  </div>

                  {/* Category Ratings Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                      <span className="text-slate-500">Hotels</span>
                      <strong>{fb.hotelRating} ⭐</strong>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                      <span className="text-slate-500">Chauffeur</span>
                      <strong>{fb.driverRating} ⭐</strong>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                      <span className="text-slate-500">Vehicle</span>
                      <strong>{fb.vehicleRating} ⭐</strong>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                      <span className="text-slate-500">Activities</span>
                      <strong>{fb.activityRating} ⭐</strong>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center col-span-2 sm:col-span-1">
                      <span className="text-slate-500">Support</span>
                      <strong>{fb.supportRating} ⭐</strong>
                    </div>
                  </div>

                  {/* Positive & Improvement Comments */}
                  <div className="space-y-2 text-xs">
                    {fb.positiveComment && (
                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-emerald-950">
                        <strong className="text-emerald-700 block mb-0.5">What went great:</strong>
                        <p>{fb.positiveComment}</p>
                      </div>
                    )}
                    {fb.improvementComment && (
                      <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-rose-950">
                        <strong className="text-rose-700 block mb-0.5">Areas for improvement:</strong>
                        <p>{fb.improvementComment}</p>
                      </div>
                    )}
                  </div>

                  {/* Service Recovery Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Service Recovery Status:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          fb.serviceRecoveryStatus === "Resolved"
                            ? "bg-emerald-100 text-emerald-700"
                            : fb.serviceRecoveryStatus === "Contacted"
                            ? "bg-indigo-100 text-indigo-700"
                            : fb.serviceRecoveryStatus === "Follow-up Required"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {fb.serviceRecoveryStatus}
                      </span>
                      {fb.serviceRecoveryNotes && (
                        <span className="text-slate-500 italic hidden sm:inline">
                          — {fb.serviceRecoveryNotes}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRecoveryFb(fb);
                          setRecoveryStatus(
                            (fb.serviceRecoveryStatus as any) || "Contacted"
                          );
                          setRecoveryNotes(fb.serviceRecoveryNotes || "");
                        }}
                        className="h-8 text-xs font-semibold cursor-pointer"
                      >
                        Update Service Recovery
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── SERVICE RECOVERY MODAL ─────────────────────────────────────── */}
      {selectedRecoveryFb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
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

            <form onSubmit={handleSaveRecovery} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Guest & Trip</label>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  {selectedRecoveryFb.customerName} • {selectedRecoveryFb.tripTitle} ({selectedRecoveryFb.overallRating}★)
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Follow-up Status</label>
                <Select
                  value={recoveryStatus}
                  onValueChange={(v: any) => setRecoveryStatus(v || "Contacted")}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Not Needed">Not Needed</SelectItem>
                    <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
                    <SelectItem value="Contacted">Contacted Guest</SelectItem>
                    <SelectItem value="Resolved">Resolved / Retained</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Action Notes / Resolution Credit</label>
                <Textarea
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  placeholder="e.g. Senior manager contacted guest; offered ₹2,000 credit on next vacation."
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRecoveryFb(null)}
                  disabled={savingRecovery}
                  className="h-8.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingRecovery}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer"
                >
                  {savingRecovery ? "Saving..." : "Save Recovery Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REVIEW SETTINGS MODAL ──────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Review Link Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Google Review Page URL</label>
                <Input
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">TripAdvisor Review Page URL</label>
                <Input
                  value={tripAdvisorUrl}
                  onChange={(e) => setTripAdvisorUrl(e.target.value)}
                  placeholder="https://www.tripadvisor.com/UserReview-..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-8.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer"
                >
                  Save Links
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
