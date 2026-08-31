"use client";

import * as React from "react";
import {
  OperationsClosureSummary,
  PostTourReviewInput,
  operationsClient,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
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
  Save,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface PostTourReviewCardProps {
  summary: OperationsClosureSummary;
  onSuccess: () => void;
}

export function PostTourReviewCard({
  summary,
  onSuccess,
}: PostTourReviewCardProps) {
  const existingReview = summary.postTourReview;
  const isFinalized = summary.isFinalized;

  const [guestRating, setGuestRating] = React.useState<number>(
    existingReview?.guestRating || 5
  );
  const [operatorRating, setOperatorRating] = React.useState<number>(
    existingReview?.operatorRating || 5
  );
  const [serviceQuality, setServiceQuality] = React.useState<
    "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR"
  >(existingReview?.serviceQuality || "EXCELLENT");
  const [internalRemarks, setInternalRemarks] = React.useState(
    existingReview?.internalRemarks ||
      "All services successfully delivered according to planned schedule with high guest satisfaction."
  );
  const [guestFeedback, setGuestFeedback] = React.useState(
    existingReview?.guestFeedback || ""
  );
  const [hotelFeedback, setHotelFeedback] = React.useState(
    existingReview?.hotelFeedback || ""
  );
  const [fleetFeedback, setFleetFeedback] = React.useState(
    existingReview?.fleetFeedback || ""
  );
  const [activityFeedback, setActivityFeedback] = React.useState(
    existingReview?.activityFeedback || ""
  );

  const [saving, setSaving] = React.useState(false);

  const handleSaveReview = async () => {
    if (!internalRemarks.trim()) {
      toast.error("Internal debrief remarks are required.");
      return;
    }

    try {
      setSaving(true);
      await operationsClient.savePostTourReview(summary.operationId, {
        guestRating,
        operatorRating,
        serviceQuality,
        internalRemarks: internalRemarks.trim(),
        guestFeedback: guestFeedback.trim() || undefined,
        hotelFeedback: hotelFeedback.trim() || undefined,
        fleetFeedback: fleetFeedback.trim() || undefined,
        activityFeedback: activityFeedback.trim() || undefined,
      });

      toast.success("Post-tour quality review recorded successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save post-tour review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Post-Tour Quality & Debrief Review
          </h3>
        </div>
        {existingReview ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Review Recorded
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Pending Post-Tour Review
          </span>
        )}
      </div>

      {/* Ratings Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Guest Rating */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Guest Satisfaction Rating
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={isFinalized}
                onClick={() => setGuestRating(star)}
                className={`p-1 transition-transform ${
                  isFinalized ? "cursor-default" : "hover:scale-110 cursor-pointer"
                }`}
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= guestRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200 fill-slate-50"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-slate-700 ml-1.5">
              {guestRating}/5
            </span>
          </div>
        </div>

        {/* Operator Rating */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Operations Execution Rating
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={isFinalized}
                onClick={() => setOperatorRating(star)}
                className={`p-1 transition-transform ${
                  isFinalized ? "cursor-default" : "hover:scale-110 cursor-pointer"
                }`}
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= operatorRating
                      ? "fill-indigo-500 text-indigo-500"
                      : "text-slate-200 fill-slate-50"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-slate-700 ml-1.5">
              {operatorRating}/5
            </span>
          </div>
        </div>

        {/* Overall Service Quality Grade */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Service Quality Assessment
          </label>
          <Select
            value={serviceQuality}
            onValueChange={(val) => setServiceQuality(val as any)}
            disabled={isFinalized}
          >
            <SelectTrigger className="h-8 text-xs font-semibold bg-white border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="EXCELLENT">🌟 Excellent (5 Star Delivery)</SelectItem>
              <SelectItem value="GOOD">👍 Good (Meets Standards)</SelectItem>
              <SelectItem value="AVERAGE">⚖️ Average (Minor Discrepancies)</SelectItem>
              <SelectItem value="POOR">⚠️ Poor (Service Failures)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Internal Remarks & Guest Feedback */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Operations Debrief & Internal Remarks *</span>
            <span className="text-[10px] text-slate-400">Mandatory</span>
          </label>
          <Textarea
            rows={3}
            value={internalRemarks}
            onChange={(e) => setInternalRemarks(e.target.value)}
            disabled={isFinalized}
            placeholder="Record post-tour operational summary, supplier notes..."
            className="text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Guest Direct Feedback & Testimonial
          </label>
          <Textarea
            rows={3}
            value={guestFeedback}
            onChange={(e) => setGuestFeedback(e.target.value)}
            disabled={isFinalized}
            placeholder="Customer verbal or WhatsApp review quotes..."
            className="text-xs bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Supplier & Category Feedback */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">Hotel Accommodation Feedback</label>
          <input
            type="text"
            value={hotelFeedback}
            onChange={(e) => setHotelFeedback(e.target.value)}
            disabled={isFinalized}
            placeholder="e.g. Check-in prompt, good food..."
            className="w-full h-8 px-2.5 rounded-lg text-xs bg-slate-50 border border-slate-200"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">Driver & Chauffeur Feedback</label>
          <input
            type="text"
            value={fleetFeedback}
            onChange={(e) => setFleetFeedback(e.target.value)}
            disabled={isFinalized}
            placeholder="e.g. Polite driver, clean car..."
            className="w-full h-8 px-2.5 rounded-lg text-xs bg-slate-50 border border-slate-200"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">Sightseeing & Guide Feedback</label>
          <input
            type="text"
            value={activityFeedback}
            onChange={(e) => setActivityFeedback(e.target.value)}
            disabled={isFinalized}
            placeholder="e.g. Guide arrived on time..."
            className="w-full h-8 px-2.5 rounded-lg text-xs bg-slate-50 border border-slate-200"
          />
        </div>
      </div>

      {/* Action Footer */}
      {!isFinalized && (
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <Button
            type="button"
            onClick={handleSaveReview}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-4 cursor-pointer shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving Review...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Post-Tour Review
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
