"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  Printer,
  Loader2,
  Calendar,
  Users,
  Compass,
  CheckCircle2,
  Hotel,
  Car,
  Ticket,
  Check,
  X,
  CreditCard,
  ShieldCheck,
  Info,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  Mail,
  Building,
} from "lucide-react";
import { quotationClient, QuotationWithRelations, TripCostingResult } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TripQuotationPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [quotation, setQuotation] = React.useState<QuotationWithRelations | null>(null);
  const [costing, setCosting] = React.useState<TripCostingResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "tablet" | "mobile">("desktop");

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await quotationClient.getTripQuotation(tripId);
        if (res.success && res.data) {
          setCosting(res.data.costing);
          if (res.data.quotations.length > 0) {
            setQuotation(res.data.quotations[0]);
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load quotation preview.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">Loading proposal preview...</h3>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-800">No Quotation Available</h2>
          <p className="text-xs text-slate-500">Please generate a quotation first in the editor.</p>
          <Button size="sm" onClick={() => router.push(`/trips/${tripId}/quotation`)}>
            Go to Editor
          </Button>
        </div>
      </div>
    );
  }

  const containerWidthClass = previewModeWidth(previewDevice);

  // Derive duration
  let durationText = "";
  if (quotation.trip?.startDate && quotation.trip?.endDate) {
    const start = new Date(quotation.trip.startDate);
    const end = new Date(quotation.trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    durationText = `${nights} Nights / ${nights + 1} Days`;
  }

  // Derive Highlights
  const hotelsList = quotation.trip?.tripHotels || [];
  const vehiclesList = quotation.trip?.tripVehicles || [];
  const activitiesList = quotation.trip?.tripActivities || [];
  const itineraryItems = quotation.trip?.itineraryItems || [];
  const destinations = quotation.trip?.tripDestinations || [];
  const sortedDestinations = [...destinations].sort((a, b) => a.sequence - b.sequence);

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
    <div className="min-h-screen bg-slate-100/70 pb-16 font-sans">
      {/* Top Floating Action Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs py-3 px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href={`/trips/${tripId}/quotation`}
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl transition-colors text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Editor
            </Link>

            <div className="hidden sm:block">
              <span className="font-bold text-slate-800 text-xs">{quotation.quotationNumber}</span>
              <span className="text-slate-400 text-xs ml-1.5">• {quotation.title}</span>
            </div>
          </div>

          {/* Viewport Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setPreviewDevice("desktop")}
              className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                previewDevice === "desktop" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Desktop View"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("tablet")}
              className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                previewDevice === "tablet" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("mobile")}
              className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                previewDevice === "mobile" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Mobile View (390px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/quotations/${encodeURIComponent(quotation.id)}/pdf`}
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
              className="text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer bg-white"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Print
            </Button>

            {quotation.shareToken && (
              <Button
                size="sm"
                onClick={() => window.open(`/q/${quotation.shareToken}`, "_blank")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8.5 px-3.5 rounded-xl cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Live Customer Link
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Rendered Document Container */}
      <div className="pt-8 px-4">
        <div className={`bg-white text-slate-900 shadow-sm rounded-3xl border border-slate-200/90 overflow-hidden ${containerWidthClass} transition-all duration-300 mx-auto`}>
          {/* 1. Brand Header & Hero */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
              <div>
                <div className="text-sm font-black tracking-wider text-indigo-300 uppercase">
                  {quotation.agency?.name || "TRIPDESK TRAVEL AGENCY"}
                </div>
                <div className="text-[11px] text-slate-300 tracking-wide mt-0.5">
                  {agencySubtext}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-bold text-indigo-200 border border-white/15">
                  <span>{quotation.quotationNumber}</span>
                  <span>•</span>
                  <span>v{quotation.version}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                <Compass className="h-3.5 w-3.5 text-indigo-300" />
                <span>{proposalBadgeText}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                {quotation.title}
              </h1>

              {quotation.proposalSubtitle && (
                <p className="text-sm text-slate-300 font-medium">{quotation.proposalSubtitle}</p>
              )}
            </div>

            {/* 2. Trip Overview Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Prepared For</span>
                <span className="font-bold text-white text-sm">{quotation.customer?.name || "Valued Traveler"}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Travel Dates</span>
                <span className="font-bold text-white text-sm">
                  {quotation.trip?.startDate && quotation.trip?.endDate
                    ? `${new Date(quotation.trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(quotation.trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Custom / Flexible"}
                </span>
                {durationText && <span className="text-[10px] text-indigo-300 block font-medium mt-0.5">{durationText}</span>}
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Group Size</span>
                <span className="font-bold text-white text-sm">
                  {quotation.trip?.travelers?.length || 1} Traveler(s)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Validity</span>
                <span className="font-bold text-indigo-300 text-sm">
                  {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Upon Confirmation"}
                </span>
              </div>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Advisor Greeting */}
            {quotation.customerMessage && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 leading-relaxed font-medium">
                <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Greeting from your Travel Consultant
                </h4>
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
            {sortedDestinations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  Tour Route Sequence
                </h3>
                <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-50/60 border border-purple-100 rounded-2xl">
                  {sortedDestinations.map((dest, idx) => (
                    <React.Fragment key={dest.id || idx}>
                      <span className="px-3 py-1 bg-white border border-purple-200 text-purple-900 font-bold text-xs rounded-xl shadow-2xs">
                        {dest.destination?.name || (dest as any).name || "Destination"}
                      </span>
                      {idx < sortedDestinations.length - 1 && (
                        <span className="text-purple-400 font-black text-xs">➔</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Day-by-Day Itinerary */}
            {itineraryItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
                  Day-Wise Tour Itinerary
                </h3>

                <div className="space-y-3">
                  {itineraryItems.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="text-white bg-slate-900 px-2 py-0.5 rounded-md font-mono text-[11px]">
                            Day {item.dayNumber}
                          </span>
                          <span className="text-sm font-extrabold">{item.title}</span>
                        </div>
                        {item.location && (
                          <span className="text-indigo-600 text-[11px] font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                            📍 {item.location}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-slate-600 leading-relaxed text-xs pt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Accommodation & Stay Details (NO PRICING) */}
            {hotelsList.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-indigo-600" />
                  Hotel Accommodations
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {hotelsList.map((h) => {
                    const hotelName = h.hotel?.name || "Selected Hotel";
                    const cityName = h.hotel?.city || "";
                    const nights = Math.max(1, Math.round((new Date(h.checkOut).getTime() - new Date(h.checkIn).getTime()) / (1000 * 60 * 60 * 24)));

                    return (
                      <div key={h.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{hotelName}</h4>
                            {cityName && <span className="text-[11px] text-indigo-600 font-semibold">{cityName}</span>}
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md shrink-0">
                            {nights} Night(s)
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-600 text-[11px]">
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
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Car className="h-4 w-4 text-indigo-600" />
                  Transportation & Transfers
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {vehiclesList.map((v) => (
                    <div key={v.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-900 text-sm">{v.vehicleName || v.vehicle?.name || "Private Vehicle"}</h4>
                        {v.vehicle?.capacity && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">
                            {v.vehicle.capacity} Seater
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px]">
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
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-indigo-600" />
                  Sightseeing & Activities
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {activitiesList.map((act) => (
                    <div key={act.id} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-extrabold text-slate-900">{act.name || act.activity?.name || "Excursion"}</h4>
                        {act.date && (
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {act.description && (
                        <p className="text-slate-600 text-[11px] leading-relaxed">{act.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Coverage: Inclusions vs Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {inclusions.length > 0 && (
                  <div className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-3xl space-y-3">
                    <h4 className="font-bold text-emerald-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" />
                      What&apos;s Included
                    </h4>
                    <ul className="space-y-2 text-slate-700">
                      {inclusions.map((inc) => (
                        <li key={inc.id} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-900">{inc.title}</strong>
                            {inc.description && <p className="text-[11px] text-slate-500 mt-0.5">{inc.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {exclusions.length > 0 && (
                  <div className="p-5 bg-rose-50/60 border border-rose-100 rounded-3xl space-y-3">
                    <h4 className="font-bold text-rose-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <X className="h-4 w-4 text-rose-600" />
                      What&apos;s Excluded
                    </h4>
                    <ul className="space-y-2 text-slate-700">
                      {exclusions.map((exc) => (
                        <li key={exc.id} className="flex items-start gap-2">
                          <X className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-900">{exc.title}</strong>
                            {exc.description && <p className="text-[11px] text-slate-500 mt-0.5">{exc.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 10. Important Notes & Advisories */}
            {importantNotes.length > 0 && (
              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-indigo-600" />
                  Important Travel Notes & Advisories
                </h4>
                <ul className="space-y-2">
                  {importantNotes.map((n) => (
                    <li key={n.id} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <div>
                        <strong className="text-slate-900">{n.title}:</strong>{" "}
                        <span className="text-slate-600">{n.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 11. Policies / Terms */}
            {(quotation.cancellationPolicy || quotation.terms) && (
              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Booking Policies & Cancellation Terms
                </h4>
                {quotation.cancellationPolicy && (
                  <div className="space-y-1">
                    <strong className="text-slate-800 block">Cancellation Policy:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{quotation.cancellationPolicy}</p>
                  </div>
                )}
                {quotation.terms && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <strong className="text-slate-800 block">Terms & Conditions:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{quotation.terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* 12. Payment Schedule (PERCENTAGES ONLY) */}
            {milestones.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                  Payment Milestone Schedule
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {milestones.map((m, idx) => (
                    <div key={m.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700">
                        <span>Stage {idx + 1}</span>
                        {m.percentage && (
                          <span className="font-black text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                            {Number(m.percentage)}%
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{m.title}</p>
                      {m.dueDate && (
                        <p className="text-[10px] text-slate-400">Due: {new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 13. FINAL QUOTATION AMOUNT (THE ONLY MONETARY SECTION) */}
            <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 block">
                  Final Proposal Price
                </span>
                <span className="font-bold text-sm text-slate-200">
                  Total Final Quotation Amount
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-3xl sm:text-4xl text-emerald-400 tracking-tight block">
                  {formatCurrency(Number(quotation.finalAmount))}
                </span>
                <span className="text-[11px] text-slate-400">
                  All-inclusive holiday package price ({quotation.currency})
                </span>
              </div>
            </div>

            {/* 14. Agency Contact Footer */}
            <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">{quotation.agency?.name || "TripDesk Travel Platform"}</p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                {quotation.agency?.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {quotation.agency.phone}</span>
                )}
                {quotation.agency?.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {quotation.agency.email}</span>
                )}
                {quotation.agency?.address && (
                  <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {quotation.agency.address}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function previewModeWidth(mode: "desktop" | "tablet" | "mobile") {
  switch (mode) {
    case "mobile":
      return "max-w-[410px]";
    case "tablet":
      return "max-w-[760px]";
    case "desktop":
    default:
      return "max-w-[960px]";
  }
}
