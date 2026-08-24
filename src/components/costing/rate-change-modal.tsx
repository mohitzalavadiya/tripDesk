"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CostItem } from "@/types"
import { formatCurrency } from "@/lib/costing-engine"
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"

interface RateChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  costItem: CostItem | null
  currentInventoryRate: number
  onUpdateRate: (costItemId: string, newRate: number) => void
}

export function RateChangeModal({
  open,
  onOpenChange,
  costItem,
  currentInventoryRate,
  onUpdateRate,
}: RateChangeModalProps) {
  if (!costItem) return null

  const oldRate = costItem.unitCost
  const newRate = currentInventoryRate
  const difference = newRate - oldRate
  const diffPercent = oldRate > 0 ? (difference / oldRate) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <DialogTitle className="text-slate-900 font-bold text-base">
                Supplier Rate Update Detected
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-0.5">
                The contracted B2B rate for this service in your inventory has changed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-3 space-y-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-slate-800">{costItem.name}</div>
            <div className="text-[11px] text-slate-500">{costItem.supplierName || "Supplier Contract"}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Saved Snapshot Rate</span>
              <div className="text-base font-extrabold text-slate-700">
                {formatCurrency(oldRate, costItem.currency)}
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-indigo-500 uppercase">Current Inventory Rate</span>
              <div className="text-base font-extrabold text-indigo-900">
                {formatCurrency(newRate, costItem.currency)}
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg flex items-center justify-between text-[11px]">
            <span>Rate Difference:</span>
            <span className="font-bold">
              {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)} ({diffPercent > 0 ? `+${diffPercent.toFixed(1)}%` : `${diffPercent.toFixed(1)}%`})
            </span>
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white border-slate-200 text-xs"
          >
            Keep Snapshot Rate
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onUpdateRate(costItem.id, newRate)
              onOpenChange(false)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 shadow-xs"
          >
            Update to New Rate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
