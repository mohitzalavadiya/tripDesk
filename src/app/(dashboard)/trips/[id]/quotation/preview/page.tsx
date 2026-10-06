"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ExternalLink,
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
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs py-2.5 px-3 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={`/trips/${tripId}/quotation`}
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl transition-colors text-slate-700 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xs:inline">Back to </span>Editor
            </Link>

            <div className="hidden md:block truncate">
              <span className="font-bold text-slate-800 text-xs">{quotation.quotationNumber}</span>
              <span className="text-slate-400 text-xs ml-1.5">• {quotation.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href={`/api/quotations/${encodeURIComponent(quotation.id)}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl transition-colors text-slate-700 shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <span className="hidden xs:inline">Download </span>PDF
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl cursor-pointer bg-white hidden sm:inline-flex"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Print
            </Button>

            {quotation.shareToken && (
              <Button
                size="sm"
                onClick={() => window.open(`/q/${quotation.shareToken}`, "_blank")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 sm:h-8.5 px-2.5 sm:px-3.5 rounded-xl cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                <span className="hidden xs:inline">Live </span>Link
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Rendered Document Container */}
      <div className="pt-4 sm:pt-8 px-2 sm:px-4">
        <div className="bg-white text-slate-900 shadow-sm rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden max-w-[960px] mx-auto w-full">
          {/* 1. Brand Header & Hero */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 sm:pb-6 mb-6 sm:mb-8 gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black tracking-wider text-indigo-300 uppercase truncate">
                  {quotation.agency?.name || "TRIPDESK TRAVEL AGENCY"}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-300 tracking-wide mt-0.5 break-words">
                  {agencySubtext}
                </div>
              </div>
              <div className="self-start sm:self-auto shrink-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-[10px] sm:text-xs font-mono font-bold text-indigo-200 border border-white/15">
                  <span>{quotation.quotationNumber}</span>
                  <span>•</span>
                  <span>V{quotation.version}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <Compass className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-indigo-300" />
                <span>{proposalBadgeText}</span>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight break-words">
                {quotation.title}
              </h1>

              {quotation.proposalSubtitle && (
                <p className="text-xs sm:text-sm text-slate-300 font-medium break-words leading-relaxed">{quotation.proposalSubtitle}</p>
              )}
            </div>

            {/* 2. Trip Overview Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 text-xs">
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Prepared For</span>
                <span className="font-bold text-white text-xs sm:text-sm truncate block">{quotation.customer?.name || "Valued Traveler"}</span>
              </div>

              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Travel Dates</span>
                <span className="font-bold text-white text-xs sm:text-sm break-words block">
                  {quotation.trip?.startDate ? new Date(quotation.trip.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                  {quotation.trip?.endDate ? ` - ${new Date(quotation.trip.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Duration</span>
                <span className="font-bold text-white text-xs sm:text-sm truncate block">{durationText || "Custom"}</span>
              </div>

              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Travelers</span>
                <span className="font-bold text-white text-xs sm:text-sm truncate block">
                  {quotation.trip?.travelers?.length || 1} Traveler(s)
                </span>
              </div>
            </div>
          </div>

          {/* Body Sections Container */}
          <div className="p-4 sm:p-8 lg:p-10 space-y-8 sm:space-y-10">
            {/* 3. Customer Welcome Message */}
            {quotation.customerMessage && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                <span className="font-bold text-indigo-950 not-italic block mb-1">Dear {quotation.customer?.name || "Traveler"},</span>
                <p className="whitespace-pre-wrap break-words">{quotation.customerMessage}</p>
              </div>
            )}

            {/* 4. Trip Highlights */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Trip Highlights & Inclusions</h3>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 text-xs">
                {hotelsList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium min-w-0">
                    <Hotel className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{hotelsList.length} Hotel{hotelsList.length > 1 ? "s" : ""}</span>
                  </div>
                )}
                {vehiclesList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium min-w-0">
                    <Car className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{vehiclesList.length} Vehicle{vehiclesList.length > 1 ? "s" : ""}</span>
                  </div>
                )}
                {activitiesList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium min-w-0">
                    <Ticket className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{activitiesList.length} Sightseeing</span>
                  </div>
                )}
                {sortedDestinations.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium min-w-0 col-span-2 sm:col-span-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{sortedDestinations.map((d) => d.destination?.name || "Dest").join(" → ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Day by Day Itinerary */}
            {itineraryItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    Day-by-Day Detailed Itinerary
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">{itineraryItems.length} Days Planned</span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {[...itineraryItems]
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((item) => (
                      <div key={item.id} className="p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-200 transition-colors shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-xs shrink-0">
                              DAY {item.dayNumber}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm break-words">{item.title}</span>
                          </div>
                          {item.location && (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 self-start sm:self-auto shrink-0">
                              📍 {item.location}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{item.description}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 6. Hotel & Accommodation Details */}
            {hotelsList.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-indigo-600" />
                    Accommodation & Stays
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {hotelsList.map((hotel) => (
                    <div key={hotel.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm break-words">{hotel.hotel?.name || "Selected Hotel"}</h4>
                          <span className="text-[11px] text-slate-500 block truncate">{hotel.hotel?.city || "Destination"}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-bold shrink-0">
                          {hotel.rooms || 1} Room{(hotel.rooms || 1) > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                        {hotel.roomType && (
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                            Category: <strong>{hotel.roomType}</strong>
                          </span>
                        )}
                        {hotel.mealPlan && (
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                            Meal: <strong>{hotel.mealPlan}</strong>
                          </span>
                        )}
                        {hotel.checkIn && hotel.checkOut && (
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                            {new Date(hotel.checkIn).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - {new Date(hotel.checkOut).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Transport Details */}
            {vehiclesList.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Car className="h-4 w-4 text-indigo-600" />
                    Transport & Private Transfers
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {vehiclesList.map((veh) => (
                    <div key={veh.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm break-words">{veh.vehicle?.name || "Private Vehicle"}</h4>
                          <span className="text-[11px] text-slate-500 block truncate">{veh.vehicle?.type || "Transport"}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-bold shrink-0">
                          {veh.vehicle?.capacity || 4} Seater
                        </span>
                      </div>

                      {veh.notes && (
                        <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200/60 break-words">{veh.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Activities / Sightseeing */}
            {activitiesList.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-indigo-600" />
                    Sightseeing & Excursions
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {activitiesList.map((act) => {
                    const isIncluded = act.type !== "EXCLUDED" && act.type !== "OPTIONAL";
                    return (
                      <div key={act.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isIncluded ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-800 text-xs truncate">
                            {act.name || act.activity?.name || "Sightseeing Experience"}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isIncluded ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                        }`}>
                          {isIncluded ? "Included" : "Not Included"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 9. Inclusions & Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {inclusions.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" /> Package Inclusions
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {inclusions.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="break-words">{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {exclusions.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                      <X className="h-4 w-4 text-rose-600" /> Package Exclusions
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {exclusions.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-rose-600 font-bold">•</span>
                          <span className="break-words">{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 10. Important Traveler Notes */}
            {importantNotes.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-amber-600" /> Important Traveler Notes
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {importantNotes.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span className="break-words">{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 11. Payment Schedule (Internal info) */}
            {milestones.length > 0 && (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Payment Terms
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {milestones.map((m, idx) => (
                    <div key={m.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{m.title}</span>
                        {m.dueDate && (
                          <span className="text-[10px] text-slate-500">Due: {new Date(m.dueDate).toLocaleDateString("en-IN")}</span>
                        )}
                      </div>
                      <span className="font-extrabold text-slate-900 shrink-0">{formatCurrency(Number(m.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. Policies & Terms */}
            {(quotation.cancellationPolicy || quotation.terms || quotation.privacyPolicy) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-3">
                {quotation.cancellationPolicy && (
                  <div className="space-y-1">
                    <strong className="text-slate-800 block">Cancellation Policy:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{quotation.cancellationPolicy}</p>
                  </div>
                )}
                {quotation.terms && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <strong className="text-slate-800 block">Terms & Conditions:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{quotation.terms}</p>
                  </div>
                )}
                {quotation.privacyPolicy && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <strong className="text-slate-800 block">Privacy Policy:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{quotation.privacyPolicy}</p>
                  </div>
                )}
              </div>
            )}

            {/* 13. FINAL QUOTATION AMOUNT (THE ONLY MONETARY SECTION) */}
            <div className="p-5 sm:p-8 bg-slate-900 text-white rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 block">
                  Final Proposal Price
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-200">
                  Total Final Quotation Amount
                </span>
              </div>
              <div className="sm:text-right">
                <span className="font-black text-2xl sm:text-4xl text-emerald-400 tracking-tight block">
                  {formatCurrency(Number(quotation.finalAmount))}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400">
                  All-inclusive holiday package price ({quotation.currency})
                </span>
              </div>
            </div>

            {/* 14. Agency Contact Footer */}
            <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">{quotation.agency?.name || "TripDesk Travel Platform"}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
                {quotation.agency?.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {quotation.agency.phone}</span>
                )}
                {quotation.agency?.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /> {quotation.agency.email}</span>
                )}
                {quotation.agency?.address && (
                  <span className="flex items-center gap-1"><Building className="h-3 w-3 shrink-0" /> {quotation.agency.address}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
