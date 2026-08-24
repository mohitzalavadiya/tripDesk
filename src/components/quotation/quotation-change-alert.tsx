"use client"

import * as React from "react"
import { QuotationDifference } from "@/lib/quotation/compare-quotation"
import { AlertTriangle, RotateCcw, Plus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuotationChangeAlertProps {
  difference: QuotationDifference
  onCreateVersion: () => void
}

export function QuotationChangeAlert({
  difference,
  onCreateVersion,
}: QuotationChangeAlertProps) {
  if (!difference.hasChanges) return null

  return (
    <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="h-4 w-4 stroke-[2]" />
        </div>
        <div className="space-y-1">
          <div className="font-extrabold text-amber-950 text-xs sm:text-sm flex items-center gap-2">
            <span>Trip & Costing Divergence Detected</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900">
              Snapshot Mismatch
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
            The live Trip itinerary or Phase 5 Costing has been updated since this quotation was generated. Your current quotation remains locked on its saved snapshot.
          </p>
          <ul className="list-disc list-inside text-[11px] text-amber-900 font-semibold space-y-0.5 pt-0.5">
            {difference.messages.slice(0, 2).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          size="sm"
          onClick={onCreateVersion}
          className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs h-8.5 px-3.5 rounded-xl shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Create New Version
        </Button>
      </div>
    </div>
  )
}
