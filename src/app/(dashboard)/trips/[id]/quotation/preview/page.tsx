"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuotation } from "@/context/quotation-context"
import { QuotationRenderer } from "@/components/quotation/quotation-renderer"
import { QuotationShareModal } from "@/components/quotation/quotation-share-modal"
import { exportQuotationPDF } from "@/lib/quotation/pdf-service"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Share2,
  Download,
  Edit,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react"

export default function TripQuotationPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { getQuotationsForTrip, markQuotationSent } = useQuotation()
  const tripQuotations = getQuotationsForTrip(id)
  const quotation = tripQuotations[0]

  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "tablet" | "mobile">("desktop")
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false)

  if (!quotation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-800">No Quotation Available</h2>
          <p className="text-xs text-slate-500">Please create a quotation first in the editor.</p>
          <Button size="sm" onClick={() => router.push(`/trips/${id}/quotation`)}>
            Go to Editor
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Top Floating Action Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs py-3 px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href={`/trips/${id}/quotation`}
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

          {/* Action Triggers */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportQuotationPDF(quotation)}
              className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-xl cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Download PDF
            </Button>

            <Button
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Share Link
            </Button>
          </div>
        </div>
      </div>

      {/* Main Document Canvas */}
      <div className="max-w-[1200px] mx-auto px-4 pt-8">
        <QuotationRenderer quotation={quotation} previewMode={previewDevice} />
      </div>

      <QuotationShareModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        quotation={quotation}
        onMarkSent={(id) => markQuotationSent(id)}
      />
    </div>
  )
}
