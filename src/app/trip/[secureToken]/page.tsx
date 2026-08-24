"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useBooking, BookingProvider } from "@/context/booking-context";
import { useOperations, OperationsProvider } from "@/context/operations-context";
import { useExperience, ExperienceProvider } from "@/context/experience-context";
import { PublicBookingView, TripIssue } from "@/types";
import { formatCurrency } from "@/lib/costing-engine";
import { triggerDocumentPrint } from "@/lib/booking/document-templates";
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
  Compass,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Users,
  Hotel,
  Car,
  Ticket,
  Printer,
  Download,
  Share2,
  Phone,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  IndianRupee,
  AlertTriangle,
  HelpCircle,
  X,
  Star,
  Activity,
  Send,
  UserCheck,
  Gift,
  Award,
  Copy,
  Check,
  ExternalLink,
  Heart,
  Plane,
} from "lucide-react";

function CustomerBookingPortalContent() {
  const params = useParams();
  const secureToken = params.secureToken as string;
  const { getPublicBooking } = useBooking();
  const { operations, createIssue } = useOperations();
  const {
    feedbacks,
    submitCustomerFeedback,
    createReferralCode,
    reviewSettings,
    getCustomer360,
  } = useExperience();

  const booking = getPublicBooking(secureToken);

  // Find matching operation file for live trip status
  const matchedOp = React.useMemo(() => {
    if (!booking) return undefined;
    return operations.find((o) => o.bookingNumber === booking.bookingNumber);
  }, [booking, operations]);

  // Customer 360 data if available
  const c360 = React.useMemo(() => {
    if (!booking) return null;
    return getCustomer360(booking.customer.id || "cust-1");
  }, [booking, getCustomer360]);

  // Existing feedback for this trip if already submitted
  const existingFeedback = React.useMemo(() => {
    if (!matchedOp) return undefined;
    return feedbacks.find((f) => f.tripId === matchedOp.tripId);
  }, [matchedOp, feedbacks]);

  // "Need Help?" Modal State
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [helpCategory, setHelpCategory] = React.useState<TripIssue["type"]>("Hotel");
  const [helpTitle, setHelpTitle] = React.useState("");
  const [helpDescription, setHelpDescription] = React.useState("");

  // Post-Trip Multi-Category Feedback Form State
  const [overallRating, setOverallRating] = React.useState(5);
  const [hotelRating, setHotelRating] = React.useState(5);
  const [vehicleRating, setVehicleRating] = React.useState(5);
  const [driverRating, setDriverRating] = React.useState(5);
  const [activityRating, setActivityRating] = React.useState(5);
  const [supportRating, setSupportRating] = React.useState(5);
  const [positiveComment, setPositiveComment] = React.useState(
    "The Munnar tea gardens, Alleppey houseboat, and chauffeur were exceptional!"
  );
  const [improvementComment, setImprovementComment] = React.useState("");
  const [travelAgain, setTravelAgain] = React.useState<"Yes" | "Maybe" | "No">("Yes");
  const [feedbackJustSubmitted, setFeedbackJustSubmitted] = React.useState(false);

  // Referral state
  const referralCode = booking ? createReferralCode(booking.customer.id || "cust-1") : "TRIP-GUEST500";
  const [copiedReferral, setCopiedReferral] = React.useState(false);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Trip Portal Link Expired</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              We couldn&apos;t locate an active travel booking associated with this link.
            </p>
          </div>
          <p className="text-[11px] text-slate-500">Please contact your travel agency for assistance.</p>
        </div>
      </div>
    );
  }

  const isLiveOnTrip = matchedOp?.operationsStatus === "On Trip";
  const isTripCompleted = matchedOp?.operationsStatus === "Completed" || booking.status === "Completed";
  const allConfirmed = booking.status === "Confirmed";
  const isCancelled = booking.status === "Cancelled";

  // Find Today's plan
  const todayPlan = matchedOp?.dailyPlans.find(
    (p) => p.status === "Today" || p.dayNumber === matchedOp.currentDay
  );

  const handleHelpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpTitle.trim() || !helpDescription.trim()) {
      toast.error("Please provide both title and description.");
      return;
    }

    if (matchedOp) {
      createIssue({
        tripId: matchedOp.tripId,
        bookingId: matchedOp.bookingId,
        customerId: matchedOp.customerSnapshot.id,
        customerName: matchedOp.customerSnapshot.name,
        type: helpCategory,
        title: helpTitle.trim(),
        description: helpDescription.trim(),
        priority: "High",
        status: "Open",
        assignedTo: "Guest Experience Lead",
      });

      toast.success("Help request received! Our guest experience lead is on it.");
      setIsHelpModalOpen(false);
      setHelpTitle("");
      setHelpDescription("");
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedOp) return;

    submitCustomerFeedback({
      tripId: matchedOp.tripId,
      tripTitle: matchedOp.title,
      bookingId: matchedOp.bookingId,
      bookingNumber: matchedOp.bookingNumber,
      customerId: matchedOp.customerSnapshot.id,
      customerName: matchedOp.customerSnapshot.name,
      overallRating,
      hotelRating,
      vehicleRating,
      driverRating,
      activityRating,
      supportRating,
      positiveComment: positiveComment.trim() || undefined,
      improvementComment: improvementComment.trim() || undefined,
      travelAgain,
    });

    setFeedbackJustSubmitted(true);
    toast.success("Thank you for your valuable feedback! 🙏");
  };

  const handleCopyReferral = () => {
    const url = `${window.location.origin}/trip/referral?code=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopiedReferral(true);
    toast.success("Referral invitation link copied to clipboard!");
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white font-sans antialiased pb-28">
      {/* ─── FLOATING TOP BRANDING BAR ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs py-3 px-4 sm:px-8 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm block truncate">
                {booking.agency?.name || "TripDesk Holidays"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                Booking ID: {booking.bookingNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerDocumentPrint()}
              className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-xl hidden sm:inline-flex cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Print Itinerary
            </Button>

            <Button
              size="sm"
              onClick={() => setIsHelpModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              <span>Need Help?</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MAIN PORTAL BODY ───────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl ${
            isCancelled
              ? "bg-slate-900 border border-rose-500/30"
              : isLiveOnTrip
              ? "bg-gradient-to-tr from-slate-950 via-emerald-950 to-indigo-950"
              : isTripCompleted
              ? "bg-gradient-to-tr from-slate-900 via-indigo-950 to-teal-950"
              : allConfirmed
              ? "bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900"
              : "bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950"
          }`}
        >
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Cancelled Booking
                </span>
              ) : isLiveOnTrip ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  LIVE ON TOUR • DAY {matchedOp?.currentDay || 1} ({matchedOp?.currentLocation || booking.destination})
                </span>
              ) : isTripCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                  TOUR COMPLETED 🎉
                </span>
              ) : allConfirmed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  YOUR TRIP IS CONFIRMED 🎉
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Booking Request Under Confirmation ⏳
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {booking.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>Guest: <strong>{booking.customer.name}</strong></span>
                <span>•</span>
                <span>{booking.startDate} → {booking.endDate}</span>
                <span>•</span>
                <span>{booking.adults} Adults {booking.children > 0 && `+ ${booking.children} Kids`}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ─── LIVE TODAY'S OPERATIONAL PLAN (IF ON TOUR) ───────────────── */}
        {todayPlan && isLiveOnTrip && (
          <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Today&apos;s Scheduled Plan • Day {todayPlan.dayNumber} ({todayPlan.location})
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600">{todayPlan.title}</span>
            </div>

            <div className="space-y-3">
              {todayPlan.activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl bg-slate-50/60 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {act.time || "Scheduled"}
                      </span>
                      <span className="font-bold text-slate-900">{act.title}</span>
                    </div>
                    {act.location && (
                      <p className="text-[11px] text-slate-500 pl-1">{act.location}</p>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      act.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : act.status === "In Progress"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── DEDICATED CHAUFFEUR CARD ──────────────────────────────────── */}
        {matchedOp?.transports && matchedOp.transports.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Dedicated Chauffeur & Vehicle
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle</span>
                <p className="font-bold text-slate-900 text-sm">
                  {matchedOp.transports[0]?.vehicleName || "Private Air-Conditioned Vehicle"}
                </p>
                <p className="font-mono text-slate-500 font-semibold">
                  Plate: {matchedOp.transports[0]?.vehicleNumber || "Assigned on arrival"}
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Chauffeur</span>
                <p className="font-bold text-slate-900 text-sm">
                  {matchedOp.transports[0]?.driverName || "Chauffeur details shared prior to pickup"}
                </p>
                {matchedOp.isDriverVisibleToCustomer && matchedOp.transports[0]?.driverPhone && (
                  <a
                    href={`tel:${matchedOp.transports[0].driverPhone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors mt-1"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call Chauffeur ({matchedOp.transports[0].driverPhone})
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── PHASE 9: POST-TRIP EXPERIENCE FEEDBACK & REVIEWS ──────────── */}
        {isTripCompleted && (
          <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="text-center max-w-md mx-auto space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                How was your journey with us?
              </h3>
              <p className="text-xs text-slate-500">
                Your genuine feedback helps us continuously elevate our private tour experiences.
              </p>
            </div>

            {existingFeedback || feedbackJustSubmitted ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center text-xs text-emerald-800 space-y-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">
                    Feedback Submitted! Thank you for traveling with TripDesk.
                  </p>
                  <p className="text-emerald-700">
                    Your rating: <strong>{(existingFeedback?.overallRating || overallRating)} / 5 Stars ⭐</strong>
                  </p>
                </div>

                {/* If Rating was 4 or 5: Public Google Review Invitation */}
                {(existingFeedback?.overallRating || overallRating) >= 4 && (
                  <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 text-center space-y-3 shadow-md">
                    <Sparkles className="h-6 w-6 text-amber-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-base">Share Your Review on Google</h4>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        {reviewSettings.reviewInvitationMessage}
                      </p>
                    </div>
                    <Button
                      onClick={() => window.open(reviewSettings.googleReviewUrl, "_blank")}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-5 rounded-xl cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Write a Google Review ⭐⭐⭐⭐⭐
                    </Button>
                  </div>
                )}

                {/* If Rating was <= 3: Service Recovery Empathy Message */}
                {(existingFeedback?.overallRating || overallRating) <= 3 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center text-xs text-amber-900 space-y-1.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto" />
                    <p className="font-bold">We are committed to making this right.</p>
                    <p className="text-amber-800 text-[11px] max-w-md mx-auto">
                      We sincerely apologize that parts of your tour didn&apos;t meet our luxury standards. Our senior guest relations lead will contact you directly to resolve your concerns.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-5 text-xs">
                {/* Overall Rating */}
                <div className="text-center space-y-2 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="font-bold text-sm text-slate-900 block">
                    Overall Tour Experience
                  </label>
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOverallRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-115"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= overallRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Ratings */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Hotels & Stays", val: hotelRating, set: setHotelRating },
                    { label: "Vehicle & Fleet", val: vehicleRating, set: setVehicleRating },
                    { label: "Chauffeur", val: driverRating, set: setDriverRating },
                    { label: "Sightseeing", val: activityRating, set: setActivityRating },
                    { label: "Support Desk", val: supportRating, set: setSupportRating },
                  ].map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center space-y-1.5"
                    >
                      <span className="text-[10px] font-bold text-slate-600 block uppercase">
                        {cat.label}
                      </span>
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => cat.set(st)}
                            className="p-0.5 cursor-pointer"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                st <= cat.val
                                  ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">What did you enjoy most?</label>
                  <Textarea
                    placeholder="e.g. The tea estate views in Munnar and great chauffeur service..."
                    value={positiveComment}
                    onChange={(e) => setPositiveComment(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">What could we improve?</label>
                  <Textarea
                    placeholder="e.g. More free time in the afternoon..."
                    value={improvementComment}
                    onChange={(e) => setImprovementComment(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Would you travel with us again?</span>
                  <div className="flex items-center gap-2">
                    {["Yes", "Maybe", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTravelAgain(opt as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          travelAgain === opt
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl cursor-pointer shadow-xs"
                >
                  Submit Travel Feedback
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ─── PHASE 9: REFER & EARN CARD ─────────────────────────────────── */}
        <div className="bg-gradient-to-tr from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
                Refer a Friend & Earn Travel Rewards
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
              Give ₹500 • Get ₹500
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <p className="text-xs text-slate-300 leading-relaxed">
              Loved your journey? Share your private referral link with friends. They get an instant <strong>₹500 discount</strong> on their first holiday, and you receive <strong>₹500 in Travel Credits</strong> upon tour completion.
            </p>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">
                  Your Referral Code
                </span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {referralCode}
                </span>
              </div>
              <Button
                onClick={handleCopyReferral}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8.5 rounded-xl cursor-pointer"
              >
                {copiedReferral ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Copied Link
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    Copy Referral Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── PHASE 9: LOYALTY TIER & TRAVEL CREDITS ─────────────────────── */}
        {c360 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {c360.loyalty.tier} Loyalty Member
                  </span>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {c360.loyalty.tierDiscountPercentage}% Member Discount
                  </span>
                </div>
                <p className="text-slate-500">
                  {c360.loyalty.completedTrips} Tours completed with TripDesk.
                </p>
              </div>
            </div>

            <div className="text-right self-end sm:self-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Available Travel Credits
              </span>
              <span className="text-lg font-black text-emerald-700">
                {formatCurrency(c360.availableRewards || 1000)}
              </span>
            </div>
          </div>
        )}

        {/* ─── PHASE 9: PLAN YOUR NEXT ADVENTURE ──────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4 text-center">
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Ready for your next adventure?
            </h3>
            <p className="text-xs text-slate-500">
              Explore hand-crafted holiday packages customized to your travel style.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {["Goa Beach Retreat", "Kashmir Paradise", "Rajasthan Heritage", "Andaman Islands", "Kerala Backwaters"].map(
              (dest, i) => (
                <a
                  key={i}
                  href={`https://wa.me/${(booking.agency?.phone || "+919847012345").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hi! I enjoyed my recent tour with TripDesk and would like to plan a trip to ${dest}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                >
                  {dest} →
                </a>
              )
            )}
          </div>
        </div>

        {/* ─── CONFIRMED ACCOMMODATIONS & SERVICES ──────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Confirmed Hotel Accommodations
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {booking.items
              .filter((i) => i.type === "Hotel")
              .map((hotel) => (
                <div
                  key={hotel.id}
                  className="border border-slate-200/90 rounded-2xl p-4.5 bg-slate-50/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{hotel.title}</h4>
                      <p className="text-xs text-slate-500">{hotel.subtitle || hotel.destination}</p>
                    </div>
                    {hotel.confirmationNumber && (
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 self-start sm:self-auto">
                        Confirmation: {hotel.confirmationNumber}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-in</span>
                      <span className="font-bold text-slate-800">{hotel.startDate || booking.startDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-out</span>
                      <span className="font-bold text-slate-800">{hotel.endDate || booking.endDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Room Category</span>
                      <span className="font-bold text-slate-800">{hotel.roomType || "Deluxe Room"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Meal Plan</span>
                      <span className="font-bold text-slate-800">{hotel.mealPlan || "CP (Breakfast)"}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ─── PAYMENT STATEMENT ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            Payment Statement
          </h3>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Package</span>
              <span className="text-sm sm:text-base font-black text-slate-900">
                {formatCurrency(booking.totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount Paid</span>
              <span className="text-sm sm:text-base font-bold text-emerald-600">
                {formatCurrency(booking.paidAmount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance Due</span>
              <span className="text-sm sm:text-base font-bold text-amber-600">
                {formatCurrency(booking.pendingAmount)}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ─── "NEED HELP?" MODAL ─────────────────────────────────────────── */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Need On-Tour Assistance?</h3>
                  <p className="text-xs text-slate-500">
                    Our 24x7 guest support desk will immediately handle this.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleHelpSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Issue Category</label>
                <Select
                  value={helpCategory}
                  onValueChange={(val) => setHelpCategory(val as TripIssue["type"])}
                >
                  <SelectTrigger className="h-9.5 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="Hotel">🏨 Hotel / Room Accommodation</SelectItem>
                    <SelectItem value="Transport">🚐 Chauffeur / Pickup / Transfer</SelectItem>
                    <SelectItem value="Activity">🎟️ Sightseeing / Activity Slot</SelectItem>
                    <SelectItem value="Itinerary">📅 Schedule / Itinerary Adjustment</SelectItem>
                    <SelectItem value="Other">⚠️ Other Emergency Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Summary Title</label>
                <Input
                  placeholder="e.g. Need extra bedding in Munnar resort"
                  value={helpTitle}
                  onChange={(e) => setHelpTitle(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Detailed Message</label>
                <Textarea
                  placeholder="Please describe what you need assistance with..."
                  rows={3}
                  value={helpDescription}
                  onChange={(e) => setHelpDescription(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsHelpModalOpen(false)}
                  className="text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerBookingPortalPage() {
  return (
    <BookingProvider>
      <OperationsProvider>
        <ExperienceProvider>
          <CustomerBookingPortalContent />
        </ExperienceProvider>
      </OperationsProvider>
    </BookingProvider>
  );
}
