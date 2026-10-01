"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Star,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Hotel,
  Car,
  Compass,
  ExternalLink,
} from "lucide-react";

export default function CustomerFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = (params?.tripId as string) || "";

  const [rating, setRating] = React.useState(5);
  const [serviceRating, setServiceRating] = React.useState(5);
  const [hotelRating, setHotelRating] = React.useState(5);
  const [driverRating, setDriverRating] = React.useState(5);
  const [comments, setComments] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [reviewLinks, setReviewLinks] = React.useState<{
    googleReviewUrl?: string | null;
    tripAdvisorReviewUrl?: string | null;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await customerPortalClient.submitFeedback(tripId, {
        rating,
        serviceRating,
        hotelRating,
        driverRating,
        comments,
      });
      if (res?.reviewLinks) {
        setReviewLinks(res.reviewLinks);
      }
      setSubmitted(true);
      toast.success("Thank you! Your feedback has been recorded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 focus:outline-none hover:scale-110 transition-transform"
          >
            <Star
              className={`w-7 h-7 ${
                star <= value ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-100"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/customer/trips/${tripId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trip Details</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 space-y-6">
        {submitted ? (
          <div className="text-center py-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900">Thank You for Your Feedback!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Your valuable review helps us maintain the highest standards of hospitality and operational excellence.
              </p>
            </div>

            {/* ─── EXTERNAL PUBLIC REVIEW CTAs (IF CONFIGURED BY AGENCY) ───── */}
            {(reviewLinks?.googleReviewUrl || reviewLinks?.tripAdvisorReviewUrl) && (
              <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 rounded-2xl p-5 border border-indigo-100/90 text-left space-y-3 max-w-lg mx-auto">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Share Your Experience Publicly
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your voice matters! Help other travelers discover exceptional journeys by sharing your experience on Google or TripAdvisor.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {reviewLinks.googleReviewUrl && (
                    <a
                      href={reviewLinks.googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                    >
                      <span className="text-base">🌟</span>
                      <span>Review us on Google</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                  {reviewLinks.tripAdvisorReviewUrl && (
                    <a
                      href={reviewLinks.tripAdvisorReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                    >
                      <span className="text-base">🦉</span>
                      <span>Review us on TripAdvisor</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link href={`/customer/trips/${tripId}`}>
                <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-5">
                  Return to Trip Experience
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1.5 border-b border-slate-100 pb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Post-Tour Review</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                How Was Your Journey?
              </h1>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Please rate your overall tour experience and share any highlights or suggestions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Overall Rating */}
              <div className="flex flex-col items-center space-y-2 py-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Overall Experience *
                </span>
                {renderStarSelector(rating, setRating)}
              </div>

              {/* Specific Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                    <Hotel className="w-3.5 h-3.5 text-purple-600" />
                    <span>Hotels</span>
                  </span>
                  <div className="flex justify-center">
                    {renderStarSelector(hotelRating, setHotelRating)}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chauffeur</span>
                  </span>
                  <div className="flex justify-center">
                    {renderStarSelector(driverRating, setDriverRating)}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Service</span>
                  </span>
                  <div className="flex justify-center">
                    {renderStarSelector(serviceRating, setServiceRating)}
                  </div>
                </div>
              </div>

              {/* Review Comments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Your Comments & Testimonial
                </label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tell us what you enjoyed the most, or anything we could have done better..."
                  className="min-h-[100px] text-xs font-medium border-slate-200 focus:border-indigo-500 rounded-2xl"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Feedback...</span>
                  </div>
                ) : (
                  <span>Submit Guest Review</span>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
