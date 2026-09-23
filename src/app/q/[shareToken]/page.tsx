"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Download,
  Share2,
  Phone,
  MessageSquare,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Users,
  Printer,
  Loader2,
  Check,
  X,
  CreditCard,
  FileCheck,
  ShieldCheck,
  Info,
  Star,
  Package,
  Building2,
  Car,
  Hotel,
  Ticket,
  MapPin,
  Mail,
  Building,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { quotationClient, PublicQuotationPayload } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function PublicQuotationPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [quotation, setQuotation] = React.useState<PublicQuotationPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals
  const [isAcceptModalOpen, setIsAcceptModalOpen] = React.useState(false);
  const [accepting, setAccepting] = React.useState(false);
  const [acceptComments, setAcceptComments] = React.useState("");

  const [isChangeModalOpen, setIsChangeModalOpen] = React.useState(false);
  const [submittingChanges, setSubmittingChanges] = React.useState(false);
  const [changeMessage, setChangeMessage] = React.useState("");

  const loadPublicQuote = React.useCallback(async () => {
    if (!shareToken) return;
    try {
      setLoading(true);
      setError(null);
      const res = await quotationClient.getPublicQuotation(shareToken);
      if (res.success && res.data) {
        setQuotation(res.data);
        quotationClient.markQuotationViewed(shareToken).catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || "Quotation proposal not found or link has expired.");
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  React.useEffect(() => {
    loadPublicQuote();
  }, [loadPublicQuote]);

  const handleAcceptProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareToken) return;

    try {
      setAccepting(true);
      const res = await quotationClient.acceptPublicQuotation(shareToken, {
        customerName: quotation?.customer.name,
        customerEmail: quotation?.customer.email,
        customerPhone: quotation?.customer.phone,
        comments: acceptComments || undefined,
      });

      if (res.success) {
        toast.success("Thank you! You have accepted this holiday proposal.");
        setIsAcceptModalOpen(false);
        await loadPublicQuote();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept proposal.");
    } finally {
      setAccepting(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareToken || !changeMessage) return;

    try {
      setSubmittingChanges(true);
      const res = await quotationClient.requestChangesPublicQuotation(shareToken, {
        message: changeMessage,
        customerName: quotation?.customer.name,
        customerPhone: quotation?.customer.phone,
      });

      if (res.success) {
        toast.success("Your revision request has been submitted to your travel advisor.");
        setIsChangeModalOpen(false);
        await loadPublicQuote();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit revision request.");
    } finally {
      setSubmittingChanges(false);
    }
  };

  const handleWhatsAppContact = () => {
    if (!quotation) return;
    const phone = quotation.agency.phone?.replace(/[^0-9]/g, "") || "919876543210";
    const text = `Hi ${quotation.agency.name}! I am reviewing quotation ${quotation.quotationNumber} (${quotation.title}). I would like to discuss and confirm this trip.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading holiday proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Quotation Not Found</h2>
            <p className="text-xs text-slate-400">
              {error || "The proposal link you accessed may have expired or is invalid. Please reach out to your travel consultant."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = quotation.isExpired;
  const isAccepted = quotation.status === "ACCEPTED";

  const effectiveFinalAmount = quotation.finalAmount;

  // Duration calculation
  let durationText = "";
  if (quotation.trip.startDate && quotation.trip.endDate) {
    const start = new Date(quotation.trip.startDate);
    const end = new Date(quotation.trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    durationText = `${nights} Nights / ${nights + 1} Days`;
  }

  // Highlights & services
  const hotelsList = quotation.trip.tripHotels || [];
  const vehiclesList = quotation.trip.tripVehicles || [];
  const activitiesList = quotation.trip.tripActivities || [];
  const itineraryItems = quotation.trip.itineraryItems || [];
  const destinations = (quotation.trip as any).tripDestinations || [];
  const sortedDestinations = [...destinations].sort((a: any, b: any) => a.sequence - b.sequence);

  const inclusions = quotation.proposalItems?.filter((p) => p.type === "INCLUSION") || [];
  const exclusions = quotation.proposalItems?.filter((p) => p.type === "EXCLUSION") || [];
  const importantNotes = quotation.proposalItems?.filter((p) => p.type === "IMPORTANT_NOTE") || [];
  const milestones = quotation.paymentMilestones || [];

  // Dynamic agency contact line & Proposal label
  const agencyContacts = [quotation.agency?.phone, quotation.agency?.email].filter(Boolean);
  const agencySubtext = agencyContacts.length > 0 ? agencyContacts.join(" | ") : "TRIP PROPOSAL";
  const tierName = quotation.tier || "Deluxe";
  const proposalBadgeText = `TIER: ${tierName.toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 pb-28 sm:pb-20 font-sans">
      {/* Top Floating Brand Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 sm:px-8 py-3 transition-all print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div className="truncate">
              <span className="text-xs font-black tracking-tight text-slate-900 block truncate">
                {quotation.agency.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {quotation.quotationNumber} • v{quotation.version}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/quotations/public/${encodeURIComponent(shareToken)}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl transition-colors text-slate-700 shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Download PDF
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer bg-white hidden sm:inline-flex"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Print
            </Button>

            {!isExpired && !isAccepted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangeModalOpen(true)}
                  className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer hidden md:inline-flex"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Request Changes
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsAcceptModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept Proposal
                </Button>
              </>
            )}

            {isAccepted && (
              <Badge className="bg-emerald-500 text-white font-bold text-xs h-8.5 px-3 gap-1 rounded-xl shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Document Layout */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        <div className="bg-white text-slate-900 shadow-sm rounded-3xl border border-slate-200/90 overflow-hidden font-sans">
          {/* 1. Header Hero */}
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 lg:p-12 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
              <div>
                <div className="text-sm sm:text-base font-black tracking-wider text-indigo-300 uppercase">
                  {quotation.agency.name}
                </div>
                <div className="text-[11px] text-slate-300 tracking-wide mt-0.5">
                  {agencySubtext}
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-indigo-200 border border-white/15">
                  <span>{quotation.quotationNumber}</span>
                  <span>•</span>
                  <span>v{quotation.version}</span>
                </div>
                {isExpired && (
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">
                    Expired Proposal
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
                {proposalBadgeText}
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {quotation.title}
              </h1>
              {quotation.proposalSubtitle && (
                <p className="text-sm sm:text-base text-slate-300 font-medium">
                  {quotation.proposalSubtitle}
                </p>
              )}
            </div>

            {/* 2. Trip Overview Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Prepared For</span>
                <span className="font-bold text-white text-sm">{quotation.customer.name}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Travel Dates</span>
                <span className="font-bold text-white text-sm">
                  {new Date(quotation.trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {new Date(quotation.trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {durationText && <span className="text-[10px] text-indigo-300 block font-medium mt-0.5">{durationText}</span>}
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Travelers</span>
                <span className="font-bold text-white text-sm">
                  {quotation.trip.travelers.length || 1} Person(s)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Valid Until</span>
                <span className="font-bold text-indigo-300 text-sm">
                  {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Upon confirmation"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-12 space-y-10">
            {/* Welcome Message */}
            {quotation.customerMessage && (
              <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200/80 leading-relaxed text-slate-700 text-sm">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Greeting from your Travel Advisor
                </h3>
                <p className="whitespace-pre-wrap">{quotation.customerMessage}</p>
              </div>
            )}



            {/* 3. Tour Highlights Bar */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-700 font-semibold">
                {hotelsList.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Hotel className="h-4 w-4 text-indigo-600" />
                    <span>{hotelsList.length} Premium Stay{hotelsList.length > 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-indigo-600" />
                  <span>{vehiclesList.length > 0 ? "Private Vehicle & Chauffeur" : "Transfers Included"}</span>
                </div>
                {activitiesList.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Ticket className="h-4 w-4 text-indigo-600" />
                    <span>{activitiesList.length} Curated Experience{activitiesList.length > 1 ? "s" : ""}</span>
                  </div>
                )}
                {itineraryItems.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span>{itineraryItems.length} Days Itinerary</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Destination Route Sequence */}
            {/* {sortedDestinations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  Tour Route Sequence
                </h3>
                <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-50/60 border border-purple-100 rounded-2xl">
                  {sortedDestinations.map((dest: any, idx: number) => (
                    <React.Fragment key={dest.id || idx}>
                      <span className="px-3 py-1 bg-white border border-purple-200 text-purple-900 font-bold text-xs rounded-xl shadow-2xs">
                        {dest.destination?.name || dest.name || "Destination"}
                      </span>
                      {idx < sortedDestinations.length - 1 && (
                        <span className="text-purple-400 font-black text-xs">➔</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )} */}

            {/* 5. Day-by-Day Itinerary Schedule */}
            {quotation.trip.itineraryItems.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Day-by-Day Itinerary Schedule</h2>
                  <p className="text-xs text-slate-500">Planned sightseeing, transfers, and experiences</p>
                </div>

                <div className="space-y-4">
                  {quotation.trip.itineraryItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-4"
                    >
                      <div className="shrink-0 flex sm:flex-col items-center justify-start gap-1 sm:w-20">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          Day {item.dayNumber}
                        </span>
                        {item.date && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{item.title}</h4>
                          {item.location && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.location}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Accommodation & Stay Details (NO PRICING) */}
            {hotelsList.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-indigo-600" />
                    Hotel Accommodations
                  </h2>
                  <p className="text-xs text-slate-500">Handpicked luxury and comfortable stays</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotelsList.map((h) => {
                    const hotelName = h.hotel?.name || "Selected Hotel";
                    const cityName = h.hotel?.city || "";
                    const nights = Math.max(1, Math.round((new Date(h.checkOut).getTime() - new Date(h.checkIn).getTime()) / (1000 * 60 * 60 * 24)));

                    return (
                      <div key={h.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{hotelName}</h4>
                            {cityName && <span className="text-xs text-indigo-600 font-semibold">{cityName}</span>}
                          </div>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg shrink-0">
                            {nights} Night(s)
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-600 text-xs pt-1">
                          <div><strong className="text-slate-800">Room Category:</strong> {h.roomType}</div>
                          {h.mealPlan && <div><strong className="text-slate-800">Meal Plan:</strong> {h.mealPlan}</div>}
                          <div><strong className="text-slate-800">Check-in:</strong> {new Date(h.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • <strong className="text-slate-800">Check-out:</strong> {new Date(h.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. Transportation & Logistics (NO PRICING) */}
            {vehiclesList.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Car className="h-5 w-5 text-indigo-600" />
                    Transportation & Transfers
                  </h2>
                  <p className="text-xs text-slate-500">Private vehicle arrangements and chauffeured transit</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehiclesList.map((v) => (
                    <div key={v.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{v.vehicleName || v.vehicle?.name || "Private Vehicle"}</h4>
                        {v.vehicle?.capacity && (
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg">
                            {v.vehicle.capacity} Seater
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs">
                        {v.vehicleType || v.vehicle?.type || "Dedicated Private Transport"} • {v.notes || "Airport transfers, sightseeing, and intercity transit as per itinerary"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Sightseeing & Activities (NO PRICING) */}
            {activitiesList.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-indigo-600" />
                    Sightseeing & Activities
                  </h2>
                  <p className="text-xs text-slate-500">Curated experiences and entry excursions</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activitiesList.map((act) => (
                    <div key={act.id} className="p-4 bg-white border border-slate-200 shadow-2xs rounded-2xl space-y-1 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm">{act.name || act.activity?.name || "Excursion"}</h4>
                        {act.date && (
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">
                            {new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {act.description && (
                        <p className="text-slate-600 text-xs leading-relaxed">{act.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Structured Inclusions & Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inclusions */}
                <div className="p-6 rounded-3xl bg-emerald-50/40 border border-emerald-100 space-y-4">
                  <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-3">
                    <div className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-emerald-950 text-sm">Package Inclusions</h3>
                      <p className="text-[11px] text-emerald-700">{quotation.inclusionsIntro || "Covered in this proposal"}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs">
                    {inclusions.map((inc) => (
                      <li key={inc.id} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-950 font-bold block">{inc.title}</strong>
                          {inc.description && <p className="text-emerald-800 text-[11px] mt-0.5">{inc.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exclusions */}
                <div className="p-6 rounded-3xl bg-rose-50/40 border border-rose-100 space-y-4">
                  <div className="flex items-center gap-2 border-b border-rose-200/60 pb-3">
                    <div className="h-7 w-7 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                      <X className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-rose-950 text-sm">Package Exclusions</h3>
                      <p className="text-[11px] text-rose-700">{quotation.exclusionsIntro || "Not covered in this package"}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs">
                    {exclusions.map((exc) => (
                      <li key={exc.id} className="flex items-start gap-2.5">
                        <X className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-rose-950 font-bold block">{exc.title}</strong>
                          {exc.description && <p className="text-rose-800 text-[11px] mt-0.5">{exc.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 10. Payment Milestone Schedule (PERCENTAGES ONLY) */}
            {/* {milestones.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    Payment Milestone Schedule
                  </h2>
                  <p className="text-xs text-slate-500">Staged payment timeline and deposit breakdown</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Milestone {idx + 1}
                        </span>
                        {m.percentage && (
                          <span className="text-xs font-black text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                            {Number(m.percentage)}%
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                        {m.description && <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between text-[11px] text-slate-500">
                        <span>
                          {m.dueDate ? `Due: ${new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Upon schedule"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {/* 11. Important Notes & Policies */}
            {(importantNotes.length > 0 || quotation.cancellationPolicy || quotation.terms) && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Important Notes & Policy Terms
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {importantNotes.length > 0 && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Traveler Advisories</h4>
                      <ul className="space-y-2">
                        {importantNotes.map((n) => (
                          <li key={n.id} className="flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-900">{n.title}:</strong>{" "}
                              <span className="text-slate-600">{n.description}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quotation.cancellationPolicy && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Cancellation Policy</h4>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{quotation.cancellationPolicy}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 12. Total Commercial Package Price Summary - Final Amount ONLY */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                    Total Package Investment
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    Complete Tour Price
                  </h3>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-3xl sm:text-5xl font-black text-emerald-400 tracking-tight">
                    {formatCurrency(effectiveFinalAmount)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    All-inclusive customer package price ({quotation.currency})
                  </span>
                </div>
              </div>

              {/* Bottom Interactive Decision Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 print:hidden">
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Transparent Pricing • Direct Advisor Support</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <a
                    href={`/api/quotations/public/${encodeURIComponent(shareToken)}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold h-10 px-4 rounded-xl cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-1.5 text-indigo-300" />
                    PDF
                  </a>

                  <Button
                    variant="outline"
                    onClick={handleWhatsAppContact}
                    className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-10 px-4 rounded-xl cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5 text-emerald-400" />
                    WhatsApp
                  </Button>

                  {!isAccepted && !isExpired && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsChangeModalOpen(true)}
                        className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-10 px-4 rounded-xl cursor-pointer"
                      >
                        Request Changes
                      </Button>

                      <Button
                        onClick={() => setIsAcceptModalOpen(true)}
                        className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs h-10 px-6 rounded-xl shadow-lg cursor-pointer"
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Accept Proposal
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 13. Agency Contact Footer */}
            <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">{quotation.agency.name}</p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                {quotation.agency.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {quotation.agency.phone}</span>
                )}
                {quotation.agency.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {quotation.agency.email}</span>
                )}
                {quotation.agency.address && (
                  <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {quotation.agency.address}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── ACCEPT PROPOSAL MODAL ─── */}
      <Dialog open={isAcceptModalOpen} onOpenChange={setIsAcceptModalOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-3xl max-w-md p-6 shadow-2xl">
          <form onSubmit={handleAcceptProposal}>
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Check className="h-6 w-6" />
              </div>
              <DialogTitle className="text-slate-900 font-bold text-lg">Accept Itinerary Proposal</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Confirm your acceptance of quotation {quotation.quotationNumber}.
                Your travel advisor will be notified immediately to proceed with reservation bookings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-4 text-xs">

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Traveler Name</label>
                <Input value={quotation.customer.name} disabled className="h-9 bg-slate-50 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Optional Notes / Requests</label>
                <Textarea
                  value={acceptComments}
                  onChange={(e) => setAcceptComments(e.target.value)}
                  placeholder="e.g. Please proceed with booking. We prefer king-bed rooms."
                  rows={3}
                  className="text-xs bg-slate-50/50 border-slate-200 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAcceptModalOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={accepting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-bold"
              >
                {accepting ? "Confirming..." : "Confirm & Accept"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── REQUEST CHANGES MODAL ─── */}
      <Dialog open={isChangeModalOpen} onOpenChange={setIsChangeModalOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-3xl max-w-md p-6 shadow-2xl">
          <form onSubmit={handleRequestChanges}>
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <MessageSquare className="h-6 w-6" />
              </div>
              <DialogTitle className="text-slate-900 font-bold text-lg">Request Revisions</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Let your advisor know what changes or adjustments you would like in hotels, dates, or activities.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Requested Adjustments *</label>
                <Textarea
                  value={changeMessage}
                  onChange={(e) => setChangeMessage(e.target.value)}
                  placeholder="e.g. Could we upgrade the hotel to a 5-star resort and add an extra day in the itinerary?"
                  rows={4}
                  className="text-xs bg-slate-50/50 border-slate-200 resize-none"
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsChangeModalOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingChanges || !changeMessage}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-5 font-bold"
              >
                {submittingChanges ? "Submitting..." : "Send to Advisor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
