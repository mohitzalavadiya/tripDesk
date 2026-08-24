"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Quotation, PublicQuotation } from "@/types";
import { QuotationRenderer } from "@/components/quotation/quotation-renderer";
import { QuotationProvider, useQuotation } from "@/context/quotation-context";
import { exportQuotationPDF } from "@/lib/quotation/pdf-service";
import { openWhatsAppShare, shareQuotationNative } from "@/lib/quotation/share-helpers";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  Mail,
  ExternalLink,
} from "lucide-react";

function PublicQuotationContent() {
  const params = useParams();
  const shareToken = params.shareToken as string;
  const { quotations, getPublicQuotation, markQuotationViewed } = useQuotation();

  const publicQuotation = getPublicQuotation(shareToken);

  // Track view on initial mount
  React.useEffect(() => {
    if (shareToken) {
      markQuotationViewed(shareToken);
    }
  }, [shareToken, markQuotationViewed]);

  if (!publicQuotation) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Quotation Not Found</h2>
            <p className="text-xs text-slate-400">
              The proposal link you accessed may have expired or is invalid. Please reach out to your travel consultant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = publicQuotation.isExpired;

  const handleWhatsAppContact = () => {
    const phone = publicQuotation.agency.phone.replace(/[^0-9]/g, "") || "919847012345";
    const text = `Hi ${publicQuotation.agency.name}! I am reviewing quotation ${publicQuotation.quotationNumber} (${publicQuotation.title}). I would like to discuss and confirm this trip.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCallContact = () => {
    window.location.href = `tel:${publicQuotation.agency.phone}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-28 sm:pb-20">
      {/* Top Floating Brand Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div className="truncate">
              <span className="text-xs font-black tracking-tight text-slate-900 block truncate">
                {publicQuotation.agency.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {publicQuotation.quotationNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportQuotationPDF(publicQuotation)}
              className="text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer bg-white hidden sm:inline-flex"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Download PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => shareQuotationNative(publicQuotation)}
              className="text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer bg-white hidden sm:inline-flex"
            >
              <Share2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Share
            </Button>

            <Button
              size="sm"
              onClick={handleWhatsAppContact}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Contact on WhatsApp</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MAIN QUOTATION PROPOSAL CONTAINER ─────────────────────────── */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8">
        <QuotationRenderer
          quotation={publicQuotation}
          isPublicView={true}
          previewMode="desktop"
        />

        {/* Bottom Contact & Booking Discussion Banner (V1 Locked Workflow) */}
        {!isExpired && (
          <div className="mt-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Ready to customize or book this journey?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect directly with your travel consultant at <strong>{publicQuotation.agency.name}</strong> to finalize dates, customize inclusions, and confirm your booking.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={handleWhatsAppContact}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm h-10 sm:h-11 px-6 rounded-2xl shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat on WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleCallContact}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs sm:text-sm h-10 sm:h-11 px-6 rounded-2xl cursor-pointer"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call {publicQuotation.agency.phone}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ─── MOBILE STICKY FLOATING ACTION DOCK (390px Optimized) ──────── */}
      <div className="fixed bottom-3 inset-x-3 max-w-md mx-auto z-40 sm:hidden print:hidden">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-xl border border-white/10 flex items-center justify-between gap-2">
          <div className="pl-2">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Investment</span>
            <span className="text-sm font-black text-indigo-300">
              {formatCurrency(publicQuotation.sellingPrice, publicQuotation.currency)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={handleWhatsAppContact}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              WhatsApp
            </Button>

            <button
              type="button"
              onClick={() => exportQuotationPDF(publicQuotation)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => shareQuotationNative(publicQuotation)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Share Link"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicQuotationPage() {
  return (
    <QuotationProvider>
      <PublicQuotationContent />
    </QuotationProvider>
  );
}
