"use client";

import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  QuotationWithRelations,
  quotationClient,
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import {
  ArrowLeft,
  Building,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FilePlus,
  FileQuestion,
  FileText,
  Hotel,
  Info,
  Layers,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Share2,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

interface ErrorState {
  type: "NOT_FOUND" | "UNAUTHORIZED" | "NETWORK_ERROR" | "NO_QUOTATIONS";
  title: string;
  message: string;
}

function ProposalPreviewSkeleton() {


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="text-center space-y-3 max-w-sm w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">Loading proposal preview...</h3>
        <p className="text-xs text-slate-500">Preparing customer proposal view and resource schedule.</p>
      </div>
    </div>
  );
}

function TripQuotationPreviewContent() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();
  const isViewAllowed = isAgencyOwner || (isAgencyStaff && (hasStaffPermission("QUOTATIONS", "view") || hasStaffPermission("QUOTATION_DETAIL", "view")));
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tripId = (params?.id as string) || "";
  const queryQuotationId = searchParams?.get("quotationId") || null;

  const [allQuotations, setAllQuotations] = React.useState<QuotationWithRelations[]>([]);
  const [quotation, setQuotation] = React.useState<QuotationWithRelations | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorState, setErrorState] = React.useState<ErrorState | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Stable data loader that runs only when tripId changes
  const loadData = React.useCallback(async () => {
    if (!isViewAllowed) {
      setLoading(false);
      return;
    }
    // 1. Guard against empty or malformed tripId
    if (!tripId || typeof tripId !== "string" || tripId.trim().length === 0) {
      setErrorState({
        type: "NOT_FOUND",
        title: "Invalid Trip Parameter",
        message: "The trip identifier provided in the URL route is missing or malformed.",
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorState(null);

      // Lightweight request: bypass heavy rate-sheet calculations since costing is not rendered in preview
      const res = await quotationClient.getTripQuotation(tripId, { includeCosting: false });

      if (res.success && res.data) {
        const quotes = res.data.quotations || [];
        setAllQuotations(quotes);

        if (quotes.length > 0) {
          // Select specific quotation if requested via query param; otherwise default to latest
          const selected = queryQuotationId
            ? quotes.find((q) => q.id === queryQuotationId) || quotes[0]
            : quotes[0];
          setQuotation(selected);
        } else {
          setQuotation(null);
          setErrorState({
            type: "NO_QUOTATIONS",
            title: "No Quotation Available",
            message:
              "Trip itinerary details are present, but a proposal snapshot has not yet been generated in the quotation editor.",
          });
        }
      } else {
        setErrorState({
          type: "NOT_FOUND",
          title: "Quotation Not Found",
          message: "Unable to find quotation information for this trip.",
        });
      }
    } catch (err: any) {
      const status =
        err?.statusCode ||
        (err?.code === "NOT_FOUND" ? 404 : err?.code === "FORBIDDEN" ? 403 : 500);

      if (status === 404 || err?.code === "NOT_FOUND") {
        setErrorState({
          type: "NOT_FOUND",
          title: "Trip or Quotation Not Found",
          message:
            "The requested trip or quotation could not be found. It may have been archived, deleted, or does not exist in your organization.",
        });
      } else if (
        status === 401 ||
        status === 403 ||
        err?.code === "FORBIDDEN" ||
        err?.code === "UNAUTHORIZED"
      ) {
        setErrorState({
          type: "UNAUTHORIZED",
          title: "Access Restricted",
          message:
            "You do not have permission to access this quotation record or it belongs to a different agency organization.",
        });
      } else {
        setErrorState({
          type: "NETWORK_ERROR",
          title: "Unable to Load Proposal Preview",
          message:
            err?.message ||
            "A temporary network or server error occurred while retrieving this proposal.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, isViewAllowed]); // Depend on tripId and isViewAllowed

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize selection if queryQuotationId changes from outside or via browser Back/Forward (popstate)
  React.useEffect(() => {
    if (allQuotations.length === 0) return;

    const handleSyncFromUrl = () => {
      try {
        const currentParams = new URLSearchParams(window.location.search);
        const targetQuotationId = currentParams.get("quotationId");
        const match = targetQuotationId
          ? allQuotations.find((q) => q.id === targetQuotationId) || allQuotations[0]
          : allQuotations[0];
        if (match && match.id !== quotation?.id) {
          setQuotation(match);
        }
      } catch {
        // Safe fallback in SSR
      }
    };

    window.addEventListener("popstate", handleSyncFromUrl);
    return () => window.removeEventListener("popstate", handleSyncFromUrl);
  }, [allQuotations, quotation?.id]);

  // Handle switching active quotation tier/version in-memory with browser history preservation
  const handleSelectQuotation = (selectedId: string) => {
    const selected = allQuotations.find((q) => q.id === selectedId);
    if (selected) {
      setQuotation(selected);
      // History URL update without triggering Next.js router re-fetch or skeleton flicker
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("quotationId") !== selectedId) {
          url.searchParams.set("quotationId", selectedId);
          window.history.pushState(null, "", url.toString());
        }
      } catch {
        // Fallback if window is unavailable
      }
    }
  };

  // Copy customer public share link helper
  const handleCopyShareLink = async () => {
    if (!quotation?.shareToken) {
      toast.error("Public share link is not enabled for this quotation.");
      return;
    }
    const publicUrl = `${window.location.origin}/q/${quotation.shareToken}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      toast.success("Public quotation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Failed to copy link. Please manually open the live link.");
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
            <Share2 className="h-3 w-3" />
            Sent
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
            <X className="h-3 w-3" />
            Rejected
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            <Clock className="h-3 w-3" />
            Expired
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
            <FileText className="h-3 w-3" />
            Draft
          </span>
        );
    }
  };

  // ─── 0. ACCESS RESTRICTION CHECK ───
  // ─── 3. MEMOIZED METADATA & DERIVED COLLECTIONS (unconditional before early returns) ───
  const durationText = React.useMemo(() => {
    if (quotation?.trip?.startDate && quotation?.trip?.endDate) {
      const start = new Date(quotation.trip.startDate);
      const end = new Date(quotation.trip.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      return `${nights} Nights / ${nights + 1} Days`;
    }
    return "Custom Itinerary";
  }, [quotation?.trip?.startDate, quotation?.trip?.endDate]);

  const hotelsList = React.useMemo(() => quotation?.trip?.tripHotels || [], [quotation?.trip?.tripHotels]);
  const vehiclesList = React.useMemo(() => quotation?.trip?.tripVehicles || [], [quotation?.trip?.tripVehicles]);
  const activitiesList = React.useMemo(() => quotation?.trip?.tripActivities || [], [quotation?.trip?.tripActivities]);
  const itineraryItems = React.useMemo(() => quotation?.trip?.itineraryItems || [], [quotation?.trip?.itineraryItems]);
  const sortedDestinations = React.useMemo(() => {
    const destinations = quotation?.trip?.tripDestinations || [];
    return [...destinations].sort((a, b) => a.sequence - b.sequence);
  }, [quotation?.trip?.tripDestinations]);

  const inclusions = React.useMemo(
    () => quotation?.proposalItems?.filter((p) => p.type === "INCLUSION") || [],
    [quotation?.proposalItems]
  );
  const exclusions = React.useMemo(
    () => quotation?.proposalItems?.filter((p) => p.type === "EXCLUSION") || [],
    [quotation?.proposalItems]
  );
  const importantNotes = React.useMemo(
    () => quotation?.proposalItems?.filter((p) => p.type === "IMPORTANT_NOTE") || [],
    [quotation?.proposalItems]
  );
  const milestones = React.useMemo(() => quotation?.paymentMilestones || [], [quotation?.paymentMilestones]);

  const agencyContacts = React.useMemo(
    () => [quotation?.agency?.phone, quotation?.agency?.email].filter(Boolean),
    [quotation?.agency?.phone, quotation?.agency?.email]
  );

  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Quotation Preview"
          badgeText="Access Restricted"
          description="You do not have permission to view quotations and proposals. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  // ─── 1. LOADING STATE ───
  if (loading) {
    return <ProposalPreviewSkeleton />;
  }

  // ─── 2. ERROR & NOT-FOUND STATES ───
  if (errorState || !quotation) {
    const isNotFound = errorState?.type === "NOT_FOUND";
    const isUnauthorized = errorState?.type === "UNAUTHORIZED";
    const isNetworkError = errorState?.type === "NETWORK_ERROR";
    const isNoQuotes = errorState?.type === "NO_QUOTATIONS";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-5">
          <div
            className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto ${
              isNotFound
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : isUnauthorized
                ? "bg-rose-50 text-rose-600 border border-rose-100"
                : isNetworkError
                ? "bg-blue-50 text-blue-600 border border-blue-100"
                : "bg-indigo-50 text-indigo-600 border border-indigo-100"
            }`}
          >
            {isNotFound && <FileQuestion className="h-7 w-7" />}
            {isUnauthorized && <Lock className="h-7 w-7" />}
            {isNetworkError && <RefreshCw className="h-7 w-7" />}
            {isNoQuotes && <FilePlus className="h-7 w-7" />}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {errorState?.title || "Quotation Unavailable"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed break-words">
              {errorState?.message || "The requested quotation record could not be loaded."}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {isNoQuotes ? (
              <>
                <Button
                  size="sm"
                  onClick={() => router.push(`/trips/${encodeURIComponent(tripId)}/quotation`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl cursor-pointer"
                >
                  <FilePlus className="h-4 w-4 mr-1.5" />
                  Open Quotation Editor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/trips/${encodeURIComponent(tripId)}`)}
                  className="w-full text-xs font-semibold h-9 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Trip Overview
                </Button>
              </>
            ) : isNetworkError ? (
              <>
                <Button
                  size="sm"
                  onClick={() => loadData()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Retry Loading
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/quotations")}
                  className="w-full text-xs font-semibold h-9 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700"
                >
                  Browse All Quotations
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => router.push("/quotations")}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl cursor-pointer"
                >
                  Return to Quotations List
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/trips")}
                    className="flex-1 text-xs font-semibold h-9 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700"
                  >
                    All Trips
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 text-xs font-semibold h-9 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700"
                  >
                    CRM Dashboard
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const agencySubtext = agencyContacts.length > 0 ? agencyContacts.join(" | ") : "TRIP PROPOSAL";

  const tierName = quotation.tier || "Deluxe";
  const proposalBadgeText = `TIER: ${tierName.toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 font-sans overflow-x-hidden w-full max-w-full">
      {/* ─── TOP ACTION & CRM NAVIGATION BAR ─── */}
      <div className="bg-white border-b border-slate-200 shadow-2xs py-2.5 px-3 sm:px-6 lg:px-8 print:hidden md:sticky md:top-0 z-20">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3">
          {/* Left Column: Navigation & Quotation Reference */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
            <Link
              href={`/trips/${encodeURIComponent(tripId)}/quotation`}
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl transition-colors text-slate-700 shrink-0 shadow-2xs"
              title="Return to Costing Editor"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xs:inline">Back to </span>Editor
            </Link>

            <Link
              href={`/trips/${encodeURIComponent(tripId)}`}
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl transition-colors text-slate-700 shrink-0 shadow-2xs"
              title="View Trip Itinerary & Operations"
            >
              <span className="hidden xs:inline">Trip </span>Details
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-800 text-xs font-mono">{quotation.quotationNumber}</span>
              <span className="text-slate-400 text-xs hidden md:inline truncate max-w-[200px] lg:max-w-[320px]">
                • {quotation.title}
              </span>
              {renderStatusBadge(quotation.status)}
            </div>
          </div>

          {/* Right Column: Multi-Tier Switcher & Supported Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-start md:justify-end">
            {/* Version/Tier Switcher if multiple quotations exist */}
            {allQuotations.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <Layers className="h-3.5 w-3.5 text-slate-500 ml-1.5 hidden xs:inline" />
                <select
                  aria-label="Select quotation version or tier"
                  value={quotation.id}
                  onChange={(e) => handleSelectQuotation(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 py-1 px-1.5 rounded-lg border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer outline-hidden"
                >
                  {allQuotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.tier ? `${q.tier} (V${q.version})` : q.quotationNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Copy Share Link */}
            {quotation.shareToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShareLink}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl transition-colors text-slate-700 shadow-2xs cursor-pointer"
                title="Copy customer public proposal link"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    <span className="hidden xs:inline">Copy </span>Link
                  </>
                )}
              </Button>
            )}

            {/* Download PDF */}
            <a
              href={`/api/quotations/${encodeURIComponent(quotation.id)}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl transition-colors text-slate-700 shadow-2xs"
              title="Download customer proposal PDF"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <span className="hidden xs:inline">Download </span>PDF
            </a>

            {/* Print Document */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-semibold h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl cursor-pointer bg-white hidden sm:inline-flex shadow-2xs text-slate-700 border-slate-200"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Print
            </Button>

            {/* Live Client Link */}
            {quotation.shareToken && (
              <Button
                size="sm"
                onClick={() => window.open(`/q/${quotation.shareToken}`, "_blank")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 sm:h-8.5 px-2.5 sm:px-3.5 rounded-xl cursor-pointer shadow-2xs"
                title="Open client-facing public view in a new window"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                <span className="hidden xs:inline">Live </span>View
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── RENDERED PROPOSAL DOCUMENT CONTAINER ─── */}
      <div className="pt-4 sm:pt-8 px-2 sm:px-4 max-w-[960px] mx-auto w-full">
        <div className="bg-white text-slate-900 shadow-sm rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden w-full max-w-full">
          {/* 1. Brand Header & Hero */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 sm:pb-6 mb-6 sm:mb-8 gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black tracking-wider text-indigo-300 uppercase truncate">
                  {quotation.agency?.name || "YOUR TRAVEL DESK"}
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
                <p className="text-xs sm:text-sm text-slate-300 font-medium break-words leading-relaxed">
                  {quotation.proposalSubtitle}
                </p>
              )}
            </div>

            {/* 2. Trip Overview Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 text-xs">
              <div className="min-w-0 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Prepared For
                </span>
                <span className="font-bold text-white text-xs sm:text-sm truncate block">
                  {quotation.customer?.name || "Valued Traveler"}
                </span>
              </div>

              <div className="min-w-0 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Travel Dates
                </span>
                <span className="font-bold text-white text-xs sm:text-sm break-words block">
                  {quotation.trip?.startDate
                    ? new Date(quotation.trip.startDate).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "TBD"}
                  {quotation.trip?.endDate
                    ? ` - ${new Date(quotation.trip.endDate).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </span>
              </div>

              <div className="min-w-0 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Duration
                </span>
                <span className="font-bold text-white text-xs sm:text-sm truncate block">
                  {durationText}
                </span>
              </div>

              <div className="min-w-0 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Travelers
                </span>
                <span className="font-bold text-white text-xs sm:text-sm truncate block">
                  {quotation.trip?.travelers?.length || 1} Traveler(s)
                </span>
              </div>
            </div>
          </div>

          {/* ─── BODY SECTIONS CONTAINER ─── */}
          <div className="p-4 sm:p-8 lg:p-10 space-y-8 sm:space-y-10">
            {/* 3. Customer Welcome Message */}
            {quotation.customerMessage && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                <span className="font-bold text-indigo-950 not-italic block mb-1">
                  Dear {quotation.customer?.name || "Traveler"},
                </span>
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {quotation.customerMessage}
                </p>
              </div>
            )}

            {/* 4. Trip Highlights & Destinations */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Trip Highlights & Inclusions
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {hotelsList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shrink-0">
                    <Hotel className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>
                      {hotelsList.length} Hotel{hotelsList.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {vehiclesList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shrink-0">
                    <Car className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>
                      {vehiclesList.length} Vehicle{vehiclesList.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {activitiesList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shrink-0">
                    <Ticket className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>{activitiesList.length} Sightseeing</span>
                  </div>
                )}
              </div>

              {/* Destination Route Sequence with Clean Wrap Containment */}
              {sortedDestinations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Planned Route:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {sortedDestinations.map((d, index) => (
                      <React.Fragment key={d.id}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 font-semibold max-w-[240px] truncate shadow-2xs">
                          <MapPin className="h-3 w-3 text-indigo-600 shrink-0" />
                          <span className="truncate">{d.destination?.name || "Destination"}</span>
                        </span>
                        {index < sortedDestinations.length - 1 && (
                          <span className="text-slate-400 text-xs select-none">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Day by Day Itinerary */}
            {itineraryItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    Day-by-Day Detailed Itinerary
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {itineraryItems.length} Days Planned
                  </span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {[...itineraryItems]
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-200 transition-colors shadow-2xs overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                          <div className="flex items-start sm:items-center gap-2 min-w-0">
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-xs shrink-0 mt-0.5 sm:mt-0">
                              DAY {item.dayNumber}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm break-words">
                              {item.title}
                            </span>
                          </div>
                          {item.location && (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 self-start sm:self-auto shrink-0 max-w-full truncate">
                              📍 {item.location}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {item.description}
                          </p>
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
                    <div
                      key={hotel.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm break-words">
                            {hotel.hotel?.name || "Selected Hotel"}
                          </h4>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {hotel.hotel?.city || "Destination"}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-bold shrink-0">
                          {hotel.rooms || 1} Room{(hotel.rooms || 1) > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                        {hotel.roomType && (
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 break-words">
                            Category: <strong>{hotel.roomType}</strong>
                          </span>
                        )}
                        {hotel.mealPlan && (
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 break-words">
                            Meal: <strong>{hotel.mealPlan}</strong>
                          </span>
                        )}
                        {hotel.checkIn && hotel.checkOut && (
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 break-words">
                            {new Date(hotel.checkIn).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {new Date(hotel.checkOut).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
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
                    <div
                      key={veh.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm break-words">
                            {veh.vehicle?.name || veh.vehicleName || "Private Vehicle"}
                          </h4>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {veh.vehicle?.type || veh.vehicleType || "Private Transport"}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-bold shrink-0">
                          {veh.vehicle?.capacity || 4} Seater
                        </span>
                      </div>

                      {veh.notes && (
                        <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200/60 break-words [overflow-wrap:anywhere]">
                          {veh.notes}
                        </p>
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
                      <div
                        key={act.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs overflow-hidden"
                      >
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
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isIncluded
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
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
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-3 overflow-hidden">
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" /> Package Inclusions
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {inclusions.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span className="break-words [overflow-wrap:anywhere]">{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {exclusions.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-3 overflow-hidden">
                    <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                      <X className="h-4 w-4 text-rose-600" /> Package Exclusions
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {exclusions.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-rose-600 font-bold">•</span>
                          <span className="break-words [overflow-wrap:anywhere]">{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 10. Important Traveler Notes */}
            {importantNotes.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3 overflow-hidden">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-amber-600" /> Important Traveler Notes
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {importantNotes.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span className="break-words [overflow-wrap:anywhere]">{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 11. Payment Schedule & Milestones Table with Strict Container Scroll */}
            {milestones.length > 0 && (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Payment Schedule & Terms
                  </h4>
                </div>

                <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                  <table className="w-full min-w-[380px] text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none">
                      <tr>
                        <th className="py-2.5 px-3.5">Installment / Milestone</th>
                        <th className="py-2.5 px-3.5">Due Date</th>
                        <th className="py-2.5 px-3.5 text-right">Payable Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {milestones.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3.5 font-semibold text-slate-900 break-words max-w-[220px]">
                            {m.title}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                            {m.dueDate
                              ? new Date(m.dueDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "On Booking Confirmation"}
                          </td>
                          <td className="py-3 px-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatCurrency(Number(m.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 12. Policies & Terms */}
            {(quotation.cancellationPolicy || quotation.terms || quotation.privacyPolicy) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-3 overflow-hidden">
                {quotation.cancellationPolicy && (
                  <div className="space-y-1">
                    <strong className="text-slate-800 block">Cancellation Policy:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {quotation.cancellationPolicy}
                    </p>
                  </div>
                )}
                {quotation.terms && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <strong className="text-slate-800 block">Terms & Conditions:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {quotation.terms}
                    </p>
                  </div>
                )}
                {quotation.privacyPolicy && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <strong className="text-slate-800 block">Privacy Policy:</strong>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {quotation.privacyPolicy}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 13. FINAL QUOTATION AMOUNT (CUSTOMER-FACING TOTAL) */}
            <div className="p-5 sm:p-8 bg-slate-900 text-white rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left overflow-hidden">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 block">
                  Final Proposal Price
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-200 block truncate">
                  Total Final Quotation Amount ({quotation.tier || "Standard"})
                </span>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="font-black text-2xl sm:text-4xl text-emerald-400 tracking-tight block break-words">
                  {formatCurrency(Number(quotation.finalAmount))}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block">
                  All-inclusive holiday package price ({quotation.currency})
                </span>
              </div>
            </div>

            {/* 14. Agency Contact Footer */}
            <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">{quotation.agency?.name || "Your Travel Desk Platform"}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
                {quotation.agency?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {quotation.agency.phone}
                  </span>
                )}
                {quotation.agency?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" /> {quotation.agency.email}
                  </span>
                )}
                {quotation.agency?.address && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3 shrink-0" /> {quotation.agency.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripQuotationPreviewPage() {
  return (
    <React.Suspense fallback={<ProposalPreviewSkeleton />}>
      <TripQuotationPreviewContent />
    </React.Suspense>
  );
}
