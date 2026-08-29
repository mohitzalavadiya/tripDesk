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
import { quotationClient, PublicQuotationPayload, PublicPackageOption } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function PublicQuotationPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [quotation, setQuotation] = React.useState<PublicQuotationPayload | null>(null);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
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
        // Default selected package option
        if (res.data.selectedPackageOptionId) {
          setSelectedOptionId(res.data.selectedPackageOptionId);
        } else if (res.data.packageOptions && res.data.packageOptions.length > 0) {
          const rec = res.data.packageOptions.find((p) => p.isRecommended) || res.data.packageOptions[0];
          setSelectedOptionId(rec.id);
        }
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

  // Handle customer selecting a tier
  const handleSelectTier = async (opt: PublicPackageOption) => {
    setSelectedOptionId(opt.id);
    try {
      await quotationClient.selectPublicPackageOption(shareToken, opt.id);
      toast.success(`Selected "${opt.name}" package.`);
    } catch (err) {
      // Non-blocking UI update
    }
  };

  const handleAcceptProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareToken) return;

    try {
      setAccepting(true);
      const res = await quotationClient.acceptPublicQuotation(shareToken, {
        selectedOptionId: selectedOptionId || undefined,
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
    const phone = quotation.agency.phone.replace(/[^0-9]/g, "") || "919876543210";
    const selectedPkg = quotation.packageOptions?.find((p) => p.id === selectedOptionId);
    const pkgText = selectedPkg ? ` for the ${selectedPkg.name} package` : "";
    const text = `Hi ${quotation.agency.name}! I am reviewing quotation ${quotation.quotationNumber} (${quotation.title}). I would like to discuss and confirm this trip${pkgText}.`;
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

  const packageOptions = quotation.packageOptions || [];
  const activePackage = packageOptions.find((p) => p.id === selectedOptionId) || quotation.selectedPackageOption || null;
  const effectiveFinalAmount = activePackage ? Number(activePackage.finalAmount) : quotation.finalAmount;

  const inclusions = quotation.proposalItems?.filter((p) => p.type === "INCLUSION") || [];
  const exclusions = quotation.proposalItems?.filter((p) => p.type === "EXCLUSION") || [];
  const importantNotes = quotation.proposalItems?.filter((p) => p.type === "IMPORTANT_NOTE") || [];
  const milestones = quotation.paymentMilestones || [];

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
              Print Proposal
            </Button>

            {!isAccepted && !isExpired && (
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
          {/* Header Hero */}
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 lg:p-12 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
              <div>
                <div className="text-sm sm:text-base font-black tracking-wider text-indigo-300 uppercase">
                  {quotation.agency.name}
                </div>
                <div className="text-[11px] text-slate-300 tracking-wide mt-0.5">
                  Bespoke Holiday & Travel Itineraries
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
                Official Itinerary & Travel Proposal
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

            {/* Traveler & Trip Quick Stats Bar */}
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
                  {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "Upon confirmation"}
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

            {/* ─── PACKAGE TIERS SELECTOR (PHASE 10.11B) ─── */}
            {packageOptions.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-600" />
                    Choose Your Travel Package Tier
                  </h2>
                  <p className="text-xs text-slate-500">
                    Compare hotel categories, transport options, and select your preferred package.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {packageOptions.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => !isAccepted && handleSelectTier(opt)}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 relative cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-b from-indigo-50/70 to-white border-indigo-600 shadow-lg ring-2 ring-indigo-500/20"
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        {/* Badges */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {opt.isRecommended && (
                              <Badge className="bg-indigo-600 text-white text-[10px] font-bold h-5 px-2 gap-1 rounded-md shadow-2xs">
                                <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                                Recommended
                              </Badge>
                            )}
                          </div>

                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>

                        {/* Title & Subtitle */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-slate-900 text-lg">{opt.name}</h3>
                          {opt.subtitle && <p className="text-xs text-indigo-700 font-semibold">{opt.subtitle}</p>}
                          {opt.description && <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>}
                        </div>

                        {/* Price Card */}
                        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-center space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Package Price</span>
                          <div className="text-3xl font-black text-indigo-600 tracking-tight">
                            {formatCurrency(Number(opt.finalAmount))}
                          </div>
                          <span className="text-[10px] text-slate-500 block">per group (taxes included)</span>
                        </div>

                        {/* Specifications */}
                        <div className="space-y-2 text-xs">
                          {opt.hotelNotes && (
                            <div className="flex items-start gap-2 text-slate-700">
                              <Building2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{opt.hotelNotes}</span>
                            </div>
                          )}
                          {opt.vehicleNotes && (
                            <div className="flex items-start gap-2 text-slate-700">
                              <Car className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{opt.vehicleNotes}</span>
                            </div>
                          )}
                        </div>

                        {/* Inclusions list */}
                        {opt.inclusions.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inclusions</span>
                            <ul className="space-y-1.5 text-xs">
                              {opt.inclusions.map((inc, i) => (
                                <li key={i} className="flex items-start gap-2 text-slate-700">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span className="leading-tight">{inc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className={`w-full text-xs font-bold h-9 rounded-xl mt-2 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected ? "Selected Tier" : "Select This Tier"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day-by-Day Itinerary Presentation */}
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

            {/* Structured Inclusions & Exclusions */}
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

            {/* Payment Milestone Schedule */}
            {milestones.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    Payment Milestone Schedule
                  </h2>
                  <p className="text-xs text-slate-500">Staged payment timeline and deposit breakdown</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {milestones.map((m, idx) => {
                    // Dynamically calculate milestone amount if activePackage has different total
                    const calculatedAmt = m.percentage
                      ? Math.round((effectiveFinalAmount * Number(m.percentage)) / 100)
                      : Number(m.amount || 0);

                    return (
                      <div
                        key={m.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            Milestone {idx + 1}
                          </span>
                          {m.percentage && (
                            <span className="text-xs font-black text-slate-700">{Number(m.percentage)}%</span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                          {m.description && <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-400">
                            {m.dueDate ? `Due: ${new Date(m.dueDate).toLocaleDateString()}` : "Upon schedule"}
                          </span>
                          <strong className="text-indigo-600 font-extrabold text-base">
                            {formatCurrency(calculatedAmt)}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Important Notes & Policies */}
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

            {/* Total Commercial Package Price Summary */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                    Total Package Investment
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {activePackage ? `${activePackage.name} Package` : "Complete Tour Price"}
                  </h3>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {formatCurrency(effectiveFinalAmount)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Includes all stated taxes and service charges ({quotation.currency})
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
                Confirm your acceptance of quotation {quotation.quotationNumber}
                {activePackage ? ` (${activePackage.name} — ${formatCurrency(effectiveFinalAmount)})` : ` (${formatCurrency(effectiveFinalAmount)})`}.
                Your travel advisor will be notified immediately to proceed with reservation bookings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-4 text-xs">
              {activePackage && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase block">Selected Tier</span>
                  <span className="font-extrabold text-slate-900 text-xs">{activePackage.name}</span>
                  <span className="font-bold text-indigo-700 text-xs float-right">{formatCurrency(effectiveFinalAmount)}</span>
                </div>
              )}

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
                  placeholder="e.g. Could we upgrade the Munnar hotel to a 5-star resort and add an extra day in Alleppey?"
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
