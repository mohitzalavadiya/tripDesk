"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { tripPublicClient, bookingPublicClient } from "@/lib/api-client";
import { PublicTripPayload } from "@/lib/services/trip-public-service";
import { PublicBookingPayload } from "@/lib/services/booking-public-service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useModalScrollLock } from "@/lib/scroll-lock";
import {
  Compass,
  CheckCircle2,
  Clock,
  Hotel,
  Car,
  Ticket,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  X,
  Star,
  ThumbsUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
} from "lucide-react";

export default function CustomerTripPortalPage() {
  const params = useParams();
  const secureToken = (params?.secureToken as string) || "";

  const [trip, setTrip] = React.useState<PublicTripPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [helpMessage, setHelpMessage] = React.useState("");

  useModalScrollLock(isHelpModalOpen);

  // Post-Trip Feedback States
  const [feedbackStatus, setFeedbackStatus] = React.useState<any | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);
  const [isFeedbackEditing, setIsFeedbackEditing] = React.useState(false);
  const [showCategoryRatings, setShowCategoryRatings] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [serviceRating, setServiceRating] = React.useState(5);
  const [hotelRating, setHotelRating] = React.useState(5);
  const [driverRating, setDriverRating] = React.useState(5);
  const [vehicleRating, setVehicleRating] = React.useState(5);
  const [activityRating, setActivityRating] = React.useState(5);
  const [supportRating, setSupportRating] = React.useState(5);
  const [positiveComment, setPositiveComment] = React.useState("");
  const [improvementComment, setImprovementComment] = React.useState("");
  const [travelAgain, setTravelAgain] = React.useState("Yes");
  const [comments, setComments] = React.useState("");

  React.useEffect(() => {
    async function loadData() {
      if (!secureToken) {
        setError("Invalid or missing portal token.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try fetching public trip first
        let tripData: PublicTripPayload | null = null;
        try {
          tripData = await tripPublicClient.getByToken(secureToken);
        } catch {
          // If trip lookup fails, try booking lookup
        }

        let bookingData: PublicBookingPayload | null = null;
        try {
          bookingData = await bookingPublicClient.getByToken(secureToken);
        } catch {
          // It's okay if booking lookup fails
        }

        if (tripData) {
          setTrip(tripData);
        } else if (bookingData && bookingData.trip) {
          // Reconstruct minimal trip payload if only booking resolved
          setTrip({
            id: bookingData.trip.id,
            tripNumber: bookingData.trip.tripNumber,
            title: bookingData.trip.title,
            startDate: bookingData.trip.startDate,
            endDate: bookingData.trip.endDate,
            status: bookingData.trip.status as any,
            agency: bookingData.agency,
            customer: bookingData.customer,
            travelers: bookingData.trip.travelers || [],
            itinerary: [],
            hotels: [],
            vehicles: [],
            activities: [],
            bookingSummary: {
              id: bookingData.id,
              bookingNumber: bookingData.bookingNumber,
              status: bookingData.status,
              paymentStatus: bookingData.paymentStatus,
              packageOptionName: bookingData.packageOptionName,
              currency: bookingData.currency,
              totalAmount: bookingData.totalAmount,
              paidAmount: bookingData.paidAmount,
              balanceAmount: bookingData.balanceAmount,
            },
          });
        }

        if (!tripData && !bookingData) {
          setError("Trip or Booking portal link not found or has expired.");
        }

        // Fetch feedback status if trip is loaded or completed
        try {
          const fbRes = await tripPublicClient.getFeedback(secureToken);
          if (fbRes) {
            setFeedbackStatus(fbRes);
            if (fbRes.feedback) {
              setRating(fbRes.feedback.rating || 5);
              setHotelRating(fbRes.feedback.hotelRating || 5);
              setDriverRating(fbRes.feedback.driverRating || 5);
              setVehicleRating(fbRes.feedback.vehicleRating || 5);
              setActivityRating(fbRes.feedback.activityRating || 5);
              setSupportRating(fbRes.feedback.supportRating || 5);
              setPositiveComment(fbRes.feedback.positiveComment || "");
              setImprovementComment(fbRes.feedback.improvementComment || "");
              setTravelAgain(fbRes.feedback.travelAgain || "Yes");
              setComments(fbRes.feedback.comments || "");
            }
          }
        } catch {
          // Non-critical: feedback check fails silently if route error
        }
      } catch (err: any) {
        console.error("Failed to load public portal:", err);
        setError("Unable to load travel details. Please contact your travel advisor.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [secureToken]);

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 mx-auto" />
          <div className="h-5 w-48 bg-slate-700 rounded mx-auto" />
          <div className="h-3 w-64 bg-slate-700/60 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Portal Link Expired</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error || "We couldn't locate an active travel booking associated with this link."}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">Please contact your travel agency for assistance.</p>
        </div>
      </div>
    );
  }

  const isConfirmed = trip.status === "BOOKED" || trip.bookingSummary?.status === "CONFIRMED";
  const isOngoing = trip.status === "ONGOING";
  const isCompleted = trip.status === "COMPLETED";

  const handleHelpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneClean = (trip.agency.phone || "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hello ${trip.agency.name}, I need assistance with Trip ${trip.tripNumber} (${trip.title}): ${helpMessage}`
    );
    window.open(`https://wa.me/${phoneClean}?text=${text}`, "_blank");
    setIsHelpModalOpen(false);
    toast.success("Opening WhatsApp chat with your travel consultant.");
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFeedbackSubmitting(true);
      const res = await tripPublicClient.submitFeedback(secureToken, {
        rating,
        serviceRating: showCategoryRatings ? serviceRating : rating,
        hotelRating: showCategoryRatings ? hotelRating : rating,
        driverRating: showCategoryRatings ? driverRating : rating,
        vehicleRating: showCategoryRatings ? vehicleRating : rating,
        activityRating: showCategoryRatings ? activityRating : rating,
        supportRating: showCategoryRatings ? supportRating : rating,
        positiveComment: positiveComment.trim() || null,
        improvementComment: improvementComment.trim() || null,
        travelAgain,
        comments: comments.trim() || positiveComment.trim() || null,
      });

      setFeedbackStatus((prev: any) => ({
        ...prev,
        hasFeedback: true,
        feedback: res,
        reviewLinks: res?.reviewLinks || prev?.reviewLinks || null,
      }));
      setIsFeedbackEditing(false);
      toast.success("Thank you! Your feedback has been recorded successfully.");
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      toast.error(err?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const renderInteractiveStars = (
    val: number,
    onChange: (n: number) => void,
    size: "lg" | "sm" = "lg",
    ariaLabel: string = "Star Rating"
  ) => {
    const starLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
    return (
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={ariaLabel}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === val}
            aria-label={`${star} star - ${starLabels[star - 1]}`}
            onClick={() => onChange(star)}
            className={`cursor-pointer transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md ${
              size === "lg" ? "p-1.5" : "p-0.5"
            }`}
          >
            <Star
              className={`${
                size === "lg" ? "w-8 h-8 sm:w-9 sm:h-9" : "w-5 h-5"
              } transition-colors ${
                star <= val
                  ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                  : "text-slate-300 fill-slate-100"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white font-sans antialiased pb-20">
      {/* ─── FLOATING TOP BRANDING BAR ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs py-3 px-4 sm:px-8 print:hidden">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm block truncate">
                {trip.agency.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                Ref: {trip.bookingSummary?.bookingNumber || trip.tripNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsHelpModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>Contact Advisor</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MAIN PORTAL BODY ───────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl ${
            isOngoing
              ? "bg-gradient-to-tr from-slate-950 via-emerald-950 to-indigo-950"
              : isCompleted
              ? "bg-gradient-to-tr from-slate-900 via-indigo-950 to-teal-950"
              : isConfirmed
              ? "bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900"
              : "bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950"
          }`}
        >
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              {isOngoing ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  LIVE ON TOUR
                </span>
              ) : isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                  TOUR COMPLETED
                </span>
              ) : isConfirmed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  CONFIRMED BOOKING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  PLANNED ITINERARY
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {trip.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>Guest: <strong>{trip.customer.name}</strong></span>
                <span>•</span>
                <span>{formatDate(trip.startDate)} → {formatDate(trip.endDate)}</span>
                <span>•</span>
                <span>{trip.travelers.length || 1} Travelers</span>
              </p>
            </div>
          </div>
        </div>

        {/* ─── POST-TRIP GUEST FEEDBACK ──────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          {feedbackStatus?.hasFeedback && !isFeedbackEditing ? (
            /* Display Submitted Feedback Card */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Your Tour Review
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        Submitted
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thank you for sharing your experience with {trip.agency.name}.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFeedbackEditing(true)}
                  className="rounded-xl border-slate-200 text-xs font-bold self-start sm:self-auto cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Update Review
                </Button>
              </div>

              {/* Overall Rating Display */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-6 h-6 ${
                          s <= (feedbackStatus.feedback?.rating || 5)
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200 fill-slate-100"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-black text-slate-800">
                    {feedbackStatus.feedback?.rating}.0 / 5.0
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <ThumbsUp className="w-4 h-4 text-emerald-600" />
                  <span>Travel with agency again: <strong>{feedbackStatus.feedback?.travelAgain || "Yes"}</strong></span>
                </div>
              </div>

              {/* Comments if any */}
              {(feedbackStatus.feedback?.positiveComment || feedbackStatus.feedback?.comments) && (
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Your Comments & Highlights
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">
                    {feedbackStatus.feedback?.positiveComment || feedbackStatus.feedback?.comments}
                  </p>
                </div>
              )}

              {/* ─── EXTERNAL PUBLIC REVIEW CTAs (IF CONFIGURED BY AGENCY) ───── */}
              {(feedbackStatus.reviewLinks?.googleReviewUrl || feedbackStatus.reviewLinks?.tripAdvisorReviewUrl) && (
                <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 rounded-2xl p-5 border border-indigo-100/90 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Share Your Experience Publicly
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your feedback helps other travelers discover great journeys. Please consider taking a moment to leave a public review!
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {feedbackStatus.reviewLinks.googleReviewUrl && (
                      <a
                        href={feedbackStatus.reviewLinks.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                      >
                        <span className="text-base">🌟</span>
                        <span>Review us on Google</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}
                    {feedbackStatus.reviewLinks.tripAdvisorReviewUrl && (
                      <a
                        href={feedbackStatus.reviewLinks.tripAdvisorReviewUrl}
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
            </div>
          ) : (
            /* Interactive Review Submission Form */
            <form id="guest-feedback-form" onSubmit={handleFeedbackSubmit} className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {isFeedbackEditing ? "Update Your Tour Review" : "How Was Your Tour Experience?"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Please take a moment to rate your journey with {trip.agency.name}.
                    </p>
                  </div>
                </div>

                {isFeedbackEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFeedbackEditing(false)}
                    className="text-xs text-slate-500 rounded-xl"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Overall Rating Section */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 text-center space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Overall Experience *
                </span>
                <div className="flex justify-center">
                  {renderInteractiveStars(rating, setRating, "lg", "Overall Tour Experience")}
                </div>
                <p className="text-xs font-bold text-indigo-600">
                  {rating === 5 && "⭐ Excellent - Exceeded expectations"}
                  {rating === 4 && "⭐ Very Good - Highly satisfied"}
                  {rating === 3 && "⭐ Good - Met basic expectations"}
                  {rating === 2 && "⭐ Fair - Needs improvement"}
                  {rating === 1 && "⭐ Poor - Disappointed"}
                </p>
              </div>

              {/* Optional Category Ratings Toggle */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-white space-y-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryRatings(!showCategoryRatings)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    Detailed Category Ratings (Hotels, Transport, Driver, Service)
                  </span>
                  {showCategoryRatings ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showCategoryRatings && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 animate-in fade-in-0 duration-150">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Hotel className="w-3.5 h-3.5 text-purple-600" /> Hotel Accommodations
                      </span>
                      <div className="flex items-center gap-1 pt-0.5">
                        {renderInteractiveStars(hotelRating, setHotelRating, "sm", "Hotel Rating")}
                        <span className="text-xs font-bold text-slate-600 ml-1.5">{hotelRating}★</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-blue-600" /> Chauffeur & Transfers
                      </span>
                      <div className="flex items-center gap-1 pt-0.5">
                        {renderInteractiveStars(driverRating, setDriverRating, "sm", "Driver Rating")}
                        <span className="text-xs font-bold text-slate-600 ml-1.5">{driverRating}★</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-emerald-600" /> Sightseeing & Activities
                      </span>
                      <div className="flex items-center gap-1 pt-0.5">
                        {renderInteractiveStars(activityRating, setActivityRating, "sm", "Activity Rating")}
                        <span className="text-xs font-bold text-slate-600 ml-1.5">{activityRating}★</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo-600" /> Advisor & Support
                      </span>
                      <div className="flex items-center gap-1 pt-0.5">
                        {renderInteractiveStars(supportRating, setSupportRating, "sm", "Support Rating")}
                        <span className="text-xs font-bold text-slate-600 ml-1.5">{supportRating}★</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments & Highlights */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Your Highlights & Suggestions (Optional)
                </label>
                <textarea
                  id="guest-feedback-comments"
                  rows={3}
                  maxLength={2000}
                  value={positiveComment}
                  onChange={(e) => setPositiveComment(e.target.value)}
                  placeholder="Tell us what you loved about the tour or what we could improve..."
                  className="w-full text-xs font-medium p-3 rounded-2xl border border-slate-200 focus:outline-indigo-600 transition-colors"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Your honest review helps other travelers and our operations team.</span>
                  <span>{positiveComment.length}/2000</span>
                </div>
              </div>

              {/* Would travel again selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  Would you travel with {trip.agency.name} again?
                </span>
                <div className="flex items-center gap-2">
                  {["Yes", "Maybe", "No"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTravelAgain(opt)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        travelAgain === opt
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Action */}
              <Button
                id="submit-feedback-btn"
                type="submit"
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting}
                className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                {feedbackSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Review...</span>
                  </div>
                ) : (
                  <span>{isFeedbackEditing ? "Update Review" : "Submit Guest Review"}</span>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* ─── "CONTACT ADVISOR" MODAL ────────────────────────────────────── */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Message Your Travel Advisor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleHelpSubmit} className="space-y-3">
              <textarea
                placeholder="Type your question or request..."
                rows={3}
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-indigo-600"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHelpModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Send via WhatsApp
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

