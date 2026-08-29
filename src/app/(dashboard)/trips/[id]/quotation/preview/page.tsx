"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  Download,
  Edit,
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

  const containerWidthClass =
    previewModeWidth(previewDevice);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
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
        <div className={`bg-white text-slate-900 shadow-sm rounded-2xl border border-slate-200/90 overflow-hidden ${containerWidthClass} transition-all duration-300 font-sans mx-auto`}>
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
              <div>
                <div className="text-sm font-black tracking-wider text-indigo-300 uppercase">
                  TRIPDESK TRAVEL AGENCY
                </div>
                <div className="text-[11px] text-slate-300 tracking-wide mt-0.5">
                  Bespoke Itineraries & Luxury Holiday Packages
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-bold text-indigo-200 border border-white/15">
                  {quotation.quotationNumber}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                <Compass className="h-3.5 w-3.5 text-indigo-300" />
                <span>Tailored Holiday Proposal</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                {quotation.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs">
                <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-indigo-300" />
                  <span>Prepared For: <strong className="text-white">{quotation.customer?.name}</strong></span>
                </div>
                <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-indigo-300" />
                  <span>Travel Dates: <strong className="text-white">{new Date(quotation.trip.startDate).toLocaleDateString("en-IN")} → {new Date(quotation.trip.endDate).toLocaleDateString("en-IN")}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Customer Message */}
            {quotation.customerMessage && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 leading-relaxed font-medium">
                {quotation.customerMessage}
              </div>
            )}

            {/* Inclusions & Line Items */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
                Package Inclusions & Line Items
              </h3>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {quotation.items.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {item.type}
                        </Badge>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500">{item.description}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 text-sm block">
                        {formatCurrency(Number(item.totalPrice))}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.quantity} {item.unit || "Unit"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Itinerary Schedule if available */}
            {quotation.trip?.itineraryItems && quotation.trip.itineraryItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
                  Itinerary Highlights
                </h3>

                <div className="space-y-3">
                  {quotation.trip.itineraryItems.map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-indigo-600 font-mono">Day {item.dayNumber}:</span>
                        <span>{item.title}</span>
                      </div>
                      {item.description && (
                        <p className="text-slate-600 leading-relaxed text-[11px]">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary Card */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal (Base Tariff):</span>
                <span>{formatCurrency(Number(quotation.subtotal))}</span>
              </div>
              {Number(quotation.markupAmount) > 0 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Agency Service & Planning ({Number(quotation.markupPercentage)}%):</span>
                  <span>+{formatCurrency(Number(quotation.markupAmount))}</span>
                </div>
              )}
              {Number(quotation.discountAmount) > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Special Discount ({Number(quotation.discountPercentage)}%):</span>
                  <span>-{formatCurrency(Number(quotation.discountAmount))}</span>
                </div>
              )}
              {Number(quotation.taxAmount) > 0 && (
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Tax / GST ({Number(quotation.taxPercentage)}%):</span>
                  <span>+{formatCurrency(Number(quotation.taxAmount))}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-bold text-sm">Total Package Price:</span>
                <span className="font-black text-2xl text-emerald-400">
                  {formatCurrency(Number(quotation.finalAmount))}
                </span>
              </div>
            </div>

            {/* Terms & Conditions */}
            {quotation.terms && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-bold text-slate-700 block uppercase text-[10px]">Booking Terms & Policies</span>
                <p className="leading-relaxed whitespace-pre-wrap">{quotation.terms}</p>
              </div>
            )}
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
